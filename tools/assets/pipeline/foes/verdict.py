"""The Verdict — world 9, WORLD boss. The law of the citadel, still sitting in judgement in the armour of its last king.

The king is long gone; the throne above the clouds has been empty for an age. His armour was never taken down:
storm-dark plate as tall as the strip, standing on the bridge, and there is NOTHING in it. Where the head should be
the gorget stands open and a knot of thunderhead boils up out of the hollow, a crown of gold riding on top of the
cloud — the storm itself, crowned. The seams of the plate leak the same cold light.

It does what the king did: it weighs whoever comes. In its far hand it holds up a great pair of SCALES; in one pan
burns the law, a small cold flame, and the other hangs empty over the head of whoever stands before it — and sinks,
slowly, as if they were already in it. On its near shoulder rests the sword of the sentence, a headsman's sword
with a square tip and no point (it was never made for fighting).

It comes on in a heavy march, every footfall a crack of lightning into the stones. Attack — the sentence: the empty
pan drops, the sword comes off the shoulder and up to the very top of the strip, the storm pours into the blade and
it hangs there white; then it falls, the square tip on the stones in front of the condemned and the thunder with it.
Hit: the plates jolt apart and the light shows between them, the crown is thrown, the scales swing wild. Death — the
case is closed: the storm in the collar gutters and goes out, and with nothing left to hold it the armour simply
comes down: the crown drops, the sword slides off the shoulder, the scales fall and their pans lie level at last,
the cuirass tips forward onto the stones with its empty collar open, and the cloak settles over the heap.

Own rig (nothing of the humanoid skeleton). Frame 248 wide with 59 extra rows above, root at 104; the body stands
behind the root and, below the Knight's height, nothing passes the toe of the forward boot (20 px). The scales hang
out over the Knight's head. The square tip lands 56 px ahead. Nothing is a rotated sprite: every plate, the crown,
the sword and the scales are shapes drawn at whatever angle they are. Drawn facing right; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Character, Pose, Pt, ik, keyed, lerp, swing_smear

FIGURE = ("Verdict", "boss", "w09")

ROOT_X = 104
BUILD = Build(root_x=ROOT_X, thigh=1.0, shin=1.0, foot=0.0, hip_dx=0.0, spine=0.0, sh_near=0.0, sh_far=0.0, upper=1.0, fore=1.0, neck=0.0)

#: The skeleton, in root space (u ahead of the root, v up from the stones) or in the torso's own frame (a ahead, b up
#: from the pelvis).
PEL = (-16.0, 46.0)
THIGH, SHIN = 20.5, 21.5
SH_N, SH_F = (-17.0, 32.0), (17.0, 33.0)
UP_N, FORE_N = 24.0, 22.0
UP_F, FORE_F = 18.0, 20.0
COLLAR = (0.0, 38.0)
BLADE = 66.0
BEAM = 19.0

STEEL = "ink"
GOLD = "brass"
VOID = ("ink", 0)
LIT = (0.55, -0.83)


def _hash(x: int, y: int) -> int:
    return ((x * 73856093) ^ (y * 19349663)) & 0x7FFFFFFF


def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def P(u: float, v: float) -> Pt:
    return (ROOT_X + u, GROUND - v)


def _mix(a: Pt, b: Pt, t: float) -> Pt:
    return (lerp(a[0], b[0], t), lerp(a[1], b[1], t))


class Fr:
    """A frame of reference: `a` runs ahead along its own x, `b` up along its own y; turned `deg` clockwise."""

    __slots__ = ("o", "deg", "c", "s")

    def __init__(self, o: Pt, deg: float):
        self.o, self.deg = o, deg
        r = math.radians(deg)
        self.c, self.s = math.cos(r), math.sin(r)

    def at(self, a: float, b: float) -> Pt:
        return (self.o[0] + a * self.c + b * self.s, self.o[1] + a * self.s - b * self.c)

    def loc(self, x: float, y: float) -> Pt:
        dx, dy = x - self.o[0], y - self.o[1]
        return (dx * self.c + dy * self.s, -(-dx * self.s + dy * self.c))

    def pts(self, seq) -> list[Pt]:
        return [self.at(a, b) for a, b in seq]


def _smooth(pts: list[Pt], sub: int = 4) -> list[Pt]:
    """A Catmull-Rom curve through the points."""
    out: list[Pt] = []
    n = len(pts)
    for i in range(n - 1):
        p0, p1, p2, p3 = pts[max(0, i - 1)], pts[i], pts[i + 1], pts[min(n - 1, i + 2)]
        for s in range(sub):
            t = s / sub
            t2, t3 = t * t, t * t * t
            out.append(tuple(0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3)
                             for a, b, c, d in zip(p0, p1, p2, p3)))  # type: ignore[arg-type]
    out.append(pts[-1])
    return out


def plate(cel: Cel, pts: list[Pt], c: Pt, r: float, ramp: str = STEEL, tones: tuple[int, int, int, int, int] = (1, 2, 3, 4, 6), shade: int = 0) -> set[tuple[int, int]]:
    """A form of plate: lit from the upper right round the point `c`, in shadow away from it."""
    mask = cel.poly_mask(pts)
    for x, y in mask:
        s = ((x + 0.5 - c[0]) * LIT[0] + (y + 0.5 - c[1]) * LIT[1]) / r
        i = tones[4] if s > 0.5 else tones[3] if s > 0.12 else tones[2] if s > -0.25 else tones[1] if s > -0.62 else tones[0]
        cel.put(x, y, (ramp, max(0, i - shade)))
    return set(mask)


def disc(cel: Cel, c: Pt, r: float, ramp: str = STEEL, tones: tuple[int, int, int] = (2, 4, 6)) -> None:
    for y in range(int(math.floor(c[1] - r)), int(math.ceil(c[1] + r)) + 1):
        for x in range(int(math.floor(c[0] - r)), int(math.ceil(c[0] + r)) + 1):
            dx, dy = x + 0.5 - c[0], y + 0.5 - c[1]
            if dx * dx + dy * dy <= r * r:
                s = (dx * LIT[0] + dy * LIT[1]) / max(1.0, r)
                cel.put(x, y, (ramp, tones[2] if s > 0.35 else tones[0] if s < -0.3 else tones[1]))


def dotted(cel: Cel, a: Pt, b: Pt, on: tuple[str, int], off: tuple[str, int]) -> None:
    """A chain: links seen as alternate light and dark pixels."""
    n = int(max(abs(b[0] - a[0]), abs(b[1] - a[1]))) + 1
    for i in range(n + 1):
        t = i / max(1, n)
        cel.put(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, on if i % 2 == 0 else off)


def bolt(cel: Cel, a: Pt, b: Pt, seed: int, jit: float = 3.0, over: bool = True, core: tuple[str, int] = ("light", 0), halo: tuple[str, int] = ("azure", 7)) -> None:
    """A thread of lightning from a to b. `over` draws it on the figure; otherwise only where nothing is."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy)
    if L < 2.0:
        return
    nx, ny = -dy / L, dx / L
    n = max(2, int(L / 5.0))
    pts = [a]
    for i in range(1, n):
        t = i / n
        off = ((_hash(seed * 31 + i, 7) % 200) / 100.0 - 1.0) * jit * (0.4 + 0.6 * math.sin(math.pi * t))
        pts.append((a[0] + dx * t + nx * off, a[1] + dy * t + ny * off))
    pts.append(b)
    line = Cel(cel.w, cel.h, cel.top)
    for p, q in zip(pts, pts[1:]):
        line.line(p, q, core)
    body = set(cel.px)
    for (x, y) in line.px:
        if y >= GROUND:
            continue
        if over or (x, y) not in body:
            cel.px[(x, y)] = core
        for n_ in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if n_ not in line.px and n_ not in body and n_[1] < GROUND and 0 <= n_[0] < cel.w and n_[1] >= -cel.top:
                cel.px[n_] = halo


def laid(cel: Cel, part: Cel) -> None:
    """A piece drawn on its own and laid over the rest with its own dark edge: plate over plate stays readable."""
    part.outline()
    for xy, t in part.px.items():
        if xy[1] < GROUND:
            cel.px[xy] = t


