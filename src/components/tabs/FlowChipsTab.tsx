'use client';
import { useState, useEffect, useRef } from 'react';
import { Bubble, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  BubbleController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { SECTOR_COLORS, changeColor } from '@/lib/utils/colors';
import type { Quote, ChipRow, FlowMatrix } from '@/types';

ChartJS.register(
  ArcElement,
  BarElement,
  BubbleController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  Filler,
);

interface Props {
  quotes: Quote[];
  period: string;
}

// ── Network Correlation Canvas ──────────────────────────────────
interface NetworkNode {
  id: string;
  i: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  label: string;
}

interface NetworkEdge {
  i: number;
  j: number;
  c: number;
}

function NetworkCorrCanvas({ data }: { data: FlowMatrix }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.parentElement?.clientWidth || 700;
    canvas.height = canvas.parentElement?.clientHeight || 420;
    const W = canvas.width;
    const H = canvas.height;
    const ctx = canvas.getContext('2d')!;
    const n = data.sectors.length;

    runningRef.current = false;
    const timerId = setTimeout(() => {
      runningRef.current = true;
      const nodes: NetworkNode[] = data.sectors.map((sec, i) => {
        const angle = (2 * Math.PI * i) / n;
        return {
          id: sec,
          i,
          x: W / 2 + W * 0.35 * Math.cos(angle),
          y: H / 2 + H * 0.35 * Math.sin(angle),
          vx: 0,
          vy: 0,
          r: Math.max(18, Math.sqrt(data.mcaps[i] || 1) * 2.2),
          color: SECTOR_COLORS[sec] || '#58a6ff',
          label: sec,
        };
      });

      const edges: NetworkEdge[] = [];
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const c = data.rotation_matrix[i][j];
          if (Math.abs(c) > 0.25) edges.push({ i, j, c });
        }
      }

      const K_REPEL = 8000;
      const K_ATTRACT = 0.04;
      const DAMPING = 0.82;
      const DT = 0.9;
      let frame = 0;

      function tick() {
        if (!runningRef.current) return;
        frame++;
        for (let a = 0; a < n; a++) {
          let fx = (W / 2 - nodes[a].x) * 0.004;
          let fy = (H / 2 - nodes[a].y) * 0.004;
          for (let b = 0; b < n; b++) {
            if (a === b) continue;
            const dx = nodes[a].x - nodes[b].x;
            const dy = nodes[a].y - nodes[b].y;
            const dist2 = dx * dx + dy * dy + 1;
            const f = K_REPEL / dist2;
            fx += (f * dx) / Math.sqrt(dist2);
            fy += (f * dy) / Math.sqrt(dist2);
          }
          edges.forEach(e => {
            if (e.i !== a && e.j !== a) return;
            const b = e.i === a ? e.j : e.i;
            const dx = nodes[b].x - nodes[a].x;
            const dy = nodes[b].y - nodes[a].y;
            const str = Math.abs(e.c) * K_ATTRACT;
            fx += dx * str;
            fy += dy * str;
          });
          nodes[a].vx = (nodes[a].vx + fx * DT) * DAMPING;
          nodes[a].vy = (nodes[a].vy + fy * DT) * DAMPING;
        }
        nodes.forEach(nd => {
          nd.x = Math.max(nd.r + 2, Math.min(W - nd.r - 2, nd.x + nd.vx));
          nd.y = Math.max(nd.r + 2, Math.min(H - nd.r - 2, nd.y + nd.vy));
        });
        ctx.clearRect(0, 0, W, H);
        edges.forEach(e => {
          ctx.save();
          ctx.globalAlpha = Math.min(0.8, Math.abs(e.c));
          ctx.strokeStyle = e.c > 0 ? '#4a90e2' : '#e67e22';
          ctx.lineWidth = Math.abs(e.c) * 3;
          ctx.beginPath();
          ctx.moveTo(nodes[e.i].x, nodes[e.i].y);
          ctx.lineTo(nodes[e.j].x, nodes[e.j].y);
          ctx.stroke();
          ctx.restore();
        });
        nodes.forEach(nd => {
          ctx.beginPath();
          ctx.arc(nd.x, nd.y, nd.r, 0, Math.PI * 2);
          ctx.fillStyle = nd.color + 'cc';
          ctx.fill();
          ctx.strokeStyle = nd.color;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${Math.max(9, Math.min(12, nd.r * 0.55))}px Inter,sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            nd.label.length > 8 ? nd.label.slice(0, 7) + '…' : nd.label,
            nd.x,
            nd.y,
          );
        });
        if (frame < 180) requestAnimationFrame(tick);
        else runningRef.current = false;
      }
      requestAnimationFrame(tick);
    }, 10);

    return () => {
      runningRef.current = false;
      clearTimeout(timerId);
    };
  }, [data]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
}

