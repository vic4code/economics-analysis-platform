'use client';
import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, LineElement, PointElement, CategoryScale, LinearScale,
  Tooltip, Legend, Filler,
} from 'chart.js';
import { SECTOR_COLORS, TREND_PALETTE, fmtPct } from '@/lib/utils/colors';
import type { Quote, MockEvent, Period, DailySeries } from '@/types';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);

// fmtPct is imported but used indirectly through the correlation table values
void fmtPct;

const EVENT_COLORS: Record<string, string> = {
  fed: '#4a90e2',
  macro: '#27ae60',
  earnings: '#f7931a',
  geopolitical: '#e74c3c',
};

interface Props {
  quotes: Quote[];
  eventsData: MockEvent[] | null;
  period: Period;
  selected: string[];
  onSelectedChange: (sel: string[]) => void;
}

function computeCorr(a: (number | null)[], b: (number | null)[]): number {
  const pairs = a
    .map((v, i) => [v, b[i]] as [number | null, number | null])
    .filter(([x, y]) => x !== null && y !== null) as [number, number][];
  if (pairs.length < 5) return 0;
  const n = pairs.length;
  const ma = pairs.reduce((s, [x]) => s + x, 0) / n;
  const mb = pairs.reduce((s, [, y]) => s + y, 0) / n;
  const num = pairs.reduce((s, [x, y]) => s + (x - ma) * (y - mb), 0);
  const da = Math.sqrt(pairs.reduce((s, [x]) => s + (x - ma) ** 2, 0));
  const db = Math.sqrt(pairs.reduce((s, [, y]) => s + (y - mb) ** 2, 0));
  return da * db === 0 ? 0 : +(num / (da * db)).toFixed(2);
}

