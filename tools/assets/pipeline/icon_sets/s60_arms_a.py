"""Icon set: the Knight's shields and the Ranger's bows and quivers, five ranks each.

Shields are seen front-on and change shape with rank (buckler, soldier's board, heater, kite, a slab of the
Rift). Bows lie on the bottom-left → top-right diagonal like the swords, stave to the light, string a single
line drawn over the outline. Quivers lean the same way with their arrows' fletchings showing at the mouth.
"""
from __future__ import annotations

import math
from typing import Sequence

from ..icons import RANK_TIER, Icon, framed, ring

Pt = tuple[float, float]
Tone = tuple[str, int]


# ----------------------------------------------------------------------------------------- helpers
def _centre(pts: Sequence[Pt]) -> Pt:
    return (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))


def _inset(pts: Sequence[Pt], k: float) -> list[Pt]:
    cx, cy = _centre(pts)
    out = []
    for x, y in pts:
        dx, dy = x - cx, y - cy
        n = math.hypot(dx, dy) or 1.0
        out.append((x - dx / n * k, y - dy / n * k))
    return out


def _rim(ic: Icon, outer: Sequence[Pt], inner: Sequence[Pt], ramp: str, hi: int, mid: int, lo: int) -> set[tuple[int, int]]:
    """The band between two outlines as a bevel: lit where it faces the light, dark where it turns away.
    Returns the pixels of the inner field."""
    om, im = set(ic.poly_mask(list(outer))), set(ic.poly_mask(list(inner)))
    cx, cy = _centre(outer)
    for x, y in om - im:
        dx, dy = x + 0.5 - cx, y + 0.5 - cy
        k = (dx * 0.6 + dy * 0.8) / (math.hypot(dx, dy) or 1.0)
        ic.put(x, y, (ramp, hi if k < -0.25 else lo if k > 0.35 else mid))
    return im


def _boss(ic: Icon, cx: float, cy: float, r: float, ramp: str, hi: int, mid: int, lo: int) -> None:
    """A small domed boss: the one round thing on a shield."""
    for x, y in ic.poly_mask(ring(20, cx, cy, r, r)):
        dx, dy = x + 0.5 - cx, y + 0.5 - cy
        k = (dx * 0.6 + dy * 0.8) / r
        ic.put(x, y, (ramp, hi if k < -0.3 else lo if k > 0.35 else mid))


