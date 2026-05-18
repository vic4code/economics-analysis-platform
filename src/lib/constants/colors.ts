// Single source of truth for every colour token used by the app.
// All hex values, semantic mappings, and chart palettes flow from here.
//
// ⚠️ Never hard-code a hex anywhere else. Either import from this file
//   or read the corresponding CSS custom property (`var(--gold)` etc.).
//
// The CSS layer in `src/app/globals.css` defines variables with the same
// values, so designers can rely on tokens whether they're touching CSS
// or TypeScript.

export const colors = {
  // Backgrounds — four-layer deck.
  bg0: '#060810',
  bg1: '#0A0E18',
  bg2: '#0E1420',
  bg3: '#141B28',

  // Ink — three text levels.
  ink0: '#E8EBF0',
  ink1: '#6E7A8A',
  ink2: '#3D4756',

  // Brand — gold is for the logo, active states, and the primary CTA. Nowhere else.
  gold:     '#BFA06A',
  goldSoft: '#D6BC85',
  goldDim:  'rgba(191, 160, 106, 0.10)',
  goldLine: 'rgba(191, 160, 106, 0.22)',

  // Semantic colours — data only.
  up:       '#2EA043',
  upDim:    'rgba(46, 160, 67, 0.10)',
  down:     '#E5534B',
  downDim:  'rgba(229, 83, 75, 0.10)',
  neutral:  '#6E7A8A',
  info:     '#4A90D9',
  infoDim:  'rgba(74, 144, 217, 0.10)',
  warn:     '#C47F17',
  warnDim:  'rgba(196, 127, 23, 0.10)',
} as const;

// Chart palette — cool/warm alternating so segments are unambiguous.
// Use in order, do not skip. Six steps is the cap.
export const CHART_PALETTE = [
  '#2EA043', // green  — US equity / risk on
  '#4A90D9', // blue   — fixed income
  '#BFA06A', // gold   — commodities
  '#C47F17', // amber  — emerging markets
  '#D4564E', // coral  — alternatives
  '#5BA3C9', // ice    — money market
] as const;

export type ColorKey = keyof typeof colors;
