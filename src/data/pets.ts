import type { ChestType } from './chests';

// Pets drop on kill (extremely rare). Owning one grants its bonus PERMANENTLY;
// all owned pets stack. The selected pet is COSMETIC only. Bonuses are
// economy/utility ONLY — never a combat stat (DATA_MODEL / SPEC §4.12).

export type PetBonus =
  | { kind: 'xpMult'; value: number }
  | { kind: 'goldMult'; value: number }
  | { kind: 'chestDropMult'; value: number }
  | { kind: 'chestStorage'; type: ChestType; value: number }
  | { kind: 'zoneKeyMult'; value: number }
  | { kind: 'autoOpenReduce'; value: number };

export interface PetDef {
  key: string;
  name: string;
  sprite: string;
  dropSource: 'enemy' | 'boss' | 'both';
  baseDropChance: number; // extremely low
  bonus: PetBonus;
}

// Tuned so a first-month player gets ~1–2 total (BALANCE).
const ENEMY_DROP = 0.00002; // 1 in 50k
const BOSS_DROP = 0.0001; // 1 in 10k

export const PETS: Record<string, PetDef> = {
  coin_sprite: { key: 'coin_sprite', name: 'Coin Sprite', sprite: 'coin_sprite', dropSource: 'both', baseDropChance: ENEMY_DROP, bonus: { kind: 'goldMult', value: 0.15 } },
  scholar_owl: { key: 'scholar_owl', name: 'Scholar Owl', sprite: 'scholar_owl', dropSource: 'both', baseDropChance: ENEMY_DROP, bonus: { kind: 'xpMult', value: 0.15 } },
  pack_mule: { key: 'pack_mule', name: 'Pack Mule', sprite: 'pack_mule', dropSource: 'boss', baseDropChance: BOSS_DROP, bonus: { kind: 'chestStorage', type: 'normal', value: 2 } },
  lucky_cat: { key: 'lucky_cat', name: 'Lucky Cat', sprite: 'lucky_cat', dropSource: 'both', baseDropChance: ENEMY_DROP, bonus: { kind: 'chestDropMult', value: 0.12 } },
  keymaster: { key: 'keymaster', name: 'Keymaster', sprite: 'keymaster', dropSource: 'boss', baseDropChance: BOSS_DROP, bonus: { kind: 'zoneKeyMult', value: 0.25 } },
  time_imp: { key: 'time_imp', name: 'Time Imp', sprite: 'time_imp', dropSource: 'both', baseDropChance: ENEMY_DROP, bonus: { kind: 'autoOpenReduce', value: 90_000 } },
  hoarder: { key: 'hoarder', name: 'Hoarder', sprite: 'hoarder', dropSource: 'boss', baseDropChance: BOSS_DROP, bonus: { kind: 'chestStorage', type: 'stageBoss', value: 1 } },
};

export const PET_KEYS: string[] = Object.keys(PETS);

export function petDef(key: string): PetDef {
  const def = PETS[key];
  if (def === undefined) throw new Error(`Unknown pet ${key}`);
  return def;
}
