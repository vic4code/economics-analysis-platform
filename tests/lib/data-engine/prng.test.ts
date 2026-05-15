/**
 * Tests for the seeded PRNG — determinism is a core invariant of the data engine.
 * Both Python (data_engine.py) and JS (data.js) must produce the same seed values
 * for the same symbol + calendar-day combination.
 */

import { SeededRandom, seedFor } from '@/lib/data-engine/prng';

describe('seedFor', () => {
  it('returns a positive integer for known symbols', () => {
    const seed = seedFor('QQQ');
    expect(typeof seed).toBe('number');
    expect(seed).toBeGreaterThan(0);
    expect(Number.isInteger(seed)).toBe(true);
  });

  it('produces different seeds for different symbols', () => {
    expect(seedFor('QQQ')).not.toBe(seedFor('SPY'));
    expect(seedFor('GLD')).not.toBe(seedFor('TLT'));
  });

  it('is deterministic within the same calendar day', () => {
    expect(seedFor('XLK')).toBe(seedFor('XLK'));
  });
});

describe('SeededRandom', () => {
  it('produces values in [0, 1) for next()', () => {
    const rng = new SeededRandom(42);
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = new SeededRandom(12345);
    const b = new SeededRandom(12345);
    for (let i = 0; i < 20; i++) {
      expect(a.next()).toBe(b.next());
    }
  });

  it('gauss() returns finite numbers', () => {
    const rng = new SeededRandom(99);
    for (let i = 0; i < 50; i++) {
      const v = rng.gauss(0, 1);
      expect(isFinite(v)).toBe(true);
    }
  });
});
