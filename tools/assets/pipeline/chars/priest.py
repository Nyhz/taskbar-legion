"""Priest — a priestess, serene and upright. A slender skeleton under a long robe (two simulated cloth edges the
legs push around), bell sleeves, a white coif over long blonde hair that trails her movement, a book in the near
hand and a tall staff whose lantern swings like the pendulum it is. Casting lifts her onto her toes as the
lantern flares."""
from __future__ import annotations

import math

from ..rig import GROUND, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, cyc, gait_legs, keyed

BUILD = Build(root_x=40, thigh=6.2, shin=6.0, foot=3.6, hip_dx=1.2, spine=9.6, sh_near=2.2, sh_far=1.9, upper=5.6, fore=5.4, neck=1.0, head_dx=0.4,
              leg_scale=12.2 / 15.6)

L = {
    "c": ("bone", 3), "d": ("bone", 4), "e": ("bone", 5), "f": ("bone", 6), "g": ("bone", 7),
    "S": ("sea", 1), "T": ("sea", 2), "U": ("sea", 3), "V": ("sea", 4),
    "h": ("brass", 3), "i": ("brass", 4), "j": ("brass", 5), "k": ("brass", 6),
    "p": ("crimson", 6), "B": ("azure", 3), "w": ("light", 0),
    "s": ("skin", 3), "t": ("skin", 4), "u": ("skin", 5), "v": ("skin", 6), "E": ("ink", 0),
    "n": ("leather", 3), "o": ("leather", 4),
    "q": ("crimson", 2), "r": ("crimson", 3),
}

# A small coif at the crown with a teal band; blonde bangs and a lock framing the face (the mane itself and the
# lock over the shoulder are chains).
HEAD = [
    "...effg...",
    "..deffggk.",
    ".iUUUVVjk.",
    ".ijjjkkkj.",
    ".ijkjttuu.",
    ".ijksEtuuu",
    ".ijkjtttu.",
    ".iijjttp..",
    ".iijjjt...",
    ".iijjj....",
]
# An hourglass: a short teal capelet open at the collarbone, a fitted white bodice, a cinched teal sash with a
# gold clasp, hips flaring into the skirt.
TORSO = [
    "...stu....",
    ".STTtuUV..",
    "SSTTjuuVV.",
    ".Sdeeuvgg.",
    "..deefggg.",
    "..cdeeffg.",
    "..ccddee..",
    "...TUUV...",
    "..cTjUVf..",
    ".ccdeeefff",
]
BOOK = [
    "qrrj",
    "qrrr",
    "qrjr",
    "qrrr",
    "gggf",
]
LANTERN = [
    ".h.",
    "hjh",
    "jgj",
    "hjh",
]
LANTERN_OUT = [
    ".h.",
    "hnh",
    "non",
    "hnh",
]

STAFF_UP, STAFF_DOWN = 19.0, 16.5


STAFF_LEN = STAFF_UP + STAFF_DOWN


def staff_points(hand: Pt, tilt: float, lift: float = 0.0, free: float = 0.0, at: Pt = (0.0, 0.0), root: float = 0.0) -> dict[str, Pt]:
    """The staff: its foot, its top, the bend of the crook and the tip the lantern hangs from. `tilt` is how far
    the top leans forward; `lift` carries the foot off the ground. With `free` it lets go of the hand and
    stands (or lies) with its foot at `at` = (x from root, height)."""
    a = math.radians(tilt)
    d = (math.sin(a), -math.cos(a))
    n = (math.cos(a), math.sin(a))  # forward of the staff
    down = min(STAFF_DOWN, (GROUND - 0.5 - lift - hand[1]) / max(0.2, math.cos(a)))
    bx, by = hand[0] - d[0] * down, hand[1] - d[1] * down
    if free > 0.001:
        bx, by = bx + (root + at[0] - bx) * free, by + (GROUND - 0.5 - at[1] - by) * free
    top = (bx + d[0] * STAFF_LEN, by + d[1] * STAFF_LEN) if free > 0.5 else (hand[0] + d[0] * STAFF_UP + (bx - (hand[0] - d[0] * down)), hand[1] + d[1] * STAFF_UP + (by - (hand[1] - d[1] * down)))
    mid = (top[0] + n[0] * 2.2 + d[0] * 2.0, top[1] + n[1] * 2.2 + d[1] * 2.0)
    tip = (top[0] + n[0] * 4.5 - d[0] * 1.0, top[1] + n[1] * 4.5 - d[1] * 1.0)
    return {"staff_bottom": (bx, by), "staff_top": top, "crook_mid": mid, "crook": tip}


