"""Thornweaver — world 2, beast. A spider the size of a hound, with its own rig: a hand-drawn abdomen and head on
eight two-bone legs that arch above the body and step in alternating fours. It scuttles, rears up on its hind legs
with the front ones spread and comes down fangs first, and dies the way spiders do: flipped on its back, legs
curling in.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Character, Pose, Pt, ik, keyed, lerp

FEMUR, TIBIA = 10.0, 16.0
BUILD = Build(root_x=40, thigh=FEMUR, shin=TIBIA, foot=0.0, hip_dx=0.0, spine=0.0, sh_near=0.0, sh_far=0.0, upper=0.0, fore=0.0, neck=0.0)

L = {
    "a": ("dusk", 2), "b": ("dusk", 4), "c": ("dusk", 5), "d": ("dusk", 6), "e": ("dusk", 7),
    "W": ("bone", 7), "R": ("crimson", 3), "E": ("crimson", 5), "O": ("brass", 6), "F": ("bone", 6), "f": ("bone", 4),
}

# A swollen abdomen with a bone-and-blood hourglass down its back.
ABDOMEN = [
    "....bbccc....",
    "..abbcWcddd..",
    ".abbcWRWddde.",
    "aabbWRRRWdde.",
    "aabbcWRWcddee",
    "aabbWRRRWddee",
    "aabbcWRWcdde.",
    ".aabbcWcddde.",
    "..aabbccddd..",
    "...aaabbcc...",
    "....aaaab....",
]
# Head and thorax: a cluster of eyes at the front, fangs hanging under it.
HEAD = [
    "..bccdd...",
    ".bbccddde.",
    "abbccdEOde",
    "abbccddEOe",
    ".abbccddeF",
    "..aabbcfF.",
    ".......fF.",
]

BODY_H = 7.0
#: Leg roots in the body's frame (near side; the far side sits a little ahead and above) and where the feet rest.
ROOTS = [(6.5, 1.0), (4.5, 1.5), (2.5, 1.5), (0.5, 1.0)]
REST_N = [21.0, 12.0, -7.0, -19.0]
REST_F = [24.0, 15.0, -4.0, -16.0]
LEGS = [("n1", 0, False), ("n2", 1, False), ("n3", 2, False), ("n4", 3, False), ("f1", 0, True), ("f2", 1, True), ("f3", 2, True), ("f4", 3, True)]


class Spider(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        rx = BUILD.root_x + pose.get("dx", 0.0)
        by = GROUND - BODY_H + pose.get("dy", 0.0)
        pitch = pose.get("pitch", 0.0)
        a = math.radians(pitch)
        ca, sa = math.cos(a), math.sin(a)

        def at(x: float, y: float) -> Pt:
            return (rx + x * ca - y * sa, by + x * sa + y * ca)

        J: dict[str, Pt] = {"body": (rx, by), "head": at(5.0, 0.0), "waist": at(0.5, -0.5), "lean": (pitch, 0.0)}
        curl = pose.get("curl", 0.0)
        for name, i, far in LEGS:
            root = at(ROOTS[i][0] + (0.8 if far else 0.0), ROOTS[i][1] - (0.8 if far else 0.0))
            fx, lift = pose[name]
            rest = (REST_F if far else REST_N)[i]
            goal = (rx + rest + fx, GROUND - 1.0 - lift)
            knee, foot = ik(root, goal, FEMUR, TIBIA, -1 if goal[0] >= root[0] else 1)
            if curl > 0.001:
                # On its back the legs stand up in the air and fold in over the belly: femur up and out, tibia
                # back down and in. `curl` goes from splayed (0) to clenched (1); each leg a little different.
                side = 1.0 if i < 2 else -1.0
                out = math.radians(lerp(72.0, 26.0, curl) + i * 5.0 + (8.0 if far else 0.0))
                fold = math.radians(lerp(18.0, 128.0, curl) + i * 4.0 - (6.0 if far else 0.0))
                k2 = (root[0] + side * FEMUR * math.sin(out), root[1] - FEMUR * math.cos(out))
                f2 = (k2[0] - side * TIBIA * math.sin(fold), k2[1] - TIBIA * math.cos(fold))
                w = min(1.0, curl * 2.2)
                knee, foot = (lerp(knee[0], k2[0], w), lerp(knee[1], k2[1], w)), (lerp(foot[0], f2[0], w), lerp(foot[1], f2[1], w))
            J[name + "_root"], J[name + "_knee"], J[name + "_foot"] = root, knee, foot
        return J

    def leg(self, cel: Cel, J: dict[str, Pt], name: str, far: bool) -> None:
        root, knee, foot = J[name + "_root"], J[name + "_knee"], J[name + "_foot"]
        cel.limb(root, knee, 2.8, 2.2, "dusk", (3, 4, 6), far=far)
        cel.limb(knee, foot, 2.2, 1.0, "dusk", (3, 4, 6), far=far)
        # Pale bands down the shin and a knob at the knee: the legs must read one by one, even on dark ground.
        for u in (0.36, 0.66):
            bx, by = knee[0] + (foot[0] - knee[0]) * u, knee[1] + (foot[1] - knee[1]) * u
            cel.put(bx, by, ("bone", 4 if far else 6))
            cel.put(bx, by + 1, ("bone", 4 if far else 6))
        cel.put(knee[0], knee[1], ("bone", 4 if far else 7))
        cel.put(foot[0], foot[1], ("ink", 1))

    def draw(self, cel, J, pose, ropes, between) -> None:
        pitch = pose.get("pitch", 0.0)
        for name, _i, far in LEGS:
            if far:
                self.leg(cel, J, name, far=True)
        behind = dict(cel.px)
        wx, wy = J["waist"]
        cel.stamp_pivot(ABDOMEN, L, (wx, wy), 12.5, 5.5, pitch + pose.get("abd", 0.0))
        hx, hy = J["head"]
        turn = pitch + pose.get("head_rot", 0.0)
        cel.stamp_pivot(HEAD, L, (hx, hy), 3.5, 3.0, turn)
        # A pale rim along the top of the abdomen and the head, as if lit from above: with the banded legs it is
        # what separates it from the dark path.
        body = {k_ for k_, v in cel.px.items() if behind.get(k_) != v}
        for (x, y) in body:
            ramp, i = cel.px[(x, y)]
            if ramp == "dusk" and (x, y - 1) not in body:
                cel.px[(x, y)] = ("dusk", 8)
        for name, _i, far in LEGS:
            if not far:
                self.leg(cel, J, name, far=False)
        cel.outline()
        # Fx: the eyes catch the light; venom strings from the fangs when it bites.
        a = math.radians(turn)

        def on_head(x: float, y: float) -> Pt:
            return (hx + x * math.cos(a) - y * math.sin(a), hy + x * math.sin(a) + y * math.cos(a))

        if pose.get("alive", 1.0) > 0.5:
            for ox, oy in ((3.5, -0.5), (2.5, -1.5)):  # the eyes burn
                ex, ey = on_head(ox, oy)
                cel.put(ex, ey, ("light", 0))
                cel.put(ex - 1, ey, ("brass", 6))
            gx, gy = on_head(4.6, -1.4)
            cel.soft(gx, gy, ("brass", 6))
        venom = pose.get("venom", 0.0)
        if venom > 0.05:
            fx, fy = on_head(5.0, 4.0)
            for i in range(int(2 + venom * 4)):
                cel.soft(fx + (i % 2) * 0.6, fy + i, ("moss", 8 if i % 2 == 0 else 7))


# --------------------------------------------------------------------------------------- animations
_LEG0 = {name: (0.0, 0.0) for name, _i, _far in LEGS}
BASE: Pose = dict(dx=0.0, dy=0.0, pitch=0.0, abd=0.0, head_rot=0.0, curl=0.0, venom=0.0, alive=1.0, **_LEG0)
#: Alternating tetrapod: these four move together, the other four half a cycle later.
OFFSET = {"n1": 0.0, "n2": 0.5, "n3": 0.0, "n4": 0.5, "f1": 0.5, "f2": 0.0, "f3": 0.5, "f4": 0.0}


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    # It breathes with its whole body and feels the air with its front legs, one after the other.
    tap_n = max(0.0, math.sin(math.tau * 2 * ph)) if ph < 0.5 else 0.0
    tap_f = max(0.0, math.sin(math.tau * 2 * (ph - 0.5))) if ph >= 0.5 else 0.0
    return {**BASE, "dy": 0.7 * s, "abd": 4.0 * late, "head_rot": 5.0 * late, "n1": (3.0 * tap_n, 6.0 * tap_n), "f1": (3.0 * tap_f, 6.0 * tap_f)}


def walk_pose(ph: float) -> Pose:
    p: Pose = {**BASE}
    stride = 9.0
    for name, _i, _far in LEGS:
        q = (ph + OFFSET[name]) % 1.0
        if q < 0.5:  # planted: slides back under the body
            p[name] = (stride * (0.5 - 2 * q), 0.0)
        else:  # swings forward, lifted
            t = (q - 0.5) * 2
            p[name] = (stride * (t - 0.5), 5.0 * math.sin(math.pi * t))
    p.update(dy=0.6 * math.sin(2 * math.tau * ph), abd=5.0 * math.sin(math.tau * (2 * ph - 0.2)), pitch=1.5 * math.sin(2 * math.tau * ph), head_rot=3.0)
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


def planted(dx: float, **legs: tuple[float, float]) -> dict[str, tuple[float, float]]:
    """Every foot stays where it was while the body shifts by dx, except the ones given."""
    return {name: legs.get(name, (-dx, 0.0)) for name, _i, _far in LEGS}


# Bite: it rears on its hind legs with the front ones spread wide, hangs there, and drops on the prey fangs first.
ATTACK_KEYS = [
    (0.00, k(), "lin"),
    (0.20, k(dx=-2.0, dy=-3.0, pitch=-22.0, abd=10.0, head_rot=-10.0, **planted(-2.0, n1=(-4.0, 18.0), f1=(-3.0, 20.0), n2=(-2.0, 9.0), f2=(-1.0, 11.0))), "out"),
    (0.36, k(dx=-2.6, dy=-3.8, pitch=-27.0, abd=14.0, head_rot=-14.0, **planted(-2.6, n1=(-7.0, 24.0), f1=(-5.0, 27.0), n2=(-3.0, 13.0), f2=(-2.0, 16.0))), "io"),
    (0.44, k(dx=7.0, dy=1.0, pitch=13.0, abd=-8.0, head_rot=22.0, venom=1.0, **planted(7.0, n1=(1.0, 0.0), f1=(1.5, 0.0), n2=(0.0, 0.0), f2=(0.5, 0.0))), "in"),
    (0.60, k(dx=7.5, dy=1.4, pitch=15.0, abd=-4.0, head_rot=26.0, venom=1.0, **planted(7.5, n1=(1.0, 0.0), f1=(1.5, 0.0), n2=(0.0, 0.0), f2=(0.5, 0.0))), "out"),
    (0.80, k(dx=2.5, dy=0.0, pitch=2.0, head_rot=6.0, venom=0.3, **planted(2.5, n1=(-1.0, 3.0), f1=(-1.0, 0.0), n3=(-1.0, 2.5), f4=(-1.0, 2.5))), "io"),
    (1.00, k(), "io"),
]

# Hit: it is slapped back and down, throws its front legs up over its face, scrabbles backwards and resets.
HURT_KEYS = [
    (0.00, k(flash=0.0), "lin"),
    (0.07, k(dx=-1.0, dy=1.0, pitch=-6.0, abd=8.0, head_rot=-10.0, flash=1.0, **planted(-1.0, n1=(1.0, 7.0), f1=(1.5, 9.0))), "out3"),
    (0.16, k(dx=-3.5, dy=-1.5, pitch=-16.0, abd=14.0, head_rot=-14.0, flash=0.5, **planted(-3.5, n1=(-3.0, 16.0), f1=(-2.0, 19.0), n2=(1.0, 8.0))), "lin"),
    (0.26, k(dx=-5.5, dy=-0.5, pitch=-12.0, abd=10.0, head_rot=-10.0, flash=0.0, **planted(-5.5, n1=(-4.0, 14.0), f1=(-3.0, 17.0), n2=(3.0, 3.0), f3=(3.0, 3.0), n4=(3.0, 2.5))), "out"),
    (0.50, k(dx=-5.0, dy=1.2, pitch=4.0, abd=-6.0, head_rot=6.0, flash=0.0, **planted(-0.5)), "in"),
    (0.74, k(dx=-2.2, dy=0.0, pitch=0.0, abd=3.0, flash=0.0, **planted(2.3, n1=(1.0, 3.5), n3=(1.0, 3.5), f2=(1.0, 3.5), f4=(1.0, 3.5))), "io"),
    (1.00, k(flash=0.0), "io"),
]

# Death: the blow flips it over; it lands on its back, legs splayed, and they curl in one twitch at a time.
_BACK = dict(dx=-8.0, dy=1.5, pitch=-180.0, abd=-6.0, head_rot=0.0, alive=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.12, k(dx=-3.0, dy=-6.0, pitch=-34.0, abd=10.0, n1=(2.0, 8.0), f1=(3.0, 10.0), n2=(1.0, 6.0), f2=(1.0, 8.0), n3=(0.0, 3.0), f3=(0.0, 5.0), n4=(-1.0, 2.0), f4=(-1.0, 4.0)), "out3"),
    (0.28, k(dx=-6.0, dy=-10.0, pitch=-112.0, abd=4.0, curl=0.3), "lin"),
    (0.42, k(**_BACK, curl=0.5), "in"),
    (0.50, k(**{**_BACK, "dy": -0.5}, curl=0.3), "out"),
    (0.58, k(**_BACK, curl=0.45), "in"),
    (0.70, k(**_BACK, curl=1.0), "io"),
    (0.78, k(**_BACK, curl=0.82), "out"),
    (0.88, k(**_BACK, curl=1.0), "in"),
    (1.00, k(**_BACK, curl=1.0), "lin"),
]

STILL = lambda t: (0.0, 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [150] * 12, True, STILL),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [45] * 12, True, STILL),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.10, 0.20, 0.28, 0.36, 0.44, 0.52, 0.60, 0.70, 0.80, 0.90, 1.0],
                   [70, 70, 90, 110, 160, 50, 90, 130, 90, 90, 80, 100], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.06, 0.12, 0.20, 0.28, 0.35, 0.42, 0.50, 0.58, 0.64, 0.70, 0.78, 0.88, 1.0],
                  [50, 50, 70, 60, 60, 60, 80, 80, 90, 90, 120, 110, 160, 1200], False, STILL),
}
