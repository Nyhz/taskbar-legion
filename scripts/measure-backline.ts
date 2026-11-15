/**
 * How much of the enemies' damage lands BEHIND the front hero (docs/DIFFICULTY.md §5b: the back line takes
 * damage). Run: `npx vite-node scripts/measure-backline.ts`.
 *
 * Takes the parties the progression probe's average player has at a few stages (test/sim/probe: gear, levels,
 * talents — the real thing, not a synthetic party) and plays each stage in the REAL simulation, adding up the
 * damage events by who took them. Reports, per stage: the share of the damage taken by the heroes behind the
 * front one during the waves and during the stage boss, hero deaths, wipes, and the clear time; and the same for
 * a world-boss attempt — and, beside them, the same parties under the OLD tank-only rule (clear time, wipes,
 * wins), so the cost of the rule shows. `BACKLINE_TO=<stage>` sets how far the probe runs (default 201: the
 * whole of Normal and Hell).
 *
 * Test/dev tooling only (sim/ + data/).
 */
import { runProbe, DEFAULT_CONFIG } from '../test/sim/probe/loop';
import { buildParty } from '../test/sim/probe/combat';
import { freshHero } from '../test/sim/probe/economy';
import { getBonuses } from '@/sim/bonuses';
import { Simulation, createWorld, TICK_MS, type TickContext } from '@/sim/Simulation';
import type { HeroConfig } from '@/sim/loadout';
import type { Bonuses } from '@/sim/bonuses';
import type { Combatant, WorldState } from '@/sim/world';
import { ABILITIES } from '@/data/abilities';
import { ENEMY_KINDS } from '@/data/enemies';
import { worldOf } from '@/data/stageScaling';

const TO = Math.max(11, Number(process.env.BACKLINE_TO ?? 201));
const SEEDS = [11, 12, 13, 14, 15];

// The old rule on the same code, switched on and off around a run: nothing aims behind the tank, nothing
// splashes, bosses never slam. (The data is mutated in place and put back — tooling only.)
const BOSS_BLOWS = ['boss_slam', 'boss_shockwave'];
const saved = {
  backShot: ENEMY_KINDS.map((k) => k.backShotChance),
  aimedTarget: ABILITIES.enemy_aimed?.target,
  aimedCoeff: ABILITIES.enemy_aimed?.power?.coeff,
  smashSplash: ABILITIES.enemy_smash?.power?.splashCoeff,
  openers: BOSS_BLOWS.map((k) => ABILITIES[k]?.openerMs),
};
/** The coefficient Piercing Shot had on the front hero before the rule (git history of data/abilities.ts). */
const OLD_AIMED_COEFF = 1.6;
function oldRule(on: boolean): void {
  ENEMY_KINDS.forEach((k, i) => { k.backShotChance = on ? 0 : (saved.backShot[i] ?? 0); });
  const aimed = ABILITIES.enemy_aimed;
  if (aimed !== undefined && saved.aimedTarget !== undefined) {
    aimed.target = on ? 'frontEnemy' : saved.aimedTarget;
    if (aimed.power !== undefined && saved.aimedCoeff !== undefined) aimed.power.coeff = on ? OLD_AIMED_COEFF : saved.aimedCoeff;
  }
  const smash = ABILITIES.enemy_smash?.power;
  if (smash !== undefined) {
    if (on) delete smash.splashCoeff;
    else if (saved.smashSplash !== undefined) smash.splashCoeff = saved.smashSplash;
  }
  BOSS_BLOWS.forEach((k, i) => {
    const def = ABILITIES[k];
    if (def !== undefined) def.openerMs = on ? Number.MAX_SAFE_INTEGER : saved.openers[i]; // seeded on engage: never off cooldown
  });
}

interface Snapshot {
  stage: number;
  party: HeroConfig[];
  bonuses: Bonuses;
}

