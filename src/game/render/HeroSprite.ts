import { Container, Graphics } from 'pixi.js';
import type { Combatant } from '@/sim/world';
import { classDef } from '@/data/classes';
import type { AttackStyle } from '@/data/field';
import { auraCategories, drawCategoryAuras } from './effectAuras';
import { FigureBody } from './FigureBody';
import { FEET_BELOW_ORIGIN, type FigureAnim } from './figureData';
import { heroFigure } from './figureTextures';
import { ATTACK_CLIP, BLOCK_CLIP, HURT_CLIP, attackClips, heroAbilityClip, pickAttackClip } from './heroClips';
import { BodyFx } from './BodyFx';
import { HEAL_BLOOM, HEAL_BLOOM_GAP_MS, SHOT_FROM, auraEffectKey, basicShotOf, type WornEffect } from './abilityFx';
import { heroSkin } from './fxTextures';
import { HeroHud } from './HeroHud';
import { heroHudCx } from './stripHud';
import { ARRIVAL_CHOICE, DEPART_FX, arrivalBody, arrivalFx, departBody, type BodyLook } from './arrival';
import { AttackLead, abilityTakesSwing, blowRate, blowWaitMs, impactMs, swingEtaMs, unledRate, unledWaitMs } from './attackLead';
import { TICK_MS } from '@/sim/Simulation';

const HIT_FLASH_MS = 110;
const HIT_FLASH_TINT = 0xffa8a8;
// A hero display object: its figure (the redesign's art, one per class — FigureBody), the looks of the effects
// on it (BodyFx), a cast burst, and the strip's HUD over its head and at its feet (HeroHud: life bar, effect
// chips, ability chips, the count of its return). Reads sim state; never mutates it.
// The container's origin is FEET_BELOW_ORIGIN above the feet (GameStrip aims at it); the figure
// stands with its feet exactly on the ground line it is given.

// How long the walk animation keeps playing after the last tick the hero actually moved.
// A bit over one sim tick (100ms) so a single hold-position tick mid-travel doesn't snap
// the sprite to its idle pose and back — it settles to idle only once truly stopped.
const MOVE_GRACE_MS = 140;

const CAST_MS = 340; // cast-burst ring lifetime

// Over the head and at the feet a hero wears the strip's HUD (render/HeroHud: life bar, the chips of the effects
// on him, of his abilities and of his ultimate), centred with the cast sign on the class's own line
// (render/stripHud HERO_HUD_CX). `BODY_CX` is the horizontal centre of what is hung on the BODY (the ability
// looks, the auras): a little ahead of the figures' root column.
const BODY_CX = 4;
const BODY_HALF_W = 9; // half the body's width, for what is hung on it

// Container-local y of the hero's feet (the ground line).
const FEET_Y = FEET_BELOW_ORIGIN;
const SHOT_AHEAD = 13; // the bow hand, from the body's centre
const SHOT_HEIGHT = 21; // …and above the ground line
const HERO_HEIGHT = 40; // the tallest hero's standing figure (the knight's plume, the priest's staff)
const BODY_MID_Y = FEET_Y - 18; // the middle of the body: cast ring, shield bubble

const AURA_SCALE = 0.8; // glyph size of the category auras / holy ground for a ~40 px body
// A hurt flinch plays at most this often, so a hero under a hail of blows still reads as fighting.
const HURT_GAP_MS = 700;
// A fallen hero stays solid this long (the heroes' death clips run 2.2–2.4 s), then fades to a ghost.
const DEATH_SHOWN_MS = 2400;
// The classes whose basic attack lands a holy strike ON the target instead of flying there.

