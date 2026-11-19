import { Container, Graphics, Text } from 'pixi.js';
import { StripSounds, hitSound } from './stripSounds';
import { playSound } from '@/audio/soundEngine';
import type { Application } from 'pixi.js';
import { GameEngine } from './engine';
import { setEngine } from './engineRef';
import { HeroSprite } from './render/HeroSprite';
import { EnemySprite } from './render/EnemySprite';
import { StripBackdrop } from './render/StripBackdrop';
import { STRIP_PATH_Y } from './render/stripBackdropData';
import { FloatingTextLayer } from './render/FloatingText';
import { FloatingSignLayer } from './render/FloatingSigns';
import { BOSS_DOWN_BLACK, TELEPORT_FROM_BLACK, bossDownBlackAlpha, smoothBeatClock } from './render/bossDown';
import { wipeLook } from './render/wipeBeat';
import { arrivalDelayMs } from './render/arrival';
import { TICK_MS } from '@/sim/Simulation';
import { isDisarmed } from '@/sim/effects';
import { ProjectileLayer, lookFlightMs } from './render/Projectiles';
import { PortalSprite } from './render/PortalSprite';
import { PetCompanion } from './render/PetCompanion';
import { PORTAL_ENTER_FX, PORTAL_FROM_RIGHT } from './render/portalLook';
import { ENEMY_Z } from './render/eliteLook';
import { CrowdLayout, type CrowdMember } from './render/crowdLayout';
import { CHARGED_SHOT, CHARGE_HIT_FX, CHARGE_HIT_LIFT, FOCUS_RETICLE_FX, FOCUS_RETICLE_LIFT, FOE_CUES } from './render/foeFx';
import { focusedHero } from '@/sim/enemyTraits';
import { Delayed } from './render/delayed';
import { KIT_FONT_PHRASE, applyKitFont } from './render/kitFont';
import { t, type PlainTextKey } from '@/i18n';
import { castFx, FX } from './render/fx';
import { creatureRole, enemyRank } from './render/figureData';
import { loadHeroFigures, worldFigures } from './render/figureTextures';
import { BLOW_SIGNS, CLEANSE_FLASH, LIGHT_SHOTS, abilityLook, bandCount, hasAuraLook, type AbilityLook, type BandLook, type CastBurst } from './render/abilityFx';
import { BlowFxLayer } from './render/BlowFx';
import { BLOW_PAST_PARTY, FOE_ARC_HEIGHT, FOE_SHOT, WARN_HOT_FROM, areaBlow, bossLook, burstOffsets, shotGoesOver, warnTiles, waveReachMs, type AreaBlow } from './render/enemyFx';
import { FxShots, fxLoop, type FxLoop } from './render/BodyFx';
import { BossKitFx } from './render/BossKitFx';
import { SHOVE } from './render/bossFx';
import { ShoveDelay } from './render/shoveDelay';
import { doubleFigure, summonFigure } from './render/summonFigures';
import { loadFx } from './render/fxTextures';
import { loadStripHud } from './render/stripHudTextures';
import { HERO_HUD_STEP, HERO_HUD_WIDTH, stackBars } from './render/stripHud';
import { createPixiApp } from './render/createPixiApp';
import type { Combatant, CombatEvent, WorldState } from '@/sim/world';
import { worldOf, stageInWorld, isZoneBossStage } from '@/data/stageScaling';
import { isFinalStage, worldInDifficulty } from '@/data/difficulties';
import { CLASS_KEYS } from '@/data/classes';
import { MOVE_EPS, RANGE, SPAWN_AHEAD, WALK_SPEED, TELEPORT_HOLD_MS, TELEPORT_LIFT_AT } from '@/data/field';
import { hexToNum } from '@/styles/palette';
import { useStore } from '@/state/store';
import { isStripDragging } from '@/platform/dragState';

// Owns the Pixi Application + the render driver. Each animation frame it advances
// the GameEngine (fixed 100ms sim steps internally), then reconciles sprites from
// the live world and turns combat events into floating text / hit flashes. The
// render layer READS sim state and never mutates it.

const STRIP_HEIGHT = 160; // must match App.STRIP_LOGICAL_HEIGHT
// A hero this close behind the front of an area blow's stretch is the front hero it lands on (render/enemyFx impact).
const BLOW_FRONT_REACH = 20;
const STRIP_WIDTH = 600; // must match App.STRIP_LOGICAL_WIDTH — the canvas is a FIXED logical size
                         // (rendered at ×uiScale); Game Scale zooms the whole strip in the DOM.
// The fighters stand on the backdrop art's path line: the figures anchor exactly on their ground row, so the
// ground line every sprite and ground effect is given IS the path (y = 123 of the 160).
const GROUND_Y = STRIP_PATH_Y;
// Deadzone + spring camera. The lead (melee) hero sits ~ANCHOR_FRAC across when settled —
// around mid-screen — and the camera only tracks (as an underdamped SPRING) once the party
// drifts past the DEADZONE of that anchor, so it lags and REBOUNDS instead of locking on.
// The deadzone is generous (~15%): the party visibly pushes ahead before the camera catches
// up. The wave still spawns SPAWN_AHEAD ahead, so SPAWN_VIEW_FRAC + SPAWN_AHEAD are tuned to
// keep that spawn on-screen even at the deadzone's far edge. Background scroll follows the camera.
const ANCHOR_FRAC = 0.40; // a bit left of dead-centre, leaving more room toward the spawn
const DEADZONE_FRAC = 0.15;
// Where the wave spawn point (partyX + SPAWN_AHEAD) lands across the party→right-edge span.
// Pulled in so that, with the centred anchor + wide deadzone, the spawn still materialises
// on-screen rather than off the right edge.
const SPAWN_VIEW_FRAC = 0.70;
const CAM_STIFFNESS = 60; // a touch snappier reaction
const CAM_DAMPING = 4.5; // damping ratio ≈ 0.29 → springy, overshoots the anchor and wobbles before settling
const CAM_MAX_DT = 0.05; // clamp camera step so a long/backgrounded frame can't blow up the spring

// Death-knell lines shown over the black during a full-party wipe (one picked at random
// per wipe). Cosmetic flavor — render-only, so Math.random here is fine.
const WIPE_PHRASES: readonly PlainTextKey[] = ['overlay.wipe1', 'overlay.wipe2', 'overlay.wipe3', 'overlay.wipe4', 'overlay.wipe5'];

// Display-position tracking (sim steps at 10fps → interpolate to 60fps). Easing toward the
// sim value is smooth, but a plain exponential ACCELERATES to close a large gap — a hero
// reads as lurching/zooming toward the enemy. So we ease, then CLAMP the per-frame step to
// the unit's OWN sim speed (+ a little slack) → constant on-screen velocity, no surge —
// while small everyday gaps still ride the smooth exponential tail.
const DISPLAY_TAU_MS = 70;
const DISPLAY_SPEED_SLACK = 1.1; // headroom over sim speed so a lag can still recover
function trackDisplay(prev: number, target: number, dtMs: number, speedPxps: number): number {
  const eased = prev + (target - prev) * (1 - Math.exp(-dtMs / DISPLAY_TAU_MS));
  const maxStep = (speedPxps * DISPLAY_SPEED_SLACK * dtMs) / 1000;
  const step = eased - prev;
  if (Math.abs(step) <= maxStep) return eased;
  return prev + Math.sign(step) * maxStep;
}

// Crowded-HUD declutter: when party members bunch up their overhead HUDs overlap, so a
// rear hero's HUD is lifted above the one just ahead of it (tiered upward).
const HUD_OVERLAP_PX = HERO_HUD_WIDTH + 2; // horizontal gap (art px) under which two hero HUDs collide
const HUD_LIFT_STEP = HERO_HUD_STEP; // px each successive crowded HUD is raised: a bar and a row of chips

