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

  preload() {
    this.load.html('restartBtn', 'assets/dom/restart-btn.html');
  }

  create() {
    this.add.image(0, 0, 'decorBg').setOrigin(0);

    const centerX = this.scale.width / 2;

    this.add
      .text(centerX, 100, this.#isVictory ? 'VICTORY' : 'DEFEAT', {
        color: '#fff8bc',
        fontSize: 55,
        fontStyle: 'bold',
        fontFamily: 'PixelifySans',
      })
      .setOrigin(0.5);

    this.add
      .text(
        centerX,
        160,
        `Your crew killed ${this.#killPercentage}% of novas`,
        {
          color: '#cd894a',
          fontSize: 30,
          fontFamily: 'PixelifySans',
        }
      )
      .setOrigin(0.5);

    this.#displayPlayerStats(centerX, 300);
    this.#addRestartBtn(centerX);
  }

  #displayPlayerStats(centerX: number, y: number) {
    if (!this.#playerStats) return;

    this.add
      .text(200, y, 'Kills: ', {
        color: '#fff8bc',
        fontSize: 30,
        fontFamily: 'PixelifySans',
      })
      .setOrigin(0.5);

    const startX = centerX - (this.#playerStats.length - 1) * 100;

    this.#playerStats?.forEach((player, index) => {
      const x = startX + index * 220;
      const { name, spriteKey, kills } = player;

      this.add
        .text(x, y, `${kills}`, {
          color: '#fff8bc',
          fontSize: 25,
          fontFamily: 'PixelifySans',
        })
        .setOrigin(0.5);

      this.add.sprite(x, y + 100, spriteKey).setScale(1.5);

      this.add
        .text(x, y + 160, name, {
          color: '#cd894a',
          fontSize: 20,
          fontFamily: 'PixelifySans',
        })
        .setOrigin(0.5);
    });
  }

  #addRestartBtn(centerX: number) {
    const restartBtn = this.add.dom(centerX, 600).createFromCache('restartBtn');

    restartBtn.addListener('click');
    restartBtn.on('click', () => {
      // There's no option to handle game restart directly in phaser.
      // For now, going with page refresh instead of destroying and creating new game object. Check more on this later.
      location.reload();
    });
  }
}
