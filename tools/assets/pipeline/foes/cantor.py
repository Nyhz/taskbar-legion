"""Storm Cantor — world 9, caster. A cleric of the citadel who no longer touches the ground: a dark cowl around a
gold mask, a crimson stole, a robe that ends in rags trailing in the air, a gold halo turning over the head and a
censer swinging on its chain. It glides. To attack it rises, lifts a hand until the halo blazes, and points: a bolt
of lightning comes down in front of it. When it dies the storm lets go of it — it hangs limp for a moment, drops,
and is a heap of robe on the marble with the halo ringing to a stop beside it.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Pose, Pt, keyed, loose, stagger_keys

FIGURE = ("Cantor", "foe", "w09")

# The legs are never seen: they only set how high the body hangs (the pose's `drop` is negative while it floats).
BUILD = Build(root_x=40, thigh=5.0, shin=5.0, foot=3.0, hip_dx=1.0, spine=9.0, sh_near=3.0, sh_far=2.6, upper=5.6, fore=5.4, neck=0.8, head_dx=0.6, min_pelvis=3.0)


def _rows(*rows: str) -> list[str]:
    w = max(len(r) for r in rows)
    return [r.ljust(w, ".") for r in rows]


L = {
    "k": ("ink", 1), "l": ("ink", 2), "m": ("ink", 3), "n": ("ink", 4), "o": ("ink", 5),
    "j": ("brass", 4), "J": ("brass", 5), "K": ("brass", 6),
    "r": ("crimson", 3), "s": ("crimson", 4), "t": ("crimson", 5),
}

# A deep cowl; inside it a smooth gold mask with one eye slit (G glows).
HEAD = _rows(
    "..lmmn...",
    ".lmmnnoo.",
    ".lmnnooo.",
    "llmnjJJK.",
    "llmnjGJK.",
    ".lmnjJJK.",
    ".llmnjJ..",
    "..llmnn..",
    "...lmm...",
)
# The robe's body with a crimson stole down the front and a gold clasp.
TORSO = _rows(
    "..lmnno..",
    ".llmnnoo.",
    "llmrnsnoo",
    "llmrnsnoo",
    ".lmrKsno.",
    ".lmrnsno.",
    ".lmrnsno.",
    "llmrnsnoo",
    "llmmnnooo",
)

BOLT_X = 35.0  # where the lightning lands, in front of the root
ZIG = [0.0, -3.0, 2.0, -4.0, 1.0, -2.0, 3.0, -1.0, 0.0]


class Cantor(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        lean = pose.get("lean", 0.0)
        turn = pose.get("head_rot", 0.0) + (lean if abs(lean) > 24.0 else 0.0)
        a = math.radians(turn)
        hx, hy = J["head"]
        # The halo hangs over the crown, a little behind the head's motion; it is a loose prop once the storm goes.
        over = (hx + 12.0 * math.sin(a) + pose.get("halo_dx", 0.0), hy - 12.0 * math.cos(a) + pose.get("halo_dy", 0.0))
        J["halo"] = loose(pose, "halo", over, self.build.root_x)
        J["turn"] = (turn, 0.0)
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def grounded(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        def hem(dx: float) -> ChainSpec:
            return ChainSpec(Chain(5, 2.5, gravity=0.2, drag=0.2, damp=0.1), lambda J, dx=dx: (J["pelvis"][0] + dx, J["pelvis"][1] - 0.5), grounded)

        return {
            "hem_b": hem(-2.6), "hem_m": hem(0.0), "hem_f": hem(2.6),
            "censer": ChainSpec(Chain(4, 2.0, gravity=0.3, drag=0.08, damp=0.05), lambda J: J["handN"], grounded),
        }

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 3.2, 3.0, "ink", (2, 3, 5), far=far)
        cel.limb(el, hd, 3.0, 3.8, "ink", (2, 3, 5), far=far)  # a bell sleeve
        cel.put(hd[0], hd[1], ("bone", 4 if far else 6))
        cel.put(hd[0] + 1, hd[1], ("bone", 3 if far else 5))

    @staticmethod
    def ring(cel: Cel, at: Pt, tilt: float, flat: float, front: bool, tone: tuple[str, int], hot: tuple[str, int]) -> None:
        """Half of the halo: an ellipse seen from the side, the far half behind the head, the near half in front."""
        a = math.radians(tilt)
        for i in range(40):
            th = math.tau * i / 40
            if (math.sin(th) > 0) != front:
                continue
            x, y = 6.5 * math.cos(th), flat * math.sin(th)
            cel.put(at[0] + x * math.cos(a) - y * math.sin(a), at[1] + x * math.sin(a) + y * math.cos(a), hot if i % 7 == 0 else tone)

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        lit = pose.get("lit", 1.0)
        charge = pose.get("charge", 0.0)
        Lg = {**L, "G": ("light", 0) if charge > 0.5 else ("azure", 7) if lit >= 0.5 else ("azure", 4) if lit >= 0.15 else ("ink", 0)}
        gold = ("light", 0) if charge > 0.6 else ("brass", 5) if lit >= 0.3 else ("brass", 3)
        hot = ("light", 0) if lit >= 0.3 else ("brass", 4)
        flat = 2.2 - 1.2 * pose.get("halo_free", 0.0)
        tilt = pose.get("halo_tilt", -8.0)
        self.ring(cel, J["halo"], tilt, flat, False, ("brass", 4) if lit >= 0.3 else ("brass", 2), gold)
        # The robe below the waist: three trailing strips of cloth and the body of the skirt between them.
        px, py = J["pelvis"]
        self.arm(cel, J, "F", far=True)
        mid = ropes["hem_m"]
        for name, far in (("hem_b", True), ("hem_m", False), ("hem_f", False)):
            pts = ropes[name]
            n = len(pts) - 1
            for i in range(n):
                cel.limb(pts[i], pts[i + 1], 6.4 - 4.2 * i / n, 6.4 - 4.2 * (i + 1) / n, "ink", (1, 2, 4), far=far)
            cel.put(pts[-1][0], pts[-1][1] + 1, ("ink", 3))
        cel.limb((px, py - 1.0), mid[2], 8.6, 7.0, "ink", (1, 2, 4))
        cel.limb((px + 1.0, py), mid[2], 2.0, 1.6, "crimson", (2, 3, 4))  # the stole runs on down the skirt
        cel.stamp_lean(TORSO, Lg, (px, py), 4, lean)
        hx, hy = J["head"]
        cel.stamp_turn(HEAD, Lg, (hx, hy + 1), 4, J["turn"][0])
        # The censer: a chain from the near hand, a gold bowl at its end with something burning in it.
        cen = ropes["censer"]
        for i in range(len(cen) - 1):
            cel.line(cen[i], cen[i + 1], ("brass", 3))
        bx, by = cen[-1]
        for dx, dy, tone in ((0, 0, ("brass", 5)), (-1, 0, ("brass", 4)), (1, 0, ("brass", 6)), (0, 1, ("brass", 3)), (-1, 1, ("brass", 2)), (1, 1, ("brass", 4))):
            cel.put(bx + dx, by + dy, tone)
        self.arm(cel, J, "N", far=False)
        self.ring(cel, J["halo"], tilt, flat, True, gold, hot)
        cel.outline()

        if lit >= 0.3:
            cel.put(bx, by - 1, ("azure", 7))
            cel.soft(bx + (1 if int(pose.get("spark", 0.0) * 8) % 2 else -1), by - 3, ("azure", 8))
        if charge > 0.15:
            # The storm gathering: sparks crawl round the halo and jump to the raised hand.
            hx2, hy2 = J["handF"]
            for i in range(int(3 + charge * 7)):
                ang = math.tau * (i / 9 + charge * 1.7)
                cel.soft(J["halo"][0] + math.cos(ang) * (8.0 + (i % 3)), J["halo"][1] + math.sin(ang) * (3.5 + (i % 2)), ("azure", 8) if i % 2 else ("light", 0))
            for i in range(1, int(1 + charge * 6)):
                t = i / 7
                cel.soft(hx2 + (J["halo"][0] - hx2) * t + math.sin(i * 2.3 + charge * 9) * 1.5, hy2 - 2 + (J["halo"][1] - hy2) * t, ("azure", 7))
        bolt = pose.get("bolt", 0.0)
        if 0.01 < bolt < 0.985:
            self.bolt(cel, self.build.root_x + BOLT_X, bolt)

    @staticmethod
    def bolt(cel: Cel, x0: float, u: float) -> None:
        """Lightning from the top of the frame to the ground: a thin leader, the full stroke, then its afterimage."""
        top, n = 1.0, len(ZIG) - 1
        flick = -1.0 if int(u * 22) % 2 else 1.0  # the stroke jumps from frame to frame
        pts = [(x0 + ZIG[i] * flick, top + (GROUND - 1.0 - top) * i / n) for i in range(n + 1)]
        reach = min(1.0, u / 0.18)
        stroke = 0.18 <= u < 0.55
        for i in range(n):
            (ax, ay), (bx, by) = pts[i], pts[i + 1]
            steps = int(abs(by - ay)) + 1
            for sgm in range(steps):
                t = sgm / steps
                y = ay + (by - ay) * t
                if (y - top) / (GROUND - top) > reach:
                    return
                x = ax + (bx - ax) * t
                if stroke:
                    cel.put(x, y, ("light", 0))
                    cel.put(x + 1, y, ("light", 0))
                    cel.put(x - 1, y, ("azure", 8))
                    cel.put(x + 2, y, ("azure", 8))
                    cel.soft(x - 2, y, ("azure", 6))
                    cel.soft(x + 3, y, ("azure", 6))
                elif u < 0.18:
                    cel.put(x, y, ("azure", 7))
                elif (int(y) + int(u * 40)) % (2 + int((u - 0.55) * 10)) == 0:
                    cel.soft(x, y, ("azure", 6) if u < 0.8 else ("azure", 4))
        if stroke:
            # A fork half-way down, and the burst where it lands.
            fx, fy = pts[4]
            for j in range(9):
                cel.soft(fx + 1 + j * 1.2, fy + j * 0.9 + (1 if j % 3 == 0 else 0), ("azure", 8) if j < 6 else ("azure", 6))
            cel.star(x0, GROUND - 3, 4)
            for j in range(9):
                a = math.radians(-170 + j * 20.0)
                d = 4.0 + 9.0 * (u - 0.18) / 0.37
                cel.soft(x0 + math.cos(a) * d * 1.2, GROUND - 2 + math.sin(a) * d * 0.8, ("azure", 8) if j % 2 else ("light", 0))
        elif u >= 0.55:
            for j in range(-5, 6):  # the scorch it leaves
                if (j + int(u * 30)) % 2 == 0:
                    cel.soft(x0 + j, GROUND - 1, ("ink", 2))
            for j in range(3):
                cel.soft(x0 - 2 + j * 2 + math.sin(u * 9 + j) * 1.5, GROUND - 4 - (u - 0.55) * 22 - j * 2, ("ink", 5))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=-5.0, lean=3.0, footN=(-2.0, 0.0, 0.0), footF=(2.0, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=22.0, elbN=34.0, armF=38.0, elbF=74.0, head_dx=0.0, head_dy=0.0, head_rot=0.0, breath=0.0,
                  halo_dx=0.0, halo_dy=0.0, halo_tilt=-8.0, halo_free=0.0, halo_at=(0.0, 0.0), lit=1.0, charge=0.0, bolt=0.0, spark=0.0)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.18))
    later = math.sin(math.tau * (ph - 0.32))
    # It hangs in the air, rising and sinking; the halo follows a beat behind and rocks.
    return {**BASE, "drop": -5.0 + 1.3 * s, "lean": 3.0 + 1.5 * late, "head_rot": 4.0 * late, "halo_dy": 1.0 * later - 0.6 * s, "halo_tilt": -8.0 + 6.0 * later,
            "armN": 22.0 + 4.0 * late, "armF": 38.0 + 4.0 * later, "elbF": 74.0 + 6.0 * s, "spark": ph}


def glide_pose(ph: float) -> Pose:
    s = math.sin(2 * math.tau * ph)
    late = math.sin(2 * math.tau * (ph - 0.15))
    # Leaning into it, the robe streaming behind; no steps, only a slow rise and fall.
    return {**BASE, "drop": -5.4 + 0.9 * s, "lean": 13.0 + 1.5 * late, "head_rot": -6.0, "halo_dx": -1.2 + 0.4 * late, "halo_dy": 0.5 * late, "halo_tilt": -16.0 + 4.0 * late,
            "armN": 6.0 + 4.0 * late, "elbN": 24.0, "armF": 30.0 + 3.0 * s, "elbF": 60.0, "spark": 2 * ph}


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Lightning: it rises with one hand lifted until the halo blazes, then throws the hand down and the bolt falls.
CAST_KEYS = [
    (0.00, k(), "lin"),
    (0.24, k(dx=-0.8, drop=-7.0, lean=-6.0, head_rot=-10.0, armF=150.0, elbF=20.0, armN=40.0, elbN=20.0, halo_dy=-1.0, halo_tilt=-2.0, charge=0.5, spark=0.4), "out"),
    (0.44, k(dx=-1.2, drop=-8.4, lean=-9.0, head_rot=-14.0, armF=168.0, elbF=12.0, armN=52.0, elbN=14.0, halo_dy=-1.6, halo_tilt=0.0, charge=1.0, spark=0.8), "io"),
    (0.50, k(dx=1.0, drop=-4.4, lean=10.0, head_rot=10.0, armF=78.0, elbF=6.0, armN=10.0, elbN=30.0, halo_dy=1.0, halo_tilt=-14.0, charge=0.4, bolt=0.02, spark=1.0), "in"),
    (0.80, k(dx=0.6, drop=-4.6, lean=7.0, head_rot=6.0, armF=70.0, elbF=10.0, armN=14.0, elbN=30.0, halo_tilt=-10.0, bolt=0.98, spark=1.5), "lin"),
    (1.00, k(bolt=1.0, spark=2.0), "io"),
]

# Hit: knocked back through the air, it dips towards the ground, the halo jolted askew, and climbs back.
HURT_KEYS = stagger_keys(BASE, push=5.5, bend=14.0, buckle=3.0, whip=20.0, over={
    "impact": dict(armN=30.0, elbN=40.0, armF=60.0, elbF=50.0, halo_tilt=10.0, halo_dy=-1.0),
    "reel": dict(armN=-24.0, elbN=40.0, armF=110.0, elbF=30.0, halo_tilt=30.0, halo_dx=2.0, halo_dy=-2.0),
    "catch": dict(armN=30.0, elbN=30.0, armF=30.0, elbF=70.0, halo_tilt=-22.0, halo_dx=-1.0, halo_dy=1.0),
})

# Death: the storm lets go. It hangs limp, the halo slips off, then it drops and is only a heap of robe.
_HEAP = dict(dx=1.0, drop=9.0, lean=70.0, head_rot=0.0, armN=84.0, elbN=6.0, armF=96.0, elbF=-8.0, halo_free=1.0, halo_at=(19.0, 2.2), halo_tilt=0.0, lit=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-2.0, drop=-7.0, lean=-14.0, head_rot=-18.0, armN=-30.0, elbN=40.0, armF=120.0, elbF=20.0, halo_tilt=-26.0, halo_dy=-2.0), "out3"),
    (0.30, k(dx=-2.5, drop=-5.6, lean=8.0, head_rot=28.0, armN=6.0, elbN=8.0, armF=14.0, elbF=8.0, halo_free=0.4, halo_at=(6.0, 30.0), halo_tilt=30.0, lit=0.5), "io"),
    (0.42, k(dx=-2.5, drop=-5.0, lean=10.0, head_rot=32.0, armN=4.0, elbN=6.0, armF=10.0, elbF=6.0, halo_free=1.0, halo_at=(11.0, 16.0), halo_tilt=60.0, lit=0.3), "io"),
    (0.52, k(dx=-1.0, drop=2.0, lean=26.0, head_rot=20.0, armN=20.0, elbN=6.0, armF=30.0, elbF=6.0, halo_free=1.0, halo_at=(15.0, 2.4), halo_tilt=14.0, lit=0.1), "in"),
    (0.60, k(**{**_HEAP, "lean": 58.0, "drop": 8.6, "halo_at": (17.0, 6.0), "halo_tilt": -24.0}), "in"),
    (0.68, k(**{**_HEAP, "lean": 50.0, "drop": 7.6, "halo_at": (18.0, 2.4), "halo_tilt": 12.0}), "out"),
    (0.78, k(**{**_HEAP, "halo_at": (18.8, 3.4), "halo_tilt": -8.0}), "in"),
    (0.88, k(**_HEAP), "out"),
    (1.00, k(**_HEAP), "lin"),
]

HOVER = lambda t: (-0.25 + 0.25 * math.sin(math.tau * t), -0.05)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [170] * 12, True, HOVER),
    "run": Anim("run", glide_pose, [i / 10 for i in range(10)], [90] * 10, True, lambda t: (-1.1, -0.1)),
    "attack": Anim("attack", keyed(CAST_KEYS), [0.0, 0.12, 0.24, 0.34, 0.44, 0.50, 0.55, 0.60, 0.65, 0.70, 0.75, 0.80, 0.90, 1.0],
                   [80, 90, 100, 120, 190, 50, 50, 60, 60, 60, 60, 70, 90, 110], False, HOVER),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, HOVER),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.20, 0.30, 0.36, 0.42, 0.47, 0.52, 0.56, 0.60, 0.68, 0.78, 0.88, 1.0],
                  [50, 50, 90, 100, 150, 100, 110, 60, 60, 50, 70, 90, 100, 130, 1200], False, lambda t: (0.0, 0.0)),
}
