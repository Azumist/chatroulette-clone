import {RoomMessage} from "./room-message.interface";
import {Stranger} from "./stranger.interface";
export interface Room {
  id: string;
  messages: RoomMessage[];
  participants?: Stranger[];
}