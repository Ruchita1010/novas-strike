import { ObjectPool } from './objectPool.js';
import { getRandomIntVal } from './utils.js';
import type { Bullet, Nova, Player, PlayerProfile } from '../shared/types.js';
import {
  BULLET_POOL_SIZE,
  COLORS,
  GAME_HEIGHT,
  GAME_WIDTH,
  HEALTH_DAMAGE_AMOUNT,
  MAX_PLAYER_HEALTH,
  NOVA_POOL_SIZE,
} from '../shared/constants.js';

export class Room {
  static readonly #MAX_PLAYERS_PER_ROOM = 4;
  static readonly #LOBBY_TIMER_DURATION = 30_000;
  static readonly #NOVA_WIDTH = 56;
  static readonly #NOVA_RADIUS = 28;
  static readonly #NOVA_SPEED = 1;
  static readonly #BULLET_SPEED = 5;
  static readonly #MAX_NOVA_WAVES = 10;
  static readonly #NOVA_PROXIMITY_RANGE = 120;
  static readonly #COLLISION_RADIUS_SQUARED = 992.25; // 28(nova's r) + 3.5(bullet's r) = (31.5)^2
  static readonly #DAMAGE_COOLDOWN = 1000;
  static readonly #VICTORY_KILL_THRESHOLD = 75;

  id: string;
  #players: Player[] = [];
  #novaCount: number = 0;
  #novaPool: ObjectPool<Nova>;
  #novas: Map<number, Nova> = new Map();
  #bulletCount: number = 0;
  #bulletPool?: ObjectPool<Bullet>;
  #bullets: Map<number, Bullet> = new Map();
  #available = true;
  #availableSlots: number[] = Array.from(
    { length: Room.#MAX_PLAYERS_PER_ROOM },
    (_, i) => Room.#MAX_PLAYERS_PER_ROOM - 1 - i
  );
  #lobbyTimer: { id: NodeJS.Timeout; endTime: number } | null = null;
  #novaWaveCount: number = 0;
  #lastDamageTime: number = 0;

