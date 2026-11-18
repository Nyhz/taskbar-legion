import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import type { Combatant } from '@/sim/world';
import type { AttackStyle } from '@/data/field';
import { BOSS_DOWN_MS, RANGE } from '@/data/field';
import { hexToNum } from '@/styles/palette';
import { rangedStyle } from './enemyFx';
import { auraCategories, drawCategoryAuras, totalShield, type AuraRegion } from './effectAuras';
import { BodyFx, fxLoop, type FxLoop } from './BodyFx';
import { ENEMY_Z, ELITE_ARRIVE_FX, ELITE_CREST_FX, ELITE_FIGURE_SCALE, ELITE_RIM_INNER, ELITE_RIM_OFFSETS, ELITE_SPARKS_FX, eliteRimOuter } from './eliteLook';
import { figureMask } from './figureMask';
import { FigureBody } from './FigureBody';
import { DEATH } from './figureClip';
import { bossSetback, clipMs, FEET_BELOW_ORIGIN, frontSetback, type EnemyRank } from './figureData';
import { AttackLead, impactMs, swingEtaMs, unledRate, unledWaitMs } from './attackLead';
import { TICK_MS } from '@/sim/Simulation';
import type { FigureSheet } from './figureTextures';
import { ATTACK_CLIP, HURT_CLIP } from './heroClips';
import { LifeBar } from './LifeBar';
import { BARS, foeBarAlpha, type BarSpec } from './stripHud';
import { DOUBLE_LOOKS, PANES, SUMMON_LOOKS, litPaneCount, summonLift, type DoubleLook, type SummonLook } from './bossFx';
import { fxMeta, fxTotalMs, paneSheetMeta } from './fxData';
import { heroSkin, paneCells } from './fxTextures';
import { PaneGlow } from './PaneGlow';
import { AURA_SIGN_LIFT, BRUTE_FIGURE_SCALE, RAGE_TINT, SUPPORT_BORROWED_TINT, auraSignOffsets, auraSigns } from './foeFx';
import { isEnraged } from '@/sim/enemyTraits';

// An enemy display object: a creature of the world the party is in (the redesign's figures — FigureBody), drawn
// 1 art pixel = 1 strip pixel and mirrored to face the heroes, with its feet on the ground line it is given.
// What an enemy IS is told by its figure; its RANK is told by its marking: an elite wears a violet rim (its aura),
// wears a crown at the end of its life bar and is drawn a size up (render/eliteLook — the one place the art is
// scaled, and why), a stage boss has its own large figure, a world boss its own larger one (or, in a world that
// has none yet, the stage boss's figure with gold rings). A boss wears no life bar: its name,
// life and enrage clock are on the HUD rail (ui/hud/HudBoss), so nothing is drawn over a boss as tall as the strip.
// A boss's SUMMON (its crows — render/bossFx SUMMON_LOOKS) is an enemy too: it flies at its own height over the
// ground, dives at the hero it pecks, and flies off when its time is up.
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
const ELITE_CROWN_H = 7; // the crown over an elite's bar
// A life bar never leaves the strip by its top edge.
const STRIP_TOP_CLEAR = 3;

// Per-rank marking: the life bar over the figure (its width; none for a boss — its life is on the HUD rail, with
// its name: ui/hud/HudBoss — one bar, not two, and nothing on a tall boss's head), the ground rings (colour,
// reach) that mark the enemy, and the width of its cast bar.
interface RankLook {
  bar: BarSpec; // the casing of its life bar (render/stripHud BARS)
  ownBar: boolean;
  rings: { color: number; reach: number } | null;
}
const RANK: Record<EnemyRank, RankLook> = {
  normal: { bar: BARS.foe, ownBar: true, rings: null },
  elite: { bar: BARS.elite, ownBar: true, rings: null }, // the rest of its marks: render/eliteLook
  stageBoss: { bar: BARS.foe, ownBar: false, rings: null },
  worldBoss: { bar: BARS.foe, ownBar: false, rings: { color: GOLD, reach: 46 } },
};

/** How much of the way to its mark a dive (a crow's peck, a double's step) goes at its deepest. */
const DIVE_REACH = 0.85;

