import { MECHANIC } from '@/data/bossKit';
import { fxMeta } from './fxData';
import type { FigureMeta } from './figureData';

// What the BOSS KIT looks like on the strip (no Pixi here — pure, unit-tested; the kit is data/bossKit.ts and
// sim/bossMechanics.ts): the summons' figures, the cue a boss shows while it winds a mechanic up, what a
// mechanic's cast and hits play, and the form each boss gives its Deadeye shot. The lasting looks of the kit's
// effects (the shell, the venom, the roots) are in render/abilityFx EFFECT_LOOKS like every other effect's. The
// art is the pipeline's (tools/assets/pipeline/fx/boss.py → render/fxData).
//
// A NEW MECHANIC plugs in here with: a cue for its cast (CAST_CUES), what its cast or its hits play
// (KIT_CASTS / KIT_HITS), and — if it summons — a figure in SUMMON_LOOKS (or, for a hero's double, DOUBLE_LOOKS).

// ── Summons ─────────────────────────────────────────────────────────────────────────────────────────────────

/** A summon is a small figure made of three effects that share one cell and one anchor: a loop while it flies
 *  (also while it hovers), a one-shot for its attack and one for its end. */
export interface SummonLook {
  fly: string;
  attack: string;
  death: string;
  /** The box of the thing itself, from its anchor: [left, top, right, bottom], facing right. */
  box: [number, number, number, number];
  /** How high over the ground it hovers (art pixels, to its anchor), and how far it bobs. */
  hover: number;
  bob: number;
  /** Each next one of a flock hovers this much higher or lower, so they do not sit in a row. */
  stagger: number;
  /** Its attack is a dive at the hero it hits, out and back in this long (ms); the hit shows at its middle. */
  diveMs: number;
  /** When it leaves on its own it flies up and away for this long (ms) instead of playing its end. */
  leaveMs: number;
}

export const SUMMON_LOOKS: Readonly<Record<string, SummonLook>> = {
  crow: { fly: 'crow_fly', attack: 'crow_peck', death: 'crow_gone', box: [-8, -15, 8, -4], hover: 40, bob: 2, stagger: 7, diveMs: 300, leaveMs: 650 },
};

/** A summon that is the DOUBLE of a hero (the Unmaker's dark reflection): no figure of its own — the hero's,
 *  in a skin (tools/assets export-fx SKINS), facing the party. It comes out of the mirror the boss raised and
 *  it never dies or leaves like a creature: it breaks like glass. */
export interface DoubleLook {
  /** The hero skin it wears, and the rim of light round it (render/fxTextures.heroSkin). */
  skin: string;
  rim: string;
  /** The tint of its body when that skin is not there (then it is the hero's own figure, darkened). */
  tint: number;
  /** The one-shot where it comes out — the mirror, `mirrorUp` over the ground — and how it gets down from
   *  there: it drops `dropPx` in `dropMs` while it shows. */
  enter: string;
  mirrorUp: number;
  dropPx: number;
  dropMs: number;
  /** The one-shot it ends in (standing on its feet's point), killed or out of time alike. */
  gone: string;
  /** What its blow looks like: the classes that strike from afar send `shot` from where they stand; the others
   *  (the Knight's double) STEP to the hero they strike — there and back in `stepMs`, stopping `stepGap` px short
   *  of him, their swing landing as they arrive; every blow lands as `land`. */
  shot: string;
  shooters: readonly string[];
  land: string;
  stepMs: number;
  stepGap: number;
}
export const DOUBLE_LOOKS: Readonly<Record<string, DoubleLook>> = {
  reflection: { skin: 'shade', rim: 'glass', tint: 0x7a5cc8, enter: 'reflection_out', mirrorUp: 94, dropPx: 64, dropMs: 360, gone: 'reflection_break', shot: 'shot_shard', shooters: ['ranger', 'priest'], land: 'shard_hit', stepMs: 360, stepGap: 20 },
};

