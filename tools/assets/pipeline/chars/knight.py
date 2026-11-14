"""Knight — heavy and deliberate. Stocky skeleton, plate armour, a cape and a plume that trail his movement,
shield on the far arm, sword held forward in guard. He jogs upright and strikes with his whole body."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, keyed, stagger_keys

BUILD = Build(root_x=40, thigh=6.4, shin=6.2, foot=4.6, hip_dx=1.5, spine=10.0, sh_near=3.6, sh_far=3.0, upper=6.0, fore=5.6, neck=1.0, head_dx=0.4,
              leg_scale=12.6 / 16.0)

L = {
    "0": ("ink", 1), "1": ("ink", 2), "2": ("ink", 3), "3": ("ink", 4), "4": ("ink", 5), "5": ("ink", 6), "6": ("ink", 7), "7": ("ink", 8), "8": ("ink", 9),
    "a": ("azure", 2), "b": ("azure", 3), "c": ("azure", 4),
    "h": ("brass", 3), "i": ("brass", 4), "j": ("brass", 5),
    "l": ("leather", 2), "m": ("leather", 3),
}
STEEL = ("ink", (3, 5, 7))

HELM = [
    "...345566..",
    "..34556677.",
    ".2345566777",
    ".2345566777",
    ".234500000.",
    ".2i45566777",
    ".2344556677",
    ".23445667..",
    "..2344556..",
    "...23344...",
    "....2334...",
]
TORSO = [
    "....3456...",
    "..23456677.",
    ".2345566777",
    ".2abbbccc76",
    ".2abbbccc76",
    ".2aabjbcc66",
    "..aabbbcc6.",
    "..aabbbccc.",
    "..1aabbcc..",
    "..lmhijml..",
]
FAULD = [
    "232343454",
    "123234345",
    ".1232343.",
]
PAULDRON_NEAR = [
    "..3456.",
    ".345667",
    "2345667",
    "1234556",
    ".12334.",
]
PAULDRON_FAR = [
    ".456.",
    "45677",
    "34566",
    ".345.",
]
SHIELD = [
    ".36666.",
    "3abcc6.",
    "3abbcc6",
    "3abbcc6",
    "3abicc6",
    "3aijic6",
    "3abicc6",
    "3abbcc6",
    "3abbc6.",
    ".3abc6.",
    ".3ab6..",
    "..3a6..",
    "..36...",
]

SWORD_LEN = 17.0


def blade(hand: Pt, angle: float) -> tuple[Pt, Pt, Pt]:
    a = math.radians(angle)
    d = (math.cos(a), math.sin(a))
    return d, (hand[0] + d[0] * 2.6, hand[1] + d[1] * 2.6), (hand[0] + d[0] * SWORD_LEN, hand[1] + d[1] * SWORD_LEN)


def draw_sword(cel: Cel, hand: Pt, angle: float) -> None:
    d, base, tip = blade(hand, angle)
    n = (-d[1], d[0])
    if tip[1] > GROUND and tip[1] > base[1]:
        # Planted point-down: the blade stops at the ground.
        t = max(0.05, (GROUND - base[1]) / (tip[1] - base[1]))
        tip = (base[0] + (tip[0] - base[0]) * t, base[1] + (tip[1] - base[1]) * t)
    cel.limb(base, tip, 2.7, 1.4, "ink", (5, 8, 9))
    for i in range(-3, 1):
        cel.put(hand[0] + d[0] * i, hand[1] + d[1] * i, ("leather", 2))
    cel.put(hand[0] - d[0] * 4, hand[1] - d[1] * 4, ("brass", 5))
    g = (hand[0] + d[0] * 1.6, hand[1] + d[1] * 1.6)
    cel.line((g[0] - n[0] * 3.0, g[1] - n[1] * 3.0), (g[0] + n[0] * 3.0, g[1] + n[1] * 3.0), ("brass", 4))


class Knight(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        # The crest the plume grows from turns with the helm when he goes down.
        lean = pose.get("lean", 0.0)
        a = math.radians(lean if abs(lean) > 24 else 0.0)
        hx, hy = J["head"]
        J["crest"] = (hx - 0.5 * math.cos(a) + 10.5 * math.sin(a), hy - 0.5 * math.sin(a) - 10.5 * math.cos(a))
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def cape_hit(pts: list[Pt], J: dict[str, Pt]) -> None:
            # The cape stays behind the back and off the ground.
            cx, cy = J["chest"]
            px, py = J["pelvis"]
            for i in range(1, len(pts)):
                x, y = pts[i]
                t = max(0.0, min(1.0, (y - cy) / max(1.0, py - cy)))
                back = cx - 2.8 + (px - 2.6 - (cx - 2.8)) * t
                pts[i] = (min(x, back), min(y, GROUND - 2.0))

        return {
            "cape": ChainSpec(Chain(7, 2.6, gravity=0.28, drag=0.12, damp=0.1), lambda J: (J["chest"][0] - 2.0, J["chest"][1] + 2.0), cape_hit),
            "plume": ChainSpec(Chain(4, 2.2, gravity=0.04, drag=0.2, damp=0.1, shape=[(0, 0), (-1.4, -1.7), (-3.4, -2.3), (-5.5, -1.5)], stiff=0.22),
                               lambda J: J["crest"], None, (-0.8, -0.6)),
            "tabard": ChainSpec(Chain(3, 3.0, gravity=0.16, drag=0.08), lambda J: (J["pelvis"][0] + 1.2, J["pelvis"][1] + 1.0)),
        }

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        cel.limb(J["hip" + s], J["knee" + s], 5.6, 4.7, *STEEL, far=far)
        cel.limb(J["knee" + s], J["ankle" + s], 4.5, 3.6, *STEEL, far=far)
        cel.limb(J["ankle" + s], J["toe" + s], 3.3, 2.3, *STEEL, far=far)
        kx, ky = J["knee" + s]
        cel.put(kx + 0.8, ky - 0.6, ("ink", 7 if far else 8))
        cel.put(kx + 0.8, ky + 0.4, ("ink", 6 if far else 7))

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        cel.limb(J["sh" + s], J["elbow" + s], 4.2, 3.6, *STEEL, far=far)
        cel.limb(J["elbow" + s], J["hand" + s], 3.6, 3.2, *STEEL, far=far)
        hx, hy = J["hand" + s]
        for dx, dy, i in ((0, 0, 6), (1, 0, 7), (0, 1, 4), (1, 1, 5), (-1, 0, 4)):
            cel.put(hx + dx - 0.5, hy + dy - 0.5, ("ink", i - (1 if far else 0)))

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        # Cape: a ribbon that widens down its length, ending in two tattered tails.
        cape = ropes["cape"]
        widths = [2.2, 3.6, 5.2, 6.4, 7.2, 7.4, 6.4]
        for i in range(len(cape) - 2):
            cel.limb(cape[i], cape[i + 1], widths[i], widths[i + 1], "crimson", (1, 2, 3))
        a, b = cape[-2], cape[-1]
        nx, ny = -(b[1] - a[1]) / 3.0, (b[0] - a[0]) / 3.0
        for side in (-1, 1):
            cel.limb((a[0] + nx * side * 1.8, a[1] + ny * side * 1.8), (b[0] + nx * side * 2.6, b[1] + ny * side * 2.6), 3.6, 1.6, "crimson", (1, 2, 3))
        self.arm(cel, J, "F", far=True)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        tab = ropes["tabard"]
        for i in range(len(tab) - 1):
            cel.limb(tab[i], tab[i + 1], 3.4, 3.0 - i * 0.6, "azure", (2, 3, 4))
        px, py = J["pelvis"]
        cel.stamp(FAULD, L, px - 4, py)
        cel.stamp_lean(TORSO, L, (px, py - pose.get("breath", 0.0)), 5, lean)
        fx, fy = J["shF"]
        cel.stamp(PAULDRON_FAR, L, fx - 2, fy - 2)
        hx, hy = J["handF"]
        cel.stamp(SHIELD, L, hx - 4 + pose.get("shield_dx", 0.0), min(hy - 6, GROUND - 13))
        ex, ey = J["head"]
        cel.stamp_turn(HELM, L, (ex, ey + 1), 5, pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0))
        plume = ropes["plume"]
        for i in range(len(plume) - 1):
            cel.limb(plume[i], plume[i + 1], 2.6 - i * 0.3, 2.2 - i * 0.4, "crimson", (2, 4, 5))
        draw_sword(cel, J["handN"], pose["sword"])
        self.arm(cel, J, "N", far=False)
        nx_, ny_ = J["shN"]
        cel.stamp(PAULDRON_NEAR, L, nx_ - 3, ny_ - 3)
        cel.outline()
        # Swing smear: a crescent along the arc the blade swept since the previous frame — a hair at the old
        # end, half the blade wide at the new one — drawn behind the figure.
        if pose.get("smear", 0.0) > 0.5 and len(between) > 2:
            body = set(cel.px)
            path = [blade(Jb["handN"], pb["sword"]) for Jb, pb in between]
            outer = [tip for _, _, tip in path]
            inner = []
            for i, (d, _, tip) in enumerate(path):
                f = i / (len(path) - 1)
                r = SWORD_LEN * (1.0 - 0.52 * f**0.7)
                inner.append((tip[0] - d[0] * (SWORD_LEN - r), tip[1] - d[1] * (SWORD_LEN - r)))
            for xy in cel.poly_mask(outer + inner[::-1]):
                if xy not in body:
                    cel.px[xy] = ("bone", 7)
            rim = Cel(cel.w, cel.h)
            for p0, p1 in zip(outer[len(outer) // 3:], outer[len(outer) // 3 + 1:]):
                rim.line(p0, p1, ("light", 0))
            for xy, t in rim.px.items():
                if xy not in body:
                    cel.px[xy] = t
        if pose.get("spark", 0.0) > 0.5:
            cel.star(J["handF"][0] + 4.0, J["handF"][1] - 3.0, 5)
        ring = pose.get("ring", 0.0)
        if 0.03 < ring < 0.97:
            # Battle cry: sound rolling out ahead of the helm, a glint on the raised blade.
            hx2, hy2 = J["head"][0] + 4.0, J["head"][1] - 4.0
            for k_, r in enumerate((4.0 + ring * 10.0, 8.0 + ring * 12.0)):
                cel.arc(hx2, hy2, r, -48, 48, ("light", 0) if ring < 0.6 and k_ == 0 else ("bone", 6))
            _, _, tip = blade(J["handN"], pose["sword"])
            cel.star(tip[0], tip[1], 3)


# --------------------------------------------------------------------------------------- animations
GUARD: Pose = dict(dx=0.0, drop=1.0, lean=2.0, footN=(-5.0, 0.0, 0.0), footF=(5.5, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                   armN=15.0, elbN=75.0, armF=20.0, elbF=40.0, sword=-40.0, head_dx=0.0, head_dy=0.0, breath=0.0, smear=0.0, shield_dx=0.0,
                   spark=0.0, ring=0.0, head_rot=0.0, reachN=(0.0, 0.0), reachN_w=0.0)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.12))
    return {**GUARD, "breath": 0.5 + 0.5 * s, "lean": 2.0 - 0.8 * s, "drop": 1.0 + 0.25 * late, "elbN": 75.0 + 3.0 * late,
            "elbF": 40.0 + 4.0 * late, "sword": -40.0 - 2.5 * late, "head_dy": -0.3 * late}


# A steady armoured jog, not a sprint: long strides at about 180 steps a minute (the party moves at 48 px/s, and
# a stride of 1.22 covers ~31 px per cycle, so the planted foot does not slide).
JOG = Gait(stride=1.22, give=1.15, lift=0.8, toe=0.9, run=True, air=1.7)


def run_pose(ph: float) -> Pose:
    c, s2 = math.cos(math.tau * ph), math.cos(2 * math.tau * (ph - 0.08))
    p: Pose = gait_legs(JOG, ph)
    # Sword held forward in guard, the arm riding the stride instead of swinging free; shield tucked in.
    p.update(lean=5.0 + 1.4 * s2, hip_rot=-0.8 * c, sh_rot=0.9 * c,
             armN=15.0 - 8.0 * c, elbN=75.0 + 6.0 * c, sword=-38.0 + 6.0 * math.cos(math.tau * (ph - 0.12)),
             armF=20.0 + 5.0 * c, elbF=40.0 + 4.0 * s2, head_dx=0.0, head_dy=0.5 * math.cos(2 * math.tau * (ph - 0.2)),
             breath=0.0, smear=0.0, shield_dx=0.0, spark=0.0, ring=0.0)
    return p


def k(**over: object) -> Pose:
    return {**GUARD, **over}


ATTACK_KEYS = [
    (0.00, k(), "lin"),
    # Wind-up: weight onto the back leg, the chest turns away, the sword is cocked over the shoulder and the
    # shield comes up to cover.
    (0.22, k(dx=-2.6, drop=2.4, lean=-5.0, sh_rot=1.4, armN=-104.0, elbN=234.0, sword=-150.0, footF=(5.5, 1.6, 12.0), armF=30.0, elbF=58.0), "out"),
    (0.34, k(dx=-3.2, drop=2.7, lean=-7.0, sh_rot=1.6, armN=-110.0, elbN=240.0, sword=-162.0, footF=(7.0, 2.2, 14.0), armF=32.0, elbF=60.0), "io"),
    # Strike: the hips drive forward, the arm unfolds over the top and the blade whips after it.
    (0.42, k(dx=3.0, drop=2.2, lean=10.0, sh_rot=-1.0, armN=-200.0, elbN=350.0, sword=-110.0, footF=(11.0, 0.6, 4.0), footN=(-5.0, 0.0, -14.0), armF=8.0, elbF=36.0, smear=1.0), "in"),
    (0.48, k(dx=7.0, drop=3.0, lean=18.0, sh_rot=-1.6, armN=-282.0, elbN=372.0, sword=12.0, footF=(11.0, 0.0, 0.0), footN=(-5.0, 0.0, -25.0), armF=-6.0, elbF=30.0, smear=1.0, shield_dx=-1.0), "lin"),
    # Impact held, then the blade carries on down as the body sinks into the lunge.
    (0.60, k(dx=7.6, drop=3.5, lean=21.0, sh_rot=-1.6, armN=-300.0, elbN=380.0, sword=38.0, footF=(11.0, 0.0, 0.0), footN=(-5.0, 0.0, -27.0), armF=-6.0, elbF=28.0, shield_dx=-1.0), "out"),
    (0.74, k(dx=6.2, drop=3.0, lean=16.0, sh_rot=-0.8, armN=-318.0, elbN=390.0, sword=58.0, footF=(11.0, 0.0, 0.0), footN=(-5.0, 0.0, -18.0), armF=4.0, elbF=34.0), "io"),
    # Recover: push off the lead foot, the sword comes back up into guard.
    (0.88, k(dx=2.0, drop=1.6, lean=7.0, armN=-338.0, elbN=420.0, sword=6.0, footF=(8.0, 1.4, 6.0), armF=16.0, elbF=40.0), "io"),
    (1.00, k(armN=-345.0, elbN=435.0), "out"),
]

# Rising cleave: the blade drops behind him, then rips up from low to high as he steps in.
CLEAVE_KEYS = [
    (0.00, k(), "lin"),
    (0.22, k(dx=-2.4, drop=3.2, lean=9.0, sh_rot=1.2, armN=-38.0, elbN=18.0, sword=152.0, armF=26.0, elbF=50.0), "out"),
    (0.34, k(dx=-3.0, drop=3.6, lean=11.0, sh_rot=1.4, armN=-44.0, elbN=14.0, sword=160.0, armF=26.0, elbF=52.0), "io"),
    (0.42, k(dx=2.5, drop=2.6, lean=8.0, sh_rot=-0.8, armN=30.0, elbN=20.0, sword=80.0, footF=(10.0, 0.6, 4.0), footN=(-5.0, 0.0, -14.0), armF=10.0, elbF=36.0, smear=1.0), "in"),
    (0.48, k(dx=6.5, drop=1.6, lean=4.0, sh_rot=-1.5, armN=96.0, elbN=14.0, sword=-38.0, footF=(10.5, 0.0, 0.0), footN=(-5.0, 0.0, -24.0), armF=0.0, elbF=30.0, smear=1.0), "lin"),
    (0.58, k(dx=7.0, drop=0.6, lean=-2.0, sh_rot=-1.5, armN=138.0, elbN=12.0, sword=-84.0, footF=(10.5, 0.0, 0.0), footN=(-5.0, 0.0, -28.0), armF=0.0, elbF=28.0), "out"),
    (0.72, k(dx=6.0, drop=1.2, lean=2.0, armN=120.0, elbN=30.0, sword=-70.0, footF=(10.5, 0.0, 0.0), footN=(-5.0, 0.0, -16.0), armF=8.0, elbF=34.0), "io"),
    (0.88, k(dx=2.0, drop=1.2, armN=50.0, elbN=62.0, sword=-48.0, footF=(8.0, 1.2, 6.0)), "io"),
    (1.00, k(), "out"),
]

# Block: the shield snaps up, takes the blow (he is driven back a step) and comes down.
BLOCK_KEYS = [
    (0.00, k(), "lin"),
    (0.18, k(dx=-0.5, drop=2.2, lean=5.0, armF=62.0, elbF=62.0, armN=-10.0, elbN=60.0, sword=-70.0, footN=(-6.0, 0.0, 0.0)), "out3"),
    (0.34, k(dx=-0.5, drop=2.3, lean=5.0, armF=62.0, elbF=62.0, armN=-10.0, elbN=60.0, sword=-70.0, footN=(-6.0, 0.0, 0.0)), "lin"),
    (0.40, k(dx=-3.0, drop=2.9, lean=-2.0, armF=54.0, elbF=70.0, armN=-16.0, elbN=56.0, sword=-78.0, footN=(-7.5, 0.0, 0.0), footF=(4.0, 0.0, 0.0), head_dx=-0.6, shield_dx=-1.0, spark=1.0), "out3"),
    (0.60, k(dx=-2.2, drop=2.4, lean=3.0, armF=58.0, elbF=64.0, armN=-10.0, elbN=60.0, sword=-70.0, footN=(-7.0, 0.0, 0.0), footF=(4.5, 0.0, 0.0)), "io"),
    (1.00, k(), "io"),
]

# Battle cry: he gathers, then rises to his full height with the sword thrust up.
SHOUT_KEYS = [
    (0.00, k(), "lin"),
    (0.25, k(drop=2.6, lean=8.0, armN=0.0, elbN=80.0, sword=-20.0, head_dy=0.6), "out"),
    (0.42, k(drop=0.6, lean=-2.0, armN=110.0, elbN=40.0, sword=-70.0, armF=0.0, elbF=34.0), "in"),
    (0.50, k(drop=-0.3, lean=-6.0, armN=170.0, elbN=10.0, sword=-88.0, armF=-30.0, elbF=30.0, head_dy=-0.6, ring=0.1), "out3"),
    (0.75, k(drop=-0.2, lean=-6.0, armN=174.0, elbN=8.0, sword=-92.0, armF=-32.0, elbF=30.0, head_dy=-0.6, ring=0.96), "lin"),
    (0.87, k(drop=0.6, lean=-1.0, armN=110.0, elbN=40.0, sword=-66.0, armF=0.0, elbF=34.0, ring=1.0), "io"),
    (1.00, k(), "io"),
]

# Hit: armoured and heavy, he gives little ground. The shield jerks up, the sword arm is thrown back, and he
# comes back behind the shield.
HURT_KEYS = stagger_keys(GUARD, push=3.2, bend=9.0, buckle=2.2, whip=12.0, over={
    "impact": dict(armF=34.0, elbF=52.0, armN=4.0, elbN=66.0, sword=-52.0),
    "reel": dict(armF=4.0, elbF=30.0, armN=-24.0, elbN=50.0, sword=-80.0),
    "catch": dict(armF=28.0, elbF=48.0, armN=10.0, elbN=70.0, sword=-46.0),
})

# Defeat: the blow rocks him back two steps, he drops to one knee driving the sword point-down into the
# ground to hold himself up, and sags over it with his head bowed. He stays there until he is revived.
_KNEEL = dict(dx=-6.5, footN=(-12.5, 3.2, -110.0), footF=(1.5, 0.0, 0.0), sword=90.0, reachN=(-0.5, 15.0), reachN_w=1.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.08, k(dx=-2.5, drop=1.6, lean=-14.0, head_dx=-1.2, head_dy=-0.5, head_rot=-14.0, armN=-5.0, elbN=50.0, sword=-75.0, armF=-15.0, elbF=30.0,
             footF=(4.5, 1.5, 12.0)), "out3"),
    (0.22, k(dx=-5.0, drop=2.2, lean=-8.0, head_rot=-6.0, armN=10.0, elbN=40.0, sword=-40.0, armF=5.0, elbF=30.0, footF=(1.5, 0.0, 0.0), footN=(-8.5, 1.0, -5.0)), "io"),
    (0.36, k(dx=-6.5, drop=3.0, lean=3.0, head_dy=0.3, head_rot=6.0, armN=25.0, elbN=30.0, sword=20.0, armF=15.0, elbF=30.0, footN=(-10.5, 0.0, 0.0),
             footF=(1.5, 0.0, 0.0)), "io"),
    (0.50, k(drop=7.6, lean=14.0, head_dy=0.8, head_rot=10.0, armF=30.0, elbF=10.0, **_KNEEL), "in"),
    (0.56, k(drop=7.0, lean=10.0, head_dy=-0.2, head_rot=2.0, armF=32.0, elbF=10.0, **_KNEEL), "out"),
    (0.70, k(drop=7.8, lean=16.0, head_dy=1.0, head_rot=16.0, armF=34.0, elbF=6.0, **_KNEEL), "io"),
    (1.00, k(drop=8.3, lean=21.0, head_dy=1.8, head_dx=0.6, head_rot=32.0, armF=36.0, elbF=4.0, **{**_KNEEL, "dx": -6.2, "reachN": (-0.5, 13.6)}), "io"),
]

STILL = lambda t: (-0.1, 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [170] * 12, True, lambda t: (-0.3 + 0.2 * math.sin(math.tau * t), 0.0)),
    "run": Anim("run", run_pose, [i / 14 for i in range(14)], [48] * 14, True, lambda t: (-1.5, 0.0)),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.11, 0.22, 0.34, 0.42, 0.48, 0.54, 0.60, 0.74, 0.88, 1.0],
                   [80, 70, 80, 130, 35, 50, 90, 110, 100, 90, 130], False, STILL),
    "cleave": Anim("cleave", keyed(CLEAVE_KEYS), [0.0, 0.11, 0.22, 0.34, 0.42, 0.48, 0.53, 0.58, 0.72, 0.88, 1.0],
                   [80, 70, 80, 120, 35, 50, 80, 110, 100, 90, 120], False, STILL),
    "block": Anim("block", keyed(BLOCK_KEYS), [0.0, 0.09, 0.18, 0.34, 0.40, 0.48, 0.60, 0.8, 1.0], [50, 50, 90, 60, 50, 80, 90, 90, 100], False, STILL),
    "shout": Anim("shout", keyed(SHOUT_KEYS), [0.0, 0.12, 0.25, 0.34, 0.42, 0.5, 0.58, 0.66, 0.75, 0.87, 1.0],
                  [70, 70, 90, 50, 50, 80, 90, 90, 110, 90, 100], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.04, 0.08, 0.15, 0.22, 0.29, 0.36, 0.43, 0.50, 0.56, 0.63, 0.70, 0.85, 1.0],
                  [50, 40, 70, 70, 80, 80, 90, 70, 60, 70, 90, 120, 160, 1200], False, STILL),
}
