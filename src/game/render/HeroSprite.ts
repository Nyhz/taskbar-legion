import { AnimatedSprite, Container, Graphics, Text } from 'pixi.js';
import type { Ticker } from 'pixi.js';
import type { Combatant } from '@/sim/world';
import { effectDef } from '@/data/effects';
import { classDef } from '@/data/classes';
import { type AttackStyle, RESPAWN_MS } from '@/data/field';
import { hexToNum } from '@/styles/palette';
import { isInvulnerable, INVULN_YELLOW, isEnraged } from './fx';
import { auraCategories, drawCategoryAuras, totalShield, drawShieldBar, drawMortalWoundCrosses, hasMortalWound, drawHolyGround } from './effectAuras';
import { FigureBody } from './FigureBody';
import type { Texture } from 'pixi.js';
import { getHealEffectFrames, getBattleEnrageFrames, getHolyStrikeFrames } from './characterFrames';
import { FEET_BELOW_ORIGIN } from './figureData';
import { heroFigure } from './figureTextures';
import { ATTACK_CLIP, BLOCK_CLIP, HURT_CLIP, heroAbilityClip } from './heroClips';

const MS_PER_FRAME = 1000 / 60; // Pixi AnimatedSprite.update expects ticker-frame units
const HEAL_FX_FPS = 14;
const ENRAGE_FX_FPS = 14; // cadence of the looping Battle Enrage swirl
// Mend + Battle Enrage share the same 128px on-ally sheet geometry, so they share a transform:
// seated with the sheet's BASE at the hero's feet (anchorY 1) and the same scale — so the ult
// swirl reads at the same size/height as the heal it tops up. These are sheets from before the
// redesign, drawn for bigger bodies: halved to rise about one and a half heroes high.
const ALLY_FX_SCALE = 0.5;
const ALLY_FX_ANCHOR_Y = 1; // frame bottom sits on the feet → the effect rises from the feet up

// A hero display object: its figure (the redesign's art, one per class — FigureBody) + HP bar +
// effect aura (twinkling stars for HoTs/buffs) + buff/debuff pips + two ability cooldown pips
// (top-left) + a cast burst + a death/respawn countdown. Reads sim state; never mutates it.
// The container's origin is FEET_BELOW_ORIGIN above the feet (GameStrip aims at it); the figure
// stands with its feet exactly on the ground line it is given.

// How long the walk animation keeps playing after the last tick the hero actually moved.
// A bit over one sim tick (100ms) so a single hold-position tick mid-travel doesn't snap
// the sprite to its idle pose and back — it settles to idle only once truly stopped.
const MOVE_GRACE_MS = 140;

const CD_READY = hexToNum('#e8c34c'); // ability charged
const CD_CHARGING = hexToNum('#4a78d6'); // ability recharging (timed cooldown)
const CD_CHARGE = hexToNum('#46c98b'); // charge-gated ability banking toward its next cast
const CAST_MS = 340; // cast-burst ring lifetime
const TP_BEAM = hexToNum('#fff2a8'); // teleport upward beam / sparks
const TP_RING = hexToNum('#ffe27a'); // teleport charge ring
const RECRUIT_SPAWN_MS = 650; // first-recruit materialise-in (the teleport-IN half of a respawn)

// "Ghost"/delayed-damage HP bar: when a hero takes a hit, the chunk it's about to lose
// lingers in bright red, then drains down to the real value — so you can read how much a
// single hit cost. Held briefly for legibility, then drained at a steady fraction/ms.
const GHOST_RED = hexToNum('#ff3b3b'); // the about-to-be-lost slice
const GHOST_HOLD_MS = 240; // pause before the red slice starts draining
const GHOST_DRAIN_PER_MS = 0.0016; // bar-fractions drained per ms (~full bar in ~625ms)

// Overhead HUD geometry (HP bar, buff/debuff pips, ability-cooldown pips), in container-local
// coords (negative y = up). The heroes' figures stand 35–40 px tall with their feet at FEET_Y, so
// one HUD seated over the tallest head fits every class. `bodyCx` is the single horizontal centre
// for the whole cluster — the HP bar, the pip row (centred by count) and the effect aura all
// centre on it — and it is where the figures' bodies are (a little ahead of their root column).
// Cooldown pips tuck just to the left of the bar.
interface HudLayout {
  bodyCx: number; barY: number; barW: number; barH: number;
  pipY: number; pipSize: number; pipStep: number;
  cdY: number; cdStep: number; cdW: number; cdH: number;
  labelY: number; labelSize: number;
}