/** Whether `sheet` is the hero's figure in the double's own skin (not the hero's plain figure). */
function sheetIsSkin(sheet: FigureSheet, look: DoubleLook): boolean {
  return heroSkin(sheet.key, look.skin) === sheet;
}

export class EnemySprite extends Container {
  readonly style: AttackStyle;
  private readonly figure: FigureBody;
  private readonly aura = new Graphics();
  private readonly enrageAura = new Graphics();
  private readonly castBar = new LifeBar(BARS.cast, 'hud_s_fill_cast'); // under-boss cast bar while channeling a special
  private readonly rankAura = new Graphics(); // ground pulse marking a world boss that has no figure of its own
  private readonly eliteLoops: FxLoop[] = []; // an elite's motes, climbing in front of the body (render/eliteLook)
  private eliteCrest: FxLoop | null = null; // the crown over an elite's life bar
  private readonly eliteRim = new Container(); // an elite's rim: tinted copies of its shape, a pixel or two off, behind the figure
  private readonly rimOuter: Sprite[] = [];
  private readonly rimInner: Sprite[] = [];
  private readonly elite: boolean;
  private readonly sheet: FigureSheet;
  private arrived = false; // the elite's arrival burst has played
  private readonly look: RankLook;
  private readonly lead: AttackLead; // starts the attack clip ahead of the swing, so the blow lands with the hit
  private readonly bodyFx: BodyFx; // the ability effects on this enemy: debuffs it wears, hits landing on it
  private readonly lifeBar: LifeBar; // its life bar (render/stripHud: a common enemy shows it only while hurt)
  private sinceHitMs = Number.POSITIVE_INFINITY; // ms since its life last went down
  private lastFrac = 1;
  private barWanted = false; // hurt lately (or an elite): it would show its bar
  private barShown = false; // …and there is room for it
  private readonly tpRing = new Graphics();
  private readonly cx: number; // the body's horizontal centre (container-local; the art is mirrored)
  private readonly barY: number; // HP-bar y (above the figure), container-local
  private readonly cy: number; // body-centre y for auras/cast (container-local, negative = up)
  private readonly halfW: number; // half the body's width
  private readonly figureTop: number; // the standing figure's top, from its feet (negative: up)
  private readonly auraScale: number;
  private readonly deathHoldMs: number;
  private readonly boss: boolean; // a stage boss or a world boss
  private readonly attackMs: number; // length of the attack clip
  private swingTimerMs = 0; // the sim's swing timer as last seen (a jump up = a swing just happened)
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
  private barLift = 0; // px the HP bar is raised to dodge a crowded neighbour's bar (set by GameStrip)
  private barCrowded = false; // no room for its bar among its neighbours' (set by GameStrip): it shows none
  private readonly summon: SummonLook | null; // a boss's summon: how it flies (render/bossFx)
  private readonly double: DoubleLook | null; // a boss's summon that is a hero's double (the Unmaker's reflection)
  private readonly panes: PaneGlow | null; // its own panes, lit one by one (the Unmaker's six mirrors)
  private lift = 0; // how high over the ground line it is drawn (a summon flies)
  private dive: { dx: number; dy: number; t: number; ms: number } | null = null; // a summon's dive at the hero it pecks
  private leaving = false; // a summon whose time is up: it flies off instead of falling
  private drift = 0; // …and how far it has flown off sideways
  private crowdLift = 0; // how much higher it is drawn as the back row of its pile (render/crowdLayout)
  private queued = false; // waiting in line behind the fighters (render/crowdLayout): it is not shown swinging
  private readonly bodyTint: number; // the tint of its own body when nothing else colours it (a support in a borrowed figure)
  private readonly auraSigns = new Container(); // a support's auras: one small sign each, in a row over its head (render/foeFx)

