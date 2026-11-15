import { describe, expect, it } from 'vitest';
import { CLASS_KEYS } from '@/data/classes';
import { ABILITIES } from '@/data/abilities';
import { MAX_BLOW_WAIT_MS, blowRate, blowWaitMs, impactMs } from '@/game/render/attackLead';
import { Delayed } from '@/game/render/delayed';
import { figureMeta } from '@/game/render/figureData';
import { heroAbilityClip } from '@/game/render/heroClips';

describe('Delayed', () => {
  it('runs at once when there is nothing to wait for', () => {
    const d = new Delayed();
    const ran: string[] = [];
    d.add(0, () => ran.push('a'));
    d.add(-5, () => ran.push('b'));
    expect(ran).toEqual(['a', 'b']);
    expect(d.pending).toBe(0);
  });

  it('holds a call until its time has passed, and runs due calls in the order they were added', () => {
    const d = new Delayed();
    const ran: string[] = [];
    d.add(300, () => ran.push('late'));
    d.add(100, () => ran.push('first'));
    d.add(100, () => ran.push('second'));
    d.tick(50);
    expect(ran).toEqual([]);
    d.tick(50);
    expect(ran).toEqual(['first', 'second']);
    d.tick(199);
    expect(d.pending).toBe(1);
    d.tick(1);
    expect(ran).toEqual(['first', 'second', 'late']);
    expect(d.pending).toBe(0);
  });

  it('lets a call add another while it runs', () => {
    const d = new Delayed();
    const ran: string[] = [];
    d.add(10, () => { ran.push('a'); d.add(10, () => ran.push('b')); });
    d.tick(10);
    expect(ran).toEqual(['a']);
    d.tick(10);
    expect(ran).toEqual(['a', 'b']);
  });

  it('forgets what was waiting when cleared', () => {
    const d = new Delayed();
    let ran = 0;
    d.add(10, () => { ran += 1; });
    d.clear();
    d.tick(100);
    expect(ran).toBe(0);
  });
});

describe('blowWaitMs', () => {
  it('waits for a short wind-up and not for a long one', () => {
    expect(blowWaitMs(undefined)).toBe(0);
    expect(blowWaitMs({ row: 0, n: 5, ms: [80, 90, 30, 90, 100], loop: false })).toBe(170);
    // 600 ms of wind-up: the clip is hurried so its blow comes at the longest wait.
    expect(blowRate({ row: 0, n: 4, ms: [300, 300, 40, 90], loop: false })).toBeCloseTo(600 / MAX_BLOW_WAIT_MS);
    expect(blowWaitMs({ row: 0, n: 4, ms: [300, 300, 40, 90], loop: false })).toBeCloseTo(MAX_BLOW_WAIT_MS);
    // 1200 ms: too long even hurried — played as drawn, not waited for.
    expect(blowRate({ row: 0, n: 4, ms: [600, 600, 40, 90], loop: false })).toBe(1);
    expect(blowWaitMs({ row: 0, n: 4, ms: [600, 600, 40, 90], loop: false })).toBe(0);
  });

  it('gives every ability of every class a wait that never trails the life bar by long', () => {
    const waits: Record<string, number> = {};
    for (const classKey of CLASS_KEYS) {
      const anims = figureMeta(classKey)?.anims ?? {};
      for (const ability of Object.values(ABILITIES)) {
        if (!ability.key.startsWith(`${classKey}_`)) continue;
        const anim = anims[heroAbilityClip(classKey, ability.key)];
        expect(anim, `${ability.key} has a clip`).toBeDefined();
        const wait = blowWaitMs(anim);
        expect(wait).toBeGreaterThanOrEqual(0);
        expect(wait).toBeLessThanOrEqual(MAX_BLOW_WAIT_MS + 1e-6);
        if (anim !== undefined && wait > 0) expect(wait).toBeCloseTo(impactMs(anim) / blowRate(anim));
        waits[ability.key] = wait;
      }
    }
    // The blows this exists for: the Knight's cleaves land with the blade.
    expect(waits.knight_riposte).toBeGreaterThan(0);
    expect(waits.knight_debilitate).toBeGreaterThan(0);
    // And the shots that used to leave before the bow was drawn: they wait for the (hurried) release.
    expect(waits.ranger_aimedshot).toBeCloseTo(MAX_BLOW_WAIT_MS);
    expect(waits.ranger_focus).toBeCloseTo(MAX_BLOW_WAIT_MS);
  });
});
