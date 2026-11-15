import { describe, expect, it } from 'vitest';
import { CLASS_KEYS } from '@/data/classes';
import { talentNodes, talentTree } from '@/data/talents';
import { GUTTER, layoutTalentTree, nodeSize, spentBarFill } from '@/ui/panels/hero/talentsLayout';
import { TALENTS_WING_ART } from '@/ui/panels/hero/wingLayout';
import { WING_CONTENT_ART, WING_MAX_ART_HEIGHT } from '@/ui/panels/panelLayout';

describe('talents wing layout (vertical: a tier is a row)', () => {
  it("is exactly as wide as a wing's content, and places every node of every class once, inside the tree", () => {
    for (const classKey of CLASS_KEYS) {
      const layout = layoutTalentTree(talentTree(classKey));
      expect(layout.width).toBe(WING_CONTENT_ART);
      expect(layout.nodes.map((p) => p.node.key).sort()).toEqual(
        talentNodes(classKey)
          .map((n) => n.key)
          .sort(),
      );
      for (const p of layout.nodes) {
        const size = nodeSize(p.node);
        expect(p.x).toBeGreaterThanOrEqual(GUTTER); // the gutter belongs to the bar and the thresholds
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.x + size).toBeLessThanOrEqual(layout.width);
        expect(p.y + size).toBeLessThanOrEqual(layout.height);
        expect(Number.isInteger(p.x) && Number.isInteger(p.y), `${p.node.key} on whole pixels`).toBe(true);
      }
    }
  });

  it('no two nodes overlap, and a node stands in the row of its own tier', () => {
    for (const classKey of CLASS_KEYS) {
      const layout = layoutTalentTree(talentTree(classKey));
      const box = (p: (typeof layout.nodes)[number]): { x0: number; y0: number; x1: number; y1: number } => {
        const size = nodeSize(p.node);
        return { x0: p.x, y0: p.y, x1: p.x + size, y1: p.y + size };
      };
      layout.nodes.forEach((a, i) => {
        const tier = layout.tiers[a.tier];
        expect(tier).toBeDefined();
        expect(a.tier).toBe(a.node.rowIndex);
        if (tier !== undefined) {
          expect(a.y).toBeGreaterThanOrEqual(tier.y);
          expect(a.y + nodeSize(a.node)).toBeLessThanOrEqual(tier.y + tier.height);
        }
        layout.nodes.slice(i + 1).forEach((b) => {
          const A = box(a);
          const B = box(b);
          const apart = A.x1 <= B.x0 || B.x1 <= A.x0 || A.y1 <= B.y0 || B.y1 <= A.y0;
          expect(apart, `${a.node.key} / ${b.node.key}`).toBe(true);
        });
      });
    }
  });

  it('tiers run top to bottom without gaps, one row each', () => {
    for (const classKey of CLASS_KEYS) {
      const tree = talentTree(classKey);
      const layout = layoutTalentTree(tree);
      expect(layout.tiers).toHaveLength(tree.rows.length);
      let y = 0;
      for (const tier of layout.tiers) {
        expect(tier.y).toBe(y);
        y += tier.height;
      }
      expect(layout.height).toBe(y);
    }
  });

  it('the trunk reads ability → role talent → passives, left to right', () => {
    for (const classKey of CLASS_KEYS) {
      const layout = layoutTalentTree(talentTree(classKey));
      for (const tier of [0, 1, 2, 3]) {
        const row = layout.nodes.filter((p) => p.tier === tier).sort((a, b) => a.x - b.x);
        const order = (kind: string): number => ['ability', 'role', 'passive'].indexOf(kind);
        expect(row).toHaveLength(4);
        row.forEach((p, i) => {
          const prev = row[i - 1];
          if (prev !== undefined) expect(order(p.node.kind)).toBeGreaterThanOrEqual(order(prev.node.kind));
        });
      }
    }
  });

  it('from tier 5 each branch keeps its own half: the first on the left, the second on the right', () => {
    for (const classKey of CLASS_KEYS) {
      const tree = talentTree(classKey);
      const layout = layoutTalentTree(tree);
      const [left, right] = tree.branches;
      expect(left).toBeDefined();
      expect(right).toBeDefined();
      const middle = GUTTER + (layout.width - GUTTER) / 2;
      for (const p of layout.nodes.filter((q) => q.tier >= 4)) {
        const size = nodeSize(p.node);
        if (p.node.lane === left?.key) expect(p.x + size, p.node.key).toBeLessThanOrEqual(middle);
        else {
          expect(p.node.lane).toBe(right?.key);
          expect(p.x, p.node.key).toBeGreaterThanOrEqual(middle);
        }
      }
    }
  });

  it('the wing with the whole tree fits the height every wing must fit', () => {
    expect(TALENTS_WING_ART.height).toBeLessThanOrEqual(WING_MAX_ART_HEIGHT);
  });

  it('the bar reaches a tier exactly when the tier opens, and its end at the point cap', () => {
    const layout = layoutTalentTree(talentTree('knight'));
    for (const t of layout.tiers) expect(spentBarFill(t.need, layout, 120)).toBeCloseTo(t.y, 6);
    expect(spentBarFill(0, layout, 120)).toBe(0);
    expect(spentBarFill(120, layout, 120)).toBeCloseTo(layout.height, 6);
    expect(spentBarFill(500, layout, 120)).toBe(layout.height);
    expect(spentBarFill(-4, layout, 120)).toBe(0);
    // Monotonic: more points never move the bar back.
    let prev = -1;
    for (let s = 0; s <= 120; s++) {
      const y = spentBarFill(s, layout, 120);
      expect(y).toBeGreaterThanOrEqual(prev);
      prev = y;
    }
  });
});
