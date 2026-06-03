import { Simulation, createWorld, TICK_MS, type TickContext } from '@/sim/Simulation';
import { buildHeroCombatant, refreshHeroLoadout, partyAuraMods, type HeroConfig } from '@/sim/loadout';
import { getBonuses, type Bonuses } from '@/sim/bonuses';
import { openAll, openType, autoOpenIntervalMs } from '@/sim/chests';
import { countFilled } from '@/sim/slots';
import { simulateOffline, type OfflineSummary } from '@/sim/offline';
import type { CombatEvent } from '@/sim/combat';
import type { WorldState } from '@/sim/world';
import type { ItemInstance } from '@/sim/items';
import type { GemInstance } from '@/data/gems';
import { CHEST_CONFIG, type ChestType } from '@/data/chests';
import { worldOf, stageInWorld } from '@/data/stageScaling';
import { makeRng, type Rng } from '@/sim/rng';
import { useStore } from '@/state/store';
import type { HeroState } from '@/persistence/saveSchema';

// The store-driven bridge. The STORE owns player config (roster equipment/level/
// talents, tech, pets, gold, inventory); the SIM world owns transient combat +
// chest stacks + keys. The engine reads the store, rebuilds combatants when config
// changes (configEpoch), steps the sim on a fixed 100ms timestep, and batches
// accrual back into the store once per frame.

const MAX_CATCHUP_TICKS = 5;

export class GameEngine {
  private readonly sim: Simulation;
  private bonuses: Bonuses;
  private appliedEpoch = -1;
  private accMs = 0;
  private readonly openRng: Rng; // dedicated stream for chest opening

  constructor() {
    const st = useStore.getState();
    // Resume the loot stream where the last save left off (so slots/tiers keep rolling
    // forward) — NOT a fixed reseed, which made every session replay the same drops.
    this.openRng = makeRng((st.lootRngState !== 0 ? st.lootRngState : st.seed ^ 0x5eed) >>> 0);
    this.bonuses = getBonuses(st.techRanks, st.ownedPets);
    const combatMods = [...this.bonuses.combatMods, ...partyAuraMods(st.roster.map(toConfig))];
    const heroes = st.roster.map((h) => buildHeroCombatant(toConfig(h), combatMods));
    const world = createWorld(st.seed, heroes);
    // Resume from a loaded save: restore stage + chest stacks.
    world.globalStageIndex = Math.max(1, st.resumeStage);
    world.maxClearedStage = st.maxClearedStage;
    world.chests = st.chests.map((c) => ({ ...c }));
    this.sim = new Simulation(world);
    this.appliedEpoch = st.configEpoch;
    this.mirror();
  }

  get world(): WorldState {
    return this.sim.world;
  }

  /** Current chest-open RNG state, persisted so loot continues across reloads. */
  lootRngState(): number {
    return this.openRng.state();
  }

  update(dtMs: number): CombatEvent[] {
    this.syncConfig();
    this.applyTravel();
    this.applyEnterZoneBoss();
    this.accMs += dtMs;
    const events: CombatEvent[] = [];
    let gold = 0;
    let xp = 0;
    const pets: string[] = [];
    let steps = 0;
    while (this.accMs >= TICK_MS && steps < MAX_CATCHUP_TICKS) {
      events.push(...this.sim.tick(this.ctx()));
      const p = this.sim.world.pending;
      gold += p.gold;
      xp += p.xp;
      pets.push(...p.petDrops);
      p.gold = 0;
      p.xp = 0;
      p.petDrops = [];
      this.accMs -= TICK_MS;
      steps += 1;
    }
    if (this.accMs > TICK_MS * MAX_CATCHUP_TICKS) this.accMs = 0;

    const store = useStore.getState();
    if (gold > 0) store.addGold(gold);
    // Only heroes alive at the end of this batch earn XP — the dead sit it out until
    // they respawn (a fallen hero must NOT level while the rest fight on).
    if (xp > 0) store.gainExp(xp, this.sim.world.heroes.filter((h) => h.alive).map((h) => h.id));
    for (const pet of pets) store.addPet(pet);
    this.autoOpen();
    this.mirror();
    this.pushHud();
    return events;
  }

  /** Catch up `elapsedMs` of away-time (capped). Applies offline-multiplied gold/xp
   *  + pets to the store, leaves chests/keys/stage progressed in the world, and
   *  clears the raw pending buffer so the next frame doesn't double-count. */
  runOffline(elapsedMs: number): OfflineSummary {
    const summary = simulateOffline(this.sim, this.ctx(), elapsedMs);
    const store = useStore.getState();
    if (summary.gold > 0) store.addGold(summary.gold);
    if (summary.xp > 0) store.gainExp(summary.xp);
    for (const pet of summary.petDrops) store.addPet(pet);
    this.sim.world.pending.gold = 0;
    this.sim.world.pending.xp = 0;
    this.sim.world.pending.petDrops = [];
    this.mirror();
    this.pushHud();
    return summary;
  }

  /** Open every stored chest now → route loot to inventory. */
  openChests(): { items: number; gems: number } {
    const loot = openAll(this.sim.world, this.openRng, this.bonuses);
    const store = useStore.getState();
    store.addLoot(loot.items, loot.gems);
    this.mirror();
    return { items: loot.items.length, gems: loot.gems.length };
  }

