"""Ranger — light and quick. A lean, long-legged skeleton that walks on the balls of its feet, a hood, a cloak
and a scarf that stream behind, a recurve bow in the far hand. Shooting is draw, hold, loose."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, keyed, stagger_keys

BUILD = Build(root_x=40, thigh=6.8, shin=6.8, foot=4.2, hip_dx=1.0, spine=9.0, sh_near=2.8, sh_far=2.4, upper=5.9, fore=5.7, neck=1.0, head_dx=0.7,
              leg_scale=13.6 / 17.2)

L = {
    "a": ("moss", 1), "b": ("moss", 2), "c": ("moss", 3), "d": ("moss", 4), "e": ("moss", 5), "f": ("moss", 6),
    "l": ("leather", 1), "m": ("leather", 2), "n": ("leather", 3), "o": ("leather", 4), "p": ("leather", 5),
    "s": ("skin", 2), "t": ("skin", 4), "u": ("skin", 5),
    "x": ("brass", 2), "y": ("brass", 3), "z": ("brass", 4), "h": ("brass", 5),
    "E": ("ink", 0), "w": ("bone", 6), "r": ("crimson", 3), "R": ("crimson", 5),
}

# Hood up, copper fringe, the face in side three-quarters under the hood's shadow.
HEAD = [
    "....bcdd...",
    "..bbcddee..",
    ".bbccddeee.",
    ".bccddxyeef",
    "abccdxyyttu",
    ".bccdstEuuu",
    ".bccdsttuu.",
    ".abccstttu.",
    "..abccstt..",
    "....bcst...",
]
TORSO = [
    "...cdd...",
    ".bccddee.",
    "bbccddeef",
    ".bbcddee.",
    "..noopp..",
    "..nolpp..",
    "..nnlop..",
    "..nnolp..",
    "..lmhml..",
]
SKIRT = [
    "mnnoopp",
    "mnno.op",
    ".mn...p",
]
QUIVER = [
    ".rR.",
    "rRr.",
    ".mn.",
    ".mno",
    ".mno",
    "..mn",
]


def draw_bow(cel: Cel, grip: Pt, theta: float, draw: float, nock_hand: Pt, arrow: bool) -> None:
    """A recurve: limbs from the grip out to tips that pull back as it is drawn; string and arrow on top."""
    a = math.radians(theta)
    u = (math.cos(a), math.sin(a))
    f = (math.sin(a), -math.cos(a))  # towards the target
    tips = []
    for sgn in (-1, 1):
        mid = (grip[0] + u[0] * sgn * 4.6 + f[0] * 1.2, grip[1] + u[1] * sgn * 4.6 + f[1] * 1.2)
        back = 2.2 + 2.4 * max(0.0, draw)
        tip = (grip[0] + u[0] * sgn * 8.6 - f[0] * back, grip[1] + u[1] * sgn * 8.6 - f[1] * back)
        cel.limb((grip[0] + u[0] * sgn * 1.2, grip[1] + u[1] * sgn * 1.2), mid, 1.9, 1.6, "leather", (3, 5, 6))
        cel.limb(mid, tip, 1.6, 1.1, "leather", (3, 5, 6))
        tips.append(tip)
    if draw > 0.1:
        nock = (nock_hand[0] + 0.5, nock_hand[1])
    else:
        nock = (grip[0] - f[0] * (2.2 + draw * 8.0), grip[1] - f[1] * (2.2 + draw * 8.0))
    for tip in tips:
        cel.line(tip, nock, ("bone", 5))
    if arrow:
        dx, dy = grip[0] - nock[0], grip[1] - nock[1]
        d = math.hypot(dx, dy) or 1.0
        dx, dy = dx / d, dy / d
        end = (nock[0] + dx * 14.0, nock[1] + dy * 14.0)
        cel.line(nock, end, ("leather", 6))
        cel.put(end[0], end[1], ("ink", 8))
        cel.put(end[0] - dx, end[1] - dy, ("ink", 7))
        cel.put(nock[0] + dx * 0.5, nock[1] + dy * 0.5 - 1, ("crimson", 4))
        cel.put(nock[0] + dx * 1.5, nock[1] + dy * 1.5 + 1, ("crimson", 5))
    cel.put(grip[0], grip[1], ("leather", 2))


class Ranger(Character):
    build = BUILD
    head = HEAD

    def chains(self) -> dict[str, ChainSpec]:
        def behind(pts: list[Pt], J: dict[str, Pt]) -> None:
            cx, cy = J["chest"]
            px, py = J["pelvis"]
            lying = abs(J["lean"][0]) > 45.0
            for i in range(1, len(pts)):
                x, y = pts[i]
                if lying:
                    # On the ground the cloth just lies where it falls.
                    pts[i] = (x, min(y, GROUND - 1.5))
                    continue
                t = max(0.0, min(1.0, (y - cy) / max(1.0, py - cy)))
                back = cx - 2.0 + (px - 1.8 - (cx - 2.0)) * t
                pts[i] = (min(x, back), min(y, GROUND - 2.0))

        return {
            "cloak": ChainSpec(Chain(6, 2.4, gravity=0.24, drag=0.14, damp=0.1), lambda J: (J["chest"][0] - 1.6, J["chest"][1] + 2.0), behind),
            "scarf": ChainSpec(Chain(5, 2.0, gravity=0.07, drag=0.2, damp=0.08), lambda J: (J["chest"][0] - 2.0, J["chest"][1] - 0.5), behind, (-0.9, 0.4)),
        }

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        hip, knee, ankle, toe = J["hip" + s], J["knee" + s], J["ankle" + s], J["toe" + s]
        cel.limb(hip, knee, 4.4, 3.7, "ink", (2, 3, 5), far=far)
        cel.limb(knee, ankle, 3.6, 3.0, "ink", (2, 3, 5), far=far)
        # Boot: from below the knee down, with a cuff, then the foot.
        top = (knee[0] + (ankle[0] - knee[0]) * 0.35, knee[1] + (ankle[1] - knee[1]) * 0.35)
        cel.limb(top, ankle, 4.0, 3.4, "leather", (2, 3, 5), far=far)
        cel.limb(ankle, toe, 3.0, 2.0, "leather", (2, 3, 5), far=far)

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 3.5, 3.0, "moss", (2, 3, 5), far=far)
        cel.limb(el, hd, 3.0, 2.6, "leather", (2, 4, 5), far=far)
        for dx, dy, i in ((0, 0, 5), (0, -1, 6), (-1, 0, 4)):
            cel.put(hd[0] + dx, hd[1] + dy, ("skin", i - (1 if far else 0)))

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        cloak = ropes["cloak"]
        widths = [2.0, 3.4, 4.8, 5.8, 6.2, 5.2]
        for i in range(len(cloak) - 1):
            cel.limb(cloak[i], cloak[i + 1], widths[i], widths[i + 1], "moss", (1, 2, 3))
        cx, cy = J["chest"]
        cel.stamp_frame(QUIVER, L, (cx, cy), (-6, -3), lean)
        scarf = ropes["scarf"]
        for i in range(len(scarf) - 1):
            cel.limb(scarf[i], scarf[i + 1], 2.4 - i * 0.2, 2.2 - i * 0.3, "brass", (2, 3, 4))
        self.arm(cel, J, "F", far=True)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        cel.stamp(SKIRT, L, px - 3, py)
        cel.stamp_lean(TORSO, L, (px, py), 4, lean)
        hx, hy = J["head"]
        cel.stamp_turn(self.head, L, (hx, hy + 1), 5, pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0))
        # The bow rides in the far hand until it is knocked loose (`bow_free`), then it is on its own.
        w = pose.get("bow_free", 0.0)
        gx, gy = J["handF"]
        if w > 0.001:
            bx, by = pose["bow_at"]
            gx, gy = gx + (self.build.root_x + bx - gx) * w, gy + (GROUND - by - gy) * w
        draw_bow(cel, (gx, gy), pose["bow"], pose.get("draw", 0.0), J["handN"], pose.get("arrow", 0.0) > 0.5)
        self.arm(cel, J, "N", far=False)
        hx_, hy_ = J["handN"]
        if pose.get("flask", 0.0) > 0.5:
            # Tar Flask: a stoppered clay flask in the throwing hand, its wick alight.
            for dx, dy, t in ((0, -3, ("brass", 7)), (0, -2, ("leather", 5)), (-1, -1, ("leather", 2)), (0, -1, ("leather", 4)), (1, -1, ("leather", 3)),
                              (-1, 0, ("leather", 2)), (0, 0, ("leather", 3)), (1, 0, ("leather", 2)), (0, 1, ("leather", 1))):
                cel.put(hx_ + 1 + dx, hy_ - 1 + dy, t)
        if pose.get("caltrops", 0.0) > 0.5:
            # Caltrops: a fistful of iron points.
            for dx, dy in ((1, 0), (2, -1), (0, 1), (2, 1)):
                cel.put(hx_ + dx, hy_ + dy, ("ink", 7))
            cel.put(hx_ + 1, hy_ - 1, ("ink", 9))
        if pose.get("fistful", 0.0) > 0.5:
            # Rapid Fire: three arrows pulled from the quiver at once, held by the nocks.
            for n, ox in enumerate((-0.42, -0.12, 0.2)):
                for i in range(1, 13):
                    cel.put(hx_ + ox * i + n - 1, hy_ - i, ("bone", 6) if i < 10 else ("crimson", 4 + (n % 2)))
        cel.outline()
        # No streak on the loosing frame (`loosed`): the game flies a real arrow from the bow.


# --------------------------------------------------------------------------------------- animations
READY: Pose = dict(dx=0.0, drop=0.9, lean=3.0, footN=(-4.5, 0.0, 0.0), footF=(5.0, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                   armN=-8.0, elbN=24.0, armF=24.0, elbF=34.0, bow=74.0, draw=0.0, arrow=0.0, loosed=0.0, head_dx=0.0, head_dy=0.0, breath=0.0,
                   head_rot=0.0, bow_free=0.0, bow_at=(0.0, 0.0), flask=0.0, caltrops=0.0, fistful=0.0)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.14))
    return {**READY, "breath": 0.5 + 0.5 * s, "lean": 3.0 - 0.9 * s, "drop": 0.9 + 0.3 * late, "armN": -8.0 + 3.0 * late,
            "elbF": 34.0 + 5.0 * late, "bow": 74.0 + 2.5 * late, "head_dy": -0.3 * late}


SPRINT = Gait(stride=1.05, give=1.0, lift=1.05, toe=1.1, run=True, air=2.2)


def run_pose(ph: float) -> Pose:
    c, s2 = math.cos(math.tau * ph), math.cos(2 * math.tau * (ph - 0.08))
    p: Pose = gait_legs(SPRINT, ph)
    # The free arm pumps with a bent elbow; the bow hand stays low and steady.
    p.update(lean=6.0 + 1.5 * s2, hip_rot=-0.8 * c, sh_rot=1.1 * c,
             armN=-4.0 - 38.0 * c, elbN=74.0 + 16.0 * (1 - c) / 2, armF=26.0 + 10.0 * c, elbF=48.0 + 5.0 * s2,
             bow=70.0 + 6.0 * math.cos(math.tau * (ph - 0.12)), draw=0.0, arrow=0.0, loosed=0.0,
             head_dx=0.0, head_dy=0.5 * math.cos(2 * math.tau * (ph - 0.2)), breath=0.0)
    return p


def k(**over: object) -> Pose:
    return {**READY, **over}


SHOOT_KEYS = [
    (0.00, k(), "lin"),
    # Raise the bow, bring the string hand to it.
    (0.16, k(lean=5.0, armF=76.0, elbF=10.0, bow=90.0, armN=40.0, elbN=92.0, draw=0.04), "out"),
    (0.30, k(lean=4.0, armF=82.0, elbF=6.0, bow=90.0, armN=58.0, elbN=64.0, draw=0.12, arrow=1.0), "io"),
    # Draw: the elbow travels back, the chest opens, the weight settles on the back foot.
    (0.56, k(dx=-1.2, drop=1.3, lean=-3.0, sh_rot=1.2, armF=86.0, elbF=3.0, bow=90.0, armN=-100.0, elbN=190.0, draw=1.0, arrow=1.0), "out"),
    (0.70, k(dx=-1.4, drop=1.4, lean=-3.6, sh_rot=1.3, armF=86.0, elbF=3.0, bow=90.0, armN=-102.0, elbN=191.0, draw=1.0, arrow=1.0), "io"),
    # Loose: the string snaps past straight, the hand flicks back, the bow tips forward.
    (0.74, k(dx=-0.8, drop=1.1, lean=-1.0, sh_rot=0.8, armF=84.0, elbF=3.0, bow=101.0, armN=-106.0, elbN=262.0, draw=-0.18, loosed=1.0), "lin"),
    (0.84, k(dx=-0.4, drop=1.0, lean=2.0, armF=80.0, elbF=6.0, bow=96.0, armN=-84.0, elbN=210.0, draw=0.05), "out"),
    (1.00, k(), "io"),
]

# Volley: the same draw aimed at the sky.
VOLLEY_KEYS = [
    (0.00, k(), "lin"),
    (0.16, k(lean=0.0, armF=110.0, elbF=10.0, bow=62.0, armN=30.0, elbN=96.0, draw=0.04), "out"),
    (0.30, k(lean=-3.0, armF=124.0, elbF=6.0, bow=56.0, armN=50.0, elbN=80.0, draw=0.12, arrow=1.0), "io"),
    (0.56, k(dx=-1.4, drop=1.6, lean=-9.0, sh_rot=1.2, armF=130.0, elbF=4.0, bow=53.0, armN=-70.0, elbN=150.0, draw=1.0, arrow=1.0), "out"),
    (0.70, k(dx=-1.6, drop=1.7, lean=-10.0, sh_rot=1.3, armF=130.0, elbF=4.0, bow=53.0, armN=-72.0, elbN=151.0, draw=1.0, arrow=1.0), "io"),
    (0.74, k(dx=-1.0, drop=1.3, lean=-6.0, sh_rot=0.8, armF=128.0, elbF=4.0, bow=64.0, armN=-84.0, elbN=230.0, draw=-0.18, loosed=1.0), "lin"),
    (0.84, k(dx=-0.5, drop=1.0, lean=-2.0, armF=110.0, elbF=8.0, bow=60.0, armN=-60.0, elbN=190.0, draw=0.05), "out"),
    (1.00, k(), "io"),
]

# Quick shot: two snap shots off a half draw.
half = dict(sh_rot=0.8, lean=1.0, armF=82.0, elbF=6.0, bow=90.0, armN=-70.0, elbN=185.0, draw=0.7, arrow=1.0)
snap = dict(sh_rot=0.5, lean=2.0, armF=80.0, elbF=6.0, bow=98.0, armN=-74.0, elbN=230.0, draw=-0.15, loosed=1.0)
nock = dict(lean=3.0, armF=80.0, elbF=8.0, bow=90.0, armN=52.0, elbN=72.0, draw=0.1, arrow=1.0)
QUICK_KEYS = [
    (0.00, k(), "lin"),
    (0.12, k(**nock), "out"),
    (0.24, k(**half), "out"),
    (0.28, k(**snap), "lin"),
    (0.40, k(**nock), "io"),
    (0.52, k(**half), "out"),
    (0.56, k(**snap), "lin"),
    (0.70, k(lean=3.0, armF=76.0, elbF=8.0, bow=94.0, armN=-60.0, elbN=200.0, draw=0.05), "out"),
    (1.00, k(), "io"),
]

# Kneeling shot (a second basic attack): he drops onto the back knee as he draws, looses level, and rises.
_KNEE = dict(drop=6.4, footN=(-9.5, 2.4, -100.0), footF=(4.8, 0.0, 0.0))
KNEEL_KEYS = [
    (0.00, k(), "lin"),
    (0.18, k(drop=3.6, lean=7.0, armF=70.0, elbF=14.0, bow=90.0, armN=38.0, elbN=90.0, draw=0.04, footN=(-7.0, 0.6, -30.0)), "out"),
    (0.32, k(lean=5.0, armF=84.0, elbF=6.0, bow=90.0, armN=56.0, elbN=64.0, draw=0.12, arrow=1.0, **_KNEE), "io"),
    (0.56, k(dx=-0.6, lean=-1.0, sh_rot=1.2, armF=88.0, elbF=3.0, bow=90.0, armN=-100.0, elbN=190.0, draw=1.0, arrow=1.0, **_KNEE), "out"),
    (0.70, k(dx=-0.8, lean=-1.6, sh_rot=1.3, armF=88.0, elbF=3.0, bow=90.0, armN=-102.0, elbN=191.0, draw=1.0, arrow=1.0, **_KNEE), "io"),
    (0.74, k(dx=-0.3, lean=1.0, sh_rot=0.8, armF=86.0, elbF=3.0, bow=101.0, armN=-106.0, elbN=262.0, draw=-0.18, loosed=1.0, **_KNEE), "lin"),
    (0.86, k(lean=4.0, armF=78.0, elbF=8.0, bow=96.0, armN=-80.0, elbN=206.0, draw=0.05, **{**_KNEE, "drop": 5.6}), "out"),
    (1.00, k(), "io"),
]

# Skipping shot (a third basic attack): he springs back off the front foot drawing in the air, lands on the back
# foot and looses, then steps back up to his place.
SKIP_KEYS = [
    (0.00, k(), "lin"),
    (0.14, k(dx=0.8, drop=2.6, lean=8.0, armF=60.0, elbF=20.0, bow=88.0, armN=30.0, elbN=96.0, draw=0.04), "out"),
    (0.28, k(dx=-2.6, drop=-3.4, lean=-3.0, armF=80.0, elbF=6.0, bow=90.0, armN=54.0, elbN=66.0, draw=0.14, arrow=1.0,
             footN=(-5.0, 4.4, -30.0), footF=(3.0, 5.6, 20.0)), "out"),
    (0.46, k(dx=-5.2, drop=-2.0, lean=-7.0, sh_rot=1.2, armF=86.0, elbF=3.0, bow=90.0, armN=-96.0, elbN=186.0, draw=0.9, arrow=1.0,
             footN=(-7.5, 2.4, -16.0), footF=(4.0, 4.0, 14.0)), "io"),
    (0.62, k(dx=-6.0, drop=2.2, lean=-5.0, sh_rot=1.3, armF=86.0, elbF=3.0, bow=90.0, armN=-102.0, elbN=191.0, draw=1.0, arrow=1.0,
             footN=(-6.0, 0.0, 0.0), footF=(6.0, 0.0, 0.0)), "out"),
    (0.70, k(dx=-6.0, drop=2.4, lean=-5.4, sh_rot=1.3, armF=86.0, elbF=3.0, bow=90.0, armN=-102.0, elbN=191.0, draw=1.0, arrow=1.0,
             footN=(-6.0, 0.0, 0.0), footF=(6.0, 0.0, 0.0)), "io"),
    (0.74, k(dx=-5.6, drop=1.8, lean=-2.0, sh_rot=0.8, armF=84.0, elbF=3.0, bow=101.0, armN=-106.0, elbN=262.0, draw=-0.18, loosed=1.0,
             footN=(-6.0, 0.0, 0.0), footF=(6.0, 0.0, 0.0)), "lin"),
    (0.86, k(dx=-3.4, drop=1.0, lean=3.0, armF=70.0, elbF=12.0, bow=92.0, armN=-70.0, elbN=200.0, draw=0.05, footF=(5.0, 1.6, 8.0)), "out"),
    (1.00, k(), "io"),
]

# Aimed Shot: he sets his feet wide, raises the bow high and brings it down onto the mark in one long, slow draw;
# the hold is the longest of any shot he makes.
AIMED_KEYS = [
    (0.00, k(), "lin"),
    (0.14, k(dx=-0.6, drop=1.6, lean=-2.0, armF=128.0, elbF=8.0, bow=58.0, armN=44.0, elbN=96.0, draw=0.04, footN=(-6.5, 0.0, 0.0)), "out"),
    (0.28, k(dx=-1.0, drop=2.0, lean=-5.0, armF=134.0, elbF=5.0, bow=54.0, armN=62.0, elbN=70.0, draw=0.14, arrow=1.0, footN=(-7.5, 0.0, 0.0)), "io"),
    (0.52, k(dx=-1.8, drop=2.6, lean=-7.0, sh_rot=1.4, armF=92.0, elbF=3.0, bow=88.0, armN=-104.0, elbN=192.0, draw=1.0, arrow=1.0,
             footN=(-8.0, 0.0, 0.0), footF=(5.6, 0.0, 0.0), head_dx=0.4), "out"),
    (0.72, k(dx=-2.0, drop=2.8, lean=-7.6, sh_rot=1.5, armF=90.0, elbF=3.0, bow=90.0, armN=-106.0, elbN=193.0, draw=1.0, arrow=1.0,
             footN=(-8.0, 0.0, 0.0), footF=(5.6, 0.0, 0.0), head_dx=0.5), "io"),
    (0.76, k(dx=-3.0, drop=2.2, lean=-10.0, sh_rot=0.8, armF=88.0, elbF=3.0, bow=104.0, armN=-112.0, elbN=268.0, draw=-0.2, loosed=1.0,
             footN=(-8.5, 0.0, 0.0), footF=(5.0, 0.6, 6.0)), "lin"),
    (0.88, k(dx=-1.4, drop=1.4, lean=-2.0, armF=80.0, elbF=8.0, bow=97.0, armN=-88.0, elbN=214.0, draw=0.05, footN=(-6.0, 0.0, 0.0)), "out"),
    (1.00, k(), "io"),
]

# Tar Flask: the flask comes out in the free hand, goes back behind his head and is lobbed high and long.
LOB_KEYS = [
    (0.00, k(), "lin"),
    (0.16, k(drop=1.6, lean=2.0, armN=20.0, elbN=80.0, flask=1.0), "out"),
    (0.36, k(dx=-1.6, drop=2.4, lean=-10.0, sh_rot=1.2, armN=-150.0, elbN=96.0, flask=1.0, armF=60.0, elbF=20.0, bow=80.0, footF=(5.5, 1.0, 8.0)), "io"),
    (0.46, k(dx=-1.8, drop=2.6, lean=-11.0, sh_rot=1.3, armN=-156.0, elbN=100.0, flask=1.0, armF=62.0, elbF=20.0, bow=80.0, footF=(5.8, 1.2, 8.0)), "io"),
    (0.52, k(dx=2.2, drop=1.6, lean=6.0, sh_rot=-1.6, armN=112.0, elbN=6.0, armF=30.0, elbF=40.0, bow=70.0, footF=(8.0, 0.0, 0.0), footN=(-5.0, 0.0, -18.0)), "in"),
    (0.66, k(dx=2.8, drop=2.2, lean=13.0, sh_rot=-1.2, armN=70.0, elbN=20.0, armF=22.0, elbF=44.0, bow=68.0, footF=(8.0, 0.0, 0.0), footN=(-5.0, 0.0, -22.0)), "out"),
    (0.84, k(dx=1.2, drop=1.4, lean=6.0, armN=20.0, elbN=30.0, footF=(6.4, 0.8, 4.0)), "io"),
    (1.00, k(), "io"),
]

# Caltrops: he crouches and sows them underhand in one low sweep across the ground ahead.
SOW_KEYS = [
    (0.00, k(), "lin"),
    (0.18, k(drop=2.4, lean=6.0, armN=-30.0, elbN=40.0, caltrops=1.0), "out"),
    (0.36, k(dx=-1.0, drop=4.6, lean=12.0, sh_rot=1.0, armN=-70.0, elbN=30.0, caltrops=1.0, armF=40.0, elbF=40.0, bow=84.0), "io"),
    (0.44, k(dx=-1.2, drop=4.8, lean=13.0, sh_rot=1.1, armN=-74.0, elbN=28.0, caltrops=1.0, armF=42.0, elbF=40.0, bow=84.0), "io"),
    (0.50, k(dx=2.0, drop=5.0, lean=20.0, sh_rot=-1.0, armN=62.0, elbN=8.0, armF=24.0, elbF=50.0, bow=78.0, footF=(8.0, 0.0, 0.0), footN=(-5.5, 0.0, -20.0)), "in"),
    (0.64, k(dx=2.4, drop=4.6, lean=18.0, sh_rot=-1.2, armN=96.0, elbN=4.0, armF=22.0, elbF=52.0, bow=76.0, footF=(8.0, 0.0, 0.0), footN=(-5.5, 0.0, -22.0)), "out"),
    (0.84, k(dx=1.0, drop=2.0, lean=7.0, armN=30.0, elbN=24.0, footF=(6.2, 0.8, 4.0)), "io"),
    (1.00, k(), "io"),
]

# Mark of the Hunter: he levels his arm at the quarry and holds it there.
POINT_KEYS = [
    (0.00, k(), "lin"),
    (0.20, k(drop=1.8, lean=5.0, armN=30.0, elbN=70.0, head_dx=0.3), "out"),
    (0.34, k(dx=1.0, drop=1.4, lean=7.0, sh_rot=-1.2, armN=92.0, elbN=4.0, armF=10.0, elbF=44.0, bow=64.0, head_dx=0.6, footF=(6.4, 0.0, 0.0)), "out3"),
    (0.74, k(dx=1.2, drop=1.5, lean=7.6, sh_rot=-1.3, armN=94.0, elbN=2.0, armF=8.0, elbF=44.0, bow=63.0, head_dx=0.6, footF=(6.4, 0.0, 0.0)), "lin"),
    (0.88, k(dx=0.4, drop=1.2, lean=4.0, armN=40.0, elbN=40.0), "io"),
    (1.00, k(), "io"),
]

# Hit: light on his feet, he is knocked furthest. The free arm flies up for balance, the bow arm is flung back.
# Rapid Fire: his hand goes over the shoulder to the quiver and comes back with a fistful of arrows, which he
# snaps down to the string — from now on he does not reach again.
_QUIVER = dict(armN=-152.0, elbN=92.0)
HASTE_KEYS = [
    (0.00, k(), "lin"),
    (0.20, k(drop=1.4, lean=1.0, armF=50.0, elbF=24.0, bow=84.0, head_dx=-0.3, **_QUIVER), "out"),
    (0.34, k(drop=1.6, lean=0.0, armF=52.0, elbF=22.0, bow=84.0, head_dx=-0.4, armN=-156.0, elbN=96.0), "io"),
    (0.42, k(drop=0.2, lean=-4.0, armF=70.0, elbF=12.0, bow=88.0, armN=-176.0, elbN=40.0, fistful=1.0, head_dy=-0.5), "in"),
    (0.60, k(drop=0.0, lean=-5.0, armF=74.0, elbF=10.0, bow=88.0, armN=-182.0, elbN=34.0, fistful=1.0, head_dy=-0.6), "lin"),
    (0.72, k(drop=1.4, lean=4.0, armF=82.0, elbF=6.0, bow=90.0, armN=56.0, elbN=66.0, fistful=1.0, draw=0.12), "in"),
    (0.86, k(drop=1.2, lean=4.0, armF=80.0, elbF=8.0, bow=90.0, armN=52.0, elbN=70.0, draw=0.12, arrow=1.0), "io"),
    (1.00, k(), "io"),
]

HURT_KEYS = stagger_keys(READY, push=5.0, bend=15.0, buckle=2.8, whip=24.0, over={
    "impact": dict(armF=40.0, elbF=30.0, armN=-20.0, elbN=30.0, bow=66.0),
    "reel": dict(armF=62.0, elbF=18.0, armN=-44.0, elbN=44.0, bow=50.0),
    "catch": dict(armF=8.0, elbF=46.0, armN=-12.0, elbN=30.0, bow=82.0),
})

# Defeat: the blow lifts him off his feet and throws him onto his back; the bow spins out of his hand. He
# ends flat, one knee up, an arm thrown past his head.
_BACK = dict(dx=-13.0, drop=15.3, lean=-90.0, armN=-276.0, elbN=12.0, armF=95.0, elbF=-20.0, footN=(8.0, 0.5, 20.0), footF=(13.5, 1.0, 70.0),
             bow=-180.0, bow_free=1.0, bow_at=(15.0, 1.6))
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.08, k(dx=-3.0, drop=1.2, lean=-16.0, head_dx=-1.4, head_dy=-0.4, head_rot=-12.0, armN=-40.0, elbN=30.0, armF=60.0, elbF=10.0, bow=40.0,
             footF=(4.0, 2.5, 20.0)), "out3"),
    (0.20, k(dx=-7.0, drop=-0.5, lean=-35.0, armN=-70.0, elbN=20.0, armF=100.0, elbF=10.0, bow=10.0, bow_free=1.0, bow_at=(8.0, 27.0),
             footN=(-2.0, 3.0, 10.0), footF=(5.0, 6.0, 30.0)), "out"),
    (0.34, k(dx=-11.0, drop=8.0, lean=-70.0, armN=-120.0, elbN=10.0, armF=150.0, elbF=10.0, bow=-70.0, bow_free=1.0, bow_at=(12.0, 21.0),
             footN=(6.0, 6.0, 40.0), footF=(10.0, 10.0, 50.0)), "in"),
    (0.42, k(**{**_BACK, "armF": 130.0, "elbF": 0.0, "footF": (11.5, 5.0, 60.0), "bow": -130.0, "bow_at": (13.5, 9.0)}), "lin"),
    (0.50, k(**{**_BACK, "drop": 14.0, "lean": -83.0, "armF": 112.0, "footF": (12.5, 6.0, 60.0), "footN": (8.0, 2.0, 20.0), "head_dy": -0.5, "bow": -176.0, "bow_at": (14.5, 1.6)}), "out"),
    (0.62, k(**{**_BACK, "bow": -170.0, "bow_at": (15.0, 3.4)}), "in"),
    (0.74, k(**_BACK), "in"),
    (1.00, k(**_BACK), "lin"),
]

STILL = lambda t: (-0.2, 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [170] * 12, True, lambda t: (-0.28 + 0.2 * math.sin(math.tau * t), 0.0)),
    "run": Anim("run", run_pose, [i / 12 for i in range(12)], [59] * 12, True, lambda t: (-2.0, 0.0)),
    "attack": Anim("attack", keyed(SHOOT_KEYS), [0.0, 0.08, 0.16, 0.23, 0.30, 0.39, 0.48, 0.56, 0.63, 0.70, 0.74, 0.79, 0.84, 0.92, 1.0],
                   [90, 70, 70, 70, 80, 80, 90, 110, 140, 160, 50, 60, 80, 90, 120], False, STILL),
    "volley": Anim("volley", keyed(VOLLEY_KEYS), [0.0, 0.08, 0.16, 0.23, 0.30, 0.39, 0.48, 0.56, 0.63, 0.70, 0.74, 0.79, 0.84, 0.92, 1.0],
                   [90, 70, 70, 70, 80, 80, 90, 110, 140, 160, 50, 60, 80, 90, 120], False, STILL),
    "quick": Anim("quick", keyed(QUICK_KEYS), [0.0, 0.06, 0.12, 0.18, 0.24, 0.28, 0.34, 0.40, 0.46, 0.52, 0.56, 0.63, 0.70, 0.85, 1.0],
                  [60, 50, 50, 50, 60, 45, 50, 50, 50, 60, 45, 60, 70, 80, 100], False, STILL),
    "attack2": Anim("attack2", keyed(KNEEL_KEYS), [0.0, 0.09, 0.18, 0.25, 0.32, 0.40, 0.48, 0.56, 0.63, 0.70, 0.74, 0.80, 0.86, 0.93, 1.0],
                    [80, 60, 70, 60, 70, 70, 80, 100, 120, 150, 50, 60, 90, 90, 110], False, STILL),
    "attack3": Anim("attack3", keyed(SKIP_KEYS), [0.0, 0.07, 0.14, 0.21, 0.28, 0.37, 0.46, 0.54, 0.62, 0.70, 0.74, 0.80, 0.86, 0.93, 1.0],
                    [80, 60, 70, 60, 60, 70, 80, 90, 120, 150, 50, 60, 90, 90, 110], False, STILL),
    "aimed": Anim("aimed", keyed(AIMED_KEYS), [0.0, 0.07, 0.14, 0.21, 0.28, 0.36, 0.44, 0.52, 0.62, 0.72, 0.76, 0.82, 0.88, 0.94, 1.0],
                  [80, 70, 80, 70, 80, 90, 100, 120, 150, 180, 50, 70, 90, 90, 120], False, STILL),
    "lob": Anim("lob", keyed(LOB_KEYS), [0.0, 0.08, 0.16, 0.26, 0.36, 0.46, 0.52, 0.59, 0.66, 0.84, 1.0],
                [60, 50, 60, 70, 90, 110, 40, 60, 100, 100, 110], False, STILL),
    "sow": Anim("sow", keyed(SOW_KEYS), [0.0, 0.09, 0.18, 0.27, 0.36, 0.44, 0.50, 0.57, 0.64, 0.84, 1.0],
                [60, 50, 60, 70, 90, 110, 40, 60, 100, 100, 110], False, STILL),
    "point": Anim("point", keyed(POINT_KEYS), [0.0, 0.10, 0.20, 0.27, 0.34, 0.44, 0.54, 0.64, 0.74, 0.88, 1.0],
                  [70, 60, 80, 110, 40, 90, 100, 100, 110, 90, 100], False, STILL),
    "haste": Anim("haste", keyed(HASTE_KEYS), [0.0, 0.10, 0.20, 0.34, 0.42, 0.51, 0.60, 0.72, 0.79, 0.86, 1.0],
                  [70, 70, 90, 120, 40, 80, 100, 50, 70, 90, 100], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.04, 0.08, 0.14, 0.20, 0.27, 0.34, 0.38, 0.42, 0.46, 0.50, 0.56, 0.62, 0.74, 1.0],
                  [50, 40, 70, 60, 70, 60, 60, 45, 50, 60, 80, 80, 90, 140, 1200], False, STILL),
}
