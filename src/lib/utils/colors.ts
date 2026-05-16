export const SECTOR_COLORS: Record<string, string> = {
  "Crypto":        "#f7931a",
  "Technology":    "#4a90e2",
  "Real Estate":   "#8b6d4f",
  "Energy":        "#e67e22",
  "Healthcare":    "#27ae60",
  "Financials":    "#8e44ad",
  "Consumer":      "#e91e8c",
  "Industrials":   "#607d8b",
  "Materials":     "#795548",
  "Utilities":     "#00bcd4",
  "Bonds":         "#3f51b5",
  "Commodities":   "#ffc107",
  "International": "#ff9800",
  "Broad Market":  "#9e9e9e",
};

export const TREND_PALETTE = ["#4a90e2","#f7931a","#27ae60","#e91e8c","#ffc107","#00bcd4","#e74c3c","#8e44ad"];

export function changeColor(pct: number, alpha = 1): string {
  const clamp = Math.max(-6, Math.min(6, pct));
  if (clamp >= 0) {
    const t = clamp / 6;
    const g = Math.round(80 + t * 155);
    return `rgba(0,${g},60,${alpha})`;
  } else {
    const t = -clamp / 6;
    const r = Math.round(80 + t * 160);
    return `rgba(${r},20,20,${alpha})`;
  }
}

export function changeTextColor(pct: number): string {
  if (pct > 0.1)  return "#2EA043";
  if (pct < -0.1) return "#E5534B";
  return "#6E7A8A";
}

export function fmtPct(v: number, alwaysSign = true): string {
  const sign = v >= 0 ? "+" : "";
  return (alwaysSign ? sign : "") + v.toFixed(2) + "%";
}
