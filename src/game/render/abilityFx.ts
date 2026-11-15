// What every ability LOOKS like on the strip (no Pixi here — pure, unit-tested). Three tables:
//
//   ABILITY_LOOKS — per ability key: the one-shot effects of its cast and of each hit it lands;
//   EFFECT_LOOKS  — per effect key: the LASTING looks worn while that effect is on someone (a buffed hero, a
//                   debuffed enemy), each with the one-shots that open and close it;
//   SILENT_EFFECTS — effects of a covered ability that need no look of their own (the second stat of a buff
//                   whose first stat already shows it).
//
// The effects' art is the pipeline's (tools/assets/pipeline/fx → render/fxData); the hero's CLIP for a cast is in
// render/heroClips. An ability is "covered" when it is in ABILITY_LOOKS: the strip then plays nothing of the old
// generic vocabulary for it (the cast ring, the category arrows and shields of render/effectAuras).
//
// To add a class: draw its effects in tools/assets/pipeline/fx/<class>.py, `export-fx`, give every ability an
// entry here (and its lasting effects one in EFFECT_LOOKS or SILENT_EFFECTS), take its keys out of
// PENDING_ABILITIES. test/game/abilityFx.test.ts says what is missing.
//
// STACKING. A body has a few SLOTS and shows one lasting look per slot — so however many effects are on a hero,
// each kind of thing has its place and nothing piles up:
//   skin     the whole figure repainted (stone, gold)
//   ground   on the ground behind the feet            behind  body-sized, behind the body
//   beside   standing next to the body, behind it     front   standing ahead of the body
//   low      at toe level ahead of the body           feet    on the feet, in front
//   body     small sparks or drops over the body      overhead a small mark above the life bar
//   mark     a sign on the middle of the body (the hunter's mark)
//   around   a few small things drifting past the body's sides, in front (petals of a heal, motes of light)
//   rim      not a slot of sprites: a thin line of light hugging the figure's own silhouette, frame by frame
//            (render/fxData rims) — it takes no slot and covers nothing, so it shows WITH every other look
// When two effects want the same slot, the higher `priority` wins, then the most recently applied.
//
// SHOTS. What flies is a look too: an ability may name the arrow it shoots (`shot`), a class has its basic arrow
// (CLASS_SHOT). An ability
// that covers the whole wave scatters one-shots across it (`band`) instead of flying something at every enemy.

export type FxSlot = 'ground' | 'behind' | 'beside' | 'front' | 'low' | 'feet' | 'body' | 'overhead' | 'mark' | 'around';

/** Slots drawn behind the figure; the others are drawn in front of it. */
export const UNDER_SLOTS: ReadonlySet<FxSlot> = new Set<FxSlot>(['ground', 'behind', 'beside']);

/** Where a cast's one-shot plays. */
export type CastSpot =
  | 'caster-under' // on the caster, behind its figure
  | 'caster-over' // on the caster, in front of its figure
  | 'ground' // on the world's ground at the caster's feet, under every fighter (a ring that crosses the party)
  | 'party' // on the ground under the middle of the PARTY (a blessing cast from its back row covers all of it)
  | 'wave'; // on the ground under the middle of the enemy WAVE

export interface CastBurst {
  fx: string;
  spot: CastSpot;
  /** Played when the cast clip reaches its blow (render/attackLead.blowWaitMs) instead of at once. */
  atBlow?: boolean;
  /** Offset from the body's centre on the ground line, in art pixels (dx is ahead of the fighter). */
  dx?: number;
  dy?: number;
}

/** What an ability (or a basic attack) shoots: a looping effect that flies to the target. */
export interface ShotLook {
  fx: string;
  /** Lobbed in an arc this many pixels high, instead of flying flat. */
  arc?: number;
  /** A one-shot where it lands, on the ground line, over the fighters (a blast, a splash). */
  land?: string;
  /** It flies in a straight line to its target (light has no weight) instead of dead level like an arrow. */
  straight?: boolean;
}

