import { Assets, Rectangle, Texture } from 'pixi.js';
// Knight (tank) — full action set + per-attack slash effect overlays.
import knightIdle from '@/assets/characters/knight/actions/knight-idle.png';
import knightWalk from '@/assets/characters/knight/actions/knight-walk.png';
import knightAttack1 from '@/assets/characters/knight/actions/knight-attack01.png';
import knightAttack2 from '@/assets/characters/knight/actions/knight-attack02.png';
import knightAttack3 from '@/assets/characters/knight/actions/knight-attack03.png';
import knightBlock from '@/assets/characters/knight/actions/knight-block.png';
import knightHurt from '@/assets/characters/knight/actions/knight-hurt.png';
import knightDeath from '@/assets/characters/knight/actions/knight-death.png';
import knightAtk1Fx from '@/assets/characters/knight/attack-effects/knight-attack01-effect.png';
import knightAtk2Fx from '@/assets/characters/knight/attack-effects/knight-attack02-effect.png';
import knightAtk3Fx from '@/assets/characters/knight/attack-effects/knight-attack03-effect.png';
// Ranger (dps) — bow draws + the shared arrow projectile.
import rangerIdle from '@/assets/characters/ranger/actions/ranger-idle.png';
import rangerWalk from '@/assets/characters/ranger/actions/ranger-walk.png';
import rangerAttack1 from '@/assets/characters/ranger/actions/ranger-attack01.png';
import rangerAttack2 from '@/assets/characters/ranger/actions/ranger-attack02.png';
import rangerHurt from '@/assets/characters/ranger/actions/ranger-hurt.png';
import rangerDeath from '@/assets/characters/ranger/actions/ranger-death.png';
import arrowUrl from '@/assets/characters/ranger/projectiles/arrow.png';
// Priest (healer) — caster attack + a dedicated heal cast + its flying bolt / heal sparkle.
import priestIdle from '@/assets/characters/priest/actions/priest-idle.png';
import priestWalk from '@/assets/characters/priest/actions/priest-walk.png';
import priestAttack from '@/assets/characters/priest/actions/priest-attack.png';
import priestHeal from '@/assets/characters/priest/actions/priest-heal.png';
import priestHurt from '@/assets/characters/priest/actions/priest-hurt.png';
import priestDeath from '@/assets/characters/priest/actions/priest-death.png';
import priestAtkFx from '@/assets/characters/priest/effects/priest-attack-effect.png';
import priestHealFx from '@/assets/characters/priest/effects/priest-heal-effect.png';

// Sprite-sheet character bodies (a deliberate override of ART.md's procedural-only rule,
// at the user's request). Each sheet is a horizontal strip of 100×100 frames; we load it
// once, force nearest-neighbour scaling for crisp pixels, and slice it into per-frame
// Textures sharing the single source. The whole action package is wired: idle, walk, up
// to three attacks (alternated on successive strikes, with frame-aligned slash effects),
// block, hurt, death, and a healer-only heal cast. Per class we carry the geometry needed
// to land every class at a matching on-screen size (~42px tall, feet at local y22).
// Memoized; safe to call loadCharacterTextures() repeatedly.

export interface CharFps {
  idle: number;
  walk: number;
  attack: number;
  block: number;
  hurt: number;
  death: number;
  heal: number;
}

export interface CharSpriteConfig {
  frameSize: number; // px per (square) frame in the sheet
  bodyCx: number; // body centre x within a frame (px) — the horizontal anchor
  feetY: number; // feet baseline y within a frame (px) — the vertical anchor
  scale: number; // render scale so the body matches the others on screen
  fps: CharFps;
  // Index into `attacks` reserved for MELEE ABILITY casts (the knight's heavy 3rd swing);
  // basic auto-attacks alternate through the *other* sheets. Undefined ⇒ all sheets are
  // basic autos (ranger alternates its two; priest has one).
  abilityAttackIndex?: number;
}

export interface CharFrames {
  idle: Texture[];
  walk: Texture[];
  attacks: Texture[][]; // one or more attack sheets (alternated on successive strikes)
  attackFx: (Texture[] | null)[]; // per-attack slash-effect overlay (frame-aligned), or null
  block: Texture[] | null;
  hurt: Texture[] | null;
  death: Texture[] | null;
  heal: Texture[] | null; // healer-only heal-cast pose
  projectile: Texture[] | null; // animated bolt the caster throws (priest), else null
  config: CharSpriteConfig;
}

interface SheetSpec {
  idle: string;
  walk: string;
  attacks: string[];
  attackFx?: (string | null)[]; // parallel to attacks
  block?: string;
  hurt?: string;
  death?: string;
  heal?: string;
  projectile?: string;
  config: CharSpriteConfig;
}

