"""Sporecaller — world 2, caster. A squat thing under a red toadstool cap as wide as it is tall: two pale eyes in
the shadow of the gills, a lichen beard, a ragged robe, a root for a staff with a glowing spore bulb on it. It
waddles. To attack it winds up, the bulb swells, the cap coughs out a cloud and a spore bolt flies. When it dies
it bursts in a last cloud of spores and tips over on its back.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, keyed, loose, stagger_keys

BUILD = Build(root_x=40, thigh=4.4, shin=4.2, foot=3.4, hip_dx=1.2, spine=7.6, sh_near=2.8, sh_far=2.4, upper=4.8, fore=4.6, neck=0.5, head_dx=0.6, min_pelvis=3.6)

L = {
    "q": ("crimson", 2), "r": ("crimson", 3), "s": ("crimson", 4), "t": ("crimson", 5), "u": ("crimson", 6),
    "W": ("bone", 7), "g": ("bone", 3), "h": ("bone", 4), "b": ("bone", 5), "c": ("bone", 4),
    "k": ("ink", 1), "K": ("ink", 2), "G": ("sea", 7),
    "m": ("leather", 2), "n": ("leather", 3), "o": ("leather", 4), "p": ("leather", 5),
    "M": ("moss", 5), "N": ("moss", 7),
}

# A toadstool cap with pale warts and its gills showing; under it a face that is only shadow and two eyes; a beard.
CAP = [
    ".....rsssst......",
    "...rrssWstttu....",
    "..rrssssttWtuu...",
    ".qrrsWsstttttuu..",
    "qqrrssssttWttuuu.",
    "qqrrrsssstttttuuu",
    ".qqghghghghghghu.",
    "......kkKkKKk....",
    "......kKGkKGK....",
    "......ckKKKKb....",
    ".......cbcbb.....",
]
TORSO = [
    ".MNMN...",
    ".mnnoop.",
    "mmnnoopp",
    "mmnnoopp",
    ".mnMNop.",
    ".mnnoop.",
    "mmnnoopp",
    "m.nn.o.p",
]

STAFF_UP, STAFF_DOWN = 12.0, 9.0


def staff_points(grip: Pt, angle: float) -> tuple[Pt, Pt, Pt]:
    """Foot, head and bulb of the staff; `angle` is where the head points (−90 = straight up)."""
    a = math.radians(angle)
    d = (math.cos(a), math.sin(a))
    top = (grip[0] + d[0] * STAFF_UP, grip[1] + d[1] * STAFF_UP)
    foot = (grip[0] - d[0] * STAFF_DOWN, grip[1] - d[1] * STAFF_DOWN)
    bulb = (top[0] + d[0] * 2.0 - d[1] * 1.6, top[1] + d[1] * 2.0 + d[0] * 1.6)
    return foot, top, bulb


class Sporecaller(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        J["grip"] = loose(pose, "staff", J["handN"], self.build.root_x)
        _, top, bulb = staff_points(J["grip"], pose["staff"])
        J["staff_top"], J["bulb"] = top, bulb
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def grounded(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        return {
            "mantle": ChainSpec(Chain(4, 2.0, gravity=0.22, drag=0.15, damp=0.1), lambda J: (J["chest"][0] - 2.4, J["chest"][1] + 1.0), grounded, (-0.5, 0.9)),
            "charm": ChainSpec(Chain(3, 1.6, gravity=0.2, drag=0.1, damp=0.08), lambda J: J["staff_top"], grounded),
        }

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        cel.limb(J["hip" + s], J["knee" + s], 3.6, 3.0, "leather", (1, 2, 4), far=far)
        cel.limb(J["knee" + s], J["ankle" + s], 3.0, 2.6, "bone", (2, 3, 5), far=far)
        cel.limb(J["ankle" + s], J["toe" + s], 3.0, 2.2, "bone", (2, 4, 5), far=far)

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 3.2, 2.8, "leather", (2, 3, 5), far=far)
        cel.limb(el, hd, 2.6, 2.2, "bone", (2, 4, 6), far=far)

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        mantle = ropes["mantle"]
        for i in range(len(mantle) - 1):
            cel.limb(mantle[i], mantle[i + 1], 3.6 - i * 0.3, 3.4 - i * 0.5, "moss", (3, 5, 6))
        self.arm(cel, J, "F", far=True)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        cel.stamp_lean(TORSO, L, (px, py), 4, lean)
        # The staff: a twisted root, a hook at the top and the bulb hanging in it.
        foot, top, bulb = staff_points(J["grip"], pose["staff"])
        cel.limb(foot, top, 1.8, 1.6, "leather", (2, 3, 5))
        cel.limb(top, bulb, 1.6, 1.2, "leather", (2, 3, 5))
        charge = pose.get("charge", 0.0)
        lit = pose.get("lit", 1.0)
        r = 1.6 + 2.2 * charge
        for dy in range(-int(r) - 1, int(r) + 2):
            for dx in range(-int(r) - 1, int(r) + 2):
                dd = math.hypot(dx, dy)
                if dd <= r:
                    tone = ("ink", 3) if lit < 0.3 else ("light", 0) if dd < r * 0.45 and charge > 0.4 else ("sea", 8) if dd < r * 0.6 else ("sea", 6)
                    cel.put(bulb[0] + dx, bulb[1] + dy, tone)
        charm = ropes["charm"]
        for i in range(len(charm) - 1):
            cel.line(charm[i], charm[i + 1], ("bone", 4))
        cel.put(charm[-1][0], charm[-1][1], ("bone", 7))
        hx, hy = J["head"]
        turn = pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0)
        cel.stamp_turn(CAP, {**L, "G": ("sea", 7) if lit >= 0.3 else ("ink", 3)}, (hx, hy + 2), 8, turn)
        self.arm(cel, J, "N", far=False)
        cel.outline()

        a = math.radians(turn)
        crown = (hx + 9.0 * math.sin(a), hy - 9.0 * math.cos(a))
        # Spores always hang about the cap.
        if lit >= 0.3:
            ph = pose.get("spores", 0.0)
            for i in range(5):
                u = (ph + i / 5) % 1.0
                x = crown[0] + (i * 4.3 % 15.0 - 7.0) + 2.0 * math.sin(math.tau * (u + i * 0.37))
                y = crown[1] + 3.0 - 9.0 * u
                cel.soft(x, y, ("moss", 8) if i % 2 else ("sea", 7))
        if charge > 0.3:
            for i in range(6):
                ang = math.tau * (i / 6 + charge)
                cel.soft(bulb[0] + math.cos(ang) * (r + 2.5), bulb[1] + math.sin(ang) * (r + 2.5), ("sea", 7))
        puff = pose.get("puff", 0.0)
        if 0.01 < puff < 0.985:
            self.cloud(cel, (crown[0], crown[1] - 1.0), puff, 9.0, 12)
        burst = pose.get("burst", 0.0)
        if 0.01 < burst < 0.985:
            self.cloud(cel, (J["chest"][0], J["chest"][1] - 2.0), burst, 17.0, 26)
        bolt = pose.get("bolt", 0.0)
        if 0.01 < bolt < 0.985:
            bx, by = self.build.root_x + 14.0 + 34.0 * bolt, GROUND - 17.0 + 2.0 * math.sin(bolt * 9.0)
            for dx, dy, tone in ((0, 0, ("light", 0)), (1, 0, ("sea", 8)), (-1, 0, ("sea", 8)), (0, 1, ("sea", 8)), (0, -1, ("sea", 8)), (1, 1, ("sea", 6)), (-1, -1, ("sea", 6)),
                                 (1, -1, ("sea", 6)), (-1, 1, ("sea", 6)), (2, 0, ("sea", 6))):
                cel.soft(bx + dx, by + dy, tone)
            for i in range(1, 7):
                cel.soft(bx - 2.0 - i * 2.0, by + math.sin(i * 1.7 + bolt * 20.0) * 1.6, ("sea", 7) if i < 3 else ("moss", 8) if i < 5 else ("sea", 5))

    @staticmethod
    def cloud(cel: Cel, at: Pt, u: float, reach: float, n: int) -> None:
        """A cloud of spores swelling out from a point and thinning as it rises."""
        for i in range(n):
            ang = math.tau * (i * 0.618)
            dist = (0.25 + 0.75 * ((i * 7) % 10) / 10.0) * reach * (0.2 + 0.8 * u)
            x = at[0] + math.cos(ang) * dist * 1.2
            y = at[1] + math.sin(ang) * dist * 0.7 - 5.0 * u
            if y < GROUND - 1 and (u < 0.6 or i % 2 == 0):
                tone = ("moss", 8) if i % 3 == 0 else ("sea", 7) if i % 3 == 1 else ("brass", 6)
                cel.soft(x, y, tone)
                if u < 0.5 and i % 4 == 0:
                    cel.soft(x + 1, y, tone)


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=0.8, lean=5.0, footN=(-2.8, 0.0, 0.0), footF=(3.0, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=34.0, elbN=52.0, armF=4.0, elbF=24.0, staff=-84.0, head_dx=0.0, head_dy=0.0, head_rot=0.0, breath=0.0,
                  spores=0.0, charge=0.0, puff=0.0, bolt=0.0, burst=0.0, lit=1.0, staff_free=0.0, staff_at=(0.0, 0.0))


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.18))
    # The cap nods and sways on top of him.
    return {**BASE, "breath": 0.4 + 0.4 * s, "lean": 5.0 + 1.5 * s, "drop": 0.8 + 0.4 * late, "head_rot": 5.0 * late, "head_dy": 0.4 * s,
            "staff": -84.0 + 3.0 * late, "armF": 4.0 + 5.0 * late, "spores": ph}


def walk_pose(ph: float) -> Pose:
    c = math.cos(math.tau * ph)
    p: Pose = gait_legs(Gait(stride=0.9, give=1.2, lift=0.8, toe=0.8), ph)
    # A waddle: he rocks from foot to foot and the cap rocks the other way a beat later.
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 6.0 + 4.0 * c, "dy": 0.5 * (1 + math.cos(2 * math.tau * (ph - 0.1))), "hip_rot": -0.5 * c, "sh_rot": 0.5 * c,
              "head_rot": -7.0 * math.cos(math.tau * (ph - 0.18)), "head_dy": 0.5 * math.cos(2 * math.tau * (ph - 0.22)),
              "armN": 34.0 + 6.0 * c, "staff": -84.0 + 7.0 * math.cos(math.tau * (ph - 0.1)), "armF": 4.0 - 20.0 * c, "elbF": 24.0, "spores": 2 * ph})
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Spore bolt: he draws the staff back while the bulb swells, then thrusts it out; the cap coughs and the bolt flies.
CAST_KEYS = [
    (0.00, k(), "lin"),
    (0.24, k(dx=-1.0, drop=1.8, lean=-6.0, armN=110.0, elbN=40.0, staff=-112.0, head_rot=-8.0, charge=0.5, footN=(-1.8, 0.0, 0.0), footF=(4.0, 0.0, 0.0), spores=0.5), "out"),
    (0.42, k(dx=-1.4, drop=2.2, lean=-9.0, armN=124.0, elbN=44.0, staff=-120.0, head_rot=-10.0, charge=1.0, footN=(-1.4, 0.0, 0.0), footF=(4.4, 0.6, 6.0), spores=0.9), "io"),
    (0.50, k(dx=1.6, drop=1.6, lean=12.0, armN=84.0, elbN=8.0, staff=-38.0, head_rot=12.0, head_dy=1.0, charge=0.3, puff=0.02, bolt=0.02, footN=(-4.4, 0.0, -8.0),
             footF=(3.4, 0.0, 0.0), spores=1.1), "in"),
    (0.80, k(dx=1.2, drop=1.2, lean=9.0, armN=80.0, elbN=12.0, staff=-44.0, head_rot=8.0, puff=0.98, bolt=0.98, footN=(-4.0, 0.0, -6.0), footF=(3.6, 0.0, 0.0), spores=1.6), "out"),
    (1.00, k(puff=1.0, bolt=1.0, spores=2.0), "io"),
]

# Hit: the cap is knocked right back and coughs out a puff of spores; the staff swings wide.
HURT_KEYS = stagger_keys(BASE, push=4.0, bend=13.0, buckle=1.6, whip=24.0, over={
    "impact": dict(armN=30.0, elbN=54.0, staff=-90.0, armF=14.0, elbF=24.0, puff=0.02, spores=0.2),
    "mid": dict(armN=22.0, elbN=58.0, staff=-98.0, armF=-14.0, elbF=34.0, puff=0.3, spores=0.4),
    "reel": dict(armN=12.0, elbN=62.0, staff=-106.0, armF=-38.0, elbF=40.0, puff=0.6, spores=0.6),
    "catch": dict(armN=42.0, elbN=46.0, staff=-74.0, armF=18.0, elbF=22.0, puff=0.98, spores=1.0),
    "recover": dict(armN=38.0, elbN=50.0, staff=-80.0, armF=10.0, elbF=24.0, puff=1.0, spores=1.5),
})
# The puff has left by the time he is back on his feet: without this the blend back to rest would draw it again.
HURT_KEYS[-1] = (1.0, {**HURT_KEYS[-1][1], "puff": 1.0, "spores": 2.0}, "io")

# Death: he bursts in a last cloud, sits down hard and tips onto his back under the cap; the staff falls away.
_BACK = dict(dx=-5.0, drop=9.0, lean=-84.0, head_rot=0.0, armN=-250.0, elbN=10.0, armF=80.0, elbF=-10.0, footN=(4.5, 0.4, 20.0), footF=(7.0, 0.9, 60.0),
             staff_free=1.0, staff_at=(13.0, 1.2), staff=4.0, lit=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-2.0, drop=1.2, lean=-12.0, head_rot=-14.0, head_dx=-1.0, armN=-10.0, elbN=40.0, armF=-40.0, elbF=40.0, staff=-110.0, staff_free=0.4, staff_at=(6.0, 14.0),
             footN=(-0.8, 0.0, 0.0), footF=(5.0, 1.2, 10.0), burst=0.02), "out3"),
    (0.30, k(dx=-3.0, drop=5.6, lean=-24.0, head_rot=-6.0, armN=-40.0, elbN=20.0, armF=30.0, elbF=10.0, staff=-60.0, staff_free=1.0, staff_at=(9.0, 10.0),
             footN=(2.6, 0.4, 10.0), footF=(5.6, 0.6, 30.0), burst=0.4, lit=0.6), "io"),
    (0.46, k(dx=-3.6, drop=7.0, lean=-34.0, head_rot=-10.0, armN=-70.0, elbN=20.0, armF=50.0, elbF=0.0, staff=-20.0, staff_free=1.0, staff_at=(11.5, 4.0),
             footN=(3.6, 0.4, 16.0), footF=(6.4, 0.7, 40.0), burst=0.7, lit=0.3), "io"),
    (0.60, k(**{**_BACK, "lean": -70.0, "drop": 8.4, "footF": (6.8, 3.0, 50.0), "armN": -180.0}, burst=0.9), "in"),
    (0.68, k(**_BACK, burst=0.98), "in"),
    (0.76, k(**{**_BACK, "lean": -78.0, "footF": (7.0, 3.2, 56.0)}, burst=1.0), "out"),
    (0.86, k(**_BACK, burst=1.0), "in"),
    (1.00, k(**_BACK, burst=1.0), "lin"),
]

STILL = lambda t: (-0.2 + 0.2 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [170] * 12, True, STILL),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [70] * 12, True, lambda t: (-0.5, 0.0)),
    "attack": Anim("attack", keyed(CAST_KEYS), [0.0, 0.12, 0.24, 0.33, 0.42, 0.50, 0.56, 0.62, 0.68, 0.74, 0.80, 0.90, 1.0],
                   [80, 90, 100, 110, 160, 60, 70, 70, 70, 70, 90, 90, 110], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.20, 0.30, 0.38, 0.46, 0.53, 0.60, 0.64, 0.68, 0.76, 0.86, 1.0],
                  [50, 50, 80, 80, 90, 80, 80, 70, 60, 60, 80, 90, 120, 1200], False, STILL),
}
