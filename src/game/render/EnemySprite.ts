import { Container, Graphics } from 'pixi.js';
import type { Combatant } from '@/sim/world';
import type { AttackStyle } from '@/data/field';
import { RANGE } from '@/data/field';
import { hexToNum } from '@/styles/palette';
import { auraCategories, drawCategoryAuras, totalShield, drawShieldBar, crosshairRadius, drawFrenzyGround, hasFrenzy, type AuraRegion } from './effectAuras';
import { FigureBody } from './FigureBody';
import { DEATH } from './figureClip';
import { clipMs, FEET_BELOW_ORIGIN, type EnemyRank } from './figureData';
import type { FigureSheet } from './figureTextures';
import { ATTACK_CLIP, HURT_CLIP } from './heroClips';

// An enemy display object: a creature of the world the party is in (the redesign's figures — FigureBody), drawn
// 1 art pixel = 1 strip pixel and mirrored to face the heroes, with its feet on the ground line it is given.
// What an enemy IS is told by its figure; its RANK is told by its marking, never by scaling the art: an elite
// pulses white rings on the ground, a stage boss has its own large figure and a long life bar, a world boss
// (which has no figure of its own yet) is the stage boss's figure with gold rings and a gold-framed bar.
// Reads sim state only. Each enemy MATERIALISES (teleport-in) on first appearance, and on death plays its death
// animation to the end before the driver removes it.

const CAST_MS = 340;
const SPAWN_FX_MS = 360; // teleport-in materialise duration
const DEATH_FADE_MS = 250; // the corpse dissolves over the end of its death clip
const PRUNED_FADE_MS = 200; // an enemy removed without dying (a stage reset) just fades
// Keep the run loop playing this long after the last detected move, so the bursty
// display-position easing (it catches up to the sim in steps between 100ms ticks) — and a
// frozen camera once the party stops — don't flicker run↔idle and reset the animation.
const MOVE_GRACE_MS = 180;
// A creature flinches (its hurt clip) at most this often: a boss under constant fire still acts.
const HURT_GAP_MS = 900;
const TP_RING = hexToNum('#ffe27a');
const TP_BEAM = hexToNum('#fff2a8');
const GOLD = hexToNum('#e8c34c');

// Container-local y of the feet (the ground line).
const FEET_Y = FEET_BELOW_ORIGIN;
const BAR_H = 3;
// The HUD's boss plate (name, timer, life) covers the top of the strip: a life bar stays below it.
const STRIP_TOP_CLEAR = 32;

// Per-rank marking: the life bar's width and the ground rings (colour, reach) that mark the enemy.
interface RankLook {
  barW: number;
  rings: { color: number; reach: number } | null;
  barFrame: number | null;
}
const RANK: Record<EnemyRank, RankLook> = {
  normal: { barW: 20, rings: null, barFrame: null },
  elite: { barW: 20, rings: { color: 0xffffff, reach: 22 }, barFrame: null },
  stageBoss: { barW: 40, rings: null, barFrame: null },
  worldBoss: { barW: 56, rings: { color: GOLD, reach: 46 }, barFrame: GOLD },
};

export class EnemySprite extends Container {
  readonly style: AttackStyle;
  private readonly figure: FigureBody;
  private readonly aura = new Graphics();
  private readonly enrageAura = new Graphics();
  private readonly frenzyAura = new Graphics(); // red ground pool while the boss is Frenzied
  private readonly castBar = new Graphics(); // under-boss cast bar while channeling a special
  private readonly rankAura = new Graphics(); // ground pulse marking an elite / a world boss
  private readonly look: RankLook;
  private readonly hpBg = new Graphics();
  private readonly hpBar = new Graphics();
  private readonly tpRing = new Graphics();
  private readonly cx: number; // the body's horizontal centre (container-local; the art is mirrored)
  private readonly barY: number; // HP-bar y (above the figure), container-local
  private readonly cy: number; // body-centre y for auras/cast (container-local, negative = up)
  private readonly halfW: number; // half the body's width
  private readonly auraScale: number;
  private readonly deathHoldMs: number;
  private flash = 0;
  private castMs = 0;
  private castColor = 0xffffff;
  private elapsed = 0;
  private materializeMs = 0;
  private lastX = 0;
  private moveGraceMs = 0; // >0 while recently moving → keep the run loop (anti-flicker)
  private deathMs = 0; // >0 once dying — counts the corpse hold down to removal
  private dying = false;
  private prevAlive = true;
  private hpBgY = Number.NaN; // y the static HP-bar backdrop was last drawn at (rebuild only on change)
  private barLift = 0; // px the HP bar is raised to dodge a crowded neighbour's bar (set by GameStrip)

