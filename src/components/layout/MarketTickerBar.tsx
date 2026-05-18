'use client';
import { useMemo } from 'react';
import type { Quote } from '@/types';
import { changeTextColor, fmtPct } from '@/lib/utils/colors';

// Major broad-market indices shown first with accent styling
const INDEX_SYMBOLS  = ['VOO', 'SPY', 'QQQ', 'DIA', 'IWM'];
const TICKER_SYMBOLS = [...INDEX_SYMBOLS, 'TLT', 'GLD', 'IBIT', 'XLE', 'EEM', 'VNQ'];

interface Props {
  quotes: Quote[];
  period: string;
  onSelectSymbol: (sym: string) => void;
  flashMap?: Record<string, 'up' | 'down' | null>;
}

export default function MarketTickerBar({ quotes, period, onSelectSymbol, flashMap }: Props) {
  const tickers = useMemo(() => {
    const map = new Map(quotes.map(q => [q.symbol, q]));
    return TICKER_SYMBOLS.map(sym => map.get(sym)).filter(Boolean) as Quote[];
  }, [quotes]);

  if (!tickers.length) return null;

  function getPct(q: Quote): number {
    switch (period) {
      case '5d':  return q.change_5d;
      case '1m':  return q.change_1m;
      case '3m':  return q.change_3m;
      case '6m':  return q.change_6m;
      case '1y':  return q.change_1y;
      case 'ytd': return q.change_ytd;
      default:    return q.change_1d;
    }
  }

  return (
    <div className="ticker-bar" role="region" aria-label="Market ticker">
      <div className="ticker-inner">
        {tickers.map((q, idx) => {
          const pct = getPct(q);
          const isIndex = INDEX_SYMBOLS.includes(q.symbol);
          const flash = flashMap?.[q.symbol];
          return (
            <button
              key={q.symbol}
              className={`ticker-item${isIndex ? ' ticker-index' : ''}${flash === 'up' ? ' flash-pos' : flash === 'down' ? ' flash-neg' : ''}`}
              onClick={() => onSelectSymbol(q.symbol)}
              title={`${q.name} · click to view chart`}
            >
              {isIndex && idx > 0 && idx === INDEX_SYMBOLS.indexOf(q.symbol) && (
                <span className="ticker-sep" />
              )}
              <span className={`ticker-sym${isIndex ? ' ticker-sym-index' : ''}`}>{q.symbol}</span>
              <span className="ticker-price">
                ${q.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="ticker-chg" style={{ color: changeTextColor(pct) }}>
                {fmtPct(pct)}
              </span>
            </button>
          );
        })}
        <span className="ticker-hint">Click any symbol to view chart</span>
      </div>
    </div>
  );
}
