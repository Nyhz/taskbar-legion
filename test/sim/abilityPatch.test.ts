import { describe, expect, it } from 'vitest';
import { patchAbility } from '@/sim/abilityPatch';
import { castReadyAbilities } from '@/sim/abilities';
import { heroAbilities } from '@/sim/loadout';
import { vulnerabilityMult } from '@/sim/effects';
import { abilityDef } from '@/data/abilities';
import type { CombatEvent } from '@/sim/world';
import { base, effect, learned, luckyRng, quietRng, unit } from './_kit';

// Ability PATCHES (F2): what each modifier of the first wave does to its ability, end to end — and the effects
// with a target / coefficient of their own (F3) and the "two heroes" target (F6) they lean on.

const AD100 = base({ attackDamage: 100, critChance: 0 });

describe('patchAbility', () => {
  it('is pure: no patch → the same definition; a patch never touches the original', () => {
    const def = abilityDef('knight_riposte');
    const frozen = JSON.stringify(def);
    expect(patchAbility(def, [])).toBe(def);
    const patched = patchAbility(def, [{ chargeToCast: 3, cooldownMs: 1234, target: 'meleeEnemies' }]);
    expect(patched.charge).toEqual({ perAttack: 0, toCast: 3 });
    expect(patched.cooldownMs).toBe(1234);
    expect(patched.target).toBe('meleeEnemies');
    expect(JSON.stringify(def)).toBe(frozen);
  });

  it('changes an effect in place: duration, added duration, share of the power', () => {
    const def = abilityDef('ranger_frozentrap'); // fx_dot for 4s
    const p = patchAbility(def, [{ effects: [{ effectKey: 'fx_dot', durationAddMs: 2000, powerScale: 1.5 }] }]);
    expect(p.applies).toEqual([{ effectKey: 'fx_dot', durationMsOverride: 6000, powerScale: 1.5 }]);
    expect(patchAbility(p, [{ effects: [{ effectKey: 'fx_dot', durationMs: 1000, powerScale: 2 }] }]).applies[0])
      .toEqual({ effectKey: 'fx_dot', durationMsOverride: 1000, powerScale: 3 });
  });

  it('an added effect is fixed (no per-rank value from the ability); a mirrored one keeps the original numbers', () => {
    const cleave = patchAbility(abilityDef('knight_debilitate'), [{ addApplies: [{ effectKey: 'debuff_cripple' }] }]);
    expect(cleave.applies[2]).toEqual({ effectKey: 'debuff_cripple', valuePerRank: 0 });
    const skin = patchAbility(abilityDef('knight_guard'), [{ mirror: [{ effectKey: 'buff_guard_block', target: 'lowestOtherAlly' }] }]);
    expect(skin.applies).toEqual([{ effectKey: 'buff_guard_block' }, { effectKey: 'buff_guard_block', target: 'lowestOtherAlly' }]);
  });

  it('a hero gets the patched ability only with the modifier, and the same object every time', () => {
    const plain = heroAbilities('knight', { knight_riposte: 1 })[0]?.def;
    const sharp = heroAbilities('knight', { knight_riposte: 1, knight_mod_punishing_riposte: 1 })[0]?.def;
    expect(plain).toBe(abilityDef('knight_riposte'));
    expect(sharp?.charge?.toCast).toBe(3);
    expect(heroAbilities('knight', { knight_riposte: 4, knight_mod_punishing_riposte: 1 })[0]?.def).toBe(sharp);
    // A modifier of another ability changes nothing here.
    expect(heroAbilities('knight', { knight_riposte: 1, knight_mod_shared_skin: 1 })[0]?.def).toBe(plain);
  });
});

