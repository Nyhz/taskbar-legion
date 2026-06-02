// Horizontal scroll bookkeeping for the strip. In Phase 0 this is a stub — the
// camera is fixed. Phase 2 will scroll it as the party advances through stages.

export interface Camera {
  scrollX: number;
}

export function createCamera(): Camera {
  return { scrollX: 0 };
}