const CD_GAP = 2; // px between the cooldown pips and the HP bar's left edge

// Container-local y of the hero's feet (the ground line).
const FEET_Y = FEET_BELOW_ORIGIN;
const HERO_HEIGHT = 40; // the tallest hero's standing figure (the knight's plume, the priest's staff)
const BODY_MID_Y = FEET_Y - 18; // the middle of the body: cast ring, shield bubble, teleport ring

const HUD: HudLayout = {
  bodyCx: 4, barY: FEET_Y - HERO_HEIGHT - 6, barW: 20, barH: 3,
  pipY: FEET_Y - HERO_HEIGHT - 14, pipSize: 3, pipStep: 5,
  cdY: FEET_Y - HERO_HEIGHT - 12, cdStep: 6, cdW: 3, cdH: 5,
  labelY: FEET_Y - HERO_HEIGHT - 7, labelSize: 9,
};
const AURA_SCALE = 0.8; // glyph size of the category auras / holy ground for a ~40 px body
// A hurt flinch plays at most this often, so a hero under a hail of blows still reads as fighting.
const HURT_GAP_MS = 700;
// A fallen hero stays solid this long (the heroes' death clips run 2.2–2.4 s), then fades to a ghost.
const DEATH_SHOWN_MS = 2400;
// The classes whose basic attack lands a holy strike ON the target instead of flying there.
const HOLY_STRIKE_CLASSES: ReadonlySet<string> = new Set(['priest']);

/** Left x of the HP bar — centred on the body. */
function barLeft(h: HudLayout): number {
  return h.bodyCx - h.barW / 2;
}

export class HeroSprite extends Container {
  readonly style: AttackStyle;
  private readonly classKey: string;
  private readonly figure: FigureBody;
  private readonly hud: HudLayout = HUD;
  private readonly hpBg = new Graphics();
  private readonly hpBar = new Graphics();
  private readonly holyGround = new Graphics(); // Retribution Aura: golden ground halo at the feet
  private readonly aura = new Graphics(); // ongoing-effect stars + cast burst
  private readonly pips = new Container();
  private readonly cdPips = new Graphics(); // up to 2 ability cooldown indicators
  private readonly tpRing = new Graphics(); // teleport charge ring + beam (counter-scaled)
  private readonly respawnLabel = new Text({ text: '', style: { fontFamily: 'monospace', fontSize: 9, fill: hexToNum('#bcd2ff'), fontWeight: 'bold' } });
  // Knight-only ultimate indicator: a "U" badge that reads gold when the Last Stand
  // charge is up and grey + crossed-out once it's been spent this stage.
  private readonly ultLabel = new Text({ text: 'U', style: { fontFamily: 'monospace', fontSize: 8, fill: hexToNum('#e8c34c'), fontWeight: 'bold' } });
  private readonly ultCross = new Graphics();
  private readonly isKnight: boolean;
  // Heal sparkle shown ON this hero whenever a Priest heals it.
  private readonly healFx: AnimatedSprite | null;
  // Battle Enrage swirl looped over this hero while the Priest ult buff is on it.
  private readonly enrageFx: AnimatedSprite | null;
  private readonly fxShim = { deltaTime: 0 } as unknown as Ticker;
  private prevAlive = true; // tracks the alive→dead / dead→alive edge to drive death/revive
  private flash = 0;
  private castMs = 0;
  private castColor = 0xffffff;
  private elapsed = 0;
  private hpGhost = 1; // lagging HP fraction → the red "about to lose" slice trails the real bar
  private prevHpFrac = 1; // last frame's real HP fraction → detects the exact frame a hit lands
  private ghostHoldMs = 0; // >0 while the red slice is held still before it starts draining
  private moveGraceMs = 0; // >0 while recently moving → play run; 0 → idle
  private teleporting = false;
  private teleportK = 1; // 1 = fully present, 0 = fully dematerialised (mid-teleport)
  private spawnMs = 0; // >0 while a freshly-recruited hero is materialising in (drops top-down into formation)
  private deadMs = 0; // time since this hero fell (0 while alive)
  private hudLift = 0; // px the overhead HUD is raised to dodge a crowded neighbour

