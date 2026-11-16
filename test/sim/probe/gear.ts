// Gear acquisition + equip logic for the progression probe.
//
// The "average player" greedily equips any item that raises a hero's role-weighted power
// score for its slot, routing each piece to the hero it helps most (weapon class-lock
// respected; defensive armor naturally lands on the tank, offensive on the DPS, via the
// score deltas). Gems are socketed where they add the most (replacing a worse one, as the game allows). Since round 4e
// (2026-11-16) the leftovers go to the Cube (probe/cubePolicy.ts), a hero who keeps dying at a wall asks its gear for
// more life (SURVIVAL_NEED), and a piece is judged with its sockets filled the way the piece it replaces has them.
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
  let score: number;
  switch (config.classKey) {
    case 'knight':
      score = ehp * 0.7 + dps * 0.3;
      break;
    case 'priest':
      score = ehp * 0.4 + heal * 0.4 + dps * 0.2;
      break;
    default: // ranger / dps
      score = dps * 0.8 + ehp * 0.2;
  }
  // SURVIVAL (round 4e): a hero that keeps dying before the minute is up deals nothing after it — below the life its
  // class was seen to need at the walls, every piece of its worth shrinks in proportion, so the player buys life first.
  const need = SURVIVAL_NEED.get(config.classKey) ?? 0;
  return need > 0 && ehp < need ? score * (ehp / need) : score;
}

/** The effective life the score weighs (health cushioned by armour and magic resist). */
export function heroEhp(config: HeroConfig, party: readonly HeroConfig[]): number {
  const eff = aggregate(heroBaseStats(config.classKey, config.level), heroStaticMods(config, partyAuraMods(party)));
  return eff.health * (1 + eff.armor / 300 + eff.magicResist / 300);
}

/** The effective life each class was seen to need at the walls (class → ehp), raised by the probe when a hero of
 *  that class dies before the enrage (loop.ts). Reset at every new run (newProbeRun). Round 4e, 2026-11-16: the
 *  Ranger chose damage only and went to Eternal 8 with 541 life, dying 18–25 s into every attempt. */
export const SURVIVAL_NEED = new Map<string, number>();

/** `item` judged as it will be worn: its empty sockets filled with the gems the piece it replaces carries (a player
 *  fills a new piece from the gems that keep dropping; until round 4e a bare piece lost to a gemmed one). */
function asWorn(item: ItemInstance, old: ItemInstance | undefined): ItemInstance {
  if (old === undefined || item.sockets.every((s) => s.gem !== null)) return item;
  const spare = old.sockets.map((s) => s.gem).filter((g) => g !== null);
  let k = 0;
  return { ...item, sockets: item.sockets.map((s) => (s.gem !== null ? s : { gem: spare[k++] ?? null })) };
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
): { items: ItemInstance[]; gems: GemInstance[]; keys: number } {
  const items: ItemInstance[] = [];
  const gems: GemInstance[] = [];
  let keys = 0; // world-boss keys the chests held (stage-boss chests only; all for this drop stage's world)
  for (let i = 0; i < count; i++) {
    const rng = makeRng(deriveSeed(seed, drawCursor.n));
    drawCursor.n += 1;
    const r = openChest(type, dropStage, rng, bonuses, allowedClasses);
    items.push(...r.items);
    gems.push(...r.gems);
    for (const n of Object.values(r.keys)) keys += n;
  }
  return { items, gems, keys };
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
      const delta = heroScore(withEquip(cfg, asWorn(item, cfg.equipment[item.slot])), party) - heroScore(cfg, party);
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

/** Socket each gem into the socket (across the party's equipped items) where it adds the most score. As in the
 *  game (state/slices/partySlice.socketGem), a gem may REPLACE one already set when that is better for the hero —
 *  the old gem is lost (round 4b, 2026-11-16: until then the probe only filled empty sockets, so its party carried
 *  the mixed-rarity gems of its first drops for ever). `replace: false` keeps the old fill-only rule (the option-C
 *  reference set fills each socket with exactly its own gem). Skips a gem if no socket helps. Mutates in place. */
export function socketGems(party: HeroConfig[], gems: readonly GemInstance[], replace = true): boolean {
  let changed = false;
  for (const gem of gems) {
    let best: { cfgIdx: number; slot: SlotKey; socketIdx: number; delta: number } | null = null;
    for (let i = 0; i < party.length; i++) {
      const cfg = party[i];
      if (cfg === undefined) continue;
      const before = heroScore(cfg, party);
      for (const [slot, item] of Object.entries(cfg.equipment) as [SlotKey, ItemInstance][]) {
        for (let s = 0; s < item.sockets.length; s++) {
          if (!replace && (item.sockets[s]?.gem ?? null) !== null) continue; // occupied
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
