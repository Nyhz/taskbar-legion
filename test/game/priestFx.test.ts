import { describe, expect, it } from 'vitest';
import { ABILITIES } from '@/data/abilities';
import { EFFECTS } from '@/data/effects';
import {
  ABILITY_LOOKS,
  AURA_PREFIX,
  BLOW_SIGNS,
  CLIP_SHOT,
  EFFECT_LOOKS,
  HEAL_BLOOM,
  LIGHT_SHOTS,
  PENDING_ABILITIES,
  SHOT_FROM,
  SILENT_EFFECTS,
  auraEffectKey,
  basicShotOf,
  hasOwnLook,
  wornLooks,
  type WornEffect,
} from '@/game/render/abilityFx';
import { MAX_BLOW_WAIT_MS, blowRate, impactMs } from '@/game/render/attackLead';
import { categorize } from '@/game/render/effectAuras';
import { figureMeta } from '@/game/render/figureData';
import { FX_KEYS, fxMeta, hasSkin } from '@/game/render/fxData';
import { attackClips, heroAbilityClip } from '@/game/render/heroClips';

const fx = new Set(FX_KEYS);
const worn = (defKey: string, over: Partial<WornEffect> = {}): WornEffect => ({ defKey, sourceId: 'priest', remainingMs: 3000, totalMs: 6000, ...over });
const knight = { id: 'knight', classKey: 'knight' };
const priest = { id: 'priest', classKey: 'priest' };

