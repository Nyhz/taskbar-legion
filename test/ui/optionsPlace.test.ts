import { describe, expect, it } from 'vitest';
import { placeOptions } from '@/ui/options/optionsPlace';

const viewport = { width: 1920, height: 1000 };
const size = { width: 170, height: 250 };
const sign = { left: 780, right: 796, top: 640, bottom: 656 }; // the cog at the right end of a 600-px strip
const base = { size, viewport, gap: 2, edge: 4 };

describe('placeOptions', () => {
  it('hangs from its sign when nothing is open', () => {
    expect(placeOptions({ ...base, sign, panels: [] })).toEqual({ right: 1920 - 796, bottom: 1000 - 640 + 2 });
  });

  it('steps right of the hero window instead of covering it', () => {
    const hero = { left: 350, right: 900, top: 380, bottom: 636 };
    const { right } = placeOptions({ ...base, sign, panels: [hero] });
    expect(1920 - right - size.width).toBeGreaterThanOrEqual(hero.right + 2);
  });

  it('clears a right wing hanging from the hero too', () => {
    const hero = { left: 350, right: 900, top: 380, bottom: 636 };
    const wing = { left: 900, right: 1150, top: 400, bottom: 636 };
    const { right } = placeOptions({ ...base, sign, panels: [hero, wing] });
    expect(1920 - right - size.width).toBeGreaterThanOrEqual(wing.right + 2);
  });

  it('stays put when there is no room further right', () => {
    const narrow = { width: 1000, height: 1000 };
    const hero = { left: 100, right: 990, top: 380, bottom: 636 };
    const at = placeOptions({ ...base, viewport: narrow, sign: { ...sign, right: 800 }, panels: [hero] });
    expect(at.right).toBeGreaterThanOrEqual(4);
  });
});
