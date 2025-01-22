import type { Server } from 'socket.io';
import { roomManager } from './roomManager.js';
import type { ObjectPool } from './ObjectPool.js';
import type {
  ClientToServerEvents,
  Nova,
  ServerToClientEvents,
} from '../shared/types.js';
import {
  COLORS,
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_SPEED,
} from '../shared/constants.js';

export const socketHandler = (
  io: Server<ClientToServerEvents, ServerToClientEvents>
) => {
  io.on('connection', (socket) => {
    socket.on('player:join', (playerInput) => {
      const room = roomManager.getRoom();

      const slot = room.availableSlots.pop();
      if (slot === undefined) {
        console.error('No available slots in the room');
        return;
      }
      const x = GAME_WIDTH / 2 - 300 + slot * 200;
      const y = GAME_HEIGHT - 200;
      const colorIdx = Math.floor(Math.random() * COLORS.length);
      const player = {
        id: socket.id,
        x,
        y,
        slot,
        colorIdx,
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
          player.x -= PLAYER_SPEED;
          break;
        case 'right':
          player.x += PLAYER_SPEED;
          break;
        case 'up':
          player.y -= PLAYER_SPEED;
          break;
        case 'down':
          player.y += PLAYER_SPEED;
          break;
      }
    });

    socket.on('player:fire', (roomId: string, x: number, y: number) => {
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

      const { bulletCounter, bullets } = room;
      bullets.set(bulletCounter, {
        x,
        y,
        colorIdx: player.colorIdx,
        playerId: socket.id,
      });

      room.bulletCounter++;
    });

    socket.on('player:colorChange', (roomId: string) => {
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

      player.colorIdx = (player.colorIdx + 1) % COLORS.length;
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
      const { id, isAvailable, bullets, novas } = room;

      if (!isAvailable) {
        io.to(id).emit('players:update', room.players);

        for (const [id, bullet] of bullets) {
          bullet.y -= 5;
          if (bullet.y <= 0) {
            bullets.delete(id);
          }
        }

        io.to(id).emit('bullets:update', Array.from(bullets));

        if (novas.size === 0) {
          room.novaCounter = spawnNovaWave(
            room.novaPool,
            novas,
            room.novaCounter
          );
        } else {
          for (const [id, nova] of novas) {
            nova.y += 1;
            if (nova.y > 700) {
              room.novaPool.release(nova);
              novas.delete(id);
            }
          }
        }

        io.to(id).emit('novas:update', Array.from(novas));
      }
    });
  }, 30);
};

function getRandomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function spawnNovaWave(
  novaPool: ObjectPool<Nova>,
  novas: Map<number, Nova>,
  novaCounter: number
) {
  const waveSize = getRandomBetween(15, 20);

  for (let i = 0; i < waveSize; i++) {
    const nova = novaPool.acquire();
    if (!nova) continue;

    nova.x = getRandomBetween(10, GAME_WIDTH - 10);
    nova.y = getRandomBetween(-100, -10);
    nova.colorIdx = getRandomBetween(0, COLORS.length - 1);

    novas.set(novaCounter++, nova);
  }
  return novaCounter;
}
