import { Container, Text } from 'pixi.js';

// Pooled floating combat text (damage numbers, crit pops). Objects are recycled
// (never created per frame). Reads nothing from the sim — fed values by the driver.

interface ActiveText {
  text: Text;
  vy: number;
  life: number;
  maxLife: number;
}

export class FloatingTextLayer extends Container {
  private readonly pool: Text[] = [];
  private readonly active: ActiveText[] = [];

  spawn(x: number, y: number, value: string, color: number, scale = 1): void {
    const text = this.pool.pop() ?? this.makeText();
    text.text = value;
    text.style.fill = color;
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

  private makeText(): Text {
    return new Text({
      text: '',
      style: { fontFamily: 'monospace', fontSize: 9, fill: 0xffffff, fontWeight: 'bold' },
    });
  }
}