def leg_x(J: dict[str, Pt], s: str, y: float) -> float:
    """x of a leg at height y (hip → knee → ankle → toe)."""
    pts = [J["hip" + s], J["knee" + s], J["ankle" + s]]
    for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
        if y0 <= y <= y1 and y1 > y0:
            return x0 + (x1 - x0) * (y - y0) / (y1 - y0)
    return pts[0][0] if y < pts[0][1] else pts[-1][0]


class Priest(Character):
    build = BUILD
    head = HEAD

    def chains(self) -> dict[str, ChainSpec]:
        def front_hit(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                x, y = pts[i]
                y = min(y, GROUND - 1.6)
                lim = max(leg_x(J, "N", y), leg_x(J, "F", y)) + 2.2 + i * 0.3
                pts[i] = (max(x, lim), y)

        def back_hit(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                x, y = pts[i]
                y = min(y, GROUND - 1.6)
                lim = min(leg_x(J, "N", y), leg_x(J, "F", y)) - (3.2 if i <= 2 else 2.4) - i * 0.5
                pts[i] = (min(x, lim), y)

        def hair_hit(pts: list[Pt], J: dict[str, Pt]) -> None:
            # The mane hangs down her back; lying down it simply rests on the ground.
            lying = abs(J["lean"][0]) > 45.0
            cx, cy = J["chest"]
            px, py = J["pelvis"]
            for i in range(1, len(pts)):
                x, y = pts[i]
                if lying:
                    pts[i] = (x, min(y, GROUND - 1.5))
                    continue
                t = max(0.0, min(1.0, (y - cy) / max(1.0, py - cy)))
                pts[i] = (min(x, cx - 3.6 + (px - 4.0 - (cx - 3.6)) * t), y)

        return {
            "hair": ChainSpec(Chain(6, 2.6, gravity=0.2, drag=0.17, damp=0.1), lambda J: (J["head"][0] - 3.2, J["head"][1] - 2.0), hair_hit),
            "lock": ChainSpec(Chain(4, 2.2, gravity=0.26, drag=0.14, damp=0.12), lambda J: (J["head"][0] - 1.6, J["head"][1] + 0.5)),
            "front": ChainSpec(Chain(6, 2.4, gravity=0.3, drag=0.16, damp=0.14), lambda J: (J["pelvis"][0] + 3.4, J["pelvis"][1] - 0.5), front_hit),
            "back": ChainSpec(Chain(6, 2.4, gravity=0.3, drag=0.16, damp=0.14), lambda J: (J["pelvis"][0] - 3.6, J["pelvis"][1] - 0.5), back_hit),
            "lantern": ChainSpec(Chain(2, 3.2, gravity=0.3, drag=0.03, damp=0.02), lambda J: J["crook"],
                                 lambda pts, J: pts.__setitem__(1, (pts[1][0], min(pts[1][1], GROUND - 4.0)))),
        }

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        J.update(staff_points(J["handF"], pose.get("staff", 0.0), pose.get("staff_lift", 0.0), pose.get("staff_free", 0.0),
                              pose.get("staff_at", (0.0, 0.0)), self.build.root_x))
        return J

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 2.8, 2.8, "bone", (3, 5, 6), far=far)
        # Bell sleeve: it widens to the wrist and ends in a gold cuff.
        wr = (el[0] + (hd[0] - el[0]) * 0.82, el[1] + (hd[1] - el[1]) * 0.82)
        cel.limb(el, wr, 2.8, 4.6, "bone", (3, 5, 6), far=far)
        # A thin gold cuff across the sleeve's mouth.
        ax, ay = hd[0] - el[0], hd[1] - el[1]
        d = math.hypot(ax, ay) or 1.0
        nx, ny = -ay / d, ax / d
        cel.line((wr[0] - nx * 2.2, wr[1] - ny * 2.2), (wr[0] + nx * 2.2, wr[1] + ny * 2.2), ("brass", 4 if far else 5))
        for dx, dy, i in ((0, 0, 5), (1, 0, 5), (0, 1, 4)):
            cel.put(hd[0] + dx - 0.5, hd[1] + dy - 0.5, ("skin", i - (1 if far else 0)))

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        bottom, top, crook = J["staff_bottom"], J["staff_top"], J["crook"]
        # Shoes peek from under the hem.
        for s, far in (("F", True), ("N", False)):
            cel.limb(J["ankle" + s], J["toe" + s], 2.8, 2.0, "leather", (2, 3, 4), far=far)
        if abs(lean) > 45.0:
            # Lying down, the robe wraps the legs instead of hanging from the hips.
            for s, far in (("F", True), ("N", False)):
                cel.limb(J["hip" + s], J["knee" + s], 6.4, 6.0, "bone", (3, 5, 6), far=far)
                cel.limb(J["knee" + s], J["ankle" + s], 6.0, 5.2, "bone", (3, 5, 6), far=far)
                ax, ay = J["ankle" + s]
                kx, ky = J["knee" + s]
                d = math.hypot(ax - kx, ay - ky) or 1.0
                nx, ny = -(ay - ky) / d, (ax - kx) / d
                cel.line((ax - nx * 2.6, ay - ny * 2.6), (ax + nx * 2.6, ay + ny * 2.6), ("brass", 4 if far else 5))
        else:
            # Robe: the cloth between the back edge and the front edge, lit towards the front.
            front, back = ropes["front"], ropes["back"]
            poly = back + front[::-1]
            rows: dict[int, list[int]] = {}
            for (x, y) in cel.poly_mask(poly):
                rows.setdefault(y, []).append(x)
            ys = sorted(rows)
            for y in ys:
                xs = rows[y]
                x0, x1 = min(xs), max(xs)
                depth = (y - ys[0]) / max(1, len(ys) - 1)
                for x in xs:
                    f = (x - x0) / max(1, x1 - x0)
                    idx = 6 if f > 0.78 else 3 if f < 0.2 else 5
                    # Folds open up towards the hem.
                    if depth > 0.3 and abs(f - 0.42) < 0.05:
                        idx = 4
                    if depth > 0.5 and abs(f - 0.3) < 0.04:
                        idx = 4
                    # The stole hangs down the front of the robe and ends in a gold fringe.
                    if 0.56 < f < 0.74 and depth < 0.62:
                        cel.put(x, y, ("brass", 5) if depth > 0.57 else ("sea", 4 if f > 0.66 else 3))
                        continue
                    cel.put(x, y, ("bone", idx))
            if ys:
                for y in ys[-2:]:
                    for x in rows[y]:
                        cel.put(x, y, ("brass", 4 if y == ys[-1] else 5))
        self.arm(cel, J, "F", far=True)
        # Staff, its crook, and the far hand over it.
        cel.limb(bottom, top, 1.7, 1.5, "leather", (2, 4, 5))
        cel.limb(top, J["crook_mid"], 1.5, 1.4, "leather", (2, 4, 5))
        cel.limb(J["crook_mid"], crook, 1.4, 1.2, "leather", (2, 4, 5))
        fx, fy = J["handF"]
        for dx, dy, i in ((0, 0, 4), (0, 1, 3), (1, 0, 4)):
            cel.put(fx + dx - 0.5, fy + dy - 0.5, ("skin", i))
        px, py = J["pelvis"]
        cel.stamp_lean(TORSO, L, (px, py), 4, lean)
        # The mane: a broad fall of blonde down her back, drawn over the back edge of the body.
        hair = ropes["hair"]
        hw = [5.2, 5.6, 5.2, 4.6, 3.8, 2.6]
        for i in range(len(hair) - 1):
            cel.limb(hair[i], hair[i + 1], hw[i], hw[i + 1], "brass", (4, 5, 6))
        for i in range(1, len(hair) - 1):
            cel.put(hair[i][0] + 1.0, hair[i][1], ("brass", 7))
        # A lock over the near shoulder.
        lock = ropes["lock"]
        for i in range(len(lock) - 1):
            cel.limb(lock[i], lock[i + 1], 2.6 - i * 0.3, 2.2 - i * 0.4, "brass", (4, 5, 6))
        hx, hy = J["head"]
        cel.stamp_turn(self.head, L, (hx, hy + 1), 4, pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0))
        # The book stays in the near hand until it is dropped (`book_free`).
        nx, ny = J["handN"]
        bw = pose.get("book_free", 0.0)
        bx, by = nx - 1, ny - 3
        if bw > 0.001:
            at = pose["book_at"]
            bx, by = bx + (self.build.root_x + at[0] - bx) * bw, by + (GROUND - 5.0 - at[1] - by) * bw
        cel.stamp(BOOK, L, bx, by)
        self.arm(cel, J, "N", far=False)
        lan = ropes["lantern"][-1]
        cel.line(crook, lan, ("brass", 3))
        cel.stamp(LANTERN if pose.get("glow", 0.0) >= 0.03 else LANTERN_OUT, L, lan[0] - 1.5, lan[1])
        cel.outline()
        # Light: a halo of rays round the lantern that grows with the spell.
        glow = pose.get("glow", 0.0)
        cx, cy = lan[0], lan[1] + 2.0
        if pose.get("bolt", 0.0) > 0.5:
            # Smite: a lance of light from the lantern at whatever stands in front of him.
            for i in range(4, 30):
                cel.soft(cx + i, cy - i * 0.12, ("light", 0) if i < 20 else ("brass", 6))
                if i < 16:
                    cel.soft(cx + i, cy - i * 0.12 + 1, ("brass", 6))
        if glow < 0.03:
            return
        reach = 2.6 + 4.2 * glow
        for k_ in range(12):
            ang = math.tau * k_ / 12 + (0.26 if glow > 0.6 else 0.0)
            long = reach * (1.0 if k_ % 2 == 0 else 0.62)
            r = 2.8
            while r <= long:
                x, y = cx + math.cos(ang) * r, cy + math.sin(ang) * r
                if (int(math.floor(x)), int(math.floor(y))) not in cel.px:
                    cel.put(x, y, ("light", 0) if r < long * 0.6 else ("brass", 6))
                r += 1.0 if glow > 0.25 else 2.0