  /** `ownFigure`: the sheet is a figure drawn for this rank alone (a world boss with a creature of its own). It
   *  needs no ground rings to be told from the stage boss — its body does that — and keeps the gold bar. */
  /** `borrowed`: a support drawn with its world's ranged creature (the world has no figure for it yet): tinted. */
  constructor(c: Combatant, sheet: FigureSheet, rank: EnemyRank, ownFigure = false, borrowed = false) {
    super();
    // A boss is shown by its own figure's attack — a slam, a peck — whatever its damage type: it throws no generic
    // bolt (a "magic" boss used to launch the old fireball from its feet). Presentation only.
    this.boss = rank === 'stageBoss' || rank === 'worldBoss';
    this.elite = rank === 'elite';
    this.sheet = sheet;
    this.summon = c.summon === undefined ? null : (SUMMON_LOOKS[c.summon.key] ?? null);
    this.double = c.summon === undefined ? null : (DOUBLE_LOOKS[c.summon.key] ?? null);
    // (A summon strikes with its own body — a dive — whatever reach the simulation gives it.)
    // A shooter is drawn shooting what its figure would (render/enemyFx rangedStyle): an arrow only from an archer.
    this.style = this.boss || c.summon !== undefined ? 'melee' : c.enemyMagic === true ? 'caster' : c.range >= RANGE.ranged ? rangedStyle(sheet.key) : 'melee';
    this.look = ownFigure ? { ...RANK[rank], rings: null } : RANK[rank];
    // The standing figure's box, mirrored (the art faces right; enemies face the party on their left).
    // An elite is drawn a size up (render/eliteLook): its box grows with it, from the feet.
    // A brute is its world's melee fighter a size up (render/foeFx): the one other place the art is scaled.
    const size = (rank === 'elite' ? ELITE_FIGURE_SCALE : 1) * (c.enemyRole === 'brute' ? BRUTE_FIGURE_SCALE : 1);
    // (A double wears its skin; without it — the hero's own figure — it is darkened by a tint.)
    this.bodyTint = borrowed ? SUPPORT_BORROWED_TINT : this.double !== null && !sheetIsSkin(sheet, this.double) ? this.double.tint : 0xffffff;
    const [left, top, right] = sheet.meta.box.map((v) => v * size) as [number, number, number, number];
    const height = -top;
    // A melee figure too wide for the gap the fight leaves is drawn set back, so its body stands behind the
    // point where it meets the hero instead of over him (figureData.frontSetback). Everything hung on the body
    // (bars, rings, auras, marks) follows `cx`.
    // (A boss is set back from where the Knight really stands to fight it, clear of him: figureData.bossSetback.)
    const setback = this.boss && c.summon === undefined ? bossSetback(sheet.meta) : this.style === 'melee' ? frontSetback(sheet.meta, c.range) : 0;
    this.cx = setback - Math.round((left + right) / 2);
    this.halfW = (right - left) / 2;
    this.figureTop = top;
    this.barY = FEET_Y + top - this.look.bar.h - (rank === 'elite' ? 5 : 2);
    this.lifeBar = new LifeBar(this.look.bar, 'hud_s_fill_foe');
    this.lifeBar.visible = false;
    this.castBar.visible = false;
    this.cy = FEET_Y + Math.round(top / 2);
    this.auraScale = Math.max(0.8, Math.min(2.2, height / 40));
    const death = sheet.meta.anims[DEATH];
    // A fallen world boss lies there for the whole beat the simulation gives its defeat (data/field
    // BOSS_DOWN_MS): its death clip plays to the end, its last frame is held, and it dissolves as the beat ends.
    const beatMs = rank === 'worldBoss' ? BOSS_DOWN_MS.worldBoss : rank === 'stageBoss' ? BOSS_DOWN_MS.stageBoss : 0;
    this.deathHoldMs = Math.max(death === undefined ? DEATH_FADE_MS : clipMs(death), beatMs);
    const attack = sheet.meta.anims[ATTACK_CLIP];
    this.attackMs = attack === undefined ? 0 : clipMs(attack);

    this.figure = new FigureBody(sheet, -1);
    if (this.double !== null) this.figure.setRim(heroSkin(sheet.key, this.double.rim)); // the cold edge of the glass it came out of
    const attackAnim = sheet.meta.anims[ATTACK_CLIP];
    this.lead = new AttackLead(attackAnim === undefined ? 0 : impactMs(attackAnim));
    this.figure.position.set(setback, FEET_Y);
    this.figure.scale.set(size);
    this.eliteRim.position.copyFrom(this.figure.position);
    this.eliteRim.scale.set(size);
    const paneMeta = paneSheetMeta(sheet.key);
    const paneArt = paneCells(sheet.key);
    this.panes = paneMeta === undefined || paneArt === null ? null : new PaneGlow(paneMeta, paneArt);
    if (this.panes !== null) {
      this.panes.position.copyFrom(this.figure.position);
      this.panes.scale.set(-size, size); // the art faces right; it faces the party
    }
    // The rank rings + frenzy pool sit on the ground UNDER the feet, then enrageAura behind the
    // body; HP bar + cast bar on top.
    this.bodyFx = new BodyFx({ cx: this.cx, feetY: FEET_Y, height, halfW: this.halfW, facing: -1 });
    if (rank === 'elite') this.wearElite();
    this.addChild(this.rankAura, this.enrageAura, this.bodyFx.under, this.eliteRim, this.figure);
    if (this.panes !== null) this.addChild(this.panes);
    this.addChild(this.bodyFx.over, this.aura, this.lifeBar, this.castBar, this.tpRing);
    if (this.eliteCrest !== null) this.addChild(this.eliteCrest.sprite);
    // A support wears its auras over its head: the one standing sign a wave enemy has (they are what it IS).
    const signs = auraSigns(c.auras);
    auraSignOffsets(signs.length).forEach((dx, i) => {
      const sign = fxLoop(signs[i] ?? '');
      if (sign === null) return;
      sign.sprite.position.set(dx, 0);
      this.auraSigns.addChild(sign.sprite);
    });
    if (signs.length > 0) this.addChild(this.auraSigns);
  }

