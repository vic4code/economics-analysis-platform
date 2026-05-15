import { THEME_ETF } from './constants';
import { generateSeries, DailySeries } from './series';
import { computeStats, IndexedPoint, StatsResult } from './stats';

export interface BacktestResult {
  portfolio: IndexedPoint[];
  benchmark: IndexedPoint[];
  stats: (StatsResult & { spy_return: number }) | Record<string, never>;
}

export interface StrategyResult {
  momentum: IndexedPoint[];
  equal_weight: IndexedPoint[];
  spy: IndexedPoint[];
  theme_names: Record<string, string>;
  stats: {
    momentum:     StatsResult | Record<string, never>;
    equal_weight: StatsResult | Record<string, never>;
    spy:          StatsResult | Record<string, never>;
  };
}

const BACKTEST_PERIOD_DAYS: Record<string, number> = { '1y': 365, '3y': 1095, '5y': 1825 };

export async function runBacktest(
  weights: Record<string, number>,
  period: string,
): Promise<BacktestResult> {
  const periodDays = BACKTEST_PERIOD_DAYS[period] ?? 365;

  const syms = Object.keys(weights);
  const [seriesResults, spySeries] = await Promise.all([
    Promise.all(syms.map(sym => generateSeries(sym, periodDays + 30))),
    generateSeries('SPY', periodDays + 30),
  ]);

  const seriesMap: Record<string, DailySeries[]> = {};
  for (let i = 0; i < syms.length; i++) seriesMap[syms[i]] = seriesResults[i];

  const allDates = Array.from(new Set(spySeries.map(b => b.date))).sort().slice(-periodDays);

  const makeIndex = (series: DailySeries[]) => {
    const m: Record<string, number> = {};
    for (const b of series) m[b.date] = b.close;
    return m;
  };
  const spyIdx: Record<string, number> = makeIndex(spySeries);
  const symIdx: Record<string, Record<string, number>> = {};
  for (const [sym, s] of Object.entries(seriesMap)) symIdx[sym] = makeIndex(s);

  const portfolio: IndexedPoint[] = [];
  const bench: IndexedPoint[] = [];
  let basePt: number | null = null;
  let baseSpy: number | null = null;

  for (const date of allDates) {
    let portVal = 0;
    for (const [sym, w] of Object.entries(weights)) {
      if (symIdx[sym][date]) portVal += w * symIdx[sym][date];
    }
    const spyVal = spyIdx[date];
    if (!portVal || !spyVal) continue;
    if (basePt === null) { basePt = portVal; baseSpy = spyVal; }
    portfolio.push({ date, value: Math.round(portVal / basePt! * 10000) / 100 });
    bench.push(    { date, value: Math.round(spyVal  / baseSpy! * 10000) / 100 });
  }

  if (portfolio.length < 2) return { portfolio: [], benchmark: [], stats: {} };

  const spyRet    = bench.length ? bench[bench.length - 1].value / 100 - 1 : 0;
  const baseStats = computeStats(portfolio);
  if (!('total_return' in baseStats)) return { portfolio: [], benchmark: [], stats: {} };

  const stats: StatsResult & { spy_return: number } = {
    ...(baseStats as StatsResult),
    spy_return: Math.round(spyRet * 10000) / 100,
  };

  return { portfolio, benchmark: bench, stats };
}

export async function runStrategyBacktest(period: string, topN = 3): Promise<StrategyResult> {
  const periodDays = BACKTEST_PERIOD_DAYS[period] ?? 365;
  const themeSyms  = Object.values(THEME_ETF);

  const [seriesResults, spySeries] = await Promise.all([
    Promise.all(themeSyms.map(sym => generateSeries(sym, periodDays + 30))),
    generateSeries('SPY', periodDays + 30),
  ]);

  const seriesMap: Record<string, DailySeries[]> = {};
  for (let i = 0; i < themeSyms.length; i++) seriesMap[themeSyms[i]] = seriesResults[i];

  const allDates = Array.from(new Set(
    themeSyms.flatMap(s => seriesMap[s].map(b => b.date)),
  )).sort().slice(-periodDays);

  const symIdx: Record<string, Record<string, number>> = {};
  for (const sym of themeSyms) {
    symIdx[sym] = {};
    for (const b of seriesMap[sym]) symIdx[sym][b.date] = b.close;
  }

  const p = (sym: string, date: string): number | null => symIdx[sym][date] ?? null;

  const REBAL = 21;
  let momH: Record<string, number> = {};
  for (const s of themeSyms) momH[s] = 1 / themeSyms.length;
  const momVals: IndexedPoint[] = [];

  for (let i = 0; i < allDates.length; i++) {
    const date = allDates[i];

    if (i > 0 && i % REBAL === 0) {
      const lookback = allDates[Math.max(0, i - REBAL)];
      const rets: Record<string, number> = {};
      for (const s of themeSyms) {
        const p0 = p(s, lookback), p1 = p(s, date);
        if (p0 && p1) rets[s] = p1 / p0 - 1;
      }
      if (Object.keys(rets).length >= topN) {
        const winners = Object.entries(rets)
          .sort((a, b) => b[1] - a[1])
          .slice(0, topN)
          .map(e => e[0]);
        momH = {};
        for (const s of themeSyms) momH[s] = winners.includes(s) ? 1 / topN : 0;
      }
    }

    if (i === 0) {
      momVals.push({ date, value: 100.0 });
    } else {
      const prev  = allDates[i - 1];
      const daily = themeSyms.reduce((s, sym) => {
        const p0 = p(sym, prev), p1 = p(sym, date);
        return (p0 && p1) ? s + momH[sym] * (p1 / p0 - 1) : s;
      }, 0);
      momVals.push({ date, value: Math.round(momVals[i - 1].value * (1 + daily) * 10000) / 10000 });
    }
  }

  const eqW    = 1 / themeSyms.length;
  const eqVals: IndexedPoint[] = [{ date: allDates[0], value: 100.0 }];
  for (let i = 1; i < allDates.length; i++) {
    const date = allDates[i], prev = allDates[i - 1];
    const daily = themeSyms.reduce((s, sym) => {
      const p0 = p(sym, prev), p1 = p(sym, date);
      return (p0 && p1) ? s + eqW * (p1 / p0 - 1) : s;
    }, 0);
    eqVals.push({ date, value: Math.round(eqVals[i - 1].value * (1 + daily) * 10000) / 10000 });
  }

  const spyByDate: Record<string, number> = {};
  for (const b of spySeries) spyByDate[b.date] = b.close;
  const spyBase = spyByDate[allDates[0]] ?? 1;
  const spyVals: IndexedPoint[] = allDates
    .filter(d => spyByDate[d])
    .map(d => ({ date: d, value: Math.round(spyByDate[d] / spyBase * 100 * 10000) / 10000 }));

  const themeNames: Record<string, string> = {};
  for (const [k, v] of Object.entries(THEME_ETF)) themeNames[v] = k;

  return {
    momentum:     momVals,
    equal_weight: eqVals,
    spy:          spyVals,
    theme_names:  themeNames,
    stats: {
      momentum:     computeStats(momVals),
      equal_weight: computeStats(eqVals),
      spy:          computeStats(spyVals),
    },
  };
}
