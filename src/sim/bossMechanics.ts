import type { AbilityDef } from '@/data/abilities';
import { abilityDef, stageBossAbilityKeys, worldBossAbilityKeys } from '@/data/abilities';
import { BOSS_AFFIX, MECHANIC_EXTRAS, SUMMONS, SUMMON_HOVER, bossAffixes, mechanicAbility, worldBossMechanic, worldBossPressure, MECHANIC, type BossAffixKey, type BossRank } from '@/data/bossKit';
import { difficultyIndexOf } from '@/data/difficulties';
import { effectDef } from '@/data/effects';
import { HERO_SPACING } from '@/data/field';
import { MAX_DAMAGE_REDUCTION, TRASH_DMG_FRACTION, TRASH_HP_FRACTION, enemyDamage, enemyHp, trashDmgTune } from '@/data/stageScaling';
import { applyEffect, effectStatMods } from './effects';
import type { ResolvedAbility } from './loadout';
import { noteHeroCasts, releaseReflection, shatterPanes } from './mirror';
import { dragParty, igniteGround, layerSpores, levelParty, tickGroundFire, tickGuilt } from './worldBossRules';
import type { Combatant, CombatEvent } from './world';

// THE BOSS KIT in play (data/bossKit.ts holds every number): what a boss wields when it spawns, and the rules of
// its affixes and of the world bosses' mechanics that are not plain effects — the shell, the leech, the frenzy
// clock, the venom, the summons. Pure and deterministic: nothing here draws from an rng of its own, and the
// affixes of a stage come from the run's seed and the stage alone.

// ── What a boss wields ──────────────────────────────────────────────────────────────────────────────────────

export interface BossKit {
  abilities: ResolvedAbility[];
  affixes: BossAffixKey[];
  mechanic?: string;
}

const resolved = (def: AbilityDef): ResolvedAbility => ({ def, rank: 1 });

/** The kit of the boss of global stage `S`: its area blow (faster if Sísmico), its mechanic if it is a world boss
 *  whose figure has one, and the abilities its affixes bring. The mechanic is listed FIRST: a boss starts one cast
 *  at a time, in list order, so its own mechanic is never crowded out by the rest. */
export function bossKit(runSeed: number, S: number, rank: BossRank): BossKit {
  const d = difficultyIndexOf(S);
  const affixes = bossAffixes(runSeed, S, rank, d);
  const abilities: ResolvedAbility[] = [];
  const mechanic = rank === 'world' ? worldBossMechanic(S) : undefined;
  if (mechanic !== undefined) {
    // What the mechanic brings besides itself goes ahead of it (the breaking of the mirrors, when its moment comes).
    for (const key of MECHANIC_EXTRAS[mechanic] ?? []) abilities.push(resolved(mechanicAbility(abilityDef(key), mechanic, d)));
    abilities.push(resolved(mechanicAbility(abilityDef(MECHANIC[mechanic].abilityKey), mechanic, d)));
  }
  for (const key of rank === 'world' ? worldBossAbilityKeys() : stageBossAbilityKeys()) {
    let blow = abilityDef(key);
    if (rank === 'world') {
      // A world boss's minute presses the party by its difficulty (data/bossKit WORLD_BOSS_PRESSURE).
      const p = worldBossPressure(d);
      blow = { ...blow, cooldownMs: p.blowEveryMs, power: { ...blow.power, coeff: p.blowCoeff, splashCoeff: p.splashCoeff } };
    }
    abilities.push(resolved(affixes.includes('seismic') ? { ...blow, cooldownMs: Math.min(blow.cooldownMs, BOSS_AFFIX.seismic.blowEveryMs) } : blow));
  }
  if (affixes.includes('deadeye')) abilities.push(resolved(abilityDef(BOSS_AFFIX.deadeye.abilityKey)));
  if (affixes.includes('mortalWound')) {
    const wound = abilityDef(BOSS_AFFIX.mortalWound.abilityKey);
    abilities.push(resolved({ ...wound, power: { ...wound.power, coeff: BOSS_AFFIX.mortalWound.coeff[rank] } })); // harder from a world boss
  }
  return { abilities, affixes, mechanic };
}

