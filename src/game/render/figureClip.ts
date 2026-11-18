import type { FigureAnim } from './figureData';

// Which frame of which animation a figure shows, advanced by the clock (no Pixi here — pure, unit-tested).
// Timing follows each animation's own per-frame `ms`. A figure is always in one of four states:
//   - a LOOP (idle, or run while it moves);
//   - an ACTION (an attack or an ability: a one-shot that then returns to the loop);
//   - a REACTION (hurt, a block: a one-shot that only starts from a loop — it never interrupts an action);
//   - DEAD (the death one-shot, then its last frame is held until `revive`).
// A clip either plays to its end or is CUT cleanly: the next one starts from its first frame, never mid-pose —
// except an attack whose hit has ALREADY landed (nothing started it early), which starts at its blow (`fromMs`).

export const IDLE = 'idle';
export const RUN = 'run';
export const DEATH = 'death';

/** An action can be cut by the next one once this share of it has played (its blow has landed by then). */
export const ACTION_CUT_AFTER = 0.6;

/** A clip that has played no more than this has "only just started": one long frame of the app (see `hurry`). */
export const FRESH_MS = 80;

type State = 'loop' | 'action' | 'reaction' | 'dead';

export class ClipPlayer {
  private state: State = 'loop';
  private name: string = IDLE;
  private index = 0;
  private inFrameMs = 0; // time spent in the current frame
  private playedMs = 0; // time spent in the current clip
  private totalMs = 0; // length of the current clip
  private sinceReactionMs = Number.POSITIVE_INFINITY;
  private rate = 1; // playback speed of the current action (an attack hurried to land with its hit); loops play at 1

  constructor(private readonly anims: Readonly<Record<string, FigureAnim>>) {
    this.start(IDLE, 'loop');
  }

  /** The animation on screen and its frame. */
  get clip(): string {
    return this.name;
  }
  get frame(): number {
    return this.index;
  }
  get dead(): boolean {
    return this.state === 'dead';
  }
  /** True while an attack or ability clip is playing. */
  get acting(): boolean {
    return this.state === 'action';
  }
  /** How far the current clip has played, 0 → 1. */
  get progress(): number {
    return this.totalMs > 0 ? Math.min(1, this.playedMs / this.totalMs) : 0;
  }

  has(clip: string): boolean {
    return this.anims[clip] !== undefined;
  }

  /**
   * Ask for an action clip. It starts at once from a loop or a reaction. Over another action it starts only if
   * that one has played past ACTION_CUT_AFTER — or, with `urgent` (an ability over a basic attack), if it is a
   * different clip. `rate` plays it faster or slower than drawn (a quick attacker's wind-up is hurried so the blow
   * lands with the hit — render/attackLead). `fromMs` skips that much of the clip: a hit that nothing announced
   * (a fighter that strikes the instant it arrives) starts at its blow, not at a wind-up that would land late.
   * Returns whether the clip started.
   */
  act(clip: string, urgent = false, rate = 1, fromMs = 0): boolean {
    if (this.state === 'dead' || !this.has(clip)) return false;
    if (this.state === 'action') {
      const landed = this.playedMs >= this.totalMs * ACTION_CUT_AFTER;
      if (!landed && !(urgent && clip !== this.name)) return false;
    }
    this.start(clip, 'action');
    this.rate = rate > 0 ? rate : 1;
    if (fromMs > 0) this.skip(fromMs);
    return true;
  }

  /** Take over `clip` if it is the action on screen and has only just started (at most FRESH_MS of it played):
   *  it starts again from its first frame at `rate`. A clip started a moment ago — by the cast, or early for the
   *  NEXT basic attack — becomes the clip of an ability's hit, which must reach its blow in time. Returns
   *  whether it applied. */
  hurry(clip: string, rate: number): boolean {
    if (this.state !== 'action' || this.name !== clip || this.playedMs > FRESH_MS) return false;
    this.start(clip, 'action');
    this.rate = rate > 0 ? rate : 1;
    return true;
  }

  /** Ask for a reaction clip (hurt, block): only from a loop, and not within `gapMs` of the last one. */
  react(clip: string, gapMs = 0): boolean {
    if (this.state !== 'loop' || !this.has(clip) || this.sinceReactionMs < gapMs) return false;
    this.start(clip, 'reaction');
    this.sinceReactionMs = 0;
    return true;
  }

  die(): void {
    if (this.state === 'dead') return;
    this.start(this.has(DEATH) ? DEATH : this.name, 'dead');
  }

  revive(): void {
    if (this.state === 'dead') this.start(IDLE, 'loop');
  }

  /** Advance the clock. `moving` chooses the loop: run while the figure moves, idle while it stands. */
  advance(dtMs: number, moving: boolean): void {
    this.sinceReactionMs += dtMs;
    const loop = moving && this.has(RUN) ? RUN : IDLE;
    if (this.state === 'loop' && loop !== this.name) this.start(loop, 'loop');
    if (dtMs <= 0) return;
    const step = dtMs * this.rate; // clip time: an action may run faster than the clock
    this.playedMs += step;
    this.inFrameMs += step;
    // Step through as many frames as the time covers (bounded: a long frame of the app cannot spin here).
    for (let step = 0; step < 256; step++) {
      const anim = this.anims[this.name];
      const hold = anim?.ms[this.index] ?? 0;
      if (anim === undefined || hold <= 0 || this.inFrameMs < hold) return;
      if (this.index + 1 < anim.n) {
        this.inFrameMs -= hold;
        this.index += 1;
      } else if (this.state === 'loop') {
        this.inFrameMs -= hold;
        this.index = 0;
      } else if (this.state === 'dead') {
        this.inFrameMs = hold; // the last frame is held
        return;
      } else {
        const spill = (this.inFrameMs - hold) / this.rate; // the one-shot ended: back to the loop, keeping the leftover clock time
        this.start(loop, 'loop');
        this.inFrameMs = spill;
        this.playedMs = spill;
      }
    }
  }

  /** Jump into the clip just started: to the frame that holds `ms`, at its beginning (never past the last frame). */
  private skip(ms: number): void {
    const anim = this.anims[this.name];
    if (anim === undefined) return;
    let before = 0;
    while (this.index + 1 < anim.n && before + (anim.ms[this.index] ?? 0) <= ms) {
      before += anim.ms[this.index] ?? 0;
      this.index += 1;
    }
    this.playedMs = before;
  }

  private start(clip: string, state: State): void {
    this.state = state;
    this.name = clip;
    this.index = 0;
    this.inFrameMs = 0;
    this.playedMs = 0;
    this.rate = 1;
    const anim = this.anims[clip];
    this.totalMs = 0;
    if (anim !== undefined) for (const ms of anim.ms) this.totalMs += ms;
  }
}