  constructor(c: Combatant, sheet: FigureSheet, rank: EnemyRank) {
    super();
    this.style = c.enemyMagic === true ? 'caster' : c.range >= RANGE.ranged ? 'ranged' : 'melee';
    this.look = RANK[rank];
    // The standing figure's box, mirrored (the art faces right; enemies face the party on their left).
    const [left, top, right] = sheet.meta.box;
    const height = -top;
    this.cx = -Math.round((left + right) / 2);
    this.halfW = (right - left) / 2;
    this.barY = FEET_Y + top - BAR_H - 3;
    this.cy = FEET_Y + Math.round(top / 2);
    this.auraScale = Math.max(0.8, Math.min(2.2, height / 40));
    const death = sheet.meta.anims[DEATH];
    this.deathHoldMs = death === undefined ? DEATH_FADE_MS : clipMs(death);

    this.figure = new FigureBody(sheet, -1);
    this.figure.position.set(0, FEET_Y);
    // The rank rings + frenzy pool sit on the ground UNDER the feet, then enrageAura behind the
    // body; HP bar + cast bar on top.
    this.addChild(this.rankAura, this.frenzyAura, this.enrageAura, this.figure, this.aura, this.hpBg, this.hpBar, this.castBar, this.tpRing);
  }

  /** Begin the teleport-in materialise (grow + fade-in + ring). */
  spawnIn(): void {
    this.materializeMs = SPAWN_FX_MS;
    this.alpha = 0;
  }

  /** A hit landed on this enemy: flash, and flinch if it is not in the middle of something. */
  flashHit(): void {
    this.flash = 1;
    this.figure.clips.react(HURT_CLIP, HURT_GAP_MS);
  }

  /** Raise this enemy's HP bar by `px` so it doesn't sit on top of a neighbour's bar when
   *  enemies bunch at the same x (GameStrip computes the crowding, like it does for heroes). */
  setBarLift(px: number): void {
    this.barLift = px;
  }

  // The attack clip carries its own motion (kept so the API matches HeroSprite).
  lungeAttack(): void { /* the attack clip carries the motion */ }

  /** Play the creature's attack animation. */
  swing(): void {
    this.figure.clips.act(ATTACK_CLIP);
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
    this.place(x, groundY);

    if (this.prevAlive && !c.alive) this.startDeath();
    this.prevAlive = c.alive;

    // Held move-grace: any recent motion keeps the run loop alive through the bursty
    // easing / frozen-camera gaps, so it never resets to idle-then-run mid-stride.
    if (c.alive && Math.abs(x - this.lastX) > 0.15) this.moveGraceMs = MOVE_GRACE_MS;
    else this.moveGraceMs = Math.max(0, this.moveGraceMs - dtMs);
    this.lastX = x;
    const moving = c.alive && this.moveGraceMs > 0;

    this.flash = Math.max(0, this.flash - dtMs / 220);
    const enraged = c.isBoss === true && c.alive && (c.fightMs ?? 0) > (c.enrageMs ?? Number.POSITIVE_INFINITY);
    this.figure.setTint(this.flash > 0 ? 0xffd0d0 : enraged ? 0xff9a86 : 0xffffff);

    this.figure.update(dtMs, moving);
    this.drawHpBar(c, groundY);
    this.castMs = Math.max(0, this.castMs - dtMs);
    this.drawAura(c);
    this.drawEnrage(enraged);
    this.drawFrenzy(c);
    this.drawCastBar(c);
    this.drawRankAura(c.alive);
    this.applyMaterialize(dtMs);
    this.tickDeath(dtMs);
  }

  /** Drive the sprite after its combatant has been pruned from the sim — keep playing the
   *  death clip (or, if it never actually died, fade it out quickly). Holds its last world
   *  position (x tracks the camera so the corpse doesn't drift). */
  updateOrphan(x: number, groundY: number, dtMs: number): void {
    this.elapsed += dtMs;
    this.place(x, groundY);
    if (!this.dying) {
      // Pruned while still "alive" (a stage/wave reset, not a kill) → no death anim, fade fast.
      this.dying = true;
      this.deathMs = PRUNED_FADE_MS;
      this.hideLifeBar();
      this.rankAura.clear();
    }
    this.figure.update(dtMs, false);
    this.tickDeath(dtMs);
  }

  // Whole art pixels: the figure is drawn 1 art pixel = 1 strip pixel, on the backdrop's grid.
  private place(x: number, groundY: number): void {
    this.x = Math.round(x);
    this.y = groundY - FEET_BELOW_ORIGIN;
  }