  constructor(classKey: string) {
    super();
    this.classKey = classKey;
    this.style = classDef(classKey).style;
    this.isKnight = classKey === 'knight';
    // Every class has a figure, loaded before the first frame (GameStrip.init → loadHeroFigures).
    const sheet = heroFigure(classKey);
    if (sheet === null) throw new Error(`No figure loaded for the hero class ${classKey}`);
    this.figure = new FigureBody(sheet);
    const h = this.hud;
    this.hpBg.rect(barLeft(h), h.barY, h.barW, h.barH).fill({ color: hexToNum('#3a2030') });
    this.respawnLabel.anchor.set(0.5, 1);
    this.respawnLabel.x = h.bodyCx;
    this.respawnLabel.y = h.labelY;
    this.respawnLabel.style.fontSize = h.labelSize;
    // Ult badge sits just to the RIGHT of the HP bar, level with the cooldown pips.
    this.ultLabel.anchor.set(0.5, 0.5);
    this.ultLabel.position.set(barLeft(h) + h.barW + 5, h.cdY + h.cdH / 2);
    this.ultCross.position.set(this.ultLabel.x, this.ultLabel.y);
    this.ultLabel.visible = false;
    this.ultCross.visible = false;
    this.healFx = this.makeHealFx(h.bodyCx);
    this.enrageFx = this.makeEnrageFx(h.bodyCx);
    // The figure's root column and ground row sit at (0, FEET_Y): its feet are on the ground line.
    this.figure.position.set(0, FEET_Y);
    // holyGround sits UNDER the body so the halo pools on the ground beneath the priest.
    this.addChild(this.hpBg, this.hpBar, this.holyGround, this.figure, this.aura, this.pips, this.cdPips, this.respawnLabel, this.ultLabel, this.ultCross, this.tpRing);
    if (this.enrageFx !== null) this.addChild(this.enrageFx); // enrage swirl over the body
    if (this.healFx !== null) this.addChild(this.healFx); // sparkle on top of everything
    this.tpRing.visible = false;
  }

  /** Drive the teleport effect from a single 0→1 progress over the whole out+in
   *  sequence (0 = present, 0.5 = fully gone, 1 = present again). `phase < 0` ends it
   *  and restores the sprite. GameStrip orchestrates this party-wide on zone change/wipe. */
  setTeleport(phase: number): void {
    if (phase < 0) {
      this.teleporting = false;
      return;
    }
    this.teleporting = true;
    this.teleportK = Math.abs(1 - 2 * phase); // 1 at the ends, 0 at the dematerialised midpoint
  }

  /** Play the teleport-IN materialise on its own — a freshly-recruited hero drops top-down
   *  into its formation slot (same yellow ring + beam + lift FX as a post-wipe respawn),
   *  instead of just popping into place. Self-driven (counts down in `update`). */
  spawnIn(): void {
    this.spawnMs = RECRUIT_SPAWN_MS;
  }

  /** A point just above this hero's head (parent coords) — where the ranger's ultimate
   *  crosshair spawns before it flies off to lock onto the boss. */
  headPoint(): { x: number; y: number } {
    return { x: this.x, y: this.y + this.hud.barY };
  }

  /** Raise the whole overhead HUD by `px` (0 = default). GameStrip lifts a rear hero's
   *  HUD when it would overlap the party member just ahead, so crowded HP bars / pips stay
   *  legible. Shifts only the HUD layer — the body, aura and teleport FX are untouched. */
  setHudLift(px: number): void {
    if (px === this.hudLift) return;
    this.hudLift = px;
    const h = this.hud;
    this.hpBg.y = -px;
    this.hpBar.y = -px;
    this.pips.y = -px;
    this.cdPips.y = -px;
    this.respawnLabel.y = h.labelY - px;
    const ultY = h.cdY + h.cdH / 2 - px;
    this.ultLabel.y = ultY;
    this.ultCross.y = ultY;
  }

  /** Play a colored cast burst (ability flourish on the caster). */
  castBurst(color: number): void {
    this.castMs = CAST_MS;
    this.castColor = color;
  }

