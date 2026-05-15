import { SECTOR_ETFS, ETF_UNIVERSE } from './constants';
import { SeededRandom, seedFor } from './prng';
import { generateSeries } from './series';
import { getAllQuotes, Quote } from './quotes';

export interface ChipRow {
  sector: string;
  flow_score: number;
  dates: string[];
  institutional: number[];
  smart_money: number[];
  retail: number[];
  cumulative: number[];
}

export interface FlowMatrix {
  sectors: string[];
  flow_scores: number[];
  volume_ratios: number[];
  mcaps: number[];
  rotation_matrix: number[][];
}

const CHIP_DAYS: Record<string, number> = {
  '1d': 5, '5d': 10, '1m': 22, '3m': 66, '6m': 130, '1y': 252, 'ytd': 100,
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getChipsData(period: string): Promise<ChipRow[]> {
  const days   = CHIP_DAYS[period] ?? 22;
  const quotes = await getAllQuotes();
  const qmap: Record<string, Quote> = {};
  for (const q of quotes) qmap[q.symbol] = q;

  const result: ChipRow[] = [];
  const today    = new Date();
  const todayMs  = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const changeKey = `change_${period}` as keyof Quote;

  for (const [sector, etfs] of Object.entries(SECTOR_ETFS)) {
    const validEtfs = etfs.filter(e => qmap[e]);
    const momentum  = validEtfs.length
      ? validEtfs.reduce((s, e) => s + ((qmap[e][changeKey] as number) ?? 0), 0) / validEtfs.length
      : 0;
    const instBias = momentum * 30;

    const rngI = new SeededRandom(seedFor(sector + '_inst'));
    const rngS = new SeededRandom(seedFor(sector + '_smart'));
    const rngR = new SeededRandom(seedFor(sector + '_retail'));

    const dates: string[]         = [];
    const institutional: number[] = [];
    const smart_money: number[]   = [];
    const retail: number[]        = [];
    const cumulative: number[]    = [];
    let cum = 0;

    for (let i = 0; i < days; i++) {
      const d = new Date(todayMs - (days - 1 - i) * 86400000);
      if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
      dates.push(isoDate(d));

      const inst  = Math.round(rngI.gauss(instBias * 0.6,  Math.abs(instBias) * 0.8 + 80) * 10) / 10;
      const smart = Math.round(rngS.gauss(instBias * 0.3,  Math.abs(instBias) * 0.5 + 40) * 10) / 10;
      const ret   = Math.round(rngR.gauss(-instBias * 0.2, Math.abs(instBias) * 0.6 + 50) * 10) / 10;
      cum = Math.round((cum + inst) * 10) / 10;

      institutional.push(inst);
      smart_money.push(smart);
      retail.push(ret);
      cumulative.push(cum);
    }

    result.push({
      sector,
      flow_score: Math.round(momentum * 1.5 * 100) / 100,
      dates, institutional, smart_money, retail, cumulative,
    });
  }

  result.sort((a, b) => b.flow_score - a.flow_score);
  return result;
}

export async function getFlowMatrix(period: string): Promise<FlowMatrix> {
  const chips      = await getChipsData(period);
  const sectors    = chips.map(c => c.sector);
  const flowScores = chips.map(c => c.flow_score);
  const mcaps      = sectors.map(s =>
    (SECTOR_ETFS[s] ?? []).reduce((sum, e) => sum + (ETF_UNIVERSE[e]?.mcap ?? 0), 0),
  );

  const quotes = await getAllQuotes();
  const qmap: Record<string, Quote> = {};
  for (const q of quotes) qmap[q.symbol] = q;

  const volumeRatios = await Promise.all(sectors.map(async s => {
    const etfs = (SECTOR_ETFS[s] ?? []).slice(0, 2);
    if (!etfs.length) return 1;
    const curVol = etfs.reduce((sum, e) => sum + (qmap[e]?.volume ?? 0), 0) / etfs.length;
    const series = await generateSeries(etfs[0], 35);
    const baseVol = series.length > 22
      ? series.slice(-22).reduce((s, b) => s + b.volume, 0) / 22
      : curVol;
    return Math.round((curVol / (baseVol || curVol)) * 100) / 100;
  }));

  const n = sectors.length;
  const rotationMatrix: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => {
      if (i === j) return 1;
      const diff = Math.abs(flowScores[i] - flowScores[j]);
      const sign = (flowScores[i] > 0) === (flowScores[j] > 0) ? 1 : -1;
      return Math.round(sign * Math.max(0, 1 - diff / 6) * 100) / 100;
    }),
  );

  return { sectors, flow_scores: flowScores, volume_ratios: volumeRatios, mcaps, rotation_matrix: rotationMatrix };
}
