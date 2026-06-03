import type { Combatant, WorldState, CombatEvent } from './world';
import type { Rng } from './rng';
import { aggregate, type EffectiveStats } from './stats';
import {
  tickEffectDurations,
  effectStatMods,
  dotDps,
  hotHps,
  absorbDamage,
  applyEffect,
  isInvulnerable,
  vulnerabilityMult,
  weakenMult,
} from './effects';
import { tickCooldowns, castReadyAbilities } from './abilities';
import { effectDef } from '@/data/effects';
import { mitigation, enrageMultiplier, MAX_DAMAGE_REDUCTION } from '@/data/stageScaling';
import { WALK_SPEED, PARTY_ENGAGE_SPEED, HERO_SPACING, MOVE_EPS, RANGE, RESPAWN_MS } from '@/data/field';

// Deterministic lane-pusher combat. The party holds a formation around `partyX`
// (which only ever increases — they walk forward); enemies advance left from the
// edge toward the front hero. Attack RANGE gates who can hit whom: melee must
// reach the front line, ranged/casters poke from afar. Pure given (world, rng).

export type { CombatEvent } from './world';

export function heroStats(c: Combatant): EffectiveStats {
  return aggregate(c.baseStats, [...c.staticMods, ...effectStatMods(c.effects)]);
}

/** Speed multiplier from a slowed enemy's effects (Frozen Trap / Chill). Enemy combat
 *  values bypass the hero stat-aggregation, so we apply the net attackSpeed% stat-mods
 *  here to BOTH the enemy's attack cadence and its movement. Floored so it can't fully
 *  freeze an enemy in place. */
function enemySpeedFactor(e: Combatant): number {
  let pct = 0;
  for (const m of effectStatMods(e.effects)) if (m.key === 'attackSpeed' && m.mode === 'percent') pct += m.value;
  return Math.max(0.1, 1 + pct / 100);
}

