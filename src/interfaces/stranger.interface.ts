import {WebSocket} from 'ws';

export enum StrangerStatus {
  Ready,
  Talking,
  Disconnected
};

export interface Stranger {
  id: string;
  status: StrangerStatus;
  websocket: WebSocket;
};