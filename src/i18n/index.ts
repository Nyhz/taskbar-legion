// Languages of the interface (docs/redesign/I18N.md). English and Spanish (Spain).
//
//   import { t, useT, getLanguage, setLanguage, type Lang } from '@/i18n';
//   const t = useT();                       // in a component: re-renders when the language changes
//   t('options.language')                   // → "Language" / "Idioma"
//   t('options.exportFailed', { message })  // `{message}` is required by the type, because the English has it
//
// ADDING A NAMESPACE (e.g. `hud`) is two files and two lines:
//   1. src/i18n/en/hud.ts   →  export const hud = { gold: 'Gold', … } as const;
//   2. src/i18n/es/hud.ts   →  import type { hud as en } from '../en/hud';
//                               export const hud: Record<keyof typeof en, string> = { gold: 'Oro', … };
//   3. one line in en/index.ts and the same line in es/index.ts:  export { hud } from './hud';
// Keys must be used LITERALLY in the code (`t('hud.gold')`, never `t(\`hud.${x}\`)`): a test fails for every key no
// source file mentions. A family of texts chosen at run time goes in a `Record<Thing, PlainTextKey>` (see names.ts):
// with a key only known at run time the params cannot be type-checked, so keep `{tokens}` out of such families.
//
// Texts that live in data/ (stat names, tiers, tech nodes…) are not in these catalogues: data keeps writing
// English and names.ts translates them through the dictionaries of src/data/i18n/es/.
export { LANGS, LANG_NAMES, getLanguage, isLang, setLanguage, subscribeLanguage, systemLanguage, t } from './core';
export type { Lang, PlainTextKey, TextKey, TextParams } from './core';
export { useLanguage, useT } from './useT';
export {
  armorFamilyName, chestName, className, dataText, difficultyName, gemName, petName, slotLabel, statLabel, techCategoryName,
  techDescription, techName, tierName, weaponTypeName,
} from './names';
export { creatureName, worldName } from './names';
export {
  abilityDescription, abilityName, effectName, talentBranchName, talentNodeDescription, talentNodeName, ultimateDescription,
  ultimateName,
} from './names';