class Verdict(Character):
    build = BUILD
    W = 248
    TOP = 59

    # ------------------------------------------------------------------------------------------------- skeleton
    def joints(self, pose: Pose) -> dict:
        J: dict = {}
        pu, pv = pose["dx"] + PEL[0], PEL[1] - pose["drop"]
        J["pel_uv"] = (pu, pv)
        J["pel"] = P(pu, pv)
        J["pelvis"] = J["pel"]
        T = Fr(P(pu, pv + 3.0 * pose["gap"]), pose["lean"])
        J["T"] = T
        for side, hu, key in (("N", -7.0, "bn"), ("F", 7.0, "bf")):
            hip = P(pu + hu, pv - 2.0)
            bu, lift = pose[key]
            knee, ank = ik(hip, P(bu, 7.0 + lift), THIGH, SHIN, -1)
            J["hip" + side], J["knee" + side], J["ank" + side] = hip, knee, ank
        J["shN"], J["shF"] = T.at(*SH_N), T.at(*SH_F)
        J["elN"], J["haN"] = ik(J["shN"], P(*pose["hn"]), UP_N, FORE_N, 1 if pose["n_bend"] >= 0 else -1)
        J["elF"], J["haF"] = ik(J["shF"], P(*pose["hf"]), UP_F, FORE_F, 1 if pose["f_bend"] >= 0 else -1)
        # The sword lies in the near hand until it is let go; the scales hang from the far one.
        J["hilt"] = _mix(J["haN"], P(*pose["sw_at"]), pose["sw_free"])
        S = Fr(J["hilt"], pose["sw"])
        J["S"] = S
        J["tip"] = S.at(BLADE + 3.0, 0.0)
        J["hang"] = _mix(J["haF"], P(*pose["sc_at"]), pose["sc_free"])
        J["collar"] = T.at(*COLLAR)
        cda, cdb = pose["crown"]
        held = (J["collar"][0] + cda, max(GROUND - 112.5, J["collar"][1] - 26.0 * _clamp(pose["storm"], 0.0, 1.25) - cdb))  # never out of the top of the strip
        J["crown"] = _mix(held, P(*pose["crown_at"]), pose["crown_free"])
        return J

    # ------------------------------------------------------------------------------------------------- cloth
    def cloak(self, cel: Cel, J: dict, pose: Pose) -> None:
        """The king's cloak: storm-blue, heavy, from the back of the collar to the stones, a fringe of gold on its hem."""
        T = J["T"]
        pu, pv = J["pel_uv"]
        s1, s2, s3 = pose["cl"]
        rest = [T.at(-10.0, 43.0), T.at(-24.0, 37.0), P(pu - 38.0 - s1, pv + 17.0), P(pu - 50.0 - s2, pv - 12.0), P(pu - 55.0 - s3, 6.0),
                P(pu - 34.0 - 0.5 * s3, 2.0), P(pu - 8.0, 3.0), T.at(-12.0, 6.0)]
        w = pose["cloak_free"]
        pts = [_mix(r, P(*a), w) for r, a in zip(rest, CLOAK_DOWN)]
        outline = _smooth(pts[:6], 4) + pts[6:]
        mask = [p for p in cel.poly_mask(outline) if p[1] < GROUND]
        if not mask:
            return
        rows: dict[int, int] = {}
        cols: dict[int, int] = {}
        top = min(y for _, y in mask)
        for x, y in mask:
            rows[y] = min(rows.get(y, x), x)
            cols[x] = max(cols.get(x, y), y)
        flut = pose["flut"]
        for x, y in mask:
            f = x - rows[y] + int(round(2.5 * math.sin(y * 0.17 + flut * math.tau)))
            m = f % 11
            t = 0 if m == 0 else 2 if m in (4, 5, 6) else 1
            if y - top < 7 and m != 0:  # the shoulders of it catch the light
                t = min(3, t + 1)
            if x - rows[y] < 1:
                t = 0
            cel.put(x, y, ("azure", t))
        for x, y in cols.items():  # the fringe
            if y >= GROUND - 9:
                cel.put(x, y, (GOLD, 5 if x % 2 else 3))
                if x % 3 == 0 and (x, y - 1) in cel.px:
                    cel.put(x, y - 1, (GOLD, 4))

    def skirt(self, cel: Cel, J: dict, pose: Pose) -> None:
        """The fauld: four lames of plate from the belt to the knee."""
        Sk = Fr((J["pel"][0], J["pel"][1] + 1.0 * pose["gap"]), pose["lean"] * 0.35 + pose["skirt_sw"])
        shape = [(-17, 3), (13, 3), (17, -7), (20, -17), (22, -25), (-27, -24), (-24, -10)]
        mask = plate(cel, Sk.pts(shape), Sk.at(6.0, -10.0), 26.0, tones=(1, 1, 2, 3, 4))
        for b in (-8.0, -16.0):  # the edge of each lame: a line of shadow, a line of light under it
            xl, xr = -24.0 - (-b - 9.0) * 0.25, 18.0 + (-b - 8.0) * 0.25
            tmp = Cel(cel.w, cel.h, cel.top)
            tmp.line(Sk.at(xl, b), Sk.at(xr, b), (STEEL, 0))
            for (x, y) in tmp.px:
                if (x, y) in mask:
                    cel.put(x, y, (STEEL, 0))
                    if (x, y + 1) in mask and Sk.loc(x, y)[0] > -4.0:
                        cel.put(x, y + 1, (STEEL, 5))
        tmp = Cel(cel.w, cel.h, cel.top)
        tmp.line(Sk.at(22.0, -25.0), Sk.at(-27.0, -24.0), (GOLD, 5))
        tmp.line(Sk.at(22.0, -24.0), Sk.at(-27.0, -23.0), (GOLD, 3))
        for xy, t in tmp.px.items():
            if xy in mask:
                cel.px[xy] = t

    def tabard(self, cel: Cel, J: dict, pose: Pose) -> None:
        """The stole of the judge, hanging from the belt: pale, bordered in gold, the scales worked on it."""
        Tb = Fr((J["pel"][0], J["pel"][1] + 1.0 * pose["gap"]), pose["lean"] * 0.2 + pose["tab_sw"])
        shape = [(3, 3), (12, 3), (15, -18), (16.5, -34), (10.5, -41), (4.5, -34), (3, -18)]
        mask = set(cel.poly_mask(Tb.pts(shape)))
        for x, y in mask:
            a, b = Tb.loc(x + 0.5, y + 0.5)
            mid = 7.5 + (-b) * 0.07
            t = 7 if a > mid + 1.5 else 6 if a > mid - 2.5 else 5
            if int(-b) % 9 == 8 and a < mid + 3:
                t -= 1  # it hangs in soft folds
            cel.put(x, y, ("bone", t))
        tmp = Cel(cel.w, cel.h, cel.top)
        for (a0, b0), (a1, b1) in (((3, 3), (3, -18)), ((3, -18), (4.5, -34)), ((4.5, -34), (10.5, -41)), ((10.5, -41), (16.5, -34)), ((16.5, -34), (15, -18)), ((15, -18), (12, 3))):
            tmp.line(Tb.at(a0 + (0.6 if a0 < 8 else -0.6), b0), Tb.at(a1 + (0.6 if a1 < 8 else -0.6), b1), (GOLD, 4))
        # The emblem: a balance.
        for (a0, b0), (a1, b1) in (((6.0, -20.0), (13.0, -20.0)), ((9.5, -20.0), (9.5, -27.0)), ((8.0, -28.0), (11.0, -28.0))):
            tmp.line(Tb.at(a0, b0), Tb.at(a1, b1), (GOLD, 3))
        for a, b in ((6.0, -23.0), (13.0, -23.0)):
            tmp.put(*Tb.at(a, b), (GOLD, 3))
        for xy, t in tmp.px.items():
            if xy in mask:
                cel.px[xy] = t

    # ------------------------------------------------------------------------------------------------- plate
    def leg(self, cel: Cel, J: dict, side: str, pose: Pose) -> None:
        far = side == "F"
        hip, knee, ank = J["hip" + side], J["knee" + side], J["ank" + side]
        idx = (1, 2, 4) if far else (2, 3, 5)
        part = Cel(cel.w, cel.h, cel.top)
        part.limb(hip, knee, 12.0, 10.5, STEEL, idx)
        part.limb(knee, ank, 10.5, 8.5, STEEL, idx)
        # The greave's edge of gold above the ankle, and the sabaton.
        B = Fr(ank, pose["boot_" + side.lower()])
        shape = [(-5.5, -7), (-6.5, 1), (-3, 4), (4.5, 3), (9, -1.5), (14, -4.5), (14, -7)]
        plate(part, B.pts(shape), B.at(3.0, 0.0), 10.0, tones=(1, 2, 3, 4, 6), shade=1 if far else 0)
        tmp = Cel(cel.w, cel.h, cel.top)
        tmp.line(B.at(-5.5, 3.0), B.at(4.0, 3.0), (GOLD, 4 if far else 5))
        tmp.line(B.at(4.0, -1.0), B.at(8.0, -4.5), (STEEL, 0))
        part.px.update(tmp.px)
        disc(part, knee, 5.2, STEEL, (2, 3, 5) if far else (3, 4, 6))
        part.put(knee[0], knee[1], (GOLD, 5))
        part.put(knee[0] + 1, knee[1], (GOLD, 4))
        laid(cel, part)

    def cuirass(self, cel: Cel, J: dict, pose: Pose) -> None:
        """The breast and back of it: one great barrel of storm-dark plate, keeled down the front."""
        T = J["T"]
        shape = [(-16, 3), (-23, 13), (-25, 25), (-21, 35), (-12, 39), (12, 39), (18, 34), (23, 24), (22, 14), (16, 6), (12, 3)]
        mask = plate(cel, T.pts(shape), T.at(8.0, 30.0), 26.0, tones=(1, 2, 3, 4, 5))
        tmp = Cel(cel.w, cel.h, cel.top)
        for (a0, b0), (a1, b1), t in (((12.0, 37.0), (17.0, 23.0), (STEEL, 6)), ((17.0, 23.0), (13.0, 5.0), (STEEL, 5)),  # the keel
                                      ((11.0, 37.0), (16.0, 23.0), (STEEL, 1)), ((16.0, 23.0), (12.0, 5.0), (STEEL, 1)),
                                      ((-16.0, 4.0), (12.0, 4.0), (GOLD, 5)), ((-16.0, 5.0), (12.0, 5.0), (GOLD, 3)),  # the belt
                                      ((-23.0, 15.0), (-14.0, 13.0), (STEEL, 1)), ((-14.0, 13.0), (8.0, 14.0), (STEEL, 1)),  # the plackart's edge
                                      ((-14.0, 12.0), (8.0, 13.0), (STEEL, 5))):
            tmp.line(T.at(a0, b0), T.at(a1, b1), t)
        for xy, t in tmp.px.items():
            if xy in mask:
                cel.px[xy] = t
        for a, b in ((-18.0, 9.0), (-8.0, 9.0), (2.0, 9.0), (-20.0, 20.0), (-20.0, 30.0)):  # rivets
            p = T.at(a, b)
            if (int(math.floor(p[0])), int(math.floor(p[1]))) in mask:
                cel.put(p[0], p[1], (GOLD, 4))
        # What holds it up shows where the plates meet: a seam of cold light at the waist.
        glow = pose["light"]
        if glow > 0.05:
            kk = int(pose["boil"] * 16)
            for i in range(-15, 12):
                p = T.at(float(i), 2.0 - 1.5 * pose["gap"])
                hot = glow >= 1.0 and (i + kk) % 5 < 2
                cel.put(p[0], p[1], ("light", 0) if hot else ("azure", 7 if glow >= 0.6 else 5))
                if pose["gap"] > 0.5:
                    q = T.at(float(i), 0.6 - 1.5 * pose["gap"])
                    cel.put(q[0], q[1], ("azure", 8) if (i + kk) % 3 else ("light", 0))

    def pauldron(self, cel: Cel, J: dict, side: str, pose: Pose) -> None:
        """A shoulder of three lames, each lapping the one below, the lowest edged in gold."""
        far = side == "F"
        da, db, rot = pose["p" + side.lower()]
        sh = J["sh" + side]
        k_ = 0.72 if far else 1.0
        Pf = Fr((sh[0] + da, sh[1] - db), J["T"].deg + rot)
        part = Cel(cel.w, cel.h, cel.top)
        lames = ([(-14, -7), (-15.5, 0), (-13, 5), (-6, 8), (4, 8), (10, 4), (12, -2), (9, -8), (0, -10.5), (-8, -10)],
                 [(-12, -1), (-12.5, 5), (-8, 10), (0, 12), (7, 10), (10.5, 5), (10, -1), (0, -3.5)],
                 [(-9, 5), (-8, 10.5), (-3, 14), (4, 13.5), (8, 9.5), (8, 5), (0, 3)])
        for n, shape in enumerate(lames):
            pts = Pf.pts([(a * k_, b * k_) for a, b in shape])
            lame = Cel(cel.w, cel.h, cel.top)
            plate(lame, pts, Pf.at(2.0 * k_, (2.0 + 4.0 * n) * k_), 11.0 * k_, tones=(2, 3, 4, 5, 7), shade=1 if far else 0)
            if n == 0:  # the gold on its lower edge
                tmp = Cel(cel.w, cel.h, cel.top)
                for (a0, b0), (a1, b1) in (((-14, -7), (-8, -10)), ((-8, -10), (0, -10.5)), ((0, -10.5), (9, -8)), ((9, -8), (12, -2))):
                    tmp.line(Pf.at(a0 * k_, b0 * k_), Pf.at(a1 * k_, b1 * k_), (GOLD, 4 if far else 5))
                for xy, t in tmp.px.items():
                    if xy in lame.px:
                        lame.px[xy] = t
            lame.outline()
            part.px.update(lame.px)
        for xy, t in part.px.items():
            if xy[1] < GROUND:
                cel.px[xy] = t

    def arm(self, cel: Cel, J: dict, side: str, pose: Pose) -> None:
        far = side == "F"
        sh, el, ha = J["sh" + side], J["el" + side], J["ha" + side]
        idx = (1, 2, 4) if far else (3, 4, 6)
        part = Cel(cel.w, cel.h, cel.top)
        part.limb(sh, el, 10.0, 9.0, STEEL, idx)
        part.limb(el, ha, 9.0, 8.0, STEEL, idx)
        L = math.hypot(ha[0] - el[0], ha[1] - el[1]) or 1.0
        d = ((ha[0] - el[0]) / L, (ha[1] - el[1]) / L)
        n = (-d[1], d[0])
        cuff = [(ha[0] - d[0] * 8.0 + n[0] * 6.4, ha[1] - d[1] * 8.0 + n[1] * 6.4), (ha[0] - d[0] * 1.0 + n[0] * 4.6, ha[1] - d[1] * 1.0 + n[1] * 4.6),
                (ha[0] - d[0] * 1.0 - n[0] * 4.6, ha[1] - d[1] * 1.0 - n[1] * 4.6), (ha[0] - d[0] * 8.0 - n[0] * 6.4, ha[1] - d[1] * 8.0 - n[1] * 6.4)]
        plate(part, cuff, (ha[0] - d[0] * 4.0, ha[1] - d[1] * 4.0), 7.0, tones=(2, 3, 4, 5, 7), shade=1 if far else 0)
        tmp = Cel(cel.w, cel.h, cel.top)
        tmp.line(cuff[0], cuff[3], (GOLD, 4 if far else 5))
        part.px.update(tmp.px)
        if pose["light"] > 0.3:  # nothing in the sleeve but the light: it shows at the cuff
            for s_ in (-3.0, -1.0, 1.0, 3.0):
                part.put(ha[0] - d[0] * 9.0 + n[0] * s_, ha[1] - d[1] * 9.0 + n[1] * s_, ("azure", 7) if int(s_ + pose["boil"] * 16) % 2 else ("light", 0))
        disc(part, el, 5.0, STEEL, (2, 3, 5) if far else (4, 5, 7))
        part.put(el[0], el[1], (GOLD, 5))
        disc(part, ha, 4.2, STEEL, (2, 3, 5) if far else (3, 5, 7))
        laid(cel, part)

    def fist(self, cel: Cel, J: dict, side: str) -> None:
        disc(cel, J["ha" + side], 4.2, STEEL, (2, 3, 5) if side == "F" else (3, 4, 6))

    # ------------------------------------------------------------------------------------------------- the empty collar
    def collar_back(self, cel: Cel, J: dict) -> None:
        T = J["T"]
        mask = plate(cel, T.pts([(-13, 36), (-17, 46), (-10, 51.5), (9, 50.5), (17, 45), (13, 36)]), T.at(0.0, 64.0), 16.0, tones=(0, 0, 1, 1, 2))
        tmp = Cel(cel.w, cel.h, cel.top)
        for (a0, b0), (a1, b1) in (((-17.0, 46.0), (-10.0, 51.5)), ((-10.0, 51.5), (9.0, 50.5)), ((9.0, 50.5), (17.0, 45.0))):
            tmp.line(T.at(a0, b0), T.at(a1, b1), (GOLD, 4))
        for xy, t in tmp.px.items():
            if xy in mask:
                cel.px[xy] = t

    def collar_front(self, cel: Cel, J: dict, pose: Pose) -> None:
        T = J["T"]
        mask = plate(cel, T.pts([(-14, 35), (-17, 44), (-6, 40.5), (6, 40.5), (17, 45), (14, 35)]), T.at(3.0, 40.0), 13.0, tones=(2, 3, 4, 5, 6))
        tmp = Cel(cel.w, cel.h, cel.top)
        for (a0, b0), (a1, b1) in (((-17.0, 44.0), (-6.0, 40.5)), ((-6.0, 40.5), (6.0, 40.5)), ((6.0, 40.5), (17.0, 45.0))):
            tmp.line(T.at(a0, b0), T.at(a1, b1), (GOLD, 6))
        tmp.line(T.at(-14.0, 36.0), T.at(14.0, 36.0), (GOLD, 4))
        for xy, t in tmp.px.items():
            if xy in mask:
                cel.px[xy] = t

    def storm(self, cel: Cel, J: dict, pose: Pose) -> None:
        """What is in the armour: a knot of thunderhead standing out of the open collar, lit from inside."""
        k = pose["storm"]
        if k < 0.08:
            return
        c = J["collar"]
        ph = pose["boil"]
        # A stem of cloud out of the collar, and the head of it standing over the shoulders.
        puffs = [(0.0, 3.0, 3.6), (0.5, 7.5, 4.4), (-7.0, 11.5, 5.6), (7.0, 12.5, 6.0), (0.0, 13.5, 6.4), (-12.0, 15.5, 4.4), (12.5, 16.5, 4.6), (-6.0, 19.0, 5.6),
                 (6.5, 20.0, 5.4), (0.0, 22.0, 5.4), (-11.0, 21.0, 3.6), (11.5, 22.0, 3.4)]
        drawn: list[tuple[float, float, float]] = []
        grow = 0.35 + 0.65 * min(1.0, k)
        for i, (da, db, r) in enumerate(puffs):
            rr = r * grow * (1.0 + 0.1 * math.sin(math.tau * (ph + i * 0.23))) * (1.0 + 0.3 * max(0.0, k - 1.0))
            x = c[0] + da * min(1.2, 0.5 + 0.5 * k) + 1.0 * math.sin(math.tau * (ph + i * 0.37)) * (db / 14.0) + pose["storm_dx"] * db / 18.0
            y = c[1] - db * min(1.25, k)
            if rr < 1.2:
                continue
            drawn.append((x, y, rr))
            stem = i < 2
            for py in range(int(math.floor(y - rr)), int(math.ceil(y + rr)) + 1):
                for px in range(int(math.floor(x - rr)), int(math.ceil(x + rr)) + 1):
                    dx, dy = px + 0.5 - x, py + 0.5 - y
                    if dx * dx + dy * dy <= rr * rr:
                        s_ = (dx * LIT[0] + dy * LIT[1]) / rr
                        if stem:
                            tone = (STEEL, 6 if s_ > 0.45 else 5 if s_ > -0.1 else 4)
                        else:
                            tone = (STEEL, 9) if s_ > 0.6 else (STEEL, 8) if s_ > 0.25 else (STEEL, 7) if s_ > -0.1 else (STEEL, 5) if s_ > -0.5 else (STEEL, 4)
                        cel.put(px, py, tone)
        if pose["light"] > 0.3:  # the collar is lit from inside, at the foot of the cloud
            kk = int(ph * 16)
            for i in range(-4, 5):
                q = J["T"].at(float(i), COLLAR[1] + 3.0 + (1.0 if abs(i) > 2 else 0.0))
                cel.put(q[0], q[1], ("light", 0) if (i + kk) % 3 == 0 else ("azure", 7))
        # The light in it.
        f = pose["flick"]
        if f > 0.08 and len(drawn) >= 8:
            seed = int(ph * 16) + 3
            a, b = drawn[1], drawn[7 + (seed % 3)]
            line = Cel(cel.w, cel.h, cel.top)
            mid = ((a[0] + b[0]) / 2 + ((_hash(seed, 1) % 7) - 3), (a[1] + b[1]) / 2)
            line.line((a[0], a[1]), mid, ("light", 0))
            line.line(mid, (b[0], b[1] + 1), ("light", 0))
            for (x, y) in line.px:
                if (x, y) in cel.px:
                    cel.px[(x, y)] = ("light", 0) if f >= 0.6 else ("azure", 7)
                    for n_ in ((x + 1, y), (x - 1, y)):
                        if n_ in cel.px and n_ not in line.px and f >= 1.0:
                            cel.px[n_] = ("azure", 7)

    def crown(self, cel: Cel, J: dict, pose: Pose) -> None:
        """The crown: a band of gold with five points, riding on the cloud."""
        K = Fr(J["crown"], pose["crown_rot"])
        mask = plate(cel, K.pts([(-8.5, -2), (8.5, -2), (8.5, 1.5), (-8.5, 1.5)]), K.at(2.0, 0.0), 8.0, ramp=GOLD, tones=(3, 4, 5, 6, 7))
        for a, h in ((-7.0, 3.6), (-3.5, 4.8), (0.0, 6.0), (3.5, 4.8), (7.0, 3.6)):
            for xy in cel.poly_mask(K.pts([(a - 1.9, 1.5), (a, 1.5 + h), (a + 1.9, 1.5)])):
                cel.put(xy[0], xy[1], (GOLD, 6 if K.loc(xy[0] + 0.5, xy[1] + 0.5)[0] > a else 4))
            tipp = K.at(a, 1.5 + h)
            cel.put(tipp[0], tipp[1], ("light", 0) if a == 0.0 else (GOLD, 7))
        for a in (-5.0, 0.0, 5.0):  # the stones in it
            p = K.at(a, -0.3)
            if (int(math.floor(p[0])), int(math.floor(p[1]))) in mask:
                cel.put(p[0], p[1], ("azure", 7) if a else ("light", 0))
        p0, p1 = K.at(-8.5, -2.0), K.at(8.5, -2.0)
        tmp = Cel(cel.w, cel.h, cel.top)
        tmp.line(p0, p1, (GOLD, 2))
        for xy, t in tmp.px.items():
            if xy in mask:
                cel.px[xy] = t

    # ------------------------------------------------------------------------------------------------- what it holds
    def sword(self, cel: Cel, J: dict, pose: Pose) -> None:
        """The sword of the sentence: a headsman's sword, broad, square at the tip. Charged, it is a bar of white."""
        S = J["S"]
        ch = pose["charge"]
        nrm = (S.at(0.0, 1.0)[0] - S.o[0], S.at(0.0, 1.0)[1] - S.o[1])
        up_lit = (nrm[0] * LIT[0] + nrm[1] * LIT[1]) > 0
        cel.limb(S.at(-10.0, 0.0), S.at(1.0, 0.0), 3.4, 3.4, "leather", (1, 2, 4))
        for x, y in cel.poly_mask(S.pts([(3, 4.6), (BLADE, 4.2), (BLADE + 3, 2.4), (BLADE + 3, -2.4), (BLADE, -4.2), (3, -4.6)])):
            a, b = S.loc(x + 0.5, y + 0.5)
            lit = (b > 0) == up_lit
            edge = abs(b) > 3.3
            if abs(b) < 0.9 and 7.0 < a < BLADE - 16.0:
                t = (STEEL, 4)  # the fuller
            elif lit:
                t = ("light", 0) if edge else (STEEL, 8)
            else:
                t = (STEEL, 5) if edge else (STEEL, 6)
            if ch > 0.2:
                hot = ch >= 1.0 or a > (BLADE + 3.0) * (1.0 - ch)  # the light leaves it by the tip
                if hot:
                    t = ("light", 0) if (lit or ch >= 1.3) else ("azure", 8) if not edge else ("azure", 7)
                    if abs(b) < 0.9 and 7.0 < a < BLADE - 16.0 and ch < 1.3:
                        t = ("azure", 6)
            cel.put(x, y, t)
        plate(cel, S.pts([(0, -9.5), (3.2, -9.5), (3.2, 9.5), (0, 9.5)]), S.at(1.5, 0.0), 8.0, ramp=GOLD, tones=(3, 4, 5, 6, 6))
        disc(cel, S.at(1.6, 10.0), 2.0, GOLD, (3, 5, 6))
        disc(cel, S.at(1.6, -10.0), 2.0, GOLD, (3, 5, 6))
        disc(cel, S.at(-11.5, 0.0), 2.8, GOLD, (3, 5, 6))

    def scales(self, cel: Cel, J: dict, pose: Pose) -> None:
        """The scales: a beam of gold on a stem from the hand, a pan on three chains at either end. In the pan at the
        back burns the law; the other one is for whoever stands under it."""
        hang = J["hang"]
        flat = pose["sc_len"]
        bc = (hang[0], hang[1] + 7.0 * flat)
        B = Fr(bc, pose["tilt"])
        tmp = Cel(cel.w, cel.h, cel.top)
        tmp.line(hang, bc, (GOLD, 4))
        for sgn in (-1.0, 1.0):
            e = B.at(BEAM * sgn, -1.0)
            L = 15.0 * flat
            sway = pose["pan"] * (1.0 if sgn > 0 else 0.6)
            pc = (e[0] + sway, min(e[1] + L, GROUND - 4.0))
            for off in (-6.0, 0.0, 6.0):
                dotted(tmp, e, (pc[0] + off, pc[1]), (GOLD, 4), (GOLD, 2))
            plate(tmp, [(pc[0] - 7.5, pc[1]), (pc[0] + 7.5, pc[1]), (pc[0] + 5.0, pc[1] + 3.6), (pc[0] - 5.0, pc[1] + 3.6)], (pc[0] + 2.0, pc[1] + 1.0), 6.0, ramp=GOLD, tones=(2, 3, 4, 5, 6))
            tmp.line((pc[0] - 7.5, pc[1]), (pc[0] + 7.5, pc[1]), (GOLD, 6))
            tmp.put(pc[0] + 4.0, pc[1], ("light", 0))
            if sgn < 0 and pose["law"] > 0.1:  # the law
                big = pose["law"] >= 1.0
                fl = int(pose["boil"] * 16) % 2
                for dx, dy, t in ((0, -1, ("light", 0)), (0, -2, ("light", 0)), (0, -3 - fl, ("azure", 8)), (-1, -1, ("azure", 7)), (1, -1, ("azure", 7)), (-1, -2, ("azure", 6)), (1, -2, ("azure", 6))):
                    tmp.put(pc[0] + dx, pc[1] + dy, t)
                if big:
                    for dx, dy, t in ((0, -4 - fl, ("azure", 7)), (-2, -1, ("azure", 6)), (2, -1, ("azure", 6)), (0, -3, ("light", 0))):
                        tmp.put(pc[0] + dx, pc[1] + dy, t)
        tmp.line(B.at(-BEAM, 0.7), B.at(BEAM, 0.7), (GOLD, 6))
        tmp.line(B.at(-BEAM, -0.4), B.at(BEAM, -0.4), (GOLD, 3))
        disc(tmp, B.at(0.0, 0.5), 2.6, GOLD, (3, 5, 7))
        disc(tmp, B.at(-BEAM, 0.0), 1.7, GOLD, (3, 5, 6))
        disc(tmp, B.at(BEAM, 0.0), 1.7, GOLD, (3, 5, 6))
        for xy in [xy for xy in tmp.px if xy[1] >= GROUND]:
            del tmp.px[xy]
        cel.px.update(tmp.px)

    # ------------------------------------------------------------------------------------------------- drawing
    def draw(self, cel, J, pose, ropes, between) -> None:
        heap = pose["heap"] >= 0.5
        if not heap:
            self.cloak(cel, J, pose)
        self.arm(cel, J, "F", pose)
        self.pauldron(cel, J, "F", pose)
        self.leg(cel, J, "F", pose)
        self.leg(cel, J, "N", pose)
        self.skirt(cel, J, pose)
        self.tabard(cel, J, pose)
        self.cuirass(cel, J, pose)
        self.collar_back(cel, J)
        self.storm(cel, J, pose)
        if pose["crown_free"] < 0.02:
            part = Cel(cel.w, cel.h, cel.top)
            self.crown(part, J, pose)
            laid(cel, part)
        self.collar_front(cel, J, pose)
        if heap:
            self.cloak(cel, J, pose)
        self.scales(cel, J, pose)
        self.fist(cel, J, "F")
        part = Cel(cel.w, cel.h, cel.top)
        self.sword(part, J, pose)
        laid(cel, part)
        self.arm(cel, J, "N", pose)
        self.pauldron(cel, J, "N", pose)
        if pose["crown_free"] >= 0.02:
            part = Cel(cel.w, cel.h, cel.top)
            self.crown(part, J, pose)
            laid(cel, part)

        for xy in [xy for xy in cel.px if xy[1] >= GROUND]:
            del cel.px[xy]
        cel.outline()
        for xy in [xy for xy in cel.px if xy[1] >= GROUND]:
            del cel.px[xy]

        self.lightning(cel, J, pose)
        if 0.01 < pose["bolt"] < 0.99:
            self.thunder(cel, ROOT_X + pose["bolt_x"], pose["bolt"], J)
        if 0.01 < pose["burst"] < 0.99:
            self.burst(cel, ROOT_X + pose["burst_x"], pose["burst"], pose["burst_big"])
        for key in ("step_n", "step_f"):
            if 0.01 < pose[key] < 0.99:
                ank = J["ankN" if key == "step_n" else "ankF"]
                self.burst(cel, ank[0] + 4.0, pose[key], 0.3)
        if pose["spill"] > 0.02:
            self.spill(cel, J, pose["spill"])
        # The swing of the sword: the last of its arc, where it comes down.
        if pose["smear"] > 0.5 and len(between) > 10:
            before = set(cel.px)
            swing_smear(cel, [Jb["tip"] for Jb, _ in between[9:]], [Jb["S"].at(BLADE * 0.5, 0.0) for Jb, _ in between[9:]])
            for xy in set(cel.px) - before:  # it is the light of the blade that smears, not steel
                if cel.px[xy] == ("bone", 7):
                    cel.px[xy] = ("azure", 8) if (xy[0] + xy[1]) % 2 else ("azure", 7)
            for xy in [xy for xy in cel.px if xy[1] >= GROUND]:
                del cel.px[xy]

    def lightning(self, cel: Cel, J: dict, pose: Pose) -> None:
        """The light that holds it up, crawling over the plate: from the cloud to the crown and the shoulders, and —
        when the sentence is being passed — into the blade."""
        arcs, ch = pose["arcs"], pose["charge"]
        seed = int(pose["boil"] * 16) * 7 + 1
        c = J["collar"]
        if arcs > 0.3 and pose["storm"] > 0.5:
            top = (c[0] + 1.0, c[1] - 16.0 * min(1.0, pose["storm"]))
            if seed % 3 != 0:
                bolt(cel, top, (J["crown"][0] + (seed % 5) - 2.0, J["crown"][1] + 1.0), seed, 1.6)
            if arcs >= 1.0:
                bolt(cel, (c[0] - 8.0, c[1] - 4.0), (J["shN"][0] - 2.0, J["shN"][1] - 12.0), seed + 5, 2.4)
            if arcs >= 1.5:
                bolt(cel, (c[0] + 9.0, c[1] - 5.0), (J["elF"][0], J["elF"][1] - 3.0), seed + 9, 3.0)
                bolt(cel, J["kneeF"], (J["ankF"][0] + 6.0, GROUND - 1.0), seed + 13, 2.0)
        if ch > 0.5 and pose["sw_free"] < 0.5:
            S = J["S"]
            top = (c[0] + 2.0, c[1] - 15.0)
            bolt(cel, top, S.at(BLADE * 0.35, 0.0), seed + 21, 4.0)
            if ch >= 1.0:
                bolt(cel, (c[0] - 3.0, c[1] - 12.0), S.at(BLADE * 0.75, 0.0), seed + 27, 5.0)
                # and off the blade into the air
                for i in range(3):
                    a0 = S.at(BLADE * (0.3 + 0.3 * i), 4.0 if (seed + i) % 2 else -4.0)
                    d = 7.0 + (_hash(seed, i) % 6)
                    ang = math.radians((_hash(seed + i, 3) % 360))
                    bolt(cel, a0, (a0[0] + math.cos(ang) * d, a0[1] + math.sin(ang) * d), seed + 40 + i, 1.5, over=False)

    @staticmethod
    def thunder(cel: Cel, x: float, u: float, J: dict) -> None:
        """The sentence carried out: the sky comes down the blade. One frame of a column of white, then its ghost."""
        top = -cel.top + 0.0
        seed = int(u * 9) + 2
        pts = [(x, GROUND - 1.0)]
        y = GROUND - 1.0
        cx = x
        while y > top:
            y -= 9.0
            cx += ((_hash(seed, int(y)) % 11) - 5) * (0.9 if u < 0.3 else 0.5)
            pts.append((cx + (top - y) * 0.0 - (GROUND - y) * 0.16, y))
        body = set(cel.px)
        line = Cel(cel.w, cel.h, cel.top)
        for p, q in zip(pts, pts[1:]):
            line.line(p, q, ("light", 0))
        wide = 2 if u < 0.3 else 1 if u < 0.55 else 0
        for (px, py) in line.px:
            if py >= GROUND or py < -cel.top:
                continue
            if u >= 0.8 or (u >= 0.55 and (py // 4) % 3):
                continue  # its ghost, in pieces, and then nothing
            for dx in range(-wide - 2, wide + 3):
                xy = (px + dx, py)
                if xy in body or not (0 <= xy[0] < cel.w):
                    continue
                tone = ("light", 0) if abs(dx) <= wide else ("azure", 8 if u < 0.3 else 7) if abs(dx) == wide + 1 else ("azure", 4)
                if u >= 0.55:
                    tone = ("azure", 7 if dx == 0 else 5)
                    if dx:
                        continue
                cel.px[xy] = tone
        if u < 0.55:  # branches
            for i, k in enumerate((2, 4, 6)):
                if k < len(pts):
                    a = pts[k]
                    sg = -1.0 if i % 2 else 1.0
                    bolt(cel, a, (a[0] + sg * (10.0 + 4.0 * i), a[1] + 9.0 + 3.0 * i), seed + i * 3, 2.0, over=False)

    @staticmethod
    def burst(cel: Cel, x: float, u: float, big: float) -> None:
        """Where it lands: the stones flash, sparks run out along them both ways and fly up, splinters of light."""
        half = (8.0 + 30.0 * min(1.0, u * 1.5)) * (0.5 + 0.5 * big)
        for i in range(int(half) + 1):  # along the stones
            for sgn in (-1, 1):
                if (i * 5 + (sgn > 0) + int(u * 11)) % 4 == 0 or i < 3 + 4 * (1.0 - u):
                    px = x + sgn * i
                    edge = i > half - 4
                    cel.soft(px, GROUND - 1, ("light", 0) if (edge or u < 0.3) else ("azure", 4) if i % 2 else (GOLD, 6))
                    if u < 0.4 and i < half * 0.5 * big:
                        cel.soft(px, GROUND - 2, ("azure", 7) if (i + sgn) % 3 else ("light", 0))
        n = int(8 + 16 * big)
        for i in range(n):  # sparks
            ang = math.radians(-168.0 + i * (156.0 / max(1, n - 1)))
            sp = 0.6 + 0.4 * ((_hash(i, 5) % 9) / 8.0)
            dist = (5.0 + 30.0 * u * sp) * (0.45 + 0.55 * big)
            px = x + math.cos(ang) * dist * 1.2
            py = GROUND - 2.0 + math.sin(ang) * dist + 16.0 * u * u * big
            if py >= GROUND - 1 or py < -cel.top + 1:
                continue
            tone = ("light", 0) if i % 3 == 0 else (GOLD, 6) if i % 3 == 1 else ("azure", 8)
            cel.soft(px, py, tone)
            if u < 0.7:  # a short streak behind each
                cel.soft(px - math.cos(ang) * 1.5, py - math.sin(ang) * 1.5, (GOLD, 4) if i % 3 == 1 else ("azure", 4))
        if u < 0.35:  # the flash on the stones
            r = 5.0 * big + 2.0
            for dy in range(0, int(r)):
                w = int((r - dy) * 1.6)
                for dx in range(-w, w + 1):
                    cel.soft(x + dx, GROUND - 1 - dy, ("light", 0) if dy < r * 0.5 else ("azure", 8))

    @staticmethod
    def spill(cel: Cel, J: dict, u: float) -> None:
        """The light going out of it: motes leave by the collar and the seams and rise."""
        c = J["collar"]
        for i in range(16):
            h1, h2 = (_hash(i, 3) % 100) / 100.0, (_hash(i, 11) % 100) / 100.0
            age = u * 1.25 - h1 * 0.5
            if not (0.0 < age < 0.8):
                continue
            x = c[0] - 10.0 + 22.0 * h2 + 5.0 * math.sin(age * 9.0 + i)
            y = c[1] - 4.0 - 42.0 * age - 8.0 * h1
            if y < -cel.top + 1:
                continue
            cel.soft(x, y, ("light", 0) if age < 0.25 else ("azure", 7) if age < 0.55 else ("azure", 5))
            if age < 0.3:
                cel.soft(x, y + 1, ("azure", 7))


# --------------------------------------------------------------------------------------- animations
#: Where the cloak's eight points lie when it has come down (root space): over the heap, out behind it.
CLOAK_DOWN = ((16.0, 28.0), (4.0, 42.0), (-30.0, 44.0), (-52.0, 24.0), (-74.0, 5.0), (-48.0, 2.0), (-14.0, 2.0), (2.0, 14.0))

BASE: Pose = dict(dx=0.0, drop=0.0, lean=0.0, gap=0.0, bn=(-26.0, 0.0), bf=(3.0, 0.0), boot_n=0.0, boot_f=0.0,
                  hn=(-10.0, 66.0), hf=(34.0, 92.0), n_bend=1.0, f_bend=1.0,
                  sw=-135.0, sw_free=0.0, sw_at=(0.0, 4.0), charge=0.0,
                  tilt=-5.0, pan=0.0, sc_free=0.0, sc_at=(30.0, 12.0), sc_len=1.0, law=1.0,
                  storm=1.0, storm_dx=0.0, boil=0.0, flick=0.0, arcs=0.0, light=1.0,
                  crown=(1.0, 0.0), crown_rot=-10.0, crown_free=0.0, crown_at=(10.0, 4.0),
                  cl=(0.0, 0.0, 0.0), flut=0.0, cloak_free=0.0, heap=0.0,
                  pn=(0.0, 0.0, 0.0), pf=(0.0, 0.0, 0.0), skirt_sw=0.0, tab_sw=0.0,
                  smear=0.0, bolt=0.0, bolt_x=57.0, burst=0.0, burst_x=57.0, burst_big=1.0, step_n=0.0, step_f=0.0, spill=0.0, flash=0.0)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.16))
    later = math.sin(math.tau * (ph - 0.3))
    # It weighs: once a cycle the empty pan sinks over whoever stands under it, and the storm stirs as it does.
    weigh = math.sin(math.pi * _clamp((ph - 0.3) / 0.6)) ** 1.5
    stir = _clamp(math.sin(math.pi * _clamp((ph - 0.5) / 0.4)))
    grip = 1.0 if 0.06 < ph < 0.14 or 0.2 < ph < 0.28 else 0.0  # the hand shifts on the hilt
    return {**BASE, "drop": 0.6 - 0.6 * s, "lean": 0.8 * late, "boil": ph, "flut": ph,
            "tilt": -6.0 + 21.0 * weigh, "pan": 1.4 * later, "hf": (34.0 + 1.0 * weigh, 92.0 + 0.8 * s - 1.5 * weigh),
            "hn": (-10.0, 66.0 + 0.6 * s), "sw": -135.0 + 1.6 * late + 1.5 * grip,
            "crown": (1.0 + 0.6 * late, 1.0 * s + 1.5 * stir), "crown_rot": -10.0 + 5.0 * late - 6.0 * stir,
            "storm": 1.0 + 0.2 * stir, "flick": 0.5 + 0.6 * stir if int(ph * 16) % 3 else 0.2 * stir, "arcs": 0.4 + 1.0 * stir, "law": 1.0 if stir > 0.4 else 0.5,
            "cl": (1.5 * s, 2.4 * late, 3.2 * later), "skirt_sw": 0.6 * late, "tab_sw": 1.6 * later}


