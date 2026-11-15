"""The Ninth Wave — world 6, WORLD boss. The sea that drowned the city, come ashore wearing its king.

Sailors count the waves: the ninth is the one that takes the ship. This one took a city, and it has not gone back
out. It stands on the causeway as tall as the strip — a single wave that never breaks, wine-dark (the old poets'
sea), its crest curling over whoever stands in front of it, foam clawing at the lip. It has no face of its own, so
it wears one: in the hollow under the curl hangs the marble HELM of the colossus that lies toppled out in the bay,
tilted down at the prey, the dark inside it full of the same water, two cold lights far back in the eye-holes (the
pale eyes that open out at sea in Torment are these). And it has the statue's HANDS: two colossal marble hands,
broken off at the wrist, carried on arms of water — one planted on the stones, fingers dug in, the other poised
like a claw under the helm.

It comes on by hauling itself along on those hands, the whole wave heaving and crashing forward after them. Attack:
the wave draws itself up to the very top of the strip, the claw goes up and back — and all of it comes down, the
marble palm flat on the stones in front of the prey, the crest breaking over it in a wall of spray. Hit: the crest
is knocked to spray, the helm rocks back, the lights gutter. Death: the tide goes OUT. The lights go dark, the wave
loses its shape and sinks, and the things it carried are simply dropped: the helm tumbles down, rolls onto its back
and lies there as it lay in the bay, the hands fall open; the water runs off the causeway and what is left is a
ruin — a marble helm, two hands, a puddle and a line of foam.

Own rig (nothing of the humanoid skeleton). Frame 248 wide with 59 extra rows above, root at 104; the foot of the
wave stands 16 px ahead of the root and, below the Knight's height, nothing passes 36 px (the planted fingers and
the tips of the claw). The helm and the lip hang over the Knight's head. The palm lands just short of him (wrist
29 px ahead, fingertips at 49) with the spray on him. Nothing is a rotated sprite: helm and hands are drawn as shapes at whatever
angle they are, so they stay crisp when they turn. Drawn facing right; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Character, Pose, Pt, keyed, lerp, swing_smear

FIGURE = ("NinthWave", "boss", "w06")

ROOT_X = 104
BUILD = Build(root_x=ROOT_X, thigh=1.0, shin=1.0, foot=0.0, hip_dx=0.0, spine=0.0, sh_near=0.0, sh_far=0.0, upper=1.0, fore=1.0, neck=0.0)

#: The wave at rest, in its own space (u forward from the root, v up). BACK runs from the tail up the slope to the
#: tip of the lip; FRONT from the tip down the hollow face to the foot.
BACK = [(-95, 0), (-87, 4), (-76, 10), (-68, 15), (-63, 26), (-55, 32), (-49, 35), (-41, 49), (-37, 63), (-29, 73), (-24, 83), (-17, 95), (-7, 105), (5, 111),
        (18, 114), (32, 113), (45, 108), (54, 98)]
FRONT = [(54, 98), (49, 93), (42, 94), (33, 97), (23, 97), (15, 92), (11, 80), (10, 64), (10, 46), (10, 30), (11, 16), (13, 6), (16, 0)]
LIP_BACK = {15: 0.35, 16: 0.75, 17: 1.0}  # how much of the curl each point of BACK takes
LIP_FRONT = {0: 1.0, 1: 0.9, 2: 0.7, 3: 0.4, 4: 0.15}
#: Where smaller crests ride up its back (indices into BACK): each puts out its own claws of foam.
RIDGES = (5, 9)
TOP = 122.0  # nothing of the water rises past this

#: Where the helm hangs and where the arms of water leave the body, in wave space.
HELM_AT = (25.0, 75.0)
HELM_TILT = 34.0  # clockwise: it looks down at the prey
SH_CLAW, SH_PLANT = (11.0, 55.0), (9.0, 24.0)

WATER = "azure"
VOID = ("azure", 0)
FOAM = ("bone", 7)


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


def _raster(pts: list[Pt]) -> set[tuple[int, int]]:
    line = Cel(4096, 4096, 4096)
    for a, b in zip(pts, pts[1:]):
        line.line(a, b, VOID)
    return set(line.px)


def _spread(mask: set[tuple[int, int]], seeds: set[tuple[int, int]], limit: int) -> dict[tuple[int, int], int]:
    """How far every pixel of `mask` is from the seed line (steps), up to `limit`."""
    dist: dict[tuple[int, int], int] = {}
    front: list[tuple[int, int]] = []
    for x, y in seeds:
        for p in ((x, y), (x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if p in mask and p not in dist:
                dist[p] = 0
                front.append(p)
    d = 0
    while front and d < limit:
        d += 1
        nxt: list[tuple[int, int]] = []
        for x, y in front:
            for p in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if p in mask and p not in dist:
                    dist[p] = d
                    nxt.append(p)
        front = nxt
    return dist


def marble(cel: Cel, pts: list[Pt], c: Pt, r: float, lo: int = 3, shade: int = 0) -> set[tuple[int, int]]:
    """A marble form: lit from the upper right round the point `c`, shadowed away from it."""
    mask = cel.poly_mask(pts)
    for x, y in mask:
        s = ((x + 0.5 - c[0]) * 0.55 - (y + 0.5 - c[1]) * 0.83) / r
        i = 7 if s > 0.5 else 6 if s > 0.12 else 5 if s > -0.25 else 4 if s > -0.62 else 3
        cel.put(x, y, ("bone", max(lo, i - shade)))
    return set(mask)


class NinthWave(Character):
    build = BUILD
    W = 248
    TOP = 59

    # ------------------------------------------------------------------------------------------------- skeleton
    def joints(self, pose: Pose) -> dict:
        sag, drain = pose["sag"], pose["drain"]
        hfac = pose["rise"] * (1.0 - 0.9 * sag) * (1.0 - 0.55 * drain)
        wfac = 1.0 - 0.86 * drain
        mid = -44.0  # what is left of the water gathers here as it runs off

        def T(u: float, v: float, lip: float = 0.0) -> Pt:
            h = v * hfac
            if u < 12.0:  # sinking, the wave spreads out behind
                u = u - sag * 14.0 * _clamp(-u / 60.0 + 0.2)
            else:  # and its lip falls in: nothing is left hanging out in front
                u = 12.0 + (u - 12.0) * (1.0 - sag) ** 2
            x = pose["dx"] + mid + (u - mid) * wfac + pose["lean"] * (_clamp(h / 100.0, 0.0, 1.3) ** 1.5) * (1.0 - 0.7 * sag)
            x += lip * pose["curl_x"] * (1.0 - sag)
            h += lip * pose["curl_y"] * (1.0 - sag)
            return P(x, min(TOP, max(0.0, h)))

        J: dict = {"T": T, "pelvis": P(pose["dx"], 30.0), "lean": (0.0, 0.0)}
        J["back"] = _smooth([T(u, v, LIP_BACK.get(i, 0.0)) for i, (u, v) in enumerate(BACK)])
        J["front"] = _smooth([T(u, v, LIP_FRONT.get(i, 0.0)) for i, (u, v) in enumerate(FRONT)])
        # The helm rides in the hollow until the water lets it go.
        held = T(HELM_AT[0] + pose["helm_du"], HELM_AT[1] + pose["helm_dv"], 0.3)
        w = pose["helm_free"]
        hx, hup = pose["helm_at"]
        J["helm"] = (lerp(held[0], ROOT_X + hx, w), lerp(held[1], GROUND - hup, w))
        J["shC"], J["shP"] = T(*SH_CLAW), T(*SH_PLANT)
        cx, cup = pose["claw"]
        J["wrC"] = P(cx, cup)
        px, pup = pose["plant"]
        J["wrP"] = P(px, pup)
        return J

    # ------------------------------------------------------------------------------------------------- water
    def water(self, cel: Cel, J: dict, pose: Pose) -> None:
        """The wave: deep blue, banded with its own current the way the old prints draw the sea, the hollow under
        its curl in shadow, the thin of its crest green with the light through it, foam along its back, on its lip
        and round its foot."""
        back, front = J["back"], J["front"]
        mask = {p for p in cel.poly_mask(back + front[1:]) if p[1] < GROUND}
        if not mask:
            return
        db = _spread(mask, _raster(back), 40)
        df = _spread(mask, _raster(front), 16)
        flow = int(round(pose["flow"] * 46.0))
        fall = int(round(pose["flow"] * 36.0))
        low = pose["sag"] > 0.55  # no longer a wave: a sheet of water running off
        top = min(y for _, y in mask)
        tip = back[-1]
        for x, y in mask:
            b, f = db.get((x, y), 40), df.get((x, y), 16)
            up = GROUND - y
            arc = x - y  # runs up the slope
            t = 4 if b <= 3 else 3 if b <= 10 else 2 if b <= 24 else 1
            tone = (WATER, t)
            band = next((v for v in (5, 12, 20, 29, 37) if v <= b <= v + 1), 0)
            if band:  # the bands of the current, running up it
                if (arc - flow + band * 7) % 23 >= 4:
                    tone = (WATER, t + 1)
                if b == band and band in (5, 20) and (arc - flow * 2 + band * 3) % 46 < 15:
                    tone = ("azure", 7)  # a vein of foam carried up
                elif b == band and band in (12, 29) and (arc - flow * 2 + band * 3) % 46 < 6:
                    tone = ("azure", 6)
            near_lip = x > tip[0] - 34 and y < tip[1] + 22 and not low
            if near_lip and 2 <= b <= 7 and f > 2:  # the thin of the crest: the light comes through it green
                tone = ("sea", 6 if b <= 3 else 5 if b <= 5 else 4)
            if f < 14 and b > 1 and not low:  # the hollow under the curl, the water falling down its face
                tone = (WATER, 0 if f < 5 else 1)
                if f in (3, 8, 12) and (y * 2 - fall + f * 5) % 18 < 9:
                    tone = (WATER, 2 if f > 3 else 1)
            high = (y - top) < 0.66 * (GROUND - top) + (_hash(x // 5, 3) % 9)
            if b == 0:
                tone = (("light", 0) if _hash(x + flow // 5, y) % 3 == 0 else FOAM) if high else ("azure", 7) if _hash(x // 2 + flow // 9, 1) % 3 else (WATER, 5)
            elif b == 1 and high:
                tone = FOAM if (x + y + flow // 6) % 4 else ("azure", 7)
            elif b == 2 and high and _hash(x // 2 + flow // 8, y // 2) % 3 == 0:
                tone = ("azure", 7 if (x + y) % 2 else 6)
            lump = max(1, int(2.2 + 1.5 * math.sin(x * 0.55 + pose["flow"] * math.tau * 2) + 1.1 * math.sin(x * 1.37 + 2.0)))  # where it stands on the stones: a boil of foam
            if up <= lump:
                tone = FOAM if up < lump or lump == 1 else ("azure", 7)
            elif up <= lump + 2 and _hash((x - flow // 3) // 2, y) % 3 == 0:
                tone = ("azure", 6)
            cel.put(x, y, tone)

    def lip_foam(self, cel: Cel, J: dict, pose: Pose) -> None:
        """The claws of foam the crest puts out over whatever is under it — and the smaller ones of the crests that
        ride up its back."""
        if pose["sag"] > 0.25:
            return
        back = J["back"]
        n = len(back)
        reach = pose["claws"]
        spots = [(n - 1 - k * 3, 1.0, k) for k in range(7)] + [(r * 4 + q * 3, 0.55, q + 3 * r) for r in RIDGES for q in range(3)]
        for i, size, k in spots:
            if i < 2 or i >= n:
                continue
            p, q = back[i], back[i - 2]
            d = (p[0] - q[0], p[1] - q[1])
            L = math.hypot(*d) or 1.0
            d = (d[0] / L, d[1] / L)
            flex = math.sin(math.tau * (pose["flow"] * 2 + k * 0.17))
            length = (5.5 + (k * 3 % 4) * 1.6 + flex * 1.0) * reach * size
            a = p
            for seg in range(3):  # it hooks over and down
                v = _turn(d, (24.0 if size == 1.0 else -30.0) + seg * 36.0 + k * 4.0 - 8.0 * flex)
                b = (a[0] + v[0] * length / 3, a[1] + v[1] * length / 3)
                cel.limb(a, b, (3.0 - seg * 0.6) * (0.7 + 0.3 * size), (2.3 - seg * 0.6) * (0.7 + 0.3 * size), "bone", (5, 7, 7))
                a = b
            cel.put(a[0], a[1], ("light", 0))
            cel.put(a[0], a[1] + 1, ("azure", 7))

    def arm(self, cel: Cel, a: Pt, b: Pt, w0: float, w1: float, sag: float, pose: Pose) -> None:
        """An arm of water from the body to a wrist: a rope of the same sea, foam where it grips the marble."""
        if pose["arms"] < 0.05:
            return
        k = pose["arms"]
        c = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + sag)
        prev = a
        for i in range(1, 9):
            t = i / 8
            p = ((1 - t) ** 2 * a[0] + 2 * t * (1 - t) * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * t * (1 - t) * c[1] + t * t * b[1])
            cel.limb(prev, p, lerp(w0, w1, (i - 1) / 8) * k, lerp(w0, w1, t) * k, WATER, (1, 3, 4))
            if i % 2 and k > 0.5:  # the current runs down it too
                cel.put((prev[0] + p[0]) / 2 + 1, (prev[1] + p[1]) / 2 - 1, ("azure", 7) if (i + int(pose["flow"] * 16)) % 4 < 2 else (WATER, 5))
            prev = p
        for i in range(-3, 4):  # the cuff of foam round the wrist
            d = (b[0] - c[0], b[1] - c[1])
            L = math.hypot(*d) or 1.0
            cel.put(b[0] - d[1] / L * i * 1.2 * k - d[0] / L * 1.5, b[1] + d[0] / L * i * 1.2 * k - d[1] / L * 1.5, FOAM if i % 2 else ("azure", 7))

    # ------------------------------------------------------------------------------------------------- marble
    def hand(self, cel: Cel, wr: Pt, ang: float, curl: float, palm: float = 1.0, scale: float = 1.0) -> Pt:
        """A colossal marble hand seen from the side, broken off at the wrist. It points along `ang` (degrees
        clockwise from "ahead"); `curl` hooks the fingers towards the palm, which faces down (`palm` 1) or up
        (−1). Returns where the fingertips are."""
        d = _turn((1.0, 0.0), ang)
        n = _turn((0.0, palm), ang)

        def H(f: float, s: float) -> Pt:
            return (wr[0] + (d[0] * f + n[0] * s) * scale, wr[1] + (d[1] * f + n[1] * s) * scale)

        part = Cel(cel.w, cel.h, cel.top)
        # The stump: where it broke from the statue.
        marble(part, [H(-6.5, -3.4), H(-4.5, -1.0), H(-6.0, 0.6), H(-3.5, 2.2), H(-5.5, 3.6), H(0.0, 4.2), H(0.0, -4.2)], H(0.0, -2.0), 9.0 * scale, shade=1)
        # The back of the hand and the heel of the palm.
        body = [H(-1.0, -4.4), H(4.0, -5.2), H(10.5, -4.0), H(12.0, -1.0), H(11.0, 2.6), H(5.0, 4.8), H(-1.0, 4.4)]
        marble(part, body, H(6.0, -6.0), 11.0 * scale)
        tip = H(12.0, 0.0)
        for i in range(4):  # the fingers, the far ones first
            base = H(10.5 + (3 - i) * 0.5, -2.4 + i * 1.5)
            far = i < 2
            a1 = ang + palm * (curl * 38.0 + (3 - i) * 4.0)
            a2 = ang + palm * (curl * 104.0 + (3 - i) * 7.0 + 6.0)
            l1, l2 = (7.0 + (1.2 if i in (1, 2) else 0.0)) * scale, (6.0 + (0.8 if i in (1, 2) else 0.0)) * scale
            v1, v2 = _turn((1.0, 0.0), a1), _turn((1.0, 0.0), a2)
            m = (base[0] + v1[0] * l1, base[1] + v1[1] * l1)
            e = (m[0] + v2[0] * l2, m[1] + v2[1] * l2)
            tones = (3, 5, 6) if far else (4, 6, 7)
            part.limb(base, m, 3.7 * scale, 3.3 * scale, "bone", tones)
            part.limb(m, e, 3.3 * scale, 2.3 * scale, "bone", tones)
            part.put(m[0], m[1], ("bone", 3 if far else 4))  # the knuckle's crease
            if i == 2:
                tip = e
        # The thumb, on the near side, under the palm.
        t0 = H(3.0, 3.2)
        v1, v2 = _turn((1.0, 0.0), ang + palm * (48.0 + curl * 26.0)), _turn((1.0, 0.0), ang + palm * (14.0 + curl * 70.0))
        t1 = (t0[0] + v1[0] * 5.6 * scale, t0[1] + v1[1] * 5.6 * scale)
        t2 = (t1[0] + v2[0] * 4.6 * scale, t1[1] + v2[1] * 4.6 * scale)
        part.limb(t0, t1, 4.2 * scale, 3.4 * scale, "bone", (4, 6, 7))
        part.limb(t1, t2, 3.2 * scale, 2.2 * scale, "bone", (4, 6, 7))
        # What the sea has done to it: a crack across the back, weed in the break.
        part.line(H(3.0, -4.6), H(5.5, -1.0), ("bone", 3))
        part.line(H(5.5, -1.0), H(4.5, 2.0), ("bone", 3))
        part.put(*H(-5.0, 1.5), ("moss", 4))
        part.put(*H(-4.0, -2.0), ("moss", 3))
        for xy in [xy for xy in part.px if xy[1] >= GROUND]:
            del part.px[xy]
        cel.px.update(part.px)
        return tip

    def helm(self, cel: Cel, J: dict, pose: Pose) -> None:
        """The helm of the colossus: a marble Corinthian helm as tall as a man, cracked, its crest long gone, the
        dark of its eye-holes and its slit full of the sea — and two cold lights far back in it."""
        rot = HELM_TILT + pose["helm_rot"]
        at = J["helm"]

        def raw(hx: float, hy: float) -> Pt:
            v = _turn((hx, -hy), rot)
            return (at[0] + v[0], at[1] + v[1])

        shell_l = [(-22, -15), (-16, -11), (-15, -3), (-16, 5), (-14, 12), (-9, 17), (-2, 20), (6, 20), (12, 17), (16, 12), (18.5, 6), (19, 0),
                   (18.5, -6), (18, -13), (15.5, -20), (12, -24), (8, -23), (4, -19), (0, -15), (-6, -14.5), (-13, -16), (-18, -18.5)]
        # Come to rest, it lies on the stones: whatever of it is lowest touches them.
        drop = 0.0
        if pose["helm_free"] > 0.0:
            lowest = max(raw(hx, hy)[1] for hx, hy in shell_l)
            drop = min(0.0, GROUND - 1.0 - lowest) if lowest > GROUND - 1.0 else pose["helm_lie"] * (GROUND - 1.0 - lowest)

        def F(hx: float, hy: float) -> Pt:
            p = raw(hx, hy)
            return (p[0], p[1] + drop)

        part = Cel(cel.w, cel.h, cel.top)
        # The crest: a fin of marble from the brow over the crown to the nape, on two short stems; a length of it
        # is broken out.
        ccx, ccy = F(-2.0, 2.0)
        ca, sa = math.cos(math.radians(rot)), math.sin(math.radians(rot))
        for py in range(int(ccy) - 29, int(ccy) + 30):
            for px in range(int(ccx) - 29, int(ccx) + 30):
                dx, dy = px + 0.5 - ccx, py + 0.5 - ccy
                r = math.hypot(dx, dy)
                if not (17.0 <= r <= 27.4):
                    continue
                lx, ly = dx * ca + dy * sa, -(-dx * sa + dy * ca)  # back into the helm's own frame
                deg = math.degrees(math.atan2(ly, lx)) % 360.0
                if not (46.0 <= deg <= 204.0):
                    continue
                # Broken: a bite out of it behind the crown, its edge jagged; and it ends ragged at the nape.
                if 108.0 <= deg <= 134.0 and r > 20.5 + abs(deg - 121.0) * 0.45 + (1.5 if int(deg) % 5 < 2 else 0.0):
                    continue
                if deg > 196.0 and r > 24.0 - (deg - 196.0):
                    continue
                s_ = (dx * 0.55 - dy * 0.83) / r
                edge = r > 26.4
                tone = ("bone", 4 if edge and s_ < 0.2 else 7 if s_ > 0.45 else 6 if s_ > 0.0 else 5 if s_ > -0.45 else 4)
                if int(deg) % 8 == 0 and 21.5 < r < 26.4:
                    tone = ("bone", 4)  # the grooves cut across it, where the horsehair was
                elif r < 21.5:
                    tone = ("bone", max(3, tone[1] - 1))  # its foot, in the shadow of the fin
                part.put(px, py, tone)
        shell = marble(part, [F(*p) for p in shell_l], F(3.0, 4.0), 22.0)
        # Inside the dome it is hollow and round: the back of it sinks into shadow.
        for hx0, hy0, hx1, hy1 in ((-13, 10, -12, -8), (-11, 12, -10, -9)):
            part.line(F(hx0, hy0), F(hx1, hy1), ("bone", 3))
        # The brow: two ridges swept up and back from the nasal, the way a Corinthian helm frowns.
        for (ax, ay), (bx, by), tone in (((1.0, 8.5), (8.0, 10.0), 3), ((8.0, 10.0), (15.0, 8.0), 3), ((15.0, 8.0), (18.4, 6.6), 3),
                                         ((1.0, 9.5), (8.0, 11.0), 7), ((8.0, 11.0), (15.0, 9.0), 7)):
            part.line(F(ax, ay), F(bx, by), ("bone", tone))
        # The eye-holes, slanted, and the slit between the cheek-pieces: the T.
        void: set[tuple[int, int]] = set()
        for hole in ([(2.0, 4.8), (7.5, 7.0), (12.8, 5.0), (13.4, 1.0), (9.0, -0.8), (4.0, 1.0)],
                     [(16.4, 4.6), (18.4, 3.8), (18.8, 0.2), (16.4, 0.4)],
                     [(12.6, -1.2), (16.2, -1.2), (15.3, -23.5), (13.0, -23.5)],
                     [(-12.5, 15.5), (-9.0, 12.0), (-6.5, 16.0), (-9.5, 19.5)]):
            for xy in part.poly_mask([F(*p) for p in hole]):
                if xy in shell:
                    part.px[xy] = VOID
                    void.add(xy)
        # The nasal, hanging in the middle of the T; the rims of the cheek-piece and the neck-guard; the line cut
        # along the cheek-piece.
        marble(part, [F(13.6, 8.0), F(16.4, 8.0), F(16.2, -7.0), F(14.6, -8.5)], F(15.0, 2.0), 6.0, lo=5)
        for (ax, ay), (bx, by), tone in (((12.0, -2.0), (12.4, -23.0), 4), ((8.0, -22.4), (12.4, -23.0), 4), ((3.0, 0.6), (9.0, -1.0), 7), ((9.0, -1.0), (12.0, -2.0), 7),
                                         ((9.8, -4.0), (10.0, -19.0), 4), ((4.0, -17.0), (10.0, -19.0), 4), ((2.0, -3.0), (9.8, -4.0), 4), ((2.0, -3.0), (0.5, -13.5), 4),
                                         ((0.0, -14.4), (-6.0, -13.8), 4), ((-6.0, -13.8), (-17.0, -17.0), 4)):
            part.line(F(ax, ay), F(bx, by), ("bone", tone))
        # The crack that runs down from the crown through the eye.
        for (ax, ay), (bx, by) in (((-3.0, 19.0), (-1.0, 14.0)), ((-1.0, 14.0), (-4.0, 10.0)), ((-4.0, 10.0), (0.0, 6.0)), ((0.0, 6.0), (3.0, 4.0)),
                                   ((-4.0, 10.0), (-8.0, 8.0))):
            part.line(F(ax, ay), F(bx, by), ("bone", 3))
        # Coral and weed have had it for a long time; barnacles in the shadow of the neck-guard; a little gilding left.
        for hx, hy, tone in ((-9, 13, ("crimson", 4)), (-10, 14, ("crimson", 5)), (-12, 12, ("crimson", 3)), (-8, 12, ("crimson", 5)), (-13, 10, ("crimson", 4)),
                             (-11, 16, ("crimson", 5)), (5, -20, ("moss", 4)), (3, -19, ("moss", 3)), (6, -21, ("moss", 5)), (-16, -14, ("ink", 6)), (-13, -13, ("ink", 7)),
                             (-18, -16, ("ink", 7)), (-10, -13, ("ink", 6)), (10, 15, ("brass", 5)), (6, 17, ("brass", 4)), (16, 10, ("brass", 5)), (12, 12, ("brass", 4))):
            p = F(hx, hy)
            if (int(math.floor(p[0])), int(math.floor(p[1]))) in shell:
                part.put(p[0], p[1], tone)
        # The lights.
        eye = pose["eye"]
        if eye > 0.15:
            c, c2 = F(8.8, 2.6), F(17.5, 2.0)
            bright = ("light", 0) if eye >= 1.0 else ("sea", 8) if eye >= 0.6 else ("sea", 6)
            halo = ("sea", 7) if eye >= 1.0 else ("sea", 5) if eye >= 0.6 else ("sea", 3)
            spots = [(0, 0, bright), (1, 0, bright), (0, 1, bright), (1, 1, halo), (-1, 0, halo), (0, -1, halo), (2, 0, halo), (-1, 1, ("sea", 3)), (1, -1, ("sea", 3)), (2, 1, ("sea", 3))]
            if eye >= 1.3:  # roused, they burn
                spots += [(1, 1, bright), (-1, 0, bright), (0, -1, ("sea", 8)), (2, 0, ("sea", 8)), (-2, 0, halo), (0, 2, halo), (3, 0, halo), (1, 2, halo), (-1, -1, halo)]
            for dx, dy, tone in spots:
                xy = (int(math.floor(c[0])) + dx, int(math.floor(c[1])) + dy)
                if xy in void:
                    part.px[xy] = tone
            for dx, dy, tone in ((0, 0, bright), (0, 1, halo), (0, -1, halo)):
                xy = (int(math.floor(c2[0])) + dx, int(math.floor(c2[1])) + dy)
                if xy in void:
                    part.px[xy] = tone
        for xy in [xy for xy in part.px if xy[1] >= GROUND]:
            del part.px[xy]
        cel.px.update(part.px)
        # The sea runs out of it: down from the foot of the slit and from the eye.
        pour = pose["pour"]
        if pour > 0.05:
            for (hx, hy), length, w in (((14.0, -21.0), 13.0 * pour, 2), ((7.0, -2.4), 7.0 * pour, 1)):
                sx, sy = F(hx, hy)
                for q in range(int(length)):
                    y = sy + 1 + q
                    if y >= GROUND - 1:
                        break
                    on = (q - int(pose["flow"] * 24)) % 6 < 4
                    for i in range(w):
                        cel.put(sx + i - (1 if w > 1 else 0), y, (WATER, 5 if on else 3) if (q + i) % 5 else FOAM)

    # ------------------------------------------------------------------------------------------------- drawing
    def draw(self, cel, J, pose, ropes, between) -> None:
        gone = pose["drain"] >= 0.985
        if not gone:
            self.water(cel, J, pose)
        self.arm(cel, J["shC"], J["wrC"], 11.0, 7.0, pose["arm_sag"], pose)
        if pose["claw_over"] < 0.5:
            self.hand(cel, J["wrC"], pose["claw_ang"], pose["claw_curl"], palm=pose["claw_palm"])
        self.helm(cel, J, pose)
        self.lip_foam(cel, J, pose)
        if pose["claw_over"] >= 0.5:
            if pose["smear"] > 0.5 and len(between) > 2:
                tips = []
                for Jb, pb in between[3:]:
                    v = _turn((1.0, 0.0), pb["claw_ang"])
                    tips.append((Jb["wrC"][0] + v[0] * 22.0, Jb["wrC"][1] + v[1] * 22.0))
                swing_smear(cel, tips, [Jb["shC"] for Jb, _ in between[3:]])
            self.arm(cel, J["shC"], J["wrC"], 11.0, 7.0, pose["arm_sag"], pose)
            self.hand(cel, J["wrC"], pose["claw_ang"], pose["claw_curl"], palm=pose["claw_palm"])
        self.arm(cel, J["shP"], J["wrP"], 11.0, 7.0, 3.0, pose)
        self.hand(cel, J["wrP"], pose["plant_ang"], pose["plant_curl"], palm=pose["plant_palm"])

        for xy in [xy for xy in cel.px if xy[1] >= GROUND]:
            del cel.px[xy]
        cel.outline()
        for xy in [xy for xy in cel.px if xy[1] >= GROUND]:
            del cel.px[xy]

        # Effects, behind the figure (and on the stones).
        if not gone and pose["sag"] < 0.6:
            self.wash(cel, J, pose)
            self.spindrift(cel, J, pose)
        if pose["drip"] > 0.05:
            self.drips(cel, J, pose)
        if 0.01 < pose["crash"] < 0.985:
            self.crash(cel, pose["crash_x"], pose["crash"], pose["crash_big"])
        if 0.01 < pose["shed"] < 0.99:
            self.shed(cel, J, pose["shed"])
        if pose["wet"] > 0.02:
            self.wet(cel, J, pose)

    def wash(self, cel: Cel, J: dict, pose: Pose) -> None:
        """The water it stands in: a skirt of foam running out over the stones ahead of its foot and behind its tail."""
        foot, tail = J["front"][-1], J["back"][0]
        ph = pose["flow"]
        for i in range(1, 15):
            x = foot[0] + i
            u = (ph * 2 + i * 0.09) % 1.0
            if x > ROOT_X + 35:
                break
            if i < 5 + 7 * math.sin(math.pi * u) and (i + int(ph * 16)) % 3:
                cel.soft(x, GROUND - 1, FOAM if i % 2 else ("azure", 7))
            if i < 3 + 3 * math.sin(math.pi * u):
                cel.soft(x, GROUND, ("ink", 1))
        for i in range(1, 6):
            if (i + int(ph * 16)) % 3:
                cel.soft(tail[0] - i, GROUND - 1, FOAM if i % 2 else ("azure", 7))
        for x in range(int(tail[0]) - 5, min(int(foot[0]) + 10, ROOT_X + 35)):  # the stones are dark where it stands
            if (x + int(ph * 8)) % 4:
                cel.soft(x, GROUND, ("ink", 1))

    def spindrift(self, cel: Cel, J: dict, pose: Pose) -> None:
        """Spray torn off the crest."""
        tip = J["back"][-1]
        ph = pose["flow"]
        for i in range(int(9 * pose["spray"])):
            h1, h2 = (_hash(i, 7) % 100) / 100.0, (_hash(i, 13) % 100) / 100.0
            age = (ph * 2 + h1) % 1.0
            x = tip[0] - 16.0 + 14.0 * h2 + 6.0 * age + 3.0 * h1 * age
            y = tip[1] - 5.0 - 9.0 * math.sin(math.pi * min(1.0, age * 1.15)) * (0.5 + h2) + 16.0 * age * age
            if y < -cel.top + 2 or y >= GROUND - 46 or x > ROOT_X + 54:
                continue  # it is gone before it comes down to a man's height
            cel.soft(x, y, FOAM if age < 0.5 else ("azure", 7))
            if age < 0.3 and i % 2:
                cel.soft(x + 1, y, FOAM)

    def drips(self, cel: Cel, J: dict, pose: Pose) -> None:
        """Water falls from the claw."""
        v = _turn((1.0, 0.0), pose["claw_ang"])
        fx, fy = min(J["wrC"][0] + v[0] * 14.0, ROOT_X + 33.0), J["wrC"][1] + v[1] * 14.0 + 7.0
        for i in range(3):
            age = (pose["flow"] * 2 + i * 0.37) % 1.0
            y = fy + 2.0 + 34.0 * age * age
            if y < GROUND - 1:
                cel.soft(fx + i * 2 - 2, y, (WATER, 5) if age < 0.7 else FOAM)
                cel.soft(fx + i * 2 - 2, y - 1, (WATER, 4))

    @staticmethod
    def crash(cel: Cel, at: float, u: float, big: float) -> None:
        """Where the wave comes down: a wall of spray stands up off the stones and falls back, the water runs out
        along them both ways, drops fly."""
        ix = ROOT_X + at
        rise = math.sin(math.pi * min(1.0, u * 1.25)) ** 0.7
        half = (14.0 + 22.0 * min(1.0, u * 1.6)) * (0.6 + 0.4 * big)
        for i in range(int(-half), int(half) + 1):
            t = abs(i) / half
            h = (1.0 - t) ** 0.55 * (10.0 + 34.0 * rise * big) * (0.55 + 0.45 * ((_hash(i, 3) % 9) / 8.0))
            x = ix + i
            for s_ in range(int(h)):
                if (_hash(i, s_) % 8) < (0 if s_ < h * 0.5 else 2) + int(u * 5.5):
                    continue  # it thins towards the top, and as it falls
                edge = s_ >= h - 2.0
                cel.soft(x, GROUND - 1 - s_, ("light", 0) if edge and u < 0.5 else FOAM if (i + s_) % 3 else ("azure", 7) if s_ > 3 else (WATER, 5))
        for i in range(int(half + 16 * big)):  # the sheet of water running out along the stones
            for sgn in (-1, 1):
                if (i * 7 + (sgn > 0) + int(u * 9)) % 5:
                    cel.soft(ix + sgn * i, GROUND - 1, FOAM if (i + int(u * 12)) % 4 else ("azure", 7))
                    cel.soft(ix + sgn * i, GROUND, ("ink", 1))
        for i in range(int(22 * big) + 6):  # drops
            ang = math.radians(-174 + i * 7.7)
            dist = 8.0 + (24.0 + (i * 5 % 4) * 6.0) * u
            x = ix + math.cos(ang) * dist * 1.25
            y = GROUND - 2 + math.sin(ang) * dist + 18.0 * u * u
            if y >= GROUND - 1 or y < -cel.top + 1:
                continue
            tone = FOAM if i % 2 else ("azure", 7)
            for qx, qy in ((0, 0), (1, 0), (0, 1)) if (i % 3 == 0 and u < 0.7) else ((0, 0),):
                cel.soft(x + qx, y + qy, (WATER, 5) if qy else tone)

    @staticmethod
    def shed(cel: Cel, J: dict, u: float) -> None:
        """The crest knocked to spray."""
        cx, cy = J["back"][-4]
        for i in range(18):
            ang = math.radians(-200.0 + i * 13.0)
            dist = 6.0 + (16.0 + (i * 7 % 5) * 3.0) * u
            x = cx + math.cos(ang) * dist * 1.3 - 8.0 * u
            y = cy + math.sin(ang) * dist + 14.0 * u * u
            if y >= GROUND - 1 or y < -cel.top + 1:
                continue
            cel.soft(x, y, FOAM if i % 3 else ("light", 0))
            if i % 2 and u < 0.6:
                cel.soft(x + 1, y + 1, ("azure", 7))

    def wet(self, cel: Cel, J: dict, pose: Pose) -> None:
        """What the tide leaves: the stones dark and shining, a pool round the helm, a line of foam where it stood,
        the last of it running off behind."""
        u = pose["wet"]
        run = pose["runoff"]
        for x in range(ROOT_X - 100, ROOT_X + 38):
            if _hash(x // 3, 2) % 5:
                cel.soft(x, GROUND, ("ink", 1))
            h = _hash(x, 17) % 100
            if h < 46 * u and (x < ROOT_X - 34 or x > ROOT_X + 30):
                cel.soft(x, GROUND - 1, FOAM if h % 3 else ("azure", 7))  # the tide-line
        for i in range(-34, 37):  # the pool it leaves round the helm and the open hand
            x = ROOT_X + i
            t = abs(i - 1) / 35.0
            if t < 0.35 + 0.65 * u:
                cel.soft(x, GROUND - 1, (WATER, 4) if (i + 1) % 6 else ("azure", 7))
                if t < 0.6 * u and (i // 2) % 3:
                    cel.soft(x, GROUND - 2, (WATER, 5) if i % 5 else FOAM)
        if 0.02 < run < 0.98:  # the last of it leaving, back to the sea
            for i in range(60):
                h1 = (_hash(i, 5) % 100) / 100.0
                x = ROOT_X - 20.0 - 82.0 * ((run * 1.4 + h1) % 1.0)
                if x > ROOT_X - 103:
                    cel.soft(x, GROUND - 1, (WATER, 4) if i % 3 else FOAM)
                    if i % 4 == 0:
                        cel.soft(x - 1, GROUND - 2, (WATER, 3))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, rise=1.0, lean=0.0, curl_x=0.0, curl_y=0.0, sag=0.0, drain=0.0, flow=0.0, claws=1.0, spray=1.0,
                  helm_du=0.0, helm_dv=0.0, helm_rot=0.0, helm_free=0.0, helm_at=(8.0, 20.0), helm_lie=0.0, eye=1.0, pour=1.0,
                  claw=(21.0, 48.0), claw_ang=34.0, claw_curl=0.62, claw_palm=1.0, claw_over=0.0, arm_sag=4.0,
                  plant=(13.0, 8.5), plant_ang=6.0, plant_curl=0.52, plant_palm=1.0, arms=1.0, drip=1.0,
                  smear=0.0, crash=0.0, crash_x=56.0, crash_big=1.0, shed=0.0, wet=0.0, runoff=0.0, flash=0.0)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.18))
    # The claw is never still: it opens, as if about to take hold, and hooks shut again, once a cycle.
    grip = _clamp(math.sin(math.pi * _clamp((ph - 0.5) / 0.42)))
    tap = 1.0 if 0.1 < ph < 0.18 or 0.26 < ph < 0.34 else 0.0  # the planted fingers drum on the stones
    look = _clamp(math.sin(math.pi * _clamp((ph - 0.05) / 0.4)))
    return {**BASE, "rise": 1.0 + 0.028 * s, "lean": 1.6 * late, "curl_x": 1.5 * late, "curl_y": -2.2 * s, "flow": ph, "claws": 1.0 + 0.2 * late,
            "helm_dv": 1.2 * s, "helm_rot": 3.5 * late - 5.0 * look, "eye": 1.0 + 0.35 * look,
            "claw": (21.0 - 4.0 * grip, 48.0 + 1.0 * s + 15.0 * grip), "claw_ang": 34.0 - 12.0 * grip, "claw_curl": 0.62 - 0.4 * grip,
            "plant_curl": 0.52 - 0.22 * tap, "plant": (13.0, 8.5 + 0.8 * tap)}


def haul_pose(ph: float) -> Pose:
    """It hauls itself along: the claw is flung ahead and bites the stones, the whole wave heaves up and crashes
    forward after it, and the other hand is dragged up under it for the next pull."""
    reach = _clamp(math.sin(math.pi * _clamp(ph / 0.36)))  # the claw goes out and comes down
    heave = math.sin(math.pi * _clamp((ph - 0.3) / 0.5)) ** 2  # the wave falls forward
    drag = _clamp((ph - 0.3) / 0.5)  # the hands slide back under it as it comes on
    back = _clamp((ph - 0.8) / 0.2)
    claw_x = lerp(lerp(22.0, 36.0, _clamp(ph / 0.3)), 22.0, drag if ph > 0.3 else 0.0)
    claw_up = 7.0 + 30.0 * reach * (1.0 - _clamp((ph - 0.26) / 0.08)) if ph < 0.36 else 7.0 + 26.0 * back
    return {**BASE, "flow": ph * 2.0, "rise": 1.02 + 0.08 * reach - 0.2 * heave, "lean": -3.0 * reach + 15.0 * heave, "curl_x": 7.0 * heave, "curl_y": -5.0 * reach - 12.0 * heave,
            "dx": 2.5 * heave, "claws": 1.2, "spray": 1.6, "helm_rot": -8.0 * reach + 10.0 * heave, "helm_dv": 2.0 * reach - 4.0 * heave, "eye": 1.3,
            "claw": (claw_x, claw_up), "claw_ang": lerp(20.0, 8.0, _clamp(ph / 0.3)) if ph < 0.8 else lerp(8.0, 20.0, back), "claw_curl": 0.2 + 0.4 * _clamp((ph - 0.24) / 0.1),
            "claw_over": 1.0, "arm_sag": 2.0,
            "plant": (lerp(15.0, 4.0, drag) if ph > 0.3 else lerp(4.0, 15.0, _clamp(ph / 0.3)), 8.5 + 7.0 * math.sin(math.pi * _clamp(ph / 0.3))),
            "plant_curl": 0.52 - 0.3 * math.sin(math.pi * _clamp(ph / 0.3)),
            "crash": 0.3 + 0.6 * _clamp((ph - 0.5) / 0.45) if 0.5 < ph < 0.95 else 0.0, "crash_x": 30.0, "crash_big": 0.35}


def k(**over: object) -> Pose:
    return {**BASE, **over}


# The fall of the wave. It gathers, draws itself up to the top of the strip with the claw flung up and back — and
# hangs; then all of it comes down, the marble palm flat on the stones, the crest breaking over it.
_UP = dict(rise=1.05, lean=-12.0, curl_x=-5.0, curl_y=5.0, dx=-2.0, claws=1.5, spray=1.8, helm_rot=-26.0, helm_dv=4.0, helm_du=-3.0, eye=1.5,
           claw=(37.0, 94.0), claw_ang=-72.0, claw_curl=0.05, claw_over=1.0, arm_sag=-7.0, plant_curl=0.7)
_DOWN = dict(rise=0.8, lean=12.0, curl_x=4.0, curl_y=-14.0, dx=3.0, claws=0.6, spray=0.4, helm_rot=16.0, helm_dv=-2.0, helm_du=-6.0, eye=1.5,
             claw=(29.0, 5.5), claw_ang=4.0, claw_curl=0.06, claw_over=1.0, arm_sag=-3.0, plant_curl=0.7, plant=(12.0, 8.5))
FALL_KEYS = [
    (0.00, k(), "lin"),
    (0.12, k(rise=0.93, lean=4.0, curl_y=-6.0, helm_rot=6.0, helm_dv=-2.0, eye=1.3, claw=(21.0, 47.0), claw_curl=0.8, plant_curl=0.7), "io"),
    (0.30, k(**{**_UP, "rise": 1.02, "lean": -8.0, "claw": (36.0, 78.0), "claw_ang": -50.0, "helm_rot": -18.0}), "out"),
    (0.42, k(**_UP), "out"),
    (0.50, k(**{**_UP, "rise": 1.06, "lean": -13.5, "claw": (36.0, 97.0), "claw_ang": -78.0, "helm_rot": -29.0}), "io"),
    (0.55, k(**_DOWN, crash=0.02), "in3"),
    (0.70, k(**{**_DOWN, "rise": 0.74, "lean": 13.5, "helm_dv": -3.0}, crash=0.98), "out"),
    (0.84, k(rise=0.92, lean=6.0, curl_y=-8.0, dx=1.0, helm_rot=6.0, helm_dv=-2.0, eye=1.3, claw=(30.0, 26.0), claw_ang=24.0, claw_curl=0.4, claw_over=1.0, crash=1.0), "io"),
    (1.00, k(crash=1.0), "io"),
]

# Hit: the crest is knocked to spray, the whole wave is driven back and shudders, the helm rocks, the lights gutter.
HURT_KEYS = [
    (0.00, k(), "lin"),
    (0.07, k(dx=-1.5, lean=-5.0, rise=0.97, curl_x=-3.0, helm_rot=-8.0, helm_du=-1.0, eye=1.5, claws=0.4, shed=0.05, flash=1.0), "out3"),
    (0.16, k(dx=-4.0, lean=-11.0, rise=0.93, curl_x=-7.0, curl_y=5.0, helm_rot=-20.0, helm_du=-3.0, helm_dv=2.0, eye=0.5, claws=0.2, spray=2.0,
             claw=(20.0, 66.0), claw_ang=-20.0, claw_curl=0.25, claw_over=1.0, plant_curl=0.8, shed=0.25, flash=0.5), "lin"),
    (0.26, k(dx=-6.0, lean=-14.0, rise=0.9, curl_x=-9.0, curl_y=7.0, helm_rot=-26.0, helm_du=-4.0, helm_dv=3.0, eye=0.3, claws=0.2, spray=2.0,
             claw=(16.0, 72.0), claw_ang=-30.0, claw_curl=0.3, claw_over=1.0, plant=(11.0, 8.5), plant_curl=0.8, shed=0.45), "out"),
    (0.50, k(dx=-3.0, lean=5.0, rise=1.04, curl_x=3.0, curl_y=-5.0, helm_rot=8.0, helm_dv=-2.0, eye=1.4, claws=0.8, claw=(21.0, 49.0), claw_curl=0.8, shed=0.75), "io"),
    (0.74, k(dx=-1.0, lean=2.0, rise=1.01, helm_rot=2.0, eye=1.2, claw=(21.0, 48.0), shed=0.96), "io"),
    (1.00, k(shed=1.0), "io"),
]

# Death: the tide goes out. The wave rears once more and the lights go dark; it loses its shape and sinks; the helm
# and the hands are dropped where they are; the water runs off the stones; a ruin is left.
_DROPPED = dict(helm_free=1.0, helm_lie=1.0, helm_at=(2.0, 22.0), helm_rot=-61.0, eye=0.0, pour=0.0, arms=0.0, drip=0.0, claws=0.0, spray=0.0,
                claw=(13.0, 5.0), claw_ang=3.0, claw_curl=0.2, claw_palm=1.0, claw_over=1.0, plant=(-40.0, 5.0), plant_ang=178.0, plant_curl=0.22, plant_palm=-1.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.04, k(dx=-1.5, lean=-5.0, rise=0.97, helm_rot=-8.0, eye=1.5, claws=0.4, shed=0.05, flash=1.0), "out3"),
    (0.12, k(dx=-3.0, lean=-12.0, rise=1.05, curl_x=-6.0, curl_y=5.0, helm_rot=-30.0, helm_dv=4.0, helm_du=-3.0, eye=1.5, claws=1.5, spray=2.2,
             claw=(36.0, 92.0), claw_ang=-70.0, claw_curl=0.1, claw_over=1.0, arm_sag=-7.0, plant_curl=0.8, shed=0.45), "out"),
    (0.21, k(dx=-3.0, lean=-13.0, rise=1.06, curl_x=-6.0, curl_y=5.0, helm_rot=-33.0, helm_dv=4.0, helm_du=-3.0, eye=0.6, claws=1.4, spray=2.2,
             claw=(35.0, 95.0), claw_ang=-76.0, claw_curl=0.3, claw_over=1.0, arm_sag=-7.0, plant_curl=0.8, shed=0.96), "io"),
    (0.27, k(dx=-2.0, lean=-8.0, rise=1.03, curl_y=2.0, helm_rot=-22.0, helm_dv=1.0, eye=0.0, pour=0.5, claws=0.8, claw=(32.0, 80.0), claw_ang=-30.0, claw_curl=0.5,
             claw_over=1.0, arms=0.9, shed=1.0), "lin"),
    # It lets go: the wave sinks under them and they fall.
    (0.36, k(lean=2.0, rise=1.0, sag=0.3, curl_y=-12.0, eye=0.0, pour=0.3, claws=0.3, spray=0.5, helm_free=0.4, helm_at=(8.0, 58.0), helm_rot=-20.0,
             claw=(24.0, 48.0), claw_ang=40.0, claw_curl=0.5, claw_over=1.0, arms=0.5, plant=(8.0, 7.0), plant_ang=30.0, drip=0.0, shed=1.0), "in"),
    (0.44, k(lean=4.0, sag=0.62, eye=0.0, pour=0.0, claws=0.0, spray=0.0, helm_free=1.0, helm_at=(3.0, 22.0), helm_rot=-78.0, crash=0.02, crash_x=4.0, crash_big=0.45,
             claw=(15.0, 5.0), claw_ang=14.0, claw_curl=0.45, claw_palm=1.0, claw_over=1.0, arms=0.0, plant=(-6.0, 5.0), plant_ang=80.0, plant_curl=0.4, drip=0.0, shed=1.0), "in"),
    (0.50, k(**{**_DROPPED, "helm_rot": -48.0, "plant": (-24.0, 4.5), "plant_ang": 150.0}, sag=0.82, crash=0.4, crash_x=4.0, crash_big=0.45, wet=0.2, shed=1.0), "out"),
    (0.58, k(**{**_DROPPED, "helm_rot": -66.0}, sag=0.95, drain=0.15, crash=0.8, crash_x=4.0, crash_big=0.45, wet=0.45, runoff=0.1, shed=1.0), "io"),
    (0.70, k(**{**_DROPPED, "pour": 0.5}, sag=1.0, drain=0.55, crash=1.0, wet=0.7, runoff=0.4, shed=1.0), "io"),
    (0.82, k(**{**_DROPPED, "pour": 0.5}, sag=1.0, drain=0.9, crash=1.0, wet=0.9, runoff=0.75, shed=1.0), "io"),
    (0.92, k(**{**_DROPPED, "pour": 0.3}, sag=1.0, drain=1.0, crash=1.0, wet=1.0, runoff=0.97, shed=1.0), "lin"),
    (1.00, k(**_DROPPED, sag=1.0, drain=1.0, crash=1.0, wet=1.0, runoff=1.0, shed=1.0), "lin"),
]

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 16 for i in range(16)], [150] * 16, True),
    "run": Anim("run", haul_pose, [i / 12 for i in range(12)], [95] * 12, True),
    "attack": Anim("attack", keyed(FALL_KEYS), [0.0, 0.06, 0.12, 0.18, 0.24, 0.30, 0.36, 0.42, 0.50, 0.55, 0.59, 0.63, 0.67, 0.70, 0.77, 0.84, 0.92, 1.0],
                   # An enemy swings every 1250 ms and the game starts this clip its wind-up ahead of the swing: the whole
                   # of it (660 ms to the blow, 290 of impact, 290 back up) fits between two swings, so it is never cut.
                   [60, 60, 70, 60, 60, 70, 70, 80, 130, 40, 50, 60, 60, 80, 80, 70, 70, 70], False),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.02, 0.04, 0.08, 0.12, 0.165, 0.21, 0.24, 0.27, 0.315, 0.36, 0.40, 0.44, 0.47, 0.50, 0.54, 0.58, 0.64,
                                                 0.70, 0.76, 0.82, 0.87, 0.92, 1.0],
                  [70, 50, 80, 90, 120, 110, 110, 90, 90, 80, 70, 60, 60, 70, 90, 100, 110, 120, 130, 130, 140, 160, 240, 1500], False),
}
