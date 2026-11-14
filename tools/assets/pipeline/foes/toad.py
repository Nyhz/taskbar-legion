"""Mire Toad — world 3, beast. A toad the size of a boar, with its own rig: a hand-drawn body on folded hind legs
and short forelegs, a throat sac that swells, poison sacs glowing along its back. It does not walk, it HOPS:
crouch, a leap with all four feet off the ground, a heavy landing that splashes. It attacks with its tongue — the
mouth gapes, the tongue shoots a body-length out and snaps back. When it dies the sacs on its back burst one by
one, it sags onto its chin and the tongue rolls out.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Character, Pose, Pt, ik, keyed

FIGURE = ("Toad", "foe", "w03")

THIGH, SHIN, UPPER, FORE = 7.0, 7.0, 4.6, 4.6
BUILD = Build(root_x=40, thigh=THIGH, shin=SHIN, foot=0.0, hip_dx=0.0, spine=0.0, sh_near=0.0, sh_far=0.0, upper=0.0, fore=0.0, neck=0.0)

L = {
    "a": ("moss", 0), "b": ("moss", 1), "c": ("moss", 2), "d": ("moss", 3), "e": ("moss", 4), "f": ("moss", 5),
    "p": ("bone", 3), "q": ("bone", 4), "r": ("bone", 6), "k": ("ink", 0), "w": ("crimson", 2), "Z": ("bone", 7),
    "O": ("crimson", 5), "o": ("crimson", 3), "E": ("brass", 7),
}

# A fat warty body, the head part of it: a bulging eye on top, the wide mouth line, the pale belly. S T U V are
# the poison sacs (their tones follow the pose).
BODY = [
    "................ooo.....",
    ".......bbcc....oOOEo....",
    "....bbccSSdcc.cdOOEod...",
    "..bbccddddTTddddeeooeee.",
    ".bbcUUddddddddeeeeeeefff",
    "abbcdddwdddVVdeeeeeefffe",
    "abbcddddddddddeeeekZkZkZ",
    "abbccdddwdddddeekkqqrrrq",
    "abbccddddddddeeqqqrrrrq.",
    ".abbccdddddddqqqrrrrqq..",
    ".aabbccddddppqqqrrrqq...",
    "..aabbccccppppqqqqqq....",
    "...aaabbbbpppppppp......",
    ".....aaaaaapppp.........",
]
#: The sacs, in the body's frame (x forward, y down, from the body's centre), and when each bursts as it dies.
SACS = {"S": ((-3.5, -4.5), 0.2), "T": ((-1.5, -3.5), 0.4), "U": ((-7.5, -2.5), 0.6), "V": ((-0.5, -1.5), 0.8)}

#: Bony spines along the spine and two horns over the eye: (x, y in the body's frame, length, lean in degrees).
SPINES = [(-9.5, -3.0, 3.0, -128.0), (-7.0, -4.6, 4.0, -122.0), (-4.5, -5.6, 4.6, -116.0), (-2.0, -6.0, 5.0, -110.0), (0.5, -6.0, 4.4, -104.0),
          (3.0, -6.0, 3.6, -98.0), (5.0, -7.4, 4.6, -112.0), (7.6, -7.2, 5.6, -70.0)]
BODY_H = 9.0
HIP, SHOULDER = (-7.0, 3.0), (6.0, 4.0)
HIND_X, FRONT_X = -8.0, 9.0
MOUTH = (11.5, -0.5)
TONGUE = 34.0
LEGS = (("hf", (HIP[0] + 1.5, HIP[1] - 0.5), HIND_X + 2.0, THIGH, SHIN, -1), ("ff", (SHOULDER[0] + 1.5, SHOULDER[1] - 0.3), FRONT_X + 2.0, UPPER, FORE, 1),
        ("hn", HIP, HIND_X, THIGH, SHIN, -1), ("fn", SHOULDER, FRONT_X, UPPER, FORE, 1))


class Toad(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        rx = BUILD.root_x + pose.get("dx", 0.0)
        by = GROUND - BODY_H + pose.get("dy", 0.0)
        pitch = pose.get("pitch", 0.0)
        a = math.radians(pitch)
        ca, sa = math.cos(a), math.sin(a)

        def at(x: float, y: float) -> Pt:
            return (rx + x * ca - y * sa, by + x * sa + y * ca)

        J: dict[str, Pt] = {"body": (rx, by), "mouth": at(*MOUTH), "throat": at(7.5, 4.5), "eye": at(5.5, -5.0), "lean": (pitch, 0.0)}
        for key_, (pos, _when) in SACS.items():
            J["sac" + key_] = at(*pos)
        for i, (x, y, _n, _lean) in enumerate(SPINES):
            J[f"spine{i}"] = at(x, y)
        for name, root, rest, l1, l2, bend in LEGS:
            fx, lift = pose[name]
            top = at(*root)
            knee, foot = ik(top, (rx + rest + fx, GROUND - 1.2 - lift), l1, l2, bend)
            J[name + "_top"], J[name + "_knee"], J[name + "_foot"] = top, knee, foot
        return J

    def leg(self, cel: Cel, J: dict[str, Pt], name: str, far: bool) -> None:
        top, knee, foot = J[name + "_top"], J[name + "_knee"], J[name + "_foot"]
        hind = name[0] == "h"
        cel.limb(top, knee, 5.4 if hind else 3.4, 3.8 if hind else 2.8, "moss", (2, 3, 5), far=far)
        cel.limb(knee, foot, 3.6 if hind else 2.8, 2.6 if hind else 2.2, "moss", (2, 3, 5), far=far)
        # A long webbed foot, flat while it is on the ground, trailing when it is in the air.
        a = math.radians(J["lean"][0] + (0.0 if foot[1] > GROUND - 2.5 else 35.0 if hind else 20.0))
        reach = 5.5 if hind else 3.4
        toe = (foot[0] + math.cos(a) * reach, foot[1] + math.sin(a) * reach)
        cel.limb(foot, toe, 2.4, 1.6, "moss", (3, 4, 6), far=far)
        cel.put(toe[0], toe[1], ("bone", 4 if far else 6))

    def draw(self, cel, J, pose, ropes, between) -> None:
        pitch = pose.get("pitch", 0.0)
        a = math.radians(pitch)
        glow, pop = pose.get("glow", 0.5), pose.get("pop", 0.0)
        live = ("light", 0) if glow >= 0.8 else ("brass", 6) if glow >= 0.4 else ("moss", 7) if glow >= 0.1 else ("moss", 3)
        Lf = {**L, **{key_: (("ink", 2) if pop >= when else live) for key_, (_pos, when) in SACS.items()}}
        self.leg(cel, J, "hf", far=True)
        self.leg(cel, J, "ff", far=True)
        bx, by = J["body"]
        # The throat sac swells out under the jaw.
        throat = pose.get("throat", 0.0)
        tx, ty = J["throat"]
        r = 2.0 + 3.0 * throat
        for dy in range(-int(r) - 1, int(r) + 2):
            for dx in range(-int(r) - 1, int(r) + 2):
                dd = math.hypot(dx, dy)
                if dd <= r:
                    cel.put(tx + dx + throat * 1.2, ty + dy + throat * 1.0, ("bone", 7) if dd < r * 0.4 and throat > 0.3 else ("bone", 6) if dd < r * 0.75 else ("bone", 4))
        for i, (_x, _y, n, lean) in enumerate(SPINES):
            q = J[f"spine{i}"]
            b_ = math.radians(lean + pitch + pose.get("bristle", 0.0) * (1.0 if i < 6 else 0.3))
            cel.limb((q[0], q[1] + 1.2), (q[0] + math.cos(b_) * n, q[1] + math.sin(b_) * n), 2.4, 0.8, "bone", (3, 5, 7))
        cel.stamp_pivot(BODY, Lf, (bx, by), 12.0, 7.0, pitch)
        mx, my = J["mouth"]
        gape = pose.get("gape", 0.0)
        if gape > 0.15:
            # The mouth opens: a dark wedge with the red of the gullet in it.
            for i in range(int(2 + gape * 5)):
                for j in range(int(1 + gape * 3 * (i + 1) / 6)):
                    cel.put(mx - i * math.cos(a) - j * math.sin(a), my - i * math.sin(a) + j * math.cos(a) + 1, ("crimson", 3) if j > 0 and i < 4 else ("ink", 0))
        self.leg(cel, J, "hn", far=False)
        self.leg(cel, J, "fn", far=False)
        # The tongue: shot out straight, sagging a little in the middle; when it is dead it only hangs.
        tongue, loll = pose.get("tongue", 0.0), pose.get("loll", 0.0)
        tip = None
        if tongue > 0.03:
            reach = TONGUE * tongue
            tip = (mx + math.cos(a * 0.3) * reach, my + 1.0 + math.sin(a * 0.3) * reach)
            mid = ((mx + tip[0]) / 2, (my + 1.0 + tip[1]) / 2 + 1.6 * math.sin(math.pi * tongue))
            cel.limb((mx - 1.0, my + 1.0), mid, 2.4, 2.0, "crimson", (3, 5, 6))
            cel.limb(mid, tip, 2.0, 1.8, "crimson", (3, 5, 6))
            for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1), (0, -1), (2, 0)):
                cel.put(tip[0] + dx, tip[1] + dy, ("crimson", 6))
        elif loll > 0.03:
            end = (mx + 2.0 + 5.0 * loll, min(GROUND - 1.5, my + 2.0 + 7.0 * loll))
            cel.limb((mx - 1.0, my + 1.0), (mx + 1.5, end[1] - 0.5), 2.2, 2.0, "crimson", (2, 4, 5))
            cel.limb((mx + 1.5, end[1] - 0.5), end, 2.0, 1.6, "crimson", (2, 4, 5))
        cel.outline()

        # Fx: the eye shuts, the sacs burst, the tongue lands, the landing splashes.
        ex, ey = J["eye"]
        if pose.get("blink", 0.0) > 0.5:
            for i in range(-1, 3):
                for j in range(-1, 2):
                    cel.put(ex + i * math.cos(a) - j * math.sin(a), ey + i * math.sin(a) + j * math.cos(a), ("moss", 3) if j == 0 else ("moss", 5))
        for key_, (_pos, when) in SACS.items():
            if when <= pop < when + 0.14:
                sx, sy = J["sac" + key_]
                u = (pop - when) / 0.14
                for i in range(7):
                    ang = math.tau * i / 7 - 1.2
                    cel.soft(sx + math.cos(ang) * (2.0 + 4.0 * u), sy + math.sin(ang) * (2.0 + 4.0 * u) - 2.0 * u, ("moss", 8) if i % 2 else ("brass", 6))
        if tip is not None and pose.get("hit", 0.0) > 0.5:
            cel.star(tip[0] + 2, tip[1], 3)
        # Live sacs light the skin around them.
        for key_, (_pos, when) in SACS.items():
            if pop < when and glow >= 0.4:
                sx, sy = J["sac" + key_]
                cel.put(sx, sy - 1, ("brass", 6) if glow < 0.8 else ("brass", 7))
        splash = pose.get("splash", 0.0)
        if splash > 0.05:
            fx_, fy_ = J["fn_foot"]
            for i in range(8):
                ang = math.radians(-160 + i * 20.0)
                dist = 2.0 + 6.0 * (1.2 - splash)
                cel.soft(fx_ + math.cos(ang) * dist * 1.3, GROUND - 2 + math.sin(ang) * dist, ("sea", 7) if i % 2 else ("bone", 7))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, dy=0.0, pitch=0.0, hn=(0.0, 0.0), hf=(0.0, 0.0), fn=(0.0, 0.0), ff=(0.0, 0.0), throat=0.0, glow=0.5, blink=0.0, tongue=0.0, gape=0.0,
                  hit=0.0, splash=0.0, pop=0.0, loll=0.0, bristle=0.0, flash=0.0)


def k(**over: object) -> Pose:
    return {**BASE, **over}


def all_feet(x: float, lift: float = 0.0) -> dict[str, tuple[float, float]]:
    return {"hn": (x, lift), "hf": (x, lift), "fn": (x, lift), "ff": (x, lift)}


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    # It sits and breathes through its throat, fast; the sacs on its back brighten and dim; now and then it blinks.
    throat = 0.5 + 0.5 * math.sin(math.tau * 3 * ph)
    return {**BASE, "dy": 0.5 * s, "pitch": -2.0 + 1.5 * s, "throat": throat, "glow": 0.5 + 0.45 * math.sin(math.tau * (ph - 0.2)), "blink": 1.0 if 0.72 < ph < 0.8 else 0.0}


# The hop: crouch, launch off the hind legs, fly with them trailing, land forefeet first, settle.
HOP_KEYS = [
    (0.00, k(dy=1.5, pitch=4.0, glow=0.6), "lin"),
    (0.18, k(dy=2.2, pitch=8.0, throat=0.4, glow=0.9), "io"),
    (0.32, k(dy=-5.0, pitch=-22.0, hn=(-7.0, 0.0), hf=(-7.0, 0.0), fn=(2.0, 6.0), ff=(2.5, 7.0), glow=0.6), "in"),
    (0.50, k(dy=-10.0, pitch=-4.0, hn=(-10.0, 6.0), hf=(-10.0, 7.0), fn=(4.0, 9.0), ff=(4.5, 9.5), glow=0.4), "out"),
    (0.66, k(dy=-5.0, pitch=12.0, hn=(-8.0, 6.0), hf=(-8.0, 7.0), fn=(4.0, 3.0), ff=(4.5, 3.5), glow=0.4), "in"),
    (0.78, k(dy=2.6, pitch=6.0, hn=(-2.0, 1.5), hf=(-2.0, 2.0), fn=(1.0, 0.0), ff=(1.0, 0.0), splash=1.0, throat=0.6, glow=0.8), "in"),
    (0.90, k(dy=1.2, pitch=2.0, splash=0.3, throat=0.2, glow=0.6), "out"),
    (1.00, k(dy=1.5, pitch=4.0, glow=0.6), "io"),
]

# Tongue lash: it rocks back with its throat swollen, the mouth gapes, and the tongue is out and back in a blink.
ATTACK_KEYS = [
    (0.00, k(), "lin"),
    (0.20, k(dx=-2.0, dy=1.5, pitch=-8.0, throat=1.0, gape=0.3, glow=0.9, **all_feet(2.0)), "out"),
    (0.36, k(dx=-2.6, dy=1.8, pitch=-11.0, throat=1.0, gape=1.0, glow=1.0, bristle=-16.0, **all_feet(2.6)), "io"),
    (0.42, k(dx=3.0, dy=0.5, pitch=6.0, throat=0.2, gape=1.0, tongue=1.0, glow=1.0, **all_feet(-3.0)), "in"),
    (0.47, k(dx=3.2, dy=0.6, pitch=7.0, throat=0.2, gape=1.0, tongue=1.0, hit=1.0, glow=1.0, **all_feet(-3.2)), "lin"),
    (0.52, k(dx=3.2, dy=0.6, pitch=7.0, throat=0.2, gape=1.0, tongue=1.0, glow=0.8, **all_feet(-3.2)), "lin"),
    (0.62, k(dx=1.5, dy=0.4, pitch=2.0, throat=0.4, gape=0.8, tongue=0.4, glow=0.6, **all_feet(-1.5)), "in"),
    (0.70, k(dx=0.8, dy=0.8, pitch=-3.0, throat=0.9, gape=0.2, glow=0.5, **all_feet(-0.8)), "out"),
    (1.00, k(), "io"),
]

# Hit: knocked up and back off its forefeet, eyes shut; it lands flat, then hops back to where it sat.
HURT_KEYS = [
    (0.00, k(flash=0.0), "lin"),
    (0.07, k(dx=-1.0, dy=0.6, pitch=-6.0, blink=1.0, hn=(1.0, 0.0), hf=(1.0, 0.0), fn=(1.5, 2.0), ff=(1.5, 2.6), glow=1.0, flash=1.0), "out3"),
    (0.16, k(dx=-3.5, dy=-2.0, pitch=-17.0, blink=1.0, hn=(3.0, 0.0), hf=(3.0, 0.0), fn=(4.0, 6.0), ff=(4.5, 7.0), glow=0.2, bristle=-20.0, flash=0.5), "lin"),
    (0.26, k(dx=-5.5, dy=-1.0, pitch=-12.0, blink=1.0, hn=(4.0, 0.0), hf=(4.0, 0.0), fn=(5.0, 5.0), ff=(5.5, 5.6), glow=0.2, flash=0.0), "out"),
    (0.50, k(dx=-5.0, dy=1.8, pitch=5.0, blink=1.0, throat=0.9, splash=0.8, glow=0.4, flash=0.0), "in"),
    (0.74, k(dx=-2.2, dy=-3.0, pitch=-8.0, hn=(-3.0, 2.0), hf=(-3.0, 2.6), fn=(1.0, 3.0), ff=(1.0, 3.4), glow=0.6, flash=0.0), "io"),
    (1.00, k(flash=0.0), "io"),
]

# Death: the sacs on its back burst one after another, each one a jolt; then it sags onto its chin, hind legs
# sliding out behind it, and the tongue rolls out of its mouth.
_DOWN = dict(dx=-3.0, dy=2.3, pitch=9.0, hn=(-8.0, 0.0), hf=(-8.0, 0.0), fn=(4.0, 0.0), ff=(4.0, 0.0), throat=0.0, glow=0.0, blink=1.0, pop=1.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-2.5, dy=-1.5, pitch=-12.0, blink=1.0, hn=(2.5, 0.0), hf=(2.5, 0.0), fn=(3.0, 4.0), ff=(3.0, 5.0), glow=1.0), "out3"),
    (0.24, k(dx=-3.0, dy=1.0, pitch=2.0, throat=1.0, glow=1.0, pop=0.1), "in"),
    (0.34, k(dx=-3.0, dy=-1.4, pitch=-5.0, throat=1.0, glow=1.0, pop=0.3, fn=(0.0, 1.5), ff=(0.0, 2.0)), "out"),
    (0.44, k(dx=-3.0, dy=0.8, pitch=3.0, throat=0.9, glow=0.9, pop=0.5), "in"),
    (0.54, k(dx=-3.0, dy=-1.0, pitch=-4.0, throat=0.8, glow=0.8, pop=0.7, hn=(0.0, 1.0), hf=(0.0, 1.4)), "out"),
    (0.64, k(dx=-3.0, dy=0.8, pitch=4.0, throat=0.6, glow=0.6, pop=0.9, blink=1.0), "in"),
    (0.78, k(**_DOWN, loll=0.4), "io"),
    (0.90, k(**{**_DOWN, "dy": 2.5, "pitch": 10.0}, loll=1.0), "out"),
    (1.00, k(**{**_DOWN, "dy": 2.5, "pitch": 10.0}, loll=1.0), "lin"),
]

STILL = lambda t: (0.0, 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [140] * 12, True, STILL),
    "run": Anim("run", keyed(HOP_KEYS), [i / 12 for i in range(12)], [60] * 12, True, STILL),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.10, 0.20, 0.28, 0.36, 0.42, 0.47, 0.52, 0.57, 0.62, 0.70, 0.85, 1.0],
                   [80, 80, 90, 100, 160, 40, 60, 110, 50, 50, 90, 100, 110], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.17, 0.24, 0.29, 0.34, 0.39, 0.44, 0.49, 0.54, 0.59, 0.64, 0.71, 0.78, 0.84, 0.90, 1.0],
                  [50, 50, 70, 60, 90, 60, 70, 60, 70, 60, 70, 60, 90, 80, 100, 100, 140, 1200], False, STILL),
}
