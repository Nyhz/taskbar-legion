import file from '@/assets/strip/figs/figs.json';
import { RANGE } from '@/data/field';
import { tryWorldDef, type CreatureRole } from '@/data/worlds';
import type { EnemyRole } from '@/data/enemies';
import { ROLE_FIGURE } from './foeFx';

// The strip's FIGHTERS as data (no Pixi here — pure, unit-tested): every figure's atlas layout and animations, and
// which ROLE of a world's cast (data/worlds.ts) an enemy of the simulation is drawn as. The file is written by the asset pipeline
// (`sh tools/assets/run.sh export-figs` → src/assets/strip/figs/figs.json) with the same baking as the lab page.
// Figures are drawn 1 art pixel = 1 strip pixel, never scaled: their `root` column and `ground` row stand on the
// path (stripBackdropData.STRIP_PATH_Y).

/** A fighter's display object has its origin this far above its feet: the point GameStrip aims projectiles and
 *  pops numbers from (its offsets are measured from the sprite's y). The feet themselves stand on the path. */
export const FEET_BELOW_ORIGIN = 10;

export interface FigureAnim {
  /** The atlas row its first frame is on. Frame i is the cell (i % cols, row + floor(i / cols)). */
  row: number;
  n: number;
  /** How long each frame is held, in ms. */
  ms: number[];
  loop: boolean;
}

export interface FigureMeta {
  /** Cell size, in art pixels. */
  w: number;
  h: number;
  cols: number;
  /** The column and row of a cell that stand on the path. */
  root: number;
  ground: number;
  /** The box the standing figure fills, from (root, ground): [left, top, right, bottom], facing right. */
  box: [number, number, number, number];
  anims: Record<string, FigureAnim>;
}

interface FigureFile {
  heroes: string[];
  figs: Record<string, FigureMeta>;
}

const DATA = file as unknown as FigureFile;

/** The figures of the heroes: one per class, named by its class key. */
export const HERO_FIGURES: readonly string[] = DATA.heroes;

export function figureMeta(key: string): FigureMeta | undefined {
  return DATA.figs[key];
}

/** The four figures of a world (1–10 within a difficulty), by role — from data/worlds, the one source for it. */
export function worldCreatureKeys(world: number): Record<CreatureRole, string> | undefined {
  const def = tryWorldDef(world);
  if (def === undefined) return undefined;
  return { beast: def.creatures.beast.key, melee: def.creatures.melee.key, ranged: def.creatures.ranged.key, boss: def.creatures.boss.key };
}

/** The figure of a world's WORLD boss (the W-10 fight), if that world has a creature of its own for it; otherwise
 *  undefined, and its stage boss's figure stands in. */
export function worldBossFigureKey(world: number): string | undefined {
  return tryWorldDef(world)?.worldBoss?.key;
}

/** The atlas cell of an animation's frame: [column, row]. */
export function frameCell(meta: FigureMeta, anim: FigureAnim, frame: number): [number, number] {
  return [frame % meta.cols, anim.row + Math.floor(frame / meta.cols)];
}

export function clipMs(anim: FigureAnim): number {
  let total = 0;
  for (const ms of anim.ms) total += ms;
  return total;
}

/** How far the heroes' standing figures reach in front of their root (the widest of the three), in art pixels. */
export function heroFrontReach(): number {
  let reach = 0;
  for (const key of HERO_FIGURES) reach = Math.max(reach, figureMeta(key)?.box[2] ?? 0);
  return reach;
}

/**
 * How far BEHIND its place in the simulation a melee enemy's figure is drawn, in art pixels. The simulation stops
 * a melee enemy `reach` away from the hero it fights, measured between their roots; a figure whose body reaches
 * further forward than that leaves room for (a wide beast, a boss that is mostly head and claws) would be drawn
 * on top of the hero. So its art is set back until its standing front edge just meets the hero's: the enemy's
 * place in the fight — where it is hit, where numbers pop — stays where the simulation has it, at the figure's
 * front, and the body stands behind that point. Figures that fit (most of them) are not moved.
 */
export function frontSetback(meta: FigureMeta, reach: number): number {
  const room = Math.max(0, reach - heroFrontReach());
  return Math.max(0, Math.round(meta.box[2] - room));
}

/** What the render needs to know of an enemy to choose its creature (a slice of sim/world's Combatant). */
export interface EnemyLook {
  id: string;
  range: number;
  isBoss?: boolean;
  enemyMagic?: boolean;
  enemyRole?: EnemyRole;
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * The role an enemy of the simulation is drawn as. A boss is the world's boss. A wave enemy says what it is
 * (`enemyRole`: data/enemies) and each kind has its figure (render/foeFx ROLE_FIGURE): the beast is the world's
 * beast, the soldier and the brute its melee fighter (the brute a size up), the shooter and — until its world has
 * one of its own — the support its ranged creature. An enemy that does not say (a stale value, a test's bare
 * enemy) falls back to how it attacks: from afar the ranged creature, else the melee fighter or the beast by its
 * id — the same enemy is always the same creature.
 */
export function creatureRole(c: EnemyLook): CreatureRole {
  if (c.isBoss === true) return 'boss';
  if (c.enemyRole !== undefined) return ROLE_FIGURE[c.enemyRole];
  if (c.enemyMagic === true || c.range >= RANGE.ranged) return 'ranged';
  return hashId(c.id) % 2 === 0 ? 'melee' : 'beast';
}

/** The figure of a world's SUPPORT, if that world has a creature of its own for it (data/worlds `support`) and
 *  its figure has been exported; otherwise undefined, and its ranged creature stands in, tinted. */
export function worldSupportFigureKey(world: number): string | undefined {
  const key = tryWorldDef(world)?.support?.key;
  return key !== undefined && figureMeta(key) !== undefined ? key : undefined;
}

/** How an enemy is told apart by its marking, not by its figure. */
export type EnemyRank = 'normal' | 'elite' | 'stageBoss' | 'worldBoss';

export function enemyRank(c: { isBoss?: boolean; isElite?: boolean }, worldBossStage: boolean): EnemyRank {
  if (c.isBoss === true) return worldBossStage ? 'worldBoss' : 'stageBoss';
  return c.isElite === true ? 'elite' : 'normal';
}
