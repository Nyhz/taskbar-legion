// Gear acquisition + equip logic for the progression probe.
//
// The "average player" greedily equips any item that raises a hero's role-weighted power
// score for its slot, routing each piece to the hero it helps most (weapon class-lock
// respected; defensive armor naturally lands on the tank, offensive on the DPS, via the
// score deltas). Gems are socketed into open sockets where they add the most. No Cube
// crafting, no re-rolls, no inventory hoarding — looted-not-equipped items are discarded.
//
// Power is a cheap heuristic used ONLY to pick upgrades among thousands of micro-decisions;
// actual progression gates (walls) are decided by the REAL combat sim (combat.ts), so the
// heuristic only has to be directionally right.

import { openChest } from '@/sim/chests';
import { heroBaseStats, heroStaticMods, partyAuraMods, type HeroConfig } from '@/sim/loadout';
import { aggregate } from '@/sim/stats';
import { makeRng, deriveSeed } from '@/sim/rng';
import type { ItemInstance } from '@/sim/items';
import type { GemInstance } from '@/data/gems';
import type { Bonuses } from '@/sim/bonuses';
import type { ChestType } from '@/data/chests';
import type { SlotKey } from '@/data/itemSlots';

/** Role-weighted power score for a hero config (higher = stronger). Stage-free heuristic:
 *  a DPS proxy (damage × speed × crit) and an EHP proxy (health × armor/MR cushion), blended
 *  by class role. Used only to compare equip candidates. */
export function heroScore(config: HeroConfig, party: readonly HeroConfig[]): number {
  const eff = aggregate(heroBaseStats(config.classKey, config.level), heroStaticMods(config, partyAuraMods(party)));
  const dps = eff.attackDamage * eff.attackSpeed * (1 + (eff.critChance / 100) * (eff.critDamage / 100));
  const ehp = eff.health * (1 + eff.armor / 300 + eff.magicResist / 300);
  const heal = eff.health * (eff.healPower / 100);
  switch (config.classKey) {
    case 'knight':
      return ehp * 0.7 + dps * 0.3;
    case 'priest':
      return ehp * 0.4 + heal * 0.4 + dps * 0.2;
    default: // ranger / dps
      return dps * 0.8 + ehp * 0.2;
  }
}

function canEquip(config: HeroConfig, item: ItemInstance): boolean {
  // Weapon/off-hand are class-locked; armor/jewelry fit any hero.
  return item.classKey === undefined || item.classKey === config.classKey;
}

function withEquip(config: HeroConfig, item: ItemInstance): HeroConfig {
  return { ...config, equipment: { ...config.equipment, [item.slot]: item } };
}

/** Open `count` captured chests of one type at `dropStage` and return the rolled loot.
 *  Deterministic from (seed, drawCursor.n); the cursor advances per chest. */
export function openCaptured(
  type: ChestType,
  dropStage: number,
  count: number,
  seed: number,
  drawCursor: { n: number },
  bonuses: Bonuses,
  allowedClasses: string[],
): { items: ItemInstance[]; gems: GemInstance[] } {
  const items: ItemInstance[] = [];
  const gems: GemInstance[] = [];
  for (let i = 0; i < count; i++) {
    const rng = makeRng(deriveSeed(seed, drawCursor.n));
    drawCursor.n += 1;
    const r = openChest(type, dropStage, rng, bonuses, allowedClasses);
    items.push(...r.items);
    gems.push(...r.gems);
  }
  return { items, gems };
}

/** Greedily equip each item on the hero+slot where it adds the most score (must be a strict
 *  upgrade). Mutates `party` configs in place. Returns true if any equip happened. */
export function equipItems(party: HeroConfig[], items: readonly ItemInstance[]): boolean {
  let changed = false;
  for (const item of items) {
    let bestIdx = -1;
    let bestDelta = 0;
    for (let i = 0; i < party.length; i++) {
      const cfg = party[i];
      if (cfg === undefined || !canEquip(cfg, item)) continue;
      const delta = heroScore(withEquip(cfg, item), party) - heroScore(cfg, party);
      if (delta > bestDelta) {
        bestDelta = delta;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0) {
      const cfg = party[bestIdx];
      if (cfg !== undefined) {
        cfg.equipment = { ...cfg.equipment, [item.slot]: item };
        changed = true;
      }
    }
  }
  return changed;
}

/** Socket each gem into the open socket (across the party's equipped items) that adds the
 *  most score. Skips a gem if no open socket helps. Mutates configs in place. */
export function socketGems(party: HeroConfig[], gems: readonly GemInstance[]): boolean {
  let changed = false;
  for (const gem of gems) {
    let best: { cfgIdx: number; slot: SlotKey; socketIdx: number; delta: number } | null = null;
    for (let i = 0; i < party.length; i++) {
      const cfg = party[i];
      if (cfg === undefined) continue;
      const before = heroScore(cfg, party);
      for (const [slot, item] of Object.entries(cfg.equipment) as [SlotKey, ItemInstance][]) {
        for (let s = 0; s < item.sockets.length; s++) {
          if ((item.sockets[s]?.gem ?? null) !== null) continue; // occupied
          const trial: ItemInstance = {
            ...item,
            sockets: item.sockets.map((sk, idx) => (idx === s ? { gem } : sk)),
          };
          const delta = heroScore(withEquip(cfg, trial), party) - before;
          if (delta > 0 && (best === null || delta > best.delta)) {
            best = { cfgIdx: i, slot, socketIdx: s, delta };
          }
        }
      }
    }
    if (best !== null) {
      const cfg = party[best.cfgIdx];
      const item = cfg?.equipment[best.slot];
      if (cfg !== undefined && item !== undefined) {
        const sockets = item.sockets.map((sk, idx) => (idx === best!.socketIdx ? { gem } : sk));
        cfg.equipment = { ...cfg.equipment, [best.slot]: { ...item, sockets } };
        changed = true;
      }
    }
  }
  return changed;
}

/** Total party power (sum of role-weighted scores) — a cheap signature to detect when a
 *  cached combat measurement is stale (power moved ⇒ re-measure). */
export function partyPower(party: readonly HeroConfig[]): number {
  let sum = 0;
  for (const cfg of party) sum += heroScore(cfg, party);
  return sum;
}
