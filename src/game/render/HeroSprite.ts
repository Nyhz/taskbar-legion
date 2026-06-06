import { AnimatedSprite, Container, Graphics, Text } from 'pixi.js';
import type { Ticker } from 'pixi.js';
import type { Combatant } from '@/sim/world';
import { effectDef } from '@/data/effects';
import { classDef } from '@/data/classes';
import { type AttackStyle, RESPAWN_MS } from '@/data/field';
import { hexToNum } from '@/styles/palette';
import { drawHero } from './textures';
import { drawSwing, SWING_MS } from './swing';
import { isInvulnerable, INVULN_YELLOW, isEnraged } from './fx';
import { auraCategories, drawCategoryAuras, totalShield, drawShieldBar, drawMortalWoundCrosses, hasMortalWound, drawHolyGround } from './effectAuras';
import { SpriteBody } from './SpriteBody';
import type { Texture } from 'pixi.js';
import type { CharFrames } from './characterFrames';
import { getCharacterFrames, getHealEffectFrames, getBattleEnrageFrames } from './characterFrames';

const MS_PER_FRAME = 1000 / 60; // Pixi AnimatedSprite.update expects ticker-frame units
const HEAL_FX_FPS = 14;
const ENRAGE_FX_FPS = 14; // cadence of the looping Battle Enrage swirl
// Mend + Battle Enrage share the same 128px on-ally sheet geometry, so they share a transform:
// seated with the sheet's BASE at the hero's feet (anchorY 1) and the same scale — so the ult
// swirl reads at the same size/height as the heal it tops up. Slightly smaller than before.
const ALLY_FX_SCALE = 0.78;
const ALLY_FX_ANCHOR_Y = 1; // frame bottom sits on the feet → the effect rises from the feet up

// A hero display object: procedural body + HP bar + effect aura (twinkling stars for
// HoTs/buffs) + buff/debuff pips + two ability cooldown pips (top-left) + a cast burst
// + a death/respawn countdown + a melee sword-swing arc. Reads sim state; never mutates
// it. Animation is cheap transform/draw tricks — deterministic-safe.

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

// Overhead HUD geometry (HP bar, buff/debuff pips, ability-cooldown pips). The bigger
// sprite knight needs a larger HUD lifted clear of its head; the small procedural
// bodies keep the original tight layout. All coords are container-local (origin at the
// ground line; negative y = up). bodyCx ≈ horizontal centre of the body.
// `bodyCx` is the horizontal centre of the body; the HP bar and the buff-pip row are
// both centred on it (the pip row is centred by count), so the cluster sits squarely
// over the sprite regardless of how many buffs are active. Cooldown pips tuck just to
// the left of the bar.
interface HudLayout {
  bodyCx: number; barY: number; barW: number; barH: number;
  pipY: number; pipSize: number; pipStep: number;
  cdY: number; cdStep: number; cdW: number; cdH: number;
  labelY: number; labelSize: number;
}

const CD_GAP = 3; // px between the cooldown pips and the HP bar's left edge

const PROC_HUD: HudLayout = {
  bodyCx: 6, barY: -16, barW: 16, barH: 3,
  pipY: -22, pipSize: 3, pipStep: 4,
  cdY: -28, cdStep: 8, cdW: 3, cdH: 6,
  labelY: -18, labelSize: 9,
};

// Sprite heroes (knight, ranger, priest) all render to ~55px tall with feet at SPRITE_FEET_Y,
// so their head tops align and one raised HUD fits every class. `bodyCx` is the single
// horizontal centre for the whole cluster: the sprite body is positioned on it, and the
// HP bar, pips and effect aura all centre on it — so they can never drift apart. Lifted +
// enlarged to clear the bigger, more zoomed-in bodies.
const SPRITE_HUD: HudLayout = {
  bodyCx: 5, barY: -54, barW: 36, barH: 6,
  pipY: -66, pipSize: 7, pipStep: 9,
  cdY: -66, cdStep: 9, cdW: 5, cdH: 7,
  labelY: -56, labelSize: 15,
};

// Container-local y where a sprite hero's feet sit (below the ground-line origin). Bumped
// for the taller strip + bigger bodies so they seat naturally on the grass.
const SPRITE_FEET_Y = 26;

