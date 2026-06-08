import type { StatKey } from './stats';

// Effect library. Abilities apply declarative EffectDefs; the combat loop processes
// a GENERIC ActiveEffect list (SPEC §4.10) — adding content is data, never editing
// the loop. Each effect is one EffectKind; an ability may apply several at once.

export type EffectKind =
  | { type: 'statMod'; stat: StatKey; mode: 'flat' | 'percent'; value: number }
  | { type: 'silence' }
  | { type: 'root' }
  | { type: 'dot'; damagePerTick: number; element?: string }
  | { type: 'hot'; healPerTick: number }
  // Instant on apply (duration 0): magnitude comes from the casting ability's `power`
  // (resolved against caster/target stats), carried in ActiveEffect.value.
  | { type: 'damage' }
  | { type: 'heal' }
  // Absorb pool: ActiveEffect.value is the remaining shield; incoming damage drains
  // it before HP (sim/effects.absorbDamage). Timed.
  | { type: 'shield' }
  // Total damage immunity while active (Knight ult). All incoming damage → 0.
  | { type: 'invulnerable' }
  // Vulnerability mark (Ranger ult): the holder takes ActiveEffect.value% MORE damage
  // from all sources. Read by sim/effects.vulnerabilityMult in the damage paths.
  | { type: 'vulnerable' }
  // Weaken (Knight Debilitating Cleave): the holder DEALS `value`% LESS damage with its
  // attacks/abilities. The mirror of `vulnerable`. `value` is the base %; ability
  // rankScaling adds to it. Read by sim/effects.weakenMult in the outgoing-damage paths.
  | { type: 'weaken'; value: number }
  // Healing reduction (world-boss Mortal Wound): the holder RECEIVES `value`% LESS healing
  // from all sources (heals, HoTs, regen, lifesteal) while active. Read by
  // sim/effects.healReceivedMult in every heal path.
  | { type: 'healReduction'; value: number }
  | { type: 'tag'; tag: string };

export interface EffectDef {
  key: string;
  name: string;
  icon: string;
  kind: EffectKind;
  durationMs: number; // 0 = instant; >0 = timed
  maxStacks: number; // 1 = refresh-only; >1 = stacks
  stackRule: 'refresh' | 'extend' | 'independent';
  beneficial: boolean;
}

export interface ActiveEffect {
  defKey: string;
  sourceId: string;
  remainingMs: number;
  /** the full duration this effect was applied with (display-only: the overhead pip
   *  drains `remainingMs / totalMs`). Falls back to the def's durationMs if unset. */
  totalMs?: number;
  stacks: number;
  /** resolved effect value (after ability rank scaling) for statMod/dot/hot. */
  value: number;
}

