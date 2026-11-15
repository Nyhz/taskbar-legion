import { describe, expect, it } from 'vitest';
import {
  PORTAL_ENTER_FX,
  PORTAL_FROM_RIGHT,
  PORTAL_FX,
  PORTAL_HALF_WIDTH,
  PORTAL_HEIGHT,
  PORTAL_SIGNS_HEIGHT,
  PORTAL_SIGNS_UP,
  portalHitBox,
  portalState,
} from '@/game/render/portalLook';
import { fxMeta } from '@/game/render/fxData';
import { STRIP_PATH_Y } from '@/game/render/stripBackdropData';

describe("the world boss's gate", () => {
  it('is chained shut without a key, awake with one, and wider awake under the pointer', () => {
    expect(portalState(0, false)).toBe('shut');
    expect(portalState(0, true)).toBe('shut'); // the pointer wakes nothing without a key
    expect(portalState(1, false)).toBe('open');
    expect(portalState(3, true)).toBe('hot');
  });

  it('has a drawing for every state, all the same size and standing on the same base, and a one-shot for going in', () => {
    const metas = Object.values(PORTAL_FX).map((key) => fxMeta(key));
    for (const meta of metas) {
      expect(meta).toBeDefined();
      expect(meta?.loop).toBe(true);
      expect([meta?.w, meta?.h, meta?.ax, meta?.ay]).toEqual([metas[0]?.w, metas[0]?.h, metas[0]?.ax, metas[0]?.ay]);
    }
    const enter = fxMeta(PORTAL_ENTER_FX);
    expect(enter?.loop).toBe(false);
    expect([enter?.ax, enter?.ay]).toEqual([metas[0]?.ax, metas[0]?.ay]);
    // The numbers the strip places it with are the drawing's.
    expect(metas[0]?.ay).toBe(PORTAL_HEIGHT);
    expect(metas[0]?.w).toBe(PORTAL_HALF_WIDTH * 2);
  });

  it('stands on the path — nothing of it hangs below the ground line — and fits the strip with its signs', () => {
    const meta = fxMeta(PORTAL_FX.open);
    // At most a sill's shadow under the base: the old portal hung 15 px into the foreground grass.
    expect((meta?.h ?? 99) - (meta?.ay ?? 0)).toBeLessThanOrEqual(4);
    expect(STRIP_PATH_Y - PORTAL_SIGNS_UP - PORTAL_SIGNS_HEIGHT / 2).toBeGreaterThanOrEqual(2); // the signs stay on the strip
    expect(PORTAL_FROM_RIGHT).toBeGreaterThanOrEqual(PORTAL_HALF_WIDTH); // and the drawing does too
  });

  it('is clicked on its drawing and its signs, not beside them', () => {
    const box = portalHitBox();
    expect(box.x).toBeGreaterThanOrEqual(-PORTAL_HALF_WIDTH);
    expect(box.x + box.width).toBeLessThanOrEqual(PORTAL_HALF_WIDTH);
    expect(box.y).toBeLessThan(-PORTAL_HEIGHT); // reaches the signs
    expect(box.y + box.height).toBeLessThanOrEqual(4); // and stops at the ground: the Retry sign below stays its own target
  });
});
