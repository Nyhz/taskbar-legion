/**
 * THE PACING TUNER (run: `npx vite-node scripts/tune-pacing.ts`) — one forward pass through the game with the
 * probe's average player (test/sim/probe) that proposes the four enemy tables of data/stageScaling.ts:
 *   GRUNT_HP_TUNE, TRASH_DMG_TUNE, STAGE_BOSS_HP_TUNE (the toughness anchors) and WORLD_WALL_MULT (the walls),
 * and the reference of what the on-gear party did (test/sim/probe/anchorReference.ts).
 *
 * At every tuning point (the nine stages of world 1 one by one, then each world as its party arrives), on every seed:
 *   1. TRASH HP  — a grunt takes GRUNT_HITS.target basic hits of the ON-GEAR party's hardest hitter (measured in a
 *                  fight). On-gear = in the full gear of the world just left: from Hell on, the arriving party
 *                  after some more hours of farming that world's last stage (in Normal: the party as it arrives).
 *   3. TRASH DMG — never above the formula; lowered until the arriving parties clear the point's hardest stage
 *                  without a wipe (enemies that live longer hit for longer); one seed in four may fail.
 *   2. STAGE BOSS — lasts STAGE_BOSS_SEC.target seconds against the on-gear party.
 * Then the world is played to its wall, and the WALL is set from what the world should last (targets.ts): each seed
 * farms at the wall holding its keys, remembering the party it has as each key drops; a candidate HP is judged by
 * the first of those parties that beats it (an attempt per key, as in the game), and the HP is bisected on the mean
 * hours. The floor is a wall every seed beats with its first key: a world cannot be shorter than its pass plus the
 * wait for a key. Normal's ten walls are left AT that floor. Nothing is written — copy the tables it prints (smooth them: one point on a few seeds is noisy).
 *
 * Env: TUNE_SEEDS (default 3), TUNE_WORLDS (last world, default 50), TUNE_ITER (bisection steps, default 7),
 * TUNE_KEEP=1 keeps today's anchor tables and tunes only the walls. TUNE_FROM=w plays the worlds before w on today's
 * walls (nothing measured or proposed for them) and tunes from w on.
 */
import { DEFAULT_CONFIG, newProbeRun, advanceProbe, probeResult, runParty, runBonuses, runActiveHours, type ProbeRun, type ProbeConfig } from '../test/sim/probe/loop';
import { measureBoss, measureFarm } from '../test/sim/probe/combat';
import { measureBasicHits, measureStageBoss, GRUNT_HITS, STAGE_BOSS_SEC } from '../test/sim/probe/anchors';
import { WORLD_WALL_MULT, ZONE_BOSS_HP_OVERRIDE, zoneBossHp, GRUNT_HP_TUNE, TRASH_DMG_TUNE, STAGE_BOSS_HP_TUNE, tunePoint, TUNE_POINTS } from '@/data/stageScaling';
import { CHEST_CONFIG, stageKeyDropChance } from '@/data/chests';
import { getBonuses } from '@/sim/bonuses';
import type { HeroConfig } from '@/sim/loadout';
import { WORLD_HOURS_TARGET } from '../test/sim/probe/targets';

const SEEDS = Array.from({ length: Math.max(1, Number(process.env.TUNE_SEEDS ?? 3)) }, (_, i) => i + 1);
const WORLDS = Math.min(50, Number(process.env.TUNE_WORLDS ?? 50));
const ITER = Number(process.env.TUNE_ITER ?? 7);
const KEEP_ANCHORS = process.env.TUNE_KEEP === '1';
const FROM = Math.max(1, Number(process.env.TUNE_FROM ?? 1));
const NO_WALL_WORLDS = 10; // Normal is strolled through: each of its walls is whatever every seed beats with its first key
const SEASON_MAX_HOURS = 6; // "full gear of the previous world" = this much more farming of its last stage, at most
const CFG: ProbeConfig = DEFAULT_CONFIG;

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] ?? 0) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2;
};
const f2 = (x: number): string => (x >= 100 ? x.toFixed(0) : x >= 10 ? x.toFixed(1) : x.toFixed(2));

