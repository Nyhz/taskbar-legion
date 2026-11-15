import { describe, expect, it } from 'vitest';
import { BOSS_DOWN_FADE_MS, BOSS_DOWN_MS } from '@/data/field';
import { WORLDS } from '@/data/worlds';
import { BOSS_DOWN_BLACK, bossDownBlackAlpha, smoothBeatClock } from '@/game/render/bossDown';
import { AttackLead, MAX_RATE, fitRate } from '@/game/render/attackLead';
import { clipMs, figureMeta } from '@/game/render/figureData';
import { DEATH } from '@/game/render/figureClip';

// The beat a fallen world boss gets, as the strip paints it, and the pace that lets a long boss attack be seen whole.

describe('the boss-down beat on the strip', () => {
  it('outlasts the death clip of every figure a world boss is fought as, with a moment to lie there', () => {
    for (const world of WORLDS) {
      const creature = world.worldBoss ?? world.creatures.boss; // a world without its own world boss uses the stage boss's figure
      const death = figureMeta(creature.key)?.anims[DEATH];
      expect(death, `${creature.key} has a death clip`).toBeDefined();
      if (death === undefined) continue;
      // The whole clip plays before the strip starts fading out.
      expect(clipMs(death), creature.key).toBeLessThanOrEqual(BOSS_DOWN_MS.worldBoss - BOSS_DOWN_FADE_MS);
    }
  });

  it('keeps the strip clear until the end, then fades to the teleport\'s black', () => {
    const total = BOSS_DOWN_MS.worldBoss;
    expect(bossDownBlackAlpha(0, total)).toBe(0);
    expect(bossDownBlackAlpha(total - BOSS_DOWN_FADE_MS, total)).toBe(0);
    expect(bossDownBlackAlpha(total - BOSS_DOWN_FADE_MS / 2, total)).toBeCloseTo(BOSS_DOWN_BLACK / 2);
    expect(bossDownBlackAlpha(total, total)).toBeCloseTo(BOSS_DOWN_BLACK);
    expect(bossDownBlackAlpha(total + 400, total)).toBeCloseTo(BOSS_DOWN_BLACK); // held, never past it
    expect(bossDownBlackAlpha(50, 0)).toBe(0); // no beat, no fade
  });

  it('runs its clock with the frames, never behind the simulation nor more than a tick ahead', () => {
    expect(smoothBeatClock(-1, 300, 16, 100)).toBe(300); // a beat seen for the first time
    expect(smoothBeatClock(300, 300, 16, 100)).toBe(316);
    expect(smoothBeatClock(390, 300, 16, 100)).toBe(400); // waits for the next tick
    expect(smoothBeatClock(316, 400, 16, 100)).toBe(400); // the simulation moved on: catch up
    expect(smoothBeatClock(4000, 0, 16, 100)).toBe(0); // a new beat after an old one
  });
});

describe('a clip longer than the time between two swings', () => {
  it('is played just fast enough to end before the next swing', () => {
    expect(fitRate(1000, 1250)).toBe(1); // it fits: as drawn
    expect(fitRate(1440, 1250)).toBeCloseTo(1.152); // the Harvest King's slam
    expect(fitRate(9000, 1000)).toBe(MAX_RATE);
    expect(fitRate(0, 1250)).toBe(1);
    expect(fitRate(1440, 0)).toBe(1);
  });

  it('starts its early clip later and plays it at that pace, so the blow still lands on the swing', () => {
    const lead = new AttackLead(600); // 600 ms of wind-up in a 1500 ms clip
    lead.setPace(1500, 1250); // ×1.2
    expect(lead.due(600)).toBe(false); // as drawn it would start now…
    expect(lead.due(500)).toBe(true); // …at the pace the wind-up takes 500 ms
    expect(lead.rate(500)).toBeCloseTo(1.2);
    expect(lead.rate(250)).toBeCloseTo(2.4); // a swing that comes even sooner still hurries it
    lead.started();
    lead.setPace(1500, 5000); // not while an early clip is waiting for its hit
    expect(lead.rate(500)).toBeCloseTo(1.2);
    expect(lead.claim()).toBe(true);
    lead.setPace(1500, 5000);
    expect(lead.rate(600)).toBe(1);
  });
});
