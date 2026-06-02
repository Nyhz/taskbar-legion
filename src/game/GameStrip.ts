import { Application, Container, Graphics } from 'pixi.js';
import { GameEngine } from './engine';
import { setEngine } from './engineRef';
import { HeroSprite } from './render/HeroSprite';
import { EnemySprite } from './render/EnemySprite';
import { StageBackground } from './render/StageBackground';
import { FloatingTextLayer } from './render/FloatingText';
import { ProjectileLayer } from './render/Projectiles';
import { PortalSprite } from './render/PortalSprite';
import { castFx, FX } from './render/fx';
import { loadCharacterTextures } from './render/characterFrames';
import { loadBackgroundTextures } from './render/backgroundLayers';
import type { Combatant, CombatEvent, WorldState } from '@/sim/world';
import { keysForZone } from '@/sim/world';
import { worldOf, stageInWorld } from '@/data/stageScaling';
import { SPAWN_AHEAD, RANGE, TELEPORT_HOLD_MS } from '@/data/field';
import { hexToNum } from '@/styles/palette';
import { useStore } from '@/state/store';

// Owns the Pixi Application + the render driver. Each animation frame it advances
// the GameEngine (fixed 100ms sim steps internally), then reconciles sprites from
// the live world and turns combat events into floating text / hit flashes. The
// render layer READS sim state and never mutates it.

const STRIP_HEIGHT = 130;
const GROUND_FRAC = 0.72;
// Deadzone + spring camera. The party sits ~ANCHOR_FRAC from the left when settled.
// The camera does NOT move while the lead hero stays within DEADZONE_FRAC of that
// anchor — so heroes visibly advance WITHOUT the background scrolling. Only when
// they push past the deadzone does the camera track, as an underdamped SPRING (it
// lags, overshoots a touch, settles). Background scroll is bound to the camera.
const ANCHOR_FRAC = 0.28;
const DEADZONE_FRAC = 0.25;
const CAM_STIFFNESS = 60; // a touch snappier reaction
const CAM_DAMPING = 4.5; // damping ratio ≈ 0.29 → springy, overshoots the anchor and wobbles before settling
const CAM_MAX_DT = 0.05; // clamp camera step so a long/backgrounded frame can't blow up the spring

export class GameStrip {
  private app: Application | null = null;
  private readonly world = new Container();
  private readonly background = new StageBackground();
  private readonly combatants = new Container();
  private readonly projectiles = new ProjectileLayer();
  private readonly floating = new FloatingTextLayer();
  // The world-boss portal, pinned screen-right while farming a beaten W-9 (see frame()).
  private readonly portal = new PortalSprite();
  // Full-strip blackout for the teleport sequence; teleportMs counts down the sequence.
  private readonly blackout = new Graphics();
  private teleportMs = 0;
  private prevWorld = -1; // last seen zone (worldOf) — a change triggers a teleport
  private prevWipes = -1; // last seen wipe counter — a bump triggers a teleport
  private heroSprites = new Map<string, HeroSprite>();
  private enemySprites = new Map<string, EnemySprite>();
  private engine: GameEngine | null = null;
  private uiScale = 1;
  private logicalWidth = 0;
  private cameraX = -1; // world x at screen-left; -1 = uninitialized
  private camVel = 0; // camera velocity (world px/s) for the spring
  // Smoothed (interpolated) world positions — the sim steps at 10fps; these ease
  // toward the latest sim value each render frame so motion is continuous at 60fps
  // (no "teleporting" between ticks). The camera reads the smoothed party position.
  private displayPartyX = -1;
  private readonly enemyDisplayX = new Map<string, number>();
  private readonly heroDisplayX = new Map<string, number>();

  get logicalHeight(): number {
    return STRIP_HEIGHT;
  }

