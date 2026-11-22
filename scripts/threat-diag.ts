/**
 * Round 5 · C — why do neither bosses nor waves threaten a geared party? For points of a snapshot file
 * (scripts/ceiling-pass.ts CP_SNAP): each hero's defences against the stage's on-level defence (expectedDefense) and
 * where they come from (class + level, item affixes, gems, the rest = talents/auras/percent), then real fights with
 * every event counted: the world boss of the point (one fight) and the farm of the world's X-5 (one stage clear),
 * damage taken per hero per second by source (waves / stage boss / world boss) after mitigation, what heals and
 * regeneration give back, and the lowest life reached.
 * Env: SNAPS (comma list), POINTS (comma list of wall stages), TD_OUT. Run under `taskpolicy -b`. Dev tooling only.
 */
import { readFileSync, appendFileSync } from 'node:fs';
import { createWorld, Simulation, TICK_MS, type TickContext } from '@/sim/Simulation';
import { buildParty } from '../test/sim/probe/combat';
import { partyWithBuild, PROBE_DEFAULT_BUILD, PROBE_GOOD_BUILD } from '../test/sim/probe/builds';
import { heroBaseStats, heroStaticMods, partyAuraMods, type HeroConfig } from '@/sim/loadout';
import { aggregate } from '@/sim/stats';
import { gemGrants } from '@/sim/gems';
import { expectedDefense, mitigation, MAX_ARMOR_DR, worldOf, trashDmgTune, TRASH_DMG_FRACTION, BOSS_DMG_MULT, ZONE_BOSS_DMG_MULT, phi } from '@/data/stageScaling';
import { enemyDamage } from '@/sim/enemyScale';
import type { Bonuses } from '@/sim/bonuses';
import type { SnapshotFile } from './probe-snapshots';

const files = (process.env.SNAPS ?? '').split(',').filter((f) => f.length > 0);
const POINTS = (process.env.POINTS ?? '130,250,350,450,480').split(',').map(Number);
const OUT = process.env.TD_OUT ?? 'threat-diag.jsonl';

type Key = 'armor' | 'magicResist' | 'health';
function sources(cfg: HeroConfig, party: readonly HeroConfig[], key: Key): { total: number; base: number; affix: number; gem: number; rest: number } {
  const total = aggregate(heroBaseStats(cfg.classKey, cfg.level), heroStaticMods(cfg, partyAuraMods(party)))[key];
  const base = heroBaseStats(cfg.classKey, cfg.level)[key] ?? 0;
  let affix = 0;
  let gem = 0;
  for (const it of Object.values(cfg.equipment)) {
    if (it === undefined) continue;
    for (const a of [...it.baseAffix, ...it.stats]) if (a.key === key) affix += a.value;
    for (const s of it.sockets) if (s.gem !== null) for (const g of gemGrants(s.gem)) if (g.key === key) gem += g.value;
  }
  return { total, base, affix, gem, rest: total - base - affix - gem };
}

interface Tally { taken: Record<string, Record<string, number>>; healed: Record<string, number>; minHp: Record<string, number>; sec: number }

function run(party: HeroConfig[], S: number, bonuses: Bonuses, mode: 'wall' | 'farm', seed: number): Tally {
  const world = createWorld(seed, buildParty(party));
  world.seed = seed;
  const sim = new Simulation(world);
  const ctx: TickContext = { bonuses, ownedPetKeys: [], retryStage: true };
  if (mode === 'wall') {
    world.maxClearedStage = S - 1;
    world.globalStageIndex = S - 1;
    sim.enterZoneBoss(worldOf(S));
  } else {
    world.globalStageIndex = S;
    world.maxClearedStage = S;
  }
  const t: Tally = { taken: {}, healed: {}, minHp: {}, sec: 0 };
  const kinds = new Map<string, string>();
  let bossSpawnWipes = -1;
  const cap = mode === 'wall' ? 90_000 : 1_200_000;
  for (let ms = 0; ms < cap; ms += TICK_MS) {
    for (const e of world.enemies) kinds.set(e.id, e.isBoss === true ? (e.bossRank === 'world' ? 'wall' : 'stageBoss') : e.summon !== undefined ? 'summon' : 'wave');
    const events = sim.tick(ctx);
    t.sec = (ms + TICK_MS) / 1000;
    for (const ev of events) {
      const hero = world.heroes.find((h) => h.id === ev.targetId);
      if (hero === undefined || hero.classKey === undefined) continue;
      if (ev.type === 'damage') {
        const kind = kinds.get(ev.sourceId ?? '') ?? 'other';
        const row = (t.taken[hero.classKey] ??= {});
        row[kind] = (row[kind] ?? 0) + (ev.amount ?? 0);
      } else if (ev.type === 'heal') {
        t.healed[hero.classKey] = (t.healed[hero.classKey] ?? 0) + (ev.amount ?? 0);
      }
    }
    for (const h of world.heroes) if (h.classKey !== undefined) t.minHp[h.classKey] = Math.min(t.minHp[h.classKey] ?? 1, h.alive ? h.hp / h.maxHp : 0);
    if (mode === 'wall') {
      const boss = world.enemies.find((e) => e.isBoss === true);
      if (boss === undefined || !boss.alive || world.heroes.every((h) => !h.alive)) break;
    } else if (world.phase === 'boss') {
      if (bossSpawnWipes < 0) bossSpawnWipes = world.wipes;
    } else if (bossSpawnWipes >= 0) {
      if (world.wipes === bossSpawnWipes) break; // the stage boss fell: one clear
      bossSpawnWipes = -1;
    }
  }
  return t;
}

for (const f of files) {
  const file = JSON.parse(readFileSync(f, 'utf8')) as SnapshotFile;
  for (const S of POINTS) {
    for (const when of ['arrive', 'last'] as const) {
      const snap = file[when][S];
      if (snap === undefined) continue;
      const party = partyWithBuild(snap.party, S > 200 ? PROBE_GOOD_BUILD : PROBE_DEFAULT_BUILD);
      const heroes = party.map((h) => {
        const eff = aggregate(heroBaseStats(h.classKey, h.level), heroStaticMods(h, partyAuraMods(party)));
        return {
          cls: h.classKey, level: h.level, health: eff.health, regen: eff.hpRegen, block: eff.block, dr: eff.damageReduction,
          armor: eff.armor, mr: eff.magicResist, armorMit: mitigation(eff.armor, S), mrMit: mitigation(eff.magicResist, S),
          armorSrc: sources(h, party, 'armor'), mrSrc: sources(h, party, 'magicResist'), healthSrc: sources(h, party, 'health'),
        };
      });
      const wall = run(party, S, snap.bonuses, 'wall', 31_000 + S);
      const farm = when === 'arrive' ? run(party, S - 5, snap.bonuses, 'farm', 32_000 + S) : undefined;
      const line = {
        seed: file.seed, stage: S, when, expectedDefense: expectedDefense(S), capDr: MAX_ARMOR_DR, phi: phi(S),
        enemyDamage: enemyDamage(S), trashHit: enemyDamage(S - 5) * TRASH_DMG_FRACTION * trashDmgTune(S - 5), stageBossHit: enemyDamage(S - 5) * BOSS_DMG_MULT, wallHit: enemyDamage(S) * ZONE_BOSS_DMG_MULT,
        heroes, wall, farm,
      };
      appendFileSync(OUT, JSON.stringify(line) + '\n');
      process.stdout.write(`${S} ${when}: done\n`);
    }
  }
}
