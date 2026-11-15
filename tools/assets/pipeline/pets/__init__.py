"""The companions drawn in the battle strip: one module per pet, named by the pet's key in src/data/pets.ts.

A pet's module carries `PET = "ClassName"` (read as text, like a creature's `FIGURE` line), a `Character` of that
name, its `ANIMS`, and `OX`, `OY`: the point under its feet in the cel. `export-pets` bakes them into
src/assets/strip/pets/ — an atlas of their own, apart from the fighters'.

SCALE: a pet is a third to a half of a hero. The Scholar Owl is the reference: about 20 px from its toes to the
tips of its ear tufts (user, 2026-11-15).

CLIPS the strip plays (render/petMotion says when); a pet draws the ones its way of moving needs:
  idle     at rest — a flier hovering, a walker sitting                                   loop
  move     going with the party — flying, trotting                                         loop
  perch    a flier standing on the path                                                    loop
  land     a flier braking, about to touch the path                                        loop
  settle   it has just come to rest on the path (touchdown; a walker sitting down)         once
  takeoff  it is about to leave the path (a flier's crouch; a walker getting up)           once
  fidget   something it does now and then at rest                                          once
  mourn    the party has fallen                                                            loop
  cheer    a boss has fallen                                                               once
  spot     a chest has dropped                                                             once
  ding     a hero has gained a level                                                       once

This file holds what their animations share."""
from __future__ import annotations

from typing import Callable, Sequence

from ..rig import EASE, Anim, Pose, lerp

STILL = lambda t: (0.0, 0.0)  # noqa: E731

#: Pose entries that blend between two keys; everything else (which eyes, where it looks) changes over halfway.
BLENDED = ("dx", "dy", "spark", "flash", "spin", "sway", "paw", "tail")


def keyed(keys: Sequence[tuple[float, Pose, str]]) -> Callable[[float], Pose]:
    """Poses keyed in time, like rig.keyed — but a pet's pose also carries things that do not blend."""

    def blend(p: Pose, q: Pose, t: float) -> Pose:
        out: Pose = {}
        for key, b in q.items():
            a = p.get(key, b)
            if isinstance(b, tuple):
                out[key] = tuple(lerp(x, y, t) for x, y in zip(a, b))
            elif key in BLENDED:
                out[key] = lerp(a, b, t)
            else:
                out[key] = b if t >= 0.5 else a
        return out

    def at(t: float) -> Pose:
        if t <= keys[0][0]:
            return dict(keys[0][1])
        for (t0, p0, _), (t1, p1, e) in zip(keys, keys[1:]):
            if t <= t1:
                return blend(p0, p1, EASE[e]((t - t0) / (t1 - t0)))
        return dict(keys[-1][1])

    return at


def held(name: str, frames: Sequence[tuple[Pose, int]], loop: bool) -> Anim:
    """A clip of poses each held for its own time (no in-betweens: a blink is a blink)."""
    n = len(frames)
    return Anim(name, lambda t: frames[min(n - 1, int(round(t * n)))][0], [i / n for i in range(n)], [ms for _p, ms in frames], loop, STILL)


def one_shot(name: str, keys: Sequence[tuple[float, Pose, str]], n: int, total_ms: int) -> Anim:
    """A keyed clip played once, in `n` even frames."""
    return Anim(name, keyed(keys), [i / (n - 1) for i in range(n)], [total_ms // n] * n, False, STILL)


def cycle(name: str, pose_at: Callable[[float], Pose], n: int, frame_ms: int) -> Anim:
    """A loop of `n` frames through one period of `pose_at`."""
    return Anim(name, pose_at, [i / n for i in range(n)], [frame_ms] * n, True, STILL)