// ── The six mirrors (the Unmaker) ───────────────────────────────────────────────────────────────────────────

/** The panes of the Unmaker's own figure light one by one — one per stack of the pane effect on it — and all go
 *  out, bursting, when it breaks them. The lit panes are art of their own, baked frame by frame over the
 *  figure's (render/fxData panePlace; tools/assets/pipeline/fx/mirrors.py). */
export const PANES = {
  effectKey: MECHANIC.mirror.paneEffectKey,
  /** The order they light in (indices of the figure's panes: 0–2 before it from the top, 3–5 behind it): from
   *  the top down, one side then the other. */
  order: [0, 3, 1, 4, 2, 5] as readonly number[],
  /** A pane comes up to full light in this long (ms), under a flash; then its light breathes. */
  lightMs: 260,
  breathe: [0.84, 1] as readonly [number, number],
  breatheMs: 1700,
  flash: 'pane_flash',
  /** While this ability is wound up they flicker (every `flickerMs`, between `flicker` and full) — then burst. */
  breaking: MECHANIC.mirror.shatter.abilityKey,
  flicker: 0.45,
  flickerMs: 90,
  break: 'pane_break',
} as const;

/** How many panes are lit on a fighter wearing these effects. */
export function litPaneCount(effects: readonly { defKey: string; stacks: number; remainingMs: number }[]): number {
  const worn = effects.find((e) => e.defKey === PANES.effectKey && e.remainingMs > 0);
  return Math.max(0, Math.min(PANES.order.length, worn?.stacks ?? 0));
}

/** How lit a pane is `sinceMs` after it lit, `clockMs` into the fight's drawing (0–1). */
export function paneLight(sinceMs: number, clockMs: number, breaking: boolean): number {
  if (breaking) return Math.floor(clockMs / PANES.flickerMs) % 2 === 0 ? 1 : PANES.flicker;
  const up = Math.min(1, sinceMs / PANES.lightMs);
  const [low, high] = PANES.breathe;
  const breath = low + (high - low) * (0.5 + 0.5 * Math.sin((clockMs / PANES.breatheMs) * Math.PI * 2));
  return up * breath;
}

/** The figure meta of a summon, built from its effects (they share cell and anchor); undefined if the art is
 *  missing. `idle` and `run` are the same loop: it never lands. */
export function summonFigureMeta(key: string): FigureMeta | undefined {
  const look = SUMMON_LOOKS[key];
  const fly = look === undefined ? undefined : fxMeta(look.fly);
  const attack = look === undefined ? undefined : fxMeta(look.attack);
  const death = look === undefined ? undefined : fxMeta(look.death);
  if (look === undefined || fly === undefined || attack === undefined || death === undefined) return undefined;
  const loop = { row: 0, n: fly.n, ms: fly.ms, loop: true };
  return {
    w: fly.w, h: fly.h, cols: Math.max(fly.n, attack.n, death.n), root: fly.ax, ground: fly.ay, box: look.box,
    anims: { idle: loop, run: loop, attack: { row: 1, n: attack.n, ms: attack.ms, loop: false }, death: { row: 2, n: death.n, ms: death.ms, loop: false } },
  };
}

/** How high summon number `slot` hovers `ms` into the fight (art pixels over the ground). */
export function summonLift(look: SummonLook, slot: number, ms: number): number {
  const place = look.hover + ((slot % 3) - 1) * look.stagger;
  return Math.round(place + Math.sin(ms / 260 + slot * 1.7) * look.bob);
}

// ── A mechanic being wound up ───────────────────────────────────────────────────────────────────────────────

/** The cue shown for as long as a boss winds an ability up, besides its cast bar. */
export interface CastCue {
  fx: string;
  /** `caster`: on the boss, standing on the ground at its feet, over it; `victim`: on the ground under the hero
   *  it will fall on (the one who has hurt the boss most); `party`: over the head of every hero. */
  on: 'caster' | 'victim' | 'party';
  /** For `party`: how high over the ground (art pixels). */
  up?: number;
  /** On the ground UNDER the fighters instead of over them (a seam opening in the path). */
  under?: boolean;
}

