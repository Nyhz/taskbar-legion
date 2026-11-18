import { cadenceHitMult } from '@/data/cadence';
import type { AbilityDef, AbilityPower, AbilityTarget, AppliedEffect, FireRule } from '@/data/abilities';
import { worldBossAbilityKeys } from '@/data/abilities';
import { HERO_GLOBAL_COOLDOWN_MS } from '@/data/casting';
import type { EffectDef } from '@/data/effects';
import { effectDef } from '@/data/effects';
import type { Combatant, CombatEvent } from './world';
import type { ResolvedAbility } from './loadout';
import type { Rng } from './rng';
import type { EffectiveStats } from './stats';
import { applyEffect, absorbDamage, hotStillToCome, liftHealCleansed, isCooldownFrozen, isSilenced, isInvulnerable, vulnerabilityMult, weakenMult, healReceivedMult } from './effects';
import { noteStruck, dealtMult, liveStats } from './liveStats';
import { onCrit, type TriggerCtx } from './triggers';
import { noteDamageTaken, recentlyHit, recentlyHitHard } from './recent';
import { condemn, critBleed, guardedDamage, healInfusion, overflowShield } from './passives';
import { behindBack, onWorldBlow, resolveSpecial, shellDamage } from './bossMechanics';
import { afterMirror, reflection, specialReady } from './mirror';
import { foeDamageMult, foeWard } from './enemyTraits';
import { biggestCluster, pickTarget } from './targeting';
import { classDef } from '@/data/classes';
import { enrageMultiplier, MAX_DAMAGE_REDUCTION } from '@/data/stageScaling';
import { foeMagicShare, mixedMitigation } from './damageMix';
import { healPowerEffectiveness } from '@/data/difficulties';
import { HEAL_CLEANSE_COUNT, HEAL_URGENT_FRAC } from '@/data/healing';
import { steadyRoll } from './steady';

// Cooldown tracking + AI cast logic. Abilities apply declarative effects; power
// effects (damage/heal/shield/dot/hot) scale off the caster/target stats, stat
// buffs/debuffs off the effect def + rankScaling. Generic: a new ability is data.

const ALLY_HELP_THRESHOLD = 0.7; // 'allyBelowHpPct' triggers below 70% HP
const MAX_CDR = 75; // cap cooldown reduction so abilities can't go free

export function tickCooldowns(c: Combatant, deltaMs: number): void {
  // The global cooldown runs whatever happens to the others (a boss's Silencio dorado freezes those, not this).
  if (c.gcdMs !== undefined && c.gcdMs > 0) c.gcdMs = Math.max(0, c.gcdMs - deltaMs);
  const keys = Object.keys(c.cooldowns);
  if (keys.length === 0) return;
  if (isCooldownFrozen(c.effects)) return; // Silencio dorado (a world boss's mechanic): they stand still
  // CDR applies DYNAMICALLY: cooldowns store their BASE duration (no CDR baked in), and we
  // drain them faster the higher the caster's CURRENT cooldown reduction. So a CDR buff
  // gained mid-cooldown shortens the remaining wait, and losing it returns the drain to
  // normal speed — instead of CDR only mattering at the instant of casting.
  let cdr = -1; // resolved lazily on the first active cooldown (skips the cost when idle)
  for (const key of keys) {
    const v = c.cooldowns[key];
    if (v === undefined || v <= 0) continue;
    if (cdr < 0) cdr = Math.min(MAX_CDR, Math.max(0, casterStats(c).cooldownReduction));
    const total = c.cooldownTotals?.[key] ?? v; // base cooldown this cast started from
    const effectiveTotal = Math.max(500, total * (1 - cdr / 100));
    const speed = total / effectiveTotal; // ≥ 1: more CDR ⇒ faster drain
    c.cooldowns[key] = Math.max(0, v - deltaMs * speed);
  }
}


/** The world bosses' own area blows (Ground Slam / Shockwave): the blows whose splash is anchored from Inferno (round 8). */
const WORLD_BLOW_KEYS: ReadonlySet<string> = new Set(worldBossAbilityKeys());
/** Effective stats of any combatant (for scaling ability magnitudes/cooldowns). */
function casterStats(c: Combatant): EffectiveStats {
  return liveStats(c);
}

/** A caster's basic-attack damage — the unit every damaging ability is denominated
 *  in (a `coeff` of 1.0 == "one normal attack"). Heroes derive it from attackDamage
 *  (boosted by damageIncrease); enemies use their precomputed, stage-scaled
 *  `enemyDamage`. This is what lets enemy abilities scale through the SAME path as
 *  hero abilities (enemies carry no attackDamage stat). */
export function normalAttackDamage(caster: Combatant, cs: EffectiveStats): number {
  if (caster.side === 'enemy') return (caster.enemyDamage ?? 0) * foeDamageMult(caster); // its support's Saña
  // A hero's normal attack carries his speed past the cadence curve (data/cadence, round 12): an ability that takes his
  // swing and hits for a multiple of his attack keeps its worth against the (bigger, fewer) swing it replaces.
  return cs.attackDamage * (1 + cs.damageIncrease / 100) * cadenceHitMult(caster.classKey, cs.attackSpeed);
}

/** The power an applied effect resolves against: its own, or the ability's. */
export function powerOf(ability: AbilityDef, applied: AppliedEffect): AbilityPower | undefined {
  return applied.power ?? ability.power;
}

/** The effect's coefficient at a rank: (coeff + per-rank growth) × the share of it this effect takes. */
export function effectCoeff(ability: AbilityDef, applied: AppliedEffect, steps: number): number | undefined {
  const p = powerOf(ability, applied);
  if (p === undefined) return undefined;
  return (p.coeff + (p.coeffPerRank ?? 0) * steps) * (applied.powerScale ?? 1);
}

/** Resolve the magnitude of one applied effect for the ability at a given rank.
 *  Power effects scale with stats; stat/CC effects use base value + rankScaling.
 *  Damage/DoT are a multiple of the caster's normal attack (DoT = TOTAL over its
 *  duration, divided into per-second in applyToTarget). Heal/HoT/Shield are a
 *  fraction of the target's max HP (HoT = TOTAL over its duration). Each effect resolves
 *  against its OWN power when it has one, else the ability's (docs/redesign/CLASSES.md, F3). */
