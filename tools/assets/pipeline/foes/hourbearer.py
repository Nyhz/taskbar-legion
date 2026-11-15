"""Hour Bearer — world 10, support. A stooped porter in a ragged wine-red cloak, nothing under the hood but two cold
lit eyes, with a carrying frame strapped to its back that ends in a tall fork, and in the fork a big hourglass of
pale silver turning over its head. The sand in it is the Rift's cold light, violet-white: it runs down in a bright
thread, and when the top bulb is empty the bearer hitches its shoulders and the glass swings over to start again
— that loop is its aura. It shuffles along bent under the load with the glass rocking in its fork. To attack it
rears back and throws the whole frame forward: the glass tips over its head and a long arc of lit sand pours out
and is flung ahead. When it dies the glass tears out of the fork and bursts on the road in front; the sand flies
up as sparks and goes dark, its eyes go out, and it sinks down on its knees and stays there, upright, under the
empty fork.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Character, Gait, Pose, Pt, gait_legs, keyed, stagger_keys

FIGURE = ("Hourbearer", "foe", "w10")

BUILD = Build(root_x=40, thigh=5.6, shin=5.4, foot=3.6, hip_dx=1.4, spine=9.8, sh_near=3.0, sh_far=2.6, upper=5.2, fore=5.0, neck=0.4, head_dx=1.6,
              min_pelvis=3.4)

L = {
    "a": ("dusk", 1), "b": ("dusk", 2), "c": ("dusk", 3), "d": ("dusk", 5), "e": ("dusk", 6),
    "k": ("ink", 0), "l": ("leather", 5), "m": ("leather", 3),
}

# A deep hood with its peak forward; inside it only the dark and an eye (E).
HEAD = [
    "...bccd...",
    "..bccdde..",
    ".bbccddee.",
    ".bbcckkke.",
    ".bbckkEkE.",
    ".bbckkkk..",
    "..bcckk...",
    "..abcc....",
]
# The cloak, the frame's strap across it, and a ragged hem.
TORSO = [
    ".bcdde..",
    "bbcldde.",
    "bbccldd.",
    "bbccdle.",
    "bbccdde.",
    "abccdde.",
    "abbcdde.",
    "abbccdd.",
    "ab.bc.dd",
]

POLE = 31.0
#: The sand it pours out: where it lands (x from the root, height above the ground).
SAND_TO = (46.0, 5.0)
#: The fork at the top of the frame: how far below the glass's pivot its bar sits, and half its width.
FORK_DROP, FORK_HALF = 10.0, 8.0


def turned(J: dict[str, Pt], lean: float, x: float, y: float) -> Pt:
    """An offset from the chest that turns with the torso."""
    a = math.radians(lean)
    cx, cy = J["chest"]
    return (cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a))


class Hourbearer(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        # The frame is strapped to the back: it stands on the hips and tips with `pole` (0 = straight up,
        # positive = forward). The glass hangs in the yoke at its top until the pose lets it go.
        base = turned(J, pose.get("lean", 0.0), -3.2, 6.0)
        p = math.radians(pose["pole"])
        top = (base[0] + math.sin(p) * POLE, min(base[1] - math.cos(p) * POLE, GROUND - 2.0))
        J["frame_base"], J["frame_top"] = base, top
        w = pose.get("glass_free", 0.0)
        if w > 0.001:
            ax, ay = pose["glass_at"]
            J["glass"] = (top[0] + (BUILD.root_x + ax - top[0]) * w, top[1] + (GROUND - ay - top[1]) * w)
        else:
            J["glass"] = top
        return J

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        cel.limb(J["hip" + s], J["knee" + s], 3.6, 3.0, "dusk", (1, 2, 4), far=far)
        cel.limb(J["knee" + s], J["ankle" + s], 3.0, 2.4, "leather", (2, 3, 5), far=far)
        a_, t_ = J["ankle" + s], J["toe" + s]
        cel.limb((a_[0] - 0.8, a_[1] + 0.4), (t_[0], t_[1] + 0.2), 2.4, 2.0, "leather", (1, 3, 4), far=far)

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 3.2, 2.8, "dusk", (2, 3, 5) if far else (3, 5, 6), far=far)
        cel.limb(el, hd, 2.8, 2.4, "dusk", (2, 4, 5) if far else (3, 5, 6), far=far)
        cel.put(hd[0], hd[1], ("bone", 3 if far else 5))
        cel.put(hd[0] + 1, hd[1], ("bone", 2 if far else 4))

    @staticmethod
    def glass(cel: Cel, c: Pt, turn: float, sand: float, glow: float) -> None:
        """The hourglass, turned `turn` degrees about its waist: two silver caps, two posts, two bulbs, and the
        sand — `sand` is how much of it is still in the bulb that starts on top."""
        a = math.radians(turn)
        ca, sa = math.cos(a), math.sin(a)
        first_up = ca > 0
        lit = ("violet", 7) if glow > 0.6 else ("violet", 5) if glow > 0.25 else ("ink", 4)
        core = ("light", 0) if glow > 0.6 else ("violet", 7) if glow > 0.25 else ("ink", 5)
        cx, cy = int(math.floor(c[0])), int(math.floor(c[1]))
        for py in range(cy - 11, cy + 12):
            for px in range(cx - 11, cx + 12):
                dx, dy = px + 0.5 - c[0], py + 0.5 - c[1]
                u, v = dx * ca + dy * sa, -dx * sa + dy * ca
                av, au = abs(v), abs(u)
                if av >= 9.0 or au >= 6.0 or py > GROUND - 1:
                    continue
                if av >= 7.0:
                    cel.put(px, py, ("ink", 5) if dx < -2.5 else ("ink", 8) if dx < 2.0 else ("ink", 9))
                    continue
                hw = 1.0 + 3.7 * (av / 7.0) ** 0.75
                if au <= hw:
                    f = sand if v < 0 else 1.0 - sand
                    up = (v < 0) == first_up
                    full = f > 0.04 and (av < 7.0 * f ** 0.6 if up else av > 7.0 * (1.0 - 0.85 * f ** 0.7))
                    if au > hw - 1.0:
                        cel.put(px, py, ("violet", 7) if dx > 0 else ("violet", 4))
                    elif full:
                        cel.put(px, py, core if au < 1.0 else lit)
                    else:
                        cel.put(px, py, ("violet", 1))
                elif 4.7 <= au < 5.9:
                    cel.put(px, py, ("ink", 5) if dx < 0 else ("ink", 7))

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        glow = pose.get("glow", 1.0)
        turn = pose.get("turn", 0.0) + pose.get("swing", 0.0)
        sand = pose.get("sand", 0.5)
        shatter = pose.get("shatter", 0.0)
        Lg = {**L, "E": ("light", 0) if glow > 0.6 else ("violet", 6) if glow > 0.15 else ("ink", 1)}
        # The frame goes up behind the head: two posts, a crossbar, and a fork whose prongs hold the glass's pivot.
        base, top = J["frame_base"], J["frame_top"]
        p = math.radians(pose["pole"])
        ux, uy = math.sin(p), -math.cos(p)  # up the pole
        nx, ny = math.cos(p), math.sin(p)   # across it
        bar = (top[0] - ux * FORK_DROP, top[1] - uy * FORK_DROP)
        cel.limb((base[0] - nx * 1.4, base[1] - ny * 1.4), (bar[0] - nx * 1.4, bar[1] - ny * 1.4), 1.6, 1.4, "leather", (2, 3, 5))
        cel.limb((base[0] + nx * 1.4, base[1] + ny * 1.4), (bar[0] + nx * 1.4, bar[1] + ny * 1.4), 1.6, 1.4, "leather", (3, 5, 6))
        mid = ((base[0] + bar[0]) / 2, (base[1] + bar[1]) / 2)
        cel.line((mid[0] - nx * 2.2, mid[1] - ny * 2.2), (mid[0] + nx * 2.2, mid[1] + ny * 2.2), ("leather", 4))
        left, right = (bar[0] - nx * FORK_HALF, bar[1] - ny * FORK_HALF), (bar[0] + nx * FORK_HALF, bar[1] + ny * FORK_HALF)
        cel.limb(left, right, 1.6, 1.6, "leather", (3, 5, 6))
        for side, ramp in ((left, (2, 4, 5)), (right, (3, 5, 6))):
            tip = (side[0] + ux * FORK_DROP, side[1] + uy * FORK_DROP)
            cel.limb(side, tip, 1.6, 1.4, "leather", ramp)
            cel.put(tip[0], tip[1], ("ink", 8))  # the pivot's pin
        self.arm(cel, J, "F", far=True)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        cel.stamp_lean(TORSO, L, (px + 0.5, py), 3, lean)
        hx, hy = J["head"]
        hturn = pose.get("head_rot", 0.0) + (lean if abs(lean) > 30 else 0.0)
        cel.stamp_turn(HEAD, Lg, (hx, hy + 1), 4, hturn)
        self.arm(cel, J, "N", far=False)
        c = J["glass"]
        g = (BUILD.root_x + pose["glass_at"][0], GROUND - 1.0) if "glass_at" in pose else c
        if shatter < 0.02:
            self.glass(cel, c, turn, sand, glow)
        else:
            # Broken: the two caps lie apart, and what is left of the sand is a heap between them, going dark.
            for i in range(-3, 3):
                cel.put(g[0] - 8 + i, GROUND - 1, ("ink", 5 if i < 0 else 7))
                cel.put(g[0] - 8 + i, GROUND - 2, ("ink", 8 if i < 1 else 9))
            for i in range(0, 6):
                cel.put(g[0] + 6 + i * 0.6, GROUND - 1 - i * 0.9, ("ink", 7 if i < 3 else 9))
                cel.put(g[0] + 7 + i * 0.6, GROUND - 1 - i * 0.9, ("ink", 5 if i < 3 else 7))
            heap = ("violet", 7) if glow > 0.6 else ("violet", 5) if glow > 0.25 else ("ink", 4)
            crest = ("light", 0) if glow > 0.6 else ("violet", 6) if glow > 0.25 else ("ink", 5)
            for i in range(-4, 5):
                cel.put(g[0] + i, GROUND - 1, heap)
                if abs(i) < 3:
                    cel.put(g[0] + i, GROUND - 2, heap if abs(i) > 1 else crest)
                if abs(i) < 2:
                    cel.put(g[0] + i, GROUND - 3, crest if i == 0 else heap)
            if shatter > 0.6:
                for ox in (-12, -3, 12):  # splinters left on the road
                    cel.put(g[0] + ox, GROUND - 1, ("ink", 9))
        cel.outline()

        # The lit thread of sand, and the dust of light it gives off.
        upright = abs(math.sin(math.radians(turn))) < 0.3
        top_fill = sand if math.cos(math.radians(turn)) > 0 else 1.0 - sand
        if shatter < 0.02 and upright and 0.04 < top_fill < 0.985 and glow > 0.25 and pose.get("glass_free", 0.0) < 0.3:
            low = 7.0 * (1.0 - 0.85 * (1.0 - top_fill) ** 0.7)
            for i in range(0, int(low) + 1):
                cel.put(c[0], c[1] + i, ("light", 0))
        ph = pose.get("flick", 0.0)
        if shatter < 0.02 and glow > 0.6:
            for i in range(4):
                u = (ph + i / 4) % 1.0
                side = -1 if i % 2 else 1
                cel.soft(c[0] + side * (7.5 + 2.5 * u) + math.sin(math.tau * (u + i * 0.21)) * 0.8, max(1.0, c[1] + 5.0 - 13.0 * u),
                         ("light", 0) if u < 0.4 else ("violet", 8) if u < 0.75 else ("violet", 6))
        glint = pose.get("glint", 0.0)
        if 0.05 < glint < 0.95:
            cel.star(c[0] + 4.0, max(2.0, c[1] - 7.0), 2 if 0.3 < glint < 0.7 else 1)
        pour = pose.get("pour", 0.0)
        if 0.01 < pour < 0.985:
            a = math.radians(turn)
            self.pour(cel, (c[0] + math.sin(a) * 9.0, c[1] - math.cos(a) * 9.0), pour)
        if 0.02 <= shatter < 0.985:
            s = shatter
            for i in range(7):  # splinters of glass
                ang = math.radians(-165 + i * 25.0)
                d = 2.0 + 13.0 * s
                y = g[1] - 1.0 + math.sin(ang) * d * 0.75 + 10.0 * s * s
                if y < GROUND - 1 and s < 0.7:
                    cel.soft(g[0] + math.cos(ang) * d, y, ("ink", 9) if i % 2 else ("violet", 7))
            for i in range(9):  # the sand going up as sparks, and out
                u = min(1.0, s * (0.75 + 0.06 * i))
                x = g[0] + (i - 4) * (0.8 + 2.2 * u) + math.sin(math.tau * (u + i * 0.37)) * 1.2
                y = g[1] - 2.0 - (10.0 + 3.0 * (i % 3)) * u ** 0.7
                if u < 0.92:
                    cel.soft(x, max(1.0, y), ("light", 0) if u < 0.4 else ("violet", 8) if u < 0.65 else ("violet", 6) if u < 0.82 else ("violet", 4))
            if s < 0.25:
                cel.star(g[0], g[1] - 3.0, 2)

    @staticmethod
    def pour(cel: Cel, start: Pt, u: float) -> None:
        """The sand poured out of the tipped glass: a ribbon of light — white at its core, violet at its edge, thin
        where it leaves the glass and five or six pixels wide near its head — that flies ahead shedding lit grains
        and bursts where it lands."""
        x1, y1 = BUILD.root_x + SAND_TO[0], GROUND - SAND_TO[1]

        def at(s: float) -> Pt:
            return (start[0] + (x1 - start[0]) * s, start[1] + (y1 - start[1]) * s * s - 12.0 * math.sin(math.pi * s) * (1.0 - 0.4 * s))

        best: dict[tuple[int, int], int] = {}

        def dab(x: float, y: float, w: float) -> None:
            r = int(math.ceil(w)) + 1
            fx, fy = int(math.floor(x)), int(math.floor(y))
            for oy in range(-r, r + 1):
                for ox in range(-r, r + 1):
                    d = math.hypot(fx + ox + 0.5 - x, fy + oy + 0.5 - y)
                    if d <= w + 0.35:
                        rank = 3 if d <= max(0.6, w * 0.45) else 2 if d <= w * 0.8 else 1
                        if best.get((fx + ox, fy + oy), 0) < rank:
                            best[(fx + ox, fy + oy)] = rank

        head, tail = min(1.0, u / 0.42), max(0.0, (u - 0.30) / 0.45)
        if tail < 1.0:
            n = 90
            for i in range(n + 1):
                q = i / n  # 0 at the tail, 1 at the head
                w = 0.6 + 2.3 * min(1.0, q / 0.7) ** 0.8
                if q > 0.9:
                    w *= 0.4 + 0.6 * math.sqrt(max(0.0, 1.0 - ((q - 0.9) / 0.1) ** 2))
                x, y = at(tail + (head - tail) * q)
                dab(x, y, w)
            tones = {3: ("light", 0), 2: ("violet", 8), 1: ("violet", 6)}
            for (px, py), rank in best.items():
                if 0 <= px < cel.w and 0 <= py < GROUND:
                    cel.px[(px, py)] = tones[rank]
            # Grains shed along it, and a few trailing where its tail has been.
            for j in range(8):
                x, y = at(tail + (head - tail) * (j + 0.5) / 8)
                cel.soft(x - 2.0 - (j % 2), y + 4.0 + (j % 3), ("violet", 8) if j % 2 else ("violet", 6))
                if j % 2:
                    cel.soft(x + 1.5, y - 4.0 - (j % 3) * 0.5, ("light", 0))
            for j in range(1, 6):
                sj = tail - 0.045 * j
                if sj >= 0.0:
                    x, y = at(sj)
                    cel.soft(x + (j % 2) - 0.5, y + 1.4 * j, ("light", 0) if j < 2 else ("violet", 8) if j < 4 else ("violet", 6))
            if head < 1.0:
                hx, hy = at(head)
                cel.star(hx, hy, 2)
        if u > 0.42:
            v = (u - 0.42) / 0.58
            # Where it lands: a white flash, a ring of sparks thrown up and out, and a splash along the road.
            if v < 0.5:
                rad = 3.8 if v < 0.22 else 3.0
                for oy in range(-5, 6):
                    for ox in range(-5, 6):
                        d = math.hypot(ox, oy)
                        if d <= rad and y1 + oy < GROUND:
                            cel.put(x1 + ox, y1 + oy, ("light", 0) if d <= rad * 0.55 else ("violet", 8) if d <= rad * 0.85 else ("violet", 6))
            if v < 0.75:
                cel.star(x1, y1, 4 if v < 0.22 else 3 if v < 0.5 else 1)
            for i in range(10):
                ang = math.radians(i * 36.0 + 10.0)
                d = 4.0 + 5.5 * v ** 0.7
                x, y = x1 + math.cos(ang) * d, y1 + math.sin(ang) * d * 0.85 + 4.0 * v * v
                if y < GROUND - 0.5 and v < 0.95 and x < cel.w - 1:
                    tone = ("light", 0) if v < 0.4 else ("violet", 8) if v < 0.7 else ("violet", 6) if i % 2 else ("violet", 4)
                    cel.soft(x, y, tone)
                    if v < 0.7:
                        cel.soft(x - math.cos(ang), y - math.sin(ang), ("violet", 8) if v < 0.55 else ("violet", 6))
                        cel.soft(x - 2 * math.cos(ang), y - 2 * math.sin(ang), ("violet", 6))
            for i in range(-6, 7):
                if v < 0.85 and x1 + i * (0.8 + 0.3 * v) < cel.w - 1:
                    cel.soft(x1 + i * (0.8 + 0.3 * v), GROUND - 1, ("light", 0) if abs(i) < 3 and v < 0.45 else ("violet", 7) if abs(i) < 5 else ("violet", 5))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=1.6, lean=20.0, footN=(-3.0, 0.0, 0.0), footF=(3.2, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=30.0, elbN=100.0, armF=38.0, elbF=92.0, pole=7.0, head_dx=0.0, head_dy=0.0, head_rot=4.0, breath=0.0,
                  turn=0.0, swing=0.0, sand=0.5, glow=1.0, flick=0.0, glint=0.0, pour=0.0, shatter=0.0, glass_free=0.0, glass_at=(27.0, 9.0))

# The idle loop: the glass starts half run (as it is in every other clip), runs out, swings over, and runs back
# down to half — so the game can leave or enter the loop at its seam without the sand jumping.
RUN_A, RUN_B = 0.36, 0.64


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    base = {**BASE, "drop": 1.6 + 0.4 * s, "lean": 20.0 + 1.0 * s, "pole": 7.0 + 1.5 * s, "flick": ph * 2.0, "head_rot": 4.0 + 2.0 * s}
    if ph < RUN_A:
        return {**base, "sand": 0.5 * (1.0 - ph / RUN_A)}
    if ph >= RUN_B:
        return {**base, "turn": 180.0, "sand": 0.5 * (ph - RUN_B) / (1.0 - RUN_B)}
    # The turn: the bearer hitches the frame and the glass swings over, end for end.
    f = (ph - RUN_A) / (RUN_B - RUN_A)
    e = f * f * (3 - 2 * f)
    hitch = math.sin(math.pi * min(1.0, f / 0.6))
    return {**base, "drop": base["drop"] - 1.4 * hitch, "lean": base["lean"] - 5.0 * hitch, "pole": base["pole"] + 4.0 * hitch, "turn": 180.0 * e, "sand": 0.0,
            "head_rot": base["head_rot"] - 10.0 * hitch, "armN": 30.0 - 8.0 * hitch, "armF": 38.0 - 8.0 * hitch, "glint": 0.06 + 0.88 * f}


def shuffle_pose(ph: float) -> Pose:
    c = math.cos(math.tau * ph)
    p: Pose = gait_legs(Gait(stride=0.9, give=1.3, lift=0.8, toe=0.8, run=True, air=0.6), ph)
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 27.0 + 2.5 * math.cos(2 * math.tau * ph), "hip_rot": -0.5 * c, "sh_rot": 0.4 * c, "armN": 32.0 + 4.0 * c, "armF": 40.0 - 4.0 * c,
              "pole": 12.0 + 4.0 * math.cos(2 * math.tau * (ph - 0.12)), "swing": -14.0 * math.cos(2 * math.tau * (ph - 0.2)), "head_rot": 8.0 + 3.0 * c,
              "flick": 2 * ph})
    p["dy"] = p.get("dy", 0.0) + 0.6
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Pour: it rears back under the load, then throws its whole back forward; the frame comes down over its head, the
# glass tips right over and a long arc of lit sand pours out of it and is flung ahead.
POUR_KEYS = [
    (0.00, k(), "lin"),
    (0.22, k(dx=-0.8, drop=2.0, lean=8.0, pole=-10.0, swing=10.0, head_rot=-8.0, armN=20.0, elbN=110.0, armF=28.0, elbF=100.0, footN=(-2.2, 0.0, 0.0), footF=(3.8, 0.0, 0.0)), "out"),
    (0.42, k(dx=-1.6, drop=3.0, lean=-2.0, pole=-24.0, swing=-16.0, head_rot=-14.0, armN=10.0, elbN=116.0, armF=20.0, elbF=104.0, footN=(-1.6, 0.0, 0.0), footF=(4.4, 0.6, 8.0),
             glow=1.3), "io"),
    (0.50, k(dx=1.2, drop=2.6, lean=34.0, pole=20.0, swing=100.0, head_rot=12.0, armN=44.0, elbN=70.0, armF=52.0, elbF=60.0, footN=(-4.6, 0.0, -20.0), footF=(3.4, 0.0, 0.0),
             pour=0.22, glow=1.3), "in"),
    (0.58, k(dx=1.6, drop=3.2, lean=38.0, pole=24.0, swing=112.0, head_rot=14.0, armN=48.0, elbN=66.0, armF=56.0, elbF=56.0, footN=(-5.0, 0.0, -24.0), footF=(3.0, 0.0, 0.0),
             pour=0.42), "lin"),
    (0.76, k(dx=1.2, drop=2.4, lean=30.0, pole=18.0, swing=40.0, head_rot=8.0, footN=(-4.0, 0.0, -10.0), footF=(3.0, 0.0, 0.0), pour=0.74), "io"),
    (0.90, k(dx=0.6, drop=1.8, lean=22.0, pole=10.0, swing=-8.0, footN=(-3.4, 0.0, -4.0), pour=0.94), "out"),
    (1.00, k(pour=1.0), "io"),
]

# Hit: bent double already, the load throws it about; the glass swings wildly in its yoke and the light stutters.
HURT_KEYS = stagger_keys(BASE, push=4.2, bend=14.0, buckle=2.2, whip=20.0, over={
    "impact": dict(pole=-6.0, swing=26.0, glow=1.2, armN=40.0, elbN=80.0, armF=46.0, elbF=70.0),
    "mid": dict(pole=-18.0, swing=40.0, glow=0.5, armN=60.0, elbN=50.0, armF=14.0, elbF=80.0),
    "reel": dict(pole=-24.0, swing=-30.0, glow=0.4, armN=70.0, elbN=40.0, armF=-6.0, elbF=70.0),
    "catch": dict(pole=14.0, swing=20.0, glow=0.5, armN=30.0, elbN=96.0, armF=38.0, elbF=86.0),
    "recover": dict(pole=9.0, swing=-8.0, glow=0.8, armN=30.0, elbN=100.0, armF=38.0, elbF=92.0),
})

# Death: the blow rocks it back and the frame whips forward; the glass tears out of the fork, turns over in the air
# and bursts on the road in front — the sand flies up as sparks and goes out, and so do its eyes. The bearer sinks
# straight down onto its knees and stays there, upright, head on its chest, under the empty fork.
_SIT = dict(dx=-1.0, drop=7.2, lean=10.0, head_rot=38.0, armN=6.0, elbN=14.0, armF=14.0, elbF=10.0, footN=(-3.8, 0.3, -76.0), footF=(-2.2, 0.3, -76.0), pole=2.0,
            glass_free=1.0, glass_at=(27.0, 9.0))
_SUNK = {**_SIT, "lean": 14.0, "drop": 7.8, "head_rot": 42.0}
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.09, k(dx=-1.6, drop=1.0, lean=2.0, pole=-18.0, swing=34.0, head_rot=-22.0, armN=60.0, elbN=40.0, armF=-6.0, elbF=70.0, footN=(-1.6, 0.0, 0.0), footF=(4.2, 1.0, 10.0), glow=1.3), "out3"),
    (0.22, k(dx=-0.6, drop=3.6, lean=24.0, pole=26.0, swing=-40.0, head_rot=8.0, armN=30.0, elbN=50.0, armF=30.0, elbF=40.0, footN=(-3.0, 0.0, -10.0), footF=(2.6, 0.0, 0.0)), "io"),
    (0.34, k(dx=-0.8, drop=5.6, lean=16.0, pole=10.0, head_rot=20.0, armN=16.0, elbN=30.0, armF=20.0, elbF=24.0, footN=(-3.6, 0.2, -50.0), footF=(-1.0, 0.0, -30.0),
             glass_free=0.5, glass_at=(22.0, 36.0), turn=80.0), "io"),
    (0.46, k(**_SIT, turn=160.0, glow=1.1), "in"),
    (0.50, k(**_SIT, turn=170.0, glow=1.3, shatter=0.02), "lin"),
    (0.64, k(**{**_SIT, "lean": 13.0, "drop": 7.6}, turn=170.0, glow=0.9, shatter=0.4), "out"),
    (0.82, k(**_SUNK, turn=170.0, glow=0.4, shatter=0.8), "lin"),
    (1.00, k(**_SUNK, turn=170.0, glow=0.0, shatter=1.0), "lin"),
]

STILL = lambda t: (0.0, 0.0)  # noqa: E731

_IDLE_T = ([RUN_A * i / 5 for i in range(5)] + [RUN_A + (RUN_B - RUN_A) * f for f in (0.0, 0.3, 0.52, 0.74)]
           + [RUN_B + (1.0 - RUN_B) * i / 5 for i in range(5)])

ANIMS = {
    "idle": Anim("idle", idle_pose, _IDLE_T, [100] * 5 + [70, 60, 60, 80] + [100] * 5, True, STILL),
    "run": Anim("run", shuffle_pose, [i / 10 for i in range(10)], [55] * 10, True, STILL),
    "attack": Anim("attack", keyed(POUR_KEYS), [0.0, 0.10, 0.20, 0.31, 0.42, 0.50, 0.58, 0.66, 0.75, 0.84, 0.92, 1.0],
                   [70, 80, 100, 110, 150, 40, 60, 60, 70, 70, 90, 110], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.045, 0.09, 0.155, 0.22, 0.28, 0.34, 0.40, 0.46, 0.50, 0.55, 0.60, 0.64, 0.73, 0.82, 0.91, 1.0],
                  [50, 40, 80, 70, 80, 70, 70, 50, 50, 50, 60, 70, 80, 110, 150, 220, 1200], False, STILL),
}
