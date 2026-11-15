import { Container } from 'pixi.js';
import { fxLoop, type FxLoop } from './BodyFx';

// Looping effects that last for as long as someone keeps asking for them — the cue a boss shows while it winds a
// mechanic up (render/bossFx CAST_CUES). The strip calls `show` every frame the cue holds; a cue not asked for
// since the last `update` is taken away. Art is drawn 1:1 on whole pixels. Cosmetic: reads nothing from the sim.

interface Cue {
  loop: FxLoop;
  fx: string;
  seen: boolean;
}

export class CueLayer extends Container {
  private readonly cues = new Map<string, Cue>();

  /** Keep the cue `id` on screen this frame: the looping effect `fx` with its attach point at (x, y); `facing`
   *  −1 mirrors it. */
  show(id: string, fx: string, x: number, y: number, facing: 1 | -1 = 1): void {
    let cue = this.cues.get(id);
    if (cue !== undefined && cue.fx !== fx) {
      cue.loop.sprite.destroy();
      this.cues.delete(id);
      cue = undefined;
    }
    if (cue === undefined) {
      const loop = fxLoop(fx);
      if (loop === null) return;
      cue = { loop, fx, seen: true };
      this.cues.set(id, cue);
      this.addChild(loop.sprite);
    }
    cue.seen = true;
    cue.loop.sprite.position.set(Math.round(x), Math.round(y));
    cue.loop.sprite.scale.set(facing, 1);
  }

  update(dtMs: number): void {
    for (const [id, cue] of this.cues) {
      if (!cue.seen) {
        cue.loop.sprite.destroy();
        this.cues.delete(id);
        continue;
      }
      cue.seen = false;
      cue.loop.advance(dtMs);
    }
  }
}
