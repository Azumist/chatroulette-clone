import {RoomMessages} from "./room-messages.interface";
export interface Room {
  id: string;
  full: boolean;
  messages: RoomMessages[];
}