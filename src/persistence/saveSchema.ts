import type { ItemInstance, InvEntry } from '@/sim/items';
import type { GemInstance } from '@/data/gems';
import type { SlotKey } from '@/data/itemSlots';
import type { ChestType } from '@/data/chests';

// SaveV1 + HeroState exactly per SPEC §8 / DATA_MODEL. Carries future-but-empty
// fields (cube, online, researchPoints) for forward-compat — never stripped. The
// store is shaped to make this a near-direct projection (saveManager in Phase 5).

// A saved gear+talent snapshot a hero can swap back to (Farm / Boss presets). Items are
// stored by ID (not copied) so loading never duplicates gear — on load each id is resolved
// from whatever container currently holds it (equip/inventory/stash); missing ids are skipped.
export interface Loadout {
  classKey: string; // talents are class-specific — only re-applied if the hero is still this class
  items: Partial<Record<SlotKey, string>>; // slot -> itemId
  talents: Record<string, number>;
  activeAbilities: string[];
}

export interface HeroState {
  id: string;
  classKey: string;
  level: number;
  exp: number;
  equipment: Partial<Record<SlotKey, ItemInstance>>;
  talentPoints: number;
  talents: Record<string, number>; // talentNodeKey -> rank
  activeAbilities: string[]; // ≤2 selected ability keys that fire in combat (empty ⇒ first 2 ranked)
  loadouts?: (Loadout | null)[]; // length 2: [0]=Farm, [1]=Boss (optional — old saves lack it)
}

export interface SaveV1 {
  version: 1;
  seed: number;
  lastSavedAt: number;
  progress: { globalStageIndex: number; world: number; stage: number };
  maxClearedStage: number; // highest stage whose boss was beaten (travel-unlock + resume frontier)
  lootRngState: number; // DEPRECATED (pre-counter loot RNG cursor) — kept for back-compat, no longer read
  lootDrawCount: number; // monotonic count of chests ever opened — seeds counter-based loot derivation
  nextEntryId: number; // monotonic minter for inventory/stash/equipment ids (decoupled from rollSeed)
  gold: number;
  researchPoints: number; // RESERVED/unused in v1 (tech costs gold)
  unlockedClasses: string[];
  partySlots: (string | null)[]; // length 3; slots 2/3 gated by tech
  roster: HeroState[];
  // Inventory + stash are FIXED-SLOT containers: a sparse array where index = the slot
  // and `null` = an empty slot (so removing an item never shifts the others). Legacy
  // saves stored dense arrays (no nulls) — still valid, just read as a gap-less layout.
  inventory: (InvEntry | null)[]; // gear + loose gems, unified
  inventoryGems: GemInstance[]; // LEGACY: pre-unification gem bag; folded into `inventory` on load, written [] now
  inventorySlotUpgrades: number; // 0..20 → inventory cap 20..40
  stash: (InvEntry | null)[];
  stashPages: number; // 1..8
  stashSlotUpgrades: number; // 0..20 (per page)
  techTree: Record<string, number>; // nodeKey -> purchased ranks (gold)
  chests: { type: ChestType; dropStage: number; count: number }[];
  zoneKeys?: Record<number, number>; // world-boss challenge keys: X-10 global stage → count (old saves lack it)
  autoOpen: { unlocked: boolean; lastRunAt: number | null };
  pets: { ownedKeys: string[]; selectedKey: string | null };
  settings: {
    uiScale: 1 | 1.5 | 2;
    dockOrientation: 'bottom' | 'left' | 'right';
    autoSalvage?: { enabled: boolean; tiers: boolean[] }; // optional: old saves lack it
  };
  // future systems — present, possibly empty:
  cube: { unlocked: boolean };
  online: { accountId: string | null; premiumCurrency: number; premiumUntil: number | null };
}