/** Advance combat by one tick. Mutates positions + partyX. Returns render events. */
export function resolveCombatTick(world: WorldState, deltaMs: number, rng: Rng): CombatEvent[] {
  const events: CombatEvent[] = [];
  const dtSec = deltaMs / 1000;
  const { heroes, enemies } = world;
  const S = world.globalStageIndex;

  // 1. Upkeep: effects, cooldowns, dot/hot, regen, boss enrage clock, deaths. Heroes
  //    then enemies — same order as the old [...heroes, ...enemies], minus the per-tick
  //    array allocation. The upkeep step consumes no RNG, so this is byte-identical.
  for (const c of heroes) tickCombatantUpkeep(c, world.tick, deltaMs, dtSec, events);
  for (const c of enemies) tickCombatantUpkeep(c, world.tick, deltaMs, dtSec, events);

  // 2. Formation march: a lead anchor (partyX) advances to the engage line; each
  //    hero eases to its COLUMN slot (front = slot 0, the rest trail behind). The
  //    party reorganizes into this column between waves and spawns in it. A STUNNED
  //    hero holds, so the column can shift past it (a back DPS can briefly lead).
  //    A hero that actually moves this tick can't attack on it — it must be standing
  //    still to fire (no settle delay; the instant it stops it can swing/shoot).
  const living = enemies.filter((e) => e.alive);
  const nearestEnemy = living.length > 0 ? living.reduce((lo, e) => (e.x < lo.x ? e : lo)) : undefined;
  const leadTarget = nearestEnemy !== undefined ? nearestEnemy.x - RANGE.melee : world.partyX + WALK_SPEED * dtSec;
  if (leadTarget > world.partyX) world.partyX = Math.min(leadTarget, world.partyX + PARTY_ENGAGE_SPEED * dtSec);
  // ENGAGING once the wave reaches the front line: heroes close in to fight (their
  // reach then covers the wave). Otherwise they hold a COLUMN (front = slot 0, the
  // rest trailing) — so the party reorganizes into formation between waves and
  // spawns in it. Heroes fire only on ticks they held still (no firing on the move).
  const step = PARTY_ENGAGE_SPEED * dtSec;
  // Engage: each hero advances ONLY until the nearest foe is within its own reach,
  // then holds and shoots — so a ranged hero stops the instant a foe enters range
  // (never walks into melee) while melee closes to adjacent. Between waves: reform
  // the column (slot order). A hero only fires on ticks it didn't move (see below).
  // Two same-reach heroes (e.g. two ranged/casters with equal range)
  // would target the SAME x and stack visually — so when engaging we keep the
  // back-most at full reach and pull each earlier-slot hero forward (a tad less
  // reach) to keep HERO_SPACING between them. Pulling forward stays within range,
  // so nobody loses a shot; this is purely an anti-overlap stagger.
  const foe = nearestEnemy;
  const targets = heroes.map((h, i) =>
    foe !== undefined ? foe.x - h.range : world.partyX - i * HERO_SPACING,
  );
  if (foe !== undefined) {
    const live = heroes.map((h, i) => (h.alive ? i : -1)).filter((i) => i >= 0);
    for (let k = live.length - 2; k >= 0; k--) {
      const i = live[k];
      const behind = live[k + 1];
      if (i === undefined || behind === undefined) continue;
      const ti = targets[i];
      const tb = targets[behind];
      if (ti === undefined || tb === undefined) continue;
      // Earlier slot must stand at least HERO_SPACING ahead (closer) of the one
      // behind it — but never closer than melee reach (don't walk past the foe).
      const minAhead = Math.min(tb + HERO_SPACING, foe.x - RANGE.melee);
      if (ti < minAhead) targets[i] = minAhead;
    }
  }
  heroes.forEach((h, i) => {
    if (!h.alive) return;
    const target = targets[i];
    if (target === undefined) return;
    const before = h.x;
    if (target - h.x > 0) h.x = Math.min(target, h.x + step);
    else if (foe === undefined) h.x = Math.max(target, h.x - step); // fall back to re-form between waves
    // Moved this tick → can't attack on it (must be standing still to fire). Holding
    // position (sub-px drift) doesn't count, so it doesn't stutter-stop on every kill.
    h.movedThisTick = Math.abs(h.x - before) > MOVE_EPS;
  });

  // The frontline is the frontmost living hero (the shortest-reach attacker ends up
  // here); enemies focus it, so the ranged/support behind it stay shielded.
  const frontHero = frontmostHero(heroes);

  // 3. Enemy movement: advance toward the frontline hero, stopping at attack range.
  //    Like heroes, an enemy can't attack on a tick it moved — it swings once stopped.
  if (frontHero !== undefined) {
    for (const e of living) {
      const stopX = frontHero.x + e.range;
      const gap = e.x - stopX; // distance still to close before it's in range
      const before = e.x;
      if (gap > 0) e.x = Math.max(stopX, e.x - e.moveSpeed * enemySpeedFactor(e) * dtSec);
      e.movedThisTick = Math.abs(e.x - before) > MOVE_EPS;
      // Boss enrage clock counts FIGHT time (once engaged), not the walk-up.
      if (gap <= 0) {
        e.fightMs = (e.fightMs ?? 0) + deltaMs;
        // First moment a boss is engaged → fire the party's onBossEngage ults (once).
        if (e.isBoss === true && e.bossUltTriggered !== true) {
          e.bossUltTriggered = true;
          triggerBossEngageUlts(heroes, e);
        }
      }
    }
  }

  // 4. Ability casts (heroes; enemies that have abilities). Casts push their own
  //    damage/heal events into `events`; we add a 'cast' marker per ability fired.
  for (const h of heroes) {
    if (!h.alive) continue;
    for (const key of castReadyAbilities(h, heroes, enemies, S, rng, events)) events.push({ type: 'cast', targetId: h.id, abilityKey: key });
  }
  for (const e of enemies) {
    if (!e.alive || e.abilities.length === 0) continue;
    for (const key of castReadyAbilities(e, enemies, heroes, S, rng, events)) events.push({ type: 'cast', targetId: e.id, abilityKey: key });
  }

  // 5. Attacks (range-gated).
  for (const h of heroes) {
    if (!h.alive) continue;
    const stats = heroStats(h);
    advanceAttack(h, stats.attackSpeed, deltaMs, () => {
      const target = nearestEnemyInRange(h, enemies);
      if (target === undefined) return false;
      heroAttack(h, stats, target, rng, events);
      return true;
    });
  }
  for (const e of enemies) {
    if (!e.alive) continue;
    advanceAttack(e, (e.enemyAttackSpeed ?? 0.8) * enemySpeedFactor(e), deltaMs, () => {
      if (frontHero === undefined || !frontHero.alive) return false;
      if (e.x - frontHero.x > e.range) return false; // not in range yet (still approaching)
      enemyAttack(e, frontHero, S, rng, events);
      return true;
    });
  }

  return events;
}

