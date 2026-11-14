"""Jewellery icons: rings, amulets and trinkets, five ranks each. Jewellery has no family — any class wears it.

The three kinds must never be confused at 1×: a ring is a hoop with its bezel on top, an amulet hangs from a
chain that comes in from the top corners, a trinket is an object that stands on its base (or, at the last rank,
floats).
"""
from __future__ import annotations

import math

from ..icons import RANK_TIER, Icon, framed, lit, ring
from ..palette import RAMPS
from ..rig import Pt, Tone


# ------------------------------------------------------------------------------------------ helpers
def hoop(ic: Icon, cx: float, cy: float, rx: float, ry: float, t: float, ramp: str, lo: int, mid: int, hi: int) -> None:
    """A band seen three-quarters: the hoop itself, lit top-left, and the inside of its far wall showing as a
    dark crescent on the left of the hole."""
    for y in range(ic.h):
        for x in range(ic.w):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            outer = (dx / rx) ** 2 + (dy / ry) ** 2
            inner = (dx / (rx - t)) ** 2 + (dy / (ry - t)) ** 2
            if outer <= 1.0 and inner > 1.0:
                k = (-dx * 0.6 - dy * 0.8) / (math.hypot(dx, dy) or 1.0)
                ic.put(x, y, (ramp, hi if k > 0.5 else lo if k < -0.3 else mid))
            elif inner <= 1.0:
                far = ((dx - 2.4) / (rx - t)) ** 2 + (dy / (ry - t)) ** 2
                if far > 1.0:
                    ic.put(x, y, (ramp, max(lo - 1, 0)))


def disc(ic: Icon, cx: float, cy: float, rx: float, ry: float, ramp: str, lo: int, mid: int, hi: int, rim: float = 1.6) -> None:
    """A flat medal: a face with a raised rim, the rim lit on the top-left and dark on the bottom-right."""
    for y in range(ic.h):
        for x in range(ic.w):
            dx, dy = x + 0.5 - cx, y + 0.5 - cy
            if (dx / rx) ** 2 + (dy / ry) ** 2 > 1.0:
                continue
            k = (-dx * 0.6 - dy * 0.8) / (math.hypot(dx, dy) or 1.0)
            if (dx / (rx - rim)) ** 2 + (dy / (ry - rim)) ** 2 > 1.0:
                ic.put(x, y, (ramp, hi if k > 0.2 else lo))
            else:
                ic.put(x, y, (ramp, mid))


