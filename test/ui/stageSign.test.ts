import { describe, expect, it } from 'vitest';
import { stageSignToShow } from '@/ui/overlay/stageSign';

describe("the stage's sign", () => {
  it('shows when the party moves to another stage', () => {
    expect(stageSignToShow({ stage: 7, held: false }, { stage: 8, held: false })).toBe(8);
    expect(stageSignToShow({ stage: 7, held: false }, { stage: 7, held: false })).toBeNull();
  });

  it('never shows over a fallen party or the black: a stage change is held', () => {
    expect(stageSignToShow({ stage: 8, held: false }, { stage: 8, held: true })).toBeNull();
    expect(stageSignToShow({ stage: 8, held: true }, { stage: 7, held: true })).toBeNull(); // the retreat, under black
  });

  it('shows once the strip is back — for the stage the party is on then', () => {
    expect(stageSignToShow({ stage: 7, held: true }, { stage: 7, held: false })).toBe(7); // fell back from 8
    expect(stageSignToShow({ stage: 8, held: true }, { stage: 8, held: false })).toBe(8); // Retry on: the same stage
  });
});
