// Banner compositor for Taskbar Legion.
// Pulls the real in-game sprite sheets + dusk sky assets, trims each sprite to
// its content bounding box, scales with nearest-neighbour, and composes a few
// README banners with a built-in 5x7 pixel font. Pure Node + pngjs — no browser.
//
//   node scripts/gen-banner.mjs
//
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const ASSETS = resolve(ROOT, 'src/assets');
const OUT = resolve(ROOT, 'docs/banners');
mkdirSync(OUT, { recursive: true });

// ----------------------------------------------------------------------------
// tiny RGBA canvas
// ----------------------------------------------------------------------------
const px = (w, h) => ({ w, h, data: new Uint8ClampedArray(w * h * 4) });

function loadPng(path) {
  const png = PNG.sync.read(readFileSync(path));
  return { w: png.width, h: png.height, data: new Uint8ClampedArray(png.data) };
}
function savePng(canvas, path) {
  const png = new PNG({ width: canvas.w, height: canvas.h });
  png.data = Buffer.from(canvas.data);
  writeFileSync(path, PNG.sync.write(png));
}

function getPx(img, x, y) {
  if (x < 0 || y < 0 || x >= img.w || y >= img.h) return [0, 0, 0, 0];
  const i = (y * img.w + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
}
function blendPx(dst, x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= dst.w || y >= dst.h || a <= 0) return;
  const i = (y * dst.w + x) * 4;
  const sa = a / 255;
  const da = dst.data[i + 3] / 255;
  const oa = sa + da * (1 - sa);
  if (oa <= 0) return;
  dst.data[i] = (r * sa + dst.data[i] * da * (1 - sa)) / oa;
  dst.data[i + 1] = (g * sa + dst.data[i + 1] * da * (1 - sa)) / oa;
  dst.data[i + 2] = (b * sa + dst.data[i + 2] * da * (1 - sa)) / oa;
  dst.data[i + 3] = oa * 255;
}
function fillRect(dst, x, y, w, h, [r, g, b, a = 255]) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) blendPx(dst, xx, yy, r, g, b, a);
}

// ----------------------------------------------------------------------------
// sprite ops: extract frame -> trim alpha -> scale -> flip
// ----------------------------------------------------------------------------
function frame(sheet, index, fw = 100, fh = 100) {
  const img = loadPng(sheet);
  const out = px(fw, fh);
  const ox = index * fw;
  for (let y = 0; y < fh; y++)
    for (let x = 0; x < fw; x++) {
      const [r, g, b, a] = getPx(img, ox + x, y);
      const i = (y * fw + x) * 4;
      out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = b; out.data[i + 3] = a;
    }
  return out;
}
function trim(img, athresh = 12) {
  let minX = img.w, minY = img.h, maxX = -1, maxY = -1;
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      if (getPx(img, x, y)[3] > athresh) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
  if (maxX < 0) return img;
  const w = maxX - minX + 1, h = maxY - minY + 1;
  const out = px(w, h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = getPx(img, minX + x, minY + y);
      const i = (y * w + x) * 4;
      out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = b; out.data[i + 3] = a;
    }
  return out;
}
function scale(img, s) {
  const out = px(img.w * s, img.h * s);
  for (let y = 0; y < out.h; y++)
    for (let x = 0; x < out.w; x++) {
      const [r, g, b, a] = getPx(img, Math.floor(x / s), Math.floor(y / s));
      const i = (y * out.w + x) * 4;
      out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = b; out.data[i + 3] = a;
    }
  return out;
}
function flipH(img) {
  const out = px(img.w, img.h);
  for (let y = 0; y < img.h; y++)
    for (let x = 0; x < img.w; x++) {
      const [r, g, b, a] = getPx(img, img.w - 1 - x, y);
      const i = (y * img.w + x) * 4;
      out.data[i] = r; out.data[i + 1] = g; out.data[i + 2] = b; out.data[i + 3] = a;
    }
  return out;
}
function paste(dst, src, x, y, alphaMul = 1) {
  for (let yy = 0; yy < src.h; yy++)
    for (let xx = 0; xx < src.w; xx++) {
      const [r, g, b, a] = getPx(src, xx, yy);
      blendPx(dst, x + xx, y + yy, r, g, b, a * alphaMul);
    }
}
// soft drop shadow on the ground: squashed dark ellipse
function groundShadow(dst, cx, baseY, rw, rh) {
  for (let y = -rh; y <= rh; y++)
    for (let x = -rw; x <= rw; x++) {
      const d = (x * x) / (rw * rw) + (y * y) / (rh * rh);
      if (d <= 1) blendPx(dst, cx + x, baseY + y, 6, 4, 10, 80 * (1 - d));
    }
}

