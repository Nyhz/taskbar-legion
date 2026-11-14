"""Magma Salamander — world 8, beast. A long low lizard with its own rig: hand-drawn shoulders, hips and head on a
spine that flexes, four splayed two-bone legs with the elbows up, a tail that is a simulated chain. Its hide is
cracked black crust and the fire shows through the cracks, along the belly and in the throat. It crawls in
diagonals with its body rocking; to attack it rears, its throat swells white, and it spits a glob of lava that
arcs forward and splashes. When it dies the fire goes out of it from the tail forward and it is left a statue
of grey stone, smoking.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Pose, Pt, ik, keyed

FIGURE = ("Salamander", "foe", "w08")

FEMUR, TIBIA = 5.0, 6.5
BUILD = Build(root_x=40, thigh=FEMUR, shin=TIBIA, foot=0.0, hip_dx=0.0, spine=0.0, sh_near=0.0, sh_far=0.0, upper=0.0, fore=0.0, neck=0.0)

#: Crust tones alive and turned to stone (legend letters l m n o, darkest first).
#: The lightest tone sits on the top of every part: a lit edge that lifts the beast off the dark path.
CRUST = {"k": ("ink", 0), "l": ("ink", 2), "m": ("ink", 3), "n": ("ink", 5), "o": ("ink", 7), "h": ("bone", 4), "H": ("bone", 6)}
STONE = {"k": ("bone", 0), "l": ("bone", 1), "m": ("bone", 2), "n": ("bone", 3), "o": ("bone", 4), "h": ("bone", 2), "H": ("bone", 3)}

# A blunt wedge of a head with swept-back horns: brow ridge, an eye like a coal (W), fire in the seam of the lips.
HEAD = [
    "hH............",
    ".hhH.lmmn.....",
    "..llmmmnnoo...",
    ".lmmGmnnnnooo.",
    "lmmgmmnWWnnnoo",
    "lmGmmnnnnnnnno",
    ".lmmgmmnnnnoo.",
    "..lGGWGGWGGg..",
    "...llmmmmmn...",
]
# Shoulders and ribs, and hips: crust split by glowing cracks, the belly white-hot.
FORE = [
    "..llmmmnnn....",
    ".lmmmnnnnooo..",
    "lmmGmnnGnnooo.",
    "lmgmmnGmnnnoo.",
    "lmmmGmmnngnoo.",
    "lmmgmmnnGnno..",
    ".lGGWGGWGGg...",
    "..llmmmml.....",
]
HIND = [
    "...llmmmnn...",
    ".llmmmnnnnoo.",
    "lmmGmmnGnnnoo",
    "lmgmmGmmnngno",
    "lmmmgmmnGnno.",
    ".lGGWGGGWGg..",
    "..lllmmml....",
]

SHOULDER_X, HIP_X = 5.0, -11.0
#: Where each foot rests, from the root: the legs sprawl out ahead of the shoulders and behind the hips.
REST = {"fn": 11.0, "ff": 13.0, "hn": -15.5, "hf": -13.5}
MOUTH = (24.0, 12.0)  # where a spat glob leaves: x from the root, height above the ground


def fire(heat: float) -> dict[str, tuple[str, int]]:
    """Tones of the fire showing through the crust, from white-hot to dead."""
    if heat >= 0.85:
        return {"W": ("light", 0), "G": ("brass", 6), "g": ("brass", 4)}
    if heat >= 0.55:
        return {"W": ("brass", 6), "G": ("brass", 5), "g": ("crimson", 5)}
    if heat >= 0.3:
        return {"W": ("crimson", 6), "G": ("crimson", 5), "g": ("crimson", 3)}
    if heat >= 0.1:
        return {"W": ("crimson", 4), "G": ("crimson", 3), "g": ("crimson", 2)}
    return {"W": ("bone", 1), "G": ("bone", 0), "g": ("bone", 1)}


class Salamander(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        rx = BUILD.root_x + pose.get("dx", 0.0)
        sh = (rx + SHOULDER_X, GROUND - 7.0 + pose.get("fore_dy", 0.0))
        hp = (rx + HIP_X, GROUND - 6.5 + pose.get("hind_dy", 0.0))
        a = math.atan2(sh[1] - hp[1], sh[0] - hp[0])
        ca, sa = math.cos(a), math.sin(a)

        def off(p: Pt, x: float, y: float) -> Pt:
            return (p[0] + x * ca - y * sa, p[1] + x * sa + y * ca)

        J: dict[str, Pt] = {"shoulder": sh, "hip": hp, "neck": off(sh, 6.0, -0.5), "tail": off(hp, -5.5, 0.5), "lean": (math.degrees(a), 0.0), "root": (rx, GROUND)}
        for name, top, bend in (("fn", off(sh, 1.5, 1.5), -1), ("ff", off(sh, 3.0, 0.8), -1), ("hn", off(hp, -1.0, 1.5), 1), ("hf", off(hp, 0.5, 0.8), 1)):
            fx, lift = pose[name]
            knee, foot = ik(top, (rx + REST[name] + fx, GROUND - 1.0 - lift), FEMUR, TIBIA, bend)
            J[name + "_top"], J[name + "_knee"], J[name + "_foot"] = top, knee, foot
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def on_ground(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        return {"tail": ChainSpec(Chain(7, 2.7, gravity=0.16, drag=0.12, damp=0.08), lambda J: J["tail"], on_ground, (-1.0, 0.18))}

    def leg(self, cel: Cel, J: dict[str, Pt], name: str, far: bool, stone: bool, glow: dict) -> None:
        top, knee, foot = J[name + "_top"], J[name + "_knee"], J[name + "_foot"]
        ramp = "bone" if stone else "ink"
        cel.limb(top, knee, 3.6, 2.8, ramp, (1, 2, 4) if stone else (2, 4, 6), far=far)
        cel.limb(knee, foot, 2.8, 2.0, ramp, (1, 2, 4) if stone else (2, 4, 6), far=far)
        if not stone:
            cel.put(knee[0], knee[1], glow["g"] if far else glow["G"])
        front = name[0] == "f"
        for k_ in (-1.0, 0.0, 1.0):  # claws
            cel.line(foot, (foot[0] + (2.4 if front else -1.8) + k_ * 0.6, foot[1] + 0.6 - abs(k_) * 0.6), (ramp, 3 if far else 5))

    def draw(self, cel, J, pose, ropes, between) -> None:
        heat, stone = pose.get("heat", 1.0), pose.get("stone", 0.0)
        glow = fire(heat)
        tail_stone, hind_stone, fore_stone, head_stone = stone > 0.25, stone > 0.5, stone > 0.75, stone > 0.95
        ang = J["lean"][0]
        a = math.radians(ang)

        def legend(dead: bool) -> dict:
            return {**(STONE if dead else CRUST), **(fire(0.0) if dead else glow)}

        self.leg(cel, J, "ff", True, fore_stone, glow)
        self.leg(cel, J, "hf", True, tail_stone, glow)
        # Tail: a tapering chain of crust with the fire showing at every joint.
        tail = ropes["tail"]
        n = len(tail) - 1
        for i in range(n):
            cel.limb(tail[i], tail[i + 1], 5.6 - 4.4 * i / n, 5.6 - 4.4 * (i + 1) / n, "bone" if tail_stone else "ink", (1, 2, 4) if tail_stone else (2, 4, 6))
        if not tail_stone:
            # Fire in every joint of the tail, and a molten seam running down it between them.
            for i in range(1, n, 1):
                cel.put(tail[i][0], tail[i][1] + (0.8 if i % 2 else -0.4), glow["W"] if i % 2 else glow["G"])
                mx, my = (tail[i][0] + tail[i - 1][0]) / 2, (tail[i][1] + tail[i - 1][1]) / 2
                cel.put(mx, my + 0.4, glow["G"] if i < n - 2 else glow["g"])
        # Dorsal spines raked back along the spine.
        sh, hp = J["shoulder"], J["hip"]
        for i in range(7):
            t = -0.2 + 1.4 * i / 6
            dead = (hind_stone if t < 0.5 else fore_stone)
            bx, by = hp[0] + (sh[0] - hp[0]) * t + 3.4 * math.sin(a), hp[1] + (sh[1] - hp[1]) * t - 3.4 * math.cos(a)
            hgt = 3.6 + 2.4 * math.sin(math.pi * (i + 0.5) / 7)
            rake = a - math.radians(112.0 + pose.get("bristle", 0.0))
            tip = (bx + math.cos(rake) * hgt, by + math.sin(rake) * hgt)
            cel.limb((bx, by + 1.0), tip, 2.6, 0.8, "bone" if dead else "ink", (1, 2, 4) if dead else (2, 4, 7))
            if not dead and heat >= 0.3:
                cel.put(tip[0], tip[1], glow["G"])  # every spine ends in an ember
        # The barrel of the body between hips and shoulders, so the back is one line and the belly glows along it.
        cel.limb(hp, sh, 7.4, 8.0, "bone" if hind_stone else "ink", (1, 2, 3) if hind_stone else (2, 3, 6))
        if not hind_stone:
            span = math.hypot(sh[0] - hp[0], sh[1] - hp[1])
            for i in range(int(span) + 1):
                t = i / max(1.0, span)
                bx, by = hp[0] + (sh[0] - hp[0]) * t, hp[1] + (sh[1] - hp[1]) * t
                # The belly is one unbroken line of fire under it...
                cel.put(bx - 3.3 * math.sin(a), by + 3.3 * math.cos(a), glow["W"] if i % 3 == 1 else glow["G"])
                # ...and a molten crack zig-zags the length of its back.
                if i % 2 == 0:
                    up = 1.4 + 0.9 * math.sin(i * 1.3)
                    cel.put(bx + up * math.sin(a), by - up * math.cos(a), glow["G"] if i % 4 == 0 else glow["W"])
        cel.stamp_pivot(HIND, legend(hind_stone), hp, 6.5, 3.5, ang)
        cel.stamp_pivot(FORE, legend(fore_stone), sh, 7.0, 4.0, ang)
        self.leg(cel, J, "hn", False, tail_stone, glow)
        self.leg(cel, J, "fn", False, fore_stone, glow)
        # Neck, the throat sac under it, and the head.
        nx, ny = J["neck"]
        turn = ang + pose.get("head_rot", 0.0)
        h = math.radians(turn)
        cel.limb((sh[0] + 3.0 * math.cos(a), sh[1] + 3.0 * math.sin(a)), (nx + 2.0 * math.cos(h), ny + 2.0 * math.sin(h)), 7.0, 6.0, "bone" if head_stone else "ink", (1, 2, 3) if head_stone else (2, 3, 6))

        def on_head(x: float, y: float) -> Pt:
            return (nx + x * math.cos(h) - y * math.sin(h), ny + x * math.sin(h) + y * math.cos(h))

        throat = pose.get("throat", 0.0)
        if not head_stone:
            tx, ty = on_head(2.5, 3.6)
            r = 1.4 + 2.8 * throat
            for dy in range(-int(r) - 1, int(r) + 2):
                for dx in range(-int(r) - 1, int(r) + 2):
                    dd = math.hypot(dx, dy)
                    if dd <= r:
                        cel.put(tx + dx, ty + dy, glow["W"] if dd < r * 0.5 and throat > 0.3 else glow["G"] if dd < r * 0.8 else glow["g"])
        cel.stamp_pivot(HEAD, legend(head_stone), (nx, ny), 1.5, 5.0, turn)
        cel.outline()

        # Fx. The eye burns; embers lift off its back; the glob flies and splashes; a dead one smokes.
        if not head_stone and heat >= 0.55:
            ex, ey = on_head(6.5, -0.5)
            cel.put(ex, ey, ("light", 0))
        if heat >= 0.3:
            # Its own heat on the ground: a hot pool under the throat, a dull red line under the belly.
            hot = heat >= 0.55
            tx, _ty = on_head(2.5, 3.6)
            reach = 4 + int(4 * throat)
            for dx in range(-reach, reach + 1):
                if not head_stone and (dx + int(tx)) % 4 != 3:
                    cel.soft(tx + dx, GROUND - 1, (("brass", 6) if hot else ("brass", 4)) if abs(dx) < reach * 0.5 else ("brass", 4) if hot else ("crimson", 5))
                    if abs(dx) < 2 and hot:
                        cel.soft(tx + dx, GROUND - 2, ("brass", 5))
            if not hind_stone:
                for x in range(int(hp[0]) - 2, int(sh[0]) + 3):
                    if x % 3:
                        cel.soft(x, GROUND - 1, ("crimson", 5) if hot else ("crimson", 3))
        if heat >= 0.55 and not fore_stone:
            ph = pose.get("embers", 0.0)
            for i in range(3):
                u = (ph + i / 3) % 1.0
                cel.soft(hp[0] + 4.0 + i * 6.0 + 1.5 * math.sin(math.tau * (u + i * 0.4)), hp[1] - 6.0 - 8.0 * u, ("brass", 6) if u < 0.4 else ("crimson", 5))
        glob = pose.get("glob", 0.0)
        if 0.01 < glob < 0.985:
            self.glob(cel, glob)
        smoke = pose.get("smoke", 0.0)
        if 0.01 < smoke < 0.985:
            for i in range(7):
                u = (smoke * 1.3 + i * 0.17) % 1.0
                x = hp[0] + 2.0 + i * 4.2 + 2.2 * math.sin(u * 6.0 + i)
                y = hp[1] - 5.0 - 13.0 * u
                cel.soft(x, y, ("bone", 4) if u < 0.5 else ("bone", 2))
                if u < 0.35:
                    cel.soft(x + 1, y, ("bone", 3))

    @staticmethod
    def glob(cel: Cel, u: float) -> None:
        """A glob of lava arcing from the mouth to the ground ahead, then its splash."""
        x0, y0 = BUILD.root_x + MOUTH[0], GROUND - MOUTH[1]
        land = (x0 + 26.0, GROUND - 2.0)
        fly = min(1.0, u / 0.8)
        gx = x0 + (land[0] - x0) * fly
        gy = y0 + (land[1] - y0) * fly - 11.0 * math.sin(math.pi * fly)
        if u < 0.8:
            for dy in range(-2, 3):
                for dx in range(-2, 3):
                    dd = math.hypot(dx, dy)
                    if dd <= 2.3:
                        cel.soft(gx + dx, gy + dy, ("light", 0) if dd < 1.1 else ("brass", 6) if dd < 1.9 else ("brass", 5) if dy < 1 else ("crimson", 5))
            for i in range(1, 5):  # a trail of drops behind it
                f = max(0.0, fly - i * 0.07)
                cel.soft(x0 + (land[0] - x0) * f, y0 + (land[1] - y0) * f - 11.0 * math.sin(math.pi * f) + (i % 2), ("brass", 5) if i < 3 else ("crimson", 5))
        else:
            v = (u - 0.8) / 0.2
            for i in range(-5, 6):
                cel.soft(land[0] + i * (0.6 + 0.6 * v), GROUND - 1, ("light", 0) if abs(i) < 2 and v < 0.5 else ("brass", 6) if abs(i) < 4 else ("crimson", 5))
            for i in range(6):
                ang = math.radians(-155 + i * 26.0)
                d = 2.0 + 8.0 * v
                yy = land[1] + math.sin(ang) * d + 6.0 * v * v
                if yy < GROUND - 1:
                    cel.soft(land[0] + math.cos(ang) * d * 1.2, yy, ("brass", 6) if i % 2 else ("crimson", 5))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, fore_dy=0.0, hind_dy=0.0, head_rot=8.0, fn=(0.0, 0.0), ff=(0.0, 0.0), hn=(0.0, 0.0), hf=(0.0, 0.0),
                  heat=1.0, stone=0.0, throat=0.0, glob=0.0, smoke=0.0, embers=0.0, bristle=0.0, flash=0.0)
LEGS = ("fn", "ff", "hn", "hf")


def planted(dx: float, **legs: tuple[float, float]) -> dict[str, tuple[float, float]]:
    """Every foot stays where it was while the body shifts by dx, except the ones given."""
    return {name: legs.get(name, (-dx, 0.0)) for name in LEGS}


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    # It breathes fire: the glow swells and sinks, the head swings low from side to side tasting the air.
    return {**BASE, "fore_dy": -0.6 * s, "hind_dy": 0.3 * late, "head_rot": 8.0 + 7.0 * late, "throat": 0.18 + 0.18 * s,
            "heat": 1.0 if s > -0.2 else 0.7, "embers": ph, "bristle": 6.0 * s}


def crawl_pose(ph: float) -> Pose:
    p: Pose = {**BASE}
    stride = 6.5
    # Diagonal pairs; the shoulders and the hips rock against each other as the spine bends.
    for name, off in (("fn", 0.0), ("hf", 0.0), ("ff", 0.5), ("hn", 0.5)):
        q = (ph + off) % 1.0
        if q < 0.55:
            p[name] = (stride * (0.5 - q / 0.55), 0.0)
        else:
            t = (q - 0.55) / 0.45
            p[name] = (stride * (t - 0.5), 2.8 * math.sin(math.pi * t))
    p.update(fore_dy=0.9 * math.sin(math.tau * ph), hind_dy=0.9 * math.sin(math.tau * ph + math.pi), head_rot=8.0 + 7.0 * math.sin(math.tau * (ph - 0.15)),
             embers=2 * ph, throat=0.2, bristle=5.0 * math.sin(2 * math.tau * ph))
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Spit: it gathers, rears up on straight forelegs with the throat swelling white, and snaps the head down and out.
ATTACK_KEYS = [
    (0.00, k(), "lin"),
    (0.20, k(dx=-2.0, fore_dy=-1.6, hind_dy=0.8, head_rot=-8.0, throat=0.45, **planted(-2.0)), "out"),
    (0.40, k(dx=-3.0, fore_dy=-5.6, hind_dy=1.2, head_rot=-34.0, throat=1.0, bristle=16.0, **planted(-3.0)), "out"),
    (0.46, k(dx=-3.3, fore_dy=-6.0, hind_dy=1.2, head_rot=-38.0, throat=1.0, bristle=20.0, **planted(-3.3)), "io"),
    (0.52, k(dx=2.0, fore_dy=-1.0, hind_dy=0.0, head_rot=6.0, throat=0.2, glob=0.02, bristle=-6.0, **planted(2.0)), "in"),
    (0.82, k(dx=1.2, fore_dy=0.4, head_rot=12.0, glob=0.98, **planted(1.2)), "out"),
    (1.00, k(glob=1.0), "io"),
]

# Hit: the blow knocks the head up and the forefeet off the ground; it skids back on its hind legs, drops and
# shakes its head. The fire dims for a moment.
HURT_KEYS = [
    (0.00, k(), "lin"),
    (0.07, k(dx=-1.0, fore_dy=-1.5, head_rot=-20.0, bristle=14.0, flash=1.0, **planted(-1.0, fn=(2.2, 1.6))), "out3"),
    (0.16, k(dx=-3.2, fore_dy=-4.2, hind_dy=0.6, head_rot=-34.0, heat=0.6, bristle=20.0, flash=0.5, **planted(-3.2, fn=(4.2, 3.6), ff=(4.4, 2.6))), "lin"),
    (0.26, k(dx=-4.8, fore_dy=-3.0, hind_dy=0.4, head_rot=-22.0, heat=0.6, bristle=10.0, **planted(-3.6, fn=(4.6, 2.6), ff=(5.0, 1.8))), "out"),
    (0.50, k(dx=-4.2, fore_dy=0.9, hind_dy=0.0, head_rot=24.0, bristle=-6.0, **planted(-0.6)), "in"),
    (0.74, k(dx=-1.8, head_rot=4.0, **planted(1.8 + 0.6, fn=(1.2, 2.2), hn=(0.8, 1.6))), "io"),
    (1.00, k(), "io"),
]

# Death: it writhes, tries to rise, and the fire goes out of it from the tail forward; the last of it is the eye.
_DOWN = dict(fore_dy=2.0, hind_dy=2.0, fn=(3.0, 0.0), ff=(3.0, 0.0), hn=(-3.0, 0.0), hf=(-3.0, 0.0))
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-2.0, fore_dy=-3.4, head_rot=-30.0, bristle=18.0, **planted(-2.0, fn=(3.0, 3.0), ff=(3.4, 2.0))), "out3"),
    (0.25, k(dx=-1.2, fore_dy=0.8, hind_dy=-1.6, head_rot=22.0, heat=0.8, stone=0.1, **planted(-1.2)), "io"),
    (0.40, k(dx=-1.0, fore_dy=-2.6, hind_dy=0.6, head_rot=-18.0, heat=0.6, stone=0.3, throat=0.3, **planted(-1.0)), "io"),
    (0.55, k(dx=-1.0, **{**_DOWN, "fore_dy": 1.0}, head_rot=6.0, heat=0.45, stone=0.55), "in"),
    (0.70, k(dx=-1.0, **_DOWN, head_rot=24.0, heat=0.25, stone=0.8, smoke=0.25), "io"),
    (0.85, k(dx=-1.0, **_DOWN, head_rot=26.0, heat=0.05, stone=1.0, smoke=0.6), "lin"),
    (1.00, k(dx=-1.0, **_DOWN, head_rot=26.0, heat=0.0, stone=1.0, smoke=1.0), "lin"),
]

BREEZE = lambda t: (0.25 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [160] * 12, True, BREEZE),
    "run": Anim("run", crawl_pose, [i / 12 for i in range(12)], [58] * 12, True, lambda t: (-0.5, 0.3 * math.sin(2 * math.tau * t))),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.10, 0.20, 0.30, 0.40, 0.46, 0.52, 0.58, 0.64, 0.70, 0.76, 0.82, 0.91, 1.0],
                   [80, 80, 90, 100, 130, 120, 50, 60, 60, 60, 60, 70, 90, 100], False, BREEZE),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, BREEZE),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.18, 0.25, 0.33, 0.40, 0.48, 0.55, 0.63, 0.70, 0.78, 0.85, 0.92, 1.0],
                  [50, 50, 80, 80, 100, 90, 110, 90, 100, 100, 120, 120, 140, 200, 1200], False, BREEZE),
}
