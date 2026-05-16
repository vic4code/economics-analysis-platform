'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { Quote, Period } from '@/types';
import { SECTOR_COLORS, changeTextColor, fmtPct } from '@/lib/utils/colors';

const TABS = [
  { id: 'macro',       label: 'Macro Flow',      icon: '🌐' },
  { id: 'overview',   label: 'Overview',         icon: '📊' },
  { id: 'trends',     label: 'Trend Analysis',   icon: '📈' },
  { id: 'backtest',   label: 'Backtest',          icon: '🔬' },
  { id: 'flow',       label: 'Flow & Chips',      icon: '📡' },
  { id: 'cycle',      label: 'Events & Cycles',   icon: '📅' },
  { id: 'crisis',     label: 'Crisis Atlas',      icon: '🚨' },
  { id: 'correlation',label: 'Correlation',       icon: '🔗' },
];

const PERIODS: Period[] = ['1d', '5d', '1m', '3m', '6m', '1y', 'ytd'];

interface QSItem {
  type: 'etf' | 'tab' | 'period';
  id: string;
  label: string;
  subLabel?: string;
  icon?: string;
  color?: string;
  pct?: number;
  action?: string;
}

interface Props {
  quotes: Quote[];
  onSelect: (sym: string) => void;
  onTabChange?: (tab: string) => void;
  onPeriodChange?: (p: Period) => void;
  activeTab?: string;
  period?: Period;
}

