import { describe, it, expect } from 'vitest';
import { CAST_CUES, DEADEYE_DEFAULT, DEADEYE_SHOT, DOUBLE_LOOKS, GROUND_FIRE_FX, KIT_CASTS, KIT_HITS, KIT_TICKS, LEECH_FX, MIRROR_CUE, PANES, SHOVE, SUMMON_LOOKS, cueVictim, deadeyeShot, litPaneCount, paneLight, summonFigureMeta, summonLift } from '@/game/render/bossFx';
import { EFFECT_LOOKS, wornLooks } from '@/game/render/abilityFx';
import { areaBlow } from '@/game/render/enemyFx';
import { fxMeta, hasSkin, panePlace, paneSheetMeta } from '@/game/render/fxData';
import { figureMeta } from '@/game/render/figureData';
import { CLASS_KEYS } from '@/data/classes';
import { effectSign } from '@/game/render/stripHud';
import { ABILITIES } from '@/data/abilities';
import { BOSS_AFFIX, MECHANIC, SUMMONS, WORLD_BOSS_MECHANIC } from '@/data/bossKit';
import { WORLDS } from '@/data/worlds';

// The boss kit on the strip (render/bossFx): every mechanic and affix has its picture, and the art it names exists.

const exists = (fx: string | undefined): boolean => fx !== undefined && fxMeta(fx) !== undefined;

describe('summons', () => {
  it('every summon of the data has a figure: three effects that share a cell and an anchor, or — a hero\'s double — that hero in a skin', () => {
    expect([...Object.keys(SUMMON_LOOKS), ...Object.keys(DOUBLE_LOOKS)].sort()).toEqual(Object.keys(SUMMONS).sort());
    for (const [key, look] of Object.entries(DOUBLE_LOOKS)) {
      for (const hero of CLASS_KEYS) {
        expect(hasSkin(hero, look.skin), `${key}: ${hero}`).toBe(true);
        expect(hasSkin(hero, look.rim), `${key}: ${hero} rim`).toBe(true);
      }
      for (const fx of [look.enter, look.gone, look.land]) expect(fxMeta(fx)?.loop, fx).toBe(false);
      expect(fxMeta(look.shot)?.loop).toBe(true);
      for (const hero of look.shooters) expect(CLASS_KEYS as readonly string[]).toContain(hero);
      expect(look.dropPx).toBeLessThan(look.mirrorUp); // it comes down from the mirror, not from above it
    }
    expect(SUMMONS.reflection?.key).toBe(MECHANIC.mirror.reflection.summon);
    for (const [key, look] of Object.entries(SUMMON_LOOKS)) {
      const cells = [look.fly, look.attack, look.death].map((fx) => fxMeta(fx));
      expect(cells.every((m) => m !== undefined), key).toBe(true);
      expect(new Set(cells.map((m) => `${m?.w}x${m?.h}@${m?.ax},${m?.ay}`)).size, key).toBe(1);
      expect(fxMeta(look.fly)?.loop).toBe(true);
      expect(fxMeta(look.attack)?.loop).toBe(false);
      const meta = summonFigureMeta(key);
      expect(Object.keys(meta?.anims ?? {}).sort()).toEqual(['attack', 'death', 'idle', 'run']);
      expect(meta?.anims.idle).toEqual(meta?.anims.run); // it never lands
      expect(meta?.box[1] ?? 0).toBeLessThan(0);
    }
    expect(summonFigureMeta('nope')).toBeUndefined();
  });

  it('they hover over the heroes\' heads, each at its own height, bobbing a little', () => {
    const crow = SUMMON_LOOKS.crow;
    if (crow === undefined) throw new Error('no crow');
    const heights = [0, 1, 2].map((slot) => summonLift(crow, slot, 0));
    expect(new Set(heights).size).toBeGreaterThan(1);
    for (let ms = 0; ms < 3000; ms += 100) {
      const lift = summonLift(crow, 1, ms);
      expect(lift).toBeGreaterThanOrEqual(crow.hover - crow.bob - crow.stagger);
      expect(lift).toBeLessThanOrEqual(crow.hover + crow.bob + crow.stagger);
    }
  });
});

