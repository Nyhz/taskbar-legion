"""The Destroying Angel — world 7, WORLD boss. Under the caverns of crystal and fungus there is one mycelium, as old
as the dark, and this is what it has grown to look at the world with: not one mushroom but a whole fruiting — a
crowd of caps and unopened eggs on a heap of broken floor, cords as thick as arms gripping the path — and out of
the middle of it one fruiting body as tall as the strip.

Its stalk is as thick as a tree, pale, wet and soft; it comes up out of a volva torn open like a sack, leans back
and then bends forward over the path like a neck. A ragged ring of veil hangs from it. On it sits the cap: a broad
brown dome scabbed with white warts, wet on top, that overhangs everything under it like a hood — and under the
hood the GILLS burn gold, the only warm light in the caverns. What hangs in that light is not a face that was
carved: it GREW. A swollen lump of pale flesh with no nose and no jaw, a heavy fold where a brow would be, a tear
across it for a mouth with bruised edges — and one EYE, which is a pit: a round hole full of gold spores that
turn slowly and spill over its lower rim and fall, a few at a time, towards whatever it is looking at.

It stands over the prey and looks down at it, swaying like a snake; a cord creeps out and feels towards the prey;
now and then the head darts at it, the tear pulled open, and is drawn back. It travels by hauling: the cords reach
ahead, grip, and drag the whole mass after them, the floor breaking in front of it and sinking behind. Attack: the
neck draws up and back, a lump travels up the stalk, the lump of the face swells, the gills blaze — it hangs — and
the whole neck whips forward and it BLOWS: a torrent of gold spores driven down onto the path just ahead, where
they burst in a low cloud and little caps spring up at once and wither. Hit: the head is knocked back on the
stalk, the eye gutters, every cap on the heap shakes, and the stalk swings forward again past where it stood.
Death: the head is thrown back and it empties itself at the roof in one last fountain of gold; then the eye goes
dark, the gills go out, the stalk loses its strength and the great cap FALLS — forward, onto its face, its rim in
the dirt at the prey's feet, the stalk slack over the heap, the cords let go, the lesser caps bowed — and then it
does what a dead thing does down here: caps come up all over it, their small lights come on one by one, and spores
rise from it like a prayer.

Own rig (nothing of the humanoid skeleton): the stalk is a chain of segments given by where it stands (`foot`), how
it leans at the root (`lean`), how much it bends forward towards the top (`curl`) and how much of it is out of the
ground (`length`); the head and its cap are DRAWN IN THEIR OWN FRAME from polygons (x forward, y up from the nape),
so they turn to any angle without a sprite being rotated. Frame 248 wide with 59 extra rows above, root at 104: the
whole mass stands BEHIND its root — the heap ends short of it, only the cords reach ahead along the ground (to +35)
and the hood hangs over the prey above a hero's height — and the strike lands 50–62 px ahead. Drawn facing right;
the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, LIGHT, Anim, Build, Cel, Chain, ChainSpec, Character, Pose, Pt, keyed, lerp

FIGURE = ("Amanita", "boss", "w07")

ROOT_X = 104
BUILD = Build(root_x=ROOT_X, thigh=1.0, shin=1.0, foot=0.0, hip_dx=0.0, spine=0.0, sh_near=0.0, sh_far=0.0, upper=1.0, fore=1.0, neck=0.0)

VOID = ("ink", 0)
SEGS = 14
#: Where the neck enters the head, in the head's own frame, and the scale everything in that frame is drawn at.
NAPE = (-1.0, -8.0)
HS = 0.86

# ------------------------------------------------------------------------------------------------------- the head
# In its own frame: x towards the prey, y up. Not a skull: a swelling of the stalk under the cap.
BULB = [(-10, -8), (-17, 3), (-20.5, 15), (-19, 27), (-12, 37), (4, 43), (22, 42), (33, 37), (39.5, 30), (42, 22), (42, 13), (40.5, 7.5), (27, 5), (15, 3.2),
        (8, 2), (6, -9)]
LIP = [(8, 3), (15, 4.2), (27, 6), (40.5, 8.5), (41.5, 2), (39, -6), (31.5, -12), (20, -14.5), (9, -12)]
HINGE = (9.0, 2.0)
EYE_C = (28.5, 21.0)
EYE_R = 6.8
BROW = [(15, 30.5), (28, 34), (40.5, 31), (43, 25.5), (32, 28.6), (17, 27.6)]
MOUTH_AT = (41.5, 6.5)
#: The cap: a broad dome, its rim standing far out past the lump under it and hanging low over it in front.
CAP = [(58, 25.5), (57.5, 33), (52, 43), (41, 52), (25, 59), (7, 62), (-11, 60.5), (-27, 54), (-39, 44), (-46.5, 33), (-48, 24.5), (-36, 29.5), (-14, 35.5),
       (10, 38), (32, 36), (48, 30)]
GILLS_FRONT = [(58, 25.5), (48, 30), (32, 36), (30, 29), (41, 23.5), (53, 19.5)]
GILLS_BACK = [(-48, 24.5), (-36, 29.5), (-14, 35.5), (-13, 29), (-29, 22.5), (-43, 18.5)]
#: Scraps of veil on the cap: (x, y, half-width, rows).
WARTS = [(-30, 46, 4, 2), (-16, 55, 3, 2), (-1, 57.5, 4, 2), (16, 57, 3, 2), (31, 51, 4, 2), (44, 41, 3, 2), (-40, 35, 3, 2), (-22, 43, 2, 1), (-6, 49, 3, 2),
         (11, 49.5, 2, 1), (25, 45, 3, 2), (39, 34, 2, 1), (51, 31, 2, 1), (-33, 38, 2, 1), (4, 43, 2, 1), (-12, 41, 2, 1), (20, 40, 2, 1)]
#: Where caps come up on it when it is dead: (x, y in the head's frame, size, when 0–1).
BLOOM = [(-30, 51, 5, 0.0), (-8, 61, 7, 0.08), (14, 61, 5, 0.16), (34, 52, 6, 0.3), (48, 40, 4, 0.22), (-42, 38, 4, 0.38), (2, 62, 4, 0.5), (24, 58, 4, 0.46),
         (-20, 57, 4, 0.6), (42, 46, 3, 0.56), (-2, 30, 4, 0.34), (-16, 12, 4, 0.66), (10, -6, 3, 0.7)]

# ------------------------------------------------------------------------------------------------------- the heap
#: The lesser fruiting bodies, by x from the ROOT: (x, height, lean, cap radius, in front of the stalk?).
LESSER = [(-73.0, 44.0, -4.0, 14.0, False), (-62.0, 20.0, 6.0, 8.5, True), (-13.0, 15.0, 8.0, 7.0, True)]
#: Unopened ones — half-grown heads: (x from the root, size, in front?).
EGGS = [(-51.0, 14.0, True), (-24.0, 10.0, True), (-88.0, 9.0, True)]
#: The cords it grips the floor with: (where it leaves the heap, x from the foot; where it grips, x from the ROOT;
#: how high it arches; its phase in the haul).
CORDS = [(18.0, 28.0, 14.0, 0.0), (8.0, 12.0, 9.0, 0.5), (-26.0, -84.0, 10.0, 0.75)]
#: Flags of broken floor round the heap, by x from the ROOT at rest: (x, width, height, lean).
SLABS = [(-85.0, 9.0, 9.0, -36.0), (-74.0, 15.0, 21.0, -24.0), (-47.0, 11.0, 12.0, -34.0), (-19.0, 13.0, 16.0, 24.0), (-4.0, 9.0, 9.0, 44.0)]


def _hash(x: int, y: int) -> int:
    return ((x * 73856093) ^ (y * 19349663)) & 0x7FFFFFFF


def _rnd(x: int, y: int) -> float:
    return (_hash(x, y) % 1000) / 1000.0


def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def P(x: float, up: float) -> Pt:
    return (ROOT_X + x, GROUND - up)


def _turn(v: Pt, deg: float) -> Pt:
    """A screen vector turned `deg` clockwise."""
    a = math.radians(deg)
    return (v[0] * math.cos(a) - v[1] * math.sin(a), v[0] * math.sin(a) + v[1] * math.cos(a))


def _about(p: Pt, c: Pt, deg: float) -> Pt:
    """A point of the head's frame (y up) turned `deg` clockwise on screen about c."""
    a = math.radians(-deg)
    dx, dy = p[0] - c[0], p[1] - c[1]
    return (c[0] + dx * math.cos(a) - dy * math.sin(a), c[1] + dx * math.sin(a) + dy * math.cos(a))


