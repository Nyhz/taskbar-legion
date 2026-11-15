import { describe, expect, it } from 'vitest';
import { HERO_BACK, PET_FLIGHT, PET_STYLES, petBaseClip, petLanded, petPastLine, petShadow, petStart, petStep, petStyle, type PetClip, type PetScene, type PetState, type PetStyle } from '@/game/render/petMotion';
import { PET_ATLAS_MAX, PET_FIGURES, petAtlasSize, petMeta } from '@/game/render/petData';
import { PET_KEYS } from '@/data/pets';
import { WALK_SPEED } from '@/data/field';

const FRAME = 1000 / 60;
const OWL = petStyle('scholar_owl');
const COIN = petStyle('coin_sprite');
const CAT = petStyle('lucky_cat');

interface Run {
  s: PetState;
  rearX: number;
  clips: PetClip[];
}

/** Run `ms` of frames; the party's last hero walks at `speed` px/s. Checks the one rule on every frame and
 *  notes every clip the pet passes through, in order. */
function run(style: PetStyle, s: PetState, rearX: number, ms: number, opts: { speed?: number; fallen?: boolean; hold?: boolean; leftX?: number } = {}): Run {
  let state = s;
  let x = rearX;
  const clips: PetClip[] = [];
  for (let t = 0; t < ms; t += FRAME) {
    x += ((opts.speed ?? 0) * FRAME) / 1000;
    const scene: PetScene = { rearX: x, fallen: opts.fallen ?? false, hold: opts.hold, leftX: opts.leftX };
    state = petStep(state, scene, FRAME, style);
    expect(petPastLine(state, x, style), `past the line at x ${state.x - x}`).toBe(false);
    expect(state.alt).toBeGreaterThanOrEqual(0);
    const clip = petBaseClip(state, style);
    if (clips[clips.length - 1] !== clip) clips.push(clip);
  }
  return { s: state, rearX: x, clips };
}

const at = (rearX: number): PetScene => ({ rearX, fallen: false });

describe('a flier: the Scholar Owl', () => {
  it('flies in and settles behind the last hero, hovering', () => {
    const { s } = run(OWL, petStart(at(400), OWL), 400, 3000);
    expect(s.mode).toBe('hover');
    expect(Math.abs(s.x - (400 - OWL.homeBehind))).toBeLessThan(PET_FLIGHT.driftX + 1.5);
    expect(Math.abs(s.alt - OWL.homeAlt)).toBeLessThan(PET_FLIGHT.driftAlt + 1.5);
    expect(petBaseClip(s, OWL)).toBe('idle');
    expect(s.facing).toBe(1);
  });

  it('comes down to stand once the party has stood a while — braking, then touching down — and stays put', () => {
    const down = run(OWL, petStart(at(400), OWL, false), 400, PET_FLIGHT.perchAfterMs + 2500);
    expect(petLanded(down.s)).toBe(true);
    expect(down.clips).toEqual(['idle', 'land', 'settle', 'perch']); // no dry change from flying to standing
    const later = run(OWL, down.s, 400, 4000).s;
    expect(later.x).toBe(down.s.x);
    expect(later.alt).toBe(0);
  });

  it('crouches before it leaves the path, comes up to the last hero while the party walks, and falls back when it stops', () => {
    const perched = run(OWL, petStart(at(400), OWL, false), 400, PET_FLIGHT.perchAfterMs + 2500).s;
    const walk = run(OWL, perched, 400, 4000, { speed: WALK_SPEED });
    expect(walk.clips.slice(0, 2)).toEqual(['perch', 'takeoff']);
    expect(walk.s.mode).toBe('travel');
    expect(Math.abs(walk.s.alt - OWL.travelAlt)).toBeLessThan(2);
    // it keeps up with a walking party instead of being dragged behind it: within a few pixels of the line
    expect(walk.rearX - OWL.clearBehind - walk.s.x).toBeLessThan(12);
    expect(petBaseClip(walk.s, OWL)).toBe('move');
    expect(walk.s.facing).toBe(1);
    const stop = run(OWL, walk.s, walk.rearX, 4000);
    expect(stop.s.mode).toBe('hover');
    expect(Math.abs(stop.s.x - (stop.rearX - OWL.homeBehind))).toBeLessThan(PET_FLIGHT.driftX + 1.5);
    expect(Math.abs(stop.s.alt - OWL.homeAlt)).toBeLessThan(PET_FLIGHT.driftAlt + 1.5);
  });

  it('comes down and grieves when the party falls, and is back in the air after', () => {
    const hovering = run(OWL, petStart(at(400), OWL, false), 400, 1000).s;
    const fallen = run(OWL, hovering, 400, 2000, { fallen: true });
    expect(fallen.s.mode).toBe('mourn');
    expect(petLanded(fallen.s)).toBe(true);
    expect(petBaseClip(fallen.s, OWL)).toBe('mourn');
    const back = run(OWL, fallen.s, 400, 1500).s;
    expect(back.mode).toBe('hover');
    expect(back.alt).toBeGreaterThan(10);
  });

  it('keeps inside the strip when the camera has panned ahead — but never past the line behind the last hero', () => {
    const left = 400 - 60; // the last hero 60 px from the edge
    const roomy = run(OWL, petStart(at(400), OWL, false), 400, 4000, { leftX: left }).s;
    expect(roomy.x).toBeGreaterThan(left + OWL.edge - 3.5); // drift aside, it is inside
    const tight = run(OWL, roomy, 400, 4000, { leftX: 400 - 20 }).s; // no room at all: the line wins
    expect(Math.abs(tight.x - (400 - OWL.clearBehind))).toBeLessThan(1);
  });

  it('is simply put behind the party after a jump (a teleport, a new world)', () => {
    const hovering = run(OWL, petStart(at(400), OWL, false), 400, 1000).s;
    const jumped = petStep(hovering, at(2400), FRAME, OWL);
    expect(jumped.x).toBe(2400 - OWL.homeBehind);
  });

  it('its shadow narrows and fades as it climbs', () => {
    const ground = petShadow({ ...petStart(at(0), OWL, false), alt: 0 }, OWL);
    const high = petShadow({ ...petStart(at(0), OWL, false), alt: 33 }, OWL);
    expect(ground).toEqual({ width: OWL.shadow, alpha: 1 });
    expect(high.width).toBeLessThan(ground.width);
    expect(high.alpha).toBeLessThan(0.3);
  });
});

