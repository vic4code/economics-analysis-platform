'use client';
import { useState, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, LineElement, PointElement, CategoryScale,
  LinearScale, Tooltip, Legend, Filler,
} from 'chart.js';
import { SECTOR_COLORS } from '@/lib/utils/colors';
import { getChartTheme } from '@/lib/utils/chartTheme';
import type { CorrelationMatrix } from '@/types';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend, Filler);

// ── Color helpers ─────────────────────────────────────────────────
function corrColor(v: number): string {
  const c = Math.max(-1, Math.min(1, v));
  // -1 → deep red · 0 → dark neutral · +1 → blue
  const neutral = [38, 48, 58];
  const red     = [210, 48, 42];
  const blue    = [58, 130, 240];
  const t       = Math.abs(c);
  const target  = c < 0 ? red : blue;
  const r = Math.round(neutral[0] + (target[0] - neutral[0]) * t);
  const g = Math.round(neutral[1] + (target[1] - neutral[1]) * t);
  const b = Math.round(neutral[2] + (target[2] - neutral[2]) * t);
  return `rgb(${r},${g},${b})`;
}

function corrTextColor(v: number): string {
  return Math.abs(v) > 0.4 ? 'rgba(255,255,255,0.92)' : 'rgba(180,195,210,0.85)';
}

function fmtCorr(v: number): string {
  const s = v.toFixed(2);
  // ".85" / "-.23" style — strip leading zero
  return s.replace(/^0\./, '.').replace(/^-0\./, '-.');
}

// ── Heatmap SVG ────────────────────────────────────────────────────
const CELL   = 33;
const LABEL  = 46;
const HEAD   = 82;

interface HeatmapProps {
  data: CorrelationMatrix;
  selected: [number, number] | null;
  onSelect: (pair: [number, number]) => void;
}

function CorrelationHeatmap({ data, selected, onSelect }: HeatmapProps) {
  const n  = data.symbols.length;
  const W  = LABEL + n * CELL + 6;
  const H  = HEAD  + n * CELL + 6;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', maxWidth: 580, display: 'block', overflow: 'visible' }}
      aria-label="Correlation heatmap"
    >
      {/* Column labels — rotated */}
      {data.symbols.map((sym, j) => (
        <text
          key={`ch-${j}`}
          transform={`translate(${LABEL + j * CELL + CELL / 2}, ${HEAD - 6}) rotate(-55)`}
          textAnchor="start"
          fontSize="10"
          fontWeight="600"
          fill={SECTOR_COLORS[data.sectors[j]] ?? '#cdd9e5'}
        >{sym}</text>
      ))}

      {/* Row labels */}
      {data.symbols.map((sym, i) => (
        <text
          key={`rh-${i}`}
          x={LABEL - 5}
          y={HEAD + i * CELL + CELL / 2 + 4}
          textAnchor="end"
          fontSize="10"
          fontWeight="600"
          fill={SECTOR_COLORS[data.sectors[i]] ?? '#cdd9e5'}
        >{sym}</text>
      ))}

      {/* Cells */}
      {data.matrix.map((row, i) =>
        row.map((v, j) => {
          const isDiag = i === j;
          const isSel  = selected && (
            (selected[0] === i && selected[1] === j) ||
            (selected[0] === j && selected[1] === i)
          );
          const x = LABEL + j * CELL;
          const y = HEAD  + i * CELL;
          return (
            <g
              key={`c-${i}-${j}`}
              onClick={() => !isDiag && onSelect(i < j ? [i, j] : [j, i])}
              style={{ cursor: isDiag ? 'default' : 'pointer' }}
            >
              <rect
                x={x} y={y} width={CELL} height={CELL}
                fill={isDiag ? '#1c2128' : corrColor(v)}
                stroke={isSel ? '#f0c040' : 'rgba(0,0,0,0.25)'}
                strokeWidth={isSel ? 2 : 0.5}
              />
              {!isDiag && (
                <text
                  x={x + CELL / 2} y={y + CELL / 2 + 3.5}
                  textAnchor="middle" fontSize="8.5"
                  fill={corrTextColor(v)}
                >{fmtCorr(v)}</text>
              )}
              {isDiag && (
                <line
                  x1={x + 4} y1={y + CELL - 4}
                  x2={x + CELL - 4} y2={y + 4}
                  stroke="rgba(120,130,145,0.4)" strokeWidth="1"
                />
              )}
            </g>
          );
        }),
      )}
    </svg>
  );
}

