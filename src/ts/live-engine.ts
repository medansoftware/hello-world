import axios from 'axios';
import localforage from 'localforage';
import { types } from 'mediasoup-client';
import { Manager, Socket } from 'socket.io-client';

interface ServerToClientEvents {
  connect(): void;
  audioLevels(data: {
    volumes?: { participant: Participant; volume: number }[];
    silence?: boolean;
  }): void;
  newMedia(data: {
    kind: types.MediaKind;
    mediaId: string;
    participantId: string;
  }): void;
}

interface ClientToServerEvents {
  join(
    payload: { liveId: string },
    callback?: (routerRtpCapabilities: types.RtpCapabilities) => void,
  ): void;
  createWebRtcConnector(
    payload: { mode: TransportMode },
    callback?: (webRtcConnector: WebRtcConnector) => void,
  ): void;
  useWebRtcConnector(
    payload: { connectorId: string; dtlsParameters: types.DtlsParameters },
    callback?: (isConnected: boolean) => void,
  ): void;
  restartICE(callback?: (iceParameters: types.IceParameters) => void): void;
  createConsumer(
    payload: {
      connectorId: string;
      mediaId: string;
      rtpCapabilities: types.RtpCapabilities;
    },
    callback?: (consumer: Consumer) => void,
  ): void;
  resumeConsumers(
    payload: { consumerId: string | string[] },
    callback?: (status: boolean) => void,
  ): void;
  createProducer(
    payload: {
      connectorId: string;
      kind: types.MediaKind;
      label: string;
      rtpParameters: types.RtpParameters;
    },
    callback?: (producer: Producer) => void,
  ): void;
  getProducers(callback?: (participants: Participant[]) => void): void;
  destroyProducers(
    payload?: { producerId: string | string[] },
    callback?: () => void,
  ): void;
}

export const userStorage = localforage.createInstance({
  name: 'LiveEngine',
  driver: localforage.LOCALSTORAGE,
  storeName: 'user',
});

const API_URL = 'https://localhost:3000';

export const httpAPI = axios.create({
  baseURL: API_URL,
});

export const websocketAPI = new Manager(API_URL, {
  secure: true,
  transports: ['websocket', 'polling'],
});

export const liveSocket: Socket<ServerToClientEvents, ClientToServerEvents> =
  websocketAPI.socket('/live', {
    auth: async (callback) => {
      const token = await userStorage.getItem<string>('token');
      callback({ token });
    },
  });

httpAPI.interceptors.request.use(async (config) => {
  const token = await userStorage.getItem<string>('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export type User = {
  id: string;
  is_admin: boolean;
  name: string;
  username: string;
};

export type TransportMode = 'recv' | 'send';

export type TransportType = 'direct' | 'pipe' | 'plain' | 'webrtc';

export type ConnectionType = 'simple' | 'simulcast' | 'svc';

export type DtlsState =
  | 'new'
  | 'connecting'
  | 'connected'
  | 'failed'
  | 'closed';

export type WebRtcConnector = {
  id: string;
  ice: {
    candidates: types.IceCandidate[];
    parameters: types.IceParameters;
  };
  dtls: {
    state: DtlsState;
    parameters: types.DtlsParameters;
    remoteCert: string | undefined;
  };
};

export type Participant = {
  id: string;
  user: User;
  media?: ParticipantMedia[];
};

export type ParticipantMedia = {
  id: string;
  kind: types.MediaKind;
  label: string;
  paused: boolean;
};

export type Consumer = {
  id: string;
  kind: types.MediaKind;
  type: ConnectionType;
  mode: TransportMode;
  paused: boolean;
  mediaId: string;
  mediaPaused: boolean;
  rtpParameters: types.RtpParameters;
};

export type Producer = {
  id: string;
  kind: types.MediaKind;
  type: ConnectionType;
  mode: TransportMode;
  label: string;
  paused: boolean;
};

export const setURLByActiveMedia = (
  audio: 'true' | 'false',
  video: 'true' | 'false',
) => {
  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.set('audio', audio);
  currentUrl.searchParams.set('video', video);
  history.replaceState(null, '', currentUrl);
};

export const userSignUp = async (
  is_admin: boolean,
  username: string,
  password: string,
  name: string,
) => {
  const sendRequest = await httpAPI.post<{ user: User; token: string }>(
    '/auth/sign-up',
    {
      name,
      is_admin,
      username,
      password,
    },
  );

  return sendRequest.data;
};

export const userSignIn = async (identity: string, password: string) => {
  const sendRequest = await httpAPI.post<{ user: User; token: string }>(
    '/auth/sign-in',
    {
      identity,
      password,
    },
  );

  return sendRequest.data;
};

export const verifyToken = async (token: string) => {
  const sendRequest = await httpAPI.post<{ user: User }>('/auth/verify-token', {
    token,
  });

  return sendRequest.data;
};

export const createLive = async (name: string) => {
  const sendRequest = await httpAPI.post<{ id: string; name: string }[]>(
    '/live',
    { name },
  );
  return sendRequest.data;
};

export const getLiveRooms = async () => {
  const sendRequest =
    await httpAPI.get<{ id: string; name: string }[]>('/live');
  return sendRequest.data;
};

export const getLiveRoomDetail = async (id: string) => {
  const sendRequest = await httpAPI.get<{ id: string; name: string }>(
    `/live/${id}`,
  );
  return sendRequest.data;
};

export const connectWebRtcTransport = (
  connectorId: string,
  dtlsParameters: types.DtlsParameters,
  callback: (isConnected: boolean) => void,
) => {
  liveSocket.emit(
    'useWebRtcConnector',
    { connectorId, dtlsParameters },
    callback,
  );
};

const createProducer = (
  connectorId: string,
  kind: types.MediaKind,
  label: string,
  rtpParameters: types.RtpParameters,
  callback: (producer: Producer) => void,
) => {
  liveSocket.emit(
    'createProducer',
    { connectorId, kind, label, rtpParameters },
    callback,
  );
};

export const transportConnectHandler = (transport: types.Transport) => {
  transport.on('connect', ({ dtlsParameters }, onSuccess, onFailure) => {
    connectWebRtcTransport(transport.id, dtlsParameters, (isConnected) => {
      if (isConnected) {
        onSuccess();
      } else {
        onFailure(new Error('ConnectionFailure'));
      }
    });
  });

  return transport;
};

export const transportProduceHandler = (
  transport: types.Transport,
  mediaLabel: string,
  callback?: (producer: Producer) => void,
) => {
  transport.on('produce', ({ kind, rtpParameters }, onSucces, onFailure) => {
    createProducer(
      transport.id,
      kind,
      `${mediaLabel}-${kind}`,
      rtpParameters,
      (producer) => {
        if (producer) {
          onSucces({ id: producer.id });
          if (typeof callback === 'function') {
            callback(producer);
          }
        } else {
          onFailure(new Error('UnableToCreateProducer'));
        }
      },
    );
  });

  return transport;
};

export const createVideoElement = (
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
