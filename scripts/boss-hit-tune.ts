/**
 * Round 6 — writes the boss-hit anchor (data/stageScaling ZONE_BOSS_HIT_TUNE, STAGE_BOSS_HIT_TUNE) from the probe's
 * average Knight. For each world 2 … 50 and each snapshot file (scripts/ceiling-pass.ts CP_SNAP), the Knight as he
 * stood at the wall (its last look before the kill; the stage bosses: on arrival at the wall), in his build there:
 * the hit that makes the boss's sustained damage on him — its basic hits aimed at him (not the share it sends behind)
 * plus its area blow's main hit, the blow's wind-up taking the place of its swings — take BOSS_THREAT_PCT % of his life a second after his armour and magic resist
 * against that boss's own mix (eased in over a difficulty's first worlds like the rest of the pressure; a stage boss at
 * STAGE_BOSS_THREAT_SHARE of it). The median over the files. Prints JSON {zone, stage} (50 entries each; world 1 is
 * the formula's and unused). Env: SNAPS (comma list). Dev tooling only.
 */
import { readFileSync } from 'node:fs';
import { partyWithBuild, PROBE_DEFAULT_BUILD, PROBE_GOOD_BUILD } from '../test/sim/probe/builds';
import { heroBaseStats, heroStaticMods, partyAuraMods } from '@/sim/loadout';
import { aggregate } from '@/sim/stats';
import { mixedMitigation } from '@/sim/damageMix';
import { bossMagicShare, pressureWeight, worldBossPressureAt } from '@/data/bossKit';
import { abilityDef } from '@/data/abilities';
import { difficultyIndexOf } from '@/data/difficulties';
import { BOSS_THREAT_PCT, STAGE_BOSS_THREAT_SHARE, ENEMY_BASE_ATTACK_SPEED, enemyDamage, ZONE_BOSS_DMG_MULT, BOSS_DMG_MULT } from '@/data/stageScaling';
import type { SnapshotFile, WallSnapshot } from './probe-snapshots';

const files = (process.env.SNAPS ?? '').split(',').filter((f) => f.length > 0).map((f) => JSON.parse(readFileSync(f, 'utf8')) as SnapshotFile);
const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] ?? 0) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2;
};

/** The target (% of life a second) of the world boss at S: its difficulty's, eased in from the previous one's. */
function target(S: number): number {
  const d = difficultyIndexOf(S);
  const own = BOSS_THREAT_PCT[d] ?? 1;
  if (d === 0) return own;
  const prev = BOSS_THREAT_PCT[d - 1] ?? own;
  return prev + (own - prev) * pressureWeight(S);
}

/** Front hits a second (in basic-hit units): the swings aimed at the front hero outside the blow's wind-up, plus the
 *  blow's main hit. */
function frontHitsPerSec(everyMs: number, castMs: number, coeff: number, backShot: number): number {
  const every = everyMs / 1000;
  return ENEMY_BASE_ATTACK_SPEED * (1 - backShot) * Math.max(0, 1 - castMs / 1000 / every) + coeff / every;
}

function knightOf(snap: WallSnapshot, S: number): { hp: number; armor: number; mr: number } | undefined {
  const party = partyWithBuild(snap.party, S > 200 ? PROBE_GOOD_BUILD : PROBE_DEFAULT_BUILD);
  const k = party.find((h) => h.classKey === 'knight');
  if (k === undefined) return undefined;
  const eff = aggregate(heroBaseStats(k.classKey, k.level), heroStaticMods(k, partyAuraMods(party)));
  return { hp: eff.health, armor: eff.armor, mr: eff.magicResist };
}

const shock = abilityDef('boss_shockwave');
const slam = abilityDef('boss_slam');
const zone: number[] = [];
const stage: number[] = [];
for (let w = 1; w <= 50; w++) {
  const S = w * 10;
  if (w === 1) {
    zone.push(Number((enemyDamage(S) * ZONE_BOSS_DMG_MULT).toPrecision(3)));
    stage.push(Number((enemyDamage(S - 5) * BOSS_DMG_MULT).toPrecision(3)));
    continue;
  }
  const p = worldBossPressureAt(S);
  const zh: number[] = [];
  const sh: number[] = [];
  for (const f of files) {
    const atWall = f.last[S] ?? f.arrive[S];
    const arrive = f.arrive[S] ?? f.last[S];
    const kz = atWall === undefined ? undefined : knightOf(atWall, S);
    const ks = arrive === undefined ? undefined : knightOf(arrive, S);
    if (kz !== undefined) {
      const through = 1 - mixedMitigation(kz.armor, kz.mr, bossMagicShare(S, 'world'), S);
      zh.push((target(S) / 100) * kz.hp / (through * frontHitsPerSec(p.blowEveryMs, shock.castTimeMs ?? 0, p.blowCoeff, p.backShotChance)));
    }
    if (ks !== undefined) {
      const Ss = S - 5;
      const through = 1 - mixedMitigation(ks.armor, ks.mr, bossMagicShare(Ss, 'stage'), Ss);
      sh.push(((STAGE_BOSS_THREAT_SHARE * target(S)) / 100) * ks.hp / (through * frontHitsPerSec(slam.cooldownMs, slam.castTimeMs ?? 0, slam.power?.coeff ?? 1, 0)));
    }
  }
  zone.push(Number(median(zh).toPrecision(3)));
  stage.push(Number(median(sh).toPrecision(3)));
}
process.stdout.write(JSON.stringify({ zone, stage }) + '\n');
