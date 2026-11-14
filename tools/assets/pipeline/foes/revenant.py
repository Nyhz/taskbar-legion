"""Mossbound Revenant — world 2, melee. A dead man-at-arms the forest has taken back: a dented helm with a root
growing out of it and a cold light in the eye slit, a bare jaw, rusted plate under moss, the rags of a tabard. It
drags a rusted greatsword behind it, point in the dirt, and attacks by ripping it forward and up out of the ground.
It dies on its knees and then on its face, and the light goes out.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, keyed, lerp, loose, stagger_keys, swing_smear

BUILD = Build(root_x=40, thigh=6.6, shin=6.4, foot=4.4, hip_dx=1.4, spine=9.8, sh_near=3.6, sh_far=3.0, upper=6.0, fore=5.8, neck=0.8, head_dx=0.8)

L = {
    "k": ("ink", 1), "l": ("ink", 3), "m": ("ink", 4), "n": ("ink", 5), "o": ("ink", 6), "p": ("ink", 7),
    "v": ("leather", 2), "w": ("leather", 3), "x": ("leather", 4), "y": ("leather", 5), "z": ("leather", 6),
    "c": ("bone", 5), "d": ("bone", 6), "W": ("bone", 7),
    "r": ("leather", 3), "R": ("leather", 5),
    "M": ("moss", 6), "N": ("moss", 8),
    "q": ("crimson", 2), "s": ("crimson", 3), "t": ("crimson", 4),
}

# A rust-eaten helm with the arrow that killed him still in it, a visor slit (G glows), a bare jaw, moss at the neck.
HELM = [
    "WW.........",
    ".Wr........",
    "..rRvvww...",
    "..vwwxxyy..",
    ".vwwxxyyyz.",
    ".vwxxxyyyzz",
    ".vwkkkGGGk.",
    ".vwxxyyyzz.",
    "..vwxyycd..",
    "..Mkcdcdc..",
    ".MNM.ccd...",
]
# Rusted cuirass with a gash, a moss pad on the shoulder, a belt and what is left of a tabard.
TORSO = [
    "..MNn....",
    ".MNmnnoo.",
    "MMmmnnoop",
    ".lmmnkoop",
    ".lmmknoo.",
    ".lmmnnoo.",
    "..rRrRr..",
    ".qqsstt..",
    ".q.ss.t..",
    ".q.s..t..",
]

BLADE, HILT = 19.0, 3.0


def sword_points(grip: Pt, angle: float) -> tuple[Pt, Pt]:
    a = math.radians(angle)
    return (grip[0] - math.cos(a) * HILT, grip[1] - math.sin(a) * HILT), (grip[0] + math.cos(a) * BLADE, grip[1] + math.sin(a) * BLADE)


def draw_sword(cel: Cel, grip: Pt, angle: float) -> None:
    """A wide rusted blade. Drawn on its own cel so the part that is in the ground is cut off."""
    a = math.radians(angle)
    d, n = (math.cos(a), math.sin(a)), (-math.sin(a), math.cos(a))
    pommel, tip = sword_points(grip, angle)
    tmp = Cel(cel.w, cel.h, cel.top)
    tmp.limb(pommel, grip, 1.8, 1.8, "leather", (1, 2, 4))
    g0 = (grip[0] + d[0] * 1.2, grip[1] + d[1] * 1.2)
    tmp.limb((g0[0] - n[0] * 2.6, g0[1] - n[1] * 2.6), (g0[0] + n[0] * 2.6, g0[1] + n[1] * 2.6), 1.6, 1.6, "ink", (2, 4, 6))
    shoulder = (grip[0] + d[0] * (BLADE - 3.5), grip[1] + d[1] * (BLADE - 3.5))
    tmp.limb(g0, shoulder, 3.8, 3.2, "ink", (3, 5, 7))
    tmp.limb(shoulder, tip, 3.2, 0.8, "ink", (3, 5, 7))
    for t, side in ((0.32, 1.0), (0.5, -0.8), (0.68, 0.9), (0.84, -0.6)):  # rust
        tmp.put(grip[0] + d[0] * BLADE * t + n[0] * side, grip[1] + d[1] * BLADE * t + n[1] * side, ("leather", 4))
    for (x, y), tone in tmp.px.items():
        if y < GROUND:
            cel.px[(x, y)] = tone


class Revenant(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        grip = loose(pose, "sword", J["handN"], self.build.root_x)
        ang = pose["sword"]
        drag = pose.get("drag", 0.0)
        if drag > 0.01:
            # Dragged: whatever the hand does, the point stays in the dirt behind him.
            s = max(-1.0, min(1.0, (GROUND - 1.0 - grip[1]) / BLADE))
            ang = lerp(ang, 180.0 - math.degrees(math.asin(s)), drag)
        J["grip"] = grip
        J["blade"] = (ang, 0.0)
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def hang(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        return {"moss": ChainSpec(Chain(4, 2.0, gravity=0.2, drag=0.14, damp=0.1), lambda J: (J["shN"][0] - 0.5, J["shN"][1] + 0.5), hang, (-0.5, 0.9))}

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        hip, knee, ankle, toe = J["hip" + s], J["knee" + s], J["ankle" + s], J["toe" + s]
        cel.limb(hip, knee, 4.2, 3.4, "leather", (1, 2, 3), far=far)
        cel.limb(knee, ankle, 3.6, 3.0, "ink", (2, 4, 5), far=far)
        cel.limb(ankle, toe, 3.2, 2.2, "ink", (2, 3, 5), far=far)
        cel.put(knee[0], knee[1], ("moss", 4 if far else 6))

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 3.8, 3.2, "ink", (3, 5, 7), far=far)
        # A bare forearm bound in roots.
        cel.limb(el, hd, 2.6, 2.2, "bone", (2, 4, 6), far=far)
        mid = ((el[0] + hd[0]) / 2, (el[1] + hd[1]) / 2)
        cel.put(mid[0], mid[1], ("leather", 3 if far else 4))
        cel.put(hd[0], hd[1], ("bone", 3 if far else 5))

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        glow = pose.get("glow", 0.8)
        Lg = {**L, "G": ("light", 0) if glow >= 0.95 else ("sea", 7) if glow >= 0.5 else ("sea", 4) if glow >= 0.15 else ("ink", 0)}
        self.arm(cel, J, "F", far=True)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        cel.stamp_lean(TORSO, Lg, (px, py), 4, lean)
        moss = ropes["moss"]
        for i in range(len(moss) - 1):
            cel.limb(moss[i], moss[i + 1], 2.6 - i * 0.4, 2.2 - i * 0.4, "moss", (3, 5, 7))
        hx, hy = J["head"]
        turn = pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0)
        cel.stamp_turn(HELM, Lg, (hx, hy + 1), 5, turn)
        ang = J["blade"][0]
        draw_sword(cel, J["grip"], ang)
        self.arm(cel, J, "N", far=False)
        cel.outline()

        _, tip = sword_points(J["grip"], ang)
        if pose.get("smear", 0.0) > 0.5 and len(between) > 2:
            before = set(cel.px)
            tips, hubs = [], []
            for Jb, _pb in between:
                tips.append(sword_points(Jb["grip"], Jb["blade"][0])[1])
                hubs.append(Jb["grip"])
            swing_smear(cel, tips, hubs)
            for xy in set(cel.px) - before:
                if xy[1] >= GROUND:
                    del cel.px[xy]
        # The point ploughs the dirt as it is dragged; the rip throws a spray of it.
        scrape = pose.get("scrape", 0.0)
        if scrape > 0.05:
            for i in range(4):
                cel.soft(tip[0] - 1.5 - i * 1.6 - scrape * 2.0, GROUND - 1.5 - (i % 2) * 1.2 - scrape, ("leather", 5 if i % 2 else 4))
        spray = pose.get("spray", 0.0)
        if 0.01 < spray < 0.985:
            ox = self.build.root_x + 4.0
            for i in range(9):
                a = math.radians(-150 + i * 14.0)
                dist = 3.0 + (9.0 + (i * 3 % 4) * 2.0) * spray
                x, y = ox + math.cos(a) * dist + 8.0 * spray, GROUND - 2 + math.sin(a) * dist + 8.0 * spray * spray
                if y < GROUND - 1:
                    cel.soft(x, y, ("leather", 5) if i % 3 else ("moss", 6))
                    if spray < 0.6:
                        cel.soft(x + 1, y, ("leather", 4))
        if glow >= 0.5:
            a = math.radians(turn)
            ex, ey = hx + 5.0 * math.cos(a) + 4.0 * math.sin(a), hy + 5.0 * math.sin(a) - 4.0 * math.cos(a)
            cel.soft(ex, ey, ("sea", 7))
            cel.soft(ex + 1, ey, ("sea", 5))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=1.4, lean=7.0, footN=(-4.0, 0.0, 0.0), footF=(4.5, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=-30.0, elbN=8.0, armF=10.0, elbF=20.0, sword=135.0, drag=1.0, head_dx=0.0, head_dy=0.4, head_rot=10.0, breath=0.0,
                  glow=0.8, smear=0.0, spray=0.0, scrape=0.0, sword_free=0.0, sword_at=(0.0, 0.0))


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    # It sways as if hung from a hook; the head lolls and the light in the helm gutters.
    flick = 1.0 if math.sin(math.tau * 2 * ph + 1.0) > 0.8 else 0.8
    return {**BASE, "lean": 7.0 + 3.0 * s, "drop": 1.4 + 0.5 * late, "head_rot": 10.0 + 9.0 * late, "armF": 10.0 + 6.0 * late, "elbF": 20.0 + 6.0 * s,
            "armN": -30.0 + 3.0 * s, "glow": flick}


def walk_pose(ph: float) -> Pose:
    c = math.cos(math.tau * ph)
    p: Pose = gait_legs(Gait(stride=0.8, give=1.3, lift=0.6, toe=0.7), ph)
    rot = 10.0 + 8.0 * math.cos(math.tau * (ph - 0.15))
    # One shoulder leads, the sword arm trails: a heavy, lopsided walk with a lurch every stride.
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 11.0 + 4.0 * c, "dy": 0.6 * (1 + math.cos(2 * math.tau * (ph - 0.1))), "hip_rot": -0.7 * c, "sh_rot": 1.0 * c,
              "armN": -34.0 + 5.0 * c, "armF": 14.0 + 22.0 * math.cos(math.tau * (ph - 0.2)), "elbF": 24.0 + 12.0 * math.cos(math.tau * (ph - 0.32)),
              "head_dy": 0.4 + 0.4 * math.cos(2 * math.tau * (ph - 0.2)), "head_rot": rot, "scrape": 0.5 + 0.5 * math.sin(2 * math.tau * ph)})
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Rip: it coils over the dragged blade, then tears it forward and up out of the ground in one arc.
ATTACK_KEYS = [
    (0.00, k(), "lin"),
    (0.22, k(dx=-1.5, drop=2.6, lean=20.0, armN=-52.0, elbN=6.0, sword=150.0, head_rot=22.0, footN=(-2.5, 0.0, 0.0), footF=(6.0, 0.0, 0.0)), "out"),
    (0.36, k(dx=-2.0, drop=3.0, lean=23.0, armN=-58.0, elbN=6.0, sword=154.0, head_rot=26.0, footN=(-2.0, 0.0, 0.0), footF=(6.5, 0.0, 0.0), glow=1.0), "io"),
    (0.43, k(dx=2.0, drop=2.4, lean=12.0, armN=26.0, elbN=34.0, sword=16.0, drag=0.0, head_rot=8.0, footN=(-6.0, 0.0, -10.0), footF=(7.5, 0.6, 0.0), glow=1.0, smear=1.0,
             spray=0.02), "in"),
    (0.49, k(dx=5.0, drop=1.4, lean=-2.0, armN=118.0, elbN=24.0, sword=-52.0, drag=0.0, head_rot=-6.0, footN=(-9.0, 0.0, -22.0), footF=(6.0, 0.0, 0.0), glow=1.0, smear=1.0,
             spray=0.35), "lin"),
    (0.60, k(dx=5.5, drop=1.2, lean=-6.0, armN=150.0, elbN=26.0, sword=-86.0, drag=0.0, head_rot=-10.0, footN=(-9.5, 0.0, -24.0), footF=(6.0, 0.0, 0.0), spray=0.98), "out"),
    (0.80, k(dx=3.0, drop=1.6, lean=6.0, armN=60.0, elbN=30.0, sword=24.0, drag=0.0, head_rot=4.0, footN=(-7.0, 0.0, -8.0), footF=(5.5, 0.6, 4.0), spray=1.0), "io"),
    (1.00, k(spray=1.0), "io"),
]

# Hit: it takes the blow like a dead thing, loose-necked; the light in the helm gutters and comes back hotter.
HURT_KEYS = stagger_keys(BASE, push=3.6, bend=13.0, buckle=2.2, whip=26.0, over={
    "impact": dict(armF=24.0, elbF=20.0, armN=-34.0, glow=1.0),
    "reel": dict(armF=-52.0, elbF=46.0, armN=-48.0, glow=0.3),
    "catch": dict(armF=32.0, elbF=22.0, armN=-26.0, glow=1.0),
})

# Death: the sword slips from its hand, it folds to its knees and goes down on its face.
_FLAT = dict(dx=4.0, drop=12.0, lean=88.0, armN=88.0, elbN=4.0, armF=96.0, elbF=-10.0, footN=(-11.5, 0.6, -170.0), footF=(-10.5, 1.2, -170.0), head_rot=0.0, head_dy=0.0,
             drag=0.0, sword_free=1.0, sword_at=(-12.0, 1.4), sword=178.0, glow=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-2.4, drop=1.6, lean=-10.0, head_rot=-22.0, head_dx=-1.0, armF=-40.0, elbF=40.0, armN=-40.0, footN=(-1.6, 0.0, 0.0), footF=(6.9, 1.4, 8.0), glow=1.0), "out3"),
    (0.30, k(dx=-1.0, drop=7.4, lean=8.0, head_rot=24.0, armN=-10.0, elbN=10.0, armF=20.0, elbF=10.0, footN=(-7.0, 0.4, -90.0), footF=(-3.5, 0.4, -90.0),
             drag=0.0, sword_free=1.0, sword_at=(-9.0, 6.0), sword=160.0, glow=0.5), "io"),
    (0.48, k(dx=0.5, drop=8.4, lean=22.0, head_rot=34.0, armN=20.0, elbN=10.0, armF=40.0, elbF=10.0, footN=(-8.5, 0.4, -100.0), footF=(-5.0, 0.4, -100.0),
             drag=0.0, sword_free=1.0, sword_at=(-12.0, 1.4), sword=178.0, glow=0.3), "io"),
    (0.60, k(**{**_FLAT, "dx": 2.5, "drop": 10.0, "lean": 58.0, "armN": 60.0, "armF": 70.0, "footN": (-10.0, 0.5, -130.0), "footF": (-8.0, 0.8, -130.0), "glow": 0.2}), "in"),
    (0.68, k(**_FLAT), "in"),
    (0.76, k(**{**_FLAT, "lean": 82.0, "drop": 11.0}), "out"),
    (0.86, k(**_FLAT), "in"),
    (1.00, k(**_FLAT), "lin"),
]

STILL = lambda t: (-0.2 + 0.2 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [190] * 12, True, STILL),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [90] * 12, True, lambda t: (-0.6, 0.0)),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.11, 0.22, 0.36, 0.43, 0.49, 0.54, 0.60, 0.70, 0.80, 0.90, 1.0],
                   [90, 90, 120, 150, 40, 50, 70, 130, 100, 100, 90, 110], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.20, 0.30, 0.39, 0.48, 0.54, 0.60, 0.64, 0.68, 0.76, 0.86, 1.0],
                  [50, 50, 80, 80, 100, 90, 90, 70, 60, 60, 80, 80, 120, 1200], False, STILL),
}
