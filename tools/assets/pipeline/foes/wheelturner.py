"""Wheel-Turner — world 5, support. An old pilgrim of the high passes whom the cold kept: squat under a quilted coat
with a fur collar and hem, a fur hat with its flaps down, ice in his beard, one eye burning cold. He carries a
prayer wheel as tall as a doorway — a pole with a brass drum on top, banded in red, that he keeps turning with both
hands: its weight flies round on a chain, two red ribbons trail from under it and motes of gold climb out of it.
While the wheel turns, the others fight for him; that turning is all he does. He shuffles after his pack with the
pole upright, and when pressed he tips the wheel at the enemy and shakes a spark out of it. When he dies the pole
slips from his mittens: the wheel hits the stones, stops and goes dark, and he sits down in his coat and stays.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, ik, keyed, lerp, loose, stagger_keys

FIGURE = ("WheelTurner", "foe", "w05")

BUILD = Build(root_x=40, thigh=5.6, shin=5.4, foot=3.8, hip_dx=1.5, spine=9.0, sh_near=3.6, sh_far=3.0, upper=5.4, fore=5.0, neck=0.6, head_dx=0.9, min_pelvis=3.8)

L = {
    # quilted coat
    "a": ("leather", 1), "c": ("leather", 2), "d": ("leather", 4), "e": ("leather", 5),
    # fur
    "f": ("bone", 3), "F": ("bone", 5), "g": ("bone", 6), "W": ("bone", 7),
    # frost-bitten skin, the eye, ice
    "s": ("ink", 5), "t": ("ink", 6), "u": ("ink", 7), "k": ("ink", 1), "E": ("sea", 8), "I": ("azure", 8), "i": ("azure", 6),
    # the sash
    "r": ("crimson", 3), "R": ("crimson", 4),
    # gold: the same as the wheel
    "o": ("brass", 5), "O": ("brass", 7),
}

# A fur hat with the flaps down, a hooked nose, one cold eye, a beard stiff with ice.
HEAD = [
    "...FggW...",
    "..FggWWWg.",
    ".fFggWWWg.",
    "fFFrROoRg.",
    "fFgstttu..",
    "fFgskkEuu.",
    "fFgsttuuuu",
    ".fFsIiIu..",
    "..fIiIiI..",
    "...iI.i...",
]
# A quilted coat buttoned to the neck, a fur collar, a red sash; a bedroll rides on his back.
TORSO = [
    "..fFggWg..",
    ".gcddeeee.",
    "WFcddeeee.",
    "gFccdOoee.",
    "Fgccdooee.",
    ".rrRRRRRr.",
    ".accddeee.",
    "aaccddeeee",
    "aaccddeeee",
]
# What is left: the coat sat down on itself, the hat on top.
HEAP = [
    "......FggW......",
    ".....FggWWg.....",
    "....fFrROog.....",
    "...accFgsIu.....",
    "..accdddIie.....",
    ".aaccdrRRdee....",
    ".aaccddddeeee...",
    "aaaccdddddeeee..",
    "aaccddddddeeeee.",
    "aaccdddddeeeeee.",
    "fFFgggWWWgggFFf.",
]

POLE_UP, POLE_DOWN = 29.0, 16.0
DRUM_H, DRUM_R = 11.0, 4.6


def pole_points(grip: Pt, angle: float) -> tuple[Pt, Pt]:
    """Foot and head of the pole; `angle` is where the head points (−90 = straight up)."""
    a = math.radians(angle)
    d = (math.cos(a), math.sin(a))
    return (grip[0] - d[0] * POLE_DOWN, grip[1] - d[1] * POLE_DOWN), (grip[0] + d[0] * POLE_UP, grip[1] + d[1] * POLE_UP)


def draw_wheel(cel: Cel, top: Pt, angle: float, spin: float, lit: float) -> None:
    """The drum on the pole's head, seen side-on: brass shaded round, a red band, a row of signs that slide across
    it as it turns, and its weight on a chain flying round — behind the drum on the far half of its turn."""
    a = math.radians(angle)
    d = (math.cos(a), math.sin(a))  # along the pole, towards the finial
    f = (-d[1], d[0])  # across it
    base = (top[0] - d[0] * 1.0, top[1] - d[1] * 1.0)
    mid = (base[0] + d[0] * DRUM_H * 0.5, base[1] + d[1] * DRUM_H * 0.5)
    wx = math.cos(spin) * 9.4
    weight = (mid[0] + f[0] * wx - d[0] * 1.0, mid[1] + f[1] * wx - d[1] * 1.0 + 0.8)
    front = math.sin(spin) >= 0.0

    def swing() -> None:
        cel.line((mid[0] + f[0] * (DRUM_R if wx > 0 else -DRUM_R), mid[1] + f[1] * (DRUM_R if wx > 0 else -DRUM_R)), weight, ("ink", 4))
        for ox, oy in ((0, 0), (1, 0), (0, 1), (1, 1), (2, 0), (2, 1), (0, 2), (1, 2), (2, 2)):
            cel.put(weight[0] + ox - 1.0, weight[1] + oy - 1.0, ("brass", (6 if ox + oy < 2 else 4) if lit > 0.5 else 3))

    if not front:
        swing()
    signs = ((spin / math.tau) * 2.0) % 1.0
    u = 0.0
    while u <= DRUM_H:
        v = -DRUM_R
        while v <= DRUM_R:
            x, y = base[0] + d[0] * u + f[0] * v, base[1] + d[1] * u + f[1] * v
            s = v / DRUM_R
            rim = u < 1.0 or u > DRUM_H - 1.0
            band = 3.0 <= u < 8.0
            if rim:
                tone = ("brass", (1 if s < -0.4 else 3 if s > 0.45 else 2) if lit > 0.5 else (2 if s < -0.4 else 5 if s > 0.45 else 4))
            elif band:
                tone = ("crimson", (2 if s < -0.4 else 5 if s > 0.45 else 4) if lit > 0.5 else (1 if s < -0.4 else 3 if s > 0.45 else 2))
                # the signs written on the band slide across as it turns
                if lit > 0.5 and 4.9 <= u < 6.1 and abs(((s * 0.5 + 0.5) - signs + 2.0) % (1 / 3) - 1 / 6) < 0.055:
                    tone = ("brass", 7)
            else:
                tone = ("brass", (2 if s < -0.4 else 6 if s > 0.45 else 4) if lit > 0.5 else (1 if s < -0.4 else 3 if s > 0.45 else 2))
            cel.put(x, y, tone)
            v += 0.5
        u += 0.5
    # the finial
    cel.put(base[0] + d[0] * (DRUM_H + 0.6), base[1] + d[1] * (DRUM_H + 0.6), ("brass", 4))
    cel.put(base[0] + d[0] * (DRUM_H + 1.6), base[1] + d[1] * (DRUM_H + 1.6), ("brass", 6 if lit > 0.5 else 3))
    if front:
        swing()


class WheelTurner(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        grip = loose(pose, "pole", J["handN"], self.build.root_x)
        a = math.radians(pose["pole"])
        w = pose.get("two", 0.0) * (1.0 - pose.get("pole_free", 0.0))
        if w > 0.01:
            on = (grip[0] + math.cos(a) * 5.0, grip[1] + math.sin(a) * 5.0)  # the far hand a hand higher
            hx, hy = J["handF"]
            J["elbowF"], J["handF"] = ik(J["shF"], (lerp(hx, on[0], w), lerp(hy, on[1], w)), self.build.upper, self.build.fore, +1)
        J["grip"] = grip
        foot, top = pole_points(grip, pose["pole"])
        J["ptop"] = top
        J["rib"] = (top[0] - math.cos(a) * 3.0, top[1] - math.sin(a) * 3.0)
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def grounded(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        return {
            "rib1": ChainSpec(Chain(6, 2.6, gravity=0.14, drag=0.16, damp=0.08), lambda J: J["rib"], grounded, (-0.8, 0.6)),
            "rib2": ChainSpec(Chain(5, 2.3, gravity=0.2, drag=0.1, damp=0.06), lambda J: (J["rib"][0], J["rib"][1] + 1.0), grounded, (-0.6, 0.8)),
            "roll": ChainSpec(Chain(3, 1.6, gravity=0.26, drag=0.1, damp=0.08), lambda J: (J["chest"][0] - 4.4, J["chest"][1] + 3.0), grounded),
        }

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        cel.limb(J["hip" + s], J["knee" + s], 4.4, 3.8, "ink", (2, 3, 4), far=far)
        # felt boots, turned up at the toe
        cel.limb(J["knee" + s], J["ankle" + s], 3.8, 3.4, "bone", (3, 4, 6), far=far)
        cel.limb(J["ankle" + s], J["toe" + s], 3.6, 2.6, "bone", (3, 5, 6), far=far)

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 4.2, 3.8, "leather", (2, 3, 4), far=far)
        cel.limb(el, hd, 3.6, 3.0, "leather", (2, 3, 4), far=far)
        # a fur cuff and a mitten
        cel.limb(hd, (hd[0] + (hd[0] - el[0]) * 0.3, hd[1] + (hd[1] - el[1]) * 0.3), 3.2, 2.8, "bone", (3, 5, 6), far=far)

    def draw(self, cel, J, pose, ropes, between) -> None:
        rx = self.build.root_x + pose.get("dx", 0.0)
        lit = pose.get("lit", 1.0)
        spin = pose.get("spin", 0.0)
        gone = pose.get("gone", 0.0) > 0.5
        foot, top = pole_points(J["grip"], pose["pole"])

        def pole() -> None:
            tmp = Cel(cel.w, cel.h, cel.top)
            tmp.limb(foot, top, 1.8, 1.6, "leather", (2, 4, 5))
            for name, w0 in (("rib1", 2.2), ("rib2", 1.8)):
                pts = ropes[name]
                for i in range(len(pts) - 1):
                    tmp.limb(pts[i], pts[i + 1], w0 + 0.6, max(1.4, w0), "crimson", (3, 5, 6) if name == "rib1" else (2, 3, 4))
            draw_wheel(tmp, top, pose["pole"], spin, lit)
            for (x, y), t in tmp.px.items():
                if y < GROUND:
                    cel.px[(x, y)] = t

        if gone:
            cel.stamp(HEAP, L, rx - 8.0, GROUND - len(HEAP))
            pole()
            cel.outline()
            return
        lean = pose.get("lean", 0.0)
        behind = pose.get("pole_free", 0.0) < 0.5
        if not behind:
            pole()  # once it has left his hands it lies on the far side of him
        roll = ropes["roll"]
        self.arm(cel, J, "F", True)
        self.leg(cel, J, "F", True)
        self.leg(cel, J, "N", False)
        px, py = J["pelvis"]
        kx, ky = (J["kneeN"][0] + J["kneeF"][0]) / 2, (J["kneeN"][1] + J["kneeF"][1]) / 2
        # the coat's skirt and its fur hem
        hem = (px + (kx - px) * 0.8, py + (ky - py) * 0.8 + 0.4)
        cel.limb((px, py - 1.0), hem, 9.6, 11.6, "leather", (2, 4, 5))
        cel.limb((hem[0] - 5.4, hem[1] + 0.8), (hem[0] + 5.4, hem[1] + 0.8), 2.6, 2.6, "bone", (3, 5, 7))
        # the bedroll across his back
        cel.limb(roll[0], roll[-1], 4.4, 4.4, "bone", (2, 3, 5))
        cel.limb((roll[0][0] - 0.2, roll[0][1] + 1.4), (roll[0][0] + 0.2, roll[0][1] + 1.4), 4.6, 4.6, "crimson", (2, 3, 4))
        cel.stamp_lean(TORSO, L, (px, py), 4, lean)
        hx, hy = J["head"]
        turn = pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0)
        eye = pose.get("eye", 1.0)
        cel.stamp_turn(HEAD, {**L, "E": ("sea", 8) if eye >= 0.5 else ("ink", 3)}, (hx, hy + 3), 4, turn)
        if behind:
            pole()
        self.arm(cel, J, "N", False)
        cel.outline()

        # Fx (drawn only where nothing is): the gold that climbs out of the turning wheel, and the spark he shakes out.
        if lit > 0.5:
            ph = pose.get("motes", 0.0)
            a = math.radians(pose["pole"])
            cx, cy = top[0] + math.cos(a) * 5.0, top[1] + math.sin(a) * 5.0
            # three sparks going round the drum with the turn, each dragging a tail; they pass behind it. A white
            # heart in gold, edged and tailed in the band's red so they show on a pale sky as well as a dark one.
            for i in range(3):
                head = math.tau * (ph + i / 3)
                for j in range(1, 8):
                    ang = head - j * 0.17
                    x, y = cx + math.cos(ang) * 11.0, cy + math.sin(ang) * 4.6 + math.cos(ang) * 1.8
                    if 1 < y < GROUND - 1:
                        cel.soft(x, y, ("brass", 5) if j < 3 else ("crimson", 5) if j < 5 else ("crimson", 4))
                        if j < 4:
                            cel.soft(x, y + 1, ("crimson", 4))
                x, y = cx + math.cos(head) * 11.0, cy + math.sin(head) * 4.6 + math.cos(head) * 1.8
                if 2 < y < GROUND - 2:
                    for ox, oy, tone in ((0, 0, ("light", 0)), (1, 0, ("brass", 6)), (-1, 0, ("brass", 6)), (0, 1, ("brass", 6)), (0, -1, ("brass", 6)),
                                         (1, 1, ("crimson", 4)), (-1, 1, ("crimson", 4)), (1, -1, ("crimson", 4)), (-1, -1, ("crimson", 4)),
                                         (2, 0, ("crimson", 4)), (-2, 0, ("crimson", 4)), (0, 2, ("crimson", 4)), (0, -2, ("crimson", 4))):
                        cel.soft(x + ox, y + oy, tone)
            for i in range(3):
                q = (ph + i / 3) % 1.0
                x = cx + math.sin(math.tau * (q * 1.5 + i * 0.37)) * (2.0 + 5.0 * q)
                y = cy - 6.0 - 9.0 * q
                if 1 < y < GROUND - 1:
                    cel.soft(x, y, ("brass", 6) if q < 0.4 else ("brass", 5) if q < 0.7 else ("brass", 4))
        burst = pose.get("burst", 0.0)
        if burst > 0.02:
            a = math.radians(pose["pole"])
            cx, cy = top[0] + math.cos(a) * 4.0, top[1] + math.sin(a) * 4.0
            for i in range(10):
                ang = math.tau * i / 10 + 0.3
                r = 3.0 + 7.0 * burst
                x, y = cx + math.cos(ang) * r, cy + math.sin(ang) * r * 0.8
                if y < GROUND - 1:
                    cel.soft(x, y, ("light", 0) if burst < 0.5 else ("brass", 7))
                    if cy + math.sin(ang) * r * 0.5 < GROUND - 1:
                        cel.soft(cx + math.cos(ang) * r * 0.6, cy + math.sin(ang) * r * 0.5, ("brass", 6))
        if eye >= 0.5 and abs(turn) < 30:
            cel.soft(hx + 4.6, hy - 2.0, ("sea", 6))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=0.6, lean=7.0, footN=(-3.6, 0.0, 0.0), footF=(3.8, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=44.0, elbN=62.0, armF=40.0, elbF=70.0, pole=-88.0, two=1.0, head_dx=0.0, head_dy=0.0, head_rot=0.0, breath=0.0,
                  spin=0.0, motes=0.0, lit=1.0, eye=1.0, burst=0.0, gone=0.0, pole_free=0.0, pole_at=(0.0, 0.0), flash=0.0)

TURNS = 2  # turns of the wheel in one idle loop


def idle_pose(ph: float) -> Pose:
    s, c = math.sin(math.tau * ph), math.cos(math.tau * ph)
    w = math.sin(math.tau * 2 * ph)
    # He turns the pole between his mittens: the hands go round a small circle, the pole's head nods with them,
    # the body rocks from one foot to the other in time with the wheel.
    return {**BASE, "breath": 0.4 + 0.4 * s, "lean": 7.0 + 1.6 * w, "drop": 0.6 + 0.5 * (0.5 + 0.5 * w), "dx": 0.5 * c,
            "armN": 44.0 + 5.0 * w, "elbN": 62.0 - 6.0 * w, "pole": -88.0 + 3.0 * math.cos(math.tau * 2 * ph), "head_rot": 3.0 * s,
            "head_dy": 0.4 * w, "spin": math.tau * TURNS * ph, "motes": ph, "eye": 1.0 if math.sin(math.tau * (ph - 0.1)) > -0.85 else 0.0}


def walk_pose(ph: float) -> Pose:
    c, s2 = math.cos(math.tau * ph), math.cos(2 * math.tau * (ph - 0.1))
    p: Pose = gait_legs(Gait(stride=0.62, give=1.2, lift=0.6, toe=0.6), ph)
    # An old man's shuffle, short and quick, bent forward; the wheel rides upright and keeps turning.
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 12.0 + 1.5 * s2, "dy": 0.6 + 0.5 * s2, "hip_rot": -0.5 * c, "sh_rot": 0.4 * c, "armN": 46.0 + 3.0 * c, "elbN": 60.0,
              "pole": -84.0 + 3.0 * math.cos(math.tau * 2 * (ph - 0.1)), "head_dy": 0.5 * math.cos(2 * math.tau * (ph - 0.2)), "head_rot": 4.0,
              "spin": math.tau * TURNS * ph, "motes": ph})
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# He leans back with the wheel over his shoulder, then tips it at the enemy and shakes a spark of its gold loose.
ATTACK_KEYS = [
    (0.00, k(), "lin"),
    (0.14, k(dx=-0.8, drop=1.2, lean=2.0, armN=30.0, elbN=74.0, pole=-100.0, spin=2.0, motes=0.15, head_rot=-4.0), "out"),
    (0.42, k(dx=-1.6, drop=1.8, lean=-4.0, armN=18.0, elbN=84.0, pole=-116.0, spin=9.0, motes=0.45, head_rot=-8.0, footN=(-3.0, 0.0, 0.0), footF=(4.6, 0.6, 6.0)), "io"),
    (0.50, k(dx=1.6, drop=2.2, lean=18.0, armN=66.0, elbN=40.0, pole=-58.0, spin=11.0, motes=0.6, head_rot=8.0, burst=0.15, footN=(-5.2, 0.0, -8.0), footF=(4.6, 0.0, 0.0)), "in"),
    (0.58, k(dx=2.0, drop=2.4, lean=20.0, armN=68.0, elbN=38.0, pole=-56.0, spin=12.0, motes=0.7, head_rot=9.0, burst=0.6, footN=(-5.6, 0.0, -10.0), footF=(4.2, 0.0, 0.0)), "lin"),
    (0.70, k(dx=1.8, drop=2.2, lean=18.0, armN=64.0, elbN=42.0, pole=-60.0, spin=13.5, motes=0.8, head_rot=8.0, burst=1.0, footN=(-5.4, 0.0, -8.0), footF=(4.4, 0.0, 0.0)), "out"),
    (0.86, k(dx=0.8, drop=1.2, lean=11.0, armN=52.0, elbN=54.0, pole=-76.0, spin=16.0, motes=0.9, head_rot=3.0, footN=(-4.4, 0.0, -3.0), footF=(3.8, 0.5, 3.0)), "io"),
    (1.00, k(spin=math.tau * 3, motes=1.0), "io"),
]

HURT_KEYS = stagger_keys(BASE, push=3.6, bend=12.0, buckle=2.2, whip=18.0, over={
    "impact": dict(armN=40.0, elbN=64.0, pole=-94.0, spin=1.0, eye=1.0),
    "reel": dict(armN=24.0, elbN=76.0, pole=-112.0, spin=2.2, eye=0.0),
    "catch": dict(armN=52.0, elbN=52.0, pole=-76.0, spin=3.6, eye=1.0),
})

# Death: the pole slips out of his mittens and goes over; the wheel hits the stones, stops and goes dark. He sits
# down in his coat and does not get up.
_SAG = dict(two=0.0, armN=20.0, elbN=30.0, armF=24.0, elbF=30.0, eye=0.0)
_LAIN = dict(pole_free=1.0, pole_at=(7.0, 2.4), pole=-8.0, lit=0.0, spin=7.4)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-1.8, drop=1.4, lean=-8.0, head_rot=-16.0, armN=30.0, elbN=70.0, pole=-100.0, spin=1.4, footN=(-2.6, 0.0, 0.0), footF=(5.0, 1.0, 8.0)), "out3"),
    (0.24, k(**_SAG, dx=-2.4, drop=2.0, lean=-4.0, head_rot=-6.0, pole=-78.0, pole_free=0.35, pole_at=(4.0, 15.0), spin=3.6, lit=1.0, footN=(-2.0, 0.0, 0.0), footF=(5.4, 0.0, 0.0)), "io"),
    (0.40, k(**_SAG, dx=-2.6, drop=3.4, lean=4.0, head_rot=8.0, pole=-34.0, pole_free=1.0, pole_at=(7.0, 9.0), spin=6.0, lit=1.0, burst=0.0, footN=(-1.8, 0.0, 0.0), footF=(5.6, 0.0, 0.0)), "in"),
    (0.48, k(**{**_SAG, **_LAIN, "lit": 1.0}, dx=-2.6, drop=4.6, lean=10.0, head_rot=14.0, burst=0.3, footN=(-1.8, 0.0, 0.0), footF=(5.6, 0.0, 0.0)), "lin"),
    (0.58, k(**{**_SAG, **_LAIN}, dx=-2.4, drop=6.2, lean=16.0, head_rot=22.0, burst=1.0, footN=(-2.0, 0.0, 0.0), footF=(5.4, 0.0, 0.0)), "out"),
    (0.76, k(**{**_SAG, **_LAIN}, dx=-2.0, drop=8.0, lean=24.0, head_rot=30.0, footN=(-2.4, 0.0, 0.0), footF=(5.0, 0.0, 0.0)), "io"),
    (0.86, k(**{**_SAG, **_LAIN}, dx=-2.0, drop=8.0, lean=24.0, head_rot=30.0, gone=1.0, footN=(-2.4, 0.0, 0.0), footF=(5.0, 0.0, 0.0)), "lin"),
    (1.00, k(**{**_SAG, **_LAIN}, dx=-2.0, drop=8.0, lean=24.0, head_rot=30.0, gone=1.0, footN=(-2.4, 0.0, 0.0), footF=(5.0, 0.0, 0.0)), "lin"),
]

STILL = lambda t: (-0.25 + 0.2 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [140] * 12, True, STILL),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [70] * 12, True, lambda t: (-0.7, 0.0)),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.07, 0.14, 0.24, 0.33, 0.42, 0.50, 0.58, 0.70, 0.86, 1.0],
                   [80, 70, 80, 90, 110, 150, 40, 60, 110, 110, 100], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.17, 0.24, 0.32, 0.40, 0.48, 0.58, 0.67, 0.76, 0.86, 1.0],
                  [50, 50, 80, 90, 110, 110, 90, 50, 90, 120, 150, 120, 1000], False, STILL),
}