  private startDeath(): void {
    if (this.dying) return;
    this.dying = true;
    this.deathMs = this.deathHoldMs;
    this.figure.clips.die();
    this.hideLifeBar();
  }

  private hideLifeBar(): void {
    this.hpBg.visible = false;
    this.hpBar.visible = false;
  }

  // Count the corpse hold down; fade out over the final stretch so it dissolves rather than
  // popping. The driver removes the sprite once isExpired().
  private tickDeath(dtMs: number): void {
    if (!this.dying) return;
    this.deathMs = Math.max(0, this.deathMs - dtMs);
    this.alpha = Math.min(this.alpha, this.deathMs > DEATH_FADE_MS ? 1 : Math.max(0, this.deathMs / DEATH_FADE_MS));
  }

  private drawHpBar(c: Combatant, groundY: number): void {
    if (this.dying) { this.hideLifeBar(); return; }
    this.hpBg.visible = true;
    this.hpBar.visible = true;
    const { barW, barFrame } = this.look;
    const x = this.cx - barW / 2;
    // Clamp inside the strip: the strip's top edge is at container-local -(groundY - FEET_Y) —
    // a very tall boss's bar pins below the HUD's boss plate instead of slipping under it or off
    // the strip. barLift raises the bar (more negative y) to dodge a crowded neighbour; the same
    // clamp keeps a lifted bar on-screen.
    const y = Math.max(this.barY - this.barLift, -(groundY - FEET_Y) + STRIP_TOP_CLEAR);
    const frac = c.maxHp > 0 ? Math.max(0, Math.min(1, c.hp / c.maxHp)) : 0;
    // The backdrop is static geometry — only re-tessellate it when its y actually moves
    // (a tall boss's bar pinned against the strip top as the camera shifts).
    if (y !== this.hpBgY) {
      this.hpBgY = y;
      this.hpBg.clear();
      if (barFrame !== null) this.hpBg.rect(x - 1, y - 1, barW + 2, BAR_H + 2).fill({ color: barFrame });
      this.hpBg.rect(x, y, barW, BAR_H).fill({ color: hexToNum('#3a2030') });
    }
    this.hpBar.clear();
    this.hpBar.rect(x, y, Math.round(barW * frac), BAR_H).fill({ color: hexToNum('#c0473a') });
    // WoW-style absorb overlay (drawn over the HP fill), should an enemy ever be shielded.
    drawShieldBar(this.hpBar, x, y, barW, BAR_H, totalShield(c.effects), c.maxHp, this.elapsed);
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
    g.ellipse(this.cx, this.cy, r, r * 1.1).stroke({ color: TP_RING, width: 2, alpha: (1 - k) * 0.9 });
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 + this.elapsed / 60;
      g.circle(this.cx + Math.cos(a) * r * 0.8, this.cy + Math.sin(a) * r * 0.8, 1.4).fill({ color: TP_BEAM, alpha: (1 - k) * 0.9 });
    }
    if (this.materializeMs <= 0) { this.alpha = 1; g.visible = false; }
  }

  // Rank marker (an elite's white rings, a world boss's gold ones): concentric rings on the
  // ground beneath the feet that expand outward and fade, staggered so a new one is always
  // growing — a non-stop pulse. Flattened ellipses (y ≈ 0.4·x) so they read as lying on the floor.
  private drawRankAura(alive: boolean): void {
    this.rankAura.clear();
    const rings = this.look.rings;
    if (rings === null || !alive) return;
    const cy = FEET_Y; // ground line at the feet
    const maxR = rings.reach;
    const FLAT = 0.4; // ground-plane flatten (y radius ÷ x radius)
    // Soft pulsing base glow so the marker always reads even between ring crests.
    const pulse = 0.6 + 0.4 * Math.sin(this.elapsed / 360);
    this.rankAura.ellipse(this.cx, cy, maxR * 0.55, maxR * 0.55 * FLAT).fill({ color: rings.color, alpha: 0.1 * pulse });
    const PERIOD = 1250; // ms for one ring to travel centre → edge
    const RINGS = 4;
    for (let i = 0; i < RINGS; i++) {
      const t = (this.elapsed / PERIOD + i / RINGS) % 1; // staggered 0→1 progress
      const r = t * maxR;
      const alpha = (1 - t) * 0.75; // brightest newborn at the centre, fades as it grows
      if (alpha <= 0.01 || r < 0.5) continue;
      this.rankAura.ellipse(this.cx, cy, r, r * FLAT).stroke({ color: rings.color, width: 1.5, alpha });
    }
  }

  private drawEnrage(enraged: boolean): void {
    this.enrageAura.clear();
    if (!enraged) return;
    const { cx, cy } = this;
    const s = this.auraScale;
    const pulse = 0.5 + 0.5 * Math.sin(this.elapsed / 110);
    for (let r = 0; r < 3; r++) {
      this.enrageAura.circle(cx, cy, (13 + r * 5 + pulse * 3) * s).stroke({ color: 0xff3322, width: 2, alpha: (0.45 - r * 0.12) * (0.5 + 0.5 * pulse) });
    }
    for (let i = 0; i < 7; i++) {
      const ang = -Math.PI / 2 + (i - 3) * 0.3;
      const base = 9 * s;
      const len = base + (7 + 5 * Math.abs(Math.sin(this.elapsed / 90 + i * 1.3))) * s;
      this.enrageAura
        .moveTo(cx + Math.cos(ang) * base, cy + Math.sin(ang) * base)
        .lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len)
        .stroke({ color: 0xff5a2a, width: 2, alpha: 0.4 + 0.4 * pulse });
    }
  }

  // Frenzy: a red aura pooled on the ground at the boss's feet while the attack-speed buff
  // is up (distinct from the body-centred enrage flames above).
  private drawFrenzy(c: Combatant): void {
    this.frenzyAura.clear();
    if (!c.alive || !hasFrenzy(c.effects)) return;
    drawFrenzyGround(this.frenzyAura, this.cx, FEET_Y, this.auraScale, this.elapsed);
  }

  // A fast cast bar UNDER the boss while it channels a special (Frenzy / Mortal Wound),
  // filling over the cast's windup — telegraphs the incoming ability. Colored per ability.
  private drawCastBar(c: Combatant): void {
    this.castBar.clear();
    const ch = c.casting;
    if (!c.alive || this.dying || ch === undefined || ch.totalMs <= 0) return;
    const frac = Math.max(0, Math.min(1, 1 - ch.remainingMs / ch.totalMs));
    const w = Math.max(this.look.barW, 34);
    const x = this.cx - w / 2;
    const y = FEET_Y + 3; // just below the feet, on the ground in front of the boss
    const col = ch.key === 'boss_mortal_wound' ? hexToNum('#c061ff') : hexToNum('#ff7a2a');
    this.castBar.rect(x - 1, y - 1, w + 2, 5).fill({ color: hexToNum('#160b12'), alpha: 0.9 }); // backdrop
    const fillW = Math.max(1, Math.round(w * frac));
    this.castBar.rect(x, y, fillW, 3).fill({ color: col });
    this.castBar.rect(x, y, fillW, 1).fill({ color: 0xffffff, alpha: 0.5 }); // top sheen
    this.castBar.rect(x + fillW - 1, y, 1, 3).fill({ color: 0xffffff, alpha: 0.85 }); // leading edge
  }

  // The vertical band auras play over, in container-local coords. Shared by drawAura and
  // markPoint so the ranger's ultimate fly-in lands exactly on the persistent reticle.
  private auraRegion(): AuraRegion {
    return {
      cx: this.cx,
      topY: this.barY + 8,
      botY: FEET_Y,
      cy: this.cy,
      halfW: Math.max(9, Math.min(this.halfW * 0.7, 26)),
      scale: this.auraScale,
      elapsed: this.elapsed,
    };
  }

  /** Where the Mark-of-the-Hunter reticle sits on this body (parent coords) and its radius —
   *  the ranger's ult crosshair flies in and locks onto this exact spot. */
  markPoint(): { x: number; y: number; radius: number } {
    const r = this.auraRegion();
    return { x: this.x + r.cx, y: this.y + r.cy, radius: crosshairRadius(r) };
  }

  /** This enemy's feet on the ground line (parent coords) — where an on-target effect such as
   *  the Priest's holy strike is seated so it rises up from the feet. */
  feetPoint(): { x: number; y: number } {
    return { x: this.x + this.cx, y: this.y + FEET_Y };
  }

  private drawAura(c: Combatant): void {
    this.aura.clear();
    const { cx, cy } = this;
    const s = this.auraScale;
    if (this.castMs > 0) {
      const t = this.castMs / CAST_MS;
      this.aura.circle(cx, cy, ((1 - t) * 15 + 5) * s).stroke({ color: this.castColor, width: 2, alpha: t });
    }
    if (!c.alive) return;
    // Bold category overlays — enemies most often wear DEBUFFS (red down-arrows from
    // Debilitating Cleave / Frozen Trap, etc.) or the ranger's MARK reticle, drawn over the
    // figure's vertical span.
    const cats = auraCategories(c.effects);
    drawCategoryAuras(this.aura, cats, this.auraRegion());
  }
}
