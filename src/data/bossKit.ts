import type { AbilityDef } from './abilities';
import { WHOLE_PARTY } from './abilities';
import { worldInDifficulty } from './difficulties';
import { tryWorldDef } from './worlds';

// THE BOSS KIT (docs/redesign/PROGRESS.md "Combate, segunda ola", items C and D; agreed with the user 2026-11-15).
// A boss is: its telegraphed AREA BLOW (data/abilities boss_slam / boss_shockwave) + AFFIXES picked from a list
// (stage bosses from Hell, world bosses from Inferno) + — world bosses only — a MECHANIC of its own, chosen by the
// figure that world fights as (data/worlds `worldBoss`). Everything is numbers here; the rules are in
// sim/bossMechanics.ts. All strengths are deliberately conservative: the final pacing pass tunes them
// (docs/redesign/PACING_REPORT.md R.8).

// ── Affixes ─────────────────────────────────────────────────────────────────────────────────────────────────

export type BossAffixKey = 'armored' | 'vampiric' | 'frenzied' | 'seismic' | 'venomous' | 'deadeye' | 'mortalWound';

export const BOSS_AFFIX_KEYS: readonly BossAffixKey[] = ['armored', 'vampiric', 'frenzied', 'seismic', 'venomous', 'deadeye', 'mortalWound'];

export type BossRank = 'stage' | 'world';

/** Which affixes each rank of boss may carry. VAMPÍRICO is a stage boss's alone (user decision, 2026-11-15): a
 *  world boss — a wall of a minute — draws from the other six. */
export const AFFIX_POOL: Readonly<Record<BossRank, readonly BossAffixKey[]>> = {
  stage: BOSS_AFFIX_KEYS,
  world: BOSS_AFFIX_KEYS.filter((k) => k !== 'vampiric'),
};

/** How many affixes a boss carries, by difficulty index (0 = Normal … 4 = Torment). Stage bosses: none in Normal,
 *  one from Hell, two in Eternal and Torment. World bosses (on top of their own mechanic): one from Inferno, two
 *  in Torment. */
export const AFFIX_COUNT: Readonly<Record<BossRank, readonly number[]>> = {
  stage: [0, 1, 1, 2, 2],
  world: [0, 0, 1, 1, 2],
};

export const BOSS_AFFIX = {
  /** ACORAZADO: a shell that soaks damage worth `shellFrac` of its life; while it holds, the boss takes
   *  `damageTaken` of every hit; a crit wears it `critWear` times as fast; it returns `returnMs` after breaking. */
  armored: { effectKey: 'buff_boss_shell', shellFrac: 0.1, damageTaken: 0.7, critWear: 2, returnMs: 15_000 },
  /** VAMPÍRICO (stage bosses only — AFFIX_POOL): heals this share of its life with each basic hit that lands
   *  unblocked. */
  vampiric: { healFrac: 0.03 },
  /** FRENÉTICO (EN "Frenzied"; "Enfurecido / Enraged" is the enrage after the clock, nothing else): one stack of
   *  `effectKey` (+5 % attack speed each) every `everyMs` of the fight, up to `maxStacks`. */
  frenzied: { effectKey: 'buff_boss_frenzy', everyMs: 5000, maxStacks: 12 },
  /** SÍSMICO: its area blow comes this often instead of every 10 s. `effectKey` is only what the strip reads to
   *  shake the ground at its feet for as long as the fight lasts (it does nothing in the simulation). */
  seismic: { blowEveryMs: 6000, effectKey: 'buff_boss_tremor' },
  /** VENENOSO: every hit that lands leaves a stack of `effectKey` on the hero (each `pctPerStack` % of its life per
   *  second, up to the effect's maxStacks); the effect's own duration is how long it lingers without a new hit. */
  venomous: { effectKey: 'debuff_venom', pctPerStack: 1 },
  /** CERTERO: every 8 s an attack on the hero with the least armour (the ability's cooldown). */
  deadeye: { abilityKey: 'boss_deadeye' },
  /** HERIDA MORTAL: its heavy blow cuts the tank's healing (the ability carries it) and lands for `coeff` of the
   *  boss's hit — harder from a world boss. */
  mortalWound: { abilityKey: 'boss_mortal_wound', coeff: { stage: 1.5, world: 2.5 } satisfies Record<BossRank, number> },
} as const;

