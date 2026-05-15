'use client';
import { useState, useEffect } from 'react';
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
import { SankeyChart } from '@/components/charts';
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

// ── Main FlowChipsTab ────────────────────────────────────────────
export default function FlowChipsTab({ quotes, period }: Props) {
  const [flowData, setFlowData]     = useState<FlowMatrix | null>(null);
  const [flowPeriod, setFlowPeriod] = useState<string>('');
  const [chipsData, setChipsData]   = useState<ChipRow[] | null>(null);
  const [chipsPeriod, setChipsPeriod] = useState('1m');
  const [chipSector, setChipSector]   = useState('Technology');
  const [chipMode, setChipMode]       = useState<'us' | 'tw'>('us');
  const [loading, setLoading]         = useState(false);

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
    borderColor:     changeColor(flowData.flow_scores[i], 1),
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
      ctx.beginPath(); ctx.moveTo(mx, top);   ctx.lineTo(mx, bottom); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(left, my);  ctx.lineTo(right, my);  ctx.stroke();
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
        data:            flowSorted.map(d => d.v),
        backgroundColor: flowSorted.map(d => changeColor(d.v, 0.75)),
        borderColor:     flowSorted.map(d => changeColor(d.v, 1)),
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
      y: { ticks: { color: '#cdd9e5', font: { size: 11 } }, grid: { color: '#21262d' } },
    },
    animation: { duration: 300 },
  };

  // Chip chart data
  const chipRow = chipsData?.find(c => c.sector === chipSector) ?? chipsData?.[0] ?? null;
  const sectors = [...new Set((chipsData ?? []).map(c => c.sector))].sort();
  const isTW = chipMode === 'tw';
  const chipLabels = isTW ? ['外資', '投信', '自營商'] : ['機構法人', '聰明錢', '散戶'];
  const secEtf = quotes.find(q => q.sector === chipRow?.sector && q.symbol !== 'SPY');

  return (
    <main className="tab-panel active">
      {/* Sankey: Capital Rotation Flow ─────────────────────────── */}
      <section className="panel">
        <div className="panel-header">
          <h2>板塊資金輪動 Sankey</h2>
          <span className="panel-hint">
            左側：資金流出板塊 → 右側：資金流入板塊　節點高度 = AUM × 動能強度
          </span>
        </div>
        <SankeyChart data={flowData} />
      </section>

      {/* Flow Direction ─────────────────────────────────────────── */}
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
                          const score = flowData.flow_scores[flowData.sectors.indexOf(sec)];
                          return `${sec} | 動能排名:${d.x} | 成交量比:${d.y.toFixed(2)}x | 流向:${score > 0 ? '+' : ''}${score}`;
                        },
                      },
                    },
                  },
                  scales: {
                    x: {
                      title: { display: true, text: '動能排名 →（右=資金流入）', color: '#8b949e' },
                      ticks: { color: '#8b949e' },
                      grid: { color: '#21262d' },
                      min: 0, max: n + 1,
                    },
                    y: {
                      title: { display: true, text: '成交量比率（vs 30日均）', color: '#8b949e' },
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

      {/* Institutional Chips ────────────────────────────────────── */}
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
              <option key={s} value={s}>{s}</option>
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
              [['us', '🇺🇸 美式'], ['tw', '🇹🇼 台式']] as const
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
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { labels: { color: '#8b949e', boxWidth: 12 } },
                    },
                    scales: {
                      x: { ticks: { color: '#8b949e', maxTicksLimit: 8, maxRotation: 30 }, grid: { color: '#21262d' }, stacked: true },
                      y: { ticks: { color: '#8b949e' }, grid: { color: '#21262d' }, stacked: true, title: { display: true, text: '$M', color: '#8b949e' } },
                    },
                    animation: { duration: 300 },
                  } as Record<string, unknown>}
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
                      ...(secEtf ? [{
                        label: `${secEtf.symbol} 現價`,
                        data: chipRow.dates.map(() => secEtf.price),
                        borderColor: '#f7931a',
                        borderDash: [4, 3],
                        pointRadius: 0,
                        yAxisID: 'y2',
                        backgroundColor: 'transparent',
                        tension: 0.3,
                      }] : []),
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { labels: { color: '#8b949e', boxWidth: 12 } },
                    },
                    scales: {
                      x: { ticks: { color: '#8b949e', maxTicksLimit: 8, maxRotation: 30 }, grid: { color: '#21262d' } },
                      y: { ticks: { color: '#4a90e2' }, grid: { color: '#21262d' }, position: 'left', title: { display: true, text: '累積 $M', color: '#4a90e2' } },
                      y2: { ticks: { color: '#f7931a' }, grid: { display: false }, position: 'right', title: { display: true, text: 'ETF 價格', color: '#f7931a' } },
                    },
                    animation: { duration: 300 },
                  } as Record<string, unknown>}
                />
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
