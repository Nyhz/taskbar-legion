import { Container, Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';
import { fxFrameAt, fxMeta, type FxMeta } from './fxData';
import { fxFrames } from './fxTextures';

// Everything that FLIES in the strip: an effect of the pipeline's atlas (render/abilityFx for the heroes' shots,
// render/enemyFx for the foes') travelling from whoever shot it to a live target — level like an arrow, lobbed in
// an arc, or straight like light — and playing its frames on the way. Cosmetic only: fired off combat events;
// reads nothing from the sim. (The old arrow sprite, the procedural fireball and the Priest's old bolt are gone:
// every shooter now has a shot of its own.)

interface Vec {
  x: number;
  y: number;
}

const SPEED = 760; // px/s

/** Travel time (ms) for a projectile between two points — exported so callers can land
 *  the damage number at the exact moment the projectile arrives. */
export function projectileFlightMs(fromX: number, fromY: number, toX: number, toY: number): number {
  const dist = Math.hypot(toX - fromX, toY - fromY);
  return Math.max(90, Math.min(320, (dist / SPEED) * 1000));
}

/** A shot drawn by the effects atlas: its frames play by their own times while it flies. */
interface LookShot {
  sprite: Sprite;
  frames: Texture[];
  meta: FxMeta;
  fromX: number;
  fromY: number;
  target: () => Vec;
  t: number;
  dur: number;
  arc: number;
  shown: number;
  onLand?: (x: number, y: number) => void;
  straight: boolean;
  byPitch: boolean;
}

/** How a shot with a look flies, beyond its arc. */
export interface LookFlight {
  /** −1 mirrors the art: a foe's shot flies left. */
  facing?: 1 | -1;
  /** It flies in a straight line to its target (light) instead of dead level like an arrow. */
  straight?: boolean;
  /** The look's frames are PITCHES, first climbing, last falling (a lofted arrow): the frame follows the flight
   *  instead of the clock. */
  byPitch?: boolean;
}

/** A lobbed shot is in the air at least this long, however near its target (ms). */
const MIN_ARC_MS = 420;

/** Travel time (ms) of a shot with a look: an arrow's, or a lob's when it flies in an arc. */
export function lookFlightMs(fromX: number, fromY: number, toX: number, toY: number, arc = 0): number {
  const flat = projectileFlightMs(fromX, fromY, toX, toY);
  return arc > 0 ? Math.max(MIN_ARC_MS, flat * 1.6) : flat;
}

export class ProjectileLayer extends Container {
  private readonly looks: LookShot[] = [];

  /** Fire a shot drawn by the effect `look` (render/fxData) at a LIVE target: flat like an arrow, or lobbed
   *  `arc` pixels high. `onLand` runs where it arrives. Returns its travel time (ms); 0 if the look is unknown. */
  spawnLook(fromX: number, fromY: number, target: () => Vec, look: string, arc = 0, onLand?: (x: number, y: number) => void, flight: LookFlight = {}): number {
    const frames = fxFrames(look);
    const meta = fxMeta(look);
    if (frames === null || meta === undefined) return 0;
    const dest = target();
    const sprite = new Sprite(frames[0]);
    sprite.anchor.set(meta.ax / meta.w, meta.ay / meta.h);
    sprite.position.set(Math.round(fromX), Math.round(fromY));
    sprite.scale.set(flight.facing ?? 1, 1);
    this.addChild(sprite);
    const dur = lookFlightMs(fromX, fromY, dest.x, dest.y, arc);
    this.looks.push({
      sprite, frames, meta, fromX, fromY, target, t: 0, dur, arc, shown: 0, straight: flight.straight === true, byPitch: flight.byPitch === true,
      ...(onLand === undefined ? {} : { onLand }),
    });
    return dur;
  }

  private updateLooks(dtMs: number): void {
    for (let i = this.looks.length - 1; i >= 0; i--) {
      const p = this.looks[i];
      if (p === undefined) continue;
      p.t += dtMs;
      const k = Math.min(1, p.t / p.dur);
      const dest = p.target();
      const x = p.fromX + (dest.x - p.fromX) * k;
      // An arrow flies dead flat at the height it left the bow; a lob rises and comes down on its target; light
      // goes straight to it.
      const y = p.arc > 0 ? p.fromY + (dest.y - p.fromY) * k - Math.sin(k * Math.PI) * p.arc : p.straight ? p.fromY + (dest.y - p.fromY) * k : p.fromY;
      p.sprite.position.set(Math.round(x), Math.round(y));
      const frame = p.byPitch ? Math.min(p.meta.n - 1, Math.floor(k * p.meta.n)) : Math.max(0, fxFrameAt(p.meta, p.t));
      if (frame !== p.shown) {
        const texture = p.frames[frame];
        if (texture !== undefined) p.sprite.texture = texture;
        p.shown = frame;
      }
      if (k >= 1) {
        this.looks.splice(i, 1);
        p.sprite.destroy();
        p.onLand?.(x, y);
      }
    }
  }

  update(dtMs: number): void {
    this.updateLooks(dtMs);
  }
}
