import { Device } from 'mediasoup-client';
import Swal from 'sweetalert2';
import { getUserMedia } from '@/ts/helpers';
import {
  createVideoElement,
  getLiveRoomDetail,
  liveSocket,
  roomTransport,
  setURLByActiveMedia,
  transportConnectHandler,
  transportProduceHandler,
} from '@/ts/live-engine';

$(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const liveId = urlParams.get('id');
  const videoOnlyStream = new MediaStream();

  let enableAudio = true;
  let enableVideo = true;
  let localMediaStream = null;
  // let localRecvTransport = null;
  // let localSendTransport = null;

  const loadDevice = async (routerRtpCapabilities) => {
    try {
      const device = new Device();
      await device.load({ routerRtpCapabilities });

      return device;
    } catch (error) {
      throw new Error('Unable to load device');
    }
  };

  // display media media stream (only for local stream)
  const displayLocalMediaStream = async () => {
    const localVideoStream = $('#local-user-media-stream');
    if (localMediaStream instanceof MediaStream) {
      if (localMediaStream.getVideoTracks().length > 0) {
        // destroy old mediastream
        videoOnlyStream.getTracks().forEach((mediaStreamTrack) => {
          mediaStreamTrack.stop();
          videoOnlyStream.removeTrack(mediaStreamTrack);
        });
        // with video
        const videoTrack = localMediaStream.getVideoTracks()[0];
        const videoElement = localVideoStream[0];

        videoOnlyStream.addTrack(videoTrack);
        videoElement.srcObject = videoOnlyStream;
        await videoElement.play();
        $('.fallback-image').hide();
      } else {
        // without video
        $('.fallback-image').show();
      }
    }
  };

  const handleErrorGetUserMedia = (error) => {
    console.log(error);
  };

  // const handleUserMediaStream = () => {
  //   //
  // };

  // reload local user media stream
  // if audio / video is enabled / disabled
  const reloadUserMedia = () => {
    getUserMedia({ audio: enableAudio, video: enableVideo }).then(
      (mediaStream) => {
        if (localMediaStream instanceof MediaStream) {
          localMediaStream
            .getTracks()
            .forEach((mediaStreamTrack) => mediaStreamTrack.stop());
        }

        localMediaStream = mediaStream;
        setURLByActiveMedia(enableAudio, enableVideo);
        liveSocket.emit('destroyProducers', undefined, async () => {
          if (mediaStream && mediaStream.getTracks().length > 0) {
            const mediaTracks = mediaStream.getTracks();
            for (let i = 0; i < mediaTracks.length; i++) {
              const mediaTrack = mediaTracks[i];
              if (mediaTrack.kind === 'video') {
                await roomTransport.send.produce({
                  track: mediaTrack,
                });
              } else {
                await roomTransport.send.produce({
                  track: mediaTrack,
                });
              }
            }
          }
        });
        displayLocalMediaStream();
      },
      handleErrorGetUserMedia,
    );
  };

  // create video element
  $('#media-stream-display').append(
    createVideoElement('local-user-media-stream'),
  );

  $('#pause-producers').on('click', (e) => {
    e.preventDefault();
    liveSocket.emit('pauseProducers');
  });

  $('#resume-producers').on('click', (e) => {
    e.preventDefault();
    liveSocket.emit('resumeProducers');
  });

  $('#destroy-producers').on('click', (e) => {
    e.preventDefault();
    liveSocket.emit('destroyProducers');
  });

  if (liveId) {
    getLiveRoomDetail(liveId).then(
      (liveRoom) => {
        // set to title
        document.title = liveRoom.name;
        enableAudio = urlParams.get('audio') === 'true';
        enableVideo = urlParams.get('video') === 'true';

        if (!enableAudio) {
          $('#local-user-media-stream-audio')
            .attr('enabled', 'false')
            .html('<i class="fas fa-microphone-slash"></i>');
        }

        if (!enableVideo) {
          $('#local-user-media-stream-video')
            .attr('enabled', 'false')
            .html('<i class="fas fa-video-slash"></i>');
        }

        $('#local-user-media-stream-audio').on('click', function (e) {
          e.preventDefault();
          const isEnabled = $(this).attr('enabled');
          if (isEnabled === 'true') {
            enableAudio = false;
            $(this)
              .attr('enabled', 'false')
              .html('<i class="fas fa-microphone-slash"></i>');
          } else {
            enableAudio = true;
            $(this)
              .attr('enabled', 'true')
              .html('<i class="fas fa-microphone"></i>');
          }

          reloadUserMedia();
        });

        $('#local-user-media-stream-video').on('click', function (e) {
          e.preventDefault();
          const isEnabled = $(this).attr('enabled');
          if (isEnabled === 'true') {
            enableVideo = false;
            $(this)
              .attr('enabled', 'false')
              .html('<i class="fas fa-video-slash"></i>');
          } else {
            enableVideo = true;
            $(this)
              .attr('enabled', 'true')
              .html('<i class="fas fa-video"></i>');
          }

          reloadUserMedia();
        });

        liveSocket.on('connect', () => {
          liveSocket.on('consumerScore', (consumerScore) => {
            console.log({ consumerScore });
          });
          liveSocket.on('consumerTrace', (consumerTrace) => {
            console.log({ consumerTrace });
          });

          liveSocket.on('producerScore', (producerScore) => {
            console.log({ producerScore });
          });
          liveSocket.on('producerTrace', (producerTrace) => {
            console.log({ producerTrace });
          });

          liveSocket.on('streamCreated', (streamCreated) => {
            console.log({ streamCreated });
          });
          // get user media
          getUserMedia({ audio: enableAudio, video: enableVideo }).then(
            (mediaStream) => {
              localMediaStream = mediaStream;
              displayLocalMediaStream();

              liveSocket.emit(
                'join',
                { liveId },
                async (routerRtpCapabilities) => {
                  const initializeSendTransport = await loadDevice(
                    routerRtpCapabilities,
                  );

                  // create transport
                  liveSocket.emit(
                    'createWebRtcConnector',
                    { mode: 'send' },
                    async (sendTransportConnector) => {
                      const sendTransport =
                        initializeSendTransport.createSendTransport({
                          id: sendTransportConnector.id,
                          iceCandidates: sendTransportConnector.ice.candidates,
                          iceParameters: sendTransportConnector.ice.parameters,
                          dtlsParameters:
                            sendTransportConnector.dtls.parameters,
                        });
                      roomTransport.send = sendTransport;

                      sendTransport.on(
                        'connectionstatechange',
                        (connectionstatechange) => {
                          console.log({ connectionstatechange });
                        },
                      );

                      transportConnectHandler(sendTransport);
                      transportProduceHandler(
                        sendTransport,
                        'user-media',
                        (callbackProducer) => {
                          console.log({ callbackProducer });
                        },
                      );

                      if (mediaStream && mediaStream.getTracks().length > 0) {
                        const mediaTracks = mediaStream.getTracks();
                        for (let i = 0; i < mediaTracks.length; i++) {
                          const mediaTrack = mediaTracks[i];
                          // const producer = await sendTransport.produce({
                          //   track: mediaTrack,
                          // });
                          // console.log({ producer });

                          if (mediaTrack.kind === 'video') {
                            const producer = await sendTransport.produce({
                              track: mediaTrack,
                              encodings: [
                                //   // {
                                //   //   rid: 'r0',
                                //   //   active: true,
                                //   //   scalabilityMode: 'S1T3',
                                //   //   maxBitrate: 1000000,
                                //   // }, // Low resolution
                                //   // {
                                //   //   rid: 'r1',
                                //   //   active: true,
                                //   //   scalabilityMode: 'S1T3',
                                //   //   maxBitrate: 2000000,
                                //   // }, // Medium resolution
                                //   // {
                                //   //   rid: 'r2',
                                //   //   active: true,
                                //   //   scalabilityMode: 'S1T3',
                                //   //   maxBitrate: 3000000,
                                //   // }, // High resolution

                                // simulcast
                                { rid: 'r0', scalabilityMode: 'L1T3' },
                                { rid: 'r1', scalabilityMode: 'L1T3' },
                                { rid: 'r2', scalabilityMode: 'L1T3' },
                                { rid: 'r3', scalabilityMode: 'L1T3' },

                                //   // svc
                                //   // { ssrc: 111110, scalabilityMode: 'L3T2' },
                              ],
                            });
                            console.log({ producer });
                          } else {
                            const producer = await sendTransport.produce({
                              track: mediaTrack,
                            });
                            console.log({ producer });
                          }
                        }
                      }
                    },
                  );
                },
              );
            },
          );

          liveSocket.on('newMedia', (newMedia) => {
            console.log({ newMedia });
          });

          // active speaker
          liveSocket.on('newParticipant', (newParticipant) => {
            console.log({ newParticipant });
          });

          // audio levels
          liveSocket.on('audioLevels', ({ silence, volumes }) => {
            if (silence) {
              console.log({ silence });
            }

            if (volumes) {
              // volumes.map((participant) => {
              //   console.log(participant.participant, participant.volume);
              // });
            }
          });

          // active speaker
          liveSocket.on('activeSpeaker', (activeSpeaker) => {
            console.log({ activeSpeaker });
          });
        });
      },
      (error) => {
        console.log(error.response.data);
        if (error.response.data) {
          if (error.response.data?.errorCode === 404) {
            Swal.fire({
              icon: 'error',
              title: 'Oops...',
              text: 'Something went wrong!',
              footer: '<a href="#">Why do I have this issue?</a>',
            });
          }
        }
      },
    );
  }
});
