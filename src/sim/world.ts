import type { StripEventClock } from './stripEvents';
import type { StatKey } from '@/data/stats';
import type { ChestStack } from '@/data/chests';
import type { ActiveEffect } from '@/data/effects';
import type { StatMod } from './stats';
import type { ResolvedAbility } from './loadout';
import type { UltimateDef } from '@/data/ultimates';
import type { TriggerDef } from '@/data/triggers';
import type { PassiveEffect, TargetCondition } from '@/data/talents';

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
  gcdMs?: number; // heroes: ms left of the global cooldown after a cast (data/abilities HERO_GLOBAL_COOLDOWN_MS)
  volleys?: PendingVolley[]; // the waves still to land of an ability that lands in waves (data/abilities `volleys`)
  hotPending?: number; // heroes and foes: healing over time gathered since the last pulse (sim/combat, once a second)
  attackTimerMs: number;
  x: number; // world position (heroes derived from partyX; enemies advance left)
  range: number; // attack reach (world px) — melee short, ranged/caster long
  /** How far its SHOT can pick a target (world px), for the heroes that shoot: longer than `range`, which stays
   *  where it stands (sim/targeting). Undefined: it hits only what it stands next to. */
  shotReach?: number;
  moveSpeed: number; // px/s an enemy advances toward the party (0 for heroes)
  alive: boolean;
  respawnMs?: number; // when a hero is dead: ms left until it revives (heroes only); undefined = not respawning
  abilities: ResolvedAbility[];
  autoSplash?: { coeff: number; radius: number }; // basic-auto AoE (Priest): nearby enemies take coeff× the hit
  movedThisTick?: boolean; // closed distance this tick → can't attack on it (must be standing still to fire)
  moveDelayMs?: number; // ranged/caster heroes: a brief, varied hold before resuming a forward chase
  //   (set when they stop, counts down) — desyncs the back line so it shuffles, not marches as one.
  fightMs?: number; // time this combatant has been fighting (drives boss enrage)
  // ── ultimate (hero-only; resolved at L30 in loadout) ──
  ult?: UltimateDef; // the class ult IF unlocked (level ≥ 30); undefined otherwise
  ultCharge?: number; // remaining death-block charges this stage (deathBlock ults only)
  // ── talent kit (hero-only; resolved from the talents in sim/kit.ts) ──
  triggers?: readonly TriggerDef[]; // ultimate + capstone + modifier + ability triggers (sim/triggers.ts fires them)
  triggerUses?: Record<string, number>; // per-stage uses already spent, by trigger key (refilled with the ult charge)
  lowHpMods?: readonly { hpBelow: number; mod: StatMod }[]; // stats that hold while its own life is under a share
  dealtBonuses?: readonly DealtBonus[]; // more damage / stronger heals depending on who receives them
  partyRegenPct?: number; // while alive: every hero regenerates this % of its max HP per second
  /** Keys of the party auras this hero gives (a role talent with a stat for the whole party; an aura ability):
   *  the strip reads them to draw the ones that have a look. */
  auraKeys?: readonly string[];
  /** Effect passives the hero holds, at their rank (sim/passives.ts). */
  passives?: readonly { def: PassiveEffect; value: number }[];
  // What the party's guard passives mean for this hero this tick (sim/passives.refreshPartyGuards):
  divertPct?: number; // share of each hit aimed at it that the Knight takes instead (Guardian)
  areaLessPct?: number; // less damage from area blows (Close Ranks)
  takenLessPct?: number; // less damage, as the hero with the least life (Mantle)
  overflowPct?: number; // healing that does not fit becomes a shield up to this share of its life (Overflow)
  divertedPhys?: number; // raw damage handed to the Knight this tick, settled at its end
  divertedMagic?: number;
  sheltered?: boolean; // under the Shelter line and already given its protection
  hideStacks?: number; // Weathered Hide: blocked hits banked
  hideMisses?: number; // …and hits in a row without a block
  struckBy?: string[]; // enemy-only: ids of the heroes that have already hit it (First Blood)
  respawnTotalMs?: number; // hero-only: how long this fall waits in all (Revive shortens it) — the count's full bar
  // ── what it has been through lately (sim/recent.ts; the abilities that react read it) ──
  sinceHitMs?: number; // ms since it last took damage (undefined: not yet)
  sinceHeavyHitMs?: number; // ms since a single blow last took a big share of its life
  recentDamage?: number; // running tally of damage taken, fading (who is taking the most right now)
  // ── bookkeeping for triggers ──
  engaged?: boolean; // enemy-only: it has reached the fight (its engage triggers have fired)
  lastHitBy?: string; // enemy-only: id of the hero whose hit or bleed last landed (who gets the kill)
  // enemy-only precomputed combat values (stage-scaled at spawn):
  enemyDamage?: number;
  enemyAttackSpeed?: number;
  enemyMagic?: boolean; // its basic hits are all magic (a support, the Priest's reflection); a boss uses magicShare
  /** Boss-only: the share of its damage that is magic (0.4 or 0.6, data/bossKit BOSS_MAGIC_SHARE) — each hit is split
   *  and each part is mitigated by its own defence. An ability with its own `magic` flag keeps it. */
  magicShare?: number;
  /** What it hits the FRONT hero for — its basic hits on him and its area blow's main hit. A boss: anchored to the
   *  average tank's life (data/stageScaling zoneBossHit / stageBossHit, round 6); a wave enemy: the trash-threat anchor
   *  (TRASH_DMG_TUNE, round 20). Its hits behind keep enemyDamage. */
  frontHit?: number;
  isBoss?: boolean;
  isElite?: boolean; // a beefed-up "champion" trash mob (2× hp/dmg, 2× chest) — render bigger
  // ── what kind of wave enemy it is and what it has gained with the difficulty (data/enemies.ts, sim/enemyTraits.ts) ──
  enemyRole?: 'beast' | 'soldier' | 'shooter' | 'brute' | 'support'; // wave enemies only (a boss or a summon has none)
  traits?: readonly string[]; // its role's traits at this difficulty (data/enemies EnemyTrait), accumulated
  guardUp?: boolean; // Guardia: the first direct hit it takes is parried
  chargeUp?: boolean; // Embestida: its first basic attack is still to land (it hits harder)
  shots?: number; // Tiro cargado: basic shots fired so far
  rousedMs?: number; // Último aliento: ms it still attacks faster, roused by a soldier's death
  auras?: readonly string[]; // a SUPPORT's own auras (data/enemies SupportAura): its whole wave carries them while it lives
  underAuras?: Readonly<Partial<Record<string, number>>>; // what a living support's auras are worth on this enemy now (sim/enemyTraits)
  aegis?: number; // Égida: what is left of the shield it entered with
  aegisGiven?: boolean; // Égida: it has already been given that shield
  backShotChance?: number; // enemy-only: share of its basic attacks that go for a hero behind the front one (data/enemies)
  enrageMs?: number; // enrage window for this boss (Infinity = never; bosses = 60 s)
  enrageRampMs?: number; // boss-only: its damage doubles every this many ms past the window (data/stageScaling enrageRampMs)
  bossUltTriggered?: boolean; // boss-only: the party's onBossEngage ults have fired for this boss
  // Channeled cast in progress (world-boss Frenzy / Mortal Wound): the ability winds up
  // `totalMs` (the cast bar) before its effect resolves. While set, the boss starts no new
  // cast. Render reads this to draw the under-boss cast bar (GameStrip → EnemySprite).
  casting?: { key: string; remainingMs: number; totalMs: number };
  // ── the boss kit (data/bossKit.ts, sim/bossMechanics.ts) ──
  affixes?: readonly string[]; // boss-only: its affix keys (data/bossKit BossAffixKey), in the list's order
  mechanic?: string; // world-boss-only: its own mechanic (data/bossKit BossMechanicKey)
  holdMs?: number; // boss-only: ms it still holds its ground instead of walking up (Resaca: the party was dragged back)
  hpSeen?: number; // boss-only: its life at the end of the last tick (Culpa: what the party took off it since)
  groundFire?: { leftMs: number; dps: number }; // boss-only, Hoja al rojo: the ground under the party still burns
  lastHeroCast?: { key: string; rank: number; heroId?: string }; // boss-only, Espejos: the last ability a hero cast in this fight, and who cast it
  /** Boss-only, Espejos: a reflection that was due while the last one still stood — it steps out when that one is gone. */
  reflectionOwed?: { summon: string; hit: number; stage: number };
  /** hero-only: what a mechanic that takes its toll little by little (Culpa, the burning ground) has cost since
   *  the last number shown, by the ability key the numbers carry. */
  tolls?: Record<string, { dmg: number; ms: number }>;
  bossRank?: 'stage' | 'world'; // boss-only: which numbers of an affix apply to it
  shellBackMs?: number; // Acorazado: ms until the broken shell returns
  frenzyClockMs?: number; // Enfurecido: fight time since the last stack
  /** A summoned creature (a world boss's crows): it leaves when `leftMs` runs out, gives no rewards, and flies to
   *  its place over the back line instead of walking up to the front one. */
  summon?: {
    key: string; leftMs: number; slot: number; toX?: number; left?: boolean;
    /** A reflection (Espejos): the hero it is the dark double of — it goes for him when he stands behind the front one. */
    of?: { heroId: string; classKey: string };
  };
  dealtToBoss?: number; // hero-only: damage dealt to the boss of the fight under way (who Roots binds)
  /** hero-only: the meters of its steady rolls (sim/steady.ts) — a blocked blow, a critical hit or heal, a second strike. */
  steady?: Partial<Record<'block' | 'healCrit' | 'crit' | 'multi' | 'backShot', number>>;
  /** Boss-only, the Crushing Blow (data/bossKit CRUSH): what it deals the front hero, and what its magic shock deals
   *  each hero behind (raw, before their defences; data/stageScaling crushHit / crushShock). */
  crushHit?: number;
  crushShock?: number;
  /** Boss-only (world bosses from Inferno, round 8): what its area blow deals each hero BEHIND the front one, raw
   *  (data/stageScaling areaBlowSplash) — in place of the formula's splash. */
  backSplash?: number;
  /** Boss-only (world bosses in Torment, round 10): the fight time at which its fury wipes the party (data/stageScaling
   *  BOSS_FURY_GRACE_MS past its enrage window). */
  furyMs?: number;
}

