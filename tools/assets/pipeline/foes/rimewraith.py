"""Rime Wraith — world 5, caster. Something that died in the snow and still wears the robe: a hood crowned with
icicles around a face that is only a hole with two lights in it, long bone hands, and no legs — below the waist
the robe trails away in rags that never touch the ground. It hangs in the air and bobs, with two slivers of ice
circling it. To attack it lifts both hands, three shards of ice grow over its head, and it casts them. When it
dies the lights go out, something pale leaves through the top of the hood and the empty robe drops in a heap.

It floats: the skeleton's legs are solved but never drawn. Drawn facing right; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Pose, Pt, keyed, stagger_keys

FIGURE = ("RimeWraith", "foe", "w05")

BUILD = Build(root_x=40, thigh=7.0, shin=7.0, foot=0.0, hip_dx=0.0, spine=9.0, sh_near=3.2, sh_far=2.8, upper=6.2, fore=6.0, neck=0.6, head_dx=0.8, min_pelvis=3.2)

L = {
    "a": ("dusk", 1), "b": ("dusk", 2), "c": ("dusk", 3), "d": ("dusk", 4),
    "k": ("ink", 0), "I": ("azure", 8), "i": ("azure", 6), "G": ("sea", 8),
}

# A deep hood under a crown of icicles; the face is a hole, the eyes (G) two cold lights.
HOOD = [
    "..I...I....",
    "..i.I.i.I..",
    "..abIbcic..",
    ".abbccccd..",
    ".abbccccdd.",
    "aabckkkkcd.",
    "aabkkGkGkd.",
    "aabkkkkkkd.",
    ".abckkkkcd.",
    ".aabckkcd..",
    "..aabbcc...",
]
# The robe's chest: ice at the points of the shoulders, a rune of frost, narrowing to nothing at the waist.
TORSO = [
    ".abbccd..",
    "IabbccdI.",
    "iabbccddi",
    ".abbccdd.",
    ".abIccdd.",
    ".abIIcdd.",
    ".aabccd..",
    "..abccd..",
    "..abcc...",
]

HOVER = 5.0


def shard(cel: Cel, at: Pt, angle: float, size: float) -> None:
    """A sliver of ice: a bright spine with pale edges, pointing along `angle`."""
    a = math.radians(angle)
    n = max(1, int(size))
    for i in range(-n, n + 1):
        x, y = at[0] + math.cos(a) * i, at[1] + math.sin(a) * i
        cel.soft(x, y, ("light", 0) if abs(i) < n * 0.5 else ("azure", 8))
        if abs(i) < n * 0.6:
            cel.soft(x - math.sin(a), y + math.cos(a), ("azure", 7))
            cel.soft(x + math.sin(a), y - math.cos(a), ("azure", 6))


class RimeWraith(Character):
    build = BUILD

    def chains(self) -> dict[str, ChainSpec]:
        def clear(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        return {
            "tail": ChainSpec(Chain(7, 2.6, gravity=0.07, drag=0.2, damp=0.12), lambda J: (J["pelvis"][0] - 0.5, J["pelvis"][1] - 1.0), clear, (-0.55, 0.85)),
            "rag_b": ChainSpec(Chain(5, 2.3, gravity=0.08, drag=0.22, damp=0.12), lambda J: (J["pelvis"][0] - 3.0, J["pelvis"][1] - 2.0), clear, (-0.8, 0.6)),
            "rag_f": ChainSpec(Chain(4, 2.2, gravity=0.09, drag=0.2, damp=0.12), lambda J: (J["pelvis"][0] + 2.6, J["pelvis"][1] - 2.0), clear, (-0.2, 1.0)),
        }

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        # A sleeve that widens to a ragged cuff, and a hand of bone.
        cel.limb(sh, el, 3.4, 3.8, "dusk", (1, 2, 4), far=far)
        cuff = (el[0] + (hd[0] - el[0]) * 0.6, el[1] + (hd[1] - el[1]) * 0.6)
        cel.limb(el, cuff, 3.8, 4.8, "dusk", (1, 2, 4), far=far)
        cel.limb(cuff, hd, 1.8, 1.6, "bone", (3, 5, 7), far=far)
        dx, dy = hd[0] - el[0], hd[1] - el[1]
        d = math.hypot(dx, dy) or 1.0
        for k_ in (-0.8, 0.0, 0.8):
            cel.line(hd, (hd[0] + dx / d * 3.2 - dy / d * k_ * 2.0, hd[1] + dy / d * 3.2 + dx / d * k_ * 2.0), ("bone", 4 if far else 6))

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        lit = pose.get("lit", 1.0)
        for name, w0 in (("rag_b", 4.0), ("tail", 7.0), ("rag_f", 4.4)):
            pts = ropes[name]
            n = len(pts) - 1
            for i in range(n):
                cel.limb(pts[i], pts[i + 1], w0 * (1 - i / n) + 1.0, w0 * (1 - (i + 1) / n) + 1.0, "dusk", (1, 2, 3))
            cel.put(pts[-1][0], pts[-1][1], ("azure", 7))  # rime on the last rag
        self.arm(cel, J, "F", far=True)
        px, py = J["pelvis"]
        cel.stamp_lean(TORSO, L, (px, py), 4, lean)
        hx, hy = J["head"]
        turn = pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0)
        cel.stamp_turn(HOOD, {**L, "G": ("light", 0) if lit >= 0.9 else ("sea", 8) if lit >= 0.5 else ("sea", 4) if lit >= 0.15 else ("ink", 0)}, (hx, hy + 2), 5, turn)
        self.arm(cel, J, "N", far=False)
        cel.outline()

        cx, cy = J["chest"]
        # Two slivers of ice circle it while it lives.
        if lit >= 0.5:
            orbit = pose.get("orbit", 0.0)
            for i in range(2):
                ang = math.tau * (orbit + i / 2)
                ox, oy = cx + math.cos(ang) * 12.0, cy + 2.0 + math.sin(ang) * 4.0
                if math.sin(ang) > -0.2:  # in front of it; behind, the body hides them
                    shard(cel, (ox, oy), 70.0 + 20.0 * math.cos(ang), 1.6)
        # The volley: three shards grow above the hood, then fly.
        form, volley = pose.get("form", 0.0), pose.get("volley", 0.0)
        spots = ((hx - 6.0, hy - 15.0), (hx + 2.0, hy - 19.0), (hx + 10.0, hy - 14.0))
        if form > 0.05 and volley < 0.01:
            for i, at in enumerate(spots):
                shard(cel, at, -60.0 + 30.0 * i + (1.0 - form) * 50.0, 1.0 + 3.0 * form)
        if 0.01 < volley < 0.985:
            for i, at in enumerate(spots):
                u = max(0.0, min(1.0, volley * 1.25 - i * 0.12))
                if 0.0 < u < 1.0:
                    x = at[0] + (self.build.root_x + 20.0 + 34.0 - at[0]) * u
                    y = at[1] + (GROUND - 16.0 + i * 3.0 - at[1]) * (1 - (1 - u) ** 2)
                    shard(cel, (x, y), 14.0 - 4.0 * i, 4.0)
                    for j in range(1, 5):
                        cel.soft(x - 4.0 - j * 2.2, y - j * (0.9 - 0.3 * i), ("azure", 7 if j < 3 else 5))
        if pose.get("frost", 0.0) > 0.3:
            hx2, hy2 = J["handN"]
            for i in range(5):
                ang = math.tau * (i / 5 + pose.get("frost", 0.0))
                cel.soft(hx2 + math.cos(ang) * 3.5, hy2 - 1.0 + math.sin(ang) * 3.5, ("sea", 8) if i % 2 else ("light", 0))
        wisp = pose.get("wisp", 0.0)
        if 0.01 < wisp < 0.985:
            # What was inside leaves by the top of the hood.
            wx, wy = hx + 3.0 * math.sin(wisp * 9.0), hy - 8.0 - 26.0 * wisp
            for dx, dy, tone in ((0, 0, ("light", 0)), (1, 0, ("sea", 8)), (-1, 0, ("sea", 8)), (0, -1, ("sea", 8)), (0, 1, ("sea", 7))):
                cel.soft(wx + dx, wy + dy, tone)
            for j in range(1, 7):
                cel.soft(wx - 2.0 * math.sin((wisp - j * 0.03) * 9.0) * 0.6, wy + j * 2.0, ("sea", 7 if j < 3 else 5 if j < 5 else 4))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=-HOVER, lean=6.0, footN=(-2.0, 0.0, 0.0), footF=(2.0, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=14.0, elbN=34.0, armF=26.0, elbF=40.0, head_dx=0.0, head_dy=0.0, head_rot=0.0, breath=0.0,
                  lit=0.8, orbit=0.0, form=0.0, volley=0.0, frost=0.0, wisp=0.0)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    # It hangs in the air and bobs; the hands drift a beat behind the body.
    return {**BASE, "drop": -HOVER + 1.4 * s, "lean": 6.0 + 2.0 * late, "head_rot": 5.0 * late, "armN": 14.0 + 6.0 * late, "elbN": 34.0 - 5.0 * s,
            "armF": 26.0 + 6.0 * late, "elbF": 40.0 - 5.0 * s, "orbit": ph, "lit": 1.0 if math.sin(math.tau * 2 * ph) > 0.7 else 0.8}


def glide_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    # It glides leaning into its path, hands trailing, the rags streaming out behind.
    return {**BASE, "drop": -HOVER - 1.0 + 1.0 * s, "lean": 17.0 + 2.0 * s, "head_rot": -8.0, "armN": -28.0 + 5.0 * s, "elbN": 22.0, "armF": -14.0 - 5.0 * s,
            "elbF": 26.0, "orbit": 2 * ph}


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Volley: it rises and lifts both hands, three shards of ice grow over the hood, and it throws them forward.
CAST_KEYS = [
    (0.00, k(), "lin"),
    (0.22, k(dx=-1.0, drop=-HOVER - 2.5, lean=-4.0, armN=132.0, elbN=30.0, armF=142.0, elbF=24.0, head_rot=-10.0, form=0.4, frost=0.4, orbit=0.3, lit=1.0), "out"),
    (0.42, k(dx=-1.6, drop=-HOVER - 4.0, lean=-9.0, armN=150.0, elbN=24.0, armF=158.0, elbF=18.0, head_rot=-14.0, form=1.0, frost=1.0, orbit=0.6, lit=1.0), "io"),
    (0.50, k(dx=2.5, drop=-HOVER - 1.0, lean=18.0, armN=84.0, elbN=6.0, armF=94.0, elbF=4.0, head_rot=10.0, form=1.0, volley=0.02, frost=0.3, orbit=0.8, lit=1.0), "in"),
    (0.80, k(dx=1.8, drop=-HOVER, lean=14.0, armN=76.0, elbN=10.0, armF=86.0, elbF=8.0, head_rot=8.0, form=1.0, volley=0.98, orbit=1.3), "out"),
    (1.00, k(form=0.0, volley=1.0, orbit=2.0), "io"),
]

# Hit: weightless, it is thrown back through the air and dips; the lights in the hood gutter.
HURT_KEYS = stagger_keys(BASE, push=5.4, bend=16.0, buckle=1.6, whip=18.0, over={
    "impact": dict(armN=40.0, elbN=20.0, armF=50.0, elbF=20.0, lit=1.0, orbit=0.1),
    "reel": dict(armN=80.0, elbN=10.0, armF=96.0, elbF=10.0, lit=0.2, orbit=0.3),
    "catch": dict(armN=-10.0, elbN=40.0, armF=4.0, elbF=44.0, lit=1.0, orbit=0.6),
    "recover": dict(armN=6.0, elbN=36.0, armF=18.0, elbF=42.0, lit=0.8, orbit=0.8),
})

# Death: the lights go out, something pale leaves through the hood, and the robe — empty — falls in a heap.
_HEAP = dict(dx=1.0, drop=30.0, lean=72.0, head_rot=14.0, head_dy=1.0, armN=92.0, elbN=6.0, armF=104.0, elbF=4.0, lit=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-2.6, drop=-HOVER - 1.0, lean=-12.0, head_rot=-18.0, armN=60.0, elbN=10.0, armF=76.0, elbF=10.0, lit=1.0), "out3"),
    (0.28, k(dx=-2.0, drop=-HOVER - 3.0, lean=-4.0, head_rot=-24.0, armN=30.0, elbN=20.0, armF=40.0, elbF=20.0, lit=0.3, wisp=0.02), "io"),
    (0.46, k(dx=-1.6, drop=-HOVER - 3.4, lean=2.0, head_rot=10.0, armN=10.0, elbN=20.0, armF=20.0, elbF=20.0, lit=0.0, wisp=0.5), "io"),
    (0.60, k(**{**_HEAP, "drop": 6.0, "lean": 30.0, "armN": 40.0, "armF": 50.0}, wisp=0.8), "in"),
    (0.68, k(**_HEAP, wisp=0.98), "in"),
    (0.76, k(**{**_HEAP, "lean": 66.0}, wisp=1.0), "out"),
    (0.86, k(**_HEAP, wisp=1.0), "in"),
    (1.00, k(**_HEAP, wisp=1.0), "lin"),
]

DRIFT = lambda t: (-0.25 + 0.15 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [170] * 12, True, DRIFT),
    "run": Anim("run", glide_pose, [i / 12 for i in range(12)], [90] * 12, True, lambda t: (-1.1, -0.05)),
    "attack": Anim("attack", keyed(CAST_KEYS), [0.0, 0.11, 0.22, 0.32, 0.42, 0.50, 0.56, 0.62, 0.68, 0.74, 0.80, 0.90, 1.0],
                   [80, 90, 100, 110, 170, 60, 70, 70, 70, 70, 90, 90, 110], False, DRIFT),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, DRIFT),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.19, 0.28, 0.37, 0.46, 0.53, 0.60, 0.64, 0.68, 0.76, 0.86, 1.0],
                  [50, 50, 90, 100, 120, 120, 130, 80, 70, 60, 80, 90, 120, 1200], False, DRIFT),
}