export class HeroSprite extends Container {
  readonly style: AttackStyle;
  private readonly classKey: string;
  private readonly figure: FigureBody;
  private readonly hud: HeroHud; // life bar, effect chips, ability chips (render/HeroHud)
  private readonly hudCx: number; // its centre line: where this class's body stands (render/stripHud HERO_HUD_CX)
  private bossEngaged = false; // a boss is in the fight and the engage ultimates have fired (set by the strip)
  private readonly aura = new Graphics(); // ongoing-effect stars + cast burst
  private readonly lead: AttackLead; // starts the attack clip ahead of the swing, so the blow lands with the hit
  private readonly attacks: string[]; // the basic-attack clips this figure has (heroClips.attackClips)
  private attackClip = ATTACK_CLIP; // the one the NEXT swing plays
  /** The ability effects on this hero: lasting looks, their openings and closings (render/BodyFx). */
  readonly bodyFx: BodyFx;
  private lastAttackClip = ATTACK_CLIP; // the basic-attack clip of the swing in progress (what it throws, and from where)
  private sinceHealBloom = Number.POSITIVE_INFINITY; // ms since a heal last bloomed on this hero
  private readonly sinceSign = new Map<string, number>(); // ms since each blow sign last showed on this hero
  private partyAuras: readonly { abilityKey: string; sourceId: string }[] = []; // the party's passive auras that reach this hero
  private onField = true; // alive and present (not fallen, arriving or away), as of its last update
  private prevAlive = true; // tracks the alive→dead / dead→alive edge to drive death/revive
  private readonly anims: Readonly<Record<string, FigureAnim>>;
  private flash = 0;
  private castMs = 0;
  private castColor = 0xffffff;
  private elapsed = 0;
  private moveGraceMs = 0; // >0 while recently moving → play run; 0 → idle
  // The hero's comings and goings (render/arrival): `arriving` counts the ms of an arrival (negative while it
  // waits for its turn), `leaving` those of a departure; `away` holds it off the field between the two. While
  // any of them is on the hero is `teleporting`: its looks, auras and overhead HUD stand down.
  private arriving: number | null = null;
  private arrivalShown = false; // the arrival's effects have started (its turn came)
  private leaving: number | null = null;
  private away = false;
  private teleporting = false;
  private deadMs = 0; // time since this hero fell (0 while alive)

  constructor(classKey: string) {
    super();
    this.classKey = classKey;
    this.style = classDef(classKey).style;
    // Every class has a figure, loaded before the first frame (GameStrip.init → loadHeroFigures).
    const sheet = heroFigure(classKey);
    if (sheet === null) throw new Error(`No figure loaded for the hero class ${classKey}`);
    this.figure = new FigureBody(sheet);
    this.anims = sheet.meta.anims;
    this.attacks = attackClips(sheet.meta.anims);
    this.lead = new AttackLead(0);
    this.nextAttackClip(undefined);
    this.bodyFx = new BodyFx({ cx: BODY_CX, feetY: FEET_Y, height: HERO_HEIGHT, halfW: BODY_HALF_W, facing: 1 });
    this.hudCx = heroHudCx(classKey);
    this.hud = new HeroHud(this.hudCx, FEET_Y - HERO_HEIGHT, FEET_Y);
    // The figure's root column and ground row sit at (0, FEET_Y): its feet are on the ground line.
    this.figure.position.set(0, FEET_Y);
    // The ability effects go around the figure: `under` behind it (auras, fires, a banner), `over` in front; the
    // HUD goes over everything of the hero.
    this.addChild(this.bodyFx.under, this.figure, this.bodyFx.over, this.aura, this.hud.feet, this.hud.above);
  }

  /** The hero comes back onto the field (render/arrival): after a defeat, on reviving in a fight, on joining
   *  the party, on reaching a new world. `delayMs` holds it off the field until its turn — a returning party
   *  arrives one after another. Self-driven (counts in `update`). */
  arrive(delayMs = 0): void {
    this.arriving = -Math.max(0, delayMs);
    this.arrivalShown = false;
    this.leaving = null;
    this.away = false;
  }

  /** The hero is taken off the field (the party leaves for another world) and stays away until `arrive`.
   *  `seen` false: it is simply gone (the strip is already black). */
  depart(seen = true): void {
    this.arriving = null;
    this.leaving = seen ? 0 : null;
    this.away = !seen;
    if (seen) for (const fx of DEPART_FX.under) this.bodyFx.burst(fx, 'under');
    if (seen) for (const fx of DEPART_FX.over) this.bodyFx.burst(fx, 'over');
  }

  /** Where this hero's shots leave from (parent coords): the bow hand, ahead of the body at chest height — or
   *  wherever the class's clip in progress lets go (render/abilityFx SHOT_FROM: the Priest's lantern, her book). */
  shotPoint(): { x: number; y: number } {
    const from = SHOT_FROM[this.classKey]?.[this.lastAttackClip];
    return { x: this.x + BODY_CX + (from?.dx ?? SHOT_AHEAD), y: this.y + FEET_Y - (from?.up ?? SHOT_HEIGHT) };
  }

