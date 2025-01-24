import { Room } from '../room.js';

export class RoomsManager {
  #rooms: Map<string, Room> = new Map();

  #createRoom() {
    const room = new Room();
    this.#rooms.set(room.id, room);
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

  getAllRooms() {
    return this.#rooms;
  }

  getRoomById(id: string) {
    return this.#rooms.get(id);
  }

  deleteRoom(id: string) {
    this.#rooms.delete(id);
  }
}
