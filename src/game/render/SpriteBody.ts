import { AnimatedSprite, Container } from 'pixi.js';
import type { Texture, Ticker } from 'pixi.js';
import type { CharFrames } from './characterFrames';

// A sprite-sheet character body with a small state machine. It loops WALK while moving
// and IDLE while standing, and plays one-shots that fall back to the loop on completion:
//   • ATTACK — alternates through the class's attack sheets; a frame-aligned slash effect
//     plays on a second overlay sprite on top of the body.
//   • HEAL  — the healer's dedicated cast pose (no overlay; the sparkle lands on the ally).
//   • BLOCK / HURT — short reactions that only fire from a loop state, so they never
//     interrupt an attack/heal (or restart on top of themselves).
//   • DEATH — plays once then HOLDS its last frame until revive() resets to idle.
// Driven manually from the render frame's dtMs (autoUpdate off) so it stays in lockstep
// with the rest of the strip. Geometry/scale come from the class config, so one body
// serves every sprite class (knight, ranger, priest, …).

const MS_PER_FRAME = 1000 / 60; // Pixi AnimatedSprite.update expects ticker-frame units

type Mode = 'idle' | 'walk' | 'attack' | 'block' | 'hurt' | 'heal' | 'death';

/** A one-shot mode plays through to completion before the loop resumes. */
function isOneShot(m: Mode): boolean {
  return m === 'attack' || m === 'block' || m === 'hurt' || m === 'heal' || m === 'death';
}

export class SpriteBody extends Container {
  private readonly anim: AnimatedSprite;
  private readonly overlay: AnimatedSprite; // frame-aligned attack-effect, on top of the body
  private readonly frames: CharFrames;
  private readonly basicAttackIndices: number[]; // auto-attack sheets (excludes the ability swing)
  private mode: Mode = 'idle';
  private dead = false; // latched once death plays — only revive() clears it
  private nextSwing = 0; // cursor into basicAttackIndices (alternates the auto swings)
  // AnimatedSprite.update only reads ticker.deltaTime, so we feed it a tiny shim each
  // frame rather than the shared Ticker — that keeps the animation driven by OUR dtMs.
  private readonly tickerShim = { deltaTime: 0 } as unknown as Ticker;

  constructor(frames: CharFrames) {
    super();
    this.frames = frames;
    const cfg = frames.config;
    // Auto-attacks alternate through every attack sheet EXCEPT the one reserved for melee
    // ability casts (if any). Falls back to all sheets when none is reserved.
    this.basicAttackIndices = frames.attacks.map((_, i) => i).filter((i) => i !== cfg.abilityAttackIndex);
    if (this.basicAttackIndices.length === 0) this.basicAttackIndices = frames.attacks.map((_, i) => i);
    const anchorX = cfg.bodyCx / cfg.frameSize;
    const anchorY = cfg.feetY / cfg.frameSize;
    this.anim = new AnimatedSprite(frames.idle.length > 0 ? frames.idle : frames.walk);
    this.anim.autoUpdate = false;
    // Anchor at the body centre / feet baseline so the feet stay planted and the body
    // stays centred across states even when attack frames extend a weapon outward.
    this.anim.anchor.set(anchorX, anchorY);
    this.anim.animationSpeed = cfg.fps.idle / 60;
    this.anim.loop = true;
    this.anim.play();
    // Overlay shares the exact anchor/transform so frame-aligned effects line up on the
    // body. Hidden until an attack with an effect sheet plays.
    this.overlay = new AnimatedSprite([this.anim.texture]);
    this.overlay.autoUpdate = false;
    this.overlay.anchor.set(anchorX, anchorY);
    this.overlay.loop = false;
    this.overlay.visible = false;
    this.addChild(this.anim, this.overlay);
    this.scale.set(cfg.scale);
  }

  /** Strike: play a one-shot attack with its frame-aligned slash overlay (if any).
   *  `special` plays the reserved melee-ability swing (the knight's heavy 3rd attack);
   *  a basic auto alternates through the remaining sheets. Interrupts block/hurt. */
  attack(special = false): void {
    if (this.dead) return;
    const i = this.pickAttackIndex(special);
    const sheet = i === undefined ? undefined : this.frames.attacks[i];
    if (i === undefined || sheet === undefined || sheet.length === 0) return;
    this.playOnce('attack', sheet, this.frames.config.fps.attack);
    this.playOverlay(this.frames.attackFx[i] ?? null, this.frames.config.fps.attack);
  }

