// A loot line: what one floating line over the strip shows when a chest is opened. The toast store only
// carries a string and a colour (state/slices/lootToastSlice), so a line travels INSIDE that string — encoded
// here, decoded by the renderer (ui/overlay/LootToasts). Pure, and tolerant: a plain string that never went
// through `encodeLootLine` decodes to a line with just that text.

export interface LootLine {
  /** What it says (already in the player's language). */
  text: string;
  /** Art stem of an item / gem drawn in its 24 px cell before the text (`sm_sword_3`), with `tier` for its frame. */
  art?: string;
  tier?: number;
  /** Art stem of a 16 px sign drawn before the text instead (a key, the purse, the bag). */
  sign?: string;
  /** Perfect rolls: that many stars after the text. */
  stars?: number;
}

const MARK = '\u0001';

export function encodeLootLine(line: LootLine): string {
  return MARK + JSON.stringify(line);
}

export function decodeLootLine(text: string): LootLine {
  if (!text.startsWith(MARK)) return { text };
  try {
    const raw: unknown = JSON.parse(text.slice(MARK.length));
    if (typeof raw !== 'object' || raw === null) return { text: '' };
    const o = raw as Record<string, unknown>;
    return {
      text: typeof o.text === 'string' ? o.text : '',
      ...(typeof o.art === 'string' ? { art: o.art } : {}),
      ...(typeof o.tier === 'number' && Number.isFinite(o.tier) ? { tier: o.tier } : {}),
      ...(typeof o.sign === 'string' ? { sign: o.sign } : {}),
      ...(typeof o.stars === 'number' && o.stars > 0 ? { stars: Math.min(4, Math.floor(o.stars)) } : {}),
    };
  } catch {
    return { text: '' };
  }
}
