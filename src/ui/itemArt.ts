// Which picture an item wears. Pure (data only — no store, no React): the kit's `ItemIcon` takes a tier and an
// art stem, and this module turns a game item into that stem. Total by design: an unknown slot, class or tier
// yields a safe fallback and never throws (a stale save key must not take the interface down).
//
//   stem = sm_<what>_<rank>      what: helmet_plate, chest_cloth, sword, quiver, ring, …      rank: 1–5
//
// `sm_` pictures are the icons DRAWN at 22 px by the asset pipeline for the game's 24 px item cell (2/3 of the
// 32 px catalogue drawings, `raw_`, which a tooltip may still show big — `bigItemArtStem`).
//
// The RANK is the drawing's category and follows the item's rarity: T0 → 1 · T1–T2 → 2 · T3–T4 → 3 · T5–T7 → 4 ·
// T8 → 5. Armour is drawn in the FAMILY of the class it belongs to (Knight plate, Ranger leather, Priest cloth);
// weapons and off-hands as their class's TYPE; jewelry by slot; gems by gem.

import { tryArmorFamilyFor, tryWeaponTypeFor, type ArmorFamilyKey, type SlotKey } from '@/data/itemSlots';
import type { GemKey } from '@/data/gems';

export type ArtRank = 1 | 2 | 3 | 4 | 5;

const ARMOR_SLOTS: ReadonlySet<string> = new Set(['helmet', 'chest', 'gloves', 'legs', 'boots']);
const JEWELRY_SLOTS: ReadonlySet<string> = new Set(['ring', 'amulet', 'trinket']);
const WEAPON_KINDS: ReadonlySet<string> = new Set(['sword', 'shield', 'bow', 'quiver', 'wand', 'tome']);
const GEM_KINDS: ReadonlySet<string> = new Set([
  'sapphire',
  'ruby',
  'emerald',
  'topaz',
  'amethyst',
  'diamond',
]);
/** What a weapon / off-hand is drawn as when its class is unknown. */
const DEFAULT_WEAPON: Record<'weapon' | 'offhand', string> = { weapon: 'sword', offhand: 'shield' };
const DEFAULT_FAMILY: ArmorFamilyKey = 'plate';
/** Anything this module cannot place at all. */
export const FALLBACK_ITEM_ART = 'sm_trinket_1';
export const FALLBACK_GEM_ART = 'sm_gem_diamond';

/** The drawing category of a rarity: T0 → 1 · T1–T2 → 2 · T3–T4 → 3 · T5–T7 → 4 · T8 → 5. */
export function artRankForTier(tier: number): ArtRank {
  if (!(tier > 0)) return 1; // also NaN
  if (tier <= 2) return 2;
  if (tier <= 4) return 3;
  if (tier <= 7) return 4;
  return 5;
}

/** The 24 px frame of a rarity (`smframe_0` … `smframe_8`), clamped. */
export function frameArtStem(tier: number): string {
  const t = Number.isFinite(tier) ? Math.max(0, Math.min(8, Math.round(tier))) : 0;
  return `smframe_${t}`;
}

interface ArtSource {
  slot: SlotKey | string;
  tier: number;
  classKey?: string;
}

/** What a slot is drawn as for a class, without the rank: `helmet_plate`, `bow`, `ring`. */
function artKind(slot: string, classKey: string | undefined): string | null {
  if (ARMOR_SLOTS.has(slot)) {
    const family = (classKey !== undefined ? tryArmorFamilyFor(classKey)?.key : undefined) ?? DEFAULT_FAMILY;
    return `${slot}_${family}`;
  }
  if (slot === 'weapon' || slot === 'offhand') {
    const type = classKey !== undefined ? tryWeaponTypeFor(classKey, slot)?.key : undefined;
    return type !== undefined && WEAPON_KINDS.has(type) ? type : DEFAULT_WEAPON[slot];
  }
  if (JEWELRY_SLOTS.has(slot)) return slot;
  return null;
}

/** The art stem of an item: `sm_helmet_plate_3`, `sm_bow_4`, `sm_ring_2`… */
export function itemArtStem(item: ArtSource): string {
  const kind = artKind(item.slot, item.classKey);
  return kind === null ? FALLBACK_ITEM_ART : `sm_${kind}_${artRankForTier(item.tier)}`;
}

/** The faint silhouette of an EMPTY gear slot: the plainest piece (rank 1) the given class would wear there. */
export function slotGhostStem(slot: SlotKey | string, classKey?: string): string {
  const kind = artKind(slot, classKey);
  return kind === null ? FALLBACK_ITEM_ART : `sm_${kind}_1`;
}

/** The art stem of a gem: `sm_gem_ruby`. (Its frame is the frame of the gem's own tier.) */
export function gemArtStem(gem: { key: GemKey | string }): string {
  return GEM_KINDS.has(gem.key) ? `sm_gem_${gem.key}` : FALLBACK_GEM_ART;
}

/** The same drawing at its catalogue size (32 px, `raw_…`): for a tooltip's header. */
export function bigArtStem(smallStem: string): string {
  return smallStem.startsWith('sm_') ? `raw_${smallStem.slice(3)}` : smallStem;
}

/** The crest of the class an item belongs to (`crest_knight`, 16 px), or undefined for a classless item or an
 *  unknown class. */
export function classCrestStem(classKey: string | undefined): string | undefined {
  return classKey === 'knight' || classKey === 'ranger' || classKey === 'priest'
    ? `crest_${classKey}`
    : undefined;
}

/** The same crest small enough for the corner of an item cell (`mark_crest_knight`, 9 px). */
export function cellCrestStem(classKey: string | undefined): string | undefined {
  const crest = classCrestStem(classKey);
  return crest === undefined ? undefined : `mark_${crest}`;
}
