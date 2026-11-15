import { Assets, Container, Rectangle, Sprite, Texture } from 'pixi.js';
import type { CombatEvent } from '@/sim/world';
import { clipMs, frameCell, type FigureMeta } from './figureData';
import { petMeta } from './petData';
import { petSheetLoader } from './petSheets';
import { petBaseClip, petShadow, petStart, petStep, petStyle, type PetClip, type PetReaction, type PetState, type PetStyle } from './petMotion';

// The pet chosen to go with the party, drawn in the strip. Cosmetic only: nothing here touches the simulation.
// Where and how it moves is render/petMotion (pure); this loads its atlas, plays its clips, lays its shadow and
// puts it on screen. A pet with no figure, or no pet chosen, draws nothing.

interface PetSheet {
  key: string;
  meta: FigureMeta;
  clips: Record<string, Texture[]>;
}

/** What the strip tells the companion each frame. */
export interface PetFrame {
  /** The chosen companion (data/pets key), or null. */
  petKey: string | null;
  /** World x of the rearmost hero, as drawn; undefined when there is no party on the field. */
  rearX: number | undefined;
  toScreen: (wx: number) => number;
  groundY: number;
  /** The party lies fallen / is gone from the field (the defeat's beats). */
  fallen: boolean;
  hidden: boolean;
  /** Ids of the bosses alive on the field, and this frame's events: a boss's death makes it cheer. */
  bossIds: readonly string[];
  events: readonly CombatEvent[];
  /** Chests in storage, all kinds: one more than last frame is a chest that just dropped. */
  chestCount: number;
  /** The party's levels added up: one more than last frame is a hero who just gained a level. Leave it out
   *  (undefined) and the companion has no level-up gesture. */
  levelSum?: number;
}

/** Which reaction wins when two want the same moment: the rarer, the higher. */
const REACTION_RANK: Record<PetReaction, number> = { cheer: 3, spot: 2, ding: 1 };
const SHADOW_COLOR = 0x0b0d17; // palette ink 0
const SHADOW_ALPHA = 0.42;

async function loadSheet(key: string): Promise<PetSheet | null> {
  const meta = petMeta(key);
  const loader = petSheetLoader(key);
  if (meta === undefined || loader === undefined) return null;
  const atlas = await Assets.load<Texture>(await loader());
  atlas.source.scaleMode = 'nearest';
  const clips: Record<string, Texture[]> = {};
  for (const [name, anim] of Object.entries(meta.anims)) {
    const frames: Texture[] = [];
    for (let i = 0; i < anim.n; i++) {
      const [col, row] = frameCell(meta, anim, i);
      frames.push(new Texture({ source: atlas.source, frame: new Rectangle(col * meta.w, row * meta.h, meta.w, meta.h) }));
    }
    clips[name] = frames;
  }
  return { key, meta, clips };
}

export class PetCompanion extends Container {
  private readonly shadow = new Container();
  private readonly shadowWide = new Sprite(Texture.WHITE);
  private readonly shadowCore = new Sprite(Texture.WHITE);
  private readonly sprite = new Sprite();
  private sheet: PetSheet | null = null;
  private style: PetStyle = petStyle('');
  private wanted: string | null = null; // the pet whose sheet is loaded or loading
  private state: PetState | null = null;
  private clip: PetClip = 'idle';
  private clipAtMs = 0;
  private reaction: PetReaction | null = null;
  private queued: PetReaction | null = null;
  private fidgeting = false;
  private restMs = 0; // how long it has been at rest since it last fidgeted
  private bosses = new Set<string>();
  private chests = -1;
  private levels = -1;
  private flyIn = true; // a companion just chosen (or just loaded) comes in from behind; one back from a defeat is simply there

  constructor() {
    super();
    // The shadow: two rows of ink on the path, the lower one shorter — under the figure, never over it.
    for (const row of [this.shadowWide, this.shadowCore]) {
      row.tint = SHADOW_COLOR;
      row.height = 1;
      this.shadow.addChild(row);
    }
    this.addChild(this.shadow, this.sprite);
    this.visible = false;
    this.eventMode = 'none';
  }

  private want(key: string | null): void {
    if (key === this.wanted) return;
    this.wanted = key;
    this.sheet = null;
    this.state = null;
    this.reaction = null;
    this.queued = null;
    this.fidgeting = false;
    this.restMs = 0;
    this.flyIn = true;
    if (key === null) return;
    this.style = petStyle(key);
    void loadSheet(key)
      .then((sheet) => {
        if (this.wanted === key) this.sheet = sheet; // null: this pet has no figure yet — nothing is drawn
      })
      .catch((err: unknown) => console.error(`[pet] could not load the companion ${key}`, err));
  }

  private react(what: PetReaction, sheet: PetSheet): void {
    if (sheet.meta.anims[what] === undefined) return; // a pet without that gesture simply does not make it
    this.fidgeting = false;
    if (this.reaction === null) {
      this.reaction = what;
      this.play(what, true);
    } else if (this.reaction !== what && (this.queued === null || REACTION_RANK[what] > REACTION_RANK[this.queued])) {
      this.queued = what; // one may wait its turn; a second of the same is dropped
    }
  }