/** One-shots scattered across the band of the wave an ability covers (a rain of arrows, a field of caltrops). */
export interface BandLook {
  fx: string;
  /** `ground`: under the fighters; `air`: over them. */
  layer: 'ground' | 'air';
  /** One every this many pixels of the band's width. */
  every: number;
  /** They start spread over this long (ms). */
  spreadMs?: number;
  /** They wait for the cast clip's blow (the release, the throw)… */
  atBlow?: boolean;
  /** …or for the ability's shot to land (`shotTo`)… */
  afterShot?: boolean;
  /** …and then this long (ms). */
  delayMs?: number;
  /** They go off in order from the near end of the band to the far one, over this long (ms) — light running
   *  through the wave — instead of at random. */
  sweepMs?: number;
  /** Exactly this many, evenly placed (1 = the middle of the band), instead of one per `every` pixels. */
  count?: number;
}

export interface AbilityLook {
  cast?: readonly CastBurst[];
  /** A one-shot on every enemy the ability hits, centred on its body… */
  hit?: string;
  /** …or standing on the ground at its feet (`ground`: a bolt out of the sky lands where it stands). */
  hitSpot?: 'body' | 'ground';
  /** What it shoots, instead of the class's basic arrow. */
  shot?: ShotLook;
  /** The shot is fired ONCE per cast at the wave (its front, or its middle) rather than at each enemy it hits;
   *  its hits show when it lands. */
  shotTo?: 'front' | 'centre';
  band?: readonly BandLook[];
  /** The hits show this long after the cast clip's blow (the time the volley is in the air). */
  hitDelayMs?: number;
}

export interface LastingLook {
  slot?: FxSlot;
  /** The looping effect shown in the slot. */
  fx?: string;
  /** The whole figure repainted (heroes only; render/fxData skins). */
  skin?: string;
  /** A line of light hugging the figure (heroes only; a rim sheet of render/fxData, drawn behind the figure and
   *  following its every frame). `start`/`end` play when it appears and leaves, as for a slot. */
  rim?: string;
  /** One-shots when the look appears on a body and when it leaves it (played in front of the figure). */
  start?: string;
  end?: string;
  priority?: number;
  /** Only on the fighter that applied the effect itself (the Knight's own Bulwark, not a shield a Priest gave). */
  ownOnly?: boolean;
  /** Only on a fighter that did NOT apply the effect itself (the shield a Priest gives — not the Knight's own
   *  Bulwark, which is the same effect; the tread of her aura under her allies, not under her). */
  otherOnly?: boolean;
  /** Only on fighters of this class. */
  bearerClass?: string;
  /** Repeated across a wide body (and up a tall one) instead of once: a 20 px beast gets one, a boss several. */
  tile?: boolean;
  /** Offset ahead of the body's centre, in art pixels. */
  dx?: number;
  /** The looping effect shown instead of `fx` on a body at least BIG_BODY tall (a boss): a larger drawing of the
   *  same thing, never a scaled one. */
  big?: string;
  /** It appears only once its effect has been on this long (ms): the time the thing that lays it is still in
   *  the air — an enemy does not burn before the arrow lands. */
  delayMs?: number;
  /** How high on the body it sits, as a share of the body's height (0 = the ground line, the default; the
   *  `mark` slot sits at MARK_UP unless told otherwise). Its opening and closing one-shots sit there too. */
  up?: number;
  alpha?: number;
}

/** A body at least this tall (art pixels) wears the `big` drawing of a look that has one. */
export const BIG_BODY = 64;

/** The effect a lasting look loops on a body `height` pixels tall. */
export function lookFx(look: LastingLook, height: number): string | undefined {
  return look.big !== undefined && height >= BIG_BODY ? look.big : look.fx;
}

/** Where a look of the `mark` slot sits on a body: a little above its middle. */
export const MARK_UP = 0.55;

