import { Container, Graphics, Rectangle, Text } from 'pixi.js';
import { hexToNum } from '@/styles/palette';

// A red, swirling world-boss portal pinned to the right edge of the strip while the
// party farms a beaten W-9. Tapping it enters the W-10 world boss — which costs ONE zone
// key (one spent per attempt, even on a wipe). The portal shows held/1 keys and greys out
// when key-less. Cosmetic + an interactive affordance — GameStrip drives its key count + tap.

const RING = hexToNum('#c0473a');
const RING_HI = hexToNum('#ff7a7a');
const CORE = hexToNum('#2a0a0e');
const STONE = hexToNum('#2a1518');

const RX = 18;
const RY = 27;

export class PortalSprite extends Container {
  private readonly frame = new Graphics();
  private readonly swirl = new Graphics();
  private readonly bossText: Text;
  private readonly keyText: Text; // "🗝 held/1" — keys held vs the 1 needed to enter
  private elapsed = 0;
  private enabled = false;

  constructor() {
    super();
    this.bossText = new Text({
      text: 'BOSS',
      style: { fontFamily: 'monospace', fontSize: 10, fontWeight: '700', fill: hexToNum('#ff7a7a') },
    });
    this.bossText.anchor.set(0.5);
    this.bossText.y = -RY - 9;
    this.keyText = new Text({
      text: '🗝 0/1',
      style: { fontFamily: 'monospace', fontSize: 10, fontWeight: '700', fill: hexToNum('#e8c34c') },
    });
    this.keyText.anchor.set(0.5);
    this.keyText.y = RY + 9; // just below the vortex
    this.addChild(this.frame, this.swirl, this.bossText, this.keyText);
    // A generous, fixed hit area so the whole portal (and its labels) is reliably tappable.
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = new Rectangle(-RX - 6, -RY - 16, (RX + 6) * 2, (RY + 6) * 2 + 32);
  }

  /** Driven each frame with the zone's keys held: ≥1 → enterable (lit, the count gold);
   *  0 → greyed/inert (you must farm this zone's stage bosses for a key). One key is spent
   *  per attempt regardless, so the count is a live budget of remaining tries. */
  update(dtMs: number, keysHeld: number): void {
    this.elapsed += dtMs;
    this.enabled = keysHeld > 0;
    this.keyText.text = `🗝 ${keysHeld}/1`;
    this.keyText.style.fill = this.enabled ? hexToNum('#e8c34c') : hexToNum('#9a8f80');
    this.cursor = this.enabled ? 'pointer' : 'default';
    this.alpha = this.enabled ? 1 : 0.5;
    this.draw();
  }

  private draw(): void {
    const t = this.elapsed / 1000;
    const g = this.swirl;
    g.clear();
    g.ellipse(0, 0, RX, RY).fill({ color: CORE }); // dark vortex mouth
    // rotating concentric arcs → the swirl
    for (let i = 0; i < 3; i++) {
      const phase = t * (1.4 + i * 0.5) + i * 1.1;
      const pulse = 0.6 + 0.4 * Math.sin(t * 3 + i);
      g.ellipse(Math.cos(phase) * 2, Math.sin(phase) * 2, RX * (0.4 + i * 0.24), RY * (0.4 + i * 0.24)).stroke({
        color: i === 1 ? RING_HI : RING,
        width: 2,
        alpha: this.enabled ? 0.45 + 0.4 * pulse : 0.5,
      });
    }
    // inward-spiralling specks
    for (let i = 0; i < 6; i++) {
      const a = t * 2 + (i * Math.PI) / 3;
      const r = 4 + (i % 3) * 5 + Math.sin(t * 4 + i) * 2;
      g.circle(Math.cos(a) * r, Math.sin(a) * r * 1.35, 1.4).fill({ color: RING_HI, alpha: this.enabled ? 0.9 : 0.35 });
    }
    // stone frame ring
    const f = this.frame;
    f.clear();
    f.ellipse(0, 0, RX + 4, RY + 4).stroke({ color: STONE, width: 3 });
    f.ellipse(0, 0, RX + 4, RY + 4).stroke({ color: this.enabled ? RING : hexToNum('#5a4040'), width: 1.5 });
  }
}
