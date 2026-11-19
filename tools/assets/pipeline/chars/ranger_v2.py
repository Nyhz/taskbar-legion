"""Ranger, re-imagined (2026-11-19; user: «los 3 pjs principales deben tener una calidad radicalmente superior a los
otros modelos», references: chibi pixel rangers). A CHIBI hero, ~48 px: a big head a third of the figure with an
expressive face — large eyes with a catch-light, brows, a fringe of chestnut hair under a deep green hood —, a short
sturdy body in a green tunic with a crossed leather strap and a gold-buckled belt, bracers, chunky boots, a short
cape, a quiver of grey-fletched arrows on the back and a big recurve bow. Bold dark outline; five tones per material.

Drawn facing right like every figure. Lab only until approved (chars/ranger.py is the one the game uses).
"""
from __future__ import annotations

import math

from ..rig import GROUND, Anim, Build, Cel, Chain, ChainSpec, Character, Pose, Pt, keyed

BUILD = Build(root_x=40, thigh=7.4, shin=7.0, foot=3.8, hip_dx=1.6, spine=13.0, sh_near=3.6, sh_far=3.4, upper=4.6, fore=4.4, neck=0.0,
              head_dx=0.6, leg_scale=0.72, min_pelvis=5.0)

L = {
    # the hood and tunic: moss, dark to light
    "a": ("moss", 1), "b": ("moss", 2), "c": ("moss", 3), "d": ("moss", 4), "e": ("moss", 5), "f": ("moss", 6), "g": ("moss", 7),
    # hair: chestnut
    "h": ("leather", 2), "i": ("leather", 4), "j": ("leather", 5), "k": ("leather", 6),
    # skin
    "s": ("skin", 3), "t": ("skin", 5), "u": ("skin", 6), "v": ("skin", 7), "p": ("crimson", 7), "m": ("skin", 2),
    # eyes
    "E": ("ink", 1), "F": ("ink", 3), "w": ("light", 0),
    # leather and gold
    "l": ("leather", 1), "n": ("leather", 3), "o": ("leather", 4), "q": ("leather", 5),
    "x": ("brass", 3), "y": ("brass", 5), "z": ("brass", 7),
}

# The head, 19 × 19: the hood comes to a soft point behind, frames the face on the right; the fringe falls over
# the brow; two big eyes (the near one larger) with a white catch-light; a blush and a small mouth.
HEAD = [
    "......aabbbbaa.....",
    "....aabcccccbba....",
    "...abcccdddddcba...",
    "..abccdddeeeedcba..",
    ".abccddeeeeeeeedcb.",
    ".abcdddeeffffffedcb",
    "abccddhiijjjjjjjfdb",
    "abccdhiijjkkjjkjjfb",
    "abcdhiijuujjujjujfb",
    "abcdhijtuuuuuuuuufb",
    "abcdhjtEEtuuuuEEufb",
    "abcdhitEwtuuuuEwufb",
    "abcdhitEEtuuuuEEufb",
    "abccdsppttuuuuppufb",
    "abccdsttttuummuuufb",
    ".abccdssttttttuufb.",
    "..abccddssssssddcb.",
    "...aabbccddddddcba.",
    ".....aabbbbbbbaa...",
]
HEAD_PC = 9.0  # the column of the neck

# The body under the hood's shoulder mantle: a green tunic, the strap across it, the belt and its gold buckle,
# the tunic's skirt split at the front.
TORSO = [
    "..abcddddeef..",
    "..abcddddeef..",
    ".abccddeeeffg.",
    ".abccddeeeffg.",
    ".abcdnoddeeff.",
    ".abccdnoddeff.",
    ".abccddnodeff.",
    ".abccdddnoeff.",
    ".llnooxyzynol.",
    ".abccddddeeff.",
    "..abccdddeef..",
    "..abcd..deef..",
]
TORSO_PC = 6.0

QUIVER = [
    ".w...w.",
    "wFw.wFw",
    ".Fw.wF.",
    "..F.F..",
    "..n.n..",
    "..n.nn.",
    ".lnoqq.",
    ".lnoqq.",
    ".lxyzq.",
    ".lnoqq.",
    ".lnoqq.",
    ".lnoqq.",
    "..lnq..",
]

BOOT = [
    "lnoq.",
    "lnoqq",
    "lnooqq",
    "llnnoqq",
]

SHADE5 = (-0.62, -0.2, 0.28, 0.68)


