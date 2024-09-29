export const getUserMedia = async (
  options: MediaStreamConstraints = { audio: true },
): Promise<MediaStream> => {
  const userMedia = await navigator.mediaDevices.getUserMedia(options);
  return userMedia;
};

export const getDisplayMedia = async (
  options: MediaStreamConstraints = { video: true },
): Promise<MediaStream> => {
  const displayMedia = await navigator.mediaDevices.getDisplayMedia(options);
  return displayMedia;
};