describe('the Priest', () => {
  it('has a look for every ability: nothing is left pending', () => {
    expect(PENDING_ABILITIES).toEqual([]);
    for (const key of ['priest_mend', 'priest_powerinfusion', 'priest_holyshield', 'priest_nova', 'priest_retribution', 'priest_sanctuary', 'priest_smite', 'priest_enrage']) {
      expect(ABILITY_LOOKS[key], key).toBeDefined();
    }
  });

  it('every lasting effect a Priest ability, modifier or capstone lays has a look of its own — none falls back to the old category arrows', () => {
    const hers = ['fx_hot', 'fx_light', 'fx_sanctuary', 'fx_shield', 'fx_ward', 'buff_infusion_as', 'buff_infusion_cdr', 'buff_aegis_dr', 'buff_enrage_as', 'buff_enrage_cdr'];
    for (const key of hers) {
      expect(EFFECTS[key], `${key} is an effect of the data`).toBeDefined();
      expect(hasOwnLook(key), key).toBe(true);
      expect(categorize({ defKey: key, sourceId: 'x', remainingMs: 1, stacks: 1, value: 1 }), key).toBeNull();
    }
  });

  it('Power Infusion is a RIM of light round the figure and a few motes: it takes no slot another look lives in', () => {
    const got = wornLooks([worn('buff_infusion_as'), worn('buff_infusion_cdr')], knight);
    expect(got.rim?.look.rim).toBe('infused');
    expect(got.slots.get('around')?.look.fx).toBe('infusion_motes');
    expect([...got.slots.keys()]).toEqual(['around']); // nothing behind the body, nothing over it
    expect(SILENT_EFFECTS.has('buff_infusion_cdr')).toBe(true);
    for (const hero of ['knight', 'ranger', 'priest']) expect(hasSkin(hero, 'infused'), hero).toBe(true);
  });

  it('Power Infusion shows WITH what the hero already wears: Rapid Fire, Bloodlust, Stone Skin and Last Stand keep their slots and skins', () => {
    const ranger = { id: 'ranger', classKey: 'ranger' };
    const alone = (key: string, bearer = knight): ReturnType<typeof wornLooks> => wornLooks([worn(key, { sourceId: bearer.id })], bearer);
    const both = (key: string, bearer = knight): ReturnType<typeof wornLooks> => wornLooks([worn(key, { sourceId: bearer.id }), worn('buff_infusion_as', { remainingMs: 5000 })], bearer);
    for (const [key, bearer] of [['buff_fast_fire', ranger], ['buff_bloodlust_as', knight], ['buff_guard_block', knight], ['fx_invuln', knight]] as const) {
      const before = alone(key, bearer);
      const after = both(key, bearer);
      expect(before.slots.size + (before.skin === null ? 0 : 1), `${key} has a look`).toBeGreaterThan(0);
      for (const [slot, held] of before.slots) expect(after.slots.get(slot)?.look.fx, `${key} keeps ${slot}`).toBe(held.look.fx);
      expect(after.skin, `${key} keeps its skin`).toBe(before.skin);
      expect(after.rim?.look.rim, `${key} + infusion`).toBe('infused');
    }
  });

  it("her shield on someone else is her glass; the same effect a Knight lays on himself is his wall", () => {
    const hers = wornLooks([worn('fx_shield', { remainingMs: 3000, totalMs: 4000 })], knight);
    expect(hers.slots.get('front')?.look.fx).toBe('ward_front');
    expect(hers.slots.has('beside')).toBe(false); // thin lines in front only: `beside` stays the Knight's standard's
    const his = wornLooks([worn('fx_shield', { sourceId: 'knight' })], knight);
    expect(his.slots.get('front')?.look.fx).toBe('bulwark_wall');
    expect(his.slots.has('beside')).toBe(false);
    // Holding the front herself (alone, or the last one standing), her own shield is still her glass.
    const own = wornLooks([worn('fx_shield')], priest);
    expect(own.slots.get('front')?.look.fx).toBe('ward_front');
  });

  it('Battle Enrage: she alone wears the wings; the heroes she rouses get a rim of the same fire, which outranks the yellow one', () => {
    expect(wornLooks([worn('buff_enrage_as')], priest).slots.get('behind')?.look.fx).toBe('zeal_wings');
    expect(wornLooks([worn('buff_enrage_as')], priest).rim).toBeNull();
    const roused = wornLooks([worn('buff_enrage_as'), worn('buff_infusion_as', { remainingMs: 5000 })], knight);
    expect(roused.slots.has('behind')).toBe(false);
    expect(roused.rim?.look.rim).toBe('roused');
    expect(roused.slots.get('around')?.look.fx).toBe('infusion_motes'); // the infusion still shows its motes
    for (const hero of ['knight', 'ranger', 'priest']) expect(hasSkin(hero, 'roused'), hero).toBe(true);
  });

  it('a heal that keeps working, a shield and a buff sit in different slots: all three show at once', () => {
    const got = wornLooks([worn('fx_hot'), worn('fx_shield', { remainingMs: 3000, totalMs: 4000 }), worn('buff_infusion_as'), worn('fx_sanctuary')], knight);
    expect([...got.slots.keys()].sort()).toEqual(['around', 'front', 'ground']);
    expect(got.slots.get('around')?.look.fx).toBe('mend_petals'); // the heal's petals over the infusion's motes…
    expect(got.rim?.look.rim).toBe('infused'); // …which still shows by its rim
  });

  it('Retribution is a seal under her and a tread under each ally, through a stand-in key for an aura ability', () => {
    const key = auraEffectKey('priest_retribution');
    expect(key.startsWith(AURA_PREFIX)).toBe(true);
    expect(ABILITIES.priest_retribution?.aura).toBeDefined();
    for (const k of Object.keys(EFFECT_LOOKS)) {
      if (k.startsWith(AURA_PREFIX)) expect(ABILITIES[k.slice(AURA_PREFIX.length)]?.aura, `${k} names an aura ability`).toBeDefined();
    }
    const aura: WornEffect = { defKey: key, sourceId: 'priest', remainingMs: 1 };
    expect(wornLooks([aura], priest).slots.get('ground')?.look.fx).toBe('retribution_seal');
    expect(wornLooks([aura], priest).slots.has('feet')).toBe(false);
    expect(wornLooks([aura], knight).slots.get('feet')?.look.fx).toBe('retribution_tread');
    expect(wornLooks([aura], knight).slots.has('ground')).toBe(false);
  });

  it('a heal, a shield, power and wrath are different gestures: no two of her spells share a clip', () => {
    const spells = ['priest_mend', 'priest_holyshield', 'priest_powerinfusion', 'priest_nova', 'priest_smite', 'priest_sanctuary', 'priest_enrage'];
    const clips = spells.map((key) => heroAbilityClip('priest', key));
    expect(new Set(clips).size).toBe(spells.length);
    const anims = figureMeta('priest')?.anims ?? {};
    for (const clip of clips) {
      const anim = anims[clip];
      expect(anim, clip).toBeDefined();
      // Each has a release the spell's light can wait for (hurried if need be): never longer than the longest wait.
      if (anim !== undefined) expect(impactMs(anim) / blowRate(anim), clip).toBeLessThanOrEqual(MAX_BLOW_WAIT_MS + 1e-6);
    }
  });

  it('throws light with all three basic attacks — a bolt, a page, a bolt — each from where the clip lets go', () => {
    const anims = figureMeta('priest')?.anims ?? {};
    expect(attackClips(anims)).toEqual(['attack', 'attack2', 'attack3']);
    expect(basicShotOf('priest', 'attack')).toBe('light_bolt');
    expect(basicShotOf('priest', 'attack2')).toBe('light_page');
    expect(basicShotOf('priest', 'attack3')).toBe('light_bolt');
    expect(basicShotOf('knight', 'attack')).toBeUndefined();
    for (const clip of attackClips(anims)) {
      const shot = basicShotOf('priest', clip);
      expect(shot !== undefined && fxMeta(shot)?.loop, `${clip}: ${shot} flies`).toBe(true);
      expect(shot !== undefined && LIGHT_SHOTS[shot] !== undefined, `${clip}: light`).toBe(true);
      expect(SHOT_FROM.priest?.[clip], `${clip}: where it leaves from`).toBeDefined();
      const anim = anims[clip];
      if (anim !== undefined) expect(impactMs(anim), `${clip} has a release`).toBeGreaterThan(0);
    }
    for (const shots of Object.values(CLIP_SHOT)) for (const shot of Object.values(shots)) expect(fx.has(shot), shot).toBe(true);
    for (const [shot, light] of Object.entries(LIGHT_SHOTS)) {
      expect(fx.has(shot), shot).toBe(true);
      expect(fxMeta(light.land)?.loop, light.land).toBe(false);
    }
  });
});

describe('signs instead of words', () => {
  it('a heal, a block, an invulnerable hit, and a second strike are pixel art of the atlas', () => {
    expect(fxMeta(HEAL_BLOOM)?.loop).toBe(false);
    for (const sign of Object.values(BLOW_SIGNS)) expect(fxMeta(sign.fx)?.loop, sign.fx).toBe(false);
    // An invulnerable hero under several attackers shows one glance, not one per hit.
    expect(BLOW_SIGNS.invulnerable.gapMs).toBeGreaterThanOrEqual(300);
  });
});