export class GameStrip {
  private app: Application | null = null;
  private readonly world = new Container();
  // The world's backdrop (parallax layers + atmosphere): `back` under the fighters, `front` over them.
  private readonly backdrop = new StripBackdrop();
  private readonly combatants = new Container();
  private readonly projectiles = new ProjectileLayer();
  // Ability effects that lie on the ground under every fighter (a war cry's ring crossing the party): render/abilityFx.
  private readonly fxGround = new FxShots();
  private readonly fxAir = new FxShots(); // ability one-shots played over the fighters (a blast, arrows coming down)
  // An enemy's area blow (render/enemyFx): the warning laid on the ground while it is wound up — under the
  // fighters, a child of fxGround — and the front that runs back through the party and the mark of a blow aimed at
  // the front hero, over them (a child of fxAir).
  private readonly blowWarn = new BlowFxLayer();
  // The share of its damage that is magic, by the boss winding up a blow (seen while it is wound up): which look of
  // a blow's signs to show where it lands (render/enemyFx bossLook).
  private readonly blowMagic = new Map<string, number>();
  private readonly blowFront = new BlowFxLayer();
  private readonly floating = new FloatingTextLayer();
  private readonly delayed = new Delayed(); // hits held back a beat so their number lands with the blow
  // The boss kit's own spectacle (render/BossKitFx): cast cues, the bolt, each boss's Deadeye shot, the leech.
  private readonly bossKit = new BossKitFx({ ground: this.fxGround, air: this.fxAir, projectiles: this.projectiles, delayed: this.delayed, heroes: () => this.heroSprites, enemies: () => this.enemySprites, sign: (x, y, abilityKey) => this.signs.spawn(x, y, castFx(abilityKey).sign) });
  // A hero thrown back by a wave goes when the wave reaches him on the strip (render/shoveDelay).
  private readonly shove = new ShoveDelay();
  private readonly shotLandMs = new Map<string, number>(); // per ability fired at the wave: when its last shot lands, from its cast
  private readonly signs = new FloatingSignLayer(); // the sign of an ability, over the hero that casts it
  // The world-boss portal, pinned screen-right while farming a beaten W-9 (see frame()).
  private readonly portal = new PortalSprite();
  private readonly pet = new PetCompanion(); // the chosen companion: cosmetic, behind the party (render/petMotion)
  // Full-strip blackout for the teleport sequence + the wipe cinematic; teleportMs counts
  // down the zone-teleport sequence. The wipe cinematic is driven instead by the sim's wipeMs.
  private readonly blackout = new Graphics();
  // The death-knell phrase shown over the black during a wipe.
  private readonly wipePhrase = new Text({ text: '', style: { fontFamily: 'monospace', fontSize: 20, fill: hexToNum('#e8e2d6'), align: 'center' } });
  private wipeActive = false; // a wipe cinematic is on screen (drives one-time phrase pick)
  private teleportMs = 0;
  private bossDownClock = -1; // ms into a fallen world boss's beat as drawn (-1: no beat) — render/bossDown
  private bossDownBlack = 0; // blackout the beat has put on the strip (the teleport that follows starts from it)
  private wipeClock = -1; // ms into the party's defeat as drawn (-1: none) — render/wipeBeat
  private wipeArrived = false; // the defeated party's arrivals have been started (once per defeat)
  private teleportArrived = true; // the arrivals of the world change in progress have been started
  private prevWorld = -1; // last seen zone (worldOf) — a change triggers a teleport
  private heroSprites = new Map<string, HeroSprite>();
  private heroesSeeded = false; // false until the initial party is placed; a hero sprite born AFTER is a fresh recruit → materialises in
  private enemySprites = new Map<string, EnemySprite>();
  private engine: GameEngine | null = null;
  private readonly sounds = new StripSounds(); // what the strip sounds like (game/stripSounds)
  private uiScale = 1;
  private logicalWidth = 0;
  private cameraX = -1; // world x at screen-left; -1 = uninitialized
  private camVel = 0; // camera velocity (world px/s) for the spring
  // Smoothed (interpolated) world positions — the sim steps at 10fps; these ease
  // toward the latest sim value each render frame so motion is continuous at 60fps
  // (no "teleporting" between ticks). The camera reads the smoothed party position.
  private displayPartyX = -1;
  private readonly enemyDisplayX = new Map<string, number>();
  private readonly crowd = new CrowdLayout(); // where each wave enemy is drawn as it comes and in its line (render/crowdLayout)
  private focusReticle: FxLoop | null = null; // Fuego concentrado's one reticle (render/foeFx)
  private pointer: { x: number; y: number } | null = null; // where the pointer is over the strip (the stage's space), for the chip tooltip
  private readonly heroDisplayX = new Map<string, number>();

  get logicalHeight(): number {
    return STRIP_HEIGHT;
  }

  async init(container: HTMLElement, uiScale: number, transparent = false): Promise<void> {
    this.uiScale = uiScale;
    // FIXED logical size (no resizeTo): the canvas is always STRIP_WIDTH×STRIP_HEIGHT at
    // ×uiScale. Game Scale zooms the whole strip section in the DOM (App), not the canvas.
    // The transparent overlay canvas falls back to opaque if a GL surface can't be composited
    // — see createPixiApp. A total failure throws (caught by GameView → RenderErrorPanel).
    const app = await createPixiApp({ width: STRIP_WIDTH * uiScale, height: STRIP_HEIGHT * uiScale, transparent });
    container.appendChild(app.canvas);
    this.app = app;
    // Load the heroes' figures and the shared effect textures before the first frame. A world's creatures load
    // lazily when the party gets there (reconcileEnemies); the backdrop loads its own sheet the same way.
    await Promise.all([loadHeroFigures(CLASS_KEYS), loadFx(CLASS_KEYS), loadStripHud()]);
    this.engine = new GameEngine();
    this.fxGround.addChild(this.blowWarn, this.bossKit.cuesGround);
    this.fxAir.addChild(this.blowFront, this.bossKit.cuesAir);
    setEngine(this.engine);

    this.combatants.sortableChildren = true; // honour zIndex (party above enemies)
    this.pet.zIndex = 2.5; // over the heroes it flies past
    this.combatants.addChild(this.pet);
    this.world.addChild(this.backdrop.back, this.fxGround, this.combatants, this.backdrop.front, this.fxAir, this.projectiles, this.signs, this.floating, this.portal, this.blackout, this.wipePhrase);
    // The portal is the ONLY interactive object — prune every other layer (and its whole
    // subtree of sprites/graphics) from pointer hit-testing so a tap walks just the portal.
    for (const layer of [this.backdrop.back, this.fxGround, this.combatants, this.backdrop.front, this.fxAir, this.projectiles, this.signs, this.floating, this.blackout, this.wipePhrase]) {
      layer.eventMode = 'none';
    }
    this.wipePhrase.anchor.set(0.5);
    applyKitFont(this.wipePhrase, KIT_FONT_PHRASE, 20);
    this.wipePhrase.visible = false;
    this.portal.visible = false;
    this.blackout.visible = false;
    this.portal.on('pointertap', () => this.onPortalTap());
    app.stage.addChild(this.world);
    this.relayout();
    app.stage.scale.set(this.uiScale);

    app.renderer.on('resize', () => this.relayout());
    app.ticker.add((t) => this.frame(t.deltaMS));
    // The effect chips over the heroes explain themselves on hover (ui/overlay/StripEffectTip): the strip only
    // says which chip the pointer is on.
    app.canvas.addEventListener('pointermove', this.onPointerMove);
    app.canvas.addEventListener('pointerleave', this.onPointerLeave);
  }

  applyScale(uiScale: number): void {
    this.uiScale = uiScale;
    if (this.app === null) return;
    this.app.stage.scale.set(uiScale);
    this.relayout();
  }

  private readonly onPointerMove = (ev: PointerEvent): void => {
    const app = this.app;
    if (app === null) return;
    const r = app.canvas.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return;
    this.pointer = { x: ((ev.clientX - r.left) / r.width) * app.screen.width, y: ((ev.clientY - r.top) / r.height) * app.screen.height };
    this.refreshChipTip();
  };

  private readonly onPointerLeave = (): void => {
    this.pointer = null;
    useStore.getState().setStripTip(null);
  };

  // Which hero's effect chip the pointer is on, if any — asked on every move and every frame while it is over the
  // strip (the heroes walk, effects end).
  private refreshChipTip(): void {
    if (this.pointer === null) return;
    for (const hero of this.heroSprites.values()) {
      const at = hero.toLocal(this.pointer);
      const hit = hero.effectChipAt(at.x, at.y);
      if (hit === null) continue;
      const corner = hero.toGlobal({ x: hit.x, y: hit.y });
      useStore.getState().setStripTip({ effects: hit.worn, x: Math.round(corner.x / this.uiScale), y: Math.round(corner.y / this.uiScale) });
      return;
    }
    useStore.getState().setStripTip(null);
  }

  destroy(): void {
    this.app?.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.app?.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    setEngine(null);
    // releaseGlobalResources clears the renderer's pooled batches/textures so a remount
    // (React StrictMode double-mounts in dev) doesn't inherit stale pools → flicker.
    this.app?.destroy({ removeView: true, releaseGlobalResources: true }, { children: true });
    this.app = null;
  }

  private relayout(): void {
    if (this.app === null) return;
    this.logicalWidth = this.app.screen.width / this.uiScale;
    // The full-strip blackout is static geometry — tessellate it once here (and on each
    // resize) so the wipe/teleport cinematics only animate its alpha, never re-build the
    // GPU geometry per frame (Graphics are meant to be stable, not redrawn every frame).
    this.blackout.clear().rect(0, 0, this.logicalWidth, STRIP_HEIGHT).fill({ color: 0x000000 });
  }

