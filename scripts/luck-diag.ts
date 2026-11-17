/**
 * Round 7 — where the LUCK in a wall comes from. For sample walls of snapshot files (the probe's party as it stood at
 * its last look at each wall), a party variant (its own build, an offensive Knight, a defensive Knight, a Priest who
 * carries no heal, a party without magic resist) fights the wall over SEEDS combat seeds at each wall-life factor of
 * HP_MULTS. Per fight: won or not, when, who fell first and when, and the dice it rolled (the Knight's blocked hits,
 * the Priest's heal crits, the share of the boss's blows that went behind the tank, the party's damage crits). The
 * summary per (wall, variant, factor): win rate, coherence (the share of fights that agree with the majority), losses
 * by cause (a hero fell before the enrage = survival; the boss outlived the minute = race), and how those dice differ
 * between the wins and the losses.
 * Env: SNAPS (comma list), CHECK_WALLS, SEEDS (16), HP_MULTS (comma list, 1), VARIANTS (comma list), LD_OUT.
 * Run under `taskpolicy -b`. Dev tooling only.
 */
import { readFileSync, appendFileSync } from 'node:fs';
import { createWorld, Simulation, TICK_MS, type TickContext } from '@/sim/Simulation';
import { buildParty } from '../test/sim/probe/combat';
import { partyWithBuild, PROBE_DEFAULT_BUILD, PROBE_GOOD_BUILD, type ClassBuild, type PartyBuild } from '../test/sim/probe/builds';
import { WORLD_WALL_MULT, worldOf } from '@/data/stageScaling';
import type { HeroConfig } from '@/sim/loadout';
import type { ItemInstance } from '@/sim/items';
import type { Bonuses } from '@/sim/bonuses';
import type { SnapshotFile } from './probe-snapshots';

const files = (process.env.SNAPS ?? '').split(',').filter((f) => f.length > 0);
const WALLS = (process.env.CHECK_WALLS ?? '230,250,280,330,350,380,430,450,480').split(',').map(Number);
const SEEDS = Number(process.env.SEEDS ?? 16);
const HP_MULTS = (process.env.HP_MULTS ?? '1').split(',').map(Number);
const VARIANTS = (process.env.VARIANTS ?? 'own,knightOff,knightDef,noHeal,noMr').split(',');
const OUT = process.env.LD_OUT ?? 'luck-diag.jsonl';

export const KNIGHT_OFF: ClassBuild = { abilities: ['knight_battlecry', 'knight_bloodlust'], branch: 'scourge', exact: true };
export const KNIGHT_DEF: ClassBuild = { abilities: ['knight_guard', 'knight_bulwark'], branch: 'bastion', exact: true };
// The Priest without heals (round 11, user: «sí, cuenta como curar»): no heal-equivalent at all — not Holy Shield, not
// the Radiant Nova that makes her Nova heal; only Holy Nova fielded, her talents in Zeal's damage.
export const PRIEST_DPS: ClassBuild = { abilities: ['priest_nova'], branch: 'zeal', exact: true, avoid: ['priest_mod_radiant_nova'] };

function withoutMr(party: readonly HeroConfig[]): HeroConfig[] {
  const strip = (it: ItemInstance): ItemInstance => ({
    ...it,
    baseAffix: it.baseAffix.filter((a) => a.key !== 'magicResist'),
    stats: it.stats.filter((a) => a.key !== 'magicResist'),
  });
  return party.map((h) => ({
    ...h,
    equipment: Object.fromEntries(Object.entries(h.equipment).map(([slot, it]) => [slot, it === undefined ? it : strip(it)])),
  }));
}

export function variantParty(base: readonly HeroConfig[], S: number, v: string): HeroConfig[] {
  const own: PartyBuild = S > 200 ? PROBE_GOOD_BUILD : PROBE_DEFAULT_BUILD;
  switch (v) {
    case 'knightOff': return partyWithBuild(base, { ...own, knight: KNIGHT_OFF });
    case 'knightDef': return partyWithBuild(base, { ...own, knight: KNIGHT_DEF });
    case 'noHeal': return partyWithBuild(base, { ...own, priest: PRIEST_DPS });
    case 'noMr': return withoutMr(partyWithBuild(base, own));
    default: return partyWithBuild(base, own);
  }
}

export interface FightLog {
  win: boolean;
  fightSec: number;
  bossLeft: number; // share of its life the boss had left at the end
  firstDeath?: string; // class of the first hero to fall
  firstDeathSec?: number;
  firstDeathBy?: string; // what landed the last blow on the first hero to fall: a boss ability key, 'basic', or 'tick'
  knightHits: number;
  knightBlocked: number;
  heals: number;
  healCrits: number;
  bossHits: number; // boss hits that landed on a hero (basic + abilities)
  bossHitsBehind: number; // …on a hero who is not the Knight
  heroHits: number; // the party's damage events on the boss
  heroCrits: number;
  knightMinFrac: number;
}

