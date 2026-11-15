"""Tide Augur — world 6, support. The priest who read the omens the day the sea came in, and went down still
reading them: tall, gaunt and upright, his toga drawn over the back of his head the way priests of the city wore
it at the altar — salt-bleached now, its purple border gone the colour of mussels — a grey drowned face under it
with a beard of kelp, one lit eye, an amulet of the same cold light at his chest, the hem trailing behind him.
He leans on the staff of his office: a tall shaft with a great spiral conch set mouth-up on its head, strings of
small shells under it, and out of the conch's mouth the sea's own breath — a ribbon of glowing mist, sea-green and
white, that rises, sways and curls over on itself and never stops. While it breathes the drowned fight harder;
carrying it is all he does. He walks it forward one planted step at a time, and when pressed he dips the conch
and it spits a gout of spray. When he dies the mist thins and stops, the staff comes down with him and he folds
into his toga; the conch lies on the road, its mouth dark.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, keyed, loose, stagger_keys

FIGURE = ("TideAugur", "foe", "w06")

BUILD = Build(root_x=40, thigh=7.8, shin=7.6, foot=3.8, hip_dx=1.2, spine=11.6, sh_near=3.0, sh_far=2.6, upper=6.4, fore=6.2, neck=1.0, head_dx=1.4, min_pelvis=3.8)

L = {
    # the salt-bleached toga, and its purple border
    "m": ("bone", 2), "n": ("bone", 3), "o": ("bone", 4), "p": ("bone", 5), "P": ("bone", 6),
    "v": ("violet", 3), "V": ("violet", 5),
    # drowned skin
    "s": ("ink", 6), "t": ("ink", 7), "u": ("ink", 8), "k": ("ink", 0), "E": ("sea", 8),
    # the kelp beard, kelp in the folds
    "b": ("moss", 2), "B": ("moss", 4), "N": ("moss", 6), "M": ("moss", 4),
    # the amulet: the same cold light as the mist
    "C": ("sea", 7), "c": ("sea", 5),
}

# The toga drawn over the back of the head, its border framing a grey face: a brow, one lit eye, a nose, and a
# beard of dark kelp that hangs straight down.
HEAD = [
    "..noppV...",
    ".nnoppVV..",
    ".mnopVsst.",
    "mmnoVkEtu.",
    "mmnoVsttuu",
    ".mnoVsBBB.",
    ".mnovbBNB.",
    "..nnvbBBB.",
    "...n.bBNb.",
    "......bB..",
]
# A narrow body under the folds: the border runs down across the chest, the amulet hangs where it crosses, kelp.
TORSO = [
    "..nnopp..",
    ".mnnoppP.",
    ".mnnoVpP.",
    "mmnnVCCp.",
    "mmnVVCcp.",
    ".mVVoopp.",
    ".VVnoopp.",
    "vVnnoopp.",
    "mmMnooppp",
    "mmnMoopp.",
    "mmnnNopp.",
]
# What is left of him: the toga fallen in on itself.
HEAP = [
    ".......nop........",
    ".....mnnoop.......",
    "....mnnooppP......",
    "...mmnnoVoopp.....",
    "..mmnnooVVoppp....",
    "..mmnnbBoVVppp....",
    ".mmnnnBbooVVppp...",
    ".mmnnMnooopVVpp...",
    "mmmnnnMoooppVVpp..",
    "mmnnnooMoooppvvpp.",
]

POLE_UP, POLE_DOWN = 15.0, 24.0

# The conch, mouth up, its point socketed on the shaft: knobbed shoulders, a ridge winding round it, a pink lip.
CONCH = [
    "...lLLLLLLl..",
    "..lWLLLLLLWl.",
    "W.hWWllllWWsW",
    ".WhHWWWWWHss.",
    "..sssHHWWHs..",
    ".WhHWWsssss..",
    "...hHHWWHs...",
    "..Wsssshs....",
    "....hHWs.....",
    "....sshs.....",
    ".....hs......",
]
SHELL = {"h": ("bone", 4), "H": ("bone", 6), "W": ("bone", 7), "s": ("bone", 3), "l": ("crimson", 7)}
MIST_H = 15.0  # how high the ribbon stands over the conch's mouth at rest


def pole_points(grip: Pt, angle: float) -> tuple[Pt, Pt]:
    """Foot and head of the shaft; `angle` is where the head points (−90 = straight up)."""
    a = math.radians(angle)
    d = (math.cos(a), math.sin(a))
    return (grip[0] - d[0] * POLE_DOWN, grip[1] - d[1] * POLE_DOWN), (grip[0] + d[0] * POLE_UP, grip[1] + d[1] * POLE_UP)


def draw_conch(cel: Cel, top: Pt, angle: float, lit: bool) -> Pt:
    """The crossbar and the conch on the shaft's head. Returns the middle of its mouth, where the mist leaves it."""
    a = math.radians(angle)
    d = (math.cos(a), math.sin(a))
    f = (-d[1], d[0])
    bar = (top[0] - d[0] * 2.0, top[1] - d[1] * 2.0)
    cel.limb((bar[0] - f[0] * 5.0, bar[1] - f[1] * 5.0), (bar[0] + f[0] * 5.0, bar[1] + f[1] * 5.0), 1.6, 1.6, "ink", (3, 5, 7))
    # the mouth glows with what is in it; dark when the breath has stopped
    cel.stamp_pivot(CONCH, {**SHELL, "L": ("sea", 6) if lit else ("ink", 2)}, (top[0] + d[0] * 1.0, top[1] + d[1] * 1.0), 6.0, float(len(CONCH)), angle + 90.0)
    return (top[0] + d[0] * 10.6 + f[0] * 0.5, top[1] + d[1] * 10.6 + f[1] * 0.5)