  flashHit(): void {
    this.flash = 1;
  }

  /** The holy strike that lands on the target of this hero's basic attack (Priest), or null —
   *  the driver plays it on the enemy instead of throwing a projectile. */
  get projectileFrames(): Texture[] | null {
    return HOLY_STRIKE_CLASSES.has(this.classKey) ? getHolyStrikeFrames() : null;
  }

  /** Play the shield-block reaction (the Knight has one) — fired only when an attack is
   *  actually blocked (block-stat proc), and never interrupts an attack or an ability. */
  blockReact(): void {
    this.figure.clips.react(BLOCK_CLIP);
  }

  /** The figures' attack frames carry their own forward motion: nothing to add. Kept so the
   *  driver can treat heroes and enemies alike. */
  lungeAttack(): void { /* the attack clip carries the motion */ }

  /** Play the attack animation for a hit this hero landed: its basic `attack`, or — when the
   *  hit came from an ability — that ability's clip (heroClips). An ability cuts a basic attack
   *  in progress; otherwise a clip in progress finishes first (figureClip). */
  attack(abilityKey?: string): void {
    if (abilityKey === undefined) this.figure.clips.act(ATTACK_CLIP);
    else this.figure.clips.act(heroAbilityClip(this.classKey, abilityKey), true);
  }

  /** Play the clip of an ability this hero just cast (a heal, a buff, a shout, a blow). */
  cast(abilityKey: string): void {
    this.figure.clips.act(heroAbilityClip(this.classKey, abilityKey), true);
  }

  /** Play a take-a-hit flinch. Never interrupts an attack or an ability. */
  hurtReact(): void {
    this.figure.clips.react(HURT_CLIP, HURT_GAP_MS);
  }

  /** Show the heal sparkle ON this hero (it's the one being healed by a Priest). */
  showHealEffect(): void {
    const fx = this.healFx;
    if (fx === null) return;
    fx.visible = true;
    fx.alpha = 1;
    fx.gotoAndPlay(0);
  }

  /** Build the on-ally heal overlay from the Mend effect frames (a 5×3 grid of 128px cells —
   *  see characterFrames). The pillar content nearly fills the frame with its base at the very
   *  bottom, so we anchor the frame bottom on the feet (ALLY_FX_ANCHOR_Y) and the effect rises
   *  from there, at ALLY_FX_SCALE (shared with the enrage swirl). Null if not loaded. */
  private makeHealFx(bodyCx: number): AnimatedSprite | null {
    const frames = getHealEffectFrames();
    if (frames === null || frames.length === 0) return null;
    const fx = new AnimatedSprite(frames);
    fx.autoUpdate = false;
    fx.anchor.set(0.5, ALLY_FX_ANCHOR_Y); // seat the sheet's base on the hero's feet
    fx.scale.set(ALLY_FX_SCALE); // matches the enrage swirl
    fx.position.set(bodyCx, FEET_Y);
    fx.loop = false;
    fx.animationSpeed = HEAL_FX_FPS / 60;
    fx.visible = false;
    fx.onComplete = (): void => {
      fx.visible = false;
    };
    return fx;
  }