  // An elite's marks (render/eliteLook): violet motes climbing in front of the body, the rim on its silhouette (its
  // aura) and the crown over its life bar. (No fire stands behind it any more: it read as purple lightning.)
  private wearElite(): void {
    const sparks = fxLoop(ELITE_SPARKS_FX);
    if (sparks !== null) {
      sparks.sprite.position.set(Math.round(this.cx), FEET_Y);
      this.bodyFx.over.addChild(sparks.sprite);
      this.eliteLoops.push(sparks);
    }
    this.eliteCrest = fxLoop(ELITE_CREST_FX);
    // The rim: the figure's own shape, white (render/figureMask), tinted and drawn off by a pixel or two.
    const { root, ground, w, h } = this.sheet.meta;
    const make = (dx: number, dy: number, into: Sprite[]): void => {
      const copy = new Sprite(Texture.EMPTY);
      copy.anchor.set(root / w, ground / h);
      copy.scale.set(-1, 1); // mirrored like the figure
      copy.position.set(dx, dy);
      this.eliteRim.addChild(copy);
      into.push(copy);
    };
    for (const [dx, dy] of ELITE_RIM_OFFSETS.outer) make(dx, dy, this.rimOuter);
    for (const [dx, dy] of ELITE_RIM_OFFSETS.inner) make(dx, dy, this.rimInner);
    for (const copy of this.rimInner) copy.tint = ELITE_RIM_INNER;
  }

  private advanceElite(dtMs: number, alive: boolean): void {
    if (!this.elite) return;
    const shown = alive && !this.dying;
    for (const loop of this.eliteLoops) {
      loop.advance(dtMs);
      loop.sprite.visible = shown;
    }
    this.eliteCrest?.advance(dtMs);
    if (this.eliteCrest !== null) this.eliteCrest.sprite.visible = this.barShown;
    // The rim follows the figure's frame; it leaves with the life (a corpse wears none).
    this.eliteRim.visible = shown;
    if (shown) {
      const mask = figureMask(this.sheet);
      const { clip, frame } = this.figure.clips;
      const shape = mask?.clips[clip]?.[frame] ?? Texture.EMPTY;
      const outer = eliteRimOuter(this.elapsed);
      for (const copy of this.rimOuter) {
        copy.texture = shape;
        copy.tint = outer;
      }
      for (const copy of this.rimInner) copy.texture = shape;
    }
    // The burst as it steps into the wave: once, when it has materialised enough to be seen.
    if (!this.arrived && shown && this.materializeMs < SPAWN_FX_MS * 0.5) {
      this.arrived = true;
      this.bodyFx.burst(ELITE_ARRIVE_FX, 'over');
    }
  }

  /** True for a boss's summon — a crow over the party, a hero's double among it: not part of the wave's line. */
  get flying(): boolean {
    return this.summon !== null || this.double !== null;
  }

