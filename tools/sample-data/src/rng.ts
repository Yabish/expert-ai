// Seeded PRNG (mulberry32). Math.random is never used, so the same seed
// always produces byte-identical datasets.

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
  /** Weighted pick; weights need not sum to 1. */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T;
}

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const at = <T>(items: readonly T[], index: number): T => {
    const item = items[index];
    if (item === undefined) throw new RangeError('Cannot pick from an empty list');
    return item;
  };
  return {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    chance: (probability) => next() < probability,
    pick: (items) => at(items, Math.floor(next() * items.length)),
    weighted: (items, weight) => {
      const total = items.reduce((sum, item) => sum + weight(item), 0);
      let target = next() * total;
      for (const item of items) {
        target -= weight(item);
        if (target < 0) return item;
      }
      return at(items, items.length - 1);
    },
  };
}