  update(c: Combatant, x: number, groundY: number, dtMs: number, wipeHold = false): void {
    this.elapsed += dtMs;
    this.visible = true;
    // Moving = closed distance on a recent sim tick (movedThisTick), held briefly past the
    // last move so a momentary hold doesn't stutter to idle. Standing heroes play their idle.
    if (c.alive && c.movedThisTick === true) this.moveGraceMs = MOVE_GRACE_MS;
    else this.moveGraceMs = Math.max(0, this.moveGraceMs - dtMs);
    const moving = c.alive && this.moveGraceMs > 0;
    // Whole art pixels: the figure is drawn 1 art pixel = 1 strip pixel, on the backdrop's grid.
    this.x = Math.round(x);
    this.y = groundY - FEET_BELOW_ORIGIN;
    // Faded when dead — but a reviving hero stays a touch brighter so its respawn
    // bar + countdown read clearly through the fade. During a full-party wipe hold the
    // fallen hero is NOT reviving (the teleport whisks it away in ~2s, not 60s): keep it
    // prominent so the death animation reads, and suppress the misleading respawn bar.
    const reviving = !c.alive && c.respawnMs !== undefined && !wipeHold;
    // The fall itself is shown solid: the fade only sets in once the death clip has played.
    this.deadMs = c.alive ? 0 : this.deadMs + dtMs;
    const falling = !c.alive && this.deadMs < DEATH_SHOWN_MS;
    this.alpha = c.alive || falling ? 1 : wipeHold ? 0.9 : reviving ? 0.55 : 0.25;

    // hit flash → brief darkening tint pulse (tint multiplies, so it dims)
    this.flash = Math.max(0, this.flash - dtMs / 220);
    const tint = this.flash > 0 ? 0xff7777 : 0xffffff;

    // Drive the death → revive edges so the body plays its death one-shot (then holds its
    // last frame) and resets to idle on respawn.
    if (this.prevAlive && !c.alive) this.figure.clips.die();
    else if (!this.prevAlive && c.alive) this.figure.clips.revive();
    this.figure.setTint(tint);
    this.figure.setBodyAlpha(c.alive || wipeHold || falling ? 1 : 0.5); // keep the corpse solid through a wipe hold
    this.figure.update(dtMs, moving); // death anim advances + holds; idle/run when alive

    // HP bar — while dead-and-reviving it becomes a respawn-progress bar instead.
    const h = this.hud;
    const bx = barLeft(h);
    this.hpBar.clear();
    if (reviving) {
      const prog = Math.max(0, Math.min(1, 1 - (c.respawnMs ?? 0) / RESPAWN_MS));
      this.hpBar.rect(bx, h.barY, Math.max(1, Math.round(h.barW * prog)), h.barH).fill({ color: hexToNum('#4a78d6') });
      this.respawnLabel.text = `${Math.ceil((c.respawnMs ?? 0) / 1000)}s`;
      this.respawnLabel.visible = true;
      this.hpGhost = prog; // don't carry a stale red slice into/out of the respawn bar
      this.ghostHoldMs = 0;
    } else {
      const frac = c.maxHp > 0 ? Math.max(0, Math.min(1, c.hp / c.maxHp)) : 0;
      // Advance the ghost: heals (or first frame) snap it up; a drop refreshes the hold,
      // then it drains toward the real fraction so the lost slice reads as a red chunk.
      if (frac >= this.hpGhost) {
        this.hpGhost = frac;
        this.ghostHoldMs = 0;
      } else {
        if (frac < this.prevHpFrac) this.ghostHoldMs = GHOST_HOLD_MS; // a fresh hit this frame
        this.ghostHoldMs = Math.max(0, this.ghostHoldMs - dtMs);
        if (this.ghostHoldMs === 0) this.hpGhost = Math.max(frac, this.hpGhost - GHOST_DRAIN_PER_MS * dtMs);
      }
      this.prevHpFrac = frac;
      this.hpBar
        .rect(bx, h.barY, Math.round(h.barW * frac), h.barH)
        .fill({ color: frac > 0.4 ? hexToNum('#4caf50') : hexToNum('#c0473a') });
      // Delayed-damage slice: the red chunk between the real bar and the lagging ghost.
      if (this.hpGhost > frac) {
        const gx = bx + Math.round(h.barW * frac);
        const gw = Math.max(1, Math.round(h.barW * (this.hpGhost - frac)));
        this.hpBar.rect(gx, h.barY, gw, h.barH).fill({ color: GHOST_RED });
      }
      // WoW-style absorb overlay: a yellow shell laid over the HP from the right edge,
      // drawn AFTER the fill so it sits on top, shrinking as the shield soaks hits.
      drawShieldBar(this.hpBar, bx, h.barY, h.barW, h.barH, totalShield(c.effects), c.maxHp, this.elapsed);
      this.respawnLabel.visible = false;
    }

    this.castMs = Math.max(0, this.castMs - dtMs);
    this.drawHolyGround(c);
    this.drawAura(c);
    this.drawPips(c);
    this.drawCooldowns(c, reviving);
    // A freshly-recruited hero materialises in (the respawn teleport-IN) on its first
    // frames: drive the teleport from 0 (gone, lifted up) → 1 (present, settled in slot).
    if (this.spawnMs > 0) {
      this.spawnMs = Math.max(0, this.spawnMs - dtMs);
      this.teleporting = this.spawnMs > 0;
      this.teleportK = 1 - this.spawnMs / RECRUIT_SPAWN_MS;
    }
    this.applyTeleport();
    this.updateEnrageFx(c, dtMs); // after teleport so it stands down while the body de/materialises
    this.drawUlt(c, reviving); // after teleport so it owns the badge's visibility
    this.advanceHealFx(dtMs);
    this.prevAlive = c.alive;
  }

