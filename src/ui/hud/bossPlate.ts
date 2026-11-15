import type { WorldDef } from '@/data/worlds';

// Who the boss in front is, for the HUD's boss line (no React here — pure, unit-tested). A stage boss is its
// world's `boss` creature. A world boss (the W-10 wall) is the world's own `worldBoss` creature when the world
// has one; until every world does, the others are fought as the stage boss's figure and carry ITS name — the
// rank is told by the sign in front of the name (a skull for a stage boss, a gold crown for a world boss), not
// by more words.

export type BossRank = 'stageBoss' | 'worldBoss';

export interface BossPlateInfo {
  rank: BossRank;
  /** The creature whose name the line shows (data/worlds.ts key), or null when the world is unknown. */
  creatureKey: string | null;
  /** The sign in front of the name. */
  sign: 'hud_boss' | 'tal_crown';
}

export function bossPlateInfo(world: WorldDef | undefined, worldBossFight: boolean): BossPlateInfo {
  const rank: BossRank = worldBossFight ? 'worldBoss' : 'stageBoss';
  const creature = worldBossFight ? (world?.worldBoss ?? world?.creatures.boss) : world?.creatures.boss;
  return { rank, creatureKey: creature?.key ?? null, sign: worldBossFight ? 'tal_crown' : 'hud_boss' };
}

/** "m:ss" left on a clock of `ms`, rounded up to the second. */
export function clockText(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}
