import type { Rng } from './rng';
import { makeRng } from './rng';
import type { Combatant, WorldState } from './world';
import { emptyPending, keysForZone } from './world';
import { resolveCombatTick, type CombatEvent } from './combat';
import { spawnWave, spawnStageBoss, spawnZoneBoss } from './stages';
import { tryAccrueChest } from './chests';
import { rollPetDrop } from './pets';
import type { Bonuses } from './bonuses';
import {
  goldPerKill,
  xpPerKill,
  BOSS_INCOME_MULT,
  ZONE_BOSS_INCOME_MULT,
  WAVES_PER_STAGE,
  isPreZoneGate,
  isZoneBossStage,
  worldOf,
  worldFirstStage,
} from '@/data/stageScaling';
import { WALK_SPEED, SPAWN_AHEAD, HERO_SPACING, TELEPORT_HOLD_MS } from '@/data/field';
import type { ChestType } from '@/data/chests';

// The fixed-timestep simulation loop. Owns WorldState; tick() advances combat,
// accrues income/chests/pets, and drives stage flow incl. the zone-key gate and
// the wipe→retreat rule. Deterministic: all randomness via the seeded rng.

export const TICK_MS = 100;
const ADVANCE_MS = 100; // brief walk between waves/boss

export interface TickContext {
  bonuses: Bonuses;
  ownedPetKeys: readonly string[];
  retryStage?: boolean; // RETRY toggle: when true, a wipe keeps the party on its stage (no retreat)
}

export function createWorld(seed: number, heroes: Combatant[]): WorldState {
  // Start the party already in a column (front = slot 0, the rest trailing behind)
  // so they render in formation from the very first frame.
  heroes.forEach((h, i) => { h.x = -i * HERO_SPACING; });
  return {
    tick: 0,
    seed,
    rngState: seed >>> 0,
    globalStageIndex: 1,
    maxClearedStage: 0,
    wavesThisStage: 0,
    stageProgress: 0,
    phase: 'advancing',
    heroes,
    enemies: [],
    waveQueue: [],
    partyX: 0,
    advanceTimerMs: ADVANCE_MS,
    zoneKeys: {},
    chests: [],
    pending: emptyPending(),
    zoneAttemptActive: false,
    wipes: 0,
  };
}

export class Simulation {
  readonly world: WorldState;
  private readonly rng: Rng;

  constructor(world: WorldState) {
    this.world = world;
    this.rng = makeRng(world.rngState);
  }

  /** Advance one 100ms tick. Returns combat events for the render layer. */
  tick(ctx: TickContext): CombatEvent[] {
    const w = this.world;
    w.tick++;
    let events: CombatEvent[] = [];

    this.tickRespawns(); // count down fallen heroes; revive if the party still stands

    if (w.phase === 'advancing') {
      w.partyX += (WALK_SPEED * TICK_MS) / 1000; // walk forward (camera scrolls)
      w.advanceTimerMs -= TICK_MS;
      if (w.advanceTimerMs <= 0) {
        // Never spawn trash/stage-boss on an X-10 — it's a world-boss-only stage entered
        // solely via enterZoneBoss (which spawns the boss in 'zoneBoss' phase). Guard
        // defensively so a stray advancing state can't run normal waves there (§14).
        if (isZoneBossStage(w.globalStageIndex)) {
          // hold (no spawn) — should be unreachable; entry sets phase='zoneBoss' directly
        } else if (w.wavesThisStage >= WAVES_PER_STAGE) spawnStageBoss(w, this.rng);
        else spawnWave(w, this.rng);
      }
    } else {
      this.releaseWave();
      events = resolveCombatTick(w, TICK_MS, this.rng);
      this.processDeaths(events, ctx);
      if (w.heroes.every((h) => !h.alive)) this.handleWipe(ctx.retryStage === true);
      else if (w.waveQueue.length === 0 && w.enemies.length > 0 && w.enemies.every((e) => !e.alive)) this.handleClear();
    }

    w.stageProgress = Math.min(1, w.wavesThisStage / WAVES_PER_STAGE);
    w.rngState = this.rng.state();
    return events;
  }