export function effectMagnitude(ability: AbilityDef, applied: AppliedEffect, def: EffectDef, rank: number, cs: EffectiveStats, target: Combatant, caster: Combatant, coeffOverride?: number, healEff = 1): number {
  const steps = Math.max(0, rank - 1);
  const t = def.kind.type;
  if (t === 'damage' || t === 'dot') {
    const coeff = coeffOverride ?? effectCoeff(ability, applied, steps);
    if (coeff === undefined) return 0;
    // A boss's blow on the front hero (its main hit, not the splash) carries its anchored front hit (round 6).
    if (t === 'damage' && coeffOverride === undefined && ability.target === 'frontEnemy' && caster.frontHit !== undefined) {
      return coeff * caster.frontHit * foeDamageMult(caster);
    }
    // …and its area blow on the heroes behind, from Inferno, its anchored back-line splash (round 8).
    if (t === 'damage' && coeffOverride !== undefined && caster.backSplash !== undefined && WORLD_BLOW_KEYS.has(ability.key)) {
      return caster.backSplash * foeDamageMult(caster);
    }
    return coeff * normalAttackDamage(caster, cs);
  }
  if (t === 'heal' || t === 'hot' || t === 'shield') {
    const coeff = effectCoeff(ability, applied, steps);
    if (coeff === undefined) return 0;
    // healPower's benefit is scaled by the difficulty's heal-power effectiveness (the zone
    // debuff) — the base coeff floor is untouched, only the healPower amplification diminishes.
    return coeff * target.maxHp * (1 + (cs.healPower * healEff) / 100);
  }
  // statMod / weaken / vulnerable / healReduction / silence / root / tag: base value + per-rank.
  // The base is the applied effect's own `value` when it states one (a vulnerability has no value
  // on its def), else the effect def's. A per-effect `valuePerRank` wins over the ability-wide
  // rankScaling.
  const base =
    applied.value ??
    (def.kind.type === 'statMod' || def.kind.type === 'weaken' || def.kind.type === 'healReduction'
      ? def.kind.value
      : 0);
  const perRank = applied.valuePerRank ?? ability.rankScaling?.perRank.value ?? 0;
  return base + perRank * steps;
}

export function effectDuration(ability: AbilityDef, def: EffectDef, rank: number, override?: number): number {
  const steps = Math.max(0, rank - 1);
  return (override ?? def.durationMs) + (ability.rankScaling?.perRank.durationMs ?? 0) * steps;
}

/** The ability's rank-adjusted base cooldown (ms), BEFORE cooldown reduction. CDR is applied
 *  dynamically as the cooldown ticks (tickCooldowns), not baked in here at cast time. */
function baseCooldownMs(ability: AbilityDef, rank: number): number {
  const steps = Math.max(0, rank - 1);
  return Math.max(500, ability.cooldownMs + (ability.rankScaling?.perRank.cooldownMs ?? 0) * steps);
}

/** Cooldown a cast WOULD take at the caster's current CDR — for tooltips/UI display only.
 *  In combat the real drain is dynamic (see tickCooldowns), so a CDR buff applied after the
 *  cast still shortens the remaining cooldown. */
function effectiveCooldown(ability: AbilityDef, rank: number, cs: EffectiveStats): number {
  const cdr = Math.min(MAX_CDR, Math.max(0, cs.cooldownReduction));
  return Math.max(500, baseCooldownMs(ability, rank) * (1 - cdr / 100));
}

/** A combatant's class role (tank/dps/healer/support), if it has a class. */
function roleOf(c: Combatant): string | undefined {
  return c.classKey !== undefined ? classDef(c.classKey).role : undefined;
}

/** Frontmost (greatest-x) living ally, optionally matching a predicate. */
function frontmostAlly(allies: Combatant[], pred?: (c: Combatant) => boolean): Combatant | undefined {
  let best: Combatant | undefined;
  for (const a of allies) {
    if (!a.alive || (pred !== undefined && !pred(a))) continue;
    if (best === undefined || a.x > best.x) best = a;
  }
  return best;
}

/** The party's tank: the frontmost tank-role ally, else just the frontmost ally (the
 *  de-facto tank — whoever holds the line). */
function findTank(allies: Combatant[]): Combatant | undefined {
  return frontmostAlly(allies, (a) => roleOf(a) === 'tank') ?? frontmostAlly(allies);
}

/** Whether an ability is an enemy's telegraphed AREA blow: it winds up (a cast bar) and its splash reaches the
 *  whole party (the bosses' Ground Slam / Shockwave). */
export function isAreaBlow(ability: AbilityDef): boolean {
  return (ability.castTimeMs ?? 0) > 0 && ability.power?.splashCoeff !== undefined;
}

/** The targets that pick ONE ally (a heal, a shield on whoever needs it): braced against a boss's blow they land on
 *  the hero it will strike instead. */
const ONE_ALLY_TARGETS: ReadonlySet<AbilityTarget> = new Set<AbilityTarget>(['hurtAlly', 'triageAlly', 'mostHitAlly', 'lowestAllyHp', 'harmedAlly', 'tank']);

/** A boss of the fight — a living boss among `enemies` (from a hero's side). */
function bossOf(enemies: readonly Combatant[]): Combatant | undefined {
  return enemies.find((e) => e.alive && e.isBoss === true);
}

/** A blow: an enemy ability with a cast bar that ends in damage on the party. */
function isBlow(def: AbilityDef): boolean {
  return (def.castTimeMs ?? 0) > 0 && (def.power !== undefined || def.special?.kind === 'crush');
}

/** Whether a boss is winding up a blow on the party right now — its HEAVY blow when `heavy` (or any blow when it
 *  wields no heavy one). A blow: an ability with a cast bar that ends in damage on the party. */
export function bossWindingUp(enemies: readonly Combatant[], heavy: boolean): boolean {
  for (const e of enemies) {
    if (!e.alive || e.isBoss !== true || e.casting === undefined) continue;
    const key = e.casting.key;
    const def = e.abilities.find((a) => a.def.key === key)?.def;
    if (def === undefined || !isBlow(def)) continue;
    if (!heavy || def.heavy === true || !e.abilities.some((a) => a.def.heavy === true)) return true;
  }
  return false;
}

const lifeFrac = (c: Combatant): number => (c.maxHp > 0 ? c.hp / c.maxHp : 1);
const tough = (c: Combatant): boolean => c.isElite === true || c.isBoss === true;

/** A harmful effect a heal lifts: not one too slight to cleanse (data/effects `cleanseIgnores`: Temblor). */
function cleansable(defKey: string): boolean {
  const def = effectDef(defKey);
  return !def.beneficial && def.cleanseIgnores !== true;
}

/** Whether `c` carries a harmful effect that a heal lifts. */
export function isHarmed(c: Combatant): boolean {
  return c.effects.some((e) => e.remainingMs > 0 && cleansable(e.defKey));
}

