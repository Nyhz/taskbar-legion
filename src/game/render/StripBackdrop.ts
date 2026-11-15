import { Container, Graphics, Sprite, type Texture } from 'pixi.js';
import { difficultyOf, worldInDifficulty } from '@/data/difficulties';
import { StripAtmosphere } from './StripAtmosphere';
import { loadBackdropLayers, trimBackdropCache } from './stripBackdropTextures';
import {
  STRIP_ART_HEIGHT,
  STRIP_ART_WIDTH,
  backdropGradeFor,
  backdropKeyFor,
  backdropWorld,
  layerOffset,
  type BackdropLayer,
} from './stripBackdropData';

// The battle strip's backdrop: the art of the world the party is in — seven parallax layers that wrap sideways
// and scroll by their own factor as the party advances (the ground at 1, the sky at 0, the foreground past 1;
// clouds and mist also drift) — and that world's atmosphere. It moves exactly like the lab page's strip.
//
// It is TWO containers, because the fighters stand in the middle of it:
//   `back`  → sky · bolts · every other layer but the foreground · flashes, far particles, eyes
//   (the game draws its ground effects and fighters here)
//   `front` → near particles · the foreground layer · pulse and flicker
// The art is 600×160 with the path the fighters stand on at STRIP_PATH_Y; the strip is exactly that size.

const FALLBACK = 0x151a2b; // the palette's night ink, shown for the instant before the first sheet arrives

interface Tile {
  layer: BackdropLayer;
  a: Sprite;
  b: Sprite;
}

export class StripBackdrop {
  readonly back = new Container();
  readonly front = new Container();

  private readonly fallback = new Graphics().rect(0, 0, STRIP_ART_WIDTH, STRIP_ART_HEIGHT).fill({ color: FALLBACK });
  private readonly skyHolder = new Container();
  private readonly midHolder = new Container();
  private readonly foreHolder = new Container();
  private readonly atmosphere = new StripAtmosphere();
  private tiles: Tile[] = [];
  private wanted = ''; // "<key>_<grade>" the party's world asks for
  private clock = 0;

  constructor() {
    this.back.addChild(this.fallback, this.skyHolder, this.atmosphere.sky, this.midHolder, this.atmosphere.back);
    this.front.addChild(this.atmosphere.front, this.foreHolder, this.atmosphere.over);
  }

  /** `scrollPx`: how far the ground has scrolled, in strip pixels (the camera's x). */
  update(scrollPx: number, globalStage: number, dtMs: number): void {
    const key = backdropKeyFor(worldInDifficulty(globalStage));
    const grade = backdropGradeFor(difficultyOf(globalStage).key);
    const id = `${key}_${grade}`;
    if (id !== this.wanted) {
      this.wanted = id;
      void this.load(id, key, grade);
    }
    this.clock += Math.min(100, Math.max(0, dtMs));
    for (const t of this.tiles) {
      const off = layerOffset(t.layer, scrollPx, this.clock);
      t.a.x = -off;
      t.b.x = STRIP_ART_WIDTH - off;
    }
    this.atmosphere.update(dtMs);
  }

  /** Horizontal tremor of the strip right now (lightning), in strip pixels. */
  get shakeX(): number {
    return this.atmosphere.shakeX;
  }

  // The previous world stays on screen until the new one's sheet is ready, then they swap at once.
  private async load(id: string, key: string, grade: 'normal' | 'torment'): Promise<void> {
    const world = backdropWorld(key);
    if (world === undefined) return;
    try {
      const textures = await loadBackdropLayers(key, grade, world.layers.length);
      if (this.wanted !== id) return; // the party moved on while it loaded
      this.show(world.layers, textures);
      this.atmosphere.set(world.atmosphere[grade] ?? []);
      trimBackdropCache(id);
    } catch (err) {
      console.error(`Backdrop ${id} failed to load`, err);
    }
  }

  private show(layers: readonly BackdropLayer[], textures: readonly Texture[]): void {
    for (const holder of [this.skyHolder, this.midHolder, this.foreHolder]) {
      holder.removeChildren().forEach((child) => child.destroy());
    }
    this.tiles = [];
    layers.forEach((layer, i) => {
      const texture = textures[i];
      if (texture === undefined) return;
      const a = new Sprite(texture);
      const b = new Sprite(texture);
      const holder = layer.name === 'fore' ? this.foreHolder : i === 0 ? this.skyHolder : this.midHolder;
      holder.addChild(a, b);
      this.tiles.push({ layer, a, b });
    });
    this.fallback.visible = false;
  }
}