def glow_tone(level: float, hot: bool = False) -> tuple[str, int]:
    """Gold light at a strength 0–1.6."""
    if level >= 1.4:
        return ("light", 0) if hot else ("brass", 7)
    if level >= 1.05:
        return ("brass", 7) if hot else ("brass", 6)
    if level >= 0.75:
        return ("brass", 6) if hot else ("brass", 5)
    if level >= 0.45:
        return ("brass", 5) if hot else ("brass", 4)
    if level >= 0.15:
        return ("brass", 3) if hot else ("brass", 2)
    return ("dusk", 1) if hot else ("dusk", 0)


def _dome(cel: Cel, cx: float, cy: float, r: float, glow: float, tilt: float = 0.0) -> None:
    """A small cap of the same kind: a brown dome with a wart or two and its own gold underside."""
    for yy in range(int(-r * 0.8), 2):
        half = r * math.sqrt(max(0.0, 1.0 - (yy / (r * 0.8)) ** 2)) + 0.6
        for xx in range(int(-half), int(half) + 1):
            s = xx / max(1.0, half) * 0.55 - yy / (r * 0.8) * 0.75
            tone = 6 if s > 0.78 else 5 if s > 0.3 else 4 if s > -0.2 else 3
            cel.put(cx + xx + tilt * (-yy) * 0.25, cy + yy, ("leather", tone))
    n = max(1, int(r / 3))
    for q in range(n):
        wx = cx + ((q + 0.5) / n - 0.5) * 1.1 * r
        wy = cy - r * (0.62 - 0.3 * abs((q + 0.5) / n - 0.5)) - (q % 2)
        cel.put(wx, wy, ("bone", 7))
        cel.put(wx + 1, wy, ("bone", 6))
    cel.put(cx + r * 0.35, cy - r * 0.62, ("light", 0))
    g = glow_tone(glow, hot=True)
    g2 = glow_tone(glow * 0.6)
    for xx in range(int(-r) + 1, int(r)):
        cel.put(cx + xx, cy + 2, g if xx % 2 == 0 else g2)


