import type { Rng } from './rng';
import { makeRng } from './rng';
import type { Combatant, WorldState } from './world';
import { emptyPending } from './world';
import { resolveCombatTick, frontlineX, type CombatEvent } from './combat';
import { spawnWave, spawnStageBoss, spawnZoneBoss } from './stages';
import { tryAccrueChest } from './chests';
import { rollPetDrop } from './pets';
import type { Bonuses } from './bonuses';
import {
  goldPerKill,
  xpPerKill,
  BOSS_INCOME_MULT,
  ZONE_BOSS_INCOME_MULT,
  ELITE_CHEST_MULT,
  WAVES_PER_STAGE,
  isPreZoneGate,
  isZoneBossStage,
  worldOf,
  worldFirstStage,
} from '@/data/stageScaling';
import { isFinalStage } from '@/data/difficulties';
import { WALK_SPEED, SPAWN_AHEAD, HERO_SPACING, TELEPORT_HOLD_MS, WIPE_RETREAT_AT_MS, WIPE_TOTAL_MS } from '@/data/field';
import type { ChestType } from '@/data/chests';

// The fixed-timestep simulation loop. Owns WorldState; tick() advances combat,
// accrues income/chests/pets, and drives stage flow incl. the W-10 world-boss gate
// and the wipe→retreat rule. Deterministic: all randomness via the seeded rng.

export const TICK_MS = 100;
const ADVANCE_MS = 100; // brief walk between waves/boss

export interface TickContext {
  bonuses: Bonuses;
  ownedPetKeys: readonly string[];
  retryStage?: boolean; // RETRY toggle: when true, a wipe keeps the party on its stage (no retreat)
  // When true (live game), a full wipe plays the death cinematic (heroes hold dead, fade to
  // black + phrase, respawn) over WIPE_TOTAL_MS. Omitted (headless balance probes) ⇒ retreat
  // + revive instantly the same tick, so the animation beat doesn't skew throughput.
  animateWipe?: boolean;
  // Offline catch-up: bank gold/XP ONLY. No chests, no pet drops, and the stage is frozen
  // (clears re-farm in place; wipes hold the stage) — offline never advances or retreats the
  // frontier. Active play is the only way to progress stages or earn loot.
  offline?: boolean;
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
    chests: [],
    pending: emptyPending(),
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

    if (w.wipeMs !== undefined) {
      // A full-party-wipe cinematic is playing — no combat / no rng. Advance the sequence:
      // RETREAT (stage drop + clear the field) the moment it goes fully black so the swap is
      // hidden, then REVIVE + resume at the end. Heroes stay dead throughout.
      const prev = w.wipeMs;
      w.wipeMs += TICK_MS;
      if (prev < WIPE_RETREAT_AT_MS && w.wipeMs >= WIPE_RETREAT_AT_MS) this.retreatAfterWipe(ctx.retryStage === true || ctx.offline === true);
      if (w.wipeMs >= WIPE_TOTAL_MS) {
        w.wipeMs = undefined;
        this.resumeAfterWipe();
      }
    } else if (w.phase === 'advancing') {
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
      if (w.heroes.every((h) => !h.alive)) this.beginWipe(ctx);
      else if (w.waveQueue.length === 0 && w.enemies.length > 0 && w.enemies.every((e) => !e.alive)) this.handleClear(ctx.offline === true);
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
    w.heroes.forEach((h, i) => {
      if (h.alive || h.respawnMs === undefined) return;
      h.respawnMs -= TICK_MS;
      if (h.respawnMs > 0) return;
      h.alive = true;
      h.hp = h.maxHp;
      h.effects = [];
      h.cooldowns = {};
      h.cooldownTotals = {};
      h.attackTimerMs = 0;
      h.movedThisTick = false;
      h.respawnMs = undefined;
      h.x = w.partyX - i * HERO_SPACING; // drop in at this hero's formation slot, not the bare anchor
    });
  }

