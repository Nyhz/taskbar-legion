import type { FigureAnim } from './figureData';

// Landing the blow WITH the hit (no Pixi here — pure, unit-tested). The simulation resolves a basic attack in
// one instant, when the swing timer runs out; an attack clip takes a while to get to its blow (the wind-up).
// Started on the hit, the blow would land a third of a second after its own damage number — so the clip is
// started EARLY, when the swing timer has just the wind-up left, and the hit then finds it at its blow.
// Reads the swing timer only; nothing here changes when or whether an attack happens.

const SNAP = 2.5; // a lesser drop is still part of the wind-up (an arm raised, a step taken)

/** Time from a clip's first frame to its blow. Every attack the redesign drew holds its wind-up and then SNAPS:
 *  the blow is the first frame at least SNAP times shorter than the one before it (a 130 ms hold, then 35 ms of steel).
 *  A clip with no such snap falls back to its quickest frame. A double strike counts its first blow. */
export function impactMs(anim: FigureAnim): number {
  let blow = -1;
  for (let i = 1; i < anim.n && blow < 0; i++) if ((anim.ms[i] ?? 0) * SNAP <= (anim.ms[i - 1] ?? 0)) blow = i;
  if (blow < 0) {
    blow = 0;
    for (let i = 1; i < anim.n; i++) if ((anim.ms[i] ?? Infinity) < (anim.ms[blow] ?? Infinity)) blow = i;
  }
  let ms = 0;
  for (let i = 0; i < blow; i++) ms += anim.ms[i] ?? 0;
  return ms;
}

/** When the swing will really happen, from the swing timer: the simulation only acts on its ticks, so a timer
 *  with 250 ms left fires on the third tick from now — in 300 ms. `tickMs` is the simulation's tick length. */
export function swingEtaMs(swingTimerMs: number, tickMs: number): number {
  if (swingTimerMs <= 0) return 0;
  return tickMs > 0 ? Math.ceil(swingTimerMs / tickMs) * tickMs : swingTimerMs;
}

/** The most an attack clip is hurried: past this it reads as a blur, so the blow just lands a little late. */
export const MAX_RATE = 2.5;

/** How long after its expected moment a hit may still arrive and count as the one the early clip was for. */
export const LEAD_GRACE_MS = 250;

export class AttackLead {
  private waitedMs = -1; // ≥ 0 while a clip started early is waiting for its hit

  constructor(readonly windupMs: number) {}

  /** True when the attack clip should start now: the swing is this close (`etaMs`, see swingEtaMs) and no early
   *  clip is still waiting. */
  due(etaMs: number): boolean {
    return this.waitedMs < 0 && etaMs > 0 && etaMs <= this.windupMs;
  }

  /** How fast to play the clip so its blow lands exactly when the swing does: as drawn when the whole wind-up
   *  fits before the swing, hurried (up to MAX_RATE) when the swing comes sooner — a fighter that attacks faster
   *  than its clip was drawn for. */
  rate(etaMs: number): number {
    if (etaMs <= 0 || this.windupMs <= 0) return 1;
    return Math.max(1, Math.min(MAX_RATE, this.windupMs / etaMs));
  }

  /** The clip was started early. */
  started(): void {
    this.waitedMs = 0;
  }

  /** Advance the clock: an early clip whose hit never came (the target died, the swing became an ability)
   *  stops waiting, so the next hit plays its clip as usual. */
  tick(dtMs: number): void {
    if (this.waitedMs < 0) return;
    this.waitedMs += dtMs;
    if (this.waitedMs > this.windupMs + LEAD_GRACE_MS) this.waitedMs = -1;
  }

  /** A hit landed. True if its clip is already playing (it was started early): do not start it again. */
  claim(): boolean {
    if (this.waitedMs < 0) return false;
    this.waitedMs = -1;
    return true;
  }
}

/** The slice of a sim hero that says whether an ability is about to take its swing. */
export interface SwingOwner {
  attackTimerMs: number;
  cooldowns: Readonly<Record<string, number>>;
  charges?: Readonly<Record<string, number>>;
  abilities: readonly { def: { key: string; charge?: { toCast: number }; castCondition?: string } }[];
}

// Cast conditions that only ask for a fight to be on: an ability with one of these fires as soon as it is ready.
// Any other condition is REACTIVE (a heal waiting for someone to be hurt): it can sit ready for a long time.
const FIRES_WHEN_READY: ReadonlySet<string> = new Set(['always', 'enemyPresent', 'tankEngaged']);

/** True when one of the hero's abilities will be off cooldown (or fully charged) by the time the swing comes
 *  and fires as soon as it is ready: the swing will be that ability, whose own clip plays on its cast — so no
 *  attack clip is started early. A reactive ability is not counted (it is ready most of the time): when it does
 *  take the swing, its clip simply cuts in over the attack's wind-up. */
export function abilityTakesSwing(c: SwingOwner): boolean {
  return c.abilities.some(({ def }) => {
    if (!FIRES_WHEN_READY.has(def.castCondition ?? 'always')) return false;
    if (def.charge !== undefined) return (c.charges?.[def.key] ?? 0) >= def.charge.toCast;
    return (c.cooldowns[def.key] ?? 0) <= c.attackTimerMs;
  });
}
