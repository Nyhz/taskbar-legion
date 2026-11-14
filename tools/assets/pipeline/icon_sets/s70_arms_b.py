"""Icon set: the Priest's weapons and the loose items — wands, tomes, the world-boss key and gold, and the three
chests with their lids thrown back.

Wands lie on the swords' diagonal (grip bottom-left, head top-right); tomes are closed books seen from above
and to the left (spine, cover and the top of the page-block); both climb the cloth family's ladder, from undyed
linen and peeled wood to a piece of the Rift."""
from __future__ import annotations

import math

from ..icons import RANK_TIER, Icon, framed, ring
from ..rig import Pt, Tone

D = (0.69, -0.724)  # along a wand, grip to head
N = (-0.724, -0.69)  # across it, towards the light
BASE = (7.5, 25.5)


def at(along: float, across: float = 0.0) -> Pt:
    return (BASE[0] + D[0] * along + N[0] * across, BASE[1] + D[1] * along + N[1] * across)


def shaft(ic: Icon, a0: float, a1: float, w: float, ramp: str, lo: int, hi: int, w1: float | None = None) -> None:
    """A length of rod: a lit half towards the light and a shadow half."""
    w1 = w if w1 is None else w1
    ic.poly([at(a0, w), at(a1, w1), at(a1, 0), at(a0, 0)], (ramp, hi))
    ic.poly([at(a0, 0), at(a1, 0), at(a1, -w1), at(a0, -w)], (ramp, lo))


def knob(ic: Icon, p: Pt, ramp: str, mid: int, hi: int) -> None:
    for dx, dy in ((0, 0), (1, 0), (0, 1), (-1, 0), (0, -1)):
        ic.put(p[0] + dx, p[1] + dy, (ramp, mid))
    ic.put(p[0] - 1, p[1] - 1, (ramp, hi))


def stone(ic: Icon, a0: float, a1: float, half: float, ramp: str, lo: int, mid: int, hi: int) -> None:
    """A long cut stone or shard on the wand's axis: a lit facet, a shadow facet, a bright edge."""
    m = (a0 + a1) / 2 - 0.5
    ic.poly([at(a0), at(m, half), at(a1)], (ramp, hi))
    ic.poly([at(a0), at(m, -half), at(a1)], (ramp, lo))
    ic.path([at(a0), at(a1)], (ramp, mid))


def soft_poly(ic: Icon, pts: list[Pt], tone: Tone) -> None:
    """Light in the air: fills only where nothing is drawn (call after `outline`)."""
    for x, y in ic.poly_mask(pts):
        ic.soft(x, y, tone)


