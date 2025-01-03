import { GameObjects, Scene } from 'phaser';
import { generateRandomName, getRandomIntVal } from '../utils';

export default class MainMenu extends Scene {
  #inputPanel: GameObjects.DOMElement | null = null;
  #selectedSpaceship: string = '';

  constructor() {
    super('MainMenu');
  }

  preload() {
    this.load.html('inputPanel', 'assets/dom/input-panel.html');
  }

  create() {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

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

    console.log(name, spriteKey);
    this.scene.stop('MainMenu');
  }
}
