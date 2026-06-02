import { Container, Graphics, Sprite } from 'pixi.js';
import { hexToNum } from '@/styles/palette';
import { getArrowTexture } from './characterFrames';

// Pooled projectile layer: arrows (ranged) and fireballs (casters) fly from the
// attacker to its target. Arrows use the shared arrow sprite, rotated to their flight
// direction; fireballs are drawn procedurally. Cosmetic only — fired off combat
// 'damage' events (basic attacks AND projectile abilities); reads nothing from the sim.

export type ProjectileType = 'arrow' | 'fireball';

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
const ARROW_SCALE = 1.3; // chunky arrow that reads clearly against the ~42px bodies

/** Travel time (ms) for a projectile between two points — exported so callers can land
 *  the damage number at the exact moment the projectile arrives. */
export function projectileFlightMs(fromX: number, fromY: number, toX: number, toY: number): number {
  const dist = Math.hypot(toX - fromX, toY - fromY);
  return Math.max(90, Math.min(320, (dist / SPEED) * 1000));
}

export class ProjectileLayer extends Container {
  private readonly arrowPool: Sprite[] = [];
  private readonly fireballPool: Graphics[] = [];
  private readonly active: Projectile[] = [];

  /** Fire a projectile at a LIVE target (read each frame so it homes on a moving enemy);
   *  returns the initial travel-time estimate (ms). */
  spawn(fromX: number, fromY: number, target: () => Vec, type: ProjectileType): number {
    const dest = target();
    const disp = type === 'arrow' ? this.takeArrow() : this.takeFireball();
    disp.visible = true;
    disp.alpha = 1;
    disp.rotation = 0; // arrows fly flat (point right toward the enemies); fireballs spin
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
        p.disp.rotation += dtMs / 40; // fireball spin/flicker
      }
      if (k >= 1) {
        p.disp.visible = false;
        this.removeChild(p.disp);
        // disp matches p.type by construction, so these narrowings are safe.
        if (p.type === 'arrow') this.arrowPool.push(p.disp as Sprite);
        else this.fireballPool.push(p.disp as Graphics);
        this.active.splice(i, 1);
      }
    }
  }

  private takeArrow(): Sprite {
    const s = this.arrowPool.pop() ?? new Sprite();
    const tex = getArrowTexture();
    if (tex !== null) s.texture = tex; // preloaded before the first frame; null only if load failed
    s.anchor.set(0.5);
    s.scale.set(ARROW_SCALE);
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
