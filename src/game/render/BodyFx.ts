import { Container, Sprite, type Texture } from 'pixi.js';
import { UNDER_SLOTS, lookFx, lookUp, tileCount, wornLooks, type Bearer, type FxSlot, type LastingLook, type WornEffect } from './abilityFx';
import { fxFrameAt, fxMeta, type FxMeta } from './fxData';
import { fxFrames } from './fxTextures';

// The ability effects ON a fighter (render/abilityFx says which): the lasting looks its effects give it, one per
// slot, and the one-shots that open and close them or land on it. Two containers — `under` goes behind the
// figure, `over` in front — that the sprite adds around its body. Art is drawn 1:1, placed on whole pixels.

/** One effect being played: a sprite stepping through the effect's frames by its own per-frame times. */
class FxPart {
  readonly sprite = new Sprite();
  private shown = -2;
  constructor(private readonly frames: Texture[], readonly meta: FxMeta, public elapsed = 0) {
    this.sprite.anchor.set(meta.ax / meta.w, meta.ay / meta.h);
    this.show();
  }

  /** Advance; false once a one-shot has played out. */
  advance(dtMs: number): boolean {
    this.elapsed += dtMs;
    return this.show();
  }

  private show(): boolean {
    const frame = fxFrameAt(this.meta, this.elapsed);
    if (frame < 0) return false;
    if (frame !== this.shown) {
      const texture = this.frames[frame];
      if (texture !== undefined) this.sprite.texture = texture;
      this.shown = frame;
    }
    return true;
  }
}

function part(fx: string, elapsed = 0): FxPart | null {
  const frames = fxFrames(fx);
  const meta = fxMeta(fx);
  return frames === null || meta === undefined ? null : new FxPart(frames, meta, elapsed);
}

/** A looping effect that belongs to no ability (an elite's ghost-fire, its crest): the caller places its sprite
 *  and advances it. `lagMs` starts it that far into its loop, so copies side by side do not move as one. */
export interface FxLoop {
  readonly sprite: Sprite;
  advance(dtMs: number): boolean;
}

export function fxLoop(fx: string, lagMs = 0): FxLoop | null {
  return part(fx, lagMs);
}

/** One-shot effects in a layer: play them at a point, advance them, drop them when they end. */
export class FxShots extends Container {
  private readonly playing: FxPart[] = [];

  /** Play `fx` with its attach point at (x, y); `facing` −1 mirrors it. `alpha` for a translucent one. */
  play(fx: string, x: number, y: number, facing: 1 | -1 = 1, alpha = 1): void {
    const p = part(fx);
    if (p === null) return;
    p.sprite.position.set(Math.round(x), Math.round(y));
    p.sprite.scale.set(facing, 1);
    p.sprite.alpha = alpha;
    this.playing.push(p);
    this.addChild(p.sprite);
  }

  update(dtMs: number): void {
    for (let i = this.playing.length - 1; i >= 0; i--) {
      const p = this.playing[i];
      if (p === undefined || p.advance(dtMs)) continue;
      this.playing.splice(i, 1);
      p.sprite.destroy();
    }
  }
}

/** Where a fighter's body is inside its sprite (container-local art pixels). */
export interface BodyBox {
  /** The body's horizontal centre and the ground line under it. */
  cx: number;
  feetY: number;
  /** The standing figure's height and half its width. */
  height: number;
  halfW: number;
  /** 1 faces right (heroes), −1 left (enemies): "ahead" follows it. */
  facing: 1 | -1;
}

interface Worn {
  id: string; // effect key + effect: a change means another look took the slot
  slot: FxSlot;
  look: LastingLook;
  parts: FxPart[];
}

// A tall body repeats a tiled look every this many pixels of its height.
const TILE_ROW_HEIGHT = 55;
// A mark over the head sits this far above the top of the figure (clear of the life bar).
const OVERHEAD_GAP = 12;

export class BodyFx {
  readonly under = new Container();
  readonly over = new Container();
  private readonly underShots = new FxShots();
  private readonly overShots = new FxShots();
  private readonly worn = new Map<FxSlot, Worn>();
  private wornRim: { id: string; look: LastingLook } | null = null;

  constructor(private readonly box: BodyBox) {
    this.under.addChild(this.underShots);
    this.over.addChild(this.overShots);
  }

  /** A one-shot on this body: `dx` ahead of its centre, `dy` from the ground line (negative = up). */
  burst(fx: string, layer: 'under' | 'over', dx = 0, dy = 0): void {
    const { cx, feetY, facing } = this.box;
    (layer === 'under' ? this.underShots : this.overShots).play(fx, cx + dx * facing, feetY + dy, facing);
  }

