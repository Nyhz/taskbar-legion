// What the ENEMIES' attacks look like on the strip (no Pixi here — pure, unit-tested): what their shooters and
// casters fly at the party, and the AREA BLOWS that reach the whole of it (docs/DIFFICULTY.md §5b: the brute's
// Brutal Smash, a stage boss's Ground Slam, a world boss's Shockwave). The art is the pipeline's
// (tools/assets/pipeline/fx/enemy.py → render/fxData), drawn going right and mirrored for a foe.

/** What a foe's ranged attack flies, by its style. `arc`: the same shot lofted — one frame per pitch, from
 *  climbing to falling — used when it goes over the front line; `land`: a one-shot where it lands. */
export interface FoeShot {
  fx: string;
  arc?: string;
  land: string;
}

export const FOE_SHOT: Readonly<Record<'ranged' | 'caster', FoeShot>> = {
  ranged: { fx: 'foe_arrow', arc: 'foe_arrow_arc', land: 'foe_hit' },
  caster: { fx: 'foe_bolt', land: 'foe_hit' },
};

/** How high a shot is lofted over the front line (art pixels): clear of a hero's head and his life bar. */
export const FOE_ARC_HEIGHT = 34;

/** A shot aimed at a hero standing behind the front one goes OVER the front one, in an arc; a shot at the front
 *  hero flies level. `frontX` is where the party's front hero stands; both are strip x. */
export function shotGoesOver(targetX: number, frontX: number): boolean {
  return targetX < frontX - 6;
}

/** How a blow travels back through the party. */
export type BlowWave =
  | { kind: 'bursts'; fx: string; every: number } // a one-shot every `every` pixels, one after another
  | { kind: 'front'; fx: string; trail: string; trailEvery: number }; // one thing that runs along the ground, leaving a trail

export interface AreaBlow {
  /** The ground under the party while the blow is wound up (`warn`), and over the last part of the cast
   *  (`warnHot`). A blow with no cast time (the brute's) has no warning. */
  warn?: { fx: string; hot: string; step: number };
  /** A one-shot on the ground where the blow starts. */
  origin?: string;
  /** A blow aimed at the FRONT hero (the heavy blow): while it is wound up, the boss gathering it at its front
   *  (`charge`) and a mark closing on the ground under the hero it will land on (`mark`) — both stepped frame by
   *  frame with the cast —, and where it lands on him, its `impact`. Each in two looks — hot iron for a boss whose
   *  blows are mostly steel, `magic` for a spell-heavy one (bossLook): what to brace with. */
  charge?: BlowLook;
  mark?: BlowLook;
  impact?: BlowLook;
  wave: BlowWave;
  /** How fast the wave runs along the ground, in pixels per ms. */
  speed: number;
  /** The one-shot under each hero it reaches. */
  jolt: string;
}

/** One of a blow's signs in its two looks. */
export interface BlowLook {
  fx: string;
  magic: string;
}

/** The look of a sign for a boss that hits with `magicShare` of its damage as magic (data/bossKit: 0.4 or 0.6):
 *  the magic one when magic is the larger part. */
export function bossLook(look: BlowLook, magicShare: number | undefined): string {
  return (magicShare ?? 0) > 0.5 ? look.magic : look.fx;
}

/** Which frame of a `frames`-long mark shows at `progress` (0…1) of the cast: the first at the start, the last
 *  from the moment the cast is all but done. */
export function markFrame(progress: number, frames: number): number {
  const n = Math.max(1, Math.floor(frames));
  return Math.max(0, Math.min(n - 1, Math.floor(Math.max(0, progress) * n)));
}

const WARN = { fx: 'warn_crack', hot: 'warn_crack_hot', step: 22 };

