import type { Combatant, WorldState, CombatEvent } from './world';
import type { Rng } from './rng';
import type { EffectiveStats } from './stats';
import {
  tickEffectDurations,
  effectStatMods,
  dotDps,
  hotHps,
  absorbDamage,
  isInvulnerable,
  vulnerabilityMult,
  weakenMult,
  healReceivedMult,
  isDisarmed,
} from './effects';
import { tickCooldowns, castReadyAbilities, foesBehind, resolveChanneledCast } from './abilities';
import { dealtMult, liveStats } from './liveStats';
import { checkLowHp, onBlock, onCrit, onEffectsEnded, onEnemyDeath, onEnemyEngage, tryRescue, type TriggerCtx } from './triggers';
import { mitigation, enrageMultiplier, MAX_DAMAGE_REDUCTION } from '@/data/stageScaling';
import { foeMagicShare, mixedMitigation } from './damageMix';
import { WALK_SPEED, HERO_SPACING, MOVE_EPS, RANGE, RESPAWN_MS } from '@/data/field';
import { tryAbilityDef } from '@/data/abilities';
import { behindBack, dismissSummons, isSummon, onBossHit, shellDamage, tickBossKit } from './bossMechanics';
import { summonPrey } from './mirror';
import { noteDamageTaken, tickRecent } from './recent';
import {
  dotTaken, guardedDamage, noteBlockStreak, overflowShield, critBleed, overkillPierce, passiveOf, refreshPartyGuards, respawnFactor,
  takeDiverted,
} from './passives';
import { noteStruck } from './liveStats';
import { attackHastePct, backShotChance, cannotBeSlowed, focusedHero, foeDamageMult, foeWard, heavyHit, onFoeDeath, tickFoeTraits } from './enemyTraits';
import { pickTarget } from './targeting';
import { TRAIT_TUNING } from '@/data/enemies';

// Deterministic lane-pusher combat. The party holds a formation around `partyX`
// (which only ever increases — they walk forward); enemies advance left from the
// edge toward the front hero. Attack RANGE gates who can hit whom: melee must
// reach the front line, ranged/casters poke from afar. Pure given (world, rng).

export type { CombatEvent } from './world';

export function heroStats(c: Combatant): EffectiveStats {
  return liveStats(c);
}

/** Speed multiplier from a slowed enemy's effects (Frozen Trap / Chill). Enemy combat
 *  values bypass the hero stat-aggregation, so we apply the net attackSpeed% stat-mods
 *  here to BOTH the enemy's attack cadence and its movement. Floored so it can't fully
 *  freeze an enemy in place. */
function enemySpeedFactor(e: Combatant, attacking = false): number {
  let pct = 0;
  const unstoppable = cannotBeSlowed(e); // Imparable (a brute's trait): a slow does nothing to it
  for (const m of effectStatMods(e.effects)) if (m.key === 'attackSpeed' && m.mode === 'percent' && !(unstoppable && m.value < 0)) pct += m.value;
  if (attacking) pct += attackHastePct(e); // Rabia, Último aliento, the support's Furia: its swings only
  return Math.max(0.1, 1 + pct / 100);
}

