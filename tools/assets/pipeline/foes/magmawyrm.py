"""The Forge Wyrm — world 8, stage boss. The beast the smiths kept chained under the forges to fire their
furnaces. It does not stand on the floor: it comes up OUT of it, through a split in the iron plates where molten
metal wells up. Only the head and the first lengths of the neck are above the pool.

The neck climbs out of the melt in rings of black cooled slag and forged plate — white-hot seams between the
rings, a belly of cracked crust over magma, iron spines down the back — and arches over, so the head hangs above
and ahead, looking DOWN at the party. Round its neck is still the forged collar, with lengths of snapped chain
swinging from it. The head is an armoured skull as long as a hero is tall: black plates with cold steel on
their upper edges and fire in every crack, horns of blackened iron, a row of white-hot eyes down the brow (the
first slit like a reptile's), long teeth, and inside the jaws a gullet like a furnace mouth, with a second,
smaller pair of jaws that comes out when the first are open. Molten metal runs off its chin and its belly.

It advances by hauling the pool along the floor, which buckles ahead of it and cools to a scar behind. It
attacks like a snake: it rears back and up, unhinges its jaws, hangs there with the furnace in its throat
roaring, and strikes down into the floor in front, which bursts: plates thrown up, lava fountaining. It dies by
going out: the pool crusts over and the cold climbs the neck ring by ring, from the floor up, turning it to grey
stone in the middle of its last roar; the eyes go out one by one; then the stone cracks above the collar and
the head breaks off and falls, leaving a column of slag with the collar and its chain still on it.

Own rig, re-versioned from the World-Eater: the neck is a curve from the pool to where the skull hangs, laid
with ring segments from the head backwards. Every shape is a polygon placed in a turned frame and rasterised,
so nothing is a rotated sprite. Frame 176 × 114 (44 extra rows above), root at 60; about 90 px tall, and
nothing reaches more than ~95 px ahead of the root. Drawn facing right; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Pose, Pt, keyed

FIGURE = ("MagmaWyrm", "boss", "w08")

BUILD = Build(root_x=60, thigh=1.0, shin=1.0, foot=0.0, hip_dx=0.0, spine=0.0, sh_near=0.0, sh_far=0.0, upper=1.0, fore=1.0, neck=0.0)

#: Poses are keyed in the World-Eater's units; this beast is that one at four fifths.
S = 0.82
SEG = 10.0  # length of a neck ring
RINGS = 15  # the most rings that can be out of the floor at once
JAW_SWING = 42.0  # degrees the lower jaw drops when fully open
#: Where the bite lands, px ahead of the root.
BITE_X = 77.0
HS = 1.02  # scale of the skull's plan below
COLLAR = 4  # the ring (counted from the head) that wears the collar
BREAK = 4  # where the stone neck snaps when it dies: the head and this many rings fall

# The skull, in its own frame: x along the snout, y towards the jaw, origin where the neck meets it.
SKULL = [(-5, -8), (0, -13), (9, -15), (19, -12), (28, -8), (37, -3), (44, 0), (48, 3), (46, 7), (43, 5), (8, 5), (0, 6), (-5, 3)]
SKULL_TOP = SKULL[:8]
CRANIUM = [(-4, -7), (0, -12), (9, -14), (17, -11.5), (20, -8), (10, -5), (0, -3)]
SNOUT = [(21, -8.5), (28, -7.5), (37, -2.5), (44, 0.5), (46.5, 3), (44, 3.2), (34, 1), (24, -3)]
CHEEK = [(-3, -1), (10, -3), (22, -1), (33, 2.5), (42, 4.3), (9, 4.6), (0, 5)]
SKULL_CRACKS = [[(2, -10), (6, -7.5), (5, -5), (9, -3.5)], [(26, -6), (30, -3.5), (34, -3), (38, -0.5)], [(6, 1), (11, 2.5), (16, 1.5), (21, 3.5)]]
#: The groove between cranium and snout, and the one under the brow: fire shows in them while it lives.
SKULL_SEAMS = [[(20.5, -9), (22, -5.5), (20, -2.5)], [(-2, -2.2), (9, -4), (20, -2.2)]]
#: Eyes down the brow groove: (x, y, big). They go out from the snout backwards; the big one is the last.
EYES = [(17.0, -5.4, True), (23.5, -3.6, False), (28.5, -1.9, False), (33.0, -0.4, False)]
UPPER_TEETH = [(11, 4), (15, 5), (19, 4), (23, 6), (27, 5), (31, 7), (35, 5), (39, 9), (43, 6)]
HORN = [((3, -12), 5.6), ((-6, -19), 4.8), ((-17, -23), 3.8), ((-29, -21), 2.6), ((-38, -13), 0.9)]
CREST = [((11, -14), 4.0), ((8, -21), 2.8), ((1, -27), 0.9)]
# The lower jaw, in a frame hinged at (1, 5) of the skull.
JAW = [(-3, 0), (8, -0.5), (34, 1.5), (41, 0), (43, 3), (37, 7.5), (16, 9), (3, 6.5), (-3, 3)]
JAW_PLATE = [(2, 1.6), (33, 3.2), (40, 2), (41.5, 3.5), (36, 6.4), (16, 7.8), (4, 5.4)]
LOWER_TEETH = [(10, 3), (14, 4), (18, 3), (22, 5), (26, 4), (30, 6), (34, 4), (38, 8)]
SPUR = [((-1, 3), 3.2), ((-9, 7), 2.2), ((-16, 5), 0.8)]
#: Iron spines on the back: ring (counted from the head) → length.
SPIKES = {1: 6.0, 3: 9.0, 6: 11.0, 8: 8.0, 9: 10.0, 11: 7.0, 13: 9.0}
#: The floor plates buckled up round the melt: (inner x, outer x, x of the peak, height), in the World-Eater's units.
LIPS = [(10, 25, 19, 11), (22, 36, 31, 7), (33, 42, 38, 3.5), (-9, -25, -18, 10), (-21, -37, -31, 6.5), (-34, -43, -39, 3)]
POOL = [(-27, 0), (-18, -2.5), (-8, -1.5), (0, -3.5), (9, -2), (19, -3), (28, 0), (20, 3), (8, 2), (-2, 3.5), (-12, 2), (-21, 3)]
#: The pose it is frozen in when the cold reaches the head: the last roar. The stone column that is left standing
#: is this curve, so the keys of the death must hold exactly these values while it cools.
FROZEN = dict(tip=(30.0, 84.0), tdir=10.0, a0=-104.0, lift=90.0, bow=36.0)


class Turned:
    """A frame at `o` turned `deg` (0 = +x, 90 = down): local (x, y) → pixel space."""

    def __init__(self, o: Pt, deg: float, scale: float = 1.0):
        a = math.radians(deg)
        self.o, self.c, self.s = o, math.cos(a) * scale, math.sin(a) * scale

    def __call__(self, x: float, y: float) -> Pt:
        return (self.o[0] + x * self.c - y * self.s, self.o[1] + x * self.s + y * self.c)

    def all(self, pts) -> list[Pt]:
        return [self(x, y) for x, y in pts]


def fill(cel: Cel, pts: list[Pt], tone) -> None:
    for i, j in cel.poly_mask(pts):
        cel.put(i, j, tone)


def stroke(cel: Cel, pts: list[Pt], tone) -> None:
    for p0, p1 in zip(pts, pts[1:]):
        cel.line(p0, p1, tone)


def star(x: int, y: int) -> int:
    return ((x * 73856093) ^ (y * 19349663)) & 0xFFFF


def hw(k: int) -> float:
    """Half the thickness of ring k (0 = behind the skull): the neck thickens towards the floor."""
    return 7.0 + min(k, 8) * 0.45


def neck_curve(base: Pt, tip: Pt, a0: float, tdir: float, lift: float, bow: float, limit: int, ph: float, amp: float) -> list[Pt]:
    """Ring joints from the skull back towards the pool: a Bézier from the pool (leaving it along `a0`) to the
    skull (arriving along `tdir`), walked from the tip in steps of one ring; then a wave run down it."""
    a, t = math.radians(a0), math.radians(tdir)
    c0, c3 = base, tip
    c1 = (base[0] + lift * math.cos(a), base[1] + lift * math.sin(a))
    c2 = (tip[0] - bow * math.cos(t), tip[1] - bow * math.sin(t))
    n = 90
    line = []
    for i in range(n + 1):
        u = i / n
        v = 1 - u
        line.append((v**3 * c0[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u**3 * c3[0],
                     v**3 * c0[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u**3 * c3[1]))
    out, cur, need = [tip], tip, SEG
    for i in range(n - 1, -1, -1):
        nxt = line[i]
        while len(out) <= limit:
            d = math.hypot(nxt[0] - cur[0], nxt[1] - cur[1])
            if d < need:
                need -= d
                break
            f = need / d
            cur = (cur[0] + (nxt[0] - cur[0]) * f, cur[1] + (nxt[1] - cur[1]) * f)
            out.append(cur)
            need = SEG
        cur = nxt
        if len(out) > limit:
            break
    if len(out) <= limit and need < SEG - 3.0:
        out.append(base)
    if amp > 0.01 and len(out) > 3:
        waved = [out[0]]
        last = len(out) - 1
        for k in range(1, len(out)):
            p0, p1 = out[k - 1], out[min(last, k + 1)]
            dx, dy = p1[0] - p0[0], p1[1] - p0[1]
            d = math.hypot(dx, dy) or 1.0
            w = amp * math.sin(math.tau * (ph - k * 0.11)) * min(1.0, k / 2.0) * min(1.0, (last - k) / 2.0)
            waved.append((out[k][0] - dy / d * w, out[k][1] + dx / d * w))
        out = waved
    return out


def frozen_curve(rx: float) -> list[Pt]:
    """The neck in its last roar, from the skull down to the floor."""
    tx, ty = FROZEN["tip"]
    return neck_curve((rx, GROUND + 4.0), (rx + tx * S, GROUND - ty * S), FROZEN["a0"], FROZEN["tdir"], FROZEN["lift"] * S, FROZEN["bow"] * S, RINGS, 0.0, 0.0)


def _break_point() -> tuple[tuple[float, float], float]:
    """Where the frozen neck snaps, in pose units from the root, and the way the neck runs there."""
    c = frozen_curve(0.0)
    p, q = c[BREAK], c[BREAK - 1]
    return ((p[0] / S, (GROUND - p[1]) / S), math.degrees(math.atan2(q[1] - p[1], q[0] - p[0])))


BREAK_AT, BREAK_DIR = _break_point()


class MagmaWyrm(Character):
    build = BUILD
    W = 176
    TOP = 44

    # ------------------------------------------------------------------------------------ skeleton
    def joints(self, pose: Pose) -> dict:
        rx = BUILD.root_x + pose.get("dx", 0.0)
        tx, ty = pose["tip"]
        tip = (rx + tx * S, GROUND - ty * S)
        cut = int(round(pose.get("cut", 0.0)))
        if cut > 0:  # broken off: the piece lies or falls on its own, `end` is where its break is
            ex, ey = pose["end"]
            base = (rx + ex * S, GROUND - ey * S)
        else:
            base = (rx, GROUND + 4.0)
        pts = neck_curve(base, tip, pose["a0"], pose["tdir"], pose["lift"] * S, pose["bow"] * S, RINGS - cut, pose.get("und", 0.0), pose.get("und_a", 0.0))
        # Once the head has broken off, the rest of the neck stands where it froze.
        stand = frozen_curve(rx)[BREAK:] if pose.get("stand", 0.0) > 0.5 else []
        J: dict = {"neck": pts, "stand": stand, "tip": tip, "rx": (rx, GROUND), "lean": (0.0, 0.0)}
        head = Turned(tip, pose["head"], HS)
        J["hinge"] = head(1.0, 5.0)
        J["snout"] = head(47.0, 4.0)
        J["chin"] = Turned(J["hinge"], pose["head"] + max(0.0, pose.get("jaw", 0.0)) * JAW_SWING, HS)(31.0, 7.5)
        J["stump"] = pts[-1]
        # Where molten metal runs off the belly.
        for n_, k in enumerate((1, 7)):
            k = min(k, len(pts) - 2)
            a_, b_ = pts[k + 1], pts[k]
            d = math.hypot(b_[0] - a_[0], b_[1] - a_[1]) or 1.0
            J[f"drip{n_}"] = ((a_[0] + b_[0]) / 2 - (b_[1] - a_[1]) / d * hw(k), (a_[1] + b_[1]) / 2 + (b_[0] - a_[0]) / d * hw(k))
        # Where the snapped chains hang from the collar (its belly side).
        if stand:
            a_, b_, kk = stand[1], stand[0], COLLAR
        elif len(pts) > COLLAR + 1:
            a_, b_, kk = pts[COLLAR + 1], pts[COLLAR], COLLAR
        else:
            a_, b_, kk = pts[-1], pts[-2], len(pts) - 2
        F = Turned(a_, math.degrees(math.atan2(b_[1] - a_[1], b_[0] - a_[0])))
        L = math.hypot(b_[0] - a_[0], b_[1] - a_[1])
        J["chainA"], J["chainB"] = F(L * 0.34, hw(kk + 1) + 1.0), F(L * 0.62, hw(kk) + 1.0)
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def grounded(pts: list[Pt], J: dict) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        specs = {f"drip{n_}": ChainSpec(Chain(4, 2.6 + 0.4 * n_, gravity=0.26, drag=0.12, damp=0.08), (lambda J, n_=n_: J[f"drip{n_}"]), grounded)
                 for n_ in range(2)}
        specs["drool"] = ChainSpec(Chain(5, 2.3, gravity=0.28, drag=0.1, damp=0.08), lambda J: J["chin"], grounded)
        # Iron is heavy: the chains swing slowly and far.
        specs["chainA"] = ChainSpec(Chain(8, 2.8, gravity=0.3, drag=0.05, damp=0.03), lambda J: J["chainA"], grounded)
        specs["chainB"] = ChainSpec(Chain(4, 2.8, gravity=0.3, drag=0.05, damp=0.03), lambda J: J["chainB"], grounded)
        return specs

    # ------------------------------------------------------------------------------------ drawing
    def draw(self, cel, J, pose, ropes, between) -> None:
        rx = J["rx"][0]
        pool = max(0.0, pose.get("rift", 1.0))
        heat = max(0.0, pose.get("heat", 1.0))
        glow = pose.get("glow", 0.35)
        blaze = pose.get("blaze", 0.0)
        broken = bool(J["stand"])
        cool = 1.0 if broken else pose.get("cool", 0.0)
        stone_head = cool >= 0.97
        hot = ("brass", 5) if blaze < 0.3 else ("brass", 6) if blaze < 0.7 else ("light", 0)
        self.pool_back(cel, rx, pool, heat)

        body = Cel(cel.w, cel.h, cel.top)
        head = Turned(J["tip"], pose["head"], HS)
        jaw_open = max(0.0, pose.get("jaw", 0.0))
        jaw = Turned(J["hinge"], pose["head"] + jaw_open * JAW_SWING, HS)
        cut = pose.get("cut", 0.0) > 0.5
        if broken:
            self.neck(body, J["stand"], hot, 1.0, BREAK, True, pose.get("fract", 0.0))
            self.stump(body, J["stand"][0], J["stand"][1], BREAK)
        self.horns(body, head, far=True)
        self.neck(body, J["neck"], hot, cool, 0, not broken, pose.get("fract", 0.0))
        if cut:
            self.stump(body, J["stump"], J["neck"][-2], len(J["neck"]) - 1)
        for name in ("chainA", "chainB"):
            links = ropes[name]
            for i in range(len(links) - 1):
                w = 3.4 if i % 2 == 0 else 1.6
                body.limb(links[i], links[i + 1], w, w, "ink", (3, 6, 8))
                if i % 2 == 0:  # the hole of the link
                    body.put((links[i][0] + links[i + 1][0]) / 2, (links[i][1] + links[i + 1][1]) / 2, ("ink", 1))
            body.put(links[-1][0], links[-1][1], ("ink", 9))
        if cool < 0.6:  # molten metal running off it; it stops when the cold comes
            for name in ("drip0", "drip1", "drool"):
                drip = ropes[name]
                for i in range(len(drip) - 1):
                    body.limb(drip[i], drip[i + 1], 2.2 - i * 0.35, 1.9 - i * 0.35, "brass", (4, 5, 7))
                body.put(drip[-1][0], drip[-1][1], ("light", 0))
        self.mouth(body, head, jaw, jaw_open, pose.get("jaw2", 0.0), glow, pose["head"], stone_head)
        self.skull(body, head, hot, stone_head)
        self.lower_jaw(body, jaw, hot, stone_head)
        self.horns(body, head, far=False)
        for (x, y), tone in body.px.items():
            if y < GROUND:
                cel.px[(x, y)] = tone
        self.pool_front(cel, rx, pool, heat, pose.get("und", 0.0) if pose.get("trail", 0.0) > 0.5 else None)
        crack = pose.get("crack", 0.0)
        if 0.01 < crack < 0.985:
            self.burst_solid(cel, rx + BITE_X, crack)
        cel.outline()

        self.eyes(cel, head, pose.get("eyes", 4.0), pose.get("look", 0.0))
        self.fire(cel, rx, pool, heat, pose.get("float", 0.0), glow)
        if 0.01 < crack < 0.985:
            self.burst_light(cel, rx + BITE_X, crack)
        if pose.get("trail", 0.0) > 0.5:
            self.trail(cel, rx, pose.get("und", 0.0))
        snap = pose.get("snap", 0.0)
        if 0.01 < snap < 0.985 and broken:
            bx, by = J["stand"][0]
            if snap < 0.3:
                cel.star(bx, by, 4)
            for n_ in range(12):
                ang = math.radians(-175 + n_ * 30.0 + (star(n_, 5) % 20))
                dist = 3.0 + (10.0 + star(n_, 2) % 9) * snap
                x, y = bx + math.cos(ang) * dist * 1.3, by + math.sin(ang) * dist + 16.0 * snap * snap
                if y < GROUND - 1:
                    cel.soft(x, y, ("ink", 7) if n_ % 3 == 0 else ("ink", 5))
                    if snap < 0.6:
                        cel.soft(x + 1, y, ("ink", 4))
        dust = pose.get("dust", 0.0)
        if 0.01 < dust < 0.985:
            for i in range(24):
                x = rx + 6 + i * 3.4 + (star(i, 3) % 5)
                y = GROUND - 2 - (star(i, 7) % 9) * dust - 5 * dust
                if (star(i, 11) % 10) / 10 > dust * 0.7:
                    cel.soft(x, y, ("ink", 6) if i % 3 else ("leather", 4))
                    if dust < 0.5:
                        cel.soft(x + 1, y, ("ink", 5))

    def neck(self, c: Cel, pts: list[Pt], hot, cool: float, k0: int, collar: bool, fract: float) -> None:
        """Armoured rings from the floor up to the skull, each overlapping the one below it. `cool` is how far
        up the cold has climbed (0 = alive, 1 = all stone); `k0` is the ring number of the first one given."""
        n = len(pts) - 1
        cold_from = n - int(round(cool * (n + 1)))  # rings k >= this are stone
        for k in range(n - 1, -1, -1):
            a, b = pts[k + 1], pts[k]
            g = k + k0
            ha, hb = hw(g + 1), hw(g)
            L = math.hypot(b[0] - a[0], b[1] - a[1])
            if L < 0.5:
                continue
            F = Turned(a, math.degrees(math.atan2(b[1] - a[1], b[0] - a[0])))
            cold = k >= cold_from
            warm = not cold and cool > 0.0 and k == cold_from - 1
            if cold:
                core, b1, b2, rib, edge, seam, crk, rim, p1, p2 = ("ink", 1), ("ink", 2), ("ink", 3), ("ink", 4), ("ink", 5), ("ink", 0), ("ink", 0), ("ink", 6), ("ink", 2), ("ink", 4)
            elif warm:
                core, b1, b2, rib, edge, seam, crk, rim, p1, p2 = ("ink", 0), ("crimson", 1), ("crimson", 2), ("crimson", 3), ("crimson", 4), ("crimson", 3), ("crimson", 4), ("ink", 7), ("ink", 1), ("ink", 3)
            else:
                core, b1, b2, rib, edge, seam, crk, rim, p1, p2 = (("ink", 0), ("crimson", 1), ("crimson", 3), ("brass", 4), ("brass", 5 if k % 2 else 6),
                                                                   ("brass", 5), hot, ("ink", 8), ("ink", 1), ("ink", 3))
            c.limb(a, b, ha * 2, hb * 2, core[0], (core[1], core[1], core[1]))
            # Belly: cracked crust over magma, its edge burning.
            fill(c, [F(0, ha * 0.32), F(L, hb * 0.32), F(L, hb - 0.4), F(0, ha - 0.4)], b1)
            fill(c, [F(0, ha * 0.62), F(L, hb * 0.62), F(L, hb - 0.4), F(0, ha - 0.4)], b2)
            stroke(c, [F(L * 0.5, ha * 0.36), F(L * 0.5 + 1.5, ha - 1.0)], rib)
            stroke(c, [F(0, ha - 0.4), F(L, hb - 0.4)], edge)
            # Dorsal plate: forged black iron, cold steel along its spine, a white-hot seam where it meets the next.
            plate = [F(-4, -ha - 1.5), F(L * 0.45, -hb - 3.5), F(L + 2, -hb - 0.5), F(L + 3, hb * 0.2), F(L * 0.5, ha * 0.3), F(-3, ha * 0.15)]
            fill(c, plate, p1)
            fill(c, [F(-3, -ha - 0.5), F(L * 0.45, -hb - 2.5), F(L + 2, -hb + 0.5), F(L + 2, -hb * 0.4), F(-3, -ha * 0.45)], p2)
            stroke(c, [plate[0], plate[5]], seam)
            stroke(c, [F(1, -ha * 0.7), F(L * 0.3, -ha * 0.3), F(L * 0.55, -ha * 0.75), F(L * 0.9, -hb * 0.4)], crk)
            stroke(c, [plate[0], plate[1], plate[2]], rim)
            if g in SPIKES:
                m = SPIKES[g]
                tipp = F(L * 0.5 - m * 0.4, -hb - 3.0 - m)
                fill(c, [F(L * 0.5 - 2.8, -hb - 2.5), tipp, F(L * 0.5 + 2.8, -hb - 2.5)], ("ink", 4))
                fill(c, [F(L * 0.5 - 2.8, -hb - 2.5), tipp, F(L * 0.5 - 0.5, -hb - 2.5)], ("ink", 2))
                stroke(c, [F(L * 0.5 + 2.4, -hb - 2.6), tipp], ("ink", 7))
                c.put(tipp[0], tipp[1], ("ink", 6) if cold else ("brass", 6))
            if collar and g == COLLAR:
                # The collar the smiths forged on it: a riveted band, a broken shackle on its belly side.
                x0, x1 = L * 0.08, L * 0.8
                fill(c, [F(x0, -hb - 4.0), F(x1, -hb - 4.0), F(x1, ha + 1.6), F(x0, ha + 1.6)], ("ink", 5))
                fill(c, [F(x0, -hb - 4.0), F(x1, -hb - 4.0), F(x1, -hb * 0.2), F(x0, -hb * 0.2)], ("ink", 7))
                stroke(c, [F(x0, -hb - 4.0), F(x1, -hb - 4.0)], ("ink", 9))
                stroke(c, [F(x0, -hb - 4.0), F(x0, ha + 1.6)], ("ink", 3))
                stroke(c, [F(x1, -hb - 4.0), F(x1, ha + 1.6)], ("ink", 3))
                stroke(c, [F(x0, ha + 1.6), F(x1, ha + 1.6)], ("ink", 3) if cold else ("brass", 5))
                for y in (-hb * 0.75, -hb * 0.1, hb * 0.55):
                    c.put(*F(L * 0.44, y), ("ink", 2) if cold else ("brass", 6))
                # The broken shackle the chains hang from.
                c.limb(F(L * 0.44, ha + 1.0), F(L * 0.44, ha + 4.2), 4.0, 3.4, "ink", (3, 6, 8))
                c.put(*F(L * 0.44, ha + 2.6), ("ink", 1))
            if cold and fract > 0.5 and g in (BREAK - 1, BREAK):
                # The stone gives: a pale crack across the neck above the collar.
                x = L * (0.1 if g == BREAK - 1 else 0.92)
                stroke(c, [F(x, -hb - 2.0), F(x + 1.6, -hb * 0.3), F(x - 1.0, hb * 0.2), F(x + 1.2, hb)], ("ink", 7))

    @staticmethod
    def horns(c: Cel, head: Turned, far: bool) -> None:
        """Horns of blackened iron, with steel along their upper edge."""
        off = (3.0, -2.0) if far else (0.0, 0.0)
        for chain_ in (HORN, CREST) if not far else (HORN,):
            for (p0, w0), (p1, w1) in zip(chain_, chain_[1:]):
                c.limb(head(p0[0] + off[0], p0[1] + off[1]), head(p1[0] + off[0], p1[1] + off[1]), w0, w1, "ink", (2, 4, 7), far=far)

    def mouth(self, c: Cel, head: Turned, jaw: Turned, opened: float, inner: float, glow: float, heading: float, stone: bool) -> None:
        """What shows between the jaws: a throat like a furnace mouth, white-hot at the back, and the second jaws."""
        if opened < 0.04:
            return
        inside = set(c.poly_mask([head(2, 5), head(44, 5.5), jaw(41, 0.5), jaw(8, 0)]))
        deep = head(9, 5.0 + 3.0 * opened)
        r = (0.12 + glow) * (3.0 + 6.0 * opened) if glow > 0.04 and not stone else 0.0  # nothing burns in a dead throat
        for x, y in inside:
            d = math.hypot(x - deep[0], y - deep[1])
            if d < r * 0.4:
                tone = ("light", 0)
            elif d < r * 0.7:
                tone = ("brass", 6)
            elif d < r:
                tone = ("brass", 4)
            elif d < r * 1.5:
                tone = ("crimson", 4)
            elif stone:
                tone = ("ink", 0)
            else:
                h = star(x, y) % 37
                tone = ("brass", 5) if h == 0 else ("crimson", 5) if h == 1 else ("crimson", 1)
            c.put(x, y, tone)
        if inner > 0.05:
            # The second jaws: a throat-stalk out of the gullet with its own small biting maw.
            ramp, idx, lit = ("ink", (1, 2, 4), ("ink", 5)) if stone else ("crimson", (2, 3, 5), ("brass", 5))
            ax = Turned(deep, heading + opened * JAW_SWING * 0.5)
            reach = 6.0 + 24.0 * inner
            c.limb(ax(0, 0), ax(reach, 0), 5.0, 4.0, ramp, idx)
            gape = 7.0 + 22.0 * inner
            for sgn in (-1, 1):
                m = Turned(ax(reach, 0), heading + opened * JAW_SWING * 0.5 + sgn * gape)
                fill(c, [m(-2, 0), m(0, sgn * 3.2), m(9, sgn * 2.0), m(11, sgn * 0.2), m(8, 0)], (ramp, idx[1]))
                stroke(c, [m(0, sgn * 3.2), m(9, sgn * 2.0)], lit)
                for tx_ in (3.0, 6.0, 9.0):
                    c.put(*m(tx_, -sgn * 0.8), ("bone", 7))
                    c.put(*m(tx_, -sgn * 1.8), ("bone", 6))

    def skull(self, c: Cel, head: Turned, hot, stone: bool) -> None:
        up = 1 if stone else 0  # stone is a step greyer than black iron
        fill(c, head.all(SKULL), ("ink", up))
        fill(c, head.all(CRANIUM), ("ink", 3 + up))
        fill(c, head.all(SNOUT), ("ink", 2 + up))
        fill(c, head.all(CHEEK), ("ink", 2 + up))
        # Lit upper halves of the plates, the grooves between them left black.
        fill(c, head.all([(-3, -7.5), (0, -11.5), (9, -13.5), (16.5, -11), (15, -9), (4, -8.5)]), ("ink", 5 + up))
        fill(c, head.all([(22, -8), (28, -7), (37, -2), (43.5, 0.8), (36, -0.6), (27, -4.5)]), ("ink", 4 + up))
        fill(c, head.all([(-3, -1), (10, -3), (22, -1), (33, 2.5), (30, 3.2), (10, 0.2), (-2, 1.2)]), ("ink", 3 + up))
        stroke(c, head.all([(-3, -1), (10, -3), (22, -1), (33, 2.5), (42, 4.3)]), ("ink", 5) if stone else ("brass", 5))
        for seam in SKULL_SEAMS:
            stroke(c, head.all(seam), ("ink", 0) if stone else ("crimson", 5))
        for crack in SKULL_CRACKS:
            stroke(c, head.all(crack), ("ink", 0) if stone else hot)
        stroke(c, head.all(SKULL_TOP), ("ink", 7) if stone else ("ink", 8))
        c.put(*head(43.5, 1.8), ("ink", 0))
        for x, n in UPPER_TEETH:
            fill(c, [head(x - 1.6, 4.6), head(x + 1.6, 4.6), head(x + 0.4, 5.0 + n)], ("bone", 5 if stone else 6))
            stroke(c, [head(x - 1.0, 5.0), head(x + 0.3, 4.6 + n)], ("bone", 3 if stone else 4))
            c.put(*head(x + 0.4, 4.6 + n), ("bone", 6 if stone else 7))

    def lower_jaw(self, c: Cel, jaw: Turned, hot, stone: bool) -> None:
        up = 1 if stone else 0
        for (p0, w0), (p1, w1) in zip(SPUR, SPUR[1:]):
            c.limb(jaw(*p0), jaw(*p1), w0, w1, "ink", (2, 4, 7))
        fill(c, jaw.all(JAW), ("ink", up))
        fill(c, jaw.all(JAW_PLATE), ("ink", 2 + up))
        fill(c, jaw.all([(3, 2), (33, 3.6), (40, 2.4), (36, 4.6), (16, 5.2), (5, 4)]), ("ink", 4 + up))
        stroke(c, jaw.all([(4, 2.6), (12, 4.2), (20, 3.6), (27, 5.2)]), ("ink", 0) if stone else hot)
        stroke(c, jaw.all([(-3, 3), (3, 6.5), (16, 9), (37, 7.5), (43, 3)]), ("ink", 5) if stone else ("brass", 5))
        for x, n in LOWER_TEETH:
            y0 = 0.4 + x * 0.03
            fill(c, [jaw(x - 1.6, y0 + 0.6), jaw(x + 1.6, y0 + 0.6), jaw(x + 0.4, y0 - n)], ("bone", 5 if stone else 6))
            stroke(c, [jaw(x - 1.0, y0), jaw(x + 0.3, y0 - n + 0.4)], ("bone", 3 if stone else 4))
            c.put(*jaw(x + 0.4, y0 - n + 0.4), ("bone", 6 if stone else 7))
        for x in (18.0, 26.0):  # chin barbs
            fill(c, [jaw(x - 1.5, 8.4), jaw(x + 1.5, 8.2), jaw(x - 1.0, 12.5)], ("ink", 5))

    @staticmethod
    def eyes(cel: Cel, head: Turned, lit: float, look: float) -> None:
        """White-hot eyes down the brow. `lit` counts them (4 = all); the big slit eye at the back is the last."""
        for n_, (x, y, big) in enumerate(EYES):
            level = max(0.0, min(1.0, lit - n_))
            if level < 0.08:
                continue
            core = ("light", 0) if level > 0.6 else ("brass", 5)
            halo = ("brass", 6) if level > 0.6 else ("crimson", 4)
            px, py = head(x, y)
            if big:
                # A reptile's eye: a bar of fire with a slit in it that follows the prey.
                for dx in range(-2, 4):
                    for dy in (-1, 0, 1):
                        edge = dx in (-2, 3) or (dy != 0 and dx in (-1, 2))
                        if edge and dy != 0 and dx in (-2, 3):
                            continue
                        cel.put(px + dx, py + dy, halo if edge else core)
                slit = 1 if look > 0.3 else 0
                for dy in (-1, 0, 1):
                    cel.put(px + slit, py + dy, ("ink", 0))
                for dx, dy in ((-3, 0), (4, 0), (0, -2), (1, -2), (0, 2), (1, 2)):
                    cel.soft(px + dx, py + dy, ("crimson", 5))
            else:
                cel.put(px, py, core)
                cel.put(px + 1, py, core)
                cel.put(px, py - 1, halo)
                cel.put(px + 1, py - 1, halo)
                cel.soft(px + 2, py, ("crimson", 5))

    @staticmethod
    def stump(c: Cel, at: Pt, toward: Pt, k: int) -> None:
        """Where the stone snapped, seen from the side: a ragged edge of fresh pale stone across the neck.
        `toward` is the next joint into the piece, so the teeth point out of it."""
        dx, dy = at[0] - toward[0], at[1] - toward[1]
        d = math.hypot(dx, dy) or 1.0
        F = Turned(at, math.degrees(math.atan2(dy, dx)))
        r = hw(k)
        teeth = [(-r, 3.4), (-r * 0.55, 1.2), (-r * 0.2, 4.6), (r * 0.25, 1.8), (r * 0.6, 3.8), (r, 1.0)]
        fill(c, [F(-2.0, -r)] + [F(h, y) for y, h in teeth] + [F(-2.0, r)], ("ink", 5))
        stroke(c, [F(h, y) for y, h in teeth], ("ink", 8))
        for y, h in teeth[1::2]:
            c.put(*F(h - 1.6, y), ("ink", 2))

    # ------------------------------------------------------------------------------------ the melt
    @staticmethod
    def pool_tones(heat: float):
        if heat >= 0.7:
            return ("brass", 5), ("light", 0), ("brass", 6)
        if heat >= 0.4:
            return ("crimson", 5), ("brass", 5), ("crimson", 5)
        if heat >= 0.15:
            return ("crimson", 3), ("crimson", 5), ("crimson", 4)
        return ("ink", 2), ("ink", 3), ("ink", 5)

    def pool_back(self, cel: Cel, rx: float, r: float, heat: float) -> None:
        """The split in the floor and the molten metal standing in it; a crust forms as it cools."""
        if r < 0.08:
            return
        outer, inner, _edge = self.pool_tones(heat)
        fill(cel, [(rx + x * r * S, GROUND + y) for x, y in POOL], outer)
        fill(cel, [(rx + x * r * S * 0.7, GROUND + y * 0.7) for x, y in POOL], inner)
        for n_, x in enumerate((-19, -11, 6, 15, 21)):  # slag crust floating on it; when it is cold, cracks that still glow a little
            cel.put(rx + x * r * S, GROUND + (n_ % 2), ("ink", 1) if heat >= 0.15 else ("crimson", 3))
            cel.put(rx + x * r * S + 1, GROUND + (n_ % 2), ("ink", 1) if heat >= 0.15 else ("crimson", 2))

    def pool_front(self, cel: Cel, rx: float, r: float, heat: float, wave) -> None:
        """In front of the neck: the iron floor plates buckled up round the melt, lit from below while it is hot."""
        if r < 0.08:
            return
        edge = self.pool_tones(heat)[2]
        if wave is not None:  # advancing: the floor ahead heaves up as the melt opens under it
            for n_, (x0, h) in enumerate(((43, 6.0), (52, 3.5))):
                up = h * (0.5 + 0.5 * math.sin(math.tau * (wave - n_ * 0.22)))
                slab = [(rx + (x0 - 5) * S, GROUND + 1), (rx + (x0 + 1) * S, GROUND - 2 - up), (rx + (x0 + 7) * S, GROUND + 1)]
                fill(cel, slab, ("ink", 2))
                stroke(cel, [slab[0], slab[1]], edge)
        for n_, (x0, x1, xp, h) in enumerate(LIPS):
            # A floor plate prised up by the melt: its outer edge still on the ground, its inner edge lifted.
            k = r * (1.0 + (0.3 * math.sin(math.tau * wave + n_ * 1.7) if wave is not None else 0.0))
            sg = 1.0 if x0 > 0 else -1.0
            lift = (h * 1.15 + 2.0) * k * S
            out_, in_ = (rx + (x1 + sg * 3) * r * S, GROUND + 1.0), (rx + (x0 - sg * 1) * r * S, GROUND - lift)
            under = (in_[0] + sg * 0.8, in_[1] + 3.4)
            fill(cel, [out_, in_, under, (out_[0], GROUND + 2.0), (in_[0], GROUND + 2.0)], ("ink", 1))  # the dark under it
            fill(cel, [out_, in_, under, (out_[0] - sg * 3.0, GROUND + 1.0)], ("ink", 3))
            stroke(cel, [out_, in_], ("ink", 6))  # its top face catches the sky
            stroke(cel, [in_, under], edge)  # its broken end is lit by the melt
            for t in (0.3, 0.62):
                cel.put(out_[0] + (in_[0] - out_[0]) * t, out_[1] + (in_[1] - out_[1]) * t + 1.4, ("ink", 7))  # rivets

    @staticmethod
    def fire(cel: Cel, rx: float, r: float, heat: float, ph: float, glow: float) -> None:
        """Fire standing up out of the melt behind the neck, and embers climbing in the heat. Painted only where
        nothing else is, so it sits behind the beast and the floor plates."""
        if r < 0.08 or heat < 0.12:
            return
        span = int(34 * r * S)
        for i in range(-span, span + 1):
            n = int((13 + star(i, 5) % 15) * (0.7 + 0.7 * glow) * heat * (1.0 - abs(i) / (70.0 * S)))
            n += (star(i, int(ph * 16)) % 3) - 1
            for j in range(n):
                tone = ("brass", 6) if j < n * 0.25 else ("brass", 4) if j < n * 0.5 else ("crimson", 4) if j < n * 0.8 else ("crimson", 2)
                cel.soft(rx + i, GROUND - 1 - j, tone)
        for n_ in range(12):
            if (star(n_, 13) % 10) / 10 > heat:
                continue
            u = (ph + star(n_, 2) % 100 / 100.0) % 1.0
            x = rx + (star(n_, 9) % 60 - 30) * r * S + 3.0 * math.sin(math.tau * (u * 2 + n_ * 0.3))
            y = GROUND - 6 - u * (30 + star(n_, 4) % 26)
            cel.soft(x, y, ("light", 0) if u < 0.2 else ("brass", 6) if u < 0.5 else ("crimson", 5))
            if u < 0.35:
                cel.soft(x, y + 1, ("brass", 5))

    @staticmethod
    def trail(cel: Cel, rx: float, ph: float) -> None:
        """As it advances the floor splits ahead of the melt, and behind it the melt cools to a scar of slag,
        still glowing nearest the beast, and clinker is thrown back."""
        for i in range(25, 52):
            if (i + int(ph * 12)) % 5 != 0:
                tone = ("brass", 6) if i < 32 else ("crimson", 5) if i < 42 else ("crimson", 3)
                cel.soft(rx - i, GROUND - 1, tone)
                if i < 38:
                    cel.soft(rx - i, GROUND - 2 + (2 if i % 6 == 0 else 0), tone)
            else:
                cel.soft(rx - i, GROUND - 1, ("ink", 2))
        for n_ in range(9):
            u = (ph + n_ / 9.0) % 1.0
            x = rx - 22 - u * 26 - (star(n_, 4) % 6)
            y = GROUND - 3 - math.sin(math.pi * u) * (8 + star(n_, 6) % 10)
            cel.soft(x, y, ("ink", 5) if n_ % 2 else ("brass", 6))
            cel.soft(x + 1, y, ("ink", 4))
            cel.soft(x, y + 1, ("crimson", 4))
        # Ahead: a glowing crack running forward under the plates.
        reach = 36 + int(5 * math.sin(math.tau * ph))
        for i in range(33, reach + 10):
            cel.soft(rx + i, GROUND - 1 + (1 if i % 4 == 0 else 0), ("brass", 6) if i < reach else ("crimson", 4))

    @staticmethod
    def burst_solid(cel: Cel, ix: float, u: float) -> None:
        """The floor where the bite lands: iron plates thrown up and lava fountaining out of the break."""
        tmp = Cel(cel.w, cel.h, cel.top)
        up = math.sin(math.pi * min(1.0, u * 1.15)) ** 0.6
        for n_, (off, size, tilt) in enumerate(((-33, 10, -38), (-22, 9, -26), (-10, 8, -14), (5, 9, 20), (12, 8, 34))):
            F = Turned((ix + off + (off * 0.25) * u, GROUND - 2 - (10 + n_ % 3 * 6) * up), tilt * (0.4 + u))
            slab = [F(-size / 2, -2), F(size / 2, -2.5), F(size / 2 + 1, 2), F(-size / 2, 2.5)]
            fill(tmp, slab, ("ink", 2))
            fill(tmp, [slab[0], slab[1], F(size / 2, -0.5), F(-size / 2, -0.2)], ("ink", 4))
            stroke(tmp, [slab[3], slab[2]], ("brass", 6))  # lit from the lava below
            tmp.put(*F(0, 0.4), ("ink", 6))
        rise = min(1.0, u / 0.22) * (1.0 - max(0.0, (u - 0.72) / 0.28) ** 2)
        for off, h, lean in ((-36, 12, -4), (-26, 22, -3), (-15, 33, -2), (-5, 21, 0), (4, 28, 2), (9, 15, 2)):
            hh = h * rise
            if hh < 2:
                continue
            x, tip = ix + off, (ix + off + lean, GROUND - hh)
            fill(tmp, [(x - 4.0, GROUND + 2), tip, (x + 4.0, GROUND + 2)], ("crimson", 4))
            fill(tmp, [(x - 2.6, GROUND + 2), (tip[0], tip[1] + hh * 0.18), (x + 2.6, GROUND + 2)], ("brass", 5))
            fill(tmp, [(x - 1.3, GROUND + 2), (tip[0], tip[1] + hh * 0.4), (x + 1.3, GROUND + 2)], ("brass", 7))
            tmp.put(tip[0], tip[1], ("brass", 6))
            # A gout thrown clear of the jet.
            tmp.put(tip[0] + lean, tip[1] - 3 - hh * 0.1, ("brass", 6))
            tmp.put(tip[0] + lean, tip[1] - 2 - hh * 0.1, ("crimson", 5))
        for (x, y), t in tmp.px.items():
            if y < GROUND:
                cel.px[(x, y)] = t

    @staticmethod
    def burst_light(cel: Cel, ix: float, u: float) -> None:
        tone = ("light", 0) if u < 0.3 else ("brass", 6) if u < 0.65 else ("crimson", 5)
        if u < 0.5:  # firelight glaring up out of the broken floor
            for i in range(-36, 13, 2):
                n = int((13 - abs(i + 12) * 0.3) * (1 - u * 2) + star(i, 8) % 4)
                for j in range(max(0, n)):
                    cel.soft(ix + i, GROUND - 2 - j, ("light", 0) if j < n * 0.3 else ("brass", 6) if j < n * 0.7 else ("crimson", 5))
        reach = int(44 * min(1.0, 0.3 + u * 2.2))
        for i in range(reach):
            for sgn in (-1, 1):
                if sgn > 0 and i > 15:  # the break runs back towards the beast, not on towards the others
                    continue
                x = ix + sgn * i
                cel.soft(x, GROUND - 1 + (1 if (i * 5 + (sgn > 0)) % 4 == 0 else 0), tone)
                if i % 3 == 0 and u < 0.6:
                    cel.soft(x, GROUND - 2 - (i % 2), ("brass", 6))
        if u < 0.28:
            cel.star(ix - 4, GROUND - 5, 7)
        for n_ in range(14):
            ang = math.radians(-168 + n_ * 12.5)
            dist = 5 + (15 + star(n_, 3) % 9) * u
            x = ix + math.cos(ang) * dist * (1.3 if math.cos(ang) < 0 else 0.5)
            y = GROUND - 2 + math.sin(ang) * dist + 12 * u * u
            if y < GROUND - 1:
                cel.soft(x, y, ("brass", 6) if n_ % 3 == 0 else ("crimson", 5) if n_ % 3 == 1 else ("ink", 5))
                if u < 0.6:
                    cel.soft(x + 1, y, ("brass", 5) if n_ % 3 == 0 else ("ink", 4))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, tip=(54.0, 66.0), tdir=48.0, head=24.0, a0=-97.0, lift=96.0, bow=40.0, jaw=0.2, jaw2=0.0, glow=0.4, eyes=4.0, look=1.0,
                  blaze=0.0, rift=1.0, heat=1.0, cool=0.0, float=0.0, und=0.0, und_a=1.6, crack=0.0, dust=0.0, snap=0.0, fract=0.0, trail=0.0,
                  cut=0.0, stand=0.0, end=(0.0, 0.0), flash=0.0)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    slow = math.sin(math.tau * (ph - 0.35))
    # It hangs over them and breathes fire-light; the head weaves a little, as a snake's does before it decides.
    breath = 0.5 + 0.5 * math.sin(math.tau * 2 * ph)
    return {**BASE, "tip": (54.0 + 4.0 * s, 66.0 + 3.0 * math.sin(math.tau * 2 * (ph - 0.1))), "head": 24.0 + 6.0 * late, "tdir": 48.0 + 5.0 * slow,
            "a0": -97.0 + 2.0 * slow, "jaw": 0.16 + 0.1 * breath, "glow": 0.35 + 0.35 * breath, "blaze": 0.25 * breath, "und": ph, "float": ph,
            "look": 1.0 if s > -0.4 else 0.0}


def advance_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    c2 = math.cos(math.tau * 2 * ph)
    # It hauls the melt forward under it: the neck leans in and a wave runs up it; the floor cools behind.
    return {**BASE, "tip": (56.0 + 6.0 * s, 60.0 + 4.0 * c2), "head": 30.0 + 4.0 * math.sin(math.tau * (ph - 0.2)), "tdir": 54.0 + 4.0 * s, "a0": -88.0 + 4.0 * s,
            "lift": 90.0, "jaw": 0.16 + 0.1 * (0.5 + 0.5 * c2), "glow": 0.5, "blaze": 0.2, "und": ph, "und_a": 3.4, "float": ph, "trail": 1.0}


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Strike: it draws back and up, the jaws unhinge and the second jaws come out, it hangs there with the furnace in
# its throat roaring — and then the whole neck comes down and the head buries its teeth in the floor, which bursts.
_BITE = dict(tip=(72.0, 52.0), tdir=78.0, head=60.0, a0=-80.0, lift=84.0, bow=30.0, jaw=0.28, glow=1.0, blaze=0.6, und_a=0.0)
STRIKE_KEYS = [
    (0.00, k(), "lin"),
    (0.14, k(tip=(36.0, 80.0), tdir=20.0, head=4.0, a0=-104.0, jaw=0.3, glow=0.6, und_a=1.0), "out"),
    (0.28, k(tip=(12.0, 86.0), tdir=-8.0, head=-12.0, a0=-112.0, lift=88.0, bow=34.0, jaw=0.8, jaw2=0.35, glow=0.85, blaze=0.4, und_a=0.6), "out"),
    (0.42, k(tip=(6.0, 88.0), tdir=-14.0, head=-18.0, a0=-114.0, lift=88.0, bow=34.0, jaw=1.0, jaw2=1.0, glow=1.0, blaze=1.0, und_a=0.4), "io"),
    (0.47, k(tip=(56.0, 72.0), tdir=46.0, head=38.0, a0=-92.0, lift=90.0, bow=34.0, jaw=1.0, jaw2=0.5, glow=1.0, blaze=0.8, und_a=0.0), "in"),
    (0.51, k(**_BITE, crack=0.02), "lin"),
    (0.58, k(**{**_BITE, "tip": (73.0, 50.0), "head": 62.0, "jaw": 0.2}, crack=0.3), "out"),
    (0.72, k(**{**_BITE, "tip": (73.0, 50.0), "head": 62.0, "jaw": 0.2, "blaze": 0.3}, crack=0.7), "lin"),
    (0.84, k(tip=(64.0, 58.0), tdir=62.0, head=44.0, a0=-88.0, jaw=0.4, glow=0.7, blaze=0.1, crack=0.98), "io"),
    (1.00, k(crack=1.0), "io"),
]

# Hit: the head is knocked up and back, the eyes shut, every seam flares; it comes back down snarling.
HURT_KEYS = [
    (0.00, k(), "lin"),
    (0.07, k(tip=(50.0, 68.0), tdir=40.0, head=10.0, jaw=0.35, eyes=0.0, blaze=0.8, flash=1.0), "out3"),
    (0.16, k(tip=(42.0, 77.0), tdir=28.0, head=-6.0, a0=-103.0, jaw=0.7, eyes=0.0, blaze=1.0, flash=0.5), "lin"),
    (0.26, k(tip=(32.0, 80.0), tdir=16.0, head=-14.0, a0=-106.0, jaw=0.9, jaw2=0.3, eyes=1.0, blaze=0.7, glow=0.8), "out"),
    (0.50, k(tip=(60.0, 58.0), tdir=54.0, head=36.0, a0=-93.0, jaw=0.5, jaw2=0.1, eyes=4.0, blaze=0.3, glow=0.8), "io"),
    (0.74, k(tip=(57.0, 63.0), tdir=50.0, head=29.0, jaw=0.2, glow=0.5), "io"),
    (1.00, k(), "io"),
]

# Death: it goes out. It thrashes with every seam blazing; then the melt crusts over and the cold climbs the neck
# from the floor, ring by ring, and catches it in its last roar; the eyes go out one by one. It stands a moment
# as grey stone. A crack runs across the neck above the collar, the head breaks off and falls, and what is left
# is a column of slag with the collar and its chain still on it.
_ROAR = dict(**FROZEN, head=-10.0, und_a=0.0, rift=1.0)
_PIECE = dict(cut=float(RINGS - BREAK), stand=1.0, cool=1.0, heat=0.0, glow=0.0, blaze=0.0, eyes=0.0, und_a=0.0, fract=1.0)
_LIE = dict(**_PIECE, tip=(50.0, 18.0), tdir=8.0, head=-20.0, a0=-5.0, lift=18.0, bow=18.0, end=(6.0, 11.0))
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.04, k(tip=(46.0, 76.0), tdir=26.0, head=-8.0, jaw=0.6, blaze=0.6, flash=1.0, glow=0.7), "out3"),
    (0.09, k(tip=(64.0, 54.0), tdir=58.0, head=40.0, a0=-90.0, jaw=0.25, blaze=1.0, und_a=4.0, und=0.3), "io"),
    (0.14, k(tip=(36.0, 84.0), tdir=12.0, head=0.0, a0=-105.0, jaw=0.9, jaw2=0.6, blaze=1.0, glow=1.0, und_a=4.0, und=0.6), "io"),
    (0.20, k(tip=(58.0, 62.0), tdir=50.0, head=30.0, a0=-93.0, jaw=0.4, blaze=0.8, glow=0.9, und_a=3.0, und=0.9, heat=0.8), "io"),
    (0.28, k(tip=(34.0, 82.0), tdir=14.0, head=-4.0, a0=-103.0, lift=90.0, bow=36.0, jaw=0.8, jaw2=0.5, glow=0.9, blaze=0.6, heat=0.55, cool=0.15,
             und_a=1.5, und=1.1), "io"),
    (0.36, k(**_ROAR, jaw=1.0, jaw2=0.8, glow=0.7, blaze=0.4, heat=0.3, cool=0.45), "out"),
    (0.44, k(**_ROAR, jaw=1.0, jaw2=0.7, glow=0.45, blaze=0.15, heat=0.12, cool=0.75, eyes=3.0), "lin"),
    (0.52, k(**_ROAR, jaw=1.0, jaw2=0.6, glow=0.1, heat=0.0, cool=1.0, eyes=1.0), "lin"),
    (0.58, k(**_ROAR, jaw=1.0, jaw2=0.6, glow=0.0, heat=0.0, cool=1.0, eyes=0.0), "lin"),
    (0.64, k(**_ROAR, jaw=1.0, jaw2=0.6, glow=0.0, heat=0.0, cool=1.0, eyes=0.0, fract=1.0), "lin"),
    (0.68, k(**_PIECE, tip=(32.0, 80.0), tdir=14.0, head=-6.0, a0=BREAK_DIR, lift=14.0, bow=14.0, end=(BREAK_AT[0] + 1.0, BREAK_AT[1] - 3.0), jaw=1.0, jaw2=0.5,
             snap=0.02), "lin"),
    (0.74, k(**_PIECE, tip=(46.0, 56.0), tdir=30.0, head=18.0, a0=-50.0, lift=15.0, bow=15.0, end=(20.0, 60.0), jaw=0.9, jaw2=0.2, snap=0.5), "in"),
    (0.80, k(**{**_LIE, "tip": (50.0, 14.0), "head": -8.0, "tdir": 4.0, "end": (7.0, 10.0)}, jaw=0.35, snap=0.98, dust=0.02), "in"),
    (0.85, k(**{**_LIE, "tip": (50.0, 24.0), "head": -14.0, "end": (7.0, 13.0)}, jaw=0.6, snap=1.0, dust=0.4), "out"),
    (0.90, k(**_LIE, jaw=0.78, snap=1.0, dust=0.8), "in"),
    (1.00, k(**_LIE, jaw=0.85, snap=1.0, dust=1.0), "lin"),
]

STILL = lambda t: (-0.25 + 0.15 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 16 for i in range(16)], [150] * 16, True, STILL),
    "run": Anim("run", advance_pose, [i / 12 for i in range(12)], [110] * 12, True, lambda t: (-0.8, 0.0)),
    "attack": Anim("attack", keyed(STRIKE_KEYS), [0.0, 0.07, 0.14, 0.21, 0.28, 0.35, 0.42, 0.47, 0.51, 0.545, 0.58, 0.65, 0.72, 0.78, 0.84, 0.92, 1.0],
                   [100, 100, 110, 110, 130, 170, 220, 45, 60, 80, 90, 100, 120, 110, 110, 110, 120], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.04, 0.065, 0.09, 0.115, 0.14, 0.17, 0.20, 0.24, 0.28, 0.32, 0.36, 0.40, 0.44, 0.48, 0.52, 0.58, 0.64,
                                               0.68, 0.71, 0.74, 0.77, 0.80, 0.85, 0.90, 1.0],
                  [60, 70, 80, 90, 80, 100, 80, 100, 100, 120, 130, 150, 160, 170, 170, 180, 260, 320, 60, 60, 60, 60, 70, 90, 140, 1500], False, STILL),
}