describe('a flier that never lands: the Coin Sprite', () => {
  it('stays in the air however long the party stands, and only comes down to grieve', () => {
    const long = run(COIN, petStart(at(400), COIN, false), 400, PET_FLIGHT.perchAfterMs * 3);
    expect(long.clips).toEqual(['idle']);
    const fallen = run(COIN, long.s, 400, 2000, { fallen: true });
    expect(petLanded(fallen.s)).toBe(true);
    expect(fallen.clips[fallen.clips.length - 1]).toBe('mourn');
  });
});

describe('a walker: the Lucky Cat', () => {
  it('trots in from behind and sits down in its place', () => {
    const { s, clips } = run(CAT, petStart(at(400), CAT), 400, 4000);
    expect(s.alt).toBe(0);
    expect(petLanded(s)).toBe(true);
    expect(Math.abs(s.x - (400 - CAT.homeBehind))).toBeLessThan(PET_FLIGHT.arriveWithin + 0.5);
    expect(clips.slice(-3)).toEqual(['move', 'settle', 'idle']);
  });

  it('gets up and trots after the party when it walks on, and sits again where it stops', () => {
    const sitting = run(CAT, petStart(at(400), CAT, false), 400, 500).s;
    expect(petBaseClip(sitting, CAT)).toBe('idle');
    const walk = run(CAT, sitting, 400, 4000, { speed: WALK_SPEED });
    expect(walk.clips.slice(0, 3)).toEqual(['idle', 'takeoff', 'move']);
    expect(walk.s.alt).toBe(0);
    expect(walk.rearX - CAT.clearBehind - walk.s.x).toBeLessThan(12); // it keeps up
    expect(walk.s.facing).toBe(1);
    const stop = run(CAT, walk.s, walk.rearX, 3000);
    expect(petLanded(stop.s)).toBe(true);
    expect(stop.clips[stop.clips.length - 1]).toBe('idle');
    expect(Math.abs(stop.s.x - (stop.rearX - CAT.homeBehind))).toBeLessThan(PET_FLIGHT.arriveWithin + 0.5);
  });

  it('does not fidget about for a hero who shuffles a few pixels', () => {
    const sitting = run(CAT, petStart(at(400), CAT, false), 400, 500).s;
    const shuffled = run(CAT, sitting, 400, 400, { speed: 20 }); // 8 px, slowly: under the leash
    const after = run(CAT, shuffled.s, shuffled.rearX, 2000);
    expect([...shuffled.clips, ...after.clips]).toEqual(['idle', 'idle']);
    expect(after.s.x).toBe(sitting.x);
  });

  it('stays where it is while it reacts, then runs to catch the party up', () => {
    const sitting = run(CAT, petStart(at(400), CAT, false), 400, 500).s;
    const held = run(CAT, sitting, 400, 1000, { speed: WALK_SPEED, hold: true });
    expect(held.s.x).toBe(sitting.x);
    const after = run(CAT, held.s, held.rearX, 3000, { speed: WALK_SPEED });
    expect(after.rearX - CAT.clearBehind - after.s.x).toBeLessThan(12);
  });

  it('lies down where it is when the party falls', () => {
    const walk = run(CAT, petStart(at(400), CAT, false), 400, 1500, { speed: WALK_SPEED });
    const fallen = run(CAT, walk.s, walk.rearX, 500, { fallen: true });
    expect(fallen.clips).toEqual(['mourn']);
    expect(fallen.s.x).toBe(walk.s.x);
  });
});

