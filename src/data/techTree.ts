import type { ChestType } from './chests';

// THE main v1 gold SINK (overrides SPEC §6's research currency). REWORKED: instead of
// a connected DAG of one-rank-ish chain nodes, the tree is a FLAT set of upgrades —
// ONE node per upgradeable "type", each rankable ENDLESSLY as long as you can pay.
// Per-rank power is small & fixed; the cost grows exponentially per rank
// (cost = baseCost · costGrowth^rank), so every node is an open-ended gold target and
// no node ever "completes". No prerequisites, no rings. Nodes are grouped into
// CATEGORIES purely for presentation. researchPoints is reserved/unused in v1.
//
// DESIGN: tech is NON-COMBAT ONLY (gold/XP/chests/drops/utility). Combat power lives in
// ITEMS (+ talents/level/ultimates) so a new drop is what actually changes your power —
// and so gold can never become a buy-your-power runaway that trivializes the walls.

export type TechEffect =
  | { kind: 'goldDropMult'; value: number }
  | { kind: 'xpDropMult'; value: number }
  // (no global chestDropMult node — chest drops are tuned per-type via chestTypeDropMult;
  //  the global multiplier comes only from pets, see data/pets.ts + sim/bonuses.ts.)
  | { kind: 'chestTypeDropMult'; type: ChestType; value: number }
  | { kind: 'chestStorage'; type: ChestType; value: number }
  | { kind: 'unlockAutoOpen' }
  | { kind: 'autoOpenReduce'; value: number }
  | { kind: 'offlineMult'; value: number }
  | { kind: 'partySlot' }
  | { kind: 'gemDropMult'; value: number };

export type TechCategory = 'Economy' | 'Chests' | 'Utility';

export const TECH_CATEGORIES: readonly TechCategory[] = ['Economy', 'Chests', 'Utility'];

export interface TechNode {
  key: string;
  name: string;
  description: string; // the PER-RANK effect, e.g. "+2.5% Attack Damage (party)"
  category: TechCategory;
  icon: string; // glyph for the card (presentation lives in data so the UI is dumb)
  effects: TechEffect[]; // values are PER RANK — getBonuses multiplies them by the rank
  baseCost: number; // gold for the first rank (rank 0 → 1)
  costGrowth: number; // per-rank cost multiplier (>1 ⇒ endless sink)
  maxRanks: number; // Number.POSITIVE_INFINITY for the endless nodes
}

const INF = Number.POSITIVE_INFINITY;

/** Gold cost to buy the (rank+1)-th rank of a node. Exponential ⇒ open-ended sink. */
export function nodeCost(node: TechNode, currentRank: number): number {
  return Math.round(node.baseCost * node.costGrowth ** currentRank);
}

function node(
  key: string,
  category: TechCategory,
  icon: string,
  name: string,
  description: string,
  effects: TechEffect[],
  baseCost: number,
  costGrowth: number,
  maxRanks: number = INF,
): TechNode {
  return { key, name, description, category, icon, effects, baseCost, costGrowth, maxRanks };
}

export const TECH_NODES: TechNode[] = [
  // ───────────────────────────── Economy ─────────────────────────────
  node('eco_gold', 'Economy', '💰', 'Profiteering', '+2.5% gold per kill', [{ kind: 'goldDropMult', value: 0.025 }], 150, 1.3),
  node('eco_xp', 'Economy', '📖', 'Scholarship', '+2.5% XP per kill', [{ kind: 'xpDropMult', value: 0.025 }], 150, 1.3),
  // Offline baseline is 50% (bonuses.ts); each rank buys +2.5% back, capped at 20 ranks so it
  // tops out at exactly 100% of online — never beats it. Brutal cost curve (1k base × 1.9^rank
  // ⇒ the 20th rank costs ~200M gold), so reaching full offline parity is a true end-game sink.
  node('eco_offline', 'Economy', '🌙', 'Expedition', '+2.5% offline yield (50% base)', [{ kind: 'offlineMult', value: 0.025 }], 1000, 1.9, 20),

  // ───────────────────────────── Chests ─────────────────────────────
  node('chest_drop_normal', 'Chests', '📦', 'Common Hauls', '+0.25% normal chest drop', [{ kind: 'chestTypeDropMult', type: 'normal', value: 0.0025 }], 250, 1.35),
  node('chest_drop_stage', 'Chests', '🎁', 'Boss Spoils', '+0.5% stage-boss chest drop', [{ kind: 'chestTypeDropMult', type: 'stageBoss', value: 0.005 }], 300, 1.35),
  // (no zone-boss chest node — zone bosses already drop a chest 100% of the time)
  node('chest_gem', 'Chests', '💎', 'Gem Sense', '+1% gem drop chance', [{ kind: 'gemDropMult', value: 0.01 }], 400, 1.5),
  // Storage nodes are now FINITE (base capacity + max ranks): normal 6+6=12, stage 4+4=8,
  // zone 4+4=8. Costs ramp hard so filling the cap is a real long-game gold sink.
  node('store_normal', 'Chests', '🗄', 'Stockpile', '+1 normal chest storage', [{ kind: 'chestStorage', type: 'normal', value: 1 }], 1200, 2.0, 6),
  node('store_stage', 'Chests', '🗃', 'Vault', '+1 stage-boss chest storage', [{ kind: 'chestStorage', type: 'stageBoss', value: 1 }], 1500, 2.0, 4),
  node('store_zone', 'Chests', '⛩', 'Reliquary', '+1 zone-boss chest storage', [{ kind: 'chestStorage', type: 'zoneBoss', value: 1 }], 2000, 2.0, 4),

  // ───────────────────────────── Utility ─────────────────────────────
  // Auto-open: rank 1 UNLOCKS it; each rank also shaves the interval (floored at 60s in
  // chests.ts, so ranks past the floor are wasted — hence a finite cap).
  node('auto_open', 'Utility', '⚡', 'Auto-Open', 'Unlock auto-open · −45s interval / rank', [{ kind: 'unlockAutoOpen' }, { kind: 'autoOpenReduce', value: 45_000 }], 500, 2.2, 12),
  // Party size: each rank unlocks the next active slot (2 then 3). Hand-priced LOW so the
  // tank·dps·healer trio forms in early world 1 (BALANCE) — NOT behind the deep sink.
  // costGrowth 2.5 ⇒ slot 2 = 1000g, slot 3 = 2500g.
  node('party_size', 'Utility', '👥', 'Recruitment', 'Unlock the next party slot', [{ kind: 'partySlot' }], 1000, 2.5, 2),
];