def draw_mist(cel: Cel, at: Pt, ph: float, size: float) -> None:
    """The sea's breath: one ribbon of lit mist that rises out of the conch, sways wider the higher it goes and
    curls over at the top; once a loop a breath swells out of the mouth and travels up it. `size` 1 = at rest."""
    if size <= 0.02:
        return
    length = MIST_H * min(size, 1.25)
    lit: set[tuple[int, int]] = set()
    n = int(length * 3)
    x = at[0]
    for i in range(n + 1):
        s = i / n
        y = at[1] - s * length
        x = at[0] + (0.5 + 3.4 * s) * math.sin(math.tau * (1.2 * s - ph)) + 1.6 * s * s
        puff = 1.8 * math.exp(-(((s - ph % 1.0) / 0.15) ** 2))
        w = (3.0 if s < 0.1 else 2.0 if s < 0.6 else 1.0) + puff
        q = -w / 2
        while q < w / 2:
            core = abs(q + 0.5) < 0.8
            tone = ("light", 0) if core and s < 0.55 else ("sea", 8) if core or s < 0.3 else ("sea", 7) if s < 0.8 else ("sea", 6)
            if y >= 1.0:
                cel.put(x + q + 0.5, y, tone)
                lit.add((int(math.floor(x + q + 0.5)), int(math.floor(y))))
            q += 1.0
    # the end of it curls over on itself
    turn = 1.0 if math.cos(math.tau * (1.2 - ph)) >= 0 else -1.0
    top = at[1] - length
    for j in range(1, 8):
        b = j * 0.55
        cx, cy = x + turn * (2.2 - 2.2 * math.cos(b)), top - 2.2 * math.sin(b)
        if cy >= 1.0:
            cel.put(cx, cy, ("sea", 7) if j < 4 else ("sea", 6))
            lit.add((int(math.floor(cx)), int(math.floor(cy))))
    # a deep rim, so it holds its shape on a pale sky as well as on a dark one
    for px_, py_ in lit:
        for nx, ny in ((px_ + 1, py_), (px_ - 1, py_), (px_, py_ - 1)):
            if ny >= 1:
                cel.soft(nx, ny, ("sea", 4))
    # a shred or two of it drifting off
    for i in range(2):
        q = (ph + i / 2) % 1.0
        sx = at[0] + (5.0 + 3.0 * q) * (1 if i == 0 else -1)
        sy = at[1] - length * (0.45 + 0.3 * i) - 5.0 * q
        if sy >= 2.0 and q < 0.8:
            cel.soft(sx, sy, ("sea", 7))
            cel.soft(sx + 1, sy - 1, ("sea", 5))


