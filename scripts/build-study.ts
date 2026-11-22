/**
 * HOW MUCH DOES THE BUILD MATTER? For every world-boss wall, the party the probe's average player has there
 * (scripts/probe-snapshots.ts: real level, tech and gear) fights the wall with three policies, gear untouched:
 *   - default: the probe's build (test/sim/probe/builds PROBE_DEFAULT_BUILD);
 *   - random:  a build drawn at random per hero, a new one for every seed (a player who clicks anything);
 *   - optimal: the best build for THAT wall found by search — coordinate ascent over every distinct talent map
 *     of each class (every pair of abilities × branch × "choose one" modifiers × spend order), from the default.
 * Every seed is a different player: its own run seed (the boss's affixes) and combat rolls.
 *
 * Measured per policy: the win rate and kill time at the real wall, and the WALL MARGIN — the largest multiple of
 * the wall's life the policy still beats in WIN_TARGET of the seeds (bisection). Margin ratios translate into gear:
 * a party deals damage in proportion to its gear %, so a build with 1.3× the margin of another needs about 1/1.3 of
 * its gear to pass. The gear % of the snapshot party (zoneGear.gearPercent, default build) turns that into "gear %
 * of the zone needed to pass" per policy.
 *
 * Run: `npx vite-node scripts/build-study.ts` with STUDY_SNAP=<snapshots json>, STUDY_OUT=<results jsonl>,
 * STUDY_WALLS=10,20,… (default all in the file), STUDY_SEEDS (16), STUDY_SEARCH_SEEDS (6), STUDY_JOBS (9 workers).
 * Workers: the same script with STUDY_SHARD=i/N. STUDY_FARM=1 adds the farm comparison. Test/dev tooling only.
 */
import { readFileSync, appendFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Simulation, createWorld, TICK_MS, type TickContext } from '@/sim/Simulation';
import { ZONE_BOSS_HP_OVERRIDE, worldOf } from '@/data/stageScaling';
import { zoneBossHp } from '@/sim/enemyScale';
import { DIFFICULTY_KEYS } from '@/data/difficulties';
import { buildParty, measureFarm } from '../test/sim/probe/combat';
import { gearPercent, withZoneChests } from '../test/sim/probe/zoneGear';
import { abilityDef } from '@/data/abilities';
import { effectDef } from '@/data/effects';
import { allBuilds, buildLabel, buildTalents, fieldedAbilities, parseBuildLabel, randomPartyBuild, PROBE_DEFAULT_BUILD, type ClassBuild } from '../test/sim/probe/builds';
import type { HeroConfig } from '@/sim/loadout';
import type { Bonuses } from '@/sim/bonuses';
import type { SnapshotFile, WallSnapshot } from './probe-snapshots';

const SNAP = process.env.STUDY_SNAP ?? 'snapshots-1.json';
const OUT = process.env.STUDY_OUT ?? 'build-study.jsonl';
const SEEDS = Number(process.env.STUDY_SEEDS ?? 16);
const SEARCH_SEEDS = Number(process.env.STUDY_SEARCH_SEEDS ?? 4);
const JOBS = Number(process.env.STUDY_JOBS ?? 9);
const WIN_TARGET = 0.75;
const ROUNDS = 2;
const OVER_GEAR = Number(process.env.STUDY_OVER_GEAR ?? 150);

if (process.env.HEALS !== undefined) {
  // Tooling: heal numbers to try ({ abilityKey: { cooldownMs?, coeff?, coeffPerRank? } }), mutated in place.
  const over = JSON.parse(process.env.HEALS) as Record<string, { cooldownMs?: number; coeff?: number; coeffPerRank?: number }>;
  for (const [k, o] of Object.entries(over)) {
    const def = abilityDef(k) as { cooldownMs: number; power?: { coeff: number; coeffPerRank?: number } };
    if (o.cooldownMs !== undefined) def.cooldownMs = o.cooldownMs;
    if (def.power !== undefined && o.coeff !== undefined) def.power.coeff = o.coeff;
    if (def.power !== undefined && o.coeffPerRank !== undefined) def.power.coeffPerRank = o.coeffPerRank;
  }
}

type Party = Record<string, ClassBuild>;

interface Fight { win: boolean; fightSec: number; bossLeft: number }

