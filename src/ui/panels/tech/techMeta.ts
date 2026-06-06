import type { TechCategory } from '@/data/techTree';

// Presentation-only accent per category (NOT game data). Mirrors the old GROUP_COLOR.
export const CATEGORY_COLOR: Record<TechCategory, string> = {
  Economy: '#e8b24c',
  Chests: '#6fd1c4',
  Utility: '#9b6fd1',
};

export const CATEGORY_BLURB: Record<TechCategory, string> = {
  Economy: 'Gold, XP & offline income',
  Chests: 'Drop rates, gems & storage',
  Utility: 'Auto-open & party size',
};
