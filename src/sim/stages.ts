import type { Rng } from './rng';
import type { Combatant, WorldState } from './world';
import type { ResolvedAbility } from './loadout';
import { abilityDef } from '@/data/abilities';
import { bossFrontPressure, bossMagicShare, worldBossPressureAt, type BossRank } from '@/data/bossKit';
import { armBoss, bossKit } from './bossMechanics';
import { pickEnemyKind, supportAuras, traitsOf, SUPPORT_KIND, TRAIT_TUNING, type EnemyKind, type EnemyRole } from '@/data/enemies';
import { difficultyIndexOf } from '@/data/difficulties';
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
  trashDmgTune,
  waveSizeForStage,
  ELITE_CHANCE,
  ELITE_MIN_STAGE,
  ELITE_HP_MULT,
  ELITE_DMG_MULT,
  ZONE_ENRAGE_MS,
  STAGE_ENRAGE_MS,
  enrageRampMs,
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
  backShotChance?: number; // share of its basic attacks aimed behind the front hero (shooters)
  role?: EnemyRole; // a wave enemy's kind of behaviour (a boss has none)
  attackSpeedMult?: number; // its swing rate against the common one
}

function makeEnemy(world: WorldState, S: number, index: number, x: number, spec: EnemySpec): Combatant {
  const maxHp = spec.hpAbsolute ?? enemyHp(S) * spec.hpMult;
  const aspd = (spec.isBoss ? ENEMY_BASE_ATTACK_SPEED : ENEMY_BASE_ATTACK_SPEED + ((index % 5) - 2) * 0.05) * (spec.attackSpeedMult ?? 1);
  // A wave enemy's traits at this difficulty (data/enemies ROLE_TRAITS): they accumulate as it rises.
  const traits = spec.role === undefined ? undefined : traitsOf(spec.role, difficultyIndexOf(S));
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
    backShotChance: spec.backShotChance,
    enemyRole: spec.role,
    traits,
    guardUp: traits?.includes('guard') === true ? true : undefined, // Guardia: its first hit is parried
    chargeUp: traits?.includes('charge') === true ? true : undefined, // Embestida: its first blow hits harder
  };
}

/** The abilities a kind casts at global stage `S`: its own, with the brute's area blow swapped for the one that
 *  slows once it has Temblor. */
function kindAbilities(kind: EnemyKind, S: number): ResolvedAbility[] {
  const tremor = traitsOf(kind.role, difficultyIndexOf(S)).includes('tremor');
  return kind.abilities.map((a) => ({ def: abilityDef(tremor && a === TRAIT_TUNING.tremor.replaces ? TRAIT_TUNING.tremor.ability : a), rank: 1 }));
}

function trashSpec(kind: EnemyKind, S: number): EnemySpec {
  return {
    hpMult: kind.hpMult * TRASH_HP_FRACTION,
    dmgMult: kind.dmgMult * TRASH_DMG_FRACTION * trashDmgTune(S), // trash damage has its own tuning table (the anchors)
    magic: kind.magic,
    range: kind.range,
    moveSpeed: kind.moveSpeed,
    abilities: kindAbilities(kind, S),
    isBoss: false,
    isElite: false,
    enrageMs: STAGE_ENRAGE_MS,
    backShotChance: kind.backShotChance,
    role: kind.role,
    attackSpeedMult: kind.attackSpeedMult,
  };
}

// An ELITE is a normal trash mob of its kind, beefed: 2× HP + 2× damage (still on top of
// the trash fractions, so an elite ≈ 2× a soldier — punchy, below boss level). The 2× chest
// chance is applied on kill (Simulation.awardKill). Render reads `isElite` to draw it bigger.
function eliteSpec(kind: EnemyKind, S: number): EnemySpec {
  const base = trashSpec(kind, S);
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
      const spec = rng.chance(ELITE_CHANCE) && S >= ELITE_MIN_STAGE ? eliteSpec(kind, S) : trashSpec(kind, S);
      const combatant = makeEnemy(world, S, index, world.partyX + SPAWN_AHEAD, spec);
      const spawnOffset = rng.int(WAVE_SPAWN_BAND); // spread within the batch's band (anti-stack)
      world.waveQueue.push({ combatant, releaseTick, spawnOffset });
      index++;
    }
  }
  // About one wave in three brings a SUPPORT (data/enemies: from world 3 of Normal; never two): one more enemy,
  // in the first group and at the far end of its band, so it stands furthest back and its auras cover the wave
  // from its first moment. Which waves, and which auras, come from a stream of their own — the combat rng is
  // not touched.
  const auras = supportAuras(world.seed, S, world.wavesThisStage, difficultyIndexOf(S));
  if (auras !== undefined) {
    const support = makeEnemy(world, S, index, world.partyX + SPAWN_AHEAD, trashSpec(SUPPORT_KIND, S));
    support.auras = auras;
    world.waveQueue.push({ combatant: support, releaseTick: world.tick, spawnOffset: WAVE_SPAWN_BAND - 1 });
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
    h.dealtToBoss = 0; // a new boss: nobody has hurt it yet (who its Roots bind)
  }
}