class Amanita(Character):
    build = BUILD
    W = 248
    TOP = 59

    # ------------------------------------------------------------------------------------------------- skeleton
    def joints(self, pose: Pose) -> dict:
        fx, fup = pose["foot"]
        foot = P(fx, fup)
        lean, curl, length = pose["lean"], pose["curl"], pose["length"]
        wilt, gulp = pose["wilt"], pose["gulp"]
        pts: list[Pt] = [(foot[0], foot[1] - 3.0)]
        widths: list[float] = []
        seg = length / SEGS
        for i in range(SEGS + 1):
            t = i / SEGS
            w = lerp(39.0, 24.0, t ** 0.55) + 8.0 * max(0.0, 1.0 - t / 0.16)  # a bulb at the foot
            w *= 1.0 - 0.34 * wilt * (0.4 + 0.6 * math.sin(math.pi * min(1.0, t * 1.2)))
            if wilt > 0.01:  # folds: it goes down like a stocking
                w += 2.6 * wilt * math.sin(i * 2.4)
            if gulp >= 0.0:  # a lump on its way up
                w += 9.0 * math.exp(-((t - gulp) / 0.11) ** 2)
            widths.append(w)
            if i < SEGS:
                tm = (i + 0.5) / SEGS
                ang = lean + curl * tm ** 1.2 + pose["kink"] * math.sin(math.pi * tm)
                d = (math.sin(math.radians(ang)), -math.cos(math.radians(ang)))
                pts.append((pts[-1][0] + d[0] * seg, pts[-1][1] + d[1] * seg))
        J: dict = {"foot": foot, "neck": pts, "widths": widths}
        top = pts[-1]
        rot = pose["head"]
        f, u = _turn((1.0, 0.0), rot), _turn((0.0, -1.0), rot)

        def H(x: float, y: float) -> Pt:
            hx, hy = (x - NAPE[0]) * HS, (y - NAPE[1]) * HS
            return (top[0] + f[0] * hx + u[0] * hy, top[1] + f[1] * hx + u[1] * hy)

        J["H"], J["f"], J["u"], J["top"] = H, f, u, top
        # The ring: two thirds of the way up, a line across the stalk.
        ri = int(SEGS * 0.64)
        a_, b_ = pts[ri], pts[ri + 1]
        d = (b_[0] - a_[0], b_[1] - a_[1])
        n = math.hypot(*d) or 1.0
        nrm = (-d[1] / n, d[0] / n)
        half = widths[ri] / 2.0
        lo, hi = sorted(((a_[0] - nrm[0] * half, a_[1] - nrm[1] * half), (a_[0] + nrm[0] * half, a_[1] + nrm[1] * half)), key=lambda p: p[0])
        J["ring"] = (lo, hi)
        for q in range(4):
            t = (q + 0.5) / 4.0
            J[f"ring{q}"] = (lerp(lo[0], hi[0], t), lerp(lo[1], hi[1], t) + 10.0)
        J["mouth"] = H(*MOUTH_AT)
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def grounded(pts: list[Pt], J: dict) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        return {f"ring{q}": ChainSpec(Chain(4 + q % 2, 3.0, gravity=0.3, drag=0.06, damp=0.08), (lambda J, q=q: J[f"ring{q}"]), grounded, (0.0, 1.0)) for q in range(4)}

    # ------------------------------------------------------------------------------------------------- the heap
    @staticmethod
    def slab(cel: Cel, x: float, w: float, h: float, deg: float, seed: int = 0) -> None:
        """A flag of the cavern floor, broken off and tipped up: it came up THROUGH the path."""
        if h < 1.5:
            return
        d = (math.sin(math.radians(deg)), -math.cos(math.radians(deg)))
        bl, br = (x - w / 2.0, GROUND), (x + w / 2.0, GROUND)
        tl, tr = (bl[0] + d[0] * h, bl[1] + d[1] * h), (br[0] + d[0] * h * 0.78, br[1] + d[1] * h * 0.78)
        mid = ((tl[0] + tr[0]) / 2.0 + d[0] * 2.5, (tl[1] + tr[1]) / 2.0 + d[1] * 2.5)  # broken, not sawn
        face = 5 if deg < 0 else 3  # tipped away to the left, its face looks up at the light
        for xy in cel.poly_mask([bl, tl, mid, tr, br]):
            if xy[1] < GROUND:
                cel.px[xy] = ("ink", face if _rnd(xy[0] + seed, xy[1]) > 0.14 else face - 1)
        tmp = Cel(cel.w, cel.h, cel.top)
        tmp.line(tl, mid, ("ink", 7 if deg < 0 else 5))
        tmp.line(mid, tr, ("ink", 6 if deg < 0 else 4))
        tmp.line(tr, br, ("ink", 2)) if deg < 0 else tmp.line(tl, bl, ("ink", 5))
        tmp.line((lerp(bl[0], tl[0], 0.3), lerp(bl[1], tl[1], 0.3)), (lerp(br[0], tr[0], 0.6), lerp(br[1], tr[1], 0.6)), ("ink", face - 2))  # a crack
        for xy, tone in tmp.px.items():
            if xy[1] < GROUND and xy in cel.px:
                cel.px[xy] = tone

    def slabs(self, cel: Cel, pose: Pose, front: bool) -> None:
        """The broken floor round it. Standing, the flags lie where they fell; hauling, the floor breaks ahead of the
        mass, each flag rides back past it and sinks behind — that is what says it travels."""
        go = pose["plough"]
        ph = pose["scroll"]
        tip = 1.0 + 0.25 * pose["heave"]
        for n, (x, w, h, deg) in enumerate(SLABS):
            if (n % 2 == 0) != front:
                continue
            if go > 0.01:
                u = ((n + 0.5) / len(SLABS) + ph) % 1.0  # 0 at the front, where the floor breaks; 1 at the back
                x = 27.0 - 116.0 * u
                rise = _clamp(u / 0.12) * _clamp((1.0 - u) / 0.2)
                h = h * rise * 1.05
                deg = lerp(52.0, -24.0, u) if n % 2 else lerp(38.0, -18.0, u)
            self.slab(cel, ROOT_X + x, w, h, deg * tip, n * 17)

    def earth(self, cel: Cel, J: dict, pose: Pose, lo: int, hi: int, height: float, seed: int) -> None:
        fx = J["foot"][0]
        heave = pose["heave"]
        for i in range(lo, hi + 1):
            t = i / -lo if i < 0 else i / hi
            h = (height + 2.5 * heave) * (1.0 - abs(t) ** 2.2) + 1.6 * math.sin(i * 0.55 + seed) + 1.4 * math.sin(i * 1.3 + seed * 2.0) + 1.5 * _rnd(i, seed)
            for s_ in range(int(max(0.0, h)) + 1):
                top = s_ > h - 1.8
                clod = _rnd(i // 2 + seed, s_ // 2) > 0.7
                tone = 4 if top and math.sin(i * 0.55 + seed + 1.0) > -0.2 else 3 if top or clod else 1 if _rnd(i, s_ + seed) > 0.86 else 2
                cel.put(fx + i, GROUND - 1 - s_, ("leather", tone))

    def volva(self, cel: Cel, J: dict, pose: Pose) -> None:
        """The sack it broke out of, torn open: its rags stand round the foot of the stalk like petals, bruised
        where they tore; the stalk goes down into their shadow."""
        fx = J["foot"][0]
        for i in range(-30, 31):
            t = i / 30.0
            lip = 14.0 + 5.5 * math.sin(i * 0.26 + 0.6) + 3.0 * math.sin(i * 0.71 + 2.0) + 2.0 * (_rnd(i // 2, 11) - 0.5) - 7.0 * abs(t) ** 3
            lip = max(4.0, lip)
            for s_ in range(int(lip) + 1):
                y = GROUND - 1 - s_
                xs = fx + i * (1.0 + 0.16 * (s_ / max(1.0, lip)))  # the rags lean out
                side = t + 0.25 * (s_ / max(1.0, lip))
                tone = 7 if side > 0.55 else 6 if side > 0.1 else 5 if side > -0.45 else 4
                if s_ > lip - 1.8:
                    cel.put(xs, y, ("dusk", 4) if _rnd(i, 3) > 0.45 else ("dusk", 3))  # the torn edge, bruised
                elif s_ > lip - 3.4:
                    cel.put(xs, y, ("bone", max(4, tone - 1)))
                elif s_ < 3 and _rnd(i + 5, s_) > 0.5:
                    cel.put(xs, y, ("leather", 3))
                else:
                    cel.put(xs, y, ("bone", tone if _rnd(i, s_ + 31) < 0.93 else tone - 1))
            for q, tn in ((1, 2), (2, 3), (3, 4)):  # its shadow on the stalk above the edge
                xy = (int(math.floor(fx + i * 1.16)), int(GROUND - 1 - int(lip) - q))
                cur = cel.px.get(xy)
                if cur is not None and cur[0] == "bone" and cur[1] > tn and abs(t) < 0.8:
                    cel.px[xy] = ("bone", tn)

    def lesser(self, cel: Cel, pose: Pose, front: bool) -> None:
        """The rest of the fruiting: smaller caps of the same kind, each with its own gold underside, and eggs that
        have not opened — in the split of each a small gold eye already."""
        nod, droop, glow = pose["nod"], pose["droop"], pose["glow"] * (1.0 - pose["dead"])
        for i, (x, h, lean, r, fr) in enumerate(LESSER):
            if fr != front:
                continue
            a = math.radians(lean + nod * (4.0 if i % 2 else -3.0) + droop * (64.0 if i else 56.0))  # dead, they bow towards it
            base = P(x, 2.0)
            hh = h * (1.0 - 0.25 * droop)
            top = (base[0] + math.sin(a) * hh, base[1] - math.cos(a) * hh)
            mid = (lerp(base[0], top[0], 0.5) - math.sin(a) * 1.5, lerp(base[1], top[1], 0.5))
            w = max(3.0, r * 0.55)
            cel.limb(base, mid, w + 1.6, w, "bone", (3, 5, 7))
            cel.limb(mid, top, w, w - 0.8, "bone", (3, 5, 7))
            if h > 30:  # the big one has a ring of its own
                rg = (lerp(base[0], top[0], 0.62), lerp(base[1], top[1], 0.62))
                for q in range(-5, 6):
                    for s_ in range(3 + (q * q) % 3):
                        cel.put(rg[0] + q, rg[1] + s_, ("bone", 7 if q > 1 else 5))
            _dome(cel, top[0], top[1], r, glow * 0.9, tilt=math.sin(a))
        for i, (x, size, fr) in enumerate(EGGS):
            if fr != front:
                continue
            cx = ROOT_X + x
            for yy in range(int(size)):
                half = size * 0.6 * math.sqrt(max(0.0, 1.0 - ((yy - size * 0.36) / (size * 0.7)) ** 2))
                for xx in range(int(-half), int(half) + 1):
                    s = xx / max(1.0, half) * 0.6 + yy / size * 0.7
                    cel.put(cx + xx, GROUND - 2 - yy, ("bone", 7 if s > 0.75 else 6 if s > 0.2 else 5 if s > -0.4 else 4))
            # The split, and what looks out of it.
            ey = GROUND - 2 - size * 0.55
            for q in range(-1, 3):
                cel.put(cx + 1, ey + q, ("dusk", 2))
            if size > 9 and glow > 0.2:
                cel.put(cx + 1, ey, glow_tone(glow, hot=True))
                cel.put(cx + 1, ey + 1, glow_tone(glow))
                cel.put(cx + 2, ey, ("dusk", 3))

    def cords(self, cel: Cel, J: dict, pose: Pose) -> None:
        """The cords: mycelium as thick as an arm, out of the heap, arched over the broken floor and gripping the
        path — the nearest of them towards the prey. Standing, one creeps out and feels; hauling, each reaches
        ahead, grips, and is dragged back under the mass as it comes on."""
        fx = J["foot"][0]
        go, ph, slack, grope = pose["plough"], pose["claw"], pose["slack"], pose["grope"]
        for i, (ox, grip, arch, off) in enumerate(CORDS):
            back = ROOT_X + grip < fx + ox  # it grips behind the heap: the last one, trailing
            gx, lift = grip, 0.0
            if go > 0.01:
                q = (ph + off) % 1.0
                span = 24.0 if not back else 16.0
                if q < 0.62:  # gripping: the mass is dragged up to it, and past it
                    gx = grip - span * (q / 0.62) if not back else grip + span * (1.0 - q / 0.62)
                else:  # let go, thrown ahead again
                    v = (q - 0.62) / 0.38
                    e = v * v * (3 - 2 * v)
                    gx = lerp(grip - span, grip, e) if not back else lerp(grip, grip + span, e)
                    lift = 11.0 * math.sin(math.pi * v) ** 0.8
            if i == 0 and grope > 0.01:
                gx += 2.0 * grope
                lift += 11.0 * grope
            a = (fx + ox, GROUND - 6.0)
            c = (ROOT_X + gx, GROUND - 2.0 - lift)
            arc = arch * (1.0 - 0.8 * slack) + lift * 0.5
            b = (lerp(a[0], c[0], 0.5), min(a[1], c[1]) - arc)
            b2 = (lerp(a[0], c[0], 0.8), lerp(b[1], c[1], 0.6) - arc * 0.2)
            cel.limb(a, b, 7.4, 6.0, "bone", (3, 5, 6))
            cel.limb(b, b2, 6.0, 4.6, "bone", (3, 5, 7))
            cel.limb(b2, c, 4.6, 3.4, "bone", (4, 5, 7))
            # Its fingers: three threads splayed on the path (or held up, feeling).
            fwd = 1.0 if not back else -1.0
            for da, ln in ((-0.5, 5.0), (0.05, 6.5), (0.55, 4.5)):
                tip = (c[0] + fwd * ln, min(GROUND - 0.8, c[1] + da * 4.0 + (0.0 if lift < 1.0 else -2.0 * abs(da))))
                cel.limb(c, tip, 2.4, 1.0, "bone", (4, 6, 7))
            for q_ in range(3):  # earth on it
                cel.put(lerp(a[0], b[0], 0.2 + 0.3 * q_), lerp(a[1], b[1], 0.2 + 0.3 * q_) + 2, ("leather", 3))

    # ------------------------------------------------------------------------------------------------- the stalk
    def stalk(self, cel: Cel, J: dict, pose: Pose) -> None:
        pts, widths = J["neck"], J["widths"]
        wilt = pose["wilt"]
        layer = Cel(cel.w, cel.h, cel.top)
        for i in range(SEGS):
            layer.limb(pts[i], pts[i + 1], widths[i], widths[i + 1], "bone", (3, 5, 6) if wilt < 0.5 else (3, 4, 5))
        # Soft flesh, not a pipe: a broad wet highlight, sinews that stand out along it, and creases where it bends.
        for i in range(SEGS):
            a_, b_ = pts[i], pts[i + 1]
            d = (b_[0] - a_[0], b_[1] - a_[1])
            n = math.hypot(*d) or 1.0
            nrm = (-d[1] / n, d[0] / n)
            lit = 1.0 if (nrm[0] * LIGHT[0] + nrm[1] * LIGHT[1]) > 0 else -1.0
            half = (widths[i] + widths[i + 1]) / 4.0
            for k_ in range(int(n) + 2):
                for s in range(int(-half) - 1, int(half) + 2):
                    x, y = a_[0] + d[0] / n * k_ + nrm[0] * s, a_[1] + d[1] / n * k_ + nrm[1] * s
                    xy = (int(math.floor(x)), int(math.floor(y)))
                    if xy not in layer.px:
                        continue
                    side = s / max(1.0, half) * lit  # +1 the lit edge, −1 the dark edge
                    row = i * 6 + k_
                    step = 7 if side > 0.5 else 6 if side > 0.05 else 5 if side > -0.38 else 4 if side > -0.74 else 3
                    if 0.2 < side < 0.42 and row % 9 < 7:
                        step = 7  # the wet streak down it
                    sinew = abs((side * 3.2 + 0.3) % 1.0 - 0.5) < 0.13 and -0.7 < side < 0.7
                    if sinew and (row // 11 + int(side * 3)) % 4 != 0:
                        step = max(3, step - 1)
                    if row % 13 == 0 and side < 0.25:
                        step = max(3, step - 1)  # a crease across the inside of the bend
                    if wilt > 0.3 and (row + s) % 4 == 0:
                        step = max(3, step - 1)
                    layer.px[xy] = ("bone", step)
        cel.px.update(layer.px)

    def ring(self, cel: Cel, J: dict, pose: Pose, ropes: dict) -> None:
        """What is left of the veil it broke out of, hanging round the stalk in a ragged skirt."""
        (ax, ay), (bx, by) = J["ring"]
        sway = pose["sway"]
        droop = 1.0 + 0.5 * pose["wilt"]
        x0, x1 = int(math.floor(ax)) - 3, int(math.ceil(bx)) + 3
        span = max(1.0, bx - ax)
        for x in range(x0, x1 + 1):
            t = (x - ax) / span
            top = lerp(ay, by, _clamp(t)) - 2.0
            length = (15.0 + 6.0 * math.sin(t * 5.3 + 1.0) + 4.0 * math.sin(t * 13.0) + 4.0 * (_rnd(x - x0, 23) - 0.5)) * droop
            if t < 0.0 or t > 1.0:
                length *= 0.7
                top += 1.0
            for s in range(int(length) + 1):
                xs = x + sway * (s / 14.0) ** 1.4 + (t - 0.5) * 0.6 * s  # it flares: a skirt, not a cuff
                tone = 7 if t > 0.6 else 6 if t > 0.25 else 5
                if s < 2:
                    tone = 7
                elif s > length - 1.4:
                    cel.put(xs, top + s, ("dusk", 4))  # torn, and bruised where it tore
                    continue
                elif (x - x0) % 5 == 0 and s > 3:
                    tone = 4  # folds
                elif _rnd(x - x0, s) > 0.93 and s > 5:
                    continue  # holes: it is rotten
                cel.put(xs, top + s, ("bone", tone))
        for q in range(4):
            rope = ropes[f"ring{q}"]
            for i in range(len(rope) - 1):
                cel.limb(rope[i], rope[i + 1], lerp(3.0, 1.0, i / (len(rope) - 1)), lerp(3.0, 1.0, (i + 1) / (len(rope) - 1)), "bone", (4, 6, 7) if q > 1 else (3, 5, 6))

    # ------------------------------------------------------------------------------------------------- the head
    def head(self, cel: Cel, J: dict, pose: Pose) -> None:
        H, f, u, top = J["H"], J["f"], J["u"], J["top"]
        lx, ly = LIGHT[0] * f[0] + LIGHT[1] * f[1], LIGHT[0] * u[0] + LIGHT[1] * u[1]
        eye, jaw, puff = pose["eye"], pose["jaw"], pose["puff"]
        dead = pose["dead"]
        glow = pose["glow"] * (1.0 - dead)
        turn = pose["mote_ph"]

        def local(xy: tuple[int, int]) -> Pt:
            dx, dy = xy[0] + 0.5 - top[0], xy[1] + 0.5 - top[1]
            return ((dx * f[0] + dy * f[1]) / HS + NAPE[0], (dx * u[0] + dy * u[1]) / HS + NAPE[1])

        def mask(poly: list[Pt]) -> list[tuple[int, int]]:
            return cel.poly_mask([H(x, y) for x, y in poly])

        def flesh(x: float, y: float, xy: tuple[int, int]) -> int:
            """Soft round flesh: two swellings, lit from where the light is, the bands broken up where they meet."""
            s1 = (x - 10.0) / 27.0 * lx + (y - 18.0) / 26.0 * ly
            s2 = (x - 30.0) / 14.0 * lx + (y - 12.0) / 17.0 * ly - 0.16
            s = max(s1, s2) + 0.06 * math.sin(x * 0.5) * math.sin(y * 0.45)
            for th, tone in ((0.62, 7), (0.26, 6), (-0.12, 5), (-0.46, 4)):
                if s > th:
                    if s - th < 0.07 and (xy[0] + xy[1]) % 2 == 0:
                        return tone - 1  # the edge of each band broken: it is round and soft
                    return tone
            return 3

        def line(a: Pt, b: Pt, tone: tuple[str, int], only_on: str = "bone") -> None:
            tmp = Cel(cel.w, cel.h, cel.top)
            tmp.line(H(*a), H(*b), tone)
            for xy in tmp.px:
                if only_on == "" or cel.px.get(xy, VOID)[0] == only_on:
                    cel.px[xy] = tone

        def darken(poly: list[Pt], by: int = 1, floor: int = 3) -> None:
            for xy in mask(poly):
                cur = cel.px.get(xy)
                if cur is not None and cur[0] == "bone":
                    cel.px[xy] = ("bone", max(floor, cur[1] - by))

        # The gills: behind the lump, under the whole of the cap — the lamp.
        g_hot, g_mid, g_low = glow_tone(glow * 1.25, hot=True), glow_tone(glow, hot=True), glow_tone(glow * 0.75)
        for poly in (GILLS_FRONT, GILLS_BACK):
            for xy in mask(poly):
                x, y = local(xy)
                under = (38.0 - 0.0052 * (x - 8.0) ** 2) - y  # how far below the rim line
                fin = int(math.floor(x * 1.25)) % 3
                tone = g_hot if fin == 0 else g_mid if fin == 1 else g_low
                if under > 5.5 and fin != 0:
                    tone = g_low
                cel.px[xy] = tone

        # The lower lip: a flap of the same flesh, torn from the lump; behind it, the throat.
        ja = jaw * 22.0
        if jaw > 0.04:
            for xy in mask([(10, 2.5), (27, 5.5), (40.5, 8.5)] + [_about(p, HINGE, ja) for p in ((40.5, 8), (27, 5.5), (15, 4))]):
                cel.px[xy] = VOID
            for xy in mask([(24, 5), (39.5, 8), _about((39.5, 7.5), HINGE, ja), _about((26, 5), HINGE, ja)]):
                x, y = local(xy)
                cel.px[xy] = glow_tone(pose["glow"] * (0.55 + 0.45 * _clamp(jaw)) * (1.0 - dead), hot=(x > 33.0))
        for xy in mask([_about(p, HINGE, ja) for p in LIP]):
            x, y = local(xy)
            bx, by = _about((x, y), HINGE, -ja)
            t = flesh(bx, by, xy)
            if by < -10.5 + 0.1 * (bx - 14.0) or bx < 13.0:
                t = max(3, t - 2)
            cel.px[xy] = ("bone", t) if by < 3.4 + 0.12 * (bx - 14.0) else ("dusk", 3)

        # The lump itself.
        for xy in mask(BULB):
            x, y = local(xy)
            cel.px[xy] = ("bone", flesh(x, y, xy))
        if puff > 0.05:  # it swells
            r = 7.0 + 7.0 * puff
            c = (27.0 + 1.5 * puff, 9.0 - 1.0 * puff)
            ball = [(c[0] + r * math.cos(a_), c[1] + r * 0.9 * math.sin(a_)) for a_ in [i * math.tau / 16 for i in range(16)]]
            for xy in mask(ball):
                x, y = local(xy)
                s = (x - c[0]) / r * lx + (y - c[1]) / r * ly
                cel.px[xy] = ("bone", 7 if s > 0.3 else 6 if s > -0.2 else 5 if s > -0.62 else 4)
            cel.put(*H(c[0] + r * 0.3, c[1] + r * 0.4), ("light", 0))
        # Folds: it was not carved, it grew — creases where the flesh crowded itself.
        for a_, b_ in (((-13, 30), (-6, 20)), ((-6, 20), (-9, 8)), ((2, 36), (9, 27)), ((9, 27), (7, 15)), ((16, 12), (22, 7)), ((34, 12), (38, 10))):
            line(a_, b_, ("bone", 3))
        darken([(-20, 28), (-12, 37), (-4, 30), (-12, 14), (-20, 14)])  # the back of it
        # The tear of the mouth: across the lump and down at the corner, its edges bruised.
        if jaw <= 0.04:
            line((15.0, 3.6), (40.6, 8.0), ("dusk", 1), only_on="")
            line((15.0, 3.6), (12.5, -1.0), ("dusk", 1), only_on="")
        line((16.0, 5.4), (40.0, 9.6), ("dusk", 4))
        line((13.5, 3.0), (11.0, -1.5), ("dusk", 4))
        for wx in (20.0, 27.0, 33.0, 38.0):  # threads across it, where it has not finished tearing
            if jaw < 0.5:
                line((wx, 3.4 + (wx - 15.0) * 0.17), (wx + 0.6, 6.6 + (wx - 15.0) * 0.17), ("bone", 6), only_on="")

        # The eye: a pit. Bruised round the rim, and in it gold spores, turning.
        ex, ey = EYE_C
        pit = [(ex + EYE_R * math.cos(i * math.tau / 20), ey + EYE_R * math.sin(i * math.tau / 20)) for i in range(20)]
        open_ = eye > 0.1 and dead < 0.9
        for xy in mask(pit):
            x, y = local(xy)
            r = math.hypot(x - ex, y - ey) / EYE_R
            if r > 0.8:
                cel.px[xy] = ("dusk", 2 if (y < ey or not open_) else 3)
            elif not open_:
                cel.px[xy] = ("dusk", 0) if r > 0.35 else VOID
            else:
                ang = math.atan2(y - ey, x - ex) + turn * math.tau
                swirl = math.sin(ang * 2.0 + r * 5.0)
                level = eye * (1.15 - 0.55 * r) + 0.18 * swirl
                tone = glow_tone(level, hot=(r < 0.45 and swirl > -0.3))
                if _rnd(xy[0] + int(turn * 16), xy[1]) > 0.86:
                    tone = ("light", 0) if eye >= 1.0 else ("brass", 6)
                cel.px[xy] = tone
        # The fold over it, where a brow would be: it hangs into the pit.
        for xy in mask(BROW):
            x, y = local(xy)
            cel.px[xy] = ("bone", 7 if y > 31.4 - 0.1 * abs(x - 30.0) else 6 if y > 29.4 else 4)
        for gx_, gy_ in ((35.0, 32.0), (36.2, 31.4), (37.4, 30.6), (39.0, 18.0), (39.6, 16.6), (22.0, 39.0), (23.4, 39.2)):  # it is wet
            xy = tuple(int(math.floor(v)) for v in H(gx_, gy_))
            if cel.px.get(xy, VOID)[0] == "bone":
                cel.px[xy] = ("light", 0)
        line((17.0, 27.4), (32.0, 28.4), ("bone", 3))
        line((32.0, 28.4), (43.0, 25.4), ("bone", 3))
        # The gills light it from above: the top of the lump and the fold are gold.
        if glow > 0.3:
            warm = ("brass", 6) if glow > 1.3 else ("brass", 5) if glow > 0.9 else ("brass", 4)
            for xy in mask([(-17, 31), (-11, 38), (4, 43), (22, 42), (33, 37), (40, 31.5), (33, 34.5), (20, 38.5), (2, 39), (-12, 33)]):
                cur = cel.px.get(xy)
                if cur is not None and cur[0] == "bone" and (cur[1] >= 5 or (xy[0] + xy[1]) % 2 == 0):
                    cel.px[xy] = warm

        # The cap: a broad wet dome over all of it.
        for xy in mask(CAP):
            x, y = local(xy)
            s = (x - 6.0) / 52.0 * lx + (y - 32.0) / 30.0 * ly
            rim = 38.0 - 0.0052 * (x - 8.0) ** 2
            t = 6 if s > 0.6 else 5 if s > 0.27 else 4 if s > -0.12 else 3 if s > -0.5 else 2
            if abs(s - 0.27) < 0.035 and (xy[0] + xy[1]) % 2 == 0:
                t = 4
            if y < rim + 2.4:
                t = max(1, t - 2)  # the underside of the rim, in its own shadow
            elif y < rim + 5.0 and int(math.floor(x)) % 3 == 0:
                t = max(2, t - 1)  # the margin, lined
            cel.px[xy] = ("leather", t)
        # Wet: a long highlight over the crown, and a second, fainter, lower down.
        for q in range(-14, 31):
            hx_, hy_ = float(q), 56.6 - 0.0105 * (q - 6.0) ** 2
            for dy_, tone in ((0.0, ("light", 0)), (-1.2, ("leather", 7))):
                xy = tuple(int(math.floor(v)) for v in H(hx_, hy_ + dy_))
                if cel.px.get(xy, VOID)[0] == "leather" and (q % 7 != 3):
                    cel.px[xy] = tone
        for i, (wx, wy, half, rows) in enumerate(WARTS):
            for q in range(-half, half + 1):
                for r_ in range(rows + 1):
                    xy = tuple(int(math.floor(v)) for v in H(wx + q + (r_ % 2) * 0.5, wy - r_))
                    cur = cel.px.get(xy)
                    if cur is not None and cur[0] in ("leather", "light") and (abs(q) < half or r_ < rows):
                        cel.px[xy] = ("bone", 7 if r_ == 0 else 6 if r_ < rows else 4)
        # Rags of veil off the rim.
        sway = pose["sway"]
        for vx, ln in ((57.0, 7.0), (53.5, 5.0), (-47.0, 10.0), (-43.5, 7.0)):
            a_ = H(vx, 38.0 - 0.0052 * (vx - 8.0) ** 2 + 0.5)
            for xy in cel.poly_mask([(a_[0] - 2.2, a_[1]), (a_[0] + 2.2, a_[1]), (a_[0] + sway * 0.3 - 0.3, a_[1] + ln)]):
                cel.px[xy] = ("bone", 6 if (xy[0] + xy[1]) % 5 else 5)

        # What grows on it when it is dead.
        bloom = pose["bloom"]
        if bloom > 0.0:
            for bx, by, size, when in BLOOM:
                g = _clamp((bloom - when) / 0.22)
                if g <= 0.0:
                    continue
                base = H(bx, by)
                topm = (base[0] + 0.6 * math.sin(bx), base[1] - size * g * 1.3)
                cel.limb(base, topm, 1.8, 1.4, "bone", (3, 5, 7))
                _dome(cel, topm[0], topm[1], max(1.5, size * 0.62 * g), 1.0 if g > 0.75 else 0.0)

    # ------------------------------------------------------------------------------------------------- drawing
    def draw(self, cel, J, pose, ropes, between) -> None:
        self.earth(cel, J, pose, -54, 30, 13.0, 3)
        self.slabs(cel, pose, front=False)
        self.lesser(cel, pose, front=False)
        self.stalk(cel, J, pose)
        self.ring(cel, J, pose, ropes)
        self.earth(cel, J, pose, -55, 30, 6.0, 9)
        self.volva(cel, J, pose)
        self.slabs(cel, pose, front=True)
        self.lesser(cel, pose, front=True)
        self.cords(cel, J, pose)
        self.head(cel, J, pose)
        # Pale flesh lets the light through at its edges: the dark side of everything pale has a thin lit rim.
        body = cel.px
        for (x, y), (ramp, i) in list(body.items()):
            if ramp == "bone" and i <= 4 and y < GROUND - 2:
                if (x - 1, y) not in body or (x, y + 1) not in body:
                    body[(x, y)] = ("bone", 6)
        # Nothing of it shows below the path.
        for xy in [xy for xy in cel.px if xy[1] > GROUND]:
            del cel.px[xy]
        cel.outline()
        for xy in [xy for xy in cel.px if xy[1] > GROUND + 1]:
            del cel.px[xy]

        # Light and dust: none of it is outlined.
        H = J["H"]
        glow = pose["glow"] * (1.0 - pose["dead"])
        if glow > 0.3:  # the gills' light hangs under the hood
            for x0, x1 in ((31.0, 57.0), (-47.0, -14.0)):
                q = x0
                while q <= x1:
                    rim = 38.0 - 0.0052 * (q - 8.0) ** 2
                    for dn in range(1, 4 if glow < 1.3 else 7):
                        px, py = H(q, rim - 7.0 - dn * 1.8)
                        if (int(px) * 2 + int(py) + dn) % 3 == 0:
                            cel.soft(px, py, ("brass", 6) if dn < 2 else ("brass", 5) if dn < 4 else ("brass", 3))
                    q += 1.2
        if pose["eye"] >= 0.6 and pose["dead"] < 0.5:
            self.tears(cel, J, pose["eye"], pose["mote_ph"])
            if pose["eye"] >= 1.4:
                cel.star(*H(EYE_C[0], EYE_C[1]), 4)
        if pose["breath"] > 0.01:
            self.breath(cel, J, pose["breath"])
        if pose["motes"] > 0.01:
            self.motes(cel, J, pose["motes"], pose["mote_ph"])
        if pose["jet"] > 0.01:
            self.jet(cel, J, pose)
        if 0.01 < pose["burst"] < 0.99:
            self.burst(cel, pose["burst_x"], pose["burst"])
        if pose["sprout"] > 0.01:
            self.sprouts(cel, pose["burst_x"], pose["sprout"])
        if pose["fount"] > 0.01:
            self.fountain(cel, J, pose["fount"])
        if pose["rise"] > 0.01:
            self.rise(cel, J, pose["rise"])
        if pose["clods"] > 0.01:
            self.clods(cel, pose["clod_x"], pose["clods"], pose["clod_dir"])

    @staticmethod
    def tears(cel: Cel, J: dict, eye: float, ph: float) -> None:
        """The pit spills: spores over its lower rim, down the lump, and off it towards the prey."""
        H = J["H"]
        x0, y0 = H(EYE_C[0] + 2.0, EYE_C[1] - EYE_R)
        for i in range(5):
            q = (ph * 2.0 + i * 0.2) % 1.0
            x = x0 + 1.5 * math.sin(i * 2.3) + 3.0 * q
            y = y0 + 3.0 + 30.0 * q * q + 6.0 * q
            if y >= GROUND - 1:
                continue
            tone = ("light", 0) if (q < 0.25 and eye >= 1.0) else ("brass", 7) if q < 0.5 else ("brass", 5) if q < 0.8 else ("brass", 3)
            cel.px[(int(math.floor(x)), int(math.floor(y)))] = tone
            if q < 0.4:
                cel.px[(int(math.floor(x)), int(math.floor(y)) - 1)] = ("brass", 6)

    @staticmethod
    def breath(cel: Cel, J: dict, u: float) -> None:
        """It breathes out: a little gold dust off the tear, falling towards the prey."""
        mx, my = J["mouth"]
        f = J["f"]
        for i in range(11):
            age = u - i * 0.06
            if age <= 0.0 or age >= 1.0:
                continue
            x = mx + f[0] * (3.0 + 15.0 * age) + 2.5 * math.sin(i * 2.1 + age * 4.0)
            y = my + f[1] * (3.0 + 15.0 * age) + 9.0 * age * age + (i % 3) - 1
            cel.soft(x, y, ("brass", 7) if age < 0.35 else ("brass", 6) if age < 0.7 else ("brass", 4))
            if age < 0.3 and i % 2 == 0:
                cel.soft(x + 1, y, ("brass", 6))

    @staticmethod
    def motes(cel: Cel, J: dict, u: float, ph: float) -> None:
        """Spores hang in the air all round it and drift up: it never stops."""
        for i in range(26):
            q = (ph + i * 0.137) % 1.0
            if _rnd(i, 77) > u:
                continue
            x0 = -88.0 + 144.0 * _rnd(i, 3)
            y0 = 12.0 + 96.0 * _rnd(i, 9)
            x = ROOT_X + x0 + 4.0 * math.sin(q * math.tau + i)
            y = GROUND - (y0 + 14.0 * q)
            if y < -cel.top + 1:
                continue
            fade = math.sin(math.pi * q)
            cel.soft(x, y, ("brass", 7) if fade > 0.8 else ("brass", 5) if fade > 0.4 else ("brass", 3))

    @staticmethod
    def jet(cel: Cel, J: dict, pose: Pose) -> None:
        """The blast: gold spores driven out of the tear and down onto the path."""
        mx, my = J["mouth"]
        tx, ty = P(pose["burst_x"], 1.0)
        power, ph = pose["jet"], pose["jet_ph"]
        f = J["f"]
        steps = 46
        for i in range(steps):
            t = i / (steps - 1)
            cx = lerp(mx + f[0] * 26.0 * t, lerp(mx, tx, t), t ** 0.8)
            cy = lerp(my + f[1] * 26.0 * t, lerp(my, ty, t), t ** 0.8)
            half = 1.6 + 9.5 * t ** 1.1
            n = int(2 + half * 1.7 * power)
            for k_ in range(n):
                r1, r2 = _rnd(i * 7 + k_, int(ph * 97) + 3), _rnd(i * 13 + k_ * 5, int(ph * 131) + 9)
                off = (r1 * 2.0 - 1.0) * half
                along = (r2 - 0.5) * 3.0
                x, y = cx + off * 0.75 + along * 0.4, cy - off * 0.55 + along
                if y >= GROUND - 1:
                    continue
                edge = abs(off) / max(1.0, half)
                if edge > 0.55 + 0.4 * power:
                    continue
                tone = ("light", 0) if (t < 0.3 and edge < 0.5) else ("brass", 7) if edge < 0.35 else ("brass", 6) if edge < 0.7 else ("brass", 4)
                cel.px[(int(math.floor(x)), int(math.floor(y)))] = tone
        cel.star(mx + f[0] * 3.0, my + f[1] * 3.0, 4 if power > 0.7 else 2)

    @staticmethod
    def burst(cel: Cel, at: float, u: float) -> None:
        """Where the breath lands: a low gold cloud rolls out along the path either way."""
        ix = ROOT_X + at
        reach = 8.0 + 24.0 * u ** 0.7
        for i in range(int(reach)):
            for sgn in (-1, 1):
                x = ix + sgn * i
                roll = math.sin(math.pi * min(1.0, i / reach)) ** 0.6
                hgt = (3.0 + 9.0 * roll) * (1.0 - 0.75 * u)
                for s in range(int(hgt) + 1):
                    if (i * 3 + s * 5 + int(u * 40)) % 4 == 0 and s > 1:
                        continue  # holes: it is dust, not a wall
                    top = s > hgt - 1.6
                    tone = ("brass", 7) if top and u < 0.5 else ("brass", 6) if s > hgt * 0.45 else ("brass", 4) if (i + s) % 2 else ("brass", 5)
                    cel.soft(x, GROUND - 1 - s, tone)
        if u < 0.28:
            cel.star(ix, GROUND - 7, 5)
            for q in range(-9, 10):
                cel.soft(ix + q, GROUND - 2, ("light", 0) if abs(q) < 6 else ("brass", 7))
        for i in range(12):  # sparks thrown up
            ang = math.radians(-165 + i * 14)
            dist = 6.0 + (18.0 + (i * 5 % 4) * 4.0) * u
            x = ix + math.cos(ang) * dist * 1.25
            y = GROUND - 3 + math.sin(ang) * dist + 12.0 * u * u
            if y < GROUND - 1:
                cel.soft(x, y, ("light", 0) if u < 0.4 else ("brass", 6))

    @staticmethod
    def sprouts(cel: Cel, at: float, g: float) -> None:
        """And where it lands, caps come up at once — and are gone as fast."""
        ix = ROOT_X + at
        for i, (dx, size) in enumerate(((-14, 5.0), (-7, 7.0), (-1, 4.0), (6, 8.0), (12, 5.0), (18, 4.0))):
            hgt = size * _clamp(g * 1.3 - 0.05 * i)
            if hgt < 1.0:
                continue
            x = ix + dx
            for s in range(int(hgt)):
                cel.px[(int(x), int(GROUND - 1 - s))] = ("bone", 6)
            r = max(1, int(hgt * 0.5))
            for xx in range(-r, r + 1):
                cel.px[(int(x + xx), int(GROUND - 1 - hgt))] = ("leather", 5)
                if abs(xx) < r:
                    cel.px[(int(x + xx), int(GROUND - 2 - hgt))] = ("leather", 6) if xx >= 0 else ("leather", 4)
                if xx % 2 == 0:
                    cel.px[(int(x + xx), int(GROUND - hgt))] = ("brass", 6)

    @staticmethod
    def fountain(cel: Cel, J: dict, u: float) -> None:
        """The last of it: emptied at the roof in one go — a column of gold that opens out and comes down as rain."""
        mx, my = J["mouth"]
        f = J["f"]
        live = 1.0 if u < 0.8 else max(0.0, (1.0 - u) / 0.2)
        steps = 60
        for i in range(steps):
            t = i / (steps - 1)
            cx, cy = mx + f[0] * 70.0 * t, my + f[1] * 70.0 * t + 14.0 * t * t
            if t > min(1.0, u * 2.4):
                break
            half = 2.0 + 13.0 * t
            n = int((5 + half * 2.2) * live)
            for k_ in range(n):
                r1, r2 = _rnd(i * 7 + k_, int(u * 61) + 3), _rnd(i * 13 + k_ * 5, int(u * 89) + 9)
                off = (r1 * 2.0 - 1.0) * half
                x, y = cx - f[1] * off + (r2 - 0.5) * 3.0, cy + f[0] * off + (r2 - 0.5) * 3.0
                if y < -cel.top + 1 or y >= GROUND - 1:
                    continue
                edge = abs(off) / max(1.0, half)
                tone = ("light", 0) if (t < 0.35 and edge < 0.5) else ("brass", 7) if edge < 0.4 else ("brass", 6) if edge < 0.75 else ("brass", 4)
                cel.px[(int(math.floor(x)), int(math.floor(y)))] = tone
        for i in range(46):  # and what comes down again
            born = 0.18 + (i % 9) * 0.05
            age = (u - born) / 0.55
            if age <= 0.0 or age >= 1.0:
                continue
            x = mx + f[0] * 50.0 + (_rnd(i, 5) * 2.0 - 1.0) * (16.0 + 30.0 * age) - 8.0 * age
            y = my + f[1] * 50.0 + 10.0 + 70.0 * age * age - 12.0 * age
            if y < -cel.top + 1 or y >= GROUND - 1:
                continue
            cel.soft(x, y, ("brass", 7) if age < 0.4 else ("brass", 5) if age < 0.75 else ("brass", 3))
        if live > 0.5:
            cel.star(mx + f[0] * 3.0, my + f[1] * 3.0, 4)

    @staticmethod
    def rise(cel: Cel, J: dict, u: float) -> None:
        """Spores off the dead thing, each a small light, going up slowly."""
        H = J["H"]
        for i, (bx, by, size, when) in enumerate(BLOOM):
            for k_ in range(4):
                born = when * 0.8 + 0.09 * k_
                if u <= born:
                    continue
                age = ((u - born) / 0.5) % 1.0 if u < 0.999 else ((1.0 - born) / 0.5) % 1.0
                x0, y0 = H(bx, by)
                x = x0 + 4.0 * math.sin(age * 5.0 + i + k_ * 2.0) - 4.0 * age
                y = y0 - size - 4.0 - 40.0 * age
                if y < -cel.top + 2:
                    continue
                tone = ("light", 0) if age < 0.15 else ("brass", 7) if age < 0.45 else ("brass", 5) if age < 0.8 else ("brass", 3)
                cel.soft(x, y, tone)
                if age < 0.45:
                    cel.soft(x + 1, y, tone)
                    cel.soft(x, y + 1, ("brass", 5))

    @staticmethod
    def clods(cel: Cel, at: float, u: float, direction: float) -> None:
        """Floor and earth thrown up where it breaks."""
        ix = ROOT_X + at
        for i in range(12):
            ang = math.radians(-160 + i * 12)
            dist = 5.0 + (16.0 + (i * 7 % 5) * 3.0) * u
            x = ix + direction * math.cos(ang) * dist
            y = GROUND - 5 + math.sin(ang) * dist + 13.0 * u * u
            if y >= GROUND - 1:
                continue
            tone = ("ink", 5) if i % 3 == 0 else ("leather", 4)
            for qx, qy in ((0, 0), (1, 0), (0, 1)) if i % 2 else ((0, 0), (1, 0), (0, 1), (1, 1)):
                cel.soft(x + qx, y + qy, tone if qy == 0 else ("leather", 2))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(foot=(-38.0, 0.0), lean=-14.0, curl=90.0, kink=0.0, length=69.0, gulp=-1.0, head=24.0, jaw=0.0, puff=0.0, eye=1.0, glow=1.0, dead=0.0, wilt=0.0,
                  sway=0.0, heave=0.0, plough=0.0, claw=0.0, scroll=0.0, slack=0.0, grope=0.0, nod=0.0, droop=0.0, breath=0.0, motes=1.0, mote_ph=0.0, jet=0.0,
                  jet_ph=0.0, burst=0.0, burst_x=56.0, sprout=0.0, fount=0.0, rise=0.0, bloom=0.0, clods=0.0, clod_x=24.0, clod_dir=1.0, flash=0.0)


def k(**over: object) -> Pose:
    return {**BASE, **over}


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.16))
    later = math.sin(math.tau * (ph - 0.3))
    pose = {**BASE, "lean": -14.0 + 2.2 * s, "curl": 90.0 + 3.5 * late, "head": 24.0 + 3.5 * later, "sway": 1.6 * later, "mote_ph": ph, "nod": late,
            "glow": 1.0 + 0.25 * (0.5 + 0.5 * math.sin(math.tau * 2 * ph)), "eye": 1.2 if math.sin(math.tau * 2 * ph) > 0.2 else 1.0}
    f = int(round(ph * 16)) % 16
    # It breathes out over the prey.
    puff = {2: (0.25, 0.2), 3: (0.3, 0.45), 4: (0.25, 0.7), 5: (0.1, 0.95)}.get(f)
    if puff is not None:
        pose["jaw"], pose["breath"] = puff
    # A cord creeps out towards the prey, feels the air, and is set down again.
    grope = {5: 0.3, 6: 0.7, 7: 1.0, 8: 0.9, 9: 0.4}.get(f)
    if grope is not None:
        pose["grope"] = grope
    # The head darts at the prey, the tear pulled open, and is drawn back.
    dart = {11: (5.0, 5.0, 0.25, 1.3), 12: (14.0, 12.0, 0.7, 1.5), 13: (12.0, 10.0, 0.6, 1.5), 14: (4.0, 3.0, 0.15, 1.3)}.get(f)
    if dart is not None:
        pose["curl"] += dart[0]
        pose["head"] += dart[1]
        pose["jaw"] = dart[2]
        pose["eye"] = dart[3]
        pose["lean"] += dart[0] * 0.25
    return pose


def haul_pose(ph: float) -> Pose:
    # Two hauls a cycle: the cords grip ahead and drag the mass up to them; the stalk is left behind by each pull and
    # whips after it, snapping at the air; the floor breaks in front of the heap and rides back past it.
    c = math.cos(2 * math.tau * ph)
    lag = math.cos(2 * math.tau * (ph - 0.17))
    later = math.cos(2 * math.tau * (ph - 0.3))
    snap = math.cos(2 * math.tau * (ph - 0.42))
    brk = (2 * ph) % 1.0
    return {**BASE, "foot": (-38.0 + 3.0 * c, 1.5 + 2.0 * c), "length": 65.0 + 3.0 * later, "lean": -17.0 + 13.0 * lag, "curl": 92.0 + 15.0 * later,
            "head": 21.0 + 13.0 * snap, "jaw": 0.4 + 0.35 * snap, "eye": 1.4, "glow": 1.3, "heave": 0.5 + 0.5 * c, "plough": 1.0, "claw": 2 * ph % 1.0,
            "scroll": ph, "sway": 6.0 * later - 4.0, "nod": 1.6 * lag, "mote_ph": ph, "clods": brk if brk < 0.8 else 0.0, "clod_x": 26.0, "clod_dir": 1.0}


# The strike. The neck draws up and back, a lump climbs the stalk, the lump of the face swells, the gills blaze; it
# hangs; then the whole neck whips forward and it blows a torrent of spores down onto the path.
_REAR = dict(lean=-32.0, curl=84.0, length=60.0, head=-16.0, puff=1.0, eye=1.6, glow=1.6, sway=-5.0, heave=0.4)
_BLOW = dict(lean=-16.0, curl=110.0, length=74.0, head=33.0, jaw=1.0, puff=0.3, eye=1.6, glow=1.6, sway=7.0, heave=0.8)
STRIKE_KEYS = [
    (0.00, k(), "lin"),
    (0.12, k(lean=-12.0, curl=95.0, head=29.0, eye=1.3, glow=1.2, sway=2.0, gulp=0.1), "io"),
    (0.22, k(lean=-19.0, curl=90.0, length=68.0, head=12.0, puff=0.2, eye=1.4, glow=1.3, sway=-3.0, gulp=0.35), "io"),
    (0.32, k(lean=-27.0, curl=86.0, length=63.0, head=-4.0, puff=0.6, eye=1.5, glow=1.5, sway=-5.0, heave=0.3, gulp=0.7), "out"),
    (0.42, k(**_REAR, gulp=0.98), "out"),
    (0.50, k(**{**_REAR, "lean": -33.5, "head": -19.0, "kink": -2.0}, gulp=1.2), "io"),
    (0.55, k(**_BLOW, jet=1.0, jet_ph=0.1, burst=0.02), "in3"),
    (0.59, k(**{**_BLOW, "curl": 112.0, "head": 35.0}, jet=1.0, jet_ph=0.3, burst=0.3, sprout=0.25), "lin"),
    (0.63, k(**{**_BLOW, "curl": 111.0, "head": 34.0}, jet=0.85, jet_ph=0.5, burst=0.55, sprout=0.6), "lin"),
    (0.70, k(**{**_BLOW, "curl": 108.0, "head": 32.0, "jaw": 0.7, "puff": 0.0, "eye": 1.4, "glow": 1.3}, jet=0.45, jet_ph=0.7, burst=0.98, sprout=1.0), "lin"),
    (0.77, k(lean=-13.0, curl=100.0, length=71.0, head=30.0, jaw=0.35, eye=1.3, glow=1.1, sway=-4.0, heave=0.3, burst=1.0, sprout=0.9), "io"),
    (0.84, k(lean=-15.0, curl=88.0, head=22.0, jaw=0.1, eye=1.2, sway=-3.0, burst=1.0, sprout=0.6), "io"),
    (0.92, k(lean=-14.0, curl=91.0, head=23.0, sway=2.0, burst=1.0, sprout=0.3), "io"),
    (1.00, k(burst=1.0), "io"),
]

# Hit: the head is knocked back on the stalk, the eye gutters, every cap on the heap shakes, and the stalk swings
# forward again past its rest.
HURT_KEYS = [
    (0.00, k(), "lin"),
    (0.07, k(lean=-17.0, curl=86.0, length=66.0, head=12.0, jaw=0.3, eye=1.6, glow=1.5, sway=-5.0, nod=-2.0, flash=1.0), "out3"),
    (0.16, k(lean=-22.0, curl=84.0, length=65.0, head=-4.0, jaw=0.55, eye=0.5, glow=0.5, sway=-9.0, heave=0.5, nod=2.5, flash=0.5), "lin"),
    (0.26, k(lean=-25.0, curl=82.0, length=62.0, head=-12.0, jaw=0.6, eye=0.4, glow=0.4, sway=-8.0, heave=0.6, nod=-2.0, clods=0.3, clod_x=-66.0, clod_dir=-1.0), "out"),
    (0.50, k(lean=-10.0, curl=100.0, length=72.0, head=34.0, jaw=0.2, eye=1.3, glow=1.0, sway=7.0, heave=0.2, nod=1.5, clods=0.9, clod_x=-66.0, clod_dir=-1.0), "io"),
    (0.74, k(lean=-15.0, curl=89.0, head=21.0, eye=1.2, sway=-3.0, nod=-0.6), "io"),
    (1.00, k(), "io"),
]

# Death. One last fountain at the roof; the eye and the gills go out; the stalk goes slack and the cap FALLS, forward,
# onto its face; and then it fruits.
_UP = dict(lean=4.0, curl=24.0, length=56.0, head=-42.0, jaw=1.0, eye=1.6, glow=1.6, sway=-6.0)
_FALLEN = dict(lean=-74.0, curl=216.0, length=50.0, head=46.0, jaw=0.25, wilt=1.0, eye=0.0, glow=0.0, dead=1.0, motes=0.0, slack=1.0, droop=1.0, fount=1.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.03, k(lean=-17.0, curl=86.0, length=66.0, head=12.0, jaw=0.3, eye=1.6, glow=1.5, sway=-5.0, nod=-2.0, flash=1.0), "out3"),
    (0.10, k(**_UP, fount=0.05), "out"),
    (0.20, k(**{**_UP, "lean": 2.0, "head": -45.0, "kink": 2.0}, fount=0.45, nod=1.5), "lin"),
    (0.27, k(**{**_UP, "lean": 0.0, "curl": 34.0, "head": -38.0, "jaw": 0.8, "eye": 0.8, "glow": 0.8}, fount=0.8, wilt=0.1, nod=-1.0), "lin"),
    (0.34, k(lean=-12.0, curl=74.0, head=-8.0, jaw=0.5, eye=0.6, glow=0.5, kink=6.0, length=64.0, wilt=0.3, sway=5.0, fount=1.0, motes=0.4, slack=0.3, droop=0.15), "io"),
    (0.42, k(lean=-24.0, curl=104.0, head=18.0, jaw=0.4, eye=0.5, glow=0.3, kink=-8.0, length=62.0, wilt=0.5, sway=-5.0, motes=0.0, dead=0.4, fount=1.0,
             slack=0.6, droop=0.35), "io"),
    (0.50, k(lean=-52.0, curl=172.0, head=32.0, jaw=0.3, eye=0.0, glow=0.1, kink=4.0, length=62.0, wilt=0.75, sway=6.0, motes=0.0, dead=0.8, fount=1.0, slack=0.9,
             droop=0.6), "in"),
    (0.57, k(**{**_FALLEN, "head": 52.0, "lean": -75.0}, heave=1.0, clods=0.15, clod_x=12.0, clod_dir=1.0), "in3"),
    (0.62, k(**{**_FALLEN, "head": 42.0, "curl": 211.0}, heave=0.6, clods=0.6, clod_x=12.0, clod_dir=1.0), "out"),
    (0.68, k(**_FALLEN, clods=0.95, clod_x=12.0, clod_dir=1.0, bloom=0.03), "io"),
    (0.80, k(**_FALLEN, bloom=0.4, rise=0.2), "lin"),
    (0.90, k(**_FALLEN, bloom=0.8, rise=0.6), "lin"),
    (1.00, k(**_FALLEN, bloom=1.0, rise=1.0), "lin"),
]

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 16 for i in range(16)], [150] * 16, True, air=lambda t: (-0.45 + 0.2 * math.sin(math.tau * t), 0.0)),
    "run": Anim("run", haul_pose, [i / 12 for i in range(12)], [95] * 12, True, air=lambda t: (-1.2, 0.0)),
    "attack": Anim("attack", keyed(STRIKE_KEYS), [0.0, 0.06, 0.12, 0.18, 0.24, 0.30, 0.36, 0.42, 0.50, 0.55, 0.59, 0.63, 0.67, 0.70, 0.77, 0.84, 0.92, 1.0],
                   # An enemy swings every 1250 ms and the game starts this clip its wind-up ahead of the swing: 660 ms to the
                   # blow (the frame after the 130 ms hang), 290 of breath, 290 to stand back — it fits between two swings.
                   [60, 60, 70, 60, 60, 70, 70, 80, 130, 40, 50, 60, 60, 80, 80, 70, 70, 70], False, air=lambda t: (-0.4, 0.0)),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, air=lambda t: (-0.4, 0.0)),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.015, 0.03, 0.065, 0.10, 0.15, 0.20, 0.27, 0.34, 0.38, 0.42, 0.46, 0.50, 0.535, 0.57, 0.595, 0.62, 0.65, 0.68, 0.74,
                                               0.80, 0.85, 0.90, 0.95, 1.0],
                  [70, 50, 70, 90, 120, 130, 140, 120, 110, 100, 100, 100, 100, 80, 70, 80, 100, 110, 130, 150, 170, 190, 200, 260, 1500], False,
                  air=lambda t: (-0.4 * (1.0 - t), 0.0)),
}
