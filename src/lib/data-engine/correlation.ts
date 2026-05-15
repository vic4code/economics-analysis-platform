import { ETF_UNIVERSE, SECTOR_DRIFT } from './constants';
import { SeededRandom, seedFor } from './prng';
import type { CorrelationMatrix } from '@/types';

// Representative ETFs — one or two per sector, 16 total
const CORR_SYMBOLS = [
  'SPY',  // Broad Market
  'QQQ',  // Technology
  'SMH',  // Technology (semi)
  'XLF',  // Financials
  'XLV',  // Healthcare
  'XLE',  // Energy
  'XLY',  // Consumer
  'XLU',  // Utilities
  'TLT',  // Bonds (long)
  'AGG',  // Bonds (agg)
  'HYG',  // Bonds (HY)
  'GLD',  // Commodities (gold)
  'USO',  // Commodities (oil)
  'VNQ',  // Real Estate
  'EEM',  // International (EM)
  'IBIT', // Crypto
];

// Market beta per sector — drives cross-asset correlation structure
const SECTOR_BETA: Record<string, number> = {
  'Broad Market':  1.00,
  'Technology':    1.10,
  'Financials':    0.90,
  'Healthcare':    0.65,
  'Energy':        0.80,
  'Consumer':      0.78,
  'Industrials':   0.85,
  'Materials':     0.82,
  'Real Estate':   0.55,
  'Utilities':     0.35,
  'Bonds':        -0.15,
  'Commodities':   0.18,
  'International': 0.80,
  'Crypto':        1.20,
};

const MARKET_VOL = 0.012;
const TOTAL_DAYS = 304;  // 252 full window + 52-week rolling buffer
const ROLLING_WINDOW = 30;
const ROLLING_STEP   = 7;
const N_ROLLING      = 37; // ~9 months of weekly points

function generateMarketReturns(n: number): number[] {
  const seed = Math.floor(Date.now() / 86400000) * 98765 + 43210;
  const rng  = new SeededRandom(seed);
  return Array.from({ length: n }, () => rng.gauss(0, MARKET_VOL));
}

function generateFactorReturns(
  symbol: string,
  marketReturns: number[],
): number[] {
  const info = ETF_UNIVERSE[symbol];
  if (!info) return marketReturns.map(() => 0);

  const beta    = SECTOR_BETA[info.sector] ?? 0.8;
  const drift   = SECTOR_DRIFT[info.sector] ?? 0;
  const idioVar = Math.max(0, info.vol ** 2 - (beta * MARKET_VOL) ** 2);
  const idioVol = Math.sqrt(idioVar);

  const rng     = new SeededRandom(seedFor(symbol));
  return marketReturns.map(m => beta * m + rng.gauss(drift, idioVol));
}

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  if (n < 4) return 0;
  let sa = 0, sb = 0;
  for (let i = 0; i < n; i++) { sa += a[i]; sb += b[i]; }
  const ma = sa / n, mb = sb / n;
  let num = 0, va = 0, vb = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - ma, db = b[i] - mb;
    num += da * db; va += da * da; vb += db * db;
  }
  const denom = Math.sqrt(va * vb);
  return denom < 1e-14 ? 0 : Math.round((num / denom) * 1000) / 1000;
}

export function getCorrelationData(): CorrelationMatrix {
  const symbols = CORR_SYMBOLS;
  const n       = symbols.length;
  const market  = generateMarketReturns(TOTAL_DAYS);
  const allRet  = symbols.map(s => generateFactorReturns(s, market));

  // Full correlation over the last 252 trading days
  const matrix: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (__, j) => {
      if (i === j) return 1;
      return pearson(allRet[i].slice(-252), allRet[j].slice(-252));
    }),
  );

  // Rolling N_ROLLING weekly points for every pair
  const rolling: CorrelationMatrix['rolling'] = [];
  const rollStart = TOTAL_DAYS - N_ROLLING * ROLLING_STEP - ROLLING_WINDOW;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const values = Array.from({ length: N_ROLLING }, (_, k) => {
        const pos = rollStart + k * ROLLING_STEP;
        return pearson(
          allRet[i].slice(pos, pos + ROLLING_WINDOW),
          allRet[j].slice(pos, pos + ROLLING_WINDOW),
        );
      });
      rolling.push({ symbols: [symbols[i], symbols[j]], values });
    }
  }

  return {
    symbols,
    names:   symbols.map(s => ETF_UNIVERSE[s]?.name   ?? s),
    sectors: symbols.map(s => ETF_UNIVERSE[s]?.sector ?? ''),
    matrix,
    rolling,
  };
}