# ------------------------------------------------------------------------------------------- wands
def wand(rank: int) -> Icon:
    ic = Icon()
    glow: list[Pt] = []
    spark: Tone = ("light", 0)
    if rank == 1:  # a peeled hazel switch: bark left on the grip, a knot, a cut twig, a rag of linen tied on
        shaft(ic, 0.0, 7.0, 1.4, "leather", 2, 4)
        shaft(ic, 7.0, 25.5, 1.3, "bone", 4, 6)
        ic.poly([at(25.5, 1.3), at(27.6, 0.0), at(25.5, -1.3)], ("bone", 5))  # whittled to a point
        ic.poly([at(15.0, 1.2), at(16.6, 3.2), at(18.4, 1.2)], ("bone", 5))  # the knot
        ic.dots([at(16.6, 1.8)], ("leather", 3))
        ic.path([at(21.0, 1.3), at(22.4, 1.3)], ("leather", 4))  # a scar where a twig was cut
        ic.poly([at(8.0, 2.0), at(10.2, 2.0), at(10.2, -2.0), at(8.0, -2.0)], ("sea", 5))  # a strip of cloth knotted round the grip
        ic.path([at(8.0, 2.0), at(10.2, 2.0)], ("sea", 6))
        ic.poly([at(8.4, -2.0), at(10.0, -2.0), at(9.6, -5.2), at(8.4, -4.2)], ("sea", 4))  # its loose end
        ic.dots([at(2.0, 0.7), at(4.6, 0.7)], ("leather", 5))
    elif rank == 2:  # an acolyte's rod: plain wood, a wrap of teal cloth, brass at both ends
        shaft(ic, 2.0, 22.0, 1.5, "leather", 3, 5)
        shaft(ic, 0.0, 2.8, 1.9, "brass", 3, 5)  # ferrule
        shaft(ic, 7.0, 16.5, 2.1, "sea", 3, 5)  # the wrap
        for t in (8.0, 10.2, 12.4, 14.6):
            ic.path([at(t, 2.1), at(t + 1.6, 0.0)], ("sea", 7))
        ic.poly([at(7.6, -2.1), at(9.8, -2.1), at(9.4, -5.4), at(7.8, -4.4)], ("sea", 4))  # the end of the cloth hangs free
        shaft(ic, 21.5, 26.0, 2.5, "brass", 4, 6)  # the cap: a plain brass drum
        ic.path([at(21.5, 2.5), at(21.5, -2.5)], ("brass", 3))
        ic.path([at(23.6, 2.5), at(23.6, -2.5)], ("brass", 3))
        ic.poly([at(26.0, 1.6), at(27.6, 0.0), at(26.0, -1.6)], ("brass", 5))
        ic.dots([at(22.4, 1.8), at(24.6, 1.8)], ("brass", 7))
    elif rank == 3:  # a white wand wound with gold, a crimson stone held in a gold claw
        shaft(ic, 0.0, 20.0, 1.5, "bone", 5, 7)
        for t in (3.0, 6.5, 10.0, 13.5, 17.0):  # the spiral
            ic.path([at(t, 1.5), at(t + 1.8, -1.5)], ("brass", 5))
            ic.dots([at(t, 1.5)], ("brass", 7))
        knob(ic, at(-1.6), "brass", 5, 7)
        shaft(ic, 19.0, 21.4, 2.6, "brass", 4, 6)  # the collar
        ic.path([at(21.4, 2.6), at(23.6, 3.2)], ("brass", 6))  # claws
        ic.path([at(21.4, -2.6), at(23.6, -3.2)], ("brass", 4))
        stone(ic, 21.6, 28.6, 2.9, "crimson", 3, 5, 6)
        ic.dots([at(24.0, 1.3)], ("light", 0))
        ic.dots([at(25.0, 1.4)], ("crimson", 7))
    elif rank == 4:  # a sun-sceptre: a rayed gold head round an azure jewel
        shaft(ic, 0.0, 15.0, 1.7, "brass", 4, 6)
        shaft(ic, 2.5, 8.5, 2.0, "bone", 5, 7)  # the grip, bound in white
        for t in (3.6, 5.4, 7.2):
            ic.path([at(t, 2.0), at(t + 1.0, -2.0)], ("bone", 4))
        knob(ic, at(-1.6), "azure", 5, 7)
        shaft(ic, 13.0, 15.4, 2.6, "brass", 5, 7)  # collar
        cx, cy = at(20.2)
        for i in range(8):  # the rays, long and short by turns
            a = math.radians(i * 45 - 46)
            r = 8.6 if i % 2 == 0 else 6.4
            l_, r_ = a - 0.36, a + 0.36
            ic.poly([(cx + math.cos(l_) * 3.8, cy + math.sin(l_) * 3.8), (cx + math.cos(a) * r, cy + math.sin(a) * r),
                     (cx + math.cos(r_) * 3.8, cy + math.sin(r_) * 3.8)], ("brass", 7 if (math.cos(a) * 0.6 + math.sin(a) * 0.8) < 0 else 5))
        disc = ring(14, cx, cy, 4.8, 4.8)
        ic.poly(disc, ("brass", 5))
        ic.poly([p for p in disc if p[0] + p[1] <= cx + cy + 0.5] + [(cx, cy)], ("brass", 7))  # its lit half
        ic.poly(ring(8, cx, cy, 2.2, 2.2), ("azure", 5))
        ic.put(cx, cy, ("azure", 7))
        ic.put(cx - 1, cy, ("azure", 7))
        ic.put(cx - 1, cy - 1, ("light", 0))
    else:  # a rod of the Rift: snapped off short, its point hanging in the air above the break
        shaft(ic, 0.0, 17.0, 1.6, "ink", 2, 4)
        shaft(ic, 3.0, 5.6, 2.0, "violet", 3, 5)  # a band
        knob(ic, at(-1.6), "ink", 3, 5)
        ic.dots([at(-1.6)], ("violet", 7))
        ic.poly([at(17.0, 1.6), at(19.6, 1.1), at(18.0, 0.3), at(20.2, -0.5), at(17.8, -0.9), at(17.0, -1.6)], ("ink", 3))  # the break
        for t, o in ((7.0, 0.5), (8.5, -0.3), (10.0, 0.4), (11.6, -0.2), (13.2, 0.5), (14.8, -0.1)):  # a vein of light up the rod
            ic.dots([at(t, o)], ("violet", 6))
        stone(ic, 20.8, 29.6, 3.4, "violet", 5, 6, 7)  # the shard
        ic.path([at(20.8), at(24.7, 3.4), at(29.6)], ("violet", 8))
        ic.poly([at(19.2, 3.8), at(21.2, 5.6), at(21.6, 3.8)], ("violet", 6))  # two splinters keeping it company
        ic.poly([at(21.4, -3.8), at(23.6, -5.4), at(23.4, -3.6)], ("violet", 5))
        glow = [at(31.0, 0.4)]
        spark = ("violet", 8)
    ic.outline()
    ic.glow(glow, spark)
    return ic


