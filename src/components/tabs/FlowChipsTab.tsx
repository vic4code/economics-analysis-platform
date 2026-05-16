'use client';
import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react/lib/core';
import { echarts, getEChartsTheme } from '@/lib/utils/echarts';
import { changeColor } from '@/lib/utils/colors';
import { SankeyChart } from '@/components/charts';
import type { Quote, ChipRow, FlowMatrix } from '@/types';

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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="skeleton" style={{ height: 260 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="skeleton" style={{ height: 200 }} />
              <div className="skeleton" style={{ height: 200 }} />
            </div>
          </div>
        </div>
      </main>
    );
  }

  const th = getEChartsTheme();

  const n = flowData.sectors.length;

  // ECharts scatter replaces the Bubble chart
  const scatterOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: th.tooltipBg,
      borderColor: th.tooltipBorder,
      textStyle: { color: th.tooltipText },
      formatter: (params: unknown) => {
        const p = params as { data: [number, number, number, string, number] };
        const [x, y, , sec, score] = p.data;
        return `${sec}<br/>Momentum rank: ${x}<br/>Volume ratio: ${y.toFixed(2)}x<br/>Flow Score: ${score > 0 ? '+' : ''}${score}`;
      },
    },
    grid: { left: 8, right: 8, top: 24, bottom: 32, containLabel: true },
    xAxis: {
      type: 'value',
      name: 'Momentum Rank →',
      nameTextStyle: { color: th.textColor, fontSize: 10 },
      min: 0, max: n + 1,
      axisLabel: { color: th.textColor },
      splitLine: { lineStyle: { color: th.gridColor } },
      axisLine: {
        onZero: false,
        lineStyle: { color: 'rgba(139,148,158,0.25)', type: 'dashed' as const },
      },
    },
    yAxis: {
      type: 'value',
      name: 'Volume Ratio',
      nameTextStyle: { color: th.textColor, fontSize: 10 },
      axisLabel: { color: th.textColor },
      splitLine: { lineStyle: { color: th.gridColor } },
    },
    series: [{
      type: 'scatter',
      data: flowData.sectors.map((sec, i) => [
        n - i,
        flowData.volume_ratios[i],
        Math.max(10, Math.sqrt(flowData.mcaps[i] || 1) * 1.8),
        sec,
        flowData.flow_scores[i],
      ]),
      symbolSize: (val: unknown) => (val as number[])[2],
      itemStyle: {
        color: (params: unknown) => {
          const p = params as { data: number[] };
          return changeColor(p.data[4], 0.7);
        },
        borderColor: (params: unknown) => {
          const p = params as { data: number[] };
          return changeColor(p.data[4], 1);
        },
        borderWidth: 1.5,
      },
      label: {
        show: true,
        formatter: (params: unknown) => {
          const p = params as { data: [number, number, number, string] };
          return p.data[3].substring(0, 4);
        },
        fontSize: 9,
        color: '#e2e8f0',
        position: 'inside',
      },
      markLine: {
        silent: true,
        symbol: 'none',
        data: [
          { xAxis: (n + 1) / 2, lineStyle: { color: 'rgba(139,148,158,0.3)', type: 'dashed' as const } },
          { yAxis: 1, lineStyle: { color: 'rgba(139,148,158,0.3)', type: 'dashed' as const } },
        ],
      },
    }],
  };

  const flowSorted = flowData.sectors
    .map((s, i) => ({ s, v: flowData.flow_scores[i] }))
    .sort((a, b) => a.v - b.v);

  // Flow Score bar option (ECharts horizontal bar)
  const flowBarOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: th.tooltipBg,
      borderColor: th.tooltipBorder,
      textStyle: { color: th.tooltipText },
      formatter: (params: unknown) => {
        const p = params as Array<{ name: string; value: number }>;
        return `${p[0].name}: Flow Score: ${p[0].value > 0 ? '+' : ''}${p[0].value}`;
      },
    },
    grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: th.gridColor } },
      axisLabel: { color: th.textColor },
    },
    yAxis: {
      type: 'category',
      data: flowSorted.map(d => d.s),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: th.textColor, fontSize: 11 },
    },
    series: [{
      type: 'bar',
      data: flowSorted.map(d => ({
        value: d.v,
        itemStyle: {
          color: changeColor(d.v, 0.75),
        },
      })),
      barMaxWidth: 28,
    }],
  };

  // Chip chart data
  const chipRow = chipsData?.find(c => c.sector === chipSector) ?? chipsData?.[0] ?? null;
  const sectors = [...new Set((chipsData ?? []).map(c => c.sector))].sort();
  const isTW = chipMode === 'tw';
  const chipLabels = isTW ? ['外資', '投信', '自營商'] : ['Institutional', 'Smart Money', 'Retail'];
  const secEtf = quotes.find(q => q.sector === chipRow?.sector && q.symbol !== 'SPY');

  // Stacked bar option for daily net buy
  const stackedBarOption = chipRow ? {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: th.tooltipBg,
      borderColor: th.tooltipBorder,
      textStyle: { color: th.tooltipText },
    },
    legend: {
      data: chipLabels,
      textStyle: { color: th.textColor },
      top: 0,
    },
    grid: { left: 8, right: 8, top: 28, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: chipRow.dates,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: th.textColor, interval: Math.floor(chipRow.dates.length / 8), rotate: 30 },
    },
    yAxis: {
      type: 'value',
      name: '$M',
      nameTextStyle: { color: th.textColor },
      axisLabel: { color: th.textColor },
      splitLine: { lineStyle: { color: th.gridColor } },
    },
    series: [
      {
        name: chipLabels[0],
        type: 'bar',
        stack: 's',
        data: chipRow.institutional,
        itemStyle: { color: 'rgba(74,144,226,0.75)' },
      },
      {
        name: chipLabels[1],
        type: 'bar',
        stack: 's',
        data: chipRow.smart_money,
        itemStyle: { color: 'rgba(142,68,173,0.65)' },
      },
      {
        name: chipLabels[2],
        type: 'bar',
        stack: 's',
        data: chipRow.retail,
        itemStyle: { color: 'rgba(231,76,60,0.55)' },
      },
    ],
  } : null;

  // Cumulative line option
  const cumulativeLineOption = chipRow ? {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: th.tooltipBg,
      borderColor: th.tooltipBorder,
      textStyle: { color: th.tooltipText },
    },
    legend: {
      data: [
        isTW ? 'Cumulative Foreign Buy' : 'Cumulative Institutional Buy',
        ...(secEtf ? [`${secEtf.symbol} 現價`] : []),
      ],
      textStyle: { color: th.textColor },
      top: 0,
    },
    grid: { left: 8, right: 60, top: 28, bottom: 8, containLabel: true },
    xAxis: {
      type: 'category',
      data: chipRow.dates,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: th.textColor, interval: Math.floor(chipRow.dates.length / 8), rotate: 30 },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Cumul. $M',
        nameTextStyle: { color: '#4a90e2' },
        axisLabel: { color: '#4a90e2' },
        splitLine: { lineStyle: { color: th.gridColor } },
        position: 'left',
      },
      ...(secEtf ? [{
        type: 'value',
        name: 'ETF Price',
        nameTextStyle: { color: '#f7931a' },
        axisLabel: { color: '#f7931a' },
        splitLine: { show: false },
        position: 'right',
      }] : []),
    ],
    series: [
      {
        name: isTW ? 'Cumulative Foreign Buy' : 'Cumulative Institutional Buy',
        type: 'line',
        data: chipRow.cumulative,
        lineStyle: { color: '#4a90e2', width: 2 },
        itemStyle: { color: '#4a90e2' },
        areaStyle: { color: 'rgba(74,144,226,0.12)' },
        symbol: 'none',
        smooth: true,
        yAxisIndex: 0,
      },
      ...(secEtf ? [{
        name: `${secEtf.symbol} 現價`,
        type: 'line',
        data: chipRow.dates.map(() => secEtf.price),
        lineStyle: { color: '#f7931a', width: 1.5, type: 'dashed' as const },
        itemStyle: { color: '#f7931a' },
        symbol: 'none',
        yAxisIndex: 1,
      }] : []),
    ],
  } : null;

  return (
    <main className="tab-panel active">
      {/* Sankey: Capital Rotation Flow ─────────────────────────── */}
      <section className="panel">
        <div className="panel-header">
          <h2>Sector Rotation Sankey</h2>
          <span className="panel-hint">
            Left = outflow sectors · Right = inflow sectors · Node height ∝ AUM × momentum
          </span>
        </div>
        <SankeyChart data={flowData} />
      </section>

      {/* Flow Direction ─────────────────────────────────────────── */}
      <section className="panel">
        <div className="panel-header">
          <h2>Capital Flow Analysis</h2>
          <span className="panel-hint">
            Proxy: momentum × volume anomaly — estimated sector capital flows
          </span>
        </div>
        <div className="flow-top-grid">
          <div>
            <div className="chart-sublabel">Rotation Quadrant</div>
            <div style={{ height: '340px' }}>
              <ReactECharts
                echarts={echarts}
                option={scatterOption}
                style={{ height: '100%' }}
                notMerge
              />
            </div>
            <div className="quadrant-legend">
              <span className="ql ql-tr">↗ Strong Inflow</span>
              <span className="ql ql-tl">↖ High-vol Washout</span>
              <span className="ql ql-br">↘ Consolidation</span>
              <span className="ql ql-bl">↙ Weak Outflow</span>
            </div>
          </div>
          <div>
            <div className="chart-sublabel">Sector Flow Score</div>
            <div className="chart-wrap" style={{ height: '340px' }}>
              <ReactECharts
                echarts={echarts}
                option={flowBarOption}
                style={{ height: '100%' }}
                notMerge
              />
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Chips ────────────────────────────────────── */}
      <section className="panel">
        <div className="panel-header">
          <h2>Institutional Chips</h2>
          <span className="panel-hint">
            Simulated daily net institutional buy, unit: $M
          </span>
        </div>
        <div className="chip-controls">
          <label className="field-label">Sector:</label>
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

        {chipRow && stackedBarOption && cumulativeLineOption && (
          <div className="chip-charts-grid">
            <div>
              <div className="chart-sublabel">Daily Net Buy ($M)</div>
              <div className="chart-wrap" style={{ height: '260px' }}>
                <ReactECharts
                  echarts={echarts}
                  option={stackedBarOption}
                  style={{ height: '100%' }}
                  notMerge
                />
              </div>
            </div>
            <div>
              <div className="chart-sublabel">Cumulative Institutional vs ETF Price</div>
              <div className="chart-wrap" style={{ height: '260px' }}>
                <ReactECharts
                  echarts={echarts}
                  option={cumulativeLineOption}
                  style={{ height: '100%' }}
                  notMerge
                />
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
