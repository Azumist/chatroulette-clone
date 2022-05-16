import {RawData, WebSocket, WebSocketServer} from 'ws';
import {Server, IncomingMessage} from 'http';

import {Stranger, StrangerStatus} from '@server/interfaces/stranger.interface';
import {WsClientRequest} from '@server/interfaces/ws-client-request.interface';
import {Room} from '@server/interfaces/room.interface';
import {RoomMessage} from '@server/interfaces/room-message.interface';
import {WsServerResponse} from '@server/interfaces/ws-server-response.interface';

enum ResponseCodes {
  Waiting,
  Found,
  NotFound,
  Disconnected,
  StrangerLeft,
  MessagesSent
};
export class WebsocketService {
  private lobby: Stranger[] = [];
  private rooms: Room[] = [];

  constructor(server: Server, private wss = new WebSocketServer({server})) {
      this.wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
        console.log('Websocket Server started.');
      
        this.addStrangerToLobby(ws);

        ws.on('close', () => this.removeStrangerFromLobby(ws));
        ws.on('message', data => this.handleClientMessages(data));

      });
  }

  private handleClientMessages(data: RawData): void {
    try {
      const reqData = JSON.parse((data as unknown) as string);
      const clientReq = reqData as WsClientRequest;

      // todo: add authentication token
      switch (clientReq.command) {
        case 'ready': // Stranger has joined a room
          this.connectStranger(clientReq);
          break;
        case 'disconnect': // Stranger has left a room
          this.disconnectAndDestroyRoom(clientReq);
          break;
        case 'message': // Stranger is sending a message while in a room
          this.sendMessage(clientReq);
          break;
      }

      // console.log('clientReq: ', clientReq)
      // todo: remove later
      const prettyLobby = this.lobby.map(stranger => {
        return {
          id: stranger.id,
          status: stranger.status
        };
      });
      console.log('lobby: ', prettyLobby);
    }
    catch(error) {
      console.log('Client request error: ', error);
    }
  }

  private addStrangerToLobby(ws: WebSocket): void {
    const newStranger: Stranger = {
      id: Math.random().toString(36).substring(2, 32),
      status: StrangerStatus.Disconnected,
      websocket: ws
    };

    this.lobby.push(newStranger);
    ws.send(JSON.stringify({id: newStranger.id}));
  }

  private removeStrangerFromLobby(ws: WebSocket): void {
    const toRemove = this.lobby.findIndex(stranger => stranger.websocket === ws);
    this.lobby.splice(toRemove, 1);
  }

  private connectStranger(clientReq: WsClientRequest): void {
    let thisStranger: Stranger = this.lobby.find(stranger => stranger.id === clientReq.id);
    let otherStranger: Stranger;

    if (thisStranger.status === StrangerStatus.Talking) {
      return;
    }

    thisStranger.status = StrangerStatus.Ready;

    this.lobby.some(stranger => {
      if (stranger.status === StrangerStatus.Ready && stranger.id !== clientReq.id) {
        if (otherStranger) {
          return;
        }

        otherStranger = stranger;
      }
    });

    if (otherStranger) {
      const newRoom: Room = {
        id: Math.random().toString(36).substring(2, 32),
        messages: [],
        participants: [thisStranger, otherStranger]
      };
      this.rooms.push(newRoom);

      thisStranger.status = StrangerStatus.Talking;
      otherStranger.status = StrangerStatus.Talking;
      thisStranger.roomId = newRoom.id;
      otherStranger.roomId = newRoom.id;

      const response: WsServerResponse = {
        info: 'Stranger found',
        code: ResponseCodes.Found
      }

      thisStranger.websocket.send(JSON.stringify(response));
      otherStranger.websocket.send(JSON.stringify(response));
    }
    else {
      const response: WsServerResponse = {
        info: 'Looking for stranger',
        code: ResponseCodes.Waiting
      };

      thisStranger.websocket.send(JSON.stringify(response));
    }
  }

  private disconnectAndDestroyRoom(clientReq: WsClientRequest): void {
    const stranger = this.lobby.find(stranger => stranger.id === clientReq.id);
    const strangersRoom = this.rooms.find(room => room.id === stranger.roomId);
    const otherStranger = strangersRoom.participants.find(other => other.id !== clientReq.id);

    stranger.status = StrangerStatus.Disconnected;
    otherStranger.status = StrangerStatus.Disconnected;

    const disconnectedResponse: WsServerResponse = {
      info: 'You\'ve disconnected',
      code: ResponseCodes.Disconnected
    };

    const abandonedResponse: WsServerResponse = {
      info: 'Stranger left',
      code: ResponseCodes.StrangerLeft
    };

    stranger.websocket.send(JSON.stringify(disconnectedResponse));
    otherStranger.websocket.send(JSON.stringify(abandonedResponse));
    this.rooms = this.rooms.filter(room => room.id !== strangersRoom.id);
  }

  private sendMessage(clientReq: WsClientRequest): void {
    if (!clientReq.message) {
      return;
    }

    const stranger = this.lobby.find(stranger => stranger.id === clientReq.id);

    if (stranger.status !== StrangerStatus.Talking) {
      return;
    }

    const room = this.rooms.find(room => room.id === stranger.roomId);
    const newMessage: RoomMessage = {
      id: stranger.id,
      message: clientReq.message
    };

    room.messages.push(newMessage);

    room.participants.forEach(participant => {
      const messages: WsServerResponse = {
        code: ResponseCodes.MessagesSent,
        messages: room.messages
      };

      participant.websocket.send(JSON.stringify(messages));
    });
  }
}