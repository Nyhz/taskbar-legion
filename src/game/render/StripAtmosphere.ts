import { Container, Graphics, GraphicsContext, Sprite, Texture } from 'pixi.js';
import {
  STRIP_ART_HEIGHT,
  STRIP_ART_WIDTH,
  colorNum,
  pixelLine,
  strikeLevel,
  type AtmosphereFx,
  type EyesFx,
  type FlickerFx,
  type LightningFx,
  type ParticlesFx,
  type PulseFx,
} from './stripBackdropData';

// The weather and the omens of a world's grade, run in real time from data (each backdrop's ATMOSPHERE, exported
// to src/assets/strip/backdrops.json): lightning (bolt, flash, a tremor), particles (rain, ash, motes), eyes that
// open in the dark, a slow pulse of tint, a flicker of the light. It behaves like the lab page's `atmos()` — the
// reference the art was approved on — but with stable display objects: nothing is re-tessellated per frame
// except a bolt, once, when it strikes. Render-side only: its randomness never touches the simulation.

interface Runner {
  update(clock: number, dtMs: number): void;
  destroy(): void;
}

const rnd = (a: number, b: number): number => a + Math.random() * (b - a);

/** A full-strip sheet of one colour (pulse, flash, flicker): only its alpha / visibility changes. */
function overlay(color: string): Sprite {
  const s = new Sprite(Texture.WHITE);
  s.width = STRIP_ART_WIDTH;
  s.height = STRIP_ART_HEIGHT;
  s.tint = colorNum(color);
  s.visible = false;
  return s;
}

export class StripAtmosphere {
  /** Right over the sky layer, behind everything else: bolts. */
  readonly sky = new Container();
  /** Behind the fighters: flashes, far particles, eyes. */
  readonly back = new Container();
  /** In front of the fighters, behind the foreground layer: near particles. */
  readonly front = new Container();
  /** Over the whole strip's art: pulse, flicker. */
  readonly over = new Container();

  private runners: Runner[] = [];
  private clock = 0;
  private shakeAmp = 0;
  private shakeUntil = 0;

  /** Replace the running effects (a new world or grade). */
  set(effects: readonly AtmosphereFx[]): void {
    for (const r of this.runners) r.destroy();
    this.runners = effects.map((fx) => this.runner(fx));
    this.shakeUntil = 0;
  }

  update(dtMs: number): void {
    const dt = Math.min(100, Math.max(0, dtMs)); // a long / backgrounded frame must not fast-forward the weather
    this.clock += dt;
    for (const r of this.runners) r.update(this.clock, dt);
  }

  /** Horizontal tremor of the whole strip right now, in art pixels (0 almost always). */
  get shakeX(): number {
    if (this.clock >= this.shakeUntil) return 0;
    return Math.random() < 0.5 ? -this.shakeAmp : this.shakeAmp;
  }

  private runner(fx: AtmosphereFx): Runner {
    switch (fx.fx) {
      case 'lightning':
        return this.lightning(fx);
      case 'particles':
        return this.particles(fx);
      case 'eyes':
        return this.eyes(fx);
      case 'pulse':
        return this.pulse(fx);
      case 'flicker':
        return this.flicker(fx);
    }
  }

  private lightning(fx: LightningFx): Runner {
    const flash = overlay(fx.flash);
    const bolt = new Graphics();
    bolt.visible = false;
    this.back.addChild(flash);
    this.sky.addChild(bolt);
    let next = this.clock + rnd(600, fx.every[1]);
    let at = -1e9;
    return {
      update: (clock) => {
        if (clock >= next) {
          at = clock;
          next = clock + rnd(fx.every[0], fx.every[1]);
          if (fx.bolt !== undefined) drawBolt(bolt, fx, fx.bolt);
          if (fx.shake !== undefined && fx.shake > 0) {
            this.shakeAmp = fx.shake;
            this.shakeUntil = clock + 220;
          }
        }
        const lit = strikeLevel(clock - at);
        bolt.visible = fx.bolt !== undefined && lit > 0.15;
        const alpha = lit * fx.alpha;
        flash.visible = alpha > 0.01;
        flash.alpha = alpha;
      },
      destroy: () => {
        flash.destroy();
        bolt.destroy();
      },
    };
  }

