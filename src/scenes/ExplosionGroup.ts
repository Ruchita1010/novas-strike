export default class ExplosionGroup extends Phaser.Physics.Arcade.Group {
  constructor(scene: Phaser.Scene) {
    super(scene.physics.world, scene);
    this.createMultiple({
      classType: Phaser.Physics.Arcade.Sprite,
      key: 'explosion',
      quantity: 30,
      active: false,
      visible: false,
    });
  }

  explode(x: number, y: number) {
    const explosion = this.getFirstDead(false);
    if (explosion) {
      explosion.setActive(true).setVisible(true).setPosition(x, y);
      explosion.play('explode');
      explosion.once('animationcomplete', () => {
        explosion.setActive(false).setVisible(false);
      });
    }
  }
}
