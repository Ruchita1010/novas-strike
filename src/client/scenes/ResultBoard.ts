import type { PlayerStat } from '../../shared/types';

type SceneInitData = {
  playerStats: PlayerStat[];
  killPercentage: number;
  isVictory: boolean;
};

export default class ResultBoard extends Phaser.Scene {
  #playerStats?: PlayerStat[];
  #killPercentage?: number;
  #isVictory?: boolean;

  constructor() {
    super('ResultBoard');
  }

  init({ playerStats, killPercentage, isVictory }: SceneInitData) {
    this.#playerStats = playerStats;
    this.#killPercentage = killPercentage;
    this.#isVictory = isVictory;
  }

  create() {
    const centerX = this.scale.width / 2;

    this.add
      .text(centerX, 100, this.#isVictory ? 'VICTORY' : 'DEFEAT', {
        fontFamily: 'PixelifySans',
        fontSize: 52,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(
        centerX,
        160,
        `Your crew killed ${this.#killPercentage}% of novas`,
        {
          fontFamily: 'PixelifySans',
          fontSize: 30,
        }
      )
      .setOrigin(0.5);

    this.#displayPlayerStats(centerX, 300);
  }

  #displayPlayerStats(centerX: number, y: number) {
    if (!this.#playerStats) return;

    this.add
      .text(200, y, 'Kills: ', { fontFamily: 'PixelifySans', fontSize: 30 })
      .setOrigin(0.5);

    const startX = centerX - (this.#playerStats.length - 1) * 100;

    this.#playerStats?.forEach((player, index) => {
      const x = startX + index * 220;
      const { name, spriteKey, kills } = player;

      this.add
        .text(x, y, `${kills}`, { fontFamily: 'PixelifySans', fontSize: 25 })
        .setOrigin(0.5);
      this.add.sprite(x, y + 100, spriteKey).setScale(1.5);
      this.add
        .text(x, y + 160, name, {
          fontFamily: 'PixelifySans',
          fontSize: '20px',
        })
        .setOrigin(0.5);
    });
  }
}
