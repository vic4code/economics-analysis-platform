'use client';
import { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react/lib/core';
import { echarts, getEChartsTheme } from '@/lib/utils/echarts';
import { changeTextColor, fmtPct } from '@/lib/utils/colors';
import type { MacroNode, Period } from '@/types';

function findNode(tree: MacroNode, id: string): MacroNode | null {
  if (tree.id === id) return tree;
  for (const c of tree.children ?? []) {
    const found = findNode(c, id);
    if (found) return found;
  }
  return null;
}

interface Props {
  macroData: MacroNode | null;
  period: Period;
}

export default function MacroTab({ macroData, period }: Props) {
  const [macroPath, setMacroPath] = useState<string[]>(['global']);

  // Reset path when period changes
  useEffect(() => { setMacroPath(['global']); }, [period]);

  if (!macroData) return (
    <div className="tab-panel active">
      <div className="panel">
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
          {[80, 110, 95].map((w, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="skeleton" style={{ width: w * 0.7, height: 11 }} />
              <div className="skeleton" style={{ width: w, height: 20 }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="skeleton" style={{ height: 200 }} />
          <div className="skeleton" style={{ height: 200 }} />
        </div>
        <div className="macro-cards">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 88 }} />
          ))}
        </div>
      </div>
    </div>
  );

  const currentId = macroPath[macroPath.length - 1];
  const current = findNode(macroData, currentId) ?? macroData;
  const totalAum = current.children?.length
    ? current.children.reduce((s, c) => s + c.aum, 0)
    : current.aum;
  const children = (current.children?.length ? current.children : [current])
    .slice().sort((a, b) => b.aum - a.aum);

  function drillDown(nodeId: string) {
    setMacroPath(prev => [...prev, nodeId]);
  }
  function breadcrumbClick(nodeId: string) {
    const idx = macroPath.indexOf(nodeId);
    if (idx >= 0) setMacroPath(macroPath.slice(0, idx + 1));
  }

  const theme = getEChartsTheme();

  // Pie (donut) option
  const pieOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorder,
      textStyle: { color: theme.tooltipText },
      formatter: (params: unknown) => {
        const p = params as { name: string; value: number };
        return `${p.name}: ${p.value >= 1 ? p.value.toFixed(1) + 'T' : (p.value * 1000).toFixed(0) + 'B'} USD`;
      },
    },
    series: [{
      type: 'pie',
      radius: ['55%', '78%'],
      center: ['50%', '50%'],
      data: children.map(c => ({
        name: c.name,
        value: c.aum,
        itemStyle: { color: c.color + 'cc', borderColor: c.color, borderWidth: 2 },
      })),
      label: { show: false },
      emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
    }],
    graphic: [{
      type: 'text',
      left: 'center',
      top: 'middle',
      style: {
        text: `${totalAum.toFixed(1)}T\nGlobal AUM`,
        textAlign: 'center',
        fill: theme.textColor,
        fontSize: 14,
        fontWeight: 'bold',
        lineHeight: 22,
      },
    }],
  };

  // Bar chart (sorted by change)
  const sorted = [...children].sort((a, b) => b.change - a.change);
  const barOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: theme.tooltipBg,
      borderColor: theme.tooltipBorder,
      textStyle: { color: theme.tooltipText },
      formatter: (params: unknown) => {
        const p = params as Array<{ name: string; value: number }>;
        return `${p[0].name}: ${p[0].value >= 0 ? '+' : ''}${p[0].value.toFixed(2)}%`;
      },
    },
    grid: { left: 8, right: 16, top: 8, bottom: 8, containLabel: true },
    xAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: theme.gridColor } },
      axisLabel: { color: theme.textColor, formatter: (v: number) => `${v.toFixed(1)}%` },
    },
    yAxis: {
      type: 'category',
      data: sorted.map(c => c.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: theme.textColor, fontSize: 11 },
    },
    series: [{
      type: 'bar',
      data: sorted.map(c => ({
        value: c.change,
        itemStyle: {
          color: c.change >= 0 ? 'rgba(34,197,94,0.75)' : 'rgba(239,68,68,0.75)',
          borderRadius: [0, 4, 4, 0],
        },
      })),
      barMaxWidth: 28,
    }],
  };

  const etfs = current.etf_quotes ?? [];

  return (
    <main className="tab-panel active">
      <section className="panel">
        <div className="macro-breadcrumb">
          {macroPath.map((id, i) => {
            const node = findNode(macroData, id) ?? { name: id };
            const isActive = i === macroPath.length - 1;
            return (
              <span key={id}>
                {i > 0 && <span className="bc-sep">›</span>}
                <span
                  className={`bc-item${isActive ? ' bc-active' : ''} bc-home`}
                  onClick={() => breadcrumbClick(id)}
                >{node.name}</span>
              </span>
            );
          })}
        </div>

        <div className="macro-summary">
          <div className="macro-sum-item">
            <span className="macro-sum-label">Total AUM</span>
            <span className="macro-sum-val">{totalAum.toFixed(1)} T USD</span>
          </div>
          <div className="macro-sum-item">
            <span className="macro-sum-label">Period Return</span>
            <span className="macro-sum-val" style={{color: changeTextColor(current.change)}}>{fmtPct(current.change)}</span>
          </div>
          <div className="macro-sum-item">
            <span className="macro-sum-label">Sub-categories</span>
            <span className="macro-sum-val">{current.children?.length ?? 0}</span>
          </div>
        </div>

        <div className="macro-charts">
          <div className="macro-donut-wrap">
            <ReactECharts
              echarts={echarts}
              option={pieOption}
              style={{ height: '260px', width: '260px' }}
              notMerge
            />
          </div>
          <div className="macro-bar-wrap">
            <div className="panel-header" style={{marginBottom:'0.5rem'}}>
              <h2>{current.name} — Sub-category Returns</h2>
              <span className="panel-hint">Sorted by return</span>
            </div>
            <div style={{ height: '300px' }}>
              <ReactECharts
                echarts={echarts}
                option={barOption}
                style={{ height: '100%' }}
                notMerge
              />
            </div>
          </div>
        </div>

        <div className="macro-cards">
          {children.map(c => {
            const hasChildren = (c.children?.length ?? 0) > 0;
            const pct = c.aum / totalAum * 100;
            return (
              <div
                key={c.id}
                className={`macro-card${hasChildren ? ' macro-card-drillable' : ''}`}
                onClick={() => hasChildren && drillDown(c.id)}
                title={hasChildren ? 'Click to drill down' : ''}
              >
                <div className="macro-card-color" style={{background: c.color}} />
                <div className="macro-card-body">
                  <div className="macro-card-name">{c.name}</div>
                  <div className="macro-card-aum">{c.aum >= 1 ? c.aum.toFixed(1)+'T' : (c.aum*1000).toFixed(0)+'B'}</div>
                  <div className="macro-card-pct">{pct.toFixed(1)}% of total</div>
                  <div className="macro-card-change" style={{color: changeTextColor(c.change)}}>{fmtPct(c.change)}</div>
                  {hasChildren && <div className="macro-card-arrow">›</div>}
                </div>
                <div className="macro-card-bar">
                  <div style={{width:`${Math.min(100,pct*3)}%`, background: c.change >= 0 ? 'rgba(34,197,94,0.8)' : 'rgba(239,68,68,0.8)', height:'100%', borderRadius:'2px'}} />
                </div>
              </div>
            );
          })}
        </div>

        {etfs.length > 0 && (
          <div>
            <div className="panel-header" style={{marginTop:'1.5rem'}}>
              <h2>{current.name} — Representative ETFs</h2>
            </div>
            <div className="table-wrap">
              <table className="etf-table">
                <thead><tr><th>Ticker</th><th>Name</th><th>Price</th><th>Change %</th></tr></thead>
                <tbody>
                  {etfs.map(e => (
                    <tr key={e.symbol}>
                      <td><strong>{e.symbol}</strong></td>
                      <td className="name-cell">{e.name}</td>
                      <td className="mono">${e.price.toFixed(2)}</td>
                      <td className="mono" style={{color: changeTextColor(e.change)}}>{fmtPct(e.change)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
