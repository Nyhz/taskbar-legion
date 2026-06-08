import type { AbilityDef } from '@/data/abilities';
import type { EffectDef } from '@/data/effects';
import { effectDef } from '@/data/effects';
import type { Combatant, CombatEvent } from './world';
import type { Rng } from './rng';
import { aggregate, type EffectiveStats } from './stats';
import { applyEffect, effectStatMods, absorbDamage, isSilenced, isInvulnerable, vulnerabilityMult, weakenMult, healReceivedMult } from './effects';
import { STATS } from '@/data/stats';
import { classDef } from '@/data/classes';
import { mitigation, MAX_DAMAGE_REDUCTION } from '@/data/stageScaling';
import { healPowerEffectiveness } from '@/data/difficulties';
import { format } from './num';

// Cooldown tracking + AI cast logic. Abilities apply declarative effects; power
// effects (damage/heal/shield/dot/hot) scale off the caster/target stats, stat
// buffs/debuffs off the effect def + rankScaling. Generic: a new ability is data.

const ALLY_HELP_THRESHOLD = 0.7; // 'allyBelowHpPct' triggers below 70% HP
const MAX_CDR = 75; // cap cooldown reduction so abilities can't go free

export function tickCooldowns(c: Combatant, deltaMs: number): void {
  const keys = Object.keys(c.cooldowns);
  if (keys.length === 0) return;
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

/** Effective stats of any combatant (for scaling ability magnitudes/cooldowns). */
function casterStats(c: Combatant): EffectiveStats {
  return aggregate(c.baseStats, [...c.staticMods, ...effectStatMods(c.effects)]);
}

/** A caster's basic-attack damage — the unit every damaging ability is denominated
 *  in (a `coeff` of 1.0 == "one normal attack"). Heroes derive it from attackDamage
 *  (boosted by damageIncrease); enemies use their precomputed, stage-scaled
 *  `enemyDamage`. This is what lets enemy abilities scale through the SAME path as
 *  hero abilities (enemies carry no attackDamage stat). */
export function normalAttackDamage(caster: Combatant, cs: EffectiveStats): number {
  if (caster.side === 'enemy') return caster.enemyDamage ?? 0;
  return cs.attackDamage * (1 + cs.damageIncrease / 100);
}

/** Resolve the magnitude of one applied effect for the ability at a given rank.
 *  Power effects scale with stats; stat/CC effects use base value + rankScaling.
 *  Damage/DoT are a multiple of the caster's normal attack (DoT = TOTAL over its
 *  duration, divided into per-second in applyToTarget). Heal/HoT/Shield are a
 *  fraction of the target's max HP (HoT = TOTAL over its duration). */
function effectMagnitude(ability: AbilityDef, def: EffectDef, rank: number, cs: EffectiveStats, target: Combatant, caster: Combatant, perRankOverride?: number, coeffOverride?: number, healEff = 1): number {
  const steps = Math.max(0, rank - 1);
  const t = def.kind.type;
  if (t === 'damage' || t === 'dot') {
    const p = ability.power;
    if (p === undefined) return 0;
    const coeff = coeffOverride ?? p.coeff + (p.coeffPerRank ?? 0) * steps;
    return coeff * normalAttackDamage(caster, cs);
  }
  if (t === 'heal' || t === 'hot' || t === 'shield') {
    const p = ability.power;
    if (p === undefined) return 0;
    const coeff = p.coeff + (p.coeffPerRank ?? 0) * steps;
    // healPower's benefit is scaled by the difficulty's heal-power effectiveness (the zone
    // debuff) — the base coeff floor is untouched, only the healPower amplification diminishes.
    return coeff * target.maxHp * (1 + (cs.healPower * healEff) / 100);
  }
  // statMod / weaken / healReduction / silence / root / tag: base value + per-rank. A
  // per-effect `valuePerRank` (perRankOverride) wins over the ability-wide rankScaling.
  const base =
    def.kind.type === 'statMod' || def.kind.type === 'weaken' || def.kind.type === 'healReduction'
      ? def.kind.value
      : 0;
  const perRank = perRankOverride ?? ability.rankScaling?.perRank.value ?? 0;
  return base + perRank * steps;
}

function effectDuration(ability: AbilityDef, def: EffectDef, rank: number, override?: number): number {
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

function conditionMet(ability: AbilityDef, allies: Combatant[], enemies: Combatant[]): boolean {
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
function isSelfOrPartyBuff(ability: AbilityDef): boolean {
  // self / whole-party / single-ally buffs (e.g. Power Infusion on a DPS) all wait for
  // engagement so their uptime isn't wasted on the walk-up.
  if (ability.target !== 'self' && ability.target !== 'allAllies' && ability.target !== 'randomDpsAlly') return false;
  return ability.castCondition !== 'allyBelowHpPct';
}

/** True if the ability grants an absorb shield (applies any shield-kind effect). */
function appliesShield(ability: AbilityDef): boolean {
  return ability.applies.some((a) => effectDef(a.effectKey).kind.type === 'shield');
}

/** True if the combatant already carries an active (un-depleted) shield from any source. */
function hasActiveShield(c: Combatant): boolean {
  return c.effects.some((e) => e.remainingMs > 0 && e.value > 0 && effectDef(e.defKey).kind.type === 'shield');
}

function selectTargets(caster: Combatant, ability: AbilityDef, allies: Combatant[], enemies: Combatant[], rng: Rng): Combatant[] {
  switch (ability.target) {
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
    case 'randomDpsAlly': {
      const dps = allies.filter((a) => a.alive && roleOf(a) === 'dps');
      // Prefer a DPS; if the party has none, fall back to the tank so Power Infusion still
      // does something useful rather than fizzling.
      if (dps.length > 0) return [rng.pick(dps)];
      const tank = findTank(allies);
      return tank !== undefined ? [tank] : [];
    }
    case 'tank': {
      const tank = findTank(allies);
      return tank !== undefined ? [tank] : [];
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
  def: EffectDef,
  rank: number,
  cs: EffectiveStats,
  target: Combatant,
  durationOverride: number | undefined,
  perRankOverride: number | undefined,
  S: number,
  rng: Rng,
  events: CombatEvent[],
  coeffOverride?: number,
): void {
  const kind = def.kind.type;
  const duration = effectDuration(ability, def, rank, durationOverride);
  // The zone heal-power debuff applies to healPower-scaled effects (heal/hot/shield).
  const healEff = healPowerEffectiveness(S);
  let value = effectMagnitude(ability, def, rank, cs, target, caster, perRankOverride, coeffOverride, healEff);
  // DoT/HoT coeffs are TOTALS over the effect's duration; store as per-second
  // (what dotDps/hotHps sum each tick).
  if (kind === 'dot' || kind === 'hot') value /= Math.max(0.001, duration / 1000);

  // Heals + HoTs can CRIT off the caster's crit chance, exactly like attacks — rolled once
  // at cast (a crit HoT boosts every tick), scaled by the caster's crit damage. So a priest
  // who stacks crit chance gets bigger heals.
  let healCrit = false;
  if ((kind === 'heal' || kind === 'hot') && rng.chance(Math.min(1, cs.critChance / 100))) {
    healCrit = true;
    value *= 1 + cs.critDamage / 100;
  }

  if (kind === 'damage') {
    let dmg = value;
    let crit = false;
    if (ability.power?.canCrit === true && rng.chance(Math.min(1, cs.critChance / 100))) {
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
      const ts = aggregate(target.baseStats, [...target.staticMods, ...effectStatMods(target.effects)]);
      const defense = caster.enemyMagic === true ? ts.magicResist : ts.armor;
      dmg *= weakenMult(caster.effects); // a Debilitated enemy's spells hit softer too
      dmg *= 1 - mitigation(Math.max(0, defense), S);
      dmg *= 1 - Math.min(MAX_DAMAGE_REDUCTION, Math.max(0, ts.damageReduction)) / 100; // flat % off (e.g. shields/DR buffs)
    } else {
      dmg *= vulnerabilityMult(target.effects); // Ranger's Mark amplifies hero ability damage to the boss
    }
    dmg = Math.max(0, absorbDamage(target.effects, dmg));
    target.hp -= dmg;
    // Tag the source ability so the render layer can pick the caster's ability-cast swing
    // (e.g. the knight's heavy 3rd attack) instead of a basic auto.
    events.push({ type: 'damage', targetId: target.id, sourceId: caster.id, amount: dmg, crit, abilityKey: ability.key });
    return;
  }
  if (kind === 'heal') {
    // Mortal Wound (and any healReduction) cuts the healing the target receives.
    const heal = Math.max(0, value) * healReceivedMult(target.effects);
    target.hp = Math.min(target.maxHp, target.hp + heal);
    events.push({ type: 'heal', targetId: target.id, sourceId: caster.id, amount: heal, crit: healCrit });
    return;
  }
  // dot / hot / shield / statMod / silence / root / tag → ongoing effect.
  applyEffect(target.effects, def, caster.id, value, duration);
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
  const cs = casterStats(caster);
  const cast: string[] = [];
  for (const { def: ability, rank } of caster.abilities) {
    if (ability.aura !== undefined) continue; // passive aura — never cast (applied at build time)
    // Ready check: charge-gated abilities fire at full charge (no cooldown); the rest
    // gate on their remaining cooldown.
    if (ability.charge !== undefined) {
      if ((caster.charges?.[ability.key] ?? 0) < ability.charge.toCast) continue;
    } else if ((caster.cooldowns[ability.key] ?? 0) > 0) {
      continue;
    }
    if (!conditionMet(ability, allies, enemies)) continue;
    // Don't blow a self/party buff — OR a whole-wave AoE — during the walk-up: hold it
    // until the caster is actually engaged (a foe in range). The AoE then lands on the
    // ENTIRE wave (selectTargets no longer range-gates allEnemies), not just what's in reach.
    if ((isSelfOrPartyBuff(ability) || ability.target === 'allEnemies') && !engaged(caster, enemies)) continue;
    const targets = selectTargets(caster, ability, allies, enemies, rng);
    if (targets.length === 0) continue;
    // Don't stack shields: if this ability grants a shield and every target already has an
    // active shield (from ANY source), skip the cast WITHOUT consuming its cooldown — it
    // fires the moment the existing shield drops. Keeps the Knight's Bulwark and the
    // Priest's Holy Shield from overwriting / wasting each other on the same tank.
    if (appliesShield(ability) && targets.every(hasActiveShield)) continue;
    // A channeled enemy cast (world-boss Frenzy / Mortal Wound) winds up FIRST: begin the
    // channel + start its cooldown now, but resolve the effect only when the cast bar fills
    // (combat.resolveChanneledCast). A channeling enemy starts nothing else this call.
    if (caster.side === 'enemy' && (ability.castTimeMs ?? 0) > 0) {
      const ms = ability.castTimeMs as number;
      caster.casting = { key: ability.key, remainingMs: ms, totalMs: ms };
      commitCooldown(caster, ability, rank);
      break;
    }
    applyAbilityEffectsTo(caster, ability, rank, cs, targets, enemies, S, rng, events);
    commitCooldown(caster, ability, rank);
    cast.push(ability.key);
    // Heroes take just one action per swing — the cast consumed it; the rest wait for the
    // next swing. Enemies keep firing every ready ability.
    if (single) break;
  }
  return cast;
}

/** Apply an ability's declarative effects to its (pre-selected) targets, plus any AoE
 *  splash. Split out so a channeled cast can resolve the SAME way an instant cast does.
 *  Targets are passed in (selected once) so RNG-targeted abilities don't re-roll. */
function applyAbilityEffectsTo(
  caster: Combatant,
  ability: AbilityDef,
  rank: number,
  cs: EffectiveStats,
  targets: Combatant[],
  enemies: Combatant[],
  S: number,
  rng: Rng,
  events: CombatEvent[],
): void {
  for (const applied of ability.applies) {
    if (applied.chance !== undefined && !rng.chance(applied.chance)) continue;
    const def = effectDef(applied.effectKey);
    for (const t of targets) applyToTarget(caster, ability, def, rank, cs, t, applied.durationMsOverride, applied.valuePerRank, S, rng, events);
  }
  // AoE splash: a single-target damage ability with power.splashCoeff also blasts enemies
  // WITHIN splashRadius (world px) of the primary target for the reduced splash coeff
  // (Explosive Arrow's detonation — only the front enemy + those near it).
  const splashBase = ability.power?.splashCoeff;
  const primary = targets[0];
  if (splashBase !== undefined && primary !== undefined) {
    const splashCoeff = splashBase + (ability.power?.splashCoeffPerRank ?? 0) * Math.max(0, rank - 1);
    const radius = ability.power?.splashRadius ?? 45;
    const dmgApplied = ability.applies.find((a) => effectDef(a.effectKey).kind.type === 'damage');
    if (dmgApplied !== undefined) {
      const dmgDef = effectDef(dmgApplied.effectKey);
      for (const e of enemies) {
        if (!e.alive || targets.includes(e)) continue;
        if (Math.abs(e.x - primary.x) > radius) continue; // outside the blast radius → spared
        applyToTarget(caster, ability, dmgDef, rank, cs, e, dmgApplied.durationMsOverride, dmgApplied.valuePerRank, S, rng, events, splashCoeff);
      }
    }
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
  const targets = selectTargets(caster, resolved.def, allies, enemies, rng);
  if (targets.length > 0) applyAbilityEffectsTo(caster, resolved.def, resolved.rank, cs, targets, enemies, S, rng, events);
  return resolved.def.key;
}

// ── Tooltip helpers (pure; UI reads these to show scaled values at a hero's stats) ──

/** Effective cooldown (ms) of an ability at a rank given the caster's stats. */
export function abilityCooldownMs(ability: AbilityDef, rank: number, cs: EffectiveStats): number {
  return effectiveCooldown(ability, Math.max(1, rank), cs);
}

/** Party-aura line for an aura ability at a rank (e.g. "+5% Attack Damage to the whole
 *  party"), or null if the ability has no aura. Mirrors sim/loadout.partyAuraMods so the
 *  tooltip shows exactly what the slotted aura grants. */
export function abilityAuraLine(ability: AbilityDef, rank: number): string | null {
  const a = ability.aura;
  if (a === undefined) return null;
  const r = Math.max(1, rank);
  const value = a.baseValue + a.valuePerRank * (r - 1);
  const pct = STATS[a.stat].kind === 'percent';
  const sign = value >= 0 ? '+' : '−';
  const mag = pct ? Math.round(Math.abs(value)) : Math.abs(value).toFixed(1);
  return `${sign}${mag}${pct ? '%' : ''} ${STATS[a.stat].label} to the whole party`;
}

/** Human-readable line per applied effect, with magnitudes resolved at the given
 *  rank + stats. `refMaxHp` stands in for the target's max HP (heal/shield basis). */
export function abilityEffectLines(ability: AbilityDef, rank: number, cs: EffectiveStats, refMaxHp: number, healEff = 1): string[] {
  const r = Math.max(1, rank);
  const refTarget = { maxHp: refMaxHp } as Combatant;
  const refCaster = { side: 'hero' } as Combatant;
  // Heal/HoT/Shield scale with the TARGET's max HP (× heal power), so a flat number is
  // meaningless in a tooltip — the target varies and isn't the caster. Show the % of max
  // HP it actually grants (heal-power-amplified AND zone-debuffed via healEff, matching the
  // combat formula), labelled by whose HP it's a fraction of.
  const healPctOfMaxHp = (): number => {
    const p = ability.power;
    if (p === undefined) return 0;
    const coeff = p.coeff + (p.coeffPerRank ?? 0) * Math.max(0, r - 1);
    return coeff * (1 + (cs.healPower * healEff) / 100) * 100;
  };
  const pf = (x: number): string => `${+x.toFixed(1)}%`;
  const hpBasis =
    ability.target === 'self' ? 'your max HP' : ability.target === 'tank' ? "the tank's max HP" : "the target's max HP";
  const lines: string[] = [];
  for (const applied of ability.applies) {
    const def = effectDef(applied.effectKey);
    const k = def.kind;
    const dur = effectDuration(ability, def, r, applied.durationMsOverride);
    const durS = (dur / 1000).toFixed(dur % 1000 === 0 ? 0 : 1);
    // DoT magnitudes are TOTALS over the duration (see effectMagnitude); damage/dot scale
    // with the caster's own attack, so the displayed hero's stats give the real number.
    const v = effectMagnitude(ability, def, r, cs, refTarget, refCaster, applied.valuePerRank);
    const n = (x: number): string => format(Math.round(x));
    const pre = applied.chance !== undefined ? `${Math.round(applied.chance * 100)}% chance: ` : '';
    switch (k.type) {
      case 'damage':
        lines.push(`${pre}Damage ~${n(v)}${ability.power?.canCrit === true ? ' (can crit)' : ''}`);
        break;
      case 'dot':
        lines.push(`${pre}~${n(v)} damage over ${durS}s`);
        break;
      case 'heal':
        lines.push(`${pre}Heal ${pf(healPctOfMaxHp())} of ${hpBasis}`);
        break;
      case 'hot':
        lines.push(`${pre}Heal ${pf(healPctOfMaxHp())} of ${hpBasis} over ${durS}s`);
        break;
      case 'shield':
        lines.push(`${pre}Shield ${pf(healPctOfMaxHp())} of ${hpBasis} for ${durS}s`);
        break;
      case 'statMod': {
        const pct = k.mode === 'percent';
        const sign = v >= 0 ? '+' : '';
        lines.push(`${pre}${sign}${pct ? Math.round(v) : v.toFixed(1)}${pct ? '%' : ''} ${STATS[k.stat].label} for ${durS}s`);
        break;
      }
      case 'weaken':
        lines.push(`${pre}−${Math.round(v)}% damage dealt for ${durS}s`);
        break;
      case 'root':
        lines.push(`${pre}Root ${durS}s`);
        break;
      case 'silence':
        lines.push(`${pre}Silence ${durS}s`);
        break;
      default:
        break;
    }
  }
  return lines;
}
