import type { Server } from 'socket.io';
import { roomManager } from './roomManager.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../shared/types.js';

const SPEED = 3;

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
        x,
        y,
        slot,
        seqNumber: 0,
        ...playerInput,
      };

      room.players.push(player);
      socket.join(room.id);

      if (room.players.length === 1 && !room.timer) {
        roomManager.setupTimer(room, () => {
          io.to(room.id).emit('game:start', room.id, room.players);
          gameLoop(io);
        });
      }

      socket.emit(
        'game:currentState',
        room.players,
        room.timer?.endTimeMs ?? 0
      );
      socket.to(room.id).emit('player:joined', player);

      roomManager.finalizeOnRoomFull(room, () => {
        io.to(room.id).emit('game:start', room.id, room.players);
        gameLoop(io);
      });
    });

    socket.on('player:move', ({ roomId, direction, seqNumber }) => {
      const room = roomManager.getRoomById(roomId);
      if (!room) {
        console.error('Room with the given id not found');
        return;
      }

      const player = room.players.find((player) => player.id === socket.id);
      if (!player) {
        console.error('Player not found');
        return;
      }

      player.seqNumber = seqNumber;
      switch (direction) {
        case 'left':
          player.x -= SPEED;
          break;
        case 'right':
          player.x += SPEED;
          break;
        case 'up':
          player.y -= SPEED;
          break;
        case 'down':
          player.y += SPEED;
          break;
      }
    });

    socket.on('player:fire', (roomId: string, x: number, y: number) => {
      const room = roomManager.getRoomById(roomId);
      if (!room) {
        console.error('Room with the given id not found');
        return;
      }

      const { bulletCounter, bullets } = room;
      bullets.set(bulletCounter, {
        x,
        y,
        playerId: socket.id,
      });

      room.bulletCounter++;
    });

    socket.on('disconnecting', () => {
      // exclude the socket's own room (socket is automatically placed in a room with its socket.id)
      const roomIds = Array.from(socket.rooms).filter(
        (roomId) => roomId !== socket.id
      );

      roomIds.forEach((roomId) => {
        const playersCount = roomManager.removePlayer(roomId, socket.id);
        socket.to(roomId).emit('player:left', socket.id);

        if (playersCount === 0) {
          roomManager.deleteRoom(roomId);
        }
      });
    });
  });
};

const gameLoop = (io: Server<ClientToServerEvents, ServerToClientEvents>) => {
  setInterval(() => {
    const rooms = roomManager.getAllRooms();

    rooms.forEach((room) => {
      const { id, isAvailable, bullets } = room;

      if (!isAvailable) {
        io.to(id).emit('players:update', room.players);

        for (const [id, bullet] of bullets) {
          bullet.y -= 5;
          if (bullet.y <= 0) {
            bullets.delete(id);
          }
        }

        io.to(id).emit('bullets:update', Array.from(bullets));
      }
    });
  }, 30);
};
