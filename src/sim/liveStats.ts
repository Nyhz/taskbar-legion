import type { Combatant } from './world';
import { aggregate, type EffectiveStats } from './stats';
import { effectStatMods } from './effects';
import type { TargetCondition } from '@/data/talents';

// A combatant's stats RIGHT NOW, and the role talents' conditional bonuses (docs/redesign/CLASSES.md, F4).
// Pure reads of the combatant; combat and ability resolution both go through here so a conditional stat
// (Unyielding: less damage taken while under 40 % life) counts everywhere the stat is read.

/** Base stats + static mods (gear, talents, auras) + active effects + the stats that hold only while the
 *  combatant's own life is under a share. */
export function liveStats(c: Combatant): EffectiveStats {
  const mods = [...c.staticMods, ...effectStatMods(c.effects)];
  if (c.lowHpMods !== undefined) {
    for (const m of c.lowHpMods) if (c.hp < c.maxHp * m.hpBelow) mods.push(m.mod);
  }
  return aggregate(c.baseStats, mods);
}

function meets(when: TargetCondition, target: Combatant): boolean {
  switch (when.type) {
    case 'hpBelow':
      return target.hp < target.maxHp * when.frac;
    case 'approaching':
      return target.engaged !== true; // still walking in: it has not reached the fight
    case 'eliteOrBoss':
      return target.isElite === true || target.isBoss === true;
  }
}

/** Multiplier on what `source` deals to `target` — damage, or a heal — from its role talents: 1 + Σ(pct)/100
 *  over the bonuses whose condition the target meets. Exactly 1 for a combatant without any. */
export function dealtMult(source: Combatant, target: Combatant, what: 'damage' | 'heal'): number {
  const bonuses = source.dealtBonuses;
  if (bonuses === undefined) return 1;
  let pct = 0;
  for (const b of bonuses) if (b.what === what && meets(b.when, target)) pct += b.pct;
  return 1 + pct / 100;
}
