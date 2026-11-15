import { effectDef } from '@/data/effects';
import { WALK_SPEED } from '@/data/field';
import { absorbDamage, applyEffect, isInvulnerable } from './effects';
import { liveStats } from './liveStats';
import { dotTaken } from './passives';
import { noteDamageTaken } from './recent';
import type { Combatant, CombatEvent } from './world';

// Rules of the world bosses' own mechanics that are not plain effects (data/bossKit.ts MECHANIC holds every
// number; sim/bossMechanics.ts calls these): Culpa's toll, Resaca's drag, the layers of Esporas, the burning
// ground of Hoja al rojo, the levelling of Balanza. (Espejos is sim/mirror.ts.) Pure and deterministic; no rng.

// ── A toll: damage that is not a hit ────────────────────────────────────────────────────────────────────────

/** How often a toll is shown as a number on the hero (ms). */
const TOLL_SHOWN_EVERY_MS = 500;

/** `amount` of damage that is NOT a hit and that nobody aimed lands on `h` (Culpa's toll, the burning ground):
 *  no armour, no block, nothing for Guardian, Close Ranks or Endurance to act on. "Takes X % less damage" counts
 *  (the damage-reduction stat, Mantle — passives.dotTaken), shields soak it, an invulnerable hero pays nothing,
 *  and it counts as being under attack for the abilities that react. What got through is added to the tally the
 *  strip shows under `abilityKey`. A hero it brings to nothing falls at the next upkeep, like one a poison ends. */
function takeToll(h: Combatant, amount: number, abilityKey: string): void {
  if (amount <= 0 || isInvulnerable(h.effects)) return;
  const toll = dotTaken(h, amount, liveStats(h).damageReduction);
  noteDamageTaken(h, toll);
  const through = Math.max(0, absorbDamage(h.effects, toll));
  h.hp -= through;
  const tally = ((h.tolls ??= {})[abilityKey] ??= { dmg: 0, ms: 0 });
  tally.dmg += through;
}

/** Advance the tallies of `abilityKey` on every hero: a number every TOLL_SHOWN_EVERY_MS while `active(h)`, and
 *  what was left when it stops. */
function showTolls(heroes: readonly Combatant[], abilityKey: string, deltaMs: number, active: (h: Combatant) => boolean, events: CombatEvent[]): void {
  for (const h of heroes) {
    const tally = h.tolls?.[abilityKey];
    if (tally === undefined) continue;
    tally.ms += deltaMs;
    const on = h.alive && active(h);
    if (on && tally.ms < TOLL_SHOWN_EVERY_MS) continue;
    if (tally.dmg > 0) events.push({ type: 'damage', targetId: h.id, amount: tally.dmg, tick: true, abilityKey });
    if (on) h.tolls = { ...h.tolls, [abilityKey]: { dmg: 0, ms: 0 } };
    else if (h.tolls !== undefined) {
      const rest = { ...h.tolls };
      delete rest[abilityKey];
      h.tolls = Object.keys(rest).length > 0 ? rest : undefined;
    }
  }
}

// ── Culpa (the Scapegoat) ───────────────────────────────────────────────────────────────────────────────────

/** The ability key the numbers of Culpa's toll carry (the strip colours them and plays its pang). */
export const GUILT_ABILITY = 'boss_guilt';

const guiltMark = (h: Combatant): { value: number } | undefined =>
  h.alive ? h.effects.find((e) => e.remainingMs > 0 && effectDef(e.defKey).kind.type === 'guilt') : undefined;

/** One tick of Culpa: every marked hero pays, in shares of his own life, for the share of ITS life the boss lost
 *  since the last tick — to anyone and anything (hits, abilities, damage over time). */
export function tickGuilt(boss: Combatant, heroes: readonly Combatant[], deltaMs: number, events: CombatEvent[]): void {
  const seen = boss.hpSeen;
  boss.hpSeen = Math.max(0, boss.hp);
  const lostPct = seen === undefined || boss.maxHp <= 0 ? 0 : (Math.max(0, seen - boss.hpSeen) / boss.maxHp) * 100;
  for (const h of heroes) {
    const mark = guiltMark(h);
    if (mark === undefined) continue;
    (h.tolls ??= {})[GUILT_ABILITY] ??= { dmg: 0, ms: 0 };
    takeToll(h, (lostPct * mark.value * h.maxHp) / 100, GUILT_ABILITY);
  }
  showTolls(heroes, GUILT_ABILITY, deltaMs, (h) => guiltMark(h) !== undefined, events);
}

// ── Resaca (the Ninth Wave) ─────────────────────────────────────────────────────────────────────────────────