export default function TrendTab({
  quotes,
  eventsData,
  period,
  selected,
  onSelectedChange,
}: Props) {
  const [seriesCache, setSeriesCache] = useState<Record<string, DailySeries[]>>({});
  const [loading, setLoading] = useState(false);

  const effectivePeriod = period === '1d' ? '5d' : period;

  useEffect(() => {
    const missing = selected.filter(sym => !seriesCache[sym + effectivePeriod]);
    if (!missing.length) return;
    setLoading(true);
    Promise.all(
      missing.map(async sym => {
        try {
          const r = await fetch(`/api/history?symbol=${sym}&period=${effectivePeriod}`);
          const data = await r.json();
          return { sym, series: data.series as DailySeries[] };
        } catch {
          return { sym, series: [] as DailySeries[] };
        }
      }),
    ).then(results => {
      setSeriesCache(prev => {
        const next = { ...prev };
        results.forEach(({ sym, series }) => {
          next[sym + effectivePeriod] = series;
        });
        return next;
      });
      setLoading(false);
    });
  }, [selected, effectivePeriod]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSymbol(sym: string) {
    if (selected.includes(sym)) {
      if (selected.length <= 1) return;
      onSelectedChange(selected.filter(s => s !== sym));
    } else {
      const next =
        selected.length >= 6 ? [...selected.slice(1), sym] : [...selected, sym];
      onSelectedChange(next);
    }
  }

  // Build chart data
  const allSeries: Record<string, DailySeries[]> = {};
  selected.forEach(sym => {
    if (seriesCache[sym + effectivePeriod]) {
      allSeries[sym] = seriesCache[sym + effectivePeriod];
    }
  });

  const allDatesSet = Object.values(allSeries).reduce<Set<string> | null>(
    (acc, s) => {
      const ds = new Set(s.map(b => b.date));
      return acc === null ? ds : new Set([...acc].filter(d => ds.has(d)));
    },
    null,
  ) ?? new Set<string>();
  const dates = [...allDatesSet].sort();

  const eventsPlugin = {
    id: 'eventAnnotations',
    afterDraw(chart: ChartJS) {
      if (!eventsData?.length) return;
      const { ctx, chartArea, scales } = chart as unknown as {
        ctx: CanvasRenderingContext2D;
        chartArea: { left: number; right: number; top: number; bottom: number };
        scales: { x: { getPixelForValue: (v: string) => number } };
      };
      eventsData.forEach(ev => {
        const xPx = scales.x.getPixelForValue(ev.date);
        if (!xPx || xPx < chartArea.left || xPx > chartArea.right) return;
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = EVENT_COLORS[ev.type] ?? '#58a6ff';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.moveTo(xPx, chartArea.top);
        ctx.lineTo(xPx, chartArea.bottom);
        ctx.stroke();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = EVENT_COLORS[ev.type] ?? '#58a6ff';
        ctx.font = '10px Inter,sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          ev.magnitude > 0 ? '▲' : ev.magnitude < 0 ? '▼' : '●',
          xPx,
          chartArea.top + 8,
        );
        ctx.restore();
      });
    },
  };

  const datasets = selected.map((sym, i) => {
    const s = allSeries[sym] ?? [];
    const byDate = Object.fromEntries(s.map(b => [b.date, b.close]));
    const values = dates.map(d => byDate[d] ?? null);
    const base = values.find(v => v !== null) ?? 1;
    return {
      label: sym,
      data: values.map(v => (v === null ? null : +(v / base * 100).toFixed(3))),
      borderColor: TREND_PALETTE[i % TREND_PALETTE.length],
      backgroundColor: TREND_PALETTE[i % TREND_PALETTE.length] + '22',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0.3,
      fill: false,
      spanGaps: true,
    };
  });

  const chartData = { labels: dates, datasets };
  const chartOptions: Record<string, unknown> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#e2e8f0', font: { size: 12 } } },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label: string }; raw: number | null }) =>
            ` ${ctx.dataset.label}: ${ctx.raw?.toFixed(2) ?? '—'}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#64748b', maxTicksLimit: 10, maxRotation: 0 },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
      y: {
        ticks: {
          color: '#94a3b8',
          callback: (v: unknown) => (v as number).toFixed(0),
        },
        grid: { color: 'rgba(255,255,255,0.06)' },
      },
    },
  };

  // Correlation matrix
  const syms = selected.filter(s => allSeries[s]);
  const returns: Record<string, (number | null)[]> = {};
  syms.forEach(sym => {
    const s = allSeries[sym];
    const byDate = Object.fromEntries(s.map(b => [b.date, b.close]));
    const vals = dates.map(d => byDate[d] ?? null);
    returns[sym] = vals.slice(1).map((v, i) =>
      v !== null && vals[i] !== null ? v / (vals[i] as number) - 1 : null,
    );
  });

  return (
    <main className="tab-panel active">
      <section className="panel">
        <div className="panel-header">
          <h2>多標的趨勢比較</h2>
          <span className="panel-hint">
            選擇最多 6 個標的進行比較（基準化 = 起點 100）
          </span>
        </div>
        <div className="symbol-picker">
          {quotes
            .filter(q => q.symbol !== 'SPY')
            .map(q => (
              <button
                key={q.symbol}
                className={`sym-btn${selected.includes(q.symbol) ? ' active' : ''}`}
                title={q.name}
                style={
                  { '--sc': SECTOR_COLORS[q.sector] ?? '#888' } as React.CSSProperties
                }
                onClick={() => toggleSymbol(q.symbol)}
              >
                {q.symbol}
              </button>
            ))}
        </div>
        <div className="chart-wrap tall">
          {loading && (
            <p style={{ color: '#64748b', textAlign: 'center' }}>載入中…</p>
          )}
          {!loading && dates.length > 0 && (
            <Line
              data={chartData}
              options={chartOptions}
              plugins={[eventsPlugin as unknown as import('chart.js').Plugin]}
            />
          )}
        </div>

        {/* Correlation matrix */}
        <div className="panel-header" style={{ marginTop: '2rem' }}>
          <h2>相關性矩陣</h2>
          <span className="panel-hint">所選標的間的收益率相關係數</span>
        </div>
        <div className="corr-wrap">
          {syms.length < 2 ? (
            <p style={{ color: '#64748b' }}>選 2+ 個標的</p>
          ) : (
            <table className="corr-table">
              <thead>
                <tr>
                  <th></th>
                  {syms.map(s => (
                    <th key={s}>{s}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {syms.map(sa => (
                  <tr key={sa}>
                    <th>{sa}</th>
                    {syms.map(sb => {
                      const c = computeCorr(returns[sa] ?? [], returns[sb] ?? []);
                      const bg =
                        c >= 0
                          ? `rgba(74,144,226,${Math.abs(c) * 0.7})`
                          : `rgba(248,113,113,${Math.abs(c) * 0.7})`;
                      return (
                        <td key={sb} style={{ background: bg, color: '#e2e8f0' }}>
                          {c.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
