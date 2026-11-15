import { Assets, Container, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import { hexToNum } from '@/styles/palette';
import bossSignUrl from '@/assets/ui/hud_boss.png?url';
import keySignUrl from '@/assets/ui/hud_key.png?url';
import { KIT_FONT_TEXT, applyKitFont } from './kitFont';
import { fxLoop, type FxLoop } from './BodyFx';
import { PORTAL_FX, PORTAL_SIGNS_UP, portalHitBox, portalState, type PortalState } from './portalLook';

// The world boss's GATE, standing on the path near the right edge of the strip while the party farms a beaten
// W-9 (render/portalLook says what it shows; the art is the pipeline's — fx/flow.py). Tapping it enters the W-10
// world boss, which costs ONE zone key (one spent per attempt, even on a wipe): without a key the gate is chained
// shut; with one it is awake, and wider awake under the pointer. Over it, signs — not words: the boss sign, the
// key and how many are held of the one needed. This container's origin is the middle of the gate's base, on the
// ground line. GameStrip drives its key count and its tap.

const STONE = hexToNum('#151a2b');

export class PortalSprite extends Container {
  private readonly gate = new Container();
  private readonly loops = new Map<PortalState, FxLoop>();
  private readonly bossSign = new Sprite(Texture.EMPTY);
  private readonly keySign = new Sprite(Texture.EMPTY);
  private readonly keyText: Text; // "held/1" — keys held vs the 1 needed to enter
  private state: PortalState = 'shut';
  private pointerOver = false;
  private pressed = false;

  constructor() {
    super();
    // One row over the gate: boss · key · count.
    this.bossSign.anchor.set(0.5);
    this.bossSign.position.set(-17, -PORTAL_SIGNS_UP);
    this.keySign.anchor.set(0.5);
    this.keySign.position.set(-2, -PORTAL_SIGNS_UP);
    this.keyText = new Text({ text: '0/1', style: { fontFamily: 'monospace', fontSize: 10, fill: hexToNum('#f8dc84'), stroke: { color: STONE, width: 2, join: 'miter' } } });
    this.keyText.anchor.set(0, 0.5);
    this.keyText.position.set(7, -PORTAL_SIGNS_UP);
    applyKitFont(this.keyText, KIT_FONT_TEXT, 10);
    void this.loadSigns();
    this.addChild(this.gate, this.bossSign, this.keySign, this.keyText);
    // The whole gate and its signs are the tap target (the strip's canvas is one surface for the desktop overlay's
    // click-through; inside it Pixi hit-tests only this object).
    this.eventMode = 'static';
    this.cursor = 'pointer';
    const box = portalHitBox();
    this.hitArea = new Rectangle(box.x, box.y, box.width, box.height);
    this.on('pointerover', () => { this.pointerOver = true; });
    this.on('pointerout', () => { this.pointerOver = false; this.pressed = false; });
    this.on('pointerdown', () => { this.pressed = true; });
    this.on('pointerup', () => { this.pressed = false; });
    this.on('pointerupoutside', () => { this.pressed = false; });
  }

  /** Driven each frame with the zone's keys held: ≥1 → enterable (awake, the count gold); 0 → chained shut (you
   *  must farm this zone's stage bosses for a key). One key is spent per attempt regardless, so the count is a
   *  live budget of remaining tries. */
  update(dtMs: number, keysHeld: number): void {
    const enabled = keysHeld > 0;
    const count = `${keysHeld}/1`;
    if (this.keyText.text !== count) this.keyText.text = count;
    this.keyText.tint = enabled ? 0xffffff : 0xa89c8c;
    this.keySign.alpha = enabled ? 1 : 0.6;
    this.cursor = enabled ? 'pointer' : 'default';
    this.show(portalState(keysHeld, this.pointerOver));
    for (const loop of this.loops.values()) loop.advance(dtMs);
    // Pressed, the gate sinks a pixel: it answers the hand.
    this.gate.y = this.pressed && enabled ? 1 : 0;
  }

  /** The party is gone (the gate is hidden): forget the pointer, so it does not come back "hot". */
  rest(): void {
    this.pointerOver = false;
    this.pressed = false;
  }

  // The effects' atlas loads after this object is made (GameStrip.init), so each drawing's loop is made the
  // first time it is needed.
  private show(state: PortalState): void {
    if (state !== this.state || !this.loops.has(state)) {
      if (!this.loops.has(state)) {
        const loop = fxLoop(PORTAL_FX[state]);
        if (loop !== null) {
          this.loops.set(state, loop);
          this.gate.addChild(loop.sprite);
        }
      }
      this.state = state;
    }
    for (const [key, loop] of this.loops) loop.sprite.visible = key === state;
  }

  // The signs are interface art (src/assets/ui). If one cannot be loaded the gate simply goes without it.
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
}
