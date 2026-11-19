import { clipMs, figureMeta, worldBossFigureKey, type FigureMeta } from '@/game/render/figureData';
import { fxMeta, fxTotalMs } from '@/game/render/fxData';
import { arrivalBody, departBody } from '@/game/render/arrival';
import { STRIP_PATH_Y } from '@/game/render/stripBackdropData';

// The title's REEL (user, 2026-11-19): the party fights each world's boss in turn, a few seconds a world, from the
// first to the tenth and round again — no life bars, no damage, nothing of the simulation: a scene. The party never
// stops fighting; between two worlds the boss leaves in the arrival column, the backdrop wipes to the next world and
// its boss comes down in another column ("A · combate continuo"; the lab's prototype is tools/assets/pipeline/
// title_reel.html). Pure and deterministic (its own dice); render/drawReel paints it, TitleReel runs it.

export const REEL = {
  worlds: 10,
  /** How long the party fights each boss. */
  fightMs: 3000,
  /** After the boss starts leaving: when the backdrop starts to wipe, and how long the wipe takes. */
  wipeAtMs: 260,
  wipeMs: 520,
  /** After the swap (the next world on screen): when its boss's column comes down. */
  arriveDelayMs: 60,
} as const;

export const HERO_KEYS = ['priest', 'ranger', 'knight'] as const;
export type HeroKey = (typeof HERO_KEYS)[number];
/** Where each hero stands (its root on the path), in art pixels. */
export const HERO_X: Readonly<Record<HeroKey, number>> = { priest: 196, ranger: 248, knight: 300 };

/** What each hero does while a boss stands before them, in turn, with a pause between two moves. */
const PLAN: Readonly<Record<HeroKey, { moves: readonly string[]; gap: readonly [number, number] }>> = {
  knight: { moves: ['attack', 'attack2', 'cleave', 'attack3'], gap: [220, 520] },
  ranger: { moves: ['attack', 'quick', 'attack', 'volley', 'attack', 'aimed'], gap: [160, 420] },
  priest: { moves: ['attack', 'cast', 'attack2', 'mend', 'attack'], gap: [260, 620] },
};
/** The share of a move's frames after which its blow lands (or its shot leaves). */
const HIT_AT = 0.55;

export interface Actor {
  key: string;
  meta: FigureMeta;
  x: number;
  /** 1 faces right (the heroes), −1 is mirrored (a boss, facing the party). */
  facing: 1 | -1;
  anim: string;
  t: number;
  loop: boolean;
  onHit: (() => void) | null;
  hitDone: boolean;
  /** A hit's white flash still to show (ms), and the arrival/departure look. */
  flash: number;
  alpha: number;
  white: number;
}
export interface Hero extends Actor {
  step: number;
  wait: number;
}
export interface Boss extends Actor {
  world: number;
  nextAttack: number;
}
export interface FxRun {
  key: string;
  x: number;
  y: number;
  t: number;
  /** Drawn in front of the fighters (or behind them). */
  front: boolean;
}
export interface Shot {
  key: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  speed: number;
  land: () => void;
  done: boolean;
}

export interface Reel {
  seed: number;
  /** The world on screen, 0–9. */
  world: number;
  phase: 'fight' | 'move';
  fightT: number;
  clock: number;
  heroes: Record<HeroKey, Hero>;
  boss: Boss | null;
  leaving: { actor: Actor; at: number } | null;
  arriving: { actor: Actor; at: number } | null;
  fx: FxRun[];
  shots: Shot[];
  timers: { at: number; run: () => void }[];
  /** The backdrop wiping from one world to the next (progress 0–1). */
  wipe: { from: number; to: number; p: number } | null;
}

/** The figure key of world `w`'s boss (0–9). */
export function bossKeyOf(w: number): string | undefined {
  return worldBossFigureKey(w + 1);
}

function actor(key: string, x: number, facing: 1 | -1): Actor | undefined {
  const meta = figureMeta(key);
  if (meta === undefined) return undefined;
  return { key, meta, x, facing, anim: 'idle', t: 0, loop: true, onHit: null, hitDone: false, flash: 0, alpha: 1, white: 0 };
}

function rnd(r: Reel): number {
  r.seed = (Math.imul(r.seed, 1664525) + 1013904223) >>> 0;
  return r.seed / 4294967296;
}
const between = (r: Reel, [a, b]: readonly [number, number]): number => a + (b - a) * rnd(r);

export function play(a: Actor, anim: string, onHit: (() => void) | null = null): void {
  if (a.meta.anims[anim] === undefined) return;
  a.anim = anim;
  a.t = 0;
  a.loop = anim === 'idle';
  a.onHit = onHit;
  a.hitDone = false;
}

