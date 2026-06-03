/**
 * FAST ANALYTIC pacing harness (sim-pace) — the calibration tool for the long timeline.
 *
 * Tick-simulating to W200 at ~1 year is ~345M ticks (infeasible). This computes each stage's
 * clear-time + loot ANALYTICALLY (no ticking) so a full multi-year run finishes in ms, letting
 * us iterate the gear-treadmill/wall balance against the W60/W100/W200 day-marks.
 *
 * Models the REALISTIC ACTIVE player (the "sweaty"/optimal grinder — Average Andy is ~3× slower):
 * authentic loot via openChest (75% capture), best-per-slot equip, gem socketing, leveling, a
 * coarse tech model, and the W-10 wall as a DPS+survival gate you farm the world to break.
 * sim-time ≈ calendar time (offline accrues). Validate vs the tick harness at shallow depth.
 */
import { buildHeroCombatant, type HeroConfig } from '../src/sim/loadout';
import { heroStats } from '../src/sim/combat';
import { getBonuses, type Bonuses } from '../src/sim/bonuses';
import { openChest } from '../src/sim/chests';
import { CHEST_CONFIG } from '../src/data/chests';
import { TECH_NODES, nodeCost } from '../src/data/techTree';
import { talentNodes } from '../src/data/talents';
import { STATS } from '../src/data/stats';
import { type SlotKey } from '../src/data/itemSlots';
import type { ItemInstance } from '../src/sim/items';
import type { GemInstance } from '../src/data/gems';
import {
  enemyHp, enemyDamage, stageBossHp, mitigation, MAX_LEVEL,
  totalExpToReach, goldPerKill, xpPerKill, waveSizeForStage, WAVES_PER_STAGE, ELITE_CHANCE,
  ELITE_HP_MULT, TRASH_HP_FRACTION, ENEMY_BASE_ATTACK_SPEED, phi,
  ZONE_ENRAGE_MS, ZONE_BOSS_DMG_MULT, enrageMultiplier, worldOf, stageInWorld,
  ZONE_BOSS_C, ZONE_BOSS_EXP, ZONE_BOSS_RAMP_START, ZONE_BOSS_RAMP_END_WORLD,
} from '../src/data/stageScaling';

// zone-boss HP with env overrides (ZC/ZEXP/ZSAT) for fast sweeping; ZSAT adds a deep soft-cap
// (saturation) so the wall flattens with the gear ceiling instead of bricking. Falls back to the
// real stageScaling constants. Once a combo lands, bake it into stageScaling.
function zoneBossHp(S: number): number {
  const C = Number(process.env.ZC ?? ZONE_BOSS_C);
  const EXP = Number(process.env.ZEXP ?? ZONE_BOSS_EXP);
  const SAT = Number(process.env.ZSAT ?? 0); // 0 = off; else phi-knee for soft saturation
  const W = worldOf(S);
  const ramp = Math.min(1, ZONE_BOSS_RAMP_START + (1 - ZONE_BOSS_RAMP_START) * Math.max(0, W - 1) / (ZONE_BOSS_RAMP_END_WORLD - 1));
  let hp = C * phi(S) ** EXP * ramp;
  if (SAT > 0) hp = hp / (1 + phi(S) / SAT); // soft saturation: flattens the deep tail
  return hp;
}

const PARTY: string[] = ['knight', 'ranger', 'priest'];
const ABILITY_DPS_MULT = 1.3; // autoDefault abilities add ~30% over auto-attacks (approx)

// ── local rng (mulberry32, matches the sim's stream shape) ──
function makeRng(seed: number) {
  let s = seed >>> 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { next, int: (m: number) => Math.floor(next() * m), range: (a: number, b: number) => a + next() * (b - a), chance: (p: number) => next() < p, pick: <T>(x: readonly T[]): T => x[Math.floor(next() * x.length)] as T, state: () => s >>> 0 };
}

function itemScore(it: ItemInstance, role: 'dps' | 'tank' | 'heal'): number {
  const w = (k: string, v: number): number => {
    const pct = STATS[k as keyof typeof STATS]?.kind === 'percent';
    let kw = 1;
    if (k === 'attackDamage') kw = role === 'dps' ? 2 : 1;
    else if (k === 'health') kw = role === 'tank' ? 1.6 : 0.8;
    else if (k === 'armor' || k === 'magicResist') kw = role === 'tank' ? 1.4 : 0.4;
    else if (k === 'healPower') kw = role === 'heal' ? 2 : 0.2;
    return v * (pct ? 4 : 1) * kw;
  };
  let s = 0;
  for (const b of it.baseAffix) s += w(b.key, b.value);
  for (const st of it.stats) s += w(st.key, st.value);
  return s;
}