  async init(container: HTMLElement, uiScale: number): Promise<void> {
    this.uiScale = uiScale;
    const app = new Application();
    await app.init({
      background: '#14121a',
      resizeTo: container,
      antialias: false,
      roundPixels: true,
      autoDensity: true,
      resolution: Math.min(2, Math.ceil(window.devicePixelRatio || 1)),
    });
    container.appendChild(app.canvas);
    this.app = app;
    // Load the character sprite sheets (+ arrow) and the background layers before the
    // first frame so sprite heroes pick up their animated body immediately and the
    // backdrop builds with its sun/cloud sprites (otherwise it falls back to gradient).
    await Promise.all([loadCharacterTextures(), loadBackgroundTextures()]);
    this.engine = new GameEngine();
    setEngine(this.engine);

    this.world.addChild(this.background, this.combatants, this.projectiles, this.floating, this.portal, this.blackout);
    this.portal.visible = false;
    this.blackout.visible = false;
    this.portal.on('pointertap', () => this.onPortalTap());
    app.stage.addChild(this.world);
    this.relayout();
    app.stage.scale.set(this.uiScale);

    app.renderer.on('resize', () => this.relayout());
    app.ticker.add((t) => this.frame(t.deltaMS));
  }

  applyScale(uiScale: number): void {
    this.uiScale = uiScale;
    if (this.app === null) return;
    this.app.stage.scale.set(uiScale);
    this.relayout();
  }

  destroy(): void {
    setEngine(null);
    this.app?.destroy(true, { children: true });
    this.app = null;
  }

  private relayout(): void {
    if (this.app === null) return;
    this.logicalWidth = this.app.screen.width / this.uiScale;
    this.background.build(this.logicalWidth, STRIP_HEIGHT);
  }

  private frame(dtMs: number): void {
    const engine = this.engine;
    if (engine === null) return;
    const events = engine.update(dtMs);
    const w = engine.world;
    const groundY = Math.round(STRIP_HEIGHT * GROUND_FRAC);
    // Ease all world positions toward the latest sim values (interpolate the 100ms
    // sim steps into smooth 60fps motion). TAU ≈ 70ms → tracks closely but smoothly.
    const smooth = 1 - Math.exp(-dtMs / 70);
    this.displayPartyX = this.displayPartyX < 0 ? w.partyX : this.displayPartyX + (w.partyX - this.displayPartyX) * smooth;

    // World→screen zoom FIT to width so the spawn distance maps to the right edge
    // (enemies enter from the border on any screen). Clamped for sane melee spacing.
    const anchorScreen = this.logicalWidth * ANCHOR_FRAC;
    const pxScale = Math.max(1.2, Math.min(3.4, (this.logicalWidth - anchorScreen) / SPAWN_AHEAD));
    const cameraX = this.updateCamera(this.displayPartyX, pxScale, anchorScreen, dtMs);
    const toScreen = (wx: number): number => (wx - cameraX) * pxScale;

    this.background.update(cameraX * pxScale, worldOf(w.globalStageIndex));
    this.reconcileHeroes(w.heroes, groundY, dtMs, toScreen, smooth);
    this.reconcileEnemies(w.enemies, groundY, dtMs, toScreen, smooth);
    this.applyEvents(events);
    this.projectiles.update(dtMs);
    this.floating.update(dtMs);
    this.updatePortal(w, groundY, dtMs);
    this.detectAndDriveTeleport(w, dtMs);
  }

  // Watch for a zone change (worldOf) or a wipe (the sim's monotonic wipe counter) and
  // play a party teleport: heroes flash up + shrink out, a full-strip blackout crests,
  // then they drop back in. Timed to the sim's TELEPORT_HOLD_MS beat (no combat then).
  private detectAndDriveTeleport(w: WorldState, dtMs: number): void {
    const world = worldOf(w.globalStageIndex);
    if (this.prevWorld < 0) {
      this.prevWorld = world; // first frame (or post-offline catch-up) — no FX
      this.prevWipes = w.wipes;
    } else if (world !== this.prevWorld || w.wipes > this.prevWipes) {
      this.teleportMs = TELEPORT_HOLD_MS; // (re)start the sequence
    }
    this.prevWorld = world;
    this.prevWipes = w.wipes;

    if (this.teleportMs <= 0) return;
    this.teleportMs -= dtMs;
    const phase = Math.min(1, 1 - this.teleportMs / TELEPORT_HOLD_MS); // 0→1 across out+in
    for (const s of this.heroSprites.values()) s.setTeleport(phase);
    // Blackout: ramp to black across the dematerialise, hold over the swap, fade back in.
    let a = 0;
    if (phase < 0.4) a = phase / 0.4;
    else if (phase < 0.62) a = 1;
    else a = Math.max(0, 1 - (phase - 0.62) / 0.38);
    this.blackout.visible = true;
    this.blackout.alpha = a * 0.9;
    this.blackout.clear().rect(0, 0, this.logicalWidth, STRIP_HEIGHT).fill({ color: 0x000000 });
    if (this.teleportMs <= 0) {
      for (const s of this.heroSprites.values()) s.setTeleport(-1); // restore sprites
      this.blackout.visible = false;
    }
  }

