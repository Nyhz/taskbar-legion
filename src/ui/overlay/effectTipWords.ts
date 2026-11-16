import { effectName, getLanguage, statLabel, t } from '@/i18n';
import { EFFECTS, type EffectDef } from '@/data/effects';
import { BOSS_AFFIX } from '@/data/bossKit';
import { format } from '@/sim/num';

// What the tooltip of an effect chip says (StripEffectTip): the name of each effect behind the chip and a line
// that says what it does. The numbers are FACTS — what the effect is worth on that fighter right now (its value,
// its stacks, how long it was laid for), falling back to the effect's own data — never typed into the text.
//
// Two sources of a line:
//   - OWN_LINES: effects with a sentence of their own — what an enemy or a boss lays on a hero (the line says
//     where it came from and whether a heal lifts it), marks, a boss's own states;
//   - by KIND: what most abilities' effects are (a stat up or down, damage or healing over time, deals less,
//     takes more…) — every effect of those kinds has its line without anyone writing it.
// An effect with neither (a new kind nobody worded yet) shows its name alone: nothing breaks.
// test/ui/effectTipWords.test.ts lists what has no line, and every effect of the boss kit must have its OWN.

/** What the strip knows of an effect on a fighter (sim ActiveEffect, the parts that matter here). */
export interface EffectTipFact {
  key: string;
  /** Its resolved value on that fighter (per stack). */
  value?: number;
  stacks?: number;
  /** How long it was laid for (ms). */
  totalMs?: number;
}

export interface EffectTipEntry {
  name: string;
  lines: string[];
}

/** An effect that lasts this long is "until the fight (or its bearer) ends": its line gives no seconds. */
const OPEN_MS = 60_000;

function locale(): string {
  return getLanguage() === 'es' ? 'es-ES' : 'en-US';
}

/** A number as the language writes it: one decimal at most, big ones abbreviated (sim/num). */
function num(value: number): string {
  if (Math.abs(value) >= 1000) return format(Math.round(value));
  return value.toLocaleString(locale(), { maximumFractionDigits: Math.abs(value) < 10 ? 1 : 0 });
}

const worth = (fact: EffectTipFact, def: EffectDef): number => {
  const own = def.kind.type === 'statMod' || def.kind.type === 'weaken' || def.kind.type === 'healReduction' ? def.kind.value : 0;
  return (fact.value ?? own) * Math.max(1, fact.stacks ?? 1);
};
const seconds = (fact: EffectTipFact, def: EffectDef): string => num((fact.totalMs ?? def.durationMs) / 1000);
const open = (fact: EffectTipFact, def: EffectDef): boolean => (fact.totalMs ?? def.durationMs) >= OPEN_MS;

/** «Attack speed +25 %» / «Armour −20 %» / «Health +40». */
function statPart(fact: EffectTipFact, def: EffectDef): string | undefined {
  if (def.kind.type !== 'statMod') return undefined;
  const v = worth(fact, def);
  const amount = `${v < 0 ? '−' : '+'}${num(Math.abs(v))}${def.kind.mode === 'percent' ? ' %' : ''}`;
  return `${statLabel(def.kind.stat)} ${amount}`;
}

