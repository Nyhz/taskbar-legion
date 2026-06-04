import { aggregate, type StatMod } from './stats';
import type { ItemInstance } from './items';
import type { Combatant } from './world';
import { gemGrants } from './gems';
import type { StatKey } from '@/data/stats';
import { STATS } from '@/data/stats';
import type { SlotKey } from '@/data/itemSlots';
import { classDef } from '@/data/classes';
import { talentNodes } from '@/data/talents';
import type { AbilityDef } from '@/data/abilities';
import { abilityDef } from '@/data/abilities';
import type { UltimateDef } from '@/data/ultimates';
import { ultimateForClass } from '@/data/ultimates';

// Reduces player config (class+level, equipment, talents) into the inputs the
// pure combat sim consumes: base stats + static StatMods + ranked abilities. This
// lives in sim/ (pure) so both the live game (state/) and the headless harness
// build hero inputs the same way.

export interface ResolvedAbility {
  def: AbilityDef;
  rank: number;
}

function modeFor(key: StatKey): 'flat' | 'percent' {
  return STATS[key].kind;
}

/** Class base stats grown to the given level. */
export function heroBaseStats(classKey: string, level: number): Partial<Record<StatKey, number>> {
  const def = classDef(classKey);
  const out: Partial<Record<StatKey, number>> = { ...def.baseStats };
  const steps = Math.max(0, level - 1);
  for (const [k, growth] of Object.entries(def.statGrowthPerLevel)) {
    const key = k as StatKey;
    out[key] = (out[key] ?? 0) + (growth ?? 0) * steps;
  }
  return out;
}

/** StatMods from one equipped item: base affix(es) + substats + socketed gem grants. */
export function itemMods(item: ItemInstance): StatMod[] {
  const mods: StatMod[] = [];
  for (const b of item.baseAffix) mods.push({ key: b.key, mode: modeFor(b.key), value: b.value });
  for (const s of item.stats) mods.push({ key: s.key, mode: modeFor(s.key), value: s.value });
  for (const socket of item.sockets) {
    if (socket.gem === null) continue;
    for (const grant of gemGrants(socket.gem)) {
      mods.push({ key: grant.key, mode: modeFor(grant.key), value: grant.value });
    }
  }
  return mods;
}

export function equipmentMods(equipment: Partial<Record<SlotKey, ItemInstance>>): StatMod[] {
  const mods: StatMod[] = [];
  for (const item of Object.values(equipment)) {
    if (item !== undefined) mods.push(...itemMods(item));
  }
  return mods;
}

/** StatMods from a hero's purchased talent passives. */
export function talentPassiveMods(classKey: string, talents: Record<string, number>): StatMod[] {
  const mods: StatMod[] = [];
  for (const node of talentNodes(classKey)) {
    if (node.kind !== 'passive' || node.passive === undefined) continue;
    const rank = talents[node.key] ?? 0;
    if (rank <= 0) continue;
    mods.push({ key: node.passive.stat, mode: node.passive.mode, value: node.passive.valuePerRank * rank });
  }
  return mods;
}

/** Party-wide AURA stat-mods: every ability that is a passive aura AND slotted (in a
 *  hero's activeAbilities) contributes its bonus to the WHOLE party. `activeAbilities`
 *  undefined (the headless harness) counts every ranked aura as slotted. The returned
 *  mods are added to every hero's static mods at build time. */
export function partyAuraMods(roster: readonly HeroConfig[]): StatMod[] {
  const mods: StatMod[] = [];
  for (const h of roster) {
    const active = h.activeAbilities;
    for (const node of talentNodes(h.classKey)) {
      if (node.kind !== 'ability' || node.abilityKey === undefined) continue;
      const def = abilityDef(node.abilityKey);
      if (def.aura === undefined) continue;
      if (active !== undefined && !active.includes(def.key)) continue; // must be slotted
      const rank = h.talents[node.key] ?? 0;
      if (rank <= 0) continue;
      const value = def.aura.baseValue + def.aura.valuePerRank * (rank - 1);
      mods.push({ key: def.aura.stat, mode: modeFor(def.aura.stat), value });
    }
  }
  return mods;
}

/** The maximum abilities a hero fires at once (the player picks which — DATA_MODEL). */
export const MAX_ACTIVE_ABILITIES = 2;

/** Whether the hero may put the FIRST point into a not-yet-ranked ability node. The ranked
 *  ability set IS the active loadout (no separate selection), so learning a NEW ability is
 *  blocked once MAX_ACTIVE_ABILITIES are already ranked — ranking an already-learned ability
 *  further, and all passive nodes, are unaffected. */
export function canLearnNewAbility(classKey: string, talents: Record<string, number>): boolean {
  return heroAbilities(classKey, talents).length < MAX_ACTIVE_ABILITIES;
}

/** Every ability a hero has unlocked (talent ability nodes with rank > 0), with rank.
 *  Capped at MAX_ACTIVE_ABILITIES by the talent-tree gate, so this POOL is exactly the
 *  hero's active loadout. */
export function heroAbilities(classKey: string, talents: Record<string, number>): ResolvedAbility[] {
  const out: ResolvedAbility[] = [];
  for (const node of talentNodes(classKey)) {
    if (node.kind !== 'ability' || node.abilityKey === undefined) continue;
    const rank = talents[node.key] ?? 0;
    if (rank <= 0) continue;
    out.push({ def: abilityDef(node.abilityKey), rank });
  }
  return out;
}

