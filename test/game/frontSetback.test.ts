import { describe, expect, it } from 'vitest';
import { RANGE } from '@/data/field';
import { ENEMY_KINDS } from '@/data/enemies';
import { WORLDS } from '@/data/worlds';
import { figureMeta, frontSetback, heroFrontReach, type FigureMeta } from '@/game/render/figureData';

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

  it('a world boss with a figure of its own is drawn where the simulation has it: no setback', () => {
    // sim/stages.spawnZoneBoss gives a world boss a reach of RANGE.melee + 60, and that reach is what GameStrip
    // passes here. Its figure is drawn to stand at its root (its feet under it, its head over the hero who closes
    // in), so it must fit that reach untouched — a setback would pull the body away from where its blows land.
    const reach = RANGE.melee + 60;
    for (const world of WORLDS) {
      if (world.worldBoss === undefined) continue;
      const meta = figureMeta(world.worldBoss.key);
      expect(meta, world.worldBoss.key).toBeDefined();
      if (meta === undefined) continue;
      expect(meta.box[2] + heroFrontReach(), world.worldBoss.key).toBeLessThanOrEqual(reach);
      expect(frontSetback(meta, reach), world.worldBoss.key).toBe(0);
    }
  });
});
