import { ability, capstone, effect, modifier, role, stat, type ClassTreeSpec } from '../talentSpec';

// Knight — tank (docs/redesign/CLASSES.md §3, first wave). Trunk = today's rows 1–4 with their values plus
// three role talents; Bastion protects the party, Scourge punishes what hits him. Names are provisional.
// Second combat wave (2026-11-15): five EFFECT passives took the place of five stat nodes — Guardian (was the
// tier-1 armour), Close Ranks (Bastion 7 armour), Shelter (Bastion 9 life), Weathered Hide (Scourge 7 life) and
// Endurance (Scourge 9 damage reduction).

export const KNIGHT_TREE: ClassTreeSpec = {
  classKey: 'knight',
  trunk: [
    [
      ability('knight_guard'), ability('knight_debilitate'), stat('knight_t1_health', 'health', 2),
      effect('knight_guardian', 'Guardian', 'He takes on himself 4% per rank of the damage aimed at the heroes behind him.',
        { type: 'passive', effect: { is: 'intercept' }, perRank: 4 }),
    ],
    [
      ability('knight_bulwark'),
      role('knight_vanguard', 'Vanguard', 'The whole party takes 1% less damage per rank.',
        { type: 'partyStat', stat: 'damageReduction', mode: 'percent', valuePerRank: 1 }),
      stat('knight_t2_health', 'health', 2), stat('knight_t2_block', 'block', 2),
    ],
    [
      ability('knight_battlecry'),
      role('knight_unyielding', 'Unyielding', 'Under 40% of his life, he takes 3% less damage per rank.',
        { type: 'selfStatWhen', hpBelow: 0.4, stat: 'damageReduction', mode: 'percent', valuePerRank: 3 }),
      stat('knight_t3_armor', 'armor', 2.5), stat('knight_t3_magicResist', 'magicResist', 2.5),
    ],
    [
      ability('knight_bloodlust'),
      role('knight_warden', 'Warden', 'The whole party has 2% more max life per rank.',
        { type: 'partyStat', stat: 'health', mode: 'percent', valuePerRank: 2 }),
      stat('knight_t4_health', 'health', 2), stat('knight_t4_block', 'block', 2),
    ],
  ],
  branches: [
    {
      key: 'bastion', name: 'Bastion',
      rows: [
        [ability('knight_holdtheline'), stat('knight_bastion_t5_magicResist', 'magicResist', 2.5)],
        [
          modifier('knight_mod_shared_skin', 'Shared Skin', 'Stone Skin also covers the ally with the least life.', 'knight_guard',
            { patch: { mirror: [{ effectKey: 'buff_guard_block', target: 'lowestOtherAlly' }] } }),
          modifier('knight_mod_mending_bulwark', 'Mending Bulwark', 'When Bulwark breaks or runs out, it heals the party for 6% of their life.', 'knight_bulwark',
            { triggers: [{ key: 'knight_mod_mending_bulwark', event: { on: 'effectEnd', effectKey: 'fx_shield' }, actions: [{ do: 'heal', to: 'allAllies', hpFrac: 0.06 }] }] }),
        ],
        [
          effect('knight_close_ranks', 'Close Ranks', 'While he lives, his allies take 2% less damage per rank from area blows.',
        { type: 'passive', effect: { is: 'areaGuard' }, perRank: 2 }),
          stat('knight_bastion_t7_health', 'health', 2),
        ],
        [
          modifier('knight_mod_standard_bearer', 'Standard Bearer', 'While Hold the Line lasts, the Knight has +10 block and +10% armour.', 'knight_holdtheline',
            { patch: { addApplies: [{ effectKey: 'buff_standard_block', target: 'self' }, { effectKey: 'buff_standard_armor', target: 'self' }] } }),
          stat('knight_bastion_t8_block', 'block', 2),
        ],
        [
          effect('knight_shelter', 'Shelter', 'When an ally drops under 50% of its life, that ally takes 3% less damage per rank for 6s.',
        { type: 'passive', effect: { is: 'allyLowGuard', hpBelow: 0.5, effectKey: 'buff_shelter' }, perRank: 3 }),
          stat('knight_bastion_t9_damageReduction', 'damageReduction', 0.6),
        ],
        [
          capstone('knight_cap_living_wall', 'Living Wall', 'The Last Stand charge also saves an ally about to fall: left at 1 life and invulnerable for 3s.',
            { addTriggers: [{ key: 'knight_cap_living_wall', event: { on: 'lethal', who: 'ally' }, uses: 'ultCharge', actions: [{ do: 'rescue', hpFrac: 0, invulnMs: 3000 }] }] }),
        ],
      ],
    },
    {
      key: 'scourge', name: 'Scourge',
      rows: [
        [ability('knight_riposte'), stat('knight_scourge_t5_block', 'block', 2)],
        [
          modifier('knight_mod_crippling_cleave', 'Crippling Cleave', 'Enemies hit by the Cleave attack and advance 20% slower for 6s.', 'knight_debilitate',
            { patch: { addApplies: [{ effectKey: 'debuff_cripple' }] } }),
          modifier('knight_mod_thirst_for_battle', 'Thirst for Battle', 'Every blocked hit lengthens Bloodlust by 1s.', 'knight_bloodlust',
            { triggers: [{ key: 'knight_mod_thirst_for_battle', event: { on: 'block' }, actions: [{ do: 'extend', effectKeys: ['buff_bloodlust_as', 'buff_bloodlust_ls'], ms: 1000 }] }] }),
        ],
        [
          effect('knight_weathered_hide', 'Weathered Hide', 'Each blocked hit reduces the damage that follows by 1% per rank, up to 5 times. All of it is lost after 5 hits in a row without a block.',
        { type: 'passive', effect: { is: 'blockStreak', maxStacks: 5, missesToLose: 5 }, perRank: 1 }),
          stat('knight_scourge_t7_lifesteal', 'lifesteal', 0.6),
        ],
        [
          modifier('knight_mod_punishing_riposte', 'Punishing Riposte', 'Riposte fires at 3 blocked hits instead of 4.', 'knight_riposte',
            { patch: { chargeToCast: 3 } }),
          stat('knight_scourge_t8_armor', 'armor', 2.5),
        ],
        [
          effect('knight_endurance', 'Endurance', 'Hits for more than 15% of his life are reduced by 3% per rank.',
        { type: 'passive', effect: { is: 'bigHitGuard', lifeFrac: 0.15 }, perRank: 3 }),
          stat('knight_scourge_t9_attackDamage', 'attackDamage', 3),
        ],
        [
          capstone('knight_cap_vengeance', 'Vengeance', 'When Last Stand fires, every enemy in reach deals 30% less damage and is 30% slower for its 6s.',
            { addActions: [
              { do: 'apply', effectKey: 'debuff_vengeance_weaken', to: 'meleeEnemies' },
              { do: 'apply', effectKey: 'debuff_vengeance_slow', to: 'meleeEnemies' },
            ] }),
        ],
      ],
    },
  ],
};
