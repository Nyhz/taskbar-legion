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

/** The longest a hit's number is held back to wait for its blow: longer and it would trail the life bar. */
export const MAX_BLOW_WAIT_MS = 450;

/** How fast an ABILITY's clip plays when it lands a hit: as drawn when its blow comes within MAX_BLOW_WAIT_MS;
 *  hurried (up to MAX_RATE, declared below) when the wind-up is longer — a full bow draw, an incantation — so
 *  the blow still comes in time and the shot can wait for it; as drawn when even hurried it would be too long. */
export function blowRate(anim: FigureAnim | undefined): number {
  if (anim === undefined) return 1;
  const rate = impactMs(anim) / MAX_BLOW_WAIT_MS;
  return rate <= 1 || rate > MAX_RATE ? 1 : rate;
}

/** How long after an ABILITY's clip starts (at blowRate) its hit should show: the clip's time to its blow, when
 *  that is short enough to wait for; otherwise at once. (A basic attack needs no wait — its clip is started
 *  early instead.) */
export function blowWaitMs(anim: FigureAnim | undefined): number {
  if (anim === undefined) return 0;
  const ms = impactMs(anim) / blowRate(anim);
  return ms <= MAX_BLOW_WAIT_MS + 1e-6 ? ms : 0;
}

/** When the swing will really happen, from the swing timer: the simulation only acts on its ticks, so a timer
 *  with 250 ms left fires on the third tick from now — in 300 ms. `tickMs` is the simulation's tick length. */
export function swingEtaMs(swingTimerMs: number, tickMs: number): number {
  if (swingTimerMs <= 0) return 0;
  return tickMs > 0 ? Math.ceil(swingTimerMs / tickMs) * tickMs : swingTimerMs;
}

/** The most an attack clip is hurried: past this it reads as a blur, so the blow just lands a little late. */
export const MAX_RATE = 2.5;

/** A shot or a spell that nothing announced (the archer looses the instant she stops): its clip plays from the
 *  start, hurried so the release comes within this long, and the arrow and its number wait for the release. A
 *  melee blow does not wait: its clip starts at the blow instead (ClipPlayer.act `fromMs`). */
export const UNLED_WINDUP_MS = 300;

/** How fast an unannounced shot's clip plays (see UNLED_WINDUP_MS): as drawn if its wind-up is short enough. */
export function unledRate(windupMs: number): number {
  return Math.max(1, Math.min(MAX_RATE, windupMs / UNLED_WINDUP_MS));
}

/** How long the shot of an unannounced attack waits for its clip's release. */
export function unledWaitMs(windupMs: number): number {
  return windupMs <= 0 ? 0 : windupMs / unledRate(windupMs);
}

/** How long after its expected moment a hit may still arrive and count as the one the early clip was for. */
export const LEAD_GRACE_MS = 250;

/** How fast a clip of `clipMs` must play to END before the next swing, `intervalMs` later (never slower than
 *  drawn, never past MAX_RATE): a boss whose attack is drawn longer than the time between two of its swings would
 *  otherwise have every recovery cut by the next wind-up. */
export function fitRate(clipMs: number, intervalMs: number): number {
  if (!(clipMs > 0) || !(intervalMs > 0)) return 1;
  return Math.max(1, Math.min(MAX_RATE, clipMs / intervalMs));
}

export class AttackLead {
  private waitedMs = -1; // ≥ 0 while a clip started early is waiting for its hit
  private pace = 1; // the least speed the clip plays at (≥ 1): see setPace

  constructor(public windupMs: number) {}

  /** The next swing plays another clip (a figure with several basic attacks): its own time to the blow. Only
   *  between swings — an early clip already waiting for its hit keeps the timing it was started with. */
  setWindup(ms: number): void {
    if (this.waitedMs < 0) this.windupMs = ms;
  }

  /** The whole clip (`clipMs`) must fit between two swings (`intervalMs` apart): it is played at least that
   *  fast (fitRate), and its early start comes that much later. Only between swings, like setWindup. */
  setPace(clipMs: number, intervalMs: number): void {
    if (this.waitedMs < 0) this.pace = fitRate(clipMs, intervalMs);
  }

  /** The wind-up as it will be played (at the pace). */
  private get leadMs(): number {
    return this.windupMs / this.pace;
  }

  /** True when the attack clip should start now: the swing is this close (`etaMs`, see swingEtaMs) and no early
   *  clip is still waiting. */
  due(etaMs: number): boolean {
    return this.waitedMs < 0 && etaMs > 0 && etaMs <= this.leadMs;
  }

  /** How fast to play the clip so its blow lands exactly when the swing does: as drawn when the whole wind-up
   *  fits before the swing, hurried (up to MAX_RATE) when the swing comes sooner — a fighter that attacks faster
   *  than its clip was drawn for. */
  rate(etaMs: number): number {
    if (etaMs <= 0 || this.windupMs <= 0) return this.pace;
    return Math.max(this.pace, Math.min(MAX_RATE, this.windupMs / etaMs));
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
    if (this.waitedMs > this.leadMs + LEAD_GRACE_MS) this.waitedMs = -1;
  }

  /** The clip started early was taken by something else (an ability's hit): stop waiting for its hit. */
  drop(): void {
    this.waitedMs = -1;
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
  abilities: readonly {
    def: { key: string; charge?: { toCast: number }; castCondition?: string; fires?: { when: string; foes?: number } };
  }[];
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
    // A fire rule (data/abilities) that only asks for one enemy in reach fires when ready; every other rule waits
    // for its moment (a hit taken, a pack, an ally hurt).
    if (def.fires !== undefined) {
      if (def.fires.when !== 'inReach' || (def.fires.foes ?? 1) > 1) return false;
    } else if (!FIRES_WHEN_READY.has(def.castCondition ?? 'always')) return false;
    if (def.charge !== undefined) return (c.charges?.[def.key] ?? 0) >= def.charge.toCast;
    return (c.cooldowns[def.key] ?? 0) <= c.attackTimerMs;
  });
}
