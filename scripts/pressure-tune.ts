/**
 * Quick check of the world-boss pressure (data/bossKit WORLD_BOSS_PRESSURE) against the checkpoint-2 goals, on a
 * sample of walls, without the full build search: for each wall, a few candidate parties with heals and the best
 * no-heal Priest party, all with the probe's real snapshot party (scripts/probe-snapshots.ts).
 *   - "heal" = the best of the candidate parties that carry a heal (win rate at the snapshot's gear, 16 seeds);
 *   - "dps"  = the no-heal Priest party at ~150 % of the zone (it should lose from Hell on);
 *   - "off"  = the best heal party but with the Knight carrying no defence.
 * Env: STUDY_SNAP, PRESSURE (JSON array of rows to override, index = difficulty), TUNE_WALLS, TUNE_SEEDS (16),
 * TUNE_JOBS (9). Workers: TUNE_SHARD=i/N write JSON lines to TUNE_OUT. Test/dev tooling only.
 */
import { readFileSync, appendFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { WORLD_BOSS_PRESSURE, type WorldBossPressure } from '@/data/bossKit';
import { abilityDef } from '@/data/abilities';
import { effectDef } from '@/data/effects';
import { gearPercent, withZoneChests } from '../test/sim/probe/zoneGear';
import { measureBoss } from '../test/sim/probe/combat';
import { allBuilds, buildLabel, fieldedAbilities, partyWithBuild, PROBE_DEFAULT_BUILD, type ClassBuild } from '../test/sim/probe/builds';
import type { SnapshotFile, WallSnapshot } from './probe-snapshots';
import type { HeroConfig } from '@/sim/loadout';

const SNAP = process.env.STUDY_SNAP ?? 'snapshots-1.json';
const OUT = process.env.TUNE_OUT ?? 'pressure-tune.jsonl';
const SEEDS = Number(process.env.TUNE_SEEDS ?? 16);
const JOBS = Number(process.env.TUNE_JOBS ?? 9);
const WALLS = (process.env.TUNE_WALLS ?? '50,100,110,140,170,200,210,240,270,300,310,340,370,400,410,440,470,500').split(',').map(Number);

if (process.env.PRESSURE !== undefined) {
  const rows = JSON.parse(process.env.PRESSURE) as (Partial<WorldBossPressure> | null)[];
  rows.forEach((r, d) => { if (r !== null && WORLD_BOSS_PRESSURE[d] !== undefined) Object.assign(WORLD_BOSS_PRESSURE[d] as WorldBossPressure, r); });
}

type Party = Record<string, ClassBuild>;
const heals = (k: string): boolean => (abilityDef(k).applies ?? []).some((a) => ['heal', 'hot', 'shield'].includes(effectDef(a.effectKey).kind.type));
const defends = (k: string): boolean => (abilityDef(k).applies ?? []).some((a) => {
  const kind = effectDef(a.effectKey).kind;
  if (kind.type === 'shield' || kind.type === 'invulnerable' || kind.type === 'weaken') return true; // weaken: the enemy deals less
  return kind.type === 'statMod' && (['damageReduction', 'armor', 'magicResist', 'block'].includes(kind.stat) || (kind.value < 0 && effectDef(a.effectKey).beneficial === false));
});

function winRate(party: readonly HeroConfig[], snap: WallSnapshot, p: Party, n = SEEDS): number {
  let w = 0;
  for (let i = 0; i < n; i++) if (measureBoss(partyWithBuild(party, p), snap.stage, 5_000_000 + snap.stage * 100 + i, snap.bonuses, 300, 5_000_000 + snap.stage * 100 + i).win) w++;
  return w / n;
}

/** Candidate builds of a class at its level: a sample of the distinct ones (abilities × branch, trunk order). */
function candidates(classKey: string, level: number, keep: (b: ClassBuild) => boolean): ClassBuild[] {
  const seen = new Set<string>();
  const out: ClassBuild[] = [];
  for (const b of allBuilds(classKey)) {
    if (b.order === 'branch' || (b.mods?.length ?? 0) > 0) continue;
    if (!keep(b)) continue;
    const key = fieldedAbilities(classKey, level, b).join('+') + b.branch;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(b);
  }
  return out;
}

/** A party at about `target` % of the zone or more: the snapshot party as it is when it already wears that much (the
 *  late difficulties), else the snapshot party with chests of this and the following worlds opened on top. */
function overGeared(snap: WallSnapshot, target = 150): { party: HeroConfig[]; pct: number } {
  const base = partyWithBuild(snap.party, PROBE_DEFAULT_BUILD);
  const pctOf = (p: HeroConfig[]): number => gearPercent(p, snap.stage, snap.bonuses, 960 + snap.stage);
  let best = { party: base, pct: pctOf(base) };
  if (best.pct >= target) return best;
  for (const k of [0, 10, 20, 30, 40, 50, 60, 80, 100]) {
    for (const chests of [60, 240]) {
      const p = withZoneChests(base, Math.min(500, Math.ceil((snap.stage + k) / 10) * 10), snap.bonuses, chests, 90_210 + 31 * k + chests);
      const pct = pctOf(p);
      if (pct > best.pct) best = { party: p, pct };
      if (pct >= target) return best;
    }
  }
  return best;
}

/** The Priest who carries no heal: Holy Nova alone, in the Zeal branch. */
export const PRIEST_DPS: ClassBuild = { abilities: ['priest_nova'], branch: 'zeal', exact: true };

function wall(snap: WallSnapshot): Record<string, unknown> {
  const lvl = (c: string): number => snap.party.find((h) => h.classKey === c)?.level ?? 1;
  const ranger: ClassBuild = { abilities: ['ranger_aimedshot', 'ranger_weakspot'], branch: 'marksman' };
  const knights = candidates('knight', lvl('knight'), () => true);
  const priestsHeal = candidates('priest', lvl('priest'), (b) => fieldedAbilities('priest', lvl('priest'), b).some(heals));
  // best heal party: best knight with the default priest, then best healing priest with that knight (16 seeds each, few candidates)
  const quick = 6;
  let bestK = knights[0] ?? PROBE_DEFAULT_BUILD.knight!;
  let bestKr = -1;
  const p0 = priestsHeal[0] ?? PROBE_DEFAULT_BUILD.priest!;
  for (const k of knights) { const r = winRate(snap.party, snap, { knight: k, ranger, priest: p0 }, quick); if (r > bestKr) { bestKr = r; bestK = k; } }
  let bestP = p0;
  let bestPr = -1;
  for (const p of priestsHeal) { const r = winRate(snap.party, snap, { knight: bestK, ranger, priest: p }, quick); if (r > bestPr) { bestPr = r; bestP = p; } }
  const healParty: Party = { knight: bestK, ranger, priest: bestP };
  const heal = winRate(snap.party, snap, healParty);
  const over = overGeared(snap);
  const dps = winRate(over.party, snap, { knight: bestK, ranger, priest: PRIEST_DPS });
  const dpsBuild = buildLabel(PRIEST_DPS);
  const healOver = winRate(over.party, snap, healParty);
  let off = 0;
  for (const k of knights.filter((b) => !fieldedAbilities('knight', lvl('knight'), b).some(defends))) off = Math.max(off, winRate(snap.party, snap, { knight: k, ranger, priest: bestP }));
  return { stage: snap.stage, heal, healOver, dps, off, overPct: over.pct, healBuild: `${buildLabel(bestK)} · ${buildLabel(bestP)}`, dpsBuild };
}

const shard = process.env.TUNE_SHARD;
if (shard !== undefined) {
  const [i, n] = shard.split('/').map(Number);
  const file = JSON.parse(readFileSync(SNAP, 'utf8')) as SnapshotFile;
  WALLS.forEach((S, idx) => {
    if (idx % (n ?? 1) !== (i ?? 0)) return;
    const snap = file.last[S];
    if (snap === undefined) return;
    appendFileSync(OUT, JSON.stringify(wall(snap)) + '\n');
  });
} else {
  writeFileSync(OUT, '');
  let left = JOBS;
  for (let i = 0; i < JOBS; i++) {
    spawn('npx', ['vite-node', 'scripts/pressure-tune.ts'], { env: { ...process.env, TUNE_SHARD: `${i}/${JOBS}` }, stdio: ['ignore', 'inherit', 'inherit'] })
      .on('exit', () => { left -= 1; if (left === 0) process.stdout.write('all workers done\n'); });
  }
}