// ── Color legend ───────────────────────────────────────────────────
function CorrLegend() {
  const steps = 40;
  const W = 220, H = 12;
  const rects = Array.from({ length: steps }, (_, i) => {
    const v = -1 + (2 * i) / (steps - 1);
    return (
      <rect
        key={i}
        x={(i / steps) * W} y={0}
        width={W / steps + 0.5} height={H}
        fill={corrColor(v)}
      />
    );
  });
  return (
    <div className="corr-legend">
      <span className="corr-legend-label" style={{ color: '#d03028' }}>−1</span>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: 160, height: 12, borderRadius: 4, overflow: 'hidden' }}>
        {rects}
      </svg>
      <span className="corr-legend-label" style={{ color: '#3a82f0' }}>+1</span>
    </div>
  );
}

// ── Extreme pairs sidebar ──────────────────────────────────────────
interface ExtremePairsProps {
  data: CorrelationMatrix;
  onSelect: (pair: [number, number]) => void;
  selected: [number, number] | null;
}

function ExtremePairs({ data, onSelect, selected }: ExtremePairsProps) {
  const pairs = useMemo(() => {
    const list: { i: number; j: number; v: number }[] = [];
    for (let i = 0; i < data.symbols.length; i++) {
      for (let j = i + 1; j < data.symbols.length; j++) {
        list.push({ i, j, v: data.matrix[i][j] });
      }
    }
    list.sort((a, b) => b.v - a.v);
    return {
      top:    list.slice(0, 5),
      bottom: list.slice(-5).reverse(),
    };
  }, [data]);

  function PairRow({ i, j, v }: { i: number; j: number; v: number }) {
    const isSel = selected && selected[0] === i && selected[1] === j;
    return (
      <div
        className={`corr-extreme-item${isSel ? ' active' : ''}`}
        onClick={() => onSelect([i, j])}
      >
        <div className="corr-extreme-names">
          <span style={{ color: SECTOR_COLORS[data.sectors[i]] }}>{data.symbols[i]}</span>
          <span className="corr-extreme-sep">·</span>
          <span style={{ color: SECTOR_COLORS[data.sectors[j]] }}>{data.symbols[j]}</span>
        </div>
        <span
          className="corr-extreme-val"
          style={{ background: corrColor(v), color: corrTextColor(v) }}
        >{v >= 0 ? '+' : ''}{v.toFixed(2)}</span>
      </div>
    );
  }

  return (
    <div className="corr-sidebar">
      <div className="corr-sidebar-section">
        <div className="corr-sidebar-title">Most Correlated</div>
        {pairs.top.map(({ i, j, v }) => (
          <PairRow key={`t-${i}-${j}`} i={i} j={j} v={v} />
        ))}
      </div>
      <div className="corr-sidebar-section">
        <div className="corr-sidebar-title">Most Divergent</div>
        {pairs.bottom.map(({ i, j, v }) => (
          <PairRow key={`b-${i}-${j}`} i={i} j={j} v={v} />
        ))}
      </div>
    </div>
  );
}

// ── Rolling correlation chart ──────────────────────────────────────
interface RollingChartProps {
  data: CorrelationMatrix;
  pair: [number, number];
}

