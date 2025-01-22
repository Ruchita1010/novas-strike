import Phaser from 'phaser';
import MainMenu from './scenes/MainMenu';
import Lobby from './scenes/Lobby';
import Game from './scenes/Game';
import { GAME_HEIGHT, GAME_WIDTH } from '../shared/constants.js';

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#2e2925',
  scale: {
    parent: 'game-container',
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
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
  scene: [MainMenu, Lobby, Game],
};

export default new Phaser.Game(config);
