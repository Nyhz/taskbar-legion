/**
 * Round 20 — writes the trash-threat anchor (data/stageScaling TRASH_DMG_TUNE, worlds 2–50) from the probe's party. The
 * probe's run is advanced world by world; in the middle of each world (stage 5) its party farms for FIGHT_SEC, and what
 * the Knight takes a second while enemies fight him (every hit that lands on him, after his armour, blocks and
 * defences; heals not counted) is measured as a share of his life. The world's entry is scaled by target / measured
 * (TRASH_THREAT_PCT of its difficulty); the back line's table (TRASH_BACK_DMG_TUNE) likewise, by what the heroes behind
 * him take a second as a share of their life (TRASH_BACK_THREAT_PCT). Prints both tables as JSON {front, back} (59
 * entries each, world 1's untouched) and the measures.
 * Env: SEED (default 1), FIGHT_SEC (default 150). Run under `taskpolicy -b`; run it again on the new table to check.
 * Dev tooling only.
 */
import { getBonuses } from '@/sim/bonuses';
import { createWorld, Simulation, TICK_MS, type TickContext } from '@/sim/Simulation';
import { difficultyIndexOf } from '@/data/difficulties';
import { TRASH_BACK_DMG_TUNE, TRASH_BACK_THREAT_PCT, TRASH_DMG_TUNE, TRASH_THREAT_PCT, tunePoint } from '@/data/stageScaling';
import { buildParty } from '../test/sim/probe/combat';
import { DEFAULT_CONFIG, newProbeRun, advanceProbe, runParty } from '../test/sim/probe/loop';

const SEED = Number(process.env.SEED ?? 1);
const FIGHT_SEC = Number(process.env.FIGHT_SEC ?? 150);
const bonuses = getBonuses({}, {});
const run = newProbeRun(SEED);
const table = [...TRASH_DMG_TUNE];
const back = [...TRASH_BACK_DMG_TUNE];
const rows: string[] = [];

for (let w = 2; w <= 50; w++) {
  const S = (w - 1) * 10 + 5;
  advanceProbe(run, { ...DEFAULT_CONFIG, stopAtStage: S - 1 });
  const party = runParty(run);
  const world = createWorld(SEED * 1000 + w, buildParty(party));
  world.globalStageIndex = S;
  world.maxClearedStage = S;
  const sim = new Simulation(world);
  const ctx: TickContext = { bonuses, ownedPetKeys: [], retryStage: true };
  const knight = world.heroes.find((h) => h.classKey === 'knight');
  if (knight === undefined) continue;
  let taken = 0;
  let fightTicks = 0;
  let backTaken = 0;
  let backLife = 0;
  for (const h of world.heroes) if (h !== knight) backLife += h.maxHp;
  for (let t = 0; t < (FIGHT_SEC * 1000) / TICK_MS; t++) {
    const events = sim.tick(ctx);
    if (world.enemies.some((e) => e.alive && e.engaged === true && e.isBoss !== true)) fightTicks += 1;
    for (const ev of events) {
      if (ev.type !== 'damage' || ev.tick === true) continue;
      const target = world.heroes.find((h) => h.id === ev.targetId);
      if (target === undefined) continue;
      if (target === knight) taken += ev.amount;
      else backTaken += ev.amount;
    }
  }
  const secs = Math.max(1, (fightTicks * TICK_MS) / 1000);
  const measured = (taken / secs / knight.maxHp) * 100;
  const backMeasured = (backTaken / secs / Math.max(1, backLife)) * 100;
  const d = difficultyIndexOf(S);
  const goal = TRASH_THREAT_PCT[d] ?? 3;
  const backGoal = TRASH_BACK_THREAT_PCT[d] ?? 0.5;
  const point = tunePoint(S);
  const old = table[point] ?? 1;
  const oldBack = back[point] ?? 1;
  table[point] = Number((measured > 0 ? old * (goal / measured) : old).toPrecision(3));
  back[point] = Number((backMeasured > 0 && backLife > 0 ? oldBack * (backGoal / backMeasured) : oldBack).toPrecision(3));
  rows.push(`W${w}\tS${S}\tlvl ${party[0]?.level}\tlife ${knight.maxHp.toFixed(0)}\tfight ${secs.toFixed(0)} s\tknight ${measured.toFixed(2)} %/s → ${goal}\tback ${backMeasured.toFixed(2)} %/s → ${backGoal}\ttune ${old} → ${table[point]}\tback ${oldBack} → ${back[point]}`);
  console.error(rows[rows.length - 1]);
}
console.log(JSON.stringify({ front: table, back }));
