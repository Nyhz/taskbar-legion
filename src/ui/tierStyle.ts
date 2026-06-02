import { tierDef, type ItemTier } from '@/data/tiers';

// Tier color is the one gameplay-meaningful palette (ART.md / SPEC §4.3). T8 is a
// sentinel ('iridescent') the UI renders with an animated hue-cycle (class
// `tl-iridescent` in global.css). Never hardcode a tier color in a component.

export interface TierStyle {
  color: string;
  iridescent: boolean;
}

export function tierStyle(tier: ItemTier): TierStyle {
  const def = tierDef(tier);
  if (def.color === 'iridescent') return { color: '#e0b0ff', iridescent: true };
  return { color: def.color, iridescent: false };
}

export function tierName(tier: ItemTier): string {
  return tierDef(tier).name;
}