export const CAST_CUES: Readonly<Record<string, CastCue>> = {
  boss_flock: { fx: 'flock_gather', on: 'caster' },
  boss_roots: { fx: 'warn_roots', on: 'victim' },
  boss_chain_bolt: { fx: 'warn_static', on: 'party', up: 52 },
  boss_guilt: { fx: 'warn_guilt', on: 'party', up: 50 },
  boss_gild: { fx: 'warn_gild', on: 'caster' },
  // (Resaca is an area blow: its warning is the path going under — render/enemyFx AREA_BLOWS.)
  boss_spores: { fx: 'warn_spores', on: 'caster' },
  boss_red_blade: { fx: 'warn_blade', on: 'party', under: true },
  boss_scales: { fx: 'warn_scales', on: 'party', up: 66 }, // clear of a hero's bar and chips
  boss_mirror: { fx: 'warn_mirror', on: 'caster' },
};

export function castCue(abilityKey: string | undefined): CastCue | undefined {
  return abilityKey === undefined ? undefined : CAST_CUES[abilityKey];
}

/** Who a `victim` cue lies under: the living hero who has dealt the boss the most damage (the first of them on
 *  a tie; the first living one when nobody has hurt it) — the simulation's own rule (sim/abilities
 *  `topDamageEnemy`). */
export function cueVictim<T extends { id: string; alive: boolean; dealtToBoss?: number }>(heroes: readonly T[]): T | undefined {
  let best: T | undefined;
  for (const h of heroes) {
    if (!h.alive) continue;
    if (best === undefined || (h.dealtToBoss ?? 0) > (best.dealtToBoss ?? 0)) best = h;
  }
  return best;
}

// ── A kit ability going off ─────────────────────────────────────────────────────────────────────────────────

/** A one-shot on the boss when the cast resolves: centred this share of its height up its body. `undefined`
 *  fx: the ability shows through its hits or its effect alone — still the kit's, so no generic cast ring.
 *  `party`: a one-shot on the ground under every hero standing (the blade driving up through the path). */
export const KIT_CASTS: Readonly<Record<string, { fx?: string; up?: number; party?: string }>> = {
  boss_flock: { fx: 'flock_burst', up: 0.55 },
  boss_roots: {},
  boss_chain_bolt: {},
  boss_deadeye: {},
  boss_guilt: {}, // the brand coming down is the opening of the mark's own look
  boss_gild: { fx: 'gild_toll', up: 0.4 },
  boss_spores: {}, // each layer settling on a hero is the opening of the spores' own look
  boss_red_blade: { party: 'blade_ignite' },
  boss_scales: {},
  boss_mirror: { fx: 'mirror_flash', up: 0.45 },
};

/** What a kit ability's HIT on a hero plays instead of the boss's swing. */
export type KitHit =
  | { kind: 'bolt'; strike: string; jump: string; land: string; strikeMs: number } // from the sky on the first hero, then leaping to the others
  | { kind: 'deadeye'; mark: string; land: string } // the boss's own shot (DEADEYE_SHOT) at the hero it picked
  | { kind: 'shot'; shot: string; land: string } // something the boss sends straight at each hero it hits
  | { kind: 'burst'; fx: string; waitMs: number }; // a one-shot on the hero's body; its number shows `waitMs` in

export const KIT_HITS: Readonly<Record<string, KitHit>> = {
  boss_chain_bolt: { kind: 'bolt', strike: 'bolt_strike', jump: 'bolt_spark', land: 'bolt_zap', strikeMs: 110 },
  boss_deadeye: { kind: 'deadeye', mark: 'deadeye_mark', land: 'foe_hit' },
  boss_scales: { kind: 'burst', fx: 'scales_fall', waitMs: 150 }, // the pan comes down on him
  boss_mirror: { kind: 'shot', shot: 'shot_shard', land: 'shard_hit' }, // what Espejos reflects comes back as shards
};

