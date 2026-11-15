import { Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import { hexToNum } from '@/styles/palette';
import bossSignUrl from '@/assets/ui/hud_boss.png?url';
import keySignUrl from '@/assets/ui/hud_key.png?url';
import { KIT_FONT_TEXT, applyKitFont } from './kitFont';

// A red, swirling world-boss portal pinned to the right edge of the strip while the
// party farms a beaten W-9. Tapping it enters the W-10 world boss — which costs ONE zone
// key (one spent per attempt, even on a wipe). The portal wears the boss sign and shows the keys held
// (the key sign and held/1), and greys out when key-less. Signs, not words: nothing here needs translating. Cosmetic + an interactive affordance — GameStrip drives its key count + tap.

const RING = hexToNum('#c0473a');
const RING_HI = hexToNum('#ff7a7a');
const CORE = hexToNum('#2a0a0e');
const STONE = hexToNum('#2a1518');

const RX = 18;
const RY = 27;

export class PortalSprite extends Container {
  private readonly frame = new Graphics();
  private readonly swirl = new Graphics();
  private readonly bossSign = new Sprite(Texture.EMPTY);
  private readonly keySign = new Sprite(Texture.EMPTY);
  private readonly keyText: Text; // "held/1" — keys held vs the 1 needed to enter
  private elapsed = 0;
  private enabled = false;

  constructor() {
    super();
    this.bossSign.anchor.set(0.5);
    this.bossSign.y = -RY - 30;
    this.keySign.anchor.set(0.5);
    this.keySign.position.set(-9, -RY - 13); // the key and its count sit just above the vortex
    this.keyText = new Text({ text: '0/1', style: { fontFamily: 'monospace', fontSize: 10, fill: hexToNum('#f8dc84'), stroke: { color: STONE, width: 2, join: 'miter' } } });
    this.keyText.anchor.set(0, 0.5);
    this.keyText.position.set(1, -RY - 13);
    applyKitFont(this.keyText, KIT_FONT_TEXT, 10);
    void this.loadSigns();
    this.addChild(this.frame, this.swirl, this.bossSign, this.keySign, this.keyText);
    // A generous, fixed hit area so the whole portal (and its labels) is reliably tappable.
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.hitArea = new Rectangle(-RX - 6, -RY - 40, (RX + 6) * 2, RY * 2 + 50);
  }

  /** Driven each frame with the zone's keys held: ≥1 → enterable (lit, the count gold);
   *  0 → greyed/inert (you must farm this zone's stage bosses for a key). One key is spent
   *  per attempt regardless, so the count is a live budget of remaining tries. */
  update(dtMs: number, keysHeld: number): void {
    this.elapsed += dtMs;
    this.enabled = keysHeld > 0;
    const count = `${keysHeld}/1`;
    if (this.keyText.text !== count) this.keyText.text = count;
    this.keyText.tint = this.enabled ? 0xffffff : 0xa89c8c;
    this.cursor = this.enabled ? 'pointer' : 'default';
    this.alpha = this.enabled ? 1 : 0.5;
    this.draw();
  }

  // The two signs are interface art (src/assets/ui). If one cannot be loaded the portal simply goes without it.
  private async loadSigns(): Promise<void> {
    try {
      const [boss, key] = await Promise.all([Assets.load<Texture>(bossSignUrl), Assets.load<Texture>(keySignUrl)]);
      boss.source.scaleMode = 'nearest';
      key.source.scaleMode = 'nearest';
      if (this.destroyed) return;
      this.bossSign.texture = boss;
      this.keySign.texture = key;
    } catch {
      /* cosmetic */
    }
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
