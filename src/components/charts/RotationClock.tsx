'use client';
import { useMemo } from 'react';
import { SECTOR_COLORS } from '@/lib/utils/colors';
import type { CycleRow } from '@/types';

// ── Economic cycle phase definitions ────────────────────────────────────────
//
// Clock goes clockwise from 12 o'clock.
// Angle 0 = 12 o'clock = start of Expansion.
//
// Phase arcs (radians from 12 o'clock, clockwise):
//   Expansion:   0   → π/2   (12→3)
//   Slowdown:    π/2 → π     (3→6)
//   Contraction: π   → 3π/2  (6→9)
//   Recovery:    3π/2→ 2π    (9→12)

interface Phase {
  name: string;
  nameZh: string;
  startAngle: number;
  color: string;
  description: string;
}

const PHASES: Phase[] = [
  {
    name: 'Expansion',   nameZh: '擴張期',
    startAngle: 0,
    color: '#4a90e2',
    description: '科技/工業/加密領漲，成長加速',
  },
  {
    name: 'Slowdown',    nameZh: '放緩期',
    startAngle: Math.PI / 2,
    color: '#f7931a',
    description: '能源/原物料強勢，通膨升溫',
  },
  {
    name: 'Contraction', nameZh: '收縮期',
    startAngle: Math.PI,
    color: '#e74c3c',
    description: '防禦板塊：醫療/債券/公用事業',
  },
  {
    name: 'Recovery',    nameZh: '復甦期',
    startAngle: (3 * Math.PI) / 2,
    color: '#27ae60',
    description: '金融/房地產/消費性股票復甦',
  },
];

// Theoretical clock position per sector (angle from 12 o'clock, clockwise radians)
const SECTOR_CLOCK_ANGLE: Record<string, number> = {
  Crypto:        (0.5 / 12) * 2 * Math.PI,   // 0:30 — high beta, early expansion
  Technology:    (1.0 / 12) * 2 * Math.PI,   // 1:00
  Industrials:   (2.0 / 12) * 2 * Math.PI,   // 2:00
  Materials:     (2.5 / 12) * 2 * Math.PI,   // 2:30
  Energy:        (4.0 / 12) * 2 * Math.PI,   // 4:00
  Commodities:   (4.5 / 12) * 2 * Math.PI,   // 4:30
  International: (5.0 / 12) * 2 * Math.PI,   // 5:00
  Healthcare:    (6.5 / 12) * 2 * Math.PI,   // 6:30
  Consumer:      (7.5 / 12) * 2 * Math.PI,   // 7:30 (mixed; defensive part dominates)
  Bonds:         (8.0 / 12) * 2 * Math.PI,   // 8:00
  Utilities:     (8.5 / 12) * 2 * Math.PI,   // 8:30
  'Real Estate': (9.5 / 12) * 2 * Math.PI,   // 9:30
  Financials:    (10.0 / 12) * 2 * Math.PI,  // 10:00
  'Broad Market':(11.5 / 12) * 2 * Math.PI,  // 11:30
};

// ── Phase estimation ─────────────────────────────────────────────────────────
function estimatePhaseAngle(cycleData: CycleRow[]): number {
  // Score each phase by the weighted percentile rank of its sectors.
  // Higher percentile rank in flow_scores → that phase is dominant.
  const phaseScores: Record<string, number> = {
    Expansion: 0, Slowdown: 0, Contraction: 0, Recovery: 0,
  };
  const phaseCounts: Record<string, number> = {
    Expansion: 0, Slowdown: 0, Contraction: 0, Recovery: 0,
  };

  const phaseMap: Record<string, string> = {
    Technology:    'Expansion',   Industrials: 'Expansion',
    Materials:     'Expansion',   Crypto:      'Expansion',
    Energy:        'Slowdown',    Commodities: 'Slowdown',
    International: 'Slowdown',
    Healthcare:    'Contraction', Bonds:       'Contraction',
    Utilities:     'Contraction', Consumer:    'Contraction',
    Financials:    'Recovery',    'Real Estate': 'Recovery',
    'Broad Market': 'Recovery',
  };

  for (const row of cycleData) {
    const phase = phaseMap[row.sector];
    if (!phase) continue;
    phaseScores[phase] += row.percentile_rank;
    phaseCounts[phase]++;
  }

  // Normalise to averages
  const avgScores = Object.fromEntries(
    Object.entries(phaseScores).map(([k, v]) => [
      k,
      phaseCounts[k] > 0 ? v / phaseCounts[k] : 0,
    ]),
  );

  // Find the dominant phase
  const dominant = Object.entries(avgScores)
    .sort((a, b) => b[1] - a[1])[0][0];
  const dominantDef = PHASES.find(p => p.name === dominant)!;

  // Position within the phase based on relative strength vs the next phase
  const phaseIdx = PHASES.findIndex(p => p.name === dominant);
  const nextPhase = PHASES[(phaseIdx + 1) % 4].name;
  const currScore = avgScores[dominant];
  const nextScore = avgScores[nextPhase];
  // 0 = just entered this phase, 0.9 = almost leaving
  const withinFraction = Math.min(0.9, currScore > 0 ? nextScore / currScore : 0.5);

  return dominantDef.startAngle + withinFraction * (Math.PI / 2);
}

