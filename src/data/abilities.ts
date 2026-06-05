import type { StatKey } from './stats';

// Ability library (TALENTS.md). Abilities apply declarative effects; ranks (from the
// talent tree) scale them. Two scaling channels:
//   • power-driven effects (damage/heal/shield/dot/hot): magnitude resolved from
//     `power` against the caster/target stats — `coeff (+coeffPerRank·steps)`.
//   • stat buffs/debuffs (statMod) + CC: base value on the effect def, +rankScaling.
// The combat AI casts when the cooldown is ready and the cast condition holds.
//
// COOLDOWNS are PER-ABILITY: each ability declares its own `cooldownMs` (the source of
// truth) — there is no category/baseline system. Late-game CDR (talents/tech/gear)
// reduces these further at cast time (sim/abilities.effectiveCooldown).

export interface AbilityPower {
  coeff: number; // multiplier at rank 1 (× attackDamage for damage/dot, × target maxHP for heal/hot/shield)
  coeffPerRank?: number; // added to coeff per rank beyond the first
  canCrit?: boolean; // instant `damage` effects may crit (uses caster crit stats)
  // AoE splash for a SINGLE-TARGET damage ability: every OTHER living enemy also takes
  // splashCoeff (× attackDamage). Used by Explosive Arrow — the front enemy takes the
  // full `coeff`, the rest of the wave takes the reduced splash.
  splashCoeff?: number;
  splashCoeffPerRank?: number;
}

export interface AppliedEffect {
  effectKey: string;
  durationMsOverride?: number;
  chance?: number; // 0..1 — probabilistic rider (default: always applies)
  // Per-rank growth for THIS effect's statMod/weaken value, overriding the ability-level
  // rankScaling. Use when one ability buffs several stats that scale at different rates
  // (e.g. Bloodlust: +3.75%/rank attack speed but +1%/rank lifesteal).
  valuePerRank?: number;
}

export interface AbilityDef {
  key: string;
  name: string;
  icon: string;
  desc: string; // one-line flavor/effect summary for tooltips
  cooldownMs: number; // per-ability base cooldown (ms); reduced by CDR at cast time
  target: 'self' | 'lowestAllyHp' | 'frontEnemy' | 'allEnemies' | 'allAllies' | 'randomDpsAlly' | 'tank';
  applies: AppliedEffect[];
  castCondition?: 'always' | 'enemyPresent' | 'allyBelowHpPct' | 'tankEngaged';
  power?: AbilityPower;
  rankScaling?: { perRank: Partial<{ value: number; durationMs: number; cooldownMs: number }> };
  // Charge-gated cast (no cooldown): the ability banks `perAttack` charge(s) per AUTO-
  // attack and fires once it reaches `toCast`, then resets to 0. Rewards attack speed.
  // When set, `cooldownMs` is ignored. The sim tracks charges on Combatant.charges.
  charge?: { perAttack: number; toCast: number };
  // Passive party AURA (no cast, no cooldown): while this ability is SLOTTED (occupies a
  // loadout slot), every party member gains `baseValue (+valuePerRank·(rank-1))`% of
  // `stat`. Applied at party-build time (sim/loadout.partyAuraMods), never cast.
  aura?: { stat: StatKey; baseValue: number; valuePerRank: number };
}

export const TARGET_LABEL: Record<AbilityDef['target'], string> = {
  self: 'Self',
  lowestAllyHp: 'Lowest-HP ally',
  frontEnemy: 'Front enemy',
  allEnemies: 'All enemies',
  allAllies: 'All allies',
  randomDpsAlly: 'Random damage-dealer',
  tank: 'Tank',
};