/** Hand a freshly made boss its kit's marks (sim/bossMechanics): its affixes — always a list, empty when it has
 *  none —, its mechanic, its rank; and what the affixes need from the first moment (the shell). */
function dressBoss(boss: Combatant | undefined, kit: ReturnType<typeof bossKit>, rank: BossRank, S: number): void {
  if (boss === undefined) return;
  boss.affixes = kit.affixes;
  boss.mechanic = kit.mechanic;
  boss.bossRank = rank;
  // What it hits with and how hard it leans on the front hero are its own, by data (data/bossKit): the same boss
  // every attempt, so a party can prepare. Its enrage ramp is its difficulty's (data/stageScaling).
  boss.magicShare = bossMagicShare(S, rank);
  boss.frontHitMult = bossFrontPressure(S, rank);
  boss.enrageRampMs = enrageRampMs(difficultyIndexOf(S));
  armBoss(boss);
}

export function spawnStageBoss(world: WorldState, _rng: Rng): void {
  const S = world.globalStageIndex;
  const kit = bossKit(world.seed, S, 'stage');
  world.enemies = [
    makeEnemy(world, S, 0, world.partyX + SPAWN_AHEAD, {
      // Decoupled stage-boss HP (own Φ-power scale; early-world bossHpRamp lives inside it).
      hpMult: 0,
      hpAbsolute: stageBossHp(S),
      dmgMult: BOSS_DMG_MULT,
      magic: false, // its physical/magic mix is its own (dressBoss, data/bossKit BOSS_MAGIC_SHARE)
      range: RANGE.melee + 30, // bigger sprite → stop further from the tank so it doesn't overlap it (+15 reach)
      moveSpeed: MOVE_SPEED.melee,
      // A stage boss's kit: its telegraphed area blow (DIFFICULTY.md §5b) + what its affixes bring (data/bossKit).
      abilities: kit.abilities,
      isBoss: true,
      isElite: false,
      enrageMs: STAGE_ENRAGE_MS,
    }),
  ];
  dressBoss(world.enemies[0], kit, 'stage', S);
  readyAbilitiesForBoss(world);
  world.phase = 'boss';
}

export function spawnZoneBoss(world: WorldState, _rng: Rng): void {
  const S = world.globalStageIndex;
  const kit = bossKit(world.seed, S, 'world');
  world.enemies = [
    makeEnemy(world, S, 0, world.partyX + SPAWN_AHEAD, {
      // Decoupled zone-boss HP (own Φ-power scale — THE wall; grows steeper than party power).
      hpMult: 0,
      hpAbsolute: zoneBossHp(S),
      dmgMult: ZONE_BOSS_DMG_MULT * worldBossPressureAt(S).hitMult, // its minute presses harder by difficulty, eased in over its first worlds (data/bossKit)
      backShotChance: worldBossPressureAt(S).backShotChance,
      magic: false, // its physical/magic mix is its own (dressBoss, data/bossKit BOSS_MAGIC_SHARE)
      range: RANGE.melee + 60, // towering sprite → stop well clear of the tank (+30 reach)
      moveSpeed: MOVE_SPEED.melee,
      // A world boss's kit (data/bossKit): its own mechanic, the telegraphed area blow on every difficulty, and
      // what its affixes bring (one from Inferno, two in Torment).
      abilities: kit.abilities,
      isBoss: true,
      isElite: false,
      enrageMs: ZONE_ENRAGE_MS, // the DPS+survival gate
    }),
  ];
  dressBoss(world.enemies[0], kit, 'world', S);
  readyAbilitiesForBoss(world);
  world.phase = 'zoneBoss';
}
