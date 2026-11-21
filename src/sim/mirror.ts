import type { AbilityDef, AbilitySpecial, AbilityTarget, AppliedEffect } from '@/data/abilities';
import { tryAbilityDef } from '@/data/abilities';
import { MECHANIC, SUMMONS } from '@/data/bossKit';
import { effectDef } from '@/data/effects';
import { TRASH_DMG_FRACTION, TRASH_HP_FRACTION, enemyDamage, enemyHp, trashDmgTune } from '@/data/stageScaling';
import { applyEffect } from './effects';
import { liveStats } from './liveStats';
import type { Combatant, CombatEvent } from './world';

// ESPEJOS (the Unmaker's own mechanic — data/bossKit.ts MECHANIC.mirror): the boss reflects the last ability a
// hero cast. This builds the ability the boss casts for it: the hero's own, resolved at the rank he holds it,
// with every effect it lays on ENEMIES kept (they now fall on the heroes, the boss's hit standing in for the
// hero's attack) and every effect it lays on ALLIES turned on the boss itself — each scaled by the mechanic's
// numbers. Pure; the cast itself is sim/abilities, like any other cast.

/** The key the reflected ability carries (its hits are tagged with it: the strip shows them as mirror shards). */
export const MIRROR_ABILITY = 'boss_mirror';

/** Targets that mean "the other side". Everything else is one's own side. */
const FOE_TARGETS: ReadonlySet<AbilityTarget> = new Set<AbilityTarget>([
  'frontEnemy', 'backEnemy', 'meleeEnemies', 'allEnemies', 'biggestCluster', 'priorityEnemy', 'toughestEnemy', 'randomEnemy', 'softestEnemy', 'topDamageEnemy',
]);

/** Whom a hero's pick among the enemies becomes when the boss makes it among the heroes: the shots a hero aims
 *  by her own order of priority (or at the thickest of a pack) fall on a hero picked at random. */
function reflectedTarget(target: AbilityTarget): AbilityTarget {
  return target === 'priorityEnemy' || target === 'biggestCluster' || target === 'toughestEnemy' ? 'randomEnemy' : target;
}

/** Remember the abilities the heroes cast this tick: the last one is what the boss will reflect. Only abilities
 *  a hero holds (never an ultimate, never a passive aura). */
export function noteHeroCasts(boss: Combatant, heroes: readonly Combatant[], events: readonly CombatEvent[]): void {
  for (const ev of events) {
    if (ev.type !== 'cast' || ev.abilityKey === undefined) continue;
    const held = heroes.find((h) => h.id === ev.targetId)?.abilities.find((a) => a.def.key === ev.abilityKey && a.def.aura === undefined);
    if (held !== undefined) boss.lastHeroCast = { key: held.def.key, rank: held.rank, heroId: ev.targetId };
  }
}

/** The plain damage effect a shard deals. */
const MIRROR_SHARD_EFFECT = 'fx_damage';
/** Stats whose gain would make the boss harder to hurt (it does not take them from a mirror). */
const DEFENSIVE_STATS: ReadonlySet<string> = new Set(['damageReduction', 'armor', 'magicResist', 'block']);

/** Whether a hero effect the mirror copies turns into a shard (round 11): a shield or a defensive stat the boss would
 *  take for itself, or a weaken / an attack cut that would fall on the heroes. */
export function turnsToShard(def: ReturnType<typeof effectDef>): boolean {
  const k = def.kind;
  if (def.beneficial) return k.type === 'shield' || (k.type === 'statMod' && DEFENSIVE_STATS.has(k.stat));
  if (k.type === 'weaken') return true;
  return k.type === 'statMod' && (k.stat === 'attackDamage' || k.stat === 'attackSpeed') && k.value < 0;
}

export interface Reflection {
  /** The hero ability it reflects (its sign goes up over the boss). */
  of: string;
  def: AbilityDef;
}

/** The ability the boss casts to reflect the last one a hero cast, or undefined when there is none yet (or it
 *  has nothing that can be turned: an immunity). `harm` scales what falls on the heroes; `boon` the heals and
 *  shields the boss takes (shares of ITS life); `buff` the stat effects it takes. */