  /** What this hero's basic attack in progress throws (render/abilityFx: its class's shot, or the clip's own);
   *  undefined for a class with none of its own. */
  basicShot(): string | undefined {
    return basicShotOf(this.classKey, this.lastAttackClip);
  }

  /** True while the hero stands on the field: alive and neither arriving, leaving nor away. */
  get standing(): boolean {
    return this.onField;
  }

  /** A heal lands on this hero: it wells up over the body (render/abilityFx HEAL_BLOOM) — at most once every
   *  HEAL_BLOOM_GAP_MS, so a heal on everyone and its ticks do not strobe. */
  healBloom(): void {
    if (this.sinceHealBloom < HEAL_BLOOM_GAP_MS) return;
    this.sinceHealBloom = 0;
    this.bodyFx.burst(HEAL_BLOOM, 'over');
  }

  /** A one-shot over this hero's body (render/abilityFx: a heal's own look on whoever it heals, a cleanse's flash). */
  burstFx(fx: string): void {
    this.bodyFx.burst(fx, 'over');
  }

  /** A blow raises its sign on this hero instead of a word (render/abilityFx BLOW_SIGNS: a block is a spark on the
   *  shield, a hit that did nothing a gold glance, a second strike two crossing cuts). */
  blowSign(sign: { fx: string; gapMs: number }): void {
    if ((this.sinceSign.get(sign.fx) ?? Number.POSITIVE_INFINITY) < sign.gapMs) return;
    this.sinceSign.set(sign.fx, 0);
    // On the side the blows come from, at shield height.
    this.bodyFx.burst(sign.fx, 'over', 9, -24);
  }

  /** The party's passive auras that reach this hero (the Priest's Retribution): the strip tells every hero each
   *  frame; each becomes a stand-in worn effect so its look goes through the same slots as the rest. */
  setPartyAuras(auras: readonly { abilityKey: string; sourceId: string }[]): void {
    this.partyAuras = auras;
  }

  /** The effect chip under a point of this sprite's own space (render/HeroHud.effectChipAt). */
  effectChipAt(x: number, y: number): { worn: readonly { key: string; value?: number; stacks?: number; totalMs?: number }[]; x: number; y: number } | null {
    return this.visible ? this.hud.effectChipAt(x, y) : null;
  }

  /** Where the sign of an ability this hero casts appears (parent coords): centred over the body, its
   *  bottom edge just above the overhead HUD. */
  signPoint(): { x: number; y: number } {
    return { x: this.x + this.hudCx, y: this.y + this.hud.topY - 1 };
  }

  /** Raise the whole overhead HUD by `px` (0 = default). GameStrip lifts a rear hero's
   *  HUD when it would overlap the party member just ahead, so crowded HP bars / pips stay
   *  legible. Shifts only the HUD layer — the body, aura and teleport FX are untouched. */
  setHudLift(px: number): void {
    this.hud.setLift(px);
  }

  /** Whether a boss is in the fight and the party's engage ultimates have fired on it: their chips show spent. */
  setBossEngaged(on: boolean): void {
    this.bossEngaged = on;
  }

  /** Play a colored cast burst (ability flourish on the caster). */
  castBurst(color: number): void {
    this.castMs = CAST_MS;
    this.castColor = color;
  }

