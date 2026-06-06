import { Application, Container, Rectangle, Text } from 'pixi.js';
import { StageBackground } from './StageBackground';
import { SpriteBody } from './SpriteBody';
import { TitleParticles } from './TitleParticles';
import { loadCharacterTextures, getCharacterFrames } from './characterFrames';
import { loadEnemyTextures, getEnemyFrames } from './enemyFrames';
import { loadBackgroundTextures } from './backgroundLayers';
import { CLASS_KEYS, classDef } from '@/data/classes';
import { hexToNum } from '@/styles/palette';

// The title-screen scene: the dusk backdrop (reused from the game strip) with the three
// heroes walking IN from the left and three enemies from the right, settling into an idle
// 3-vs-3 face-off — then it comes alive: a slow background drift, drifting dusk motes,
// random idle "fidgets", and hover reactions (the character swings + pops + names itself).
// A standalone Pixi Application separate from GameStrip, torn down (without releasing the
// shared texture pool) when the player hits Start.

const WIDTH = 1280;
// The scene renders at the previous title proportions (720) inside a centred band of the
// 1060 overlay window — the rest of the window is transparent (desktop shows through).
const HEIGHT = 720;
const GROUND_FRAC = 0.56; // raised horizon vs the game (0.72): less sky, more green

// Hover hit-boxes (slot-local px, BEFORE the slot's own scale). The sprite frame is 100px of
// mostly-transparent padding — using it as the hit area makes neighbours' boxes overlap and
// swallow the front/centre characters. These tight rects hug the actual figure instead.
const HERO_HIT = new Rectangle(-24, -74, 48, 82);
const ENEMY_HIT = new Rectangle(-9, -48, 18, 56);

// Cast sizing (eyeballed for 1280×720). Heroes keep their per-class scale (≈2.9) bumped by
// HERO_SLOT; enemy sheets author scale=1, so they get an explicit base. Negative x mirrors
// the enemies to face left.
const HERO_SLOT = 1.7;
const ENEMY_SLOT = 4.4;
const WALK_PX_PER_S = 150;
const ROW_STAGGER_MS = 320;
const OFFSCREEN_PAD = 120;

// Intro sequence: the backdrop fades in first, the logo (CSS) drops in next, then the cast
// starts walking on — so the screen builds up rather than appearing all at once.
const BG_FADE_MS = 650; // backdrop + motes fade-in
const INTRO_DELAY = 1100; // cast hold off-screen this long before walking on (after the logo)

// Ambience
const CAM_DRIFT = 6; // px/s slow background drift
const FIDGET_MIN = 2600; // ms between random idle actions per actor
const FIDGET_MAX = 6400;
const HOVER_POP = 0.12; // scale bump on hover

const ENEMY_KEYS = ['orc', 'skeleton', 'skeleton-archer'] as const;
const ENEMY_LABELS: Record<string, string> = { orc: 'Orc', skeleton: 'Skeleton', 'skeleton-archer': 'Archer' };

interface Actor {
  body: SpriteBody;
  slot: Container;
  label: Text;
  kind: 'hero' | 'enemy';
  scaleX: number; // signed base scale (negative for the mirrored enemies)
  scaleY: number;
  headY: number; // px above the feet to float the name
  targetX: number;
  x: number;
  delayMs: number;
  arrived: boolean;
  hover: number; // eased 0→1 hover weight
  hovered: boolean;
  fidgetMs: number;
}

/** Exponential ease toward a target over ~tau ms. */
function ease(cur: number, target: number, dtMs: number, tau: number): number {
  return cur + (target - cur) * (1 - Math.exp(-dtMs / tau));
}

export class TitleScene {
  private app: Application | null = null;
  private destroyed = false;
  private readonly bg = new StageBackground();
  private readonly particles = new TitleParticles();
  private readonly cast = new Container();
  private actors: Actor[] = [];
  private cameraX = 0;
  private elapsed = 0;

  async init(container: HTMLElement): Promise<void> {
    const app = new Application();
    await app.init({
      background: '#14121a',
      width: WIDTH,
      height: HEIGHT,
      antialias: false,
      roundPixels: true,
      autoDensity: true,
      resolution: Math.min(2, Math.ceil(window.devicePixelRatio || 1)),
    });
    if (this.destroyed) {
      app.destroy({ removeView: true, releaseGlobalResources: false }, { children: true });
      return;
    }
    container.appendChild(app.canvas);
    this.app = app;

    await Promise.all([loadCharacterTextures(), loadEnemyTextures(), loadBackgroundTextures()]);
    if (this.destroyed) {
      this.destroy();
      return;
    }

    this.bg.build(WIDTH, HEIGHT, GROUND_FRAC);
    this.bg.update(0, 1); // world 1 dusk tint
    this.particles.build(WIDTH, HEIGHT);
    this.bg.alpha = 0; // fade the backdrop + motes in over the first frames
    this.particles.alpha = 0;
    app.stage.addChild(this.bg, this.cast, this.particles);
    app.stage.eventMode = 'static'; // enable the hover hit-test on the cast

    this.buildCast();
    app.ticker.add((t) => this.frame(t.deltaMS));
  }

