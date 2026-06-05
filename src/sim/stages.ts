import type { Rng } from './rng';
import type { Combatant, WorldState } from './world';
import type { ResolvedAbility } from './loadout';
import { abilityDef, worldBossAbilityKeys } from '@/data/abilities';
import { difficultyIndexOf } from '@/data/difficulties';
import { pickEnemyKind, type EnemyKind } from '@/data/enemies';
import { RANGE, MOVE_SPEED, SPAWN_AHEAD, WAVE_BATCHES, WAVE_BATCH_TICKS, WAVE_SPAWN_BAND } from '@/data/field';
import {
  enemyHp,
  enemyDamage,
  ENEMY_BASE_ATTACK_SPEED,
  stageBossHp,
  BOSS_DMG_MULT,
  zoneBossHp,
  ZONE_BOSS_DMG_MULT,
  TRASH_HP_FRACTION,
  TRASH_DMG_FRACTION,
  waveSizeForStage,
  ELITE_CHANCE,
  ELITE_MIN_STAGE,
  ELITE_HP_MULT,
  ELITE_DMG_MULT,
  ZONE_ENRAGE_MS,
  STAGE_ENRAGE_MS,
} from '@/data/stageScaling';

// Enemy spawning. Waves of 2–8 mixed kinds spawn ahead of the party and advance.
// Trash are weaker (TRASH_HP_FRACTION); bosses use full reference HP × their mult.

interface EnemySpec {
  hpMult: number; // multiplies the reference enemyHp(S) — IGNORED when hpAbsolute is set (bosses)
  hpAbsolute?: number; // decoupled boss HP (stageBossHp/zoneBossHp); overrides hpMult when present
  dmgMult: number;
  magic: boolean;
  range: number;
  moveSpeed: number;
  abilities: ResolvedAbility[];
  isBoss: boolean;
  isElite: boolean;
  enrageMs: number;
}

function makeEnemy(world: WorldState, S: number, index: number, x: number, spec: EnemySpec): Combatant {
  const maxHp = spec.hpAbsolute ?? enemyHp(S) * spec.hpMult;
  const aspd = spec.isBoss ? ENEMY_BASE_ATTACK_SPEED : ENEMY_BASE_ATTACK_SPEED + ((index % 5) - 2) * 0.05;
  return {
    id: `e${S}_${world.tick}_${index}`,
    side: 'enemy',
    hp: maxHp,
    maxHp,
    baseStats: {},
    staticMods: [],
    effects: [],
    cooldowns: {},
    attackTimerMs: 1000 / Math.max(0.05, aspd),
    x,
    range: spec.range,
    moveSpeed: spec.moveSpeed,
    abilities: spec.abilities,
    alive: true,
    fightMs: 0,
    enemyDamage: enemyDamage(S) * spec.dmgMult,
    enemyAttackSpeed: Math.max(0.4, aspd),
    enemyMagic: spec.magic,
    isBoss: spec.isBoss,
    isElite: spec.isElite,
    enrageMs: spec.enrageMs,
  };
}

function trashSpec(kind: EnemyKind): EnemySpec {
  return {
    hpMult: kind.hpMult * TRASH_HP_FRACTION,
    dmgMult: kind.dmgMult * TRASH_DMG_FRACTION,
    magic: kind.magic,
    range: kind.range,
    moveSpeed: kind.moveSpeed,
    abilities: kind.abilities.map((a) => ({ def: abilityDef(a), rank: 1 })),
    isBoss: false,
    isElite: false,
    enrageMs: STAGE_ENRAGE_MS,
  };
}

// An ELITE is a normal trash mob of its kind, beefed: 2× HP + 2× damage (still on top of
// the trash fractions, so an elite ≈ 2× a soldier — punchy, below boss level). The 2× chest
// chance is applied on kill (Simulation.awardKill). Render reads `isElite` to draw it bigger.
function eliteSpec(kind: EnemyKind): EnemySpec {
  const base = trashSpec(kind);
  return { ...base, hpMult: base.hpMult * ELITE_HP_MULT, dmgMult: base.dmgMult * ELITE_DMG_MULT, isElite: true };
}

/** Split a wave of `total` mobs into WAVE_BATCHES batches, each ≥1, with random sizes
 *  (e.g. 5 → 2+2+1; 10 → 3+5+2 or 1+1+8) — the random "summoned in groups" cadence. */
