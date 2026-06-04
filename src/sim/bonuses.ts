import type { ChestType } from '@/data/chests';
import { TECH_NODES } from '@/data/techTree';
import { petDef } from '@/data/pets';
import type { StatMod } from './stats';

// Merges tech ranks + owned pets into ONE bonus object the sim & state read. They
// NEVER read the tech/pet lists directly (DATA_MODEL). Multipliers are returned as
// final factors (1 + Σ); storage/reduce are additive.

export interface Bonuses {
  goldMult: number;
  xpMult: number;
  chestDropMult: number; // global, all chest types (pet-only source; no tech node grants it)
  chestTypeDropMult: Record<ChestType, number>; // per-type, stacks on top of the global mult
  gemDropMult: number;
  chestStorageBonus: Record<ChestType, number>;
  autoOpenUnlocked: boolean;
  autoOpenReduceMs: number;
  offlineMult: number;
  combatMods: StatMod[]; // party-wide combat mods (reserved channel; tech is non-combat now, so always empty — combat power is items/talents/auras)
  partySlots: number; // 1..3
  synthDoubleChance: number; // EXTRA chance (0..0.05) added to the Cube's base 5% +2-tier roll
}

export function getBonuses(
  techRanks: Record<string, number>,
  ownedPetKeys: readonly string[],
): Bonuses {
  const b: Bonuses = {
    goldMult: 1,
    xpMult: 1,
    chestDropMult: 1,
    chestTypeDropMult: { normal: 1, stageBoss: 1, zoneBoss: 1 },
    gemDropMult: 1,
    chestStorageBonus: { normal: 0, stageBoss: 0, zoneBoss: 0 },
    autoOpenUnlocked: false,
    autoOpenReduceMs: 0,
    // Offline yield is HALF of online by default; the Expedition tech (+2.5%/rank, capped at
    // 20 ranks) buys it back up to a maximum of 1.0 — offline can equal, but never beat, online.
    offlineMult: 0.5,
    combatMods: [],
    partySlots: 1,
    synthDoubleChance: 0,
  };

  for (const node of TECH_NODES) {
    const rank = techRanks[node.key] ?? 0;
    if (rank <= 0) continue;
    for (const e of node.effects) {
      switch (e.kind) {
        case 'goldDropMult': b.goldMult += e.value * rank; break;
        case 'xpDropMult': b.xpMult += e.value * rank; break;
        case 'chestTypeDropMult': b.chestTypeDropMult[e.type] += e.value * rank; break;
        case 'gemDropMult': b.gemDropMult += e.value * rank; break;
        case 'chestStorage': b.chestStorageBonus[e.type] += e.value * rank; break;
        case 'unlockAutoOpen': b.autoOpenUnlocked = true; break;
        case 'autoOpenReduce': b.autoOpenReduceMs += e.value * rank; break;
        case 'offlineMult': b.offlineMult += e.value * rank; break;
        case 'partySlot': b.partySlots = 1 + rank; break; // single endless node: rank ⇒ extra active slots
        case 'synthDoubleChance': b.synthDoubleChance += e.value * rank; break;
        default: { const _exhaustive: never = e; void _exhaustive; }
      }
    }
  }
  b.synthDoubleChance = Math.min(0.05, b.synthDoubleChance); // hard +5% ceiling (defensive; maxRanks already caps it)

  for (const key of ownedPetKeys) {
    const bonus = petDef(key).bonus;
    switch (bonus.kind) {
      case 'goldMult': b.goldMult += bonus.value; break;
      case 'xpMult': b.xpMult += bonus.value; break;
      case 'chestDropMult': b.chestDropMult += bonus.value; break;
      case 'chestStorage': b.chestStorageBonus[bonus.type] += bonus.value; break;
      case 'autoOpenReduce': b.autoOpenReduceMs += bonus.value; break;
      default: { const _exhaustive: never = bonus; void _exhaustive; }
    }
  }

  return b;
}
