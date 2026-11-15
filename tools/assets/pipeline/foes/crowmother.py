"""The Crowmother — world 1, WORLD boss. What the scarecrows of the Golden Meadows were built to keep away.

A carrion bird the height of the strip, standing upright like a robed queen: a mantle of black feathers with a
blue sheen, two long scaled legs ending in pale talons, a long neck in a ruff of bone-white quills and, at the
end of it, the only face she has — a bare bird SKULL with a beak as long as a hero is tall and one ember burning
in the socket. A crest of sickle blades stands on the skull like a crown. A few crows of her murder circle her.
Her wings hide what she is: when they open, their whole underside is EYES, and they open too.

She stalks like a heron: the body rocks on stiff legs while the head stays still, then darts ahead. Attack: she
crouches, rears up and mantles — both wings spread, every eye open — hangs there, then strikes like a pickaxe:
the whole body bows and the beak comes down on the prey at her feet; earth, feathers and crows
burst along the path. Hit: the head whips back, the wings jolt half open, feathers fly. Death: she throws the
head back and shrieks, the ember gutters, and then there is no body — only crows, leaving in every direction —
while the mantle falls in on itself; the skull drops onto the heap of feathers and one crow comes back to sit on it.

Own rig (nothing of the humanoid skeleton). Frame 248 wide with 59 extra rows above, root at 104: the body stands
14 px ahead of the root. The Knight closes to 50 px of her root whatever her own reach is, so below his height
nothing of her passes 36 px (her talons); the beak hangs over him, and the strike lands on him, 58 px ahead. Drawn
facing right; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Character, Pose, Pt, ik, keyed, lerp

FIGURE = ("Crowmother", "boss", "w01")

ROOT_X = 104
#: The body's column, ahead of the root.
BODY_X = 14.0
BUILD = Build(root_x=ROOT_X, thigh=1.0, shin=1.0, foot=0.0, hip_dx=0.0, spine=0.0, sh_near=0.0, sh_far=0.0, upper=1.0, fore=1.0, neck=0.0)

HIP_UP = 34.0  # height of the pelvis at rest
ANKLE_UP = 3.5
TIBIA, TARSUS = 17.0, 17.5
ARM, HAND = 26.0, 27.0  # the two bones of a wing
#: Where things sit on the body, in its own frame (u forward, v up the spine, from the pelvis).
SH_N, SH_F, NECK, RUMP = (-12.0, 54.0), (11.0, 56.0), (6.0, 62.0), (-13.0, 4.0)
REST_LEAN = 6.0

VOID = ("ink", 0)

# The skull, facing right: a round cranium, a great orbit, a deep beak hooked at the tip. K is the socket; O and W
# the ember in it (their tones follow the pose's `eye`).
SKULL = [
    ".......deffffe..........................",
    "....deffgggggffe........................",
    "...deffggggggggfe.......................",
    "..ddeffgggggggggffgggff.................",
    ".cdeeffgggggKKKgggggggggfff.............",
    ".cdeefffggKKKKKKKgggggggggggff..........",
    ".cdeefffgKKKKKKKKKfgggaaagggggff........",
    "ccdeefffgKKKKOOKKKffgggggggggggggf......",
    "bcdeeeffgKKKOWWOKKfffggggggggggggggf....",
    "bcddeeeffKKKKOOKKKeffffffgggggggggggf...",
    ".bcddeeefKKKKKKKKeeeeeefffffffffggggff..",
    ".bccddeeefKKKKKKdddddddeeeeeeeeeffgggf..",
    "..bccddeeeeffeeddcccccccccdddddddefggf..",
    "..bbccdddeeeeddcc................cdefgf.",
    "...bbcccddddccc...................cdefg.",
    "....bbbccccbbb.....................cdef.",
    ".......bbbb.........................cde.",
    ".....................................cd.",
    ".....................................bc.",
]
#: The lower jaw; it hangs from the skull at JAW_AT by its left end and opens downwards.
JAW = [
    "ccddddeeeeeeeeffffff........",
    ".bccdddddeeeeeeeefffffe.....",
    "...bbccccdddddeeeeeeeffe....",
    ".......bbbccccddddddeeefd...",
    "............bbbbccccdddec...",
]
SKULL_L = {"a": ("bone", 1), "b": ("bone", 2), "c": ("bone", 3), "d": ("bone", 4), "e": ("bone", 5), "f": ("bone", 6), "g": ("bone", 7), "K": VOID}
#: Where the neck ends, in skull pixels: the back of the cranium, low.
SKULL_PIVOT = (3.5, 12.0)
JAW_AT = (8.5, 13.5)
BEAK_TIP = (38.0, 18.5)
#: The crown: sickle blades standing on the cranium — where each is set, how long it is, how it leans at rest and
#: when she is roused (degrees from straight up, positive = forward).
CREST = [((4.0, 4.0), 17.0, -64.0, -40.0), ((7.0, 2.0), 22.0, -44.0, -14.0), ((10.5, 1.0), 18.0, -24.0, 10.0), ((14.0, 1.0), 12.0, -4.0, 30.0)]

#: A crow of her murder, wings up and wings down (facing right).
CROW = [
    ["x...x..", ".x.xx..", "..xxxx>", "...x..."],
    [".......", "..xxxx>", ".xxxx..", "x..x..."],
]

#: The one that comes back, standing (facing left, at the heroes).
PERCHED = ["..xxx..", ".<xxxx.", "..xxxxx", "..xxxxx", "...xxxx", "...x.xx", "...x..x"]

#: The body's outline in its own frame (u forward, v up the spine, from the pelvis).
BODY = [(-17, 52), (-8, 62), (6, 65), (15, 59), (21, 45), (22, 27), (16, 9), (7, -4), (-6, -6), (-14, 2), (-20, 20), (-21, 38)]

#: Eyes on the underside of a wing: (bone 0 = arm / 1 = hand, feather, how far along the feather).
WING_EYES = [(0, 1, 0.42), (0, 3, 0.62), (0, 5, 0.36), (0, 6, 0.74), (1, 0, 0.5), (1, 2, 0.34), (1, 3, 0.68), (1, 5, 0.46), (1, 6, 0.22), (0, 2, 0.2), (1, 4, 0.84)]


def _hash(x: int, y: int) -> int:
    return ((x * 73856093) ^ (y * 19349663)) & 0x7FFFFFFF


def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def P(x: float, up: float) -> Pt:
    return (ROOT_X + x, GROUND - up)


def _turn(v: Pt, deg: float) -> Pt:
    """A screen vector turned `deg` clockwise."""
    a = math.radians(deg)
    return (v[0] * math.cos(a) - v[1] * math.sin(a), v[0] * math.sin(a) + v[1] * math.cos(a))


def _frame(pose: Pose) -> tuple[Pt, Pt, Pt]:
    """The pelvis, and the body's forward and spine directions on screen."""
    lean = math.radians(pose["lean"])
    return P(BODY_X + pose["dx"], HIP_UP - pose["drop"]), (math.cos(lean), math.sin(lean)), (math.sin(lean), -math.cos(lean))


