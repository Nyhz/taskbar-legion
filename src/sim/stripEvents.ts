import { MERCHANT, RUNAWAY, STRIP_EVENT_GAP_MS, STRIP_EVENT_KINDS, type StripEventKind } from '@/data/stripEvents';
import { CHEST_TYPES, type ChestType } from '@/data/chests';
import { GENERATOR_VERSION } from '@/data/lootTables';
import { ALCHEMY_BASE, ALCHEMY_TIER_MULT } from '@/data/cube';
import type { GemInstance, GemTier } from '@/data/gems';
import { deriveSeed, makeRng, type Rng } from './rng';
import { generateItem, rollTier } from './loot';
import { generateGem } from './gems';
import { itemGoldValue } from './cube';
import type { ItemInstance } from './items';

// The strip's events (data/stripEvents): when the next one comes, what it is, and what it holds. Pure and
// deterministic — event n of a save is always the same event, drawn from (seed, n) on its own stream, so the
// combat and loot streams never move. The simulation owns the clock (Simulation.tickStripEvent); taps are intents.

export interface MerchantOffer {
  entry: ItemInstance | GemInstance;
  price: number;
  sold: boolean;
}

export interface StripEvent {
  n: number; // its number in the save (the seed of everything in it)
  kind: StripEventKind;
  ms: number; // how long it has been on the strip
  totalMs: number; // how long it stays
  chest?: ChestType; // runaway: the chest it is
  offers?: MerchantOffer[]; // merchant: what it sells
}

/** The strip-event clock a world carries: the count so far (persisted), the wait for the next and the one on. */
export interface StripEventClock {
  count: number;
  nextInMs: number;
  lastKind?: StripEventKind;
  active?: StripEvent;
}

const SALT_GAP = 0x5e7;
const SALT_EVENT = 0xe7e;

/** The wait before event `n` (ms of live play). */
export function gapBefore(seed: number, n: number): number {
  const rng = makeRng(deriveSeed(deriveSeed(seed, SALT_GAP), n));
  return Math.round(STRIP_EVENT_GAP_MS.min + rng.next() * (STRIP_EVENT_GAP_MS.max - STRIP_EVENT_GAP_MS.min));
}

export function newClock(seed: number, count: number): StripEventClock {
  return { count, nextInMs: gapBefore(seed, count) };
}

function pickWeighted<T extends string>(weights: Readonly<Record<T, number>>, keys: readonly T[], rng: Rng): T {
  const total = keys.reduce((sum, k) => sum + Math.max(0, weights[k]), 0);
  let roll = rng.next() * total;
  for (const k of keys) {
    roll -= Math.max(0, weights[k]);
    if (roll < 0) return k;
  }
  return keys[0] as T;
}

/** What a gem of `tier` costs at the merchant on stage `S` with gear around item level `ilvl`. */
export function gemPrice(tier: number, ilvl: number): number {
  return Math.max(1, Math.round(ALCHEMY_BASE * ALCHEMY_TIER_MULT ** tier * ilvl * MERCHANT.priceMult * MERCHANT.gemPriceShare));
}

/** What the merchant asks for a gear piece. */
export function itemPrice(item: ItemInstance): number {
  return Math.max(1, itemGoldValue(item) * MERCHANT.priceMult);
}

/** Event `n` of a save at stage `S` (`lastKind`: the one before it — two in a row are never the same kind while
 *  there is another). `partyClasses`: the classes a class-locked piece may be for, as chest loot. */
export function makeStripEvent(seed: number, n: number, S: number, lastKind: StripEventKind | undefined, partyClasses: string[]): StripEvent {
  const rng = makeRng(deriveSeed(deriveSeed(seed, SALT_EVENT), n));
  const kinds = STRIP_EVENT_KINDS.filter((k) => k !== lastKind);
  const kind = rng.pick(kinds.length > 0 ? kinds : STRIP_EVENT_KINDS);
  if (kind === 'runaway') {
    return { n, kind, ms: 0, totalMs: RUNAWAY.ms, chest: pickWeighted(RUNAWAY.chestWeights, CHEST_TYPES, rng) };
  }
  const offers: MerchantOffer[] = [];
  for (let i = 0; i < MERCHANT.items; i++) {
    const item = generateItem({ rollSeed: rng.int(0x7fffffff), stageIndex: S, chestType: 'stageBoss', generatorVersion: GENERATOR_VERSION }, partyClasses);
    offers.push({ entry: item, price: itemPrice(item), sold: false });
  }
  const ilvl = offers.length > 0 ? Math.round(offers.reduce((sum, o) => sum + ('ilvl' in o.entry ? o.entry.ilvl : 0), 0) / offers.length) : 1;
  for (let i = 0; i < MERCHANT.gems; i++) {
    const tier = Math.max(1, rollTier(S, rng, 0, 'stageBoss')) as GemTier;
    const gem = generateGem({ rollSeed: rng.int(0x7fffffff), stageIndex: S, generatorVersion: GENERATOR_VERSION }, tier);
    offers.push({ entry: gem, price: gemPrice(tier, ilvl), sold: false });
  }
  return { n, kind, ms: 0, totalMs: MERCHANT.ms, offers };
}
