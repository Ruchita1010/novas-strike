import { ObjectPool } from './objectPool.js';
import { getRandomIntVal } from './utils.js';
import type { Bullet, Nova, Player } from '../shared/types.js';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../shared/constants.js';

const MAX_PLAYERS_PER_ROOM = 4;
const WAITING_TIME = 30_000;

export class Room {
  id: string;
  players: Player[];
  novaCounter: number;
  novaPool: ObjectPool<Nova>;
  novas: Map<number, Nova>;
  bulletCounter: number;
  bullets: Map<number, Bullet>;
  isAvailable: boolean;
  availableSlots: number[];
  timer: { id: NodeJS.Timeout; endTimeMs: number } | null;

  constructor() {
    this.id = `room_${Date.now()}`;
    this.players = [];
    this.novaCounter = 0;
    this.novas = new Map();
    this.novaPool = new ObjectPool(() => ({ x: 0, y: 0, colorIdx: 0 }), 30);
    this.bulletCounter = 0;
    this.bullets = new Map();
    this.isAvailable = true;
    this.availableSlots = Array.from(
      { length: MAX_PLAYERS_PER_ROOM },
      (_, i) => MAX_PLAYERS_PER_ROOM - 1 - i
    );
    this.timer = null;
  }

  #finalizeRoom(room: Room) {
    room.isAvailable = false;
    if (room.timer) {
      clearTimeout(room.timer.id);
      room.timer = null;
    }
  }

  setupTimer(room: Room, onTimerEnd: () => void) {
    const endTimeMs = Date.now() + WAITING_TIME;
    const id = setTimeout(() => {
      this.#finalizeRoom(room);
      onTimerEnd();
    }, WAITING_TIME);
    room.timer = { id, endTimeMs };
  }

  finalizeOnRoomFull(room: Room, onRoomFull: () => void) {
    if (room.players.length === MAX_PLAYERS_PER_ROOM) {
      this.#finalizeRoom(room);
      onRoomFull();
    }
  }

  removePlayer(socketId: string) {
    this.players = this.players.filter((player) => {
      if (player.id === socketId) {
        if (player.slot !== undefined) {
          this.availableSlots.push(player.slot);
        }
        return false;
      }
      return true;
    });

    return this.players.length;
  }

  #updateBullets() {
    for (const [id, bullet] of this.bullets) {
      bullet.y -= 5;
      if (bullet.y <= 0) {
        this.bullets.delete(id);
      }
    }
  }

  #updateNovas() {
    for (const [id, nova] of this.novas) {
      nova.y += 1;
      if (nova.y >= GAME_HEIGHT) {
        this.novaPool.release(nova);
        this.novas.delete(id);
      }
    }
  }

  #checkCollisions() {
    for (const [bulletId, bullet] of this.bullets) {
      for (const [novaId, nova] of this.novas) {
        const collision =
          bullet.x < nova.x + 64 &&
          bullet.x + 9 > nova.x &&
          bullet.y < nova.y + 64 &&
          bullet.y + 15 > nova.y;
        if (collision && bullet.colorIdx === nova.colorIdx) {
          this.bullets.delete(bulletId);
          this.novaPool.release(nova);
          this.novas.delete(novaId);
          break;
        }
      }
    }
  }

  #spawnNovaWave() {
    const waveSize = getRandomIntVal(5, 10);

    for (let i = 0; i < waveSize; i++) {
      const nova = this.novaPool.acquire();
      if (!nova) continue;

      nova.x = getRandomIntVal(10, GAME_WIDTH - 10);
      nova.y = getRandomIntVal(-100, -10);
      nova.colorIdx = getRandomIntVal(0, COLORS.length - 1);

      this.novas.set(this.novaCounter++, nova);
    }
  }

  updateState() {
    if (this.novas.size <= 8) {
      this.#spawnNovaWave();
    }

    this.#updateNovas();
    this.#updateBullets();
    this.#checkCollisions();
  }
}
