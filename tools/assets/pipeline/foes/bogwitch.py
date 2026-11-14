"""Bog Witch — world 3, caster. A hag bent double under a shawl, all hood and nose, with one bright eye and grey
hair trailing. She carries a crooked pole taller than she is, and from its hooked end, on a chain, a cage lantern
full of fireflies. She hobbles on the pole. To attack she draws the lantern up to her mouth and whispers into it
while it swells, then whips the pole forward: the light tears loose and goes hunting, a will-o'-the-wisp, and the
cage hangs dark until a new one kindles. When she dies the lantern smashes, the fireflies pour out and scatter
upwards, and she folds down into her own rags.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, keyed, loose, stagger_keys

FIGURE = ("BogWitch", "foe", "w03")

BUILD = Build(root_x=40, thigh=4.6, shin=4.4, foot=3.4, hip_dx=1.2, spine=8.2, sh_near=2.8, sh_far=2.4, upper=5.0, fore=4.8, neck=0.6, head_dx=1.6, min_pelvis=3.6)

L = {
    # A step lighter than first drawn: she is small and dark, and the marsh behind her is dark too.
    "a": ("dusk", 1), "b": ("dusk", 3), "c": ("dusk", 4), "d": ("dusk", 5),
    "s": ("skin", 4), "t": ("skin", 5), "u": ("skin", 6), "k": ("ink", 0),
    "h": ("bone", 5), "i": ("bone", 7), "B": ("bone", 7), "M": ("moss", 5), "N": ("moss", 7),
}

# A deep hood with a long nose and a pointed chin coming out of it, one eye alight (E), grey wisps of hair.
HEAD = [
    "...abbc....",
    "..abbccd...",
    ".abbcccdd..",
    ".abbckkkdd.",
    "aabckkEstu.",
    "aabckssttuu",
    ".abckksst..",
    ".abbckstt..",
    "..abhitu...",
    "..ih.i.....",
]
# Shawl over shawl, patched with moss, a string of little bones round the neck, the hem in rags.
TORSO = [
    "..abbcd..",
    ".abbccdd.",
    "aabBcBddd",
    "aabbccddd",
    ".abMccNdd",
    "aabbccddd",
    "aabbcMddd",
    "a.bb.cd.d",
    "a..b..d..",
]

POLE_UP, POLE_DOWN = 20.0, 9.0


def pole_points(grip: Pt, angle: float) -> tuple[Pt, Pt, Pt]:
    """Foot, head and the hooked tip the lantern's chain hangs from; `angle` is where the head points (−90 = up)."""
    a = math.radians(angle)
    d = (math.cos(a), math.sin(a))
    top = (grip[0] + d[0] * POLE_UP, grip[1] + d[1] * POLE_UP)
    foot = (grip[0] - d[0] * POLE_DOWN, grip[1] - d[1] * POLE_DOWN)
    tip = (top[0] + d[0] * 1.5 - d[1] * 3.4, top[1] + d[1] * 1.5 + d[0] * 3.4)
    return foot, top, tip


