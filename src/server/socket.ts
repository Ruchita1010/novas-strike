import type { Server } from 'socket.io';
import { roomManager } from './roomManager.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../shared/types.js';

export const socketHandler = (
  io: Server<ClientToServerEvents, ServerToClientEvents>
) => {
  io.on('connection', (socket) => {
    socket.on('player:join', (playerInput, gameWidth, gameHeight) => {
      const room = roomManager.getRoom();

      const slot = room.availableSlots.pop();
      if (slot === undefined) {
        console.error('No available slots in the room');
        return;
      }
      const x = gameWidth / 2 - 300 + slot * 200;
      const y = gameHeight - 200;
      const player = {
        id: socket.id,
        roomId: room.id,
        x,
        y,
        slot,
        ...playerInput,
      };

      room.players.push(player);
      socket.join(room.id);

      if (room.players.length === 1 && !room.timerId) {
        roomManager.setupTimer(room);
      }

      socket.emit('game:currentState', room.players, room.timerEndTime);
      socket.to(room.id).emit('player:joined', player);

      roomManager.handleRoomFull(room);
    });
  });
};
