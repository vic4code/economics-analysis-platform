'use client';
import { useState } from 'react';
import { changeColor, changeTextColor, fmtPct, SECTOR_COLORS } from '@/lib/utils/colors';
import { RotationClock } from '@/components/charts';
import type { MockEvent, CycleRow } from '@/types';
import { useRef, useEffect } from 'react';

const EVENT_COLORS: Record<string, string> = {
  fed:          '#4A90D9',
  macro:        '#2EA043',
  earnings:     '#C47F17',
  geopolitical: '#D4564E',
};
const EVENT_ICONS: Record<string, string> = {
  fed:          '🏦',
  macro:        '📊',
  earnings:     '📈',
  geopolitical: '🌐',
};

// ── Cycle Heatmap Canvas ─────────────────────────────────────────
interface HeatmapTooltip { text: string; x: number; y: number }

function CycleHeatmapCanvas({ cycleData }: { cycleData: CycleRow[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<HeatmapTooltip | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !cycleData.length) return;
    const wrapper = canvas.parentElement!;
    const allMonths = [...new Set(cycleData.flatMap(d => Object.keys(d.monthly_returns)))].sort();
    const sectors   = cycleData.map(d => d.sector);
    const LABEL_W   = 110;
    const CELL_H    = 30;
    const CELL_W    = Math.max(34, Math.floor((wrapper.clientWidth - LABEL_W - 16) / allMonths.length));
    const TOP_H     = 36;
    canvas.width  = LABEL_W + allMonths.length * CELL_W + 4;
    canvas.height = TOP_H + sectors.length * CELL_H + 4;
    canvas.style.width  = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle   = '#8b949e';
    ctx.font        = '10px Inter,sans-serif';
    ctx.textAlign   = 'center';
    allMonths.forEach((m, j) => {
      ctx.fillText(m.slice(2), LABEL_W + j * CELL_W + CELL_W / 2, TOP_H - 8);
    });

    sectors.forEach((sec, i) => {
      const row = cycleData[i];
      const y   = TOP_H + i * CELL_H;
      ctx.fillStyle   = '#cdd9e5';
      ctx.font        = '11px Inter,sans-serif';
      ctx.textAlign   = 'right';
      ctx.fillText(sec, LABEL_W - 6, y + CELL_H / 2 + 4);
      allMonths.forEach((m, j) => {
        const val = row.monthly_returns[m];
        const x   = LABEL_W + j * CELL_W;
        ctx.fillStyle = val === undefined ? '#1c2333' : changeColor(val * 0.5, 0.85);
        ctx.fillRect(x + 1, y + 1, CELL_W - 2, CELL_H - 2);
        if (val !== undefined && CELL_W > 38) {
          ctx.fillStyle = Math.abs(val) > 2 ? '#fff' : '#cdd9e5';
          ctx.font      = '9px Inter,sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(fmtPct(val, false), x + CELL_W / 2, y + CELL_H / 2 + 3);
        }
      });
    });

    canvas.onmousemove = (ev: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx   = ev.clientX - rect.left;
      const my   = ev.clientY - rect.top;
      const j    = Math.floor((mx - LABEL_W) / CELL_W);
      const i    = Math.floor((my - TOP_H) / CELL_H);
      if (i < 0 || i >= sectors.length || j < 0 || j >= allMonths.length) {
        setTooltip(null);
        return;
      }
      const val = cycleData[i].monthly_returns[allMonths[j]];
      if (val === undefined) { setTooltip(null); return; }
      setTooltip({
        text: `${sectors[i]} · ${allMonths[j]} → ${fmtPct(val)}`,
        x: ev.clientX + 12,
        y: ev.clientY - 28,
      });
    };
    canvas.onmouseleave = () => setTooltip(null);
  }, [cycleData]);

  return (
    <div className="cycle-heatmap-wrap">
      <canvas ref={canvasRef} />
      {tooltip && (
        <div
          className="cycle-tooltip"
          style={{ position: 'fixed', left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

// ── Main CycleTab ────────────────────────────────────────────────
interface Props {
  eventsData: MockEvent[] | null;
  cycleData: CycleRow[] | null;
}

export default function CycleTab({ eventsData, cycleData }: Props) {
  const [eventTypeFilter, setEventTypeFilter] = useState('all');

  const filteredEvents = (eventsData ?? [])
    .filter(e => eventTypeFilter === 'all' || e.type === eventTypeFilter)
    .slice()
    .reverse();

  const sortedCycle = cycleData
    ? [...cycleData].sort((a, b) => b.percentile_rank - a.percentile_rank)
    : [];

  return (
    <main className="tab-panel active">
      {/* Economic Cycle Rotation Clock ─────────────────────────── */}
      <section className="panel">
        <div className="panel-header">
          <h2>Economic Cycle Locator</h2>
          <span className="panel-hint">
            Phase estimated from 52-week percentile rank across sectors
          </span>
        </div>
        {cycleData && cycleData.length > 0 ? (
          <div className="clock-layout">
            <RotationClock cycleData={cycleData} />
            <div className="clock-sidebar">
              <div className="clock-sidebar-title">Sector Strength Rank</div>
              {sortedCycle.slice(0, 8).map(d => {
                const clr = d.percentile_rank >= 70 ? '#2EA043'
                          : d.percentile_rank >= 40 ? '#fbbf24'
                          : '#E5534B';
                return (
                  <div key={d.sector} className="clock-rank-row">
                    <span className="clock-rank-sector" style={{ color: d.color }}>
                      {d.sector}
                    </span>
                    <div className="clock-rank-bar-track">
                      <div
                        className="clock-rank-bar-fill"
                        style={{ width: `${d.percentile_rank}%`, background: clr }}
                      />
                    </div>
                    <span className="clock-rank-pct" style={{ color: clr }}>
                      {d.percentile_rank}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="skeleton" style={{ height: 320 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
            </div>
          </div>
        )}
      </section>

      {/* Event Timeline ─────────────────────────────────────────── */}
      <section className="panel">
        <div className="panel-header">
          <h2>Major Market Events</h2>
          <span className="panel-hint">Event details and affected sectors</span>
        </div>
        <div className="event-filters">
          {(
            [
              ['all', 'All'],
              ['fed', 'Fed / CB'],
              ['macro', 'Macro'],
              ['earnings', 'Earnings'],
              ['geopolitical', 'Geopolitical'],
            ] as [string, string][]
          ).map(([t, l]) => (
            <button
              key={t}
              className={`ef-btn${eventTypeFilter === t ? ' active' : ''}`}
              onClick={() => setEventTypeFilter(t)}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="event-timeline">
          {filteredEvents.map((ev, idx) => (
            <div
              key={idx}
              className={`ev-card ${ev.magnitude > 0 ? 'ev-pos' : ev.magnitude < 0 ? 'ev-neg' : 'ev-neu'}`}
            >
              <div className="ev-stripe" style={{ background: EVENT_COLORS[ev.type] ?? '#58a6ff' }} />
              <div className="ev-body">
                <div className="ev-top">
                  <span className="ev-icon">{EVENT_ICONS[ev.type] ?? '📌'}</span>
                  <span className="ev-date">{ev.date}</span>
                  <span className="ev-badge" style={{ background: EVENT_COLORS[ev.type] ?? '#58a6ff' }}>
                    {ev.type}
                  </span>
                  <span className="ev-mag">
                    {'★'.repeat(Math.abs(ev.magnitude)) || '—'}
                    {ev.magnitude < 0 ? ' Bearish' : ' Bullish'}
                  </span>
                </div>
                <div className="ev-title">{ev.title}</div>
                <div className="ev-detail">{ev.detail}</div>
                <div className="ev-sectors">
                  {ev.sectors.map(s => (
                    <span
                      key={s}
                      className="ev-sec-tag"
                      style={{ borderColor: SECTOR_COLORS[s] ?? '#444', color: SECTOR_COLORS[s] ?? '#ccc' }}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cycle Heatmap ──────────────────────────────────────────── */}
      <section className="panel">
        <div className="panel-header">
          <h2>Sector Monthly Return Heatmap</h2>
          <span className="panel-hint">
            ~25-month sector returns — deeper color = larger move
          </span>
        </div>
        {cycleData && <CycleHeatmapCanvas cycleData={cycleData} />}
      </section>

      {/* Percentile Ranks ───────────────────────────────────────── */}
      <section className="panel">
        <div className="panel-header">
          <h2>52-Week Percentile Rank</h2>
          <span className="panel-hint">
            1Y return ranked against 2Y history · 100 = all-time high
          </span>
        </div>
        <div className="percentile-grid">
          {sortedCycle.map(d => {
            const clr = d.percentile_rank >= 70 ? '#2EA043'
                      : d.percentile_rank >= 40 ? '#fbbf24'
                      : '#E5534B';
            return (
              <div key={d.sector} className="perc-row">
                <div className="perc-sector" style={{ color: d.color }}>{d.sector}</div>
                <div className="perc-bar-track">
                  <div className="perc-bar-fill" style={{ width: `${d.percentile_rank}%`, background: clr }} />
                </div>
                <div className="perc-rank" style={{ color: clr }}>{d.percentile_rank}%</div>
                <div className="perc-meta">
                  <span title="1Y Return" style={{ color: changeTextColor(d.current_1y) }}>
                    {fmtPct(d.current_1y)} 1Y
                  </span>
                  <span className="perc-best">↑ {d.best_months.join('/')}</span>
                  <span className="perc-worst">↓ {d.worst_months.join('/')}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
