// Class ultimates (rework, supersedes the old row-10 "ultimate" abilities). An ult is
// NOT a talent node: it auto-unlocks at hero level 30, is always active, costs no
// points, and occupies NEITHER of the 2 active-ability loadout slots. Each is
// auto-fired by the sim on its trigger (never manually cast, no normal cooldown).
//
// All tunable numbers live HERE (data-driven; the sim reads them). The companion
// effect markers (fx_invuln / fx_mark / buff_enrage_*) are in data/effects.ts.

import type { TriggerAction, TriggerDef } from './triggers';

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

/** How a capstone node transforms the class ultimate (docs/redesign/CLASSES.md §2.4). Pure data. */
export interface UltimatePatch {
  /** The engage ultimates also fire against elites. */
  vs?: 'eliteOrBoss';
  /** New duration of what the ultimate applies. */
  durationMs?: number;
  /** Extra actions when the ultimate fires. */
  addActions?: readonly TriggerAction[];
  /** Extra triggers the hero carries with the capstone. */
  addTriggers?: readonly TriggerDef[];
}

/** The ultimate as TRIGGERS (data/triggers.ts) — the one place its `effect` numbers turn into behaviour, so
 *  the sim fires ultimates through the same generic path as every other trigger. `patch` is the capstone's. */
export function ultimateTriggers(u: UltimateDef, patch?: UltimatePatch): TriggerDef[] {
  const e = u.effect;
  const extra = patch?.addActions ?? [];
  const vs = patch?.vs ?? 'boss';
  let own: TriggerDef;
  if (e.type === 'deathBlock') {
    own = {
      key: u.key, event: { on: 'lethal', who: 'self' }, uses: 'ultCharge',
      actions: [{ do: 'rescue', hpFrac: e.healFrac, invulnMs: e.invulnMs }, ...extra],
    };
  } else if (e.type === 'partyEnrage') {
    const durationMs = patch?.durationMs ?? e.durationMs;
    own = {
      key: u.key, event: { on: 'enemyEngage', vs },
      actions: [
        { do: 'apply', effectKey: 'buff_enrage_cdr', to: 'allAllies', value: e.cdrPct, durationMs },
        { do: 'apply', effectKey: 'buff_enrage_as', to: 'allAllies', value: e.attackSpeedPct, durationMs },
        ...extra,
      ],
    };
  } else {
    const durationMs = patch?.durationMs ?? e.durationMs;
    own = {
      key: u.key, event: { on: 'enemyEngage', vs }, marker: u.key,
      actions: [{ do: 'apply', effectKey: 'fx_mark', to: 'subject', value: e.bonusDamagePct, durationMs }, ...extra],
    };
  }
  return [own, ...(patch?.addTriggers ?? [])];
}