# ----------------------------------------------------------------------------------------- shields
def shield(rank: int) -> Icon:
    ic = Icon()
    glow: list[Pt] = []
    if rank == 1:  # a small wooden buckler: three planks, a hide edge, an iron boss
        outer = ring(28, 16, 16, 10.6, 10.6)
        field = _rim(ic, outer, ring(28, 16, 16, 8.7, 8.7), "leather", 6, 3, 1)
        for x, y in field:
            ic.put(x, y, ("leather", 5 if x < 13 else 4 if x < 19 else 3))
        for x, y in field:
            if x in (12, 19):  # seams between the planks
                ic.put(x, y, ("leather", 2))
        _boss(ic, 16, 16, 3.7, "ink", 7, 5, 3)
        ic.dots([(15, 15)], ("ink", 8))
        ic.dots([(10, 11), (22, 11), (10, 21), (22, 21)], ("ink", 6))  # nails
        ic.path([(21, 8), (22, 11), (21, 13)], ("leather", 1))  # a split
        ic.dots([(9, 16), (8, 17)], ("leather", 2))  # a gouge in the edge
    elif rank == 2:  # a foot-soldier's board: tall, flat-topped, iron-bound, painted with a chevron
        outer = [(8, 3), (24, 3), (26, 5), (26, 24), (22, 29), (10, 29), (6, 24), (6, 5)]
        field = _rim(ic, outer, _inset(outer, 2.2), "ink", 7, 5, 3)
        for x, y in field:
            ic.put(x, y, ("moss", 4 if x < 16 else 3))
        for x, y in field:  # the chevron, point down
            k = y - abs(x - 16) * 0.9
            if 9.0 <= k < 12.5:
                ic.put(x, y, ("bone", 6 if x < 16 else 4))
        for x, y in field:  # an iron spine
            if x in (15, 16) and y > 16:
                ic.put(x, y, ("ink", 6 if x == 15 else 4))
        _boss(ic, 16, 17, 3.4, "ink", 8, 6, 3)
        ic.dots([(15, 16)], ("ink", 9))
        ic.dots([(8, 5), (24, 5), (8, 24), (24, 24), (16, 28)], ("ink", 8))  # rivets
    elif rank == 3:  # the knight's heater: blue field, brass cross
        outer = [(6, 4), (26, 4), (26, 14), (24, 20), (20, 25), (16, 29), (12, 25), (8, 20), (6, 14)]
        inner = [(8, 6), (24, 6), (24, 14), (22, 19), (19, 23), (16, 26), (13, 23), (10, 19), (8, 14)]
        field = _rim(ic, outer, inner, "ink", 9, 6, 4)
        for x, y in field:
            ic.put(x, y, ("azure", (5 if x < 16 else 4) - (1 if y > 19 else 0)))
        for x, y in field:  # the cross
            if x in (15, 16) or y in (12, 13):
                ic.put(x, y, ("brass", 6 if (x == 15 and y not in (12, 13)) or (y == 12 and x not in (15, 16)) else 4))
        ic.rect(15, 12, 16, 13, ("crimson", 5))
        ic.dots([(15, 12)], ("crimson", 6))
        ic.path([(9, 7), (14, 7)], ("azure", 7))  # a sheen across the top of the field
        ic.dots([(7, 5), (25, 5), (16, 28)], ("ink", 9))
    elif rank == 4:  # a gilded kite with a winged jewel
        outer = [(16, 1), (23, 3), (27, 8), (27, 15), (23, 23), (16, 31), (9, 23), (5, 15), (5, 8), (9, 3)]
        field = _rim(ic, outer, _inset(outer, 2.4), "brass", 7, 5, 3)
        for x, y in field:
            ic.put(x, y, ("azure", 3 if x < 16 else 2))
        ic.rect(15, 15, 16, 27, ("brass", 5))  # the rib down to the point
        ic.path([(15, 15), (15, 27)], ("brass", 7))
        ic.poly([(15, 11), (8, 7), (7, 10), (9, 11), (7, 13), (10, 14), (9, 16), (15, 15)], ("bone", 7))  # wings
        ic.poly([(17, 11), (24, 7), (25, 10), (23, 11), (25, 13), (22, 14), (23, 16), (17, 15)], ("bone", 5))
        ic.path([(14, 12), (9, 10)], ("bone", 4))
        ic.path([(14, 14), (10, 13)], ("bone", 4))
        ic.path([(18, 12), (23, 10)], ("bone", 3))
        ic.path([(18, 14), (22, 13)], ("bone", 3))
        ic.poly([(16, 9), (19, 13), (16, 17), (13, 13)], ("azure", 5))  # the jewel
        ic.poly([(16, 9), (16, 13), (13, 13)], ("azure", 7))
        ic.dots([(15, 12)], ("light", 0))
        ic.dots([(16, 4), (16, 5)], ("brass", 7))
        glow = [(16, 7)]
    else:  # a slab of the Rift: dark stone split by a seam of light, crystal breaking from its edge
        outer = [(9, 3), (20, 2), (27, 8), (25, 19), (21, 27), (13, 30), (6, 22), (5, 10)]
        field = _rim(ic, outer, _inset(outer, 1.8), "ink", 6, 4, 2)
        for x, y in field:
            ic.put(x, y, ("ink", 4 if x + y < 30 else 3))
        seam = [(17, 4), (14, 10), (18, 15), (13, 21), (16, 28)]
        for (x0, y0), (x1, y1) in zip(seam, seam[1:]):  # the seam, two pixels of light with a dim lip
            ic.line((x0 - 1, y0), (x1 - 1, y1), ("violet", 5))
            ic.line((x0 + 1, y0), (x1 + 1, y1), ("violet", 6))
            ic.line((x0, y0), (x1, y1), ("violet", 8))
        ic.path([(18, 15), (22, 13)], ("violet", 6))  # lesser cracks
        ic.path([(13, 21), (9, 19)], ("violet", 6))
        for (bx, by), (tx, ty), tone in (((24, 9), (30, 4), 6), ((26, 14), (31, 13), 5), ((7, 13), (1, 9), 6), ((8, 21), (2, 23), 5)):
            ic.poly([(bx, by - 2), (tx, ty), (bx, by + 2)], ("violet", tone))  # shards
            ic.line((bx, by - 2), (tx, ty), ("violet", 8))
        ic.dots([(10, 8), (22, 22), (11, 25)], ("violet", 7))
        glow = [(17, 0)]
    ic.outline()
    ic.glow(glow, ("violet", 8) if rank == 5 else ("light", 0))
    return ic


