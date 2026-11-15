import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Stylesheets carry no dead weight: every class a stylesheet styles is written by some source file, and every
// stylesheet is imported by one. (The redesign removed whole panels; their rules must not stay behind.)
// The check reads the sources as text — no component is imported.

const SRC = join(__dirname, '..', '..', 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

const files = walk(SRC);
const sheets = files.filter((f) => f.endsWith('.css'));
const sources = files.filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'));

/** Source text without comments: a class named only in a comment is not a class in use. */
function code(path: string): string {
  return readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const sourceText = sources.map(code).join('\n');
const words = new Set(sourceText.match(/[A-Za-z0-9_-]+/g) ?? []);

/** Class names a component builds from pieces, so no source file spells them whole. */
const BUILT: readonly RegExp[] = [
  /^tl-panel-(up|left|right)-(in|out)$/, // app/PanelLayer: `tl-panel-${side}-${phase}`
  /^t[0-8]$/, // ui/kit/Tip: ` t${tier}`
];

function styledClasses(path: string): string[] {
  const selectors = readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\{[^{}]*\}/g, '{}');
  return [...new Set(selectors.match(/\.[A-Za-z_][A-Za-z0-9_-]*/g) ?? [])].map((c) => c.slice(1));
}

describe('stylesheets', () => {
  it('finds the stylesheets', () => {
    expect(sheets.length).toBeGreaterThan(5);
  });

  it.each(sheets.map((s) => [s.slice(SRC.length + 1), s] as const))('%s styles only classes that some source file writes', (_name, path) => {
    const unused = styledClasses(path).filter((c) => !words.has(c) && !BUILT.some((re) => re.test(c)));
    expect(unused).toEqual([]);
  });

  it('every stylesheet is imported by a source file', () => {
    const orphans = sheets.filter((s) => !sourceText.includes(`/${basename(s)}'`)).map((s) => s.slice(SRC.length + 1));
    expect(orphans).toEqual([]);
  });
});
