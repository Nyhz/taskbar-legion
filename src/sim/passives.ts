import type { Combatant } from './world';
import { applyEffect } from './effects';
import { effectDef } from '@/data/effects';
import { MAX_DAMAGE_REDUCTION } from '@/data/stageScaling';
import type { PassiveEffect } from '@/data/talents';

// The EFFECT passives (second combat wave, B — agreed 2026-11-15): talents that change HOW a fight goes
// instead of adding a stat. Data lives in the talent trees (a role of type 'passive': data/talentSpec.ts);
// sim/kit.ts puts each hero's on its combatant, and the combat loop asks this module at the few places a hit, a
// heal or a death is resolved. Pure and deterministic: no randomness, no clock.

export type PassiveKind = PassiveEffect['is'];

/** A hero's effect passive at its rank: `value` is its figure (per rank × rank). */
export interface HeldPassive<K extends PassiveKind = PassiveKind> {
  def: Extract<PassiveEffect, { is: K }>;
  value: number;
}

/** The passive of kind `is` that `c` holds, if any. */
export function passiveOf<K extends PassiveKind>(c: Combatant, is: K): HeldPassive<K> | undefined {
  const list = c.passives;
  if (list === undefined) return undefined;
  for (const p of list) if (p.def.is === is) return p as HeldPassive<K>;
  return undefined;
}

/** The strongest passive of a kind among the LIVING heroes, and who holds it. */
function partyPassive<K extends PassiveKind>(heroes: readonly Combatant[], is: K): { owner: Combatant; held: HeldPassive<K> } | undefined {
  let best: { owner: Combatant; held: HeldPassive<K> } | undefined;
  for (const h of heroes) {
    if (!h.alive) continue;
    const held = passiveOf(h, is);
    if (held !== undefined && (best === undefined || held.value > best.held.value)) best = { owner: h, held };
  }
  return best;
}

const lifeFrac = (c: Combatant): number => (c.maxHp > 0 ? c.hp / c.maxHp : 1);

/** Once per tick, before anyone acts: what the party's guard passives mean for each hero right now. Written
 *  on the heroes so every damage path only has to read its own target.
 *   · Guardian — the heroes behind the front one hand a share of each hit aimed at them to the Knight.
 *   · Close Ranks — the Knight's allies take less from area blows.
 *   · Mantle — the hero with the least life takes less damage.
 *   · Overflow — healing that does not fit becomes a shield.
 *   · Shelter — an ally that has just dropped under half its life takes less damage for a while. */
export function refreshPartyGuards(heroes: readonly Combatant[]): void {
  const intercept = partyPassive(heroes, 'intercept');
  const area = partyPassive(heroes, 'areaGuard');
  const mantle = partyPassive(heroes, 'lowestGuard');
  const overflow = partyPassive(heroes, 'overhealShield');
  const shelter = partyPassive(heroes, 'allyLowGuard');
  let front: Combatant | undefined;
  let lowest: Combatant | undefined;
  for (const h of heroes) {
    if (!h.alive) continue;
    if (front === undefined || h.x > front.x) front = h;
    if (lowest === undefined || lifeFrac(h) < lifeFrac(lowest)) lowest = h;
  }
  for (const h of heroes) {
    h.divertPct = intercept !== undefined && h.alive && h !== intercept.owner && h !== front ? intercept.held.value : undefined;
    h.areaLessPct = area !== undefined && h.alive && h !== area.owner ? area.held.value : undefined;
    h.takenLessPct = mantle !== undefined && h === lowest ? mantle.held.value : undefined;
    h.overflowPct = overflow !== undefined && h.alive ? overflow.held.value : undefined;
    if (!h.alive) {
      h.sheltered = undefined;
      continue;
    }
    if (shelter === undefined || h === shelter.owner) continue;
    const low = lifeFrac(h) < shelter.held.def.hpBelow;
    if (low && h.sheltered !== true) {
      applyEffect(h.effects, effectDef(shelter.held.def.effectKey), shelter.owner.id, shelter.held.value);
    }
    h.sheltered = low ? true : undefined; // armed again once the ally is back over the line
  }
}

/** What an enemy's hit on a hero comes to after the guard passives. `dmg` is the hit after the target's own
 *  armour, block and damage reduction (before shields); `raw` is the same hit before any of those; `area` says
 *  it is an area blow (a splash, a wave-wide ability). A share diverted to the Knight (Guardian) is noted on
 *  the target as raw damage and settled by the combat loop at the end of the tick (`takeDiverted`). */
export function guardedDamage(target: Combatant, dmg: number, hit: { raw: number; area: boolean; magic: boolean }): number {
  if (target.side !== 'hero' || dmg <= 0) return dmg;
  let out = dmg;
  if (target.takenLessPct !== undefined) out *= 1 - target.takenLessPct / 100;
  if (hit.area) {
    if (target.areaLessPct !== undefined) out *= 1 - target.areaLessPct / 100;
  } else if (target.divertPct !== undefined) {
    const share = target.divertPct / 100;
    out *= 1 - share;
    if (hit.magic) target.divertedMagic = (target.divertedMagic ?? 0) + hit.raw * share;
    else target.divertedPhys = (target.divertedPhys ?? 0) + hit.raw * share;
  }
  const big = passiveOf(target, 'bigHitGuard');
  if (big !== undefined && out > target.maxHp * big.def.lifeFrac) out *= 1 - big.value / 100;
  return out;
}

/** What a tick of damage over time on a hero comes to. It is not a hit — armour, block, Guardian, Close Ranks
 *  and Endurance have nothing to act on — but everything that says "takes X % less damage" counts: the hero's
 *  damage reduction (`damageReduction`, in points: Vanguard, Stone Skin, Hold the Line, Unyielding, Shelter,
 *  Weathered Hide's stacks…, capped as for hits) and Mantle on the hero with the least life. */