// load a sprite ready to place: frame 0, trimmed, scaled, optional flip
function sprite(path, { idx = 0, s = 4, flip = false } = {}) {
  let img = trim(frame(path, idx));
  img = scale(img, s);
  if (flip) img = flipH(img);
  return img;
}

// ----------------------------------------------------------------------------
// 5x7 pixel font
// ----------------------------------------------------------------------------
const F = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '11001', '10101', '10011', '10011', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10011', '10011', '10101', '11001', '11001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  ':': ['00000', '00100', '00100', '00000', '00100', '00100', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '00110', '00110'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '·': ['00000', '00000', '00100', '01110', '00100', '00000', '00000'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
};
function textWidth(str, s, tracking = 1) {
  return str.length * (5 + tracking) * s - tracking * s;
}
function drawText(dst, str, x, y, s, color, { tracking = 1, shadow = null, outline = null } = {}) {
  const chars = [...str.toUpperCase()];
  let cx = x;
  for (const ch of chars) {
    const g = F[ch] ?? F[' '];
    for (let row = 0; row < 7; row++)
      for (let col = 0; col < 5; col++) {
        if (g[row][col] !== '1') continue;
        const dx = cx + col * s, dy = y + row * s;
        if (outline) {
          for (let oy = -s; oy <= s; oy += s) for (let ox = -s; ox <= s; ox += s)
            fillRect(dst, dx + ox, dy + oy, s, s, outline);
        } else if (shadow) {
          fillRect(dst, dx + shadow.dx, dy + shadow.dy, s, s, shadow.color);
        }
      }
    cx += (5 + tracking) * s;
  }
  // second pass: fill the glyph on top of outline/shadow
  cx = x;
  for (const ch of chars) {
    const g = F[ch] ?? F[' '];
    for (let row = 0; row < 7; row++)
      for (let col = 0; col < 5; col++) {
        if (g[row][col] !== '1') continue;
        fillRect(dst, cx + col * s, y + row * s, s, s, color);
      }
    cx += (5 + tracking) * s;
  }
}
function drawTextCentered(dst, str, cx, y, s, color, opts = {}) {
  drawText(dst, str, Math.round(cx - textWidth(str, s, opts.tracking ?? 1) / 2), y, s, color, opts);
}

// ----------------------------------------------------------------------------
// backgrounds
// ----------------------------------------------------------------------------
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];
function lerp(a, b, t) { return a + (b - a) * t; }
function vGradient(dst, stops) {
  // stops: [{at:0..1, c:[r,g,b]}]
  for (let y = 0; y < dst.h; y++) {
    const t = y / (dst.h - 1);
    let lo = stops[0], hi = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (t >= stops[i].at && t <= stops[i + 1].at) { lo = stops[i]; hi = stops[i + 1]; break; }
    }
    const lt = hi.at === lo.at ? 0 : (t - lo.at) / (hi.at - lo.at);
    const r = lerp(lo.c[0], hi.c[0], lt), g = lerp(lo.c[1], hi.c[1], lt), b = lerp(lo.c[2], hi.c[2], lt);
    for (let x = 0; x < dst.w; x++) {
      const i = (y * dst.w + x) * 4;
      dst.data[i] = r; dst.data[i + 1] = g; dst.data[i + 2] = b; dst.data[i + 3] = 255;
    }
  }
}
// scattered star pixels in the upper sky (deterministic)
function stars(dst, count, maxY) {
  let seed = 1337;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let n = 0; n < count; n++) {
    const x = Math.floor(rnd() * dst.w), y = Math.floor(rnd() * maxY);
    const a = 60 + rnd() * 120;
    blendPx(dst, x, y, 230, 226, 210, a);
  }
}