/** How many harmful effects a heal would lift from `c`. */
function harmCount(c: Combatant): number {
  let n = 0;
  for (const e of c.effects) if (e.remainingMs > 0 && cleansable(e.defKey)) n += 1;
  return n;
}

/** A hero's heal on a hero lifts harmful effects (user decision, 2026-11-16 — Purify's work is the heals' now):
 *  everything a heal clears outright (`healCleansed`: a world boss's spores), then HEAL_CLEANSE_COUNT more, the one
 *  that matters most first (`cleansePriority`, then the longest still to run). Called as an instant heal lands
 *  and as a heal over time is applied — before the heal itself, so a mortal wound it lifts no longer cuts it.
 *  A cue says so for the strip. */
function healCleanse(caster: Combatant, target: Combatant, events: CombatEvent[]): void {
  if (caster.side !== 'hero' || target.side !== 'hero' || !target.alive) return;
  const before = target.effects.length;
  liftHealCleansed(target.effects);
  let lifted = before - target.effects.length;
  for (let n = 0; n < HEAL_CLEANSE_COUNT; n++) {
    let pick = -1;
    let bestPrio = Number.NEGATIVE_INFINITY;
    let bestLeft = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < target.effects.length; i++) {
      const e = target.effects[i];
      if (e === undefined || e.remainingMs <= 0 || !cleansable(e.defKey)) continue;
      const prio = effectDef(e.defKey).cleansePriority ?? 0;
      if (prio > bestPrio || (prio === bestPrio && e.remainingMs > bestLeft)) {
        pick = i;
        bestPrio = prio;
        bestLeft = e.remainingMs;
      }
    }
    if (pick < 0) break;
    target.effects.splice(pick, 1);
    lifted += 1;
  }
  if (lifted > 0) events.push({ type: 'cue', targetId: target.id, sourceId: caster.id, cue: 'cleanse', amount: lifted });
}

/** A hero ability's FireRule (data/abilities): is this the moment? Pure read of both sides. */
function fireRuleMet(rule: FireRule, ability: AbilityDef, caster: Combatant, allies: Combatant[], enemies: Combatant[]): boolean {
  switch (rule.when) {
    case 'inReach': {
      let inReach = 0;
      let alive = 0;
      let big = false;
      for (const e of enemies) {
        if (!e.alive) continue;
        alive += 1;
        if (!inRange(caster, e)) continue;
        inReach += 1;
        if (tough(e)) big = true;
      }
      return inReach >= rule.foes || (inReach > 0 && (big || inReach === alive));
    }
    case 'worthIt': {
      let alive = 0;
      for (const e of enemies) {
        if (!e.alive) continue;
        if (tough(e)) return true;
        alive += 1;
      }
      return alive >= rule.foes;
    }
    case 'cluster': {
      // Around whoever the ability will land on: the front enemy, or — an ability that goes for the biggest pile
      // (Explosive Arrow) — that pile's centre.
      const reached = enemies.find((e) => e.alive && inRange(caster, e));
      const radius = ability.power?.splashRadius ?? DEFAULT_BLAST_RADIUS;
      const front = ability.target === 'biggestCluster' && reached !== undefined ? biggestCluster(caster, enemies, radius) : reached;
      if (front === undefined) return false;
      if (tough(front)) return true;
      return enemies.filter((e) => e.alive && Math.abs(e.x - front.x) <= radius).length >= rule.foes;
    }
    case 'selfHit':
      return recentlyHit(caster);
    case 'selfBelow':
      return caster.alive && lifeFrac(caster) < rule.frac;
    case 'partyHit': {
      if (rule.atAreaBlow === true) {
        // An enemy in the fight that telegraphs an area blow: the ability is kept for that blow's wind-up.
        const blower = enemies.find((e) => e.alive && e.engaged === true && e.abilities.some((a) => isAreaBlow(a.def)));
        if (blower !== undefined) {
          return enemies.some((e) => e.alive && e.casting !== undefined && e.abilities.some((a) => a.def.key === e.casting?.key && isAreaBlow(a.def)));
        }
      }
      return allies.some((a) => a.alive && recentlyHit(a));
    }
    case 'allyHit':
      return allies.some((a) => a.alive && recentlyHit(a));
    case 'allyBelow':
      return allies.some((a) => a.alive && (lifeFrac(a) < rule.frac || (rule.orHeavyHit === true && recentlyHitHard(a) && a.hp < a.maxHp)));
    case 'partyHurt': {
      let living = 0;
      let hurt = 0;
      let harmed = 0;
      for (const a of allies) {
        if (!a.alive) continue;
        living += 1;
        const f = lifeFrac(a);
        if (f < rule.orOneBelow) return true;
        if (f < rule.frac) hurt += 1;
        if (rule.orHarmed !== undefined && isHarmed(a)) harmed += 1;
      }
      if (living === 0) return false;
      return hurt >= Math.min(rule.allies, living) || (rule.orHarmed !== undefined && harmed >= Math.min(rule.orHarmed, living));
    }
    case 'harmedOrBelow':
      return allies.some((a) => a.alive && (isHarmed(a) || lifeFrac(a) < rule.frac || (rule.orHeavyHit === true && recentlyHitHard(a) && a.hp < a.maxHp)));
    case 'bossWindup':
      return bossWindingUp(enemies, rule.heavy === true);
  }
}

/** The rules a hero ability fires by in this fight: its boss rules while a boss is in it (round 7), else its one
 *  rule. Undefined: it has none (the old castCondition holds). */
function fireRules(ability: AbilityDef, enemies: readonly Combatant[]): readonly FireRule[] | undefined {
  if (ability.firesBoss !== undefined && enemies.some((e) => e.alive && e.isBoss === true && e.abilities.some((a) => isBlow(a.def)))) return ability.firesBoss;
  // A boss that winds up no blow at all is met by the waves' rule.
  return ability.fires !== undefined ? [ability.fires] : undefined;
}

/** Whether a hero ability is firing now because a boss winds up its blow (it then lands on the blow's target). */
function bracing(ability: AbilityDef, caster: Combatant, allies: Combatant[], enemies: Combatant[]): boolean {
  if (caster.side !== 'hero' || ability.firesBoss === undefined || bossOf(enemies) === undefined) return false;
  return ability.firesBoss.some((r) => r.when === 'bossWindup' && fireRuleMet(r, ability, caster, allies, enemies));
}

/** A rule that answers what happens to the party (a heal, a ward): it does not wait for the caster to be in
 *  reach of an enemy, unlike a buff. */