/** One attempt at the wall at `S` with its life × `hpMult`; `seed` is the player (run seed) and the combat rolls. */
function fight(party: readonly HeroConfig[], S: number, seed: number, bonuses: Bonuses, hpMult: number): Fight {
  const W = worldOf(S);
  const pinned = ZONE_BOSS_HP_OVERRIDE[W];
  delete ZONE_BOSS_HP_OVERRIDE[W];
  const base = zoneBossHp(S);
  ZONE_BOSS_HP_OVERRIDE[W] = base * hpMult;
  try {
    const world = createWorld(seed, buildParty(party));
    world.maxClearedStage = S - 1;
    world.globalStageIndex = S - 1;
    const sim = new Simulation(world);
    if (!sim.enterZoneBoss(W)) return { win: false, fightSec: 0, bossLeft: 1 };
    const ctx: TickContext = { bonuses, ownedPetKeys: [], retryStage: true };
    const wipes = world.wipes;
    let seen = false;
    let left = 1;
    let fightSec = 0;
    for (let t = 0; t < (300 * 1000) / TICK_MS; t++) {
      sim.tick(ctx);
      world.chests = [];
      if (world.wipes > wipes) return { win: false, fightSec, bossLeft: left };
      const boss = world.enemies.find((e) => e.isBoss === true && e.alive);
      if (boss !== undefined) {
        seen = true;
        left = boss.maxHp > 0 ? boss.hp / boss.maxHp : 1;
        fightSec = (boss.fightMs ?? 0) / 1000;
      } else if (seen) return { win: true, fightSec, bossLeft: 0 };
    }
    return { win: false, fightSec, bossLeft: left };
  } finally {
    if (pinned === undefined) delete ZONE_BOSS_HP_OVERRIDE[W];
    else ZONE_BOSS_HP_OVERRIDE[W] = pinned;
  }
}

/** The snapshot party (its gear, level) playing `builds` (one per class). */
function withBuilds(snapParty: readonly HeroConfig[], builds: Party): HeroConfig[] {
  return snapParty.map((h) => {
    const b = builds[h.classKey] ?? PROBE_DEFAULT_BUILD[h.classKey];
    if (b === undefined) return h;
    return { ...h, talents: buildTalents(h.classKey, h.level, b), activeAbilities: fieldedAbilities(h.classKey, h.level, b), autoDefaultAbilities: true };
  });
}

/** Search score of a fight: a win is worth 1–2 (faster is better), a loss 0–1 (more of the boss taken is better). */
const score = (f: Fight): number => (f.win ? 2 - Math.min(1, f.fightSec / 300) : 1 - f.bossLeft);

const seedOf = (S: number, i: number): number => 7_000_000 + S * 1_000 + i;

/** Win rate of a policy at life × m over the study seeds (the random policy draws its builds per seed). */
function winRate(snap: WallSnapshot, policy: (i: number) => Party, m: number, n = SEEDS): { rate: number; fights: Fight[] } {
  const fights: Fight[] = [];
  for (let i = 0; i < n; i++) fights.push(fight(withBuilds(snap.party, policy(i)), snap.stage, seedOf(snap.stage, i), snap.bonuses, m));
  return { rate: fights.filter((f) => f.win).length / n, fights };
}

/** The largest life multiple the policy beats in WIN_TARGET of the seeds (geometric bisection between 1/16 and 16). */
function margin(snap: WallSnapshot, policy: (i: number) => Party): number {
  let lo = 1 / 16;
  let hi = 16;
  // bracket from 1
  if (winRate(snap, policy, 1).rate >= WIN_TARGET) lo = 1;
  else hi = 1;
  for (let k = 0; k < 6; k++) {
    const mid = Math.sqrt(lo * hi);
    if (winRate(snap, policy, mid).rate >= WIN_TARGET) lo = mid;
    else hi = mid;
  }
  return Math.sqrt(lo * hi);
}

/** Distinct builds of a class at this level (builds giving the same talents and abilities are one). */
function distinctBuilds(classKey: string, level: number): ClassBuild[] {
  const seen = new Map<string, ClassBuild>();
  for (const b of allBuilds(classKey)) {
    const key = JSON.stringify([fieldedAbilities(classKey, level, b), buildTalents(classKey, level, b)]);
    if (!seen.has(key)) seen.set(key, b);
  }
  return [...seen.values()];
}

/** Coordinate ascent from the default build at life × m: each class in turn tries all its distinct builds with the
 *  others fixed and keeps the best mean score over SEARCH_SEEDS seeds. */
