// The probe's average player at the Cube (round 4e, 2026-11-16: the user keeps the Cube as it is — 9 pieces of one
// rarity make 1 of the next, at the median item level of the nine, a class of the party; one affix of a piece can be
// changed once, for gems). The game's own functions (sim/cube.ts) do the crafting; this file is only the player's
// habit, kept cheap and sensible:
//   - what it does not wear it keeps, if it is of the world's top rarities (the top one and the two below) — up to what
//     a bag and the first stash page hold — and throws away the rest (or the oldest when the bag is full);
//   - nine pieces of one rarity → synthesize, the nine of highest item level (so, mostly the current world's); the new
//     piece is worn if it helps, else it waits in the bag (nine of them make the next rarity);
//   - the same with gems it has no socket for;
//   - a piece of the world's top two rarities it wears is transfigured once, on the affix whose (previewed, so known)
//     replacement helps most — only if it helps, paying two gems a rarity below, or one of its rarity.
// No gate in the game: the Cube needs no tech and costs no gold; its limits are the bag and the stash.

import { synthesize, synthesizeGems, transfigCostOptions, transfigureRoll, canTransfigure, CUBE_INPUT_COUNT } from '@/sim/cube';
import { SYNTH_DOUBLE_TIER_CHANCE } from '@/data/cube';
import { INVENTORY_BASE, STASH_PER_PAGE } from '@/data/inventory';
import { tierWeightsAt } from '@/data/difficulties';
import type { HeroConfig } from '@/sim/loadout';
import type { ItemInstance } from '@/sim/items';
import type { GemInstance } from '@/data/gems';
import type { Bonuses } from '@/sim/bonuses';
import type { SlotKey } from '@/data/itemSlots';
import { equipItems, socketGems, heroScore } from './gear';

/** What the bag and the first stash page hold (the probe buys no storage). */
export const CUBE_HOLD = INVENTORY_BASE + STASH_PER_PAGE;
/** How many rarities under the world's top one the player keeps for the Cube. */
export const CUBE_KEEP_BELOW_TOP = 2;

export interface CubeBag {
  items: ItemInstance[];
  gems: GemInstance[];
  madeItems: number[]; // pieces synthesized, by the rarity that came out
  madeGems: number[]; // gems synthesized, by rarity
  transfigured: number; // pieces transfigured
  madeIds: Set<string>; // ids of every piece the Cube made (what the party wears of them, at the end)
  checked: Set<string>; // pieces already looked at for a transfiguration that would help (none did)
  n: number; // minted-id counter for gems
}

export function newCubeBag(): CubeBag {
  return { items: [], gems: [], madeItems: Array(9).fill(0), madeGems: Array(9).fill(0), transfigured: 0, madeIds: new Set(), checked: new Set(), n: 0 };
}

function topTierAt(S: number): number {
  const w = tierWeightsAt(S);
  let top = 0;
  w.forEach((x, t) => { if (x > 0) top = t; });
  return top;
}

const wornIds = (party: readonly HeroConfig[]): Set<string> => new Set(party.flatMap((h) => Object.values(h.equipment).map((i) => i?.id ?? '')));
const wornGems = (party: readonly HeroConfig[]): Set<GemInstance> =>
  new Set(party.flatMap((h) => Object.values(h.equipment).flatMap((i) => (i?.sockets ?? []).map((s) => s.gem).filter((g): g is GemInstance => g !== null))));

/** One visit to the Cube after a batch of chests at global stage `S`: keep the leftovers, craft, transfigure.
 *  Mutates `bag` and `party`; returns true when the party's gear changed. */
