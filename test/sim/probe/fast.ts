// THE FAST PROBE (2026-11-22; user: «aligerar las pruebas de Normal a Tormento, las rondas de chequeo de balance»).
// Farms come from the calibration; wall attempts are fought for real (fastBoss).
// Since the power curve (docs/redesign/POWER_CURVE.md) every enemy is sized against the TYPICAL party of its zone, so
// how a fight goes depends on how a party compares with that typical one — not on the zone itself. The fast probe
// measures that ONCE, in real fights, on a few zones and gear levels (the calibration), and then answers every farm
// and every wall attempt of a run from it: the party's standing against the typical one is pure arithmetic
// (sim/reference measureParty), its loot, keys, levels, tech and Cube stay the real probe's. World 1 and a party of
// fewer than three heroes (the bootstrap) still fight for real.

import { measureFarm, measureBoss, type BossResult, type FarmSample } from './combat';
import { measureParty, referenceParty, typicalHero, typicalItem } from '@/sim/reference';
import type { HeroConfig } from '@/sim/loadout';
import type { Bonuses } from '@/sim/bonuses';
import { getBonuses } from '@/sim/bonuses';
import type { ItemTier } from '@/data/tiers';
import { goldPerKill, waveSizeForStage, wavesPerStage, xpPerKill } from '@/data/stageScaling';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** The zones the calibration fights in: three or four a difficulty (one alone was fragile — a stage's own affixes
 *  or supports can make it an outlier, and the interpolation spread it over a whole difficulty). */
export const CAL_STAGES: readonly number[] = [15, 35, 55, 85, 125, 155, 185, 225, 255, 285, 325, 355, 385, 425, 455, 485];
/** The gear levels it fights at: the typical party's items this many stages above (or below) its own. */
export const CAL_DELTAS: readonly number[] = [-40, -20, -8, 0, 8, 20, 40, 60];
/** Wall attempts per calibration point (each its own combat seed). */
export const CAL_BOSS_SEEDS = 3;
const FARM_BUDGET_SEC = 1800;

interface CalPoint {
  x: number; // ln of the party's standing against the typical one (sim/reference)
  clearable: number; // 1 if it cleared the stage in the budget
  secPerKill: number;
  killsFrac: number; // kills of the sample ÷ the stage's predicted kills
  wipesPerKill: number;
  goldUnits: number; // gold ÷ (kills × goldPerKill)
  xpUnits: number;
  minHp: number;
  win: number; // share of wall attempts won
  killSec: number;
  bossHp: number; // boss life left on a loss, mean
  bossMinHp: number;
}
interface CalStage { S: number; points: CalPoint[] }

/** How a party stands against the typical one at `S`: ln of its damage ratio (¾) and its Knight's effective life
 *  ratio (¼). 0 is the typical party. */
export function standing(configs: readonly HeroConfig[], S: number): number {
  const p = measureParty(configs, S);
  const r = referenceParty(S);
  return 0.75 * Math.log(Math.max(1e-9, p.partyDps / r.partyDps)) + 0.25 * Math.log(Math.max(1e-9, p.knightEhp / r.knightEhp));
}

/** The enemies a stage holds, by its waves (supports and elites come on top; the calibration corrects for them). */
function predictedKills(S: number): number {
  return wavesPerStage(S) * waveSizeForStage(S);
}

/** The typical party of `S` with every item `delta` stages above its own level. */
function partyAtDelta(S: number, delta: number): HeroConfig[] {
  return ['knight', 'ranger', 'priest'].map((c) => {
    const h = typicalHero(c, S);
    for (const [slot, item] of Object.entries(h.equipment)) {
      if (item === undefined) continue;
      h.equipment[slot as keyof typeof h.equipment] = typicalItem(item.slot, c, item.tier as ItemTier, Math.max(1, item.ilvl + delta));
    }
    return { ...h, id: c };
  });
}

let CAL: CalStage[] | null = null;

/** A fingerprint of everything a calibration depends on: the game's code and data (src/sim, src/data) and the probe's
 *  own fighting code. The same fingerprint, the same calibration — it is cached on disk under it. */
function fingerprint(): string {
  const h = createHash('sha1');
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.(ts|json)$/.test(name)) h.update(path).update(readFileSync(path));
    }
  };
  for (const dir of ['src/sim', 'src/data', 'test/sim/probe']) if (existsSync(dir)) walk(dir);
  return h.digest('hex').slice(0, 16);
}
const CACHE_DIR = 'node_modules/.cache/fast-probe';

/** The calibration: from the disk cache when the code has not changed since it was fought, else fought now (a couple
 *  of minutes) and cached. `log` reports each zone. */
export function calibrate(log?: (line: string) => void): CalStage[] {
  if (CAL !== null) return CAL;
  const file = join(CACHE_DIR, `${fingerprint()}.json`);
  if (existsSync(file)) {
    CAL = JSON.parse(readFileSync(file, 'utf8')) as CalStage[];
    log?.(`calibration from cache (${file})`);
    return CAL;
  }
  const fought = fight(log);
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(file, JSON.stringify(fought));
  CAL = fought;
  return CAL;
}

