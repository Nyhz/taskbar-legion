import { describe, it, expect } from 'vitest';
import { useStore } from '@/state/store';
import { composeItem, type ItemOrigin } from '@/sim/loot';
import { makeRng } from '@/sim/rng';
import { findEntry } from '@/sim/slots';
import type { ItemInstance } from '@/sim/items';
import type { HeroState } from '@/persistence/saveSchema';

// Per-hero Farm/Boss loadouts: a TALENT-ONLY snapshot (talents + active abilities) the hero
// can swap back to. Loading restores the build and never touches gear/inventory/stash.

const origin = (seed: number): ItemOrigin => ({ rollSeed: seed, stageIndex: 20, chestType: 'normal', generatorVersion: 1 });
// Armor (no class lock) with an explicit id so we can equip/look it up deterministically.
const mkItem = (id: string, slot: 'helmet' | 'chest', seed: number): ItemInstance => ({ ...composeItem(slot, 4, origin(seed), makeRng(seed)), id });
const hero = (over?: Partial<HeroState>): HeroState => ({
  id: 'h0', classKey: 'knight', level: 50, exp: 0, equipment: {}, talentPoints: 0, talents: {}, activeAbilities: [], loadouts: [null, null], ...over,
});

describe('hero loadouts', () => {
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

  it('leaves gear, inventory and stash untouched on load (talent-only)', () => {
    const a = mkItem('a', 'helmet', 1);
    const b = mkItem('b', 'chest', 2);
    // Hero wearing `a`, with `b` in the bag, and a saved talent build.
    useStore.setState({ inventory: [b], stash: [], roster: [hero({ talents: { knight_guard: 1 }, equipment: { helmet: a } })], selectedHeroId: 'h0' });
    const g = useStore.getState();
    g.saveLoadout('h0', 0);

    // After saving, the player respecs AND rearranges gear (both pieces now in the bag, none worn).
    useStore.setState((s) => ({ roster: [{ ...s.roster[0]!, talents: {}, talentPoints: 1, equipment: {} }], inventory: [a, b] }));

    g.applyLoadout('h0', 0);
    const st = useStore.getState();
    // Talents are restored…
    expect(st.roster[0]!.talents).toEqual({ knight_guard: 1 });
    // …but gear + containers stay exactly as they were before the load — loadouts never move gear.
    expect(st.roster[0]!.equipment.helmet).toBeUndefined();
    expect(findEntry(st.inventory, 'a')).toBeDefined();
    expect(findEntry(st.inventory, 'b')).toBeDefined();
  });
});
