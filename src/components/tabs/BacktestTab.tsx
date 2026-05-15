'use client';
import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { SECTOR_COLORS, fmtPct } from '@/lib/utils/colors';
import { getChartTheme } from '@/lib/utils/chartTheme';
import { TEMPLATES } from '@/types';
import type { Quote } from '@/types';

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
);

interface IndexedPoint {
  date: string;
  value: number;
}

interface StatsResult {
  total_return: number;
  cagr: number;
  sharpe: number;
  max_drawdown: number;
}

interface BacktestResult {
  portfolio: IndexedPoint[];
  benchmark: IndexedPoint[];
  stats: (StatsResult & { spy_return: number }) | null;
}

interface StrategyResult {
  momentum: IndexedPoint[];
  equal_weight: IndexedPoint[];
  spy: IndexedPoint[];
  theme_names: Record<string, string>;
  stats: {
    momentum: StatsResult | null;
    equal_weight: StatsResult | null;
    spy: StatsResult | null;
  };
}

interface Props {
  quotes: Quote[];
}

export default function BacktestTab({ quotes }: Props) {
  // Strategy section
  const [scPeriod, setScPeriod] = useState('1y');
  const [topN, setTopN] = useState(3);
  const [stratData, setStratData] = useState<StrategyResult | null>(null);
  const [stratLoading, setStratLoading] = useState(false);

  // Custom backtest section
  const [btPeriod, setBtPeriod] = useState('1y');
  const [weights, setWeights] = useState<Record<string, number>>(() => ({
    ...TEMPLATES.balanced,
  }));
  const [btData, setBtData] = useState<BacktestResult | null>(null);
  const [btLoading, setBtLoading] = useState(false);

  const nonSpy = quotes.filter(q => q.symbol !== 'SPY');
  const allSyms = nonSpy.map(q => q.symbol);

  const getWeight = (sym: string) => weights[sym] ?? 0;
  const allocTotal = allSyms.reduce((s, sym) => s + getWeight(sym), 0);

  function setWeight(sym: string, val: number) {
    setWeights(prev => ({ ...prev, [sym]: Math.max(0, Math.min(100, val)) }));
  }

  function applyTemplate(tpl: string) {
    const tplW = TEMPLATES[tpl] ?? {};
    const next: Record<string, number> = {};
    allSyms.forEach(sym => {
      next[sym] = tplW[sym] ?? 0;
    });
    setWeights(next);
  }

  async function runStrategy() {
    setStratLoading(true);
    setStratData(null);
    try {
      const r = await fetch(
        `/api/strategy-backtest?period=${scPeriod}&top_n=${topN}`,
      );
      setStratData(await r.json());
    } finally {
      setStratLoading(false);
    }
  }

  async function runBacktest() {
    if (Math.round(allocTotal) !== 100) return;
    setBtLoading(true);
    setBtData(null);
    const active = allSyms
      .filter(s => getWeight(s) > 0)
      .map(s => `${s}:${getWeight(s)}`)
      .join(',');
    try {
      const r = await fetch(`/api/backtest?weights=${active}&period=${btPeriod}`);
      setBtData(await r.json());
    } finally {
      setBtLoading(false);
    }
  }

  const ct = getChartTheme();
  const lineOpts: Record<string, unknown> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: ct.text, font: { size: 12 } } },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label: string }; raw: number | null }) =>
            ` ${ctx.dataset.label}: ${ctx.raw?.toFixed(2)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: ct.tick, maxTicksLimit: 12, maxRotation: 0 },
        grid: { color: ct.grid },
      },
      y: {
        ticks: {
          color: ct.tick,
          callback: (v: unknown) => (v as number).toFixed(0),
        },
        grid: { color: ct.grid },
        title: {
          display: true,
          text: 'Indexed Return (base = 100)',
          color: ct.tick,
        },
      },
    },
  };

  const STRATS = [
    { key: 'momentum' as const, label: `Momentum Rotation (Top${topN})`, color: '#4ade80' },
    { key: 'equal_weight' as const, label: 'Equal Weight', color: '#60a5fa' },
    { key: 'spy' as const, label: 'SPY Benchmark', color: '#94a3b8' },
  ];

  const STAT_ROWS = [
    { key: 'total_return' as const, label: 'Total Return' },
    { key: 'cagr' as const, label: 'CAGR' },
    { key: 'sharpe' as const, label: 'Sharpe Ratio' },
    { key: 'max_drawdown' as const, label: 'Max Drawdown' },
  ];

  return (
    <main className="tab-panel active">
      {/* Strategy Comparison */}
      <section className="panel">
        <div className="panel-header">
          <h2>Strategy Comparison</h2>
          <span className="panel-hint">Momentum rotation vs Equal-weight vs SPY</span>
        </div>
        <div className="strat-controls">
          <div className="bt-period-row">
            {['1y', '3y', '5y'].map(p => (
              <button
                key={p}
                className={`sc-period-btn${scPeriod === p ? ' active' : ''}`}
                onClick={() => setScPeriod(p)}
              >
                {p === '1y' ? '1Y' : p === '3y' ? '3Y' : '5Y'}
              </button>
            ))}
          </div>
          <div className="strat-topn">
            Hold top
            <select
              className="topn-select"
              value={topN}
              onChange={e => setTopN(+e.target.value)}
            >
              {[1, 2, 3, 5].map(n => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            Top sectors
          </div>
          <button
            className="run-btn"
            style={{ marginLeft: 'auto' }}
            onClick={runStrategy}
            disabled={stratLoading}
          >
            {stratLoading ? 'Computing…' : '▶ Run Comparison'}
          </button>
        </div>

        {stratData && (
          <div>
            <div className="strat-stat-grid">
              <div className="strat-stat-row strat-header">
                <div></div>
                {STRATS.map(s => (
                  <div
                    key={s.key}
                    className="strat-col-head"
                    style={{ color: s.color }}
                  >
                    {s.label}
                  </div>
                ))}
              </div>
              {STAT_ROWS.map(m => (
                <div key={m.key} className="strat-stat-row">
                  <div className="strat-row-label">{m.label}</div>
                  {STRATS.map(s => {
                    const statsForKey = stratData.stats[s.key];
                    const raw =
                      statsForKey !== null && statsForKey !== undefined
                        ? (statsForKey as unknown as Record<string, number>)[m.key] ?? 0
                        : 0;
                    const isDD = m.key === 'max_drawdown';
                    const pos = isDD
                      ? raw < 10
                      : m.key === 'sharpe'
                        ? raw >= 1
                        : raw >= 0;
                    const disp = isDD
                      ? `-${raw.toFixed(2)}%`
                      : m.key === 'sharpe'
                        ? raw.toFixed(2)
                        : fmtPct(raw);
                    return (
                      <div
                        key={s.key}
                        className="strat-cell"
                        style={{ color: pos ? '#4ade80' : '#f87171' }}
                      >
                        {disp}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="chart-wrap tall" style={{ marginTop: '1.25rem' }}>
              <Line
                data={{
                  labels: stratData.spy.map(p => p.date),
                  datasets: STRATS.map(s => ({
                    label: s.label,
                    data: stratData[s.key].map(p => p.value),
                    borderColor: s.color,
                    backgroundColor: s.color + '18',
                    borderWidth: s.key === 'spy' ? 1.5 : 2.5,
                    borderDash: s.key === 'spy' ? [5, 5] : [],
                    fill: s.key === 'momentum',
                    pointRadius: 0,
                    tension: 0.3,
                    spanGaps: true,
                  })),
                }}
                options={lineOpts}
              />
            </div>
            <div className="strat-note">
              <strong>Momentum Rotation:</strong>{' '}
              Every 21 trading days, select the top-N sectors by prior-month return and hold equal-weight until the next rebalance.
            </div>
          </div>
        )}
      </section>

      {/* Custom Backtest */}
      <section className="panel">
        <div className="panel-header">
          <h2>Custom Portfolio Backtest</h2>
          <span className="panel-hint">
            Assign ETF weights to compute historical performance vs S&P 500
          </span>
        </div>
        <div className="backtest-builder">
          <div className="builder-controls">
            <label className="field-label">Backtest Period</label>
            <div className="bt-period-row">
              {['1y', '3y', '5y'].map(p => (
                <button
                  key={p}
                  className={`bt-period-btn${btPeriod === p ? ' active' : ''}`}
                  onClick={() => setBtPeriod(p)}
                >
                  {p === '1y' ? '1Y' : p === '3y' ? '3Y' : '5Y'}
                </button>
              ))}
            </div>
            <label className="field-label" style={{ marginTop: '1rem' }}>
              Quick Templates
            </label>
            <div className="template-row">
              {['aggressive', 'balanced', 'defensive', 'crypto'].map(tpl => (
                <button
                  key={tpl}
                  className="template-btn"
                  onClick={() => applyTemplate(tpl)}
                >
                  {tpl === 'aggressive'
                    ? 'Aggressive'
                    : tpl === 'balanced'
                      ? 'Balanced'
                      : tpl === 'defensive'
                        ? 'Defensive'
                        : 'Crypto'}
                </button>
              ))}
            </div>
          </div>
          <div className="weight-grid">
            {allSyms.map(sym => {
              const w = getWeight(sym);
              const q = quotes.find(q => q.symbol === sym);
              const color = SECTOR_COLORS[q?.sector ?? ''] ?? '#888';
              return (
                <div key={sym} className="weight-row">
                  <span
                    className="w-symbol"
                    style={{ borderLeft: `3px solid ${color}` }}
                  >
                    {sym}
                  </span>
                  <input
                    type="range"
                    className="w-slider"
                    min={0}
                    max={100}
                    step={5}
                    value={w}
                    onChange={e => setWeight(sym, +e.target.value)}
                  />
                  <input
                    type="number"
                    className="w-input"
                    min={0}
                    max={100}
                    step={5}
                    value={w}
                    onChange={e => setWeight(sym, +e.target.value)}
                  />
                  <span className="w-pct">%</span>
                </div>
              );
            })}
          </div>
          <div className="builder-actions">
            <div className="alloc-total">
              Allocated: <span>{Math.round(allocTotal)}</span>%{' '}
              {Math.round(allocTotal) !== 100 && (
                <span className="alloc-warn">Must sum to 100%</span>
              )}
            </div>
            <button
              className="run-btn"
              onClick={runBacktest}
              disabled={btLoading || Math.round(allocTotal) !== 100}
            >
              {btLoading ? 'Computing…' : '▶ Run Backtest'}
            </button>
          </div>
        </div>

        {btData && btData.stats && (
          <div>
            <div className="stats-row">
              {[
                {
                  label: 'Total Return',
                  val: fmtPct(btData.stats.total_return),
                  pos: btData.stats.total_return >= 0,
                },
                {
                  label: 'CAGR',
                  val: fmtPct(btData.stats.cagr),
                  pos: btData.stats.cagr >= 0,
                },
                {
                  label: 'Sharpe Ratio',
                  val: btData.stats.sharpe.toFixed(2),
                  pos: btData.stats.sharpe >= 1,
                },
                {
                  label: 'Max Drawdown',
                  val: `-${btData.stats.max_drawdown.toFixed(2)}%`,
                  pos: false,
                },
                {
                  label: 'SPY Return',
                  val: fmtPct(btData.stats.spy_return),
                  pos: btData.stats.spy_return >= 0,
                },
                {
                  label: 'Excess Return',
                  val: fmtPct(
                    btData.stats.total_return - btData.stats.spy_return,
                  ),
                  pos:
                    btData.stats.total_return > btData.stats.spy_return,
                },
              ].map(s => (
                <div key={s.label} className="bt-stat">
                  <div className="bt-stat-label">{s.label}</div>
                  <div
                    className="bt-stat-value"
                    style={{ color: s.pos ? '#4ade80' : '#f87171' }}
                  >
                    {s.val}
                  </div>
                </div>
              ))}
            </div>
            <div className="chart-wrap tall" style={{ marginTop: '1.5rem' }}>
              <Line
                data={{
                  labels: btData.portfolio.map(p => p.date),
                  datasets: [
                    {
                      label: 'My Portfolio',
                      data: btData.portfolio.map(p => p.value),
                      borderColor: '#4a90e2',
                      backgroundColor: '#4a90e222',
                      borderWidth: 2.5,
                      fill: true,
                      pointRadius: 0,
                      tension: 0.3,
                    },
                    {
                      label: 'SPY (S&P 500)',
                      data: btData.benchmark.map(b => b.value),
                      borderColor: '#94a3b8',
                      backgroundColor: 'transparent',
                      borderWidth: 1.5,
                      borderDash: [5, 5],
                      pointRadius: 0,
                      tension: 0.3,
                    },
                  ],
                }}
                options={lineOpts}
              />
            </div>
            <div className="bt-composition">
              <h3
                style={{
                  color: '#94a3b8',
                  fontSize: '0.85rem',
                  marginBottom: '0.75rem',
                }}
              >
                Portfolio Weights
              </h3>
              <div className="comp-grid">
                {allSyms
                  .filter(sym => getWeight(sym) > 0)
                  .sort((a, b) => getWeight(b) - getWeight(a))
                  .map(sym => {
                    const w = getWeight(sym);
                    const q = quotes.find(q => q.symbol === sym);
                    const col = SECTOR_COLORS[q?.sector ?? ''] ?? '#888';
                    return (
                      <div key={sym} className="comp-item">
                        <div className="comp-bar-wrap">
                          <div
                            className="comp-bar"
                            style={{ width: `${w}%`, background: col }}
                          />
                        </div>
                        <span className="comp-sym">{sym}</span>
                        <span className="comp-pct">{w}%</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