function partitionWave(total: number, rng: Rng): number[] {
  const batches = Array.from({ length: WAVE_BATCHES }, () => 1);
  for (let extra = total - WAVE_BATCHES; extra > 0; extra--) batches[rng.int(WAVE_BATCHES)]! += 1;
  return batches;
}

/** Queue a wave of mixed enemies that TELEPORT IN as WAVE_BATCHES groups, one every 2s.
 *  Each batch is a random slice of the wave (partitionWave); its mobs land a fixed distance
 *  ahead of the party's frontline at release (Simulation.releaseWave), spread across a band
 *  so they arrive as a loose summoned group. The wave SIZE ramps by the stage's position in
 *  its world (X-1 = 5 … X-9 = 15), so a world gets harder the deeper its stage. Composition
 *  also ramps with stage (ranged gating). Each mob has an ELITE_CHANCE to be a champion. */
export function spawnWave(world: WorldState, rng: Rng): void {
  const S = world.globalStageIndex;
  const count = waveSizeForStage(S); // ramps X-1 (5) … X-9 (15)
  const batches = partitionWave(count, rng);
  world.enemies = [];
  world.waveQueue = [];
  let index = 0;
  for (let b = 0; b < batches.length; b++) {
    const releaseTick = world.tick + b * WAVE_BATCH_TICKS; // batch b teleports in at b seconds
    for (let j = 0; j < batches[b]!; j++) {
      const kind = pickEnemyKind(rng.next(), S);
      // Roll the elite chance ALWAYS (keep the RNG stream stable), but gate the result so the
      // opening stages (before ELITE_MIN_STAGE) are elite-free — a fresh naked Knight can't survive
      // an early champion spike before it has any gear.
      const spec = rng.chance(ELITE_CHANCE) && S >= ELITE_MIN_STAGE ? eliteSpec(kind) : trashSpec(kind);
      const combatant = makeEnemy(world, S, index, world.partyX + SPAWN_AHEAD, spec);
      const spawnOffset = rng.int(WAVE_SPAWN_BAND); // spread within the batch's band (anti-stack)
      world.waveQueue.push({ combatant, releaseTick, spawnOffset });
      index++;
    }
  }
  world.phase = 'fighting';
}

// A boss appearing wipes the party's ability cooldowns clean — every cast comes back up
// for the fight that matters, so the burst lands on the boss, not the trash before it.
// Charge-gated abilities (e.g. Aimed Shot) have no cooldown and rebuild from attacks, so
// they're left untouched.
function readyAbilitiesForBoss(world: WorldState): void {
  for (const h of world.heroes) {
    h.cooldowns = {};
    h.cooldownTotals = {};
  }
}

export function spawnStageBoss(world: WorldState, rng: Rng): void {
  const S = world.globalStageIndex;
  world.enemies = [
    makeEnemy(world, S, 0, world.partyX + SPAWN_AHEAD, {
      // Decoupled stage-boss HP (own Φ-power scale; early-world bossHpRamp lives inside it).
      hpMult: 0,
      hpAbsolute: stageBossHp(S),
      dmgMult: BOSS_DMG_MULT,
      magic: rng.chance(0.4),
      range: RANGE.melee + 15, // bigger sprite → stop further from the tank so it doesn't overlap it
      moveSpeed: MOVE_SPEED.melee,
      abilities: [],
      isBoss: true,
      isElite: false,
      enrageMs: STAGE_ENRAGE_MS,
    }),
  ];
  readyAbilitiesForBoss(world);
  world.phase = 'boss';
}

export function spawnZoneBoss(world: WorldState, rng: Rng): void {
  const S = world.globalStageIndex;
  world.enemies = [
    makeEnemy(world, S, 0, world.partyX + SPAWN_AHEAD, {
      // Decoupled zone-boss HP (own Φ-power scale — THE wall; grows steeper than party power).
      hpMult: 0,
      hpAbsolute: zoneBossHp(S),
      dmgMult: ZONE_BOSS_DMG_MULT,
      magic: rng.chance(0.4),
      range: RANGE.melee + 30, // towering sprite → stop well clear of the tank
      moveSpeed: MOVE_SPEED.melee,
      // +1 ability per difficulty (DIFFICULTY.md §5): Normal cleaves; Torment wields all five.
      abilities: worldBossAbilityKeys(difficultyIndexOf(S)).map((k) => ({ def: abilityDef(k), rank: 1 })),
      isBoss: true,
      isElite: false,
      enrageMs: ZONE_ENRAGE_MS, // the 30s DPS+survival gate
    }),
  ];
  readyAbilitiesForBoss(world);
  world.phase = 'zoneBoss';
}
