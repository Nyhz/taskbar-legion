import type { InvEntry } from './items';

// Fixed-slot containers (inventory + stash). A container is a SPARSE array: index =
// the on-screen slot, `null` = an empty slot. Removing an item leaves a hole (the
// other items never shift); adding fills the FIRST hole (or appends if there's none
// and capacity allows). Sorting is the only operation that re-packs. The array length
// is always ≤ capacity; the UI pads the tail with empty cells up to capacity.

export type Slots = (InvEntry | null)[];

/** The non-empty entries, for logic that doesn't care about position. */
export function entries(slots: Slots): InvEntry[] {
  return slots.filter((e): e is InvEntry => e !== null);
}

export function countFilled(slots: Slots): number {
  let n = 0;
  for (const e of slots) if (e !== null) n++;
  return n;
}

export function findEntry(slots: Slots, id: string): InvEntry | undefined {
  for (const e of slots) if (e !== null && e.id === id) return e;
  return undefined;
}

/** Drop `entry` into the first empty slot (or append if none and capacity allows).
 *  Returns a NEW array, or `null` if the container is full. */
export function place(slots: Slots, entry: InvEntry, cap: number): Slots | null {
  const hole = slots.findIndex((e) => e === null);
  if (hole >= 0) {
    const next = slots.slice();
    next[hole] = entry;
    return next;
  }
  if (slots.length < cap) return [...slots, entry];
  return null; // full
}

/** Remove the entry with `id`, LEAVING A HOLE so other items keep their slots. */
export function removeId(slots: Slots, id: string): Slots {
  return slots.map((e) => (e !== null && e.id === id ? null : e));
}

/** Re-pack: drop the holes and order by tier desc, then item level desc (gems → 0). */
export function sorted(slots: Slots): Slots {
  return entries(slots).sort(
    (a, b) => b.tier - a.tier || ('ilvl' in b ? b.ilvl : 0) - ('ilvl' in a ? a.ilvl : 0),
  );
}
