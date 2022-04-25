import {WebSocket, WebSocketServer} from 'ws';
import {Server, IncomingMessage} from 'http';

import {Stranger, StrangerStatus} from '../interfaces/stranger.interface';

export class WebsocketService {
  private lobby: Stranger[] = [];
  // private rooms: Room[] = [];

  constructor(server: Server, private wss = new WebSocketServer({server})) {
      this.wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
        console.log('Websocket Server started.');
      
        this.addStrangerToLobby(ws);

        ws.on('close', () => this.removeStrangerFromLobby(ws));
      
        ws.on('message', data => {
          console.log('received: %s', data);
        });
        
      });
  }

  addStrangerToLobby(ws: WebSocket): void {
    const newStranger = {
      id: Math.random().toString(36).substring(2, 32),
      status: StrangerStatus.Ready,
      websocket: ws
    };

    this.lobby.push(newStranger);
    ws.send(newStranger.id);

    // console.log('lobby', this.lobby);
  }

  removeStrangerFromLobby(ws: WebSocket): void {
    const toRemove = this.lobby.findIndex(stranger => stranger.websocket === ws);
    this.lobby.splice(toRemove, 1);
  }

}