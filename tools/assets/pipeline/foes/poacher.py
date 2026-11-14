"""Crowfeather Poacher — world 1, ranged. A masked man in a wide hat and a long coat, a mantle of crow feathers down
his back, a crossbow held in both hands. He advances in a crouch, shoulders the crossbow, fires (it kicks), then
steps on it to span it again. He dies thrown onto his back, the crossbow spinning away.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, ik, keyed, loose, stagger_keys

BUILD = Build(root_x=40, thigh=6.6, shin=6.6, foot=4.0, hip_dx=1.1, spine=9.2, sh_near=2.9, sh_far=2.5, upper=5.9, fore=5.7, neck=1.0, head_dx=0.6)

L = {
    "k": ("ink", 1), "l": ("ink", 2), "m": ("ink", 3), "n": ("ink", 4), "o": ("ink", 5),
    "s": ("skin", 2), "t": ("skin", 4), "u": ("skin", 5), "E": ("ink", 0),
    "q": ("crimson", 1), "r": ("crimson", 2), "p": ("crimson", 3), "R": ("crimson", 5),
    "a": ("leather", 1), "b": ("leather", 2), "c": ("leather", 3), "d": ("leather", 4), "h": ("brass", 4),
}

# Wide dark hat with a red feather, a strip of face in its shadow with one hard eye, a crimson mask below.
HEAD = [
    "..R..lmnl....",
    ".RR.klmnnl...",
    ".R..klmmnl...",
    "llllmmmmnnnll",
    "...kstEuuk...",
    "...qrrrpp....",
    "...qrrrpp....",
    "....qrr.t....",
]
# A long coat with a bandolier across it and a split hem.
TORSO = [
    "...stt...",
    ".abbccdd.",
    "aabbccddd",
    ".abbkcdd.",
    ".abbckdd.",
    ".abbcckd.",
    "..abhcd..",
    ".aabbccd.",
    ".aabbccdd",
    ".aa.bb.dd",
]

STOCK, BUTT, PROD = 10.0, 5.0, 4.8


def draw_crossbow(cel: Cel, grip: Pt, angle: float, loaded: bool) -> None:
    """Stock along `angle` from the grip, the steel prod (bow) across its nose, the string and the bolt."""
    a = math.radians(angle)
    d = (math.cos(a), math.sin(a))
    n = (-d[1], d[0])
    nose = (grip[0] + d[0] * STOCK, grip[1] + d[1] * STOCK)
    butt = (grip[0] - d[0] * BUTT, grip[1] - d[1] * BUTT)
    back = 2.8 if loaded else 1.2
    tips = []
    for sgn in (-1, 1):
        mid = (nose[0] + n[0] * sgn * 2.6 - d[0] * 0.3, nose[1] + n[1] * sgn * 2.6 - d[1] * 0.3)
        tip = (nose[0] + n[0] * sgn * PROD - d[0] * back, nose[1] + n[1] * sgn * PROD - d[1] * back)
        cel.limb(nose, mid, 2.0, 1.7, "ink", (3, 5, 7))
        cel.limb(mid, tip, 1.7, 1.2, "ink", (3, 5, 7))
        tips.append(tip)
    latch = (nose[0] - d[0] * (6.5 if loaded else 1.4), nose[1] - d[1] * (6.5 if loaded else 1.4))
    for tip in tips:
        cel.line(tip, latch, ("bone", 3))
    # The wooden stock goes over the prod and the string: a thick butt tapering to the nose.
    cel.limb(butt, grip, 3.2, 2.6, "leather", (2, 4, 6))
    cel.limb(grip, nose, 2.6, 2.0, "leather", (2, 4, 6))
    cel.put(nose[0] + d[0] * 1.2, nose[1] + d[1] * 1.2, ("ink", 6))  # stirrup
    if loaded:
        cel.line((latch[0] - n[0], latch[1] - n[1]), (nose[0] + d[0] * 2.4 - n[0], nose[1] + d[1] * 2.4 - n[1]), ("bone", 6))
        cel.put(nose[0] + d[0] * 3.2 - n[0], nose[1] + d[1] * 3.2 - n[1], ("light", 1))


class Poacher(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        # Both hands on the crossbow: the far hand goes to the stock ahead of the grip while he holds it.
        grip = loose(pose, "xbow", J["handN"], self.build.root_x)
        a = math.radians(pose["xbow"])
        hold = 1.0 - pose.get("xbow_free", 0.0)
        if hold > 0.01:
            fore = (grip[0] + math.cos(a) * 5.5, grip[1] + math.sin(a) * 5.5)
            hx, hy = J["handF"]
            goal = (hx + (fore[0] - hx) * hold, hy + (fore[1] - hy) * hold)
            J["elbowF"], J["handF"] = ik(J["shF"], goal, self.build.upper, self.build.fore, +1)
        J["grip"] = grip
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def behind(pts: list[Pt], J: dict[str, Pt]) -> None:
            lying = abs(J["lean"][0]) > 45.0
            cx, cy = J["chest"]
            px, py = J["pelvis"]
            for i in range(1, len(pts)):
                x, y = pts[i]
                if lying:
                    pts[i] = (x, min(y, GROUND - 1.5))
                    continue
                t = max(0.0, min(1.0, (y - cy) / max(1.0, py - cy)))
                pts[i] = (min(x, cx - 2.2 + (px - 2.0 - (cx - 2.2)) * t), min(y, GROUND - 2.0))

        return {"mantle": ChainSpec(Chain(6, 2.3, gravity=0.24, drag=0.15, damp=0.1), lambda J: (J["chest"][0] - 1.8, J["chest"][1] + 1.5), behind)}

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        hip, knee, ankle, toe = J["hip" + s], J["knee" + s], J["ankle" + s], J["toe" + s]
        cel.limb(hip, knee, 4.2, 3.5, "ink", (1, 2, 4), far=far)
        cel.limb(knee, ankle, 3.4, 2.8, "ink", (1, 2, 4), far=far)
        top = (knee[0] + (ankle[0] - knee[0]) * 0.45, knee[1] + (ankle[1] - knee[1]) * 0.45)
        cel.limb(top, ankle, 3.6, 3.1, "leather", (1, 2, 4), far=far)
        cel.limb(ankle, toe, 3.0, 2.0, "leather", (1, 2, 4), far=far)

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 3.4, 2.9, "leather", (1, 2, 4), far=far)
        cel.limb(el, hd, 2.9, 2.5, "leather", (1, 2, 4), far=far)
        for dx, dy, i in ((0, 0, 3), (0, -1, 4), (-1, 0, 2)):
            cel.put(hd[0] + dx, hd[1] + dy, ("ink", i))

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        # Crow-feather mantle: a dark ribbon ending in ragged feathers.
        m = ropes["mantle"]
        widths = [2.2, 3.8, 5.2, 6.0, 6.2, 5.0]
        for i in range(len(m) - 1):
            cel.limb(m[i], m[i + 1], widths[i], widths[i + 1], "ink", (0, 1, 3))
        a_, b_ = m[-2], m[-1]
        for side in (-1.8, 0.0, 1.8):
            cel.limb((b_[0] + side, b_[1] - 1.0), (b_[0] + side * 1.5 + (b_[0] - a_[0]) * 0.6, b_[1] + 2.4), 2.0, 0.8, "ink", (0, 1, 2))
        self.arm(cel, J, "F", far=True)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        cel.stamp_lean(TORSO, L, (px, py), 4, lean)
        hx, hy = J["head"]
        cel.stamp_turn(HEAD, L, (hx, hy + 1), 6, pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0))
        draw_crossbow(cel, J["grip"], pose["xbow"], pose.get("loaded", 1.0) > 0.5)
        self.arm(cel, J, "N", far=False)
        cel.outline()
        if pose.get("loosed", 0.0) > 0.5:
            a = math.radians(pose["xbow"] + 14.0)  # along the line it was aimed on before the kick
            gx, gy = J["grip"]
            for i in range(14, 38):
                cel.soft(gx + math.cos(a) * i, gy + math.sin(a) * i - 2.0, ("light", 0) if i > 26 else ("bone", 6))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=1.2, lean=6.0, footN=(-4.0, 0.0, 0.0), footF=(4.5, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=22.0, elbN=58.0, armF=40.0, elbF=40.0, xbow=14.0, loaded=1.0, loosed=0.0, head_dx=0.0, head_dy=0.0, head_rot=0.0, breath=0.0,
                  xbow_free=0.0, xbow_at=(0.0, 0.0))


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.16))
    # He breathes and keeps looking about.
    look = math.sin(math.tau * (ph - 0.3))
    return {**BASE, "breath": 0.5 + 0.5 * s, "lean": 6.0 - 0.8 * s, "drop": 1.2 + 0.3 * late, "xbow": 14.0 + 2.5 * late, "head_dx": 0.6 * look, "head_rot": 4.0 * look}


def walk_pose(ph: float) -> Pose:
    c, s2 = math.cos(math.tau * ph), math.cos(2 * math.tau * (ph - 0.1))
    p: Pose = gait_legs(Gait(stride=0.92, give=1.2, lift=0.9, toe=0.9), ph)
    # A stalking crouch: body low and forward, the crossbow kept level.
    p.update(lean=11.0 + 1.5 * s2, dy=1.2 + 0.4 * s2, hip_rot=-0.6 * c, sh_rot=0.5 * c, armN=22.0 + 3.0 * c, elbN=58.0, armF=40.0, elbF=40.0,
             xbow=10.0 + 2.5 * math.cos(math.tau * (ph - 0.12)), loaded=1.0, loosed=0.0, head_dx=0.0, head_dy=0.4 * math.cos(2 * math.tau * (ph - 0.2)),
             head_rot=0.0, breath=0.0, xbow_free=0.0, xbow_at=(0.0, 0.0))
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Shoot: shoulder it, sight, fire (it kicks him back), then foot on the ground and haul the string back.
SHOOT_KEYS = [
    (0.00, k(), "lin"),
    (0.18, k(lean=0.0, drop=1.0, armN=66.0, elbN=64.0, xbow=0.0, head_dx=0.6, head_rot=4.0), "out"),
    (0.38, k(lean=-1.0, drop=1.1, armN=68.0, elbN=64.0, xbow=0.0, head_dx=0.8, head_rot=6.0), "io"),
    (0.42, k(dx=-1.8, lean=-7.0, drop=1.3, armN=60.0, elbN=70.0, xbow=-14.0, loaded=0.0, loosed=1.0, head_dx=0.2, footF=(5.2, 0.8, 8.0)), "lin"),
    (0.56, k(dx=-1.2, lean=-2.0, drop=1.2, armN=50.0, elbN=64.0, xbow=-4.0, loaded=0.0), "out"),
    (0.70, k(dx=-0.4, lean=14.0, drop=2.4, armN=30.0, elbN=20.0, xbow=64.0, loaded=0.0, head_dy=0.6), "io"),
    (0.84, k(dx=-0.2, lean=8.0, drop=1.6, armN=34.0, elbN=40.0, xbow=50.0, loaded=1.0, head_dy=0.2), "out"),
    (1.00, k(), "io"),
]

# Hit: the crossbow is knocked up out of line and he folds back over his rear leg.
HURT_KEYS = stagger_keys(BASE, push=4.6, bend=14.0, buckle=2.6, whip=20.0, over={
    "impact": dict(armN=14.0, elbN=62.0, xbow=2.0),
    "reel": dict(armN=-8.0, elbN=72.0, xbow=-28.0),
    "catch": dict(armN=30.0, elbN=52.0, xbow=26.0),
})

# Death: thrown onto his back; the crossbow spins out of his hands.
_BACK = dict(dx=-10.0, drop=11.0, lean=-90.0, armN=-276.0, elbN=12.0, armF=95.0, elbF=-20.0, footN=(6.5, 0.5, 20.0), footF=(10.5, 0.9, 70.0),
             xbow=-180.0, xbow_free=1.0, xbow_at=(13.0, 1.4), loaded=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.08, k(dx=-2.4, drop=1.0, lean=-16.0, head_dx=-1.4, head_rot=-12.0, armN=-30.0, elbN=40.0, armF=60.0, elbF=10.0, xbow=-30.0, xbow_free=0.5, xbow_at=(7.0, 22.0),
             footF=(3.4, 2.4, 20.0)), "out3"),
    (0.20, k(dx=-5.6, drop=-0.4, lean=-35.0, armN=-70.0, elbN=20.0, armF=100.0, elbF=10.0, xbow=-70.0, xbow_free=1.0, xbow_at=(9.0, 24.0), loaded=0.0,
             footN=(-1.6, 2.6, 10.0), footF=(4.0, 5.0, 30.0)), "out"),
    (0.34, k(dx=-8.6, drop=6.0, lean=-70.0, armN=-120.0, elbN=10.0, armF=150.0, elbF=10.0, xbow=-120.0, xbow_free=1.0, xbow_at=(11.5, 17.0), loaded=0.0,
             footN=(5.0, 5.0, 40.0), footF=(8.0, 8.0, 50.0)), "in"),
    (0.42, k(**{**_BACK, "armF": 130.0, "elbF": 0.0, "footF": (9.5, 4.0, 60.0), "xbow": -150.0, "xbow_at": (12.5, 8.0)}), "lin"),
    (0.50, k(**{**_BACK, "drop": 10.0, "lean": -83.0, "armF": 112.0, "footF": (10.0, 5.0, 60.0), "footN": (6.5, 1.8, 20.0), "xbow": -176.0, "xbow_at": (13.0, 1.4)}), "out"),
    (0.62, k(**{**_BACK, "xbow": -170.0, "xbow_at": (13.5, 3.0)}), "in"),
    (0.74, k(**_BACK), "in"),
    (1.00, k(**_BACK), "lin"),
]

STILL = lambda t: (-0.2 + 0.2 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [170] * 12, True, STILL),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [80] * 12, True, lambda t: (-0.7, 0.0)),
    "attack": Anim("attack", keyed(SHOOT_KEYS), [0.0, 0.09, 0.18, 0.28, 0.38, 0.42, 0.49, 0.56, 0.63, 0.70, 0.77, 0.84, 0.92, 1.0],
                   [80, 70, 90, 110, 150, 50, 70, 90, 90, 130, 100, 100, 90, 110], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.04, 0.08, 0.14, 0.20, 0.27, 0.34, 0.38, 0.42, 0.46, 0.50, 0.56, 0.62, 0.74, 1.0],
                  [50, 40, 70, 60, 70, 60, 60, 45, 50, 60, 80, 80, 90, 140, 1200], False, STILL),
}