def limb5(cel: Cel, a: Pt, b: Pt, w0: float, w1: float, ramp: str, tones: tuple[int, int, int, int, int], far: bool = False) -> None:
    """A tapered stroke shaded in FIVE bands across its width (deep shadow … highlight), lit from the strip's light."""
    from ..rig import LIGHT

    t5 = tuple(max(0, t - 1) for t in tones) if far else tones
    ax, ay = a
    bx, by = b
    dx, dy = bx - ax, by - ay
    L2 = dx * dx + dy * dy or 1e-9
    Ln = math.sqrt(L2)
    nx, ny = -dy / Ln, dx / Ln
    lit = 1.0 if (nx * LIGHT[0] + ny * LIGHT[1]) > 0 else -1.0
    r_max = max(w0, w1) / 2 + 1
    for j in range(int(math.floor(min(ay, by) - r_max)), int(math.ceil(max(ay, by) + r_max)) + 1):
        for i in range(int(math.floor(min(ax, bx) - r_max)), int(math.ceil(max(ax, bx) + r_max)) + 1):
            cx, cy = i + 0.5, j + 0.5
            t = max(0.0, min(1.0, ((cx - ax) * dx + (cy - ay) * dy) / L2))
            r = (w0 + (w1 - w0) * t) / 2
            if math.hypot(cx - (ax + t * dx), cy - (ay + t * dy)) < r:
                s = ((cx - ax) * nx + (cy - ay) * ny) / r * lit
                band = sum(1 for th in SHADE5 if s > th)
                cel.put(i, j, (ramp, t5[band]))


def draw_bow(cel: Cel, grip: Pt, theta: float, draw: float, nock_hand: Pt, arrow: bool) -> None:
    """A big recurve: thick limbs with a lit face and a dark back, horn tips, a wrapped grip; string and arrow."""
    a = math.radians(theta)
    u = (math.cos(a), math.sin(a))
    f = (math.sin(a), -math.cos(a))
    tips = []
    for sgn in (-1, 1):
        mid = (grip[0] + u[0] * sgn * 7.0 + f[0] * 2.0, grip[1] + u[1] * sgn * 7.0 + f[1] * 2.0)
        back = 2.6 + 3.0 * max(0.0, draw)
        tip = (grip[0] + u[0] * sgn * 13.0 - f[0] * back, grip[1] + u[1] * sgn * 13.0 - f[1] * back)
        hook = (tip[0] + f[0] * 1.6, tip[1] + f[1] * 1.6)
        limb5(cel, (grip[0] + u[0] * sgn * 1.5, grip[1] + u[1] * sgn * 1.5), mid, 3.0, 2.6, "leather", (1, 2, 4, 5, 6))
        limb5(cel, mid, tip, 2.6, 1.8, "leather", (1, 2, 4, 5, 6))
        cel.line(tip, hook, ("bone", 6))
        tips.append(tip)
    if draw > 0.1:
        nock = (nock_hand[0] + 0.5, nock_hand[1])
    else:
        nock = (grip[0] - f[0] * (2.6 + draw * 10.0), grip[1] - f[1] * (2.6 + draw * 10.0))
    for tip in tips:
        cel.line(tip, nock, ("bone", 5))
    if arrow:
        dx, dy = grip[0] - nock[0], grip[1] - nock[1]
        d = math.hypot(dx, dy) or 1.0
        dx, dy = dx / d, dy / d
        end = (nock[0] + dx * 17.0, nock[1] + dy * 17.0)
        cel.line(nock, end, ("leather", 6))
        for k, tone in ((0, ("ink", 9)), (1, ("ink", 7)), (2, ("ink", 7))):
            cel.put(end[0] - dx * k, end[1] - dy * k, tone)
        cel.put(end[0] - dx * 1 - dy, end[1] - dy * 1 + dx, ("ink", 6))
        cel.put(end[0] - dx * 1 + dy, end[1] - dy * 1 - dx, ("ink", 6))
        for s_ in (0.5, 1.5, 2.5):
            cel.put(nock[0] + dx * s_ - dy, nock[1] + dy * s_ + dx, ("bone", 7))
            cel.put(nock[0] + dx * s_ + dy, nock[1] + dy * s_ - dx, ("ink", 7))
    for k in (-2, -1, 0, 1, 2):
        cel.put(grip[0] + u[0] * k, grip[1] + u[1] * k, ("crimson", 4) if k % 2 == 0 else ("crimson", 3))


