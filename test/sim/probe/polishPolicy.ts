// THE PROBE'S POLISHING (round 17, 2026-11-17; the Cube's Pulir, sim/cube polishCost / polishRoll). Setting a quarter
// of its gold income aside (POLISH_INCOME_SHARE; the rest buys research as before), the average player polishes the
// substats of the pieces it WEARS — the most valuable piece first, its weakest substat first — while the next polish
// fits in that purse, and keeps the better of the old and the new value. A piece is left alone once every substat it has short of ★ is at
// POLISH_GOOD_ENOUGH of the best normal roll: past that only the ★ (5 %) is left to chase, at ×1.5 a try.
import { polishCost, polishRoll, canPolishAffix, polishCount, itemGoldValue } from '@/sim/cube';
import { perfectStatValue } from '@/sim/loot';
import { tierDef } from '@/data/tiers';
import { PERFECT_STAT_BONUS } from '@/data/lootTables';
import type { ItemInstance } from '@/sim/items';
import type { HeroConfig } from '@/sim/loadout';
import type { SlotKey } from '@/data/itemSlots';

/** The share of its gold income the player sets aside for polishing (probe/loop, once the trio is formed). */
export const POLISH_INCOME_SHARE = 0.25;
/** The share of that purse the next polish may cost. */
export const POLISH_BUDGET_SHARE = 1;
/** A substat at this share of its best normal roll is good enough. */
export const POLISH_GOOD_ENOUGH = 0.9;

/** How close substat #i is to its best normal roll (1 = the top of the band; a ★ is above it). */
function rollShare(item: ItemInstance, i: number): number {
  const stat = item.stats[i];
  if (stat === undefined) return 1;
  const best = perfectStatValue(stat.key, tierDef(item.tier).statMultiplier, item.ilvl) / (1 + PERFECT_STAT_BONUS);
  return best > 0 ? stat.value / best : 1;
}

/** Polish the party's worn gear in place. Returns the gold left, what it spent and how many polishes it made. */
export function polishGear(party: HeroConfig[], gold: number): { gold: number; spent: number; polishes: number } {
  let purse = gold;
  let spent = 0;
  let count = 0;
  const worn: { hero: HeroConfig; slot: SlotKey }[] = [];
  for (const hero of party) for (const slot of Object.keys(hero.equipment) as SlotKey[]) worn.push({ hero, slot });
  worn.sort((a, b) => itemGoldValue(b.hero.equipment[b.slot] as ItemInstance) - itemGoldValue(a.hero.equipment[a.slot] as ItemInstance));
  for (const { hero, slot } of worn) {
    for (;;) {
      const item = hero.equipment[slot];
      if (item === undefined) break;
      let pick = -1;
      let low = POLISH_GOOD_ENOUGH;
      for (let i = 0; i < item.stats.length; i++) {
        if (!canPolishAffix(item, i)) continue;
        const share = rollShare(item, i);
        if (share < low) { low = share; pick = i; }
      }
      if (pick < 0) break;
      const cost = polishCost(item);
      if (cost > POLISH_BUDGET_SHARE * purse) break;
      const roll = polishRoll(item, pick);
      purse -= cost;
      spent += cost;
      count += 1;
      const old = item.stats[pick];
      const better = roll !== null && old !== undefined && (roll.perfect === true || roll.value > old.value);
      hero.equipment = { ...hero.equipment, [slot]: { ...item, polishes: polishCount(item) + 1, stats: better ? item.stats.map((s, i) => (i === pick ? roll : s)) : item.stats } };
    }
  }
  return { gold: purse, spent, polishes: count };
}
