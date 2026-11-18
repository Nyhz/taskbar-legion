import type { StatKey } from './stats';
import type { TriggerDef } from './triggers';
import { EMERGENCY_LIFE_FRAC } from './casting';
import { BRANCH_ABILITIES } from './branchAbilities';
import { BOSS_ABILITIES } from './bossAbilities';

// Ability library (TALENTS.md). Abilities apply declarative effects; ranks (from the
// talent tree) scale them. Two scaling channels:
//   • power-driven effects (damage/heal/shield/dot/hot): magnitude resolved from
//     `power` against the caster/target stats — `coeff (+coeffPerRank·steps)`.
//   • stat buffs/debuffs (statMod) + CC: base value on the effect def, +rankScaling.
// The combat AI casts when the cooldown is ready and the cast condition holds.
//
// COOLDOWNS are PER-ABILITY: each ability declares its own `cooldownMs` (the source of
// truth) — there is no category/baseline system. 2026-11-18: every hero cooldown ~3 s longer (user: «4-8 s más de
// media», then «un punto medio entre lo de antes y ahora»; every base cooldown even or ending in 5), not compensated, and a global cooldown between a hero's casts
// (HERO_GLOBAL_COOLDOWN_MS). Late-game CDR (talents/tech/gear)
// reduces these further at cast time (sim/abilities.effectiveCooldown).

export interface AbilityPower {
  coeff: number; // multiplier at rank 1 (× attackDamage for damage/dot, × target maxHP for heal/hot/shield)
  coeffPerRank?: number; // added to coeff per rank beyond the first
  canCrit?: boolean; // instant `damage` effects may crit (uses caster crit stats)
  alwaysCrit?: boolean; // every instant `damage` hit is a crit (no roll) — a modifier's patch sets it
  // AoE splash for a SINGLE-TARGET damage ability: enemies WITHIN splashRadius (world px) of
  // the primary target also take splashCoeff (× attackDamage). Used by Explosive Arrow — the
  // front enemy takes the full `coeff`, only nearby enemies take the reduced splash.
  splashCoeff?: number;
  splashCoeffPerRank?: number;
  splashRadius?: number; // world-px blast radius around the primary target (default 45 ≈ 1.5 bodies; WHOLE_PARTY = everyone)
}

/** A splash radius that reaches every foe on the field: an enemy's area blow hits the whole party, however far
 *  back the archer and the healer stand. */
export const WHOLE_PARTY = Number.POSITIVE_INFINITY;

export interface AppliedEffect {
  effectKey: string;
  durationMsOverride?: number;
  chance?: number; // 0..1 — probabilistic rider (default: always applies)
  // Per-rank growth for THIS effect's statMod/weaken value, overriding the ability-level
  // rankScaling. Use when one ability buffs several stats that scale at different rates
  // (e.g. Bloodlust: +3.75%/rank attack speed but +1%/rank lifesteal).
  valuePerRank?: number;
  // ── An effect of its own inside the ability (docs/redesign/CLASSES.md §6, F3) ──
  /** Who THIS effect lands on, when it is not the ability's target (Smite: the heal goes to the hurt ally,
   *  the strike to the enemy in front). */
  target?: AbilityTarget;
  /** THIS effect's own coefficient, when it does not share the ability's `power`. */
  power?: AbilityPower;
  /** Share of the resolved coefficient this effect takes (default 1). Lets a modifier move part of an
   *  ability's power to another effect or raise one effect's total without restating the numbers. */
  powerScale?: number;
  /** Base value of a stat / weaken / vulnerable effect when it is not the effect def's own. */
  value?: number;
  /** Also laid on the enemies caught in the ability's splash (Explosive Arrow's blast). */
  onSplash?: boolean;
}

