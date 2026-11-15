import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CLASS_KEYS } from '@/data/classes';
import { RANGE } from '@/data/field';
import { ENEMY_KINDS } from '@/data/enemies';
import { CREATURE_ROLES, WORLDS } from '@/data/worlds';
import { HERO_FIGURES, clipMs, creatureRole, enemyRank, figureMeta, frameCell, worldCreatureKeys } from '@/game/render/figureData';

const FIGS = join(__dirname, '../../src/assets/strip/figs');
const CREATURE_CLIPS = ['idle', 'run', 'attack', 'hurt', 'death'];

describe('figure catalogue (figs.json)', () => {
  it('has a figure for every hero class, with the clips the game plays', () => {
    expect([...HERO_FIGURES].sort()).toEqual([...CLASS_KEYS].sort());
    for (const key of CLASS_KEYS) {
      const meta = figureMeta(key);
      expect(meta, key).toBeDefined();
      for (const clip of CREATURE_CLIPS) expect(meta?.anims[clip], `${key}.${clip}`).toBeDefined();
      expect(existsSync(join(FIGS, `${key}.png`)), `${key}.png`).toBe(true);
    }
  });

  it('has a figure and an atlas for every creature of every world (data/worlds.ts)', () => {
    expect(WORLDS).toHaveLength(10);
    for (const world of WORLDS) {
      const cast = worldCreatureKeys(world.index);
      expect(cast).toBeDefined();
      for (const role of CREATURE_ROLES) {
        const key = cast?.[role] ?? '';
        expect(key).toBe(world.creatures[role].key);
        const meta = figureMeta(key);
        expect(meta, `${key} (world ${world.index})`).toBeDefined();
        for (const clip of CREATURE_CLIPS) expect(meta?.anims[clip], `${key}.${clip}`).toBeDefined();
        expect(existsSync(join(FIGS, `${key}.png`)), `${key}.png`).toBe(true);
      }
    }
    expect(worldCreatureKeys(0)).toBeUndefined();
    expect(worldCreatureKeys(11)).toBeUndefined();
  });

  it('describes atlases every GPU can hold, with consistent animations', () => {
    for (const key of [...CLASS_KEYS, ...WORLDS.flatMap((w) => CREATURE_ROLES.map((r) => w.creatures[r].key))]) {
      const meta = figureMeta(key);
      if (meta === undefined) throw new Error(key);
      expect(meta.w * meta.cols, key).toBeLessThanOrEqual(2048);
      expect(meta.root).toBeGreaterThan(0);
      expect(meta.root).toBeLessThan(meta.w);
      expect(meta.ground).toBeLessThanOrEqual(meta.h);
      const [left, top, right] = meta.box;
      expect(top, `${key} stands above the ground`).toBeLessThan(0);
      expect(right).toBeGreaterThan(left);
      const cells = new Set<string>();
      for (const [name, anim] of Object.entries(meta.anims)) {
        expect(anim.ms, `${key}.${name}`).toHaveLength(anim.n);
        expect(anim.ms.every((ms) => ms > 0)).toBe(true);
        expect(clipMs(anim)).toBe(anim.ms.reduce((a, b) => a + b, 0));
        for (let i = 0; i < anim.n; i++) {
          const [col, row] = frameCell(meta, anim, i);
          expect(col).toBeLessThan(meta.cols);
          const id = `${col},${row}`;
          expect(cells.has(id), `${key}.${name}[${i}] shares a cell`).toBe(false);
          cells.add(id);
        }
      }
      expect(meta.anims.idle?.loop).toBe(true);
      expect(meta.anims.run?.loop).toBe(true);
      expect(meta.anims.death?.loop).toBe(false);
    }
  });

  it('wraps a long animation onto the next rows', () => {
    const meta = figureMeta('unmaker');
    const death = meta?.anims.death;
    if (meta === undefined || death === undefined) throw new Error('unmaker');
    expect(death.n).toBeGreaterThan(meta.cols);
    expect(frameCell(meta, death, 0)).toEqual([0, death.row]);
    expect(frameCell(meta, death, meta.cols)).toEqual([0, death.row + 1]);
  });
});

describe('creatureRole', () => {
  const melee = { range: RANGE.melee + 5 };

  it('draws a boss as the boss and anything that attacks from afar as the ranged creature', () => {
    expect(creatureRole({ id: 'e1_0_0', range: RANGE.melee, isBoss: true })).toBe('boss');
    expect(creatureRole({ id: 'e1_0_1', range: RANGE.ranged + 10 })).toBe('ranged');
    expect(creatureRole({ id: 'e1_0_2', range: RANGE.melee, enemyMagic: true })).toBe('ranged');
    expect(creatureRole({ id: 'e1_0_3', range: RANGE.ranged, isBoss: true })).toBe('boss');
  });

  it('maps every enemy kind of the simulation to a role', () => {
    for (const kind of ENEMY_KINDS) {
      const role = creatureRole({ id: 'e5_10_0', range: kind.range, enemyMagic: kind.magic });
      if (kind.style === 'melee') expect(['melee', 'beast']).toContain(role);
      else expect(role).toBe('ranged');
    }
  });

  it('alternates melee enemies between the melee creature and the beast, stably by id', () => {
    const seen = { melee: 0, beast: 0 };
    for (let i = 0; i < 200; i++) {
      const id = `e7_${i * 13}_${i % 8}`;
      const role = creatureRole({ id, ...melee });
      expect(role).toBe(creatureRole({ id, ...melee })); // the same enemy is always the same creature
      if (role === 'melee' || role === 'beast') seen[role] += 1;
    }
    expect(seen.melee + seen.beast).toBe(200);
    expect(seen.melee).toBeGreaterThan(60);
    expect(seen.beast).toBeGreaterThan(60);
  });
});

describe('enemyRank', () => {
  it('tells bosses by the stage they are fought on and elites by their flag', () => {
    expect(enemyRank({}, false)).toBe('normal');
    expect(enemyRank({ isElite: true }, false)).toBe('elite');
    expect(enemyRank({ isBoss: true }, false)).toBe('stageBoss');
    expect(enemyRank({ isBoss: true }, true)).toBe('worldBoss');
    expect(enemyRank({ isElite: true }, true)).toBe('elite');
  });
});
