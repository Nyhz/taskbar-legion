import { rowUnlockThreshold, talentNodes, tryTalentNode, type TalentNode } from '@/data/talents';

// The RULES of the talent tree (docs/redesign/CLASSES.md §2, F1), as pure functions over a hero's
// `talents` map (node key → rank). The store's spend / refund / respec actions and the load-time sanitiser
// all go through here, and the interface asks `canSpend` why a node cannot be raised.

/** The maximum abilities a hero may have points in — learned IS active (docs/redesign/CLASSES.md §2.3). */
export const MAX_ACTIVE_ABILITIES = 2;

export type Talents = Readonly<Record<string, number>>;

/** Why a point cannot go into a node. */
export type SpendBlock =
  | { reason: 'unknownNode' }
  | { reason: 'maxRank' }
  | { reason: 'tierLocked'; need: number } // the tier opens at `need` points spent
  | { reason: 'abilityCap'; max: number } // already has `max` abilities learned
  | { reason: 'needsAbility'; abilityKey: string } // a modifier whose ability is not learned
  | { reason: 'chooseOne'; otherKey: string } // the other option of its "choose one" holds the point
  | { reason: 'branchPoints'; need: number; have: number } // a capstone: points needed in its branch
  | { reason: 'noPoints' };

export type SpendCheck = { ok: true } | ({ ok: false } & SpendBlock);

/** Why a point cannot be taken out of a node. */
export type RefundBlock =
  | { reason: 'unknownNode' }
  | { reason: 'notRanked' }
  | { reason: 'tierStranded'; nodeKey: string } // a still-ranked node's tier would close
  | { reason: 'capstoneStranded'; nodeKey: string }; // the capstone would lose its branch points

export type RefundCheck = { ok: true; talents: Record<string, number>; refunded: number } | ({ ok: false } & RefundBlock);

const rankOf = (talents: Talents, key: string): number => talents[key] ?? 0;

/** Points spent in the tree. */
export function spentPoints(talents: Talents): number {
  let total = 0;
  for (const v of Object.values(talents)) total += v;
  return total;
}

/** Points spent in one branch (its capstone does not count towards its own requirement). */
export function branchPoints(classKey: string, talents: Talents, branchKey: string): number {
  let total = 0;
  for (const n of talentNodes(classKey)) {
    if (n.lane === branchKey && n.kind !== 'capstone') total += rankOf(talents, n.key);
  }
  return total;
}

/** Ability nodes with points, in tree order. */
export function learnedAbilityNodes(classKey: string, talents: Talents): TalentNode[] {
  return talentNodes(classKey).filter((n) => n.kind === 'ability' && rankOf(talents, n.key) > 0);
}

/** Whether a point may go into `nodeKey`, and if not, why. Structural reasons come before "no points", so
 *  the interface can say what is in the way even when the hero has nothing to spend. */
export function canSpend(classKey: string, talents: Talents, pointsToSpend: number, nodeKey: string): SpendCheck {
  const node = tryTalentNode(classKey, nodeKey);
  if (node === undefined) return { ok: false, reason: 'unknownNode' };
  const rank = rankOf(talents, node.key);
  if (rank >= node.maxRank) return { ok: false, reason: 'maxRank' };
  const need = rowUnlockThreshold(node.rowIndex);
  if (spentPoints(talents) < need) return { ok: false, reason: 'tierLocked', need };
  if (node.kind === 'ability' && rank === 0 && learnedAbilityNodes(classKey, talents).length >= MAX_ACTIVE_ABILITIES) {
    return { ok: false, reason: 'abilityCap', max: MAX_ACTIVE_ABILITIES };
  }
  if (node.modifies !== undefined && rankOf(talents, node.modifies) <= 0) {
    return { ok: false, reason: 'needsAbility', abilityKey: node.modifies };
  }
  if (node.chooseGroup !== undefined) {
    const other = talentNodes(classKey).find(
      (n) => n.chooseGroup === node.chooseGroup && n.key !== node.key && rankOf(talents, n.key) > 0,
    );
    if (other !== undefined) return { ok: false, reason: 'chooseOne', otherKey: other.key };
  }
  if (node.branchPoints !== undefined) {
    const have = branchPoints(classKey, talents, node.lane);
    if (have < node.branchPoints) return { ok: false, reason: 'branchPoints', need: node.branchPoints, have };
  }
  if (pointsToSpend <= 0) return { ok: false, reason: 'noPoints' };
  return { ok: true };
}

/** A still-ranked node the build can no longer hold: its tier would be closed, or it is a capstone short of
 *  points in its branch. The first in tree order, or the last when `fromEnd` (the sanitiser trims from the far
 *  end so it keeps as much of the build as it can). */
function strandedNode(classKey: string, talents: Talents, fromEnd = false): { reason: 'tierStranded' | 'capstoneStranded'; nodeKey: string } | undefined {
  const spent = spentPoints(talents);
  const nodes = talentNodes(classKey);
  for (let k = 0; k < nodes.length; k++) {
    const n = nodes[fromEnd ? nodes.length - 1 - k : k];
    if (n === undefined || rankOf(talents, n.key) <= 0) continue;
    if (spent < rowUnlockThreshold(n.rowIndex)) return { reason: 'tierStranded', nodeKey: n.key };
    if (n.branchPoints !== undefined && branchPoints(classKey, talents, n.lane) < n.branchPoints) {
      return { reason: 'capstoneStranded', nodeKey: n.key };
    }
  }
  return undefined;
}