export type AbilityTarget =
  | 'self'
  | 'lowestAllyHp'
  | 'lowestOtherAlly' // the hurt-most living ally that is not the caster (nobody when alone)
  | 'frontEnemy'
  | 'backEnemy' // a foe BEHIND the front one, at random — the front one itself when it stands alone
  | 'meleeEnemies'
  | 'allEnemies'
  | 'allAllies'
  | 'randomDpsAlly'
  | 'twoDpsAllies' // two different heroes: damage dealers first, then the tank, then anyone left
  | 'tank'
  // ── targets of the abilities that react (FireRule below) ──
  // The enemy in the caster's shot reach whose BLAST catches the most enemies (the ability's splashRadius) — an
  // elite or a boss among equals, then the nearest. Explosive Arrow: it goes where it does the most, not by priority.
  | 'biggestCluster'
  // The enemy that comes first in the shooting heroes' order (data/enemies TARGET_PRIORITY: support, shooter,
  // beast, soldier, brute; an elite before its kind; a boss when there is one), across the caster's SHOT reach.
  | 'priorityEnemy'
  | 'mostHitAlly' // the living ally that has taken the most damage in the last moments
  | 'hurtAlly' // an ally that has just taken a heavy hit, else the one with the least life
  | 'harmedAlly' // the ally carrying the most harmful effects, else the one with the least life
  // An ally in danger (under data/healing HEAL_URGENT_FRAC: the most hurt), else the one carrying the most harmful
  // effects, else one just struck hard, else the most hurt (Healing Light).
  | 'triageAlly'
  // The hurt-most living ally other than the one the ability itself lands on (a modifier's "and a second ally").
  | 'nextHurtAlly'
  // ── the boss kit (data/bossKit.ts): whom a boss picks among the heroes, wherever they stand ──
  | 'randomEnemy' // any living foe, at random
  | 'softestEnemy' // the living foe with the least armour (the Certero affix)
  | 'topDamageEnemy'; // the living foe that has dealt this boss the most damage in the fight (Roots)

/** What an ability does beyond laying effects (sim/bossMechanics.resolveSpecial). */
export type AbilitySpecial =
  // Summon `count` creatures of data/bossKit SUMMONS; each of their hits is `hitOfTrash` of a normal enemy's.
  | { kind: 'summon'; summon: string; count: number; hitOfTrash: number }
  // Drag every hero `dragPx` back along the path; the caster holds its ground until they have walked back.
  | { kind: 'undertow'; dragPx: number }
  // One more layer of `effectKey` on every hero, each worth `pctPerLayer` % of his life per second.
  | { kind: 'spores'; effectKey: string; pctPerLayer: number }
  // The ground under the party burns for `burnMs`: each hero takes `totalOfHit` of the caster's hit over that time.
  | { kind: 'groundFire'; burnMs: number; totalOfHit: number }
  // Every living hero drops to the share of life of the one who has least.
  | { kind: 'scales' }
  // Reflect the last ability a hero cast (sim/mirror): its harm on the heroes, its boons on the caster.
  // …and, besides (the six mirrors and the dark reflection): each cast lights one more pane — a stack of
  // `paneEffectKey` worth `panePct` % damage — and every `reflectionEvery`-th pane a summon `reflection` of the
  // hero it copied steps out, hitting for `reflectionHit` of a normal enemy's hit.
  | { kind: 'mirror'; harm: number; boon: number; buff: number; panes: number; paneEffectKey: string; panePct: number; reflectionEvery: number; reflection: string; reflectionHit: number }
  // Only once the caster's `panes` panes are all lit (stacks of `paneEffectKey`): it breaks them — they go dark.
  | { kind: 'shatter'; panes: number; paneEffectKey: string }
  // The Crushing Blow (data/bossKit CRUSH): the caster's `crushHit` on the front hero (its own physical/magic mix),
  // and its `crushShock` — all magic — on every hero behind him (sim/worldBossRules crushParty).
  | { kind: 'crush' };

/** WHEN a hero's ability fires once it is ready — its fixed default behaviour (user decision 2026-11-15: no
 *  player settings; "se usa siempre que sea útil y, si está pasando algo concreto, lo aprovecha — nunca se queda
 *  guardada para algo que quizá no llegue"). Read by sim/abilities.conditionMet; worded for the tooltip's
 *  "When it fires" line by the interface (ui/panels/hero/talentWords.fireLine). */
