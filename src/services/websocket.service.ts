import {RawData, WebSocket, WebSocketServer} from 'ws';
import {Server, IncomingMessage} from 'http';

import {Stranger, StrangerStatus} from '@server/interfaces/stranger.interface';
import {WsClientRequest} from '@server/interfaces/ws-client-request.interface';
import {Room} from '@server/interfaces/room.interface';
import {RoomMessages} from '@server/interfaces/room-messages.interface';

enum InfoCodes {
  Waiting,
  Found,
  NotFound
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

      switch (clientReq.command) {
        case 'ready':
          this.changeStrangerStatus(clientReq.id, StrangerStatus.Ready);
          this.connectStranger(clientReq.id);
          break;
        case 'disconnect':
          this.changeStrangerStatus(clientReq.id, StrangerStatus.Disconnected);
          //todo: check if client is in room and make it empty
          break;
        case 'message':

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

  private changeStrangerStatus(id: string, status: StrangerStatus): void {
    const stranger = this.lobby.find(stranger => stranger.id === id);
    if (stranger) {
      stranger.status = status;
    }
  }

  private connectStranger(id: string): void {
    let thisStranger: Stranger = this.lobby.find(stranger => stranger.id === id);
    let otherStranger: Stranger;

    this.lobby.some(stranger => {
      if (stranger.status === StrangerStatus.Ready && stranger.id !== id) {
        if (otherStranger) {
          return;
        }

        otherStranger = stranger;
      }
    });

    if (otherStranger) {
     
      //todo: create room
      const newRoom: Room = {
        id: Math.random().toString(36).substring(2, 32),
        full: true,
        messages: []
      };
      this.rooms.push(newRoom);

      thisStranger.status = StrangerStatus.Talking;
      otherStranger.status = StrangerStatus.Talking;
      thisStranger.roomId = newRoom.id;
      otherStranger.roomId = newRoom.id;

      const info = JSON.stringify({
        info: 'Stranger found',
        code: InfoCodes.Found
      });

      thisStranger.websocket.send(info);
      otherStranger.websocket.send(info);
    }
    else {
      thisStranger.websocket.send(JSON.stringify({
        info: 'Looking for stranger',
        code: InfoCodes.Waiting
      }));
    }
  }

}

//todo: add unified request sent to the client with id, errors/infos and commands