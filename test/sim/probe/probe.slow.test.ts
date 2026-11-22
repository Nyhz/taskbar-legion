import { describe, it, expect } from 'vitest';
import { partyPower } from './gear';
import { freshHero } from './economy';
import { runProbe, newProbeRun, advanceProbe, DEFAULT_CONFIG } from './loop';

// The probe's long real runs (the slow tier: `npm run test:slow`).
describe('probe runs', () => {
  it('a world boss is only attempted with a key, and the wait for it is part of the world', () => {
    const r = runProbe(3, { ...DEFAULT_CONFIG, stopAtStage: 10 });
    expect(r.completed).toBe(true);
    const w1 = r.milestones[0];
    expect(w1?.world).toBe(1);
    expect(w1?.firstKeyHours ?? -1).toBeGreaterThanOrEqual(0); // the first attempt needed a key too
    expect(w1?.keylessHours ?? -1).toBeGreaterThanOrEqual(w1?.firstKeyHours ?? 0); // every hour without a key is counted
    expect(w1?.hoursOnWorld ?? 0).toBeGreaterThan(w1?.firstKeyHours ?? 0);
    // A run that holds its keys (the wall tuner's mode) never attempts: it stays at the wall.
    const run = newProbeRun(3);
    advanceProbe(run, { ...DEFAULT_CONFIG, holdKeys: true, stopAtStage: 10, stopAtActiveSec: 6 * 3600 });
    expect(run.state.frontier).toBe(9);
    expect(run.attempts).toBe(0);
  });

  it('bootstraps a solo Knight off stage 1 and is deterministic', () => {
    // An hour of play is enough to see both (two whole days of it took ~9 minutes of test).
    const play = (): ReturnType<typeof newProbeRun> => {
      const run = newProbeRun(7);
      advanceProbe(run, { ...DEFAULT_CONFIG, stopAtActiveSec: 3600 });
      return run;
    };
    const a = play();
    const b = play();
    // Bootstrap: a naked solo Knight earned enough partial loot to push the frontier off 0.
    expect(a.state.frontier).toBeGreaterThan(0);
    expect(a.state.activeSec).toBeGreaterThan(0);
    // Determinism: same seed + config ⇒ identical run.
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
    expect(partyPower([freshHero('x', 'knight', 1)])).toBeGreaterThan(0);
  });
});
