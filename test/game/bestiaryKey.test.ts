import { describe, expect, it } from 'vitest';
import { bestiaryKey } from '@/game/bestiaryKey';
import type { Combatant } from '@/sim/world';

// The bestiary entry of an enemy is the creature the strip draws for it (render/figureData.creatureRole).
const foe = (over: Partial<Combatant>): Combatant => ({ id: 'e1', range: 50, ...over }) as Combatant;

describe('bestiary key', () => {
  it('a wave enemy is its world creature for its role, in any difficulty', () => {
    expect(bestiaryKey(foe({ enemyRole: 'beast' }), 3)).toBe('boar');
    expect(bestiaryKey(foe({ enemyRole: 'shooter' }), 103)).toBe('poacher');
    expect(bestiaryKey(foe({ enemyRole: 'support' }), 3)).toBe('drummer');
  });

  it('a boss is the stage boss, or on an X-10 the world boss', () => {
    expect(bestiaryKey(foe({ isBoss: true }), 9)).toBe('king');
    expect(bestiaryKey(foe({ isBoss: true }), 10)).toBe('crowmother');
  });

  it("what a boss summons is no creature", () => {
    expect(bestiaryKey(foe({ summon: { key: 'crow' } } as Partial<Combatant>), 10)).toBeUndefined();
  });
});
