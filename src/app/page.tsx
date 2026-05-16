'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import TopBar from '@/components/layout/TopBar';
import TabNav from '@/components/layout/TabNav';
import Loader from '@/components/layout/Loader';
import MarketTickerBar from '@/components/layout/MarketTickerBar';
import QuickSearch from '@/components/layout/QuickSearch';
import type { Quote, MacroNode, MockEvent, CycleRow, CrisisEvent, CorrelationMatrix, Period } from '@/types';

const TAB_ORDER = ['macro', 'overview', 'trends', 'backtest', 'flow', 'cycle', 'crisis', 'correlation'];
import { getMarketStatus, getPollInterval, type MarketStatus } from '@/lib/utils/marketHours';

const MONTH_ABBR = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
function formatUpdateTime(d: Date): string {
  // Display in NY time so the badge reads as a market timestamp.
  const ny = new Date(d.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = String(ny.getDate()).padStart(2, '0');
  const mon = MONTH_ABBR[ny.getMonth()];
  const hh  = String(ny.getHours()).padStart(2, '0');
  const mm  = String(ny.getMinutes()).padStart(2, '0');
  return `${day} ${mon} · ${hh}:${mm} EST`;
}

// Dynamic imports to avoid SSR for canvas/chart components
const MacroTab = dynamic(() => import('@/components/tabs/MacroTab'), {
  ssr: false,
});
const OverviewTab = dynamic(() => import('@/components/tabs/OverviewTab'), {
  ssr: false,
});
const TrendTab = dynamic(() => import('@/components/tabs/TrendTab'), {
  ssr: false,
});
const BacktestTab = dynamic(() => import('@/components/tabs/BacktestTab'), {
  ssr: false,
});
const FlowChipsTab = dynamic(() => import('@/components/tabs/FlowChipsTab'), {
  ssr: false,
});
const CycleTab = dynamic(() => import('@/components/tabs/CycleTab'), {
  ssr: false,
});
const CrisisTab = dynamic(() => import('@/components/tabs/CrisisTab'), {
  ssr: false,
});
const CorrelationTab = dynamic(() => import('@/components/tabs/CorrelationTab'), {
  ssr: false,
});

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('macro');
  const [tabDir, setTabDir] = useState<'left' | 'right'>('right');
  const [period, setPeriod] = useState<Period>('1d');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [macroData, setMacroData] = useState<MacroNode | null>(null);
  const [eventsData, setEventsData] = useState<MockEvent[] | null>(null);
  const [cycleData, setCycleData] = useState<CycleRow[] | null>(null);
  const [crisisData, setCrisisData] = useState<CrisisEvent[] | null>(null);
  const [correlationData, setCorrelationData] = useState<CorrelationMatrix | null>(null);
  const [updateTime, setUpdateTime] = useState('—');
  const [marketStatus, setMarketStatus] = useState<MarketStatus>('closed');
  const [flashMap, setFlashMap] = useState<Record<string, 'up' | 'down' | null>>({});
  const prevPricesRef = useRef<Record<string, number>>({});
  // Trend tab selected symbols
  const [selected, setSelected] = useState<string[]>([
    'QQQ',
    'XLK',
    'GLD',
    'TLT',
    'VNQ',
    'IBIT',
  ]);

  const fetchMacro = useCallback(async (p: Period): Promise<MacroNode> => {
    const r = await fetch(`/api/macro?period=${p}`);
    return r.json() as Promise<MacroNode>;
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/quotes').then(r => r.json()) as Promise<Quote[]>,
      fetchMacro(period),
      fetch('/api/events').then(r => r.json()) as Promise<MockEvent[]>,
      fetch('/api/cycle').then(r => r.json()) as Promise<CycleRow[]>,
      fetch('/api/crisis').then(r => r.json()) as Promise<CrisisEvent[]>,
      fetch('/api/correlation').then(r => r.json()) as Promise<CorrelationMatrix>,
    ])
      .then(([q, m, e, c, cr, corr]) => {
        setQuotes(q);
        setMacroData(m);
        setEventsData(e);
        setCycleData(c);
        setCrisisData(cr);
        setCorrelationData(corr);
        setUpdateTime(
          formatUpdateTime(new Date()),
        );
      })
      .finally(() => setLoading(false));
    // Run only once on mount — period is intentionally excluded
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh macro when period changes (skip if quotes not loaded yet)
  useEffect(() => {
    if (!quotes.length) return;
    setMacroData(null); // show skeleton while refetching
    fetchMacro(period).then(setMacroData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // Adaptive quote refresh based on market hours
  useEffect(() => {
    const prevPrices = prevPricesRef.current;
    let timerId: ReturnType<typeof setTimeout>;

    async function refresh() {
      const q = (await fetch('/api/quotes').then(r => r.json())) as Quote[];
      setQuotes(q);
      setUpdateTime(formatUpdateTime(new Date()));

      // Detect price changes for flash animation
      const newFlash: Record<string, 'up' | 'down' | null> = {};
      q.forEach(quote => {
        const prev = prevPrices[quote.symbol];
        if (prev !== undefined && prev !== quote.price) {
          newFlash[quote.symbol] = quote.price > prev ? 'up' : 'down';
        }
        prevPrices[quote.symbol] = quote.price;
      });
      setFlashMap(newFlash);
      setTimeout(() => setFlashMap({}), 800);

      const status = getMarketStatus();
      setMarketStatus(status);
      timerId = setTimeout(refresh, getPollInterval(status));
    }

    const status = getMarketStatus();
    setMarketStatus(status);
    timerId = setTimeout(refresh, getPollInterval(status));
    return () => clearTimeout(timerId);
  }, []);

  function changeTab(newTab: string) {
    const oldIdx = TAB_ORDER.indexOf(activeTab);
    const newIdx = TAB_ORDER.indexOf(newTab);
    setTabDir(newIdx >= oldIdx ? 'right' : 'left');
    setActiveTab(newTab);
  }

  // Add to multi-symbol comparison in Trends tab
  function handleSelectSymbolForTrend(sym: string) {
    setSelected(prev => {
      if (prev.includes(sym)) return prev;
      return prev.length >= 6 ? [...prev.slice(1), sym] : [...prev, sym];
    });
    changeTab('trends');
  }

  // Navigate to Trends tab with only this single symbol (solo chart view)
  function handleViewChart(sym: string) {
    setSelected([sym]);
    changeTab('trends');
  }

  return (
    <>
      <TopBar
        updateTime={updateTime}
        marketStatus={marketStatus}
      />
      <MarketTickerBar
        quotes={quotes}
        period={period}
        onSelectSymbol={handleViewChart}
        flashMap={flashMap}
      />
      <TabNav
        activeTab={activeTab}
        onTabChange={changeTab}
        period={period}
        onPeriodChange={setPeriod}
      />
      <QuickSearch
        quotes={quotes}
        onSelect={handleSelectSymbolForTrend}
        onTabChange={changeTab}
        onPeriodChange={setPeriod}
        activeTab={activeTab}
        period={period}
      />
      <Loader show={loading} />
      <div className={`tab-dir-${tabDir}`}>
      {activeTab === 'macro' && (
        <MacroTab macroData={macroData} period={period} />
      )}
      {activeTab === 'overview' && (
        <OverviewTab
          quotes={quotes}
          period={period}
          onSelectSymbolForTrend={handleSelectSymbolForTrend}
        />
      )}
      {activeTab === 'trends' && (
        <TrendTab
          quotes={quotes}
          eventsData={eventsData}
          period={period}
          selected={selected}
          onSelectedChange={setSelected}
        />
      )}
      {activeTab === 'backtest' && <BacktestTab quotes={quotes} />}
      {activeTab === 'flow' && (
        <FlowChipsTab quotes={quotes} period={period} />
      )}
      {activeTab === 'cycle' && (
        <CycleTab eventsData={eventsData} cycleData={cycleData} />
      )}
      {activeTab === 'crisis' && (
        <CrisisTab crisisData={crisisData} allEvents={eventsData} />
      )}
      {activeTab === 'correlation' && (
        <CorrelationTab correlationData={correlationData} />
      )}
      </div>
    </>
  );
}
