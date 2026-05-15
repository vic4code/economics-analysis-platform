export type MarketStatus = 'open' | 'pre' | 'post' | 'closed';

export function getMarketStatus(): MarketStatus {
  const now = new Date();
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const h = et.getHours(), m = et.getMinutes();
  const mins = h * 60 + m;
  const day = et.getDay();
  if (day === 0 || day === 6) return 'closed';
  if (mins >= 570 && mins < 960) return 'open';   // 9:30–16:00
  if (mins >= 240 && mins < 570) return 'pre';    // 4:00–9:30
  if (mins >= 960 && mins < 1200) return 'post';  // 16:00–20:00
  return 'closed';
}

export function getPollInterval(status: MarketStatus): number {
  if (status === 'open')  return 15_000;
  if (status === 'pre' || status === 'post') return 300_000;
  return 1_800_000;
}

export const MARKET_STATUS_LABEL: Record<MarketStatus, string> = {
  open:   'OPEN · 15s',
  pre:    'PRE-MARKET',
  post:   'AFTER-HOURS',
  closed: 'MARKET CLOSED',
};
