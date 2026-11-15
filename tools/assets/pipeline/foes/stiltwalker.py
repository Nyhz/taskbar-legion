"""Marsh Carp-Bearer — world 3, support. A fen-dweller who crosses the mire on stilts: two straight poles far
longer than its legs, its feet on pegs half-way up them, so it stands head and shoulders over the pack. A straw
rain-cape, a wide conical hat with a red-and-white cord and the face lost in its shade. In both hands a bamboo
pole, and from its top a cloth carp — white, with red patches — swimming on the wind: the thing to look for. It
never stands still: on stilts you keep stepping or you fall, so it marks time and sways, and the carp swims above
it — that swimming carp IS its aura. Its one blow is to whip the pole forward so the carp cracks at the party.
When it dies the stilts go from under it: it pitches onto its face, the pole comes down along the path ahead of it
and the carp lies flat beyond its tip.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, ik, keyed, loose, stagger_keys

FIGURE = ("StiltWalker", "foe", "w03")

# Each leg of the rig is a stilt: a short stub at the hip (hidden under the cape) and one long straight pole to the
# ground. The creature's own leg is drawn from the hip down to a peg part-way up that pole.
STILT = 22.0  # the pole, hip-stub to ground
PEG = 14.0  # how far up the pole the foot stands
BUILD = Build(root_x=40, thigh=3.0, shin=STILT, foot=1.6, hip_dx=1.5, spine=7.6, sh_near=2.8, sh_far=2.4, upper=5.0, fore=5.0, neck=0.2, head_dx=0.8)

L = {
    "E": ("light", 0), "k": ("ink", 0), "l": ("ink", 2), "R": ("crimson", 5), "F": ("light", 0),
    "s": ("skin", 2), "t": ("skin", 4),
    "x": ("brass", 1), "y": ("brass", 2), "z": ("brass", 3), "w": ("brass", 4), "v": ("brass", 5),
    "a": ("bone", 1), "b": ("bone", 2), "c": ("bone", 3), "d": ("bone", 4), "e": ("bone", 5),
}

# The hat is most of the head: a wide straw cone, the face a shadow under it with one pale eye and a jaw.
HEAD = [
    "......w......",
    ".....zwv.....",
    "....yzwwv....",
    "...yyzzwwv...",
    "..RRFRRFRRR..",
    ".xxyyzzzwwvv.",
    "xxxyyyzzzwwvv",
    "....kkkkEk...",
    "....lkkktt...",
    ".....sstt....",
]
# The straw cape: layer over layer of reed, ragged at the hem, wider than the body under it.
CAPE = [
    "...bcdd...",
    "..abcdde..",
    ".abbcddee.",
    ".abacdcde.",
    "aabbcddee.",
    "abacbdcdee",
    "aabbcddee.",
    "abacbdcde.",
    "a.bb.d.de.",
]

POLE_UP = 25.0  # the pole above the upper hand
POLE_DOWN = 7.0  # and below it


class StiltWalker(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        grip = loose(pose, "pole", J["handN"], self.build.root_x)
        a = math.radians(pose["pole"])
        u = (math.sin(a), -math.cos(a))  # up the pole
        hold = 1.0 - pose.get("pole_free", 0.0)
        if hold > 0.01:
            low = (grip[0] - u[0] * 4.5, grip[1] - u[1] * 4.5)
            hx, hy = J["handF"]
            goal = (hx + (low[0] - hx) * hold, hy + (low[1] - hy) * hold)
            J["elbowF"], J["handF"] = ik(J["shF"], goal, self.build.upper, self.build.fore, +1)
        J["grip"] = grip
        J["butt"] = (grip[0] - u[0] * POLE_DOWN, grip[1] - u[1] * POLE_DOWN)
        J["tip"] = (grip[0] + u[0] * POLE_UP, grip[1] + u[1] * POLE_UP)
        J["mouth"] = (grip[0] + u[0] * (POLE_UP - 2.5), grip[1] + u[1] * (POLE_UP - 2.5))
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def above(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 2.0))

        return {"carp": ChainSpec(Chain(8, 2.3, gravity=0.07, drag=0.22, damp=0.07), lambda J: J["mouth"], above, rest=(-1.0, 0.15))}

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        hip, knee, ankle = J["hip" + s], J["knee" + s], J["ankle" + s]
        n = math.hypot(ankle[0] - knee[0], ankle[1] - knee[1]) or 1.0
        ux, uy = (knee[0] - ankle[0]) / n, (knee[1] - ankle[1]) / n  # up the pole
        peg = (ankle[0] + ux * PEG, ankle[1] + uy * PEG)
        top = (ankle[0] + ux * (STILT + 2.0), ankle[1] + uy * (STILT + 2.0))
        # The pole: one straight pale stick from the ground to above the hip, a dark ferrule at its foot.
        cel.limb(top, ankle, 1.8, 1.8, "leather", (4, 6, 7), far=far)
        cel.put(ankle[0], ankle[1], ("leather", 1))
        cel.put(ankle[0], ankle[1] - 1, ("leather", 2))
        # Its own leg, dark, down the front of the pole to the peg, and the foot on the peg.
        cel.limb((hip[0] + 1.6, hip[1]), (peg[0] + 2.2, peg[1] - 1.0), 2.8, 2.2, "ink", (1, 2, 3), far=far)
        cel.limb((peg[0] + 0.4, peg[1]), (peg[0] + 3.6, peg[1]), 1.6, 1.4, "leather", (2, 3, 4), far=far)
        cel.limb((peg[0] + 1.4, peg[1] - 1.4), (peg[0] + 4.2, peg[1] - 1.4), 1.8, 1.6, "bone", (2, 3, 5), far=far)

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 3.2, 2.8, "bone", (2, 3, 5), far=far)
        cel.limb(el, hd, 2.6, 2.2, "skin", (2, 3, 4), far=far)
        cel.put(hd[0], hd[1], ("skin", 4))

    def carp(self, cel: Cel, pts: list[Pt]) -> None:
        # A cloth koi: a brass hoop for a mouth, a white body that tapers, red patches on the back, a red forked
        # tail; a dark eye. White first, so it cannot be mistaken for the red tunics of the drowned.
        widths = [5.0, 6.4, 6.6, 6.2, 5.4, 4.4, 3.2, 4.6]
        for i in range(len(pts) - 1):
            cel.limb(pts[i], pts[i + 1], widths[i], widths[i + 1], "crimson" if i >= len(pts) - 2 else "bone", (4, 5, 6) if i >= len(pts) - 2 else (5, 6, 7))
        for i in range(1, len(pts) - 2):
            (x0, y0), (x1, y1) = pts[i], pts[i + 1]
            n = math.hypot(x1 - x0, y1 - y0) or 1.0
            nx, ny = -(y1 - y0) / n, (x1 - x0) / n
            if ny > 0:
                nx, ny = -nx, -ny  # (nx, ny) points to the back of the fish (up)
            if i in (2, 4):  # a red patch across the back
                for d in (0.4, 1.4, 2.4):
                    cel.put(x0 + nx * d, y0 + ny * d, ("crimson", 5))
                    cel.put(x0 + (x1 - x0) * 0.5 + nx * d, y0 + (y1 - y0) * 0.5 + ny * d, ("crimson", 5 if d < 2.0 else 4))
        # the fork of the tail
        (xa, ya), (xb, yb) = pts[-2], pts[-1]
        n = math.hypot(xb - xa, yb - ya) or 1.0
        dx, dy = (xb - xa) / n, (yb - ya) / n
        cel.put(xb + dx - dy * 2.0, yb + dy + dx * 2.0, ("crimson", 5))
        cel.put(xb + dx + dy * 2.0, yb + dy - dx * 2.0, ("crimson", 5))
        # mouth hoop and eye
        mx, my = pts[0]
        ex, ey = pts[1]
        for d in (-2.0, -1.0, 0.0, 1.0, 2.0):
            cel.put(mx, my + d, ("brass", 5 if abs(d) < 2 else 4))
        cel.put(ex, ey - 1.0, ("ink", 0))

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        self.arm(cel, J, "F", far=True)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        la = math.radians(lean)
        cel.stamp_lean(CAPE, L, (px - 2.0 * math.sin(la), py + 2.0 * math.cos(la)), 4.5, lean)
        hx, hy = J["head"]
        cel.stamp_turn(HEAD, L, (hx, hy + 3), 6, pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0))
        # The pole: pale bamboo with its knots, a cord at the top.
        bx, by = J["butt"]
        tx, ty = J["tip"]
        cel.limb((bx, by), (tx, ty), 1.6, 1.3, "bone", (3, 5, 6))
        for f in (0.22, 0.45, 0.68, 0.9):
            cel.put(bx + (tx - bx) * f, by + (ty - by) * f, ("bone", 2))
        self.carp(cel, ropes["carp"])
        cel.put(tx, ty, ("brass", 5))
        self.arm(cel, J, "N", far=False)
        cel.outline()
        snap = pose.get("snap", 0.0)
        if snap > 0.05:
            # The crack of the cloth at the end of the whip: a burst at the carp's tail.
            cx, cy = ropes["carp"][-1]
            r = 2.0 + snap * 5.0
            for i in range(6):
                a = math.tau * i / 6 + 0.3
                cel.soft(cx + math.cos(a) * r, cy + math.sin(a) * r, ("light", 0) if i % 2 == 0 else ("crimson", 6))
                if snap < 0.7:
                    cel.soft(cx + math.cos(a) * (r - 1.5), cy + math.sin(a) * (r - 1.5), ("crimson", 6))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=0.6, lean=4.0, footN=(-2.0, 0.0, 0.0), footF=(2.6, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=46.0, elbN=64.0, armF=58.0, elbF=44.0, pole=-5.0, head_dx=0.0, head_dy=0.0, head_rot=0.0, breath=0.0,
                  pole_free=0.0, pole_at=(0.0, 0.0), snap=0.0)


def idle_pose(ph: float) -> Pose:
    # Marking time: one stilt lifts, then the other, the body swaying over whichever bears the weight.
    s = math.sin(math.tau * ph)
    upN = max(0.0, s) ** 1.5
    upF = max(0.0, -s) ** 1.5
    sway = math.sin(math.tau * (ph - 0.08))
    return {**BASE, "dx": 1.1 * sway, "footN": (-2.0 - 1.1 * sway + 0.5 * upN, 3.0 * upN, 0.0), "footF": (2.6 - 1.1 * sway - 0.5 * upF, 3.0 * upF, 0.0),
            "drop": 0.6 + 0.4 * abs(sway), "lean": 4.0 + 3.0 * sway, "pole": -5.0 - 6.0 * sway, "armN": 46.0 - 4.0 * sway, "head_rot": 5.0 * sway,
            "head_dy": 0.3 * abs(sway), "breath": 0.3 + 0.3 * s}


def walk_pose(ph: float) -> Pose:
    c, s2 = math.cos(math.tau * ph), math.cos(2 * math.tau * (ph - 0.1))
    p: Pose = gait_legs(Gait(stride=0.5, give=0.6, lift=1.0, toe=0.2), ph)
    p.update(lean=8.0 + 2.0 * s2, dy=0.6 + 0.7 * s2, hip_rot=-0.5 * c, sh_rot=0.4 * c, armN=46.0 + 3.0 * s2, elbN=64.0, armF=58.0, elbF=44.0,
             pole=-9.0 + 5.0 * math.cos(2 * math.tau * (ph - 0.25)), head_dx=0.0, head_dy=0.5 * s2, head_rot=0.0, breath=0.0,
             pole_free=0.0, pole_at=(0.0, 0.0), snap=0.0)
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# The whip: the pole drawn far back over the shoulder, held a breath, then thrown forward so the carp cracks.
WHIP_KEYS = [
    (0.00, k(), "lin"),
    (0.24, k(dx=-0.8, lean=-4.0, drop=0.6, pole=-28.0, armN=10.0, elbN=92.0, head_rot=-8.0, footN=(-2.2, 0.0, 0.0)), "out"),
    (0.48, k(dx=-1.4, lean=-9.0, drop=0.4, pole=-44.0, armN=-12.0, elbN=104.0, head_rot=-12.0, footN=(-1.6, 0.0, 0.0), footF=(4.8, 1.6, 0.0)), "io"),
    (0.54, k(dx=1.6, lean=17.0, drop=2.4, pole=66.0, armN=74.0, elbN=24.0, head_rot=8.0, head_dy=0.6, footN=(-4.6, 0.0, 0.0), footF=(5.4, 0.0, 0.0), snap=0.3), "lin"),
    (0.62, k(dx=1.4, lean=15.0, drop=2.0, pole=60.0, armN=70.0, elbN=28.0, head_rot=6.0, footN=(-4.4, 0.0, 0.0), footF=(5.4, 0.0, 0.0), snap=0.75), "out"),
    (0.76, k(dx=0.8, lean=10.0, drop=1.4, pole=30.0, armN=60.0, elbN=44.0, footN=(-3.8, 0.0, 0.0), footF=(4.4, 0.0, 0.0), snap=0.0), "out"),
    (1.00, k(), "io"),
]

HURT_KEYS = stagger_keys(BASE, push=3.4, bend=12.0, buckle=1.8, whip=16.0, over={
    "impact": dict(pole=6.0, armN=30.0, elbN=74.0),
    "reel": dict(pole=-30.0, armN=6.0, elbN=90.0, footF=(5.6, 2.6, 0.0)),
    "catch": dict(pole=14.0, armN=56.0, elbN=50.0),
})

# Death: the stilts skid back and it pitches forward onto its face; the pole leaves its hands and comes down
# along the path ahead, and the carp, with no wind under it, lies flat.
_LEGS = BUILD.thigh + BUILD.shin
_FLAT = dict(dx=2.0, drop=_LEGS - 6.4, lean=86.0, head_rot=-52.0, head_dy=0.0, armN=68.0, elbN=8.0, armF=82.0, elbF=4.0,
             footN=(-26.5, 0.6, -80.0), footF=(-23.0, 1.6, -70.0), pole=86.0, pole_free=1.0, pole_at=(8.0, 1.6))
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-1.4, drop=0.4, lean=-10.0, head_rot=-12.0, pole=-18.0, armN=20.0, elbN=84.0, footF=(4.6, 2.8, 0.0)), "out3"),
    (0.26, k(dx=0.8, drop=1.6, lean=14.0, head_rot=6.0, pole=8.0, armN=50.0, elbN=50.0, footN=(-5.4, 0.0, -10.0), footF=(1.4, 1.2, 0.0)), "io"),
    (0.42, k(dx=3.0, drop=6.0, lean=44.0, head_rot=10.0, pole=30.0, pole_free=0.5, pole_at=(8.0, 20.0), armN=30.0, elbN=40.0,
             footN=(-10.0, 0.2, -40.0), footF=(-6.0, 1.6, -30.0)), "in"),
    (0.54, k(**{**_FLAT, "drop": _LEGS - 8.0, "lean": 74.0, "head_rot": -30.0, "pole": 58.0, "pole_at": (8.0, 9.0), "footN": (-25.0, 1.0, -70.0), "footF": (-21.0, 3.0, -50.0)}), "in"),
    (0.62, k(**{**_FLAT, "pole": 80.0, "pole_at": (8.0, 3.0)}), "lin"),
    (0.70, k(**{**_FLAT, "drop": _LEGS - 7.2, "lean": 84.0, "pole": 90.0, "footF": (-23.0, 3.0, -60.0)}), "out"),
    (0.84, k(**_FLAT), "in"),
    (1.00, k(**_FLAT), "lin"),
]

WIND = lambda t: (-0.66 + 0.3 * math.sin(math.tau * t), 0.5 * math.sin(math.tau * (t * 2 + 0.15)) - 0.08)  # noqa: E731 — a steady wind from ahead with a slow wave in it: the carp swims

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [120] * 12, True, WIND),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [90] * 12, True, lambda t: (-0.95, 0.28 * math.sin(math.tau * (t * 2 + 0.1)) - 0.05)),
    "attack": Anim("attack", keyed(WHIP_KEYS), [0.0, 0.08, 0.16, 0.24, 0.32, 0.40, 0.48, 0.54, 0.58, 0.62, 0.69, 0.76, 0.88, 1.0],
                   [70, 70, 80, 90, 100, 110, 150, 45, 60, 70, 80, 90, 90, 100], False, WIND),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, WIND),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.18, 0.26, 0.34, 0.42, 0.48, 0.54, 0.58, 0.62, 0.66, 0.70, 0.84, 1.0],
                  [60, 50, 80, 80, 90, 80, 70, 60, 60, 50, 60, 70, 90, 140, 1200], False, lambda t: (-0.3, 0.0) if t < 0.5 else (1.8, 0.7)),  # down, the carp is laid out along the path past the pole
}
