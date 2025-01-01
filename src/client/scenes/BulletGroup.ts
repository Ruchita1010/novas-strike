export default class BulletGroup extends Phaser.Physics.Arcade.Group {
  constructor(scene: Phaser.Scene) {
    super(scene.physics.world, scene);
    this.createMultiple({
      classType: Bullet,
      key: 'bullet',
      quantity: 20,
      active: false,
      visible: false,
    });
  }

  fireBullet(
    coords: { x: number; y: number },
    rotation: number,
    color: number
  ) {
    const bullet = this.getFirstDead(false);
    if (bullet) {
      bullet.fire(coords, rotation, color);
    }
  }

  update() {
    this.getChildren().forEach((child) => {
      const bullet = child as Bullet;
      if (
        bullet.active &&
        (bullet.y <= 0 ||
          bullet.y >= this.scene.sys.canvas.height ||
          bullet.x <= 0 ||
          bullet.x >= this.scene.sys.canvas.width)
      ) {
        bullet.deactivate();
      }
    });
  }
}

class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'bullet');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(2);
  }

  fire({ x, y }: { x: number; y: number }, rotation: number, color: number) {
    this.enableBody(true, x, y, true, true);
    this.rotation = rotation;
    const vec = this.scene.physics.velocityFromRotation(rotation, 600);
    this.setVelocity(vec.x, vec.y);
    this.setTint(color);
    this.anims.play('fire');
  }

  deactivate() {
    this.disableBody(true, true);
  }
}

export type BulletType = Bullet;
