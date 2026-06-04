import { Simulation, createWorld, type TickContext, TICK_MS } from '@/sim/Simulation';
import { buildHeroCombatant, refreshHeroLoadout, type HeroConfig } from '@/sim/loadout';
import { getBonuses, type Bonuses } from '@/sim/bonuses';
import { openAll, openChest, chestCapacity } from '@/sim/chests';
import { AUTO_OPEN_BASE_INTERVAL_MS, AUTO_OPEN_FLOOR_MS } from '@/data/chests';
import type { ItemInstance } from '@/sim/items';
import type { GemInstance } from '@/data/gems';
import { STATS, type StatKey } from '@/data/stats';
import { totalExpToReach, stageInWorld, MAX_LEVEL, resumeStageFor } from '@/data/stageScaling';
import { talentNodes } from '@/data/talents';
import { classDef } from '@/data/classes';
import { TECH_NODES, nodeCost, type TechNode } from '@/data/techTree';

// A "greedy" player agent over the pure sim — used to MEASURE the PROGRESSION §11
// invariants and co-tune constants. Always equips the best dropped item per slot,
// spends every talent point + gold, and grows the party as tech unlocks slots.
// This is test/dev tooling (uses only sim/ + data/), not shipped game code.

export interface RunnerOptions {
  seed: number;
  freezeGearAtStage?: number; // stop equipping new gear at/after this stage (invariant #3)
  openChests: boolean;
  maxEquipTier?: number; // cap the tier the agent will equip (models a "decent gear" player who never lucks into top-tier drops)
  // REALISTIC PLAYER (pacing calibration): models an ACTIVE player who opens ~all chests as
  // they're earned (NOT the idle auto-open throttle — players open manually until the auto-open
  // tech makes it moot), but at ~75% of PERFECT (a quarter lost to overflow/missed opens during
  // heavy farming). Used ONLY to calibrate pacing (sim-time ≈ calendar time, game running). The
  // default (false) keeps the old ~100% "open as earned" fast-forward so existing tests are
  // unchanged.
  realisticOpen?: boolean;
}

export interface StageClear {
  stage: number; // global stage index that was cleared (normal stage boss defeated)
  ticks: number; // ticks spent on that stage instance
}

// Category buy-priority once the trio is formed (party slots are rushed separately via
// nextPartySlotNode below, since a solo/duo can't out-DPS bosses). Combat first.
const TECH_GROUP_PRIORITY: Record<string, number> = {
  Combat: 5,
  Economy: 3,
  Chests: 2,
  Utility: 1,
};

// The agent builds the canonical composition the game is balanced around:
// frontline (knight) → dps (ranger) → healer (priest), then extra dps. So it saves
// for the priest as its 3rd hero rather than stacking a 2nd/3rd dps. (More frontline
// and healer classes later enable other comps; not all comps need to be viable.)
const PARTY_PRIORITY: string[] = ['knight', 'ranger', 'priest'];

export class GreedyRunner {
  readonly sim: Simulation;
  private readonly configs: HeroConfig[] = [];
  private readonly heroExp: number[] = [];
  private readonly talentPoints: number[] = [];
  private techRanks: Record<string, number> = {};
  private gold = 0;
  private goldEarned = 0; // cumulative gold income (before spending) — pacing instrumentation
  private xpEarned = 0; // cumulative xp income summed over heroes — pacing instrumentation
  private partyGrewAt: number[] = []; // global stage index at each party-size increase
  private ownedPets: string[] = [];
  private unlockedClasses: string[] = ['knight'];
  private bonuses: Bonuses;
  private freezeStage: number;
  private readonly maxEquipTier: number;
  private readonly openChests: boolean;
  private readonly realisticOpen: boolean;
  private stageStartTick = 0;
  private waveStartTick = 0;
  private lastWaves = 0;
  private lootDraws = 0; // counter-based loot cursor (mirrors the engine's lootDrawCount)
  readonly clears: StageClear[] = [];
  readonly waveTimes: number[] = []; // seconds to clear each individual wave

