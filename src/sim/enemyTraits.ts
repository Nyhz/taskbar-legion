import type { Combatant, CombatEvent, WorldState } from './world';
import { effectStatMods, healReceivedMult } from './effects';
import { TRAIT_TUNING, auraValue, type EnemyTrait, type SupportAura } from '@/data/enemies';
import { difficultyIndexOf } from '@/data/difficulties';

// What the wave enemies' TRAITS and the SUPPORT's auras do (numbers: data/enemies.ts). Pure and deterministic:
// nothing here draws from the combat rng. None of it is an effect — nothing for Purify to chase, no chip, no body
// look: an enemy carries plain marks (`traits`, `guardUp`, `rousedMs`, `underAuras`, `aegis`) that the combat
// loop reads at a handful of places, and the strip shows as a tint or a brief flash (render/foeFx).

export function hasTrait(e: Combatant, trait: EnemyTrait): boolean {
  return e.traits !== undefined && e.traits.includes(trait);
}

/** Rabia: a beast under half its life (Hell on). The strip tints its body while this holds. */
export function isEnraged(e: Combatant): boolean {
  return e.alive && hasTrait(e, 'rage') && e.hp < e.maxHp * TRAIT_TUNING.rage.hpBelow;
}

/** Imparable: nothing slows it (Inferno on, the brute). */
export function cannotBeSlowed(e: Combatant): boolean {
  return hasTrait(e, 'unstoppable');
}

/** How much faster it ATTACKS, in % (its walk is untouched): Rabia, the rousing of a fallen soldier's Último
 *  aliento, the support's Furia. */
export function attackHastePct(e: Combatant): number {
  let pct = 0;
  if (isEnraged(e)) pct += TRAIT_TUNING.rage.attackSpeedPct;
  if ((e.rousedMs ?? 0) > 0) pct += TRAIT_TUNING.lastBreath.attackSpeedPct;
  pct += e.underAuras?.fury ?? 0;
  return pct;
}

/** What it deals, against its plain damage: the support's Saña — and, for a boss, an attack-damage buff it has
 *  taken for itself (Espejos reflecting a hero's: Battle Cry…), which makes its blows and its abilities land that
 *  much harder while it lasts (user decision, 2026-11-15). */
export function foeDamageMult(e: Combatant): number {
  let mult = 1 + (e.underAuras?.malice ?? 0) / 100;
  if (e.isBoss === true && e.effects.length > 0) {
    let pct = 0;
    for (const m of effectStatMods(e.effects)) if (m.key === 'attackDamage' && m.mode === 'percent') pct += m.value;
    if (pct > 0) mult *= 1 + pct / 100;
  }
  return mult;
}

/**
 * A hero's damage about to land on a wave enemy: what is left of it after the enemy's own protections.
 * Guardia parries the first DIRECT hit whole (a bleed or a burn is not a hit); Aguante takes a share off
 * everything; Égida's shield soaks what remains. Called right before a boss's shell would be (the two never meet:
 * a boss has neither traits nor auras).
 */
export function foeWard(victim: Combatant, dmg: number, direct: boolean, events?: CombatEvent[]): number {
  if (victim.side !== 'enemy' || dmg <= 0) return dmg;
  if (direct && victim.guardUp === true) {
    victim.guardUp = false;
    events?.push({ type: 'cue', targetId: victim.id, cue: 'guard' });
    return 0;
  }
  const auras = victim.underAuras;
  if (auras === undefined) return dmg;
  let left = dmg * (1 - (auras.toughness ?? 0) / 100);
  const shield = victim.aegis ?? 0;
  if (shield > 0) {
    const soaked = Math.min(shield, left);
    victim.aegis = shield - soaked;
    left -= soaked;
  }
  return left;
}

/** Tiro cargado: counts a shooter's basic shot; true for the one in four that is charged. */
export function chargedShot(e: Combatant): boolean {
  if (!hasTrait(e, 'chargedShot')) return false;
  e.shots = (e.shots ?? 0) + 1;
  return e.shots % TRAIT_TUNING.chargedShot.every === 0;
}

/** Embestida: true for the FIRST basic attack a beast lands (Inferno on) — it hits harder; spent by asking. */
export function chargeHit(e: Combatant): boolean {
  if (e.chargeUp !== true) return false;
  e.chargeUp = false;
  return true;
}

/** How much harder this basic attack of `e` hits, and whether it is one to show (a charged shot flies lit, a
 *  beast's charge bursts on the hero): Tiro cargado, Embestida. Counts the shot and spends the charge. */
export function heavyHit(e: Combatant): number {
  if (chargedShot(e)) return TRAIT_TUNING.chargedShot.mult;
  if (chargeHit(e)) return TRAIT_TUNING.charge.mult;
  return 1;
}

