import { describe, expect, it } from 'vitest';
import { ABILITIES } from '@/data/abilities';
import { CLASS_KEYS } from '@/data/classes';
import { effectDef } from '@/data/effects';
import { ULTIMATES } from '@/data/ultimates';
import {
  ABILITY_LOOKS,
  AURA_PREFIX,
  CLASS_SHOT,
  EFFECT_LOOKS,
  MARK_UP,
  PENDING_ABILITIES,
  SILENT_EFFECTS,
  bandCount,
  hasOwnLook,
  lookFx,
  lookUp,
  tileCount,
  wornLooks,
  type WornEffect,
} from '@/game/render/abilityFx';
import { MAX_BLOW_WAIT_MS, MAX_RATE, blowRate, impactMs } from '@/game/render/attackLead';
import { categorize } from '@/game/render/effectAuras';
import { figureMeta } from '@/game/render/figureData';
import { FX_KEYS, SKIN_NAMES, fxFrameAt, fxMeta, fxTotalMs, hasSkin } from '@/game/render/fxData';
import { attackClips, heroAbilityClip, pickAttackClip } from '@/game/render/heroClips';

const heroAbilities = [
  ...Object.keys(ABILITIES).filter((key) => CLASS_KEYS.some((c) => key.startsWith(`${c}_`))),
  ...Object.values(ULTIMATES).map((u) => u.key),
];
const fx = new Set(FX_KEYS);
const worn = (defKey: string, over: Partial<WornEffect> = {}): WornEffect => ({ defKey, sourceId: 'h1', remainingMs: 4000, totalMs: 6000, ...over });

