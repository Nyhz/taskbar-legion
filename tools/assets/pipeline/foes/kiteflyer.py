"""Kite Acolyte — world 9, support. A temple novice in a wide straw hat and a dark blue tunic, with a red scarf, who
keeps a prayer kite in the air over its pack: a red diamond with gilt spars, a seal of light at the crossing and
two long ribbon tails. It stands leaning back on the line, hands high, and tugs it now and then: the kite bobs
and sways, the seal pulses and the tails ripple — that loop is its aura. It runs with the kite towed low behind
the hat. To attack it hauls the line down hard: the kite stoops forward and a spark leaps from its nose. When it
dies the line slips from its hands; it sits down and falls on its back, and the kite turns over and flutters down nose first, its ribbons streaming above it,
comes down nose first and stands planted in the road, dark, its ribbons fallen round it.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, keyed, stagger_keys

FIGURE = ("Kiteflyer", "foe", "w09")

BUILD = Build(root_x=40, thigh=5.8, shin=5.6, foot=3.4, hip_dx=1.3, spine=9.4, sh_near=2.8, sh_far=2.4, upper=5.0, fore=5.0, neck=0.4, head_dx=0.8,
              min_pelvis=3.4)

L = {
    "a": ("brass", 2), "b": ("brass", 3), "c": ("brass", 5), "d": ("brass", 6), "e": ("brass", 7),
    "k": ("ink", 1), "K": ("ink", 1), "S": ("skin", 4), "T": ("skin", 6),
    "r": ("crimson", 3), "s": ("crimson", 4), "t": ("crimson", 6),
    "u": ("azure", 1), "v": ("azure", 2), "w": ("azure", 3), "x": ("azure", 4),
}

# A wide straw hat tipped back, with a charm on its peak (Q) that burns with the kite's seal; the face under the
# brim, looking up the line; and the scarf's knot under the chin.
HEAD = [
    ".....QQ.....",
    "....bQQe....",
    "...bccdde...",
    ".abbccdddee.",
    "aabbccddddee",
    "....kSSTT...",
    "....kSSKT...",
    "....sSSTT...",
    "...rrsstt...",
]
# A dark blue tunic that flares below a red sash.
TORSO = [
    ".uvwx..",
    "uvwwxx.",
    "uvvwxx.",
    "uvvwwx.",
    "rrssttt",
    ".uvwwx.",
    "uuvwwx.",
    "uuvwwxx",
]

#: Where the kite flies at rest (x from the root, height above the ground) and where its spark lands.
KITE_AT = (11.0, 48.0)
SPARK_TO = (39.0, 9.0)


def rot(x: float, y: float, deg: float) -> Pt:
    a = math.radians(deg)
    return (x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a))


class Kiteflyer(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        kx, ky = pose["kite"]
        c = (BUILD.root_x + kx, GROUND - ky)
        t = pose.get("ktilt", 0.0)
        J["kite"] = c
        for name, (x, y) in (("kite_top", (0.0, -7.5)), ("kite_tail", (0.0, 9.5)), ("kite_l", (-6.5, -1.5)), ("kite_r", (6.5, -1.5))):
            ox, oy = rot(x, y, t)
            J[name] = (c[0] + ox, min(c[1] + oy, GROUND - 0.5))
        J["scarf"] = (J["chest"][0] - 2.4, J["chest"][1] + 0.5)
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def grounded(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i, (x, y) in enumerate(pts):
                if y > GROUND - 1.0:
                    pts[i] = (x, GROUND - 1.0)

        return {
            "tail1": ChainSpec(Chain(8, 2.3, gravity=0.07, drag=0.16, damp=0.05), lambda J: J["kite_tail"], grounded),
            "tail2": ChainSpec(Chain(6, 2.2, gravity=0.09, drag=0.13, damp=0.05), lambda J: J["kite_tail"], grounded),
            "scarf": ChainSpec(Chain(4, 2.0, gravity=0.16, drag=0.12, damp=0.06), lambda J: J["scarf"], grounded),
        }

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        cel.limb(J["hip" + s], J["knee" + s], 3.4, 2.8, "bone", (3, 4, 6), far=far)
        cel.limb(J["knee" + s], J["ankle" + s], 2.8, 2.4, "bone", (2, 4, 5), far=far)
        a_, t_ = J["ankle" + s], J["toe" + s]
        cel.limb((a_[0] - 0.8, a_[1] + 0.4), (t_[0], t_[1] + 0.2), 2.4, 1.8, "leather", (1, 2, 4), far=far)

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 2.8, 2.6, "azure", (1, 3, 4), far=far)
        cel.limb(el, hd, 2.6, 2.2, "azure", (2, 3, 5), far=far)
        cel.put(hd[0], hd[1], ("skin", 4 if far else 6))
        cel.put(hd[0], hd[1] - 1, ("skin", 3 if far else 5))

    @staticmethod
    def kite(cel: Cel, J: dict[str, Pt], glow: float) -> None:
        """A diamond kite: the far half in shade, the near half lit, two gilt spars and a seal at the crossing.
        With its seal out (`glow` near 0) it is a dark shape: dull cloth, tarnished spars."""
        top, tail, left, right = J["kite_top"], J["kite_tail"], J["kite_l"], J["kite_r"]
        mid = ((left[0] + right[0]) / 2, (left[1] + right[1]) / 2)
        dead = glow < 0.12
        far, near, lit = (("crimson", 1), ("crimson", 2), ("crimson", 3)) if dead else (("crimson", 3), ("crimson", 5), ("crimson", 6))
        for x, y in cel.poly_mask([top, left, tail]):
            cel.put(x, y, far)
        for x, y in cel.poly_mask([top, right, tail]):
            cel.put(x, y, near)
        for x, y in cel.poly_mask([top, right, mid]):
            cel.put(x, y, lit)
        cel.line(top, tail, ("brass", 2) if dead else ("brass", 5))
        cel.line(left, right, ("brass", 3) if dead else ("brass", 6))
        for p in (top, tail, left, right):
            cel.put(p[0], p[1], ("brass", 3) if dead else ("brass", 7))
        seal = ("light", 0) if glow > 0.55 else ("brass", 7) if glow > 0.2 else ("brass", 4) if not dead else ("ink", 1)
        for ox, oy in ((0, 0), (1, 0), (0, 1), (-1, 0), (0, -1)) if glow > 0.2 else ((0, 0),):
            cel.put(mid[0] + ox, mid[1] + oy, seal)

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        glow = pose.get("glow", 1.0)
        # The scarf's tail down the back.
        sc = ropes["scarf"]
        for i in range(len(sc) - 1):
            cel.limb(sc[i], sc[i + 1], 2.0, 1.6, "crimson", (3, 4, 6))
        self.arm(cel, J, "F", far=True)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        cel.stamp_lean(TORSO, L, (px + 0.5, py), 3, lean)
        hx, hy = J["head"]
        turn = pose.get("head_rot", 0.0) + (lean if abs(lean) > 30 else 0.0)
        Lg = {**L, "Q": ("light", 0) if glow > 0.55 else ("brass", 7) if glow > 0.2 else ("brass", 3)}
        cel.stamp_turn(HEAD, Lg, (hx, hy + 1), 5, turn)
        self.arm(cel, J, "N", far=False)
        # The kite, and its ribbons over it (they cross it when it falls).
        self.kite(cel, J, glow)
        dead = glow < 0.12
        for name, ramp in (("tail2", (3, 4, 5)), ("tail1", (4, 6, 7))):
            r = ropes[name]
            for i in range(len(r) - 1):
                if dead:
                    tone = ("crimson", 2 if i % 2 else 3)
                else:
                    tone = ("brass", ramp[2]) if (i % 3 == 2 and name == "tail1") else ("crimson", ramp[0] if i % 2 else ramp[1])
                cel.line(r[i], r[i + 1], tone)
            if name == "tail1" and not dead:
                cel.put(r[-1][0], r[-1][1], ("brass", 7))
        cel.outline()

        # The line from the hands to the kite: taut, or sagging when let go.
        if pose.get("line", 1.0) > 0.5:
            b = J["kite"]
            sag = pose.get("slack", 0.0)
            a = J["handN"]
            if pose.get("two", 1.0) > 0.5:
                for x, y in self.dots(a, J["handF"]):
                    cel.soft(x, y, ("ink", 6))
                a = J["handF"]
            prev = a
            for i in range(1, 9):
                u = i / 8
                p = (a[0] + (b[0] - a[0]) * u + sag * 3.0 * math.sin(math.pi * u), a[1] + (b[1] - a[1]) * u + sag * 5.0 * math.sin(math.pi * u))
                for x, y in self.dots(prev, p):
                    cel.soft(x, y, ("ink", 6))
                prev = p
        # The seal's light: a small cross of glow that pulses.
        c = J["kite"]
        mid = ((J["kite_l"][0] + J["kite_r"][0]) / 2, (J["kite_l"][1] + J["kite_r"][1]) / 2)
        if glow > 0.75:
            cel.star(mid[0], mid[1], 2 if glow > 1.05 else 1)
        if glow > 1.05:
            ox, oy = rot(0.5, -8.5, turn)  # the charm on the hat flares with it
            cel.star(hx + ox, hy + 1 + oy, 1)
        if glow > 1.05:
            ph = pose.get("flick", 0.0)
            for i in range(4):
                ang = math.tau * (i / 4 + ph * 0.5)
                cel.soft(c[0] + math.cos(ang) * 9.5, max(1.0, c[1] + math.sin(ang) * 10.0), ("light", 0) if i % 2 else ("brass", 7))
        spark = pose.get("spark", 0.0)
        if 0.01 < spark < 0.985:
            self.spark(cel, J["kite_tail"], spark)
        puff = pose.get("puff", 0.0)
        if 0.01 < puff < 0.985:
            for i in range(-3, 4):
                cel.soft(c[0] + i * (1.0 + 1.2 * puff), GROUND - 1, ("bone", 6) if abs(i) < 2 else ("bone", 4))

    @staticmethod
    def dots(a: Pt, b: Pt) -> list[Pt]:
        n = max(1, int(max(abs(b[0] - a[0]), abs(b[1] - a[1])) + 0.5))
        return [(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n) for i in range(n + 1)]

    @staticmethod
    def spark(cel: Cel, c: Pt, u: float) -> None:
        """A spark struck from the kite's nose: a short bright streak forward and down, and its burst."""
        x1, y1 = BUILD.root_x + SPARK_TO[0], GROUND - SPARK_TO[1]
        if u < 0.7:
            f = u / 0.7
            gx, gy = c[0] + (x1 - c[0]) * f, c[1] + (y1 - c[1]) * f
            cel.star(gx, gy, 1)
            for i in range(1, 6):
                g = max(0.0, f - i * 0.08)
                cel.soft(c[0] + (x1 - c[0]) * g + (i % 2), c[1] + (y1 - c[1]) * g - (i % 2), ("light", 0) if i < 2 else ("brass", 7) if i < 4 else ("crimson", 6))
        else:
            v = (u - 0.7) / 0.3
            if v < 0.5:
                cel.star(x1, y1, 2)
            for i in range(8):
                ang = math.radians(i * 45.0 + 22.0)
                d = 2.0 + 6.0 * v
                cel.soft(x1 + math.cos(ang) * d, y1 + math.sin(ang) * d, ("light", 0) if v < 0.35 else ("brass", 7) if i % 2 else ("crimson", 6))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=0.8, lean=-10.0, footN=(-3.2, 0.0, 0.0), footF=(3.4, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=58.0, elbN=64.0, armF=124.0, elbF=36.0, head_dx=0.0, head_dy=0.0, head_rot=-12.0, breath=0.0,
                  kite=KITE_AT, ktilt=14.0, glow=1.0, flick=0.0, line=1.0, two=1.0, slack=0.0, spark=0.0, puff=0.0)