function RollingCorrChart({ data, pair }: RollingChartProps) {
  const ct = getChartTheme();
  const [i, j] = pair;
  const symA = data.symbols[i];
  const symB = data.symbols[j];

  // Find rolling series for this pair
  const rollingEntry = useMemo(() => {
    const [a, b] = [Math.min(i, j), Math.max(i, j)];
    return data.rolling.find(r =>
      r.symbols[0] === data.symbols[a] && r.symbols[1] === data.symbols[b],
    ) ?? null;
  }, [data, i, j]);

  if (!rollingEntry) return null;

  const values  = rollingEntry.values;
  const current = values[values.length - 1];
  const avg     = values.reduce((s, v) => s + v, 0) / values.length;
  const diverge = Math.abs(current - avg);

  // Weekly labels (W-36 … W-0)
  const labels = values.map((_, k) => {
    const wk = values.length - 1 - k;
    return wk === 0 ? 'Now' : `−${wk}w`;
  });

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Rolling 30d Corr',
        data: values,
        borderColor: '#4a90e2',
        backgroundColor: 'rgba(74,144,226,0.12)',
        borderWidth: 2,
        pointRadius: 0,
        fill: true,
        tension: 0.35,
      },
      {
        label: '1yr Avg',
        data: values.map(() => avg),
        borderColor: 'rgba(255,193,7,0.6)',
        borderDash: [4, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: ct.text, font: { size: 11 }, boxWidth: 14 },
      },
      tooltip: {
        callbacks: {
          label: (c: { dataset: { label?: string }; parsed: { y: number } }) =>
            ` ${c.dataset.label}: ${c.parsed.y.toFixed(3)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: ct.tick,
          maxTicksLimit: 10,
          callback: (_v: unknown, idx: number) =>
            idx % 4 === 0 ? labels[idx] : '',
        },
        grid: { color: ct.grid },
      },
      y: {
        min: -1, max: 1,
        ticks: {
          color: ct.tick,
          callback: (v: unknown) => Number(v).toFixed(1),
        },
        grid: { color: ct.grid },
      },
    },
    animation: { duration: 300 },
  } as Record<string, unknown>;

  return (
    <div className="corr-pair-detail">
      <div className="corr-pair-header">
        <div className="corr-pair-title">
          <span style={{ color: SECTOR_COLORS[data.sectors[i]] }}>{symA}</span>
          {' '}×{' '}
          <span style={{ color: SECTOR_COLORS[data.sectors[j]] }}>{symB}</span>
        </div>
        <div className="corr-pair-badges">
          <span className="corr-stat-badge">
            <span className="corr-stat-label">Current</span>
            <span
              className="corr-stat-val"
              style={{ color: current >= 0 ? '#4a90e2' : '#e74c3c' }}
            >{current >= 0 ? '+' : ''}{current.toFixed(3)}</span>
          </span>
          <span className="corr-stat-badge">
            <span className="corr-stat-label">1yr Avg</span>
            <span className="corr-stat-val">{avg >= 0 ? '+' : ''}{avg.toFixed(3)}</span>
          </span>
          <span className="corr-stat-badge">
            <span className="corr-stat-label">Divergence</span>
            <span
              className="corr-stat-val"
              style={{ color: diverge > 0.25 ? '#f7931a' : 'var(--text-muted)' }}
            >{diverge.toFixed(3)}{diverge > 0.25 ? ' ⚠' : ''}</span>
          </span>
        </div>
      </div>
      <div style={{ height: 200 }}>
        <Line data={chartData} options={options} />
      </div>
      {diverge > 0.25 && (
        <div className="corr-diverge-alert">
          <span className="corr-diverge-icon">⚠</span>
          Current correlation deviates <strong>{(diverge * 100).toFixed(0)} pts</strong> from
          the 1-year average — potential mean-reversion opportunity.
        </div>
      )}
    </div>
  );
}

// ── Main CorrelationTab ────────────────────────────────────────────
interface Props {
  correlationData: CorrelationMatrix | null;
}

export default function CorrelationTab({ correlationData }: Props) {
  const [selected, setSelected] = useState<[number, number] | null>(null);

  if (!correlationData) {
    return (
      <main className="tab-panel active">
        <div className="panel">
          <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="tab-panel active">
      <section className="panel">
        <div className="panel-header">
          <h2>Cross-Asset Correlation Matrix</h2>
          <span className="panel-hint">
            16 representative ETFs · 252-day rolling Pearson · Click any cell for pair detail
          </span>
        </div>

        <div className="corr-main-layout">
          <div className="corr-heatmap-wrap">
            <CorrLegend />
            <CorrelationHeatmap
              data={correlationData}
              selected={selected}
              onSelect={setSelected}
            />
          </div>
          <ExtremePairs
            data={correlationData}
            selected={selected}
            onSelect={setSelected}
          />
        </div>
      </section>

      {selected && (
        <section className="panel">
          <div className="panel-header">
            <h2>Pair Analysis — Rolling 30-Day Correlation</h2>
            <span className="panel-hint">Weekly sampling · Dashed line = 1-year average</span>
          </div>
          <RollingCorrChart data={correlationData} pair={selected} />
        </section>
      )}
    </main>
  );
}