describe('the looks of abilities', () => {
  it('every hero ability and ultimate has a look or is listed as pending — never both', () => {
    const missing = heroAbilities.filter((key) => ABILITY_LOOKS[key] === undefined && !PENDING_ABILITIES.includes(key));
    expect(missing, 'abilities with no look and not listed as pending').toEqual([]);
    expect(PENDING_ABILITIES.filter((key) => ABILITY_LOOKS[key] !== undefined), 'done but still listed as pending').toEqual([]);
    expect(PENDING_ABILITIES.filter((key) => !heroAbilities.includes(key)), 'pending keys the data does not know').toEqual([]);
    expect(Object.keys(ABILITY_LOOKS).filter((key) => !heroAbilities.includes(key)), 'looks for abilities the data does not know').toEqual([]);
  });

  it('the whole Knight and the whole Ranger are done', () => {
    expect(heroAbilities.filter((key) => (key.startsWith('knight_') || key.startsWith('ranger_')) && ABILITY_LOOKS[key] === undefined)).toEqual([]);
  });

  it('every shot, landing and band effect an entry names exists; shots loop, the rest play once', () => {
    for (const [key, look] of Object.entries(ABILITY_LOOKS)) {
      if (look.shot !== undefined) {
        expect(fxMeta(look.shot.fx)?.loop, `${key}: shot ${look.shot.fx} loops`).toBe(true);
        if (look.shot.land !== undefined) expect(fxMeta(look.shot.land)?.loop, `${key}: landing ${look.shot.land}`).toBe(false);
      }
      if (look.shotTo !== undefined) expect(look.shot, `${key}: fired at the wave, so it has a shot`).toBeDefined();
      for (const scatter of look.band ?? []) {
        expect(fxMeta(scatter.fx)?.loop, `${key}: band ${scatter.fx}`).toBe(false);
        expect(scatter.every).toBeGreaterThan(0);
        if (scatter.afterShot === true) expect(look.shotTo, `${key}: a band after the shot needs the shot`).toBeDefined();
      }
    }
    for (const fxKey of Object.values(CLASS_SHOT)) expect(fxMeta(fxKey)?.loop, `class shot ${fxKey}`).toBe(true);
  });

  it('Rapid Fire is green arrows climbing round him: most behind, a few in front, a burst on the cast', () => {
    const got = wornLooks([worn('buff_fast_fire'), worn('buff_focused_fire')], { id: 'h1', classKey: 'ranger' });
    expect(got.slots.get('behind')?.look).toMatchObject({ fx: 'tempo_up', start: 'tempo_burst' });
    expect(got.slots.get('body')?.look.fx).toBe('tempo_up_front');
    expect(got.skin).toBeNull();
  });

  it('every effect an entry names exists in the exported atlas', () => {
    for (const [key, look] of Object.entries(ABILITY_LOOKS)) {
      for (const burst of look.cast ?? []) expect(fx.has(burst.fx), `${key}: cast effect ${burst.fx}`).toBe(true);
      if (look.hit !== undefined) expect(fx.has(look.hit), `${key}: hit effect ${look.hit}`).toBe(true);
    }
    for (const [key, looks] of Object.entries(EFFECT_LOOKS)) {
      for (const look of looks) {
        for (const name of [look.fx, look.big, look.start, look.end]) {
          if (name !== undefined) expect(fx.has(name), `${key}: effect ${name}`).toBe(true);
        }
        for (const sheet of [look.skin, look.rim]) {
          if (sheet === undefined) continue;
          expect(SKIN_NAMES, `${key}: sheet ${sheet}`).toContain(sheet);
          for (const hero of CLASS_KEYS) expect(hasSkin(hero, sheet), `${hero} has the ${sheet} sheet`).toBe(true);
        }
        if (look.fx !== undefined) expect(look.slot, `${key}: a looping effect needs a slot`).toBeDefined();
      }
    }
  });

  it('every look is for an effect the data knows, and a lasting loop loops', () => {
    for (const [key, looks] of Object.entries(EFFECT_LOOKS)) {
      // A party aura has no effect in the data: its stand-in key names the ability that is the aura (test/game/priestFx).
      if (!key.startsWith(AURA_PREFIX)) expect(() => effectDef(key), key).not.toThrow();
      for (const look of looks) {
        if (look.fx !== undefined) expect(fxMeta(look.fx)?.loop, `${key}: ${look.fx} loops`).toBe(true);
        for (const shot of [look.start, look.end]) if (shot !== undefined) expect(fxMeta(shot)?.loop, `${key}: ${shot} is a one-shot`).toBe(false);
      }
    }
    for (const key of SILENT_EFFECTS) expect(() => effectDef(key), key).not.toThrow();
  });

  it('every lasting effect a covered ability applies is drawn here, not as a category overlay', () => {
    for (const key of Object.keys(ABILITY_LOOKS)) {
      const def = ABILITIES[key];
      if (def === undefined) continue; // an ultimate: its effect is checked below
      for (const applied of def.applies) {
        if (effectDef(applied.effectKey).durationMs <= 0 && applied.durationMsOverride === undefined) continue; // instant
        expect(hasOwnLook(applied.effectKey), `${key} applies ${applied.effectKey}`).toBe(true);
        expect(categorize({ defKey: applied.effectKey, sourceId: 'x', remainingMs: 1, stacks: 1, value: 1 })).toBeNull();
      }
    }
    expect(hasOwnLook('fx_invuln')).toBe(true); // Last Stand
  });

  it('a cast effect played "at the blow" belongs to a clip that has one', () => {
    for (const [key, look] of Object.entries(ABILITY_LOOKS)) {
      const classKey = key.split('_')[0] ?? '';
      const clip = heroAbilityClip(classKey, key);
      const anim = figureMeta(classKey)?.anims[clip];
      expect(anim, `${key}: clip ${clip}`).toBeDefined();
      if (anim !== undefined && (look.cast ?? []).some((burst) => burst.atBlow === true)) {
        expect(impactMs(anim), `${key}: ${clip} has a blow to wait for`).toBeGreaterThan(0);
      }
    }
  });
});

