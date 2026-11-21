import type { Combatant, CombatEvent } from './world';
import type { ActiveEffect } from '@/data/effects';
import { effectDef, INVULN_EFFECT_KEY } from '@/data/effects';
import { chargeBankCap } from '@/data/abilities';
import type { TriggerAction, TriggerDef, TriggerEvent, TriggerTarget } from '@/data/triggers';
import { applyEffect, extendEffects, healReceivedMult, isInvulnerable } from './effects';
import { overflowShield } from './passives';

// The generic TRIGGER engine (docs/redesign/CLASSES.md §6, F5). A hero carries TriggerDefs (data); the combat
// loop calls one of the `on…` hooks below when something happens and the matching triggers run their actions.
// Deterministic and RNG-free: heroes are visited in party order, triggers in the order the hero carries them.
// A trigger only fires while its owner is alive.

/** What a trigger can see and touch: both sides of the field and the tick's render events. */
export interface TriggerCtx {
  heroes: Combatant[];
  enemies: Combatant[];
  events: CombatEvent[];
}

type EventOf<K extends TriggerEvent['on']> = Extract<TriggerEvent, { on: K }>;

/** The owner's triggers for one kind of event (empty for a hero without any — the common case). */
function triggersOn<K extends TriggerEvent['on']>(owner: Combatant, on: K): { def: TriggerDef; event: EventOf<K> }[] {
  if (owner.triggers === undefined || !owner.alive) return [];
  const out: { def: TriggerDef; event: EventOf<K> }[] = [];
  for (const def of owner.triggers) if (def.event.on === on) out.push({ def, event: def.event as EventOf<K> });
  return out;
}

function canPay(owner: Combatant, def: TriggerDef): boolean {
  if (def.uses === undefined) return true;
  if (def.uses === 'ultCharge') return (owner.ultCharge ?? 0) > 0;
  return (owner.triggerUses?.[def.key] ?? 0) < def.uses.perStage;
}

function pay(owner: Combatant, def: TriggerDef): void {
  if (def.uses === undefined) return;
  if (def.uses === 'ultCharge') owner.ultCharge = (owner.ultCharge ?? 0) - 1;
  else (owner.triggerUses ??= {})[def.key] = (owner.triggerUses[def.key] ?? 0) + 1;
}

/** The living enemy nearest the party (the one "in front"). */
function frontEnemy(enemies: readonly Combatant[]): Combatant | undefined {
  let best: Combatant | undefined;
  for (const e of enemies) if (e.alive && e.hp > 0 && (best === undefined || e.x < best.x)) best = e;
  return best;
}

function targetsOf(to: TriggerTarget, owner: Combatant, subject: Combatant | undefined, ctx: TriggerCtx): Combatant[] {
  switch (to) {
    case 'self':
      return [owner];
    case 'subject':
      return subject === undefined ? [] : [subject];
    case 'allAllies':
      return ctx.heroes.filter((h) => h.alive);
    case 'allEnemies':
      return ctx.enemies.filter((e) => e.alive);
    case 'meleeEnemies':
      return ctx.enemies.filter((e) => e.alive && Math.abs(e.x - owner.x) <= owner.range);
    case 'frontEnemy': {
      const front = frontEnemy(ctx.enemies);
      return front === undefined ? [] : [front];
    }
  }
}

/** Run one action. Returns the combatant a `move` landed its effect on (the marker points at it). */
function run(action: TriggerAction, owner: Combatant, subject: Combatant | undefined, ctx: TriggerCtx, carried?: ActiveEffect): Combatant | undefined {
  switch (action.do) {
    case 'rescue': {
      if (subject === undefined) return;
      subject.hp = Math.max(1, subject.maxHp * action.hpFrac);
      applyEffect(subject.effects, effectDef(INVULN_EFFECT_KEY), owner.id, 0, action.invulnMs);
      return;
    }
    case 'apply': {
      const def = effectDef(action.effectKey);
      const own = def.kind.type === 'statMod' || def.kind.type === 'weaken' || def.kind.type === 'healReduction' ? def.kind.value : 0;
      for (const t of targetsOf(action.to, owner, subject, ctx)) {
        const value = action.value ?? (action.hpFrac !== undefined ? action.hpFrac * t.maxHp : own);
        applyEffect(t.effects, def, owner.id, value, action.durationMs);
      }
      return;
    }
    case 'heal': {
      for (const t of targetsOf(action.to, owner, subject, ctx)) {
        const heal = action.hpFrac * t.maxHp * healReceivedMult(t.effects);
        if (heal <= 0) continue;
        overflowShield(t, t.hp + heal - t.maxHp); // Overflow: a talent's heal (Second Wind) overflows like any other
        t.hp = Math.min(t.maxHp, t.hp + heal);
        ctx.events.push({ type: 'heal', targetId: t.id, sourceId: owner.id, amount: heal });
      }
      return;
    }
    case 'extend':
      extendEffects(owner.effects, action.effectKeys, action.ms);
      return;
    case 'charge': {
      const ability = owner.abilities.find((a) => a.def.key === action.abilityKey)?.def;
      if (ability?.charge === undefined) return;
      const cur = (owner.charges ??= {})[ability.key] ?? 0;
      owner.charges[ability.key] = Math.min(chargeBankCap(ability.charge.toCast), cur + action.amount);
      return;
    }
    case 'move': {
      if (carried === undefined) return;
      let landed: Combatant | undefined;
      for (const t of targetsOf(action.to, owner, subject, ctx)) {
        if (t === subject) continue;
        applyEffect(t.effects, effectDef(carried.defKey), owner.id, carried.value, carried.remainingMs);
        landed ??= t;
      }
      return landed;
    }
  }
}

