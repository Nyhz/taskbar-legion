import type { Graphics } from 'pixi.js';
import type { ActiveEffect } from '@/data/effects';
import { effectDef } from '@/data/effects';
import type { StatKey } from '@/data/stats';
import { hexToNum } from '@/styles/palette';

// Shared, render-only effect-aura vocabulary. Every ongoing buff/debuff a combatant
// carries reads as ONE of a few bold, unmistakable overlays drawn over the body:
//   • offense buff  → bright GREEN arrows surging UPWARD
//   • defense buff  → glowing SHIELDS dancing around the body
//   • debuff/CC     → angry RED arrows sinking DOWNWARD
//   • hot           → handled by the heal-sparkle sprite (HeroSprite)
//   • shield        → handled by the HP-bar absorb overlay
//   • invuln        → handled by the Last Stand bubble (HeroSprite)
// These are pure draw helpers (state + elapsed time in, Graphics out) so HeroSprite and
// EnemySprite share one flashy, consistent visual language. Big · colorful · shiny.

export type AuraCategory = 'offense' | 'defense' | 'debuff' | 'mark' | 'hot' | 'shield' | 'dot' | 'invuln';

// Stats whose buff reads as DEFENSIVE (dancing shields). Everything else beneficial reads
// as offensive (green up-arrows): attack speed/damage, crit, lifesteal, CDR, heal power…
const DEFENSE_STATS: ReadonlySet<StatKey> = new Set<StatKey>([
  'armor', 'magicResist', 'health', 'hpRegen', 'block', 'damageReduction',
]);

// Bright, saturated FX colors — picked to pop against the dusk strip.
export const ARROW_GREEN = hexToNum('#4dff7a'); // offense surge
export const SHIELD_BLUE = hexToNum('#6fd0ff'); // defense bulwark
export const ARROW_RED = hexToNum('#ff4d4d'); // debuff / weaken
const WHITE = 0xffffff;

/** Classify one active effect into its visual category (null = no overlay of its own —
 *  e.g. an instant damage/heal effect, or a pure tag). */
export function categorize(e: ActiveEffect): AuraCategory | null {
  // Battle Enrage gets its own dedicated red aura (HeroSprite), so suppress the generic
  // offense overlay its stat buffs would otherwise add — keeps the ult's signal unique.
  if (e.defKey === 'buff_enrage_cdr' || e.defKey === 'buff_enrage_as') return null;
  const def = effectDef(e.defKey);
  const k = def.kind;
  switch (k.type) {
    case 'hot': return 'hot';
    case 'shield': return 'shield';
    case 'invulnerable': return 'invuln';
    case 'dot': return 'dot';
    case 'heal': case 'damage': case 'tag': return null; // instant / no ongoing aura
    case 'statMod':
      if (!def.beneficial) return 'debuff';
      return DEFENSE_STATS.has(k.stat) ? 'defense' : 'offense';
    // The ranger's Mark of the Hunter reads as a target reticle locked onto the boss —
    // its own bold, unmistakable overlay rather than the generic red down-arrows.
    case 'vulnerable': return 'mark';
    // weaken/root/silence are the other hostile marks
    case 'weaken': case 'root': case 'silence':
      return 'debuff';
    default: return def.beneficial ? 'offense' : 'debuff';
  }
}

/** Which aura categories are live on this combatant right now. */
export function auraCategories(effects: readonly ActiveEffect[]): Set<AuraCategory> {
  const out = new Set<AuraCategory>();
  for (const e of effects) {
    const c = categorize(e);
    if (c !== null) out.add(c);
  }
  return out;
}

/** Total remaining absorb across all active shield pools (for the HP-bar overlay). */
export function totalShield(effects: readonly ActiveEffect[]): number {
  let s = 0;
  for (const e of effects) if (effectDef(e.defKey).kind.type === 'shield') s += e.value;
  return s;
}

// The vertical band an aura plays over, in container-local coords (y grows downward, so
// `topY` is the MORE-NEGATIVE head line and `botY` the feet line). `cx` centers it on the
// body; `halfW` is half the body width; `scale` sizes the glyphs for big vs small bodies.
export interface AuraRegion {
  cx: number;
  topY: number;
  botY: number;
  halfW: number;
  scale: number;
  elapsed: number;
}

/** Draw whichever arrow/shield overlays the active categories call for. The caller passes
 *  the set so a body can show BOTH a buff and a debuff at once (different vertical bands). */
export function drawCategoryAuras(g: Graphics, cats: Set<AuraCategory>, r: AuraRegion): void {
  if (cats.has('offense')) drawOffenseArrows(g, r);
  if (cats.has('defense')) drawDancingShields(g, r);
  if (cats.has('debuff')) drawDebuffArrows(g, r);
  if (cats.has('mark')) drawMarkCrosshair(g, r);
}