describe('Knight modifiers', () => {
  it('Shared Skin: Stone Skin also covers the hurt-most OTHER ally, with the same numbers; alone, only himself', () => {
    const knight = unit({ id: 'k', side: 'hero', abilities: [learned('knight', { knight_guard: 3, knight_mod_shared_skin: 1 }, 'knight_guard')] });
    const hurt = unit({ id: 'r', side: 'hero', classKey: 'ranger', hp: 300 });
    const fine = unit({ id: 'p', side: 'hero', classKey: 'priest', hp: 900 });
    const foe = unit({ id: 'e', side: 'enemy', x: 10 });
    castReadyAbilities(knight, [knight, hurt, fine], [foe], 1, quietRng(), []);
    expect(effect(knight, 'buff_guard_block')?.value).toBe(30); // 20 + 5·2 at rank 3
    expect(effect(hurt, 'buff_guard_block')?.value).toBe(30);
    expect(effect(fine, 'buff_guard_block')).toBeUndefined();

    const solo = unit({ id: 'k', side: 'hero', abilities: [learned('knight', { knight_guard: 3, knight_mod_shared_skin: 1 }, 'knight_guard')] });
    expect(castReadyAbilities(solo, [solo], [foe], 1, quietRng(), [])).toEqual(['knight_guard']);
    expect(solo.effects).toHaveLength(1);
  });

  it('Crippling Cleave: the enemies it hits are 20% slower for 6s, whatever the rank', () => {
    const knight = unit({ id: 'k', side: 'hero', range: 55, baseStats: AD100, abilities: [learned('knight', { knight_debilitate: 5, knight_mod_crippling_cleave: 1 }, 'knight_debilitate')] });
    const near = unit({ id: 'e1', side: 'enemy', x: 20 });
    const far = unit({ id: 'e2', side: 'enemy', x: 300 });
    castReadyAbilities(knight, [knight], [near, far], 1, quietRng(), []);
    expect(near.hp).toBeCloseTo(800, 5); // 2.0× AD at rank 5
    expect(effect(near, 'debuff_weaken')?.value).toBe(25);
    expect(effect(near, 'debuff_cripple')).toMatchObject({ value: -20, remainingMs: 6000 });
    expect(far.effects).toHaveLength(0);
  });

  it('Standard Bearer: while Hold the Line lasts the Knight has +10 block and +10% armour; the party gets the cut', () => {
    const talents = { knight_holdtheline: 5, knight_mod_standard_bearer: 1 };
    const knight = unit({ id: 'k', side: 'hero', abilities: [learned('knight', talents, 'knight_holdtheline')] });
    const ally = unit({ id: 'r', side: 'hero', classKey: 'ranger' });
    castReadyAbilities(knight, [knight, ally], [unit({ id: 'e', side: 'enemy', x: 10 })], 1, quietRng(), []);
    for (const h of [knight, ally]) expect(effect(h, 'buff_holdline_dr')).toMatchObject({ value: 20, remainingMs: 6000 });
    expect(effect(knight, 'buff_standard_block')).toMatchObject({ value: 10, remainingMs: 6000 });
    expect(effect(knight, 'buff_standard_armor')?.value).toBe(10);
    expect(effect(ally, 'buff_standard_block')).toBeUndefined();
    // Rank 1 of the ability, no modifier: 10% for the party and nothing else.
    const plain = unit({ id: 'k', side: 'hero', abilities: [learned('knight', { knight_holdtheline: 1 }, 'knight_holdtheline')] });
    castReadyAbilities(plain, [plain], [unit({ id: 'e', side: 'enemy', x: 10 })], 1, quietRng(), []);
    expect(plain.effects.map((e) => [e.defKey, e.value])).toEqual([['buff_holdline_dr', 10]]);
  });

  it('Riposte fires only at full charge — 4 blocked hits, 3 with Punishing Riposte — then strikes and weakens', () => {
    const foe = (): ReturnType<typeof unit> => unit({ id: 'e', side: 'enemy', x: 10 });
    const knight = unit({ id: 'k', side: 'hero', baseStats: AD100, abilities: [learned('knight', { knight_riposte: 1 }, 'knight_riposte')] });
    knight.charges = { knight_riposte: 3 };
    expect(castReadyAbilities(knight, [knight], [foe()], 1, quietRng(), [])).toEqual([]);
    knight.charges = { knight_riposte: 4 };
    const struck = foe();
    expect(castReadyAbilities(knight, [knight], [struck], 1, quietRng(), [])).toEqual(['knight_riposte']);
    expect(struck.hp).toBeCloseTo(850, 5); // 1.5× AD
    expect(effect(struck, 'debuff_riposte_weaken')).toMatchObject({ value: 10, remainingMs: 4000 });
    expect(knight.charges.knight_riposte).toBe(0);

    const sharp = unit({ id: 'k', side: 'hero', baseStats: AD100, abilities: [learned('knight', { knight_riposte: 5, knight_mod_punishing_riposte: 1 }, 'knight_riposte')] });
    sharp.charges = { knight_riposte: 3 };
    const hit = foe();
    expect(castReadyAbilities(sharp, [sharp], [hit], 1, quietRng(), [])).toEqual(['knight_riposte']);
    expect(hit.hp).toBeCloseTo(750, 5); // 2.5× AD at rank 5
    expect(effect(hit, 'debuff_riposte_weaken')?.value).toBe(20);
  });
});

