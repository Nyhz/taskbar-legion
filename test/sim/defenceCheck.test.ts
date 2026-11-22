import { describe, it, expect } from 'vitest';
import { castReadyAbilities } from '@/sim/abilities';
import { bossKit } from '@/sim/bossMechanics';
import { crushParty } from '@/sim/worldBossRules';
import { steadyRoll, STEADY_START } from '@/sim/steady';
import { abilityDef } from '@/data/abilities';
import { CRUSH, WORLD_BOSS_PRESSURE, crushAt } from '@/data/bossKit';
import { globalStageOf } from '@/data/difficulties';
import { expectedDefense, mitigation } from '@/data/stageScaling';
import { crushHit, crushShock } from '@/sim/enemyScale';
import { referenceParty } from '@/sim/reference';
import { mixedMitigation } from '@/sim/damageMix';
import { liveStats } from '@/sim/liveStats';
import type { Combatant, CombatEvent } from '@/sim/world';
import { base, quietRng, unit } from './_kit';

// Round 7 (2026-11-16): defence that matters without luck — the Crushing Blow (data/bossKit CRUSH), the boss rules of
// the abilities (data/abilities `firesBoss`), the steady rolls (sim/steady) and a world boss's swings all on the front.

const hero = (id: string, over: Partial<Combatant> = {}): Combatant =>
  unit({ id, side: 'hero', hp: 1000, maxHp: 1000, baseStats: base({ health: 1000, attackDamage: 0, attackSpeed: 0.1 }), attackTimerMs: 1e12, ...over });


describe('steady rolls', () => {
  it('come up exactly as often as the chance says, evenly, without the rng', () => {
    const h = hero('h');
    const rolls = Array.from({ length: 40 }, () => steadyRoll(h, 'block', 25));
    expect(rolls.filter(Boolean)).toHaveLength(10);
    // Evenly: one in four, the first after half the wait (the meter starts half-way).
    expect(rolls.slice(0, 4)).toEqual([false, true, false, false]);
    expect(STEADY_START).toBe(50);
    expect(steadyRoll(hero('z'), 'healCrit', 0)).toBe(false);
    expect(steadyRoll(hero('a'), 'healCrit', 100)).toBe(true);
  });
});