const WAVE_STAGES = [3, 6, 9, 15, 25, 35, 45, 65, 85, 95, 115, 155, 195, 255, 295, 355, 395].filter((s) => s < TO);
const BOSS_STAGES = [10, 20, 30, 50, 70, 100, 150, 200, 250, 300, 350, 380, 390, 400].filter((s) => s < TO);
const wanted = new Set([...WAVE_STAGES, ...BOSS_STAGES]);
const snaps = new Map<number, Snapshot>();

runProbe(1, {
  ...DEFAULT_CONFIG,
  observe: (target, party, bonuses) => {
    if (target >= TO) return false;
    // Keep the LAST party seen at a stage: the one that finally clears it (a wall is tried many times).
    if (wanted.has(target)) snaps.set(target, { stage: target, party: structuredClone(party) as HeroConfig[], bonuses });
    return true;
  },
});

interface Tally {
  front: number; // damage taken by the front hero
  back: number; // damage taken by the heroes behind it
  backDeaths: number;
  frontDeaths: number;
  /** The damage behind the front hero, by what dealt it: a basic attack (`shot`) or an ability key. */
  backBy: Record<string, number>;
  /** The hardest single hit a hero behind the front one took, as a share of its max life. */
  worstBackHit: number;
  /** The same two sums while the boss is not yet enraged (boss fights only). */
  calmFront: number;
  calmBack: number;
}
const zero = (): Tally => ({ front: 0, back: 0, backDeaths: 0, frontDeaths: 0, backBy: {}, worstBackHit: 0, calmFront: 0, calmBack: 0 });

function frontHero(w: WorldState): Combatant | undefined {
  let best: Combatant | undefined;
  for (const h of w.heroes) if (h.alive && (best === undefined || h.x > best.x)) best = h;
  return best;
}

/** One tick, its damage and deaths added to `into` by who took them. */
function step(sim: Simulation, ctx: TickContext, into: Tally): void {
  const w = sim.world;
  const front = frontHero(w)?.id;
  const heroes = new Map(w.heroes.map((h) => [h.id, h]));
  const boss = w.enemies.find((e) => e.isBoss === true && e.alive);
  const calm = boss !== undefined && (boss.fightMs ?? 0) < (boss.enrageMs ?? Number.POSITIVE_INFINITY);
  for (const ev of sim.tick(ctx)) {
    const hero = heroes.get(ev.targetId);
    if (hero === undefined) continue;
    if (ev.type === 'damage' && ev.tick !== true) {
      if (ev.targetId === front) {
        into.front += ev.amount ?? 0;
        if (calm) into.calmFront += ev.amount ?? 0;
      } else {
        into.back += ev.amount ?? 0;
        if (calm) into.calmBack += ev.amount ?? 0;
        if (hero.maxHp > 0) into.worstBackHit = Math.max(into.worstBackHit, (ev.amount ?? 0) / hero.maxHp);
        const by = ev.abilityKey ?? 'shot';
        into.backBy[by] = (into.backBy[by] ?? 0) + (ev.amount ?? 0);
      }
    } else if (ev.type === 'death') {
      if (ev.targetId === front) into.frontDeaths += 1;
      else into.backDeaths += 1;
    }
  }
  w.pending.gold = 0;
  w.pending.xp = 0;
  w.pending.petDrops.length = 0;
  w.chests = [];
}

interface StageRun {
  waves: Tally;
  boss: Tally;
  clearSec: number; // 0 = not cleared within the budget
  wipes: number;
}

function runStage(snap: Snapshot, seed: number, budgetSec = 900): StageRun {
  const world = createWorld(seed, buildParty(snap.party));
  world.globalStageIndex = snap.stage;
  world.maxClearedStage = snap.stage;
  const sim = new Simulation(world);
  const ctx: TickContext = { bonuses: snap.bonuses, ownedPetKeys: [], retryStage: true };
  const out: StageRun = { waves: zero(), boss: zero(), clearSec: 0, wipes: 0 };
  let bossWipes = -1;
  const maxTicks = Math.floor((budgetSec * 1000) / TICK_MS);
  for (let t = 0; t < maxTicks; t++) {
    const inBoss = world.phase === 'boss';
    step(sim, ctx, inBoss ? out.boss : out.waves);
    if (world.phase === 'boss') {
      if (bossWipes < 0) bossWipes = world.wipes;
    } else if (bossWipes >= 0) {
      if (world.wipes === bossWipes) {
        out.clearSec = ((t + 1) * TICK_MS) / 1000;
        break;
      }
      bossWipes = -1;
    }
  }
  out.wipes = world.wipes;
  return out;
}

