"""Gloom Bat — world 7, ranged. A bat with the wingspan of a man, on a flying rig of its own: a furred body with
great ears and ember eyes hung between two leathery wings that beat, fold and foreshorten as they pass the body.
It never lands: it hovers a couple of dozen pixels up, bobbing against each wingbeat. To attack it rears back
with its wings spread, then throws its head forward and shrieks — the sound goes out as rings. When it dies its
wings crumple, it tumbles out of the air, hits the stone on its back and lies there with its wings spread.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Character, Pose, Pt, keyed

FIGURE = ("Bat", "foe", "w07")

BUILD = Build(root_x=40, thigh=1.0, shin=1.0, foot=0.0, hip_dx=0.0, spine=0.0, sh_near=0.0, sh_far=0.0, upper=0.0, fore=0.0, neck=0.0)

L = {
    "k": ("ink", 1), "l": ("leather", 1), "m": ("leather", 2), "n": ("leather", 3), "o": ("leather", 4), "p": ("leather", 5),
    "r": ("crimson", 4), "E": ("brass", 6), "W": ("brass", 7), "F": ("bone", 7),
}

# Great ears (pink inside), a snub muzzle, fangs over the lip, a ruff of fur, small hanging feet.
BODY = [
    ".....n...n..",
    "....nrn.nro.",
    "....nrnnnro.",
    "...mnnooopp.",
    "..mnnooEWop.",
    "..mnnooooppk",
    "..mmnnooFpF.",
    ".lmmnnnoo...",
    ".lmmnnoo....",
    "..lmmnn.....",
    "...l.m......",
]

ALT = 24.0  # how high its body rides above the ground
SPAN_N, SPAN_F = 21.0, 20.0


def beat(flap: float) -> tuple[float, float]:
    """A wing for a beat position (+1 = raised, −1 = down): the angle it points at and how long it looks. Passing
    the body it points straight back and is seen almost edge-on, so it shortens."""
    return (180.0 + 84.0 * flap, 0.4 + 0.6 * abs(flap) ** 0.8)


class Bat(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        rx = BUILD.root_x + pose.get("dx", 0.0)
        by = GROUND - ALT + pose.get("dy", 0.0)
        pitch = pose.get("pitch", 0.0)
        a = math.radians(pitch)
        ca, sa = math.cos(a), math.sin(a)

        def at(x: float, y: float) -> Pt:
            return (rx + x * ca - y * sa, by + x * sa + y * ca)

        return {"body": (rx, by), "shN": at(-1.0, -2.5), "shF": at(0.8, -3.0), "hip": at(-3.0, 3.2), "mouth": at(6.5, 0.8), "eye": at(2.2, -1.6), "lean": (pitch, 0.0)}

    def wing(self, cel: Cel, J: dict[str, Pt], pose: Pose, s: str, far: bool) -> None:
        """One wing: an arm to the wrist and three fingers fanning from it — the first along the wing's own
        direction, the others swept round towards the tail — with the membrane stretched between their tips and
        down to the hip. Pointing straight back the fan closes and the wing is seen edge-on."""
        ang, scale = pose["wing" + s]
        span = (SPAN_F if far else SPAN_N) * scale
        fan = pose.get("fan", 1.0)
        sh, hip = J["sh" + s], J["hip"]

        def ray(deg: float, length: float, origin: Pt) -> Pt:
            r = math.radians(deg)
            return (origin[0] + math.cos(r) * length, origin[1] + math.sin(r) * length)

        a = math.radians(ang)
        d = (math.cos(a), math.sin(a))
        p1, p2 = (-d[1], d[0]), (d[1], -d[0])
        lead = p1 if p1[0] * 0.6 - p1[1] * 0.8 > p2[0] * 0.6 - p2[1] * 0.8 else p2  # the leading edge bulges up and forward
        wrist = (sh[0] + d[0] * span * 0.36 + lead[0] * 2.6 * scale, sh[1] + d[1] * span * 0.36 + lead[1] * 2.6 * scale)
        tips = [ray(ang + (180.0 - ang) * f * fan, span * n, sh if i == 0 else wrist) for i, (f, n) in enumerate(((0.0, 1.0), (0.42, 0.74), (0.8, 0.6)))]

        def notch(p: Pt, q: Pt) -> Pt:
            mx, my = (p[0] + q[0]) / 2, (p[1] + q[1]) / 2
            return (mx + (wrist[0] - mx) * 0.22, my + (wrist[1] - my) * 0.22)

        poly = [sh, wrist, tips[0], notch(tips[0], tips[1]), tips[1], notch(tips[1], tips[2]), tips[2], notch(tips[2], hip), hip]
        fill, edge, bone = (("crimson", 2), ("crimson", 3), ("crimson", 4)) if far else (("crimson", 3), ("crimson", 5), ("dusk", 7))
        mask = cel.poly_mask(poly)
        inside = set(mask)
        for (x, y) in mask:
            cel.put(x, y, edge if (x, y - 1) not in inside else fill)
        for end in tips:
            cel.line(wrist, end, bone)
        cel.limb(sh, wrist, 2.8, 1.8, "leather", (2, 3, 5), far=far)
        cel.put(wrist[0], wrist[1], ("bone", 5 if far else 7))  # the thumb claw

    def draw(self, cel, J, pose, ropes, between) -> None:
        pitch = pose.get("pitch", 0.0)
        alive = pose.get("alive", 1.0) > 0.5
        self.wing(cel, J, pose, "F", True)
        bx, by = J["body"]
        cel.stamp_pivot(BODY, {**L, "E": ("brass", 6) if alive else ("ink", 2), "W": ("brass", 7) if alive else ("ink", 3)}, (bx, by), 5.5, 6.0, pitch)
        mouth = pose.get("mouth", 0.0)
        mx, my = J["mouth"]
        if mouth > 0.5:  # jaws wide: a dark throat between the fangs
            for dx, dy in ((0, 0), (-1, 0), (0, 1), (-1, 1), (-2, 0)):
                cel.put(mx - 1.0 + dx, my + dy, ("crimson", 1))
            cel.put(mx, my - 1, ("bone", 7))
            cel.put(mx, my + 2, ("bone", 7))
        self.wing(cel, J, pose, "N", False)
        cel.outline()
        for xy in [xy for xy in cel.px if xy[1] >= GROUND]:  # nothing of it goes into the stone when it lies there
            del cel.px[xy]
        if alive:
            ex, ey = J["eye"]
            cel.put(ex, ey, ("brass", 7))
            cel.put(ex + 1, ey, ("light", 0))
        shriek = pose.get("shriek", 0.0)
        if 0.01 < shriek < 0.985:
            # The shriek: rings leaving the mouth one after another, widening and fading as they go.
            for i in range(3):
                r = (shriek - i * 0.2) * 44.0
                if 2.0 < r < 38.0:
                    tone = ("light", 0) if r < 13 else ("sea", 8) if r < 25 else ("sea", 6)
                    cel.arc(mx, my, r, -34.0 + 10.0, 34.0 + 10.0, tone)
                    if r < 25:
                        cel.arc(mx, my, r - 1.0, -26.0 + 10.0, 26.0 + 10.0, ("sea", 7) if r < 13 else ("sea", 5))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, dy=0.0, pitch=-4.0, wingN=beat(1.0), wingF=beat(1.0), mouth=0.0, shriek=0.0, alive=1.0, flash=0.0, fan=1.0)


def hover_pose(ph: float) -> Pose:
    # Wings up at 0, down at half a beat; the body sinks as they rise and is lifted by each downstroke.
    c = math.cos(math.tau * ph)
    stroke = math.copysign(abs(c) ** 0.7, c)
    late = math.cos(math.tau * (ph - 0.06))
    return {**BASE, "dy": 2.4 * math.cos(math.tau * (ph - 0.08)), "pitch": -4.0 + 4.0 * math.sin(math.tau * (ph - 0.1)), "wingN": beat(stroke),
            "wingF": beat(math.copysign(abs(late) ** 0.7, late))}


def fly_pose(ph: float) -> Pose:
    p = hover_pose(ph)
    # Travelling: nose down, a deeper, quicker beat.
    p.update(pitch=14.0 + 4.0 * math.sin(math.tau * (ph - 0.1)), dy=-1.0 + 2.0 * math.cos(math.tau * (ph - 0.08)))
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Shriek: one more beat, then it rears back with its wings spread in a V, fills its chest, and throws the sound forward.
ATTACK_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dy=-1.5, wingN=beat(-1.0), wingF=beat(-0.9)), "io"),
    (0.22, k(dx=-3.0, dy=-2.0, pitch=-22.0, wingN=(250.0, 1.05), wingF=(288.0, 1.0), mouth=0.3), "out"),
    (0.40, k(dx=-3.6, dy=-3.0, pitch=-27.0, wingN=(246.0, 1.08), wingF=(292.0, 1.02), mouth=1.0), "io"),
    (0.47, k(dx=4.0, dy=1.0, pitch=17.0, wingN=(122.0, 1.0), wingF=(142.0, 0.95), mouth=1.0, shriek=0.02), "in"),
    (0.63, k(dx=3.6, dy=0.2, pitch=13.0, wingN=(112.0, 0.96), wingF=(134.0, 0.9), mouth=1.0, shriek=0.5), "lin"),
    (0.80, k(dx=3.2, dy=1.2, pitch=12.0, wingN=(120.0, 1.0), wingF=(140.0, 0.94), mouth=1.0, shriek=0.98), "lin"),
    (0.90, k(dx=1.2, dy=2.0, pitch=2.0, wingN=(200.0, 0.5), wingF=(214.0, 0.5), shriek=1.0), "io"),
    (1.00, k(shriek=1.0), "io"),
]

# Hit: knocked back and tipped over in the air with its wings thrown up in front of it; it drops, catches itself
# with one hard downstroke and climbs back.
HURT_KEYS = [
    (0.00, k(flash=0.0), "lin"),
    (0.07, k(dx=-1.5, pitch=-16.0, wingN=(290.0, 0.9), wingF=(310.0, 0.85), flash=1.0), "out3"),
    (0.16, k(dx=-4.5, dy=-2.0, pitch=-36.0, wingN=(318.0, 0.8), wingF=(334.0, 0.7), flash=0.5), "lin"),
    (0.26, k(dx=-6.5, dy=3.0, pitch=-42.0, wingN=(236.0, 0.55), wingF=(250.0, 0.5), flash=0.0), "out"),
    (0.50, k(dx=-6.0, dy=7.5, pitch=10.0, wingN=(100.0, 1.0), wingF=(112.0, 0.95), flash=0.0), "in"),
    (0.74, k(dx=-3.0, dy=1.0, pitch=4.0, wingN=(190.0, 0.45), wingF=(204.0, 0.45), flash=0.0), "io"),
    (1.00, k(flash=0.0), "io"),
]

# Death: the blow folds its wings; it tumbles over backwards out of the air, hits the stone on its back, bounces
# once and lies with its wings spread out flat.
_FLAT = dict(dx=-10.0, dy=ALT - 5.5, pitch=-180.0, wingN=(188.0, 0.95), wingF=(354.0, 0.85), alive=0.0, fan=0.12)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.08, k(dx=-2.0, pitch=-24.0, wingN=(300.0, 0.9), wingF=(320.0, 0.8)), "out3"),
    (0.20, k(dx=-5.0, dy=-4.0, pitch=-72.0, wingN=(246.0, 0.6), wingF=(226.0, 0.5), alive=0.0, fan=0.7), "out"),
    (0.38, k(dx=-8.0, dy=7.0, pitch=-150.0, wingN=(226.0, 0.6), wingF=(250.0, 0.5), alive=0.0, fan=0.6), "in"),
    (0.48, k(**{**_FLAT, "wingN": (204.0, 0.8), "wingF": (330.0, 0.7), "fan": 0.4}), "in"),
    (0.56, k(**{**_FLAT, "dy": ALT - 9.0, "pitch": -168.0, "wingN": (212.0, 0.85), "wingF": (324.0, 0.75), "fan": 0.5}), "out"),
    (0.66, k(**_FLAT), "in"),
    (0.76, k(**{**_FLAT, "wingN": (200.0, 0.9), "fan": 0.3}), "out"),
    (0.86, k(**_FLAT), "in"),
    (1.00, k(**_FLAT), "lin"),
]

STILL = lambda t: (0.0, 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", hover_pose, [i / 10 for i in range(10)], [58] * 10, True, STILL),
    "run": Anim("run", fly_pose, [i / 8 for i in range(8)], [46] * 8, True, STILL),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.05, 0.10, 0.16, 0.22, 0.31, 0.40, 0.47, 0.52, 0.57, 0.63, 0.69, 0.74, 0.80, 0.90, 1.0],
                   [50, 50, 60, 60, 90, 110, 170, 50, 60, 60, 60, 60, 60, 80, 80, 70], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.04, 0.08, 0.14, 0.20, 0.29, 0.38, 0.43, 0.48, 0.52, 0.56, 0.61, 0.66, 0.76, 0.86, 1.0],
                  [50, 40, 70, 60, 70, 70, 70, 50, 60, 60, 70, 70, 90, 110, 130, 1200], False, STILL),
}