function fight(log?: (line: string) => void): CalStage[] {
  const bonuses = getBonuses({}, {});
  const out: CalStage[] = [];
  for (const S of CAL_STAGES) {
    const wall = Math.ceil(S / 10) * 10;
    const points: CalPoint[] = [];
    for (const delta of CAL_DELTAS) {
      const party = partyAtDelta(S, delta);
      const f = measureFarm(party, S, 1, bonuses, FARM_BUDGET_SEC);
      const kills = Math.max(1, f.kills);
      let wins = 0;
      let killSec = 0;
      let bossHp = 0;
      let bossMinHp = 0;
      for (let k = 0; k < CAL_BOSS_SEEDS; k++) {
        const b = measureBoss(party, wall, 1 + k, bonuses);
        if (b.win) {
          wins += 1;
          killSec += b.killSec;
        }
        bossHp += b.bossHpFrac ?? (b.win ? 0 : 1);
        bossMinHp += b.minHpFrac;
      }
      points.push({
        x: standing(party, S),
        clearable: f.clearable ? 1 : 0,
        secPerKill: f.clearSec / kills,
        killsFrac: f.kills / predictedKills(S),
        wipesPerKill: f.wipes / kills,
        goldUnits: f.gold / (kills * goldPerKill(S)),
        xpUnits: f.xp / (kills * xpPerKill(S)),
        minHp: f.minHpFrac,
        win: wins / CAL_BOSS_SEEDS,
        killSec: wins > 0 ? killSec / wins : 0,
        bossHp: bossHp / CAL_BOSS_SEEDS,
        bossMinHp: bossMinHp / CAL_BOSS_SEEDS,
      });
    }
    points.sort((a, b) => a.x - b.x);
    out.push({ S, points });
    log?.(`calibrated S${S}: ${points.map((p) => `x${p.x.toFixed(2)} ${p.clearable ? 'clear' : 'stuck'} win${p.win.toFixed(2)}`).join(' · ')}`);
  }
  return out;
}

/** A field of the calibration at standing `x` in the zone `cal` (linear between its points, held at the ends). */
function at(cal: CalStage, x: number, f: (p: CalPoint) => number): number {
  const ps = cal.points;
  if (x <= ps[0]!.x) return f(ps[0]!);
  for (let i = 1; i < ps.length; i++) {
    const a = ps[i - 1]!;
    const b = ps[i]!;
    if (x <= b.x) return f(a) + ((f(b) - f(a)) * (x - a.x)) / Math.max(1e-9, b.x - a.x);
  }
  return f(ps[ps.length - 1]!);
}

/** A field at stage `S` and standing `x`: between the two calibrated zones around `S`. */
function lookup(S: number, x: number, f: (p: CalPoint) => number): number {
  const cal = calibrate();
  if (S <= cal[0]!.S) return at(cal[0]!, x, f);
  for (let i = 1; i < cal.length; i++) {
    const a = cal[i - 1]!;
    const b = cal[i]!;
    if (S <= b.S) {
      const t = (S - a.S) / (b.S - a.S);
      return at(a, x, f) * (1 - t) + at(b, x, f) * t;
    }
  }
  return at(cal[cal.length - 1]!, x, f);
}

const realFight = (configs: readonly HeroConfig[], S: number): boolean => configs.length < 3 || S <= 10;

/** A stage's farm sample from the calibration (or a real one for the bootstrap). */
export function fastFarm(configs: readonly HeroConfig[], S: number, seed: number, bonuses: Bonuses, budgetSec = FARM_BUDGET_SEC, runSeed = seed): FarmSample {
  if (realFight(configs, S)) return measureFarm(configs, S, seed, bonuses, budgetSec, runSeed);
  const x = standing(configs, S);
  const clearable = lookup(S, x, (p) => p.clearable) >= 0.5;
  const kills = predictedKills(S) * lookup(S, x, (p) => p.killsFrac);
  const clearSec = clearable ? lookup(S, x, (p) => p.secPerKill) * kills : budgetSec;
  return {
    clearable,
    clearSec,
    gold: lookup(S, x, (p) => p.goldUnits) * kills * goldPerKill(S) * bonuses.goldMult,
    xp: lookup(S, x, (p) => p.xpUnits) * kills * xpPerKill(S) * bonuses.xpMult,
    chests: { normal: 0, stageBoss: 0, zoneBoss: 0 },
    minHpFrac: lookup(S, x, (p) => p.minHp),
    wipes: Math.round(lookup(S, x, (p) => p.wipesPerKill) * kills),
    kills,
    bossKills: clearable ? 1 : 0,
  };
}

/** A wall attempt: FOUGHT for real (a wall fight is cheap — ~0.05 s — and the calibration's win chance, measured on the
 *  typical party's gear shape, misread a real party's: the first full-probe check, 2026-11-22, found Eternal and
 *  Torment twice as long in the fast model). The model answers only the farms, which are the expensive part. The
 *  calibration's wall columns stay as a report. */
export function fastBoss(configs: readonly HeroConfig[], S: number, seed: number, bonuses: Bonuses, capSec = 300, runSeed = seed): BossResult {
  const res = measureBoss(configs, S, seed, bonuses, capSec, runSeed);
  if (process.env.FAST_TRACE === '1' && !realFight(configs, S)) {
    console.warn(`fast wall S${S} x ${standing(configs, S).toFixed(3)} pWin ${lookup(S, standing(configs, S), (p) => p.win).toFixed(2)} ${res.win ? 'WIN' : 'lost'} lvl ${configs.map((c) => c.level).join('/')}`);
  }
  return res;
}
