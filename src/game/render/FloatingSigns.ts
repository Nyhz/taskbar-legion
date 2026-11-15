import { Container, Sprite, Texture } from 'pixi.js';
import { castSignTexture, loadCastSign } from './castSignTextures';

// The pixel sign that rises over a hero when it casts an ability: the ability's own picture, the same one the
// panels show. Pooled sprites, drawn at whole art pixels; numbers stay in FloatingTextLayer.

const LIFE_MS = 900;
const HOLD_MS = 380; // fully visible this long, then it fades
const RISE_PX = 5;
const SIGN_STEP_PX = 17; // a 16 px sign and a pixel of air

interface ActiveSign {
  sprite: Sprite;
  at: number; // where it was asked for (signs asked for at the same spot step aside)
  x: number;
  y: number;
  life: number;
}

export class FloatingSignLayer extends Container {
  private readonly pool: Sprite[] = [];
  private readonly active: ActiveSign[] = [];

  /** Raise the sign `stem` (an art stem of src/assets/ui) centred on (x, y). A null stem draws nothing. */
  spawn(x: number, y: number, stem: string | null): void {
    if (stem === null) return;
    const sprite = this.pool.pop() ?? this.makeSprite();
    // Two abilities cast together (or one right after the other) sit side by side, not on top of each other.
    const at = Math.round(x);
    const beside = this.active.filter((a) => a.at === at && a.life > LIFE_MS - HOLD_MS).length;
    const entry: ActiveSign = { sprite, at, x: at + beside * SIGN_STEP_PX, y: Math.round(y), life: LIFE_MS };
    const tex = castSignTexture(stem);
    sprite.texture = tex ?? Texture.EMPTY;
    if (tex === null) {
      // First cast of this ability: the sign joins its own flourish as soon as its art is in memory.
      void loadCastSign(stem).then((t) => {
        if (t !== null && this.active.includes(entry)) sprite.texture = t;
      });
    }
    sprite.alpha = 1;
    sprite.visible = true;
    sprite.position.set(entry.x, entry.y);
    this.addChild(sprite);
    this.active.push(entry);
  }

  update(dtMs: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const a = this.active[i];
      if (a === undefined) continue;
      a.life -= dtMs;
      const played = LIFE_MS - a.life;
      const k = Math.min(1, played / LIFE_MS);
      // A quick rise that eases out, on whole pixels so the art never blurs.
      a.sprite.y = a.y - Math.round(RISE_PX * (1 - (1 - k) * (1 - k)));
      a.sprite.alpha = played <= HOLD_MS ? 1 : Math.max(0, a.life / (LIFE_MS - HOLD_MS));
      if (a.life <= 0) {
        a.sprite.visible = false;
        this.removeChild(a.sprite);
        this.pool.push(a.sprite);
        this.active.splice(i, 1);
      }
    }
  }

  private makeSprite(): Sprite {
    const s = new Sprite(Texture.EMPTY);
    s.anchor.set(0.5, 1);
    return s;
  }
}