export default function QuickSearch({ quotes, onSelect, onTabChange, onPeriodChange, activeTab, period }: Props) {
  const [open, setOpen]         = useState(false);
  const [query, setQuery]       = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef                = useRef<HTMLInputElement>(null);
  const listRef                 = useRef<HTMLDivElement>(null);

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const items = useMemo<QSItem[]>(() => {
    const q = query.toLowerCase().trim();

    if (!q) {
      // Default: show tabs + top ETFs
      const tabItems: QSItem[] = TABS.map(t => ({
        type: 'tab',
        id: t.id,
        label: t.label,
        icon: t.icon,
        subLabel: activeTab === t.id ? 'Current tab' : 'Go to tab',
        action: 'tab',
      }));
      const etfItems: QSItem[] = quotes.slice(0, 8).map(r => ({
        type: 'etf',
        id: r.symbol,
        label: r.symbol,
        subLabel: r.name,
        color: SECTOR_COLORS[r.sector],
        pct: r.change_1d,
        action: 'chart',
      }));
      return [...tabItems, ...etfItems];
    }

    const results: QSItem[] = [];

    // Tabs
    TABS.filter(t =>
      t.label.toLowerCase().includes(q) || t.id.includes(q)
    ).forEach(t => results.push({
      type: 'tab', id: t.id, label: t.label, icon: t.icon,
      subLabel: 'Go to tab', action: 'tab',
    }));

    // Periods
    PERIODS.filter(p => p.includes(q) || (q === '1' && p.startsWith('1'))).forEach(p => results.push({
      type: 'period', id: p, label: `Set period: ${p.toUpperCase()}`,
      icon: '⏱', subLabel: period === p ? 'Current period' : 'Change period',
      action: 'period',
    }));

    // ETFs
    quotes.filter(r =>
      r.symbol.toLowerCase().includes(q) || r.name.toLowerCase().includes(q)
    ).slice(0, 8).forEach(r => results.push({
      type: 'etf', id: r.symbol, label: r.symbol,
      subLabel: r.name, color: SECTOR_COLORS[r.sector],
      pct: r.change_1d, action: 'chart',
    }));

    return results;
  }, [quotes, query, activeTab, period]);

  const execute = useCallback((item: QSItem) => {
    if (item.type === 'etf') {
      onSelect(item.id);
    } else if (item.type === 'tab' && onTabChange) {
      onTabChange(item.id);
    } else if (item.type === 'period' && onPeriodChange) {
      onPeriodChange(item.id as Period);
    }
    setOpen(false);
  }, [onSelect, onTabChange, onPeriodChange]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (items[activeIdx]) execute(items[activeIdx]);
    }
  }

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('.qs-result-item.active');
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  // Reset active index when query changes
  useEffect(() => { setActiveIdx(0); }, [query]);

  if (!open) return null;

  const hasTabResults  = items.some(i => i.type === 'tab');
  const hasEtfResults  = items.some(i => i.type === 'etf');
  const hasPeriodResults = items.some(i => i.type === 'period');

  return (
    <div className="qs-overlay" onClick={() => setOpen(false)}>
      <div
        className="qs-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal
        aria-label="Command palette"
      >
        <div className="qs-header">
          <span className="qs-icon">⌕</span>
          <input
            ref={inputRef}
            className="qs-input"
            placeholder="Search ETFs, navigate tabs, change period…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd className="qs-esc">Esc</kbd>
        </div>
        <div className="qs-results" ref={listRef}>
          {!items.length && (
            <div className="qs-empty">No results for "{query}"</div>
          )}

          {/* Tabs section */}
          {hasTabResults && !query && (
            <div className="qs-section-header">Navigate</div>
          )}
          {items.map((item, idx) => {
            if (item.type === 'tab') {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={`tab-${item.id}`}
                  className={`qs-result-item${activeIdx === idx ? ' active' : ''}`}
                  onClick={() => execute(item)}
                  onMouseEnter={() => setActiveIdx(idx)}
                >
                  <span className="qs-result-icon">{item.icon}</span>
                  <span className="qs-name" style={{ color: isActive ? 'var(--accent)' : 'var(--text)' }}>
                    {item.label}
                    {isActive && <span style={{ marginLeft: 6, fontSize: '0.65rem', color: 'var(--accent)', opacity: 0.7 }}>●</span>}
                  </span>
                  <span className="qs-sector">{item.subLabel}</span>
                  <span className="qs-result-action">→</span>
                </button>
              );
            }
            return null;
          })}

          {/* Period section */}
          {hasPeriodResults && (
            <div className="qs-section-header">Period</div>
          )}
          {items.map((item, idx) => {
            if (item.type === 'period') {
              const isCurrent = period === item.id;
              return (
                <button
                  key={`period-${item.id}`}
                  className={`qs-result-item${activeIdx === idx ? ' active' : ''}`}
                  onClick={() => execute(item)}
                  onMouseEnter={() => setActiveIdx(idx)}
                >
                  <span className="qs-result-icon">{item.icon}</span>
                  <span className="qs-name" style={{ color: isCurrent ? 'var(--accent)' : 'var(--text)' }}>
                    {item.label}
                  </span>
                  <span className="qs-sector">{isCurrent ? 'Active' : ''}</span>
                  <span className="qs-result-action">→</span>
                </button>
              );
            }
            return null;
          })}

          {/* ETF section */}
          {hasEtfResults && !query && (
            <div className="qs-section-header">ETFs</div>
          )}
          {hasEtfResults && query && (
            <div className="qs-section-header">Symbols</div>
          )}
          {items.map((item, idx) => {
            if (item.type === 'etf') {
              return (
                <button
                  key={`etf-${item.id}`}
                  className={`qs-result-item${activeIdx === idx ? ' active' : ''}`}
                  onClick={() => execute(item)}
                  onMouseEnter={() => setActiveIdx(idx)}
                >
                  <span className="qs-sym" style={{ color: item.color ?? 'var(--accent)' }}>{item.label}</span>
                  <span className="qs-name">{item.subLabel}</span>
                  <span className="qs-sector"></span>
                  {item.pct !== undefined && (
                    <span className="qs-pct" style={{ color: changeTextColor(item.pct) }}>
                      {fmtPct(item.pct)}
                    </span>
                  )}
                </button>
              );
            }
            return null;
          })}
        </div>
        <div className="qs-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>Esc</kbd> close</span>
          <span><kbd>⌘K</kbd> toggle</span>
        </div>
      </div>
    </div>
  );
}
