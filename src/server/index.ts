import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { Server } from 'socket.io';
import { Game } from './game.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../shared/types.js';

const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.static(path.join(__dirname, '..', 'client')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client/index.html'));
});

const game = new Game(io);
game.startLoops();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Listening on PORT: ${PORT}`);
});

const shutdown = () => {
  console.log('shutting down server...');
  game.stopLoops();
  // explicitly disconnect all clients to prevent those in the game scene without a page refresh from continuing to send events (e.g., "player:move") using outdated room data
  // Since all rooms are destroyed on server shutdown, these events would be sent to nonexistent rooms, causing errors like "Room with the given id not found"
  io.disconnectSockets(true);
  io.close(() => {
    console.log('socket.io server closed');
    server.close(() => {
      console.log('server closed');
      process.exit(0);
    });
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
