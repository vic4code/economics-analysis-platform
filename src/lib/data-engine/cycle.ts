import { SECTOR_ETFS, MACRO_TREE, MONTH_NAMES } from './constants';
import { generateSeries } from './series';
import { getAllQuotes, Quote } from './quotes';

export interface CycleRow {
  sector: string;
  monthly_returns: Record<string, number>;
  percentile_rank: number;
  current_1y: number;
  best_months: string[];
  worst_months: string[];
  color: string;
}

const SECTOR_COLORS_MAP: Record<string, string> = {
  Crypto:         '#f7931a',
  Technology:     '#4a90e2',
  'Real Estate':  '#8b6d4f',
  Energy:         '#e67e22',
  Healthcare:     '#27ae60',
  Financials:     '#8e44ad',
  Consumer:       '#e91e8c',
  Industrials:    '#607d8b',
  Materials:      '#795548',
  Utilities:      '#00bcd4',
  Bonds:          '#3f51b5',
  Commodities:    '#ffc107',
  International:  '#ff9800',
};

export async function getCycleData(): Promise<CycleRow[]> {
  const quotes = await getAllQuotes();
  const qmap: Record<string, Quote> = {};
  for (const q of quotes) qmap[q.symbol] = q;

  const today  = new Date();
  const curYr  = today.getUTCFullYear();
  const curMon = today.getUTCMonth() + 1;

  const result: CycleRow[] = [];

  for (const [sector, etfs] of Object.entries(SECTOR_ETFS)) {
    const validEtfs = etfs.filter(e => qmap[e]).slice(0, 2);
    if (!validEtfs.length) continue;

    const seriesList = await Promise.all(validEtfs.map(e => generateSeries(e, 800)));
    const monthly: Record<string, number> = {};

    for (let yOff = 0; yOff < 3; yOff++) {
      for (let m = 1; m <= 12; m++) {
        const yr = curYr - yOff;
        if (yr === curYr && m > curMon) continue;
        const key    = `${yr}-${String(m).padStart(2, '0')}`;
        const prefix = key + '-';
        const bars   = seriesList.flatMap(s => s.filter(b => b.date.startsWith(prefix)));
        if (bars.length < 2) continue;
        bars.sort((a, b) => (a.date < b.date ? -1 : 1));
        monthly[key] = Math.round((bars[bars.length - 1].close / bars[0].close - 1) * 10000) / 100;
      }
    }

    const sortedMonthly = Object.fromEntries(
      Object.entries(monthly).sort(([a], [b]) => (a < b ? -1 : 1)),
    );
    const allRets = Object.values(sortedMonthly);
    const cur1y   = validEtfs.reduce((s, e) => s + (qmap[e].change_1y ?? 0), 0) / validEtfs.length;
    const rank    = allRets.length
      ? Math.round(allRets.filter(r => r <= cur1y).length / allRets.length * 100)
      : 50;

    const byMonth: Record<number, number[]> = {};
    for (const [k, v] of Object.entries(monthly)) {
      const mo = parseInt(k.split('-')[1], 10);
      (byMonth[mo] = byMonth[mo] ?? []).push(v);
    }
    const avgByMonth = Object.entries(byMonth)
      .map(([m, v]): [number, number] => [+m, v.reduce((s, r) => s + r, 0) / v.length])
      .sort((a, b) => a[1] - b[1]);
    const worstMonths = avgByMonth.slice(0, 2).map(([m]) => MONTH_NAMES[m - 1]);
    const bestMonths  = avgByMonth.slice(-2).map(([m])  => MONTH_NAMES[m - 1]);

    const macroColor = MACRO_TREE.find(
      n => n.etfs?.length && n.etfs.includes(validEtfs[0]),
    )?.color;

    result.push({
      sector,
      monthly_returns: sortedMonthly,
      percentile_rank: rank,
      current_1y:      Math.round(cur1y * 100) / 100,
      best_months:     bestMonths,
      worst_months:    worstMonths,
      color:           SECTOR_COLORS_MAP[sector] ?? macroColor ?? '#58a6ff',
    });
  }

  return result;
}