  private play(clip: PetClip, restart = false): void {
    if (clip === this.clip && !restart) return;
    this.clip = clip;
    this.clipAtMs = 0;
  }

  update(f: PetFrame, dtMs: number): void {
    this.want(f.petKey);
    // What happened this frame is noted even while nothing is drawn, so a reaction never fires late.
    const bossFell = f.events.some((ev) => ev.type === 'death' && this.bosses.has(ev.targetId));
    this.bosses = new Set(f.bossIds);
    const chestDropped = this.chests >= 0 && f.chestCount > this.chests;
    this.chests = f.chestCount;
    const levelled = f.levelSum !== undefined && this.levels >= 0 && f.levelSum > this.levels;
    this.levels = f.levelSum ?? -1;

    const sheet = this.sheet;
    if (sheet === null || f.rearX === undefined || f.hidden) {
      this.visible = false;
      if (f.hidden) {
        this.state = null; // back from the black it is simply there, behind the party
        this.flyIn = false;
      }
      return;
    }
    const style = this.style;
    // The strip's left edge in the heroes' space (toScreen is linear): the companion keeps inside it.
    const zoom = f.toScreen(1) - f.toScreen(0);
    const scene = { rearX: f.rearX, fallen: f.fallen, leftX: zoom > 0 ? -f.toScreen(0) / zoom : undefined, hold: this.reaction !== null };
    this.state = this.state === null ? petStart(scene, style, this.flyIn) : petStep(this.state, scene, dtMs, style);
    this.flyIn = false;
    const s = this.state;

    if (s.mode === 'mourn') {
      this.reaction = null;
      this.queued = null;
      this.fidgeting = false;
    } else {
      if (bossFell) this.react('cheer', sheet);
      if (chestDropped) this.react('spot', sheet);
      if (levelled) this.react('ding', sheet);
    }
    this.clipAtMs += dtMs;
    if (this.reaction !== null) {
      const anim = sheet.meta.anims[this.reaction];
      if (anim === undefined || this.clipAtMs >= clipMs(anim)) {
        this.reaction = this.queued;
        this.queued = null;
        if (this.reaction !== null) this.play(this.reaction, true);
      }
    }
    if (this.reaction === null) this.rest(sheet, petBaseClip(s, style), dtMs);
    this.draw(sheet, f, s);
  }

  /** Nothing has made it react: its own clip — and, at rest, the thing it does now and then (`fidget`). */
  private rest(sheet: PetSheet, base: PetClip, dtMs: number): void {
    const fidget = sheet.meta.anims.fidget;
    const atRest = base === 'idle' || base === 'perch';
    if (!atRest || fidget === undefined || this.style.fidgetEveryMs <= 0) {
      this.fidgeting = false;
      this.restMs = 0;
    } else if (this.fidgeting) {
      if (this.clipAtMs >= clipMs(fidget)) this.fidgeting = false;
    } else {
      this.restMs += dtMs;
      if (this.restMs >= this.style.fidgetEveryMs) {
        this.restMs = 0;
        this.fidgeting = true;
        this.play('fidget', true);
      }
    }
    if (!this.fidgeting) this.play(sheet.meta.anims[base] === undefined ? 'idle' : base);
  }

  private draw(sheet: PetSheet, f: PetFrame, s: PetState): void {
    const anim = sheet.meta.anims[this.clip];
    const frames = sheet.clips[this.clip];
    if (anim === undefined || frames === undefined) {
      this.visible = false;
      return;
    }
    const total = clipMs(anim);
    let at = anim.loop ? this.clipAtMs % total : Math.min(this.clipAtMs, total - 1);
    let i = 0;
    while (i < anim.n - 1 && at >= (anim.ms[i] ?? 0)) {
      at -= anim.ms[i] ?? 0;
      i += 1;
    }
    const texture = frames[i];
    if (texture === undefined) return;
    this.sprite.texture = texture;
    this.sprite.anchor.set(sheet.meta.root / sheet.meta.w, sheet.meta.ground / sheet.meta.h);
    this.sprite.scale.x = s.facing;
    const alt = Math.round(s.alt);
    this.x = Math.round(f.toScreen(s.x));
    this.y = Math.round(f.groundY) - alt;
    // Its shadow lies on the path whatever its height: whole pixels, narrower and fainter the higher it is.
    const shade = petShadow(s, this.style);
    this.shadow.visible = shade.alpha > 0.02;
    this.shadow.alpha = SHADOW_ALPHA * shade.alpha;
    this.shadow.y = alt;
    this.shadowWide.width = shade.width;
    this.shadowWide.x = -Math.floor(shade.width / 2);
    this.shadowWide.y = 0;
    this.shadowCore.width = Math.max(1, shade.width - 4);
    this.shadowCore.x = this.shadowWide.x + 2;
    this.shadowCore.y = 1;
    this.visible = true;
  }
}