export type FireRule =
  // `foes` or more enemies within the caster's reach, an elite or a boss in reach — or every enemy still alive
  // is already in reach (nothing else is coming, so there is no point in waiting). foes 1 = as soon as one is.
  | { when: 'inReach'; foes: number }
  // The fight is worth a cooldown: `foes` or more enemies alive, or an elite or a boss among them. A buff or a
  // wave-wide hit is not thrown at the last one or two of a wave — the next batch is seconds away.
  | { when: 'worthIt'; foes: number }
  // `foes` or more enemies inside the blast around the front enemy, or that enemy is an elite or a boss.
  | { when: 'cluster'; foes: number }
  // The caster has taken damage in the last RECENT_HIT_MS (a defence is not burnt before any blow comes).
  | { when: 'selfHit' }
  // The caster is under `frac` of its life (a defence's emergency rule against a boss: EMERGENCY_LIFE_FRAC).
  | { when: 'selfBelow'; frac: number }
  // Someone of the party has taken damage in the last RECENT_HIT_MS. `atAreaBlow`: while an enemy that
  // telegraphs an area blow (a boss) is in the fight, it fires as that blow winds up instead.
  | { when: 'partyHit'; atAreaBlow?: boolean }
  // An ally has taken damage in the last RECENT_HIT_MS (the ability's target says which one it lands on).
  | { when: 'allyHit' }
  // An ally is under `frac` of its life — or (`orHeavyHit`) has just taken a single hit of HEAVY_HIT_LIFE_FRAC.
  | { when: 'allyBelow'; frac: number; orHeavyHit?: boolean }
  // `allies` living heroes under `frac` of their life (all of them when the party is smaller), or one under
  // `orOneBelow` — or (`orHarmed`) that many of them carrying a harmful effect.
  | { when: 'partyHurt'; allies: number; frac: number; orOneBelow: number; orHarmed?: number }
  // An ally carries a harmful effect, or is under `frac` of its life — or (`orHeavyHit`) has just taken a heavy hit.
  | { when: 'harmedOrBelow'; frac: number; orHeavyHit?: boolean }
  // A boss in the fight is winding up a blow on the party (a cast bar under it that ends in a hit). `heavy`: only its
  // HEAVY blow (an ability marked `heavy`, the Crushing Blow) — or any blow when the boss has no heavy one.
  | { when: 'bossWindup'; heavy?: boolean };

/** How long a hit stays "recent" for the fire rules, and what share of its life one hit must take from a hero
 *  to count as heavy (sim/recent.ts keeps the bookkeeping). */
export const RECENT_HIT_MS = 2500;
export const HEAVY_HIT_LIFE_FRAC = 0.15;
/** A hero's running tally of damage taken halves every this long (who is taking the MOST damage right now). */
export const RECENT_DAMAGE_HALF_LIFE_MS = 1500;


