export class ObjectPool<T> {
  #pool: T[] = [];

  constructor(factory: () => T, size: number) {
    for (let i = 0; i < size; i++) {
      this.#pool.push(factory());
    }
  }

  acquire() {
    const obj = this.#pool.pop();
    if (!obj) {
      return null;
    }
    return obj;
  }

  release(obj: T): void {
    this.#pool.push(obj);
  }
}
