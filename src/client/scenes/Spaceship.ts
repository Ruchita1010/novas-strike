import BulletGroup from './BulletGroup';

const COLORS = [0x2384ff, 0x5ffb1c, 0xff2727, 0xffe633];
export default class Spaceship extends Phaser.Physics.Arcade.Sprite {
  cursors;
  keys;
  bullets: BulletGroup;
  bulletColorIndex;
  lastFiredTime = 0;
  fireInterval = 200;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'spaceship');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setScale(1.2);
    this.bulletColorIndex = Phaser.Math.Between(0, COLORS.length - 1);
    this.setTint(COLORS[this.bulletColorIndex]);
    this.bullets = new BulletGroup(scene);
    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.keys = {
        up: scene.input.keyboard.addKey('W'),
        down: scene.input.keyboard.addKey('S'),
        left: scene.input.keyboard.addKey('A'),
        right: scene.input.keyboard.addKey('D'),
        keyC: scene.input.keyboard.addKey('C'),
      };
    }
  }

  shoot() {
    // Offset bullet to the tip of the spaceship
    const bulletOffset = new Phaser.Math.Vector2();
    bulletOffset.setToPolar(
      this.rotation - Math.PI / 2,
      this.displayHeight * 0.5
    );

    const coords = {
      x: this.x + bulletOffset.x,
      y: this.y + bulletOffset.y,
    };
    const rotation = this.rotation - Math.PI / 2;
    const color = COLORS[this.bulletColorIndex];
    if (color) {
      this.bullets.fireBullet(coords, rotation, color);
    }
  }

  override update() {
    if (!this.cursors || !this.keys || !this.body) {
      return;
    }

    this.setVelocity(0);

    if (this.cursors.left.isDown || this.keys.left.isDown) {
      this.setVelocityX(-300);
    } else if (this.cursors.right.isDown || this.keys.right.isDown) {
      this.setVelocityX(300);
    }
    if (this.cursors.up.isDown || this.keys.up.isDown) {
      this.setVelocityY(-300);
    } else if (this.cursors.down.isDown || this.keys.down.isDown) {
      this.setVelocityY(300);
    }

    if (this.cursors.space.isDown) {
      const currentTime = this.scene.time.now;
      if (currentTime - this.lastFiredTime > this.fireInterval) {
        this.shoot();
        this.lastFiredTime = currentTime;
      }
    }

    const isPressed = Phaser.Input.Keyboard.JustDown(this.keys.keyC);
    if (isPressed) {
      this.bulletColorIndex++;
      if (this.bulletColorIndex >= COLORS.length) {
        this.bulletColorIndex = 0;
      }
      this.setTint(COLORS[this.bulletColorIndex]);
    }

    this.bullets.update();
  }
}
