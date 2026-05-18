'use client';
import { useState, useRef, useEffect } from 'react';
import ReactECharts from 'echarts-for-react/lib/core';
import { echarts, getEChartsTheme } from '@/lib/utils/echarts';
import { SECTOR_COLORS } from '@/lib/utils/colors';
import type { CrisisEvent, CrisisPricePoint } from '@/types';

const TYPE_COLORS: Record<string, string> = {
  fed:          '#4A90D9',
  macro:        '#2EA043',
  earnings:     '#C47F17',
  geopolitical: '#D4564E',
};

// ── Mini price chart (SVG sparkline) ─────────────────────────────
function CrisisSparkline({
  track,
  buySignalDay,
  drawdownDays,
  width = 260,
  height = 90,
}: {
  track: CrisisPricePoint[];
  buySignalDay: number;
  drawdownDays: number;
  width?: number;
  height?: number;
}) {
  if (!track.length) return null;
  const days   = track.map(p => p.day);
  const prices = track.map(p => p.price);
  const minD = days[0], maxD = days[days.length - 1];
  const minP = Math.min(...prices) - 1;
  const maxP = Math.max(...prices) + 1;

  function px(day: number) { return ((day - minD) / (maxD - minD)) * width; }
  function py(price: number) { return height - ((price - minP) / (maxP - minP)) * height; }

  const pathD = track
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${px(p.day).toFixed(1)} ${py(p.price).toFixed(1)}`)
    .join(' ');

  const areaD = pathD + ` L ${px(maxD).toFixed(1)} ${height} L ${px(minD).toFixed(1)} ${height} Z`;

  const baseline100Y = py(100);
  const bottomD      = drawdownDays;
  const signalD      = drawdownDays + buySignalDay;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', display: 'block' }}>
      {/* Baseline */}
      <line x1={0} y1={baseline100Y} x2={width} y2={baseline100Y}
        stroke="#30363d" strokeWidth={1} strokeDasharray="3,3" />

      {/* Area fill */}
      <defs>
        <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#E5534B" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#E5534B" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#spark-grad)" />

      {/* Price line */}
      <path d={pathD} fill="none" stroke="#E5534B" strokeWidth={1.5} />

      {/* Crash start marker */}
      <line x1={px(0)} y1={0} x2={px(0)} y2={height}
        stroke="#E5534B" strokeWidth={1} strokeDasharray="2,2" strokeOpacity={0.6} />

      {/* Bottom marker */}
      {track.find(p => p.day === bottomD) && (
        <circle cx={px(bottomD)} cy={py(track.find(p => p.day === bottomD)!.price)}
          r={3} fill="#C47F17" />
      )}

      {/* Buy signal marker */}
      {track.find(p => p.day === signalD) && (
        <g>
          <circle cx={px(signalD)} cy={py(track.find(p => p.day === signalD)!.price)}
            r={4} fill="#2EA043" />
          <text x={px(signalD) + 5} y={py(track.find(p => p.day === signalD)!.price) - 4}
            fill="#2EA043" fontSize={7} fontFamily="Inter, sans-serif">BUY</text>
        </g>
      )}
    </svg>
  );
}

// ── Timeline SVG ──────────────────────────────────────────────────
function CrisisTimeline({
  events,
  allEvents,
  selected,
  onSelect,
}: {
  events: CrisisEvent[];
  allEvents: { date: string; title: string; magnitude: number; type: string }[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const W = 900;
  const H = 140;
  const MARGIN = { left: 40, right: 40, top: 30, bottom: 30 };

  const allDates = allEvents.map(e => new Date(e.date).getTime());
  const minT = Math.min(...allDates);
  const maxT = Math.max(...allDates);
  const span = maxT - minT || 1;

  function tx(dateStr: string) {
    return MARGIN.left + ((new Date(dateStr).getTime() - minT) / span) * (W - MARGIN.left - MARGIN.right);
  }

  const MID_Y = H / 2;

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: '640px', display: 'block' }}>
        {/* Baseline */}
        <line x1={MARGIN.left} y1={MID_Y} x2={W - MARGIN.right} y2={MID_Y}
          stroke="var(--border)" strokeWidth={1.5} />

        {/* Year labels */}
        {['2024', '2025', '2026'].map(yr => {
          const x = tx(yr + '-01-01');
          if (x < MARGIN.left || x > W - MARGIN.right) return null;
          return (
            <g key={yr}>
              <line x1={x} y1={MID_Y - 5} x2={x} y2={MID_Y + 5} stroke="var(--border)" strokeWidth={1} />
              <text x={x} y={MID_Y + 18} textAnchor="middle"
                fill="var(--text-muted)" fontSize={10} fontFamily="Inter, sans-serif">{yr}</text>
            </g>
          );
        })}

        {/* All events — small dots */}
        {allEvents.map((ev, i) => {
          const x = tx(ev.date);
          const isCrash = ev.magnitude <= -2;
          const isPositive = ev.magnitude > 0;
          const color = isCrash ? '#E5534B' : isPositive ? '#2EA043' : TYPE_COLORS[ev.type] ?? '#5BA3C9';
          const barH = Math.abs(ev.magnitude) * 12;
          const y = isPositive ? MID_Y - barH : MID_Y;

          return (
            <g key={i} style={{ cursor: isCrash ? 'pointer' : 'default' }}
              onClick={() => {
                const crisis = events.find(c => c.date === ev.date);
                if (crisis) onSelect(crisis.id);
              }}>
              <rect x={x - 3} y={y} width={6} height={barH}
                fill={color} fillOpacity={isCrash ? 0.9 : 0.5} rx={1} />
              {isCrash && (
                <text x={x} y={y - 5} textAnchor="middle"
                  fill={color} fontSize={8} fontFamily="Inter, sans-serif"
                  fontWeight="600">
                  {Math.abs(ev.magnitude) >= 3 ? '▼▼▼' : '▼▼'}
                </text>
              )}
            </g>
          );
        })}

        {/* Selected highlight ring */}
        {selected && (() => {
          const crisis = events.find(c => c.id === selected);
          if (!crisis) return null;
          const x = tx(crisis.date);
          return (
            <circle cx={x} cy={MID_Y} r={10}
              fill="none" stroke="#E5534B" strokeWidth={1.5} strokeOpacity={0.7} />
          );
        })()}

        {/* Legend */}
        <g transform={`translate(${W - MARGIN.right - 160}, ${MARGIN.top - 18})`}>
          <rect x={0} y={0} width={6} height={18} fill="#E5534B" rx={1} fillOpacity={0.9} />
          <text x={10} y={13} fill="var(--text-muted)" fontSize={9} fontFamily="Inter, sans-serif">Major crash</text>
          <rect x={80} y={0} width={6} height={18} fill="#2EA043" rx={1} fillOpacity={0.5} />
          <text x={90} y={13} fill="var(--text-muted)" fontSize={9} fontFamily="Inter, sans-serif">Rally</text>
        </g>
      </svg>
    </div>
  );
}

// ── Crisis Card ───────────────────────────────────────────────────
function CrisisCard({
  crisis,
  isSelected,
  onClick,
}: {
  crisis: CrisisEvent;
  isSelected: boolean;
  onClick: () => void;
}) {
  const severity = Math.abs(crisis.magnitude);
  const color = severity >= 3 ? '#E5534B' : '#C47F17';

  return (
    <div
      className={`crisis-card${isSelected ? ' crisis-card-active' : ''}`}
      style={{ borderColor: isSelected ? color : 'var(--border)' }}
      onClick={onClick}
    >
      <div className="crisis-card-header">
        <div className="crisis-card-sev">
          {'▼'.repeat(severity)}
        </div>
        <div className="crisis-card-date">{crisis.date}</div>
        <span className="crisis-type-badge"
          style={{ background: TYPE_COLORS[crisis.type] ?? '#5BA3C9' }}>
          {crisis.type}
        </span>
      </div>

      <div className="crisis-card-title">{crisis.title}</div>

      <div className="crisis-metrics">
        <div className="crisis-metric">
          <span className="crisis-metric-label">Max Drawdown</span>
          <span className="crisis-metric-val" style={{ color: '#E5534B' }}>
            {crisis.maxDrawdown.toFixed(1)}%
          </span>
        </div>
        <div className="crisis-metric">
          <span className="crisis-metric-label">Days to Bottom</span>
          <span className="crisis-metric-val">{crisis.drawdownDays}d</span>
        </div>
        <div className="crisis-metric">
          <span className="crisis-metric-label">Recovery</span>
          <span className="crisis-metric-val" style={{ color: '#2EA043' }}>
            {crisis.recoveryDays}d
          </span>
        </div>
        <div className="crisis-metric">
          <span className="crisis-metric-label">Buy Signal Gain</span>
          <span className="crisis-metric-val" style={{ color: '#2EA043' }}>
            +{crisis.buySignalGain}%
          </span>
        </div>
      </div>

      <CrisisSparkline
        track={crisis.priceTrack}
        buySignalDay={crisis.buySignalDay}
        drawdownDays={crisis.drawdownDays}
      />

      <div className="crisis-sectors">
        {crisis.sectors.map(s => (
          <span key={s} className="crisis-sec-tag"
            style={{ borderColor: SECTOR_COLORS[s] ?? '#444', color: SECTOR_COLORS[s] ?? '#ccc' }}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Sector Drawdown Comparison bar chart ──────────────────────────
function SectorDrawdownChart({ crisis }: { crisis: CrisisEvent }) {
  const th = getEChartsTheme();
  const entries = Object.entries(crisis.sectorDrawdowns).sort((a, b) => a[1] - b[1]);
  const labels = entries.map(([s]) => s);
  const values = entries.map(([, v]) => v);

  const option = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: th.tooltipBg,
      borderColor: th.tooltipBorder,
      textStyle: { color: th.tooltipText },
      formatter: (params: unknown) => {
        const p = params as Array<{ name: string; value: number }>;
        return `${p[0].name}: ${p[0].value.toFixed(1)}%`;
      },
    },
    grid: { left: 8, right: 16, top: 4, bottom: 4, containLabel: true },
    xAxis: {
      type: 'value',
      axisLabel: { color: th.textColor, formatter: (v: number) => `${v}%` },
      splitLine: { lineStyle: { color: th.gridColor } },
      axisLine: { show: false },
    },
    yAxis: {
      type: 'category',
      data: labels,
      axisLabel: { color: th.textColor, fontSize: 10 },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    series: [{
      type: 'bar',
      data: values.map((v, i) => ({
        value: v,
        itemStyle: { color: (SECTOR_COLORS[labels[i]] ?? '#5BA3C9') + 'cc', borderRadius: [0, 3, 3, 0] },
      })),
      barMaxWidth: 22,
    }],
  };

  return (
    <ReactECharts echarts={echarts} option={option} style={{ height: '280px' }} notMerge />
  );
}

// ── Cross-crisis comparison ───────────────────────────────────────
function ComparisonChart({ crises }: { crises: CrisisEvent[] }) {
  const th = getEChartsTheme();
  const labels = crises.map(c => c.date);

  return (
    <div className="comparison-grid">
      {([
        ['Max Drawdown (%)', crises.map(c => c.maxDrawdown), '#E5534B'],
        ['Days to Bottom', crises.map(c => c.drawdownDays), '#C47F17'],
        ['Recovery Days', crises.map(c => c.recoveryDays), '#5BA3C9'],
        ['Buy Signal Gain (%)', crises.map(c => c.buySignalGain), '#2EA043'],
      ] as [string, number[], string][]).map(([title, values, color]) => (
        <div key={title}>
          <div className="comparison-chart-title">{title}</div>
          <ReactECharts
            echarts={echarts}
            option={{
              backgroundColor: 'transparent',
              tooltip: {
                trigger: 'axis',
                backgroundColor: th.tooltipBg,
                borderColor: th.tooltipBorder,
                textStyle: { color: th.tooltipText, fontSize: 11 },
              },
              grid: { left: 4, right: 4, top: 4, bottom: 4, containLabel: true },
              xAxis: {
                type: 'category',
                data: labels,
                axisLabel: { color: th.textColor, fontSize: 9 },
                splitLine: { show: false },
                axisLine: { show: false },
                axisTick: { show: false },
              },
              yAxis: {
                type: 'value',
                axisLabel: { color: th.textColor, fontSize: 9 },
                splitLine: { lineStyle: { color: th.gridColor } },
              },
              series: [{
                type: 'bar',
                data: (values as number[]).map(v => ({
                  value: v,
                  itemStyle: { color: color + '99', borderColor: color, borderWidth: 1, borderRadius: 4 },
                })),
                barMaxWidth: 20,
              }],
            }}
            style={{ height: '180px' }}
            notMerge
          />
        </div>
      ))}
    </div>
  );
}

// ── Buy Signal Scanner Table ──────────────────────────────────────
function BuySignalTable({ crises }: { crises: CrisisEvent[] }) {
  return (
    <div className="table-wrap">
      <table className="etf-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Event</th>
            <th>Max Drawdown</th>
            <th>Bottom Date</th>
            <th>Signal Day</th>
            <th>Signal Gain</th>
            <th>Recovery Date</th>
            <th>Recovery Days</th>
          </tr>
        </thead>
        <tbody>
          {crises.map(c => (
            <tr key={c.id}>
              <td className="mono">{c.date}</td>
              <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.title}
              </td>
              <td className="mono" style={{ color: '#E5534B' }}>{c.maxDrawdown.toFixed(1)}%</td>
              <td className="mono">{c.bottomDate}</td>
              <td className="mono">+{c.buySignalDay}d</td>
              <td className="mono" style={{ color: '#2EA043' }}>+{c.buySignalGain}%</td>
              <td className="mono">{c.recoveryDate}</td>
              <td className="mono">{c.recoveryDays}d</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main CrisisTab ────────────────────────────────────────────────
interface AllEvent {
  date: string;
  title: string;
  magnitude: number;
  type: string;
}

interface Props {
  crisisData: CrisisEvent[] | null;
  allEvents: AllEvent[] | null;
}

export default function CrisisTab({ crisisData, allEvents }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  // Auto-select most severe crash on load
  useEffect(() => {
    if (crisisData?.length && !selectedId) {
      const worst = [...crisisData].sort((a, b) => a.maxDrawdown - b.maxDrawdown)[0];
      setSelectedId(worst.id);
    }
  }, [crisisData, selectedId]);

  if (!crisisData || !allEvents) {
    return (
      <main className="tab-panel active">
        <div className="crisis-wrap">
          <div className="skeleton" style={{ height: 60, borderRadius: 'var(--radius)' }} />
          <div className="crisis-cards-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 140, borderRadius: 'var(--radius)' }} />
            ))}
          </div>
        </div>
      </main>
    );
  }

  const selectedCrisis = crisisData.find(c => c.id === selectedId) ?? null;

  function handleSelect(id: string) {
    setSelectedId(id);
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  return (
    <main className="tab-panel active">
      {/* Timeline ─────────────────────────────────────────────── */}
      <section className="panel">
        <div className="panel-header">
          <h2>Crisis Atlas — Event Timeline</h2>
          <span className="panel-hint">
            All market events 2024–2026 · Click a crash bar to inspect
          </span>
        </div>
        <CrisisTimeline
          events={crisisData}
          allEvents={allEvents}
          selected={selectedId}
          onSelect={handleSelect}
        />
      </section>

      {/* Crisis Cards Grid ─────────────────────────────────────── */}
      <section className="panel">
        <div className="panel-header">
          <h2>Major Crashes</h2>
          <span className="panel-hint">Magnitude ≥ 2 · Click card for sector breakdown</span>
        </div>
        <div className="crisis-cards-grid">
          {crisisData.map(crisis => (
            <CrisisCard
              key={crisis.id}
              crisis={crisis}
              isSelected={selectedId === crisis.id}
              onClick={() => handleSelect(crisis.id)}
            />
          ))}
        </div>
      </section>

      {/* Detail panel for selected crisis ─────────────────────── */}
      {selectedCrisis && (
        <section className="panel" ref={detailRef}>
          <div className="panel-header">
            <h2>{selectedCrisis.title}</h2>
            <span className="panel-hint">{selectedCrisis.date} · {selectedCrisis.detail}</span>
          </div>

          <div className="crisis-detail-grid">
            <div>
              <div className="chart-sublabel">Sector Drawdown Impact</div>
              <SectorDrawdownChart crisis={selectedCrisis} />
            </div>
            <div className="crisis-detail-meta">
              <div className="crisis-detail-stat">
                <span className="crisis-detail-label">Crash Start</span>
                <span className="crisis-detail-val">{selectedCrisis.date}</span>
              </div>
              <div className="crisis-detail-stat">
                <span className="crisis-detail-label">Market Bottom</span>
                <span className="crisis-detail-val" style={{ color: '#E5534B' }}>{selectedCrisis.bottomDate}</span>
              </div>
              <div className="crisis-detail-stat">
                <span className="crisis-detail-label">Max Drawdown</span>
                <span className="crisis-detail-val" style={{ color: '#E5534B' }}>
                  {selectedCrisis.maxDrawdown.toFixed(1)}%
                </span>
              </div>
              <div className="crisis-detail-stat">
                <span className="crisis-detail-label">Days to Bottom</span>
                <span className="crisis-detail-val">{selectedCrisis.drawdownDays} days</span>
              </div>
              <div className="crisis-detail-stat">
                <span className="crisis-detail-label">Buy Signal</span>
                <span className="crisis-detail-val" style={{ color: '#2EA043' }}>
                  +{selectedCrisis.buySignalDay}d from bottom
                </span>
              </div>
              <div className="crisis-detail-stat">
                <span className="crisis-detail-label">Signal → Recovery</span>
                <span className="crisis-detail-val" style={{ color: '#2EA043' }}>
                  +{selectedCrisis.buySignalGain}%
                </span>
              </div>
              <div className="crisis-detail-stat">
                <span className="crisis-detail-label">Full Recovery</span>
                <span className="crisis-detail-val" style={{ color: '#2EA043' }}>{selectedCrisis.recoveryDate}</span>
              </div>
              <div className="crisis-detail-stat">
                <span className="crisis-detail-label">Recovery Duration</span>
                <span className="crisis-detail-val">{selectedCrisis.recoveryDays} days</span>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <div className="crisis-detail-label" style={{ marginBottom: '0.4rem' }}>Most Affected Sectors</div>
                <div className="crisis-sectors">
                  {selectedCrisis.sectors.map(s => (
                    <span key={s} className="crisis-sec-tag"
                      style={{ borderColor: SECTOR_COLORS[s] ?? '#444', color: SECTOR_COLORS[s] ?? '#ccc' }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Buy Signal Scanner ─────────────────────────────────────── */}
      <section className="panel">
        <div className="panel-header">
          <h2>Bottom Buy Signal Scanner</h2>
          <span className="panel-hint">
            Signal: price ≥ 8% below peak → first 2-day bounce · All signals are simulated
          </span>
        </div>
        <BuySignalTable crises={crisisData} />
      </section>

      {/* Cross-crisis comparison ─────────────────────────────────── */}
      <section className="panel">
        <div className="panel-header">
          <h2>Cross-Crisis Comparison</h2>
          <span className="panel-hint">Drawdown depth · Speed to bottom · Recovery duration · Buy signal gain</span>
        </div>
        <ComparisonChart crises={crisisData} />
      </section>
    </main>
  );
}
