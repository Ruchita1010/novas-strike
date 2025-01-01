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
