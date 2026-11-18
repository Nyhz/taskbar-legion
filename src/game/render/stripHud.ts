import { tryAbilityDef } from '@/data/abilities';
import type { UltimateDef } from '@/data/ultimates';
import { EFFECTS } from '@/data/effects';
import { abilityArtStem, ultimateArtStem } from '@/ui/abilityArt';

// The HUD the strip draws OVER the fighters (no Pixi here — pure, unit-tested): what a life bar shows, which
// chips a hero wears for the effects on him and for his abilities, and where each piece sits. The art is
// `src/assets/ui/hud_s_*` (tools/assets/pipeline/icon_sets/s9f_striphud.py); LifeBar / ChipRow / HeroHud draw it.
//
// The rules of the family:
//   - a bar is a dark CASING with a well, and a fill stretched inside it; nothing is drawn without its dark edge,
//     so it reads on a pale sky and on a black one;
//   - above a hero: his life (with what he just lost, what a shield absorbs, and his respawn count when he has
//     fallen) and, only while something is on him, a row of CHIPS — the 7×7 sign of the ability that put it
//     there in a gold frame (a buff) or a red one (a debuff), sinking into shade as its time runs out;
//   - at his feet: the chips of his own abilities and, third, of his ultimate — bright in a gold frame when ready,
//     shaded while they recharge (the shade lifts as the time comes) or once spent, green-framed while they charge
//     hit by hit;
//   - an enemy shows its bar only once it is hurt (a pack at full life is not a ladder of bars); an elite always;
//   - everything a hero wears shares ONE centre line, where his body stands (HERO_HUD_CX), and every piece is an
//     odd number of pixels wide, so bar, effect row and ability row sit exactly on it.

// ── choices the user may switch (each alternative is one constant away; the lab shows both) ─────────────────
export type HeroBarStyle = 'plain' | 'notched';
/** The hero life bar: one rod, or cut in quarters by dark notches. */
export const HERO_BAR_STYLE: HeroBarStyle = 'plain';

// ── bars ────────────────────────────────────────────────────────────────────────────────────────────────────
export interface BarSpec {
  /** Art stem of the casing. */
  casing: string;
  w: number;
  h: number;
  /** The well: where the fill goes, from the casing's top-left. */
  ix: number;
  iy: number;
  iw: number;
  ih: number;
}

export const BARS = {
  hero: { casing: 'hud_s_bar_hero', w: 27, h: 5, ix: 1, iy: 1, iw: 25, ih: 3 },
  foe: { casing: 'hud_s_bar_foe', w: 16, h: 4, ix: 1, iy: 1, iw: 14, ih: 2 },
  elite: { casing: 'hud_s_bar_elite', w: 32, h: 7, ix: 2, iy: 2, iw: 28, ih: 3 },
  cast: { casing: 'hud_s_bar_cast', w: 38, h: 5, ix: 1, iy: 1, iw: 36, ih: 3 },
} as const satisfies Record<string, BarSpec>;

/** At or under this share of his life a hero's bar turns red and its casing beats. */
export const LOW_LIFE = 0.35;
export const LOW_BEAT_MS = 320;

export interface BarSegments {
  /** Pixels of life, from the well's left. */
  life: number;
  /** Pixels just lost, right after the life. */
  ghost: number;
  /** The absorb shield: where it starts and how wide it is (0 = none). */
  shieldX: number;
  shieldW: number;
  /** What a heal over time still has to give (2026-11-18): a mint stretch right after the life, up to the end. */
  comingW: number;
}

/** What fills a well `width` px wide: `frac` of life, the lagging `ghost` share (≥ frac while a hit is fresh),
 *  and a shield worth `shield` of the full life. A living fighter never shows an empty bar; a shield stands
 *  right after the life and, when the two do not fit, lies over the bar's right end. */
export function barSegments(width: number, frac: number, ghost = 0, shield = 0, coming = 0): BarSegments {
  const clamp = (v: number): number => Math.max(0, Math.min(1, v));
  const f = clamp(frac);
  const life = f <= 0 ? 0 : Math.max(1, Math.round(width * f));
  const ghostEnd = Math.max(life, Math.round(width * clamp(ghost)));
  const shieldW = shield <= 0 ? 0 : Math.max(1, Math.min(width, Math.round(width * clamp(shield))));
  const shieldX = Math.min(life, width - shieldW);
  const comingW = coming <= 0 || life >= width ? 0 : Math.max(1, Math.min(width - life, Math.round(width * clamp(coming))));
  return { life, ghost: ghostEnd - life, shieldX: shieldW === 0 ? 0 : shieldX, shieldW, comingW };
}