  /** Open only the chests of `type` (the per-popup open). The rolled ITEMS and GEMS are
   *  returned so the UI can reveal each into the bag one-by-one with floating loot text. */
  openChestType(type: ChestType): { items: ItemInstance[]; gems: GemInstance[] } {
    const loot = openType(this.sim.world, type, this.openRng, this.bonuses);
    this.mirror();
    return { items: loot.items, gems: loot.gems };
  }

  private autoOpen(): void {
    const store = useStore.getState();
    if (!this.bonuses.autoOpenUnlocked) return;
    const interval = autoOpenIntervalMs(this.bonuses);
    const nowMs = this.sim.world.tick * TICK_MS;
    const last = store.autoOpen.lastRunAt ?? 0;
    if (nowMs - last < interval) return;
    // Don't auto-open if the bag can't hold every item — leave the chests stacked
    // rather than spilling loot into the stash. Retry next tick (lastRunAt unchanged).
    const items = this.sim.world.chests.reduce((n, c) => n + c.count * CHEST_CONFIG.itemsPerChest[c.type], 0);
    if (store.inventoryCap() - countFilled(store.inventory) < items) return;
    this.openChests();
    store.setAutoOpen({ unlocked: true, lastRunAt: nowMs });
  }

  private ctx(): TickContext {
    const st = useStore.getState();
    // The live game plays the full death cinematic on a wipe (fade to black, phrase, respawn).
    // Headless balance probes omit it (instant retreat) so the beat doesn't distort throughput.
    return { bonuses: this.bonuses, ownedPetKeys: st.ownedPets, retryStage: st.retryStage, animateWipe: true };
  }

  // Consume a pending Map "travel" intent: jump the sim to the chosen stage once,
  // then clear the flag so it fires exactly once.
  private applyTravel(): void {
    const store = useStore.getState();
    const target = store.pendingTravelStage;
    if (target === null) return;
    this.sim.travelTo(target);
    store.clearPendingTravel();
    this.accMs = 0; // drop any buffered ticks so we don't immediately step the old fight
    this.pushHud();
  }

  // Consume a pending "enter world boss" intent (portal tap / Map). Drops the party
  // straight into the W-10 fight; fires at most once.
  private applyEnterZoneBoss(): void {
    const store = useStore.getState();
    const world = store.pendingEnterZoneWorld;
    if (world === null) return;
    store.clearPendingEnterZoneBoss();
    if (this.sim.enterZoneBoss(world)) {
      this.accMs = 0;
      this.mirror();
      this.pushHud();
    }
  }

  // Rebuild combatants when the player's config changed (equip / talent / tech / pet).
  private syncConfig(): void {
    const st = useStore.getState();
    if (st.configEpoch === this.appliedEpoch) return;
    this.appliedEpoch = st.configEpoch;
    this.bonuses = getBonuses(st.techRanks, st.ownedPets);
    const combatMods = [...this.bonuses.combatMods, ...partyAuraMods(st.roster.map(toConfig))];
    const world = this.sim.world;
    const byId = new Map(world.heroes.map((h) => [h.id, h]));
    world.heroes = st.roster.map((h) => {
      const existing = byId.get(h.id);
      if (existing !== undefined) {
        refreshHeroLoadout(existing, toConfig(h), combatMods);
        // Rescue a hero that's stranded far behind the party (e.g. recruited before
        // this fix) — snap it back into formation rather than make it walk the map.
        if (existing.alive && existing.x < world.partyX - 300) existing.x = world.partyX;
        return existing;
      }
      // A newly-recruited hero must spawn WITH the party (at partyX), not at world
      // origin (x=0) — otherwise it's alive (and earns XP) but stranded far off-screen,
      // slowly walking the whole map to catch up. Drop it in at the formation anchor.
      const fresh = buildHeroCombatant(toConfig(h), combatMods);
      fresh.x = world.partyX;
      return fresh;
    });
  }

  private mirror(): void {
    const store = useStore.getState();
    store.setChests(this.sim.world.chests.map((c) => ({ ...c })));
    if (this.bonuses.autoOpenUnlocked && !store.autoOpen.unlocked) {
      store.setAutoOpen({ unlocked: true, lastRunAt: store.autoOpen.lastRunAt });
    }
  }

  private pushHud(): void {
    const w = this.sim.world;
    const chests = { normal: 0, stageBoss: 0, zoneBoss: 0 };
    for (const c of w.chests) chests[c.type] += c.count; // several stacks per type (per drop stage)
    useStore.getState().setHud({
      world: worldOf(w.globalStageIndex),
      stageInWorld: stageInWorld(w.globalStageIndex),
      globalStage: w.globalStageIndex,
      maxClearedStage: w.maxClearedStage,
      stageProgress: w.stageProgress,
      phase: w.phase,
      gold: useStore.getState().gold,
      chests,
      party: useStore.getState().roster.map((h) => ({ classKey: h.classKey, level: h.level })),
    });
  }
}

function toConfig(h: HeroState): HeroConfig {
  // Pass an array (never undefined) so the live game applies the ≤2 active-ability cap
  // — undefined is reserved for the headless harness, where the full kit fires.
  return { id: h.id, classKey: h.classKey, level: h.level, equipment: h.equipment, talents: h.talents, activeAbilities: h.activeAbilities ?? [] };
}
