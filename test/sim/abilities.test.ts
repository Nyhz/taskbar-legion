import { describe, it, expect } from 'vitest';
import { castReadyAbilities, tickCooldowns } from '@/sim/abilities';
import { applyEffect, absorbDamage } from '@/sim/effects';
import { effectDef } from '@/data/effects';
import { abilityDef, ABILITIES } from '@/data/abilities';
import { partyAuraMods, heroBaseStats, heroStaticMods, type HeroConfig } from '@/sim/loadout';
import { aggregate } from '@/sim/stats';
import type { Combatant, CombatEvent } from '@/sim/world';
import { makeRng } from '@/sim/rng';
import type { StatKey } from '@/data/stats';

// The TALENTS.md ability mechanics: power-scaled instant damage/heal, shields.

function unit(over: Partial<Combatant> & { id: string; side: 'hero' | 'enemy' }): Combatant {
  return {
    classKey: 'knight', hp: 1000, maxHp: 1000, baseStats: {}, staticMods: [], effects: [],
    cooldowns: {}, attackTimerMs: 0, x: 0, range: 30, moveSpeed: 0, abilities: [], alive: true,
    ...over,
  };
}
const base = (s: Partial<Record<StatKey, number>>): Partial<Record<StatKey, number>> => s;

describe('ability mechanics', () => {
  it('instant damage scales with attackDamage×(1+dmgInc), drains enemy HP', () => {
    const caster = unit({
      id: 'm', side: 'hero',
      baseStats: base({ attackDamage: 100, damageIncrease: 0, critChance: 0 }),
      abilities: [{ def: abilityDef('ranger_aimedshot'), rank: 1 }], // coeff 1.8, no crit
    });
    caster.charges = { ranger_aimedshot: 10 }; // charge-gated — bank it full so it fires
    const enemy = unit({ id: 'e', side: 'enemy', hp: 1000, maxHp: 1000 });
    const events: CombatEvent[] = [];
    castReadyAbilities(caster, [caster], [enemy], 1, makeRng(1), events);
    const dmg = events.find((e) => e.type === 'damage');
    expect(dmg?.amount).toBeCloseTo(180, 1); // 1.8 × 100
    expect(enemy.hp).toBeCloseTo(820, 1);
  });

  it('Explosive Arrow hits the front enemy hard and splashes only nearby enemies (45px radius)', () => {
    const caster = unit({
      id: 'r', side: 'hero',
      baseStats: base({ attackDamage: 100, critChance: 0 }),
      abilities: [{ def: abilityDef('ranger_focus'), rank: 1 }], // 1.6× front, 0.6× splash, r=45
    });
    const front = unit({ id: 'e1', side: 'enemy', x: 10, hp: 1000, maxHp: 1000 });
    const near = unit({ id: 'e2', side: 'enemy', x: 40, hp: 1000, maxHp: 1000 }); // Δ30 ≤ 45 → splashed
    const far = unit({ id: 'e3', side: 'enemy', x: 200, hp: 1000, maxHp: 1000 }); // Δ190 > 45 → spared
    castReadyAbilities(caster, [caster], [front, near, far], 1, makeRng(1), []);
    expect(front.hp).toBeCloseTo(840, 1); // 1000 − 1.6×100
    expect(near.hp).toBeCloseTo(940, 1); // 1000 − splash 0.6×100
    expect(far.hp).toBe(1000); // outside the blast radius — untouched
  });

  it('Caltrops lays a damage-over-time on every enemy in the wave', () => {
    const caster = unit({
      id: 'r', side: 'hero',
      baseStats: base({ attackDamage: 100 }),
      abilities: [{ def: abilityDef('ranger_frozentrap'), rank: 1 }], // 0.6× AD total over 5s
    });
    const e1 = unit({ id: 'e1', side: 'enemy', x: 10 });
    const e2 = unit({ id: 'e2', side: 'enemy', x: 20 });
    const cast = castReadyAbilities(caster, [caster], [e1, e2], 1, makeRng(1), []);
    expect(cast).toContain('ranger_frozentrap');
    for (const e of [e1, e2]) {
      const dot = e.effects.find((x) => x.defKey === 'fx_dot');
      expect(dot).toBeDefined();
      expect(dot?.value).toBeCloseTo(15, 1); // 0.6×100 total ÷ 4s = 15/s
    }
  });

  it('Debilitating Cleave damages + weakens every enemy in melee range, sparing those out of reach', () => {
    const caster = unit({
      id: 'k', side: 'hero', x: 0, range: 55, // knight melee reach
      baseStats: base({ attackDamage: 100, critChance: 0 }),
      abilities: [{ def: abilityDef('knight_debilitate'), rank: 1 }], // 1.2× AD + 15% weaken/6s
    });
    const nearA = unit({ id: 'e1', side: 'enemy', x: 20, hp: 1000, maxHp: 1000 }); // Δ20 ≤ 55 → cleaved
    const nearB = unit({ id: 'e2', side: 'enemy', x: 50, hp: 1000, maxHp: 1000 }); // Δ50 ≤ 55 → cleaved
    const far = unit({ id: 'e3', side: 'enemy', x: 200, hp: 1000, maxHp: 1000 }); // Δ200 > 55 → spared
    const cast = castReadyAbilities(caster, [caster], [nearA, nearB, far], 1, makeRng(1), []);
    expect(cast).toContain('knight_debilitate');
    for (const e of [nearA, nearB]) {
      expect(e.hp).toBeCloseTo(880, 1); // 1000 − 1.2×100
      expect(e.effects.find((x) => x.defKey === 'debuff_weaken')?.value).toBeCloseTo(15, 1);
    }
    expect(far.hp).toBe(1000); // beyond melee reach — untouched
    expect(far.effects.find((x) => x.defKey === 'debuff_weaken')).toBeUndefined();
  });

  it('a heal-over-time scales with healPower (zone-debuffed) and lands on the lowest ally', () => {
    const priest = unit({
      id: 'p', side: 'hero', hp: 100, maxHp: 100,
      baseStats: base({ healPower: 100 }), // ×2 amplifier raw — but devalued by the zone debuff
      abilities: [{ def: abilityDef('priest_mend'), rank: 1 }], // coeff 0.15 total over 6s × maxHp
    });
    const ally = unit({ id: 'a', side: 'hero', hp: 10, maxHp: 100 });
    castReadyAbilities(priest, [priest, ally], [], 1, makeRng(1), []); // stage 1 = Normal (heal eff 1.0)
    // ally is lowest (10%) and below 70% → HoT total = 0.15 × 100 × (1 + 100×1.0/100) = 30
    // over 6s, stored as 5/sec on the effect (Normal has no heal debuff).
    const hot = ally.effects.find((e) => e.defKey === 'fx_hot');
    expect(hot?.value).toBeCloseTo(5, 1);
  });

  it('the zone heal-power debuff shrinks the SAME heal as difficulty rises (Mend)', () => {
    const mk = (): Combatant => unit({
      id: 'p', side: 'hero', hp: 100, maxHp: 100, baseStats: base({ healPower: 200 }),
      abilities: [{ def: abilityDef('priest_mend'), rank: 1 }],
    });
    const hotPerSec = (stage: number): number => {
      const priest = mk();
      const ally = unit({ id: 'a', side: 'hero', hp: 10, maxHp: 100 });
      castReadyAbilities(priest, [priest, ally], [], stage, makeRng(1), []);
      return ally.effects.find((e) => e.defKey === 'fx_hot')?.value ?? 0;
    };
    // Same priest (healPower 200), same target — only the zone changes. Normal (1.0) heals more
    // than Hell (0.33) than Torment (0.11): the treadmill devalues stale gear each difficulty.
    const normal = hotPerSec(1); // 0.15×100×(1+200×1.0/100)/6 = (0.15×300)/6 = 7.5
    const hell = hotPerSec(105); // (1+200×0.33/100) → 0.15×166/6 = 4.15
    const torment = hotPerSec(450); // (1+200×0.11/100) → 0.15×122/6 = 3.05
    expect(normal).toBeCloseTo(7.5, 1);
    expect(hell).toBeCloseTo(4.15, 1);
    expect(torment).toBeCloseTo(3.05, 1);
    expect(normal).toBeGreaterThan(hell);
    expect(hell).toBeGreaterThan(torment);
  });

  it('shield absorbs incoming damage before HP, then expires when drained', () => {
    const c = unit({ id: 's', side: 'hero', hp: 100, maxHp: 100 });
    applyEffect(c.effects, effectDef('fx_shield'), 'p', 30, 8000); // 30-pt shield
    expect(absorbDamage(c.effects, 20)).toBe(0); // fully soaked
    expect(c.effects[0]?.value).toBe(10); // 10 left
    expect(absorbDamage(c.effects, 25)).toBe(15); // 10 soaked, 15 through
    expect(c.effects[0]?.remainingMs).toBe(0); // depleted → expired
  });

  it('a shield ability holds (no cast, no cooldown) when the target is already shielded', () => {
    const enemy = unit({ id: 'e', side: 'enemy', x: 10 }); // in range → engaged + enemyPresent
    const knight = unit({ id: 'k', side: 'hero', classKey: 'knight', abilities: [{ def: abilityDef('knight_bulwark'), rank: 1 }] });
    // Already shielded (e.g. by the Priest's Holy Shield) → Bulwark must not double it up.
    applyEffect(knight.effects, effectDef('fx_shield'), 'priest', 50, 4000);
    const held = castReadyAbilities(knight, [knight], [enemy], 1, makeRng(1), []);
    expect(held).not.toContain('knight_bulwark');
    expect(knight.cooldowns.knight_bulwark ?? 0).toBe(0); // cooldown NOT spent → fires when the shield drops

    // With no pre-existing shield it casts as normal.
    knight.effects = [];
    const cast = castReadyAbilities(knight, [knight], [enemy], 1, makeRng(1), []);
    expect(cast).toContain('knight_bulwark');
    expect(knight.cooldowns.knight_bulwark ?? 0).toBeGreaterThan(0);
  });

  it('a hero casts at most ONE ability per swing (no global cooldown — the swing paces them)', () => {
    const caster = unit({
      id: 'm', side: 'hero',
      baseStats: base({ attackDamage: 50 }),
      // Both ready, both can hit the wave → they must NOT fire together: a hero takes one
      // action per swing, so only the first fires this call.
      abilities: [{ def: abilityDef('ranger_multishot'), rank: 1 }, { def: abilityDef('ranger_frozentrap'), rank: 1 }],
    });
    const enemy = unit({ id: 'e', side: 'enemy' });
    const first = castReadyAbilities(caster, [caster], [enemy], 1, makeRng(1), []);
    expect(first).toHaveLength(1); // only one despite both being ready
    // No global cooldown: the OTHER ready ability fires on the very next swing (call).
    const second = castReadyAbilities(caster, [caster], [enemy], 1, makeRng(1), []);
    expect(second).toHaveLength(1);
    expect(second[0]).not.toBe(first[0]); // the second ability, not a repeat of the first
  });

  it('enemies are NOT limited to one cast (they fire every ready ability)', () => {
    const foe = unit({
      id: 'e', side: 'enemy',
      abilities: [{ def: abilityDef('enemy_bolt'), rank: 1 }, { def: abilityDef('enemy_smash'), rank: 1 }],
    });
    const hero = unit({ id: 'h', side: 'hero' });
    const cast = castReadyAbilities(foe, [foe], [hero], 1, makeRng(1), []);
    expect(cast).toHaveLength(2); // both fire — enemy cadence unchanged
  });

  it('cooldown reduction drains the cooldown faster (dynamic, soft-capped)', () => {
    const caster = unit({
      id: 'm', side: 'hero',
      baseStats: base({ attackDamage: 50, cooldownReduction: 50 }),
      abilities: [{ def: abilityDef('priest_nova'), rank: 1 }], // AoE damage → 20000ms base
    });
    const enemy = unit({ id: 'e', side: 'enemy' });
    castReadyAbilities(caster, [caster], [enemy], 1, makeRng(1), []);
    // The stored cooldown is the BASE (no CDR baked in) — CDR is applied while it ticks.
    expect(caster.cooldowns['priest_nova']).toBe(20_000);
    // raw 50 CDR → diminishing-returns effective ≈ 27.8% → effective total 14444 → drains at
    // 20000/14444 ≈ 1.385× speed: 1000ms of ticking removes ~1385ms.
    tickCooldowns(caster, 1000);
    expect(caster.cooldowns['priest_nova']).toBeCloseTo(20_000 - 1384.6, 0);
  });

  it('a CDR buff gained AFTER the cast still shortens the remaining cooldown', () => {
    const caster = unit({
      id: 'm', side: 'hero',
      baseStats: base({ attackDamage: 50 }), // 0% CDR at cast
      abilities: [{ def: abilityDef('priest_nova'), rank: 1 }],
    });
    const enemy = unit({ id: 'e', side: 'enemy' });
    castReadyAbilities(caster, [caster], [enemy], 1, makeRng(1), []);
    tickCooldowns(caster, 1000); // no CDR yet → drains 1:1
    expect(caster.cooldowns['priest_nova']).toBe(19_000);
    // Now a buff grants CDR mid-cooldown (e.g. Power Infusion). The SAME remaining cooldown
    // must now drain faster, instead of the old behaviour where CDR only mattered at cast.
    caster.staticMods = [{ key: 'cooldownReduction', mode: 'percent', value: 50 }];
    tickCooldowns(caster, 1000); // effective ≈27.8% → ~1.385× speed
    expect(caster.cooldowns['priest_nova']).toBeCloseTo(19_000 - 1384.6, 0);
  });
});