/** How high on a body a lasting look sits, as a share of the body's height. */
export function lookUp(slot: FxSlot | undefined, look: LastingLook): number {
  return look.up ?? (slot === 'mark' ? MARK_UP : 0);
}

export const ABILITY_LOOKS: Readonly<Record<string, AbilityLook>> = {
  // ── Knight ──
  knight_guard: {}, // Stone Skin: the stone rising is the opening of its lasting look (also on the ally Shared Skin covers)
  knight_debilitate: { cast: [{ fx: 'cleave_wave', spot: 'caster-over', atBlow: true, dx: 6 }], hit: 'gash' },
  knight_bulwark: {}, // the wall of light rising is the opening of its lasting look
  knight_battlecry: { cast: [{ fx: 'warcry_ring', spot: 'ground', atBlow: true }] },
  knight_bloodlust: { cast: [{ fx: 'bloodlust_burst', spot: 'caster-over', atBlow: true }] },
  knight_holdtheline: { cast: [{ fx: 'holdline_ring', spot: 'ground', atBlow: true }] },
  knight_riposte: { cast: [{ fx: 'riposte_flash', spot: 'caster-over' }], hit: 'pierce' },
  knight_laststand: {}, // the golden burst is the opening of invulnerability's lasting look (also on a rescued ally)
  // ── Ranger ──
  ranger_fast_fire: {}, // the arrows shooting up from his feet are the opening of its lasting look
  // Aimed Shot: light gathers on the arrowhead through the long draw; a heavy white arrow; it goes through.
  ranger_aimedshot: { cast: [{ fx: 'aim_gather', spot: 'caster-over', dx: 17, dy: -21 }], shot: { fx: 'arrow_heavy' }, hit: 'aim_impact' },
  // Raining Arrows: the volley leaves the bow, then comes down over the whole wave.
  ranger_multishot: {
    cast: [{ fx: 'volley_launch', spot: 'caster-over', atBlow: true }],
    band: [{ fx: 'arrow_fall', layer: 'air', every: 9, spreadMs: 260, atBlow: true, delayMs: 60 }],
    hit: 'arrow_hit', hitDelayMs: 180,
  },
  // Explosive Arrow: one burning arrow to the front of the wave, and the blast where it lands.
  ranger_focus: { shot: { fx: 'arrow_fire', land: 'fire_blast' }, shotTo: 'front' },
  // Caltrops: sown underhand; they lie glinting under the wave while it bleeds.
  ranger_frozentrap: {
    cast: [{ fx: 'caltrops_toss', spot: 'caster-over', atBlow: true, dx: 6, dy: -4 }],
    band: [{ fx: 'caltrop_patch', layer: 'ground', every: 20, spreadMs: 240, atBlow: true, delayMs: 140 }],
  },
  // Weak Spot: the snap shot splits the hide open.
  ranger_weakspot: { hit: 'weak_crack' },
  // Tar Flask: the flask lobbed over the wave, the splash, and the slick burning along the ground.
  ranger_tarflask: {
    shot: { fx: 'flask', arc: 30, land: 'tar_splash' }, shotTo: 'centre',
    band: [{ fx: 'tar_fire', layer: 'ground', every: 22, spreadMs: 220, afterShot: true }],
  },
  // Mark of the Hunter: he names the quarry; the mark closing on it is the opening of its lasting look.
  ranger_mark: { cast: [{ fx: 'mark_call', spot: 'caster-over', atBlow: true, dx: 10, dy: -22 }] },
  // ── Priest ── A heal is mint and soft, a shield azure and faceted, power bright yellow, wrath white-gold.
  // Mend: petals of mint light leave her lantern; the heal winding up the hurt one is the opening of its lasting look.
  priest_mend: { cast: [{ fx: 'mend_gift', spot: 'caster-over', atBlow: true, dx: 21, dy: -19 }] },
  // Power Infusion: a star leaves her hand; the shaft of yellow light on the ally is the opening of its lasting look.
  priest_powerinfusion: { cast: [{ fx: 'infuse_send', spot: 'caster-over', atBlow: true, dx: 14, dy: -24 }] },
  // Holy Shield: the book flashes; the glass closing round the tank is the opening of its lasting look.
  priest_holyshield: { cast: [{ fx: 'ward_spark', spot: 'caster-over', atBlow: true, dx: 15, dy: -24 }] },
  // Holy Nova: the staff's foot strikes, a ring of light opens under the wave and shafts burst up through it, near to far.
  priest_nova: {
    cast: [{ fx: 'nova_flash', spot: 'caster-over', atBlow: true, dx: 8 }, { fx: 'nova_ring', spot: 'wave', atBlow: true, dy: 2 }],
    band: [{ fx: 'nova_shaft', layer: 'air', every: 15, sweepMs: 220, atBlow: true, delayMs: 40 }],
    hit: 'nova_hit', hitDelayMs: 150,
  },
  // Purify: her book flashes white-gold; the heal it carries blooms on the cleansed ally like any heal.
  // (Retribution Aura is a passive talent now: its seal and tread are lasting looks under its stand-in key.)
  priest_purify: { cast: [{ fx: 'nova_flash', spot: 'caster-over', atBlow: true, dx: 8 }] },
  // Sanctuary: a ring of mint light opens under the whole party; the glow each of them stands in is its lasting look.
  priest_sanctuary: { cast: [{ fx: 'sanctuary_ring', spot: 'party', atBlow: true, dy: 2 }] },
  // Smite: light falls on the enemy from the sky (the heal it carries blooms on the ally like any heal).
  priest_smite: { hit: 'smite_strike', hitSpot: 'ground' },
  // Battle Enrage: a wave of crimson fire runs under the party; the wings each of them wears are its lasting look.
  priest_enrage: { cast: [{ fx: 'zeal_wave', spot: 'party', atBlow: true, dy: 2 }] },
};

