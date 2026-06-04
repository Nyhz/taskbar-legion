// One-shot generator for the desktop app icon: the Knight idle sprite standing on a
// miniature of the GameStrip backdrop (sky gradient → horizon → grass), framed with the
// pixel-window ink border. Outputs a 1024² PNG; feed it to `npx tauri icon` to expand
// into every platform size. Pure pngjs (nearest-neighbour) so the pixel art stays crisp.
//
//   node scripts/gen-icon.mjs && npx tauri icon src-tauri/app-icon.png

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { PNG } from 'pngjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIZE = 1024;

// Palette pulled from StageBackground.ts / palette.ts so the icon matches the strip.
const SKY_STOPS = [
  [0.0, 53, 122, 171],
  [0.45, 112, 119, 177],
  [0.62, 176, 150, 140],
];
const GLOW = [214, 170, 150];
const SEA = [86, 94, 139];
const GRASS_EDGE = [158, 151, 41];
const GRASS_BODY = [84, 115, 45];
const INK = [13, 11, 18];

const SKY_BOTTOM = 700;
const GLOW_BOTTOM = 706;
const SEA_BOTTOM = 742;
const GRASS_EDGE_BOTTOM = 756;
const BORDER = 10;

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function sampleSky(t) {
  let lo = SKY_STOPS[0];
  let hi = SKY_STOPS[SKY_STOPS.length - 1];
  for (let i = 0; i < SKY_STOPS.length - 1; i++) {
    if (t >= SKY_STOPS[i][0] && t <= SKY_STOPS[i + 1][0]) {
      lo = SKY_STOPS[i];
      hi = SKY_STOPS[i + 1];
      break;
    }
  }
  const span = hi[0] - lo[0] || 1;
  const k = Math.min(1, Math.max(0, (t - lo[0]) / span));
  return [lerp(lo[1], hi[1], k), lerp(lo[2], hi[2], k), lerp(lo[3], hi[3], k)];
}

function rowColor(y) {
  if (y < SKY_BOTTOM) return sampleSky(y / SKY_BOTTOM);
  if (y < GLOW_BOTTOM) return GLOW;
  if (y < SEA_BOTTOM) return SEA;
  if (y < GRASS_EDGE_BOTTOM) return GRASS_EDGE;
  return GRASS_BODY;
}

const out = new PNG({ width: SIZE, height: SIZE });
function set(x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  // alpha-composite over whatever is already there
  const ia = a / 255;
  out.data[i] = lerp(out.data[i], r, ia);
  out.data[i + 1] = lerp(out.data[i + 1], g, ia);
  out.data[i + 2] = lerp(out.data[i + 2], b, ia);
  out.data[i + 3] = 255;
}

// 1) Background.
for (let y = 0; y < SIZE; y++) {
  const [r, g, b] = rowColor(y);
  for (let x = 0; x < SIZE; x++) set(x, y, r, g, b);
}

// 2) Knight idle frame 0 (first 100×100 cell of the 600×100 sheet). Crop to the
//    character's tight bounding box, then nearest-neighbour scale it to fill most of
//    the icon, centred.
const sheet = PNG.sync.read(readFileSync(resolve(root, 'src/assets/characters/knight/actions/knight-idle.png')));
const FRAME = 100;
const ALPHA = 16;
let minX = FRAME, minY = FRAME, maxX = -1, maxY = -1;
for (let sy = 0; sy < FRAME; sy++) {
  for (let sx = 0; sx < FRAME; sx++) {
    if (sheet.data[(sy * sheet.width + sx) * 4 + 3] < ALPHA) continue;
    if (sx < minX) minX = sx;
    if (sx > maxX) maxX = sx;
    if (sy < minY) minY = sy;
    if (sy > maxY) maxY = sy;
  }
}
const bw = maxX - minX + 1;
const bh = maxY - minY + 1;
const TARGET = SIZE * 0.78; // knight fills ~78% of the icon
const scale = TARGET / Math.max(bw, bh);
const dw = Math.round(bw * scale);
const dh = Math.round(bh * scale);
const dx0 = Math.round((SIZE - dw) / 2);
const dy0 = Math.round((SIZE - dh) / 2);
for (let dy = 0; dy < dh; dy++) {
  for (let dx = 0; dx < dw; dx++) {
    const sx = minX + Math.min(bw - 1, Math.floor(dx / scale));
    const sy = minY + Math.min(bh - 1, Math.floor(dy / scale));
    const si = (sy * sheet.width + sx) * 4;
    const a = sheet.data[si + 3];
    if (a < ALPHA) continue;
    set(dx0 + dx, dy0 + dy, sheet.data[si], sheet.data[si + 1], sheet.data[si + 2], a);
  }
}

// 3) Ink border to match the pixel-window chrome.
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    if (x < BORDER || y < BORDER || x >= SIZE - BORDER || y >= SIZE - BORDER) set(x, y, INK[0], INK[1], INK[2]);
  }
}

writeFileSync(resolve(root, 'src-tauri/app-icon.png'), PNG.sync.write(out));
console.log('Wrote src-tauri/app-icon.png');
