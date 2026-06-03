import { Assets, Rectangle, Texture } from 'pixi.js';
import type { Combatant } from '@/sim/world';
import { RANGE } from '@/data/field';
import type { CharFrames, CharSpriteConfig } from './characterFrames';

// Sprite-sheet ENEMY bodies (parallel to characterFrames.ts for heroes). Every enemy in
// assets/enemies/<name>/with-shadows/ is a horizontal strip of 100×100 frames
// (<name>-idle/walk/attack0N/death/hurt/block). We glob them all (no 80-line import
// list), slice each into per-frame Textures, and reuse the hero SpriteBody state machine
// (idle/walk/attack/death) to drive them. cfg.scale stays 1 — the EnemySprite applies the
// per-ROLE size (a melee sheet renders small as trash, big as a stage boss).

// Glob every enemy action sheet (eager URLs). Path: …/enemies/<name>/with-shadows/<file>.png
const SHEET_URLS = import.meta.glob('../../assets/enemies/*/with-shadows/*.png', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>;

// name → action → url (action = the filename suffix after "<name>-", e.g. idle/attack01/death).
const sheetsByName: Record<string, Record<string, string>> = {};
for (const [path, url] of Object.entries(SHEET_URLS)) {
  const m = /enemies\/([^/]+)\/with-shadows\/(.+)\.png$/.exec(path);
  if (m === null) continue;
  const name = m[1]!;
  const file = m[2]!;
  const action = file.startsWith(`${name}-`) ? file.slice(name.length + 1) : file;
  (sheetsByName[name] ??= {})[action] = url;
}

// Common enemy geometry: figures sit centred (x≈50) with feet/shadow near y66 in the
// 100px frame. fps cadence is shared (a touch slower than the heroes for weightier mobs).
const ENEMY_CONFIG: CharSpriteConfig = {
  frameSize: 100, bodyCx: 50, feetY: 58, scale: 1, // feetY tuned so feet land on the party ground line; scale=1 → EnemySprite sets the per-role size
  fps: { idle: 6, walk: 10, attack: 13, block: 12, hurt: 12, death: 9, heal: 12 },
};

// The figure's height ABOVE the feet within a frame (px, generous to clear weapons/mounts)
// — used to place the HP bar just over the sprite at any render scale.
export const ENEMY_FIGURE_H = 42;

const cache = new Map<string, CharFrames>();
let loading: Promise<void> | null = null;

function slice(base: Texture, frameSize: number): Texture[] {
  base.source.scaleMode = 'nearest';
  const count = Math.max(1, Math.floor(base.width / frameSize));
  const out: Texture[] = [];
  for (let i = 0; i < count; i++) {
    out.push(new Texture({ source: base.source, frame: new Rectangle(i * frameSize, 0, frameSize, frameSize) }));
  }
  return out;
}

async function loadSheet(url: string | undefined): Promise<Texture[] | null> {
  if (url === undefined) return null;
  return slice(await Assets.load<Texture>(url), ENEMY_CONFIG.frameSize);
}

/** Load + slice every enemy sheet into CharFrames. Idempotent. */
export async function loadEnemyTextures(): Promise<void> {
  if (loading !== null) return loading;
  loading = (async () => {
    for (const [name, actions] of Object.entries(sheetsByName)) {
      // Attacks: prefer the numbered set, fall back to a single "attack" sheet.
      const attackUrls = ['attack01', 'attack02', 'attack03', 'attack']
        .map((a) => actions[a])
        .filter((u): u is string => u !== undefined);
      const [idle, walk, death, hurt, block, ...attacks] = await Promise.all([
        loadSheet(actions.idle ?? actions.walk),
        loadSheet(actions.walk ?? actions.idle),
        loadSheet(actions.death),
        loadSheet(actions.hurt),
        loadSheet(actions.block),
        ...attackUrls.map((u) => loadSheet(u)),
      ]);
      cache.set(name, {
        idle: idle ?? [],
        walk: walk ?? [],
        attacks: attacks.map((a) => a ?? []).filter((a) => a.length > 0),
        attackFx: [],
        block,
        hurt,
        death,
        heal: null,
        projectile: null,
        config: ENEMY_CONFIG,
      });
    }
  })();
  return loading;
}

/** Loaded frames for an enemy sprite key (e.g. 'orc', 'slime'), or null if absent/not ready. */
export function getEnemyFrames(key: string): CharFrames | null {
  return cache.get(key) ?? null;
}

// ── sprite assignment ──────────────────────────────────────────────────────────
// Melee trash + stage bosses draw from this pool (random per enemy, deterministic by id).
// Reserved for the WORLD bosses (cycled by world): orc-rider, werebear, werewolf.
const MELEE_POOL = ['orc', 'skeleton', 'armored-axeman', 'armored-orc', 'armored-skeleton', 'elite-orc', 'greatsword-skeleton'] as const;
const WORLD_BOSSES = ['orc-rider', 'werebear', 'werewolf'] as const;

export type EnemySizeClass = 'normal' | 'stageBoss' | 'worldBoss';

export interface EnemySpriteSpec {
  spriteKey: string;
  sizeClass: EnemySizeClass;
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Resolve which sprite + size class an enemy uses. `world` (1-based) cycles the world
 *  bosses; `isWorldBoss` is true on the W-10 zone-boss fight, false for a stage boss. */
export function resolveEnemySprite(c: Combatant, ctx: { world: number; isWorldBoss: boolean }): EnemySpriteSpec {
  if (c.isBoss === true && ctx.isWorldBoss) {
    return { spriteKey: WORLD_BOSSES[(Math.max(1, ctx.world) - 1) % WORLD_BOSSES.length]!, sizeClass: 'worldBoss' };
  }
  if (c.isBoss === true) {
    return { spriteKey: MELEE_POOL[hashId(c.id) % MELEE_POOL.length]!, sizeClass: 'stageBoss' };
  }
  if (c.range >= RANGE.ranged) return { spriteKey: 'skeleton-archer', sizeClass: 'normal' };
  return { spriteKey: MELEE_POOL[hashId(c.id) % MELEE_POOL.length]!, sizeClass: 'normal' };
}
