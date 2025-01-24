export type Player = {
  id: string;
  name: string;
  x: number;
  y: number;
  spriteKey: string;
  slot: number;
  colorIdx: number;
  seqNumber: number;
};

export type PlayerSelection = Pick<Player, 'name' | 'spriteKey'>;

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

type PlayerDelta = {
  id: string;
  x: number;
  y: number;
  colorIdx: number;
  seqNumber: number;
};

export type GameState = {
  players: PlayerDelta[];
  bullets: [number, Bullet][];
  novas: [number, Nova][];
};

export type ClientToServerEvents = {
  'player:join': (
    playerSelection: PlayerSelection,
    gameWidth: number,
    gameHeight: number
  ) => void;
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
  'game:currentState': (players: Player[], timerEndTime: number) => void;
  'game:start': (roomId: string, players: Player[]) => void;
  'game:state': (gameState: GameState) => void;
};
