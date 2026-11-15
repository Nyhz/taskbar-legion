import type { AbilityDef, AbilityTarget } from '@/data/abilities';
import { effectDef } from '@/data/effects';
import { STATS, type StatKey } from '@/data/stats';
import { effectCoeff, effectDuration, effectMagnitude, powerOf } from './abilities';
import type { EffectiveStats } from './stats';
import type { Combatant } from './world';

// What an ability does at a rank, as DATA: one fact per applied effect, with its magnitude resolved at the
// hero's stats. The interface words them in the player's language (ui/panels/hero/abilityLineText) — the
// simulation knows no language. Pure; mirrors what combat resolves (sim/abilities.applyToTarget).

/** Whose max life a heal or a shield is a share of. */
export type LifeBasis = 'self' | 'tank' | 'target';

export type EffectFact = {
  /** A probabilistic rider: its chance, 0–1. */
  chance?: number;
  /** Who it lands on, when that is not the ability's own target. */
  on?: AbilityTarget;
} & (
  | { type: 'damage'; amount: number; crit: 'always' | 'can' | 'no' }
  | { type: 'dot'; amount: number; ms: number } // total over its duration
  | { type: 'heal'; pct: number; of: LifeBasis }
  | { type: 'hot'; pct: number; of: LifeBasis; ms: number } // total over its duration
  | { type: 'shield'; pct: number; of: LifeBasis; ms: number }
  | { type: 'stat'; stat: StatKey; value: number; percent: boolean; ms: number }
  | { type: 'weaken'; pct: number; ms: number } // less damage dealt
  | { type: 'vulnerable'; pct: number; ms: number } // more damage taken
  | { type: 'root'; ms: number }
  | { type: 'silence'; ms: number }
);

/** A party aura at a rank (an aura ability grants it while learned), or null if the ability has none.
 *  Mirrors sim/loadout.partyAuraMods. */
export function abilityAuraFact(ability: AbilityDef, rank: number): { stat: StatKey; value: number; percent: boolean } | null {
  const a = ability.aura;
  if (a === undefined) return null;
  const r = Math.max(1, rank);
  return { stat: a.stat, value: a.baseValue + a.valuePerRank * (r - 1), percent: STATS[a.stat].kind === 'percent' };
}

/** One fact per applied effect, magnitudes resolved at the given rank and stats. Damage scales with the
 *  caster's attack, so the hero's stats give the real number; a heal or a shield scales with its TARGET's max
 *  life, so it is told as the share of that life it grants (heal power and the difficulty's `healEff` in). */
export function abilityEffectFacts(ability: AbilityDef, rank: number, cs: EffectiveStats, healEff = 1): EffectFact[] {
  const r = Math.max(1, rank);
  const ref = { maxHp: 1, side: 'hero' } as Combatant; // damage and stat magnitudes do not read the target
  const facts: EffectFact[] = [];
  for (const applied of ability.applies) {
    const def = effectDef(applied.effectKey);
    const k = def.kind;
    const who = applied.target ?? ability.target;
    const ms = effectDuration(ability, def, r, applied.durationMsOverride);
    const v = effectMagnitude(ability, applied, def, r, cs, ref, ref);
    const pct = (effectCoeff(ability, applied, r - 1) ?? 0) * (1 + (cs.healPower * healEff) / 100) * 100;
    const of: LifeBasis = who === 'self' ? 'self' : who === 'tank' ? 'tank' : 'target';
    const power = powerOf(ability, applied);
    const base = {
      ...(applied.chance !== undefined ? { chance: applied.chance } : {}),
      ...(applied.target !== undefined ? { on: applied.target } : {}),
    };
    switch (k.type) {
      case 'damage':
        facts.push({ ...base, type: 'damage', amount: v, crit: power?.alwaysCrit === true ? 'always' : power?.canCrit === true ? 'can' : 'no' });
        break;
      case 'dot':
        facts.push({ ...base, type: 'dot', amount: v, ms });
        break;
      case 'heal':
        facts.push({ ...base, type: 'heal', pct, of });
        break;
      case 'hot':
        facts.push({ ...base, type: 'hot', pct, of, ms });
        break;
      case 'shield':
        facts.push({ ...base, type: 'shield', pct, of, ms });
        break;
      case 'statMod':
        facts.push({ ...base, type: 'stat', stat: k.stat, value: v, percent: k.mode === 'percent', ms });
        break;
      case 'weaken':
        facts.push({ ...base, type: 'weaken', pct: v, ms });
        break;
      case 'vulnerable':
        facts.push({ ...base, type: 'vulnerable', pct: v, ms });
        break;
      case 'root':
        facts.push({ ...base, type: 'root', ms });
        break;
      case 'silence':
        facts.push({ ...base, type: 'silence', ms });
        break;
      default:
        break;
    }
  }
  return facts;
}
