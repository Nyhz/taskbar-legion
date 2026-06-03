/**
 * Survival probe (run: `npx vite-node scripts/sim-survival.ts`).
 *
 * Answers: with a realistically-geared party, how dangerous is a stage — and does
 * making enemies tankier / hitting harder BLOCK progress? Measures, per stage and
 * per gear level (UNDER / ON / OVER-geared), the per-wave clear time, the survival
 * margin (min party HP%), and whether the party clears or wipes — across the whole
 * curve up to late game. Pure sim/data tooling (no Pixi/React).
 */
import { Simulation, createWorld, TICK_MS, type TickContext } from '../src/sim/Simulation';
import { buildHeroCombatant, type HeroConfig } from '../src/sim/loadout';
import { aggregate } from '../src/sim/stats';
import { heroBaseStats, heroStaticMods } from '../src/sim/loadout';
import { getBonuses } from '../src/sim/bonuses';
import { generateItem } from '../src/sim/loot';
import type { ItemInstance } from '../src/sim/items';
import { type SlotKey } from '../src/data/itemSlots';
import { STATS } from '../src/data/stats';
import { talentNodes } from '../src/data/talents';
import { expectedLevel, mitigation, MAX_LEVEL } from '../src/data/stageScaling';

// Sampled at non-boss stages (X-3 of milestone worlds 1,5,10,20,30,50,80,120,200) so this
// measures TRASH-WAVE survival — the ×10 zone-boss stages have no waves (use sim-zoneboss).
const STAGES = [1, 43, 93, 193, 293, 493, 793, 1193, 1993];
const PARTY: string[] = ['knight', 'ranger', 'priest']; // frontline · dps · healer
const ctx: TickContext = { bonuses: getBonuses({}, []), ownedPetKeys: [] };

// ── realistic gear: keep the best drop per slot from a farmed pool at stage G ──
function itemScore(it: ItemInstance): number {
  const w = (k: string, v: number): number => {
    const pct = STATS[k as keyof typeof STATS]?.kind === 'percent';
    const kw = k === 'attackDamage' ? 1.5 : k === 'health' ? 0.8 : 1;
    return v * (pct ? 4 : 1) * kw;
  };
  let s = 0;
  for (const b of it.baseAffix) s += w(b.key, b.value);
  for (const st of it.stats) s += w(st.key, st.value);
  return s;
}

// Best drop per slot from farming stage G. NO equip gate now (PROGRESSION §0: gear is
// pure ilvl power, any hero equips any item) — so the binding axis is the GEAR's farm
// stage (its ilvl ≈ expectedLevel(G)), i.e. the gear-acquisition treadmill, not level.
function gearAtStage(G: number, seedBase: number): Partial<Record<SlotKey, ItemInstance>> {
  const best: Partial<Record<SlotKey, ItemInstance>> = {};
  for (let i = 0; i < 400; i++) {
    const it = generateItem({ rollSeed: seedBase * 1_000_003 + i, stageIndex: G, chestType: 'stageBoss', generatorVersion: 1 });
    const cur = best[it.slot];
    if (cur === undefined || itemScore(it) > itemScore(cur)) best[it.slot] = it;
  }
  return best;
}

// ── talents: spend `points` greedily in row order (mirrors the harness agent) ──
function specTalents(classKey: string, points: number): Record<string, number> {
  const talents: Record<string, number> = {};
  const nodes = talentNodes(classKey);
  const ordered = [...nodes].sort((a, b) => (a.kind === 'ability' ? -1 : 0) - (b.kind === 'ability' ? -1 : 0));
  let spent = 0;
  while (spent < points) {
    let did = false;
    for (const node of ordered) {
      if (node.rowIndex * 10 > spent) continue;
      const rank = talents[node.key] ?? 0;
      if (rank < node.maxRank) { talents[node.key] = rank + 1; spent++; did = true; break; }
    }
    if (!did) break;
  }
  return talents;
}

interface FightResult { wavePz: number; minHpPct: number; result: 'CLEAR' | 'WIPE' | 'TIMEOUT'; heroAd: number; tankDr: number; }