describe('per-ability cooldowns', () => {
  it('every player ability declares its own positive cooldown, unless charge-gated or a passive aura', () => {
    for (const def of Object.values(ABILITIES)) {
      if (def.charge !== undefined || def.aura !== undefined) continue; // these use no cooldown
      expect(def.cooldownMs).toBeGreaterThan(0);
    }
  });

  it('Knight cooldown spot-checks', () => {
    expect(ABILITIES.knight_guard?.cooldownMs).toBe(20_000);
    expect(ABILITIES.knight_debilitate?.cooldownMs).toBe(12_000);
    expect(ABILITIES.knight_bulwark?.cooldownMs).toBe(24_000);
    expect(ABILITIES.knight_battlecry?.cooldownMs).toBe(24_000);
    expect(ABILITIES.knight_bloodlust?.cooldownMs).toBe(24_000);
  });

  it('Priest & Ranger cooldown spot-checks', () => {
    expect(ABILITIES.priest_mend?.cooldownMs).toBe(20_000);
    expect(ABILITIES.priest_powerinfusion?.cooldownMs).toBe(24_000);
    expect(ABILITIES.priest_holyshield?.cooldownMs).toBe(24_000);
    expect(ABILITIES.priest_nova?.cooldownMs).toBe(20_000);
    expect(ABILITIES.ranger_fast_fire?.cooldownMs).toBe(24_000);
    expect(ABILITIES.ranger_multishot?.cooldownMs).toBe(20_000);
    expect(ABILITIES.ranger_focus?.cooldownMs).toBe(18_000);
    expect(ABILITIES.ranger_frozentrap?.cooldownMs).toBe(24_000);
    expect(ABILITIES.ranger_aimedshot?.charge).toEqual({ perAttack: 1, toCast: 10 }); // charge-gated, no cd
  });

  it('a charge-gated ability fires only at full charge, then resets to 0', () => {
    const caster = unit({
      id: 'm', side: 'hero', baseStats: base({ attackDamage: 50, critChance: 0 }),
      abilities: [{ def: abilityDef('ranger_aimedshot'), rank: 1 }],
    });
    const enemy = unit({ id: 'e', side: 'enemy' });
    caster.charges = { ranger_aimedshot: 9 };
    expect(castReadyAbilities(caster, [caster], [enemy], 1, makeRng(1), [])).toHaveLength(0); // 9 < 10
    caster.charges = { ranger_aimedshot: 10 };
    const cast = castReadyAbilities(caster, [caster], [enemy], 1, makeRng(1), []);
    expect(cast).toEqual(['ranger_aimedshot']); // fired at 10
    expect(caster.charges.ranger_aimedshot).toBe(0); // consumed
    expect(caster.cooldowns.ranger_aimedshot ?? 0).toBe(0); // no cooldown applied
  });
});