# ------------------------------------------------------------------------------------------- tomes
def book(ic: Icon, x0: float, y0: float, x1: float, y1: float, dx: float, dy: float, cover: Tone, spine: Tone, shade: Tone, page: Tone, line: Tone) -> None:
    """A closed book from above-left: the cover facing us, the spine on the left, the top of the pages."""
    ic.poly([(x0 - dx, y0 - dy), (x1 - dx, y0 - dy), (x1, y0), (x0, y0)], page)  # top of the page-block
    for k in range(1, int(dy) + 1):
        if k % 2 == 1:
            ic.path([(x0 - dx + dx * k / dy + 1, y0 - dy + k), (x1 - dx + dx * k / dy - 1, y0 - dy + k)], line)
    ic.poly([(x0 - dx, y0 - dy), (x0, y0), (x0, y1), (x0 - dx, y1 - dy)], spine)
    ic.poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], cover)
    ic.path([(x1, y0), (x1, y1), (x0, y1)], shade)  # the cover's far edges fall into shadow


def tome(rank: int) -> Icon:
    ic = Icon()
    glow: list[Pt] = []
    if rank == 1:  # a stitched pamphlet: limp linen covers, ragged pages, a cord round it
        book(ic, 12, 10, 24, 26, 2.4, 2.0, ("bone", 5), ("bone", 6), ("bone", 3), ("bone", 7), ("bone", 4))
        for x in (11, 14, 17, 20):  # pages of different lengths stand proud of the cover
            ic.dots([(x, 7), (x + 1, 7)], ("bone", 6))
        ic.poly([(21, 10), (24, 10), (24, 13)], ("bone", 7))  # a dog-ear
        ic.path([(21, 10), (24, 13)], ("bone", 3))
        for y in (12, 16, 20, 24):  # the stitching down the spine
            ic.dots([(10, y - 1), (11, y)], ("leather", 3))
        ic.poly([(14, 14), (17, 13), (18, 16), (15, 17)], ("bone", 4))  # a stain
        ic.path([(10, 18), (24, 20)], ("leather", 4))  # the cord
        ic.path([(10, 19), (24, 21)], ("leather", 2))
        ic.path([(21, 20), (20, 24)], ("leather", 4))  # its knot and tail
        ic.path([(22, 20), (23, 25)], ("leather", 3))
    elif rank == 2:  # a prayer book in teal cloth: a gilt line round the board, a ring stamped on it, a ribbon
        book(ic, 11, 8, 24, 26, 3.2, 2.4, ("sea", 4), ("sea", 5), ("sea", 2), ("bone", 7), ("bone", 5))
        ic.path([(13, 10), (22, 10), (22, 24), (13, 24), (13, 10)], ("brass", 4))
        ic.path([(13, 10), (22, 10)], ("brass", 6))
        for x, y in ring(10, 17.5, 17.0, 3.2, 3.2):
            ic.put(x, y, ("brass", 6))
        ic.dots([(17, 17), (18, 17), (17, 16)], ("sea", 6))
        ic.path([(8, 12), (8, 22)], ("sea", 6))  # the spine catches the light
        ic.poly([(19, 27), (21, 27), (21, 30), (20, 29), (19, 30)], ("crimson", 5))  # the ribbon marker
        ic.path([(19, 27), (19, 29)], ("crimson", 6))
    elif rank == 3:  # a tome in white leather: gold corners, raised bands, a clasp and a crimson stone
        book(ic, 11, 7, 25, 27, 4.0, 2.6, ("bone", 6), ("bone", 5), ("bone", 4), ("bone", 7), ("bone", 5))
        ic.path([(11, 7), (25, 7)], ("bone", 7))
        ic.path([(11, 7), (11, 27)], ("bone", 7))
        for (cx, cy), (sx, sy) in (((11, 7), (1, 1)), ((25, 7), (-1, 1)), ((11, 27), (1, -1)), ((25, 27), (-1, -1))):
            ic.poly([(cx, cy), (cx + sx * 3.4, cy), (cx, cy + sy * 3.4)], ("brass", 5))
        ic.dots([(11, 7), (12, 7), (11, 8)], ("brass", 7))
        for y in (11, 17, 23):  # raised bands across the spine
            ic.path([(7, y - 2.6), (11, y)], ("brass", 5))
            ic.path([(7, y - 1.6), (11, y + 1)], ("bone", 3))
        ic.poly([(21, 16), (26, 16), (26, 19), (21, 19)], ("brass", 4))  # the clasp, coming round from the fore-edge
        ic.poly([(20, 15), (23, 15), (23, 20), (20, 20)], ("brass", 6))
        ic.dots([(21, 17), (22, 17), (21, 18), (22, 18)], ("bone", 3))
        ic.poly([(15, 12.5), (18.5, 17.5), (15, 22.5), (11.5, 17.5)], ("brass", 5))  # the setting
        ic.poly([(15, 14), (17.4, 17.5), (15, 21), (12.6, 17.5)], ("crimson", 4))  # and the stone in it
        ic.poly([(15, 14), (15, 17.5), (12.6, 17.5)], ("crimson", 6))
        ic.path([(15, 14), (15, 21)], ("crimson", 5))
        ic.dots([(14, 16)], ("light", 0))
    elif rank == 4:  # a great gospel plated in gold: a sunburst round an azure jewel, jewels at the corners
        book(ic, 10, 6, 27, 28, 4.6, 3.0, ("brass", 5), ("brass", 4), ("brass", 3), ("bone", 7), ("brass", 5))
        ic.path([(10, 6), (27, 6)], ("brass", 7))  # the plate is bevelled
        ic.path([(10, 6), (10, 28)], ("brass", 7))
        ic.path([(12, 8), (25, 8), (25, 26), (12, 26), (12, 8)], ("brass", 4))
        for y in (10, 16, 22):  # bands on the spine
            ic.path([(5.4, y - 3.0), (10, y)], ("brass", 6))
            ic.path([(5.4, y - 2.0), (10, y + 1)], ("brass", 3))
        cx, cy = 18.5, 17.0
        for i in range(12):  # the sunburst
            a = math.radians(i * 30 - 90)
            r = 7.0 if i % 2 == 0 else 5.0
            ic.path([(cx + math.cos(a) * 3.2, cy + math.sin(a) * 3.2), (cx + math.cos(a) * r, cy + math.sin(a) * r)], ("brass", 7))
        ic.poly(ring(10, cx, cy, 3.0, 3.0), ("brass", 7))
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ic.put(cx + dx, cy + dy, ("azure", 5))
        ic.put(cx, cy, ("azure", 7))
        ic.put(cx - 1, cy - 1, ("light", 0))
        ic.dots([(13, 9), (24, 9), (13, 25), (24, 25)], ("azure", 6))
    else:  # a tome of the Rift: dark hide split by cracks, crystal through the board, light between the pages
        book(ic, 11, 8, 25, 27, 4.0, 2.6, ("ink", 3), ("ink", 4), ("ink", 1), ("violet", 7), ("light", 0))
        ic.path([(11, 8), (25, 8)], ("violet", 8))  # where the board meets the pages, the light gets out
        ic.path([(7, 5.4), (11, 8)], ("violet", 6))
        ic.path([(13, 10), (16, 14), (15, 18), (18, 21), (17, 25)], ("violet", 6))  # cracks
        ic.path([(16, 14), (20, 15), (22, 13)], ("violet", 5))
        ic.path([(18, 21), (22, 22)], ("violet", 5))
        ic.dots([(15, 18), (16, 14)], ("violet", 8))
        ic.poly([(20, 12), (26.5, 3.5), (24.6, 13.0)], ("violet", 6))  # a shard grown through the top corner
        ic.path([(20, 12), (26.5, 3.5)], ("violet", 8))
        ic.poly([(8, 21), (5.0, 17.0), (8.6, 17.6)], ("violet", 5))  # and a small one through the spine
        ic.path([(8, 21), (5.0, 17.0)], ("violet", 7))
        for y in (12, 24):
            ic.path([(7, y - 2.6), (11, y)], ("ink", 2))
        glow = [(15, 2)]
    ic.outline()
    ic.glow(glow, ("violet", 8))
    return ic