class BogWitch(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        J["grip"] = loose(pose, "pole", J["handN"], self.build.root_x)
        _, _, J["pole_tip"] = pole_points(J["grip"], pose["pole"])
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def grounded(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 3.0))

        return {
            "lantern": ChainSpec(Chain(3, 1.8, gravity=0.3, drag=0.08, damp=0.05), lambda J: J["pole_tip"], grounded),
            "hair": ChainSpec(Chain(4, 2.0, gravity=0.2, drag=0.15, damp=0.1), lambda J: (J["head"][0] - 3.0, J["head"][1] - 2.0), grounded, (-0.7, 0.7)),
            "shawl": ChainSpec(Chain(4, 2.2, gravity=0.24, drag=0.15, damp=0.1), lambda J: (J["chest"][0] - 2.6, J["chest"][1] + 1.0), grounded, (-0.5, 0.9)),
        }

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        cel.limb(J["hip" + s], J["knee" + s], 4.4, 3.6, "leather", (1, 2, 3), far=far)
        cel.limb(J["knee" + s], J["ankle" + s], 2.6, 2.2, "bone", (2, 3, 5), far=far)
        cel.limb(J["ankle" + s], J["toe" + s], 2.8, 2.0, "leather", (1, 2, 4), far=far)

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 3.4, 3.0, "dusk", (3, 4, 5), far=far)
        cel.limb(el, hd, 2.2, 1.8, "skin", (3, 5, 6), far=far)
        cel.put(hd[0], hd[1], ("skin", 4 if far else 6))

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        lit, charge = pose.get("lit", 1.0), pose.get("charge", 0.0)
        for name, ramp, w0 in (("shawl", "dusk", 4.2), ("hair", "bone", 2.4)):
            pts = ropes[name]
            for i in range(len(pts) - 1):
                cel.limb(pts[i], pts[i + 1], w0 - i * 0.4, w0 - 0.4 - i * 0.4, ramp, (2, 3, 4) if ramp == "dusk" else (4, 5, 7))
        self.arm(cel, J, "F", far=True)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        cel.stamp_lean(TORSO, L, (px, py), 4, lean)
        # The pole, its hook, the chain and the cage.
        foot, top, tip = pole_points(J["grip"], pose["pole"])
        cel.limb(foot, top, 1.8, 1.5, "leather", (2, 4, 5))
        cel.limb(top, tip, 1.5, 1.1, "leather", (2, 4, 5))
        chain = ropes["lantern"]
        broken = pose.get("smash", 0.0) > 0.5
        for i in range(len(chain) - 1):
            cel.line(chain[i], chain[i + 1], ("ink", 5))
        lx, ly = chain[-1]
        if not broken:
            glass = ("ink", 2) if lit < 0.3 else ("light", 0) if charge > 0.5 else ("brass", 7)
            halo = ("ink", 3) if lit < 0.3 else ("brass", 6) if charge > 0.3 else ("moss", 8)
            for dx, dy, tone in ((-1, 0, ("ink", 4)), (0, 0, ("ink", 4)), (1, 0, ("ink", 4)), (-2, 1, ("ink", 4)), (2, 1, ("ink", 4)), (-2, 2, ("ink", 3)), (2, 2, ("ink", 3)),
                                 (-2, 3, ("ink", 3)), (2, 3, ("ink", 3)), (-1, 4, ("ink", 3)), (0, 4, ("ink", 3)), (1, 4, ("ink", 3)),
                                 (-1, 1, halo), (0, 1, glass), (1, 1, halo), (-1, 2, glass), (0, 2, glass), (1, 2, glass), (-1, 3, halo), (0, 3, glass), (1, 3, halo)):
                cel.put(lx + dx, ly + dy, tone)
        hx, hy = J["head"]
        turn = pose.get("head_rot", 0.0) + (lean if abs(lean) > 40 else 0.0)
        eye = pose.get("eye", 1.0)
        cel.stamp_turn(HEAD, {**L, "E": ("brass", 7) if eye >= 0.5 else ("ink", 2)}, (hx, hy + 1), 4, turn)
        self.arm(cel, J, "N", far=False)
        cel.outline()

        if eye >= 0.5:
            a_ = math.radians(turn)
            cel.put(hx + 2.5 * math.cos(a_) + 5.0 * math.sin(a_), hy + 2.5 * math.sin(a_) - 5.0 * math.cos(a_), ("light", 0))
        # Fx: the fireflies in and around the cage, the light swelling, the wisp on the hunt, the swarm set loose.
        cx, cy = lx, ly + 2
        if lit >= 0.3 and not broken:
            ph = pose.get("flies", 0.0)
            for i in range(4):
                ang = math.tau * (ph + i / 4)
                cel.soft(cx + math.cos(ang * (1 + i % 2)) * (3.5 + i * 0.6), cy + math.sin(ang) * (2.6 + i * 0.4), ("moss", 8) if i % 2 else ("brass", 7))
            for dx, dy in ((-3, 2), (3, 2), (0, -1), (0, 5)):
                cel.soft(lx + dx, ly + dy, ("brass", 5))
        if charge > 0.2 and not broken:
            for i in range(8):
                ang = math.tau * i / 8 + charge * 3.0
                cel.soft(cx + math.cos(ang) * (2.0 + 4.0 * charge), cy + math.sin(ang) * (2.0 + 4.0 * charge), ("brass", 7) if i % 2 else ("light", 0))
        wisp = pose.get("wisp", 0.0)
        if 0.01 < wisp < 0.985:
            wx = self.build.root_x + 27.0 + 26.0 * wisp
            wy = GROUND - 19.0 + 4.0 * math.sin(wisp * 10.0)
            for dx, dy, tone in ((0, 0, ("light", 0)), (1, 0, ("light", 0)), (0, 1, ("brass", 7)), (1, 1, ("brass", 7)), (-1, 0, ("brass", 7)), (2, 0, ("brass", 7)), (0, -1, ("brass", 7)),
                                 (1, -1, ("brass", 6)), (0, 2, ("moss", 8)), (1, 2, ("moss", 8)), (-1, 1, ("moss", 8)), (2, 1, ("moss", 8)), (-1, -1, ("brass", 6)), (2, -1, ("moss", 8)),
                                 (0, -2, ("brass", 6))):
                cel.soft(wx + dx, wy + dy, tone)
            for i in range(1, 8):  # the tail it drags
                tx = wx - 1.5 - i * 2.2
                cel.soft(tx, GROUND - 19.0 + 4.0 * math.sin((wisp - i * 0.022) * 10.0) + (i % 2), ("brass", 7) if i < 3 else ("moss", 8) if i < 6 else ("moss", 6))
        swarm = pose.get("swarm", 0.0)
        if 0.01 < swarm < 0.985:
            ox, oy = self.build.root_x + pose.get("swarm_x", 12.0), GROUND - 4.0
            for i in range(18):
                ang = math.tau * (i * 0.618) + swarm * 4.0
                rad = (2.0 + ((i * 7) % 10)) * (0.3 + swarm)
                y = oy - (10.0 + (i % 5) * 9.0) * swarm + math.sin(ang) * 2.0
                if (swarm < 0.7 or i % 2 == 0) and y > -cel.top:
                    cel.soft(ox + math.cos(ang) * rad * 1.4, y, ("moss", 8) if i % 3 == 0 else ("brass", 7) if i % 3 == 1 else ("light", 0))
        if broken and swarm < 0.25:
            cel.star(self.build.root_x + pose.get("swarm_x", 12.0), GROUND - 4, 3)


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=1.0, lean=20.0, footN=(-3.0, 0.0, 0.0), footF=(2.6, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=50.0, elbN=40.0, armF=20.0, elbF=40.0, pole=-78.0, head_dx=0.0, head_dy=0.0, head_rot=-8.0, breath=0.0,
                  lit=1.0, charge=0.0, wisp=0.0, flies=0.0, eye=1.0, smash=0.0, swarm=0.0, swarm_x=12.0, pole_free=0.0, pole_at=(0.0, 0.0))


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    # She leans on the pole, nodding and muttering, and the free hand keeps working at the air.
    return {**BASE, "breath": 0.4 + 0.4 * s, "lean": 20.0 + 2.0 * s, "drop": 1.0 + 0.4 * late, "head_rot": -8.0 + 6.0 * math.sin(math.tau * 2 * ph), "pole": -78.0 + 2.0 * late,
            "armF": 20.0 + 10.0 * late, "elbF": 40.0 + 14.0 * math.sin(math.tau * 2 * (ph - 0.1)), "flies": ph}