// ── Rotation Flow Canvas ─────────────────────────────────────────
function RotationFlowCanvas({ data }: { data: FlowMatrix }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.parentElement?.clientWidth || 700;
    canvas.height = canvas.parentElement?.clientHeight || 420;
    const W = canvas.width;
    const H = canvas.height;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    const n = data.sectors.length;
    const R = Math.min(W, H) * 0.38;

    const nodes = data.sectors.map((sec, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      return {
        id: sec,
        i,
        x: W / 2 + R * Math.cos(angle),
        y: H / 2 + R * Math.sin(angle),
        score: data.flow_scores[i],
        mcap: data.mcaps[i] || 1,
        color: SECTOR_COLORS[sec] || '#58a6ff',
      };
    });

    const sorted = [...nodes].sort((a, b) => b.score - a.score);
    const inflow = sorted.slice(0, 3);
    const outflow = sorted.slice(-3);

    function drawArrow(
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      color: string,
      alpha: number,
      width: number,
    ) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) return;
      const nx = dx / len;
      const ny = dy / len;
      const nr = 22;
      const sx = x1 + nx * nr;
      const sy = y1 + ny * nr;
      const ex = x2 - nx * nr;
      const ey = y2 - ny * nr;
      const cx2 = (sx + ex) / 2 - ny * len * 0.18;
      const cy2 = (sy + ey) / 2 + nx * len * 0.18;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(cx2, cy2, ex, ey);
      ctx.stroke();
      const tx = ex - nx * 8 + ny * 5;
      const ty = ey - ny * 8 - nx * 5;
      const tx2 = ex - nx * 8 - ny * 5;
      const ty2 = ey - ny * 8 + nx * 5;
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(tx, ty);
      ctx.lineTo(tx2, ty2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }

    outflow.forEach(out => {
      inflow.forEach(inn => {
        if (out.id === inn.id) return;
        const str = Math.min(1, (Math.abs(out.score) + inn.score) / 20);
        drawArrow(
          out.x,
          out.y,
          inn.x,
          inn.y,
          '#f7931a',
          0.25 + str * 0.45,
          1 + str * 2.5,
        );
      });
    });

    nodes.forEach(nd => {
      const r = Math.max(18, Math.sqrt(nd.mcap) * 1.8);
      ctx.beginPath();
      ctx.arc(nd.x, nd.y, r, 0, Math.PI * 2);
      ctx.fillStyle = nd.color + 'cc';
      ctx.fill();
      ctx.strokeStyle = inflow.some(n => n.id === nd.id)
        ? '#4ade80'
        : outflow.some(n => n.id === nd.id)
          ? '#f87171'
          : nd.color;
      ctx.lineWidth =
        inflow.some(n => n.id === nd.id) || outflow.some(n => n.id === nd.id)
          ? 2.5
          : 1;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      const fs = Math.max(9, Math.min(11, r * 0.55));
      ctx.font = `bold ${fs}px Inter,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        nd.id.length > 8 ? nd.id.slice(0, 7) + '…' : nd.id,
        nd.x,
        nd.y - 3,
      );
      ctx.font = `${Math.max(8, fs - 1)}px Inter,sans-serif`;
      ctx.fillStyle = nd.score > 0 ? '#4ade80' : '#f87171';
      ctx.fillText((nd.score > 0 ? '+' : '') + nd.score, nd.x, nd.y + 8);
    });

    ctx.globalAlpha = 1;
    ctx.font = '11px Inter,sans-serif';
    ctx.fillStyle = '#4ade80';
    ctx.textAlign = 'left';
    ctx.fillText('→ 資金流入（綠框）', 12, H - 28);
    ctx.fillStyle = '#f87171';
    ctx.fillText('← 資金流出（紅框）', 12, H - 12);
  }, [data]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
}

// ── Main FlowChipsTab ────────────────────────────────────────────
export default function FlowChipsTab({ quotes, period }: Props) {
  const [flowData, setFlowData] = useState<FlowMatrix | null>(null);
  const [flowPeriod, setFlowPeriod] = useState<string>('');
  const [chipsData, setChipsData] = useState<ChipRow[] | null>(null);
  const [chipsPeriod, setChipsPeriod] = useState('1m');
  const [chipSector, setChipSector] = useState('Technology');
  const [chipMode, setChipMode] = useState<'us' | 'tw'>('us');
  const [networkTab, setNetworkTab] = useState<'corr' | 'flow'>('corr');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (flowPeriod === period && flowData) return;
    setLoading(true);
    fetch(`/api/flow-matrix?period=${period}`)
      .then(r => r.json())
      .then((d: FlowMatrix) => {
        setFlowData(d);
        setFlowPeriod(period);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch(`/api/chips?period=${chipsPeriod}`)
      .then(r => r.json())
      .then((d: ChipRow[]) => setChipsData(d));
  }, [chipsPeriod]);

  if (loading || !flowData) {
    return (
      <main className="tab-panel active">
        <div className="panel">
          <p style={{ color: '#64748b' }}>載入中…</p>
        </div>
      </main>
    );
  }

  const n = flowData.sectors.length;

  const bubbleDatasets = flowData.sectors.map((sec, i) => ({
    label: sec,
    data: [
      {
        x: n - i,
        y: flowData.volume_ratios[i],
        r: Math.max(6, Math.sqrt(flowData.mcaps[i] || 1) * 1.8),
      },
    ],
    backgroundColor: changeColor(flowData.flow_scores[i], 0.7),
    borderColor: changeColor(flowData.flow_scores[i], 1),
    borderWidth: 1.5,
  }));

  const quadrantPlugin = {
    id: 'quadrantLines',
    afterDraw(chart: ChartJS) {
      const c = chart as unknown as {
        ctx: CanvasRenderingContext2D;
        chartArea: { left: number; right: number; top: number; bottom: number };
        scales: {
          x: { getPixelForValue: (v: number) => number };
          y: { getPixelForValue: (v: number) => number };
        };
      };
      const { ctx, chartArea: { left, right, top, bottom }, scales: { x, y } } = c;
      const mx = x.getPixelForValue((n + 1) / 2);
      const my = y.getPixelForValue(1);
      ctx.save();
      ctx.strokeStyle = 'rgba(139,148,158,0.25)';
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mx, top);
      ctx.lineTo(mx, bottom);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(left, my);
      ctx.lineTo(right, my);
      ctx.stroke();
      ctx.restore();
    },
  };

  const flowSorted = flowData.sectors
    .map((s, i) => ({ s, v: flowData.flow_scores[i] }))
    .sort((a, b) => a.v - b.v);

  const scoreBarData = {
    labels: flowSorted.map(d => d.s),
    datasets: [
      {
        data: flowSorted.map(d => d.v),
        backgroundColor: flowSorted.map(d => changeColor(d.v, 0.75)),
        borderColor: flowSorted.map(d => changeColor(d.v, 1)),
        borderWidth: 1,
      },
    ],
  };

  const barOpts: Record<string, unknown> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (c: { raw: number }) =>
            ` Flow Score: ${c.raw > 0 ? '+' : ''}${c.raw}`,
        },
      },
    },
    scales: {
      x: { ticks: { color: '#8b949e' }, grid: { color: '#21262d' } },
      y: {
        ticks: { color: '#cdd9e5', font: { size: 11 } },
        grid: { color: '#21262d' },
      },
    },
    animation: { duration: 300 },
  };

  // Chip charts
  const chipRow =
    chipsData?.find(c => c.sector === chipSector) ?? chipsData?.[0] ?? null;
  const sectors = [
    ...new Set((chipsData ?? []).map(c => c.sector)),
  ].sort();
  const isTW = chipMode === 'tw';
  const chipLabels = isTW
    ? ['外資', '投信', '自營商']
    : ['機構法人', '聰明錢', '散戶'];
  const secEtf = quotes.find(
    q => q.sector === chipRow?.sector && q.symbol !== 'SPY',
  );

  return (
    <main className="tab-panel active">
      {/* Flow Direction */}
      <section className="panel">
        <div className="panel-header">
          <h2>資金流向分析</h2>
          <span className="panel-hint">
            代理指標：動能 × 成交量異常 推估各板塊資金流向
          </span>
        </div>
        <div className="flow-top-grid">
          <div>
            <div className="chart-sublabel">板塊輪動象限圖</div>
            <div className="chart-wrap" style={{ height: '340px' }}>
              <Bubble
                data={{ datasets: bubbleDatasets }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx: import('chart.js').TooltipItem<'bubble'>) => {
                          const d = ctx.raw as { x: number; y: number; r: number };
                          const sec = ctx.dataset.label ?? '';
                          const score =
                            flowData.flow_scores[
                              flowData.sectors.indexOf(sec)
                            ];
                          return `${sec} | 動能排名:${d.x} | 成交量比:${d.y.toFixed(2)}x | 流向:${score > 0 ? '+' : ''}${score}`;
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      title: {
                        display: true,
                        text: '動能排名 →（右=資金流入）',
                        color: '#8b949e',
                      },
                      ticks: { color: '#8b949e' },
                      grid: { color: '#21262d' },
                      min: 0,
                      max: n + 1,
                    },
                    y: {
                      title: {
                        display: true,
                        text: '成交量比率（vs 30日均）',
                        color: '#8b949e',
                      },
                      ticks: { color: '#8b949e' },
                      grid: { color: '#21262d' },
                    },
                  },
                  animation: { duration: 400 },
                }}
                plugins={[quadrantPlugin as unknown as import('chart.js').Plugin]}
              />
            </div>
            <div className="quadrant-legend">
              <span className="ql ql-tr">↗ 強勢流入</span>
              <span className="ql ql-tl">↖ 高量洗盤</span>
              <span className="ql ql-br">↘ 整理蓄勢</span>
              <span className="ql ql-bl">↙ 弱勢流出</span>
            </div>
          </div>
          <div>
            <div className="chart-sublabel">板塊資金流向強度</div>
            <div className="chart-wrap" style={{ height: '340px' }}>
              <Bar data={scoreBarData} options={barOpts} />
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Chips */}
      <section className="panel">
        <div className="panel-header">
          <h2>法人籌碼</h2>
          <span className="panel-hint">
            模擬三大法人每日淨買超，單位：百萬美元
          </span>
        </div>
        <div className="chip-controls">
          <label className="field-label">板塊：</label>
          <select
            className="chip-select"
            value={chipSector}
            onChange={e => setChipSector(e.target.value)}
          >
            {sectors.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="chip-period-row">
            {['1m', '3m', '6m'].map(p => (
              <button
                key={p}
                className={`cp-btn${chipsPeriod === p ? ' active' : ''}`}
                onClick={() => setChipsPeriod(p)}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="chip-mode-row">
            {(
              [
                ['us', '🇺🇸 美式'],
                ['tw', '🇹🇼 台式'],
              ] as const
            ).map(([m, l]) => (
              <button
                key={m}
                className={`cm-btn${chipMode === m ? ' active' : ''}`}
                onClick={() => setChipMode(m)}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {chipRow && (
          <div className="chip-charts-grid">
            <div>
              <div className="chart-sublabel">每日淨買超（$M）</div>
              <div className="chart-wrap" style={{ height: '260px' }}>
                <Bar
                  data={{
                    labels: chipRow.dates,
                    datasets: [
                      {
                        label: chipLabels[0],
                        data: chipRow.institutional,
                        backgroundColor: 'rgba(74,144,226,0.75)',
                        stack: 's',
                      },
                      {
                        label: chipLabels[1],
                        data: chipRow.smart_money,
                        backgroundColor: 'rgba(142,68,173,0.65)',
                        stack: 's',
                      },
                      {
                        label: chipLabels[2],
                        data: chipRow.retail,
                        backgroundColor: 'rgba(231,76,60,0.55)',
                        stack: 's',
                      },
                    ],
                  }}
                  options={
                    {
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          labels: { color: '#8b949e', boxWidth: 12 },
                        },
                      },
                      scales: {
                        x: {
                          ticks: {
                            color: '#8b949e',
                            maxTicksLimit: 8,
                            maxRotation: 30,
                          },
                          grid: { color: '#21262d' },
                          stacked: true,
                        },
                        y: {
                          ticks: { color: '#8b949e' },
                          grid: { color: '#21262d' },
                          stacked: true,
                          title: {
                            display: true,
                            text: '$M',
                            color: '#8b949e',
                          },
                        },
                      },
                      animation: { duration: 300 },
                    } as Record<string, unknown>
                  }
                />
              </div>
            </div>
            <div>
              <div className="chart-sublabel">累積機構籌碼 vs ETF 價格</div>
              <div className="chart-wrap" style={{ height: '260px' }}>
                <Line
                  data={{
                    labels: chipRow.dates,
                    datasets: [
                      {
                        label: isTW ? '累積外資買超' : '累積機構買超',
                        data: chipRow.cumulative,
                        borderColor: '#4a90e2',
                        backgroundColor: 'rgba(74,144,226,0.12)',
                        fill: true,
                        tension: 0.3,
                        yAxisID: 'y',
                        pointRadius: 0,
                      },
                      ...(secEtf
                        ? [
                            {
                              label: `${secEtf.symbol} 現價`,
                              data: chipRow.dates.map(() => secEtf.price),
                              borderColor: '#f7931a',
                              borderDash: [4, 3],
                              pointRadius: 0,
                              yAxisID: 'y2',
                              backgroundColor: 'transparent',
                              tension: 0.3,
                            },
                          ]
                        : []),
                    ],
                  }}
                  options={
                    {
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          labels: { color: '#8b949e', boxWidth: 12 },
                        },
                      },
                      scales: {
                        x: {
                          ticks: {
                            color: '#8b949e',
                            maxTicksLimit: 8,
                            maxRotation: 30,
                          },
                          grid: { color: '#21262d' },
                        },
                        y: {
                          ticks: { color: '#4a90e2' },
                          grid: { color: '#21262d' },
                          position: 'left',
                          title: {
                            display: true,
                            text: '累積 $M',
                            color: '#4a90e2',
                          },
                        },
                        y2: {
                          ticks: { color: '#f7931a' },
                          grid: { display: false },
                          position: 'right',
                          title: {
                            display: true,
                            text: 'ETF 價格',
                            color: '#f7931a',
                          },
                        },
                      },
                      animation: { duration: 300 },
                    } as Record<string, unknown>
                  }
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Network Graph */}
      <section className="panel">
        <div className="panel-header">
          <h2>板塊關係圖</h2>
        </div>
        <div className="network-subtabs">
          {(
            [
              ['corr', '🕸 相關性網絡'],
              ['flow', '↗ 資金輪動流向'],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              className={`nsb${networkTab === k ? ' active' : ''}`}
              onClick={() => setNetworkTab(k)}
            >
              {l}
            </button>
          ))}
        </div>
        {networkTab === 'corr' && (
          <div>
            <div className="panel-hint" style={{ marginBottom: '0.75rem' }}>
              基於近1年月報酬相關性 — 藍線=正相關，橘線=負相關，節點大小=AUM
            </div>
            <div className="network-wrap">
              <NetworkCorrCanvas data={flowData} />
            </div>
          </div>
        )}
        {networkTab === 'flow' && (
          <div>
            <div className="panel-hint" style={{ marginBottom: '0.75rem' }}>
              箭頭方向 = 資金估計流出（紅）→ 流入（綠）板塊，根據流向強度差異繪製
            </div>
            <div className="network-wrap">
              <RotationFlowCanvas data={flowData} />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