export const ABILITIES: Record<string, AbilityDef> = {
  // ───────────────────────── Knight ─────────────────────────
  knight_guard: {
    key: 'knight_guard', name: 'Stone Skin', icon: 'guard',
    desc: 'Harden his skin to stone — flat damage reduction to soak incoming hits.',
    cooldownMs: 20000, target: 'self',
    // buff_guard_block: 20% damage reduction at rank 1, +5%/rank → 40% at rank 5. 6s uptime.
    applies: [{ effectKey: 'buff_guard_block' }],
    castCondition: 'enemyPresent', rankScaling: { perRank: { value: 5 } },
  },
  knight_debilitate: {
    key: 'knight_debilitate', name: 'Debilitating Strike', icon: 'expose',
    desc: 'A crippling blow — heavy damage that saps the target, cutting the damage it deals.',
    cooldownMs: 12000, target: 'frontEnemy',
    // Bonus damage (1.2×→2.0× AD) + debuff_weaken: target deals 15%→25% less damage for 6s.
    applies: [{ effectKey: 'fx_damage' }, { effectKey: 'debuff_weaken' }],
    castCondition: 'enemyPresent', power: { coeff: 1.2, coeffPerRank: 0.2, canCrit: true },
    rankScaling: { perRank: { value: 2.5 } },
  },
  knight_bulwark: {
    key: 'knight_bulwark', name: 'Bulwark', icon: 'shield',
    desc: 'Brace behind a bulwark — a heavy absorb shield on himself.',
    cooldownMs: 24000, target: 'self',
    applies: [{ effectKey: 'fx_shield', durationMsOverride: 8000 }],
    // Self-shield: 30%→50% of his max HP absorbed (+5%/rank).
    castCondition: 'enemyPresent', power: { coeff: 0.3, coeffPerRank: 0.05 },
  },
  knight_battlecry: {
    key: 'knight_battlecry', name: 'Battle Cry', icon: 'cry',
    desc: 'A war cry that sharpens the whole party’s offense.',
    cooldownMs: 24000, target: 'allAllies',
    // buff_battlecry_ad 15%→25% AD + buff_battlecry_crit 5%→15% crit (both +2.5/rank). 8s uptime.
    applies: [{ effectKey: 'buff_battlecry_ad' }, { effectKey: 'buff_battlecry_crit' }],
    castCondition: 'enemyPresent', rankScaling: { perRank: { value: 2.5 } },
  },
  knight_bloodlust: {
    key: 'knight_bloodlust', name: 'Bloodlust', icon: 'flurry',
    desc: 'Fly into a bloodlust — faster swings that leech life from every hit.',
    cooldownMs: 24000, target: 'self',
    // buff_bloodlust_as 24%→40% attack speed (+4/rank) + buff_bloodlust_ls 8%→12%
    // lifesteal (+1/rank) — the two scale at different rates, so per-effect valuePerRank.
    applies: [
      { effectKey: 'buff_bloodlust_as', valuePerRank: 4 },
      { effectKey: 'buff_bloodlust_ls', valuePerRank: 1 },
    ],
    castCondition: 'enemyPresent',
  },

  // ───────────────────────── Priest ─────────────────────────
  priest_mend: {
    key: 'priest_mend', name: 'Mend', icon: 'heal',
    desc: 'A rolling heal on whoever is hurt — amplified by heal power.',
    cooldownMs: 20000, target: 'lowestAllyHp', applies: [{ effectKey: 'fx_hot', durationMsOverride: 6000 }],
    // HoT coeff is the TOTAL heal over the duration (× target max HP × healPower), spread
    // per-tick. 15%→25% of max HP over 6s (+2.5/rank).
    castCondition: 'allyBelowHpPct', power: { coeff: 0.15, coeffPerRank: 0.025 },
  },
  priest_powerinfusion: {
    key: 'priest_powerinfusion', name: 'Power Infusion', icon: 'surge',
    desc: 'Infuse a damage-dealer with frenzied speed and cooldown reduction. Prefers a DPS; if the party has none, infuses the tank instead.',
    cooldownMs: 24000, target: 'randomDpsAlly',
    // buff_infusion_as + buff_infusion_cdr: both 30%→50% (+5/rank) for 6s.
    applies: [
      { effectKey: 'buff_infusion_as', valuePerRank: 5 },
      { effectKey: 'buff_infusion_cdr', valuePerRank: 5 },
    ],
    castCondition: 'enemyPresent',
  },
  priest_holyshield: {
    key: 'priest_holyshield', name: 'Holy Shield', icon: 'shield',
    desc: 'A divine barrier on the tank — absorbs a burst of the hits it’s taking.',
    cooldownMs: 24000, target: 'tank', applies: [{ effectKey: 'fx_shield', durationMsOverride: 4000 }],
    // Shield = 10%→20% of the tank's max HP (+2.5/rank). Only while the tank is engaged.
    castCondition: 'tankEngaged', power: { coeff: 0.1, coeffPerRank: 0.025 },
  },
  priest_nova: {
    key: 'priest_nova', name: 'Holy Nova', icon: 'holy',
    desc: 'A burst of holy light damaging the whole wave.',
    cooldownMs: 20000, target: 'allEnemies', applies: [{ effectKey: 'fx_damage' }],
    // Per-target wave damage: 1.2× → 2.8× AD (+0.4/rank).
    castCondition: 'enemyPresent', power: { coeff: 1.2, coeffPerRank: 0.4, canCrit: true },
  },
  priest_retribution: {
    key: 'priest_retribution', name: 'Retribution Aura', icon: 'surge',
    desc: 'Passive: while slotted, the whole party deals +5%→+15% damage.',
    cooldownMs: 0, target: 'self', applies: [],
    // Passive party aura — never cast; occupies a loadout slot. +5% damage done at rank 1,
    // +2.5%/rank → +15% at rank 5, applied to every ally (sim/loadout.partyAuraMods).
    aura: { stat: 'damageIncrease', baseValue: 5, valuePerRank: 2.5 },
  },

  // ───────────────────────── Ranger ─────────────────────────
  ranger_fast_fire: {
    key: 'ranger_fast_fire', name: 'Rapid Fire', icon: 'fast',
    desc: 'A sustained burst of attack speed.',
    cooldownMs: 24000, target: 'self', applies: [{ effectKey: 'buff_fast_fire' }],
    // buff_fast_fire 25%→45% attack speed (+5/rank). 8s uptime.
    castCondition: 'enemyPresent', rankScaling: { perRank: { value: 5 } },
  },
  ranger_aimedshot: {
    key: 'ranger_aimedshot', name: 'Aimed Shot', icon: 'aim',
    desc: 'A heavy charged shot — banks 1 charge per auto-attack, fires at 10.',
    cooldownMs: 0, target: 'frontEnemy', applies: [{ effectKey: 'fx_damage' }],
    castCondition: 'enemyPresent', power: { coeff: 1.8, coeffPerRank: 0.4, canCrit: true },
    charge: { perAttack: 1, toCast: 10 },
  },
  ranger_multishot: {
    key: 'ranger_multishot', name: 'Raining Arrows', icon: 'arrows',
    desc: 'A volley spread across the whole wave.',
    cooldownMs: 20000, target: 'allEnemies', applies: [{ effectKey: 'fx_damage' }],
    // Per-target wave damage: 1.2× → 2.8× AD (+0.4/rank).
    castCondition: 'enemyPresent', power: { coeff: 1.2, coeffPerRank: 0.4, canCrit: true },
  },
  ranger_focus: {
    key: 'ranger_focus', name: 'Explosive Arrow', icon: 'explosion',
    desc: 'A detonating arrow: a heavy hit on the front enemy that blasts the rest of the wave for less.',
    cooldownMs: 18000, target: 'frontEnemy', applies: [{ effectKey: 'fx_damage' }],
    // Front enemy 1.6×→3.2× AD (+0.4/rank, can crit); splash 0.6×→1.2× AD (+0.15/rank) to
    // every OTHER enemy in the wave.
    castCondition: 'enemyPresent',
    power: { coeff: 1.6, coeffPerRank: 0.4, canCrit: true, splashCoeff: 0.6, splashCoeffPerRank: 0.15 },
  },
  ranger_frozentrap: {
    key: 'ranger_frozentrap', name: 'Caltrops', icon: 'dot',
    desc: 'Hurl a spray of caltrops that spread across the ground ahead — bleeding every enemy in the field for 4s.',
    cooldownMs: 24000, target: 'allEnemies', applies: [{ effectKey: 'fx_dot', durationMsOverride: 4000 }],
    // Wave DoT over 4s: total damage per enemy = 0.6×→1.4× AD (+0.2/rank), dealt in 100ms ticks.
    castCondition: 'enemyPresent', power: { coeff: 0.6, coeffPerRank: 0.2 },
  },

  // ───────────────────────── Enemies ─────────────────────────
  // Enemy abilities follow the SAME pattern as hero abilities: damage = coeff ×
  // the caster's normal attack (here `enemyDamage`, the stage-scaled per-hit value),
  // mitigated by the target hero's armor/MR like enemy autos. 'frontEnemy' targets
  // the front (tank) hero. Conservative coeffs; trash only (bosses stay enrage-gated).
  enemy_bolt: {
    key: 'enemy_bolt', name: 'Dark Bolt', icon: 'frost',
    desc: 'A caster enemy hurls a bolt at the front hero.',
    cooldownMs: 6000, target: 'frontEnemy', applies: [{ effectKey: 'fx_damage' }],
    castCondition: 'enemyPresent', power: { coeff: 1.4 },
  },
  enemy_smash: {
    key: 'enemy_smash', name: 'Brutal Smash', icon: 'explosion',
    desc: 'A brute winds up a heavy blow on the front hero.',
    cooldownMs: 9000, target: 'frontEnemy', applies: [{ effectKey: 'fx_damage' }],
    castCondition: 'enemyPresent', power: { coeff: 2.2 },
  },
  enemy_aimed: {
    key: 'enemy_aimed', name: 'Piercing Shot', icon: 'aim',
    desc: 'An archer lines up a piercing shot on the front hero.',
    cooldownMs: 7000, target: 'frontEnemy', applies: [{ effectKey: 'fx_damage' }],
    castCondition: 'enemyPresent', power: { coeff: 1.6 },
  },

  // ───────────────────── World-boss kit (DIFFICULTY.md §5) ─────────────────────
  // The escalating pool a W-10 world boss draws from — one MORE ability unlocks per
  // difficulty (Normal wields just the cleave; Torment wields all five). Coeffs are × the
  // boss's already-multiplied enemyDamage and route through hero armor/MR, so they add burst
  // pressure on top of autos (the survival half of the wall) without one-shotting.
  boss_cleave: {
    key: 'boss_cleave', name: 'Cleave', icon: 'explosion',
    desc: 'The world boss cleaves the front hero for heavy damage.',
    cooldownMs: 8000, target: 'frontEnemy', applies: [{ effectKey: 'fx_damage' }],
    castCondition: 'enemyPresent', power: { coeff: 1.8 },
  },
  boss_quake: {
    key: 'boss_quake', name: 'Quake', icon: 'explosion',
    desc: 'A shockwave rocks the whole party — pressures the healer.',
    cooldownMs: 10000, target: 'allEnemies', applies: [{ effectKey: 'fx_damage' }],
    castCondition: 'enemyPresent', power: { coeff: 1.0 },
  },
  boss_smite: {
    key: 'boss_smite', name: 'Smite', icon: 'aim',
    desc: 'A heavy bolt hammers the front hero.',
    cooldownMs: 9000, target: 'frontEnemy', applies: [{ effectKey: 'fx_damage' }],
    castCondition: 'enemyPresent', power: { coeff: 2.4 },
  },
  boss_maelstrom: {
    key: 'boss_maelstrom', name: 'Maelstrom', icon: 'frost',
    desc: 'A swirling storm batters the entire party.',
    cooldownMs: 9000, target: 'allEnemies', applies: [{ effectKey: 'fx_damage' }],
    castCondition: 'enemyPresent', power: { coeff: 1.5 },
  },
  boss_cataclysm: {
    key: 'boss_cataclysm', name: 'Cataclysm', icon: 'explosion',
    desc: 'A devastating eruption engulfs every hero.',
    cooldownMs: 8000, target: 'allEnemies', applies: [{ effectKey: 'fx_damage' }],
    castCondition: 'enemyPresent', power: { coeff: 2.0 },
  },
};