function specTalents(classKey: string, points: number): Record<string, number> {
  const t: Record<string, number> = {};
  const nodes = [...talentNodes(classKey)].sort((a, b) => (a.kind === 'ability' ? -1 : 0) - (b.kind === 'ability' ? -1 : 0));
  let spent = 0;
  while (spent < points) {
    let did = false;
    for (const n of nodes) { if (n.rowIndex * 10 > spent) continue; const r = t[n.key] ?? 0; if (r < n.maxRank) { t[n.key] = r + 1; spent++; did = true; break; } }
    if (!did) break;
  }
  return t;
}

interface Hero { classKey: string; role: 'dps' | 'tank' | 'heal'; level: number; xp: number; equipment: Partial<Record<SlotKey, ItemInstance>>; }

class Player {
  heroes: Hero[];
  techRanks: Record<string, number> = {};
  gold = 0;
  gemBag: GemInstance[] = [];
  bonuses: Bonuses;
  private rng = makeRng(12345);

  constructor() {
    this.heroes = PARTY.map((c) => ({ classKey: c, role: c === 'knight' ? 'tank' : c === 'ranger' ? 'dps' : 'heal', level: 1, xp: 0, equipment: {} }));
    this.bonuses = getBonuses(this.techRanks, []);
  }

  private statsOf(h: Hero): ReturnType<typeof heroStats> {
    const cfg: HeroConfig = { id: h.classKey, classKey: h.classKey, level: h.level, equipment: h.equipment, talents: specTalents(h.classKey, Math.max(0, h.level - 1)), activeAbilities: [], autoDefaultAbilities: true };
    return heroStats(buildHeroCombatant(cfg, this.bonuses.combatMods));
  }
  private dpsOf(s: ReturnType<typeof heroStats>): number {
    return s.attackDamage * s.attackSpeed * (1 + Math.min(1, s.critChance / 100) * s.critDamage / 100) * (1 + Math.min(1, (s.multistrike ?? 0) / 100)) * ABILITY_DPS_MULT;
  }
  partyDPS(): number { return this.heroes.reduce((a, h) => a + this.dpsOf(this.statsOf(h)), 0); }
  tank(): ReturnType<typeof heroStats> { return this.statsOf(this.heroes[0]!); }
  healer(): ReturnType<typeof heroStats> { return this.statsOf(this.heroes[2]!); }

  // socket a gem into any equipped item with a free socket (DPS hero first)
  private socket(gem: GemInstance): void {
    for (const h of this.heroes) {
      for (const it of Object.values(h.equipment)) {
        if (it === undefined) continue;
        const sock = it.sockets.find((s) => s.gem === null);
        if (sock !== undefined) { sock.gem = gem; return; }
      }
    }
  }
  applyLoot(items: ItemInstance[], gems: GemInstance[]): void {
    for (const it of items) {
      for (const h of this.heroes) {
        if (it.classKey !== undefined && it.classKey !== h.classKey) continue;
        const cur = h.equipment[it.slot];
        if (cur === undefined || itemScore(it, h.role) > itemScore(cur, h.role)) { h.equipment[it.slot] = it; break; }
      }
    }
    for (const g of gems) this.socket(g);
  }
  addXp(perHero: number): void {
    for (const h of this.heroes) { h.xp += perHero; while (h.level < MAX_LEVEL && h.xp >= totalExpToReach(h.level + 1)) h.level++; }
  }
  buyTech(): void {
    let changed = false;
    for (;;) {
      let best: typeof TECH_NODES[number] | null = null;
      for (const n of TECH_NODES) { const r = this.techRanks[n.key] ?? 0; if (r >= n.maxRanks) continue; if (this.gold < nodeCost(n, r)) continue; if (best === null || nodeCost(n, r) < nodeCost(best, this.techRanks[best.key] ?? 0)) best = n; }
      if (best === null) break;
      this.gold -= nodeCost(best, this.techRanks[best.key] ?? 0); this.techRanks[best.key] = (this.techRanks[best.key] ?? 0) + 1; changed = true;
    }
    if (changed) this.bonuses = getBonuses(this.techRanks, []);
  }
  openChestsRoll(type: 'normal' | 'stageBoss' | 'zoneBoss', n: number, S: number): number {
    let keys = 0;
    for (let i = 0; i < n; i++) { const r = openChest(type, S, this.rng, this.bonuses, PARTY); this.applyLoot(r.items, r.gems); keys += r.keys; }
    return keys;
  }
}