function isReactive(ability: AbilityDef, enemies: readonly Combatant[]): boolean {
  const reactive = (w: FireRule['when'] | undefined): boolean => w === 'allyHit' || w === 'allyBelow' || w === 'partyHurt' || w === 'harmedOrBelow' || w === 'bossWindup' || w === 'selfBelow';
  const rules = fireRules(ability, enemies);
  return (rules !== undefined && rules.some((r) => reactive(r.when))) || ability.castCondition === 'allyBelowHpPct';
}

function conditionMet(ability: AbilityDef, caster: Combatant, allies: Combatant[], enemies: Combatant[]): boolean {
  const rules = caster.side === 'hero' ? fireRules(ability, enemies) : undefined;
  if (rules !== undefined) {
    return enemies.some((e) => e.alive) && rules.some((r) => fireRuleMet(r, ability, caster, allies, enemies));
  }
  const cond = ability.castCondition ?? 'always';
  if (cond === 'enemyPresent') return enemies.some((e) => e.alive);
  if (cond === 'allyBelowHpPct') {
    return allies.some((a) => a.alive && a.hp / a.maxHp < ALLY_HELP_THRESHOLD);
  }
  if (cond === 'tankEngaged') {
    // The tank is taking (or about to take) hits: a living enemy is within its own
    // strike range of the tank — mirrors the enemyAttack range gate in combat.ts.
    const tank = findTank(allies);
    if (tank === undefined) return false;
    return enemies.some((e) => e.alive && e.x - tank.x <= e.range);
  }
  return true;
}

// An enemy ability target must be within the caster's ATTACK RANGE — a melee enemy
// can only Bash a hero it has reached, a ranged hero can only Fireball a foe in range.
function inRange(caster: Combatant, target: Combatant): boolean {
  if (behindBack(caster, target)) return false; // a boss's summon flying behind his back
  return Math.abs(target.x - caster.x) <= caster.range;
}

// "Engaged" = at least one living enemy within the caster's own attack range. Used to
// hold self/party BUFFS until the caster actually reaches the fight.
function engaged(caster: Combatant, enemies: Combatant[]): boolean {
  return enemies.some((e) => e.alive && inRange(caster, e));
}

// A self/party BUFF (target self or whole party) should fire only once the caster is in
// range of a foe — otherwise it's blown during the stage-start walk-up and most of its
// uptime is wasted before any fighting. Reactive heals (allyBelowHpPct) are exempt: they
// trigger off a hurt ally, not engagement.
function isSelfOrPartyBuff(ability: AbilityDef, enemies: readonly Combatant[]): boolean {
  // self / whole-party / single-ally buffs (e.g. Power Infusion on a DPS) all wait for
  // engagement so their uptime isn't wasted on the walk-up.
  if (ability.target !== 'self' && ability.target !== 'allAllies' && ability.target !== 'randomDpsAlly' && ability.target !== 'twoDpsAllies') return false;
  return !isReactive(ability, enemies);
}

/** The shield an ability IS about — its first effect, when that is a shield (Bulwark, Holy Shield). A shield
 *  that merely rides along with something else (a modifier's small ward) does not make it a shield ability. */
function primaryShieldKey(ability: AbilityDef): string | undefined {
  const first = ability.applies[0];
  return first !== undefined && effectDef(first.effectKey).kind.type === 'shield' ? first.effectKey : undefined;
}

/** True if the combatant already carries an active (un-depleted) shield of this kind, from any source. */
function hasActiveShield(c: Combatant, shieldKey: string): boolean {
  return c.effects.some((e) => e.defKey === shieldKey && e.remainingMs > 0 && e.value > 0);
}

/** The living foes other than `front` — who a shot aimed behind the front line can land on (the back line
 *  takes damage: docs/DIFFICULTY.md §5b). */
export function foesBehind(front: Combatant, foes: readonly Combatant[]): Combatant[] {
  return foes.filter((f) => f.alive && f !== front);
}

/** The blast radius of an ability that states none (world px ≈ 1.5 bodies). */
const DEFAULT_BLAST_RADIUS = 45;

