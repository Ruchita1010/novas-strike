import type { Socket } from 'socket.io-client';
import Player from '../entities/Player';
import type {
  ClientToServerEvents,
  Player as PlayerType,
  ServerToClientEvents,
} from '../../shared/types';

type SceneInitData = {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  players: PlayerType[];
};

export default class Game extends Phaser.Scene {
  #socket?: Socket<ServerToClientEvents, ClientToServerEvents>;
  #player?: Player;
  #otherPlayers?: Phaser.Physics.Arcade.Group;

  constructor() {
    super('Game');
  }

  init(data: SceneInitData) {
    this.#socket = data.socket;
  }

  preload() {}

  create({ players }: SceneInitData) {
    this.#otherPlayers = this.physics.add.group();
    players.forEach((player) => {
      const { slot, ...playerConfig } = player;
      const playerObj = new Player(this, playerConfig);
      if (player.id === this.#socket?.id) {
        this.#player = playerObj;
      } else {
        this.#otherPlayers?.add(playerObj);
      }
    });
  }

  override update() {
    this.#player?.update();
  }
}
