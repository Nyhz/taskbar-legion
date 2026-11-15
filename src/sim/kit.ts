import type { Combatant, DealtBonus } from './world';
import type { ResolvedAbility } from './loadout';
import type { StatMod } from './stats';
import { talentNodes } from '@/data/talents';
import type { TriggerDef } from '@/data/triggers';
import { ultimateForClass, ultimateTriggers } from '@/data/ultimates';

// A hero's talent KIT beyond its stats and abilities: the triggers it carries (ultimate, capstone, modifiers,
// abilities) and its role talents' conditional bonuses. Pure — resolved from (class, level, talents) when the
// hero is built or refreshed; the combat loop only reads the result off the Combatant.

export interface HeroKit {
  triggers: TriggerDef[];
  lowHpMods: { hpBelow: number; mod: StatMod }[];
  dealtBonuses: DealtBonus[];
  partyRegenPct: number;
}

export function resolveKit(
  classKey: string,
  level: number,
  talents: Readonly<Record<string, number>>,
  abilities: readonly ResolvedAbility[],
): HeroKit {
  const kit: HeroKit = { triggers: [], lowHpMods: [], dealtBonuses: [], partyRegenPct: 0 };
  const active = new Set(abilities.map((a) => a.def.key));
  const nodes = talentNodes(classKey);
  const ranked = nodes.filter((n) => (talents[n.key] ?? 0) > 0);

  // The class ultimate (from its level), transformed by the capstone the hero holds — one at most.
  const ult = ultimateForClass(classKey, level);
  if (ult !== undefined) kit.triggers.push(...ultimateTriggers(ult, ranked.find((n) => n.kind === 'capstone')?.ult));
  // Triggers of the abilities in use, and of their modifiers.
  for (const { def } of abilities) kit.triggers.push(...(def.triggers ?? []));
  for (const n of ranked) {
    if (n.modifies !== undefined && active.has(n.modifies)) kit.triggers.push(...(n.triggers ?? []));
  }
  // Role talents with a condition (the party-wide ones are stat mods: sim/loadout.partyAuraMods).
  for (const n of ranked) {
    const r = n.role;
    if (r === undefined) continue;
    const rank = talents[n.key] ?? 0;
    if (r.type === 'selfStatWhen') {
      kit.lowHpMods.push({ hpBelow: r.hpBelow, mod: { key: r.stat, mode: r.mode, value: r.valuePerRank * rank } });
    } else if (r.type === 'dealt') {
      kit.dealtBonuses.push({ what: r.what, when: r.when, pct: r.pctPerRank * rank });
    } else if (r.type === 'partyRegen') {
      kit.partyRegenPct += r.pctMaxHpPerSecPerRank * rank;
    }
  }
  return kit;
}

/** Put a resolved kit on a hero combatant (empty parts stay undefined, so the hot loop skips them). */
export function applyKit(hero: Combatant, kit: HeroKit): void {
  hero.triggers = kit.triggers.length > 0 ? kit.triggers : undefined;
  hero.lowHpMods = kit.lowHpMods.length > 0 ? kit.lowHpMods : undefined;
  hero.dealtBonuses = kit.dealtBonuses.length > 0 ? kit.dealtBonuses : undefined;
  hero.partyRegenPct = kit.partyRegenPct > 0 ? kit.partyRegenPct : undefined;
}