describe('wornLooks', () => {
  it('gives one look per slot and the skin of the effect on the body', () => {
    const got = wornLooks([worn('buff_guard_block'), worn('buff_battlecry_ad'), worn('buff_battlecry_crit')], { id: 'h1', classKey: 'knight' });
    expect(got.skin).toBe('stone');
    expect(got.slots.get('body')?.look.fx).toBe('stone_glint');
    expect(got.slots.get('ground')?.look.fx).toBe('battlecry_flames');
    expect(got.slots.size).toBe(2);
  });

  it('Last Stand outranks Stone Skin for the skin and Bloodlust for the place behind the body', () => {
    const got = wornLooks([worn('fx_invuln'), worn('buff_guard_block', { remainingMs: 5900 }), worn('buff_bloodlust_as', { remainingMs: 5900 })], { id: 'h1', classKey: 'knight' });
    expect(got.skin).toBe('gold');
    expect(got.slots.get('behind')?.look.fx).toBe('laststand_rays');
  });

  it('with equal rank the effect applied last takes the slot', () => {
    const got = wornLooks([worn('buff_bloodlust_as', { remainingMs: 1000 }), worn('buff_fast_fire', { remainingMs: 5800 })], { id: 'h1', classKey: 'ranger' });
    expect(got.slots.get('behind')?.effectKey).toBe('buff_fast_fire');
  });

  it("the wall of light is the Knight's own Bulwark only; the standard stands by whoever planted it", () => {
    const knight = { id: 'h1', classKey: 'knight' };
    expect(wornLooks([worn('fx_shield')], knight).slots.get('front')?.look.fx).toBe('bulwark_wall');
    // A Priest's shield on him is the same effect from someone else: her glass, never his wall (test/game/priestFx).
    expect(wornLooks([worn('fx_shield', { sourceId: 'h3', remainingMs: 3000, totalMs: 4000 })], knight).slots.get('front')?.look.fx).toBe('ward_front');
    expect(wornLooks([worn('fx_shield', { sourceId: 'h3' })], { id: 'h3', classKey: 'priest' }).slots.get('front')?.look.fx).toBe('ward_front'); // her own, on herself: her glass too
    const line = [worn('buff_holdline_dr')];
    expect([...wornLooks(line, knight).slots.keys()].sort()).toEqual(['beside', 'low']);
    expect([...wornLooks(line, { id: 'h2', classKey: 'ranger' }).slots.keys()]).toEqual(['low']);
  });

  it('an enemy that deals less damage bleeds and wears the snapped blade; a slowed one drags irons', () => {
    const got = wornLooks([worn('debuff_weaken'), worn('debuff_cripple')], { id: 'e1' });
    expect(got.slots.get('body')?.look.fx).toBe('sapped');
    expect(got.slots.get('overhead')?.look.fx).toBe('weak_mark');
    expect(got.slots.get('feet')?.look.fx).toBe('hobble');
    expect(got.skin).toBeNull();
  });

  it('effects without a look give nothing', () => {
    expect(wornLooks([worn('buff_enrage_cdr'), worn('nonsense')], { id: 'h1' })).toEqual({ slots: new Map(), skin: null, rim: null });
  });
});

describe('shots and bands', () => {
  it("a Ranger shoots the pipeline's arrow, whatever is on her; a class that throws nothing has no shot", () => {
    expect(CLASS_SHOT.ranger).toBe('arrow');
    expect(CLASS_SHOT.knight).toBeUndefined();
  });

  it('a look waits for what lays it: the enemy does not burn before the arrow lands', () => {
    const fresh = worn('fx_burn', { remainingMs: 3900, totalMs: 4000 }); // on for 100 ms
    const landed = worn('fx_burn', { remainingMs: 3200, totalMs: 4000 }); // on for 800 ms
    expect(wornLooks([fresh], { id: 'e1' }).slots.size).toBe(0);
    expect(wornLooks([landed], { id: 'e1' }).slots.get('body')?.look.fx).toBe('burning');
  });

  it('a band scatters at least three one-shots, more over a wide wave', () => {
    expect(bandCount(20, 9)).toBe(3);
    expect(bandCount(90, 9)).toBe(10);
    expect(bandCount(200, 22)).toBe(9);
  });

  it("the hunter's mark sits on the middle of the body, the open wound below it, everything else on the ground line", () => {
    const got = wornLooks([worn('fx_mark'), worn('debuff_weakspot'), worn('fx_tar'), worn('debuff_tar_slow')], { id: 'e1' });
    const mark = got.slots.get('mark');
    const wound = got.slots.get('body');
    const tar = got.slots.get('feet');
    expect(mark?.look.fx).toBe('hunter_mark');
    expect(wound?.look.fx).toBe('weak_spot');
    expect(tar?.look.fx).toBe('tarred');
    if (mark === undefined || wound === undefined || tar === undefined) return;
    expect(lookUp('mark', mark.look)).toBe(MARK_UP);
    expect(lookFx(mark.look, 22)).toBe('hunter_mark'); // a beast wears the small sight…
    expect(lookFx(mark.look, 120)).toBe('hunter_mark_big'); // …a boss the large one
    expect(fxMeta('hunter_mark_big')?.loop).toBe(true);
    expect(lookUp('body', wound.look)).toBeLessThan(MARK_UP);
    expect(lookUp('feet', tar.look)).toBe(0);
  });
});