# -------------------------------------------------------------------------------------------- bows
BOW_A, BOW_B = (6.5, 27.5), (26.5, 5.0)  # the two tips: the chord the string follows


def _smooth(pts: list[Pt], times: int) -> list[Pt]:
    for _ in range(times):  # corner-cutting, ends kept
        out = [pts[0]]
        for a, b in zip(pts, pts[1:]):
            out += [(a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25), (a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75)]
        out.append(pts[-1])
        pts = out
    return pts


def bow(rank: int) -> Icon:
    ic = Icon()
    L = math.hypot(BOW_B[0] - BOW_A[0], BOW_B[1] - BOW_A[1])
    d = ((BOW_B[0] - BOW_A[0]) / L, (BOW_B[1] - BOW_A[1]) / L)
    n = (d[1], -d[0])  # towards the upper left: the stave bows into the light

    def at(u: float, v: float) -> Pt:
        return (BOW_A[0] + d[0] * u * L + n[0] * v, BOW_A[1] + d[1] * u * L + n[1] * v)

    spec = {
        # stave: (u along the chord 0–1, bulge px); ramp tones (dark, mid, light); widths at grip and tip
        1: dict(curve=[(0, 0), (0.25, 4.0), (0.5, 5.4), (0.75, 4.0), (1, 0)], smooth=2, wood=("leather", 4, 5, 7), wg=3.6, wt=2.0),
        2: dict(curve=[(0, 0), (0.2, 5.0), (0.5, 7.6), (0.8, 5.0), (1, 0)], smooth=2, wood=("leather", 2, 4, 5), wg=4.0, wt=2.0),
        3: dict(curve=[(0, 2.4), (0.09, 0.9), (0.26, 3.8), (0.5, 6.8), (0.74, 3.8), (0.91, 0.9), (1, 2.4)], smooth=2, wood=("leather", 1, 2, 4), wg=4.4, wt=2.4),
        4: dict(curve=[(0, 1.2), (0.12, 2.6), (0.27, 6.4), (0.5, 8.6), (0.73, 6.4), (0.88, 2.6), (1, 1.2)], smooth=2, wood=("brass", 3, 5, 7), wg=5.0, wt=2.6),
        5: dict(curve=[(0, 0.4), (0.16, 4.6), (0.32, 5.4), (0.5, 8.2), (0.68, 5.4), (0.84, 4.6), (1, 0.4)], smooth=0, wood=("violet", 4, 6, 8), wg=4.4, wt=2.2),
    }[rank]
    pts = [(u, v) for u, v in _smooth([(float(u), float(v)) for u, v in spec["curve"]], spec["smooth"])]
    ramp, dk, md, lt = spec["wood"]

    def width(u: float) -> float:
        return spec["wg"] - (spec["wg"] - spec["wt"]) * abs(2 * u - 1) ** 1.3

    for (u0, v0), (u1, v1) in zip(pts, pts[1:]):
        r_, tones = ramp, (dk, md, lt)
        if rank == 3 and (u0 < 0.16 or u1 > 0.84):  # horn at the recurved ends
            r_, tones = "bone", (2, 4, 5)
        ic.limb(at(u0, v0), at(u1, v1), width(u0), width(u1), r_, tones)

    def band(u: float, w: float, tone: Tone) -> None:
        v = _bulge(pts, u)
        ic.line(at(u, v - w / 2), at(u, v + w / 2), tone)

    mid_v = _bulge(pts, 0.5)
    if rank == 1:  # a plain stave: a darker hand-worn middle and a knot
        ic.limb(at(0.45, _bulge(pts, 0.45)), at(0.55, _bulge(pts, 0.55)), 2.8, 2.8, "leather", (2, 3, 5))
        ic.dots([at(0.28, _bulge(pts, 0.28) + 0.4)], ("leather", 2))
        string = [at(0, 0), at(0.5, -1.0), at(1, 0)]  # a slack string
        cord: Tone = ("bone", 4)
    elif rank == 2:  # a green cloth grip bound with cord, horn nocks
        ic.limb(at(0.41, _bulge(pts, 0.41)), at(0.59, _bulge(pts, 0.59)), 3.8, 3.8, "moss", (3, 4, 6))
        for u in (0.44, 0.5, 0.56):
            band(u, 3.0, ("bone", 5))
        ic.dots([at(0, 0), at(1, 0)], ("bone", 6))
        ic.dots([at(0.02, 0.6), at(0.98, 0.6)], ("bone", 5))
        string = [at(0, 0), at(1, 0)]
        cord = ("bone", 6)
    elif rank == 3:  # a crimson grip between brass collars, brass nocks
        ic.limb(at(0.42, _bulge(pts, 0.42)), at(0.58, _bulge(pts, 0.58)), 4.0, 4.0, "crimson", (3, 4, 6))
        for u in (0.41, 0.59):
            band(u, 4.4, ("brass", 6))
        for u in (0.0, 1.0):
            ic.dots([at(u, 2.4)], ("brass", 7))
        band(0.16, 2.8, ("brass", 5))
        band(0.84, 2.8, ("brass", 5))
        string = [at(0.03, 1.2), at(0.97, 1.2)]
        cord = ("bone", 7)
    elif rank == 4:  # gilded limbs banded in dark horn, a fur grip with a jewel, fang nocks
        for u in (0.2, 0.26, 0.74, 0.8):
            band(u, 3.8, ("ink", 3))
        ic.limb(at(0.43, _bulge(pts, 0.43)), at(0.57, _bulge(pts, 0.57)), 4.2, 4.2, "ink", (2, 3, 5))
        for u in (0.42, 0.58):
            band(u, 4.6, ("brass", 7))
        jx, jy = at(0.5, mid_v - 0.4)
        ic.dots([(jx, jy), (jx + 1, jy), (jx, jy + 1), (jx + 1, jy + 1)], ("crimson", 5))
        ic.dots([(jx, jy)], ("crimson", 7))
        for u, sgn in ((0.0, -1), (1.0, 1)):  # fangs for nocks, pointing out past the tips
            tip = at(u, 1.2)
            ic.poly([at(u, 0.2), at(u + sgn * 0.09, 2.6), at(u, 2.4)], ("bone", 7))
            ic.dots([tip], ("bone", 7))
        string = [at(0.0, 0.6), at(1.0, 0.6)]
        cord = ("bone", 7)
    else:  # limbs of crystal splintering along the back, a dark grip, a string of light
        for u, h in ((0.14, 3.0), (0.3, 3.6), (0.7, 3.6), (0.86, 3.0)):
            v = _bulge(pts, u)
            ic.poly([at(u - 0.035, v), at(u + 0.01, v + h + 1.4), at(u + 0.045, v)], ("violet", 6))
            ic.line(at(u - 0.035, v), at(u + 0.01, v + h + 1.4), ("violet", 8))
        ic.limb(at(0.42, _bulge(pts, 0.42)), at(0.58, _bulge(pts, 0.58)), 4.2, 4.2, "ink", (1, 2, 4))
        ic.dots([at(0.5, mid_v)], ("violet", 8))
        ic.dots([at(0.47, mid_v + 0.3), at(0.53, mid_v - 0.3)], ("violet", 5))
        string = [at(0.0, 0.4), at(1.0, 0.4)]
        cord = ("violet", 8)
    ic.outline()
    # The string: one line of pixels over the outline, so it stays a thread and not a bar.
    for a, b in zip(string, string[1:]):
        ic.line(a, b, cord)
    if rank == 5:
        ic.glow([at(1.05, 1.4)], ("violet", 8))  # one spark at the upper nock, nothing along the string
    return ic


