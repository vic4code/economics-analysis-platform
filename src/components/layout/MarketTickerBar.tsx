'use client';
import { useMemo } from 'react';
import type { Quote } from '@/types';
import { changeTextColor, fmtPct } from '@/lib/utils/colors';

const TICKER_SYMBOLS = ['SPY', 'QQQ', 'TLT', 'GLD', 'IBIT', 'XLE', 'EEM', 'VNQ'];

interface Props {
  quotes: Quote[];
  period: string;
  onSelectSymbol: (sym: string) => void;
}

export default function MarketTickerBar({ quotes, period, onSelectSymbol }: Props) {
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
        {tickers.map(q => {
          const pct = getPct(q);
          return (
            <button
              key={q.symbol}
              className="ticker-item"
              onClick={() => onSelectSymbol(q.symbol)}
              title={q.name}
            >
              <span className="ticker-sym">{q.symbol}</span>
              <span className="ticker-price">${q.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="ticker-chg" style={{ color: changeTextColor(pct) }}>
                {fmtPct(pct)}
              </span>
            </button>
          );
        })}
        <span className="ticker-hint">Click to chart · period: {period}</span>
      </div>
    </div>
  );
}