# ---------------------------------------------------------------------------------- key and gold
def key_world() -> Icon:
    """The key to a world boss: black iron and brass, a splinter of the Rift caught in its bow."""
    ic = Icon()
    cx, cy = 10.5, 21.5
    outer, inner = ring(14, cx, cy, 6.2, 6.2), ring(10, cx, cy, 3.6, 3.6)
    ic.poly(outer, ("brass", 5))
    ic.poly([p for p in outer if p[0] + p[1] <= cx + cy + 0.5] + [(cx + 4.4, cy - 4.4), (cx - 4.4, cy + 4.4)], ("brass", 6))  # lit side of the bow
    ic.poly(inner, ("ink", 1))
    ic.poly([(cx, cy - 3.2), (cx + 2.2, cy), (cx, cy + 3.2), (cx - 2.2, cy)], ("violet", 5))  # the splinter
    ic.poly([(cx, cy - 3.2), (cx, cy), (cx - 2.2, cy)], ("violet", 7))
    ic.dots([(cx - 1, cy - 1)], ("violet", 8))
    for a in (-135, 135, 45):  # three horns on the bow
        r = math.radians(a)
        ic.poly([(cx + math.cos(r - 0.3) * 6.0, cy + math.sin(r - 0.3) * 6.0), (cx + math.cos(r) * 8.6, cy + math.sin(r) * 8.6),
                 (cx + math.cos(r + 0.3) * 6.0, cy + math.sin(r + 0.3) * 6.0)], ("brass", 4))
    a0 = 5.6  # the shank starts where the bow ends
    ic.poly([at(a0, 1.4), at(25.0, 1.3), at(25.0, 0.0), at(a0, 0.0)], ("ink", 6))
    ic.poly([at(a0, 0.0), at(25.0, 0.0), at(25.0, -1.3), at(a0, -1.4)], ("ink", 3))
    for t in (8.0, 10.2):  # collars
        ic.poly([at(t, 2.3), at(t + 1.3, 2.3), at(t + 1.3, -2.3), at(t, -2.3)], ("brass", 5))
        ic.dots([at(t + 0.4, 2.0)], ("brass", 7))
    # The bit: two wards hanging off the end, away from the light.
    ic.poly([at(18.0, -1.2), at(20.6, -1.2), at(20.6, -5.6), at(18.0, -5.6)], ("ink", 4))
    ic.poly([at(22.2, -1.2), at(25.0, -1.2), at(25.0, -6.8), at(22.2, -6.8)], ("ink", 4))
    ic.path([at(18.0, -1.2), at(18.0, -5.6)], ("ink", 6))
    ic.path([at(22.2, -1.2), at(22.2, -6.8)], ("ink", 6))
    ic.dots([at(19.3, -3.6), at(23.6, -4.4)], ("ink", 1))
    knob(ic, at(26.2), "brass", 5, 7)
    ic.outline()
    return ic