def idle_pose(ph: float) -> Pose:
    # The kite rides a slow figure of eight; once a loop the acolyte tugs the line and the seal flares.
    s, s2 = math.sin(math.tau * ph), math.sin(2 * math.tau * ph)
    q = (ph - 0.55) % 1.0
    tug = math.sin(math.pi * q / 0.3) if q < 0.3 else 0.0
    lag = (ph - 0.63) % 1.0
    flare = math.sin(math.pi * lag / 0.4) if lag < 0.4 else 0.0
    return {**BASE, "drop": 0.8 + 0.8 * tug, "lean": -10.0 - 4.0 * tug + 1.5 * s, "armN": 58.0 - 16.0 * tug + 3.0 * s, "elbN": 64.0 + 10.0 * tug,
            "armF": 124.0 - 18.0 * tug + 4.0 * s, "elbF": 36.0 + 14.0 * tug, "head_rot": -12.0 - 3.0 * s,
            "kite": (KITE_AT[0] + 3.2 * s - 1.5 * tug, KITE_AT[1] + 1.8 * s2 + 2.4 * flare), "ktilt": 14.0 + 12.0 * math.cos(math.tau * ph) - 8.0 * tug,
            "glow": 0.9 + 0.35 * flare, "flick": ph}


def run_pose(ph: float) -> Pose:
    c = math.cos(math.tau * ph)
    p: Pose = gait_legs(Gait(stride=1.0, give=1.1, lift=1.0, toe=0.9, run=True, air=1.0), ph)
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 14.0 + 2.0 * math.cos(2 * math.tau * ph), "hip_rot": -0.5 * c, "sh_rot": 0.4 * c,
              "armN": -150.0 + 5.0 * c, "elbN": -20.0, "armF": 34.0 + 22.0 * c, "elbF": 50.0, "head_rot": 4.0 + 2.0 * c,
              "kite": (-13.0 + 1.5 * math.sin(2 * math.tau * ph), 47.0 + 1.6 * math.cos(2 * math.tau * (ph - 0.1))), "ktilt": -34.0 + 6.0 * math.sin(2 * math.tau * ph),
              "glow": 0.9, "flick": ph, "two": 0.0})
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Stoop: it reaches right up the line, then hauls it down to its hip; the kite stoops forward nose first and a
# spark leaps from it, then it lets the kite climb back.
STOOP_KEYS = [
    (0.00, k(), "lin"),
    (0.20, k(drop=0.2, lean=-14.0, armN=140.0, elbN=20.0, armF=146.0, elbF=16.0, head_rot=-20.0, kite=(8.0, 51.0), ktilt=-6.0, glow=1.1), "out"),
    (0.42, k(drop=0.0, lean=-18.0, armN=150.0, elbN=12.0, armF=154.0, elbF=10.0, head_rot=-24.0, kite=(5.0, 53.0), ktilt=-18.0, glow=1.3, footF=(3.8, 0.4, 6.0)), "io"),
    (0.50, k(dx=0.6, drop=3.0, lean=10.0, armN=40.0, elbN=60.0, armF=52.0, elbF=50.0, head_rot=2.0, kite=(22.0, 39.0), ktilt=118.0, glow=1.3, spark=0.02,
             footN=(-4.0, 0.0, -10.0)), "in"),
    (0.58, k(dx=0.8, drop=3.4, lean=13.0, armN=34.0, elbN=66.0, armF=46.0, elbF=56.0, head_rot=4.0, kite=(24.0, 36.0), ktilt=124.0, glow=0.8, spark=0.3,
             footN=(-4.2, 0.0, -12.0)), "lin"),
    (0.80, k(dx=0.2, drop=1.6, lean=-2.0, armN=96.0, elbN=44.0, armF=106.0, elbF=40.0, head_rot=-8.0, kite=(17.0, 45.0), ktilt=50.0, glow=0.7, spark=0.98), "io"),
    (1.00, k(spark=1.0), "io"),
]

