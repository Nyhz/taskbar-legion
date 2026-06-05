import { Container, Graphics, Sprite, TilingSprite } from 'pixi.js';
import { hexToNum } from '@/styles/palette';
import { getDuskClouds, getDuskSun } from './backgroundLayers';

// A parallax dusk backdrop with depth, built from a source wallpaper decomposed into
// layers that scroll at different speeds (closer = faster → a "walking forward"
// illusion while the party stays put on screen):
//   sky gradient (static) · sun (very slow) · clouds (slow) · sea (static) · grass (fast).
// The sun + clouds are sprites cut from the image; the sky/sea/grass are reconstructed
// from its sampled colours so they stay crisp and tile seamlessly at the strip size.
// A per-world hue overlay still recolours later worlds.

const WORLD_TINTS = [0x2a2740, 0x322a44, 0x26343a, 0x3a2a32, 0x2a3a30, 0x3a3424];

// Sky gradient stops as (fraction of height, [r,g,b]) — sampled from the source image.
const SKY_STOPS: [number, [number, number, number]][] = [
  [0.0, [53, 122, 171]],
  [0.27, [61, 121, 174]],
  [0.45, [112, 119, 177]],
  [0.49, [122, 120, 177]],
  [0.55, [150, 132, 150]],
  [0.62, [176, 150, 140]],
];
const GLOW = hexToNum('#d6aa96'); // warm horizon line
const SEA = hexToNum('#565e8b');
const GRASS_BODY = hexToNum('#54732d');
const GRASS_EDGE = hexToNum('#9e9729');

// Per-layer parallax factors (× cameraX). 0 = infinitely far / static.
const SUN_FACTOR = 0.04;
const CLOUD_FACTOR = 0.18;
const GRASS_FACTOR = 0.85;

interface TileLayer {
  container: Container;
  factor: number;
  tileW: number;
}

export class StageBackground extends Container {
  private readonly sky = new Graphics();
  private readonly sun = new Sprite();
  private clouds: TilingSprite | null = null;
  private readonly band = new Graphics(); // horizon glow + sea (static)
  private grass: TileLayer | null = null;
  private readonly overlay = new Graphics();
  private width0 = 0;
  private height0 = 0;
  private groundY = 0;
  private cloudY = 0;
  private sunBaseX = 0;
  private skyK = 1; // vertical squash of the sky/sea band (= groundFrac / 0.72); 1 = native

  // `groundFrac` is the fraction of the height where the grass line sits (default 0.72 — the
  // game's look, unchanged). A smaller value raises the horizon (less sky, more grass) and
  // the title screen passes one; the sky/sea/cloud/sun anchors all squash proportionally so
  // the scene stays coherent.
  build(width: number, height: number, groundFrac = 0.72): void {
    this.removeChildren();
    this.width0 = width;
    this.height0 = height;
    this.skyK = groundFrac / 0.72;
    this.groundY = Math.round(height * groundFrac);
    this.cloudY = Math.round(height * 0.37 * this.skyK);

    this.drawSky(width, height);
    this.addChild(this.sky);

    // Sun (very slow) — cut from the image; scaled to a small disc near the top.
    const sunTex = getDuskSun();
    if (sunTex !== null) {
      this.sun.texture = sunTex;
      const h = Math.round(height * 0.17);
      this.sun.scale.set(h / sunTex.height);
      this.sun.y = Math.round(height * 0.06 * this.skyK);
      this.sunBaseX = Math.round(width * 0.72);
      this.addChild(this.sun);
    }

    // Clouds (slow) — transparent strip tiled across the width and drifted.
    const cloudTex = getDuskClouds();
    if (cloudTex !== null) {
      this.clouds = new TilingSprite({ texture: cloudTex, width: width + 8, height: cloudTex.height });
      this.clouds.y = this.cloudY;
      this.addChild(this.clouds);
    }

    // Horizon glow + sea (static flat bands).
    this.drawBand(width);
    this.addChild(this.band);

    // Grass (fast) — two tiles of procedural turf, scrolled by the camera.
    this.grass = this.buildGrass(width, height);
    this.addChild(this.grass.container);

    this.overlay.clear().rect(0, 0, width, height).fill({ color: 0xffffff });
    this.addChild(this.overlay);
  }

  update(cameraX: number, world: number): void {
    if (this.clouds !== null) this.clouds.tilePosition.x = -cameraX * CLOUD_FACTOR;
    // Sun drifts very slowly and wraps so it cycles back rather than leaving forever.
    const span = this.width0 + this.sun.width + 40;
    const sx = ((this.sunBaseX - cameraX * SUN_FACTOR) % span + span) % span;
    this.sun.x = sx;
    if (this.grass !== null) {
      // Normalize to a POSITIVE modulo: near the world origin the camera sits left of
      // x=0 (cameraX < 0), and a raw JS modulo goes negative — shifting the turf RIGHT
      // and leaving an ungrassed gap on the left. Wrapping to [0,tileW) keeps the two
      // tiles covering the full width from the very first frame.
      const tileW = this.grass.tileW;
      const off = (((cameraX * this.grass.factor) % tileW) + tileW) % tileW;
      this.grass.container.x = -off;
    }
    const tint = WORLD_TINTS[(world - 1) % WORLD_TINTS.length] ?? WORLD_TINTS[0]!;
    this.overlay.tint = tint;
    this.overlay.alpha = 0.14;
  }

  private drawSky(width: number, height: number): void {
    this.sky.clear();
    // Divide by skyK so the gradient compresses into the (raised) horizon when groundFrac < 0.72.
    for (let y = 0; y < height; y++) {
      const [r, g, b] = sampleSky(y / height / this.skyK);
      this.sky.rect(0, y, width, 1).fill({ color: (r << 16) | (g << 8) | b });
    }
  }

  private drawBand(width: number): void {
    const seaTop = Math.round(this.height0 * 0.615 * this.skyK);
    this.band.clear();
    this.band.rect(0, seaTop - 2, width, 2).fill({ color: GLOW });
    this.band.rect(0, seaTop, width, this.groundY - seaTop).fill({ color: SEA });
  }

  private buildGrass(width: number, height: number): TileLayer {
    const tileW = width + 8;
    const container = new Container();
    for (let i = 0; i < 2; i++) {
      const g = new Graphics();
      drawGrass(g, tileW, height, this.groundY);
      g.x = i * tileW;
      container.addChild(g);
    }
    return { container, factor: GRASS_FACTOR, tileW };
  }
}

function sampleSky(t: number): [number, number, number] {
  for (let i = 0; i < SKY_STOPS.length - 1; i++) {
    const [t0, c0] = SKY_STOPS[i]!;
    const [t1, c1] = SKY_STOPS[i + 1]!;
    if (t <= t1) {
      const k = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * k),
        Math.round(c0[1] + (c1[1] - c0[1]) * k),
        Math.round(c0[2] + (c1[2] - c0[2]) * k),
      ];
    }
  }
  return SKY_STOPS[SKY_STOPS.length - 1]![1];
}

function drawGrass(g: Graphics, width: number, height: number, groundY: number): void {
  g.rect(0, groundY - 3, width, height - (groundY - 3)).fill({ color: GRASS_BODY });
  g.rect(0, groundY - 3, width, 3).fill({ color: GRASS_EDGE }); // lit top edge
  // little tufts along the edge — the fast layer sells the forward motion
  for (let x = 0; x < width; x += 8) {
    g.rect(x, groundY - 5, 2, 2).fill({ color: GRASS_EDGE });
  }
}