  // Release staggered wave members whose time has come. Each batch is placed a FIXED
  // distance (SPAWN_AHEAD) ahead of the party's CURRENT frontline — recomputed here every
  // tick — so a later batch lands in front of the party even after it has advanced into the
  // earlier batch, instead of at a stale spawn point that drifts off-screen.
  private releaseWave(): void {
    const w = this.world;
    if (w.waveQueue.length === 0) return;
    const front = frontlineX(w);
    const stillQueued: typeof w.waveQueue = [];
    for (const q of w.waveQueue) {
      if (q.releaseTick <= w.tick) {
        q.combatant.x = front + SPAWN_AHEAD + q.spawnOffset; // spread across the batch's band
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

    // Offline catch-up banks gold/XP ONLY — no loot (chests) and no pet drops.
    if (ctx.offline === true) return;

    const chestType: ChestType = enemy.isBoss ? (isZone ? 'zoneBoss' : 'stageBoss') : 'normal';
    tryAccrueChest(w, chestType, this.rng, ctx.bonuses, enemy.isElite === true ? ELITE_CHEST_MULT : 1);

    const pet = rollPetDrop(enemy.isBoss ? 'boss' : 'enemy', ctx.ownedPetKeys, this.rng);
    if (pet !== null) w.pending.petDrops.push(pet);
  }

  // A wave or boss was fully defeated.
  private handleClear(offline = false): void {
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
    // Offline catch-up NEVER advances the frontier: a boss clear just re-farms the same stage
    // in place (no stage/maxCleared change), so away-time grants gold/XP only — never progress.
    if (offline) {
      w.wavesThisStage = 0;
      w.phase = 'advancing';
      w.advanceTimerMs = ADVANCE_MS;
      return;
    }
    // FIRST clear of a stage extends the frontier → auto-advance. RE-clearing an already-
    // beaten stage (the party dropped back to farm it) LOOPS it instead (DIFFICULTY.md §2).
    const firstClear = w.globalStageIndex > w.maxClearedStage;
    w.maxClearedStage = Math.max(w.maxClearedStage, w.globalStageIndex);

    if (w.phase === 'boss') {
      // Stage boss (W-1..W-9). First clear of a new stage advances; a re-clear loops (stay
      // and re-farm). W-9 NEVER auto-advances — it parks for the world-boss portal (the
      // wall is W-10, entered via enterZoneBoss).
      if (firstClear && !isPreZoneGate(w.globalStageIndex)) w.globalStageIndex += 1;
      w.wavesThisStage = 0;
      w.phase = 'advancing';
      w.advanceTimerMs = ADVANCE_MS;
      return;
    }
    // World boss (X-10) defeated. FIRST clear advances to the next world's W-1 (crossing a
    // zone holds for the teleport sequence); the game ENDS at Torment 10-10 (stays put). A
    // RE-clear (farming the boss chest) drops back to this world's W-9 to keep farming.
    if (firstClear && !isFinalStage(w.globalStageIndex)) {
      w.globalStageIndex += 1;
      w.advanceTimerMs = TELEPORT_HOLD_MS;
    } else if (isFinalStage(w.globalStageIndex)) {
      w.advanceTimerMs = TELEPORT_HOLD_MS; // game complete — idle on Torment 10-10
    } else {
      w.globalStageIndex -= 1; // re-clear → back to W-9 (re-enter the boss via the portal)
      w.advanceTimerMs = ADVANCE_MS;
    }
    w.wavesThisStage = 0;
    w.phase = 'advancing';
  }

  /** Enter a world's W-10 world boss (defaults to the world the party is currently in —
   *  the strip portal; the Map passes a specific world). No-op unless that world's W-9
   *  boss is already beaten. Keys are gone — the boss itself is the gate (DIFFICULTY.md).
   *  Returns true if entry happened. */
  enterZoneBoss(world: number = worldOf(this.world.globalStageIndex)): boolean {
    const w = this.world;
    const nineStage = worldFirstStage(world) + 8; // this world's W-9 global index
    if (w.maxClearedStage < nineStage) return false; // W-9 not beaten yet
    w.globalStageIndex = nineStage + 1; // W-10
    w.wavesThisStage = 0;
    w.stageProgress = 0;
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
    w.enemies = [];
    w.waveQueue = [];
    w.phase = 'advancing';
    // A cross-zone jump holds for the teleport sequence; same-zone farming travel doesn't.
    w.advanceTimerMs = worldChanged ? TELEPORT_HOLD_MS : ADVANCE_MS;
    this.reviveParty();
  }

  // The party just fell. The live game plays the death cinematic (heroes stay dead while the
  // render fades to black, shows a phrase, and respawns) — driven by wipeMs in tick(). Headless
  // probes skip the animation (animateWipe off) and retreat + revive instantly, the old behavior.
  private beginWipe(ctx: TickContext): void {
    if (ctx.animateWipe !== true) {
      this.retreatAfterWipe(ctx.retryStage === true || ctx.offline === true);
      this.resumeAfterWipe();
      return;
    }
    this.world.wipeMs = 0; // start the cinematic; tick() advances it from here
  }

  // Mid-cinematic (fired once it's fully black so the swap is hidden): bump the wipe count,
  // retreat one stage (unless RETRY holds the party here), and clear the field. Heroes STAY
  // dead — resumeAfterWipe revives them at the end.
  private retreatAfterWipe(retryStage: boolean): void {
    const w = this.world;
    w.wipes += 1; // diagnostic (balance probes)
    // A zone-boss stage (X-10) has NO trash waves — only the boss. Staying there on a retry
    // would soft-lock the party (nothing to fight, no boss to re-trigger), so a wipe ALWAYS
    // steps back to X-9 (re-enter the boss via the portal), even with retry on.
    const stay = retryStage && !isZoneBossStage(w.globalStageIndex);
    if (!stay) w.globalStageIndex = Math.max(1, w.globalStageIndex - 1);
    w.wavesThisStage = 0;
    w.enemies = [];
    w.waveQueue = [];
  }

  // End of the cinematic: revive the party at the (retreated) stage and march on.
  private resumeAfterWipe(): void {
    const w = this.world;
    w.phase = 'advancing';
    w.advanceTimerMs = ADVANCE_MS;
    this.reviveParty();
    // Drop the party back in ALREADY in formation (front = slot 0, the rest trailing), so the
    // teleport-in lands them spread out — no stacked-at-anchor frame that the march has to undo.
    w.heroes.forEach((h, i) => { h.x = w.partyX - i * HERO_SPACING; });
  }

  // Full-heal + revive every hero and clear in-flight combat state (used by a wipe
  // retreat and a Map travel — both restart the party fresh at the target stage). This
  // also fires at every stage advance/boss-clear, so it's where per-stage ult charges
  // (Knight Last Stand) refill — "once per stage".
  private reviveParty(): void {
    for (const h of this.world.heroes) {
      h.hp = h.maxHp;
      h.alive = true;
      h.effects = [];
      h.cooldowns = {};
      h.cooldownTotals = {};
      h.attackTimerMs = 0;
      h.respawnMs = undefined; // cancel any in-flight revive
      if (h.ult?.effect.type === 'deathBlock') h.ultCharge = h.ult.effect.chargesPerStage;
    }
  }
}
