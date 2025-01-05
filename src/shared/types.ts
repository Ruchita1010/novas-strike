export type Player = {
  id: string;
  name: string;
  x: number;
  y: number;
  spriteKey: string;
  slot: number;
  roomId: string;
};

export type PlayerSelection = Pick<Player, 'name' | 'spriteKey'>;

export type ClientToServerEvents = {
  'player:join': (
    playerSelection: PlayerSelection,
    gameWidth: number,
    gameHeight: number
  ) => void;
};

export type ServerToClientEvents = {
  'player:joined': (player: Player) => void;
  'game:currentState': (players: Player[], timerEndTime: number) => void;
};
