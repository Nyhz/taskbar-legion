import { describe, it, expect } from 'vitest';
import { useStore } from '@/state/store';
import type { HeroState } from '@/persistence/saveSchema';

const hero = (id: string): HeroState => ({ id, classKey: 'knight', level: 1, exp: 0, equipment: {}, talentPoints: 0, talents: {}, activeAbilities: [] });

describe('XP gating by alive set', () => {
  it('only heroes in the alive set gain XP', () => {
    useStore.setState({ roster: [hero('h0'), hero('h1')], selectedHeroId: 'h0' });
    useStore.getState().gainExp(100, ['h0']); // h1 is dead

    const [h0, h1] = useStore.getState().roster;
    expect(h0?.exp).toBe(100);
    expect(h1?.exp).toBe(0); // dead → no XP
  });

  it('with no alive set (offline) the whole roster gains', () => {
    useStore.setState({ roster: [hero('h0'), hero('h1')], selectedHeroId: 'h0' });
    useStore.getState().gainExp(50);

    const [h0, h1] = useStore.getState().roster;
    expect(h0?.exp).toBe(50);
    expect(h1?.exp).toBe(50);
  });
});
