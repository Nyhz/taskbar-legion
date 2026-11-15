import { describe, expect, it } from 'vitest';
import { CLASS_KEYS } from '@/data/classes';
import { AttackLead, LEAD_GRACE_MS, MAX_RATE, abilityTakesSwing, impactMs, swingEtaMs } from '@/game/render/attackLead';
import { clipMs, figureMeta } from '@/game/render/figureData';
import { ATTACK_CLIP } from '@/game/render/heroClips';
import figs from '@/assets/strip/figs/figs.json';

describe('impactMs', () => {
  it('is the time before the snap: the first frame far shorter than the one before', () => {
    expect(impactMs({ row: 0, n: 5, ms: [80, 90, 30, 90, 100], loop: false })).toBe(170);
    // a lesser drop is still wind-up
    expect(impactMs({ row: 0, n: 6, ms: [90, 140, 60, 170, 50, 90], loop: false })).toBe(460);
    // quick opening frames are not the blow: it comes after the long hold
    expect(impactMs({ row: 0, n: 6, ms: [50, 50, 90, 170, 50, 80], loop: false })).toBe(360);
    // a double strike counts its first blow
    expect(impactMs({ row: 0, n: 7, ms: [70, 110, 40, 60, 90, 40, 130], loop: false })).toBe(180);
  });

  it('falls back to the quickest frame when nothing snaps', () => {
    expect(impactMs({ row: 0, n: 4, ms: [80, 70, 60, 90], loop: false })).toBe(150);
    expect(impactMs({ row: 0, n: 3, ms: [50, 50, 50], loop: false })).toBe(0);
  });

  it('puts the heroes\' blows where their clips strike', () => {
    expect(impactMs(figureMeta('knight')!.anims[ATTACK_CLIP]!)).toBe(360); // the sword comes down on frame 4
    expect(impactMs(figureMeta('ranger')!.anims[ATTACK_CLIP]!)).toBe(960); // the string is loosed on frame 10
    expect(impactMs(figureMeta('priest')!.anims[ATTACK_CLIP]!)).toBe(350);
  });

  it('finds a blow inside every figure\'s attack: after a wind-up, before the clip ends', () => {
    const keys = Object.keys((figs as { figs: Record<string, unknown> }).figs);
    expect(keys.length).toBeGreaterThan(CLASS_KEYS.length);
    for (const key of keys) {
      const anim = figureMeta(key)?.anims[ATTACK_CLIP];
      expect(anim, key).toBeDefined();
      if (anim === undefined) continue;
      expect(impactMs(anim), key).toBeGreaterThan(100);
      expect(impactMs(anim), key).toBeLessThan(clipMs(anim) * 0.85);
    }
  });
});

describe('swingEtaMs', () => {
  it('rounds the swing timer up to the tick it will fire on', () => {
    expect(swingEtaMs(250, 100)).toBe(300);
    expect(swingEtaMs(300, 100)).toBe(300);
    expect(swingEtaMs(1, 100)).toBe(100);
    expect(swingEtaMs(0, 100)).toBe(0);
    expect(swingEtaMs(-50, 100)).toBe(0);
  });
});

describe('AttackLead', () => {
  it('is due only when the swing is within the wind-up', () => {
    const lead = new AttackLead(360);
    expect(lead.due(900)).toBe(false);
    expect(lead.due(360)).toBe(true);
    expect(lead.due(100)).toBe(true);
    expect(lead.due(0)).toBe(false); // the swing is happening now: the hit plays the clip itself
  });

  it('starts once, and the hit that follows claims the clip instead of restarting it', () => {
    const lead = new AttackLead(360);
    lead.started();
    expect(lead.due(300)).toBe(false);
    lead.tick(350);
    expect(lead.claim()).toBe(true);
    expect(lead.claim()).toBe(false); // a second hit (multistrike) plays as usual
    expect(lead.due(300)).toBe(true);
  });

  it('plays the clip as drawn when the wind-up fits, and hurries it when the swing comes sooner', () => {
    const lead = new AttackLead(960);
    expect(lead.rate(960)).toBe(1);
    expect(lead.rate(1200)).toBe(1);
    expect(lead.rate(640)).toBeCloseTo(1.5);
    expect(lead.rate(100)).toBe(MAX_RATE);
    expect(lead.rate(0)).toBe(1);
  });

  it('stops waiting when the hit never comes', () => {
    const lead = new AttackLead(360);
    lead.started();
    lead.tick(360 + LEAD_GRACE_MS + 1);
    expect(lead.claim()).toBe(false);
  });

  it('never claims a hit it did not start a clip for', () => {
    expect(new AttackLead(360).claim()).toBe(false);
  });
});

describe('abilityTakesSwing', () => {
  const hero = (cooldown: number, timer: number) => ({
    attackTimerMs: timer, cooldowns: { a: cooldown }, abilities: [{ def: { key: 'a' } }],
  });

  it('is true when an ability comes off cooldown by the swing', () => {
    expect(abilityTakesSwing(hero(0, 300))).toBe(true);
    expect(abilityTakesSwing(hero(250, 300))).toBe(true);
    expect(abilityTakesSwing(hero(5000, 300))).toBe(false);
  });

  it('asks a charge-gated ability for its charges, not its cooldown', () => {
    const riposte = (charges: number) => ({
      attackTimerMs: 300, cooldowns: { r: 0 }, charges: { r: charges }, abilities: [{ def: { key: 'r', charge: { toCast: 4 } } }],
    });
    expect(abilityTakesSwing(riposte(3))).toBe(false);
    expect(abilityTakesSwing(riposte(4))).toBe(true);
  });

  it('does not count a reactive ability, however ready it is', () => {
    const mend = { attackTimerMs: 300, cooldowns: { m: 0 }, abilities: [{ def: { key: 'm', castCondition: 'allyBelowHpPct' } }] };
    expect(abilityTakesSwing(mend)).toBe(false);
    const cry = { attackTimerMs: 300, cooldowns: { c: 0 }, abilities: [{ def: { key: 'c', castCondition: 'enemyPresent' } }] };
    expect(abilityTakesSwing(cry)).toBe(true);
  });

  it('is false with no abilities', () => {
    expect(abilityTakesSwing({ attackTimerMs: 300, cooldowns: {}, abilities: [] })).toBe(false);
  });
});