/** The frame an actor shows now. */
export function frameOf(a: Actor): number {
  const anim = a.meta.anims[a.anim];
  if (anim === undefined) return 0;
  const total = clipMs(anim);
  let t = a.loop && total > 0 ? a.t % total : Math.min(a.t, Math.max(0, total - 1));
  for (let i = 0; i < anim.n; i++) {
    t -= anim.ms[i] ?? 0;
    if (t < 0) return i;
  }
  return anim.n - 1;
}

const busy = (a: Actor): boolean => !a.loop && a.t < clipMs(a.meta.anims[a.anim] ?? { row: 0, n: 0, ms: [], loop: false });

function advance(a: Actor, dt: number): void {
  a.t += dt;
  a.flash = Math.max(0, a.flash - dt);
  const anim = a.meta.anims[a.anim];
  if (anim === undefined) return;
  if (a.onHit !== null && !a.hitDone && frameOf(a) >= Math.floor(anim.n * HIT_AT)) {
    a.hitDone = true;
    a.onHit();
  }
  if (!a.loop && a.t >= clipMs(anim)) play(a, 'idle');
}

/** A new reel on world 1, the party standing; its boss comes down as soon as its art is ready. */
export function createReel(seed = 7): Reel {
  const heroes = {} as Record<HeroKey, Hero>;
  for (const key of HERO_KEYS) {
    const a = actor(key, HERO_X[key], 1);
    if (a === undefined) throw new Error(`No figure for the hero ${key}`);
    heroes[key] = { ...a, step: 0, wait: 0 };
  }
  const r: Reel = { seed, world: 0, phase: 'move', fightT: 0, clock: 0, heroes, boss: null, leaving: null, arriving: null, fx: [], shots: [], timers: [], wipe: null };
  for (const key of HERO_KEYS) r.heroes[key].wait = between(r, [0, 600]);
  return r;
}

/** Where a boss of `meta` stands: its front edge a little clear of the Knight's (render/figureData BOSS_FRONT_GAP). */
export function bossX(meta: FigureMeta, knight: FigureMeta): number {
  const height = Math.max(0, -meta.box[1]);
  const gap = Math.max(6, Math.min(16, Math.round(height * 0.1)));
  return HERO_X.knight + knight.box[2] + gap + meta.box[2];
}
const bossFront = (b: Boss): number => b.x - b.meta.box[2];

function fx(r: Reel, key: string, x: number, y: number, front = true, delay = 0): void {
  if (fxMeta(key) === undefined) return;
  r.fx.push({ key, x, y, t: -delay, front });
}
function column(r: Reel, x: number, delay = 0): void {
  fx(r, 'arrive_a_back', x, STRIP_PATH_Y, false, delay);
  fx(r, 'arrive_a_front', x, STRIP_PATH_Y, true, delay);
}

function spawnBoss(r: Reel, w: number): void {
  const key = bossKeyOf(w);
  const knight = r.heroes.knight.meta;
  const a = key === undefined ? undefined : actor(key, 0, -1);
  if (a === undefined) return;
  a.x = bossX(a.meta, knight);
  a.alpha = 0;
  r.boss = { ...a, world: w, nextAttack: between(r, [900, 1600]) };
  r.arriving = { actor: r.boss, at: r.clock + REEL.arriveDelayMs };
  column(r, a.x, REEL.arriveDelayMs);
}

const fighting = (r: Reel): boolean => r.phase === 'fight' && r.boss !== null && r.boss.alpha > 0 && r.boss.white < 0.5;

function hitBoss(r: Reel, key: string, x: number, y: number): void {
  if (r.boss === null || r.boss.alpha <= 0) return;
  fx(r, key, x, y);
  r.boss.flash = 90;
}
function aim(r: Reel, b: Boss): [number, number] {
  return [bossFront(b) + 18 + between(r, [-4, 10]), STRIP_PATH_Y - between(r, [28, 52])];
}