// ── SVG helpers ──────────────────────────────────────────────────────────────
function polarToXY(cx: number, cy: number, r: number, angle: number) {
  // angle: 0 = 12 o'clock, increases clockwise
  return {
    x: cx + r * Math.sin(angle),
    y: cy - r * Math.cos(angle),
  };
}

function arcPath(
  cx: number, cy: number,
  r: number,
  startAngle: number, endAngle: number,
  innerR: number,
): string {
  const s1 = polarToXY(cx, cy, r, startAngle);
  const e1 = polarToXY(cx, cy, r, endAngle);
  const s2 = polarToXY(cx, cy, innerR, endAngle);
  const e2 = polarToXY(cx, cy, innerR, startAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;

  return [
    `M ${s1.x} ${s1.y}`,
    `A ${r} ${r} 0 ${large} 1 ${e1.x} ${e1.y}`,
    `L ${s2.x} ${s2.y}`,
    `A ${innerR} ${innerR} 0 ${large} 0 ${e2.x} ${e2.y}`,
    'Z',
  ].join(' ');
}

// ── Clock hand path ───────────────────────────────────────────────────────────
function handPath(cx: number, cy: number, angle: number, length: number): string {
  const tip   = polarToXY(cx, cy, length, angle);
  const back  = polarToXY(cx, cy, -14, angle);
  const left  = polarToXY(cx, cy, 8, angle - Math.PI / 2);
  const right = polarToXY(cx, cy, 8, angle + Math.PI / 2);
  return `M ${back.x} ${back.y} L ${left.x} ${left.y} L ${tip.x} ${tip.y} L ${right.x} ${right.y} Z`;
}

// ── Component ────────────────────────────────────────────────────────────────
interface Props {
  cycleData: CycleRow[];
}

const CX = 250;
const CY = 250;
const OUTER_R    = 210;
const INNER_R    = 140;
const DOT_RING_R = 115;
const LABEL_R    = 230;
const VIEW_SIZE  = 500;

export default function RotationClock({ cycleData }: Props) {
  const handAngle = useMemo(() => estimatePhaseAngle(cycleData), [cycleData]);
  const dominantPhase = PHASES.find(
    p => handAngle >= p.startAngle && handAngle < p.startAngle + Math.PI / 2,
  ) ?? PHASES[0];

  // Build sector dots: position by theoretical angle, size by percentile rank
  const sectorDots = useMemo(() => {
    const rankMap: Record<string, number> = {};
    const cy1yMap: Record<string, number> = {};
    for (const row of cycleData) {
      rankMap[row.sector]  = row.percentile_rank;
      cy1yMap[row.sector]  = row.current_1y;
    }

    return Object.entries(SECTOR_CLOCK_ANGLE)
      .filter(([sec]) => sec in rankMap)
      .map(([sec, angle]) => {
        const rank   = rankMap[sec] ?? 50;
        const return1y = cy1yMap[sec] ?? 0;
        const dot_r  = 6 + (rank / 100) * 10;  // 6–16px
        const pos    = polarToXY(CX, CY, DOT_RING_R, angle);
        return { sec, angle, rank, return1y, dot_r, ...pos };
      });
  }, [cycleData]);

  return (
    <div className="rotation-clock-wrap">
      <svg
        viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
        style={{ width: '100%', maxWidth: '500px', display: 'block', margin: '0 auto' }}
        aria-label="Economic sector rotation clock"
      >
        {/* Phase arc bands */}
        {PHASES.map(ph => (
          <path
            key={ph.name}
            d={arcPath(CX, CY, OUTER_R, ph.startAngle, ph.startAngle + Math.PI / 2, INNER_R)}
            fill={ph.color}
            fillOpacity={dominantPhase.name === ph.name ? 0.28 : 0.10}
            stroke={ph.color}
            strokeOpacity={0.5}
            strokeWidth={1}
          />
        ))}

        {/* Phase outer labels */}
        {PHASES.map(ph => {
          const midAngle = ph.startAngle + Math.PI / 4;
          const pos = polarToXY(CX, CY, LABEL_R, midAngle);
          return (
            <g key={ph.name + '-label'}>
              <text
                x={pos.x} y={pos.y - 7}
                textAnchor="middle"
                fill={ph.color}
                fontSize={12}
                fontWeight="700"
                fontFamily="Inter, sans-serif"
                opacity={dominantPhase.name === ph.name ? 1 : 0.5}
              >
                {ph.nameZh}
              </text>
              <text
                x={pos.x} y={pos.y + 8}
                textAnchor="middle"
                fill={ph.color}
                fontSize={9}
                fontFamily="Inter, sans-serif"
                opacity={dominantPhase.name === ph.name ? 0.85 : 0.35}
              >
                {ph.name}
              </text>
            </g>
          );
        })}

        {/* Inner ring separator */}
        <circle cx={CX} cy={CY} r={INNER_R} fill="none" stroke="#30363d" strokeWidth={1} />

        {/* Tick marks (12 hours) */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle  = (i / 12) * 2 * Math.PI;
          const inner  = polarToXY(CX, CY, INNER_R - 4, angle);
          const outer  = polarToXY(CX, CY, INNER_R + 4, angle);
          return (
            <line
              key={i}
              x1={inner.x} y1={inner.y}
              x2={outer.x} y2={outer.y}
              stroke="#30363d" strokeWidth={i % 3 === 0 ? 2 : 1}
            />
          );
        })}

        {/* Sector dots */}
        {sectorDots.map(d => {
          const color = SECTOR_COLORS[d.sec] ?? '#58a6ff';
          const isActive = d.rank >= 60;
          return (
            <g key={d.sec}>
              {isActive && (
                <circle
                  cx={d.x} cy={d.y} r={d.dot_r + 5}
                  fill={color} fillOpacity={0.15}
                />
              )}
              <circle
                cx={d.x} cy={d.y} r={d.dot_r}
                fill={color}
                fillOpacity={0.9}
                stroke={isActive ? '#fff' : color}
                strokeWidth={isActive ? 1.5 : 0.5}
              />
              <text
                x={d.x}
                y={d.y - d.dot_r - 4}
                textAnchor="middle"
                fill="#cdd9e5"
                fontSize={8.5}
                fontFamily="Inter, sans-serif"
              >
                {d.sec.length > 8 ? d.sec.slice(0, 7) + '…' : d.sec}
              </text>
            </g>
          );
        })}

        {/* Clock hand */}
        <path
          d={handPath(CX, CY, handAngle, INNER_R - 18)}
          fill={dominantPhase.color}
          fillOpacity={0.9}
          stroke="#fff"
          strokeWidth={0.5}
        />

        {/* Center hub */}
        <circle cx={CX} cy={CY} r={16} fill="#161b22" stroke="#30363d" strokeWidth={2} />
        <circle cx={CX} cy={CY} r={5}  fill={dominantPhase.color} />

        {/* Current phase text in center */}
        <text
          x={CX} y={CY + 34}
          textAnchor="middle"
          fill={dominantPhase.color}
          fontSize={13}
          fontWeight="700"
          fontFamily="Inter, sans-serif"
        >
          {dominantPhase.nameZh}
        </text>
        <text
          x={CX} y={CY + 49}
          textAnchor="middle"
          fill="#8b949e"
          fontSize={9}
          fontFamily="Inter, sans-serif"
        >
          {dominantPhase.description}
        </text>
      </svg>

      {/* Phase cards below */}
      <div className="clock-phase-cards">
        {PHASES.map(ph => {
          const phSectors = Object.entries(SECTOR_CLOCK_ANGLE)
            .filter(([, a]) => a >= ph.startAngle && a < ph.startAngle + Math.PI / 2)
            .map(([s]) => s);
          const isActive = dominantPhase.name === ph.name;
          return (
            <div
              key={ph.name}
              className={`clock-phase-card${isActive ? ' active' : ''}`}
              style={{ borderColor: isActive ? ph.color : 'var(--border)' }}
            >
              <div className="clock-phase-name" style={{ color: ph.color }}>
                {ph.nameZh}
              </div>
              <div className="clock-phase-desc">{ph.description}</div>
              <div className="clock-phase-sectors">
                {phSectors.map(s => (
                  <span
                    key={s}
                    className="clock-sector-tag"
                    style={{ borderColor: SECTOR_COLORS[s] ?? '#444', color: SECTOR_COLORS[s] ?? '#ccc' }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
