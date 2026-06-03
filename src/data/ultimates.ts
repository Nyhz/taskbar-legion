// Class ultimates (rework, supersedes the old row-10 "ultimate" abilities). An ult is
// NOT a talent node: it auto-unlocks at hero level 30, is always active, costs no
// points, and occupies NEITHER of the 2 active-ability loadout slots. Each is
// auto-fired by the sim on its trigger (never manually cast, no normal cooldown).
//
// All tunable numbers live HERE (data-driven; the sim reads them). The companion
// effect markers (fx_invuln / fx_mark / buff_enrage_*) are in data/effects.ts.

export type UltimateTrigger =
  | 'onLethalDamage' // checked in the kill path (Knight)
  | 'onBossEngage'; // fired once when a boss first enters the fight (Priest, Ranger)

export type UltimateEffect =
  // Knight — Last Stand: a would-be-lethal blow is cancelled; the hero heals and is
  // briefly invulnerable. `chargesPerStage` refills on every stage advance.
  | { type: 'deathBlock'; chargesPerStage: number; healFrac: number; invulnMs: number }
  // Priest — Battle Enrage: on boss engage, the whole party gains CDR + attack speed.
  | { type: 'partyEnrage'; cdrPct: number; attackSpeedPct: number; durationMs: number }
  // Ranger — Mark of the Hunter: on boss engage, mark the boss so it takes more damage
  // from all sources for the fight.
  | { type: 'markVulnerable'; bonusDamagePct: number; durationMs: number };

export interface UltimateDef {
  key: string;
  classKey: string;
  name: string;
  icon: string;
  desc: string;
  unlockLevel: number;
  trigger: UltimateTrigger;
  effect: UltimateEffect;
}

/** Hero level at which a class ultimate unlocks (always active thereafter). Set to 30:
 *  heroes are ~L33 at stage 50, so ultimates land in the late-mid game (~stage 42-47),
 *  arriving just as the world-4/5 boss-gate walls hit rather than after the content. */
export const ULTIMATE_UNLOCK_LEVEL = 30;

export const ULTIMATES: Record<string, UltimateDef> = {
  knight: {
    key: 'knight_laststand', classKey: 'knight', name: 'Last Stand', icon: 'guard',
    desc: 'A would-be-lethal blow leaves the knight at a sliver of HP, healing him and granting 6s of total invulnerability. Recharges each stage.',
    unlockLevel: ULTIMATE_UNLOCK_LEVEL, trigger: 'onLethalDamage',
    effect: { type: 'deathBlock', chargesPerStage: 1, healFrac: 0.4, invulnMs: 6000 },
  },
  priest: {
    key: 'priest_enrage', classKey: 'priest', name: 'Battle Enrage', icon: 'cry',
    desc: 'On engaging a stage or world boss, the whole party gains +25% cooldown reduction and +25% attack speed for 10s.',
    unlockLevel: ULTIMATE_UNLOCK_LEVEL, trigger: 'onBossEngage',
    effect: { type: 'partyEnrage', cdrPct: 25, attackSpeedPct: 25, durationMs: 10000 },
  },
  ranger: {
    key: 'ranger_mark', classKey: 'ranger', name: 'Mark of the Hunter', icon: 'aim',
    desc: 'On engaging a stage or world boss, the ranger marks it — the boss takes +25% damage from all sources for the fight.',
    unlockLevel: ULTIMATE_UNLOCK_LEVEL, trigger: 'onBossEngage',
    effect: { type: 'markVulnerable', bonusDamagePct: 25, durationMs: 600000 },
  },
};

/** The class's ultimate IF the hero is high enough level to have unlocked it. */
export function ultimateForClass(classKey: string, level: number): UltimateDef | undefined {
  const u = ULTIMATES[classKey];
  if (u === undefined || level < u.unlockLevel) return undefined;
  return u;
}