// Per-combatant upkeep: effect durations, cooldowns, DoT/HoT, hero regen, death. No RNG
// (so hero/enemy ordering is irrelevant to determinism). Surfaces DoT/HoT as floating
// numbers ~once a second (the per-second rate) rather than every 100ms tick.
function tickCombatantUpkeep(c: Combatant, worldTick: number, deltaMs: number, dtSec: number, events: CombatEvent[]): void {
  if (!c.alive) return;
  tickEffectDurations(c.effects, deltaMs);
  tickCooldowns(c, deltaMs);
  // Marked targets (Ranger ult) take amplified DoT ticks; an invulnerable hero takes none.
  const dot = dotDps(c.effects) * dtSec * vulnerabilityMult(c.effects);
  if (dot > 0 && !isInvulnerable(c.effects)) c.hp -= absorbDamage(c.effects, dot); // shields soak DoTs too
  const hot = hotHps(c.effects) * dtSec;
  if (hot > 0) c.hp = Math.min(c.maxHp, c.hp + hot);
  if (worldTick % 10 === 0) {
    const dps = dotDps(c.effects);
    if (dps > 0) events.push({ type: 'damage', targetId: c.id, amount: dps, tick: true });
    const hps = hotHps(c.effects);
    if (hps > 0) events.push({ type: 'heal', targetId: c.id, amount: hps, tick: true });
  }
  if (c.side === 'hero') {
    const regen = (heroStats(c).hpRegen ?? 0) * dtSec;
    if (regen > 0) c.hp = Math.min(c.maxHp, c.hp + regen);
  }
  if (c.hp <= 0) kill(c, events);
}

// The frontmost living hero (greatest x). Ties keep party order (lowest index),
// so a designated tank stacked with others still holds the line.
function frontmostHero(heroes: Combatant[]): Combatant | undefined {
  let best: Combatant | undefined;
  for (const h of heroes) {
    if (!h.alive) continue;
    if (best === undefined || h.x > best.x) best = h;
  }
  return best;
}

function nearestEnemyInRange(hero: Combatant, enemies: Combatant[]): Combatant | undefined {
  let best: Combatant | undefined;
  for (const e of enemies) {
    if (!e.alive) continue;
    if (Math.abs(e.x - hero.x) > hero.range) continue;
    if (best === undefined || e.x < best.x) best = e;
  }
  return best;
}

function advanceAttack(c: Combatant, attacksPerSec: number, deltaMs: number, doAttack: () => boolean): void {
  // The swing cooldown counts down even while closing in, so the combatant arrives
  // "loaded" and strikes the instant it stops — no dead pause after the march.
  if (c.attackTimerMs > 0) c.attackTimerMs -= deltaMs;
  if (c.movedThisTick === true) return; // ...but it can't actually swing on a tick it moved
  if (c.attackTimerMs > 0) return; // still recharging
  const fired = doAttack();
  const interval = 1000 / Math.max(0.05, attacksPerSec);
  c.attackTimerMs = fired ? interval : 0;
}

function heroAttack(h: Combatant, stats: EffectiveStats, target: Combatant, rng: Rng, events: CombatEvent[]): void {
  let dmg = stats.attackDamage * (1 + stats.damageIncrease / 100);
  const crit = rng.chance(Math.min(1, stats.critChance / 100));
  if (crit) dmg *= 1 + stats.critDamage / 100;
  dmg = Math.max(1, dmg);
  dmg *= vulnerabilityMult(target.effects); // Ranger's Mark amplifies all damage to the boss
  target.hp -= dmg;
  events.push({ type: 'damage', targetId: target.id, sourceId: h.id, amount: dmg, crit });
  const heal = (dmg * stats.lifesteal) / 100 + stats.hpPerHit;
  if (heal > 0) h.hp = Math.min(h.maxHp, h.hp + heal);
  // Bank a charge per auto-attack for any charge-gated ability the hero has equipped
  // (e.g. Aimed Shot) — so faster attacks fire it more often.
  for (const { def } of h.abilities) {
    if (def.charge === undefined) continue;
    const cur = (h.charges ??= {})[def.key] ?? 0;
    h.charges[def.key] = Math.min(def.charge.toCast, cur + def.charge.perAttack);
  }
  if (target.hp <= 0) kill(target, events);
}

