import { Container, Graphics } from 'pixi.js';
import type { Combatant } from '@/sim/world';
import type { AttackStyle } from '@/data/field';
import { RANGE } from '@/data/field';
import { hexToNum } from '@/styles/palette';
import { drawEnemy } from './textures';
import { auraCategories, drawCategoryAuras, totalShield, drawShieldBar, crosshairRadius, drawFrenzyGround, hasFrenzy, type AuraRegion } from './effectAuras';
import { SpriteBody } from './SpriteBody';
import type { CharFrames } from './characterFrames';
import type { EnemySizeClass } from './enemyFrames';

// An enemy display object. Sprite-sheet bodied (orc/skeleton/slime/archer/… + the big
// boss mounts) via the shared SpriteBody state machine (idle/walk/attack/death); falls
// back to the procedural body only if the sheet isn't loaded. Bosses render BIGGER, with
// the HP bar lifted clear of the taller sprite. Reads sim state only. Each enemy
// MATERIALISES (teleport-in) on first appearance, and on death plays its death animation
// and HOLDS for ~1s before the driver removes it.

const CAST_MS = 340;
const SPAWN_FX_MS = 360; // teleport-in materialise duration
const DEATH_HOLD_MS = 1000; // keep the corpse (death anim) on screen this long after dying
// Keep the walk loop playing this long after the last detected move, so the bursty
// display-position easing (it catches up to the sim in steps between 100ms ticks) — and a
// frozen camera once the party stops — don't flicker walk↔idle and reset the animation.
const MOVE_GRACE_MS = 180;
const TP_RING = hexToNum('#ffe27a');
const TP_BEAM = hexToNum('#fff2a8');

// Container-local y where an enemy's feet sit — ~5px above the hero ground line
// (HeroSprite SPRITE_FEET_Y = 26) per art tuning, so enemies seat naturally on the grass.
const FEET_OFFSET = 21;

// Per-role render size: the figure SCALE (on the 100px frame), the figure height above the
// feet (px in-frame, to place the HP bar just over the head), and the HP-bar width. World
// bosses are very big; stage bosses bigger than trash but smaller than world bosses.
// figH is GENEROUS (clears weapons/mounts) so the HP bar floats clear above the head.
// auraFrac is the fraction of figH·scale ABOVE the feet where the body-centred overlays
// (enrage aura, cast burst, teleport ring) sit. World bosses ride big mounts, so their
// generous figH overshoots the actual body — a smaller frac drops those overlays onto the
// creature instead of leaving them hovering in the air above it.
const SIZE: Record<EnemySizeClass, { scale: number; figH: number; barW: number; auraFrac: number }> = {
  normal: { scale: 2.7, figH: 28, barW: 20, auraFrac: 0.5 },
  stageBoss: { scale: 4.4, figH: 30, barW: 48, auraFrac: 0.5 },
  worldBoss: { scale: 5.8, figH: 56, barW: 72, auraFrac: 0.26 }, // ~2× scale; aura/cast hug the body, not the generous box
};

export class EnemySprite extends Container {
  readonly style: AttackStyle;
  private readonly spriteBody: SpriteBody | null;
  private readonly body = new Graphics(); // procedural fallback (no sheet)
  private readonly aura = new Graphics();
  private readonly enrageAura = new Graphics();
  private readonly frenzyAura = new Graphics(); // red ground pool while the boss is Frenzied
  private readonly castBar = new Graphics(); // under-boss cast bar while channeling a special
  private readonly eliteAura = new Graphics(); // ground pulse marking a champion (elite) mob
  private readonly isElite: boolean;
  private readonly hpBg = new Graphics();
  private readonly hpBar = new Graphics();
  private readonly tpRing = new Graphics();
  private readonly barW: number;
  private readonly barY: number; // HP-bar y (above the figure), container-local
  private readonly cy: number; // body-centre y for auras/cast (container-local, negative = up)
  private readonly auraScale: number;
  private flash = 0;
  private castMs = 0;
  private castColor = 0xffffff;
  private elapsed = 0;
  private materializeMs = 0;
  private lastX = 0;
  private moveGraceMs = 0; // >0 while recently moving → keep the walk loop (anti-flicker)
  private deathMs = 0; // >0 once dying — counts the corpse hold down to removal
  private dying = false;
  private prevAlive = true;
  private hpBgY = Number.NaN; // y the static HP-bar backdrop was last drawn at (rebuild only on change)
  private barLift = 0; // px the HP bar is raised to dodge a crowded neighbour's bar (set by GameStrip)

