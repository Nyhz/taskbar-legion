import type { EffectDef } from './effects';

// Effects of the BOSS KIT (data/bossKit.ts): what the affixes and the world bosses' mechanics put on a boss or on
// the heroes. What a boss lays on a hero is flagged `beneficial: false`, so the Priest's heals lift it (each heal
// one effect: data/healing) — the Roots too (user decision, 2026-11-15). `cleansePriority` says which goes first.

export const BOSS_EFFECTS: Record<string, EffectDef> = {
  // Acorazado: the shell. `value` is what is left of it; it wears off with the damage the boss takes
  // (sim/bossMechanics.shellDamage) and the effect ends when it is spent.
  buff_boss_shell: {
    key: 'buff_boss_shell', name: 'Shell', icon: 'guard',
    kind: { type: 'shell' }, durationMs: 3_600_000, maxStacks: 1, stackRule: 'refresh', beneficial: true,
  },
  // Venenoso: stacks of poison, each a share of the hero's life per second; lingers 4 s after the last hit.
  debuff_venom: {
    key: 'debuff_venom', name: 'Venom', icon: 'dot',
    kind: { type: 'dot', damagePerTick: 0, element: 'poison' }, durationMs: 4000, maxStacks: 5, stackRule: 'refresh', beneficial: false, cleansePriority: 1,
  },
  // Sísmico: a marker on the boss for as long as the fight lasts — the strip shakes the ground at its feet. It
  // does nothing in the simulation (the affix is the shorter cooldown of its area blow).
  buff_boss_tremor: {
    key: 'buff_boss_tremor', name: 'Tremor', icon: 'explosion',
    kind: { type: 'tag', tag: 'tremor' }, durationMs: 3_600_000, maxStacks: 1, stackRule: 'refresh', beneficial: true,
  },
  // Culpa: marked — while it lasts the hero loses `value` % of his life for every 1 % of its life the boss loses
  // (sim/bossMechanics). Not a hit and not damage over time: it follows what the party does.
  debuff_guilt: {
    key: 'debuff_guilt', name: 'Guilt', icon: 'expose',
    kind: { type: 'guilt' }, durationMs: 8000, maxStacks: 1, stackRule: 'refresh', beneficial: false, cleansePriority: 4,
  },
  // Silencio dorado: the cooldowns of the hero's abilities stand still while it lasts.
  debuff_gilded: {
    key: 'debuff_gilded', name: 'Golden Silence', icon: 'silence',
    kind: { type: 'cooldownFreeze' }, durationMs: 6000, maxStacks: 1, stackRule: 'refresh', beneficial: false, cleansePriority: 4,
  },
  // Esporas: layers of spores, each a share of the hero's life per second; every cloud adds one and renews them
  // all. Any heal on the hero clears them all (`healCleansed`): an instant one as it lands, a rolling one as it is
  // applied.
  debuff_spores: {
    key: 'debuff_spores', name: 'Spores', icon: 'dot',
    kind: { type: 'dot', damagePerTick: 0, element: 'spores' }, durationMs: 20_000, maxStacks: 5, stackRule: 'refresh', beneficial: false, healCleansed: true, cleansePriority: 2,
  },
  // Espejos, the six mirrors: one stack per lit pane, each worth a share more damage (the value is the
  // difficulty's, given when it is lit); they stay lit until the boss breaks them.
  buff_mirror_panes: {
    key: 'buff_mirror_panes', name: 'Lit Mirrors', icon: 'surge',
    kind: { type: 'statMod', stat: 'attackDamage', mode: 'percent', value: 5 }, durationMs: 3_600_000, maxStacks: 6, stackRule: 'refresh', beneficial: true,
  },
  // Raíces: bound — no attacks, no casts — until it runs out or a heal lifts it.
  debuff_rooted: {
    key: 'debuff_rooted', name: 'Rooted', icon: 'root',
    kind: { type: 'disarm' }, durationMs: 5000, maxStacks: 1, stackRule: 'refresh', beneficial: false, cleansePriority: 5,
  },
};
