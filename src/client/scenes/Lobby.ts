import { Scene } from 'phaser';
import { io, Socket } from 'socket.io-client';
import { formatTime } from '../utils';
import type {
  ClientToServerEvents,
  Player,
  PlayerSelection,
  ServerToClientEvents,
} from '../../shared/types';

export default class Lobby extends Scene {
  #socket?: Socket<ServerToClientEvents, ClientToServerEvents>;
  #playerSelection?: PlayerSelection;
  #playerContainers: Map<string, Phaser.GameObjects.Container> = new Map();
  #timerEvent?: Phaser.Time.TimerEvent;

  constructor() {
    super('Lobby');
  }

  init(data: PlayerSelection) {
    this.#playerSelection = data;
  }

  preload() {
    this.load.image('ship1', 'assets/images/ship1.png');
    this.load.image('ship2', 'assets/images/ship2.png');
    this.load.image('ship3', 'assets/images/ship3.png');
    this.load.image('ship4', 'assets/images/ship4.png');
  }

  create() {
    this.#socket = io();

    this.add.text(this.scale.width / 2 - 200, 100, 'waiting for the team...', {
      fontSize: '24px',
    });

    if (!this.#playerSelection) {
      console.error('Player selection data missing. Unable to join the game!');
      return;
    }

    this.#socket.emit(
      'player:join',
      this.#playerSelection,
      this.scale.width,
      this.scale.height
    );

    this.#socket.on('game:currentState', (players, endTimeMs) => {
      this.#addTimer(endTimeMs);
      players.forEach((player) => this.#addPlayer(player));
    });

    this.#socket.on('player:joined', (player) => {
      this.#addPlayer(player);
    });

    this.#socket.on('player:left', (playerId: string) => {
      this.#removePlayer(playerId);
    });

    this.#socket.on('game:start', (players: Player[]) => {
      this.scene.start('Game', { socket: this.#socket, players });
    });
  }

  #addTimer(endTimeMs: number) {
    const remainingTime = Math.floor((endTimeMs - Date.now()) / 1000);
    const timerText = this.add.text(20, 20, formatTime(remainingTime));

    this.#timerEvent = this.time.addEvent({
      delay: 100,
      callback: this.#updateTimerText,
      callbackScope: this,
      args: [timerText, endTimeMs],
      loop: true,
    });
  }

  #updateTimerText(timerText: Phaser.GameObjects.Text, endTimeMs: number) {
    const remainingTime = Math.floor((endTimeMs - Date.now()) / 1000);
    if (remainingTime <= 0) {
      timerText?.setText('00:00');
      this.#timerEvent?.remove();
      return;
    }
    timerText?.setText(formatTime(remainingTime));
  }

  #addPlayer(player: Player) {
    const { id, x, y, spriteKey, name } = player;
    const playerContainer = this.add.container(x, y);

    const spaceship = this.add.sprite(0, 0, spriteKey).setScale(1.5);
    const playerNameText = this.add.text(0, 55, name).setOrigin(0.5);

    playerContainer.add([spaceship, playerNameText]);
    this.#playerContainers.set(id, playerContainer);
  }

  #removePlayer(playerId: string) {
    const playerContainer = this.#playerContainers.get(playerId);
    if (playerContainer) {
      playerContainer.destroy(true);
      this.#playerContainers.delete(playerId);
    }
  }
}