  constructor(opts: RunnerOptions) {
    this.freezeStage = opts.freezeGearAtStage ?? Number.POSITIVE_INFINITY;
    this.maxEquipTier = opts.maxEquipTier ?? Number.POSITIVE_INFINITY;
    this.openChests = opts.openChests;
    this.realisticOpen = opts.realisticOpen ?? false;
    // autoDefaultAbilities makes an empty selection resolve to the first two ranked
    // abilities, so the harness measures a realistic 2-ability loadout without managing a
    // selection as abilities unlock over a run (the live game fires only what's selected).
    this.configs.push({ id: 'h0', classKey: 'knight', level: 1, equipment: {}, talents: {}, activeAbilities: [], autoDefaultAbilities: true });
    this.heroExp.push(0);
    this.talentPoints.push(0);
    this.bonuses = getBonuses(this.techRanks, this.ownedPets);
    const heroes = this.configs.map((c) => buildHeroCombatant(c, this.bonuses.combatMods));
    this.sim = new Simulation(createWorld(opts.seed, heroes));
  }

  get stage(): number {
    return this.sim.world.globalStageIndex;
  }
  set freezeGearAtStage(s: number) {
    this.freezeStage = s;
  }

  /** Run up to `maxTicks`, stopping early if `untilStage` is reached. */
  run(maxTicks: number, untilStage = Number.POSITIVE_INFINITY): void {
    const ctx: TickContext = { bonuses: this.bonuses, ownedPetKeys: this.ownedPets };
    let prevPhase = this.sim.world.phase;
    for (let i = 0; i < maxTicks; i++) {
      const before = this.stage;
      ctx.bonuses = this.bonuses;
      this.sim.tick(ctx);
      this.drain();
      // Open chests periodically (not every tick) — emulates auto-open and keeps the
      // harness fast over the now-longer wave-based stages.
      // Open chests "as earned" (active player). realisticOpen → skip 1 of every 4 open-cycles
      // = ~75% of perfect throughput (overflow/missed opens), the pacing-calibration model.
      if (this.openChests && this.sim.world.tick % 30 === 0 && (!this.realisticOpen || (this.sim.world.tick / 30) % 4 !== 0)) this.handleChests();
      this.maybeEnterZoneBoss();
      this.afterTick(before);
      // Greedy climb (finite model): a re-cleared BEATEN stage LOOPS in the game (the human
      // parks to farm), so the active agent must travel UP to retry the wall. When a boss just
      // ended without advancing (a loop) and we're below the frontier, push one stage up — each
      // loop farmed its chests/xp this pass, so this replicates "farm a bit, climb, retry".
      const w = this.sim.world;
      const frontier = resumeStageFor(w.maxClearedStage);
      const bossJustEnded = (prevPhase === 'boss' || prevPhase === 'zoneBoss') && w.phase === 'advancing';
      if (bossJustEnded && w.globalStageIndex === before && w.globalStageIndex < frontier) {
        this.sim.travelTo(Math.min(frontier, w.globalStageIndex + 1));
      }
      prevPhase = w.phase;
      if (this.stage >= untilStage) return;
    }
  }

  private afterTick(stageBefore: number): void {
    const w = this.sim.world;
    // Per-wave clear timing (the snappy unit now that a stage is a 20-wave area).
    if (w.wavesThisStage > this.lastWaves) {
      this.waveTimes.push((w.tick - this.waveStartTick) * TICK_MS / 1000);
      this.waveStartTick = w.tick;
    }
    this.lastWaves = w.wavesThisStage;
    if (w.globalStageIndex !== stageBefore) this.waveStartTick = w.tick;

    // Per-stage clear (a full "area"): advanced to a higher stage.
    if (w.globalStageIndex > stageBefore) {
      this.clears.push({ stage: stageBefore, ticks: w.tick - this.stageStartTick });
      this.stageStartTick = w.tick;
      this.lastWaves = 0;
    } else if (w.globalStageIndex < stageBefore) {
      this.stageStartTick = w.tick; // retreated; reset timers
      this.lastWaves = 0;
    }
  }

