import { describe, it, expect } from 'vitest';
import { useStore } from '@/state/store';
import { composeItem, type ItemOrigin } from '@/sim/loot';
import { generateGem } from '@/sim/gems';
import { makeRng } from '@/sim/rng';
import { isGem, isItem } from '@/sim/items';
import { entries } from '@/sim/slots';
import type { HeroState } from '@/persistence/saveSchema';

// Gems are unified into the normal inventory (no separate gem bag): they occupy a
// slot, move between containers, and socket out of the inventory — consuming the gem
// and binding the item.

const itemOrigin = (seed: number, stage: number): ItemOrigin => ({
  rollSeed: seed, stageIndex: stage, chestType: 'normal', generatorVersion: 1,
});
// Level 99 so the equip gate (level ≥ ilvl) never blocks the gear used in these tests.
const hero = (): HeroState => ({ id: 'h0', classKey: 'warrior', level: 99, exp: 0, equipment: {}, talentPoints: 0, talents: {}, activeAbilities: [] });

describe('unified gem inventory', () => {
  it('addLoot puts items and gems into the same inventory array', () => {
    const item = composeItem('helmet', 4, itemOrigin(1, 20), makeRng(1)); // T4 → 2 sockets
    const gem = generateGem({ rollSeed: 7, stageIndex: 20, generatorVersion: 1 }, 3);
    useStore.setState({ inventory: [], stash: [], roster: [hero()], selectedHeroId: 'h0' });

    useStore.getState().addLoot([item], [gem]);
    const inv = entries(useStore.getState().inventory);
    expect(inv).toHaveLength(2);
    expect(inv.filter(isItem)).toHaveLength(1);
    expect(inv.filter(isGem)).toHaveLength(1);
  });

  it('socketing consumes the gem from the inventory and binds the item', () => {
    const item = composeItem('helmet', 4, itemOrigin(2, 20), makeRng(2));
    const gem = generateGem({ rollSeed: 9, stageIndex: 20, generatorVersion: 1 }, 3);
    useStore.setState({ inventory: [item, gem], stash: [], roster: [hero()], selectedHeroId: 'h0' });

    useStore.getState().equip('h0', item.id);
    useStore.getState().socketGem('h0', 'helmet', 0, gem.id);

    const st = useStore.getState();
    expect(entries(st.inventory)).toHaveLength(0); // gem gone from the bag (a hole remains)
    const equipped = st.roster[0]?.equipment.helmet;
    expect(equipped?.sockets[0]?.gem?.id).toBe(gem.id);
    expect(equipped?.bound).toBe(true);
  });

  it('a gem cannot be equipped as gear', () => {
    const gem = generateGem({ rollSeed: 3, stageIndex: 20, generatorVersion: 1 }, 2);
    useStore.setState({ inventory: [gem], stash: [], roster: [hero()], selectedHeroId: 'h0' });

    useStore.getState().equip('h0', gem.id);
    const st = useStore.getState();
    expect(entries(st.inventory)).toHaveLength(1); // still in the bag
    expect(Object.keys(st.roster[0]?.equipment ?? {})).toHaveLength(0);
  });
});