  // Build the looping Battle Enrage swirl from its shared frames (a 5×3 grid of 128px cells,
  // see characterFrames). Seated at the feet with the SAME transform as the Mend effect
  // (ALLY_FX_ANCHOR_Y + ALLY_FX_SCALE) so the ult swirl reads at the same height/positioning as
  // a heal. Hidden until updateEnrageFx turns it on. Null if the sheet isn't loaded.
  private makeEnrageFx(bodyCx: number): AnimatedSprite | null {
    const frames = getBattleEnrageFrames();
    if (frames === null || frames.length === 0) return null;
    const fx = new AnimatedSprite(frames);
    fx.autoUpdate = false;
    fx.anchor.set(0.5, ALLY_FX_ANCHOR_Y); // same as Mend: seat the sheet's base on the feet
    fx.scale.set(ALLY_FX_SCALE); // same height as the Mend effect (shared on-ally geometry)
    fx.position.set(bodyCx, FEET_Y); // seated at the feet, matching Mend's positioning
    fx.loop = true;
    fx.animationSpeed = ENRAGE_FX_FPS / 60;
    fx.visible = false;
    return fx;
  }

  // Battle Enrage (Priest ult): loop the swirl over every buffed ally for the buff's whole
  // duration. Shown only while alive and not mid-teleport; advanced from our own dtMs.
  private updateEnrageFx(c: Combatant, dtMs: number): void {
    const fx = this.enrageFx;
    if (fx === null) return;
    const on = c.alive && !this.teleporting && isEnraged(c.effects);
    if (on && !fx.visible) { fx.visible = true; fx.gotoAndPlay(0); }
    else if (!on && fx.visible) { fx.visible = false; fx.stop(); }
    if (fx.visible && dtMs > 0) { this.fxShim.deltaTime = dtMs / MS_PER_FRAME; fx.update(this.fxShim); }
  }

  // Advance the heal-sparkle one-shot while it's playing (manual update — autoUpdate off).
  private advanceHealFx(dtMs: number): void {
    const fx = this.healFx;
    if (fx === null || !fx.visible || dtMs <= 0) return;
    this.fxShim.deltaTime = dtMs / MS_PER_FRAME;
    fx.update(this.fxShim);
  }

  // Knight-only ultimate badge: "U" in gold while Last Stand is charged, grey + crossed
  // out once spent this stage. Hidden mid-teleport, while dead/reviving, or pre-unlock.
  private drawUlt(c: Combatant, reviving: boolean): void {
    const has = this.isKnight && c.ult?.effect.type === 'deathBlock';
    if (this.teleporting || reviving || !c.alive || !has) {
      this.ultLabel.visible = false;
      this.ultCross.visible = false;
      return;
    }
    const ready = (c.ultCharge ?? 0) > 0;
    this.ultLabel.visible = true;
    this.ultLabel.style.fill = ready ? hexToNum('#e8c34c') : hexToNum('#5a5560'); // gold up / grey spent
    this.ultCross.clear();
    if (ready) {
      this.ultCross.visible = false;
    } else {
      const r = 4;
      this.ultCross.moveTo(-r, -r).lineTo(r, r).stroke({ color: hexToNum('#c0473a'), width: 1.5 });
      this.ultCross.visible = true;
    }
  }

