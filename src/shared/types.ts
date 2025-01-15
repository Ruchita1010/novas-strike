export type Player = {
  id: string;
  name: string;
  x: number;
  y: number;
  spriteKey: string;
  slot: number;
  seqNumber: number;
};

export type PlayerSelection = Pick<Player, 'name' | 'spriteKey'>;

export type Direction = 'left' | 'right' | 'up' | 'down';

export type ClientToServerEvents = {
  'player:join': (
    playerSelection: PlayerSelection,
    gameWidth: number,
    gameHeight: number
  ) => void;
  'player:move': (MovementPayload: {
    roomId: string;
    direction: Direction;
    seqNumber: number;
  }) => void;
};

export type ServerToClientEvents = {
  'player:joined': (player: Player) => void;
  'player:left': (playerId: string) => void;
  'players:update': (players: Player[]) => void;
  'game:currentState': (players: Player[], timerEndTime: number) => void;
  'game:start': (roomId: string, players: Player[]) => void;
};
