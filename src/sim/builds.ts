// BUILDS for the progression probe: which two abilities a hero fields, which branch it specialises in, which
// "choose one" modifiers it prefers, and in what order it spends — and the talent map that build gives at any
// number of points. Every point goes through sim/talentRules.canSpend, so a build is always one the tree accepts.
//
// The probe's DEFAULT build (economy.defaultTalents) is PROBE_DEFAULT_BUILD: the class's first two abilities, the
// trunk first, then Bastion / Marksman / Devotion. The build study (scripts/build-study.ts) samples the rest of the
// space (allBuilds) and searches it for the best build against each wall.
//
// An ability the build names but the hero cannot learn yet (its tier opens at 10 × row points) is stood in for by
// the first default ability it does not already field — the player respecs once it opens (the probe recomputes
// the talents from scratch at every level, which is a free respec).

import { talentNodes, TRUNK, type TalentNode } from '@/data/talents';
import { rowUnlockThreshold } from '@/data/talents';
import { canSpend, MAX_ACTIVE_ABILITIES } from './talentRules';
import { makeRng } from './rng';

export interface ClassBuild {
  /** The abilities it fields (talent node keys = ability keys), at most MAX_ACTIVE_ABILITIES. */
  abilities: readonly string[];
  /** The branch (lane) it specialises in. */
  branch: string;
  /** Modifier keys it prefers where the tree makes it choose one (otherwise the first in tree order). */
  mods?: readonly string[];
  /** 'trunk' fills the trunk before the branch (the average player); 'branch' rushes the branch as soon as tiers allow. */
  order?: 'trunk' | 'branch';
  /** Field exactly `abilities` (fewer than two if it names fewer): no default stands in for a missing one. */
  exact?: boolean;
  /** Talent nodes it never raises (round 11: the rules' Priest without heals takes no heal-equivalent talent). */
  avoid?: readonly string[];
}

/** A build per class (the party is one hero of each class). */
export type PartyBuild = Readonly<Record<string, ClassBuild>>;

const ABILITY_RANK_CAP = 5;

export const PROBE_DEFAULT_BUILD: PartyBuild = {
  knight: { abilities: ['knight_guard', 'knight_debilitate'], branch: 'bastion' },
  ranger: { abilities: ['ranger_fast_fire', 'ranger_aimedshot'], branch: 'marksman' },
  priest: { abilities: ['priest_mend', 'priest_healing_light'], branch: 'devotion' },
};

/** THE GOOD BUILD the average player switches to from Inferno (user decision, 2026-11-16: "la construcción por
 *  defecto en Normal e Infierno y la buena desde Averno"): the build study's most frequent best build of Hell and
 *  later (scripts/build-study.ts, round 3 checkpoint 2) — one build for every wall, not the best of each. */
export const PROBE_GOOD_BUILD: PartyBuild = {
  // Round 7 (2026-11-16): from Inferno the world bosses' Crushing Blow asks the Knight to carry his defences — Stone
  // Skin kept for it and Debilitating Cleave on the boss as it winds up (was Debilitating Cleave + Battle Cry).
  knight: { abilities: ['knight_guard', 'knight_debilitate'], branch: 'bastion' },
  ranger: { abilities: ['ranger_aimedshot', 'ranger_weakspot'], branch: 'marksman' },
  priest: { abilities: ['priest_mend', 'priest_healing_light'], branch: 'devotion' },
};

/** The branches (lanes other than the trunk) of a class, in tree order. */
export function branchesOf(classKey: string): string[] {
  const out: string[] = [];
  for (const n of talentNodes(classKey)) if (n.lane !== TRUNK && !out.includes(n.lane)) out.push(n.lane);
  return out;
}

/** Ability node keys of a class, in tree order. */
export function abilitiesOf(classKey: string): string[] {
  return talentNodes(classKey).filter((n) => n.kind === 'ability').map((n) => n.key);
}

/** The abilities this build will actually field at `points`: its own where their tier is open, the default
 *  pair standing in for the rest. */
export function fieldedAbilities(classKey: string, points: number, build: ClassBuild): string[] {
  const nodes = talentNodes(classKey);
  const rowOf = (key: string): number => nodes.find((n) => n.key === key)?.rowIndex ?? 99;
  // An ability of row r can be bought once 10·r points are spent: reachable with `points` if 10·r < points.
  const open = (key: string): boolean => rowUnlockThreshold(rowOf(key)) < points;
  const picked = build.abilities.filter(open).slice(0, MAX_ACTIVE_ABILITIES);
  if (build.exact === true) return picked;
  const fallback = PROBE_DEFAULT_BUILD[classKey]?.abilities ?? abilitiesOf(classKey).slice(0, 2);
  for (const key of [...fallback, ...abilitiesOf(classKey)]) {
    if (picked.length >= MAX_ACTIVE_ABILITIES || points <= picked.length) break;
    if (!picked.includes(key) && open(key)) picked.push(key);
  }
  return picked;
}

/** The talent map of `build` with `points` to spend (≈ level): its abilities to rank 5, then (by `order`) the trunk
 *  and its branch, then the other branch; among the nodes the tree lets it raise, the most wanted, then the lowest
 *  tier, then tree order. Modifiers only for abilities it fields, the preferred one where it must choose. */