class TideAugur(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        J["grip"] = loose(pose, "pole", J["handN"], self.build.root_x)
        a = math.radians(pose["pole"])
        _, top = pole_points(J["grip"], pose["pole"])
        f = (-math.sin(a), math.cos(a))
        bar = (top[0] - math.cos(a) * 2.0, top[1] - math.sin(a) * 2.0)
        J["ptop"] = top
        J["barL"] = (bar[0] - f[0] * 4.6, bar[1] - f[1] * 4.6)
        J["barR"] = (bar[0] + f[0] * 4.6, bar[1] + f[1] * 4.6)
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def grounded(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        return {
            "shellL": ChainSpec(Chain(2, 2.2, gravity=0.3, drag=0.07, damp=0.04), lambda J: J["barL"], grounded),
            "shellR": ChainSpec(Chain(4, 2.2, gravity=0.3, drag=0.07, damp=0.04), lambda J: J["barR"], grounded),
            "train": ChainSpec(Chain(5, 2.6, gravity=0.3, drag=0.2, damp=0.12), lambda J: (J["pelvis"][0] - 3.0, J["pelvis"][1] + 2.0), grounded, (-0.8, 0.6)),
            "veil": ChainSpec(Chain(4, 2.2, gravity=0.2, drag=0.16, damp=0.1), lambda J: (J["head"][0] - 3.6, J["head"][1] - 3.0), grounded, (-0.5, 0.9)),
        }

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        cel.limb(J["knee" + s], J["ankle" + s], 2.6, 2.2, "ink", (4, 6, 7), far=far)
        cel.limb(J["ankle" + s], J["toe" + s], 2.6, 1.8, "ink", (4, 6, 8), far=far)

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 3.8, 3.4, "bone", (2, 3, 4), far=far)
        # a thin drowned forearm out of the sleeve
        mid = (el[0] + (hd[0] - el[0]) * 0.7, el[1] + (hd[1] - el[1]) * 0.7)
        cel.limb(el, mid, 3.4, 3.0, "bone", (2, 3, 4), far=far)  # the sleeve comes down past the elbow
        cel.limb(mid, hd, 2.2, 1.8, "ink", (5, 6, 8), far=far)
        cel.put(hd[0], hd[1], ("ink", 6 if far else 8))

    def draw(self, cel, J, pose, ropes, between) -> None:
        rx = self.build.root_x + pose.get("dx", 0.0)
        mist = pose.get("mist", 1.0)
        ph = pose.get("waft", 0.0)
        gone = pose.get("gone", 0.0) > 0.5
        foot, top = pole_points(J["grip"], pose["pole"])
        hearth: list[Pt] = []

        def pole() -> None:
            tmp = Cel(cel.w, cel.h, cel.top)
            tmp.limb(foot, top, 1.8, 1.6, "ink", (3, 5, 7))
            for name in ("shellL", "shellR"):
                pts = ropes[name]
                for i in range(len(pts) - 1):
                    tmp.line(pts[i], pts[i + 1], ("ink", 5))
                for i in range(1, len(pts)):
                    tmp.put(pts[i][0], pts[i][1], ("bone", 7 if i % 2 else 5))
                    tmp.put(pts[i][0] + 1, pts[i][1], ("bone", 5 if i % 2 else 7))
            hearth.append(draw_conch(tmp, top, pose["pole"], mist > 0.05))
            for (x, y), t in tmp.px.items():
                if y < GROUND:
                    cel.px[(x, y)] = t

        if gone:
            pole()  # he has fallen across the shaft
            cel.stamp(HEAP, L, rx - 9.0, GROUND - len(HEAP))
            cel.outline()
        else:
            lean = pose.get("lean", 0.0)
            behind = pose.get("pole_free", 0.0) < 0.5
            if not behind:
                pole()
            for name, w0 in (("train", 5.4), ("veil", 3.0)):
                pts = ropes[name]
                for i in range(len(pts) - 1):
                    cel.limb(pts[i], pts[i + 1], w0 - i * 0.5, w0 - 0.5 - i * 0.5, "bone", (2, 3, 4))
            self.arm(cel, J, "F", True)
            self.leg(cel, J, "F", True)
            self.leg(cel, J, "N", False)
            px, py = J["pelvis"]
            ax, ay = (J["ankleN"][0] + J["ankleF"][0]) / 2, (J["ankleN"][1] + J["ankleF"][1]) / 2
            # the mantle down to the ankles, ragged at the hem
            hem = (px + (ax - px) * 0.9, py + (ay - py) * 0.86)
            cel.limb((px, py - 1.0), hem, 8.0, 9.6, "bone", (3, 4, 5))
            # the purple border along the hem, ragged under it
            cel.limb((hem[0] - 4.8, hem[1] - 0.4), (hem[0] + 4.8, hem[1] - 0.4), 1.6, 1.6, "violet", (3, 5, 5))
            for i, ox in enumerate((-4.0, -1.5, 1.0, 3.5)):
                cel.limb((hem[0] + ox, hem[1] + 0.8), (hem[0] + ox - 0.4, hem[1] + 2.2 + (i % 2) * 1.2), 1.8, 1.0, "bone", (2, 3, 4))
            cel.limb((hem[0] - 1.0, py + 2.0), (hem[0] + 0.4, hem[1] - 1.0), 1.2, 1.2, "moss", (3, 4, 6))  # a strand of kelp
            cel.stamp_lean(TORSO, {**L, **({} if mist > 0.3 else {"C": ("ink", 4), "c": ("ink", 3)})}, (px, py), 4, lean)
            if behind:
                pole()  # in front of the body, but his face stays clear of the shaft
            hx, hy = J["head"]
            turn = pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0)
            eye = pose.get("eye", 1.0)
            cel.stamp_turn(HEAD, {**L, "E": ("sea", 8) if eye >= 0.5 else ("ink", 2)}, (hx, hy + 4), 4, turn)
            self.arm(cel, J, "N", False)
            cel.outline()

        # The mist, over everything: it is light, not a thing.
        at = hearth[0]
        if at[1] < GROUND - 2:
            draw_mist(cel, at, ph, mist)
        gout = pose.get("gout", 0.0)
        if gout > 0.02:
            a = math.radians(pose["pole"])
            for i in range(12):
                r = 3.0 + (6.0 + (i % 4) * 2.4) * gout
                ang = a + (i - 5.5) * 0.14
                x, y = at[0] + math.cos(ang) * r, at[1] + math.sin(ang) * r
                if y < GROUND - 1:
                    cel.soft(x, y, ("light", 0) if gout < 0.45 and i % 2 == 0 else ("sea", 8) if i % 3 else ("sea", 6))
        # the last of it, thinning away as he goes down
        smoke = pose.get("smoke", 0.0)
        if 0.02 < smoke < 0.85 and at[1] < GROUND:
            rise = 3.0 + 9.0 * (1.0 - smoke)
            y = 1.0
            while y < rise:
                t = y / rise
                cel.soft(at[0] + math.sin(y * 0.6 + smoke * 9.0) * (0.6 + 2.0 * t), at[1] - y, ("sea", 7) if t < 0.4 else ("sea", 6) if t < 0.75 else ("sea", 5))
                y += 1.0
        if abs(turn_of(pose)) < 30 and pose.get("eye", 1.0) >= 0.5 and not gone:
            cel.soft(J["head"][0] + 5.6, J["head"][1] - 0.6, ("sea", 6))