  private frame(dtMs: number): void {
    const engine = this.engine;
    if (engine === null) return;
    const events = engine.update(dtMs);
    const w = engine.world;
    const groundY = GROUND_Y;
    // Interpolate the 100ms sim steps into smooth 60fps motion, velocity-matched to each
    // unit's sim speed so it tracks at constant on-screen speed rather than surging.
    this.displayPartyX = this.displayPartyX < 0 ? w.partyX : trackDisplay(this.displayPartyX, w.partyX, dtMs, WALK_SPEED);

    // World→screen zoom: fit the spawn distance to SPAWN_VIEW_FRAC of the party→right-edge
    // span, so a wave materialises ON-SCREEN (teleport-in) with field visible past it, not
    // at the very border. Clamped for sane melee spacing.
    const anchorScreen = this.logicalWidth * ANCHOR_FRAC;
    const pxScale = Math.max(1.0, Math.min(3.4, (SPAWN_VIEW_FRAC * (this.logicalWidth - anchorScreen)) / SPAWN_AHEAD));
    const cameraX = this.updateCamera(this.displayPartyX, pxScale, anchorScreen, dtMs);
    const toScreen = (wx: number): number => (wx - cameraX) * pxScale;

    this.backdrop.update(cameraX * pxScale, w.globalStageIndex, dtMs);
    this.world.x = this.backdrop.shakeX; // a lightning strike shakes the whole strip for an instant
    // The party's defeat (render/wipeBeat): the fallen heroes read as freshly slain (prominent, no 60 s respawn
    // bar) until the strip is black, are GONE while it is black and while the stage they fell back to shows
    // empty under its sign, and then come back one after another, front to back (HeroSprite.arrive).
    const wipeMs = w.wipeMs;
    this.wipeClock = wipeMs === undefined ? -1 : smoothBeatClock(this.wipeClock, wipeMs, dtMs, TICK_MS);
    const wipeParty = wipeMs === undefined ? null : wipeLook(wipeMs).party;
    const wipeHidden = wipeParty === 'gone';
    const wipeDead = wipeParty === 'fallen';
    if (wipeParty === 'back' && !this.wipeArrived) {
      // The sim has just revived the party in formation: snap displays to those new x's (no slide from the
      // death spot) and give every hero its turn. Done before reconcileHeroes, so no hero shows a frame early.
      this.wipeArrived = true;
      this.heroDisplayX.clear();
      this.shove.clear();
      this.arriveParty(w.heroes);
    }
    if (wipeMs === undefined) this.wipeArrived = false;
    this.sounds.update(w); // the ambience, what steps in, chests, wipes (game/stripSounds)
    this.reconcileHeroes(w.heroes, w.enemies, groundY, dtMs, toScreen, wipeDead, wipeHidden);
    this.reconcileEnemies(w, groundY, dtMs, toScreen);
    this.updatePet(w, events, groundY, dtMs, toScreen, wipeDead, wipeHidden);
    this.showFocusReticle(w, dtMs);
    this.refreshChipTip();
    this.delayed.tick(dtMs);
    this.applyEvents(events, groundY);
    this.sounds.events(events, w);
    this.fxGround.update(dtMs);
    this.fxAir.update(dtMs);
    this.blowWarn.update(dtMs);
    this.blowFront.update(dtMs);
    this.bossKit.update(dtMs);
    this.projectiles.update(dtMs);
    this.floating.update(dtMs);
    this.signs.update(dtMs);
    this.updatePortal(w, groundY, dtMs);
    this.driveBossDown(w, dtMs);
    this.detectAndDriveTeleport(w, dtMs);
    this.driveWipe(w);
  }

  // The chosen companion (state `selectedPet`; cosmetic): told where the party's last hero is drawn and what just
  // happened (a boss fell, a chest dropped, the party fell), it does the rest itself.
  private updatePet(w: WorldState, events: readonly CombatEvent[], groundY: number, dtMs: number, toScreen: (wx: number) => number, fallen: boolean, hidden: boolean): void {
    const store = useStore.getState();
    let rearX: number | undefined;
    for (const x of this.heroDisplayX.values()) rearX = rearX === undefined ? x : Math.min(rearX, x);
    this.pet.update(
      {
        petKey: store.selectedPet,
        rearX,
        toScreen,
        groundY,
        fallen,
        hidden,
        bossIds: w.enemies.filter((e) => e.alive && e.isBoss === true).map((e) => e.id),
        events,
        chestCount: store.chests.reduce((sum, c) => sum + c.count, 0),
        levelSum: store.roster.reduce((sum, h) => sum + h.level, 0), // the level-up gesture: drop this line to remove it
      },
      dtMs,
    );
  }

  // A world boss has fallen and the simulation gives its defeat a beat (world.bossDown): the boss plays its
  // death in its own world (EnemySprite holds it for the whole beat) with the party standing. When the win
  // leads on to another world, the strip fades to black over the end of the beat so the world changes unseen;
  // the teleport that follows (detectAndDriveTeleport) then starts from black. The sim owns the timing.
  private driveBossDown(w: WorldState, dtMs: number): void {
    const beat = w.bossDown;
    if (beat === undefined) {
      this.bossDownClock = -1;
      return; // any blackout the beat left is taken over (or cleared) by detectAndDriveTeleport this frame
    }
    this.bossDownClock = smoothBeatClock(this.bossDownClock, beat.ms, dtMs, TICK_MS);
    const leavesWorld = beat.firstClear && !isFinalStage(w.globalStageIndex);
    this.bossDownBlack = leavesWorld ? bossDownBlackAlpha(this.bossDownClock, beat.totalMs) : 0;
    this.blackout.visible = this.bossDownBlack > 0.001;
    this.blackout.alpha = this.bossDownBlack; // geometry built in relayout(); only the alpha animates
  }

  // Paint the party's defeat from the sim's elapsed wipeMs (render/wipeBeat says what shows when): the strip
  // fades to black, the phrase comes up ALONE on the black, leaves, and the strip comes back on the stage the
  // party fell back to. The heroes are hidden by reconcileHeroes meanwhile; the stage's sign (the UI's band)
  // waits for the strip to be back (engine → hud.stageSignHeld). The sim owns the timing; this only paints it.
  private driveWipe(w: WorldState): void {
    if (w.wipeMs === undefined) {
      if (this.wipeActive) {
        this.wipeActive = false;
        this.wipePhrase.visible = false;
        this.blackout.visible = false;
      }
      return;
    }
    if (!this.wipeActive) {
      this.wipeActive = true;
      this.wipePhrase.text = t(WIPE_PHRASES[Math.floor(Math.random() * WIPE_PHRASES.length)] ?? 'overlay.wipe1');
    }
    const look = wipeLook(this.wipeClock);
    this.blackout.visible = look.black > 0.001;
    this.blackout.alpha = look.black; // geometry built in relayout(); only the alpha animates
    this.wipePhrase.alpha = look.phrase;
    this.wipePhrase.visible = look.phrase > 0.01;
    this.wipePhrase.position.set(this.logicalWidth / 2, STRIP_HEIGHT * 0.46);
  }

  /** Every hero of a party that comes back gets its turn to arrive: one after another, front to back. */
  private arriveParty(heroes: readonly Combatant[]): void {
    heroes.forEach((h, i) => this.heroSprites.get(h.id)?.arrive(arrivalDelayMs(i)));
  }

  // Watch for a ZONE change (worldOf) from normal progression and play the party's journey: the heroes are
  // taken up (HeroSprite.depart), a full-strip blackout crests over the swap, and they arrive one after another
  // as it lifts (HeroSprite.arrive). After a fallen world boss's beat the strip is already black: the heroes are
  // simply gone and only the arrival plays. A wipe is NOT handled here — it has its own cinematic (driveWipe);
  // the journey is suppressed while one runs so the retreat's world swap doesn't double-trigger it.
  private detectAndDriveTeleport(w: WorldState, dtMs: number): void {
    const world = worldOf(w.globalStageIndex);
    const wiping = w.wipeMs !== undefined;
    if (this.prevWorld < 0) {
      this.prevWorld = world; // first frame (or post-offline catch-up) — no FX
    } else if (world !== this.prevWorld && !wiping) {
      // (Re)start the sequence — from black when a fallen world boss's beat has just faded the strip out.
      const fromBlack = this.bossDownBlack > BOSS_DOWN_BLACK / 2;
      this.teleportMs = TELEPORT_HOLD_MS * (fromBlack ? 1 - TELEPORT_FROM_BLACK : 1);
      this.teleportArrived = false;
      for (const s of this.heroSprites.values()) s.depart(!fromBlack);
    }
    if (w.bossDown === undefined && this.bossDownBlack > 0) {
      // The beat is over: its blackout belongs to the teleport now — or, if no teleport follows (the player
      // travelled away within the same world), it is lifted.
      this.bossDownBlack = 0;
      if (this.teleportMs <= 0) this.blackout.visible = false;
    }
    this.prevWorld = world;
    if (wiping) return; // the wipe cinematic owns the screen

    if (this.teleportMs <= 0) return;
    this.teleportMs -= dtMs;
    const phase = Math.min(1, 1 - this.teleportMs / TELEPORT_HOLD_MS); // 0→1 across out+in
    // Blackout: ramp to black as the party is taken, hold over the swap, lift as it arrives.
    let a = 0;
    if (phase < 0.4) a = phase / 0.4;
    else if (phase < TELEPORT_LIFT_AT) a = 1;
    else a = Math.max(0, 1 - (phase - TELEPORT_LIFT_AT) / (1 - TELEPORT_LIFT_AT));
    this.blackout.visible = true;
    this.blackout.alpha = a * 0.9; // geometry built in relayout(); only the alpha animates
    if (phase >= TELEPORT_LIFT_AT && !this.teleportArrived) {
      this.teleportArrived = true;
      this.heroDisplayX.clear();
      this.shove.clear();
      this.arriveParty(w.heroes);
    }
    if (this.teleportMs <= 0) this.blackout.visible = false;
  }