def _foot(p: float, stride: float, lift: float) -> tuple[float, float]:
    p %= 1.0
    if p < 0.62:
        return (lerp(stride / 2, -stride / 2, p / 0.62), 0.0)
    t = (p - 0.62) / 0.38
    return (lerp(-stride / 2, stride / 2, t * t * (3 - 2 * t)), lift * math.sin(math.pi * t) ** 0.8)


def march_pose(ph: float) -> Pose:
    """The march: it does not hurry. Each boot is lifted high and brought down like a seal on a warrant, the whole
    weight of the plate behind it, and the stones crack with light where it lands."""
    fx, fl = _foot(ph + 0.0, 20.0, 12.0)
    nx, nl = _foot(ph + 0.5, 20.0, 12.0)
    # a footfall at ph = 0 (far) and 0.5 (near): the body comes down on it
    down = max(math.exp(-((ph % 0.5) / 0.09) ** 2), math.exp(-((0.5 - ph % 0.5) / 0.05) ** 2))
    sway = math.sin(math.tau * ph)
    two = math.cos(2 * math.tau * ph)
    return {**BASE, "drop": 1.0 + 4.2 * down, "lean": 7.0 + 3.5 * down, "dx": 1.2 * sway, "boil": ph * 2.0, "flut": ph * 2.0,
            "bf": (3.0 + fx, fl), "bn": (-26.0 + nx, nl), "boot_f": -14.0 * (fl / 12.0), "boot_n": -14.0 * (nl / 12.0),
            "hf": (33.0, 91.0 - 3.5 * down), "tilt": 4.0 + 13.0 * math.sin(math.tau * (ph * 2.0 - 0.18)), "pan": -3.0 + 2.5 * math.sin(math.tau * (ph * 2.0 - 0.3)),
            "hn": (-9.0, 65.0 - 2.5 * down), "sw": -132.0 + 5.0 * down,
            "crown": (-1.5, 1.0 - 2.0 * down + 1.2 * two), "crown_rot": -16.0 + 7.0 * down, "storm": 1.12, "storm_dx": -5.0, "flick": 1.0 if down > 0.35 else 0.4,
            "arcs": 1.6 if down > 0.3 else 0.6, "law": 1.0,
            "cl": (5.0 + 2.0 * two, 9.0 + 3.0 * math.sin(math.tau * (ph * 2 - 0.2)), 13.0 + 4.0 * math.sin(math.tau * (ph * 2 - 0.35))),
            "skirt_sw": -3.0 + 2.0 * sway, "tab_sw": -6.0 + 4.0 * math.sin(math.tau * (ph * 2 - 0.25)),
            "pn": (0.0, 1.5 * down, 0.0), "pf": (0.0, 1.5 * down, 0.0),
            "step_f": _clamp(ph / 0.34) if ph < 0.34 else 0.0, "step_n": _clamp((ph - 0.5) / 0.34) if 0.5 <= ph < 0.84 else 0.0}


