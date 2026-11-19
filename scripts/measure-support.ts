/**
 * How long the wave's SUPPORT lives once the fight reaches it, and what kills it. Run:
 * `npx vite-node scripts/measure-support.ts` (`SUPPORT_TO=<stage>` sets how far the probe runs, default 201;
 * `ORDER=shooter,support,beast,soldier,brute` tries another TARGET_PRIORITY on the same parties).
 *
 * Takes the parties the progression probe's average player has at a few stages (test/sim/probe) and plays each
 * stage's waves in the REAL simulation. For every support it records: the time from the first hit it takes to its
 * death (`lived`), the time from the wave's engagement (the first damage of the wave) to its death (`from engage`),
 * and the damage it took by source (a basic shot or an ability key).
 *
 * Test/dev tooling only (sim/ + data/).
 */
import { runProbe, DEFAULT_CONFIG } from '../test/sim/probe/loop';
import { buildParty } from '../test/sim/probe/combat';
import { Simulation, createWorld, TICK_MS, type TickContext } from '@/sim/Simulation';
import type { HeroConfig } from '@/sim/loadout';
import type { Bonuses } from '@/sim/bonuses';
import { TARGET_PRIORITY, type EnemyRole } from '@/data/enemies';

const TO = Math.max(22, Number(process.env.SUPPORT_TO ?? 201));
const SEEDS = [11, 12, 13];
const STAGES = [25, 35, 55, 75, 95, 125, 155, 195, 255, 295, 355, 395].filter((s) => s < TO);
const WAVES_SEC = 240; // per stage and seed: enough waves for a handful of supports

if (process.env.ORDER !== undefined) {
  const order = process.env.ORDER.split(',') as EnemyRole[];
  (TARGET_PRIORITY as EnemyRole[]).splice(0, TARGET_PRIORITY.length, ...order);
}
console.log(`TARGET_PRIORITY = ${TARGET_PRIORITY.join(', ')}`);

interface Snapshot { stage: number; party: HeroConfig[]; bonuses: Bonuses }
const wanted = new Set(STAGES);
const snaps = new Map<number, Snapshot>();
runProbe(1, {
  ...DEFAULT_CONFIG,
  observe: (target, party, bonuses) => {
    if (target >= TO) return false;
    if (wanted.has(target)) snaps.set(target, { stage: target, party: structuredClone(party) as HeroConfig[], bonuses });
    return true;
  },
});

interface Life { firstHit: number; engage: number; death: number }
interface Result { lives: Life[]; by: Record<string, number> }

function runWaves(snap: Snapshot, seed: number): Result {
  const world = createWorld(seed, buildParty(snap.party));
  world.globalStageIndex = snap.stage;
  world.maxClearedStage = snap.stage;
  const sim = new Simulation(world);
  const ctx: TickContext = { bonuses: snap.bonuses, ownedPetKeys: [], retryStage: true };
  const out: Result = { lives: [], by: {} };
  const open = new Map<string, Life>();
  let waveEngage = -1;
  const maxTicks = Math.floor((WAVES_SEC * 1000) / TICK_MS);
  for (let t = 0; t < maxTicks; t++) {
    const supports = new Set(world.enemies.filter((e) => e.enemyRole === 'support').map((e) => e.id));
    if (world.enemies.every((e) => !e.alive)) waveEngage = -1;
    for (const ev of sim.tick(ctx)) {
      if (ev.type === 'damage' && waveEngage < 0) waveEngage = t;
      if (!supports.has(ev.targetId)) continue;
      if (ev.type === 'damage') {
        if (!open.has(ev.targetId)) open.set(ev.targetId, { firstHit: t, engage: waveEngage < 0 ? t : waveEngage, death: -1 });
        const key = ev.abilityKey ?? (ev.splash === true ? 'splash' : 'shot');
        out.by[key] = (out.by[key] ?? 0) + (ev.amount ?? 0);
      } else if (ev.type === 'death') {
        const life = open.get(ev.targetId);
        if (life !== undefined) { life.death = t; out.lives.push(life); open.delete(ev.targetId); }
      }
    }
    world.pending.gold = 0;
    world.pending.xp = 0;
    world.pending.petDrops.length = 0;
    world.chests = [];
    if (world.phase === 'boss') world.globalStageIndex = snap.stage; // stay on the stage's waves
  }
  return out;
}

const sec = (ticks: number): number => (ticks * TICK_MS) / 1000;
function quant(xs: number[], q: number): number {
  if (xs.length === 0) return Number.NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))] ?? Number.NaN;
}
const f1 = (x: number): string => (Number.isNaN(x) ? '—' : x.toFixed(1));

console.log('\nstage\tsupports\tlived s (p25/med/p75)\tfrom engage s (p25/med/p75)\tdamage on it by source');
for (const S of STAGES) {
  const snap = snaps.get(S);
  if (snap === undefined) { console.log(`${S}\t(not reached)`); continue; }
  const lived: number[] = [];
  const engaged: number[] = [];
  const by: Record<string, number> = {};
  for (const seed of SEEDS) {
    const r = runWaves(snap, seed);
    for (const l of r.lives) { lived.push(sec(l.death - l.firstHit)); engaged.push(sec(l.death - l.engage)); }
    for (const [k, v] of Object.entries(r.by)) by[k] = (by[k] ?? 0) + v;
  }
  const total = Object.values(by).reduce((a, b) => a + b, 0);
  const src = Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${((100 * v) / Math.max(1, total)).toFixed(0)}%`).join(' · ');
  console.log([S, lived.length, `${f1(quant(lived, 0.25))} / ${f1(quant(lived, 0.5))} / ${f1(quant(lived, 0.75))}`, `${f1(quant(engaged, 0.25))} / ${f1(quant(engaged, 0.5))} / ${f1(quant(engaged, 0.75))}`, src].join('\t'));
}
