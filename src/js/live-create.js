import { getUserMedia } from '@/ts/helpers';
import { createLive, setURLByActiveMedia } from '@/ts/live-engine';

$(function () {
  let enableAudio = true;
  let enableVideo = true;
  let localMediaStream = null;
  const videoOnlyStream = new MediaStream();

  const createVideoElement = (
    id = 'local-user-media-stream',
    sm = 12,
    md = 12,
    lg = 12,
  ) => {
    const displayStreamElement = `
    <div class="col-sm-${sm} col-md-${md} col-lg-${lg}">
      <div class="card card-primary card-outline">
      <div class="card-body embed-responsive embed-responsive-4by3">
        <div class="video-container">
          <video
            id="${id}"
            class="embed-responsive-item"
            autoplay
            ></video>
          <div class="fallback-image"></div>
        </div>
      </div>
      <div class="card-footer">
        <a
          class="card-link"
          id="${id}-video"
          enabled="true"
          >
          <i class="fas fa-video"></i>
        </a>
        <a
          class="card-link"
          id="${id}-audio"
          enabled="true"
          >
          <i class="fas fa-microphone"></i>
        </a>
      </div>
    </div>`;

    return displayStreamElement;
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
        displayLocalMediaStream();
      },
      handleErrorGetUserMedia,
    );
  };

  // create video element
  $('#media-stream-display').append(
    createVideoElement('local-user-media-stream'),
  );

  // load user media on page loaded
  getUserMedia({ audio: enableAudio, video: enableVideo }).then(
    (mediaStream) => {
      localMediaStream = mediaStream;
      setURLByActiveMedia(enableAudio, enableVideo);
      displayLocalMediaStream();
    },
    handleErrorGetUserMedia,
  );

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
      $(this).attr('enabled', 'true').html('<i class="fas fa-microphone"></i>');
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
      $(this).attr('enabled', 'true').html('<i class="fas fa-video"></i>');
    }

    reloadUserMedia();
  });

  $('#live-create').on('submit', (e) => {
    e.preventDefault();
    createLive($('input[name="name"]').val()).then((live) => {
      window.location.replace(
        `live-host.html?id=${live.id}&audio=${enableAudio}&video=${enableVideo}`,
      );
    }, console.log);
  });
});
