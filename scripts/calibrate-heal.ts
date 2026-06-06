/* TEMP calibration: priest healPower per difficulty → Mend heal% of tank maxHP.
 * Run: npx vite-node scripts/calibrate-heal.ts
 * Builds a representative priest at each difficulty (greedy-equip a loot pool, socket gems),
 * reports raw healPower and the resulting Mend rank-5 heal% (coeff 0.25), so we can size the
 * per-difficulty healPower debuff to land acceptable≈35% / well-geared≈40%. */
import { freshHero } from '../test/sim/probe/economy';
import { openCaptured, equipItems, socketGems } from '../test/sim/probe/gear';
import { heroBaseStats, heroStaticMods, type HeroConfig } from '@/sim/loadout';
import { aggregate } from '@/sim/stats';
import { getBonuses } from '@/sim/bonuses';
import { expectedLevel } from '@/data/stageScaling';
import { DIFFICULTY_KEYS, DIFFICULTIES, HEAL_POWER_EFFECTIVENESS } from '@/data/difficulties';

const bonuses = getBonuses({}, []);
const MEND_COEFF = 0.25; // rank 5
// Fraction of tank maxHP a Mend heals over 6s, WITH the per-difficulty heal-power debuff applied.
const healPct = (hp: number, key: string): number => MEND_COEFF * (1 + (hp * HEAL_POWER_EFFECTIVENESS[key as 'normal']) / 100);

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

console.log('\n=== Mend heal% VALIDATION (rank 5, coeff 0.25) — WITH the zone debuff applied ===');
console.log('target: acceptable ≈ 40%, well-geared(at ilvl) ≈ 45% of tank maxHP\n');
console.log('diff\tlvl\tdebuff\thealPower(acc/well)\theal%(acc/well)');
for (const key of DIFFICULTY_KEYS) {
  const s = REP[key]!;
  const lvl = Math.min(120, expectedLevel(s));
  const acc = priestHealPower(s, 500, 11); // "acceptable" — modest farming
  const well = priestHealPower(s, 4000, 11); // "well-geared at ilvl" — heavily farmed best-in-slot
  console.log(
    `${DIFFICULTIES[key].name}\t${lvl}\t×${HEAL_POWER_EFFECTIVENESS[key]}\t${acc.toFixed(0)}% / ${well.toFixed(0)}%\t` +
    `${(healPct(acc, key) * 100).toFixed(0)}% / ${(healPct(well, key) * 100).toFixed(0)}%`,
  );
}