export interface AbilityDef {
  key: string;
  name: string;
  icon: string;
  desc: string; // one-line flavor/effect summary for tooltips
  cooldownMs: number; // per-ability base cooldown (ms); reduced by CDR at cast time
  // Initial cooldown (ms) seeded when an ENEMY spawns/engages with this ability, so the
  // first cast is offset instead of firing the instant it engages (sim/combat seeds it on
  // boss engage). Undefined/0 = ready immediately. Lets the boss kit stagger its openers.
  openerMs?: number;
  // Cast time (ms): an ENEMY ability with a windup CHANNELS for this long (a cast bar fills
  // under the boss) before its effect resolves — telegraphs the cast. Heroes ignore it
  // (instant, one-per-swing). Undefined/0 = instant.
  castTimeMs?: number;
  // While an ENEMY channels this ability it makes no basic attacks: the windup takes the place of its swings
  // (a boss rears up for its slam instead of slamming on top of its blows — the area attack costs the tank
  // about what the missed swings would have). Needs `castTimeMs`.
  holdsAttack?: boolean;
  /** An ENEMY ability whose damage is always magic (met by magic resist), whatever its caster's own attacks are. */
  magic?: boolean;
  /** What it does beyond its effects (a summon…). */
  special?: AbilitySpecial;
  target: AbilityTarget;
  applies: AppliedEffect[];
  castCondition?: 'always' | 'enemyPresent' | 'allyBelowHpPct' | 'tankEngaged';
  /** Hero abilities: when it fires once ready (its default behaviour). When set it replaces `castCondition`. */
  fires?: FireRule;
  /** Hero abilities: when it fires while a BOSS is in the fight (round 7, user: «diseñar las habilidades para que
   *  tengan 2 triggers. Uno para oleadas, otro para bosses»): any of these rules. Without it, `fires` holds against
   *  bosses too. An ability that lands on an ally and fires because a boss winds up its blow lands on the hero the
   *  blow will strike (the front one). */
  firesBoss?: readonly FireRule[];
  /** Enemy abilities: its HEAVY blow — the one a party keeps its defences for (Stone Skin, a shield…). */
  heavy?: boolean;
  power?: AbilityPower;
  rankScaling?: { perRank: Partial<{ value: number; durationMs: number; cooldownMs: number }> };
  // Charge-gated cast (no cooldown): the ability banks `perAttack` charge(s) per AUTO-
  // attack and fires once it reaches `toCast`, then resets to 0. Rewards attack speed.
  // When set, `cooldownMs` is ignored. The sim tracks charges on Combatant.charges.
  // `perAttack` may be 0: the charges then come from a trigger (Riposte: one per blocked hit).
  charge?: { perAttack: number; toCast: number };
  // Triggers the hero carries while this ability is learned (data/triggers.ts).
  triggers?: readonly TriggerDef[];
  // Passive party AURA (no cast, no cooldown): while this ability is SLOTTED (occupies a
  // loadout slot), every party member gains `baseValue (+valuePerRank·(rank-1))`% of
  // `stat`. Applied at party-build time (sim/loadout.partyAuraMods), never cast.
  aura?: { stat: StatKey; baseValue: number; valuePerRank: number };
}

