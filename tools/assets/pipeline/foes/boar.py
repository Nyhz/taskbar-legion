"""Bristleback Boar — world 1, brute. A four-legged rig: a hand-drawn barrel body and head on four two-bone legs,
with a crest of blood-dark quills that rattle as it moves. It gallops (the body rocks, the legs gather and stretch,
all four leave the ground), coils and gores with an upward rip of the tusks, and dies by folding onto its belly.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Pose, Pt, ik, keyed

BUILD = Build(root_x=40, thigh=4.8, shin=5.0, foot=0.0, hip_dx=0.0, spine=0.0, sh_near=0.0, sh_far=0.0, upper=0.0, fore=0.0, neck=0.0)

L = {
    "k": ("ink", 1), "l": ("leather", 1), "m": ("leather", 2), "n": ("leather", 3), "o": ("leather", 4), "p": ("leather", 5),
    "s": ("skin", 2), "S": ("skin", 3), "T": ("bone", 7), "t": ("bone", 5), "E": ("crimson", 5), "O": ("brass", 6),
}

# Heavy in front: a shoulder hump over the forelegs falling away to small hindquarters; a scar across the flank.
BODY = [
    "..................kk......",
    "...............k.kllk.k...",
    "..........k..k.klmmlkklk..",
    "......k.kklkklllmnnmllmlk.",
    "...kklllmmmmmmmnnooonnmml.",
    "..lmmmnnnnnnnnnoooppoonnm.",
    ".lmmnnnooooooooopppppoonml",
    "lmmnnooooopooooopppppponml",
    "lmmnnoooopoooooooppppoonml",
    "lmmnnnooooooooooooppooonm.",
    "lmmmnnnooooooooooooooonnm.",
    ".lmmmnnnnnooooooooonnnmm..",
    ".llmmmmnnnnnnnnnnnnnmmml..",
    "..lllmmmmmmmmmmmmmmmlll...",
    "....llllllllllllllll......",
]
# A wedge of a head with a brow ridge, a torn ear, an ember eye, a scar, and two tusks curving up over the lip.
HEAD = [
    "...ll...........",
    "..lmnl..........",
    ".lmnnnmml.......",
    "lmnnoonnnmml....",
    "lmnokOEoonnnmm..",
    "lmnooookooTTonmS",
    "lmnoooooooTTooSs",
    ".lmnnooooTTtpSSs",
    "..lmmnnnTTtpppS.",
    "...llmmmmttmmm..",
    "....lllmmmmml...",
    "......lllll.....",
]

LEG_H = 9.0
SHOULDER, HIP = (7.5, 3.5), (-8.5, 3.5)
FRONT_X, HIND_X = 8.5, -9.0
# Quills along the spine: (x from the body's centre, y of the back there, length).
QUILLS = [(-9.0, -4.6, 3.6), (-6.0, -5.4, 4.2), (-3.0, -5.8, 4.8), (0.0, -6.2, 5.6), (3.0, -6.8, 6.6), (6.0, -7.4, 7.4), (8.5, -7.0, 6.0)]


class Boar(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        rx = BUILD.root_x + pose.get("dx", 0.0)
        by = GROUND - LEG_H - 7.0 + pose.get("dy", 0.0)
        a = math.radians(pose.get("pitch", 0.0))
        ca, sa = math.cos(a), math.sin(a)

        def at(x: float, y: float) -> Pt:
            return (rx + x * ca - y * sa, by + x * sa + y * ca)

        J: dict[str, Pt] = {"body": (rx, by), "neck": at(12.5, -0.5), "withers": at(8.0, -1.0), "tail": at(-12.5, -3.0), "lean": (pose.get("pitch", 0.0), 0.0)}
        for i, (x, y, _n) in enumerate(QUILLS):
            J[f"quill{i}"] = at(x, y)
        for name, root, rest, bend in (("fn", SHOULDER, FRONT_X, -1), ("ff", (SHOULDER[0] + 1.4, SHOULDER[1]), FRONT_X + 1.4, -1),
                                       ("hn", HIP, HIND_X, 1), ("hf", (HIP[0] + 1.4, HIP[1]), HIND_X + 1.4, 1)):
            fx, lift = pose[name]
            top = at(*root)
            knee, foot = ik(top, (rx + rest + fx, GROUND - 1.0 - lift), BUILD.thigh, BUILD.shin, bend)
            J[name + "_top"], J[name + "_knee"], J[name + "_foot"] = top, knee, foot
        return J

    def chains(self) -> dict[str, ChainSpec]:
        return {"tail": ChainSpec(Chain(3, 1.9, gravity=0.16, drag=0.12, damp=0.1), lambda J: J["tail"], None, (-0.7, 0.7))}

    def leg(self, cel: Cel, J: dict[str, Pt], name: str, far: bool) -> None:
        top, knee, foot = J[name + "_top"], J[name + "_knee"], J[name + "_foot"]
        cel.limb(top, knee, 5.0, 3.2, "leather", (2, 3, 4), far=far)
        cel.limb(knee, foot, 3.0, 2.3, "leather", (1, 2, 3), far=far)
        cel.limb((foot[0] - 0.5, foot[1] - 0.2), (foot[0] + 1.0, foot[1] + 0.4), 2.8, 2.8, "ink", (0, 1, 3), far=far)

    def draw(self, cel, J, pose, ropes, between) -> None:
        pitch = pose.get("pitch", 0.0)
        self.leg(cel, J, "ff", far=True)
        self.leg(cel, J, "hf", far=True)
        tail = ropes["tail"]
        for i in range(len(tail) - 1):
            cel.limb(tail[i], tail[i + 1], 1.6, 1.2, "leather", (1, 2, 3))
        # Quills: raked back, rattling with the body's motion.
        rake = math.radians(-118.0 + pitch + pose.get("quills", 0.0))
        for i, (_x, _y, n) in enumerate(QUILLS):
            q = J[f"quill{i}"]
            lag = math.radians(pose.get("quills", 0.0) * 0.5 * math.sin(i * 1.3))
            tip = (q[0] + math.cos(rake + lag) * n, q[1] + math.sin(rake + lag) * n)
            cel.limb((q[0], q[1] + 1.0), tip, 2.4, 0.9, "crimson", (1, 2, 4))
            cel.put(tip[0], tip[1], ("crimson", 5))
        bx, by = J["body"]
        cel.stamp_pivot(BODY, L, (bx, by), 13.0, 8.0, pitch)
        self.leg(cel, J, "fn", far=False)
        self.leg(cel, J, "hn", far=False)
        nx, ny = J["neck"]
        turn = pitch + pose.get("head_rot", 0.0)
        a = math.radians(turn)
        cel.limb(J["withers"], (nx + 2.0 * math.cos(a), ny + 2.0 * math.sin(a)), 10.0, 8.0, "leather", (2, 4, 5))
        cel.stamp_pivot(HEAD, L, (nx, ny), 2.5, 5.5, turn)
        cel.outline()
        # Fx on top: the eye burns, breath steams from the snout, dirt flies from the hind hooves.
        ex, ey = nx + 3.0 * math.cos(a) + 1.5 * math.sin(a), ny + 3.0 * math.sin(a) - 1.5 * math.cos(a)
        cel.put(ex, ey, ("brass", 6))
        cel.put(ex + 1, ey, ("crimson", 5))
        snort = pose.get("snort", 0.0)
        if snort > 0.05:
            sx, sy = nx + 14.0 * math.cos(a), ny + 14.0 * math.sin(a)
            for i in range(4):
                cel.soft(sx + 2.0 + i * 1.5 + snort * 4.0, sy - i * 0.9 - snort * 3.0, ("bone", 6 if i < 2 else 4))
        dust = pose.get("dust", 0.0)
        if dust > 0.05:
            for i in range(int(4 + dust * 6)):
                cel.soft(bx - 11.0 - i * 1.7 - dust * 3.0, GROUND - 1.5 - (i % 3) * 1.5 - dust * 2.5, ("leather", 5 if i % 2 else 4))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, dy=0.0, pitch=0.0, head_rot=14.0, fn=(0.0, 0.0), ff=(0.0, 0.0), hn=(0.0, 0.0), hf=(0.0, 0.0), dust=0.0, quills=0.0, snort=0.0)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    # Head low, breath steaming; it rakes the ground with a fore hoof and its quills rise and fall.
    paw = max(0.0, math.sin(math.tau * (ph - 0.5) * 2.0)) if 0.5 < ph < 1.0 else 0.0
    snort = max(0.0, math.sin(math.tau * (ph - 0.05) * 2.0)) if 0.05 < ph < 0.3 else 0.0
    return {**BASE, "dy": 0.4 + 0.4 * s, "head_rot": 18.0 + 7.0 * late, "fn": (-2.2 * paw, 2.4 * paw), "quills": 10.0 * s, "snort": snort, "pitch": 1.5 * late,
            "dust": 0.25 * paw}


def _bound(q: float, reach: float, height: float) -> tuple[float, float]:
    """One hoof of a gallop: a short, hard stance, then a long reach forward well off the ground."""
    q %= 1.0
    if q < 0.3:
        return (reach * (1 - 2 * q / 0.3), 0.0)
    t = (q - 0.3) / 0.7
    ease = t * t * (3 - 2 * t)
    return (-reach + 2 * reach * ease, height * math.sin(math.pi * t) ** 0.8)


def gallop_pose(ph: float) -> Pose:
    # The forelegs land together, then the hind legs drive; between them the whole animal is in the air.
    fn, ff = _bound(ph, 5.2, 4.4), _bound(ph - 0.07, 5.2, 4.4)
    hn, hf = _bound(ph + 0.5, 5.6, 3.8), _bound(ph + 0.43, 5.6, 3.8)
    rock = math.sin(math.tau * (ph + 0.08))
    return {**BASE, "pitch": 8.0 * rock, "dy": -1.3 - 1.5 * math.cos(2 * math.tau * (ph - 0.42)), "head_rot": 12.0 - 7.0 * rock + 4.0 * math.sin(2 * math.tau * (ph - 0.2)),
            "fn": fn, "ff": ff, "hn": hn, "hf": hf, "quills": 14.0 * math.sin(math.tau * (ph - 0.12)),
            "dust": max(0.0, math.sin(math.tau * (ph - 0.52))) if 0.52 < ph < 0.85 else 0.0}


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Gore: it sinks back on its haunches with its head down, launches, and rips the tusks upward.
ATTACK_KEYS = [
    (0.00, k(), "lin"),
    (0.26, k(dx=-3.0, dy=1.6, pitch=-6.0, head_rot=38.0, fn=(2.0, 0.0), ff=(2.0, 0.0), hn=(2.6, 0.0), hf=(2.6, 0.0), quills=-14.0, snort=0.6), "out"),
    (0.40, k(dx=-3.8, dy=2.0, pitch=-7.0, head_rot=42.0, fn=(2.4, 0.0), ff=(2.4, 0.0), hn=(3.0, 0.0), hf=(3.0, 0.0), quills=-18.0, snort=1.0), "io"),
    (0.47, k(dx=4.0, dy=-1.2, pitch=6.0, head_rot=6.0, fn=(3.4, 3.2), ff=(4.0, 3.6), hn=(-4.4, 0.0), hf=(-4.4, 0.0), dust=1.0, quills=16.0), "in"),
    (0.54, k(dx=10.0, dy=0.2, pitch=3.0, head_rot=-42.0, fn=(1.0, 0.0), ff=(1.4, 0.0), hn=(-1.0, 2.6), hf=(-0.6, 3.0), dust=0.5, quills=10.0), "lin"),
    (0.66, k(dx=10.6, dy=0.7, pitch=-3.0, head_rot=-50.0, fn=(0.0, 0.0), ff=(0.0, 0.0), hn=(0.6, 0.0), hf=(0.6, 0.0), quills=-8.0), "out"),
    (0.84, k(dx=5.0, dy=0.3, head_rot=-6.0, fn=(-1.0, 1.4), hf=(-1.0, 1.4), quills=4.0), "io"),
    (1.00, k(), "io"),
]

# Hit: the blow knocks its head up and its forehooves off the ground; it skids back on its hind legs, comes down
# hard, shakes its head and steps back in. Feet are planted (x = −dx) unless lifted or skidding.
HURT_KEYS = [
    (0.00, k(flash=0.0), "lin"),
    (0.07, k(dx=-1.0, pitch=-5.0, head_rot=-18.0, fn=(2.0, 1.6), ff=(1.0, 0.0), hn=(1.0, 0.0), hf=(1.0, 0.0), quills=14.0, flash=1.0), "out3"),
    (0.16, k(dx=-3.0, dy=-1.2, pitch=-11.0, head_rot=-30.0, fn=(3.6, 4.2), ff=(4.0, 3.2), hn=(2.2, 0.0), hf=(2.2, 0.0), quills=22.0, dust=0.5, flash=0.5), "lin"),
    (0.26, k(dx=-4.6, dy=-0.6, pitch=-8.0, head_rot=-20.0, fn=(4.0, 3.0), ff=(4.4, 2.4), hn=(1.6, 0.0), hf=(1.6, 0.0), quills=10.0, dust=1.0, flash=0.0), "out"),
    (0.50, k(dx=-4.0, dy=1.2, pitch=5.0, head_rot=32.0, fn=(1.0, 0.0), ff=(1.0, 0.0), hn=(1.0, 0.0), hf=(1.0, 0.0), quills=-8.0, snort=0.6, flash=0.0), "in"),
    (0.74, k(dx=-1.8, dy=0.0, pitch=0.0, head_rot=2.0, fn=(1.3, 2.2), ff=(-1.2, 0.0), hn=(0.6, 1.6), hf=(-1.2, 0.0), quills=6.0, snort=1.0, flash=0.0), "io"),
    (1.00, k(flash=0.0), "io"),
]

# Death: the blow knocks its forequarters up, the legs go and it drops onto its belly, head last.
_DOWN = dict(dx=-1.0, dy=7.6, pitch=0.0, head_rot=22.0, fn=(4.6, 0.0), ff=(5.2, 0.0), hn=(-4.6, 0.0), hf=(-4.0, 0.0), quills=-26.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-3.0, dy=-1.2, pitch=-10.0, head_rot=-32.0, fn=(1.0, 3.4), ff=(1.6, 2.6), hn=(1.4, 0.0), hf=(1.4, 0.0), quills=20.0), "out3"),
    (0.30, k(dx=-2.4, dy=1.8, pitch=4.0, head_rot=12.0, fn=(1.0, 0.0), ff=(1.6, 0.0), hn=(-1.0, 0.0), hf=(-0.6, 0.0), quills=-6.0), "io"),
    (0.50, k(dx=-1.6, dy=5.0, pitch=8.0, head_rot=20.0, fn=(3.4, 0.0), ff=(4.0, 0.0), hn=(-2.4, 0.0), hf=(-2.0, 0.0), quills=-14.0), "in"),
    (0.62, k(**_DOWN), "lin"),
    (0.70, k(**{**_DOWN, "dy": 6.8, "head_rot": 6.0, "quills": -10.0}), "out"),
    (0.84, k(**{**_DOWN, "head_rot": 28.0}), "in"),
    (1.00, k(**{**_DOWN, "head_rot": 26.0}), "out"),
]

STILL = lambda t: (-0.15 + 0.25 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [170] * 12, True, STILL),
    "run": Anim("run", gallop_pose, [i / 10 for i in range(10)], [62] * 10, True, lambda t: (-1.2, 0.0)),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.13, 0.26, 0.40, 0.47, 0.54, 0.60, 0.66, 0.75, 0.84, 0.92, 1.0],
                   [80, 90, 110, 150, 40, 50, 90, 130, 100, 90, 90, 110], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.20, 0.30, 0.40, 0.50, 0.56, 0.62, 0.70, 0.77, 0.84, 1.0],
                  [50, 50, 80, 80, 90, 80, 70, 60, 80, 90, 90, 120, 1200], False, STILL),
}