// ── World-boss pressure ─────────────────────────────────────────────────────────────────────────────────────

/** How hard a WORLD boss presses the party during its minute, by difficulty (user decision, 2026-11-16: "jefes que
 *  peguen más fuerte durante el minuto" — from Hell on, a party must need its tank's defences and its Priest's heals
 *  to see the end of the minute, however well geared). Its life and its enrage are untouched here (the wall's pace
 *  is the final pacing pass's); this is only what it does to the party while the clock runs.
 *    - hitMult:        × the damage of its every hit (basic attacks, its area blow, its affixes' blows);
 *    - blowEveryMs:    its area blow comes this often (Sísmico, when faster, still wins);
 *    - blowCoeff:      the blow on the front hero, × its hit;
 *    - splashCoeff:    the blow on everyone behind, × its hit;
 *    - backShotChance: the share of its basic attacks aimed at a hero behind the front one — sustained damage on
 *                      the back line. */
export interface WorldBossPressure {
  hitMult: number;
  blowEveryMs: number;
  blowCoeff: number;
  splashCoeff: number;
  backShotChance: number;
}

/** Normal → Torment. Normal is the world boss as it was (any build passes); the rest are tuned against the build
 *  study (scripts/build-study.ts: a Priest who carries no heal must not see the end of a wall from Hell on). */
// Tuned 2026-11-16 (docs/redesign/PACING_REPORT.md, round 3 checkpoint 2) by SURVIVAL against a wall that cannot
// die (scripts/pressure-survival.ts): a party with heals at ~85 % of the zone keeps everyone standing through the
// minute; the same party with a Priest who carries no heal, at ~150 %, loses a hero before 34 s (the time a 150 %
// party needs on a wall tuned to die at 60 s to 85 %).
export const WORLD_BOSS_PRESSURE: readonly WorldBossPressure[] = [
  { hitMult: 1, blowEveryMs: 10_000, blowCoeff: 1.2, splashCoeff: 0.6, backShotChance: 0 },
  { hitMult: 1, blowEveryMs: 6_000, blowCoeff: 1.2, splashCoeff: 1.2, backShotChance: 0.5 },
  // From Inferno the blow lands on the front hero far harder (coordinator, 2026-11-16: a Knight who carries his
  // defences must win in margin too): Stone Skin, Debilitate and Hold the Line are what take it.
  { hitMult: 1, blowEveryMs: 6_000, blowCoeff: 2.0, splashCoeff: 1.2, backShotChance: 0.5 },
  { hitMult: 1.15, blowEveryMs: 6_000, blowCoeff: 2.4, splashCoeff: 1.2, backShotChance: 0.55 },
  { hitMult: 1.45, blowEveryMs: 6_000, blowCoeff: 2.8, splashCoeff: 1.2, backShotChance: 0.55 },
];

/** The pressure of a world boss at difficulty index `d` (clamped to the table). */
export function worldBossPressure(d: number): WorldBossPressure {
  const i = Math.max(0, Math.min(WORLD_BOSS_PRESSURE.length - 1, Math.floor(d)));
  const p = WORLD_BOSS_PRESSURE[i] ?? WORLD_BOSS_PRESSURE[0];
  if (p === undefined) throw new Error('WORLD_BOSS_PRESSURE is empty');
  return p;
}

/** A small deterministic hash stream (mulberry32) — NOT the simulation's rng: picking affixes must not move the
 *  combat/loot stream, and the same stage must show the same affixes every time within a run. */
