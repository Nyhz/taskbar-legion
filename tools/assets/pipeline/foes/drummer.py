"""Reaping Drummer — world 1, support. A burly bearded farmhand with a big harvest drum slung on his belly and,
strapped to his back, a tall pole flying a long blue pennant with a brass sun: the thing to look for above
the heads of a pack. He never stops beating the drum — that beat IS his aura — and only bangs it at the party
as an afterthought. When he falls the pole topples, the pennant comes down and the drum rolls away.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, keyed, loose, stagger_keys

FIGURE = ("Drummer", "foe", "w01")

BUILD = Build(root_x=40, thigh=5.8, shin=5.8, foot=4.0, hip_dx=1.4, spine=8.8, sh_near=3.4, sh_far=3.0, upper=5.2, fore=5.0, neck=0.6, head_dx=0.8)

L = {
    "E": ("ink", 0), "k": ("ink", 1),
    "s": ("skin", 2), "t": ("skin", 4), "u": ("skin", 5), "v": ("skin", 6),
    "q": ("azure", 4), "r": ("azure", 6), "p": ("azure", 7),
    "a": ("leather", 1), "b": ("leather", 2), "c": ("leather", 3), "d": ("leather", 4),
    "e": ("bone", 3), "f": ("bone", 4), "g": ("bone", 5), "h": ("bone", 6),
    "y": ("brass", 3), "z": ("brass", 5), "w": ("brass", 6),
}

# A bald crown, a blue headband knotted at the back, one hard eye, a great brown beard.
HEAD = [
    "...ttuuv..",
    "..tttuuvv.",
    ".qrrrrpppp",
    "qq.tsEuuv.",
    "...tttuuvv",
    "..abbccuv.",
    "..abbbccc.",
    "...abbccc.",
    "....abcc..",
]
# A pale shirt crossed by the straps of the drum and of the pole, a leather apron below.
TORSO = [
    "...stt...",
    ".effgghh.",
    "eeffgghhh",
    ".efkgghk.",
    ".effkgkh.",
    ".effgkhh.",
    ".aabbccd.",
    ".aabbccd.",
    ".aabbccdd",
    ".aa.bb.dd",
]
# The drum seen from the side and a little from above: the skin, two brass hoops, the laced shell.
DRUM = [
    ".hhhhhhh.",
    "ggghhhhhh",
    "zzzwwwzzy",
    "abbkcckda",
    "abkbckcda",
    "abbkcckda",
    "yzzwwwzzy",
    ".aabbccd.",
]

POLE = 31.0


class Drummer(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        lean = math.radians(pose.get("lean", 0.0))
        cx, cy = J["chest"]
        # The pole is strapped to his back: its foot at the small of the back, its top high over his head.
        base = (cx - 3.6 * math.cos(lean) - 5.0 * math.sin(lean), cy - 3.6 * math.sin(lean) + 5.0 * math.cos(lean))
        base = loose(pose, "pole", base, self.build.root_x)
        a = math.radians(pose.get("pole", -5.0) + pose.get("lean", 0.0) * (1.0 - pose.get("pole_free", 0.0)))
        J["poleB"] = base
        J["poleT"] = (base[0] + POLE * math.sin(a), base[1] - POLE * math.cos(a))
        # The drum hangs on the belly, ahead of the pelvis; freed, it is on its own.
        px, py = J["pelvis"]
        held = (px + 6.2 * math.cos(lean) + 6.4 * math.sin(lean), py + 6.2 * math.sin(lean) - 6.4 * math.cos(lean))
        J["drum"] = loose(pose, "drum", held, self.build.root_x)
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def above(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 3.6))

        def top(J: dict[str, Pt]) -> Pt:
            bx, by = J["poleB"]
            tx, ty = J["poleT"]
            return (bx + (tx - bx) * 0.9, by + (ty - by) * 0.9)

        return {"pennant": ChainSpec(Chain(9, 2.4, gravity=0.09, drag=0.2, damp=0.08), top, above, rest=(-1.0, 0.25))}

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        hip, knee, ankle, toe = J["hip" + s], J["knee" + s], J["ankle" + s], J["toe" + s]
        cel.limb(hip, knee, 4.6, 3.8, "leather", (1, 2, 3), far=far)
        cel.limb(knee, ankle, 3.6, 3.0, "leather", (1, 2, 3), far=far)
        cel.limb(ankle, toe, 3.2, 2.2, "ink", (1, 2, 4), far=far)

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool, stick: float) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 3.6, 3.2, "bone", (3, 4, 6), far=far)
        cel.limb(el, hd, 3.2, 2.8, "skin", (2, 4, 5), far=far)
        # The drumstick: a short rod from the fist, its padded head pale.
        a = math.radians(stick)
        tip = (hd[0] + 5.0 * math.cos(a), hd[1] + 5.0 * math.sin(a))
        cel.line(hd, tip, ("leather", 5 if not far else 4))
        cel.put(tip[0], tip[1], ("bone", 7))
        cel.put(hd[0], hd[1], ("skin", 4))

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        # Pole and pennant first: they are behind him.
        bx, by = J["poleB"]
        tx, ty = J["poleT"]
        cel.limb((bx, by), (tx, ty), 1.6, 1.4, "leather", (2, 4, 6))
        pen = ropes["pennant"]
        widths = [6.6, 6.6, 6.4, 6.0, 5.6, 5.0, 4.2, 3.2, 2.0]
        for i in range(len(pen) - 1):
            cel.limb(pen[i], pen[i + 1], widths[i], widths[i + 1], "azure", (4, 5, 7))
        # The brass sun on the hoist and a pale edge along the top: what reads from afar.
        hx, hy = pen[1]
        for dx, dy, t in ((0, 0, ("brass", 6)), (1, 0, ("brass", 5)), (0, 1, ("brass", 5)), (-1, 0, ("brass", 4)), (0, -1, ("brass", 6))):
            cel.put(hx + dx, hy + dy, t)
        for i in range(2, len(pen) - 1):
            cel.put(pen[i][0], pen[i][1] - widths[i] / 2 + 0.6, ("azure", 8))
        cel.put(tx, ty - 1, ("brass", 6))
        cel.put(tx, ty, ("brass", 5))
        cel.put(tx - 1, ty, ("brass", 4))
        cel.put(tx + 1, ty, ("brass", 6))

        self.arm(cel, J, "F", True, pose.get("stickF", 40.0))
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        cel.stamp_lean(TORSO, L, (px, py), 4, lean)
        hx, hy = J["head"]
        cel.stamp_turn(HEAD, L, (hx, hy + 1), 5, pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0))
        dx, dy = J["drum"]
        rot = pose.get("drum_rot", 0.0)
        if abs(rot) < 6.0:
            cel.stamp(DRUM, L, dx - 4, dy - 4)
        else:
            cel.stamp_rot(DRUM, L, dx, dy, 4.5, 4.0, rot)
        self.arm(cel, J, "N", False, pose.get("stickN", 60.0))
        cel.outline()
        # The beat: a burst of light on the drumhead as the stick lands, then a ring lifting off the skin.
        age = pose.get("beat_age", 1.0)
        if pose.get("drum_free", 0.0) < 0.5:
            if age < 0.05:
                cel.star(dx, dy - 6, 2)
                for ox, oy in ((-4, -7), (4, -8), (-2, -9), (2, -10), (0, -11)):
                    cel.soft(dx + ox, dy + oy, ("brass", 6))
            elif age < 0.3:
                r = 4.0 + age * 28.0
                cel.arc(dx, dy - 4, r + 1.0, -150, -30, ("brass", 2))
                cel.arc(dx, dy - 4, r, -150, -30, ("light", 0) if age < 0.12 else ("brass", 6))
        boom = pose.get("boom", 0.0)
        if boom > 0.05:
            for k_, tone in ((0, ("light", 0)), (1, ("brass", 6)), (2, ("brass", 4))):
                r = 6.0 + boom * 16.0 - k_ * 4.5
                if r > 4.0:
                    cel.arc(dx + 2, dy - 2, r, -48 + k_ * 6, 48 - k_ * 6, tone)


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=1.0, lean=3.0, footN=(-4.2, 0.0, 0.0), footF=(4.6, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=34.0, elbN=62.0, armF=44.0, elbF=52.0, stickN=64.0, stickF=50.0, head_dx=0.0, head_dy=0.0, head_rot=0.0, breath=0.0,
                  pole=-6.0, pole_free=0.0, pole_at=(0.0, 0.0), drum_free=0.0, drum_at=(0.0, 0.0), drum_rot=0.0, beat_age=1.0, boom=0.0)


def _strike(ph: float) -> tuple[float, float, float]:
    """One arm's beat over a cycle, as offsets (upper arm, elbow, stick angle) from the hands-on-the-drum pose: the
    stick lands at phase 0, rebounds, is carried up over the head, held, and comes down in one frame."""
    q = ph % 1.0
    if q < 0.12:
        up = 0.0
    elif q < 0.72:
        f = (q - 0.12) / 0.6
        up = f * f * (3.0 - 2.0 * f)
    elif q < 0.86:
        up = 1.0
    else:
        up = 1.0 - ((q - 0.86) / 0.14) ** 2
    return (96.0 * up, -32.0 * up, -144.0 * up)


def _age(ph: float) -> float:
    """How long since a stick last landed, in cycles (the two hands land half a cycle apart)."""
    return ((ph * 2) % 1.0) / 2


def idle_pose(ph: float) -> Pose:
    # One slow war-beat per hand a cycle, the hands alternating: each stick is carried high over his head and
    # brought down, and the whole body, the pole with it, jolts on the blow.
    aN, eN, sN = _strike(ph)
    aF, eF, sF = _strike(ph + 0.5)
    age = _age(ph)
    jolt = max(0.0, 1.0 - age * 7.0)
    sway = math.sin(math.tau * ph)
    return {**BASE, "armN": 34.0 + aN, "elbN": 62.0 + eN, "stickN": 64.0 + sN, "armF": 44.0 + aF, "elbF": 52.0 + eF, "stickF": 50.0 + sF,
            "drop": 1.0 + 1.4 * jolt, "lean": 3.0 + 1.2 * sway + 2.0 * jolt, "head_dy": 0.7 * jolt, "head_rot": 5.0 * sway, "pole": -6.0 - 2.0 * sway + 9.0 * jolt,
            "breath": 0.4 + 0.4 * sway, "beat_age": age}


def walk_pose(ph: float) -> Pose:
    c, s2 = math.cos(math.tau * ph), math.cos(2 * math.tau * (ph - 0.1))
    p: Pose = gait_legs(Gait(stride=0.82, give=1.3, lift=0.8, toe=0.9), ph)
    aN, eN, sN = _strike(ph + 0.1)
    aF, eF, sF = _strike(ph + 0.6)
    age = _age(ph + 0.1)
    p.update(lean=7.0 + 1.5 * s2, dy=0.8 + 0.5 * s2, hip_rot=-0.6 * c, sh_rot=0.4 * c, armN=34.0 + aN, elbN=62.0 + eN, stickN=64.0 + sN,
             armF=44.0 + aF, elbF=52.0 + eF, stickF=50.0 + sF, head_dx=0.0, head_dy=0.4 * s2, head_rot=0.0, breath=0.0,
             pole=-9.0 + 3.0 * math.cos(2 * math.tau * (ph - 0.2)) + 4.0 * max(0.0, 1.0 - age * 7.0), pole_free=0.0, pole_at=(0.0, 0.0), drum_free=0.0, drum_at=(0.0, 0.0),
             drum_rot=0.0, beat_age=age, boom=0.0)
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# The one thing he does to the party: both sticks high, a breath, and a blow on the drum that throws a ring of sound.
BANG_KEYS = [
    (0.00, k(), "lin"),
    (0.22, k(lean=-4.0, drop=0.6, armN=104.0, elbN=44.0, stickN=-50.0, armF=112.0, elbF=36.0, stickF=-60.0, head_rot=-8.0, pole=-10.0), "out"),
    (0.46, k(lean=-7.0, drop=0.4, armN=134.0, elbN=28.0, stickN=-84.0, armF=142.0, elbF=20.0, stickF=-94.0, head_rot=-12.0, head_dx=-0.4, pole=-13.0), "io"),
    (0.52, k(lean=9.0, drop=2.6, armN=40.0, elbN=58.0, stickN=74.0, armF=50.0, elbF=50.0, stickF=62.0, head_rot=8.0, head_dy=0.8, pole=4.0, beat_age=0.0, boom=0.15), "lin"),
    (0.62, k(lean=7.0, drop=2.2, armN=38.0, elbN=60.0, stickN=70.0, armF=48.0, elbF=52.0, stickF=58.0, head_rot=6.0, pole=-1.0, beat_age=0.2, boom=0.6), "out"),
    (0.76, k(lean=4.0, drop=1.4, armN=22.0, elbN=70.0, stickN=40.0, armF=34.0, elbF=62.0, stickF=30.0, pole=-8.0, boom=1.0), "out"),
    (1.00, k(), "io"),
]

HURT_KEYS = stagger_keys(BASE, push=4.2, bend=13.0, buckle=2.4, whip=18.0, over={
    "impact": dict(armN=6.0, elbN=70.0, armF=20.0, elbF=64.0, pole=4.0),
    "reel": dict(armN=-30.0, elbN=60.0, armF=-12.0, elbF=70.0, stickN=-10.0, stickF=-20.0, pole=-22.0),
    "catch": dict(armN=40.0, elbN=50.0, armF=50.0, elbF=44.0, pole=6.0),
})

# Death: thrown onto his back, the drum still on his belly. The pole comes loose and topples forward: the pennant
# comes down over the path — the sign that his beat is over.
_DOWN = dict(dx=-9.0, drop=10.0, lean=-90.0, armN=-250.0, elbN=20.0, armF=100.0, elbF=-24.0, stickN=-170.0, stickF=20.0,
             footN=(6.0, 0.5, 20.0), footF=(10.0, 0.9, 70.0), pole=86.0, pole_free=1.0, pole_at=(-3.0, 1.4), drum_rot=-78.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.08, k(dx=-2.2, drop=0.8, lean=-15.0, head_dx=-1.2, head_rot=-12.0, armN=-40.0, elbN=50.0, armF=30.0, elbF=40.0, pole=-2.0, footF=(3.4, 2.2, 20.0)), "out3"),
    (0.20, k(dx=-5.2, drop=-0.2, lean=-36.0, armN=-90.0, elbN=30.0, armF=80.0, elbF=10.0, stickN=-60.0, pole=8.0, pole_free=0.5, pole_at=(-6.0, 17.0),
             drum_rot=-20.0, footN=(-1.4, 2.4, 10.0), footF=(4.0, 4.6, 30.0)), "out"),
    (0.34, k(dx=-8.0, drop=5.6, lean=-70.0, armN=-170.0, elbN=20.0, armF=120.0, elbF=0.0, stickN=-120.0, pole=22.0, pole_free=1.0, pole_at=(-5.0, 10.0),
             drum_rot=-56.0, footN=(4.6, 4.6, 40.0), footF=(7.6, 7.6, 50.0)), "in"),
    (0.44, k(**{**_DOWN, "armF": 124.0, "footF": (9.2, 4.0, 60.0), "pole": 40.0, "pole_at": (-4.0, 5.0)}), "lin"),
    (0.54, k(**{**_DOWN, "drop": 9.2, "lean": -84.0, "footN": (6.0, 1.8, 20.0), "pole": 62.0, "pole_at": (-3.5, 2.6)}), "in"),
    (0.64, k(**{**_DOWN, "pole": 90.0}), "in"),
    (0.72, k(**{**_DOWN, "pole": 82.0}), "out"),
    (0.84, k(**_DOWN), "in"),
    (1.00, k(**_DOWN), "lin"),
]

def WIND(t: float) -> tuple[float, float]:
    """A breeze from ahead, and a kick up the cloth each time a stick lands: the pennant jumps with the beat."""
    kick = math.exp(-_age(t) * 9.0)
    return (-0.6 + 0.2 * math.sin(math.tau * t) - 0.5 * kick, 0.25 * math.sin(math.tau * (t * 2 + 0.15)) + 0.3 - 3.2 * kick)


def BREEZE(t: float) -> tuple[float, float]:
    """The same breeze with no beat in it (the stagger), or with the one blow of the attack."""
    return (-0.6 + 0.2 * math.sin(math.tau * t), 0.25 * math.sin(math.tau * (t * 2 + 0.15)) + 0.2)


def BANG_AIR(t: float) -> tuple[float, float]:
    x, y = BREEZE(t)
    kick = math.exp(-(t - 0.52) * 12.0) if t >= 0.52 else 0.0
    return (x - 0.4 * kick, y - 1.8 * kick)


ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [110] * 12, True, WIND),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [80] * 12, True,
                lambda t: (-0.95, 0.3 * math.sin(math.tau * (t * 2 + 0.1)) - 0.04 - 0.7 * math.exp(-_age(t + 0.1) * 9.0))),
    "attack": Anim("attack", keyed(BANG_KEYS), [0.0, 0.08, 0.15, 0.22, 0.30, 0.38, 0.46, 0.52, 0.57, 0.62, 0.69, 0.76, 0.88, 1.0],
                   [70, 70, 80, 90, 100, 110, 150, 45, 60, 70, 80, 90, 90, 100], False, BANG_AIR),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, BREEZE),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.04, 0.08, 0.14, 0.20, 0.27, 0.34, 0.39, 0.44, 0.49, 0.54, 0.59, 0.64, 0.72, 0.84, 1.0],
                  [50, 40, 70, 60, 70, 60, 60, 45, 50, 60, 70, 60, 70, 90, 140, 1200], False, lambda t: (-0.12, 0.0) if t < 0.5 else (2.2, 0.3)),  # down, the cloth is laid out along the path past the pole
}