# --------------------------------------------------------------------------------------- animations
REST: Pose = dict(dx=0.0, drop=0.6, lean=-1.0, footN=(-2.6, 0.0, 0.0), footF=(3.0, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=-6.0, elbN=16.0, armF=30.0, elbF=40.0, staff=3.0, staff_lift=0.0, glow=0.0, bolt=0.0, head_rot=0.0,
                  staff_free=0.0, staff_at=(0.0, 0.0), book_free=0.0, book_at=(0.0, 0.0), reachN=(0.0, 0.0), reachN_w=0.0, reachF=(0.0, 0.0), reachF_w=0.0, head_dx=0.0, head_dy=0.0, breath=0.0)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.15))
    return {**REST, "breath": 0.5 + 0.5 * s, "lean": -1.0 - 0.7 * s, "hip_rot": 0.5 * late, "elbN": 16.0 + 4.0 * late, "elbF": 40.0 + 3.0 * late,
            "staff": 3.0 + 1.2 * late, "head_dy": -0.3 * late, "glow": 0.08 + 0.06 * math.sin(2 * math.tau * ph)}


HURRY = Gait(stride=0.95, give=0.9, lift=0.8, toe=0.8, run=True, air=1.1)


def run_pose(ph: float) -> Pose:
    c, s2 = math.cos(math.tau * ph), math.cos(2 * math.tau * (ph - 0.08))
    p: Pose = gait_legs(HURRY, ph)
    # He hurries with the staff carried off the ground, the book clutched to his chest.
    p.update(lean=3.0 + 1.0 * s2, hip_rot=-0.9 * c, sh_rot=0.6 * c, armN=-6.0 - 20.0 * c, elbN=28.0 + 10.0 * (1 - c) / 2,
             armF=36.0 + 6.0 * c, elbF=54.0, glow=0.08, bolt=0.0, staff=10.0 + 4.0 * math.cos(math.tau * (ph - 0.1)), staff_lift=5.0,
             head_dx=0.0, head_dy=0.4 * math.cos(2 * math.tau * (ph - 0.2)), breath=0.0)
    return p