describe('the companions as data', () => {
  it('every figure is a pet of the game, has a way of moving, and has the clips that way needs', () => {
    expect(PET_FIGURES.length).toBeGreaterThan(0);
    for (const key of PET_FIGURES) {
      expect(PET_KEYS, key).toContain(key);
      const style = PET_STYLES[key];
      expect(style, `${key} has no entry in PET_STYLES`).toBeDefined();
      if (style === undefined) continue;
      const meta = petMeta(key);
      const loops = ['idle', 'move', 'mourn', ...(style.kind === 'flier' ? ['land'] : []), ...(style.perches ? ['perch'] : [])];
      const once = ['settle', 'takeoff', 'cheer', 'spot', 'ding', ...(style.fidgetEveryMs > 0 ? ['fidget'] : [])];
      for (const clip of loops) expect(meta?.anims[clip]?.loop, `${key}.${clip}`).toBe(true);
      for (const clip of once) expect(meta?.anims[clip]?.loop, `${key}.${clip}`).toBe(false);
    }
  });

  it('every pet of the game has a figure: whichever is chosen is drawn', () => {
    expect([...PET_FIGURES].sort()).toEqual([...PET_KEYS].sort());
  });

  it('no atlas is over the size every GPU can hold as one texture', () => {
    for (const key of PET_FIGURES) {
      const meta = petMeta(key);
      expect(meta, key).toBeDefined();
      if (meta === undefined) continue;
      const size = petAtlasSize(meta);
      expect(size.width, `${key} width`).toBeLessThanOrEqual(PET_ATLAS_MAX);
      expect(size.height, `${key} height`).toBeLessThanOrEqual(PET_ATLAS_MAX);
    }
  });

  it('a pet at rest behind the line cannot reach a hero’s bar: the line clears its figure’s reach', () => {
    for (const key of PET_FIGURES) {
      const style = petStyle(key);
      const reach = petMeta(key)?.box[2] ?? 0; // how far its standing figure reaches in front of its feet
      expect(style.clearBehind, key).toBeGreaterThanOrEqual(HERO_BACK + reach);
      expect(style.homeBehind, key).toBeGreaterThan(style.clearBehind);
      expect(style.edge, key).toBeGreaterThanOrEqual(-(petMeta(key)?.box[0] ?? 0)); // and its back fits inside the strip's edge
    }
  });

  it('the clips over leaving and reaching the path last as long as the motion gives them', () => {
    for (const key of PET_FIGURES) {
      const style = petStyle(key);
      const total = (clip: string): number => (petMeta(key)?.anims[clip]?.ms ?? []).reduce((a, b) => a + b, 0);
      expect(Math.abs(total('takeoff') - style.launchMs), `${key}.takeoff`).toBeLessThanOrEqual(40);
      expect(Math.abs(total('settle') - style.settleMs), `${key}.settle`).toBeLessThanOrEqual(40);
    }
  });
});
