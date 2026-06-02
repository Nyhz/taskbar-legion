import { describe, it, expect } from 'vitest';
import { migrateTechRanks, TECH_NODE_MAP } from '@/data/techTree';

// The tech rework renamed every node. migrateTechRanks folds OLD (connected-DAG) save
// keys into the new flat nodes so existing saves don't silently lose their purchased
// power. Summed ranks ≈ same total bonus (old per-rank values match the new ones).

describe('migrateTechRanks', () => {
  it('drops legacy combat-tech ranks (tech is non-combat now; power moved to items)', () => {
    const out = migrateTechRanks({ cmb_dmg_1: 10, cmb_apex_dmg: 5, cmb_hp_1: 3, cmb_attackDamage: 7, cmb_crit_1: 4 });
    expect(Object.keys(out)).toHaveLength(0); // every cmb_* key is dropped
  });

  it('routes economy, per-type chest, storage, gem and key keys', () => {
    const out = migrateTechRanks({
      eco_gold_3: 2, eco_xp_1: 1, off_yield_2: 3,
      chest_drop_1: 2, chest_drop_normal_1: 1, chest_store_normal: 4, chest_gem_2: 1, chest_key_1: 2,
    });
    expect(out.eco_gold).toBe(2);
    expect(out.eco_xp).toBe(1);
    expect(out.eco_offline).toBe(3);
    expect(out.chest_drop_all).toBeUndefined(); // Treasure Sense removed → legacy generic-drop ranks are dropped
    expect(out.chest_drop_normal).toBe(1);
    expect(out.store_normal).toBe(4);
    expect(out.chest_gem).toBe(1);
    expect(out.chest_key).toBe(2);
  });

  it('folds both party-slot unlocks into the capped Recruitment node', () => {
    const out = migrateTechRanks({ slot_party_2: 1, slot_party_3: 1 });
    expect(out.party_size).toBe(2);
    expect(out.party_size).toBeLessThanOrEqual(TECH_NODE_MAP.party_size!.maxRanks);
  });

  it('clamps auto-open to its cap and drops removed/unknown keys', () => {
    const out = migrateTechRanks({ chest_autoopen: 1, chest_autoopen_1: 8, chest_autoopen_2: 8, inventory_slots: 5, bogus: 3 });
    expect(out.auto_open).toBe(12); // 1+8+8 = 17, clamped to maxRanks 12
    expect(out.inventory_slots).toBeUndefined();
    expect(out.bogus).toBeUndefined();
  });

  it('is idempotent on already-migrated (new) keys', () => {
    const already = { chest_gem: 7, eco_gold: 3, party_size: 2 };
    expect(migrateTechRanks(already)).toEqual(already);
  });
});