/** The arrow a class's basic attack shoots (render/fxData); a class without one keeps the old projectile. */
export const CLASS_SHOT: Readonly<Record<string, string>> = { ranger: 'arrow', priest: 'light_bolt' };

/** A basic-attack clip that throws something of its own instead of the class's shot (the Priest's page). */
export const CLIP_SHOT: Readonly<Record<string, Readonly<Record<string, string>>>> = { priest: { attack2: 'light_page' } };

/** What a class's basic attack played with `clip` shoots; undefined for a class with no shot of its own. */
export function basicShotOf(classKey: string, clip: string): string | undefined {
  return CLIP_SHOT[classKey]?.[clip] ?? CLASS_SHOT[classKey];
}

/** Shots that are LIGHT: they fly straight at their target (an arrow flies level) and leave a one-shot where they land. */
export const LIGHT_SHOTS: Readonly<Record<string, { land: string }>> = { light_bolt: { land: 'light_hit' }, light_page: { land: 'light_hit' } };

/** Where a class's shots leave from, ahead of the body's centre and above the ground line (art pixels); a class
 *  not listed shoots from the bow hand. Per clip where the hand is somewhere else. */
export const SHOT_FROM: Readonly<Record<string, Readonly<Record<string, { dx: number; up: number }>>>> = {
  priest: { attack: { dx: 24, up: 21 }, attack2: { dx: 15, up: 23 }, attack3: { dx: 12, up: 37 } },
};

/** The one-shot a heal plays on whoever it heals — every heal, whoever cast it: one look per MEANING. */
export const HEAL_BLOOM = 'heal_bloom';
/** A hero blooms at most this often (a heal on the whole party and its ticks must not strobe). */
export const HEAL_BLOOM_GAP_MS = 350;