def _bulge(pts: list[Pt], u: float) -> float:
    """Bulge of the stave at chord position u (linear between the curve's points)."""
    for (u0, v0), (u1, v1) in zip(pts, pts[1:]):
        if u0 <= u <= u1:
            return v0 + (v1 - v0) * ((u - u0) / ((u1 - u0) or 1.0))
    return pts[-1][1]


# ----------------------------------------------------------------------------------------- quivers
def quiver(rank: int) -> Icon:
    ic = Icon()
    base, top = (12.5, 28.0), (17.0, 13.5)
    L = math.hypot(top[0] - base[0], top[1] - base[1])
    a = ((top[0] - base[0]) / L, (top[1] - base[1]) / L)  # up the tube
    p = (-a[1], a[0])  # across it, to the right

    def at(u: float, v: float) -> Pt:
        return (base[0] + a[0] * u + p[0] * v, base[1] + a[1] * u + p[1] * v)

    spec = {
        # body ramp and tones (dark, mid, light); half-widths at foot and mouth; arrows: (offset, height, fletch ramp, tone)
        1: dict(body=("leather", 3, 4, 6), w0=3.4, w1=4.0, arrows=[(-2.6, 8.0, "bone", 5), (0.2, 11.0, "bone", 7), (2.8, 7.0, "bone", 4)]),
        2: dict(body=("moss", 2, 4, 6), w0=3.2, w1=4.6, arrows=[(-3.0, 8.0, "bone", 6), (0.0, 11.0, "moss", 7), (3.0, 7.5, "bone", 7)]),
        3: dict(body=("leather", 1, 3, 5), w0=3.0, w1=5.0, arrows=[(-3.2, 8.0, "crimson", 5), (0.0, 11.0, "crimson", 6), (3.2, 7.5, "crimson", 4)]),
        4: dict(body=("ink", 2, 4, 6), w0=3.4, w1=4.6, arrows=[(-3.0, 8.5, "crimson", 5), (0.0, 11.5, "crimson", 6), (3.0, 8.0, "crimson", 4)]),
        5: dict(body=("ink", 2, 3, 5), w0=3.6, w1=4.4, arrows=[(-3.0, 8.0, "violet", 6), (0.0, 11.0, "violet", 7), (3.0, 8.5, "violet", 6)]),
    }[rank]
    ramp, dk, md, lt = spec["body"]
    w0, w1 = spec["w0"], spec["w1"]
    glow: list[Pt] = []

    # Arrows first, so the tube's mouth covers their feet.
    for off, h, f_ramp, f_tone in spec["arrows"]:
        tip_v = off * 2.1  # fanned apart so each fletching stands alone
        foot, nock = at(L - 1.0, off), at(L + h, tip_v)
        shaft: Tone = ("violet", 8) if rank == 5 else ("brass", 5) if rank == 4 else ("leather", 4)
        ic.line(foot, nock, shaft)
        f0 = L + h - 5.0
        fv = off + (tip_v - off) * ((f0 - L + 1.0) / (h + 1.0))
        ic.poly([at(f0, fv), at(f0 + 1.4, fv - 1.6), at(L + h - 0.2, tip_v - 1.5), at(L + h - 0.2, tip_v)], (f_ramp, f_tone))
        ic.poly([at(f0, fv), at(f0 + 1.4, fv + 1.6), at(L + h - 0.2, tip_v + 1.5), at(L + h - 0.2, tip_v)], (f_ramp, max(f_tone - 2, 1)))
        if rank == 4:  # gold-banded shafts
            ic.dots([at(f0 - 1.2, fv)], ("brass", 7))
        if rank == 5:
            glow.append(at(L + h + 1.6, tip_v))

    # The tube: a lit left side, a shadowed right, a dark mouth behind the rim.
    ic.poly([at(0, -w0), at(0, w0), at(L, w1), at(L, -w1)], (ramp, md))
    ic.poly([at(0, -w0), at(0, -w0 * 0.2), at(L, -w1 * 0.25), at(L, -w1)], (ramp, lt))
    ic.poly([at(0, w0 * 0.45), at(0, w0), at(L, w1), at(L, w1 * 0.5)], (ramp, dk))
    ic.poly([at(0, -w0), at(-1.6, -w0 * 0.55), at(-1.6, w0 * 0.55), at(0, w0)], (ramp, dk))  # the foot

    def hoop(u: float, tone_hi: Tone, tone_lo: Tone, extra: float = 0.3) -> None:
        w = w0 + (w1 - w0) * (u / L) + extra
        ic.poly([at(u - 0.8, -w), at(u + 0.8, -w), at(u + 0.8, w), at(u - 0.8, w)], tone_lo)
        ic.poly([at(u - 0.8, -w), at(u + 0.8, -w), at(u + 0.8, 0), at(u - 0.8, 0)], tone_hi)

    if rank == 1:  # hide, sewn up the front, slung on a cord
        for u in (2.0, 5.0, 8.0, 11.0, 14.0):
            ic.dots([at(u, 0.8)], ("bone", 5))
        hoop(L - 0.6, ("leather", 5), ("leather", 2))
        ic.path([at(L - 2.0, -w1), (7, 14), (5, 21), at(3.0, -w0)], ("bone", 4))  # the cord
    elif rank == 2:  # dyed green, leather-bound, a pouch on the side and a buckled strap
        hoop(L - 0.6, ("leather", 5), ("leather", 3))
        hoop(1.0, ("leather", 4), ("leather", 2), 0.2)
        ic.poly([at(3.5, w0 + 0.2), at(3.5, w0 + 3.0), at(9.5, w0 + 3.6), at(9.5, w0 + 0.9)], ("leather", 4))  # pouch
        ic.poly([at(8.0, w0 + 0.7), at(8.0, w0 + 3.6), at(9.5, w0 + 3.6), at(9.5, w0 + 0.9)], ("leather", 5))
        ic.dots([at(8.8, w0 + 2.2)], ("brass", 6))
        ic.poly([at(L - 3.0, -w1 - 0.3), at(L - 1.2, -w1 - 0.3), (6.5, 15), (5.5, 22), at(2.2, -w0 - 0.2), at(4.0, -w0 - 0.2), (7.5, 21), (8.5, 15)], ("leather", 3))
        ic.dots([(6, 18)], ("brass", 6))
    elif rank == 3:  # tooled leather, flared, brass at mouth, waist and foot
        hoop(L - 0.6, ("brass", 6), ("brass", 4), 0.6)
        hoop(L * 0.5, ("brass", 6), ("brass", 4))
        ic.poly([at(0.6, -w0 - 0.2), at(-2.6, -1.4), at(-3.4, 0.0), at(-2.6, 1.4), at(0.6, w0 + 0.2)], ("brass", 4))  # a pointed shoe
        ic.poly([at(0.6, -w0 - 0.2), at(-2.6, -1.4), at(-3.4, 0.0), at(0.6, 0.0)], ("brass", 6))
        for u in (3.0, 5.5, 11.0, 13.5):  # the tooling
            ic.dots([at(u, -1.2), at(u + 1.0, -0.2), at(u, 0.8)], ("leather", 6))
        ic.dots([at(L * 0.5, -1.0)], ("crimson", 5))
    elif rank == 4:  # a wolf's pelt: pale ruffs at mouth and foot, fangs hanging from a brass band
        hoop(L * 0.5, ("brass", 7), ("brass", 4), 0.5)
        for v in (-2.6, 0.0, 2.6):  # fangs
            ic.poly([at(L * 0.5 - 0.8, v - 1.0), at(L * 0.5 - 0.8, v + 1.0), at(L * 0.5 - 4.4, v + 0.2)], ("bone", 7))
        wide = w1 + 0.8
        for i, v in enumerate((-wide, -wide * 0.5, 0.0, wide * 0.5, wide)):  # the ruff: a jagged collar of pale fur at the mouth
            ic.poly([at(L - 2.8, v - 1.4), at(L + 0.6 + (i % 2) * 0.8, v * 1.1), at(L - 2.8, v + 1.4)], ("bone", 6 if v < 0.5 else 4))
        ic.poly([at(0.4, -w0 - 0.2), at(-2.2, -1.2), at(-2.2, 1.2), at(0.4, w0 + 0.2)], ("brass", 4))  # a brass shoe
        ic.poly([at(0.4, -w0 - 0.2), at(-2.2, -1.2), at(-2.2, 0.0), at(0.4, 0.0)], ("brass", 6))
        for u in (4.0, 6.0, 12.0):  # the pelt's nap
            ic.dots([at(u, -w0 * 0.55), at(u + 1.0, -w0 * 0.15)], ("ink", 8))
            ic.dots([at(u + 0.5, w0 * 0.6)], ("ink", 2))
    else:  # a case of dark stone, seamed with light, crystal growing down its side
        hoop(L - 0.6, ("violet", 6), ("violet", 4), 0.4)
        ic.path([at(L - 2.0, -0.6), at(11.0, 0.8), at(7.0, -0.8), at(2.0, 0.4)], ("violet", 8))  # the seam
        ic.path([at(11.0, 0.8), at(9.5, 2.6)], ("violet", 6))
        for u, h in ((4.0, 4.0), (8.0, 5.2), (12.0, 3.4)):
            w = w0 + (w1 - w0) * (u / L)
            ic.poly([at(u - 1.4, w - 0.2), at(u + 0.6, w + h), at(u + 1.6, w - 0.2)], ("violet", 6))
            ic.line(at(u - 1.4, w - 0.2), at(u + 0.6, w + h), ("violet", 8))
        glow = glow[1:2]  # one spark, on the tallest arrow
    ic.outline()
    ic.glow(glow, ("violet", 8))
    return ic


