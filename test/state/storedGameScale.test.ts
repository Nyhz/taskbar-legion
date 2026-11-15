import { describe, expect, it } from 'vitest';
import { storedGameScale } from '@/state/settingsShim';
import { snapGameScale, screenPixelsPerArtPixel, TARGET_SCREENS } from '@/state/pixelScale';

describe('the stored game scale', () => {
  it('is read when the whole-pixel system saved it', () => {
    expect(storedGameScale({ gameScale: 4 / 3, wholePixelScale: true })).toBeCloseTo(4 / 3);
  });

  it('is ignored when it predates the whole-pixel system', () => {
    expect(storedGameScale({ gameScale: 0.75 })).toBeUndefined();
    expect(storedGameScale({})).toBeUndefined();
  });

  it('an old 0.75 no longer shrinks the game on a 2560×1440 screen', () => {
    const screen = TARGET_SCREENS.find((t) => t.name === '2560×1440');
    if (screen === undefined) throw new Error('target screen missing');
    const scale = snapGameScale(storedGameScale({ gameScale: 0.75 }) ?? 1, screen.dpr, screen.height);
    expect(screenPixelsPerArtPixel(scale, screen.dpr)).toBeCloseTo(2);
  });
});