/** The signs a blow can raise, instead of words: a hit blocked, a hit that did nothing (invulnerable), a second
 *  strike in one swing. `gapMs`: at most one on a fighter this often — an invulnerable hero under five attackers
 *  shows one glance, not five words. */
export const BLOW_SIGNS = {
  blocked: { fx: 'block_spark', gapMs: 0 },
  invulnerable: { fx: 'invuln_glance', gapMs: 450 },
  multi: { fx: 'multi_sign', gapMs: 0 },
} as const;

/** A passive party AURA has no effect of its own in the simulation; the strip gives every hero it reaches a
 *  stand-in worn effect under this key (`aura:<talent key>`, applied by the hero who holds the talent) so its
 *  look goes through the same slots as everything else. */
export const AURA_PREFIX = 'aura:';
export function auraEffectKey(abilityKey: string): string {
  return `${AURA_PREFIX}${abilityKey}`;
}

/** Whether a party aura (a talent key) has a look of its own: only those are handed to the sprites. */
export function hasAuraLook(key: string): boolean {
  return EFFECT_LOOKS[auraEffectKey(key)] !== undefined;
}

/** How many one-shots a band look scatters over a band `width` pixels wide: at least three. */
export function bandCount(width: number, every: number): number {
  return Math.max(3, Math.round(width / Math.max(1, every)));
}

/** Hero abilities and ultimates that still play the old generic looks: the next jobs. */
export const PENDING_ABILITIES: readonly string[] = [];

// How long after a Priest's cast its gift shows on the ally: her clips reach their release about this long in
// (the blow of `ward` and of `infuse` — render/heroClips), so the glass and the light arrive with her gesture.
const SHIELD_ARRIVES_MS = 400;
const INFUSION_ARRIVES_MS = 450;
// (`around`, not `body`: a mended Knight is often stone, and Stone Skin's glint lives in `body`.)
const MENDING: readonly LastingLook[] = [{ slot: 'around', fx: 'mend_petals', start: 'mend_wind', priority: 1, delayMs: 420 }];

const WEAKENED: readonly LastingLook[] = [{ slot: 'body', fx: 'sapped', tile: true }, { slot: 'overhead', fx: 'weak_mark' }];
const HOBBLED: readonly LastingLook[] = [{ slot: 'feet', fx: 'hobble', tile: true }];

