import type { Player } from '../shared/types.js';

const MAX_PLAYERS_PER_ROOM = 4;
const WAITING_TIME = 30_000;

type Room = {
  id: string;
  players: Player[];
  isAvailable: boolean;
  availableSlots: number[];
  timer: { id: NodeJS.Timeout; endTimeMs: number } | null;
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
      timer: null,
    };
    this.#rooms.set(roomId, room);
    return room;
  }

  getRoom() {
    for (const [, room] of this.#rooms) {
      const remainingTime = room.timer
        ? Math.floor((room.timer.endTimeMs - Date.now()) / 1000)
        : 0;
      if (room.isAvailable && remainingTime > 3) {
        return room;
      }
    }
    return this.#createRoom();
  }

  #finalizeRoom(room: Room) {
    room.isAvailable = false;
    if (room.timer) {
      clearTimeout(room.timer.id);
      room.timer = null;
    }
    // emit game start event
  }

  setupTimer(room: Room) {
    const endTimeMs = Date.now() + WAITING_TIME;
    const id = setTimeout(() => {
      this.#finalizeRoom(room);
    }, WAITING_TIME);
    room.timer = { id, endTimeMs };
  }

  finalizeOnRoomFull(room: Room) {
    if (room.players.length === MAX_PLAYERS_PER_ROOM) {
      this.#finalizeRoom(room);
    }
  }

  removePlayer(roomId: string, socketId: string) {
    const room = this.#rooms.get(roomId);
    if (!room) {
      console.error(`Room not found during disconnect`);
      return -1;
    }

    room.players = room.players.filter((player) => {
      if (player.id === socketId) {
        room.availableSlots.push(player.slot);
        return false;
      }
      return true;
    });

    return room.players.length;
  }

  deleteRoom(roomId: string) {
    this.#rooms.delete(roomId);
  }
}

export const roomManager = new RoomManager();
