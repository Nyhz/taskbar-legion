import { AnimatedSprite, Container } from 'pixi.js';
import type { Texture, Ticker } from 'pixi.js';
import type { CharFrames } from './characterFrames';

// A sprite-sheet character body with a tiny state machine: it loops WALK by default,
// plays a one-shot ATTACK (alternating through the class's attack sheets) when it
// strikes, and a one-shot BLOCK (if the class has a block sheet) when it blocks a hit
// — block never interrupts an attack. Both one-shots fall back to walk on completion.
// Driven manually from the render frame's dtMs (autoUpdate off) so it stays in lockstep
// with the rest of the strip and freezes cleanly on death. Geometry/scale come from the
// class config, so one body serves every sprite class (warrior, ranger, …).

const MS_PER_FRAME = 1000 / 60; // Pixi AnimatedSprite.update expects ticker-frame units

type Mode = 'walk' | 'attack' | 'block';

export class SpriteBody extends Container {
  private readonly anim: AnimatedSprite;
  private readonly frames: CharFrames;
  private mode: Mode = 'walk';
  private resting = false; // holding the idle stance (attack frame 0) instead of looping walk
  private nextSwing = 0; // index into frames.attacks (alternates)
  // AnimatedSprite.update only reads ticker.deltaTime, so we feed it a tiny shim each
  // frame rather than the shared Ticker — that keeps the animation driven by OUR dtMs.
  private readonly tickerShim = { deltaTime: 0 } as unknown as Ticker;

  constructor(frames: CharFrames) {
    super();
    this.frames = frames;
    const cfg = frames.config;
    this.anim = new AnimatedSprite(frames.walk);
    this.anim.autoUpdate = false;
    // Anchor at the body centre / feet baseline so the feet stay planted and the body
    // stays centred across states even when attack frames extend a weapon outward.
    this.anim.anchor.set(cfg.bodyCx / cfg.frameSize, cfg.feetY / cfg.frameSize);
    this.anim.animationSpeed = cfg.walkFps / 60;
    this.anim.loop = true;
    this.anim.play();
    this.addChild(this.anim);
    this.scale.set(cfg.scale);
  }

  /** Strike: play a one-shot attack (alternating between the class's attack sheets). */
  attack(): void {
    const sheets = this.frames.attacks;
    const sheet = sheets[this.nextSwing % sheets.length];
    if (sheet === undefined) return;
    this.nextSwing = (this.nextSwing + 1) % sheets.length;
    this.playOnce('attack', sheet, this.frames.config.attackFps);
  }

  /** Blocked a hit: play a one-shot block (if this class has one) — never interrupts a
   *  swing, and won't restart while a block is already playing. */
  block(): void {
    const b = this.frames.block;
    if (b === undefined || this.mode !== 'walk') return;
    this.playOnce('block', b, this.frames.config.blockFps ?? 14);
  }

  setTint(tint: number): void {
    this.anim.tint = tint;
  }

  setBodyAlpha(alpha: number): void {
    this.anim.alpha = alpha;
  }

  /** Advance the animation. Pass dtMs = 0 to freeze (e.g. while dead). When `moving` is
   *  false and the body is looping its walk cycle, hold the FIRST attack frame as a ready
   *  idle stance instead of shuffling in place — heroes plant between strikes rather than
   *  run on the spot. Attack/block one-shots always play through regardless of `moving`. */
  update(dtMs: number, moving = true): void {
    if (dtMs <= 0) return; // frozen externally (e.g. dead) — hold whatever frame we're on
    if (this.mode === 'walk') {
      if (!moving) {
        this.showRest(); // settle into the attack's opening pose
        return;
      }
      if (this.resting) this.toWalk(); // moving again → resume the walk cycle
    }
    this.tickerShim.deltaTime = dtMs / MS_PER_FRAME;
    this.anim.update(this.tickerShim);
  }

  /** Hold the first frame of the (primary) attack sheet — the hero's ready idle stance. */
  private showRest(): void {
    if (this.resting) return;
    const rest = this.frames.attacks[0]?.[0];
    if (rest === undefined) return;
    this.resting = true;
    this.anim.textures = [rest]; // single frame ⇒ nothing to advance
    this.anim.gotoAndStop(0);
  }

  private playOnce(mode: Mode, textures: Texture[], fps: number): void {
    this.mode = mode;
    this.resting = false;
    this.anim.textures = textures;
    this.anim.loop = false;
    this.anim.animationSpeed = fps / 60;
    this.anim.onComplete = () => this.toWalk();
    this.anim.gotoAndPlay(0);
  }

  private toWalk(): void {
    this.mode = 'walk';
    this.resting = false;
    this.anim.textures = this.frames.walk;
    this.anim.loop = true;
    this.anim.onComplete = undefined;
    this.anim.animationSpeed = this.frames.config.walkFps / 60;
    this.anim.gotoAndPlay(0);
  }
}