// ── the lagging slice ("what he just lost") ─────────────────────────────────────────────────────────────────
export const GHOST_HOLD_MS = 240; // the slice stands still this long, then drains
export const GHOST_DRAIN_PER_MS = 0.0016; // bar-fractions per ms (a full bar in ~625 ms)

export interface GhostState {
  ghost: number;
  holdMs: number;
  prev: number;
}

export function newGhost(frac = 1): GhostState {
  return { ghost: frac, holdMs: 0, prev: frac };
}

/** Advance the lagging slice: a heal snaps it up, a fresh hit holds it, then it drains to the real life. */
export function stepGhost(s: GhostState, frac: number, dtMs: number): GhostState {
  if (frac >= s.ghost) return { ghost: frac, holdMs: 0, prev: frac };
  let holdMs = frac < s.prev ? GHOST_HOLD_MS : s.holdMs;
  holdMs = Math.max(0, holdMs - dtMs);
  const ghost = holdMs === 0 ? Math.max(frac, s.ghost - GHOST_DRAIN_PER_MS * dtMs) : s.ghost;
  return { ghost, holdMs, prev: frac };
}

// ── chips ───────────────────────────────────────────────────────────────────────────────────────────────────
export const CHIP = 9; // a chip's side
/** From one chip of a row to the next: they share their border pixel, so a row of 1, 2 or 3 is 9, 17 or 25 px —
 *  always odd (its middle pixel sits on the hero's centre line) and never wider than his life bar. */
export const CHIP_STEP = CHIP - 1;
export const SIGN = 7; // the sign inside it
export type ChipFrame = 'buff' | 'debuff' | 'ready' | 'wait' | 'charge';

export interface ChipView {
  /** Mini sign (art stem `hud_s_m_<sign>`). */
  sign: string;
  frame: ChipFrame;
  /** Rows of the sign under shade, from the top: 0 (clear) … SIGN (all of it). */
  shade: number;
  /** About to run out (an effect) — its frame blinks. */
  ending: boolean;
  /** The effects behind an effect chip (the ones that share its sign) and what each is worth on the fighter, for
   *  its tooltip. */
  worn?: readonly ChipWorn[];
}

/** One effect behind a chip, as the tooltip needs it (ui/overlay/effectTipWords EffectTipFact). */
export interface ChipWorn {
  key: string;
  value?: number;
  stacks?: number;
  totalMs?: number;
}

/** The mini sign of an ability or ultimate: the same picture as its 16 px sign (ui/abilityArt), drawn at 7 px. */
export function miniSign(abilityKey: string): string {
  const stem = tryAbilityDef(abilityKey) !== undefined ? abilityArtStem(abilityKey) : ultimateArtStem(abilityKey);
  return stem.replace(/^(tal|abil)_(ult_)?/, '');
}

// Which sign stands for an effect: the ability that lays it. Effects no hero ability lays get a generic sign.
const EFFECT_SIGN: Readonly<Record<string, string>> = {
  buff_guard_block: 'stone_skin',
  buff_battlecry_ad: 'battle_cry',
  buff_battlecry_crit: 'battle_cry',
  buff_bloodlust_as: 'bloodlust',
  buff_bloodlust_ls: 'bloodlust',
  buff_holdline_dr: 'hold_the_line',
  buff_standard_block: 'hold_the_line',
  buff_standard_armor: 'hold_the_line',
  fx_invuln: 'last_stand',
  buff_fast_fire: 'rapid_fire',
  buff_focused_fire: 'rapid_fire',
  fx_hot: 'mend',
  fx_light: 'smite',
  fx_sanctuary: 'sanctuary',
  fx_ward: 'holy_shield',
  buff_aegis_dr: 'holy_shield',
  buff_shelter: 'shelter', // the Knight's Shelter on the ally that dropped under half its life
  buff_infusion_as: 'power_infusion',
  buff_infusion_cdr: 'power_infusion',
  buff_enrage_as: 'battle_enrage',
  buff_enrage_cdr: 'battle_enrage',
  // what an enemy lays on a hero, and what heroes lay on enemies (a boss line may list these one day)
  debuff_mortal_wound: 'wound',
  debuff_venom: 'venom',
  debuff_rend: 'venom', // Desgarro: the venom sign until it has its own
  debuff_rooted: 'roots',
  debuff_guilt: 'guilt',
  debuff_gilded: 'gilded',
  debuff_spores: 'spores',
  debuff_tremor: 'tremor', // a brute's Temblor: the ground split, the shock going out over it
  debuff_weaken: 'cleave',
  debuff_riposte_weaken: 'riposte',
  debuff_vengeance_weaken: 'riposte',
  debuff_cripple: 'slow',
  debuff_vengeance_slow: 'slow',
  debuff_field_slow: 'slow',
  debuff_tar_slow: 'slow',
  fx_mark: 'hunters_mark',
  debuff_weakspot: 'weak_spot',
  fx_dot: 'bleed',
  fx_hemorrhage: 'bleed', // the Ranger's Hemorrhage is a bleed like the Caltrops'
  fx_burn: 'explosive_arrow',
  fx_tar: 'tar_flask',
};

