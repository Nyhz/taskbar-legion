import { describe, expect, it } from 'vitest';
import { stageSignHeld } from '@/game/stageSign';
import { TELEPORT_HOLD_MS, TELEPORT_LIFT_AT, WIPE_ARRIVE_AT_MS, WIPE_RETREAT_AT_MS, WIPE_SIGN_AT_MS } from '@/data/field';

const walking = { wipeMs: undefined, phase: 'advancing' as const, advanceTimerMs: 100 };

describe("holding the stage's sign back", () => {
  it('does not hold it in ordinary play', () => {
    expect(stageSignHeld(walking)).toBe(false);
    expect(stageSignHeld({ ...walking, phase: 'fighting' })).toBe(false);
    expect(stageSignHeld({ ...walking, phase: 'boss' })).toBe(false);
  });

  it('holds it through a defeat until the strip is back, then lets it show before the heroes arrive', () => {
    expect(stageSignHeld({ ...walking, wipeMs: 0 })).toBe(true);
    expect(stageSignHeld({ ...walking, wipeMs: WIPE_RETREAT_AT_MS })).toBe(true); // the stage changes here, under black
    expect(stageSignHeld({ ...walking, wipeMs: WIPE_SIGN_AT_MS - 100 })).toBe(true);
    expect(stageSignHeld({ ...walking, wipeMs: WIPE_SIGN_AT_MS })).toBe(false);
    expect(WIPE_SIGN_AT_MS).toBeLessThan(WIPE_ARRIVE_AT_MS);
  });

  it('holds it while a journey to another world blacks the strip out, and releases it as the black lifts', () => {
    expect(stageSignHeld({ ...walking, advanceTimerMs: TELEPORT_HOLD_MS })).toBe(true);
    expect(stageSignHeld({ ...walking, advanceTimerMs: TELEPORT_HOLD_MS * (1 - TELEPORT_LIFT_AT) + 100 })).toBe(true);
    expect(stageSignHeld({ ...walking, advanceTimerMs: TELEPORT_HOLD_MS * (1 - TELEPORT_LIFT_AT) - 50 })).toBe(false);
  });
});