def walk_pose(ph: float) -> Pose:
    c = math.cos(math.tau * ph)
    p: Pose = gait_legs(Gait(stride=0.85, give=1.2, lift=0.7, toe=0.7), ph)
    # A quick hobble, the pole stabbed down ahead of every other step and hauled on.
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 22.0 + 4.0 * c, "dy": 0.6 * (1 + math.cos(2 * math.tau * (ph - 0.1))), "hip_rot": -0.5 * c, "sh_rot": 0.5 * c,
              "armN": 50.0 + 10.0 * c, "pole": -78.0 + 9.0 * math.cos(math.tau * (ph - 0.1)), "armF": 20.0 - 18.0 * c, "elbF": 44.0,
              "head_rot": -8.0 + 5.0 * math.cos(math.tau * (ph - 0.2)), "head_dy": 0.4 * math.cos(2 * math.tau * (ph - 0.2)), "flies": 2 * ph})
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Will-o'-the-wisp: she draws the lantern up to her face and whispers into it, then whips the pole forward and
# the light tears loose. The cage hangs dark until the end.
CAST_KEYS = [
    (0.00, k(), "lin"),
    (0.22, k(dx=-0.8, drop=1.6, lean=12.0, armN=40.0, elbN=96.0, pole=-128.0, head_rot=-18.0, armF=60.0, elbF=70.0, charge=0.4, flies=0.4, footN=(-2.2, 0.0, 0.0), footF=(3.4, 0.0, 0.0)), "out"),
    (0.42, k(dx=-1.2, drop=2.0, lean=9.0, armN=36.0, elbN=104.0, pole=-136.0, head_rot=-22.0, armF=70.0, elbF=80.0, charge=1.0, flies=0.9, footN=(-1.8, 0.0, 0.0), footF=(3.8, 0.5, 6.0)), "io"),
    (0.50, k(dx=1.8, drop=1.8, lean=30.0, armN=84.0, elbN=6.0, pole=-48.0, head_rot=4.0, armF=-20.0, elbF=30.0, charge=0.0, lit=0.0, wisp=0.02, footN=(-4.8, 0.0, -10.0),
             footF=(2.8, 0.0, 0.0)), "in"),
    (0.60, k(dx=2.0, drop=2.0, lean=32.0, armN=80.0, elbN=8.0, pole=-40.0, head_rot=6.0, armF=-24.0, elbF=30.0, lit=0.0, wisp=0.34, footN=(-5.0, 0.0, -12.0), footF=(2.6, 0.0, 0.0)), "out"),
    (0.84, k(dx=1.0, drop=1.4, lean=24.0, armN=62.0, elbN=30.0, pole=-58.0, head_rot=-4.0, lit=0.0, wisp=0.98, footN=(-4.0, 0.0, -4.0), footF=(2.6, 0.0, 0.0)), "io"),
    (1.00, k(wisp=1.0, flies=1.0), "io"),
]