export function buildTalents(classKey: string, points: number, build: ClassBuild): Record<string, number> {
  const nodes = talentNodes(classKey);
  const fielded = new Set(fieldedAbilities(classKey, points, build));
  const prefers = new Set(build.mods ?? []);
  const branchFirst = build.order === 'branch';
  const priority = (n: TalentNode): number => {
    if (n.kind === 'ability') return 0;
    if (n.lane === TRUNK) return branchFirst ? 2 : 1;
    if (n.lane === build.branch) return branchFirst ? 1 : 2;
    return 3;
  };
  // A modifier another option of its "choose one" is preferred over (and that option's ability is fielded) is skipped.
  const passedOver = (n: TalentNode): boolean => {
    if (n.chooseGroup === undefined || prefers.has(n.key)) return false;
    return nodes.some((o) => o.chooseGroup === n.chooseGroup && o.key !== n.key && prefers.has(o.key) &&
      (o.modifies === undefined || fielded.has(o.modifies)) && (o.kind !== 'capstone' || o.lane === build.branch));
  };
  const ranks: Record<string, number> = {};
  let spent = 0;
  while (spent < points) {
    let pick: TalentNode | undefined;
    for (const n of nodes) {
      if (n.kind === 'ability' && (!fielded.has(n.key) || (ranks[n.key] ?? 0) >= ABILITY_RANK_CAP)) continue;
      if (n.kind === 'capstone' && n.lane !== build.branch) continue;
      if (build.avoid?.includes(n.key) === true) continue;
      if (passedOver(n)) continue;
      if (!canSpend(classKey, ranks, points - spent, n.key).ok) continue;
      if (pick === undefined || priority(n) < priority(pick) || (priority(n) === priority(pick) && n.rowIndex < pick.rowIndex)) pick = n;
    }
    if (pick === undefined) break;
    ranks[pick.key] = (ranks[pick.key] ?? 0) + 1;
    spent += 1;
  }
  return ranks;
}

/** Every build of a class: each pair of its abilities × each branch × each order, and for each the preferred
 *  modifier where its main branch makes it choose between two that both apply. */
export function allBuilds(classKey: string): ClassBuild[] {
  const abil = abilitiesOf(classKey);
  const nodes = talentNodes(classKey);
  const out: ClassBuild[] = [];
  for (let i = 0; i < abil.length; i++) {
    for (let j = i + 1; j < abil.length; j++) {
      const pair = [abil[i] ?? '', abil[j] ?? ''];
      for (const branch of branchesOf(classKey)) {
        // "choose one" modifier groups of this branch whose options BOTH modify a fielded ability: one build each.
        const groups = new Map<string, string[]>();
        for (const n of nodes) {
          if (n.lane !== branch || n.kind !== 'modifier' || n.chooseGroup === undefined) continue;
          if (n.modifies !== undefined && pair.includes(n.modifies)) groups.set(n.chooseGroup, [...(groups.get(n.chooseGroup) ?? []), n.key]);
        }
        let modSets: string[][] = [[]];
        for (const opts of groups.values()) if (opts.length > 1) modSets = modSets.flatMap((s) => opts.map((o) => [...s, o]));
        for (const mods of modSets) {
          for (const order of ['trunk', 'branch'] as const) out.push({ abilities: pair, branch, mods, order });
        }
      }
    }
  }
  return out;
}

/** A build of each class drawn at random (uniform over allBuilds), from `seed`. */
export function randomPartyBuild(classKeys: readonly string[], seed: number): Record<string, ClassBuild> {
  const rng = makeRng(seed >>> 0);
  const out: Record<string, ClassBuild> = {};
  for (const c of classKeys) {
    const all = allBuilds(c);
    const pick = all[rng.int(all.length)] ?? PROBE_DEFAULT_BUILD[c];
    if (pick !== undefined) out[c] = pick;
  }
  return out;
}

/** A short label for a build (reports): `guard+debilitate/bastion`. */
export function buildLabel(b: ClassBuild): string {
  const short = (k: string): string => k.replace(/^(knight|ranger|priest)_/, '');
  const mods = (b.mods ?? []).map((m) => short(m).replace(/^mod_/, '')).join(',');
  return `${b.abilities.map(short).join('+')}/${b.branch}${mods ? `[${mods}]` : ''}${b.order === 'branch' ? '*' : ''}`;
}

/** `party` (gear, levels kept) playing `build` (one per class; a class it does not name keeps what it plays). */
export function partyWithBuild<T extends { classKey: string; level: number; talents: Record<string, number>; activeAbilities?: string[]; autoDefaultAbilities?: boolean }>(
  party: readonly T[],
  build: PartyBuild,
): T[] {
  return party.map((h) => {
    const b = build[h.classKey];
    if (b === undefined) return h;
    return { ...h, talents: buildTalents(h.classKey, h.level, b), activeAbilities: fieldedAbilities(h.classKey, h.level, b), autoDefaultAbilities: true };
  });
}

/** The build a label (buildLabel) stands for — the inverse of buildLabel, for reports read back from disk. */
export function parseBuildLabel(classKey: string, label: string): ClassBuild {
  const m = /^([^/]+)\/([a-z_]+)(?:\[([^\]]*)\])?(\*)?$/.exec(label);
  if (m === null) throw new Error(`Not a build label: ${label}`);
  const abilities = (m[1] ?? '').split('+').map((a) => `${classKey}_${a}`);
  const mods = (m[3] ?? '').split(',').filter(Boolean).map((x) => `${classKey}_mod_${x}`);
  return { abilities, branch: m[2] ?? '', mods, order: m[4] === '*' ? 'branch' : 'trunk' };
}
