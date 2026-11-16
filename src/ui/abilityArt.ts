import type { PassiveEffect, TalentNode } from '@/data/talents';
import { ULTIMATES } from '@/data/ultimates';

// Maps an ability / ultimate key to the art stem of its sign (src/assets/ui). Pure and total: an unknown key
// returns a safe stand-in and never throws (a stale key in a save must not take the interface down).
//
// STAND-INS: the Knight's five signs come from the talents mock-up (tools/assets/pipeline/icon_sets/
// s98_talents.py) and the Ranger's, the Priest's and the three ultimates' from s9b_abilities.py. All of them
// are placeholders until the class redesign (docs/redesign/CLASSES.md) brings the final ability icons.
// The six BRANCH abilities and the four branch signs the Knight's set lacked are stand-ins too (s9d_classes.py).

export const FALLBACK_ABILITY_ART = 'tal_stone_skin';
export const FALLBACK_ULTIMATE_ART = 'tal_crown';

const ABILITY_ART: Readonly<Record<string, string>> = {
  // Knight
  knight_guard: 'tal_stone_skin',
  knight_debilitate: 'tal_cleave',
  knight_bulwark: 'tal_bulwark',
  knight_battlecry: 'tal_battle_cry',
  knight_bloodlust: 'tal_bloodlust',
  knight_holdtheline: 'tal_hold_the_line',
  knight_riposte: 'tal_riposte',
  // Priest
  priest_mend: 'abil_mend',
  priest_healing_light: 'abil_healing_light',
  priest_holyshield: 'abil_holy_shield',
  priest_nova: 'abil_holy_nova',
  priest_circle: 'abil_circle',
  priest_sanctuary: 'tal_sanctuary',
  priest_smite: 'tal_smite',
  // Ranger
  ranger_fast_fire: 'abil_rapid_fire',
  ranger_aimedshot: 'abil_aimed_shot',
  ranger_multishot: 'abil_raining_arrows',
  ranger_focus: 'abil_explosive_arrow',
  ranger_frozentrap: 'abil_caltrops',
  ranger_weakspot: 'tal_weak_spot',
  ranger_tarflask: 'tal_tar_flask',
};

const ULTIMATE_ART: Readonly<Record<string, string>> = {
  knight_laststand: 'abil_ult_last_stand',
  priest_enrage: 'abil_ult_battle_enrage',
  ranger_mark: 'abil_ult_hunters_mark',
};

const BRANCH_ART: Readonly<Record<string, string>> = {
  'knight.bastion': 'tal_bastion',
  'knight.scourge': 'tal_scourge',
  'ranger.marksman': 'tal_marksman',
  'ranger.stalker': 'tal_stalker',
  'priest.devotion': 'tal_devotion',
  'priest.zeal': 'tal_zeal',
};

/** Art stem of the sign of one of a class's two branches. */
export function branchArtStem(classKey: string, branchKey: string): string {
  return BRANCH_ART[`${classKey}.${branchKey}`] ?? FALLBACK_ULTIMATE_ART;
}

/** Art stem of a hero ability's sign. */
export function abilityArtStem(abilityKey: string): string {
  return ABILITY_ART[abilityKey] ?? FALLBACK_ABILITY_ART;
}

/** Art stem of an ultimate's sign. */
export function ultimateArtStem(ultimateKey: string): string {
  return ULTIMATE_ART[ultimateKey] ?? FALLBACK_ULTIMATE_ART;
}

// Role talents have a sign of their own (stand-ins, s9d_classes.py); one without falls back to its stat's.
const ROLE_ART: Readonly<Record<string, string>> = {
  knight_vanguard: 'tal_r_vanguard',
  knight_unyielding: 'tal_r_unyielding',
  knight_warden: 'tal_r_warden',
  ranger_predator: 'tal_r_predator',
  ranger_long_shot: 'tal_r_long_shot',
  ranger_hunters_focus: 'tal_r_hunters_focus',
  priest_triage: 'tal_r_triage',
  priest_vigil: 'tal_r_vigil',
  priest_sacred_ward: 'tal_r_sacred_ward',
  priest_retribution: 'abil_retribution', // the aura's old sign: it is a passive now
};

// The effect passives (second combat wave) have a sign of their own each (stand-ins, s9h_passives.py). One
// without a drawing yet falls back to a sign that says the kind of thing it does.
const EFFECT_ART: Readonly<Record<string, string>> = {
  knight_guardian: 'tal_e_guardian',
  knight_close_ranks: 'tal_e_close_ranks',
  knight_shelter: 'tal_e_shelter',
  knight_weathered_hide: 'tal_e_weathered_hide',
  knight_endurance: 'tal_e_endurance',
  ranger_first_blood: 'tal_e_first_blood',
  ranger_countersniper: 'tal_e_countersniper',
  ranger_hemorrhage: 'tal_e_hemorrhage',
  ranger_pierce_through: 'tal_e_pierce_through',
  ranger_cruelty: 'tal_e_cruelty',
  priest_overflow: 'tal_e_overflow',
  priest_mantle: 'tal_e_mantle',
  priest_revive: 'tal_e_revive',
  priest_searing_light: 'tal_e_searing_light',
  priest_condemn: 'tal_e_condemn',
  priest_infusion: 'tal_e_infusion',
};
const PASSIVE_ART: Readonly<Record<PassiveEffect['is'], string>> = {
  intercept: 'tal_e_guardian',
  areaGuard: 'tal_e_close_ranks',
  allyLowGuard: 'tal_e_shelter',
  blockStreak: 'tal_e_weathered_hide',
  bigHitGuard: 'tal_e_endurance',
  critBleed: 'tal_e_hemorrhage',
  overkillPierce: 'tal_e_pierce_through',
  overhealShield: 'tal_e_overflow',
  lowestGuard: 'tal_e_mantle',
  fasterRespawn: 'tal_e_revive',
  condemn: 'tal_e_condemn',
  healInfusion: 'tal_e_infusion',
};

/** Art stem of the sign on a talent node's frame. STAND-INS for the nodes the redesign added: a role talent
 *  has its own, a modifier shows the sign of the ability it changes, a capstone the class ultimate's. */
export function talentNodeArtStem(classKey: string, node: TalentNode): string {
  switch (node.kind) {
    case 'ability':
      return abilityArtStem(node.abilityKey ?? '');
    case 'passive': {
      // A stat passive wears its stat's sign; an effect passive its own.
      const r = node.role;
      if (r === undefined) return `stat_${node.passive?.stat ?? 'health'}`;
      const own = EFFECT_ART[node.key];
      if (own !== undefined) return own;
      if (r.type === 'passive') return PASSIVE_ART[r.effect.is];
      return r.type === 'dealt' && r.what === 'heal' ? 'stat_healPower' : 'stat_damageIncrease';
    }
    case 'role': {
      const own = ROLE_ART[node.key];
      if (own !== undefined) return own;
      const r = node.role;
      if (r === undefined) return 'stat_health';
      if (r.type === 'partyStat' || r.type === 'selfStatWhen') return `stat_${r.stat}`;
      if (r.type === 'partyRegen') return 'stat_hpRegen';
      if (r.type === 'passive') return PASSIVE_ART[r.effect.is];
      return r.what === 'heal' ? 'stat_healPower' : 'stat_damageIncrease';
    }
    case 'modifier':
      return abilityArtStem(node.modifies ?? '');
    case 'capstone':
      return ultimateArtStem(ULTIMATES[classKey]?.key ?? '');
  }
}
