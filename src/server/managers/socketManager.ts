import type { Server, Socket } from 'socket.io';
import type { RoomsManager } from './roomsManager.js';
import type {
  ClientToServerEvents,
  Direction,
  PlayerProfile,
  ServerToClientEvents,
} from '../../shared/types.js';
import { COLORS, PLAYER_SPEED } from '../../shared/constants.js';

type TSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

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
      this.#registerListeners(socket);
    });
  }

  #registerListeners(socket: TSocket) {
    socket.on('player:join', (playerProfile) => {
      this.#onPlayerJoin(socket, playerProfile);
    });
    socket.on('player:move', (roomId, direction, seqNumber) => {
      this.#onPlayerMove(socket, roomId, direction, seqNumber);
    });
    socket.on('player:fire', (roomId, x, y) => {
      this.#onPlayerFire(socket, roomId, x, y);
    });
    socket.on('player:colorChange', (roomId) => {
      this.#onPlayerColorChange(socket, roomId);
    });
    socket.on('disconnecting', () => {
      this.#onDisconnect(socket);
    });
  }

  #onPlayerJoin(socket: TSocket, playerProfile: PlayerProfile) {
    const room = this.#roomsManager.findOrCreateRoom();
    const player = room.addPlayer(socket.id, playerProfile);
    if (!player) return;

    socket.join(room.id);

    if (room.players.length === 1) {
      room.setupTimer(() => {
        this.#io.to(room.id).emit('game:start', room.id, room.players);
      });
    }

    socket.emit('lobby:state', room.players, room.timer?.endTime ?? 0);
    socket.to(room.id).emit('player:joined', player);

    if (room.isFull()) {
      room.closeLobby();
      this.#io.to(room.id).emit('game:start', room.id, room.players);
    }
  }

  #onPlayerMove(
    socket: TSocket,
    roomId: string,
    direction: Direction,
    seqNumber: number
  ) {
    const room = this.#roomsManager.getRoomById(roomId);

    const player = room?.getPlayer(socket.id);
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

  #onPlayerFire(socket: TSocket, roomId: string, x: number, y: number) {
    const room = this.#roomsManager.getRoomById(roomId);
    if (!room) return;

    const player = room.getPlayer(socket.id);
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

  #onPlayerColorChange(socket: TSocket, roomId: string) {
    const room = this.#roomsManager.getRoomById(roomId);

    const player = room?.getPlayer(socket.id);
    if (!player) return;

    player.colorIdx = (player.colorIdx + 1) % COLORS.length;
  }

  #onDisconnect(socket: TSocket) {
    // exclude the socket's own room (socket is automatically placed in a room with its socket.id)
    const roomIds = Array.from(socket.rooms).filter(
      (roomId) => roomId !== socket.id
    );

    roomIds.forEach((roomId) => {
      const room = this.#roomsManager.getRoomById(roomId);
      if (!room) return;

      const playersCount = room.removePlayer(socket.id);
      if (playersCount === 0) {
        this.#roomsManager.deleteRoom(roomId);
      }

      socket.to(roomId).emit('player:left', socket.id);
    });
  }

  broadcastDamage(roomId: string) {
    this.#io.to(roomId).emit('nova:attacked');
  }

  broadcastGameState(roomId: string) {
    const room = this.#roomsManager.getRoomById(roomId);
    if (!room) return;

    // send only the changeable and necessary player data
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
