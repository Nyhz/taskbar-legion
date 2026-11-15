import { describe, it, expect } from 'vitest';
import { ShoveDelay } from '@/game/render/shoveDelay';

// A hero thrown back by a wave goes when the wave reaches him on the strip (render/shoveDelay): the strip shows
// his place as it was a little while ago — the time the wave takes to get to him.

const FRAME = 16;

/** Play a hero whose simulation place is `sim(ms)`, and return what the strip aims at, frame by frame. */
function play(shove: ShoveDelay, sim: (ms: number) => number, ms: number, delayMs: number): { t: number; x: number }[] {
  const out: { t: number; x: number }[] = [];
  for (let t = 0; t <= ms; t += FRAME) out.push({ t, x: shove.target('h', sim(t), FRAME, 14, () => delayMs) });
  return out;
}
/** Dragged 60 px back at 100 ms, then walking home at 110 px/s. */
const dragged = (t: number): number => (t < 100 ? 200 : Math.min(200, 140 + ((t - 100) * 110) / 1000));

describe('a hero thrown back', () => {
  it('stays where he was until the wave reaches him, then goes back and walks home, the same path later', () => {
    const shove = new ShoveDelay();
    const seen = play(shove, dragged, 1500, 400);
    const at = (t: number): number => seen.find((s) => s.t >= t)?.x ?? Number.NaN;
    expect(at(120)).toBe(200); // the simulation has moved him: the strip has not, yet
    expect(at(480)).toBe(200);
    expect(at(540)).toBeLessThan(150); // the wave is on him: thrown back
    expect(at(700)).toBeCloseTo(dragged(700 - 400), 0); // …and walking home, 400 ms behind
    expect(at(1400)).toBe(200);
    expect(shove.delayed('h')).toBe(false); // caught up: in step again
  });

  it('a hero the wave reaches at once is not held; small moves are never held', () => {
    const now = new ShoveDelay();
    expect(play(now, dragged, 300, 0).find((s) => s.t >= 112)?.x).toBeLessThan(150);
    expect(now.delayed('h')).toBe(false);
    const walking = new ShoveDelay();
    const walk = (t: number): number => 200 - t * 0.05; // drifting back a pixel a frame: no wave
    expect(play(walking, walk, 500, 400).every((s) => s.x === walk(s.t))).toBe(true);
  });

  it('each hero has his own delay, and forgetting one starts afresh', () => {
    const shove = new ShoveDelay();
    shove.target('front', 200, FRAME, 14, () => 50);
    shove.target('back', 100, FRAME, 14, () => 500);
    expect(shove.target('front', 140, FRAME, 14, () => 50)).toBe(200);
    expect(shove.target('back', 40, FRAME, 14, () => 500)).toBe(100);
    for (let t = 0; t < 100; t += FRAME) {
      shove.target('front', 140, FRAME, 14, () => 50);
      shove.target('back', 40, FRAME, 14, () => 500);
    }
    expect(shove.target('front', 140, FRAME, 14, () => 50)).toBe(140); // the wave has reached the front hero
    expect(shove.target('back', 40, FRAME, 14, () => 500)).toBe(100); // not yet the one behind
    shove.forget('back');
    expect(shove.target('back', 40, FRAME, 14, () => 500)).toBe(40);
  });
});
