import { Container, Graphics, Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';
import { hexToNum } from '@/styles/palette';
import { getArrowTexture } from './characterFrames';
import { drawCrosshair, ARROW_RED } from './effectAuras';

// A world-space layer for the big, transient ABILITY spectacles that play OVER a group of
// targets rather than on one body: a volley of arrows raining onto the wave, a holy
// nova bursting through it, a boss shockwave rocking the party.
// Cosmetic only — GameStrip fires these off 'cast' events and feeds them the target band's
// on-screen position. Each effect owns a tiny update closure and is reaped when it expires.

interface Fx {
  disp: Container;
  t: number;
  dur: number;
  tick: (t: number) => void;
}

const ARROW_SCALE = 1; // the arrow at the figures' own scale: 1 art pixel = 1 strip pixel
// The path is seen from the side: a ring lying on it is this flat (its height ÷ its width).
const GROUND_RING_FLAT = 0.1;
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

  /** Tar Flask: a slick of tar spreads along the path under the [cx±halfW] band and burns — a row of flames
   *  with bright cores, embers lifting off — for `dur`. Drawn on the GROUND layer (below the enemies). */
  tarPool(cx: number, groundY: number, halfW: number, dur: number): void {
    const g = new Graphics();
    const TAR = hexToNum('#120c10');
    const FLAME_DEEP = hexToNum('#d8431f');
    const FLAME = hexToNum('#ff8a3a');
    const FLAME_HI = hexToNum('#ffe27a');
    const cy = groundY + 1;
    const W = halfW + 8;
    const flames = Math.max(5, Math.round(W / 6));
    const seeds = Array.from({ length: flames }, () => Math.random());
    this.push(g, dur, (t) => {
      g.clear();
      const grow = Math.min(1, t / 240); // splash out
      const a = t > dur - 500 ? Math.max(0, (dur - t) / 500) : 1; // burn out
      const rx = W * grow;
      // the slick: a flat black band on the path with a ragged edge
      g.rect(Math.round(cx - rx), cy - 1, Math.round(rx * 2), 3).fill({ color: TAR, alpha: 0.85 * a });
      g.rect(Math.round(cx - rx * 0.92), cy + 2, Math.round(rx * 1.84), 1).fill({ color: TAR, alpha: 0.6 * a });
      for (let i = 0; i < flames; i++) {
        const seed = seeds[i] ?? 0;
        const fx = Math.round(cx + ((i + 0.5) / flames * 2 - 1) * rx * 0.94);
        const flick = 0.5 + 0.5 * Math.sin(t / (60 + seed * 50) + seed * 9);
        const h = Math.round((5 + seed * 6) * (0.65 + 0.35 * flick) * grow * (0.5 + 0.5 * a));
        if (h < 2) continue;
        const lean = flick > 0.5 ? 1 : 0;
        // a flame in three stacked steps: wide red base, orange body, a yellow core
        g.rect(fx - 2, cy - Math.ceil(h * 0.4), 4, Math.ceil(h * 0.4)).fill({ color: FLAME_DEEP, alpha: 0.9 * a });
        g.rect(fx - 1, cy - Math.ceil(h * 0.8), 3, Math.ceil(h * 0.8)).fill({ color: FLAME, alpha: 0.95 * a });
        g.rect(fx - 1 + lean, cy - h, 1, h).fill({ color: FLAME, alpha: 0.95 * a });
        g.rect(fx - 1, cy - Math.ceil(h * 0.45), 2, Math.ceil(h * 0.45)).fill({ color: FLAME_HI, alpha: a });
        // an ember drifting up off every other flame
        if (i % 2 === 0) {
          const p = (t / 700 + seed) % 1;
          g.rect(Math.round(fx + Math.sin(p * 6 + seed * 4) * 2), Math.round(cy - h - 2 - p * 14), 1, 1).fill({ color: FLAME_HI, alpha: (1 - p) * 0.9 * a });
        }
      }
    });
  }

  /** Caltrops: a spray of iron spikes erupts from `originX` (the ranger) and sweeps forward
   *  along the ground to `endX`, popping up in sequence then holding for `dur` and retracting.
   *  Drawn on the GROUND layer (below the enemies) so the wave walks over the spikes. */
  groundSpikes(originX: number, groundY: number, endX: number, dur: number): void {
    const g = new Graphics();
    const STEEL = hexToNum('#9aa0ab');
    const STEEL_DARK = hexToNum('#565b65');
    const TIP = hexToNum('#c0473a'); // bloodied point — sells the bleed
    const cy = groundY - 1;
    const dir = Math.sign(endX - originX) || 1;
    const span = Math.max(20, Math.abs(endX - originX));
    const N = Math.max(6, Math.round(span / 13));
    interface Sp { x: number; h: number; w: number; delay: number; }
    const spikes: Sp[] = [];
    for (let i = 0; i < N; i++) {
      const f = i / Math.max(1, N - 1); // 0 at the ranger → 1 at the far edge
      spikes.push({
        x: originX + dir * span * f + (Math.random() * 2 - 1) * 4,
        h: 8 + Math.random() * 7,
        w: 3 + Math.random() * 1.5,
        delay: f * 300, // erupt in sequence, sweeping out from the ranger
      });
    }
    this.push(g, dur, (t) => {
      g.clear();
      const retract = t > dur - 380 ? Math.max(0, (dur - t) / 380) : 1;
      for (const s of spikes) {
        const local = t - s.delay;
        if (local < 0) continue;
        const erupt = Math.min(1, local / 150); // quick pop-up
        const h = s.h * erupt * retract;
        if (h <= 0.5) continue;
        const a = retract;
        g.poly([s.x - s.w, cy, s.x + s.w, cy, s.x, cy - h]).fill({ color: STEEL_DARK, alpha: 0.9 * a });
        g.poly([s.x - s.w * 0.45, cy, s.x + s.w * 0.2, cy, s.x, cy - h * 0.95]).fill({ color: STEEL, alpha: 0.85 * a });
        g.poly([s.x - s.w * 0.3, cy - h * 0.68, s.x + s.w * 0.3, cy - h * 0.68, s.x, cy - h]).fill({ color: TIP, alpha: 0.6 * a });
      }
    });
  }

  /** Explosive Arrow's detonation: the tail of the fireball strip (orange burst → pale flash)
   *  pops at (cx, cy), growing + fading. Stays invisible for `delayMs` so it lands exactly when
   *  the arrow arrives. `frames` is the 7-frame fireball sheet (we use its last 3 = the blast). */
  fireballBurst(cx: number, cy: number, frames: Texture[], delayMs: number, sizeScale = 1): void {
    if (frames.length === 0) return;
    const blast = frames.slice(-3); // dark ember → orange burst → pale flash
    const s = new Sprite();
    s.anchor.set(0.5);
    s.visible = false;
    const play = 300; // explosion duration after the arrow lands
    this.push(s, delayMs + play, (t) => {
      if (t < delayMs) { s.visible = false; return; }
      s.visible = true;
      const k = Math.min(0.999, (t - delayMs) / play); // 0→1 through the blast
      const tex = blast[Math.min(blast.length - 1, Math.floor(k * blast.length))];
      if (tex !== undefined && s.texture !== tex) s.texture = tex;
      s.position.set(cx, cy);
      s.scale.set((0.7 + k * 1.2) * sizeScale); // swell as it detonates (× caller's size)
      s.alpha = 1 - k * 0.75;
    });
  }

  /** Priest holy strike: the attack-effect frames play ONCE directly on the struck enemy
   *  (replacing the old flying bolt) — a light pillar that grows then fades. `cx`/`cy` is the
   *  enemy's FEET on the ground line, and the anchor seats the pillar's baseline there so it
   *  rises up from the feet; `frames` is the priest's loaded effect strip. The layer sits above
   *  `combatants`, so it draws OVER the enemy. Default scale is bumped well past the Priest's
   *  Mend effect so the holy strike reads big on the struck enemy. */
  strikeBurst(cx: number, cy: number, frames: Texture[], scale = 2): void {
    if (frames.length === 0) return;
    const s = new Sprite();
    s.anchor.set(0.5, 0.62); // content centred ~x50, baseline ~y62 within the 100px frame
    s.scale.set(scale);
    s.visible = false;
    const play = 360;
    this.push(s, play, (t) => {
      s.visible = true;
      const k = Math.min(0.999, t / play); // 0→1 through the frames
      const tex = frames[Math.min(frames.length - 1, Math.floor(k * frames.length))];
      if (tex !== undefined && s.texture !== tex) s.texture = tex;
      s.position.set(cx, cy);
      s.alpha = t > play * 0.65 ? Math.max(0, 1 - (t - play * 0.65) / (play * 0.35)) : 1; // hold then fade
    });
  }

  /** Holy Nova: light bursts along the path through the [cx±halfW] band — a golden ring rolling out on the
   *  ground and shafts of light rising from it, each a little later than the one before, then sparks. Sized to
   *  the fighters: the shafts rise about one figure high, the ring stays on the ground line. */
  holyNova(cx: number, groundY: number, halfW: number): void {
    const g = new Graphics();
    const GOLD = hexToNum('#ffe9a0');
    const WHITE = 0xfffbe8;
    const dur = 620;
    const shafts = Math.max(5, Math.round(halfW / 9));
    const seeds = Array.from({ length: shafts }, () => Math.random());
    this.push(g, dur, (t) => {
      g.clear();
      const k = Math.min(1, t / dur);
      const a = 1 - k;
      const rx = halfW * (0.25 + k * 0.85);
      const ry = Math.max(2, rx * GROUND_RING_FLAT);
      g.ellipse(cx, groundY, rx, ry).stroke({ color: WHITE, width: 2, alpha: a });
      g.ellipse(cx, groundY, rx * 0.7, ry * 0.7).stroke({ color: GOLD, width: 1, alpha: a * 0.8 });
      for (let i = 0; i < shafts; i++) {
        const seed = seeds[i] ?? 0;
        const f = (i + 0.5) / shafts * 2 - 1; // -1 … 1 across the band
        const local = t - Math.abs(f) * 180; // the burst travels outward from the middle
        if (local < 0) continue;
        const kk = Math.min(1, local / 380);
        const h = Math.round((18 + seed * 16) * Math.sin(kk * Math.PI)); // rises, then sinks back
        if (h < 1) continue;
        const x = Math.round(cx + f * halfW);
        g.rect(x - 1, groundY - h, 3, h).fill({ color: GOLD, alpha: 0.55 * (1 - kk * 0.5) });
        g.rect(x, groundY - h, 1, h).fill({ color: WHITE, alpha: 0.95 * (1 - kk * 0.4) });
        g.rect(x + (i % 2 === 0 ? 3 : -3), Math.round(groundY - h - 3 - kk * 8), 1, 1).fill({ color: WHITE, alpha: 1 - kk });
      }
    });
  }

  /** Mark of the Hunter (ranger ult): a targeting crosshair springs up over the ranger's
   *  head, streaks across to the boss and locks on with a brief pulse. As it fades the
   *  boss's persistent mark-reticle aura (drawn by EnemySprite) takes over — so the lock-on
   *  reads as one continuous motion that then "stays there" for the fight. `radius` is the
   *  boss reticle's size, so the fly-in opens up to exactly match the aura it hands off to. */
  markCrosshair(fromX: number, fromY: number, target: () => { x: number; y: number }, radius: number): void {
    const g = new Graphics();
    const travel = 520; // streak from the ranger's head to the boss
    const settle = 460; // lock-on pulse, fading out as the persistent aura reticle takes over
    const dur = travel + settle;
    this.push(g, dur, (t) => {
      g.clear();
      // The target is read LIVE: the bearer is usually still walking into the fight when it is marked, and a
      // crosshair aimed at where it stood would lock on to thin air beside it.
      const { x: toX, y: toY } = target();
      if (t < travel) {
        const k = 1 - Math.pow(1 - t / travel, 3); // ease-out: fast off the head, eases onto the target
        const x = fromX + (toX - fromX) * k;
        const y = fromY + (toY - fromY) * k;
        const rad = 7 + (radius - 7) * k; // tight at the head, opens to the boss reticle size
        // a faint tracer trailing from the ranger's head to the in-flight reticle
        g.moveTo(fromX, fromY).lineTo(x, y).stroke({ color: ARROW_RED, width: 1, alpha: 0.25 * (1 - k) });
        drawCrosshair(g, x, y, rad, 1, t / 90); // spins fast in flight
      } else {
        const local = t - travel;
        const k = local / settle;
        const pop = 1 + 0.14 * Math.sin(local / 55) * (1 - k); // a couple of lock-on throbs
        drawCrosshair(g, toX, toY, radius * pop, 1 - k, t / 320); // fade as the aura reticle takes over
      }
    });
  }

  /** A ground shockwave ring (boss AoE / war cry / a party-wide call): a ring rolling out along the path over
   *  the [cx±halfW] band with motes lifting off it, in `color`. The path is seen side-on, so the ring is a thin
   *  ellipse hugging the ground line (GROUND_RING_FLAT) — it never climbs over the fighters. */
  shockwave(cx: number, groundY: number, halfW: number, color: number): void {
    const g = new Graphics();
    const dur = 560;
    this.push(g, dur, (t) => {
      g.clear();
      const k = Math.min(1, t / dur);
      const a = 1 - k;
      const cy = groundY;
      const rx = halfW * (0.3 + k * 0.8);
      const ry = Math.max(2, rx * GROUND_RING_FLAT);
      g.ellipse(cx, cy, rx, ry).stroke({ color, width: 2, alpha: a });
      g.ellipse(cx, cy, rx * 0.66, ry * 0.66).stroke({ color, width: 1, alpha: a * 0.7 });
      for (let i = 0; i < 9; i++) {
        const mx = Math.round(cx + ((i + 0.5) / 9 * 2 - 1) * rx * 0.95);
        const my = Math.round(cy - 2 - k * (8 + (i % 3) * 4));
        g.rect(mx, my, 1, 2).fill({ color, alpha: a });
      }
    });
  }
}
