import { describe, expect, it } from 'vitest';
import { decodeLootLine, encodeLootLine } from '@/ui/loot/lootLine';
import { awayDuration, placeLabel } from '@/ui/overlay/overlayText';

describe('loot lines travel inside the toast string', () => {
  it('round-trips a piece: text, art, tier and stars', () => {
    const line = { text: 'Yelmo · Épico', art: 'sm_helmet_plate_3', tier: 3, stars: 2 };
    expect(decodeLootLine(encodeLootLine(line))).toEqual(line);
  });

  it('round-trips a line with a sign and drops what is not there', () => {
    const line = { text: 'Llave de jefe de mundo · Infierno 3', sign: 'hud_key' };
    expect(decodeLootLine(encodeLootLine(line))).toEqual(line);
  });

  it('a plain string that was never encoded is just its text', () => {
    expect(decodeLootLine('Legendary (Weapon)')).toEqual({ text: 'Legendary (Weapon)' });
  });

  it('never throws on a broken payload, and ignores fields of the wrong type', () => {
    expect(decodeLootLine('\u0001{not json')).toEqual({ text: '' });
    expect(decodeLootLine('\u0001null')).toEqual({ text: '' });
    expect(decodeLootLine('\u0001' + JSON.stringify({ text: 7, art: 3, tier: 'x', stars: -1 }))).toEqual({
      text: '',
    });
  });

  it('caps the stars at four (an item has at most four substats)', () => {
    expect(decodeLootLine(encodeLootLine({ text: 'x', stars: 9 })).stars).toBe(4);
  });
});

describe('lettering helpers of the strip', () => {
  it('says how long the party was away', () => {
    expect(awayDuration(3 * 3_600_000 + 12 * 60_000)).toBe('3h 12m');
    expect(awayDuration(47 * 60_000)).toBe('47m');
    expect(awayDuration(-5)).toBe('0m');
    expect(awayDuration(Number.NaN)).toBe('0m');
  });

  it('names a place as world-stage', () => {
    expect(placeLabel(3, 7)).toBe('3-7');
  });
});
