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
  healReceivedMult,
} from './effects';
import { tickCooldowns, castReadyAbilities, resolveChanneledCast } from './abilities';
import { effectDef } from '@/data/effects';
import { mitigation, enrageMultiplier, MAX_DAMAGE_REDUCTION } from '@/data/stageScaling';
import { WALK_SPEED, HERO_SPACING, MOVE_EPS, RANGE, RESPAWN_MS } from '@/data/field';

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
  if (leadTarget > world.partyX) world.partyX = Math.min(leadTarget, world.partyX + WALK_SPEED * dtSec);
  // ENGAGING once the wave reaches the front line: heroes close in to fight (their
  // reach then covers the wave). Otherwise they hold a COLUMN (front = slot 0, the
  // rest trailing) — so the party reorganizes into formation between waves and
  // spawns in it. Heroes fire only on ticks they held still (no firing on the move).
  const step = WALK_SPEED * dtSec;
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
    const d = target - h.x;
    if (d > MOVE_EPS) {
      // Wants to chase FORWARD. Ranged/caster heroes first sit out a brief, varied delay
      // (rolled on the stop→go transition) before resuming, so the back line desyncs and
      // shuffles instead of marching in lockstep behind the knight. Melee leads immediately.
      if (h.range >= RANGE.ranged) {
        if (h.moveDelayMs === undefined) h.moveDelayMs = resumeDelayMs(h.id, world.tick);
        h.moveDelayMs -= deltaMs;
        if (h.moveDelayMs <= 0) h.x = Math.min(target, h.x + step);
      } else {
        h.x = Math.min(target, h.x + step);
      }
    } else {
      if (d < -MOVE_EPS && foe === undefined) h.x = Math.max(target, h.x - step); // reform between waves
      h.moveDelayMs = undefined; // at the target → clear so the next stop→go rolls a fresh delay
    }
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
        // First moment a boss is engaged → fire the party's onBossEngage ults (once) and
        // seed its ability openers, so the kit's cadence is measured from ENGAGEMENT (not
        // from spawn, which the walk-up would otherwise eat into and bunch the openers).
        if (e.isBoss === true && e.bossUltTriggered !== true) {
          e.bossUltTriggered = true;
          triggerBossEngageUlts(heroes, e, events);
          seedAbilityOpeners(e);
        }
      }
    }
  }

  // 4. Hero actions — bound to the SWING timer: when a hero is ready to swing (standing
  //    still, attack timer elapsed), it takes ONE action. An ability takes precedence over
  //    the auto-attack: if a ready ability's conditions are met it's cast INSTEAD of swinging
  //    (using up the swing), otherwise the hero auto-attacks. Either way the swing timer
  //    resets, so each swing is exactly one action. castReadyAbilities casts at most ONE
  //    ability for a hero, so two ready abilities can't share a swing — the second waits for
  //    the next one (each ability's OWN cooldown still governs how often it's ready). The
  //    cast pushes its own damage/heal events; we add a 'cast' marker.
  for (const h of heroes) {
    if (!h.alive) continue;
    const stats = heroStats(h);
    advanceAttack(h, stats.attackSpeed, deltaMs, () => {
      const cast = castReadyAbilities(h, heroes, enemies, S, rng, events);
      if (cast.length > 0) {
        for (const key of cast) events.push({ type: 'cast', targetId: h.id, abilityKey: key });
        return true; // the ability used up this swing — no auto-attack this turn
      }
      const target = nearestEnemyInRange(h, enemies);
      if (target === undefined) return false;
      heroAttack(h, stats, target, rng, events);
      return true;
    });
  }

  // 5. Enemy ability casts (their cadence is independent of their swing). A boss mid-channel
  //    (Frenzy / Mortal Wound) winds up its cast bar here and resolves when it fills, instead
  //    of starting anything new; everyone else fires every ready ability as before.
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.casting !== undefined) {
      e.casting.remainingMs -= deltaMs;
      if (e.casting.remainingMs <= 0) {
        const key = resolveChanneledCast(e, enemies, heroes, S, rng, events);
        if (key !== null) events.push({ type: 'cast', targetId: e.id, abilityKey: key });
      }
      continue; // channeling → starts no new cast this tick
    }
    if (e.abilities.length === 0) continue;
    for (const key of castReadyAbilities(e, enemies, heroes, S, rng, events)) events.push({ type: 'cast', targetId: e.id, abilityKey: key });
  }

  // 6. Enemy attacks (range-gated).
  for (const e of enemies) {
    if (!e.alive) continue;
    advanceAttack(e, (e.enemyAttackSpeed ?? 0.8) * enemySpeedFactor(e), deltaMs, () => {
      if (frontHero === undefined || !frontHero.alive) return false;
      if (e.x - frontHero.x > e.range + MOVE_EPS) return false; // not in range yet (MOVE_EPS: same anti-deadband as nearestEnemyInRange)
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
  // Mortal Wound (healReduction) cuts every heal the target receives — HoT ticks + regen.
  const healMult = healReceivedMult(c.effects);
  const hot = hotHps(c.effects) * dtSec * healMult;
  if (hot > 0) c.hp = Math.min(c.maxHp, c.hp + hot);
  if (worldTick % 10 === 0) {
    const dps = dotDps(c.effects);
    if (dps > 0) events.push({ type: 'damage', targetId: c.id, amount: dps, tick: true });
    const hps = hotHps(c.effects) * healMult;
    if (hps > 0) events.push({ type: 'heal', targetId: c.id, amount: hps, tick: true });
  }
  if (c.side === 'hero') {
    const regen = (heroStats(c).hpRegen ?? 0) * dtSec * healMult;
    if (regen > 0) c.hp = Math.min(c.maxHp, c.hp + regen);
  }
  if (c.hp <= 0) kill(c, events);
}

// A brief, varied hold (ms) before a ranged/caster hero resumes a forward chase. Derived
// DETERMINISTICALLY from the hero id + tick via an FNV-1a hash — it consumes NO combat rng,
// so the loot/crit stream is byte-identical; only the back line's pacing changes. Window
// ≈ 100–500ms, so the rear heroes desync and shuffle rather than marching as one unit.
const RESUME_DELAY_MIN_MS = 100;
const RESUME_DELAY_SPAN_MS = 400;
function resumeDelayMs(id: string, tick: number): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  h = (Math.imul(h ^ tick, 16777619) >>> 0) % 1000;
  return RESUME_DELAY_MIN_MS + (h / 1000) * RESUME_DELAY_SPAN_MS;
}

/** World x of the party's frontline (the frontmost living hero — the tank holding the
 *  line), falling back to the lead anchor when everyone is down. Wave spawns are placed a
 *  fixed distance ahead of THIS, so a wave always lands in front of the party. */
export function frontlineX(world: WorldState): number {
  return frontmostHero(world.heroes)?.x ?? world.partyX;
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
    // Tolerate MOVE_EPS: the engage step parks a hero within MOVE_EPS of `foe.x - range`
    // (it stops chasing once `d <= MOVE_EPS`), so a strict `> range` check left a dead band
    // [range, range+MOVE_EPS] where the hero had "arrived" yet couldn't hit — the last,
    // longer-reach straggler of a wave would sit just outside melee forever and DEADLOCK
    // the run (no kill, no progress). Matching the attack tolerance to the move tolerance
    // closes it.
    if (Math.abs(e.x - hero.x) > hero.range + MOVE_EPS) continue;
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
  // One resolved hit (own crit roll). Auto-attacks land one of these, plus a capped
  // multistrike chance for a second — each hit heals lifesteal + can crit independently.
  const strike = (): void => {
    let dmg = stats.attackDamage * (1 + stats.damageIncrease / 100);
    const crit = rng.chance(Math.min(1, stats.critChance / 100));
    if (crit) dmg *= 1 + stats.critDamage / 100;
    dmg = Math.max(1, dmg);
    dmg *= vulnerabilityMult(target.effects); // Ranger's Mark amplifies all damage to the boss
    target.hp -= dmg;
    events.push({ type: 'damage', targetId: target.id, sourceId: h.id, amount: dmg, crit });
    const heal = ((dmg * stats.lifesteal) / 100) * healReceivedMult(h.effects); // Mortal Wound cuts lifesteal too
    if (heal > 0) h.hp = Math.min(h.maxHp, h.hp + heal);
  };
  strike();
  // Multistrike: a chance for a second hit this swing (already soft-capped in aggregate).
  // Gated on `> 0` first so a hero without the stat draws no RNG (keeps the combat stream
  // stable), and skipped if the first hit already downed the target.
  const ms = Math.max(0, stats.multistrike);
  if (ms > 0 && target.hp > 0 && rng.chance(ms / 100)) strike();
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
  // Last Stand invulnerability negates the hit entirely (before mitigation) — but the
  // enemy still SWINGS (the attack fires, deals 0): keep them visibly attacking.
  if (isInvulnerable(target.effects)) {
    events.push({ type: 'damage', targetId: target.id, sourceId: e.id, amount: 0, invuln: true });
    return;
  }
  const stats = heroStats(target);
  const defense = e.enemyMagic ? stats.magicResist : stats.armor;
  const mit = mitigation(Math.max(0, defense), S);
  const enrage = e.isBoss === true ? enrageMultiplier(e.fightMs ?? 0, e.enrageMs ?? Number.POSITIVE_INFINITY) : 1;
  // weakenMult: a Debilitated enemy (Knight's Debilitating Strike) deals less damage.
  let dmg = (e.enemyDamage ?? 1) * enrage * weakenMult(e.effects) * (1 - mit);
  const blocked = rng.chance(Math.min(1, stats.block / 100));
  if (blocked) dmg *= 0.5;
  dmg *= 1 - Math.min(MAX_DAMAGE_REDUCTION, Math.max(0, stats.damageReduction)) / 100; // flat % off (e.g. Stone Skin)
  dmg = Math.max(0, absorbDamage(target.effects, dmg)); // shields soak the hit first
  target.hp -= dmg;
  events.push({ type: 'damage', targetId: target.id, sourceId: e.id, amount: dmg, blocked });
  if (target.hp <= 0) kill(target, events);
}

function kill(c: Combatant, events: CombatEvent[]): void {
  if (!c.alive) return;
  // Knight Last Stand: a would-be-lethal blow is cancelled (once per stage).
  if (c.side === 'hero' && tryDeathBlock(c)) return;
  c.alive = false;
  c.hp = 0;
  // A fallen hero starts a revive countdown (resolved by the Simulation each tick);
  // enemies just stay dead.
  if (c.side === 'hero') c.respawnMs = RESPAWN_MS;
  events.push({ type: 'death', targetId: c.id });
}

/** Knight ult: intercept a lethal blow — consume a charge, leave the hero at a sliver
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

/** Seed a freshly-engaged boss's ability openers: an ability with `openerMs` starts on that
 *  initial cooldown so its first cast is offset (the kit staggers instead of all firing at
 *  once on engage). Abilities without an opener stay ready. */
function seedAbilityOpeners(e: Combatant): void {
  for (const { def } of e.abilities) {
    const op = def.openerMs;
    if (op === undefined || op <= 0) continue;
    e.cooldowns[def.key] = op;
    (e.cooldownTotals ??= {})[def.key] = op;
  }
}

/** Fire the party's onBossEngage ultimates against a freshly-engaged boss (once). Pushes a
 *  render-only 'cast' marker for the ranger's mark so the strip can fly its crosshair in. */
function triggerBossEngageUlts(heroes: Combatant[], boss: Combatant, events: CombatEvent[]): void {
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
      // targetId = the ranger (crosshair origin), sourceId = the boss it locks onto.
      events.push({ type: 'cast', targetId: h.id, sourceId: boss.id, abilityKey: 'ranger_mark' });
    }
  }
}
