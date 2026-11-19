/**
 * Do the SUPPORT's auras reach every enemy of its wave? Run: `npx vite-node scripts/check-auras.ts`.
 *
 * Plays real waves (the real simulation, a party that cannot die so the waves run long) on a stage of every
 * difficulty and checks, every tick, each living enemy of the wave that is on the field (released from the queue;
 * not a boss, not a summon):
 *   - while a support lives, it carries exactly the support's auras at their difficulty's values;
 *   - when the wave has no living support, it carries none (and no Aegis shield);
 *   - with Aegis among them, it has had its shield (once).
 * An enemy released THIS tick is counted apart: the auras are handed out at the start of a tick (sim/enemyTraits),
 * so it gets them on the next one — 100 ms later.
 *
 * Also measures, per aura, that it does what it says on the field: Fury (attack interval), Malice (hit size),
 * Toughness (damage taken), Vigor (regeneration), Aegis (shield), Enchanted Weapons (share of magic in its hits).
 *
 * Test/dev tooling only (sim/ + data/).
 */
import { freshHero } from '../test/sim/probe/economy';
import { buildParty } from '../test/sim/probe/combat';
import { getBonuses } from '@/sim/bonuses';
import { Simulation, createWorld, TICK_MS, type TickContext } from '@/sim/Simulation';
import { auraValue, type SupportAura } from '@/data/enemies';
import { difficultyIndexOf } from '@/data/difficulties';
import type { Combatant } from '@/sim/world';
import { foeDamageMult, attackHastePct, foeWard } from '@/sim/enemyTraits';
import { foeMagicShare } from '@/sim/damageMix';

const STAGES = [25, 125, 225, 325, 425];
const SECONDS = 600;

function expected(enemies: readonly Combatant[], S: number): Partial<Record<SupportAura, number>> | undefined {
  const support = enemies.find((e) => e.alive && e.auras !== undefined && e.auras.length > 0);
  if (support?.auras === undefined) return undefined;
  const d = difficultyIndexOf(S);
  const out: Partial<Record<SupportAura, number>> = {};
  for (const k of support.auras) out[k as SupportAura] = auraValue(k as SupportAura, d);
  return out;
}

const same = (a: object | undefined, b: object | undefined): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

for (const S of STAGES) {
  const party = buildParty([freshHero('h0', 'knight', 60), freshHero('h1', 'ranger', 60), freshHero('h2', 'priest', 60)]);
  for (const h of party) {
    h.hp = 1e15;
    h.maxHp = 1e15;
  }
  const world = createWorld(11, party);
  world.globalStageIndex = S;
  world.maxClearedStage = S;
  const sim = new Simulation(world);
  const ctx: TickContext = { bonuses: getBonuses({}, {}), ownedPetKeys: [], retryStage: true };
  const tally = { ticks: 0, withSupport: 0, checked: 0, ok: 0, wrong: 0, freshLate: 0, strayAfterDeath: 0, aegisMissing: 0, supports: 0 };
  const seenAuras = new Set<string>();
  const proofs: Record<string, string> = {};
  const wrongSamples: string[] = [];
  let lastSupport: string | undefined;
  for (let t = 0; t < (SECONDS * 1000) / TICK_MS; t++) {
    const before = new Set(world.enemies.map((e) => e.id));
    sim.tick(ctx);
    for (const h of world.heroes) h.hp = h.maxHp; // nobody falls: the waves run their course
    world.chests = [];
    if (world.phase === 'boss' || world.phase === 'zoneBoss') world.globalStageIndex = S;
    tally.ticks++;
    const want = expected(world.enemies, S);
    const sup = world.enemies.find((e) => e.alive && e.auras !== undefined && e.auras.length > 0);
    if (sup !== undefined && sup.id !== lastSupport) {
      tally.supports++;
      lastSupport = sup.id;
      for (const k of sup.auras ?? []) seenAuras.add(k);
    }
    if (want !== undefined) tally.withSupport++;
    for (const e of world.enemies) {
      if (!e.alive || e.isBoss === true || e.summon !== undefined) continue;
      tally.checked++;
      const fresh = !before.has(e.id);
      if (same(e.underAuras, want)) tally.ok++;
      else if (fresh) tally.freshLate++;
      else {
        if (want === undefined) tally.strayAfterDeath++;
        else tally.wrong++;
        if (wrongSamples.length < 3) wrongSamples.push(`${e.id} has ${JSON.stringify(e.underAuras)} want ${JSON.stringify(want)}`);
      }
      if (want?.aegis !== undefined && !fresh && e.aegisGiven !== true) tally.aegisMissing++;
      // Proof that each aura acts, measured on this enemy now.
      if (want !== undefined && e.underAuras !== undefined) {
        if (want.fury !== undefined && proofs.fury === undefined) proofs.fury = `attack speed +${attackHastePct(e)} %`;
        if (want.malice !== undefined && proofs.malice === undefined) proofs.malice = `its hits ×${foeDamageMult(e).toFixed(2)}`;
        if (want.enchant !== undefined && proofs.enchant === undefined) proofs.enchant = `${Math.round(foeMagicShare(e) * 100)} % of its hits magic`;
        if (want.toughness !== undefined && proofs.toughness === undefined) {
          const probe = { ...e, aegis: 0, guardUp: false } as Combatant;
          proofs.toughness = `a 100 hit lands as ${foeWard(probe, 100, false).toFixed(0)}`;
        }
        if (want.aegis !== undefined && proofs.aegis === undefined && (e.aegis ?? 0) > 0) proofs.aegis = `shield ${Math.round(((e.aegis ?? 0) / e.maxHp) * 100)} % of its life`;
        if (want.vigor !== undefined && proofs.vigor === undefined) proofs.vigor = `regenerates ${want.vigor} % of its life a second`;
      }
    }
  }
  const d = difficultyIndexOf(S);
  console.log(`\nStage ${S} (difficulty ${d}): ${tally.supports} supports over ${SECONDS} s, auras seen: ${[...seenAuras].join(', ')}`);
  console.log(`  enemy-ticks checked ${tally.checked}: right ${tally.ok}, wrong ${tally.wrong}, kept after the support died ${tally.strayAfterDeath}, ` +
    `just released (get them next tick) ${tally.freshLate}, Aegis shield never given ${tally.aegisMissing}`);
  for (const [k, v] of Object.entries(proofs)) console.log(`  ${k}: ${v}`);
  for (const w of wrongSamples) console.log(`  ! ${w}`);
}