  // Count down each fallen hero's revive timer. A hero comes back at full HP once the
  // timer elapses — but ONLY while at least one ally is still alive; if everyone is
  // down, handleWipe takes over (retreat + instant full-party revive). Runs every
  // tick in every phase, so the timer keeps ticking while the party walks between waves.
  private tickRespawns(): void {
    const w = this.world;
    const anyAlive = w.heroes.some((h) => h.alive);
    if (!anyAlive) return; // full wipe — handleWipe will revive everyone
    for (const h of w.heroes) {
      if (h.alive || h.respawnMs === undefined) continue;
      h.respawnMs -= TICK_MS;
      if (h.respawnMs > 0) continue;
      h.alive = true;
      h.hp = h.maxHp;
      h.effects = [];
      h.cooldowns = {};
      h.cooldownTotals = {};
      h.gcdMs = 0;
      h.attackTimerMs = 0;
      h.movedThisTick = false;
      h.respawnMs = undefined;
      h.x = w.partyX; // drop in at the party anchor; the formation march reforms it
    }
  }

  // Release staggered wave members whose time has come, spawning them at the edge.
  private releaseWave(): void {
    const w = this.world;
    if (w.waveQueue.length === 0) return;
    const stillQueued: typeof w.waveQueue = [];
    for (const q of w.waveQueue) {
      if (q.releaseTick <= w.tick) {
        q.combatant.x = w.partyX + SPAWN_AHEAD;
        w.enemies.push(q.combatant);
      } else {
        stillQueued.push(q);
      }
    }
    w.waveQueue = stillQueued;
  }

  private processDeaths(events: CombatEvent[], ctx: TickContext): void {
    const w = this.world;
    for (const ev of events) {
      if (ev.type !== 'death') continue;
      const enemy = w.enemies.find((e) => e.id === ev.targetId);
      if (enemy === undefined) continue;
      this.awardKill(enemy, ctx);
    }
  }

  private awardKill(enemy: Combatant, ctx: TickContext): void {
    const w = this.world;
    const S = w.globalStageIndex;
    const isZone = enemy.isBoss && w.phase === 'zoneBoss';
    const incomeMult = enemy.isBoss ? (isZone ? ZONE_BOSS_INCOME_MULT : BOSS_INCOME_MULT) : 1;
    w.pending.gold += Math.round(goldPerKill(S) * incomeMult * ctx.bonuses.goldMult);
    w.pending.xp += Math.round(xpPerKill(S) * incomeMult * ctx.bonuses.xpMult);

    const chestType: ChestType = enemy.isBoss ? (isZone ? 'zoneBoss' : 'stageBoss') : 'normal';
    tryAccrueChest(w, chestType, this.rng, ctx.bonuses);

    const pet = rollPetDrop(enemy.isBoss ? 'boss' : 'enemy', ctx.ownedPetKeys, this.rng);
    if (pet !== null) w.pending.petDrops.push(pet);
  }

  // A wave or boss was fully defeated.
  private handleClear(): void {
    const w = this.world;
    if (w.phase === 'fighting') {
      w.wavesThisStage += 1; // each cleared wave = +5% (20 waves → boss)
      w.phase = 'advancing';
      w.advanceTimerMs = ADVANCE_MS;
      return;
    }
    // Past here a stage boss or zone boss just fell. Beating a boss is a checkpoint:
    // fully heal + revive the whole party before they move on (or re-farm / enter W-10).
    this.reviveParty();
    if (w.phase === 'boss') {
      // A stage boss (W-1..W-9) just fell → this stage's boss is beaten.
      w.maxClearedStage = Math.max(w.maxClearedStage, w.globalStageIndex);
      if (isPreZoneGate(w.globalStageIndex)) {
        // W-9 cleared: never auto-advance into the world boss. Keep farming W-9 for gear
        // + keys; the red portal at the strip's end (and the Map) drive the keyed entry
        // into W-10 via enterZoneBoss (a deliberate, key-gated wall — §14).
        w.wavesThisStage = 0;
        w.phase = 'advancing';
        w.advanceTimerMs = ADVANCE_MS;
      } else {
        w.globalStageIndex += 1;
        w.wavesThisStage = 0;
        w.phase = 'advancing';
        w.advanceTimerMs = ADVANCE_MS;
      }
      return;
    }
    // zoneBoss defeated → this zone boss is beaten, advance to (W+1)-1. Crossing into a
    // new zone holds briefly for the teleport sequence (render plays it over this beat).
    w.maxClearedStage = Math.max(w.maxClearedStage, w.globalStageIndex);
    w.globalStageIndex += 1;
    w.wavesThisStage = 0;
    w.zoneAttemptActive = false;
    w.phase = 'advancing';
    w.advanceTimerMs = TELEPORT_HOLD_MS;
  }