interface BossRun {
  fight: Tally;
  win: boolean;
  sec: number;
}

function runWorldBoss(snap: Snapshot, seed: number, capSec = 300): BossRun {
  const world = createWorld(seed, buildParty(snap.party));
  world.maxClearedStage = snap.stage - 1;
  world.globalStageIndex = snap.stage - 1;
  const sim = new Simulation(world);
  const out: BossRun = { fight: zero(), win: false, sec: 0 };
  if (!sim.enterZoneBoss(worldOf(snap.stage))) return out;
  const ctx: TickContext = { bonuses: snap.bonuses, ownedPetKeys: [], retryStage: true };
  let tracking = false;
  const maxTicks = Math.floor((capSec * 1000) / TICK_MS);
  for (let t = 0; t < maxTicks; t++) {
    step(sim, ctx, out.fight);
    out.sec = ((t + 1) * TICK_MS) / 1000;
    if (world.wipes > 0) return out;
    const boss = world.enemies.find((e) => e.isBoss === true && e.alive);
    if (world.phase === 'zoneBoss' && boss !== undefined) tracking = true;
    else if (tracking) {
      out.win = true;
      return out;
    }
  }
  return out;
}

const calmPct = (t: Tally): string => (t.calmFront + t.calmBack <= 0 ? '  —' : `${((100 * t.calmBack) / (t.calmFront + t.calmBack)).toFixed(0).padStart(3)}%`);
const hit = (t: Tally): string => `${(100 * t.worstBackHit).toFixed(0)}%`;
const pct = (t: Tally): string => (t.front + t.back <= 0 ? '  —' : `${((100 * t.back) / (t.front + t.back)).toFixed(0).padStart(3)}%`);
function add(a: Tally, b: Tally): Tally {
  const backBy = { ...a.backBy };
  for (const [k, v] of Object.entries(b.backBy)) backBy[k] = (backBy[k] ?? 0) + v;
  return {
    front: a.front + b.front, back: a.back + b.back, backDeaths: a.backDeaths + b.backDeaths, frontDeaths: a.frontDeaths + b.frontDeaths, backBy,
    worstBackHit: Math.max(a.worstBackHit, b.worstBackHit), calmFront: a.calmFront + b.calmFront, calmBack: a.calmBack + b.calmBack,
  };
}
/** Where the damage behind the front hero came from, as shares of ALL the damage taken: "shot 12% · enemy_smash 9%". */
function sources(t: Tally): string {
  const total = t.front + t.back;
  if (total <= 0 || t.back <= 0) return '';
  return Object.entries(t.backBy).sort((x, y) => y[1] - x[1]).map(([k, v]) => `${k} ${((100 * v) / total).toFixed(0)}%`).join(' · ');
}
const classes = (party: readonly HeroConfig[]): string => party.map((h) => `${h.classKey[0]?.toUpperCase() ?? '?'}${h.level}`).join(' ');