def stone(ic: Icon, cx: float, cy: float, rx: float, ry: float, ramp: str, n: int = 6, lo: int = 1) -> None:
    """A small faceted stone: a few flat crown facets lit by where they face, a table, one glint. Six sides and a
    wide tone range, so at this size it reads as cut and not as a bead."""
    top = len(RAMPS[ramp]) - 1
    outer = ring(n, cx, cy, rx, ry, math.pi / n)
    inner = [(cx + (x - cx) * 0.5, cy + (y - cy) * 0.5) for x, y in outer]
    for i in range(n):
        a, b, c, d = outer[i], outer[(i + 1) % n], inner[(i + 1) % n], inner[i]
        ic.poly([a, b, c, d], lit(ramp, ((a[0] + b[0]) / 2 - cx, (a[1] + b[1]) / 2 - cy), lo, top - 1))
    ic.poly(inner, (ramp, top - 2))
    ic.path([inner[i] for i in (n // 2, n // 2 + 1, (n // 2 + 2) % n)], (ramp, top))  # the table's lit edge
    ic.put(cx - 1.2, cy - 1.2, ("light", 0))
    ic.put(cx - 0.2, cy - 1.2, (ramp, top))


def chain(ic: Icon, a: Pt, b: Pt, dark: Tone, bright: Tone, heavy: bool = False) -> None:
    """A chain as alternating links from a to b; `heavy` doubles it for the richer pieces."""
    steps = int(max(abs(b[0] - a[0]), abs(b[1] - a[1])))
    for i in range(steps + 1):
        x, y = a[0] + (b[0] - a[0]) * i / steps, a[1] + (b[1] - a[1]) * i / steps
        ic.put(x, y, bright if i % 2 == 0 else dark)
        if heavy:
            ic.put(x, y + 1, dark)


def necklace(ic: Icon, bail: Pt, dark: Tone, bright: Tone, heavy: bool = False) -> None:
    """The two runs of an amulet's chain, in from the top corners to the bail."""
    chain(ic, (3, 0), (bail[0] - 1, bail[1]), dark, bright, heavy)
    chain(ic, (28, 0), (bail[0] + 1, bail[1]), dark, bright, heavy)


def rays(ic: Icon, cx: float, cy: float, lengths: tuple[float, ...], base: float, half: float, ramp: str, lo: int, hi: int, start: float = -90.0) -> None:
    """Solid pointed rays round a centre, each with a lit half (as on the sun-crown)."""
    n = len(lengths)
    for i, r in enumerate(lengths):
        ang = start + 360.0 * i / n
        a_, l_, r_ = math.radians(ang), math.radians(ang - half), math.radians(ang + half)
        tip = (cx + math.cos(a_) * r, cy + math.sin(a_) * r)
        left, right = (cx + math.cos(l_) * base, cy + math.sin(l_) * base), (cx + math.cos(r_) * base, cy + math.sin(r_) * base)
        ic.poly([left, tip, right, (cx, cy)], (ramp, lo))
        ic.poly([left, tip, (cx, cy)], (ramp, hi))


# -------------------------------------------------------------------------------------------- rings
def ring_icon(rank: int) -> Icon:
    ic = Icon()
    glow: list[Pt] = []
    if rank == 1:  # a plain iron band, pitted and rusting
        hoop(ic, 16, 16, 11.0, 10.5, 3.6, "ink", 3, 5, 7)
        ic.dots([(9, 21), (10, 22), (22, 9), (24, 17)], ("leather", 4))  # rust
        ic.path([(8, 11), (10, 9)], ("ink", 8))  # one worn edge catching the light
        ic.dots([(20, 25), (21, 24)], ("ink", 2))  # a nick
    elif rank == 2:  # a bronze signet: a flat oval plate with its sign cut in
        hoop(ic, 16, 20, 9.5, 8.5, 3.0, "brass", 2, 3, 4)
        ic.poly(ring(16, 16, 11.5, 7.5, 4.0), ("brass", 2))  # the plate: its edge...
        ic.poly(ring(16, 16, 9.5, 7.5, 4.0), ("brass", 4))  # ...and its face
        ic.poly([(9, 9.5), (11, 7), (16, 5.8), (14, 8), (11, 10.5)], ("brass", 5))
        ic.rect(15, 7, 16, 12, ("brass", 1))  # the sign: a tree
        ic.path([(12, 8), (15, 10)], ("brass", 1))
        ic.path([(19, 8), (16, 10)], ("brass", 1))
        ic.path([(8, 16), (9, 14)], ("brass", 5))
    elif rank == 3:  # gold, with a red stone in a collar
        hoop(ic, 16, 20.5, 9.5, 8.0, 3.0, "brass", 4, 5, 7)
        ic.poly([(11, 13), (21, 13), (20, 10), (12, 10)], ("brass", 4))  # collar
        ic.path([(12, 10), (20, 10)], ("brass", 7))
        stone(ic, 16, 6.5, 5.0, 4.6, "crimson")
        ic.dots([(11, 9), (21, 9)], ("brass", 6))  # the grips of the collar
    elif rank == 4:  # a heavy ring: a great blue stone in claws, small stones on the shoulders
        hoop(ic, 16, 21, 10.0, 8.0, 4.0, "brass", 4, 5, 7)
        ic.poly([(10, 15), (22, 15), (21, 12), (11, 12)], ("brass", 5))
        ic.path([(11, 12), (21, 12)], ("brass", 7))
        ic.path([(10, 15), (22, 15)], ("brass", 3))
        stone(ic, 16, 7.0, 6.0, 5.6, "azure")
        for x, y in ((10, 2), (21, 2), (10, 11), (21, 11)):  # claws
            ic.rect(x, y, x + 1, y + 1, ("brass", 7))
        ic.dots([(7, 17), (25, 17)], ("crimson", 5))  # shoulder stones
        ic.dots([(7, 16), (25, 16)], ("crimson", 6))
        glow = [(16, 0)]
    else:  # dark metal with a seam of light, and a shard of the Rift that floats above the bezel
        hoop(ic, 16, 21.5, 10.0, 8.0, 3.4, "ink", 3, 4, 6)
        for x, y in ring(90, 16, 21.5, 8.3, 6.3):  # the seam running round the band
            ic.put(x, y, ("violet", 7) if x + y < 36 else ("violet", 5))
        ic.poly([(10, 16), (13, 16), (11.5, 11)], ("ink", 5))  # two prongs reaching for it
        ic.poly([(19, 16), (22, 16), (20.5, 11)], ("ink", 3))
        ic.poly([(16, 0), (20.5, 5.5), (16, 12), (11.5, 5.5)], ("violet", 5))  # the shard
        ic.poly([(16, 0), (11.5, 5.5), (16, 12)], ("violet", 7))
        ic.path([(16, 1), (16, 11)], ("violet", 8))
        ic.path([(13, 5), (15, 3)], ("light", 0))
        glow = [(8, 6)]
    ic.outline()
    ic.glow(glow, ("violet", 7) if rank == 5 else ("azure", 8))
    return ic


# ------------------------------------------------------------------------------------------ amulets
def amulet(rank: int) -> Icon:
    ic = Icon()
    glow: list[Pt] = []
    if rank == 1:  # a beast's fang bound to a leather cord
        chain(ic, (3, 0), (14, 9), ("leather", 4), ("leather", 4))
        chain(ic, (28, 0), (18, 9), ("leather", 3), ("leather", 3))
        ic.poly([(12, 11), (20, 11), (21, 16), (19, 23), (15.5, 30), (14, 23), (11.5, 16)], ("bone", 6))
        ic.poly([(12, 11), (15.5, 11), (14.5, 22), (15.5, 30), (14, 23), (11.5, 16)], ("bone", 7))
        ic.poly([(18.5, 12), (20, 11), (21, 16), (19, 23), (17, 26.5), (18, 17)], ("bone", 4))
        ic.rect(11, 9, 20, 11, ("leather", 3))  # the binding
        ic.path([(11, 9), (20, 9)], ("leather", 5))
        ic.dots([(13, 10), (16, 10), (19, 10)], ("leather", 1))
        ic.path([(16, 14), (16, 19)], ("bone", 3))  # a crack
    elif rank == 2:  # a bronze medal on an iron chain, a sun stamped in it
        necklace(ic, (16, 8), ("ink", 4), ("ink", 7))
        ic.rect(15, 8, 17, 10, ("brass", 3))  # bail
        disc(ic, 16, 19.5, 8.5, 8.5, "brass", 2, 3, 5)
        ic.poly([(10.5, 17), (13, 13.5), (17, 13), (13.5, 16), (12, 20)], ("brass", 4))  # light across the face
        ic.path([(16, 15), (16, 24)], ("brass", 1))  # the sun: a cross and four points
        ic.path([(11.5, 19.5), (20.5, 19.5)], ("brass", 1))
        ic.dots([(13, 16), (19, 16), (13, 23), (19, 23)], ("brass", 1))
        ic.dots([(15, 18), (17, 18), (15, 21), (17, 21)], ("brass", 5))
    elif rank == 3:  # a gold locket with a red stone, hinged, on a gold chain
        necklace(ic, (16, 8), ("brass", 3), ("brass", 6))
        ic.rect(15, 8, 17, 10, ("brass", 5))
        disc(ic, 16, 20, 7.0, 8.5, "brass", 3, 5, 7)
        for x, y in ring(30, 16, 20, 4.4, 5.8):  # an engraved line inside the rim
            ic.put(x, y, ("brass", 4))
        ic.poly([(11, 18), (13, 14), (16, 13), (13.5, 17), (12.5, 22)], ("brass", 6))
        stone(ic, 16, 20, 3.0, 3.4, "crimson")
        ic.rect(22, 17, 23, 18, ("brass", 3))  # hinges
        ic.rect(22, 22, 23, 23, ("brass", 3))
        ic.put(9, 20, ("brass", 7))  # the clasp
    elif rank == 4:  # a sun: a great blue stone in a blaze of gold rays, on a heavy chain
        necklace(ic, (16, 7), ("brass", 4), ("brass", 7), heavy=True)
        rays(ic, 16, 19, (12.5, 9.0, 12.0, 9.0, 11.0, 9.0, 12.0, 9.0), 6.5, 21.0, "brass", 5, 7)
        for x, y in ring(28, 16, 19, 6.4, 6.4):  # the setting
            ic.put(x, y, ("brass", 4))
        stone(ic, 16, 19, 5.4, 5.4, "azure")
        ic.dots([(16, 12.5), (16, 25.5), (9.5, 19), (22.5, 19)], ("brass", 7))  # claws
        glow = [(26, 9)]
    else:  # a crystal of the Rift held in a cage of dark metal
        necklace(ic, (16, 7), ("ink", 3), ("ink", 6))
        ic.poly([(16, 8), (21, 14), (20, 23), (16, 30), (12, 23), (11, 14)], ("violet", 5))  # the crystal
        ic.poly([(16, 8), (11, 14), (12, 23), (16, 30)], ("violet", 7))
        ic.path([(16, 9), (16, 29)], ("violet", 8))
        ic.path([(13, 15), (14, 22)], ("violet", 8))
        ic.poly([(12, 8), (20, 8), (21.5, 12), (10.5, 12)], ("ink", 4))  # cap
        ic.path([(12, 8), (20, 8)], ("ink", 6))
        ic.rect(10, 18, 22, 19, ("ink", 3))  # the band round its waist
        ic.path([(10, 18), (15, 18)], ("ink", 5))
        ic.path([(10, 12), (10, 18)], ("ink", 4))  # two bars down from the cap
        ic.path([(22, 12), (22, 18)], ("ink", 2))
        ic.poly([(14, 27), (18, 27), (16, 31)], ("ink", 3))  # the foot it rests in
        glow = [(7, 22), (25, 15)]
    ic.outline()
    ic.glow(glow, ("violet", 7) if rank == 5 else ("light", 0))
    return ic


# ----------------------------------------------------------------------------------------- trinkets
def _die(ic: Icon, x: float, y: float, pips: tuple[int, int, int]) -> None:
    """A bone die seen from above its corner: top, left and right faces, with their pips."""
    top = [(x, y), (x + 7, y - 2), (x + 12, y + 1), (x + 5, y + 3)]
    left = [(x, y), (x + 5, y + 3), (x + 5, y + 11), (x, y + 8)]
    right = [(x + 5, y + 3), (x + 12, y + 1), (x + 12, y + 9), (x + 5, y + 11)]
    ic.poly(top, ("bone", 7))
    ic.poly(left, ("bone", 6))
    ic.poly(right, ("bone", 4))
    ic.path([(x, y), (x + 5, y + 3), (x + 12, y + 1)], ("bone", 7))
    ic.path([(x + 5, y + 3), (x + 5, y + 11)], ("bone", 3))
    spots = {
        "top": [(x + 6, y), (x + 3, y), (x + 9, y + 1)],
        "left": [(x + 2, y + 4), (x + 3, y + 8), (x + 1, y + 6)],
        "right": [(x + 7, y + 5), (x + 10, y + 7), (x + 8, y + 8)],
    }
    for face, count in zip(("top", "left", "right"), pips):
        ic.dots(spots[face][:count], ("ink", 1))


def trinket(rank: int) -> Icon:
    ic = Icon()
    glow: list[Pt] = []
    if rank == 1:  # a pair of knucklebone dice
        _die(ic, 3, 8, (1, 2, 3))
        _die(ic, 14, 16, (3, 1, 2))
        ic.dots([(9, 17), (10, 18)], ("bone", 3))  # a chipped corner
    elif rank == 2:  # a brass hourglass, the sand running
        ic.poly([(13, 7), (20, 7), (17, 15), (16, 15)], ("azure", 7))  # upper bulb
        ic.poly([(16, 17), (17, 17), (20, 25), (13, 25)], ("azure", 7))  # lower bulb
        ic.poly([(18, 7), (20, 7), (17, 15), (16.5, 13)], ("azure", 5))
        ic.poly([(17, 17), (20, 25), (18, 25), (16.5, 19)], ("azure", 5))
        ic.path([(13, 8), (15, 13)], ("light", 0))  # the glass catching the light
        ic.poly([(14, 10), (19, 10), (17, 14), (16, 14)], ("brass", 6))  # sand above
        ic.dots([(16, 15), (16, 16), (16, 18), (16, 20)], ("brass", 6))
        ic.poly([(13.5, 25), (19.5, 25), (16.5, 21)], ("brass", 6))  # the heap below
        ic.path([(13.5, 24), (16, 21)], ("brass", 7))
        for y0 in (4, 26):  # the two plates
            ic.rect(9, y0, 23, y0 + 2, ("brass", 4))
            ic.path([(9, y0), (23, y0)], ("brass", 6))
            ic.path([(9, y0 + 2), (23, y0 + 2)], ("brass", 2))
        ic.rect(10, 7, 11, 25, ("brass", 5))  # posts
        ic.rect(21, 7, 22, 25, ("brass", 3))
        ic.dots([(10, 11), (10, 16), (10, 21)], ("brass", 6))
    elif rank == 3:  # a gold hand-bell with a red ribbon
        ic.rect(15, 3, 17, 9, ("leather", 3))  # handle
        ic.path([(15, 3), (15, 9)], ("leather", 5))
        ic.rect(14, 1, 18, 2, ("brass", 5))
        ic.path([(14, 1), (18, 1)], ("brass", 7))
        ic.poly([(13, 11), (19, 11), (22, 18), (24, 25), (8, 25), (10, 18)], ("brass", 5))  # the bell
        ic.poly([(13, 11), (15, 11), (13, 18), (11, 25), (8, 25), (10, 18)], ("brass", 7))
        ic.poly([(18, 11), (19, 11), (22, 18), (24, 25), (20, 25), (20, 18)], ("brass", 3))
        ic.path([(10, 19), (22, 19)], ("brass", 3))  # an engraved band
        ic.path([(10, 20), (22, 20)], ("brass", 6))
        ic.rect(7, 25, 25, 27, ("brass", 6))  # the lip
        ic.path([(7, 25), (25, 25)], ("brass", 7))
        ic.path([(7, 27), (25, 27)], ("brass", 3))
        ic.rect(15, 28, 17, 30, ("brass", 4))  # clapper
        ic.put(15, 28, ("brass", 6))
        ic.poly([(12, 9), (20, 9), (20, 11), (12, 11)], ("crimson", 4))  # ribbon
        ic.path([(12, 9), (20, 9)], ("crimson", 6))
        ic.poly([(20, 10), (24, 13), (22, 15), (19, 11)], ("crimson", 3))
    elif rank == 4:  # an armillary sphere: a blue orb inside gold rings, on a stand
        for i, (x, y) in enumerate(ring(64, 16, 13, 10.5, 3.6)):  # the far half of the level ring
            if y < 13:
                ic.put(x, y, ("brass", 3))
        for x, y in ring(72, 16, 13, 10.5, 10.5):  # the upright ring
            ic.put(x, y, ("brass", 6) if x + y < 30 else ("brass", 4))
        for x, y in ring(72, 16, 13, 9.5, 9.5):
            ic.put(x, y, ("brass", 7) if x + y < 28 else ("brass", 3))
        stone(ic, 16, 13, 5.6, 5.6, "azure")
        for x, y in ring(64, 16, 13, 10.5, 3.6):  # the near half, over the orb
            if y >= 13:
                ic.put(x, y, ("brass", 7))
                ic.put(x, y + 1, ("brass", 4))
        ic.rect(4, 12, 6, 14, ("crimson", 5))  # jewels where the rings cross
        ic.rect(26, 12, 28, 14, ("crimson", 4))
        ic.put(4, 12, ("crimson", 7))
        ic.rect(15, 23, 17, 26, ("brass", 5))  # stem
        ic.path([(15, 23), (15, 26)], ("brass", 7))
        ic.poly([(10, 30), (22, 30), (20, 27), (12, 27)], ("brass", 4))  # foot
        ic.path([(12, 27), (20, 27)], ("brass", 6))
        ic.path([(10, 30), (22, 30)], ("brass", 2))
        glow = [(16, 0)]
    else:  # a fragment of the Rift hanging in the air inside its own orbit
        ic.poly([(16, 2), (22, 9), (21, 16), (24, 21), (17, 30), (11, 22), (13, 15), (9, 9)], ("ink", 4))
        ic.poly([(16, 2), (9, 9), (13, 15), (16, 12)], ("ink", 6))
        ic.poly([(13, 15), (11, 22), (17, 30), (16, 18)], ("ink", 5))
        ic.poly([(16, 2), (22, 9), (21, 16), (16, 12)], ("ink", 3))
        ic.poly([(21, 16), (24, 21), (17, 30), (16, 18)], ("ink", 2))
        ic.path([(16, 2), (9, 9), (13, 15), (11, 22)], ("violet", 6))  # its lit edge
        ic.path([(16, 5), (15, 11), (17, 17), (16, 26)], ("violet", 8))  # the fracture through it
        ic.path([(15, 11), (12, 13)], ("violet", 6))
        ic.path([(17, 17), (21, 20)], ("violet", 6))
        ic.poly([(5, 7), (8, 8), (6, 11)], ("ink", 4))  # two smaller pieces
        ic.poly([(25, 24), (28, 26), (26, 28)], ("ink", 3))
    ic.outline()
    if rank == 5:
        # The orbit: a tilted ring of light, behind the fragment on its far side and across it on the near side.
        phi = math.radians(-18.0)
        for i in range(96):
            t = math.tau * i / 96
            x = 16 + 14.0 * math.cos(t) * math.cos(phi) - 4.6 * math.sin(t) * math.sin(phi)
            y = 16 + 14.0 * math.cos(t) * math.sin(phi) + 4.6 * math.sin(t) * math.cos(phi)
            if math.sin(t) > 0:
                ic.px[(int(x), int(y))] = ("violet", 8)
            else:
                ic.soft(x, y, ("violet", 6))
        ic.px[(6, 8)] = ("violet", 7)
        ic.px[(26, 25)] = ("violet", 7)
    ic.glow(glow, ("light", 0))
    return ic


# -------------------------------------------------------------------------------------------- build
RINGS = ["Aro de hierro", "Sello de bronce", "Anillo de rubí", "Sortija de zafiro", "Anillo de la Grieta"]
AMULETS = ["Colmillo en cordel", "Medalla de bronce", "Guardapelo de oro", "Colgante solar", "Cristal enjaulado"]
TRINKETS = ["Dados de hueso", "Reloj de arena", "Campanilla de oro", "Esfera armilar", "Fragmento de la Grieta"]


def build() -> list[dict]:
    def group(key: str, title: str, note: str, fn, names: list[str]) -> dict:
        return {"key": key, "title": title, "note": note,
                "items": [(f"{key}_{r}", names[r - 1], framed(fn(r), RANK_TIER[r])) for r in range(1, 6)]}

    return [
        group("ring", "Anillos · cualquier clase", "Las joyas no tienen familia: las lleva cualquier héroe. El anillo es siempre un aro con su engaste arriba.", ring_icon, RINGS),
        group("amulet", "Amuletos · cualquier clase", "Siempre cuelgan de una cadena que entra por las esquinas de arriba.", amulet, AMULETS),
        group("trinket", "Abalorios · cualquier clase", "Un objeto distinto en cada categoría, apoyado en su base; el último flota.", trinket, TRINKETS),
    ]