  /** Enter a world's W-10 boss by spending one of that zone's keys (defaults to the
   *  world the party is currently in — the strip portal; the Map passes a specific
   *  world). No-op unless that world's W-9 boss is already beaten AND a key is held. The
   *  key stays spent even on a wipe (§14). Returns true if entry happened. */
  enterZoneBoss(world: number = worldOf(this.world.globalStageIndex)): boolean {
    const w = this.world;
    const nineStage = worldFirstStage(world) + 8; // this world's W-9 global index
    if (w.maxClearedStage < nineStage) return false; // W-9 not beaten yet
    if (keysForZone(w.zoneKeys, world) < 1) return false; // no key for this zone
    w.zoneKeys[world] = keysForZone(w.zoneKeys, world) - 1; // consume on entry (kept on a wipe)
    w.globalStageIndex = nineStage + 1; // W-10
    w.wavesThisStage = 0;
    w.stageProgress = 0;
    w.zoneAttemptActive = true;
    w.enemies = [];
    w.waveQueue = [];
    this.reviveParty();
    spawnZoneBoss(w, this.rng); // spawns the boss + sets phase='zoneBoss'
    return true;
  }

  /** Jump the party to the start of any stage (the Map "travel" intent). Resets the
   *  in-flight fight and revives the party; `maxClearedStage` is left untouched so
   *  travelling back to farm never lowers the unlock/resume frontier. */
  travelTo(stageIndex: number): void {
    const w = this.world;
    let target = Math.max(1, Math.floor(stageIndex));
    // You enter a world boss only by spending a key (enterZoneBoss) — never by travelling
    // onto it, which would otherwise run normal waves on an X-10. Redirect to its W-9.
    if (isZoneBossStage(target)) target -= 1;
    const worldChanged = worldOf(target) !== worldOf(w.globalStageIndex);
    w.globalStageIndex = target;
    w.wavesThisStage = 0;
    w.stageProgress = 0;
    w.zoneAttemptActive = false;
    w.enemies = [];
    w.waveQueue = [];
    w.phase = 'advancing';
    // A cross-zone jump holds for the teleport sequence; same-zone farming travel doesn't.
    w.advanceTimerMs = worldChanged ? TELEPORT_HOLD_MS : ADVANCE_MS;
    this.reviveParty();
  }

  private handleWipe(retryStage: boolean): void {
    const w = this.world;
    w.wipes += 1; // diagnostic (balance probes)
    // Retreat one stage — UNLESS the RETRY toggle is on, which keeps the party on the
    // current stage to re-attempt it. The key (if a zone attempt) is spent either way (§14).
    if (!retryStage) w.globalStageIndex = Math.max(1, w.globalStageIndex - 1);
    w.zoneAttemptActive = false;
    w.wavesThisStage = 0;
    w.enemies = [];
    w.waveQueue = [];
    w.phase = 'advancing';
    w.advanceTimerMs = TELEPORT_HOLD_MS; // hold for the teleport-back-in sequence on a wipe
    this.reviveParty();
  }

  // Full-heal + revive every hero and clear in-flight combat state (used by a wipe
  // retreat and a Map travel — both restart the party fresh at the target stage). This
  // also fires at every stage advance/boss-clear, so it's where per-stage ult charges
  // (Warrior Last Stand) refill — "once per stage".
  private reviveParty(): void {
    for (const h of this.world.heroes) {
      h.hp = h.maxHp;
      h.alive = true;
      h.effects = [];
      h.cooldowns = {};
      h.cooldownTotals = {};
      h.gcdMs = 0;
      h.attackTimerMs = 0;
      h.respawnMs = undefined; // cancel any in-flight revive
      if (h.ult?.effect.type === 'deathBlock') h.ultCharge = h.ult.effect.chargesPerStage;
    }
  }
}
