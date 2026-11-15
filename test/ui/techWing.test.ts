import { existsSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { TECH_NODES, nodeCost, techNode } from '@/data/techTree';
import { AUTO_OPEN_FLOOR_MS, CHEST_CONFIG } from '@/data/chests';
import { setLanguage } from '@/i18n/core';
import { WING_ART_WIDTH, WING_MAX_ART_HEIGHT } from '@/ui/panels/panelLayout';
import {
  TECH_COLS,
  TECH_GRID_FITS,
  TECH_GROUP_ORDER,
  TECH_WING_ART,
  techGroupOf,
  techGroups,
  techRowCount,
} from '@/ui/panels/tech/techLayout';
import {
  clockText,
  figureText,
  goldText,
  percentText,
  techFigure,
  techState,
} from '@/ui/panels/tech/techFigures';

afterEach(() => setLanguage('en'));

describe('upgrades wing layout', () => {
  it('shows every upgrade of the data exactly once, in rows of three', () => {
    const shown = techGroups().flatMap((g) => g.nodes.map((n) => n.key));
    expect([...shown].sort()).toEqual(TECH_NODES.map((n) => n.key).sort());
    expect(new Set(shown).size).toBe(shown.length);
    for (const group of techGroups()) expect(TECH_GROUP_ORDER).toContain(group.key);
    expect(techRowCount()).toBe(Math.ceil(TECH_NODES.length / TECH_COLS));
  });

  it('splits the chests category into what drops them and where they are kept', () => {
    expect(techGroupOf(techNode('chest_drop_normal'))).toBe('drops');
    expect(techGroupOf(techNode('chest_gem'))).toBe('drops');
    expect(techGroupOf(techNode('store_zone'))).toBe('storage');
    expect(techGroupOf(techNode('eco_gold'))).toBe('economy');
    expect(techGroupOf(techNode('synth_luck'))).toBe('utility');
  });

  it('is exactly as wide as every wing and fits above the strip', () => {
    expect(TECH_GRID_FITS).toBe(true);
    expect(TECH_WING_ART.width).toBe(WING_ART_WIDTH);
    expect(TECH_WING_ART.height).toBeLessThanOrEqual(WING_MAX_ART_HEIGHT);
  });

  it('has a sign for every upgrade and every group', () => {
    const file = (stem: string): string => `src/assets/ui/${stem}.png`;
    for (const node of TECH_NODES) expect(existsSync(file(`tech_${node.key}`)), node.key).toBe(true);
    for (const stem of ['tech_cat_economy', 'tech_cat_drops', 'tech_cat_storage', 'tech_cat_utility']) {
      expect(existsSync(file(stem)), stem).toBe(true);
    }
    for (const stem of ['tech_seal_off', 'tech_seal_on', 'tech_seal_max', 'tech_done']) {
      expect(existsSync(file(stem)), stem).toBe(true);
    }
  });
});

describe('what an upgrade gives', () => {
  it('a rate bonus grows by its per-rank value', () => {
    expect(techFigure(techNode('eco_gold'), 0)).toEqual({ kind: 'gain', fraction: 0 });
    expect(figureText(techFigure(techNode('eco_gold'), 14))).toBe('+35%');
    expect(figureText(techFigure(techNode('chest_drop_normal'), 9))).toBe('+2.25%');
  });

  it('offline yield and the lucky synthesis are totals on top of their base', () => {
    expect(figureText(techFigure(techNode('eco_offline'), 0))).toBe('50%');
    expect(figureText(techFigure(techNode('eco_offline'), 20))).toBe('100%');
    expect(figureText(techFigure(techNode('synth_luck'), 0))).toBe('5%');
    expect(figureText(techFigure(techNode('synth_luck'), 20))).toBe('10%');
  });

  it('storage is the real capacity and recruitment the heroes that fight', () => {
    expect(techFigure(techNode('store_normal'), 5)).toEqual({
      kind: 'slots',
      count: CHEST_CONFIG.capacity.normal + 5,
    });
    expect(techFigure(techNode('party_size'), 2)).toEqual({ kind: 'heroes', count: 3 });
  });

  it('auto-open is locked until bought, then an interval that never drops under the floor', () => {
    const node = techNode('auto_open');
    expect(techFigure(node, 0)).toEqual({ kind: 'locked' });
    expect(figureText(techFigure(node, 0))).toBe('—');
    expect(figureText(techFigure(node, 1))).toBe('14:15');
    expect(techFigure(node, node.maxRanks)).toEqual({ kind: 'every', ms: AUTO_OPEN_FLOOR_MS });
    expect(techFigure(node, 99)).toEqual({ kind: 'every', ms: AUTO_OPEN_FLOOR_MS }); // past the cap: clamped
  });

  it('writes numbers the way the language does', () => {
    expect(percentText(0.275)).toBe('27.5%');
    expect(goldText(5906)).toBe('5.91K');
    setLanguage('es');
    expect(percentText(0.275)).toBe('27,5 %');
    expect(goldText(5906)).toBe('5,91K');
    expect(clockText(585_000)).toBe('9:45');
  });
});

describe('where an upgrade stands for a purse', () => {
  it('mirrors the store: affordable when the gold reaches the next rank, never past the cap', () => {
    const node = techNode('party_size'); // 1000, then 2500, two ranks
    expect(techState(node, 0, 999)).toMatchObject({ affordable: false, maxed: false, cost: 1000, short: 1 });
    expect(techState(node, 0, 1000)).toMatchObject({ affordable: true, short: 0 });
    expect(techState(node, 1, 1000)).toMatchObject({
      affordable: false,
      cost: nodeCost(node, 1),
      short: 1500,
    });
    expect(techState(node, 2, 1e9)).toMatchObject({ affordable: false, maxed: true, short: 0 });
  });
});