// The escalating world-boss ability pool — the boss at difficulty index d (0=Normal …
// 4=Torment) wields the first (d+1) of these. So +1 new ability per difficulty on top of
// the stat jump (DIFFICULTY.md §5). Shared across the 10 world bosses for v1; per-world
// flavor can layer on later.
export const WORLD_BOSS_ABILITY_POOL: readonly string[] = [
  'boss_cleave', // Normal+
  'boss_quake', // Hell+
  'boss_smite', // Inferno+
  'boss_maelstrom', // Eternal+
  'boss_cataclysm', // Torment+
];

/** Ability keys a world boss wields at difficulty index `d` (0..4): the first d+1 of the pool. */
export function worldBossAbilityKeys(d: number): string[] {
  const n = Math.max(1, Math.min(WORLD_BOSS_ABILITY_POOL.length, Math.floor(d) + 1));
  return WORLD_BOSS_ABILITY_POOL.slice(0, n);
}

export function abilityDef(key: string): AbilityDef {
  const def = ABILITIES[key];
  if (def === undefined) throw new Error(`Unknown ability ${key}`);
  return def;
}

/** Non-throwing lookup — returns undefined for unknown/renamed keys (e.g. a stale
 *  ability key persisted in an old save). UI/state should prefer this over abilityDef
 *  when the key originates from saved data so a renamed ability can't crash a render. */
export function tryAbilityDef(key: string): AbilityDef | undefined {
  return ABILITIES[key];
}
