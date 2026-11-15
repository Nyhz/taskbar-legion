/**
 * GEAR % OF THE ZONE (run: `npx vite-node scripts/measure-gear-percent.ts`) — what the average player wears at each
 * wall, in the unit the walls are written in (test/sim/probe/zoneGear.ts): the damage the party deals to the world
 * boss in its 60 s ÷ the damage the same heroes deal in the zone set.
 *   1. Per world: the party's gear % when the wall fell, the boss's fight clock at the kill (past 60 = enrage held)
 *      and the wall's life as a share of the zone set's damage (the gear % that kills it at exactly 60 s).
 *   2. Per difficulty (its 5th and 9th worlds): the same wall against the same player as it was 1…8 worlds earlier
 *      and in the zone set — gear % → does it kill, at what second, how much enrage it held (or when it died).
 * Env: GEAR_SEEDS (default 2), GEAR_WORLDS (default 50).
 */
import { DEFAULT_CONFIG, newProbeRun, advanceProbe, runParty, runBonuses, probeResult } from '../test/sim/probe/loop';
import { measureBoss } from '../test/sim/probe/combat';
import { zoneSet, wallDamage, zoneSetDamage, ZONE_SET_CHESTS, ZONE_SET_DRAWS } from '../test/sim/probe/zoneGear';
import { zoneBossHp, ZONE_ENRAGE_MS } from '../src/data/stageScaling';
import type { HeroConfig } from '../src/sim/loadout';
import type { Bonuses } from '../src/sim/bonuses';

const SEEDS = Array.from({ length: Math.max(1, Number(process.env.GEAR_SEEDS ?? 2)) }, (_, i) => i + 1);
const WORLDS = Math.min(50, Number(process.env.GEAR_WORLDS ?? 50));
const WINDOW = ZONE_ENRAGE_MS / 1000;
const SEED = DEFAULT_CONFIG.measureSeed;
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const NAMES = ['Normal', 'Hell', 'Inferno', 'Eternal', 'Torment'];

const runs = SEEDS.map((s) => newProbeRun(s, DEFAULT_CONFIG));
const snaps: { party: HeroConfig[]; bonuses: Bonuses }[][] = SEEDS.map(() => []); // [seed][world-1] = the party that killed that wall
const LADDER = [1, 2, 3, 4, 6, 8];
interface Row { pct: number[]; wins: number; n: number; fight: number[]; died: number[] }
const row = (): Row => ({ pct: [], wins: 0, n: 0, fight: [], died: [] });

console.log(`gear % of the zone · seeds ${SEEDS.length} (means) · zone set = the best of ${ZONE_SET_CHESTS} stage-boss chests of the world, mean of ${ZONE_SET_DRAWS} draws · window ${WINDOW} s`);
console.log(['world', 'level', 'hours on it', 'fight s at the kill', 'gear % at the kill', 'wall = % of the zone set'].join('\t'));
const ladders: string[] = [];
for (let w = 1; w <= WORLDS; w++) {
  const boss = w * 10;
  const pct: number[] = [];
  const share: number[] = [];
  const fight: number[] = [];
  const hours: number[] = [];
  const wantLadder = w % 10 === 5 || w % 10 === 9;
  const rows = new Map<string, Row>();
  const add = (name: string, party: readonly HeroConfig[], bonuses: Bonuses, ref: number): void => {
    const r = rows.get(name) ?? row();
    rows.set(name, r);
    r.pct.push((100 * wallDamage(party, boss, bonuses, SEED)) / ref);
    const res = measureBoss(party, boss, SEED, bonuses);
    r.n += 1;
    if (res.win) {
      r.wins += 1;
      r.fight.push(res.fightSec);
    } else r.died.push(res.fightSec);
  };
  runs.forEach((r, i) => {
    advanceProbe(r, { ...DEFAULT_CONFIG, stopAtStage: boss });
    if (r.state.frontier < boss) return;
    const party = structuredClone(runParty(r)) as HeroConfig[];
    const bonuses = runBonuses(r);
    snaps[i]?.push({ party, bonuses });
    const ref = zoneSetDamage(party, boss, bonuses, SEED);
    pct.push((100 * wallDamage(party, boss, bonuses, SEED)) / ref);
    share.push((100 * zoneBossHp(boss)) / ref);
    const m = probeResult(r, DEFAULT_CONFIG).milestones.find((x) => x.stage === boss);
    fight.push(m?.bossFightSec ?? 0);
    hours.push(m?.hoursOnWorld ?? 0);
    if (!wantLadder) return;
    add('in the zone set', zoneSet(party, boss, bonuses), bonuses, ref);
    add('as it killed it', party, bonuses, ref);
    for (const k of LADDER) {
      const old = snaps[i]?.[w - 1 - k];
      if (old !== undefined) add(`as it was ${k} world${k > 1 ? 's' : ''} earlier`, old.party, old.bonuses, ref);
    }
  });
  if (pct.length === 0) break;
  console.log([w, runs[0]?.state.party[0]?.level ?? 0, mean(hours).toFixed(1), mean(fight).toFixed(0), mean(pct).toFixed(0), mean(share).toFixed(0)].join('\t'));
  if (wantLadder) {
    ladders.push(`\n${NAMES[Math.floor((w - 1) / 10)] ?? '?'} ${((w - 1) % 10) + 1}-10 · the wall is ${mean(share).toFixed(0)} % of the zone set`);
    ladders.push(['the party', 'gear %', 'kills', 'fight s when it kills', 'enrage held (s)', 'dies at s (when it does not)'].join('\t'));
    for (const [name, r] of rows) {
      const f = r.fight.length > 0 ? mean(r.fight) : NaN;
      ladders.push([name, mean(r.pct).toFixed(0), `${r.wins}/${r.n}`, Number.isNaN(f) ? '—' : f.toFixed(0), Number.isNaN(f) ? '—' : Math.max(0, f - WINDOW).toFixed(0), r.died.length > 0 ? mean(r.died).toFixed(0) : '—'].join('\t'));
    }
  }
}
console.log(ladders.join('\n'));
