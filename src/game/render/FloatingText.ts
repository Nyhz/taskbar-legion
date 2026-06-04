import { BitmapText, Container } from 'pixi.js';

// Pooled floating combat text (damage numbers, crit pops). Objects are recycled
// (never created per frame). Reads nothing from the sim — fed values by the driver.
//
// These are the most frequently mutated text in the game (a number on every hit). A
// canvas `Text` re-rasterises to a texture and re-uploads to the GPU whenever its string
// OR fill changes; `BitmapText` instead lays out quads from a shared, lazily-generated
// glyph atlas — no per-change canvas work. The glyphs are baked WHITE and recoloured per
// spawn with `tint` (which multiplies, so a white glyph takes the exact colour) rather
// than `style.fill`, which would fork a new font variant.

interface ActiveText {
  text: BitmapText;
  vy: number;
  life: number;
  maxLife: number;
}

export class FloatingTextLayer extends Container {
  private readonly pool: BitmapText[] = [];
  private readonly active: ActiveText[] = [];

  spawn(x: number, y: number, value: string, color: number, scale = 1): void {
    const text = this.pool.pop() ?? this.makeText();
    text.text = value;
    text.tint = color; // recolour the white glyphs (no canvas re-render, unlike style.fill)
    text.x = x;
    text.y = y;
    text.scale.set(scale);
    text.alpha = 1;
    text.visible = true;
    this.addChild(text);
    this.active.push({ text, vy: -16, life: 700, maxLife: 700 });
  }

  update(dtMs: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const a = this.active[i];
      if (a === undefined) continue;
      a.life -= dtMs;
      a.text.y += (a.vy * dtMs) / 1000;
      a.text.alpha = Math.max(0, a.life / a.maxLife);
      if (a.life <= 0) {
        a.text.visible = false;
        this.removeChild(a.text);
        this.pool.push(a.text);
        this.active.splice(i, 1);
      }
    }
  }

  private makeText(): BitmapText {
    return new BitmapText({
      text: '',
      style: { fontFamily: 'monospace', fontSize: 9, fill: 0xffffff, fontWeight: 'bold' },
    });
  }
}