  private drain(): void {
    const w = this.sim.world;
    this.gold += w.pending.gold;
    this.goldEarned += w.pending.gold;
    this.xpEarned += w.pending.xp;
    for (let i = 0; i < this.configs.length; i++) {
      this.heroExp[i] = (this.heroExp[i] ?? 0) + w.pending.xp;
      this.levelUp(i);
    }
    if (w.pending.petDrops.length > 0) {
      for (const p of w.pending.petDrops) if (!this.ownedPets.includes(p)) this.ownedPets.push(p);
      this.recomputeBonuses();
    }
    w.pending.gold = 0;
    w.pending.xp = 0;
    w.pending.petDrops = [];
    this.spendGold();
    this.spendTalentsAll();
  }

  private handleChests(): void {
    const w = this.sim.world;
    if (w.chests.length === 0) return;
    const draw = { seed: w.seed, n: this.lootDraws };
    const loot = openAll(w, draw, this.bonuses);
    this.lootDraws = draw.n;
    if (this.stage < this.freezeStage) {
      for (const item of loot.items) this.tryEquip(item);
      this.socketGems(loot.gems);
    }
  }

  // Greedy player: while farming a beaten W-9, the instant a key for this zone is held,
  // spend it to attempt the world boss (mirrors clicking the strip portal). No-op until
  // enterZoneBoss's preconditions (W-9 beaten + key) are met.
  private maybeEnterZoneBoss(): void {
    const w = this.sim.world;
    if (w.phase !== 'advancing' && w.phase !== 'fighting') return; // not while already in a boss
    if (stageInWorld(w.globalStageIndex) !== 9) return;
    this.sim.enterZoneBoss();
  }

  private tryEquip(item: ItemInstance): void {
    if (item.tier > this.maxEquipTier) return; // "decent gear" model: ignore top-tier jackpot drops
    for (let i = 0; i < this.configs.length; i++) {
      const cfg = this.configs[i];
      if (cfg === undefined) continue;
      // No level gate: ilvl is a pure power stat now (gear, not level, carries content).
      if (item.classKey !== undefined && item.classKey !== cfg.classKey) continue; // class-locked weapon/off-hand
      const current = cfg.equipment[item.slot];
      if (current === undefined || itemScore(item) > itemScore(current)) {
        cfg.equipment[item.slot] = item;
        this.refresh(i);
        return;
      }
    }
  }

  private socketGems(gems: GemInstance[]): void {
    for (const gem of gems) {
      for (let i = 0; i < this.configs.length; i++) {
        const cfg = this.configs[i];
        if (cfg === undefined) continue;
        const item = Object.values(cfg.equipment).find(
          (it) => it !== undefined && it.sockets.some((s) => s.gem === null),
        );
        if (item !== undefined) {
          const socket = item.sockets.find((s) => s.gem === null);
          if (socket !== undefined) {
            socket.gem = gem;
            this.refresh(i);
            break;
          }
        }
      }
    }
  }

  private levelUp(i: number): void {
    const cfg = this.configs[i];
    if (cfg === undefined) return;
    let leveled = false;
    while (cfg.level < MAX_LEVEL && (this.heroExp[i] ?? 0) >= totalExpToReach(cfg.level + 1)) {
      cfg.level += 1;
      this.talentPoints[i] = (this.talentPoints[i] ?? 0) + 1;
      leveled = true;
    }
    if (leveled) this.refresh(i);
  }

  private spendTalentsAll(): void {
    for (let i = 0; i < this.configs.length; i++) {
      let spent = false;
      while ((this.talentPoints[i] ?? 0) > 0 && this.spendTalentPoint(i)) {
        this.talentPoints[i] = (this.talentPoints[i] ?? 0) - 1;
        spent = true;
      }
      if (spent) this.refresh(i);
    }
  }

  private spendTalentPoint(i: number): boolean {
    const cfg = this.configs[i];
    if (cfg === undefined) return false;
    const pointsSpent = Object.values(cfg.talents).reduce((a, b) => a + b, 0);
    const nodes = talentNodes(cfg.classKey);
    // Priority: signature ability first (so it casts), then passives in tree order.
    const ordered = [...nodes].sort((a, b) => (a.kind === 'ability' ? -1 : 0) - (b.kind === 'ability' ? -1 : 0));
    for (const node of ordered) {
      if (node.rowIndex * 10 > pointsSpent) continue;
      const rank = cfg.talents[node.key] ?? 0;
      if (rank < node.maxRank) {
        cfg.talents[node.key] = rank + 1;
        return true;
      }
    }
    return false;
  }