export const EFFECT_LOOKS: Readonly<Record<string, readonly LastingLook[]>> = {
  // Stone Skin: he is stone — the figure itself, with a glint passing over it.
  buff_guard_block: [{ skin: 'stone', priority: 1 }, { slot: 'body', fx: 'stone_glint', start: 'stone_rise', end: 'stone_crumble' }],
  // Bulwark: a tower shield of light standing ahead of him for as long as the absorb holds. The SAME effect given
  // by someone else is the Priest's Holy Shield: a gem of azure glass round the body, drawn in thin lines only (one
  // look, in `front` — it leaves `beside` to the Knight's standard and hides nothing he wears) — that shatters
  // when the absorb is spent.
  fx_shield: [
    { slot: 'front', fx: 'bulwark_wall', start: 'bulwark_raise', end: 'bulwark_break', ownOnly: true, bearerClass: 'knight', dx: 17, alpha: 0.88 },
    { slot: 'front', fx: 'ward_front', start: 'ward_raise', end: 'ward_break', otherOnly: true, priority: 1, delayMs: SHIELD_ARRIVES_MS },
    // …and on herself, when she is the one holding the front (alone, or the last one standing).
    { slot: 'front', fx: 'ward_front', start: 'ward_raise', end: 'ward_break', ownOnly: true, bearerClass: 'priest', priority: 1 },
  ],
  // Battle Cry: a war fire at the feet of everyone it reached.
  buff_battlecry_ad: [{ slot: 'ground', fx: 'battlecry_flames' }],
  // Bloodlust: a blood-red blaze standing behind him.
  buff_bloodlust_as: [{ slot: 'behind', fx: 'bloodlust_aura' }],
  // Hold the Line: a low rampart of light ahead of every ally, and his standard planted behind the Knight.
  buff_holdline_dr: [{ slot: 'low', fx: 'holdline_guard', dx: 14 }, { slot: 'beside', fx: 'banner', ownOnly: true, dx: -13 }],
  // Last Stand (and the ally Living Wall rescues): gold, with a sun turning behind.
  fx_invuln: [{ skin: 'gold', priority: 2 }, { slot: 'behind', fx: 'laststand_rays', start: 'laststand_burst', priority: 2 }],
  // The Knight's debuffs: an enemy that deals less damage bleeds violet and wears a snapped blade; a slowed one
  // drags irons. One look per MEANING, whichever ability laid it.
  debuff_weaken: WEAKENED,
  debuff_riposte_weaken: WEAKENED,
  debuff_vengeance_weaken: WEAKENED,
  debuff_cripple: HOBBLED,
  debuff_vengeance_slow: HOBBLED,
  // Rapid Fire: the "stat up" sign done in pixel art — green arrows climbing round him in quick bursts, most of
  // them behind him, two passing in front at his sides. (The user's choice, 2026-11-15, after two other ideas.)
  buff_fast_fire: [{ slot: 'behind', fx: 'tempo_up', start: 'tempo_burst' }, { slot: 'body', fx: 'tempo_up_front' }],
  // The Ranger's marks on an enemy. Mark of the Hunter: the sight turning on the middle of the body.
  fx_mark: [{ slot: 'mark', fx: 'hunter_mark', big: 'hunter_mark_big', start: 'mark_lock', priority: 2, delayMs: 380 }],
  // Weak Spot: the wound stays open, low on the body (clear of the hunter's mark).
  debuff_weakspot: [{ slot: 'body', fx: 'weak_spot', up: 0.3, priority: 1, delayMs: 270 }],
  // Caltrops: it bleeds.
  fx_dot: [{ slot: 'feet', fx: 'bleeding', tile: true, delayMs: 620 }],
  // Hemorrhage (a passive: her critical hits leave a bleed): the same bleeding, at once — no Caltrops to land first.
  fx_hemorrhage: [{ slot: 'feet', fx: 'bleeding', tile: true }],
  // Scorched Earth: it burns.
  fx_burn: [{ slot: 'body', fx: 'burning', tile: true, delayMs: 720 }],
  // Tar Flask: tar up its legs, still alight.
  fx_tar: [{ slot: 'feet', fx: 'tarred', tile: true, priority: 1, delayMs: 880 }],
  // Killing Field: a thorned snare round the feet of the whole wave.
  debuff_field_slow: [{ slot: 'ground', fx: 'snare', tile: true }],
  // ── Priest ──
  // Mend (and Mending Light, the same thing left by Smite): the heal winds up the body once, then petals of mint
  // light keep leaving it for as long as it mends.
  fx_hot: MENDING,
  fx_light: MENDING,
  // Sanctuary: each of them stands in a ring of mint light on the ground.
  fx_sanctuary: [{ slot: 'ground', fx: 'sanctuary_glow', priority: 1, delayMs: 420 }],
  // The lesser wards (Deep Sanctuary, Second Wind): a small canopy of the shield's glass over the head.
  fx_ward: [{ slot: 'front', fx: 'ward_veil' }],
  // Power Infusion: a bright yellow AURA that is only a rim — a thin line of light hugging the figure, brightest
  // at the head — with a dotted glow at the feet and three slow motes climbing past its sides. Nothing behind the
  // body and nothing over it: the rim takes no slot, so Rapid Fire's arrows, Bloodlust's blaze, a stone or a
  // golden skin all show with it (the user, 2026-11-15: the mantle it was first was "invasivo" and hid Rapid Fire).
  buff_infusion_as: [
    { rim: 'infused', start: 'infusion_ignite', priority: 1, delayMs: INFUSION_ARRIVES_MS },
    { slot: 'around', fx: 'infusion_motes', delayMs: INFUSION_ARRIVES_MS },
  ],
  // Battle Enrage: wings of crimson-gold fire open behind HER shoulders; the heroes she rouses wear a rim of the
  // same fire and no wings — three winged heroes abreast buried each other, and `behind` is where their own
  // looks live (Rapid Fire, Bloodlust, Last Stand).
  buff_enrage_as: [
    { slot: 'behind', fx: 'zeal_wings', start: 'zeal_ignite', ownOnly: true, priority: 2, delayMs: 300 },
    { rim: 'roused', start: 'zeal_ignite', otherOnly: true, priority: 2, delayMs: 300 },
  ],
  // Retribution Aura (a stand-in key: see AURA_PREFIX): one thin ring of gold under her, a tread of it under each
  // ally. Always on, so both yield their slot (priority −1) to anything that comes and goes.
  [auraEffectKey('priest_retribution')]: [
    { slot: 'ground', fx: 'retribution_seal', ownOnly: true, priority: -1 },
    { slot: 'feet', fx: 'retribution_tread', otherOnly: true, priority: -1 },
  ],
  // ── The world bosses' kit ──
  // Frenzy: red fire running along the boss's feet for as long as it lasts.
  buff_boss_frenzy: [{ slot: 'feet', fx: 'frenzy_fire', start: 'frenzy_burst', tile: true, priority: 2 }],
  // Mortal Wound: the claws that land, and the wound that stays open on the hero while its healing is cut.
  debuff_mortal_wound: [{ slot: 'mark', fx: 'mortal_wound', start: 'mortal_rend', priority: 2 }],
  // ── The boss kit (data/bossKit.ts; the rest of its spectacle is render/bossFx) ──
  // Armored: plates of steel light over the whole boss while the shell holds; they lock on, and burst when it breaks.
  buff_boss_shell: [{ slot: 'body', fx: 'shell_plate', tile: true, start: 'shell_raise', end: 'shell_break', up: 0.5, priority: 3 }],
  // Venomous: the hero it has poisoned bubbles green (over Stone Skin's glint: the poison is what matters).
  debuff_venom: [{ slot: 'body', fx: 'venom_drip', start: 'venom_splash', up: 0.5, priority: 3 }],
  // Roots: he is held — roots out of the ground wound round him, falling away when they let go.
  debuff_rooted: [{ slot: 'feet', fx: 'roots_bind', start: 'roots_rise', end: 'roots_break', priority: 3 }],
  // Esporas: destroying angels at his feet and rooted on him, their dust climbing; they wither when a heal clears them.
  debuff_spores: [{ slot: 'feet', fx: 'spores_grow', start: 'spore_land', end: 'spore_wither', priority: 3 }],
  // Seismic: the ground never rests at the boss's feet — low dust and pebbles along its whole width.
  buff_boss_tremor: [{ slot: 'low', fx: 'seismic_tremor', tile: true }],
  // Culpa: the Scapegoat's brand glows on the marked hero; it comes down on him when the mark is laid.
  debuff_guilt: [{ slot: 'mark', fx: 'guilt_brand', start: 'guilt_fall', priority: 3 }],
  // Silencio dorado: a dial of gold wire behind the hero, its hands stopped.
  debuff_gilded: [{ slot: 'behind', fx: 'gilded_halo', start: 'gild_lock', up: 0.6, priority: 1 }],
};