def k(**over: object) -> Pose:
    return {**REST, **over}


CAST_KEYS = [
    (0.00, k(), "lin"),
    # Gather: he dips and bows over the staff.
    (0.20, k(drop=1.7, lean=8.0, armF=18.0, elbF=62.0, staff=-4.0, head_dy=0.6, armN=4.0, elbN=60.0, glow=0.15), "out"),
    # Raise: up onto the toes, the staff thrust high, the free hand opening.
    (0.45, k(drop=-0.7, lean=-4.0, footN=(-2.6, 0.0, -16.0), footF=(3.0, 0.0, -12.0), armF=122.0, elbF=18.0, staff=14.0, armN=48.0, elbN=70.0, glow=0.8), "io"),
    (0.60, k(drop=-1.0, lean=-5.0, footN=(-2.6, 0.0, -18.0), footF=(3.0, 0.0, -14.0), armF=128.0, elbF=16.0, staff=16.0, armN=52.0, elbN=66.0, glow=1.0), "io"),
    (0.70, k(drop=-0.8, lean=-4.0, footN=(-2.6, 0.0, -16.0), footF=(3.0, 0.0, -12.0), armF=126.0, elbF=16.0, staff=15.0, armN=52.0, elbN=66.0, glow=1.3), "lin"),
    # Lower and settle.
    (0.85, k(drop=0.9, lean=5.0, armF=52.0, elbF=44.0, staff=6.0, armN=10.0, elbN=50.0, glow=0.3), "io"),
    (1.00, k(), "out"),
]


