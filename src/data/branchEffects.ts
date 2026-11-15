import type { EffectDef } from './effects';

// Effects of the class redesign's first wave (docs/redesign/CLASSES.md): the branch abilities', the
// modifiers' and the capstones'. Each new damage-over-time, heal-over-time, slow and vulnerability has a key
// of its own so it ADDS to the ones already there instead of overwriting them (the sim sums them; enemy
// slows add up to the 10 % speed floor of sim/combat.enemySpeedFactor).

const base = { maxStacks: 1, stackRule: 'refresh' } as const;

export const BRANCH_EFFECTS: Record<string, EffectDef> = {
  // ── Knight ──
  // Hold the Line: the whole party takes 10%→20% less damage (+2.5/rank on the ability). 6s.
  buff_holdline_dr: {
    ...base, key: 'buff_holdline_dr', name: 'Hold the Line', icon: 'banner',
    kind: { type: 'statMod', stat: 'damageReduction', mode: 'percent', value: 10 }, durationMs: 6000, beneficial: true,
  },
  // Standard Bearer (modifier): while Hold the Line lasts the Knight has +10 block and +10% armour.
  buff_standard_block: {
    ...base, key: 'buff_standard_block', name: 'Standard Bearer', icon: 'banner',
    kind: { type: 'statMod', stat: 'block', mode: 'percent', value: 10 }, durationMs: 6000, beneficial: true,
  },
  buff_standard_armor: {
    ...base, key: 'buff_standard_armor', name: 'Standard Bearer', icon: 'banner',
    kind: { type: 'statMod', stat: 'armor', mode: 'percent', value: 10 }, durationMs: 6000, beneficial: true,
  },
  // Riposte: the struck enemy deals 10%→20% less damage (+2.5/rank on the ability). 4s.
  debuff_riposte_weaken: {
    ...base, key: 'debuff_riposte_weaken', name: 'Riposte', icon: 'expose',
    kind: { type: 'weaken', value: 10 }, durationMs: 4000, beneficial: false,
  },
  // Crippling Cleave (modifier): enemies hit by the Cleave attack and advance 20% slower. 6s.
  debuff_cripple: {
    ...base, key: 'debuff_cripple', name: 'Crippled', icon: 'expose',
    kind: { type: 'statMod', stat: 'attackSpeed', mode: 'percent', value: -20 }, durationMs: 6000, beneficial: false,
  },
  // Vengeance (capstone): when Last Stand fires, enemies in reach deal 30% less and are 30% slower. 6s.
  debuff_vengeance_weaken: {
    ...base, key: 'debuff_vengeance_weaken', name: 'Vengeance', icon: 'expose',
    kind: { type: 'weaken', value: 30 }, durationMs: 6000, beneficial: false,
  },
  debuff_vengeance_slow: {
    ...base, key: 'debuff_vengeance_slow', name: 'Vengeance', icon: 'expose',
    kind: { type: 'statMod', stat: 'attackSpeed', mode: 'percent', value: -30 }, durationMs: 6000, beneficial: false,
  },

  // ── Ranger ──
  // Weak Spot: the marked enemy takes +6%→+12% damage (value from the ability). 6s.
  debuff_weakspot: {
    ...base, key: 'debuff_weakspot', name: 'Weak Spot', icon: 'aim',
    kind: { type: 'vulnerable' }, durationMs: 6000, beneficial: false,
  },
  // Tar Flask: damage over 5s (total from the ability's power) and −15%→−30% speed.
  fx_tar: {
    ...base, key: 'fx_tar', name: 'Burning Tar', icon: 'fire',
    kind: { type: 'dot', damagePerTick: 0 }, durationMs: 5000, beneficial: false,
  },
  debuff_tar_slow: {
    ...base, key: 'debuff_tar_slow', name: 'Tarred', icon: 'expose',
    kind: { type: 'statMod', stat: 'attackSpeed', mode: 'percent', value: -15 }, durationMs: 5000, beneficial: false,
  },
  // Focused Fire (modifier): Rapid Fire also gives +20 crit damage for its 8s.
  buff_focused_fire: {
    ...base, key: 'buff_focused_fire', name: 'Focused Fire', icon: 'fast',
    kind: { type: 'statMod', stat: 'critDamage', mode: 'percent', value: 20 }, durationMs: 8000, beneficial: true,
  },
  // Scorched Earth (modifier): Explosive Arrow's targets burn (total from the modifier's own power). 4s.
  fx_burn: {
    ...base, key: 'fx_burn', name: 'Scorched', icon: 'fire',
    kind: { type: 'dot', damagePerTick: 0 }, durationMs: 4000, beneficial: false,
  },
  // Killing Field (capstone): on engaging a wave, every enemy takes +10% damage and is 30% slower. 6s.
  debuff_field_vuln: {
    ...base, key: 'debuff_field_vuln', name: 'Killing Field', icon: 'aim',
    kind: { type: 'vulnerable' }, durationMs: 6000, beneficial: false,
  },
  debuff_field_slow: {
    ...base, key: 'debuff_field_slow', name: 'Killing Field', icon: 'expose',
    kind: { type: 'statMod', stat: 'attackSpeed', mode: 'percent', value: -30 }, durationMs: 6000, beneficial: false,
  },

  // ── Priest ──
  // Sanctuary: a heal over 6s on every ally (total from the ability's power).
  fx_sanctuary: {
    ...base, key: 'fx_sanctuary', name: 'Sanctuary', icon: 'holy',
    kind: { type: 'hot', healPerTick: 0 }, durationMs: 6000, beneficial: true,
  },
  // Mending Light (modifier): Smite's heal leaves a heal over 4s.
  fx_light: {
    ...base, key: 'fx_light', name: 'Mending Light', icon: 'heal',
    kind: { type: 'hot', healPerTick: 0 }, durationMs: 4000, beneficial: true,
  },
  // A small ward: the shields of Deep Sanctuary (modifier) and Second Wind (capstone). Its own key, so it
  // stands beside Bulwark / Holy Shield instead of replacing them. 6s.
  fx_ward: {
    ...base, key: 'fx_ward', name: 'Ward', icon: 'shield',
    kind: { type: 'shield' }, durationMs: 6000, beneficial: true,
  },
  // Aegis (modifier): Holy Shield also gives 10% less damage taken for its 4s.
  buff_aegis_dr: {
    ...base, key: 'buff_aegis_dr', name: 'Aegis', icon: 'shield',
    kind: { type: 'statMod', stat: 'damageReduction', mode: 'percent', value: 10 }, durationMs: 4000, beneficial: true,
  },
  // ── Effect passives (second combat wave, B) — values come from the talent's rank at apply time ──────────
  // Shelter (Knight): an ally that drops under half its life takes less damage for 6s.
  buff_shelter: {
    ...base, key: 'buff_shelter', name: 'Shelter', icon: 'shield',
    kind: { type: 'statMod', stat: 'damageReduction', mode: 'percent', value: 0 }, durationMs: 6000, beneficial: true,
  },
  // Hemorrhage (Ranger): a bleed her critical hits leave — a share of that hit over 3s. Its own key, so it adds
  // to the Caltrops' bleed instead of overwriting it.
  fx_hemorrhage: {
    ...base, key: 'fx_hemorrhage', name: 'Hemorrhage', icon: 'bleed',
    kind: { type: 'dot', damagePerTick: 0 }, durationMs: 3000, beneficial: false,
  },
  // Overflow (Priest): healing that did not fit, kept as a small shield.
  fx_overflow: {
    ...base, key: 'fx_overflow', name: 'Overflow', icon: 'shield',
    kind: { type: 'shield' }, durationMs: 8000, beneficial: true,
  },
  // Condemn (Priest): an enemy hit by her damage abilities takes more damage from the whole party for 4s.
  debuff_condemn: {
    ...base, key: 'debuff_condemn', name: 'Condemned', icon: 'aim',
    kind: { type: 'vulnerable' }, durationMs: 4000, beneficial: false,
  },
};