# Hit: it is knocked back off its line; the kite lurches and the line goes slack for a moment.
HURT_KEYS = stagger_keys(BASE, push=4.4, bend=14.0, buckle=1.8, whip=22.0, over={
    "impact": dict(armN=100.0, elbN=40.0, armF=110.0, elbF=40.0, kite=(13.0, 50.0), ktilt=30.0, glow=1.3),
    "mid": dict(armN=70.0, elbN=50.0, armF=60.0, elbF=60.0, kite=(6.0, 46.0), ktilt=-30.0, glow=0.5, slack=0.6),
    "reel": dict(armN=60.0, elbN=40.0, armF=40.0, elbF=70.0, kite=(2.0, 43.0), ktilt=-44.0, glow=0.4, slack=1.0),
    "catch": dict(armN=100.0, elbN=50.0, armF=112.0, elbF=40.0, kite=(6.0, 45.0), ktilt=-10.0, glow=0.6, slack=0.5),
    "recover": dict(armN=58.0, elbN=64.0, armF=124.0, elbF=36.0, kite=(10.0, 48.0), ktilt=10.0, glow=0.8),
})

# Death: the line slips out of its hands; it sits down and goes over on its back. The kite, let go, flutters down
# like a leaf — side to side, tilting each way — lands on the road in front and its seal goes dark.
_DOWN = dict(dx=-3.0, drop=14.0, lean=-84.0, head_rot=-6.0, armN=-60.0, elbN=-20.0, armF=-80.0, elbF=-10.0, footN=(8.5, 0.3, 60.0), footF=(10.5, 0.3, 66.0), line=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.08, k(dx=-1.6, drop=0.4, lean=-24.0, head_rot=-26.0, armN=150.0, elbN=10.0, armF=100.0, elbF=40.0, footN=(-2.0, 0.0, 0.0), footF=(4.6, 1.2, 14.0), kite=(13.0, 51.0), ktilt=34.0,
             glow=1.3), "out3"),
    (0.20, k(dx=-2.0, drop=5.0, lean=-16.0, head_rot=-8.0, armN=80.0, elbN=40.0, armF=40.0, elbF=40.0, footN=(-1.0, 0.0, 0.0), footF=(5.0, 0.0, 0.0), line=0.0, kite=(17.0, 50.0), ktilt=70.0,
             glow=0.8), "io"),
    (0.34, k(dx=-2.6, drop=11.0, lean=-30.0, head_rot=-12.0, armN=-20.0, elbN=30.0, armF=-40.0, elbF=20.0, footN=(4.0, 0.0, 30.0), footF=(7.0, 0.0, 40.0), line=0.0, kite=(11.0, 42.0),
             ktilt=150.0, glow=0.6), "io"),
    (0.46, k(**_DOWN, kite=(20.0, 33.0), ktilt=205.0, glow=0.5), "io"),
    (0.58, k(**_DOWN, kite=(13.0, 24.0), ktilt=150.0, glow=0.4), "io"),
    (0.70, k(**_DOWN, kite=(21.0, 15.0), ktilt=200.0, glow=0.3), "io"),
    (0.80, k(**_DOWN, kite=(20.0, 9.0), ktilt=172.0, glow=0.25, puff=0.02), "in"),
    (0.88, k(**_DOWN, kite=(20.0, 8.5), ktilt=158.0, glow=0.1, puff=0.7), "out"),
    (1.00, k(**_DOWN, kite=(20.0, 8.5), ktilt=164.0, glow=0.0, puff=1.0), "io"),
]

