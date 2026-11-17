import { abilityDef } from '@/data/abilities';
import { BOSS_AFFIX, BOSS_AFFIX_KEYS, CRUSH, MECHANIC, SUMMONS, crushAt, crushShockScale, mechanicAbility, type BossAffixKey, type BossMechanicKey, type BossRank } from '@/data/bossKit';
import { difficultyIndexOf } from '@/data/difficulties';
import { effectDef } from '@/data/effects';
import { t } from '@/i18n';

// The marks after a boss's name on the HUD's boss line (no React here — pure, unit-tested): what it hits with (its
// physical/magic mix), a world boss's own mechanic, then its affixes, each a small sign with a tooltip. Every number in a tooltip is read from the
// data the simulation uses (data/bossKit.ts and the abilities/effects it names), at the stage's difficulty.

export interface BossMark {
  kind: 'damage' | 'mechanic' | 'affix';
  key: string;
  /** Art stem of its 16 px sign (tools/assets icon set s9g_affixes). */
  sign: string;
  name: string;
  /** What kind of mark it is, in words (the tooltip's note). */
  kindName: string;
  help: string;
  /** More short lines under the first (a mechanic with more than one part). */
  more?: string[];
  /** A sober counter beside the sign ("2/6": the Unmaker's mirrors lit; its lines say what it counts). */
  count?: string;
}

/** What the marks read of an effect on the boss (sim ActiveEffect, the parts that matter here). */
interface WornEffect {
  defKey: string;
  stacks: number;
  remainingMs: number;
}

const secs = (ms: number): number => Math.round(ms / 100) / 10;
const pct = (frac: number): number => Math.round(frac * 1000) / 10;

function affixMark(key: BossAffixKey, rank: BossRank): BossMark {
  const mark = (name: string, help: string): BossMark => ({ kind: 'affix', key, sign: `hud_aff_${key}`, name, kindName: t('boss.affix'), help });
  switch (key) {
    case 'armored': {
      const a = BOSS_AFFIX.armored;
      return mark(t('boss.armored'), t('boss.armoredHelp', { shell: pct(a.shellFrac), cut: pct(1 - a.damageTaken), secs: secs(a.returnMs) }));
    }
    case 'vampiric':
      return mark(t('boss.vampiric'), t('boss.vampiricHelp', { pct: pct(BOSS_AFFIX.vampiric.healFrac) }));
    case 'frenzied': {
      const def = effectDef(BOSS_AFFIX.frenzied.effectKey);
      const each = def.kind.type === 'statMod' ? def.kind.value : 0;
      return mark(t('boss.frenzied'), t('boss.frenziedHelp', { pct: each, secs: secs(BOSS_AFFIX.frenzied.everyMs), max: def.maxStacks }));
    }
    case 'seismic':
      return mark(t('boss.seismic'), t('boss.seismicHelp', { secs: secs(BOSS_AFFIX.seismic.blowEveryMs) }));
    case 'venomous':
      return mark(t('boss.venomous'), t('boss.venomousHelp', { pct: BOSS_AFFIX.venomous.pctPerStack, max: effectDef(BOSS_AFFIX.venomous.effectKey).maxStacks }));
    case 'deadeye':
      return mark(t('boss.deadeye'), t('boss.deadeyeHelp', { secs: secs(abilityDef(BOSS_AFFIX.deadeye.abilityKey).cooldownMs) }));
    case 'mortalWound': {
      const wound = effectDef('debuff_mortal_wound');
      return mark(t('boss.mortalWound'), t('boss.mortalWoundHelp', { hit: pct(BOSS_AFFIX.mortalWound.coeff[rank]), pct: wound.kind.type === 'healReduction' ? wound.kind.value : 0, secs: secs(wound.durationMs) }));
    }
  }
}