function enemyAttack(e: Combatant, target: Combatant, S: number, rng: Rng, events: CombatEvent[]): void {
  // Last Stand invulnerability negates the hit entirely (before dodge/mitigation) — but
  // the enemy still SWINGS (the attack fires, deals 0): keep them visibly attacking.
  if (isInvulnerable(target.effects)) {
    events.push({ type: 'damage', targetId: target.id, sourceId: e.id, amount: 0, invuln: true });
    return;
  }
  const stats = heroStats(target);
  if (rng.chance(Math.min(0.9, stats.dodgeChance / 100))) {
    events.push({ type: 'damage', targetId: target.id, sourceId: e.id, amount: 0 });
    return;
  }
  const defense = e.enemyMagic ? stats.magicResist : stats.armor;
  const mit = mitigation(Math.max(0, defense), S);
  const enrage = e.isBoss === true ? enrageMultiplier(e.fightMs ?? 0, e.enrageMs ?? Number.POSITIVE_INFINITY) : 1;
  // weakenMult: a Debilitated enemy (Warrior's Debilitating Strike) deals less damage.
  let dmg = (e.enemyDamage ?? 1) * enrage * weakenMult(e.effects) * (1 - mit);
  const blocked = rng.chance(Math.min(1, stats.block / 100));
  if (blocked) dmg *= 0.5;
  dmg *= 1 - Math.min(MAX_DAMAGE_REDUCTION, Math.max(0, stats.damageReduction)) / 100; // flat % off (e.g. Iron Guard)
  dmg = Math.max(0, absorbDamage(target.effects, dmg)); // shields soak the hit first
  target.hp -= dmg;
  events.push({ type: 'damage', targetId: target.id, sourceId: e.id, amount: dmg, blocked });
  if (target.hp <= 0) kill(target, events);
}

function kill(c: Combatant, events: CombatEvent[]): void {
  if (!c.alive) return;
  // Warrior Last Stand: a would-be-lethal blow is cancelled (once per stage).
  if (c.side === 'hero' && tryDeathBlock(c)) return;
  c.alive = false;
  c.hp = 0;
  // A fallen hero starts a revive countdown (resolved by the Simulation each tick);
  // enemies just stay dead.
  if (c.side === 'hero') c.respawnMs = RESPAWN_MS;
  events.push({ type: 'death', targetId: c.id });
}

/** Warrior ult: intercept a lethal blow — consume a charge, leave the hero at a sliver
 *  of HP (healed) and grant brief total invulnerability. Returns true if it saved them. */
function tryDeathBlock(c: Combatant): boolean {
  const ult = c.ult;
  if (ult === undefined || ult.effect.type !== 'deathBlock') return false;
  if ((c.ultCharge ?? 0) <= 0) return false;
  if (isInvulnerable(c.effects)) return false; // already mid-Last-Stand
  c.ultCharge = (c.ultCharge ?? 0) - 1;
  c.hp = Math.max(1, c.maxHp * ult.effect.healFrac);
  applyEffect(c.effects, effectDef('fx_invuln'), c.id, 0, ult.effect.invulnMs);
  return true;
}

/** Fire the party's onBossEngage ultimates against a freshly-engaged boss (once). */
function triggerBossEngageUlts(heroes: Combatant[], boss: Combatant): void {
  for (const h of heroes) {
    if (!h.alive) continue;
    const ult = h.ult;
    if (ult === undefined) continue;
    if (ult.effect.type === 'partyEnrage') {
      for (const ally of heroes) {
        if (!ally.alive) continue;
        applyEffect(ally.effects, effectDef('buff_enrage_cdr'), h.id, ult.effect.cdrPct, ult.effect.durationMs);
        applyEffect(ally.effects, effectDef('buff_enrage_as'), h.id, ult.effect.attackSpeedPct, ult.effect.durationMs);
      }
    } else if (ult.effect.type === 'markVulnerable') {
      applyEffect(boss.effects, effectDef('fx_mark'), h.id, ult.effect.bonusDamagePct, ult.effect.durationMs);
    }
  }
}
