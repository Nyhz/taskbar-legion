"""Antlered Warden — world 2, stage boss. What keeps the old forest: a gaunt giant of bark with a stag's skull for a
head, antlers like a bare crown of branches, a cold light in the sockets, a mantle of grey lichen hanging in
strands from its back and its arms, hands of long twigs, hooves. It carries nothing. It walks slowly and tilts its
head like an owl. To attack it raises both arms, then drives them into the earth, and roots burst out of the
ground in front of it, one after another. It does not fall when it dies: it straightens, lifts its arms, and turns
into one more dead tree.

Its frame is the boss frame (128 wide, 26 extra rows above). Drawn facing right; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, keyed, stagger_keys

BUILD = Build(root_x=52, thigh=10.5, shin=10.5, foot=5.0, hip_dx=1.8, spine=16.0, sh_near=6.4, sh_far=5.4, upper=12.5, fore=12.5, neck=2.0, head_dx=1.5,
              heel=2.2, toe=1.5, min_pelvis=6.0)

L = {
    "a": ("bone", 3), "b": ("bone", 4), "c": ("bone", 5), "d": ("bone", 6), "e": ("bone", 7), "k": ("ink", 0),
    "l": ("leather", 1), "m": ("leather", 2), "n": ("leather", 3), "o": ("leather", 4), "p": ("leather", 5),
}
#: The same body turned to dead grey wood.
STONE = {"l": ("ink", 2), "m": ("ink", 3), "n": ("ink", 4), "o": ("ink", 5), "p": ("ink", 6)}

# A stag's skull: long muzzle, a socket with the light in it (G, g), a nostril, teeth.
SKULL = [
    "..bccdd......",
    ".bccddddee...",
    "abcckkddddee.",
    "abckGgkdddeee",
    "abcckkdddddee",
    ".abccddddkde.",
    "..abccdcdcd..",
    "...aabcbcb...",
    "....aab......",
]
# Lichen collar over a narrow bark torso with a rune cut in it (G), a waist like a sapling and a skirt of bark.
TORSO = [
    "..cddeedc..",
    ".bcddeeedc.",
    "bbcddeeeddc",
    "bcmdnecoedc",
    "b.mcnnooe.c",
    "..mmnnoop..",
    "..lmnGoop..",
    "..lmGnGop..",
    "..lmnGoop..",
    "...mnnoo...",
    "...lmnoo...",
    "...lmnop...",
    "..llmnoop..",
    "..lmmnnoo..",
    ".llmmnnoop.",
    ".lm.mn.oop.",
    ".l..m...o..",
]

#: Antler beams and tines in the head's frame (x forward, y down), from the crown of the skull.
ANTLER = [((0.0, 0.0), (-4.5, -8.0), 3.2, 2.6), ((-4.5, -8.0), (-3.5, -16.0), 2.6, 2.0), ((-3.5, -16.0), (3.0, -22.0), 2.0, 1.0),
          ((-4.5, -8.0), (-11.5, -12.0), 2.0, 0.9), ((-3.5, -16.0), (-10.5, -21.0), 1.8, 0.9), ((-4.0, -12.0), (4.0, -13.5), 1.8, 0.9),
          ((-0.5, -19.0), (6.5, -17.5), 1.5, 0.8), ((-8.0, -10.0), (-10.0, -15.5), 1.4, 0.8)]
#: Roots of the surge: (x from the root, height, lean, when it starts to rise in the surge's 0–1).
ROOTS = [(26.0, 21.0, 4.0, 0.0), (38.0, 28.0, -3.0, 0.1), (50.0, 20.0, 5.0, 0.2)]


def glow_tones(glow: float) -> dict[str, tuple[str, int]]:
    if glow >= 0.9:
        return {"G": ("light", 0), "g": ("sea", 8)}
    if glow >= 0.5:
        return {"G": ("sea", 7), "g": ("sea", 5)}
    if glow >= 0.2:
        return {"G": ("sea", 4), "g": ("sea", 3)}
    return {"G": ("ink", 0), "g": ("ink", 0)}


class Warden(Character):
    build = BUILD
    W = 128
    TOP = 26

    def chains(self) -> dict[str, ChainSpec]:
        def behind(pts: list[Pt], J: dict[str, Pt]) -> None:
            cx, cy = J["chest"]
            px, py = J["pelvis"]
            for i in range(1, len(pts)):
                x, y = pts[i]
                t = max(0.0, min(1.0, (y - cy) / max(1.0, py - cy)))
                pts[i] = (min(x, cx - 4.5 + (px - 3.5 - (cx - 4.5)) * t), min(y, GROUND - 2.0))

        def grounded(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        return {
            "mantle": ChainSpec(Chain(8, 3.0, gravity=0.24, drag=0.16, damp=0.1), lambda J: (J["shN"][0] + 0.5, J["shN"][1] + 1.0), behind),
            "armN": ChainSpec(Chain(4, 2.6, gravity=0.24, drag=0.14, damp=0.1), lambda J: J["elbowN"], grounded),
            "armF": ChainSpec(Chain(4, 2.4, gravity=0.24, drag=0.14, damp=0.1), lambda J: J["elbowF"], grounded),
            "beard": ChainSpec(Chain(3, 2.2, gravity=0.22, drag=0.12, damp=0.1), lambda J: (J["head"][0] + 2.0, J["head"][1] + 1.0), grounded),
        }

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        stone = pose.get("petrify", 0.0)
        wood = "ink" if stone > 0.4 else "leather"
        up = 1 if stone > 0.4 else 0
        Lf = {**L, **(STONE if stone > 0.75 else {}), **glow_tones(pose.get("glow", 0.7))}

        def strand(name: str, w0: float, w1: float, far: bool = False) -> None:
            pts = ropes[name]
            n = len(pts) - 1
            for i in range(n):
                cel.limb(pts[i], pts[i + 1], w0 + (w1 - w0) * i / n, w0 + (w1 - w0) * (i + 1) / n, "bone", (2, 3, 5), far=far)

        # Lichen mantle down its back, ragged at the end.
        m = ropes["mantle"]
        widths = [6.0, 9.0, 11.0, 12.0, 12.0, 11.0, 10.0, 8.0]
        for i in range(len(m) - 1):
            cel.limb(m[i], m[i + 1], widths[i], widths[i + 1], "bone", (2, 3, 5))
        a_, b_ = m[-2], m[-1]
        for side in (-2.6, 0.0, 2.6):
            cel.limb((b_[0] + side, b_[1] - 1.0), (b_[0] + side * 1.3 + (b_[0] - a_[0]) * 0.5, b_[1] + 3.6 + abs(side) * 0.4), 2.4, 0.8, "bone", (2, 3, 4))
        # Far arm and its strand, far leg.
        self.arm(cel, J, "F", True, wood, up)
        strand("armF", 2.4, 0.9, far=True)
        self.leg(cel, J, "F", True, wood, up)
        self.leg(cel, J, "N", False, wood, up)
        px, py = J["pelvis"]
        cel.stamp_lean(TORSO, Lf, (px, py), 5, lean)
        # Head: far antler, skull, near antler; the beard of lichen under the jaw.
        hx, hy = J["head"]
        turn = pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0)
        a = math.radians(turn)

        def on_head(x: float, y: float) -> Pt:
            return (hx + x * math.cos(a) - y * math.sin(a), hy + x * math.sin(a) + y * math.cos(a))

        def antler(ox: float, far: bool) -> None:
            for p0, p1, w0, w1 in ANTLER:
                q0, q1 = on_head(p0[0] + ox, p0[1] - 7.0), on_head(p1[0] + ox + (1.5 if far else 0.0), p1[1] - 7.0)
                cel.limb(q0, q1, w0, w1, "ink" if stone > 0.75 else "leather", (3, 4, 6) if stone > 0.75 else (2, 4, 6), far=far)
                if w1 < 1.2:
                    cel.put(q1[0], q1[1], ("bone", 5 if far else 7))

        antler(4.5, True)
        strand("beard", 2.0, 0.8)
        cel.stamp_pivot(SKULL, Lf, (hx, hy), 3.5, 8.0, turn)
        antler(0.5, False)
        if stone < 0.4:
            bx, by = on_head(-4.0, -24.0)  # red berries caught in the antlers
            cel.put(bx, by, ("crimson", 5))
            cel.put(bx + 1, by + 1, ("crimson", 4))
        # The lichen lies across its shoulders like a yoke.
        if abs(lean) <= 40:
            cel.limb((J["shN"][0] - 2.0, J["shN"][1] + 1.5), (J["shF"][0] + 1.0, J["shF"][1] + 1.5), 4.6, 3.6, "bone", (3, 4, 6))
        self.arm(cel, J, "N", False, wood, up)
        strand("armN", 2.6, 0.9)
        # Roots of the surge, in front of everything, cut off at the ground.
        surge = pose.get("roots", 0.0)
        if 0.01 < surge < 0.985:
            self.surge(cel, surge)
        cel.outline()
        if 0.01 < surge < 0.985:
            for x, _h, _l, start in ROOTS:
                rise = max(0.0, min(1.0, (surge - start) / 0.22))
                if 0.0 < rise < 1.0:
                    for i in range(6):
                        ang = math.radians(-160 + i * 28.0)
                        cel.soft(BUILD.root_x + x + math.cos(ang) * (3.0 + 5.0 * rise), GROUND - 2 + math.sin(ang) * (2.0 + 6.0 * rise), ("leather", 5) if i % 2 else ("moss", 6))
        leaves = pose.get("leaves", 0.0)
        if 0.01 < leaves < 0.985:
            top = on_head(0.0, -20.0)
            for i in range(7):
                u = max(0.0, min(1.0, leaves * 1.4 - i * 0.06))
                if 0.0 < u < 1.0:
                    x = top[0] - 12.0 + i * 4.3 + 4.0 * math.sin(u * 7.0 + i)
                    y = top[1] + 4.0 + u * (GROUND - top[1] - 6.0)
                    tone = ("brass", 4) if i % 2 else ("crimson", 4)
                    cel.soft(x, y, tone)
                    cel.soft(x + 1, y, tone)

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool, wood: str, up: int) -> None:
        hip, knee, ankle, toe = J["hip" + s], J["knee" + s], J["ankle" + s], J["toe" + s]
        cel.limb(hip, knee, 4.6, 3.4, wood, (1 + up, 2 + up, 4 + up), far=far)
        cel.limb(knee, ankle, 3.2, 2.4, wood, (1 + up, 2 + up, 4 + up), far=far)
        cel.limb(ankle, toe, 3.4, 2.6, "ink", (1, 2, 4), far=far)  # hoof
        cel.put(knee[0], knee[1] - 1, ("bone", 3 if far else 5))

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool, wood: str, up: int) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 3.6, 2.8, wood, (1 + up, 2 + up, 4 + up), far=far)
        cel.limb(el, hd, 2.8, 2.0, wood, (1 + up, 2 + up, 4 + up), far=far)
        dx, dy = hd[0] - el[0], hd[1] - el[1]
        d = math.hypot(dx, dy) or 1.0
        ux, uy = dx / d, dy / d
        # Long twig fingers.
        for k_ in (-1.0, -0.35, 0.35, 1.0):
            tip = (hd[0] + ux * 7.0 - uy * k_ * 3.0, hd[1] + uy * 7.0 + ux * k_ * 3.0)
            cel.line(hd, tip, (wood, 5 if far else 6))
            cel.put(tip[0], tip[1], ("bone", 5 if far else 7))

    @staticmethod
    def surge(cel: Cel, u: float) -> None:
        """Roots stabbing up out of the ground one after another, holding, then sinking back."""
        tmp = Cel(cel.w, cel.h, cel.top)
        for x, height, lean, start in ROOTS:
            rise = max(0.0, min(1.0, (u - start) / 0.22))
            sink = max(0.0, min(1.0, (u - 0.74 - start * 0.4) / 0.2))
            h = height * (1 - (1 - rise) ** 2) * (1 - sink)
            if h < 1.0:
                continue
            bx = BUILD.root_x + x
            base, mid, tip = (bx, GROUND + 3.0), (bx + lean * 0.3, GROUND - h * 0.55), (bx + lean, GROUND - h)
            tmp.limb(base, mid, 6.5, 3.6, "leather", (2, 4, 6))
            tmp.limb(mid, tip, 3.6, 0.6, "leather", (2, 4, 6))
            for t, side in ((0.3, -1.0), (0.5, 1.0), (0.7, -1.0)):  # thorns
                if h * t > 3.0:
                    tx, ty = bx + lean * t * 0.8, GROUND - h * t
                    tmp.limb((tx, ty), (tx + side * 3.4, ty - 2.6), 1.6, 0.6, "leather", (3, 5, 6))
            tmp.put(tip[0], tip[1], ("bone", 7))
        for (x, y), t in tmp.px.items():
            if y < GROUND:
                cel.px[(x, y)] = t


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=1.6, lean=5.0, footN=(-5.5, 0.0, 0.0), footF=(5.5, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=6.0, elbN=14.0, armF=14.0, elbF=18.0, head_dx=0.0, head_dy=0.0, head_rot=14.0, breath=0.0,
                  glow=0.7, roots=0.0, petrify=0.0, leaves=0.0)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    # Almost still, except the head: it tilts one way, holds, then the other, like an owl's.
    tilt = 12.0 + 12.0 * max(-1.0, min(1.0, 2.2 * math.sin(math.tau * (ph - 0.1))))
    pulse = 1.0 if math.sin(math.tau * 2 * ph) > 0.6 else 0.7
    return {**BASE, "breath": 0.5 + 0.5 * s, "lean": 5.0 + 1.2 * s, "drop": 1.6 + 0.4 * late, "head_rot": tilt, "armN": 6.0 + 3.0 * late, "elbN": 14.0 + 6.0 * s,
            "armF": 14.0 + 3.0 * s, "elbF": 18.0 + 6.0 * late, "glow": pulse}


def walk_pose(ph: float) -> Pose:
    c = math.cos(math.tau * ph)
    p: Pose = gait_legs(Gait(stride=0.8, give=1.1, lift=0.7, toe=0.6), ph)
    # Long slow strides; the arms hang and swing late, the head stays level and tilted.
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 8.0 + 1.5 * math.cos(2 * math.tau * (ph - 0.06)), "dy": 0.7 * (1 + math.cos(2 * math.tau * (ph - 0.1))), "hip_rot": -0.8 * c, "sh_rot": 0.8 * c,
              "armN": 6.0 - 14.0 * math.cos(math.tau * (ph - 0.12)), "elbN": 16.0 + 6.0 * c, "armF": 14.0 + 14.0 * math.cos(math.tau * (ph - 0.12)), "elbF": 18.0 - 6.0 * c,
              "head_rot": 14.0 + 3.0 * math.cos(math.tau * (ph - 0.3)), "head_dy": 0.4 * math.cos(2 * math.tau * (ph - 0.2))})
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Root surge: both arms go up, it hangs there, then drives its hands into the earth; the roots come up ahead.
_DOWN = dict(dx=3.0, drop=8.0, lean=30.0, armN=38.0, elbN=8.0, armF=48.0, elbF=4.0, head_rot=12.0, footN=(-8.5, 0.0, -20.0), footF=(6.5, 0.0, 0.0), glow=1.0)
SURGE_KEYS = [
    (0.00, k(), "lin"),
    (0.22, k(dx=-1.0, drop=1.0, lean=-5.0, armN=158.0, elbN=14.0, armF=150.0, elbF=12.0, head_rot=-12.0, footN=(-4.5, 0.0, 0.0), footF=(6.5, 0.0, 0.0), glow=1.0), "out"),
    (0.38, k(dx=-1.6, drop=0.6, lean=-8.0, armN=170.0, elbN=18.0, armF=160.0, elbF=16.0, head_rot=-18.0, footN=(-3.9, 0.0, 0.0), footF=(7.1, 0.6, 4.0), glow=1.0), "io"),
    (0.46, k(**{**_DOWN, "drop": 6.0, "lean": 22.0, "armN": 56.0, "armF": 66.0}, roots=0.02), "in"),
    (0.52, k(**_DOWN, roots=0.14), "lin"),
    (0.78, k(**{**_DOWN, "drop": 8.4, "lean": 31.0}, roots=0.8), "lin"),
    (0.90, k(dx=1.5, drop=3.6, lean=12.0, armN=24.0, elbN=20.0, armF=30.0, elbF=20.0, head_rot=8.0, footN=(-7.0, 0.0, -6.0), footF=(6.0, 0.6, 4.0), roots=0.98), "io"),
    (1.00, k(roots=1.0), "io"),
]

# Hit: the antlers whip back, both long arms are thrown up, and the light in the skull dims and flares.
HURT_KEYS = stagger_keys(BASE, push=3.6, bend=10.0, buckle=2.8, whip=26.0, over={
    "impact": dict(armN=16.0, elbN=20.0, armF=24.0, elbF=24.0, glow=1.0),
    "reel": dict(armN=-38.0, elbN=42.0, armF=-26.0, elbF=52.0, glow=0.3),
    "catch": dict(armN=22.0, elbN=24.0, armF=30.0, elbF=24.0, glow=1.0),
})

# Death: it does not fall. It straightens, lifts its arms like boughs, the light goes, and it is a dead tree.
_TREE = dict(dx=0.0, drop=0.2, lean=-3.0, armN=-158.0, elbN=-24.0, armF=148.0, elbF=26.0, head_rot=-22.0, footN=(-4.5, 0.0, 0.0), footF=(4.5, 0.0, 0.0))
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-2.6, drop=2.4, lean=-10.0, head_rot=-20.0, head_dx=-1.5, armN=-40.0, elbN=40.0, armF=-20.0, elbF=50.0, footN=(-2.9, 0.0, 0.0), footF=(7.5, 1.4, 8.0), glow=1.0), "out3"),
    (0.28, k(dx=-1.0, drop=4.0, lean=10.0, head_rot=18.0, armN=10.0, elbN=30.0, armF=20.0, elbF=30.0, footN=(-4.5, 0.0, 0.0), footF=(5.5, 0.0, 0.0), glow=0.6), "io"),
    (0.50, k(**{**_TREE, "drop": 1.0, "lean": 0.0, "armN": -110.0, "elbN": -30.0, "armF": 100.0, "elbF": 30.0, "head_rot": -10.0}, glow=0.6, petrify=0.2, leaves=0.02), "io"),
    (0.66, k(**_TREE, glow=0.4, petrify=0.6, leaves=0.4), "out"),
    (0.80, k(**_TREE, glow=0.1, petrify=1.0, leaves=0.7), "lin"),
    (1.00, k(**_TREE, glow=0.0, petrify=1.0, leaves=1.0), "lin"),
]

STILL = lambda t: (-0.2 + 0.2 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [210] * 12, True, STILL),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [120] * 12, True, lambda t: (-0.5, 0.0)),
    "attack": Anim("attack", keyed(SURGE_KEYS), [0.0, 0.11, 0.22, 0.30, 0.38, 0.46, 0.52, 0.58, 0.64, 0.70, 0.78, 0.84, 0.90, 0.95, 1.0],
                   [90, 100, 110, 120, 180, 50, 70, 80, 80, 90, 120, 90, 90, 90, 110], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.19, 0.28, 0.36, 0.43, 0.50, 0.58, 0.66, 0.73, 0.80, 0.90, 1.0],
                  [60, 50, 90, 90, 110, 110, 110, 120, 120, 120, 120, 140, 200, 1500], False, STILL),
}