/** Effects of covered abilities that are shown by a sibling effect's look. */
export const SILENT_EFFECTS: ReadonlySet<string> = new Set([
  'buff_battlecry_crit', // Battle Cry's second stat
  'buff_bloodlust_ls', // Bloodlust's second stat
  'buff_standard_block', // Standard Bearer: the planted standard already says it
  'buff_standard_armor',
  'buff_focused_fire', // Focused Fire: Rapid Fire's look already says it
  'debuff_tar_slow', // Tar Flask's slow: the tar on its legs
  'debuff_field_vuln', // Killing Field's second half: the snare
  'buff_infusion_cdr', // Power Infusion's second stat: the yellow rim already says it
  'buff_enrage_cdr', // Battle Enrage's second stat: the wings
  'buff_aegis_dr', // Aegis: the shield it rides on
]);

export function abilityLook(abilityKey: string): AbilityLook | undefined {
  return ABILITY_LOOKS[abilityKey];
}

/** True when an effect is drawn by this module (or deliberately not drawn): the generic category overlay of
 *  render/effectAuras stays off for it. */
export function hasOwnLook(effectKey: string): boolean {
  return EFFECT_LOOKS[effectKey] !== undefined || SILENT_EFFECTS.has(effectKey);
}

/** The slice of an active effect the looks are chosen from (data/effects.ActiveEffect). */
export interface WornEffect {
  defKey: string;
  sourceId: string;
  remainingMs: number;
  totalMs?: number;
}

