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
// Level 99 — arbitrary; these tests exercise gem inventory/socketing, not leveling.
const hero = (): HeroState => ({ id: 'h0', classKey: 'knight', level: 99, exp: 0, equipment: {}, talentPoints: 0, talents: {}, activeAbilities: [] });

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

  it('mints unique ids on insert even when two items share a roll-seed id', () => {
    // Same origin ⇒ composeItem produces the SAME rollSeed-derived id for both — the exact
    // collision the old design hit. The minter must hand each a distinct id on insert.
    const a = composeItem('helmet', 4, itemOrigin(5, 20), makeRng(5));
    const b = composeItem('helmet', 4, itemOrigin(5, 20), makeRng(5));
    expect(a.id).toBe(b.id); // identical content → identical roll-seed id (pre-minter hazard)
    useStore.setState({ inventory: [], stash: [], roster: [hero()], selectedHeroId: 'h0', nextEntryId: 1 });

    useStore.getState().addLoot([a, b], []);
    const inv = entries(useStore.getState().inventory);
    expect(inv).toHaveLength(2);
    expect(inv[0]!.id).not.toBe(inv[1]!.id); // distinct ids despite the shared origin
    expect(inv.every((e) => /^e\d+$/.test(e.id))).toBe(true); // minted `e<n>` namespace
    expect(useStore.getState().nextEntryId).toBe(3); // counter advanced past both
  });

  it('socketing consumes the gem from the inventory without binding the item', () => {
    const item = composeItem('helmet', 4, itemOrigin(2, 20), makeRng(2));
    const gem = generateGem({ rollSeed: 9, stageIndex: 20, generatorVersion: 1 }, 3);
    useStore.setState({ inventory: [item, gem], stash: [], roster: [hero()], selectedHeroId: 'h0' });

    useStore.getState().equip('h0', item.id);
    useStore.getState().socketGem('h0', 'helmet', 0, gem.id);

    const st = useStore.getState();
    expect(entries(st.inventory)).toHaveLength(0); // gem gone from the bag (a hole remains)
    const equipped = st.roster[0]?.equipment.helmet;
    expect(equipped?.sockets[0]?.gem?.id).toBe(gem.id);
    expect(equipped?.bound).toBe(false); // no trading/bound gear in this game
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
