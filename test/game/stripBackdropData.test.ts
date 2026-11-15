import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DIFFICULTY_KEYS } from '@/data/difficulties';
import {
  BACKDROP_GRADES,
  BACKDROP_KEYS,
  STRIP_ART_HEIGHT,
  STRIP_ART_WIDTH,
  STRIP_PATH_Y,
  backdropGradeFor,
  backdropKeyFor,
  backdropWorld,
  layerOffset,
  pixelLine,
  strikeLevel,
} from '@/game/render/stripBackdropData';

const STRIP = join(__dirname, '../../src/assets/strip');
const KINDS = ['lightning', 'particles', 'eyes', 'pulse', 'flicker'];

describe('the strip backdrops exported by the pipeline', () => {
  it('is the size of the strip, with the path the fighters stand on', () => {
    expect([STRIP_ART_WIDTH, STRIP_ART_HEIGHT, STRIP_PATH_Y]).toEqual([600, 160, 123]);
  });

  it('has ten worlds, each with a sheet per grade', () => {
    expect(BACKDROP_KEYS).toEqual(['w01', 'w02', 'w03', 'w04', 'w05', 'w06', 'w07', 'w08', 'w09', 'w10']);
    for (const key of BACKDROP_KEYS) {
      for (const grade of BACKDROP_GRADES) expect(existsSync(join(STRIP, `${key}_${grade}.png`)), `${key}_${grade}`).toBe(true);
    }
  });

  it('every world starts at a still sky, has a ground locked to the world and ends at a foreground', () => {
    for (const key of BACKDROP_KEYS) {
      const layers = backdropWorld(key)?.layers ?? [];
      expect(layers.length, key).toBeGreaterThanOrEqual(3);
      expect(layers[0], key).toMatchObject({ name: 'sky', factor: 0 });
      expect(layers.find((l) => l.name === 'ground')?.factor, key).toBe(1);
      const last = layers[layers.length - 1];
      expect(last?.name, key).toBe('fore');
      expect(last?.factor ?? 0, key).toBeGreaterThan(1);
      const factors = layers.map((l) => l.factor);
      expect([...factors].sort((a, b) => a - b), `${key}: nearer layers move faster`).toEqual(factors);
    }
  });

  it('only runs effects the game knows', () => {
    for (const key of BACKDROP_KEYS) {
      for (const grade of BACKDROP_GRADES) {
        for (const fx of backdropWorld(key)?.atmosphere[grade] ?? []) expect(KINDS, `${key}/${grade}`).toContain(fx.fx);
      }
    }
  });
});

describe('which art a stage shows', () => {
  it('maps the ten worlds of a difficulty to their art, wrapping anything out of range', () => {
    expect(backdropKeyFor(1)).toBe('w01');
    expect(backdropKeyFor(10)).toBe('w10');
    expect(backdropKeyFor(11)).toBe('w01');
    expect(backdropKeyFor(0)).toBe('w10');
    expect(backdropKeyFor(-3)).toBe('w07');
  });

  it('shows the torment grade in Torment only; the other difficulties borrow normal (provisional)', () => {
    expect(DIFFICULTY_KEYS.map(backdropGradeFor)).toEqual(['normal', 'normal', 'normal', 'normal', 'torment']);
  });
});

describe('how the layers move', () => {
  const sky = { name: 'sky', factor: 0, drift: false };
  const ground = { name: 'ground', factor: 1, drift: false };
  const fore = { name: 'fore', factor: 1.35, drift: false };
  const clouds = { name: 'clouds', factor: 0.05, drift: true };

  it('the sky stands still, the ground follows the camera, the foreground outruns it', () => {
    expect(layerOffset(sky, 250, 0)).toBe(0);
    expect(layerOffset(ground, 250, 0)).toBe(250);
    expect(layerOffset(fore, 200, 0)).toBe(270);
  });

  it('wraps into [0, width) — also left of the world origin, where the camera is negative', () => {
    expect(layerOffset(ground, 600, 0)).toBe(0);
    expect(layerOffset(ground, 1250, 0)).toBe(50);
    expect(layerOffset(ground, -10, 0)).toBe(590);
    for (const scroll of [-1234.5, -0.2, 0, 599.9, 98765.4]) {
      const off = layerOffset(fore, scroll, 0);
      expect(off).toBeGreaterThanOrEqual(0);
      expect(off).toBeLessThan(600);
      expect(Number.isInteger(off)).toBe(true);
    }
  });

  it('clouds and mist drift on their own, two pixels a second', () => {
    expect(layerOffset(clouds, 0, 10_000)).toBe(20);
    expect(layerOffset(ground, 0, 10_000)).toBe(0);
  });
});

describe('lightning and pixel lines', () => {
  it('a strike is a hard flash, a gap, a second flash that dies away', () => {
    expect(strikeLevel(-1)).toBe(0);
    expect(strikeLevel(0)).toBe(1);
    expect(strikeLevel(100)).toBe(0.2);
    expect(strikeLevel(150)).toBe(0.8);
    expect(strikeLevel(330)).toBeCloseTo(0.25);
    expect(strikeLevel(460)).toBe(0);
  });

  it('a pixel line joins its ends without gaps', () => {
    const line = pixelLine(0, 0, -3, 6);
    expect(line[0]).toEqual([0, 0]);
    expect(line[line.length - 1]).toEqual([-3, 6]);
    for (let i = 1; i < line.length; i++) {
      const [ax, ay] = line[i - 1] ?? [0, 0];
      const [bx, by] = line[i] ?? [0, 0];
      expect(Math.max(Math.abs(bx - ax), Math.abs(by - ay))).toBe(1);
    }
  });
});