export const ABILITIES: Record<string, AbilityDef> = {
  // ───────────────────────── Knight ─────────────────────────
  knight_guard: {
    key: 'knight_guard', name: 'Stone Skin', icon: 'guard',
    desc: 'Harden his skin to stone — flat damage reduction to soak incoming hits.',
    cooldownMs: 22000, target: 'self',
    // buff_guard_block: 30% damage reduction at rank 1, +5%/rank → 50% at rank 5. 6s uptime.
    applies: [{ effectKey: 'buff_guard_block' }],
    // Not burnt before any blow comes: it waits until he is actually being hit. Against a boss (round 7) it is kept
    // for the wind-up of its heavy blow (the Crushing Blow) — or of any blow, when the boss has no heavy one.
    // Between the blows it goes up only in an emergency (EMERGENCY_LIFE_FRAC).
    castCondition: 'enemyPresent', fires: { when: 'selfHit' }, firesBoss: [{ when: 'bossWindup', heavy: true }, { when: 'selfBelow', frac: EMERGENCY_LIFE_FRAC }], rankScaling: { perRank: { value: 5 } },
  },
  knight_debilitate: {
    key: 'knight_debilitate', name: 'Debilitating Cleave', icon: 'expose',
    desc: 'A sweeping blow — heavy damage to every enemy in melee range, sapping the damage they deal.',
    cooldownMs: 15000, target: 'meleeEnemies',
    // Bonus damage (1.2×→2.0× AD) + debuff_weaken to EVERY enemy in melee reach: each deals
    // 15%→25% less damage for 6s.
    applies: [{ effectKey: 'fx_damage' }, { effectKey: 'debuff_weaken' }],
    // A sweep wants company: two in reach, or something tough, or the last of the wave. Against a boss (round 7) it
    // waits for the wind-up of its heavy blow: the boss it saps lands that blow softer.
    castCondition: 'enemyPresent', fires: { when: 'inReach', foes: 2 }, firesBoss: [{ when: 'bossWindup', heavy: true }], power: { coeff: 1.2, coeffPerRank: 0.2, canCrit: true },
    rankScaling: { perRank: { value: 2.5 } },
  },
  knight_bulwark: {
    key: 'knight_bulwark', name: 'Bulwark', icon: 'shield',
    desc: 'Brace behind a bulwark — a heavy absorb shield on himself.',
    cooldownMs: 26000, target: 'self',
    applies: [{ effectKey: 'fx_shield', durationMsOverride: 8000 }],
    // Self-shield: 30%→50% of his max HP absorbed (+5%/rank). Against a boss (round 7): raised as its heavy blow winds up.
    castCondition: 'enemyPresent', fires: { when: 'selfHit' }, firesBoss: [{ when: 'bossWindup', heavy: true }, { when: 'selfBelow', frac: EMERGENCY_LIFE_FRAC }], power: { coeff: 0.3, coeffPerRank: 0.05 },
  },
  knight_battlecry: {
    key: 'knight_battlecry', name: 'Battle Cry', icon: 'cry',
    desc: 'A war cry that sharpens the whole party’s offense.',
    cooldownMs: 28000, target: 'allAllies',
    // buff_battlecry_ad 15%→25% AD + buff_battlecry_crit 5%→15% crit (both +2.5/rank). 8s uptime.
    applies: [{ effectKey: 'buff_battlecry_ad' }, { effectKey: 'buff_battlecry_crit' }],
    // Eight seconds of party offence are not spent on the last stragglers of a wave.
    castCondition: 'enemyPresent', fires: { when: 'worthIt', foes: 3 }, rankScaling: { perRank: { value: 2.5 } },
  },
  knight_bloodlust: {
    key: 'knight_bloodlust', name: 'Bloodlust', icon: 'flurry',
    desc: 'Fly into a bloodlust — faster swings that leech life from every hit.',
    cooldownMs: 28000, target: 'self',
    // buff_bloodlust_as 24%→40% attack speed (+4/rank) + buff_bloodlust_ls 8%→12%
    // lifesteal (+1/rank) — the two scale at different rates, so per-effect valuePerRank.
    applies: [
      { effectKey: 'buff_bloodlust_as', valuePerRank: 4 },
      { effectKey: 'buff_bloodlust_ls', valuePerRank: 1 },
    ],
    castCondition: 'enemyPresent', fires: { when: 'worthIt', foes: 3 },
  },

  // ───────────────────────── Priest ─────────────────────────
  priest_mend: {
    key: 'priest_mend', name: 'Mend', icon: 'heal',
    desc: 'A rolling heal on whoever is hurt — amplified by heal power.',
    // Every 16 s (2026-11-18, the longer cooldowns: was 14). It heals over 12 s (was 6; user: «que curasen lo mismo
    // pero durante más tiempo»): the same total, a mending that keeps going — the instant heals answer the bursts.
    // A heal laid again on an ally who still carries one adds what was left of it (sim/effects.applyEffect).
    cooldownMs: 16000, target: 'hurtAlly', applies: [{ effectKey: 'fx_hot', durationMsOverride: 12000 }],
    // HoT coeff is the TOTAL heal over the duration (× target max HP × healPower), spread
    // per-tick. 20%→30% of max HP over 12s (+2.5/rank) — raised with the heal kit (2026-11-16): a heal over time
    // is worth MORE than the instant one beside it (Healing Light), which pays for landing at once.
    // On whoever has just taken a heavy hit; otherwise on the most hurt, once someone is under 70 %. As it is
    // applied it lifts the ally's harmful effects (data/healing).
    // Against a boss (round 7) it is also laid on the hero its heavy blow will strike as the blow winds up — the heal
    // already rolling when it lands; the instant heal (Healing Light) answers it after.
    castCondition: 'allyBelowHpPct', fires: { when: 'allyBelow', frac: 0.7, orHeavyHit: true },
    firesBoss: [{ when: 'bossWindup', heavy: true }, { when: 'allyBelow', frac: 0.7, orHeavyHit: true }], power: { coeff: 0.2, coeffPerRank: 0.025 },
  },
  // Healing Light (2026-11-16, in Power Infusion's place): the instant heal on one ally. Worth ~75 % of Mend (user
  // rule: "si las overtime son 30 %, las instantáneas deben ser 20-25 %"): 15%→22% of the ally's max HP (+1.75/rank),
  // × heal power. It lifts the ally's harmful effects as it lands (data/healing) — Purify's work is the heals' now.
  priest_healing_light: {
    key: 'priest_healing_light', name: 'Healing Light', icon: 'heal',
    desc: 'An instant heal on the ally who needs it most — and every harmful effect lifted from them.',
    cooldownMs: 14000, target: 'triageAlly', applies: [{ effectKey: 'fx_heal' }], // every 14 s (12 until 2026-11-18)
    // An ally under 60 %, one just struck hard, or one carrying a harmful effect: the one in danger first
    // (data/healing HEAL_URGENT_FRAC), then the one carrying something, then the most hurt.
    castCondition: 'allyBelowHpPct', fires: { when: 'harmedOrBelow', frac: 0.6, orHeavyHit: true }, power: { coeff: 0.15, coeffPerRank: 0.0175 },
  },
  priest_holyshield: {
    key: 'priest_holyshield', name: 'Holy Shield', icon: 'shield',
    desc: 'A divine barrier on the ally taking the most damage — absorbs a burst of the hits it’s taking.',
    cooldownMs: 26000, target: 'mostHitAlly', applies: [{ effectKey: 'fx_shield', durationMsOverride: 4000 }],
    // Shield = 10%→20% of that ally's max HP (+2.5/rank). On whoever is taking the most damage right now —
    // the tank most of the time, an archer's target behind him when that is where the blows land.
    // Against a boss (round 7): raised on the hero its heavy blow will strike, as it winds up.
    castCondition: 'tankEngaged', fires: { when: 'allyHit' }, firesBoss: [{ when: 'bossWindup', heavy: true }, { when: 'allyBelow', frac: EMERGENCY_LIFE_FRAC }], power: { coeff: 0.1, coeffPerRank: 0.025 },
  },
  priest_nova: {
    key: 'priest_nova', name: 'Holy Nova', icon: 'holy',
    desc: 'A burst of holy light damaging the whole wave.',
    cooldownMs: 24000, target: 'allEnemies', applies: [{ effectKey: 'fx_damage' }],
    // Per-target wave damage: 1.2× → 2.8× AD (+0.4/rank).
    castCondition: 'enemyPresent', fires: { when: 'worthIt', foes: 3 }, power: { coeff: 1.2, coeffPerRank: 0.4, canCrit: true },
  },
  // Circle of Healing (2026-11-16, in Purify's place): the instant heal on the whole party, worth ~75 % of
  // Sanctuary (user: "si la cura over time grupal es 20, la cura aoe grupal instant debe ser 15"): 9%→15% of each
  // one's max HP (+1.5/rank), × heal power. Each of them has its harmful effects lifted as it lands (data/healing).
  priest_circle: {
    key: 'priest_circle', name: 'Circle of Healing', icon: 'holy',
    desc: 'An instant heal on the whole party — and every harmful effect lifted from each of them.',
    cooldownMs: 22000, target: 'allAllies', applies: [{ effectKey: 'fx_heal' }], // every 22 s (20 until 2026-11-18)
    // A party heal is for a hurt party (two heroes under 80 %, or one under half) — or two of them carrying a
    // harmful effect.
    castCondition: 'allyBelowHpPct', fires: { when: 'partyHurt', allies: 2, frac: 0.8, orOneBelow: 0.5, orHarmed: 2 }, power: { coeff: 0.09, coeffPerRank: 0.015 },
  },

  // ───────────────────────── Ranger ─────────────────────────
  ranger_fast_fire: {
    key: 'ranger_fast_fire', name: 'Rapid Fire', icon: 'fast',
    desc: 'A sustained burst of attack speed.',
    cooldownMs: 28000, target: 'self', applies: [{ effectKey: 'buff_fast_fire' }],
    // buff_fast_fire 25%→45% attack speed (+5/rank). 8s uptime.
    castCondition: 'enemyPresent', fires: { when: 'worthIt', foes: 3 }, rankScaling: { perRank: { value: 5 } },
  },
  ranger_aimedshot: {
    key: 'ranger_aimedshot', name: 'Aimed Shot', icon: 'aim',
    desc: 'A heavy charged shot — banks 1 charge per auto-attack, fires at 10.',
    // The heavy shot goes to whoever comes first in her order (the support, then the shooters…).
    cooldownMs: 0, target: 'priorityEnemy', applies: [{ effectKey: 'fx_damage' }],
    castCondition: 'enemyPresent', fires: { when: 'inReach', foes: 1 }, power: { coeff: 1.8, coeffPerRank: 0.4, canCrit: true },
    charge: { perAttack: 1, toCast: 10 },
  },
  ranger_multishot: {
    key: 'ranger_multishot', name: 'Raining Arrows', icon: 'arrows',
    desc: 'A volley spread across the whole wave.',
    cooldownMs: 24000, target: 'allEnemies', applies: [{ effectKey: 'fx_damage' }],
    // Per-target wave damage: 1.2× → 2.8× AD (+0.4/rank).
    castCondition: 'enemyPresent', fires: { when: 'worthIt', foes: 3 }, power: { coeff: 1.2, coeffPerRank: 0.4, canCrit: true },
  },
  ranger_focus: {
    key: 'ranger_focus', name: 'Explosive Arrow', icon: 'explosion',
    desc: 'A detonating arrow: a heavy hit where its blast catches the most enemies, and a lesser one on those nearby.',
    cooldownMs: 20000, target: 'biggestCluster', applies: [{ effectKey: 'fx_damage' }],
    // The enemy whose blast catches the most (user decision 2026-11-15: the pile, not the priority) 1.6×→3.2× AD (+0.4/rank, can crit); splash 0.6×→1.2× AD (+0.15/rank) to
    // enemies within ~1.5 bodies (45 world-px) of the primary target.
    // The blast needs something to catch: two in it, or a tough target.
    castCondition: 'enemyPresent', fires: { when: 'cluster', foes: 2 },
    power: { coeff: 1.6, coeffPerRank: 0.4, canCrit: true, splashCoeff: 0.6, splashCoeffPerRank: 0.15, splashRadius: 45 },
  },
  ranger_frozentrap: {
    key: 'ranger_frozentrap', name: 'Caltrops', icon: 'dot',
    desc: 'Hurl a spray of caltrops that spread across the ground ahead — bleeding every enemy in the field for 4s.',
    cooldownMs: 26000, target: 'allEnemies', applies: [{ effectKey: 'fx_dot', durationMsOverride: 4000 }],
    // Wave DoT over 4s: total damage per enemy = 0.6×→1.4× AD (+0.2/rank), dealt in 100ms ticks.
    castCondition: 'enemyPresent', fires: { when: 'worthIt', foes: 3 }, power: { coeff: 0.6, coeffPerRank: 0.2 },
  },

  // ───────────── Branch abilities (docs/redesign/CLASSES.md, first wave) ─────────────
  ...BRANCH_ABILITIES,

  // ───────────── The boss kit: affix abilities and world-boss mechanics (data/bossKit.ts) ─────────────
  ...BOSS_ABILITIES,

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
  // THE BACK LINE TAKES DAMAGE (docs/DIFFICULTY.md §5b, user decision 2026-11-15). Two sources only:
  //   • shooters aim behind the tank — a share of an archer's basic shots (data/enemies `backShotChance`) and
  //     its charged shot below (`backEnemy`);
  //   • area blows — the brute's Smash and the bosses' telegraphed slam hit the front hero in full and
  //     everyone else for `splashCoeff` (WHOLE_PARTY).
  // Each hit is mitigated by ITS OWN target (armour / magic resist / damage reduction, shields). Tuned with
  // scripts/measure-backline.ts: ~25–30 % of a full wave's damage lands behind the front hero.
  enemy_smash: {
    key: 'enemy_smash', name: 'Brutal Smash', icon: 'explosion',
    desc: 'A brute winds up a heavy blow on the front hero; the shock reaches everyone behind for less.',
    cooldownMs: 9000, target: 'frontEnemy', applies: [{ effectKey: 'fx_damage' }],
    castCondition: 'enemyPresent', power: { coeff: 2.2, splashCoeff: 0.3, splashRadius: WHOLE_PARTY },
  },
  // Temblor (data/enemies TRAIT_TUNING.tremor: the brute's blow from Eternal on): the same blow, and the heroes
  // it reaches carry `debuff_tremor` (data/effects) for a moment — on the front hero and, riding the splash, on
  // everyone behind.
  enemy_smash_tremor: {
    key: 'enemy_smash_tremor', name: 'Tremor Smash', icon: 'explosion',
    desc: 'A brute winds up a heavy blow on the front hero; the shock reaches everyone behind for less and leaves them all attacking slower for a moment.',
    cooldownMs: 9000, target: 'frontEnemy', applies: [{ effectKey: 'fx_damage' }, { effectKey: 'debuff_tremor', onSplash: true }],
    castCondition: 'enemyPresent', power: { coeff: 2.2, splashCoeff: 0.3, splashRadius: WHOLE_PARTY },
  },
  enemy_aimed: {
    key: 'enemy_aimed', name: 'Arcing Shot', icon: 'aim',
    desc: 'An archer lofts a heavy shot over the front line at a hero behind it (at the front hero when it stands alone).',
    cooldownMs: 7000, target: 'backEnemy', applies: [{ effectKey: 'fx_damage' }],
    castCondition: 'enemyPresent', power: { coeff: 0.7 },
  },

  // ───────────────────── Boss area blows (DIFFICULTY.md §5b) ─────────────────────
  // Every boss TELEGRAPHS one area attack: it channels (the cast bar under it fills), then the blow lands on the
  // front hero in full and on everyone behind for less. Stage bosses and world bosses each have their own, on
  // every difficulty; a boss alone with a solo hero just hits that hero.
  boss_slam: {
    key: 'boss_slam', name: 'Ground Slam', icon: 'explosion',
    desc: 'The stage boss rears up and slams the ground: a heavy blow on the front hero that shakes everyone behind for less.',
    cooldownMs: 10000, openerMs: 4000, castTimeMs: 1500, holdsAttack: true, target: 'frontEnemy',
    applies: [{ effectKey: 'fx_damage' }], castCondition: 'enemyPresent',
    // 1.2 on the front hero ≈ the swings missed while channelling (1.5 s at 0.8/s): the tank's load is unchanged.
    power: { coeff: 1.2, splashCoeff: 0.6, splashRadius: WHOLE_PARTY },
  },
  boss_shockwave: {
    key: 'boss_shockwave', name: 'Shockwave', icon: 'explosion',
    desc: 'The world boss gathers itself and lets go a shockwave: the front hero takes it in full, everyone behind for less.',
    cooldownMs: 10000, openerMs: 4000, castTimeMs: 1500, holdsAttack: true, target: 'frontEnemy',
    applies: [{ effectKey: 'fx_damage' }], castCondition: 'enemyPresent',
    power: { coeff: 1.2, splashCoeff: 0.6, splashRadius: WHOLE_PARTY },
  },

  // ───────────────────── Herida mortal (an AFFIX: data/bossKit.ts) ─────────────────────
  // A heavy blow, CHANNELLED for 1.5 s (the cast bar fills under the boss), that also cuts the healing its target
  // receives. It used to be the Torment world bosses' own; it is now one of the seven affixes any boss may carry
  // (Frenzy, the other old world-boss ability, became the Enfurecido affix: a stacking effect, no cast).
  boss_mortal_wound: {
    key: 'boss_mortal_wound', name: 'Mortal Wound', icon: 'expose',
    desc: 'A crippling blow that wounds the tank, cutting its healing received by 25% for 8s.',
    cooldownMs: 15000, openerMs: 2000, castTimeMs: 1500, target: 'frontEnemy',
    applies: [{ effectKey: 'fx_damage' }, { effectKey: 'debuff_mortal_wound' }],
    castCondition: 'enemyPresent', power: { coeff: 1.5 },
  },
};

/** The ability every WORLD boss wields on every difficulty: its telegraphed area blow (§5b). Its mechanic and
 *  its affixes are added by the boss kit (data/bossKit.ts, sim/bossMechanics.bossKit). */
const WORLD_BOSS_ABILITIES: readonly string[] = ['boss_shockwave'];

/** The abilities every STAGE boss wields, on every difficulty: its telegraphed area blow (§5b). */
const STAGE_BOSS_ABILITIES: readonly string[] = ['boss_slam'];

export function stageBossAbilityKeys(): string[] {
  return [...STAGE_BOSS_ABILITIES];
}

export function worldBossAbilityKeys(): string[] {
  return [...WORLD_BOSS_ABILITIES];
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
