import { Simulation, createWorld, TICK_MS, type TickContext } from '@/sim/Simulation';
import { buildHeroCombatant, refreshHeroLoadout } from '@/sim/loadout';
import { heroConfig, partyCombatMods } from '@/sim/partyStats';
import { getBonuses, type Bonuses } from '@/sim/bonuses';
import { openType, autoOpenIntervalMs } from '@/sim/chests';
import { milestonePetsDue, petMaxRank, type PetFacts } from '@/sim/pets';
import { newClock } from '@/sim/stripEvents';
import { STRIP_EVENTS_LIVE } from '@/data/stripEvents';
import { countFilled } from '@/sim/slots';
import { simulateOffline, type OfflineSummary } from '@/sim/offline';
import type { CombatEvent } from '@/sim/combat';
import type { WorldState } from '@/sim/world';
import type { ItemInstance } from '@/sim/items';
import type { GemInstance } from '@/data/gems';
import { CHEST_CONFIG, chestCountOf, type ChestType } from '@/data/chests';
import type { PetObjectiveKind } from '@/data/pets';
import { worldOf, stageInWorld } from '@/data/stageScaling';
import { HERO_SPACING } from '@/data/field';
import { stageSignHeld } from './stageSign';
import { bestiaryKey } from './bestiaryKey';
import { difficultyIndexOf } from '@/data/difficulties';
import { isZoneBossStage } from '@/data/stageScaling';
import type { RecordsDelta } from '@/sim/records';
import { achievementLine } from '@/ui/codex/achievementWords';
import { useStore } from '@/state/store';
import { petName, t } from '@/i18n';
import { KIT_TOKENS } from '@/ui/kit/tokens';
import { encodeLootLine } from '@/ui/loot/lootLine';

// The store-driven bridge. The STORE owns player config (roster equipment/level/
// talents, tech, pets, gold, inventory); the SIM world owns transient combat +
// chest stacks + keys. The engine reads the store, rebuilds combatants when config
// changes (configEpoch), steps the sim on a fixed 100ms timestep, and batches
// accrual back into the store once per frame.

const MAX_CATCHUP_TICKS = 5;
/** Play time reaches the pets' objectives in steps of this long (the other facts as they happen). */
const PET_TIME_STEP_MS = 1000;

export class GameEngine {
  private readonly sim: Simulation;
  private bonuses: Bonuses;
  private appliedEpoch = -1;
  private accMs = 0;
  private lootDraws: number; // monotonic count of chests opened — the counter-based loot cursor
  private petTimeMs = 0; // active play not yet counted towards the pets' objectives

  constructor() {
    const st = useStore.getState();
    // Resume the chest-open counter where the last save left off (so loot keeps rolling
    // forward instead of replaying); each open derives its rng from (seed, drawIndex).
    this.lootDraws = st.lootDrawCount;
    this.bonuses = getBonuses(st.techRanks, st.petRanks, st.achievements);
    const combatMods = partyCombatMods(st.roster, this.bonuses.combatMods); // the same mods the interface shows (sim/partyStats)
    const heroes = st.roster.map((h) => buildHeroCombatant(heroConfig(h), combatMods));
    const world = createWorld(st.seed, heroes);
    // Resume from a loaded save: restore stage + chest stacks.
    world.globalStageIndex = Math.max(1, st.resumeStage);
    world.maxClearedStage = st.maxClearedStage;
    world.chests = st.chests.map((c) => ({ ...c }));
    world.stripEvents = newClock(st.seed, st.stripEventCount); // the strip events go on from where the save left them
    this.sim = new Simulation(world);
    // A save already past a milestone (from before milestone pets existed) gets its pets now (data/pets MILESTONE_PETS).
    for (const pet of milestonePetsDue(world.maxClearedStage, st.ownedPets)) st.addPet(pet);
    // The Codex: what the save's records, frontier, pets and heroes already reach — quietly (it is not news).
    useStore.getState().refreshAchievements(world.maxClearedStage, true);
    this.appliedEpoch = st.configEpoch; // the snapshot's: a pet just added bumped it, so the first update re-reads the bonuses
    this.mirror();
  }

  get world(): WorldState {
    return this.sim.world;
  }

  /** Count of chests opened so far, persisted so loot continues across reloads. */
  lootDrawCount(): number {
    return this.lootDraws;
  }