def k(**over: object) -> Pose:
    return {**BASE, **over}


# The sentence. The empty pan drops; the sword comes off the shoulder and back, up to the top of the strip, the storm
# pours into it and it hangs there white; then it falls, square tip on the stones, and the thunder with it.
_UP = dict(dx=-3.0, drop=1.0, lean=-9.0, hn=(-29.0, 86.0), n_bend=-1.0, sw=-152.0, charge=1.0, hf=(27.0, 87.0), tilt=34.0, pan=-2.0,
           storm=1.25, flick=1.0, arcs=1.6, crown=(0.0, 3.0), crown_rot=-22.0, cl=(-2.0, -3.0, -4.0), tab_sw=3.0, bf=(8.0, 0.0), bn=(-31.0, 0.0), law=1.0)
_DOWN = dict(dx=7.0, drop=7.0, lean=17.0, hn=(9.0, 52.0), n_bend=1.0, sw=47.0, charge=1.3, hf=(22.0, 80.0), tilt=-22.0, pan=5.0,
             storm=1.25, flick=1.0, arcs=1.6, crown=(-3.0, -2.0), crown_rot=6.0, cl=(6.0, 10.0, 12.0), tab_sw=-8.0, skirt_sw=-3.0, bf=(13.0, 0.0), bn=(-29.0, 0.0),
             pn=(0.0, -2.0, 6.0), law=1.0)
