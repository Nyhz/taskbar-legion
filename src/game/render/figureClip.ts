import type { FigureAnim } from './figureData';

// Which frame of which animation a figure shows, advanced by the clock (no Pixi here — pure, unit-tested).
// Timing follows each animation's own per-frame `ms`. A figure is always in one of four states:
//   - a LOOP (idle, or run while it moves);
//   - an ACTION (an attack or an ability: a one-shot that then returns to the loop);
//   - a REACTION (hurt, a block: a one-shot that only starts from a loop — it never interrupts an action);
//   - DEAD (the death one-shot, then its last frame is held until `revive`).
// A clip either plays to its end or is CUT cleanly: the next one starts from its first frame, never mid-pose.

export const IDLE = 'idle';
export const RUN = 'run';
export const DEATH = 'death';

/** An action can be cut by the next one once this share of it has played (its blow has landed by then). */
export const ACTION_CUT_AFTER = 0.6;

type State = 'loop' | 'action' | 'reaction' | 'dead';

export class ClipPlayer {
  private state: State = 'loop';
  private name: string = IDLE;
  private index = 0;
  private inFrameMs = 0; // time spent in the current frame
  private playedMs = 0; // time spent in the current clip
  private totalMs = 0; // length of the current clip
  private sinceReactionMs = Number.POSITIVE_INFINITY;

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

  has(clip: string): boolean {
    return this.anims[clip] !== undefined;
  }

  /**
   * Ask for an action clip. It starts at once from a loop or a reaction. Over another action it starts only if
   * that one has played past ACTION_CUT_AFTER — or, with `urgent` (an ability over a basic attack), if it is a
   * different clip. Returns whether the clip started.
   */
  act(clip: string, urgent = false): boolean {
    if (this.state === 'dead' || !this.has(clip)) return false;
    if (this.state === 'action') {
      const landed = this.playedMs >= this.totalMs * ACTION_CUT_AFTER;
      if (!landed && !(urgent && clip !== this.name)) return false;
    }
    this.start(clip, 'action');
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
    this.playedMs += dtMs;
    this.inFrameMs += dtMs;
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
        const spill = this.inFrameMs - hold; // the one-shot ended: back to the loop, keeping the leftover time
        this.start(loop, 'loop');
        this.inFrameMs = spill;
        this.playedMs = spill;
      }
    }
  }

  private start(clip: string, state: State): void {
    this.state = state;
    this.name = clip;
    this.index = 0;
    this.inFrameMs = 0;
    this.playedMs = 0;
    const anim = this.anims[clip];
    this.totalMs = 0;
    if (anim !== undefined) for (const ms of anim.ms) this.totalMs += ms;
  }
}
