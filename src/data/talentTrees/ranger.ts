import { ability, capstone, effect, modifier, role, stat, type ClassTreeSpec } from '../talentSpec';

// Ranger — damage (docs/redesign/CLASSES.md §4, first wave). Marksman breaks one target, Stalker wears the
// whole wave down. Names are provisional.
// Second combat wave (2026-11-15): five EFFECT passives took the place of five stat nodes — First Blood (was the
// tier-1 attack speed), Countersniper (Marksman 7 attack damage), Hemorrhage (Marksman 9 crit chance; it was Pierce
// Armour for a few hours, replaced by the user's choice), Pierce Through (Stalker 7 attack damage) and Cruelty (Stalker 9 cooldown reduction).

export const RANGER_TREE: ClassTreeSpec = {
  classKey: 'ranger',
  trunk: [
    [
      ability('ranger_fast_fire'), ability('ranger_aimedshot'), stat('ranger_t1_attackDamage', 'attackDamage', 3),
      effect('ranger_first_blood', 'First Blood', '+6% damage per rank on her first hit on each enemy.',
        { type: 'dealt', what: 'damage', when: { type: 'firstHit' }, pctPerRank: 6 }),
    ],
    [
      ability('ranger_multishot'),
      role('ranger_predator', 'Predator', '+2% damage per rank to enemies under 30% of their life.',
        { type: 'dealt', what: 'damage', when: { type: 'hpBelow', frac: 0.3 }, pctPerRank: 2 }),
      stat('ranger_t2_critChance', 'critChance', 2), stat('ranger_t2_health', 'health', 2),
    ],
    [
      ability('ranger_focus'),
      role('ranger_long_shot', 'Long Shot', '+1.5% damage per rank to enemies that have not reached the fight yet.',
        { type: 'dealt', what: 'damage', when: { type: 'approaching' }, pctPerRank: 1.5 }),
      stat('ranger_t3_attackDamage', 'attackDamage', 3), stat('ranger_t3_critDamage', 'critDamage', 4),
    ],
    [
      ability('ranger_frozentrap'),
      role('ranger_hunters_focus', "Hunter's Focus", '+2% damage per rank to elites and bosses.',
        { type: 'dealt', what: 'damage', when: { type: 'eliteOrBoss' }, pctPerRank: 2 }),
      stat('ranger_t4_attackSpeed', 'attackSpeed', 1.5), stat('ranger_t4_critChance', 'critChance', 2),
    ],
  ],
  branches: [
    {
      key: 'marksman', name: 'Marksman',
      rows: [
        [ability('ranger_weakspot'), stat('ranger_marksman_t5_critChance', 'critChance', 2)],
        [
          modifier('ranger_mod_heartseeker', 'Heartseeker', 'Aimed Shot always crits.', 'ranger_aimedshot',
            { patch: { power: { alwaysCrit: true } } }),
          modifier('ranger_mod_focused_fire', 'Focused Fire', 'Rapid Fire also gives +20% crit damage.', 'ranger_fast_fire',
            { patch: { addApplies: [{ effectKey: 'buff_focused_fire' }] } }),
        ],
        [
          stat('ranger_marksman_t7_critDamage', 'critDamage', 4),
          effect('ranger_countersniper', 'Countersniper', '+4% damage per rank to enemies that fight from range.',
        { type: 'dealt', what: 'damage', when: { type: 'ranged' }, pctPerRank: 4 }),
        ],
        [
          modifier('ranger_mod_open_wound', 'Open Wound', 'Weak Spot lasts 9s instead of 6.', 'ranger_weakspot',
            { patch: { effects: [{ effectKey: 'debuff_weakspot', durationMs: 9000 }] } }),
          stat('ranger_marksman_t8_attackDamage', 'attackDamage', 3),
        ],
        [
          stat('ranger_marksman_t9_critDamage', 'critDamage', 4),
          effect('ranger_hemorrhage', 'Hemorrhage', 'Her critical hits also leave a bleed worth 4% of that hit per rank over 3s.',
        { type: 'passive', effect: { is: 'critBleed', effectKey: 'fx_hemorrhage' }, perRank: 4 }),
        ],
        [
          capstone('ranger_cap_relentless_mark', 'Relentless Mark', 'Mark of the Hunter also goes on elites, and when its bearer dies it jumps to the enemy in front.',
            { vs: 'eliteOrBoss', addTriggers: [{ key: 'ranger_cap_relentless_mark', event: { on: 'bearerDeath', effectKey: 'fx_mark' }, marker: 'ranger_mark', actions: [{ do: 'move', to: 'frontEnemy' }] }] }),
        ],
      ],
    },
    {
      key: 'stalker', name: 'Stalker',
      rows: [
        [ability('ranger_tarflask'), stat('ranger_stalker_t5_attackSpeed', 'attackSpeed', 1.5)],
        [
          modifier('ranger_mod_scorched_earth', 'Scorched Earth', "Explosive Arrow's targets burn: 60% attack damage over 4s.", 'ranger_focus',
            { patch: { addApplies: [{ effectKey: 'fx_burn', power: { coeff: 0.6 }, onSplash: true }] } }),
          modifier('ranger_mod_barbed_caltrops', 'Barbed Caltrops', "The Caltrops' bleed lasts 6s and deals 50% more in total.", 'ranger_frozentrap',
            { patch: { effects: [{ effectKey: 'fx_dot', durationMs: 6000, powerScale: 1.5 }] } }),
        ],
        [
          effect('ranger_pierce_through', 'Pierce Through', 'When a shot kills, 10% per rank of the damage left over passes to the enemy behind.',
        { type: 'passive', effect: { is: 'overkillPierce' }, perRank: 10 }),
          stat('ranger_stalker_t7_multistrike', 'multistrike', 1.2),
        ],
        [
          modifier('ranger_mod_burning_tar', 'Burning Tar', "The tar's damage rises 50% and it lasts 2s longer.", 'ranger_tarflask',
            { patch: { effects: [{ effectKey: 'fx_tar', durationAddMs: 2000, powerScale: 1.5 }, { effectKey: 'debuff_tar_slow', durationAddMs: 2000 }] } }),
          stat('ranger_stalker_t8_attackDamage', 'attackDamage', 3),
        ],
        [
          stat('ranger_stalker_t9_attackSpeed', 'attackSpeed', 1.5),
          effect('ranger_cruelty', 'Cruelty', '+3% damage per rank to enemies that bleed, burn or are slowed.',
        { type: 'dealt', what: 'damage', when: { type: 'afflicted' }, pctPerRank: 3 }),
        ],
        [
          capstone('ranger_cap_killing_field', 'Killing Field', 'On engaging each wave, every enemy takes +10% damage and is 30% slower for 6s.',
            { addTriggers: [{ key: 'ranger_cap_killing_field', event: { on: 'waveEngage' }, actions: [
              { do: 'apply', effectKey: 'debuff_field_vuln', to: 'allEnemies', value: 10 },
              { do: 'apply', effectKey: 'debuff_field_slow', to: 'allEnemies' },
            ] }] }),
        ],
      ],
    },
  ],
};
