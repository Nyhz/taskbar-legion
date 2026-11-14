"""Rime Wolf — world 5, beast. A gaunt wolf as tall as a man's chest, with its own rig: the body is two hand-drawn
halves hinged at the middle of the back, so the spine really flexes — it gathers and stretches as it runs — on four
two-bone legs, with a hinged lower jaw and a brush of a tail. Ice has grown through its hackles in shards that
bristle when it is roused; its breath steams and its eye burns cold. It lopes, crouches and pounces with its jaws
open, and dies with a last howl: the ice on its back bursts and it goes down on its side.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Pose, Pt, ik, keyed

FIGURE = ("FrostWolf", "foe", "w05")

THIGH, SHIN = 5.6, 6.6
BUILD = Build(root_x=40, thigh=THIGH, shin=SHIN, foot=0.0, hip_dx=0.0, spine=0.0, sh_near=0.0, sh_far=0.0, upper=0.0, fore=0.0, neck=0.0)

L = {
    "k": ("ink", 1), "l": ("ink", 2), "m": ("ink", 3), "n": ("ink", 4), "o": ("ink", 5),
    "T": ("bone", 7), "N": ("ink", 0), "E": ("sea", 8),
}

# Forequarters: a deep chest under a shoulder hump, pale along the brisket. Its left edge is the hinge.
FORE = [
    "......kll.....",
    "...kklllmmlk..",
    "kkllllmmmmmlk.",
    "lllmmmmmnnmml.",
    "llmmomnnnnnmml",
    "llmomnonnnnmml",
    "llmmonnonnnmm.",
    ".llmmonnonnmm.",
    "..llmmmooomm..",
    "....llmmoom...",
    "......lmmm....",
]
# Hindquarters: a round haunch and a waist tucked up hard — it is starving. Its right edge is the hinge.
HIND = [
    "...kkllllllk.",
    ".kllmmmmmmmll",
    "kllmmnnnmmmml",
    "llmmnnnnnmmml",
    "llmmnnnnmmmll",
    "llmmmnnmmmll.",
    ".llmmmmmll...",
    "..llmmmll....",
    "...llmll.....",
]
# A long head: a tall pricked ear, the eye (E burns), a pale bridge to the muzzle, a black nose, the upper teeth bared.
HEAD = [
    "..k............",
    ".klk...........",
    ".klmk..........",
    ".llmmlkk.......",
    "klmnnmmllkk....",
    "klmnEEnnnmmlkk.",
    "klmnnnnonnnnmlN",
    ".lmmnnnnnnnmmlN",
    "..llmmmTmTmTm..",
    "...lllk........",
]
JAW = [
    "lmmmmmml.",
    ".lTmTmTl.",
    "..lllll..",
]

LEG_H = 11.0
SHOULDER, HIP = (8.5, 3.0), (-9.0, 2.5)
FRONT_X, HIND_X = 9.5, -10.0
# Ice shards through the hackles: (half, x, y on that half, length). "f" = forequarters, "h" = hindquarters.
SHARDS = [("h", -6.0, -4.4, 3.6), ("h", -2.5, -4.6, 4.4), ("f", 1.5, -4.8, 5.4), ("f", 4.5, -5.6, 7.0), ("f", 7.5, -5.4, 6.2), ("f", 10.5, -4.2, 4.6)]


class FrostWolf(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        rx = BUILD.root_x + pose.get("dx", 0.0)
        by = GROUND - LEG_H - 5.0 + pose.get("dy", 0.0)
        pitch, arch = pose.get("pitch", 0.0), pose.get("arch", 0.0)
        # The two halves turn opposite ways about the hinge: arch > 0 humps the back (both ends dip).
        af, ah = math.radians(pitch + arch), math.radians(pitch - arch)

        def fore(x: float, y: float) -> Pt:
            return (rx + x * math.cos(af) - y * math.sin(af), by + x * math.sin(af) + y * math.cos(af))

        def hind(x: float, y: float) -> Pt:
            return (rx + x * math.cos(ah) - y * math.sin(ah), by + x * math.sin(ah) + y * math.cos(ah))

        J: dict[str, Pt] = {"body": (rx, by), "neck": fore(12.5, -1.5), "withers": fore(9.0, -1.0), "tail": hind(-12.0, -2.0),
                            "turn": (pitch + arch, pitch - arch), "lean": (pitch, 0.0)}
        for i, (half, x, y, _n) in enumerate(SHARDS):
            J[f"shard{i}"] = fore(x, y) if half == "f" else hind(x, y)
        for name, at, root, rest, bend in (("fn", fore, SHOULDER, FRONT_X, -1), ("ff", fore, (SHOULDER[0] + 1.6, SHOULDER[1] - 0.4), FRONT_X + 1.8, -1),
                                           ("hn", hind, HIP, HIND_X, 1), ("hf", hind, (HIP[0] + 1.6, HIP[1] - 0.4), HIND_X + 1.8, 1)):
            fx, lift = pose[name]
            top = at(*root)
            knee, foot = ik(top, (rx + rest + fx, GROUND - 1.2 - lift), THIGH, SHIN, bend)
            J[name + "_top"], J[name + "_knee"], J[name + "_foot"] = top, knee, foot
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def grounded(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 2.0))

        return {"tail": ChainSpec(Chain(5, 2.6, gravity=0.14, drag=0.14, damp=0.1), lambda J: J["tail"], grounded, (-0.8, 0.6))}

    def leg(self, cel: Cel, J: dict[str, Pt], name: str, far: bool) -> None:
        top, knee, foot = J[name + "_top"], J[name + "_knee"], J[name + "_foot"]
        cel.limb(top, knee, 3.8, 2.3, "ink", (1, 2, 4), far=far)
        cel.limb(knee, foot, 2.1, 1.5, "ink", (1, 2, 4), far=far)
        # A long paw, rimed with frost.
        cel.limb((foot[0] - 0.2, foot[1] + 0.2), (foot[0] + 2.0, foot[1] + 0.4), 1.8, 1.5, "azure", (3, 5, 6), far=far)

    def draw(self, cel, J, pose, ropes, between) -> None:
        tf, th = J["turn"]
        self.leg(cel, J, "ff", far=True)
        self.leg(cel, J, "hf", far=True)
        tail = ropes["tail"]
        widths = [3.6, 4.2, 4.0, 3.0, 1.6]
        for i in range(len(tail) - 1):
            cel.limb(tail[i], tail[i + 1], widths[i], widths[i + 1], "ink", (1, 2, 4))
        cel.put(tail[-1][0], tail[-1][1], ("azure", 7))
        # Ice through the hackles, drawn behind the body so it grows out of the back.
        ice = pose.get("ice", 1.0)
        if ice > 0.05:
            for i, (half, _x, _y, n) in enumerate(SHARDS):
                q = J[f"shard{i}"]
                rake = math.radians(-112.0 + (tf if half == "f" else th) + pose.get("hackles", 0.0) * (0.7 + 0.3 * math.sin(i * 1.7)))
                tip = (q[0] + math.cos(rake) * n * ice, q[1] + math.sin(rake) * n * ice)
                cel.limb((q[0], q[1] + 1.2), tip, 2.6, 0.8, "azure", (5, 7, 8))
                cel.put(tip[0], tip[1], ("light", 0))
        bx, by = J["body"]
        cel.stamp_pivot(HIND, L, (bx + 1.0, by), 12.5, 4.5, th)
        cel.stamp_pivot(FORE, L, (bx - 1.0, by), 0.5, 5.5, tf)
        cel.limb((bx - 2.0, by - 1.0), (bx + 2.0, by - 1.0), 7.0, 7.0, "ink", (2, 3, 3))  # the loin, over the hinge
        self.leg(cel, J, "fn", far=False)
        self.leg(cel, J, "hn", far=False)
        nx, ny = J["neck"]
        turn = tf + pose.get("head_rot", 0.0)
        a = math.radians(turn)

        def on_head(x: float, y: float) -> Pt:
            return (nx + x * math.cos(a) - y * math.sin(a), ny + x * math.sin(a) + y * math.cos(a))

        cel.limb(J["withers"], on_head(1.0, 0.5), 7.0, 5.4, "ink", (2, 3, 4))  # the neck, with its ruff
        cel.stamp_pivot(JAW, L, on_head(5.0, 2.6), 0.5, 0.5, turn + pose.get("jaw", 0.0))
        alive = pose.get("alive", 1.0)
        cel.stamp_pivot(HEAD, {**L, "E": ("sea", 8) if alive > 0.5 else ("ink", 0)}, (nx, ny), 2.5, 6.0, turn)
        # Rime along the top of the whole animal: one frosted line under the outline, so the dark fur keeps its
        # silhouette on dark ground (the slate of the whiteout, the pines at night).
        for (x, y), (ramp, tone) in list(cel.px.items()):
            if ramp == "ink" and tone > 0 and (x, y - 1) not in cel.px:
                cel.px[(x, y)] = ("azure", 6)
        cel.outline()
        # Fx on top: the eye, the breath, snow kicked up, and the ice bursting off its back.
        if alive > 0.5:
            ex, ey = on_head(2.5, -0.5)
            cel.put(ex, ey, ("light", 0))
            cel.soft(ex + 1, ey, ("sea", 7))
            cel.soft(ex - 1, ey - 1, ("sea", 6))
        breath = pose.get("breath", 0.0)
        if breath > 0.05:
            sx, sy = on_head(12.0, 1.5)
            for i in range(5):
                cel.soft(sx + 1.5 + i * 1.6 + breath * 4.0, sy - i * 0.8 - breath * 3.0, ("azure", 8 if i < 3 else 6))
        kick = pose.get("kick", 0.0)
        if kick > 0.05:
            for i in range(int(4 + kick * 6)):
                cel.soft(bx - 12.0 - i * 1.8 - kick * 3.0, GROUND - 1.5 - (i % 3) * 1.6 - kick * 2.5, ("azure", 8 if i % 2 else 7))
        burst = pose.get("burst", 0.0)
        if 0.01 < burst < 0.985:
            for i in range(14):
                ang = math.radians(-170 + i * 12.5)
                dist = 3.0 + (10.0 + (i * 5 % 4) * 2.5) * burst
                x, y = bx + (i - 7) * 1.4 + math.cos(ang) * dist, by - 5.0 + math.sin(ang) * dist + 9.0 * burst * burst
                if y < GROUND - 1:
                    cel.soft(x, y, ("light", 0) if i % 3 == 0 else ("azure", 8))
                    if burst < 0.6:
                        cel.soft(x + 1, y + 1, ("azure", 6))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, dy=0.0, pitch=0.0, arch=0.0, head_rot=12.0, jaw=0.0, fn=(0.0, 0.0), ff=(0.0, 0.0), hn=(0.0, 0.0), hf=(0.0, 0.0),
                  hackles=0.0, ice=1.0, breath=0.0, kick=0.0, alive=1.0, burst=0.0, flash=0.0)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    # Head low, weight shifting from side to side, lips lifting; a breath steams out once a cycle.
    breath = max(0.0, math.sin(math.tau * (ph - 0.1) * 2.0)) if 0.1 < ph < 0.35 else 0.0
    snarl = max(0.0, math.sin(math.tau * (ph - 0.5) * 1.0)) if 0.5 < ph < 1.0 else 0.0
    return {**BASE, "dy": 0.5 + 0.5 * s, "pitch": 3.0 + 1.5 * late, "arch": 2.0 * s, "head_rot": 16.0 + 6.0 * late, "jaw": 14.0 * snarl,
            "hackles": 10.0 * snarl + 4.0 * s, "breath": breath}


def _bound(q: float, reach: float, height: float) -> tuple[float, float]:
    """One paw of the lope: a short push on the ground, then a long reach forward through the air."""
    q %= 1.0
    if q < 0.32:
        return (reach * (1 - 2 * q / 0.32), 0.0)
    t = (q - 0.32) / 0.68
    ease = t * t * (3 - 2 * t)
    return (-reach + 2 * reach * ease, height * math.sin(math.pi * t) ** 0.8)


def lope_pose(ph: float) -> Pose:
    # Forepaws strike one after the other, then the hind pair drives. The back humps as the hind legs come under
    # (gathered) and hollows as the wolf stretches out in the air.
    fn, ff = _bound(ph, 6.6, 4.6), _bound(ph - 0.09, 6.6, 4.6)
    hn, hf = _bound(ph + 0.5, 7.0, 4.2), _bound(ph + 0.41, 7.0, 4.2)
    gather = math.cos(math.tau * (ph - 0.42))
    return {**BASE, "arch": 11.0 * gather, "pitch": 4.0 * math.sin(math.tau * (ph + 0.05)), "dy": -1.2 - 1.6 * math.cos(2 * math.tau * (ph - 0.44)) - 1.2 * gather,
            "head_rot": 6.0 - 8.0 * gather, "jaw": 8.0, "fn": fn, "ff": ff, "hn": hn, "hf": hf, "hackles": 8.0 * math.sin(math.tau * (ph - 0.1)),
            "kick": max(0.0, math.sin(math.tau * (ph - 0.55))) if 0.55 < ph < 0.85 else 0.0}


def k(**over: object) -> Pose:
    return {**BASE, **over}


def planted(dx: float, **legs: tuple[float, float]) -> dict[str, tuple[float, float]]:
    """All four paws stay where they were while the body shifts by dx, except the ones given."""
    return {name: legs.get(name, (-dx, 0.0)) for name in ("fn", "ff", "hn", "hf")}


# Pounce: it sinks onto its forelegs with its haunches high and its hackles up, hangs there, then goes through the
# air stretched out with its jaws open, lands on the prey, worries it, and springs back.
ATTACK_KEYS = [
    (0.00, k(), "lin"),
    (0.24, k(dx=-3.0, dy=2.6, pitch=9.0, arch=8.0, head_rot=4.0, jaw=10.0, hackles=22.0, **planted(-3.0)), "out"),
    (0.40, k(dx=-4.0, dy=3.2, pitch=11.0, arch=11.0, head_rot=2.0, jaw=18.0, hackles=30.0, breath=0.8, **planted(-4.0)), "io"),
    (0.47, k(dx=5.0, dy=-6.0, pitch=-12.0, arch=-10.0, head_rot=-4.0, jaw=44.0, hackles=10.0, kick=1.0, fn=(6.0, 6.0), ff=(7.0, 7.0), hn=(-6.0, 1.5), hf=(-5.0, 2.5)), "in"),
    (0.53, k(dx=12.0, dy=-3.0, pitch=8.0, arch=-6.0, head_rot=14.0, jaw=50.0, hackles=6.0, fn=(4.0, 2.0), ff=(5.0, 3.0), hn=(-6.0, 5.0), hf=(-5.0, 6.0)), "lin"),
    (0.58, k(dx=14.0, dy=0.8, pitch=7.0, arch=6.0, head_rot=26.0, jaw=2.0, hackles=16.0, fn=(1.0, 0.0), ff=(1.5, 0.0), hn=(-2.0, 0.0), hf=(-1.5, 0.0)), "lin"),
    (0.66, k(dx=14.0, dy=0.4, pitch=5.0, arch=4.0, head_rot=8.0, jaw=4.0, hackles=20.0, **planted(-1.0, fn=(1.0, 0.0), ff=(1.5, 0.0))), "io"),
    (0.72, k(dx=14.0, dy=0.8, pitch=7.0, arch=6.0, head_rot=30.0, jaw=6.0, hackles=14.0, **planted(-1.0, fn=(1.0, 0.0), ff=(1.5, 0.0))), "io"),
    (0.86, k(dx=6.0, dy=-3.0, pitch=-5.0, arch=7.0, head_rot=10.0, jaw=8.0, fn=(-3.0, 3.5), ff=(-2.5, 4.0), hn=(2.0, 2.0), hf=(2.5, 2.5)), "io"),
    (1.00, k(), "io"),
]

# Hit: the blow wrenches its head aside and its hindquarters slew round; it yelps, scrabbles back and squares up.
HURT_KEYS = [
    (0.00, k(), "lin"),
    (0.07, k(dx=-1.0, dy=0.6, pitch=-4.0, arch=-5.0, head_rot=-22.0, jaw=26.0, hackles=26.0, flash=1.0, **planted(-1.0, fn=(2.0, 1.6))), "out3"),
    (0.16, k(dx=-3.4, dy=-1.4, pitch=-10.0, arch=-9.0, head_rot=-34.0, jaw=36.0, hackles=34.0, kick=0.5, flash=0.5, fn=(4.0, 4.4), ff=(4.6, 3.4), hn=(2.2, 0.0), hf=(2.2, 0.0)), "lin"),
    (0.26, k(dx=-5.2, dy=-0.4, pitch=-6.0, arch=4.0, head_rot=-18.0, jaw=20.0, hackles=20.0, kick=1.0, fn=(4.2, 2.6), ff=(4.8, 2.0), hn=(1.6, 0.0), hf=(1.6, 0.0)), "out"),
    (0.50, k(dx=-4.6, dy=1.6, pitch=6.0, arch=9.0, head_rot=24.0, jaw=6.0, hackles=-6.0, **planted(-1.0)), "in"),
    (0.74, k(dx=-2.0, dy=0.0, pitch=0.0, arch=2.0, head_rot=8.0, hackles=14.0, breath=0.8, fn=(1.4, 2.4), ff=(-1.6, 0.0), hn=(0.8, 1.8), hf=(-1.6, 0.0)), "io"),
    (1.00, k(), "io"),
]

# Death: it throws its head back in a last howl; the ice on its back bursts; its legs go from under it and it
# lies down on its side, legs out in front, the eye dark.
_SIDE = dict(dx=-1.0, dy=8.4, pitch=0.0, arch=-3.0, head_rot=30.0, jaw=18.0, fn=(8.5, 0.0), ff=(10.0, 0.6), hn=(8.0, 0.0), hf=(9.6, 0.6), hackles=-30.0, ice=0.0, alive=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-3.0, dy=-1.0, pitch=-10.0, arch=-6.0, head_rot=-30.0, jaw=30.0, hackles=30.0, fn=(1.0, 3.4), ff=(1.6, 2.6), hn=(1.4, 0.0), hf=(1.4, 0.0)), "out3"),
    (0.26, k(dx=-2.6, dy=1.0, pitch=-14.0, arch=6.0, head_rot=-62.0, jaw=40.0, hackles=36.0, breath=1.0, fn=(1.0, 0.0), ff=(1.6, 0.0), hn=(0.0, 0.0), hf=(0.4, 0.0)), "io"),
    (0.40, k(dx=-2.6, dy=1.4, pitch=-15.0, arch=7.0, head_rot=-68.0, jaw=44.0, hackles=40.0, breath=0.6, burst=0.02, fn=(1.0, 0.0), ff=(1.6, 0.0), hn=(0.0, 0.0), hf=(0.4, 0.0)), "io"),
    (0.52, k(dx=-2.0, dy=4.4, pitch=-6.0, arch=3.0, head_rot=-20.0, jaw=24.0, hackles=0.0, ice=0.0, burst=0.45, alive=0.4, fn=(3.0, 0.0), ff=(4.0, 0.0), hn=(3.0, 0.0), hf=(4.0, 0.0)), "in"),
    (0.64, k(**{**_SIDE, "dy": 8.4, "head_rot": 8.0}, burst=0.8), "in"),
    (0.72, k(**{**_SIDE, "dy": 7.4, "head_rot": 18.0, "arch": -6.0}, burst=0.98), "out"),
    (0.84, k(**_SIDE, burst=1.0), "in"),
    (1.00, k(**{**_SIDE, "jaw": 12.0}, burst=1.0), "out"),
]

STILL = lambda t: (-0.15 + 0.25 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [160] * 12, True, STILL),
    "run": Anim("run", lope_pose, [i / 10 for i in range(10)], [56] * 10, True, lambda t: (-1.3, 0.0)),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.12, 0.24, 0.40, 0.47, 0.53, 0.58, 0.66, 0.72, 0.79, 0.86, 0.93, 1.0],
                   [80, 90, 110, 170, 40, 50, 100, 80, 110, 80, 70, 70, 100], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.18, 0.26, 0.33, 0.40, 0.46, 0.52, 0.58, 0.64, 0.72, 0.84, 1.0],
                  [50, 50, 80, 90, 120, 140, 160, 70, 70, 70, 80, 90, 130, 1200], False, STILL),
}
