import { Container, Sprite, type Texture } from 'pixi.js';
import { fxFrameAt, fxMeta, type FxMeta } from './fxData';
import { fxFrames } from './fxTextures';
import { markFrame } from './enemyFx';

// The two things an enemy's AREA BLOW puts on the ground that are neither a one-shot nor worn by a body
// (render/enemyFx says which): the WARNING — tiles of the ground splitting, laid afresh every frame for as long as
// the blow is wound up — and a FRONT, one effect that runs along the ground through the party. Art is drawn going
// right; both are mirrored here because a foe's blow runs left. Cosmetic: reads nothing from the sim.

interface Tile {
  sprite: Sprite;
  fx: string;
  frames: Texture[];
  meta: FxMeta;
  used: boolean;
}

interface Front {
  sprite: Sprite;
  frames: Texture[];
  meta: FxMeta;
  x: number;
  toX: number;
  speed: number; // px per ms, towards the left
  t: number;
  nextTrailX: number;
  trailEvery: number;
  onTrail: (x: number) => void;
}

function place(sprite: Sprite, meta: FxMeta): void {
  sprite.anchor.set(meta.ax / meta.w, meta.ay / meta.h);
  sprite.scale.set(-1, 1); // mirrored: it comes from the foe's side
}

export class BlowFxLayer extends Container {
  private readonly tiles: Tile[] = [];
  private readonly fronts: Front[] = [];
  private elapsed = 0;

  /** Lay `count` warning tiles on the ground line `y`, the first at `fromX` and each `step` pixels further left;
   *  the tiles from `hotFrom` on (counted from the foe) show the hot drawing. Call every frame the blow is wound
   *  up: tiles not asked for in a frame are taken away by `update`. */
  warn(fx: string, hot: string, fromX: number, y: number, step: number, count: number, hotCount: number): void {
    for (let i = 0; i < count; i++) {
      const key = i < hotCount ? hot : fx;
      const tile = this.tile(key);
      if (tile === null) continue;
      tile.used = true;
      tile.sprite.visible = true;
      tile.sprite.position.set(Math.round(fromX - i * step), Math.round(y));
      // Each tile runs a little out of step with its neighbour, so the seam flickers along its length.
      const frame = Math.max(0, fxFrameAt(tile.meta, this.elapsed + i * 130));
      const texture = tile.frames[frame];
      if (texture !== undefined) tile.sprite.texture = texture;
    }
  }

  /** Show the mark `fx` with its attach point at (x, y), on the frame that `progress` (0…1) of the cast calls for
   *  (render/enemyFx markFrame). Call every frame the blow is wound up, like `warn`. */
  mark(fx: string, x: number, y: number, progress: number): void {
    const tile = this.tile(fx);
    if (tile === null) return;
    tile.used = true;
    tile.sprite.visible = true;
    tile.sprite.position.set(Math.round(x), Math.round(y));
    const texture = tile.frames[markFrame(progress, tile.frames.length)];
    if (texture !== undefined) tile.sprite.texture = texture;
  }

  /** Send a front running left along the ground from `fromX` to `toX` at `speed` px/ms; `onTrail(x)` is called
   *  every `trailEvery` pixels it covers (what it leaves behind). */
  run(fx: string, fromX: number, toX: number, y: number, speed: number, trailEvery: number, onTrail: (x: number) => void): void {
    const frames = fxFrames(fx);
    const meta = fxMeta(fx);
    if (frames === null || meta === undefined) return;
    const sprite = new Sprite(frames[0]);
    place(sprite, meta);
    sprite.position.set(Math.round(fromX), Math.round(y));
    this.addChild(sprite);
    this.fronts.push({ sprite, frames, meta, x: fromX, toX, speed, t: 0, nextTrailX: fromX - trailEvery, trailEvery, onTrail });
  }

  update(dtMs: number): void {
    this.elapsed += dtMs;
    for (const tile of this.tiles) {
      if (!tile.used) tile.sprite.visible = false;
      tile.used = false;
    }
    for (let i = this.fronts.length - 1; i >= 0; i--) {
      const f = this.fronts[i];
      if (f === undefined) continue;
      f.t += dtMs;
      f.x -= f.speed * dtMs;
      while (f.x <= f.nextTrailX) {
        f.onTrail(f.nextTrailX);
        f.nextTrailX -= f.trailEvery;
      }
      const texture = f.frames[Math.max(0, fxFrameAt(f.meta, f.t))];
      if (texture !== undefined) f.sprite.texture = texture;
      f.sprite.x = Math.round(f.x);
      // It thins out over its last stretch instead of stopping dead.
      const left = f.x - f.toX;
      f.sprite.alpha = left < 18 ? Math.max(0, left / 18) : 1;
      if (f.x <= f.toX) {
        this.fronts.splice(i, 1);
        f.sprite.destroy();
      }
    }
  }

  /** A free tile sprite of the effect `fx` (pooled per effect), or null if the effect is unknown. */
  private tile(fx: string): Tile | null {
    const free = this.tiles.find((tile) => !tile.used && tile.fx === fx);
    if (free !== undefined) return free;
    const frames = fxFrames(fx);
    const meta = fxMeta(fx);
    if (frames === null || meta === undefined) return null;
    const sprite = new Sprite(frames[0]);
    place(sprite, meta);
    sprite.visible = false;
    this.addChild(sprite);
    const tile: Tile = { sprite, fx, frames, meta, used: false };
    this.tiles.push(tile);
    return tile;
  }
}