/** `exclude`: who the ability itself already lands on (a modifier's "and a second ally": `nextHurtAlly`). */
function selectTargets(caster: Combatant, target: AbilityTarget, allies: Combatant[], enemies: Combatant[], rng: Rng, blastRadius = DEFAULT_BLAST_RADIUS, exclude: readonly Combatant[] = []): Combatant[] {
  switch (target) {
    case 'self':
      return [caster];
    case 'allAllies':
      return allies.filter((a) => a.alive);
    case 'allEnemies':
      // A whole-wave AoE (Raining Arrows, Holy Nova, Frozen Trap, boss Quake/Maelstrom…)
      // hits EVERY living enemy on the field — not just those in the caster's reach. Only
      // the current wave is ever present (future batches sit in waveQueue), so this is the
      // whole wave and never the next one. The engagement gate below keeps it from firing
      // during the walk-up.
      return enemies.filter((e) => e.alive);
    case 'frontEnemy': {
      const front = enemies.find((e) => e.alive && inRange(caster, e));
      return front ? [front] : [];
    }
    case 'backEnemy': {
      // A shot lofted over the front line (an archer's Arcing Shot): gated on the FRONT foe being in reach,
      // like a basic attack, then lands on one of the foes behind it, picked at random — on the front one when
      // nobody stands behind (no roll then, so a lone hero's fight draws the same numbers as before).
      const front = enemies.find((e) => e.alive && inRange(caster, e));
      if (front === undefined) return [];
      const behind = foesBehind(front, enemies);
      return [behind.length > 0 ? rng.pick(behind) : front];
    }
    case 'meleeEnemies':
      // A melee cleave (Knight's Debilitating Cleave): hits + debuffs EVERY living enemy
      // within the caster's own reach — the front cluster, not the whole wave. Returns []
      // when nothing is in range, so (like frontEnemy) it self-gates during the walk-up.
      return enemies.filter((e) => e.alive && inRange(caster, e));
    case 'lowestAllyHp': {
      const living = allies.filter((a) => a.alive);
      if (living.length === 0) return [];
      const lowest = living.reduce((lo, a) => (a.hp / a.maxHp < lo.hp / lo.maxHp ? a : lo));
      return [lowest];
    }
    case 'lowestOtherAlly': {
      // The hurt-most living ally that is NOT the caster (a modifier's "also covers an ally");
      // nobody when the caster stands alone.
      const others = allies.filter((a) => a.alive && a !== caster);
      if (others.length === 0) return [];
      return [others.reduce((lo, a) => (a.hp / a.maxHp < lo.hp / lo.maxHp ? a : lo))];
    }
    case 'randomDpsAlly': {
      const dps = allies.filter((a) => a.alive && roleOf(a) === 'dps');
      // Prefer a DPS; if the party has none, fall back to the tank so Power Infusion still
      // does something useful rather than fizzling.
      if (dps.length > 0) return [rng.pick(dps)];
      const tank = findTank(allies);
      return tank !== undefined ? [tank] : [];
    }
    case 'twoDpsAllies': {
      // Two DIFFERENT heroes: damage dealers first, then the tank, then whoever is left (party
      // order). The RNG is only drawn when there are more damage dealers than places.
      const want = 2;
      const dps = allies.filter((a) => a.alive && roleOf(a) === 'dps');
      const picked: Combatant[] = [];
      while (dps.length > want - picked.length && picked.length < want) {
        picked.push(...dps.splice(dps.indexOf(rng.pick(dps)), 1));
      }
      picked.push(...dps.slice(0, want - picked.length));
      const tank = findTank(allies);
      if (picked.length < want && tank !== undefined && !picked.includes(tank)) picked.push(tank);
      for (const a of allies) {
        if (picked.length >= want) break;
        if (a.alive && !picked.includes(a)) picked.push(a);
      }
      return picked;
    }
    case 'tank': {
      const tank = findTank(allies);
      return tank !== undefined ? [tank] : [];
    }
    case 'biggestCluster': {
      // Once the fight has reached the caster (an enemy as near as she stands), the enemy in her shot reach whose
      // blast catches the most (sim/targeting). Deterministic, no RNG.
      if (!enemies.some((e) => e.alive && inRange(caster, e))) return [];
      const best = biggestCluster(caster, enemies, blastRadius);
      return best !== undefined ? [best] : [];
    }
    case 'priorityEnemy': {
      // Once an enemy has come as near as the caster stands (the fight has reached her), the one that comes
      // first in the heroes' order across her whole shot reach (sim/targeting): the support at the back before
      // the brute in front. Deterministic, no RNG.
      if (!enemies.some((e) => e.alive && inRange(caster, e))) return [];
      const best = pickTarget(caster, enemies);
      return best !== undefined ? [best] : [];
    }
    case 'mostHitAlly': {
      // Whoever is taking the most damage right now (the fading tally of sim/recent.ts); nobody when no one is.
      let best: Combatant | undefined;
      for (const a of allies) {
        if (!a.alive || !recentlyHit(a)) continue;
        if (best === undefined || (a.recentDamage ?? 0) > (best.recentDamage ?? 0)) best = a;
      }
      return best !== undefined ? [best] : [];
    }
    case 'hurtAlly': {
      // An ally that has just taken a heavy hit (the one that lost the largest share), else the most hurt — counting
      // as his what a heal over time on him still has to give (2026-11-18: Mend goes to whoever is not mended yet).
      let hard: Combatant | undefined;
      let low: Combatant | undefined;
      let lowFrac = Number.POSITIVE_INFINITY;
      for (const a of allies) {
        if (!a.alive) continue;
        if (recentlyHitHard(a) && a.hp < a.maxHp && (hard === undefined || (a.recentDamage ?? 0) / a.maxHp > (hard.recentDamage ?? 0) / hard.maxHp)) hard = a;
        const f = (a.hp + hotStillToCome(a.effects)) / Math.max(1, a.maxHp);
        if (low === undefined || f < lowFrac) {
          low = a;
          lowFrac = f;
        }
      }
      const pick = hard ?? low;
      return pick !== undefined ? [pick] : [];
    }
    case 'triageAlly': {
      // Healing Light: an ally in danger first (the most hurt, under HEAL_URGENT_FRAC); over that line, the one
      // carrying the most harmful effects (a heal lifts one); then one just struck hard; then the most hurt.
      let low: Combatant | undefined;
      let harmed: Combatant | undefined;
      let most = 0;
      let hard: Combatant | undefined;
      for (const a of allies) {
        if (!a.alive) continue;
        if (low === undefined || lifeFrac(a) < lifeFrac(low)) low = a;
        const n = harmCount(a);
        if (n > most || (n > 0 && n === most && harmed !== undefined && lifeFrac(a) < lifeFrac(harmed))) {
          most = n;
          harmed = a;
        }
        if (recentlyHitHard(a) && a.hp < a.maxHp && (hard === undefined || (a.recentDamage ?? 0) / a.maxHp > (hard.recentDamage ?? 0) / hard.maxHp)) hard = a;
      }
      if (low !== undefined && lifeFrac(low) < HEAL_URGENT_FRAC) return [low];
      const pick = harmed ?? hard ?? low;
      return pick !== undefined ? [pick] : [];
    }
    case 'nextHurtAlly': {
      // The hurt-most living ally the ability itself does not land on.
      let best: Combatant | undefined;
      for (const a of allies) {
        if (!a.alive || exclude.includes(a)) continue;
        if (best === undefined || lifeFrac(a) < lifeFrac(best)) best = a;
      }
      return best !== undefined ? [best] : [];
    }
    case 'harmedAlly': {
      // The ally with the most harmful effects on it; with none harmed, the most hurt.
      let best: Combatant | undefined;
      let most = 0;
      let low: Combatant | undefined;
      for (const a of allies) {
        if (!a.alive) continue;
        const n = a.effects.filter((e) => e.remainingMs > 0 && cleansable(e.defKey)).length;
        if (n > most || (n > 0 && n === most && best !== undefined && lifeFrac(a) < lifeFrac(best))) {
          most = n;
          best = a;
        }
        if (low === undefined || lifeFrac(a) < lifeFrac(low)) low = a;
      }
      const pick = best ?? low;
      return pick !== undefined ? [pick] : [];
    }
    // A boss's picks among the party (its affixes and mechanics, data/bossKit). They are not gated by reach —
    // a bolt, a shot, roots from the ground — but only once the boss has reached the fight.
    case 'randomEnemy': {
      if (caster.side === 'enemy' && caster.engaged !== true) return [];
      const alive = enemies.filter((e) => e.alive);
      return alive.length > 0 ? [rng.pick(alive)] : [];
    }
    case 'softestEnemy': {
      // The one with the least armour (ties: the one further back, last in the list).
      if (caster.side === 'enemy' && caster.engaged !== true) return [];
      let best: Combatant | undefined;
      let least = Number.POSITIVE_INFINITY;
      for (const e of enemies) {
        if (!e.alive) continue;
        const armor = liveStats(e).armor;
        if (armor <= least) {
          least = armor;
          best = e;
        }
      }
      return best !== undefined ? [best] : [];
    }
    case 'topDamageEnemy': {
      // Whoever has hurt this boss the most so far (sim/bossMechanics keeps the count); nobody yet → the front one.
      if (caster.side === 'enemy' && caster.engaged !== true) return [];
      let best: Combatant | undefined;
      for (const e of enemies) {
        if (!e.alive) continue;
        if (best === undefined || (e.dealtToBoss ?? 0) > (best.dealtToBoss ?? 0)) best = e;
      }
      return best !== undefined ? [best] : [];
    }
    default:
      return [];
  }
}

