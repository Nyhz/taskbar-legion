import { Assets, Container, Rectangle, Sprite, Texture } from 'pixi.js';
import type { StripEvent } from '@/sim/stripEvents';
import { clipMs, frameCell, type FigureMeta } from './figureData';
import { eventMeta } from './eventData';
import { eventSheetLoader } from './eventSheets';
import { merchantPlace, merchantStanding, runawayPlace, type EventClip } from './stripEventLook';
import { EVENT_HIT_PAD, MERCHANT_BEHIND_PARTY, MERCHANT_MIN_X } from './stripEventTiming';

// The strip events on screen (data/stripEvents): the runaway chest bolting right to left and the wandering merchant
// coming in behind the party. Read from the simulation's clock (world.stripEvents.active); where each stands and
// what it plays is render/stripEventLook (pure). It is the one object of its layer that takes the pointer: a tap on
// the chest catches it, a tap on the merchant opens his window (GameStrip wires both). A caught chest plays its
// burst where it was caught after the simulation has already let it go.

interface EventSheet {
  meta: FigureMeta;
  clips: Record<string, Texture[]>;
}

const SHADOW_COLOR = 0x0b0d17; // palette ink 0
const SHADOW_ALPHA = 0.4;
/** The displayed clock follows the simulation's (100 ms steps) smoothly, but snaps back when it is this far off. */
const RESYNC_MS = 250;

async function loadSheet(kind: string): Promise<EventSheet | null> {
  const meta = eventMeta(kind);
  const loader = eventSheetLoader(kind);
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
  return { meta, clips };
}

/** What the strip tells the events layer each frame. */
export interface StripEventFrame {
  active: StripEvent | undefined;
  /** The strip's width in art pixels. */
  width: number;
  groundY: number;
  /** Screen x of the rearmost hero as drawn, if any is on the field: the merchant stops behind him. */
  rearScreenX: number | undefined;
  /** The camera moved this frame: a merchant standing at his place walks to keep pace instead of sliding. */
  cameraMoving: boolean;
}

export class StripEventSprite extends Container {
  private readonly shadow = new Sprite(Texture.WHITE);
  private readonly sprite = new Sprite();
  private readonly sheets = new Map<string, EventSheet>();
  private shownN = -1; // the event on screen (its number), -1: none
  private shownKind: StripEvent['kind'] | null = null;
  private displayMs = 0;
  private clip: EventClip = 'idle';
  private clipAtMs = 0;
  private reaction: 'wave' | 'thanks' | 'caught' | null = null;
  private waved = false;
  private caughtX: number | null = null; // where a caught chest plays its burst (it is gone from the sim)
  private standX = 0;
  /** A tap on the chest / on the merchant (GameStrip sets them). */
  onRunawayTap: (() => boolean) | null = null;
  onMerchantTap: (() => void) | null = null;

  constructor() {
    super();
    this.shadow.tint = SHADOW_COLOR;
    this.shadow.height = 1;
    this.shadow.alpha = SHADOW_ALPHA;
    this.addChild(this.shadow, this.sprite);
    this.visible = false;
    this.eventMode = 'static';
    this.cursor = 'pointer';
    this.on('pointertap', () => this.tap());
    for (const kind of ['runaway', 'merchant'] as const) {
      void loadSheet(kind)
        .then((sheet) => {
          if (sheet !== null) this.sheets.set(kind, sheet);
        })
        .catch((err: unknown) => console.error(`[strip events] could not load the ${kind}`, err));
    }
  }

  /** The merchant has sold something: he dips his head. */
  thank(): void {
    if (this.shownKind === 'merchant') this.react('thanks');
  }

  private tap(): void {
    if (this.shownKind === 'runaway' && this.caughtX === null) {
      const x = this.x;
      if (this.onRunawayTap?.() === true) {
        this.caughtX = x;
        this.react('caught');
      }
    } else if (this.shownKind === 'merchant') {
      this.onMerchantTap?.();
    }
  }

  private react(what: 'wave' | 'thanks' | 'caught'): void {
    this.reaction = what;
    this.clip = what;
    this.clipAtMs = 0;
  }