console.log(`\n=== BACK-LINE DAMAGE — probe seed 1 parties, ${SEEDS.length} combat seeds each ===`);
console.log('\n--- a full stage: 20 waves + its stage boss ---');
console.log('stage\tparty\t\twaves→back\tboss→back\tworst hit behind (waves/boss, % of its life)\tdeaths back/front (per clear)\twipes\tclear s\t| old rule: wipes\tclear s\t| waves: back damage by source (share of all damage)');
for (const S of WAVE_STAGES) {
  const snap = snaps.get(S);
  if (snap === undefined) { console.log(`${S}\t(not reached)`); continue; }
  let waves = zero();
  let boss = zero();
  const now = { wipes: 0, sec: 0, cleared: 0 };
  const old = { wipes: 0, sec: 0, cleared: 0 };
  for (const seed of SEEDS) {
    const r = runStage(snap, seed);
    waves = add(waves, r.waves);
    boss = add(boss, r.boss);
    now.wipes += r.wipes;
    if (r.clearSec > 0) { now.cleared += 1; now.sec += r.clearSec; }
    oldRule(true);
    const o = runStage(snap, seed);
    oldRule(false);
    old.wipes += o.wipes;
    if (o.clearSec > 0) { old.cleared += 1; old.sec += o.clearSec; }
  }
  const n = SEEDS.length;
  const clear = (x: typeof now): string => (x.cleared === 0 ? 'no clear' : `${(x.sec / x.cleared).toFixed(0)} (${x.cleared}/${n})`);
  const deaths = `${((waves.backDeaths + boss.backDeaths) / n).toFixed(1)} / ${((waves.frontDeaths + boss.frontDeaths) / n).toFixed(1)}`;
  console.log([S, classes(snap.party).padEnd(14), pct(waves), pct(boss), `${hit(waves)} / ${hit(boss)}`, deaths, (now.wipes / n).toFixed(1), clear(now), `| ${(old.wipes / n).toFixed(1)}`, clear(old), `| ${sources(waves)}`].join('\t'));
}

console.log('\n--- a world-boss attempt (with the party that finally beat it in the probe) ---');
console.log('stage\tparty\t\t→back\t→back before enrage\tworst hit behind\tdeaths back/front\twins\tfight s\t| old rule: wins\tfight s');
for (const S of BOSS_STAGES) {
  const snap = snaps.get(S);
  if (snap === undefined) { console.log(`${S}\t(not reached)`); continue; }
  let fight = zero();
  const now = { wins: 0, sec: 0 };
  const old = { wins: 0, sec: 0 };
  for (const seed of SEEDS) {
    const r = runWorldBoss(snap, seed);
    fight = add(fight, r.fight);
    if (r.win) now.wins += 1;
    now.sec += r.sec;
    oldRule(true);
    const o = runWorldBoss(snap, seed);
    oldRule(false);
    if (o.win) old.wins += 1;
    old.sec += o.sec;
  }
  const n = SEEDS.length;
  console.log([S, classes(snap.party).padEnd(14), pct(fight), calmPct(fight), hit(fight), `${(fight.backDeaths / n).toFixed(1)} / ${(fight.frontDeaths / n).toFixed(1)}`, `${now.wins}/${n}`, (now.sec / n).toFixed(0), `| ${old.wins}/${n}`, (old.sec / n).toFixed(0)].join('\t'));
}

// The fresh start: a naked solo Knight on the first stages (the new game — the fragile bootstrap). The rule must
// not make it harder: with nobody behind him the shots are his as before and the splash reaches no one.
console.log('\n--- the fresh start: a naked solo Knight ---');
console.log('stage\tparty\twipes\tclear s\t| old rule: wipes\tclear s');
for (const [S, level] of [[1, 1], [2, 2], [3, 4], [4, 6], [5, 8]] as const) {
  const snap: Snapshot = { stage: S, party: [freshHero('h0', 'knight', level)], bonuses: getBonuses({}, {}) };
  const now = { wipes: 0, sec: 0, cleared: 0 };
  const old = { wipes: 0, sec: 0, cleared: 0 };
  for (const seed of SEEDS) {
    const r = runStage(snap, seed);
    now.wipes += r.wipes;
    if (r.clearSec > 0) { now.cleared += 1; now.sec += r.clearSec; }
    oldRule(true);
    const o = runStage(snap, seed);
    oldRule(false);
    old.wipes += o.wipes;
    if (o.clearSec > 0) { old.cleared += 1; old.sec += o.clearSec; }
  }
  const n = SEEDS.length;
  const clear = (x: typeof now): string => (x.cleared === 0 ? 'no clear' : `${(x.sec / x.cleared).toFixed(0)} (${x.cleared}/${n})`);
  console.log([S, classes(snap.party), (now.wipes / n).toFixed(1), clear(now), `| ${(old.wipes / n).toFixed(1)}`, clear(old)].join('\t'));
}
