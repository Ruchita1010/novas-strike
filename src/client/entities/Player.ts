import type { Player as PlayerType } from '../../shared/types';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  id;
  #nameText;
  #targetX;
  #targetY;
  #cursors;
  #keys;

  constructor(scene: Phaser.Scene, playerData: PlayerType) {
    const { id, name, x, y, spriteKey } = playerData;
    super(scene, x, y, spriteKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(1.2);

    this.id = id;
    this.#targetX = x;
    this.#targetY = y;
    this.#nameText = scene.add.text(x, y + 45, name).setOrigin(0.5);
    if (scene.input.keyboard) {
      this.#cursors = scene.input.keyboard.createCursorKeys();
      this.#keys = {
        up: scene.input.keyboard.addKey('W'),
        down: scene.input.keyboard.addKey('S'),
        left: scene.input.keyboard.addKey('A'),
        right: scene.input.keyboard.addKey('D'),
      };
    }
  }

  getInput() {
    if (!this.#cursors || !this.#keys) {
      return { left: false, right: false, up: false, down: false };
    }

    return {
      left: this.#cursors.left.isDown || this.#keys.left.isDown,
      right: this.#cursors.right.isDown || this.#keys.right.isDown,
      up: this.#cursors.up.isDown || this.#keys.up.isDown,
      down: this.#cursors.down.isDown || this.#keys.down.isDown,
    };
  }

  setTargetPosition(x: number, y: number) {
    this.#targetX = x;
    this.#targetY = y;
  }

  move(dx: number, dy: number) {
    this.#targetX += dx;
    this.#targetY += dy;
  }

  override update() {
    const x = Phaser.Math.Linear(this.x, this.#targetX, 0.5);
    const y = Phaser.Math.Linear(this.y, this.#targetY, 0.5);

    this.setPosition(x, y);
    this.#nameText.setPosition(x, y + 45);
  }
}