  // Teleport: shrink + rise + fade the body (a yellow charge ring + upward beam stays
  // full-size around it), so the party flashes up out of the world and drops back in.
  // The ring is COUNTER-scaled (1/s) so the container's shrink doesn't shrink it too.
  private applyTeleport(): void {
    if (!this.teleporting) {
      if (this.scale.x !== 1) this.scale.set(1);
      if (!this.hpBg.visible) {
        // restore the HUD that applyTeleport hid (once, the frame teleport ends)
        this.hpBg.visible = true;
        this.hpBar.visible = true;
        this.pips.visible = true;
        this.cdPips.visible = true;
      }
      this.tpRing.visible = false;
      return;
    }
    const k = this.teleportK; // 1 = present, 0 = gone
    const s = Math.max(0.04, k);
    this.scale.set(s, s);
    this.y -= (1 - k) * 24; // lifts up as it (de)materialises
    this.figure.setBodyAlpha(k);
    // The overhead HUD reads as noise mid-teleport — hide it.
    this.hpBg.visible = false;
    this.hpBar.visible = false;
    this.pips.visible = false;
    this.cdPips.visible = false;
    this.respawnLabel.visible = false;

    const g = this.tpRing;
    g.visible = true;
    g.scale.set(1 / s); // cancel the container shrink so the ring stays full size
    g.clear();
    const cx = this.hud.bodyCx;
    const cy = BODY_MID_Y;
    const pulse = 0.55 + 0.45 * Math.sin(this.elapsed / 35);
    // upward beam — brightest as the body vanishes
    const beamA = (1 - k) * 0.85;
    if (beamA > 0.01) g.rect(cx - 2, cy - 26 - (1 - k) * 28, 4, 52 + (1 - k) * 44).fill({ color: TP_BEAM, alpha: beamA });
    for (let i = 0; i < 2; i++) {
      const r = 13 + i * 5;
      g.ellipse(cx, cy, r, r * 1.25).stroke({ color: TP_RING, width: 2, alpha: 0.3 + 0.5 * pulse });
    }
    for (let i = 0; i < 5; i++) {
      const a = this.elapsed / 90 + (i * Math.PI * 2) / 5;
      const rr = 6 + (i % 3) * 4;
      g.circle(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr - (1 - k) * 10, 1.4).fill({ color: TP_BEAM, alpha: 0.8 * pulse });
    }
  }

  // Retribution Aura: a golden holy halo pooled on the ground beneath the priest while the
  // passive party damage aura is slotted (it lives in c.abilities — see sim/loadout). It has
  // no ActiveEffect of its own, so this dedicated ground overlay is its only visual read.
  private drawHolyGround(c: Combatant): void {
    this.holyGround.clear();
    const active = c.alive && !this.teleporting && c.abilities.some((a) => a.def.aura?.stat === 'damageIncrease');
    if (!active) return;
    drawHolyGround(this.holyGround, this.hud.bodyCx, FEET_Y, AURA_SCALE, this.elapsed);
  }

  // Effect aura: twinkling diamond "stars" orbiting the hero while an ongoing effect
  // is active (gold for a Renew/HoT, cyan shield, violet buff, etc.) + a cast burst
  // ring that expands and fades on each ability cast.
  private drawAura(c: Combatant): void {
    this.aura.clear();
    const cx = this.hud.bodyCx; // centre the shield/stars on the same line as the body + HP bar
    const cy = BODY_MID_Y;
    if (this.castMs > 0) {
      const t = this.castMs / CAST_MS;
      this.aura.circle(cx, cy, (1 - t) * 15 + 5).stroke({ color: this.castColor, width: 2, alpha: t });
    }
    if (!c.alive) return;
    // Last Stand: a translucent yellow shield bubble around the hero while invulnerable.
    if (isInvulnerable(c.effects)) {
      const pulse = 0.16 + 0.1 * Math.abs(Math.sin(this.elapsed / 200));
      this.aura.circle(cx, cy, 22).fill({ color: INVULN_YELLOW, alpha: pulse });
      this.aura.circle(cx, cy, 22).stroke({ color: INVULN_YELLOW, width: 1.5, alpha: 0.75 });
    }
    // Battle Enrage (Priest ult) is NOT an aura: every buffed ally rhythmically SWELLS and
    // reddens (drawn in applyEnrage, after teleport, so it owns the body's scale + tint).
    // Bold category overlays: green up-arrows (offense buff), dancing shields (defense
    // buff), red down-arrows (debuff) — drawn over the body's vertical span.
    const cats = auraCategories(c.effects);
    const region = {
      cx,
      topY: FEET_Y - HERO_HEIGHT + 4,
      botY: FEET_Y - 2,
      cy: BODY_MID_Y, // heroes never wear the mark; the body's middle is fine
      halfW: this.hud.barW * 0.45,
      scale: AURA_SCALE,
      elapsed: this.elapsed,
    };
    drawCategoryAuras(this.aura, cats, region);
    // World-boss Mortal Wound: crossed-out heal crosses over the wounded tank (its generic
    // debuff overlay is suppressed so this is the sole, unmistakable read).
    if (hasMortalWound(c.effects)) drawMortalWoundCrosses(this.aura, region);
  }

