import {
  createVideoElement,
  getLiveRoomDetail,
  liveSocket,
  transportConnectHandler,
} from '@/ts/live-engine';
import { Device, parseScalabilityMode } from 'mediasoup-client';

$(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const liveId = urlParams.get('id');
  // const videoOnlyStream = new MediaStream();

  // let enableAudio = true;
  // let enableVideo = true;
  // let localMediaStream = null;
  let localRecvTransport = null;
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

  const displayParticipantStream = async (id = 'participant', mediaStream) => {
    const videoElement = $(`#participant-${id}`)[0];
    videoElement.srcObject = mediaStream;
    console.log({ videoElement, mediaStream }, mediaStream.getTracks());
    liveSocket.emit('resumeConsumers', console.log);
    try {
      await videoElement.play();
      console.log('PLAYED');
    } catch (error) {
      console.log('ERROR', error);
    }
  };

  liveSocket.on('connect', () => {
    if (liveId) {
      liveSocket.on('getProducers', (producers) => {
        for (let i = 0; i < producers.length; i++) {
          const participant = producers[i];
          console.log({ participant, media: participant.media });
        }
      });
      getLiveRoomDetail(liveId).then((liveRoom) => {
        // set to title
        document.title = liveRoom.name;

        liveSocket.emit('join', { liveId }, async (routerRtpCapabilities) => {
          console.log({ routerRtpCapabilities });
          const initializeRecvTransport = await loadDevice(
            routerRtpCapabilities,
          );

          // create transport
          liveSocket.emit(
            'createWebRtcConnector',
            { mode: 'recv' },
            async (recvTransportConnector) => {
              const recvTransport = initializeRecvTransport.createRecvTransport(
                {
                  id: recvTransportConnector.id,
                  iceCandidates: recvTransportConnector.ice.candidates,
                  iceParameters: recvTransportConnector.ice.parameters,
                  dtlsParameters: recvTransportConnector.dtls.parameters,
                },
              );
              localRecvTransport = recvTransport;

              recvTransport.on(
                'connectionstatechange',
                (connectionstatechange) => {
                  console.log({ connectionstatechange });
                },
              );

              transportConnectHandler(recvTransport);

              liveSocket.emit('getProducers', async (participants) => {
                for (let i = 0; i < participants.length; i++) {
                  const participant = participants[i];
                  $('#media-stream-display').append(
                    createVideoElement(`participant-${participant.id}`),
                  );
                  const participantStream = new MediaStream();

                  participantStream.onaddtrack = (event) => {
                    console.log(`New ${event.track.kind} track added`);
                  };

                  console.log({ participantMedia: participant.media });
                  participant.media.forEach((participantMedia) => {
                    liveSocket.emit(
                      'createConsumer',
                      {
                        connectorId: recvTransport.id,
                        mediaId: participantMedia.id,
                        rtpCapabilities: routerRtpCapabilities,
                      },
                      async (options) => {
                        console.log({ options });
                        const consumer = await recvTransport.consume({
                          id: options.id,
                          kind: options.kind,
                          producerId: options.mediaId,
                          rtpParameters: options.rtpParameters,
                        });

                        liveSocket.emit('resumeConsumers', {
                          consumerId: consumer.id,
                        });

                        // if (consumer.kind === 'video') {
                        //   const parseSVC = parseScalabilityMode(
                        //     consumer.rtpParameters.encodings[0].scalabilityMode,
                        //   );
                        //   liveSocket.emit('setPreferredLayers', {
                        //     consumerId: consumer.id,
                        //     spatialLayer: parseSVC.spatialLayers,
                        //     temporalLayer: parseSVC.temporalLayers,
                        //   });
                        //   console.log({ parseSVC });
                        // }

                        participantStream.addTrack(consumer.track);

                        consumer.track.onended = () => {
                          console.log('consumerTrackEnded');
                        };
                        if (participantStream.getTracks().length === 2) {
                          displayParticipantStream(
                            participant.id,
                            participantStream,
                          );
                        }
                      },
                    );
                  });
                }
              });
            },
          );
        });
      });
    }
  });

  liveSocket.on('newMedia', () => {
    //
  });
});