const runs = SEEDS.map((s) => newProbeRun(s, CFG));
const refHit: number[] = Array.from({ length: TUNE_POINTS }, () => 0); // what the on-gear party did at each point
const refDps: number[] = Array.from({ length: TUNE_POINTS }, () => 0);

/** Tune the three anchor tables at the point of stage `at`, against the parties as they stand. `hard` is the
 *  hardest stage of the point (the one trash damage must leave clearable). Returns what it measured. */
function tuneAnchors(at: number, hard: number, wipesAllowed: number, seasonAt?: number): { hit: number; hits: number; bossSec: number; dmg: number } {
  const p = tunePoint(at);
  const parties = runs.map((r) => ({ party: runParty(r), bonuses: runBonuses(r) }));
  // The ON-GEAR party: in the opening, the party as it stands; from world 2 on, a party in the FULL gear of the
  // world it has just left — the same party after SEASON_HOURS more of farming that world's last stage. (A party
  // that found its key at once arrives with half its slots empty; one that farmed for its key must not walk into
  // the next world one-shotting it.)
  // In Normal nobody stays: the on-gear party is the one that arrives. From Hell on it stays half of what the
  // world it left was meant to last (six hours at most).
  const seasonHours = seasonAt === undefined || seasonAt <= 100 ? 0 : Math.min(SEASON_MAX_HOURS, 0.5 * (WORLD_HOURS_TARGET[Math.floor((seasonAt - 1) / 10)] ?? 0));
  const onGear = seasonHours <= 0 || seasonAt === undefined ? parties : runs.map((r) => {
    const c = structuredClone(r);
    advanceProbe(c, { ...CFG, farmStage: seasonAt, stopAtActiveSec: c.state.activeSec + seasonHours * 3600 });
    return { party: runParty(c), bonuses: runBonuses(c) };
  });
  // 1. trash HP: the hardest hitter's basic hit does not depend on the enemy's life.
  const hit = median(onGear.map((x) => measureBasicHits(x.party, at, CFG.measureSeed, x.bonuses).topHit));
  if (!KEEP_ANCHORS && hit > 0) GRUNT_HP_TUNE[p] = GRUNT_HITS.target * hit;
  // 2. the stage boss: seconds scale with its life, so two proportional steps settle it. (Before the trash
  // damage: that check clears a whole stage, boss included.)
  let bossSec = 0;
  for (let i = 0; i < (KEEP_ANCHORS ? 1 : 3); i++) {
    bossSec = median(onGear.map((x) => measureStageBoss(x.party, at, CFG.measureSeed, x.bonuses).seconds));
    if (KEEP_ANCHORS || i === 2) break;
    STAGE_BOSS_HP_TUNE[p] = (STAGE_BOSS_HP_TUNE[p] ?? 1) * Math.max(0.25, Math.min(4, STAGE_BOSS_SEC.target / Math.max(0.5, bossSec)));
  }
  // 3. trash damage: at most the formula's; less if the arriving parties cannot clear the hard stage cleanly.
  if (!KEEP_ANCHORS) {
    // One seed in four may fail: the player who found a key at once reaches the next world all but naked, and
    // tuning the damage to that party would leave everyone else's trash harmless.
    const clean = (d: number): boolean => {
      TRASH_DMG_TUNE[p] = d;
      const failed = parties.filter((x) => {
        const m = measureFarm(x.party, hard, CFG.measureSeed, x.bonuses);
        if (process.env.TUNE_DEBUG === '1') console.log(`    dmg ${d.toFixed(2)} at ${hard}: ${m.clearable ? 'cleared' : 'NOT cleared'} in ${m.clearSec.toFixed(0)}s, wipes ${m.wipes}, boss minHP ${(m.minHpFrac * 100).toFixed(0)}%`);
        return !(m.clearable && m.wipes <= wipesAllowed);
      }).length;
      return failed <= Math.floor(parties.length / 4);
    };
    if (!clean(1)) {
      let lo = 0.05;
      let hi = 1;
      for (let i = 0; i < 5; i++) {
        const mid = Math.sqrt(lo * hi);
        if (clean(mid)) lo = mid;
        else hi = mid;
      }
      TRASH_DMG_TUNE[p] = lo * 0.9; // a margin under the edge
    }
  }
  refHit[p] = hit;
  refDps[p] = bossSec > 0 ? (STAGE_BOSS_HP_TUNE[p] ?? 0) / bossSec : 0;
  return { hit, hits: hit > 0 ? (GRUNT_HP_TUNE[p] ?? 0) / hit : 0, bossSec, dmg: TRASH_DMG_TUNE[p] ?? 1 };
}

