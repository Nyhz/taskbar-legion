// shot-app.mjs — drive the running game (vite dev server) in headless Chromium and screenshot it.
//   node scripts/shot-app.mjs <out.png> [--url http://localhost:5173/] [--size 1280x720] [--wait 2500]
//                    [--step "<js expression>"]... [--pause 800] [--clip x,y,w,h]
// Each --step is evaluated in the page in order (e.g. a click), with --pause ms after each. Console errors are printed.
// A step of the form mouse:move:x,y | mouse:click:x,y | mouse:right:x,y drives a real pointer (CSS px) instead.
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const out = args[0];
const opt = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };
const steps = args.flatMap((a, i) => (a === '--step' ? [args[i + 1]] : []));
const url = opt('url', 'http://localhost:5173/');
const [w, h] = opt('size', '1280x720').split('x').map(Number);
const wait = Number(opt('wait', '2500'));
const pause = Number(opt('pause', '800'));
const clip = opt('clip', null);
const scale = Number(opt('scale', '1'));

const bin = `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`;
const port = 9300 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), 'shotapp-'));
const chrome = spawn(bin, [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--headless', '--hide-scrollbars', '--mute-audio', `--window-size=${w},${h}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function target() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* not up yet */ }
    await sleep(100);
  }
  throw new Error('chrome did not start');
}

try {
  const ws = new WebSocket(await target());
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') console.log('PAGE EXCEPTION:', msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) console.log(`console.${msg.params.type}:`, msg.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 300));
  });
  const send = (method, params = {}) => new Promise((resolve) => { const n = ++id; pending.set(n, resolve); ws.send(JSON.stringify({ id: n, method, params })); });
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale, mobile: false });
  await send('Page.navigate', { url });
  await sleep(wait);
  for (const step of steps) {
    // "mouse:move:x,y" / "mouse:click:x,y" / "mouse:right:x,y" — a REAL pointer (CSS px), for hover and menus.
    const mouse = /^mouse:(move|click|right):(\d+),(\d+)$/.exec(step);
    if (mouse) {
      const [, kind, mx, my] = mouse;
      const at = { x: Number(mx), y: Number(my) };
      await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...at });
      if (kind !== 'move') {
        const button = kind === 'right' ? 'right' : 'left';
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...at, button, clickCount: 1 });
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...at, button, clickCount: 1 });
      }
      await sleep(pause);
      continue;
    }
    const res = await send('Runtime.evaluate', { expression: step, awaitPromise: true, returnByValue: true });
    if (res.result?.exceptionDetails) console.log('STEP FAILED:', step, res.result.exceptionDetails.exception?.description);
    else if (res.result?.result?.value !== undefined) console.log('step →', JSON.stringify(res.result.result.value).slice(0, 400));
    await sleep(pause);
  }
  const params = { format: 'png' };
  if (clip) { const [x, y, cw, ch] = clip.split(',').map(Number); params.clip = { x, y, width: cw, height: ch, scale: 1 }; }
  const shot = await send('Page.captureScreenshot', params);
  writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
  console.log('wrote', out);
  ws.close();
} finally {
  chrome.kill();
}
