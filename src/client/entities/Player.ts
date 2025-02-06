import BulletGroup from './BulletGroup';
import type { Player as PlayerType } from '../../shared/types';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  id;
  #nameText;
  #targetX;
  #targetY;
  #cursors;
  #keys;
  #lastFiredTime = 0;
  readonly #coolDown = 250;
  #bulletGroup: BulletGroup;
  #health = 100;
  #healthBar;

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
    this.#bulletGroup = new BulletGroup(scene);
    this.#healthBar = scene.add.graphics();
    this.#healthBar.fillStyle(0x2384ff, 1);
    this.#healthBar.fillRect(-4, -10, 7, 35);

    if (scene.input.keyboard) {
      this.#cursors = scene.input.keyboard.createCursorKeys();
      this.#keys = {
        up: scene.input.keyboard.addKey('W'),
        down: scene.input.keyboard.addKey('S'),
        left: scene.input.keyboard.addKey('A'),
        right: scene.input.keyboard.addKey('D'),
        keyC: scene.input.keyboard.addKey('C'),
      };
    }
  }

  getInput() {
    if (!this.#cursors || !this.#keys) {
      return { left: false, right: false, up: false, down: false };
    }

    const currentTime = this.scene.time.now;
    const canFire =
      this.#cursors.space.isDown &&
      currentTime - this.#lastFiredTime > this.#coolDown;

    if (canFire) {
      this.#lastFiredTime = currentTime;
    }

    return {
      left: this.#cursors.left.isDown || this.#keys.left.isDown,
      right: this.#cursors.right.isDown || this.#keys.right.isDown,
      up: this.#cursors.up.isDown || this.#keys.up.isDown,
      down: this.#cursors.down.isDown || this.#keys.down.isDown,
      fire: canFire,
      color: Phaser.Input.Keyboard.JustDown(this.#keys.keyC),
    };
  }

  fireBullet(x: number, y: number, color: number) {
    const bullet = this.#bulletGroup.getBullet();
    if (bullet) {
      bullet.activate(x, y, color);
    }
    return bullet;
  }

  setTargetPosition(x: number, y: number) {
    this.#targetX = x;
    this.#targetY = y;
  }

  move(dx: number, dy: number) {
    this.#targetX += dx;
    this.#targetY += dy;
  }

  updateHealth(amount: number) {
    this.#health = Phaser.Math.Clamp(this.#health + amount, 0, 100);
    this.#healthBar.clear();

    const healthHeight = (this.#health / 100) * 35;
    this.#healthBar.fillStyle(0x2384ff, 1);
    this.#healthBar.fillRect(-4, 25 - healthHeight, 7, healthHeight);
  }

  override update() {
    const x = Phaser.Math.Linear(this.x, this.#targetX, 0.5);
    const y = Phaser.Math.Linear(this.y, this.#targetY, 0.5);

    this.setPosition(x, y);
    this.#nameText.setPosition(x, y + 45);
    this.#healthBar.setPosition(x, y);
  }
}
