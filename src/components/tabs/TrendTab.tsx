'use client';
import { useState, useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode, LineStyle, LineSeries, type IChartApi, type ISeriesApi } from 'lightweight-charts';
import { SECTOR_COLORS, TREND_PALETTE } from '@/lib/utils/colors';
import type { Quote, MockEvent, Period, DailySeries } from '@/types';

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

export default function TrendTab({
  quotes,
  eventsData,
  period,
  selected,
  onSelectedChange,
}: Props) {
  const [seriesCache, setSeriesCache] = useState<Record<string, DailySeries[]>>({});
  const [loading, setLoading] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

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
        results.forEach(({ sym, series }) => { next[sym + effectivePeriod] = series; });
        return next;
      });
      setLoading(false);
    });
  }, [selected, effectivePeriod]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build allSeries and dates
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

  // Create/update lightweight-charts
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || dates.length === 0 || loading) return;

    // Destroy old chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const gridColor = 'rgba(99,179,237,0.06)';
    const textColor = isDark ? '#94a3b8' : '#5a6e8a';

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 360,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor,
        fontSize: 12,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor: 'rgba(99,179,237,0.15)',
        scaleMargins: { top: 0.08, bottom: 0.05 },
      },
      timeScale: {
        borderColor: 'rgba(99,179,237,0.15)',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      handleScroll: true,
      handleScale: true,
    });
    chartRef.current = chart;

    // Add series for each selected symbol
    selected.forEach((sym, i) => {
      const s = allSeries[sym];
      if (!s || s.length === 0) return;
      const color = TREND_PALETTE[i % TREND_PALETTE.length];
      const series: ISeriesApi<'Line'> = chart.addSeries(LineSeries, {
        color,
        lineWidth: selected.length === 1 ? 2 : 1,
        title: sym,
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 4,
        lineType: 0,
      });

      const byDate = Object.fromEntries(s.map(b => [b.date, b.close]));
      const vals = dates.map(d => byDate[d] ?? null);
      const base = vals.find(v => v !== null) ?? 1;
      const data = dates
        .map((d, idx) => {
          const v = vals[idx];
          return v !== null ? { time: d as `${number}-${number}-${number}`, value: +(v / base * 100) } : null;
        })
        .filter((p): p is { time: `${number}-${number}-${number}`; value: number } => p !== null);
      series.setData(data);

      // Add event annotations as price lines (only on first series to avoid duplicates)
      if (eventsData && i === 0) {
        eventsData.forEach(ev => {
          if (dates.includes(ev.date)) {
            series.createPriceLine({
              price: (base / base) * 100,
              color: EVENT_COLORS[ev.type] ?? '#58a6ff',
              lineWidth: 1,
              lineStyle: LineStyle.Dashed,
              axisLabelVisible: false,
              title: ev.magnitude > 0 ? '▲' : ev.magnitude < 0 ? '▼' : '●',
            });
          }
        });
      }
    });

    chart.timeScale().fitContent();

    // Handle resize
    const ro = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry && chartRef.current) {
        chartRef.current.applyOptions({ width: entry.contentRect.width });
      }
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [dates, selected, loading, eventsData]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSymbol(sym: string) {
    if (selected.includes(sym)) {
      if (selected.length <= 1) return;
      onSelectedChange(selected.filter(s => s !== sym));
    } else {
      const next = selected.length >= 6 ? [...selected.slice(1), sym] : [...selected, sym];
      onSelectedChange(next);
    }
  }

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
          <h2>Multi-asset Trend Comparison</h2>
          <span className="panel-hint">Select up to 6 assets to compare (indexed to 100)</span>
        </div>
        <div className="symbol-picker">
          {quotes
            .filter(q => q.symbol !== 'SPY')
            .map(q => (
              <button
                key={q.symbol}
                className={`sym-btn${selected.includes(q.symbol) ? ' active' : ''}`}
                title={q.name}
                style={{ '--sc': SECTOR_COLORS[q.sector] ?? '#888' } as React.CSSProperties}
                onClick={() => toggleSymbol(q.symbol)}
              >
                {q.symbol}
              </button>
            ))}
        </div>
        <div style={{ position: 'relative', minHeight: '360px' }}>
          {loading && (
            <p style={{ color: '#64748b', textAlign: 'center', paddingTop: '2rem' }}>Loading…</p>
          )}
          {!loading && (
            <div ref={chartContainerRef} style={{ width: '100%', height: '360px' }} />
          )}
        </div>

        {/* Correlation matrix */}
        <div className="panel-header" style={{ marginTop: '2rem' }}>
          <h2>Correlation Matrix</h2>
          <span className="panel-hint">Return correlation among selected assets</span>
        </div>
        <div className="corr-wrap">
          {syms.length < 2 ? (
            <p style={{ color: '#64748b' }}>Select 2+ assets</p>
          ) : (
            <table className="corr-table">
              <thead>
                <tr>
                  <th></th>
                  {syms.map(s => <th key={s}>{s}</th>)}
                </tr>
              </thead>
              <tbody>
                {syms.map(sa => (
                  <tr key={sa}>
                    <th>{sa}</th>
                    {syms.map(sb => {
                      const c = computeCorr(returns[sa] ?? [], returns[sb] ?? []);
                      const bg = c >= 0
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