// All three classes share the 100px frame geometry (figures ~22px tall, feet at y60,
// body centre ~x52); only fps cadence varies a touch per role. scale lands each at ~55px
// on a more zoomed-in strip (bigger heroes — see GameStrip STRIP dims).
const COMMON = { frameSize: 100, feetY: 60 } as const;

const SHEETS: Record<string, SheetSpec> = {
  knight: {
    idle: knightIdle,
    walk: knightWalk,
    attacks: [knightAttack1, knightAttack2, knightAttack3],
    attackFx: [knightAtk1Fx, knightAtk2Fx, knightAtk3Fx],
    block: knightBlock,
    hurt: knightHurt,
    death: knightDeath,
    // attacks[0]/[1] are the alternating auto-attack swings; attacks[2] (the big overhead)
    // is reserved for melee ability casts.
    config: { ...COMMON, bodyCx: 53, scale: 2.9, abilityAttackIndex: 2, fps: { idle: 7, walk: 12, attack: 16, block: 13, hurt: 12, death: 9, heal: 12 } },
  },
  ranger: {
    idle: rangerIdle,
    walk: rangerWalk,
    attacks: [rangerAttack1, rangerAttack2],
    hurt: rangerHurt,
    death: rangerDeath,
    config: { ...COMMON, bodyCx: 51, scale: 3.05, fps: { idle: 7, walk: 12, attack: 19, block: 14, hurt: 12, death: 9, heal: 12 } },
  },
  priest: {
    idle: priestIdle,
    walk: priestWalk,
    attacks: [priestAttack],
    hurt: priestHurt,
    death: priestDeath,
    heal: priestHeal,
    projectile: priestAtkFx,
    config: { ...COMMON, bodyCx: 52, scale: 2.9, fps: { idle: 6, walk: 12, attack: 14, block: 14, hurt: 12, death: 9, heal: 13 } },
  },
};

const cache = new Map<string, CharFrames>();
let arrowTex: Texture | null = null;
let healFxTex: Texture[] | null = null;
let loading: Promise<void> | null = null;

// Slice a horizontal sheet into one Texture per frame. Frame count is derived from the
// texture width so the data drives it.
function slice(base: Texture, frameSize: number): Texture[] {
  base.source.scaleMode = 'nearest';
  const count = Math.floor(base.width / frameSize);
  const out: Texture[] = [];
  for (let i = 0; i < count; i++) {
    out.push(new Texture({ source: base.source, frame: new Rectangle(i * frameSize, 0, frameSize, frameSize) }));
  }
  return out;
}

/** Load + slice a sheet URL (or pass through null for an absent optional action). */
async function loadSheet(url: string | undefined, frameSize: number): Promise<Texture[] | null> {
  if (url === undefined) return null;
  return slice(await Assets.load<Texture>(url), frameSize);
}

/** Load + slice every character sheet (+ the shared arrow & heal-sparkle). Idempotent. */
export async function loadCharacterTextures(): Promise<void> {
  if (loading !== null) return loading;
  loading = (async () => {
    const arrow = await Assets.load<Texture>(arrowUrl);
    arrow.source.scaleMode = 'nearest';
    arrowTex = arrow;
    healFxTex = slice(await Assets.load<Texture>(priestHealFx), COMMON.frameSize);
    for (const [key, spec] of Object.entries(SHEETS)) {
      const fs = spec.config.frameSize;
      const [idle, walk, attacks, attackFx, block, hurt, death, heal, projectile] = await Promise.all([
        loadSheet(spec.idle, fs),
        loadSheet(spec.walk, fs),
        Promise.all(spec.attacks.map((u) => loadSheet(u, fs))),
        Promise.all((spec.attackFx ?? []).map((u) => loadSheet(u ?? undefined, fs))),
        loadSheet(spec.block, fs),
        loadSheet(spec.hurt, fs),
        loadSheet(spec.death, fs),
        loadSheet(spec.heal, fs),
        loadSheet(spec.projectile, fs),
      ]);
      cache.set(key, {
        idle: idle ?? [],
        walk: walk ?? [],
        attacks: attacks.map((a) => a ?? []),
        attackFx,
        block,
        hurt,
        death,
        heal,
        projectile,
        config: spec.config,
      });
    }
  })();
  return loading;
}

/** The loaded frames for a class, or null if it has no sheet / isn't ready yet. */
export function getCharacterFrames(classKey: string): CharFrames | null {
  return cache.get(classKey) ?? null;
}

/** The shared arrow projectile texture, or null if not loaded yet. */
export function getArrowTexture(): Texture | null {
  return arrowTex;
}

/** The shared heal-sparkle effect frames (shown on any ally a Priest heals). */
export function getHealEffectFrames(): Texture[] | null {
  return healFxTex;
}