  private spendGold(): void {
    let changed = false;
    // Unlock the next class in composition priority (frontline→dps→healer→…) when
    // affordable — feeds party growth toward the tank/dps/healer core.
    for (const key of PARTY_PRIORITY) {
      if (this.unlockedClasses.includes(key)) continue;
      const unlock = classDef(key).unlock;
      if (unlock.type === 'gold' && this.gold >= unlock.cost) {
        this.gold -= unlock.cost;
        this.unlockedClasses.push(key);
        changed = true;
      }
      break; // only consider the next class in order
    }
    // RUSH THE TRIO: while the party is still forming, a real player SAVES for the next
    // party member (class unlock + slot tech) instead of dribbling gold onto cheap
    // combat nodes — a solo/duo can't out-DPS bosses, so the party is the priority.
    // Hold all gold (buy nothing else) until the next party-slot tech is affordable,
    // then buy it; only spend on other tech once the trio is complete. Without this the
    // greedy spends to ~0 every tick and never affords the 685g bootstrap (it stays solo
    // forever, a harness artifact — NOT the real new-game experience).
    if (this.configs.length < 3) {
      const slotNode = this.nextPartySlotNode();
      if (slotNode !== null && this.gold >= nodeCost(slotNode, this.techRanks[slotNode.key] ?? 0)) {
        this.gold -= nodeCost(slotNode, this.techRanks[slotNode.key] ?? 0);
        this.techRanks[slotNode.key] = (this.techRanks[slotNode.key] ?? 0) + 1;
        changed = true;
      }
      if (changed) {
        this.recomputeBonuses();
        this.growParty();
      }
      return; // save the rest toward the next party step
    }
    // Trio complete → buy tech greedily by priority.
    for (;;) {
      const node = this.bestBuyableTech();
      if (node === null) break;
      this.gold -= nodeCost(node, this.techRanks[node.key] ?? 0);
      this.techRanks[node.key] = (this.techRanks[node.key] ?? 0) + 1;
      changed = true;
    }
    if (changed) {
      this.recomputeBonuses();
      this.growParty();
    }
  }

  /** The next party-slot tech node to grow the party (slot 2, then slot 3), or null
   *  if the party is at the tech cap. Used by the "rush the trio" save logic. */
  private nextPartySlotNode(): TechNode | null {
    for (const node of TECH_NODES) {
      if (!node.effects.some((e) => e.kind === 'partySlot')) continue;
      if ((this.techRanks[node.key] ?? 0) >= node.maxRanks) continue;
      return node;
    }
    return null;
  }

  private bestBuyableTech(): TechNode | null {
    let best: TechNode | null = null;
    let bestPriority = -1;
    for (const node of TECH_NODES) {
      const rank = this.techRanks[node.key] ?? 0;
      if (rank >= node.maxRanks) continue;
      if (node.effects.some((e) => e.kind === 'partySlot')) continue; // rushed separately
      const cost = nodeCost(node, rank);
      if (this.gold < cost) continue;
      const pr = TECH_GROUP_PRIORITY[node.category] ?? 0;
      if (pr > bestPriority || (pr === bestPriority && best !== null && cost < nodeCost(best, this.techRanks[best.key] ?? 0))) {
        best = node;
        bestPriority = pr;
      }
    }
    return best;
  }

  private growParty(): void {
    const slots = this.bonuses.partySlots;
    while (this.configs.length < slots) {
      const next = this.unlockedClasses.find((k) => !this.configs.some((c) => c.classKey === k));
      if (next === undefined) break;
      const id = `h${this.configs.length}`;
      this.configs.push({ id, classKey: next, level: 1, equipment: {}, talents: {}, activeAbilities: [], autoDefaultAbilities: true });
      this.heroExp.push(0);
      this.talentPoints.push(0);
      this.partyGrewAt.push(this.sim.world.globalStageIndex);
      this.sim.world.heroes.push(buildHeroCombatant(this.configs[this.configs.length - 1]!, this.bonuses.combatMods));
    }
  }

  private recomputeBonuses(): void {
    this.bonuses = getBonuses(this.techRanks, this.ownedPets);
    for (let i = 0; i < this.configs.length; i++) this.refresh(i);
  }