function search(snap: WallSnapshot, m: number): { builds: Party; evals: number } {
  const cur: Party = {};
  for (const h of snap.party) {
    const b = PROBE_DEFAULT_BUILD[h.classKey];
    if (b !== undefined) cur[h.classKey] = b;
  }
  let evals = 0;
  const evalParty = (p: Party): number => {
    let s = 0;
    for (let i = 0; i < SEARCH_SEEDS; i++) s += score(fight(withBuilds(snap.party, p), snap.stage, seedOf(snap.stage, 100 + i), snap.bonuses, m));
    evals += SEARCH_SEEDS;
    return s / SEARCH_SEEDS;
  };
  let best = evalParty(cur);
  for (let r = 0; r < ROUNDS; r++) {
    let moved = false;
    for (const h of snap.party) {
      for (const b of distinctBuilds(h.classKey, h.level)) {
        if (b === cur[h.classKey]) continue;
        const trial = { ...cur, [h.classKey]: b };
        const s = evalParty(trial);
        if (s > best + 1e-9) {
          best = s;
          cur[h.classKey] = b;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  return { builds: cur, evals };
}

// ── Fixed builds (checkpoint 2): a Priest who carries no heal, a Knight who carries no defence ─────────────────────

/** Whether a Knight ability is defensive: it reduces damage taken, shields, or saps the enemy's damage. */
function defends(abilityKey: string): boolean {
  return (abilityDef(abilityKey).applies ?? []).some((a) => {
    const k = effectDef(a.effectKey).kind;
    if (k.type === 'shield' || k.type === 'invulnerable' || k.type === 'weaken') return true; // weaken: the enemy deals less
    if (k.type === 'statMod') return ['damageReduction', 'armor', 'magicResist', 'block'].includes(k.stat) || (k.value < 0 && effectDef(a.effectKey).beneficial === false);
    return false;
  });
}

/** Damage a party deals to the wall in its minute (the yardstick for picking the most damaging no-heal Priest). */
function damageOf(snap: WallSnapshot, p: Party): number {
  let dealt = 0;
  const f = fightDamage(withBuilds(snap.party, p), snap.stage, seedOf(snap.stage, 950), snap.bonuses);
  dealt += f;
  return dealt;
}

/** Damage dealt to an unkillable copy of the wall in 60 s. */
function fightDamage(party: readonly HeroConfig[], S: number, seed: number, bonuses: Bonuses): number {
  const W = worldOf(S);
  const pinned = ZONE_BOSS_HP_OVERRIDE[W];
  ZONE_BOSS_HP_OVERRIDE[W] = 1e18;
  try {
    const world = createWorld(seed, buildParty(party));
    world.maxClearedStage = S - 1;
    world.globalStageIndex = S - 1;
    const sim = new Simulation(world);
    if (!sim.enterZoneBoss(W)) return 0;
    const ctx: TickContext = { bonuses, ownedPetKeys: [], retryStage: true };
    let dealt = 0;
    for (let t = 0; t < 900; t++) {
      sim.tick(ctx);
      const boss = world.enemies.find((e) => e.isBoss === true);
      if (boss === undefined) continue;
      dealt = boss.maxHp - boss.hp;
      if ((boss.fightMs ?? 0) >= 60_000) break;
    }
    return dealt;
  } finally {
    if (pinned === undefined) delete ZONE_BOSS_HP_OVERRIDE[W];
    else ZONE_BOSS_HP_OVERRIDE[W] = pinned;
  }
}

/** The Priest who carries no heal (Holy Nova + Holy Shield, in Zeal), beside the knight and ranger of `rest`. */
function priestDps(_snap: WallSnapshot, rest: Party): Party {
  return { ...rest, priest: { abilities: ['priest_nova', 'priest_holyshield'], branch: 'zeal', exact: true } }; // no heal: Smite heals, so it is out
}

/** The Knight with no defensive ability that deals the most damage, beside the ranger and priest of `rest`. */
function knightOffensive(snap: WallSnapshot, rest: Party): Party {
  const knight = snap.party.find((h) => h.classKey === 'knight');
  if (knight === undefined) return rest;
  let best: ClassBuild | undefined;
  let bestDmg = -1;
  for (const b of distinctBuilds('knight', knight.level)) {
    if (fieldedAbilities('knight', knight.level, b).some(defends)) continue;
    const d = damageOf(snap, { ...rest, knight: b });
    if (d > bestDmg) { bestDmg = d; best = b; }
  }
  return best === undefined ? rest : { ...rest, knight: best };
}

const overCache = new Map<number, { party: HeroConfig[]; pct: number }>();
/** A party at about OVER_GEAR % of the zone or more (default build as yardstick): the snapshot party as it is when it
 *  already wears that much, else the snapshot party with chests of this and the following worlds opened on top. */
function overGeared(snap: WallSnapshot, target = OVER_GEAR): { party: HeroConfig[]; pct: number } {
  const S = snap.stage;
  const cached = overCache.get(S);
  if (cached !== undefined) return cached;
  const base = withBuilds(snap.party, { ...PROBE_DEFAULT_BUILD });
  const pctOf = (p: HeroConfig[]): number => gearPercent(p, S, snap.bonuses, seedOf(S, 960));
  let best = { party: base, pct: pctOf(base) };
  if (best.pct < target) {
    search: for (const k of [0, 10, 20, 30, 40, 50, 60, 80, 100]) {
      for (const chests of [60, 240]) {
        const p = withZoneChests(base, Math.min(500, Math.ceil((S + k) / 10) * 10), snap.bonuses, chests, 90_210 + 31 * k + chests);
        const pct = pctOf(p);
        if (pct > best.pct) best = { party: p, pct };
        if (pct >= target) break search;
      }
    }
  }
  overCache.set(S, best);
  return best;
}

interface WallResult {
  stage: number;
  difficulty: string;
  world: number;
  levels: number[];
  gearPct: number;
  mechanic?: string;
  policies: Record<string, { rate: number; killSec: number; margin: number; overRate?: number }>;
  overGearPct?: number;
  fixed?: Record<string, Record<string, string>>;
  optimal: Record<string, string>;
  randomSpread: { rate: number; best: number; worst: number };
  evals: number;
  sec: number;
}

function studyWall(snap: WallSnapshot): WallResult {
  const t0 = Date.now();
  const def = (): Party => ({ ...PROBE_DEFAULT_BUILD });
  const classes = snap.party.map((h) => h.classKey);
  const rnd = (i: number): Party => randomPartyBuild(classes, seedOf(snap.stage, 500 + i));
  const mDef = margin(snap, def);
  const found = search(snap, Math.max(mDef * 1.15, 1 / 16));
  const opt = (): Party => found.builds;
  const mOpt = margin(snap, opt);
  const mRnd = margin(snap, rnd);
  const at1 = (p: (i: number) => Party) => {
    const r = winRate(snap, p, 1);
    const wins = r.fights.filter((f) => f.win);
    return { rate: r.rate, killSec: wins.length > 0 ? wins.reduce((a, f) => a + f.fightSec, 0) / wins.length : 0, fights: r.fights };
  };
  const d1 = at1(def);
  const o1 = at1(opt);
  const r1 = at1(rnd);
  // how far apart random builds are: each seed's random build at the default's margin
  const perBuild = r1.fights.map((f) => score(f));
  const gearPct = gearPercent(withBuilds(snap.party, def()), snap.stage, snap.bonuses, seedOf(snap.stage, 900));
  const opts: Record<string, string> = {};
  for (const [c, b] of Object.entries(found.builds)) opts[c] = buildLabel(b);
  // Checkpoint 2: the two fixed builds beside the optimal one, and every policy with the party at OVER_GEAR % of the zone.
  const pDps = priestDps(snap, found.builds);
  const kOff = knightOffensive(snap, found.builds);
  const over = overGeared(snap);
  const overSnap: WallSnapshot = { ...snap, party: over.party };
  const overRate = (p: (i: number) => Party): number => winRate(overSnap, p, 1).rate;
  const fixedRows: Record<string, { rate: number; killSec: number; margin: number; overRate?: number }> = {};
  const labels: Record<string, Record<string, string>> = {};
  for (const [name, party] of [['priestDps', pDps], ['knightOff', kOff]] as const) {
    const r = at1(() => party);
    fixedRows[name] = { rate: r.rate, killSec: r.killSec, margin: margin(snap, () => party), overRate: overRate(() => party) };
    labels[name] = Object.fromEntries(Object.entries(party).map(([c, b]) => [c, buildLabel(b)]));
  }
  return {
    stage: snap.stage,
    difficulty: DIFFICULTY_KEYS[Math.floor((snap.stage - 1) / 100)] ?? '?',
    world: ((snap.stage / 10 - 1) % 10) + 1,
    levels: snap.party.map((h) => h.level),
    gearPct,
    policies: {
      default: { rate: d1.rate, killSec: d1.killSec, margin: mDef, overRate: overRate(def) },
      random: { rate: r1.rate, killSec: r1.killSec, margin: mRnd, overRate: overRate(rnd) },
      optimal: { rate: o1.rate, killSec: o1.killSec, margin: mOpt, overRate: overRate(opt) },
      ...fixedRows,
    },
    overGearPct: over.pct,
    fixed: labels,
    optimal: opts,
    randomSpread: { rate: r1.rate, best: Math.max(...perBuild), worst: Math.min(...perBuild) },
    evals: found.evals,
    sec: (Date.now() - t0) / 1000,
  };
}

/** Farm comparison: one clear of stage S (the snapshot of the wall above, on arrival) per policy, a few seeds. */
function studyFarm(snap: WallSnapshot, S: number, seeds: number, optimal?: Party): Record<string, number> {
  const out: Record<string, number> = {};
  const classes = snap.party.map((h) => h.classKey);
  const policies: Record<string, (i: number) => Party> = {
    default: () => ({ ...PROBE_DEFAULT_BUILD }),
    random: (i) => randomPartyBuild(classes, seedOf(S, 700 + i)),
  };
  if (optimal !== undefined) policies.optimal = () => optimal;
  for (const [name, p] of Object.entries(policies)) {
    let total = 0;
    for (let i = 0; i < seeds; i++) total += measureFarm(withBuilds(snap.party, p(i)), S, seedOf(S, i), snap.bonuses, 3600, seedOf(S, i)).clearSec;
    out[name] = total / seeds;
  }
  return out;
}

function worker(shard: number, of: number): void {
  const file = JSON.parse(readFileSync(SNAP, 'utf8')) as SnapshotFile;
  const walls = (process.env.STUDY_WALLS ?? Object.keys(file.last).join(',')).split(',').map(Number).filter((n) => n > 0);
  walls.sort((a, b) => b - a); // the late, costly walls first
  walls.forEach((S, idx) => {
    if (idx % of !== shard) return;
    const snap = file.last[S];
    if (snap === undefined) return;
    if (process.env.STUDY_GENERIC !== undefined) {
      // One fixed build for every wall (STUDY_GENERIC = JSON {class: label}): is the best build the same everywhere?
      const labels = JSON.parse(process.env.STUDY_GENERIC) as Record<string, string>;
      const g: Party = {};
      for (const [c, l] of Object.entries(labels)) g[c] = parseBuildLabel(c, l);
      const r1 = winRate(snap, () => g, 1);
      appendFileSync(OUT, JSON.stringify({ generic: S, margin: margin(snap, () => g), rate: r1.rate }) + '\n');
      process.stdout.write(`[${shard}] generic ${S} done\n`);
      return;
    }
    const r = studyWall(snap);
    appendFileSync(OUT, JSON.stringify(r) + '\n');
    if (process.env.STUDY_FARM === '1' && S % 50 === 0) {
      const arrive = file.arrive[S] ?? snap;
      const farm = studyFarm(arrive, S - 5, 4);
      appendFileSync(OUT, JSON.stringify({ farm: S - 5, ...farm }) + '\n');
    }
    process.stdout.write(`[${shard}] wall ${S} done in ${r.sec.toFixed(0)} s\n`);
  });
}

function master(): void {
  if (!existsSync(OUT)) writeFileSync(OUT, '');
  const kids = Array.from({ length: JOBS }, (_, i) => spawn('npx', ['vite-node', 'scripts/build-study.ts'], {
    env: { ...process.env, STUDY_SHARD: `${i}/${JOBS}` },
    stdio: ['ignore', 'inherit', 'inherit'],
  }));
  let left = kids.length;
  for (const k of kids) k.on('exit', () => { left -= 1; if (left === 0) process.stdout.write('all workers done\n'); });
}

const shard = process.env.STUDY_SHARD;
if (process.env.STUDY_BENCH === '1') {
  const file = JSON.parse(readFileSync(SNAP, 'utf8')) as SnapshotFile;
  for (const S of [100, 200, 300, 400, 500]) {
    const snap = file.last[S];
    if (snap === undefined) continue;
    const t = Date.now();
    const f = fight(withBuilds(snap.party, { ...PROBE_DEFAULT_BUILD }), S, 1, snap.bonuses, 1);
    const n = snap.party.map((h) => distinctBuilds(h.classKey, h.level).length);
    process.stdout.write(`S${S}: ${Date.now() - t} ms, win ${f.win} ${f.fightSec.toFixed(0)}s left ${f.bossLeft.toFixed(2)}, distinct builds ${n.join('/')}\n`);
  }
} else if (shard !== undefined) {
  const [i, n] = shard.split('/').map(Number);
  worker(i ?? 0, n ?? 1);
} else master();