/** Apply one resolved applied-effect to a target (mutates target). Pushes damage/
 *  heal events for instant effects; ongoing effects go on the effect list. */
function applyToTarget(
  caster: Combatant,
  ability: AbilityDef,
  applied: AppliedEffect,
  def: EffectDef,
  rank: number,
  cs: EffectiveStats,
  target: Combatant,
  S: number,
  rng: Rng,
  events: CombatEvent[],
  coeffOverride?: number,
): void {
  const kind = def.kind.type;
  const duration = effectDuration(ability, def, rank, applied.durationMsOverride);
  // The zone heal-power debuff applies to healPower-scaled effects (heal/hot/shield).
  const healEff = healPowerEffectiveness(S);
  let value = effectMagnitude(ability, applied, def, rank, cs, target, caster, coeffOverride, healEff);
  // DoT/HoT coeffs are TOTALS over the effect's duration; store as per-second
  // (what dotDps/hotHps sum each tick).
  if (kind === 'dot' || kind === 'hot') value /= Math.max(0.001, duration / 1000);

  // Heals + HoTs can CRIT off the caster's crit chance, exactly like attacks — rolled once
  // at cast (a crit HoT boosts every tick), scaled by the caster's crit damage. So a priest
  // who stacks crit chance gets bigger heals.
  let healCrit = false;
  // A steady roll (sim/steady): a priest's crit chance makes every so many heals a crit, not a lucky few.
  if ((kind === 'heal' || kind === 'hot') && steadyRoll(caster, 'healCrit', cs.critChance)) {
    healCrit = true;
    value *= 1 + cs.critDamage / 100;
  }
  // Role talents: a hero's heals are stronger on some allies, its damage on some enemies.
  if (kind === 'heal' || kind === 'hot') value *= dealtMult(caster, target, 'heal');
  else if (kind === 'dot' && caster.side === 'hero') {
    value *= dealtMult(caster, target, 'damage');
    noteStruck(caster, target);
    target.lastHitBy = caster.id;
  }

  if (kind === 'damage') {
    let dmg = value;
    let crit = false;
    const power = powerOf(ability, applied);
    if (power?.alwaysCrit === true) {
      crit = true; // a sure crit: no roll (a modifier's patch)
      dmg *= 1 + cs.critDamage / 100;
    } else if (power?.canCrit === true && (caster.side === 'hero' ? steadyRoll(caster, 'crit', cs.critChance) : rng.chance(Math.min(1, cs.critChance / 100)))) {
      crit = true;
      dmg *= 1 + cs.critDamage / 100;
    }
    // Enemy ability damage is mitigated by the target's armor/MR, like enemy autos
    // (hero abilities hit enemies, who carry ~0 armor → no change). Keeps the
    // unified pattern from making enemy spells true damage.
    if (caster.side === 'enemy') {
      // Last Stand invulnerability negates incoming ability damage entirely (the cast
      // still fired — render it as INVULNERABLE rather than a silent miss).
      if (isInvulnerable(target.effects)) {
        events.push({ type: 'damage', targetId: target.id, sourceId: caster.id, amount: 0, crit, invuln: true });
        return;
      }
      const ts = liveStats(target);
      // A spell that names its kind keeps it; otherwise the caster's own mix (sim/damageMix: a boss's fixed share,
      // a support's enchanted wave).
      const magic = foeMagicShare(caster, ability.magic);
      dmg *= weakenMult(caster.effects); // a Debilitated enemy's spells hit softer too
      // A blow that takes the place of the boss's swings (holdsAttack) carries, ON ITS MAIN TARGET, the enrage
      // those swings would have had — otherwise winding it up would be a rest for the tank once the boss is
      // enraged. The splash on the heroes behind is not enraged: the enrage stays the tank's to hold.
      if (ability.holdsAttack === true && caster.isBoss === true && coeffOverride === undefined) {
        dmg *= enrageMultiplier(caster.fightMs ?? 0, caster.enrageMs ?? Number.POSITIVE_INFINITY, caster.enrageRampMs);
      }
      const raw = dmg;
      dmg *= 1 - mixedMitigation(ts.armor, ts.magicResist, magic, S);
      dmg *= 1 - Math.min(MAX_DAMAGE_REDUCTION, Math.max(0, ts.damageReduction)) / 100; // flat % off (e.g. shields/DR buffs)
      // The guard passives (sim/passives.ts). An area blow is a splash, or an ability that reaches everyone.
      const area = coeffOverride !== undefined || ability.target === 'allEnemies' || ability.power?.splashCoeff !== undefined;
      dmg = guardedDamage(target, dmg, { raw, area, magic });
    } else {
      dmg *= vulnerabilityMult(target.effects); // Ranger's Mark amplifies hero ability damage to the boss
      dmg *= dealtMult(caster, target, 'damage'); // role talents
      noteStruck(caster, target); // First Blood
      dmg = foeWard(target, dmg, true, events); // a wave enemy's parry (Guardia) and its support's auras
      dmg = shellDamage(target, dmg, crit); // a boss's shell (the Acorazado affix)
      if (crit) critBleed(caster, target, dmg); // Hemorrhage: her critical hits leave a bleed
      target.lastHitBy = caster.id;
      condemn(caster, target); // Condemn: hit by her damage abilities, it takes more from everyone
    }
    if (caster.side === 'enemy' && caster.isBoss === true && isAreaBlow(ability)) onWorldBlow(caster, target, S); // its Rend (world bosses, from Hell)
    noteDamageTaken(target, dmg); // what lands on a hero, before its shields (sim/recent.ts)
    dmg = Math.max(0, absorbDamage(target.effects, dmg));
    target.hp -= dmg;
    // Tag the source ability so the render layer can pick the caster's ability-cast swing
    // (e.g. the knight's heavy 3rd attack) instead of a basic auto.
    // An enemy's area blow reaching the heroes behind the front one is a SPLASH hit: the strip shows its number
    // without replaying the attacker's swing (hero splashes keep their own presentation).
    const splash = caster.side === 'enemy' && coeffOverride !== undefined ? true : undefined;
    events.push({ type: 'damage', targetId: target.id, sourceId: caster.id, amount: dmg, crit, abilityKey: ability.key, splash });
    return;
  }
  if (kind === 'heal') {
    // A hero's heal lifts harmful effects as it lands — first, so a mortal wound it lifts no longer cuts it.
    healCleanse(caster, target, events);
    // Mortal Wound (and any healReduction) cuts the healing the target receives.
    const heal = Math.max(0, value) * healReceivedMult(target.effects);
    overflowShield(target, target.hp + heal - target.maxHp); // Overflow: what does not fit becomes a shield
    target.hp = Math.min(target.maxHp, target.hp + heal);
    events.push({ type: 'heal', targetId: target.id, sourceId: caster.id, amount: heal, crit: healCrit });
    return;
  }
  // A heal over time lifts harmful effects as it is APPLIED (never on its ticks).
  if (kind === 'hot') healCleanse(caster, target, events);
  // dot / hot / shield / statMod / silence / root / tag → ongoing effect.
  applyEffect(target.effects, def, caster.id, value, duration);
}