function stream(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The affixes of the boss of global stage `S` in the run seeded `runSeed`: `AFFIX_COUNT` of them, all different,
 *  drawn from a stream seeded by (run seed, stage) alone. */
export function bossAffixes(runSeed: number, S: number, rank: BossRank, difficultyIndex: number): BossAffixKey[] {
  const count = AFFIX_COUNT[rank][Math.max(0, Math.min(4, Math.floor(difficultyIndex)))] ?? 0;
  if (count <= 0) return [];
  const next = stream((runSeed ^ Math.imul(S + 1, 0x9e3779b1)) >>> 0);
  const pool = [...AFFIX_POOL[rank]];
  const picked: BossAffixKey[] = [];
  while (picked.length < count && pool.length > 0) picked.push(...pool.splice(Math.floor(next() * pool.length), 1));
  // Shown and applied in the list's own order, whatever order they were drawn in.
  return BOSS_AFFIX_KEYS.filter((k) => picked.includes(k));
}

// ── Summons ─────────────────────────────────────────────────────────────────────────────────────────────────

export interface SummonDef {
  key: string;
  /** How long it stays if nobody kills it (ms). */
  lifeMs: number;
  /** Its life, as a share of a GRUNT's at that stage ("poca vida": a couple of arrows). */
  hpOfGrunt: number;
  attacksPerSec: number;
  /** How fast it flies to its place over the back line (px/s). */
  flySpeed: number;
  /** Its own place: this share of the way from the back line's first hero to the front hero (0 = on the back
   *  line, 1 = on the tank). Without it — or with a hero alone — the place of SUMMON_HOVER. */
  between?: number;
}

/** Where summons hover: the first one `ahead` × the party's column gap in front of the second hero of the
 *  column (so behind the front hero's back), each next one `apart` px further on. */
export const SUMMON_HOVER = { ahead: 0.6, apart: 11 } as const;

export const SUMMONS: Readonly<Record<string, SummonDef>> = {
  crow: { key: 'crow', lifeMs: 8000, hpOfGrunt: 0.6, attacksPerSec: 0.6, flySpeed: 230 },
  /** The dark reflection of a hero (Espejos): it steps out of the mirror and goes for the back line. Sturdy enough
   *  that killing it is a choice — about four of the shooter's basic hits at that stage (a normal enemy takes
   *  two or three). It attacks at the pace of the hero it reflects, held within `attackSpeed` (MECHANIC.mirror).
   *  `between`: it stands half-way between the back line and the front hero — a figure as big as they are, on
   *  its own, clear of everyone (user, 2026-11-16) — and strikes from there. */
  reflection: { key: 'reflection', lifeMs: 8000, hpOfGrunt: 1.5, attacksPerSec: 1, flySpeed: 170, between: 0.5 },
};

// ── Mechanics of the world bosses ───────────────────────────────────────────────────────────────────────────

export type BossMechanicKey = 'flock' | 'roots' | 'chainBolt' | 'guilt' | 'gildedSilence' | 'undertow' | 'spores' | 'redBlade' | 'scales' | 'mirror';

/** The mechanic of the world boss fought as each figure (data/worlds `worldBoss`): one per world. */
export const WORLD_BOSS_MECHANIC: Readonly<Record<string, BossMechanicKey>> = {
  crowmother: 'flock',
  mistletoe: 'roots',
  drownedmoon: 'chainBolt',
  scapegoat: 'guilt',
  abbot: 'gildedSilence',
  ninthwave: 'undertow',
  amanita: 'spores',
  quench: 'redBlade',
  verdict: 'scales',
  unmaker: 'mirror',
};

/** Per-difficulty numbers of a mechanic, index 0 = Normal … 4 = Torment: mild in Normal, tightening after. */
type ByDifficulty = readonly [number, number, number, number, number];
const at = (table: ByDifficulty, d: number): number => table[Math.max(0, Math.min(4, Math.floor(d)))] ?? table[0];

export const MECHANIC = {
  /** BANDADA (the Crowmother): every `everyMs` she opens her wings and looses `crows` crows that fly to the back
   *  line and peck it — each peck `peckOfTrash` of a normal enemy's hit there — until killed or gone (SUMMONS.crow). */
  flock: { abilityKey: 'boss_flock', everyMs: 15_000, openerMs: 7000, castMs: 1500, crows: [2, 3, 3, 3, 4] as ByDifficulty, peckOfTrash: [0.35, 0.5, 0.6, 0.7, 0.8] as ByDifficulty },
  /** RAÍCES (Our Lady of Mistletoe): every `everyMs` she binds the hero who has dealt her the most damage; it
   *  cannot attack or cast for `holdMs`. */
  roots: { abilityKey: 'boss_roots', everyMs: [18_000, 15_000, 15_000, 15_000, 12_000] as ByDifficulty, openerMs: 8000, castMs: 1500, holdMs: 5000 },
  /** RAYO EN CADENA (the Drowned Moon): every `everyMs` a bolt falls on a hero picked at random for `coeff` of the
   *  boss's hit (magic) and jumps to every other hero for `jump` of it. */
  chainBolt: { abilityKey: 'boss_chain_bolt', everyMs: 12_000, openerMs: 7000, castMs: 1500, coeff: [0.8, 1.0, 1.1, 1.2, 1.3] as ByDifficulty, jump: [0.4, 0.5, 0.55, 0.6, 0.65] as ByDifficulty },
  /** CULPA (the Scapegoat): every `everyMs` it marks a hero, picked at random, for `holdMs`. While marked, the
   *  hero pays for the damage the PARTY deals the boss: for every 1 % of its life the boss loses, the hero loses
   *  `lifePerBossPct` % of his own. (Measured in shares of life, not in raw damage: what the party deals a wall
   *  grows from 1.5× to 12× a back-line hero's life PER SECOND between Normal and Hell, so no flat share of the
   *  damage itself works on both.) In a fight on pace (a wall falls in 60 s) one mark costs `holdMs`/60 s ×
   *  `lifePerBossPct` of his life: 20 % in Normal, 33 % in Torment. (Numbers: user decision, 2026-11-15.) */
  guilt: { abilityKey: 'boss_guilt', everyMs: [20_000, 18_000, 18_000, 18_000, 15_000] as ByDifficulty, openerMs: 6000, castMs: 1500, holdMs: 8000, lifePerBossPct: [1.5, 1.75, 2, 2.25, 2.5] as ByDifficulty },
  /** SILENCIO DORADO (the Gilded Abbot): every `everyMs`, for `holdMs` the cooldowns of every hero's abilities
   *  stand still (an ability that is ready can still be cast; charges still build). */
  gildedSilence: { abilityKey: 'boss_gild', everyMs: [24_000, 20_000, 20_000, 18_000, 16_000] as ByDifficulty, openerMs: 8000, castMs: 1500, holdMs: 6000 },
  /** RESACA (the Ninth Wave): every `everyMs` a wave strikes all three heroes for `coeff` of the boss's hit and
   *  drags them `dragPx` back along the path; the boss holds its ground meanwhile, and they do not attack until
   *  they have walked back (the simulation's own rule: nobody attacks on the move). It also breaks off what each
   *  hero was winding up — his swing, or the ability he would have cast with it, starts over; an ability it cut
   *  short was never cast, so its cooldown is not spent (user decision, 2026-11-15). */
  undertow: { abilityKey: 'boss_undertow', everyMs: 12_000, openerMs: 6000, castMs: 1500, coeff: [0.5, 0.6, 0.7, 0.8, 0.9] as ByDifficulty, dragPx: [50, 70, 85, 100, 120] as ByDifficulty },
  /** ESPORAS (the Destroying Angel): every `everyMs` a cloud settles one more layer of `effectKey` on every hero —
   *  each layer `pctPerLayer` % of his life per second, up to the effect's maxStacks, renewed by every cloud. Any
   *  DIRECT heal on a hero (an instant heal: not a rolling one, not regeneration or lifesteal) clears his. */
  spores: { abilityKey: 'boss_spores', effectKey: 'debuff_spores', everyMs: [12_000, 10_000, 10_000, 10_000, 8000] as ByDifficulty, openerMs: 5000, castMs: 1500, pctPerLayer: [0.2, 0.3, 0.4, 0.5, 0.6] as ByDifficulty },
  /** HOJA AL ROJO (the Quench): every `everyMs` the ground under all three heroes burns for `burnMs`, dealing each
   *  `totalOfHit` of the boss's hit over that time. It is the GROUND that burns: nothing is laid on the heroes. */
  redBlade: { abilityKey: 'boss_red_blade', everyMs: [18_000, 15_000, 15_000, 15_000, 12_000] as ByDifficulty, openerMs: 7000, castMs: 1500, burnMs: 6000, totalOfHit: [0.6, 0.8, 1.0, 1.2, 1.4] as ByDifficulty },
  /** BALANZA (the Verdict): every `everyMs` it levels the party — every living hero drops to the SHARE of life of
   *  the one who has least. Always the whole way (user: "siempre"); only how often changes. */
  scales: { abilityKey: 'boss_scales', everyMs: [20_000, 15_000, 15_000, 15_000, 12_000] as ByDifficulty, openerMs: 9000, castMs: 1500 },
  /** ESPEJOS (the Unmaker): every `everyMs` it reflects the last ability a hero cast. What that ability does to
   *  ENEMIES falls on the heroes at `harm` of its strength (the boss's hit standing in for the hero's); what it
   *  does for ALLIES the boss takes for itself — heals and shields at `boon` of their strength (they are shares
   *  of ITS life), buffs at `buff` of theirs. Of the buffs a boss has a use for attack speed, damage reduction and
   *  attack damage (it hits that much harder while it lasts); crit, lifesteal and block do nothing for it.
   *  Nothing to reflect yet: nothing happens.
   *
   *  THE SIX MIRRORS (user, 2026-11-15: "demasiado forgiving para ser el boss del mundo 10"). Every cast also
   *  lights one of its `panes` panes: each lit pane is `paneDamagePct` % more damage for the rest of the fight.
   *  With all of them lit — the sixth cast, at 47.5 s with a mirror every 8 s (user, 2026-11-16: every 10 s put
   *  the breaking a second before the enrage, where nobody who wins in time sees it) — it BREAKS them: `shatter`, an
   *  area blow on all three for `coeff` of its hit behind its own cast bar; the panes go dark (and their bonus
   *  with them, before the blow lands) and it starts lighting them again.
   *
   *  THE DARK REFLECTION. Every `reflection.every`-th pane a reflection of the hero whose ability it copied
   *  steps out of the mirror (SUMMONS.reflection): it goes for that hero if he stands behind the front one, else
   *  for whoever does, for 8 s or until it is killed. Never two at once: one that is due while the last still
   *  stands waits for it to fall or run out (sim/mirror). Each hit is `hitOfTrash` of a normal enemy's hit there —
   *  NOT a share of the hero's own damage, as first proposed: a hero's hit is sized against enemies' life and is
   *  several times a hero's whole life from Hell on. */
  mirror: { abilityKey: 'boss_mirror', everyMs: 8000, openerMs: 6000, castMs: 1500, harm: [0.25, 0.3, 0.35, 0.4, 0.45] as ByDifficulty, boon: [0.02, 0.03, 0.04, 0.05, 0.06] as ByDifficulty, buff: [0.3, 0.4, 0.5, 0.6, 0.7] as ByDifficulty,
    panes: 6, paneEffectKey: 'buff_mirror_panes', paneDamagePct: [5, 6, 7, 8, 10] as ByDifficulty,
    shatter: { abilityKey: 'boss_shatter', castMs: 1500, coeff: [1.2, 1.45, 1.7, 1.95, 2.2] as ByDifficulty },
    reflection: { summon: 'reflection', every: [2, 2, 2, 2, 2] as ByDifficulty, hitOfTrash: [0.8, 0.95, 1.1, 1.25, 1.4] as ByDifficulty, attackSpeed: [0.6, 1.6] as const } },
} as const;

/** Abilities a mechanic brings BESIDES its own (the boss holds them ahead of it, so they go first when their
 *  moment comes): Espejos' breaking of the mirrors. Built per difficulty by `mechanicAbility`, like the main one. */
export const MECHANIC_EXTRAS: Readonly<Partial<Record<BossMechanicKey, readonly string[]>>> = {
  mirror: [MECHANIC.mirror.shatter.abilityKey],
};

/** The mechanic of the world boss of global stage `S`, if its world's boss has one. */
export function worldBossMechanic(S: number): BossMechanicKey | undefined {
  const figure = tryWorldDef(worldInDifficulty(S))?.worldBoss?.key;
  return figure === undefined ? undefined : WORLD_BOSS_MECHANIC[figure];
}

/** The ability a world boss casts for its mechanic at difficulty `d`: the catalogue's definition (data/abilities)
 *  with that difficulty's numbers. Its key never changes, so everything keyed on it (looks, names) holds. */
export function mechanicAbility(base: AbilityDef, mechanic: BossMechanicKey, d: number): AbilityDef {
  switch (mechanic) {
    case 'flock':
      return { ...base, cooldownMs: MECHANIC.flock.everyMs, openerMs: MECHANIC.flock.openerMs, castTimeMs: MECHANIC.flock.castMs, special: { kind: 'summon', summon: 'crow', count: at(MECHANIC.flock.crows, d), hitOfTrash: at(MECHANIC.flock.peckOfTrash, d) } };
    case 'roots':
      return { ...base, cooldownMs: at(MECHANIC.roots.everyMs, d), openerMs: MECHANIC.roots.openerMs, castTimeMs: MECHANIC.roots.castMs, applies: [{ effectKey: 'debuff_rooted', durationMsOverride: MECHANIC.roots.holdMs }] };
    case 'chainBolt':
      return { ...base, cooldownMs: MECHANIC.chainBolt.everyMs, openerMs: MECHANIC.chainBolt.openerMs, castTimeMs: MECHANIC.chainBolt.castMs, power: { coeff: at(MECHANIC.chainBolt.coeff, d), splashCoeff: at(MECHANIC.chainBolt.coeff, d) * at(MECHANIC.chainBolt.jump, d), splashRadius: WHOLE_PARTY } };
    case 'guilt':
      return { ...base, cooldownMs: at(MECHANIC.guilt.everyMs, d), openerMs: MECHANIC.guilt.openerMs, castTimeMs: MECHANIC.guilt.castMs, applies: [{ effectKey: 'debuff_guilt', durationMsOverride: MECHANIC.guilt.holdMs, value: at(MECHANIC.guilt.lifePerBossPct, d) }] };
    case 'gildedSilence':
      return { ...base, cooldownMs: at(MECHANIC.gildedSilence.everyMs, d), openerMs: MECHANIC.gildedSilence.openerMs, castTimeMs: MECHANIC.gildedSilence.castMs, applies: [{ effectKey: 'debuff_gilded', durationMsOverride: MECHANIC.gildedSilence.holdMs }] };
    case 'spores':
      return { ...base, cooldownMs: at(MECHANIC.spores.everyMs, d), openerMs: MECHANIC.spores.openerMs, castTimeMs: MECHANIC.spores.castMs, special: { kind: 'spores', effectKey: MECHANIC.spores.effectKey, pctPerLayer: at(MECHANIC.spores.pctPerLayer, d) } };
    case 'redBlade':
      return { ...base, cooldownMs: at(MECHANIC.redBlade.everyMs, d), openerMs: MECHANIC.redBlade.openerMs, castTimeMs: MECHANIC.redBlade.castMs, special: { kind: 'groundFire', burnMs: MECHANIC.redBlade.burnMs, totalOfHit: at(MECHANIC.redBlade.totalOfHit, d) } };
    case 'scales':
      return { ...base, cooldownMs: at(MECHANIC.scales.everyMs, d), openerMs: MECHANIC.scales.openerMs, castTimeMs: MECHANIC.scales.castMs };
    case 'mirror': {
      const m = MECHANIC.mirror;
      if (base.key === m.shatter.abilityKey) {
        const coeff = at(m.shatter.coeff, d);
        return { ...base, castTimeMs: m.shatter.castMs, power: { coeff, splashCoeff: coeff, splashRadius: WHOLE_PARTY }, special: { kind: 'shatter', panes: m.panes, paneEffectKey: m.paneEffectKey } };
      }
      return {
        ...base, cooldownMs: m.everyMs, openerMs: m.openerMs, castTimeMs: m.castMs,
        special: {
          kind: 'mirror', harm: at(m.harm, d), boon: at(m.boon, d), buff: at(m.buff, d),
          panes: m.panes, paneEffectKey: m.paneEffectKey, panePct: at(m.paneDamagePct, d),
          reflectionEvery: at(m.reflection.every, d), reflection: m.reflection.summon, reflectionHit: at(m.reflection.hitOfTrash, d),
        },
      };
    }
    case 'undertow':
      return { ...base, cooldownMs: MECHANIC.undertow.everyMs, openerMs: MECHANIC.undertow.openerMs, castTimeMs: MECHANIC.undertow.castMs, power: { coeff: at(MECHANIC.undertow.coeff, d), splashCoeff: at(MECHANIC.undertow.coeff, d), splashRadius: WHOLE_PARTY }, special: { kind: 'undertow', dragPx: at(MECHANIC.undertow.dragPx, d) } };
  }
}
