import { Device } from 'mediasoup-client';
import {
  createVideoElement,
  getLiveRoomDetail,
  liveSocket,
  roomTransport,
  sendChatMessage,
  transportConnectHandler,
} from '@/ts/live-engine';

$(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const liveId = urlParams.get('id');
  // const videoOnlyStream = new MediaStream();

  // let enableAudio = true;
  // let enableVideo = true;

  // let localMediaStream = null;
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

  const displayParticipantStream = async (uid, mediaStream) => {
    const videoElement = $(`#participant-${uid}`)[0];
    videoElement.srcObject = mediaStream;
    liveSocket.emit('resumeConsumers', console.log);

    try {
      await videoElement.play();
      console.log('PLAYED');
    } catch (error) {
      console.log('ERROR', error);
    }
  };

  const handleLiveJoin = async (routerRtpCapabilities) => {
    const initializeRecvTransport = await loadDevice(routerRtpCapabilities);

    // create transport
    liveSocket.emit(
      'createWebRtcConnector',
      { mode: 'recv' },
      async (recvTransportConnector) => {
        const recvTransport = initializeRecvTransport.createRecvTransport({
          id: recvTransportConnector.id,
          iceCandidates: recvTransportConnector.ice.candidates,
          iceParameters: recvTransportConnector.ice.parameters,
          dtlsParameters: recvTransportConnector.dtls.parameters,
        });

        roomTransport.recv = recvTransport;

        recvTransport.on('connectionstatechange', (connectionstatechange) => {
          console.log({ connectionstatechange });
        });

        transportConnectHandler(recvTransport);

        liveSocket.emit('getPublishers', (participants) =>
          handleGetPublishers(routerRtpCapabilities, participants),
        );
      },
    );
  };

  const handleGetPublishers = async (routerRtpCapabilities, participants) => {
    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      $('#media-stream-display').append(
        createVideoElement(`participant-${participant.user.id}`),
      );
      const participantStream = new MediaStream();

      participantStream.onaddtrack = (event) => {
        console.log(`New ${event.track.kind} track added`);
      };

      console.log({ participantMedia: participant.stream });
      participant.stream.forEach((participantMedia) => {
        liveSocket.emit(
          'createConsumer',
          {
            connectorId: roomTransport.recv.id,
            mediaId: participantMedia.id,
            rtpCapabilities: routerRtpCapabilities,
          },
          async (options) => {
            const consumer = await roomTransport.recv.consume({
              id: options.id,
              kind: options.kind,
              producerId: options.mediaId,
              rtpParameters: options.rtpParameters,
            });

            liveSocket.emit('resumeConsumers', {
              consumerId: consumer.id,
            });

            participantStream.addTrack(consumer.track);

            // if (participantStream.getTracks().length === 2) {
            //   displayParticipantStream(participant.user.id, participantStream);
            // }

            displayParticipantStream(participant.user.id, participantStream);
          },
        );
      });
    }
  };

  liveSocket.on('connect', () => {
    if (liveId) {
      getLiveRoomDetail(liveId).then(
        (liveRoom) => {
          // set to title
          document.title = liveRoom.name;
          // join to the live
          liveSocket.emit('join', { liveId }, handleLiveJoin);

          $('#live-chat-form').on('submit', async function (e) {
            e.preventDefault();
            const text = $('input[name="live-chat-text"]');
            if (text.val().trim().length > 0) {
              await sendChatMessage(liveId, text.val());
              text.val('');
            }
          });
        },
        () => {
          window.location.href = '/';
        },
      );
    } else {
      window.location.href = '/';
    }
  });

  liveSocket.on('activeSpeaker', (activeSpeaker) => {
    console.log({ activeSpeaker });
  });

  liveSocket.on('newMessage', (newMessage) => {
    console.log({ newMessage });
  });

  liveSocket.on('streamCreated', (streamCreated) => {
    console.log({ streamCreated });
  });

  liveSocket.on('streamDestroyed', (streamDestroyed) => {
    console.log({ streamDestroyed });
  });
});
