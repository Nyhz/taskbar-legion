import { describe, it, expect } from 'vitest';
import { useStore } from '@/state/store';
import { composeItem, type ItemOrigin } from '@/sim/loot';
import { makeRng } from '@/sim/rng';
import { findEntry } from '@/sim/slots';
import type { ItemInstance } from '@/sim/items';
import type { HeroState } from '@/persistence/saveSchema';

// Per-hero Farm/Boss loadouts: a snapshot of equipment (by id) + talents the hero can swap
// back to. Restoring re-equips whatever saved gear is still available and skips the rest.

const origin = (seed: number): ItemOrigin => ({ rollSeed: seed, stageIndex: 20, chestType: 'normal', generatorVersion: 1 });
// Armor (no class lock) with an explicit id so we can equip/look it up deterministically.
const mkItem = (id: string, slot: 'helmet' | 'chest', seed: number): ItemInstance => ({ ...composeItem(slot, 4, origin(seed), makeRng(seed)), id });
const hero = (over?: Partial<HeroState>): HeroState => ({
  id: 'h0', classKey: 'knight', level: 50, exp: 0, equipment: {}, talentPoints: 0, talents: {}, activeAbilities: [], loadouts: [null, null], ...over,
});

describe('hero loadouts', () => {
  it('saves the current equipment and restores it after a change', () => {
    const a = mkItem('a', 'helmet', 1);
    const b = mkItem('b', 'chest', 2);
    useStore.setState({ inventory: [a, b], stash: [], roster: [hero()], selectedHeroId: 'h0' });
    const g = useStore.getState();

    g.equip('h0', 'a');
    g.equip('h0', 'b');
    g.saveLoadout('h0', 0);

    // Strip the gear off — both pieces go back to the bag.
    g.unequip('h0', 'helmet');
    g.unequip('h0', 'chest');
    expect(useStore.getState().roster[0]!.equipment.helmet).toBeUndefined();

    g.applyLoadout('h0', 0);
    const eq = useStore.getState().roster[0]!.equipment;
    expect(eq.helmet?.id).toBe('a');
    expect(eq.chest?.id).toBe('b');
    // The re-equipped items left the shared inventory.
    expect(findEntry(useStore.getState().inventory, 'a')).toBeUndefined();
    expect(findEntry(useStore.getState().inventory, 'b')).toBeUndefined();
  });

  it('loads every still-available item and skips a sold/deleted one', () => {
    const a = mkItem('a', 'helmet', 3);
    const b = mkItem('b', 'chest', 4);
    useStore.setState({ inventory: [a, b], stash: [], roster: [hero()], selectedHeroId: 'h0' });
    const g = useStore.getState();
    g.equip('h0', 'a');
    g.equip('h0', 'b');
    g.saveLoadout('h0', 1);

    // Take it all off, then "sell" the helmet (remove it from existence).
    g.unequip('h0', 'helmet');
    g.unequip('h0', 'chest');
    useStore.setState((s) => ({ inventory: s.inventory.filter((e) => e === null || e.id !== 'a') }));

    g.applyLoadout('h0', 1);
    const eq = useStore.getState().roster[0]!.equipment;
    expect(eq.helmet).toBeUndefined(); // sold → skipped
    expect(eq.chest?.id).toBe('b'); // the rest still loads
  });

  it('snapshots and restores the talent set, recomputing remaining points', () => {
    useStore.setState({ inventory: [], stash: [], roster: [hero({ talentPoints: 3, talents: { knight_guard: 2 } })], selectedHeroId: 'h0' });
    const g = useStore.getState();
    g.saveLoadout('h0', 0); // 5 points earned total (3 free + 2 spent)

    // Respec-style wipe: all points refunded, talents cleared (keep the saved loadout intact).
    useStore.setState((s) => ({ roster: [{ ...s.roster[0]!, talentPoints: 5, talents: {} }] }));

    g.applyLoadout('h0', 0);
    const h = useStore.getState().roster[0]!;
    expect(h.talents).toEqual({ knight_guard: 2 });
    expect(h.talentPoints).toBe(3); // 5 earned − 2 re-spent
  });
});