/** A hero's abilities in the order he looks at them when more than one is ready (2026-11-18, with the global cooldown:
 *  «por urgencia»): first what braces against a boss's winding blow, then a heal while an ally is in danger (under
 *  data/healing HEAL_URGENT_FRAC), then the rest in their slots' order. Stable; the slots' order breaks ties. */
function byUrgency(caster: Combatant, allies: Combatant[], enemies: Combatant[]): readonly ResolvedAbility[] {
  const list = caster.abilities;
  if (list.length < 2) return list;
  const danger = allies.some((a) => a.alive && lifeFrac(a) < HEAL_URGENT_FRAC);
  const urgency = (ability: AbilityDef): number => {
    if (bracing(ability, caster, allies, enemies)) return 0;
    if (danger && healsAllies(ability)) return 1;
    return 2;
  };
  const ranked = list.map((a, i) => ({ a, i, u: urgency(a.def) }));
  if (ranked.every((r) => r.u === 2)) return list;
  return ranked.sort((x, y) => x.u - y.u || x.i - y.i).map((r) => r.a);
}

/** Whether an ability heals (an instant heal or one over time), on whomever it lands. */
function healsAllies(ability: AbilityDef): boolean {
  return ability.applies.some((a) => {
    const t = effectDef(a.effectKey).kind.type;
    return t === 'heal' || t === 'hot';
  });
}

/** Try to cast ready abilities for a combatant. Returns the keys cast (render).
 *
 *  Heroes act once per SWING: their cast cadence IS the attack timer (combat.ts calls this
 *  only when the hero is ready to swing, and a cast uses up that swing — an ability takes
 *  precedence over the auto-attack). So a hero casts at most ONE ready ability per call.
 *  Enemies have no such gate — they fire every ready ability (cadence unchanged). */
export function castReadyAbilities(
  caster: Combatant,
  allies: Combatant[],
  enemies: Combatant[],
  S: number,
  rng: Rng,
  events: CombatEvent[],
): string[] {
  if (!caster.alive || isSilenced(caster.effects)) return [];
  // A combatant mid-channel (winding up a cast bar) takes no new action — its in-progress
  // cast resolves in combat.resolveChanneledCast when the bar fills.
  if (caster.casting !== undefined) return [];
  const single = caster.side === 'hero'; // one ability per swing for heroes
  // The global cooldown: a hero who has just cast waits it out before the next (his swings go on meanwhile).
  if (single && (caster.gcdMs ?? 0) > 0) return [];
  const cs = casterStats(caster);
  const cast: string[] = [];
  for (const { def: ability, rank } of single ? byUrgency(caster, allies, enemies) : caster.abilities) {
    if (ability.aura !== undefined) continue; // passive aura — never cast (applied at build time)
    // Ready check: charge-gated abilities fire at full charge (no cooldown); the rest
    // gate on their remaining cooldown.
    if (ability.charge !== undefined) {
      if ((caster.charges?.[ability.key] ?? 0) < ability.charge.toCast) continue;
    } else if ((caster.cooldowns[ability.key] ?? 0) > 0) {
      continue;
    }
    if (!conditionMet(ability, caster, allies, enemies)) continue;
    if (ability.special !== undefined && (caster.engaged !== true || !specialReady(caster, ability))) continue; // a boss's mechanic waits for the fight (and the breaking of the mirrors, for all six)
    // Don't blow a self/party buff — OR a whole-wave AoE — during the walk-up: hold it
    // until the caster is actually engaged (a foe in range). The AoE then lands on the
    // ENTIRE wave (selectTargets no longer range-gates allEnemies), not just what's in reach.
    if ((isSelfOrPartyBuff(ability, enemies) || ability.target === 'allEnemies') && !engaged(caster, enemies)) continue;
    // Braced against a boss's blow (its boss rule fired on the wind-up): an ability for one ally lands on the hero
    // the blow will strike — the front one.
    const braced = bracing(ability, caster, allies, enemies) && ONE_ALLY_TARGETS.has(ability.target);
    const front = braced ? frontmostAlly(allies) : undefined;
    const targets = front !== undefined ? [front] : selectTargets(caster, ability.target, allies, enemies, rng, ability.power?.splashRadius);
    if (targets.length === 0) continue;
    // Don't stack shields: if this ability IS a shield and every target already has an active
    // shield of that kind (from ANY source), skip the cast WITHOUT consuming its cooldown — it
    // fires the moment the existing shield drops. Keeps the Knight's Bulwark and the
    // Priest's Holy Shield from overwriting / wasting each other on the same tank.
    const shieldKey = primaryShieldKey(ability);
    if (shieldKey !== undefined && targets.every((t) => hasActiveShield(t, shieldKey))) continue;
    // A channeled enemy cast (world-boss Frenzy / Mortal Wound) winds up FIRST: begin the
    // channel + start its cooldown now, but resolve the effect only when the cast bar fills
    // (combat.resolveChanneledCast). A channeling enemy starts nothing else this call.
    if (caster.side === 'enemy' && (ability.castTimeMs ?? 0) > 0) {
      const ms = ability.castTimeMs as number;
      caster.casting = { key: ability.key, remainingMs: ms, totalMs: ms };
      commitCooldown(caster, ability, rank);
      break;
    }
    const firstEvent = events.length;
    const healed = applyAbilityEffectsTo(caster, ability, rank, cs, targets, allies, enemies, S, rng, events);
    commitCooldown(caster, ability, rank);
    if (single) caster.gcdMs = HERO_GLOBAL_COOLDOWN_MS;
    cast.push(ability.key);
    if (single && healed.length > 0) healInfusion(caster, allies, healed); // Power Infusion: each of her heals quickens the party
    if (single && caster.triggers !== undefined) critTriggers(caster, allies, enemies, events, firstEvent);
    // Heroes take just one action per swing — the cast consumed it; the rest wait for the
    // next swing. Enemies keep firing every ready ability.
    if (single) break;
  }
  return cast;
}

