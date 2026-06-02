// Base UI/world palette (ART.md). Tier colors are gameplay-meaningful and live in
// `data/tiers.ts` — never hardcode a tier color in a component; read it from there.
export const PALETTE = {
  bgDeep: '#14121a',
  bgPanel: '#221c2b',
  bgInset: '#2e2535',
  ink: '#0d0b12',
  parchment: '#d9c9a3',
  gold: '#e8b24c',
  goldDim: '#9c7a2e',
  titleRed: '#6e1f24',
  titleRedHi: '#a8323a',
  textLight: '#e7e1d6',
  textMute: '#9b91a6',
  hpGreen: '#4caf50',
  hpBack: '#3a2030',
  enemyAccent: '#c0473a',
  xpBlue: '#4a78d6',
  research: '#6fd1c4',
} as const;

export type PaletteKey = keyof typeof PALETTE;

/** Convert a `#rrggbb` string to a Pixi numeric color. */
export function hexToNum(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16);
}