describe('tileCount', () => {
  it('one copy on a small body, more across a boss', () => {
    expect(tileCount(18, 24)).toBe(1);
    expect(tileCount(30, 24)).toBe(1);
    expect(tileCount(60, 24)).toBe(2);
    expect(tileCount(110, 24)).toBe(4);
  });
});

describe('fxFrameAt', () => {
  const meta = { x: 0, y: 0, w: 8, h: 8, cols: 3, ax: 4, ay: 8, n: 3, ms: [100, 50, 50], loop: false };
  it('steps through a one-shot by its own frame times and ends', () => {
    expect(fxTotalMs(meta)).toBe(200);
    expect([0, 99, 100, 149, 150, 199].map((t) => fxFrameAt(meta, t))).toEqual([0, 0, 1, 1, 2, 2]);
    expect(fxFrameAt(meta, 200)).toBe(-1);
  });
  it('wraps a loop', () => {
    expect(fxFrameAt({ ...meta, loop: true }, 200)).toBe(0);
    expect(fxFrameAt({ ...meta, loop: true }, 360)).toBe(2);
  });
  it('every exported effect has a frame time per frame and an anchor inside its cell', () => {
    for (const key of FX_KEYS) {
      const m = fxMeta(key);
      expect(m, key).toBeDefined();
      if (m === undefined) continue;
      expect(m.ms.length, key).toBe(m.n);
      expect(m.ax >= 0 && m.ax <= m.w && m.ay >= 0 && m.ay <= m.h, `${key}: anchor`).toBe(true);
    }
  });
});

describe('basic-attack variants', () => {
  it('every hero has three basic attacks, each with a blow', () => {
    for (const hero of ['knight', 'ranger', 'priest']) {
      const anims = figureMeta(hero)?.anims ?? {};
      expect(attackClips(anims), hero).toEqual(['attack', 'attack2', 'attack3']);
      for (const clip of attackClips(anims)) {
        const anim = anims[clip];
        expect(anim, `${hero}.${clip}`).toBeDefined();
        if (anim !== undefined) expect(impactMs(anim), `${hero}.${clip} has a blow`).toBeGreaterThan(0);
      }
    }
    expect(attackClips({})).toEqual([]);
  });

  it("every clip the Ranger shoots with has a release the arrow can wait for", () => {
    const anims = figureMeta('ranger')?.anims ?? {};
    for (const clip of ['attack', 'attack2', 'attack3', 'aimed', 'volley', 'quick']) {
      const anim = anims[clip];
      expect(anim, clip).toBeDefined();
      if (anim === undefined) continue;
      const windup = impactMs(anim);
      expect(windup, `${clip}: a release`).toBeGreaterThan(0);
      expect(windup, `${clip}: short enough to be hurried into the wait`).toBeLessThanOrEqual(MAX_BLOW_WAIT_MS * MAX_RATE);
    }
    // The throws and the pointed arm are short: they play as drawn, and their effect waits for them.
    for (const clip of ['lob', 'sow', 'point', 'haste']) {
      const anim = anims[clip];
      expect(anim, clip).toBeDefined();
      if (anim !== undefined) expect(blowRate(anim), clip).toBe(1);
    }
  });

  it('picks any clip but the one just played, by the roll', () => {
    const clips = ['attack', 'attack2', 'attack3'];
    expect(pickAttackClip(clips, 'attack', 0)).toBe('attack2');
    expect(pickAttackClip(clips, 'attack', 0.99)).toBe('attack3');
    expect(pickAttackClip(clips, 'attack2', 0.4)).toBe('attack');
    expect(pickAttackClip(clips, undefined, 0.5)).toBe('attack2');
    expect(pickAttackClip(['attack'], 'attack', 0.7)).toBe('attack'); // nothing to choose
    for (let i = 0; i < 20; i++) expect(pickAttackClip(clips, 'attack3', i / 20)).not.toBe('attack3');
  });
});
