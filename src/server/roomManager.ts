const MAX_PLAYERS_PER_ROOM = 4;
const WAITING_TIME = 30_000;

type Player = {
  id: string;
  name: string;
  x: number;
  y: number;
  spriteKey: string;
  slot: number;
  roomId: string;
};

type Room = {
  id: string;
  players: Player[];
  isAvailable: boolean;
  availableSlots: number[];
  timerId: NodeJS.Timeout | null;
  timerEndTime: number;
};

class RoomManager {
  #rooms: Map<string, Room> = new Map();

  #createRoom() {
    const roomId = `room_${Date.now()}`;
    const room = {
      id: roomId,
      players: [],
      isAvailable: true,
      availableSlots: Array.from(
        { length: MAX_PLAYERS_PER_ROOM },
        (_, i) => MAX_PLAYERS_PER_ROOM - 1 - i
      ),
      timerId: null,
      timerEndTime: 0,
    };
    this.#rooms.set(roomId, room);
    return room;
  }

  getRoom(): Room {
    for (const [, room] of this.#rooms) {
      const remainingTime = Math.floor(room.timerEndTime - Date.now() / 1000);
      if (room.isAvailable && (room.timerId ?? remainingTime > 3)) {
        return room;
      }
    }
    return this.#createRoom();
  }

  setupTimer(room: Room) {
    room.timerEndTime = Date.now() + WAITING_TIME;
    room.timerId = setTimeout(() => {
      room.isAvailable = false;
      if (room.timerId) {
        clearTimeout(room.timerId);
        room.timerId = null;
      }
      // emit game start
    }, WAITING_TIME);
  }

  handleRoomFull(room: Room) {
    if (room.players.length === MAX_PLAYERS_PER_ROOM) {
      room.isAvailable = false;
      if (room.timerId) {
        clearTimeout(room.timerId);
        room.timerId = null;
      }
      // emit game start event
      return;
    }
  }
}

export const roomManager = new RoomManager();
