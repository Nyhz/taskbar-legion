import type { Combatant, CombatEvent } from '@/sim/world';
import type { FxShots } from './BodyFx';
import { hexToNum } from '@/styles/palette';
import { tryAbilityDef } from '@/data/abilities';
import { effectDef } from '@/data/effects';
import { GROUND_FIRE_FX, LEECH_FX, LEECH_GAP_MS, KIT_CASTS, KIT_HITS, KIT_TICKS, MIRROR_CUE, castCue, cueVictim, deadeyeShot } from './bossFx';
import { CueLayer } from './CueLayer';
import type { Delayed } from './delayed';
import type { EnemySprite } from './EnemySprite';
import { FOE_ARC_HEIGHT, shotGoesOver } from './enemyFx';
import type { HeroSprite } from './HeroSprite';
import { lookFlightMs, type ProjectileLayer } from './Projectiles';

// The BOSS KIT played on the strip (render/bossFx says what; data/bossKit.ts is the kit): the cue a boss shows
// while it winds a mechanic up, what a mechanic's cast plays on the boss, and the hits of the kit's abilities that
// are not the boss's swing — the bolt that falls and leaps from hero to hero, the Deadeye shot in each boss's own
// form — and the blood a Vampiric boss draws. The strip (GameStrip) hands it the events; it reads nothing else.

export interface BossKitLayers {
  ground: FxShots; // one-shots under the fighters
  air: FxShots; // one-shots over them
  projectiles: ProjectileLayer;
  delayed: Delayed;
  heroes: () => ReadonlyMap<string, HeroSprite>;
  enemies: () => ReadonlyMap<string, EnemySprite>;
  /** Raise the sign of the ability `abilityKey` at a point of the strip (the one a hero's cast shows). */
  sign: (x: number, y: number, abilityKey: string) => void;
}

/** How high on a hero a bolt's spark and a shot land (art pixels over the ground line). */
const HERO_MID = 20;

export class BossKitFx {
  /** Cues on the ground under the fighters, and cues over them. */
  readonly cuesGround = new CueLayer();
  readonly cuesAir = new CueLayer();
  private chain: { from: HeroSprite; atMs: number } | null = null; // the bolt's last hero in this batch of events
  private sinceLeech = new Map<string, number>();

  constructor(private readonly on: BossKitLayers) {}

  update(dtMs: number): void {
    this.cuesGround.update(dtMs);
    this.cuesAir.update(dtMs);
    for (const [id, ms] of this.sinceLeech) this.sinceLeech.set(id, ms + dtMs);
  }

  /** A new batch of events begins: a bolt's chain never runs from one batch into the next. */
  beginEvents(): void {
    this.chain = null;
  }

  /** Called every frame for an enemy that is winding an ability up: its cue (besides the cast bar). */
  showCastCue(c: Combatant, sprite: EnemySprite, heroes: readonly Combatant[], groundY: number): void {
    const cue = castCue(c.casting?.key);
    if (cue === undefined || !c.alive) return;
    if (cue.on === 'caster') {
      this.cuesAir.show(`${c.id}/cue`, cue.fx, sprite.feetPoint().x, groundY, -1);
    } else if (cue.on === 'victim') {
      const victim = cueVictim(heroes);
      const hero = victim === undefined ? undefined : this.on.heroes().get(victim.id);
      if (hero !== undefined) this.cuesGround.show(`${c.id}/cue`, cue.fx, hero.x + hero.bodyCx, groundY);
    } else {
      const layer = cue.under === true ? this.cuesGround : this.cuesAir;
      for (const [id, hero] of this.on.heroes()) {
        if (hero.visible && hero.standing) layer.show(`${c.id}/cue/${id}`, cue.fx, hero.x + hero.bodyCx, groundY - (cue.up ?? 0));
      }
    }
  }

  /** Called every frame for a living boss: what its mechanic has left on the ground under the party (Hoja al
   *  rojo: fire under every hero for as long as the simulation says the ground burns). */
  showLasting(c: Combatant, groundY: number): void {
    if (!c.alive || c.groundFire === undefined) return;
    for (const [id, hero] of this.on.heroes()) {
      if (hero.visible && hero.standing) this.cuesGround.show(`${c.id}/fire/${id}`, GROUND_FIRE_FX, hero.x + hero.bodyCx, groundY);
    }
  }

  /** A cue of the kit's (sim: Espejos naming the ability it reflects). True when it was one. */
  cue(ev: CombatEvent, boss: EnemySprite): boolean {
    if (ev.cue !== MIRROR_CUE.cue || ev.abilityKey === undefined) return false;
    const at = boss.feetPoint();
    this.on.sign(at.x, boss.y - Math.round(boss.bodyHeight * 0.75), ev.abilityKey);
    // What that ability gives its allies, the boss keeps: light flying into it.
    const def = tryAbilityDef(ev.abilityKey);
    if (def?.applies.some((a) => effectDef(a.effectKey).beneficial && effectDef(a.effectKey).kind.type !== 'cleanse') === true) boss.burstAt(MIRROR_CUE.boon, 0);
    return true;
  }