export const TECH_NODE_MAP: Record<string, TechNode> = Object.fromEntries(
  TECH_NODES.map((n) => [n.key, n]),
);

export function techNode(key: string): TechNode {
  const n = TECH_NODE_MAP[key];
  if (n === undefined) throw new Error(`Unknown tech node ${key}`);
  return n;
}

export function nodesByCategory(category: TechCategory): TechNode[] {
  return TECH_NODES.filter((n) => n.category === category);
}

// ── Save migration: pre-rework (connected-DAG) tech keys → the new flat nodes ──
// The rework renamed every node (e.g. the cmb_dmg_1..6 + apex chain → one cmb_attackDamage
// node). Old saves store ranks under the dead keys, which would otherwise be silently
// dropped (lost power). This folds each old key into its new node, SUMMING ranks (the
// old per-rank values match the new ones, so summed ranks ≈ the same total bonus),
// capped at the node's maxRanks. New keys map to themselves, so it's idempotent.
const OLD_TECH_PREFIX: Record<string, string> = {
  // Tech is NON-COMBAT now: every cmb_* node was removed, so legacy combat-tech ranks have
  // NO mapping and are dropped on load (their power moved into items). Same for the earlier-
  // removed Treasure Sense (chest_drop*) generic-drop node.
  eco_gold: 'eco_gold',
  eco_xp: 'eco_xp',
  off_yield: 'eco_offline',
  chest_drop_normal: 'chest_drop_normal',
  chest_drop_stage: 'chest_drop_stage',
  // chest_drop_zone removed (zone bosses are 100% chest drop) — legacy ranks dropped on load.
  chest_store_normal: 'store_normal',
  chest_store_stage: 'store_stage',
  chest_store_zone: 'store_zone',
  chest_gem: 'chest_gem',
  chest_autoopen: 'auto_open',
  slot_party_2: 'party_size',
  slot_party_3: 'party_size',
};
// Longest-first so `chest_drop_normal` wins over `chest_drop` etc.
const OLD_PREFIXES = Object.keys(OLD_TECH_PREFIX).sort((a, b) => b.length - a.length);

function newKeyFor(oldKey: string): string | undefined {
  if (TECH_NODE_MAP[oldKey] !== undefined) return oldKey; // already a current key
  const prefix = OLD_PREFIXES.find((p) => oldKey === p || oldKey.startsWith(`${p}_`));
  return prefix === undefined ? undefined : OLD_TECH_PREFIX[prefix];
}

export function migrateTechRanks(saved: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [oldKey, rank] of Object.entries(saved)) {
    if (rank <= 0) continue;
    const key = newKeyFor(oldKey);
    if (key === undefined) continue; // unknown/removed (e.g. inventorySlots) — drop
    out[key] = (out[key] ?? 0) + rank;
  }
  // Clamp to each node's maxRanks (auto_open=12, party_size=2; others ∞).
  for (const key of Object.keys(out)) {
    const max = TECH_NODE_MAP[key]?.maxRanks ?? Number.POSITIVE_INFINITY;
    out[key] = Math.min(out[key] ?? 0, max);
  }
  return out;
}