SENTENCE_KEYS = [
    (0.00, k(), "lin"),
    (0.12, k(drop=1.5, lean=2.0, tilt=30.0, pan=2.0, hf=(35.0, 89.0), storm=1.15, flick=1.0, arcs=1.4, crown=(1.0, 2.0), hn=(-11.0, 67.0), sw=-132.0), "out"),
    (0.30, k(**{**_UP, "hn": (-22.0, 80.0), "sw": -140.0, "charge": 0.5, "lean": -5.0, "dx": -1.5}), "io"),
    (0.42, k(**_UP), "out"),
    (0.50, k(**{**_UP, "lean": -11.0, "dx": -4.0, "hn": (-31.0, 88.0), "sw": -155.0, "charge": 1.4, "storm": 1.3, "crown": (0.0, 4.0)}), "io"),
    (0.55, k(**_DOWN, smear=1.0, bolt=0.05, burst=0.02), "in3"),
    (0.70, k(**{**_DOWN, "drop": 8.0, "lean": 18.5, "charge": 0.9}, bolt=0.9, burst=0.9), "out"),
    (0.84, k(dx=3.0, drop=3.0, lean=8.0, hn=(4.0, 60.0), sw=4.0, charge=0.3, hf=(30.0, 88.0), tilt=-12.0, pan=-3.0, storm=1.1, flick=0.5, arcs=0.6,
             cl=(3.0, 4.0, 5.0), tab_sw=-3.0, bf=(10.0, 0.0), bolt=1.0, burst=1.0), "io"),
    (1.00, k(bolt=1.0, burst=1.0), "io"),
]

