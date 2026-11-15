import { ColorMatrixFilter, Container, Sprite, Texture } from 'pixi.js';
import { ClipPlayer } from './figureClip';
import type { FigureSheet } from './figureTextures';

// A figure on the strip: one sprite showing the frame its ClipPlayer is on. Drawn 1 art pixel = 1 strip pixel
// (never scaled), with the atlas cell's `root` column and `ground` row at this container's origin — so a body
// placed at (x, pathY) stands on the path. `facing` −1 mirrors it (the art faces right; foes face the heroes).

/** White added to every channel at the peak of a hit flash (0–1). */
const FLASH_ADD = 0.3;

/** A rim of light breathes: its opacity swings between these, once every RIM_PULSE_MS. */
const RIM_ALPHA: readonly [number, number] = [0.7, 1];
const RIM_PULSE_MS = 1800;

export class FigureBody extends Container {
  readonly clips: ClipPlayer;
  private readonly sprite = new Sprite();
  private shownClip = '';
  private shownFrame = -1;
  private skin: FigureSheet | null = null;
  private rim: FigureSheet | null = null;
  private rimSprite: Sprite | null = null; // made the first time the figure wears a rim (most never do)
  private rimMs = 0;
  private flashFilter: ColorMatrixFilter | null = null; // made on the first flash (most figures never need one)
  private flashK = 0;
  private whiteK = 0;

  constructor(private readonly sheet: FigureSheet, facing: 1 | -1 = 1) {
    super();
    const { meta } = sheet;
    this.clips = new ClipPlayer(meta.anims);
    this.sprite.anchor.set(meta.root / meta.w, meta.ground / meta.h);
    this.sprite.scale.set(facing, 1);
    this.addChild(this.sprite);
    this.show();
  }

  setTint(tint: number): void {
    this.sprite.tint = tint;
  }

  /** Lighten the whole figure towards white by `k` (0 = as drawn, 1 = FLASH_ADD of white added): a hit flash that
   *  shows on a black figure, where a tint — which only multiplies — does nothing. A filter, so it is only on
   *  while `k` > 0. */
  setFlash(k: number): void {
    const next = Math.max(0, Math.min(1, k));
    if (next === this.flashK) return;
    this.flashK = next;
    this.applyWhite();
  }

  /** Wash the whole figure to white by `k` (1 = a white silhouette): a hero arriving white-hot in its shaft of
   *  light (render/arrival). The same filter as the hit flash; whichever asks for more white wins. */
  setWhite(k: number): void {
    const next = Math.max(0, Math.min(1, k));
    if (next === this.whiteK) return;
    this.whiteK = next;
    this.applyWhite();
  }

  private applyWhite(): void {
    const add = Math.max(FLASH_ADD * this.flashK, this.whiteK);
    if (add <= 0) {
      this.sprite.filters = null;
      return;
    }
    if (this.flashFilter === null) {
      this.flashFilter = new ColorMatrixFilter();
      this.flashFilter.resolution = 'inherit'; // the strip's own pixel grid: no blur while the filter is on
      this.flashFilter.antialias = 'off';
    }
    this.flashFilter.matrix = [1, 0, 0, 0, add, 0, 1, 0, 0, add, 0, 0, 1, 0, add, 0, 0, 0, 1, 0];
    if (this.sprite.filters === null || this.sprite.filters === undefined || (Array.isArray(this.sprite.filters) && this.sprite.filters.length === 0)) this.sprite.filters = [this.flashFilter];
  }

  setBodyAlpha(alpha: number): void {
    this.sprite.alpha = alpha;
  }

  /** Show the figure in a skin — a sheet with the same clips and layout, repainted (render/fxTextures.heroSkin) —
   *  or in its own colours again (null). */
  setSkin(skin: FigureSheet | null): void {
    if (skin === this.skin) return;
    this.skin = skin;
    this.shownFrame = -1;
    this.show();
  }

  /** Wear a RIM — a sheet with the figure's own layout holding, frame by frame, a thin line of light round its
   *  silhouette (render/fxTextures.heroSkin) — or none (null). It is drawn behind the figure, whatever its skin,
   *  and breathes slowly; it covers nothing. */
  setRim(rim: FigureSheet | null): void {
    if (rim === this.rim) return;
    this.rim = rim;
    if (rim !== null && this.rimSprite === null) {
      this.rimSprite = new Sprite();
      this.rimSprite.anchor.copyFrom(this.sprite.anchor);
      this.rimSprite.scale.copyFrom(this.sprite.scale);
      this.addChildAt(this.rimSprite, 0);
    }
    if (this.rimSprite !== null) this.rimSprite.visible = rim !== null;
    this.rimMs = 0;
    this.shownFrame = -1;
    this.show();
  }

  /** Advance the animation; `moving` picks run over idle between actions. */
  update(dtMs: number, moving: boolean): void {
    this.clips.advance(dtMs, moving);
    this.show();
    if (this.rim !== null && this.rimSprite !== null) {
      this.rimMs = (this.rimMs + dtMs) % RIM_PULSE_MS;
      const k = 0.5 - 0.5 * Math.cos((this.rimMs / RIM_PULSE_MS) * Math.PI * 2);
      // In a few steps, not a smooth fade: pixel art breathes in beats.
      this.rimSprite.alpha = RIM_ALPHA[0] + (RIM_ALPHA[1] - RIM_ALPHA[0]) * (Math.round(k * 3) / 3);
    }
  }

  private show(): void {
    if (this.sheet.released) {
      // Its atlas was unloaded (the party is two worlds on): show nothing rather than a dead texture.
      if (this.shownFrame !== -2) {
        if (this.rimSprite !== null) this.rimSprite.texture = Texture.EMPTY;
        this.sprite.texture = Texture.EMPTY;
        this.shownFrame = -2;
      }
      return;
    }
    const { clip, frame } = this.clips;
    if (clip === this.shownClip && frame === this.shownFrame) return;
    const texture = (this.skin ?? this.sheet).clips[clip]?.[frame];
    if (texture === undefined) return;
    this.sprite.texture = texture;
    if (this.rimSprite !== null && this.rim !== null) this.rimSprite.texture = this.rim.clips[clip]?.[frame] ?? Texture.EMPTY;
    this.shownClip = clip;
    this.shownFrame = frame;
  }
}
