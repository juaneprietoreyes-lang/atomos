/** Estado global mínimo: un objeto, set() parcial y suscriptores. Sin framework. */
export interface Store<T extends object> {
  get(): T;
  set(patch: Partial<T>): void;
  subscribe(fn: (state: T, prev: T) => void): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const subs = new Set<(state: T, prev: T) => void>();
  return {
    get: () => state,
    set(patch) {
      const prev = state;
      state = { ...state, ...patch };
      for (const fn of subs) fn(state, prev);
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}
