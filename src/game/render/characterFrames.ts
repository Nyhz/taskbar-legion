import { Assets, Rectangle, Texture } from 'pixi.js';
import arrowUrl from '@/assets/characters/ranger/projectiles/arrow.png';
import priestAtkFx from '@/assets/characters/priest/effects/priest-attack-effect.png';
import priestMendFx from '@/assets/characters/priest/effects/priest-mend-effect.png';
import priestEnrageFx from '@/assets/characters/priest/effects/priest-battle-enrage.png';
import fireballFx from '@/assets/characters/mage/projectiles/mage-attack02-effect.png';

// The EFFECT art that survives from before the redesign: the arrow, the heal sparkle, the Battle Enrage swirl, the
// holy strike and the fireball blast. The fighters themselves are the redesign's figures (figureTextures.ts);
// these effects keep their old sheets until the redesign draws its own. Loaded once, before the first frame.

const STRIP_FRAME = 100; // the old horizontal strips: square 100 px frames
const GRID_FRAME = 128; // the on-ally effects: a 5×3 grid of 128 px cells, read left→right, top→bottom
const MEND_FRAME_COUNT = 11; // the grid's 15th cell row is only partly used
const ENRAGE_FRAME_COUNT = 12;

let arrowTex: Texture | null = null;
let healFxTex: Texture[] | null = null;
let enrageFxTex: Texture[] | null = null;
let fireballTex: Texture[] | null = null;
let holyStrikeTex: Texture[] | null = null;
let loading: Promise<void> | null = null;

function sliceStrip(base: Texture, frameSize: number): Texture[] {
  base.source.scaleMode = 'nearest';
  const count = Math.floor(base.width / frameSize);
  const out: Texture[] = [];
  for (let i = 0; i < count; i++) {
    out.push(new Texture({ source: base.source, frame: new Rectangle(i * frameSize, 0, frameSize, frameSize) }));
  }
  return out;
}

function sliceGrid(base: Texture, frameSize: number, count: number): Texture[] {
  base.source.scaleMode = 'nearest';
  const cols = Math.max(1, Math.floor(base.width / frameSize));
  const out: Texture[] = [];
  for (let i = 0; i < count; i++) {
    const fx = (i % cols) * frameSize;
    const fy = Math.floor(i / cols) * frameSize;
    out.push(new Texture({ source: base.source, frame: new Rectangle(fx, fy, frameSize, frameSize) }));
  }
  return out;
}

/** Load the shared effect textures. Idempotent. */
export async function loadEffectTextures(): Promise<void> {
  if (loading !== null) return loading;
  loading = (async () => {
    const [arrow, mend, enrage, fireball, strike] = await Promise.all([
      Assets.load<Texture>(arrowUrl),
      Assets.load<Texture>(priestMendFx),
      Assets.load<Texture>(priestEnrageFx),
      Assets.load<Texture>(fireballFx),
      Assets.load<Texture>(priestAtkFx),
    ]);
    arrow.source.scaleMode = 'nearest';
    arrowTex = arrow;
    healFxTex = sliceGrid(mend, GRID_FRAME, MEND_FRAME_COUNT);
    enrageFxTex = sliceGrid(enrage, GRID_FRAME, ENRAGE_FRAME_COUNT);
    fireballTex = sliceStrip(fireball, STRIP_FRAME);
    holyStrikeTex = sliceStrip(strike, STRIP_FRAME);
  })();
  return loading;
}

/** The shared arrow projectile texture, or null if not loaded yet. */
export function getArrowTexture(): Texture | null {
  return arrowTex;
}

/** The on-ally heal effect frames — the Mend sheet, shown on any ally a Priest heals. */
export function getHealEffectFrames(): Texture[] | null {
  return healFxTex;
}

/** The Battle Enrage swirl frames (looped over every ally while the Priest ult buff is up). */
export function getBattleEnrageFrames(): Texture[] | null {
  return enrageFxTex;
}

/** The 7-frame fireball/blast strip (reused for Explosive Arrow's detonation). */
export function getFireballFrames(): Texture[] | null {
  return fireballTex;
}

/** The Priest's holy strike: the pillar that lands on the enemy her basic attack hits. */
export function getHolyStrikeFrames(): Texture[] | null {
  return holyStrikeTex;
}
