import { describe, expect, it } from 'vitest';
import { WORLDS, tryWorldDef } from '@/data/worlds';
import { bossPlateInfo, clockText } from '@/ui/hud/bossPlate';

describe('the HUD boss line', () => {
  it('names a stage boss after its world\'s boss creature, under the skull', () => {
    for (const world of WORLDS) {
      expect(bossPlateInfo(world, false)).toEqual({ rank: 'stageBoss', creatureKey: world.creatures.boss.key, sign: 'hud_boss' });
    }
  });

  it('names a world boss after its own creature when the world has one, under the crown', () => {
    const first = tryWorldDef(1);
    expect(first?.worldBoss).toBeDefined();
    expect(bossPlateInfo(first, true)).toEqual({ rank: 'worldBoss', creatureKey: first?.worldBoss?.key, sign: 'tal_crown' });
  });

  it('a world without its own world boss shows the stage boss\'s name, still under the crown', () => {
    const plain = WORLDS.find((w) => w.worldBoss === undefined);
    if (plain === undefined) return; // every world has one by now
    expect(bossPlateInfo(plain, true)).toEqual({ rank: 'worldBoss', creatureKey: plain.creatures.boss.key, sign: 'tal_crown' });
  });

  it('has no name for an unknown world', () => {
    expect(bossPlateInfo(undefined, true).creatureKey).toBeNull();
    expect(bossPlateInfo(undefined, false).creatureKey).toBeNull();
  });

  it('writes the enrage clock as m:ss, rounded up', () => {
    expect(clockText(27_000)).toBe('0:27');
    expect(clockText(26_100)).toBe('0:27');
    expect(clockText(125_000)).toBe('2:05');
    expect(clockText(-50)).toBe('0:00');
  });
});