function hasAffix(c: Combatant, key: BossAffixKey): boolean {
  return c.affixes !== undefined && c.affixes.includes(key);
}

/** Give a freshly spawned boss what its kit needs from the first moment: its shell, and its life on record (what
 *  Culpa measures the party's damage by). */
export function armBoss(boss: Combatant): void {
  boss.hpSeen = boss.hp;
  if (hasAffix(boss, 'armored')) raiseShell(boss);
}

function raiseShell(boss: Combatant): void {
  applyEffect(boss.effects, effectDef(BOSS_AFFIX.armored.effectKey), boss.id, boss.maxHp * BOSS_AFFIX.armored.shellFrac);
  boss.shellBackMs = undefined;
}

// ── Acorazado ───────────────────────────────────────────────────────────────────────────────────────────────

/** The damage that gets through a boss's shell: while the shell holds, the hit is cut and wears the shell by its
 *  full size (twice that for a crit). The hit that breaks it is still cut. No shell → the damage as it came. */
export function shellDamage(victim: Combatant, dmg: number, crit: boolean): number {
  if (victim.affixes === undefined || dmg <= 0) return dmg;
  // A boss that has taken a hero's damage-reduction buff for itself (Espejos reflecting Stone Skin, Hold the
  // Line…) takes that much less — the one place every hit on it passes through.
  let reduction = 0;
  for (const m of effectStatMods(victim.effects)) if (m.key === 'damageReduction') reduction += m.value;
  if (reduction > 0) dmg *= 1 - Math.min(MAX_DAMAGE_REDUCTION, reduction) / 100;
  const key = BOSS_AFFIX.armored.effectKey;
  const shell = victim.effects.find((e) => e.defKey === key && e.value > 0 && e.remainingMs > 0);
  if (shell === undefined) return dmg;
  shell.value -= dmg * (crit ? BOSS_AFFIX.armored.critWear : 1);
  if (shell.value <= 0) {
    shell.value = 0;
    shell.remainingMs = 0; // spent: dropped by the next upkeep, which also fires "effect ended"
    victim.shellBackMs = BOSS_AFFIX.armored.returnMs;
  }
  return dmg * BOSS_AFFIX.armored.damageTaken;
}

// ── Vampírico, Venenoso ─────────────────────────────────────────────────────────────────────────────────────

/** A boss's basic attack has just landed on `target` for `dealt` (after everything): what its affixes do with it.
 *  Vampírico heals the boss when the hit was not blocked; Venenoso leaves a stack of venom on the hero. */
export function onBossHit(boss: Combatant, target: Combatant, dealt: number, blocked: boolean, events: CombatEvent[]): void {
  if (boss.affixes === undefined || !boss.alive) return;
  if (!blocked && hasAffix(boss, 'vampiric')) {
    const heal = Math.min(boss.maxHp - boss.hp, boss.maxHp * BOSS_AFFIX.vampiric.healFrac);
    if (heal > 0) {
      boss.hp += heal;
      events.push({ type: 'heal', targetId: boss.id, sourceId: boss.id, amount: heal, cue: 'leech' });
    }
  }
  if (dealt > 0 && target.alive && hasAffix(boss, 'venomous')) {
    const perStack = (target.maxHp * BOSS_AFFIX.venomous.pctPerStack) / 100;
    applyEffect(target.effects, effectDef(BOSS_AFFIX.venomous.effectKey), boss.id, perStack);
  }
}

// ── Desgarro (world-boss pressure) ──────────────────────────────────────────────────────────────────────────

/** A WORLD boss's area blow has just reached `target`: from Hell on it leaves a stack of Rend (data/bossKit
 *  WORLD_BOSS_PRESSURE.woundPct % of the hero's life a second per stack; only a heal lifts it). */
export function onWorldBlow(boss: Combatant, target: Combatant, S: number): void {
  if (boss.bossRank !== 'world' || !target.alive) return;
  const pct = worldBossPressure(difficultyIndexOf(S)).woundPct;
  if (pct <= 0) return;
  applyEffect(target.effects, effectDef('debuff_rend'), boss.id, (target.maxHp * pct) / 100);
}

// ── Summons ─────────────────────────────────────────────────────────────────────────────────────────────────