  // The world boss's gate (render/PortalSprite): it stands on the path near the strip's right edge ONLY while the
  // party farms a beaten W-9 (the gate into the W-10 world boss). It needs a zone KEY: chained shut without one
  // (tapping it still nudges via a toast), awake with one. When the party goes in, the gate flares and is gone.
  private updatePortal(w: WorldState, groundY: number, dtMs: number): void {
    const onBeatenNine = stageInWorld(w.globalStageIndex) === 9 && w.maxClearedStage >= w.globalStageIndex;
    if (!onBeatenNine) {
      if (this.portal.visible) {
        // It was standing a frame ago: if the party is now in the boss's stage, it went IN.
        if (isZoneBossStage(w.globalStageIndex)) this.fxAir.play(PORTAL_ENTER_FX, this.portal.x, this.portal.y);
        this.portal.rest();
      }
      this.portal.visible = false;
      return;
    }
    this.portal.visible = true;
    this.portal.position.set(this.logicalWidth - PORTAL_FROM_RIGHT, groundY);
    this.portal.update(dtMs, useStore.getState().zoneKeysFor(w.globalStageIndex));
  }

  private onPortalTap(): void {
    if (isStripDragging()) return; // a drag that ended over the portal isn't a tap
    const w = this.engine?.world;
    if (w === undefined) return;
    useStore.getState().requestEnterZoneBoss(worldOf(w.globalStageIndex));
  }

  // Deadzone + underdamped spring. The camera holds while the lead hero stays within
  // the deadzone of the anchor (heroes advance, background still); once it pushes
  // past, the camera springs to re-anchor — lagging then slightly overshooting.
  private updateCamera(partyX: number, pxScale: number, anchorScreen: number, dtMs: number): number {
    const deadzone = this.logicalWidth * DEADZONE_FRAC;
    if (this.cameraX < 0) {
      this.cameraX = partyX - anchorScreen / pxScale;
      this.camVel = 0;
    }
    const dev = (partyX - this.cameraX) * pxScale - anchorScreen; // lead hero's deviation from anchor
    // Inside the deadzone the camera holds (heroes advance, background still). Past
    // it, the target only brings the hero back to the deadzone EDGE — a gentle track,
    // not a snap to center — so the camera smooth-follows at the threshold.
    let target = this.cameraX;
    if (dev > deadzone) target = partyX - (anchorScreen + deadzone) / pxScale;
    else if (dev < -deadzone) target = partyX - (anchorScreen - deadzone) / pxScale;
    const dt = Math.min(CAM_MAX_DT, dtMs / 1000);
    const accel = CAM_STIFFNESS * (target - this.cameraX) - CAM_DAMPING * this.camVel;
    this.camVel += accel * dt;
    this.cameraX += this.camVel * dt;
    return this.cameraX;
  }

  private reconcileHeroes(heroes: Combatant[], enemies: readonly Combatant[], groundY: number, dtMs: number, toScreen: (wx: number) => number, wipeDead: boolean, wipeHidden: boolean): void {
    // A boss in the fight on which the party's engage ultimates have fired: their chips show spent (render/stripHud).
    const bossEngaged = enemies.some((e) => e.alive && e.isBoss === true && e.bossUltTriggered === true);
    // Heroes are placed by their OWN world position (they move freely / stack); each
    // display x velocity-matches its sim x for smooth, surge-free 60fps motion.
    const live = new Set(heroes.map((h) => h.id));
    for (const id of [...this.heroDisplayX.keys()]) {
      if (live.has(id)) continue;
      this.heroDisplayX.delete(id);
      this.shove.forget(id);
    }
    // The party's passive auras (the Priest's Retribution: a talent a living hero holds) have no effect in the
    // simulation to draw from: every hero is told which reach it, and wears their look.
    const auras = heroes.flatMap((h) => (h.alive ? (h.auraKeys ?? []).filter(hasAuraLook).map((key) => ({ abilityKey: key, sourceId: h.id })) : []));
    const placed: { sprite: HeroSprite; x: number }[] = [];
    for (const c of heroes) {
      let sprite = this.heroSprites.get(c.id);
      if (sprite === undefined) {
        sprite = new HeroSprite(c.classKey ?? 'knight');
        sprite.zIndex = 2; // party draws ABOVE enemies
        // A hero whose sprite is born after the initial party was placed is a fresh
        // recruit — materialise it in (top-down respawn FX) rather than popping in.
        if (this.heroesSeeded) sprite.arrive();
        this.heroSprites.set(c.id, sprite);
        this.combatants.addChild(sprite);
      }
      // Once the wipe goes black the party is "gone": hide the sprite (and DON'T update it,
      // since update() would force it visible again) so the world fades back in empty.
      if (wipeHidden) {
        sprite.visible = false;
        continue;
      }
      const prev = this.heroDisplayX.get(c.id);
      // (Thrown back — Resaca drags the party — a hero goes when the wave reaches HIM on the strip, and is swept
      // there fast; he walks back at his own pace.)
      const aim = this.shove.target(c.id, c.x, dtMs, SHOVE.fromPx, () => this.waveReachesMs(sprite.x));
      const disp = prev === undefined ? c.x : trackDisplay(prev, aim, dtMs, prev - aim > SHOVE.fromPx ? WALK_SPEED * SHOVE.speedMult : WALK_SPEED);
      this.heroDisplayX.set(c.id, disp);
      const sx = toScreen(disp);
      sprite.setPartyAuras(auras);
      sprite.setBossEngaged(bossEngaged);
      sprite.leadAttack(c, inReach(c, enemies) && !isDisarmed(c.effects), dtMs); // a bound hero (Roots) starts no attack
      sprite.update(c, sx, groundY, dtMs, wipeDead);
      placed.push({ sprite, x: sx });
    }
    // The initial party is now on screen; any hero sprite created from here on is a recruit.
    this.heroesSeeded = true;
    this.layoutHeroHuds(placed);
  }

  // Lift a rear hero's HUD above the party member just ahead of it whenever they crowd
  // close enough for the overhead bars to overlap — tiered, so 3 stacked heroes step up.
  private layoutHeroHuds(placed: { sprite: HeroSprite; x: number }[]): void {
    const order = placed.slice().sort((a, b) => b.x - a.x); // frontmost (largest x) first
    let prevX = Number.POSITIVE_INFINITY;
    let prevLift = 0;
    for (const p of order) {
      const lift = prevX - p.x < HUD_OVERLAP_PX ? prevLift + HUD_LIFT_STEP : 0;
      p.sprite.setHudLift(lift);
      prevX = p.x;
      prevLift = lift;
    }
  }

  // The enemies' life bars: enemies bunch at the front line on the same spot, so a bar that would lie on another
  // steps up over it — and one that finds no room is not shown (render/stripHud stackBars). Elites keep their
  // place (they are placed first), then the common enemies from the front. Only bars that are wanted count: a
  // common enemy wears one only while it is hurt.
  private layoutEnemyHuds(placed: { sprite: EnemySprite; x: number }[]): void {
    const wanted = placed.flatMap((p) => {
      const box = p.sprite.barBox;
      if (box === null) p.sprite.setBarLift(0);
      return box === null ? [] : [{ sprite: p.sprite, box }];
    });
    wanted.sort((a, b) => Number(b.box.elite) - Number(a.box.elite) || b.box.x - a.box.x);
    const lifts = stackBars(wanted.map((w) => w.box));
    wanted.forEach((w, i) => w.sprite.setBarLift(lifts[i] ?? null));
  }

