'use client';
import { useState, useEffect } from 'react';
import type { MarketStatus } from '@/lib/utils/marketHours';
import { MARKET_STATUS_LABEL } from '@/lib/utils/marketHours';
import { Sun, Moon } from 'lucide-react';

interface Props {
  updateTime: string;
  marketStatus: MarketStatus;
}

function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect width="28" height="28" rx="7" fill="url(#logo-g)" />
      <polyline points="5,21 10,14 16,17 23,8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="23" cy="8" r="2" fill="white" />
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function TopBar({ updateTime, marketStatus }: Props) {
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
        <LogoMark />
        <div className="brand-text">
          <span className="brand-name">Fund Flow</span>
          <span className="brand-sub">Global Capital Analytics</span>
        </div>
      </div>

      <div className="topbar-meta">
        <span className={`market-status-badge market-${marketStatus}`}>
          <span className="market-dot" />
          {MARKET_STATUS_LABEL[marketStatus]}
        </span>
        <span className="update-time">{updateTime}</span>
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="theme-toggle-btn"
          aria-label="Toggle theme"
        >
          {theme === 'dark'
            ? <Sun size={15} strokeWidth={1.75} />
            : <Moon size={15} strokeWidth={1.75} />}
        </button>
      </div>
    </header>
  );
}
