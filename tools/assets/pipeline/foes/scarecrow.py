"""Hollow Scarecrow — world 1, melee. A coat stuffed with straw under a sack head with ember eyes, a straw hat and
a scythe. It moves like a badly strung puppet: lurching, head lolling, the free arm swinging loose. When it dies
it comes apart — the hat flies off, the body folds into a heap and the scythe drops.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, keyed, loose, stagger_keys, swing_smear

BUILD = Build(root_x=40, thigh=6.4, shin=6.4, foot=3.2, hip_dx=1.0, spine=9.4, sh_near=3.0, sh_far=2.6, upper=6.2, fore=6.0, neck=1.0, head_dx=0.4)

L = {
    "d": ("bone", 3), "e": ("bone", 4), "f": ("bone", 5),
    "K": ("ink", 1), "O": ("brass", 6), "o": ("crimson", 5),
    "h": ("brass", 3), "i": ("brass", 4), "j": ("brass", 5),
    "q": ("crimson", 1), "r": ("crimson", 2), "p": ("crimson", 3),
    "m": ("leather", 3), "n": ("leather", 4),
}

# Sack head: two ember eye holes (the far one smaller), a stitched mouth, tied at the neck, straw poking out.
SACK = [
    "..ddeefff.",
    "..deKOeOf.",
    "..ddeefff.",
    "..dKeKeKf.",
    "...deeff..",
    "...mnnn...",
    "..jhi.ij..",
]
HAT = [
    "....hiij.....",
    "...hiiijj....",
    "...rrpppp....",
    "hhiiiiijjjjjj",
]
TORSO = [
    "...hih...",
    ".qrrpppp.",
    "qqrrpppp.",
    ".qrrmnpp.",
    ".qrrmnpp.",
    ".qqrrppp.",
    "..qrrpp..",
    "..nnnnn..",
    ".qrrrppp.",
    ".q.rr.pp.",
]

SNATH_UP, SNATH_DOWN = 13.0, 8.0


def scythe_points(hand: Pt, angle: float) -> tuple[Pt, Pt, list[Pt]]:
    """Foot and head of the snath, and the blade curving forward from the head. `angle`: where the head points
    (−90 = straight up)."""
    a = math.radians(angle)
    d = (math.cos(a), math.sin(a))
    f = (-d[1], d[0])  # forward of the snath
    top = (hand[0] + d[0] * SNATH_UP, hand[1] + d[1] * SNATH_UP)
    foot = (hand[0] - d[0] * SNATH_DOWN, hand[1] - d[1] * SNATH_DOWN)
    blade = [top] + [(top[0] + f[0] * u + d[0] * v, top[1] + f[1] * u + d[1] * v) for u, v in ((4.0, 1.0), (8.0, -0.6), (11.0, -4.0))]
    return foot, top, blade


def draw_scythe(cel: Cel, hand: Pt, angle: float) -> None:
    foot, top, blade = scythe_points(hand, angle)
    cel.limb(foot, top, 1.5, 1.5, "leather", (2, 3, 5))
    for i in range(len(blade) - 1):
        cel.limb(blade[i], blade[i + 1], 2.8 - i * 0.6, 2.2 - i * 0.6, "ink", (4, 7, 9))


class Scarecrow(Character):
    build = BUILD

    def chains(self) -> dict[str, ChainSpec]:
        # Straw trailing from the neck, and the far forearm hanging like a rope.
        return {"straw": ChainSpec(Chain(3, 2.0, gravity=0.1, drag=0.2, damp=0.1), lambda J: (J["chest"][0] - 2.0, J["chest"][1]), None, (-0.8, 0.5))}

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        cel.limb(J["hip" + s], J["knee" + s], 3.2, 2.6, "leather", (2, 3, 4), far=far)
        cel.limb(J["knee" + s], J["ankle" + s], 2.6, 2.0, "leather", (2, 3, 4), far=far)
        ax, ay = J["ankle" + s]
        tx, ty = J["toe" + s]
        # Straw instead of a foot.
        for k_ in (-0.5, 0.2, 0.9):
            cel.line((ax, ay), (ax + (tx - ax) * (0.6 + k_ * 0.4) + k_, ty + 1.4), ("brass", 3 if far else 4))

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 2.8, 2.3, "crimson", (1, 2, 3), far=far)
        cel.limb(el, hd, 2.3, 1.9, "crimson", (1, 2, 3), far=far)
        dx, dy = hd[0] - el[0], hd[1] - el[1]
        d = math.hypot(dx, dy) or 1.0
        for k_ in (-0.6, 0.0, 0.6):
            cel.line(hd, (hd[0] + dx / d * 2.6 - dy / d * k_ * 2.0, hd[1] + dy / d * 2.6 + dx / d * k_ * 2.0), ("brass", 3 if far else 5))

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        straw = ropes["straw"]
        for i in range(len(straw) - 1):
            cel.limb(straw[i], straw[i + 1], 1.8, 1.2, "brass", (2, 3, 4))
        self.arm(cel, J, "F", far=True)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        cel.stamp_lean(TORSO, L, (px, py), 4, lean)
        hx, hy = J["head"]
        turn = pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0)
        cel.stamp_turn(SACK, L, (hx, hy + 1), 5, turn)
        # The hat sits on the sack until it is knocked off.
        a = math.radians(turn)
        on = (hx - 1.0 * math.cos(a) + 6.0 * math.sin(a), hy - 1.0 * math.sin(a) - 6.0 * math.cos(a))
        hat = loose(pose, "hat", on, self.build.root_x)
        cel.stamp_turn(HAT, L, (hat[0] + 1.0, hat[1] + 1.0), 6, pose.get("hat_rot", turn))
        grip = loose(pose, "scythe", J["handN"], self.build.root_x)
        draw_scythe(cel, grip, pose["scythe"])
        self.arm(cel, J, "N", far=False)
        cel.outline()
        if pose.get("smear", 0.0) > 0.5 and len(between) > 2:
            tips, hubs = [], []
            for Jb, pb in between:
                g = loose(pb, "scythe", Jb["handN"], self.build.root_x)
                _, top, blade = scythe_points(g, pb["scythe"])
                tips.append(blade[-1])
                hubs.append(g)
            swing_smear(cel, tips, hubs)


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=1.0, lean=8.0, footN=(-3.5, 0.0, 0.0), footF=(3.5, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=20.0, elbN=60.0, armF=-5.0, elbF=10.0, scythe=-75.0, head_dx=0.0, head_dy=0.0, head_rot=6.0, breath=0.0, smear=0.0,
                  hat_free=0.0, hat_at=(0.0, 0.0), hat_rot=6.0, scythe_free=0.0, scythe_at=(0.0, 0.0))


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.18))
    later = math.sin(math.tau * (ph - 0.3))
    rot = 6.0 + 7.0 * late
    return {**BASE, "lean": 8.0 + 3.0 * s, "head_rot": rot, "hat_rot": rot, "armF": -5.0 + 8.0 * later, "elbF": 10.0 + 6.0 * late,
            "scythe": -75.0 + 3.0 * late, "elbN": 60.0 + 3.0 * s}


def walk_pose(ph: float) -> Pose:
    c = math.cos(math.tau * ph)
    p: Pose = gait_legs(Gait(stride=0.78, give=1.3, lift=0.55, toe=0.6), ph)
    rot = 6.0 + 9.0 * math.cos(math.tau * (ph - 0.15))
    # It lurches once a stride, not once a step: a limp.
    p.update(lean=10.0 + 5.0 * c, dy=0.5 * (1 + math.cos(2 * math.tau * (ph - 0.1))), hip_rot=-0.6 * c, sh_rot=0.8 * c,
             armN=20.0 + 6.0 * c, elbN=60.0, armF=-5.0 + 24.0 * math.cos(math.tau * (ph - 0.22)), elbF=14.0 + 12.0 * math.cos(math.tau * (ph - 0.34)),
             scythe=-75.0 + 6.0 * math.cos(math.tau * (ph - 0.12)), head_dx=0.0, head_dy=0.4 * math.cos(2 * math.tau * (ph - 0.2)),
             head_rot=rot, hat_rot=rot, breath=0.0, smear=0.0, hat_free=0.0, hat_at=(0.0, 0.0), scythe_free=0.0, scythe_at=(0.0, 0.0))
    return p


def k(**over: object) -> Pose:
    p = {**BASE, **over}
    if "hat_rot" not in over:
        p["hat_rot"] = p["head_rot"]
    return p


# Reap: the scythe is hauled up and back, then comes over and down in one long sweep.
ATTACK_KEYS = [
    (0.00, k(), "lin"),
    (0.26, k(dx=-2.0, drop=1.8, lean=-4.0, head_rot=-8.0, armN=-100.0, elbN=220.0, scythe=-140.0, armF=10.0, elbF=40.0, footF=(3.5, 1.2, 10.0)), "out"),
    (0.40, k(dx=-2.6, drop=2.2, lean=-7.0, head_rot=-12.0, armN=-108.0, elbN=228.0, scythe=-152.0, armF=14.0, elbF=44.0, footF=(4.5, 1.8, 12.0)), "io"),
    (0.47, k(dx=2.5, drop=1.8, lean=12.0, head_rot=10.0, armN=-200.0, elbN=340.0, scythe=-96.0, armF=-20.0, elbF=10.0, footF=(8.5, 0.4, 2.0), footN=(-3.5, 0.0, -14.0), smear=1.0), "in"),
    (0.53, k(dx=5.5, drop=2.8, lean=22.0, head_rot=22.0, armN=-278.0, elbN=366.0, scythe=28.0, armF=-40.0, elbF=6.0, footF=(8.5, 0.0, 0.0), footN=(-3.5, 0.0, -24.0), smear=1.0), "lin"),
    (0.66, k(dx=6.0, drop=3.2, lean=26.0, head_rot=26.0, armN=-296.0, elbN=372.0, scythe=52.0, armF=-44.0, elbF=6.0, footF=(8.5, 0.0, 0.0), footN=(-3.5, 0.0, -26.0)), "out"),
    (0.84, k(dx=3.0, drop=2.0, lean=16.0, head_rot=14.0, armN=-322.0, elbN=400.0, scythe=-20.0, armF=-20.0, elbF=10.0, footF=(6.0, 1.0, 6.0)), "io"),
    (1.00, k(armN=-340.0, elbN=420.0), "io"),
]

def _hat(p: Pose) -> Pose:
    return p if p.get("hat_free", 0.0) > 0.0 else {**p, "hat_rot": p["head_rot"]}


# Hit: a rag doll. The head snaps right back, the loose arm is flung over its shoulder and the hat jumps off its
# head and lands again.
HURT_KEYS = stagger_keys(BASE, push=4.6, bend=16.0, buckle=2.0, whip=30.0, finish=_hat, over={
    "impact": dict(armF=30.0, elbF=20.0, armN=10.0, elbN=52.0, scythe=-84.0),
    "mid": dict(armF=-20.0, elbF=40.0, armN=2.0, elbN=44.0, scythe=-96.0, hat_free=0.3, hat_at=(-3.0, 36.0), hat_rot=-26.0),
    "reel": dict(armF=-74.0, elbF=52.0, armN=-6.0, elbN=40.0, scythe=-106.0, hat_free=0.3, hat_at=(-6.0, 36.0), hat_rot=-34.0),
    "catch": dict(armF=32.0, elbF=30.0, armN=26.0, elbN=58.0, scythe=-68.0),
})

# Death: the hat is knocked flying, the stuffing gives out and the whole thing folds into a heap.
_HEAP = dict(dx=1.0, drop=12.0, lean=78.0, head_rot=0.0, head_dy=1.0, armN=96.0, elbN=6.0, armF=110.0, elbF=6.0, footN=(-5.0, 0.6, -100.0), footF=(-3.0, 0.6, -100.0),
             hat_free=1.0, hat_at=(-11.0, 2.0), hat_rot=-8.0, scythe_free=1.0, scythe_at=(16.0, 0.8), scythe=-184.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-2.5, drop=1.4, lean=-14.0, head_rot=-28.0, head_dx=-1.2, armN=-10.0, elbN=40.0, scythe=-100.0, armF=-40.0, elbF=30.0,
             hat_free=0.4, hat_at=(-4.0, 30.0), hat_rot=-30.0), "out3"),
    (0.30, k(dx=-2.0, drop=5.0, lean=6.0, head_rot=20.0, armN=40.0, elbN=10.0, armF=20.0, elbF=10.0, scythe=-70.0, scythe_free=1.0, scythe_at=(9.0, 9.0),
             hat_free=1.0, hat_at=(-8.0, 30.0), hat_rot=-50.0), "io"),
    (0.52, k(dx=0.0, drop=9.5, lean=46.0, head_rot=10.0, armN=70.0, elbN=8.0, armF=70.0, elbF=8.0, scythe=-130.0, scythe_free=1.0, scythe_at=(13.0, 4.0),
             footN=(-4.0, 0.4, -60.0), footF=(-2.0, 0.4, -60.0), hat_free=1.0, hat_at=(-11.0, 22.0), hat_rot=-20.0), "in"),
    (0.64, k(**{**_HEAP, "hat_at": (-9.0, 13.0), "hat_rot": 14.0}), "lin"),
    (0.72, k(**{**_HEAP, "drop": 11.0, "lean": 70.0, "hat_at": (-12.0, 8.0), "hat_rot": -12.0, "scythe_at": (16.0, 2.2), "scythe": -178.0}), "out"),
    (0.86, k(**{**_HEAP, "hat_at": (-10.0, 3.0), "hat_rot": 6.0}), "in"),
    (1.00, k(**_HEAP), "out"),
]

STILL = lambda t: (-0.2 + 0.2 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [190] * 12, True, STILL),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [95] * 12, True, lambda t: (-0.6, 0.0)),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.13, 0.26, 0.40, 0.47, 0.53, 0.59, 0.66, 0.75, 0.84, 0.92, 1.0],
                   [90, 90, 110, 150, 40, 50, 90, 120, 100, 100, 90, 120], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.20, 0.30, 0.41, 0.52, 0.58, 0.64, 0.72, 0.79, 0.86, 1.0],
                  [50, 50, 80, 80, 90, 80, 70, 60, 80, 90, 90, 120, 1200], False, STILL),
}
