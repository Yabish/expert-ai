import { describe, expect, it } from 'vitest';
import { createRng } from './rng.js';

describe('createRng', () => {
  it('is reproducible for a seed and differs across seeds', () => {
    const draw = (seed: number): number[] => {
      const rng = createRng(seed);
      return Array.from({ length: 50 }, () => rng.int(1, 6));
    };
    expect(draw(3)).toEqual(draw(3));
    expect(draw(3)).not.toEqual(draw(4));
  });

  it('keeps values in range', () => {
    const rng = createRng(9);
    const draws = Array.from({ length: 500 }, () => rng.int(1, 6));
    expect(draws.every((d) => d >= 1 && d <= 6)).toBe(true);
    expect(new Set(draws).size).toBe(6);
    expect(Array.from({ length: 100 }, () => rng.next()).every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it('picks, weighs and flips coins deterministically', () => {
    const rng = createRng(1);
    expect(['a', 'b', 'c']).toContain(rng.pick(['a', 'b', 'c']));
    expect(rng.weighted(['never', 'always'], (x) => (x === 'always' ? 1 : 0))).toBe('always');
    expect(rng.chance(1)).toBe(true);
    expect(rng.chance(0)).toBe(false);
  });

  it('refuses to pick from an empty list', () => {
    expect(() => createRng(1).pick([])).toThrow(RangeError);
    expect(() => createRng(1).weighted([], () => 1)).toThrow(RangeError);
  });
});