def ember(eye: float) -> dict[str, tuple[str, int]]:
    if eye >= 1.2:
        return {"O": ("brass", 6), "W": ("light", 0)}
    if eye >= 0.8:
        return {"O": ("brass", 5), "W": ("brass", 7)}
    if eye >= 0.45:
        return {"O": ("crimson", 4), "W": ("brass", 5)}
    if eye >= 0.12:
        return {"O": ("crimson", 2), "W": ("crimson", 4)}
    return {"O": VOID, "W": VOID}


class Crowmother(Character):
    build = BUILD
    W = 248
    TOP = 59

    # ------------------------------------------------------------------------------------------------- skeleton
    def joints(self, pose: Pose) -> dict:
        pel, fwd, up = _frame(pose)

        def B(u: float, v: float) -> Pt:
            return (pel[0] + fwd[0] * u + up[0] * v, pel[1] + fwd[1] * u + up[1] * v)

        J: dict = {"B": B, "pelvis": pel, "lean": (0.0, 0.0), "neck": B(*NECK), "rump": B(*RUMP)}
        J["shN"], J["shF"] = B(*SH_N), B(*SH_F)
        tilt = pose["lean"] - REST_LEAN
        for name, side in (("N", -1.0), ("F", 1.0)):
            a1, a2 = pose["wing" + name]
            d1 = _turn((side * math.sin(math.radians(a1)), math.cos(math.radians(a1))), tilt)
            d2 = _turn((side * math.sin(math.radians(a2)), math.cos(math.radians(a2))), tilt)
            sh = J["sh" + name]
            wr = (sh[0] + d1[0] * ARM, sh[1] + d1[1] * ARM)
            J["wr" + name] = wr
            J["tip" + name] = (wr[0] + d2[0] * HAND, wr[1] + d2[1] * HAND)
        for name, hip in (("N", B(-5.0, 2.0)), ("F", B(6.0, 3.0))):
            fx, lift = pose["foot" + name]
            ankle = P(BODY_X + fx, ANKLE_UP + lift)
            knee, ankle = ik(hip, ankle, TIBIA, TARSUS, +1)
            J["hip" + name], J["knee" + name], J["ankle" + name] = hip, knee, ankle
        # The head rides the body (`follow` 1) or stays where the pose puts it while the body moves under it.
        hx, hup = pose["head"]
        rest = P(BODY_X + hx, hup)
        f = pose["follow"]
        J["head"] = (rest[0] + (J["neck"][0] - NECK_REST[0]) * f, rest[1] + (J["neck"][1] - NECK_REST[1]) * f)
        skull = J["head"]
        w = pose["skull_free"]
        if w > 0.001:
            ax, ay = pose["skull_at"]
            to = P(ax, ay)
            skull = (lerp(skull[0], to[0], w), lerp(skull[1], to[1], w))
        J["skull"] = skull
        J["beak"] = self.on_skull(skull, pose["head_rot"], BEAK_TIP)
        return J

    @staticmethod
    def on_skull(at: Pt, rot: float, px: Pt) -> Pt:
        """A point of the skull sprite, on screen."""
        v = _turn((px[0] - SKULL_PIVOT[0], px[1] - SKULL_PIVOT[1]), rot)
        return (at[0] + v[0], at[1] + v[1])

    # ------------------------------------------------------------------------------------------------- parts
    def wing(self, cel: Cel, J: dict, pose: Pose, name: str, side: float) -> None:
        far = side > 0
        a1, a2 = pose["wing" + name]
        tilt = pose["lean"] - REST_LEAN
        sh, wr, tip = J["sh" + name], J["wr" + name], J["tip" + name]
        open_ = _clamp((a1 - 26.0) / 90.0)

        def aim(a: float) -> Pt:
            return _turn((side * math.sin(math.radians(a)), math.cos(math.radians(a))), tilt)

        feathers: list[tuple[Pt, Pt, float, float, int]] = []  # root, direction, length, width, bone
        n = 7
        for i in range(n):  # the hand's long flight feathers, splayed like fingers
            t = (i + 0.5) / n
            root = (lerp(wr[0], tip[0], t), lerp(wr[1], tip[1], t))
            feathers.append((root, aim(a2 - open_ * lerp(78.0, 4.0, t)), lerp(28.0, 35.0, t), 5.4, 1))
        for i in range(n):  # the arm's, hanging from it
            t = (i + 0.5) / n
            root = (lerp(sh[0], wr[0], t), lerp(sh[1], wr[1], t))
            feathers.append((root, aim(a1 - 18.0 - open_ * 70.0), lerp(22.0, 29.0, t), 5.8, 0))
        order = sorted(range(len(feathers)), key=lambda i: (feathers[i][4], -i if feathers[i][4] else i))
        ends: dict[tuple[int, int], tuple[Pt, Pt, float]] = {}
        for i in order[::-1]:
            root, d, length, width, bone = feathers[i]
            k_ = i if bone else i - n
            ends[(bone, k_)] = (root, d, length)
            end = (root[0] + d[0] * length, min(root[1] + d[1] * length, GROUND - 1.5))
            sheen = (k_ + (1 if far else 0)) % 3
            ramp, idx = ("azure", (0, 0, 1)) if sheen == 0 else ("ink", (0, 1, 3)) if sheen == 1 else ("ink", (0, 1, 2))
            cel.limb(root, end, width, 1.6, ramp, idx, far=far and ramp == "ink")
        # Coverts over the roots, then the bones.
        for a_, b_, ang_of in ((wr, tip, lambda t: a2 - open_ * lerp(78.0, 4.0, t)), (sh, wr, lambda t: a1 - 18.0 - open_ * 70.0)):
            for i in range(6):
                t = (i + 0.5) / 6
                root = (lerp(a_[0], b_[0], t), lerp(a_[1], b_[1], t))
                d = aim(ang_of(t))
                cel.limb(root, (root[0] + d[0] * 11.5, root[1] + d[1] * 11.5), 5.2, 2.0, "ink", (0, 1, 2) if i % 2 else (0, 1, 3), far=far)
        cel.limb(sh, wr, 8.0, 6.0, "ink", (0, 1, 3), far=far)
        cel.limb(wr, tip, 6.0, 3.4, "ink", (0, 1, 3), far=far)
        # The eyes of the underside: they open one after another.
        shown = pose["eyes"] * (len(WING_EYES) + 1)
        blink = pose.get("blink", -1.0)
        for j, (bone, k_, f) in enumerate(WING_EYES):
            if (bone, k_) not in ends:
                continue
            lit = shown - j if blink < 0 or far or j != int(blink) else 2.0
            if lit <= 0.0:
                continue
            root, d, length = ends[(bone, k_)]
            x, y = root[0] + d[0] * length * f, root[1] + d[1] * length * f
            if y > GROUND - 4:
                continue
            self.eye(cel, x, y, lit, pose["eye"])

    @staticmethod
    def eye(cel: Cel, x: float, y: float, lit: float, glow: float) -> None:
        iris = ("brass", 6) if glow >= 1.2 else ("brass", 5) if glow >= 0.7 else ("crimson", 5)
        xi, yi = int(math.floor(x)), int(math.floor(y))
        if lit < 0.6:  # a slit, still opening
            for q in range(-1, 3):
                cel.put(xi + q, yi, ("crimson", 4))
            return
        for q, tone in ((-2, ("crimson", 3)), (-1, iris), (0, VOID), (1, ("light", 0) if glow >= 1.0 else iris), (2, iris), (3, ("crimson", 3))):
            cel.put(xi + q, yi, tone)
        for q in (-1, 0, 1, 2):
            cel.put(xi + q, yi - 1, iris if q in (0, 1) else ("crimson", 4))
            cel.put(xi + q, yi + 1, iris if q in (0, 1) else ("crimson", 4))
        cel.put(xi, yi - 1, iris)
        cel.put(xi - 3, yi, VOID)
        cel.put(xi + 4, yi, VOID)

    def leg(self, cel: Cel, J: dict, pose: Pose, name: str, far: bool) -> None:
        hip, knee, ankle = J["hip" + name], J["knee" + name], J["ankle" + name]
        lift = pose["foot" + name][1]
        cel.limb(hip, knee, 13.0, 6.0, "ink", (0, 1, 2), far=far)  # feathered to the hock
        for i, t in enumerate((0.5, 0.72, 0.95)):
            x, y = lerp(hip[0], knee[0], t), lerp(hip[1], knee[1], t)
            cel.limb((x, y), (x - 3.0 - i, y + 4.5), 3.4, 1.0, "ink", (0, 1, 2), far=far)
        cel.limb(knee, ankle, 4.6, 4.0, "leather", (2, 3, 5), far=far)
        for t in (0.25, 0.5, 0.75):  # scales
            x, y = lerp(knee[0], ankle[0], t), lerp(knee[1], ankle[1], t)
            cel.put(x - 1, y, ("leather", 1 if far else 2))
            cel.put(x, y, ("leather", 1 if far else 2))
        # Three toes forward, one back; on the ground they lie flat, in the air they curl. The claws are what a
        # hero sees first: long, pale, hooked into the path.
        curl = _clamp(lift / 6.0)
        for dx_, dy_, claw in ((12.5, 1.6, 4.6), (8.5, -1.6, 3.6), (-6.5, 1.4, 3.6)):
            ex = ankle[0] + dx_ * (1.0 - 0.45 * curl)
            ey = min(ankle[1] + dy_ + 0.6 + 5.0 * curl * (1.0 if dx_ > 0 else 0.4), GROUND - 1.6)
            if dy_ < 0:
                ey = min(ankle[1] + 0.4 + 4.0 * curl, GROUND - 2.4)
            cel.limb(ankle, (ex, ey), 3.8, 2.6, "leather", (2, 3, 5), far=far)
            sgn = 1.0 if dx_ > 0 else -1.0
            cel.limb((ex - sgn * 0.5, ey - 0.6), (ex + sgn * claw, min(ey + 1.8 + 1.5 * curl, GROUND - 0.2)), 2.8, 1.0, "bone", (4, 6, 7), far=far)

    def body(self, cel: Cel, J: dict) -> None:
        """The breast: rows of feathers laid like scales, each catching the light on its forward edge; the lowest
        hang ragged over the legs."""
        B = J["B"]
        inside = set(cel.poly_mask([B(u, v) for u, v in BODY]))
        for xy in inside:
            cel.px[xy] = VOID
        rows = Cel(cel.w, cel.h, cel.top)
        n = 0
        for v in range(60, -9, -5):
            n += 1
            for u in range(-24 + (3 if n % 2 else 0), 26, 6):
                root, end = B(u, v), B(u + 0.8, v - 8.0)
                k_ = (n * 3 + (u + 30) // 6) % 5
                ramp, idx = ("azure", (0, 0, 2)) if k_ == 0 and u > -2 else ("ink", (0, 1, 3)) if u > 6 or k_ == 2 else ("ink", (0, 1, 2))
                tmp = Cel(cel.w, cel.h, cel.top)
                tmp.limb(root, end, 6.4, 2.6, ramp, idx)
                keep = v < 6  # the hem may hang past the outline
                for xy, t in tmp.px.items():
                    if xy in inside or (keep and xy[1] < GROUND - 2):
                        rows.px[xy] = t
        cel.px.update(rows.px)

    def tail(self, cel: Cel, J: dict, pose: Pose) -> None:
        rump = J["rump"]
        tilt = pose["lean"] - REST_LEAN
        for i, (ang, length) in enumerate(((62.0, 28.0), (52.0, 34.0), (42.0, 38.0), (33.0, 36.0), (25.0, 31.0))):
            d = _turn((-math.sin(math.radians(ang + pose["tail"])), math.cos(math.radians(ang + pose["tail"]))), tilt * 0.8)
            end = (rump[0] + d[0] * length, min(rump[1] + d[1] * length, GROUND - 1.5))
            cel.limb(rump, end, 6.0, 2.0, "azure" if i == 2 else "ink", (0, 0, 1) if i == 2 else (0, 1, 2) if i % 2 else (0, 1, 3))

    def neck(self, cel: Cel, J: dict, pose: Pose) -> list[Pt]:
        a, b = J["neck"], J["head"]
        dx, dy = b[0] - a[0], b[1] - a[1]
        d = math.hypot(dx, dy) or 1.0
        bow = pose["bow"]
        # Bowed back and up, like a heron's: the control point sits behind the straight line.
        c = ((a[0] + b[0]) / 2 + dy / d * bow, (a[1] + b[1]) / 2 - dx / d * bow)
        pts = []
        for i in range(11):
            t = i / 10
            pts.append(((1 - t) ** 2 * a[0] + 2 * t * (1 - t) * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * t * (1 - t) * c[1] + t * t * b[1]))
        for i in range(10):
            cel.limb(pts[i], pts[i + 1], lerp(13.0, 7.5, i / 10), lerp(13.0, 7.5, (i + 1) / 10), "ink", (0, 1, 2) if i % 2 else (0, 1, 3))
        return pts

    def ruff(self, cel: Cel, J: dict, pts: list[Pt], pose: Pose) -> None:
        """A collar of pale quills round the root of the neck; it bristles with the crown."""
        a = pts[2]
        nd = (pts[4][0] - pts[0][0], pts[4][1] - pts[0][1])
        base = math.degrees(math.atan2(nd[1], nd[0]))
        spread = 78.0 + 24.0 * pose["crest"]
        length = 11.0 + 4.0 * pose["crest"]
        for i in (0, 10, 1, 9, 2, 8, 3, 7, 4, 6, 5):
            t = i / 10 - 0.5
            ang = math.radians(base + 180.0 + t * 2.0 * spread)
            # They lie along the shoulders: pointing away from the head.
            k_ = length * (1.0 - 0.3 * abs(t) * 2.0 * (0.5 if i % 2 else 1.0))
            end = (a[0] + math.cos(ang) * k_, a[1] + math.sin(ang) * k_)
            cel.limb(a, end, 3.4, 1.2, "bone", (3, 5, 7) if i % 2 == 0 else (2, 4, 6))

    def skull(self, cel: Cel, J: dict, pose: Pose) -> None:
        at, rot = J["skull"], pose["head_rot"]
        legend = {**SKULL_L, **ember(pose["eye"])}
        # The crown: sickle blades standing on the cranium, laid back at rest, raised when she is roused.
        for i, ((cx, cy), length, rest, roused) in enumerate(CREST):
            root = self.on_skull(at, rot, (cx, cy + 1.5))
            ang = rot + lerp(rest, roused, pose["crest"])
            self.sickle(cel, root, ang, length)
        jaw_at = self.on_skull(at, rot, JAW_AT)
        cel.stamp_rot(JAW, SKULL_L, jaw_at[0], jaw_at[1], 0.5, 0.5, rot + pose["jaw"])
        cel.stamp_rot(SKULL, legend, at[0], at[1], SKULL_PIVOT[0], SKULL_PIVOT[1], rot)

    @staticmethod
    def sickle(cel: Cel, root: Pt, ang: float, length: float) -> None:
        """A sickle blade standing on its heel: a thin crescent of steel, its point hooking forward."""
        spine: list[Pt] = [root]
        for s_ in range(1, 9):
            a = math.radians(ang - 90.0 + 15.0 * s_ - 38.0)  # the blade curls forward as it rises
            spine.append((spine[-1][0] + math.cos(a) * length / 8, spine[-1][1] + math.sin(a) * length / 8))
        for s_ in range(8):
            t0, t1 = s_ / 8, (s_ + 1) / 8
            w0, w1 = (1.2 + 2.4 * math.sin(math.pi * t0) ** 0.8, 1.2 + 2.4 * math.sin(math.pi * t1) ** 0.8)
            cel.limb(spine[s_], spine[s_ + 1], w0 if s_ else 2.0, w1 if s_ < 7 else 1.0, "ink", (5, 7, 9))

    @staticmethod
    def crow(cel: Cel, x: float, y: float, flap: int, right: bool, tone: tuple[str, int] = VOID, over: bool = True) -> None:
        rows = CROW[flap % 2]
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch == ".":
                    continue
                px = x + (i - 3 if right else 3 - i)
                t = ("brass", 4) if ch == ">" else tone
                if over:
                    cel.put(px, y + j - 2, t)
                else:
                    cel.soft(px, y + j - 2, t)

    def murder(self, cel: Cel, pose: Pose, far: bool) -> None:
        """The few crows that circle her."""
        if pose["unravel"] > 0.02:
            return
        for i in range(3):
            phi = math.tau * (pose["orbit"] + i / 3 + 0.07 * i)
            behind = math.sin(phi) < 0
            if behind != far:
                continue
            x, y = P(BODY_X + 2.0 + 40.0 * math.cos(phi), 103.0 + 8.0 * math.sin(phi) + (4.0 if i == 1 else 0.0))
            self.crow(cel, x, y, int(pose["orbit"] * 48 + i) % 2, math.sin(phi) < 0, ("ink", 1) if behind else VOID)

    # ------------------------------------------------------------------------------------------------- drawing
    def draw(self, cel, J, pose, ropes, between) -> None:
        un = pose["unravel"]
        self.murder(cel, pose, far=True)
        body = Cel(cel.w, cel.h, cel.top)
        self.wing(body, J, pose, "F", 1.0)
        self.tail(body, J, pose)
        self.leg(body, J, pose, "F", far=True)
        self.body(body, J)
        self.leg(body, J, pose, "N", far=False)
        pts = self.neck(body, J, pose)
        self.wing(body, J, pose, "N", -1.0)
        self.ruff(body, J, pts, pose)
        if un <= 0.0:
            cel.px.update(body.px)
        else:
            # There is no body any more: it comes apart in clumps and what is left of the mantle sinks.
            for (x, y), t in body.px.items():
                if (_hash(x // 2, y // 2) % 100) < un * 112 - 6:
                    continue
                ny = int(round(y + un * un * 0.62 * (GROUND - 2 - y)))
                if ny < GROUND:
                    cel.put(x, ny, t)
        if pose["heap"] > 0.01:
            self.heap(cel, pose["heap"])
        if pose["smear"] > 0.5 and len(between) > 2:
            self.streak(cel, between, pose["head_rot"])
        self.skull(cel, J, pose)
        if pose["perch"] > 0.5:
            px, py = self.on_skull(J["skull"], pose["head_rot"], (24.0, 4.0))
            for j, row in enumerate(PERCHED):
                for i, ch in enumerate(row):
                    if ch != ".":
                        cel.put(px + i - 3, py + j - len(PERCHED), ("brass", 4) if ch == "<" else ("ink", 2) if (i + j) % 5 == 0 else VOID)
        self.murder(cel, pose, far=False)
        # Nothing of her shows below the path: a beak driven into it, a skull fallen on it, end at the ground.
        for xy in [xy for xy in cel.px if xy[1] > GROUND]:
            del cel.px[xy]
        cel.outline()
        for xy in [xy for xy in cel.px if xy[1] > GROUND + 1]:
            del cel.px[xy]

        # Effects, behind the figure.
        if 0.01 < pose["shock"] < 0.985:
            self.shock(cel, pose["shock_x"], pose["shock"])
        if 0.01 < pose["shed"] < 0.99:
            self.shed(cel, J, pose["shed"])
        if un > 0.01:
            self.flight(cel, pose, un)
        if pose["eye"] >= 0.8 and pose["skull_free"] < 0.3:
            # Sparks off the ember.
            sx, sy = self.on_skull(J["skull"], pose["head_rot"], (9.0, 6.0))
            for i in range(3):
                u = (pose["spark"] + i / 3) % 1.0
                cel.soft(sx - 3.0 - 9.0 * u + math.sin(u * 9.0 + i), sy - 4.0 - 10.0 * u, ("brass", 6) if u < 0.4 else ("crimson", 5) if u < 0.75 else ("crimson", 3))

    def streak(self, cel: Cel, between: list, rot: float) -> None:
        """The strike is faster than the eye: where the skull went through the air stays white for a frame. Drawn
        over the body (which follows the head down) and under the skull."""
        n = len(between)
        for at, w0, w1 in (((30.0, 16.0), 1.0, 4.4), ((12.0, 0.5), 1.0, 3.0), ((36.0, 6.0), 0.6, 2.0)):
            path = [self.on_skull(Jb["skull"], pb["head_rot"], at) for Jb, pb in between]
            for i in range(n // 4, n - 1):
                t0, t1 = (i - n // 4) / (n - n // 4), (i + 1 - n // 4) / (n - n // 4)
                (x0, y0), (x1, y1) = path[i], path[i + 1]
                if min(y0, y1) >= GROUND - 1:
                    continue
                tmp = Cel(cel.w, cel.h, cel.top)
                tmp.limb((x0, y0), (x1, y1), lerp(w0, w1, t0), lerp(w0, w1, t1), "bone", (6, 7, 7))
                for (x, y), tone in tmp.px.items():
                    if y < GROUND:
                        cel.px[(x, y)] = ("light", 0) if t1 > 0.55 and tone[1] == 7 else tone

    @staticmethod
    def heap(cel: Cel, h: float) -> None:
        """What is left of her: a heap of feathers on the path."""
        half = 14.0 + 18.0 * math.sqrt(h)
        high = 2.0 + 10.0 * h
        cx = ROOT_X + BODY_X - 2.0
        for i in range(int(-half), int(half) + 1):
            t = i / half
            top = high * (1.0 - t * t) ** 0.8 * (0.82 + 0.18 * ((_hash(i, 3) % 7) / 6.0))
            for s_ in range(int(round(top)) + 1):
                tone = ("ink", 3) if s_ >= int(round(top)) and i % 3 == 0 else ("azure", 1) if (_hash(i, s_) % 9) == 0 else VOID if (i + s_) % 4 == 0 else ("ink", 1)
                cel.put(cx + i, GROUND - 1 - s_, tone)
        for i in range(8):  # quills standing out of it
            x = cx - half * 0.8 + i * half * 0.23
            lean_ = ((_hash(i, 11) % 5) - 2) * 1.6
            length = (4.0 + (_hash(i, 5) % 5)) * h
            y0 = GROUND - 1 - high * (1.0 - ((x - cx) / half) ** 2) * 0.8
            cel.limb((x, y0), (x + lean_, y0 - length), 2.4, 1.0, "ink", (0, 1, 3) if i % 2 else (0, 1, 2))

    @staticmethod
    def shock(cel: Cel, at: float, u: float) -> None:
        """Where the beak goes in: the path bursts — a fan of earth, a ring of dust, black feathers — and crows tear
        away along it, at the prey."""
        ix = ROOT_X + at
        reach = 8.0 + 26.0 * u
        for i in range(int(reach)):  # the crack running both ways, and the dust over it
            for sgn in (-1, 1):
                x = ix + sgn * i
                cel.soft(x, GROUND - 1, ("leather", 1) if (i + (sgn > 0)) % 3 else ("leather", 3))
                if u < 0.7 and i > reach * 0.35:
                    puff = 2.0 + 4.0 * math.sin(math.pi * (i / reach)) * (1.0 - u)
                    for s_ in range(int(puff)):
                        if (i + s_) % 2 == 0 or s_ == 0:
                            cel.soft(x, GROUND - 2 - s_, ("bone", 5) if s_ < puff - 1.5 else ("bone", 4))
        if u < 0.3:
            cel.star(ix + 1, GROUND - 3, 5)
            for q in range(-9, 10):
                cel.soft(ix + q, GROUND - 2, ("light", 0) if abs(q) < 6 else ("bone", 7))
        for i in range(16):  # earth and feathers thrown up in a fan
            ang = math.radians(-172 + i * 11.0)
            dist = 6.0 + (20.0 + (i * 5 % 4) * 4.0) * u
            x = ix + math.cos(ang) * dist * 1.25
            y = GROUND - 2 + math.sin(ang) * dist + 13.0 * u * u
            if y >= GROUND - 1:
                continue
            if i % 4 == 1:  # a feather, turning
                flip = 1 if (i + int(u * 8)) % 2 else -1
                for q in range(4):
                    cel.soft(x + q * flip, y + q, VOID if q < 3 else ("ink", 3))
                cel.soft(x + flip, y, ("ink", 2))
            else:
                tone = ("leather", 5) if i % 2 else ("leather", 4)
                big = i % 3 == 0 and u < 0.75
                for qx, qy in ((0, 0), (1, 0), (0, 1), (1, 1), (2, 0), (2, 1)) if big else ((0, 0), (1, 0), (0, 1)):
                    cel.soft(x + qx, y + qy, ("leather", 2) if qy else tone)
        for i in range(6):  # the crows
            start = 0.03 * i
            if u <= start:
                continue
            v = (u - start) / (1.0 - start)
            x = ix + 4.0 + (34.0 + 5.0 * i) * v ** 0.75
            y = GROUND - 6.0 - (4.0 + 4.0 * i) * math.sin(math.pi * min(1.0, v * 1.05)) - 2.0 * (i % 2)
            if x > cel.w - 5:
                continue
            Crowmother.crow(cel, x, y, int(v * 9 + i), True, over=False)

    @staticmethod
    def shed(cel: Cel, J: dict, u: float) -> None:
        cx, cy = J["B"](2.0, 30.0)
        for i in range(8):
            ang = math.radians(-205.0 + i * 21.0)
            dist = 12.0 + (16.0 + (i * 7 % 5) * 3.0) * u
            x = cx + math.cos(ang) * dist * 1.2 - 6.0 * u
            y = cy + math.sin(ang) * dist + 14.0 * u * u
            if y >= GROUND - 1:
                continue
            flip = 1 if (i + int(u * 6)) % 2 else -1
            cel.soft(x, y, VOID)
            cel.soft(x + flip, y + 1, VOID)
            cel.soft(x + 2 * flip, y + 2, ("ink", 2))

    @staticmethod
    def flight(cel: Cel, pose: Pose, un: float) -> None:
        """Her body leaving as crows, in every direction."""
        for i in range(30):
            start = (i * 0.618) % 0.72
            if un <= start:
                continue
            age = (un - start) * 1.9
            h1, h2 = _hash(i, 17) % 1000 / 1000.0, _hash(i, 31) % 1000 / 1000.0
            x0, y0 = BODY_X - 14.0 + 30.0 * h1, 20.0 + 62.0 * h2
            ang = math.radians(lerp(-170.0, -10.0, ((i * 7) % 30) / 29.0))
            speed = 52.0 + 40.0 * h2
            x, y = P(x0 + math.cos(ang) * speed * age, y0 - math.sin(ang) * speed * age * 0.7 + 10.0 * age * age)
            if not (2 < x < cel.w - 3 and -cel.top + 3 < y < GROUND - 3):
                continue
            Crowmother.crow(cel, x, y, int(age * 14 + i), math.cos(ang) > 0, over=False)


# --------------------------------------------------------------------------------------- animations
FOLD_N, FOLD_F = (30.0, -10.0), (4.0, -4.0)
BASE: Pose = dict(dx=0.0, drop=0.0, lean=REST_LEAN, footN=(-10.0, 0.0), footF=(9.0, 0.0), wingN=FOLD_N, wingF=FOLD_F, tail=0.0,
                  head=(30.0, 77.0), follow=1.0, head_rot=28.0, bow=12.0, jaw=2.0, crest=0.15, eye=0.9, eyes=0.0, blink=-1.0, spark=0.0, orbit=0.0,
                  smear=0.0, shock=0.0, shock_x=58.0, shed=0.0, unravel=0.0, heap=0.0, skull_free=0.0, skull_at=(0.0, 0.0), perch=0.0, flash=0.0)

def _neck_rest() -> Pt:
    pel, fwd, up = _frame(BASE)
    return (pel[0] + fwd[0] * NECK[0] + up[0] * NECK[1], pel[1] + fwd[1] * NECK[0] + up[1] * NECK[1])


NECK_REST = _neck_rest()


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.18))
    later = math.sin(math.tau * (ph - 0.32))
    # A bird does not turn its head: it is somewhere, then it is somewhere else. Three looks a cycle.
    if ph < 0.42:
        head, rot, jaw = (30.0, 77.0), 28.0, 2.0
    elif ph < 0.74:
        head, rot, jaw = (32.0, 73.0), 37.0, 2.0  # down at the prey
    else:
        head, rot, jaw = (27.0, 81.0), 14.0, 2.0
    if 0.52 < ph < 0.60:
        jaw = 14.0  # the beak clacks once
    return {**BASE, "drop": 0.8 + 0.8 * s, "lean": REST_LEAN + 1.2 * late, "head": (head[0], head[1] + 0.6 * later), "head_rot": rot, "jaw": jaw,
            "wingN": (FOLD_N[0] + 3.0 * later, FOLD_N[1] + 2.0 * late), "wingF": (FOLD_F[0] + 3.0 * later, FOLD_F[1] + 2.0 * late), "tail": 3.0 * later,
            "crest": 0.15 + (0.3 if 0.42 <= ph < 0.5 else 0.0), "eye": 1.3 if math.sin(math.tau * 3 * ph) > 0.6 else 0.9,
            "blink": 3.0 if 0.06 < ph < 0.36 else 0.0 if 0.40 < ph < 0.66 else 5.0 if 0.70 < ph < 0.98 else -1.0, "spark": ph, "orbit": ph / 2}


def _step(q: float, reach: float) -> tuple[float, float]:
    """One foot through a stride: on the ground it goes back under the body; then it is lifted high and set down ahead."""
    if q < 0.62:
        return (lerp(reach, -reach, q / 0.62), 0.0)
    u = (q - 0.62) / 0.38
    e = u * u * (3 - 2 * u)
    return (lerp(-reach, reach, e), 11.0 * math.sin(math.pi * u))


def stalk_pose(ph: float) -> Pose:
    n, f = _step(ph % 1.0, 13.0), _step((ph + 0.5) % 1.0, 13.0)
    c2 = math.cos(2 * math.tau * (ph - 0.08))
    # The head stays put while the body walks under it, then darts ahead: twice a stride.
    hb = (2 * ph + 0.15) % 1.0
    dart = lerp(6.0, -7.0, hb / 0.78) if hb < 0.78 else lerp(-7.0, 6.0, ((hb - 0.78) / 0.22) ** 0.6)
    return {**BASE, "footN": (-10.0 + n[0], n[1]), "footF": (9.0 + f[0], f[1]), "drop": 1.6 + 1.4 * c2, "lean": 13.0 + 2.5 * math.cos(2 * math.tau * (ph - 0.2)),
            "head": (33.0 + dart, 77.0 - 0.1 * dart), "head_rot": 28.0 - 0.6 * dart, "bow": 12.0 - 0.5 * dart,
            "wingN": (FOLD_N[0] + 8.0 + 4.0 * math.cos(2 * math.tau * (ph - 0.3)), FOLD_N[1] + 4.0), "wingF": (FOLD_F[0] + 8.0 + 4.0 * math.cos(2 * math.tau * (ph - 0.3)), FOLD_F[1] + 4.0),
            "tail": 5.0 * math.cos(2 * math.tau * (ph - 0.35)), "crest": 0.3, "eye": 1.3, "spark": 2 * ph, "orbit": ph / 2}


def k(**over: object) -> Pose:
    return {**BASE, **over}


# The strike. She crouches, rears and mantles — both wings wide, every eye open — and hangs there; then the whole
# body bows and the beak comes down like a pickaxe on whoever stands at her feet.
OPEN_N, OPEN_F = (120.0, 108.0), (92.0, 82.0)
_REAR = dict(dx=-5.0, drop=-2.0, lean=-10.0, head=(-4.0, 91.0), head_rot=12.0, bow=10.0, jaw=24.0, crest=1.0, eye=1.5, eyes=1.0, wingN=OPEN_N, wingF=OPEN_F, tail=-12.0,
             footN=(-10.0, 0.0), footF=(9.0, 0.0))
_DOWN = dict(dx=0.0, drop=12.0, lean=46.0, head=(33.5, 33.5), follow=0.0, head_rot=62.0, bow=2.0, jaw=6.0, crest=1.0, eye=1.5, eyes=0.45,
             wingN=(84.0, 98.0), wingF=(-66.0, -88.0), tail=8.0, footN=(-12.0, 0.0), footF=(12.0, 0.0))
STRIKE_KEYS = [
    (0.00, k(), "lin"),
    (0.12, k(drop=5.0, lean=16.0, head=(33.0, 68.0), head_rot=40.0, wingN=(44.0, 0.0), wingF=(20.0, 2.0), crest=0.5, eye=1.3, tail=6.0), "io"),
    (0.30, k(**{**_REAR, "eyes": 0.3, "wingN": (104.0, 84.0), "wingF": (80.0, 60.0), "head": (10.0, 90.0), "head_rot": 6.0, "jaw": 30.0}), "out"),
    (0.42, k(**_REAR), "out"),
    (0.50, k(**{**_REAR, "dx": -6.0, "head": (-7.0, 90.0), "head_rot": 16.0, "jaw": 6.0, "wingN": (123.0, 112.0), "wingF": (95.0, 86.0)}), "io"),
    (0.55, k(**_DOWN, smear=1.0, shock=0.02), "in3"),
    (0.70, k(**{**_DOWN, "drop": 13.0, "lean": 48.0, "wingN": (78.0, 90.0), "wingF": (-60.0, -80.0)}, shock=0.98), "out"),
    (0.84, k(dx=0.0, drop=6.0, lean=22.0, head=(33.0, 60.0), follow=0.0, head_rot=44.0, bow=8.0, crest=0.6, eye=1.3, eyes=0.2, wingN=(60.0, 30.0), wingF=(-10.0, -20.0),
             footN=(-11.0, 0.0), footF=(10.0, 2.0), shock=1.0), "io"),
    (1.00, k(shock=1.0), "io"),
]

# Hit: she barely gives ground. The head whips back on the long neck, the wings jolt half open (a few eyes with
# them), the crest stands, feathers fly.
HURT_KEYS = [
    (0.00, k(), "lin"),
    (0.07, k(dx=-2.0, drop=1.0, lean=0.0, head=(30.0, 75.0), head_rot=40.0, jaw=10.0, crest=0.6, wingN=(42.0, -4.0), wingF=(22.0, -2.0), eye=1.5, shed=0.04, flash=0.5), "out3"),
    (0.16, k(dx=-4.0, drop=2.0, lean=-6.0, head=(16.0, 92.0), head_rot=-6.0, bow=13.0, jaw=24.0, crest=1.0, wingN=(62.0, 20.0), wingF=(50.0, 14.0), eyes=0.25, eye=1.5,
             tail=-8.0, footN=(-12.0, 2.0), shed=0.2, flash=0.5), "lin"),
    (0.26, k(dx=-5.0, drop=2.6, lean=-8.0, head=(9.0, 95.0), head_rot=-18.0, bow=14.0, jaw=28.0, crest=1.0, wingN=(70.0, 30.0), wingF=(56.0, 20.0), eyes=0.3, eye=0.5,
             tail=-12.0, footN=(-14.0, 0.0), shed=0.4), "out"),
    (0.50, k(dx=-3.0, drop=3.4, lean=10.0, head=(31.0, 74.0), head_rot=34.0, jaw=8.0, crest=0.7, wingN=(44.0, 6.0), wingF=(30.0, 4.0), eyes=0.1, eye=1.5, tail=6.0,
             footN=(-14.0, 0.0), footF=(6.0, 0.0), shed=0.7), "io"),
    (0.74, k(dx=-1.0, drop=1.4, lean=8.0, head=(30.0, 76.0), head_rot=29.0, crest=0.4, wingN=(34.0, -8.0), wingF=(12.0, -6.0), eye=1.3, footN=(-11.0, 3.0), footF=(7.0, 0.0),
             shed=0.95), "io"),
    (1.00, k(shed=1.0), "io"),
]

# Death. The shriek; then the crows.
_SHRIEK = dict(dx=-3.0, drop=-1.0, lean=-12.0, head=(4.0, 95.0), head_rot=-50.0, bow=12.0, jaw=34.0, crest=1.0, wingN=(96.0, 60.0), wingF=(86.0, 50.0), eyes=0.6, tail=-14.0)
_GONE = dict(drop=18.0, lean=20.0, wingN=(34.0, 0.0), wingF=(28.0, 0.0), crest=0.3, jaw=5.0, eye=0.0, skull_free=1.0, head=(24.0, 60.0), follow=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.05, k(dx=-3.0, drop=1.0, lean=-2.0, head=(28.0, 76.0), head_rot=38.0, jaw=12.0, crest=0.8, wingN=(48.0, 4.0), wingF=(30.0, 4.0), eye=1.5, shed=0.05, flash=0.5), "out3"),
    (0.14, k(**_SHRIEK, eye=1.5, shed=0.4), "out"),
    (0.26, k(**{**_SHRIEK, "head": (3.0, 96.0), "head_rot": -54.0, "wingN": (104.0, 68.0), "wingF": (92.0, 56.0)}, eye=0.7, shed=0.95, unravel=0.0), "io"),
    (0.34, k(**{**_SHRIEK, "drop": 3.0, "eyes": 0.2}, eye=0.4, shed=1.0, unravel=0.14), "lin"),
    (0.52, k(dx=-1.0, drop=10.0, lean=6.0, head=(14.0, 86.0), head_rot=-20.0, bow=10.0, jaw=30.0, crest=0.6, wingN=(60.0, 20.0), wingF=(50.0, 16.0), eye=0.2, shed=1.0,
             unravel=0.5, heap=0.25, tail=4.0), "lin"),
    (0.66, k(**{**_GONE, "skull_free": 0.5}, skull_at=(8.0, 44.0), head_rot=10.0, shed=1.0, unravel=0.78, heap=0.6), "in"),
    (0.76, k(**_GONE, skull_at=(9.0, 11.0), head_rot=34.0, shed=1.0, unravel=0.92, heap=0.85), "in"),
    (0.82, k(**_GONE, skull_at=(10.0, 17.0), head_rot=18.0, shed=1.0, unravel=1.0, heap=0.95), "out"),
    (0.88, k(**_GONE, skull_at=(10.0, 9.5), head_rot=8.0, shed=1.0, unravel=1.0, heap=1.0), "in"),
    (0.94, k(**_GONE, skull_at=(10.0, 9.5), head_rot=8.0, shed=1.0, unravel=1.0, heap=1.0), "lin"),
    (1.00, k(**_GONE, skull_at=(10.0, 9.5), head_rot=8.0, shed=1.0, unravel=1.0, heap=1.0, perch=1.0), "lin"),
]

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 16 for i in range(16)], [150] * 16, True),
    "run": Anim("run", stalk_pose, [i / 12 for i in range(12)], [95] * 12, True),
    "attack": Anim("attack", keyed(STRIKE_KEYS), [0.0, 0.06, 0.12, 0.18, 0.24, 0.30, 0.36, 0.42, 0.50, 0.55, 0.59, 0.63, 0.67, 0.70, 0.77, 0.84, 0.92, 1.0],
                   # An enemy swings every 1250 ms and the game starts this clip its wind-up ahead of the swing: the whole
                   # of it (660 ms to the blow, 290 of impact, 290 back up) fits between two swings, so it is never cut.
                   [60, 60, 70, 60, 60, 70, 70, 80, 130, 40, 50, 60, 60, 80, 80, 70, 70, 70], False),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.025, 0.05, 0.095, 0.14, 0.20, 0.26, 0.30, 0.34, 0.39, 0.43, 0.475, 0.52, 0.57, 0.615, 0.66, 0.71, 0.76,
                                                 0.79, 0.82, 0.85, 0.88, 0.94, 1.0],
                  [70, 50, 80, 90, 120, 120, 110, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 70, 70, 80, 120, 300, 1500], False),
}
