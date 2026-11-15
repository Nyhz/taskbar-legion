import { Assets, Rectangle, Texture } from 'pixi.js';
import type { CreatureRole } from '@/data/worlds';
import { figureMeta, frameCell, worldBossFigureKey, worldCreatureKeys, type FigureMeta } from './figureData';
import { creatureSheetLoader, heroSheetUrl } from './figureSheets';

// The figures' atlases as Pixi textures, cut into frames. The three HEROES load before the first frame
// (loadHeroFigures); a world's four CREATURES — and its world boss's own figure, if it has one — load lazily when
// the party gets there (worldFigures) and stay in memory with the world before it — see GameStrip.reconcileEnemies.

export interface FigureSheet {
  key: string;
  meta: FigureMeta;
  /** Animation name → its frames. */
  clips: Record<string, Texture[]>;
  /** Set once the atlas has been unloaded: a body still holding this sheet must stop drawing it. */
  released: boolean;
}

async function loadSheet(key: string, url: string): Promise<FigureSheet> {
  const meta = figureMeta(key);
  if (meta === undefined) throw new Error(`No figure meta for ${key}`);
  const atlas = await Assets.load<Texture>(url);
  atlas.source.scaleMode = 'nearest';
  const clips: Record<string, Texture[]> = {};
  for (const [name, anim] of Object.entries(meta.anims)) {
    const frames: Texture[] = [];
    for (let i = 0; i < anim.n; i++) {
      const [col, row] = frameCell(meta, anim, i);
      frames.push(new Texture({ source: atlas.source, frame: new Rectangle(col * meta.w, row * meta.h, meta.w, meta.h) }));
    }
    clips[name] = frames;
  }
  return { key, meta, clips, released: false };
}

const heroes = new Map<string, FigureSheet>();

/** Load the heroes' figures. Rejects if one cannot be loaded (the strip cannot be drawn without them). */
export async function loadHeroFigures(classKeys: readonly string[]): Promise<void> {
  await Promise.all(
    classKeys.map(async (key) => {
      const url = heroSheetUrl(key);
      if (url === undefined) throw new Error(`No figure atlas for the hero ${key}`);
      heroes.set(key, await loadSheet(key, url));
    }),
  );
}

export function heroFigure(classKey: string): FigureSheet | null {
  return heroes.get(classKey) ?? null;
}

/** A world's cast by role, and the figure of its world boss when that world has one of its own. */
export type WorldFigures = Record<CreatureRole, FigureSheet> & { worldBoss?: FigureSheet };

// The world on screen and the one before it stay loaded (four small atlases each).
const KEEP = 2;
const worlds = new Map<number, { urls: string[]; figures: WorldFigures }>();
const loading = new Set<number>();
const failed = new Set<number>();

async function loadWorld(world: number): Promise<void> {
  const cast = worldCreatureKeys(world);
  if (cast === undefined) throw new Error(`No cast for the world ${world}`);
  const urls: string[] = [];
  const load = async (key: string): Promise<FigureSheet> => {
    const loader = creatureSheetLoader(key);
    if (loader === undefined) throw new Error(`No figure atlas for ${key}`);
    const url = await loader();
    urls.push(url);
    return loadSheet(key, url);
  };
  const own = worldBossFigureKey(world);
  const [beast, melee, ranged, boss, worldBoss] = await Promise.all([
    load(cast.beast),
    load(cast.melee),
    load(cast.ranged),
    load(cast.boss),
    own === undefined ? Promise.resolve(undefined) : load(own),
  ]);
  worlds.set(world, { urls, figures: { beast, melee, ranged, boss, ...(worldBoss === undefined ? {} : { worldBoss }) } });
  trim(world);
}

function trim(current: number): void {
  for (const key of [...worlds.keys()]) {
    if (worlds.size <= KEEP) break;
    if (key === current) continue;
    const entry = worlds.get(key);
    worlds.delete(key);
    if (entry === undefined) continue;
    for (const sheet of Object.values(entry.figures)) {
      if (sheet === undefined) continue;
      sheet.released = true;
      for (const frames of Object.values(sheet.clips)) for (const t of frames) t.destroy(false);
    }
    for (const url of entry.urls) void Assets.unload(url);
  }
}

/**
 * The creatures to draw NEW enemies of a world (1–10 within a difficulty) with, or null while they load — their
 * load is started on the first call. While it is null the caller simply does not create the new enemies' sprites
 * yet (a few frames; the sprites already on screen keep the figures they were made with). If the load cannot
 * succeed, the creatures of the last world that did load stand in, so an enemy is never left undrawn.
 */
export function worldFigures(world: number): WorldFigures | null {
  const hit = worlds.get(world);
  if (hit !== undefined) {
    worlds.delete(world); // most recently used last
    worlds.set(world, hit);
    return hit.figures;
  }
  if (failed.has(world)) {
    let last: WorldFigures | null = null;
    for (const entry of worlds.values()) last = entry.figures;
    return last;
  }
  if (!loading.has(world)) {
    loading.add(world);
    loadWorld(world)
      .catch((err: unknown) => {
        failed.add(world); // do not hammer a load that cannot succeed
        console.error(`[figures] could not load the creatures of world ${world}`, err);
      })
      .finally(() => loading.delete(world));
  }
  return null;
}
