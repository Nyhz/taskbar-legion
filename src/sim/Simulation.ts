import type { Rng } from './rng';
import { clearRecent } from './recent';
import { makeRng } from './rng';
import type { Combatant, WorldState } from './world';
import { emptyPending } from './world';
import { resolveCombatTick, frontlineX, type CombatEvent } from './combat';
import { spawnWave, spawnStageBoss, spawnZoneBoss } from './stages';
import { storeChest, tryAccrueChest } from './chests';
import { gapBefore, makeStripEvent, type MerchantOffer } from './stripEvents';
import { milestonePetsDue, rollPetDrop } from './pets';
import type { Bonuses } from './bonuses';
import {
  goldPerKill,
  xpPerKill,
  BOSS_INCOME_MULT,
  ZONE_BOSS_INCOME_MULT,
  ELITE_CHEST_MULT,
  wavesPerStage,
  isPreZoneGate,
  isZoneBossStage,
  worldOf,
  worldFirstStage,
} from '@/data/stageScaling';
import { isFinalStage } from '@/data/difficulties';
import { WALK_SPEED, SPAWN_AHEAD, HERO_SPACING, TELEPORT_HOLD_MS, WIPE_RETREAT_AT_MS, WIPE_ARRIVE_AT_MS, WIPE_TOTAL_MS, BOSS_DOWN_MS } from '@/data/field';
import { FIRST_CLEAR_KEYS, type ChestType } from '@/data/chests';

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
  // When true (live game), a fallen boss gets its beat before the stage moves on (data/field BOSS_DOWN_MS:
  // the party stands while its death is seen). Omitted (headless probes, tests) ⇒ the clear is instant.
  animateBossDown?: boolean;
  // Offline catch-up: bank gold/XP ONLY. No chests, no pet drops, and the stage is frozen
  // (clears re-farm in place; wipes hold the stage) — offline never advances or retreats the
  // frontier. Active play is the only way to progress stages or earn loot.
  offline?: boolean;
  /** Live game only: run the strip events' clock (sim/stripEvents). Away-time and the probes leave it off. */
  stripEvents?: boolean;
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
    const clearedBefore = w.maxClearedStage;

    this.tickRespawns(); // count down fallen heroes; revive if the party still stands

    if (w.wipeMs !== undefined) {
      // A full-party-wipe cinematic is playing — no combat / no rng. Advance the sequence (data/field):
      // RETREAT (stage drop + clear the field) the moment it goes fully black so the swap is hidden; REVIVE the
      // party in formation at WIPE_ARRIVE_AT, after the stage's sign has had the empty stage to itself (the
      // strip then shows the heroes arriving); and let the fight resume at the end.
      const prev = w.wipeMs;
      w.wipeMs += TICK_MS;
      if (prev < WIPE_RETREAT_AT_MS && w.wipeMs >= WIPE_RETREAT_AT_MS) this.retreatAfterWipe(ctx.retryStage === true || ctx.offline === true);
      if (prev < WIPE_ARRIVE_AT_MS && w.wipeMs >= WIPE_ARRIVE_AT_MS) this.resumeAfterWipe();
      if (w.wipeMs >= WIPE_TOTAL_MS) w.wipeMs = undefined;
    } else if (w.bossDown !== undefined) {
      // A boss lies fallen: no combat / no rng, the party stands. When the beat ends the clear goes through.
      w.bossDown.ms += TICK_MS;
      if (w.bossDown.ms >= w.bossDown.totalMs) {
        const { firstClear } = w.bossDown;
        w.bossDown = undefined;
        this.handleClear(false, firstClear);
      }
    } else if (w.phase === 'advancing') {
      // An X-10 is a world-boss-only stage, entered solely via enterZoneBoss (which spawns the boss in 'zoneBoss'
      // phase): a party left 'advancing' on one (the game is complete: Torment 10-10) STANDS — no trash, no stage
      // boss (§14), and no walk either. The heroes only move in a fight, so an anchor that walked on alone would
      // leave them behind for good and every later fight would happen off the strip (seen 2026-11-21).
      const holds = isZoneBossStage(w.globalStageIndex);
      if (!holds) w.partyX += (WALK_SPEED * TICK_MS) / 1000; // walk forward (camera scrolls)
      w.advanceTimerMs -= TICK_MS;
      if (w.advanceTimerMs <= 0 && !holds) {
        if (w.wavesThisStage >= wavesPerStage(w.globalStageIndex)) spawnStageBoss(w, this.rng);
        else spawnWave(w, this.rng);
      }
    } else {
      this.releaseWave();
      events = resolveCombatTick(w, TICK_MS, this.rng);
      this.processDeaths(events, ctx);
      if (w.heroes.every((h) => !h.alive)) this.beginWipe(ctx);
      else if (w.waveQueue.length === 0 && w.enemies.length > 0 && w.enemies.every((e) => !e.alive)) this.beginClear(ctx);
    }

    w.stageProgress = Math.min(1, w.wavesThisStage / wavesPerStage(w.globalStageIndex));
    if (w.maxClearedStage > clearedBefore) this.handOverMilestonePets(ctx);
    if (ctx.stripEvents === true && ctx.offline !== true) this.tickStripEvent();
    w.rngState = this.rng.state();
    return events;
  }

  // A whole difficulty has just been beaten for the first time: its milestone pet (data/pets MILESTONE_PETS) joins,
  // unless the player already has it (or it is already on its way). No rng: the stream does not move.
  private handOverMilestonePets(ctx: TickContext): void {
    const pending = this.world.pending.petDrops;
    for (const pet of milestonePetsDue(this.world.maxClearedStage, ctx.ownedPetKeys)) {
      if (!pending.includes(pet)) pending.push(pet);
    }
  }

  // The strip events (data/stripEvents): the one on the strip runs its time out; with none, the wait for the next
  // runs while the party is out on its stages — not in a defeat, a fallen boss's beat or a world-boss fight, which
  // also send away the one on. Its own stream (sim/stripEvents): the combat rng does not move.
  private tickStripEvent(): void {
    const w = this.world;
    const clock = w.stripEvents;
    if (clock === undefined) return;
    const busy = w.wipeMs !== undefined || w.bossDown !== undefined || w.phase === 'zoneBoss';
    if (clock.active !== undefined) {
      clock.active.ms += TICK_MS;
      if (busy || clock.active.ms >= clock.active.totalMs) clock.active = undefined;
      return;
    }
    if (busy) return;
    clock.nextInMs -= TICK_MS;
    if (clock.nextInMs > 0) return;
    const classes = [...new Set(w.heroes.map((h) => h.classKey).filter((k): k is string => k !== undefined))];
    clock.active = makeStripEvent(w.seed, clock.count, w.globalStageIndex, clock.lastKind, classes);
    clock.lastKind = clock.active.kind;
    clock.count += 1;
    clock.nextInMs = gapBefore(w.seed, clock.count);
  }

  /** The player taps the runaway chest on the strip: it joins the storage ('stored'), or is lost because its
   *  storage is full ('full'). null when there is none to catch. Either way it is gone. */
  catchRunaway(bonuses: Bonuses): 'stored' | 'full' | null {
    const clock = this.world.stripEvents;
    const ev = clock?.active;
    if (clock === undefined || ev?.kind !== 'runaway' || ev.chest === undefined) return null;
    clock.active = undefined;
    return storeChest(this.world, ev.chest, bonuses) ? 'stored' : 'full';
  }

  /** What the merchant on the strip offers at `index`, if it is there and that one is not sold yet. */
  merchantOffer(index: number): MerchantOffer | undefined {
    const ev = this.world.stripEvents?.active;
    const offer = ev?.kind === 'merchant' ? ev.offers?.[index] : undefined;
    return offer === undefined || offer.sold ? undefined : offer;
  }

  /** The merchant's offer `index` was bought (the store has taken the gold and the piece). */
  markSold(index: number): void {
    const offer = this.merchantOffer(index);
    if (offer !== undefined) offer.sold = true;
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
      clearRecent(h);
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
      if (enemy === undefined || enemy.summon !== undefined) continue; // a boss's summon is no kill: no rewards, no roll
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

    if (enemy.isBoss) w.pending.bossKills += 1;
    else w.pending.kills += 1;

    const chestType: ChestType = enemy.isBoss ? (isZone ? 'zoneBoss' : 'stageBoss') : 'normal';
    if (tryAccrueChest(w, chestType, this.rng, ctx.bonuses, enemy.isElite === true ? ELITE_CHEST_MULT : 1)) w.pending.chestsFound += 1;

    const pet = rollPetDrop(enemy.isBoss ? 'boss' : 'enemy', ctx.ownedPetKeys, this.rng);
    if (pet !== null) w.pending.petDrops.push(pet);
  }

  // A wave or boss was fully defeated. In the live game a fallen boss first gets its beat (BOSS_DOWN_MS): the
  // cleared stage is banked NOW — the win must survive the game being closed mid-beat — and the rest of the
  // clear (heal, the move to the next stage or world) waits in `world.bossDown` until tick() ends the beat.
  private beginClear(ctx: TickContext): void {
    const w = this.world;
    const offline = ctx.offline === true;
    const beatMs = ctx.animateBossDown !== true || offline ? 0 : w.phase === 'zoneBoss' ? BOSS_DOWN_MS.worldBoss : w.phase === 'boss' ? BOSS_DOWN_MS.stageBoss : 0;
    if (beatMs <= 0) {
      this.handleClear(offline);
      return;
    }
    const firstClear = w.globalStageIndex > w.maxClearedStage;
    w.maxClearedStage = Math.max(w.maxClearedStage, w.globalStageIndex);
    w.bossDown = { ms: 0, totalMs: beatMs, firstClear };
  }

  // The clear itself. `firstClearKnown`: what beginClear saw before it banked the stage (after a boss-down beat).
  private handleClear(offline = false, firstClearKnown?: boolean): void {
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
    const firstClear = firstClearKnown ?? w.globalStageIndex > w.maxClearedStage;
    w.maxClearedStage = Math.max(w.maxClearedStage, w.globalStageIndex);

    if (w.phase === 'boss') {
      // Stage boss (W-1..W-9). First clear of a new stage advances; a re-clear loops (stay
      // and re-farm). W-9 NEVER auto-advances — it parks for the world-boss portal (the
      // wall is W-10, entered via enterZoneBoss).
      if (firstClear && !isPreZoneGate(w.globalStageIndex)) w.globalStageIndex += 1;
      // Option A: the first clear of a world's X-9 hands over one key of that world (data/chests FIRST_CLEAR_KEYS).
      if (firstClear && isPreZoneGate(w.globalStageIndex)) {
        const boss = w.globalStageIndex + 1;
        w.pending.keys[boss] = (w.pending.keys[boss] ?? 0) + FIRST_CLEAR_KEYS;
      }
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
    w.bossDown = undefined; // a boss-down beat in progress is over (its win was banked at the kill)
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
    w.bossDown = undefined; // a boss-down beat in progress is over (its win was banked at the kill)
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
  // retreat one stage (unless RETRY holds the party here, or there is no stage below in this world), and clear
  // the field. Heroes STAY dead — resumeAfterWipe revives them at the end.
  private retreatAfterWipe(retryStage: boolean): void {
    const w = this.world;
    w.wipes += 1; // diagnostic (balance probes)
    const S = w.globalStageIndex;
    // A zone-boss stage (X-10) has NO trash waves — only the boss. Staying there on a retry
    // would soft-lock the party (nothing to fight, no boss to re-trigger), so a wipe ALWAYS
    // steps back to X-9 (re-enter the boss via the portal), even with retry on.
    const onWorldBoss = isZoneBossStage(S);
    // The first stage of a world (X-1) has nothing below it but the previous world's boss stage: the party STAYS
    // on X-1 even with retry off. Leaving a world is the player's own choice (user, 2026-11-21) — and falling
    // onto that X-10 left the party on a stage where nothing ever spawns.
    const firstOfWorld = S <= 1 || isZoneBossStage(S - 1);
    const stay = !onWorldBoss && (retryStage || firstOfWorld);
    if (!stay) w.globalStageIndex = S - 1;
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
      clearRecent(h);
      if (h.ult?.effect.type === 'deathBlock') h.ultCharge = h.ult.effect.chargesPerStage;
      h.triggerUses = undefined; // "once per stage" triggers (a capstone's emergency heal) refill here too
    }
  }
}
