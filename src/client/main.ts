import Phaser from 'phaser';
import MainMenu from './scenes/MainMenu';
import Lobby from './scenes/Lobby';
import Game from './scenes/Game';
import ResultBoard from './scenes/ResultBoard.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../shared/constants.js';

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#0d0d0d',
  scale: {
    parent: 'game-container',
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  render: {
    pixelArt: true,
    antialias: false,
    roundPixels: true,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  dom: {
    createContainer: true,
  },
  scene: [MainMenu, Lobby, Game, ResultBoard],
};

export default new Phaser.Game(config);
