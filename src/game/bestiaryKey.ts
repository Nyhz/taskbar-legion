import type { Combatant } from '@/sim/world';
import { tryWorldDef } from '@/data/worlds';
import { worldInDifficulty } from '@/data/difficulties';
import { isZoneBossStage } from '@/data/stageScaling';
import { creatureRole } from './render/figureData';

// Which creature of the bestiary (the Codex) an enemy of the simulation is: the same choice the strip makes to
// draw it (render/figureData.creatureRole), so the entry you unlock is the figure you saw fall. A world boss is
// its world's own creature for it (or the stage boss standing in); a support is its world's support creature
// (or, until it has one, the ranged one it is drawn as). What a boss summons is no creature: undefined.

export function bestiaryKey(c: Combatant, globalStage: number): string | undefined {
  if (c.summon !== undefined) return undefined;
  const world = tryWorldDef(worldInDifficulty(globalStage));
  if (world === undefined) return undefined;
  if (c.isBoss === true) return (isZoneBossStage(globalStage) ? world.worldBoss : undefined)?.key ?? world.creatures.boss.key;
  if (c.enemyRole === 'support' && world.support !== undefined) return world.support.key;
  return world.creatures[creatureRole(c)].key;
}