/** Left x of the HP bar — centred on the body. */
function barLeft(h: HudLayout): number {
  return h.bodyCx - h.barW / 2;
}

export class HeroSprite extends Container {
  readonly style: AttackStyle;
  // Sprite-sheet classes (knight, ranger, priest) render from a SpriteBody; everything
  // else stays procedural. Null when no sheet exists for the class / it isn't loaded yet.
  private readonly spriteBody: SpriteBody | null;
  private readonly frames: CharFrames | null; // the class's loaded sheets (for its projectile)
  private readonly hud: HudLayout;
  private readonly body = new Graphics();
  private readonly feet = new Graphics();
  private readonly swingG = new Graphics();
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
  private readonly ultLabel = new Text({ text: 'U', style: { fontFamily: 'monospace', fontSize: 12, fill: hexToNum('#e8c34c'), fontWeight: 'bold' } });
  private readonly ultCross = new Graphics();
  private readonly isKnight: boolean;
  // Heal sparkle shown ON this hero whenever a Priest heals it (shared effect frames,
  // authored on the same 100px grid as the bodies, so it overlays the sprite squarely).
  private readonly healFx: AnimatedSprite | null;
  // Battle Enrage swirl looped over this hero while the Priest ult buff is on it.
  private readonly enrageFx: AnimatedSprite | null;
  private readonly fxShim = { deltaTime: 0 } as unknown as Ticker;
  private prevAlive = true; // tracks the alive→dead / dead→alive edge to drive death/revive
  private flash = 0;
  private lunge = 0;
  private swingMs = 0;
  private castMs = 0;
  private castColor = 0xffffff;
  private elapsed = 0;
  private hpGhost = 1; // lagging HP fraction → the red "about to lose" slice trails the real bar
  private prevHpFrac = 1; // last frame's real HP fraction → detects the exact frame a hit lands
  private ghostHoldMs = 0; // >0 while the red slice is held still before it starts draining
  private moveGraceMs = 0; // >0 while recently moving → play walk; 0 → hold idle pose
  private teleporting = false;
  private teleportK = 1; // 1 = fully present, 0 = fully dematerialised (mid-teleport)
  private spawnMs = 0; // >0 while a freshly-recruited hero is materialising in (drops top-down into formation)
  private hudLift = 0; // px the overhead HUD is raised to dodge a crowded neighbour