# Hit: the plates jolt apart and the light shows between them; the crown is thrown and caught; the scales swing wild.
HURT_KEYS = [
    (0.00, k(), "lin"),
    (0.07, k(dx=-1.5, lean=-5.0, gap=0.6, storm=0.8, flick=1.0, arcs=1.6, crown=(-2.0, 4.0), crown_rot=-26.0, tilt=-18.0, pan=-3.0, hf=(32.0, 93.0),
             pn=(-1.0, 2.0, -8.0), pf=(1.0, 2.0, 6.0), sw=-139.0, flash=1.0), "out3"),
    (0.16, k(dx=-4.0, drop=1.5, lean=-10.0, gap=1.0, storm=0.55, flick=1.0, arcs=1.6, crown=(-5.0, 8.0), crown_rot=-40.0, tilt=-30.0, pan=-6.0, hf=(29.0, 95.0),
             pn=(-2.0, 4.0, -14.0), pf=(2.0, 3.0, 10.0), hn=(-13.0, 68.0), sw=-145.0, bn=(-34.0, 3.0), cl=(-3.0, -5.0, -6.0), tab_sw=5.0, skirt_sw=2.0, flash=0.5), "lin"),
    (0.26, k(dx=-6.5, drop=2.5, lean=-12.0, gap=0.8, storm=0.5, flick=0.5, arcs=1.0, crown=(-6.0, 9.0), crown_rot=-34.0, tilt=-10.0, pan=4.0, hf=(27.0, 95.0),
             pn=(-2.0, 3.0, -10.0), pf=(2.0, 2.0, 8.0), hn=(-15.0, 69.0), sw=-147.0, bn=(-37.0, 0.0), bf=(4.0, 0.0), cl=(-4.0, -7.0, -9.0), tab_sw=7.0, skirt_sw=3.0), "out"),
    (0.50, k(dx=-4.5, drop=3.5, lean=6.0, gap=0.2, storm=0.9, flick=1.0, arcs=1.5, crown=(-1.0, 3.0), crown_rot=-4.0, tilt=24.0, pan=6.0, hf=(31.0, 89.0),
             hn=(-10.0, 64.0), sw=-130.0, bn=(-37.0, 0.0), bf=(2.0, 0.0), cl=(3.0, 5.0, 6.0), tab_sw=-4.0), "io"),
    (0.74, k(dx=-1.5, drop=1.2, lean=2.0, storm=1.05, flick=0.5, arcs=0.8, crown=(1.0, 0.5), tilt=-12.0, pan=-3.0, bn=(-32.0, 3.5), bf=(5.0, 0.0), cl=(1.0, 2.0, 2.0)), "io"),
    (1.00, k(), "io"),
]

