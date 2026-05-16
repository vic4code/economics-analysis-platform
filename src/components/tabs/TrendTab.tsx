'use client';
import { useState, useEffect, useRef } from 'react';
import {
  createChart, ColorType, CrosshairMode, LineStyle,
  LineSeries, CandlestickSeries, HistogramSeries,
  type IChartApi,
} from 'lightweight-charts';
import { SECTOR_COLORS, TREND_PALETTE } from '@/lib/utils/colors';
import type { Quote, MockEvent, Period, DailySeries } from '@/types';

type TimeStr = `${number}-${number}-${number}`;
type ChartMode = 'line' | 'candle';

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

function calcMA(series: DailySeries[], period: number): { time: TimeStr; value: number }[] {
  const out: { time: TimeStr; value: number }[] = [];
  for (let i = period - 1; i < series.length; i++) {
    const sum = series.slice(i - period + 1, i + 1).reduce((s, x) => s + x.close, 0);
    out.push({ time: series[i].date as TimeStr, value: +(sum / period).toFixed(2) });
  }
  return out;
}

interface BBPoint { time: TimeStr; upper: number; middle: number; lower: number }
function calcBB(series: DailySeries[], period = 20, mult = 2): BBPoint[] {
  const out: BBPoint[] = [];
  for (let i = period - 1; i < series.length; i++) {
    const closes = series.slice(i - period + 1, i + 1).map(x => x.close);
    const mean = closes.reduce((s, v) => s + v, 0) / period;
    const std = Math.sqrt(closes.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    out.push({
      time: series[i].date as TimeStr,
      upper: +(mean + mult * std).toFixed(2),
      middle: +mean.toFixed(2),
      lower: +(mean - mult * std).toFixed(2),
    });
  }
  return out;
}

const EVENT_COLORS: Record<string, string> = {
  fed: '#4A90D9', macro: '#2EA043', earnings: '#C47F17', geopolitical: '#D4564E',
};

interface Props {
  quotes: Quote[];
  eventsData: MockEvent[] | null;
  period: Period;
  selected: string[];
  onSelectedChange: (sel: string[]) => void;
}

export default function TrendTab({ quotes, eventsData, period, selected, onSelectedChange }: Props) {
  const [seriesCache, setSeriesCache] = useState<Record<string, DailySeries[]>>({});
  const [loading, setLoading] = useState(false);
  const [chartMode, setChartMode] = useState<ChartMode>('candle');
  const [showVolume, setShowVolume] = useState(true);
  const [showMA, setShowMA] = useState(true);
  const [showBB, setShowBB] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  const isSingle = selected.length === 1;
  const effectivePeriod = period === '1d' ? '5d' : period;

  useEffect(() => {
    if (!isSingle) setChartMode('line');
  }, [isSingle]);

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

  const allSeries: Record<string, DailySeries[]> = {};
  selected.forEach(sym => {
    if (seriesCache[sym + effectivePeriod]) allSeries[sym] = seriesCache[sym + effectivePeriod];
  });

  const allDatesSet = Object.values(allSeries).reduce<Set<string> | null>(
    (acc, s) => {
      const ds = new Set(s.map(b => b.date));
      return acc === null ? ds : new Set([...acc].filter(d => ds.has(d)));
    },
    null,
  ) ?? new Set<string>();
  const dates = [...allDatesSet].sort();

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || loading) return;

    const sym = selected[0];
    const s = isSingle ? allSeries[sym] : null;
    if (isSingle && (!s || s.length === 0)) return;
    if (!isSingle && dates.length === 0) return;

    if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const gridColor = isDark ? 'rgba(99,179,237,0.06)' : 'rgba(59,130,246,0.08)';
    const textColor = isDark ? '#6E7A8A' : '#5a6e8a';
    const borderColor = isDark ? 'rgba(99,179,237,0.15)' : 'rgba(59,130,246,0.15)';
    const withVol = isSingle && showVolume;
    const chartH = withVol ? 500 : 380;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: chartH,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor,
        fontSize: 12,
      },
      grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: {
        borderColor,
        scaleMargins: withVol ? { top: 0.06, bottom: 0.26 } : { top: 0.06, bottom: 0.05 },
      },
      timeScale: { borderColor, timeVisible: true, secondsVisible: false, fixLeftEdge: true, fixRightEdge: true },
      handleScroll: true,
      handleScale: true,
    });
    chartRef.current = chart;

    if (isSingle && s) {
      if (chartMode === 'candle') {
        // ── Candlestick ─────────────────────────────────────────────
        const cs = chart.addSeries(CandlestickSeries, {
          upColor:      '#2EA043',
          downColor:    '#E5534B',
          borderVisible: false,
          wickUpColor:  '#2EA043',
          wickDownColor:'#E5534B',
        });
        cs.setData(s.map(d => ({
          time: d.date as TimeStr,
          open: d.open, high: d.high, low: d.low, close: d.close,
        })));
      } else {
        // ── Single line ──────────────────────────────────────────────
        const ls = chart.addSeries(LineSeries, {
          color: TREND_PALETTE[0],
          lineWidth: 2,
          title: sym,
          priceLineVisible: false,
          lastValueVisible: true,
          crosshairMarkerVisible: true,
          crosshairMarkerRadius: 4,
          lineType: 0,
        });
        ls.setData(s.map(d => ({ time: d.date as TimeStr, value: d.close })));
      }

      // ── MA5 / MA20 ──────────────────────────────────────────────
      if (showMA) {
        const ma5  = calcMA(s, 5);
        const ma20 = calcMA(s, 20);
        const maOpts = (color: string, title: string) => ({
          color, lineWidth: 1 as const, title,
          priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, lineType: 0 as const,
        });
        if (ma5.length)  { const sl = chart.addSeries(LineSeries, maOpts('#C47F17', 'MA5'));  sl.setData(ma5); }
        if (ma20.length) { const sl = chart.addSeries(LineSeries, maOpts('#BFA06A', 'MA20')); sl.setData(ma20); }
      }

      // ── Bollinger Bands ─────────────────────────────────────────
      if (showBB) {
        const bb = calcBB(s);
        if (bb.length) {
          const bbOpts = (color: string, title: string) => ({
            color, lineWidth: 1 as const, title,
            lineStyle: LineStyle.Dashed,
            priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false, lineType: 0 as const,
          });
          const upper = chart.addSeries(LineSeries, bbOpts('rgba(99,179,237,0.7)', 'BB+'));
          const mid   = chart.addSeries(LineSeries, bbOpts('rgba(99,179,237,0.35)', 'BB'));
          const lower = chart.addSeries(LineSeries, bbOpts('rgba(99,179,237,0.7)', 'BB-'));
          upper.setData(bb.map(d => ({ time: d.time, value: d.upper })));
          mid.setData(bb.map(d => ({ time: d.time, value: d.middle })));
          lower.setData(bb.map(d => ({ time: d.time, value: d.lower })));
        }
      }

      // ── Volume ─────────────────────────────────────────────────
      if (showVolume) {
        chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });
        const vol = chart.addSeries(HistogramSeries, {
          color: '#26a69a',
          priceFormat: { type: 'volume' },
          priceScaleId: 'volume',
        });
        vol.setData(s.map(d => ({
          time:  d.date as TimeStr,
          value: d.volume,
          color: d.close >= d.open ? 'rgba(34,197,94,0.55)' : 'rgba(239,68,68,0.55)',
        })));
      }

    } else {
      // ── Multi-symbol comparison (indexed to 100) ─────────────────
      selected.forEach((sym, i) => {
        const s = allSeries[sym];
        if (!s || s.length === 0) return;
        const color = TREND_PALETTE[i % TREND_PALETTE.length];
        const series = chart.addSeries(LineSeries, {
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
            return v !== null ? { time: d as TimeStr, value: +(v / base * 100) } : null;
          })
          .filter((p): p is { time: TimeStr; value: number } => p !== null);
        series.setData(data);

        if (eventsData && i === 0) {
          eventsData.forEach(ev => {
            if (dates.includes(ev.date)) {
              series.createPriceLine({
                price: 100,
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
    }

    chart.timeScale().fitContent();

    const ro = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry && chartRef.current) chartRef.current.applyOptions({ width: entry.contentRect.width });
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }
    };
  }, [dates, selected, loading, eventsData, chartMode, showVolume, showMA, showBB]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleSymbol(sym: string) {
    if (selected.includes(sym)) {
      if (selected.length <= 1) return;
      onSelectedChange(selected.filter(s => s !== sym));
    } else {
      const next = selected.length >= 6 ? [...selected.slice(1), sym] : [...selected, sym];
      onSelectedChange(next);
    }
  }

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

  const withVol = isSingle && showVolume;
  const chartH = withVol ? 500 : 380;

  return (
    <main className="tab-panel active">
      <section className="panel">
        <div className="panel-header">
          <h2>{isSingle ? `${selected[0]}` : 'Multi-asset Trend Comparison'}</h2>
          <span className="panel-hint">
            {isSingle ? 'Click another symbol to compare' : 'Up to 6 assets · indexed to 100'}
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
                style={{ '--sc': SECTOR_COLORS[q.sector] ?? '#888' } as React.CSSProperties}
                onClick={() => toggleSymbol(q.symbol)}
              >
                {q.symbol}
              </button>
            ))}
        </div>

        {isSingle && (
          <div className="chart-controls">
            <div className="chart-mode-btns">
              <button className={`chart-mode-btn${chartMode === 'candle' ? ' active' : ''}`} onClick={() => setChartMode('candle')}>Candle</button>
              <button className={`chart-mode-btn${chartMode === 'line' ? ' active' : ''}`}   onClick={() => setChartMode('line')}>Line</button>
            </div>
            <div className="chart-indicator-btns">
              <button className={`chart-ind-btn${showMA ? ' active' : ''}`}     onClick={() => setShowMA(v => !v)}>MA5/20</button>
              <button className={`chart-ind-btn${showBB ? ' active' : ''}`}     onClick={() => setShowBB(v => !v)}>Bollinger</button>
              <button className={`chart-ind-btn${showVolume ? ' active' : ''}`} onClick={() => setShowVolume(v => !v)}>Volume</button>
            </div>
          </div>
        )}

        <div style={{ position: 'relative', minHeight: `${chartH}px` }}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', gap: 8, padding: '0.5rem' }}>
              <div className="skeleton" style={{ height: '65%', borderRadius: 'var(--radius-sm)' }} />
              <div className="skeleton" style={{ height: '30%', borderRadius: 'var(--radius-sm)' }} />
            </div>
          )}
          <div
            ref={chartContainerRef}
            style={{ width: '100%', height: `${chartH}px`, display: loading ? 'none' : 'block' }}
          />
        </div>

        {isSingle && chartMode === 'candle' && (
          <div className="candle-legend">
            <span className="legend-candle-up">▲ Bullish</span>
            {showMA && (
              <>
                <span style={{ color: '#C47F17' }}>— MA5</span>
                <span style={{ color: '#BFA06A' }}>— MA20</span>
              </>
            )}
            {showBB && <span style={{ color: 'rgba(91,163,201,0.85)', fontStyle: 'italic' }}>- - Bollinger ±2σ</span>}
            <span className="legend-candle-down">▼ Bearish</span>
          </div>
        )}
      </section>

      {!isSingle && (
        <section className="panel">
          <div className="panel-header">
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
      )}
    </main>
  );
}
