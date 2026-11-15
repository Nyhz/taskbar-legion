import { BitmapFont, BitmapText, Container } from 'pixi.js';
import { KIT_FONT_PHRASE, KIT_FONT_TEXT } from './kitFont';

// Pooled floating combat NUMBERS (a hit, a crit, a heal, a tick). Objects are recycled
// (never created per frame). Reads nothing from the sim — fed values by the driver.
//
// These are the most frequently mutated text in the game (a number on every hit). A
// canvas `Text` re-rasterises to a texture and re-uploads to the GPU whenever its string
// OR fill changes; `BitmapText` instead lays out quads from a shared, lazily-generated
// glyph atlas — no per-change canvas work. The glyphs are baked WHITE with a dark edge and
// recoloured per spawn with `tint` (which multiplies: the white takes the exact colour, the
// dark edge stays dark) rather than `style.fill`, which would fork a new font variant.
//
// The lettering is the interface kit's pixel face (render/kitFont): Jersey 10 for an ordinary
// number, Jersey 20 — twice the size — for a critical hit. A glyph atlas is baked once from
// whatever font the browser has at that moment, so numbers use a fallback until the kit's
// fonts have loaded and switch to them from then on (texts made before are thrown away). The
// two kit faces are INSTALLED once each as named bitmap fonts (white with the dark edge): a
// style with an edge would otherwise bake a font of its own for every text.
// Words are no longer raised here: a block, an invulnerable hit and a second strike are
// pixel signs on the fighter (render/abilityFx BLOW_SIGNS).

/** A number asked for at more than this scale is a BIG one (a critical hit): the larger face. */
const BIG_FROM = 1.2;
const SMALL_PX = 10;
const BIG_PX = 20;
const EDGE = 0x0b0d17; // the palette's darkest ink
const FACE = { small: 'tl-number', big: 'tl-number-big' } as const; // the installed bitmap fonts
const GLYPHS = '0123456789+-.,KMBT%';

let installed = false;
/** Bake the two number faces from the kit's fonts (once; they must be in memory). */
function installFaces(): void {
  if (installed) return;
  installed = true;
  BitmapFont.install({ name: FACE.small, style: { fontFamily: KIT_FONT_TEXT, fontSize: SMALL_PX, fill: 0xffffff, stroke: { color: EDGE, width: 2 } }, chars: GLYPHS });
  BitmapFont.install({ name: FACE.big, style: { fontFamily: KIT_FONT_PHRASE, fontSize: BIG_PX, fill: 0xffffff, stroke: { color: EDGE, width: 3 } }, chars: GLYPHS });
}

interface ActiveText {
  text: BitmapText;
  big: boolean;
  vy: number;
  life: number;
  maxLife: number;
}

export class FloatingTextLayer extends Container {
  private readonly pools: Record<'small' | 'big', BitmapText[]> = { small: [], big: [] };
  private readonly active: ActiveText[] = [];
  private kit = false; // the kit's fonts are in memory: numbers are drawn in them

  constructor() {
    super();
    if (typeof document === 'undefined' || document.fonts === undefined) return;
    void Promise.all([document.fonts.load(`${SMALL_PX}px '${KIT_FONT_TEXT}'`), document.fonts.load(`${BIG_PX}px '${KIT_FONT_PHRASE}'`)])
      .then(() => {
        installFaces();
        this.kit = true;
        // Texts made with the fallback face are not reused.
        for (const text of [...this.pools.small, ...this.pools.big]) text.destroy();
        this.pools.small.length = 0;
        this.pools.big.length = 0;
      })
      .catch(() => undefined); // the fallback stays: lettering is never worth a crash
  }

  /** Raise a number at (x, y). `scale` above BIG_FROM asks for the big face (a critical hit). */
  spawn(x: number, y: number, value: string, color: number, scale = 1): void {
    const big = scale > BIG_FROM;
    const text = this.pools[big ? 'big' : 'small'].pop() ?? this.makeText(big);
    text.text = value;
    text.tint = color; // recolour the white glyphs (no canvas re-render, unlike style.fill)
    text.x = Math.round(x);
    text.y = Math.round(y);
    text.alpha = 1;
    text.visible = true;
    this.addChild(text);
    this.active.push({ text, big, vy: -16, life: 700, maxLife: 700 });
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
        // A text made before the kit's fonts loaded is in the fallback face: it is not kept.
        if (a.text.style.fontFamily === this.family(a.big)) this.pools[a.big ? 'big' : 'small'].push(a.text);
        else a.text.destroy();
        this.active.splice(i, 1);
      }
    }
  }

  private family(big: boolean): string {
    return this.kit ? (big ? FACE.big : FACE.small) : 'monospace';
  }

  private makeText(big: boolean): BitmapText {
    // The fallback (before the kit's fonts are in memory) is the browser's monospace, plain: one shared font.
    const px = big ? BIG_PX : SMALL_PX;
    return new BitmapText({ text: '', style: this.kit ? { fontFamily: this.family(big), fontSize: px } : { fontFamily: 'monospace', fontSize: px + 2, fill: 0xffffff, fontWeight: 'bold' } });
  }
}
