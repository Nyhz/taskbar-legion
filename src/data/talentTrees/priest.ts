import { ability, capstone, modifier, role, stat, type ClassTreeSpec } from '../talentSpec';

// Priest — healer (docs/redesign/CLASSES.md §5, first wave). Devotion keeps the whole party standing, Zeal
// heals fast and lifts the party's tempo. Names are provisional.

export const PRIEST_TREE: ClassTreeSpec = {
  classKey: 'priest',
  trunk: [
    [ability('priest_mend'), ability('priest_powerinfusion'), stat('priest_t1_healPower', 'healPower', 3), stat('priest_t1_health', 'health', 2)],
    [
      ability('priest_holyshield'),
      role('priest_triage', 'Triage', 'Her heals are 3% stronger per rank on allies under 40% of their life.',
        { type: 'dealt', what: 'heal', when: { type: 'hpBelow', frac: 0.4 }, pctPerRank: 3 }),
      stat('priest_t2_cooldownReduction', 'cooldownReduction', 1.5), stat('priest_t2_magicResist', 'magicResist', 2.5),
    ],
    [
      ability('priest_nova'),
      // PROVISIONAL value (the document leaves it "to probe"): 0.05% of max life per second per rank.
      role('priest_vigil', 'Vigil', 'While she lives, the whole party regenerates 0.05% of its max life per second per rank.',
        { type: 'partyRegen', pctMaxHpPerSecPerRank: 0.05 }),
      stat('priest_t3_healPower', 'healPower', 3), stat('priest_t3_health', 'health', 2),
    ],
    [
      ability('priest_retribution'),
      role('priest_sacred_ward', 'Sacred Ward', 'The whole party has 1.5% more magic resist per rank.',
        { type: 'partyStat', stat: 'magicResist', mode: 'percent', valuePerRank: 1.5 }),
      stat('priest_t4_cooldownReduction', 'cooldownReduction', 1.5), stat('priest_t4_magicResist', 'magicResist', 2.5),
    ],
  ],
  branches: [
    {
      key: 'devotion', name: 'Devotion',
      rows: [
        [ability('priest_sanctuary'), stat('priest_devotion_t5_healPower', 'healPower', 4)],
        [
          modifier('priest_mod_swift_mend', 'Swift Mend', '30% of Mend heals at once; the rest rolls as before.', 'priest_mend',
            { patch: { effects: [{ effectKey: 'fx_hot', powerScale: 0.7 }], addApplies: [{ effectKey: 'fx_heal', powerScale: 0.3 }] } }),
          modifier('priest_mod_aegis', 'Aegis', 'Holy Shield also gives 10% less damage taken while it lasts.', 'priest_holyshield',
            { patch: { addApplies: [{ effectKey: 'buff_aegis_dr' }] } }),
        ],
        [stat('priest_devotion_t7_health', 'health', 2), stat('priest_devotion_t7_magicResist', 'magicResist', 2.5)],
        [
          modifier('priest_mod_deep_sanctuary', 'Deep Sanctuary', 'Sanctuary also gives each ally a shield of 4% of its life.', 'priest_sanctuary',
            { patch: { addApplies: [{ effectKey: 'fx_ward', power: { coeff: 0.04 } }] } }),
          stat('priest_devotion_t8_healPower', 'healPower', 4),
        ],
        [stat('priest_devotion_t9_healPower', 'healPower', 4), stat('priest_devotion_t9_cooldownReduction', 'cooldownReduction', 1.5)],
        [
          capstone('priest_cap_second_wind', 'Second Wind', 'Once per stage, the first time an ally drops under 25% of its life, the whole party heals 30% and gets a 10% shield.',
            { addTriggers: [{ key: 'priest_cap_second_wind', event: { on: 'allyHpBelow', frac: 0.25 }, uses: { perStage: 1 }, actions: [
              { do: 'heal', to: 'allAllies', hpFrac: 0.3 },
              { do: 'apply', effectKey: 'fx_ward', to: 'allAllies', hpFrac: 0.1 },
            ] }] }),
        ],
      ],
    },
    {
      key: 'zeal', name: 'Zeal',
      rows: [
        [ability('priest_smite'), stat('priest_zeal_t5_cooldownReduction', 'cooldownReduction', 1.5)],
        [
          modifier('priest_mod_radiant_nova', 'Radiant Nova', 'Holy Nova also heals each ally for 3% of its life.', 'priest_nova',
            { patch: { addApplies: [{ effectKey: 'fx_heal', target: 'allAllies', power: { coeff: 0.03 } }] } }),
          modifier('priest_mod_twin_infusion', 'Twin Infusion', 'Power Infusion reaches two heroes.', 'priest_powerinfusion',
            { patch: { target: 'twoDpsAllies' } }),
        ],
        [stat('priest_zeal_t7_healPower', 'healPower', 3), stat('priest_zeal_t7_health', 'health', 2)],
        [
          modifier('priest_mod_mending_light', 'Mending Light', "Smite's heal also leaves a heal of 4% of the ally's life over 4s.", 'priest_smite',
            { patch: { addApplies: [{ effectKey: 'fx_light', power: { coeff: 0.04 } }] } }),
          stat('priest_zeal_t8_magicResist', 'magicResist', 2.5),
        ],
        [stat('priest_zeal_t9_healPower', 'healPower', 4), stat('priest_zeal_t9_cooldownReduction', 'cooldownReduction', 1.5)],
        [
          capstone('priest_cap_crusade', 'Crusade', 'Battle Enrage also fires against elites and lasts 15s.',
            { vs: 'eliteOrBoss', durationMs: 15000 }),
        ],
      ],
    },
  ],
};
