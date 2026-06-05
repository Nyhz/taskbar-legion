// One-shot generator for the desktop app icon: the "Taskbar Legion" logo, cropped tight
// (its wide side margins trimmed so it reads LARGE in the square), composited over a dark
// vertical gradient with the pixel-window ink border. Outputs a 1024² PNG; feed it to
// `npx tauri icon` to expand into every platform size.
//
//   node scripts/gen-icon.mjs && npx tauri icon src-tauri/app-icon.png

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { PNG } from 'pngjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SIZE = 1024;
const BORDER = 12;
const ALPHA = 16; // alpha threshold for the logo's bounding box

// Logo placement knobs. The logo is ~2:1, so it can't fill a square without cutting letters —
// we trim the sides INTO the artwork a touch (SIDE_CROP) to make it bigger, then fill most of
// the width. Bump SIDE_CROP for a larger logo (cuts more of the outer vines/shield/letters).
const SIDE_CROP = 0.07; // fraction of the content width trimmed off EACH side
const FILL_W = 0.95; // logo spans this fraction of the icon width
const Y_BIAS = -0.02; // nudge up slightly for optical centering

const TOP = [28, 23, 40]; // gradient top (#1c1728)
const BOT = [13, 11, 18]; // gradient bottom (#0d0b12)
const INK = [13, 11, 18];

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

const out = new PNG({ width: SIZE, height: SIZE });
function set(x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  const ia = a / 255;
  out.data[i] = lerp(out.data[i], r, ia);
  out.data[i + 1] = lerp(out.data[i + 1], g, ia);
  out.data[i + 2] = lerp(out.data[i + 2], b, ia);
  out.data[i + 3] = 255;
}

// 1) Background — vertical gradient + a faint warm centre glow so the gold logo pops.
for (let y = 0; y < SIZE; y++) {
  const t = y / SIZE;
  const r = lerp(TOP[0], BOT[0], t);
  const g = lerp(TOP[1], BOT[1], t);
  const b = lerp(TOP[2], BOT[2], t);
  for (let x = 0; x < SIZE; x++) {
    const dx = (x - SIZE / 2) / SIZE;
    const dy = (y - SIZE * 0.42) / SIZE;
    const glow = Math.max(0, 1 - (dx * dx + dy * dy) * 5) * 26; // soft radial warm lift
    set(x, y, Math.min(255, r + glow), Math.min(255, g + glow * 0.8), Math.min(255, b + glow * 0.4));
  }
}

// 2) Logo — find its tight alpha bounding box, trim the sides, then bilinear-scale it to fill
//    most of the icon width and composite (preserving its own alpha for the soft edges).
const logo = PNG.sync.read(readFileSync(resolve(root, 'src/assets/logos/taskbar-legion-logo.png')));
const LW = logo.width;
const LH = logo.height;
let minX = LW, minY = LH, maxX = -1, maxY = -1;
for (let y = 0; y < LH; y++) {
  for (let x = 0; x < LW; x++) {
    if (logo.data[(y * LW + x) * 4 + 3] < ALPHA) continue;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
}
const cropX = Math.round((maxX - minX + 1) * SIDE_CROP);
const bx0 = minX + cropX;
const bw = maxX - cropX - bx0 + 1;
const bh = maxY - minY + 1;

const dw = Math.round(SIZE * FILL_W);
const dh = Math.round((dw * bh) / bw);
const dx0 = Math.round((SIZE - dw) / 2);
const dy0 = Math.round((SIZE - dh) / 2 + SIZE * Y_BIAS);

function sample(fx, fy) {
  // bilinear sample of the logo at fractional (fx,fy) in logo pixel space
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(LW - 1, x0 + 1);
  const y1 = Math.min(LH - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const px = (xx, yy) => {
    const i = (yy * LW + xx) * 4;
    return [logo.data[i], logo.data[i + 1], logo.data[i + 2], logo.data[i + 3]];
  };
  const a = px(x0, y0);
  const b = px(x1, y0);
  const c = px(x0, y1);
  const d = px(x1, y1);
  const mix = (p, q, t) => p + (q - p) * t;
  const o = [];
  for (let k = 0; k < 4; k++) o[k] = Math.round(mix(mix(a[k], b[k], tx), mix(c[k], d[k], tx), ty));
  return o;
}

for (let dy = 0; dy < dh; dy++) {
  for (let dx = 0; dx < dw; dx++) {
    const fx = bx0 + (dx / dw) * bw;
    const fy = minY + (dy / dh) * bh;
    const [r, g, b, a] = sample(fx, fy);
    if (a < ALPHA) continue;
    set(dx0 + dx, dy0 + dy, r, g, b, a);
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