  constructor(c: Combatant, stageTint: number, spec: { frames: CharFrames | null; sizeClass: EnemySizeClass }) {
    super();
    this.style = c.enemyMagic === true ? 'caster' : c.range >= RANGE.ranged ? 'ranged' : 'melee';
    this.isElite = c.isElite === true;
    const sz = SIZE[spec.sizeClass];
    this.barW = sz.barW;
    // Feet at FEET_OFFSET (on the party's ground line); figure rises figH·scale above that.
    this.barY = FEET_OFFSET - sz.figH * sz.scale - 6;
    this.cy = FEET_OFFSET - sz.figH * sz.scale * sz.auraFrac;
    this.auraScale = Math.max(1, sz.scale / 1.5);

    this.spriteBody = spec.frames !== null ? new SpriteBody(spec.frames) : null;
    if (this.spriteBody !== null) {
      // Sprites carry their own colours — only the procedural fallback uses the stage tint.
      // Negative x-scale flips the sprite to face LEFT (the art faces right; enemies advance
      // left toward the party, attacking leftward).
      this.spriteBody.scale.set(-sz.scale, sz.scale);
      this.spriteBody.position.set(0, FEET_OFFSET);
    } else {
      drawEnemy(this.body, { isBoss: c.isBoss === true, magic: c.enemyMagic === true, tint: stageTint });
      this.body.position.set(0, FEET_OFFSET);
    }
    // eliteAura + frenzy pool sit on the ground UNDER the feet, then enrageAura behind the
    // body; HP bar + cast bar on top.
    this.addChild(this.eliteAura, this.frenzyAura, this.enrageAura);
    if (this.spriteBody !== null) this.addChild(this.spriteBody); else this.addChild(this.body);
    this.addChild(this.aura, this.hpBg, this.hpBar, this.castBar, this.tpRing);
  }

  /** Begin the teleport-in materialise (grow + fade-in + ring). */
  spawnIn(): void {
    this.materializeMs = SPAWN_FX_MS;
    this.alpha = 0;
  }

  flashHit(): void {
    this.flash = 1;
  }

  /** Raise this enemy's HP bar by `px` so it doesn't sit on top of a neighbour's bar when
   *  enemies bunch at the same x (GameStrip computes the crowding, like it does for heroes). */
  setBarLift(px: number): void {
    this.barLift = px;
  }

  // Sprite bodies carry their own attack motion; the procedural fallback had a lunge but
  // we drop it (no-op) so the API matches HeroSprite.
  lungeAttack(): void { /* sprite frames carry the motion */ }

  /** Play the enemy's attack animation. */
  swing(): void {
    this.spriteBody?.attack();
  }

  castBurst(color: number): void {
    this.castMs = CAST_MS;
    this.castColor = color;
  }

  /** True once the death hold has elapsed → the driver may remove this sprite. */
  isExpired(): boolean {
    return this.dying && this.deathMs <= 0;
  }

