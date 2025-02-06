import type { Socket } from 'socket.io-client';
import Player from '../entities/Player';
import NovaGroup from '../entities/NovaGroup';
import type { Nova } from '../entities/NovaGroup';
import type { Bullet } from '../entities/BulletGroup';
import type {
  ClientToServerEvents,
  Direction,
  GameResult,
  GameState,
  Nova as NovaType,
  Bullet as BulletType,
  Player as PlayerType,
  ServerToClientEvents,
} from '../../shared/types';
import { COLORS, PLAYER_SPEED } from '../../shared/constants';

type SceneInitData = {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  roomId: string;
  players: PlayerType[];
};

type Input = { seqNumber: number; dx: number; dy: number };

export default class Game extends Phaser.Scene {
  #socket?: Socket<ServerToClientEvents, ClientToServerEvents>;
  #roomId?: string;
  #player?: Player;
  #otherPlayers: Map<string, Player> = new Map();
  #inputs: Input[] = [];
  #seqNumber = 0;
  #bullets: Map<number, Bullet> = new Map();
  #novas: Map<number, Nova> = new Map();
  #novaGroup?: NovaGroup;

  constructor() {
    super('Game');
  }

  init({ socket, roomId }: SceneInitData) {
    this.#socket = socket;
    this.#roomId = roomId;
  }

  preload() {
    this.load.image('game-bg', 'assets/images/game-bg.png');
    this.load.image('bullet', 'assets/images/bullet.png');
    this.load.image('nova', 'assets/images/nova.png');
  }

  create({ players }: SceneInitData) {
    this.add.image(0, 0, 'game-bg').setOrigin(0);

    this.#novaGroup = new NovaGroup(this);

    players.forEach((player) => {
      const playerObj = new Player(this, player);
      if (player.id === this.#socket?.id) {
        this.#player = playerObj;
      } else {
        this.#otherPlayers.set(player.id, playerObj);
      }
    });

    this.#socket?.on('game:state', (gameState: GameState) => {
      gameState.players.forEach(({ id, x, y, colorIdx, seqNumber }) => {
        if (id === this.#socket?.id) {
          this.#updatePlayerPosition(x, y, colorIdx, seqNumber);
        } else {
          this.#updateOtherPlayerPosition(id, x, y, colorIdx);
        }
      });

      this.#updateBullets(gameState.bullets);
      this.#updateNovas(gameState.novas);
    });

    this.#socket?.on('nova:attacked', () => {
      this.cameras.main.shake(200, 0.01);
      this.#player?.updateHealth(-10);
      this.#otherPlayers.forEach((player) => player.updateHealth(-10));
    });

    this.#socket?.on('game:over', (gameResult: GameResult) => {
      this.scene.start('ResultBoard', gameResult);
    });
  }

  override update(_time: any, _delta: number) {
    if (!this.#player) return;

    this.#player.update();
    this.#otherPlayers.forEach((otherPlayer) => otherPlayer.update());

    const input = this.#player.getInput();

    if (input.left) this.#processMovement('left', -PLAYER_SPEED, 0);
    if (input.right) this.#processMovement('right', PLAYER_SPEED, 0);
    if (input.up) this.#processMovement('up', 0, -PLAYER_SPEED);
    if (input.down) this.#processMovement('down', 0, PLAYER_SPEED);

    if (input.fire) this.#fire();

    if (input.color) this.#changeColor();
  }

  #changeColor() {
    if (!this.#roomId) return;
    this.#socket?.emit('player:colorChange', this.#roomId);
  }

  #fire() {
    if (!this.#player || !this.#roomId) return;

    const { x, y, displayHeight } = this.#player;
    this.#socket?.emit('player:fire', this.#roomId, x, y - displayHeight * 0.5);
  }

  #processMovement = (direction: Direction, dx: number, dy: number) => {
    if (!this.#roomId) return;

    this.#seqNumber++;
    this.#inputs.push({ seqNumber: this.#seqNumber, dx, dy });

    this.#player?.move(dx, dy);

    this.#socket?.emit('player:move', this.#roomId, direction, this.#seqNumber);
  };

  #updatePlayerPosition(
    x: number,
    y: number,
    colorIdx: number,
    seqNumber: number
  ) {
    if (!this.#player) return;

    this.#player.setTargetPosition(x, y);
    this.#player.setTint(COLORS[colorIdx]);

    const lastAckedIndex = this.#inputs.findIndex(
      (input) => input.seqNumber === seqNumber
    );
    if (lastAckedIndex > -1) {
      this.#inputs.splice(0, lastAckedIndex + 1);
    }

    this.#inputs.forEach(({ dx, dy }) => this.#player?.move(dx, dy));
  }

  #updateOtherPlayerPosition(
    id: string,
    x: number,
    y: number,
    colorIdx: number
  ) {
    const otherPlayer = this.#otherPlayers.get(id);
    if (otherPlayer) {
      otherPlayer.setTargetPosition(x, y);
      otherPlayer.setTint(COLORS[colorIdx]);
    }
  }

  #createBullet(bulletId: number, bulletData: BulletType) {
    const { x, y, colorIdx, playerId } = bulletData;
    const player =
      playerId === this.#socket?.id
        ? this.#player
        : this.#otherPlayers.get(playerId);

    const color = COLORS[colorIdx];

    if (!player || !color) return;

    const newBullet = player.fireBullet(x, y, color);
    if (newBullet) {
      this.#bullets.set(bulletId, newBullet);
    }
  }

  #updateBullets(bullets: [number, BulletType][]) {
    const serverBullets = new Map(bullets);

    for (const [id, serverBullet] of serverBullets) {
      const bullet = this.#bullets.get(id);
      if (!bullet) {
        this.#createBullet(id, serverBullet);
      } else {
        bullet.y = Phaser.Math.Linear(bullet.y, serverBullet.y, 0.3);
      }
    }
    for (const [id, bullet] of this.#bullets) {
      if (!serverBullets.has(id)) {
        bullet.deactivate();
        this.#bullets.delete(id);
      }
    }
  }

  #updateNovas(novas: [number, NovaType][]) {
    const serverNovas = new Map(novas);

    for (const [id, serverNova] of serverNovas) {
      const { x, y, colorIdx } = serverNova;
      const nova = this.#novas.get(id);

      const color = COLORS[colorIdx];
      if (!color) return;

      if (!nova) {
        const newNova = this.#novaGroup?.getFirstDead(false) as Nova | null;
        if (newNova) {
          newNova.activate(x, y, color);
          this.#novas.set(id, newNova);
        }
      } else {
        nova.y = y;
      }
    }

    for (const [id, nova] of this.#novas) {
      if (!serverNovas.has(id)) {
        nova.deactivate();
        this.#novas.delete(id);
      }
    }
  }
}
