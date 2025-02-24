import type { Server } from 'socket.io';
import { RoomsManager } from './managers/roomsManager.js';
import { SocketManager } from './managers/socketManager.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../shared/types.js';

export class Game {
  #roomsManager: RoomsManager;
  #socketManager: SocketManager;
  #gameUpdateLoop: NodeJS.Timeout | null = null;
  #stateBroadcastLoop: NodeJS.Timeout | null = null;

  constructor(io: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.#roomsManager = new RoomsManager();
    this.#socketManager = new SocketManager(io, this.#roomsManager);
  }

  startLoops() {
    const rooms = this.#roomsManager.getAllRooms();
    // -60fps (for updating physics and game state)
    this.#gameUpdateLoop = setInterval(() => {
      rooms.forEach((room) => {
        if (room.isAvailable()) return;

        if (room.isGameOver()) {
          this.#socketManager.broadcastGameOver(room.id);
          this.#socketManager.disconnectPlayers(room.getAllPlayers());
          this.#roomsManager.deleteRoom(room.id);
          return;
        }

        room.updateGameState();

        if (room.attemptNovaAttack()) {
          this.#socketManager.broadcastDamage(room.id);
        }
      });
    }, 1000 / 60);

    // -20fps (for broadcasting game state to all clients)
    this.#stateBroadcastLoop = setInterval(() => {
      rooms.forEach((room) => {
        if (room.isAvailable()) return;

        this.#socketManager.broadcastGameState(room.id);
      });
    }, 1000 / 20);
  }

  stopLoops() {
    if (this.#gameUpdateLoop) {
      clearInterval(this.#gameUpdateLoop);
      this.#gameUpdateLoop = null;
    }

    if (this.#stateBroadcastLoop) {
      clearInterval(this.#stateBroadcastLoop);
      this.#stateBroadcastLoop = null;
    }
  }
}