export function dotTaken(target: Combatant, dot: number, damageReduction: number): number {
  let out = dot * (1 - Math.min(MAX_DAMAGE_REDUCTION, Math.max(0, damageReduction)) / 100);
  if (target.takenLessPct !== undefined) out *= 1 - target.takenLessPct / 100;
  return out;
}

/** The raw damage the heroes behind handed to the Knight this tick (physical, magic) — and clears it. */
export function takeDiverted(heroes: readonly Combatant[]): { owner: Combatant; phys: number; magic: number } | undefined {
  let phys = 0;
  let magic = 0;
  for (const h of heroes) {
    phys += h.divertedPhys ?? 0;
    magic += h.divertedMagic ?? 0;
    h.divertedPhys = undefined;
    h.divertedMagic = undefined;
  }
  if (phys <= 0 && magic <= 0) return undefined;
  const owner = partyPassive(heroes, 'intercept')?.owner;
  return owner === undefined ? undefined : { owner, phys, magic };
}

/** Weathered Hide: an enemy's basic attack has just landed on `target` — blocked or not. */
export function noteBlockStreak(target: Combatant, blocked: boolean): void {
  const streak = passiveOf(target, 'blockStreak');
  if (streak === undefined) return;
  if (blocked) {
    target.hideStacks = Math.min(streak.def.maxStacks, (target.hideStacks ?? 0) + 1);
    target.hideMisses = 0;
    return;
  }
  target.hideMisses = (target.hideMisses ?? 0) + 1;
  if (target.hideMisses >= streak.def.missesToLose) {
    target.hideStacks = 0;
    target.hideMisses = 0;
  }
}

/** Weathered Hide's damage reduction right now, in points (stacks × its figure). */
export function blockStreakReduction(c: Combatant): number {
  const stacks = c.hideStacks ?? 0;
  if (stacks <= 0) return 0;
  return stacks * (passiveOf(c, 'blockStreak')?.value ?? 0);
}

/** Hemorrhage: `source`'s critical hit has just landed on `victim` for `dmg` — it also leaves a bleed worth its
 *  share of that hit, spread over the effect's time. A new crit on an enemy already bleeding starts the time
 *  again with whichever is larger: what the new hit leaves, or what the old bleed still had to deal — so a weak
 *  crit never shortens a strong one, and bleeds do not pile up. */
export function critBleed(source: Combatant, victim: Combatant, dmg: number): void {
  const held = passiveOf(source, 'critBleed');
  if (held === undefined || dmg <= 0 || victim.hp <= 0) return;
  const def = effectDef(held.def.effectKey);
  const seconds = Math.max(0.001, def.durationMs / 1000);
  const fresh = (dmg * held.value) / 100;
  const old = victim.effects.find((e) => e.defKey === def.key && e.remainingMs > 0);
  const left = old === undefined ? 0 : (old.value * old.remainingMs) / 1000;
  applyEffect(victim.effects, def, source.id, Math.max(fresh, left) / seconds);
  victim.lastHitBy = source.id;
}

/** Pierce Through: `victim` has just been killed by `source` with `overkill` damage to spare. Returns the enemy
 *  behind it and the damage it takes (already applied), or undefined. It does not chain. */
export function overkillPierce(source: Combatant, victim: Combatant, overkill: number, enemies: readonly Combatant[]): { target: Combatant; dmg: number } | undefined {
  const pierce = passiveOf(source, 'overkillPierce');
  if (pierce === undefined || overkill <= 0) return undefined;
  let next: Combatant | undefined;
  for (const e of enemies) {
    if (!e.alive || e === victim || e.hp <= 0 || e.x < victim.x) continue;
    if (next === undefined || e.x < next.x) next = e;
  }
  if (next === undefined) return undefined;
  const dmg = (overkill * pierce.value) / 100;
  next.hp -= dmg;
  next.lastHitBy = source.id;
  return { target: next, dmg };
}

/** Overflow: `excess` healing did not fit in `target` — it becomes a shield, up to its share of the hero's life. */
export function overflowShield(target: Combatant, excess: number, heroes?: readonly Combatant[]): void {
  const pct = target.overflowPct;
  if (pct === undefined || excess <= 0 || !target.alive) return;
  const owner = heroes === undefined ? undefined : partyPassive(heroes, 'overhealShield');
  const key = owner?.held.def.effectKey ?? OVERFLOW_EFFECT;
  const cap = (target.maxHp * pct) / 100;
  const have = target.effects.find((e) => e.defKey === key && e.remainingMs > 0)?.value ?? 0;
  const value = Math.min(cap, have + excess);
  if (value <= have) return;
  applyEffect(target.effects, effectDef(key), owner?.owner.id ?? target.id, value);
}
const OVERFLOW_EFFECT = 'fx_overflow';

/** Revive: the share of the respawn time a fallen hero waits (1 = all of it). Any hero of the party holding the
 *  talent counts, standing or not — her own fall included. */
export function respawnFactor(heroes: readonly Combatant[]): number {
  let pct = 0;
  for (const h of heroes) pct = Math.max(pct, passiveOf(h, 'fasterRespawn')?.value ?? 0);
  return 1 - Math.min(90, pct) / 100;
}

/** Condemn: `caster`'s damage ability has just hit `target`. */
export function condemn(caster: Combatant, target: Combatant): void {
  const held = passiveOf(caster, 'condemn');
  if (held === undefined || !target.alive) return;
  applyEffect(target.effects, effectDef(held.def.effectKey), caster.id, held.value);
}