function act(r: Reel, key: HeroKey, h: Hero, b: Boss): void {
  const plan = PLAN[key];
  const move = plan.moves[h.step++ % plan.moves.length] ?? 'attack';
  if (key === 'knight') {
    play(h, move, () => {
      if (move === 'cleave') fx(r, 'cleave_wave', h.x + 4, STRIP_PATH_Y - 6);
      hitBoss(r, 'foe_hit', bossFront(b) + 6, STRIP_PATH_Y - between(r, [22, 40]));
    });
  } else if (key === 'ranger') {
    const heavy = move === 'aimed';
    const n = move === 'volley' ? 3 : 1;
    play(h, move, () => {
      for (let i = 0; i < n; i++) {
        const [tx, ty] = aim(r, b);
        const shot = (): void => {
          r.shots.push({ key: heavy ? 'arrow_heavy' : 'arrow', x: h.x + 14, y: STRIP_PATH_Y - 24, tx, ty, speed: heavy ? 0.7 : 0.5, land: () => hitBoss(r, 'arrow_hit', tx, ty), done: false });
        };
        if (i === 0) shot();
        else r.timers.push({ at: r.clock + i * 90, run: shot });
      }
    });
  } else if (move === 'mend') {
    play(h, move, () => fx(r, 'heal_bloom', r.heroes.knight.x, STRIP_PATH_Y - 2));
  } else {
    play(h, move, () => {
      const [tx, ty] = aim(r, b);
      r.shots.push({ key: 'light_bolt', x: h.x + 16, y: STRIP_PATH_Y - 26, tx, ty, speed: 0.42, land: () => hitBoss(r, move === 'cast' ? 'nova_hit' : 'light_hit', tx, ty), done: false });
    });
  }
}

/** Leave this world for the next: the boss goes up in the column, the backdrop wipes, the next boss comes down. */
function moveOn(r: Reel, next: number): void {
  r.phase = 'move';
  if (r.boss !== null) {
    r.leaving = { actor: r.boss, at: r.clock };
    column(r, r.boss.x);
  }
  r.timers.push({ at: r.clock + REEL.wipeAtMs, run: () => (r.wipe = { from: r.world, to: next, p: 0 }) });
  r.timers.push({
    at: r.clock + REEL.wipeAtMs + REEL.wipeMs,
    run: () => {
      r.world = next;
      r.wipe = null;
      r.leaving = null;
      r.boss = null;
      spawnBoss(r, next);
      r.phase = 'fight';
      r.fightT = 0;
    },
  });
}

/** One step of `dt` ms. `ready(w)` says whether world w's art (backdrop and boss) has loaded: the reel waits for it
 *  before showing that world, fighting on in the one it is in. */
export function stepReel(r: Reel, dt: number, ready: (w: number) => boolean): void {
  r.clock += dt;
  const due = r.timers.filter((t) => t.at <= r.clock);
  r.timers = r.timers.filter((t) => t.at > r.clock);
  for (const t of due) t.run();

  if (r.boss === null && r.leaving === null && r.phase === 'move' && r.timers.length === 0 && ready(r.world)) {
    spawnBoss(r, r.world); // the first boss, once its art is in
    r.phase = 'fight';
    r.fightT = 0;
  }
  if (r.leaving !== null) {
    const look = departBody(r.clock - r.leaving.at);
    r.leaving.actor.alpha = look.alpha;
    r.leaving.actor.white = look.white;
  }
  if (r.arriving !== null) {
    const look = arrivalBody('A', r.clock - r.arriving.at);
    r.arriving.actor.alpha = look.alpha;
    r.arriving.actor.white = look.white;
    if (look.done) r.arriving = null;
  }

  const b = r.boss;
  for (const key of HERO_KEYS) {
    const h = r.heroes[key];
    advance(h, dt);
    if (b !== null && fighting(r) && !busy(h)) {
      h.wait -= dt;
      if (h.wait <= 0) {
        act(r, key, h, b);
        h.wait = between(r, PLAN[key].gap);
      }
    }
  }
  if (b !== null) {
    advance(b, dt);
    if (fighting(r)) {
      b.nextAttack -= dt;
      if (b.nextAttack <= 0 && !busy(b)) {
        play(b, 'attack', () => {
          play(r.heroes.knight, 'block');
          fx(r, 'block_spark', HERO_X.knight + r.heroes.knight.meta.box[2] + 2, STRIP_PATH_Y - 26);
        });
        b.nextAttack = between(r, [1800, 2600]);
      }
    }
  }

  for (const s of r.shots) {
    const dx = s.tx - s.x;
    const dy = s.ty - s.y;
    const d = Math.hypot(dx, dy);
    const stepPx = s.speed * dt;
    if (d <= stepPx) {
      s.done = true;
      s.land();
    } else {
      s.x += (dx / d) * stepPx;
      s.y += (dy / d) * stepPx;
    }
  }
  r.shots = r.shots.filter((s) => !s.done);
  for (const e of r.fx) e.t += dt;
  r.fx = r.fx.filter((e) => {
    const m = fxMeta(e.key);
    return m !== undefined && e.t < fxTotalMs(m);
  });
  if (r.wipe !== null) r.wipe.p = Math.min(1, r.wipe.p + dt / REEL.wipeMs);

  if (r.phase === 'fight') {
    r.fightT += dt;
    const next = (r.world + 1) % REEL.worlds;
    if (r.fightT >= REEL.fightMs && ready(next)) moveOn(r, next);
  }
}
