import { Scene } from 'phaser';
import Spaceship from './Spaceship';
import NovaGroup, { type NovaType } from './NovaGroup';
import ExplosionGroup from './ExplosionGroup';
import { type BulletType } from './BulletGroup';

export default class Game extends Scene {
  // Adding '?' to avoid "Property has no initializer" error, as Phaser 3 doesn't allow initializing game objects in the constructor of class extended from Scene
  spaceship?: Spaceship;
  novas?: NovaGroup;
  explosions?: ExplosionGroup;
  explosionSound?:
    | Phaser.Sound.NoAudioSound
    | Phaser.Sound.HTML5AudioSound
    | Phaser.Sound.WebAudioSound;
  constructor() {
    super('Game');
  }

  preload() {
    this.load.image('space-bg', 'assets/images/space.webp');
    this.load.image('spaceship', 'assets/images/spaceship.webp');

    this.load.spritesheet('nova', 'assets/images/nova.webp', {
      frameWidth: 32,
      frameHeight: 31,
    });
    this.load.spritesheet('bullet', 'assets/images/bullet.webp', {
      frameWidth: 15.75,
      frameHeight: 9,
    });
    this.load.spritesheet('explosion', 'assets/images/explosion.webp', {
      frameWidth: 29.25,
      frameHeight: 31,
    });

    this.load.audio('music', [
      'assets/audio/music.ogg',
      'assets/audio/music.wav',
    ]);
    this.load.audio('boom', 'assets/audio/boom.wav');
  }

  create() {
    this.add.image(400, 300, 'space-bg');
    this.spaceship = new Spaceship(this, 550, 650);
    this.novas = new NovaGroup(this);
    this.explosions = new ExplosionGroup(this);

    this.anims.create({
      key: 'fire',
      frames: this.anims.generateFrameNumbers('bullet', { start: 0, end: 3 }),
      repeat: -1,
    });
    this.anims.create({
      key: 'spawn',
      frames: this.anims.generateFrameNumbers('nova', { start: 0, end: 3 }),
      repeat: -1,
    });
    this.anims.create({
      key: 'explode',
      frames: this.anims.generateFrameNumbers('explosion', {
        start: 3,
        end: 0,
      }),
    });

    this.explosionSound = this.sound.add('boom', {
      volume: 0.5,
    });

    const music = this.sound.add('music', {
      volume: 1,
      loop: true,
    });

    if (!this.sound.locked) {
      music.play();
    } else {
      this.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
        music.play();
      });
    }
  }

  override update() {
    if (!this.spaceship || !this.novas) {
      return;
    }

    this.spaceship.update();
    this.novas.update();

    this.physics.overlap(
      this.spaceship.bullets,
      this.novas,
      (object1, object2) => {
        const bullet = object1 as BulletType;
        const nova = object2 as NovaType;
        if (bullet.active && nova.active) {
          bullet.deactivate();
          if (nova.color === bullet.tint) {
            nova.deactivate();
            this.explosions?.explode(nova.x, nova.y);
            // player would've interacted before playing this sound, so skipping the check
            this.explosionSound?.play();
          }
        }
      }
    );
  }
}
