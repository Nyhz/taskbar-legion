import { Assets, Rectangle, Texture } from 'pixi.js';
import warriorWalk from '@/assets/characters/warrior/warrior-walk.png';
import warriorAttack1 from '@/assets/characters/warrior/warrior-attack1.png';
import warriorAttack2 from '@/assets/characters/warrior/warrior-attack2.png';
import warriorBlock from '@/assets/characters/warrior/warrior-block.png';
import rangerWalk from '@/assets/characters/ranger/ranger-walk.png';
import rangerAttack from '@/assets/characters/ranger/ranger-attack.png';
import arrowUrl from '@/assets/characters/ranger/arrow.png';

// Sprite-sheet character bodies (a deliberate override of ART.md's procedural-only rule,
// at the user's request). Each sheet is a horizontal strip of square frames; we load it
// once, force nearest-neighbour scaling for crisp pixels, and slice it into per-frame
// Textures sharing the single source. Per class we also carry the geometry needed to draw
// every class at a matching on-screen size (warrior frames are 96px @2×, ranger 48px
// @1.35× — both land at ~42px tall). Memoized.

export interface CharSpriteConfig {
  frameSize: number; // px per (square) frame in the sheet
  bodyCx: number; // body centre x within a frame (px) — the horizontal anchor
  feetY: number; // feet baseline y within a frame (px) — the vertical anchor
  scale: number; // render scale so the body matches the others on screen
  walkFps: number;
  attackFps: number;
  blockFps?: number;
  attackReleaseFrame?: number; // ranged: the frame at which the projectile leaves the hand
}

export interface CharFrames {
  walk: Texture[];
  attacks: Texture[][]; // one or more attack sheets (alternated on successive strikes)
  block?: Texture[];
  config: CharSpriteConfig;
}

interface SheetSpec {
  walk: string;
  attacks: string[];
  block?: string;
  config: CharSpriteConfig;
}

const SHEETS: Record<string, SheetSpec> = {
  warrior: {
    walk: warriorWalk,
    attacks: [warriorAttack1, warriorAttack2],
    block: warriorBlock,
    config: { frameSize: 96, bodyCx: 44, feetY: 59, scale: 2, walkFps: 12, attackFps: 16, blockFps: 14 },
  },
  ranger: {
    walk: rangerWalk,
    attacks: [rangerAttack],
    config: { frameSize: 48, bodyCx: 24, feetY: 47, scale: 1.35, walkFps: 12, attackFps: 20, attackReleaseFrame: 5 },
  },
};

const cache = new Map<string, CharFrames>();
let arrowTex: Texture | null = null;
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

/** Load + slice every character sheet (and the shared arrow). Safe to call repeatedly. */
export async function loadCharacterTextures(): Promise<void> {
  if (loading !== null) return loading;
  loading = (async () => {
    const arrow = await Assets.load<Texture>(arrowUrl);
    arrow.source.scaleMode = 'nearest';
    arrowTex = arrow;
    for (const [key, spec] of Object.entries(SHEETS)) {
      const fs = spec.config.frameSize;
      const [walkTex, attackTexs, blockTex] = await Promise.all([
        Assets.load<Texture>(spec.walk),
        Promise.all(spec.attacks.map((u) => Assets.load<Texture>(u))),
        spec.block !== undefined ? Assets.load<Texture>(spec.block) : Promise.resolve(null),
      ]);
      cache.set(key, {
        walk: slice(walkTex, fs),
        attacks: attackTexs.map((t) => slice(t, fs)),
        block: blockTex !== null ? slice(blockTex, fs) : undefined,
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
