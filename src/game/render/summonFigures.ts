import type { Texture } from 'pixi.js';
import { DOUBLE_LOOKS, SUMMON_LOOKS, summonFigureMeta } from './bossFx';
import { heroFigure, type FigureSheet } from './figureTextures';
import { fxFrames, heroSkin } from './fxTextures';

// The figures of what a boss summons (its crows): not creatures of a world with an atlas of their own, but small
// things drawn as EFFECTS (tools/assets/pipeline/fx/boss.py). Their frames are handed to the strip as a figure
// sheet — the same shape a creature's has — so a summon is an EnemySprite like any other enemy.

const sheets = new Map<string, FigureSheet>();

/** The figure of the summon `key`, or null when its art is not loaded (the caller then draws nothing for it). */
export function summonFigure(key: string): FigureSheet | null {
  const made = sheets.get(key);
  if (made !== undefined) return made;
  const look = SUMMON_LOOKS[key];
  const meta = summonFigureMeta(key);
  const fly = look === undefined ? null : fxFrames(look.fly);
  const attack = look === undefined ? null : fxFrames(look.attack);
  const death = look === undefined ? null : fxFrames(look.death);
  if (meta === undefined || fly === null || attack === null || death === null) return null;
  const clips: Record<string, Texture[]> = { idle: fly, run: fly, attack, death };
  const sheet: FigureSheet = { key: `summon:${key}`, meta, clips, released: false };
  sheets.set(key, sheet);
  return sheet;
}

/** The figure of a summon that is a hero's DOUBLE (the Unmaker's reflection of `classKey`): that hero's own
 *  figure in the double's skin — or as it is, if the skin is not there (the sprite then darkens it) — or null
 *  when that hero's art is not loaded. */
export function doubleFigure(key: string, classKey: string): FigureSheet | null {
  const look = DOUBLE_LOOKS[key];
  if (look === undefined) return null;
  return heroSkin(classKey, look.skin) ?? heroFigure(classKey);
}