  update(dtMs: number): CombatEvent[] {
    this.syncConfig();
    this.applyTravel();
    this.applyEnterZoneBoss();
    this.accMs += dtMs;
    const events: CombatEvent[] = [];
    let gold = 0;
    let xp = 0;
    let bossKills = 0;
    let chestsFound = 0;
    const pets: string[] = [];
    let steps = 0;
    const wipesBefore = this.sim.world.wipes;
    const rec: RecordsDelta = { kills: 0, worldBossKills: 0, chestsFound: 0, hit: 0 }; // the Codex's records of this frame
    const creatures: Record<string, number> = {};
    while (this.accMs >= TICK_MS && steps < MAX_CATCHUP_TICKS) {
      const tickEvents = this.sim.tick(this.ctx());
      events.push(...tickEvents);
      this.countRecords(tickEvents, rec, creatures);
      const p = this.sim.world.pending;
      rec.kills = (rec.kills ?? 0) + p.kills + p.bossKills;
      gold += p.gold;
      xp += p.xp;
      bossKills += p.bossKills;
      chestsFound += p.chestsFound;
      pets.push(...p.petDrops);
      if (Object.keys(p.keys).length > 0) {
        useStore.getState().addZoneKeys(p.keys); // option A: the key the first clear of an X-9 hands over
        p.keys = {};
      }
      p.gold = 0;
      p.xp = 0;
      p.kills = 0;
      p.bossKills = 0;
      p.chestsFound = 0;
      p.petDrops = [];
      this.accMs -= TICK_MS;
      steps += 1;
    }
    if (this.accMs > TICK_MS * MAX_CATCHUP_TICKS) this.accMs = 0;

    const store = useStore.getState();
    this.noteFrameRecords(rec, creatures, { gold, xp, bossKills, chestsFound, playMs: steps * TICK_MS, wipes: this.sim.world.wipes - wipesBefore });
    if (gold > 0) store.addGold(gold);
    // Only heroes alive at the end of this batch earn XP — the dead sit it out until
    // they respawn (a fallen hero must NOT level while the rest fight on).
    if (xp > 0) store.gainExp(xp, this.sim.world.heroes.filter((h) => h.alive).map((h) => h.id));
    // What this frame's play adds to the owned pets' objectives — counted BEFORE a pet found this frame joins,
    // so a pet's objective only counts what happens after it is found.
    this.petTimeMs += steps * TICK_MS;
    const timePlayed = this.petTimeMs >= PET_TIME_STEP_MS ? this.petTimeMs : 0;
    this.petTimeMs -= timePlayed;
    this.notePets({ goldEarned: gold, xpEarned: xp, bossesDefeated: bossKills, chestsFound, timePlayed });
    for (const pet of pets) store.addPet(pet); // the store raises the "new pet" notice (ui/overlay/PetFoundNotice)
    this.autoOpen();
    this.mirror();
    this.pushHud();
    return events;
  }

  /** Catch up `elapsedMs` of away-time (capped). Away-time banks offline-multiplied gold/xp
   *  ONLY — no loot (chests), no pets, no stage advancement (the frontier moves solely during
   *  active play). Clears the raw pending buffer so the next frame doesn't double-count. */
  runOffline(elapsedMs: number): OfflineSummary {
    const summary = simulateOffline(this.sim, this.ctx(), elapsedMs);
    const store = useStore.getState();
    if (summary.gold > 0) store.addGold(summary.gold);
    if (summary.xp > 0) store.gainExp(summary.xp);
    store.noteRecords({ goldEarned: summary.gold, xpEarned: summary.xp }); // the Codex counts away-time gold and experience
    // Away-time banks gold and experience only, so of the pets' objectives only those two advance.
    this.notePets({ goldEarned: summary.gold, xpEarned: summary.xp });
    const p = this.sim.world.pending;
    p.gold = 0;
    p.xp = 0;
    p.kills = 0;
    p.bossKills = 0;
    p.chestsFound = 0;
    p.petDrops = [];
    p.keys = {};
    this.mirror();
    this.pushHud();
    return summary;
  }

