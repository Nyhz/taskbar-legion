// Combat-measurement core for the standardized progression probe.
//
// Everything here drives the REAL deterministic Simulation (no analytic shortcuts) so the
// numbers are byte-faithful to the shipped game. Two measurements:
//   - measureFarm: time + income + GROSS chest drops for ONE full stage clear (its difficulty's waves —
//     data/stageScaling WAVES_BY_DIFFICULTY — + the stage boss), at the party's current power. Chests/pending are drained every tick so
//     storage caps never distort the drop RATE (the player-model applies capture separately).
//   - measureBoss: a single WORLD-boss attempt (the hard wall) → win? kill time, and the
//     worst party-HP fraction reached (the survival margin / "how scary was it").
//
// RUN SEED vs COMBAT SEED: in the game a stage's boss affixes and which waves bring a support (and its auras) come
// from the run's seed alone (sim/bossMechanics.bossKit, sim/enemyTraits.supportAuras read world.seed), so a player
// meets the SAME affixes on every attempt at a wall. Both measurements take the run seed apart from the combat
// seed: `runSeed` sets world.seed (what the run is dealt), `seed` the combat rng (how a fight rolls). Omitted, the
// run seed is the combat seed (the old behaviour).
//
// Stage isolation: we pin maxClearedStage so a clear LOOPS in place (never advances the
// frontier) and run with retryStage so a wipe never retreats — the measurement stays on S.

import { Simulation, createWorld, TICK_MS, type TickContext } from '@/sim/Simulation';
import { buildHeroCombatant, partyAuraMods, type HeroConfig } from '@/sim/loadout';
import { worldOf } from '@/data/stageScaling';
import type { Combatant, WorldState } from '@/sim/world';
import type { Bonuses } from '@/sim/bonuses';
import type { ChestType } from '@/data/chests';

export interface FarmSample {
  clearable: boolean; // did the party kill the stage boss within the time budget?
  clearSec: number; // wall-clock seconds for one full stage clear
  gold: number; // gold earned in one clear (already × goldMult)
  xp: number; // xp earned in one clear (already × xpMult)
  chests: Record<ChestType, number>; // GROSS drops per clear (cap-free)
  minHpFrac: number; // worst party HP fraction during the stage-boss fight (0 = someone died)
  wipes: number; // wipes suffered before the clear
  kills: number; // normal enemies (elites included) defeated in the sample
  bossKills: number; // stage bosses defeated in the sample (1 on a clean clear)
}

export interface BossResult {
  win: boolean;
  killSec: number; // time-to-kill on a win (0 on a loss), the walk to the boss included
  fightSec: number; // the boss's own fight clock when it died — or when the party did (its enrage starts at ZONE_ENRAGE_MS)
  minHpFrac: number; // worst party HP fraction reached (survival margin)
  bossHpFrac?: number; // the boss's life left (fraction) when the attempt ended — 0 on a win
  deathSec?: Record<string, number>; // class → the boss's fight clock when a hero of it first fell (round 4e)
}

const ZERO_CHESTS = (): Record<ChestType, number> => ({ normal: 0, stageBoss: 0, zoneBoss: 0 });

/** Build the live party combatants from their configs (auras are party-wide combat mods). */
export function buildParty(configs: readonly HeroConfig[]): Combatant[] {
  const auras = partyAuraMods(configs);
  return configs.map((c) => buildHeroCombatant(c, auras));
}

function minHeroHpFrac(w: WorldState): number {
  let m = 1;
  for (const h of w.heroes) {
    if (h.maxHp <= 0) continue;
    const f = h.alive ? Math.max(0, h.hp / h.maxHp) : 0;
    if (f < m) m = f;
  }
  return m;
}

/** Drain accrued gold/xp/chests off the world each tick and return the gold/xp drained,
 *  accumulating gross chest drops into `gross` so storage caps never block the count. */
function drain(w: WorldState, gross: Record<ChestType, number>): { gold: number; xp: number; kills: number; bossKills: number } {
  const { gold, xp, kills, bossKills } = w.pending;
  w.pending.gold = 0;
  w.pending.xp = 0;
  w.pending.kills = 0;
  w.pending.bossKills = 0;
  w.pending.chestsFound = 0;
  w.pending.petDrops.length = 0;
  w.pending.keys = {}; // the probe grants the first-clear key itself (loop.ts)
  for (const c of w.chests) gross[c.type] += c.count;
  w.chests = [];
  return { gold, xp, kills, bossKills };
}

/** One full stage clear (its difficulty's waves + stage boss) at the party's current power. `S` must be a
 *  NORMAL or stage-boss stage (S % 10 !== 0); world bosses go through measureBoss. */
