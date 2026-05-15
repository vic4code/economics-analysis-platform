'use client';
import { useMemo, useState } from 'react';
import { SECTOR_COLORS } from '@/lib/utils/colors';

// ── Public types ────────────────────────────────────────────────────────────
export interface SankeyData {
  sectors: string[];
  flow_scores: number[];
  mcaps: number[];
}

export interface SankeyNode {
  id: string;
  color: string;
  score: number;
  mcap: number;
  value: number;
  y: number;
  height: number;
}

export interface SankeyLink {
  source: SankeyNode;
  target: SankeyNode;
  value: number;
  /** y offset from source.y where this link starts */
  sy: number;
  /** y offset from target.y where this link starts */
  ty: number;
  width: number;
}

export interface SankeyLayout {
  sources: SankeyNode[];
  sinks: SankeyNode[];
  links: SankeyLink[];
  sourceX: number;
  sinkX: number;
}

// ── Layout constants ────────────────────────────────────────────────────────
const NODE_WIDTH = 136;
const NODE_GAP   = 8;
const MARGIN     = { top: 24, right: 16, bottom: 24, left: 16 };

// ── Pure layout algorithm (exported for unit tests) ─────────────────────────
export function computeSankeyLayout(
  data: SankeyData,
  height: number,
  width: number,
): SankeyLayout {
  const { sectors, flow_scores, mcaps } = data;
  const totalMcap = mcaps.reduce((s, m) => s + m, 0) || 1;

  const sources: SankeyNode[] = [];
  const sinks: SankeyNode[]   = [];

  sectors.forEach((sec, i) => {
    const normMcap = mcaps[i] / totalMcap;
    const node: SankeyNode = {
      id:     sec,
      color:  SECTOR_COLORS[sec] ?? '#58a6ff',
      score:  flow_scores[i],
      mcap:   mcaps[i],
      value:  Math.abs(flow_scores[i]) * normMcap,
      y:      0,
      height: 0,
    };
    if (flow_scores[i] < 0) sources.push(node);
    else if (flow_scores[i] > 0) sinks.push(node);
  });

  sources.sort((a, b) => b.value - a.value);
  sinks.sort((a, b) => b.value - a.value);

  const availH = height - MARGIN.top - MARGIN.bottom;

  function layoutColumn(nodes: SankeyNode[]) {
    const totalPad = NODE_GAP * Math.max(0, nodes.length - 1);
    const totalVal = nodes.reduce((s, n) => s + n.value, 0) || 1;
    let y = MARGIN.top;
    nodes.forEach(n => {
      n.height = Math.max(22, ((n.value / totalVal) * (availH - totalPad)));
      n.y      = y;
      y += n.height + NODE_GAP;
    });
  }

  layoutColumn(sources);
  layoutColumn(sinks);

  // Compute links: each source fans out to all sinks proportionally
  const links: SankeyLink[]         = [];
  const sourceUsed = new Map(sources.map(n => [n.id, 0]));
  const sinkUsed   = new Map(sinks.map(n => [n.id, 0]));

  const totalSinkVal = sinks.reduce((s, n) => s + n.value, 0) || 1;

  for (const src of sources) {
    for (const snk of sinks) {
      const linkVal      = src.value * (snk.value / totalSinkVal);
      const srcFraction  = linkVal / src.value;
      const snkFraction  = linkVal / snk.value;
      const srcLinkH     = srcFraction * src.height;
      const snkLinkH     = snkFraction * snk.height;
      const sy           = sourceUsed.get(src.id) ?? 0;
      const ty           = sinkUsed.get(snk.id)   ?? 0;

      links.push({
        source: src,
        target: snk,
        value:  linkVal,
        sy,
        ty,
        width: Math.min(srcLinkH, snkLinkH),
      });

      sourceUsed.set(src.id, sy + srcLinkH);
      sinkUsed.set(snk.id,   ty + snkLinkH);
    }
  }

  const contentW = width - MARGIN.left - MARGIN.right;
  const sourceX  = MARGIN.left;
  const sinkX    = MARGIN.left + contentW - NODE_WIDTH;

  return { sources, sinks, links, sourceX, sinkX };
}