/** One wall fight, read event by event (the probe's measureBoss, with its dice counted). */
export function fightWall(configs: readonly HeroConfig[], S: number, seed: number, bonuses: Bonuses, runSeed = seed, capSec = 200): FightLog {
  const world = createWorld(seed, buildParty(configs));
  world.seed = runSeed;
  world.maxClearedStage = S - 1;
  world.globalStageIndex = S - 1;
  const sim = new Simulation(world);
  const log: FightLog = { win: false, fightSec: 0, bossLeft: 1, knightHits: 0, knightBlocked: 0, heals: 0, healCrits: 0, bossHits: 0, bossHitsBehind: 0, heroHits: 0, heroCrits: 0, knightMinFrac: 1 };
  if (!sim.enterZoneBoss(worldOf(S))) return log;
  const ctx: TickContext = { bonuses, ownedPetKeys: [], retryStage: true };
  const startWipes = world.wipes;
  const heroIds = new Set(world.heroes.map((h) => h.id));
  const knight = world.heroes.find((h) => h.classKey === 'knight');
  let tracking = false;
  const lastBlow = new Map<string, string>();
  for (let t = 0; t < (capSec * 1000) / TICK_MS; t++) {
    const events = sim.tick(ctx);
    const boss = world.enemies.find((e) => e.isBoss === true);
    for (const ev of events) {
      if (ev.type === 'damage' && heroIds.has(ev.targetId) && (ev.amount ?? 0) > 0) lastBlow.set(ev.targetId, ev.tick === true ? 'tick' : (ev.abilityKey ?? 'basic'));
      if (ev.type === 'damage' && heroIds.has(ev.targetId) && boss !== undefined && ev.sourceId === boss.id && (ev.amount ?? 0) > 0) {
        log.bossHits++;
        if (ev.targetId === knight?.id) {
          log.knightHits++;
          if (ev.blocked === true) log.knightBlocked++;
        } else log.bossHitsBehind++;
      }
      if (ev.type === 'damage' && boss !== undefined && ev.targetId === boss.id && ev.sourceId !== undefined && heroIds.has(ev.sourceId) && ev.tick !== true) {
        log.heroHits++;
        if (ev.crit === true) log.heroCrits++;
      }
      if (ev.type === 'heal' && ev.sourceId !== undefined && heroIds.has(ev.sourceId) && ev.tick !== true && ev.cue === undefined) {
        log.heals++;
        if (ev.crit === true) log.healCrits++;
      }
      if (ev.type === 'death' && heroIds.has(ev.targetId) && log.firstDeath === undefined && tracking) {
        log.firstDeath = world.heroes.find((h) => h.id === ev.targetId)?.classKey;
        log.firstDeathSec = log.fightSec;
        log.firstDeathBy = lastBlow.get(ev.targetId);
      }
    }
    if (knight !== undefined && knight.alive && tracking) log.knightMinFrac = Math.min(log.knightMinFrac, knight.hp / knight.maxHp);
    if (world.wipes > startWipes) return log;
    if (world.phase === 'zoneBoss' && boss !== undefined && boss.alive) {
      tracking = true;
      log.fightSec = (boss.fightMs ?? 0) / 1000;
      log.bossLeft = boss.maxHp > 0 ? boss.hp / boss.maxHp : 1;
    } else if (tracking) {
      log.win = true;
      log.bossLeft = 0;
      return log;
    }
  }
  return log;
}

const mean = (xs: number[]): number => (xs.length === 0 ? NaN : xs.reduce((a, b) => a + b, 0) / xs.length);

if (files.length > 0) {
  const baseMults = [...WORLD_WALL_MULT];
  for (const f of files) {
    const file = JSON.parse(readFileSync(f, 'utf8')) as SnapshotFile;
    for (const S of WALLS) {
      const snap = (process.env.LD_SNAP === 'arrive' ? file.arrive : file.last)[S]; // LD_SNAP=arrive: the party as it reached the wall
      if (snap === undefined) continue;
      for (const m of HP_MULTS) {
        (WORLD_WALL_MULT as number[])[worldOf(S) - 1] = (baseMults[worldOf(S) - 1] ?? 1) * m;
        for (const v of VARIANTS) {
          const party = variantParty(snap.party, S, v);
          const logs: FightLog[] = [];
          // The boss is the one the snapshot's run meets (its affixes are drawn from the RUN seed, fixed for a whole run, as
          // in the game and the probe — round 10: before, every fight drew a different boss); only the combat seed varies.
          for (let i = 0; i < SEEDS; i++) logs.push(fightWall(party, S, 7_000_000 + S * 1000 + i, snap.bonuses, file.seed));
          const wins = logs.filter((l) => l.win);
          const losses = logs.filter((l) => !l.win);
          const winRate = wins.length / logs.length;
          const surv = losses.filter((l) => l.firstDeath !== undefined && (l.firstDeathSec ?? 99) < 60).length;
          const dice = (ls: FightLog[]) => ({
            block: mean(ls.map((l) => l.knightBlocked / Math.max(1, l.knightHits))),
            healCrit: mean(ls.map((l) => l.healCrits / Math.max(1, l.heals))),
            behind: mean(ls.map((l) => l.bossHitsBehind / Math.max(1, l.bossHits))),
            heroCrit: mean(ls.map((l) => l.heroCrits / Math.max(1, l.heroHits))),
            knightMin: mean(ls.map((l) => l.knightMinFrac)),
          });
          const line = {
            snap: file.seed, stage: S, mult: m, variant: v, win: winRate, coherence: Math.max(winRate, 1 - winRate),
            fight: mean(logs.map((l) => l.fightSec)), bossLeft: mean(losses.map((l) => l.bossLeft)),
            lossSurvival: surv, lossRace: losses.length - surv,
            firstDeaths: losses.map((l) => `${l.firstDeath ?? '-'}@${(l.firstDeathSec ?? 0).toFixed(0)}:${l.firstDeathBy ?? '-'}`).join(' '),
            diceWin: dice(wins), diceLoss: dice(losses),
          };
          appendFileSync(OUT, JSON.stringify(line) + '\n');
          process.stdout.write(`${file.seed} ${S} ×${m} ${v}: win ${winRate.toFixed(2)} (surv ${surv} race ${losses.length - surv}) fight ${line.fight.toFixed(0)}s\n`);
        }
        (WORLD_WALL_MULT as number[])[worldOf(S) - 1] = baseMults[worldOf(S) - 1] ?? 1;
      }
    }
  }
}