/** What an ability does beyond its effects. Called once when the cast resolves; `allies` is the caster's own
 *  side as the world holds it (a summon joins it), `foes` the other side. */
export function resolveSpecial(caster: Combatant, ability: AbilityDef, allies: Combatant[], foes: readonly Combatant[], S: number, events: CombatEvent[]): void {
  const special = ability.special;
  if (special === undefined) return;
  switch (special.kind) {
    case 'undertow':
      return dragParty(caster, foes, special.dragPx);
    case 'spores':
      return layerSpores(caster, foes, special.effectKey, special.pctPerLayer);
    case 'groundFire':
      return igniteGround(caster, special.burnMs, special.totalOfHit);
    case 'scales':
      return levelParty(caster, foes, ability.key, events);
    case 'mirror':
      return; // cast by sim/abilities (it is an ability like any other: sim/mirror builds it)
    case 'shatter':
      return shatterPanes(caster, special, events);
    case 'summon':
      break;
  }
  const stamp = Math.round(caster.fightMs ?? 0); // the fight's clock at this cast: makes each summon's id its own
  const def = SUMMONS[special.summon];
  if (def === undefined) return;
  const gruntHp = enemyHp(S) * TRASH_HP_FRACTION;
  const trashHit = enemyDamage(S) * TRASH_DMG_FRACTION * trashDmgTune(S);
  const taken = allies.filter((a) => a.alive && a.summon !== undefined).map((a) => a.summon?.slot ?? 0);
  let slot = 0;
  for (let i = 0; i < special.count; i++) {
    while (taken.includes(slot)) slot++;
    taken.push(slot);
    const maxHp = Math.max(1, gruntHp * def.hpOfGrunt);
    allies.push({
      id: `${caster.id}_${def.key}_${stamp}_${i}`,
      side: 'enemy',
      hp: maxHp,
      maxHp,
      baseStats: {},
      staticMods: [],
      effects: [],
      cooldowns: {},
      attackTimerMs: 1000 / Math.max(0.05, def.attacksPerSec),
      x: caster.x - 24,
      range: Number.MAX_SAFE_INTEGER, // it flies: where it stands does not gate its pecks (its arrival does)
      moveSpeed: def.flySpeed,
      alive: true,
      abilities: [],
      fightMs: 0,
      engaged: true, // not a member of the wave: it fires no "reached the fight" triggers
      enemyDamage: trashHit * special.hitOfTrash,
      enemyAttackSpeed: Math.max(0.05, def.attacksPerSec),
      enemyMagic: false,
      isBoss: false,
      isElite: false,
      enrageMs: Number.POSITIVE_INFINITY,
      backShotChance: 1, // it pecks the heroes BEHIND the front one (the front one when it stands alone)
      movedThisTick: true,
      summon: { key: def.key, leftMs: def.lifeMs, slot },
    });
  }
}

/** Where summon number `slot` hovers: just ahead of the frontmost hero of the BACK line (so the shooters behind
 *  see it in front of them and the front hero cannot reach it), each a little further on; ahead of the front
 *  hero when he stands alone. */
function hoverX(slot: number, heroes: readonly Combatant[], between: number | undefined): number | undefined {
  let front: Combatant | undefined;
  let second: Combatant | undefined;
  for (const h of heroes) {
    if (!h.alive) continue;
    if (front === undefined || h.x > front.x) {
      second = front;
      front = h;
    } else if (second === undefined || h.x > second.x) second = h;
  }
  if (front === undefined) return undefined;
  // A summon with a place of its own stands that share of the way from the back line to the front hero.
  if (between !== undefined && second !== undefined) return second.x + (front.x - second.x) * between + slot * SUMMON_HOVER.apart;
  const anchor = second ?? front;
  return anchor.x + HERO_SPACING * SUMMON_HOVER.ahead + slot * SUMMON_HOVER.apart;
}

/** A boss's summon whose place is BEHIND `attacker` (it hovers at a lower x than his own): out of his reach
 *  whatever his range, also while it flies past him — he faces the fight; the heroes standing further back have
 *  it in front of them and shoot it. */
export function behindBack(attacker: Combatant, target: Combatant): boolean {
  return target.summon !== undefined && attacker.side === 'hero' && (target.summon.toX ?? target.x) < attacker.x;
}