  /** A one-shot centred on the middle of the body (a hit landing on it). */
  burstOnBody(fx: string): void {
    const meta = fxMeta(fx);
    if (meta === undefined) return;
    // The effect's attach point is its own centre: put it on the body's.
    this.overShots.play(fx, this.box.cx, this.box.feetY - Math.round(this.box.height / 2), this.box.facing);
  }

  /**
   * Show the lasting looks of the effects on this fighter and advance everything. `live` false (fallen, mid
   * teleport) takes the looks off without their closing one-shots. Returns the skin the figure should wear.
   */
  sync(effects: readonly WornEffect[], bearer: Bearer, dtMs: number, live: boolean): string | null {
    const want = live ? wornLooks(effects, bearer) : { slots: new Map<FxSlot, never>(), skin: null, rim: null };
    this.syncRim(effects, want.rim === null ? null : { id: `${want.rim.effectKey}/${want.rim.look.rim ?? ''}`, look: want.rim.look }, live);
    for (const [slot, held] of [...this.worn]) {
      const next = want.slots.get(slot);
      if (next !== undefined && `${next.effectKey}/${next.look.fx ?? ''}` === held.id) continue;
      for (const p of held.parts) p.sprite.destroy();
      this.worn.delete(slot);
      // Its effect is over (not merely outranked): the look closes.
      const over = !effects.some((e) => `${e.defKey}/${held.look.fx ?? ''}` === held.id);
      if (live && over && held.look.end !== undefined) this.burst(held.look.end, 'over', held.look.dx ?? 0, this.rise(held.slot, held.look));
    }
    for (const [slot, next] of want.slots) {
      if (this.worn.has(slot)) continue;
      const parts = this.place(slot, next.look);
      this.worn.set(slot, { id: `${next.effectKey}/${next.look.fx ?? ''}`, slot, look: next.look, parts });
      if (next.look.start !== undefined) this.burst(next.look.start, 'over', next.look.dx ?? 0, this.rise(slot, next.look));
    }
    for (const held of this.worn.values()) for (const p of held.parts) p.advance(dtMs);
    this.underShots.update(dtMs);
    this.overShots.update(dtMs);
    return want.skin;
  }

  /** The rim of light the figure should wear (a rim sheet's name — render/fxTextures.heroSkin), or null. */
  get rim(): string | null {
    return this.wornRim?.look.rim ?? null;
  }

  /** The rim comes and goes like a slot's look: its opening one-shot when it appears, its closing one when its
   *  effect is over (not when it is merely outranked, nor when the fighter is not `live`). */
  private syncRim(effects: readonly WornEffect[], next: { id: string; look: LastingLook } | null, live: boolean): void {
    const held = this.wornRim;
    if (held?.id === next?.id) return;
    if (held !== null) {
      const over = !effects.some((e) => `${e.defKey}/${held.look.rim ?? ''}` === held.id);
      if (live && over && held.look.end !== undefined) this.burst(held.look.end, 'over');
    }
    this.wornRim = next;
    if (next?.look.start !== undefined) this.burst(next.look.start, 'over');
  }

  /** How far above the ground line a look sits on this body (negative = up), from its `up` share of the height. */
  private rise(slot: FxSlot, look: LastingLook): number {
    return -Math.round(this.box.height * lookUp(slot, look));
  }

  private place(slot: FxSlot, look: LastingLook): FxPart[] {
    const fx = lookFx(look, this.box.height);
    const meta = fx === undefined ? undefined : fxMeta(fx);
    if (fx === undefined || meta === undefined) return [];
    const { cx, feetY, height, halfW, facing } = this.box;
    const layer = UNDER_SLOTS.has(slot) ? this.under : this.over;
    const spots: { x: number; y: number; lag: number }[] = [];
    if (slot === 'overhead') {
      spots.push({ x: cx, y: feetY - height - OVERHEAD_GAP, lag: 0 });
    } else if (look.tile === true) {
      const cols = tileCount(halfW * 2, meta.w);
      const rows = slot === 'body' ? Math.max(1, Math.round(height / TILE_ROW_HEIGHT)) : 1;
      const step = (halfW * 2) / cols;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Each copy runs a little behind the last, so a row of them does not move as one.
          spots.push({ x: cx - halfW + step * (c + 0.5), y: feetY - r * (height / rows), lag: (c * 3 + r * 5) * 90 });
        }
      }
    } else {
      spots.push({ x: cx + (look.dx ?? 0) * facing, y: feetY + this.rise(slot, look), lag: 0 });
    }
    const parts: FxPart[] = [];
    for (const spot of spots) {
      const p = part(fx, spot.lag);
      if (p === null) continue;
      p.sprite.position.set(Math.round(spot.x), Math.round(spot.y));
      p.sprite.scale.set(facing, 1);
      p.sprite.alpha = look.alpha ?? 1;
      layer.addChildAt(p.sprite, 0); // under this layer's one-shots
      parts.push(p);
    }
    return parts;
  }
}
