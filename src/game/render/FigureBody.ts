import { Container, Sprite, Texture } from 'pixi.js';
import { ClipPlayer } from './figureClip';
import type { FigureSheet } from './figureTextures';

// A figure on the strip: one sprite showing the frame its ClipPlayer is on. Drawn 1 art pixel = 1 strip pixel
// (never scaled), with the atlas cell's `root` column and `ground` row at this container's origin — so a body
// placed at (x, pathY) stands on the path. `facing` −1 mirrors it (the art faces right; foes face the heroes).

export class FigureBody extends Container {
  readonly clips: ClipPlayer;
  private readonly sprite = new Sprite();
  private shownClip = '';
  private shownFrame = -1;

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

  setBodyAlpha(alpha: number): void {
    this.sprite.alpha = alpha;
  }

  /** Advance the animation; `moving` picks run over idle between actions. */
  update(dtMs: number, moving: boolean): void {
    this.clips.advance(dtMs, moving);
    this.show();
  }

  private show(): void {
    if (this.sheet.released) {
      // Its atlas was unloaded (the party is two worlds on): show nothing rather than a dead texture.
      if (this.shownFrame !== -2) {
        this.sprite.texture = Texture.EMPTY;
        this.shownFrame = -2;
      }
      return;
    }
    const { clip, frame } = this.clips;
    if (clip === this.shownClip && frame === this.shownFrame) return;
    const texture = this.sheet.clips[clip]?.[frame];
    if (texture === undefined) return;
    this.sprite.texture = texture;
    this.shownClip = clip;
    this.shownFrame = frame;
  }
}
