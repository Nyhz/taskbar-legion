import { describe, expect, it } from 'vitest';
import { CLASS_KEYS } from '@/data/classes';
import { talentNodes, talentTree } from '@/data/talents';
import { EITHER, GUTTER, HEAD_ROW, HEAD_SIGN, layoutTalentTree, nodeSize, spentBarFill } from '@/ui/panels/hero/talentsLayout';
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

  it('tiers run top to bottom, one row each, with the branch heads in a row of their own under the trunk', () => {
    for (const classKey of CLASS_KEYS) {
      const tree = talentTree(classKey);
      const layout = layoutTalentTree(tree);
      expect(layout.tiers).toHaveLength(tree.rows.length);
      let y = 0;
      layout.tiers.forEach((tier, i) => {
        if (i === 4) y += HEAD_ROW; // tier 5 is the first of the branches
        expect(tier.y).toBe(y);
        y += tier.height;
      });
      expect(layout.height).toBe(y);
    }
  });

  it('each branch has a head centred on its lane, between the trunk and its first tier', () => {
    for (const classKey of CLASS_KEYS) {
      const tree = talentTree(classKey);
      const layout = layoutTalentTree(tree);
      expect(layout.heads.map((h) => h.branch.key)).toEqual(tree.branches.map((b) => b.key));
      const trunkEnd = Math.max(...layout.nodes.filter((p) => p.tier < 4).map((p) => p.y + nodeSize(p.node)));
      const branchTop = layout.tiers[4]?.y ?? 0;
      layout.heads.forEach((head, i) => {
        expect(head.laneX).toBe(GUTTER + i * head.laneWidth);
        expect(head.x + HEAD_SIGN / 2).toBe(head.laneX + head.laneWidth / 2);
        expect(head.y).toBeGreaterThanOrEqual(trunkEnd - 1); // it may stand on the pips' line, never on a node
        expect(head.y + HEAD_SIGN).toBeLessThanOrEqual(branchTop + 1); // its last row is the sign's empty margin
        // The sign stands in the gap between the two trunk nodes above it and the two branch nodes under it.
        for (const p of layout.nodes.filter((q) => q.node.lane === head.branch.key)) {
          const size = nodeSize(p.node);
          const overlaps = p.x < head.x + HEAD_SIGN - 1 && head.x + 1 < p.x + size && p.y < head.y + HEAD_SIGN - 1 && head.y + 1 < p.y + size;
          expect(overlaps, p.node.key).toBe(false);
        }
      });
    }
  });

  it('a spine runs down the middle of each lane from its head to its capstone, between the nodes', () => {
    for (const classKey of CLASS_KEYS) {
      const layout = layoutTalentTree(talentTree(classKey));
      expect(layout.spines).toHaveLength(2);
      for (const spine of layout.spines) {
        const cap = layout.nodes.find((p) => p.node.lane === spine.branchKey && p.node.kind === 'capstone');
        expect(cap).toBeDefined();
        if (cap === undefined) continue;
        expect(spine.y + spine.height).toBe(cap.y); // it ends on the capstone
        expect(spine.x).toBeGreaterThan(cap.x);
        expect(spine.x).toBeLessThan(cap.x + nodeSize(cap.node));
        // No other node of the lane sits on the spine.
        for (const p of layout.nodes.filter((q) => q.node.lane === spine.branchKey && q !== cap)) {
          expect(spine.x < p.x || spine.x >= p.x + nodeSize(p.node), p.node.key).toBe(true);
        }
      }
    }
  });

  it('every "choose one" pair is linked: a branch’s two modifiers and the two capstones', () => {
    for (const classKey of CLASS_KEYS) {
      const layout = layoutTalentTree(talentTree(classKey));
      const groups = new Set(talentNodes(classKey).flatMap((n) => (n.chooseGroup === undefined ? [] : [n.chooseGroup])));
      expect(layout.links.map((l) => l.group).sort()).toEqual([...groups].sort());
      expect(layout.links).toHaveLength(3);
      for (const link of layout.links) {
        const [a, b] = link.keys.map((key) => layout.nodes.find((p) => p.node.key === key));
        expect(a).toBeDefined();
        expect(b).toBeDefined();
        if (a === undefined || b === undefined) continue;
        expect(a.node.chooseGroup).toBe(link.group);
        expect(b.node.chooseGroup).toBe(link.group);
        expect(link.x).toBe(a.x + nodeSize(a.node)); // from the left node's edge…
        expect(link.x + link.width).toBe(b.x); // …to the right node's
        expect(link.width).toBeGreaterThanOrEqual(EITHER); // room for the diamond
        expect(link.y).toBeGreaterThan(a.y);
        expect(link.y).toBeLessThan(a.y + nodeSize(a.node));
      }
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