  private refresh(i: number): void {
    const cfg = this.configs[i];
    const hero = this.sim.world.heroes[i];
    if (cfg !== undefined && hero !== undefined) refreshHeroLoadout(hero, cfg, this.bonuses.combatMods);
  }

  // ── instrumentation ──
  get goldTotal(): number {
    return this.gold;
  }
  get goldEarnedTotal(): number {
    return this.goldEarned;
  }
  get xpEarnedTotal(): number {
    return this.xpEarned;
  }
  get simSeconds(): number {
    return (this.sim.world.tick * TICK_MS) / 1000;
  }
  get goldMult(): number {
    return this.bonuses.goldMult;
  }
  get xpMult(): number {
    return this.bonuses.xpMult;
  }
  /** Global stage index at each party-size growth (e.g. [s2, s3]). */
  get partyGrowthStages(): number[] {
    return [...this.partyGrewAt];
  }
  get partySize(): number {
    return this.configs.length;
  }
  get heroLevels(): number[] {
    return this.configs.map((c) => c.level);
  }
  /** Tier of every currently-equipped item across the party (for gear-model reporting). */
  get equippedTiers(): number[] {
    const tiers: number[] = [];
    for (const cfg of this.configs) {
      for (const it of Object.values(cfg.equipment)) if (it !== undefined) tiers.push(it.tier);
    }
    return tiers;
  }
  techRankSummary(): Record<string, number> {
    return { ...this.techRanks };
  }
}

// Drop-rate / key-rate throughput probe (invariants #5/#6). Mimics farming at a
// fixed monster level: each auto-open cycle the normal + stage-boss chest stacks
// are full (kill rate >> caps at this stage), so we open `capacity` of each and
// tally tier counts + keys. Returns per-`hours` totals (items+gems combined).
export interface DropRateResult {
  itemTiers: number[];
  gemTiers: number[];
  combined: number[];
}

export function dropRateProbe(S: number, hours: number, bonuses: Bonuses, seed = 0xd00d): DropRateResult {
  const rng = makeOpenRng(seed ^ S);
  const interval = Math.max(AUTO_OPEN_FLOOR_MS, AUTO_OPEN_BASE_INTERVAL_MS - bonuses.autoOpenReduceMs);
  const cycles = Math.floor((hours * 3600 * 1000) / interval);
  const itemTiers = new Array(9).fill(0) as number[];
  const gemTiers = new Array(9).fill(0) as number[];
  const capN = chestCapacity('normal', bonuses);
  const capS = chestCapacity('stageBoss', bonuses);
  const tally = (type: 'normal' | 'stageBoss', count: number): void => {
    for (let i = 0; i < count; i++) {
      const r = openChest(type, S, rng, bonuses);
      for (const it of r.items) itemTiers[it.tier] = (itemTiers[it.tier] ?? 0) + 1;
      for (const g of r.gems) gemTiers[g.tier] = (gemTiers[g.tier] ?? 0) + 1;
    }
  };
  for (let c = 0; c < cycles; c++) {
    tally('normal', capN);
    tally('stageBoss', capS);
  }
  const combined = itemTiers.map((v, i) => v + (gemTiers[i] ?? 0));
  return { itemTiers, gemTiers, combined };
}

function itemScore(item: ItemInstance): number {
  let score = 0;
  for (const b of item.baseAffix) score += weightedStat(b.key, b.value);
  for (const s of item.stats) score += weightedStat(s.key, s.value);
  return score;
}
function weightedStat(key: StatKey, value: number): number {
  const pct = STATS[key].kind === 'percent';
  const keyWeight = key === 'attackDamage' ? 1.5 : key === 'health' ? 0.8 : 1;
  return value * (pct ? 4 : 1) * keyWeight;
}

// Local mulberry32 (mirrors sim/rng) so the harness opens chests with its own
// deterministic stream — kept here to avoid coupling test tooling to internal rng.
function makeOpenRng(seed: number) {
  let s = seed >>> 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (m: number) => Math.floor(next() * m),
    range: (min: number, max: number) => min + next() * (max - min),
    chance: (p: number) => next() < p,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)] as T,
    state: () => s >>> 0,
  };
}

export { TICK_MS };
