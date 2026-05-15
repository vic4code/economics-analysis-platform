'use client';
import { useState, useEffect } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale,
  Tooltip, Legend, type TooltipItem,
} from 'chart.js';
import { changeColor, changeTextColor, fmtPct } from '@/lib/utils/colors';
import { getChartTheme } from '@/lib/utils/chartTheme';
import type { MacroNode, Period } from '@/types';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

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

  if (!macroData) return <div className="panel"><p style={{color:'var(--text-muted)'}}>Loading…</p></div>;

  const ct = getChartTheme();
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

  // Donut chart data
  const donutData = {
    labels: children.map(c => c.name),
    datasets: [{
      data: children.map(c => c.aum),
      backgroundColor: children.map(c => c.color + 'cc'),
      borderColor: children.map(c => c.color),
      borderWidth: 2,
    }],
  };
  const donutOptions = {
    responsive: true, maintainAspectRatio: true, cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: TooltipItem<'doughnut'>) =>
            ` ${ctx.label}: ${(ctx.raw as number) >= 1 ? (ctx.raw as number).toFixed(1)+'T' : ((ctx.raw as number)*1000).toFixed(0)+'B'} USD`,
        },
      },
    },
  };

  // Bar chart data (sorted by change)
  const sorted = [...children].sort((a, b) => b.change - a.change);
  const barData = {
    labels: sorted.map(c => c.name),
    datasets: [{
      label: 'Return %',
      data: sorted.map(c => c.change),
      backgroundColor: sorted.map(c => changeColor(c.change, 0.85)),
      borderColor: sorted.map(c => changeColor(c.change, 1)),
      borderWidth: 1, borderRadius: 4,
    }],
  };
  const barOptions = {
    indexAxis: 'y' as const,
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (ctx: { raw: unknown }) => ` ${fmtPct(ctx.raw as number)}` } }
    },
    scales: {
      x: {
        grid: { color: ct.grid },
        ticks: { color: ct.tick, callback: (v: string | number) => fmtPct(v as number) }
      },
      y: {
        grid: { display: false },
        ticks: { color: ct.text, font: { size: 11 } }
      }
    }
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
            <Doughnut data={donutData} options={donutOptions} />
            <div className="donut-center">
              <div className="donut-label">Global AUM</div>
              <div className="donut-value">{totalAum.toFixed(1)} T</div>
            </div>
          </div>
          <div className="macro-bar-wrap">
            <div className="panel-header" style={{marginBottom:'0.5rem'}}>
              <h2>{current.name} — Sub-category Returns</h2>
              <span className="panel-hint">Sorted by return</span>
            </div>
            <div className="chart-wrap" style={{height:'300px'}}>
              <Bar data={barData} options={barOptions} />
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
                  <div style={{width:`${Math.min(100,pct*3)}%`, background:changeColor(c.change,0.8), height:'100%', borderRadius:'2px'}} />
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
