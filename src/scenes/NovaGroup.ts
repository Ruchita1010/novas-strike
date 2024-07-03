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

  spawnWave() {
    const waveSize = Phaser.Math.Between(15, 20);
    for (let i = 0; i < waveSize; i++) {
      const nova = this.getFirstDead(false);
      if (nova) {
        const x = Phaser.Math.Between(10, this.scene.scale.width - 10);
        const y = Phaser.Math.Between(-100, -10);
        nova.spawn(x, y);
      }
    }
  }

  update() {
    if (this.countActive(true) < 10) {
      this.spawnWave();
    }

    this.getChildren().forEach((child) => {
      const nova = child as Nova;
      if (nova.active && nova.y >= this.scene.sys.canvas.height) {
        nova.deactivate();
      }
    });
  }
}

const COLORS = [0x2384ff, 0x5ffb1c, 0xff2727, 0xffe633];
class Nova extends Phaser.Physics.Arcade.Sprite {
  color;
  constructor(scene: Phaser.Scene, x: number, y: number, key: string) {
    super(scene, x, y, key);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(1.5);
    this.color = Phaser.Utils.Array.GetRandom(COLORS);
    this.scene.time.addEvent({
      delay: Phaser.Math.Between(2000, 5000), // Random delay before first color display
      callback: this.displayColor,
      callbackScope: this,
      loop: true,
    });
  }

  spawn(x: number, y: number) {
    this.enableBody(true, x, y, true, true);
    this.setAccelerationY(2);
    this.anims.play('spawn');
    this.displayColor();
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

export type NovaType = Nova;
