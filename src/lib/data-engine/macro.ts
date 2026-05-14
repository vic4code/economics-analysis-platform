import { MACRO_TREE, PERIOD_VOL_SCALE, MacroTreeNode } from './constants';
import { SeededRandom } from './prng';
import { getAllQuotes, Quote } from './quotes';

export interface EtfQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
}

export interface MacroNode {
  id: string;
  name: string;
  aum: number;
  change: number;
  color: string;
  etfs: string[];
  etf_quotes: EtfQuote[];
  children: MacroNode[];
}

function nodeChange(
  node: MacroTreeNode,
  period: string,
  qmap: Record<string, Quote>,
): number {
  const key  = `change_${period}` as keyof Quote;
  const etfs = (node.etfs ?? []).filter(e => qmap[e]);
  if (etfs.length > 0) {
    const sum = etfs.reduce((s, e) => s + (qmap[e][key] as number), 0);
    return Math.round(sum / etfs.length * 100) / 100;
  }

  // No mapped ETFs — derive a stable random change from the node id + day.
  // Matches data.js nodeChange exactly: seed = (base + daily) >>> 0.
  let hexStr = '';
  for (let i = 0; i < node.id.length; i++) {
    hexStr += node.id.charCodeAt(i).toString(16).padStart(2, '0');
  }
  const base  = Number(BigInt('0x' + hexStr) % 999983n);
  const daily = Math.floor(Date.now() / 86400000);
  const rng   = new SeededRandom((base + daily) >>> 0);
  const scale = PERIOD_VOL_SCALE[period] ?? 1;
  return Math.round(rng.gauss(0, node.vol * 100 * scale) * 100) / 100;
}

export function getMacroData(period: string): MacroNode {
  const quotes = getAllQuotes();
  const qmap: Record<string, Quote> = {};
  for (const q of quotes) qmap[q.symbol] = q;

  const children: Record<string, string[]> = { global: [] };
  for (const node of MACRO_TREE) {
    if (!children[node.parent]) children[node.parent] = [];
    children[node.parent].push(node.id);
  }
  const nodeById: Record<string, MacroTreeNode> = {};
  for (const node of MACRO_TREE) nodeById[node.id] = node;

  function enrich(nodeId: string): MacroNode {
    if (nodeId === 'global') {
      const kids     = (children['global'] ?? []).map(enrich);
      const totalAum = kids.reduce((s, k) => s + k.aum, 0);
      const wChange  = kids.reduce((s, k) => s + k.aum * k.change, 0) / (totalAum || 1);
      return {
        id: 'global', name: '全球資金',
        aum: Math.round(totalAum * 10) / 10,
        change: Math.round(wChange * 100) / 100,
        color: '#58a6ff',
        etfs: [], etf_quotes: [],
        children: kids,
      };
    }

    const raw  = { ...nodeById[nodeId] };
    let change = nodeChange(raw, period, qmap);
    const kids = (children[nodeId] ?? []).map(enrich);

    if (kids.length > 0) {
      const total = kids.reduce((s, k) => s + k.aum, 0);
      change = total > 0
        ? Math.round(kids.reduce((s, k) => s + k.aum * k.change, 0) / total * 100) / 100
        : change;
    }

    const etf_quotes: EtfQuote[] = (raw.etfs ?? [])
      .filter(e => qmap[e])
      .map(e => ({
        symbol: e,
        name:   qmap[e].name,
        price:  qmap[e].price,
        change: (qmap[e][`change_${period}` as keyof Quote] as number) ?? 0,
      }));

    return { id: raw.id, name: raw.name, aum: raw.aum, change, color: raw.color, etfs: raw.etfs, etf_quotes, children: kids };
  }

  return enrich('global');
}