const SKY = [
  { at: 0.0, c: hex('#241f33') },
  { at: 0.34, c: hex('#3a2f4d') },
  { at: 0.6, c: hex('#7a4a5a') },
  { at: 0.74, c: hex('#c97b54') },
  { at: 0.8, c: hex('#565e8b') }, // sea band
  { at: 0.82, c: hex('#3c4a3a') },
  { at: 1.0, c: hex('#2c3a1f') }, // grass
];

function paintScene(W, H, groundY) {
  const c = px(W, H);
  vGradient(c, SKY);
  stars(c, 90, H * 0.34);
  // dusk sun, low on the horizon behind the action
  const sun = scale(trim(loadPng(resolve(ASSETS, 'backgrounds/dusk-sun.png'))), 1.15);
  paste(c, sun, Math.round(W * 0.5 - sun.w / 2), Math.round(groundY - sun.h * 0.88), 0.85);
  // ground band + bright edge line
  fillRect(c, 0, groundY, W, H - groundY, [...hex('#3c4a26').slice(0, 3), 255]);
  fillRect(c, 0, groundY, W, 2, [...hex('#9e9729').slice(0, 3), 255]);
  // subtle grass speckle
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let i = 0; i < W * 1.2; i++) {
    const x = Math.floor(rnd() * W), y = groundY + 3 + Math.floor(rnd() * (H - groundY - 3));
    blendPx(c, x, y, ...hex('#54732d').slice(0, 3), 90 + rnd() * 80);
  }
  return c;
}

// vignette / dark frame edge for polish
function vignette(c) {
  const { w, h } = c;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = Math.min(x, w - 1 - x) / (w * 0.5);
      const dy = Math.min(y, h - 1 - y) / (h * 0.5);
      const e = Math.min(1, Math.min(dx, dy) / 0.18);
      if (e < 1) blendPx(c, x, y, 8, 6, 12, (1 - e) * 150);
    }
}

// ============================================================================
// BANNER 1 — hero / title scene
// ============================================================================
function bannerHero() {
  const W = 1200, H = 340, groundY = 250;
  const c = paintScene(W, H, groundY);

  const knight = sprite(`${ASSETS}/characters/knight/actions/knight-idle.png`, { s: 4 });
  const priest = sprite(`${ASSETS}/characters/priest/actions/priest-idle.png`, { s: 4 });
  const ranger = sprite(`${ASSETS}/characters/ranger/actions/ranger-idle.png`, { s: 4 });
  // enemies advance from the right, so they face left
  const werewolf = sprite(`${ASSETS}/enemies/werewolf/with-shadows/werewolf-idle.png`, { s: 4, flip: true });
  const orc = sprite(`${ASSETS}/enemies/orc/with-shadows/orc-idle.png`, { s: 4, flip: true });

  const place = (img, cx, foot = 6, alpha = 1) => {
    const baseY = groundY + foot;
    groundShadow(c, cx, baseY, Math.round(img.w * 0.42), 9);
    paste(c, img, Math.round(cx - img.w / 2), Math.round(baseY - img.h), alpha);
  };

  // party on the left third, facing the horde
  place(knight, 250);
  place(priest, 175, 4);
  place(ranger, 330, 2);
  // horde on the right
  place(orc, 905);
  place(werewolf, 1010, 8);

  // title block
  drawTextCentered(c, 'TASKBAR LEGION', W / 2, 40, 7, hex('#e8b24c'), {
    tracking: 2, outline: [13, 11, 18, 255],
  });
  drawTextCentered(c, 'AN AMBIENT IDLE RPG THAT LIVES AT THE BOTTOM OF YOUR SCREEN', W / 2, 112, 2,
    hex('#d9c9a3'), { tracking: 1, shadow: { dx: 2, dy: 2, color: [13, 11, 18, 200] } });

  vignette(c);
  savePng(c, `${OUT}/banner-hero.png`);
  console.log('wrote banner-hero.png');
}

