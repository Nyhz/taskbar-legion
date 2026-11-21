import { describe, expect, it } from 'vitest';
import { MERCHANT, RUNAWAY, STRIP_EVENT_BLOCK, STRIP_EVENT_GAP_MS } from '@/data/stripEvents';
import { wavesPerStage } from '@/data/stageScaling';
import { getBonuses } from '@/sim/bonuses';
import { gapBefore, makeStripEvent, newClock, sendAway, stripEventEndMs, stripEventKind, type StripEvent } from '@/sim/stripEvents';
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

  it('event n of a save is always the same event; three in four are the runaway chest, one merchant in every four', () => {
    expect(makeStripEvent(7, 3, 25, ['knight'])).toEqual(makeStripEvent(7, 3, 25, ['knight']));
    for (const seed of [1, 7, 99]) {
      for (let block = 0; block < 25; block++) {
        const kinds = Array.from({ length: STRIP_EVENT_BLOCK }, (_, i) => stripEventKind(seed, block * STRIP_EVENT_BLOCK + i));
        expect(kinds.filter((k) => k === 'merchant')).toHaveLength(1);
        expect(kinds.filter((k) => k === 'runaway')).toHaveLength(3);
      }
    }
    // …and the merchant's place in the block changes.
    const places = new Set(Array.from({ length: 40 }, (_, b) => [0, 1, 2, 3].find((i) => stripEventKind(7, b * 4 + i) === 'merchant')));
    expect(places.size).toBeGreaterThan(2);
  });

  it('the chest stays a minute or more, the merchant a minute standing', () => {
    expect(RUNAWAY.ms).toBeGreaterThanOrEqual(60_000 + RUNAWAY.escapeMs);
    expect(MERCHANT.ms - 2 * MERCHANT.walkMs).toBeGreaterThanOrEqual(60_000);
  });

  it('a runaway is a common or stage-boss chest; a merchant sells two pieces and a gem, priced, never a key', () => {
    const nRun = [0, 1, 2, 3].find((n) => stripEventKind(7, n) === 'runaway') ?? 0;
    const nShop = [0, 1, 2, 3].find((n) => stripEventKind(7, n) === 'merchant') ?? 0;
    const run = makeStripEvent(7, nRun, 25, ['knight']);
    expect(run.kind).toBe('runaway');
    expect(run.totalMs).toBe(RUNAWAY.ms);
    expect(['normal', 'stageBoss']).toContain(run.chest);
    const shop = makeStripEvent(7, nShop, 25, ['knight', 'priest']);
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
    const nShop = [0, 1, 2, 3].find((n) => stripEventKind(5, n) === 'merchant') ?? 0;
    world.stripEvents = { count: 1, nextInMs: 1e9, active: makeStripEvent(5, nShop, 25, ['knight']) };
    const sim = new Simulation(world);
    expect(sim.merchantOffer(0)).toBeDefined();
    sim.markSold(0);
    expect(sim.merchantOffer(0)).toBeUndefined();
    expect(sim.merchantOffer(2)).toBeDefined();
    expect(sim.merchantOffer(9)).toBeUndefined();
  });

  it('none comes on an X-10 or once the bar of the stage has filled; one on then leaves with its leaving', () => {
    const world = createWorld(5, [godHero('h0')]);
    world.stripEvents = { count: 0, nextInMs: TICK_MS, active: undefined };
    world.wavesThisStage = wavesPerStage(world.globalStageIndex); // the bar is full: the stage boss is coming
    const sim = new Simulation(world);
    sim.tick(live);
    expect(world.stripEvents.active).toBeUndefined();
    expect(world.stripEvents.count).toBe(0);

    // An X-10 (a world-boss stage; the party stands there): none comes however long it waits.
    const x10 = createWorld(5, [godHero('h0')]);
    x10.globalStageIndex = 10;
    x10.stripEvents = { count: 0, nextInMs: TICK_MS, active: undefined };
    const standing = new Simulation(x10);
    for (let i = 0; i < 50; i++) standing.tick(live);
    expect(x10.stripEvents.active).toBeUndefined();
    expect(x10.stripEvents.count).toBe(0);

    // A chest on the strip there: it springs away from where it is, and is gone once it has.
    x10.stripEvents.active = { n: 0, kind: 'runaway', ms: 20_000, totalMs: RUNAWAY.ms, chest: 'normal' };
    standing.tick(live);
    expect(x10.stripEvents.active?.leaveAtMs).toBe(20_000 + TICK_MS);
    for (let i = 0; i < RUNAWAY.escapeMs / TICK_MS; i++) standing.tick(live);
    expect(x10.stripEvents.active).toBeUndefined();
  });

  it('a merchant sent away walks out as long as he had walked in; once leaving, he is not sent away again', () => {
    const shop: StripEvent = { n: 0, kind: 'merchant', ms: 1_000, totalMs: MERCHANT.ms };
    sendAway(shop);
    expect(stripEventEndMs(shop)).toBe(2_000); // he had walked a second in
    const late: StripEvent = { n: 1, kind: 'merchant', ms: MERCHANT.ms - 1_000, totalMs: MERCHANT.ms };
    sendAway(late);
    expect(late.leaveAtMs).toBeUndefined(); // already on his way out
    expect(stripEventEndMs(late)).toBe(MERCHANT.ms);
  });
});