def turn_of(pose: Pose) -> float:
    lean = pose.get("lean", 0.0)
    return pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0)


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=1.0, lean=6.0, footN=(-4.0, 0.0, 0.0), footF=(3.6, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=34.0, elbN=52.0, armF=14.0, elbF=24.0, pole=-88.0, head_dx=0.0, head_dy=0.0, head_rot=3.0, breath=0.0,
                  mist=1.0, waft=0.0, eye=1.0, gout=0.0, smoke=0.0, gone=0.0, pole_free=0.0, pole_at=(0.0, 0.0), flash=0.0)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    # He hangs on the pole and sways like something under water; now and then he lifts his face to the mist.
    look = max(0.0, math.sin(math.tau * (ph - 0.55))) ** 3
    return {**BASE, "breath": 0.5 + 0.5 * s, "lean": 6.0 + 2.0 * s, "drop": 1.0 + 0.5 * late, "dx": 0.6 * late,
            "armN": 34.0 - 3.0 * s, "elbN": 52.0 + 4.0 * s, "armF": 14.0 + 6.0 * late, "pole": -88.0 + 1.6 * late,
            "head_rot": 3.0 + 3.0 * late - 20.0 * look, "waft": ph, "mist": 1.0 + 0.12 * math.sin(math.tau * 2 * ph) + 0.25 * look,
            "eye": 1.0 if math.sin(math.tau * (ph + 0.2)) > -0.8 else 0.0}


