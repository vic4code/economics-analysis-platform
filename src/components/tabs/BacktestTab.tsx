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

  const lineOpts: Record<string, unknown> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#e2e8f0', font: { size: 12 } } },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label: string }; raw: number | null }) =>
            ` ${ctx.dataset.label}: ${ctx.raw?.toFixed(2)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: '#64748b', maxTicksLimit: 12, maxRotation: 0 },
        grid: { color: 'rgba(255,255,255,0.04)' },
      },
      y: {
        ticks: {
          color: '#94a3b8',
          callback: (v: unknown) => (v as number).toFixed(0),
        },
        grid: { color: 'rgba(255,255,255,0.06)' },
        title: {
          display: true,
          text: '指數化報酬（起點=100）',
          color: '#64748b',
        },
      },
    },
  };

  const STRATS = [
    { key: 'momentum' as const, label: `動量輪動 (Top${topN})`, color: '#4ade80' },
    { key: 'equal_weight' as const, label: '等權重', color: '#60a5fa' },
    { key: 'spy' as const, label: 'SPY 大盤', color: '#94a3b8' },
  ];

  const STAT_ROWS = [
    { key: 'total_return' as const, label: '總報酬' },
    { key: 'cagr' as const, label: '年化 CAGR' },
    { key: 'sharpe' as const, label: 'Sharpe Ratio' },
    { key: 'max_drawdown' as const, label: '最大回撤' },
  ];

  return (
    <main className="tab-panel active">
      {/* Strategy Comparison */}
      <section className="panel">
        <div className="panel-header">
          <h2>策略比較</h2>
          <span className="panel-hint">動量輪動 vs 等權重 vs SPY 大盤</span>
        </div>
        <div className="strat-controls">
          <div className="bt-period-row">
            {['1y', '3y', '5y'].map(p => (
              <button
                key={p}
                className={`sc-period-btn${scPeriod === p ? ' active' : ''}`}
                onClick={() => setScPeriod(p)}
              >
                {p === '1y' ? '1 年' : p === '3y' ? '3 年' : '5 年'}
              </button>
            ))}
          </div>
          <div className="strat-topn">
            每次輪動持有前
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
            強勢主題
          </div>
          <button
            className="run-btn"
            style={{ marginLeft: 'auto' }}
            onClick={runStrategy}
            disabled={stratLoading}
          >
            {stratLoading ? '計算中…' : '▶ 執行比較'}
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
              <strong>動量輪動：</strong>
              每 21 個交易日，依過去一個月報酬選出前 N
              強板塊，等權重持有至下次調倉。
            </div>
          </div>
        )}
      </section>

      {/* Custom Backtest */}
      <section className="panel">
        <div className="panel-header">
          <h2>自訂組合回測</h2>
          <span className="panel-hint">
            配置各 ETF 權重，系統計算歷史績效並與 S&P 500 比較
          </span>
        </div>
        <div className="backtest-builder">
          <div className="builder-controls">
            <label className="field-label">回測區間</label>
            <div className="bt-period-row">
              {['1y', '3y', '5y'].map(p => (
                <button
                  key={p}
                  className={`bt-period-btn${btPeriod === p ? ' active' : ''}`}
                  onClick={() => setBtPeriod(p)}
                >
                  {p === '1y' ? '1 年' : p === '3y' ? '3 年' : '5 年'}
                </button>
              ))}
            </div>
            <label className="field-label" style={{ marginTop: '1rem' }}>
              快速模板
            </label>
            <div className="template-row">
              {['aggressive', 'balanced', 'defensive', 'crypto'].map(tpl => (
                <button
                  key={tpl}
                  className="template-btn"
                  onClick={() => applyTemplate(tpl)}
                >
                  {tpl === 'aggressive'
                    ? '進攻型'
                    : tpl === 'balanced'
                      ? '均衡型'
                      : tpl === 'defensive'
                        ? '防禦型'
                        : '加密貨幣'}
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
              已配置：<span>{Math.round(allocTotal)}</span>%{' '}
              {Math.round(allocTotal) !== 100 && (
                <span className="alloc-warn">需配置 100%</span>
              )}
            </div>
            <button
              className="run-btn"
              onClick={runBacktest}
              disabled={btLoading || Math.round(allocTotal) !== 100}
            >
              {btLoading ? '計算中…' : '▶ 執行回測'}
            </button>
          </div>
        </div>

        {btData && btData.stats && (
          <div>
            <div className="stats-row">
              {[
                {
                  label: '總報酬率',
                  val: fmtPct(btData.stats.total_return),
                  pos: btData.stats.total_return >= 0,
                },
                {
                  label: '年化報酬 CAGR',
                  val: fmtPct(btData.stats.cagr),
                  pos: btData.stats.cagr >= 0,
                },
                {
                  label: 'Sharpe Ratio',
                  val: btData.stats.sharpe.toFixed(2),
                  pos: btData.stats.sharpe >= 1,
                },
                {
                  label: '最大回撤',
                  val: `-${btData.stats.max_drawdown.toFixed(2)}%`,
                  pos: false,
                },
                {
                  label: 'SPY 報酬',
                  val: fmtPct(btData.stats.spy_return),
                  pos: btData.stats.spy_return >= 0,
                },
                {
                  label: '超額報酬',
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
                      label: '我的組合',
                      data: btData.portfolio.map(p => p.value),
                      borderColor: '#4a90e2',
                      backgroundColor: '#4a90e222',
                      borderWidth: 2.5,
                      fill: true,
                      pointRadius: 0,
                      tension: 0.3,
                    },
                    {
                      label: 'SPY (標普500)',
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
                組合配置
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
