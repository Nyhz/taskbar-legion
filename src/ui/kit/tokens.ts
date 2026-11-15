// The interface tokens — tones of the "dusk" master palette (tools/assets/pipeline/palette.py), named by the
// job they do in the kit. KitRoot sets them as CSS variables, so kit.css and components read `var(--k0)` etc.
// Tier colours here are the kit's lettering tones for item names; the gameplay tier table stays in data/tiers.ts.

export const KIT_TOKENS = {
  // The neutral ramp: outlines, plates, text. k0 is the outline, k1 the window plate, k8/k9 the text.
  k0: '#0b0d17',
  k1: '#151a2b',
  k2: '#212a40',
  k3: '#303c55',
  k4: '#43506a',
  k5: '#5b6880',
  k6: '#77839a',
  k7: '#97a1b3',
  k8: '#bcc3cf',
  k9: '#e6e6e8',
  // Brass: the purse, titles, anything that matters.
  gold: '#ebb94f',
  'gold-hi': '#f8dc84',
  'gold-dim': '#a96628',
  'gold-dk': '#4f2b22',
  // Experience.
  xp: '#3f68a6',
  'xp-hi': '#82b0da',
  'xp-dk': '#2e4a88',
  // Better / worse.
  good: '#86ab5a',
  bad: '#dc5f48',
  // Item-name lettering by tier (T0–T8).
  t0: '#97a1b3',
  t1: '#86ab5a',
  t2: '#82b0da',
  t3: '#cba2dd',
  t4: '#ee9f72',
  t5: '#f08a62',
  t6: '#6fb9a6',
  t7: '#f8dc84',
  t8: '#ead2f0',
} as const;

export type KitToken = keyof typeof KIT_TOKENS;

/** The tokens as CSS custom properties (`--k0: #0b0d17`, …), ready to spread into a `style`. */
export const KIT_VARS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(KIT_TOKENS).map(([name, value]) => [`--${name}`, value]),
);
