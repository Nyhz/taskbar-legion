// Calls held back for a moment (no Pixi here — pure, unit-tested): the strip shows some things a beat after the
// simulation resolved them, so they land with the picture — the damage number of a cleave pops when the blade
// arrives, not when the swing starts. Presentation only: nothing here delays or changes the simulation.

export class Delayed {
  private items: { leftMs: number; run: () => void }[] = [];

  /** Run `run` after `delayMs`; at once when there is nothing to wait for. */
  add(delayMs: number, run: () => void): void {
    if (delayMs <= 0) run();
    else this.items.push({ leftMs: delayMs, run });
  }

  /** Advance the clock and run what is due, in the order it was added. */
  tick(dtMs: number): void {
    if (this.items.length === 0) return;
    const due: (() => void)[] = [];
    const waiting: typeof this.items = [];
    for (const item of this.items) {
      item.leftMs -= dtMs;
      if (item.leftMs <= 0) due.push(item.run);
      else waiting.push(item);
    }
    this.items = waiting;
    for (const run of due) run();
  }

  /** Drop everything still waiting (the scene it belonged to is gone). */
  clear(): void {
    this.items = [];
  }

  get pending(): number {
    return this.items.length;
  }
}
