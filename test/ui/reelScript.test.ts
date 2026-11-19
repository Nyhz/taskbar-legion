import { describe, it, expect } from 'vitest';
import { bossKeyOf, bossX, createReel, frameOf, HERO_X, REEL, stepReel, type Reel } from '@/ui/title/reelScript';
import { figureMeta } from '@/game/render/figureData';

// The title's reel (src/ui/title/reelScript.ts): the party fights each world's boss in turn, a few seconds a world,
// and moves on without ever stopping — a scene, deterministic, with no simulation behind it.

const STEP = 16;
function run(r: Reel, ms: number, ready: (w: number) => boolean = () => true): void {
  for (let t = 0; t < ms; t += STEP) stepReel(r, STEP, ready);
}

describe('the title reel', () => {
  it('every world 1–10 has a boss figure for the reel, laid out in the strip', () => {
    const knight = figureMeta('knight');
    expect(knight).toBeDefined();
    for (let w = 0; w < REEL.worlds; w++) {
      const key = bossKeyOf(w);
      expect(key).toBeDefined();
      const meta = figureMeta(key ?? '');
      expect(meta?.anims.idle).toBeDefined();
      expect(meta?.anims.attack).toBeDefined();
      // It stands clear of the Knight and inside the strip.
      if (meta === undefined || knight === undefined) continue;
      const x = bossX(meta, knight);
      expect(x - meta.box[2]).toBeGreaterThan(HERO_X.knight + knight.box[2]);
      expect(x - meta.box[0]).toBeLessThanOrEqual(600);
    }
  });

  it('waits for its art, then the first boss comes down and the party fights it', () => {
    const r = createReel();
    run(r, 500, () => false);
    expect(r.boss).toBeNull();
    run(r, 1500);
    expect(r.boss?.key).toBe(bossKeyOf(0));
    expect(r.boss?.alpha).toBe(1);
    const moves = new Set<string>();
    for (let t = 0; t < 2500; t += STEP) {
      stepReel(r, STEP, () => true);
      for (const h of Object.values(r.heroes)) moves.add(h.anim);
    }
    expect([...moves].filter((m) => m !== 'idle').length).toBeGreaterThan(2);
  });

  it('moves on world after world, every few seconds, and comes round to the first again', () => {
    const r = createReel();
    const seen: number[] = [];
    for (let t = 0; t < (REEL.fightMs + 2000) * 11; t += STEP) {
      stepReel(r, STEP, () => true);
      if (seen[seen.length - 1] !== r.world) seen.push(r.world);
    }
    expect(seen.slice(0, 11)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
  });

  it('fights on in the world it is in while the next one has not loaded', () => {
    const r = createReel();
    run(r, REEL.fightMs * 3, (w) => w === 0);
    expect(r.world).toBe(0);
    expect(r.boss?.key).toBe(bossKeyOf(0));
    expect(r.wipe).toBeNull();
  });

  it('is deterministic: the same seed plays the same scene', () => {
    const a = createReel(3);
    const b = createReel(3);
    run(a, 7000);
    run(b, 7000);
    expect(a.world).toBe(b.world);
    expect(Object.values(a.heroes).map((h) => [h.anim, frameOf(h)])).toEqual(Object.values(b.heroes).map((h) => [h.anim, frameOf(h)]));
    expect(a.fx.map((e) => e.key)).toEqual(b.fx.map((e) => e.key));
  });
});
