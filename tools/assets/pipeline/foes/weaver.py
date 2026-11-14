"""Star Weaver — world 10, caster. Tall, thin and hovering: a pale mask under a tiara of star points, a teal robe
that ends in loose threads a hand above the ground, and four long arms. The lower pair never stops working a
thread of starlight between its hands; the upper pair reaches up, plucks a star out of the dark and throws it as a
needle. It has its own upper body (two pairs of shoulders) and no legs. When it dies the thread runs out: the robe
unravels from the hem upwards until only the mask is left to fall.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Pose, Pt, keyed, lerp, loose, stagger_keys

FIGURE = ("Weaver", "foe", "w10")

# Legs exist only to carry the pelvis high: it hovers, and they are never drawn.
BUILD = Build(root_x=40, thigh=10.0, shin=10.0, foot=3.0, hip_dx=1.0, spine=11.5, sh_near=2.8, sh_far=2.4, upper=8.0, fore=8.2, neck=1.2, head_dx=0.4, min_pelvis=4.0)
#: The second pair of arms: how far below the first its shoulders sit, and its bone lengths.
LOW_DY, LOW_UPPER, LOW_FORE = 3.6, 7.2, 7.4

L = {
    "a": ("bone", 3), "b": ("bone", 4), "c": ("bone", 5), "d": ("bone", 6), "e": ("bone", 7), "k": ("ink", 0),
    "Y": ("brass", 6), "W": ("light", 0),
    "p": ("sea", 2), "q": ("sea", 3), "r": ("sea", 4), "s": ("sea", 5), "t": ("sea", 6),
}
#: The mask once the light has left it.
DEAD = {"Y": ("brass", 3), "W": ("brass", 4)}

# A long pale mask: slanted hollow eyes, a third slit below them, a chin drawn out to a spike, a band of gold.
HEAD = [
    "..YYYYY..",
    "..bcdde..",
    ".bccddee.",
    ".bkkdkke.",
    ".bckdcke.",
    ".bccddee.",
    "..bckde..",
    "..bckde..",
    "..bcdde..",
    "...bcd...",
    "...bcd...",
    "....c....",
    "....c....",
]
#: The tiara's needles, fanned behind the mask: (angle, length).
RAYS = [(-158.0, 6.0), (-136.0, 9.0), (-113.0, 6.5), (-90.0, 10.5), (-67.0, 6.5), (-44.0, 9.0), (-22.0, 6.0)]
# A narrow bodice with a pale collar and a star for a clasp.
TORSO = [
    ".cdddc.",
    "pqrYstt",
    "pqrrstt",
    ".qrrst.",
    ".qrrst.",
    ".pqrst.",
    ".pqrrs.",
    ".pqrst.",
    "ppqrstt",
    "pqqrsst",
    "pqqrrst",
]
#: Skirt threads: where each hangs from (x from the pelvis) and how wide it is drawn.
SKIRT = [(-3.2, 6.6, 1.6), (0.2, 7.6, 2.0), (3.4, 6.0, 1.4)]
HOVER = 5.0


def _hash(x: int, y: int) -> int:
    return ((x * 73856093) ^ (y * 19349663)) & 0xFFFF


class Weaver(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        lean = math.radians(pose.get("lean", 0.0))
        cl, sl = math.cos(lean), math.sin(lean)
        for s in "NF":
            sx, sy = J["sh" + s]
            lx, ly = sx - LOW_DY * sl + (0.4 if s == "N" else 0.0), sy + LOW_DY * cl
            a, e = math.radians(pose["arm2" + s]), math.radians(pose["elb2" + s])
            ex, ey = lx + LOW_UPPER * math.sin(a), ly + LOW_UPPER * math.cos(a)
            J["sh2" + s], J["elbow2" + s], J["hand2" + s] = (lx, ly), (ex, ey), (ex + LOW_FORE * math.sin(a + e), ey + LOW_FORE * math.cos(a + e))
        # The mask is a loose prop: on the neck until there is no neck.
        turn = pose.get("head_rot", 0.0)
        nx, ny = J["head"]
        J["mask"] = loose(pose, "mask", (nx, ny + 3.0), self.build.root_x)
        J["turn"] = (turn, 0.0)
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def hover(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - HOVER))

        return {f"s{i}": ChainSpec(Chain(6, 2.4, gravity=0.2, drag=0.22, damp=0.1), (lambda J, x=x: (J["pelvis"][0] + x, J["pelvis"][1])), hover, (-0.25, 0.97))
                for i, (x, _w0, _w1) in enumerate(SKIRT)}

    @staticmethod
    def arm(cel: Cel, sh: Pt, el: Pt, hd: Pt, far: bool) -> None:
        cel.limb(sh, el, 2.2, 1.8, "bone", (3, 5, 6), far=far)
        cel.limb(el, hd, 1.8, 1.5, "bone", (3, 5, 6), far=far)
        dx, dy = hd[0] - el[0], hd[1] - el[1]
        d = math.hypot(dx, dy) or 1.0
        cel.put(hd[0] - dx / d * 1.6, hd[1] - dy / d * 1.6, ("brass", 4 if far else 6))  # bangle
        for k_ in (-0.9, 0.0, 0.9):  # fingers like needles
            cel.line(hd, (hd[0] + dx / d * 3.4 - dy / d * k_ * 2.2, hd[1] + dy / d * 3.4 + dx / d * k_ * 2.2), ("bone", 5 if far else 7))

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        px, py = J["pelvis"]
        self.arm(cel, J["shF"], J["elbowF"], J["handF"], True)
        self.arm(cel, J["sh2F"], J["elbow2F"], J["hand2F"], True)
        # The skirt: three hanks of thread, the middle one in front, each ending in loose strands.
        for i in (0, 2, 1):
            pts = ropes[f"s{i}"]
            _x, w0, w1 = SKIRT[i]
            n = len(pts) - 1
            for j in range(n):
                cel.limb(pts[j], pts[j + 1], w0 + (w1 - w0) * j / n, w0 + (w1 - w0) * (j + 1) / n, "sea", (2, 4, 5) if i != 1 else (3, 4, 6))
            ex, ey = pts[-1]
            dx = ex - pts[-2][0]
            for k_ in (-1.4, 0.0, 1.4):
                cel.line((ex + k_, ey), (ex + k_ * 1.3 + dx * 0.6, ey + 2.6), ("sea", 6) if k_ else ("bone", 6))
        cel.limb((px, py - 3.0), (px, py + 0.5), 7.0, 8.4, "sea", (2, 4, 5))
        cel.stamp_lean(TORSO, L, (px, py - 1.0), 3, lean)
        self.arm(cel, J["sh2N"], J["elbow2N"], J["hand2N"], False)
        self.arm(cel, J["shN"], J["elbowN"], J["handN"], False)
        cel.outline()
        unravel = pose.get("unravel", 0.0)
        if unravel > 0.0:
            self.unravel(cel, unravel)
        # The mask, with its own outline, on top of whatever is left under it.
        lit = pose.get("lit", 1.0) > 0.5
        head = Cel(cel.w, cel.h, cel.top)
        mx, my = J["mask"]
        if lit:  # the needles of the tiara stand out behind the mask
            a0 = math.radians(J["turn"][0])
            ox, oy = mx + 9.0 * math.sin(a0), my - 9.0 * math.cos(a0)
            for ang, length in RAYS:
                a = math.radians(ang) + a0
                tip = (ox + math.cos(a) * length, oy + math.sin(a) * length)
                head.line((ox + math.cos(a) * 3.0, oy + math.sin(a) * 3.0), tip, ("brass", 5))
                head.put(tip[0], tip[1], ("light", 0))
        head.stamp_turn(HEAD, L if lit else {**L, **DEAD}, (mx, my), 4, J["turn"][0] + (lean if abs(lean) > 24 else 0.0))
        head.outline()
        cel.px.update(head.px)
        if not lit:
            return

        # Fx: the thread the lower hands work, the motes round the tiara, the star and the needle.
        h0, h1 = J["hand2N"], J["hand2F"]
        if pose.get("thread", 1.0) > 0.5:
            steps = int(max(abs(h1[0] - h0[0]), abs(h1[1] - h0[1]))) + 1
            sag = 1.6 * math.sin(math.tau * pose.get("weave", 0.0))
            for i in range(steps + 1):
                t = i / steps
                cel.soft(lerp(h0[0], h1[0], t), lerp(h0[1], h1[1], t) + sag * math.sin(math.pi * t), ("light", 0) if i % 3 == 0 else ("brass", 6))
        ph = pose.get("weave", 0.0)
        for i in range(3):
            a = math.tau * (ph + i / 3)
            cel.soft(mx + math.cos(a) * 11.0, my - 8.0 + math.sin(a) * 3.0, ("light", 0) if i == 0 else ("brass", 6))
        star = pose.get("star", 0.0)
        if star > 0.05:
            sx, sy = (J["handN"][0] + J["handF"][0]) / 2, (J["handN"][1] + J["handF"][1]) / 2 - 2.0
            cel.star(sx, sy, 1 + int(round(3 * star)))
        needle = pose.get("needle", 0.0)
        if 0.01 < needle < 0.985:
            nx, ny = self.build.root_x + 14.0 + 40.0 * needle, GROUND - 34.0 + 6.0 * needle
            for i in range(11):
                cel.soft(nx - i, ny - i * 0.12, ("light", 0) if i < 5 else ("azure", 7) if i < 8 else ("azure", 5))
            cel.soft(nx + 1, ny, ("light", 0))
            for i in range(4):
                cel.soft(nx - 12.0 - i * 3.0, ny - 1.5 + ((i * 7) % 4) - 1.0, ("brass", 6) if i % 2 else ("azure", 7))

    @staticmethod
    def unravel(cel: Cel, u: float) -> None:
        """The figure comes undone from the hem up: below a line that climbs, there are only loose ends hanging
        and the thread falling in motes."""
        top, bottom = 8.0, GROUND - 2.0
        span = bottom - top
        cut = bottom - span * min(1.0, u * 1.2)
        out: dict[tuple[int, int], tuple[str, int]] = {}
        for (x, y), tone in cel.px.items():
            if y <= cut:
                out[(x, y)] = tone
                continue
            h = _hash(x, y)
            if y - cut < 2 + h % 5 and x % 2 == 0:  # loose ends hanging from the cut
                out[(x, y)] = ("sea", 6) if h % 3 else ("bone", 6)
            elif h % 9 == 0:  # the rest is falling
                since = u - (bottom - y) / span / 1.2
                ny = y + since * 46.0
                if ny < GROUND - 1:
                    out[(x + int(2.0 * math.sin(ny * 0.5 + h)), int(ny))] = ("brass", 6) if h % 2 else ("sea", 7)
        if u > 0.3:  # what has come down lies in a small tangle
            for i in range(int(4 + 9 * min(1.0, (u - 0.3) / 0.6))):
                out[(BUILD.root_x - 6 + (i * 5) % 13, int(GROUND - 1 - (i % 2)))] = ("sea", 5) if i % 3 else ("bone", 6)
        cel.px.clear()
        cel.px.update(out)


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=0.0, lean=3.0, footN=(-2.0, 0.0, 0.0), footF=(2.0, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=40.0, elbN=96.0, armF=58.0, elbF=84.0, arm2N=6.0, elb2N=74.0, arm2F=22.0, elb2F=64.0,
                  head_dx=0.0, head_dy=0.0, head_rot=0.0, breath=0.0, weave=0.0, thread=1.0, star=0.0, needle=0.0, unravel=0.0, lit=1.0,
                  mask_free=0.0, mask_at=(0.0, 0.0), flash=0.0)


def knit(ph: float) -> Pose:
    """The lower hands circle each other, half a turn apart, working the thread."""
    a = math.tau * ph * 2
    return {"arm2N": 6.0 + 9.0 * math.sin(a), "elb2N": 74.0 + 12.0 * math.cos(a), "arm2F": 22.0 - 9.0 * math.sin(a), "elb2F": 64.0 - 12.0 * math.cos(a), "weave": ph}


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    # It hangs in the air, rising and sinking, the upper hands open and waiting.
    return {**BASE, **knit(ph), "drop": -1.6 * s, "lean": 3.0 + 1.5 * late, "head_rot": 5.0 * late, "armN": 40.0 + 5.0 * late, "elbN": 96.0 + 6.0 * s,
            "armF": 58.0 + 5.0 * s, "elbF": 84.0 - 6.0 * late}


def glide_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    # Gliding: tipped forward, the robe streaming, the upper arms swept back like a diver's.
    return {**BASE, **knit(ph), "drop": -1.0 * s, "lean": 13.0 + 1.5 * s, "head_rot": -6.0, "armN": -34.0 + 4.0 * s, "elbN": 20.0, "armF": -18.0 - 4.0 * s, "elbF": 24.0}


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Star needle: the upper hands go up and close on a star; it draws back over its head and throws.
_REACH = dict(armN=150.0, elbN=14.0, armF=162.0, elbF=-12.0, lean=-4.0, drop=-2.0, head_rot=-14.0, arm2N=30.0, elb2N=70.0, arm2F=44.0, elb2F=50.0)
CAST_KEYS = [
    (0.00, k(), "lin"),
    (0.20, k(**_REACH, weave=0.3, star=0.1), "out"),
    (0.38, k(**{**_REACH, "drop": -3.0, "armN": 156.0, "armF": 166.0}, weave=0.5, star=1.0), "io"),
    (0.47, k(armN=178.0, elbN=58.0, armF=120.0, elbF=10.0, lean=-11.0, drop=-2.4, head_rot=-6.0, dx=-1.0, arm2N=20.0, elb2N=80.0, arm2F=34.0, elb2F=60.0, weave=0.6, star=1.0), "out"),
    (0.53, k(armN=86.0, elbN=4.0, armF=40.0, elbF=40.0, lean=13.0, drop=0.6, head_rot=8.0, dx=1.6, arm2N=-10.0, elb2N=40.0, arm2F=4.0, elb2F=40.0, weave=0.7, needle=0.02), "in"),
    (0.80, k(armN=80.0, elbN=8.0, armF=36.0, elbF=44.0, lean=10.0, drop=0.2, head_rot=6.0, dx=1.2, arm2N=-6.0, elb2N=46.0, arm2F=8.0, elb2F=44.0, weave=1.0, needle=0.98), "out"),
    (1.00, k(weave=1.3, needle=1.0), "io"),
]

# Hit: all four arms fly up, the thread snaps slack, and it sags in the air before it rights itself.
HURT_KEYS = stagger_keys(BASE, push=5.0, bend=14.0, buckle=3.0, whip=20.0, over={
    "impact": dict(armN=60.0, elbN=70.0, armF=80.0, elbF=60.0, arm2N=20.0, elb2N=60.0, arm2F=36.0, elb2F=50.0, weave=0.1, thread=0.0),
    "reel": dict(armN=128.0, elbN=30.0, armF=150.0, elbF=10.0, arm2N=70.0, elb2N=30.0, arm2F=92.0, elb2F=20.0, weave=0.3, thread=0.0),
    "catch": dict(armN=30.0, elbN=100.0, armF=50.0, elbF=90.0, arm2N=0.0, elb2N=80.0, arm2F=16.0, elb2F=70.0, weave=0.6, thread=1.0),
})

# Death: its arms fall, its head bows, and it unravels from the hem upwards; the mask drops into the tangle.
_LIMP = dict(armN=4.0, elbN=8.0, armF=12.0, elbF=6.0, arm2N=0.0, elb2N=6.0, arm2F=8.0, elb2F=6.0, thread=0.0)
_FALLEN = dict(mask_free=1.0, mask_at=(1.0, 0.4), head_rot=74.0, lit=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-2.2, drop=1.0, lean=-11.0, head_rot=-16.0, armN=110.0, elbN=40.0, armF=130.0, elbF=20.0, arm2N=60.0, elb2N=40.0, arm2F=80.0, elb2F=30.0, thread=0.0), "out3"),
    (0.30, k(**_LIMP, dx=-1.0, drop=2.4, lean=7.0, head_rot=24.0, unravel=0.02), "io"),
    (0.66, k(**_LIMP, dx=-1.0, drop=3.0, lean=9.0, head_rot=30.0, unravel=0.66), "lin"),
    (0.74, k(**_LIMP, dx=-1.0, drop=3.0, lean=9.0, head_rot=40.0, unravel=0.8, mask_free=0.35, mask_at=(1.0, 22.0), lit=0.0), "in"),
    (0.84, k(**_LIMP, **_FALLEN, dx=-1.0, drop=3.0, lean=9.0, unravel=0.95), "in"),
    (0.90, k(**_LIMP, **{**_FALLEN, "mask_at": (2.0, 2.4), "head_rot": 62.0}, dx=-1.0, drop=3.0, lean=9.0, unravel=1.0), "out"),
    (1.00, k(**_LIMP, **_FALLEN, dx=-1.0, drop=3.0, lean=9.0, unravel=1.0), "in"),
]

STILL = lambda t: (-0.2 + 0.2 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [150] * 12, True, STILL),
    "run": Anim("run", glide_pose, [i / 12 for i in range(12)], [80] * 12, True, lambda t: (-0.9, 0.0)),
    "attack": Anim("attack", keyed(CAST_KEYS), [0.0, 0.10, 0.20, 0.29, 0.38, 0.47, 0.53, 0.59, 0.66, 0.73, 0.80, 0.90, 1.0],
                   [80, 90, 100, 110, 150, 120, 50, 70, 70, 70, 90, 90, 110], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.20, 0.30, 0.39, 0.48, 0.57, 0.66, 0.70, 0.74, 0.79, 0.84, 0.90, 1.0],
                  [50, 50, 80, 90, 100, 90, 90, 90, 90, 70, 70, 70, 80, 100, 1200], False, STILL),
}
