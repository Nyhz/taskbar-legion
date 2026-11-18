import { describe, expect, it } from 'vitest';
import { cursorInViewport, isMacWebview } from '@/platform/cursorMapping';

describe('cursorInViewport', () => {
  it('matches the plain difference on a single screen', () => {
    expect(cursorInViewport({ x: 1200, y: 800 }, { x: 200, y: 100 }, { cursor: 2, window: 2 })).toEqual({ x: 500, y: 350 });
  });

  it('macOS: window on a ×1 monitor beside a ×2 primary still maps the cursor inside the viewport', () => {
    // External monitor to the right of a 1512-pt-wide Retina primary. Window at points (1600, 300) → physical ×1.
    // Cursor at points (1900, 700) → tao reports it ×2 (primary scale).
    const p = cursorInViewport({ x: 3800, y: 1400 }, { x: 1600, y: 300 }, { cursor: 2, window: 1 });
    expect(p).toEqual({ x: 300, y: 400 });
  });

  it('macOS: monitor to the left (negative coordinates) with mixed scales', () => {
    const p = cursorInViewport({ x: -2400, y: 600 }, { x: -1920, y: 100 }, { cursor: 2, window: 1 });
    expect(p).toEqual({ x: 720, y: 200 });
  });

  it('guards a zero scale', () => {
    expect(cursorInViewport({ x: 10, y: 10 }, { x: 0, y: 0 }, { cursor: 0, window: 0 })).toEqual({ x: 10, y: 10 });
  });
});

describe('isMacWebview', () => {
  it('tells macOS from the other desktops', () => {
    expect(isMacWebview('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15')).toBe(true);
    expect(isMacWebview('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Edg/120')).toBe(false);
    expect(isMacWebview('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/605.1.15')).toBe(false);
  });
});