  /** The player tapped the runaway chest on the strip (data/stripEvents): it joins the storage, or is lost because
   *  that storage is full. Says which in a loot line; counts it for the Codex when it is caught. */
  catchRunaway(): 'stored' | 'full' | null {
    const result = this.sim.catchRunaway(this.bonuses);
    if (result === null) return null;
    const store = useStore.getState();
    if (result === 'stored') store.noteRecords({ runaways: 1 });
    store.pushLootToast({ text: encodeLootLine({ text: t(result === 'stored' ? 'overlay.runawayCaught' : 'overlay.runawayLost') }), color: KIT_TOKENS.gold });
    this.mirror();
    return result;
  }

  /** Buy the wandering merchant's offer `index` (data/stripEvents): the store takes the gold and the piece; false
   *  without the gold, the room, or the merchant. */
  buyFromMerchant(index: number): boolean {
    const offer = this.sim.merchantOffer(index);
    if (offer === undefined) return false;
    if (!useStore.getState().buyFromMerchant(offer.entry, offer.price)) return false;
    this.sim.markSold(index);
    return true;
  }

  /** Open only the chests of `type` (the per-popup open). The rolled ITEMS and GEMS are
   *  returned so the UI can reveal each into the bag one-by-one with floating loot text;
   *  any KEYS are credited here (silent to the reveal) and also returned for a toast. */
  openChestType(type: ChestType): { items: ItemInstance[]; gems: GemInstance[]; keys: Record<number, number> } {
    const draw = { seed: this.sim.world.seed, n: this.lootDraws };
    const opened = chestCountOf(this.sim.world.chests, type);
    const loot = openType(this.sim.world, type, draw, this.bonuses);
    this.lootDraws = draw.n;
    // The Codex: chests opened and the best tiers that came out of them.
    const best = (tiers: number[]): number | undefined => (tiers.length === 0 ? undefined : Math.max(...tiers));
    useStore.getState().noteRecords({ chestsOpened: { [type]: opened }, itemTier: best(loot.items.map((i) => i.tier)), gemTier: best(loot.gems.map((g) => g.tier)) });
    if (type === 'normal') this.notePets({ commonChestsOpened: opened });
    // Manually cracking chests RESETS the auto-open countdown (it only runs when chests have
    // sat unopened for the full interval) — so a player who tends their loot pushes it back.
    const store = useStore.getState();
    store.addZoneKeys(loot.keys); // world-boss keys credited up front; reveal handles items/gems
    if (store.autoOpen.unlocked) store.setAutoOpen({ unlocked: true, lastRunAt: this.sim.world.tick * TICK_MS });
    this.mirror();
    return { items: loot.items, gems: loot.gems, keys: loot.keys };
  }

  /** Count facts towards the owned pets' objectives and announce every rank gained (a loot line over the strip). */
  private notePets(facts: Partial<Record<PetObjectiveKind, number>>): void {
    const store = useStore.getState();
    if (store.ownedPets.length === 0) return;
    const counted: PetFacts = Object.fromEntries(Object.entries(facts).filter(([, n]) => n > 0));
    if (Object.keys(counted).length === 0) return;
    for (const key of store.notePetFacts(counted)) {
      const rank = useStore.getState().petRanks[key] ?? 1;
      const text = rank >= petMaxRank(key) ? t('overlay.petRankMax', { pet: petName(key) }) : t('overlay.petRank', { pet: petName(key), rank });
      store.pushLootToast({ text: encodeLootLine({ text, sign: 'pet_sign_paw' }), color: KIT_TOKENS.gold }); // a 16 px sign: the pet's own portrait is 36
    }
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
    // Don't open silently — signal the UI to reveal every chest with staggered toasts (the same
    // path as a manual click). The engine only owns the TIMING; the reveal lives in the UI.
    store.requestAutoOpen();
    store.setAutoOpen({ unlocked: true, lastRunAt: nowMs });
  }

  // The Codex's records of one tick: each enemy that fell, by its creature (a summon is none), the world bosses
  // among them, and the hardest hit a hero landed.
  private countRecords(events: readonly CombatEvent[], rec: RecordsDelta, creatures: Record<string, number>): void {
    const w = this.sim.world;
    for (const ev of events) {
      if (ev.type === 'damage' && ev.sourceId !== undefined && (ev.amount ?? 0) > (rec.hit ?? 0) && w.heroes.some((h) => h.id === ev.sourceId)) rec.hit = ev.amount ?? 0;
      if (ev.type !== 'death') continue;
      const enemy = w.enemies.find((e) => e.id === ev.targetId);
      if (enemy === undefined) continue;
      const key = bestiaryKey(enemy, w.globalStageIndex);
      if (key !== undefined) creatures[key] = (creatures[key] ?? 0) + 1;
      if (enemy.isBoss === true && isZoneBossStage(w.globalStageIndex)) rec.worldBossKills = (rec.worldBossKills ?? 0) + 1;
    }
  }

