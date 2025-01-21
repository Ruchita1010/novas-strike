export default class NovaGroup extends Phaser.Physics.Arcade.Group {
  constructor(scene: Phaser.Scene) {
    super(scene.physics.world, scene);
    this.createMultiple({
      classType: Nova,
      key: 'nova',
      quantity: 30,
      active: false,
      visible: false,
    });
  }
}

const COLORS = [0x2384ff, 0x5ffb1c, 0xff2727, 0xffe633];
export class Nova extends Phaser.Physics.Arcade.Sprite {
  color = 0xffffff;
  constructor(scene: Phaser.Scene, x: number, y: number, key: string) {
    super(scene, x, y, key);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.scene.time.addEvent({
      delay: Phaser.Math.Between(2000, 5000), // Random delay before first color display
      callback: this.displayColor,
      callbackScope: this,
      loop: true,
    });
  }

  spawn(x: number, y: number, colorIdx: number) {
    this.enableBody(true, x, y, true, true);
    this.anims.play('spawn');
    const color = COLORS[colorIdx];
    if (color) {
      this.color = color;
    }
  }

  displayColor() {
    this.setTint(this.color);
    this.scene.time.delayedCall(500, () => {
      this.clearTint();
    });
  }

  deactivate() {
    this.disableBody(true, true);
  }
}
