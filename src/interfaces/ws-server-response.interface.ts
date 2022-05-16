import {RoomMessage} from "./room-message.interface";

export interface WsServerResponse {
  info?: string;
  code: number;
  messages?: RoomMessage[];
}