describe('the Crushing Blow', () => {
  it('is a world boss\'s from Inferno on — eased in over the first worlds — and never a stage boss\'s', () => {
    expect(crushAt(globalStageOf(0, 5, 10)).tankLife).toBe(0);
    expect(crushAt(globalStageOf(1, 9, 10)).tankLife).toBe(0);
    // Round 10: held at Hell's (none) through Inferno 1–2, eased in over worlds 3–4, whole from world 5.
    expect(crushAt(globalStageOf(2, 2, 10)).tankLife).toBe(0);
    expect(crushAt(globalStageOf(2, 3, 10)).tankLife).toBeGreaterThan(0);
    expect(crushAt(globalStageOf(2, 3, 10)).tankLife).toBeLessThan(CRUSH.tankLife[2]);
    expect(crushAt(globalStageOf(2, 5, 10)).tankLife).toBe(CRUSH.tankLife[2]);
    const has = (S: number, rank: 'stage' | 'world'): boolean => bossKit(3, S, rank).abilities.some((a) => a.def.key === CRUSH.abilityKey);
    expect(has(globalStageOf(1, 5, 10), 'world')).toBe(false);
    expect(has(globalStageOf(3, 5, 10), 'world')).toBe(true);
    expect(has(globalStageOf(3, 5, 5), 'stage')).toBe(false);
    // It is the heavy one: the defences wait for it.
    expect(abilityDef(CRUSH.abilityKey).heavy).toBe(true);
  });

  it('strikes the front hero at the boss\'s own mix and everyone behind with a magic shock, through their defences', () => {
    const S = globalStageOf(3, 5, 10);
    const front = hero('front', { baseStats: base({ health: 1000, armor: 500, magicResist: 100 }) });
    const back = hero('back', { baseStats: base({ health: 1000, armor: 500, magicResist: 0 }) });
    const boss = unit({ id: 'boss', side: 'enemy', isBoss: true, magicShare: 0.4, crushHit: 800, crushShock: 600, fightMs: 0, enrageMs: Number.POSITIVE_INFINITY });
    const events: CombatEvent[] = [];
    crushParty(boss, [front, back], S, events);
    const fs = liveStats(front);
    expect(1000 - front.hp).toBeCloseTo(800 * (1 - mixedMitigation(fs.armor, fs.magicResist, 0.4, S)), 6);
    // The shock is all magic: the back hero's armour does nothing against it, and with no magic resist it lands whole.
    expect(1000 - back.hp).toBeCloseTo(600, 6);
    expect(events.filter((e) => e.abilityKey === CRUSH.abilityKey)).toHaveLength(2);
  });

  it('its anchors are the typical party of the zone: the Knight\'s effective life and the back line\'s life', () => {
    const S = globalStageOf(4, 5, 10);
    expect(crushHit(S, 1.5)).toBeCloseTo(1.5 * referenceParty(S).knightEhp, 6);
    // An opening wall sizes its blow on the previous world's Knight (round 14b).
    for (const d of [3, 4]) {
      const open = globalStageOf(d, 1, 10);
      expect(crushHit(open, 1.5)).toBeCloseTo(1.5 * referenceParty(open - 10).knightEhp, 6);
    }
    expect(crushHit(globalStageOf(3, 2, 10), 1.5)).toBeCloseTo(1.5 * referenceParty(globalStageOf(3, 2, 10)).knightEhp, 6); // world 2: its own
    // Sized against on-level magic resist: through it (half turned away) the shock takes backLife × mix of her life.
    expect(crushShock(S, 0.5, 1.2) * (1 - mitigation(expectedDefense(S), S))).toBeCloseTo(0.6 * referenceParty(S).backLife, 6);
  });
});

describe('a world boss swings at the front hero only', () => {
  it('sends none of its basic attacks behind, on any difficulty', () => {
    for (const p of WORLD_BOSS_PRESSURE) expect(p.backShotChance).toBe(0);
  });
});

describe('two triggers: one for the waves, one for the bosses', () => {
  const guard = abilityDef('knight_guard');
  /** The Knight with Stone Skin ready, just hit (his WAVE rule, selfHit, would fire), facing a boss that winds up
   *  `castKey` (or nothing): does he raise it? */
  function knightAgainst(castKey: string | undefined, heavyInKit: boolean): { cast: boolean } {
    const knight = hero('k', { classKey: 'knight', x: 240, range: 60, abilities: [{ def: guard, rank: 1 }], sinceHitMs: 0 });
    const kit = heavyInKit ? [{ def: abilityDef(CRUSH.abilityKey), rank: 1 }, { def: abilityDef('boss_shockwave'), rank: 1 }] : [{ def: abilityDef('boss_shockwave'), rank: 1 }];
    const boss = unit({
      id: 'boss', side: 'enemy', isBoss: true, x: 260, range: 400, hp: 1e6, maxHp: 1e6, engaged: true, abilities: kit,
      ...(castKey !== undefined ? { casting: { key: castKey, remainingMs: 1500, totalMs: 2000 } } : {}),
    });
    return { cast: castReadyAbilities(knight, [knight], [boss], globalStageOf(3, 5, 10), quietRng(), []).includes('knight_guard') };
  }

  it('Stone Skin is kept for the boss\'s heavy blow: not on being hit, not on the shockwave, yes on the Crushing Blow', () => {
    expect(knightAgainst(undefined, true).cast).toBe(false);
    expect(knightAgainst('boss_shockwave', true).cast).toBe(false);
    expect(knightAgainst(CRUSH.abilityKey, true).cast).toBe(true);
  });

  it('against a boss without a heavy blow, any blow\'s wind-up will do', () => {
    expect(knightAgainst('boss_shockwave', false).cast).toBe(true);
  });
});