  flashHit(): void {
    this.flash = 1;
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
  /** The body's horizontal centre, from the sprite's x (art pixels). */
  get bodyCx(): number {
    return BODY_CX;
  }

  /** How long after a cast starts its clip the clip reaches its blow, as drawn (a shout's cry, a cleave's cut):
   *  when the cast's effect belongs. Unlike abilityBlowMs this is never 0 for a long wind-up. */
  castBlowMs(abilityKey: string): number {
    const anim = this.anims[heroAbilityClip(this.classKey, abilityKey)];
    return anim === undefined ? 0 : impactMs(anim) / blowRate(anim);
  }

  /** How long after this hero starts an ability's clip its hit should show (render/attackLead.blowWaitMs). */
  abilityBlowMs(abilityKey: string): number {
    return blowWaitMs(this.anims[heroAbilityClip(this.classKey, abilityKey)]);
  }

  /** Returns how long what the attack shoots should wait to leave (ms): an ability's shot waits for its clip's
   *  release (attackLead.blowWaitMs); a basic shot or spell that nothing announced, for its hurried clip
   *  (attackLead.unledWaitMs); anything else, nothing. */
  attack(abilityKey?: string): number {
    if (abilityKey !== undefined) {
      // An ability's hit: its clip (often started a moment ago by `cast`) is hurried when its wind-up is long,
      // and what it shoots waits for the release — or an Aimed Shot's arrow would leave before the bow is drawn.
      const clip = heroAbilityClip(this.classKey, abilityKey);
      const rate = blowRate(this.anims[clip]);
      const fresh = this.figure.clips.act(clip, true, rate) || this.figure.clips.hurry(clip, rate);
      if (fresh) this.lead.drop(); // a basic attack's clip started early is no longer on screen
      return fresh ? blowWaitMs(this.anims[clip]) : 0;
    }
    const clip = this.attackClip;
    this.lastAttackClip = clip;
    if (this.lead.claim()) {
      this.nextAttackClip(clip); // its clip was started early (leadAttack): the swing after it plays another
      return 0;
    }
    const windup = this.lead.windupMs;
    let wait = 0;
    if (this.style === 'melee') {
      // A blow nothing announced — the hero strikes the instant it arrives — starts the clip AT its blow: from
      // its first frame the blow would land after its own number and just before the next swing's, and read as
      // two blows for one hit.
      this.figure.clips.act(clip, false, 1, windup);
    } else if (this.figure.clips.act(clip, false, unledRate(windup))) {
      // A shot: the whole draw plays, hurried, and the arrow waits for the release — starting at the release
      // would loose an arrow with no draw at all.
      wait = unledWaitMs(windup);
    }
    this.nextAttackClip(clip);
    return wait;
  }

  // Choose the basic-attack clip of the next swing — any but the one just played, at random (render only: the
  // simulation knows nothing of it) — and time the early start to ITS blow.
  private nextAttackClip(last: string | undefined): void {
    this.attackClip = pickAttackClip(this.attacks, last, Math.random());
    const anim = this.anims[this.attackClip];
    this.lead.setWindup(anim === undefined ? 0 : impactMs(anim));
  }

  /** Start the basic attack clip EARLY so its blow lands with the hit (render/attackLead). Called every frame
   *  with the sim's hero and whether an enemy is within its reach; does nothing while the hero moves, while
   *  the swing is still far, or when an ability is about to take the swing (its own clip plays on the cast). */
  leadAttack(c: Combatant, enemyInReach: boolean, dtMs: number): void {
    this.lead.tick(dtMs);
    const eta = swingEtaMs(c.attackTimerMs, TICK_MS);
    if (!c.alive || !enemyInReach || c.movedThisTick === true || !this.lead.due(eta)) return;
    if (abilityTakesSwing(c)) return;
    if (this.figure.clips.act(this.attackClip, false, this.lead.rate(eta))) this.lead.started();
  }

  /** Play the clip of an ability this hero just cast (a heal, a buff, a shout, a blow). */
  cast(abilityKey: string): void {
    this.figure.clips.act(heroAbilityClip(this.classKey, abilityKey), true);
  }

  /** Play a take-a-hit flinch. Never interrupts an attack or an ability. */
  hurtReact(): void {
    this.figure.clips.react(HURT_CLIP, HURT_GAP_MS);
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
    // A hero waiting to come back keeps his HUD solid (the count must read): only his body fades (below).
    this.alpha = c.alive || falling || reviving ? 1 : wipeHold ? 0.9 : 0.25;

    // Hit flash → a brief reddish tint (tint multiplies, so it dims). Kept short and light: a tank under three or
    // four attackers is hit several times a second, and a long, strong flash left him painted red for the fight.
    this.flash = Math.max(0, this.flash - dtMs / HIT_FLASH_MS);
    const tint = this.flash > 0 ? HIT_FLASH_TINT : 0xffffff;

    // Drive the death → revive edges so the body plays its death one-shot (then holds its
    // last frame) and resets to idle on respawn.
    if (this.prevAlive && !c.alive) {
      this.figure.clips.die();
      this.arriving = null; // it fell while still arriving: the fall wins
      this.leaving = null;
      this.away = false;
    } else if (!this.prevAlive && c.alive) {
      this.figure.clips.revive();
      // Back on its feet: it ARRIVES (unless the strip already scheduled its arrival — a returning party).
      if (this.arriving === null && !this.away) this.arrive();
    }
    this.figure.setTint(tint);
    this.figure.setBodyAlpha(c.alive || wipeHold || falling ? 1 : reviving ? 0.3 : 0.5); // keep the corpse solid through a wipe hold; a ghost while he waits to return
    this.figure.update(dtMs, moving); // death anim advances + holds; idle/run when alive
    // The looks its effects give it (render/abilityFx): loops around the body, and the figure itself in a skin.
    this.onField = c.alive && !this.teleporting;
    this.sinceHealBloom += dtMs;
    for (const [key, ms] of this.sinceSign) this.sinceSign.set(key, ms + dtMs);
    const worn: readonly WornEffect[] = this.partyAuras.length === 0
      ? c.effects
      : [...c.effects, ...this.partyAuras.map((a) => ({ defKey: auraEffectKey(a.abilityKey), sourceId: a.sourceId, remainingMs: 1 }))];
    const skin = this.bodyFx.sync(worn, { id: c.id, classKey: this.classKey }, dtMs, this.onField);
    this.figure.setSkin(heroSkin(this.classKey, skin));
    this.figure.setRim(heroSkin(this.classKey, this.bodyFx.rim)); // a rim sheet is laid out like a skin

    this.hud.update(c, dtMs, reviving, this.bossEngaged);

    this.castMs = Math.max(0, this.castMs - dtMs);
    this.drawAura(c);
    this.applyPresence(dtMs);
    this.prevAlive = c.alive;
  }

  // The hero's arrival / departure (render/arrival): the effects play around the figure (BodyFx one-shots), the
  // figure itself shows, whitens and cools by the script, and the overhead HUD stays off until it has arrived.
  private applyPresence(dtMs: number): void {
    let look: BodyLook | null = null;
    if (this.arriving !== null) {
      // Waiting for its turn (negative) it only counts up to 0; from its first frame on it runs with the clock.
      this.arriving = this.arriving < 0 ? Math.min(0, this.arriving + dtMs) : this.arrivalShown ? this.arriving + dtMs : 0;
      if (this.arriving >= 0 && !this.arrivalShown) {
        this.arrivalShown = true;
        const fx = arrivalFx(ARRIVAL_CHOICE, this.classKey);
        for (const key of fx.under) this.bodyFx.burst(key, 'under');
        for (const key of fx.over) this.bodyFx.burst(key, 'over');
      }
      look = arrivalBody(ARRIVAL_CHOICE, this.arriving);
      if (look.done) this.arriving = null;
    } else if (this.leaving !== null) {
      this.leaving += dtMs;
      look = departBody(this.leaving);
      if (look.done) {
        this.leaving = null;
        this.away = true;
      }
    } else if (this.away) {
      look = { alpha: 0, white: 0, hud: false, done: false };
    }
    const present = look === null || look.done;
    this.teleporting = !present;
    if (look !== null && !look.done) {
      this.figure.setBodyAlpha(look.alpha);
      this.figure.setWhite(look.white);
    } else {
      this.figure.setWhite(0);
    }
    this.hud.setVisible(look === null || look.hud);
  }

  // Effect aura: twinkling diamond "stars" orbiting the hero while an ongoing effect
  // is active (gold for a Renew/HoT, cyan shield, violet buff, etc.) + a cast burst
  // ring that expands and fades on each ability cast.
  private drawAura(c: Combatant): void {
    this.aura.clear();
    const cx = BODY_CX; // centre the shield/stars on the same line as the body + HP bar
    const cy = BODY_MID_Y;
    if (this.castMs > 0) {
      const t = this.castMs / CAST_MS;
      this.aura.circle(cx, cy, (1 - t) * 15 + 5).stroke({ color: this.castColor, width: 2, alpha: t });
    }
    if (!c.alive) return;
    // Every hero ability, the world bosses' kit and the party auras are drawn by the ability effects
    // (render/abilityFx). What is left here is the generic vocabulary for an effect nobody has drawn yet: green
    // up-arrows (offense buff), shields (defense buff), red down-arrows (debuff) over the body's vertical span.
    const cats = auraCategories(c.effects);
    const region = {
      cx,
      topY: FEET_Y - HERO_HEIGHT + 4,
      botY: FEET_Y - 2,
      cy: BODY_MID_Y, // heroes never wear the mark; the body's middle is fine
      halfW: BODY_HALF_W,
      scale: AURA_SCALE,
      elapsed: this.elapsed,
    };
    drawCategoryAuras(this.aura, cats, region);
  }
}
