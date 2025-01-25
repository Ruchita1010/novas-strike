import { Room } from '../room.js';

export class RoomsManager {
  #rooms: Map<string, Room> = new Map();

  #createNewRoom() {
    const newRoom = new Room();
    this.#rooms.set(newRoom.id, newRoom);
    return newRoom;
  }

  findOrCreateRoom() {
    for (const room of this.#rooms.values()) {
      const { isAvailable, timer } = room;

      if (isAvailable && timer) {
        const remainingTime = Math.floor((timer.endTime - Date.now()) / 1000);
        if (remainingTime > 3) {
          return room;
        }
      }
    }
    return this.#createNewRoom();
  }

  getRoomById(id: string) {
    const room = this.#rooms.get(id);
    if (!room) {
      console.error('Room with the given id not found');
      return;
    }
    return room;
  }

  getAllRooms() {
    return this.#rooms;
  }

  deleteRoom(id: string) {
    this.#rooms.delete(id);
  }
}
