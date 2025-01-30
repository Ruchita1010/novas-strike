export type Player = {
  id: string;
  name: string;
  x: number;
  y: number;
  spriteKey: string;
  slot: number;
  colorIdx: number;
  seqNumber: number;
  kills: number;
  health: number;
};

export type PlayerProfile = Pick<Player, 'name' | 'spriteKey'>;

export type Direction = 'left' | 'right' | 'up' | 'down';

export type Bullet = {
  x: number;
  y: number;
  colorIdx: number;
  playerId: string;
};

export type Nova = {
  x: number;
  y: number;
  colorIdx: number;
};

type PlayerState = {
  id: string;
  x: number;
  y: number;
  colorIdx: number;
  seqNumber: number;
};

export type GameState = {
  players: PlayerState[];
  bullets: [number, Bullet][];
  novas: [number, Nova][];
};

export type PlayerStat = Pick<Player, 'name' | 'spriteKey' | 'kills'>;

export type GameResult = {
  playerStats: PlayerStat[];
  killPercentage: number;
  isVictory: boolean;
};

export type ClientToServerEvents = {
  'player:join': (playerProfile: PlayerProfile) => void;
  'player:move': (
    roomId: string,
    direction: Direction,
    seqNumber: number
  ) => void;
  'player:fire': (roomId: string, x: number, y: number) => void;
  'player:colorChange': (roomId: string) => void;
};

export type ServerToClientEvents = {
  'player:joined': (player: Player) => void;
  'player:left': (playerId: string) => void;
  'lobby:state': (players: Player[], timerEndTime: number) => void;
  'game:start': (roomId: string, players: Player[]) => void;
  'game:state': (gameState: GameState) => void;
  'game:over': (gameResult: GameResult) => void;
  'nova:attacked': () => void;
};