/** True for an enemy the wave rules must leave alone: it does not walk up to the front line. */
export function isSummon(c: Combatant): boolean {
  return c.summon !== undefined;
}

/** When a boss falls, what it summoned goes with it (no rewards, no triggers). */
export function dismissSummons(enemies: Combatant[], events: CombatEvent[]): void {
  for (const e of enemies) {
    if (e.summon === undefined || !e.alive) continue;
    e.alive = false;
    e.hp = 0;
    events.push({ type: 'death', targetId: e.id });
  }
}

// ── The kit's clocks, once per combat tick ──────────────────────────────────────────────────────────────────

/** Advance the boss kit by one tick: summons fly, hover and leave; a frenzied boss gains its stacks; a broken
 *  shell returns; and the damage each hero dealt the boss this tick is counted (who Roots binds). Called at the
 *  end of the combat tick with that tick's events. Draws no rng. */
export function tickBossKit(heroes: Combatant[], enemies: Combatant[], deltaMs: number, events: CombatEvent[]): void {
  let boss: Combatant | undefined;
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.isBoss === true) boss = e;
    const s = e.summon;
    if (s === undefined) continue;
    s.leftMs -= deltaMs;
    if (s.leftMs <= 0) {
      e.alive = false; // it leaves: no kill, no rewards
      s.left = true; // …and the strip shows it flying off, not falling
      e.hp = 0;
      events.push({ type: 'death', targetId: e.id });
      continue;
    }
    const to = hoverX(s.slot, heroes, SUMMONS[s.key]?.between);
    s.toX = to;
    if (to === undefined) continue;
    const step = (e.moveSpeed * deltaMs) / 1000;
    const d = to - e.x;
    e.x = Math.abs(d) <= step ? to : e.x + Math.sign(d) * step;
    e.movedThisTick = Math.abs(to - e.x) > 12; // it pecks once it is over its place
  }
  if (boss === undefined) return;
  if (boss.holdMs !== undefined) boss.holdMs = boss.holdMs > deltaMs ? boss.holdMs - deltaMs : undefined;
  tickGuilt(boss, heroes, deltaMs, events); // Culpa: the marked hero pays for what the party took off the boss
  tickGroundFire(boss, heroes, deltaMs, events); // Hoja al rojo: the ground under the party burns
  noteHeroCasts(boss, heroes, events); // Espejos: the last ability a hero cast is what it will reflect
  releaseReflection(boss, enemies, heroes); // …and a reflection that had to wait for the last one steps out

  // Roots binds the hero who has hurt the boss most: count this tick's hits on it by who dealt them.
  for (const ev of events) {
    if (ev.type !== 'damage' || ev.targetId !== boss.id || ev.sourceId === undefined || ev.amount === undefined) continue;
    const hero = heroes.find((h) => h.id === ev.sourceId);
    if (hero !== undefined) hero.dealtToBoss = (hero.dealtToBoss ?? 0) + ev.amount;
  }
  if (boss.engaged !== true) return; // the clocks below count FIGHT time

  // Sísmico: from the moment the fight is joined the ground shakes at its feet (a marker the strip reads).
  if (hasAffix(boss, 'seismic') && !boss.effects.some((e) => e.defKey === BOSS_AFFIX.seismic.effectKey)) {
    applyEffect(boss.effects, effectDef(BOSS_AFFIX.seismic.effectKey), boss.id, 0);
  }

  if (hasAffix(boss, 'frenzied')) {
    boss.frenzyClockMs = (boss.frenzyClockMs ?? 0) + deltaMs;
    if (boss.frenzyClockMs >= BOSS_AFFIX.frenzied.everyMs) {
      boss.frenzyClockMs -= BOSS_AFFIX.frenzied.everyMs;
      const def = effectDef(BOSS_AFFIX.frenzied.effectKey);
      applyEffect(boss.effects, def, boss.id, def.kind.type === 'statMod' ? def.kind.value : 0);
    }
  }
  if (boss.shellBackMs !== undefined) {
    boss.shellBackMs -= deltaMs;
    if (boss.shellBackMs <= 0) raiseShell(boss);
  }
}