describe('Ranger abilities and modifiers', () => {
  it('Weak Spot: a shot and a mark that makes the enemy take more damage; Open Wound makes it last 9s', () => {
    const cast = (talents: Record<string, number>): ReturnType<typeof unit> => {
      const ranger = unit({ id: 'r', side: 'hero', classKey: 'ranger', baseStats: AD100, abilities: [learned('ranger', talents, 'ranger_weakspot')] });
      const foe = unit({ id: 'e', side: 'enemy', x: 10 });
      castReadyAbilities(ranger, [ranger], [foe], 1, quietRng(), []);
      return foe;
    };
    const r1 = cast({ ranger_weakspot: 1 });
    expect(r1.hp).toBeCloseTo(880, 5); // 1.2× AD
    expect(effect(r1, 'debuff_weakspot')).toMatchObject({ value: 6, remainingMs: 6000 });
    expect(vulnerabilityMult(r1.effects)).toBeCloseTo(1.06, 9);
    const r5 = cast({ ranger_weakspot: 5 });
    expect(r5.hp).toBeCloseTo(800, 5); // 2.0× AD
    expect(effect(r5, 'debuff_weakspot')?.value).toBe(12);
    expect(effect(cast({ ranger_weakspot: 1, ranger_mod_open_wound: 1 }), 'debuff_weakspot')?.remainingMs).toBe(9000);
  });

  it('Weak Spot adds to the Mark of the Hunter instead of replacing it', () => {
    const ranger = unit({ id: 'r', side: 'hero', classKey: 'ranger', baseStats: AD100, abilities: [learned('ranger', { ranger_weakspot: 5 }, 'ranger_weakspot')] });
    const boss = unit({ id: 'b', side: 'enemy', x: 10, effects: [{ defKey: 'fx_mark', sourceId: 'r', remainingMs: 60000, stacks: 1, value: 25 }] });
    castReadyAbilities(ranger, [ranger], [boss], 1, quietRng(), []);
    expect(vulnerabilityMult(boss.effects)).toBeCloseTo(1.37, 9);
  });

  it('Tar Flask: two effects with their own value on the whole wave — damage over 5s and a slow', () => {
    const cast = (talents: Record<string, number>): ReturnType<typeof unit>[] => {
      const ranger = unit({ id: 'r', side: 'hero', classKey: 'ranger', baseStats: AD100, abilities: [learned('ranger', talents, 'ranger_tarflask')] });
      const wave = [unit({ id: 'e1', side: 'enemy', x: 10 }), unit({ id: 'e2', side: 'enemy', x: 400 })];
      castReadyAbilities(ranger, [ranger], wave, 1, quietRng(), []);
      return wave;
    };
    for (const e of cast({ ranger_tarflask: 1 })) {
      expect(effect(e, 'fx_tar')).toMatchObject({ remainingMs: 5000 });
      expect((effect(e, 'fx_tar')?.value ?? 0) * 5).toBeCloseTo(80, 5); // 0.8× AD in total
      expect(effect(e, 'debuff_tar_slow')?.value).toBe(-15);
    }
    for (const e of cast({ ranger_tarflask: 5 })) {
      expect((effect(e, 'fx_tar')?.value ?? 0) * 5).toBeCloseTo(160, 5);
      expect(effect(e, 'debuff_tar_slow')?.value).toBe(-30);
    }
    // Burning Tar: half as much damage again, and both effects last 2s longer.
    for (const e of cast({ ranger_tarflask: 1, ranger_mod_burning_tar: 1 })) {
      expect(effect(e, 'fx_tar')?.remainingMs).toBe(7000);
      expect((effect(e, 'fx_tar')?.value ?? 0) * 7).toBeCloseTo(120, 5);
      expect(effect(e, 'debuff_tar_slow')).toMatchObject({ value: -15, remainingMs: 7000 });
    }
  });

  it('Heartseeker: Aimed Shot always crits, without rolling', () => {
    const shoot = (talents: Record<string, number>): { hp: number; crit: boolean | undefined; draws: number } => {
      const ranger = unit({ id: 'r', side: 'hero', classKey: 'ranger', baseStats: base({ attackDamage: 100, critChance: 0, critDamage: 50 }), abilities: [learned('ranger', talents, 'ranger_aimedshot')] });
      ranger.charges = { ranger_aimedshot: 10 };
      const foe = unit({ id: 'e', side: 'enemy', x: 10 });
      const events: CombatEvent[] = [];
      const rng = quietRng();
      castReadyAbilities(ranger, [ranger], [foe], 1, rng, events);
      return { hp: foe.hp, crit: events.find((e) => e.type === 'damage')?.crit, draws: rng.draws };
    };
    expect(shoot({ ranger_aimedshot: 1 })).toEqual({ hp: 820, crit: false, draws: 1 }); // 1.8× AD, the roll fails
    expect(shoot({ ranger_aimedshot: 1, ranger_mod_heartseeker: 1 })).toEqual({ hp: 730, crit: true, draws: 0 }); // ×1.5
  });

  it('Focused Fire: Rapid Fire also gives +20 crit damage for its 8s', () => {
    const ranger = unit({ id: 'r', side: 'hero', classKey: 'ranger', abilities: [learned('ranger', { ranger_fast_fire: 5, ranger_mod_focused_fire: 1 }, 'ranger_fast_fire')] });
    castReadyAbilities(ranger, [ranger], [unit({ id: 'e', side: 'enemy', x: 10 })], 1, quietRng(), []);
    expect(effect(ranger, 'buff_fast_fire')?.value).toBe(45);
    expect(effect(ranger, 'buff_focused_fire')).toMatchObject({ value: 20, remainingMs: 8000 });
  });

  it('Scorched Earth: everything Explosive Arrow hits burns for 60% AD over 4s — the splashed too', () => {
    const ranger = unit({ id: 'r', side: 'hero', classKey: 'ranger', baseStats: AD100, abilities: [learned('ranger', { ranger_focus: 1, ranger_mod_scorched_earth: 1 }, 'ranger_focus')] });
    const front = unit({ id: 'e1', side: 'enemy', x: 10 });
    const near = unit({ id: 'e2', side: 'enemy', x: 40 });
    const far = unit({ id: 'e3', side: 'enemy', x: 200 });
    castReadyAbilities(ranger, [ranger], [front, near, far], 1, quietRng(), []);
    expect(front.hp).toBeCloseTo(840, 5);
    expect(near.hp).toBeCloseTo(940, 5);
    for (const e of [front, near]) {
      expect(effect(e, 'fx_burn')?.remainingMs).toBe(4000);
      expect((effect(e, 'fx_burn')?.value ?? 0) * 4).toBeCloseTo(60, 5);
    }
    expect(far.hp).toBe(1000);
    expect(far.effects).toHaveLength(0);
  });

  it('Barbed Caltrops: the bleed lasts 6s and deals half as much again in total', () => {
    const cast = (talents: Record<string, number>): ReturnType<typeof unit> => {
      const ranger = unit({ id: 'r', side: 'hero', classKey: 'ranger', baseStats: AD100, abilities: [learned('ranger', talents, 'ranger_frozentrap')] });
      const foe = unit({ id: 'e', side: 'enemy', x: 10 });
      castReadyAbilities(ranger, [ranger], [foe], 1, quietRng(), []);
      return foe;
    };
    const plain = effect(cast({ ranger_frozentrap: 1 }), 'fx_dot');
    const barbed = effect(cast({ ranger_frozentrap: 1, ranger_mod_barbed_caltrops: 1 }), 'fx_dot');
    expect((plain?.value ?? 0) * 4).toBeCloseTo(60, 5);
    expect(barbed?.remainingMs).toBe(6000);
    expect((barbed?.value ?? 0) * 6).toBeCloseTo(90, 5);
  });
});