// ── Mark of the Hunter: a target reticle ──
// The radius the locked-on reticle spans over a body — a touch wider than the figure so it
// reads as a crosshair framing the whole target. Exported so the fly-in FX (WorldFxLayer)
// lands exactly on the persistent reticle the aura then keeps drawing.
export function crosshairRadius(r: AuraRegion): number {
  return Math.max(r.halfW * 1.15, (r.botY - r.topY) * 0.34);
}

/** A red targeting reticle: a glow, a slowly-spinning 4-arc ring, fixed N/E/S/W ticks
 *  crossing toward a center gap, an inner ring and a center dot. Shared by the persistent
 *  mark aura and the ranger's ultimate fly-in so they read as one continuous lock-on. */
export function drawCrosshair(g: Graphics, cx: number, cy: number, radius: number, alpha: number, spin: number, color: number = ARROW_RED): void {
  if (alpha <= 0.02 || radius <= 0) return;
  // outer glow ring
  g.circle(cx, cy, radius * 1.06).stroke({ color, width: 3, alpha: alpha * 0.18 });
  // spinning ring drawn as four gapped arcs
  const seg = (Math.PI / 2) * 0.6;
  for (let i = 0; i < 4; i++) {
    const a0 = spin + (i * Math.PI) / 2 - seg / 2;
    g.moveTo(cx + Math.cos(a0) * radius, cy + Math.sin(a0) * radius)
      .arc(cx, cy, radius, a0, a0 + seg)
      .stroke({ color, width: 2, alpha });
  }
  // fixed crosshair ticks (top/bottom/left/right), leaving a clear gap in the middle
  const gap = radius * 0.42;
  const outer = radius * 1.18;
  for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
    g.moveTo(cx + dx * gap, cy + dy * gap)
      .lineTo(cx + dx * outer, cy + dy * outer)
      .stroke({ color, width: 2, alpha });
  }
  // inner ring + bright center pip
  g.circle(cx, cy, radius * 0.3).stroke({ color: WHITE, width: 1, alpha: alpha * 0.55 });
  g.circle(cx, cy, 1.8).fill({ color, alpha });
}

// The persistent reticle the marked boss wears for the whole fight — a soft pulse and a
// slow spin so it reads as "actively locked on" rather than a static decal.
function drawMarkCrosshair(g: Graphics, r: AuraRegion): void {
  const cy = (r.topY + r.botY) / 2;
  const pulse = 0.72 + 0.28 * Math.sin(r.elapsed / 320);
  drawCrosshair(g, r.cx, cy, crosshairRadius(r), pulse, r.elapsed / 1100);
}

// One bold, shiny arrow: fat translucent glow behind, saturated body, white core stripe.
// `dir` = -1 points UP, +1 points DOWN. Centered at (x,y), total length `len`.
function drawArrow(g: Graphics, x: number, y: number, len: number, dir: -1 | 1, color: number, alpha: number): void {
  if (alpha <= 0.02) return;
  const tipY = y + dir * (len / 2);
  const tailY = y - dir * (len / 2);
  const headLen = len * 0.52;
  const headHalf = len * 0.42;
  const shaftHalf = len * 0.15;
  const headBaseY = tipY - dir * headLen;
  const shaftY0 = Math.min(headBaseY, tailY);
  const shaftH = Math.abs(tailY - headBaseY);
  // outer glow — a fatter ghost of the arrow
  g.poly([x, tipY + dir * 2, x - headHalf * 1.5, headBaseY, x + headHalf * 1.5, headBaseY])
    .fill({ color, alpha: alpha * 0.22 });
  g.rect(x - shaftHalf * 2.1, shaftY0, shaftHalf * 4.2, shaftH).fill({ color, alpha: alpha * 0.18 });
  // body
  g.poly([x, tipY, x - headHalf, headBaseY, x + headHalf, headBaseY]).fill({ color, alpha });
  g.rect(x - shaftHalf, shaftY0, shaftHalf * 2, shaftH).fill({ color, alpha });
  // white shine core
  g.rect(x - shaftHalf * 0.5, shaftY0 + shaftH * 0.05, shaftHalf, shaftH * 0.9).fill({ color: WHITE, alpha: alpha * 0.55 });
  g.poly([x, tipY - dir * len * 0.06, x - headHalf * 0.4, headBaseY, x + headHalf * 0.4, headBaseY])
    .fill({ color: WHITE, alpha: alpha * 0.4 });
}

// Three green arrows surging upward over the body, staggered so one is always rising —
// the universal "buffed / empowered" read.
function drawOffenseArrows(g: Graphics, r: AuraRegion): void {
  const N = 3;
  const period = 820;
  const len = 11 * r.scale;
  for (let i = 0; i < N; i++) {
    const phase = (r.elapsed / period + i / N) % 1; // 0 (bottom) → 1 (top)
    const y = r.botY + (r.topY - r.botY) * phase; // rises
    const x = r.cx + (i - (N - 1) / 2) * r.halfW * 0.95;
    const a = Math.sin(phase * Math.PI); // fade in low, peak mid, fade out at the top
    drawArrow(g, x, y, len, -1, ARROW_GREEN, a);
  }
}

