import { describe, it, expect } from 'vitest';
import { getBonuses } from '@/sim/bonuses';

describe('getBonuses', () => {
  it('sums tech mults by rank', () => {
    const b = getBonuses({ eco_gold: 2 }, []);
    expect(b.goldMult).toBeCloseTo(1.16, 5); // 1 + 0.08*2
  });

  it('stacks a pet bonus on top of tech, regardless of selection', () => {
    const b = getBonuses({ eco_gold: 1 }, ['coin_sprite']);
    expect(b.goldMult).toBeCloseTo(1.08 + 0.15, 5);
  });

  it('party slots come from the single endless recruitment node', () => {
    expect(getBonuses({}, []).partySlots).toBe(1);
    expect(getBonuses({ party_size: 1 }, []).partySlots).toBe(2);
    expect(getBonuses({ party_size: 2 }, []).partySlots).toBe(3);
  });

  it('tech is non-combat: combat keys grant NO combat mods', () => {
    // cmb_* nodes were removed (combat power lives in items now); a stale key is inert.
    const b = getBonuses({ cmb_attackDamage: 3 }, []);
    expect(b.combatMods).toHaveLength(0);
  });

  it('exposes chest storage bonuses (tech + pet)', () => {
    const b = getBonuses({ store_normal: 2 }, ['pack_mule']);
    expect(b.chestStorageBonus.normal).toBe(1 * 2 + 2); // tech 2 ranks*1 + pack_mule +2
  });

  it('unlocks auto-open from the auto_open node', () => {
    expect(getBonuses({ auto_open: 1 }, []).autoOpenUnlocked).toBe(true);
    expect(getBonuses({}, []).autoOpenUnlocked).toBe(false);
  });
});