/** Advance combat by one tick. Mutates positions + partyX. Returns render events. */
export function resolveCombatTick(world: WorldState, deltaMs: number, rng: Rng): CombatEvent[] {
  const events: CombatEvent[] = [];
  const dtSec = deltaMs / 1000;
  const { heroes, enemies } = world;
  const S = world.globalStageIndex;
  // What the talent triggers (sim/triggers.ts) see: both sides and this tick's events.
  const ctx: TriggerCtx = { heroes, enemies, events };
  // Party life regeneration (a role talent): the living heroes' shares add up, for every hero.
  let partyRegenPct = 0;
  for (const h of heroes) if (h.alive && h.partyRegenPct !== undefined) partyRegenPct += h.partyRegenPct;
  // What the party's guard passives mean for each hero this tick (sim/passives.ts).
  refreshPartyGuards(heroes);

  // 1. Upkeep: effects, cooldowns, dot/hot, regen, boss enrage clock, deaths. Heroes
  //    then enemies — same order as the old [...heroes, ...enemies], minus the per-tick
  //    array allocation. The upkeep step consumes no RNG, so this is byte-identical.
  for (const c of heroes) tickCombatantUpkeep(c, world.tick, deltaMs, dtSec, ctx, partyRegenPct);
  for (const c of enemies) tickCombatantUpkeep(c, world.tick, deltaMs, dtSec, ctx, 0);
  // The wave's traits and its support's auras (sim/enemyTraits): no rng.
  tickFoeTraits(enemies, S, deltaMs);

  // 2. Formation march: a lead anchor (partyX) advances to the engage line; each
  //    hero eases to its COLUMN slot (front = slot 0, the rest trail behind). The
  //    party reorganizes into this column between waves and spawns in it. A STUNNED
  //    hero holds, so the column can shift past it (a back DPS can briefly lead).
  //    A hero that actually moves this tick can't attack on it — it must be standing
  //    still to fire (no settle delay; the instant it stops it can swing/shoot).
  const living = enemies.filter((e) => e.alive);
  // (A boss's summons fly over the party: they are not what the column marches on.)
  const nearestEnemy = living.reduce<Combatant | undefined>((lo, e) => (isSummon(e) || (lo !== undefined && lo.x <= e.x) ? lo : e), undefined);
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
      if (isSummon(e)) continue; // a summon flies to its own place over the back line (sim/bossMechanics)
      const stopX = frontHero.x + e.range;
      const gap = e.x - stopX; // distance still to close before it's in range
      const before = e.x;
      // (A boss whose undertow has just dragged the party back holds its ground until they return: `holdMs`.)
      if (gap > 0 && e.holdMs === undefined) e.x = Math.max(stopX, e.x - e.moveSpeed * enemySpeedFactor(e) * dtSec);
      e.movedThisTick = Math.abs(e.x - before) > MOVE_EPS;
      // Boss enrage clock counts FIGHT time (once engaged), not the walk-up.
      if (gap <= 0) {
        e.fightMs = (e.fightMs ?? 0) + deltaMs;
        // First moment an enemy reaches the fight → fire the party's engage triggers (once):
        // the boss-engage ultimates, their elite versions, the wave triggers. A boss also seeds
        // its ability openers, so the kit's cadence is measured from ENGAGEMENT (not from spawn,
        // which the walk-up would otherwise eat into and bunch the openers).
        if (e.engaged !== true) {
          // The wave's first: nobody of it (dead or alive — the dead stay listed until the next
          // wave spawns) had reached the fight yet.
          const firstOfWave = !enemies.some((o) => o.engaged === true);
          e.engaged = true;
          if (e.isBoss === true) e.bossUltTriggered = true;
          onEnemyEngage(e, firstOfWave, ctx);
          if (e.isBoss === true) seedAbilityOpeners(e);
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
    if (isDisarmed(h.effects)) continue; // bound (a world boss's Roots): no attack, no cast, while it lasts
    const stats = heroStats(h);
    advanceAttack(h, stats.attackSpeed, deltaMs, () => {
      const cast = castReadyAbilities(h, heroes, enemies, S, rng, events);
      if (cast.length > 0) {
        for (const key of cast) events.push({ type: 'cast', targetId: h.id, abilityKey: key });
        // Pierce Through: an enemy its shot has just killed falls NOW, and the damage left over goes on behind.
        // (Without the talent an ability's kill is resolved by the next upkeep, as always.)
        if (passiveOf(h, 'overkillPierce') !== undefined) {
          for (const e of enemies) if (e.alive && e.hp <= 0 && e.lastHitBy === h.id) killWithPierce(h, e, enemies, ctx);
        }
        return true; // the ability used up this swing — no auto-attack this turn
      }
      // The Knight strikes the nearest enemy he can touch. The Ranger and the Priest pick by priority across their
      // shot's reach (sim/targeting) — which is longer than where they stand, so the support at the back is theirs.
      // What says she can shoot is unchanged: an enemy has come as near as she stands from it.
      const near = nearestEnemyInRange(h, enemies);
      if (near === undefined) return false;
      const target = h.shotReach !== undefined ? (pickTarget(h, enemies) ?? near) : near;
      heroAttack(h, stats, target, enemies, rng, events, heroes);
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

  // 6. Enemy attacks (range-gated). An enemy channelling an ability that holds its attack (a boss winding up
  //    its area blow) does not swing meanwhile — its swing timer simply waits.
  const focus = focusedHero(world); // Fuego concentrado: the one hero the focusing shooters loft their shots at
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.casting !== undefined && tryAbilityDef(e.casting.key)?.holdsAttack === true) continue;
    advanceAttack(e, (e.enemyAttackSpeed ?? 0.8) * enemySpeedFactor(e, true), deltaMs, () => {
      if (frontHero === undefined || !frontHero.alive) return false;
      if (e.x - frontHero.x > e.range + MOVE_EPS) return false; // not in range yet (MOVE_EPS: same anti-deadband as nearestEnemyInRange)
      const target = attackTarget(e, frontHero, heroes, rng, focus);
      enemyAttack(e, target, S, rng, ctx, target === frontHero);
      return true;
    });
  }

  // 6b. Guardian: the share of the hits aimed at the heroes behind that the Knight took on himself.
  settleDiverted(heroes, S, ctx);

  // 7. "An ally is low" triggers (a capstone's emergency heal): looked at once per tick.
  checkLowHp(ctx);

  // 8. The boss kit's clocks (sim/bossMechanics): summons, the frenzy and shell timers, who has hurt the boss most.
  tickBossKit(heroes, enemies, deltaMs, events);

  return events;
}

// Per-combatant upkeep: effect durations, cooldowns, DoT/HoT, hero regen, death. No RNG
// (so hero/enemy ordering is irrelevant to determinism). Surfaces DoT/HoT as floating
// numbers ~once a second (the per-second rate) rather than every 100ms tick.
function tickCombatantUpkeep(c: Combatant, worldTick: number, deltaMs: number, dtSec: number, ctx: TriggerCtx, partyRegenPct: number): void {
  if (!c.alive) return;
  const { events } = ctx;
  const ended = tickEffectDurations(c.effects, deltaMs);
  if (ended !== undefined) onEffectsEnded(c, ended, ctx);
  tickCooldowns(c, deltaMs);
  // Marked targets (Ranger ult) take amplified DoT ticks; an invulnerable hero takes none.
  let dot = dotDps(c.effects) * dtSec * vulnerabilityMult(c.effects);
  // Damage over time ON A HERO (a boss's venom) is not a hit — no armour, no block, nothing for Guardian, Close
  // Ranks or Endurance to act on — but "takes X % less damage" holds for it too (sim/passives.dotTaken).
  if (dot > 0 && c.side === 'hero') dot = dotTaken(c, dot, heroStats(c).damageReduction);
  if (dot > 0 && !isInvulnerable(c.effects)) {
    noteDamageTaken(c, dot); // what lands on it, shield or no shield
    const through = shellDamage(c, foeWard(c, absorbDamage(c.effects, dot), false), false); // shields soak DoTs too; so do a wave's auras and a boss's shell
    c.hp -= through;
  }
  if (c.side === 'hero') tickRecent(c, deltaMs);
  // Mortal Wound (healReduction) cuts every heal the target receives — HoT ticks + regen.
  const healMult = healReceivedMult(c.effects);
  const hot = hotHps(c.effects) * dtSec * healMult;
  if (hot > 0) {
    overflowShield(c, c.hp + hot - c.maxHp); // Overflow: a rolling heal on a full bar becomes a shield
    c.hp = Math.min(c.maxHp, c.hp + hot);
  }
  if (worldTick % 10 === 0) {
    const dps = dotDps(c.effects);
    if (dps > 0) events.push({ type: 'damage', targetId: c.id, amount: dps, tick: true });
    const hps = hotHps(c.effects) * healMult;
    if (hps > 0) events.push({ type: 'heal', targetId: c.id, amount: hps, tick: true });
  }
  if (c.side === 'hero') {
    const regen = ((heroStats(c).hpRegen ?? 0) + (c.maxHp * partyRegenPct) / 100) * dtSec * healMult;
    if (regen > 0) c.hp = Math.min(c.maxHp, c.hp + regen);
  }
  if (c.hp <= 0) kill(c, ctx);
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

/** Who an enemy's basic attack lands on: the front hero — or, for a shooter (`backShotChance`, data/enemies),
 *  a hero BEHIND it that share of the time, picked at random: the arrow flies over the tank. The reach gate
 *  stays the front hero's. With nobody behind there is no roll, so a lone hero's fight draws the same numbers
 *  as before. (The back line takes damage: docs/DIFFICULTY.md §5b.) */
function attackTarget(e: Combatant, front: Combatant, heroes: Combatant[], rng: Rng, focus?: Combatant): Combatant {
  const prey = summonPrey(e, front, heroes); // a reflection goes for the hero it is the double of
  if (prey !== undefined) return prey;
  const chance = backShotChance(e);
  if (chance <= 0) return front;
  const behind = foesBehind(front, heroes);
  if (behind.length === 0) return front;
  if (!rng.chance(chance)) return front;
  // Fuego concentrado: every focusing shooter's lofted shot lands on the same hero (no pick is drawn).
  if (focus !== undefined && focus.alive && TRAIT_TUNING.focusFire.backShotChance === chance) return focus;
  return rng.pick(behind);
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
    if (behindBack(hero, e)) continue; // a summon flying behind him: the heroes further back shoot it
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

export function heroAttack(h: Combatant, stats: EffectiveStats, target: Combatant, enemies: Combatant[], rng: Rng, events: CombatEvent[], heroes: Combatant[] = [h]): void {
  const ctx: TriggerCtx = { heroes, enemies, events };
  // One resolved hit (own crit roll) on `victim`, scaled by `mult` (1 = full; <1 = AoE splash).
  // Auto-attacks land one of these on the target, plus a capped multistrike chance for a
  // second — each hit heals lifesteal + can crit independently.
  const strike = (victim: Combatant, mult: number, multi: boolean): void => {
    let dmg = stats.attackDamage * (1 + stats.damageIncrease / 100) * mult;
    const crit = rng.chance(Math.min(1, stats.critChance / 100));
    if (crit) dmg *= 1 + stats.critDamage / 100;
    dmg = Math.max(1, dmg);
    dmg *= vulnerabilityMult(victim.effects); // Ranger's Mark amplifies all damage to the boss
    dmg *= dealtMult(h, victim, 'damage'); // role talents: more damage to the wounded / the approaching / elites and bosses
    noteStruck(h, victim); // First Blood: the next hit on it is no longer the first
    dmg = foeWard(victim, dmg, true, events); // a wave enemy's parry (Guardia) and its support's auras
    dmg = shellDamage(victim, dmg, crit); // a boss's shell (the Acorazado affix) cuts the hit and wears off with it
    dmg = Math.max(0, absorbDamage(victim.effects, dmg)); // a shield on an enemy (a boss that reflected one: Espejos) soaks it
    victim.hp -= dmg;
    victim.lastHitBy = h.id;
    events.push({ type: 'damage', targetId: victim.id, sourceId: h.id, amount: dmg, crit, multi, splash: mult < 1 ? true : undefined });
    const heal = ((dmg * stats.lifesteal) / 100) * healReceivedMult(h.effects); // Mortal Wound cuts lifesteal too
    if (heal > 0) h.hp = Math.min(h.maxHp, h.hp + heal);
    if (crit) {
      onCrit(h, victim, ctx);
      critBleed(h, victim, dmg); // Hemorrhage: her critical hits leave a bleed
    }
    if (victim.hp <= 0) killWithPierce(h, victim, enemies, ctx);
  };
  strike(target, 1, false);
  // Multistrike: a chance for a second hit this swing (already soft-capped in aggregate).
  // Gated on `> 0` first so a hero without the stat draws no RNG (keeps the combat stream
  // stable), and skipped if the first hit already downed the target. The bonus hit is tagged
  // `multi` so the render layer pops a bright "MULTI!" callout on the proc.
  const ms = Math.max(0, stats.multistrike);
  if (ms > 0 && target.alive && rng.chance(ms / 100)) strike(target, 1, true);
  // Auto-attack AoE (Priest holy strike): every OTHER enemy within `radius` of the primary
  // target takes `coeff×` the hit. Gated on `autoSplash` so single-target classes draw no
  // extra RNG (the combat stream for knight/ranger is unchanged).
  const sp = h.autoSplash;
  if (sp !== undefined) {
    for (const e of enemies) {
      if (!e.alive || e === target) continue;
      if (Math.abs(e.x - target.x) > sp.radius) continue; // outside the blast → spared
      strike(e, sp.coeff, false);
    }
  }
  // Bank a charge per auto-attack for any charge-gated ability the hero has equipped
  // (e.g. Aimed Shot) — so faster attacks fire it more often.
  for (const { def } of h.abilities) {
    if (def.charge === undefined) continue;
    const cur = (h.charges ??= {})[def.key] ?? 0;
    h.charges[def.key] = Math.min(def.charge.toCast, cur + def.charge.perAttack);
  }
  // (kills are resolved inside `strike` as each hit lands — no trailing kill needed)
}

function enemyAttack(e: Combatant, target: Combatant, S: number, rng: Rng, ctx: TriggerCtx, onFront: boolean): void {
  const { events } = ctx;
  // Last Stand invulnerability negates the hit entirely (before mitigation) — but the
  // enemy still SWINGS (the attack fires, deals 0): keep them visibly attacking.
  if (isInvulnerable(target.effects)) {
    events.push({ type: 'damage', targetId: target.id, sourceId: e.id, amount: 0, invuln: true });
    return;
  }
  const stats = heroStats(target);
  // Its hit is split into a physical and a magic part, each turned away by its own defence (sim/damageMix).
  const magic = foeMagicShare(e);
  const mit = mixedMitigation(stats.armor, stats.magicResist, magic, S);
  const enrage = e.isBoss === true ? enrageMultiplier(e.fightMs ?? 0, e.enrageMs ?? Number.POSITIVE_INFINITY, e.enrageRampMs) : 1;
  // weakenMult: a Debilitated enemy (Knight's Debilitating Cleave) deals less damage.
  // Its support's Saña; a shooter's Tiro cargado (one basic shot in four) or a beast's Embestida (its first blow).
  const heavy = heavyHit(e);
  const charged = heavy > 1;
  // A boss hits the front hero for its anchored hit (data/stageScaling zoneBossHit / stageBossHit), the rest for its own.
  const hit = onFront && e.frontHit !== undefined ? e.frontHit : (e.enemyDamage ?? 1);
  const base = hit * foeDamageMult(e) * heavy;
  let dmg = base * enrage * weakenMult(e.effects) * (1 - mit);
  const blocked = rng.chance(Math.min(1, stats.block / 100));
  if (blocked) dmg *= 0.5;
  dmg *= 1 - Math.min(MAX_DAMAGE_REDUCTION, Math.max(0, stats.damageReduction)) / 100; // flat % off (e.g. Stone Skin)
  // The guard passives: the Knight takes part of a hit aimed behind him, the most hurt hero takes less…
  dmg = guardedDamage(target, dmg, { raw: base * enrage * weakenMult(e.effects), area: false, magic });
  noteBlockStreak(target, blocked); // Weathered Hide counts the hit AFTER it was reduced by the stacks it had
  // "Being hit" is what LANDS on the hero, not what gets through: a shield soaking the blows does not make the
  // abilities that answer them (Hold the Line, Holy Shield, Stone Skin) think nobody is under attack.
  noteDamageTaken(target, dmg);
  dmg = Math.max(0, absorbDamage(target.effects, dmg)); // shields soak the hit first
  target.hp -= dmg;
  events.push({ type: 'damage', targetId: target.id, sourceId: e.id, amount: dmg, blocked, charged: charged ? true : undefined });
  if (e.isBoss === true) onBossHit(e, target, dmg, blocked, events); // its affixes: the leech, the venom
  if (blocked) onBlock(target, e, ctx); // a blocked hit feeds the block triggers (Riposte's charges…)
  if (target.hp <= 0) kill(target, ctx);
}

/** Guardian: the raw damage the heroes behind handed over this tick lands on the Knight — through his own
 *  armour (or magic resist), damage reduction and shields. Shown as a number on him, without a swing. */
function settleDiverted(heroes: Combatant[], S: number, ctx: TriggerCtx): void {
  const due = takeDiverted(heroes);
  if (due === undefined) return;
  const knight = due.owner;
  if (isInvulnerable(knight.effects)) return;
  const stats = heroStats(knight);
  let dmg = due.phys * (1 - mitigation(Math.max(0, stats.armor), S)) + due.magic * (1 - mitigation(Math.max(0, stats.magicResist), S));
  dmg *= 1 - Math.min(MAX_DAMAGE_REDUCTION, Math.max(0, stats.damageReduction)) / 100;
  noteDamageTaken(knight, dmg);
  dmg = Math.max(0, absorbDamage(knight.effects, dmg));
  if (dmg <= 0) return;
  knight.hp -= dmg;
  ctx.events.push({ type: 'damage', targetId: knight.id, amount: dmg, splash: true });
  if (knight.hp <= 0) kill(knight, ctx);
}

/** A hero's hit has just killed `victim`: Pierce Through sends a share of the damage left over into the enemy
 *  behind (which may die of it; it goes no further). */
function killWithPierce(h: Combatant, victim: Combatant, enemies: Combatant[], ctx: TriggerCtx): void {
  const overkill = -victim.hp;
  kill(victim, ctx);
  if (victim.alive) return;
  const through = overkillPierce(h, victim, overkill, enemies);
  if (through === undefined) return;
  ctx.events.push({ type: 'damage', targetId: through.target.id, sourceId: h.id, amount: through.dmg, splash: true });
  if (through.target.hp <= 0) kill(through.target, ctx);
}

function kill(c: Combatant, ctx: TriggerCtx): void {
  if (!c.alive) return;
  // A hero about to fall may be saved by a "lethal" trigger: the Knight's Last Stand (his own,
  // once per stage) or its capstone watching over an ally.
  if (c.side === 'hero' && tryRescue(c, ctx)) return;
  c.alive = false;
  c.hp = 0;
  // A fallen hero starts a revive countdown (resolved by the Simulation each tick);
  // enemies just stay dead.
  if (c.side === 'hero') {
    c.respawnMs = RESPAWN_MS * respawnFactor(ctx.heroes); // Revive: back sooner
    c.respawnTotalMs = c.respawnMs;
  }
  ctx.events.push({ type: 'death', targetId: c.id });
  if (c.side === 'enemy') onEnemyDeath(c, ctx); // the kill and "its bearer died" triggers
  if (c.side === 'enemy' && c.enemyRole !== undefined) onFoeDeath(c, ctx.enemies, ctx.events); // Último aliento; a support's auras end
  if (c.isBoss === true) dismissSummons(ctx.enemies, ctx.events); // what a boss summoned goes with it
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
