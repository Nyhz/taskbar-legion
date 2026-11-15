import type { AbilityDef } from './abilities';

// The six branch abilities of the class redesign's first wave (docs/redesign/CLASSES.md §3–§5): one per
// specialisation branch, learned at tier 5. Starting numbers are the document's; names are provisional.
// Their companion effects are in data/branchEffects.ts.

export const BRANCH_ABILITIES: Record<string, AbilityDef> = {
  // ── Knight · Bastion ──
  knight_holdtheline: {
    key: 'knight_holdtheline', name: 'Hold the Line', icon: 'banner',
    desc: 'Plant the shield: the whole party takes less damage for a short window.',
    cooldownMs: 26000, target: 'allAllies',
    // buff_holdline_dr: 10% less damage taken at rank 1, +2.5/rank → 20% at rank 5. 6s.
    applies: [{ effectKey: 'buff_holdline_dr' }],
    castCondition: 'enemyPresent', rankScaling: { perRank: { value: 2.5 } },
  },
  // ── Knight · Scourge ──
  knight_riposte: {
    key: 'knight_riposte', name: 'Riposte', icon: 'cleave',
    desc: 'No cooldown: every blocked hit banks a charge. At full charge he strikes back and leaves the enemy weakened.',
    cooldownMs: 0, target: 'frontEnemy',
    // 1.5×→2.5× AD (+0.25/rank) + debuff_riposte_weaken: deals 10%→20% less damage (+2.5/rank) for 4s.
    applies: [{ effectKey: 'fx_damage' }, { effectKey: 'debuff_riposte_weaken' }],
    castCondition: 'enemyPresent', power: { coeff: 1.5, coeffPerRank: 0.25, canCrit: true },
    rankScaling: { perRank: { value: 2.5 } },
    charge: { perAttack: 0, toCast: 4 },
    triggers: [
      { key: 'knight_riposte_charge', event: { on: 'block' }, actions: [{ do: 'charge', abilityKey: 'knight_riposte', amount: 1 }] },
    ],
  },

  // ── Ranger · Marksman ──
  ranger_weakspot: {
    key: 'ranger_weakspot', name: 'Weak Spot', icon: 'aim',
    desc: 'A shot at the front enemy that leaves it marked: it takes more damage from everyone.',
    cooldownMs: 18000, target: 'frontEnemy',
    // 1.2×→2.0× AD (+0.2/rank) + debuff_weakspot: +6%→+12% damage taken (+1.5/rank) for 6s.
    applies: [{ effectKey: 'fx_damage' }, { effectKey: 'debuff_weakspot', value: 6, valuePerRank: 1.5 }],
    castCondition: 'enemyPresent', power: { coeff: 1.2, coeffPerRank: 0.2, canCrit: true },
  },
  // ── Ranger · Stalker ──
  ranger_tarflask: {
    key: 'ranger_tarflask', name: 'Tar Flask', icon: 'fire',
    desc: 'Burning tar over the whole wave: damage over time, and the tarred attack and advance slower.',
    cooldownMs: 22000, target: 'allEnemies',
    // fx_tar: 0.8×→1.6× AD in total over 5s (+0.2/rank) + debuff_tar_slow: −15%→−30% speed (−3.75/rank).
    applies: [{ effectKey: 'fx_tar' }, { effectKey: 'debuff_tar_slow', valuePerRank: -3.75 }],
    castCondition: 'enemyPresent', power: { coeff: 0.8, coeffPerRank: 0.2 },
  },

  // ── Priest · Devotion ──
  priest_sanctuary: {
    key: 'priest_sanctuary', name: 'Sanctuary', icon: 'holy',
    desc: 'When someone is hurt, a rolling heal on the whole party.',
    cooldownMs: 30000, target: 'allAllies',
    // fx_sanctuary: 6%→10% of each one's max HP over 6s (+1/rank), × heal power.
    applies: [{ effectKey: 'fx_sanctuary' }],
    castCondition: 'allyBelowHpPct', power: { coeff: 0.06, coeffPerRank: 0.01 },
  },
  // ── Priest · Zeal ──
  priest_smite: {
    key: 'priest_smite', name: 'Smite', icon: 'lightning',
    desc: 'An instant heal on whoever is hurt most and, with it, a strike of light on the enemy in front.',
    cooldownMs: 14000, target: 'lowestAllyHp',
    // Heal 8%→14% of the ally's max HP (+1.5/rank, × heal power); the strike is an effect of its own:
    // 0.6×→1.0× AD (+0.1/rank) on the front enemy, skipped when none is in reach.
    applies: [
      { effectKey: 'fx_heal' },
      { effectKey: 'fx_damage', target: 'frontEnemy', power: { coeff: 0.6, coeffPerRank: 0.1, canCrit: true } },
    ],
    castCondition: 'allyBelowHpPct', power: { coeff: 0.08, coeffPerRank: 0.015 },
  },
};