/** The share of a shooter's basic shots that go over the tank (Fuego concentrado raises it). */
export function backShotChance(e: Combatant): number {
  const own = e.backShotChance ?? 0;
  return own > 0 && hasTrait(e, 'focusFire') ? TRAIT_TUNING.focusFire.backShotChance : own;
}

/**
 * Fuego concentrado: the ONE hero every focusing shooter's lofted shots land on — or undefined when no living
 * shooter focuses, or nobody stands behind the front hero. The same hero for the whole wave (a function of the
 * run, the stage and the wave), moving on only when that hero falls. The strip draws its reticle from this.
 */
export function focusedHero(world: Pick<WorldState, 'seed' | 'globalStageIndex' | 'wavesThisStage' | 'heroes' | 'enemies'>): Combatant | undefined {
  if (!world.enemies.some((e) => e.alive && e.engaged === true && hasTrait(e, 'focusFire'))) return undefined;
  let front: Combatant | undefined;
  for (const h of world.heroes) if (h.alive && (front === undefined || h.x > front.x)) front = h;
  const behind = world.heroes.filter((h) => h.alive && h !== front);
  if (behind.length === 0) return undefined;
  let k = (world.seed ^ Math.imul(world.globalStageIndex + 1, 0x9e3779b1) ^ Math.imul(world.wavesThisStage + 1, 0xc2b2ae35)) >>> 0;
  k = Math.imul(k ^ (k >>> 15), 0x2c1b3c6d) >>> 0;
  return behind[(k ^ (k >>> 13)) % behind.length];
}

/** What a living support's auras are worth on each enemy of its wave this tick — or nothing, with no support. */
function aurasOfWave(enemies: readonly Combatant[], S: number): Readonly<Partial<Record<SupportAura, number>>> | undefined {
  const support = enemies.find((e) => e.alive && e.auras !== undefined && e.auras.length > 0);
  if (support?.auras === undefined) return undefined;
  const d = difficultyIndexOf(S);
  const out: Partial<Record<SupportAura, number>> = {};
  for (const key of support.auras) out[key as SupportAura] = auraValue(key as SupportAura, d);
  return out;
}

/** Hand the support's auras to every living enemy of its wave (itself too), or take them away the moment it is
 *  gone. Égida's shield is given once, when the aura first reaches an enemy, and goes with the aura. */
export function refreshAuras(enemies: readonly Combatant[], S: number): void {
  const auras = aurasOfWave(enemies, S);
  for (const e of enemies) {
    if (!e.alive || e.isBoss === true || e.summon !== undefined) continue;
    e.underAuras = auras;
    if (auras?.aegis === undefined) {
      e.aegis = undefined;
    } else if (e.aegisGiven !== true) {
      e.aegisGiven = true;
      e.aegis = (e.maxHp * auras.aegis) / 100;
    }
  }
}

/** The wave's clocks, once per tick after upkeep: the auras, Vigor's regeneration, the rousing running out. */
export function tickFoeTraits(enemies: readonly Combatant[], S: number, deltaMs: number): void {
  refreshAuras(enemies, S);
  for (const e of enemies) {
    if (!e.alive) continue;
    if ((e.rousedMs ?? 0) > 0) e.rousedMs = Math.max(0, (e.rousedMs ?? 0) - deltaMs);
    const vigor = e.underAuras?.vigor ?? 0;
    if (vigor > 0 && e.hp > 0 && e.hp < e.maxHp) {
      e.hp = Math.min(e.maxHp, e.hp + ((e.maxHp * vigor) / 100) * (deltaMs / 1000) * healReceivedMult(e.effects));
    }
  }
}

/** A wave enemy has just died. Último aliento rouses the rest of its wave; a support takes its auras with it. */
export function onFoeDeath(dead: Combatant, enemies: readonly Combatant[], events: CombatEvent[]): void {
  if (hasTrait(dead, 'lastBreath')) {
    let roused = false;
    for (const e of enemies) {
      if (!e.alive || e === dead || e.isBoss === true || e.summon !== undefined) continue;
      e.rousedMs = TRAIT_TUNING.lastBreath.ms;
      roused = true;
    }
    if (roused) events.push({ type: 'cue', targetId: dead.id, cue: 'lastBreath' });
  }
  if (dead.auras !== undefined && dead.auras.length > 0) {
    // The auras end NOW (a wave never has two supports), not at the next tick.
    for (const e of enemies) {
      e.underAuras = undefined;
      e.aegis = undefined;
    }
    events.push({ type: 'cue', targetId: dead.id, cue: 'supportDown' });
  }
}
