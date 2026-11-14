"""Carrion Harrier — world 4, ranged. A vulture with a wingspan wider than a man is tall. It never lands: it has
its own flying rig — a hand-drawn body hanging between two two-bone wings that beat (the tips lag behind the
arms), a bare neck that snakes, talons dangling. It hovers with its head swinging from hero to hero, rears back
in the air and hawks a gob of burning bile down at them. Shot dead, it folds, tumbles out of the sky, hits the
ground on its back in a burst of dust and feathers, and the last wing comes down slowly.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Character, Pose, Pt, keyed

FIGURE = ("Vulture", "foe", "w04")

INNER, OUTER = 10.0, 13.0
BUILD = Build(root_x=40, thigh=0.0, shin=0.0, foot=0.0, hip_dx=0.0, spine=0.0, sh_near=0.0, sh_far=0.0, upper=INNER, fore=OUTER, neck=0.0)

L = {
    "k": ("ink", 1), "l": ("ink", 2), "m": ("ink", 3), "n": ("ink", 4), "W": ("bone", 7), "e": ("bone", 5),
    "c": ("bone", 4), "d": ("bone", 6), "f": ("bone", 7), "O": ("brass", 6), "R": ("crimson", 5), "B": ("ink", 1), "b": ("ink", 3),
}

# Dark body, a ruff of pale feathers where the neck comes out (right).
BODY = [
    ".....kllmmn....",
    "...kllmmnnnW...",
    "..kllmmnnnWWe..",
    ".kkllmmnnnWWee.",
    "kkllmmmnnnnWee.",
    "kkllmmmnnnnnW..",
    ".kllmmmnnnn....",
    "..kllmmnnn.....",
    "...kkllmm......",
    "....kkl........",
]
# Bald head, a burning eye, a red wattle, a heavy hooked beak.
HEAD = [
    "..cdd....",
    ".cdffO...",
    "ccddffbBB",
    ".cddRbbBB",
    "..cRR..BB",
    "........B",
]


def flap(ph: float, amp: float = 1.0) -> tuple[tuple[float, float, float], tuple[float, float, float]]:
    """Wing poses for one beat (phase 0 = wings up, about to drive down), for the near and the far wing: (inner
    angle, outer angle, sweep). The outer half lags the inner one: it trails up on the downstroke and droops on
    the upstroke."""
    u = 0.5 - 0.5 * math.cos(math.tau * ph)
    inner = 72.0 - 128.0 * u * amp
    lag = 34.0 * math.sin(math.tau * ph)
    return (inner, inner + lag, -1.0), (inner + 8.0, inner + 8.0 + lag * 0.9, -1.15)


def bone(theta: float, length: float, sweep: float) -> Pt:
    """A wing bone seen from the side. The wing really points out towards the viewer, so what shows is its
    rise (90 = straight up, −90 = straight down) and a little sweep back: level with the body it is edge-on
    and short. `sweep` scales the sideways part; a large positive one lays the wing out forwards (a dead bird)."""
    t = math.radians(theta)
    return (length * sweep * (0.25 + 0.2 * math.cos(t)), -length * math.sin(t))


class Vulture(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        rx = BUILD.root_x + pose.get("dx", 0.0)
        by = min(GROUND - 5.5, GROUND - pose["alt"] + pose.get("dy", 0.0))
        pitch = pose.get("pitch", 0.0)
        a = math.radians(pitch)
        ca, sa = math.cos(a), math.sin(a)

        def at(x: float, y: float) -> Pt:
            return (rx + x * ca - y * sa, by + x * sa + y * ca)

        nx, ny = pose["neck"]
        J: dict[str, Pt] = {"body": (rx, by), "neck0": at(6.0, -2.5), "neck1": at(7.0 + nx * 0.45, -3.0 + ny * 0.75), "head": at(7.0 + nx, -3.0 + ny),
                            "tail": at(-7.0, 0.5), "hip": at(0.5, 4.0), "lean": (pitch, 0.0)}
        tx, ty = pose["talon"]
        J["foot"] = at(0.5 + tx, 4.0 + ty)
        for s, sh in (("N", at(1.5, -3.5)), ("F", at(3.5, -4.2))):
            t1, t2, sweep = pose["w" + s]
            b1, b2 = bone(t1, INNER, sweep), bone(t2, OUTER, sweep)
            el = (sh[0] + b1[0], sh[1] + b1[1])
            tip = (el[0] + b2[0], el[1] + b2[1])
            # A wing cannot go through the ground: it folds along it.
            J["sh" + s], J["el" + s], J["tip" + s] = sh, (el[0], min(el[1], GROUND - 1.5)), (tip[0], min(tip[1], GROUND - 1.0))
        return J

    def wing(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        S, E, T = J["sh" + s], J["el" + s], J["tip" + s]
        tones = (0, 1, 3) if far else (1, 2, 4)

        def trail(a: Pt, b: Pt) -> Pt:
            """Which way the feathers on a→b point: along the bone a little, but mostly back towards the tail."""
            dx, dy = b[0] - a[0], b[1] - a[1]
            n = math.hypot(dx, dy) or 1.0
            vx, vy = dx / n * 0.45 - 1.0, dy / n * 0.45 + 0.3
            m = math.hypot(vx, vy)
            return (vx / m, vy / m)

        f1, f2 = trail(S, E), trail(E, T)
        web = [S, E, T, (T[0] + f2[0] * 7.5, T[1] + f2[1] * 7.5), (E[0] + f1[0] * 10.0, E[1] + f1[1] * 10.0), (S[0] + f1[0] * 6.0, S[1] + f1[1] * 6.0)]
        for (x, y) in cel.poly_mask(web):
            if y < GROUND:
                cel.put(x, y, ("ink", tones[1]))
        dx, dy = T[0] - E[0], T[1] - E[1]
        n = math.hypot(dx, dy) or 1.0
        for t in (0.25, 0.5, 0.75, 1.0):  # primaries, splayed like fingers
            p = (E[0] + dx * t, E[1] + dy * t)
            tip = (p[0] + f2[0] * (7.5 + 3.5 * t) + dx / n * (1.0 + 3.0 * t), min(GROUND - 1.0, p[1] + f2[1] * (7.5 + 3.5 * t) + dy / n * (1.0 + 3.0 * t)))
            cel.limb(p, tip, 3.0, 1.0, "ink", tones)
            cel.put(tip[0], tip[1], ("bone", 3 if far else 5))
        for t in (0.35, 0.75):  # secondaries
            p = (S[0] + (E[0] - S[0]) * t, S[1] + (E[1] - S[1]) * t)
            cel.limb(p, (p[0] + f1[0] * 9.5, min(GROUND - 1.0, p[1] + f1[1] * 9.5)), 3.4, 1.4, "ink", tones)
        cel.limb(S, E, 3.6, 3.0, "ink", (tones[1], tones[2], tones[2] + 2))
        cel.limb(E, T, 3.0, 1.6, "ink", (tones[1], tones[2], tones[2] + 2))

    def draw(self, cel, J, pose, ropes, between) -> None:
        pitch = pose.get("pitch", 0.0)
        alive = pose.get("alive", 1.0)
        self.wing(cel, J, "F", far=True)
        # Tail fan.
        tx, ty = J["tail"]
        a = math.radians(pitch)
        for spread in (-22.0, 0.0, 22.0):
            b = a + math.radians(172.0 + spread)
            cel.limb((tx, ty), (tx + math.cos(b) * 8.5, min(GROUND - 1.0, ty + math.sin(b) * 8.5)), 3.0, 1.4, "ink", (1, 2, 4))
        # Talons.
        hip, foot = J["hip"], J["foot"]
        for off in (-1.2, 1.4):
            cel.limb((hip[0] + off, hip[1]), (foot[0] + off, foot[1]), 1.9, 1.4, "brass", (2, 3, 5))
            for toe in (-1.6, 0.0, 1.6):
                cel.put(foot[0] + off + toe * 0.7, foot[1] + 1.0 + abs(toe) * 0.3, ("ink", 1))
        bx, by = J["body"]
        cel.stamp_pivot(BODY, L, (bx, by), 7.5, 5.0, pitch)
        # Neck and head.
        cel.limb(J["neck0"], J["neck1"], 3.8, 3.0, "bone", (3, 5, 6))
        cel.limb(J["neck1"], J["head"], 3.0, 2.6, "bone", (3, 5, 6))
        hx, hy = J["head"]
        turn = pose.get("head_rot", 0.0) + pitch * 0.4
        cel.stamp_pivot(HEAD, {**L, "O": ("brass", 6) if alive > 0.5 else ("ink", 2)}, (hx, hy), 2.0, 3.0, turn)
        self.wing(cel, J, "N", far=False)
        cel.outline()

        if alive > 0.5:
            h = math.radians(turn)
            cel.put(hx + 3.5 * math.cos(h) + 1.5 * math.sin(h), hy + 3.5 * math.sin(h) - 1.5 * math.cos(h), ("brass", 7))
        bolt = pose.get("bolt", 0.0)
        if 0.01 < bolt < 0.985:
            # A gob of bile, falling in an arc towards the heroes, dripping.
            x = BUILD.root_x + 20.0 + 32.0 * bolt
            y = GROUND - pose["alt"] - 3.0 + (pose["alt"] - 9.0) * bolt ** 1.5
            for oy in (-2, -1, 0, 1, 2):
                for ox in (-2, -1, 0, 1, 2):
                    d = abs(ox) + abs(oy)
                    if d <= 3:
                        cel.soft(x + ox, y + oy, ("light", 0) if d == 0 else ("moss", 8) if d == 1 else ("moss", 7) if d == 2 else ("moss", 5))
            for i in range(1, 8):
                ty = y - i * (1.6 - 1.2 * bolt)
                cel.soft(x - 2.0 - i * 2.2, ty, ("moss", 8) if i < 3 else ("moss", 6) if i < 6 else ("brass", 5))
                if i < 4:
                    cel.soft(x - 2.0 - i * 2.2, ty + 1, ("moss", 6))
        feathers = pose.get("feathers", 0.0)
        if 0.01 < feathers < 0.985:
            for i in range(7):
                u = max(0.0, min(1.0, feathers * 1.3 - i * 0.05))
                if 0.0 < u < 1.0:
                    x = bx - 9.0 + i * 3.4 + 4.0 * math.sin(u * 6.0 + i * 1.7)
                    y = by - 7.0 + (i % 3) * 3.0 + u * 16.0
                    if y < GROUND - 1:
                        cel.soft(x, y, ("ink", 3) if i % 2 else ("bone", 5))
                        cel.soft(x + 1, y + 1, ("ink", 2))
        dust = pose.get("dust", 0.0)
        if 0.01 < dust < 0.985:
            for i in range(10):
                side = -1.0 if i % 2 else 1.0
                cel.soft(bx + side * (4.0 + (i // 2) * 2.4 + 9.0 * dust), GROUND - 1.5 - (i % 3) * 1.6 - 4.0 * dust * (1 - dust) * 3, ("leather", 6 if i % 3 else 5))


# --------------------------------------------------------------------------------------- animations
_MID_N, _MID_F = flap(0.25, 0.85)
BASE: Pose = dict(dx=0.0, dy=0.0, alt=25.0, pitch=-8.0, neck=(6.0, -5.0), head_rot=10.0, talon=(1.0, 6.0), wN=_MID_N, wF=_MID_F,
                  bolt=0.0, feathers=0.0, dust=0.0, alive=1.0, flash=0.0)


def hover(ph: float, amp: float = 0.85) -> Pose:
    """One wingbeat in place: the body rises as the wings drive down and sinks as they recover."""
    wn, wf = flap(ph, amp)
    return {**BASE, "wN": wn, "wF": wf, "dy": 2.4 * math.cos(math.tau * ph)}


def idle_pose(ph: float) -> Pose:
    # Two beats per loop; the head swings slowly from one hero to the next, the talons clench.
    look = math.sin(math.tau * ph)
    p = hover((2 * ph) % 1.0)
    p.update(pitch=-8.0 + 3.0 * math.sin(math.tau * (2 * ph - 0.2)), neck=(6.0 + 1.5 * look, -5.0 - 0.8 * look), head_rot=14.0 + 14.0 * look,
             talon=(1.0 + 0.6 * look, 6.0 - 1.0 * max(0.0, math.sin(math.tau * (ph - 0.3)))))
    return p


def fly_pose(ph: float) -> Pose:
    # Stretched out flat, neck forward, deep fast beats.
    p = hover(ph, 1.0)
    p.update(pitch=14.0 + 3.0 * math.sin(math.tau * (ph - 0.2)), neck=(9.0, -1.5), head_rot=-4.0, talon=(-3.0, 3.5), dy=2.8 * math.cos(math.tau * ph))
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


_UP = ((80.0, 90.0, -1.0), (86.0, 96.0, -1.15))  # wings thrown high
_DOWN = ((-60.0, -38.0, -1.0), (-54.0, -32.0, -1.15))  # wings driven right down
# Bile: wings high, it rears back in the air with its neck coiled, then drives the wings down and throws its
# head forward; the gob flies.
ATTACK_KEYS = [
    (0.00, k(), "lin"),
    (0.20, k(dx=-1.5, dy=-2.5, pitch=-24.0, neck=(2.5, -7.5), head_rot=-28.0, wN=_UP[0], wF=_UP[1], talon=(2.5, 5.5)), "out"),
    (0.36, k(dx=-2.0, dy=-3.0, pitch=-28.0, neck=(1.5, -8.0), head_rot=-34.0, wN=(86.0, 100.0, -1.0), wF=(92.0, 106.0, -1.15), talon=(3.0, 5.5)), "io"),
    (0.44, k(dx=2.0, dy=1.5, pitch=12.0, neck=(11.0, -1.0), head_rot=26.0, wN=_DOWN[0], wF=_DOWN[1], talon=(-2.5, 4.5), bolt=0.02), "in"),
    (0.60, k(dx=1.5, dy=2.5, pitch=8.0, neck=(10.0, -1.5), head_rot=20.0, wN=(-30.0, -60.0, -1.0), wF=(-24.0, -52.0, -1.15), talon=(-1.5, 5.0), bolt=0.5), "out"),
    (0.80, k(dx=0.5, dy=-1.0, pitch=-6.0, wN=(50.0, 20.0, -1.0), wF=(56.0, 28.0, -1.15), bolt=0.98), "io"),
    (1.00, k(bolt=1.0), "io"),
]

# Hit: knocked back and tipped over in the air, wings thrown up, feathers flying; it drops, then beats hard to
# get its height back.
HURT_KEYS = [
    (0.00, k(), "lin"),
    (0.07, k(dx=-1.0, pitch=-14.0, neck=(7.5, -3.0), head_rot=24.0, wN=(40.0, 60.0, -1.0), wF=(46.0, 66.0, -1.15), flash=1.0, feathers=0.02), "out3"),
    (0.16, k(dx=-4.0, dy=1.0, pitch=-30.0, neck=(3.0, -7.5), head_rot=-30.0, wN=(84.0, 100.0, -0.6), wF=(90.0, 106.0, -0.7), talon=(3.5, 5.0), flash=0.5, feathers=0.25), "lin"),
    (0.26, k(dx=-6.0, dy=4.0, pitch=-34.0, neck=(2.5, -7.5), head_rot=-34.0, wN=(76.0, 96.0, -0.6), wF=(82.0, 102.0, -0.7), talon=(3.5, 5.0), feathers=0.45), "out"),
    (0.50, k(dx=-5.0, dy=4.5, pitch=-4.0, neck=(6.5, -4.0), head_rot=16.0, wN=_DOWN[0], wF=_DOWN[1], feathers=0.75), "in"),
    (0.74, k(dx=-2.2, dy=-1.5, pitch=-10.0, wN=(64.0, 40.0, -1.0), wF=(70.0, 48.0, -1.15), feathers=0.98), "io"),
    (1.00, k(feathers=1.0), "io"),
]

# Death: it folds in the air, rolls over backwards as it falls with the wings dragged up above it, hits the
# ground on its back; one wing lies out along the ground, the other stands a moment and comes down.
_DOWNED = dict(dx=-6.0, dy=40.0, pitch=-180.0, neck=(8.0, -2.4), head_rot=-20.0, talon=(1.5, 5.5), alive=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-3.0, dy=-2.0, pitch=-32.0, neck=(3.0, -7.5), head_rot=-30.0, wN=(84.0, 100.0, -0.6), wF=(90.0, 106.0, -0.7), talon=(3.5, 5.0), feathers=0.02), "out3"),
    (0.26, k(dx=-4.5, dy=6.0, pitch=-100.0, neck=(5.0, -5.0), head_rot=-10.0, wN=(74.0, 98.0, -0.4), wF=(82.0, 104.0, -0.5), talon=(2.0, 4.5), feathers=0.3, alive=0.4), "in"),
    (0.40, k(dx=-5.5, dy=15.0, pitch=-164.0, neck=(7.0, -3.0), head_rot=-14.0, wN=(80.0, 100.0, 0.3), wF=(84.0, 104.0, -0.5), talon=(2.0, 5.0), feathers=0.55, alive=0.0), "in"),
    (0.48, k(**_DOWNED, wN=(30.0, 44.0, 1.4), wF=(82.0, 100.0, -0.6), feathers=0.7, dust=0.02), "in"),
    (0.56, k(**{**_DOWNED, "dy": 17.0, "pitch": -172.0}, wN=(40.0, 56.0, 1.2), wF=(84.0, 104.0, -0.6), feathers=0.82, dust=0.4), "out"),
    (0.64, k(**_DOWNED, wN=(4.0, 10.0, 2.0), wF=(80.0, 104.0, -0.7), feathers=0.92, dust=0.8), "in"),
    (0.80, k(**_DOWNED, wN=(-6.0, -6.0, 2.2), wF=(60.0, 40.0, -1.2), feathers=0.98, dust=0.98), "io"),
    (0.92, k(**{**_DOWNED, "talon": (1.0, 4.0)}, wN=(-6.0, -6.0, 2.2), wF=(6.0, -4.0, -2.1), feathers=1.0, dust=1.0), "in"),
    (1.00, k(**{**_DOWNED, "talon": (1.0, 4.0)}, wN=(-6.0, -6.0, 2.2), wF=(0.0, -6.0, -2.2), feathers=1.0, dust=1.0), "out"),
]

STILL = lambda t: (0.0, 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 16 for i in range(16)], [52] * 16, True, STILL),
    "run": Anim("run", fly_pose, [i / 10 for i in range(10)], [46] * 10, True, STILL),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.10, 0.20, 0.28, 0.36, 0.44, 0.50, 0.55, 0.60, 0.66, 0.73, 0.80, 0.90, 1.0],
                   [70, 80, 100, 110, 160, 50, 60, 60, 70, 70, 70, 80, 80, 100], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.18, 0.26, 0.33, 0.40, 0.44, 0.48, 0.52, 0.56, 0.64, 0.72, 0.80, 0.86, 0.92, 1.0],
                  [50, 50, 80, 70, 70, 60, 60, 40, 60, 60, 70, 90, 100, 100, 90, 110, 1200], False, STILL),
}
