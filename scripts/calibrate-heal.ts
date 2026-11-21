/* Calibration: priest healPower per difficulty → a heal's share of the tank's max HP.
 * Run: npx vite-node scripts/calibrate-heal.ts
 * Builds a representative priest at each difficulty (greedy-equip a loot pool, socket gems) and reports raw
 * healPower and the multiplier it gives a heal, (1 + healPower), with a reference coeff of 0.25. Heal power is not
 * tier-scaled since 2026-11-21 (data/stats) and the per-difficulty devaluation is gone, so this is the heal itself. */
import { freshHero } from '../test/sim/probe/economy';
import { openCaptured, equipItems, socketGems } from '../test/sim/probe/gear';
import { heroBaseStats, heroStaticMods, type HeroConfig } from '@/sim/loadout';
import { aggregate } from '@/sim/stats';
import { getBonuses } from '@/sim/bonuses';
import { expectedLevel } from '@/data/stageScaling';
import { DIFFICULTY_KEYS, DIFFICULTIES } from '@/data/difficulties';

const bonuses = getBonuses({}, {});
const MEND_COEFF = 0.25; // rank 5
// Fraction of tank maxHP a heal of coeff MEND_COEFF gives at that heal power.
const healPct = (hp: number): number => MEND_COEFF * (1 + hp / 100);

function priestHealPower(repStage: number, opens: number, seed: number): number {
  const lvl = Math.min(120, expectedLevel(repStage));
  const priest: HeroConfig = freshHero('p', 'priest', lvl);
  const party = [priest];
  const cursor = { n: 0 };
  for (let i = 0; i < opens; i += 50) {
    const loot = openCaptured('stageBoss', repStage, 50, seed, cursor, bonuses, ['priest']);
    equipItems(party, loot.items);
    socketGems(party, loot.gems);
  }
  return aggregate(heroBaseStats('priest', lvl), heroStaticMods(party[0]!, [])).healPower;
}

// Representative late stage per difficulty (the X-9 farm before each difficulty's final wall).
const REP: Record<string, number> = { normal: 99, hell: 199, inferno: 299, eternal: 399, torment: 499 };

console.log('\n=== heal% (coeff 0.25) by difficulty: the multiplier (1 + healPower) ===');
console.log('diff\tlvl\thealPower(acc/well)\tmult(acc/well)\theal%(acc/well)');
for (const key of DIFFICULTY_KEYS) {
  const s = REP[key]!;
  const lvl = Math.min(120, expectedLevel(s));
  const acc = priestHealPower(s, 500, 11); // "acceptable" — modest farming
  const well = priestHealPower(s, 4000, 11); // "well-geared at ilvl" — heavily farmed best-in-slot
  console.log(
    `${DIFFICULTIES[key].name}\t${lvl}\t${acc.toFixed(0)}% / ${well.toFixed(0)}%\t×${(1 + acc / 100).toFixed(2)} / ×${(1 + well / 100).toFixed(2)}\t` +
    `${(healPct(acc) * 100).toFixed(0)}% / ${(healPct(well) * 100).toFixed(0)}%`,
  );
}