export function reflection(boss: Combatant, scale: { harm: number; boon: number; buff: number }): Reflection | undefined {
  const last = boss.lastHeroCast;
  const src = last === undefined ? undefined : tryAbilityDef(last.key);
  if (last === undefined || src === undefined) return undefined;
  const steps = Math.max(0, last.rank - 1);
  const onFoes = FOE_TARGETS.has(src.target);
  const applies: AppliedEffect[] = [];
  let shard = false;
  for (const a of src.applies) {
    const def = effectDef(a.effectKey);
    const kind = def.kind.type;
    if (kind === 'invulnerable') continue; // nothing of this is the boss's to take
    const power = a.power ?? src.power;
    // An ability that lands in waves (Raining Arrows' three volleys) comes back as ONE blow worth all its waves.
    const waves = src.volleys?.count ?? 1;
    const coeff = power === undefined ? undefined : (power.coeff + (power.coeffPerRank ?? 0) * steps) * (a.powerScale ?? 1) * waves;
    const durationMsOverride = (a.durationMsOverride ?? def.durationMs) + (src.rankScaling?.perRank.durationMs ?? 0) * steps;
    const base: AppliedEffect = { effectKey: a.effectKey, durationMsOverride, ...(a.chance === undefined ? {} : { chance: a.chance }) };
    const scaledPower = (k: number): AppliedEffect => (coeff === undefined ? base : { ...base, power: { coeff: coeff * k } });
    // Round 10/11 rework (user, 2026-11-17: «rehacer los espejos»): what would make the boss harder to hurt — a shield,
    // damage reduction, armour, magic resist — or the heroes weaker at hurting it (a weaken, a cut to their attack) is
    // not taken: the mirror throws it back as a SHARD on the front hero instead. Before, a Knight's Stone Skin or
    // Debilitating Cleave reflected cut the party's damage by a quarter to a third, and the world-10 walls asked 5–8
    // points more of the gear ceiling than their line.
    if (turnsToShard(def)) {
      shard = true;
      continue;
    }
    if (def.beneficial) {
      // What it does for allies, the boss takes for itself.
      if (kind === 'heal' || kind === 'hot') applies.push({ ...scaledPower(scale.boon), target: 'self' });
      else {
        const value = a.value ?? (def.kind.type === 'statMod' || def.kind.type === 'weaken' || def.kind.type === 'healReduction' ? def.kind.value : 0);
        const perRank = a.valuePerRank ?? src.rankScaling?.perRank.value ?? 0;
        applies.push({ ...base, value: (value + perRank * steps) * scale.buff, valuePerRank: 0, target: 'self' });
      }
      continue;
    }
    // What it does to enemies falls on the heroes: on the ability's own targets, or — an effect with a target
    // of its own, or one of an ability that is cast on an ally (Smite) — on its own.
    const own = a.target !== undefined && FOE_TARGETS.has(a.target) ? reflectedTarget(a.target) : onFoes ? undefined : 'frontEnemy';
    const value = a.value ?? (def.kind.type === 'statMod' || def.kind.type === 'weaken' || def.kind.type === 'healReduction' ? def.kind.value : undefined);
    const perRank = a.valuePerRank ?? src.rankScaling?.perRank.value ?? 0;
    applies.push({
      ...scaledPower(scale.harm),
      ...(value === undefined ? {} : { value: value + perRank * steps, valuePerRank: 0 }),
      ...(own === undefined ? {} : { target: own }),
      ...(a.onSplash === true ? { onSplash: true } : {}),
    });
  }
  // The shard: a hit on the front hero at `harm` of the boss's hit (what a defence turned into).
  if (shard) applies.push({ effectKey: MIRROR_SHARD_EFFECT, power: { coeff: scale.harm }, target: 'frontEnemy' });
  if (applies.length === 0) return undefined;
  const splash = src.power?.splashCoeff === undefined ? undefined : (src.power.splashCoeff + (src.power.splashCoeffPerRank ?? 0) * steps) * scale.harm;
  const def: AbilityDef = {
    key: MIRROR_ABILITY, name: src.name, icon: src.icon, desc: src.desc, cooldownMs: 0,
    target: onFoes ? reflectedTarget(src.target) : 'self',
    applies,
    ...(src.magic === undefined ? {} : { magic: src.magic }),
    // (Only the splash is read from the ability's own power: each effect above carries its coefficient.)
    ...(splash === undefined ? {} : { power: { coeff: 0, splashCoeff: splash, ...(src.power?.splashRadius === undefined ? {} : { splashRadius: src.power.splashRadius }) } }),
  };
  return { of: src.key, def };
}

// ── The six mirrors ─────────────────────────────────────────────────────────────────────────────────────────

type MirrorSpecial = Extract<AbilitySpecial, { kind: 'mirror' }>;
type ShatterSpecial = Extract<AbilitySpecial, { kind: 'shatter' }>;

/** How many of the boss's panes are lit (stacks of `effectKey`). */
export function litPanes(boss: Combatant, effectKey: string): number {
  return boss.effects.find((e) => e.defKey === effectKey && e.remainingMs > 0)?.stacks ?? 0;
}

/** Whether an ability with a special of its own may be cast now: the breaking of the mirrors waits until every
 *  pane is lit. Everything else is always ready (its cooldown and its targets decide). */
export function specialReady(caster: Combatant, ability: AbilityDef): boolean {
  const special = ability.special;
  if (special?.kind !== 'shatter') return true;
  return litPanes(caster, special.paneEffectKey) >= special.panes;
}

