import { Container, Sprite } from 'pixi.js';
import { barSegments, type BarSpec } from './stripHud';
import { stripHudTexture } from './stripHudTextures';

// A bar of the strip's HUD: a casing (pipeline art) and fills stretched inside its well — life, the slice just
// lost, an absorb shield. Sprites only: nothing is tessellated per frame, and every enemy shares the same few
// textures. Positions and widths are whole art pixels.

export class LifeBar extends Container {
  private readonly casing = new Sprite();
  private readonly life = new Sprite();
  private readonly ghost = new Sprite();
  private readonly shield = new Sprite();
  // What a heal over time still has to give: the life's green, dimmed, right after it (option 2, lab v87).
  private readonly coming = new Sprite();
  private readonly overlay = new Sprite(); // notches, drawn over the fills
  private casingStem = '';
  private lifeStem = '';

  constructor(private readonly spec: BarSpec, fill: string, overlayStem?: string) {
    super();
    this.setCasing(spec.casing);
    this.setFill(fill);
    this.ghost.texture = stripHudTexture('hud_s_fill_ghost');
    this.shield.texture = stripHudTexture('hud_s_fill_shield');
    this.coming.texture = stripHudTexture('hud_s_fill_coming');
    for (const part of [this.life, this.ghost, this.shield, this.coming]) {
      part.position.set(spec.ix, spec.iy);
      part.height = spec.ih;
      part.width = 0;
    }
    this.ghost.visible = false;
    this.shield.visible = false;
    this.coming.visible = false;
    this.addChild(this.casing, this.ghost, this.coming, this.life, this.shield);
    if (overlayStem !== undefined) {
      this.overlay.texture = stripHudTexture(overlayStem);
      this.addChild(this.overlay);
    }
  }

  /** Swap the casing (a low-life beat, a respawn casing). */
  setCasing(stem: string): void {
    if (stem === this.casingStem) return;
    this.casingStem = stem;
    this.casing.texture = stripHudTexture(stem);
  }

  /** Swap what the life is filled with (art stem of a fill column). */
  setFill(stem: string): void {
    if (stem === this.lifeStem) return;
    this.lifeStem = stem;
    this.life.texture = stripHudTexture(stem);
    this.life.height = this.spec.ih;
  }

  /** Show `frac` of life, the lagging `ghost` share, a shield worth `shield` of the full life and what a heal over
   *  time still has to give (`coming`, a share of the full life). */
  set(frac: number, ghost = 0, shield = 0, coming = 0): void {
    const { ix, iw, ih } = this.spec;
    const seg = barSegments(iw, frac, ghost, shield, coming);
    this.coming.visible = seg.comingW > 0;
    if (seg.comingW > 0) {
      this.coming.x = ix + seg.life;
      this.coming.width = seg.comingW;
      this.coming.height = ih;
    }
    this.life.width = seg.life;
    this.life.height = ih;
    this.life.visible = seg.life > 0;
    this.ghost.visible = seg.ghost > 0;
    if (seg.ghost > 0) {
      this.ghost.x = ix + seg.life;
      this.ghost.width = seg.ghost;
      this.ghost.height = ih;
    }
    this.shield.visible = seg.shieldW > 0;
    if (seg.shieldW > 0) {
      this.shield.x = ix + seg.shieldX;
      this.shield.width = seg.shieldW;
      this.shield.height = ih;
    }
  }
}
