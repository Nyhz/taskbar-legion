// Interactive-surface registry (v1.5 hook). In v1 we ONLY populate it — nothing
// consumes it. v1.5 will add a `hitTest.ts` that reads this to drive click-through.
// Keep registration cheap and correct; build no consumer now (ARCHITECTURE.md).

export interface InteractiveSurface {
  id: string;
  getBounds(): DOMRect | null;
}

const surfaces = new Map<string, InteractiveSurface>();

/** Register an interactive region. Returns an unregister function for cleanup. */
export function registerSurface(surface: InteractiveSurface): () => void {
  surfaces.set(surface.id, surface);
  return () => {
    surfaces.delete(surface.id);
  };
}

/** All currently-registered surfaces. v1 has no consumer; exposed for v1.5/tests. */
export function listSurfaces(): InteractiveSurface[] {
  return [...surfaces.values()];
}

/** Visible for tests only. */
export function clearSurfaces(): void {
  surfaces.clear();
}
