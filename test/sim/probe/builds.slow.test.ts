import { describe, expect, it } from 'vitest';
import { sanitizeTalents, learnedAbilityNodes, spentPoints } from '@/sim/talentRules';
import { CLASS_KEYS } from '@/data/classes';
import { allBuilds, buildTalents, fieldedAbilities } from './builds';
import { runProbe, DEFAULT_CONFIG } from './loop';

// The probe's long checks (the slow tier: `npm run test:slow`).
describe('probe builds and runs', () => {
  it('every build of every class, at every level, is a talent map the tree accepts', () => {
    for (const c of CLASS_KEYS) {
      for (const level of [1, 10, 25, 45, 75, 120]) {
        for (const b of allBuilds(c)) {
          const t = buildTalents(c, level, b);
          const clean = sanitizeTalents(c, t, level, b.abilities);
          expect(clean.talents).toEqual(t);
          expect(spentPoints(t)).toBeLessThanOrEqual(level);
          const learned = learnedAbilityNodes(c, t).map((n) => n.key).sort();
          expect(learned).toEqual(fieldedAbilities(c, level, b).filter((k) => (t[k] ?? 0) > 0).sort());
          expect(learned.length).toBeLessThanOrEqual(2);
        }
      }
    }
  });

  it('a run is the same for the same seed with the run seed dealing the affixes', () => {
    const a = runProbe(3, { ...DEFAULT_CONFIG, stopAtStage: 10 });
    const b = runProbe(3, { ...DEFAULT_CONFIG, stopAtStage: 10 });
    expect(a).toEqual(b);
  });
});