// Three red arrows sinking downward over the target — the universal "weakened / cursed"
// read. Drawn a touch higher (over the head) so it stacks legibly with any buff arrows.
function drawDebuffArrows(g: Graphics, r: AuraRegion): void {
  const N = 3;
  const period = 820;
  const len = 11 * r.scale;
  const top = r.topY - len * 0.3;
  for (let i = 0; i < N; i++) {
    const phase = (r.elapsed / period + i / N) % 1; // 0 (top) → 1 (bottom)
    const y = top + (r.botY - top) * phase; // sinks
    const x = r.cx + (i - (N - 1) / 2) * r.halfW * 0.95;
    const a = Math.sin(phase * Math.PI);
    drawArrow(g, x, y, len, 1, ARROW_RED, a);
  }
}

// One heraldic shield with a glow halo and a white shine — drawn at a depth-scaled size so
// the orbiting set reads as a 3D dance around the hero.
function drawShield(g: Graphics, x: number, y: number, s: number, alpha: number, depth: number): void {
  if (alpha <= 0.02) return;
  const col = SHIELD_BLUE;
  // halo
  g.circle(x, y, s * 1.5).fill({ color: col, alpha: alpha * 0.16 * depth });
  // shield body (pointed heraldic shape)
  const pts = [
    x - s, y - s,
    x + s, y - s,
    x + s, y + s * 0.15,
    x, y + s * 1.25,
    x - s, y + s * 0.15,
  ];
  g.poly(pts).fill({ color: col, alpha });
  g.poly(pts).stroke({ color: WHITE, width: 1, alpha: alpha * 0.7 });
  // shine: a bright wedge in the upper-left + a center boss dot
  g.poly([x - s * 0.7, y - s * 0.7, x - s * 0.1, y - s * 0.7, x - s * 0.7, y + s * 0.1])
    .fill({ color: WHITE, alpha: alpha * 0.5 });
  g.circle(x, y - s * 0.1, s * 0.22).fill({ color: WHITE, alpha: alpha * 0.8 });
}

// Shields orbiting the body in a flattened ellipse, bobbing as they go — those at the
// FRONT (sin > 0) draw bigger & brighter, those behind smaller & dimmer → a lively dance.
function drawDancingShields(g: Graphics, r: AuraRegion): void {
  const N = 3;
  const midY = (r.topY + r.botY) / 2;
  const rx = r.halfW * 1.25;
  const ry = Math.max(6, (r.botY - r.topY) * 0.18);
  for (let i = 0; i < N; i++) {
    const ang = r.elapsed / 620 + (i * Math.PI * 2) / N;
    const x = r.cx + Math.cos(ang) * rx;
    const front = Math.sin(ang); // -1 (far) → 1 (near)
    const y = midY + front * ry - Math.sin(r.elapsed / 180 + i) * 1.6; // orbit + bob
    const depth = 0.6 + 0.4 * (front * 0.5 + 0.5); // nearer = larger
    const s = 4.6 * r.scale * depth;
    const a = 0.5 + 0.5 * (front * 0.5 + 0.5);
    drawShield(g, x, y, s, a, depth);
  }
}

// ── HP-bar absorb (shield) overlay — WoW-style ──
// A bright yellow segment laid OVER the HP fill, anchored at the bar's RIGHT edge and
// growing leftward with the absorb size; it shrinks back toward the right as the shield is
// chewed down by incoming hits. Drawn after the HP fill so it always sits on top.
export const SHIELD_BAR_YELLOW = hexToNum('#ffe14d');

export function drawShieldBar(
  g: Graphics, barLeftX: number, barY: number, barW: number, barH: number,
  shield: number, maxHp: number, elapsed: number,
): void {
  if (shield <= 0 || maxHp <= 0) return;
  const frac = Math.max(0, Math.min(1, shield / maxHp));
  const w = Math.max(1, Math.round(barW * frac));
  const x = barLeftX + barW - w; // anchored at the right edge, grows left
  const pulse = 0.82 + 0.18 * Math.sin(elapsed / 160);
  g.rect(x, barY, w, barH).fill({ color: SHIELD_BAR_YELLOW, alpha: pulse });
  // bright top highlight + a leading edge tick so the absorb reads as a hard shell
  g.rect(x, barY, w, Math.max(1, Math.round(barH * 0.34))).fill({ color: 0xfff7c0, alpha: 0.9 });
  g.rect(x - 1, barY, 1.5, barH).fill({ color: WHITE, alpha: 0.85 });
}
