import type { AbilityDef } from './abilities';

// The abilities of the BOSS KIT (data/bossKit.ts): the affixes that are abilities (Certero) and the mechanics of
// the world bosses. The numbers here are the Normal ones; a mechanic's per-difficulty numbers are laid over its
// definition when the boss spawns (bossKit.mechanicAbility). Their effects are in data/bossEffects.ts. Names are
// provisional. (The area blows and Mortal Wound are older and live in data/abilities.ts.)

const EVERYONE = Number.POSITIVE_INFINITY; // abilities.WHOLE_PARTY (not imported: this file loads inside it)

export const BOSS_ABILITIES: Record<string, AbilityDef> = {
  // ── Affix: Certero ──
  boss_deadeye: {
    key: 'boss_deadeye', name: 'Deadeye', icon: 'aim',
    desc: 'Every 8 s the boss strikes the hero with the least armour, wherever it stands. Each boss does it its own way.',
    cooldownMs: 8000, openerMs: 3500, target: 'softestEnemy', applies: [{ effectKey: 'fx_damage' }],
    castCondition: 'enemyPresent', power: { coeff: 0.8 },
  },

  // ── The Crushing Blow (data/bossKit CRUSH): every world boss's heavy blow from Inferno on — the defence check ──
  boss_crush: {
    key: 'boss_crush', name: 'Anvilfall', icon: 'explosion',
    desc: 'The world boss winds up its heaviest blow: the front hero takes it in full, and a magic shock reaches everyone behind. A hero who has not braced for it falls.',
    cooldownMs: 24000, openerMs: 8000, castTimeMs: 2000, holdsAttack: true, heavy: true, target: 'frontEnemy', applies: [],
    castCondition: 'enemyPresent', special: { kind: 'crush' },
  },

  // ── World 1 · the Crowmother ──
  boss_flock: {
    key: 'boss_flock', name: 'Murder of Crows', icon: 'summon',
    desc: 'She opens her wings and looses crows at the back line. They peck until they are killed, and leave on their own after 8 s.',
    cooldownMs: 15000, openerMs: 7000, castTimeMs: 1500, holdsAttack: true, target: 'self', applies: [],
    castCondition: 'enemyPresent', special: { kind: 'summon', summon: 'crow', count: 2, hitOfTrash: 0.35 },
  },
  // ── World 2 · Our Lady of Mistletoe ──
  boss_roots: {
    key: 'boss_roots', name: 'Roots', icon: 'root',
    desc: 'She binds the hero who has hurt her most: it cannot attack for 5 s.',
    cooldownMs: 18000, openerMs: 8000, castTimeMs: 1500, target: 'topDamageEnemy',
    applies: [{ effectKey: 'debuff_rooted', durationMsOverride: 5000 }], castCondition: 'enemyPresent',
  },
  // ── World 3 · the Drowned Moon ──
  boss_chain_bolt: {
    key: 'boss_chain_bolt', name: 'Chain Lightning', icon: 'frost',
    desc: 'A bolt falls on one hero, picked at random, and jumps to all the others for less.',
    cooldownMs: 12000, openerMs: 7000, castTimeMs: 1500, target: 'randomEnemy', magic: true,
    applies: [{ effectKey: 'fx_damage' }], castCondition: 'enemyPresent',
    power: { coeff: 0.8, splashCoeff: 0.32, splashRadius: EVERYONE },
  },
  // ── World 4 · the Scapegoat ──
  boss_guilt: {
    key: 'boss_guilt', name: 'Guilt', icon: 'expose',
    desc: 'It marks one hero, picked at random: for 8 s that hero pays, in life, for the damage the party deals the boss.',
    cooldownMs: 20000, openerMs: 6000, castTimeMs: 1500, target: 'randomEnemy',
    applies: [{ effectKey: 'debuff_guilt', durationMsOverride: 8000, value: 1.5 }], castCondition: 'enemyPresent',
  },
  // ── World 5 · the Gilded Abbot ──
  boss_gild: {
    key: 'boss_gild', name: 'Golden Silence', icon: 'silence',
    desc: "For 6 s the cooldowns of every hero's abilities stand still.",
    cooldownMs: 24000, openerMs: 8000, castTimeMs: 1500, target: 'allEnemies',
    applies: [{ effectKey: 'debuff_gilded', durationMsOverride: 6000 }], castCondition: 'enemyPresent',
  },
  // ── World 6 · the Ninth Wave ──
  boss_undertow: {
    key: 'boss_undertow', name: 'Undertow', icon: 'frost',
    desc: 'A wave strikes all three heroes and drags them back: they do not attack until they have walked back.',
    cooldownMs: 12000, openerMs: 6000, castTimeMs: 1500, target: 'frontEnemy',
    applies: [{ effectKey: 'fx_damage' }], castCondition: 'enemyPresent',
    power: { coeff: 0.5, splashCoeff: 0.5, splashRadius: EVERYONE }, special: { kind: 'undertow', dragPx: 50 },
  },
  // ── World 7 · the Destroying Angel ──
  boss_spores: {
    key: 'boss_spores', name: 'Spores', icon: 'dot',
    desc: 'A cloud of spores settles on every hero, layer on layer; any direct heal clears them.',
    cooldownMs: 12000, openerMs: 5000, castTimeMs: 1500, target: 'allEnemies', applies: [],
    castCondition: 'enemyPresent', special: { kind: 'spores', effectKey: 'debuff_spores', pctPerLayer: 0.2 },
  },
  // ── World 8 · the Quench ──
  boss_red_blade: {
    key: 'boss_red_blade', name: 'Red-Hot Blade', icon: 'fire',
    desc: 'The ground under all three heroes burns for 6 s.',
    cooldownMs: 18000, openerMs: 7000, castTimeMs: 1500, target: 'allEnemies', applies: [],
    castCondition: 'enemyPresent', special: { kind: 'groundFire', burnMs: 6000, totalOfHit: 0.6 },
  },
  // ── World 9 · the Verdict ──
  boss_scales: {
    key: 'boss_scales', name: 'The Scales', icon: 'expose',
    desc: 'It levels the party: every hero drops to the share of life of the one who has least.',
    cooldownMs: 20000, openerMs: 9000, castTimeMs: 1500, target: 'allEnemies', applies: [],
    castCondition: 'enemyPresent', special: { kind: 'scales' },
  },
  // ── World 10 · the Unmaker ──
  boss_mirror: {
    key: 'boss_mirror', name: 'Mirrors', icon: 'surge',
    desc: 'It reflects the last ability the party used: its harm on the heroes, its heals and buffs on itself.',
    cooldownMs: 10000, openerMs: 6000, castTimeMs: 1500, target: 'self', applies: [],
    castCondition: 'enemyPresent',
    special: { kind: 'mirror', harm: 0.25, boon: 0.02, buff: 0.3, panes: 6, paneEffectKey: 'buff_mirror_panes', panePct: 5, reflectionEvery: 2, reflection: 'reflection', reflectionHit: 0.5 },
  },
  // …with all six of its mirrors lit it breaks them over the party: an area blow on everyone, telegraphed.
  boss_shatter: {
    key: 'boss_shatter', name: 'Shatter', icon: 'explosion',
    desc: 'With its six mirrors lit it breaks them over the whole party, and starts lighting them again.',
    cooldownMs: 3000, castTimeMs: 1500, holdsAttack: true, target: 'frontEnemy', applies: [{ effectKey: 'fx_damage' }],
    castCondition: 'enemyPresent', power: { coeff: 1.2, splashCoeff: 1.2, splashRadius: EVERYONE },
    special: { kind: 'shatter', panes: 6, paneEffectKey: 'buff_mirror_panes' },
  },
};
