/**
 * Who dies where the probe's party wipes — dev tooling only. The probe's run is advanced to STOP (default 35: world 4,
 * where round 20's anchored waves wiped the party most); its party then fights each of the next stages for FIGHT_SEC
 * under three variants of the trash tables (the current ones; the back line on its pre-anchor values; both on them),
 * and prints, per hero, the share of its life it takes a second while waves fight, its deaths, and the party's wipes.
 * Env: SEED (default 5), STOP (default 35), FIGHT_SEC (default 300). Run under `taskpolicy -b`.
 */
import { getBonuses } from '@/sim/bonuses';
import { createWorld, Simulation, TICK_MS, type TickContext } from '@/sim/Simulation';
import { TRASH_BACK_DMG_TUNE, TRASH_DMG_TUNE } from '@/data/stageScaling';
import { buildParty } from '../test/sim/probe/combat';
import { DEFAULT_CONFIG, newProbeRun, advanceProbe, runParty } from '../test/sim/probe/loop';

const SEED = Number(process.env.SEED ?? 5);
const STOP = Number(process.env.STOP ?? 35);
const FIGHT_SEC = Number(process.env.FIGHT_SEC ?? 300);
/** The single trash table before round 20 (commit 88e111c), worlds 1–50. */
const PRE_ANCHOR = [
  1, 1, 1, 1, 0.5, 0.45, 0.42, 0.36, 0.5, 1,
  0.562, 0.461, 0.346, 0.269, 0.245, 0.245, 0.269, 0.294, 0.245, 0.17,
  0.2, 0.291, 0.35, 0.39, 0.449, 0.47, 0.51, 0.56, 0.576, 0.51,
  0.5, 0.47, 0.607, 0.715, 0.75, 0.82, 0.952, 1, 0.908, 0.68,
  0.68, 0.748, 0.82, 0.952, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1,
];
const CURRENT_FRONT = [...TRASH_DMG_TUNE];
const CURRENT_BACK = [...TRASH_BACK_DMG_TUNE];
const VARIANTS: { name: string; front: number[]; back: number[] }[] = [
  { name: 'current', front: CURRENT_FRONT, back: CURRENT_BACK },
  { name: 'back=pre', front: CURRENT_FRONT, back: PRE_ANCHOR },
  { name: 'both=pre', front: PRE_ANCHOR, back: PRE_ANCHOR },
];

const bonuses = getBonuses({}, {});
const run = newProbeRun(SEED);
advanceProbe(run, { ...DEFAULT_CONFIG, stopAtStage: STOP });
const party = runParty(run);
console.log(`seed ${SEED} · party at frontier ${STOP}: ${party.map((h) => `${h.classKey} L${h.level}`).join(', ')}`);

for (let S = STOP + 1; S <= STOP + 4; S++) {
  for (const v of VARIANTS) {
    TRASH_DMG_TUNE.splice(0, TRASH_DMG_TUNE.length, ...v.front);
    TRASH_BACK_DMG_TUNE.splice(0, TRASH_BACK_DMG_TUNE.length, ...v.back);
    const world = createWorld(SEED * 1000 + S, buildParty(party));
    world.globalStageIndex = S;
    world.maxClearedStage = S;
    const sim = new Simulation(world);
    const ctx: TickContext = { bonuses, ownedPetKeys: [], retryStage: true };
    const taken = new Map<string, number>();
    const deaths = new Map<string, number>();
    let fightTicks = 0;
    for (let t = 0; t < (FIGHT_SEC * 1000) / TICK_MS; t++) {
      const events = sim.tick(ctx);
      if (world.enemies.some((e) => e.alive && e.engaged === true && e.isBoss !== true)) fightTicks += 1;
      for (const ev of events) {
        const hero = world.heroes.find((h) => h.id === ev.targetId);
        if (hero === undefined) continue;
        if (ev.type === 'damage' && ev.tick !== true) taken.set(hero.classKey, (taken.get(hero.classKey) ?? 0) + (ev.amount ?? 0) / hero.maxHp);
        if (ev.type === 'death') deaths.set(hero.classKey, (deaths.get(hero.classKey) ?? 0) + 1);
      }
    }
    const secs = Math.max(1, (fightTicks * TICK_MS) / 1000);
    const per = world.heroes.map((h) => `${h.classKey} ${(((taken.get(h.classKey) ?? 0) / secs) * 100).toFixed(2)}%/s ✝${deaths.get(h.classKey) ?? 0}`).join(' · ');
    console.log(`S${S}\t${v.name.padEnd(9)}\twipes ${world.wipes}\tstage done ${world.maxClearedStage > S ? 'yes' : 'no'}\t${per}`);
  }
}
