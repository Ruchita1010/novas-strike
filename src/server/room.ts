import { ObjectPool } from './objectPool.js';
import { getRandomIntVal } from './utils.js';
import type { Bullet, Nova, Player, PlayerProfile } from '../shared/types.js';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../shared/constants.js';

const MAX_PLAYERS_PER_ROOM = 4;
const TIMER_DURATION = 30_000;
const COLLISION_RADIUS_SQUARED = 1024;

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
  timer: { id: NodeJS.Timeout; endTime: number } | null;

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

  closeLobby() {
    this.isAvailable = false;
    if (this.timer) {
      clearTimeout(this.timer.id);
      this.timer = null;
    }
  }

  setupTimer(cb: () => void) {
    // not really needed as the only time this func gets called will be on first player join but just a safety check ig
    if (this.timer) {
      clearTimeout(this.timer.id);
    }

    const endTime = Date.now() + TIMER_DURATION;
    this.timer = {
      id: setTimeout(() => {
        this.closeLobby();
        cb();
      }, TIMER_DURATION),
      endTime,
    };
  }

  isFull() {
    return this.players.length === MAX_PLAYERS_PER_ROOM;
  }

  getPlayer(playerId: string) {
    const player = this.players.find((player) => player.id === playerId);
    if (!player) {
      console.error('Player not found!');
      return;
    }
    return player;
  }

  addPlayer(playerId: string, playerProfile: PlayerProfile) {
    const slot = this.availableSlots.pop();
    if (slot === undefined) {
      console.error('No available slots in the room!');
      return null;
    }

    const x = GAME_WIDTH / 2 - 300 + slot * 200;
    const y = GAME_HEIGHT - 200;
    const colorIdx = Math.floor(Math.random() * COLORS.length);

    const player: Player = {
      id: playerId,
      x,
      y,
      slot,
      colorIdx,
      seqNumber: 0,
      ...playerProfile,
    };

    this.players.push(player);
    return player;
  }

  removePlayer(playerId: string) {
    this.players = this.players.filter((player) => {
      if (player.id === playerId && player.slot !== undefined) {
        this.availableSlots.push(player.slot);
        return false;
      }
      return true;
    });

    return this.players.length;
  }

  #spawnNovaWave() {
    const waveSize = getRandomIntVal(5, 10);
    const newNovas: Nova[] = [];

    for (let i = 0; i < waveSize; i++) {
      const nova = this.novaPool.acquire();
      if (!nova) continue;

      nova.x = getRandomIntVal(10, GAME_WIDTH - 10);
      nova.y = getRandomIntVal(-100, -10);
      nova.colorIdx = getRandomIntVal(0, COLORS.length - 1);

      newNovas.push(nova);
    }

    newNovas.sort((a, b) => a.x - b.x);

    // Insert sorted novas directly to skip sorting before each sweep (collision check) given that novas are spawned as a group at intervals
    for (const nova of newNovas) {
      this.novas.set(this.novaCounter++, nova);
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

  #updateBullets() {
    for (const [id, bullet] of this.bullets) {
      bullet.y -= 5;
      if (bullet.y <= 0) {
        this.bullets.delete(id);
      }
    }
  }

  #checkCollisions() {
    for (const [bulletId, bullet] of this.bullets) {
      for (const [novaId, nova] of this.novas) {
        // Subtract nova's radius to get its left edge as novas are sorted by center x-coord
        if (nova.x - 32 > bullet.x) break;
        if (bullet.colorIdx !== nova.colorIdx) continue;

        const dx = bullet.x - nova.x;
        const dy = bullet.y - nova.y;
        // use squared distance to avoid costly Math.sqrt()
        const distance = dx * dx + dy * dy;

        if (distance <= COLLISION_RADIUS_SQUARED) {
          this.bullets.delete(bulletId);
          this.novaPool.release(nova);
          this.novas.delete(novaId);
          break;
        }
      }
    }
  }

  updateGameState() {
    if (this.novas.size <= 8) {
      this.#spawnNovaWave();
    }

    this.#updateNovas();
    this.#updateBullets();
    this.#checkCollisions();
  }
}
