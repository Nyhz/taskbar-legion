import type { Graphics } from 'pixi.js';

// A reusable melee sword-swing arc: a blade that sweeps down over SWING_MS and
// fades in/out. `facing` +1 points right (heroes), -1 points left (enemies).
// Drawn with trig (no container rotation) so it composes inside any sprite.

export const SWING_MS = 170;
const LEN = 13;

export function drawSwing(g: Graphics, remainingMs: number, color: number, facing = 1): void {
  g.clear();
  if (remainingMs <= 0) {
    g.visible = false;
    return;
  }
  g.visible = true;
  const k = 1 - remainingMs / SWING_MS; // 0→1 progress
  g.alpha = Math.sin(k * Math.PI); // swoosh in then out

  const px = facing > 0 ? 10 : 3; // pivot near the leading shoulder
  const py = 2;
  const angle = -1.2 + k * 1.8; // sweep from raised to down
  const ex = px + Math.cos(angle) * LEN * facing;
  const ey = py + Math.sin(angle) * LEN;
  // perpendicular gives the blade a little width
  const nx = Math.cos(angle + Math.PI / 2) * 1.7 * facing;
  const ny = Math.sin(angle + Math.PI / 2) * 1.7;
  g.poly([px - nx, py - ny, px + nx, py + ny, ex, ey]).fill({ color });
}
