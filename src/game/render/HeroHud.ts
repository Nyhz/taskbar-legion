import { Container, Sprite } from 'pixi.js';
import type { Combatant } from '@/sim/world';
import { RESPAWN_MS } from '@/data/field';
import { totalShield } from './effectAuras';
import { ChipRow } from './ChipRow';
import { LifeBar } from './LifeBar';
import {
  BARS, CHIP_STEP, HERO_BAR_STYLE, LOW_BEAT_MS, LOW_LIFE,
  abilityChips, effectChips, heroHudLayout, newGhost, rowLeft, stepGhost, ultimateChip,
} from './stripHud';
import { stripHudTexture } from './stripHudTextures';

// What a hero wears over the head and at the feet (render/stripHud has the rules): the life bar — with the slice
// just lost, the absorb shield, the low-life beat and, when he has fallen, the count to his return — the chips of
// the effects on him, and the chips of his abilities and of his ultimate. Everything is centred on ONE line (the
// `cx` it is given: where his body stands). Reads the sim; never changes it. `above` is lifted when a neighbour's
// HUD crowds it; `feet` stays on the path.

export class HeroHud {
  readonly above = new Container();
  readonly feet = new Container();
  private readonly layout = heroHudLayout();
  private readonly bar = new LifeBar(BARS.hero, 'hud_s_fill_life', HERO_BAR_STYLE === 'notched' ? 'hud_s_bar_hero_notch' : undefined);
  private readonly effects = new ChipRow(CHIP_STEP, 0);
  private readonly cooldowns: ChipRow;
  // The count of a fallen hero's return: an hourglass chip and the seconds left in pixel numerals.
  private readonly respawn = new Container();
  private readonly tens = new Sprite();
  private readonly units = new Sprite();
  private ghost = newGhost();
  private elapsed = 0;
  private lift = 0;

  /** `cx`: the centre line (container-local x); `headY` / `feetY`: the top of the standing figure and the ground line. */
  constructor(cx: number, private readonly headY: number, feetY: number) {
    const lay = this.layout;
    this.above.position.set(cx, headY);
    this.feet.position.set(cx, feetY);
    this.bar.position.set(lay.bar.x, lay.bar.y);
    this.effects.y = lay.effectsY;
    const glass = new Sprite(stripHudTexture('hud_s_chip_count'));
    const sign = new Sprite(stripHudTexture('hud_s_m_respawn'));
    sign.position.set(1, 1);
    const plate = new Sprite(stripHudTexture('hud_s_chip_count'));
    plate.x = CHIP_STEP;
    this.tens.position.set(CHIP_STEP + 1, 2);
    this.units.position.set(CHIP_STEP + 5, 2);
    this.respawn.addChild(glass, sign, plate, this.tens, this.units);
    this.respawn.position.set(rowLeft(2), lay.effectsY);
    this.respawn.visible = false;
    this.above.addChild(this.bar, this.effects, this.respawn);
    this.cooldowns = new ChipRow(lay.cooldowns.dx, 0, true);
    this.cooldowns.y = lay.cooldowns.y;
    this.feet.addChild(this.cooldowns);
  }

  /** Raise everything over the head by `px` (a crowded neighbour); what is at the feet stays. */
  setLift(px: number): void {
    if (px === this.lift) return;
    this.lift = px;
    this.above.y = this.headY - px;
  }

  setVisible(on: boolean): void {
    this.above.visible = on;
    this.feet.visible = on;
  }

  /** Container-local y of the top of what stands over the head now (a cast sign goes just above it). */
  get topY(): number {
    return this.headY - this.lift - this.layout.top;
  }

  /** `bossEngaged`: a boss is in the fight and the party's engage ultimates have fired on it (stripHud.ultimateChip). */
  update(c: Combatant, dtMs: number, reviving: boolean, bossEngaged: boolean): void {
    this.elapsed += dtMs;
    const fighting = c.alive && !reviving;
    if (reviving) {
      const left = c.respawnMs ?? 0;
      const prog = Math.max(0, Math.min(1, 1 - left / RESPAWN_MS));
      this.bar.setCasing(BARS.hero.casing);
      this.bar.setFill('hud_s_fill_respawn');
      this.bar.set(prog);
      this.ghost = newGhost(prog); // no stale slice into or out of the count
      // The count: the hourglass and the seconds left (two numerals), where the effect row stands.
      const secs = Math.max(0, Math.min(99, Math.ceil(left / 1000)));
      this.tens.texture = stripHudTexture(`hud_s_d_${Math.floor(secs / 10)}`);
      this.units.texture = stripHudTexture(`hud_s_d_${secs % 10}`);
    } else {
      const frac = c.maxHp > 0 ? Math.max(0, Math.min(1, c.hp / c.maxHp)) : 0;
      this.ghost = stepGhost(this.ghost, frac, dtMs);
      const low = c.alive && frac <= LOW_LIFE;
      this.bar.setFill(low ? 'hud_s_fill_low' : 'hud_s_fill_life');
      this.bar.setCasing(low && Math.floor(this.elapsed / LOW_BEAT_MS) % 2 === 0 ? 'hud_s_bar_hero_low' : BARS.hero.casing);
      this.bar.set(frac, this.ghost.ghost, c.maxHp > 0 ? totalShield(c.effects) / c.maxHp : 0);
    }
    this.respawn.visible = reviving;

    // The effects on him: a row centred over the bar, only while there are any.
    const fx = fighting ? effectChips(c.effects) : { chips: [], more: 0 };
    const places = this.effects.show(fx.chips, fx.more, dtMs);
    this.effects.x = rowLeft(places);

    // His abilities, then his ultimate: one row at his feet, centred whether it holds two chips or three.
    const ult = fighting ? ultimateChip(c, bossEngaged) : null;
    const chips = fighting ? [...abilityChips(c), ...(ult === null ? [] : [ult])] : [];
    this.cooldowns.show(chips, 0, dtMs);
    this.cooldowns.x = rowLeft(chips.length);
  }
}
