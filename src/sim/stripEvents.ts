import { MERCHANT, MERCHANTS_PER_BLOCK, RUNAWAY, STRIP_EVENT_BLOCK, STRIP_EVENT_GAP_MS, type StripEventKind } from '@/data/stripEvents';
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
  /** When it was sent away before its time (the stage's bar filled, an X-10): from here it leaves — the chest springs
   *  away where it stands, the merchant walks out — and its stay ends early (`stripEventEndMs`). `totalMs` stays the
   *  stay it was given, which its path on the strip is drawn from. */
  leaveAtMs?: number;
}

/** The strip-event clock a world carries: the count so far (persisted), the wait for the next and the one on. */
export interface StripEventClock {
  count: number;
  nextInMs: number;
  lastKind?: StripEventKind; // the last one's kind (kept for old saves; the kind of event n is `stripEventKind`)
  active?: StripEvent;
}

const SALT_GAP = 0x5e7;
const SALT_EVENT = 0xe7e;
const SALT_KIND = 0x4b1;

/** The kind of event `n` of a save: in every block of STRIP_EVENT_BLOCK, MERCHANTS_PER_BLOCK merchants at places drawn
 *  from (seed, block), the rest runaway chests — three in four (user, 2026-11-21). */
export function stripEventKind(seed: number, n: number): StripEventKind {
  const block = Math.floor(n / STRIP_EVENT_BLOCK);
  const rng = makeRng(deriveSeed(deriveSeed(seed, SALT_KIND), block));
  const slots = Array.from({ length: STRIP_EVENT_BLOCK }, (_, i) => i);
  for (let i = 0; i < MERCHANTS_PER_BLOCK; i++) {
    const at = rng.int(slots.length - i);
    const pick = slots[i + at] as number;
    slots[i + at] = slots[i] as number;
    slots[i] = pick;
  }
  return slots.slice(0, MERCHANTS_PER_BLOCK).includes(n % STRIP_EVENT_BLOCK) ? 'merchant' : 'runaway';
}

/** Send an event away before its time: from now it leaves from where it is (the chest's escape, the merchant's walk
 *  out). Once only; nothing once its own leaving has begun. */
export function sendAway(ev: StripEvent): void {
  if (ev.leaveAtMs !== undefined) return;
  const ownLeaving = ev.totalMs - (ev.kind === 'runaway' ? RUNAWAY.escapeMs : MERCHANT.walkMs);
  if (ev.ms >= ownLeaving) return;
  ev.leaveAtMs = ev.ms;
}

/** When an event's stay ends: its whole stay, or — sent away — once it has left: the chest's escape, the merchant's
 *  walk out (as long as he had walked in, if he had not arrived yet). */
export function stripEventEndMs(ev: StripEvent): number {
  if (ev.leaveAtMs === undefined) return ev.totalMs;
  const leave = ev.kind === 'runaway' ? RUNAWAY.escapeMs : Math.min(MERCHANT.walkMs, ev.leaveAtMs);
  return Math.min(ev.totalMs, ev.leaveAtMs + leave);
}

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

/** Event `n` of a save at stage `S` (its kind: `stripEventKind`). `partyClasses`: the classes a class-locked piece may
 *  be for, as chest loot. */
export function makeStripEvent(seed: number, n: number, S: number, partyClasses: string[]): StripEvent {
  const rng = makeRng(deriveSeed(deriveSeed(seed, SALT_EVENT), n));
  const kind = stripEventKind(seed, n);
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