function mechanicMark(key: BossMechanicKey, d: number, effects: readonly WornEffect[]): BossMark {
  const ability = mechanicAbility(abilityDef(MECHANIC[key].abilityKey), key, d);
  const every = secs(ability.cooldownMs);
  const mark = (name: string, help: string): BossMark => ({ kind: 'mechanic', key, sign: `hud_mech_${key}`, name, kindName: t('boss.mechanic'), help });
  switch (key) {
    case 'flock': {
      const flock = ability.special?.kind === 'summon' ? ability.special : undefined;
      return mark(t('boss.flock'), t('boss.flockHelp', { secs: every, n: flock?.count ?? 0, life: secs(SUMMONS[flock?.summon ?? '']?.lifeMs ?? 0) }));
    }
    case 'roots':
      return mark(t('boss.roots'), t('boss.rootsHelp', { secs: every, hold: secs(ability.applies[0]?.durationMsOverride ?? 0) }));
    case 'chainBolt': {
      const power = ability.power;
      return mark(t('boss.chainBolt'), t('boss.chainBoltHelp', { secs: every, pct: pct((power?.splashCoeff ?? 0) / Math.max(0.0001, power?.coeff ?? 1)) }));
    }
    case 'guilt':
      return mark(t('boss.guilt'), t('boss.guiltHelp', { secs: every, hold: secs(ability.applies[0]?.durationMsOverride ?? 0), pct: ability.applies[0]?.value ?? 0 }));
    case 'gildedSilence':
      return mark(t('boss.gildedSilence'), t('boss.gildedSilenceHelp', { secs: every, hold: secs(ability.applies[0]?.durationMsOverride ?? 0) }));
    case 'undertow':
      return mark(t('boss.undertow'), t('boss.undertowHelp', { secs: every, pct: pct(ability.power?.coeff ?? 0) }));
    case 'spores': {
      const spores = ability.special?.kind === 'spores' ? ability.special : undefined;
      return mark(t('boss.spores'), t('boss.sporesHelp', { secs: every, pct: spores?.pctPerLayer ?? 0, max: effectDef(MECHANIC.spores.effectKey).maxStacks }));
    }
    case 'redBlade': {
      const fire = ability.special?.kind === 'groundFire' ? ability.special : undefined;
      return mark(t('boss.redBlade'), t('boss.redBladeHelp', { secs: every, hold: secs(fire?.burnMs ?? 0), pct: pct(fire?.totalOfHit ?? 0) }));
    }
    case 'scales':
      return mark(t('boss.scales'), t('boss.scalesHelp', { secs: every }));
    case 'mirror': {
      const mirror = ability.special?.kind === 'mirror' ? ability.special : undefined;
      const shatter = mechanicAbility(abilityDef(MECHANIC.mirror.shatter.abilityKey), key, d);
      const panes = mirror?.panes ?? 0;
      const lit = Math.min(panes, effects.find((e) => e.defKey === mirror?.paneEffectKey && e.remainingMs > 0)?.stacks ?? 0);
      return {
        ...mark(t('boss.mirror'), t('boss.mirrorHelp', { secs: every, harm: pct(mirror?.harm ?? 0) })),
        more: [
          t('boss.mirrorPanes', { n: panes, pct: mirror?.panePct ?? 0, blow: pct(shatter.power?.coeff ?? 0) }),
          t('boss.mirrorTwin', { every: mirror?.reflectionEvery ?? 0, life: secs(SUMMONS[mirror?.reflection ?? '']?.lifeMs ?? 0) }),
        ],
        count: `${lit}/${panes}`,
      };
    }
  }
}

/** What the boss hits with: its fixed physical/magic mix (data/bossKit BOSS_MAGIC_SHARE), signed by the defence
 *  that matters more against it — and, for a world boss that wields it, its Crushing Blow (data/bossKit CRUSH):
 *  what to brace for. */
function damageMark(magicShare: number, globalStage: number, crush: boolean): BossMark {
  const magic = Math.round(Math.max(0, Math.min(1, magicShare)) * 100);
  const physical = 100 - magic;
  const c = crushAt(globalStage);
  const more = crush && c.tankLife > 0
    ? [t('boss.crushHelp', { secs: secs(CRUSH.everyMs), cast: secs(CRUSH.castMs), tank: Math.round(c.tankLife * 100), back: Math.round(c.backLife * crushShockScale(magicShare) * 100) })]
    : undefined;
  return {
    kind: 'damage',
    key: 'damage',
    sign: magic > physical ? 'stat_magicResist' : 'stat_armor',
    name: magic > physical ? t('boss.damageMagic') : t('boss.damagePhysical'),
    kindName: t('boss.damageKind'),
    help: t('boss.damageHelp', { phys: physical, magic }),
    ...(more !== undefined ? { more } : {}),
  };
}

const isAffix = (key: string): key is BossAffixKey => (BOSS_AFFIX_KEYS as readonly string[]).includes(key);
const isMechanic = (key: string): key is BossMechanicKey => key in MECHANIC;

/** The marks of the boss in front, in the order they are drawn. Unknown keys (an old save) are skipped. */
export function bossMarks(boss: { affixes?: readonly string[]; mechanic?: string; bossRank?: BossRank; effects?: readonly WornEffect[]; magicShare?: number; crushHit?: number }, globalStage: number): BossMark[] {
  const marks: BossMark[] = [];
  if (boss.magicShare !== undefined) marks.push(damageMark(boss.magicShare, globalStage, (boss.crushHit ?? 0) > 0));
  if (boss.mechanic !== undefined && isMechanic(boss.mechanic)) marks.push(mechanicMark(boss.mechanic, difficultyIndexOf(globalStage), boss.effects ?? []));
  for (const key of boss.affixes ?? []) if (isAffix(key)) marks.push(affixMark(key, boss.bossRank ?? 'stage'));
  return marks;
}
