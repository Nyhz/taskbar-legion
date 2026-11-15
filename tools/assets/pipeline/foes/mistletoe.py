"""Our Lady of Mistletoe — world 2, WORLD boss. What the Old Moss Forest grew around.

She does not stand: she HANGS. High in the canopy sits a knot of roots the size of a cart — the forest's heart,
with a cold light beating in its cracks — held up by four vines as thick as a man's arm. Out of its underside,
head down, hangs a colossal woman of pale birch wood: a saint's body with bark for skin, and for a face a smooth
carved MASK, eyes closed, serene, upside down at the height of a hero's eyes, weeping moss the wrong way. Her
hair is willow fronds full of pale berries and trapped fireflies; it brushes the path. Her two arms are far too
long — elbows above her shoulders, forearms as long as a hero is tall twice over — and she stands on her
fingertips either side of her head, like a spider on a thread. Moss hangs from her upper arms like the sleeves of a shroud.

She does not walk either: the vines slide through the canopy and she hands herself along the path, the whole
weight of her swinging after each reach. Attack: she swings back and REARS like a spider, both arms raised over
the prey — and the mask SPLITS down its seam and opens like a seed pod on a throat of thorns with a light at the
bottom of it; she hangs there, then the pendulum comes down and both hands rake the path where the prey stands;
earth, leaves and berries burst. Hit: the blow sets her swinging, the head whips, a hand comes off the ground, the
mask gapes for an instant, leaves fly. Death: she convulses, the mask wide — and the vines snap, one, two, three,
each dropping her a notch; on the fourth the heart comes down on top of her. What is left is a mound of roots
with its light out, the mask lying shut on the path, one long arm flung out behind and the other left standing,
reaching for the canopy she fell from, sagging. The fireflies caught in her hair rise out of it and leave.

Own rig (nothing of the humanoid skeleton). Frame 248 wide with 59 extra rows above — the frame's top IS the top
of the strip, so the vines leave the picture. Root at 104: her column hangs 13 px ahead of the root. The Knight
closes to 50 px of her root, so at rest nothing of her below his height passes 36 px (her forward fingers at 35);
the strike lands on him, 58 px ahead. Drawn facing right; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Pose, Pt, ik, keyed, lerp

FIGURE = ("Mistletoe", "boss", "w02")

ROOT_X = 104
#: The column she hangs in, ahead of the root.
COL = 13.0
BUILD = Build(root_x=ROOT_X, thigh=1.0, shin=1.0, foot=0.0, hip_dx=0.0, spine=0.0, sh_near=0.0, sh_far=0.0, upper=1.0, fore=1.0, neck=0.0)

#: The pendulum: the vines turn about a point above the picture; the heart hangs R1 below it.
PIV_UP, R1 = 163.0, 61.0
#: Body lengths, hip (inside the heart) to shoulders, and the arms.
T1, T2 = 14.0, 16.0
UPPER, FORE = 23.0, 64.0
SH_N, SH_F = 9.5, 10.0
#: The mask is HEAD long from chin to crown.
HEAD = 27.0

VOID = ("ink", 0)


def _hash(x: int, y: int) -> int:
    return ((x * 73856093) ^ (y * 19349663)) & 0x7FFFFFFF


def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def P(x: float, up: float) -> Pt:
    return (ROOT_X + x, GROUND - up)


def _dir(deg: float) -> Pt:
    """The screen direction `deg` clockwise... of something hanging: 0 = straight down, positive = swung forward."""
    a = math.radians(deg)
    return (math.sin(a), math.cos(a))


def _side(deg: float) -> Pt:
    """Across a hanging thing: its forward side."""
    a = math.radians(deg)
    return (math.cos(a), -math.sin(a))


def _add(p: Pt, d: Pt, k: float) -> Pt:
    return (p[0] + d[0] * k, p[1] + d[1] * k)


def _quad(a: Pt, c: Pt, b: Pt, n: int) -> list[Pt]:
    return [((1 - t) ** 2 * a[0] + 2 * t * (1 - t) * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * t * (1 - t) * c[1] + t * t * b[1])
            for t in (i / n for i in range(n + 1))]


# ------------------------------------------------------------------------------------------------- the mask
# Built here, not typed: an elongated oval with a pointed chin, lit as it hangs (chin up, so the light falls on the
# chin and the brow is in shade), then the features cut into it. Stored as it is seen — upside down, chin on the
# first row — in two halves that part along the seam.
_HALF = [4.6, 6.6, 8.0, 9.0, 9.7, 10.1, 10.2, 10.2, 10.2, 10.2, 10.2, 10.2, 10.2, 10.2, 10.2, 10.2, 10.2, 10.1, 9.9, 9.6, 9.2, 8.7, 8.0, 7.2, 6.2,
         5.0, 3.4]  # brow → chin
MASK_W, MASK_H, MASK_C = 21, len(_HALF), 10
_TONES = "defgh"  # bone 4…7, then the warm white


def _mask() -> tuple[list[str], list[str]]:
    grid: dict[tuple[int, int], str] = {}
    for r, half in enumerate(_HALF):
        for c in range(MASK_W):
            x = float(c - MASK_C)
            if abs(x) > half:
                continue
            nx, ny = x / 10.2, (r - 13.0) / 13.5
            # Porcelain: nearly all of it pale, a soft shade down the side away from the light and under the brow.
            v = 2.9 + 1.5 * nx + 0.8 * ny - 0.5 * (nx * nx)
            if abs(x) > half - 1.1:  # the rim: a carved edge, dark on the left, bright on the right
                v += 1.0 if x > 0 else -2.0
            grid[(c, r)] = _TONES[int(_clamp(v, 0.0, 4.0))]
    cut: dict[tuple[int, int], str] = {}
    # The seam it splits along, and the nose over it: one line of shade, one of light.
    for r in list(range(0, 9)) + list(range(22, MASK_H)):
        cut[(10, r)] = "c"
    for r in range(11, 17):
        cut[(10, r)] = "d"
        cut[(11, r)] = "h"
    cut.update({(9, 17): "b", (10, 17): "c", (11, 17): "c", (12, 17): "b"})
    # The closed lids: two long cuts curved like a sleeper's, black, with the light behind them; a brow over each.
    for c, r in ((2, 10), (3, 11), (4, 12), (5, 12), (6, 12), (7, 11), (8, 10), (12, 10), (13, 11), (14, 12), (15, 12), (16, 12), (17, 11), (18, 10)):
        cut[(c, r)] = "K"
    for c, r in ((4, 11), (5, 11), (6, 11), (14, 11), (15, 11), (16, 11)):
        cut[(c, r)] = "G"
    for c, r in ((3, 10), (7, 10), (13, 10), (17, 10), (4, 13), (5, 13), (6, 13), (14, 13), (15, 13), (16, 13)):
        cut[(c, r)] = "Q"
    for c, r in ((2, 7), (3, 6), (4, 6), (5, 6), (6, 6), (7, 7), (13, 7), (14, 6), (15, 6), (16, 6), (17, 6), (18, 7)):
        cut[(c, r)] = "c"
    # The mouth: shut, a little sad.
    for c, r in ((7, 22), (8, 21), (9, 21), (10, 21), (11, 21), (12, 21), (13, 22)):
        cut[(c, r)] = "K"
    for c in (9, 10, 11):
        cut[(c, 22)] = "h"
    cut.update({(9, 20): "d", (11, 20): "d"})
    # She weeps moss, and it runs the wrong way: from the lids up over the brow.
    for c, r in ((5, 9), (5, 8), (4, 5), (5, 4), (5, 3), (15, 9), (15, 8), (16, 5), (15, 4), (15, 2)):
        cut[(c, r)] = "n" if r % 2 else "m"
    # Cracks of age.
    cut.update({(17, 16): "d", (17, 17): "c", (16, 18): "c", (15, 19): "d", (3, 16): "c", (3, 17): "c", (4, 18): "c"})
    for xy, ch in cut.items():
        if xy in grid:
            grid[xy] = ch
    left, right = [], []
    for r in range(MASK_H - 1, -1, -1):  # chin first
        row = "".join(grid.get((c, r), ".") for c in range(MASK_W))
        left.append(row[:11] + "." * 10)
        right.append("." * 11 + row[11:])
    return left, right


MASK_L, MASK_R = _mask()
MASK_LEGEND = {"b": ("bone", 2), "c": ("bone", 3), "d": ("bone", 4), "e": ("bone", 5), "f": ("bone", 6), "g": ("bone", 7), "h": ("light", 0),
               "m": ("moss", 4), "n": ("moss", 5), "K": ("ink", 0)}
#: The hinge of the two halves, in sprite pixels: the chin.
MASK_HINGE = (10.5, 0.5)


def glow_tones(glow: float) -> dict[str, tuple[str, int]]:
    """The light behind the lids (G) and what of it reaches the cheek round them (Q)."""
    if glow >= 1.2:
        return {"G": ("light", 0), "Q": ("sea", 7)}
    if glow >= 0.8:
        return {"G": ("sea", 8), "Q": ("sea", 6)}
    if glow >= 0.45:
        return {"G": ("sea", 6), "Q": ("bone", 5)}
    if glow >= 0.15:
        return {"G": ("sea", 3), "Q": ("bone", 5)}
    return {"G": ("bone", 0), "Q": ("bone", 5)}


# ------------------------------------------------------------------------------------------------- the heart
#: Its outline in its own frame (u forward, v down, from its middle).
HEART = [(-31, -11), (-26, -21), (-11, -26), (8, -26), (25, -21), (33, -8), (31, 6), (21, 17), (9, 23), (-3, 25), (-16, 20), (-28, 8)]
#: Roots wound round it: (from, through, to, width, tone index). Laid from the back of the ball to the front.
WOUND = [
    ((-32, -14), (0, -30), (33, -12), 7.0, 0), ((-33, -4), (-2, -17), (34, -3), 7.0, 1), ((-31, 6), (0, -5), (33, 6), 7.0, 0),
    ((-26, 14), (0, 6), (27, 14), 7.0, 1), ((-16, 22), (2, 17), (18, 21), 6.0, 0),
    ((-22, -24), (-2, -4), (26, 16), 6.0, 2), ((24, -24), (10, -2), (-24, 14), 5.5, 2), ((2, -27), (-12, -2), (-6, 24), 5.0, 1),
]
#: The cracks the light beats in.
CRACKS = [[(-22, -1), (-15, -4), (-8, -3), (-3, 0)], [(5, 3), (12, 1), (19, 2), (24, 5)], [(-13, 9), (-5, 12), (3, 11), (9, 8)], [(-4, 18), (2, 20), (7, 18)], [(8, -12), (14, -13), (19, -10)]]
#: The vines: where each leaves the picture (x from the column), where it holds the heart, and the order they give way in.
VINES = [(-37.0, (-23.0, -18.0), 2), (-12.0, (-9.0, -25.0), 0), (13.0, (9.0, -25.0), 3), (41.0, (25.0, -18.0), 1)]
#: Sprigs of mistletoe on the heart: (u, v, length, lean).
SPRIGS = [(-29.0, 6.0, 11.0, -1.5), (31.0, 4.0, 12.0, 1.5), (18.0, 17.0, 9.0, 0.5), (-18.0, 18.0, 8.0, -0.5), (-30.0, -12.0, 8.0, -2.0)]
#: Lichen hanging from its underside: (u, v, length).
LICHEN = [(-23.0, 12.0, 13.0), (-11.0, 21.0, 9.0), (14.0, 20.0, 12.0), (25.0, 12.0, 15.0), (-27.0, 2.0, 8.0)]


class Mistletoe(Character):
    build = BUILD
    W = 248
    TOP = 59

    # ------------------------------------------------------------------------------------------------- skeleton
    def joints(self, pose: Pose) -> dict:
        J: dict = {}
        a = pose["sw"]
        piv = P(COL + pose["slide"], PIV_UP)
        hc = _add(piv, _dir(a), R1)
        hc = (hc[0], hc[1] + pose["fall"])
        t = a + pose["heart_rot"]
        hu, hv = _side(t), _dir(t)
        sq = pose["squash"]

        def HB(u: float, v: float) -> Pt:
            return (hc[0] + hu[0] * u * (1.0 + 0.2 * sq) + hv[0] * v * (1.0 - 0.38 * sq), hc[1] + hu[1] * u * (1.0 + 0.2 * sq) + hv[1] * v * (1.0 - 0.38 * sq))

        J["HB"], J["heart"], J["heart_rot"], J["top"] = HB, hc, t, P(COL + pose["slide"], 123.0)
        tuck = pose["tuck"]
        hip = _add(HB(2.0, 17.0), hv, pose["drop"])
        body, curl = pose["body"], pose["curl"]
        waist = _add(hip, _dir(body - curl / 2), T1 * (1.0 - 0.85 * tuck))
        ac = body + curl / 2
        sh = _add(waist, _dir(ac), T2 * (1.0 - 0.85 * tuck))
        J["hip"], J["waist"], J["sh"], J["chest_rot"] = hip, waist, sh, ac
        J["shF"] = _add(_add(sh, _side(ac), SH_F), _dir(ac), -1.0)
        J["shN"] = _add(sh, _side(ac), -SH_N)
        ah = ac + pose["head"]
        chin = _add(_add(sh, _dir(ac), 3.0), _dir(ah), 4.0)
        J["chin"], J["head_rot"] = chin, ah
        J["headc"] = _add(chin, _dir(ah), HEAD / 2)
        J["crown"] = _add(chin, _dir(ah), HEAD)
        J["hair"] = [_add(_add(J["crown"], _side(ah), (i - 3) * 4.2 - 1.5), _dir(ah), -abs(i - 3) * 2.6 - 1.0) for i in range(7)]
        for name, bend in (("N", 1), ("F", -1)):
            tx, tup = pose["hand" + name]
            # The elbow can be on either side of the arm's line; `flip` takes it across without a jump.
            (e1, wr), (e2, _wr) = ik(J["sh" + name], P(tx, tup), UPPER, FORE, bend), ik(J["sh" + name], P(tx, tup), UPPER, FORE, -bend)
            f = pose["flip" + name]
            J["elbow" + name], J["wrist" + name] = (lerp(e1[0], e2[0], f), lerp(e1[1], e2[1], f)), wr
        # The mask rides the head until the pose lets it go.
        at, rot = chin, ah
        w = pose["mask_free"]
        if w > 0.001:
            to = P(*pose["mask_at"])
            at, rot = (lerp(at[0], to[0], w), lerp(at[1], to[1], w)), lerp(ah, pose["mask_rot"], w)
        J["mask"], J["mask_rot"] = at, rot
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def grounded(pts: list[Pt], J: dict) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        out = {}
        for i in range(7):
            n = (8, 7, 9, 8, 9, 7, 8)[i]
            out[f"hair{i}"] = ChainSpec(Chain(n, 3.3, gravity=0.2, drag=0.12, damp=0.08), (lambda J, i=i: J["hair"][i]), grounded)
        return out

    # ------------------------------------------------------------------------------------------------- parts
    def vines(self, cel: Cel, J: dict, pose: Pose) -> None:
        HB, top = J["HB"], J["top"]
        snap = pose["snap"]
        for i, (tx, (bu, bv), rank) in enumerate(VINES):
            a, b = (top[0] + tx, top[1] - 2.0), HB(bu, bv)
            gone = snap - rank
            if gone <= 0.0:
                # Taut, with the least sag; a turn of moss here and there.
                pts = _quad(a, ((a[0] + b[0]) / 2 + (2.0 if i % 2 else -2.0), (a[1] + b[1]) / 2 + 1.0), b, 6)
                for p0, p1 in zip(pts, pts[1:]):
                    cel.limb(p0, p1, 4.4, 4.4, "leather", (1, 2, 4))
                for k_, p in enumerate(pts[1:-1]):
                    if (k_ + i) % 2 == 0:
                        cel.put(p[0] + 2, p[1], ("moss", 5))
                        cel.put(p[0] + 2, p[1] + 1, ("moss", 4))
                        cel.put(p[0] - 2, p[1] + 2, ("moss", 3))
                continue
            # Snapped: the upper end swings from the canopy, the lower flops over the heart.
            swing = 7.0 * math.sin(gone * 9.0 + i) * math.exp(-gone * 1.6)
            length = (17.0, 24.0, 15.0, 21.0)[i]
            end = (a[0] + swing, a[1] + length)
            pts = _quad(a, (a[0] + swing * 0.2, a[1] + length * 0.6), end, 4)
            for p0, p1 in zip(pts, pts[1:]):
                cel.limb(p0, p1, 4.4, 3.6, "leather", (1, 2, 4))
            cel.put(end[0], end[1] + 1, ("leather", 6))
            cel.put(end[0] - 1, end[1] + 2, ("leather", 5))
            out = -1.0 if bu < 0 else 1.0
            flop = _clamp(gone * 2.2)
            tip = (b[0] + out * (4.0 + 9.0 * flop), min(b[1] - 10.0 + 22.0 * flop, GROUND - 2.0))
            pts = _quad(b, (b[0] + out * 3.0, b[1] - 9.0 + 6.0 * flop), tip, 4)
            for p0, p1 in zip(pts, pts[1:]):
                cel.limb(p0, p1, 4.2, 3.4, "leather", (1, 2, 4))
            cel.put(tip[0], tip[1], ("leather", 6))
            if gone < 0.34:  # the break itself
                bx, by = (a[0] + b[0]) / 2, a[1] + length + 3.0
                cel.star(bx, by, 3)
                for q in range(5):
                    ang = math.radians(-150 + q * 62)
                    cel.put(bx + math.cos(ang) * (3.0 + 9.0 * gone), by + math.sin(ang) * (3.0 + 9.0 * gone), ("leather", 6) if q % 2 else ("bone", 6))

    def heart(self, cel: Cel, J: dict, pose: Pose) -> None:
        HB = J["HB"]
        inside = set(cel.poly_mask([HB(u, v) for u, v in HEART]))
        for xy in inside:
            cel.px[xy] = ("leather", 0)
        tmp = Cel(cel.w, cel.h, cel.top)
        for (a, c, b, width, k_) in WOUND:
            pts = _quad(HB(*a), HB(*c), HB(*b), 9)
            idx = ((0, 1, 2), (0, 1, 3), (1, 2, 4))[k_]
            for p0, p1 in zip(pts, pts[1:]):
                tmp.limb(p0, p1, width, width, "leather", idx)
        hc = J["heart"]
        dark = pose["dark"]
        for xy, tone in tmp.px.items():
            if xy not in inside:
                continue
            # Moss on what faces the sky and the light; the underside stays bare and dark.
            du, dv = xy[0] - hc[0], xy[1] - hc[1]
            h = _hash(xy[0], xy[1]) % 16
            lit = (du * 0.45 - dv) / 26.0
            if tone[1] >= 2 and lit > 0.25 and h < 4 + int(lit * 8):
                tone = ("moss", 5 if h == 0 and lit > 0.5 else 4 if h % 2 else 3)
            elif lit < -0.45 and tone[1] > 1:
                tone = ("leather", tone[1] - 1)
            cel.px[xy] = tone
        # The light in the cracks: it beats.
        pulse = pose["pulse"] * (1.0 - dark)
        core = ("light", 0) if pulse > 1.15 else ("sea", 8) if pulse > 0.8 else ("sea", 6) if pulse > 0.45 else ("sea", 4) if pulse > 0.15 else ("ink", 1)
        halo = ("sea", 5) if pulse > 1.15 else ("sea", 3) if pulse > 0.8 else None
        for crack in CRACKS:
            pts = [HB(u, v) for u, v in crack]
            line = Cel(cel.w, cel.h, cel.top)
            for p0, p1 in zip(pts, pts[1:]):
                line.line(p0, p1, core)
            if halo is not None:
                for (x, y) in line.px:
                    for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                        if n in inside and n not in line.px:
                            cel.px[n] = halo
            for xy, t in line.px.items():
                if xy in inside:
                    cel.px[xy] = t
        # Lichen from the underside, and the mistletoe: forked sprigs, leaves in pairs, pale berries.
        sway = pose["sway"]
        for i, (u, v, length) in enumerate(LICHEN):
            a = HB(u, v)
            end = (a[0] + sway * (0.5 + 0.2 * i) - 1.0, min(a[1] + length, GROUND - 1.5))
            cel.limb(a, end, 2.6, 1.0, "moss", (2, 3, 5))
        for i, (u, v, length, lean_) in enumerate(SPRIGS):
            a = HB(u, v)
            for k_ in range(1, int(length) + 1):
                x, y = a[0] + (lean_ + sway * 0.4) * k_ / 4.0, min(a[1] + k_, GROUND - 2.0)
                cel.put(x, y, ("moss", 4))
                if k_ % 3 == 0:
                    cel.put(x - 1, y - 1, ("moss", 7))
                    cel.put(x - 2, y - 1, ("moss", 6))
                    cel.put(x + 1, y - 1, ("moss", 7))
                    cel.put(x + 2, y - 1, ("moss", 6))
                if k_ % 3 == 1 and k_ > 1:
                    cel.put(x + (1 if (k_ + i) % 2 else -1), y, ("light", 0))
            x, y = a[0] + (lean_ + sway * 0.4) * length / 4.0, min(a[1] + length + 1, GROUND - 2.0)
            cel.put(x, y, ("light", 0))
            cel.put(x + 1, y - 1, ("bone", 6))

    def arm(self, cel: Cel, J: dict, pose: Pose, name: str, far: bool) -> None:
        sh, el, wr = J["sh" + name], J["elbow" + name], J["wrist" + name]
        # Moss hangs from her upper arms like the sleeves of a shroud: longest at the elbow.
        sway = pose["sway"]
        for i in range(9):
            t = (i + 0.5) / 9
            a = (lerp(sh[0], el[0], t), lerp(sh[1], el[1], t) + 1.0)
            length = lerp(8.0, 25.0, t) * (0.7 if i % 3 == 1 else 1.0)
            end = (a[0] + sway * (0.3 + 0.5 * t) + (0.6 if i % 2 else -0.6), min(a[1] + length, GROUND - 1.5))
            if end[1] > a[1] + 2.0:
                cel.limb(a, end, 3.6, 1.0, "moss", (1, 2, 4) if i % 2 else (1, 3, 5), far=far)
                if i % 3 == 0:
                    cel.put(end[0], end[1] - 2.0, ("light", 0) if not far else ("bone", 5))
        tmp = Cel(cel.w, cel.h, cel.top)
        tmp.limb(sh, el, 7.0, 5.4, "bone", (3, 5, 7), far=far)
        tmp.limb(el, _add(el, (wr[0] - el[0], wr[1] - el[1]), 0.5), 5.4, 4.2, "bone", (3, 5, 7), far=far)
        tmp.limb(_add(el, (wr[0] - el[0], wr[1] - el[1]), 0.5), wr, 4.2, 3.2, "bone", (3, 5, 7), far=far)
        tmp.limb(_add(el, (0.0, -1.0), 1.0), _add(el, (0.0, 1.0), 0.5), 7.2, 6.8, "bone", (3, 5, 7), far=far)
        self.bark(tmp, far)
        cel.px.update(tmp.px)
        cel.put(el[0], el[1], ("bone", 2))  # the knot of the elbow
        cel.put(el[0] - 1, el[1], ("bone", 3))
        cel.put(el[0], el[1] - 1, ("bone", 3))
        # A hand of five long twig fingers. On the path she stands on their tips, knuckles high, like a spider; in
        # the air they hook.
        dx, dy = wr[0] - el[0], wr[1] - el[1]
        d = math.hypot(dx, dy) or 1.0
        fx, fy = dx / d, dy / d
        planted = 1.0 - _clamp((GROUND - 2.0 - wr[1] - 6.0) / 6.0)
        out = -1.0 if name == "N" else 1.0
        for spread, length in ((-1.3, 9.0), (-0.65, 12.0), (0.0, 13.5), (0.65, 12.0), (1.3, 8.5)):
            ang = math.atan2(fy, fx) + spread * 0.52
            ax, ay = math.cos(ang), math.sin(ang)
            # In the air: straight on from the forearm, hooked at the end.
            mid_a = (wr[0] + ax * length * 0.55, wr[1] + ay * length * 0.55)
            tip_a = (mid_a[0] + (ax * 0.8 + fy * 0.25 * out) * length * 0.5, mid_a[1] + (ay * 0.8 + 0.45) * length * 0.5)
            # On the path: the knuckle up and out, the tip down on the earth.
            reach = spread * 5.2 + out * 1.6
            mid_g = (wr[0] + reach * 0.62, wr[1] - 1.6 - 0.8 * (1.3 - abs(spread)))
            tip_g = (wr[0] + reach * 1.25, GROUND - 1.0)
            mid = (lerp(mid_a[0], mid_g[0], planted), min(lerp(mid_a[1], mid_g[1], planted), GROUND - 2.0))
            tip = (lerp(tip_a[0], tip_g[0], planted), min(lerp(tip_a[1], tip_g[1], planted), GROUND - 1.0))
            cel.limb(wr, mid, 2.6, 2.0, "bone", (3, 5, 7), far=far)
            cel.limb(mid, tip, 2.0, 1.0, "bone", (3, 5, 7), far=far)
            cel.put(tip[0], tip[1], ("bone", 2 if far else 3))

    @staticmethod
    def bark(tmp: Cel, far: bool = False) -> None:
        """Birch: pale skin crossed by short dark scars."""
        for (x, y) in list(tmp.px):
            if _hash(x // 2, y * 3) % 19 == 0 and (x + 1, y) in tmp.px and (x - 1, y) in tmp.px:
                tmp.px[(x, y)] = ("bone", 2)
                tmp.px[(x + 1, y)] = ("bone", 2 if far else 3)

    def body(self, cel: Cel, J: dict, pose: Pose) -> None:
        hip, waist, sh, ac = J["hip"], J["waist"], J["sh"], J["chest_rot"]
        tmp = Cel(cel.w, cel.h, cel.top)
        tmp.limb(hip, waist, 15.0, 11.5, "bone", (3, 5, 7))
        tmp.limb(waist, sh, 11.5, 19.0, "bone", (3, 5, 7))
        tmp.limb(J["shN"], J["shF"], 7.0, 7.0, "bone", (3, 5, 7))
        self.bark(tmp)
        # Ribs: three shallow cuts each side of the breastbone, and the hollow where a heart would be.
        cc = _add(waist, _dir(ac), T2 * 0.62 * (1.0 - 0.85 * pose["tuck"]))
        dn, sd = _dir(ac), _side(ac)
        for k_ in range(3):
            for s_ in (-1.0, 1.0):
                a = _add(_add(cc, dn, -6.0 + k_ * 3.2), sd, s_ * 2.5)
                b = _add(_add(a, sd, s_ * (5.5 - k_)), dn, -1.6)
                line = Cel(cel.w, cel.h, cel.top)
                line.line(a, b, ("bone", 2))
                for xy, t in line.px.items():
                    if xy in tmp.px:
                        tmp.px[xy] = t
        # The roots that bind her: two turns round the ribs, one round the waist.
        for off, tilt_, w in ((T1 * 0.55, 0.9, 2.6), (T1 + T2 * 0.3, -1.0, 2.4), (T1 + T2 * 0.78, 0.8, 2.2)):
            base = _add(hip, _dir(pose["body"]), off * (1.0 - 0.85 * pose["tuck"]))
            a_, b_ = _add(_add(base, sd, -11.0), dn, -tilt_ * 2.2), _add(_add(base, sd, 11.0), dn, tilt_ * 2.2)
            band = Cel(cel.w, cel.h, cel.top)
            band.limb(a_, b_, w, w, "leather", (1, 2, 4))
            for xy, t in band.px.items():
                if xy in tmp.px:
                    tmp.px[xy] = t
        cel.px.update(tmp.px)
        pulse = pose["pulse"] * (1.0 - pose["dark"])
        for q, r in ((0, -2), (-1, -1), (0, -1), (1, -1), (-1, 0), (0, 0), (1, 0), (0, 1), (-1, 1), (1, 1), (0, 2)):
            p = _add(_add(cc, sd, q + 0.5), dn, r * 1.0 + 3.0)
            if (int(math.floor(p[0])), int(math.floor(p[1]))) in tmp.px:
                cel.put(p[0], p[1], VOID)
        p = _add(_add(cc, sd, 0.5), dn, 3.0)
        cel.put(p[0], p[1], ("light", 0) if pulse > 1.15 else ("sea", 8) if pulse > 0.8 else ("sea", 6) if pulse > 0.45 else ("sea", 3))
        # The neck, and the roots that hold her hips.
        cel.limb(_add(sh, dn, -1.0), J["chin"], 5.5, 4.4, "bone", (2, 4, 6))
        for k_, (off, w) in enumerate(((-2.0, 5.0), (3.5, 4.5), (8.5, 4.0))):
            a = _add(_add(hip, _dir(pose["body"] - pose["curl"] / 2), off), _side(pose["body"]), -9.5 + k_)
            b = _add(_add(hip, _dir(pose["body"] - pose["curl"] / 2), off + 3.0 - k_), _side(pose["body"]), 9.5 - k_)
            cel.limb(a, b, w, w, "leather", (1, 2, 4) if k_ % 2 else (0, 1, 3))
            cel.put(b[0] - 2, b[1] - 1, ("moss", 5))
            cel.put(a[0] + 3, a[1], ("moss", 4))

    def head(self, cel: Cel, J: dict, pose: Pose) -> None:
        """The back of her head: a cap of dark fronds the mask sits on."""
        c, ah = J["headc"], J["head_rot"]
        dn, sd = _dir(ah), _side(ah)
        pts = []
        for i in range(20):
            ang = math.tau * i / 20
            pts.append(_add(_add(c, sd, math.cos(ang) * 13.8 - 1.6), dn, math.sin(ang) * 16.4 + 1.0))
        for xy in cel.poly_mask(pts):
            h = _hash(xy[0], xy[1] // 2) % 7
            cel.px[xy] = ("moss", 2 if h == 0 else 1)

    def hair(self, cel: Cel, J: dict, ropes: dict, pose: Pose) -> None:
        strands = [ropes[f"hair{i}"] for i in range(7)]
        if not strands[0]:
            return
        # A curtain first, so the fronds are a mass and not seven threads…
        for a, b in zip(strands, strands[1:]):
            n = min(len(a), len(b))
            for k_ in range(n - 1):
                for xy in cel.poly_mask([a[k_], b[k_], b[k_ + 1], a[k_ + 1]]):
                    if xy[1] < GROUND:
                        cel.px[xy] = ("moss", 1)
        # …then each frond: darker at the root, leaves and pale berries towards the tip.
        for i, pts in enumerate(strands):
            n = len(pts) - 1
            for k_ in range(n):
                t = k_ / n
                idx = (1, 2, 3) if t < 0.35 else (2, 3, 5) if i % 2 else (1, 3, 4)
                cel.limb(pts[k_], pts[k_ + 1], lerp(3.6, 2.0, t), lerp(3.4, 1.4, t + 1 / n), "moss", idx)
            for k_ in range(2, n + 1):
                x, y = pts[k_]
                if y >= GROUND - 1:
                    continue
                if (k_ + i) % 3 == 0:
                    cel.put(x + (1 if i % 2 else -1), y, ("moss", 6 if k_ > n // 2 else 5))
                if (k_ * 2 + i) % 5 == 0:
                    cel.put(x, y + 1, ("light", 0))

    def mask(self, cel: Cel, J: dict, pose: Pose) -> None:
        at, rot = J["mask"], J["mask_rot"]
        opened = pose["open"]
        legend = {**MASK_LEGEND, **glow_tones(pose["glow"] * (1.0 - pose["dark"]))}
        dn, sd = _dir(rot), _side(rot)
        if opened > 0.04:
            # What the mask hides: a throat of thorns, and a light at the bottom of it.
            c = _add(at, dn, HEAD * 0.56)
            rx, ry = 1.5 + 7.0 * opened, 4.0 + 7.5 * opened
            ring = []
            for i in range(18):
                ang = math.tau * i / 18
                ring.append(_add(_add(c, sd, math.cos(ang) * rx), dn, math.sin(ang) * ry))
            for xy in cel.poly_mask(ring):
                cel.px[xy] = VOID
            if opened > 0.3:
                for i in range(10):
                    ang = math.tau * (i + 0.5) / 10
                    a = _add(_add(c, sd, math.cos(ang) * rx * 0.96), dn, math.sin(ang) * ry * 0.96)
                    b = _add(_add(c, sd, math.cos(ang) * rx * 0.5), dn, math.sin(ang) * ry * 0.55)
                    cel.limb(a, b, 2.0, 0.6, "bone", (4, 6, 7))
                glow = pose["glow"]
                for q, r, tone in ((0, 0, ("light", 0)), (1, 0, ("sea", 8)), (-1, 0, ("sea", 8)), (0, 1, ("sea", 8)), (0, -1, ("sea", 8)),
                                   (1, 1, ("sea", 6)), (-1, 1, ("sea", 6)), (1, -1, ("sea", 6)), (-1, -1, ("sea", 6)), (0, 2, ("sea", 5)), (0, -2, ("sea", 5)),
                                   (2, 0, ("sea", 5)), (-2, 0, ("sea", 5))):
                    if glow >= 1.0 or abs(q) + abs(r) < 2:
                        cel.put(c[0] + q, c[1] + r, tone)
        gape = opened * 34.0
        px, py = at
        if opened <= 0.04 and abs(rot) < 6.0:
            cel.stamp(MASK_L, legend, px - MASK_HINGE[0], py - MASK_HINGE[1])
            cel.stamp(MASK_R, legend, px - MASK_HINGE[0], py - MASK_HINGE[1])
        else:
            cel.stamp_rot(MASK_L, legend, px, py, MASK_HINGE[0], MASK_HINGE[1], -rot + gape)
            cel.stamp_rot(MASK_R, legend, px, py, MASK_HINGE[0], MASK_HINGE[1], -rot - gape)

    def fireflies(self, cel: Cel, J: dict, pose: Pose, far: bool) -> None:
        """The lights caught in her hair. When she is gone they rise out of it."""
        rise = pose["rise"]
        c = J["crown"]
        for i in range(6):
            phi = math.tau * (pose["orbit"] + i / 6 + 0.05 * i * i)
            behind = math.sin(phi) < 0
            if behind != far:
                continue
            x = c[0] + (13.0 + 3.0 * (i % 3)) * math.cos(phi) + 1.0
            y = c[1] + 3.0 - 6.0 * (i % 3) + 3.0 * math.sin(phi * 2.0 + i)
            if rise > 0.0:
                u = _clamp(rise * 1.5 - i * 0.08)
                if u <= 0.0:
                    x, y = P(COL + 12.0 * math.cos(i * 2.1) - 4.0, 6.0 + (i % 3) * 3.0)
                else:
                    x, y = P(COL - 6.0 + 16.0 * math.cos(i * 2.1) + 9.0 * math.sin(u * 5.0 + i), 8.0 + (i % 3) * 3.0 + u * (46.0 + 9.0 * i))
            if y >= GROUND - 2 or y < -self.TOP + 3:
                continue
            lit = (int(pose["orbit"] * 32) + i * 3) % 7 != 0
            cel.put(x, y, ("light", 0) if lit else ("brass", 5))
            if lit:
                for q, r in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    cel.soft(x + q, y + r, ("brass", 6) if not behind else ("brass", 5))

    # ------------------------------------------------------------------------------------------------- drawing
    def draw(self, cel, J, pose, ropes, between) -> None:
        fig = Cel(cel.w, cel.h, cel.top)
        self.fireflies(fig, J, pose, far=True)
        self.vines(fig, J, pose)
        buried = pose["tuck"] > 0.4
        if not buried:
            self.heart(fig, J, pose)
        self.arm(fig, J, pose, "F", far=True)
        self.body(fig, J, pose)
        if pose["mask_free"] < 0.5:
            self.head(fig, J, pose)
        self.hair(fig, J, ropes, pose)
        if buried:
            self.heart(fig, J, pose)
        if pose["smear"] > 0.5 and len(between) > 2:
            self.streak(fig, between)
        self.mask(fig, J, pose)
        self.arm(fig, J, pose, "N", far=False)
        self.fireflies(fig, J, pose, far=False)
        # Nothing of her shows below the path.
        for xy in [xy for xy in fig.px if xy[1] > GROUND]:
            del fig.px[xy]
        fig.outline()
        for xy in [xy for xy in fig.px if xy[1] > GROUND + 1]:
            del fig.px[xy]
        cel.px.update(fig.px)

        # Effects, behind the figure.
        if 0.01 < pose["shock"] < 0.985:
            self.shock(cel, pose["shock_x"], pose["shock"])
        if 0.01 < pose["shed"] < 0.99:
            self.shed(cel, J, pose["shed"])
        if 0.01 < pose["dust"] < 0.99:
            self.dust(cel, pose["dust"])

    def streak(self, cel: Cel, between: list) -> None:
        """The rake is faster than the eye: where the hands went through the air stays white for a frame."""
        n = len(between)
        for name, w1 in (("wristF", 4.6), ("wristN", 3.6)):
            path = [Jb[name] for Jb, _pb in between]
            for i in range(n // 4, n - 1):
                t0, t1 = (i - n // 4) / (n - n // 4), (i + 1 - n // 4) / (n - n // 4)
                (x0, y0), (x1, y1) = path[i], path[i + 1]
                if min(y0, y1) >= GROUND - 1:
                    continue
                tmp = Cel(cel.w, cel.h, cel.top)
                tmp.limb((x0, y0), (x1, y1), lerp(1.0, w1, t0), lerp(1.0, w1, t1), "bone", (6, 7, 7))
                for (x, y), tone in tmp.px.items():
                    if y < GROUND:
                        cel.px[(x, y)] = ("light", 0) if t1 > 0.55 and tone[1] == 7 else tone

    @staticmethod
    def shock(cel: Cel, at: float, u: float) -> None:
        """Where her hands come down: the path splits, earth and torn leaves fly, and the berries scatter like
        pale sparks along it."""
        ix = ROOT_X + at
        reach = 9.0 + 28.0 * u
        for i in range(int(reach)):
            for sgn in (-1, 1):
                x = ix + sgn * i
                cel.soft(x, GROUND - 1, ("leather", 1) if (i + (sgn > 0)) % 3 else ("leather", 3))
                if u < 0.7 and i > reach * 0.3:
                    puff = 2.0 + 4.5 * math.sin(math.pi * (i / reach)) * (1.0 - u)
                    for s_ in range(int(puff)):
                        if (i + s_) % 2 == 0 or s_ == 0:
                            cel.soft(x, GROUND - 2 - s_, ("moss", 6) if s_ < puff - 1.5 else ("moss", 5))
        if u < 0.3:
            cel.star(ix - 2, GROUND - 3, 5)
            for q in range(-10, 11):
                cel.soft(ix + q, GROUND - 2, ("light", 0) if abs(q) < 6 else ("sea", 8))
        for i in range(18):
            ang = math.radians(-174 + i * 10.0)
            dist = 6.0 + (20.0 + (i * 5 % 4) * 4.5) * u
            x = ix + math.cos(ang) * dist * 1.3
            y = GROUND - 2 + math.sin(ang) * dist + 14.0 * u * u
            if y >= GROUND - 1:
                continue
            if i % 3 == 1:  # a berry
                cel.soft(x, y, ("light", 0))
                cel.soft(x + 1, y, ("bone", 6))
            elif i % 3 == 2:  # a leaf, turning
                flip = 1 if (i + int(u * 8)) % 2 else -1
                for q in range(3):
                    cel.soft(x + q * flip, y + q, ("moss", 6) if q < 2 else ("moss", 4))
            else:
                big = i % 2 == 0 and u < 0.75
                for qx, qy in ((0, 0), (1, 0), (0, 1), (1, 1), (2, 0), (2, 1)) if big else ((0, 0), (1, 0), (0, 1)):
                    cel.soft(x + qx, y + qy, ("leather", 2) if qy else ("leather", 5))

    @staticmethod
    def shed(cel: Cel, J: dict, u: float) -> None:
        cx, cy = J["headc"]
        for i in range(10):
            ang = math.radians(-200.0 + i * 24.0)
            dist = 10.0 + (15.0 + (i * 7 % 5) * 3.0) * u
            x = cx + math.cos(ang) * dist * 1.25 - 5.0 * u
            y = cy + math.sin(ang) * dist + 15.0 * u * u
            if y >= GROUND - 1:
                continue
            flip = 1 if (i + int(u * 6)) % 2 else -1
            if i % 4 == 0:
                cel.soft(x, y, ("light", 0))
            else:
                cel.soft(x, y, ("moss", 6))
                cel.soft(x + flip, y + 1, ("moss", 5))
                cel.soft(x + 2 * flip, y + 2, ("moss", 3))

    @staticmethod
    def dust(cel: Cel, u: float) -> None:
        """The heart landing: a wall of dust and leaves thrown out both ways along the path."""
        cx = ROOT_X + COL - 2.0
        for sgn in (-1, 1):
            for i in range(26):
                d = 26.0 + (8.0 + i * 2.2) * (1.0 - (1.0 - u) ** 2)
                high = (3.0 + (i * 7 % 6) * 2.0) * math.sin(math.pi * _clamp(u * 1.1)) * (1.0 - i / 34.0)
                x = cx + sgn * d
                for s_ in range(int(high) + 1):
                    if (i + s_) % 2 == 0:
                        cel.soft(x, GROUND - 2 - s_, ("moss", 6) if s_ > high - 2 else ("bone", 4) if (i + s_) % 3 else ("moss", 5))
        if u < 0.25:
            for q in range(-34, 35):
                cel.soft(cx + q, GROUND - 2, ("light", 0) if abs(q) < 20 else ("moss", 7))


# --------------------------------------------------------------------------------------- animations
REST_N, REST_F = (-25.0, 8.0), (27.0, 8.0)
BASE: Pose = dict(slide=0.0, sw=0.0, fall=0.0, squash=0.0, heart_rot=0.0, drop=0.0, body=0.0, curl=0.0, head=0.0, tuck=0.0,
                  handN=REST_N, handF=REST_F, flipN=0.0, flipF=0.0, open=0.0, glow=0.6, pulse=0.5, dark=0.0, sway=0.0, orbit=0.0,
                  snap=0.0, mask_free=0.0, mask_at=(0.0, 0.0), mask_rot=0.0, rise=0.0,
                  smear=0.0, shock=0.0, shock_x=58.0, shed=0.0, dust=0.0, flash=0.0)


def _beat(ph: float) -> float:
    """A heartbeat: two knocks, then quiet."""
    q = (ph * 2.0) % 1.0
    return 1.2 if q < 0.08 else 0.9 if q < 0.16 else 0.5 if q < 0.24 else 1.0 if q < 0.32 else 0.7 if q < 0.42 else 0.3


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.16))
    later = math.sin(math.tau * (ph - 0.3))
    # She turns slowly on her vines, and the head hangs true while the body swings under the heart. Once a cycle
    # the mask opens a finger's width, as if testing the air.
    crack = 0.22 if 0.56 < ph < 0.70 else 0.0
    return {**BASE, "sw": 1.6 * s, "body": 2.6 * late, "curl": 1.2 * later, "head": -2.0 * later, "drop": 0.8 + 0.8 * math.sin(math.tau * (ph - 0.05)),
            "handN": (REST_N[0], REST_N[1] + (2.4 if 0.30 < ph < 0.40 else 0.0)), "open": crack,
            "glow": 1.0 if crack else 0.9 if math.sin(math.tau * 3 * ph) > 0.55 else 0.6, "pulse": _beat(ph), "sway": 2.0 * later, "orbit": ph / 2}


def _reach(q: float, reach: float) -> tuple[float, float]:
    """One hand through a stride: on the path it goes back under her; then it is lifted and thrown ahead."""
    if q < 0.6:
        return (lerp(reach, -reach, q / 0.6), 0.0)
    u = (q - 0.6) / 0.4
    e = u * u * (3 - 2 * u)
    return (lerp(-reach, reach, e), 15.0 * math.sin(math.pi * u))


def haul_pose(ph: float) -> Pose:
    n, f = _reach(ph % 1.0, 12.0), _reach((ph + 0.5) % 1.0, 12.0)
    # The weight of her comes after each reach: the heart swings twice a stride, the body later and further.
    sw = 5.0 * math.sin(2 * math.tau * (ph - 0.06))
    body = 13.0 * math.sin(2 * math.tau * (ph - 0.17))
    return {**BASE, "sw": sw, "body": 6.0 + body, "curl": -5.0 * math.sin(2 * math.tau * (ph - 0.27)), "head": -0.5 * body - 2.0,
            "drop": 2.0 + 2.0 * math.cos(2 * math.tau * (ph - 0.1)),
            "handN": (REST_N[0] + 2.0 + n[0], REST_N[1] + n[1]), "handF": (REST_F[0] - 4.0 + f[0], REST_F[1] + f[1]),
            "glow": 0.9, "pulse": _beat(2 * ph), "sway": -3.0 + 2.0 * math.sin(2 * math.tau * ph), "orbit": ph / 2}


def k(**over: object) -> Pose:
    return {**BASE, **over}


# The rake. She presses down on her hands, lets go and REARS like a spider — the body swung back, both arms raised
# high over the prey, the mask splitting open on the light inside — hangs there, and comes down: the whole pendulum,
# and both hands through the place where the prey stands.
_REAR = dict(sw=-12.0, body=-30.0, curl=-14.0, head=22.0, drop=-3.0, handN=(27.0, 97.0), handF=(46.0, 68.0), flipN=1.0, open=1.0, glow=1.5, pulse=1.3)
_DOWN = dict(sw=9.0, body=16.0, curl=10.0, head=4.0, drop=7.0, handN=(41.0, 6.0), handF=(62.0, 6.0), open=0.8, glow=1.5, pulse=1.3)
RAKE_KEYS = [
    (0.00, k(), "lin"),
    (0.12, k(sw=3.0, body=7.0, curl=5.0, head=-3.0, drop=4.0, open=0.15, glow=1.0, pulse=0.9), "io"),
    (0.30, k(**{**_REAR, "sw": -8.0, "body": -18.0, "curl": -6.0, "head": 10.0, "handN": (-2.0, 62.0), "handF": (42.0, 42.0), "flipN": 0.6, "open": 0.5}), "out"),
    (0.42, k(**_REAR), "out"),
    (0.50, k(**{**_REAR, "sw": -13.0, "body": -33.0, "curl": -16.0, "handN": (26.0, 100.0), "handF": (45.0, 72.0)}), "io"),
    (0.55, k(**_DOWN, smear=1.0, shock=0.02), "in3"),
    (0.70, k(**{**_DOWN, "sw": 10.0, "body": 19.0, "drop": 8.0, "open": 0.6}, shock=0.98), "out"),
    (0.84, k(sw=4.0, body=9.0, curl=5.0, head=0.0, drop=4.0, handN=(8.0, 9.0), handF=(44.0, 8.0), open=0.2, glow=1.0, pulse=0.9, shock=1.0), "io"),
    (1.00, k(shock=1.0), "io"),
]

# Hit: the blow sets the whole weight of her swinging. The body goes first, the head whips after it, the near
# hand is torn off the path, leaves and berries fly; she swings back through her place and catches herself.
HURT_KEYS = [
    (0.00, k(), "lin"),
    (0.07, k(sw=-2.0, body=-8.0, curl=6.0, head=12.0, drop=1.0, open=0.12, glow=1.5, pulse=1.3, shed=0.04, flash=1.0), "out3"),
    (0.16, k(sw=-6.0, body=-19.0, curl=-4.0, head=-8.0, drop=0.0, handN=(-24.0, 12.0), open=0.3, glow=1.5, pulse=1.3, shed=0.2, flash=0.5), "lin"),
    (0.26, k(sw=-9.0, body=-25.0, curl=-9.0, head=-16.0, drop=-1.0, handN=(-30.0, 16.0), handF=(27.0, 6.0), open=0.3, glow=0.4, shed=0.4), "out"),
    (0.50, k(sw=3.0, body=9.0, curl=5.0, head=8.0, drop=3.0, handN=(-17.0, 8.0), handF=(33.0, 8.0), open=0.1, glow=1.2, shed=0.7), "io"),
    (0.74, k(sw=-1.5, body=-4.0, curl=-2.0, head=-2.0, drop=1.0, glow=0.9, shed=0.95), "io"),
    (1.00, k(shed=1.0), "io"),
]

# Death. The convulsion; the vines, one by one; the heart.
_GASP = dict(sw=-4.0, body=-16.0, curl=-22.0, head=-14.0, drop=-2.0, handN=(-44.0, 30.0), handF=(52.0, 34.0), open=1.0, glow=1.5, pulse=1.4)
_DOWNED = dict(fall=81.0, squash=0.55, tuck=1.0, heart_rot=-5.0, body=14.0, curl=0.0, head=0.0, drop=0.0, handN=(-79.0, 3.0), handF=(29.0, 54.0),
               open=0.0, glow=0.0, pulse=0.0, dark=1.0, snap=4.0, mask_free=1.0, mask_at=(27.0, 1.0), mask_rot=108.0, shed=1.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.04, k(sw=-2.0, body=-9.0, curl=6.0, head=12.0, open=0.2, glow=1.5, pulse=1.3, shed=0.05, flash=1.0), "out3"),
    (0.12, k(**_GASP, shed=0.4), "out"),
    (0.20, k(**{**_GASP, "body": -18.0, "curl": -24.0, "handN": (-46.0, 34.0), "handF": (54.0, 38.0)}, shed=0.95, snap=0.0), "io"),
    # One: the heart lurches, she swings out from under it.
    (0.24, k(**{**_GASP, "sw": 3.0, "heart_rot": 10.0, "body": 4.0, "curl": -8.0, "handN": (-30.0, 12.0), "handF": (44.0, 16.0), "open": 0.7, "pulse": 1.0},
             fall=5.0, shed=1.0, snap=1.0), "in"),
    (0.33, k(sw=5.0, heart_rot=14.0, body=16.0, curl=6.0, head=10.0, handN=(-16.0, 4.0), handF=(38.0, 8.0), open=0.5, glow=1.0, pulse=0.8, fall=7.0, shed=1.0,
             snap=1.3), "out"),
    # Two.
    (0.37, k(sw=-3.0, heart_rot=-12.0, body=-10.0, curl=-6.0, head=-8.0, handN=(-22.0, 9.0), handF=(30.0, 12.0), open=0.6, glow=0.8, pulse=0.6, fall=13.0,
             shed=1.0, snap=2.0), "in"),
    (0.46, k(sw=-6.0, heart_rot=-16.0, body=-18.0, curl=-4.0, head=-12.0, handN=(-26.0, 3.0), handF=(24.0, 8.0), open=0.4, glow=0.6, pulse=0.5, fall=16.0,
             shed=1.0, snap=2.3), "out"),
    # Three: she hangs by one.
    (0.50, k(sw=4.0, heart_rot=20.0, body=10.0, curl=4.0, head=6.0, handN=(-20.0, 8.0), handF=(34.0, 8.0), open=0.5, glow=0.5, pulse=0.4, fall=22.0, shed=1.0,
             snap=3.0), "in"),
    (0.60, k(sw=7.0, heart_rot=26.0, body=20.0, curl=8.0, head=10.0, handN=(-14.0, 8.0), handF=(38.0, 8.0), open=0.3, glow=0.4, pulse=0.3, fall=25.0, shed=1.0,
             snap=3.4), "out"),
    # Four. The heart comes down on her.
    (0.64, k(sw=4.0, heart_rot=12.0, body=18.0, curl=10.0, head=6.0, handN=(-24.0, 2.0), handF=(40.0, 2.0), open=0.2, glow=0.3, pulse=0.2, fall=34.0, tuck=0.2,
             shed=1.0, snap=4.0), "in"),
    (0.71, k(**{**_DOWNED, "fall": 84.0, "squash": 0.95, "handF": (36.0, 72.0), "mask_free": 0.3, "mask_at": (22.0, 12.0), "mask_rot": 50.0, "dark": 0.5},
             dust=0.03), "in"),
    (0.76, k(**{**_DOWNED, "fall": 79.5, "squash": 0.4, "handF": (33.0, 68.0), "mask_at": (25.0, 9.0), "mask_rot": 80.0, "dark": 0.8}, dust=0.4), "out"),
    (0.81, k(**{**_DOWNED, "handF": (31.0, 63.0), "mask_at": (27.0, 1.0)}, dust=0.75), "in"),
    (0.86, k(**{**_DOWNED, "handF": (30.0, 60.0)}, dust=0.97), "lin"),
    # The one arm left standing sags, slowly; the fireflies rise out of her hair and go.
    (0.93, k(**{**_DOWNED, "handF": (29.0, 56.0)}, dust=1.0, rise=0.45), "io"),
    (1.00, k(**_DOWNED, dust=1.0, rise=1.0), "io"),
]

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 16 for i in range(16)], [150] * 16, True),
    "run": Anim("run", haul_pose, [i / 12 for i in range(12)], [95] * 12, True),
    "attack": Anim("attack", keyed(RAKE_KEYS), [0.0, 0.06, 0.12, 0.18, 0.24, 0.30, 0.36, 0.42, 0.50, 0.55, 0.59, 0.63, 0.67, 0.70, 0.77, 0.84, 0.92, 1.0],
                   # As the Crowmother's: 660 ms to the blow, 290 of impact, 290 back up — 1240 ms, between two swings.
                   [60, 60, 70, 60, 60, 70, 70, 80, 130, 40, 50, 60, 60, 80, 80, 70, 70, 70], False),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.02, 0.04, 0.08, 0.12, 0.16, 0.20, 0.22, 0.24, 0.285, 0.33, 0.35, 0.37, 0.415, 0.46, 0.48, 0.50, 0.55,
                                                 0.60, 0.62, 0.64, 0.675, 0.71, 0.735, 0.76, 0.81, 0.86, 0.895, 0.93, 0.965, 1.0],
                  [70, 50, 80, 90, 110, 110, 130, 60, 70, 90, 150, 60, 70, 90, 150, 60, 70, 90, 170, 60, 60, 60, 50, 60, 70, 90, 140, 160, 180, 220, 1500], False),
}
