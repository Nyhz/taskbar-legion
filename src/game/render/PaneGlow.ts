import { Container, Sprite, Texture } from 'pixi.js';
import { PANES, paneLight } from './bossFx';
import { panePlace, type PaneSheetMeta } from './fxData';

// The lit panes of a figure (the Unmaker's six mirrors): one sprite per pane, showing — for the frame the figure
// is on — that pane LIT, exactly over the dark one of the figure's own art (the cells are baked from the same
// drawing: render/fxData panePlace). A child of the enemy's sprite, laid over its figure and mirrored like it.

/** A pane just lit, or just burst: where its middle is, in the figure's art pixels from its root on the ground
 *  (facing right). */
export interface PaneBeat {
  kind: 'lit' | 'broke';
  x: number;
  y: number;
}

export class PaneGlow extends Container {
  private readonly sprites: Sprite[] = [];
  private readonly sinceMs: number[] = []; // per place in the lighting order: how long it has been lit
  private readonly middles: ({ x: number; y: number } | null)[] = [];
  private lit = 0;
  private clockMs = 0;

  constructor(private readonly meta: PaneSheetMeta, private readonly cells: readonly Texture[]) {
    super();
    for (let k = 0; k < PANES.order.length; k++) {
      const sprite = new Sprite(Texture.EMPTY);
      sprite.visible = false;
      this.sprites.push(sprite);
      this.sinceMs.push(0);
      this.middles.push(null);
      this.addChild(sprite);
    }
  }

  /** Show `lit` panes on frame `frame` of `clip`; `breaking`: they flicker (the boss is winding their breaking
   *  up). `live` false (a corpse) puts them out without a sound. Returns what just happened, for the bursts. */
  sync(clip: string, frame: number, lit: number, breaking: boolean, live: boolean, dtMs: number): PaneBeat[] {
    this.clockMs += dtMs;
    const beats: PaneBeat[] = [];
    const now = live ? lit : 0;
    if (now < this.lit) {
      // They went out: burst, if it was the boss that broke them (it still stands).
      for (let k = now; k < this.lit; k++) {
        const at = this.middles[k];
        if (live && at !== null && at !== undefined) beats.push({ kind: 'broke', ...at });
      }
    }
    for (let k = 0; k < this.sprites.length; k++) {
      const sprite = this.sprites[k];
      if (sprite === undefined) continue;
      const on = k < now;
      const was = k < this.lit;
      this.sinceMs[k] = on ? (was ? (this.sinceMs[k] ?? 0) + dtMs : 0) : 0;
      const placed = on ? panePlace(this.meta, clip, frame, PANES.order[k] ?? 0) : undefined;
      const cell = placed === undefined ? undefined : this.cells[placed.cell];
      if (placed === undefined || cell === undefined) {
        sprite.visible = false;
        if (!on) this.middles[k] = null;
        continue;
      }
      sprite.texture = cell;
      sprite.position.set(placed.at[0], placed.at[1]);
      sprite.alpha = paneLight(this.sinceMs[k] ?? 0, this.clockMs, breaking);
      sprite.visible = true;
      this.middles[k] = { x: placed.at[2], y: placed.at[3] };
      if (!was) beats.push({ kind: 'lit', x: placed.at[2], y: placed.at[3] });
    }
    this.lit = now;
    return beats;
  }
}
