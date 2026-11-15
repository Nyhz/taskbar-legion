import type { TalentNode } from '@/data/talents';
import { ULTIMATES } from '@/data/ultimates';

// Maps an ability / ultimate key to the art stem of its sign (src/assets/ui). Pure and total: an unknown key
// returns a safe stand-in and never throws (a stale key in a save must not take the interface down).
//
// STAND-INS: the Knight's five signs come from the talents mock-up (tools/assets/pipeline/icon_sets/
// s98_talents.py) and the Ranger's, the Priest's and the three ultimates' from s9b_abilities.py. All of them
// are placeholders until the class redesign (docs/redesign/CLASSES.md) brings the final ability icons.
// The six BRANCH abilities borrow an existing sign each (the two branch crests and four stat signs) until
// theirs are drawn — every ability still has a sign no other ability uses.

export const FALLBACK_ABILITY_ART = 'tal_stone_skin';
export const FALLBACK_ULTIMATE_ART = 'tal_crown';

const ABILITY_ART: Readonly<Record<string, string>> = {
  // Knight
  knight_guard: 'tal_stone_skin',
  knight_debilitate: 'tal_cleave',
  knight_bulwark: 'tal_bulwark',
  knight_battlecry: 'tal_battle_cry',
  knight_bloodlust: 'tal_bloodlust',
  knight_holdtheline: 'tal_bastion', // stand-in: the Bastion crest
  knight_riposte: 'tal_scourge', // stand-in: the Scourge crest
  // Priest
  priest_mend: 'abil_mend',
  priest_powerinfusion: 'abil_power_infusion',
  priest_holyshield: 'abil_holy_shield',
  priest_nova: 'abil_holy_nova',
  priest_retribution: 'abil_retribution',
  priest_sanctuary: 'stat_hpRegen', // stand-in
  priest_smite: 'stat_healPower', // stand-in
  // Ranger
  ranger_fast_fire: 'abil_rapid_fire',
  ranger_aimedshot: 'abil_aimed_shot',
  ranger_multishot: 'abil_raining_arrows',
  ranger_focus: 'abil_explosive_arrow',
  ranger_frozentrap: 'abil_caltrops',
  ranger_weakspot: 'stat_critChance', // stand-in
  ranger_tarflask: 'stat_damageIncrease', // stand-in
};

const ULTIMATE_ART: Readonly<Record<string, string>> = {
  knight_laststand: 'abil_ult_last_stand',
  priest_enrage: 'abil_ult_battle_enrage',
  ranger_mark: 'abil_ult_hunters_mark',
};

/** Art stem of a hero ability's sign. */
export function abilityArtStem(abilityKey: string): string {
  return ABILITY_ART[abilityKey] ?? FALLBACK_ABILITY_ART;
}

/** Art stem of an ultimate's sign. */
export function ultimateArtStem(ultimateKey: string): string {
  return ULTIMATE_ART[ultimateKey] ?? FALLBACK_ULTIMATE_ART;
}

/** Art stem of the sign on a talent node's frame. STAND-INS for the nodes the redesign added: a role talent
 *  shows the stat it works on, a modifier the sign of the ability it changes, a capstone the class ultimate's. */
export function talentNodeArtStem(classKey: string, node: TalentNode): string {
  switch (node.kind) {
    case 'ability':
      return abilityArtStem(node.abilityKey ?? '');
    case 'passive':
      return `stat_${node.passive?.stat ?? 'health'}`;
    case 'role': {
      const r = node.role;
      if (r === undefined) return 'stat_health';
      if (r.type === 'partyStat' || r.type === 'selfStatWhen') return `stat_${r.stat}`;
      if (r.type === 'partyRegen') return 'stat_hpRegen';
      return r.what === 'heal' ? 'stat_healPower' : 'stat_damageIncrease';
    }
    case 'modifier':
      return abilityArtStem(node.modifies ?? '');
    case 'capstone':
      return ultimateArtStem(ULTIMATES[classKey]?.key ?? '');
  }
}
