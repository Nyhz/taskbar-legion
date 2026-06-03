import { Application, Container, Graphics, Text } from 'pixi.js';
import { GameEngine } from './engine';
import { setEngine } from './engineRef';
import { HeroSprite } from './render/HeroSprite';
import { EnemySprite } from './render/EnemySprite';
import { StageBackground } from './render/StageBackground';
import { FloatingTextLayer } from './render/FloatingText';
import { ProjectileLayer } from './render/Projectiles';
import { PortalSprite } from './render/PortalSprite';
import { castFx, isSupportCast, FX } from './render/fx';
import { loadCharacterTextures } from './render/characterFrames';
import { loadEnemyTextures, resolveEnemySprite, getEnemyFrames } from './render/enemyFrames';
import { loadBackgroundTextures } from './render/backgroundLayers';
import type { Combatant, CombatEvent, WorldState } from '@/sim/world';
import { worldOf, stageInWorld, isZoneBossStage } from '@/data/stageScaling';
import { SPAWN_AHEAD, RANGE, TELEPORT_HOLD_MS, WIPE_DEAD_MS, WIPE_FADE_MS, WIPE_BLACK_MS, WIPE_RETREAT_AT_MS } from '@/data/field';
import { hexToNum } from '@/styles/palette';
import { useStore } from '@/state/store';

// Owns the Pixi Application + the render driver. Each animation frame it advances
// the GameEngine (fixed 100ms sim steps internally), then reconciles sprites from
// the live world and turns combat events into floating text / hit flashes. The
// render layer READS sim state and never mutates it.

const STRIP_HEIGHT = 160; // must match App.STRIP_LOGICAL_HEIGHT
const GROUND_FRAC = 0.72;
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
const WIPE_PHRASES = [
  "You're clearly not strong enough…",
  'You were not prepared…',
  'The legion falls. Regroup, commander.',
  'Death is only a lesson. Learn it.',
  'Crushed. Come back stronger.',
];

// Blackout opacity (0..1) across the wipe cinematic, from elapsed ms: hold clear over the
// DEAD beat, fade in, hold full black, fade back out, then clear for the bg-only beat.
function wipeBlackAlpha(ms: number): number {
  if (ms < WIPE_DEAD_MS) return 0;
  const f = ms - WIPE_DEAD_MS;
  if (f < WIPE_FADE_MS) return f / WIPE_FADE_MS; // fade in
  if (f < WIPE_FADE_MS + WIPE_BLACK_MS) return 1; // full black
  const o = f - WIPE_FADE_MS - WIPE_BLACK_MS;
  if (o < WIPE_FADE_MS) return 1 - o / WIPE_FADE_MS; // fade out
  return 0; // bg-only beat
}

export class GameStrip {
  private app: Application | null = null;
  private readonly world = new Container();
  private readonly background = new StageBackground();
  private readonly combatants = new Container();
  private readonly projectiles = new ProjectileLayer();
  private readonly floating = new FloatingTextLayer();
  // The world-boss portal, pinned screen-right while farming a beaten W-9 (see frame()).
  private readonly portal = new PortalSprite();
  // Full-strip blackout for the teleport sequence + the wipe cinematic; teleportMs counts
  // down the zone-teleport sequence. The wipe cinematic is driven instead by the sim's wipeMs.
  private readonly blackout = new Graphics();
  // The death-knell phrase shown over the black during a wipe.
  private readonly wipePhrase = new Text({ text: '', style: { fontFamily: 'monospace', fontSize: 13, fontStyle: 'italic', fontWeight: 'bold', fill: hexToNum('#e8e2d6'), align: 'center' } });
  private wipeActive = false; // a wipe cinematic is on screen (drives one-time phrase pick)
  private teleportMs = 0;
  private prevWorld = -1; // last seen zone (worldOf) — a change triggers a teleport
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
    await Promise.all([loadCharacterTextures(), loadEnemyTextures(), loadBackgroundTextures()]);
    this.engine = new GameEngine();
    setEngine(this.engine);

    this.combatants.sortableChildren = true; // honour zIndex (party above enemies)
    this.world.addChild(this.background, this.combatants, this.projectiles, this.floating, this.portal, this.blackout, this.wipePhrase);
    this.wipePhrase.anchor.set(0.5);
    this.wipePhrase.visible = false;
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