  /** An enemy's cast went off. True when it is one of the kit's (it shows in its own way: no generic ring). */
  cast(abilityKey: string, caster: EnemySprite, groundY: number): boolean {
    const look = KIT_CASTS[abilityKey];
    if (look === undefined) return false;
    if (look.fx !== undefined) caster.burstAt(look.fx, look.up ?? 0.5);
    if (look.party !== undefined) {
      for (const hero of this.on.heroes().values()) if (hero.visible && hero.standing) this.on.ground.play(look.party, hero.x + hero.bodyCx, groundY);
    }
    return true;
  }

  /**
   * A hit of one of the kit's abilities lands on `hero`: plays it and returns how long its number should wait
   * (ms) — or null when the ability is not one the kit shows itself (the boss's swing plays as usual).
   * `frontX`: the strip x of the party's front hero.
   */
  hit(ev: CombatEvent, hero: HeroSprite, groundY: number, frontX: number): number | null {
    const look = ev.abilityKey === undefined ? undefined : KIT_HITS[ev.abilityKey];
    if (look === undefined) return null;
    const { air, projectiles, delayed } = this.on;
    const mid = (h: HeroSprite): { x: number; y: number } => ({ x: h.x + h.bodyCx, y: groundY - HERO_MID });
    if (look.kind === 'bolt') {
      if (ev.splash !== true || this.chain === null) {
        // It falls out of the sky on the hero it picked.
        air.play(look.strike, hero.x + hero.bodyCx, groundY);
        this.chain = { from: hero, atMs: look.strikeMs };
        return look.strikeMs;
      }
      // …and leaps to the next one: from the hero it has just left, when it has landed there.
      const { from, atMs } = this.chain;
      const a = mid(from);
      const b = mid(hero);
      const flight = lookFlightMs(a.x, a.y, b.x, b.y);
      delayed.add(atMs, () => {
        if (from.parent === null || hero.parent === null) return;
        const start = mid(from);
        projectiles.spawnLook(start.x, start.y, () => mid(hero), look.jump, 0, (x, y) => air.play(look.land, x, y), { straight: true, facing: b.x < a.x ? -1 : 1 });
      });
      this.chain = { from: hero, atMs: atMs + flight };
      return atMs + flight;
    }
    if (look.kind === 'burst') {
      hero.bodyFx.burst(look.fx, 'over', 0, -HERO_MID);
      return look.waitMs;
    }
    const boss = ev.sourceId === undefined ? undefined : this.on.enemies().get(ev.sourceId);
    if (look.kind === 'shot') {
      // Something the boss sends straight at each hero it hits (the shards of what Espejos reflects).
      if (boss === undefined) return 0;
      const from = boss.shotPoint();
      const to = mid(hero);
      projectiles.spawnLook(from.x, from.y, () => mid(hero), look.shot, 0, (x, y) => air.play(look.land, x, y), { facing: -1, straight: true });
      return lookFlightMs(from.x, from.y, to.x, to.y);
    }
    // Deadeye: the sight closes on the hero, and the boss sends its own thing at him — level at the front hero,
    // lofted over him at anyone standing behind.
    hero.bodyFx.burst(look.mark, 'over', 0, -HERO_MID);
    if (boss === undefined) return 0;
    const from = boss.shotPoint();
    const to = mid(hero);
    const over = shotGoesOver(hero.x, frontX);
    const arc = over ? FOE_ARC_HEIGHT : 0;
    projectiles.spawnLook(from.x, from.y, () => mid(hero), deadeyeShot(boss.figureKey), arc, (x, y) => air.play(look.land, x, y), { facing: -1, straight: true });
    return lookFlightMs(from.x, from.y, to.x, to.y, arc);
  }

  /** A periodic number of one of the kit's mechanics on a hero (Culpa's toll): plays its one-shot on him and
   *  returns the number's colour — or null when the tick is not the kit's (a poison, a bleed). */
  tick(ev: CombatEvent, hero: HeroSprite): number | null {
    const look = ev.abilityKey === undefined ? undefined : KIT_TICKS[ev.abilityKey];
    if (look === undefined) return null;
    if (look.fx !== undefined) hero.bodyFx.burst(look.fx, 'over', 0, -HERO_MID);
    return hexToNum(look.color);
  }

  /** A boss healed itself off a hit (Vampiric): blood drawn up into it — not on every swing of a fast one. */
  leech(boss: EnemySprite, id: string): void {
    if ((this.sinceLeech.get(id) ?? Number.POSITIVE_INFINITY) < LEECH_GAP_MS) return;
    this.sinceLeech.set(id, 0);
    boss.burstAt(LEECH_FX, 0);
  }
}