/** A role talent's bonus to what a hero deals: `pct`% more damage, or stronger heals, when the receiver meets
 *  the condition. */
export interface DealtBonus {
  what: 'damage' | 'heal';
  when: TargetCondition;
  pct: number;
}

// Render/accrual event emitted by a combat tick (lives here so both combat.ts and
// abilities.ts can produce them without an import cycle).
/** A wave still to land of an ability that lands in waves (sim/abilities.tickVolleys). */
export interface PendingVolley {
  key: string;
  rank: number;
  /** Waves still to come, and the ms until the next. */
  left: number;
  inMs: number;
}

export interface CombatEvent {
  type: 'damage' | 'heal' | 'death' | 'cast' | 'cue';
  targetId: string;
  sourceId?: string;
  amount?: number;
  crit?: boolean;
  blocked?: boolean; // the target blocked this hit (block-stat proc) — drives the block animation
  invuln?: boolean; // the hit was negated by invulnerability (Last Stand) — render "INVULNERABLE"
  multi?: boolean; // this hit is a MULTISTRIKE proc (the bonus second auto-hit) — render "MULTI!"
  splash?: boolean; // this hit is AoE splash off a primary target (Priest auto) — reduced damage
  abilityKey?: string;
  tick?: boolean; // a DoT/HoT periodic tick (render as a number; no attack animation)
  charged?: boolean; // an enemy's heavy basic attack: a shooter's Tiro cargado (the shot flies lit), a beast's Embestida (a burst on the hero)
  /** type 'cue': something brief to SHOW on `targetId`, with no number (sim/enemyTraits): a soldier's parry
   *  (`guard`), its Último aliento (`lastBreath`), a support falling with its auras (`supportDown`); on a HERO, a later wave of an
   *  ability that lands in waves (`volley`, with `abilityKey` — sim/abilities.tickVolleys); a world boss
   *  reflecting a hero's ability (`mirror`, with `abilityKey` the ability it reflects — sim/mirror).
   *  On a 'heal' of a boss it says where the heal came from: `leech` is the Vampiric affix feeding on a hit. */
  cue?: string;
}