  /** How a hero's double strikes (render/bossFx), or null for anything else. */
  get doubleLook(): DoubleLook | null {
    return this.double;
  }

  /** True for a double that strikes with its body (the Knight's): it steps to its victim for each blow. */
  get steps(): boolean {
    return this.double !== null && !this.double.shooters.includes(this.sheet.key);
  }

  /** A double steps to the hero standing at `x` (strip x), strikes and steps back. Its swing is played so that it
   *  lands as it arrives. Returns how long after now it is there (ms): when the blow should show. */
  stepStrike(x: number): number {
    const look = this.double;
    if (look === null) return 0;
    const reach = look.stepMs / 2;
    // It stops short of him, on the side it came from.
    const to = x + (this.x >= x ? look.stepGap : -look.stepGap);
    this.dive = { dx: (to - this.x) / DIVE_REACH, dy: 0, t: 0, ms: look.stepMs };
    const attack = this.sheet.meta.anims[ATTACK_CLIP];
    this.figure.clips.act(ATTACK_CLIP, true, 1, Math.max(0, (attack === undefined ? 0 : impactMs(attack)) - reach));
    return reach;
  }

  /** The figure it is drawn as (a creature's key of data/worlds; `summon:<key>` for a summon). */
  get figureKey(): string {
    return this.sheet.key;
  }

  /** The standing figure's height (art pixels). */
  get bodyHeight(): number {
    return -this.sheet.meta.box[1];
  }

  /** A one-shot on this enemy, centred `up` of its height above the ground line (0 = standing on it). */
  burstAt(fx: string, up: number): void {
    this.bodyFx.burst(fx, 'over', 0, -Math.round(-this.sheet.meta.box[1] * up));
  }

  /** A summon dives at the point (x, y) of the strip — the hero it pecks — and comes back. Returns how long
   *  after the start the dive is at its deepest (ms): when its hit should show. */
  diveAt(x: number, y: number): number {
    const ms = this.summon?.diveMs ?? 0;
    if (ms <= 0) return 0;
    this.dive = { dx: x - this.x, dy: y - this.y, t: 0, ms };
    return ms / 2;
  }