  private reconcileEnemies(w: WorldState, groundY: number, dtMs: number, toScreen: (wx: number) => number): void {
    const enemies = w.enemies;
    const live = new Set(enemies.map((e) => e.id));
    // The creatures of the world the party is in (data/worlds.ts by role). They load when the world is entered:
    // until they are ready (a few frames) a new enemy's sprite is not created yet; the sprites already on screen
    // keep the figures they were made with.
    const figures = worldFigures(worldInDifficulty(w.globalStageIndex));
    const worldBossStage = isZoneBossStage(w.globalStageIndex);

    // Where each enemy is this frame (velocity-matched to its sim x: smooth, no surge, capped at its own advance
    // speed), and — presentation only — where a wave enemy is drawn: walking where it walks, then in the line at
    // its spot, a melee platoon all fighting at the hero (render/crowdLayout).
    const crowd: CrowdMember[] = [];
    for (const c of enemies) {
      const prev = this.enemyDisplayX.get(c.id);
      const speed = c.moveSpeed > 0 ? c.moveSpeed : WALK_SPEED;
      const disp = prev === undefined ? c.x : trackDisplay(prev, c.x, dtMs, speed);
      this.enemyDisplayX.set(c.id, disp);
      if (c.alive && c.isBoss !== true && c.summon === undefined) {
        const melee = c.enemyMagic !== true && c.range < RANGE.ranged; // as EnemySprite tells its style
        const arrived = c.movedThisTick !== true && inReach(c, w.heroes);
        crowd.push({ id: c.id, x: disp, line: c.range, melee, arrived, speed, prominent: c.isElite === true || c.enemyRole === 'support' });
      }
    }
    const places = this.crowd.update(crowd, dtMs);

    const placed: { sprite: EnemySprite; x: number }[] = [];
    for (const c of enemies) {
      let sprite = this.enemySprites.get(c.id);
      if (sprite === undefined) {
        if (figures === null) continue;
        // A world boss is drawn with its world's own figure for it, when the world has one (data/worlds.ts).
        const rank = enemyRank(c, worldBossStage);
        const own = rank === 'worldBoss' ? figures.worldBoss : undefined;
        // What a boss summons (its crows) is drawn with a figure of its own, made of effects (render/summonFigures).
        // …or, a hero's double (the Unmaker's reflection), with that hero's own figure in the double's skin.
        const summoned = c.summon === undefined ? undefined : c.summon.of !== undefined ? doubleFigure(c.summon.key, c.summon.of.classKey) : summonFigure(c.summon.key);
        if (summoned === null) continue;
        // A support is its world's own figure for it, or — until the world has one — its ranged creature, tinted.
        const supportOwn = c.enemyRole === 'support' ? figures.support : undefined;
        sprite = new EnemySprite(c, summoned ?? own ?? supportOwn ?? figures[creatureRole(c)], rank, own !== undefined, c.enemyRole === 'support' && supportOwn === undefined);
        sprite.zIndex = summoned !== undefined ? ENEMY_Z.summon : rank === 'elite' ? ENEMY_Z.elite : ENEMY_Z.common; // below the party; an elite in front of the pack it stands in; a summon over the party
        if (summoned === undefined) sprite.spawnIn(); // materialise (teleport-in) on first appearance; a summon flies in
        this.enemySprites.set(c.id, sprite);
        this.combatants.addChild(sprite);
        // A double steps out of the mirror the boss raised: the mirror goes dark and bursts, where it hung.
        const double = sprite.doubleLook;
        if (double !== null) this.fxAir.play(double.enter, toScreen(c.x), groundY - double.mirrorUp, -1);
      }
      // Its place as it comes and in its line (a dead enemy keeps the place it fell in; a boss or a summon has none).
      const place = places.get(c.id) ?? this.crowd.last(c.id);
      if (place !== undefined) sprite.setCrowd(place.lift, place.order, place.lunge);
      sprite.setQueued(place?.fighting === false);
      const sx = toScreen(place?.x ?? this.enemyDisplayX.get(c.id) ?? c.x);
      sprite.leadAttack(c, inReach(c, w.heroes), dtMs);
      if (c.casting !== undefined) {
        this.showBlowWarning(c, groundY);
        this.bossKit.showCastCue(c, sprite, w.heroes, groundY);
      }
      if (c.isBoss === true) this.bossKit.showLasting(c, groundY);
      sprite.update(c, sx, groundY, dtMs);
      if (c.alive) placed.push({ sprite, x: sx });
    }
    this.layoutEnemyHuds(placed);

    // Sprites whose combatant the sim has pruned: keep them playing the death-hold (~1s) at
    // their last world position (still tracking the camera), then remove once expired.
    for (const [id, sprite] of this.enemySprites) {
      if (live.has(id)) continue;
      const disp = this.enemyDisplayX.get(id);
      const at = this.crowd.last(id)?.x ?? disp;
      sprite.updateOrphan(at === undefined ? sprite.x : toScreen(at), groundY, dtMs);
      if (sprite.isExpired()) {
        this.combatants.removeChild(sprite);
        this.enemySprites.delete(id);
        this.enemyDisplayX.delete(id);
        this.crowd.forget(id);
      }
    }
  }