    // World→screen zoom: fit the spawn distance to SPAWN_VIEW_FRAC of the party→right-edge
    // span, so a wave materialises ON-SCREEN (teleport-in) with field visible past it, not
    // at the very border. Clamped for sane melee spacing.
    const anchorScreen = this.logicalWidth * ANCHOR_FRAC;
    const pxScale = Math.max(1.0, Math.min(3.4, (SPAWN_VIEW_FRAC * (this.logicalWidth - anchorScreen)) / SPAWN_AHEAD));
    const cameraX = this.updateCamera(this.displayPartyX, pxScale, anchorScreen, dtMs);
    const toScreen = (wx: number): number => (wx - cameraX) * pxScale;

    this.background.update(cameraX * pxScale, worldOf(w.globalStageIndex));
    // Wipe cinematic: the fallen party reads as freshly slain (prominent, no 60s respawn
    // bar) for the DEAD beat, then is HIDDEN once it goes black so the world fades back in
    // empty before the party respawns.
    const wipeMs = w.wipeMs;
    const wipeHidden = wipeMs !== undefined && wipeMs >= WIPE_RETREAT_AT_MS;
    const wipeDead = wipeMs !== undefined && !wipeHidden;
    this.reconcileHeroes(w.heroes, groundY, dtMs, toScreen, smooth, wipeDead, wipeHidden);
    this.reconcileEnemies(w, groundY, dtMs, toScreen, smooth);
    this.applyEvents(events);
    this.projectiles.update(dtMs);
    this.floating.update(dtMs);
    this.updatePortal(w, groundY, dtMs);
    this.detectAndDriveTeleport(w, dtMs);
    this.driveWipe(w);
  }

  // Drive the full-party-wipe cinematic from the sim's elapsed wipeMs: fade the strip to
  // black, hold a random death-knell phrase, then fade the (retreated) background back in —
  // heroes are hidden by reconcileHeroes across this, so the world reappears empty before
  // the party respawns. The sim owns the timing; this only paints it.
  private driveWipe(w: WorldState): void {
    const ms = w.wipeMs;
    if (ms === undefined) {
      if (this.wipeActive) {
        this.wipeActive = false;
        this.wipePhrase.visible = false;
        this.blackout.visible = false;
        this.heroDisplayX.clear(); // revived party snaps to the anchor, not a slide from death spot
      }
      return;
    }
    if (!this.wipeActive) {
      this.wipeActive = true;
      this.wipePhrase.text = WIPE_PHRASES[Math.floor(Math.random() * WIPE_PHRASES.length)] ?? WIPE_PHRASES[0] ?? '';
    }
    const black = wipeBlackAlpha(ms);
    this.blackout.visible = black > 0.001;
    this.blackout.alpha = black;
    this.blackout.clear().rect(0, 0, this.logicalWidth, STRIP_HEIGHT).fill({ color: 0x000000 });
    // Phrase rides the blackness — appears as it darkens, holds, fades with the reveal.
    this.wipePhrase.alpha = Math.max(0, (black - 0.25) / 0.75);
    this.wipePhrase.visible = this.wipePhrase.alpha > 0.01;
    this.wipePhrase.position.set(this.logicalWidth / 2, STRIP_HEIGHT * 0.46);
  }

  // Watch for a ZONE change (worldOf) from normal progression and play a party teleport:
  // heroes flash up + shrink out, a full-strip blackout crests, then they drop back in.
  // A wipe is NOT handled here — it has its own cinematic (driveWipe); we suppress the
  // teleport while one runs so the retreat's world swap doesn't double-trigger it.
  private detectAndDriveTeleport(w: WorldState, dtMs: number): void {
    const world = worldOf(w.globalStageIndex);
    const wiping = w.wipeMs !== undefined;
    if (this.prevWorld < 0) {
      this.prevWorld = world; // first frame (or post-offline catch-up) — no FX
    } else if (world !== this.prevWorld && !wiping) {
      this.teleportMs = TELEPORT_HOLD_MS; // (re)start the sequence
    }
    this.prevWorld = world;
    if (wiping) return; // the wipe cinematic owns the screen

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
  // farms a beaten W-9 (the gate into the W-10 world boss). Keys are gone — the boss
  // itself is the wall, so the portal is always ready; tapping it drops into the fight.
  private updatePortal(w: WorldState, groundY: number, dtMs: number): void {
    const onBeatenNine = stageInWorld(w.globalStageIndex) === 9 && w.maxClearedStage >= w.globalStageIndex;
    this.portal.visible = onBeatenNine;
    if (!onBeatenNine) return;
    this.portal.position.set(this.logicalWidth - 30, groundY - 12);
    this.portal.update(dtMs, true);
  }

  private onPortalTap(): void {
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

  private reconcileHeroes(heroes: Combatant[], groundY: number, dtMs: number, toScreen: (wx: number) => number, smooth: number, wipeDead: boolean, wipeHidden: boolean): void {
    // Heroes are placed by their OWN world position (they move freely / stack); each
    // display x eases toward its sim x for smooth 60fps motion.
    const live = new Set(heroes.map((h) => h.id));
    for (const id of [...this.heroDisplayX.keys()]) if (!live.has(id)) this.heroDisplayX.delete(id);
    for (const c of heroes) {
      let sprite = this.heroSprites.get(c.id);
      if (sprite === undefined) {
        sprite = new HeroSprite(c.classKey ?? 'knight');
        sprite.zIndex = 2; // party draws ABOVE enemies
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
      const disp = prev === undefined ? c.x : prev + (c.x - prev) * smooth;
      this.heroDisplayX.set(c.id, disp);
      sprite.update(c, toScreen(disp), groundY, dtMs, wipeDead);
    }
  }

  private reconcileEnemies(w: WorldState, groundY: number, dtMs: number, toScreen: (wx: number) => number, smooth: number): void {
    const enemies = w.enemies;
    const live = new Set(enemies.map((e) => e.id));
    // Context for choosing a boss's sprite: which world (cycles the world bosses) and whether
    // this is the W-10 zone-boss fight (a world boss) vs a normal stage boss.
    const ctx = { world: worldOf(w.globalStageIndex), isWorldBoss: isZoneBossStage(w.globalStageIndex) };

    for (const c of enemies) {
      let sprite = this.enemySprites.get(c.id);
      if (sprite === undefined) {
        const spec = resolveEnemySprite(c, ctx);
        sprite = new EnemySprite(c, enemyTint(c), { frames: getEnemyFrames(spec.spriteKey), sizeClass: spec.sizeClass });
        sprite.zIndex = 1; // below the party
        sprite.spawnIn(); // materialise (teleport-in) on first appearance
        this.enemySprites.set(c.id, sprite);
        this.combatants.addChild(sprite);
      }
      // Ease the enemy's display position toward its sim x (smooth 60fps motion).
      const prev = this.enemyDisplayX.get(c.id);
      const disp = prev === undefined ? c.x : prev + (c.x - prev) * smooth;
      this.enemyDisplayX.set(c.id, disp);
      sprite.update(c, toScreen(disp), groundY, dtMs);
    }

    // Sprites whose combatant the sim has pruned: keep them playing the death-hold (~1s) at
    // their last world position (still tracking the camera), then remove once expired.
    for (const [id, sprite] of this.enemySprites) {
      if (live.has(id)) continue;
      const disp = this.enemyDisplayX.get(id);
      sprite.updateOrphan(disp === undefined ? sprite.x : toScreen(disp), groundY, dtMs);
      if (sprite.isExpired()) {
        this.combatants.removeChild(sprite);
        this.enemySprites.delete(id);
        this.enemyDisplayX.delete(id);
      }
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
        const heroCaster = this.heroSprites.get(ev.targetId);
        const caster = heroCaster ?? this.enemySprites.get(ev.targetId);
        if (caster !== undefined) {
          const fx = castFx(ev.abilityKey);
          caster.castBurst(fx.color);
          this.floating.spawn(caster.x, caster.y - 26, fx.glyph, fx.color, 1.15);
          // A supportive cast by a sprite hero (Priest heal) plays its heal-cast pose.
          if (heroCaster !== undefined && isSupportCast(ev.abilityKey)) heroCaster.supportCast();
        }
      } else if (ev.tick === true) {
        // DoT/HoT periodic tick → floating number, no attack animation. A HoT HEAL tick
        // (e.g. Mend) ALSO plays the heal-effect sprite on the affected ally so the heal
        // reads on the target, not just as a number.
        if (sprite !== undefined && amt > 0) {
          if (ev.type === 'heal') {
            heroSprite?.showHealEffect();
            this.floating.spawn(sprite.x, sprite.y - 20, `+${formatDmg(amt)}`, FX.heal, 0.9);
          } else {
            this.floating.spawn(sprite.x, sprite.y - 16, formatDmg(amt), FX.dot, 0.9);
          }
        }
      } else if (ev.type === 'damage' && sprite !== undefined) {
        // An attack connected — ALWAYS play the attacker's swing/projectile, even on a
        // 0-damage hit (INVULNERABLE), so enemies keep visibly attacking. An ability-tagged
        // hit plays the caster's ability swing (the knight's heavy attack).
        this.playAttack(ev.sourceId, sprite, ev.abilityKey);
        if (ev.invuln === true) {
          // Negated by Last Stand invulnerability: yellow callout, no number/hit-flash.
          this.floating.spawn(sprite.x, sprite.y - 22, 'INVULNERABLE', hexToNum('#ffe14d'), 0.95);
        } else if (amt > 0) {
          // Land the number + flash immediately.
          const color = enemySprite !== undefined ? (ev.crit ? hexToNum('#ffd35d') : 0xffffff) : hexToNum('#ff7a7a');
          sprite.flashHit();
          if (heroSprite !== undefined) heroSprite.hurtReact(); // sprite heroes flinch when hit
          this.floating.spawn(sprite.x, sprite.y - 18, formatDmg(amt), color, ev.crit === true ? 1.4 : 1);
          // A blocked hit (block-stat proc) on a hero plays its shield-block reaction.
          if (ev.blocked === true && heroSprite !== undefined) {
            heroSprite.blockReact();
            this.floating.spawn(sprite.x, sprite.y - 30, 'BLOCKED', hexToNum('#5aa0ff'), 0.85); // blue, above the number
          }
        }
      } else if (ev.type === 'heal' && heroSprite !== undefined && amt > 0) {
        heroSprite.showHealEffect(); // green sparkle on the healed ally
        this.floating.spawn(heroSprite.x, heroSprite.y - 20, `+${formatDmg(amt)}`, FX.heal, 1);
      }
    }
  }

  // Play the attacker's animation by archetype: melee → sword swing + lunge;
  // ranged → arrow; caster → fireball, flying from the attacker to its target. A hit
  // tagged with an abilityKey is an ability cast → the melee swing uses the heavy variant.
  private playAttack(sourceId: string | undefined, target: HeroSprite | EnemySprite, abilityKey?: string): void {
    if (sourceId === undefined) return;
    const heroSrc = this.heroSprites.get(sourceId);
    const src = heroSrc ?? this.enemySprites.get(sourceId);
    if (src === undefined) return;
    const viaAbility = abilityKey !== undefined;
    if (src.style === 'melee') {
      if (heroSrc !== undefined) heroSrc.swing(viaAbility);
      else src.swing();
      src.lungeAttack();
      return;
    }
    // The projectile homes on the target's LIVE position (it keeps advancing), so it
    // tracks the moving enemy instead of flying to where it stood when the shot started.
    const liveTarget = (): { x: number; y: number } => ({ x: target.x, y: target.y - 8 });
    // A sprite-bodied ranged/caster hero (ranger, priest) plays its own attack frames;
    // a sprite enemy (skeleton-archer draw / slime cast) plays its attack too; everyone
    // else lunges. A caster with its own bolt frames (Priest) throws that animated bolt;
    // generic casters fall back to the procedural fireball.
    if (heroSrc !== undefined && heroSrc.usesSpriteBody) heroSrc.swing();
    else if (heroSrc === undefined) src.swing(); // enemy: play its ranged/caster attack frames
    else src.lungeAttack();
    const magic = src.style === 'caster' ? (heroSrc?.projectileFrames ?? null) : null;
    if (magic !== null) this.projectiles.spawn(src.x, src.y - 8, liveTarget, 'magic', magic);
    else this.projectiles.spawn(src.x, src.y - 8, liveTarget, src.style === 'caster' ? 'fireball' : 'arrow');
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
