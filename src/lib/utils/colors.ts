// Sector palette derived from the unified design system. Each sector gets one
// identity. We use chart-1..6 as primary anchors plus tonal variants that stay
// within the cool/warm envelope (no purple, no magenta, no indigo).
export const SECTOR_COLORS: Record<string, string> = {
  "Crypto":        "#C47F17",  // amber
  "Technology":    "#4A90D9",  // blue
  "Real Estate":   "#8B6D4F",  // taupe
  "Energy":        "#D4564E",  // coral
  "Healthcare":    "#2EA043",  // green
  "Financials":    "#BFA06A",  // gold
  "Consumer":      "#C9A87C",  // warm tan
  "Industrials":   "#6E7A8A",  // steel
  "Materials":     "#A0826D",  // sand
  "Utilities":     "#5BA3C9",  // ice
  "Bonds":         "#5C8AC6",  // muted blue
  "Commodities":   "#D6BC85",  // light gold
  "International": "#B87333",  // copper
  "Broad Market":  "#8C97A6",  // neutral
};

// Chart palette for multi-series overlays — cool/warm alternating, no clashes.
export const TREND_PALETTE = [
  "#2EA043", // green
  "#4A90D9", // blue
  "#BFA06A", // gold
  "#C47F17", // amber
  "#D4564E", // coral
  "#5BA3C9", // ice
  "#8B6D4F", // taupe
  "#6E7A8A", // steel
];

// Unified 6-step chart palette — exposed so components can stop hard-coding it.
export const CHART_PALETTE = [
  "#2EA043", "#4A90D9", "#BFA06A", "#C47F17", "#D4564E", "#5BA3C9",
];

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