def walk_pose(ph: float) -> Pose:
    c, s2 = math.cos(math.tau * ph), math.cos(2 * math.tau * (ph - 0.1))
    p: Pose = gait_legs(Gait(stride=0.95, give=1.3, lift=0.75, toe=0.8), ph)
    # A long, dragging stride; the pole swings ahead with the near foot and is planted, and he pulls himself up to it.
    plant = math.cos(math.tau * (ph - 0.08))
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 11.0 + 3.0 * s2, "dy": 1.2 + 0.8 * s2, "hip_rot": -0.6 * c, "sh_rot": 0.5 * c, "armN": 38.0 + 12.0 * plant, "elbN": 50.0 - 8.0 * plant,
              "armF": 6.0 - 18.0 * c, "elbF": 30.0, "pole": -86.0 + 7.0 * plant, "head_rot": 6.0 + 3.0 * s2, "head_dy": 0.6 * s2,
              "waft": ph, "mist": 0.9 + 0.1 * s2})
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# He draws the conch back over his shoulder — the mist stands up — then dips it at the enemy and it spits a gout of spray.
ATTACK_KEYS = [
    (0.00, k(), "lin"),
    (0.16, k(dx=-1.0, drop=1.6, lean=8.0, armN=40.0, elbN=52.0, pole=-98.0, head_rot=0.0, waft=0.2, mist=1.2), "out"),
    (0.44, k(dx=-2.0, drop=2.2, lean=2.0, armN=24.0, elbN=70.0, pole=-112.0, head_rot=-10.0, waft=0.55, mist=1.6, footN=(-3.4, 0.0, 0.0), footF=(4.6, 0.8, 8.0)), "io"),
    (0.52, k(dx=2.0, drop=2.6, lean=26.0, armN=84.0, elbN=14.0, pole=-52.0, head_rot=14.0, waft=0.7, mist=0.5, gout=0.2, footN=(-6.0, 0.0, -10.0), footF=(4.6, 0.0, 0.0)), "in"),
    (0.60, k(dx=2.4, drop=2.8, lean=28.0, armN=86.0, elbN=12.0, pole=-50.0, head_rot=16.0, waft=0.8, mist=0.35, gout=0.6, footN=(-6.4, 0.0, -12.0), footF=(4.2, 0.0, 0.0)), "lin"),
    (0.72, k(dx=2.2, drop=2.6, lean=26.0, armN=82.0, elbN=16.0, pole=-54.0, head_rot=14.0, waft=0.95, mist=0.45, gout=1.0, footN=(-6.2, 0.0, -10.0), footF=(4.4, 0.0, 0.0)), "out"),
    (0.88, k(dx=1.0, drop=1.6, lean=19.0, armN=70.0, elbN=28.0, pole=-76.0, head_rot=11.0, waft=1.2, mist=0.8, footN=(-5.0, 0.0, -4.0), footF=(3.6, 0.6, 3.0)), "io"),
    (1.00, k(waft=1.4), "io"),
]