  private applyEvents(events: CombatEvent[], groundY: number): void {
    const shotWait = new Map<string, number>(); // per attacker: how long this batch's hits wait for its shot
    // The casts of this batch, by caster: the simulation resolves a spell's heals and hits in the instant of the
    // cast (and lists them BEFORE its cast marker), so a heal looks up here whether its healer is casting.
    const castBy = new Map<string, string>();
    for (const ev of events) if (ev.type === 'cast' && ev.abilityKey !== undefined) castBy.set(ev.targetId, ev.abilityKey);
    this.bossKit.beginEvents();
    for (const ev of events) {
      const heroSprite = this.heroSprites.get(ev.targetId);
      const enemySprite = this.enemySprites.get(ev.targetId);
      const sprite = heroSprite ?? enemySprite;
      const amt = ev.amount ?? 0;
      if (ev.type === 'cue' && ev.cue === 'cleanse' && heroSprite !== undefined) {
        // A heal lifted a harmful effect off this hero (sim/abilities.healCleanse): the flash lands with the heal —
        // at the healer's release when it comes from a spell being cast.
        const healer = ev.sourceId === undefined ? undefined : this.heroSprites.get(ev.sourceId);
        const spell = ev.sourceId === undefined ? undefined : castBy.get(ev.sourceId);
        this.delayed.add(healer !== undefined && spell !== undefined ? healer.castBlowMs(spell) : 0, () => {
          if (heroSprite.parent !== null) heroSprite.burstFx(CLEANSE_FLASH);
        });
      } else if (ev.type === 'cue' && ev.cue === 'volley' && heroSprite !== undefined && ev.abilityKey !== undefined) {
        // A later wave of an ability that lands in waves (sim/abilities.tickVolleys — Raining Arrows): its rain comes
        // down again over the wave, timed like the first so it lands with this wave's hits (abilityHitWaitMs).
        const look = abilityLook(ev.abilityKey);
        if (look !== undefined) this.playWaveLook(heroSprite, look, ev.abilityKey, groundY);
      } else if (ev.type === 'cue') {
        // A wave enemy's trait or a support falling (sim/enemyTraits): a brief flash, nothing that stays.
        const cue = ev.cue === undefined ? undefined : FOE_CUES[ev.cue];
        if (cue !== undefined && enemySprite !== undefined) this.playFoeCue(cue.fx, cue.at, enemySprite, groundY);
        else if (enemySprite !== undefined) this.bossKit.cue(ev, enemySprite); // a world boss's mechanic (Espejos)
      } else if (ev.type === 'cast' && ev.abilityKey !== undefined) {
        // Each ability shows its OWN sign (the one the panels show) over the hero that casts it, plus a
        // coloured burst ring. Enemies and bosses have no signs: theirs is the ring alone.
        const heroCaster = this.heroSprites.get(ev.targetId);
        const caster = heroCaster ?? this.enemySprites.get(ev.targetId);
        if (caster !== undefined) {
          const fx = castFx(ev.abilityKey); // total: an unknown key is a plain burst with no sign
          // An ability with its own pixel-art look (render/abilityFx) plays that; the others still get the old
          // coloured ring. A whole-wave cast (Holy Nova, Raining Arrows) plays its spectacle over the TARGET
          // band — the side it actually hits — so the caster's own ring would read as landing on its own party.
          const look = abilityLook(ev.abilityKey);
          const blow = heroCaster === undefined ? areaBlow(ev.abilityKey) : undefined;
          // …and so does a boss's own mechanic or affix (render/BossKitFx).
          const kit = heroCaster === undefined && caster instanceof EnemySprite && this.bossKit.cast(ev.abilityKey, caster, groundY);
          if (look === undefined && blow === undefined && !kit) caster.castBurst(fx.color);
          if (heroCaster !== undefined) {
            const at = heroCaster.signPoint();
            this.signs.spawn(at.x, at.y, fx.sign);
          }
          // The hero plays the ability's own clip (a heal, a shout, a cleave… — render/heroClips).
          heroCaster?.cast(ev.abilityKey);
          if (heroCaster !== undefined && look?.cast !== undefined) {
            for (const burst of look.cast) this.playCastBurst(heroCaster, burst, ev.abilityKey, groundY);
          }
          // An enemy's area blow (Brutal Smash, Ground Slam, Shockwave) runs back through the whole party.
          if (blow !== undefined) this.playAreaBlow(blow, caster, groundY, ev.targetId);
          // What the ability throws at the wave as a whole (a burning arrow, a flask) and what it scatters over it.
          if (heroCaster !== undefined && look !== undefined) this.playWaveLook(heroCaster, look, ev.abilityKey, groundY);
        }
      } else if (ev.tick === true) {
        // DoT/HoT periodic tick → floating number, no attack animation. A HoT HEAL tick
        // (e.g. Mend) ALSO plays the heal-effect sprite on the affected ally so the heal
        // reads on the target, not just as a number.
        if (sprite !== undefined && amt > 0) {
          if (ev.type === 'heal') {
            // The heal that keeps working is seen on the body itself (its lasting look: render/abilityFx), and each
            // of its pulses (once a second: sim/combat) runs a band of mint light up a hero (2026-11-18, lab v84).
            this.floating.spawn(sprite.x, sprite.y - 20, `+${formatDmg(amt)}`, FX.heal, 0.9);
            heroSprite?.bodyFx.burst('hot_pulse', 'over', 0, 0);
          } else {
            // (A world boss's mechanic that takes its toll in ticks — Culpa — has its own colour and its pang.)
            const kitColor = heroSprite === undefined ? null : this.bossKit.tick(ev, heroSprite);
            this.floating.spawn(sprite.x, sprite.y - 16, formatDmg(amt), kitColor ?? FX.dot, kitColor === null ? 0.9 : 1);
          }
        }
      } else if (ev.type === 'damage' && sprite !== undefined) {
        // An attack connected — ALWAYS play the attacker's swing/projectile, even on a
        // 0-damage hit (INVULNERABLE), so enemies keep visibly attacking. An ability-tagged
        // hit plays the caster's ability swing (the knight's heavy attack). AoE splash hits
        // (Priest auto) are skipped here: they only show their damage number — the holy strike
        // effect + swing fire once, on the PRIMARY target, not on every splashed enemy.
        // A shot nothing announced waits for its clip's release, and its number (splash hits included) with it.
        const source = ev.sourceId ?? '';
        // A hit of the boss kit (the chain bolt, a Deadeye shot) has its own picture instead of the boss's swing.
        const kitWait = heroSprite === undefined ? null : this.bossKit.hit(ev, heroSprite, groundY, this.frontHeroX());
        if (kitWait !== null) shotWait.set(source, kitWait);
        else if (ev.splash !== true) shotWait.set(source, this.playAttack(ev.sourceId, sprite, ev.abilityKey, ev.charged === true));
        const wait = shotWait.get(source) ?? 0;
        // An enemy's area blow reaches each hero when its wave gets there, not all at once.
        const blowWait = heroSprite === undefined ? 0 : this.areaBlowWaitMs(ev, heroSprite, groundY);
        if (ev.invuln === true) {
          // Negated by Last Stand invulnerability: the blow glances off in gold — one sign, however many land.
          if (heroSprite !== undefined) heroSprite.blowSign(BLOW_SIGNS.invulnerable);
        } else if (amt > 0) {
          // The number and the flash land with the blow: at once for a basic attack (its clip was started
          // early), a beat later for a hero's ability whose clip is just starting (abilityHitWaitMs).
          this.delayed.add(Math.max(wait, blowWait, this.abilityHitWaitMs(ev, enemySprite)), () => this.landHit(ev, sprite, amt));
          // A splash of her own light (the Priest's basic attack reaches the enemies beside its target) shows on each.
          if (ev.splash === true && enemySprite !== undefined && ev.abilityKey === undefined) this.splashLight(ev.sourceId, enemySprite, wait);
        }
      } else if (ev.type === 'heal' && enemySprite !== undefined && amt > 0) {
        // A boss that feeds on its hits (the Vampiric affix): blood drawn up into it, and what it got back. (A
        // heal it took by reflecting one — Espejos — shows the number alone: the light flew into it already.)
        if (ev.cue === 'leech') this.bossKit.leech(enemySprite, ev.targetId);
        this.floating.spawn(enemySprite.feetPoint().x, enemySprite.y - 30, `+${formatDmg(amt)}`, FX.leech, 1);
      } else if (ev.type === 'heal' && heroSprite !== undefined && amt > 0) {
        // The heal wells up on whoever it heals (render/abilityFx HEAL_BLOOM) — when the healer's gesture reaches
        // its release, if the heal comes from a spell being cast, not while her arm is still going up.
        const healer = ev.sourceId === undefined ? undefined : this.heroSprites.get(ev.sourceId);
        const spell = ev.sourceId === undefined ? undefined : castBy.get(ev.sourceId);
        const healOn = spell === undefined ? undefined : abilityLook(spell)?.healOn;
        this.delayed.add(healer !== undefined && spell !== undefined ? healer.castBlowMs(spell) : 0, () => {
          if (heroSprite.parent === null) return;
          if (healOn !== undefined) heroSprite.burstFx(healOn); // an instant heal's own look (Healing Light's shaft)
          heroSprite.healBloom();
          this.floating.spawn(heroSprite.x, heroSprite.y - 20, `+${formatDmg(amt)}`, FX.heal, 1);
        });
      }
    }
  }

  // A hit shows: the number, the flash and flinch of whoever took it, and the callouts that go with it.
  private landHit(ev: CombatEvent, sprite: HeroSprite | EnemySprite, amt: number): void {
    const onHero = sprite instanceof HeroSprite;
    const world = this.engine?.world;
    playSound(hitSound(ev, world === undefined ? undefined : (onHero ? world.heroes : world.enemies).find((c) => c.id === ev.targetId)));
    const color = onHero ? hexToNum('#ff7a7a') : ev.crit === true ? hexToNum('#ffd35d') : 0xffffff;
    sprite.flashHit();
    // The hit of an ability with its own look leaves its mark on the enemy (render/abilityFx `hit`).
    const hitLook = ev.abilityKey === undefined ? undefined : abilityLook(ev.abilityKey);
    if (hitLook?.hit !== undefined && sprite instanceof EnemySprite) sprite.hitFx(hitLook.hit, hitLook.hitSpot ?? 'body');
    if (onHero) sprite.hurtReact(); // sprite heroes flinch when hit
    this.floating.spawn(sprite.x, sprite.y - 18, formatDmg(amt), color, ev.crit === true ? 1.4 : 1);
    // Multistrike proc: two crossing cuts flash over the ALLY that procced it (the attacker), not over the enemy.
    if (ev.multi === true) {
      const attacker = ev.sourceId === undefined ? undefined : this.heroSprites.get(ev.sourceId);
      if (attacker !== undefined) attacker.blowSign(BLOW_SIGNS.multi);
    }
    // A blocked hit (block-stat proc) on a hero plays its shield-block reaction, and steel rings: a spark on the shield.
    if (ev.blocked === true && onHero) {
      sprite.blockReact();
      sprite.blowSign(BLOW_SIGNS.blocked);
    }
  }

  // One of the one-shots of an ability's cast (render/abilityFx): on the caster, or on the ground at its feet
  // under every fighter; at once, or when the cast clip reaches its blow.
  private playCastBurst(caster: HeroSprite, burst: CastBurst, abilityKey: string, groundY: number): void {
    const wait = burst.atBlow === true ? caster.castBlowMs(abilityKey) : 0;
    this.delayed.add(wait, () => {
      if (caster.parent === null) return; // the hero left the strip meanwhile
      if (burst.spot === 'ground') this.fxGround.play(burst.fx, caster.x + caster.bodyCx + (burst.dx ?? 0), groundY + (burst.dy ?? 0));
      else if (burst.spot === 'party' || burst.spot === 'wave') {
        // Under the middle of the party, or of the wave: a ring that opens under all of them.
        const band = burst.spot === 'party' ? this.bandOf(this.heroSprites) : this.bandOf(this.enemySprites);
        if (band !== null) this.fxGround.play(burst.fx, band.cx + (burst.dx ?? 0), groundY + (burst.dy ?? 0));
      } else caster.bodyFx.burst(burst.fx, burst.spot === 'caster-under' ? 'under' : 'over', burst.dx ?? 0, burst.dy ?? 0);
    });
  }

