import type { AbilityDef } from './abilities';
import { WHOLE_PARTY } from './abilities';
import { difficultyIndexOf, worldInDifficulty } from './difficulties';
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
 *    - hitMult:        × the damage of its hits AWAY FROM THE FRONT (its basic attacks on the heroes behind, its area
 *                      blow's splash, its affixes' blows). What it deals the FRONT hero is the anchor table's (round 6:
 *                      data/stageScaling ZONE_BOSS_HIT_TUNE, Combatant.frontHit);
 *    - blowEveryMs:    its area blow comes this often (Sísmico, when faster, still wins);
 *    - blowCoeff:      the blow on the front hero, × its hit;
 *    - splashCoeff:    the blow on everyone behind, × its hit;
 *    - backShotChance: the share of its basic attacks aimed at a hero behind the front one — sustained damage on
 *                      the back line;
 *    - woundPct:       the Rend (data/bossEffects debuff_rend) its area blow leaves on every hero it reaches: this %
 *                      of the hero's life a second per stack, stacking blow after blow; only a heal lifts it. */
export interface WorldBossPressure {
  hitMult: number;
  blowEveryMs: number;
  blowCoeff: number;
  splashCoeff: number;
  backShotChance: number;
  woundPct: number;
}

/** Rend (woundPct) is wired but OFF on every difficulty (round 3, 2026-11-16): at a strength that kills a party
 *  without heals inside Hell's short fights (1.3 % a second per stack) it killed the parties WITH heals too — her heals
 *  do not lift it often enough. Turning it on needs her cleansing cadence reworked first (PACING_REPORT 3b). */
/** Normal → Torment. Normal is the world boss as it was (any build passes); the rest are tuned against the build
 *  study (scripts/build-study.ts: a Priest who carries no heal must not see the end of a wall from Hell on). */
// Tuned 2026-11-16 (docs/redesign/PACING_REPORT.md, round 3 checkpoint 2) by SURVIVAL against a wall that cannot
// die (scripts/pressure-survival.ts): a party with heals at ~85 % of the zone keeps everyone standing through the
// minute; the same party with a Priest who carries no heal, at ~150 %, loses a hero before 34 s (the time a 150 %
// party needs on a wall tuned to die at 60 s to 85 %).
// ROUND 7 (2026-11-16): a world boss's basic attacks all go for the FRONT hero (backShotChance 0; it was 0.5 from
// Hell). Half its swings fell at random on the heroes behind, and the Ranger — a seventh of the Knight's life — died
// to the dice in 13 of 43 lost Inferno walls of the probe's own party (scripts/luck-diag.ts): the same party at the
// same wall lived or died by where the swings fell. The back line is pressed now by what the party SEES coming: the
// area blow's splash, the Crushing Blow's magic shock (CRUSH below), the mechanics.
export const WORLD_BOSS_PRESSURE: readonly WorldBossPressure[] = [
  { hitMult: 1, blowEveryMs: 10_000, blowCoeff: 1.2, splashCoeff: 0.6, backShotChance: 0, woundPct: 0 },
  // Hell: the blow every 4 s (decided 2026-11-16 for the case it was needed — it was: with Hell's walls at their
  // hours a geared party without heals still beat them before the attrition told).
  { hitMult: 1, blowEveryMs: 4_000, blowCoeff: 1.2, splashCoeff: 1.2, backShotChance: 0, woundPct: 0 },
  // From Inferno the blow lands on the front hero far harder (coordinator, 2026-11-16: a Knight who carries his
  // defences must win in margin too): Stone Skin, Debilitate and Hold the Line are what take it.
  { hitMult: 1, blowEveryMs: 6_000, blowCoeff: 2.0, splashCoeff: 1.2, backShotChance: 0, woundPct: 0 },
  { hitMult: 1.15, blowEveryMs: 6_000, blowCoeff: 2.7, splashCoeff: 1.2, backShotChance: 0, woundPct: 0 },
  { hitMult: 1.45, blowEveryMs: 6_000, blowCoeff: 3.1, splashCoeff: 1.2, backShotChance: 0, woundPct: 0 },
];