class RangerV2(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        return super().joints(pose)

    def chains(self) -> dict[str, ChainSpec]:
        def behind(pts: list[Pt], J: dict[str, Pt]) -> None:
            cx, cy = J["chest"]
            for i in range(1, len(pts)):
                x, y = pts[i]
                pts[i] = (min(x, cx - 2.0), min(y, GROUND - 3.0))

        return {"cape": ChainSpec(Chain(4, 3.0, gravity=0.26, drag=0.14, damp=0.1), lambda J: (J["chest"][0] - 3.0, J["chest"][1] + 1.0), behind)}

    def hand(self, cel: Cel, at: Pt, far: bool) -> None:
        x, y = at
        k = 1 if far else 0
        for dx, dy, i in ((-1, -1, 5), (0, -1, 6), (-1, 0, 5), (0, 0, 6), (1, 0, 5), (-1, 1, 4), (0, 1, 5)):
            cel.put(x + dx, y + dy, ("skin", i - k))

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        hip, knee, ankle = J["hip" + s], J["knee" + s], J["ankle" + s]
        limb5(cel, hip, knee, 5.2, 4.6, "ink", (2, 3, 4, 5, 6), far=far)
        limb5(cel, knee, ankle, 4.6, 4.4, "leather", (1, 2, 4, 5, 6), far=far)
        boot = BOOT if not far else [r.replace("q", "o") for r in BOOT]
        cel.stamp(boot, L, ankle[0] - 2, ankle[1] - 2)

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        limb5(cel, sh, el, 4.6, 4.0, "moss", (1, 2, 4, 5, 6), far=far)
        limb5(cel, el, hd, 4.0, 3.6, "leather", (1, 2, 4, 5, 6), far=far)
        self.hand(cel, hd, far)

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        cape = ropes["cape"]
        widths = [6.0, 7.4, 8.2, 7.6, 6.4]
        for i in range(len(cape) - 1):
            limb5(cel, cape[i], cape[i + 1], widths[i], widths[i + 1], "moss", (0, 1, 1, 2, 4))
        cx, cy = J["chest"]
        cel.stamp_frame(QUIVER, L, (cx, cy), (-11, -13), lean)
        self.arm(cel, J, "F", far=True)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        cel.stamp_lean(TORSO, L, (px, py + 2), TORSO_PC, lean)
        hx, hy = J["head"]
        cel.stamp_turn(HEAD, L, (hx, hy + 3), HEAD_PC, pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0))
        gx, gy = J["handF"]
        draw_bow(cel, (gx, gy), pose["bow"], pose.get("draw", 0.0), J["handN"], pose.get("arrow", 0.0) > 0.5)
        self.arm(cel, J, "N", far=False)
        cel.outline()


READY: Pose = dict(dx=0.0, drop=0.6, lean=2.0, footN=(-4.0, 0.0, 0.0), footF=(4.4, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                   armN=-10.0, elbN=30.0, armF=52.0, elbF=-14.0, bow=96.0, draw=0.0, arrow=0.0, head_dx=0.0, head_dy=0.0, breath=0.0, head_rot=0.0)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.14))
    return {**READY, "breath": 0.4 + 0.4 * s, "lean": 2.0 - 0.8 * s, "drop": 0.6 + 0.4 * late, "armN": -10.0 + 3.0 * late,
            "elbF": -14.0 + 4.0 * late, "bow": 96.0 + 2.0 * late, "head_dy": -0.4 * late}


def k(**over: object) -> Pose:
    return {**READY, **over}


# The shot: the bow comes up level, the string hand reaches it, a long draw to the cheek with the weight
# settling back, a hold, the loose (the string snaps past straight, the hand flicks back), and the recovery.
SHOOT_KEYS = [
    (0.00, k(), "lin"),
    (0.14, k(lean=4.0, drop=1.0, armF=78.0, elbF=8.0, bow=90.0, armN=30.0, elbN=96.0, draw=0.04, head_dy=0.3), "out"),
    (0.28, k(lean=3.0, drop=1.2, armF=86.0, elbF=4.0, bow=90.0, armN=56.0, elbN=70.0, draw=0.14, arrow=1.0), "io"),
    (0.54, k(dx=-1.2, drop=1.8, lean=-4.0, sh_rot=1.2, armF=90.0, elbF=2.0, bow=90.0, armN=-96.0, elbN=200.0, draw=1.0, arrow=1.0, head_dy=0.4), "out"),
    (0.70, k(dx=-1.4, drop=1.9, lean=-4.6, sh_rot=1.3, armF=90.0, elbF=2.0, bow=90.0, armN=-98.0, elbN=201.0, draw=1.0, arrow=1.0, head_dy=0.5), "io"),
    (0.74, k(dx=-0.6, drop=1.2, lean=-1.0, sh_rot=0.8, armF=88.0, elbF=2.0, bow=102.0, armN=-110.0, elbN=262.0, draw=-0.2), "lin"),
    (0.84, k(dx=-0.2, drop=0.9, lean=2.0, armF=80.0, elbF=6.0, bow=97.0, armN=-80.0, elbN=214.0, draw=0.05), "out"),
    (1.00, k(), "io"),
]

STILL = lambda t: (-0.2, 0.0)  # noqa: E731

ANIMS = {
    "attack": Anim("attack", keyed(SHOOT_KEYS), [0.0, 0.07, 0.14, 0.21, 0.28, 0.35, 0.42, 0.48, 0.54, 0.60, 0.66, 0.70, 0.74, 0.79, 0.84, 0.90, 0.95, 1.0],
                   [80, 60, 60, 60, 70, 70, 70, 80, 90, 110, 130, 150, 45, 55, 70, 80, 90, 110], False, STILL),
    "idle": Anim("idle", idle_pose, [i / 16 for i in range(16)], [130] * 16, True, lambda t: (-0.28 + 0.2 * math.sin(math.tau * t), 0.0)),
}
