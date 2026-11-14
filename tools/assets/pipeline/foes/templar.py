"""Sky Templar — world 9, melee. A guardian of the citadel in a winged helm and gilded plate, a long azure tabard, a
tall shield on one arm and a halberd in the other hand. There is nobody inside: only a cold light behind the visor.
It marches rather than runs, never hurries, and attacks with one long overhead chop of the halberd. When the light
goes out the armour simply stops: the halberd topples, it sinks to its knees, and the empty helm rolls off.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, keyed, loose, stagger_keys, swing_smear

FIGURE = ("Templar", "foe", "w09")

BUILD = Build(root_x=40, thigh=6.6, shin=6.6, foot=4.4, hip_dx=1.4, spine=10.4, sh_near=3.8, sh_far=3.2, upper=6.2, fore=6.0, neck=1.0, head_dx=0.6)


def _rows(*rows: str) -> list[str]:
    w = max(len(r) for r in rows)
    return [r.ljust(w, ".") for r in rows]


L = {
    "h": ("brass", 2), "i": ("brass", 3), "j": ("brass", 4), "J": ("brass", 5), "K": ("brass", 6),
    "k": ("ink", 0), "W": ("bone", 7), "w": ("bone", 5), "v": ("bone", 3),
    "a": ("azure", 1), "b": ("azure", 2), "c": ("azure", 3), "d": ("azure", 4),
}

# Gilded barbute with a T-shaped visor (G is the light behind it) and a white wing swept back from the temple.
HELM = _rows(
    "ww.........",
    "vWw..ijj...",
    ".vWWijjJJ..",
    "..vWijjJJK.",
    "..hiijjJJKK",
    "..hijjkkGkK",
    "..hijjJJkKK",
    "..hiijJJkK.",
    "...hijjJkK.",
    "...hhijjJ..",
    "....hiij...",
)
# Gorget and cuirass, the azure tabard down the front with a gold sun on it, a belt, the tabard's skirt.
TORSO = _rows(
    "..hijJ...",
    ".hiijjJK.",
    "hhiijjJKK",
    ".hibcdJK.",
    ".hibcdJK.",
    ".hiKcdJK.",
    "..ibcdJ..",
    "..hhjjJ..",
    ".aabbccd.",
    ".aab.ccd.",
)
PAULDRON = _rows(
    ".jJK.",
    "ijJKK",
    "hijJK",
    ".hij.",
)
SHIELD = _rows(
    ".bccdd.",
    "bbccddd",
    "bbcKddd",
    "bcKKKdd",
    "bbcKddd",
    "bbcKddd",
    "bbccddd",
    "bbccddd",
    "bbccddd",
    "bbccddd",
    ".bccdd.",
    ".bbcdd.",
    "..bcd..",
    "...c...",
)

SHAFT_UP, SHAFT_DOWN = 21.0, 12.0


def halberd_points(grip: Pt, angle: float) -> tuple[Pt, Pt, list[Pt], Pt]:
    """Foot and head of the shaft, the four corners of the axe blade and the tip of the spike. `angle` is where
    the head points (−90 = straight up); the blade faces forward of that."""
    a = math.radians(angle)
    d, f = (math.cos(a), math.sin(a)), (-math.sin(a), math.cos(a))

    def at(u: float, v: float) -> Pt:
        return (grip[0] + d[0] * u + f[0] * v, grip[1] + d[1] * u + f[1] * v)

    edge = [at(SHAFT_UP - 5.6, 0.8), at(SHAFT_UP - 8.0, 6.4), at(SHAFT_UP + 0.6, 6.4), at(SHAFT_UP - 1.8, 0.8)]
    return at(-SHAFT_DOWN, 0.0), at(SHAFT_UP, 0.0), edge, at(SHAFT_UP + 6.0, 0.0)


def draw_halberd(cel: Cel, grip: Pt, angle: float) -> None:
    """Drawn on its own cel so the part that bites into the ground is cut off."""
    foot, top, edge, spike = halberd_points(grip, angle)
    tmp = Cel(cel.w, cel.h, cel.top)
    tmp.limb(foot, top, 1.8, 1.8, "leather", (2, 3, 5))
    a_, b_, c_, e_ = edge
    mid0, mid1 = ((a_[0] + e_[0]) / 2, (a_[1] + e_[1]) / 2), ((b_[0] + c_[0]) / 2, (b_[1] + c_[1]) / 2)
    tmp.limb(mid0, mid1, 3.4, 7.6, "ink", (3, 5, 7))  # a flaring axe blade
    tmp.limb(b_, c_, 1.4, 1.4, "ink", (7, 8, 9))  # its edge
    back = (mid0[0] - (mid1[0] - mid0[0]) * 0.8, mid0[1] - (mid1[1] - mid0[1]) * 0.8)
    tmp.limb(mid0, back, 2.2, 0.7, "ink", (3, 5, 7))  # the fluke behind the shaft
    tmp.limb(top, spike, 1.8, 0.5, "ink", (5, 7, 9))
    tmp.put(top[0], top[1], ("brass", 5))
    for (x, y), t in tmp.px.items():
        if y < GROUND:
            cel.px[(x, y)] = t


class Templar(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        J["grip"] = loose(pose, "halberd", J["handN"], self.build.root_x)
        # The helm is a loose prop: on the neck until the armour gives up.
        lean, free = pose.get("lean", 0.0), pose.get("helm_free", 0.0)
        turn = pose.get("head_rot", 0.0) + (lean * (1.0 - free) if abs(lean) > 24.0 else 0.0)
        a = math.radians(turn)
        nx, ny = J["head"]
        J["helm"] = loose(pose, "helm", (nx + 5.5 * math.sin(a), ny + 1.0 - 5.5 * math.cos(a)), self.build.root_x)
        J["turn"] = (turn, 0.0)
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def grounded(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        return {"tabard": ChainSpec(Chain(4, 2.3, gravity=0.22, drag=0.14, damp=0.1), lambda J: (J["pelvis"][0] + 1.2, J["pelvis"][1] + 0.5), grounded)}

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        hip, knee, ankle, toe = J["hip" + s], J["knee" + s], J["ankle" + s], J["toe" + s]
        cel.limb(hip, knee, 4.2, 3.6, "brass", (1, 3, 4), far=far)
        cel.limb(knee, ankle, 3.6, 2.8, "brass", (2, 4, 5), far=far)
        cel.limb(ankle, toe, 3.2, 2.2, "brass", (1, 3, 4), far=far)
        cel.put(knee[0] + 0.5, knee[1], ("brass", 5 if far else 6))

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 3.6, 3.0, "azure", (1, 2, 4), far=far)
        cel.limb(el, hd, 3.0, 2.6, "brass", (2, 4, 5), far=far)
        cel.put(hd[0], hd[1], ("brass", 2 if far else 3))

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        glow = pose.get("glow", 0.8)
        Lg = {**L, "G": ("light", 0) if glow >= 0.95 else ("azure", 7) if glow >= 0.5 else ("azure", 4) if glow >= 0.15 else ("ink", 0)}
        self.arm(cel, J, "F", far=True)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        cel.stamp_lean(TORSO, Lg, (px, py), 4, lean)
        tab = ropes["tabard"]
        for i in range(len(tab) - 1):
            cel.limb(tab[i], tab[i + 1], 4.4 - i * 0.3, 4.0 - i * 0.3, "azure", (1, 2, 4))
        cel.put(tab[-1][0] - 1, tab[-1][1], ("brass", 5))
        cel.put(tab[-1][0], tab[-1][1], ("brass", 6))
        cel.put(tab[-1][0] + 1, tab[-1][1], ("brass", 5))
        # The tall shield on the far arm; it stands on the ground when the arm goes slack.
        hx, hy = J["handF"]
        cel.stamp(SHIELD, Lg, hx - 3, min(hy - 6, GROUND - 14))
        # Neck: a gorget rim around nothing.
        nx, ny = J["head"]
        for dx in (-2, -1, 0, 1):
            cel.put(nx + dx, ny + 1, ("ink", 0))
        turn = J["turn"][0]
        cel.stamp_pivot(HELM, Lg, J["helm"], 5.5, 5.5, turn)
        draw_halberd(cel, J["grip"], pose["halberd"])
        self.arm(cel, J, "N", far=False)
        sx, sy = J["shN"]
        if abs(lean) <= 24.0:
            cel.stamp(PAULDRON, Lg, sx - 3, sy - 2)
        cel.outline()

        _, _, edge, _ = halberd_points(J["grip"], pose["halberd"])
        if pose.get("smear", 0.0) > 0.5 and len(between) > 2:
            before = set(cel.px)
            tips, hubs = [], []
            for Jb, pb in between:
                tips.append(halberd_points(Jb["grip"], pb["halberd"])[2][2])
                hubs.append(Jb["grip"])
            swing_smear(cel, tips, hubs)
            for xy in set(cel.px) - before:
                if xy[1] >= GROUND:
                    del cel.px[xy]
        spark = pose.get("spark", 0.0)
        if 0.01 < spark < 0.985:
            ix, iy = min(edge[2][0], cel.w - 8.0), GROUND - 2.0
            if spark < 0.35:
                cel.star(ix, iy - 1, 3)
            for i in range(7):  # chips of marble
                a = math.radians(-165 + i * 25.0)
                dist = 3.0 + (8.0 + (i * 3 % 4) * 1.6) * spark
                x, y = ix + math.cos(a) * dist, iy + math.sin(a) * dist + 7.0 * spark * spark
                if y < GROUND - 1:
                    cel.soft(x, y, ("bone", 7) if i % 2 else ("bone", 5))
        if glow >= 0.5 and pose.get("helm_free", 0.0) < 0.3:
            a = math.radians(turn)
            ex, ey = J["helm"][0] + 5.0 * math.cos(a), J["helm"][1] + 5.0 * math.sin(a)
            cel.soft(ex, ey, ("azure", 7))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=1.0, lean=2.0, footN=(-4.5, 0.0, 0.0), footF=(5.0, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=18.0, elbN=62.0, armF=24.0, elbF=44.0, halberd=-82.0, head_dx=0.0, head_dy=0.0, head_rot=0.0, breath=0.0,
                  glow=0.8, smear=0.0, spark=0.0, helm_free=0.0, helm_at=(0.0, 0.0), halberd_free=0.0, halberd_at=(0.0, 0.0))


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    # At attention. Only the helm moves: it turns to look, holds, and turns back.
    look = max(-1.0, min(1.0, 2.4 * math.sin(math.tau * (ph - 0.1))))
    return {**BASE, "breath": 0.3 + 0.3 * s, "drop": 1.0 + 0.3 * late, "head_rot": 5.0 * look, "head_dx": 0.5 * look, "halberd": -82.0 + 1.5 * late,
            "armF": 24.0 + 2.0 * late, "glow": 1.0 if math.sin(math.tau * 2 * ph) > 0.7 else 0.8}


def march_pose(ph: float) -> Pose:
    c = math.cos(math.tau * ph)
    p: Pose = gait_legs(Gait(stride=0.86, give=1.05, lift=0.85, toe=0.85), ph)
    # A drilled march: upright, shield square to the front, the halberd carried like a standard.
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 3.0 + 1.0 * math.cos(2 * math.tau * (ph - 0.06)), "dy": 0.5 * (1 + math.cos(2 * math.tau * (ph - 0.1))), "hip_rot": -0.6 * c, "sh_rot": 0.5 * c,
              "armN": 18.0 + 3.0 * c, "halberd": -82.0 + 3.0 * math.cos(math.tau * (ph - 0.1)), "armF": 24.0 - 3.0 * c,
              "head_dy": 0.3 * math.cos(2 * math.tau * (ph - 0.2))})
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Chop: the halberd goes back over the shoulder, he holds, steps in and brings it down the full length of the shaft.
_HIT = dict(dx=5.0, drop=3.0, lean=18.0, armN=58.0, elbN=10.0, halberd=30.0, head_rot=8.0, armF=34.0, elbF=40.0, footN=(-9.5, 0.0, -20.0), footF=(4.0, 0.0, 0.0), glow=1.0)
ATTACK_KEYS = [
    (0.00, k(), "lin"),
    (0.22, k(dx=-1.5, drop=1.4, lean=-5.0, armN=140.0, elbN=30.0, halberd=-116.0, head_rot=-4.0, armF=30.0, elbF=50.0, footN=(-3.0, 0.0, 0.0), footF=(6.5, 0.0, 0.0), glow=1.0), "out"),
    (0.40, k(dx=-2.2, drop=1.6, lean=-8.0, armN=158.0, elbN=34.0, halberd=-130.0, head_rot=-6.0, armF=32.0, elbF=52.0, footN=(-2.3, 0.0, 0.0), footF=(7.2, 1.6, 8.0), glow=1.0), "io"),
    (0.46, k(dx=2.5, drop=2.0, lean=8.0, armN=112.0, elbN=14.0, halberd=-52.0, head_rot=4.0, armF=34.0, elbF=44.0, footN=(-7.0, 0.0, -10.0), footF=(6.5, 0.4, 0.0), glow=1.0, smear=1.0), "in"),
    (0.52, k(**{**_HIT, "halberd": 34.0}, smear=1.0, spark=0.02), "lin"),
    (0.68, k(**{**_HIT, "drop": 3.4, "lean": 20.0, "halberd": 35.0}, spark=0.98), "out"),
    (0.84, k(dx=2.5, drop=1.8, lean=8.0, armN=36.0, elbN=44.0, halberd=-40.0, head_rot=2.0, footN=(-7.0, 0.0, -8.0), footF=(4.5, 0.8, 4.0), spark=1.0), "io"),
    (1.00, k(spark=1.0), "io"),
]

# Hit: the shield comes up, the halberd is knocked back, and he squares up again. He gives little ground.
HURT_KEYS = stagger_keys(BASE, push=3.4, bend=10.0, buckle=2.2, whip=14.0, over={
    "impact": dict(armF=38.0, elbF=54.0, armN=12.0, elbN=64.0, halberd=-88.0, glow=1.0),
    "reel": dict(armF=8.0, elbF=34.0, armN=-4.0, elbN=60.0, halberd=-106.0, glow=0.3),
    "catch": dict(armF=30.0, elbF=48.0, armN=24.0, elbN=62.0, halberd=-76.0, glow=1.0),
})

# Death: the light goes out and the armour stops. The halberd topples behind it, it sinks to its knees with the
# shield standing on the ground beside it, and the empty helm rolls off its shoulders.
_KNEEL = dict(dx=-0.5, drop=8.4, lean=20.0, armN=8.0, elbN=8.0, armF=14.0, elbF=10.0, footN=(-7.0, 0.4, -90.0), footF=(-3.5, 0.4, -90.0),
              halberd=-180.0, halberd_free=1.0, halberd_at=(-10.0, 1.4), helm_free=1.0, glow=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-2.4, drop=1.4, lean=-10.0, head_rot=-16.0, armN=0.0, elbN=60.0, halberd=-100.0, armF=4.0, elbF=30.0, footN=(-2.1, 0.0, 0.0), footF=(7.4, 1.2, 8.0), glow=1.0), "out3"),
    (0.28, k(dx=-1.5, drop=1.0, lean=0.0, head_rot=14.0, armN=10.0, elbN=20.0, armF=18.0, elbF=20.0, halberd=-96.0, halberd_free=0.3, halberd_at=(-2.0, 24.0),
             footN=(-3.0, 0.0, 0.0), footF=(6.5, 0.0, 0.0), glow=0.3), "io"),
    (0.44, k(**{**_KNEEL, "drop": 7.6, "lean": 6.0, "halberd": -140.0, "halberd_at": (-7.0, 12.0), "helm_free": 0.0}, head_rot=30.0), "in"),
    (0.56, k(**{**_KNEEL, "drop": 8.2, "lean": 14.0, "halberd": -176.0, "halberd_at": (-10.0, 2.4), "helm_free": 0.5}, helm_at=(9.0, 14.0), head_rot=80.0), "io"),
    (0.66, k(**_KNEEL, helm_at=(12.0, 5.5), head_rot=150.0), "in"),
    (0.74, k(**_KNEEL, helm_at=(15.0, 8.5), head_rot=205.0), "out"),
    (0.84, k(**{**_KNEEL, "lean": 24.0, "drop": 8.6}, helm_at=(18.0, 5.5), head_rot=262.0), "in"),
    (1.00, k(**{**_KNEEL, "lean": 24.0, "drop": 8.6}, helm_at=(18.5, 5.5), head_rot=268.0), "out"),
]

STILL = lambda t: (-0.2 + 0.2 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [190] * 12, True, STILL),
    "run": Anim("run", march_pose, [i / 12 for i in range(12)], [84] * 12, True, lambda t: (-0.6, 0.0)),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.11, 0.22, 0.31, 0.40, 0.46, 0.52, 0.60, 0.68, 0.76, 0.84, 0.92, 1.0],
                   [90, 90, 110, 120, 170, 40, 50, 90, 130, 100, 100, 90, 110], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.19, 0.28, 0.36, 0.44, 0.50, 0.56, 0.61, 0.66, 0.70, 0.74, 0.79, 0.84, 1.0],
                  [50, 50, 90, 90, 140, 80, 110, 70, 70, 60, 70, 60, 70, 70, 120, 1200], False, STILL),
}