  // Bank this frame's records in the store, read the achievements again and announce the new ones.
  private noteFrameRecords(rec: RecordsDelta, creatures: Record<string, number>, frame: { gold: number; xp: number; bossKills: number; chestsFound: number; playMs: number; wipes: number }): void {
    const store = useStore.getState();
    if (frame.playMs <= 0 && frame.gold <= 0 && frame.xp <= 0) return;
    store.noteRecords({
      ...rec,
      bossKills: frame.bossKills,
      goldEarned: frame.gold,
      xpEarned: frame.xp,
      chestsFound: frame.chestsFound,
      playMs: frame.playMs,
      wipes: frame.wipes,
      creatures: { difficulty: difficultyIndexOf(this.sim.world.globalStageIndex), counts: creatures },
    });
    store.refreshAchievements(this.sim.world.maxClearedStage);
    for (const key of useStore.getState().takeNewAchievements()) {
      store.pushLootToast({ text: encodeLootLine({ text: t('overlay.achievement', { line: achievementLine(key) }), sign: 'codex_medal_gold' }), color: KIT_TOKENS.gold });
    }
  }

  private ctx(): TickContext {
    const st = useStore.getState();
    // The live game plays the full death cinematic on a wipe (fade to black, phrase, respawn).
    // Headless balance probes omit it (instant retreat) so the beat doesn't distort throughput.
    // The same goes for the beat a fallen boss gets before the stage moves on (animateBossDown).
    return { bonuses: this.bonuses, ownedPetKeys: st.ownedPets, retryStage: st.retryStage, animateWipe: true, animateBossDown: true, stripEvents: STRIP_EVENTS_LIVE };
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
    const bossStage = world * 10; // this world's global X-10 stage (= worldBossStageOf any of its stages)
    // Gate: a world-boss challenge needs a key for THIS zone. Refuse (with a nudge) if none.
    if (store.zoneKeysFor(bossStage) <= 0) {
      store.pushLootToast({ text: encodeLootLine({ text: t('overlay.noKey'), sign: 'hud_key' }), color: KIT_TOKENS.gold });
      return;
    }
    if (this.sim.enterZoneBoss(world)) {
      store.consumeZoneKey(bossStage); // one key per attempt — spent on ENTRY, even if they wipe
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
    this.bonuses = getBonuses(st.techRanks, st.petRanks, st.achievements);
    const combatMods = partyCombatMods(st.roster, this.bonuses.combatMods); // the same mods the interface shows (sim/partyStats)
    const world = this.sim.world;
    const byId = new Map(world.heroes.map((h) => [h.id, h]));
    world.heroes = st.roster.map((h, i) => {
      const existing = byId.get(h.id);
      if (existing !== undefined) {
        refreshHeroLoadout(existing, heroConfig(h), combatMods);
        // Rescue a hero that's stranded far behind the party (e.g. recruited before
        // this fix) — snap it back into formation rather than make it walk the map.
        if (existing.alive && existing.x < world.partyX - 300) existing.x = world.partyX;
        return existing;
      }
      // A newly-recruited hero drops straight into its OWN formation slot behind the tank
      // (partyX - i·HERO_SPACING), not onto the lead anchor — so it materialises in place
      // (the render layer plays its arrival: render/arrival) instead of stacking on the tank
      // and walking back into line.
      const fresh = buildHeroCombatant(heroConfig(h), combatMods);
      fresh.x = world.partyX - i * HERO_SPACING;
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
      clockMs: w.tick * TICK_MS,
      party: useStore.getState().roster.map((h) => ({ classKey: h.classKey, level: h.level })),
      zoneKeysHeld: useStore.getState().zoneKeysFor(w.globalStageIndex),
      stageSignHeld: stageSignHeld(w),
    });
  }
}
