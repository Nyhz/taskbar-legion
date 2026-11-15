import { describe, expect, it } from 'vitest';
import { Simulation, createWorld, type TickContext } from '@/sim/Simulation';
import { buildHeroCombatant, partyAuraMods, type HeroConfig } from '@/sim/loadout';
import { getBonuses } from '@/sim/bonuses';
import { spentPoints } from '@/sim/talentRules';
import type { CombatEvent } from '@/sim/world';
import { buildTalents } from './_kit';

// The whole first wave in a real simulation: every branch ability, modifier and capstone in play, twice from
// the same seed. Same seed + same builds ⇒ the same stream, to the last event (golden rule #2).

const ctx: TickContext = { bonuses: getBonuses({}, {}), ownedPetKeys: [] };

/** Two parties that between them hold every branch ability, 16 of the 18 modifiers and all six capstones. */
const PARTIES: Record<string, Record<string, string[]>> = {
  'Bastion · Marksman · Devotion': {
    knight: ['knight_guard', 'knight_holdtheline', 'knight_mod_shared_skin', 'knight_mod_standard_bearer', 'knight_vanguard', 'knight_warden', 'knight_unyielding', 'knight_cap_living_wall'],
    ranger: ['ranger_aimedshot', 'ranger_weakspot', 'ranger_mod_heartseeker', 'ranger_mod_open_wound', 'ranger_predator', 'ranger_long_shot', 'ranger_hunters_focus', 'ranger_cap_relentless_mark'],
    priest: ['priest_mend', 'priest_sanctuary', 'priest_mod_swift_mend', 'priest_mod_deep_sanctuary', 'priest_triage', 'priest_vigil', 'priest_sacred_ward', 'priest_cap_second_wind'],
  },
  'Scourge · Stalker · Zeal': {
    knight: ['knight_bloodlust', 'knight_riposte', 'knight_mod_thirst_for_battle', 'knight_mod_punishing_riposte', 'knight_cap_vengeance'],
    ranger: ['ranger_focus', 'ranger_tarflask', 'ranger_mod_scorched_earth', 'ranger_mod_burning_tar', 'ranger_cap_killing_field'],
    priest: ['priest_nova', 'priest_smite', 'priest_mod_radiant_nova', 'priest_mod_mending_light', 'priest_cap_crusade'],
  },
};

function run(wanted: Record<string, string[]>, seed: number, ticks: number): { trace: string; casts: Set<string>; wipes: number } {
  const configs: HeroConfig[] = ['knight', 'ranger', 'priest'].map((classKey) => ({
    id: classKey, classKey, level: 120, equipment: {}, talents: buildTalents(classKey, wanted[classKey] ?? []),
  }));
  for (const c of configs) expect(spentPoints(c.talents)).toBeLessThanOrEqual(120);
  const auras = partyAuraMods(configs);
  const sim = new Simulation(createWorld(seed, configs.map((c) => buildHeroCombatant(c, auras))));
  sim.travelTo(201); // Inferno, world 1: where naked level-120 heroes get hurt (so the heals fire) without wiping
  const casts = new Set<string>();
  const trace: string[] = [];
  for (let i = 0; i < ticks; i++) {
    const events: CombatEvent[] = sim.tick(ctx);
    for (const e of events) {
      if (e.type === 'cast' && e.abilityKey !== undefined) casts.add(e.abilityKey);
      trace.push(`${i}:${e.type}:${e.targetId}:${e.sourceId ?? ''}:${e.abilityKey ?? ''}:${e.amount === undefined ? '' : e.amount.toFixed(6)}`);
    }
  }
  const w = sim.world;
  trace.push(JSON.stringify({ rng: w.rngState, stage: w.globalStageIndex, waves: w.wavesThisStage, hp: w.heroes.map((h) => h.hp), gold: w.pending.gold }));
  return { trace: trace.join('\n'), casts, wipes: w.wipes };
}

describe('the class kits in a real run', () => {
  for (const [name, wanted] of Object.entries(PARTIES)) {
    it(`${name}: same seed ⇒ identical event stream; another seed ⇒ another`, () => {
      const a = run(wanted, 20261115, 6000);
      const b = run(wanted, 20261115, 6000);
      expect(a.trace).toBe(b.trace);
      expect(run(wanted, 7, 6000).trace).not.toBe(a.trace);
      // The new abilities really fire in it (the two the party learned per hero).
      for (const classKey of ['knight', 'ranger', 'priest']) {
        const abilities = (wanted[classKey] ?? []).slice(0, 2);
        for (const key of abilities) expect(a.casts.has(key), `${key} cast`).toBe(true);
      }
    });
  }
});
