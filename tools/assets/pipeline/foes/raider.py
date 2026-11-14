"""Canyon Raider — world 4, melee. A nomad of the canyons wrapped in sun-bleached cloth: a head-wrap with only
the eyes showing, a blue veil and sash, a long scarf streaming behind, a curved blade in each hand. He stands low
and coiled, runs bent double with both blades trailing, and attacks twice in one breath: the leading blade cuts
across, he steps through and the other comes down over the top. He dies on his knees, folding forward over them;
one blade spins away and comes down point-first in the dirt.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, keyed, loose, stagger_keys, swing_smear

FIGURE = ("Raider", "foe", "w04")

BUILD = Build(root_x=40, thigh=6.4, shin=6.4, foot=4.0, hip_dx=1.2, spine=9.0, sh_near=3.0, sh_far=2.6, upper=5.8, fore=5.6, neck=0.9, head_dx=0.7)

L = {
    "b": ("bone", 3), "c": ("bone", 4), "d": ("bone", 5), "e": ("bone", 7),
    "s": ("skin", 1), "t": ("skin", 2), "E": ("light", 0), "k": ("ink", 1),
    "x": ("azure", 2), "y": ("azure", 4), "z": ("azure", 6), "X": ("leather", 2),
}

# Head-wrap, a slit for the eyes, a veil over the rest of the face.
HEAD = [
    "...bccdd...",
    "..bccdddee.",
    ".bbccdddeee",
    ".bccdddeeee",
    ".bcsstEtke.",
    ".xxyyzzzy..",
    ".xxyyzzz...",
    "..xyyzz....",
    "...xyz.....",
]
# Wrapped tunic with a strap across it, a sash, a loose hem.
TORSO = [
    "..bcdde..",
    ".bccddee.",
    "bbccddeee",
    ".bcXddee.",
    ".bccXdee.",
    ".bccdXee.",
    ".xxyyzzz.",
    ".bccddee.",
    ".bc.dd.ee",
    ".b..d...e",
]

BLADE = ((1.5, 0.0), (5.5, -0.6), (9.0, -2.0), (11.5, -4.2))


def blade_points(grip: Pt, angle: float) -> list[Pt]:
    """The curved blade from guard to point; `angle` is where it points from the hand (0 = forward, −90 = up)."""
    a = math.radians(angle)
    d, n = (math.cos(a), math.sin(a)), (-math.sin(a), math.cos(a))
    return [(grip[0] + d[0] * u + n[0] * v, grip[1] + d[1] * u + n[1] * v) for u, v in BLADE]


def draw_blade(cel: Cel, grip: Pt, angle: float, far: bool) -> None:
    """Drawn on its own cel so a blade standing in the ground is cut off at the ground line."""
    a = math.radians(angle)
    pts = blade_points(grip, angle)
    tmp = Cel(cel.w, cel.h, cel.top)
    tmp.limb((grip[0] - math.cos(a) * 2.2, grip[1] - math.sin(a) * 2.2), pts[0], 1.6, 1.6, "leather", (1, 2, 4))
    widths = (2.4, 2.6, 2.0, 0.8)
    for i in range(3):
        tmp.limb(pts[i], pts[i + 1], widths[i], widths[i + 1], "ink", (5, 7, 9), far=far)
    tmp.put(pts[0][0], pts[0][1], ("brass", 5))
    for (x, y), t in tmp.px.items():
        if y < GROUND:
            cel.px[(x, y)] = t


class Raider(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        J["gripN"] = loose(pose, "bladeN", J["handN"], self.build.root_x)
        J["gripF"] = loose(pose, "bladeF", J["handF"], self.build.root_x)
        J["tipN"] = blade_points(J["gripN"], pose["bladeN"])[-1]
        J["tipF"] = blade_points(J["gripF"], pose["bladeF"])[-1]
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def grounded(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        return {
            "scarf": ChainSpec(Chain(7, 2.3, gravity=0.14, drag=0.2, damp=0.08), lambda J: (J["head"][0] - 3.0, J["head"][1] - 2.0), grounded, (-0.9, 0.4)),
            "sash": ChainSpec(Chain(3, 2.2, gravity=0.2, drag=0.16, damp=0.1), lambda J: (J["pelvis"][0] - 2.0, J["pelvis"][1] - 3.0), grounded, (-0.6, 0.8)),
        }

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        hip, knee, ankle, toe = J["hip" + s], J["knee" + s], J["ankle" + s], J["toe" + s]
        cel.limb(hip, knee, 4.4, 3.6, "azure", (0, 1, 3), far=far)  # loose dark trousers
        cel.limb(knee, ankle, 3.6, 2.6, "azure", (0, 1, 3), far=far)
        top = (knee[0] + (ankle[0] - knee[0]) * 0.55, knee[1] + (ankle[1] - knee[1]) * 0.55)
        cel.limb(top, ankle, 3.0, 2.8, "bone", (2, 3, 5), far=far)  # bound shins
        cel.limb(ankle, toe, 2.8, 1.9, "leather", (1, 2, 4), far=far)

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 3.4, 2.8, "bone", (3, 4, 6), far=far)
        cel.limb(el, hd, 2.8, 2.4, "leather", (1, 2, 4), far=far)
        cel.put(hd[0], hd[1], ("skin", 2 if far else 3))
        cel.put(hd[0], hd[1] - 1, ("skin", 2 if far else 3))

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        scarf = ropes["scarf"]
        n = len(scarf) - 1
        for i in range(n):
            cel.limb(scarf[i], scarf[i + 1], 3.0 - 1.4 * i / n, 3.0 - 1.4 * (i + 1) / n, "azure", (2, 4, 6))
        sash = ropes["sash"]
        for i in range(len(sash) - 1):
            cel.limb(sash[i], sash[i + 1], 2.4, 1.8, "azure", (1, 3, 5))
        draw_blade(cel, J["gripF"], pose["bladeF"], far=True)
        self.arm(cel, J, "F", far=True)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        cel.stamp_lean(TORSO, L, (px, py), 4, lean)
        hx, hy = J["head"]
        cel.stamp_turn(HEAD, L, (hx, hy + 1), 5, pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0))
        draw_blade(cel, J["gripN"], pose["bladeN"], far=False)
        self.arm(cel, J, "N", far=False)
        cel.outline()
        for side in "FN":
            if pose.get("smear" + side, 0.0) > 0.5 and len(between) > 2:
                before = set(cel.px)
                swing_smear(cel, [Jb["tip" + side] for Jb, _pb in between], [Jb["grip" + side] for Jb, _pb in between])
                for xy in set(cel.px) - before:
                    if xy[1] >= GROUND:
                        del cel.px[xy]
        dust = pose.get("dust", 0.0)
        if 0.01 < dust < 0.985:
            for i in range(7):
                cel.soft(J["pelvis"][0] - 8.0 + i * 3.0 + 3.0 * dust * (i - 3), GROUND - 1.5 - (i % 3) * 1.4 - 3.0 * dust, ("leather", 6 if i % 2 else 5))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=2.6, lean=12.0, footN=(-4.5, 0.0, 0.0), footF=(5.0, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=-35.0, elbN=80.0, armF=55.0, elbF=35.0, bladeN=-35.0, bladeF=-60.0, head_dx=0.0, head_dy=0.0, head_rot=4.0, breath=0.0,
                  smearN=0.0, smearF=0.0, dust=0.0, bladeN_free=0.0, bladeN_at=(0.0, 0.0), bladeF_free=0.0, bladeF_at=(0.0, 0.0), flash=0.0)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    # Coiled, shifting his weight, the leading blade drawing small circles.
    return {**BASE, "breath": 0.4 + 0.4 * s, "drop": 2.6 + 0.6 * s, "lean": 12.0 + 2.0 * late, "dx": 0.6 * s, "footN": (-4.5 - 0.6 * s, 0.0, 0.0), "footF": (5.0 - 0.6 * s, 0.0, 0.0),
            "armF": 55.0 + 5.0 * late, "bladeF": -60.0 + 10.0 * math.sin(math.tau * (ph - 0.35)), "bladeN": -35.0 + 5.0 * s, "head_rot": 4.0 + 3.0 * late}


def run_pose(ph: float) -> Pose:
    c = math.cos(math.tau * ph)
    p: Pose = gait_legs(Gait(stride=1.0, give=1.2, lift=1.0, toe=0.9, run=True, air=1.4), ph)
    # Bent double, both arms thrown back with the blades trailing behind him.
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 24.0 + 2.0 * math.cos(2 * math.tau * (ph - 0.05)), "dy": p["dy"] + 1.6, "hip_rot": -0.7 * c, "sh_rot": 0.6 * c,
              "armN": -62.0 + 8.0 * c, "elbN": 16.0, "bladeN": 168.0 + 6.0 * c, "armF": -48.0 - 8.0 * c, "elbF": 14.0, "bladeF": 156.0 - 6.0 * c,
              "head_rot": -8.0, "head_dy": 0.3 * math.cos(2 * math.tau * (ph - 0.2))})
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Double cut: the leading blade is drawn back across the body and slashes out; he steps through it and the
# other blade, already over his head, comes down. Feet: the rear one (N) starts at −4.5, the front one (F) at 5.
ATTACK_KEYS = [
    (0.00, k(), "lin"),
    (0.14, k(dx=-1.0, drop=3.6, lean=16.0, armF=-6.0, elbF=96.0, bladeF=-160.0, armN=-40.0, elbN=84.0, bladeN=-40.0, head_rot=8.0, footN=(-3.5, 0.0, 0.0), footF=(6.0, 0.0, 0.0)), "out"),
    (0.22, k(dx=3.0, drop=3.0, lean=14.0, armF=84.0, elbF=6.0, bladeF=14.0, smearF=1.0, armN=30.0, elbN=100.0, bladeN=-100.0, footN=(-7.5, 0.0, -14.0), footF=(6.0, 0.4, 0.0)), "in"),
    (0.30, k(dx=3.6, drop=2.8, lean=10.0, armF=110.0, elbF=-10.0, bladeF=70.0, armN=120.0, elbN=50.0, bladeN=-120.0, footN=(-8.1, 0.0, -16.0), footF=(5.4, 0.0, 0.0)), "out"),
    (0.40, k(dx=4.0, drop=2.4, lean=4.0, armF=-10.0, elbF=20.0, bladeF=110.0, armN=160.0, elbN=36.0, bladeN=-115.0, head_rot=-4.0, footN=(-6.5, 1.0, -10.0), footF=(5.0, 0.0, 0.0)), "io"),
    (0.48, k(dx=7.0, drop=3.8, lean=24.0, armF=-36.0, elbF=20.0, bladeF=140.0, armN=58.0, elbN=8.0, bladeN=36.0, smearN=1.0, head_rot=10.0, footN=(-8.0, 0.0, -20.0), footF=(5.0, 0.0, 0.0)), "in"),
    (0.62, k(dx=7.2, drop=4.0, lean=26.0, armF=-40.0, elbF=20.0, bladeF=144.0, armN=52.0, elbN=8.0, bladeN=44.0, head_rot=12.0, footN=(-8.2, 0.0, -20.0), footF=(4.8, 0.0, 0.0)), "out"),
    (0.82, k(dx=3.0, drop=3.0, lean=14.0, armF=30.0, elbF=40.0, bladeF=-20.0, armN=0.0, elbN=70.0, bladeN=-10.0, footN=(-6.0, 0.8, -6.0), footF=(4.0, 0.6, 4.0)), "io"),
    (1.00, k(), "io"),
]

# Hit: he is light and goes a long way back, both blades thrown wide, and snaps back into his crouch.
HURT_KEYS = stagger_keys(BASE, push=5.0, bend=16.0, buckle=2.0, whip=22.0, over={
    "impact": dict(armF=70.0, elbF=20.0, bladeF=-40.0, armN=-20.0, elbN=70.0, bladeN=-50.0),
    "reel": dict(armF=96.0, elbF=-10.0, bladeF=-96.0, armN=-64.0, elbN=40.0, bladeN=-140.0),
    "catch": dict(armF=40.0, elbF=50.0, bladeF=-30.0, armN=-20.0, elbN=86.0, bladeN=-10.0),
})

# Death: the leading blade spins out of his hand and comes down point-first in the dirt; the other falls behind
# him; he drops to his knees and folds forward over them, head to the ground.
_FOLD = dict(dx=1.0, drop=10.4, lean=78.0, head_rot=10.0, armN=70.0, elbN=10.0, armF=88.0, elbF=-12.0, footN=(-8.5, 0.5, -100.0), footF=(-5.5, 0.5, -100.0),
             bladeN_free=1.0, bladeN_at=(-12.0, 1.2), bladeN=178.0, bladeF_free=1.0, bladeF_at=(23.0, 9.5), bladeF=-270.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.08, k(dx=-2.5, drop=2.0, lean=-10.0, head_rot=-20.0, head_dx=-1.0, armN=-60.0, elbN=30.0, bladeN=-80.0, armF=110.0, elbF=10.0, bladeF=-96.0, bladeF_free=0.3, bladeF_at=(12.0, 28.0),
             footN=(-2.0, 0.0, 0.0), footF=(7.5, 1.2, 8.0)), "out3"),
    (0.24, k(dx=-2.0, drop=6.0, lean=14.0, head_rot=16.0, armN=-30.0, elbN=20.0, bladeN=60.0, bladeN_free=0.6, bladeN_at=(-9.0, 8.0), armF=50.0, elbF=10.0,
             bladeF=-200.0, bladeF_free=1.0, bladeF_at=(18.0, 34.0), footN=(-6.0, 0.4, -90.0), footF=(-2.5, 0.4, -90.0)), "io"),
    (0.40, k(dx=-1.0, drop=8.0, lean=40.0, head_rot=20.0, armN=40.0, elbN=10.0, bladeN=176.0, bladeN_free=1.0, bladeN_at=(-12.0, 1.2), armF=60.0, elbF=0.0,
             bladeF=-252.0, bladeF_free=1.0, bladeF_at=(22.0, 24.0), footN=(-7.0, 0.5, -100.0), footF=(-4.0, 0.5, -100.0), dust=0.02), "io"),
    (0.52, k(**{**_FOLD, "drop": 9.6, "lean": 62.0, "dx": 0.0}, dust=0.5), "in"),
    (0.60, k(**{**_FOLD, "bladeF": -262.0}, dust=0.98), "in"),
    (0.68, k(**{**_FOLD, "lean": 73.0, "bladeF": -275.0}, dust=1.0), "out"),
    (0.78, k(**_FOLD, dust=1.0), "in"),
    (1.00, k(**_FOLD, dust=1.0), "lin"),
]

STILL = lambda t: (-0.3 + 0.2 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [150] * 12, True, STILL),
    "run": Anim("run", run_pose, [i / 12 for i in range(12)], [50] * 12, True, lambda t: (-1.2, 0.0)),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.07, 0.14, 0.22, 0.26, 0.30, 0.35, 0.40, 0.48, 0.55, 0.62, 0.72, 0.82, 0.91, 1.0],
                   [70, 80, 110, 40, 50, 60, 60, 90, 40, 60, 130, 90, 90, 80, 100], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.04, 0.08, 0.16, 0.24, 0.32, 0.40, 0.46, 0.52, 0.56, 0.60, 0.64, 0.68, 0.78, 1.0],
                  [50, 40, 70, 70, 80, 70, 80, 60, 60, 50, 70, 60, 80, 120, 1200], False, STILL),
}
