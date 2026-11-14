"""Slag Imp — world 8, ranged. A wiry blue-skinned imp no higher than a hero's belt: big ears, two horns, a coal
for an eye, a mouth too wide, a spade-tipped tail. It carries a long iron ladle full of molten slag. It scampers
bent double with the ladle held high, winds it right back over its shoulder and whips it forward, and the glob
goes up in a high arc and bursts where it lands. When it dies the blow sends it head over heels: it lands on
its face with its rump in the air and the ladle spills beside it.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, keyed, loose, stagger_keys, swing_smear

FIGURE = ("Slagimp", "foe", "w08")

BUILD = Build(root_x=40, thigh=3.8, shin=3.8, foot=3.0, hip_dx=1.0, spine=6.0, sh_near=2.2, sh_far=1.9, upper=4.8, fore=4.8, neck=0.5, head_dx=0.8,
              heel=1.4, toe=1.0, min_pelvis=3.0)

L = {
    "a": ("azure", 1), "b": ("azure", 2), "c": ("azure", 3), "d": ("azure", 4), "e": ("azure", 5),
    "H": ("bone", 6), "h": ("bone", 4), "Y": ("brass", 6), "y": ("brass", 4), "T": ("bone", 7), "k": ("ink", 0),
    "m": ("leather", 2), "n": ("leather", 3), "o": ("leather", 4),
}

# Two horns, an ear swept back, an eye like a coal (Y), a snout and a grin full of teeth.
HEAD = [
    "...h....H...",
    "..hH...hH...",
    "a..bccddd...",
    "ab.bccdddee.",
    "abbccddYYee.",
    ".abccdddyee.",
    "..bccddddeee",
    "..bckTkTkTe.",
    "...bccddde..",
    "....bccd....",
]
# Ribs, a pot belly and a rag.
TORSO = [
    ".bccdd.",
    "bbccdde",
    "bbcbdde",
    ".bccdde",
    ".bccddd",
    ".mnnoo.",
    ".m.n.o.",
]

HANDLE_UP, HANDLE_DOWN, CUP = 15.0, 3.0, 2.8
#: The lobbed glob: where it leaves the cup and where it lands (x from the root, height above the ground).
LOB_FROM, LOB_TO, LOB_RISE = (11.0, 25.0), (46.0, 2.0), 15.0


def ladle_points(grip: Pt, angle: float) -> tuple[Pt, Pt]:
    a = math.radians(angle)
    return (grip[0] - math.cos(a) * HANDLE_DOWN, grip[1] - math.sin(a) * HANDLE_DOWN), (grip[0] + math.cos(a) * HANDLE_UP, grip[1] + math.sin(a) * HANDLE_UP)


def draw_ladle(cel: Cel, grip: Pt, angle: float, full: float) -> None:
    """An iron ladle; while it is full the slag glows over the rim. Cut off at the ground."""
    end, cup = ladle_points(grip, angle)
    tmp = Cel(cel.w, cel.h, cel.top)
    tmp.limb(end, cup, 1.6, 1.6, "ink", (3, 5, 7))
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            dd = math.hypot(dx, dy)
            if dd <= CUP:
                if dy < 0 and full > 0.5:
                    tone = ("light", 0) if dd < 1.2 else ("brass", 6)
                elif dy < 0:
                    tone = ("ink", 1)
                else:
                    tone = ("ink", 6) if dx > 0 and dd > 1.6 else ("ink", 4) if dd > 1.6 else ("ink", 3)
                tmp.put(cup[0] + dx, cup[1] + dy, tone)
    for (x, y), tone in tmp.px.items():
        if y < GROUND:
            cel.px[(x, y)] = tone


def lob_point(f: float) -> Pt:
    x0, y0 = BUILD.root_x + LOB_FROM[0], GROUND - LOB_FROM[1]
    x1, y1 = BUILD.root_x + LOB_TO[0], GROUND - LOB_TO[1]
    return (x0 + (x1 - x0) * f, y0 + (y1 - y0) * f * f - LOB_RISE * math.sin(math.pi * f) * (1 - 0.35 * f))


class Slagimp(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        J["grip"] = loose(pose, "ladle", J["handN"], self.build.root_x)
        J["cup"] = ladle_points(J["grip"], pose["ladle"])[1]
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def on_ground(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        return {"tail": ChainSpec(Chain(5, 2.0, gravity=0.06, drag=0.16, damp=0.08, shape=[(0.0, 0.0), (-2.0, 0.3), (-3.9, 0.0), (-5.6, -1.0), (-6.6, -2.7)], stiff=0.3),
                                  lambda J: (J["pelvis"][0] - 1.5, J["pelvis"][1] - 0.5), on_ground, (-1.0, -0.2))}

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        cel.limb(J["hip" + s], J["knee" + s], 2.8, 2.2, "azure", (1, 2, 4), far=far)
        cel.limb(J["knee" + s], J["ankle" + s], 2.2, 1.8, "azure", (1, 2, 4), far=far)
        a_, t_ = J["ankle" + s], J["toe" + s]
        cel.limb(a_, t_, 2.2, 1.4, "azure", (1, 3, 4), far=far)
        cel.put(t_[0] + 0.8, t_[1], ("bone", 4 if far else 6))  # claws

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 2.4, 2.0, "azure", (1, 2, 4), far=far)
        cel.limb(el, hd, 2.0, 1.8, "azure", (1, 3, 4), far=far)
        cel.put(hd[0], hd[1], ("azure", 3 if far else 5))

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        eye = pose.get("eye", 1.0)
        Le = {**L, "Y": ("light", 0) if eye >= 0.95 else ("brass", 6) if eye >= 0.5 else ("crimson", 4) if eye >= 0.15 else ("ink", 0),
              "y": ("brass", 4) if eye >= 0.5 else ("ink", 1)}
        tail = ropes["tail"]
        for i in range(len(tail) - 1):
            cel.limb(tail[i], tail[i + 1], 2.0 - i * 0.2, 1.8 - i * 0.2, "azure", (1, 2, 4))
        tx, ty = tail[-1]
        dx_, dy_ = tx - tail[-2][0], ty - tail[-2][1]
        d_ = math.hypot(dx_, dy_) or 1.0
        for side in (-1.0, 0.0, 1.0):  # the spade at its tip
            cel.put(tx + dx_ / d_ * (2.0 - abs(side)) - dy_ / d_ * side * 1.4, ty + dy_ / d_ * (2.0 - abs(side)) + dx_ / d_ * side * 1.4, ("azure", 2))
        self.arm(cel, J, "F", far=True)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        cel.stamp_lean(TORSO, L, (px, py), 3, lean)
        hx, hy = J["head"]
        turn = pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0)
        cel.stamp_turn(HEAD, Le, (hx, hy + 1), 5, turn)
        draw_ladle(cel, J["grip"], pose["ladle"], pose.get("full", 1.0))
        self.arm(cel, J, "N", far=False)
        cel.outline()

        cup = J["cup"]
        if pose.get("smear", 0.0) > 0.5 and len(between) > 2:
            swing_smear(cel, [Jb["cup"] for Jb, _pb in between], [Jb["grip"] for Jb, _pb in between])
        # The slag spits and drips while the ladle is full.
        if pose.get("full", 1.0) > 0.5:
            ph = pose.get("drip", 0.0)
            u = ph % 1.0
            cel.soft(cup[0] + 1.0, cup[1] - 3.0 - 3.0 * u, ("brass", 6) if u < 0.5 else ("crimson", 5))
            cel.soft(cup[0] - 1.5, cup[1] + 2.0 + 7.0 * ((ph + 0.5) % 1.0), ("brass", 5))
        spill = pose.get("spill", 0.0)
        if 0.01 < spill < 0.985:
            for i in range(7):
                ang = math.radians(-160 + i * 24.0)
                dist = 2.0 + 9.0 * spill
                y = cup[1] + math.sin(ang) * dist + 12.0 * spill * spill
                if y < GROUND - 1:
                    cel.soft(cup[0] + math.cos(ang) * dist, y, ("light", 0) if spill < 0.3 else ("brass", 6) if i % 2 else ("brass", 5))
        glob = pose.get("glob", 0.0)
        if 0.01 < glob < 0.985:
            self.lob(cel, glob)
        puddle = pose.get("puddle", 0.0)
        if puddle > 0.05:
            tone = ("light", 0) if puddle > 0.8 else ("brass", 6) if puddle > 0.55 else ("brass", 4) if puddle > 0.3 else ("crimson", 3)
            for i in range(-4, 5):
                cel.soft(cup[0] + 2.0 + i, GROUND - 1, tone if abs(i) < 3 else ("crimson", 4) if puddle > 0.3 else ("ink", 3))

    @staticmethod
    def lob(cel: Cel, u: float) -> None:
        """A glob of slag thrown in a high arc, a tail of drops behind it, and its burst where it lands."""
        fly = min(1.0, u / 0.8)
        if u < 0.8:
            gx, gy = lob_point(fly)
            for dy in range(-2, 3):
                for dx in range(-2, 3):
                    dd = math.hypot(dx, dy)
                    if dd <= 2.3:
                        cel.put(gx + dx, gy + dy, ("light", 0) if dd < 1.1 else ("brass", 6) if dd < 1.9 else ("brass", 5) if dy < 1 else ("crimson", 5))
            for i in range(1, 6):
                x, y = lob_point(max(0.0, fly - i * 0.06))
                cel.soft(x, y + (i % 2), ("brass", 6) if i < 2 else ("brass", 5) if i < 4 else ("crimson", 5))
        else:
            v = (u - 0.8) / 0.2
            lx = BUILD.root_x + LOB_TO[0]
            for i in range(-6, 7):
                cel.soft(lx + i * (0.6 + 0.5 * v), GROUND - 1, ("light", 0) if abs(i) < 2 and v < 0.5 else ("brass", 6) if abs(i) < 4 else ("crimson", 5))
            for i in range(8):
                ang = math.radians(-165 + i * 21.0)
                d = 2.0 + 10.0 * v
                y = GROUND - 2 + math.sin(ang) * d + 7.0 * v * v
                if y < GROUND - 1:
                    cel.put(lx + math.cos(ang) * d * 1.2, y, ("light", 0) if v < 0.3 else ("brass", 6) if i % 2 else ("crimson", 5))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=1.0, lean=12.0, footN=(-2.6, 0.0, 0.0), footF=(2.8, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=30.0, elbN=60.0, armF=-10.0, elbF=40.0, ladle=-34.0, head_dx=0.0, head_dy=0.0, head_rot=-6.0, breath=0.0,
                  full=1.0, eye=0.8, drip=0.0, smear=0.0, glob=0.0, spill=0.0, puddle=0.0, ladle_free=0.0, ladle_at=(0.0, 0.0))


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    quick = math.sin(2 * math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    # It cannot keep still: it bobs on its heels, cocks its head at the ladle and its eye flares.
    return {**BASE, "drop": 1.0 + 0.7 * max(0.0, quick), "lean": 12.0 + 2.0 * s, "head_rot": -6.0 + 9.0 * late, "ladle": -34.0 + 5.0 * late,
            "armF": -10.0 + 12.0 * quick, "elbF": 40.0 + 10.0 * s, "drip": ph, "eye": 1.0 if quick > 0.6 else 0.8}


def scamper_pose(ph: float) -> Pose:
    c = math.cos(math.tau * ph)
    p: Pose = gait_legs(Gait(stride=1.0, give=1.2, lift=1.0, toe=0.9, run=True, air=1.4), ph)
    # Bent double, the ladle held up out of harm's way, the free arm pumping.
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 20.0 + 3.0 * math.cos(2 * math.tau * ph), "hip_rot": -0.5 * c, "sh_rot": 0.5 * c, "armN": 44.0 + 5.0 * c, "elbN": 62.0,
              "ladle": -48.0 + 6.0 * math.cos(2 * math.tau * (ph - 0.15)), "armF": -10.0 - 36.0 * c, "elbF": 50.0, "head_rot": -14.0 + 4.0 * c, "drip": 2 * ph})
    p["dy"] = p.get("dy", 0.0) + 0.8
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Lob: the ladle goes right back over its shoulder as it crouches, then the whole body unfolds and whips it over.
LOB_KEYS = [
    (0.00, k(), "lin"),
    (0.20, k(dx=-1.2, drop=2.2, lean=-4.0, armN=-40.0, elbN=-30.0, ladle=-150.0, head_rot=-12.0, armF=30.0, elbF=40.0, footN=(-1.4, 0.0, 0.0), footF=(4.0, 0.0, 0.0), eye=1.0), "out"),
    (0.38, k(dx=-1.8, drop=2.8, lean=-12.0, armN=-64.0, elbN=-30.0, ladle=-188.0, head_rot=-16.0, armF=44.0, elbF=30.0, footN=(-0.8, 0.0, 0.0), footF=(4.6, 0.8, 8.0), eye=1.0), "io"),
    (0.46, k(dx=1.6, drop=-0.4, lean=6.0, armN=130.0, elbN=10.0, ladle=-74.0, head_rot=2.0, armF=-40.0, elbF=30.0, footN=(-4.2, 0.0, -20.0), footF=(3.4, 0.0, 0.0), eye=1.0,
             smear=1.0, full=0.0, glob=0.02), "in"),
    (0.54, k(dx=2.4, drop=1.6, lean=20.0, armN=74.0, elbN=10.0, ladle=14.0, head_rot=8.0, armF=-56.0, elbF=40.0, footN=(-5.0, 0.0, -24.0), footF=(2.6, 0.0, 0.0),
             smear=1.0, full=0.0, glob=0.2), "lin"),
    (0.86, k(dx=1.2, drop=1.4, lean=16.0, armN=56.0, elbN=30.0, ladle=-4.0, head_rot=-10.0, armF=-20.0, elbF=40.0, footN=(-3.8, 0.0, -8.0), footF=(2.6, 0.0, 0.0), full=0.0, glob=0.98), "out"),
    (1.00, k(glob=1.0), "io"),
]

# Hit: a creature that light is all but knocked off its feet; the slag slops out of the ladle.
HURT_KEYS = stagger_keys(BASE, push=5.2, bend=18.0, buckle=1.8, whip=28.0, over={
    "impact": dict(armN=40.0, elbN=40.0, ladle=-50.0, armF=20.0, elbF=30.0, spill=0.02, eye=1.0),
    "mid": dict(armN=70.0, elbN=20.0, ladle=-80.0, armF=-20.0, elbF=40.0, spill=0.3, eye=0.6),
    "reel": dict(armN=96.0, elbN=10.0, ladle=-104.0, armF=-60.0, elbF=50.0, spill=0.6, eye=0.3),
    "catch": dict(armN=20.0, elbN=64.0, ladle=-20.0, armF=30.0, elbF=30.0, spill=0.98, eye=1.0),
    "recover": dict(armN=26.0, elbN=62.0, ladle=-28.0, armF=0.0, elbF=36.0, spill=1.0, eye=0.8),
})

# Death: the blow lifts it clean off the ground and over backwards; it comes down on its face, rump in the air,
# and the ladle lands ahead of it with the slag running out and going dark.
_FACE = dict(dx=-12.0, drop=2.5, lean=-245.0, head_rot=0.0, armN=96.0, elbN=-10.0, armF=84.0, elbF=6.0, footN=(-3.5, 0.3, -160.0), footF=(-1.5, 0.3, -160.0),
             ladle_free=1.0, ladle_at=(4.0, 1.4), ladle=4.0, full=0.0, eye=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.08, k(dx=-1.6, drop=0.6, lean=-16.0, head_rot=-20.0, armN=70.0, elbN=20.0, ladle=-90.0, armF=-40.0, elbF=40.0, footN=(-1.0, 0.0, 0.0), footF=(4.4, 1.2, 10.0),
             ladle_free=0.2, ladle_at=(6.0, 24.0), spill=0.02, eye=1.0), "out3"),
    (0.22, k(dx=-4.0, drop=-7.0, lean=-60.0, head_rot=-10.0, armN=120.0, elbN=20.0, armF=-80.0, elbF=30.0, footN=(-2.0, 7.0, -30.0), footF=(3.0, 9.0, 20.0),
             ladle_free=1.0, ladle_at=(8.0, 27.0), ladle=-160.0, full=0.0, spill=0.4, eye=0.6), "out"),
    (0.36, k(dx=-8.0, drop=-9.0, lean=-165.0, head_rot=0.0, armN=60.0, elbN=40.0, armF=-120.0, elbF=40.0, footN=(-1.0, 12.0, -60.0), footF=(2.0, 13.0, -20.0),
             ladle_free=1.0, ladle_at=(7.0, 22.0), ladle=-250.0, full=0.0, spill=0.8, eye=0.4), "lin"),
    (0.48, k(dx=-11.0, drop=-3.0, lean=-225.0, armN=90.0, elbN=10.0, armF=70.0, elbF=10.0, footN=(-2.5, 6.0, -120.0), footF=(-0.5, 7.0, -100.0),
             ladle_free=1.0, ladle_at=(5.0, 10.0), ladle=-330.0, full=0.0, spill=1.0, eye=0.3), "in"),
    (0.56, k(**{**_FACE, "ladle": -356.0}, puddle=1.0, spill=1.0), "in"),
    (0.64, k(**{**_FACE, "drop": 1.2, "lean": -238.0, "ladle": -356.0}, puddle=0.9, spill=1.0), "out"),
    (0.74, k(**{**_FACE, "ladle": -356.0}, puddle=0.7, spill=1.0), "in"),
    (0.88, k(**{**_FACE, "ladle": -356.0}, puddle=0.35, spill=1.0), "lin"),
    (1.00, k(**{**_FACE, "ladle": -356.0}, puddle=0.1, spill=1.0), "lin"),
]

STILL = lambda t: (-0.2 + 0.25 * math.sin(math.tau * 2 * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [120] * 12, True, STILL),
    "run": Anim("run", scamper_pose, [i / 10 for i in range(10)], [48] * 10, True, lambda t: (-0.8, 0.0)),
    "attack": Anim("attack", keyed(LOB_KEYS), [0.0, 0.10, 0.20, 0.29, 0.38, 0.46, 0.54, 0.60, 0.66, 0.72, 0.78, 0.86, 0.93, 1.0],
                   [70, 70, 90, 100, 140, 40, 60, 60, 60, 60, 60, 80, 80, 100], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.04, 0.08, 0.15, 0.22, 0.29, 0.36, 0.42, 0.48, 0.52, 0.56, 0.64, 0.74, 0.88, 1.0],
                  [50, 40, 70, 60, 70, 60, 70, 60, 60, 50, 70, 90, 110, 200, 1200], False, STILL),
}
