import type { GameObjects } from 'phaser';
import { generateRandomName, getRandomIntVal, switchScene } from '../utils';

export default class MainMenu extends Phaser.Scene {
  #inputPanel?: GameObjects.DOMElement;
  #selectedSpaceship: string = '';

  constructor() {
    super('MainMenu');
  }

  preload() {
    this.load.font(
      'PixelifySans',
      'assets/fonts/pixelifysans-regular.ttf',
      'truetype'
    );
    this.load.html('inputPanel', 'assets/dom/input-panel.html');
    this.load.image('decorBg', 'assets/images/decor-bg.png');
  }

  create() {
    this.add.image(0, 0, 'decorBg').setOrigin(0);

    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    this.add
      .text(centerX, 80, '<< NOVAS STRIKE >>', {
        color: '#fff8bc',
        fontSize: 100,
        fontFamily: 'PixelifySans',
      })
      .setOrigin(0.5);

    this.add.text(
      0,
      630,
      'Move - WASD/Arrow Keys\nShoot - Spacebar\nChange Color - Key C',
      {
        color: '#fff8bc',
        fontSize: 24,
        fontFamily: 'PixelifySans',
      }
    );

    this.#inputPanel = this.add
      .dom(centerX, centerY)
      .createFromCache('inputPanel');

    this.#inputPanel.addListener('click');
    this.#inputPanel.on('click', (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (target.classList.contains('spaceship')) {
        this.#selectSpaceship(target);
      } else if (target.id === 'start-btn') {
        this.#initGame();
      }
    });

    this.events.once('shutdown', () => {
      this.#inputPanel?.removeListener('click');
      this.#inputPanel = undefined;
      this.#selectedSpaceship = '';
    });
  }

  #selectSpaceship(spaceship: HTMLElement) {
    if (this.#selectedSpaceship) {
      const prevSpaceship = this.#inputPanel?.getChildByID(
        this.#selectedSpaceship
      );
      prevSpaceship?.classList.remove('selected');
    }
    this.#selectedSpaceship = spaceship.id;
    spaceship.classList.add('selected');
  }

  #initGame() {
    const input = this.#inputPanel?.getChildByID('player-name');
    const name =
      (input instanceof HTMLInputElement && input.value.trim()) ||
      generateRandomName();

    const spriteKey = this.#selectedSpaceship || `ship${getRandomIntVal(1, 4)}`;

    switchScene(this, 'Lobby', { name, spriteKey });
  }
}
