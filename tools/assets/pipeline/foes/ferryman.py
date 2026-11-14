"""The Ferryman — world 3, stage boss. Tall and gaunt in a shroud the colour of fog. Deep in a peaked cowl, the face
of a drowned man: a skull gone the colour of the water, a bare row of teeth, weed hanging from the chin, and a coin
laid on each eye as the dead are paid for. A string of the tolls he has taken hangs from his rope belt; bone
hands; a punting oar half again as tall as a hero. He holds one hand out for the fare. He walks as if the ground were
water. To attack he swings the oar back with both hands and sweeps it low, through the water and up, and a wave
stands up where the blade passed and rolls forward along the ground. When he dies the coins fall from his eyes and ring
on the planks, and with them goes the face: there was nobody inside. The shroud drops straight down on itself and
lies there like wet cloth, the cowl rolls off it, and the oar, left standing, tips over on its own.

His frame is the boss frame (128 wide, 26 extra rows above). Drawn facing right; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, ik, keyed, lerp, loose, stagger_keys, swing_smear

FIGURE = ("Ferryman", "boss", "w03")

BUILD = Build(root_x=52, thigh=11.0, shin=11.0, foot=5.0, hip_dx=1.8, spine=17.5, sh_near=5.6, sh_far=4.8, upper=11.0, fore=10.5, neck=1.5, head_dx=1.2,
              heel=2.2, toe=1.5, min_pelvis=6.0)

L = {
    "a": ("bone", 2), "b": ("bone", 3), "c": ("bone", 4), "d": ("bone", 5), "e": ("bone", 6), "j": ("bone", 7),
    "k": ("ink", 0), "K": ("ink", 1), "l": ("leather", 2), "m": ("leather", 4), "H": ("brass", 5),
    "s": ("sea", 4), "S": ("sea", 6), "T": ("bone", 7), "t": ("bone", 4), "w": ("sea", 3),
}
#: When the coins are gone the face goes with them: the cowl is only dark inside.
HOLLOW = {"s": ("ink", 1), "S": ("ink", 0), "j": ("ink", 1), "T": ("ink", 0), "t": ("ink", 0), "w": ("ink", 1)}

# A deep peaked cowl turned three-quarters. In its shadow, a drowned skull: brow, a coin (C) on each eye, the pit
# of the nose, a bare row of teeth, the jaw; weed (w) trails from the chin.
HOOD = [
    "......abb.....",
    "....abbccd....",
    "...abbccdde...",
    "..abbccdddee..",
    ".abbccdKKKdee.",
    ".abbcdKkkkKKe.",
    "abbccKksSjjKe.",
    "abbcdKkCCsCCe.",
    "abbccKkCCkCCj.",
    "abbcdKksSkSj..",
    ".abbcKkTtTtT..",
    ".abbccKksSj...",
    "..abbcdKkwk...",
    "...abbccwdw...",
    "....abbcw.w...",
]
# The shroud: long folds, a rope at the waist, the tolls strung on it (H), the hem in tatters.
TORSO = [
    "...abccdd....",
    "..abbccdde...",
    ".abbcccddde..",
    "aabbccdddeee.",
    "aabbccddddee.",
    "aabcbcdcddee.",
    ".abcbcdcdde..",
    ".abcbcdcdde..",
    ".abbccdddde..",
    ".lmlmlmlmlm..",
    ".abbccddHde..",
    "aabcbcdcHdee.",
    "aabcbcdcddee.",
    "aabcbcdcdHee.",
    "aabbccddddeee",
    "aab.ccd.dde.e",
    "a.b..c..d.e..",
]

OAR_UP, OAR_DOWN = 24.0, 30.0


def oar_points(grip: Pt, angle: float) -> tuple[Pt, Pt, Pt]:
    """Butt, the neck where the blade starts, and the tip of the blade; `angle` is where the blade points."""
    a = math.radians(angle)
    d = (math.cos(a), math.sin(a))
    return ((grip[0] - d[0] * OAR_DOWN, grip[1] - d[1] * OAR_DOWN), (grip[0] + d[0] * (OAR_UP - 11.0), grip[1] + d[1] * (OAR_UP - 11.0)),
            (grip[0] + d[0] * OAR_UP, grip[1] + d[1] * OAR_UP))


def draw_oar(cel: Cel, grip: Pt, angle: float) -> None:
    """Drawn on its own cel so the part of it that is below the ground (in the water) is cut off."""
    butt, neck, tip = oar_points(grip, angle)
    mid = ((neck[0] + tip[0]) / 2, (neck[1] + tip[1]) / 2)
    tmp = Cel(cel.w, cel.h, cel.top)
    tmp.limb(butt, neck, 2.2, 2.0, "leather", (2, 3, 5))
    tmp.limb(neck, mid, 2.4, 6.0, "leather", (3, 5, 6))
    tmp.limb(mid, tip, 6.0, 4.4, "leather", (3, 5, 6))
    tmp.put(tip[0], tip[1], ("bone", 6))
    for (x, y), t in tmp.px.items():
        if y < GROUND:
            cel.px[(x, y)] = t


class Ferryman(Character):
    build = BUILD
    W = 128
    TOP = 26

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        grip = loose(pose, "oar", J["handN"], self.build.root_x)
        w = pose.get("two", 0.0) * (1.0 - pose.get("oar_free", 0.0))
        if w > 0.01:
            a = math.radians(pose["oar"])
            h = pose.get("hold", -7.0)
            on = (grip[0] + math.cos(a) * h, grip[1] + math.sin(a) * h)
            hx, hy = J["handF"]
            J["elbowF"], J["handF"] = ik(J["shF"], (lerp(hx, on[0], w), lerp(hy, on[1], w)), self.build.upper, self.build.fore, +1)
        J["grip"] = grip
        # The cowl is a loose prop: on the neck until the shroud empties.
        turn = pose.get("head_rot", 0.0)
        lean = pose.get("lean", 0.0)
        free = pose.get("head_free", 0.0)
        if abs(lean) > 24.0:
            turn += lean * (1.0 - free)
        a = math.radians(turn)
        nx, ny = J["head"]
        J["skull"] = loose(pose, "head", (nx + 6.0 * math.sin(a), ny + 1.5 - 6.0 * math.cos(a)), self.build.root_x)
        J["turn"] = (turn, 0.0)
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def behind(pts: list[Pt], J: dict[str, Pt]) -> None:
            low = abs(J["lean"][0]) > 30.0
            cx, cy = J["chest"]
            px, py = J["pelvis"]
            for i in range(1, len(pts)):
                x, y = pts[i]
                if low:
                    pts[i] = (x, min(y, GROUND - 1.5))
                    continue
                t = max(0.0, min(1.0, (y - cy) / max(1.0, py - cy)))
                pts[i] = (min(x, cx - 5.0 + (px - 4.0 - (cx - 5.0)) * t), min(y, GROUND - 2.0))

        def grounded(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        return {
            "cloak": ChainSpec(Chain(8, 3.0, gravity=0.24, drag=0.16, damp=0.1), lambda J: (J["shN"][0] + 0.5, J["shN"][1] + 1.0), behind),
            "sleeve": ChainSpec(Chain(4, 2.4, gravity=0.24, drag=0.14, damp=0.1), lambda J: J["elbowN"], grounded),
            "tolls": ChainSpec(Chain(5, 2.0, gravity=0.26, drag=0.1, damp=0.08), lambda J: (J["pelvis"][0] + 3.5, J["pelvis"][1] - 6.0), grounded),
        }

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool, hand: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 5.0, 4.4, "bone", (2, 3, 5), far=far)
        cel.limb(el, hd, 4.4, 3.4, "bone", (2, 3, 5), far=far)
        if hand:
            dx, dy = hd[0] - el[0], hd[1] - el[1]
            d = math.hypot(dx, dy) or 1.0
            ux, uy = dx / d, dy / d
            for k_ in (-0.9, 0.0, 0.9):  # finger bones
                cel.line(hd, (hd[0] + ux * 4.0 - uy * k_ * 2.2, hd[1] + uy * 4.0 + ux * k_ * 2.2), ("bone", 5 if far else 7))

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        glow = pose.get("glow", 0.8)
        gone = pose.get("coins", 0.0) > 0.5
        empty = pose.get("empty", 0.0) > 0.5
        coin = ("ink", 0) if gone else ("light", 0) if glow >= 0.95 else ("brass", 6) if glow >= 0.5 else ("brass", 4)
        Lf = {**L, "C": coin, **(HOLLOW if gone else {})}
        flat = pose.get("flat", 0.0)
        if flat > 0.01:
            self.heap(cel, J, pose, ropes, Lf, flat)
            return
        # The cloak down his back, in rags at the end.
        c = ropes["cloak"]
        widths = [5.0, 8.0, 10.0, 11.0, 11.0, 10.5, 9.5, 8.0]
        for i in range(len(c) - 1):
            cel.limb(c[i], c[i + 1], widths[i], widths[i + 1], "bone", (1, 2, 3))
        a_, b_ = c[-2], c[-1]
        for side in (-3.0, 0.0, 3.0):
            cel.limb((b_[0] + side, b_[1] - 1.0), (b_[0] + side * 1.3 + (b_[0] - a_[0]) * 0.5, b_[1] + 3.4 + abs(side) * 0.3), 2.8, 0.9, "bone", (1, 2, 3))
        self.arm(cel, J, "F", far=True, hand=not empty)
        # The shroud hides the legs: it only swings with them.
        px, py = J["pelvis"]
        for s, far in (("F", True), ("N", False)):
            cel.limb(J["hip" + s], J["knee" + s], 7.8, 6.8, "bone", (2, 3, 4), far=far)
            cel.limb(J["knee" + s], J["ankle" + s], 6.8, 5.8, "bone", (2, 3, 4), far=far)
            if not empty:
                cel.limb(J["ankle" + s], J["toe" + s], 2.6, 1.8, "bone", (4, 6, 7), far=far)
        mx, my = (J["ankleN"][0] + J["ankleF"][0]) / 2, (J["ankleN"][1] + J["ankleF"][1]) / 2
        cel.limb((px, py - 1.0), (mx, my - 1.0), 9.0, 8.0, "bone", (2, 3, 4))
        cel.stamp_lean(TORSO, Lf, (px, py), 6, lean)
        tolls = ropes["tolls"]
        for i in range(len(tolls) - 1):
            cel.line(tolls[i], tolls[i + 1], ("leather", 3))
            cel.put(tolls[i + 1][0], tolls[i + 1][1], ("brass", 6 if i % 2 else 4))
        turn = J["turn"][0]
        sx, sy = J["skull"]
        cel.stamp_pivot(HOOD, Lf, (sx, sy), 6.5, 8.0, turn)
        draw_oar(cel, J["grip"], pose["oar"])
        self.arm(cel, J, "N", far=False, hand=not empty)
        sl = ropes["sleeve"]
        for i in range(len(sl) - 1):
            cel.limb(sl[i], sl[i + 1], 3.6 - i * 0.7, 2.9 - i * 0.7, "bone", (2, 3, 5))
        cel.outline()

        _, _, tip = oar_points(J["grip"], pose["oar"])
        if pose.get("smear", 0.0) > 0.5 and len(between) > 2:
            before = set(cel.px)
            tips, hubs = [], []
            for Jb, pb in between:
                tips.append(oar_points(Jb["grip"], pb["oar"])[2])
                hubs.append(Jb["grip"])
            swing_smear(cel, tips, hubs)
            for xy in set(cel.px) - before:
                if xy[1] >= GROUND:
                    del cel.px[xy]
        wave = pose.get("wave", 0.0)
        if 0.01 < wave < 0.985:
            self.wave(cel, wave)
        if not gone and glow >= 0.5:
            a = math.radians(turn)
            for ex in (1.0, 4.0):  # the coins catch the light
                cel.put(sx + ex * math.cos(a) + 0.5 * math.sin(a), sy + ex * math.sin(a) - 0.5 * math.cos(a), ("light", 0) if glow >= 0.8 else ("brass", 7))
        self.fallen_coins(cel, pose, gone)

    def fallen_coins(self, cel: Cel, pose: Pose, gone: bool) -> None:
        if gone:
            for key_ in ("c1", "c2"):
                cx, cy = self.build.root_x + pose[key_][0], GROUND - pose[key_][1]
                for dx, dy, tone in ((0, 0, ("brass", 6)), (1, 0, ("brass", 7)), (0, 1, ("brass", 4)), (1, 1, ("brass", 5))):
                    cel.put(cx + dx, cy - 1 + dy, tone)

    def heap(self, cel: Cel, J: dict[str, Pt], pose: Pose, ropes: dict[str, list[Pt]], Lf: dict, flat: float) -> None:
        """The shroud with nobody in it: it comes down on itself (flat 0 → 1: tall and narrow to low and wide) and
        lies in folds like wet cloth, the darker cloak under it, the cowl tumbling off, the tolls spilled."""
        G = GROUND
        x = J["pelvis"][0]
        h, w = lerp(21.0, 9.0, flat), lerp(9.0, 19.0, flat)
        # The cloak: a darker tongue of cloth spreading out behind.
        cel.limb((x - w * 0.5, G - 3.0), (x - w - 3.0 - 8.0 * flat, G - 1.6), 4.6, 2.0, "bone", (1, 2, 3))
        # The shroud itself: folds lying one on another, each a fat soft stroke with its own lit top and
        # shadowed underside, narrower and offset the higher they are — a column of cloth crumpling into a heap.
        n = max(2, int(round(h / 3.4)))
        for i in range(n):
            y = G - 2.2 - i * (h - 3.0) / max(1, n - 1) * 0.86
            half = w * (1.0 - 0.6 * i / n)
            off = (1.6 if i % 2 else -1.4) * (0.4 + 0.6 * flat) + (2.0 * flat if i == n - 1 else 0.0)
            top = i == n - 1
            tilt = (1.3 if i % 2 else -1.1) if i else 0.3  # no two folds lie the same way
            cel.limb((x - half + off, y + tilt), (x + half + off, y - tilt), 4.8 if i else 4.2, 3.6 if i else 3.4, "bone", (2, 3 if i % 2 else 4, 6 if top else 5))
        # One fold thrown forward off the heap.
        cel.limb((x + w * 0.25, G - h * 0.55), (x + w + 1.0, G - 1.6), 3.6, 2.0, "bone", (2, 4, 6))
        if flat > 0.3:
            # The rope belt lies across it and the tolls have slid off the end onto the planks.
            x0, y0 = x + w * 0.2, G - h * 0.75
            x1 = x + w + 5.0
            for n in range(9):
                t = n / 8
                cx, cy = x0 + (x1 - x0) * t, min(G - 1.0, y0 + (G - 1.0 - y0) * t ** 0.7)
                cel.put(cx, cy, ("leather", 3) if n % 2 else ("brass", 6 if n % 4 == 0 else 4))
        turn = J["turn"][0]
        sx, sy = J["skull"]
        cel.stamp_pivot(HOOD, Lf, (sx, sy), 6.5, 8.0, turn)
        draw_oar(cel, J["grip"], pose["oar"])
        cel.outline()
        self.fallen_coins(cel, pose, True)

    def wave(self, cel: Cel, u: float) -> None:
        """A wave standing up where the blade went through the water and rolling away along the ground."""
        x = self.build.root_x + 18.0 + 44.0 * u
        h = 21.0 * math.sin(math.pi * min(1.0, u * 1.25)) ** 0.7 * (1.0 if u < 0.8 else max(0.0, (0.985 - u) / 0.185))
        G = GROUND
        if h >= 1.5:
            body = cel.poly_mask([(x - 18, G), (x - 10, G - h * 0.45), (x - 2, G - h * 0.9), (x + 5, G - h), (x + 10, G - h + 3.0), (x + 6, G - h * 0.55), (x + 9, G)])
            shape = set(body)
            for (i, j) in body:
                if 0 <= i < cel.w and j < G:
                    top = (i, j - 1) not in shape
                    front = (i + 1, j) not in shape
                    cel.px[(i, j)] = ("bone", 7) if top else ("sea", 7) if front else ("sea", 4) if j > G - h * 0.35 else ("sea", 5) if (i + j) % 3 else ("sea", 6)
            for i in range(6):  # spray thrown off the crest
                ang = math.radians(-120 + i * 22.0)
                cel.soft(x + 6 + math.cos(ang) * (3.0 + i % 3) * 1.4, G - h + math.sin(ang) * (3.0 + (i * 2) % 4), ("bone", 7) if i % 2 else ("sea", 7))
        for i in range(int(self.build.root_x + 16), int(x - 12)):  # the wake it leaves
            if (i * 5 + int(u * 30)) % 4 == 0:
                cel.soft(i, G - 1, ("bone", 7) if i % 3 == 0 else ("sea", 6))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=1.6, lean=4.0, footN=(-5.0, 0.0, 0.0), footF=(5.0, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=22.0, elbN=60.0, armF=38.0, elbF=58.0, oar=-86.0, two=0.0, hold=-7.0, head_dx=0.0, head_dy=0.0, head_rot=6.0, breath=0.0,
                  glow=0.8, smear=0.0, wave=0.0, coins=0.0, c1=(6.0, 47.0), c2=(8.0, 47.0), empty=0.0, flat=0.0,
                  head_free=0.0, head_at=(0.0, 0.0), oar_free=0.0, oar_at=(0.0, 0.0))


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    # He waits, the oar grounded like a staff, the free hand held out for the fare and its fingers curling.
    return {**BASE, "breath": 0.5 + 0.5 * s, "lean": 4.0 + 1.2 * s, "drop": 1.6 + 0.4 * late, "head_rot": 6.0 + 6.0 * late, "oar": -86.0 + 1.5 * late,
            "armF": 38.0 + 4.0 * late, "elbF": 58.0 + 10.0 * math.sin(math.tau * 2 * (ph - 0.1)), "glow": 1.0 if math.sin(math.tau * 2 * ph) > 0.7 else 0.8}


def walk_pose(ph: float) -> Pose:
    c = math.cos(math.tau * ph)
    p: Pose = gait_legs(Gait(stride=0.74, give=1.1, lift=0.6, toe=0.5), ph)
    # He poles himself along: the oar goes forward and is planted once a stride, and the body glides after it.
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 7.0 + 1.5 * math.cos(2 * math.tau * (ph - 0.06)), "dy": 0.5 * (1 + math.cos(2 * math.tau * (ph - 0.1))), "hip_rot": -0.8 * c, "sh_rot": 0.8 * c,
              "armN": 22.0 + 12.0 * math.cos(math.tau * (ph - 0.1)), "elbN": 60.0, "oar": -86.0 + 9.0 * math.cos(math.tau * (ph - 0.1)),
              "armF": 30.0 + 8.0 * math.cos(math.tau * (ph - 0.25)), "elbF": 50.0, "head_rot": 8.0 + 3.0 * math.cos(math.tau * (ph - 0.3)),
              "head_dy": 0.4 * math.cos(2 * math.tau * (ph - 0.2))})
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Oar sweep: both hands swing it back until the blade hangs behind him, then round — down through the water,
# forward and up — and the wave it raises rolls away. The blade turns a full circle (−86° comes back as −446°).
SWEEP_KEYS = [
    (0.00, k(), "lin"),
    (0.18, k(two=1.0, dx=-1.0, drop=1.8, lean=0.0, armN=8.0, elbN=70.0, oar=-112.0, head_rot=2.0, footN=(-4.0, 0.0, 0.0), footF=(6.0, 0.0, 0.0), glow=1.0), "out"),
    (0.34, k(two=1.0, dx=-2.5, drop=2.4, lean=-8.0, sh_rot=1.5, armN=-46.0, elbN=14.0, oar=-200.0, head_rot=-6.0, footN=(-2.5, 0.0, 0.0), footF=(7.5, 0.8, 6.0), glow=1.0), "out"),
    (0.42, k(two=1.0, dx=-2.9, drop=2.2, lean=-10.0, sh_rot=1.8, armN=-52.0, elbN=14.0, oar=-207.0, head_rot=-8.0, footN=(-2.1, 0.0, 0.0), footF=(7.9, 1.4, 8.0), glow=1.0), "io"),
    (0.48, k(two=1.0, dx=1.5, drop=4.6, lean=12.0, armN=4.0, elbN=30.0, oar=-270.0, head_rot=8.0, footN=(-6.5, 0.0, -8.0), footF=(8.5, 0.3, 0.0), glow=1.0), "in"),
    (0.54, k(two=1.0, dx=4.0, drop=6.0, lean=24.0, sh_rot=-1.0, armN=50.0, elbN=6.0, oar=-330.0, head_rot=14.0, footN=(-9.0, 0.0, -20.0), footF=(6.0, 0.0, 0.0), glow=1.0, smear=1.0,
             wave=0.02), "lin"),
    (0.62, k(two=1.0, dx=4.2, drop=4.0, lean=12.0, armN=100.0, elbN=14.0, oar=-384.0, head_rot=8.0, footN=(-9.2, 0.0, -20.0), footF=(5.8, 0.0, 0.0), wave=0.2), "out"),
    (0.86, k(two=1.0, dx=1.5, drop=2.4, lean=6.0, armN=50.0, elbN=50.0, oar=-430.0, footN=(-6.5, 0.0, -4.0), footF=(5.5, 0.6, 4.0), wave=0.98), "io"),
    (1.00, k(oar=-446.0, wave=1.0), "io"),
]

# Hit: the shroud takes most of it; the cowl snaps back, the coins flash, the open hand closes on nothing.
HURT_KEYS = stagger_keys(BASE, push=3.6, bend=10.0, buckle=2.8, whip=22.0, over={
    "impact": dict(armF=46.0, elbF=40.0, armN=18.0, elbN=58.0, oar=-90.0, glow=1.0),
    "reel": dict(armF=-30.0, elbF=50.0, armN=2.0, elbN=56.0, oar=-104.0, glow=0.3),
    "catch": dict(armF=40.0, elbF=40.0, armN=26.0, elbN=58.0, oar=-80.0, glow=1.0),
})

# Death: the coins drop from his eyes and ring on the ground, and the face goes with them — nobody was in there.
# The shroud comes straight down on itself and lies like wet cloth (`flat`), the cowl rolls off it, and the oar,
# left standing where his hand was, goes over by itself.
_PILE = dict(dx=0.0, drop=24.0, lean=8.0, armN=18.0, elbN=6.0, armF=30.0, elbF=6.0, footN=(-7.0, 0.5, -90.0), footF=(-4.0, 0.5, -90.0), coins=1.0, empty=1.0, glow=0.0,
             head_free=1.0, oar_free=1.0)
_COINS = dict(c1=(21.0, 1.5), c2=(27.0, 1.5))
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.08, k(dx=-2.5, drop=2.4, lean=-10.0, head_rot=-18.0, head_dx=-1.2, armF=-30.0, elbF=40.0, armN=10.0, elbN=58.0, oar=-92.0, footN=(-2.5, 0.0, 0.0), footF=(7.5, 1.4, 8.0), glow=1.0), "out3"),
    (0.20, k(dx=-1.5, drop=2.0, lean=-2.0, head_rot=14.0, armF=20.0, elbF=30.0, armN=20.0, elbN=58.0, footN=(-3.5, 0.0, 0.0), footF=(6.5, 0.0, 0.0), coins=1.0, c1=(7.0, 43.0),
             c2=(10.0, 44.0), glow=0.0), "io"),
    (0.32, k(dx=-1.0, drop=4.0, lean=2.0, head_rot=20.0, armN=8.0, elbN=6.0, armF=10.0, elbF=6.0, footN=(-4.0, 0.0, 0.0), footF=(6.0, 0.0, 0.0), coins=1.0, c1=(10.0, 22.0),
             c2=(14.0, 29.0), empty=1.0, glow=0.0, oar_free=1.0, oar_at=(10.0, 31.0)), "in"),
    (0.42, k(dx=-0.6, drop=9.0, lean=5.0, head_rot=24.0, armN=8.0, elbN=6.0, armF=10.0, elbF=6.0, footN=(-5.0, 0.3, -40.0), footF=(4.0, 0.3, 0.0), coins=1.0, c1=(13.0, 1.5),
             c2=(18.0, 13.0), empty=1.0, glow=0.0, oar_free=1.0, oar_at=(10.0, 31.0)), "in"),
    (0.50, k(dx=-0.3, drop=14.0, lean=7.0, head_rot=28.0, armN=10.0, elbN=6.0, armF=14.0, elbF=6.0, footN=(-6.0, 0.4, -70.0), footF=(0.0, 0.4, -40.0), coins=1.0, c1=(16.0, 6.0),
             c2=(22.0, 1.5), empty=1.0, glow=0.0, oar_free=1.0, oar_at=(10.0, 31.0)), "lin"),
    (0.54, k(**_PILE, flat=0.2, head_at=(1.0, 27.0), head_rot=20.0, c1=(18.0, 1.5), c2=(24.0, 5.0), oar_at=(10.0, 31.0), oar=-86.0), "lin"),
    (0.58, k(**_PILE, flat=0.5, head_at=(3.5, 21.0), head_rot=32.0, c1=(20.0, 1.5), c2=(26.0, 1.5), oar_at=(10.0, 31.0), oar=-84.0), "lin"),
    (0.66, k(**_PILE, **_COINS, flat=1.0, head_at=(10.0, 11.0), head_rot=64.0, oar_at=(11.0, 29.0), oar=-62.0), "out"),
    (0.76, k(**_PILE, **_COINS, flat=1.0, head_at=(17.0, 6.6), head_rot=102.0, oar_at=(13.0, 14.0), oar=-22.0), "in"),
    (0.84, k(**_PILE, **_COINS, flat=1.0, head_at=(18.0, 6.6), head_rot=92.0, oar_at=(14.0, 1.8), oar=-1.0), "in"),
    (0.90, k(**_PILE, **_COINS, flat=1.0, head_at=(18.0, 6.6), head_rot=96.0, oar_at=(14.0, 3.6), oar=-6.0), "out"),
    (1.00, k(**_PILE, **_COINS, flat=1.0, head_at=(18.0, 6.6), head_rot=96.0, oar_at=(14.0, 1.8), oar=-1.0), "in"),
]

STILL = lambda t: (-0.2 + 0.2 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [210] * 12, True, STILL),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [120] * 12, True, lambda t: (-0.5, 0.0)),
    "attack": Anim("attack", keyed(SWEEP_KEYS), [0.0, 0.09, 0.18, 0.26, 0.34, 0.42, 0.48, 0.54, 0.58, 0.62, 0.68, 0.74, 0.80, 0.86, 0.93, 1.0],
                   [90, 90, 100, 110, 130, 150, 40, 50, 70, 90, 90, 90, 90, 100, 100, 110], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, [int(v * 1.2) for v in HURT_MS], False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.04, 0.08, 0.14, 0.20, 0.26, 0.32, 0.37, 0.42, 0.46, 0.50, 0.54, 0.58, 0.62, 0.66, 0.71, 0.76, 0.80, 0.84, 0.90, 1.0],
                  [60, 50, 90, 90, 110, 80, 80, 70, 70, 60, 60, 60, 70, 70, 90, 80, 80, 70, 90, 100, 1400], False, STILL),
}
