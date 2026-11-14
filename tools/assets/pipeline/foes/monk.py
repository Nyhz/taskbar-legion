"""Fallen Monk — world 5, melee. A warrior monk the cold took and did not let go: frost-bitten grey skin, ice in his
beard and on his shaved head, one eye burning cold, the maroon robe and saffron sash of his order, prayer beads,
and a glaive taller than he is with a red tassel under the blade. He walks braced behind the glaive, spins it in
one hand like a wheel and brings it over in a long sweep. When he dies the frost finishes its work: he freezes
solid where he stands and shatters, and what is left is a heap of robe and the glaive lying across it.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, ik, keyed, lerp, loose, stagger_keys, swing_smear

FIGURE = ("Monk", "foe", "w05")

BUILD = Build(root_x=40, thigh=6.6, shin=6.4, foot=4.2, hip_dx=1.3, spine=9.6, sh_near=3.3, sh_far=2.8, upper=6.0, fore=5.8, neck=0.9, head_dx=0.7)

L = {
    "s": ("ink", 5), "t": ("ink", 6), "u": ("ink", 7), "k": ("ink", 1),
    "I": ("azure", 8), "i": ("azure", 6), "G": ("sea", 8),
    "q": ("crimson", 2), "r": ("crimson", 3), "p": ("crimson", 4), "P": ("crimson", 5),
    "h": ("brass", 4), "j": ("brass", 5), "J": ("brass", 6), "b": ("bone", 6),
}
#: The same sprites frozen solid.
ICE = {"q": ("azure", 4), "r": ("azure", 5), "p": ("azure", 6), "P": ("azure", 7), "h": ("azure", 6), "j": ("azure", 7), "J": ("azure", 8),
       "s": ("azure", 6), "t": ("azure", 7), "u": ("azure", 8), "b": ("azure", 8), "G": ("azure", 5)}

# Shaved head crusted with frost, a sunken socket with the cold light in it (G), icicles for a beard.
HEAD = [
    "..iIIi...",
    ".sIttIu..",
    ".sttttuu.",
    ".sttkGuu.",
    ".sstttuuu",
    "..sttkuu.",
    "..sIiIu..",
    "...I.i...",
    "...i.....",
]
# One bare frost-bitten shoulder, the robe wrapped across, the saffron sash, beads, a wide belt, the robe's skirt.
TORSO = [
    "..sttu...",
    ".qrrjJtu.",
    "qqrrpjJuu",
    "qqrrppjJ.",
    ".qrrppPj.",
    ".qrrbpbP.",
    ".hhjjJJh.",
    ".qrrppPP.",
    "qqrrppPPp",
    "qq.rr.pPp",
]
# What is left of him.
HEAP = [
    "......rrp......",
    ".....qrrpP.....",
    "....qrrbppP....",
    "..qqrrrppPj....",
    ".qqrrbrppPPjJ..",
    "qqrrrppbpPPPjJ.",
    "qqqrrrpppPPPPjj",
]

POLE_UP, POLE_DOWN = 16.0, 12.0
BLADE = ((4.0, 1.6), (8.0, 1.2), (10.8, -0.6))


def glaive_points(grip: Pt, angle: float) -> tuple[Pt, Pt, list[Pt]]:
    """Butt and head of the pole and the blade beyond it, belly forward (−90 = head straight up)."""
    a = math.radians(angle)
    d = (math.cos(a), math.sin(a))
    f = (-d[1], d[0])
    top = (grip[0] + d[0] * POLE_UP, grip[1] + d[1] * POLE_UP)
    butt = (grip[0] - d[0] * POLE_DOWN, grip[1] - d[1] * POLE_DOWN)
    blade = [top] + [(top[0] + d[0] * u + f[0] * v, top[1] + d[1] * u + f[1] * v) for u, v in BLADE]
    return butt, top, blade


def draw_glaive(cel: Cel, grip: Pt, angle: float) -> None:
    butt, top, blade = glaive_points(grip, angle)
    tmp = Cel(cel.w, cel.h, cel.top)
    tmp.limb(butt, top, 1.8, 1.8, "leather", (2, 3, 5))
    tmp.limb((top[0] - (blade[1][0] - top[0]) * 0.25, top[1] - (blade[1][1] - top[1]) * 0.25), top, 3.0, 3.0, "brass", (3, 5, 6))  # collar
    widths = (3.4, 3.6, 2.6, 0.8)
    for i in range(len(blade) - 1):
        tmp.limb(blade[i], blade[i + 1], widths[i], widths[i + 1], "ink", (5, 7, 9))
    for (x, y), t in tmp.px.items():
        if y < GROUND:
            cel.px[(x, y)] = t


class Monk(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        grip = loose(pose, "glaive", J["handN"], self.build.root_x)
        w = pose.get("two", 0.0) * (1.0 - pose.get("glaive_free", 0.0))
        if w > 0.01:
            a = math.radians(pose["glaive"])
            on = (grip[0] - math.cos(a) * 6.0, grip[1] - math.sin(a) * 6.0)
            hx, hy = J["handF"]
            J["elbowF"], J["handF"] = ik(J["shF"], (lerp(hx, on[0], w), lerp(hy, on[1], w)), self.build.upper, self.build.fore, +1)
        J["grip"] = grip
        J["gtop"] = glaive_points(grip, pose["glaive"])[1]
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def grounded(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        return {
            "sash": ChainSpec(Chain(4, 2.3, gravity=0.2, drag=0.15, damp=0.1), lambda J: (J["pelvis"][0] - 2.6, J["pelvis"][1] - 3.0), grounded, (-0.6, 0.8)),
            "tassel": ChainSpec(Chain(3, 1.8, gravity=0.2, drag=0.12, damp=0.08), lambda J: J["gtop"], grounded),
        }

    def draw(self, cel, J, pose, ropes, between) -> None:
        shatter = pose.get("shatter", 0.0)
        rx = self.build.root_x + pose.get("dx", 0.0)
        gone = pose.get("gone", 0.0) > 0.5
        frozen = pose.get("freeze", 0.0) > 0.5
        cloth = "azure" if frozen else "crimson"
        skin = "azure" if frozen else "ink"
        up = 2 if frozen else 0
        Lf = {**L, **(ICE if frozen else {})}
        if gone:
            cel.stamp(HEAP, L, rx - 7.0, GROUND - len(HEAP))
            for ox, oy in ((-11, 1), (-9, 2), (9, 1), (12, 2), (-4, 8), (3, 9)):  # lumps of the ice he was
                cel.put(rx + ox, GROUND - oy, ("azure", 8))
                cel.put(rx + ox + 1, GROUND - oy, ("azure", 6))
        else:
            lean = pose.get("lean", 0.0)
            sash = ropes["sash"]
            for i in range(len(sash) - 1):
                cel.limb(sash[i], sash[i + 1], 2.6, 2.0, "azure" if frozen else "brass", (5, 6, 7) if frozen else (3, 5, 6))
            self.arm(cel, J, "F", True, cloth, skin, up)
            self.leg(cel, J, "F", True, cloth, up)
            px, py = J["pelvis"]
            kx, ky = (J["kneeN"][0] + J["kneeF"][0]) / 2, (J["kneeN"][1] + J["kneeF"][1]) / 2
            cel.limb((px, py - 1.0), (px + (kx - px) * 0.9, py + (ky - py) * 0.9 + 1.0), 7.6, 7.0, cloth, (2 + up, 3 + up, 4 + up))  # the robe's skirt
            self.leg(cel, J, "N", False, cloth, up)
            cel.stamp_lean(TORSO, Lf, (px, py), 4, lean)
            hx, hy = J["head"]
            turn = pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0)
            cel.stamp_turn(HEAD, Lf, (hx, hy + 3), 4, turn)
        draw_glaive(cel, J["grip"], pose["glaive"])
        tassel = ropes["tassel"]
        for i in range(len(tassel) - 1):
            cel.limb(tassel[i], tassel[i + 1], 1.8, 1.2, "crimson", (3, 5, 6))
        if not gone:
            self.arm(cel, J, "N", False, cloth, skin, up)
        cel.outline()

        if pose.get("smear", 0.0) > 0.5 and len(between) > 2:
            before = set(cel.px)
            tips, hubs = [], []
            for Jb, pb in between:
                tips.append(glaive_points(Jb["grip"], pb["glaive"])[2][-1])
                hubs.append(Jb["grip"])
            swing_smear(cel, tips, hubs)
            for xy in set(cel.px) - before:
                if xy[1] >= GROUND:
                    del cel.px[xy]
        if not gone and not frozen and pose.get("glow", 1.0) > 0.5:
            hx, hy = J["head"]
            cel.soft(hx + 2.0, hy - 3.0, ("sea", 7))
        if 0.01 < shatter < 0.985:
            # He bursts: shards of ice and scraps of red fly out from where his chest was and rain down.
            ox, oy = rx + 1.0, GROUND - 18.0
            for i in range(22):
                ang = math.tau * (i * 0.618)
                dist = (0.3 + 0.7 * ((i * 7) % 10) / 10.0) * 22.0 * (0.25 + 0.75 * shatter)
                x, y = ox + math.cos(ang) * dist * 1.1, oy + math.sin(ang) * dist * 0.9 + 16.0 * shatter * shatter
                if y < GROUND - 1:
                    tone = ("light", 0) if i % 4 == 0 else ("azure", 8) if i % 4 == 1 else ("azure", 6) if i % 4 == 2 else ("crimson", 5)
                    cel.soft(x, y, tone)
                    if shatter < 0.55:
                        cel.soft(x + 1, y, tone)
                        cel.soft(x, y + 1, ("azure", 5))

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool, cloth: str, up: int) -> None:
        hip, knee, ankle, toe = J["hip" + s], J["knee" + s], J["ankle" + s], J["toe" + s]
        cel.limb(hip, knee, 4.4, 3.8, cloth, (2 + up, 3 + up, 4 + up), far=far)
        # Leg wraps and a felt boot.
        cel.limb(knee, ankle, 3.2, 2.8, "azure" if up else "leather", (5, 6, 7) if up else (2, 4, 5), far=far)
        cel.limb(ankle, toe, 3.2, 2.2, "azure" if up else "leather", (4, 5, 6) if up else (1, 2, 4), far=far)

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool, cloth: str, skin: str, up: int) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        # The far arm is in the robe's sleeve, the near one is bare to the shoulder.
        if s == "F":
            cel.limb(sh, el, 3.8, 3.4, cloth, (2 + up, 3 + up, 5 + up), far=far)
        else:
            cel.limb(sh, el, 3.2, 2.8, skin, (5, 6, 7) if not up else (6, 7, 8), far=far)
        cel.limb(el, hd, 2.8, 2.4, skin, (5, 6, 7) if not up else (6, 7, 8), far=far)
        mid = ((el[0] + hd[0]) / 2, (el[1] + hd[1]) / 2)
        cel.put(mid[0], mid[1], ("azure", 8) if up else ("bone", 6))  # a loop of beads at the wrist
        cel.put(hd[0], hd[1], (skin, 5 if far else 7))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=1.2, lean=4.0, footN=(-4.5, 0.0, 0.0), footF=(4.5, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=30.0, elbN=58.0, armF=30.0, elbF=50.0, glaive=-72.0, two=1.0, head_dx=0.0, head_dy=0.0, head_rot=0.0, breath=0.0,
                  smear=0.0, glow=1.0, freeze=0.0, gone=0.0, shatter=0.0, glaive_free=0.0, glaive_at=(0.0, 0.0))


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.18))
    # He stands braced behind the glaive and breathes slowly; the light in his eye comes and goes.
    return {**BASE, "breath": 0.5 + 0.5 * s, "lean": 4.0 + 1.2 * s, "drop": 1.2 + 0.4 * late, "glaive": -72.0 + 2.5 * late, "head_rot": 4.0 * late,
            "elbN": 58.0 + 3.0 * s, "glow": 1.0 if math.sin(math.tau * 2 * ph) > -0.6 else 0.0}


def walk_pose(ph: float) -> Pose:
    c, s2 = math.cos(math.tau * ph), math.cos(2 * math.tau * (ph - 0.1))
    p: Pose = gait_legs(Gait(stride=0.9, give=1.15, lift=0.8, toe=0.8), ph)
    # A soldier's advance: low, the glaive levelled ahead and steady while the body works under it.
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 9.0 + 1.5 * s2, "dy": 0.8 + 0.4 * s2, "hip_rot": -0.7 * c, "sh_rot": 0.6 * c, "armN": 34.0 + 3.0 * c, "elbN": 52.0,
              "glaive": -40.0 + 3.0 * math.cos(math.tau * (ph - 0.12)), "head_dy": 0.4 * math.cos(2 * math.tau * (ph - 0.2))})
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Wheel and sweep: he lets go with one hand and spins the glaive a full turn like a wheel, catches it cocked behind
# his shoulder, and brings it over and down in a long sweep. Angles keep growing so every turn goes the same way.
ATTACK_KEYS = [
    (0.00, k(), "lin"),
    (0.12, k(dx=-1.0, drop=1.8, lean=-2.0, armN=44.0, elbN=40.0, glaive=-112.0, two=0.0, armF=-20.0, elbF=40.0, footN=(-3.5, 0.0, 0.0), footF=(5.5, 0.0, 0.0)), "out"),
    (0.32, k(dx=-1.4, drop=2.0, lean=-4.0, armN=50.0, elbN=34.0, glaive=-472.0, two=0.0, armF=-34.0, elbF=44.0, footN=(-3.1, 0.0, 0.0), footF=(5.9, 0.0, 0.0), smear=1.0), "lin"),
    (0.44, k(dx=-2.4, drop=2.4, lean=-9.0, armN=142.0, elbN=36.0, glaive=-512.0, head_rot=-8.0, footN=(-2.1, 0.0, 0.0), footF=(6.9, 1.6, 10.0)), "out"),
    (0.50, k(dx=2.5, drop=2.0, lean=10.0, armN=112.0, elbN=14.0, glaive=-422.0, head_rot=6.0, footN=(-7.0, 0.0, -12.0), footF=(7.0, 0.4, 0.0), smear=1.0), "in"),
    (0.55, k(dx=5.0, drop=3.0, lean=22.0, armN=58.0, elbN=10.0, glaive=-322.0, head_rot=14.0, footN=(-9.5, 0.0, -24.0), footF=(5.0, 0.0, 0.0), smear=1.0), "lin"),
    (0.68, k(dx=5.4, drop=3.4, lean=25.0, armN=52.0, elbN=10.0, glaive=-316.0, head_rot=16.0, footN=(-9.9, 0.0, -26.0), footF=(4.6, 0.0, 0.0)), "out"),
    (0.86, k(dx=2.5, drop=2.0, lean=12.0, armN=40.0, elbN=40.0, glaive=-380.0, head_rot=6.0, footN=(-7.0, 0.0, -8.0), footF=(4.5, 0.8, 4.0)), "io"),
    (1.00, k(glaive=-432.0), "io"),
]

# Hit: he is driven back off the glaive's line; the pole swings up and he hauls it down again.
HURT_KEYS = stagger_keys(BASE, push=4.2, bend=13.0, buckle=2.4, whip=22.0, over={
    "impact": dict(armN=24.0, elbN=60.0, glaive=-80.0, glow=1.0),
    "reel": dict(armN=6.0, elbN=70.0, glaive=-104.0, glow=0.0),
    "catch": dict(armN=38.0, elbN=52.0, glaive=-58.0, glow=1.0),
})

# Death: the frost finishes its work. He stiffens, the glaive slips from his hands, he freezes solid — and bursts.
_RIGID = dict(dx=-1.5, drop=0.8, lean=-5.0, head_rot=-12.0, armN=-20.0, elbN=40.0, armF=40.0, elbF=30.0, two=0.0, footN=(-3.0, 0.0, 0.0), footF=(6.0, 0.0, 0.0))
_LAIN = dict(glaive_free=1.0, glaive_at=(9.0, 1.6), glaive=1.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-2.4, drop=1.6, lean=-10.0, head_rot=-20.0, head_dx=-1.0, armN=10.0, elbN=60.0, glaive=-90.0, footN=(-2.1, 0.0, 0.0), footF=(6.9, 1.4, 8.0)), "out3"),
    (0.26, k(**_RIGID, glaive=-84.0, glaive_free=0.3, glaive_at=(8.0, 20.0), glow=0.0), "io"),
    (0.38, k(**_RIGID, freeze=1.0, glaive=-60.0, glaive_free=1.0, glaive_at=(9.0, 15.0), glow=0.0), "lin"),
    (0.52, k(**_RIGID, freeze=1.0, glaive=-12.0, glaive_free=1.0, glaive_at=(6.0, 7.0), glow=0.0), "in"),
    (0.56, k(**_RIGID, **_LAIN, freeze=1.0, gone=1.0, shatter=0.02, glow=0.0), "lin"),
    (0.62, k(**{**_RIGID, **_LAIN, "glaive": -3.0, "glaive_at": (9.0, 3.4)}, freeze=1.0, gone=1.0, shatter=0.25, glow=0.0), "out"),
    (0.70, k(**_RIGID, **_LAIN, freeze=1.0, gone=1.0, shatter=0.5, glow=0.0), "in"),
    (0.86, k(**_RIGID, **_LAIN, freeze=1.0, gone=1.0, shatter=0.98, glow=0.0), "lin"),
    (1.00, k(**_RIGID, **_LAIN, freeze=1.0, gone=1.0, shatter=1.0, glow=0.0), "lin"),
]

STILL = lambda t: (-0.2 + 0.2 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [180] * 12, True, STILL),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [75] * 12, True, lambda t: (-0.7, 0.0)),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.12, 0.17, 0.22, 0.27, 0.32, 0.38, 0.44, 0.50, 0.55, 0.61, 0.68, 0.77, 0.86, 0.93, 1.0],
                   [80, 70, 45, 45, 45, 45, 90, 150, 40, 50, 80, 130, 100, 90, 80, 100], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.18, 0.26, 0.32, 0.38, 0.45, 0.52, 0.56, 0.62, 0.70, 0.78, 0.86, 1.0],
                  [50, 50, 80, 90, 110, 100, 140, 120, 160, 50, 70, 80, 90, 110, 1200], False, STILL),
}
