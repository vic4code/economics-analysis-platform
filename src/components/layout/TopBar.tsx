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
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M1 14 L9 2 L17 14"
        stroke="var(--gold)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M4.5 13.5 L9 6 L13.5 13.5 Z" fill="var(--gold)" fillOpacity="0.15" />
      <circle cx="9" cy="16.2" r="1.2" fill="var(--gold)" />
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
      <div className="topbar-strip">
        <a className="topbar-brand" href="/" aria-label="Fund Flow home">
          <LogoMark />
          <span className="brand-name">
            Fund<em>Flow</em>
          </span>
        </a>

        <div className="topbar-spacer" />

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
              ? <Sun size={14} strokeWidth={1.6} />
              : <Moon size={14} strokeWidth={1.6} />}
          </button>
        </div>
      </div>
    </header>
  );
}
