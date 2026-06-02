import { GreedyRunner } from '../test/sim/harness';
import * as ss from '../src/data/stageScaling';
console.log(`HP_MULT=${ss.ZONE_BOSS_HP_MULT} DMG_MULT=${ss.ZONE_BOSS_DMG_MULT}`);
for (const seed of [1, 7, 42]) { const r = new GreedyRunner({ seed, openChests: true }); r.run(1_400_000); console.log(`seed ${seed}: stage ${r.stage}, levels ${r.heroLevels.join('/')}`); }
