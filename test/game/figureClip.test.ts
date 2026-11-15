import { describe, expect, it } from 'vitest';
import { ACTION_CUT_AFTER, ClipPlayer } from '@/game/render/figureClip';
import type { FigureAnim } from '@/game/render/figureData';

const anim = (n: number, ms: number, loop = false, row = 0): FigureAnim => ({ row, n, ms: Array.from({ length: n }, () => ms), loop });
const ANIMS: Record<string, FigureAnim> = {
  idle: anim(4, 100, true),
  run: anim(4, 50, true),
  attack: anim(10, 100), // 1000 ms
  cleave: anim(5, 100), // 500 ms
  hurt: anim(3, 100), // 300 ms
  death: { row: 5, n: 3, ms: [100, 100, 400], loop: false },
};

describe('ClipPlayer', () => {
  it('idles, and runs while moving, following each frame\'s own time', () => {
    const p = new ClipPlayer(ANIMS);
    expect([p.clip, p.frame]).toEqual(['idle', 0]);
    p.advance(250, false);
    expect([p.clip, p.frame]).toEqual(['idle', 2]);
    p.advance(200, false); // wraps: 450 ms → frame 4 % 4
    expect(p.frame).toBe(0);
    p.advance(10, true);
    expect([p.clip, p.frame]).toEqual(['run', 0]);
    p.advance(120, true);
    expect(p.frame).toBe(2);
    p.advance(10, false);
    expect(p.clip).toBe('idle');
  });

  it('plays an action to its end, then returns to the loop', () => {
    const p = new ClipPlayer(ANIMS);
    expect(p.act('attack')).toBe(true);
    expect(p.acting).toBe(true);
    p.advance(950, false);
    expect([p.clip, p.frame]).toEqual(['attack', 9]);
    p.advance(100, true); // 50 ms past the end spill into the loop
    expect(p.acting).toBe(false);
    expect([p.clip, p.frame]).toEqual(['run', 1]);
  });

  it('does not restart an action before its blow has landed, and cuts cleanly after', () => {
    const p = new ClipPlayer(ANIMS);
    p.act('attack');
    p.advance(1000 * ACTION_CUT_AFTER - 50, false);
    expect(p.act('attack')).toBe(false);
    expect(p.frame).toBeGreaterThan(0);
    p.advance(100, false);
    expect(p.act('attack')).toBe(true);
    expect([p.clip, p.frame]).toEqual(['attack', 0]); // from its first frame, never mid-pose
  });

  it('lets an ability cut a basic attack at once, but not itself', () => {
    const p = new ClipPlayer(ANIMS);
    p.act('attack');
    p.advance(100, false);
    expect(p.act('cleave', true)).toBe(true);
    expect([p.clip, p.frame]).toEqual(['cleave', 0]);
    p.advance(100, false);
    expect(p.act('cleave', true)).toBe(false); // the cast and the hit of one ability are one clip
    expect(p.act('attack')).toBe(false); // a basic attack waits for the ability
    expect(p.clip).toBe('cleave');
  });

  it('reacts only from a loop, and not more often than the gap', () => {
    const p = new ClipPlayer(ANIMS);
    expect(p.react('hurt', 500)).toBe(true);
    expect(p.clip).toBe('hurt');
    expect(p.react('hurt', 500)).toBe(false); // already reacting
    p.advance(320, false);
    expect(p.clip).toBe('idle');
    expect(p.react('hurt', 500)).toBe(false); // too soon
    p.advance(200, false);
    expect(p.react('hurt', 500)).toBe(true);
    p.advance(400, false);
    p.act('attack');
    expect(p.react('hurt')).toBe(false); // never interrupts an action
    expect(p.clip).toBe('attack');
    expect(p.act('attack')).toBe(false);
  });

  it('lets an action cut a reaction', () => {
    const p = new ClipPlayer(ANIMS);
    p.react('hurt');
    p.advance(50, false);
    expect(p.act('attack')).toBe(true);
    expect([p.clip, p.frame]).toEqual(['attack', 0]);
  });

  it('dies from anything, holds the last frame of its death, and revives to idle', () => {
    const p = new ClipPlayer(ANIMS);
    p.act('attack');
    p.advance(300, false);
    p.die();
    expect([p.clip, p.frame, p.dead]).toEqual(['death', 0, true]);
    expect(p.act('attack')).toBe(false);
    expect(p.react('hurt')).toBe(false);
    p.advance(250, true);
    expect(p.frame).toBe(2);
    p.advance(60_000, true);
    expect([p.clip, p.frame]).toEqual(['death', 2]);
    p.revive();
    expect([p.clip, p.frame, p.dead]).toEqual(['idle', 0, false]);
  });

  it('ignores clips the figure does not have', () => {
    const p = new ClipPlayer({ idle: ANIMS.idle! });
    expect(p.has('block')).toBe(false);
    expect(p.act('block')).toBe(false);
    expect(p.react('block')).toBe(false);
    p.advance(50, true); // no run clip: it keeps idling
    expect(p.clip).toBe('idle');
    p.die(); // no death clip: it freezes where it is
    p.advance(5000, false);
    expect(p.dead).toBe(true);
  });

  it('survives a very long frame', () => {
    const p = new ClipPlayer(ANIMS);
    p.advance(3_600_000, false);
    expect(p.clip).toBe('idle');
    expect(p.frame).toBeLessThan(4);
  });

  it('plays an action faster when asked to, and its loop at the normal pace again', () => {
    const p = new ClipPlayer(ANIMS);
    expect(p.act('attack', false, 2)).toBe(true); // 1000 ms of clip in 500 ms of clock
    p.advance(250, false);
    expect([p.clip, p.frame]).toEqual(['attack', 5]);
    p.advance(300, false); // 50 ms of clock past its end spill into the loop, unhurried
    expect(p.acting).toBe(false);
    expect([p.clip, p.frame]).toEqual(['idle', 0]);
    p.advance(60, false);
    expect(p.frame).toBe(1);
    expect(p.act('attack')).toBe(true); // the next one is back to the drawn pace
    p.advance(250, false);
    expect(p.frame).toBe(2);
  });
});