/** Fire one trigger if its owner can pay for it. Returns whether it fired. */
function fire(owner: Combatant, def: TriggerDef, subject: Combatant | undefined, ctx: TriggerCtx, carried?: ActiveEffect): boolean {
  if (!canPay(owner, def)) return false;
  pay(owner, def);
  // The marker points at the event's subject — or, when the trigger moved an effect, at where it landed.
  let marked = subject;
  for (const action of def.actions) {
    const landed = run(action, owner, subject, ctx, carried);
    if (action.do === 'move') marked = landed;
  }
  if (def.marker !== undefined && marked !== undefined) {
    ctx.events.push({ type: 'cast', targetId: owner.id, sourceId: marked.id, abilityKey: def.marker });
  }
  return true;
}

/** A hero is about to fall. Its own "lethal" triggers go first, then its living allies' (party order); the
 *  first that can pay saves it. A hero already invulnerable is not saved twice. Returns whether it lives. */
export function tryRescue(falling: Combatant, ctx: TriggerCtx): boolean {
  if (isInvulnerable(falling.effects)) return false;
  for (const { def, event } of triggersOn(falling, 'lethal')) {
    if (event.who === 'self' && fire(falling, def, falling, ctx)) return true;
  }
  for (const ally of ctx.heroes) {
    if (ally === falling) continue;
    for (const { def, event } of triggersOn(ally, 'lethal')) {
      if (event.who === 'ally' && fire(ally, def, falling, ctx)) return true;
    }
  }
  return false;
}

/** An enemy reached the fight for the first time. `firstOfWave`: no other enemy of its batch of the wave had. */
export function onEnemyEngage(enemy: Combatant, firstOfWave: boolean, ctx: TriggerCtx): void {
  const elite = enemy.isElite === true;
  const boss = enemy.isBoss === true;
  for (const h of ctx.heroes) {
    if (firstOfWave) for (const { def } of triggersOn(h, 'waveEngage')) fire(h, def, enemy, ctx);
    if (!elite && !boss) continue;
    for (const { def, event } of triggersOn(h, 'enemyEngage')) {
      if (boss || event.vs === 'eliteOrBoss') fire(h, def, enemy, ctx);
    }
  }
}

/** A hero blocked an enemy's hit. */
export function onBlock(hero: Combatant, attacker: Combatant, ctx: TriggerCtx): void {
  for (const { def } of triggersOn(hero, 'block')) fire(hero, def, attacker, ctx);
}

/** A hero landed a critical hit. */
export function onCrit(hero: Combatant, victim: Combatant, ctx: TriggerCtx): void {
  for (const { def } of triggersOn(hero, 'crit')) fire(hero, def, victim, ctx);
}

/** An enemy died: the hero whose hit landed last gets the kill, and the heroes whose effect it carried see
 *  their bearer fall (the effect itself is handed to the trigger so it can jump). */
export function onEnemyDeath(dead: Combatant, ctx: TriggerCtx): void {
  for (const h of ctx.heroes) {
    if (h.id === dead.lastHitBy) for (const { def } of triggersOn(h, 'kill')) fire(h, def, dead, ctx);
    for (const { def, event } of triggersOn(h, 'bearerDeath')) {
      const carried = dead.effects.find((e) => e.defKey === event.effectKey && e.sourceId === h.id && e.remainingMs > 0);
      if (carried !== undefined) fire(h, def, dead, ctx, carried);
    }
  }
}

/** Effects on `holder` just ended: the heroes that applied them hear about it. */
export function onEffectsEnded(holder: Combatant, ended: readonly ActiveEffect[], ctx: TriggerCtx): void {
  for (const e of ended) {
    const owner = ctx.heroes.find((h) => h.id === e.sourceId);
    if (owner === undefined) continue;
    for (const { def, event } of triggersOn(owner, 'effectEnd')) {
      if (event.effectKey === e.defKey) fire(owner, def, holder, ctx);
    }
  }
}

/** Once per tick: fire the "an ally is low" triggers while some living hero is under their share of life.
 *  (Written as plain loops: it runs every tick for every hero, so it allocates nothing.) */
export function checkLowHp(ctx: TriggerCtx): void {
  for (const h of ctx.heroes) {
    if (h.triggers === undefined || !h.alive) continue;
    for (const def of h.triggers) {
      if (def.event.on !== 'allyHpBelow') continue;
      const frac = def.event.frac;
      const low = ctx.heroes.find((a) => a.alive && a.hp > 0 && a.hp < a.maxHp * frac);
      if (low !== undefined) fire(h, def, low, ctx);
    }
  }
}