def cast_air(t: float) -> Pt:
    # The spell lifts the robe.
    lift = max(0.0, 1.0 - abs(t - 0.6) / 0.28)
    return (-0.1, -0.5 * lift)


# Smite: he draws the staff back and thrusts the lantern at the enemy.
SMITE_KEYS = [
    (0.00, k(), "lin"),
    (0.22, k(dx=-1.2, drop=1.4, lean=-4.0, armF=10.0, elbF=70.0, staff=-14.0, glow=0.3), "out"),
    (0.36, k(dx=-1.6, drop=1.6, lean=-6.0, armF=8.0, elbF=74.0, staff=-18.0, glow=0.5), "io"),
    (0.46, k(dx=2.4, drop=1.2, lean=10.0, armF=74.0, elbF=12.0, staff=52.0, staff_lift=6.0, glow=1.0, bolt=1.0, footF=(5.0, 0.0, 0.0), footN=(-2.6, 0.0, -12.0)), "in3"),
    (0.58, k(dx=2.8, drop=1.3, lean=11.0, armF=76.0, elbF=10.0, staff=55.0, staff_lift=6.0, glow=1.2, bolt=1.0, footF=(5.0, 0.0, 0.0), footN=(-2.6, 0.0, -14.0)), "lin"),
    (0.72, k(dx=2.0, drop=1.0, lean=7.0, armF=60.0, elbF=24.0, staff=40.0, staff_lift=4.0, glow=0.5, footF=(5.0, 0.0, 0.0)), "out"),
    (1.00, k(), "io"),
]

HURT_KEYS = [
    (0.00, k(), "lin"),
    (0.15, k(dx=-2.2, drop=1.4, lean=-9.0, head_dx=-1.0, head_dy=-0.4, armN=-24.0, elbN=40.0, armF=14.0, elbF=46.0, staff=-9.0, footF=(1.8, 0.8, 8.0)), "out3"),
    (0.40, k(dx=-1.4, drop=1.9, lean=-4.0, head_dx=-0.4, armN=-12.0, elbN=26.0, armF=22.0, elbF=42.0, staff=-3.0), "io"),
    (1.00, k(), "io"),
]

