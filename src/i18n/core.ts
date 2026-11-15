// The language core: the two catalogues, the current language and `t()`. No React and no DOM here, so it runs in
// Node (tests) and outside components. The React hooks are in useT.ts; everything is re-exported from index.ts.
import * as en from './en';
import * as es from './es';

export type Lang = 'en' | 'es';

export const LANGS: readonly Lang[] = ['en', 'es'];
/** Each language named in itself — never translated. */
export const LANG_NAMES: Readonly<Record<Lang, string>> = { en: 'English', es: 'Español' };

type Catalogue = typeof en;
type Namespace = keyof Catalogue & string;

/** Every text of the interface: `'namespace.key'`. */
export type TextKey = { [N in Namespace]: `${N}.${keyof Catalogue[N] & string}` }[Namespace];

type TextOf<K extends string> = K extends `${infer N extends Namespace}.${infer P}`
  ? P extends keyof Catalogue[N]
    ? Catalogue[N][P]
    : never
  : never;
type Tokens<S> = S extends `${string}{${infer T}}${infer Rest}` ? T | Tokens<Rest> : never;

type IsUnion<T, U = T> = T extends unknown ? ([U] extends [T] ? false : true) : never;

/** The `{tokens}` of a text, read from its English: a text without tokens takes no params; one with tokens needs
 *  them all. When the key is only known at run time (a union, e.g. a `Record<Thing, TextKey>` lookup) the params
 *  cannot be checked, so they become optional and loose. */
export type TextParams<K extends TextKey> = [Tokens<TextOf<K>>] extends [never]
  ? []
  : IsUnion<K> extends true
    ? [params?: Readonly<Record<string, string | number>>]
    : [params: Record<Tokens<TextOf<K>>, string | number>];

/** The keys whose text has no `{token}`: the right value type for a table of names chosen at run time. */
export type PlainTextKey = { [K in TextKey]: [Tokens<TextOf<K>>] extends [never] ? K : never }[TextKey];

// Typing Spanish against English here makes a missing namespace a compile error (a missing key already is one,
// in the namespace's own file).
const TABLES: Readonly<Record<Lang, { readonly [N in Namespace]: Readonly<Record<keyof Catalogue[N], string>> }>> = { en, es };

/** The system language: Spanish if it starts with "es", otherwise English. Safe without a browser. */
export function systemLanguage(): Lang {
  const tag = typeof navigator !== 'undefined' && typeof navigator.language === 'string' ? navigator.language : '';
  return tag.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export function isLang(value: unknown): value is Lang {
  return value === 'en' || value === 'es';
}

let current: Lang = systemLanguage();
const listeners = new Set<() => void>();

export function getLanguage(): Lang {
  return current;
}

/** Change the language. Subscribers (the React hooks, the settings persistence) are told once per real change. */
export function setLanguage(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  for (const listener of [...listeners]) listener();
}

export function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function lookup(lang: Lang, key: string): string | undefined {
  const dot = key.indexOf('.');
  const table = TABLES[lang] as Readonly<Record<string, Readonly<Record<string, string>> | undefined>>;
  return table[key.slice(0, dot)]?.[key.slice(dot + 1)];
}

/** Replace every `{token}` with its param; an unknown token is left as written so the mistake is visible. */
export function fillTokens(text: string, params: Readonly<Record<string, string | number>>): string {
  return text.replace(/\{(\w+)\}/g, (whole, name: string) => (name in params ? String(params[name]) : whole));
}

/** The text of `key` in the current language (English if the translation is somehow absent). */
export function t<K extends TextKey>(key: K, ...params: TextParams<K>): string {
  const text = lookup(current, key) ?? lookup('en', key) ?? key;
  const values = params[0];
  return values === undefined ? text : fillTokens(text, values);
}