/** The most world-boss HP this party beats (2 of 3 fights), by bisection on a log scale. */
function beatableHp(party: readonly HeroConfig[], bonuses: ReturnType<typeof getBonuses>, world: number, base: number): number {
  const S = world * 10;
  const beats = (hp: number): boolean => {
    ZONE_BOSS_HP_OVERRIDE[world] = hp;
    let wins = 0;
    for (let k = 0; k < 3; k++) if (measureBoss(party, S, 9000 + k, bonuses).win) wins += 1;
    return wins >= 2;
  };
  let lo = base * 0.005;
  let hi = base * 80;
  if (!beats(lo)) return lo;
  if (beats(hi)) return hi;
  for (let i = 0; i < 10; i++) {
    const mid = Math.sqrt(lo * hi);
    if (beats(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

interface KeyMoment {
  hours: number; // active hours since the world began
  party: HeroConfig[];
  bonuses: ReturnType<typeof getBonuses>;
}

const keyClearsAt = (S: number): number => 1 / (CHEST_CONFIG.baseDropChance.stageBoss * CFG.capture.stageBoss * stageKeyDropChance(S)); // X-9 clears per key
console.log(`seeds ${SEEDS.length} · ${keyClearsAt(1).toFixed(1)} X-9 clears per key in Normal, ${keyClearsAt(101).toFixed(1)} after · bisection steps ${ITER}${KEEP_ANCHORS ? ' · anchors kept' : ''}`);

// ── world 1, stage by stage (the opening) ──
console.log('\nopening\tlvl\ttop hit\thits\tboss s\ttrash dmg\tcleared at (h)');
for (let s = 1; s <= 9; s++) {
  for (const r of runs) advanceProbe(r, { ...CFG, stopAtStage: s - 1 });
  const a = tuneAnchors(s, s, 1);
  for (const r of runs) advanceProbe(r, { ...CFG, stopAtStage: s });
  console.log([`1-${s}`, runs.map((r) => runParty(r).map((h) => h.level).join('/')).join(' '), f2(a.hit), a.hits.toFixed(2), a.bossSec.toFixed(1), f2(a.dmg), runs.map((r) => runActiveHours(r).toFixed(2)).join(' ')].join('\t'));
}

const walls: number[] = [];
console.log('\nworld\ttarget\ttop hit\thits\tboss s\ttrash dmg\tpass\tkey wait\thours mean\tmedian\trange\tattempts\tlvl\ttier\twall mult\tkill s\tclear x-1/x-9 s');
for (let w = 1; w <= WORLDS; w++) {
  const S = w * 10;
  const first = S - 9;
  const worldStart = runs.map((r) => runActiveHours(r));
  if (w < FROM) {
    // Before TUNE_FROM: played through on today's wall, nothing measured or proposed.
    for (const r of runs) advanceProbe(r, { ...CFG, stopAtStage: S });
    if (runs.some((r) => r.gaveUp || r.state.frontier < S)) {
      console.log(`world ${w}: a seed could not get past it on today's wall — stopping`);
      break;
    }
    walls.push(WORLD_WALL_MULT[w - 1] ?? 1);
    console.log(`${w}	kept	×${f2(WORLD_WALL_MULT[w - 1] ?? 1)}	hours ${runs.map((r, i) => (runActiveHours(r) - (worldStart[i] ?? 0)).toFixed(1)).join(' ')}`);
    continue;
  }
  let a = { hit: 0, hits: 0, bossSec: 0, dmg: 1 };
  if (w >= 2) {
    for (const r of runs) advanceProbe(r, { ...CFG, stopAtStage: first - 1 });
    a = tuneAnchors(first + 4, first + 8, 0, first - 2);
  }
  for (const r of runs) advanceProbe(r, { ...CFG, stopAtStage: S - 1 });
  if (runs.some((r) => r.gaveUp || r.state.frontier < S - 1)) {
    console.log(`world ${w}: a seed could not reach the wall (stages) — stopping`);
    break;
  }
  const pass = runs.map((r, i) => runActiveHours(r) - (worldStart[i] ?? 0));
  const clear1 = median(runs.map((r) => measureFarm(runParty(r), first, CFG.measureSeed, runBonuses(r)).clearSec));
  const clear9 = median(runs.map((r) => measureFarm(runParty(r), S - 1, CFG.measureSeed, runBonuses(r)).clearSec));
  const keyWait = (clear9 * keyClearsAt(S - 1)) / 3600;
  const target = WORLD_HOURS_TARGET[w - 1] ?? 0;
  delete ZONE_BOSS_HP_OVERRIDE[w];
  const base = zoneBossHp(S) / (WORLD_WALL_MULT[w - 1] ?? 1); // HP at ×1

  // Each seed farms at the wall holding its keys; the party it has at each key is what an attempt would field.
  const capH = 3 * Math.max(target, pass.reduce((x, y) => Math.max(x, y), 0) + keyWait) + 2 * keyWait;
  const moments: KeyMoment[][] = runs.map((r, i) => {
    const c = structuredClone(r);
    const list: KeyMoment[] = [];
    const note = (run: ProbeRun): void => {
      list.push({ hours: runActiveHours(run) - (worldStart[i] ?? 0), party: structuredClone(run.state.party), bonuses: getBonuses(run.state.techRanks, {}) });
    };
    for (let k = 0; k < (c.state.keys[S] ?? 0); k++) note(c); // keys found on the way in
    advanceProbe(c, { ...CFG, holdKeys: true, onKey: note, stopAtStage: S, stopAtActiveSec: c.state.activeSec + capH * 3600 });
    return list;
  });
  const hoursWith = (hp: number): number[] => {
    ZONE_BOSS_HP_OVERRIDE[w] = hp;
    return moments.map((list, i) => {
      const attempts0 = runs[i]?.attempts ?? 0;
      for (let k = 0; k < list.length; k++) {
        const m = list[k];
        if (m !== undefined && measureBoss(m.party, S, CFG.measureSeed + attempts0 + k, m.bonuses).win) return m.hours;
      }
      return (pass[i] ?? 0) + capH;
    });
  };
  const firstParty = (i: number): { party: readonly HeroConfig[]; bonuses: ReturnType<typeof getBonuses> } => {
    const m = moments[i]?.[0];
    const r = runs[i];
    return m ?? { party: r === undefined ? [] : runParty(r), bonuses: r === undefined ? getBonuses({}, {}) : runBonuses(r) };
  };
  const floor = Math.min(...runs.map((_, i) => beatableHp(firstParty(i).party, firstParty(i).bonuses, w, base))) * 0.9;
  let hp = floor;
  // Normal has no wall beyond its key: each of its world bosses falls to the first key (the floor) — the user's
  // "en Normal el jugador pasea". The walls begin in Hell.
  if (w > NO_WALL_WORLDS && mean(hoursWith(floor)) < target) {
    let lo = floor;
    let hi = floor * 10;
    let loMean = 0;
    let hiMean = Number.POSITIVE_INFINITY;
    for (let i = 0; i < ITER; i++) {
      const mid = Math.sqrt(lo * hi);
      const m = mean(hoursWith(mid));
      if (m < target) {
        lo = mid;
        loMean = m;
      } else {
        hi = mid;
        hiMean = m;
      }
    }
    hp = hiMean - target < target - loMean ? hi : lo; // the hours jump at the threshold: take the nearer side
  }
  ZONE_BOSS_HP_OVERRIDE[w] = hp;
  const arrival = runs.map((r) => runActiveHours(r));
  runs.forEach((r, i) => {
    let cap = 2 * capH + 12;
    for (;;) {
      advanceProbe(r, { ...CFG, stopAtStage: S, stopAtActiveSec: (arrival[i] ?? 0) * 3600 + cap * 3600 });
      if (r.state.frontier >= S || r.gaveUp) break;
      ZONE_BOSS_HP_OVERRIDE[w] = (ZONE_BOSS_HP_OVERRIDE[w] ?? hp) * 0.92;
      cap += 2 * keyWait;
      console.log(`  world ${w}: seed ${r.state.seed} stuck at the wall — easing it to ${(ZONE_BOSS_HP_OVERRIDE[w] ?? 0).toFixed(0)}`);
    }
  });
  hp = ZONE_BOSS_HP_OVERRIDE[w] ?? hp;
  const ms = runs.map((r) => r.milestones.find((m) => m.world === w)).filter((m): m is NonNullable<typeof m> => m !== undefined);
  const hours = ms.map((m) => m.hoursOnWorld);
  walls.push(hp / base);
  console.log([w, target.toFixed(1), f2(a.hit), a.hits.toFixed(2), a.bossSec.toFixed(1), f2(a.dmg), median(pass).toFixed(1), keyWait.toFixed(1), mean(hours).toFixed(1), median(hours).toFixed(1),
    `${Math.min(...hours).toFixed(1)}-${Math.max(...hours).toFixed(1)}`, mean(ms.map((m) => m.bossFails + 1)).toFixed(1), median(ms.map((m) => m.partyLevel)).toFixed(0), `T${median(ms.map((m) => m.topTier)).toFixed(0)}`,
    f2(hp / base), median(ms.map((m) => m.bossFightSec)).toFixed(0), `${clear1.toFixed(0)}/${clear9.toFixed(0)}`].join('\t'));
}

const results = runs.map((r) => probeResult(r, CFG));
const DIFFS = ['normal', 'hell', 'inferno', 'eternal', 'torment'];
console.log('\ntotal active hours per seed: ' + results.map((r) => r.totalActiveHours.toFixed(0)).join(' · '));
console.log('active hours at the end of each difficulty (median): ' + DIFFS.map((k) => `${k} ${median(results.map((r) => r.difficultyActiveHours[k] ?? NaN)).toFixed(0)}`).join(' · '));
console.log('xp per hero in total (away time included) now: ' + runs.map((r) => Math.round(r.state.xp[0] ?? 0).toLocaleString('en-US')).join(' · '));
const rows = (name: string, xs: readonly number[]): void => {
  console.log(`\n${name} = [`);
  for (let i = 0; i < xs.length; i += 10) console.log('  ' + xs.slice(i, i + 10).map((x) => f2(x)).join(', ') + ',');
  console.log('];');
};
rows('GRUNT_HP_TUNE', GRUNT_HP_TUNE.slice(0, TUNE_POINTS));
rows('TRASH_DMG_TUNE', TRASH_DMG_TUNE.slice(0, TUNE_POINTS));
rows('STAGE_BOSS_HP_TUNE', STAGE_BOSS_HP_TUNE.slice(0, TUNE_POINTS));
rows('WORLD_WALL_MULT', walls);
rows('REFERENCE_TOP_HIT', refHit);
rows('REFERENCE_BOSS_DPS', refDps);