/** THE AREA BLOW ON THE BACK LINE, anchored (round 8, 2026-11-17; user: «sí» to anchoring the shockwave on the heroes
 *  behind like the blow on the tank and the Crushing Blow's shock). From Inferno, each hero BEHIND the front one takes,
 *  per blow, this share of the average back-line hero's life at that wall (data/stageScaling BACK_LIFE_TUNE) through
 *  ON-LEVEL defence (`expectedDefense`): a hero who wears more takes less, one who wears less more — data, not a
 *  reaction. It replaced the formula's splash (splashCoeff × the boss's hit), which came in at ~14 % of the Ranger's
 *  life a blow at Inferno 1–2 (the gear of Hell against Inferno's formula) and sank to ~3 % by Torment
 *  (scripts/splash-share.ts): the share is the formula's late-difficulty level, steady across each difficulty.
 *  Normal and Hell keep the formula (no anchor there: BACK_LIFE_TUNE starts at Inferno). Normal … Torment. */
export const BACK_SPLASH_SHARE: readonly [number, number, number, number, number] = [0, 0, 0.06, 0.045, 0.04];

/** The pressure of a world boss at difficulty index `d` (clamped to the table). */
export function worldBossPressure(d: number): WorldBossPressure {
  const i = Math.max(0, Math.min(WORLD_BOSS_PRESSURE.length - 1, Math.floor(d)));
  const p = WORLD_BOSS_PRESSURE[i] ?? WORLD_BOSS_PRESSURE[0];
  if (p === undefined) throw new Error('WORLD_BOSS_PRESSURE is empty');
  return p;
}

/** How many worlds of a difficulty its world-boss pressure takes to come in whole once it starts (round 5, 2026-11-16,
 *  user: «presión gradual»). Round 10 (2026-11-17, user: «presión desde el mundo 3»): a difficulty's NEW pressure
 *  (WORLD_BOSS_PRESSURE, the Crushing Blow, the boss's threat on the tank, the anchored back-line splash, the enrage
 *  ramp, its mechanic's and affixes' strength) holds at the previous difficulty's level through its first
 *  PRESSURE_HOLD_WORLDS worlds and comes in over the next PRESSURE_RAMP_WORLDS — world 3 a third, world 4 two thirds,
 *  world 5 on the whole of it — so the gear a party ends a difficulty with takes worlds 1–2 of the next. */
export const PRESSURE_RAMP_WORLDS = 3;
export const PRESSURE_HOLD_WORLDS = 2;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** How far into its difficulty's pressure the world boss of global stage `S` is (0 = the previous difficulty's,
 *  1 = its own). Normal has no previous: always 1. */
export function pressureWeight(S: number): number {
  if (difficultyIndexOf(S) === 0) return 1;
  const w = worldInDifficulty(S) - PRESSURE_HOLD_WORLDS;
  return w <= 0 ? 0 : Math.min(1, w / PRESSURE_RAMP_WORLDS);
}

/** The difficulty whose STEPPED pressure (the anchored back-line splash, the enrage ramp, the boss's mechanic and
 *  affixes) the world boss of global stage `S` brings: the previous one through a difficulty's first
 *  PRESSURE_HOLD_WORLDS worlds, its own from world 3 (round 10). Normal: its own. */
export function pressureDifficulty(S: number): number {
  const d = difficultyIndexOf(S);
  return d > 0 && worldInDifficulty(S) <= PRESSURE_HOLD_WORLDS ? d - 1 : d;
}

/** The pressure of the world boss of global stage `S`: its difficulty's, eased in over the first worlds. */
export function worldBossPressureAt(S: number): WorldBossPressure {
  const d = difficultyIndexOf(S);
  const own = worldBossPressure(d);
  const w = pressureWeight(S);
  if (w >= 1 || d === 0) return own;
  const prev = worldBossPressure(d - 1);
  return {
    hitMult: lerp(prev.hitMult, own.hitMult, w),
    blowEveryMs: Math.round(lerp(prev.blowEveryMs, own.blowEveryMs, w)),
    blowCoeff: lerp(prev.blowCoeff, own.blowCoeff, w),
    splashCoeff: lerp(prev.splashCoeff, own.splashCoeff, w),
    backShotChance: lerp(prev.backShotChance, own.backShotChance, w),
    woundPct: lerp(prev.woundPct, own.woundPct, w),
  };
}

