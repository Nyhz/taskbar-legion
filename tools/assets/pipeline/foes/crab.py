"""Tide Crab — world 6, beast. A crab the size of a cart, seen the way a crab is known: FRONT-ON. A wide spiked
carapace crusted with barnacles, a drum of some drowned column grown onto its back, two eyes on stalks, eight
jointed legs fanned out on both sides with the knees above the shell, a small claw on one side and on the other —
the side it advances towards — a crusher as big as its body. Its own rig. It walks SIDEWAYS, as crabs do. Its
attack is the great claw hoisted high and brought down like a hammer. It dies under its own weight: the claw
drops, the legs slide out to both sides, the shell settles on the stone and splits, and the drum rolls off.

The sprite's right is "forward" (the game mirrors enemies)."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Pose, Pt, ik, keyed, loose, swing_smear

FIGURE = ("Crab", "foe", "w06")

ARM = 10.0
#: Femur and tibia of each leg, from the pair nearest the claws to the hindmost. The feet stand close under the
#: shell (the whole crab is about 50 px across, so it keeps to its own place in a line of enemies) and the long
#: shins put the knees up above its shoulders, in a fan.
FEMUR = [13.5, 12.0, 10.5, 9.0]
TIBIA = [20.0, 18.0, 16.5, 15.0]
BUILD = Build(root_x=40, thigh=FEMUR[0], shin=TIBIA[0], foot=0.0, hip_dx=0.0, spine=0.0, sh_near=0.0, sh_far=0.0, upper=0.0, fore=0.0, neck=0.0)

L = {
    "a": ("crimson", 1), "b": ("crimson", 2), "c": ("crimson", 3), "d": ("crimson", 4), "e": ("crimson", 5), "f": ("crimson", 6),
    "W": ("bone", 6), "w": ("bone", 4), "M": ("moss", 4), "k": ("ink", 0), "y": ("bone", 4), "z": ("bone", 2), "T": ("bone", 7), "t": ("bone", 5),
    "n": ("ink", 4), "o": ("ink", 6), "p": ("ink", 7), "q": ("ink", 8),
}

# The carapace from the front: a spined dome lit from the upper left, barnacles and a rag of weed on it, a dark
# lip, and under the lip the mouth parts and the pale belly plates.
SHELL = [
    "..........T.....T.....T...........",
    ".....T...dWd...dWd...dWc....T.....",
    "....eWe...feeeddddddcccc...cWb....",
    ".....eefeeeeeddddddddcccccbcb.....",
    ".....feeeeeedddddddddccccccbb.....",
    "...feeeewWeddddddddddcccccccbbb...",
    "..feeeeeewedcddddddddcccccccbbbb..",
    ".eeeeeeeeedcdddddddddcWwccccbbbba.",
    "eeeeeeeeedcdddMdddddcccwccccbbbbba",
    "eeeeeeeedddddMMddddcccccccccbbbbba",
    "eeeeeWddddddddMddccccccccccbbbbbaa",
    "eeeeddddddddddMccccccccccbbwbbbaaa",
    "ddddddddddccccccccccccbbbbbbbbaaaa",
    ".ccccccccbbbbbbbbbbbbbbbbaaaaaaaa.",
    "..aaaaaaaakkkkkkkkkkkkkkaaaaaaaa..",
    ".....zzyyyyWkWkkkkkkWkWyyyzzz.....",
    ".......zzyyykkWkkkkWkkyyyzz.......",
    "..........zzzyykWWkyyzzz..........",
]
SHELL_PIVOT = (17.0, 12.0)
#: The two halves it breaks into: the same sprite, split along the crack down its middle.
SHELL_L = [row[:17 + (j % 2)] + "." * (17 - (j % 2)) for j, row in enumerate(SHELL)]
SHELL_R = ["." * (17 + (j % 2)) + row[17 + (j % 2):] for j, row in enumerate(SHELL)]
# The crusher, open and shut: a heavy palm, saw-toothed fingers with bone-white tips. The wrist is at the left.
CLAW_OPEN = [
    ".......bccddeet....",
    ".....bbccdddeeeTT..",
    "...abbccdddeeeeeTT.",
    "..abbccddde.TeTeTTT",
    ".abbccddde.......TT",
    "abbccddde..........",
    "abbccddd...........",
    "abbccdddd..........",
    "abbccddddeT.T......",
    ".abbccdddeeeTeT....",
    "..abbccddeeeeTTT...",
    "....abccdeeeeTT....",
    "......aabccee......",
]
CLAW_SHUT = [
    ".......bccddeet....",
    ".....bbccdddeeeTT..",
    "...abbccdddeeeeeTT.",
    "..abbccdddeeeTeTeTT",
    ".abbccdddekTkTkTTT.",
    "abbccdddeeeTeTeTT..",
    "abbccddddeeeeeTT...",
    "abbccdddddeeeTT....",
    ".abbccdddeeeee.....",
    "..abbccddeee.......",
    "....abccdee........",
    "......aabc.........",
    "...................",
]
CLAW_PIVOT = (1.0, 6.5)
# A drum of a drowned column, grown fast to the shell, weed on it.
DRUM = [
    ".noooopqq.",
    "nnooooppqq",
    "nMnonopoqp",
    "nMMonopoqp",
    "nnMonopoqp",
    "nnooooppq.",
    ".nnoooppp.",
]

#: Height of the shell's centre over the ground, standing.
BODY_H = 12.0
#: Leg roots under the edge of the shell (right side; the left mirrors them) and where each foot rests, from the
#: pair nearest the claws to the hindmost.
ROOTS = [(13.0, 3.0), (12.0, 2.0), (10.5, 1.5), (9.0, 1.0)]
REST = [25.0, 21.5, 18.0, 14.5]
LEGS = [(f"{s}{i + 1}", i, 1 if s == "R" else -1) for s in "RL" for i in range(4)]
#: A crack across the dome, in shell coordinates from its centre (x right, y down).
CRACK = [(1.0, -10.0), (0.0, -8.0), (2.0, -6.0), (0.0, -4.0), (1.0, -2.0), (-1.0, 0.0), (0.0, 2.0)]


class Crab(Character):
    build = BUILD

    @staticmethod
    def frame(pose: Pose):
        """The shell's own frame: its centre, and a function from shell coordinates (x right, y down) to the cel."""
        rx = BUILD.root_x + pose.get("dx", 0.0)
        by = GROUND - BODY_H + pose.get("dy", 0.0)
        a = math.radians(pose.get("tilt", 0.0))
        ca, sa = math.cos(a), math.sin(a)
        return rx, by, lambda x, y: (rx + x * ca - y * sa, by + x * sa + y * ca)

    def joints(self, pose: Pose) -> dict[str, Pt]:
        rx, by, at = self.frame(pose)
        J: dict[str, Pt] = {"body": (rx, by)}
        for name, i, side in LEGS:
            root = at(side * ROOTS[i][0], ROOTS[i][1])
            fx, lift = pose[name]
            knee, foot = ik(root, (rx + side * REST[i] + fx, GROUND - 1.0 - lift), FEMUR[i], TIBIA[i], -1 if side > 0 else 1)
            J[name + "_root"], J[name + "_knee"], J[name + "_foot"] = root, knee, foot
        # The crusher's arm: the elbow goes out to the side when the claw is up, and stays high when it is down.
        shoulder = at(13.0, -1.0)
        cx, cy = pose["claw"]
        goal = at(cx, -cy)
        elbow, wrist = ik(shoulder, goal, ARM, ARM, 1 if goal[1] < shoulder[1] - 2.0 else -1)
        rot = math.radians(pose["claw_rot"] + pose.get("tilt", 0.0))
        J["shoulder"], J["elbow"], J["wrist"] = shoulder, elbow, wrist
        J["tip"] = (wrist[0] + math.cos(rot) * 16.0, wrist[1] + math.sin(rot) * 16.0)
        J["drum"] = loose(pose, "drum", at(-9.0, -7.0), BUILD.root_x)
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def grounded(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        return {"weed": ChainSpec(Chain(4, 2.2, gravity=0.2, drag=0.14, damp=0.1), lambda J: (J["drum"][0] - 3.0, J["drum"][1] - 2.0), grounded, (-0.4, 1.0))}

    def leg(self, cel: Cel, J: dict[str, Pt], name: str, far: bool) -> None:
        root, knee, foot = J[name + "_root"], J[name + "_knee"], J[name + "_foot"]
        cel.limb(root, knee, 4.2, 3.4, "crimson", (1, 3, 5), far=far)
        cel.limb(knee, foot, 3.4, 1.2, "crimson", (1, 3, 5), far=far)
        cel.put(knee[0], knee[1], ("bone", 4 if far else 6))  # the joint
        cel.put(foot[0], foot[1], ("bone", 5 if far else 7))  # the point of the foot

    def draw(self, cel, J, pose, ropes, between) -> None:
        rx, by, at = self.frame(pose)
        tilt = pose.get("tilt", 0.0)
        glow = pose.get("glow", 1.0)
        # Legs behind the shell, hindmost first.
        for i in (3, 2, 1, 0):
            for name, j, _side in LEGS:
                if j == i:
                    self.leg(cel, J, name, far=i % 2 == 1)  # alternate legs a tone darker, so each reads on its own
        # The crack that kills it: first a line across the dome, then the shell comes apart in two halves that
        # sag away from each other, the dark of the inside showing between them.
        crack = pose.get("crack", 0.0)
        gap = max(0.0, (crack - 0.55) / 0.45)
        if gap > 0.01:
            cel.limb(at(1.0, -9.0), at(0.5, 3.0), 3.0 + 2.0 * gap, 2.0 + 2.0 * gap, "crimson", (0, 0, 1))
            for half, sgn in ((SHELL_L, -1.0), (SHELL_R, 1.0)):
                hx_, hy_ = at(sgn * 1.6 * gap, 0.6 * gap)
                cel.stamp_pivot(half, L, (hx_, hy_), SHELL_PIVOT[0], SHELL_PIVOT[1], tilt + sgn * 5.0 * gap)
            for x0, y0 in CRACK:
                cel.put(*at(x0 + 2.4 * gap + 1.0, y0), ("bone", 7))  # the broken edge catches the light
        else:
            cel.stamp_pivot(SHELL, L, (rx, by), SHELL_PIVOT[0], SHELL_PIVOT[1], tilt)
        if crack > 0.05 and gap <= 0.01:
            n = max(2, int(round(crack / 0.55 * len(CRACK))))
            for (x0, y0), (x1, y1) in zip(CRACK[:n], CRACK[1:n]):
                cel.line(at(x0, y0), at(x1, y1), ("ink", 0))
                cel.put(*at(x0 + 1.0, y0), ("bone", 7))
        # The column drum on its back and the weed trailing from it.
        dx_, dy_ = J["drum"]
        free = pose.get("drum_free", 0.0)
        cel.stamp_pivot(DRUM, L, (dx_, dy_), 5.0, 7.0, tilt * (1 - free) + pose.get("drum_rot", 0.0) * free)
        weed = ropes["weed"]
        for i in range(len(weed) - 1):
            cel.limb(weed[i], weed[i + 1], 1.8, 1.2, "moss", (2, 4, 5))
        # Eyes on stalks, each wandering on its own.
        eyes = []
        for bx_, key in ((-4.0, "eye_l"), (4.0, "eye_r")):
            base = at(bx_, -7.0)
            a = math.radians(pose[key] + tilt)
            tip = (base[0] + 8.5 * math.sin(a), base[1] - 8.5 * math.cos(a))
            cel.limb(base, tip, 2.0, 1.6, "bone", (3, 4, 6))
            for ox in (-1, 0, 1):
                for oy in (-1, 0, 1):
                    cel.put(tip[0] + ox, tip[1] + oy, ("brass", 7 if oy < 0 else 6) if glow >= 0.5 else ("ink", 4 if glow >= 0.2 else 2))
            cel.put(tip[0] + (1 if pose[key] > 0 else 0), tip[1], ("ink", 0))
            eyes.append(tip)
        # The small claw, on the side away from the prey.
        s0 = at(-13.0, -1.0)
        up = math.radians(-128.0 + tilt - pose.get("small", 0.0))
        s1 = (s0[0] + math.cos(up) * 6.0, s0[1] + math.sin(up) * 6.0)
        fore = math.radians(-70.0 + tilt - pose.get("small", 0.0) * 1.6)
        s2 = (s1[0] + math.cos(fore) * 5.5, s1[1] + math.sin(fore) * 5.5)
        cel.limb(s0, s1, 3.0, 2.6, "crimson", (1, 3, 5))
        cel.limb(s1, s2, 2.8, 3.4, "crimson", (2, 4, 5))
        for spread in (-0.5, 0.45):
            cel.limb(s2, (s2[0] + math.cos(fore + spread) * 4.5, s2[1] + math.sin(fore + spread) * 4.5), 2.0, 0.9, "bone", (4, 6, 7))
        # The crusher: arm, then the claw itself (cut off at the ground, where it buries its fingers).
        cel.limb(J["shoulder"], J["elbow"], 4.8, 4.0, "crimson", (1, 3, 5))
        cel.limb(J["elbow"], J["wrist"], 4.0, 3.8, "crimson", (2, 4, 5))
        tmp = Cel(cel.w, cel.h, cel.top)
        tmp.stamp_pivot(CLAW_OPEN if pose.get("open", 1.0) > 0.5 else CLAW_SHUT, L, J["wrist"], CLAW_PIVOT[0], CLAW_PIVOT[1], pose["claw_rot"] + tilt)
        for (x, y), tone in tmp.px.items():
            if y < GROUND:
                cel.px[(x, y)] = tone
        cel.outline()

        # Fx: the eyes catch the light; froth at the mouth; the smear and the burst of the hammer blow.
        if glow >= 0.5:
            for tip in eyes:
                cel.put(tip[0] - 1, tip[1] - 1, ("light", 0))
        froth = pose.get("froth", 0.0)
        if glow >= 0.5 and froth > 0.01:
            for i in range(5):
                u = (froth * 2.0 + i / 5) % 1.0
                fx_, fy_ = at(-4.0 + i * 2.0 + math.sin(i * 2.1) * 1.0, 3.5 + u * 2.5)
                if u < 0.7:
                    cel.put(fx_, fy_, ("bone", 7))
        if pose.get("smear", 0.0) > 0.5 and len(between) > 2:
            before = set(cel.px)
            swing_smear(cel, [Jb["tip"] for Jb, _pb in between], [Jb["shoulder"] for Jb, _pb in between])
            for xy in set(cel.px) - before:
                if xy[1] >= GROUND:
                    del cel.px[xy]
        impact = pose.get("impact", 0.0)
        if 0.01 < impact < 0.985:
            self.burst(cel, min(J["tip"][0] - 4.0, cel.w - 12.0), impact)

    @staticmethod
    def burst(cel: Cel, ix: float, u: float) -> None:
        """The claw hitting the causeway: a flash, slabs of water thrown up either side (solid, pale with a dark
        edge, so they read on mist and on wet stone), chips of stone, and a ring of light running out on the ground."""
        tmp = Cel(cel.w, cel.h, cel.top)
        rise = math.sin(math.pi * min(1.0, u * 1.2)) ** 0.7
        for off, height, lean in ((-7.0, 13.0, -5.0), (-2.5, 19.0, -1.5), (3.0, 16.0, 3.0), (8.0, 10.0, 7.0)):
            h = height * rise
            if h < 2.0:
                continue
            base, tip = (ix + off, GROUND + 1.0), (ix + off + lean * (0.4 + 0.6 * u), GROUND - h)
            tmp.limb(base, tip, 4.2, 1.0, "sea", (5, 7, 8))
            tmp.put(tip[0], tip[1], ("light", 0))
        tmp.outline()
        for (x, y), tone in tmp.px.items():
            if y < GROUND and (x, y) not in cel.px:
                cel.px[(x, y)] = tone
        if u < 0.35:
            cel.star(ix, GROUND - 5, 6)
        for i in range(16):
            ang = math.radians(-172 + i * 10.9)
            dist = 6.0 + (14.0 + (i * 5 % 4) * 4.0) * u
            x, y = ix + math.cos(ang) * dist * 1.25, GROUND - 3 + math.sin(ang) * dist * 1.1 + 11.0 * u * u
            if y < GROUND - 1:
                tone = ("light", 0) if i % 3 == 0 else ("ink", 7) if i % 3 == 1 else ("bone", 7)
                cel.soft(x, y, tone)
                cel.soft(x, y + 1, ("ink", 2))
                if u < 0.65:
                    cel.soft(x + 1, y, tone)
                    cel.soft(x + 1, y + 1, ("ink", 3))
        reach = 6.0 + 16.0 * u
        for i in range(int(reach)):
            for sgn in (-1, 1):
                if (i * 3) % 4 < 2 or u < 0.4:
                    cel.soft(ix + sgn * i, GROUND - 1 - (1 if i % 3 == 0 and u < 0.6 else 0), ("light", 0) if u < 0.5 else ("bone", 6))


# --------------------------------------------------------------------------------------- animations
_LEG0 = {name: (0.0, 0.0) for name, _i, _side in LEGS}
BASE: Pose = dict(dx=0.0, dy=0.0, tilt=0.0, claw=(21.0, 7.0), claw_rot=-48.0, open=1.0, small=0.0, eye_l=-8.0, eye_r=10.0, glow=1.0, froth=0.0,
                  crack=0.0, impact=0.0, smear=0.0, flash=0.0, drum_free=0.0, drum_at=(0.0, 0.0), drum_rot=0.0, **_LEG0)
#: The sideways scuttle: on each side the legs move in alternate pairs, and the two sides half a beat apart.
OFFSET = {"R1": 0.0, "R2": 0.5, "R3": 0.0, "R4": 0.5, "L1": 0.5, "L2": 0.0, "L3": 0.5, "L4": 0.0}


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    # It stands braced and listens: the eyes turn one after the other, the great claw clacks twice, a foreleg
    # feels the stone, and it froths.
    clack = 0.0 if 0.55 < ph < 0.62 or 0.70 < ph < 0.77 else 1.0
    tap = max(0.0, math.sin(math.tau * 2 * ph)) if ph < 0.5 else 0.0
    return {**BASE, "dy": 0.6 * s, "tilt": 1.6 * late, "eye_l": -8.0 + 16.0 * math.sin(math.tau * (ph - 0.1)), "eye_r": 10.0 + 14.0 * math.sin(math.tau * (ph - 0.38)),
            "claw": (21.0, 7.0 + 1.2 * s + (0.0 if clack else 1.5)), "claw_rot": -48.0 + 4.0 * late, "open": clack, "small": 12.0 * math.sin(2 * math.tau * ph),
            "froth": ph, "R1": (2.0 * tap, 3.5 * tap)}


def walk_pose(ph: float) -> Pose:
    p: Pose = {**BASE}
    stride = 5.0
    for name, _i, _side in LEGS:
        q = (ph + OFFSET[name]) % 1.0
        if q < 0.5:  # planted: the body travels over it
            p[name] = (stride * (0.5 - 2 * q), 0.0)
        else:  # snatched forward
            t = (q - 0.5) * 2
            p[name] = (stride * (t - 0.5), 4.0 * math.sin(math.pi * t))
    # Sideways and low, rocking from one side's legs to the other's, the claw carried out in front.
    p.update(dy=0.7 * math.sin(2 * math.tau * ph), tilt=3.2 * math.sin(math.tau * (2 * ph - 0.1)), claw=(22.0, 9.0 + 1.0 * math.sin(2 * math.tau * (ph - 0.15))),
             claw_rot=-40.0 + 5.0 * math.sin(2 * math.tau * (ph - 0.2)), eye_l=16.0, eye_r=20.0, small=8.0 * math.sin(2 * math.tau * ph), froth=ph)
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


def planted(dx: float, **legs: tuple[float, float]) -> dict[str, tuple[float, float]]:
    """Every foot stays where it was while the body shifts by dx, except the ones given."""
    return {name: legs.get(name, (-dx, 0.0)) for name, _i, _side in LEGS}


# Hammer: it rolls back onto its far legs, hoists the crusher straight up, hangs there, and brings it down.
# (The claw's place is given in the shell's frame, so a tilted shell already carries it down: y stays positive.)
_HIT = dict(dx=3.5, dy=1.5, tilt=13.0, claw=(25.0, 3.5), claw_rot=20.0, open=0.0, eye_l=30.0, eye_r=34.0)
ATTACK_KEYS = [
    (0.00, k(), "lin"),
    (0.18, k(dx=-1.5, dy=1.2, tilt=-8.0, claw=(18.0, 19.0), claw_rot=-78.0, eye_l=0.0, eye_r=4.0, **planted(-1.5, R1=(2.5, 3.0))), "out"),
    (0.36, k(dx=-2.5, dy=1.8, tilt=-12.0, claw=(15.5, 22.0), claw_rot=-96.0, eye_l=6.0, eye_r=10.0, small=20.0, **planted(-2.5, R1=(3.5, 6.0), R2=(3.0, 3.5))), "out"),
    (0.44, k(dx=-2.9, dy=2.0, tilt=-13.5, claw=(15.0, 22.6), claw_rot=-100.0, eye_l=8.0, eye_r=12.0, small=24.0, **planted(-2.9, R1=(3.9, 6.5), R2=(3.4, 4.0))), "io"),
    (0.50, k(dx=2.0, dy=0.0, tilt=6.0, claw=(24.0, 13.0), claw_rot=-14.0, open=0.0, eye_l=24.0, eye_r=28.0, smear=1.0, **planted(2.0, R1=(1.0, 1.5), R2=(0.5, 0.0))), "in"),
    (0.54, k(**_HIT, smear=1.0, impact=0.02, **planted(3.5, R1=(0.5, 0.0), R2=(0.5, 0.0))), "lin"),
    (0.70, k(**{**_HIT, "dy": 2.0, "tilt": 14.0}, impact=0.98, **planted(3.5, R1=(0.5, 0.0), R2=(0.5, 0.0))), "lin"),
    (0.86, k(dx=1.5, dy=0.5, tilt=4.0, claw=(24.0, 4.0), claw_rot=-10.0, eye_l=10.0, eye_r=14.0, impact=1.0, **planted(1.5, R1=(-1.5, 0.0), R2=(-1.5, 0.0), L2=(0.0, 3.0), L4=(0.0, 3.0))), "io"),
    (1.00, k(impact=1.0), "io"),
]

# Hit: knocked back and over onto its far legs, near legs off the ground and the claw thrown up; it drops back
# level, clacks, and sidles in again. Feet are planted (x = −dx) unless lifted or skidding.
HURT_KEYS = [
    (0.00, k(), "lin"),
    (0.07, k(dx=-1.0, dy=0.8, tilt=-7.0, claw=(20.0, 12.0), claw_rot=-60.0, eye_l=-24.0, eye_r=-20.0, flash=1.0, **planted(-1.0)), "out3"),
    (0.16, k(dx=-3.5, dy=-1.2, tilt=-15.0, claw=(16.5, 18.0), claw_rot=-86.0, eye_l=-30.0, eye_r=-26.0, small=26.0, flash=0.5,
             **planted(-3.5, R1=(1.5, 7.0), R2=(2.0, 5.0), L1=(2.2, 0.0), L2=(2.2, 0.0), L3=(2.2, 0.0), L4=(2.2, 0.0))), "lin"),
    (0.26, k(dx=-5.5, dy=-0.5, tilt=-11.0, claw=(17.5, 16.0), claw_rot=-78.0, eye_l=-20.0, eye_r=-14.0, small=16.0,
             **planted(-5.5, R1=(2.5, 5.0), R2=(3.0, 3.0), R3=(4.0, 1.5), L1=(2.5, 0.0), L2=(2.5, 0.0), L3=(2.5, 0.0), L4=(2.5, 0.0))), "out"),
    (0.50, k(dx=-5.0, dy=1.4, tilt=5.0, claw=(22.5, 4.0), claw_rot=-34.0, open=0.0, eye_l=14.0, eye_r=20.0, **planted(-0.5)), "in"),
    (0.74, k(dx=-2.2, dy=0.0, tilt=-2.0, claw=(21.0, 8.0), claw_rot=-46.0, eye_l=8.0, eye_r=14.0, **planted(2.3, R1=(1.0, 3.2), R3=(1.0, 3.2), L2=(1.0, 3.2), L4=(1.0, 3.2))), "io"),
    (1.00, k(), "io"),
]

# Death: it rears with the claw up, the claw comes down under its own weight and lies open, the legs slide out
# to both sides, the shell settles on the stone and splits, the drum rolls off its back and the eyes fall.
_OUT = {"R1": (5.0, 0.0), "R2": (6.0, 0.0), "R3": (6.5, 0.0), "R4": (6.5, 0.0), "L1": (-5.0, 0.0), "L2": (-6.0, 0.0), "L3": (-6.5, 0.0), "L4": (-6.5, 0.0)}
_HALF = {name: (fx * 0.5, 0.0) for name, (fx, _l) in _OUT.items()}
_FLAT = dict(dx=0.5, dy=6.0, tilt=4.0, claw=(27.0, 1.0), claw_rot=14.0, open=1.0, small=-30.0, eye_l=-82.0, eye_r=86.0, glow=0.0, crack=1.0,
             drum_free=1.0, drum_at=(-25.0, 5.0), drum_rot=-90.0, **_OUT)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.08, k(dx=-2.5, dy=-2.0, tilt=-14.0, claw=(15.5, 21.0), claw_rot=-96.0, eye_l=-28.0, eye_r=28.0, small=26.0, **planted(-2.5, R1=(2.5, 7.0), R2=(2.5, 4.5))), "out3"),
    (0.22, k(dx=-1.0, dy=0.0, tilt=9.0, claw=(22.0, 15.0), claw_rot=-62.0, eye_l=-10.0, eye_r=30.0, small=10.0, **planted(-1.0)), "io"),
    (0.36, k(dx=0.5, dy=2.0, tilt=16.0, claw=(27.5, 5.0), claw_rot=10.0, eye_l=20.0, eye_r=44.0, impact=0.02, glow=0.9, **planted(0.5)), "in"),
    (0.50, k(dx=0.5, dy=4.2, tilt=9.0, claw=(27.5, 2.0), claw_rot=12.0, eye_l=-40.0, eye_r=56.0, impact=0.98, glow=0.6, crack=0.3, small=-10.0, **_HALF), "io"),
    (0.62, k(**{**_FLAT, "tilt": 6.0, "eye_l": -60.0, "eye_r": 70.0, "glow": 0.3, "crack": 0.7, "drum_at": (-18.0, 11.0), "drum_rot": -40.0}, impact=1.0), "in"),
    (0.72, k(**{**_FLAT, "dy": 5.2, "tilt": 2.5, "glow": 0.2, "drum_at": (-23.0, 7.0), "drum_rot": -74.0}, impact=1.0), "out"),
    (0.82, k(**_FLAT, impact=1.0), "in"),
    (1.00, k(**_FLAT, impact=1.0), "lin"),
]

STILL = lambda t: (0.0, 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [150] * 12, True, STILL),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [50] * 12, True, lambda t: (-0.4, 0.0)),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.09, 0.18, 0.27, 0.36, 0.44, 0.50, 0.54, 0.60, 0.65, 0.70, 0.78, 0.86, 0.93, 1.0],
                   [80, 80, 90, 100, 150, 130, 40, 50, 70, 80, 120, 100, 100, 90, 110], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.04, 0.08, 0.15, 0.22, 0.29, 0.36, 0.43, 0.50, 0.56, 0.62, 0.67, 0.72, 0.82, 1.0],
                  [50, 50, 90, 80, 90, 70, 70, 80, 90, 80, 80, 70, 90, 130, 1200], False, STILL),
}