export interface Bearer {
  id: string;
  classKey?: string;
}

/** A lasting look on a body: which effect put it there and what it shows. */
export interface WornLook {
  effectKey: string;
  look: LastingLook;
}

export interface WornLooks {
  /** The look of each occupied slot. */
  slots: Map<FxSlot, WornLook>;
  /** The skin the figure wears, or null. */
  skin: string | null;
  /** The rim of light round the figure (and the effect it comes from), or null. */
  rim: WornLook | null;
}

function applies(look: LastingLook, e: WornEffect, bearer: Bearer): boolean {
  if (look.ownOnly === true && e.sourceId !== bearer.id) return false;
  if (look.otherOnly === true && e.sourceId === bearer.id) return false;
  if (look.bearerClass !== undefined && look.bearerClass !== bearer.classKey) return false;
  return true;
}

/** What `bearer` wears for the effects on it: one look per slot, at most one skin and one rim — the higher priority, then
 *  the effect applied most recently (the one that has run for the shortest time). */
export function wornLooks(effects: readonly WornEffect[], bearer: Bearer): WornLooks {
  const slots = new Map<FxSlot, WornLook>();
  const rank = new Map<string, { priority: number; age: number }>();
  let skin: string | null = null;
  let rim: WornLook | null = null;
  const beats = (slot: string, priority: number, age: number): boolean => {
    const held = rank.get(slot);
    return held === undefined || priority > held.priority || (priority === held.priority && age < held.age);
  };
  for (const e of effects) {
    const looks = EFFECT_LOOKS[e.defKey];
    if (looks === undefined) continue;
    const age = e.totalMs === undefined ? 0 : Math.max(0, e.totalMs - e.remainingMs);
    for (const look of looks) {
      if (!applies(look, e, bearer)) continue;
      if (e.totalMs !== undefined && age < (look.delayMs ?? 0)) continue; // what lays it has not arrived yet
      const priority = look.priority ?? 0;
      if (look.skin !== undefined && beats('skin', priority, age)) {
        rank.set('skin', { priority, age });
        skin = look.skin;
      }
      if (look.rim !== undefined && beats('rim', priority, age)) {
        rank.set('rim', { priority, age });
        rim = { effectKey: e.defKey, look };
      }
      if (look.slot !== undefined && look.fx !== undefined && beats(look.slot, priority, age)) {
        rank.set(look.slot, { priority, age });
        slots.set(look.slot, { effectKey: e.defKey, look });
      }
    }
  }
  return { slots, skin, rim };
}

/** How many times a tiled look repeats across a body `width` art pixels wide, for a look whose cell is `cell`
 *  wide: one on anything up to a cell and a half, then one more per cell. */
export function tileCount(width: number, cell: number): number {
  return Math.max(1, Math.round(width / Math.max(1, cell) - 0.25));
}
