// Time / date formatters used by the UI shell.

const MONTH_ABBR = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

/**
 * Format a date as a market timestamp anchored to New York time.
 * Example: "16 MAY · 22:57 EST".
 */
export function formatUpdateTime(d: Date): string {
  const ny = new Date(d.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = String(ny.getDate()).padStart(2, '0');
  const mon = MONTH_ABBR[ny.getMonth()];
  const hh  = String(ny.getHours()).padStart(2, '0');
  const mm  = String(ny.getMinutes()).padStart(2, '0');
  return `${day} ${mon} · ${hh}:${mm} EST`;
}