// ── Pressure on the front ───────────────────────────────────────────────────────────────────────────────────
// Round 5 leaned a boss's hits on the front hero by difficulty (BOSS_FRONT_PRESSURE ×1 … ×1.7). Round 6 (2026-11-16,
// user: «solo la propuesta 1») REPLACED it with the boss-hit anchor (data/stageScaling ZONE_BOSS_HIT_TUNE,
// STAGE_BOSS_HIT_TUNE): what a boss deals the FRONT hero — its basic hits on him and its area blow's main hit — is
// written as what it takes off the average tank a second. Its hits on the heroes behind keep the formula (× hitMult
// above): anchoring those to the tank's life too would one-shot a Ranger with a seventh of the Knight's.

// ── Physical and magic damage ───────────────────────────────────────────────────────────────────────────────

/** The share of each boss's damage that is MAGIC, by the creature it fights as (data/worlds): 0.25 leans on steel,
 *  0.75 on spells (round 5, 2026-11-16, user: «cada jefe tendría que ser una mezcla, intentando que sean 60/40 o
 *  40/60, unos más heavy en daño mágico y otros en físico»; round 14, 2026-11-17: «los podemos volver 75/25 siempre» —
 *  at 60/40 a player who ignored magic resist lost nothing until Torment, PACING_REPORT «MR en una partida completa»).
 *  Fixed per boss, so a party can prepare for a wall, and shown in its tooltip. It replaces the 40 % coin each boss tossed when it appeared. Every hit is split by it and
 *  each part is mitigated by its own defence; an ability with its own `magic` flag (Chain Lightning) keeps it. */
export const BOSS_MAGIC_SHARE: Readonly<Record<string, number>> = {
  // stage bosses
  king: 0.25, warden: 0.25, ferryman: 0.75, colossus: 0.25, bellbearer: 0.75,
  admiral: 0.25, geode: 0.75, magmawyrm: 0.75, archon: 0.75, lictor: 0.25,
  // world bosses
  crowmother: 0.25, mistletoe: 0.75, drownedmoon: 0.75, scapegoat: 0.25, abbot: 0.75,
  ninthwave: 0.25, amanita: 0.75, quench: 0.25, verdict: 0.25, unmaker: 0.75,
};
/** A boss whose creature has no entry (an unknown world). */
export const DEFAULT_BOSS_MAGIC_SHARE = 0.25;

