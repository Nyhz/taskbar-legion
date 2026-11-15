"""Moss Bell-Ringer — world 2, support. A stooped old thing in a moss-green cowl and cloak, lichen on its
shoulders, a pale mask of bark for a face with two slits that glow the violet of its bell. In both hands it
carries a long crooked branch, and from the crook, high over the heads of the pack and out in front, hangs a bell
of violet glass, pale-lipped, a wisp inside it and cold fireflies about it. It tolls without rest — the toll IS its aura —
and only swings the bell at the party now and then. When it dies it is thrown onto its back; the branch falls
along the path, the bell drops off it, rolls onto its side under the crook and goes dark.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Character, Gait, Pose, Pt, gait_legs, ik, keyed, loose, stagger_keys

FIGURE = ("BellRinger", "foe", "w02")

BUILD = Build(root_x=40, thigh=5.6, shin=5.6, foot=3.8, hip_dx=1.4, spine=9.6, sh_near=3.0, sh_far=2.6, upper=5.4, fore=5.4, neck=0.2, head_dx=1.6)

L = {
    "E": ("violet", 7), "F": ("light", 0), "k": ("ink", 1), "l": ("ink", 2),
    "a": ("moss", 1), "b": ("moss", 2), "c": ("moss", 3), "d": ("moss", 4),
    "m": ("moss", 4), "n": ("moss", 5), "o": ("moss", 6), "p": ("moss", 7),
    "g": ("bone", 4), "h": ("bone", 6),
    "y": ("violet", 2), "z": ("violet", 4), "w": ("violet", 5), "x": ("violet", 7), "q": ("violet", 7), "Q": ("violet", 8),
}

# A moss-green cowl with lichen on its crown; under it a pale mask of bark with two slits that glow the violet
# of the bell (the one lit thing on the body).
HEAD = [
    "..nop.....",
    ".mnoopc...",
    ".abbnccc..",
    "abbgghhcc.",
    "abgkEhkEc.",
    "abgghhhhc.",
    ".abgghhc..",
    "..agghc...",
    "...gh.....",
]
# The cloak: wide, falling to the knees in a ragged hem, moss thick on the shoulders and in patches lower down.
CLOAK = [
    "...mnoop....",
    "..mnnooppc..",
    ".abnnbccopc.",
    ".abbbbcccdc.",
    "aabbbbcccdd.",
    "aabmnbcccdd.",
    "aabnobbccdd.",
    "aabbbbbccddd",
    "aabbbbbcnodd",
    "aabbbbmccddd",
    "aabbbbnocddd",
    ".abbbbbccdd.",
    ".ab.bb.cc.d.",
]
# Violet glass with a pale lip, a wisp for a clapper: the one colour nothing else in the wood wears.
BELL = [
    "...zwz...",
    "..yzwxz..",
    "..yzwxxz.",
    ".yyzwwxz.",
    ".yzzwwxz.",
    ".yzzwwxxz",
    "yyzzzwwxz",
    "qqqqqQQQq",
    ".kkyFykk.",
]
DARK = {"w": ("violet", 2), "x": ("violet", 3), "z": ("violet", 1), "y": ("violet", 0), "q": ("violet", 3), "Q": ("violet", 4), "F": ("ink", 1)}

CROOK = 30.0


class BellRinger(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        # The branch is held in both hands in front of the chest; its crook reaches forward over the path.
        grip = loose(pose, "crook", J["handN"], self.build.root_x)
        a = math.radians(pose["crook"])
        u = (math.sin(a), -math.cos(a))  # up the branch
        side = 1.0 - 2.0 * pose.get("crook_flip", 0.0)  # fallen, it comes to rest with the crook turned up
        f = (math.cos(a) * side, math.sin(a) * side)  # the way the crook bends
        hold = 1.0 - pose.get("crook_free", 0.0)
        if hold > 0.01:
            up = (grip[0] + u[0] * 6.0, grip[1] + u[1] * 6.0)
            hx, hy = J["handF"]
            goal = (hx + (up[0] - hx) * hold, hy + (up[1] - hy) * hold)
            J["elbowF"], J["handF"] = ik(J["shF"], goal, self.build.upper, self.build.fore, +1)
        top = (grip[0] + u[0] * CROOK, grip[1] + u[1] * CROOK)
        J["grip"] = grip
        J["butt"] = (grip[0] - u[0] * 9.0, grip[1] - u[1] * 9.0)
        J["top"] = top
        J["bend1"] = (top[0] + u[0] * 3.0 + f[0] * 3.5, top[1] + u[1] * 3.0 + f[1] * 3.5)
        J["bend2"] = (top[0] + u[0] * 2.5 + f[0] * 8.0, top[1] + u[1] * 2.5 + f[1] * 8.0)
        J["hook"] = (top[0] - u[0] * 1.0 + f[0] * 10.5, top[1] - u[1] * 1.0 + f[1] * 10.5)
        # The bell hangs from the crook on a short cord and swings; once it has dropped it lies where it fell.
        sw = math.radians(pose.get("swing", 0.0))
        hook = J["hook"]
        hang = (hook[0] + math.sin(sw) * 3.0, hook[1] + math.cos(sw) * 3.0)
        J["bell"] = loose(pose, "bell", hang, self.build.root_x)
        return J

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        hip, knee, ankle, toe = J["hip" + s], J["knee" + s], J["ankle" + s], J["toe" + s]
        cel.limb(hip, knee, 3.8, 3.2, "leather", (1, 2, 3), far=far)
        cel.limb(knee, ankle, 3.0, 2.6, "leather", (1, 2, 3), far=far)
        cel.limb(ankle, toe, 3.0, 2.0, "ink", (1, 2, 3), far=far)

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 3.6, 3.2, "moss", (2, 3, 4), far=far)
        cel.limb(el, hd, 3.0, 2.4, "moss", (2, 3, 4), far=far)
        for dx, dy, i in ((0, 0, 5), (0, -1, 6), (-1, 0, 4)):
            cel.put(hd[0] + dx, hd[1] + dy, ("bone", i))

    def branch(self, cel: Cel, J: dict[str, Pt]) -> None:
        cel.limb(J["butt"], J["grip"], 1.8, 2.0, "leather", (2, 4, 5))
        cel.limb(J["grip"], J["top"], 2.0, 1.8, "leather", (2, 4, 5))
        cel.limb(J["top"], J["bend1"], 1.8, 1.6, "leather", (2, 4, 5))
        cel.limb(J["bend1"], J["bend2"], 1.6, 1.5, "leather", (2, 4, 5))
        cel.limb(J["bend2"], J["hook"], 1.5, 1.2, "leather", (2, 4, 5))
        # A leaf or two still on it.
        tx, ty = J["bend1"]
        cel.put(tx - 1, ty - 1, ("moss", 6))
        cel.put(tx, ty - 2, ("moss", 7))

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        lit = pose.get("lit", 1.0)
        self.arm(cel, J, "F", far=True)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        la = math.radians(lean)
        cel.stamp_lean(CLOAK, L, (px - 6.0 * math.sin(la), min(py + 6.0 * math.cos(la), GROUND + 0.5)), 5, lean)
        hx, hy = J["head"]
        cel.stamp_turn(HEAD, L, (hx, hy + 2), 4, pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0))
        self.branch(cel, J)
        self.arm(cel, J, "N", far=False)
        # Cord and bell.
        bx, by = J["bell"]
        if pose.get("bell_free", 0.0) < 0.5:
            cel.line(J["hook"], (bx, by), ("bone", 3))
        rot = pose.get("bell_rot", pose.get("swing", 0.0) * -1.0)
        legend = L if lit > 0.5 else {**L, **DARK}
        if abs(rot) < 6.0:
            cel.stamp(BELL, legend, bx - 4, by)
        else:
            cel.stamp_rot(BELL, legend, bx, by, 4.5, 0.0, rot)
        cel.outline()
        if lit > 0.5:
            # The bell's cold glow and the fireflies that keep to it: the light a player looks for above the pack.
            cx, cy = bx - math.sin(math.radians(rot)) * 5.0, by + math.cos(math.radians(rot)) * 5.0
            ph = pose.get("fly", 0.0)
            for i in range(5):
                a = math.tau * (ph + i / 5)
                r = 8.5 + 1.5 * math.sin(a * 2 + i)
                fx, fy = cx + math.cos(a) * r, cy + math.sin(a) * r * 0.75 - 1.0
                cel.put(fx, fy, ("light", 0))
                cel.put(fx - math.sin(a), fy + math.cos(a) * 0.75, ("violet", 7))
                cel.soft(fx + math.sin(a), fy - math.cos(a) * 0.75, ("violet", 5))
            toll = pose.get("toll", 0.0)
            if toll > 0.05:
                for k_, tone in ((0, ("light", 0)), (1, ("violet", 7)), (2, ("violet", 5))):
                    r = 7.0 + toll * 14.0 - k_ * 4.5
                    if r > 6.0:
                        for a0, a1 in ((-58 + k_ * 8, 58 - k_ * 8), (122 + k_ * 8, 238 - k_ * 8)):
                            cel.arc(cx, cy, r + 1.0, a0, a1, ("violet", 1))  # a dark edge: the ring shows on the bright forest too
                            cel.arc(cx, cy, r, a0, a1, tone)


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=1.4, lean=16.0, footN=(-3.6, 0.0, 0.0), footF=(4.0, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=44.0, elbN=58.0, armF=60.0, elbF=40.0, crook=8.0, swing=0.0, head_dx=0.0, head_dy=0.0, head_rot=0.0, breath=0.0,
                  crook_free=0.0, crook_at=(0.0, 0.0), crook_flip=0.0, bell_free=0.0, bell_at=(0.0, 0.0), lit=1.0, fly=0.0, toll=0.0)


def idle_pose(ph: float) -> Pose:
    # It rocks the branch and the bell swings a beat behind; each time the bell passes the middle it tolls.
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    toll = max(0.0, math.cos(math.tau * (ph - 0.2) * 2)) ** 8
    return {**BASE, "crook": 8.0 + 5.0 * s, "swing": 30.0 * late, "lean": 16.0 + 1.5 * s, "drop": 1.4 + 0.5 * abs(s), "armN": 44.0 + 6.0 * s, "elbN": 58.0 - 5.0 * s,
            "head_rot": 4.0 * late, "head_dy": 0.3 * s, "breath": 0.3 + 0.3 * s, "fly": ph, "toll": 0.6 * toll}


def walk_pose(ph: float) -> Pose:
    c, s2 = math.cos(math.tau * ph), math.cos(2 * math.tau * (ph - 0.1))
    p: Pose = gait_legs(Gait(stride=0.7, give=1.4, lift=0.7, toe=0.8), ph)
    late = math.sin(2 * math.tau * (ph - 0.3))
    p.update(lean=21.0 + 2.0 * s2, dy=0.6 + 0.6 * s2, hip_rot=-0.5 * c, sh_rot=0.4 * c, armN=44.0 + 3.0 * s2, elbN=58.0, armF=60.0, elbF=40.0,
             crook=14.0 + 4.0 * s2, swing=34.0 * late, head_dx=0.0, head_dy=0.5 * s2, head_rot=0.0, breath=0.0,
             crook_free=0.0, crook_at=(0.0, 0.0), bell_free=0.0, bell_at=(0.0, 0.0), lit=1.0, fly=ph, toll=0.3 * max(0.0, -late) ** 4)
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# The toll thrown at the party: the branch hauled back, held, then whipped forward so the bell cracks at them.
TOLL_KEYS = [
    (0.00, k(), "lin"),
    (0.24, k(lean=8.0, drop=1.0, crook=-14.0, swing=-34.0, armN=20.0, elbN=84.0, head_rot=-8.0, fly=0.2), "out"),
    (0.48, k(lean=4.0, drop=0.8, crook=-24.0, swing=-50.0, armN=8.0, elbN=96.0, head_rot=-12.0, fly=0.4), "io"),
    (0.54, k(lean=26.0, drop=2.6, crook=30.0, swing=58.0, armN=66.0, elbN=40.0, head_rot=8.0, head_dy=0.8, fly=0.5, toll=0.2), "lin"),
    (0.64, k(lean=24.0, drop=2.2, crook=26.0, swing=20.0, armN=62.0, elbN=44.0, head_rot=6.0, fly=0.6, toll=0.65), "out"),
    (0.78, k(lean=20.0, drop=1.8, crook=16.0, swing=-22.0, armN=52.0, elbN=52.0, fly=0.75, toll=1.0), "out"),
    (1.00, k(fly=1.0), "io"),
]

HURT_KEYS = stagger_keys(BASE, push=3.6, bend=12.0, buckle=2.2, whip=16.0, over={
    "impact": dict(crook=0.0, swing=-30.0, armN=30.0, elbN=70.0, fly=0.1),
    "reel": dict(crook=-22.0, swing=44.0, armN=10.0, elbN=86.0, fly=0.3),
    "catch": dict(crook=18.0, swing=-34.0, armN=54.0, elbN=50.0, fly=0.6),
})

# Death: knocked off its feet onto its back. The branch leaves its hands and comes down along the path ahead, the
# crook turned up; the bell drops off it, strikes the path with one last clang, rolls onto its side under the crook
# and goes dark. What is left to read: the fallen branch and the dead bell.
_LEGS = BUILD.thigh + BUILD.shin
_DOWN = dict(dx=-6.0, drop=_LEGS - 6.0, lean=-86.0, head_rot=16.0, armN=-100.0, elbN=20.0, armF=-70.0, elbF=10.0,
             footN=(8.0, 0.6, 20.0), footF=(11.0, 1.6, 60.0), crook=84.0, crook_free=1.0, crook_at=(14.0, 1.6), crook_flip=1.0,
             bell_free=1.0, bell_at=(33.0, 5.8), bell_rot=-84.0, lit=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-1.6, drop=1.0, lean=2.0, head_rot=-14.0, head_dx=-0.8, crook=-6.0, swing=-40.0, armN=24.0, elbN=80.0, fly=0.1), "out3"),
    (0.26, k(dx=-3.4, drop=0.8, lean=-26.0, head_rot=-8.0, crook=10.0, swing=30.0, armN=40.0, elbN=60.0, fly=0.3, footF=(4.4, 3.0, 20.0)), "out"),
    (0.42, k(**{**_DOWN, "dx": -5.2, "drop": _LEGS - 10.0, "lean": -62.0, "crook": 40.0, "crook_at": (12.0, 12.0), "crook_flip": 0.3, "bell_free": 0.0,
                "swing": 10.0, "bell_rot": -10.0, "lit": 1.0, "fly": 0.5, "footN": (5.0, 4.0, 40.0), "footF": (8.0, 6.5, 50.0)}), "in"),
    (0.54, k(**{**_DOWN, "crook": 66.0, "crook_at": (13.0, 5.0), "crook_flip": 0.6, "bell_free": 0.7, "bell_at": (28.0, 12.0), "bell_rot": 0.0, "lit": 1.0,
                "fly": 0.6}), "in"),
    (0.62, k(**{**_DOWN, "bell_at": (31.0, 8.6), "bell_rot": -24.0, "lit": 1.0, "toll": 0.5, "fly": 0.7}), "lin"),
    (0.72, k(**{**_DOWN, "bell_at": (33.0, 6.0), "bell_rot": -70.0}), "out"),
    (0.84, k(**_DOWN), "out"),
    (1.00, k(**_DOWN), "lin"),
]

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [140] * 12, True),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [85] * 12, True),
    "attack": Anim("attack", keyed(TOLL_KEYS), [0.0, 0.08, 0.16, 0.24, 0.32, 0.40, 0.48, 0.54, 0.59, 0.64, 0.71, 0.78, 0.89, 1.0],
                   [70, 70, 80, 90, 100, 110, 150, 45, 60, 70, 80, 90, 90, 100], False),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.18, 0.26, 0.34, 0.42, 0.48, 0.54, 0.58, 0.62, 0.67, 0.72, 0.84, 1.0],
                  [60, 50, 80, 80, 90, 80, 70, 60, 60, 50, 60, 70, 90, 140, 1200], False),
}