  constructor(classKey: string) {
    super();
    this.style = classDef(classKey).style;
    this.isKnight = classKey === 'knight';
    const frames = getCharacterFrames(classKey);
    this.frames = frames;
    this.spriteBody = frames !== null ? new SpriteBody(frames) : null;
    this.hud = this.spriteBody === null ? PROC_HUD : SPRITE_HUD;
    const h = this.hud;
    this.hpBg.rect(barLeft(h), h.barY, h.barW, h.barH).fill({ color: hexToNum('#3a2030') });
    this.respawnLabel.anchor.set(0.5, 1);
    this.respawnLabel.x = h.bodyCx;
    this.respawnLabel.y = h.labelY;
    this.respawnLabel.style.fontSize = h.labelSize;
    // Ult badge sits just to the RIGHT of the HP bar, level with the cooldown pips.
    this.ultLabel.anchor.set(0.5, 0.5);
    this.ultLabel.position.set(barLeft(h) + h.barW + 7, h.cdY + h.cdH / 2);
    this.ultCross.position.set(this.ultLabel.x, this.ultLabel.y);
    this.ultLabel.visible = false;
    this.ultCross.visible = false;
    this.healFx = this.makeHealFx(h.bodyCx);
    this.enrageFx = this.makeEnrageFx(h.bodyCx);
    if (this.spriteBody !== null) {
      // Anchored at its feet/body-centre so the torso centre lands exactly on the HUD's
      // bodyCx (HP bar + aura share it) and the feet sit ~y22 below the container origin.
      this.spriteBody.position.set(h.bodyCx, SPRITE_FEET_Y);
      // holyGround sits UNDER the body so the halo pools on the ground beneath the priest.
      this.addChild(this.hpBg, this.hpBar, this.holyGround, this.spriteBody, this.aura, this.pips, this.cdPips, this.respawnLabel, this.ultLabel, this.ultCross, this.tpRing);
    } else {
      drawHero(this.body, classKey);
      this.addChild(this.hpBg, this.hpBar, this.holyGround, this.feet, this.body, this.aura, this.swingG, this.pips, this.cdPips, this.respawnLabel, this.ultLabel, this.ultCross, this.tpRing);
    }
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

  /** True when this hero draws from a sprite sheet (knight, ranger, priest). */
  get usesSpriteBody(): boolean {
    return this.spriteBody !== null;
  }

  /** The class's animated projectile frames (Priest's magic bolt), or null — lets the
   *  driver throw the class's own bolt instead of the generic procedural fireball. */
  get projectileFrames(): Texture[] | null {
    return this.frames?.projectile ?? null;
  }

  /** Play the shield-block reaction (sprite heroes with a block sheet) — fired only when
   *  an attack is actually blocked (block-stat proc), and never interrupts a swing. */
  blockReact(): void {
    this.spriteBody?.block();
  }

  /** Step forward into a target when attacking (melee lunge / shooting recoil). Skipped
   *  for sprite heroes — their attack frames already carry the forward motion, so an
   *  added lunge reads as the whole sprite rebounding off the enemy. */
  lungeAttack(): void {
    if (this.spriteBody !== null) return;
    this.lunge = 1;
  }

  /** Play the attack animation. Sprite heroes play their own attack frames (sword swing
   *  / bow draw); procedural heroes draw the swing arc. `special` selects the reserved
   *  melee-ability swing (the knight's heavy attack) over an alternating basic auto. */
  swing(special = false): void {
    if (this.spriteBody !== null) this.spriteBody.attack(special);
    else this.swingMs = SWING_MS;
  }

  /** Play a take-a-hit flinch (sprite heroes with a hurt sheet). Won't interrupt a swing. */
  hurtReact(): void {
    this.spriteBody?.hurt();
  }

  /** Play the healer's heal-cast pose (no-op unless the class has a heal sheet — Priest). */
  supportCast(): void {
    this.spriteBody?.heal();
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
   *  from there; ALLY_FX_SCALE keeps it a touch smaller (shared with the enrage swirl). Null if
   *  not loaded. */
  private makeHealFx(bodyCx: number): AnimatedSprite | null {
    const frames = getHealEffectFrames();
    if (frames === null || frames.length === 0) return null;
    const fx = new AnimatedSprite(frames);
    fx.autoUpdate = false;
    fx.anchor.set(0.5, ALLY_FX_ANCHOR_Y); // seat the sheet's base on the hero's feet
    fx.scale.set(ALLY_FX_SCALE); // slightly smaller than before; matches the enrage swirl
    fx.position.set(bodyCx, SPRITE_FEET_Y);
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
    // last move so a momentary hold doesn't stutter to idle. Standing heroes don't animate
    // their walk/feet/bob — they settle into a still stance between attacks.
    if (c.alive && c.movedThisTick === true) this.moveGraceMs = MOVE_GRACE_MS;
    else this.moveGraceMs = Math.max(0, this.moveGraceMs - dtMs);
    const moving = c.alive && this.moveGraceMs > 0;
    // Sprite heroes carry their own walk bob in their frames, so we don't add the
    // procedural sine bob on top (it would double up and jitter).
    const bob = this.spriteBody !== null ? 0 : moving ? Math.round(Math.sin(this.elapsed / 120) * 1.5) : 0; // walking bob
    this.lunge = Math.max(0, this.lunge - dtMs / 180);
    this.x = x + Math.round(this.lunge * 6); // dart toward the enemy on attack
    this.y = groundY + (c.alive ? bob : 6);
    // Faded when dead — but a reviving hero stays a touch brighter so its respawn
    // bar + countdown read clearly through the fade. During a full-party wipe hold the
    // fallen hero is NOT reviving (the teleport whisks it away in ~2s, not 60s): keep it
    // prominent so the death animation reads, and suppress the misleading respawn bar.
    const reviving = !c.alive && c.respawnMs !== undefined && !wipeHold;
    this.alpha = c.alive ? 1 : wipeHold ? 0.9 : reviving ? 0.55 : 0.25;

    // hit flash → brief darkening tint pulse (tint multiplies, so it dims)
    this.flash = Math.max(0, this.flash - dtMs / 220);
    const tint = this.flash > 0 ? 0xff7777 : 0xffffff;

    if (this.spriteBody !== null) {
      // Drive the death → revive edges so the body plays its death one-shot (then holds
      // its last frame) and resets to idle on respawn, instead of just freezing.
      if (this.prevAlive && !c.alive) this.spriteBody.die();
      else if (!this.prevAlive && c.alive) this.spriteBody.revive();
      this.spriteBody.setTint(tint);
      this.spriteBody.setBodyAlpha(c.alive || wipeHold ? 1 : 0.5); // keep the corpse solid through a wipe hold
      this.spriteBody.update(dtMs, moving); // death anim advances + holds; idle/walk when alive
    } else {
      this.drawFeet(c.alive, moving);
      // sword swing arc (in front of the body, facing the enemies on the right)
      this.swingMs = Math.max(0, this.swingMs - dtMs);
      drawSwing(this.swingG, this.swingMs, hexToNum('#e7e1d6'));
      this.body.tint = tint;
      this.body.alpha = c.alive ? 1 : 0.5;
    }

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
    fx.position.set(bodyCx, SPRITE_FEET_Y); // seated at the feet, matching Mend's positioning
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
      const r = 7;
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
    const bodyA = k;
    if (this.spriteBody !== null) this.spriteBody.setBodyAlpha(bodyA);
    else {
      this.body.alpha = bodyA;
      this.feet.alpha = bodyA;
    }
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
    const cy = this.spriteBody !== null ? -20 : -8; // rough body centre, container-local
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
    const sprite = this.spriteBody !== null;
    const feetY = sprite ? SPRITE_FEET_Y : 20;
    drawHolyGround(this.holyGround, this.hud.bodyCx, feetY, sprite ? 1.1 : 0.75, this.elapsed);
  }

  // Effect aura: twinkling diamond "stars" orbiting the hero while an ongoing effect
  // is active (gold for a Renew/HoT, cyan shield, violet buff, etc.) + a cast burst
  // ring that expands and fades on each ability cast.
  private drawAura(c: Combatant): void {
    this.aura.clear();
    const cx = this.hud.bodyCx; // centre the shield/stars on the same line as the body + HP bar
    const cy = 2;
    if (this.castMs > 0) {
      const t = this.castMs / CAST_MS;
      this.aura.circle(cx, cy, (1 - t) * 15 + 5).stroke({ color: this.castColor, width: 2, alpha: t });
    }
    if (!c.alive) return;
    // Last Stand: a translucent yellow shield bubble around the hero while invulnerable.
    if (isInvulnerable(c.effects)) {
      const pulse = 0.16 + 0.1 * Math.abs(Math.sin(this.elapsed / 200));
      this.aura.circle(cx, cy, 16).fill({ color: INVULN_YELLOW, alpha: pulse });
      this.aura.circle(cx, cy, 16).stroke({ color: INVULN_YELLOW, width: 1.5, alpha: 0.75 });
    }
    // Battle Enrage (Priest ult) is NOT an aura: every buffed ally rhythmically SWELLS and
    // reddens (drawn in applyEnrage, after teleport, so it owns the body's scale + tint).
    // Bold category overlays: green up-arrows (offense buff), dancing shields (defense
    // buff), red down-arrows (debuff) — drawn over the body's vertical span.
    const cats = auraCategories(c.effects);
    const sprite = this.spriteBody !== null;
    const region = {
      cx,
      topY: this.hud.barY * 0.78,
      botY: 4,
      cy: (this.hud.barY * 0.78 + 4) / 2, // heroes never wear the mark; midpoint is fine
      halfW: this.hud.barW * 0.4,
      scale: sprite ? 1.1 : 0.7,
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

  // Two feet shuffling out of phase → a simple walk cycle (sells the treadmill). Planted
  // side-by-side when standing still so the hero doesn't shuffle in place between attacks.
  private drawFeet(alive: boolean, moving: boolean): void {
    this.feet.clear();
    if (!alive) return;
    const swing = moving ? Math.sin(this.elapsed / 120) * 3 : 0;
    const ink = hexToNum('#0d0b12');
    this.feet.rect(1 + Math.round(swing), 20, 4, 3).fill({ color: ink });
    this.feet.rect(6 - Math.round(swing), 20, 4, 3).fill({ color: ink });
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
