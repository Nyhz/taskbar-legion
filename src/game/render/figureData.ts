import file from '@/assets/strip/figs/figs.json';
import { RANGE } from '@/data/field';
import { tryWorldDef, type CreatureRole } from '@/data/worlds';

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

/** The atlas cell of an animation's frame: [column, row]. */
export function frameCell(meta: FigureMeta, anim: FigureAnim, frame: number): [number, number] {
  return [frame % meta.cols, anim.row + Math.floor(frame / meta.cols)];
}

export function clipMs(anim: FigureAnim): number {
  let total = 0;
  for (const ms of anim.ms) total += ms;
  return total;
}

/** What the render needs to know of an enemy to choose its creature (a slice of sim/world's Combatant). */
export interface EnemyLook {
  id: string;
  range: number;
  isBoss?: boolean;
  enemyMagic?: boolean;
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * The role an enemy of the simulation is drawn as. A boss is the world's boss; whatever attacks from afar (an
 * archer, a caster) is its ranged creature. The simulation has no "beast" kind of its own (its melee kinds are the
 * grunt and the brute, which a Combatant does not tell apart), so melee enemies alternate between the world's
 * melee creature and its beast by their id — the same enemy is always the same creature, and both appear.
 */
export function creatureRole(c: EnemyLook): CreatureRole {
  if (c.isBoss === true) return 'boss';
  if (c.enemyMagic === true || c.range >= RANGE.ranged) return 'ranged';
  return hashId(c.id) % 2 === 0 ? 'melee' : 'beast';
}

/** How an enemy is told apart by its marking, not by its figure. */
export type EnemyRank = 'normal' | 'elite' | 'stageBoss' | 'worldBoss';

export function enemyRank(c: { isBoss?: boolean; isElite?: boolean }, worldBossStage: boolean): EnemyRank {
  if (c.isBoss === true) return worldBossStage ? 'worldBoss' : 'stageBoss';
  return c.isElite === true ? 'elite' : 'normal';
}
