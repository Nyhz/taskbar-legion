"""Harvest King — world 1, stage boss. A scarecrow half again as tall as a man: a carved pumpkin burning from the
inside under a crooked crown, a wicker ribcage with a fire in it, straw arms ending in twig claws, wooden stakes
for shins, a ragged royal cape and a scythe taller than the heroes. He walks slowly and hits once, with both
hands, from over his head: the blade buries itself in the ground and the earth splits. When the fire goes out he
drops to his knees, the head falls off and rolls away, the crown after it.

His frame is larger than the common one (128 wide, 26 extra rows above). Drawn facing right; the game mirrors
enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, ik, keyed, lerp, loose, stagger_keys, swing_smear

BUILD = Build(root_x=52, thigh=9.5, shin=9.5, foot=5.5, hip_dx=2.0, spine=15.0, sh_near=6.4, sh_far=5.4, upper=9.5, fore=9.0, neck=1.5, head_dx=1.0,
              heel=2.2, toe=1.5, min_pelvis=7.0)

L = {
    "a": ("crimson", 2), "b": ("crimson", 3), "c": ("crimson", 4), "d": ("crimson", 5), "e": ("crimson", 6),
    "s": ("moss", 3), "t": ("moss", 5),
    "k": ("ink", 1), "l": ("ink", 2), "m": ("ink", 3), "n": ("ink", 4),
    "h": ("brass", 3), "i": ("brass", 4), "j": ("brass", 5), "J": ("brass", 6),
    "B": ("leather", 4), "R": ("crimson", 5),
}

# Carved pumpkin, turned three-quarters: slanted eyes (the far one smaller) and a saw-toothed grin. G, W and E are
# the fire showing through; their tones follow the pose's `fire`.
HEAD = [
    ".......st......",
    "....abccsddd...",
    "..abbccdddddee.",
    ".abbccddddddeee",
    ".abbcGGdddddGee",
    "aabbcGWGGddGWGe",
    "aabbccdGGddGGde",
    "aabbccddddddeee",
    "aabbGdGdGdGdGee",
    ".abbGGWGWGWGGe.",
    ".aabbGdGdGdGee.",
    "..aabbccddde...",
    "....abbccd.....",
]
CROWN = [
    "i...j...J",
    "hi.ijj.jJ",
    "hiiRjjRjJ",
    "hhiijjjJJ",
]
# Straw collar, robe, the wicker ribcage with the fire behind it, a rope belt, a ragged hem.
TORSO = [
    "....hijjih.....",
    "..hhiijjJiihh..",
    ".kkllmmmmnnnnn.",
    "kkkllmmmmnnnnnn",
    "kkllmmBBBBBBBnn",
    "kkllmmBEBGBEBnn",
    "kkllmmBGBWBGBnn",
    "kkllmmBEBGBEBnn",
    ".kllmmBBBBBBBn.",
    ".kkllmmmmnnnnn.",
    "..kllmmmmnnnn..",
    "..hhiijjjjiih..",
    ".kkllmmmmnnnnn.",
    "kkkllmmmmnnnnnn",
    "kkkllmmmmnnnnnn",
    "kk.kllmm.nnnn.n",
    "k..k.l.m...n..n",
]

SNATH_UP, SNATH_DOWN = 24.0, 15.0
BLADE = ((6.0, 1.5), (12.0, 0.5), (17.0, -3.5), (20.5, -9.0))


def flame(fire: float) -> dict[str, tuple[str, int]]:
    """Tones of the fire inside him, from white-hot to dead."""
    if fire >= 0.95:
        return {"G": ("brass", 6), "W": ("light", 0), "E": ("crimson", 5)}
    if fire >= 0.6:
        return {"G": ("brass", 5), "W": ("brass", 7), "E": ("crimson", 5)}
    if fire >= 0.3:
        return {"G": ("brass", 4), "W": ("brass", 5), "E": ("crimson", 4)}
    if fire >= 0.12:
        return {"G": ("crimson", 4), "W": ("crimson", 5), "E": ("crimson", 3)}
    return {"G": ("crimson", 0), "W": ("crimson", 0), "E": ("ink", 1)}


def scythe_points(grip: Pt, angle: float) -> tuple[Pt, Pt, list[Pt]]:
    """Foot and head of the snath, and the blade curving forward from the head (−90 = head straight up)."""
    a = math.radians(angle)
    d = (math.cos(a), math.sin(a))
    f = (-d[1], d[0])
    top = (grip[0] + d[0] * SNATH_UP, grip[1] + d[1] * SNATH_UP)
    foot = (grip[0] - d[0] * SNATH_DOWN, grip[1] - d[1] * SNATH_DOWN)
    blade = [top] + [(top[0] + f[0] * u + d[0] * v, top[1] + f[1] * u + d[1] * v) for u, v in BLADE]
    return foot, top, blade


def draw_scythe(cel: Cel, grip: Pt, angle: float) -> None:
    """Drawn on its own cel so whatever goes below the ground line (the blade buried by the slam) is cut off."""
    foot, top, blade = scythe_points(grip, angle)
    tmp = Cel(cel.w, cel.h, cel.top)
    tmp.limb(foot, top, 2.4, 2.2, "leather", (2, 3, 5))
    back = (top[0] - (blade[1][0] - top[0]) * 0.35, top[1] - (blade[1][1] - top[1]) * 0.35)
    tmp.limb(back, top, 2.6, 3.4, "ink", (3, 5, 7))  # the heel of the blade behind the snath
    widths = (4.6, 4.0, 3.0, 2.0, 1.0)
    for i in range(len(blade) - 1):
        tmp.limb(blade[i], blade[i + 1], widths[i], widths[i + 1], "ink", (4, 7, 9))
    for (x, y), t in tmp.px.items():
        if y < GROUND:
            cel.px[(x, y)] = t


class HarvestKing(Character):
    build = BUILD
    W = 128
    TOP = 26

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        grip = loose(pose, "scythe", J["handN"], self.build.root_x)
        # Second hand on the snath, `hold` px along it from the first (negative = nearer the foot).
        w = pose.get("two", 0.0) * (1.0 - pose.get("scythe_free", 0.0))
        if w > 0.01:
            a = math.radians(pose["scythe"])
            h = pose.get("hold", -7.0)
            on = (grip[0] + math.cos(a) * h, grip[1] + math.sin(a) * h)
            hx, hy = J["handF"]
            J["elbowF"], J["handF"] = ik(J["shF"], (lerp(hx, on[0], w), lerp(hy, on[1], w)), self.build.upper, self.build.fore, +1)
        J["grip"] = grip
        # The head is a loose prop: on the neck until it falls off.
        turn = pose.get("head_rot", 0.0)
        lean = pose.get("lean", 0.0)
        free = pose.get("head_free", 0.0)
        if abs(lean) > 24.0:
            turn += lean * (1.0 - free)
        a = math.radians(turn)
        nx, ny = J["head"]
        J["skull"] = loose(pose, "head", (nx + 6.5 * math.sin(a), ny + 2.0 - 6.5 * math.cos(a)), self.build.root_x)
        J["turn"] = (turn, 0.0)
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def behind(pts: list[Pt], J: dict[str, Pt]) -> None:
            lying = abs(J["lean"][0]) > 40.0
            cx, cy = J["chest"]
            px, py = J["pelvis"]
            for i in range(1, len(pts)):
                x, y = pts[i]
                if lying:
                    pts[i] = (x, min(y, GROUND - 1.5))
                    continue
                t = max(0.0, min(1.0, (y - cy) / max(1.0, py - cy)))
                pts[i] = (min(x, cx - 5.0 + (px - 4.5 - (cx - 5.0)) * t), min(y, GROUND - 2.0))

        return {"cape": ChainSpec(Chain(8, 3.0, gravity=0.24, drag=0.16, damp=0.1), lambda J: (J["shN"][0] + 0.5, J["shN"][1] + 1.0), behind)}

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        hip, knee, ankle, toe = J["hip" + s], J["knee" + s], J["ankle" + s], J["toe" + s]
        cel.limb(hip, knee, 6.4, 5.0, "ink", (1, 2, 3), far=far)
        # Below the robe: a wooden stake and a foot of bound straw.
        cel.limb(knee, ankle, 3.4, 2.8, "leather", (2, 3, 5), far=far)
        cel.limb(ankle, toe, 3.6, 2.4, "brass", (2, 3, 5), far=far)
        for k_ in (-0.8, 0.0, 0.8):
            cel.line(ankle, (toe[0] + 0.6 + k_, toe[1] + 1.2 + abs(k_) * 0.3), ("brass", 3 if far else 4))

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 5.4, 4.4, "ink", (1, 2, 4), far=far)
        cel.limb(el, hd, 3.8, 3.0, "brass", (2, 3, 5), far=far)
        dx, dy = hd[0] - el[0], hd[1] - el[1]
        d = math.hypot(dx, dy) or 1.0
        ux, uy = dx / d, dy / d
        # Twig claws.
        for k_ in (-0.9, 0.0, 0.9):
            cel.line(hd, (hd[0] + ux * 3.6 - uy * k_ * 2.4, hd[1] + uy * 3.6 + ux * k_ * 2.4), ("leather", 4 if far else 6))

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        fire = pose.get("fire", 1.0)
        Lf = {**L, **flame(fire)}
        # Royal cape, in rags.
        c = ropes["cape"]
        widths = [4.0, 7.0, 9.0, 10.5, 11.0, 11.0, 10.0, 8.0]
        for i in range(len(c) - 1):
            cel.limb(c[i], c[i + 1], widths[i], widths[i + 1], "crimson", (1, 2, 3))
        a_, b_ = c[-2], c[-1]
        for side in (-3.0, 0.0, 3.0):
            cel.limb((b_[0] + side, b_[1] - 1.0), (b_[0] + side * 1.3 + (b_[0] - a_[0]) * 0.5, b_[1] + 3.2 + abs(side) * 0.3), 3.0, 1.0, "crimson", (1, 2, 3))
        self.arm(cel, J, "F", far=True)
        self.leg(cel, J, "F", far=True)
        # The robe's skirt between the legs.
        px, py = J["pelvis"]
        kx, ky = (J["kneeN"][0] + J["kneeF"][0]) / 2, (J["kneeN"][1] + J["kneeF"][1]) / 2
        cel.limb((px, py - 1.0), (px + (kx - px) * 0.8, py + (ky - py) * 0.8), 9.0, 7.0, "ink", (1, 2, 3))
        self.leg(cel, J, "N", far=False)
        cel.stamp_lean(TORSO, Lf, (px, py), 7, lean)
        # Neck: straw, which is all that is left when the head goes.
        nx, ny = J["head"]
        la = math.radians(lean)
        for k_ in (-1.6, 0.0, 1.6):
            cel.line((nx + k_, ny + 1.0), (nx + k_ * 1.4 + math.sin(la) * 2.6, ny - math.cos(la) * 2.6 + 1.0), ("brass", 4))
        turn = J["turn"][0]
        sx, sy = J["skull"]
        cel.stamp_pivot(HEAD, Lf, (sx, sy), 7.5, 6.5, turn)
        a = math.radians(turn)
        on = (sx + 0.5 * math.cos(a) + 7.0 * math.sin(a), sy + 0.5 * math.sin(a) - 7.0 * math.cos(a))
        crown = loose(pose, "hat", on, self.build.root_x)
        cel.stamp_turn(CROWN, L, (crown[0], crown[1] + 1.0), 4, lerp(turn + pose.get("crown_tilt", 0.0), pose.get("hat_rot", 0.0), pose.get("hat_free", 0.0)))
        draw_scythe(cel, J["grip"], pose["scythe"])
        self.arm(cel, J, "N", far=False)
        # Straw bursting out at the shoulders.
        for (qx, qy), sgn in ((J["shN"], -1.0), (J["shF"], 1.0)):
            for ox, oy in ((0.4, -3.6), (2.2, -2.6), (3.6, -0.8)):
                tx, ty = sgn * ox, oy
                cel.line((qx, qy - 1.0), (qx + tx * math.cos(la) - ty * math.sin(la), qy - 1.0 + tx * math.sin(la) + ty * math.cos(la)), ("brass", 5 if sgn < 0 else 3))
        cel.outline()

        _, _, blade = scythe_points(J["grip"], pose["scythe"])
        if pose.get("smear", 0.0) > 0.5 and len(between) > 2:
            before = set(cel.px)
            tips, hubs = [], []
            for Jb, pb in between:
                _, _, bl = scythe_points(Jb["grip"], pb["scythe"])
                tips.append(bl[-1])
                hubs.append(Jb["grip"])
            swing_smear(cel, tips, hubs)
            for xy in set(cel.px) - before:
                if xy[1] >= GROUND:
                    del cel.px[xy]
        shock = pose.get("shock", 0.0)
        if 0.01 < shock < 0.985:
            self.shock(cel, min(blade[-1][0], cel.w - 22.0), shock)
        if fire >= 0.3 and pose.get("head_free", 0.0) < 0.3:
            self.embers(cel, (sx, sy - 9.0), pose.get("embers", 0.0), fire)

    @staticmethod
    def shock(cel: Cel, ix: float, u: float) -> None:
        """The ground splitting where the blade went in: a glowing fissure, clods thrown up, dust."""
        reach = 5.0 + 15.0 * u
        hot = ("light", 0) if u < 0.3 else ("brass", 6) if u < 0.6 else ("crimson", 5)
        for i in range(int(reach)):
            for sgn in (-1, 1):
                x = ix + sgn * i
                cel.soft(x, GROUND - 1 + (1 if (i * 7 + (sgn > 0)) % 3 == 0 else 0), hot)
                if i % 2 == 0 and u < 0.6:
                    cel.soft(x, GROUND - 2 - (i % 3 == 0), ("brass", 6))
        if u < 0.3:
            cel.star(ix, GROUND - 4, 4)
        for i in range(9):
            ang = math.radians(-164 + i * 18.5)
            dist = 4.0 + (11.0 + (i * 5 % 4) * 2.0) * u
            x = ix + math.cos(ang) * dist * 1.25
            y = GROUND - 2 + math.sin(ang) * dist + 9.0 * u * u
            if y < GROUND - 1:
                tone = ("leather", 5) if i % 3 else ("bone", 5)
                cel.soft(x, y, tone)
                if u < 0.7:
                    cel.soft(x + 1, y, tone)
                    cel.soft(x, y + 1, ("leather", 3))
        for i in range(int(reach * 0.8)):
            if (i * 3) % 4 < 2:
                for sgn in (-1, 1):
                    cel.soft(ix + sgn * (reach * 0.5 + i), GROUND - 2 - 3.0 * u * ((i % 3) / 2.0), ("bone", 5 if u < 0.6 else 3))

    @staticmethod
    def embers(cel: Cel, at: Pt, ph: float, fire: float) -> None:
        for i in range(4):
            u = (ph + i / 4) % 1.0
            x = at[0] + (i * 3.7 % 5.0 - 2.0) + 1.8 * math.sin(math.tau * (u + i * 0.3))
            y = at[1] - 11.0 * u
            cel.soft(x, y, ("brass", 6) if u < 0.4 and fire >= 0.6 else ("crimson", 6) if u < 0.75 else ("crimson", 4))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=2.0, lean=6.0, footN=(-6.0, 0.0, 0.0), footF=(6.0, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=24.0, elbN=58.0, armF=-6.0, elbF=14.0, scythe=-84.0, two=0.0, hold=-7.0, head_dx=0.0, head_dy=0.0, head_rot=5.0, crown_tilt=-8.0,
                  breath=0.0, fire=0.8, embers=0.0, shock=0.0, smear=0.0, head_free=0.0, head_at=(0.0, 0.0), hat_free=0.0, hat_at=(0.0, 0.0), hat_rot=0.0,
                  scythe_free=0.0, scythe_at=(0.0, 0.0))


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.18))
    later = math.sin(math.tau * (ph - 0.3))
    # The fire gutters: mostly steady, now and then white.
    flick = 1.0 if math.sin(math.tau * 3 * ph) > 0.55 else 0.8
    return {**BASE, "breath": 0.5 + 0.5 * s, "lean": 6.0 + 1.4 * s, "drop": 2.0 + 0.4 * late, "head_rot": 5.0 + 5.0 * late, "crown_tilt": -8.0 + 3.0 * later,
            "scythe": -84.0 + 2.0 * late, "armF": -6.0 + 6.0 * later, "elbF": 14.0 + 7.0 * late, "embers": ph, "fire": flick}


def walk_pose(ph: float) -> Pose:
    c = math.cos(math.tau * ph)
    p: Pose = gait_legs(Gait(stride=0.72, give=1.2, lift=0.62, toe=0.6), ph)
    rot = 5.0 + 5.0 * math.cos(math.tau * (ph - 0.15))
    # Slow and heavy: he sinks onto every step.
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 9.0 + 2.0 * math.cos(2 * math.tau * (ph - 0.06)), "dy": 0.9 * (1 + math.cos(2 * math.tau * (ph - 0.1))), "hip_rot": -0.8 * c, "sh_rot": 0.8 * c,
              "armN": 24.0 + 4.0 * c, "armF": -6.0 + 16.0 * math.cos(math.tau * (ph - 0.2)), "elbF": 16.0 + 8.0 * math.cos(math.tau * (ph - 0.32)),
              "scythe": -84.0 + 4.0 * math.cos(math.tau * (ph - 0.12)), "head_dy": 0.5 * math.cos(2 * math.tau * (ph - 0.2)), "head_rot": rot,
              "crown_tilt": -8.0 + 4.0 * math.cos(2 * math.tau * (ph - 0.3)), "embers": 2 * ph, "fire": 0.8})
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Slam: both hands haul the scythe up over his head, he hangs there a moment, then the whole body comes down
# with it. Feet are given so they stay planted while the body shifts (x is measured from the shifted root).
_HIT = dict(two=1.0, hold=7.0, dx=5.0, drop=5.5, lean=26.0, armN=62.0, elbN=10.0, scythe=24.0, head_rot=14.0, footN=(-11.0, 0.0, -24.0), footF=(7.0, 0.0, 0.0), fire=1.0)
SLAM_KEYS = [
    (0.00, k(), "lin"),
    (0.20, k(two=1.0, dx=-1.5, drop=2.6, lean=-2.0, armN=120.0, elbN=30.0, scythe=-100.0, head_rot=-4.0, footN=(-4.5, 0.0, 0.0), footF=(7.5, 0.6, 4.0), fire=1.0), "out"),
    (0.38, k(two=1.0, dx=-3.0, drop=3.2, lean=-10.0, armN=168.0, elbN=38.0, scythe=-128.0, head_rot=-12.0, footN=(-3.0, 0.0, 0.0), footF=(9.0, 2.5, 10.0), fire=1.0), "out"),
    (0.44, k(two=1.0, dx=-3.4, drop=3.0, lean=-12.0, armN=172.0, elbN=40.0, scythe=-133.0, head_rot=-14.0, footN=(-2.6, 0.0, 0.0), footF=(9.4, 3.0, 12.0), fire=1.0), "io"),
    (0.50, k(two=1.0, hold=0.0, dx=2.5, drop=3.0, lean=10.0, armN=122.0, elbN=14.0, scythe=-56.0, head_rot=6.0, footN=(-8.5, 0.0, -10.0), footF=(9.5, 0.4, 0.0), fire=1.0, smear=1.0), "in"),
    (0.55, k(**_HIT, smear=1.0, shock=0.02), "lin"),
    (0.70, k(**{**_HIT, "drop": 6.4, "lean": 29.0, "scythe": 26.0}, shock=0.98), "out"),
    (0.86, k(two=1.0, hold=4.0, dx=2.5, drop=3.6, lean=14.0, armN=40.0, elbN=40.0, scythe=-40.0, head_rot=8.0, footN=(-8.5, 0.0, -8.0), footF=(6.5, 0.8, 4.0), shock=1.0), "io"),
    (1.00, k(shock=1.0), "io"),
]

# Hit: he barely gives ground, but the fire inside gutters and flares, the crown slips and the free arm is thrown.
HURT_KEYS = stagger_keys(BASE, push=3.6, bend=9.0, buckle=3.0, whip=16.0, over={
    "impact": dict(armF=20.0, elbF=24.0, armN=18.0, elbN=54.0, scythe=-90.0, crown_tilt=-14.0, fire=1.0, embers=0.2),
    "reel": dict(armF=-48.0, elbF=36.0, armN=2.0, elbN=50.0, scythe=-104.0, crown_tilt=-28.0, fire=0.35, embers=0.5),
    "catch": dict(armF=18.0, elbF=22.0, armN=24.0, elbN=56.0, scythe=-78.0, crown_tilt=4.0, fire=1.0, embers=0.9),
})

# Death: the fire flares and goes out. He drops the scythe, sinks to his knees and stays there, bowed, a husk;
# the head falls off and rolls away, the crown after it.
_KNEES = dict(footN=(-10.5, 0.6, -100.0), footF=(-7.5, 0.6, -100.0))
_HUSK = dict(dx=1.5, drop=14.2, lean=56.0, armN=10.0, elbN=10.0, armF=20.0, elbF=5.0, **_KNEES, scythe_free=1.0, scythe_at=(-16.0, 1.4), scythe=-180.0,
             head_free=1.0, hat_free=1.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.08, k(dx=-3.0, drop=2.4, lean=-12.0, head_rot=-20.0, head_dx=-1.5, armN=0.0, elbN=40.0, scythe=-100.0, armF=-40.0, elbF=30.0, footN=(-3.0, 0.0, 0.0), footF=(8.5, 1.5, 8.0),
             hat_free=0.3, hat_at=(-2.0, 58.0), hat_rot=-30.0, fire=1.0), "out3"),
    (0.22, k(dx=-1.0, drop=4.0, lean=10.0, head_rot=14.0, armN=30.0, elbN=20.0, armF=20.0, elbF=20.0, scythe=-110.0, scythe_free=0.5, scythe_at=(-4.0, 30.0),
             footN=(-5.0, 0.0, 0.0), footF=(7.0, 0.0, 0.0), hat_free=1.0, hat_at=(8.0, 60.0), hat_rot=40.0, fire=0.7), "io"),
    (0.38, k(dx=1.0, drop=11.0, lean=16.0, head_rot=30.0, armN=24.0, elbN=14.0, armF=30.0, elbF=10.0, scythe=-150.0, scythe_free=1.0, scythe_at=(-12.0, 14.0),
             footN=(-9.5, 0.6, -90.0), footF=(-6.0, 0.6, -90.0), hat_free=1.0, hat_at=(22.0, 42.0), hat_rot=130.0, fire=0.45), "in"),
    (0.50, k(dx=1.5, drop=13.0, lean=34.0, head_rot=80.0, armN=40.0, elbN=8.0, armF=50.0, elbF=8.0, scythe=-172.0, scythe_free=1.0, scythe_at=(-16.0, 4.0), **_KNEES,
             head_free=0.6, head_at=(17.0, 24.0), hat_free=1.0, hat_at=(31.0, 18.0), hat_rot=210.0, fire=0.3), "io"),
    (0.60, k(**{**_HUSK, "lean": 46.0, "armN": 30.0, "armF": 40.0}, head_at=(22.0, 6.5), head_rot=170.0, hat_at=(37.0, 2.0), hat_rot=300.0, fire=0.2), "in"),
    (0.68, k(**{**_HUSK, "lean": 52.0}, head_at=(26.0, 10.5), head_rot=260.0, hat_at=(40.0, 6.0), hat_rot=340.0, fire=0.15), "out"),
    (0.78, k(**_HUSK, head_at=(29.5, 6.5), head_rot=345.0, hat_at=(42.0, 2.0), hat_rot=364.0, fire=0.1), "in"),
    (0.88, k(**_HUSK, head_at=(31.0, 6.5), head_rot=372.0, hat_at=(42.5, 2.0), hat_rot=368.0, fire=0.05), "out"),
    (1.00, k(**_HUSK, head_at=(31.0, 6.5), head_rot=372.0, hat_at=(42.5, 2.0), hat_rot=368.0, fire=0.0), "lin"),
]

STILL = lambda t: (-0.2 + 0.2 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [200] * 12, True, STILL),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [115] * 12, True, lambda t: (-0.5, 0.0)),
    "attack": Anim("attack", keyed(SLAM_KEYS), [0.0, 0.10, 0.20, 0.29, 0.38, 0.44, 0.50, 0.55, 0.60, 0.65, 0.70, 0.78, 0.86, 0.93, 1.0],
                   [90, 90, 100, 110, 150, 130, 40, 50, 70, 80, 120, 110, 100, 90, 110], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.04, 0.08, 0.15, 0.22, 0.30, 0.38, 0.44, 0.50, 0.55, 0.60, 0.64, 0.68, 0.73, 0.78, 0.88, 1.0],
                  [60, 50, 90, 80, 90, 80, 90, 70, 70, 60, 70, 60, 70, 70, 90, 160, 1400], False, STILL),
}