  private particles(fx: ParticlesFx): Runner {
    const ymax = fx.ymax ?? 128;
    const len = fx.len ?? 1;
    const size = fx.size ?? 1;
    const speed = Math.hypot(fx.vx, fx.vy) || 1;
    const colors = typeof fx.color === 'string' ? [fx.color] : fx.color;
    // One shape per colour, shared by every particle of that colour: a dot, or a streak along its motion.
    const shapes = colors.map((color) => {
      const ctx = new GraphicsContext();
      if (len > 1) {
        for (const [x, y] of pixelLine(0, 0, (-fx.vx / speed) * len, (-fx.vy / speed) * len)) ctx.rect(x, y, 1, 1);
      } else {
        ctx.rect(0, 0, size, size);
      }
      return ctx.fill({ color: colorNum(color) });
    });
    const layer = new Container();
    layer.alpha = fx.alpha ?? 0.7;
    (fx.front === false ? this.back : this.front).addChild(layer);
    const ps = Array.from({ length: fx.count }, (_, n) => {
      const g = new Graphics(shapes[n % shapes.length]);
      layer.addChild(g);
      return { x: Math.random() * STRIP_ART_WIDTH, y: Math.random() * ymax, phase: Math.random() * 6.28, g };
    });
    return {
      update: (clock, dtMs) => {
        const sway = fx.sway ?? 0;
        for (const p of ps) {
          p.x += (fx.vx * dtMs) / 1000;
          p.y += (fx.vy * dtMs) / 1000;
          if (p.y > ymax) {
            p.y -= ymax;
            p.x = Math.random() * STRIP_ART_WIDTH;
          } else if (p.y < 0) {
            p.y += ymax;
            p.x = Math.random() * STRIP_ART_WIDTH;
          }
          if (p.x > STRIP_ART_WIDTH) p.x -= STRIP_ART_WIDTH;
          else if (p.x < 0) p.x += STRIP_ART_WIDTH;
          const x = sway === 0 ? p.x : p.x + Math.sin(clock / 600 + p.phase) * sway;
          p.g.position.set(Math.round(x), Math.round(p.y));
        }
      },
      destroy: () => {
        layer.destroy({ children: true });
        for (const ctx of shapes) ctx.destroy();
      },
    };
  }

  private eyes(fx: EyesFx): Runner {
    const max = fx.max ?? 3;
    const size = fx.size ?? 1;
    const gap = fx.gap ?? 3;
    const shape = new GraphicsContext().rect(0, 0, size, size).rect(gap, 0, size, size).fill({ color: colorNum(fx.color) });
    const pool = Array.from({ length: max }, () => {
      const g = new Graphics(shape);
      g.visible = false;
      this.back.addChild(g);
      return g;
    });
    let open: { x: number; y: number; born: number; until: number }[] = [];
    let next = this.clock + rnd(300, fx.every[1]);
    return {
      update: (clock) => {
        open = open.filter((e) => e.until > clock);
        if (clock >= next && open.length < max) {
          const zone = fx.zones[Math.floor(Math.random() * fx.zones.length)];
          if (zone !== undefined) {
            open.push({
              x: Math.round(rnd(zone[0], zone[2])),
              y: Math.round(rnd(zone[1], zone[3])),
              born: clock,
              until: clock + fx.hold,
            });
          }
          next = clock + rnd(fx.every[0], fx.every[1]);
        }
        pool.forEach((g, i) => {
          const e = open[i];
          if (e === undefined) {
            g.visible = false;
            return;
          }
          const age = clock - e.born;
          const left = e.until - clock;
          const blink = Math.abs(age - fx.hold * 0.55) < 50;
          g.visible = !(age < 70 || left < 70 || blink); // opening, closing, one blink
          g.position.set(e.x, e.y);
        });
      },
      destroy: () => {
        for (const g of pool) g.destroy();
        shape.destroy();
      },
    };
  }

  private pulse(fx: PulseFx): Runner {
    const sheet = overlay(fx.color);
    sheet.visible = true;
    sheet.alpha = 0;
    this.over.addChild(sheet);
    return {
      update: (clock) => {
        sheet.alpha = fx.alpha * (0.5 - 0.5 * Math.cos((6.2832 * clock) / fx.period));
      },
      destroy: () => sheet.destroy(),
    };
  }

  private flicker(fx: FlickerFx): Runner {
    const sheet = overlay(fx.color);
    sheet.alpha = fx.alpha;
    this.over.addChild(sheet);
    let next = this.clock + rnd(500, fx.every[1]);
    let until = 0;
    return {
      update: (clock) => {
        if (clock >= next) {
          until = clock + fx.dur;
          next = clock + rnd(fx.every[0], fx.every[1]);
        }
        sheet.visible = clock < until && Math.floor(clock / 45) % 2 === 0;
      },
      destroy: () => sheet.destroy(),
    };
  }
}

/** A fresh bolt: a jagged line down the sky with a few short forks, as 1-px pixels. */
function drawBolt(g: Graphics, fx: LightningFx, color: string): void {
  const xr = fx.x ?? [40, 560];
  const yr = fx.y ?? [0, 96];
  let x = rnd(xr[0], xr[1]);
  let y = yr[0];
  const lines: [number, number][][] = [];
  const main: [number, number][] = [[x, y]];
  while (y < yr[1]) {
    y = Math.min(yr[1], y + rnd(5, 10));
    x += rnd(-7, 7);
    main.push([x, y]);
    if (Math.random() < 0.22) {
      let bx = x;
      let by = y;
      const dir = Math.random() < 0.5 ? -1 : 1;
      const fork: [number, number][] = [[bx, by]];
      for (let k = 0; k < 3; k++) {
        bx += dir * rnd(3, 8);
        by += rnd(3, 7);
        fork.push([bx, by]);
      }
      lines.push(fork);
    }
  }
  lines.unshift(main);
  g.clear();
  for (const line of lines) {
    for (let k = 1; k < line.length; k++) {
      const a = line[k - 1];
      const b = line[k];
      if (a === undefined || b === undefined) continue;
      for (const [px, py] of pixelLine(a[0], a[1], b[0], b[1])) g.rect(px, py, 1, 1);
    }
  }
  g.fill({ color: colorNum(color) });
}