export function cubeStep(bag: CubeBag, party: HeroConfig[], S: number, items: readonly ItemInstance[], gems: readonly GemInstance[], bonuses: Bonuses, classes: string[]): boolean {
  const top = topTierAt(S);
  const floor = Math.max(0, top - CUBE_KEEP_BELOW_TOP);
  let changed = false;
  const worn = wornIds(party);
  for (const it of items) if (!worn.has(it.id) && it.tier >= floor) bag.items.push(it);
  const set = wornGems(party);
  const gemsBefore = bag.gems.length;
  for (const g of gems) if (!set.has(g) && g.tier >= Math.max(1, floor)) bag.gems.push(g);
  // Spare gems into what the party wears — when there is something new to try: a gem just kept, or an empty socket
  // (a new piece comes empty). Cheap guard: socketGems weighs every gem against every socket.
  const empty = party.some((h) => Object.values(h.equipment).some((i) => (i?.sockets ?? []).some((s) => s.gem === null)));
  if (bag.gems.length > 0 && (empty || bag.gems.length > gemsBefore) && socketGems(party, bag.gems)) {
    changed = true;
    const now = wornGems(party);
    bag.gems = bag.gems.filter((g) => !now.has(g));
  }
  const luck = SYNTH_DOUBLE_TIER_CHANCE + bonuses.synthDoubleChance;
  // Items: nine of a rarity → one of the next (the nine of highest item level), lowest rarity first so a chain climbs.
  for (let t = floor; t < 8; t++) {
    for (;;) {
      const pool = bag.items.filter((i) => i.tier === t).sort((a, b) => b.ilvl - a.ilvl);
      if (pool.length < CUBE_INPUT_COUNT) break;
      const nine = pool.slice(0, CUBE_INPUT_COUNT);
      const out = synthesize(nine, luck, classes);
      const used = new Set(nine.map((i) => i.id));
      bag.items = bag.items.filter((i) => !used.has(i.id));
      if (out === null) break;
      bag.madeItems[out.tier] = (bag.madeItems[out.tier] ?? 0) + 1;
      bag.madeIds.add(out.id);
      if (equipItems(party, [out])) changed = true;
      if (!wornIds(party).has(out.id)) bag.items.push(out);
    }
  }
  // Gems the same way.
  for (let t = Math.max(1, floor); t < 8; t++) {
    for (;;) {
      const pool = bag.gems.filter((g) => g.tier === t);
      if (pool.length < CUBE_INPUT_COUNT) break;
      const nine = pool.slice(0, CUBE_INPUT_COUNT);
      const out = synthesizeGems(nine, luck);
      const used = new Set(nine);
      bag.gems = bag.gems.filter((g) => !used.has(g));
      if (out === null) break;
      const gem = { ...out, id: `cg${(bag.n += 1)}` };
      bag.madeGems[gem.tier] = (bag.madeGems[gem.tier] ?? 0) + 1;
      if (socketGems(party, [gem])) changed = true;
      if (!wornGems(party).has(gem)) bag.gems.push(gem);
    }
  }
  if (transfigure(bag, party, top)) changed = true;
  // The bag holds CUBE_HOLD entries: past it, the oldest and lowest go.
  const room = CUBE_HOLD;
  if (bag.items.length + bag.gems.length > room) {
    bag.items.sort((a, b) => b.tier - a.tier || b.ilvl - a.ilvl);
    bag.gems.sort((a, b) => b.tier - a.tier);
    const gemRoom = Math.min(bag.gems.length, Math.floor(room / 3));
    bag.gems = bag.gems.slice(0, gemRoom);
    bag.items = bag.items.slice(0, room - gemRoom);
  }
  return changed;
}

/** Transfigure the worn pieces of the world's top two rarities once each, where the known replacement helps. */
function transfigure(bag: CubeBag, party: HeroConfig[], top: number): boolean {
  let changed = false;
  for (const hero of party) {
    for (const slot of Object.keys(hero.equipment) as SlotKey[]) {
      const item = hero.equipment[slot];
      if (item === undefined || item.transfigured === true || item.tier < top - 1 || bag.checked.has(item.id)) continue;
      const pay = payment(bag, item);
      if (pay === null) continue; // no gems yet: look again later
      const before = heroScore(hero, party);
      let best: { item: ItemInstance; gain: number } | null = null;
      for (let k = 0; k < item.stats.length; k++) {
        const roll = transfigureRoll(item, k);
        if (roll === null) continue;
        const trial: ItemInstance = { ...item, stats: item.stats.map((a, j) => (j === k ? roll : a)) };
        const gain = heroScore({ ...hero, equipment: { ...hero.equipment, [slot]: trial } }, party) - before;
        if (gain > 0 && (best === null || gain > best.gain)) best = { item: trial, gain };
      }
      if (best === null) {
        bag.checked.add(item.id);
        continue;
      }
      const paid = new Set(pay);
      bag.gems = bag.gems.filter((g) => !paid.has(g));
      hero.equipment = { ...hero.equipment, [slot]: { ...best.item, transfigured: true } };
      bag.transfigured += 1;
      changed = true;
    }
  }
  return changed;
}

/** The gems the bag would pay for `item`'s transfiguration: two a rarity below if it has them, else one of its rarity. */
function payment(bag: CubeBag, item: ItemInstance): GemInstance[] | null {
  const options = [...transfigCostOptions(item)].sort((a, b) => a.tier - b.tier);
  for (const o of options) {
    const gems = bag.gems.filter((g) => g.tier === o.tier).slice(0, o.count);
    if (gems.length === o.count && canTransfigure(item, gems)) return gems;
  }
  return null;
}