// ============================================================================
// BANNER 2 — meet the legion (the three classes)
// ============================================================================
function bannerClasses() {
  const W = 1200, H = 300, groundY = 232;
  const c = paintScene(W, H, groundY);

  const heroes = [
    { key: 'priest', label: 'PRIEST', sub: 'HEALER', accent: '#e2dccd', path: `${ASSETS}/characters/priest/actions/priest-idle.png` },
    { key: 'knight', label: 'KNIGHT', sub: 'TANK', accent: '#c9a24b', path: `${ASSETS}/characters/knight/actions/knight-idle.png` },
    { key: 'ranger', label: 'RANGER', sub: 'DPS', accent: '#5fae57', path: `${ASSETS}/characters/ranger/actions/ranger-idle.png` },
  ];

  const colW = W / 3;
  heroes.forEach((h, i) => {
    const cx = Math.round(colW * (i + 0.5));
    // soft pillar of light behind each hero
    for (let y = 70; y < groundY; y++) {
      const a = 26 * (1 - (groundY - y) / (groundY - 70)) + 6;
      fillRect(c, cx - 46, y, 92, 1, [...hex(h.accent).slice(0, 3), a]);
    }
    const img = sprite(h.path, { s: 4 });
    const baseY = groundY + 6;
    groundShadow(c, cx, baseY, Math.round(img.w * 0.42), 9);
    paste(c, img, Math.round(cx - img.w / 2), Math.round(baseY - img.h));
    drawTextCentered(c, h.label, cx, groundY + 18, 4, hex(h.accent), {
      tracking: 2, outline: [13, 11, 18, 255],
    });
    drawTextCentered(c, h.sub, cx, groundY + 52, 2, hex('#9b91a6'), { tracking: 2 });
    // divider
    if (i > 0) fillRect(c, Math.round(colW * i), 60, 1, H - 90, [...hex('#3a2f4d').slice(0, 3), 160]);
  });

  drawTextCentered(c, 'CHOOSE YOUR LEGION', W / 2, 26, 4, hex('#e8b24c'), {
    tracking: 2, outline: [13, 11, 18, 255],
  });

  vignette(c);
  savePng(c, `${OUT}/banner-classes.png`);
  console.log('wrote banner-classes.png');
}

// ============================================================================
// BANNER 3 — the horde (enemy lineup)
// ============================================================================
function bannerHorde() {
  const W = 1200, H = 260, groundY = 205;
  const c = paintScene(W, H, groundY);

  const foes = [
    'enemies/skeleton/with-shadows/skeleton-idle.png',
    'enemies/orc/with-shadows/orc-idle.png',
    'enemies/armored-skeleton/with-shadows/armored-skeleton-idle.png',
    'enemies/elite-orc/with-shadows/elite-orc-idle.png',
    'enemies/lancer/with-shadows/lancer-idle.png',
    'enemies/knight-templar/with-shadows/knight-templar-idle.png',
    'enemies/orc-rider/with-shadows/orc-rider-idle.png',
    'enemies/werewolf/with-shadows/werewolf-idle.png',
    'enemies/werebear/with-shadows/werebear-idle.png',
  ].map((p) => sprite(`${ASSETS}/${p}`, { s: 3 }));

  const colW = W / foes.length;
  foes.forEach((img, i) => {
    const cx = Math.round(colW * (i + 0.5));
    const baseY = groundY + 6;
    groundShadow(c, cx, baseY, Math.round(img.w * 0.45), 7);
    paste(c, img, Math.round(cx - img.w / 2), Math.round(baseY - img.h));
  });

  drawTextCentered(c, 'EVERYTHING WANTS YOU DEAD', W / 2, 24, 4, hex('#c0473a'), {
    tracking: 2, outline: [13, 11, 18, 255],
  });
  drawTextCentered(c, 'GRUNTS · ELITES · STAGE BOSSES · WORLD-BOSS WALLS', W / 2, 64, 2,
    hex('#d9c9a3'), { tracking: 1, shadow: { dx: 2, dy: 2, color: [13, 11, 18, 200] } });

  vignette(c);
  savePng(c, `${OUT}/banner-horde.png`);
  console.log('wrote banner-horde.png');
}

bannerHero();
bannerClasses();
bannerHorde();
console.log('done ->', OUT);
