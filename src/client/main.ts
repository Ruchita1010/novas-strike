import Phaser from 'phaser';
import MainMenu from './scenes/MainMenu';
import Game from './scenes/Game';

const config = {
  type: Phaser.AUTO,
  backgroundColor: '#2e2925',
  scale: {
    parent: 'game-container',
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth / 1.2,
    height: window.innerHeight,
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
  scene: [MainMenu, Game],
};

export default new Phaser.Game(config);
