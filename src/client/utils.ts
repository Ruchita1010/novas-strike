// max, min inclusive
export function getRandomIntVal(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateRandomName() {
  const prefixes = [
    'Kepler',
    'Wasp',
    'TrES',
    'Delphini',
    'Tauri',
    'Cancri',
    'Pegasi',
    'Andromedae',
    'Gliese',
    'TRAPPIST',
  ];
  const suffixes = ['b', 'c', 'd', 'e', 'f', '1b', '2b', '3b'];

  const randomPrefix = prefixes[getRandomIntVal(0, prefixes.length - 1)];
  const randomSuffix = suffixes[getRandomIntVal(0, suffixes.length - 1)];
  return `${randomPrefix}-${randomSuffix}`;
}

export function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs
    .toString()
    .padStart(2, '0')}`;
}

export function switchScene<T extends object>(
  scene: Phaser.Scene,
  key: string,
  data?: T
) {
  scene.cameras.main.fadeOut(500, 13, 13, 13);
  scene.cameras.main.once(
    Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
    () => {
      scene.scene.start(key, data);
    }
  );
}
