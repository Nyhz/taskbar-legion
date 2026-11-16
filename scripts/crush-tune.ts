/**
 * Round 7 — writes the Crushing Blow's anchors (data/stageScaling KNIGHT_EHP_TUNE, BACK_EHP_TUNE) from the probe's
 * party. For each world 21 … 50 (Inferno on; the rest 0) and each snapshot file, the party as it stood at the wall
 * (its last look before the kill), in the probe's build there: the Knight's effective life against that world boss
 * (his life over the share of a hit that gets through his armour and magic resist at the boss's mix and his standing
 * damage reduction), and the lower of the Ranger's and the Priest's life (the shock is sized against on-level magic
 * resist, data/stageScaling crushShock). The median over the files. Prints JSON {knight, back}
 * (50 entries each). Env: SNAPS (comma list). Dev tooling only.
 */
import { readFileSync } from 'node:fs';
import { partyWithBuild, PROBE_DEFAULT_BUILD, PROBE_GOOD_BUILD } from '../test/sim/probe/builds';
import { heroBaseStats, heroStaticMods, partyAuraMods } from '@/sim/loadout';
import { aggregate } from '@/sim/stats';
import { mixedMitigation } from '@/sim/damageMix';
import { bossMagicShare } from '@/data/bossKit';
import { MAX_DAMAGE_REDUCTION } from '@/data/stageScaling';
import type { SnapshotFile, WallSnapshot } from './probe-snapshots';

const files = (process.env.SNAPS ?? '').split(',').filter((f) => f.length > 0).map((f) => JSON.parse(readFileSync(f, 'utf8')) as SnapshotFile);
const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length === 0 ? 0 : s.length % 2 === 1 ? (s[m] ?? 0) : ((s[m - 1] ?? 0) + (s[m] ?? 0)) / 2;
};

function ehp(snap: WallSnapshot, S: number): { knight: number; back: number } | undefined {
  const party = partyWithBuild(snap.party, S > 200 ? PROBE_GOOD_BUILD : PROBE_DEFAULT_BUILD);
  const auras = partyAuraMods(party);
  let knight: number | undefined;
  let back = Number.POSITIVE_INFINITY;
  for (const h of party) {
    const eff = aggregate(heroBaseStats(h.classKey, h.level), heroStaticMods(h, auras));
    // Effective life: through his armour / magic resist at the boss's mix, and his standing damage reduction (gear,
    // talents — not a buff he raises for the blow).
    const dr = 1 - Math.min(MAX_DAMAGE_REDUCTION, Math.max(0, eff.damageReduction)) / 100;
    if (h.classKey === 'knight') knight = eff.health / ((1 - mixedMitigation(eff.armor, eff.magicResist, bossMagicShare(S, 'world'), S)) * dr);
    else back = Math.min(back, eff.health); // the back line's LIFE: the shock is sized against on-level magic resist
  }
  return knight === undefined || !Number.isFinite(back) ? undefined : { knight, back };
}

const knight: number[] = [];
const back: number[] = [];
for (let w = 1; w <= 50; w++) {
  const S = w * 10;
  if (w <= 20) {
    knight.push(0);
    back.push(0);
    continue;
  }
  const ks: number[] = [];
  const bs: number[] = [];
  for (const f of files) {
    const snap = f.last[S] ?? f.arrive[S];
    const e = snap === undefined ? undefined : ehp(snap, S);
    if (e === undefined) continue;
    ks.push(e.knight);
    bs.push(e.back);
  }
  knight.push(Number(median(ks).toPrecision(3)));
  back.push(Number(median(bs).toPrecision(3)));
}
process.stdout.write(JSON.stringify({ knight, back }) + '\n');
