import type { StatKey } from '@/data/stats';
import type { ChestStack } from '@/data/chests';
import type { ActiveEffect } from '@/data/effects';
import type { StatMod } from './stats';
import type { ResolvedAbility } from './loadout';
import type { UltimateDef } from '@/data/ultimates';

// The mutable runtime state the Simulation owns and ticks. Combat mutates these
// objects in place within a tick (deterministic — no hidden global state). The
// state layer mirrors the player-facing parts into the save-shaped store.

export interface Combatant {
  id: string;
  side: 'hero' | 'enemy';
  classKey?: string;
  hp: number;
  maxHp: number;
  baseStats: Partial<Record<StatKey, number>>;
  staticMods: StatMod[]; // gear + talents + tech (heroes); empty for enemies
  effects: ActiveEffect[];
  cooldowns: Record<string, number>; // abilityKey -> remainingMs
  cooldownTotals?: Record<string, number>; // abilityKey -> full cooldown of the last cast (for UI fill); display-only
  charges?: Record<string, number>; // abilityKey -> charges banked (charge-gated abilities, e.g. Aimed Shot)
  gcdMs?: number; // global cooldown: ms until this combatant may cast ANY ability again (heroes)
  attackTimerMs: number;
  x: number; // world position (heroes derived from partyX; enemies advance left)
  range: number; // attack reach (world px) — melee short, ranged/caster long
  moveSpeed: number; // px/s an enemy advances toward the party (0 for heroes)
  alive: boolean;
  respawnMs?: number; // when a hero is dead: ms left until it revives (heroes only); undefined = not respawning
  abilities: ResolvedAbility[];
  movedThisTick?: boolean; // closed distance this tick → can't attack on it (must be standing still to fire)
  moveDelayMs?: number; // ranged/caster heroes: a brief, varied hold before resuming a forward chase
  //   (set when they stop, counts down) — desyncs the back line so it shuffles, not marches as one.
  fightMs?: number; // time this combatant has been fighting (drives boss enrage)
  // ── ultimate (hero-only; resolved at L30 in loadout) ──
  ult?: UltimateDef; // the class ult IF unlocked (level ≥ 30); undefined otherwise
  ultCharge?: number; // remaining death-block charges this stage (deathBlock ults only)
  // enemy-only precomputed combat values (stage-scaled at spawn):
  enemyDamage?: number;
  enemyAttackSpeed?: number;
  enemyMagic?: boolean;
  isBoss?: boolean;
  isElite?: boolean; // a beefed-up "champion" trash mob (2× hp/dmg, 2× chest) — render bigger
  enrageMs?: number; // enrage window for this boss (Infinity = never; zone boss = 30s)
  bossUltTriggered?: boolean; // boss-only: the party's onBossEngage ults have fired for this boss
}

// Render/accrual event emitted by a combat tick (lives here so both combat.ts and
// abilities.ts can produce them without an import cycle).
export interface CombatEvent {
  type: 'damage' | 'heal' | 'death' | 'cast';
  targetId: string;
  sourceId?: string;
  amount?: number;
  crit?: boolean;
  blocked?: boolean; // the target blocked this hit (block-stat proc) — drives the block animation
  invuln?: boolean; // the hit was negated by invulnerability (Last Stand) — render "INVULNERABLE"
  abilityKey?: string;
  tick?: boolean; // a DoT/HoT periodic tick (render as a number; no attack animation)
}

export type StagePhase = 'advancing' | 'fighting' | 'boss' | 'zoneBoss' | 'walled';

export interface PendingAccrual {
  gold: number;
  xp: number;
  petDrops: string[];
}

export interface WorldState {
  tick: number;
  seed: number;
  rngState: number;
  globalStageIndex: number;
  /** Highest stage whose boss has EVER been beaten (monotonic; NOT lowered by
   *  travelling back to farm). Drives the travel-unlock set + the refresh resume
   *  point. 0 = no boss beaten yet. */
  maxClearedStage: number;
  wavesThisStage: number; // cleared waves (0..WAVES_PER_STAGE) → each = 5% progress
  stageProgress: number; // 0..1 toward boss spawn
  phase: StagePhase;
  heroes: Combatant[];
  enemies: Combatant[];
  /** Enemies of the current wave not yet on the field — released over ~5s so the
   *  wave trickles in from the edge instead of appearing all at once. */
  waveQueue: { combatant: Combatant; releaseTick: number; spawnOffset: number }[];
  partyX: number; // lead-hero world position; monotonically increases (walk forward)
  advanceTimerMs: number; // brief walk before the next wave spawns
  chests: ChestStack[]; // authoritative unopened-chest counts (caps enforced here)
  pending: PendingAccrual; // gold/xp/pet drains the state layer applies to the store
  /** Diagnostic: total full-party wipes this run (monotonic). Not persisted; used by
   *  the balance probes to gauge early-game survivability. */
  wipes: number;
  /** Set when the party has fully wiped and the death cinematic is playing: ELAPSED ms
   *  into the sequence (0 → WIPE_TOTAL_MS). The render reads it to drive the fade-to-black,
   *  phrase, and respawn beats. undefined = not wiping. */
  wipeMs?: number;
}

export function emptyPending(): PendingAccrual {
  return { gold: 0, xp: 0, petDrops: [] };
}
