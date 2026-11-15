import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  FALLBACK_ABILITY_ART,
  FALLBACK_ULTIMATE_ART,
  abilityArtStem,
  talentNodeArtStem,
  ultimateArtStem,
} from '@/ui/abilityArt';
import { CLASS_KEYS } from '@/data/classes';
import { talentNodes } from '@/data/talents';
import { ULTIMATES } from '@/data/ultimates';

// Every stem the mapping can produce must be a file the pipeline exported (src/assets/ui).
const EXPORTED = new Set(
  readdirSync(fileURLToPath(new URL('../../src/assets/ui', import.meta.url)))
    .filter((f) => f.endsWith('.png'))
    .map((f) => f.slice(0, -'.png'.length)),
);

// The abilities a hero can learn are exactly the ability nodes of the class trees.
const HERO_ABILITIES = CLASS_KEYS.flatMap((c) => talentNodes(c)).flatMap((n) =>
  n.kind !== 'ability' || n.abilityKey === undefined ? [] : [n.abilityKey],
);

describe('ability art', () => {
  it('every hero ability has a sign of its own, and the file exists', () => {
    expect(HERO_ABILITIES.length).toBe(21); // 7 per class: the 5 of the trunk + 1 per branch
    const stems = HERO_ABILITIES.map(abilityArtStem);
    for (const stem of stems) expect(EXPORTED.has(stem), stem).toBe(true);
    expect(new Set(stems).size).toBe(HERO_ABILITIES.length); // no two abilities share a sign
  });

  it('every class ultimate has a sign of its own, and the file exists', () => {
    const keys = Object.values(ULTIMATES).map((u) => u.key);
    expect(keys.length).toBe(CLASS_KEYS.length);
    const stems = keys.map(ultimateArtStem);
    for (const stem of stems) expect(EXPORTED.has(stem), stem).toBe(true);
    expect(new Set(stems).size).toBe(keys.length);
  });

  it('every node of every talent tree has a sign whose file exists', () => {
    for (const c of CLASS_KEYS) {
      for (const n of talentNodes(c)) expect(EXPORTED.has(talentNodeArtStem(c, n)), `${n.key} → ${talentNodeArtStem(c, n)}`).toBe(true);
    }
  });

  it('an unknown key gets the stand-in instead of throwing', () => {
    expect(abilityArtStem('no_such_ability')).toBe(FALLBACK_ABILITY_ART);
    expect(ultimateArtStem('no_such_ultimate')).toBe(FALLBACK_ULTIMATE_ART);
    expect(EXPORTED.has(FALLBACK_ABILITY_ART)).toBe(true);
    expect(EXPORTED.has(FALLBACK_ULTIMATE_ART)).toBe(true);
  });
});
