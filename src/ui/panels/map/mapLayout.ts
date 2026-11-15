import {
  STAGES_PER_WORLD,
  WORLDS_PER_DIFFICULTY,
  difficultyIndexOf,
  globalStageOf,
} from '@/data/difficulties';
import { WINDOW_FRAME_ART, WINDOW_SHADOW_ART, WING_ART_WIDTH } from '../panelLayout';

// The map wing: what it shows of the journey, and its box. Pure (no React, no store): unit-tested.
//
// A global stage G = difficulty·100 + (world−1)·10 + stage. `maxCleared` is the highest beaten boss; the FRONTIER
// (stageScaling.resumeStageFor) is where progression continues. A stage is REACHED when G ≤ frontier — every
// reached stage 1–9 is a travel target; stage 10 is the world boss, entered with a key once stage 9 is beaten.

/** One of the ten marks under a world: its nine stages and, last, its boss. */
export type Pip = 'todo' | 'done' | 'here' | 'boss-todo' | 'boss-wall' | 'boss-done';

export interface WorldView {
  /** 1–10 within the difficulty (what the player reads). */
  local: number;
  /** First global stage of the world (its stage 1). */
  first: number;
  /** The party has got this far: its first stage is at or behind the frontier. */
  reached: boolean;
  /** Its boss has fallen. */
  cleared: boolean;
  /** The party is in it right now. */
  here: boolean;
  pips: Pip[];
}

/** The ten worlds of difficulty `diff` (0–4) as the map draws them. */
export function worldsOf(diff: number, frontier: number, maxCleared: number, current: number): WorldView[] {
  return Array.from({ length: WORLDS_PER_DIFFICULTY }, (_, i) => {
    const local = i + 1;
    const first = globalStageOf(diff, local, 1);
    const boss = first + STAGES_PER_WORLD - 1;
    const pips: Pip[] = Array.from({ length: STAGES_PER_WORLD }, (__, s) => {
      const g = first + s;
      if (g === boss)
        return g <= maxCleared ? 'boss-done' : maxCleared >= boss - 1 ? 'boss-wall' : 'boss-todo';
      if (g === current) return 'here';
      return g <= maxCleared ? 'done' : 'todo';
    });
    return {
      local,
      first,
      reached: first <= frontier,
      cleared: boss <= maxCleared,
      here: current >= first && current <= boss,
      pips,
    };
  });
}

/** The world the map opens on in difficulty `diff`: where the party is if it is in this difficulty, else the
 *  frontier's world if that is here, else the last one (a finished difficulty). */
export function defaultWorld(diff: number, current: number, frontier: number): number {
  const localOf = (g: number): number =>
    Math.floor(((g - 1) % (WORLDS_PER_DIFFICULTY * STAGES_PER_WORLD)) / STAGES_PER_WORLD) + 1;
  if (difficultyIndexOf(current) === diff) return localOf(current);
  if (difficultyIndexOf(frontier) === diff) return localOf(frontier);
  return difficultyIndexOf(frontier) > diff ? WORLDS_PER_DIFFICULTY : 1;
}

/** A travel stage (1–9): where the party stands, the frontier, another reached stage, or one still ahead. */
export type StageState = 'here' | 'frontier' | 'open' | 'locked';

export function stageStateOf(g: number, frontier: number, current: number): StageState {
  if (g === current) return 'here';
  if (g === frontier) return 'frontier';
  return g <= frontier ? 'open' : 'locked';
}

/** The stage the strip's "go forward" arrow leads to from `current`, or null when there is none: the next stage,
 *  when it is a travel stage (1–9 — the world boss is entered through its portal, with a key, never by walking
 *  on) that the party has already reached. Shown after a defeat dropped the party a stage, or after travelling
 *  back to farm. The same rule the stage keys of this map use (stageStateOf: not `locked`). */
export function nextOpenStage(current: number, frontier: number): number | null {
  const next = current + 1;
  if (next % STAGES_PER_WORLD === 0) return null; // stage 10 of its world: the boss
  return stageStateOf(next, frontier, current) === 'locked' ? null : next;
}

/** The world boss's door: shut until stage 9 falls, then it needs a key, then it can be entered (again and
 *  again, a key each time — also after the boss has fallen). */
export type GateState = 'closed' | 'needKey' | 'open';

export function bossGateOf(firstStage: number, maxCleared: number, keysHeld: number): GateState {
  if (maxCleared < firstStage + STAGES_PER_WORLD - 2) return 'closed';
  return keysHeld > 0 ? 'open' : 'needKey';
}

// ── The window's box, in art pixels (map.css keeps these measures) ──
export const WORLD_COLS = 3;
export const WORLD_ROWS = Math.ceil(WORLDS_PER_DIFFICULTY / WORLD_COLS); // 4: the last world sits alone
export const TILE_ART = { width: 50, height: 28 };
const HEAD = 22; // title + the frontier key (the kit's head row)
const DIFFS = 20; // the five difficulty signs
const WORLDS_TOP = 3;
const TILE_ROW = TILE_ART.height + 1 + 2; // the picture, a gap, the pips
const TILE_GAP = 3;
const NAME_TOP = 6;
const NAME = 12; // the chosen world's name: one line of blackletter (every name fits in both languages)
const STAGES_TOP = 4;
const STAGES = 3 * 20 + 2 * 2; // three rows of stage keys; the boss door stands beside them

/** The wing's box (frame and shadow included). Its height does not change: measured 278 in the page + 2 of shadow. */
export const MAP_WING_ART = {
  width: WING_ART_WIDTH,
  height:
    WINDOW_FRAME_ART +
    HEAD +
    DIFFS +
    WORLDS_TOP +
    WORLD_ROWS * TILE_ROW +
    (WORLD_ROWS - 1) * TILE_GAP +
    NAME_TOP +
    NAME +
    STAGES_TOP +
    STAGES +
    WINDOW_SHADOW_ART,
};