  /** Drive the sprite from the live combatant. */
  update(c: Combatant, x: number, groundY: number, dtMs: number): void {
    this.elapsed += dtMs;
    this.visible = true;
    this.x = x;
    this.y = groundY;

    if (this.prevAlive && !c.alive) this.startDeath();
    this.prevAlive = c.alive;

    // Held move-grace: any recent motion keeps the walk loop alive through the bursty
    // easing / frozen-camera gaps, so it never resets to idle-then-walk mid-stride.
    if (c.alive && Math.abs(x - this.lastX) > 0.15) this.moveGraceMs = MOVE_GRACE_MS;
    else this.moveGraceMs = Math.max(0, this.moveGraceMs - dtMs);
    this.lastX = x;
    const moving = c.alive && this.moveGraceMs > 0;

    this.flash = Math.max(0, this.flash - dtMs / 220);
    const enraged = c.isBoss === true && c.alive && (c.fightMs ?? 0) > (c.enrageMs ?? Number.POSITIVE_INFINITY);
    const tint = this.flash > 0 ? 0xffd0d0 : enraged ? 0xff9a86 : 0xffffff;
    this.spriteBody?.setTint(tint);
    if (this.spriteBody === null) this.body.tint = tint;

    this.advanceBody(dtMs, moving);
    this.drawHpBar(c, groundY);
    this.castMs = Math.max(0, this.castMs - dtMs);
    this.drawAura(c);
    this.drawEnrage(enraged);
    this.drawFrenzy(c);
    this.drawCastBar(c);
    this.drawEliteAura(c.alive);
    this.applyMaterialize(dtMs);
    this.tickDeath(dtMs);
  }

  /** Drive the sprite after its combatant has been pruned from the sim — keep playing the
   *  death hold (or, if it never actually died, fade it out quickly). Holds its last world
   *  position (x tracks the camera so the corpse doesn't drift). */
  updateOrphan(x: number, groundY: number, dtMs: number): void {
    this.elapsed += dtMs;
    this.x = x;
    this.y = groundY;
    if (!this.dying) {
      // Pruned while still "alive" (a stage/wave reset, not a kill) → no death anim, fade fast.
      this.dying = true;
      this.deathMs = 200;
    }
    this.advanceBody(dtMs, false);
    this.tickDeath(dtMs);
  }

  private advanceBody(dtMs: number, moving: boolean): void {
    if (this.spriteBody !== null) this.spriteBody.update(dtMs, moving);
  }

  private startDeath(): void {
    if (this.dying) return;
    this.dying = true;
    this.deathMs = DEATH_HOLD_MS;
    this.spriteBody?.die();
    this.hpBg.visible = false;
    this.hpBar.visible = false;
  }

  // Count the corpse hold down; fade out over the final 250ms so it dissolves rather than
  // popping. The driver removes the sprite once isExpired().
  private tickDeath(dtMs: number): void {
    if (!this.dying) return;
    this.deathMs = Math.max(0, this.deathMs - dtMs);
    this.alpha = Math.min(this.alpha, this.deathMs > 250 ? 1 : Math.max(0, this.deathMs / 250));
  }

  private drawHpBar(c: Combatant, groundY: number): void {
    if (this.dying) { this.hpBg.visible = false; this.hpBar.visible = false; return; }
    this.hpBg.visible = true;
    this.hpBar.visible = true;
    // Clamp inside the strip: the container sits at groundY, so the strip's top edge is at
    // container-local -groundY — a very tall boss's bar pins there instead of slipping off.
    // barLift raises the bar (more negative y) to dodge a crowded neighbour; the same clamp
    // keeps a lifted bar from sliding off the top.
    const y = Math.max(this.barY - this.barLift, -groundY + 6);
    const frac = c.maxHp > 0 ? Math.max(0, Math.min(1, c.hp / c.maxHp)) : 0;
    // The backdrop is static geometry — only re-tessellate it when its y actually moves
    // (a tall boss's bar pinned against the strip top as the camera shifts).
    if (y !== this.hpBgY) {
      this.hpBgY = y;
      this.hpBg.clear().rect(-this.barW / 2, y, this.barW, 3).fill({ color: hexToNum('#3a2030') });
    }
    this.hpBar.clear();
    this.hpBar.rect(-this.barW / 2, y, Math.round(this.barW * frac), 3).fill({ color: hexToNum('#c0473a') });
    // WoW-style absorb overlay (drawn over the HP fill), should an enemy ever be shielded.
    drawShieldBar(this.hpBar, -this.barW / 2, y, this.barW, 3, totalShield(c.effects), c.maxHp, this.elapsed);
  }

