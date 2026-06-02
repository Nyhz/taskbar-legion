import { describe, it, expect } from 'vitest';
import { Simulation, createWorld, type TickContext } from '@/sim/Simulation';
import { buildHeroCombatant } from '@/sim/loadout';
import { getBonuses } from '@/sim/bonuses';

// Design directive: enemies focus the FRONTLINE (party-order, first living hero);
// the back line (DPS/support) is protected until the front falls. So the front
// hero's tankiness gates progression — a squishy front collapses the group.

const ctx: TickContext = { bonuses: getBonuses({}, []), ownedPetKeys: [] };

describe('frontline targeting model', () => {
  it('the back line is untouched while the frontline lives', () => {
    const warrior = buildHeroCombatant({ id: 'tank', classKey: 'warrior', level: 5, equipment: {}, talents: {} }, []);
    const ranger = buildHeroCombatant({ id: 'dps', classKey: 'ranger', level: 5, equipment: {}, talents: {} }, []);
    const world = createWorld(1, [warrior, ranger]); // tank in slot 0 (front)
    world.globalStageIndex = 6;
    const sim = new Simulation(world);
    for (let i = 0; i < 80; i++) {
      sim.tick(ctx);
      if (!warrior.alive) break; // stop once the front falls
    }
    // The column never lets a back hero overtake the front, so the ranger behind the
    // warrior stays untouched while the warrior soaks the hits.
    expect(ranger.hp).toBe(ranger.maxHp);
    expect(warrior.hp).toBeLessThan(warrior.maxHp); // the front took the hits
  });

  it('a bulkier melee front holds the line far longer (front bulk gates progression)', () => {
    // Hold the CLASS (warrior → melee reach) constant so only BULK differs — a ranged/
    // caster front would survive via kiting (range kills foes before they land hits),
    // a separate valid strategy. With equal reach, the level-10 tank's bulk decides vs
    // a fresh level-1 warrior. (Rogue/Mage were removed; the warrior is the only melee.)
    const timeToFrontDeath = (frontLevel: number): number => {
      const front = buildHeroCombatant({ id: 'front', classKey: 'warrior', level: frontLevel, equipment: {}, talents: {} }, []);
      const back = buildHeroCombatant({ id: 'back', classKey: 'ranger', level: 10, equipment: {}, talents: {} }, []);
      const world = createWorld(7, [front, back]);
      world.globalStageIndex = 18;
      const sim = new Simulation(world);
      for (let i = 0; i < 3000; i++) {
        sim.tick(ctx);
        if (!front.alive) return i;
      }
      return 3000;
    };
    expect(timeToFrontDeath(10)).toBeGreaterThan(timeToFrontDeath(1) * 1.15);
  });
});