  // Up to two ability cooldown pips at the TOP-LEFT of the hero (stacked vertically):
  // a small bar that fills as the ability recharges (gold ready, blue charging).
  private drawCooldowns(c: Combatant, reviving: boolean): void {
    this.cdPips.clear();
    const abilities = c.abilities.slice(0, 2);
    if (reviving || !c.alive || abilities.length === 0) return;
    const lay = this.hud;
    // Pips sit just to the LEFT of the HP bar — derived from the bar so they line up the
    // same way for every class regardless of bodyCx (no per-class overlap with the bar).
    const cdX = barLeft(lay) - CD_GAP - lay.cdW;
    abilities.forEach((a, i) => {
      const baseY = lay.cdY + i * lay.cdStep; // stacked vertically, top-left
      // Charge-gated abilities (e.g. Aimed Shot) have NO timed cooldown — they bank
      // charges per auto-attack and fire at toCast. Show that fill (green) so the pip
      // climbs as charges build instead of reading as forever-ready like a 0ms cooldown.
      const charge = a.def.charge;
      let ready: boolean;
      let fillFrac: number;
      let buildColor: number;
      if (charge !== undefined) {
        const banked = c.charges?.[a.def.key] ?? 0;
        ready = banked >= charge.toCast;
        fillFrac = Math.max(0, Math.min(1, banked / charge.toCast));
        buildColor = CD_CHARGE;
      } else {
        const remaining = c.cooldowns[a.def.key] ?? 0;
        const total = c.cooldownTotals?.[a.def.key] ?? 0;
        ready = remaining <= 0 || total <= 0;
        fillFrac = ready ? 1 : Math.max(0, Math.min(1, 1 - remaining / total));
        buildColor = CD_CHARGING;
      }
      this.cdPips.rect(cdX, baseY, lay.cdW, lay.cdH).fill({ color: hexToNum('#15121c') });
      const fillH = Math.max(1, Math.round(lay.cdH * fillFrac));
      this.cdPips.rect(cdX, baseY + (lay.cdH - fillH), lay.cdW, fillH).fill({ color: ready ? CD_READY : buildColor });
    });
  }

  // Buff/debuff pips double as DURATION gauges: each is a dark cell with a colored
  // column (green buff / red debuff) that drains DOWNWARD as the effect runs out — so a
  // nearly-full pip = lots of time left, an almost-empty one = about to expire. The dark
  // backdrop stays put so the remaining column reads clearly against the sprite.
  private drawPips(c: Combatant): void {
    this.pips.removeChildren();
    const lay = this.hud;
    const shown = c.effects.slice(0, 4);
    const w = lay.pipSize;
    const barH = lay.pipSize + 3; // a touch taller than wide so the drain is legible
    // Centre the pip row on the body so the buffs sit squarely over the sprite + HP bar.
    const rowW = shown.length > 0 ? (shown.length - 1) * lay.pipStep + w : 0;
    const startX = lay.bodyCx - rowW / 2;
    const baselineY = lay.pipY + lay.pipSize; // bottom edge the column drains down to
    const topY = baselineY - barH;
    shown.forEach((e, i) => {
      const def = effectDef(e.defKey);
      const x = startX + i * lay.pipStep;
      const total = e.totalMs ?? def.durationMs;
      const frac = total > 0 ? Math.max(0, Math.min(1, e.remainingMs / total)) : 1;
      const fillH = Math.max(1, Math.round(barH * frac));
      const g = new Graphics();
      g.rect(x, topY, w, barH).fill({ color: hexToNum('#0d0b12') }); // dark backdrop
      g.rect(x, baselineY - fillH, w, fillH).fill({ color: def.beneficial ? hexToNum('#4caf50') : hexToNum('#c0473a') });
      g.rect(x, topY, w, barH).stroke({ color: hexToNum('#000000'), width: 1, alpha: 0.5 }); // edge
      this.pips.addChild(g);
    });
  }
}