/** The mini sign of an effect (never throws: an unknown effect gets the generic buff or debuff sign). */
export function effectSign(effectKey: string): string {
  const own = EFFECT_SIGN[effectKey];
  if (own !== undefined) return own;
  return EFFECTS[effectKey]?.beneficial === false ? 'debuff' : 'buff';
}

/** Effects shown elsewhere, not as chips: an absorb shield is a segment of the life bar. */
function hasChip(effectKey: string): boolean {
  const def = EFFECTS[effectKey];
  if (def === undefined) return true;
  return def.kind.type !== 'shield' && def.durationMs > 0;
}

/** A hero wears at most this many chips; with more, the last place says "+N". */
export const MAX_EFFECT_CHIPS = 3;
/** An effect with this little left blinks. */
export const ENDING_MS = 1500;

export interface WornFact {
  defKey: string;
  remainingMs: number;
  totalMs?: number;
  /** What it is worth on the fighter (sim ActiveEffect): for the chip's tooltip. */
  value?: number;
  stacks?: number;
}

/** Rows of a sign under shade when `gone` (0…1) of the time has run. */
export function shadeRows(gone: number): number {
  return Math.max(0, Math.min(SIGN, Math.round(SIGN * gone)));
}

/** The chips of the effects on a hero: one per SIGN (an ability that lays two effects is one chip, timed by the
 *  one that lasts longest), debuffs first, each in the order it was applied; `more` counts those that did not fit
 *  (the row then shows `max - 1` chips and "+more"). */
export function effectChips(effects: readonly WornFact[], max = MAX_EFFECT_CHIPS, extra: readonly ChipView[] = []): { chips: ChipView[]; more: number } {
  const bySign = new Map<string, { good: boolean; left: number; total: number; worn: ChipWorn[] }>();
  for (const e of effects) {
    if (!hasChip(e.defKey)) continue;
    const def = EFFECTS[e.defKey];
    const sign = effectSign(e.defKey);
    const total = e.totalMs ?? def?.durationMs ?? 0;
    const known = bySign.get(sign);
    const worn: ChipWorn = { key: e.defKey, totalMs: total, ...(e.value === undefined ? {} : { value: e.value }), ...(e.stacks === undefined ? {} : { stacks: e.stacks }) };
    if (known === undefined) {
      bySign.set(sign, { good: def?.beneficial !== false, left: e.remainingMs, total, worn: [worn] });
      continue;
    }
    if (!known.worn.some((w) => w.key === e.defKey)) known.worn.push(worn);
    if (e.remainingMs > known.left) {
      known.left = e.remainingMs;
      known.total = total;
    }
  }
  const all = [...bySign.entries()].map(([sign, v]) => ({ sign, ...v }));
  const timed = [...all.filter((c) => !c.good), ...all.filter((c) => c.good)].map((c): ChipView => ({
    sign: c.sign,
    frame: c.good ? 'buff' : 'debuff',
    shade: c.total > 0 ? shadeRows(1 - c.left / c.total) : 0,
    ending: c.left <= ENDING_MS,
    worn: c.worn,
  }));
  // `extra`: chips that are not effects (a passive's stacks) — after everything that comes and goes.
  const ordered = [...timed, ...extra];
  const chips = ordered.length > max ? ordered.slice(0, max - 1) : ordered;
  return { chips, more: ordered.length - chips.length };
}

/** What the strip knows of a hero's Weathered Hide (sim Combatant: `hideStacks`, and the passive it holds). */
export interface StackFacts {
  hideStacks?: number;
  passives?: readonly { def: { is: string; maxStacks?: number } }[];
}

/** The chips of a hero's passives that BUILD UP in a fight: Weathered Hide's stacks of blocked hits — the green
 *  frame of something that charges hit by hit, a step clearer with each stack, gone when the stacks are. */
