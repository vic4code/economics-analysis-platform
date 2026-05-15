/**
 * Tests for calcStats / compute_stats — shared between Python and JS implementations.
 * Uses 252 trading days/year. Both ports must pass these invariants.
 */

import { computeStats } from '@/lib/data-engine/stats';

describe('computeStats', () => {
  it('returns zero stats for a flat series', () => {
    const flat = Array(252).fill(100);
    const s = computeStats(flat);
    expect(s.totalReturn).toBeCloseTo(0, 4);
    expect(s.cagr).toBeCloseTo(0, 4);
    expect(s.maxDrawdown).toBeCloseTo(0, 4);
  });

  it('returns correct total return', () => {
    const series = [100, 110, 121];
    const s = computeStats(series);
    expect(s.totalReturn).toBeCloseTo(0.21, 4);
  });

  it('max drawdown is non-positive', () => {
    const series = [100, 120, 90, 110, 80, 130];
    const s = computeStats(series);
    expect(s.maxDrawdown).toBeLessThanOrEqual(0);
  });

  it('sharpe is finite for non-trivial series', () => {
    const series = Array.from({ length: 252 }, (_, i) => 100 * (1 + i * 0.001));
    const s = computeStats(series);
    expect(isFinite(s.sharpe)).toBe(true);
  });

  it('handles single-element series gracefully', () => {
    const s = computeStats([100]);
    expect(isFinite(s.totalReturn)).toBe(true);
  });
});