export type StagePhase = 'advancing' | 'fighting' | 'boss' | 'zoneBoss' | 'walled';

export interface PendingAccrual {
  gold: number;
  xp: number;
  petDrops: string[];
  /** Facts of active play the state layer counts (pet objectives, the balance probe): enemies and bosses
   *  defeated and chests that dropped into storage. Away-time banks gold/xp only, so it adds none of these. */
  kills: number;
  bossKills: number;
  chestsFound: number;
  /** World-boss keys earned outright (option A: the first clear of a world's X-9), by world-boss stage. */
  keys: Record<number, number>;
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
  wavesThisStage: number; // cleared waves (0..wavesPerStage of its difficulty) → the stage's progress
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
  /** A boss lies fallen and the stage waits for its death to be seen (data/field BOSS_DOWN_MS; live game only).
   *  `firstClear` is what the clear will do once the beat ends — the cleared stage itself is banked at the kill. */
  bossDown?: { ms: number; totalMs: number; firstClear: boolean };
  /** The strip events' clock (sim/stripEvents; live game only — the engine sets it up, headless runs have none). */
  stripEvents?: StripEventClock;
}

export function emptyPending(): PendingAccrual {
  return { gold: 0, xp: 0, petDrops: [], kills: 0, bossKills: 0, chestsFound: 0, keys: {} };
}