  constructor() {
    this.id = `room_${Date.now()}`;
    this.#novaPool = new ObjectPool(
      () => ({ x: 0, y: 0, colorIdx: 0 }),
      NOVA_POOL_SIZE
    );
  }

  closeLobby() {
    this.#available = false;
    // don't wanna make pool of size === max players in room as a room won't always be full so waste of memory.
    // and initiating the bulletPool here bc once lobby is closed, we can confirm the total players (assuming mostly players won't leave in between)
    this.#bulletPool = new ObjectPool(
      () => ({ x: 0, y: 0, colorIdx: 0, playerId: '' }),
      BULLET_POOL_SIZE * this.#players.length
    );
    if (this.#lobbyTimer) {
      clearTimeout(this.#lobbyTimer.id);
      this.#lobbyTimer = null;
    }
  }

  setupLobbyTimer(cb: () => void) {
    // not really needed as the only time this func gets called will be on first player join but just a safety check ig
    if (this.#lobbyTimer) {
      clearTimeout(this.#lobbyTimer.id);
    }

    const endTime = Date.now() + Room.#LOBBY_TIMER_DURATION;
    this.#lobbyTimer = {
      id: setTimeout(() => {
        this.closeLobby();
        cb();
      }, Room.#LOBBY_TIMER_DURATION),
      endTime,
    };
  }

  isFull() {
    return this.#players.length === Room.#MAX_PLAYERS_PER_ROOM;
  }

  isAvailable() {
    return this.#available;
  }

  getLobbyTimer() {
    return this.#lobbyTimer;
  }

  getAllPlayers() {
    return this.#players;
  }

  getPlayer(playerId: string) {
    const player = this.#players.find((player) => player.id === playerId);
    if (!player) {
      console.error('Player not found!');
      return;
    }
    return player;
  }

  addPlayer(playerId: string, playerProfile: PlayerProfile) {
    const slot = this.#availableSlots.pop();
    if (slot === undefined) {
      console.error('No available slots in the room!');
      return null;
    }

    const x = GAME_WIDTH / 2 - 300 + slot * 200;
    const y = GAME_HEIGHT - 150;
    const colorIdx = Math.floor(Math.random() * COLORS.length);

    const player: Player = {
      id: playerId,
      x,
      y,
      slot,
      colorIdx,
      seqNumber: 0,
      kills: 0,
      health: MAX_PLAYER_HEALTH,
      ...playerProfile,
    };

    this.#players.push(player);
    return player;
  }

  removePlayer(playerId: string) {
    this.#players = this.#players.filter((player) => {
      if (player.id === playerId && player.slot !== undefined) {
        this.#availableSlots.push(player.slot);
        return false;
      }
      return true;
    });

    return this.#players.length;
  }

  addBullet(playerId: string, x: number, y: number, colorIdx: number) {
    const bullet = this.#bulletPool?.acquire();
    if (!bullet) {
      console.error('Bullet Pool is exhausted!');
      return;
    }

    bullet.x = x;
    bullet.y = y;
    bullet.colorIdx = colorIdx;
    bullet.playerId = playerId;
    this.#bullets.set(this.#bulletCount++, bullet);
  }

  #spawnNovaWave() {
    const waveSize = getRandomIntVal(20, 25);
    const newNovas: Nova[] = [];

    for (let i = 0; i < waveSize; i++) {
      const nova = this.#novaPool.acquire();
      if (!nova) {
        console.warn('Nova Pool is exhausted!');
        continue;
      }

      nova.x = getRandomIntVal(10, GAME_WIDTH - 10);
      nova.y = getRandomIntVal(-100, -10);
      nova.colorIdx = getRandomIntVal(0, COLORS.length - 1);
      newNovas.push(nova);
    }

    newNovas.sort((a, b) => a.x - b.x);

    // Insert sorted novas directly to skip sorting before each sweep (collision check) given that novas are spawned as a group at intervals
    for (const nova of newNovas) {
      this.#novas.set(this.#novaCount++, nova);
    }
  }

  #updateNovas() {
    for (const [id, nova] of this.#novas) {
      nova.y += Room.#NOVA_SPEED;
      if (nova.y >= GAME_HEIGHT) {
        this.#novaPool.release(nova);
        this.#novas.delete(id);
      }
    }
  }

  #updateBullets() {
    for (const [id, bullet] of this.#bullets) {
      bullet.y -= Room.#BULLET_SPEED;
      if (bullet.y <= 0) {
        this.#bulletPool?.release(bullet);
        this.#bullets.delete(id);
      }
    }
  }

  #checkCollisions() {
    for (const [bulletId, bullet] of this.#bullets) {
      for (const [novaId, nova] of this.#novas) {
        // Subtract nova's radius to get its left edge as novas are sorted by center x-coord
        if (nova.x - Room.#NOVA_RADIUS > bullet.x) break;
        if (bullet.colorIdx !== nova.colorIdx) continue;

        const dx = bullet.x - nova.x;
        const dy = bullet.y - nova.y;
        // use squared distance to avoid costly Math.sqrt()
        const distance = dx * dx + dy * dy;

        if (distance <= Room.#COLLISION_RADIUS_SQUARED) {
          this.#bulletPool?.release(bullet);
          this.#bullets.delete(bulletId);
          this.#novaPool.release(nova);
          this.#novas.delete(novaId);

          const player = this.getPlayer(bullet.playerId);
          if (player) {
            player.kills++;
          }
          break;
        }
      }
    }
  }

  updateGameState() {
    if (this.#novas.size <= 0) {
      this.#spawnNovaWave();
      this.#novaWaveCount++;
    }

    this.#updateNovas();
    this.#updateBullets();
    this.#checkCollisions();
  }

  #checkAnyPlayerInNovaRange() {
    for (const player of this.#players) {
      for (const [, nova] of this.#novas) {
        if (player.x < nova.x - Room.#NOVA_WIDTH) break;
        if (player.x > nova.x + Room.#NOVA_WIDTH) continue;

        if (
          player.y >= nova.y &&
          player.y <= nova.y + Room.#NOVA_PROXIMITY_RANGE
        ) {
          return true;
        }
      }
    }
    return false;
  }

  #damageAllPlayers() {
    this.#players.forEach((player) => {
      player.health = Math.max(0, player.health - HEALTH_DAMAGE_AMOUNT);
    });
  }

  attemptNovaAttack() {
    if (Date.now() - this.#lastDamageTime < Room.#DAMAGE_COOLDOWN) return false;
    if (!this.#checkAnyPlayerInNovaRange()) return false;

    this.#damageAllPlayers();
    this.#lastDamageTime = Date.now();
    return true;
  }

  isGameOver() {
    // no need to check for every player's health, all receive the same damage at the same time
    return (
      this.#players[0]?.health === 0 ||
      this.#novaWaveCount === Room.#MAX_NOVA_WAVES
    );
  }

  getGameEntities() {
    return {
      players: this.#players,
      bullets: this.#bullets,
      novas: this.#novas,
    };
  }

  getGameStats() {
    const playerStats = this.#players.map(({ name, spriteKey, kills }) => ({
      name,
      spriteKey,
      kills,
    }));

    const totalKills = this.#players.reduce((sum, { kills }) => sum + kills, 0);
    const killPercentage = this.#novaCount
      ? Math.floor((totalKills / this.#novaCount) * 100)
      : 0;
    const isVictory =
      this.#novaWaveCount >= Room.#MAX_NOVA_WAVES &&
      killPercentage >= Room.#VICTORY_KILL_THRESHOLD;

    return {
      playerStats,
      killPercentage,
      isVictory,
    };
  }
}