def coin(ic: Icon, cx: float, cy: float, rx: float, ry: float, thick: float, mark: bool = False) -> None:
    """A gold coin: its edge showing below the face, a raised rim lit on one side, a stamped sun."""
    ic.poly(ring(28, cx, cy + thick, rx, ry), ("brass", 3))
    ic.poly([(cx - rx, cy), (cx + rx, cy), (cx + rx, cy + thick), (cx - rx, cy + thick)], ("brass", 3))
    ic.poly(ring(28, cx, cy, rx, ry), ("brass", 5))
    if rx > 5:
        ic.poly(ring(28, cx, cy, rx - 1.8, ry - 1.8 * ry / rx), ("brass", 6))  # the field inside the rim
    for x, y in ring(40, cx, cy, rx - 0.6, ry - 0.6 * ry / rx):  # the rim: bright towards the light, dull away from it
        ic.put(x, y, ("brass", 7) if (x - cx) * 0.6 + (y - cy) * 0.8 * rx / ry < -rx * 0.15 else ("brass", 4))
    if mark:
        k = ry / rx
        for i in range(8):
            a = math.radians(i * 45 + 22.5)
            ic.path([(cx + math.cos(a) * 3.2, cy + math.sin(a) * 3.2 * k), (cx + math.cos(a) * 5.8, cy + math.sin(a) * 5.8 * k)], ("brass", 4))
        ic.poly(ring(12, cx, cy, 2.8, 2.8 * k), ("brass", 4))
        ic.poly(ring(10, cx - 0.4, cy - 0.4, 1.6, 1.6 * k), ("brass", 7))
        ic.dots([(cx - 6, cy - 6), (cx - 5, cy - 7), (cx - 7, cy - 5)], ("light", 0))  # the glint on the rim