  private buildCast(): void {
    const groundY = Math.round(HEIGHT * GROUND_FRAC);
    const heroTargets = [360, 270, 185]; // front → back
    CLASS_KEYS.forEach((key, row) => {
      const frames = getCharacterFrames(key);
      if (frames === null) return;
      this.addActor(new SpriteBody(frames), {
        kind: 'hero',
        scaleX: HERO_SLOT,
        headY: 120,
        name: classDef(key).name,
        targetX: heroTargets[row] ?? 200,
        startX: -OFFSCREEN_PAD - row * 70,
        groundY,
        row,
      });
    });
    const enemyTargets = [920, 1010, 1095];
    ENEMY_KEYS.forEach((key, row) => {
      const frames = getEnemyFrames(key);
      if (frames === null) return;
      this.addActor(new SpriteBody(frames), {
        kind: 'enemy',
        scaleX: -ENEMY_SLOT,
        headY: 135,
        name: ENEMY_LABELS[key] ?? key,
        targetX: enemyTargets[row] ?? 1000,
        startX: WIDTH + OFFSCREEN_PAD + row * 70,
        groundY,
        row,
      });
    });
  }

  private addActor(
    body: SpriteBody,
    o: { kind: 'hero' | 'enemy'; scaleX: number; headY: number; name: string; targetX: number; startX: number; groundY: number; row: number },
  ): void {
    const slot = new Container();
    const scaleY = Math.abs(o.scaleX);
    slot.scale.set(o.scaleX, scaleY);
    slot.position.set(o.startX, o.groundY - o.row * 10); // slight depth lift for back rows
    slot.addChild(body);
    slot.eventMode = 'static';
    slot.cursor = 'pointer';
    slot.hitArea = o.kind === 'hero' ? HERO_HIT : ENEMY_HIT; // tight box → no neighbour overlap

    // The name floats in the UNSCALED cast space (not the flipped slot) so it reads upright.
    const label = new Text({
      text: o.name,
      style: { fontFamily: 'monospace', fontSize: 16, fontWeight: 'bold', fill: hexToNum('#e8b24c'), stroke: { color: hexToNum('#0d0b12'), width: 4 } },
    });
    label.anchor.set(0.5, 1);
    label.visible = false;
    label.eventMode = 'none';

    this.cast.addChild(slot, label);
    const actor: Actor = {
      body, slot, label, kind: o.kind, scaleX: o.scaleX, scaleY, headY: o.headY,
      targetX: o.targetX, x: o.startX, delayMs: INTRO_DELAY + o.row * ROW_STAGGER_MS, arrived: false,
      hover: 0, hovered: false, fidgetMs: FIDGET_MIN + Math.random() * (FIDGET_MAX - FIDGET_MIN),
    };
    slot.on('pointerover', () => this.onHover(actor, true));
    slot.on('pointerout', () => this.onHover(actor, false));
    this.actors.push(actor);
  }

  private onHover(a: Actor, entering: boolean): void {
    a.hovered = entering;
    if (entering && a.arrived) a.body.attack(); // a swing/cast greeting
  }

  private fidget(a: Actor): void {
    const r = Math.random();
    if (a.kind === 'hero') {
      if (r < 0.55) a.body.attack();
      else a.body.block();
    } else {
      if (r < 0.6) a.body.attack();
      else a.body.hurt();
    }
  }

  private frame(dtMs: number): void {
    this.elapsed += dtMs;

    // Backdrop + motes fade in at the start of the intro.
    const introK = Math.min(1, this.elapsed / BG_FADE_MS);
    this.bg.alpha = introK;
    this.particles.alpha = introK;

    // Slow background drift (clouds/sun/grass parallax against the camera).
    this.cameraX += (CAM_DRIFT * dtMs) / 1000;
    this.bg.update(this.cameraX, 1);

    this.particles.update(dtMs);

    const stepMax = (WALK_PX_PER_S * dtMs) / 1000;
    for (const a of this.actors) {
      if (this.elapsed < a.delayMs) {
        a.body.update(dtMs, false);
        continue;
      }
      // Entrance walk → idle.
      const dx = a.targetX - a.x;
      const moving = !a.arrived && Math.abs(dx) > 1;
      if (moving) a.x += Math.sign(dx) * Math.min(stepMax, Math.abs(dx));
      else if (!a.arrived) {
        a.x = a.targetX;
        a.arrived = true;
      }
      a.slot.x = a.x;
      a.body.update(dtMs, moving);

      // Ambient fidgets once settled.
      if (a.arrived && !a.hovered) {
        a.fidgetMs -= dtMs;
        if (a.fidgetMs <= 0) {
          this.fidget(a);
          a.fidgetMs = FIDGET_MIN + Math.random() * (FIDGET_MAX - FIDGET_MIN);
        }
      }

      // Hover pop + name.
      a.hover = ease(a.hover, a.hovered && a.arrived ? 1 : 0, dtMs, 80);
      const k = 1 + HOVER_POP * a.hover;
      a.slot.scale.set(a.scaleX * k, a.scaleY * k);
      a.label.position.set(a.x, a.slot.y - a.headY);
      a.label.alpha = a.hover;
      a.label.visible = a.hover > 0.02;
    }
  }

  destroy(): void {
    this.destroyed = true;
    // releaseGlobalResources:false — the game's GameStrip reuses this texture pool next.
    this.app?.destroy({ removeView: true, releaseGlobalResources: false }, { children: true });
    this.app = null;
    this.actors = [];
  }
}
