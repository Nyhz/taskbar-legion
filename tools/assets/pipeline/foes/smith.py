"""Forge Brute — world 8, melee. A smith the forges have kept: ash-grey, a head taller than a hero and twice as
wide, a welded iron mask with a cold light in the slit, a scorched leather apron. The arm that swings the hammer
is no longer flesh: it is slag, black crust with the fire showing through, and it never cools. He carries the
hammer on his shoulder, heaves it over his head with both hands and brings it down so the ground rings and sparks
fly. When he dies the hammer slides off behind him, he sits down hard where he stood and slumps, and the arm
goes dark.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import (GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, ik, keyed, lerp, loose,
                   stagger_keys, swing_smear)

FIGURE = ("Smith", "foe", "w08")

BUILD = Build(root_x=40, thigh=6.8, shin=6.6, foot=5.0, hip_dx=2.0, spine=13.0, sh_near=5.6, sh_far=4.8, upper=7.2, fore=7.0, neck=0.4, head_dx=1.4,
              heel=1.8, toe=1.3, min_pelvis=5.0)

L = {
    "k": ("ink", 1), "l": ("ink", 3), "m": ("ink", 4), "n": ("ink", 5), "o": ("ink", 6), "p": ("ink", 7),
    "s": ("bone", 3), "t": ("bone", 4), "u": ("bone", 5), "v": ("bone", 6),
    "a": ("leather", 1), "b": ("leather", 2), "c": ("leather", 3), "d": ("leather", 4), "f": ("leather", 5),
    "R": ("leather", 3), "B": ("brass", 5),
}

# A bald ash-grey skull strapped into a welded faceplate: a slit with a cold light in it (E), a breathing grille.
MASK = [
    "...sttu...",
    "..sttulmn.",
    ".sstRlmnop",
    ".stRlBnnop",
    ".stlmEEEop",
    ".ssllmnnop",
    "..slmkmkno",
    "...lmkmkn.",
    "....llmm..",
]
# Shoulders like a yoke, a leather apron strapped over them with a brass buckle, a belt, the apron's skirt.
TORSO = [
    "...sttttuuu....",
    ".ssttttuuuuvv..",
    "sstttbccduuuvv.",
    "sstttbccdduuuvv",
    "ssttbbccddfuuvv",
    ".sttbbccddfuuv.",
    ".sstbbcBddfuuv.",
    "..stbbccddfuu..",
    "..sbbbccddffu..",
    "..kkkkkkkkkkk..",
    "..abbbccddff...",
    "..abbbccddff...",
    "..abbccddfff...",
    "...abbccddf....",
]

HAFT_UP, HAFT_DOWN, HEAD_HALF = 15.0, 4.0, 5.0


def hammer_points(grip: Pt, angle: float) -> tuple[Pt, Pt, Pt, Pt]:
    """Pommel and top of the haft, and the two faces of the head across it (`angle`: where the head is, −90 = up)."""
    a = math.radians(angle)
    d, n = (math.cos(a), math.sin(a)), (-math.sin(a), math.cos(a))
    top = (grip[0] + d[0] * HAFT_UP, grip[1] + d[1] * HAFT_UP)
    pommel = (grip[0] - d[0] * HAFT_DOWN, grip[1] - d[1] * HAFT_DOWN)
    return pommel, top, (top[0] - n[0] * HEAD_HALF, top[1] - n[1] * HEAD_HALF), (top[0] + n[0] * HEAD_HALF, top[1] + n[1] * HEAD_HALF)


def draw_hammer(cel: Cel, grip: Pt, angle: float) -> None:
    """Drawn on its own cel so the part that is driven into the ground is cut off."""
    pommel, top, back, face = hammer_points(grip, angle)
    tmp = Cel(cel.w, cel.h, cel.top)
    tmp.limb(pommel, top, 2.2, 2.2, "leather", (2, 3, 5))
    tmp.limb(back, face, 7.0, 7.4, "ink", (3, 5, 7))
    # Iron bands, and the striking face still hot from the last blow.
    for t in (0.3, 0.7):
        tmp.put(back[0] + (face[0] - back[0]) * t, back[1] + (face[1] - back[1]) * t, ("ink", 2))
    a = math.radians(angle)
    for off in (-2.4, -1.2, 0.0, 1.2, 2.4):
        tmp.put(face[0] + math.cos(a) * off, face[1] + math.sin(a) * off, ("brass", 5 if abs(off) > 1.5 else 6))
    for (x, y), tone in tmp.px.items():
        if y < GROUND:
            cel.px[(x, y)] = tone


def ember(heat: float) -> tuple[tuple[str, int], tuple[str, int]]:
    if heat >= 0.85:
        return ("light", 0), ("brass", 6)
    if heat >= 0.5:
        return ("brass", 6), ("brass", 5)
    if heat >= 0.2:
        return ("crimson", 5), ("crimson", 4)
    return ("ink", 3), ("ink", 2)


class Smith(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        grip = loose(pose, "hammer", J["handN"], self.build.root_x)
        # The other hand takes the haft, `hold` px along it, for the big blow.
        w = pose.get("two", 0.0) * (1.0 - pose.get("hammer_free", 0.0))
        if w > 0.01:
            a = math.radians(pose["hammer"])
            hold = pose.get("hold", -3.5)
            on = (grip[0] + math.cos(a) * hold, grip[1] + math.sin(a) * hold)
            hx, hy = J["handF"]
            J["elbowF"], J["handF"] = ik(J["shF"], (lerp(hx, on[0], w), lerp(hy, on[1], w)), self.build.upper, self.build.fore, +1)
        J["grip"] = grip
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def hang(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        # The apron's skirt hangs loose in front of the legs.
        return {"apron": ChainSpec(Chain(3, 2.6, gravity=0.26, drag=0.16, damp=0.12), lambda J: (J["pelvis"][0] + 2.0, J["pelvis"][1] - 0.5), hang)}

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        hip, knee, ankle, toe = J["hip" + s], J["knee" + s], J["ankle" + s], J["toe" + s]
        cel.limb(hip, knee, 5.6, 4.6, "leather", (1, 2, 3), far=far)
        cel.limb(knee, ankle, 4.6, 4.0, "ink", (2, 3, 5), far=far)
        cel.limb(ankle, toe, 4.2, 3.0, "ink", (2, 3, 5), far=far)
        cel.put(toe[0], toe[1] - 0.5, ("ink", 5 if far else 7))  # iron toecap

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        heat = pose.get("heat", 1.0)
        hot, warm = ember(heat)
        eye = pose.get("eye", 1.0)
        Lm = {**L, "E": ("light", 0) if eye >= 0.95 else ("sea", 7) if eye >= 0.5 else ("sea", 4) if eye >= 0.15 else ("ink", 0)}
        # Far arm: ash-grey flesh and an iron bracer.
        sh, el, hd = J["shF"], J["elbowF"], J["handF"]
        cel.limb(sh, el, 5.0, 4.4, "bone", (2, 3, 5), far=True)
        cel.limb(el, hd, 4.6, 3.8, "ink", (3, 4, 6), far=True)
        cel.limb(hd, (hd[0] + 0.8, hd[1] + 0.8), 3.8, 3.4, "bone", (2, 3, 5), far=True)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        cel.stamp_lean(TORSO, Lm, (px, py), 7, lean)
        apron = ropes["apron"]
        for i in range(len(apron) - 1):
            cel.limb(apron[i], apron[i + 1], 6.4 - i * 0.5, 6.0 - i * 0.6, "leather", (2, 3, 5))
        hx, hy = J["head"]
        turn = pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0)
        cel.stamp_turn(MASK, Lm, (hx, hy + 1), 4, turn)
        draw_hammer(cel, J["grip"], pose["hammer"])
        # Near arm: slag. Black crust, the fire showing in the cracks and at the knuckles.
        sh, el, hd = J["shN"], J["elbowN"], J["handN"]
        cel.limb((sh[0] - 0.5, sh[1] - 0.5), (sh[0] + 0.5, sh[1] + 1.0), 7.4, 6.6, "ink", (1, 2, 4))  # a shoulder like a clinker
        cel.limb(sh, el, 5.8, 5.0, "ink", (1, 2, 4))
        cel.limb(el, hd, 5.2, 4.6, "ink", (1, 2, 4))
        for a_, b_, ts in ((sh, el, (0.25, 0.6, 0.9)), (el, hd, (0.3, 0.65))):
            for i, t in enumerate(ts):
                x, y = a_[0] + (b_[0] - a_[0]) * t, a_[1] + (b_[1] - a_[1]) * t
                cel.put(x + (0.8 if i % 2 else -0.8), y, hot)
                cel.put(x + (0.8 if i % 2 else -0.8), y + 1, warm)
        cel.put(sh[0] - 1.5, sh[1] - 1.0, warm)
        cel.put(sh[0] + 1.0, sh[1] + 1.5, hot)
        cel.limb(hd, (hd[0] + 0.6, hd[1] + 0.8), 5.0, 4.4, "ink", (1, 2, 4))
        cel.put(hd[0] + 1.0, hd[1], hot)
        cel.put(hd[0] - 1.0, hd[1] + 1.0, warm)
        cel.outline()

        _, _, _, face = hammer_points(J["grip"], pose["hammer"])
        if pose.get("smear", 0.0) > 0.5 and len(between) > 2:
            before = set(cel.px)
            tips, hubs = [], []
            for Jb, pb in between:
                tips.append(hammer_points(Jb["grip"], pb["hammer"])[3])
                hubs.append(Jb["grip"])
            swing_smear(cel, tips, hubs)
            for xy in set(cel.px) - before:
                if xy[1] >= GROUND:
                    del cel.px[xy]
        sparks = pose.get("sparks", 0.0)
        if 0.01 < sparks < 0.985:
            self.sparks(cel, min(face[0], cel.w - 16.0), sparks)
        # Embers drip from the slag arm while it burns.
        if heat >= 0.5:
            ph = pose.get("embers", 0.0)
            for i in range(3):
                u = (ph + i / 3) % 1.0
                cel.soft(el[0] - 1.0 + i * 1.6 + math.sin(u * 5.0 + i), el[1] + 2.0 + 7.0 * u, ("brass", 6) if u < 0.4 else ("crimson", 5))

    @staticmethod
    def sparks(cel: Cel, ix: float, u: float) -> None:
        """The hammer rings on the ground: a white flash, a fan of sparks that fly far and fall, a dent."""
        if u < 0.3:
            cel.star(ix, GROUND - 3, 4)
        for i in range(int(4 + 8 * u)):
            for sgn in (-1, 1):
                cel.soft(ix + sgn * i, GROUND - 1, ("light", 0) if u < 0.25 else ("brass", 5) if u < 0.6 else ("ink", 4))
        for i in range(18):
            ang = math.radians(-176 + i * 10.2)
            speed = 11.0 + (i * 7 % 5) * 3.6
            x = ix + math.cos(ang) * speed * u * 1.6
            y = GROUND - 3 + math.sin(ang) * speed * u * 1.6 + 15.0 * u * u
            if y < GROUND - 1:
                tone = ("light", 0) if u < 0.4 else ("brass", 6) if u < 0.75 else ("crimson", 5)
                cel.put(x, y, tone)
                if u < 0.7:  # a streak behind each
                    cel.put(x - math.cos(ang) * 1.3, y - math.sin(ang) * 1.3, ("brass", 6) if u < 0.4 else ("brass", 5))
                    cel.soft(x - math.cos(ang) * 2.6, y - math.sin(ang) * 2.6, ("crimson", 5))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=1.4, lean=5.0, footN=(-5.5, 0.0, 0.0), footF=(5.5, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=22.0, elbN=82.0, armF=10.0, elbF=20.0, hammer=-120.0, two=0.0, hold=-3.5, head_dx=0.0, head_dy=0.0, head_rot=4.0, breath=0.0,
                  heat=0.8, eye=0.8, embers=0.0, smear=0.0, sparks=0.0, hammer_free=0.0, hammer_at=(0.0, 0.0))


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.18))
    # He breathes like a bellows and the arm flares with every breath; the hammer shifts on his shoulder.
    return {**BASE, "breath": 0.6 + 0.6 * s, "lean": 5.0 + 1.4 * s, "drop": 1.4 + 0.5 * late, "head_rot": 4.0 + 4.0 * late, "hammer": -120.0 + 3.0 * late,
            "armF": 10.0 + 4.0 * late, "elbF": 20.0 + 6.0 * s, "heat": 1.0 if s > 0.3 else 0.8, "embers": ph}


def walk_pose(ph: float) -> Pose:
    c = math.cos(math.tau * ph)
    p: Pose = gait_legs(Gait(stride=0.78, give=1.25, lift=0.6, toe=0.6), ph)
    # He rolls from one foot to the other, shoulders swinging against the hips; the hammer bounces on its shoulder.
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 8.0 + 2.0 * math.cos(2 * math.tau * (ph - 0.06)), "dy": 0.8 * (1 + math.cos(2 * math.tau * (ph - 0.1))), "hip_rot": -0.9 * c, "sh_rot": 1.0 * c,
              "armN": 22.0 + 4.0 * c, "hammer": -120.0 + 5.0 * math.cos(2 * math.tau * (ph - 0.18)), "armF": 10.0 - 22.0 * c, "elbF": 24.0 - 8.0 * c,
              "head_dy": 0.5 * math.cos(2 * math.tau * (ph - 0.2)), "head_rot": 4.0 + 3.0 * math.cos(math.tau * (ph - 0.2)), "embers": 2 * ph})
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Anvil blow: both hands, the hammer hauled up and back over his head, a held breath, and the whole weight comes
# down. Feet are planted (x is measured from the shifted root).
_HIT = dict(two=1.0, hold=-4.0, dx=4.0, drop=4.6, lean=24.0, armN=58.0, elbN=10.0, hammer=50.0, head_rot=12.0, footN=(-9.5, 0.0, -22.0), footF=(6.5, 0.0, 0.0), heat=1.0)
ATTACK_KEYS = [
    (0.00, k(), "lin"),
    (0.20, k(two=1.0, hold=-4.0, dx=-1.5, drop=1.8, lean=-3.0, armN=118.0, elbN=40.0, hammer=-102.0, head_rot=-4.0, footN=(-4.0, 0.0, 0.0), footF=(7.0, 0.5, 4.0), heat=1.0), "out"),
    (0.38, k(two=1.0, hold=-4.0, dx=-3.0, drop=2.4, lean=-11.0, armN=164.0, elbN=40.0, hammer=-132.0, head_rot=-12.0, footN=(-2.5, 0.0, 0.0), footF=(8.5, 2.4, 10.0), heat=1.0), "out"),
    (0.45, k(two=1.0, hold=-4.0, dx=-3.4, drop=2.2, lean=-13.0, armN=168.0, elbN=42.0, hammer=-137.0, head_rot=-14.0, footN=(-2.1, 0.0, 0.0), footF=(8.9, 3.0, 12.0), heat=1.0), "io"),
    (0.51, k(two=1.0, hold=-4.0, dx=2.2, drop=2.6, lean=9.0, armN=116.0, elbN=14.0, hammer=-48.0, head_rot=6.0, footN=(-7.7, 0.0, -10.0), footF=(8.3, 0.4, 0.0), heat=1.0, smear=1.0), "in"),
    (0.56, k(**_HIT, smear=1.0, sparks=0.02), "lin"),
    (0.72, k(**{**_HIT, "drop": 5.4, "lean": 27.0, "hammer": 52.0}, sparks=0.98), "out"),
    (0.88, k(two=1.0, hold=-4.0, dx=2.0, drop=2.8, lean=12.0, armN=62.0, elbN=64.0, hammer=-40.0, head_rot=6.0, footN=(-7.5, 0.0, -8.0), footF=(5.5, 0.8, 4.0), sparks=1.0), "io"),
    (1.00, k(sparks=1.0), "io"),
]

# Hit: he gives little ground; the hammer slides back off his shoulder and the far arm is thrown out.
HURT_KEYS = stagger_keys(BASE, push=3.2, bend=9.0, buckle=2.4, whip=14.0, over={
    "impact": dict(armF=28.0, elbF=24.0, armN=26.0, elbN=82.0, hammer=-128.0, heat=1.0, eye=1.0),
    "reel": dict(armF=-46.0, elbF=40.0, armN=8.0, elbN=92.0, hammer=-150.0, heat=0.4, eye=0.3),
    "catch": dict(armF=26.0, elbF=24.0, armN=28.0, elbN=80.0, hammer=-112.0, heat=1.0, eye=1.0),
})

# Death: the hammer slides off behind him, he sits down hard where he stood, props himself a moment, and slumps
# forward over his knees; the slag arm and the light in the mask go dark.
_SIT = dict(dx=-5.0, drop=10.2, footN=(8.0, 0.5, 30.0), footF=(11.5, 0.5, 45.0), hammer_free=1.0, hammer_at=(-15.0, 5.0), hammer=178.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-2.4, drop=1.8, lean=-10.0, head_rot=-16.0, head_dx=-1.0, armF=-40.0, elbF=40.0, armN=14.0, elbN=100.0, hammer=-150.0, hammer_free=0.2, hammer_at=(-8.0, 30.0),
             footN=(-3.1, 0.0, 0.0), footF=(7.9, 1.4, 8.0), heat=1.0, eye=1.0), "out3"),
    (0.28, k(dx=-3.4, drop=3.6, lean=-14.0, head_rot=-8.0, armF=-20.0, elbF=30.0, armN=-20.0, elbN=40.0, hammer=-170.0, hammer_free=1.0, hammer_at=(-13.0, 18.0),
             footN=(-5.6, 0.0, 0.0), footF=(8.9, 0.0, 10.0), heat=0.8), "io"),
    (0.44, k(**_SIT, lean=-22.0, head_rot=-10.0, armN=-44.0, elbN=-10.0, armF=-30.0, elbF=-10.0, heat=0.7), "in"),
    (0.50, k(**{**_SIT, "drop": 9.4}, lean=-18.0, head_rot=4.0, armN=-44.0, elbN=-10.0, armF=-30.0, elbF=-10.0, heat=0.7), "out"),
    (0.62, k(**_SIT, lean=-14.0, head_rot=-6.0, armN=-40.0, elbN=-8.0, armF=-24.0, elbF=-8.0, heat=0.6, eye=0.6), "io"),
    (0.80, k(**_SIT, lean=20.0, head_rot=28.0, head_dy=1.0, armN=34.0, elbN=14.0, armF=44.0, elbF=10.0, heat=0.3, eye=0.3), "io"),
    (0.90, k(**_SIT, lean=27.0, head_rot=34.0, head_dy=1.4, armN=30.0, elbN=12.0, armF=40.0, elbF=8.0, heat=0.15, eye=0.1), "out"),
    (1.00, k(**_SIT, lean=26.0, head_rot=34.0, head_dy=1.4, armN=30.0, elbN=12.0, armF=40.0, elbF=8.0, heat=0.0, eye=0.0), "lin"),
]

STILL = lambda t: (-0.2 + 0.2 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [180] * 12, True, STILL),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [100] * 12, True, lambda t: (-0.5, 0.0)),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.10, 0.20, 0.29, 0.38, 0.45, 0.51, 0.56, 0.61, 0.66, 0.72, 0.80, 0.88, 0.94, 1.0],
                   [90, 90, 100, 110, 150, 130, 40, 50, 70, 80, 120, 110, 100, 90, 110], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.19, 0.28, 0.36, 0.44, 0.50, 0.56, 0.62, 0.71, 0.80, 0.90, 1.0],
                  [50, 50, 90, 80, 90, 70, 70, 80, 100, 160, 120, 130, 160, 1200], False, STILL),
}