/** Effects with a sentence of their own. */
const OWN_LINES: Readonly<Record<string, (fact: EffectTipFact, def: EffectDef) => string>> = {
  debuff_tremor: (f, d) => t('hud.fxTremor', { pct: num(Math.abs(worth(f, d))) }),
  debuff_mortal_wound: (f, d) => t('hud.fxMortalWound', { v: num(worth(f, d)), s: seconds(f, d) }),
  debuff_venom: (f, d) => t('hud.fxVenom', { dps: num(worth(f, d)), n: d.maxStacks, s: seconds(f, d) }),
  debuff_rend: (f, d) => t('hud.fxRend', { dps: num(worth(f, d)), n: d.maxStacks, s: seconds(f, d) }),
  debuff_rooted: (f, d) => t('hud.fxRooted', { s: seconds(f, d) }),
  debuff_guilt: (f, d) => t('hud.fxGuilt', { v: num(worth(f, d)), s: seconds(f, d) }),
  debuff_gilded: (f, d) => t('hud.fxGilded', { s: seconds(f, d) }),
  debuff_spores: (f, d) => t('hud.fxSpores', { dps: num(worth(f, d)), n: d.maxStacks }),
  fx_mark: (f, d) => t('hud.fxMark', { v: num(worth(f, d)) }),
  buff_boss_shell: (f, d) => t('hud.fxShell', { left: num(worth(f, d)) }),
  buff_boss_frenzy: (f, d) => t('hud.fxFrenzy', { v: num(worth(f, d)), n: Math.max(1, f.stacks ?? 1) }),
  buff_boss_tremor: () => t('hud.fxSeismic', { s: num(BOSS_AFFIX.seismic.blowEveryMs / 1000) }),
  buff_mirror_panes: (f, d) => t('hud.fxPanes', { n: Math.max(1, f.stacks ?? 1), max: d.maxStacks, v: num(worth(f, d) * Math.max(1, f.stacks ?? 1)) }),
};

/** Whether an effect has a sentence of its own (not just its kind's). */
export function hasOwnLine(effectKey: string): boolean {
  return OWN_LINES[effectKey] !== undefined;
}

/** The line of ONE effect that is not a plain stat change: its own sentence, or its kind's. */
function kindLine(fact: EffectTipFact, def: EffectDef): string | undefined {
  const own = OWN_LINES[fact.key];
  if (own !== undefined) return own(fact, def);
  const s = seconds(fact, def);
  switch (def.kind.type) {
    case 'dot':
      return t('hud.fxDot', { dps: num(worth(fact, def)), s });
    case 'hot':
      return t('hud.fxHot', { hps: num(worth(fact, def)), s });
    case 'weaken':
      return t('hud.fxWeaken', { v: num(worth(fact, def)), s });
    case 'vulnerable':
      return t('hud.fxVulnerable', { v: num(worth(fact, def)), s });
    case 'healReduction':
      return t('hud.fxHealCut', { v: num(worth(fact, def)), s });
    case 'invulnerable':
      return t('hud.fxInvulnerable', { s });
    case 'silence':
      return t('hud.fxSilence', { s });
    default:
      return undefined;
  }
}

/** The lines of the effects that share a name (one chip entry): the plain stat changes joined in one sentence
 *  («Attack damage +15 % and Critical chance +5 % for 8 s.»), then one line for each of the others. */
function linesOf(facts: readonly EffectTipFact[]): string[] {
  const lines: string[] = [];
  const stats: string[] = [];
  let statMs = 0;
  let statOpen = false;
  for (const fact of facts) {
    const def = EFFECTS[fact.key];
    if (def === undefined) continue;
    const part = OWN_LINES[fact.key] === undefined ? statPart(fact, def) : undefined;
    if (part !== undefined) {
      stats.push(part);
      statMs = Math.max(statMs, fact.totalMs ?? def.durationMs);
      statOpen = statOpen || open(fact, def);
      continue;
    }
    const line = kindLine(fact, def);
    if (line !== undefined) lines.push(line);
  }
  if (stats.length > 0) {
    const what = new Intl.ListFormat(locale(), { style: 'long', type: 'conjunction' }).format(stats);
    lines.unshift(statOpen ? t('hud.fxStatsOpen', { what }) : t('hud.fxStats', { what, s: num(statMs / 1000) }));
  }
  return lines;
}

/** The line(s) of one effect at its data's own numbers — empty when nobody has worded it (name alone). */
export function effectLines(effectKey: string): string[] {
  return linesOf([{ key: effectKey }]);
}

/** The entries of a chip's tooltip: one per NAME (the two effects of one buff share a name: one entry). */
export function effectTipEntries(facts: readonly EffectTipFact[]): EffectTipEntry[] {
  const byName = new Map<string, EffectTipFact[]>();
  for (const fact of facts) {
    const name = effectName(fact.key);
    const group = byName.get(name);
    if (group === undefined) byName.set(name, [fact]);
    else if (!group.some((f) => f.key === fact.key)) group.push(fact);
  }
  return [...byName.entries()].map(([name, group]) => ({ name, lines: linesOf(group) }));
}