// ── analytic stage clear: returns {seconds, kills} ──
function clearStage(p: Player, S: number): { seconds: number; kills: number } {
  const dps = p.partyDPS();
  const waveSize = waveSizeForStage(S);
  const kills = waveSize * WAVES_PER_STAGE;
  const mobHP = enemyHp(S) * TRASH_HP_FRACTION * (1 + ELITE_CHANCE * (ELITE_HP_MULT - 1));
  const dpsTime = (kills * mobHP) / Math.max(1, dps);
  const cadenceFloor = WAVES_PER_STAGE * 2; // waves teleport in ~ every 2s
  const trashTime = Math.max(dpsTime, cadenceFloor);
  const bossTime = stageBossHp(S) / Math.max(1, dps);
  return { seconds: trashTime + bossTime, kills };
}

// survival time (s) the tank lasts vs a boss, given its DPS + enrage; with healer sustain.
function survivalSeconds(p: Player, S: number, bossDmgMult: number): number {
  const tank = p.tank();
  const heal = p.healer();
  const dr = mitigation(tank.armor, S);
  const baseHit = enemyDamage(S) * bossDmgMult * (1 - dr) * (1 - Math.min(80, tank.block) / 100 * 0.5); // block softens
  const aspd = ENEMY_BASE_ATTACK_SPEED;
  const sustain = (heal.healPower ?? 0) * 0.9 + (tank.hpRegen ?? 0); // approx heals+regen /s
  let hp = tank.health;
  for (let t = 0; t < 600; t++) {
    const dmg = baseHit * aspd * enrageMultiplier(t * 1000, ZONE_ENRAGE_MS);
    hp += sustain - dmg;
    if (hp <= 0) return t;
    if (hp > tank.health) hp = tank.health;
  }
  return 600;
}

interface Result { reachedWorld: number; dayOf: Map<number, number>; bricked: boolean; brickWorld: number; }

function run(maxDays: number): Result {
  const p = new Player();
  let timeMs = 0;
  const dayOf = new Map<number, number>();
  let world = 1;
  dayOf.set(1, 0);
  const dropN = (type: 'normal' | 'stageBoss', kills: number, stage: number): number => {
    const cap = type === 'normal' ? 1 : CHEST_CONFIG.baseDropChance.stageBoss;
    const per = type === 'normal' ? CHEST_CONFIG.baseDropChance.normal : 1;
    // experiment: depth-dependent gear-acquisition rate. FARM0 = base, FARMEXP = how fast useful
    // drops get rarer deep (the deceleration lever). FARM(W) = FARM0 × (15/max(15,W))^FARMEXP.
    const FARM0 = Number(process.env.FARM0 ?? 1);
    const FARMEXP = Number(process.env.FARMEXP ?? 0);
    const FARMBASE = Number(process.env.FARMBASE ?? 15);
    const W = worldOf(stage);
    const farm = FARM0 * Math.pow(FARMBASE / Math.max(FARMBASE, W), FARMEXP);
    return Math.round((type === 'normal' ? kills * per : cap) * 0.75 * farm * p.bonuses.chestDropMult * p.bonuses.chestTypeDropMult[type]);
  };

  for (let S = 1; ; S++) {
    const W = worldOf(S);
    const inWorld = stageInWorld(S);
    if (inWorld === 10) {
      // ── THE WALL: farm this world until DPS + survival beats the zone boss, then advance ──
      const zHP = zoneBossHp(S);
      const fs = (W - 1) * 10 + 9; // farm the hardest non-boss stage of this world
      const BATCH = 200; // farm in batches (DPS recomputed per batch) so slow-deep worlds stay fast
      let batches = 0; let windowBatch = 0; let windowDps = p.partyDPS();
      for (;;) {
        const dps = p.partyDPS();
        const tSurv = survivalSeconds(p, S, ZONE_BOSS_DMG_MULT);
        if (process.env.DBG && batches % 20 === 0) console.error(`  W${W} b#${batches} dps=${dps.toFixed(0)} reach=${(dps * tSurv).toFixed(0)} zHP=${zHP.toFixed(0)} lvl=${p.heroes[0]!.level} day=${(timeMs / 86400000).toFixed(1)}`);
        if (dps * tSurv >= zHP) break; // PASS
        // one batch of BATCH farm-cycles at the batch-start dps (gear improves within → approx)
        const waveSize = waveSizeForStage(fs); const kills = waveSize * WAVES_PER_STAGE;
        const mobHP = enemyHp(fs) * TRASH_HP_FRACTION * (1 + ELITE_CHANCE * (ELITE_HP_MULT - 1));
        const cycleSec = Math.max((kills * mobHP) / Math.max(1, dps), WAVES_PER_STAGE * 2) + stageBossHp(fs) / Math.max(1, dps);
        timeMs += cycleSec * 1000 * BATCH;
        p.gold += Math.round(kills * goldPerKill(fs) * p.bonuses.goldMult) * BATCH;
        p.addXp(Math.round(kills * xpPerKill(fs) * p.bonuses.xpMult) * BATCH);
        for (let b = 0; b < BATCH; b++) { p.openChestsRoll('normal', dropN('normal', kills, fs), fs); p.openChestsRoll('stageBoss', dropN('stageBoss', kills, fs), fs); }
        p.buyTech();
        batches++;
        // TRUE brick: DPS essentially flat (<1%) over a large window — slow-but-progressing farming continues.
        if (batches - windowBatch >= 150) { if (dps < windowDps * 1.01) return { reachedWorld: W, dayOf, bricked: true, brickWorld: W }; windowBatch = batches; windowDps = dps; }
        if (batches > 300_000) return { reachedWorld: W, dayOf, bricked: true, brickWorld: W };
        if (timeMs / 86400000 > maxDays) return { reachedWorld: W, dayOf, bricked: false, brickWorld: 0 };
      }
      // beat the wall (the kill itself is quick once you can)
      timeMs += (zHP / p.partyDPS()) * 1000;
      world = W + 1;
      if (!dayOf.has(world)) dayOf.set(world, timeMs / 86400000);
    } else {
      const c = clearStage(p, S);
      timeMs += c.seconds * 1000;
      p.gold += Math.round(c.kills * goldPerKill(S) * p.bonuses.goldMult);
      p.addXp(Math.round(c.kills * xpPerKill(S) * p.bonuses.xpMult));
      p.openChestsRoll('normal', dropN('normal', c.kills, S), S);
      p.openChestsRoll('stageBoss', dropN('stageBoss', c.kills, S), S);
      p.buyTech();
    }
    if (timeMs / 86400000 > maxDays) return { reachedWorld: worldOf(S), dayOf, bricked: false, brickWorld: 0 };
  }
}

