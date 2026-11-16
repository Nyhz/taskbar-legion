import { ability, capstone, effect, modifier, role, stat, type ClassTreeSpec } from '../talentSpec';

// Priest — healer (docs/redesign/CLASSES.md §5, first wave). Devotion keeps the whole party standing, Zeal
// heals fast and lifts the party's tempo. Names are provisional.
// Second combat wave (2026-11-15): five EFFECT passives took the place of five stat nodes — Overflow (was the
// tier-1 life), Mantle (Devotion 7 magic resist), Revive (Devotion 9 cooldown reduction), Searing Light (Zeal 7
// life) and Condemn (Zeal 9 heal power). Retribution Aura is a passive of tier 4 (it took the tier's magic-resist
// node, beside Sacred Ward) and its ability slot went to the new Purify (gone since: see below).

export const PRIEST_TREE: ClassTreeSpec = {
  classKey: 'priest',
  trunk: [
    [
      ability('priest_mend'), ability('priest_healing_light'), stat('priest_t1_healPower', 'healPower', 3),
      effect('priest_overflow', 'Overflow', 'While she lives, healing that does not fit becomes a shield of up to 1% of life per rank.',
        { type: 'passive', effect: { is: 'overhealShield', effectKey: 'fx_overflow' }, perRank: 1 }),
    ],
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
      ability('priest_circle'),
      role('priest_sacred_ward', 'Sacred Ward', 'The whole party has 1.5% more magic resist per rank.',
        { type: 'partyStat', stat: 'magicResist', mode: 'percent', valuePerRank: 1.5 }),
      // Retribution Aura was an ability; it is a passive now and keeps its key, so a save's ranks carry over.
      role('priest_retribution', 'Retribution Aura', 'The whole party deals 3% more damage per rank.',
        { type: 'partyStat', stat: 'damageIncrease', mode: 'percent', valuePerRank: 3 }),
      stat('priest_t4_cooldownReduction', 'cooldownReduction', 1.5),
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
        [
          stat('priest_devotion_t7_health', 'health', 2),
          effect('priest_mantle', 'Mantle', 'While she lives, the hero with the least life takes 2% less damage per rank.',
        { type: 'passive', effect: { is: 'lowestGuard' }, perRank: 2 }),
        ],
        [
          modifier('priest_mod_deep_sanctuary', 'Deep Sanctuary', 'Sanctuary also gives each ally a shield of 4% of its life.', 'priest_sanctuary',
            { patch: { addApplies: [{ effectKey: 'fx_ward', power: { coeff: 0.04 } }] } }),
          stat('priest_devotion_t8_healPower', 'healPower', 4),
        ],
        [
          stat('priest_devotion_t9_healPower', 'healPower', 4),
          effect('priest_revive', 'Revive', 'Fallen heroes come back 6% sooner per rank.',
        { type: 'passive', effect: { is: 'fasterRespawn' }, perRank: 6 }),
        ],
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
        [
          ability('priest_smite'),
          // Power Infusion, a passive now (user, 2026-11-16): each time she heals with an instant heal or applies one
          // over time, the allies she HEALS (herself too, when she heals herself) get 4 s of 15 % attack speed and
          // 15 % cooldown reduction — 3 % per rank, 15 % at rank 5. Renewed, never stacked.
          effect('priest_infusion', 'Power Infusion', 'Each of her heals gives the allies it heals 3% attack speed and 3% cooldown reduction per rank for 4s.',
            { type: 'passive', effect: { is: 'healInfusion', effectKeys: ['buff_infusion_as', 'buff_infusion_cdr'], durationMs: 4000, to: 'healed' }, perRank: 3 }),
        ],
        [
          modifier('priest_mod_radiant_nova', 'Radiant Nova', 'Holy Nova also heals each ally for 3% of its life.', 'priest_nova',
            { patch: { addApplies: [{ effectKey: 'fx_heal', target: 'allAllies', power: { coeff: 0.03 } }] } }),
          modifier('priest_mod_twin_light', 'Twin Light', 'Healing Light also heals the next most hurt ally for half as much.', 'priest_healing_light',
            { patch: { addApplies: [{ effectKey: 'fx_heal', target: 'nextHurtAlly', powerScale: 0.5 }] } }),
        ],
        [
          stat('priest_zeal_t7_healPower', 'healPower', 3),
          effect('priest_searing_light', 'Searing Light', '+6% damage per rank on her attacks and her damage abilities.',
        { type: 'dealt', what: 'damage', when: { type: 'always' }, pctPerRank: 6 }),
        ],
        [
          modifier('priest_mod_mending_light', 'Mending Light', "Smite's heal also leaves a heal of 4% of the ally's life over 4s.", 'priest_smite',
            { patch: { addApplies: [{ effectKey: 'fx_light', power: { coeff: 0.04 } }] } }),
          stat('priest_zeal_t8_magicResist', 'magicResist', 2.5),
        ],
        [
          effect('priest_condemn', 'Condemn', 'Enemies hit by her damage abilities take 2% more damage per rank from the whole party for 4s.',
        { type: 'passive', effect: { is: 'condemn', effectKey: 'debuff_condemn' }, perRank: 2 }),
          stat('priest_zeal_t9_cooldownReduction', 'cooldownReduction', 1.5),
        ],
        [
          capstone('priest_cap_crusade', 'Crusade', 'Battle Enrage also fires against elites and lasts 15s.',
            { vs: 'eliteOrBoss', durationMs: 15000 }),
        ],
      ],
    },
  ],
};
