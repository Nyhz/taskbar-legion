"""The Quench — world 8, WORLD boss. What every blade of the Ash Lands was quenched in.

Water spoils good steel, the smiths said, and oil is for lesser work: a blade meant to kill is quenched in something
that is alive. So they kept one — a giant, chained on his knees behind the great forge until the chains were no
longer needed — and for an age every sword that left the works was driven white-hot into his back and left there
to cool. He did not die of it. He burned from the inside out instead: what kneels on the path now is a colossus of
ASH, pale and cracked, as wide as a house, with a furnace where his heart was (it shows through a hole in his
chest) and the forge's swords still standing in his back like the crosses of a graveyard. He has no face left —
the ash has closed over it — only a mouth that opens on the fire. One sword is not like the others: it stands in
his HEART, hilt out of his chest, and his hand is always on it.

He comes on by hauling himself along on his knuckles. Attack: he tears the white-hot sword out of his own heart,
cocks it back over his shoulder and hangs there — then brings it down on the prey in one cut that splits the
iron plates; and drives it back into his chest. Hit: the ash is knocked off him, the fire gutters. Death: the
fire goes out. He rears with a last roar of flame, the glow drains from his cracks and from every blade, he bows —
and the ash he is made of lets go: he comes down in a heap, and what is left on the path is a mound of ash with
the swords standing in it, hilts up, and the last one still dull red for a moment.

Own rig (nothing of the humanoid skeleton). Frame 248 wide with 59 extra rows above, root at 104. He kneels behind
the root, leaning on his near arm (knuckles on the path beside his knee); the far hand is the one on the hilt. At
the Knight's height nothing passes about 34 px ahead of the root at rest (the knees); his head, and the hilt and
the hand on it, hang over the Knight's head. The cut lands with its point about 58 px ahead. Nothing is a rotated
sprite: head, hands and swords are drawn as shapes at whatever angle they are. Drawn facing right; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Character, Pose, Pt, ik, keyed, lerp

FIGURE = ("Quench", "boss", "w08")

ROOT_X = 104
BUILD = Build(root_x=ROOT_X, thigh=1.0, shin=1.0, foot=0.0, hip_dx=0.0, spine=0.0, sh_near=0.0, sh_far=0.0, upper=1.0, fore=1.0, neck=0.0)

#: The trunk at rest, in his own space (u forward from the root, v up), clockwise from the back of the hips.
TORSO = [(-52, 5), (-61, 22), (-62, 42), (-57, 60), (-47, 75), (-31, 86), (-12, 91), (3, 88), (13, 78), (18, 62), (17, 46), (11, 32), (1, 23), (-12, 15), (-30, 6)]
PIV = (-32.0, 14.0)  # the hips: the trunk leans and rises about them
SH_N, SH_F = (-8.0, 79.0), (6.0, 76.0)  # the shoulders
UPPER, FORE = 42.0, 40.0
NECK = (2.0, 85.0)
HEAD = (25.0, 93.0)
HEAD_TILT = 26.0  # clockwise: he looks down at the prey
HEAD_SIZE = 1.3
HEART_BIG = 1.35  # how much bigger the heart's sword is than the forge's
LEAN0 = 2.5  # he is never upright: he hangs forward over whatever is in front of him
HEART = (12.0, 60.0)
HEART_AXIS = -7.0  # the sword in the heart points out of the chest and a little down: at whoever stands before him
BLADE = 58.0  # the heart's sword, drawn: a greatsword, the one blade here that was never finished cooling

#: The forge's swords, left in his back: where each goes in (trunk space), which way its hilt points (degrees
#: counter-clockwise from "ahead") and how much blade still shows.
BACK_SWORDS = [(-58.0, 29.0, 182.0, 12.0), (-59.0, 46.0, 163.0, 18.0), (-53.0, 62.0, 147.0, 13.0), (-43.0, 74.0, 131.0, 21.0),
               (-30.0, 83.0, 113.0, 14.0), (-15.0, 88.0, 97.0, 19.0)]
#: Where each of them is left standing when he is a heap of ash: x from the root, the way its hilt points, blade showing.
GRAVES = [(-64.0, 114.0, 16.0), (-51.0, 83.0, 24.0), (-40.0, 100.0, 18.0), (-28.0, 77.0, 27.0), (-16.0, 95.0, 19.0), (-4.0, 86.0, 24.0)]
HEART_GRAVE = (9.0, 80.0, 40.0)
#: Cracks in the ash, in trunk space; each with how near the heart it is (1 = at it). The fire shows through them.
CRACKS = [
    ([(12, 60), (4, 68), (-6, 74), (-16, 79)], 1.0), ([(12, 60), (11, 50), (6, 40), (-2, 32)], 0.95), ([(12, 60), (0, 56), (-16, 53), (-28, 57)], 0.9),
    ([(-28, 57), (-40, 52), (-49, 44)], 0.6), ([(-28, 57), (-33, 66), (-30, 74)], 0.6), ([(-2, 32), (-12, 28), (-22, 20)], 0.55),
    ([(-49, 44), (-52, 34), (-56, 27)], 0.4), ([(-16, 79), (-24, 84)], 0.5), ([(6, 40), (13, 37)], 0.6), ([(-16, 53), (-18, 42), (-26, 36)], 0.6),
]

ASH = "bone"
VOID = ("crimson", 0)


def _hash(x: int, y: int) -> int:
    return ((x * 73856093) ^ (y * 19349663)) & 0x7FFFFFFF


def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def P(x: float, up: float) -> Pt:
    return (ROOT_X + x, GROUND - up)


def _dir(deg: float) -> Pt:
    """The screen vector of a direction given in degrees counter-clockwise from "ahead" (up is positive)."""
    a = math.radians(deg)
    return (math.cos(a), -math.sin(a))


def _smooth(pts: list[Pt], sub: int = 4, closed: bool = False) -> list[Pt]:
    """A Catmull-Rom curve through the points."""
    out: list[Pt] = []
    n = len(pts)
    last = n if closed else n - 1
    for i in range(last):
        if closed:
            p0, p1, p2, p3 = pts[(i - 1) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        else:
            p0, p1, p2, p3 = pts[max(0, i - 1)], pts[i], pts[i + 1], pts[min(n - 1, i + 2)]
        for s in range(sub):
            t = s / sub
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
                             for a, b, c, d in zip(p0, p1, p2, p3)))  # type: ignore[arg-type]
    if not closed:
        out.append(pts[-1])
    return out


def fire(h: float) -> tuple[str, int]:
    """The colour of something this hot (0 cold … 1 white)."""
    if h >= 0.86:
        return ("light", 0)
    if h >= 0.68:
        return ("brass", 7)
    if h >= 0.52:
        return ("brass", 5)
    if h >= 0.38:
        return ("crimson", 5)
    if h >= 0.24:
        return ("crimson", 4)
    if h >= 0.12:
        return ("crimson", 2)
    return (ASH, 0)


def ash(cel: Cel, pts: list[Pt], c: Pt, r: float, shade: int = 0, grain: int = 0) -> set[tuple[int, int]]:
    """A form of ash: lit from the upper right round the point `c`, mottled, darker away from the light."""
    mask = cel.poly_mask(pts)
    for x, y in mask:
        s = ((x + 0.5 - c[0]) * 0.55 - (y + 0.5 - c[1]) * 0.83) / r
        i = 6 if s > 0.62 else 5 if s > 0.25 else 4 if s > -0.12 else 3 if s > -0.5 else 2
        h = _hash(x // 2 + grain, y // 2) % 13
        if h == 0:
            i -= 1  # a pit
        elif h == 1 and i < 5:
            i += 1  # a flake catching the light
        cel.put(x, y, (ASH, max(1, min(6, i - shade))))
    return set(mask)


def alimb(cel: Cel, a: Pt, b: Pt, w0: float, w1: float, idx: tuple[int, int, int], grain: int = 0) -> None:
    """A limb of ash: a tapered stroke, mottled like the rest of him."""
    part = Cel(cel.w, cel.h, cel.top)
    part.limb(a, b, w0, w1, ASH, idx)
    for (x, y), (ramp, i) in part.px.items():
        h = _hash(x // 2 + grain, y // 2) % 13
        if h == 0:
            i = max(1, i - 1)
        elif h == 1 and i < 5:
            i += 1
        cel.px[(x, y)] = (ramp, i)


class Quench(Character):
    build = BUILD
    W = 248
    TOP = 59

    # ------------------------------------------------------------------------------------------------- skeleton
    def joints(self, pose: Pose) -> dict:
        c = pose["crumble"]
        lean = (pose["lean"] + LEAN0) * (1.0 - c)
        a = math.radians(lean)
        ca, sa = math.cos(a), math.sin(a)

        def T(u: float, v: float) -> Pt:
            du = (u - PIV[0]) * (1.0 + 0.2 * c)
            dv = (v - PIV[1]) * pose["rise"] * (1.0 - 0.8 * c)
            return P(PIV[0] + du * ca + dv * sa + pose["dx"], PIV[1] - du * sa + dv * ca - 9.0 * c)

        J: dict = {"T": T, "pelvis": P(PIV[0] + pose["dx"], PIV[1]), "lean": (0.0, 0.0)}
        J["torso"] = _smooth([T(u, v) for u, v in TORSO], closed=True)
        J["shN"], J["shF"] = T(*SH_N), T(*SH_F)
        J["neck"] = T(*NECK)
        held = T(HEAD[0] + pose["head_dx"], HEAD[1] + pose["head_dy"])
        w = pose["head_free"]
        hx, hup = pose["head_at"]
        J["head"] = (lerp(held[0], ROOT_X + hx, w), lerp(held[1], GROUND - hup, w))
        J["head_rot"] = HEAD_TILT + pose["lean"] * 0.5 * (1.0 - c) + pose["head_rot"]
        J["lean_total"] = lean
        J["heart"] = T(*HEART)
        # The sword in the heart: it slides out along its axis with the hand on it, then goes where the hand goes.
        axis = HEART_AXIS - pose["lean"] * (1.0 - c)  # the hilt keeps pointing at the prey
        d = _dir(axis)
        vis = 3.0 + (BLADE - 3.0) * pose["draw"]
        g0 = 3.5 * HEART_BIG
        on_axis = (J["heart"][0] + d[0] * (vis + g0), J["heart"][1] + d[1] * (vis + g0))
        free = pose["free"]
        hand = pose["hand"]
        J["grip"] = (lerp(on_axis[0], ROOT_X + hand[0], free), lerp(on_axis[1], GROUND - hand[1], free))
        J["sw_ang"] = lerp(axis + 180.0, pose["sw_ang"], free)
        J["sw_vis"] = lerp(vis, BLADE, free)
        tip = _dir(J["sw_ang"])
        J["tip"] = (J["grip"][0] + tip[0] * (J["sw_vis"] + g0), J["grip"][1] + tip[1] * (J["sw_vis"] + g0))
        # The far hand is on the hilt, unless it has let go; the near arm is the one he leans on.
        let = pose["let_go"]
        lx, lup = pose["hand_n"]
        want = (lerp(J["grip"][0], ROOT_X + lx, let), lerp(J["grip"][1], GROUND - lup, let))
        reach = min(UPPER, max(22.0, math.hypot(want[0] - J["shF"][0], want[1] - J["shF"][1]) * 0.56))  # the elbow stays tucked: nothing of it hangs at a man's height
        J["elbS"], J["handS"] = ik(J["shF"], want, reach, reach, pose["elbow"])
        fx, fup = pose["hand_f"]
        plant = P(fx - 29.0, fup)
        half = min(41.0, max(30.0, math.hypot(plant[0] - J["shN"][0], plant[1] - J["shN"][1]) * 0.512))  # a locked arm, a hair bent
        J["elbP"], J["handP"] = ik(J["shN"], plant, half, half, 1)
        return J

    # ------------------------------------------------------------------------------------------------- swords
    def sword(self, cel: Cel, grip: Pt, ang: float, vis: float, heat: float, glow: float = 1.0, big: float = 1.0) -> None:
        """A sword: its grip at `grip`, its blade running `ang` (degrees counter-clockwise from "ahead") for `vis`
        px. The far end — the point, or where it goes into him — is the hottest; the steel cools towards the hilt.
        `big` is the heart's greatsword."""
        b = _dir(ang)
        n = (-b[1], b[0])
        g0 = 3.5 * big  # where the blade starts, past the guard

        def S(f: float, s: float = 0.0) -> Pt:
            return (grip[0] + b[0] * f + n[0] * s, grip[1] + b[1] * f + n[1] * s)

        w = 3.4 if big == 1.0 else 5.4
        segs = max(2, int(vis / 5.0))
        for i in range(segs):
            t0, t1 = i / segs, (i + 1) / segs
            h = heat * glow * (0.12 + 0.95 * ((t0 + t1) / 2) ** 0.8)
            if h >= 0.86:
                ramp, idx = "brass", (6, 7, 7)
            elif h >= 0.62:
                ramp, idx = "brass", (5, 6, 7)
            elif h >= 0.44:
                ramp, idx = "brass", (3, 5, 6)
            elif h >= 0.3:
                ramp, idx = "crimson", (3, 5, 6)
            elif h >= 0.16:
                ramp, idx = "crimson", (2, 3, 4)
            else:
                ramp, idx = "ink", (4, 6, 8)
            last = i == segs - 1 and vis > 30
            cel.limb(S(g0 + vis * t0 - 0.5), S(g0 + vis * t1), w - 0.6 * t0, w - 0.6 * t1 - (w * 0.55 if last else 0.0), ramp, idx)
            if h >= 0.86:  # white at its core
                cel.line(S(g0 + vis * t0), S(g0 + vis * t1), ("light", 0))
        span = 5.0 if big == 1.0 else 8.0
        cel.limb(S(g0 - 0.5, -span), S(g0 - 0.5, span), 2.6 * (1.0 if big == 1.0 else 1.25), 2.6 * (1.0 if big == 1.0 else 1.25), "ink", (1, 3, 5))  # the guard
        cel.put(*S(g0 - 0.5, -span), ("brass", 4))
        cel.put(*S(g0 - 0.5, span), ("brass", 4))
        cel.limb(S(g0 - 2.0), S(-4.0 * big), 2.6 * big ** 0.5, 2.6 * big ** 0.5, "leather", (1, 2, 4))  # the grip
        cel.limb(S(-4.5 * big), S(-6.0 * big), 3.6 * big ** 0.6, 3.6 * big ** 0.6, "brass", (2, 4, 5))  # the pommel

    def stuck(self, cel: Cel, entry: Pt, out: float, vis: float, heat: float, big: float = 1.0) -> None:
        """A sword standing in him (or in what is left of him): it goes in at `entry`, its hilt points `out`."""
        d = _dir(out)
        self.sword(cel, (entry[0] + d[0] * (vis + 3.5 * big), entry[1] + d[1] * (vis + 3.5 * big)), out + 180.0, vis, heat, glow=0.92, big=big)

    def back_swords(self, cel: Cel, J: dict, pose: Pose) -> None:
        fall, heat = pose["fall"], pose["heat"]
        lean = J["lean_total"]
        for i, ((u, v, out, vis), (gx, gout, gvis)) in enumerate(zip(BACK_SWORDS, GRAVES)):
            a = J["T"](u, v)
            g = P(gx, max(1.0, self.mound_h(gx) * pose["mound"]) - 2.0)
            k = _clamp(fall * 1.25 - i * 0.05)
            k = k * k * (3 - 2 * k)
            entry = (lerp(a[0], g[0], k), lerp(a[1], g[1], k))
            wob = 3.0 * math.sin(math.tau * (pose["flow"] + i * 0.31)) * pose["rattle"]
            self.stuck(cel, entry, lerp(out - lean, gout, k) + wob, lerp(vis, gvis, k), heat * (0.75 + 0.25 * ((i * 3) % 4) / 3))

    # ------------------------------------------------------------------------------------------------- body
    @staticmethod
    def mound_h(x: float) -> float:
        """How high the heap of ash he leaves stands at x (from the root)."""
        t = (x + 21.0) / 54.0
        return 19.0 * max(0.0, 1.0 - t * t) ** 0.7 if abs(t) < 1.0 else 0.0

    def trunk(self, cel: Cel, J: dict, pose: Pose) -> None:
        """The trunk: ash, cracked, the fire showing through the cracks — and through the hole where his heart was."""
        T = J["T"]
        heat = pose["heat"]
        c = pose["crumble"]
        mask = ash(cel, J["torso"], T(4.0, 70.0), 48.0)
        if not mask:
            return
        # The ribs and the hollow of the belly: darker lines of settled ash.
        for (u0, v0), (u1, v1) in (((-44, 46), (-30, 40)), ((-46, 36), (-30, 31)), ((-42, 27), (-28, 23)), ((14, 74), (6, 71)), ((-50, 58), (-40, 55))):
            part = Cel(cel.w, cel.h, cel.top)
            part.line(T(u0, v0), T(u1, v1), (ASH, 2))
            for xy, t in part.px.items():
                if xy in mask:
                    cel.px[xy] = t
        if c > 0.55:
            return
        # The cracks: the nearer the heart, the hotter.
        flick = int(pose["flow"] * 16)
        for pts, near in CRACKS:
            part = Cel(cel.w, cel.h, cel.top)
            for a, b in zip(pts, pts[1:]):
                part.line(T(*a), T(*b), VOID)
            for (x, y) in part.px:
                if (x, y) not in mask:
                    continue
                h = heat * near * (0.9 if _hash(x + flick, y) % 4 else 1.15)
                cel.px[(x, y)] = fire(min(0.84, h * 0.72)) if h > 0.12 else (ASH, 1)
                if h > 0.75:  # the glow spreads into the ash beside it
                    for q in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                        if q in mask and cel.px.get(q, (ASH, 0))[0] == ASH:
                            cel.px[q] = ("crimson", 4) if h > 1.05 else ("crimson", 3)
        # The heart: a ragged hole on the furnace.
        hx, hy = J["heart"]
        for x in range(int(hx) - 9, int(hx) + 10):
            for y in range(int(hy) - 9, int(hy) + 10):
                if (x, y) not in mask:
                    continue
                dx_, dy_ = x + 0.5 - hx, (y + 0.5 - hy) * 1.1
                r = math.hypot(dx_, dy_) + 1.3 * math.sin(math.atan2(dy_, dx_) * 5.0 + 1.0)
                beat = 0.5 + 0.5 * math.sin(math.tau * pose["flow"] * 2)
                if r < 5.2:
                    cel.px[(x, y)] = fire(_clamp(heat * (1.02 - r * 0.07) + 0.06 * beat * heat, 0.0, 1.2))
                elif r < 6.4:
                    cel.px[(x, y)] = fire(_clamp(heat * 0.55, 0.0, 0.6)) if heat > 0.3 else (ASH, 1)
                elif r < 8.0 and heat > 0.7 and _hash(x, y) % 2:
                    cel.px[(x, y)] = ("crimson", 4 if heat > 1.1 else 3)

    def leg(self, cel: Cel, J: dict, pose: Pose, far: bool) -> None:
        """A leg, kneeling: the thigh from the hip down to the knee on the path, the shin lying back along it."""
        T = J["T"]
        kx = (24.0 if far else 15.0) + (pose["knee_f"] if far else pose["knee_n"])
        hip = T(-36.0 if not far else -30.0, 21.0)
        knee = P(kx, 9.0)
        ankle = P(kx - 52.0, 6.0)
        idx = (1, 2, 3) if far else (2, 3, 5)
        alimb(cel, knee, ankle, 15.0, 11.0, (1, 2, 3) if far else (1, 3, 4), 11)
        alimb(cel, ankle, (ankle[0] - 5.0, ankle[1] - 7.0), 10.0, 7.0, (1, 2, 3), 12)  # the foot, toes on the path
        alimb(cel, hip, knee, 27.0, 19.0, idx, 13)
        alimb(cel, knee, (knee[0] + 0.5, knee[1] + 0.5), 19.0, 19.0, idx, 14)  # the knee-cap
        if not far:
            cel.line((knee[0] - 16.0, knee[1] - 4.0), (knee[0] - 30.0, knee[1] + 0.0), (ASH, 2))

    def arm(self, cel: Cel, sh: Pt, el: Pt, hand: Pt, far: bool) -> None:
        idx = (1, 2, 3) if far else (2, 4, 5)
        alimb(cel, sh, (sh[0] + 0.5, sh[1]), 21.0, 21.0, idx, 21)  # the shoulder
        alimb(cel, sh, el, 17.0, 14.0, idx, 22)
        alimb(cel, el, (el[0] + 0.5, el[1]), 14.5, 14.5, idx, 23)
        alimb(cel, el, hand, 14.0, 11.0, idx, 24)

    def fist(self, cel: Cel, wrist: Pt, toward: Pt, far: bool, grip: bool = False) -> None:
        """A fist: knuckles on the path, or closed on a hilt."""
        d = (toward[0] - wrist[0], toward[1] - wrist[1])
        L = math.hypot(*d) or 1.0
        d = (d[0] / L, d[1] / L)
        idx = (1, 2, 3) if far else (2, 4, 5)
        a = (wrist[0] - d[0] * 1.0, wrist[1] - d[1] * 1.0)
        b = (wrist[0] + d[0] * (5.0 if grip else 7.0), wrist[1] + d[1] * (5.0 if grip else 7.0))
        alimb(cel, a, b, 11.0 if grip else 13.0, 10.5 if grip else 13.5, idx, 25)
        n = (-d[1], d[0])
        for s in (-3.5, 0.0, 3.5):  # the lines between the fingers
            p = (b[0] + n[0] * s - d[0] * 1.0, b[1] + n[1] * s - d[1] * 1.0)
            cel.line(p, (p[0] - d[0] * 3.5, p[1] - d[1] * 3.5), (ASH, 1 if far else 2))

    def head(self, cel: Cel, J: dict, pose: Pose) -> None:
        """His head: the ash has closed over the face. A brow, the hollows where the eyes were — and the mouth,
        which opens on the fire. A sword was driven down into the crown of it once and is still there."""
        at, rot = J["head"], J["head_rot"]
        a = math.radians(rot)
        ca, sa = math.cos(a), math.sin(a)
        jaw = pose["jaw"]
        heat = pose["heat"]

        def F(hx: float, hy: float) -> Pt:  # head space: hx ahead, hy up; turned `rot` clockwise
            hx, hy = hx * HEAD_SIZE, hy * HEAD_SIZE
            return (at[0] + hx * ca + hy * sa, at[1] + hx * sa - hy * ca)

        def Jw(hx: float, hy: float) -> Pt:  # the lower jaw swings about its hinge
            j = math.radians(jaw * 30.0)
            dx, dy = hx + 3.0, hy + 3.5
            return F(-3.0 + dx * math.cos(j) + dy * math.sin(j), -3.5 - dx * math.sin(j) + dy * math.cos(j))

        part = Cel(cel.w, cel.h, cel.top)
        # The sword in the crown, behind the skull's edge.
        self.stuck(part, F(-7.0, 7.0), 146.0 - rot, 3.0, heat * 0.8)
        skull = _smooth([F(-10, -6), F(-13, 0), F(-12, 7), (F(-6, 12)), F(2, 13), F(8, 11.5), F(12.5, 8.5), F(15.5, 5), F(12.5, 3), F(12, -1), F(13.2, -3.6), F(3, -4.5),
                         F(-4, -7)], sub=3, closed=True)
        low = _smooth([Jw(-8, -5), Jw(2, -4.5), Jw(13.5, -5), Jw(15.2, -7.5), Jw(13.5, -12), Jw(5, -14), Jw(-3, -13), Jw(-8, -9)], sub=3, closed=True)
        # The mouth: the dark between the jaws, and the fire far back in it.
        gap = part.poly_mask([F(1, -4), F(13.4, -3.4), Jw(14.5, -5.2), Jw(1, -4.2)])
        mouth: set[tuple[int, int]] = set(gap)
        ash(part, low, F(8, -2), 13.0 * HEAD_SIZE, shade=1, grain=3)
        for xy in gap:
            part.px[xy] = VOID
        skull_mask = ash(part, skull, F(6, 10), 15.0 * HEAD_SIZE, grain=5)
        if jaw > 0.3:  # broken edges of ash stand against the fire, above and below
            for hx in (5.0, 8.2, 11.4):
                a_ = F(hx, -4.2)
                part.line(a_, (a_[0] + sa * 1.6, a_[1] + ca * 1.6), (ASH, 2))
            for hx in (6.5, 9.8, 13.0):
                b_ = Jw(hx, -5.0)
                part.line(b_, (b_[0] - sa * 1.6, b_[1] - ca * 1.6), (ASH, 2))
        back = F(0, -5)
        for (x, y) in mouth:
            if (x, y) in skull_mask and jaw < 0.2:
                continue
            dist = math.hypot(x + 0.5 - back[0], y + 0.5 - back[1])
            h = heat * (1.05 - dist * 0.055) * (0.6 + 0.6 * jaw)
            part.px[(x, y)] = fire(_clamp(h, 0.0, 1.1)) if h > 0.12 else VOID
        # The brow and what is left of the face under the ash.
        for xy in part.poly_mask([F(5.5, 5.2), F(14.0, 4.2), F(12.2, 0.4), F(7.0, 0.6)]):  # the hollow under the brow
            if xy in skull_mask:
                part.px[xy] = (ASH, 1 if (xy[0] + xy[1]) % 3 else 2)
        for (ax, ay), (bx, by), tone in (((4.5, 6.4), (14.5, 5.4), 6), ((4.5, 5.6), (9, 5.2), 2), ((-9, 2), (-6, 7), 2),
                                         ((-2, 12), (1, 6), 2), ((1, 6), (-1, 2), 2), ((7, -1), (11.5, -2), 2), ((-6, -3), (0, -5), 2)):
            part.line(F(ax, ay), F(bx, by), (ASH, tone))
        if heat > 0.2:  # where the eye was the ash has sealed over the fire, and it weeps
            part.line(F(8.0, 3.0), F(11.6, 2.3), fire(min(0.84, heat * 0.7)))
            part.line(F(10.4, 1.4), F(11.2, -2.6), fire(min(0.5, heat * 0.4)))
        if heat > 0.5:  # the fire has found a way out along the crack in the skull
            part.put(*F(1, 6), fire(min(0.6, heat * 0.5)))
            part.put(*F(0, 4), fire(min(0.5, heat * 0.4)))
        if jaw < 0.2 and heat > 0.2:  # shut, the line of the mouth still glows
            part.line(F(3, -4.5), F(13, -4), fire(min(0.6, heat * 0.5)))
        for xy in [xy for xy in part.px if xy[1] >= GROUND]:
            del part.px[xy]
        cel.px.update(part.px)

    def mound(self, cel: Cel, pose: Pose) -> None:
        """What is left of him: a heap of ash."""
        m = pose["mound"]
        if m < 0.03:
            return
        pts: list[Pt] = [P(-76.0, 0.0)]
        for i in range(-75, 34, 3):
            lump = 1.6 * math.sin(i * 0.37) + 1.1 * math.sin(i * 0.83 + 2.0)
            pts.append(P(float(i), max(0.0, (self.mound_h(i) + lump * min(1.0, self.mound_h(i) / 8.0)) * m)))
        pts.append(P(34.0, 0.0))
        mask = ash(cel, pts, P(-4.0, 16.0 * m), 46.0, grain=7)
        for (x, y) in mask:  # slides and settled layers
            up = GROUND - y
            if (x * 2 + up * 5) % 23 == 0 and up > 2:
                cel.px[(x, y)] = (ASH, 2)
            if up <= 1 and _hash(x, 3) % 3 == 0:
                cel.px[(x, y)] = (ASH, 2)

    # ------------------------------------------------------------------------------------------------- drawing
    def draw(self, cel, J, pose, ropes, between) -> None:
        c = pose["crumble"]
        body = c < 0.97
        limbs = pose["arms"] > 0.5
        fall = pose["fall"]
        if body and c < 0.6:
            self.leg(cel, J, pose, far=True)
        if limbs:  # the sword arm is the far one: it comes round from behind him
            self.arm(cel, J["shF"], J["elbS"], J["handS"], far=True)
        self.back_swords(cel, J, pose)
        if fall > 0.001:  # the heart's sword, left standing with the others
            gx, gout, gvis = HEART_GRAVE
            g = P(gx, max(1.0, self.mound_h(gx) * pose["mound"]) - 2.0)
            kf = fall * fall * (3 - 2 * fall)
            out0 = (J["sw_ang"] + 360.0) % 360.0 - 180.0  # the way its hilt points now, taken the short way round
            self.stuck(cel, (lerp(J["tip"][0], g[0], kf), lerp(J["tip"][1], g[1], kf)), lerp(out0, gout, kf), lerp(J["sw_vis"], gvis, kf),
                       pose["heat"] + pose["ember"], big=HEART_BIG)
        if body:
            self.trunk(cel, J, pose)
        if body and c < 0.6:
            self.leg(cel, J, pose, far=False)
        self.mound(cel, pose)
        if pose["head_show"] > 0.5:
            if body and c < 0.6:
                alimb(cel, J["neck"], (lerp(J["neck"][0], J["head"][0], 0.75), lerp(J["neck"][1], J["head"][1], 0.75) + 3.0), 21.0, 17.0, (2, 3, 4), 26)
            self.head(cel, J, pose)
        if limbs:  # the arm he leans on
            self.arm(cel, J["shN"], J["elbP"], J["handP"], far=False)
            self.fist(cel, J["handP"], (J["handP"][0] + 4.0, J["handP"][1] + (1.0 if pose["hand_f"][1] < 8.0 else 5.0)), far=False)
        # The sword in the heart, and the hand that is on it.
        if fall <= 0.001:
            if pose["smear"] > 0.5 and len(between) > 2:
                self.hot_smear(cel, [Jb["tip"] for Jb, _ in between[7:]], [Jb["grip"] for Jb, _ in between[7:]])
            self.sword(cel, J["grip"], J["sw_ang"], J["sw_vis"], max(pose["heat"], 0.35 * pose["free"]) * (1.0 + 0.5 * pose["free"]), glow=1.05, big=HEART_BIG)
        if limbs:
            d = _dir(J["sw_ang"])
            n = (-d[1], d[0])
            if pose["let_go"] < 0.5:
                self.fist(cel, (J["handS"][0] - n[0] * 3.0, J["handS"][1] - n[1] * 3.0), (J["handS"][0] + n[0] * 4.0, J["handS"][1] + n[1] * 4.0), far=True, grip=True)
            else:
                self.fist(cel, J["handS"], (J["handS"][0] + 3.0, J["handS"][1] + 5.0), far=True)

        for xy in [xy for xy in cel.px if xy[1] >= GROUND]:
            del cel.px[xy]
        cel.outline()
        for xy in [xy for xy in cel.px if xy[1] >= GROUND]:
            del cel.px[xy]

        # Effects, behind the figure (and on the path).
        self.ground(cel, pose)
        if pose["heat"] > 0.3 and c < 0.5:
            self.embers(cel, J, pose)
        if pose["breath"] > 0.05:
            self.breath(cel, J, pose)
        if pose["roar"] > 0.05:
            self.roar(cel, J, pose)
        if pose["ashfall"] > 0.02:
            self.ashfall(cel, J, pose)
        if 0.01 < pose["shed"] < 0.99:
            self.shed(cel, J, pose["shed"])
        if 0.01 < pose["tear"] < 0.99:
            self.sparks(cel, J["heart"], pose["tear"], 12, -30.0, 70.0, 16.0)
        if 0.01 < pose["strike"] < 0.985:
            self.strike(cel, pose["strike_x"], pose["strike"], pose["strike_big"])
        if pose["dust"] > 0.02:
            self.dust(cel, pose)
        if pose["smoke"] > 0.02:
            self.smoke(cel, pose)

    @staticmethod
    def hot_smear(cel: Cel, tips: list[Pt], hubs: list[Pt]) -> None:
        """The trail of the white-hot blade: a crescent of light along the path its point swept since the last frame."""
        n = len(tips)
        if n < 3:
            return
        body = set(cel.px)
        inner = []
        for i, (t, h) in enumerate(zip(tips, hubs)):
            k = 0.5 * (i / (n - 1)) ** 0.7
            inner.append((t[0] + (h[0] - t[0]) * k, t[1] + (h[1] - t[1]) * k))
        for xy in cel.poly_mask(list(tips) + inner[::-1]):
            if xy not in body and xy[1] < GROUND:
                cel.px[xy] = ("brass", 6) if (xy[0] + xy[1]) % 5 else ("brass", 7)
        rim = Cel(cel.w, cel.h, cel.top)
        for p0, p1 in zip(tips[n // 3:], tips[n // 3 + 1:]):
            rim.line(p0, p1, ("light", 0))
        for xy, t in rim.px.items():
            if xy not in body and xy[1] < GROUND:
                cel.px[xy] = t

    def ground(self, cel: Cel, pose: Pose) -> None:
        """The path under him: scorched, and drifted with the ash that falls off him."""
        for x in range(ROOT_X - 70, ROOT_X + 34):
            if _hash(x // 3, 1) % 4:
                cel.soft(x, GROUND, ("ink", 1))
            if _hash(x, 5) % 7 == 0:
                cel.soft(x, GROUND - 1, (ASH, 3))

    def embers(self, cel: Cel, J: dict, pose: Pose) -> None:
        """Sparks climb off the heart and off the swords' wounds."""
        ph = pose["flow"]
        heat = min(1.5, pose["heat"])
        sources = [(J["heart"], 5)] + [(J["T"](u, v), 2) for u, v, _, _ in BACK_SWORDS[1::2]]
        for si, (src, count) in enumerate(sources):
            for i in range(int(count * heat)):
                h1, h2 = (_hash(i + si * 17, 7) % 100) / 100.0, (_hash(i + si * 17, 13) % 100) / 100.0
                age = (ph * 2 + h1) % 1.0
                x = src[0] + (h2 - 0.5) * 10.0 + 4.0 * math.sin(math.tau * (age + h2)) - 5.0 * age
                y = src[1] - 3.0 - (22.0 + 26.0 * h2) * age
                if y < -cel.top + 2:
                    continue
                cel.soft(x, y, ("brass", 7) if age < 0.3 else ("brass", 5) if age < 0.6 else ("crimson", 4))

    def breath(self, cel: Cel, J: dict, pose: Pose) -> None:
        """What he breathes out: sparks and a lick of flame, falling short of a man's height."""
        at, rot = J["head"], math.radians(J["head_rot"])
        mx, my = at[0] + 15.0 * math.cos(rot) + 8.0 * math.sin(rot), at[1] + 15.0 * math.sin(rot) + 8.0 * math.cos(rot)
        ph = pose["flow"]
        k = pose["breath"]
        for i in range(int(10 * k)):
            h1, h2 = (_hash(i, 23) % 100) / 100.0, (_hash(i, 29) % 100) / 100.0
            age = (ph * 3 + h1) % 1.0
            x = mx + (5.0 + 12.0 * h2) * age + 2.0
            y = my + 2.0 + (10.0 + 10.0 * h2) * age * age + 3.0 * age
            if y > GROUND - 42 or x > ROOT_X + 50:
                continue
            cel.soft(x, y, ("light", 0) if age < 0.2 else ("brass", 6) if age < 0.5 else ("crimson", 5))
            if age < 0.35 and i % 2:
                cel.soft(x - 1, y - 1, ("brass", 7))

    def roar(self, cel: Cel, J: dict, pose: Pose) -> None:
        """The last of the fire leaves him by the mouth: a tongue of flame, up and ahead."""
        at, rot = J["head"], math.radians(J["head_rot"])
        d = (math.cos(rot) * 0.96 + math.sin(rot) * 0.26, math.sin(rot) * 0.96 - math.cos(rot) * 0.26)
        L = math.hypot(*d)
        d = (d[0] / L, d[1] / L)
        mx, my = at[0] + 15.0 * math.cos(rot) + 8.0 * math.sin(rot), at[1] + 15.0 * math.sin(rot) + 8.0 * math.cos(rot)
        k = pose["roar"]
        ph = pose["flow"]
        length = 46.0 * k
        if length < 3.0:
            return
        for y in range(int(my - length - 12), int(my + 14)):
            for x in range(int(mx - 14), int(mx + length + 14)):
                if y < -cel.top + 1 or y >= GROUND - 40:
                    continue
                px_, py_ = x + 0.5 - mx, y + 0.5 - my
                along = px_ * d[0] + py_ * d[1]
                if not (0.0 <= along <= length):
                    continue
                t = along / length
                side = -px_ * d[1] + py_ * d[0] + 7.0 * t * t  # it curls upward as it goes
                w = (2.5 + 8.5 * math.sin(math.pi * min(1.0, t * 1.12)) ** 0.8) * (0.86 + 0.14 * math.sin(along * 0.8 + ph * 40))
                e = abs(side) / max(1.0, w)
                if e > 1.0 or (e > 0.78 and t > 0.45 and _hash(x, y + int(ph * 16)) % 3 == 0):
                    continue
                cel.soft(x, y, ("light", 0) if e < 0.3 and t < 0.5 else ("brass", 7) if e < 0.55 and t < 0.78 else ("brass", 5) if e < 0.82 and t < 0.92 else ("crimson", 5))

    def ashfall(self, cel: Cel, J: dict, pose: Pose) -> None:
        """Ash comes off him all the time, and in sheets as he breaks up."""
        ph = pose["flow"]
        k = pose["ashfall"]
        for i in range(int(16 * k)):
            h1, h2, h3 = (_hash(i, 31) % 100) / 100.0, (_hash(i, 37) % 100) / 100.0, (_hash(i, 41) % 100) / 100.0
            age = (ph * 2 + h1) % 1.0
            top = J["T"](-60.0 + 78.0 * h2, 30.0 + 55.0 * h3)
            x = top[0] - 6.0 * age + 2.0 * math.sin(math.tau * (age * 2 + h2))
            y = top[1] + 8.0 + (GROUND - top[1] - 8.0) * age
            if y >= GROUND - 1 or x > ROOT_X + 34:
                continue
            cel.soft(x, y, (ASH, 5) if i % 3 else (ASH, 4))

    @staticmethod
    def shed(cel: Cel, J: dict, u: float) -> None:
        """Ash knocked off him by a blow."""
        cx, cy = J["T"](-2.0, 72.0)
        for i in range(20):
            ang = math.radians(-205.0 + i * 12.0)
            dist = 8.0 + (18.0 + (i * 7 % 5) * 3.0) * u
            x = cx + math.cos(ang) * dist * 1.3 - 10.0 * u
            y = cy + math.sin(ang) * dist + 16.0 * u * u
            if y >= GROUND - 1 or y < -cel.top + 1 or x > ROOT_X + 36:
                continue
            cel.soft(x, y, (ASH, 5) if i % 3 else (ASH, 6))
            if i % 2 and u < 0.6:
                cel.soft(x + 1, y + 1, (ASH, 3))

    @staticmethod
    def sparks(cel: Cel, at: Pt, u: float, count: int, a0: float, spread: float, reach: float) -> None:
        for i in range(count):
            ang = math.radians(-(a0 + spread * i / max(1, count - 1)))
            dist = 4.0 + (reach + (i * 5 % 4) * 4.0) * u
            x = at[0] + math.cos(ang) * dist
            y = at[1] + math.sin(ang) * dist + 10.0 * u * u
            if y >= GROUND - 1 or y < -cel.top + 1:
                continue
            cel.soft(x, y, ("light", 0) if u < 0.35 else ("brass", 6) if u < 0.7 else ("crimson", 5))
            if u < 0.5 and i % 2:
                cel.soft(x - math.cos(ang), y - math.sin(ang), ("brass", 7))

    @staticmethod
    def strike(cel: Cel, at: float, u: float, big: float = 1.0) -> None:
        """Where the cut lands: the plates split along a seam of light, fire stands up out of it, sparks fly."""
        ix = ROOT_X + at
        half = (10.0 + 24.0 * min(1.0, u * 2.0)) * big
        for i in range(int(-half), int(half) + 1):  # the seam, cooling from its ends
            t = abs(i) / half
            h = (1.0 - t) * (1.15 - u * 0.8)
            if h > 0.1 and (i + int(u * 6)) % 7:
                cel.soft(ix + i, GROUND - 1, fire(min(1.0, h)))
                if h > 0.6 and i % 2:
                    cel.soft(ix + i, GROUND - 2, fire(min(0.7, h * 0.6)))
            if t < 0.7:
                cel.soft(ix + i, GROUND, ("ink", 1))
        rise = math.sin(math.pi * min(1.0, 0.12 + u * 0.95)) ** 0.6
        for i in range(-17, 18):  # fire stands up where the point went in
            hgt = (1.0 - abs(i) / 18.0) ** 0.7 * 40.0 * rise * big * (0.5 + 0.5 * ((_hash(i, 3) % 9) / 8.0))
            for s_ in range(int(hgt)):
                if _hash(i, s_) % 8 < int(u * 5.0):
                    continue
                cel.soft(ix + i, GROUND - 2 - s_, ("light", 0) if s_ < hgt * 0.3 and u < 0.5 else ("brass", 6) if s_ < hgt * 0.6 else ("crimson", 5) if s_ < hgt * 0.85 else ("crimson", 3))
        for i in range(int(26 * big) + 4):  # sparks
            ang = math.radians(-174 + i * 6.6)
            dist = 7.0 + (26.0 + (i * 5 % 4) * 8.0) * u * big
            x = ix + math.cos(ang) * dist * 1.25
            y = GROUND - 2 + math.sin(ang) * dist + 22.0 * u * u
            if y >= GROUND - 1 or y < -cel.top + 1:
                continue
            cel.soft(x, y, ("light", 0) if u < 0.3 else ("brass", 6) if u < 0.65 else ("crimson", 5))
            if i % 3 == 0 and u < 0.6:
                cel.soft(x - math.cos(ang) * 1.2, y - math.sin(ang), ("brass", 7))

    def dust(self, cel: Cel, pose: Pose) -> None:
        """The cloud of ash that goes up as he comes down."""
        k = pose["dust"]
        ph = pose["flow"]
        for i in range(70):
            h1, h2, h3 = (_hash(i, 43) % 100) / 100.0, (_hash(i, 47) % 100) / 100.0, (_hash(i, 53) % 100) / 100.0
            x = ROOT_X - 74.0 + 108.0 * h1 + (h1 - 0.5) * 26.0 * k
            y = GROUND - 2.0 - (6.0 + 34.0 * h2) * math.sin(math.pi * _clamp(k * (0.6 + 0.6 * h3))) - 8.0 * k * h3
            if y < -cel.top + 1 or y >= GROUND - 1 or x > ROOT_X + 36 or h3 > 1.15 - k * 0.5 + 0.3:
                continue
            cel.soft(x + 2.0 * math.sin(ph * 40 + i), y, (ASH, 4) if i % 3 else (ASH, 5) if i % 2 else (ASH, 3))

    def smoke(self, cel: Cel, pose: Pose) -> None:
        """Thin smoke off the heap, where the last sword still holds a little heat."""
        k = pose["smoke"]
        ph = pose["flow"]
        base = P(HEART_GRAVE[0], self.mound_h(HEART_GRAVE[0]) + 30.0)
        for s in range(int(34 * k)):
            x = base[0] - 2.0 + 3.0 * math.sin(s * 0.33 + ph * math.tau * 2) - s * 0.25
            y = base[1] - 4.0 - s
            if y < -cel.top + 2:
                break
            if (s + int(ph * 12)) % 3:
                cel.soft(x, y, ("ink", 4) if s % 2 else ("ink", 3))


# --------------------------------------------------------------------------------------- animations
REST_HAND = (30.0, 60.0)  # only read once the sword is free of the heart
BASE: Pose = dict(dx=0.0, rise=1.0, lean=0.0, crumble=0.0, mound=0.0, flow=0.0, heat=1.0, ember=0.0, rattle=0.0,
                  head_dx=0.0, head_dy=0.0, head_rot=0.0, head_free=0.0, head_at=(14.0, 10.0), head_show=1.0, jaw=0.5, breath=1.0, roar=0.0,
                  draw=0.42, free=0.0, hand=REST_HAND, sw_ang=198.0, let_go=0.0, hand_n=(22.0, 30.0), hand_f=(30.0, 6.0), arms=1.0,
                  knee_n=0.0, knee_f=0.0, elbow=1.0, fall=0.0, ashfall=1.0, shed=0.0, tear=0.0, strike=0.0, strike_x=58.0, strike_big=1.0, smear=0.0, dust=0.0, smoke=0.0, flash=0.0)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.16))
    # The hand is never still on the hilt: once a cycle he eases the blade a hand's breadth out of his heart, and
    # the fire in him leaps to it; then he lets it sink back.
    pull = _clamp(math.sin(math.pi * _clamp((ph - 0.45) / 0.45)))
    growl = _clamp(math.sin(math.pi * _clamp((ph - 0.5) / 0.3)))
    tap = 1.0 if 0.08 < ph < 0.15 or 0.22 < ph < 0.29 else 0.0  # the knuckles lift and come down
    return {**BASE, "flow": ph, "rise": 1.0 + 0.022 * s, "lean": 1.6 * late + 2.0 * pull, "heat": 1.0 + 0.12 * s + 0.35 * pull,
            "head_rot": 3.0 * late + 5.0 * pull, "head_dy": 0.8 * s, "jaw": 0.2 + 0.6 * growl, "breath": 0.7 + 1.3 * growl,
            "draw": 0.4 + 0.26 * pull, "hand_f": (30.0, 6.0 + 2.5 * tap), "rattle": 0.25}


def haul_pose(ph: float) -> Pose:
    """He hauls himself along on his knuckles: the fist is flung ahead and bites the path, the whole trunk heaves
    up and falls forward after it, a knee is dragged up under him."""
    reach = _clamp(math.sin(math.pi * _clamp(ph / 0.34)))
    heave = math.sin(math.pi * _clamp((ph - 0.28) / 0.5)) ** 2
    drag = _clamp((ph - 0.3) / 0.5)
    fx = lerp(18.0, 33.0, _clamp(ph / 0.3)) if ph < 0.3 else lerp(33.0, 18.0, drag)
    fup = 6.0 + 26.0 * reach * (1.0 - _clamp((ph - 0.24) / 0.1)) if ph < 0.34 else 6.0
    return {**BASE, "flow": ph * 2.0, "rise": 1.0 + 0.015 * reach - 0.14 * heave, "lean": -6.0 * reach + 15.0 * heave, "dx": 3.0 * heave,
            "head_rot": -12.0 * reach + 12.0 * heave, "head_dy": 1.5 * reach, "jaw": 0.3 + 0.7 * heave, "breath": 1.0 + 1.5 * heave, "heat": 1.2 + 0.2 * heave,
            "draw": 0.42 - 0.24 * heave, "hand_f": (fx, fup), "knee_n": -5.0 * drag + (5.0 * _clamp((ph - 0.8) / 0.2) if ph > 0.8 else 0.0),
            "knee_f": 4.0 * math.sin(math.pi * _clamp((ph - 0.55) / 0.45)), "rattle": 1.0, "ashfall": 2.2,
            "strike": 0.25 + 0.6 * _clamp((ph - 0.34) / 0.4) if 0.34 < ph < 0.74 else 0.0, "strike_x": 4.0, "strike_big": 0.3}


def k(**over: object) -> Pose:
    return {**BASE, **over}


# The cut. He tears the sword out of his heart, cocks it back over his shoulder — and hangs; then it comes down on
# the prey, and he drives it back in.
_OUT = dict(draw=1.0, heat=1.6, jaw=0.8, breath=2.0, lean=-3.0, rattle=1.0)
_COCKED = dict(draw=1.0, free=1.0, hand=(-21.0, 105.0), sw_ang=171.0, lean=-13.0, rise=1.0, dx=-3.0, head_rot=-24.0, head_dy=-5.0, jaw=1.0, breath=2.4, heat=1.5,
               hand_f=(22.0, 28.0), rattle=1.0, ashfall=1.8)
_CUT = dict(draw=1.0, free=1.0, hand=(8.0, 31.0), sw_ang=-30.0, lean=16.0, rise=0.88, dx=4.0, head_rot=14.0, head_dy=-1.0, jaw=0.9, breath=1.5, heat=1.4,
            hand_f=(30.0, 6.0), rattle=1.0, ashfall=2.4)
CUT_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(draw=0.34, heat=1.4, lean=4.0, rise=0.96, head_rot=6.0, jaw=0.6, breath=1.6), "io"),
    (0.24, k(**_OUT, tear=0.05), "out"),
    (0.34, k(**{**_OUT, "lean": -9.0, "rise": 1.01}, free=1.0, hand=(14.0, 106.0), sw_ang=184.0, head_rot=-14.0, hand_f=(26.0, 16.0), tear=0.6), "io"),
    (0.42, k(**_COCKED, tear=1.0), "out"),
    (0.50, k(**{**_COCKED, "hand": (-23.0, 106.0), "sw_ang": 168.0, "lean": -14.5, "head_rot": -27.0}, tear=1.0), "io"),
    (0.55, k(**_CUT, smear=1.0, strike=0.02, tear=1.0), "in3"),
    (0.70, k(**{**_CUT, "lean": 17.5, "rise": 0.86}, strike=0.98, tear=1.0), "lin"),
    (0.84, k(draw=1.0, heat=1.3, lean=4.0, rise=0.98, jaw=0.6, breath=1.5, sw_ang=198.0, rattle=0.6, strike=1.0, tear=1.0), "io"),
    (0.93, k(draw=0.5, heat=1.5, lean=2.0, jaw=0.7, breath=1.8, strike=1.0, tear=1.0), "in"),
    (1.00, k(strike=1.0, tear=1.0), "out"),
]