  /** True once this enemy has fallen (its corpse is still on screen): a spectacle aimed at the wave leaves it out. */
  get fallen(): boolean {
    return this.dying;
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

  /** An ability's hit lands on this enemy: its one-shot, centred on the body (render/abilityFx `hit`). */
  hitFx(fx: string, spot: 'body' | 'ground' = 'body'): void {
    if (spot === 'ground') this.bodyFx.burst(fx, 'over');
    else this.bodyFx.burstOnBody(fx);
  }

  /** The middle of this enemy's body (parent coords): where a flash that must show over the whole pile is played. */
  bodyPoint(): { x: number; y: number } {
    return { x: this.x + this.cx, y: this.y + this.cy };
  }

  /** Where this enemy's shots leave from (parent coords): ahead of its body, a little above its middle. */
  shotPoint(): { x: number; y: number } {
    return { x: this.x + this.cx - Math.min(this.halfW, 10), y: this.y + this.cy - 3 };
  }

  /** Where a boss gathers its heavy blow (parent coords): at the front of its body, low — a third of its height
   *  off the ground — so it reads as the blow it is about to drive into the hero in front of it. */
  chargePoint(): { x: number; y: number } {
    return { x: this.x + this.cx - this.halfW * 0.7, y: this.y + FEET_Y + Math.round(this.figureTop * 0.32) };
  }

  /** Raise this enemy's HP bar by `px` so it doesn't sit on top of a neighbour's bar when
   *  enemies bunch at the same x (GameStrip computes the crowding, like it does for heroes). */
  setBarLift(px: number | null): void {
    this.barCrowded = px === null;
    this.barLift = px ?? 0;
  }

  // The attack clip carries its own motion (kept so the API matches HeroSprite).
  lungeAttack(): void { /* the attack clip carries the motion */ }

  /** Play the creature's attack animation. Returns how long its hit should wait to show (see HeroSprite.attack):
   *  a blow nothing announced starts at the blow; a shot plays its whole wind-up, hurried, and the shot waits. */
  swing(): number {
    if (this.queued) return 0; // waiting its turn behind the fighters: its blow lands, unseen, with no swing from afar
    if (this.lead.claim()) return 0; // its clip was started early (leadAttack)
    const windup = this.lead.windupMs;
    if (this.style === 'melee') {
      this.figure.clips.act(ATTACK_CLIP, false, 1, windup);
      return 0;
    }
    return this.figure.clips.act(ATTACK_CLIP, false, unledRate(windup)) ? unledWaitMs(windup) : 0;
  }

  /** Start the attack clip EARLY so its blow lands with the hit (render/attackLead). Called every frame with
   *  the sim's enemy and whether a hero is within its reach. */
  leadAttack(c: Combatant, heroInReach: boolean, dtMs: number): void {
    if (this.steps) return; // a double that steps to its victim swings as it arrives (stepStrike), not from afar
    this.lead.tick(dtMs);
    // The timer jumping up means a swing just happened and shows the time to the next one: a clip drawn longer
    // than that (a boss's slam) is played a little faster, so its recovery is seen instead of being cut.
    if (c.attackTimerMs > this.swingTimerMs + TICK_MS) this.lead.setPace(this.attackMs, c.attackTimerMs);
    this.swingTimerMs = c.attackTimerMs;
    const eta = swingEtaMs(c.attackTimerMs, TICK_MS);
    // (One waiting in line behind the fighters is not shown swinging: render/crowdLayout.)
    if (!c.alive || !heroInReach || this.queued || c.movedThisTick === true || c.casting !== undefined || !this.lead.due(eta)) return;
    if (this.figure.clips.act(ATTACK_CLIP, false, this.lead.rate(eta))) this.lead.started();
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
    // A summon flies: it comes down from where it was let go to the height it hovers at, and bobs there.
    if (this.summon !== null && c.summon !== undefined && c.alive) {
      this.lift = summonLift(this.summon, c.summon.slot, this.elapsed) + Math.round(18 * Math.max(0, 1 - this.elapsed / 500));
    }
    // A double comes down out of the mirror — a short fall, showing as it comes — and stands among the party.
    if (this.double !== null && c.alive) {
      const k = Math.min(1, this.elapsed / this.double.dropMs);
      this.lift = Math.round(this.double.dropPx * (1 - k * k));
      this.alpha = Math.min(1, this.elapsed / (this.double.dropMs * 0.5));
    }
    if (this.dive !== null) {
      this.dive.t += dtMs;
      if (this.dive.t >= this.dive.ms) this.dive = null;
    }
    this.place(x, groundY);

    if (this.prevAlive && !c.alive) {
      if (this.double !== null) this.startBreak(this.double);
      else if (c.summon?.left === true && this.summon !== null) this.startLeave(this.summon.leaveMs);
      else this.startDeath();
    }
    this.prevAlive = c.alive;

    // Held move-grace: any recent motion keeps the run loop alive through the bursty
    // easing / frozen-camera gaps, so it never resets to idle-then-run mid-stride.
    if (c.alive && Math.abs(x - this.lastX) > 0.15) this.moveGraceMs = MOVE_GRACE_MS;
    else this.moveGraceMs = Math.max(0, this.moveGraceMs - dtMs);
    this.lastX = x;
    const moving = c.alive && this.moveGraceMs > 0;

    this.flash = Math.max(0, this.flash - dtMs / 220);
    const enraged = c.isBoss === true && c.alive && (c.fightMs ?? 0) > (c.enrageMs ?? Number.POSITIVE_INFINITY);
    // Rabia (a beast under half its life, Hell on) reddens its own body: a trait's only lasting mark is a tint.
    this.figure.setTint(this.flash > 0 ? 0xffd0d0 : enraged ? 0xff9a86 : isEnraged(c) ? RAGE_TINT : this.bodyTint);
    // A boss also lightens towards white — a tint only multiplies, and does nothing on a black figure — for the
    // first half of the flash only: under the whole party's fire it must blink, not stay pale.
    if (this.boss) this.figure.setFlash(this.flash * 2 - 1);

    this.figure.update(dtMs, moving);
    if (this.panes !== null) {
      // Its mirrors: one lit per stack, flickering while it winds their breaking up; a flash as each lights, a
      // burst of glass from each as they go out.
      const beats = this.panes.sync(this.figure.clips.clip, this.figure.clips.frame, litPaneCount(c.effects), c.casting?.key === PANES.breaking, c.alive, dtMs);
      for (const beat of beats) this.bodyFx.burst(beat.kind === 'lit' ? PANES.flash : PANES.break, 'over', this.cx - this.figure.x + beat.x, beat.y);
    }
    this.bodyFx.sync(c.effects, { id: c.id }, dtMs, c.alive);
    this.drawHpBar(c, groundY, dtMs);
    // A support's signs ride just over where its bar is — shown or not — and go when it falls.
    if (this.auraSigns.children.length > 0) {
      const barTop = Math.max(this.barY - (this.barShown ? this.barLift : 0), -(groundY - FEET_Y) + STRIP_TOP_CLEAR + AURA_SIGN_LIFT);
      this.auraSigns.visible = c.alive;
      this.auraSigns.position.set(Math.round(this.cx), Math.round(barTop - AURA_SIGN_LIFT));
    }
    this.castMs = Math.max(0, this.castMs - dtMs);
    this.drawAura(c);
    this.drawEnrage(enraged);
    this.drawCastBar(c);
    this.drawRankAura(c.alive);
    this.advanceElite(dtMs, c.alive);
    this.applyMaterialize(dtMs);
    this.tickDeath(dtMs);
  }

  /** Drive the sprite after its combatant has been pruned from the sim — keep playing the
   *  death clip (or, if it never actually died, fade it out quickly). Holds its last world
   *  position (x tracks the camera so the corpse doesn't drift). */
  updateOrphan(x: number, groundY: number, dtMs: number): void {
    this.elapsed += dtMs;
    this.place(x, groundY);
    if (!this.dying && this.double !== null) this.startBreak(this.double); // a double always ends as broken glass
    this.panes?.sync('', 0, 0, false, false, dtMs);
    if (!this.dying) {
      // Pruned while still "alive" (a stage/wave reset, not a kill) → no death anim, fade fast.
      this.dying = true;
      this.deathMs = PRUNED_FADE_MS;
      this.hideLifeBar();
      this.rankAura.clear();
    }
    this.auraSigns.visible = false;
    this.figure.setFlash(0);
    this.figure.update(dtMs, false);
    this.advanceElite(dtMs, false);
    this.bodyFx.sync([], { id: '' }, dtMs, false);
    this.tickDeath(dtMs);
  }

  /** Whether it waits in line behind the fighters (render/crowdLayout): a melee enemy there is not shown swinging. */
  setQueued(queued: boolean): void {
    this.queued = queued;
  }

  /** Its place in the line it stands in (render/crowdLayout): the back rows are drawn a little higher and behind. */
  setCrowd(lift: number, order: number): void {
    this.crowdLift = lift;
    // A support — and the signs over its head — is drawn over the enemies it stands among, elites included.
    this.zIndex = (this.auraSigns.children.length > 0 ? ENEMY_Z.elite + 0.2 : this.elite ? ENEMY_Z.elite : ENEMY_Z.common) + order / 100000;
  }

  // Whole art pixels: the figure is drawn 1 art pixel = 1 strip pixel, on the backdrop's grid.
  private place(x: number, groundY: number): void {
    // A dive goes most of the way to its mark and back, in one smooth swing.
    const k = this.dive === null ? 0 : Math.sin((this.dive.t / this.dive.ms) * Math.PI) * DIVE_REACH;
    this.x = Math.round(x + this.drift + (this.dive?.dx ?? 0) * k);
    this.y = Math.round(groundY - FEET_BELOW_ORIGIN - this.lift - this.crowdLift + (this.dive?.dy ?? 0) * k);
  }

  // A summon whose time is up: no death — it keeps flying, up and away, and fades.
  private startLeave(ms: number): void {
    if (this.dying) return;
    this.dying = true;
    this.leaving = true;
    this.deathMs = ms;
    this.dive = null;
    this.hideLifeBar();
  }

  // A double's end, killed or out of time: no death of the hero it looks like — it breaks like glass where it
  // stands, and is gone.
  private startBreak(look: DoubleLook): void {
    if (this.dying) return;
    this.dying = true;
    const gone = fxMeta(look.gone);
    this.deathMs = gone === undefined ? DEATH_FADE_MS : fxTotalMs(gone);
    this.figure.visible = false;
    this.lift = 0;
    this.bodyFx.burst(look.gone, 'over');
    this.hideLifeBar();
  }

  private startDeath(): void {
    if (this.dying) return;
    this.dying = true;
    this.deathMs = this.deathHoldMs;
    this.figure.clips.die();
    this.hideLifeBar();
  }

  private hideLifeBar(): void {
    this.lifeBar.visible = false;
    this.barWanted = false;
    this.barShown = false;
  }

  /** The box its life bar wants on the strip right now (art px; an elite's crown counted), or null while it
   *  wants none — the strip stacks the bars of enemies that stand on one spot (render/stripHud stackBars). */
  get barBox(): { x: number; y: number; w: number; h: number; elite: boolean } | null {
    if (!this.barWanted) return null;
    const crown = this.elite ? ELITE_CROWN_H : 0;
    return { x: this.x + this.cx, y: this.barY - crown, w: this.look.bar.w, h: this.look.bar.h + crown, elite: this.elite };
  }

  // Count the corpse hold down; fade out over the final stretch so it dissolves rather than
  // popping. The driver removes the sprite once isExpired().
  private tickDeath(dtMs: number): void {
    if (!this.dying) return;
    if (this.leaving) {
      this.lift += dtMs * 0.09;
      this.drift += dtMs * 0.07;
    }
    this.deathMs = Math.max(0, this.deathMs - dtMs);
    this.alpha = Math.min(this.alpha, this.deathMs > DEATH_FADE_MS ? 1 : Math.max(0, this.deathMs / DEATH_FADE_MS));
  }

  private drawHpBar(c: Combatant, groundY: number, dtMs: number): void {
    if (this.dying || !this.look.ownBar) { this.hideLifeBar(); return; }
    const frac = c.maxHp > 0 ? Math.max(0, Math.min(1, c.hp / c.maxHp)) : 0;
    this.sinceHitMs = frac < this.lastFrac ? 0 : this.sinceHitMs + dtMs;
    this.lastFrac = frac;
    const alpha = foeBarAlpha({ elite: this.elite, frac, sinceHitMs: this.sinceHitMs });
    this.barWanted = alpha > 0;
    this.barShown = this.barWanted && !this.barCrowded;
    this.lifeBar.visible = this.barShown;
    if (!this.barShown) return;
    this.lifeBar.alpha = alpha;
    const { w } = this.look.bar;
    // Clamp inside the strip: the strip's top edge is at container-local -(groundY - FEET_Y) — a tall creature's
    // bar stays on the strip instead of slipping off it. barLift raises the bar to dodge a crowded neighbour; the
    // same clamp keeps a lifted bar on-screen.
    const y = Math.max(this.barY - this.barLift, -(groundY - FEET_Y) + STRIP_TOP_CLEAR);
    this.lifeBar.position.set(Math.round(this.cx - w / 2), Math.round(y));
    this.lifeBar.set(frac, 0, c.maxHp > 0 ? totalShield(c.effects) / c.maxHp : 0);
    // An elite's crown sits over the middle of its bar (its attach point is the middle of its bottom edge).
    if (this.eliteCrest !== null) this.eliteCrest.sprite.position.set(Math.round(this.cx), Math.round(y));
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

  // A fast cast bar UNDER the boss while it channels a special (Frenzy / Mortal Wound),
  // filling over the cast's windup — telegraphs the incoming ability. Colored per ability.
  private drawCastBar(c: Combatant): void {
    const ch = c.casting;
    if (!c.alive || this.dying || ch === undefined || ch.totalMs <= 0) {
      this.castBar.visible = false;
      return;
    }
    this.castBar.visible = true;
    this.castBar.setFill(ch.key === 'boss_mortal_wound' ? 'hud_s_fill_cast_wound' : 'hud_s_fill_cast');
    this.castBar.position.set(Math.round(this.cx - BARS.cast.w / 2), FEET_Y + 2); // just below the feet, on the ground in front of the boss
    this.castBar.set(Math.max(0, Math.min(1, 1 - ch.remainingMs / ch.totalMs)));
  }

  // The vertical band auras play over, in container-local coords.
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
