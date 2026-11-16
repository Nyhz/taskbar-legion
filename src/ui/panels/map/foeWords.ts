import { getLanguage, t, type PlainTextKey } from '@/i18n';
import type { EnemyRole, SupportAura } from '@/data/enemies';
import type { SupportFacts, TraitFact } from '@/sim/foeFacts';

// The wave enemies' traits and the support's auras in words, for a difficulty's tooltip (MapDifficulties). The
// facts and every number come from sim/foeFacts (data/enemies); this only words them, in the game's language.

/** A number as the language writes it (2.5 → «2,5» in Spanish). */
function num(value: number): string {
  return value.toLocaleString(getLanguage() === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: 1 });
}

const KIND_NAME: Readonly<Record<Exclude<EnemyRole, 'support'>, PlainTextKey>> = {
  beast: 'map.kindBeast',
  soldier: 'map.kindSoldier',
  shooter: 'map.kindShooter',
  brute: 'map.kindBrute',
};

export function kindName(role: EnemyRole): string {
  return role === 'support' ? t('map.support') : t(KIND_NAME[role]);
}

/** One trait, named and explained with its numbers. */
export function traitLine(fact: TraitFact): string {
  switch (fact.trait) {
    case 'rage':
      return t('map.traitRage', { pct: num(fact.pct ?? 0), hp: num(fact.hp ?? 0) });
    case 'charge':
      return t('map.traitCharge', { mult: num(fact.mult ?? 1) });
    case 'guard':
      return t('map.traitGuard');
    case 'lastBreath':
      return t('map.traitLastBreath', { pct: num(fact.pct ?? 0), s: num(fact.seconds ?? 0) });
    case 'chargedShot':
      return t('map.traitChargedShot', { n: num(fact.every ?? 1), mult: num(fact.mult ?? 1) });
    case 'focusFire':
      return t('map.traitFocusFire');
    case 'unstoppable':
      return t('map.traitUnstoppable');
    case 'tremor':
      return t('map.traitTremor', { pct: num(fact.pct ?? 0), s: num(fact.seconds ?? 0) });
  }
}

/** One aura, named, with its strength on the difficulty. */
export function auraLine(key: SupportAura, value: number): string {
  const v = num(value);
  switch (key) {
    case 'toughness':
      return t('map.auraToughness', { v });
    case 'fury':
      return t('map.auraFury', { v });
    case 'vigor':
      return t('map.auraVigor', { v });
    case 'aegis':
      return t('map.auraAegis', { v });
    case 'malice':
      return t('map.auraMalice', { v });
    case 'enchant':
      return t('map.auraEnchant', { v });
  }
}

/** How many of the auras a support carries, in a sentence. */
export function supportLine(facts: SupportFacts): string {
  if (facts.auras >= facts.values.length) return t('map.supportAll', { n: facts.auras });
  return facts.auras === 1 ? t('map.supportOne') : t('map.supportSome', { n: facts.auras });
}
