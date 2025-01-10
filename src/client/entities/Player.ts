import type { Player as PlayerType } from '../../shared/types';

export default class Player extends Phaser.Physics.Arcade.Sprite {
  #roomId;
  #nameText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, playerConfig: PlayerType) {
    const { name, x, y, spriteKey, roomId } = playerConfig;
    super(scene, x, y, spriteKey);
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(1.2);
    this.#roomId = roomId;
    this.#nameText = scene.add.text(x + 5, y + 45, name).setOrigin(0.5);
  }

  override update() {
    console.log(`player:move-${this.#nameText} in ${this.#roomId}`);
  }
}