/** The magic share of the boss of `rank` at global stage `S` (its world's stage-boss or world-boss creature). */
export function bossMagicShare(S: number, rank: BossRank): number {
  const world = tryWorldDef(worldInDifficulty(S));
  const key = rank === 'world' ? world?.worldBoss?.key : world?.creatures.boss.key;
  return (key === undefined ? undefined : BOSS_MAGIC_SHARE[key]) ?? DEFAULT_BOSS_MAGIC_SHARE;
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
  // 18 / 17 / 17 / 17 / 15 s (were 18 / 15 / 15 / 15 / 12; 2026-11-22: its wall, world 2, asked ~10 stages more gear
  // than world 3 in Eternal and stood out in every probe run). Still tightening with the difficulty.
  roots: { abilityKey: 'boss_roots', everyMs: [18_000, 17_000, 17_000, 17_000, 15_000] as ByDifficulty, openerMs: 8000, castMs: 1500, holdMs: 5000 },
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
   *  does for ALLIES the boss takes for itself — heals at `boon` of their strength (they are shares of ITS life),
   *  buffs at `buff` of theirs. Of the buffs a boss has a use for attack speed and attack damage (it hits that much
   *  harder while it lasts); crit and lifesteal do nothing for it. Round 11 (user: «rehacer los espejos»): a shield,
   *  a defensive stat (damage reduction, armour, magic resist, block) or a weakening / attack cut on the heroes it does
   *  NOT take — the mirror throws it back as a SHARD at the front hero, at `harm` of its hit (sim/mirror turnsToShard).
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

// ── The Crushing Blow: the defence check (round 7) ─────────────────────────────────────────────────────────

/** THE CRUSHING BLOW (round 7, 2026-11-16; user: «que la defensa importe sin depender de la suerte»). From Inferno on,
 *  a world boss's HEAVY blow: every `everyMs` (the first at `openerMs`) it winds up for `castMs` — a longer cast bar
 *  than its shockwave, so the party sees it coming — and strikes the FRONT hero for `tankLife` × the average Knight's
 *  life at that wall, after his own armour and magic resist against the boss's physical/magic mix (data/stageScaling
 *  KNIGHT_EHP_TUNE); everyone BEHIND him takes its MAGIC shock: `backLife` × the average back-line hero's life
 *  (BACK_LIFE_TUNE) through ON-LEVEL magic resist, × the boss's side (`shockBySide`) — twice that with
 *  none. It cannot be blocked, and it is not dice: a Knight who carries a defence for it (Stone Skin, Bulwark,
 *  Debilitating Cleave on the boss, Hold the Line; a Holy Shield on him) takes it, one who carries none falls; a back
 *  line with no magic resist falls to a spell-heavy boss's shock, and stands a steel-heavy one's. The defences wait for its wind-up against a boss (their
 *  boss rule, data/abilities `firesBoss`). Eased in over a difficulty's first worlds with the rest of the pressure. */
export const CRUSH = {
  abilityKey: 'boss_crush',
  // Every 15 s from 8 s: four in a wall's minute (8, 23, 38, 53 s). 2026-11-18 (user: «los golpes deberían caer cada
  // 15 s, pero ser más débiles para ser aguantables sin defensivo en todas ellas, pero aun así hacer mella y requerir
  // de healing o un defensivo para la siguiente»): one blow is stood bare; two without a heal or a defence between
  // them are not. The defences (22–26 s) and the 2 s global cooldown give each hero one defence a blow: a Knight
  // with two takes turns with them, one with none lives on the Priest's heals.
  everyMs: 15_000,
  openerMs: 8_000,
  castMs: 2000,
  // Round 9 (2026-11-17): Eternal 1.5 → 1.8, Torment 1.7 → 2.0 — a Knight above the average (a seed whose Knight
  // outgears the table) took the blow at ~99 % of his life and stood without his defences; braced (Stone Skin ×0.5,
  // Debilitating Cleave ×0.65) he still takes ~0.6–0.65 of his effective life.
  // Round 11 (2026-11-17): Inferno 1.2 → 1.5, Eternal 1.8 → 2.0 — an offensive Knight still took Inferno 8 and
  // Eternal 8 at the probe's kill (a Knight above the average stood the blow); braced he takes ~0.5 / 0.65 of his life.
  // 2026-11-18: 1.5 / 2.0 / 2.0 → 0.5 / 0.6 / 0.65 — the share of his life one blow takes from a Knight with no
  // defence up (it killed him before; now it is the blow that comes four times a minute).
  tankLife: [0, 0, 0.5, 0.6, 0.65] as readonly [number, number, number, number, number],
  // Inferno brings the shock in gently (a back line that wears little magic resist stands it); from Eternal it asks for
  // it. (At 0.3–0.4 in Inferno the probe's Ranger, who wears little, fell to it in most of the walls.)
  // 2026-11-18: 0.2 / 0.45 / 0.5 → 0.12 / 0.27 / 0.3 — the blow falls 1.6 times as often (every 15 s, was 24): the
  // shock a minute is what it was.
  backLife: [0, 0, 0.12, 0.27, 0.3] as readonly [number, number, number, number, number],
  // × backLife by the boss's side (round 14, 2026-11-17): the shock is what it was at 60/40 — 1.2 for a spell-heavy
  // boss, 0.8 for a steel-heavy one — now that the mixes are 75/25. (Scaling it with the share, as before, halved the
  // steel-heavy shock: the back line stood Eternal 1 untouched and the wall's ask fell by a quarter.)
  shockBySide: { steel: 0.8, spell: 1.2 },
} as const;

/** The Crushing Blow's shock on the back line, × CRUSH.backLife, for a boss that hits with `magicShare` magic. */
export function crushShockScale(magicShare: number): number {
  return magicShare > 0.5 ? CRUSH.shockBySide.spell : CRUSH.shockBySide.steel;
}

/** The Crushing Blow's strength at global stage `S` — its difficulty's, eased in from the previous one's over the
 *  first worlds (pressureWeight). Zero on both: the boss does not wield it. */
export function crushAt(S: number): { tankLife: number; backLife: number } {
  const d = Math.max(0, Math.min(4, difficultyIndexOf(S)));
  const own = { tankLife: CRUSH.tankLife[d] ?? 0, backLife: CRUSH.backLife[d] ?? 0 };
  if (d === 0) return own;
  const w = pressureWeight(S);
  return { tankLife: lerp(CRUSH.tankLife[d - 1] ?? 0, own.tankLife, w), backLife: lerp(CRUSH.backLife[d - 1] ?? 0, own.backLife, w) };
}

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