# Hit: he is driven back on his hips, the ash is knocked off him, his head is thrown back and the fire gutters.
HURT_KEYS = [
    (0.00, k(), "lin"),
    (0.07, k(dx=-1.5, lean=-5.0, rise=0.98, head_rot=10.0, jaw=0.7, heat=1.5, shed=0.05, rattle=1.0, flash=1.0), "out3"),
    (0.16, k(dx=-4.0, lean=-10.0, rise=0.96, head_rot=-18.0, head_dy=1.0, jaw=1.0, heat=0.6, breath=0.3, draw=0.5, hand_f=(24.0, 16.0), shed=0.25, rattle=1.0, ashfall=3.0, flash=0.5), "lin"),
    (0.26, k(dx=-6.0, lean=-13.0, rise=0.95, head_rot=-28.0, head_dy=2.0, jaw=1.0, heat=0.45, breath=0.2, draw=0.55, hand_f=(22.0, 20.0), shed=0.45, rattle=1.0, ashfall=3.0), "out"),
    (0.50, k(dx=-3.0, lean=5.0, rise=1.01, head_rot=10.0, jaw=0.6, heat=1.3, breath=1.6, draw=0.34, hand_f=(30.0, 6.0), shed=0.75, rattle=0.6, ashfall=2.0), "io"),
    (0.74, k(dx=-1.0, lean=2.0, head_rot=3.0, heat=1.15, shed=0.96), "io"),
    (1.00, k(shed=1.0), "io"),
]

