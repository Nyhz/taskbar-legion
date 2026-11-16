/**
 * World-boss pressure measured as SURVIVAL, independent of the walls' life (which the final pacing pass will set):
 * how long a party stands against a wall that cannot die, up to its 60 s (the enrage kills everyone after it).
 *   - heal85:  the best party that carries heals, at ~85 % of the zone — should see the end of the minute;
 *   - dps150:  that party's knight and ranger with a Priest who carries no heal (Holy Nova alone), at ~150 % of the
 *              zone — should fall before 34 s, the time a 150 % party needs on a wall tuned to die at 60 s to 85 %;
 *   - off85:   the heal party with a Knight who carries no defence, at ~85 % — should suffer from Inferno on.
 * Also the damage each deals per second, and the kill time it would have on the wall as it is today.
 * Env: STUDY_SNAP, PRESSURE (JSON rows to override by difficulty), TUNE_WALLS, TUNE_SEEDS (8), TUNE_JOBS (9),
 * TUNE_OUT. Workers: TUNE_SHARD=i/N. Test/dev tooling only.
 */
import { readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { Simulation, createWorld, type TickContext } from '@/sim/Simulation';
import { WORLD_BOSS_PRESSURE, type WorldBossPressure } from '@/data/bossKit';
import { abilityDef } from '@/data/abilities';
import { effectDef } from '@/data/effects';
import { zoneBossHp, worldOf } from '@/data/stageScaling';
import { gearPercent, withZoneChests, zoneSet } from '../test/sim/probe/zoneGear';
import { buildParty } from '../test/sim/probe/combat';
import { allBuilds, buildLabel, fieldedAbilities, partyWithBuild, PROBE_DEFAULT_BUILD, type ClassBuild } from '../test/sim/probe/builds';
import type { SnapshotFile, WallSnapshot } from './probe-snapshots';
import type { HeroConfig } from '@/sim/loadout';
import type { Bonuses } from '@/sim/bonuses';

const SNAP = process.env.STUDY_SNAP ?? 'snapshots-1.json';
const OUT = process.env.TUNE_OUT ?? 'pressure-survival.jsonl';
const SEEDS = Number(process.env.TUNE_SEEDS ?? 8);
const JOBS = Number(process.env.TUNE_JOBS ?? 9);
const WALLS = (process.env.TUNE_WALLS ?? '50,100,110,140,170,200,210,240,270,300,310,340,370,400,410,440,470,500').split(',').map(Number);

if (process.env.PRESSURE !== undefined) {
  const rows = JSON.parse(process.env.PRESSURE) as (Partial<WorldBossPressure> | null)[];
  rows.forEach((r, d) => { if (r !== null && WORLD_BOSS_PRESSURE[d] !== undefined) Object.assign(WORLD_BOSS_PRESSURE[d] as WorldBossPressure, r); });
}

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
export const PRIEST_DPS: ClassBuild = { abilities: ['priest_nova', 'priest_holyshield'], branch: 'zeal', exact: true }; // no heal: Smite heals (and cleanses), so it is out
const heals = (k: string): boolean => (abilityDef(k).applies ?? []).some((a) => ['heal', 'hot', 'shield'].includes(effectDef(a.effectKey).kind.type));
const defends = (k: string): boolean => (abilityDef(k).applies ?? []).some((a) => {
  const kind = effectDef(a.effectKey).kind;
  if (kind.type === 'shield' || kind.type === 'invulnerable' || kind.type === 'weaken') return true; // weaken: the enemy deals less
  return kind.type === 'statMod' && (['damageReduction', 'armor', 'magicResist', 'block'].includes(kind.stat) || (kind.value < 0 && effectDef(a.effectKey).beneficial === false));
});

interface Stand { sec: number; dps: number; first: number; inf: number } // first: when the first hero fell (60 = nobody did); inf: share of hero-time under Power Infusion

/** How long `party` stands against the unkillable wall at S (cap 60 s), and the damage it deals per second meanwhile. */
function stand(party: readonly HeroConfig[], S: number, seed: number, bonuses: Bonuses): Stand {
  const world = createWorld(seed, buildParty(party));
  world.seed = seed;
  world.maxClearedStage = S - 1;
  world.globalStageIndex = S - 1;
  const sim = new Simulation(world);
  if (!sim.enterZoneBoss(worldOf(S))) return { sec: 0, dps: 0, first: 0, inf: 0 };
  const ctx: TickContext = { bonuses, ownedPetKeys: [], retryStage: true };
  const wipes = world.wipes;
  let dealt = 0;
  let before: number | undefined;
  let sec = 0;
  let first = 60;
  let infTicks = 0;
  let heroTicks = 0;
  for (let t = 0; t < 1200; t++) {
    sim.tick(ctx);
    world.chests = [];
    const boss = world.enemies.find((e) => e.isBoss === true);
    if (world.wipes > wipes) { first = Math.min(first, sec); break; }
    if (first >= 60 && boss !== undefined && world.heroes.some((h) => !h.alive)) first = (boss.fightMs ?? 0) / 1000;
    for (const h of world.heroes) {
      if (!h.alive) continue;
      heroTicks += 1;
      if (h.effects.some((e) => e.defKey === 'buff_infusion_as')) infTicks += 1;
    }
    if (boss === undefined) continue;
    if (before !== undefined && boss.hp < before) dealt += before - boss.hp;
    if (boss.hp < boss.maxHp / 2) {
      boss.hp += boss.maxHp / 2;
      if (boss.hpSeen !== undefined) boss.hpSeen += boss.maxHp / 2;
    }
    before = boss.hp;
    sec = (boss.fightMs ?? 0) / 1000;
    if (sec >= 60) break;
  }
  return { sec: Math.min(60, sec), dps: sec > 0 ? dealt / sec : 0, first: Math.min(60, first), inf: heroTicks > 0 ? infTicks / heroTicks : 0 };
}

function stands(party: readonly HeroConfig[], snap: WallSnapshot, p: Party, n = SEEDS): Stand[] {
  const out: Stand[] = [];
  for (let i = 0; i < n; i++) out.push(stand(partyWithBuild(party, p), snap.stage, 8_000_000 + snap.stage * 100 + i, snap.bonuses));
  return out;
}
const meanSec = (s: Stand[]): number => s.reduce((a, x) => a + x.sec, 0) / Math.max(1, s.length);
const full = (s: Stand[]): number => s.filter((x) => x.sec >= 60).length / Math.max(1, s.length);
const meanDps = (s: Stand[]): number => s.reduce((a, x) => a + x.dps, 0) / Math.max(1, s.length);
const meanFirst = (s: Stand[]): number => s.reduce((a, x) => a + x.first, 0) / Math.max(1, s.length);
const meanInf = (s: Stand[]): number => s.reduce((a, x) => a + x.inf, 0) / Math.max(1, s.length);
const intact = (s: Stand[]): number => s.filter((x) => x.first >= 60).length / Math.max(1, s.length);

/** A party of the snapshot heroes at about `target` % of the zone: a fresh zone set of a few chests, the snapshot
 *  party as it is, or the snapshot party with more chests of this and later worlds — whichever lands closest. */
function geared(snap: WallSnapshot, target: number): { party: HeroConfig[]; pct: number } {
  const base = partyWithBuild(snap.party, PROBE_DEFAULT_BUILD);
  const S = snap.stage;
  const pctOf = (p: HeroConfig[]): number => gearPercent(p, S, snap.bonuses, 960 + S);
  const tries: (() => HeroConfig[])[] = [
    () => base,
    ...[10, 20, 40, 80, 160, 240].map((n) => () => zoneSet(base, S, snap.bonuses, n)),
    ...[0, 10, 20, 30, 40, 60, 80, 100].flatMap((k) => [60, 240].map((c) => () => withZoneChests(base, Math.min(500, Math.ceil((S + k) / 10) * 10), snap.bonuses, c, 90_210 + 31 * k + c))),
  ];
  let best = { party: base, pct: -1 };
  for (const make of tries) {
    const p = make();
    const pct = pctOf(p);
    if (best.pct < 0 || Math.abs(pct - target) < Math.abs(best.pct - target)) best = { party: p, pct };
    if (Math.abs(pct - target) <= target * 0.06) break;
  }
  return best;
}

function candidates(classKey: string, level: number, keep: (abilities: string[]) => boolean): ClassBuild[] {
  const seen = new Set<string>();
  const out: ClassBuild[] = [];
  for (const b of allBuilds(classKey)) {
    if (b.order === 'branch' || (b.mods?.length ?? 0) > 0) continue;
    const ab = fieldedAbilities(classKey, level, b);
    if (!keep(ab)) continue;
    const key = ab.join('+') + b.branch;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(b);
  }
  return out;
}

function wall(snap: WallSnapshot): Record<string, unknown> {
  const lvl = (c: string): number => snap.party.find((h) => h.classKey === c)?.level ?? 1;
  const ranger: ClassBuild = { abilities: ['ranger_aimedshot', 'ranger_weakspot'], branch: 'marksman' };
  const g85 = geared(snap, 85);
  const g150 = geared(snap, 150);
  const score = (s: Stand[]): number => (meanFirst(s) + meanSec(s)) * 1e6 + meanDps(s) / 1e6; // stand whole first, then damage
  const pick = (builds: ClassBuild[], make: (b: ClassBuild) => Party, party: HeroConfig[]): { b: ClassBuild; s: Stand[] } => {
    let best: { b: ClassBuild; s: Stand[] } | undefined;
    for (const b of builds) {
      const s = stands(party, snap, make(b), 4);
      if (best === undefined || score(s) > score(best.s)) best = { b, s };
    }
    if (best === undefined) throw new Error('no candidate');
    return best;
  };
  const priestHeal = candidates('priest', lvl('priest'), (ab) => ab.some(heals));
  const knights = candidates('knight', lvl('knight'), () => true);
  const p0 = PROBE_DEFAULT_BUILD.priest ?? priestHeal[0];
  if (p0 === undefined) throw new Error('no priest');
  const k = pick(knights, (b) => ({ knight: b, ranger, priest: p0 }), g85.party).b;
  const p = pick(priestHeal, (b) => ({ knight: k, ranger, priest: b }), g85.party).b;
  const healParty: Party = { knight: k, ranger, priest: p };
  const heal85 = stands(g85.party, snap, healParty);
  const dps150 = stands(g150.party, snap, { knight: k, ranger, priest: PRIEST_DPS });
  const heal150 = stands(g150.party, snap, healParty);
  const offK = knights.filter((b) => !fieldedAbilities('knight', lvl('knight'), b).some(defends));
  // Below level 20 every Knight ability is a defensive one: no offensive Knight to field then.
  const off = offK.length > 0 ? pick(offK, (b) => ({ knight: b, ranger, priest: p }), g85.party) : { b: k, s: [] };
  const off85 = offK.length > 0 ? stands(g85.party, snap, { knight: off.b, ranger, priest: p }) : heal85;
  const life = zoneBossHp(snap.stage);
  return {
    stage: snap.stage, g85: g85.pct, g150: g150.pct,
    heal85: { sec: meanSec(heal85), full: full(heal85), first: meanFirst(heal85), intact: intact(heal85), inf: meanInf(heal85), kill: life / Math.max(1, meanDps(heal85)) },
    heal150: { sec: meanSec(heal150), full: full(heal150), first: meanFirst(heal150), intact: intact(heal150), kill: life / Math.max(1, meanDps(heal150)) },
    dps150: { sec: meanSec(dps150), full: full(dps150), first: meanFirst(dps150), intact: intact(dps150), under34: dps150.filter((x) => x.first < 34).length / dps150.length, kill: life / Math.max(1, meanDps(dps150)) },
    off85: { sec: meanSec(off85), full: full(off85), first: meanFirst(off85), intact: intact(off85), kill: life / Math.max(1, meanDps(off85)) },
    builds: { heal: `${buildLabel(k)} · ${buildLabel(p)}`, off: buildLabel(off.b) },
  };
}

const shard = process.env.TUNE_SHARD;
if (shard !== undefined) {
  const [i, n] = shard.split('/').map(Number);
  const file = JSON.parse(readFileSync(SNAP, 'utf8')) as SnapshotFile;
  WALLS.forEach((S, idx) => {
    if (idx % (n ?? 1) !== (i ?? 0)) return;
    const snap = file.last[S];
    if (snap !== undefined) appendFileSync(OUT, JSON.stringify(wall(snap)) + '\n');
  });
} else {
  writeFileSync(OUT, '');
  let left = JOBS;
  for (let i = 0; i < JOBS; i++) {
    spawn('npx', ['vite-node', 'scripts/pressure-survival.ts'], { env: { ...process.env, TUNE_SHARD: `${i}/${JOBS}` }, stdio: ['ignore', 'inherit', 'inherit'] })
      .on('exit', () => { left -= 1; if (left === 0) process.stdout.write('all workers done\n'); });
  }
}