export const EFFECTS: Record<string, EffectDef> = {
  // ── Generic power-driven effects (magnitude resolved from the ability's `power`) ──
  fx_damage: {
    key: 'fx_damage', name: 'Damage', icon: 'hit',
    kind: { type: 'damage' }, durationMs: 0, maxStacks: 1, stackRule: 'refresh', beneficial: false,
  },
  fx_heal: {
    key: 'fx_heal', name: 'Heal', icon: 'heal',
    kind: { type: 'heal' }, durationMs: 0, maxStacks: 1, stackRule: 'refresh', beneficial: true,
  },
  fx_shield: {
    key: 'fx_shield', name: 'Shield', icon: 'shield',
    kind: { type: 'shield' }, durationMs: 8000, maxStacks: 1, stackRule: 'refresh', beneficial: true,
  },
  fx_dot: {
    key: 'fx_dot', name: 'Bleed', icon: 'dot',
    kind: { type: 'dot', damagePerTick: 0 }, durationMs: 5000, maxStacks: 1, stackRule: 'refresh', beneficial: false,
  },
  fx_hot: {
    key: 'fx_hot', name: 'Renew', icon: 'heal',
    kind: { type: 'hot', healPerTick: 0 }, durationMs: 4000, maxStacks: 1, stackRule: 'refresh', beneficial: true,
  },

  // ── Self / ally buffs (statMod; base value here, +rankScaling on the ability) ──
  buff_fast_fire: {
    key: 'buff_fast_fire', name: 'Rapid Fire', icon: 'fast',
    // 25% attack speed at rank 1, +5%/rank → 45% at rank 5. 8s uptime.
    kind: { type: 'statMod', stat: 'attackSpeed', mode: 'percent', value: 25 },
    durationMs: 8000, maxStacks: 1, stackRule: 'refresh', beneficial: true,
  },
  // Power Infusion (Priest → a DPS ally): frenzied attack speed + CDR. Both 30%→50%
  // (+5/rank, per-effect valuePerRank on the ability). 6s.
  buff_infusion_as: {
    key: 'buff_infusion_as', name: 'Power Infusion', icon: 'surge',
    kind: { type: 'statMod', stat: 'attackSpeed', mode: 'percent', value: 30 },
    durationMs: 6000, maxStacks: 1, stackRule: 'refresh', beneficial: true,
  },
  buff_infusion_cdr: {
    key: 'buff_infusion_cdr', name: 'Power Infusion', icon: 'surge',
    kind: { type: 'statMod', stat: 'cooldownReduction', mode: 'percent', value: 30 },
    durationMs: 6000, maxStacks: 1, stackRule: 'refresh', beneficial: true,
  },
  buff_guard_block: {
    key: 'buff_guard_block', name: 'Stone Skin', icon: 'guard',
    // Stone Skin is a flat damage-reduction cooldown: 20% DR at rank 1, +5%/rank → 40% at
    // rank 5. Applied as flat %-off incoming damage (sim/combat.enemyAttack). 6s uptime.
    kind: { type: 'statMod', stat: 'damageReduction', mode: 'percent', value: 20 },
    durationMs: 6000, maxStacks: 1, stackRule: 'refresh', beneficial: true,
  },
  buff_battlecry_ad: {
    key: 'buff_battlecry_ad', name: 'Battle Cry', icon: 'cry',
    kind: { type: 'statMod', stat: 'attackDamage', mode: 'percent', value: 15 },
    durationMs: 8000, maxStacks: 1, stackRule: 'refresh', beneficial: true,
  },
  buff_battlecry_crit: {
    key: 'buff_battlecry_crit', name: 'Battle Cry', icon: 'cry',
    // 5% crit at rank 1, +2.5%/rank → 15% at rank 5 (matches the AD line's +2.5/rank).
    kind: { type: 'statMod', stat: 'critChance', mode: 'percent', value: 5 },
    durationMs: 8000, maxStacks: 1, stackRule: 'refresh', beneficial: true,
  },
  // Bloodlust (self): faster swings + lifesteal. AS 24%→40% (+4/rank) and lifesteal
  // 8%→12% (+1/rank) — per-effect valuePerRank on the ability. 8s uptime.
  buff_bloodlust_as: {
    key: 'buff_bloodlust_as', name: 'Bloodlust', icon: 'flurry',
    kind: { type: 'statMod', stat: 'attackSpeed', mode: 'percent', value: 24 },
    durationMs: 8000, maxStacks: 1, stackRule: 'refresh', beneficial: true,
  },
  buff_bloodlust_ls: {
    key: 'buff_bloodlust_ls', name: 'Bloodlust', icon: 'flurry',
    kind: { type: 'statMod', stat: 'lifesteal', mode: 'percent', value: 8 },
    durationMs: 8000, maxStacks: 1, stackRule: 'refresh', beneficial: true,
  },
  // Debilitating Cleave (Knight): each enemy in melee range deals 15%→25% less damage for 6s.
  debuff_weaken: {
    key: 'debuff_weaken', name: 'Debilitated', icon: 'expose',
    kind: { type: 'weaken', value: 15 },
    durationMs: 6000, maxStacks: 1, stackRule: 'refresh', beneficial: false,
  },
  // ── Ultimates (off-tree, auto-granted at L60; values resolved from data/ultimates) ──
  // Knight Last Stand: brief total invulnerability after a would-be-lethal blow. The
  // duration is overridden by the ult def's invulnMs at apply time.
  fx_invuln: {
    key: 'fx_invuln', name: 'Last Stand', icon: 'guard',
    kind: { type: 'invulnerable' }, durationMs: 6000, maxStacks: 1, stackRule: 'refresh', beneficial: true,
  },
  // Ranger Mark of the Hunter: a persistent boss debuff (value = +% damage taken). The
  // value + duration are supplied by the ult def at apply time (long enough to span the
  // whole boss fight).
  fx_mark: {
    key: 'fx_mark', name: 'Mark of the Hunter', icon: 'aim',
    kind: { type: 'vulnerable' }, durationMs: 600000, maxStacks: 1, stackRule: 'refresh', beneficial: false,
  },
  // Priest Battle Enrage: party-wide CDR + attack-speed on boss engage. Value + duration
  // come from the ult def at apply time.
  buff_enrage_cdr: {
    key: 'buff_enrage_cdr', name: 'Battle Enrage', icon: 'cry',
    kind: { type: 'statMod', stat: 'cooldownReduction', mode: 'percent', value: 0 },
    durationMs: 10000, maxStacks: 1, stackRule: 'refresh', beneficial: true,
  },
  buff_enrage_as: {
    key: 'buff_enrage_as', name: 'Battle Enrage', icon: 'cry',
    kind: { type: 'statMod', stat: 'attackSpeed', mode: 'percent', value: 0 },
    durationMs: 10000, maxStacks: 1, stackRule: 'refresh', beneficial: true,
  },

  // ── World-boss special abilities (DIFFICULTY.md §5) ──
  // Boss Frenzy (Inferno+): the world boss whips itself into a frenzy, swinging 50% faster
  // for 6s. A self-buff on the enemy's attack-speed stat (sim/combat.enemySpeedFactor reads
  // it for both swing cadence and movement). Suppressed from the generic offense overlay so
  // its dedicated red foot-aura is the only read (effectAuras.categorize).
  buff_boss_frenzy: {
    key: 'buff_boss_frenzy', name: 'Frenzy', icon: 'flurry',
    kind: { type: 'statMod', stat: 'attackSpeed', mode: 'percent', value: 35 },
    durationMs: 6000, maxStacks: 1, stackRule: 'refresh', beneficial: true,
  },
  // Boss Mortal Wound (Torment+): a crippling blow that cuts the tank's healing received by
  // 25% for 8s (on top of the strike's damage). Read by sim/effects.healReceivedMult.
  debuff_mortal_wound: {
    key: 'debuff_mortal_wound', name: 'Mortal Wound', icon: 'expose',
    kind: { type: 'healReduction', value: 25 },
    durationMs: 8000, maxStacks: 1, stackRule: 'refresh', beneficial: false,
  },

  // ── Debuffs / CC ──
  debuff_expose: {
    key: 'debuff_expose', name: 'Expose', icon: 'expose',
    kind: { type: 'statMod', stat: 'armor', mode: 'percent', value: -20 },
    durationMs: 5000, maxStacks: 5, stackRule: 'independent', beneficial: false,
  },
  debuff_silence: {
    key: 'debuff_silence', name: 'Silence', icon: 'silence',
    kind: { type: 'silence' },
    durationMs: 2000, maxStacks: 1, stackRule: 'refresh', beneficial: false,
  },
};

export function effectDef(key: string): EffectDef {
  const def = EFFECTS[key];
  if (def === undefined) throw new Error(`Unknown effect ${key}`);
  return def;
}