# Death: the fire goes out. He rears with the last of it leaving him by the mouth; the glow drains from the cracks
# and the blades; he bows; and the ash lets go — a heap, with the swords standing in it.
_HEAP = dict(crumble=1.0, mound=1.0, fall=1.0, heat=0.0, arms=0.0, jaw=0.0, breath=0.0, draw=0.42, let_go=1.0,
             head_free=1.0, head_at=(17.0, 9.0), head_rot=52.0, lean=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.04, k(dx=-1.5, lean=-5.0, rise=0.98, head_rot=10.0, jaw=0.7, heat=1.5, shed=0.05, rattle=1.0, flash=1.0), "out3"),
    (0.11, k(dx=-3.0, lean=-11.0, rise=1.01, head_rot=-36.0, head_dy=-4.0, jaw=1.0, heat=1.7, breath=0.0, roar=0.5, draw=0.6, hand_f=(18.0, 44.0),
             shed=0.45, rattle=1.0, ashfall=2.5), "out"),
    (0.21, k(dx=-3.0, lean=-12.0, rise=1.02, head_rot=-40.0, head_dy=-4.0, jaw=1.0, heat=1.5, breath=0.0, roar=1.0, draw=0.6, hand_f=(16.0, 48.0),
             shed=0.96, rattle=1.0, ashfall=2.5), "io"),
    (0.29, k(dx=-2.0, lean=-8.0, rise=1.01, head_rot=-30.0, jaw=0.8, heat=0.8, breath=0.0, roar=0.35, draw=0.45, hand_f=(20.0, 34.0), shed=1.0, ashfall=2.0), "lin"),
    # The glow drains; the hand slips from the hilt; he bows.
    (0.38, k(lean=0.0, head_rot=-6.0, jaw=0.3, heat=0.4, breath=0.0, draw=0.3, hand_f=(26.0, 8.0), let_go=0.3, hand_n=(24.0, 34.0), shed=1.0, ashfall=2.0), "io"),
    (0.47, k(lean=9.0, rise=0.97, head_rot=26.0, head_dy=-2.0, jaw=0.1, heat=0.16, breath=0.0, hand_f=(30.0, 6.0), let_go=1.0, hand_n=(24.0, 8.0), shed=1.0, ashfall=3.0), "io"),
    # And the ash lets go.
    (0.56, k(lean=12.0, rise=0.94, crumble=0.14, mound=0.25, head_rot=34.0, head_dy=-4.0, jaw=0.0, heat=0.06, breath=0.0, let_go=1.0, hand_n=(24.0, 7.0),
             fall=0.05, ashfall=5.0, dust=0.15, shed=1.0), "in"),
    (0.64, k(**{**_HEAP, "crumble": 0.5, "mound": 0.6, "fall": 0.45, "arms": 1.0, "head_free": 0.5, "head_rot": 44.0, "lean": 10.0}, hand_n=(22.0, 6.0),
             ashfall=6.0, dust=0.45, shed=1.0), "lin"),
    (0.72, k(**{**_HEAP, "crumble": 0.85, "mound": 0.88, "fall": 0.85}, ember=0.5, ashfall=5.0, dust=0.7, shed=1.0), "out"),
    (0.80, k(**_HEAP, ember=0.5, ashfall=2.0, dust=0.9, shed=1.0), "out"),
    (0.90, k(**_HEAP, ember=0.38, ashfall=0.5, dust=1.0, smoke=0.6, shed=1.0), "lin"),
    (1.00, k(**_HEAP, ember=0.2, ashfall=0.0, dust=1.0, smoke=1.0, shed=1.0), "lin"),
]

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 16 for i in range(16)], [150] * 16, True),
    "run": Anim("run", haul_pose, [i / 12 for i in range(12)], [95] * 12, True),
    "attack": Anim("attack", keyed(CUT_KEYS), [0.0, 0.06, 0.12, 0.18, 0.24, 0.30, 0.36, 0.42, 0.50, 0.55, 0.59, 0.63, 0.67, 0.70, 0.77, 0.84, 0.92, 1.0],
                   # An enemy swings every 1250 ms and the game starts this clip its wind-up ahead of the swing: the whole
                   # of it (660 ms to the blow, 290 of impact, 290 to put the sword back) fits between two swings.
                   [60, 60, 70, 60, 60, 70, 70, 80, 130, 40, 50, 60, 60, 80, 80, 70, 70, 70], False),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.02, 0.04, 0.075, 0.11, 0.16, 0.21, 0.25, 0.29, 0.335, 0.38, 0.425, 0.47, 0.515, 0.56, 0.60, 0.64, 0.68,
                                                 0.72, 0.76, 0.80, 0.85, 0.90, 1.0],
                  [70, 50, 80, 90, 120, 120, 120, 90, 100, 100, 110, 110, 110, 100, 90, 90, 90, 100, 110, 120, 130, 160, 240, 1500], False),
}