/** The abilities a hero actually casts in combat. `active` is the player's selection:
 *   - `undefined` → no selection layer (some probes): ALL unlocked abilities fire.
 *   - `[]` → the player chose NOTHING → casts NO abilities (only the ult, which is
 *     separate, still fires). Pass `autoDefault` to instead seed the first up-to-2
 *     unlocked abilities — the balance harness uses this to field a realistic loadout
 *     without managing a selection as abilities unlock over a run.
 *   - non-empty → exactly those keys (capped at 2, only ones actually ranked), in order.
 *
 * IMPORTANT: the live game (engine.toConfig) passes the player's selection verbatim with
 * `autoDefault` OFF, so unselecting every ability genuinely stops them from firing. */
export function activeHeroAbilities(
  classKey: string,
  talents: Record<string, number>,
  active: readonly string[] | undefined,
  autoDefault = false,
): ResolvedAbility[] {
  const pool = heroAbilities(classKey, talents);
  if (active === undefined) return pool;
  if (active.length === 0) return autoDefault ? pool.slice(0, MAX_ACTIVE_ABILITIES) : [];
  return active
    .flatMap((key) => { const r = pool.find((a) => a.def.key === key); return r ? [r] : []; })
    .slice(0, MAX_ACTIVE_ABILITIES);
}

/** The hero's class ultimate if unlocked at this level (≥30), plus its starting
 *  per-stage charge (death-block ults arm with `chargesPerStage`; others use none). */
export function resolveUltimate(classKey: string, level: number): { ult: UltimateDef | undefined; ultCharge: number } {
  const ult = ultimateForClass(classKey, level);
  const ultCharge = ult?.effect.type === 'deathBlock' ? ult.effect.chargesPerStage : 0;
  return { ult, ultCharge };
}

export interface HeroConfig {
  id: string;
  classKey: string;
  level: number;
  equipment: Partial<Record<SlotKey, ItemInstance>>;
  talents: Record<string, number>;
  /** player-selected active ability keys (≤2). An empty array means NO abilities fire.
   *  Omit entirely (undefined) for the "full kit" probe behavior. */
  activeAbilities?: string[];
  /** Probe-only: when true, an EMPTY `activeAbilities` is auto-filled with the first ≤2
   *  unlocked abilities (a default loadout). The live game leaves this off so an empty
   *  selection casts nothing. */
  autoDefaultAbilities?: boolean;
}

/** Full static StatMod set for a hero: gear + talents + party-wide tech combat mods. */
export function heroStaticMods(config: HeroConfig, combatMods: readonly StatMod[]): StatMod[] {
  return [
    ...equipmentMods(config.equipment),
    ...talentPassiveMods(config.classKey, config.talents),
    ...combatMods,
  ];
}

/** Build a fresh combatant (full HP) from a hero config + party-wide combat mods. */
export function buildHeroCombatant(config: HeroConfig, combatMods: readonly StatMod[]): Combatant {
  const baseStats = heroBaseStats(config.classKey, config.level);
  const staticMods = heroStaticMods(config, combatMods);
  const maxHp = aggregate(baseStats, staticMods).health;
  const { ult, ultCharge } = resolveUltimate(config.classKey, config.level);
  return {
    id: config.id,
    side: 'hero',
    classKey: config.classKey,
    hp: maxHp,
    maxHp,
    baseStats,
    staticMods,
    effects: [],
    cooldowns: {},
    attackTimerMs: 0,
    x: 0,
    range: classDef(config.classKey).range,
    moveSpeed: 0, // heroes hold formation; only partyX advances them
    abilities: activeHeroAbilities(config.classKey, config.talents, config.activeAbilities, config.autoDefaultAbilities),
    alive: true,
    ult,
    ultCharge,
  };
}

/** Recompute a hero combatant's loadout in place (after equip/talent/tech change),
 *  preserving the current HP fraction so a swap mid-fight isn't a free full heal. */
export function refreshHeroLoadout(
  hero: Combatant,
  config: HeroConfig,
  combatMods: readonly StatMod[],
): void {
  const frac = hero.maxHp > 0 ? hero.hp / hero.maxHp : 1;
  hero.baseStats = heroBaseStats(config.classKey, config.level);
  hero.staticMods = heroStaticMods(config, combatMods);
  hero.maxHp = aggregate(hero.baseStats, hero.staticMods).health;
  hero.hp = Math.min(hero.maxHp, Math.max(1, hero.maxHp * frac));
  hero.abilities = activeHeroAbilities(config.classKey, config.talents, config.activeAbilities, config.autoDefaultAbilities);
  // Re-resolve the ult (it may have just unlocked at L30). Preserve the current charge
  // on a mid-fight refresh (equip/talent change) — only a stage advance refills it.
  const { ult, ultCharge } = resolveUltimate(config.classKey, config.level);
  const hadUlt = hero.ult !== undefined;
  hero.ult = ult;
  if (ult === undefined) hero.ultCharge = 0;
  else if (!hadUlt) hero.ultCharge = ultCharge; // just unlocked → arm it
}