/** Take ONE rank out of `nodeKey`. Taking the last point out of an ability also gives back its modifiers.
 *  Rejected when a still-ranked node would be left in a closed tier, or the capstone short of its branch
 *  points — give those back first. Returns the new talents and how many points came back. */
export function refundOne(classKey: string, talents: Talents, nodeKey: string): RefundCheck {
  const node = tryTalentNode(classKey, nodeKey);
  if (node === undefined) return { ok: false, reason: 'unknownNode' };
  const rank = rankOf(talents, nodeKey);
  if (rank <= 0) return { ok: false, reason: 'notRanked' };
  const next: Record<string, number> = { ...talents };
  let refunded = 1;
  if (rank - 1 <= 0) delete next[nodeKey];
  else next[nodeKey] = rank - 1;
  if (node.kind === 'ability' && rank - 1 <= 0) {
    for (const n of talentNodes(classKey)) {
      if (n.modifies !== node.key) continue;
      refunded += rankOf(next, n.key);
      delete next[n.key];
    }
  }
  const stranded = strandedNode(classKey, next);
  if (stranded !== undefined) return { ok: false, ...stranded };
  return { ok: true, talents: next, refunded };
}

/** A `talents` map the tree accepts, from ANY input (an old or damaged save, a stale preset): unknown keys
 *  and bad ranks are dropped, ranks are clamped, at most two abilities are kept (the ones in `preferred`
 *  first, then tree order), modifiers without their ability and second "choose one" options go, and whatever
 *  no longer fits the tier, capstone or point rules is taken out from the far end of the tree. Never throws.
 *  `earned` is every point the hero has (data/talents.talentPointsAtLevel for a save); points to spend are
 *  what is left of it after the valid spend, so none is lost. */
export function sanitizeTalents(
  classKey: string,
  talents: unknown,
  earnedPoints: number,
  preferred: readonly string[] = [],
): { talents: Record<string, number>; talentPoints: number } {
  const earned = Number.isFinite(earnedPoints) ? Math.max(0, Math.floor(earnedPoints)) : 0;
  const source: Record<string, unknown> =
    talents !== null && typeof talents === 'object' ? (talents as Record<string, unknown>) : {};
  let nodes: TalentNode[];
  try {
    nodes = talentNodes(classKey);
  } catch {
    return { talents: {}, talentPoints: earned };
  }
  const ranked: Record<string, number> = {};
  for (const n of nodes) {
    const raw = source[n.key];
    if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;
    const rank = Math.min(n.maxRank, Math.floor(raw));
    if (rank >= 1) ranked[n.key] = rank;
  }
  // Two abilities at most: the hero's active ones first, then tree order. An ability chosen here can still
  // fall to the tier or point rules below; when one does and another was left out for the cap, the build is
  // made again without the fallen one, so the next candidate takes its place instead of being lost.
  const order = (n: TalentNode): number => {
    const i = preferred.indexOf(n.key);
    return i < 0 ? preferred.length : i;
  };
  let candidates = nodes.filter((n) => n.kind === 'ability' && ranked[n.key] !== undefined).sort((x, y) => order(x) - order(y));
  for (;;) {
    const kept = candidates.slice(0, MAX_ACTIVE_ABILITIES);
    const out = trimToRules(classKey, nodes, ranked, new Set(kept.map((n) => n.key)), earned);
    const fallen = kept.filter((n) => out[n.key] === undefined);
    if (fallen.length === 0 || candidates.length <= MAX_ACTIVE_ABILITIES) {
      return { talents: out, talentPoints: Math.max(0, earned - spentPoints(out)) };
    }
    candidates = candidates.filter((n) => !fallen.includes(n));
  }
}

/** `ranked` (known nodes, clamped ranks) cut down to what the rules hold, with only the `kept` abilities. */
function trimToRules(
  classKey: string,
  nodes: readonly TalentNode[],
  ranked: Readonly<Record<string, number>>,
  kept: ReadonlySet<string>,
  earned: number,
): Record<string, number> {
  const out: Record<string, number> = { ...ranked };
  for (const n of nodes) if (n.kind === 'ability' && !kept.has(n.key)) delete out[n.key];
  // Modifiers need their ability; a "choose one" keeps its first option.
  const groups = new Set<string>();
  for (const n of nodes) {
    if (out[n.key] === undefined) continue;
    if (n.modifies !== undefined && out[n.modifies] === undefined) delete out[n.key];
    else if (n.chooseGroup !== undefined) {
      if (groups.has(n.chooseGroup)) delete out[n.key];
      else groups.add(n.chooseGroup);
    }
  }
  // More spent than earned: take ranks out from the end of the tree.
  for (let i = nodes.length - 1; i >= 0 && spentPoints(out) > earned; i--) {
    const n = nodes[i];
    if (n === undefined || out[n.key] === undefined) continue;
    const over = spentPoints(out) - earned;
    const rank = (out[n.key] ?? 0) - over;
    if (rank >= 1) out[n.key] = rank;
    else delete out[n.key];
  }
  // Whatever the tier and capstone rules no longer hold goes (each removal can strand another).
  for (let guard = nodes.length; guard > 0; guard--) {
    const stranded = strandedNode(classKey, out, true);
    if (stranded === undefined) break;
    delete out[stranded.nodeKey];
    for (const n of nodes) if (n.modifies === stranded.nodeKey) delete out[n.key];
  }
  return out;
}
