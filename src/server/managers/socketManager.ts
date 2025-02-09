import type { Server, Socket } from 'socket.io';
import type { RoomsManager } from './roomsManager.js';
import type {
  ClientToServerEvents,
  Direction,
  PlayerProfile,
  ServerToClientEvents,
} from '../../shared/types.js';
import {
  COLORS,
  GAME_HEIGHT,
  GAME_WIDTH,
  PLAYER_SPEED,
} from '../../shared/constants.js';

type TSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export class SocketManager {
  #io: Server<ClientToServerEvents, ServerToClientEvents>;
  #roomsManager: RoomsManager;

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

    const players = room.getAllPlayers();
    if (players.length === 1) {
      room.setupLobbyTimer(() => {
        this.#io.to(room.id).emit('game:start', room.id, players);
      });
    }

    const lobbyEndTime = room.getLobbyTimer()?.endTime;
    if (!lobbyEndTime) return;

    socket.emit('lobby:state', players, lobbyEndTime);
    socket.to(room.id).emit('player:joined', player);

    if (room.isFull()) {
      room.closeLobby();
      this.#io.to(room.id).emit('game:start', room.id, players);
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
        player.x = Math.max(40, player.x - PLAYER_SPEED);
        break;
      case 'right':
        player.x = Math.min(GAME_WIDTH - 40, player.x + PLAYER_SPEED);
        break;
      case 'up':
        player.y = Math.max(40, player.y - PLAYER_SPEED);
        break;
      case 'down':
        player.y = Math.min(GAME_HEIGHT - 40, player.y + PLAYER_SPEED);
        break;
    }
  }

  #onPlayerFire(socket: TSocket, roomId: string, x: number, y: number) {
    const room = this.#roomsManager.getRoomById(roomId);
    if (!room) return;

    const player = room.getPlayer(socket.id);
    if (!player) return;

    room.addBullet(player.id, x, y, player.colorIdx);
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

    // at this point a player can join only one room but still keeping the loop for now
    roomIds.forEach((roomId) => {
      const room = this.#roomsManager.getRoomById(roomId);
      if (!room) return;

      const playersCount = room.removePlayer(socket.id);
      if (playersCount === 0) {
        this.#roomsManager.deleteRoom(roomId);
        return;
      }

      socket.to(roomId).emit('player:left', socket.id);
    });
  }

  broadcastDamage(roomId: string) {
    this.#io.to(roomId).emit('nova:attacked');
  }

  broadcastGameOver(roomId: string) {
    const room = this.#roomsManager.getRoomById(roomId);
    if (!room) return;

    this.#io.to(roomId).emit('game:over', room.getGameStats());
  }

  broadcastGameState(roomId: string) {
    const room = this.#roomsManager.getRoomById(roomId);
    if (!room) return;

    const { players, bullets, novas } = room.getGameEntities();
    const gameState = {
      // send only the changeable and necessary player data
      players: players.map(({ id, x, y, colorIdx, seqNumber }) => ({
        id,
        x,
        y,
        colorIdx,
        seqNumber,
      })),
      // serialize
      bullets: [...bullets.entries()],
      novas: [...novas.entries()],
    };

    this.#io.to(roomId).emit('game:state', gameState);
  }
}
