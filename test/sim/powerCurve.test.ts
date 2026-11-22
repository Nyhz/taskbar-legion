// THE POWER CURVE (docs/redesign/POWER_CURVE.md): one curve, P(S), behind every number of power — and the enemies
// sized against the typical party of their zone, so gear and enemies cannot drift apart. These are the invariants:
// pure arithmetic over the reference party, no fight, so they hold for ANY tuning of the item formula.
import { describe, expect, it } from 'vitest';
import { abilityDpsAllowance, POWER_GROWTH, levelCurve, powerAt, stageAtLevel, wallAsk } from '@/data/power';
import { expectedLevel, mitigation, worldOf } from '@/data/stageScaling';
import { MAX_GLOBAL_STAGE } from '@/data/difficulties';
import { SLOT_KEYS } from '@/data/itemSlots';
import type { ItemTier } from '@/data/tiers';
import { tierWeightsAt } from '@/data/difficulties';
import { basicDamage, referenceParty, typicalHero, typicalItem } from '@/sim/reference';
import { gruntHp, stageBossHp, trashFrontHit, zoneBossHp, GRUNT_HITS, STAGE_BOSS_SECONDS, WAVE_FRONT_HITS_PER_SEC } from '@/sim/enemyScale';
import { buildHeroCombatant } from '@/sim/loadout';
import { liveStats } from '@/sim/liveStats';
import { TRASH_THREAT_PCT } from '@/data/stageScaling';
import { difficultyIndexOf } from '@/data/difficulties';

const STAGES = [1, 5, 10, 11, 37, 100, 101, 163, 250, 301, 377, 401, 455, 500];
const NAMES = ['Normal', 'Hell', 'Inferno', 'Eternal', 'Torment'];
const label = (w: number): string => `${NAMES[Math.floor((w - 1) / 10)] ?? '?'} ${((w - 1) % 10) + 1}`;

describe('the curve', () => {
  it('P grows the same share every stage, from 1 at 1-1', () => {
    expect(powerAt(1)).toBe(1);
    for (const S of [2, 50, 250, 499]) expect(powerAt(S + 1) / powerAt(S)).toBeCloseTo(POWER_GROWTH, 12);
  });

  it('a level is worth the stage it is expected at (the inverse of the level curve)', () => {
    for (const L of [1, 5, 20, 50, 88, 110]) expect(levelCurve(stageAtLevel(L))).toBeCloseTo(Math.max(1, L), 6);
    expect(stageAtLevel(120)).toBeGreaterThan(MAX_GLOBAL_STAGE); // the post-completion grind keeps growing
    for (let S = 1; S < MAX_GLOBAL_STAGE; S += 7) expect(expectedLevel(S + 7)).toBeGreaterThanOrEqual(expectedLevel(S));
  });
});

describe('the typical party of a zone', () => {
  it('grows with the zone at every stage: harder hits, more life', () => {
    for (let i = 1; i < STAGES.length; i++) {
      const a = referenceParty(STAGES[i - 1]!);
      const b = referenceParty(STAGES[i]!);
      expect(b.topHit, `stage ${STAGES[i]}`).toBeGreaterThan(a.topHit);
      expect(b.knightLife, `stage ${STAGES[i]}`).toBeGreaterThan(a.knightLife);
    }
  });

  it('its Knight turns away about half a hit at every stage (on-level defence follows the curve)', () => {
    for (const S of STAGES) {
      const r = referenceParty(S);
      const m = mitigation(r.knightArmor, S);
      expect(m, `stage ${S}`).toBeGreaterThan(0.4);
      expect(m, `stage ${S}`).toBeLessThan(0.6);
    }
  });
});

describe('enemies are sized to the typical party', () => {
  it('a grunt takes GRUNT_HITS of the typical hardest hitter, a stage boss STAGE_BOSS_SECONDS of the party', () => {
    for (const S of STAGES) {
      const r = referenceParty(S);
      expect(gruntHp(S) / r.topHit).toBeCloseTo(GRUNT_HITS, 9);
      expect(stageBossHp(S) / r.partyDps).toBeCloseTo(STAGE_BOSS_SECONDS, 9);
    }
  });

  it('a better-geared hero kills the same grunt in fewer hits; a worse one in more', () => {
    const S = 250;
    const grunt = gruntHp(S);
    const hitsWith = (tier: ItemTier, quality: number, ilvl: number): number => {
      const h = typicalHero('ranger', S);
      for (const slot of SLOT_KEYS) h.equipment[slot] = typicalItem(slot, 'ranger', Math.max(tier, 1) as ItemTier, ilvl, quality);
      return grunt / basicDamage('ranger', liveStats(buildHeroCombatant(h, []))).hit;
    };
    const typical = hitsWith(4, 0.5, S - 3);
    expect(hitsWith(6, 0.9, S + 5)).toBeLessThan(typical * 0.75);
    expect(hitsWith(2, 0.2, S - 20)).toBeGreaterThan(typical * 1.25);
  });

  it('a wave takes its difficulty\'s share of the typical Knight\'s effective life a second', () => {
    for (const S of STAGES) {
      const pct = TRASH_THREAT_PCT[difficultyIndexOf(S)] ?? 0;
      expect((trashFrontHit(S) * WAVE_FRONT_HITS_PER_SEC) / referenceParty(S).knightEhp).toBeCloseTo(pct / 100, 9);
    }
  });
});

describe('the walls (the ladder: user, 2026-11-21 — «el primer boss 100 de vida, el segundo 120, luego 140…»)', () => {
  it('every world boss has more life than the one before, seams included, never leaping (×2 in Normal, while a new game fills its slots and its first rarities; ×1.6 after)', () => {
    const dips: string[] = [];
    for (let w = 2; w <= 50; w++) {
      const step = zoneBossHp(w * 10) / zoneBossHp((w - 1) * 10);
      if (!(step > 1) || step > (w <= 10 ? 2 : 1.6)) dips.push(`${label(w)} ×${step.toFixed(2)}`);
    }
    expect(dips).toEqual([]);
  });

  it('what a wall asks rises world after world, and the best gear its zone drops always clears it', () => {
    const top = (S: number): number => {
      let t = 0;
      tierWeightsAt(S).forEach((x, i) => { if (x > 0) t = i; });
      return t;
    };
    for (let w = 2; w <= 50; w++) expect(wallAsk(w)).toBeGreaterThan(wallAsk(w - 1));
    for (const w of [1, 10, 25, 40, 50]) {
      const S = w * 10;
      let best = 0;
      for (const c of ['knight', 'ranger', 'priest']) {
        const h = typicalHero(c, S);
        for (const slot of SLOT_KEYS) h.equipment[slot] = typicalItem(slot, c, Math.max(top(S), 1) as ItemTier, S + 10, 0.9); // the zone's top rarity, good rolls, its aspirational levels
        best += basicDamage(c, liveStats(buildHeroCombatant(h, []))).dps;
      }
      const typical = referenceParty(S).partyDps / abilityDpsAllowance(levelCurve(S));
      expect(best / typical, `world ${w}`).toBeGreaterThan(wallAsk(worldOf(S)) * 1.1);
    }
  });
});