describe('mechanics', () => {
  it('every mechanic of the data shows a cue while it is wound up and is the kit\'s when it goes off', () => {
    for (const mechanic of new Set(Object.values(WORLD_BOSS_MECHANIC))) {
      const key = MECHANIC[mechanic].abilityKey;
      expect(ABILITIES[key]?.castTimeMs ?? 0, key).toBeGreaterThan(0); // telegraphed: there is a cast bar to fill
      // A mechanic that is an area blow (Resaca) warns on the ground like the others and runs its own wave.
      const blow = areaBlow(key);
      if (blow !== undefined) {
        expect(exists(blow.warn?.fx) && exists(blow.warn?.hot), key).toBe(true);
        continue;
      }
      expect(exists(CAST_CUES[key]?.fx), key).toBe(true);
      expect(fxMeta(CAST_CUES[key]?.fx ?? '')?.loop, key).toBe(true);
      expect(KIT_CASTS[key], key).toBeDefined();
    }
    for (const look of Object.values(KIT_CASTS)) for (const fx of [look.fx, look.party]) if (fx !== undefined) expect(exists(fx), fx).toBe(true);
    expect(new Set(Object.values(WORLD_BOSS_MECHANIC)).size).toBe(WORLDS.length); // one for every world's boss
    for (const key of [...Object.keys(CAST_CUES), ...Object.keys(KIT_CASTS), ...Object.keys(KIT_HITS)]) expect(ABILITIES[key], key).toBeDefined();
  });

  it('the bolt falls, leaps and lands; the roots hold the hero they were coming for', () => {
    const bolt = KIT_HITS.boss_chain_bolt;
    if (bolt?.kind !== 'bolt') throw new Error('no bolt');
    expect([bolt.strike, bolt.jump, bolt.land].every(exists)).toBe(true);
    expect(fxMeta(bolt.jump)?.loop).toBe(true); // it flies
    const heroes = [{ id: 'tank', alive: true, dealtToBoss: 10 }, { id: 'archer', alive: true, dealtToBoss: 90 }, { id: 'healer', alive: true }];
    expect(cueVictim(heroes)?.id).toBe('archer');
    expect(cueVictim([{ id: 'tank', alive: true }, { id: 'archer', alive: true }])?.id).toBe('tank');
    expect(cueVictim([{ id: 'archer', alive: false, dealtToBoss: 90 }, { id: 'healer', alive: true }])?.id).toBe('healer');
    const held = wornLooks([{ defKey: 'debuff_rooted', sourceId: 'boss', remainingMs: 4000, totalMs: 5000 }], { id: 'archer', classKey: 'ranger' });
    expect(held.slots.get('feet')?.look.fx).toBe('roots_bind');
    expect(effectSign('debuff_rooted')).toBe('roots');
  });
});

