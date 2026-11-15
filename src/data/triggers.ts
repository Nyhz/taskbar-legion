// Triggers: "when X happens, do Y" as data (docs/redesign/CLASSES.md §6, F5). A hero carries the triggers of
// its class ultimate, of its capstone, of its modifiers and of its learned abilities; sim/triggers.ts fires
// them from the combat loop's hooks. Nothing here is behaviour — adding a trigger is writing one of these.

/** Who a trigger's action lands on. `subject` is whoever the event is about (the enemy that engaged, the ally
 *  about to fall, the holder of the effect that ended…); the rest are resolved around the trigger's owner. */
export type TriggerTarget = 'self' | 'subject' | 'allAllies' | 'allEnemies' | 'meleeEnemies' | 'frontEnemy';

export type TriggerEvent =
  // A hero is about to fall: the owner itself, or one of its allies.
  | { on: 'lethal'; who: 'self' | 'ally' }
  // An enemy reaches the fight for the first time. `subject` = that enemy.
  | { on: 'enemyEngage'; vs: 'boss' | 'eliteOrBoss' }
  // The first enemy of a wave (or a boss) reaches the fight.
  | { on: 'waveEngage' }
  // The owner blocked a hit. `subject` = the attacker.
  | { on: 'block' }
  // The owner landed a critical hit. `subject` = the victim.
  | { on: 'crit' }
  // The owner dealt the killing blow. `subject` = the dead enemy.
  | { on: 'kill' }
  // An effect the owner applied ended (ran out, or a shield was spent). `subject` = its holder.
  | { on: 'effectEnd'; effectKey: string }
  // An enemy carrying this effect from the owner died. `subject` = the dead enemy.
  | { on: 'bearerDeath'; effectKey: string }
  // Any living hero of the party is under this share of its life (checked once per tick).
  | { on: 'allyHpBelow'; frac: number };

export type TriggerAction =
  // Cancel the lethal blow on the falling hero: left at `hpFrac` of its life (never under 1) and invulnerable.
  | { do: 'rescue'; hpFrac: number; invulnMs: number }
  // Apply an effect. Magnitude: `value`, or `hpFrac` of the receiver's max HP (shields), or the effect's own.
  | { do: 'apply'; effectKey: string; to: TriggerTarget; value?: number; hpFrac?: number; durationMs?: number }
  // Heal a share of each receiver's max HP (cut by healing reduction; not scaled by heal power).
  | { do: 'heal'; to: TriggerTarget; hpFrac: number }
  // Lengthen effects the owner already carries.
  | { do: 'extend'; effectKeys: readonly string[]; ms: number }
  // Bank charges on one of the owner's charge-gated abilities.
  | { do: 'charge'; abilityKey: string; amount: number }
  // bearerDeath only: the dead bearer's effect jumps, as it is, to another enemy.
  | { do: 'move'; to: TriggerTarget };

export interface TriggerDef {
  /** Stable key (per-stage uses are counted against it). */
  key: string;
  event: TriggerEvent;
  actions: readonly TriggerAction[];
  /** What a firing costs: the ultimate's per-stage charge, or this trigger's own uses per stage. Free if absent. */
  uses?: 'ultCharge' | { perStage: number };
  /** Render marker: push a 'cast' event with this key (owner → subject, or → where a `move` landed) when it
   *  fires. The strip must know the key: today only the Ranger's mark ('ranger_mark') is drawn. */
  marker?: string;
}