// ── SVG path helpers ────────────────────────────────────────────────────────
function linkPath(
  x1: number, y1top: number, y1bot: number,
  x2: number, y2top: number, y2bot: number,
): string {
  const mx = (x1 + x2) / 2;
  return [
    `M ${x1} ${y1top}`,
    `C ${mx} ${y1top}, ${mx} ${y2top}, ${x2} ${y2top}`,
    `L ${x2} ${y2bot}`,
    `C ${mx} ${y2bot}, ${mx} ${y1bot}, ${x1} ${y1bot}`,
    'Z',
  ].join(' ');
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

// ── Tooltip state ───────────────────────────────────────────────────────────
interface Tooltip {
  text: string;
  x: number;
  y: number;
}

// ── Component ───────────────────────────────────────────────────────────────
interface Props {
  data: SankeyData;
}

const VIEW_W  = 720;
const VIEW_H  = 420;

export default function SankeyChart({ data }: Props) {
  const layout = useMemo(
    () => computeSankeyLayout(data, VIEW_H, VIEW_W),
    [data],
  );
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [hoveredLink, setHoveredLink] = useState<number | null>(null);

  const { sources, sinks, links, sourceX, sinkX } = layout;
  const srcRightX = sourceX + NODE_WIDTH;
  const snkLeftX  = sinkX;

  const totalFlow = sources.reduce((s, n) => s + n.mcap * Math.abs(n.score), 0);
  const totalFlowB = (totalFlow / 100).toFixed(1);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Legend row */}
      <div className="sankey-legend">
        <span className="sankey-legend-item sankey-legend-out">
          ← 資金流出板塊
        </span>
        <span className="sankey-legend-center">
          估計轉移總量 ~${totalFlowB}B
        </span>
        <span className="sankey-legend-item sankey-legend-in">
          資金流入板塊 →
        </span>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        style={{ width: '100%', display: 'block' }}
        aria-label="Capital flow Sankey diagram"
      >
        <defs>
          {links.map((lk, i) => (
            <linearGradient
              key={i}
              id={`lg-${i}`}
              x1="0%" y1="0%" x2="100%" y2="0%"
            >
              <stop offset="0%"   stopColor={`rgb(${hexToRgb(lk.source.color)})`} stopOpacity="0.55" />
              <stop offset="100%" stopColor={`rgb(${hexToRgb(lk.target.color)})`} stopOpacity="0.45" />
            </linearGradient>
          ))}
        </defs>

        {/* Links (drawn behind nodes) */}
        {links.map((lk, i) => {
          const srcX  = srcRightX;
          const snkX  = snkLeftX;
          const y1top = lk.source.y + lk.sy;
          const y1bot = y1top + lk.width;
          const y2top = lk.target.y + lk.ty;
          const y2bot = y2top + lk.width;
          const isHov = hoveredLink === i;

          return (
            <path
              key={i}
              d={linkPath(srcX, y1top, y1bot, snkX, y2top, y2bot)}
              fill={`url(#lg-${i})`}
              opacity={hoveredLink === null ? 0.65 : isHov ? 0.9 : 0.2}
              style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
              onMouseEnter={e => {
                setHoveredLink(i);
                setTooltip({
                  text: `${lk.source.id} → ${lk.target.id}：估計 $${(lk.value * lk.source.mcap * 0.01).toFixed(1)}B`,
                  x: e.clientX + 12,
                  y: e.clientY - 30,
                });
              }}
              onMouseLeave={() => { setHoveredLink(null); setTooltip(null); }}
            />
          );
        })}

        {/* Source nodes */}
        {sources.map(n => (
          <g key={n.id}>
            <rect
              x={sourceX} y={n.y}
              width={NODE_WIDTH} height={n.height}
              rx={4}
              fill={n.color}
              fillOpacity={0.85}
            />
            <text
              x={sourceX + NODE_WIDTH / 2}
              y={n.y + n.height / 2 - 7}
              textAnchor="middle"
              fill="#fff"
              fontSize={11}
              fontWeight="600"
              fontFamily="Inter, sans-serif"
            >
              {n.id.length > 14 ? n.id.slice(0, 13) + '…' : n.id}
            </text>
            <text
              x={sourceX + NODE_WIDTH / 2}
              y={n.y + n.height / 2 + 8}
              textAnchor="middle"
              fill="#f87171"
              fontSize={10}
              fontFamily="Inter, sans-serif"
            >
              {n.score.toFixed(1)} 流出
            </text>
            <text
              x={sourceX + NODE_WIDTH / 2}
              y={n.y + n.height / 2 + 21}
              textAnchor="middle"
              fill="rgba(255,255,255,0.55)"
              fontSize={9}
              fontFamily="Inter, sans-serif"
            >
              AUM ${n.mcap}B
            </text>
          </g>
        ))}

        {/* Sink nodes */}
        {sinks.map(n => (
          <g key={n.id}>
            <rect
              x={sinkX} y={n.y}
              width={NODE_WIDTH} height={n.height}
              rx={4}
              fill={n.color}
              fillOpacity={0.85}
            />
            <text
              x={sinkX + NODE_WIDTH / 2}
              y={n.y + n.height / 2 - 7}
              textAnchor="middle"
              fill="#fff"
              fontSize={11}
              fontWeight="600"
              fontFamily="Inter, sans-serif"
            >
              {n.id.length > 14 ? n.id.slice(0, 13) + '…' : n.id}
            </text>
            <text
              x={sinkX + NODE_WIDTH / 2}
              y={n.y + n.height / 2 + 8}
              textAnchor="middle"
              fill="#4ade80"
              fontSize={10}
              fontFamily="Inter, sans-serif"
            >
              +{n.score.toFixed(1)} 流入
            </text>
            <text
              x={sinkX + NODE_WIDTH / 2}
              y={n.y + n.height / 2 + 21}
              textAnchor="middle"
              fill="rgba(255,255,255,0.55)"
              fontSize={9}
              fontFamily="Inter, sans-serif"
            >
              AUM ${n.mcap}B
            </text>
          </g>
        ))}

        {/* Column headers */}
        <text
          x={sourceX + NODE_WIDTH / 2} y={12}
          textAnchor="middle" fill="#f87171"
          fontSize={11} fontWeight="700"
          fontFamily="Inter, sans-serif"
        >
          流出板塊
        </text>
        <text
          x={sinkX + NODE_WIDTH / 2} y={12}
          textAnchor="middle" fill="#4ade80"
          fontSize={11} fontWeight="700"
          fontFamily="Inter, sans-serif"
        >
          流入板塊
        </text>
      </svg>

      {tooltip && (
        <div
          className="sankey-tooltip"
          style={{ position: 'fixed', left: tooltip.x, top: tooltip.y, pointerEvents: 'none' }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
