import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resumeStageFor } from '@/data/stageScaling';
import { WING_ART_WIDTH, WING_MAX_ART_HEIGHT } from '@/ui/panels/panelLayout';
import { MAP_WING_ART, bossGateOf, defaultWorld, nextOpenStage, stageStateOf, worldsOf } from '@/ui/panels/map/mapLayout';
import { worldArt } from '@/ui/panels/map/mapWorldNames';
import { tryWorldDef } from '@/data/worlds';

// Hell (difficulty 1) with worlds 1–5 cleared and 6-9 beaten: maxCleared 159, the frontier stays on 6-9 (the key
// gate), the party farming 6-4.
const MAX = 159;
const FRONTIER = resumeStageFor(MAX);
const HERE = 154;

describe('map wing — what it shows', () => {
  it('worlds behind the frontier are reached; the ones ahead are shown, locked', () => {
    const worlds = worldsOf(1, FRONTIER, MAX, HERE);
    expect(worlds).toHaveLength(10);
    expect(worlds.map((w) => w.reached)).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
    ]);
    expect(worlds.map((w) => w.cleared)).toEqual([
      true,
      true,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
    expect(worlds.filter((w) => w.here).map((w) => w.local)).toEqual([6]);
    expect(worlds[5]?.first).toBe(151);
  });

  it('ten marks per world: stages done, the one the party is on, and the boss last', () => {
    const worlds = worldsOf(1, FRONTIER, MAX, HERE);
    expect(worlds[0]?.pips).toEqual([...Array<string>(9).fill('done'), 'boss-done']);
    // World 6: every stage beaten, the party on 6-4, and the boss is the wall in front of it.
    expect(worlds[5]?.pips).toEqual([
      'done',
      'done',
      'done',
      'here',
      'done',
      'done',
      'done',
      'done',
      'done',
      'boss-wall',
    ]);
    expect(worlds[6]?.pips).toEqual([...Array<string>(9).fill('todo'), 'boss-todo']);
    // Mid-world (6-3 beaten): the boss is not the wall yet.
    expect(worldsOf(1, 154, 153, 154)[5]?.pips.at(-1)).toBe('boss-todo');
  });

  it('a lower difficulty that is finished shows every world cleared', () => {
    const worlds = worldsOf(0, FRONTIER, MAX, HERE);
    expect(worlds.every((w) => w.reached && w.cleared)).toBe(true);
    expect(worlds.some((w) => w.here)).toBe(false);
  });

  it('opens on the world the party is in, else the frontier, else the last of a finished difficulty', () => {
    expect(defaultWorld(1, HERE, FRONTIER)).toBe(6);
    expect(defaultWorld(1, 25, FRONTIER)).toBe(6); // the party travelled back to Normal 3-5: Hell opens on its frontier
    expect(defaultWorld(0, 25, FRONTIER)).toBe(3);
    expect(defaultWorld(0, HERE, FRONTIER)).toBe(10);
    expect(defaultWorld(0, 1, 1)).toBe(1); // a fresh game
  });

  it('stages: where the party stands, the frontier, reached, and still ahead', () => {
    expect(stageStateOf(154, FRONTIER, HERE)).toBe('here');
    expect(stageStateOf(159, FRONTIER, HERE)).toBe('frontier');
    expect(stageStateOf(151, FRONTIER, HERE)).toBe('open');
    expect(stageStateOf(155, 154, 152)).toBe('locked');
  });

  it('the boss door: shut until stage 9 falls, then it wants a key — also once the boss is beaten', () => {
    expect(bossGateOf(151, 157, 3)).toBe('closed'); // 6-8 beaten only
    expect(bossGateOf(151, 159, 0)).toBe('needKey');
    expect(bossGateOf(151, 159, 2)).toBe('open');
    expect(bossGateOf(141, 159, 1)).toBe('open'); // world 5, boss already beaten: a key still enters
    expect(bossGateOf(141, 159, 0)).toBe('needKey');
  });
});

describe('map wing — its box and its art', () => {
  it('is as wide as every wing and fits above the strip', () => {
    expect(MAP_WING_ART.width).toBe(WING_ART_WIDTH);
    expect(MAP_WING_ART.height).toBeLessThanOrEqual(WING_MAX_ART_HEIGHT);
  });

  it('every world has a name in data and its three pictures on disk', () => {
    const names = new Set<string>();
    for (let world = 1; world <= 10; world++) {
      names.add(tryWorldDef(world)?.name ?? '');
      for (const kind of ['day', 'night', 'boss'] as const) {
        expect(existsSync(`src/assets/ui/${worldArt(world, kind)}.png`), worldArt(world, kind)).toBe(true);
      }
    }
    expect(names.size).toBe(10);
    expect(names.has('')).toBe(false);
    expect(tryWorldDef(99)).toBeUndefined(); // out of range never throws
    expect(worldArt(0, 'day')).toBe('map_w01');
  });
});

describe('the arrow to the next stage (over the Retry sign)', () => {
  it('leads one stage on when that stage is already open', () => {
    // 1-8 was the frontier (1-7 beaten): a defeat dropped the party to 1-7.
    expect(nextOpenStage(7, resumeStageFor(7))).toBe(8);
    // Farming far behind the frontier: every step forward is open.
    expect(nextOpenStage(3, resumeStageFor(27))).toBe(4);
  });

  it('is not there at the frontier, nor past it', () => {
    expect(nextOpenStage(8, resumeStageFor(7))).toBeNull();
    expect(nextOpenStage(1, resumeStageFor(0))).toBeNull(); // a new game
  });

  it('never leads onto a world boss: stage 9 keeps its portal and its key', () => {
    expect(nextOpenStage(9, resumeStageFor(9))).toBeNull(); // 1-9 beaten, the gate
    expect(nextOpenStage(9, resumeStageFor(40))).toBeNull(); // even with the boss long dead
    expect(nextOpenStage(19, resumeStageFor(40))).toBeNull();
  });

  it('crosses into the next world from a boss stage that has fallen', () => {
    expect(nextOpenStage(10, resumeStageFor(40))).toBe(11);
  });
});