function runFight(S: number, gearStage: number, level: number, seed: number): FightResult {
  const party: HeroConfig[] = PARTY.map((classKey, i) => ({
    id: `h${i}`,
    classKey,
    level,
    equipment: gearAtStage(gearStage, seed + i * 17),
    talents: specTalents(classKey, Math.max(0, level - 1)),
    activeAbilities: [], // empty + autoDefault → the default 2-ability loadout (probe)
    autoDefaultAbilities: true,
  }));
  const heroes = party.map((c) => buildHeroCombatant(c, ctx.bonuses.combatMods));
  const world = createWorld(seed, heroes);
  world.globalStageIndex = S;
  const sim = new Simulation(world);

  // hero[0] (knight tank) aggregated stats incl. gear → AD (context) + on-level armor DR
  const w0 = party[0]!;
  const tankStats = aggregate(heroBaseStats(w0.classKey, w0.level), heroStaticMods(w0, ctx.bonuses.combatMods));
  const heroAd = tankStats.attackDamage;
  const tankDr = mitigation(tankStats.armor, S);

  let minHpPct = 1;
  const waveTimes: number[] = [];
  let lastWaves = 0;
  let waveStart = world.tick;
  let result: FightResult['result'] = 'TIMEOUT';
  const maxTicks = 6000; // 600s ceiling
  for (let t = 0; t < maxTicks; t++) {
    const before = world.globalStageIndex;
    sim.tick(ctx);
    // drain xp/gold so we don't accumulate (no leveling mid-probe — fixed loadout)
    world.pending.gold = 0; world.pending.xp = 0; world.pending.petDrops = [];
    const tot = heroes.reduce((a, h) => a + Math.max(0, h.hp), 0);
    const max = heroes.reduce((a, h) => a + h.maxHp, 0);
    if (max > 0) minHpPct = Math.min(minHpPct, tot / max);
    if (world.globalStageIndex < before) { result = 'WIPE'; break; }
    if (world.globalStageIndex > S) { result = 'CLEAR'; break; } // cleared all 20 waves + boss
    if (world.wavesThisStage > lastWaves) { waveTimes.push((world.tick - waveStart) * TICK_MS / 1000); waveStart = world.tick; }
    lastWaves = world.wavesThisStage;
  }
  const sorted = waveTimes.slice().sort((a, b) => a - b);
  const wavePz = sorted.length ? (sorted[Math.floor(0.5 * sorted.length)] ?? 0) : 0;
  return { wavePz, minHpPct, result, heroAd, tankDr };
}

function main(): void {
  console.log('=== Survival probe — party knight/ranger/priest, 2 skills, no tech ===\n');
  console.log('GEAR (its farm-stage ilvl) is the binding axis now — NO equip gate (PROGRESSION §0).');
  console.log('Hero level = min(expectedLevel(stage), MAX_LEVEL); gear varied by FARM stage:');
  console.log('  UNDER = farmed ~2 worlds back, ON = farmed at this stage, OVER = ~2 worlds ahead.');
  console.log('Per cell: waveP50s / minHP% / result.  "DR" = tank on-level armor damage-reduction.\n');
  const pad = (s: string, n: number): string => s.padEnd(n);
  console.log(pad('Stage', 7) + pad('Lv', 6) + pad('on-DR', 7) + pad('UNDER gear', 26) + pad('ON gear', 26) + 'OVER gear');
  for (const S of STAGES) {
    const L = Math.min(expectedLevel(S), MAX_LEVEL);
    const farms = [Math.max(1, S - 20), S, S + 20];
    let onDr = 0;
    const cells = farms.map((G, gi) => {
      const f = runFight(S, G, L, 7000 + S);
      if (gi === 1) onDr = f.tankDr;
      return pad(`${f.wavePz.toFixed(1)}s / ${Math.round(f.minHpPct * 100)}% / ${f.result}`, 26);
    });
    console.log(pad(`${S}`, 7) + pad(`L${L}`, 6) + pad(`${Math.round(onDr * 100)}%`, 7) + cells.join(''));
  }
  console.log('\n=== done ===');
}

main();
