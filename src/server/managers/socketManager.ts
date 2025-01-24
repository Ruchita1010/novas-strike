import type { Server, Socket } from 'socket.io';
import type { RoomsManager } from './roomsManager.js';
import type {
  ClientToServerEvents,
  Direction,
  PlayerSelection,
  ServerToClientEvents,
} from '../../shared/types.js';
import {
  COLORS,
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_SPEED,
} from '../../shared/constants.js';

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export class SocketManager {
  #io;
  #roomsManager;

  constructor(
    io: Server<ClientToServerEvents, ServerToClientEvents>,
    roomsManager: RoomsManager
  ) {
    this.#io = io;
    this.#roomsManager = roomsManager;

    this.#io.on('connection', (socket) => {
      this.#setupListeners(socket);
    });
  }

  #setupListeners(socket: GameSocket) {
    socket.on('player:join', (playerSelection) => {
      this.#onPlayerJoin(socket, playerSelection);
    });
    socket.on('player:move', (roomId, direction, seqNumber) => {
      this.#onPlayerMove(socket, roomId, direction, seqNumber);
    });
    socket.on('player:fire', (roomId: string, x: number, y: number) => {
      this.#onPlayerFire(socket, roomId, x, y);
    });
    socket.on('player:colorChange', (roomId) => {
      this.#onPlayerColorChange(socket, roomId);
    });
    socket.on('disconnecting', () => {
      this.#onDisconnect(socket);
    });
  }

  #onPlayerJoin(socket: GameSocket, playerSelection: PlayerSelection) {
    const room = this.#roomsManager.getRoom();

    const slot = room.availableSlots.pop();
    if (slot === undefined) return;

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
      kills: 0,
      ...playerSelection,
    };

    room.players.push(player);
    socket.join(room.id);

    if (room.players.length === 1 && !room.timer) {
      room.setupTimer(room, () => {
        this.#io.to(room.id).emit('game:start', room.id, room.players);
      });
    }
    socket.emit('game:currentState', room.players, room.timer?.endTimeMs ?? 0);
    socket.to(room.id).emit('player:joined', player);

    room.finalizeOnRoomFull(room, () => {
      this.#io.to(room.id).emit('game:start', room.id, room.players);
    });
  }

  #onPlayerMove(
    socket: GameSocket,
    roomId: string,
    direction: Direction,
    seqNumber: number
  ) {
    const player = this.#getPlayerFromRoom(roomId, socket.id);
    if (!player) return;

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
  }

  #onPlayerFire(socket: GameSocket, roomId: string, x: number, y: number) {
    const room = this.#roomsManager.getRoomById(roomId);
    if (!room) return;

    const player = this.#getPlayerFromRoom(roomId, socket.id);
    if (!player) return;

    const { bulletCounter, bullets } = room;
    bullets.set(bulletCounter, {
      x,
      y,
      colorIdx: player.colorIdx,
      playerId: socket.id,
    });

    room.bulletCounter++;
  }

  #onPlayerColorChange(socket: GameSocket, roomId: string) {
    const player = this.#getPlayerFromRoom(roomId, socket.id);
    if (!player) return;

    player.colorIdx = (player.colorIdx + 1) % COLORS.length;
  }

  #onDisconnect(socket: GameSocket) {
    // exclude the socket's own room (socket is automatically placed in a room with its socket.id)
    const roomIds = Array.from(socket.rooms).filter(
      (roomId) => roomId !== socket.id
    );

    roomIds.forEach((roomId) => {
      const room = this.#roomsManager.getRoomById(roomId);
      const playersCount = room?.removePlayer(socket.id);
      socket.to(roomId).emit('player:left', socket.id);

      if (playersCount === 0) {
        this.#roomsManager.deleteRoom(roomId);
      }
    });
  }

  #getPlayerFromRoom(roomId: string, playerId: string) {
    const room = this.#roomsManager.getRoomById(roomId);
    if (!room) {
      console.error('Room with the given id not found');
      return null;
    }

    const player = room.players.find((player) => player.id === playerId);
    if (!player) {
      console.error('Player not found');
      return null;
    }
    return player;
  }

  emitGameState(roomId: string) {
    const room = this.#roomsManager.getRoomById(roomId);
    if (!room) return;

    const players = room.players.map((player) => ({
      id: player.id,
      x: player.x,
      y: player.y,
      colorIdx: player.colorIdx,
      seqNumber: player.seqNumber,
    }));
    const bullets = [...room.bullets.entries()];
    const novas = [...room.novas.entries()];

    this.#io.to(roomId).emit('game:state', { players, bullets, novas });
  }
}
