import { describe, it, expect } from 'vitest';
import { createWorld, Simulation, type TickContext } from '@/sim/Simulation';
import { getBonuses } from '@/sim/bonuses';
import { bossKit } from '@/sim/bossMechanics';
import { WORLD_BOSS_PRESSURE, worldBossPressure } from '@/data/bossKit';
import { globalStageOf } from '@/data/difficulties';
import type { Combatant } from '@/sim/world';
import { base, unit } from './_kit';

// World-boss pressure (data/bossKit WORLD_BOSS_PRESSURE): during its minute a world boss hits harder, blows more
// often and wider, and aims part of its basic attacks behind the front hero — by difficulty. Normal is unchanged.

const hero = (id: string, x: number, reach: number): Combatant =>
  unit({ id, side: 'hero', x, range: reach, hp: 1e9, maxHp: 1e9, baseStats: base({ health: 1e9, attackDamage: 0, attackSpeed: 0.1 }), attackTimerMs: 1e12 });

/** A world-boss fight at stage S with an unkillable, harmless party: what the boss's hits land on. */
function fight(S: number, seconds: number): { blowsFront: number; blowsBehind: number; basicFront: number; basicBehind: number; boss?: Combatant } {
  const w = createWorld(7, [hero('tank', 240, 60), hero('archer', 130, 170), hero('priest', 95, 205)]);
  w.maxClearedStage = S - 1;
  w.globalStageIndex = S - 1;
  const sim = new Simulation(w);
  expect(sim.enterZoneBoss(Math.ceil(S / 10))).toBe(true);
  const ctx: TickContext = { bonuses: getBonuses({}, {}), ownedPetKeys: [], retryStage: true };
  const out = { blowsFront: 0, blowsBehind: 0, basicFront: 0, basicBehind: 0, boss: undefined as Combatant | undefined };
  for (let t = 0; t < seconds * 10; t++) {
    for (const ev of sim.tick(ctx)) {
      if (ev.type !== 'damage') continue;
      const boss = w.enemies.find((e) => e.isBoss === true);
      if (boss === undefined || ev.sourceId !== boss.id) continue;
      out.boss = boss;
      const front = ev.targetId === 'tank';
      if (ev.abilityKey === 'boss_shockwave') {
        if (front) out.blowsFront++;
        else out.blowsBehind++;
      } else if (ev.abilityKey === undefined) {
        if (front) out.basicFront++;
        else out.basicBehind++;
      }
    }
  }
  return out;
}

describe('world-boss pressure', () => {
  it('Normal is the world boss as it was: its blow every 10 s at 1.2 / 0.6, every basic attack on the front hero', () => {
    const p = worldBossPressure(0);
    expect(p).toEqual({ hitMult: 1, blowEveryMs: 10_000, blowCoeff: 1.2, splashCoeff: 0.6, backShotChance: 0, woundPct: 0 });
    const blow = bossKit(1, globalStageOf(0, 3, 10), 'world').abilities.find((a) => a.def.key === 'boss_shockwave');
    expect(blow?.def.cooldownMs).toBe(10_000);
    expect(blow?.def.power?.splashCoeff).toBe(0.6);
    const f = fight(globalStageOf(0, 3, 10), 40);
    expect(f.basicBehind).toBe(0);
    expect(f.basicFront).toBeGreaterThan(5);
  });

  it('each difficulty\'s blow comes as often and as wide as its row says, Sísmico still faster', () => {
    for (let d = 1; d < WORLD_BOSS_PRESSURE.length; d++) {
      const p = worldBossPressure(d);
      for (let seed = 1; seed <= 40; seed++) {
        const kit = bossKit(seed, globalStageOf(d, 2, 10), 'world');
        const blow = kit.abilities.find((a) => a.def.key === 'boss_shockwave')?.def;
        expect(blow?.power?.coeff).toBe(p.blowCoeff);
        expect(blow?.power?.splashCoeff).toBe(p.splashCoeff);
        expect(blow?.cooldownMs).toBe(kit.affixes.includes('seismic') ? Math.min(p.blowEveryMs, 6000) : p.blowEveryMs);
      }
    }
  });

  it('from Hell, part of its basic attacks land behind the front hero, and its hits carry the hit multiplier', () => {
    const S = globalStageOf(1, 3, 10);
    const f = fight(S, 60);
    const share = f.basicBehind / Math.max(1, f.basicFront + f.basicBehind);
    expect(share).toBeGreaterThan(worldBossPressure(1).backShotChance - 0.15);
    expect(share).toBeLessThan(worldBossPressure(1).backShotChance + 0.15);
    expect(f.blowsBehind).toBeGreaterThan(0);
    const row = WORLD_BOSS_PRESSURE[1] as { hitMult: number };
    const before = row.hitMult;
    const dmg = (): number => {
      const w = createWorld(7, [hero('tank', 240, 60)]);
      w.maxClearedStage = S - 1;
      w.globalStageIndex = S - 1;
      const sim = new Simulation(w);
      sim.enterZoneBoss(Math.ceil(S / 10));
      sim.tick({ bonuses: getBonuses({}, {}), ownedPetKeys: [], retryStage: true });
      return w.enemies.find((e) => e.isBoss === true)?.enemyDamage ?? 0;
    };
    try {
      row.hitMult = 1;
      const one = dmg();
      row.hitMult = 2;
      expect(dmg()).toBeCloseTo(2 * one, 6);
    } finally {
      row.hitMult = before;
    }
  });
});

describe('option A: the first clear of an X-9 hands over a key', () => {
  it('a first clear of W-9 puts one key of that world in pending; a re-clear does not', () => {
    const w = createWorld(3, [hero('tank', 240, 60)]);
    const S = globalStageOf(1, 4, 9);
    w.globalStageIndex = S;
    w.maxClearedStage = S - 1;
    w.phase = 'boss';
    w.enemies = [];
    const sim = new Simulation(w);
    const clear = (sim as unknown as { handleClear: (offline?: boolean, first?: boolean) => void }).handleClear.bind(sim);
    clear(false);
    expect(w.pending.keys[S + 1]).toBe(1);
    w.pending.keys = {};
    w.phase = 'boss';
    clear(false);
    expect(w.pending.keys[S + 1]).toBeUndefined();
  });
});

describe('Rend (wired, off by default)', () => {
  it('with a woundPct, a world boss\'s area blow leaves a stack of Rend on each hero it reaches; off, none', () => {
    const S = globalStageOf(1, 3, 10);
    const row = WORLD_BOSS_PRESSURE[1] as { woundPct: number };
    const before = row.woundPct;
    try {
      expect(before).toBe(0);
      // a full fight: count the heroes carrying Rend at the end
      const count = (pct: number): number => {
        row.woundPct = pct;
        const w = createWorld(7, [hero('tank', 240, 60), hero('archer', 130, 170), hero('priest', 95, 205)]);
        w.maxClearedStage = S - 1;
        w.globalStageIndex = S - 1;
        const sim = new Simulation(w);
        sim.enterZoneBoss(Math.ceil(S / 10));
        for (let t = 0; t < 200; t++) sim.tick({ bonuses: getBonuses({}, {}), ownedPetKeys: [], retryStage: true });
        return w.heroes.filter((h) => h.effects.some((e) => e.defKey === 'debuff_rend')).length;
      };
      expect(count(0)).toBe(0);
      expect(count(1)).toBe(3);
    } finally {
      row.woundPct = before;
    }
  });
});