  // The part of an ability's look that goes to the WAVE (render/abilityFx): its one shot fired at the wave's
  // front or middle — it leaves on the clip's release and plays its `land` one-shot where it arrives — and the
  // one-shots it scatters across the wave's band.
  private playWaveLook(caster: HeroSprite, look: AbilityLook, abilityKey: string, groundY: number): void {
    const band = this.bandOf(this.enemySprites);
    if (band === null) return;
    const release = caster.castBlowMs(abilityKey);
    let landed = release;
    const shot = look.shot;
    if (shot !== undefined && look.shotTo !== undefined) {
      const { x: fromX, y: fromY } = caster.shotPoint();
      const to = look.shotTo === 'front' ? { x: band.cx - band.halfW, y: groundY - 8 } : { x: band.cx, y: groundY - 2 };
      landed = release + lookFlightMs(fromX, fromY, to.x, to.y, shot.arc ?? 0);
      this.shotLandMs.set(abilityKey, landed); // its hits show when it lands (abilityHitWaitMs)
      this.delayed.add(release, () => {
        this.projectiles.spawnLook(fromX, fromY, () => to, shot.fx, shot.arc ?? 0, (x) => {
          if (shot.land !== undefined) this.fxAir.play(shot.land, x, groundY);
        });
      });
    }
    for (const scatter of look.band ?? []) this.playBand(scatter, band, groundY, scatter.afterShot === true ? landed : scatter.atBlow === true ? release : 0);
  }

  // One-shots scattered over a band of the wave: one every `every` pixels, each a little off its place, starting
  // over `spreadMs` once `wait` (and the look's own delay) has passed.
  private playBand(scatter: BandLook, band: { cx: number; halfW: number }, groundY: number, wait: number): void {
    const layer = scatter.layer === 'ground' ? this.fxGround : this.fxAir;
    const halfW = band.halfW + (scatter.reach ?? 0);
    const n = scatter.count ?? bandCount(halfW * 2, scatter.every);
    const step = (halfW * 2) / n;
    for (let i = 0; i < n; i++) {
      const x =
        scatter.loose === true
          ? band.cx - halfW + Math.random() * halfW * 2
          : band.cx - halfW + step * (i + 0.5) + (scatter.count === undefined ? (Math.random() - 0.5) * step * 0.6 : 0);
      const y = groundY + (scatter.depth !== undefined ? Math.round((Math.random() * 2 - 1) * scatter.depth) : 0);
      const fx = scatter.variants !== undefined && scatter.variants.length > 0 ? (scatter.variants[Math.floor(Math.random() * scatter.variants.length)] ?? scatter.fx) : scatter.fx;
      // In order from the near end (a sweep) or at random over `spreadMs`.
      const at = wait + (scatter.delayMs ?? 0) + (scatter.sweepMs !== undefined ? (scatter.sweepMs * i) / Math.max(1, n - 1) : Math.random() * (scatter.spreadMs ?? 0));
      this.delayed.add(at, () => layer.play(fx, x, y));
    }
  }

  // How long a hit's number waits for the picture, in ms. Only a HERO's ABILITY landing on an enemy waits: its
  // clip starts on the cast, the same instant the simulation resolves the damage, so the number would pop while
  // the arm is still going back. It waits for the clip's blow (HeroSprite.abilityBlowMs — nothing when the
  // wind-up is too long to wait for); an ability fired once at the wave (Explosive Arrow) waits for that shot to
  // land, and one that rains on it (`hitDelayMs`) for the rain.
  private abilityHitWaitMs(ev: CombatEvent, enemySprite: EnemySprite | undefined): number {
    if (enemySprite === undefined || ev.abilityKey === undefined || ev.sourceId === undefined) return 0;
    const hero = this.heroSprites.get(ev.sourceId);
    if (hero === undefined) return 0;
    const look = abilityLook(ev.abilityKey);
    if (look?.shotTo !== undefined) return this.shotLandMs.get(ev.abilityKey) ?? 0;
    return hero.abilityBlowMs(ev.abilityKey) + (look?.hitDelayMs ?? 0);
  }