# ------------------------------------------------------------------------------------------- build
SHIELDS = ["Rodela de madera", "Escudo de infante", "Escudo de caballero", "Égida alada", "Losa de la Grieta"]
BOWS = ["Arco de fresno", "Arco largo de montero", "Arco recurvo de asta", "Gran arco dorado", "Arco de la Grieta"]
QUIVERS = ["Carcaj de pellejo", "Carcaj de montero", "Carcaj repujado", "Carcaj de lobo", "Carcaj de la Grieta"]


def build() -> list[dict]:
    def group(key: str, title: str, note: str, stem: str, names: list[str], draw) -> dict:
        return {"key": key, "title": title, "note": note,
                "items": [(f"{stem}_{r}", names[r - 1], framed(draw(r), RANK_TIER[r])) for r in range(1, 6)]}

    return [
        group("shield", "Escudos · Knight", "Mano secundaria del Knight: cada categoría cambia de forma, de la rodela de madera a una losa de la Grieta.", "shield", SHIELDS, shield),
        group("bow", "Arcos · Ranger", "Arma del Ranger, en diagonal como las espadas y con la cuerda a la vista.", "bow", BOWS, bow),
        group("quiver", "Carcajs · Ranger", "Mano secundaria del Ranger: las plumas de las flechas asoman por la boca.", "quiver", QUIVERS, quiver),
    ]
