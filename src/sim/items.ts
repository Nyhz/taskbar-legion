import type { SlotKey, SlotCategory } from '@/data/itemSlots';
import type { ItemTier } from '@/data/tiers';
import type { StatKey } from '@/data/stats';
import type { GemInstance } from '@/data/gems';
import type { ChestType } from '@/data/chests';

// Runtime item types. Created by sim/loot.ts. Every item carries a deterministic
// birth certificate (`origin`) so generateItem(origin) reproduces it byte-for-byte
// (the v2 anti-cheat contract), and `bound: false` at birth (set true on modify).

export interface SocketState {
  gem: GemInstance | null;
}

export interface AffixRoll {
  key: StatKey;
  value: number;
}

export interface ItemInstance {
  id: string;
  slot: SlotKey;
  category: SlotCategory;
  tier: ItemTier; // tier IS rarity
  ilvl: number; // discrete band: 1,5,10,15,…
  /** The guaranteed intrinsic affix(es): 1 entry normally, 2 for an armor armor/MR split. */
  baseAffix: AffixRoll[];
  stats: AffixRoll[]; // rolled substats, length = tierDef.extraStats (<=4)
  sockets: SocketState[]; // length = tierDef.sockets (<=4)
  /** Class lock for weapon/off-hand items (the class whose weapon TYPE this is). Only
   *  that class can equip it; absent for armor/jewelry (any hero). */
  classKey?: string;
  origin: {
    rollSeed: number;
    stageIndex: number;
    chestType: ChestType;
    generatorVersion: number;
  };
  bound: boolean;
  /** Set once a Cube transfiguration has been used on this item — it can never be
   *  transfigured again (a one-time chance, win or lose). Absent ⇒ never transfigured. */
  transfigured?: boolean;
  // future-proofing (present in schema, unused in v1):
  enchantLevel?: number;
  locked?: boolean;
}

// Inventory and stash hold a mix of gear and loose gems — both are non-stacking
// instances that occupy a slot, move between containers, and show a tooltip. Gems
// carry no `slot` field, which discriminates the union without a tag.
export type InvEntry = ItemInstance | GemInstance;

export function isGem(e: InvEntry): e is GemInstance {
  return !('slot' in e);
}

export function isItem(e: InvEntry): e is ItemInstance {
  return 'slot' in e;
}
