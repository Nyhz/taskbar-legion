// A hero thrown back by a wave is thrown back when the wave REACHES him on the strip, not the instant the
// simulation moves him (no Pixi here — pure, unit-tested). The simulation drags the whole party at once (Resaca:
// sim/worldBossRules.dragParty); the strip shows each hero's place as it was `delayMs` ago — his own delay, the
// time the wave takes to get to him — so the front hero goes first and the ones behind as it passes them. The
// delay ends once what is shown has caught up with where he is.

interface Track {
  delayMs: number;
  t: number; // this track's clock (ms)
  samples: { t: number; x: number }[]; // the simulation's x, as it was
}

/** A hero is back in step with the simulation when what is shown is this close to where he is… */
const SETTLED_PX = 0.5;
/** …for this long. */
const SETTLED_MS = 250;

export class ShoveDelay {
  private readonly tracks = new Map<string, Track & { settledMs: number }>();
  private readonly last = new Map<string, number>();

  /**
   * The x the strip should move hero `id` towards this frame. `x` is where the simulation has him. When his place
   * jumps back by more than `fromPx` in one frame he has been thrown: from then on the place returned is his as it
   * was `delayMs()` ago (asked once, at that moment), until it has caught up.
   */
  target(id: string, x: number, dtMs: number, fromPx: number, delayMs: () => number): number {
    const before = this.last.get(id);
    this.last.set(id, x);
    let track = this.tracks.get(id);
    if (track === undefined && before !== undefined && before - x > fromPx) {
      const delay = Math.max(0, delayMs());
      if (delay > 0) {
        track = { delayMs: delay, t: 0, samples: [{ t: 0, x: before }], settledMs: 0 };
        this.tracks.set(id, track);
      }
    }
    if (track === undefined) return x;
    track.t += dtMs;
    track.samples.push({ t: track.t, x });
    const at = track.t - track.delayMs;
    // The last sample not later than `at` (the first one — where he stood before the wave — until then).
    let shown = track.samples[0]?.x ?? x;
    let keepFrom = 0;
    for (let i = 0; i < track.samples.length; i++) {
      const s = track.samples[i];
      if (s === undefined || s.t > at) break;
      shown = s.x;
      keepFrom = i;
    }
    if (keepFrom > 0) track.samples.splice(0, keepFrom);
    track.settledMs = at >= 0 && Math.abs(shown - x) <= SETTLED_PX ? track.settledMs + dtMs : 0;
    if (track.settledMs >= SETTLED_MS) this.tracks.delete(id);
    return shown;
  }

  /** True while hero `id` is being shown behind the simulation. */
  delayed(id: string): boolean {
    return this.tracks.has(id);
  }

  forget(id: string): void {
    this.tracks.delete(id);
    this.last.delete(id);
  }

  clear(): void {
    this.tracks.clear();
    this.last.clear();
  }
}
