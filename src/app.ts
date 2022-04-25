import {createServer} from 'http'; //todo: add certs
import { WebsocketService } from './services/websocket.service';

const healthCheck = (_req, res) => {
  res.writeHead(200);
  res.end('Server works.');
};

const server = createServer(healthCheck); //todo: add certs
new WebsocketService(server);

server.listen(8080, () => {
  console.log('server listening on 8080');
});