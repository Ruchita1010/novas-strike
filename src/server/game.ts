import type { Server } from 'socket.io';
import { RoomsManager } from './managers/roomsManager.js';
import { SocketManager } from './managers/socketManager.js';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../shared/types.js';

export class Game {
  #roomsManager;
  #socketManager;

  constructor(io: Server<ClientToServerEvents, ServerToClientEvents>) {
    this.#roomsManager = new RoomsManager();
    this.#socketManager = new SocketManager(io, this.#roomsManager);
  }

  startLoops() {
    const rooms = this.#roomsManager.getAllRooms();
    // -60fps
    setInterval(() => {
      rooms.forEach((room) => {
        if (!room.isAvailable) {
          if (room.isGameOver()) {
            this.#socketManager.broadcastGameOver(room.id);
            this.#roomsManager.deleteRoom(room.id);
            return;
          }
          room.updateGameState();
          if (Date.now() - room.lastDamageTime > 1000) {
            if (room.isPlayerInNovaRange()) {
              room.applyDamageToPlayers();
              this.#socketManager.broadcastDamage(room.id);
              room.lastDamageTime = Date.now();
            }
          }
        }
      });
    }, 1000 / 60);

    // -20fps
    setInterval(() => {
      rooms.forEach((room) => {
        if (!room.isAvailable) {
          this.#socketManager.broadcastGameState(room.id);
        }
      });
    }, 1000 / 20);
  }
}
