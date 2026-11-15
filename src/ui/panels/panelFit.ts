import { CONSTELLATION_ART_WIDTH } from './panelLayout';
import { heroWindowArt } from './hero/heroLayout';
import { stashWindowArtMax } from './stash/stashLayout';
import { SHEET_WING_ART, TALENTS_WING_ART } from './hero/wingLayout';
import { CUBE_WING_ART } from './cube/cubeLayout';
import { MAP_WING_ART } from './map/mapLayout';
import { PETS_WING_ART } from './pets/petsLayout';
import { TECH_WING_ART } from './tech/techLayout';

// What the panel layer fits the scale to, in ART pixels: the widest the panels can ever be — the hero window, a
// wing on EACH side and the bookmarks outside both — by the tallest of them (the hero with its fewest bag rows,
// or the tallest kit wing). It does not depend on which wings are open, so the scale never changes when a wing
// opens or is swapped. Pure.

/** Every kit wing, in its tallest state. All are WING_ART_WIDTH wide (six cells) and at most
 *  WING_MAX_ART_HEIGHT tall. */
export const KIT_WINGS_ART: Readonly<
  Record<'stash' | 'talents' | 'sheet' | 'cube' | 'map' | 'pets' | 'tech', { width: number; height: number }>
> = {
  stash: stashWindowArtMax(),
  talents: TALENTS_WING_ART,
  sheet: SHEET_WING_ART,
  cube: CUBE_WING_ART,
  map: MAP_WING_ART,
  pets: PETS_WING_ART,
  tech: TECH_WING_ART,
};

export const PANELS_NEED_ART: { width: number; height: number } = {
  width: CONSTELLATION_ART_WIDTH,
  height: Math.max(heroWindowArt().height, ...Object.values(KIT_WINGS_ART).map((w) => w.height)),
};
