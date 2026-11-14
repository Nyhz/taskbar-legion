"""Drowned Fisher — world 3, melee. A villager the marsh kept: bloated and grey, one eye still lit, a red tunic
gone the colour of old blood under a fishing net, weed in what is left of his hair, water running off him. He
carries the gaff he fished with. He shambles; to attack he reaches out the full length of the pole, sets the hook
and YANKS it back with his whole weight. He does not fall when he dies: the water takes him back — a puddle
spreads under him and he sinks into it, arms last, leaving the gaff on the planks.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, ik, keyed, lerp, loose, stagger_keys

FIGURE = ("Drowned", "foe", "w03")

BUILD = Build(root_x=40, thigh=6.0, shin=5.8, foot=4.2, hip_dx=1.6, spine=10.4, sh_near=3.8, sh_far=3.2, upper=6.2, fore=6.0, neck=0.6, head_dx=0.8)

L = {
    "a": ("bone", 2), "b": ("bone", 3), "c": ("bone", 4), "d": ("bone", 5), "e": ("bone", 6), "B": ("bone", 7),
    "k": ("ink", 1), "h": ("ink", 2), "g": ("brass", 5),
    "M": ("moss", 5), "N": ("moss", 7),
    "q": ("crimson", 1), "s": ("crimson", 2), "t": ("crimson", 3), "u": ("crimson", 4), "v": ("crimson", 5),
    "n": ("leather", 5), "l": ("leather", 1), "m": ("leather", 2), "o": ("leather", 3),
}

# A swollen bald head hung with weed, a heavy brow over one eye still lit (G), the jaw hanging open on its teeth.
HEAD = [
    "...MhhMN...",
    "..Mbccdd.N.",
    ".Mbccddde..",
    ".abccdkkkde",
    ".abccdkGgde",
    ".abbccdddd.",
    ".Mabckkkkd.",
    ".M.abkBkB..",
    ".N.aabccd..",
    "....aabc...",
]
# A red tunic under a net (n), split over a pale swollen belly with barnacles on it, a rope at the hips.
TORSO = [
    "...sttuN...",
    ".MsttuuvvN.",
    "qssnttunvvM",
    "qsnttnuuvnv",
    "qnsttunuvvn",
    "qssnttunvv.",
    "qqsttuuuvv.",
    ".qbccdddBv.",
    ".abccddddd.",
    "..abcBddd..",
    "..llmmnoo..",
]

GAFF_UP, GAFF_DOWN = 15.0, 7.0


def gaff_points(grip: Pt, angle: float) -> tuple[Pt, Pt, Pt]:
    """Butt, tip and hook point of the gaff; `angle` is where the hooked end points (0 = straight ahead)."""
    a = math.radians(angle)
    d, n = (math.cos(a), math.sin(a)), (-math.sin(a), math.cos(a))
    tip = (grip[0] + d[0] * GAFF_UP, grip[1] + d[1] * GAFF_UP)
    butt = (grip[0] - d[0] * GAFF_DOWN, grip[1] - d[1] * GAFF_DOWN)
    hook = (tip[0] + n[0] * 3.4 - d[0] * 2.6, tip[1] + n[1] * 3.4 - d[1] * 2.6)
    return butt, tip, hook


def draw_gaff(cel: Cel, grip: Pt, angle: float) -> None:
    butt, tip, hook = gaff_points(grip, angle)
    a = math.radians(angle)
    n = (-math.sin(a), math.cos(a))
    cel.limb(butt, tip, 1.8, 1.6, "leather", (2, 4, 6))
    bend = (tip[0] + n[0] * 3.0 + math.cos(a) * 1.4, tip[1] + n[1] * 3.0 + math.sin(a) * 1.4)
    cel.limb(tip, bend, 1.8, 1.6, "ink", (4, 6, 8))
    cel.limb(bend, hook, 1.6, 0.9, "ink", (4, 6, 8))
    cel.put(hook[0], hook[1], ("ink", 9))


class Drowned(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        grip = loose(pose, "gaff", J["handN"], self.build.root_x)
        w = pose.get("two", 0.0) * (1.0 - pose.get("gaff_free", 0.0))
        if w > 0.01:
            a = math.radians(pose["gaff"])
            on = (grip[0] - math.cos(a) * 5.0, grip[1] - math.sin(a) * 5.0)
            hx, hy = J["handF"]
            J["elbowF"], J["handF"] = ik(J["shF"], (lerp(hx, on[0], w), lerp(hy, on[1], w)), self.build.upper, self.build.fore, +1)
        J["grip"] = grip
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def grounded(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        return {
            "net": ChainSpec(Chain(5, 2.3, gravity=0.24, drag=0.14, damp=0.1), lambda J: (J["shN"][0] - 0.5, J["shN"][1] + 1.0), grounded, (-0.4, 0.9)),
            "weed": ChainSpec(Chain(3, 2.0, gravity=0.2, drag=0.12, damp=0.1), lambda J: (J["head"][0] - 3.0, J["head"][1] - 6.0), grounded, (-0.5, 0.9)),
        }

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        hip, knee, ankle, toe = J["hip" + s], J["knee" + s], J["ankle" + s], J["toe" + s]
        cel.limb(hip, knee, 4.6, 3.8, "leather", (1, 2, 3), far=far)
        cel.limb(knee, ankle, 3.6, 3.2, "bone", (2, 4, 5), far=far)  # bare swollen shins
        cel.limb(ankle, toe, 3.2, 2.4, "bone", (2, 3, 5), far=far)

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 3.8, 3.2, "crimson", (2, 3, 4), far=far)
        cel.limb(el, hd, 3.0, 2.8, "bone", (2, 4, 5), far=far)
        cel.put(hd[0], hd[1], ("bone", 3 if far else 6))

    def figure(self, cel: Cel, J: dict[str, Pt], pose: Pose, ropes: dict[str, list[Pt]], held: bool) -> None:
        lean = pose.get("lean", 0.0)
        net = ropes["net"]
        for i in range(len(net) - 1):
            cel.limb(net[i], net[i + 1], 4.0 - i * 0.4, 3.6 - i * 0.4, "leather", (3, 4, 6))
            cel.put(net[i + 1][0], net[i + 1][1], ("bone", 7 if i % 2 else 3))  # the knots of the net
        self.arm(cel, J, "F", far=True)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        cel.stamp_lean(TORSO, L, (px, py), 5, lean)
        hx, hy = J["head"]
        turn = pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0)
        glow = pose.get("glow", 0.8)
        cel.stamp_turn(HEAD, {**L, "G": ("light", 0) if glow >= 0.95 else ("brass", 7) if glow >= 0.5 else ("brass", 4) if glow >= 0.15 else ("ink", 0)}, (hx, hy + 1), 5, turn)
        weed = ropes["weed"]
        for i in range(len(weed) - 1):
            cel.limb(weed[i], weed[i + 1], 2.0 - i * 0.3, 1.6 - i * 0.3, "moss", (3, 5, 7))
        if held:
            draw_gaff(cel, J["grip"], pose["gaff"])
        self.arm(cel, J, "N", far=False)
        cel.outline()

    def draw(self, cel, J, pose, ropes, between) -> None:
        free = pose.get("gaff_free", 0.0) > 0.5
        sink = int(round(pose.get("sink", 0.0)))
        tmp = Cel(cel.w, cel.h, cel.top)
        self.figure(tmp, J, pose, ropes, held=not free)
        # He is drawn lower by `sink` and cut off at the ground: that is him going down into the water.
        for (x, y), t in tmp.px.items():
            if y + sink < GROUND:
                cel.px[(x, y + sink)] = t
        if free:
            g = Cel(cel.w, cel.h, cel.top)
            draw_gaff(g, J["grip"], pose["gaff"])
            g.outline()
            cel.px.update(g.px)
        rx = self.build.root_x + pose.get("dx", 0.0)
        # Water always runs off him.
        drip = pose.get("drip", 0.0)
        if sink < 20:
            for i in range(3):
                u = (drip + i / 3) % 1.0
                cel.soft(J["pelvis"][0] - 4.0 + i * 4.0, J["pelvis"][1] + 2.0 + u * (GROUND - J["pelvis"][1] - 3.0), ("sea", 7) if u < 0.7 else ("sea", 5))
        puddle = pose.get("puddle", 0.0)
        if puddle > 0.01:
            reach = 5.0 + 17.0 * puddle
            for i in range(-int(reach), int(reach) + 1):
                edge = abs(i) > reach - 2
                cel.put(rx + i, GROUND - 1, ("sea", 5) if edge else ("sea", 7) if (i * 3 + int(puddle * 40)) % 5 == 0 else ("sea", 6))
                if abs(i) < reach * 0.6:
                    cel.put(rx + i, GROUND, ("sea", 4))
            if 0.01 < puddle < 0.985:
                for i in range(4):  # rings and bubbles while he goes under
                    u = (puddle * 3 + i / 4) % 1.0
                    cel.soft(rx - 6.0 + i * 4.0 + math.sin(i * 2.1) * 2.0, GROUND - 3 - 7.0 * u, ("bone", 7) if u < 0.6 else ("sea", 7))
        spray = pose.get("spray", 0.0)
        if 0.01 < spray < 0.985:
            _, tip, hook = gaff_points(J["grip"], pose["gaff"])
            for i in range(8):
                ang = math.radians(-170 + i * 22.0)
                dist = 2.0 + (7.0 + (i * 3 % 4) * 1.6) * spray
                cel.soft(hook[0] + math.cos(ang) * dist + 6.0 * (1 - spray), hook[1] + math.sin(ang) * dist + 6.0 * spray * spray, ("sea", 7) if i % 2 else ("bone", 7))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=1.2, lean=9.0, footN=(-3.6, 0.0, 0.0), footF=(4.0, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=30.0, elbN=36.0, armF=6.0, elbF=14.0, gaff=22.0, two=0.0, head_dx=0.0, head_dy=0.4, head_rot=12.0, breath=0.0,
                  glow=0.8, drip=0.0, sink=0.0, puddle=0.0, spray=0.0, gaff_free=0.0, gaff_at=(0.0, 0.0))


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    # He stands and drips, rocking, the head rolling on its neck; the belly rises and falls as if he breathed water.
    return {**BASE, "breath": 0.6 + 0.6 * s, "lean": 9.0 + 2.5 * s, "drop": 1.2 + 0.5 * late, "head_rot": 12.0 + 10.0 * late, "armF": 6.0 + 7.0 * late,
            "gaff": 22.0 + 4.0 * late, "drip": ph, "glow": 1.0 if math.sin(math.tau * 2 * ph + 2.0) > 0.75 else 0.8}


def walk_pose(ph: float) -> Pose:
    c = math.cos(math.tau * ph)
    p: Pose = gait_legs(Gait(stride=0.7, give=1.3, lift=0.5, toe=0.5), ph)
    rot = 12.0 + 11.0 * math.cos(math.tau * (ph - 0.18))
    # A wet shamble: short steps, the weight falling from foot to foot, both arms hanging dead.
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 12.0 + 5.0 * c, "dy": 0.7 * (1 + math.cos(2 * math.tau * (ph - 0.1))), "hip_rot": -0.9 * c, "sh_rot": 1.0 * c,
              "armN": 30.0 + 5.0 * c, "gaff": 26.0 + 6.0 * math.cos(math.tau * (ph - 0.15)), "armF": 6.0 + 20.0 * math.cos(math.tau * (ph - 0.22)),
              "elbF": 14.0 + 8.0 * math.cos(math.tau * (ph - 0.34)), "head_rot": rot, "head_dy": 0.4 + 0.4 * math.cos(2 * math.tau * (ph - 0.2)), "drip": 2 * ph})
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Hook and yank: he draws the gaff back to his hip, lunges out the whole length of it, sets the hook with a
# drop of the point, then hauls it back with his weight behind him. Feet are given planted (x − dx).
ATTACK_KEYS = [
    (0.00, k(), "lin"),
    (0.20, k(two=1.0, dx=-1.5, drop=1.8, lean=2.0, armN=-24.0, elbN=74.0, gaff=6.0, head_rot=4.0, footN=(-2.1, 0.0, 0.0), footF=(5.5, 0.0, 0.0), glow=1.0), "out"),
    (0.34, k(two=1.0, dx=-2.0, drop=2.2, lean=-2.0, armN=-30.0, elbN=78.0, gaff=4.0, head_rot=0.0, footN=(-1.6, 0.0, 0.0), footF=(6.0, 0.4, 4.0), glow=1.0), "io"),
    (0.42, k(two=1.0, dx=5.0, drop=3.0, lean=22.0, armN=82.0, elbN=4.0, gaff=-2.0, head_rot=18.0, footN=(-8.6, 0.0, -18.0), footF=(4.0, 0.0, 0.0), glow=1.0), "in"),
    (0.50, k(two=1.0, dx=5.2, drop=3.2, lean=24.0, armN=78.0, elbN=6.0, gaff=14.0, head_rot=20.0, footN=(-8.8, 0.0, -20.0), footF=(3.8, 0.0, 0.0), glow=1.0), "out"),
    (0.58, k(two=1.0, dx=-2.5, drop=3.4, lean=-14.0, armN=4.0, elbN=86.0, gaff=-10.0, head_rot=-8.0, footN=(-1.1, 0.0, 0.0), footF=(11.5, 0.0, 12.0), spray=0.02), "in"),
    (0.76, k(two=1.0, dx=-2.0, drop=2.6, lean=-8.0, armN=10.0, elbN=80.0, gaff=-4.0, head_rot=-2.0, footN=(-1.6, 0.0, 0.0), footF=(11.0, 0.0, 6.0), spray=0.98), "out"),
    (1.00, k(spray=1.0), "io"),
]

# Hit: he takes it like a sack of wet sand; water flies off him and the light in the eye gutters.
HURT_KEYS = stagger_keys(BASE, push=3.4, bend=12.0, buckle=2.4, whip=24.0, over={
    "impact": dict(armF=22.0, elbF=20.0, armN=24.0, elbN=40.0, gaff=14.0, glow=1.0, drip=0.3),
    "reel": dict(armF=-46.0, elbF=40.0, armN=6.0, elbN=60.0, gaff=-12.0, glow=0.3, drip=0.6),
    "catch": dict(armF=28.0, elbF=18.0, armN=34.0, elbN=34.0, gaff=30.0, glow=1.0, drip=0.9),
})

# Death: the water takes him back. A puddle opens under his feet and he goes down into it standing, reaching up;
# the gaff is the only thing left on the planks.
_UNDER = dict(lean=-4.0, armN=168.0, elbN=8.0, armF=160.0, elbF=10.0, head_rot=-24.0, gaff_free=1.0, gaff_at=(12.0, 1.3), gaff=4.0, glow=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-2.2, drop=1.8, lean=-10.0, head_rot=-18.0, head_dx=-1.0, armF=-40.0, elbF=40.0, armN=10.0, elbN=50.0, gaff=0.0, footN=(-1.4, 0.0, 0.0), footF=(6.2, 1.2, 8.0),
             glow=1.0, puddle=0.05), "out3"),
    (0.26, k(dx=-1.0, drop=2.6, lean=4.0, head_rot=10.0, armF=60.0, elbF=30.0, armN=70.0, elbN=40.0, gaff=-30.0, gaff_free=0.4, gaff_at=(8.0, 16.0), footN=(-2.6, 0.0, 0.0),
             footF=(5.0, 0.0, 0.0), glow=0.8, puddle=0.3, sink=3.0), "io"),
    (0.46, k(**{**_UNDER, "armN": 120.0, "armF": 110.0, "elbN": 30.0, "elbF": 30.0, "head_rot": -10.0, "gaff_at": (11.0, 8.0), "gaff": -16.0, "glow": 0.6}, dx=-1.0,
             puddle=0.5, sink=13.0, drip=0.5), "in"),
    (0.66, k(**{**_UNDER, "glow": 0.4}, dx=-1.0, puddle=0.72, sink=26.0), "lin"),
    (0.84, k(**{**_UNDER, "armN": 176.0, "armF": 172.0}, dx=-1.0, puddle=0.9, sink=38.0), "lin"),
    (0.94, k(**_UNDER, dx=-1.0, puddle=0.97, sink=48.0), "out"),
    (1.00, k(**_UNDER, dx=-1.0, puddle=1.0, sink=50.0), "lin"),
]

STILL = lambda t: (-0.2 + 0.2 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [180] * 12, True, STILL),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [100] * 12, True, lambda t: (-0.5, 0.0)),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.10, 0.20, 0.27, 0.34, 0.42, 0.46, 0.50, 0.58, 0.64, 0.70, 0.76, 0.88, 1.0],
                   [90, 90, 100, 110, 150, 50, 70, 130, 50, 70, 80, 110, 100, 110], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.18, 0.26, 0.36, 0.46, 0.56, 0.66, 0.75, 0.84, 0.94, 1.0],
                  [50, 50, 90, 90, 110, 110, 110, 110, 110, 110, 120, 200, 1200], False, STILL),
}