/** Apply an ability's declarative effects to its (pre-selected) targets, plus any AoE
 *  splash. Split out so a channeled cast can resolve the SAME way an instant cast does.
 *  Targets are passed in (selected once) so RNG-targeted abilities don't re-roll. Returns the heroes a heal (an
 *  instant one or one over time) of this cast landed on. */
function applyAbilityEffectsTo(
  caster: Combatant,
  ability: AbilityDef,
  rank: number,
  cs: EffectiveStats,
  targets: Combatant[],
  allies: Combatant[],
  enemies: Combatant[],
  S: number,
  rng: Rng,
  events: CombatEvent[],
): Combatant[] {
  const healed: Combatant[] = [];
  resolveSpecial(caster, ability, allies, enemies, S, events); // what it does beyond effects (a boss's summons, its undertow…)
  if (ability.special?.kind === 'mirror') {
    // Espejos: the boss casts back the last ability a hero cast (sim/mirror builds it) — a cast like any other,
    // resolved here; a cue says which ability it was.
    const reflected = reflection(caster, ability.special);
    if (reflected !== undefined) {
      events.push({ type: 'cue', targetId: caster.id, cue: 'mirror', abilityKey: reflected.of });
      const aimed = selectTargets(caster, reflected.def.target, allies, enemies, rng);
      if (aimed.length > 0) applyAbilityEffectsTo(caster, reflected.def, 1, cs, aimed, allies, enemies, S, rng, events);
    }
    afterMirror(caster, ability.special, allies, enemies, S, events); // one more pane lit; every other one, the reflection
  }
  for (const applied of ability.applies) {
    if (applied.chance !== undefined && !rng.chance(applied.chance)) continue;
    const def = effectDef(applied.effectKey);
    // An effect with a target of its own (Smite's strike, a modifier's "also on an ally") picks it
    // here; the rest land on the ability's targets.
    const own = applied.target === undefined ? targets : selectTargets(caster, applied.target, allies, enemies, rng, undefined, targets);
    const heals = def.kind.type === 'heal' || def.kind.type === 'hot';
    for (const t of own) {
      applyToTarget(caster, ability, applied, def, rank, cs, t, S, rng, events);
      if (heals && t.side === 'hero' && !healed.includes(t)) healed.push(t);
    }
  }
  // AoE splash: a single-target damage ability with power.splashCoeff also blasts enemies
  // WITHIN splashRadius (world px) of the primary target for the reduced splash coeff
  // (Explosive Arrow's detonation — only the front enemy + those near it).
  const splashBase = ability.power?.splashCoeff;
  const primary = targets[0];
  if (splashBase !== undefined && primary !== undefined) {
    const splashCoeff = splashBase + (ability.power?.splashCoeffPerRank ?? 0) * Math.max(0, rank - 1);
    const radius = ability.power?.splashRadius ?? 45;
    const dmgApplied = ability.applies.find((a) => a.target === undefined && effectDef(a.effectKey).kind.type === 'damage');
    if (dmgApplied !== undefined) {
      const dmgDef = effectDef(dmgApplied.effectKey);
      // Effects that ride the blast (a modifier's burn) land on the splashed enemies at their own value.
      const riders = ability.applies.filter((a) => a.onSplash === true);
      for (const e of enemies) {
        if (!e.alive || targets.includes(e)) continue;
        if (Math.abs(e.x - primary.x) > radius) continue; // outside the blast radius → spared
        applyToTarget(caster, ability, dmgApplied, dmgDef, rank, cs, e, S, rng, events, splashCoeff);
        for (const rider of riders) applyToTarget(caster, ability, rider, effectDef(rider.effectKey), rank, cs, e, S, rng, events);
      }
    }
  }
  return healed;
}

/** Fire a hero's "on crit" triggers for the critical hits its cast just landed (the damage events pushed
 *  since `from`). Only reached by heroes that carry triggers. */
function critTriggers(caster: Combatant, allies: Combatant[], enemies: Combatant[], events: CombatEvent[], from: number): void {
  const ctx: TriggerCtx = { heroes: allies, enemies, events };
  const landed = events.length;
  for (let i = from; i < landed; i++) {
    const ev = events[i];
    if (ev === undefined || ev.type !== 'damage' || ev.crit !== true || ev.sourceId !== caster.id) continue;
    const victim = enemies.find((e) => e.id === ev.targetId);
    if (victim !== undefined) onCrit(caster, victim, ctx);
  }
}

/** Commit an ability's cost after it fires: spend a charge, or start its base cooldown. */
function commitCooldown(caster: Combatant, ability: AbilityDef, rank: number): void {
  if (ability.charge !== undefined) {
    (caster.charges ??= {})[ability.key] = 0; // spent — rebuild via auto-attacks
    return;
  }
  // Store the BASE cooldown (no CDR baked in); tickCooldowns drains it at a rate scaled by
  // the caster's live CDR, so a CDR buff gained later still shortens this cooldown.
  const base = baseCooldownMs(ability, rank);
  caster.cooldowns[ability.key] = base;
  (caster.cooldownTotals ??= {})[ability.key] = base; // base also drives the UI fill fraction
}

/** Resolve a combatant's in-progress channeled cast: select targets fresh (the field moved
 *  during the windup) and apply the ability's effects, clearing the channel. Returns the
 *  resolved ability key (for the render 'cast' marker), or null if there was no cast / it
 *  fizzled. The cooldown was already started when the channel began. */
export function resolveChanneledCast(
  caster: Combatant,
  allies: Combatant[],
  enemies: Combatant[],
  S: number,
  rng: Rng,
  events: CombatEvent[],
): string | null {
  const ch = caster.casting;
  caster.casting = undefined;
  if (ch === undefined) return null;
  const resolved = caster.abilities.find((a) => a.def.key === ch.key);
  if (resolved === undefined) return null;
  const cs = casterStats(caster);
  const targets = selectTargets(caster, resolved.def.target, allies, enemies, rng, resolved.def.power?.splashRadius);
  if (targets.length > 0) applyAbilityEffectsTo(caster, resolved.def, resolved.rank, cs, targets, allies, enemies, S, rng, events);
  return resolved.def.key;
}

// ── Tooltip helpers (pure; UI reads these to show scaled values at a hero's stats). What each effect of an
// ability does at a rank, as data for the interface to word, is sim/abilityFacts.ts. ──

/** Effective cooldown (ms) of an ability at a rank given the caster's stats. */
export function abilityCooldownMs(ability: AbilityDef, rank: number, cs: EffectiveStats): number {
  return effectiveCooldown(ability, Math.max(1, rank), cs);
}