BREEZE = lambda t: (-0.55 + 0.25 * math.sin(math.tau * 2 * t), -0.06 + 0.05 * math.sin(math.tau * (2 * t + 0.25)))  # noqa: E731
# The kite turns nose down as it falls and the air rushing past streams its ribbons out above it; once it is
# down they drop.
FALL = lambda t: (-0.2 + 0.3 * math.sin(math.tau * 3 * t), -0.7) if 0.16 < t < 0.8 else (-0.1, 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [120] * 12, True, BREEZE),
    "run": Anim("run", run_pose, [i / 10 for i in range(10)], [50] * 10, True, lambda t: (-1.0, 0.0)),
    "attack": Anim("attack", keyed(STOOP_KEYS), [0.0, 0.10, 0.20, 0.31, 0.42, 0.50, 0.58, 0.65, 0.72, 0.80, 0.90, 1.0],
                   [70, 80, 100, 110, 150, 40, 60, 60, 60, 70, 90, 110], False, BREEZE),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, BREEZE),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.04, 0.08, 0.14, 0.20, 0.27, 0.34, 0.40, 0.46, 0.52, 0.58, 0.64, 0.70, 0.75, 0.80, 0.85, 0.90, 1.0],
                  [50, 40, 80, 70, 80, 80, 80, 80, 80, 80, 80, 80, 80, 70, 60, 80, 160, 1200], False, FALL),
}