  // The on-screen horizontal band (centre + half-width) spanning a group of sprites — used
  // to centre an AoE spectacle over the wave or the party. null if the group is empty.
  private bandOf(group: Map<string, HeroSprite> | Map<string, EnemySprite>): { cx: number; halfW: number } | null {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const s of group.values()) {
      if (!s.visible) continue;
      if (s instanceof EnemySprite && (s.fallen || s.flying)) continue; // a corpse is not part of the wave any more; nor is a summon over the party
      if (s.x < min) min = s.x;
      if (s.x > max) max = s.x;
    }
    if (!Number.isFinite(min)) return null;
    return { cx: (min + max) / 2, halfW: Math.max(24, (max - min) / 2 + 18) };
  }

  // The strip x of the party's front hero (the one the enemies' blows land on); −∞ with no hero standing.
  private frontHeroX(): number {
    let front = Number.NEGATIVE_INFINITY;
    for (const h of this.heroSprites.values()) if (h.visible && h.standing && h.x > front) front = h.x;
    return front;
  }

  // How long a wave let go now takes to reach strip x `heroX` (ms): the party's front hero first, the ones behind
  // as it passes them — at the pace of the blow that throws heroes back (render/bossFx SHOVE).
  private waveReachesMs(heroX: number): number {
    const blow = areaBlow(SHOVE.blow);
    const stretch = this.blowStretch();
    return blow === undefined || stretch === null ? 0 : waveReachMs(blow, stretch.fromX - heroX);
  }

  // The stretch of ground an enemy's area blow covers: from just ahead of the front hero back past the last one.
  private blowStretch(): { fromX: number; toX: number } | null {
    let front = Number.NEGATIVE_INFINITY;
    let rear = Number.POSITIVE_INFINITY;
    for (const h of this.heroSprites.values()) {
      if (!h.visible || !h.standing) continue;
      front = Math.max(front, h.x);
      rear = Math.min(rear, h.x);
    }
    if (!Number.isFinite(front)) return null;
    return { fromX: front + 14, toX: rear - BLOW_PAST_PARTY };
  }

  // While an enemy winds an area blow up (render/enemyFx), the ground under the party splits: more of it, further
  // back, as the cast fills, and burning hot over its last third. Called every frame for the enemy that casts.
  private showBlowWarning(c: Combatant, groundY: number): void {
    const cast = c.casting;
    const warn = cast === undefined ? undefined : areaBlow(cast.key)?.warn;
    const stretch = this.blowStretch();
    if (cast === undefined || warn === undefined || stretch === null || !c.alive || cast.totalMs <= 0) return;
    const progress = Math.max(0, Math.min(1, 1 - cast.remainingMs / cast.totalMs));
    const count = warnTiles(stretch.fromX - stretch.toX, warn.step, progress);
    this.blowWarn.warn(warn.fx, warn.hot, stretch.fromX, groundY, warn.step, count, progress >= WARN_HOT_FROM ? count : 0);
    // A blow aimed at the front hero, in the boss's look, stepping with the cast: the boss gathering it at its front
    // and the mark closing on the ground round the hero's feet (both over the fighters, so his body hides neither).
    const blow = areaBlow(cast.key);
    this.blowMagic.set(c.id, c.magicShare ?? 0);
    const boss = this.enemySprites.get(c.id);
    if (blow?.charge !== undefined && boss !== undefined) {
      const at = boss.chargePoint();
      this.blowFront.mark(bossLook(blow.charge, c.magicShare), at.x, at.y, progress);
    }
    const front = this.frontBodyX();
    if (blow?.mark !== undefined && front !== null) this.blowFront.mark(bossLook(blow.mark, c.magicShare), front, groundY, progress);
  }

  // Where the front hero's BODY stands (strip x: the centre of the figure), or null with no hero standing.
  private frontBodyX(): number | null {
    let best: HeroSprite | null = null;
    for (const h of this.heroSprites.values()) if (h.visible && h.standing && (best === null || h.x > best.x)) best = h;
    return best === null ? null : best.x + best.bodyCx;
  }

  // An enemy's area blow lands (its cast event): its mark where it starts, and its wave running back along the
  // ground through the whole party — a row of bursts going off one after another, or one front that travels.
  private playAreaBlow(blow: AreaBlow, caster: HeroSprite | EnemySprite, groundY: number, casterId: string): void {
    const stretch = this.blowStretch();
    if (stretch === null) return;
    if (blow.origin !== undefined) {
      const at = caster instanceof EnemySprite ? caster.feetPoint().x : caster.x;
      this.fxGround.play(blow.origin, at, groundY + 2);
    }
    // A blow aimed at the front hero lands on him first, in the look of the boss that swings it.
    const front = this.frontBodyX();
    if (blow.impact !== undefined && front !== null) this.fxAir.play(bossLook(blow.impact, this.blowMagic.get(casterId)), front, groundY, -1);
    const length = stretch.fromX - stretch.toX;
    const wave = blow.wave;
    if (wave.kind === 'bursts') {
      for (const off of burstOffsets(length, wave.every)) {
        this.delayed.add(waveReachMs(blow, off), () => this.fxAir.play(wave.fx, stretch.fromX - off, groundY, -1));
      }
    } else {
      this.blowFront.run(wave.fx, stretch.fromX, stretch.toX, groundY, blow.speed, wave.trailEvery, (x) => this.fxGround.play(wave.trail, x, groundY, -1));
    }
  }

  // How long the hit of an enemy's area blow on a hero waits to show: the time its wave takes to reach that hero
  // from the front of the party. The ground kicks under the hero as it gets there.
  private areaBlowWaitMs(ev: CombatEvent, hero: HeroSprite, groundY: number): number {
    const blow = ev.sourceId !== undefined && this.enemySprites.has(ev.sourceId) ? areaBlow(ev.abilityKey) : undefined;
    const stretch = blow === undefined ? null : this.blowStretch();
    if (blow === undefined || stretch === null) return 0;
    const wait = waveReachMs(blow, stretch.fromX - hero.x);
    // (On the front hero a blow with its own impact has already shown where it lands: no jolt over it.)
    const front = blow.impact !== undefined && stretch.fromX - hero.x <= BLOW_FRONT_REACH;
    this.delayed.add(wait, () => {
      if (hero.parent !== null && !front) this.fxGround.play(blow.jolt, hero.x + hero.bodyCx, groundY);
    });
    return wait;
  }

  // A wave enemy's cue (render/foeFx FOE_CUES): on its body, at its feet, or — a support falling — a wisp off
  // every enemy of its wave still standing.
  private playFoeCue(fx: string, at: 'body' | 'feet' | 'wave', enemy: EnemySprite, groundY: number): void {
    // (Over the fighters, not inside the enemy: in a pile its own layer is hidden by whoever stands in front.)
    if (at === 'body') this.fxAir.play(fx, enemy.bodyPoint().x, enemy.bodyPoint().y, -1);
    else if (at === 'feet') this.fxAir.play(fx, enemy.feetPoint().x, groundY);
    else for (const other of this.enemySprites.values()) if (other === enemy || (!other.fallen && other.visible)) this.fxAir.play(fx, other.bodyPoint().x, other.bodyPoint().y + 6);
  }

  // Fuego concentrado: ONE reticle, on the hero every focusing shooter lofts its shots at (sim/enemyTraits) —
  // while there is one; it follows that hero.
  private showFocusReticle(w: WorldState, dtMs: number): void {
    const marked = focusedHero(w);
    const hero = marked === undefined ? undefined : this.heroSprites.get(marked.id);
    if (hero === undefined || !hero.visible) {
      if (this.focusReticle !== null) this.focusReticle.sprite.visible = false;
      return;
    }
    if (this.focusReticle === null) {
      this.focusReticle = fxLoop(FOCUS_RETICLE_FX);
      if (this.focusReticle === null) return;
      this.fxAir.addChild(this.focusReticle.sprite);
    }
    this.focusReticle.advance(dtMs);
    this.focusReticle.sprite.visible = true;
    this.focusReticle.sprite.position.set(Math.round(hero.x + hero.bodyCx), Math.round(hero.y - FOCUS_RETICLE_LIFT));
  }

  // The Priest's basic attack reaches the enemies beside its target: her light bursts on each of them too.
  private splashLight(sourceId: string | undefined, enemy: EnemySprite, wait: number): void {
    const hero = sourceId === undefined ? undefined : this.heroSprites.get(sourceId);
    const own = hero?.basicShot();
    const light = own === undefined ? undefined : LIGHT_SHOTS[own];
    if (light === undefined) return;
    this.delayed.add(wait + 110, () => {
      if (enemy.parent !== null && !enemy.fallen) enemy.hitFx(light.land, 'body');
    });
  }

  // Play the attacker's animation by archetype: melee → sword swing + lunge;
  // ranged → arrow; caster → fireball, flying from the attacker to its target. A hit
  // tagged with an abilityKey is an ability cast → the melee swing uses the heavy variant.
  private playAttack(sourceId: string | undefined, target: HeroSprite | EnemySprite, abilityKey?: string, charged = false): number {
    if (sourceId === undefined) return 0;
    const heroSrc = this.heroSprites.get(sourceId);
    const enemySrc = heroSrc === undefined ? this.enemySprites.get(sourceId) : undefined;
    const src = heroSrc ?? enemySrc;
    if (src === undefined) return 0;
    const look = abilityKey === undefined ? undefined : abilityLook(abilityKey);
    if (heroSrc !== undefined && abilityKey !== undefined && (look?.shotTo !== undefined || look?.band !== undefined)) {
      // An ability that goes to the wave as a whole (Explosive Arrow's one arrow, the rain of a volley) is shown
      // from its cast (playWaveLook); its hits just keep the bow moving — no arrow of their own.
      heroSrc.attack(abilityKey);
      return 0;
    }
    if (src.style === 'melee') {
      if (heroSrc !== undefined) heroSrc.attack(abilityKey);
      else enemySrc?.swing();
      src.lungeAttack();
      // A beast's Embestida (its first blow, twice as hard): a short burst on the hero it lands on (render/foeFx).
      if (charged && enemySrc !== undefined && target instanceof HeroSprite) this.fxAir.play(CHARGE_HIT_FX, target.x + target.bodyCx, target.y - CHARGE_HIT_LIFT);
      // A hero's double strikes as that hero does: a shard of the mirror sent from afar, or its blow, breaking on him.
      const double = enemySrc?.doubleLook ?? null;
      if (enemySrc !== undefined && double !== null) {
        const at = (): { x: number; y: number } => ({ x: target.x, y: target.y - 14 });
        const land = (x: number, y: number): void => this.fxAir.play(double.land, x, y);
        const from = enemySrc.shotPoint();
        if (!enemySrc.steps) {
          this.projectiles.spawnLook(from.x, from.y, at, double.shot, 0, land, { facing: -1, straight: true });
          return 0;
        }
        // The Knight's double has no reach from where it stands: it steps to its victim, and its blow lands there.
        const wait = enemySrc.stepStrike(target.x);
        this.delayed.add(wait, () => land(at().x, at().y));
        return wait;
      }
      // A boss's summon dives at the hero it pecks: the hit shows when it gets there.
      if (enemySrc !== undefined && enemySrc.flying) return enemySrc.diveAt(target.x, target.y - 14);
      return 0;
    }
    // The projectile homes on the target's LIVE position (it keeps advancing), so it
    // tracks the moving enemy instead of flying to where it stood when the shot started.
    const liveTarget = (): { x: number; y: number } => ({ x: target.x, y: target.y - 8 });
    // A ranged/caster hero plays its own attack clip — the ability's when the hit came from one; an enemy plays
    // its creature's attack. An ability whose hit is its own spectacle on the target (Smite's bolt from the sky,
    // Holy Nova's shafts) throws nothing.
    // What leaves the attacker waits for the release when nothing announced the shot (the returned wait).
    const wait = heroSrc !== undefined ? heroSrc.attack(abilityKey) : (enemySrc?.swing() ?? 0);
    if (heroSrc !== undefined && look !== undefined && look.shot === undefined && look.hit !== undefined) return wait;
    this.delayed.add(wait, () => {
      // A hero's shot (render/abilityFx): the ability's own, or its class's — an arrow flies level, light goes
      // straight to its target and bursts there.
      if (heroSrc !== undefined) {
        const own = look?.shot?.fx ?? heroSrc.basicShot();
        const from = heroSrc.shotPoint();
        const light = own === undefined ? undefined : LIGHT_SHOTS[own];
        const land = light === undefined ? undefined : (x: number, y: number): void => this.fxAir.play(light.land, x, y);
        if (own !== undefined) this.projectiles.spawnLook(from.x, from.y, liveTarget, own, 0, land, { straight: light !== undefined });
        return;
      }
      // A foe's shot (render/enemyFx): level at the front hero, lofted over him at anyone standing behind.
      if (enemySrc !== undefined && (src.style === 'ranged' || src.style === 'caster')) {
        // A shooter's charged shot (Tiro cargado) is the same arrow, lit (render/foeFx).
        const plain = FOE_SHOT[src.style];
        const shot = charged && src.style === 'ranged' ? { ...plain, ...CHARGED_SHOT } : plain;
        const over = shot.arc !== undefined && shotGoesOver(target.x, this.frontHeroX());
        const from = enemySrc.shotPoint();
        const land = (x: number, y: number): void => this.fxAir.play(shot.land, x, y);
        const fx = over && shot.arc !== undefined ? shot.arc : shot.fx;
        this.projectiles.spawnLook(from.x, from.y, liveTarget, fx, over ? FOE_ARC_HEIGHT : 0, land, { facing: -1, byPitch: over, straight: src.style === 'caster' });
      }
    });
    return wait;
  }
}

/** True when a living foe stands within `c`'s reach — the same test the simulation makes before a basic
 *  attack. Read-only: it only decides whether the attack clip may start ahead of the swing. */
function inReach(c: Combatant, foes: readonly Combatant[]): boolean {
  return foes.some((f) => f.alive && Math.abs(f.x - c.x) <= c.range + MOVE_EPS);
}

function formatDmg(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
}