  // Show the world-boss portal, pinned to the strip's right edge, ONLY while the party
  // farms a beaten W-9 (the keyed gate into W-10). It shows this zone's `keys/1` and
  // greys out at 0; tapping it (with a key) spends one and drops into the boss (§14).
  private updatePortal(w: WorldState, groundY: number, dtMs: number): void {
    const onBeatenNine = stageInWorld(w.globalStageIndex) === 9 && w.maxClearedStage >= w.globalStageIndex;
    this.portal.visible = onBeatenNine;
    if (!onBeatenNine) return;
    const keys = keysForZone(w.zoneKeys, worldOf(w.globalStageIndex));
    this.portal.position.set(this.logicalWidth - 30, groundY - 12);
    this.portal.update(dtMs, keys, keys >= 1);
  }

  private onPortalTap(): void {
    const w = this.engine?.world;
    if (w === undefined) return;
    const world = worldOf(w.globalStageIndex);
    if (keysForZone(w.zoneKeys, world) < 1) return; // greyed — no key for this zone
    useStore.getState().requestEnterZoneBoss(world);
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

  private reconcileHeroes(heroes: Combatant[], groundY: number, dtMs: number, toScreen: (wx: number) => number, smooth: number): void {
    // Heroes are placed by their OWN world position (they move freely / stack); each
    // display x eases toward its sim x for smooth 60fps motion.
    const live = new Set(heroes.map((h) => h.id));
    for (const id of [...this.heroDisplayX.keys()]) if (!live.has(id)) this.heroDisplayX.delete(id);
    for (const c of heroes) {
      let sprite = this.heroSprites.get(c.id);
      if (sprite === undefined) {
        sprite = new HeroSprite(c.classKey ?? 'warrior');
        this.heroSprites.set(c.id, sprite);
        this.combatants.addChild(sprite);
      }
      const prev = this.heroDisplayX.get(c.id);
      const disp = prev === undefined ? c.x : prev + (c.x - prev) * smooth;
      this.heroDisplayX.set(c.id, disp);
      sprite.update(c, toScreen(disp), groundY, dtMs);
    }
  }

  private reconcileEnemies(enemies: Combatant[], groundY: number, dtMs: number, toScreen: (wx: number) => number, smooth: number): void {
    const live = new Set(enemies.map((e) => e.id));
    for (const [id, sprite] of this.enemySprites) {
      if (!live.has(id)) {
        this.combatants.removeChild(sprite);
        this.enemySprites.delete(id);
        this.enemyDisplayX.delete(id);
      }
    }
    for (const c of enemies) {
      let sprite = this.enemySprites.get(c.id);
      if (sprite === undefined) {
        sprite = new EnemySprite(c, enemyTint(c));
        this.enemySprites.set(c.id, sprite);
        this.combatants.addChild(sprite);
      }
      // Ease the enemy's display position toward its sim x (smooth 60fps motion).
      const prev = this.enemyDisplayX.get(c.id);
      const disp = prev === undefined ? c.x : prev + (c.x - prev) * smooth;
      this.enemyDisplayX.set(c.id, disp);
      sprite.update(c, toScreen(disp), groundY, dtMs);
    }
  }

  private applyEvents(events: CombatEvent[]): void {
    for (const ev of events) {
      const heroSprite = this.heroSprites.get(ev.targetId);
      const enemySprite = this.enemySprites.get(ev.targetId);
      const sprite = heroSprite ?? enemySprite;
      const amt = ev.amount ?? 0;
      if (ev.type === 'cast' && ev.abilityKey !== undefined) {
        // Each ability shows its OWN icon rising from the caster + a colored burst ring
        // (its visual identity) — works for hero AND enemy casters.
        const caster = this.heroSprites.get(ev.targetId) ?? this.enemySprites.get(ev.targetId);
        if (caster !== undefined) {
          const fx = castFx(ev.abilityKey);
          caster.castBurst(fx.color);
          this.floating.spawn(caster.x, caster.y - 26, fx.glyph, fx.color, 1.15);
        }
      } else if (ev.tick === true) {
        // DoT/HoT periodic tick → just a floating number, no attack animation.
        if (sprite !== undefined && amt > 0) {
          if (ev.type === 'heal') this.floating.spawn(sprite.x, sprite.y - 20, `+${formatDmg(amt)}`, FX.heal, 0.9);
          else this.floating.spawn(sprite.x, sprite.y - 16, formatDmg(amt), FX.dot, 0.9);
        }
      } else if (ev.type === 'damage' && sprite !== undefined) {
        // An attack connected — ALWAYS play the attacker's swing/projectile, even on a
        // 0-damage hit (dodge / INVULNERABLE), so enemies keep visibly attacking.
        this.playAttack(ev.sourceId, sprite);
        if (ev.invuln === true) {
          // Negated by Last Stand invulnerability: yellow callout, no number/hit-flash.
          this.floating.spawn(sprite.x, sprite.y - 22, 'INVULNERABLE', hexToNum('#ffe14d'), 0.95);
        } else if (amt > 0) {
          // Land the number + flash immediately.
          const color = enemySprite !== undefined ? (ev.crit ? hexToNum('#ffd35d') : 0xffffff) : hexToNum('#ff7a7a');
          sprite.flashHit();
          this.floating.spawn(sprite.x, sprite.y - 18, formatDmg(amt), color, ev.crit === true ? 1.4 : 1);
          // A blocked hit (block-stat proc) on a hero plays its shield-block reaction.
          if (ev.blocked === true && heroSprite !== undefined) {
            heroSprite.blockReact();
            this.floating.spawn(sprite.x, sprite.y - 30, 'BLOCKED', hexToNum('#5aa0ff'), 0.85); // blue, above the number
          }
        }
      } else if (ev.type === 'heal' && heroSprite !== undefined && amt > 0) {
        this.floating.spawn(heroSprite.x, heroSprite.y - 20, `+${formatDmg(amt)}`, FX.heal, 1);
      }
    }
  }

  // Play the attacker's animation by archetype: melee → sword swing + lunge;
  // ranged → arrow; caster → fireball, flying from the attacker to its target.
  private playAttack(sourceId: string | undefined, target: HeroSprite | EnemySprite): void {
    if (sourceId === undefined) return;
    const heroSrc = this.heroSprites.get(sourceId);
    const src = heroSrc ?? this.enemySprites.get(sourceId);
    if (src === undefined) return;
    if (src.style === 'melee') {
      src.swing();
      src.lungeAttack();
      return;
    }
    const type = src.style === 'caster' ? 'fireball' : 'arrow';
    // The projectile homes on the target's LIVE position (it keeps advancing), so it
    // tracks the moving enemy instead of flying to where it stood when the shot started.
    const liveTarget = (): { x: number; y: number } => ({ x: target.x, y: target.y - 8 });
    // A sprite-bodied ranged hero (ranger) plays its bow-draw frames; everyone else lunges.
    if (heroSrc !== undefined && heroSrc.usesSpriteBody) heroSrc.swing();
    else src.lungeAttack();
    this.projectiles.spawn(src.x, src.y - 8, liveTarget, type);
  }
}

// Tint by archetype (drawEnemy renders magic/casters purple regardless): ranged
// amber, melee red. Bosses keep the red base + their crown.
function enemyTint(c: Combatant): number {
  if (c.range >= RANGE.ranged) return hexToNum('#b8863a');
  return hexToNum('#c0473a');
}

function formatDmg(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
}
