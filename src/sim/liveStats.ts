import type { Combatant } from './world';
import { aggregateSums, sumMods, type EffectiveStats, type ModSums, type StatMod } from './stats';
import { effectStatMods } from './effects';
import type { TargetCondition } from '@/data/talents';
import { effectDef } from '@/data/effects';
import { RANGE } from '@/data/field';
import { blockStreakReduction } from './passives';

// A combatant's stats RIGHT NOW, and the role talents' conditional bonuses (docs/redesign/CLASSES.md, F4).
// Pure reads of the combatant; combat and ability resolution both go through here so a conditional stat
// (Unyielding: less damage taken while under 40 % life) counts everywhere the stat is read.

/** The static mods (gear, talents, auras) summed once per array: a combatant's `staticMods` is only ever replaced
 *  whole (sim/loadout), never edited, so the array itself is the key. A pure cache — the stats are the same. */
const staticSums = new WeakMap<readonly StatMod[], ModSums>();
function sumsOfStatic(mods: readonly StatMod[]): ModSums {
  let sums = staticSums.get(mods);
  if (sums === undefined) {
    sums = sumMods(mods);
    staticSums.set(mods, sums);
  }
  return sums;
}

/** The stats from base + static mods alone, per static-mods array (and its base): what a combatant has whenever no
 *  effect, low-life stat or Weathered Hide is on it — most reads. Shared: callers only read stats. */
const staticStats = new WeakMap<readonly StatMod[], { base: Combatant['baseStats']; stats: EffectiveStats }>();

/** Base stats + static mods (gear, talents, auras) + active effects + the stats that hold only while the
 *  combatant's own life is under a share. */
export function liveStats(c: Combatant): EffectiveStats {
  const effectMods = effectStatMods(c.effects);
  let lowHp = false;
  if (c.lowHpMods !== undefined) for (const m of c.lowHpMods) if (c.hp < c.maxHp * m.hpBelow) lowHp = true;
  const hide = c.hideStacks !== undefined && c.hideStacks > 0;
  if (effectMods.length === 0 && !lowHp && !hide) {
    const hit = staticStats.get(c.staticMods);
    if (hit !== undefined && hit.base === c.baseStats) return hit.stats;
    const stats = aggregateSums(c.baseStats, sumsOfStatic(c.staticMods));
    staticStats.set(c.staticMods, { base: c.baseStats, stats });
    return stats;
  }
  const base = sumsOfStatic(c.staticMods);
  const sums: ModSums = { flat: { ...base.flat }, pct: { ...base.pct } };
  sumMods(effectMods, sums);
  if (lowHp && c.lowHpMods !== undefined) {
    for (const m of c.lowHpMods) if (c.hp < c.maxHp * m.hpBelow) sumMods([m.mod], sums);
  }
  // Weathered Hide: blocked hits banked as damage reduction.
  if (hide) sumMods([{ key: 'damageReduction', mode: 'percent', value: blockStreakReduction(c) }], sums);
  return aggregateSums(c.baseStats, sums);
}

/** Bleeding, burning or slowed: a damage-over-time effect, or a slow, on it. */
function afflicted(target: Combatant): boolean {
  for (const e of target.effects) {
    if (e.remainingMs <= 0) continue;
    const kind = effectDef(e.defKey).kind;
    if (kind.type === 'dot') return true;
    if (kind.type === 'statMod' && kind.stat === 'attackSpeed' && e.value < 0) return true;
  }
  return false;
}

function meets(when: TargetCondition, target: Combatant, source: Combatant): boolean {
  switch (when.type) {
    case 'hpBelow':
      return target.hp < target.maxHp * when.frac;
    case 'approaching':
      return target.engaged !== true; // still walking in: it has not reached the fight
    case 'eliteOrBoss':
      return target.isElite === true || target.isBoss === true;
    case 'firstHit':
      return target.struckBy === undefined || !target.struckBy.includes(source.id);
    case 'ranged':
      return target.range >= RANGE.ranged;
    case 'afflicted':
      return afflicted(target);
    case 'always':
      return true;
  }
}

/** Multiplier on what `source` deals to `target` — damage, or a heal — from its role talents: 1 + Σ(pct)/100
 *  over the bonuses whose condition the target meets. Exactly 1 for a combatant without any. */
export function dealtMult(source: Combatant, target: Combatant, what: 'damage' | 'heal'): number {
  const bonuses = source.dealtBonuses;
  if (bonuses === undefined) return 1;
  let pct = 0;
  for (const b of bonuses) if (b.what === what && meets(b.when, target, source)) pct += b.pct;
  return 1 + pct / 100;
}

/** `source` has just hit the enemy `target` (a blow, an ability, a bleed laid on it): from now on it is not its
 *  first hit on it (First Blood). Only heroes that care keep the list. */
export function noteStruck(source: Combatant, target: Combatant): void {
  if (source.dealtBonuses === undefined || target.side !== 'enemy') return;
  if (!source.dealtBonuses.some((b) => b.when.type === 'firstHit')) return;
  const list = (target.struckBy ??= []);
  if (!list.includes(source.id)) list.push(source.id);
}
