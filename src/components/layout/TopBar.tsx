'use client';
import { useState, useEffect } from 'react';
import type { Period } from '@/types';

const PERIODS: Period[] = ['1d', '5d', '1m', '3m', '6m', '1y', 'ytd'];

interface Props {
  period: Period;
  onPeriodChange: (p: Period) => void;
  updateTime: string;
}

export default function TopBar({ period, onPeriodChange, updateTime }: Props) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const t = document.documentElement.getAttribute('data-theme') as 'dark' | 'light';
    setTheme(t === 'light' ? 'light' : 'dark');
  }, []);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  }

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <span className="brand-icon">⚡</span>
        <span className="brand-name">Fund Flow</span>
        <span className="brand-sub">Global Capital Flow Analytics</span>
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
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            padding: '4px 8px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            fontSize: '1rem',
            lineHeight: 1,
          }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <span className="data-badge">⚙ Mock Data</span>
        <span className="update-time">{updateTime}</span>
      </div>
    </header>
  );
}