def gold_coin() -> Icon:
    ic = Icon()
    coin(ic, 16.0, 15.0, 10.5, 10.0, 2.6, mark=True)
    ic.outline()
    return ic


def gold_pile() -> Icon:
    """A small heap: coins lying flat on one another, the far ones first, one standing on edge at the top."""
    ic = Icon()
    spots = [(15, 11), (20, 14), (11, 15), (16, 17), (23, 18), (9, 19), (14, 21), (20, 22), (6, 24), (26, 24), (11, 25), (17, 26), (23, 26)]
    for cx, cy in spots:  # far ones first, so the near ones lie over them
        coin(ic, cx, cy, 5.0, 2.0, 1.8)
    coin(ic, 23.0, 9.5, 3.6, 3.6, 1.2)  # one standing on edge at the top
    ic.dots([(22, 8), (14, 10), (5, 23)], ("light", 0))
    ic.outline()
    return ic


# ------------------------------------------------------------------------------------ open chests
def chest_open(kind: str) -> Icon:
    """The chests of `icons.chest`, same body, with the lid thrown back to show its lining and what is inside."""
    ic = Icon()
    if kind == "normal":
        ic.poly([(6, 14), (6, 6), (9, 3), (23, 3), (26, 6), (26, 14)], ("leather", 2))  # the lid's inside
        ic.poly([(8, 13), (8, 7), (10, 5), (22, 5), (24, 7), (24, 13)], ("leather", 1))
        ic.path([(6, 6), (9, 3), (23, 3)], ("leather", 4))
        for x in (9, 22):
            ic.rect(x, 3, x + 1, 14, ("ink", 4))
            ic.dots([(x, 4), (x, 9)], ("ink", 7))
        ic.rect(6, 13, 26, 15, ("leather", 1))  # the mouth
        ic.rect(9, 13, 23, 14, ("brass", 3))  # a faint glow from inside
        ic.rect(12, 13, 20, 13, ("brass", 5))
        ic.dots([(15, 12), (17, 12), (16, 11)], ("brass", 6))
        ic.poly([(5, 15), (27, 15), (27, 26), (5, 26)], ("leather", 4))  # the body, as closed
        ic.path([(5, 15), (27, 15)], ("leather", 6))
        for y in (19, 23):
            ic.path([(5, y), (27, y)], ("leather", 3))
        ic.rect(5, 25, 27, 26, ("leather", 2))
        for x in (9, 22):
            ic.rect(x, 15, x + 1, 26, ("ink", 5))
            ic.dots([(x, 17), (x, 22)], ("ink", 8))
        ic.rect(15, 16, 17, 20, ("ink", 6))  # the hasp hangs open
        ic.dots([(16, 18), (16, 19)], ("ink", 1))
        ic.dots([(15, 16)], ("ink", 9))
    elif kind == "stageBoss":
        ic.poly([(5, 14), (5, 6), (9, 2), (23, 2), (27, 6), (27, 14)], ("ink", 3))
        ic.poly([(7, 13), (7, 7), (10, 4), (22, 4), (25, 7), (25, 13)], ("ink", 1))
        ic.path([(5, 6), (9, 2), (23, 2)], ("ink", 6))
        for x in (8, 23):
            ic.rect(x, 2, x + 1, 14, ("brass", 3))
            ic.dots([(x, 3), (x, 8)], ("brass", 5))
        ic.rect(5, 13, 27, 15, ("ink", 0))
        # Gold heaped to the brim and over it.
        for cx, cy in ((13, 11), (19, 11), (10, 13), (22, 13), (16, 13)):
            coin(ic, cx, cy, 3.6, 1.4, 1.0)
        ic.dots([(12, 10), (18, 10), (21, 12)], ("light", 0))
        ic.poly([(4, 15), (28, 15), (28, 27), (4, 27)], ("ink", 4))
        ic.path([(4, 15), (28, 15)], ("ink", 7))
        ic.rect(4, 26, 28, 27, ("ink", 2))
        for x in (8, 23):
            ic.rect(x, 15, x + 1, 27, ("brass", 4))
            ic.dots([(x, 18), (x, 23)], ("brass", 6))
        for x0, y0 in ((4, 15), (26, 15), (4, 25), (26, 25)):
            ic.rect(x0, y0, x0 + 2, y0 + 2, ("brass", 5))
        ic.rect(14, 16, 18, 21, ("brass", 5))
        ic.rect(14, 16, 18, 16, ("brass", 7))
        ic.dots([(16, 18), (16, 19), (16, 20), (15, 18), (17, 18)], ("ink", 0))
        ic.dots([(11, 22), (13, 24), (19, 22), (21, 24)], ("ink", 7))
    else:
        ic.poly([(5, 15), (5, 7), (9, 3), (23, 3), (27, 7), (27, 15)], ("brass", 4))  # the lid's inside: gold, lined in red
        ic.poly([(7, 14), (7, 8), (10, 5), (22, 5), (25, 8), (25, 14)], ("crimson", 2))
        ic.path([(5, 7), (9, 3), (23, 3)], ("brass", 7))
        for x in (7, 24):
            ic.rect(x, 3, x + 1, 15, ("brass", 6))
        for rx, ry, tone in ((9.6, 9.4, ("brass", 6)), (7.4, 7.0, ("brass", 7)), (5.2, 4.6, ("light", 0))):  # light welling up, in three flat bands
            ic.poly([(16 + math.cos(math.radians(a)) * rx, 15 + math.sin(math.radians(a)) * ry) for a in range(180, 361, 15)], tone)
        ic.rect(5, 14, 27, 16, ("light", 0))  # the mouth, ablaze
        ic.poly([(4, 16), (28, 16), (28, 27), (4, 27)], ("crimson", 3))
        ic.rect(4, 26, 28, 27, ("crimson", 1))
        ic.rect(4, 17, 28, 17, ("brass", 6))
        for x in (7, 24):
            ic.rect(x, 16, x + 1, 27, ("brass", 6))
            ic.dots([(x + 1, 20), (x + 1, 24)], ("brass", 3))
        ic.poly([(11, 19), (21, 19), (19, 25), (13, 25)], ("crimson", 4))
        ic.path([(11, 19), (21, 19), (19, 25), (13, 25), (11, 19)], ("brass", 5))
    ic.outline()
    if kind == "normal":
        ic.glow([(16, 1)], ("brass", 6))
    elif kind == "stageBoss":
        ic.glow([(16, 0)], ("brass", 7))
    else:  # rays leaving the chest, over the lid's rim and into the air
        ic.glow([(16, 0), (16, 1), (9, 1), (23, 1), (2, 14), (30, 14), (2, 15), (30, 15)], ("brass", 7))
    return ic