HURT_KEYS = stagger_keys(BASE, push=4.4, bend=14.0, buckle=2.6, whip=22.0, over={
    "impact": dict(armN=30.0, elbN=56.0, pole=-92.0, waft=0.1, mist=0.6, eye=1.0),
    "reel": dict(armN=20.0, elbN=70.0, pole=-108.0, waft=0.3, mist=0.4, eye=0.0),
    "catch": dict(armN=50.0, elbN=40.0, pole=-74.0, waft=0.55, mist=0.8, eye=1.0),
})

# Death: the mist thins and stops; the staff comes down with him and he folds into his toga.
_SAG = dict(armN=24.0, elbN=26.0, armF=20.0, elbF=24.0, eye=0.0)
_LAIN = dict(pole_free=1.0, pole_at=(12.0, 3.6), pole=-12.0, mist=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-2.0, drop=1.8, lean=2.0, head_rot=-16.0, armN=48.0, elbN=46.0, pole=-98.0, waft=0.15, mist=1.3, footN=(-3.0, 0.0, 0.0), footF=(5.0, 1.0, 8.0)), "out3"),
    (0.26, k(**_SAG, dx=-2.6, drop=2.6, lean=10.0, head_rot=4.0, pole=-80.0, pole_free=0.3, pole_at=(6.0, 20.0), waft=0.4, mist=0.5, smoke=0.1, footN=(-2.4, 0.0, 0.0), footF=(5.4, 0.0, 0.0)), "io"),
    (0.42, k(**_SAG, dx=-2.4, drop=5.0, lean=22.0, head_rot=18.0, pole=-40.0, pole_free=1.0, pole_at=(9.0, 12.0), waft=0.6, mist=0.2, smoke=0.3, footN=(-2.6, 0.0, 0.0), footF=(5.2, 0.0, 0.0)), "in"),
    (0.52, k(**{**_SAG, **_LAIN}, dx=-2.0, drop=8.0, lean=38.0, head_rot=30.0, smoke=0.45, footN=(-3.0, 0.0, 0.0), footF=(4.8, 0.0, 0.0)), "lin"),
    (0.66, k(**{**_SAG, **_LAIN}, dx=-1.4, drop=11.0, lean=60.0, head_rot=40.0, smoke=0.6, footN=(-3.6, 0.0, 0.0), footF=(4.2, 0.0, 0.0)), "out"),
    (0.76, k(**{**_SAG, **_LAIN}, dx=-1.4, drop=11.0, lean=60.0, head_rot=40.0, gone=1.0, smoke=0.75, footN=(-3.6, 0.0, 0.0), footF=(4.2, 0.0, 0.0)), "lin"),
    (1.00, k(**{**_SAG, **_LAIN}, dx=-1.4, drop=11.0, lean=60.0, head_rot=40.0, gone=1.0, smoke=1.0, footN=(-3.6, 0.0, 0.0), footF=(4.2, 0.0, 0.0)), "lin"),
]

STILL = lambda t: (-0.3 + 0.25 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [150] * 12, True, STILL),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [85] * 12, True, lambda t: (-0.7, 0.0)),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.08, 0.16, 0.26, 0.35, 0.44, 0.52, 0.60, 0.72, 0.88, 1.0],
                   [80, 70, 80, 100, 110, 150, 40, 60, 110, 110, 100], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.18, 0.26, 0.34, 0.42, 0.52, 0.59, 0.66, 0.76, 0.88, 1.0],
                  [50, 50, 80, 90, 110, 110, 100, 60, 90, 120, 150, 200, 900], False, STILL),
}