# Defeat: the book slips from his hand, he clutches the staff and slides down it to his knees, then pitches
# forward with it; the lantern goes out.
_J0 = Priest().joints(REST)
_SX = _J0["staff_bottom"][0] - BUILD.root_x  # where the staff stands
_HF = GROUND - _J0["handF"][1]  # how high the far hand holds it
_PLANT = dict(staff_free=1.0, staff_at=(_SX, 0.0), staff=2.0, book_free=1.0)
_KNEES = dict(footN=(-8.0, 3.0, -110.0), footF=(-6.5, 3.0, -110.0))
_PRONE = dict(dx=3.5, drop=13.2, lean=90.0, staff_free=1.0, staff_at=(_SX, 0.8), staff=88.0, book_free=1.0, book_at=(-13.0, 0.0),
              reachF=(_SX + 16.0, 2.4), reachF_w=1.0, armN=-84.0, elbN=6.0, footN=(-15.0, 1.5, -100.0), footF=(-13.5, 1.5, -100.0), glow=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.08, k(dx=-2.0, drop=1.0, lean=-10.0, head_dx=-1.0, head_rot=-10.0, armF=20.0, elbF=55.0, staff=-10.0, armN=0.0, elbN=80.0), "out3"),
    (0.24, k(dx=-2.5, drop=1.6, lean=4.0, head_dy=0.4, armN=30.0, elbN=40.0, reachF=(_SX + 0.4, _HF), reachF_w=1.0, reachN=(_SX - 0.3, _HF - 4.0), reachN_w=0.6,
             book_at=(-4.0, 9.0), **_PLANT), "io"),
    (0.46, k(dx=-1.0, drop=8.4, lean=8.0, reachF=(_SX + 0.3, 13.0), reachF_w=1.0, reachN=(_SX - 0.3, 10.0), reachN_w=1.0, book_at=(-13.0, 0.0), **_PLANT, **_KNEES), "in"),
    (0.52, k(dx=-1.0, drop=7.9, lean=6.0, head_dy=-0.2, reachF=(_SX + 0.3, 13.0), reachF_w=1.0, reachN=(_SX - 0.3, 10.0), reachN_w=1.0, book_at=(-13.0, 0.0),
             **_PLANT, **_KNEES), "out"),
    (0.70, k(dx=-1.0, drop=8.8, lean=16.0, head_dy=1.2, head_rot=22.0, reachF=(_SX + 0.3, 10.0), reachF_w=1.0, reachN=(_SX - 0.3, 7.5), reachN_w=1.0, glow=0.03,
             book_at=(-13.0, 0.0), **_PLANT, **_KNEES), "io"),
    (0.84, k(dx=2.0, drop=11.0, lean=55.0, reachF=(_SX + 8.0, 9.0), reachF_w=1.0, reachN=(_SX + 4.0, 6.0), reachN_w=0.4, glow=0.02, book_at=(-13.0, 0.0),
             **{**_PLANT, "staff": 50.0}, footN=(-11.5, 2.0, -110.0), footF=(-10.0, 2.0, -110.0)), "in"),
    (0.92, k(**_PRONE), "lin"),
    (0.96, k(**{**_PRONE, "drop": 12.4, "lean": 84.0}), "out"),
    (1.00, k(**_PRONE), "in"),
]

STILL = lambda t: (-0.12, 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [180] * 12, True, lambda t: (-0.16 + 0.14 * math.sin(math.tau * t), 0.0)),
    "run": Anim("run", run_pose, [i / 12 for i in range(12)], [46] * 12, True, lambda t: (-1.5, 0.0)),
    "attack": Anim("attack", keyed(SMITE_KEYS), [0.0, 0.11, 0.22, 0.36, 0.41, 0.46, 0.52, 0.58, 0.65, 0.72, 0.86, 1.0],
                   [80, 70, 90, 110, 40, 50, 80, 90, 70, 80, 90, 110], False, STILL),
    "cast": Anim("cast", keyed(CAST_KEYS), [0.0, 0.1, 0.2, 0.29, 0.37, 0.45, 0.53, 0.60, 0.65, 0.70, 0.77, 0.85, 0.93, 1.0],
                 [100, 90, 110, 80, 80, 90, 110, 130, 70, 90, 90, 100, 100, 140], False, cast_air),
    "hurt": Anim("hurt", keyed(HURT_KEYS), [0.0, 0.08, 0.15, 0.4, 0.7, 1.0], [40, 50, 90, 80, 80, 80], False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.04, 0.08, 0.16, 0.24, 0.31, 0.38, 0.46, 0.52, 0.61, 0.70, 0.77, 0.84, 0.88, 0.92, 0.96, 1.0],
                  [50, 40, 70, 80, 90, 70, 60, 60, 80, 110, 160, 80, 60, 50, 60, 100, 1200], False, STILL),
}
