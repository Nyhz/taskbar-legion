import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '@/state/store';
import { worldBossStageOf } from '@/data/difficulties';

// World-boss challenge keys: earned from stage-boss chests (keyed by the zone's X-10 global
// stage), consumed entering that world boss. Account state on the ProgressSlice — persisted,
// never in inventory.

describe('zone keys (world-boss challenge keys)', () => {
  beforeEach(() => useStore.setState({ zoneKeys: {} }));

  it('addZoneKeys accumulates per zone; zoneKeysFor reads by any stage in that zone', () => {
    const hell4Boss = worldBossStageOf(135); // Hell 4-5 → Hell 4-10 (140)
    const normal3Boss = worldBossStageOf(27); // Normal 3-7 → Normal 3-10 (30)
    expect(hell4Boss).toBe(140);
    expect(normal3Boss).toBe(30);

    useStore.getState().addZoneKeys({ [hell4Boss]: 2 });
    useStore.getState().addZoneKeys({ [hell4Boss]: 1, [normal3Boss]: 5 }); // merges
    // zoneKeysFor maps ANY stage in the zone to its world-boss bucket.
    expect(useStore.getState().zoneKeysFor(131)).toBe(3); // Hell 4-1 → same Hell 4 zone
    expect(useStore.getState().zoneKeysFor(140)).toBe(3); // the boss stage itself
    expect(useStore.getState().zoneKeysFor(25)).toBe(5); // Normal 3-5 → Normal 3 zone
    expect(useStore.getState().zoneKeysFor(145)).toBe(0); // Hell 5 → none
  });

  it('consumeZoneKey spends one and reports success; refuses (false) when empty', () => {
    const boss = worldBossStageOf(140);
    useStore.getState().addZoneKeys({ [boss]: 1 });
    expect(useStore.getState().consumeZoneKey(boss)).toBe(true);
    expect(useStore.getState().zoneKeysFor(140)).toBe(0);
    // Empty now → no spend, no negative count.
    expect(useStore.getState().consumeZoneKey(boss)).toBe(false);
    expect(useStore.getState().zoneKeysFor(140)).toBe(0);
  });

  it('keys for one zone never satisfy a different zone (world+difficulty scoped)', () => {
    useStore.getState().addZoneKeys({ [worldBossStageOf(135)]: 3 }); // Hell 4 keys
    // A Hell 5 boss (global 150) sees none — a key from Hell 4-5 only works for Hell 4-10.
    expect(useStore.getState().consumeZoneKey(150)).toBe(false);
    expect(useStore.getState().zoneKeysFor(135)).toBe(3); // Hell 4 untouched
  });
});