export function stackChips(c: StackFacts): ChipView[] {
  const stacks = c.hideStacks ?? 0;
  if (stacks <= 0) return [];
  const max = c.passives?.find((p) => p.def.is === 'blockStreak')?.def.maxStacks ?? stacks;
  return [{ sign: 'weathered_hide', frame: stacks >= max ? 'ready' : 'charge', shade: shadeRows(1 - stacks / Math.max(1, max)), ending: false }];
}

export interface AbilityFact {
  def: { key: string; charge?: { toCast: number } };
}
export interface CooldownFacts {
  abilities: readonly AbilityFact[];
  cooldowns: Readonly<Record<string, number>>;
  cooldownTotals?: Readonly<Record<string, number>>;
  charges?: Readonly<Record<string, number>>;
}

/** The chips of a hero's (up to two) abilities: ready (gold frame, clear), recharging (steel frame, the shade
 *  lifting as the time comes), or charging hit by hit (green frame, a step clearer with each attack). */
export function abilityChips(c: CooldownFacts): ChipView[] {
  return c.abilities.slice(0, 2).map(({ def }): ChipView => {
    const sign = miniSign(def.key);
    if (def.charge !== undefined) {
      const banked = c.charges?.[def.key] ?? 0;
      const ready = banked >= def.charge.toCast;
      return { sign, frame: ready ? 'ready' : 'charge', shade: ready ? 0 : shadeRows(1 - banked / def.charge.toCast), ending: false };
    }
    const left = c.cooldowns[def.key] ?? 0;
    const total = c.cooldownTotals?.[def.key] ?? 0;
    const ready = left <= 0 || total <= 0;
    // While it recharges at least one row stays shaded, so "nearly ready" never looks ready.
    return { sign, frame: ready ? 'ready' : 'wait', shade: ready ? 0 : Math.max(1, shadeRows(left / total)), ending: false };
  });
}

/** What the strip knows of a hero's ultimate (sim Combatant: `ult`, `ultCharge`). */
export interface UltimateFacts {
  ult?: Pick<UltimateDef, 'key' | 'effect'>;
  ultCharge?: number;
}

/** The chip of a hero's ultimate, third in his row — none until he has it (level 30). Same frame code as his
 *  abilities: gold and clear while it is READY; steel and under full shade once it is SPENT. Last Stand is spent
 *  when its charge of the stage is used; the two that fire when a boss joins the fight (Battle Enrage, Mark of the
 *  Hunter) are spent from that moment until the boss is gone (`bossEngaged`). */
export function ultimateChip(c: UltimateFacts, bossEngaged: boolean): ChipView | null {
  if (c.ult === undefined) return null;
  const ready = c.ult.effect.type === 'deathBlock' ? (c.ultCharge ?? 0) > 0 : !bossEngaged;
  return { sign: miniSign(c.ult.key), frame: ready ? 'ready' : 'wait', shade: ready ? 0 : SIGN, ending: false };
}

// ── an enemy's bar ──────────────────────────────────────────────────────────────────────────────────────────
/** A common enemy's bar stays this long after the last hit, then fades over FOE_BAR_FADE_MS. */
export const FOE_BAR_STAY_MS = 2600;
export const FOE_BAR_FADE_MS = 400;

/** How visible (0…1) an enemy's bar is. An elite's always is; a common enemy's shows while it is hurt and
 *  something hit it lately — a pack at full life wears no bars at all (the user's choice, 2026-11-15). */
export function foeBarAlpha(args: { elite: boolean; frac: number; sinceHitMs: number }): number {
  if (args.elite) return 1;
  if (args.frac >= 1) return 0;
  const over = args.sinceHitMs - FOE_BAR_STAY_MS;
  return over <= 0 ? 1 : Math.max(0, 1 - over / FOE_BAR_FADE_MS);
}

/** A bar's box on the strip, in art px: `x` its centre, `y` its top (up is negative), with whatever it carries
 *  on top (an elite's crown) counted in `h`. */
export interface BarBox {
  x: number;
  y: number;
  w: number;
  h: number;
  /** An elite's bar always shows: it may climb as far as it needs. */
  elite?: boolean;
}

/** A common enemy's bar is raised at most this far to clear the bars under it; with no room left it is not
 *  shown (a pack on one spot shows a few bars, never a ladder). */
export const FOE_BAR_MAX_LIFT = 9;

