import { describe, expect, it } from 'vitest';
import {
  ARRIVE_STAGGER_MS,
  WIPE_ARRIVE_AT_MS,
  WIPE_ARRIVE_MS,
  WIPE_BLACK_MS,
  WIPE_DEAD_MS,
  WIPE_FADE_MS,
  WIPE_RETREAT_AT_MS,
  WIPE_SIGN_AT_MS,
  WIPE_SIGN_MS,
  WIPE_TOTAL_MS,
} from '@/data/field';
import { CLASS_KEYS } from '@/data/classes';
import { clipMs, figureMeta } from '@/game/render/figureData';
import { wipeLook } from '@/game/render/wipeBeat';
import { arrivalDelayMs, arrivalMs, ARRIVAL_CHOICE } from '@/game/render/arrival';

describe("the party's defeat, beat by beat", () => {
  it('shows the fallen party, untouched, for the whole first beat', () => {
    for (const ms of [0, 500, WIPE_DEAD_MS - 1]) expect(wipeLook(ms)).toEqual({ black: 0, phrase: 0, party: 'fallen' });
  });

  it('leaves the last fallen hero time to play its defeat before the strip darkens', () => {
    for (const classKey of CLASS_KEYS) {
      const death = figureMeta(classKey)?.anims.death;
      expect(death, classKey).toBeDefined();
      if (death !== undefined) expect(clipMs(death), classKey).toBeLessThanOrEqual(WIPE_DEAD_MS + WIPE_FADE_MS);
    }
  });

  it('fades to black, and only then brings the phrase up — alone', () => {
    const mid = wipeLook(WIPE_DEAD_MS + WIPE_FADE_MS / 2);
    expect(mid.black).toBeCloseTo(0.5);
    expect(mid.phrase).toBe(0); // nothing is written over a half-dark strip
    expect(wipeLook(WIPE_RETREAT_AT_MS)).toMatchObject({ black: 1, phrase: 0, party: 'gone' });
    const held = wipeLook(WIPE_RETREAT_AT_MS + WIPE_BLACK_MS / 2);
    expect(held).toEqual({ black: 1, phrase: 1, party: 'gone' });
  });

  it('takes the phrase away before the black lifts', () => {
    const lastBlack = WIPE_RETREAT_AT_MS + WIPE_BLACK_MS;
    expect(wipeLook(lastBlack - 1).phrase).toBeLessThan(0.05);
    for (let ms = lastBlack; ms <= WIPE_TOTAL_MS; ms += 50) expect(wipeLook(ms).phrase, `${ms} ms`).toBe(0);
    // …and whenever the phrase shows at all, the strip is fully black.
    for (let ms = 0; ms <= WIPE_TOTAL_MS; ms += 25) if (wipeLook(ms).phrase > 0) expect(wipeLook(ms).black, `${ms} ms`).toBe(1);
  });

  it('comes back from black on an empty stage, which the sign then has to itself', () => {
    expect(wipeLook(WIPE_SIGN_AT_MS - WIPE_FADE_MS / 2).black).toBeCloseTo(0.5);
    for (let ms = WIPE_SIGN_AT_MS; ms < WIPE_ARRIVE_AT_MS; ms += 100) expect(wipeLook(ms)).toEqual({ black: 0, phrase: 0, party: 'gone' });
    expect(WIPE_SIGN_MS).toBeGreaterThanOrEqual(1800); // the stage band's own animation (overlay.css tk-band-stage)
  });

  it('brings the heroes back last, with time for a party of three to arrive one after another', () => {
    expect(wipeLook(WIPE_ARRIVE_AT_MS)).toEqual({ black: 0, phrase: 0, party: 'back' });
    expect(arrivalDelayMs(0)).toBe(0);
    expect(arrivalDelayMs(2)).toBe(2 * ARRIVE_STAGGER_MS);
    // The last of three has started — and is on its feet in its light — before the fight resumes.
    expect(arrivalDelayMs(2) + arrivalMs(ARRIVAL_CHOICE)).toBeLessThanOrEqual(WIPE_ARRIVE_MS + arrivalMs(ARRIVAL_CHOICE) / 2);
    expect(WIPE_TOTAL_MS).toBe(WIPE_ARRIVE_AT_MS + WIPE_ARRIVE_MS);
  });
});
