import { describe, expect, it } from 'vitest';
import { RANGE } from '@/data/field';
import { ENEMY_KINDS } from '@/data/enemies';
import { WORLDS } from '@/data/worlds';
import { BOSS_FRONT_GAP, bossSetback, figureMeta, frontSetback, heroFrontReach, type FigureMeta } from '@/game/render/figureData';

// A melee enemy's place in the fight is fixed by the simulation; its ART is set back when its body would
// otherwise be drawn over the hero it fights.

const MELEE_REACH = Math.min(...ENEMY_KINDS.filter((k) => k.style === 'melee').map((k) => k.range));
const figure = (front: number): FigureMeta => ({ w: 96, h: 70, cols: 4, root: 40, ground: 64, box: [-10, -40, front, 1], anims: {} });

describe('frontSetback', () => {
  it('knows how far the heroes reach in front of their root', () => {
    expect(heroFrontReach()).toBeGreaterThan(0);
    expect(heroFrontReach()).toBeLessThan(RANGE.melee);
  });

  it('leaves a figure that fits where the simulation has it', () => {
    const room = MELEE_REACH - heroFrontReach();
    expect(frontSetback(figure(room), MELEE_REACH)).toBe(0);
    expect(frontSetback(figure(room - 12), MELEE_REACH)).toBe(0);
  });

  it('sets a figure back by exactly what its front overshoots', () => {
    const room = MELEE_REACH - heroFrontReach();
    expect(frontSetback(figure(room + 1), MELEE_REACH)).toBe(1);
    expect(frontSetback(figure(room + 57), MELEE_REACH)).toBe(57);
  });

  it('never moves a figure forward, whatever the reach', () => {
    expect(frontSetback(figure(5), 0)).toBe(5); // no room at all: its whole front goes back
    expect(frontSetback(figure(5), 500)).toBe(0);
  });

  it('keeps every creature of every world off the hero: its front edge stops at the hero’s', () => {
    const moved: string[] = [];
    for (const world of WORLDS) {
      for (const creature of Object.values(world.creatures)) {
        const meta = figureMeta(creature.key);
        expect(meta, creature.key).toBeDefined();
        if (meta === undefined) continue;
        const back = frontSetback(meta, MELEE_REACH);
        expect(back, creature.key).toBeGreaterThanOrEqual(0);
        // what is left in front of its place in the fight fits in the gap the hero leaves
        expect(meta.box[2] - back + heroFrontReach(), creature.key).toBeLessThanOrEqual(MELEE_REACH);
        if (back > 0) moved.push(creature.key);
      }
    }
    // The figure this exists for: the Forge Wyrm (mostly head and jaws). (The Unmaker's wings needed it too while
    // he was world 10's stage boss; he is its world boss now, covered by the no-setback test below.)
    expect(moved).toContain('magmawyrm');
  });

  it('every boss — world or stage — stands clear of the front hero, by a gap that grows with its figure', () => {
    // User, 2026-11-16: «aumentar el box de los bosses para que no se peguen tanto visualmente». The Knight closes to
    // his own melee reach to swing at a boss (sim/combat), whatever the boss's longer reach: the art is set back from
    // there, so the boss's front edge stops BOSS_FRONT_GAP of its height short of his — presentation only.
    const figures = new Set<string>();
    for (const world of WORLDS) {
      if (world.worldBoss !== undefined) figures.add(world.worldBoss.key);
      for (const creature of Object.values(world.creatures)) if (creature.role === 'boss') figures.add(creature.key);
    }
    expect(figures.size).toBeGreaterThan(10);
    for (const key of figures) {
      const meta = figureMeta(key);
      expect(meta, key).toBeDefined();
      if (meta === undefined) continue;
      const back = bossSetback(meta);
      expect(back, key).toBeGreaterThanOrEqual(0);
      const clear = RANGE.melee - heroFrontReach() - (meta.box[2] - back); // ground between the two front edges
      expect(clear, key).toBeGreaterThanOrEqual(BOSS_FRONT_GAP.min);
      expect(clear, key).toBeLessThanOrEqual(Math.max(BOSS_FRONT_GAP.max, RANGE.melee - heroFrontReach() - meta.box[2]));
    }
  });

  it('a bigger boss leaves a wider gap, within its bounds', () => {
    const at = (height: number): number => {
      const meta: FigureMeta = { w: 200, h: 200, cols: 1, root: 100, ground: 190, box: [-60, -height, 200, 1], anims: {} };
      return RANGE.melee - heroFrontReach() - (meta.box[2] - bossSetback(meta));
    };
    expect(at(40)).toBe(BOSS_FRONT_GAP.min);
    expect(at(120)).toBe(12);
    expect(at(400)).toBe(BOSS_FRONT_GAP.max);
  });
});