/** How far to raise each bar so none lies on another: taken in the order given (put first the ones that must
 *  stay where they are), each is raised just over the bars already placed that it would touch. `null`: it found
 *  no room within `maxLift` and should not be shown. */
export function stackBars(bars: readonly BarBox[], maxLift = FOE_BAR_MAX_LIFT): (number | null)[] {
  const placed: BarBox[] = [];
  return bars.map((bar) => {
    let top = bar.y;
    for (let guard = 0; guard < 12; guard++) {
      const hit = placed.find((p) => Math.abs(p.x - bar.x) < (p.w + bar.w) / 2 + 1 && top < p.y + p.h + 1 && top + bar.h > p.y - 1);
      if (hit === undefined) break;
      top = hit.y - 1 - bar.h;
    }
    const lift = bar.y - top;
    if (lift > maxLift && bar.elite !== true) return null;
    placed.push({ ...bar, y: top });
    return lift;
  });
}

// ── where a hero's pieces sit ───────────────────────────────────────────────────────────────────────────────
/** The centre line of a hero's HUD, in art px from the figure's root column: where his BODY stands as the eye
 *  sees it in a fight — the middle of his torso and legs over his idle and basic-attack clips, weapons left out
 *  (measured on the figures' atlases, 2026-11-15: the Knight fights in a wide forward stance, so his body sits
 *  further ahead of his root than the others'). An unknown class gets the Ranger's. */
export const HERO_HUD_CX: Readonly<Record<string, number>> = { knight: 5, ranger: 3, priest: 3 };

export function heroHudCx(classKey: string): number {
  return HERO_HUD_CX[classKey] ?? 3;
}

// Offsets from that centre line (x) and from the top of the standing figure / the ground line (y, negative =
// up). Heroes stand 40 px apart: nothing here may be wider than that. Every piece is an odd number of pixels
// wide, so its middle pixel is ON the line.
export interface HeroHudLayout {
  /** Life bar's top-left (y up from the head). */
  bar: { x: number; y: number };
  /** The effect row's top (chips are CHIP tall), up from the head; it is centred on the line. */
  effectsY: number;
  /** The row of ability chips: its top, DOWN from the ground line, and the step between chips; centred too. */
  cooldowns: { y: number; dx: number };
  /** Height of everything above the head (for the cast sign and for lifting a crowded neighbour's HUD). */
  top: number;
}

const BAR_ABOVE_HEAD = 3; // air between the head and the bar
const CHIPS_BELOW_FEET = 2; // …and between the ground line and the ability chips

export function heroHudLayout(): HeroHudLayout {
  const bar = BARS.hero;
  const barY = -(BAR_ABOVE_HEAD + bar.h);
  const effectsY = barY - 1 - CHIP;
  return {
    bar: { x: -Math.floor(bar.w / 2), y: barY },
    effectsY,
    cooldowns: { y: CHIPS_BELOW_FEET, dx: CHIP_STEP },
    top: -effectsY,
  };
}

/** Left edge of a row of `n` chips centred on the line (x = 0): rows are odd-wide, so this is whole. */
export function rowLeft(n: number, step = CHIP_STEP): number {
  const half = Math.floor(rowWidth(n, step) / 2);
  return half === 0 ? 0 : -half;
}

/** The widest a hero's HUD gets (the bar, or a full row of chips) and the height of one "storey" of it (a bar and
 *  a row of chips): what the strip uses to lift the HUD of a hero who stands too close behind another. */
export const HERO_HUD_WIDTH = Math.max(BARS.hero.w, (MAX_EFFECT_CHIPS - 1) * CHIP_STEP + CHIP);
export const HERO_HUD_STEP = BARS.hero.h + 1 + CHIP + 1;

/** Width of a row of `n` chips set `step` apart. */
export function rowWidth(n: number, step = CHIP_STEP): number {
  return n <= 0 ? 0 : (n - 1) * step + CHIP;
}

/** Which chip of a row is under a point: the row's first chip has its top-left at (`left`, `top`), chips are CHIP
 *  square and `step` apart. -1 when the point is on none of the `count` chips. (The effect chips' tooltip.) */
export function chipIndexAt(x: number, y: number, left: number, top: number, count: number, step = CHIP_STEP): number {
  if (y < top || y >= top + CHIP || x < left) return -1;
  const i = Math.floor((x - left) / step);
  if (i >= count) return i === count && x < left + (count - 1) * step + CHIP ? count - 1 : -1; // the shared border pixel of the last chip
  return x < left + i * step + CHIP ? i : -1;
}