# Hit: she is so bent already that the blow straightens her; the lantern swings wild on its chain.
HURT_KEYS = stagger_keys(BASE, push=3.8, bend=16.0, buckle=1.8, whip=22.0, over={
    "impact": dict(armN=44.0, elbN=50.0, pole=-88.0, armF=40.0, elbF=40.0, flies=0.2),
    "reel": dict(armN=24.0, elbN=70.0, pole=-112.0, armF=-40.0, elbF=50.0, flies=0.5),
    "catch": dict(armN=58.0, elbN=30.0, pole=-66.0, armF=34.0, elbF=30.0, flies=0.9),
})

# Death: the pole goes over, the lantern smashes on the ground and the fireflies pour up out of it; she clutches
# at them and folds down into her rags.
_RAGS = dict(dx=1.0, drop=10.0, lean=74.0, head_rot=0.0, head_dy=0.6, armN=96.0, elbN=6.0, armF=108.0, elbF=4.0, footN=(-4.4, 0.4, -100.0), footF=(-2.6, 0.4, -100.0),
             pole_free=1.0, pole_at=(4.0, 1.4), pole=-6.0, lit=0.0, eye=0.0, smash=1.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-2.0, drop=1.2, lean=4.0, head_rot=-20.0, head_dx=-1.0, armN=30.0, elbN=50.0, pole=-100.0, armF=-30.0, elbF=40.0, footN=(-1.0, 0.0, 0.0), footF=(4.6, 1.0, 8.0)), "out3"),
    (0.26, k(dx=-1.4, drop=2.0, lean=14.0, head_rot=-10.0, armN=70.0, elbN=20.0, armF=60.0, elbF=40.0, pole=-40.0, pole_free=0.6, pole_at=(2.0, 8.0), footN=(-1.6, 0.0, 0.0),
             footF=(4.0, 0.0, 0.0)), "io"),
    (0.36, k(dx=-1.0, drop=2.6, lean=18.0, head_rot=-24.0, armN=110.0, elbN=20.0, armF=120.0, elbF=20.0, pole=-6.0, pole_free=1.0, pole_at=(4.0, 1.4), lit=0.0, smash=1.0, swarm=0.02,
             footN=(-2.0, 0.0, 0.0), footF=(3.6, 0.0, 0.0)), "in"),
    (0.52, k(dx=-0.6, drop=3.4, lean=10.0, head_rot=-30.0, armN=140.0, elbN=14.0, armF=150.0, elbF=10.0, pole=-6.0, pole_free=1.0, pole_at=(4.0, 1.4), lit=0.0, smash=1.0, swarm=0.4,
             footN=(-2.4, 0.0, 0.0), footF=(3.2, 0.0, 0.0), eye=1.0), "out"),
    (0.66, k(**{**_RAGS, "dx": 0.0, "drop": 7.0, "lean": 36.0, "armN": 100.0, "armF": 120.0, "head_rot": -10.0, "eye": 0.0, "footN": (-3.6, 0.4, -80.0), "footF": (-1.6, 0.4, -80.0)},
             swarm=0.62), "in"),
    (0.76, k(**_RAGS, swarm=0.78), "in"),
    (0.84, k(**{**_RAGS, "drop": 9.4, "lean": 68.0}, swarm=0.88), "out"),
    (0.94, k(**_RAGS, swarm=0.98), "in"),
    (1.00, k(**_RAGS, swarm=1.0), "lin"),
]

STILL = lambda t: (-0.2 + 0.2 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [160] * 12, True, STILL),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [65] * 12, True, lambda t: (-0.5, 0.0)),
    "attack": Anim("attack", keyed(CAST_KEYS), [0.0, 0.11, 0.22, 0.32, 0.42, 0.50, 0.55, 0.60, 0.66, 0.72, 0.78, 0.84, 0.92, 1.0],
                   [80, 90, 100, 120, 170, 50, 60, 70, 70, 70, 70, 90, 90, 110], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.18, 0.26, 0.31, 0.36, 0.44, 0.52, 0.59, 0.66, 0.71, 0.76, 0.84, 0.94, 1.0],
                  [50, 50, 80, 80, 80, 60, 90, 90, 100, 80, 80, 70, 80, 100, 140, 1200], False, STILL),
}
