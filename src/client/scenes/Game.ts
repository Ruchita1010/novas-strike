import type { Socket } from 'socket.io-client';
import Player from '../entities/Player';
import type {
  ClientToServerEvents,
  Direction,
  Player as PlayerType,
  ServerToClientEvents,
} from '../../shared/types';

type SceneInitData = {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  roomId: string;
  players: PlayerType[];
};

type Input = { seqNumber: number; dx: number; dy: number };

const SPEED = 3;

export default class Game extends Phaser.Scene {
  #socket?: Socket<ServerToClientEvents, ClientToServerEvents>;
  #roomId?: string;
  #player?: Player;
  #otherPlayers: Map<string, Player> = new Map();
  #inputs: Input[] = [];
  #seqNumber = 0;

  constructor() {
    super('Game');
  }

  init({ socket, roomId }: SceneInitData) {
    this.#socket = socket;
    this.#roomId = roomId;
  }

  preload() {}

  create({ players }: SceneInitData) {
    players.forEach((player) => {
      const playerObj = new Player(this, player);
      if (player.id === this.#socket?.id) {
        this.#player = playerObj;
      } else {
        this.#otherPlayers.set(player.id, playerObj);
      }
    });

    this.#socket?.on('players:update', (players) => {
      players.forEach(({ id, x, y, seqNumber }) => {
        if (id === this.#socket?.id) {
          this.#updatePlayerPosition(x, y, seqNumber);
        } else {
          this.#updateOtherPlayerPosition(id, x, y);
        }
      });
    });
  }

  override update() {
    if (!this.#player) return;

    this.#player.update();
    this.#otherPlayers.forEach((otherPlayer) => otherPlayer.update());

    const input = this.#player.getInput();

    if (input.left) this.#processMovement('left', -SPEED, 0);
    if (input.right) this.#processMovement('right', SPEED, 0);
    if (input.up) this.#processMovement('up', 0, -SPEED);
    if (input.down) this.#processMovement('down', 0, SPEED);
  }

  #processMovement = (direction: Direction, dx: number, dy: number) => {
    if (!this.#roomId) return;

    this.#seqNumber++;
    this.#inputs.push({ seqNumber: this.#seqNumber, dx, dy });

    this.#player?.move(dx, dy);

    this.#socket?.emit('player:move', {
      roomId: this.#roomId,
      direction,
      seqNumber: this.#seqNumber,
    });
  };

  #updatePlayerPosition(x: number, y: number, seqNumber: number) {
    if (!this.#player) return;

    this.#player.setTargetPosition(x, y);

    const lastAckedIndex = this.#inputs.findIndex(
      (input) => input.seqNumber === seqNumber
    );
    if (lastAckedIndex > -1) {
      this.#inputs.splice(0, lastAckedIndex + 1);
    }

    this.#inputs.forEach(({ dx, dy }) => this.#player?.move(dx, dy));
  }

  #updateOtherPlayerPosition(id: string, x: number, y: number) {
    const otherPlayer = this.#otherPlayers.get(id);
    if (otherPlayer) {
      otherPlayer.setTargetPosition(x, y);
    }
  }
}
