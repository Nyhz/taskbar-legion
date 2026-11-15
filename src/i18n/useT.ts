import { useSyncExternalStore } from 'react';
import { getLanguage, subscribeLanguage, t } from './core';
import type { Lang } from './core';

/** The current language; the component re-renders when it changes. */
export function useLanguage(): Lang {
  return useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage);
}

/** `t`, bound to a component: call it in render and the component follows the language. Data texts
 *  (`statLabel`, `tierName`… in names.ts) read the same language, so one `useT()` covers them too. */
export function useT(): typeof t {
  useLanguage();
  return t;
}
