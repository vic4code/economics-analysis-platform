'use client';
import { useRef, useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react/lib/core';
import { echarts, getEChartsTheme } from '@/lib/utils/echarts';
import { SECTOR_COLORS, changeColor, changeTextColor, fmtPct } from '@/lib/utils/colors';
import type { Quote, Period } from '@/types';

// ── Squarify ────────────────────────────────────────────────────
interface RectItem {
  symbol: string; name: string; sector: string;
  value: number; change: number;
  x: number; y: number; w: number; h: number;
}

interface EtfInput {
  symbol: string; name: string; sector: string; value: number; change: number;
}

interface SecItem {
  sector: string; value: number; etfs: EtfInput[];
  x?: number; y?: number; w?: number; h?: number;
}

function squarify(items: EtfInput[], x: number, y: number, w: number, h: number): RectItem[] {
  const rects: RectItem[] = [];

  function row(its: EtfInput[], rx: number, ry: number, rw: number, rh: number) {
    const rt = its.reduce((s, i) => s + i.value, 0);
    let cx = rx;
    its.forEach(item => {
      const fw = (item.value / rt) * rw;
      rects.push({ ...item, x: cx, y: ry, w: fw, h: rh });
      cx += fw;
    });
  }

  function layoutETFs(etfs: EtfInput[], x0: number, y0: number, w0: number, h0: number) {
    if (!etfs.length) return;
    if (etfs.length === 1) {
      rects.push({ ...etfs[0], x: x0, y: y0, w: w0, h: h0 });
      return;
    }
    const total0 = etfs.reduce((s, e) => s + e.value, 0);
    const half = total0 / 2;
    let acc = 0, split = 1;
    for (let k = 0; k < etfs.length - 1; k++) {
      acc += etfs[k].value;
      if (acc >= half) { split = k + 1; break; }
    }
    const first = etfs.slice(0, split);
    const rest = etfs.slice(split);
    const frac = first.reduce((s, e) => s + e.value, 0) / total0;
    if (w0 >= h0) {
      const fw = w0 * frac;
      row(first, x0, y0, fw, h0);
      layoutETFs(rest, x0 + fw, y0, w0 - fw, h0);
    } else {
      const fh = h0 * frac;
      row(first, x0, y0, w0, fh);
      layoutETFs(rest, x0, y0 + fh, w0, h0 - fh);
    }
  }

  const sectors: Record<string, SecItem> = {};
  items.forEach(it => {
    if (!sectors[it.sector]) sectors[it.sector] = { sector: it.sector, value: 0, etfs: [] };
    sectors[it.sector].etfs.push(it);
    sectors[it.sector].value += it.value;
  });
  const secItems = Object.values(sectors).sort((a, b) => b.value - a.value);

  function layoutSectors(its: SecItem[], x0: number, y0: number, w0: number, h0: number) {
    if (!its.length) return;
    if (its.length === 1) {
      its[0].x = x0; its[0].y = y0; its[0].w = w0; its[0].h = h0;
      return;
    }
    const total0 = its.reduce((s, i) => s + i.value, 0);
    const half = total0 / 2;
    let acc = 0, split = 1;
    for (let k = 0; k < its.length - 1; k++) {
      acc += its[k].value;
      if (acc >= half) { split = k + 1; break; }
    }
    const first = its.slice(0, split);
    const rest = its.slice(split);
    const frac = first.reduce((s, i) => s + i.value, 0) / total0;
    if (w0 >= h0) {
      const fw = w0 * frac;
      const ft = first.reduce((s, i) => s + i.value, 0);
      let cx = x0;
      first.forEach(i => { const iw = (i.value / ft) * fw; i.x = cx; i.y = y0; i.w = iw; i.h = h0; cx += iw; });
      layoutSectors(rest, x0 + fw, y0, w0 - fw, h0);
    } else {
      const fh = h0 * frac;
      const ft = first.reduce((s, i) => s + i.value, 0);
      let cy = y0;
      first.forEach(i => { const ih = (i.value / ft) * fh; i.x = x0; i.y = cy; i.w = w0; i.h = ih; cy += ih; });
      layoutSectors(rest, x0, y0 + fh, w0, h0 - fh);
    }
  }

  layoutSectors(secItems, x, y, w, h);

  secItems.forEach(sr => {
    if (sr.w === undefined || sr.h === undefined) return;
    const PAD = 2;
    const inner = { x: sr.x! + PAD, y: sr.y! + PAD, w: sr.w - PAD * 2, h: sr.h - PAD * 2 };
    if (inner.w < 1 || inner.h < 1) return;
    layoutETFs(sr.etfs.slice().sort((a, b) => b.value - a.value), inner.x, inner.y, inner.w, inner.h);
  });

  return rects;
}

// ── HeatmapCanvas component ──────────────────────────────────────
function HeatmapCanvas({ quotes, period }: { quotes: Quote[]; period: Period }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !quotes.length) return;
    const wrap = canvas.parentElement;
    if (!wrap) return;
    const W = wrap.clientWidth || 900;
    const H = Math.max(360, Math.min(500, W * 0.45));
    canvas.width = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    ctx.clearRect(0, 0, W, H);

    const key = `change_${period}` as keyof Quote;
    const items: EtfInput[] = quotes
      .filter(q => q.symbol !== 'SPY')
      .map(q => ({
        symbol: q.symbol,
        name: q.name,
        sector: q.sector,
        value: q.mcap,
        change: (q[key] as number) ?? 0,
      }));

    const rects = squarify(items, 0, 0, W, H);
    rects.forEach(r => {
      if (!r.symbol || r.w < 2 || r.h < 2) return;
      const PAD = 1;
      const rx = r.x + PAD, ry = r.y + PAD, rw = r.w - PAD * 2, rh = r.h - PAD * 2;
      if (rw < 1 || rh < 1) return;
      ctx.fillStyle = changeColor(r.change, 0.85);
      ctx.beginPath();
      ctx.roundRect(rx, ry, rw, rh, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
      if (rw < 28 || rh < 18) return;
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fontSize = Math.max(8, Math.min(14, rw / 5, rh / 3));
      ctx.font = `600 ${fontSize}px Inter, sans-serif`;
      const cx = rx + rw / 2, cy = ry + rh / 2;
      if (rh > 36) {
        ctx.fillText(r.symbol, cx, cy - fontSize * 0.6);
        const cf = Math.max(7, fontSize * 0.85);
        ctx.font = `500 ${cf}px JetBrains Mono, monospace`;
        ctx.fillStyle = r.change >= 0 ? '#86efac' : '#fca5a5';
        ctx.fillText(fmtPct(r.change), cx, cy + cf * 0.8);
      } else {
        ctx.fillText(r.symbol, cx, cy);
      }
    });
  }, [quotes, period]);

  return (
    <div className="heatmap-wrap">
      <canvas ref={canvasRef} />
    </div>
  );
}