describe('Retribution Aura (passive party buff)', () => {
  const cfg = (over: Partial<HeroConfig>): HeroConfig => ({
    id: 'p', classKey: 'priest', level: 1, equipment: {}, talents: {}, ...over,
  });

  it('grants party-wide damageIncrease only when SLOTTED, scaling with rank', () => {
    // Ranked but not slotted → no aura.
    expect(partyAuraMods([cfg({ talents: { priest_retribution: 3 }, activeAbilities: [] })])).toHaveLength(0);
    // Slotted at rank 3 → +5 + 2.5×2 = +10% damageIncrease for the party.
    expect(partyAuraMods([cfg({ talents: { priest_retribution: 3 }, activeAbilities: ['priest_retribution'] })]))
      .toEqual([{ key: 'damageIncrease', mode: 'percent', value: 10 }]);
  });

  it('an undefined selection (headless harness) counts a ranked aura as slotted', () => {
    expect(partyAuraMods([cfg({ talents: { priest_retribution: 5 }, activeAbilities: undefined })]))
      .toEqual([{ key: 'damageIncrease', mode: 'percent', value: 15 }]); // rank 5 → +15%
  });

  it('a passive aura is never cast (no cooldown consumed)', () => {
    const caster = unit({ id: 'p', side: 'hero', classKey: 'priest', abilities: [{ def: abilityDef('priest_retribution'), rank: 3 }] });
    const enemy = unit({ id: 'e', side: 'enemy' });
    expect(castReadyAbilities(caster, [caster], [enemy], 1, makeRng(1), [])).toHaveLength(0);
    expect(caster.cooldowns.priest_retribution ?? 0).toBe(0);
  });

  it('actually raises an ALLY\'s effective per-hit damage when active (end-to-end)', () => {
    // The Knight is the ALLY — proves the aura is party-wide, not just self. Effective auto
    // damage = attackDamage × (1 + damageIncrease/100), exactly as combat.ts applies it.
    const knight = (): HeroConfig => ({ id: 'k', classKey: 'knight', level: 20, equipment: {}, talents: {} });
    const priest = cfg({ level: 20, talents: { priest_retribution: 5 }, activeAbilities: ['priest_retribution'] });
    const hitDamage = (mods: ReturnType<typeof partyAuraMods>): number => {
      const k = knight();
      const s = aggregate(heroBaseStats(k.classKey, k.level), heroStaticMods(k, mods));
      return s.attackDamage * (1 + s.damageIncrease / 100);
    };
    const without = hitDamage([]); // no aura slotted
    const withAura = hitDamage(partyAuraMods([priest, knight()])); // priest's rank-5 aura → +15%
    expect(withAura).toBeGreaterThan(without);
    expect(withAura / without).toBeCloseTo(1.15, 2); // exactly +15% more party damage
  });
});
