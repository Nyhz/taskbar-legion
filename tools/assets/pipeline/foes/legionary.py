"""Barnacled Legionary — world 6, melee. A hoplite who went down with the city and still holds the line: a crested
bronze helm gone green at the seams with a cold light in the eye slit, a cuirass, greaves, the rag of a red cloak,
a great round shield crusted with barnacles and a trident. It advances behind the shield in a slow march and
attacks by coiling behind it and driving the trident home in one long lunge. It dies on its shield: the shield
drops flat, it goes to its knees and folds over it.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, keyed, loose, stagger_keys

FIGURE = ("Legionary", "foe", "w06")

BUILD = Build(root_x=40, thigh=6.4, shin=6.2, foot=4.4, hip_dx=1.5, spine=9.8, sh_near=3.6, sh_far=3.0, upper=6.0, fore=5.6, neck=1.0, head_dx=0.5)

L = {
    "h": ("brass", 1), "i": ("brass", 2), "j": ("brass", 3), "J": ("brass", 4), "K": ("brass", 5),
    "c": ("crimson", 2), "C": ("crimson", 3), "D": ("crimson", 4), "E": ("crimson", 5), "R": ("crimson", 4),
    "k": ("ink", 0), "l": ("ink", 2), "m": ("ink", 3), "n": ("ink", 4),
    "S": ("sea", 5), "W": ("bone", 6), "w": ("bone", 4),
    "o": ("leather", 2), "p": ("leather", 3), "q": ("leather", 5),
}

# Corinthian helm: a ragged red crest running back over it, a T-shaped opening (G is the light inside), cheek guards.
HELM = [
    "..CDDE.....",
    ".cCDDDEE...",
    ".cCDDDEEE..",
    "cCChijJEE..",
    "cC.hijjJJK.",
    "c..hijjJSJK",
    "...hiSjkkGK",
    "...hijjkJJK",
    "...hiSjkJJ.",
    "...hiijkSK.",
    "....hijkJ..",
    "....hi.kJ..",
]
# Bronze cuirass with verdigris and a barnacle, a belt, leather strips for a skirt.
TORSO = [
    ".hijjJJK.",
    "hhijjJJKK",
    "hiSjjWJJK",
    "hiijjJSJK",
    ".hijSjJJ.",
    ".hSijjJW.",
    ".ooooooo.",
    ".pqpqpqp.",
    ".pqpqpqp.",
    ".p.p.q.p.",
]
# The shield from three-quarters: bronze rim, dark face, a faded red trident, barnacles and verdigris.
SHIELD = [
    "....ijJ....",
    "..iijjJJK..",
    ".iilmmnnJK.",
    ".ilmmWnnnJK",
    "hilmmmRnnJK",
    "hilmmRRRnJK",
    "hilSmRRRnnJ",
    "hilmmmRnnnJ",
    "hilmmmRnnnJ",
    "hilwWmRnnnJ",
    "hilmwmRnnJK",
    "hilmmmmnnJK",
    ".ilSmmnnnJK",
    ".iilmmnnJK.",
    "..iijjJJK..",
    "....hij....",
]
# The same shield lying face up on the ground: a low dome.
SHIELD_FLAT = [
    "....jJJJKK.....",
    "..ijjnnnJJKK...",
    ".hijlmWmnnJJK..",
    "hhiijjjjJJJJKK.",
]
for _rows in (HELM, TORSO, SHIELD, SHIELD_FLAT):
    assert len({len(r) for r in _rows}) == 1

SHAFT_BACK, SHAFT_FWD = 9.0, 16.0


def spear_points(grip: Pt, angle: float) -> tuple[Pt, Pt]:
    a = math.radians(angle)
    return (grip[0] - math.cos(a) * SHAFT_BACK, grip[1] - math.sin(a) * SHAFT_BACK), (grip[0] + math.cos(a) * SHAFT_FWD, grip[1] + math.sin(a) * SHAFT_FWD)


def draw_trident(cel: Cel, grip: Pt, angle: float) -> None:
    """Shaft, crossbar and three tines. On a cel of its own so whatever goes into the ground is cut off."""
    a = math.radians(angle)
    d, n = (math.cos(a), math.sin(a)), (-math.sin(a), math.cos(a))
    butt, neck = spear_points(grip, angle)
    tmp = Cel(cel.w, cel.h, cel.top)
    tmp.limb(butt, neck, 1.6, 1.6, "leather", (2, 4, 6))
    tmp.limb((neck[0] - n[0] * 3.0, neck[1] - n[1] * 3.0), (neck[0] + n[0] * 3.0, neck[1] + n[1] * 3.0), 1.6, 1.6, "brass", (3, 5, 6))
    for side, length in ((-3.0, 4.5), (0.0, 6.0), (3.0, 4.5)):
        base = (neck[0] + n[0] * side, neck[1] + n[1] * side)
        tip = (base[0] + d[0] * length, base[1] + d[1] * length)
        tmp.limb(base, tip, 1.5, 0.8, "bone", (4, 6, 7))
        tmp.put(tip[0], tip[1], ("light", 0))
    for (x, y), tone in tmp.px.items():
        if y < GROUND:
            cel.px[(x, y)] = tone


class Legionary(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        lean = pose.get("lean", 0.0)
        a = math.radians(pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0))
        hx, hy = J["head"]
        J["crest"] = (hx - 5.0 * math.cos(a) + 8.0 * math.sin(a), hy - 5.0 * math.sin(a) - 8.0 * math.cos(a))
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def behind(pts: list[Pt], J: dict[str, Pt]) -> None:
            lying = abs(J["lean"][0]) > 45.0
            cx, cy = J["chest"]
            px, py = J["pelvis"]
            for i in range(1, len(pts)):
                x, y = pts[i]
                if lying:
                    pts[i] = (x, min(y, GROUND - 1.5))
                    continue
                t = max(0.0, min(1.0, (y - cy) / max(1.0, py - cy)))
                pts[i] = (min(x, cx - 2.6 + (px - 2.2 - (cx - 2.6)) * t), min(y, GROUND - 2.0))

        return {
            "cloak": ChainSpec(Chain(5, 2.4, gravity=0.24, drag=0.16, damp=0.1), lambda J: (J["chest"][0] - 2.2, J["chest"][1] + 1.2), behind),
            "crest": ChainSpec(Chain(3, 1.8, gravity=0.14, drag=0.16, damp=0.1), lambda J: J["crest"], None, (-0.8, 0.6)),
        }

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        hip, knee, ankle, toe = J["hip" + s], J["knee" + s], J["ankle" + s], J["toe" + s]
        cel.limb(hip, knee, 4.0, 3.2, "bone", (2, 3, 5), far=far)  # drowned flesh
        cel.limb(knee, ankle, 3.6, 3.0, "brass", (1, 3, 4), far=far)  # greave
        cel.limb(ankle, toe, 3.0, 2.0, "leather", (1, 2, 4), far=far)
        cel.put(knee[0], knee[1], ("sea", 4 if far else 5))

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 3.6, 3.0, "bone", (2, 3, 5), far=far)
        cel.limb(el, hd, 3.0, 2.6, "brass", (1, 3, 4), far=far)  # bracer
        cel.put(hd[0], hd[1], ("bone", 3 if far else 5))

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        glow = pose.get("glow", 0.8)
        Lg = {**L, "G": ("light", 0) if glow >= 0.95 else ("sea", 7) if glow >= 0.5 else ("sea", 4) if glow >= 0.15 else ("ink", 0)}
        # The rag of a cloak down its back.
        c = ropes["cloak"]
        widths = [3.0, 5.0, 6.0, 6.0, 4.6]
        for i in range(len(c) - 1):
            cel.limb(c[i], c[i + 1], widths[i], widths[i + 1], "crimson", (1, 2, 4))
        a_, b_ = c[-2], c[-1]
        for side in (-1.6, 1.4):
            cel.limb((b_[0] + side, b_[1] - 1.0), (b_[0] + side * 1.5 + (b_[0] - a_[0]) * 0.5, b_[1] + 2.4), 1.8, 0.8, "crimson", (1, 2, 3))
        self.arm(cel, J, "F", far=True)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        cel.stamp_lean(TORSO, Lg, (px, py), 4, lean)
        hx, hy = J["head"]
        turn = pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0)
        crest = ropes["crest"]
        for i in range(len(crest) - 1):
            cel.limb(crest[i], crest[i + 1], 2.4 - i * 0.5, 2.0 - i * 0.5, "crimson", (2, 4, 5))
        cel.stamp_turn(HELM, Lg, (hx, hy + 1), 6, turn)
        # The shield on the far arm, carried in front — or flat on the ground once it is dropped.
        free = pose.get("shield_free", 0.0)
        hf = J["handF"]
        sx, sy = loose(pose, "shield", (hf[0] + 2.0, hf[1] - 0.5), self.build.root_x)
        if free > 0.75:
            cel.stamp(SHIELD_FLAT, L, sx - 7, sy - 3)
        else:
            cel.stamp_pivot(SHIELD, L, (sx, sy), 5.5, 8.0, pose.get("shield_rot", 0.0))
        grip = loose(pose, "spear", J["handN"], self.build.root_x)
        draw_trident(cel, grip, pose["spear"])
        self.arm(cel, J, "N", far=False)
        cel.outline()

        if pose.get("jab", 0.0) > 0.5:
            _, neck = spear_points(grip, pose["spear"])
            a = math.radians(pose["spear"])
            for off, length in ((-3.0, 9), (0.0, 14), (3.0, 9)):
                for i in range(3, 3 + length):
                    cel.soft(neck[0] - math.cos(a) * i - math.sin(a) * off, neck[1] - math.sin(a) * i + math.cos(a) * off - 2.4, ("light", 0) if i < 8 else ("bone", 6))
        if glow >= 0.5:
            a = math.radians(turn)
            cel.soft(hx + 4.0 * math.cos(a) + 5.0 * math.sin(a), hy + 4.0 * math.sin(a) - 5.0 * math.cos(a), ("sea", 8))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=1.2, lean=5.0, footN=(-4.5, 0.0, 0.0), footF=(5.0, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=-18.0, elbN=70.0, armF=40.0, elbF=52.0, spear=-7.0, head_dx=0.0, head_dy=0.0, head_rot=3.0, breath=0.0,
                  glow=0.8, jab=0.0, shield_rot=0.0, shield_free=0.0, shield_at=(0.0, 0.0), spear_free=0.0, spear_at=(0.0, 0.0))


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.18))
    flick = 1.0 if math.sin(math.tau * 2 * ph + 0.6) > 0.8 else 0.8
    # Planted behind the shield; the trident's point draws a slow circle, looking for a gap.
    return {**BASE, "breath": 0.5 + 0.5 * s, "lean": 5.0 + 1.2 * s, "drop": 1.2 + 0.4 * late, "armF": 40.0 + 3.0 * late, "elbF": 52.0 + 3.0 * s,
            "spear": -7.0 + 3.5 * math.sin(math.tau * (ph - 0.3)), "armN": -18.0 + 3.0 * late, "head_rot": 3.0 + 3.0 * late, "glow": flick}


def walk_pose(ph: float) -> Pose:
    c = math.cos(math.tau * ph)
    p: Pose = gait_legs(Gait(stride=0.78, give=1.15, lift=0.65, toe=0.8), ph)
    # A phalanx march: shield up and still, head down behind its rim, the weight landing on every step.
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 8.0 + 1.5 * math.cos(2 * math.tau * (ph - 0.06)), "dy": 0.6 * (1 + math.cos(2 * math.tau * (ph - 0.1))), "hip_rot": -0.7 * c, "sh_rot": 0.5 * c,
              "armF": 46.0 + 2.0 * c, "elbF": 54.0, "armN": -20.0 + 5.0 * c, "elbN": 70.0, "spear": -6.0 + 3.0 * math.cos(math.tau * (ph - 0.12)),
              "head_dy": 0.4 * math.cos(2 * math.tau * (ph - 0.2)), "head_rot": 6.0})
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Lunge: it sinks back behind the shield with the trident drawn right back, holds, then the whole body goes in
# behind the points — one long step, arm straight — and holds there before pulling out.
_OUT = dict(dx=5.0, drop=2.8, lean=15.0, armN=64.0, elbN=6.0, spear=2.0, armF=6.0, elbF=64.0, shield_rot=-10.0, head_rot=8.0, footN=(-9.5, 0.0, -20.0), footF=(6.0, 0.0, 0.0), glow=1.0)
THRUST_KEYS = [
    (0.00, k(), "lin"),
    (0.22, k(dx=-1.5, drop=2.2, lean=-2.0, armN=-46.0, elbN=84.0, spear=-4.0, armF=54.0, elbF=42.0, head_rot=0.0, footN=(-3.0, 0.0, 0.0), footF=(6.5, 0.0, 0.0), glow=1.0), "out"),
    (0.38, k(dx=-2.2, drop=2.6, lean=-4.0, armN=-56.0, elbN=90.0, spear=-3.0, armF=58.0, elbF=40.0, head_rot=-2.0, footN=(-2.3, 0.0, 0.0), footF=(7.2, 1.0, 6.0), glow=1.0), "io"),
    (0.45, k(**_OUT, jab=1.0), "in"),
    (0.62, k(**{**_OUT, "dx": 5.4, "lean": 16.0}), "out"),
    (0.82, k(dx=2.0, drop=1.8, lean=8.0, armN=4.0, elbN=64.0, spear=-4.0, armF=32.0, elbF=54.0, footN=(-6.5, 0.0, -8.0), footF=(5.5, 0.8, 4.0)), "io"),
    (1.00, k(), "io"),
]

# Hit: the shield is knocked up and back against him, the trident's point flies up; he comes back down behind it.
HURT_KEYS = stagger_keys(BASE, push=3.6, bend=11.0, buckle=2.4, whip=14.0, over={
    "impact": dict(armF=54.0, elbF=60.0, shield_rot=-12.0, armN=-24.0, spear=-16.0, glow=1.0),
    "reel": dict(armF=22.0, elbF=44.0, shield_rot=16.0, armN=-42.0, elbN=62.0, spear=-32.0, glow=0.3),
    "catch": dict(armF=46.0, elbF=54.0, shield_rot=-4.0, armN=-12.0, elbN=68.0, spear=2.0, glow=1.0),
})

# Death: the trident slips away behind him, the shield slides off his arm and lies flat, and he comes down on it:
# knees first, then folded over the bronze, the light in the helm going out.
_ON_SHIELD = dict(dx=0.0, drop=10.0, lean=76.0, armN=84.0, elbN=8.0, armF=98.0, elbF=-6.0, head_rot=10.0, footN=(-9.5, 0.4, -110.0), footF=(-7.0, 0.4, -110.0),
                  shield_free=1.0, shield_at=(10.0, 0.5), spear_free=1.0, spear_at=(-9.0, 1.2), spear=178.0, glow=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-2.4, drop=1.6, lean=-10.0, head_rot=-14.0, head_dx=-1.0, armF=18.0, elbF=40.0, shield_rot=20.0, armN=-40.0, elbN=50.0, spear=-30.0,
             footN=(-2.1, 0.0, 0.0), footF=(7.4, 1.4, 8.0), glow=1.0), "out3"),
    (0.28, k(dx=-1.0, drop=7.2, lean=6.0, head_rot=14.0, armF=30.0, elbF=30.0, shield_rot=40.0, shield_free=0.5, shield_at=(9.0, 7.0), armN=-10.0, elbN=20.0,
             spear=-140.0, spear_free=1.0, spear_at=(-5.0, 8.0), footN=(-7.0, 0.4, -90.0), footF=(-3.5, 0.4, -90.0), glow=0.6), "io"),
    (0.44, k(dx=-0.5, drop=8.4, lean=28.0, head_rot=20.0, armF=58.0, elbF=10.0, armN=40.0, elbN=14.0, shield_free=1.0, shield_at=(10.0, 0.5),
             spear=-176.0, spear_free=1.0, spear_at=(-9.0, 1.2), footN=(-8.5, 0.4, -100.0), footF=(-5.5, 0.4, -100.0), glow=0.4), "io"),
    (0.60, k(**{**_ON_SHIELD, "glow": 0.3}), "in"),
    (0.68, k(**{**_ON_SHIELD, "lean": 68.0, "drop": 9.4, "glow": 0.2}), "out"),
    (0.80, k(**{**_ON_SHIELD, "glow": 0.1}), "in"),
    (1.00, k(**_ON_SHIELD), "lin"),
]

STILL = lambda t: (-0.2 + 0.2 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [180] * 12, True, STILL),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [90] * 12, True, lambda t: (-0.6, 0.0)),
    "attack": Anim("attack", keyed(THRUST_KEYS), [0.0, 0.11, 0.22, 0.30, 0.38, 0.45, 0.53, 0.62, 0.72, 0.82, 0.91, 1.0],
                   [80, 90, 100, 110, 160, 50, 90, 140, 90, 90, 90, 100], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.19, 0.28, 0.36, 0.44, 0.52, 0.60, 0.64, 0.68, 0.80, 1.0],
                  [50, 50, 80, 80, 100, 90, 90, 80, 70, 70, 90, 140, 1200], False, STILL),
}
