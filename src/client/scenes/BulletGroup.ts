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

  getBullet() {
    return this.getFirstDead(false) as Bullet | null;
  }
}

export class Bullet extends Phaser.Physics.Arcade.Sprite {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'bullet');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(1.2);
  }

  activate(x: number, y: number, color: number) {
    this.enableBody(true, x, y, true, true);
    this.setTint(color);
  }

  deactivate() {
    this.disableBody(true, true);
  }
}