# Death: the case is closed. The storm rears once and gutters; with nothing to hold it the armour comes down piece by
# piece — crown, sword, scales — the cuirass tips onto the stones with its empty collar open, the cloak settles over it.
_OUT = dict(storm=0.0, flick=0.0, arcs=0.0, light=0.0, law=0.0, charge=0.0)
_HEAP = dict(**_OUT, dx=-4.0, drop=33.0, lean=74.0, heap=1.0, cloak_free=1.0, bn=(-44.0, 0.0), bf=(-2.0, 0.0), boot_n=-8.0, boot_f=84.0,
             hn=(2.0, 5.0), hf=(31.0, 5.0), n_bend=1.0, f_bend=1.0,
             sw=-180.0, sw_free=1.0, sw_at=(-26.0, 3.5), crown_free=1.0, crown_at=(28.0, 3.0), crown_rot=0.0,
             sc_free=1.0, sc_at=(58.0, 9.5), sc_len=0.22, tilt=0.0, pan=0.0,
             pn=(-34.0, -26.0, -70.0), pf=(4.0, -6.0, 14.0), skirt_sw=20.0, tab_sw=40.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.04, k(dx=-1.5, lean=-5.0, gap=0.6, storm=0.8, flick=1.0, arcs=1.6, crown=(-2.0, 4.0), crown_rot=-26.0, tilt=-18.0, pan=-3.0, pn=(-1.0, 2.0, -8.0), sw=-139.0, flash=1.0), "out3"),
    # The storm rears out of the collar — all of it — and the light runs wild over the plate.
    (0.12, k(dx=-3.0, drop=-1.0, lean=-9.0, gap=1.0, storm=1.3, flick=1.0, arcs=1.6, crown=(-1.0, 5.0), crown_rot=-30.0, tilt=30.0, pan=4.0, hf=(30.0, 95.0),
             pn=(-2.0, 4.0, -12.0), pf=(2.0, 3.0, 8.0), hn=(-13.0, 69.0), sw=-145.0, cl=(-3.0, -5.0, -6.0), tab_sw=5.0), "out"),
    (0.20, k(dx=-3.0, drop=-1.0, lean=-10.0, gap=1.0, storm=1.35, flick=1.0, arcs=1.6, crown=(0.0, 6.0), crown_rot=-34.0, tilt=-24.0, pan=-5.0, hf=(30.0, 96.0),
             pn=(-2.0, 4.0, -12.0), pf=(2.0, 3.0, 8.0), hn=(-13.0, 70.0), sw=-146.0, cl=(-3.0, -6.0, -7.0), tab_sw=5.0), "io"),
    # And goes out. The crown hangs a moment on nothing.
    (0.27, k(dx=-2.0, lean=-6.0, gap=0.7, storm=0.45, flick=0.4, arcs=0.4, light=0.5, law=0.5, crown=(0.0, 14.0), crown_rot=-20.0, tilt=0.0, hf=(31.0, 94.0),
             pn=(-1.0, 2.0, -6.0), hn=(-12.0, 68.0), sw=-141.0, spill=0.15), "lin"),
    (0.33, k(**_OUT, dx=-1.0, lean=-3.0, gap=0.3, crown_free=0.25, crown_at=(-14.0, 104.0), crown_rot=4.0, tilt=0.0, hf=(32.0, 91.0), hn=(-11.0, 66.0), sw=-137.0,
             spill=0.3), "io"),
    # The crown drops into the empty collar and out over the breast; the arm lets the scales go; the sword starts to slide.
    (0.40, k(**_OUT, drop=2.0, lean=3.0, crown_free=1.0, crown_at=(-10.0, 88.0), crown_rot=40.0, tilt=10.0, hf=(33.0, 78.0), sc_free=0.3, sc_at=(40.0, 60.0),
             hn=(-10.0, 60.0), sw=-140.0, sw_free=0.2, sw_at=(-24.0, 60.0), pn=(0.0, -1.0, 4.0), cl=(2.0, 3.0, 3.0), spill=0.45), "in"),
    (0.47, k(**_OUT, drop=6.0, lean=9.0, crown_free=1.0, crown_at=(20.0, 44.0), crown_rot=150.0, tilt=24.0, hf=(30.0, 58.0), sc_free=1.0, sc_at=(48.0, 28.0), sc_len=0.8,
             hn=(-6.0, 50.0), sw=-150.0, sw_free=0.7, sw_at=(-30.0, 46.0), pn=(-3.0, -4.0, -14.0), pf=(2.0, -2.0, 8.0), bn=(-33.0, 0.0),
             cl=(4.0, 6.0, 6.0), tab_sw=-4.0, spill=0.6), "in"),
    # The scales strike the stones; the cuirass goes over.
    (0.54, k(**_OUT, dx=1.0, drop=13.0, lean=30.0, crown_free=1.0, crown_at=(32.0, 8.0), crown_rot=300.0, tilt=-14.0, hf=(30.0, 34.0), sc_free=1.0, sc_at=(55.0, 10.0), sc_len=0.3,
             hn=(-2.0, 34.0), sw=-166.0, sw_free=1.0, sw_at=(-30.0, 24.0), pn=(-12.0, -14.0, -40.0), pf=(3.0, -4.0, 12.0), bn=(-38.0, 0.0), bf=(4.0, 0.0), boot_f=20.0,
             cloak_free=0.25, cl=(8.0, 12.0, 10.0), skirt_sw=8.0, tab_sw=10.0, burst=0.1, burst_x=55.0, burst_big=0.35, spill=0.75), "in"),
    (0.62, k(**{**_HEAP, "drop": 28.0, "lean": 60.0, "crown_at": (33.0, 3.0), "crown_rot": 372.0, "cloak_free": 0.55, "sw": -178.0, "sw_at": (-27.0, 6.0),
                "pn": (-26.0, -22.0, -60.0), "heap": 0.0, "tilt": 6.0}, burst=0.5, burst_x=55.0, burst_big=0.35, step_f=0.3, spill=0.9), "in"),
    (0.70, k(**{**_HEAP, "drop": 34.0, "lean": 76.0, "cloak_free": 0.85, "crown_at": (30.0, 3.0), "crown_rot": 356.0}, burst=0.9, burst_x=55.0, burst_big=0.35, step_f=0.7, spill=1.0), "out"),
    (0.80, k(**_HEAP, spill=1.0), "io"),
    (1.00, k(**_HEAP, spill=1.0), "lin"),
]

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 16 for i in range(16)], [150] * 16, True),
    "run": Anim("run", march_pose, [i / 12 for i in range(12)], [95] * 12, True),
    "attack": Anim("attack", keyed(SENTENCE_KEYS), [0.0, 0.06, 0.12, 0.18, 0.24, 0.30, 0.36, 0.42, 0.50, 0.55, 0.59, 0.63, 0.67, 0.70, 0.77, 0.84, 0.92, 1.0],
                   # An enemy swings every 1250 ms and the game starts this clip its wind-up ahead of the swing: the whole
                   # of it (660 ms to the blow, 290 of impact, 290 back up) fits between two swings, so it is never cut.
                   [60, 60, 70, 60, 60, 70, 70, 80, 130, 40, 50, 60, 60, 80, 80, 70, 70, 70], False),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.02, 0.04, 0.08, 0.12, 0.16, 0.20, 0.235, 0.27, 0.30, 0.33, 0.365, 0.40, 0.435, 0.47, 0.505, 0.54, 0.58,
                                                 0.62, 0.66, 0.70, 0.75, 0.80, 1.0],
                  [70, 50, 80, 90, 110, 110, 120, 100, 110, 100, 100, 80, 80, 70, 70, 70, 80, 90, 100, 110, 130, 180, 280, 1500], False),
}
