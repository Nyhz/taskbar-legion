import { Container, Graphics } from 'pixi.js';
import { hexToNum } from '@/styles/palette';

// A simple procedural strip background: layered horizontal bands (sky / distant
// silhouettes / ground) drawn with the palette. Generated once; the caller can
// scroll it via `camera`. Pixel-art discipline: flat color bands, hard edges.

const SKY = hexToNum('#1b1726');
const FAR = hexToNum('#241d33');
const MID = hexToNum('#2e2540');
const GROUND = hexToNum('#191320');
const GROUND_HI = hexToNum('#2a2030');

export function createBackdrop(width: number, height: number): Container {
  const root = new Container();
  root.label = 'backdrop';

  const sky = new Graphics().rect(0, 0, width, height).fill({ color: SKY });
  root.addChild(sky);

  // Distant jagged silhouette band (towers/peaks) drawn as a run of rectangles.
  const far = new Graphics();
  const farBaseY = Math.round(height * 0.45);
  for (let x = 0; x < width; x += 14) {
    const h = 10 + ((x * 7) % 22);
    far.rect(x, farBaseY - h, 12, h);
  }
  far.fill({ color: FAR });
  root.addChild(far);

  // Nearer silhouette band.
  const mid = new Graphics();
  const midBaseY = Math.round(height * 0.62);
  for (let x = -6; x < width; x += 22) {
    const h = 16 + ((x * 13) % 28);
    mid.rect(x, midBaseY - h, 18, h);
  }
  mid.fill({ color: MID });
  root.addChild(mid);

  // Ground plane.
  const groundY = Math.round(height * 0.72);
  const ground = new Graphics()
    .rect(0, groundY, width, height - groundY)
    .fill({ color: GROUND });
  ground.rect(0, groundY, width, 3).fill({ color: GROUND_HI });
  root.addChild(ground);

  return root;
}
