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
import { basicDamage, typicalHero } from '@/sim/reference';
import { mixedMitigation } from '@/sim/damageMix';
import { makeRng, deriveSeed } from '@/sim/rng';
import type { ItemInstance } from '@/sim/items';
import type { GemInstance } from '@/data/gems';
import type { Bonuses } from '@/sim/bonuses';
import type { ChestType } from '@/data/chests';
import type { SlotKey } from '@/data/itemSlots';
import type { StatKey } from '@/data/stats';
import { GEMS } from '@/data/gems';

/** Role-weighted power score for a hero config (higher = stronger). Since the power curve (2026-11-22) each part is
 *  RELATIVE to the typical hero of its class at the stage the player gears for (SCORE_CONTEXT.stage, sim/reference):
 *  its damage a second, its effective life and its healing, each ÷ the typical one's — so a point of life and a point
 *  of damage weigh what they do in the fight at any size of the numbers (raw, a Ranger's 50 000 life outweighed its
 *  damage and the probe dressed it as a tank). Blended by class role. Used only to compare equip candidates. */
export function heroScore(config: HeroConfig, party: readonly HeroConfig[]): number {
  const eff = scoredStats(config, party);
  const typ = typicalOf(config.classKey, SCORE_CONTEXT.stage);
  const dps = basicDamage(config.classKey, eff).dps / typ.dps;
  const ehpAbs = effectiveLife(eff);
  const ehp = ehpAbs / typ.ehp;
  const heal = (1 + Math.max(0, eff.healPower) / 100) / typ.heal;
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
  return need > 0 && ehpAbs < need ? score * (ehpAbs / need) : score;
}

/** The typical hero of a class at a stage, as the score's yardstick (memoised). */
const typicalMemo = new Map<string, { dps: number; ehp: number; heal: number }>();
function typicalOf(classKey: string, S: number): { dps: number; ehp: number; heal: number } {
  const key = `${classKey}|${Math.round(S)}|${SCORE_CONTEXT.magicShare}`;
  const hit = typicalMemo.get(key);
  if (hit !== undefined) return hit;
  const t = typicalHero(classKey, Math.max(1, Math.round(S)));
  const eff = aggregate(heroBaseStats(t.classKey, t.level), heroStaticMods(t, []));
  const v = { dps: Math.max(1e-9, basicDamage(classKey, eff).dps), ehp: Math.max(1e-9, effectiveLife(eff)), heal: 1 + Math.max(0, eff.healPower) / 100 };
  typicalMemo.set(key, v);
  return v;
}

/** Life over the share of a hit that gets through at the scored stage and boss mix. */
function effectiveLife(eff: ReturnType<typeof aggregate>): number {
  return eff.health / Math.max(0.05, 1 - mixedMitigation(eff.armor, eff.magicResist, SCORE_CONTEXT.magicShare, SCORE_CONTEXT.stage));
}

/** The effective life the score weighs (life through armour and magic resist at the scored stage). */
export function heroEhp(config: HeroConfig, party: readonly HeroConfig[]): number {
  return effectiveLife(scoredStats(config, party));
}

/** What the player gears against (round 5, 2026-11-16): the share of the damage that is magic — the next wall's
 *  boss's own mix (data/bossKit BOSS_MAGIC_SHARE), set by the loop as the party moves on. 0.5 weighs armour and
 *  magic resist alike (the old score). */
export const SCORE_CONTEXT: { magicShare: number; stage: number; ignoreStat?: StatKey } = { magicShare: 0.5, stage: 1 };

/** The hero's stats as the player weighs them: with SCORE_CONTEXT.ignoreStat (tooling, ProbeConfig.ignoreStat — "a
 *  player who never looks at magic resist") that stat counts as zero. heroEhp reads the same, so the life a hero learns
 *  to ask for after dying at a wall (SURVIVAL_NEED) is life without it: the player answers with health and armour,
 *  never by learning the ignored stat back. */
function scoredStats(config: HeroConfig, party: readonly HeroConfig[]): ReturnType<typeof aggregate> {
  const eff = aggregate(heroBaseStats(config.classKey, config.level), heroStaticMods(config, partyAuraMods(party)));
  const k = SCORE_CONTEXT.ignoreStat;
  return k === undefined ? eff : { ...eff, [k]: 0 };
}

/** A gem the player never sockets: one that grants the ignored stat (with magic resist, the Diamond). */
function ignoredGem(gem: GemInstance): boolean {
  const k = SCORE_CONTEXT.ignoreStat;
  return k !== undefined && GEMS[gem.key].grants.includes(k);
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
    if (ignoredGem(gem)) continue;
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