# ------------------------------------------------------------------------------------------- build
WANDS = ["Vara de avellano", "Vara de acólito", "Vara del rubí", "Cetro solar", "Vara de la Grieta"]
TOMES = ["Cuadernillo cosido", "Devocionario de tela", "Tomo de piel blanca", "Evangeliario dorado", "Tomo de la Grieta"]
CHESTS = {"normal": "Cofre común abierto", "stageBoss": "Cofre de jefe de etapa abierto", "zoneBoss": "Cofre de jefe de mundo abierto"}


def build() -> list[dict]:
    return [
        {"key": "wand", "title": "Varas · Priest", "note": "Arma de la Priest, en cinco categorías: de una vara de avellano pelada a una que la Grieta partió en dos.",
         "items": [(f"wand_{r}", WANDS[r - 1], framed(wand(r), RANK_TIER[r])) for r in range(1, 6)]},
        {"key": "tome", "title": "Tomos · Priest", "note": "Mano izquierda de la Priest: cinco encuadernaciones, del cuadernillo cosido al tomo que deja escapar luz entre las páginas.",
         "items": [(f"tome_{r}", TOMES[r - 1], framed(tome(r), RANK_TIER[r])) for r in range(1, 6)]},
        {"key": "keys", "title": "Llaves y monedas", "note": "La llave que abre el paso a un jefe de mundo, y el oro.",
         "items": [("key_world", "Llave de jefe de mundo", framed(key_world(), 0)), ("gold_coin", "Moneda de oro", framed(gold_coin(), 0)),
                   ("gold_pile", "Montón de oro", framed(gold_pile(), 0))]},
        {"key": "chests_open", "title": "Cofres abiertos", "note": "Los tres cofres con la tapa echada atrás: un resplandor, oro hasta el borde y un chorro de luz.",
         "items": [(f"chest_open_{k}", name, framed(chest_open(k), 0)) for k, name in CHESTS.items()]},
    ]
