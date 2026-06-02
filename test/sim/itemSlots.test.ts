import { describe, it, expect } from 'vitest';
import { slotFamily, SLOT_KEYS, SLOTS, weaponTypeFor, WEAPON_TYPES } from '@/data/itemSlots';

describe('slots & weapon types', () => {
  it('every slot is solo now (rings/trinket no longer share a family)', () => {
    for (const slot of SLOT_KEYS) expect(slotFamily(slot)).toEqual([slot]);
  });

  it('weapon + off-hand are the weapon category; ring/trinket/amulet are jewelry', () => {
    expect(SLOTS.weapon.category).toBe('weapon');
    expect(SLOTS.offhand.category).toBe('weapon');
    for (const s of ['ring', 'trinket', 'amulet'] as const) expect(SLOTS[s].category).toBe('jewelry');
  });

  it('weapon/off-hand resolve to the right class TYPE', () => {
    expect(weaponTypeFor('warrior', 'weapon').key).toBe('sword');
    expect(weaponTypeFor('warrior', 'offhand').key).toBe('shield');
    expect(weaponTypeFor('ranger', 'weapon').key).toBe('bow');
    expect(weaponTypeFor('ranger', 'offhand').key).toBe('quiver');
    expect(weaponTypeFor('priest', 'weapon').key).toBe('wand');
    expect(weaponTypeFor('priest', 'offhand').key).toBe('tome');
  });

  it('every weapon type has a class, a base intrinsic, and a non-empty substat pool', () => {
    for (const t of Object.values(WEAPON_TYPES)) {
      expect(['warrior', 'ranger', 'priest']).toContain(t.classKey);
      expect(t.base).toBeTruthy();
      expect(t.pool.length).toBeGreaterThan(0);
    }
  });
});
