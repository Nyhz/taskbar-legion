import { describe, it, expect } from 'vitest';
import { aggregate } from '@/sim/stats';

describe('aggregate', () => {
  it('flat stats: (base + Σflat) × (1 + Σpercent/100)', () => {
    const s = aggregate({ health: 100 }, [
      { key: 'health', mode: 'flat', value: 50 },
      { key: 'health', mode: 'percent', value: 10 },
    ]);
    expect(s.health).toBeCloseTo(165, 5); // (100+50)*1.1
  });

  it('percent SCALER stats sum as points regardless of mode', () => {
    const s = aggregate({ critDamage: 5 }, [
      { key: 'critDamage', mode: 'percent', value: 10 },
      { key: 'critDamage', mode: 'flat', value: 3 },
    ]);
    expect(s.critDamage).toBe(18); // scaler → raw sum, no cap
  });

  it('ENABLER stats are soft-capped (diminishing returns toward the cap, never over it)', () => {
    // critChance cap 100, k 60: raw 5+10+3 = 18 → 100·18/(18+60) = 23.08.
    const s = aggregate({ critChance: 5 }, [
      { key: 'critChance', mode: 'percent', value: 10 },
      { key: 'critChance', mode: 'flat', value: 3 },
    ]);
    expect(s.critChance).toBeCloseTo(23.08, 1);
    // however much raw you stack, it asymptotes below the cap.
    expect(aggregate({}, [{ key: 'critChance', mode: 'percent', value: 1_000_000 }]).critChance).toBeLessThan(100);
  });

  it('attackSpeed is a cadence scaled by percent points', () => {
    const s = aggregate({ attackSpeed: 0.8 }, [{ key: 'attackSpeed', mode: 'percent', value: 50 }]);
    expect(s.attackSpeed).toBeCloseTo(1.2, 5);
  });

  it('defaults attackSpeed to 1.0 when base missing', () => {
    expect(aggregate({}, []).attackSpeed).toBe(1.0);
  });
});
