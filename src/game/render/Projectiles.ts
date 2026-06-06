import { AnimatedSprite, Container, Graphics, Sprite } from 'pixi.js';
import type { Texture, Ticker } from 'pixi.js';
import { hexToNum } from '@/styles/palette';
import { getArrowTexture } from './characterFrames';

// Pooled projectile layer: arrows (ranged), a procedural fireball (generic casters), and
// an animated "magic bolt" built from a class's own effect frames (the Priest's spell).
// Arrows use the shared arrow sprite flying flat; fireballs/magic arc slightly and spin/
// animate. Cosmetic only — fired off combat 'damage' events; reads nothing from the sim.

export type ProjectileType = 'arrow' | 'fireball' | 'magic';

const MS_PER_FRAME = 1000 / 60; // AnimatedSprite.update expects ticker-frame units

interface Vec {
  x: number;
  y: number;
}

interface Projectile {
  disp: Container;
  fromX: number;
  fromY: number;
  target: () => Vec; // read LIVE each frame so the projectile homes on a moving enemy
  t: number;
  dur: number;
  type: ProjectileType;
}

const SPEED = 760; // px/s
const ARROW_SCALE = 1.8; // chunky arrow that reads clearly against the ~42px bodies (Explosive Arrow scales off this ×1.9)
const MAGIC_SCALE = 0.55; // the spell-effect frames are full 100px — shrink to a compact bolt

/** Travel time (ms) for a projectile between two points — exported so callers can land
 *  the damage number at the exact moment the projectile arrives. */
export function projectileFlightMs(fromX: number, fromY: number, toX: number, toY: number): number {
  const dist = Math.hypot(toX - fromX, toY - fromY);
  return Math.max(90, Math.min(320, (dist / SPEED) * 1000));
}

export class ProjectileLayer extends Container {
  private readonly arrowPool: Sprite[] = [];
  private readonly fireballPool: Graphics[] = [];
  private readonly magicPool: AnimatedSprite[] = [];
  private readonly active: Projectile[] = [];
  private readonly tickerShim = { deltaTime: 0 } as unknown as Ticker;

  /** Fire a projectile at a LIVE target (read each frame so it homes on a moving enemy);
   *  returns the initial travel-time estimate (ms). `frames` is required for type 'magic'. */
  spawn(fromX: number, fromY: number, target: () => Vec, type: ProjectileType, frames?: Texture[], scale = 1): number {
    const dest = target();
    const disp = type === 'arrow' ? this.takeArrow() : type === 'magic' ? this.takeMagic(frames ?? []) : this.takeFireball();
    disp.visible = true;
    disp.alpha = 1;
    disp.rotation = 0; // arrows fly flat (point right toward the enemies); fireballs spin
    if (type === 'arrow' && scale !== 1) disp.scale.set(ARROW_SCALE * scale); // bigger arrow (Explosive Arrow)
    disp.x = fromX;
    disp.y = fromY;
    this.addChild(disp);
    const dur = projectileFlightMs(fromX, fromY, dest.x, dest.y);
    this.active.push({ disp, fromX, fromY, target, t: 0, dur, type });
    return dur;
  }

  update(dtMs: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      if (p === undefined) continue;
      p.t += dtMs;
      const k = Math.min(1, p.t / p.dur);
      const dest = p.target(); // live target — homes as the enemy keeps advancing
      p.disp.x = p.fromX + (dest.x - p.fromX) * k;
      if (p.type === 'arrow') {
        p.disp.y = p.fromY; // travel dead-flat (horizontal), no arc — rotation stays 0
      } else {
        p.disp.y = p.fromY + (dest.y - p.fromY) * k - Math.sin(k * Math.PI) * 6; // slight arc
        if (p.type === 'fireball') p.disp.rotation += dtMs / 40; // fireball spin/flicker
        else (p.disp as AnimatedSprite).update(this.shim(dtMs)); // magic: advance its frames
      }
      if (k >= 1) {
        p.disp.visible = false;
        this.removeChild(p.disp);
        // disp matches p.type by construction, so these narrowings are safe.
        if (p.type === 'arrow') this.arrowPool.push(p.disp as Sprite);
        else if (p.type === 'magic') this.magicPool.push(p.disp as AnimatedSprite);
        else this.fireballPool.push(p.disp as Graphics);
        this.active.splice(i, 1);
      }
    }
  }

  private shim(dtMs: number): Ticker {
    this.tickerShim.deltaTime = dtMs / MS_PER_FRAME;
    return this.tickerShim;
  }

  private takeArrow(): Sprite {
    const s = this.arrowPool.pop() ?? new Sprite();
    const tex = getArrowTexture();
    if (tex !== null) s.texture = tex; // preloaded before the first frame; null only if load failed
    s.anchor.set(0.5);
    s.scale.set(ARROW_SCALE);
    return s;
  }

  private takeMagic(frames: Texture[]): AnimatedSprite {
    const s = this.magicPool.pop() ?? new AnimatedSprite(frames.length > 0 ? frames : [getArrowTexture() ?? new Sprite().texture]);
    s.autoUpdate = false;
    if (frames.length > 0) s.textures = frames;
    s.anchor.set(0.52, 0.44); // effect content is centred on ~x52, y44 within the 100px frame
    s.scale.set(MAGIC_SCALE);
    s.loop = true;
    s.gotoAndStop(0);
    return s;
  }

  private takeFireball(): Graphics {
    const g = this.fireballPool.pop() ?? new Graphics();
    g.clear();
    g.circle(0, 0, 4).fill({ color: hexToNum('#e08a2e') });
    g.circle(0, 0, 2.2).fill({ color: hexToNum('#ffe27a') });
    g.circle(-3, 0, 1.5).fill({ color: hexToNum('#c0473a') }); // trailing ember
    return g;
  }
}
