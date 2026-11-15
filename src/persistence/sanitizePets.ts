import { isPet } from '@/sim/pets';

// Tolerant loading of the pets of a save (as persistence/sanitizeHero does for talents): keys the game no longer
// has are dropped so they can never reach the sim or the interface, and the objective progress — a field saves
// from before the ranks do not carry — is read as "nothing counted yet", which is rank 1. Pure.

export interface SavedPets {
  ownedKeys: string[];
  selectedKey: string | null;
  /** Pet key → what its objective has counted since it was found. Absent in saves from before the ranks. */
  progress?: Record<string, number>;
}

export interface LoadedPets {
  ownedKeys: string[];
  selectedKey: string | null;
  progress: Record<string, number>;
}

export function sanitizePets(saved: { ownedKeys?: unknown; selectedKey?: unknown; progress?: unknown }): LoadedPets {
  const ownedKeys: string[] = [];
  if (Array.isArray(saved.ownedKeys)) {
    for (const key of saved.ownedKeys) {
      if (typeof key === 'string' && isPet(key) && !ownedKeys.includes(key)) ownedKeys.push(key);
    }
  }
  const stored: Record<string, unknown> =
    typeof saved.progress === 'object' && saved.progress !== null ? (saved.progress as Record<string, unknown>) : {};
  const progress: Record<string, number> = {};
  for (const key of ownedKeys) {
    const n = stored[key];
    progress[key] = typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0;
  }
  const selected = saved.selectedKey;
  const selectedKey = typeof selected === 'string' && ownedKeys.includes(selected) ? selected : (ownedKeys[0] ?? null);
  return { ownedKeys, selectedKey, progress };
}
