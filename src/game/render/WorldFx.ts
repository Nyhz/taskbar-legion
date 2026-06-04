import { Container, Graphics, Sprite } from 'pixi.js';
import { hexToNum } from '@/styles/palette';
import { getArrowTexture } from './characterFrames';

// A world-space layer for the big, transient ABILITY spectacles that play OVER a group of
// targets rather than on one body: a volley of arrows raining onto the wave, a frost pool
// spreading under it, a holy nova bursting through it, a boss shockwave rocking the party.
// Cosmetic only — GameStrip fires these off 'cast' events and feeds them the target band's
// on-screen position. Each effect owns a tiny update closure and is reaped when it expires.

interface Fx {
  disp: Container;
  t: number;
  dur: number;
  tick: (t: number) => void;
}

const ARROW_SCALE = 1.7;
const ARROW_FALL = hexToNum('#e9e2d0');

export class WorldFxLayer extends Container {
  private readonly active: Fx[] = [];
  private readonly arrowPool: Sprite[] = [];

  private push(disp: Container, dur: number, tick: (t: number) => void): void {
    this.addChild(disp);
    this.active.push({ disp, t: 0, dur, tick });
    tick(0);
  }

  update(dtMs: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const fx = this.active[i];
      if (fx === undefined) continue;
      fx.t += dtMs;
      fx.tick(fx.t);
      if (fx.t >= fx.dur) {
        this.recycle(fx.disp);
        this.removeChild(fx.disp);
        this.active.splice(i, 1);
      }
    }
  }

  // Reclaim any arrow sprites a finished effect held, back into the pool.
  private recycle(disp: Container): void {
    for (const child of disp.children) {
      if (child instanceof Sprite) {
        child.visible = false;
        this.arrowPool.push(child);
      }
    }
    disp.removeChildren();
  }

  private takeArrow(): Sprite {
    const s = this.arrowPool.pop() ?? new Sprite();
    const tex = getArrowTexture();
    if (tex !== null) s.texture = tex;
    s.anchor.set(0.5);
    s.scale.set(ARROW_SCALE);
    s.visible = true;
    s.alpha = 1;
    return s;
  }

  /** Raining Arrows: a dense volley arcs down out of the sky onto the [cx±halfW] band,
   *  each arrow staggered, slamming into the ground line then sticking + fading. */
  arrowRain(cx: number, groundY: number, halfW: number): void {
    const disp = new Container();
    const N = Math.max(10, Math.round(halfW / 7));
    const fallH = 120;
    const lean = 26; // horizontal drift as they fall (diagonal volley)
    interface A { s: Sprite; x0: number; landY: number; delay: number; fall: number; }
    const arrows: A[] = [];
    for (let i = 0; i < N; i++) {
      const s = this.takeArrow();
      s.rotation = Math.PI / 2 + 0.32; // point down, leaning right
      const x0 = cx + (Math.random() * 2 - 1) * halfW;
      arrows.push({ s, x0, landY: groundY - 2 - Math.random() * 6, delay: Math.random() * 360, fall: 240 + Math.random() * 120 });
      disp.addChild(s);
    }
    const dur = 1240; // covers the latest arrow's delay + fall + stuck-in-ground fade
    this.push(disp, dur, (t) => {
      for (const a of arrows) {
        const local = t - a.delay;
        if (local < 0) { a.s.visible = false; continue; }
        a.s.visible = true;
        const k = Math.min(1, local / a.fall);
        a.s.x = a.x0 + lean * (1 - k);
        a.s.y = a.landY - fallH * (1 - k);
        // stuck-in-ground fade once landed
        a.s.alpha = k >= 1 ? Math.max(0, 1 - (local - a.fall) / 360) : 1;
        a.s.tint = ARROW_FALL;
      }
    });
  }

  /** Frozen Trap: an icy pool spreads under the [cx±halfW] band, shimmering, with crystal
   *  shards jutting up and a cold mist — lingers for `dur` (the slow's duration). */
  frostPool(cx: number, groundY: number, halfW: number, dur: number): void {
    const g = new Graphics();
    const ICE = hexToNum('#9fe9ff');
    const ICE_DEEP = hexToNum('#5ab4e6');
    const W = halfW * 1.15;
    this.push(g, dur, (t) => {
      g.clear();
      const grow = Math.min(1, t / 260); // spread in
      const fade = t > dur - 420 ? Math.max(0, (dur - t) / 420) : 1; // melt out
      const a = fade;
      const cy = groundY - 2;
      const rx = W * grow;
      const ry = rx * 0.34;
      // pool body (flattened ellipse on the ground) + rim
      g.ellipse(cx, cy, rx, ry).fill({ color: ICE_DEEP, alpha: 0.32 * a });
      g.ellipse(cx, cy, rx, ry).stroke({ color: ICE, width: 2, alpha: 0.7 * a });
      g.ellipse(cx, cy, rx * 0.62, ry * 0.62).stroke({ color: ICE, width: 1, alpha: 0.4 * a });
      // crystal shards jutting up around the rim
      const shards = Math.max(5, Math.round(W / 9));
      for (let i = 0; i < shards; i++) {
        const ang = (i / shards) * Math.PI * 2 + t / 1400;
        const sx = cx + Math.cos(ang) * rx * 0.82;
        const sy = cy + Math.sin(ang) * ry * 0.82;
        const h = (5 + (i % 3) * 3) * grow;
        const w = 2.2;
        g.poly([sx - w, sy, sx + w, sy, sx, sy - h]).fill({ color: ICE, alpha: 0.85 * a });
        g.poly([sx - w * 0.4, sy, sx + w * 0.2, sy, sx, sy - h * 0.9]).fill({ color: 0xffffff, alpha: 0.6 * a });
      }
      // drifting frost sparkles
      for (let i = 0; i < 7; i++) {
        const p = (t / 900 + i / 7) % 1;
        const px = cx + Math.sin(i * 2.3 + t / 600) * rx * 0.8;
        const py = cy - p * 22;
        g.circle(px, py, 1.2).fill({ color: 0xffffff, alpha: (1 - p) * 0.7 * a });
      }
    });
  }

  /** Holy Nova: a golden ring + radiating rays + sparkles bursting through the wave. */
  holyNova(cx: number, cy: number, radius: number): void {
    const g = new Graphics();
    const GOLD = hexToNum('#ffe9a0');
    const WHITE = 0xfffbe8;
    const dur = 620;
    this.push(g, dur, (t) => {
      g.clear();
      const k = Math.min(1, t / dur);
      const a = 1 - k;
      const rr = radius * (0.2 + k * 0.95);
      g.circle(cx, cy, rr).stroke({ color: WHITE, width: 4 * (1 - k) + 1, alpha: a });
      g.circle(cx, cy, rr * 0.7).stroke({ color: GOLD, width: 3, alpha: a * 0.8 });
      g.circle(cx, cy, rr * 0.35).fill({ color: WHITE, alpha: a * 0.4 });
      const rays = 12;
      for (let i = 0; i < rays; i++) {
        const ang = (i / rays) * Math.PI * 2 + t / 800;
        const r0 = rr * 0.55;
        const r1 = rr * (1.05 + 0.12 * Math.sin(t / 90 + i));
        g.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0)
          .lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1)
          .stroke({ color: GOLD, width: 2, alpha: a * 0.9 });
        g.circle(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1, 1.6).fill({ color: WHITE, alpha: a });
      }
    });
  }

  /** A ground shockwave ring (boss AoE / war cry): expanding flattened ring + rising motes,
   *  in `color`. Reads as an impact rolling out across the [cx±halfW] band. */
  shockwave(cx: number, groundY: number, halfW: number, color: number): void {
    const g = new Graphics();
    const dur = 560;
    this.push(g, dur, (t) => {
      g.clear();
      const k = Math.min(1, t / dur);
      const a = 1 - k;
      const cy = groundY - 4;
      const rx = halfW * (0.3 + k * 1.2);
      const ry = rx * 0.32;
      g.ellipse(cx, cy, rx, ry).stroke({ color, width: 4 * (1 - k) + 1, alpha: a });
      g.ellipse(cx, cy, rx * 0.66, ry * 0.66).stroke({ color, width: 2, alpha: a * 0.7 });
      for (let i = 0; i < 9; i++) {
        const ang = (i / 9) * Math.PI * 2;
        const rr = rx * 0.9;
        const mx = cx + Math.cos(ang) * rr;
        const my = cy + Math.sin(ang) * ry * 0.9 - k * 14;
        g.circle(mx, my, 1.8 * (1 - k) + 0.5).fill({ color, alpha: a });
      }
    });
  }
}
