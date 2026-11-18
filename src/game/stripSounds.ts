import type { CombatEvent, Combatant, WorldState } from '@/sim/world';
import type { ChestType } from '@/data/chests';
import { RANGE } from '@/data/field';
import { playSound, setAmbience } from '@/audio/soundEngine';
import { ambienceOf } from '@/audio/soundRules';

// What the strip sounds like: the sim's facts turned into sound ids of the pipeline's manifest (src/assets/audio).
// It reads the world and the combat events the strip already shows, and calls the sound engine — the engine
// decides whether a sound may play now (soundRules: gaps, voices, the combat-sounds setting). Hit sounds are
// played by GameStrip.landHit, when the number lands, so they stay in step with the picture.

const BASIC: Record<string, string> = { knight: 'knight_swing', ranger: 'ranger_shot', priest: 'priest_strike' };
const ULTIMATES = new Set(['knight_laststand', 'priest_enrage', 'ranger_mark']);
/** A wave enemy's or boss's cast key → its sound (the rest are their key as is). */
const FOE_CASTS: Record<string, string> = { enemy_bolt: 'enemy_bolt', enemy_smash: 'enemy_smash', enemy_smash_tremor: 'enemy_smash', enemy_aimed: 'enemy_shot' };
const CHEST_SOUND: Record<ChestType, string> = { normal: 'chest_drop', stageBoss: 'chest_drop_boss', zoneBoss: 'chest_drop_world' };
/** A blow that takes more than this share of a hero's life is felt (hero_hurt). */
const BIG_HIT = 0.2;

/** The sound of a cast: a hero's ability (ab_…) or ultimate (ult_…), or a foe's. */
export function castSound(abilityKey: string, byHero: boolean): string {
  if (byHero) return ULTIMATES.has(abilityKey) ? `ult_${abilityKey}` : `ab_${abilityKey}`;
  return FOE_CASTS[abilityKey] ?? abilityKey;
}

/** The sound of a blow landing. */
export function hitSound(ev: CombatEvent, target: Combatant | undefined): string {
  if (ev.blocked === true) return 'block';
  if (ev.multi === true) return 'multi';
  if (target?.side === 'hero' && (ev.amount ?? 0) > target.maxHp * BIG_HIT) return 'hero_hurt';
  return ev.crit === true ? 'crit_hit' : 'hit';
}

/** The sound of a death. */
export function deathSound(c: Combatant): string {
  if (c.side === 'hero') return 'hero_down';
  if (c.isBoss === true) return 'boss_down';
  return c.isElite === true ? 'elite_die' : 'enemy_die';
}

export class StripSounds {
  private seen = new Set<string>();
  private casting = new Set<string>();
  private chests = new Map<ChestType, number>();
  private stage = -1;
  private wiping = false;
  private first = true;

  /** Once a frame, before the events: the ambience, what stepped in, what started casting, chests, wipes. */
  update(w: WorldState): void {
    setAmbience(ambienceOf(w.globalStageIndex));
    for (const c of w.enemies) {
      if (!this.seen.has(c.id)) {
        this.seen.add(c.id);
        if (!this.first && c.alive && c.summon === undefined) {
          if (c.isBoss === true) playSound(w.phase === 'zoneBoss' ? 'world_boss_enter' : 'boss_appear');
          else if (c.isElite === true) playSound('elite_arrive');
        }
      }
      const key = c.casting?.key;
      if (key !== undefined && !this.casting.has(c.id)) {
        this.casting.add(c.id);
        if (key === 'boss_crush') playSound('boss_charge_windup');
      } else if (key === undefined) this.casting.delete(c.id);
    }
    if (this.seen.size > 400) this.seen = new Set(w.enemies.map((c) => c.id)); // forget the long dead
    const totals = new Map<ChestType, number>();
    for (const s of w.chests) totals.set(s.type, (totals.get(s.type) ?? 0) + s.count);
    for (const [type, n] of totals) if (!this.first && n > (this.chests.get(type) ?? 0)) playSound(CHEST_SOUND[type]);
    this.chests = totals;
    if (!this.first && w.globalStageIndex > this.stage && this.stage > 0) playSound('stage_clear');
    this.stage = w.globalStageIndex;
    const wiping = w.wipeMs !== undefined;
    if (wiping && !this.wiping) playSound('wipe');
    this.wiping = wiping;
    this.first = false;
  }

  /** The events of this frame: casts, basic attacks leaving, deaths. */
  events(events: CombatEvent[], w: WorldState): void {
    const byId = (id: string | undefined): Combatant | undefined =>
      id === undefined ? undefined : (w.heroes.find((c) => c.id === id) ?? w.enemies.find((c) => c.id === id));
    for (const ev of events) {
      if (ev.type === 'cast' && ev.abilityKey !== undefined) {
        const caster = byId(ev.targetId);
        if (ev.abilityKey === 'boss_crush') playSound('boss_charge_impact');
        else playSound(castSound(ev.abilityKey, caster?.side === 'hero'));
      } else if (ev.type === 'death') {
        const c = byId(ev.targetId);
        if (c !== undefined) playSound(deathSound(c));
      } else if (ev.type === 'damage' && ev.splash !== true && ev.tick !== true && ev.abilityKey === undefined) {
        const src = byId(ev.sourceId);
        if (src?.side === 'hero' && src.classKey !== undefined) playSound(BASIC[src.classKey] ?? 'knight_swing');
        else if (src?.side === 'enemy' && src.isBoss !== true && src.range >= RANGE.ranged) playSound(src.enemyMagic === true ? 'enemy_bolt' : 'enemy_shot');
      }
    }
  }
}
