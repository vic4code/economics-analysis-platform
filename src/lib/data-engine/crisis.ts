import { MOCK_EVENTS } from './constants';
import { SeededRandom } from './prng';
import type { CrisisEvent, CrisisPricePoint } from '@/types';

// Sector-specific crisis beta — how much each sector amplifies a systemic shock
const SECTOR_CRISIS_BETA: Record<string, number> = {
  Crypto:         2.4,
  Technology:     1.5,
  'Real Estate':  1.2,
  Energy:         1.3,
  Healthcare:     0.55,
  Financials:     1.4,
  Consumer:       0.85,
  Industrials:    1.1,
  Materials:      1.2,
  Utilities:      0.45,
  Bonds:          0.30,
  Commodities:    0.90,
  International:  1.15,
  'Broad Market': 1.0,
};

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function buildPriceTrack(
  rng: SeededRandom,
  maxDrawdown: number,
  drawdownDays: number,
  recoveryDays: number,
): CrisisPricePoint[] {
  const PRE_DAYS = 20;
  const POST_DAYS = 100;
  const points: CrisisPricePoint[] = [];

  // Pre-event: gentle drift around 100
  for (let d = -PRE_DAYS; d < 0; d++) {
    const noise = rng.gauss(0, 0.3);
    points.push({ day: d, price: Math.round((100 + noise) * 100) / 100 });
  }

  // Crash phase: smooth drawdown with noise
  const crashBottom = 100 + maxDrawdown; // e.g. 100 - 34 = 66
  for (let d = 0; d <= drawdownDays; d++) {
    const t = d / drawdownDays;
    // Accelerates into the bottom (cubic)
    const base = 100 + maxDrawdown * (3 * t * t - 2 * t * t * t);
    const noise = rng.gauss(0, Math.abs(maxDrawdown) * 0.02);
    points.push({ day: d, price: Math.round(Math.max(crashBottom * 0.98, base + noise) * 100) / 100 });
  }

  // Recovery phase: logarithmic recovery with noise
  for (let d = 1; d <= POST_DAYS - drawdownDays; d++) {
    const t = Math.min(1, d / recoveryDays);
    const base = crashBottom + Math.abs(maxDrawdown) * (1 - Math.exp(-3 * t));
    const noise = rng.gauss(0, Math.abs(maxDrawdown) * 0.015);
    const capped = Math.min(102, base + noise);
    points.push({ day: drawdownDays + d, price: Math.round(capped * 100) / 100 });
  }

  return points;
}

export function getCrisisData(): CrisisEvent[] {
  // Use events with magnitude <= -2 as "crisis" events
  const crashEvents = MOCK_EVENTS.filter(e => e.magnitude <= -2);

  return crashEvents.map(ev => {
    // Seed from event date so data is deterministic within a day
    const dateSeed = ev.date.split('-').reduce((s, p) => s + parseInt(p, 10), 0);
    const rng = new SeededRandom(dateSeed * 17 + Math.abs(ev.magnitude) * 31);

    const severity = Math.abs(ev.magnitude); // 2 or 3

    // Core metrics seeded from event
    const maxDrawdown = -(severity === 3
      ? rng.gauss(28, 6)   // magnitude -3: ~22–40% drawdown
      : rng.gauss(14, 4)); // magnitude -2: ~8–20% drawdown
    const drawdownDays  = Math.round(rng.gauss(severity === 3 ? 22 : 14, 4));
    const recoveryDays  = Math.round(rng.gauss(severity === 3 ? 65 : 35, 10));
    const buySignalDay  = Math.round(rng.gauss(3, 1));   // ~2–5 days after bottom
    const buySignalGain = Math.round(rng.gauss(severity === 3 ? 18 : 10, 3) * 10) / 10;

    // Per-sector drawdowns
    const sectorDrawdowns: Record<string, number> = {};
    for (const [sector, beta] of Object.entries(SECTOR_CRISIS_BETA)) {
      const base = maxDrawdown * beta;
      const noise = rng.gauss(0, Math.abs(base) * 0.15);
      sectorDrawdowns[sector] = Math.round((base + noise) * 10) / 10;
    }

    // Override affected sectors to be harder hit
    ev.sectors.forEach(sec => {
      if (sectorDrawdowns[sec] !== undefined) {
        sectorDrawdowns[sec] = Math.round(sectorDrawdowns[sec] * 1.3 * 10) / 10;
      }
    });

    const priceTrack = buildPriceTrack(rng, maxDrawdown, drawdownDays, recoveryDays);

    return {
      id:           ev.date + '-' + ev.type,
      date:         ev.date,
      bottomDate:   addDays(ev.date, drawdownDays),
      recoveryDate: addDays(ev.date, drawdownDays + recoveryDays),
      title:        ev.title,
      type:         ev.type,
      sectors:      ev.sectors,
      magnitude:    ev.magnitude,
      detail:       ev.detail,
      maxDrawdown:  Math.round(maxDrawdown * 10) / 10,
      drawdownDays,
      recoveryDays,
      buySignalDay,
      buySignalGain,
      sectorDrawdowns,
      priceTrack,
    };
  });
}
