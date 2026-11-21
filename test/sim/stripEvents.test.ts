import { describe, expect, it } from 'vitest';
import { MERCHANT, RUNAWAY, STRIP_EVENT_GAP_MS } from '@/data/stripEvents';
import { getBonuses } from '@/sim/bonuses';
import { gapBefore, makeStripEvent, newClock } from '@/sim/stripEvents';
import { Simulation, createWorld, TICK_MS, type TickContext } from '@/sim/Simulation';
import { chestCountOf } from '@/data/chests';
import { godHero } from './_helpers';

// The strip events (user, 2026-11-21): a runaway chest and a wandering merchant, about every 12 minutes of live
// play, never in away-time or the probes, on their own stream.

const bonuses = getBonuses({}, {});
const live: TickContext = { bonuses, ownedPetKeys: [], retryStage: true, stripEvents: true };

describe('strip events', () => {
  it('come every 8 to 16 minutes, about 12 on average', () => {
    const gaps = Array.from({ length: 400 }, (_, n) => gapBefore(7, n));
    for (const g of gaps) {
      expect(g).toBeGreaterThanOrEqual(STRIP_EVENT_GAP_MS.min);
      expect(g).toBeLessThanOrEqual(STRIP_EVENT_GAP_MS.max);
    }
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length / 60_000;
    expect(mean).toBeGreaterThan(11);
    expect(mean).toBeLessThan(13);
  });

  it('event n of a save is always the same event; two in a row are never the same kind', () => {
    expect(makeStripEvent(7, 3, 25, undefined, ['knight'])).toEqual(makeStripEvent(7, 3, 25, undefined, ['knight']));
    let last: 'runaway' | 'merchant' | undefined;
    for (let n = 0; n < 20; n++) {
      const ev = makeStripEvent(7, n, 25, last, ['knight']);
      expect(ev.kind).not.toBe(last);
      last = ev.kind;
    }
  });

  it('a runaway is a common or stage-boss chest; a merchant sells two pieces and a gem, priced, never a key', () => {
    const run = makeStripEvent(7, 0, 25, 'merchant', ['knight']);
    expect(run.kind).toBe('runaway');
    expect(run.totalMs).toBe(RUNAWAY.ms);
    expect(['normal', 'stageBoss']).toContain(run.chest);
    const shop = makeStripEvent(7, 1, 25, 'runaway', ['knight', 'priest']);
    expect(shop.kind).toBe('merchant');
    expect(shop.offers).toHaveLength(MERCHANT.items + MERCHANT.gems);
    for (const o of shop.offers ?? []) expect(o.price).toBeGreaterThan(0);
  });

  it('the clock runs only in live play, and the combat stream does not move with it', () => {
    const run = (ctx: TickContext): { stage: number; rng: number; count: number } => {
      const world = createWorld(5, [godHero('h0'), godHero('h1')]);
      world.stripEvents = newClock(5, 0);
      const sim = new Simulation(world);
      for (let i = 0; i < (40 * 60_000) / TICK_MS; i++) sim.tick(ctx);
      return { stage: world.globalStageIndex, rng: world.rngState, count: world.stripEvents.count };
    };
    const off = run({ ...live, stripEvents: false });
    const on = run(live);
    expect(off.count).toBe(0);
    expect(on.count).toBeGreaterThanOrEqual(2); // 40 minutes: two to five events
    expect(on.count).toBeLessThanOrEqual(5);
    expect(on.rng).toBe(off.rng); // the same fight, byte for byte
    expect(on.stage).toBe(off.stage);
    expect(run({ ...live, offline: true }).count).toBe(0); // never away-time
  });

  it('a caught runaway joins the storage, or is lost when it is full; a missed one runs away', () => {
    const world = createWorld(5, [godHero('h0')]);
    world.stripEvents = { count: 1, nextInMs: 1e9, active: { n: 0, kind: 'runaway', ms: 0, totalMs: RUNAWAY.ms, chest: 'normal' } };
    const sim = new Simulation(world);
    expect(sim.catchRunaway(bonuses)).toBe('stored');
    expect(chestCountOf(world.chests, 'normal')).toBe(1);
    expect(sim.catchRunaway(bonuses)).toBeNull(); // gone
    world.chests = [{ type: 'normal', dropStage: 1, count: 99 }];
    world.stripEvents.active = { n: 1, kind: 'runaway', ms: 0, totalMs: RUNAWAY.ms, chest: 'normal' };
    expect(sim.catchRunaway(bonuses)).toBe('full');
    world.stripEvents.active = { n: 2, kind: 'runaway', ms: 0, totalMs: RUNAWAY.ms, chest: 'normal' };
    for (let i = 0; i <= RUNAWAY.ms / TICK_MS; i++) sim.tick(live);
    expect(world.stripEvents.active).toBeUndefined();
  });

  it('each merchant offer sells once', () => {
    const world = createWorld(5, [godHero('h0')]);
    world.stripEvents = { count: 1, nextInMs: 1e9, active: makeStripEvent(5, 1, 25, 'runaway', ['knight']) };
    const sim = new Simulation(world);
    expect(sim.merchantOffer(0)).toBeDefined();
    sim.markSold(0);
    expect(sim.merchantOffer(0)).toBeUndefined();
    expect(sim.merchantOffer(2)).toBeDefined();
    expect(sim.merchantOffer(9)).toBeUndefined();
  });
});