export const AREA_BLOWS: Readonly<Record<string, AreaBlow>> = {
  // Brutal Smash: instant — the ground jumps in a low run of dust and stones.
  enemy_smash: { wave: { kind: 'bursts', fx: 'smash_burst', every: 17 }, speed: 0.34, jolt: 'jolt' },
  // Temblor (a brute's blow from Eternal on): the same run of dust, and the ground SPLITS under each hero it
  // reaches — that is what says they are shaken (nothing is hung on the heroes).
  enemy_smash_tremor: { wave: { kind: 'bursts', fx: 'smash_burst', every: 17 }, speed: 0.34, jolt: 'tremor_crack' },
  // Ground Slam: rock driven up out of the path, tooth after tooth, through the whole party.
  boss_slam: { warn: WARN, wave: { kind: 'bursts', fx: 'slam_spike', every: 19 }, speed: 0.3, jolt: 'jolt' },
  // Shockwave: a ring where it is let go, and a wall of force as tall as a hero running back through everyone.
  boss_shockwave: { warn: WARN, origin: 'shock_ring', wave: { kind: 'front', fx: 'shock_front', trail: 'shock_trail', trailEvery: 20 }, speed: 0.26, jolt: 'jolt' },
  // The heavy blow (round 7, data/bossKit CRUSH; its own look 2026-11-16 — tools/assets/pipeline/fx/crush.py, the
  // user's pick «el jefe carga el golpe»): while it is wound up the boss gathers it at its front — motes pulled into
  // a core that swells and burns, hot iron for a boss whose blows are mostly steel, violet for a spell-heavy one —,
  // four corners close in on the ground under the front hero, and a hairline split glints along the path behind him.
  // It lands on him as one dry flash, and a crack runs back under the others with violet light jumping out of it
  // (the magic shock), crackling under each.
  boss_crush: {
    warn: { fx: 'warn_seam', hot: 'warn_seam_hot', step: 22 },
    charge: { fx: 'crush_charge', magic: 'crush_charge_magic' },
    mark: { fx: 'crush_mark', magic: 'crush_mark_magic' },
    impact: { fx: 'crush_impact', magic: 'crush_impact_magic' },
    wave: { kind: 'front', fx: 'crush_crack', trail: 'crush_seam', trailEvery: 12 },
    speed: 0.42,
    jolt: 'crush_zap',
  },
  // Resaca (the Ninth Wave's own mechanic, data/bossKit): the path goes under while it is wound up, then a wave as
  // tall as a hero runs back through the party and drags it along.
  boss_undertow: { warn: { fx: 'warn_tide', hot: 'warn_tide_hot', step: 22 }, origin: 'undertow_surge', wave: { kind: 'front', fx: 'undertow_front', trail: 'undertow_trail', trailEvery: 18 }, speed: 0.3, jolt: 'undertow_splash' },
  // The breaking of the mirrors (the Unmaker, with its six panes lit — data/bossKit): splinters lie glinting
  // along the path while it is wound up, stand on end at the last — then the panes burst on its figure
  // (render/PaneGlow) and blades of mirror come down through the whole party, one after another.
  boss_shatter: { warn: { fx: 'warn_glass', hot: 'warn_glass_hot', step: 22 }, wave: { kind: 'bursts', fx: 'shatter_rain', every: 21 }, speed: 0.36, jolt: 'shard_hit' },
};

export function areaBlow(abilityKey: string | undefined): AreaBlow | undefined {
  return abilityKey === undefined ? undefined : AREA_BLOWS[abilityKey];
}

/** The warning turns hot over this last share of the cast. */
export const WARN_HOT_FROM = 0.66;

/** How far past the last hero the warning and the wave run (art pixels). */
export const BLOW_PAST_PARTY = 16;

/** How many warning tiles lie on the ground at `progress` (0…1) of the cast, for a stretch `length` pixels long
 *  laid in tiles `step` apart: it grows from the foe back through the party, and covers all of it by 60 % of the
 *  cast so the whole stretch is seen burning before the blow. At least one once the cast has begun. */
export function warnTiles(length: number, step: number, progress: number): number {
  const total = Math.max(1, Math.ceil(length / Math.max(1, step)));
  const k = Math.max(0, Math.min(1, progress / 0.6));
  return Math.max(1, Math.min(total, Math.ceil(total * k)));
}

/** How long after the blow lands in front its wave reaches a point `dist` pixels further back (ms). */
export function waveReachMs(blow: AreaBlow, dist: number): number {
  return Math.max(0, dist) / blow.speed;
}

/** Where the bursts of a `bursts` wave go off along a stretch `length` pixels long: distances from its start,
 *  the first right at it. */
export function burstOffsets(length: number, every: number): number[] {
  const n = Math.max(1, Math.floor(Math.max(0, length) / Math.max(1, every)) + 1);
  return Array.from({ length: n }, (_, i) => i * every);
}