describe('Priest abilities and modifiers', () => {
  const priestWith = (talents: Record<string, number>, key: string): ReturnType<typeof unit> =>
    unit({ id: 'p', side: 'hero', classKey: 'priest', x: -60, range: 200, baseStats: AD100, abilities: [learned('priest', talents, key)] });

  it('Smite: an instant heal on the hurt-most ally and, as an effect of its own, a strike on the front enemy', () => {
    const cast = (rank: number, withFoe: boolean): { ally: number; foe: number; cast: string[] } => {
      const priest = priestWith({ priest_smite: rank }, 'priest_smite');
      const ally = unit({ id: 'k', side: 'hero', hp: 500 });
      const foe = unit({ id: 'e', side: 'enemy', x: withFoe ? 10 : 5000 });
      const done = castReadyAbilities(priest, [priest, ally], [foe], 1, quietRng(), []);
      return { ally: ally.hp, foe: foe.hp, cast: done };
    };
    expect(cast(1, true)).toEqual({ ally: 580, foe: 940, cast: ['priest_smite'] }); // +8% of 1000, 0.6× AD
    const r5 = cast(5, true);
    expect(r5.ally).toBeCloseTo(640, 5); // +14%
    expect(r5.foe).toBeCloseTo(900, 5); // 1.0× AD
    expect(cast(1, false)).toEqual({ ally: 580, foe: 1000, cast: ['priest_smite'] }); // nobody in reach: the heal still lands
  });

  it('Smite is a heal first: it waits for someone to be hurt', () => {
    const priest = priestWith({ priest_smite: 1 }, 'priest_smite');
    const ally = unit({ id: 'k', side: 'hero', hp: 900 });
    expect(castReadyAbilities(priest, [priest, ally], [unit({ id: 'e', side: 'enemy', x: 10 })], 1, quietRng(), [])).toEqual([]);
  });

  it('Mending Light: Smite’s heal leaves a heal of 4% over 4s on the same ally', () => {
    const priest = priestWith({ priest_smite: 1, priest_mod_mending_light: 1 }, 'priest_smite');
    const ally = unit({ id: 'k', side: 'hero', hp: 500 });
    castReadyAbilities(priest, [priest, ally], [], 1, quietRng(), []);
    expect(ally.hp).toBe(580);
    expect(effect(ally, 'fx_light')?.remainingMs).toBe(4000);
    expect((effect(ally, 'fx_light')?.value ?? 0) * 4).toBeCloseTo(40, 5);
    expect(effect(priest, 'fx_light')).toBeUndefined();
  });

  it('Sanctuary: a heal over 6s on the whole party once someone is hurt; Deep Sanctuary adds a small shield to each', () => {
    const run = (talents: Record<string, number>, hurtHp: number): ReturnType<typeof unit>[] => {
      const priest = priestWith(talents, 'priest_sanctuary');
      const party = [priest, unit({ id: 'k', side: 'hero', hp: hurtHp, maxHp: 2000 })];
      castReadyAbilities(priest, party, [], 1, quietRng(), []);
      return party;
    };
    expect(run({ priest_sanctuary: 1 }, 1900).every((h) => h.effects.length === 0)).toBe(true); // nobody under 70%
    const [p, k] = run({ priest_sanctuary: 1 }, 1000);
    expect((effect(p, 'fx_sanctuary')?.value ?? 0) * 6).toBeCloseTo(60, 5); // 6% of her 1000
    expect((effect(k, 'fx_sanctuary')?.value ?? 0) * 6).toBeCloseTo(120, 5); // 6% of his 2000
    const [, k5] = run({ priest_sanctuary: 5 }, 1000);
    expect((effect(k5, 'fx_sanctuary')?.value ?? 0) * 6).toBeCloseTo(200, 5); // 10%
    const [pd, kd] = run({ priest_sanctuary: 1, priest_mod_deep_sanctuary: 1 }, 1000);
    expect(effect(pd, 'fx_ward')?.value).toBeCloseTo(40, 5); // 4% of 1000
    expect(effect(kd, 'fx_ward')?.value).toBeCloseTo(80, 5);
  });

  it('a ward riding on Sanctuary does not hold the cast back, and does not stop a real shield ability', () => {
    // Everyone already carries a ward: Sanctuary (a heal that also wards) still fires.
    const priest = priestWith({ priest_sanctuary: 1, priest_mod_deep_sanctuary: 1 }, 'priest_sanctuary');
    const knight = unit({ id: 'k', side: 'hero', hp: 500, abilities: [{ def: abilityDef('knight_bulwark'), rank: 1 }] });
    for (const h of [priest, knight]) h.effects.push({ defKey: 'fx_ward', sourceId: 'p', remainingMs: 3000, stacks: 1, value: 10 });
    const foe = unit({ id: 'e', side: 'enemy', x: 10 });
    expect(castReadyAbilities(priest, [priest, knight], [foe], 1, quietRng(), [])).toEqual(['priest_sanctuary']);
    // Bulwark only waits for a shield of its own kind (fx_shield), not for a ward.
    expect(castReadyAbilities(knight, [priest, knight], [foe], 1, quietRng(), [])).toEqual(['knight_bulwark']);
    expect(castReadyAbilities(knight, [priest, knight], [foe], 1, quietRng(), [])).toEqual([]); // on cooldown now
  });

  it('Swift Mend: 30% of Mend lands at once, the other 70% rolls — the total does not change', () => {
    const cast = (talents: Record<string, number>): { hp: number; hot: number } => {
      const priest = priestWith(talents, 'priest_mend');
      const ally = unit({ id: 'k', side: 'hero', hp: 100 });
      castReadyAbilities(priest, [priest, ally], [], 1, quietRng(), []);
      return { hp: ally.hp, hot: (effect(ally, 'fx_hot')?.value ?? 0) * 6 };
    };
    const plain = cast({ priest_mend: 1 });
    const swift = cast({ priest_mend: 1, priest_mod_swift_mend: 1 });
    expect(plain.hp).toBe(100);
    expect(plain.hot).toBeCloseTo(150, 5); // 15% of 1000 over 6s
    expect(swift.hp).toBeCloseTo(145, 5); // 30% of it at once
    expect(swift.hot).toBeCloseTo(105, 5);
  });

  it('Aegis: Holy Shield also gives the tank 10% less damage taken for its 4s', () => {
    const priest = priestWith({ priest_holyshield: 1, priest_mod_aegis: 1 }, 'priest_holyshield');
    const tank = unit({ id: 'k', side: 'hero' });
    castReadyAbilities(priest, [tank, priest], [unit({ id: 'e', side: 'enemy', x: 10 })], 1, quietRng(), []);
    expect(effect(tank, 'fx_shield')?.value).toBeCloseTo(100, 5);
    expect(effect(tank, 'buff_aegis_dr')).toMatchObject({ value: 10, remainingMs: 4000 });
  });

  it('Radiant Nova: the Nova also heals every ally for 3% of its life', () => {
    const priest = priestWith({ priest_nova: 1, priest_mod_radiant_nova: 1 }, 'priest_nova');
    priest.hp = 500;
    const ally = unit({ id: 'k', side: 'hero', hp: 1000, maxHp: 2000 });
    const wave = [unit({ id: 'e1', side: 'enemy', x: 10 }), unit({ id: 'e2', side: 'enemy', x: 90 })];
    castReadyAbilities(priest, [priest, ally], wave, 1, quietRng(), []);
    for (const e of wave) expect(e.hp).toBeCloseTo(880, 5); // 1.2× AD
    expect(priest.hp).toBeCloseTo(530, 5);
    expect(ally.hp).toBeCloseTo(1060, 5);
  });

  it('Twin Infusion: Power Infusion reaches two different heroes — the damage dealer and the tank', () => {
    const priest = priestWith({ priest_powerinfusion: 1, priest_mod_twin_infusion: 1 }, 'priest_powerinfusion');
    const knight = unit({ id: 'k', side: 'hero', classKey: 'knight', x: 0 });
    const ranger = unit({ id: 'r', side: 'hero', classKey: 'ranger', x: -30 });
    const rng = quietRng();
    castReadyAbilities(priest, [knight, ranger, priest], [unit({ id: 'e', side: 'enemy', x: 10 })], 1, rng, []);
    for (const h of [knight, ranger]) {
      expect(effect(h, 'buff_infusion_as')?.value).toBe(30);
      expect(effect(h, 'buff_infusion_cdr')?.value).toBe(30);
    }
    expect(priest.effects).toHaveLength(0);
    expect(rng.draws).toBe(0); // one damage dealer for two places: nothing to roll
  });

  it('the "two heroes" target picks two of three damage dealers with the RNG, never the same twice, and one when alone', () => {
    const priest = priestWith({ priest_powerinfusion: 1, priest_mod_twin_infusion: 1 }, 'priest_powerinfusion');
    const rangers = ['a', 'b', 'c'].map((id) => unit({ id, side: 'hero', classKey: 'ranger' }));
    castReadyAbilities(priest, [...rangers, priest], [unit({ id: 'e', side: 'enemy', x: 10 })], 1, luckyRng(), []);
    expect(rangers.filter((r) => effect(r, 'buff_infusion_as') !== undefined)).toHaveLength(2);

    const alone = priestWith({ priest_powerinfusion: 1, priest_mod_twin_infusion: 1 }, 'priest_powerinfusion');
    alone.x = 0;
    alone.range = 30;
    castReadyAbilities(alone, [alone], [unit({ id: 'e', side: 'enemy', x: 10 })], 1, quietRng(), []);
    expect(effect(alone, 'buff_infusion_as')?.value).toBe(30);
  });
});
