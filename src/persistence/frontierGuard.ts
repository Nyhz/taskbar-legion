// A tiny, SYNCHRONOUS backstop for the one piece of progress that must never be
// lost: the cleared-stage frontier (which unlocks travel + the resume point).
//
// The full save is an ASYNC IndexedDB write (saveManager). On an abrupt teardown —
// a dev-server restart, a hard reload, the browser dropping the `beforeunload`
// handler's promise — that async write can be cut off before it commits, and if the
// 30s autosave hadn't fired since the last boss kill, a just-unlocked stage is lost.
// `localStorage.setItem` is synchronous and completes before the page tears down, so
// mirroring just the frontier here guarantees "beating a stage permanently unlocks
// it." On load we raise the (possibly stale) IndexedDB save's frontier to this guard.

export const FRONTIER_KEY = 'taskbar-legion.frontier.v1';
const KEY = FRONTIER_KEY;

export interface Frontier {
  seed: number; // scopes the guard to one game (a new seed ignores an old frontier)
  maxClearedStage: number;
}

function available(): boolean {
  return (
    typeof localStorage !== 'undefined' &&
    typeof localStorage.getItem === 'function' &&
    typeof localStorage.setItem === 'function'
  );
}

/** Synchronously record the cleared-stage frontier. Never throws. */
export function writeFrontier(seed: number, maxClearedStage: number): void {
  if (!available()) return;
  try {
    const prev = readFrontier();
    // Never lower the frontier (wipes drop the current stage but not the unlock).
    const floor = prev !== null && prev.seed === seed ? prev.maxClearedStage : 0;
    const next: Frontier = { seed, maxClearedStage: Math.max(floor, maxClearedStage) };
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage can throw (private mode / quota) — the IndexedDB save is the
    // primary path, so a guard failure is non-fatal.
  }
}

/** Synchronously erase the frontier guard (used by a full game reset). Never throws. */
export function clearFrontier(): void {
  if (!available()) return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    // non-fatal
  }
}

export function readFrontier(): Frontier | null {
  if (!available()) return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw) as Partial<Frontier>;
    if (typeof parsed.seed !== 'number' || typeof parsed.maxClearedStage !== 'number') return null;
    return { seed: parsed.seed, maxClearedStage: parsed.maxClearedStage };
  } catch {
    return null;
  }
}
