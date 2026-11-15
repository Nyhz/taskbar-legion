import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as en from '@/i18n/en';
import * as es from '@/i18n/es';
import { numbersOf, tokensOf } from './_helpers';

// The catalogue contract (REDESIGN §8): Spanish mirrors English key for key (the compiler checks the keys; this
// checks what it cannot), a translation keeps every {token} and every number, and no key sits unused.

type Table = Record<string, Record<string, string>>;
const EN = en as unknown as Table;
const ES = es as unknown as Table;

const SRC = fileURLToPath(new URL('../../src', import.meta.url));

function keysOf(table: Table): string[] {
  return Object.entries(table).flatMap(([ns, texts]) => Object.keys(texts).map((key) => `${ns}.${key}`));
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      // The catalogues themselves do not count as a use of their own keys.
      return path === join(SRC, 'i18n', 'en') || path === join(SRC, 'i18n', 'es') ? [] : sourceFiles(path);
    }
    return /\.tsx?$/.test(name) ? [path] : [];
  });
}

describe('i18n catalogues', () => {
  it('Spanish has exactly the namespaces and keys of English', () => {
    expect(keysOf(ES).sort()).toEqual(keysOf(EN).sort());
  });

  it('no key contains a dot and no text is empty', () => {
    for (const table of [EN, ES]) {
      for (const [ns, texts] of Object.entries(table)) {
        for (const [key, text] of Object.entries(texts)) {
          expect(key.includes('.'), `${ns}.${key}`).toBe(false);
          expect(text.trim().length, `${ns}.${key}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('a translation keeps every {token} of the English', () => {
    for (const key of keysOf(EN)) {
      const [ns = '', name = ''] = key.split('.');
      expect(tokensOf(ES[ns]?.[name] ?? ''), key).toEqual(tokensOf(EN[ns]?.[name] ?? ''));
    }
  });

  it('a translation keeps every number of the English', () => {
    for (const key of keysOf(EN)) {
      const [ns = '', name = ''] = key.split('.');
      expect(numbersOf(ES[ns]?.[name] ?? ''), key).toEqual(numbersOf(EN[ns]?.[name] ?? ''));
    }
  });

  it('every key is used, literally, by some source file', () => {
    const code = sourceFiles(SRC).map((file) => readFileSync(file, 'utf8')).join('\n');
    const unused = keysOf(EN).filter((key) => !code.includes(`'${key}'`) && !code.includes(`"${key}"`) && !code.includes(`\`${key}\``));
    expect(unused).toEqual([]);
  });

  it('the checks themselves catch a lost token and a changed number', () => {
    expect(tokensOf('Export failed: {message}')).toEqual(['message']);
    expect(tokensOf('No se ha podido exportar')).not.toEqual(tokensOf('Export failed: {message}'));
    expect(tokensOf('Error: {mensaje}')).not.toEqual(tokensOf('Export failed: {message}'));
    expect(numbersOf('+2,5 % de oro')).toEqual(numbersOf('+2.5% gold'));
    expect(numbersOf('+3 % de oro')).not.toEqual(numbersOf('+2.5% gold'));
  });
});