describe('worlds 4–6', () => {
  it('Culpa: the brand over every hero while it chooses, on the marked one while it lasts, a pang with each toll', () => {
    expect(CAST_CUES.boss_guilt?.on).toBe('party');
    const worn = wornLooks([{ defKey: 'debuff_guilt', sourceId: 'boss', remainingMs: 4000, totalMs: 8000 }], { id: 'archer', classKey: 'ranger' });
    expect(worn.slots.get('mark')?.look.fx).toBe('guilt_brand');
    expect(exists(worn.slots.get('mark')?.look.start)).toBe(true);
    expect(effectSign('debuff_guilt')).toBe('guilt');
    expect(exists(KIT_TICKS.boss_guilt?.fx)).toBe(true);
    expect(KIT_TICKS.boss_guilt?.color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('Silencio dorado: rings round the Abbot, his toll, and a stopped dial behind every hero', () => {
    expect(CAST_CUES.boss_gild?.on).toBe('caster');
    expect(exists(KIT_CASTS.boss_gild?.fx)).toBe(true);
    const worn = wornLooks([{ defKey: 'debuff_gilded', sourceId: 'boss', remainingMs: 4000, totalMs: 6000 }], { id: 'k', classKey: 'knight' });
    expect(worn.slots.get('behind')?.look.fx).toBe('gilded_halo');
    expect(effectSign('debuff_gilded')).toBe('gilded');
  });

  it('Resaca: a wave of its own through the party, and heroes thrown back are swept, not walked', () => {
    const blow = areaBlow('boss_undertow');
    expect(blow?.wave.kind).toBe('front');
    for (const fx of [blow?.origin, blow?.jolt, blow?.wave.fx]) expect(exists(fx), fx).toBe(true);
    expect(blow?.wave.fx).not.toBe(areaBlow('boss_shockwave')?.wave.fx);
    expect(SHOVE.speedMult).toBeGreaterThan(1);
    expect(SHOVE.fromPx).toBeLessThan(50); // the mildest drag (Normal) is 50 px
    expect(areaBlow(SHOVE.blow)).toBe(blow); // …and each when ITS wave reaches him (render/shoveDelay)
    // The sea of world 6: navy water and bone foam — its own art, not the green of a marsh.
    expect(blow?.warn?.fx).toBe('warn_tide');
  });
});

describe('worlds 7–10', () => {
  it('Esporas: billows round the Angel; caps on the hero while they last, withering when a heal clears them', () => {
    expect(CAST_CUES.boss_spores?.on).toBe('caster');
    const worn = wornLooks([{ defKey: 'debuff_spores', sourceId: 'boss', remainingMs: 9000, totalMs: 20_000 }], { id: 'p', classKey: 'priest' });
    const look = worn.slots.get('feet')?.look;
    expect(look?.fx).toBe('spores_grow');
    expect(exists(look?.start) && exists(look?.end)).toBe(true);
    expect(effectSign('debuff_spores')).toBe('spores');
  });

  it('Hoja al rojo: the path splits under every hero, the blade drives up, and the ground burns under them — under the fighters', () => {
    expect(CAST_CUES.boss_red_blade).toMatchObject({ on: 'party', under: true });
    expect(exists(KIT_CASTS.boss_red_blade?.party)).toBe(true);
    expect(exists(GROUND_FIRE_FX) && fxMeta(GROUND_FIRE_FX)?.loop).toBe(true);
    expect(KIT_TICKS.boss_red_blade?.color).toMatch(/^#[0-9a-f]{6}$/);
    expect(EFFECT_LOOKS.boss_red_blade).toBeUndefined(); // nothing is worn: it is the ground that burns
  });

  it('Balanza: a pan over every hero, and it comes down on each one it takes life from', () => {
    expect(CAST_CUES.boss_scales?.on).toBe('party');
    const hit = KIT_HITS.boss_scales;
    expect(hit?.kind === 'burst' && exists(hit.fx)).toBe(true);
  });

  it('Espejos: a mirror closing before the Unmaker, what it reflects coming back as shards, what it keeps flying into it', () => {
    expect(CAST_CUES.boss_mirror?.on).toBe('caster');
    expect(exists(KIT_CASTS.boss_mirror?.fx)).toBe(true);
    const hit = KIT_HITS.boss_mirror;
    if (hit?.kind !== 'shot') throw new Error('no shards');
    expect(exists(hit.shot) && exists(hit.land)).toBe(true);
    expect(fxMeta(hit.shot)?.loop).toBe(true);
    expect(MIRROR_CUE.cue).toBe('mirror');
    expect(exists(MIRROR_CUE.boon)).toBe(true);
  });
});

describe('affixes', () => {
  it('the shell, the venom and the frenzy are worn through the looks table; the leech has its one-shot', () => {
    for (const key of [BOSS_AFFIX.armored.effectKey, BOSS_AFFIX.venomous.effectKey, BOSS_AFFIX.frenzied.effectKey]) {
      const looks = EFFECT_LOOKS[key] ?? [];
      expect(looks.length, key).toBeGreaterThan(0);
      for (const look of looks) for (const fx of [look.fx, look.start, look.end]) if (fx !== undefined) expect(exists(fx), fx).toBe(true);
    }
    expect(EFFECT_LOOKS[BOSS_AFFIX.armored.effectKey]?.[0]?.tile).toBe(true); // over the whole of a wide boss
    expect(EFFECT_LOOKS[BOSS_AFFIX.armored.effectKey]?.[0]?.end).toBeDefined(); // it is seen breaking
    expect(effectSign(BOSS_AFFIX.venomous.effectKey)).toBe('venom');
    // Seismic: the ground at its feet, all along a wide boss, for as long as it carries the marker.
    const tremor = EFFECT_LOOKS[BOSS_AFFIX.seismic.effectKey]?.[0];
    expect(tremor?.tile).toBe(true);
    expect(exists(tremor?.fx)).toBe(true);
    expect(fxMeta(tremor?.fx ?? '')?.h ?? 99).toBeLessThanOrEqual(12); // low: it hides neither the cast bar nor a figure
    expect(exists(LEECH_FX)).toBe(true);
  });

  it('Deadeye: every boss sends its own thing (a figure not listed, the default) — all of it drawn and flying', () => {
    const deadeye = KIT_HITS[BOSS_AFFIX.deadeye.abilityKey];
    if (deadeye?.kind !== 'deadeye') throw new Error('no deadeye');
    expect(exists(deadeye.mark) && exists(deadeye.land)).toBe(true);
    // Every boss of every world sends its own thing; each WORLD boss a thing no other world boss sends.
    for (const world of WORLDS) {
      for (const key of [world.creatures.boss.key, world.worldBoss?.key ?? '']) expect(DEADEYE_SHOT[key], key).toBeDefined();
    }
    const walls = WORLDS.map((w) => DEADEYE_SHOT[w.worldBoss?.key ?? '']);
    expect(new Set(walls).size).toBe(WORLDS.length);
    expect(Object.values(DEADEYE_SHOT)).not.toContain(DEADEYE_DEFAULT);
    expect(deadeyeShot('a_figure_drawn_later')).toBe(DEADEYE_DEFAULT);
    for (const fx of [...Object.values(DEADEYE_SHOT), DEADEYE_DEFAULT]) {
      expect(exists(fx), fx).toBe(true);
      expect(fxMeta(fx)?.loop, fx).toBe(true);
    }
    for (const key of Object.keys(DEADEYE_SHOT)) expect(WORLDS.some((w) => w.creatures.boss.key === key || w.worldBoss?.key === key), key).toBe(true);
  });
});

describe('the six mirrors of the Unmaker', () => {
  const meta = paneSheetMeta('unmaker');

  it('lights its panes in an order that names each of them once, as many as the data says', () => {
    expect([...PANES.order].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    expect(PANES.order).toHaveLength(MECHANIC.mirror.panes);
    expect(PANES.effectKey).toBe(MECHANIC.mirror.paneEffectKey);
    expect(PANES.breaking).toBe(MECHANIC.mirror.shatter.abilityKey);
    expect(fxMeta(PANES.flash)?.loop).toBe(false);
    expect(fxMeta(PANES.break)?.loop).toBe(false);
    expect(litPaneCount([])).toBe(0);
    expect(litPaneCount([{ defKey: PANES.effectKey, stacks: 4, remainingMs: 1000 }])).toBe(4);
    expect(litPaneCount([{ defKey: PANES.effectKey, stacks: 9, remainingMs: 1000 }])).toBe(6);
    expect(litPaneCount([{ defKey: PANES.effectKey, stacks: 4, remainingMs: 0 }])).toBe(0);
  });

  it('has every pane, lit, for every frame of every clip the figure fights in — laid over the figure\'s own', () => {
    const figure = figureMeta('unmaker');
    if (meta === undefined || figure === undefined) throw new Error('no panes');
    for (const [clip, anim] of Object.entries(figure.anims)) {
      if (clip === 'death') {
        expect(meta.anims[clip]).toBeUndefined(); // nothing is lit on a corpse
        continue;
      }
      expect(meta.anims[clip]?.frames, clip).toHaveLength(anim.n);
      for (let frame = 0; frame < anim.n; frame++) {
        for (let pane = 0; pane < 6; pane++) {
          const placed = panePlace(meta, clip, frame, pane);
          if (placed === undefined) continue;
          const [dx, dy, cx, cy] = placed.at;
          // inside the figure's cell, its middle inside its own cell
          expect(dx).toBeGreaterThanOrEqual(-figure.root);
          expect(dx + meta.w).toBeLessThanOrEqual(figure.w - figure.root + meta.w);
          expect(dy).toBeGreaterThanOrEqual(-figure.ground);
          expect(cx).toBeGreaterThanOrEqual(dx);
          expect(cx).toBeLessThan(dx + meta.w);
          expect(cy).toBeGreaterThanOrEqual(dy);
          expect(cy).toBeLessThan(dy + meta.h);
        }
      }
      // standing, all six show
      if (clip === 'idle') for (let pane = 0; pane < 6; pane++) expect(panePlace(meta, clip, 0, pane), `pane ${pane}`).toBeDefined();
    }
    expect(panePlace(meta, 'idle', 0, 0)?.cell).toBe(0);
    expect(panePlace(meta, 'idle', 1, 2)?.cell).toBe(8);
    expect(panePlace(meta, 'nope', 0, 0)).toBeUndefined();
    expect(paneSheetMeta('crowmother')).toBeUndefined();
  });

  it('a pane comes up to its light, breathes, and flickers while their breaking is wound up', () => {
    expect(paneLight(0, 0, false)).toBe(0);
    expect(paneLight(PANES.lightMs / 2, 0, false)).toBeLessThan(paneLight(PANES.lightMs, 0, false));
    for (let ms = 0; ms < 4000; ms += 50) {
      const light = paneLight(5000, ms, false);
      expect(light).toBeGreaterThanOrEqual(PANES.breathe[0] - 1e-9);
      expect(light).toBeLessThanOrEqual(PANES.breathe[1] + 1e-9);
    }
    expect(new Set([0, 1, 2, 3].map((k) => paneLight(5000, k * PANES.flickerMs, true)))).toEqual(new Set([1, PANES.flicker]));
  });

  it('their breaking is an area blow with a warning of its own', () => {
    const blow = areaBlow(MECHANIC.mirror.shatter.abilityKey);
    expect(blow?.warn?.fx).toBe('warn_glass');
    expect(blow?.wave.kind).toBe('bursts');
  });
});
