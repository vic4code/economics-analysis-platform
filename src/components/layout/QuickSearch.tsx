'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import type { Quote } from '@/types';
import { SECTOR_COLORS, changeTextColor, fmtPct } from '@/lib/utils/colors';

interface Props {
  quotes: Quote[];
  onSelect: (sym: string) => void;
}

export default function QuickSearch({ quotes, onSelect }: Props) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState('');
  const inputRef          = useRef<HTMLInputElement>(null);

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
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const results = useMemo(() => {
    if (!query.trim()) return quotes.slice(0, 12);
    const q = query.toLowerCase();
    return quotes.filter(
      r => r.symbol.toLowerCase().includes(q) || r.name.toLowerCase().includes(q),
    ).slice(0, 12);
  }, [quotes, query]);

  function pick(sym: string) {
    onSelect(sym);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="qs-overlay" onClick={() => setOpen(false)}>
      <div className="qs-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal aria-label="Symbol search">
        <div className="qs-header">
          <span className="qs-icon">⌕</span>
          <input
            ref={inputRef}
            className="qs-input"
            placeholder="Search symbols or names…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && results[0]) pick(results[0].symbol);
            }}
          />
          <kbd className="qs-esc">Esc</kbd>
        </div>
        <div className="qs-results">
          {results.map(r => (
            <button key={r.symbol} className="qs-result-item" onClick={() => pick(r.symbol)}>
              <span
                className="qs-sym"
                style={{ color: SECTOR_COLORS[r.sector] ?? '#cdd9e5' }}
              >{r.symbol}</span>
              <span className="qs-name">{r.name}</span>
              <span className="qs-sector">{r.sector}</span>
              <span className="qs-pct" style={{ color: changeTextColor(r.change_1d) }}>
                {fmtPct(r.change_1d)}
              </span>
            </button>
          ))}
          {!results.length && (
            <div className="qs-empty">No symbols match "{query}"</div>
          )}
        </div>
        <div className="qs-footer">
          <span><kbd>↵</kbd> to chart first result</span>
          <span><kbd>Esc</kbd> to close</span>
          <span><kbd>⌘K</kbd> to toggle</span>
        </div>
      </div>
    </div>
  );
}
