import { Container, Graphics } from 'pixi.js';

// Dusk motes / fireflies drifting over the title scene — pure ambience. A pool of small
// warm dots that float gently upward with a horizontal sway and twinkle in/out, wrapping
// around the edges so the field never empties. Render-only, so Math.random is fine here.

const COUNT = 40;
const COLOR = 0xffe9a8; // warm firefly glow
const RISE_MIN = 4; // px/s upward drift
const RISE_MAX = 16;
const SWAY_PX = 14; // horizontal sway amplitude

interface Mote {
  x: number;
  y: number;
  rise: number; // upward speed px/s
  size: number;
  baseX: number; // sway anchor
  swaySpeed: number;
  phase: number; // twinkle + sway phase
  twinkle: number; // twinkle speed
}

export class TitleParticles extends Container {
  private readonly g = new Graphics();
  private motes: Mote[] = [];
  private w = 0;
  private h = 0;
  private elapsed = 0;

  constructor() {
    super();
    this.addChild(this.g);
    this.eventMode = 'none'; // never intercept the hover hit-test
  }

  build(width: number, height: number): void {
    this.w = width;
    this.h = height;
    this.motes = Array.from({ length: COUNT }, () => this.spawn(Math.random() * height));
  }

  private spawn(y: number): Mote {
    const x = Math.random() * this.w;
    return {
      x,
      y,
      baseX: x,
      rise: RISE_MIN + Math.random() * (RISE_MAX - RISE_MIN),
      size: 1 + Math.round(Math.random() * 2),
      swaySpeed: 0.4 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
      twinkle: 0.6 + Math.random() * 1.4,
    };
  }

  update(dtMs: number): void {
    const dt = dtMs / 1000;
    this.elapsed += dt;
    this.g.clear();
    for (const m of this.motes) {
      m.y -= m.rise * dt;
      m.x = m.baseX + Math.sin(this.elapsed * m.swaySpeed + m.phase) * SWAY_PX;
      if (m.y < -4) {
        // recycle at the bottom with a fresh column
        Object.assign(m, this.spawn(this.h + 4));
      }
      const alpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(this.elapsed * m.twinkle + m.phase));
      this.g.circle(m.x, m.y, m.size).fill({ color: COLOR, alpha });
    }
  }
}
