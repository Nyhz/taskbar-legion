"""Dune Scorpion — world 4, beast. A scorpion as long as a man is tall, with its own rig: a low plated body on
eight two-bone legs, two pincers on jointed arms and a segmented tail that curls up over its back to a sting.
It scuttles with the pincers snapping, cocks the tail back and whips it over its own head to stab the ground in
front of it. When it dies the tail thrashes, the legs give way and splay flat, and the tail falls limp over its
head into the dust.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Character, Pose, Pt, ik, keyed, swing_smear

FIGURE = ("Scorpion", "foe", "w04")

FEMUR, TIBIA = 7.0, 9.0
BUILD = Build(root_x=40, thigh=FEMUR, shin=TIBIA, foot=0.0, hip_dx=0.0, spine=0.0, sh_near=0.0, sh_far=0.0, upper=6.0, fore=7.0, neck=0.0)

L = {
    "a": ("azure", 1), "b": ("azure", 2), "c": ("azure", 3), "d": ("azure", 4), "e": ("azure", 5), "f": ("azure", 6),
    "k": ("ink", 1), "O": ("brass", 6),
}

# Plated back: three bands of armour, darker seams between them, the head (with its eyes) at the right.
BODY = [
    "......bccd.cdde.dee.",
    "...abccddekcddekdeef",
    ".abbccddekcddekdeeff",
    "abbccdddekcddekeefOf",
    "abbccdddekcddekeeeff",
    "abbbccddkbcddekdeeef",
    ".abbccddkbccdkcddeef",
    ".aabbccdkabcckbcddee",
    "..aabbcckabbckabccd.",
    "....aaab..aab..aabb.",
]

BODY_H = 7.0
#: Leg roots in the body's frame (near side) and where the feet rest (x from the root of the figure).
ROOTS = [(5.0, 3.0), (2.0, 3.2), (-1.5, 3.2), (-5.0, 3.0)]
REST_N = [15.0, 9.0, -9.0, -16.0]
REST_F = [17.5, 11.5, -6.5, -13.5]
LEGS = [("n1", 0, False), ("n2", 1, False), ("n3", 2, False), ("n4", 3, False), ("f1", 0, True), ("f2", 1, True), ("f3", 2, True), ("f4", 3, True)]
#: The tail: seven segments, each turned `curl` degrees from the one before.
SEG, NSEG = 5.0, 7


def tail_points(root: Pt, a0: float, curl: float) -> tuple[list[Pt], Pt]:
    """Joints of the tail from its root, and the point of the sting. −90 = straight up, −180 = straight back."""
    pts = [root]
    ang = a0
    for i in range(NSEG):
        ang = a0 + i * curl
        x, y = pts[-1]
        pts.append((x + math.cos(math.radians(ang)) * SEG, min(GROUND - 1.5, y + math.sin(math.radians(ang)) * SEG)))
    b = math.radians(ang + 38.0)
    x, y = pts[-1]
    return pts, (x + math.cos(b) * 5.0, min(GROUND - 0.5, y + math.sin(b) * 5.0))


class Scorpion(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        rx = BUILD.root_x + pose.get("dx", 0.0)
        by = GROUND - BODY_H + pose.get("dy", 0.0)
        pitch = pose.get("pitch", 0.0)
        a = math.radians(pitch)
        ca, sa = math.cos(a), math.sin(a)

        def at(x: float, y: float) -> Pt:
            return (rx + x * ca - y * sa, by + x * sa + y * ca)

        J: dict[str, Pt] = {"body": (rx, by), "eye": at(8.0, -1.5), "lean": (pitch, 0.0)}
        for name, i, far in LEGS:
            root = at(ROOTS[i][0] + (0.9 if far else 0.0), ROOTS[i][1] - (0.7 if far else 0.0))
            fx, lift = pose[name]
            goal = (rx + (REST_F if far else REST_N)[i] + fx, GROUND - 1.0 - lift)
            knee, foot = ik(root, goal, FEMUR, TIBIA, -1 if goal[0] >= root[0] else 1)
            J[name + "_root"], J[name + "_knee"], J[name + "_foot"] = root, knee, foot
        # Pincers: the wrist goes where the pose puts it (x from the root, height over the ground).
        for key, sh in (("cn", at(8.5, 2.0)), ("cf", at(9.5, 0.0))):
            cx, ch = pose[key]
            el, wr = ik(sh, (rx + cx, GROUND - ch), BUILD.upper, BUILD.fore, -1)
            J[key + "_sh"], J[key + "_el"], J[key + "_wr"] = sh, el, wr
        pts, sting = tail_points(at(-9.5, -0.5), pose["a0"] + pitch, pose["curl"])
        for i, p in enumerate(pts):
            J[f"t{i}"] = p
        J["sting"] = sting
        return J

    def leg(self, cel: Cel, J: dict[str, Pt], name: str, far: bool) -> None:
        root, knee, foot = J[name + "_root"], J[name + "_knee"], J[name + "_foot"]
        cel.limb(root, knee, 3.0, 2.4, "azure", (2, 4, 6), far=far)
        cel.limb(knee, foot, 2.4, 1.0, "azure", (2, 4, 6), far=far)
        cel.put(knee[0], knee[1], ("bone", 4 if far else 6))
        cel.put(foot[0], foot[1], ("ink", 1))

    def claw(self, cel: Cel, J: dict[str, Pt], key: str, spread: float, rot: float, far: bool) -> None:
        sh, el, wr = J[key + "_sh"], J[key + "_el"], J[key + "_wr"]
        cel.limb(sh, el, 3.2, 2.8, "azure", (2, 4, 6), far=far)
        cel.limb(el, wr, 2.8, 3.8, "azure", (2, 4, 6), far=far)
        a = math.radians(rot)
        palm = (wr[0] + math.cos(a) * 4.2, wr[1] + math.sin(a) * 4.2)
        cel.limb(wr, palm, 6.4, 5.4, "azure", (3, 5, 7), far=far)
        # The upper finger opens; the lower one is the anvil.
        for sgn, ang, length in ((-1.0, spread, 7.6), (1.0, 8.0 + spread * 0.2, 6.2)):
            fa = a + math.radians(sgn * ang)
            tip = (palm[0] + math.cos(fa) * length, palm[1] + math.sin(fa) * length)
            cel.limb(palm, tip, 3.0, 1.0, "azure", (3, 5, 7), far=far)
            cel.put(tip[0], tip[1], ("bone", 5 if far else 7))

    def draw(self, cel, J, pose, ropes, between) -> None:
        pitch = pose.get("pitch", 0.0)
        for name, _i, far in LEGS:
            if far:
                self.leg(cel, J, name, far=True)
        self.claw(cel, J, "cf", pose["open_f"], pose["claw"] + pitch - 24.0, far=True)
        bx, by = J["body"]
        cel.stamp_pivot(BODY, L, (bx, by), 10.0, 5.0, pitch)
        # Tail: plated segments getting thinner, then the bulb and the barb.
        for i in range(NSEG):
            w0 = 4.6 - i * 0.3
            cel.limb(J[f"t{i}"], J[f"t{i + 1}"], w0 + 1.8, w0 + 1.5, "ink", (0, 0, 0))  # its own outline, so it reads over the body
            cel.limb(J[f"t{i}"], J[f"t{i + 1}"], w0, w0 - 0.3, "azure", (2, 4, 6) if i % 2 == 0 else (1, 3, 5))
            cel.put(J[f"t{i + 1}"][0], J[f"t{i + 1}"][1], ("azure", 1))
        end, sting = J[f"t{NSEG}"], J["sting"]
        cel.limb(end, ((end[0] + sting[0]) / 2, (end[1] + sting[1]) / 2), 3.8, 2.8, "brass", (3, 4, 6))
        cel.limb(((end[0] + sting[0]) / 2, (end[1] + sting[1]) / 2), sting, 2.2, 0.6, "brass", (4, 5, 7))
        for name, _i, far in LEGS:
            if not far:
                self.leg(cel, J, name, far=False)
        self.claw(cel, J, "cn", pose["open_n"], pose["claw"] + pitch, far=False)
        cel.outline()

        if pose.get("smear", 0.0) > 0.5 and len(between) > 2:
            before = set(cel.px)
            swing_smear(cel, [Jb["sting"] for Jb, _pb in between], [Jb["t0"] for Jb, _pb in between])
            for xy in set(cel.px) - before:
                if xy[1] >= GROUND:
                    del cel.px[xy]
        if pose.get("alive", 1.0) > 0.5:
            cel.put(J["eye"][0], J["eye"][1], ("brass", 7))
            cel.put(sting[0], sting[1], ("moss", 8))  # a bead of venom on the barb
        venom = pose.get("venom", 0.0)
        if venom > 0.05:
            for i in range(int(1 + venom * 3)):
                cel.soft(sting[0] + (i % 2) * 0.6, sting[1] + 1 + i, ("moss", 8 if i % 2 == 0 else 7))
        stab = pose.get("stab", 0.0)
        if 0.01 < stab < 0.985:
            # The sting goes into the ground: dirt and venom spatter out from it.
            if stab < 0.3:
                cel.star(sting[0], GROUND - 2, 3)
            for i in range(8):
                ang = math.radians(-165 + i * 21.0)
                dist = 2.5 + (6.0 + (i * 3 % 4) * 1.6) * stab
                x, y = sting[0] + math.cos(ang) * dist * 1.2, GROUND - 2 + math.sin(ang) * dist + 6.0 * stab * stab
                if y < GROUND - 1:
                    cel.soft(x, y, ("moss", 8) if i % 3 == 0 else ("leather", 6))


# --------------------------------------------------------------------------------------- animations
_LEG0 = {name: (0.0, 0.0) for name, _i, _far in LEGS}
BASE: Pose = dict(dx=0.0, dy=0.0, pitch=0.0, a0=-150.0, curl=30.0, cn=(18.0, 4.5), cf=(20.0, 12.5), open_n=10.0, open_f=10.0, claw=8.0,
                  venom=0.0, smear=0.0, stab=0.0, alive=1.0, flash=0.0, **_LEG0)
#: Alternating fours, like the spider's.
OFFSET = {"n1": 0.0, "n2": 0.5, "n3": 0.0, "n4": 0.5, "f1": 0.5, "f2": 0.0, "f3": 0.5, "f4": 0.0}


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    # The pincers snap one after the other and the tail weighs the air, the barb twitching.
    snap_n = max(0.0, math.sin(math.tau * 2 * ph)) if ph < 0.5 else 0.0
    snap_f = max(0.0, math.sin(math.tau * 2 * (ph - 0.5))) if ph >= 0.5 else 0.0
    return {**BASE, "dy": 0.5 * s, "a0": -150.0 + 5.0 * late, "curl": 30.0 + 2.0 * s, "open_n": 10.0 + 34.0 * snap_n, "open_f": 10.0 + 34.0 * snap_f,
            "cn": (18.0 + 1.0 * snap_n, 4.5 + 1.5 * snap_n), "cf": (20.0 + 1.0 * snap_f, 12.5 + 1.5 * snap_f), "claw": 8.0 - 4.0 * late}


def walk_pose(ph: float) -> Pose:
    p: Pose = {**BASE}
    stride = 7.5
    for name, _i, _far in LEGS:
        q = (ph + OFFSET[name]) % 1.0
        if q < 0.5:
            p[name] = (stride * (0.5 - 2 * q), 0.0)
        else:
            t = (q - 0.5) * 2
            p[name] = (stride * (t - 0.5), 3.4 * math.sin(math.pi * t))
    snap = 0.5 + 0.5 * math.sin(math.tau * 2 * ph)
    p.update(dy=0.5 * math.sin(2 * math.tau * ph), pitch=1.5 * math.sin(2 * math.tau * ph), a0=-146.0 + 5.0 * math.sin(math.tau * (2 * ph - 0.25)),
             curl=29.5 + 2.0 * math.sin(math.tau * (2 * ph - 0.4)), cn=(19.0, 5.0), cf=(21.0, 13.0), open_n=10.0 + 26.0 * snap, open_f=10.0 + 26.0 * (1 - snap))
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


def planted(dx: float, **legs: tuple[float, float]) -> dict[str, tuple[float, float]]:
    """Every foot stays where it was while the body shifts by dx, except the ones given."""
    return {name: legs.get(name, (-dx, 0.0)) for name, _i, _far in LEGS}


# Sting: it sinks back with the pincers spread, the tail cocks back as far as it goes, and whips over its head
# to stab the ground ahead of its own pincers, which it pulls in low out of the way.
_HIT = dict(dx=6.0, dy=0.4, pitch=10.0, a0=-50.0, curl=16.0, cn=(11.0, 2.5), cf=(12.5, 4.5), open_n=10.0, open_f=10.0, claw=26.0)
_STEP = dict(n1=(1.0, 0.0), f1=(1.0, 0.0))
ATTACK_KEYS = [
    (0.00, k(), "lin"),
    (0.20, k(dx=-2.0, dy=0.8, pitch=-5.0, a0=-166.0, curl=25.0, cn=(16.0, 9.0), cf=(18.0, 16.0), open_n=42.0, open_f=42.0, claw=-8.0, **planted(-2.0)), "out"),
    (0.36, k(dx=-2.8, dy=1.0, pitch=-7.0, a0=-172.0, curl=22.0, cn=(15.5, 10.0), cf=(17.5, 17.0), open_n=46.0, open_f=46.0, claw=-12.0, **planted(-2.8)), "io"),
    (0.43, k(**{**_HIT, "a0": -92.0, "curl": 18.0, "pitch": 4.0, "dx": 3.0}, smear=1.0, **planted(3.0, **_STEP)), "in"),
    (0.47, k(**_HIT, smear=1.0, venom=1.0, stab=0.02, **planted(6.0, **_STEP)), "lin"),
    (0.64, k(**{**_HIT, "a0": -48.0}, venom=1.0, stab=0.98, **planted(6.0, **_STEP)), "out"),
    (0.82, k(dx=2.0, pitch=2.0, a0=-112.0, curl=26.0, stab=1.0, venom=0.3, **planted(2.0, n2=(-1.0, 2.6), f1=(-1.0, 2.6), n4=(-1.0, 2.6), f3=(-1.0, 2.6))), "io"),
    (1.00, k(stab=1.0), "io"),
]

# Hit: knocked back with the tail thrown behind it and the pincers up over its face; it skids, then resets.
HURT_KEYS = [
    (0.00, k(), "lin"),
    (0.07, k(dx=-1.0, dy=0.8, pitch=-5.0, a0=-158.0, curl=27.0, cn=(16.0, 8.0), cf=(18.0, 14.0), open_n=30.0, open_f=30.0, flash=1.0, **planted(-1.0)), "out3"),
    (0.16, k(dx=-3.5, dy=-1.0, pitch=-12.0, a0=-176.0, curl=19.0, cn=(13.0, 12.0), cf=(15.0, 17.0), open_n=46.0, open_f=46.0, claw=-16.0, flash=0.5,
             **planted(-3.5, n1=(-1.0, 5.0), f1=(0.0, 6.0))), "lin"),
    (0.26, k(dx=-5.5, dy=-0.4, pitch=-8.0, a0=-170.0, curl=23.0, cn=(13.5, 11.0), cf=(15.5, 16.0), open_n=40.0, open_f=40.0, claw=-10.0,
             **planted(-5.5, n1=(-2.0, 4.0), f1=(-1.0, 5.0), n3=(3.0, 2.5), f4=(3.0, 2.5))), "out"),
    (0.50, k(dx=-5.0, dy=1.0, pitch=4.0, a0=-140.0, curl=33.0, **planted(-0.5)), "in"),
    (0.74, k(dx=-2.2, a0=-152.0, curl=30.0, **planted(2.3, n1=(1.0, 3.0), n3=(1.0, 3.0), f2=(1.0, 3.0), f4=(1.0, 3.0))), "io"),
    (1.00, k(), "io"),
]

# Death: the tail lashes forward and back, the legs give way and slide out flat, the pincers drop open, and
# the tail comes down limp over its head and lies in the dust.
_FLAT = dict(dx=-4.0, dy=2.0, pitch=0.0, cn=(18.5, 2.4), cf=(21.5, 3.0), open_n=34.0, open_f=30.0, claw=14.0,
             n1=(8.0, 0.0), f1=(8.0, 0.0), n2=(8.0, 0.0), f2=(8.0, 0.0), n3=(0.0, 0.0), f3=(0.0, 0.0), n4=(0.0, 0.0), f4=(0.0, 0.0))
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-3.0, dy=-2.0, pitch=-14.0, a0=-174.0, curl=17.0, cn=(14.0, 13.0), cf=(16.0, 18.0), open_n=46.0, open_f=46.0, claw=-14.0,
             **planted(-3.0, n1=(-1.0, 5.0), f1=(0.0, 7.0), n2=(1.0, 3.0))), "out3"),
    (0.24, k(dx=-4.0, dy=0.0, pitch=6.0, a0=-76.0, curl=20.0, cn=(18.0, 7.0), cf=(20.0, 12.0), open_n=10.0, open_f=40.0, **planted(-4.0, n3=(5.0, 3.0), f4=(5.0, 3.0))), "io"),
    (0.36, k(dx=-4.0, dy=1.0, pitch=-6.0, a0=-164.0, curl=27.0, cn=(17.0, 8.0), cf=(19.0, 9.0), open_n=40.0, open_f=10.0, **planted(-4.0)), "io"),
    (0.50, k(**_FLAT, a0=-120.0, curl=27.0), "in"),
    (0.66, k(**_FLAT, a0=-84.0, curl=22.0, alive=0.7), "in"),
    (0.76, k(**_FLAT, a0=-60.0, curl=24.0, alive=0.3), "in"),
    (0.84, k(**_FLAT, a0=-70.0, curl=24.0, alive=0.0), "out"),
    (0.92, k(**_FLAT, a0=-62.0, curl=24.0, alive=0.0), "in"),
    (1.00, k(**_FLAT, a0=-62.0, curl=24.0, alive=0.0), "lin"),
]

STILL = lambda t: (0.0, 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [140] * 12, True, STILL),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [42] * 12, True, STILL),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.10, 0.20, 0.28, 0.36, 0.43, 0.47, 0.53, 0.58, 0.64, 0.73, 0.82, 0.91, 1.0],
                   [70, 70, 90, 110, 170, 40, 50, 70, 80, 120, 90, 90, 80, 100], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.17, 0.24, 0.30, 0.36, 0.43, 0.50, 0.58, 0.66, 0.71, 0.76, 0.84, 0.92, 1.0],
                  [50, 50, 80, 60, 80, 60, 80, 70, 90, 80, 80, 60, 80, 90, 120, 1200], False, STILL),
}