export function measureFarm(
  configs: readonly HeroConfig[],
  S: number,
  seed: number,
  bonuses: Bonuses,
  budgetSec = 1800, // a stage is up to 20 waves of enemies that take two or three hits each: ten minutes is ordinary
  runSeed = seed,
): FarmSample {
  const world = createWorld(seed, buildParty(configs));
  world.seed = runSeed; // what the run is dealt (affixes, supports); the combat rng keeps `seed`
  world.globalStageIndex = S;
  world.maxClearedStage = S; // a clear LOOPS here (no frontier advance)
  const sim = new Simulation(world);
  const ctx: TickContext = { bonuses, ownedPetKeys: [], retryStage: true };

  const gross = ZERO_CHESTS();
  let gold = 0;
  let xp = 0;
  let kills = 0;
  let bossKills = 0;
  let minHpFrac = 1;
  let bossSpawnWipes = -1; // world.wipes captured when the stage boss appeared (>=0 ⇒ tracking)
  const startWipes = world.wipes;
  const maxTicks = Math.floor((budgetSec * 1000) / TICK_MS);

  let clearedTick = -1;
  for (let t = 0; t < maxTicks; t++) {
    sim.tick(ctx);
    const d = drain(world, gross);
    gold += d.gold;
    xp += d.xp;
    kills += d.kills;
    bossKills += d.bossKills;

    if (world.phase === 'boss') {
      const boss = world.enemies.find((e) => e.isBoss === true && e.alive);
      if (boss !== undefined) {
        if (bossSpawnWipes < 0) bossSpawnWipes = world.wipes;
        const f = minHeroHpFrac(world);
        if (f < minHpFrac) minHpFrac = f;
      }
    } else if (bossSpawnWipes >= 0) {
      // We left the boss phase. No new wipe since the boss spawned ⇒ it was KILLED (a clear).
      if (world.wipes === bossSpawnWipes) {
        clearedTick = t;
        break;
      }
      bossSpawnWipes = -1; // wiped mid-boss → reset and keep trying within the budget
    }
  }

  const clearable = clearedTick >= 0;
  return {
    clearable,
    clearSec: clearable ? ((clearedTick + 1) * TICK_MS) / 1000 : budgetSec,
    gold,
    xp,
    chests: gross,
    minHpFrac,
    wipes: world.wipes - startWipes,
    kills,
    bossKills,
  };
}

/** A single world-boss attempt (the hard wall). `S` must be a world-boss stage (S % 10 === 0).
 *  Win = the boss dies before the party wipes; loss = the party wipes (or the enrage cap hits)
 *  first. Returns the worst party-HP fraction reached as the survival margin. */
export function measureBoss(
  configs: readonly HeroConfig[],
  S: number,
  seed: number,
  bonuses: Bonuses,
  capSec = 300,
  runSeed = seed,
): BossResult {
  const world = createWorld(seed, buildParty(configs));
  world.seed = runSeed; // the run's affixes for this wall — the same on every attempt; the combat rng keeps `seed`
  const W = worldOf(S);
  world.maxClearedStage = S - 1; // this world's W-9 is beaten (the gate to the portal)
  world.globalStageIndex = S - 1;
  const sim = new Simulation(world);
  if (!sim.enterZoneBoss(W)) return { win: false, killSec: 0, fightSec: 0, minHpFrac: 0, bossHpFrac: 1 };

  const ctx: TickContext = { bonuses, ownedPetKeys: [], retryStage: true };
  const gross = ZERO_CHESTS();
  let minHpFrac = 1;
  let bossHpFrac = 1;
  const deathSec: Record<string, number> = {};
  let tracking = false;
  let fightSec = 0;
  const startWipes = world.wipes;
  const maxTicks = Math.floor((capSec * 1000) / TICK_MS);

  for (let t = 0; t < maxTicks; t++) {
    sim.tick(ctx);
    drain(world, gross);
    if (world.wipes > startWipes) return { win: false, killSec: 0, fightSec, minHpFrac, bossHpFrac, deathSec }; // wiped → loss

    if (world.phase === 'zoneBoss') {
      const boss = world.enemies.find((e) => e.isBoss === true && e.alive);
      if (boss !== undefined) {
        tracking = true;
        fightSec = (boss.fightMs ?? 0) / 1000 + TICK_MS / 1000;
        bossHpFrac = boss.maxHp > 0 ? boss.hp / boss.maxHp : 1;
        for (const h of world.heroes) if (!h.alive && h.classKey !== undefined && deathSec[h.classKey] === undefined) deathSec[h.classKey] = fightSec;
        const f = minHeroHpFrac(world);
        if (f < minHpFrac) minHpFrac = f;
      } else if (tracking) {
        return { win: true, killSec: ((t + 1) * TICK_MS) / 1000, fightSec, minHpFrac, bossHpFrac: 0, deathSec };
      }
    } else if (tracking) {
      return { win: true, killSec: ((t + 1) * TICK_MS) / 1000, fightSec, minHpFrac, bossHpFrac: 0, deathSec };
    }
  }
  return { win: false, killSec: 0, fightSec, minHpFrac, bossHpFrac, deathSec }; // enrage cap reached without a kill → loss
}
