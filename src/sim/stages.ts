import type { Rng } from './rng';
import type { Combatant, WorldState } from './world';
import type { ResolvedAbility } from './loadout';
import { abilityDef } from '@/data/abilities';
import { pickEnemyKind, type EnemyKind } from '@/data/enemies';
import { RANGE, MOVE_SPEED, SPAWN_AHEAD, WAVE_SPAWN_TICKS } from '@/data/field';
import {
  enemyHp,
  enemyDamage,
  ENEMY_BASE_ATTACK_SPEED,
  BOSS_HP_MULT,
  bossHpRamp,
  BOSS_DMG_MULT,
  ZONE_BOSS_HP_MULT,
  ZONE_BOSS_DMG_MULT,
  zoneWallHpFactor,
  worldOf,
  TRASH_HP_FRACTION,
  TRASH_DMG_FRACTION,
  WAVE_MIN,
  waveMax,
  ZONE_ENRAGE_MS,
  STAGE_ENRAGE_MS,
} from '@/data/stageScaling';

// Enemy spawning. Waves of 2–8 mixed kinds spawn ahead of the party and advance.
// Trash are weaker (TRASH_HP_FRACTION); bosses use full reference HP × their mult.

interface EnemySpec {
  hpMult: number; // multiplies the reference enemyHp(S)
  dmgMult: number;
  magic: boolean;
  range: number;
  moveSpeed: number;
  abilities: ResolvedAbility[];
  isBoss: boolean;
  enrageMs: number;
}

function makeEnemy(world: WorldState, S: number, index: number, x: number, spec: EnemySpec): Combatant {
  const maxHp = enemyHp(S) * spec.hpMult;
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
    enrageMs: STAGE_ENRAGE_MS,
  };
}

/** Queue a wave of mixed enemies (2-5 through world 1, 2-8 from stage 11); they're
 *  released from the edge over ~5s (staggered), so the wave trickles in rather than
 *  appearing all at once. The Simulation sets each enemy's spawn x at release time. */
export function spawnWave(world: WorldState, rng: Rng): void {
  const S = world.globalStageIndex;
  const count = WAVE_MIN + rng.int(waveMax(S) - WAVE_MIN + 1);
  world.enemies = [];
  world.waveQueue = [];
  for (let i = 0; i < count; i++) {
    // Composition ramps with stage (ranged gated in over the early worlds); SIZE does not.
    const kind = pickEnemyKind(rng.next(), S);
    const combatant = makeEnemy(world, S, i, world.partyX + SPAWN_AHEAD, trashSpec(kind));
    // Irregular arrivals: each enemy spawns at a RANDOM tick within the ~3s window,
    // so the wave bunches and trails unevenly rather than marching in lockstep.
    const releaseTick = world.tick + rng.int(WAVE_SPAWN_TICKS + 1);
    world.waveQueue.push({ combatant, releaseTick });
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
    h.gcdMs = 0;
  }
}

export function spawnStageBoss(world: WorldState, rng: Rng): void {
  const S = world.globalStageIndex;
  world.enemies = [
    makeEnemy(world, S, 0, world.partyX + SPAWN_AHEAD, {
      // Early stage bosses (world 1) are scaled down so a fresh party can bootstrap;
      // full ×150 from stage 11 (see bossHpRamp). Zone boss (below) is NOT ramped.
      hpMult: BOSS_HP_MULT * bossHpRamp(S),
      dmgMult: BOSS_DMG_MULT,
      magic: rng.chance(0.4),
      range: RANGE.melee + 8,
      moveSpeed: MOVE_SPEED.melee,
      abilities: [],
      isBoss: true,
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
      hpMult: ZONE_BOSS_HP_MULT * zoneWallHpFactor(worldOf(S)),
      dmgMult: ZONE_BOSS_DMG_MULT,
      magic: rng.chance(0.4),
      range: RANGE.melee + 10,
      moveSpeed: MOVE_SPEED.melee,
      abilities: [],
      isBoss: true,
      enrageMs: ZONE_ENRAGE_MS, // the 30s DPS+survival gate
    }),
  ];
  readyAbilitiesForBoss(world);
  world.phase = 'zoneBoss';
}