  private applyMaterialize(dtMs: number): void {
    if (this.materializeMs <= 0) {
      if (this.tpRing.visible) this.tpRing.visible = false;
      if (!this.dying) this.alpha = 1;
      return;
    }
    this.materializeMs = Math.max(0, this.materializeMs - dtMs);
    const k = 1 - this.materializeMs / SPAWN_FX_MS; // 0→1
    this.alpha = k;
    const g = this.tpRing;
    g.visible = true;
    g.clear();
    const r = (4 + k * 14) * this.auraScale;
    g.ellipse(0, this.cy, r, r * 1.1).stroke({ color: TP_RING, width: 2, alpha: (1 - k) * 0.9 });
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 + this.elapsed / 60;
      g.circle(Math.cos(a) * r * 0.8, this.cy + Math.sin(a) * r * 0.8, 1.4).fill({ color: TP_BEAM, alpha: (1 - k) * 0.9 });
    }
    if (this.materializeMs <= 0) { this.alpha = 1; g.visible = false; }
  }

  // Elite ("champion") marker: concentric white rings on the ground beneath the feet that
  // expand outward and fade, staggered so a new one is always growing — a non-stop pulse.
  // Flattened ellipses (y ≈ 0.4·x) so they read as lying on the floor in perspective.
  private drawEliteAura(alive: boolean): void {
    this.eliteAura.clear();
    if (!this.isElite || !alive) return;
    const cy = FEET_OFFSET; // ground line at the feet
    const maxR = 30 * this.auraScale; // wide, conspicuous footprint — elites hit ~3× hp / 4× dmg
    const FLAT = 0.4; // ground-plane flatten (y radius ÷ x radius)
    // Soft pulsing base glow so the marker always reads even between ring crests.
    const pulse = 0.6 + 0.4 * Math.sin(this.elapsed / 360);
    this.eliteAura.ellipse(0, cy, maxR * 0.55, maxR * 0.55 * FLAT).fill({ color: 0xffffff, alpha: 0.08 * pulse });
    const PERIOD = 1250; // ms for one ring to travel centre → edge
    const RINGS = 4;
    for (let i = 0; i < RINGS; i++) {
      const t = (this.elapsed / PERIOD + i / RINGS) % 1; // staggered 0→1 progress
      const r = t * maxR;
      const alpha = (1 - t) * 0.75; // brightest newborn at the centre, fades as it grows
      if (alpha <= 0.01 || r < 0.5) continue;
      this.eliteAura.ellipse(0, cy, r, r * FLAT).stroke({ color: 0xffffff, width: 2.5, alpha });
    }
  }

  private drawEnrage(enraged: boolean): void {
    this.enrageAura.clear();
    if (!enraged) return;
    const cy = this.cy;
    const s = this.auraScale;
    const pulse = 0.5 + 0.5 * Math.sin(this.elapsed / 110);
    for (let r = 0; r < 3; r++) {
      this.enrageAura.circle(0, cy, (13 + r * 5 + pulse * 3) * s).stroke({ color: 0xff3322, width: 2, alpha: (0.45 - r * 0.12) * (0.5 + 0.5 * pulse) });
    }
    for (let i = 0; i < 7; i++) {
      const ang = -Math.PI / 2 + (i - 3) * 0.3;
      const base = 9 * s;
      const len = base + (7 + 5 * Math.abs(Math.sin(this.elapsed / 90 + i * 1.3))) * s;
      this.enrageAura
        .moveTo(Math.cos(ang) * base, cy + Math.sin(ang) * base)
        .lineTo(Math.cos(ang) * len, cy + Math.sin(ang) * len)
        .stroke({ color: 0xff5a2a, width: 2, alpha: 0.4 + 0.4 * pulse });
    }
  }

  // Frenzy: a red aura pooled on the ground at the boss's feet while the attack-speed buff
  // is up (distinct from the body-centred enrage flames above).
  private drawFrenzy(c: Combatant): void {
    this.frenzyAura.clear();
    if (!c.alive || !hasFrenzy(c.effects)) return;
    drawFrenzyGround(this.frenzyAura, 0, FEET_OFFSET, this.auraScale, this.elapsed);
  }

  // A fast cast bar UNDER the boss while it channels a special (Frenzy / Mortal Wound),
  // filling over the cast's windup — telegraphs the incoming ability. Colored per ability.
  private drawCastBar(c: Combatant): void {
    this.castBar.clear();
    const ch = c.casting;
    if (!c.alive || this.dying || ch === undefined || ch.totalMs <= 0) return;
    const frac = Math.max(0, Math.min(1, 1 - ch.remainingMs / ch.totalMs));
    const w = Math.max(this.barW * 1.6, 34);
    const x = -w / 2;
    const y = FEET_OFFSET + 7; // just below the feet, on the ground in front of the boss
    const col = ch.key === 'boss_mortal_wound' ? hexToNum('#c061ff') : hexToNum('#ff7a2a');
    this.castBar.rect(x - 1, y - 1, w + 2, 6).fill({ color: hexToNum('#160b12'), alpha: 0.9 }); // backdrop
    const fillW = Math.max(1, Math.round(w * frac));
    this.castBar.rect(x, y, fillW, 4).fill({ color: col });
    this.castBar.rect(x, y, fillW, 1.5).fill({ color: 0xffffff, alpha: 0.5 }); // top sheen
    this.castBar.rect(x + fillW - 1, y, 1.5, 4).fill({ color: 0xffffff, alpha: 0.85 }); // leading edge
  }

  // The vertical band auras play over, in container-local coords. Shared by drawAura and
  // markPoint so the ranger's ultimate fly-in lands exactly on the persistent reticle.
  private auraRegion(): AuraRegion {
    const s = this.auraScale;
    return {
      cx: 0,
      topY: this.barY + 8,
      botY: FEET_OFFSET,
      cy: this.cy, // corrected body centre (auraFrac) — keeps the mark reticle on the body
      halfW: Math.max(this.barW * 0.45, 9 * s),
      scale: s,
      elapsed: this.elapsed,
    };
  }

  /** Where the Mark-of-the-Hunter reticle sits on this body (parent coords) and its radius —
   *  the ranger's ult crosshair flies in and locks onto this exact spot. */
  markPoint(): { x: number; y: number; radius: number } {
    const r = this.auraRegion();
    return { x: this.x, y: this.y + r.cy, radius: crosshairRadius(r) };
  }

  /** This enemy's feet on the ground line (parent coords) — where an on-target effect such as
   *  the Priest's holy strike is seated so it rises up from the feet. */
  feetPoint(): { x: number; y: number } {
    return { x: this.x, y: this.y + FEET_OFFSET };
  }

  private drawAura(c: Combatant): void {
    this.aura.clear();
    const cy = this.cy;
    const s = this.auraScale;
    if (this.castMs > 0) {
      const t = this.castMs / CAST_MS;
      this.aura.circle(0, cy, ((1 - t) * 15 + 5) * s).stroke({ color: this.castColor, width: 2, alpha: t });
    }
    if (!c.alive) return;
    // Bold category overlays — enemies most often wear DEBUFFS (red down-arrows from
    // Debilitating Cleave / Frozen Trap, etc.) or the ranger's MARK reticle, drawn over the
    // figure's vertical span.
    const cats = auraCategories(c.effects);
    drawCategoryAuras(this.aura, cats, this.auraRegion());
  }
}