/** Deadeye is one rule; each boss delivers it in its own form: what the figure fights as sends at the hero
 *  (user: "cada world boss necesitará un efecto, porque no todos van a disparar lo mismo"). Every boss of
 *  data/worlds has one; a figure not listed (one drawn later) sends DEADEYE_DEFAULT. */
export const DEADEYE_SHOT: Readonly<Record<string, string>> = {
  crowmother: 'shot_crow', // one of her crows, stooping
  mistletoe: 'shot_thorn', // a thorn off the bough
  drownedmoon: 'shot_moon', // a sickle of moonlight
  king: 'shot_sickle', // the Harvest King's sickle
  warden: 'shot_thorn', // the Antlered Warden's forest does it for him
  ferryman: 'shot_wisp', // a drowned light off his lantern
  // worlds 4–10 — their world bosses…
  scapegoat: 'shot_horn', // one of its horns, torn off and thrown
  abbot: 'shot_bead', // a bead off his rosary, the rest still strung behind it
  ninthwave: 'shot_spout', // a lance of sea water
  amanita: 'shot_sporecap', // one of her caps, skimmed like a discus
  quench: 'shot_hotblade', // a sword out of its back, still white from the forge
  verdict: 'shot_gavel', // its gavel
  unmaker: 'shot_void', // a sliver of nothing
  // …and their stage bosses
  colossus: 'shot_rock', // a block broken off itself
  bellbearer: 'shot_bell', // a bell off his frame
  admiral: 'shot_ball', // a round shot from a gun long under water
  geode: 'shot_crystal', // a crystal out of its heart
  magmawyrm: 'shot_magma', // a gob of molten rock
  archon: 'shot_lance', // a javelin of light
  lictor: 'shot_hatchet', // the axe out of his bundle of rods
};
export const DEADEYE_DEFAULT = 'shot_deadeye';

export function deadeyeShot(figureKey: string): string {
  return DEADEYE_SHOT[figureKey] ?? DEADEYE_DEFAULT;
}

/** A mechanic's damage that comes as periodic numbers on a hero (Culpa's toll): their colour, and a one-shot on
 *  the hero's body with each. Keyed by the ability key the simulation tags them with. */
export const KIT_TICKS: Readonly<Record<string, { color: string; fx?: string }>> = {
  boss_guilt: { color: '#ff5a4a', fx: 'guilt_pang' },
  boss_red_blade: { color: '#ff9a3c' }, // the burning ground
};

/** A hero thrown back (Resaca drags the party): when its place jumps back by more than `fromPx` at once the strip
 *  moves it there `speedMult` times as fast as a hero walks — it is swept, it does not stroll backwards — and not
 *  before the wave of `blow` (render/enemyFx AREA_BLOWS) has reached it (render/shoveDelay). */
export const SHOVE = { fromPx: 14, speedMult: 5, blow: 'boss_undertow' } as const;

/** Something a boss leaves on the ground under every hero for as long as it lasts (Hoja al rojo: the simulation's
 *  `groundFire` on the boss): a looping effect under each hero standing, under the fighters. */
export const GROUND_FIRE_FX = 'ground_fire';

/** Espejos (the simulation's `mirror` cue names the hero ability it reflects): that ability's sign goes up over
 *  the boss; when the ability gives its allies something the boss keeps it — `boon` plays on it. */
export const MIRROR_CUE = { cue: 'mirror', boon: 'mirror_boon' } as const;

/** A boss that feeds on a hit (Vampiric): blood drawn up into it. */
export const LEECH_FX = 'leech_drain';
/** …at most this often (ms): a fast boss does not strobe. */
export const LEECH_GAP_MS = 500;