  update(f: StripEventFrame, dtMs: number): void {
    const ev = f.active;
    // A new event (or none): start fresh — but a caught chest finishes its burst first.
    if (ev?.n !== this.shownN) {
      const bursting = this.caughtX !== null && this.reaction === 'caught';
      if (!bursting) {
        this.shownN = ev?.n ?? -1;
        this.shownKind = ev?.kind ?? null;
        this.displayMs = ev?.ms ?? 0;
        this.reaction = null;
        this.waved = false;
        this.caughtX = null;
        this.clipAtMs = 0;
      }
    } else if (ev !== undefined) {
      this.displayMs += dtMs;
      if (Math.abs(this.displayMs - ev.ms) > RESYNC_MS) this.displayMs = ev.ms;
    }
    const kind = this.shownKind;
    const sheet = kind === null ? undefined : this.sheets.get(kind);
    if (kind === null || sheet === undefined) {
      this.visible = false;
      return;
    }
    this.clipAtMs += dtMs;
    if (this.reaction !== null) {
      const anim = sheet.meta.anims[this.reaction];
      if (anim === undefined || this.clipAtMs >= clipMs(anim)) {
        if (this.reaction === 'caught') {
          // The burst is over: the chest is gone.
          this.caughtX = null;
          this.reaction = null;
          this.shownN = ev?.n ?? -1;
          this.shownKind = ev?.kind ?? null;
          this.visible = false;
          return;
        }
        this.reaction = null;
      }
    }

    let x: number;
    let facing: 1 | -1;
    let base: EventClip;
    let tappable: boolean;
    let lift = 0;
    if (kind === 'runaway') {
      const at = runawayPlace(this.displayMs, ev?.totalMs ?? 1, f.width, ev?.leaveAtMs);
      x = this.caughtX ?? at.x;
      facing = at.facing;
      base = at.clip;
      tappable = this.caughtX === null && (at.alpha ?? 1) > 0.5; // it can still be caught while it taunts
      lift = this.caughtX === null ? (at.lift ?? 0) : 0; // its hops
      this.alpha = this.caughtX === null ? (at.alpha ?? 1) : 1;
    } else {
      const total = ev?.totalMs ?? 1;
      if (f.rearScreenX !== undefined) this.standX = Math.max(MERCHANT_MIN_X, Math.round(f.rearScreenX - MERCHANT_BEHIND_PARTY));
      else if (this.standX === 0) this.standX = MERCHANT_MIN_X;
      const at = merchantPlace(this.displayMs, total, this.standX, ev?.leaveAtMs);
      x = at.x;
      facing = at.facing;
      const standing = merchantStanding(this.displayMs, total, ev?.leaveAtMs);
      base = standing && f.cameraMoving ? 'walk' : at.clip;
      tappable = standing;
      this.alpha = 1;
      if (standing && !this.waved) {
        this.waved = true;
        this.react('wave'); // he has arrived: a hand raised to whoever is looking
      }
    }
    if (this.reaction === null && base !== this.clip) {
      this.clip = base;
      this.clipAtMs = 0;
    }
    this.cursor = tappable ? 'pointer' : 'default';
    this.eventMode = tappable ? 'static' : 'none';
    this.draw(sheet, x, f.groundY, facing, lift);
  }

  private draw(sheet: EventSheet, x: number, groundY: number, facing: 1 | -1, lift = 0): void {
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
    const meta = sheet.meta;
    this.sprite.texture = texture;
    this.sprite.anchor.set(meta.root / meta.w, meta.ground / meta.h);
    this.sprite.scale.x = facing;
    this.x = Math.round(x);
    this.y = Math.round(groundY);
    this.sprite.y = -Math.round(lift); // a hop: the figure leaves the ground, its shadow stays
    // Its shadow: one row of ink on the path under its feet — narrower the higher it hops.
    const [bx0, , bx1] = meta.box;
    const width = Math.max(4, bx1 - bx0 - 4 - Math.round(lift));
    this.shadow.width = width;
    this.shadow.x = -Math.floor(width / 2) + (facing === 1 ? Math.round((bx0 + bx1) / 2) : -Math.round((bx0 + bx1) / 2));
    this.shadow.y = 0;
    // The tap area: the figure's standing box (mirrored with it), a little wider for the quick chest.
    const pad = this.shownKind === 'runaway' ? EVENT_HIT_PAD.runaway : EVENT_HIT_PAD.merchant;
    const left = facing === 1 ? meta.box[0] : -meta.box[2];
    const right = facing === 1 ? meta.box[2] : -meta.box[0];
    this.hitArea = new Rectangle(left - pad, meta.box[1] - pad - Math.round(lift), right - left + 2 * pad, meta.box[3] - meta.box[1] + 2 * pad + Math.round(lift));
    this.visible = true;
  }
}
