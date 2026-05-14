'use client';
import type { Period } from '@/types';

const PERIODS: Period[] = ['1d', '5d', '1m', '3m', '6m', '1y', 'ytd'];

interface Props {
  period: Period;
  onPeriodChange: (p: Period) => void;
  updateTime: string;
}

export default function TopBar({ period, onPeriodChange, updateTime }: Props) {
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="brand-icon">⚡</span>
        <span className="brand-name">Fund Flow</span>
        <span className="brand-sub">全球資金流向分析</span>
      </div>
      <div className="topbar-period" id="periodBar">
        {PERIODS.map(p => (
          <button key={p} className={`period-btn${period === p ? ' active' : ''}`}
            onClick={() => onPeriodChange(p)}>
            {p.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="topbar-meta">
        <span className="data-badge">⚙ Mock Data</span>
        <span className="update-time">{updateTime}</span>
      </div>
    </header>
  );
}