function fmt(days: number): string {
  if (days < 1) return `${(days * 24).toFixed(1)}h`;
  if (days < 90) return `${days.toFixed(1)}d`;
  return `${(days / 30.4).toFixed(1)}mo`;
}

// ── CEILING probe: fully-farm a world (open many chests at ilvl=10W), report max DPS×survival
// vs the wall HP there. Shows whether the wall sits below the achievable ceiling (no brick) and
// how much headroom — the anchor for pegging ZONE_BOSS_C/EXP to ~85% of ceiling.
if (process.argv[2] === 'ceiling') {
  console.log('world | maxReach(dps×tSurv) | zoneBossHp | wall/ceiling | maxDPS');
  for (const W of [5, 10, 20, 30, 50, 80, 100, 150, 200, 250]) {
    const p = new Player();
    // jump the party to ~on-level: level cap + heavily farm this world's stage-9 gear
    for (const h of p.heroes) { h.level = Math.min(MAX_LEVEL, Math.max(1, W * 10 - 12)); h.xp = totalExpToReach(h.level); }
    const fs = (W - 1) * 10 + 9;
    for (let i = 0; i < 8000; i++) { p.openChestsRoll('normal', 2, fs); if (i % 20 === 0) p.openChestsRoll('stageBoss', 1, fs); }
    const S = (W - 1) * 10 + 10;
    const dps = p.partyDPS();
    const tSurv = survivalSeconds(p, S, ZONE_BOSS_DMG_MULT);
    const reach = dps * tSurv;
    const zHP = zoneBossHp(S);
    console.log(`  ${String(W).padStart(4)} | ${(reach).toFixed(0).padStart(14)} | ${zHP.toFixed(0).padStart(10)} | ${(zHP / reach).toFixed(2).padStart(11)} | dps ${dps.toFixed(0)} tSurv ${tSurv.toFixed(0)}s`);
  }
  process.exit(0);
}

const MAX_DAYS = Number(process.argv[2] ?? 500);
const r = run(MAX_DAYS);
console.log(`=== sim-pace (analytic, realistic active player) — budget ${MAX_DAYS}d ===\n`);
const milestones = [2, 5, 10, 20, 30, 40, 60, 80, 100, 130, 160, 200, 250, 300];
console.log('world | reached at');
for (const w of milestones) { const d = r.dayOf.get(w); if (d !== undefined) console.log(`  ${String(w).padStart(4)} | ${fmt(d)}`); }
console.log('');
for (const tw of [60, 100, 200]) { const d = r.dayOf.get(tw); console.log(`W${tw}: ${d !== undefined ? fmt(d) : '(not reached)'}`); }
if (r.bricked) console.log(`\n⚠ BRICK WALL at world ${r.brickWorld} (gear plateaued below the wall).`);
console.log(`\nFinal: reached W${r.reachedWorld} in budget.`);