  private pickAttackIndex(special: boolean): number | undefined {
    const abilityIdx = this.frames.config.abilityAttackIndex;
    if (special && abilityIdx !== undefined && (this.frames.attacks[abilityIdx]?.length ?? 0) > 0) return abilityIdx;
    const basics = this.basicAttackIndices;
    if (basics.length === 0) return undefined;
    const i = basics[this.nextSwing % basics.length];
    this.nextSwing = (this.nextSwing + 1) % basics.length;
    return i;
  }

  /** Healer cast: play the dedicated heal pose (no-op for classes without one). The
   *  heal sparkle itself lands on the healed ally (HeroSprite.showHealEffect). */
  heal(): void {
    if (this.dead) return;
    const h = this.frames.heal;
    if (h === null || h.length === 0) return;
    this.playOnce('heal', h, this.frames.config.fps.heal);
  }

  /** Blocked a hit: short shield reaction (classes with a block sheet) — only from a loop
   *  state, so it never interrupts a swing/heal or restarts on itself. */
  block(): void {
    const b = this.frames.block;
    if (b === null || b.length === 0 || isOneShot(this.mode)) return;
    this.playOnce('block', b, this.frames.config.fps.block);
  }

  /** Took a hit: brief flinch (classes with a hurt sheet) — same loop-only guard as block. */
  hurt(): void {
    const h = this.frames.hurt;
    if (h === null || h.length === 0 || isOneShot(this.mode)) return;
    this.playOnce('hurt', h, this.frames.config.fps.hurt);
  }

  /** Died: play the death one-shot once, then hold its last frame until revive(). */
  die(): void {
    if (this.dead) return;
    this.dead = true;
    this.hideOverlay();
    const d = this.frames.death;
    this.mode = 'death';
    if (d === null || d.length === 0) return; // no sheet → freeze on whatever frame we're on
    this.anim.textures = d;
    this.anim.loop = false;
    this.anim.animationSpeed = this.frames.config.fps.death / 60;
    this.anim.onComplete = (): void => this.anim.gotoAndStop(d.length - 1); // hold the last frame
    this.anim.gotoAndPlay(0);
  }

  /** Respawned: clear the death latch and drop back to the idle loop. */
  revive(): void {
    if (!this.dead) return;
    this.dead = false;
    this.hideOverlay();
    this.toLoop('idle');
  }

  setTint(tint: number): void {
    this.anim.tint = tint;
  }

  setBodyAlpha(alpha: number): void {
    this.anim.alpha = alpha;
    if (this.overlay.visible) this.overlay.alpha = alpha;
  }

  /** Advance the animation. Pass dtMs = 0 to freeze. While alive and in a loop state,
   *  picks WALK (moving) or IDLE (standing); one-shots always play through. Death holds. */
  update(dtMs: number, moving = true): void {
    if (dtMs <= 0) return;
    if (!this.dead && !isOneShot(this.mode)) {
      const want: Mode = moving ? 'walk' : 'idle';
      if (this.mode !== want) this.toLoop(want);
    }
    this.advance(dtMs);
  }

  private advance(dtMs: number): void {
    this.tickerShim.deltaTime = dtMs / MS_PER_FRAME;
    this.anim.update(this.tickerShim);
    if (this.overlay.visible) this.overlay.update(this.tickerShim);
  }

  private playOnce(mode: Mode, textures: Texture[], fps: number): void {
    this.mode = mode;
    this.anim.textures = textures;
    this.anim.loop = false;
    this.anim.animationSpeed = fps / 60;
    this.anim.onComplete = (): void => this.toLoop('idle');
    this.anim.gotoAndPlay(0);
  }

  private playOverlay(textures: Texture[] | null, fps: number): void {
    if (textures === null || textures.length === 0) {
      this.hideOverlay();
      return;
    }
    this.overlay.visible = true;
    this.overlay.alpha = this.anim.alpha;
    this.overlay.textures = textures;
    this.overlay.loop = false;
    this.overlay.animationSpeed = fps / 60;
    this.overlay.onComplete = (): void => this.hideOverlay();
    this.overlay.gotoAndPlay(0);
  }

  private hideOverlay(): void {
    this.overlay.visible = false;
    this.overlay.onComplete = undefined;
  }

  private toLoop(mode: 'idle' | 'walk'): void {
    const textures = mode === 'idle' && this.frames.idle.length > 0 ? this.frames.idle : this.frames.walk;
    this.mode = mode;
    this.anim.textures = textures;
    this.anim.loop = true;
    this.anim.onComplete = undefined;
    this.anim.animationSpeed = (mode === 'idle' ? this.frames.config.fps.idle : this.frames.config.fps.walk) / 60;
    this.anim.gotoAndPlay(0);
  }
}