/** How long a boss holds its ground after dragging the party `dragPx` back: the walk back, and the moment the
 *  heroes at the back take to set off again (combat's resume delay, at most half a second). */
const UNDERTOW_HOLD_EXTRA_MS = 600;

/** Resaca: every living hero is dragged `dragPx` back along the path, and what he was winding up is broken off —
 *  his swing starts over (an ability he would have cast with it was never cast: its cooldown is not spent, and he
 *  tries again with his next swing). They walk back on their own — nobody attacks or casts on the move — and the
 *  boss stands where it is meanwhile, so the fight does not creep. */
export function dragParty(caster: Combatant, heroes: readonly Combatant[], dragPx: number): void {
  if (dragPx <= 0) return;
  for (const h of heroes) {
    if (!h.alive) continue;
    h.x -= dragPx;
    h.attackTimerMs = Math.max(h.attackTimerMs, 1000 / Math.max(0.05, liveStats(h).attackSpeed));
  }
  caster.holdMs = (dragPx / WALK_SPEED) * 1000 + UNDERTOW_HOLD_EXTRA_MS;
}

// ── Esporas (the Destroying Angel) ──────────────────────────────────────────────────────────────────────────

/** Esporas: one more layer of `effectKey` on every living hero, each layer `pctPerLayer` % of HIS life a second
 *  (up to the effect's maxStacks; every cloud renews them all). They are damage over time like a poison; a direct
 *  heal clears a hero's (the effect's `healCleansed`: sim/abilities), and so does a cleanse. */
export function layerSpores(caster: Combatant, heroes: readonly Combatant[], effectKey: string, pctPerLayer: number): void {
  const def = effectDef(effectKey);
  for (const h of heroes) if (h.alive) applyEffect(h.effects, def, caster.id, (h.maxHp * pctPerLayer) / 100);
}

// ── Hoja al rojo (the Quench) ───────────────────────────────────────────────────────────────────────────────

/** The ability key the numbers of the burning ground carry. */
export const GROUND_FIRE_ABILITY = 'boss_red_blade';

/** Hoja al rojo: the ground under the party catches for `burnMs`; each hero standing on it takes `totalOfHit` of
 *  the boss's hit over that time. It is the ground that burns — nothing is laid on the heroes, so there is
 *  nothing for a cleanse to lift. A new one over an old one starts the time again. */
export function igniteGround(caster: Combatant, burnMs: number, totalOfHit: number): void {
  if (burnMs <= 0) return;
  caster.groundFire = { leftMs: burnMs, dps: ((caster.enemyDamage ?? 0) * totalOfHit) / (burnMs / 1000) };
}

/** One tick of the burning ground: a toll on every living hero (see takeToll) for as long as it burns. */
export function tickGroundFire(boss: Combatant, heroes: readonly Combatant[], deltaMs: number, events: CombatEvent[]): void {
  const fire = boss.groundFire;
  if (fire !== undefined) {
    const ms = Math.min(deltaMs, fire.leftMs);
    for (const h of heroes) {
      if (!h.alive) continue;
      (h.tolls ??= {})[GROUND_FIRE_ABILITY] ??= { dmg: 0, ms: 0 };
      takeToll(h, (fire.dps * ms) / 1000, GROUND_FIRE_ABILITY);
    }
    boss.groundFire = fire.leftMs > deltaMs ? { leftMs: fire.leftMs - deltaMs, dps: fire.dps } : undefined;
  }
  showTolls(heroes, GROUND_FIRE_ABILITY, deltaMs, () => boss.groundFire !== undefined, events);
}

// ── Balanza (the Verdict) ───────────────────────────────────────────────────────────────────────────────────

/** Balanza: every living hero drops to the SHARE of life of the one who has least. Life is taken, not damage
 *  dealt: no armour, no reduction, no shield stands in the way, and no guard passive has anything to act on. A
 *  hero who is invulnerable (Last Stand) keeps his; a hero alone has nobody to be levelled with. Each one that
 *  lost life gets a number (`abilityKey`) and counts as having been hit. */
export function levelParty(caster: Combatant, heroes: readonly Combatant[], abilityKey: string, events: CombatEvent[]): void {
  const living = heroes.filter((h) => h.alive && h.maxHp > 0);
  if (living.length < 2) return;
  let low = 1;
  for (const h of living) low = Math.min(low, Math.max(0, h.hp) / h.maxHp);
  for (const h of living) {
    const lost = h.hp - low * h.maxHp;
    if (lost <= 0 || isInvulnerable(h.effects)) continue;
    h.hp -= lost;
    noteDamageTaken(h, lost);
    events.push({ type: 'damage', targetId: h.id, sourceId: caster.id, amount: lost, abilityKey });
  }
}
