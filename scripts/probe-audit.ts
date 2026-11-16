/**
 * Does the probe's combat see the new content? Plays, in the REAL simulation and through the probe's own
 * fight set-up (test/sim/probe/combat), one farm stage per difficulty and the ten world bosses of each
 * difficulty, and counts what turned up: waves per stage, supports and their auras, enemy traits by role,
 * elites, stage-boss affixes, world-boss mechanic, affixes, summons, mechanic casts and Purify casts.
 * Run: `npx vite-node scripts/probe-audit.ts`. Test/dev tooling only.
 */
import { Simulation, createWorld, TICK_MS, type TickContext } from '@/sim/Simulation';
import { getBonuses } from '@/sim/bonuses';
import { worldOf, wavesPerStage } from '@/data/stageScaling';
import { DIFFICULTY_KEYS } from '@/data/difficulties';
import { CLASS_KEYS } from '@/data/classes';
import { buildParty } from '../test/sim/probe/combat';
import { freshHero } from '../test/sim/probe/economy';
import { zoneSet } from '../test/sim/probe/zoneGear';
import { buildTalents, PROBE_DEFAULT_BUILD } from '../test/sim/probe/builds';
import type { HeroConfig } from '@/sim/loadout';
import type { Combatant } from '@/sim/world';

const bonuses = getBonuses({}, {});
const ctx: TickContext = { bonuses, ownedPetKeys: [], retryStage: true };

/** A strong party of `level` for stage S: the trio, the probe's default build, dressed in the world's zone set. */
function party(level: number, S: number, purify = false): HeroConfig[] {
  const heroes = CLASS_KEYS.map((c, i) => {
    const h = freshHero(`h${i}`, c, level);
    if (purify && c === 'priest') {
      const b = { ...PROBE_DEFAULT_BUILD.priest, abilities: ['priest_mend', 'priest_circle'] };
      h.talents = buildTalents(c, level, b);
      h.activeAbilities = [...b.abilities];
    }
    return h;
  });
  return zoneSet(heroes, Math.ceil(S / 10) * 10, bonuses);
}

const levelFor = (S: number): number => Math.min(120, 20 + Math.floor(S / 5));

function farmAudit(S: number, seed: number): string {
  const w = createWorld(seed, buildParty(party(levelFor(S), S)));
  w.globalStageIndex = S;
  w.maxClearedStage = S;
  const sim = new Simulation(w);
  const seen = new Set<string>();
  const roles: Record<string, number> = {};
  const traits: Record<string, Set<string>> = {};
  const auraCounts: number[] = [];
  let elites = 0;
  let maxWaves = 0;
  let bossAffixes: readonly string[] | undefined;
  const cues: Record<string, number> = {};
  for (let t = 0; t < (1800 * 1000) / TICK_MS; t++) {
    const ev = sim.tick(ctx);
    for (const e of ev) if (e.type === 'cue' && e.cue !== undefined) cues[e.cue] = (cues[e.cue] ?? 0) + 1;
    maxWaves = Math.max(maxWaves, w.wavesThisStage);
    for (const e of w.enemies) {
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      if (e.isBoss === true) {
        bossAffixes = e.affixes;
        continue;
      }
      const r = e.enemyRole ?? 'none';
      roles[r] = (roles[r] ?? 0) + 1;
      if (e.isElite === true) elites += 1;
      const set = (traits[r] ??= new Set<string>());
      for (const tr of e.traits ?? []) set.add(tr);
      if (r === 'support') auraCounts.push(e.auras?.length ?? 0);
    }
    if (bossAffixes !== undefined && w.phase !== 'boss') break; // the stage boss came and went: one clear
  }
  const tr = Object.entries(traits).map(([r, s]) => `${r}:[${[...s].filter(Boolean).join(',')}]`).join(' ');
  return `S${S} (${DIFFICULTY_KEYS[Math.floor((S - 1) / 100)]} w${worldOf(S)}): waves ${maxWaves}/${wavesPerStage(S)}, enemies ${JSON.stringify(roles)}, elites ${elites}, supports ${auraCounts.length} auras [${auraCounts.join(',')}], traits ${tr}, stage-boss affixes [${(bossAffixes ?? []).join(',')}], cues ${JSON.stringify(cues)}`;
}

function bossAudit(S: number, seed: number, purify: boolean): string {
  const w = createWorld(seed, buildParty(party(levelFor(S), S, purify)));
  w.maxClearedStage = S - 1;
  w.globalStageIndex = S - 1;
  const sim = new Simulation(w);
  if (!sim.enterZoneBoss(worldOf(S))) return `S${S}: could not enter`;
  let boss: Combatant | undefined;
  const summons = new Set<string>();
  const casts: Record<string, number> = {};
  const cues: Record<string, number> = {};
  let heroDeaths = 0;
  let win = false;
  const wipes = w.wipes;
  for (let t = 0; t < (300 * 1000) / TICK_MS; t++) {
    const ev = sim.tick(ctx);
    for (const e of ev) {
      if (e.type === 'cast' && e.abilityKey !== undefined) casts[e.abilityKey] = (casts[e.abilityKey] ?? 0) + 1;
      if (e.type === 'cue' && e.cue !== undefined) cues[e.cue] = (cues[e.cue] ?? 0) + 1;
      if (e.type === 'death' && w.heroes.some((h) => h.id === e.targetId)) heroDeaths += 1;
    }
    for (const e of w.enemies) {
      if (e.isBoss === true) boss = e;
      if (e.summon !== undefined) summons.add(e.id);
    }
    if (w.wipes > wipes) break;
    if (boss !== undefined && !w.enemies.some((e) => e.isBoss === true && e.alive)) {
      win = true;
      break;
    }
  }
  const fight = ((boss?.fightMs ?? 0) / 1000).toFixed(0);
  const castList = Object.entries(casts).filter(([k]) => !k.startsWith('hero') ).map(([k, n]) => `${k}×${n}`).join(' ');
  return `S${S} w${worldOf(S)}: mechanic ${boss?.mechanic ?? '-'} affixes [${(boss?.affixes ?? []).join(',')}] ${win ? 'WIN' : 'lost'} ${fight}s, summons ${summons.size}, hero deaths ${heroDeaths}, casts ${castList}, cues ${JSON.stringify(cues)}`;
}

for (let d = 0; d < 5; d++) {
  for (const s of [25, 59]) process.stdout.write(farmAudit(d * 100 + s, 1234) + '\n');
}
for (const purify of [false, true]) {
  process.stdout.write(`\n== world bosses (${purify ? 'priest with Purify' : 'default build'})\n`);
  for (let d = 0; d < 5; d++) {
    for (let wb = 1; wb <= 10; wb++) process.stdout.write(bossAudit(d * 100 + wb * 10, 1234, purify) + '\n');
  }
}