/** Espejos has just gone off: one more pane lights (more damage for the rest of the fight — a stack of the
 *  pane effect), and every `reflectionEvery`-th pane the dark reflection of the hero it copied steps out. A cue
 *  (`pane`, with how many are lit) tells the strip. */
export function afterMirror(boss: Combatant, special: MirrorSpecial, allies: Combatant[], heroes: readonly Combatant[], S: number, events: CombatEvent[]): void {
  applyEffect(boss.effects, effectDef(special.paneEffectKey), boss.id, special.panePct);
  const lit = Math.min(special.panes, litPanes(boss, special.paneEffectKey));
  events.push({ type: 'cue', targetId: boss.id, cue: 'pane', amount: lit });
  if (special.reflectionEvery > 0 && lit % special.reflectionEvery === 0) {
    // Never two reflections at once: one that is due while the last still stands waits for it (releaseReflection).
    boss.reflectionOwed = { summon: special.reflection, hit: special.reflectionHit, stage: S };
    releaseReflection(boss, allies, heroes);
  }
}

/** The mirrors break (the cast of the area blow resolves): every pane goes dark, and its bonus with it — before
 *  the blow itself lands, which is therefore the plain one. A cue (`shatter`) tells the strip. */
export function shatterPanes(boss: Combatant, special: ShatterSpecial, events: CombatEvent[]): void {
  for (let i = boss.effects.length - 1; i >= 0; i--) if (boss.effects[i]?.defKey === special.paneEffectKey) boss.effects.splice(i, 1);
  events.push({ type: 'cue', targetId: boss.id, cue: 'shatter' });
}

// ── The dark reflection ─────────────────────────────────────────────────────────────────────────────────────

/** The reflection the boss owes steps out — unless one still stands: then it waits (called again every tick,
 *  sim/bossMechanics) until that one has fallen or run out. It is a reflection of the hero whose ability was
 *  last copied: a summon (data/bossKit SUMMONS) like the Crowmother's crows — its own life, gone after its
 *  time, no reward, down with the boss — that stands between the back line and the front hero, behind his
 *  back, and strikes at the pace of the hero it reflects. Nothing was copied yet, or that hero has fallen: no
 *  reflection (the debt is dropped). */
export function releaseReflection(boss: Combatant, allies: Combatant[], heroes: readonly Combatant[]): void {
  const owed = boss.reflectionOwed;
  if (owed === undefined) return;
  if (allies.some((a) => a.alive && a.summon?.key === owed.summon)) return;
  boss.reflectionOwed = undefined;
  const def = SUMMONS[owed.summon];
  const hero = heroes.find((h) => h.id === boss.lastHeroCast?.heroId && h.alive);
  if (def === undefined || hero === undefined) return;
  const S = owed.stage;
  const [slowest, fastest] = MECHANIC.mirror.reflection.attackSpeed;
  const pace = Math.max(slowest, Math.min(fastest, liveStats(hero).attackSpeed));
  const maxHp = Math.max(1, enemyHp(S) * TRASH_HP_FRACTION * def.hpOfGrunt);
  const taken = allies.filter((a) => a.alive && a.summon !== undefined).map((a) => a.summon?.slot ?? 0);
  let slot = 0;
  while (taken.includes(slot)) slot++;
  allies.push({
    id: `${boss.id}_${def.key}_${Math.round(boss.fightMs ?? 0)}`,
    side: 'enemy',
    hp: maxHp,
    maxHp,
    baseStats: {},
    staticMods: [],
    effects: [],
    cooldowns: {},
    attackTimerMs: 1000 / pace,
    x: boss.x - 40, // where the mirror hangs, ahead of the boss
    range: Number.MAX_SAFE_INTEGER, // it strikes from its place among the party (its arrival gates it)
    moveSpeed: def.flySpeed,
    alive: true,
    abilities: [],
    fightMs: 0,
    engaged: true,
    enemyDamage: enemyDamage(S) * TRASH_DMG_FRACTION * trashDmgTune(S) * owed.hit,
    enemyAttackSpeed: pace,
    enemyMagic: hero.classKey === 'priest',
    isBoss: false,
    isElite: false,
    enrageMs: Number.POSITIVE_INFINITY,
    backShotChance: 1, // the heroes BEHIND the front one…
    movedThisTick: true,
    summon: { key: def.key, leftMs: def.lifeMs, slot, of: { heroId: hero.id, classKey: hero.classKey ?? '' } }, // …its own hero first
  });
}

/** Whom a summon that is after ONE hero strikes (a reflection: the hero it is the double of), when that hero
 *  stands behind the front one; undefined → the usual pick among the heroes behind. */
export function summonPrey(e: Combatant, front: Combatant, heroes: readonly Combatant[]): Combatant | undefined {
  const id = e.summon?.of?.heroId;
  if (id === undefined) return undefined;
  const prey = heroes.find((h) => h.id === id);
  return prey !== undefined && prey.alive && prey !== front ? prey : undefined;
}
