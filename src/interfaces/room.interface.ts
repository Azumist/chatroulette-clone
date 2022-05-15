import {RoomMessages} from "./room-messages.interface";
import {Stranger} from "./stranger.interface";
export interface Room {
  id: string;
  messages: RoomMessages[];
  participants?: Stranger[];
}