// ── Main OverviewTab ───────────────────────────────────────────
interface Props {
  quotes: Quote[];
  period: Period;
  onSelectSymbolForTrend: (sym: string) => void;
}

export default function OverviewTab({ quotes, period, onSelectSymbolForTrend }: Props) {
  const [sortAsc, setSortAsc] = useState(false);
  const [mapSector, setMapSector] = useState('all');
  const [mapSearch, setMapSearch] = useState('');
  const [mapSortCol, setMapSortCol] = useState('sector');
  const [mapSortAsc, setMapSortAsc] = useState(true);

  if (!quotes.length) return (
    <main className="tab-panel active">
      <div className="stat-row" style={{ marginBottom: '1.25rem' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="stat-card">
            <div className="skeleton" style={{ width: 80, height: 11, marginBottom: 10 }} />
            <div className="skeleton" style={{ width: 56, height: 28, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 110, height: 18, marginBottom: 6 }} />
            <div className="skeleton" style={{ width: 70, height: 13 }} />
          </div>
        ))}
      </div>
      <div className="panel">
        <div className="skeleton" style={{ height: 340 }} />
      </div>
      <div className="panel">
        <div className="skeleton" style={{ height: 240 }} />
      </div>
    </main>
  );

  const key = `change_${period}` as keyof Quote;
  const nonSpy = quotes.filter(q => q.symbol !== 'SPY');
  const spy = quotes.find(q => q.symbol === 'SPY');

  // Stat cards
  const sortedQuotes = [...quotes].sort((a, b) => ((b[key] as number) ?? 0) - ((a[key] as number) ?? 0));
  const best = sortedQuotes[0];
  const worst = sortedQuotes[sortedQuotes.length - 1];

  const secMap: Record<string, { sum: number; count: number }> = {};
  quotes.forEach(q => {
    if (!secMap[q.sector]) secMap[q.sector] = { sum: 0, count: 0 };
    secMap[q.sector].sum += (q[key] as number) ?? 0;
    secMap[q.sector].count++;
  });
  const hotSector = Object.entries(secMap)
    .map(([s, d]) => ({ sector: s, avg: d.sum / d.count }))
    .sort((a, b) => b.avg - a.avg)[0];

  // Sector bar
  const secBar: Record<string, { sum: number; tw: number }> = {};
  nonSpy.forEach(q => {
    if (!secBar[q.sector]) secBar[q.sector] = { sum: 0, tw: 0 };
    secBar[q.sector].sum += ((q[key] as number) ?? 0) * q.mcap;
    secBar[q.sector].tw += q.mcap;
  });
  const secData = Object.entries(secBar)
    .map(([sec, d]) => ({ sector: sec, change: d.tw ? d.sum / d.tw : 0 }))
    .sort((a, b) => b.change - a.change);

  const theme = getEChartsTheme();

  // ETF ranking table
  const etfSorted = [...nonSpy].sort((a, b) =>
    sortAsc
      ? ((a[key] as number) ?? 0) - ((b[key] as number) ?? 0)
      : ((b[key] as number) ?? 0) - ((a[key] as number) ?? 0)
  );

  // ETF mapping table
  const sectors = ['all', ...[...new Set(nonSpy.map(q => q.sector))].sort()];
  let mapRows = [...nonSpy];
  if (mapSector !== 'all') mapRows = mapRows.filter(r => r.sector === mapSector);
  const s = mapSearch.toLowerCase();
  if (s) mapRows = mapRows.filter(r => r.symbol.toLowerCase().includes(s) || r.name.toLowerCase().includes(s));
  mapRows.sort((a, b) => {
    const va = (a as unknown as Record<string, unknown>)[mapSortCol] ?? '';
    const vb = (b as unknown as Record<string, unknown>)[mapSortCol] ?? '';
    return (va < vb ? -1 : va > vb ? 1 : 0) * (mapSortAsc ? 1 : -1);
  });

  function handleMapSort(col: string) {
    setMapSortAsc(mapSortCol === col ? !mapSortAsc : true);
    setMapSortCol(col);
  }

  const mapColumns: [string, string][] = [
    ['symbol', 'Ticker'], ['', 'Name'], ['sector', 'Sector'], ['price', 'Price'],
    ['change_1d', '1D'], ['change_1m', '1M'], ['change_1y', '1Y'], ['mcap', 'AUM(B)'],
  ];

  return (
    <main className="tab-panel active">
      {/* Stat Cards */}
      <section className="stat-row">
        <div className="stat-card">
          <div className="stat-label">🔥 Top Gainer</div>
          <div className="stat-symbol">{best?.symbol ?? '—'}</div>
          <div className="stat-change" style={{color: changeTextColor((best?.[key] as number) ?? 0)}}>
            {fmtPct((best?.[key] as number) ?? 0)}
          </div>
          <div className="stat-sector">{best?.sector ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">🧊 Top Loser</div>
          <div className="stat-symbol">{worst?.symbol ?? '—'}</div>
          <div className="stat-change" style={{color: changeTextColor((worst?.[key] as number) ?? 0)}}>
            {fmtPct((worst?.[key] as number) ?? 0)}
          </div>
          <div className="stat-sector">{worst?.sector ?? '—'}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">🌊 Hot Sector</div>
          <div className="stat-symbol">{hotSector?.sector ?? '—'}</div>
          <div className="stat-change" style={{color: changeTextColor(hotSector?.avg ?? 0)}}>
            {fmtPct(hotSector?.avg ?? 0)}
          </div>
          <div className="stat-sector">Weighted avg. return</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">📍 S&amp;P 500 SPY</div>
          <div className="stat-symbol">{spy ? `$${spy.price.toFixed(2)}` : '—'}</div>
          <div className="stat-change" style={{color: changeTextColor((spy?.[key] as number) ?? 0)}}>
            {spy ? fmtPct((spy[key] as number) ?? 0) : '—'}
          </div>
          <div className="stat-sector">S&P 500 ETF</div>
        </div>
      </section>

      {/* Heatmap */}
      <section className="panel">
        <div className="panel-header">
          <h2>Global Capital Heatmap</h2>
          <span className="panel-hint">Size = market cap · Color = % change</span>
        </div>
        <HeatmapCanvas quotes={quotes} period={period} />
        <div className="heatmap-legend">
          <span className="legend-label">&lt; −3%</span>
          <div className="legend-bar"></div>
          <span className="legend-label">&gt; +3%</span>
        </div>
      </section>

      {/* Sector bar */}
      <section className="panel">
        <div className="panel-header">
          <h2>Sector Performance</h2>
          <span className="panel-hint">Market-cap weighted avg. return per sector</span>
        </div>
        <div className="chart-wrap medium">
          <ReactECharts
            echarts={echarts}
            option={{
              backgroundColor: 'transparent',
              tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                backgroundColor: theme.tooltipBg,
                borderColor: theme.tooltipBorder,
                textStyle: { color: theme.tooltipText },
                formatter: (params: unknown) => {
                  const p = params as Array<{ name: string; value: number }>;
                  return `${p[0].name}: ${p[0].value >= 0 ? '+' : ''}${p[0].value.toFixed(2)}%`;
                },
              },
              grid: { left: 8, right: 16, top: 4, bottom: 4, containLabel: true },
              xAxis: {
                type: 'value',
                axisLine: { show: false },
                splitLine: { lineStyle: { color: theme.gridColor } },
                axisLabel: { color: theme.textColor, formatter: (v: number) => `${v.toFixed(1)}%` },
              },
              yAxis: {
                type: 'category',
                data: secData.map(d => d.sector),
                axisLine: { show: false },
                axisTick: { show: false },
                axisLabel: { color: theme.textColor, fontSize: 11 },
              },
              series: [{
                type: 'bar',
                data: secData.map(d => ({
                  value: +d.change.toFixed(2),
                  itemStyle: {
                    color: d.change >= 0 ? 'rgba(34,197,94,0.75)' : 'rgba(239,68,68,0.75)',
                    borderRadius: [0, 4, 4, 0],
                  },
                })),
                barMaxWidth: 24,
              }],
            }}
            style={{ height: '100%' }}
            notMerge
          />
        </div>
      </section>

      {/* ETF ranking table */}
      <section className="panel">
        <div className="panel-header">
          <h2>ETF Performance Ranking</h2>
          <button className="icon-btn" onClick={() => setSortAsc(!sortAsc)} title="Toggle sort">↕</button>
        </div>
        <div className="table-wrap">
          <table className="etf-table">
            <thead>
              <tr>
                <th>Ticker</th><th>Name</th><th>Sector</th><th>Price</th><th>Change %</th>
              </tr>
            </thead>
            <tbody>
              {etfSorted.map(q => (
                <tr key={q.symbol}>
                  <td><strong>{q.symbol}</strong></td>
                  <td className="name-cell">{q.name}</td>
                  <td><span className="sector-tag">{q.sector}</span></td>
                  <td className="mono">${q.price.toFixed(2)}</td>
                  <td className="mono" style={{color: changeTextColor((q[key] as number) ?? 0)}}>
                    {fmtPct((q[key] as number) ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ETF Mapping Table */}
      <section className="panel">
        <div className="panel-header">
          <h2>ETF Universe</h2>
          <span className="panel-hint">Click a row to add to Trend Analysis</span>
        </div>
        <div className="etfmap-controls">
          <input
            type="text"
            placeholder="Search symbol or name…"
            className="etfmap-search"
            value={mapSearch}
            onChange={e => setMapSearch(e.target.value)}
          />
          <div className="etfmap-filters">
            {sectors.map(sec => (
              <button
                key={sec}
                className={`ef-btn${mapSector === sec ? ' active' : ''}`}
                onClick={() => setMapSector(sec)}
              >
                {sec === 'all' ? 'All' : sec}
              </button>
            ))}
          </div>
        </div>
        <div className="table-wrap">
          <table className="etf-table etfmap-table">
            <thead>
              <tr>
                {mapColumns.map(([col, label]) => (
                  <th
                    key={`${col}-${label}`}
                    data-col={col}
                    className={col ? 'sortable' : ''}
                    style={col ? { cursor: 'pointer' } : {}}
                    onClick={() => col && handleMapSort(col)}
                  >
                    {label}{col ? ' ↕' : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mapRows.map(r => (
                <tr
                  key={r.symbol}
                  className="etfmap-row"
                  style={{ cursor: 'pointer' }}
                  title="Click to add to Trend Analysis"
                  onClick={() => onSelectSymbolForTrend(r.symbol)}
                >
                  <td>
                    <span className="sym-badge" style={{ background: SECTOR_COLORS[r.sector] ?? '#444' }}>
                      {r.symbol}
                    </span>
                  </td>
                  <td className="name-cell">{r.name}</td>
                  <td><span className="sector-tag">{r.sector}</span></td>
                  <td>${r.price}</td>
                  <td style={{color: changeTextColor(r.change_1d)}}>{fmtPct(r.change_1d)}</td>
                  <td style={{color: changeTextColor(r.change_1m)}}>{fmtPct(r.change_1m)}</td>
                  <td style={{color: changeTextColor(r.change_1y)}}>{fmtPct(r.change_1y)}</td>
                  <td>${r.mcap}B</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
