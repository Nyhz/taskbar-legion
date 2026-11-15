"""Item icons, 32×32, in the game's palette: `sh tools/assets/run.sh icons` → `out/icons/`.

Icons are built from flat polygons — every facet a tone chosen for how it faces the light (top-left) — with
hand-placed highlights, then outlined like the figures. No gradients, no sphere shading: the definition comes
from designed planes. Rarity is not redrawn: an item sits on a frame of its tier (`frame(tier)`, 36×36).

This first batch is the style test: the Knight's swords and the helmets in five ranks each (rank = how far into
the game the item is, from rough iron to a piece of the Rift), the six gems, the three chests and the nine frames.
"""
from __future__ import annotations

import json
import math
from contextlib import contextmanager
from pathlib import Path
from typing import Callable, Iterator, Sequence

from PIL import Image

from .rig import Cel, Pt, Tone

OUT = Path(__file__).resolve().parents[1] / "out" / "icons"
S = 32
#: The SMALL item icon: 22×22 on a 24×24 frame — two thirds of the 32-on-36 one. It is what every slot in the
#: game shows. It is not the big icon shrunk: the same drawing code runs with every coordinate scaled, so
#: polygons are rasterised afresh at 22 px and lines, dots and outlines stay one pixel wide.
SMALL = 22
SMALL_FRAME = 24

_scale = 1.0  # the scale an `Icon()` of the standard size is born with (see `at_scale`)


@contextmanager
def at_scale(k: float) -> Iterator[None]:
    """Icons created inside draw at `k` times their size. The icon functions never change: they keep writing
    coordinates on the 32-unit grid."""
    global _scale
    before, _scale = _scale, k
    try:
        yield
    finally:
        _scale = before


class Icon(Cel):
    """A square icon. The drawing code always works on the DESIGN grid (32 units for an item icon); `k` is how
    many pixels a design unit is. At k = 1 every method is exactly what it was before scale existed (the 32 px
    icons are byte-identical); at any other k the shapes are scaled and then rasterised:

    * polygons, rects and limbs are continuous shapes: their corners scale and the result is filled afresh;
    * points, dots, lines and paths name design PIXELS: each maps to the pixel under its centre, so a line stays
      one pixel wide;
    * `poly_mask` and `pixels` hand back the pixels of the REAL grid, expressed in design units, for code that
      shades pixel by pixel (`x + 0.5` is the pixel's centre on the design grid; `put(x, y)` lands on it exactly).
    """

    def __init__(self, size: int = S):
        k = _scale if size == S else 1.0
        n = int(round(size * k))
        super().__init__(n, n)
        self.k = k
        self._exact: dict[tuple[float, float], tuple[int, int]] = {}

    @property
    def small(self) -> bool:
        """True while drawing below the design size: branch on it where a detail has to be simplified."""
        return self.k != 1.0

    # -- design → pixel -------------------------------------------------------------------------------------
    def _pixel(self, x: float, y: float) -> tuple[int, int]:
        """The pixel a design pixel (or a point handed out by `poly_mask` / `pixels`) lands on."""
        hit = self._exact.get((x, y))
        if hit is not None:
            return hit
        return (int(math.floor((math.floor(x) + 0.5) * self.k)), int(math.floor((math.floor(y) + 0.5) * self.k)))

    def _grid(self, cells: Sequence[tuple[int, int]]) -> list[Pt]:
        out: list[Pt] = []
        for i, j in cells:
            d = ((i + 0.5) / self.k - 0.5, (j + 0.5) / self.k - 0.5)
            self._exact[d] = (i, j)
            out.append(d)
        return out

    # -- primitives -----------------------------------------------------------------------------------------
    def put(self, x: float, y: float, t: Tone) -> None:
        if self.k == 1.0:
            super().put(x, y, t)
        else:
            i, j = self._pixel(x, y)
            super().put(i, j, t)

    def soft(self, x: float, y: float, t: Tone) -> None:
        if self.k == 1.0:
            super().soft(x, y, t)
        else:
            i, j = self._pixel(x, y)
            if (i, j) not in self.px:
                super().put(i, j, t)

    def line(self, a: Pt, b: Pt, t: Tone) -> None:
        if self.k == 1.0:
            super().line(a, b, t)
            return
        (ax, ay), (bx, by) = self._pixel(*a), self._pixel(*b)
        dx, dy = abs(bx - ax), -abs(by - ay)
        sx, sy = (1 if ax < bx else -1), (1 if ay < by else -1)
        err = dx + dy
        while True:
            Cel.put(self, ax, ay, t)
            if ax == bx and ay == by:
                return
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                ax += sx
            if e2 <= dx:
                err += dx
                ay += sy

    def limb(self, a: Pt, b: Pt, w0: float, w1: float, ramp: str, idx: tuple[int, int, int], far: bool = False) -> None:
        if self.k == 1.0:
            super().limb(a, b, w0, w1, ramp, idx, far)
            return
        k = self.k
        # Drawn on a scratch cel in real pixels, then copied over (a stroke never thins below about one pixel).
        probe = Cel(self.w, self.h)
        probe.limb((a[0] * k, a[1] * k), (b[0] * k, b[1] * k), max(1.3, w0 * k), max(1.3, w1 * k), ramp, idx, far)
        for (i, j), tone in probe.px.items():
            Cel.put(self, i, j, tone)

    def poly_mask(self, pts: Sequence[Pt]) -> list:
        if self.k == 1.0:
            return super().poly_mask(pts)
        return self._grid(super().poly_mask([(x * self.k, y * self.k) for x, y in pts]))

    def pixels(self) -> list:
        """Every pixel of the icon, row by row, in design units: for code that decides each pixel with maths
        written on the design grid (`dx = x + 0.5 - cx`)."""
        cells = [(i, j) for j in range(self.h) for i in range(self.w)]
        return cells if self.k == 1.0 else self._grid(cells)

    def at(self, v: float) -> int:
        """The real pixel a design coordinate rounds to: with `cell`, for the few places where a SMALL icon has to
        be laid out on its own pixel grid (four fingers and the three gaps between them)."""
        return int(round(v * self.k))

    def cell(self, i: int, j: int, t: Tone) -> None:
        """Paint one REAL pixel (no scaling)."""
        Cel.put(self, i, j, t)

    def on(self, v: float, *cells: int) -> bool:
        """Is the coordinate `v` of a pixel from `poly_mask` / `pixels` on one of these design columns (or rows)?
        At full size it is `v in cells`; drawn smaller, the nearest real pixel answers yes, so a one-unit stripe
        never falls between two pixels."""
        reach = 0.5 / self.k
        return any(abs(v - c) < reach for c in cells)

    def poly(self, pts: Sequence[Pt], tone: Tone) -> None:
        if self.k == 1.0:
            for xy in self.poly_mask(list(pts)):
                self.put(xy[0], xy[1], tone)
            return
        for i, j in Cel.poly_mask(self, [(x * self.k, y * self.k) for x, y in pts]):
            Cel.put(self, i, j, tone)

    def rect(self, x0: float, y0: float, x1: float, y1: float, tone: Tone) -> None:
        if self.k == 1.0:
            for y in range(int(y0), int(y1) + 1):
                for x in range(int(x0), int(x1) + 1):
                    self.put(x, y, tone)
            return
        # Design pixels x0…x1 cover [x0, x1 + 1): the real pixels whose centre falls inside, and never fewer than one.
        k = self.k

        def span(lo: float, hi: float) -> range:
            first = int(math.ceil(int(lo) * k - 0.5))
            last = int(math.floor((int(hi) + 1) * k - 0.5 - 1e-9))
            return range(first, max(first, last) + 1)

        for j in span(y0, y1):
            for i in span(x0, x1):
                Cel.put(self, i, j, tone)

    def path(self, pts: Sequence[Pt], tone: Tone) -> None:
        for a, b in zip(pts, pts[1:]):
            self.line(a, b, tone)

    def dots(self, pts: Sequence[Pt], tone: Tone) -> None:
        for x, y in pts:
            self.put(x, y, tone)

    def glow(self, pts: Sequence[Pt], tone: Tone) -> None:
        """Light outside the object: painted only where nothing is drawn (call after `outline`)."""
        for x, y in pts:
            self.soft(x, y, tone)


def lit(ramp: str, normal: Pt, lo: int = 2, hi: int = 7) -> Tone:
    """Tone of a facet from where it faces: top-left is light."""
    n = math.hypot(*normal) or 1.0
    k = (-normal[0] * 0.6 - normal[1] * 0.8) / n  # +1 facing the light, −1 away
    return (ramp, int(round(lo + (hi - lo) * (k + 1) / 2)))


# ------------------------------------------------------------------------------------------ swords
def sword(rank: int) -> Icon:
    ic = Icon()
    d = (0.69, -0.724)  # along the blade, hilt bottom-left to tip top-right
    n = (-0.724, -0.69)  # across it, towards the light

    def at(base: Pt, along: float, across: float = 0.0) -> Pt:
        return (base[0] + d[0] * along + n[0] * across, base[1] + d[1] * along + n[1] * across)

    spec = {
        1: dict(blade=19.0, w=1.8, steel=("ink", 3, 5, 7), guard=("leather", 3), q=2.8, grip=("leather", 2), pommel=("ink", 4)),
        2: dict(blade=23.0, w=2.0, steel=("ink", 4, 6, 8), guard=("brass", 4), q=3.6, grip=("leather", 3), pommel=("brass", 4)),
        3: dict(blade=24.0, w=2.3, steel=("azure", 4, 6, 8), guard=("brass", 5), q=4.2, grip=("azure", 2), pommel=("crimson", 5)),
        4: dict(blade=25.0, w=2.8, steel=("ink", 5, 7, 9), guard=("brass", 6), q=4.8, grip=("ink", 2), pommel=("sea", 6)),
        5: dict(blade=25.0, w=2.8, steel=("violet", 3, 5, 7), guard=("ink", 4), q=4.6, grip=("ink", 3), pommel=("violet", 7)),
    }[rank]
    base = (8.5, 24.0)
    L, w = spec["blade"], spec["w"]
    ramp, dark, mid, light = spec["steel"]
    shoulder = L - 4.0
    # Blade: a lit half and a shadow half meeting on the ridge, tapering to the point.
    ic.poly([at(base, 0.5, w), at(base, shoulder, w * 0.85), at(base, L), at(base, 0.5)], (ramp, light))
    ic.poly([at(base, 0.5, -w), at(base, shoulder, -w * 0.85), at(base, L), at(base, 0.5)], (ramp, dark))
    ic.path([at(base, 1.0), at(base, L - 1.0)], (ramp, mid))
    if rank == 2:  # a fuller
        ic.path([at(base, 2.0, 0.6), at(base, shoulder - 2.0, 0.6)], (ramp, 5))
    if rank == 3:  # blued steel with a bright edge
        ic.path([at(base, 1.0, w), at(base, shoulder, w * 0.85)], ("azure", 8))
    if rank == 4:  # runes burning along the ridge
        for t in (4.0, 8.0, 12.0, 16.0):
            ic.dots([at(base, t, 0.2), at(base, t + 1.0, -0.4), at(base, t + 1.0, 0.8)], ("sea", 7))
        ic.path([at(base, 1.0, w), at(base, shoulder, w * 0.85)], ("light", 0))
    if rank == 5:  # a blade of crystal round a dark core, splintering along its edge
        ic.path([at(base, 1.0, w), at(base, shoulder, w * 0.85), at(base, L)], ("violet", 8))
        ic.poly([at(base, 2.0, 0.7), at(base, shoulder - 1.0, 0.6), at(base, shoulder - 1.0, -0.6), at(base, 2.0, -0.7)], ("ink", 1))
        ic.dots([at(base, 5.0), at(base, 9.5), at(base, 14.0), at(base, 18.0)], ("violet", 8))  # stars in the core
        for t in (6.0, 12.0, 17.5):  # shards breaking out of the edge
            ic.poly([at(base, t, w), at(base, t + 1.6, w + 2.6), at(base, t + 3.0, w)], ("violet", 6))
            ic.dots([at(base, t + 1.6, w + 2.0)], ("violet", 8))
    # Guard, grip, pommel.
    g_ramp, g_i = spec["guard"]
    q = spec["q"]
    ic.poly([at(base, -0.9, q), at(base, 0.9, q), at(base, 0.9, -q), at(base, -0.9, -q)], (g_ramp, g_i))
    ic.path([at(base, 0.9, q), at(base, 0.9, 0.0)], (g_ramp, min(g_i + 2, 7)))
    ic.path([at(base, -0.9, -q), at(base, -0.9, 0.0)], (g_ramp, max(g_i - 2, 0)))
    if rank >= 3:  # quillons turned towards the blade
        ic.dots([at(base, 1.9, q), at(base, 1.9, -q)], (g_ramp, g_i))
    if rank >= 4:
        ic.dots([at(base, 0.0, 0.0)], ("sea", 7) if rank == 4 else ("violet", 8))
    ic.poly([at(base, -1.2, 0.9), at(base, -6.0, 0.8), at(base, -6.0, -0.8), at(base, -1.2, -0.9)], spec["grip"])
    for t in (-2.4, -3.8, -5.2):  # wrapping
        ic.dots([at(base, t, 0.6)], (spec["grip"][0], spec["grip"][1] + 2))
    p_ramp, p_i = spec["pommel"]
    px, py = at(base, -7.2)
    for dx, dy in ((0, 0), (1, 0), (0, 1), (-1, 0), (0, -1)):
        ic.put(px + dx, py + dy, (p_ramp, p_i))
    ic.put(px - 1, py - 1, (p_ramp, min(p_i + 2, 7)))
    ic.outline()
    if rank == 4:
        ic.glow([at(base, L + 1.6)], ("sea", 7))  # one spark at the point, nothing floating round it
    if rank == 5:
        ic.glow([at(base, L + 1.8, 0.6)], ("violet", 8))
    return ic


# ----------------------------------------------------------------------------------------- helmets
# Armour comes in three FAMILIES, one per class: plate for the Knight, leather for the Ranger, cloth for the Priest
# (a rule change decided by the user, to be made in the sim after the art: armour becomes class-locked by family,
# and any family can roll any mitigation — armour, half and half, or magic resist). The families must not share
# silhouettes: plate is helms, leather is hats, hoods and pelts, cloth is head-dresses and never a hood.
def _cap(ic: Icon, ramp: str, lo: int, mid: int, hi: int) -> None:
    """A rounded skull-cap seen three-quarters: lit left, shadow right, a seam down the middle."""
    ic.poly([(8, 18), (8, 12), (11, 8), (16, 6), (21, 7), (24, 11), (24, 18)], (ramp, mid))
    ic.poly([(9, 12), (11, 8), (16, 6), (17, 8), (13, 10), (11, 14)], (ramp, hi))
    ic.poly([(20, 8), (24, 11), (24, 18), (20, 18)], (ramp, lo))


def _hood(ic: Icon, ramp: str, lo: int, mid: int, hi: int, face: Tone = ("ink", 0)) -> None:
    """A hood with its point falling back, the face a dark opening on the right."""
    ic.poly([(7, 25), (6, 14), (9, 8), (14, 5), (20, 5), (24, 9), (25, 15), (23, 18), (23, 26), (12, 27)], (ramp, mid))
    ic.poly([(6, 14), (9, 8), (14, 5), (15, 8), (11, 11), (9, 17)], (ramp, hi))
    ic.poly([(7, 25), (9, 17), (11, 22), (12, 27)], (ramp, lo))
    ic.poly([(15, 11), (22, 10), (24, 14), (23, 22), (17, 23), (14, 18)], face)  # the opening
    ic.path([(15, 11), (22, 10), (24, 14)], (ramp, hi))  # its lit rim
    ic.path([(14, 18), (17, 23), (23, 22)], (ramp, lo))


def helmet(family: str, rank: int) -> Icon:
    ic = Icon()
    glow: list[Pt] = []
    if family == "plate":
        if rank == 1:  # a dented iron pot
            _cap(ic, "ink", 3, 5, 6)
            ic.rect(7, 17, 25, 19, ("ink", 2))
            ic.dots([(10, 18), (16, 18), (22, 18)], ("ink", 6))
            ic.dots([(13, 11), (14, 12), (19, 10)], ("leather", 4))  # rust
            ic.path([(11, 13), (13, 15)], ("ink", 3))  # a dent
            ic.poly([(8, 20), (11, 20), (10, 24), (8, 23)], ("leather", 3))
            ic.poly([(22, 20), (25, 20), (24, 23), (22, 24)], ("leather", 2))
        elif rank == 2:  # iron skull-cap with a rim and a nasal
            _cap(ic, "ink", 4, 6, 8)
            ic.path([(16, 6), (16, 17)], ("ink", 4))
            ic.rect(7, 17, 25, 19, ("ink", 3))
            ic.dots([(9, 18), (13, 18), (17, 18), (21, 18), (24, 18)], ("ink", 8))
            ic.rect(18, 20, 19, 25, ("ink", 5))  # nasal
            ic.dots([(18, 20), (18, 21), (18, 22)], ("ink", 7))
            ic.poly([(8, 20), (11, 20), (10, 25), (8, 24)], ("ink", 4))  # cheek plates
            ic.poly([(22, 20), (25, 20), (24, 24), (22, 25)], ("ink", 3))
        elif rank == 3:  # steel great-helm with a plume
            ic.poly([(9, 8), (22, 8), (24, 11), (24, 24), (21, 27), (10, 27), (8, 24), (8, 11)], ("ink", 6))
            ic.poly([(9, 8), (16, 8), (16, 27), (10, 27), (8, 24), (8, 11)], ("ink", 7))
            ic.poly([(20, 9), (24, 11), (24, 24), (21, 27), (20, 27)], ("ink", 4))
            ic.path([(9, 9), (15, 9)], ("ink", 9))
            ic.rect(12, 14, 24, 15, ("ink", 0))  # sights
            ic.rect(18, 9, 19, 26, ("brass", 4))  # the cross on the face
            ic.rect(12, 16, 24, 16, ("brass", 4))
            ic.dots([(18, 9), (18, 12), (18, 18), (18, 22)], ("brass", 6))
            ic.dots([(21, 19), (23, 19), (21, 21), (23, 21), (22, 23)], ("ink", 1))  # breaths
            ic.poly([(12, 8), (9, 3), (14, 1), (19, 2), (21, 5), (17, 8)], ("crimson", 4))
            ic.poly([(12, 8), (9, 3), (14, 1), (15, 4), (13, 8)], ("crimson", 6))
            ic.path([(17, 3), (20, 5)], ("crimson", 2))
        elif rank == 4:  # a gilded closed helm with a T-shaped sight and a wing at each temple
            # The far wing, behind the crown: only its tip shows.
            ic.poly([(22, 9), (25, 1), (28, 2), (27, 6), (30, 5), (27, 11)], ("bone", 4))
            # The near wing first, so the helm overlaps its root: three tiers of feathers fanning up and back.
            ic.poly([(13, 17), (8, 14), (3, 13), (0, 8), (4, 9), (2, 3), (6, 6), (6, 0), (10, 4), (11, 0), (14, 6), (15, 12)], ("bone", 6))
            ic.poly([(13, 17), (9, 13), (6, 9), (9, 9), (9, 5), (12, 8), (14, 12)], ("bone", 7))  # coverts
            ic.path([(13, 16), (2, 9)], ("bone", 3))  # the gaps between the long feathers
            ic.path([(13, 14), (4, 4)], ("bone", 3))
            ic.path([(13, 12), (8, 1)], ("bone", 3))
            ic.path([(14, 11), (12, 1)], ("bone", 4))
            # The helm: a tall dome that comes down over the cheeks.
            ic.poly([(11, 27), (11, 14), (14, 9), (18, 7), (23, 9), (26, 14), (26, 27), (22, 29), (15, 29)], ("brass", 5))
            ic.poly([(11, 27), (11, 14), (14, 9), (18, 7), (18, 29), (15, 29)], ("brass", 6))
            ic.poly([(12, 14), (14, 9), (17, 8), (16, 12), (13, 16)], ("brass", 7))
            ic.poly([(23, 10), (26, 14), (26, 27), (22, 29), (23, 20)], ("brass", 3))
            ic.path([(18, 6), (18, 14)], ("brass", 7))  # the comb
            ic.rect(14, 16, 25, 17, ("ink", 0))  # the sight: a T cut in the face
            ic.rect(19, 16, 20, 27, ("ink", 0))
            ic.path([(14, 15), (25, 15)], ("brass", 7))
            ic.path([(11, 27), (15, 29), (22, 29), (26, 27)], ("brass", 3))  # rim
            ic.dots([(13, 25), (16, 27), (23, 26)], ("brass", 7))  # rivets
            ic.dots([(19, 12)], ("azure", 7))  # the jewel on the brow
            ic.dots([(18, 12), (20, 12), (19, 11), (19, 13)], ("azure", 5))
            ic.poly([(11, 15), (14, 15), (14, 18), (11, 18)], ("brass", 7))  # the boss the wing springs from
            ic.dots([(12, 16)], ("light", 0))
        else:  # a crown of the Rift: dark steel grown through with crystal
            ic.poly([(8, 20), (8, 13), (11, 9), (16, 8), (21, 9), (24, 13), (24, 20)], ("ink", 4))
            ic.poly([(9, 13), (11, 9), (16, 8), (16, 11), (12, 13), (11, 17)], ("ink", 6))
            ic.poly([(20, 10), (24, 13), (24, 20), (20, 20)], ("ink", 2))
            ic.poly([(8, 20), (24, 20), (24, 26), (20, 28), (11, 28), (8, 25)], ("ink", 4))
            ic.poly([(8, 20), (15, 20), (15, 28), (11, 28), (8, 25)], ("ink", 5))
            ic.poly([(20, 20), (24, 20), (24, 26), (20, 28)], ("ink", 2))
            ic.rect(8, 19, 24, 20, ("violet", 4))  # brow band
            ic.path([(8, 19), (24, 19)], ("violet", 6))
            ic.rect(12, 22, 24, 23, ("ink", 0))  # the sights, with the light behind them
            ic.rect(14, 22, 23, 22, ("violet", 8))
            ic.dots([(15, 23), (19, 23), (22, 23)], ("violet", 6))
            for x, h, tone in ((10, 6, 5), (14, 9, 6), (18, 7, 6), (22, 5, 5)):  # crystal spikes
                ic.poly([(x - 1.8, 10), (x + 1.8, 10), (x + 0.4, 10 - h)], ("violet", tone))
                ic.path([(x - 1.4, 10), (x + 0.2, 10 - h + 1)], ("violet", 8))
            ic.path([(11, 14), (13, 17), (12, 18)], ("violet", 7))  # cracks
            ic.path([(21, 13), (20, 16), (22, 18)], ("violet", 6))
    elif family == "leather":
        if rank == 1:  # padded leather cap with ear flaps
            _cap(ic, "leather", 3, 4, 6)
            ic.path([(16, 6), (16, 18)], ("leather", 2))
            ic.rect(7, 18, 25, 20, ("leather", 2))
            ic.dots([(9, 19), (12, 19), (15, 19), (18, 19), (21, 19), (24, 19)], ("bone", 5))
            ic.poly([(8, 21), (11, 21), (11, 26), (9, 26)], ("leather", 3))
            ic.poly([(21, 21), (24, 21), (23, 26), (21, 26)], ("leather", 2))
            ic.path([(10, 26), (15, 28), (22, 26)], ("leather", 5))  # chin strap
        elif rank == 2:  # a hunter's pointed hat with a long feather
            ic.poly([(8, 20), (10, 13), (15, 9), (21, 10), (24, 15), (24, 20)], ("moss", 4))  # crown
            ic.poly([(10, 13), (15, 9), (17, 11), (13, 14), (11, 19)], ("moss", 6))
            ic.poly([(21, 11), (24, 15), (24, 20), (21, 20)], ("moss", 2))
            ic.poly([(5, 22), (9, 20), (24, 20), (31, 23), (23, 25), (8, 25)], ("moss", 3))  # the brim, drawn out to a beak
            ic.path([(9, 20), (24, 20), (31, 23)], ("moss", 5))
            ic.poly([(5, 22), (9, 20), (8, 17), (5, 19)], ("moss", 5))  # turned up at the back
            ic.rect(9, 18, 24, 19, ("leather", 3))  # band
            ic.dots([(12, 18), (16, 18), (20, 18)], ("leather", 5))
            ic.poly([(11, 18), (3, 6), (5, 4), (9, 8), (14, 16)], ("crimson", 4))  # the feather
            ic.poly([(11, 18), (3, 6), (5, 6), (10, 13)], ("crimson", 6))
            ic.path([(12, 17), (4, 5)], ("crimson", 2))
        elif rank == 3:  # a scout's helm of boiled leather: brass comb and brow, laced cheek flaps, a neck curtain
            ic.poly([(8, 19), (8, 13), (11, 9), (16, 7), (21, 8), (24, 12), (24, 19)], ("leather", 3))
            ic.poly([(9, 13), (11, 9), (16, 7), (17, 9), (13, 11), (11, 15)], ("leather", 5))
            ic.poly([(20, 9), (24, 12), (24, 19), (20, 19)], ("leather", 2))
            ic.poly([(13, 8), (16, 4), (20, 5), (22, 9), (19, 8), (16, 7)], ("brass", 5))  # the comb along the crown
            ic.path([(13, 8), (16, 4), (20, 5)], ("brass", 7))
            ic.rect(7, 18, 25, 20, ("brass", 4))  # brow band
            ic.path([(7, 18), (25, 18)], ("brass", 6))
            ic.dots([(10, 19), (14, 19), (18, 19), (22, 19)], ("brass", 7))
            ic.poly([(5, 21), (9, 21), (9, 27), (6, 26)], ("leather", 2))  # neck curtain behind
            ic.poly([(9, 21), (13, 21), (14, 27), (10, 28)], ("leather", 4))  # near cheek flap
            ic.dots([(11, 23), (12, 25)], ("bone", 6))  # lacing
            ic.poly([(21, 21), (25, 21), (24, 26), (21, 27)], ("leather", 3))
            ic.rect(18, 21, 19, 24, ("brass", 5))  # a short nasal
            ic.poly([(16, 4), (14, 0), (18, 1)], ("crimson", 5))  # a tuft at the peak
        elif rank == 4:  # a wolf's pelt worn as a hood: ears, muzzle and fangs over the brow
            ic.poly([(7, 26), (6, 15), (9, 9), (15, 7), (21, 8), (24, 12), (24, 26), (12, 28)], ("ink", 5))
            ic.poly([(6, 15), (9, 9), (15, 7), (16, 10), (11, 12), (9, 18)], ("ink", 7))
            ic.poly([(7, 26), (9, 18), (11, 23), (12, 28)], ("ink", 3))
            ic.poly([(9, 9), (10, 2), (14, 7)], ("ink", 6))  # ears
            ic.poly([(17, 7), (20, 2), (22, 8)], ("ink", 4))
            ic.dots([(11, 5), (20, 5)], ("skin", 3))
            ic.poly([(16, 10), (24, 10), (29, 13), (28, 16), (17, 15)], ("ink", 6))  # the muzzle, jutting forward
            ic.path([(16, 10), (24, 10), (29, 13)], ("ink", 8))
            ic.dots([(28, 14), (29, 14)], ("ink", 0))  # nose
            ic.dots([(20, 12)], ("brass", 6))  # a dead eye
            for x in (19, 22, 25):  # fangs
                ic.path([(x, 16), (x, 18)], ("bone", 7))
            ic.poly([(15, 17), (23, 18), (23, 23), (17, 24), (14, 20)], ("ink", 0))  # the wearer's face in shadow
            ic.dots([(18, 20), (21, 20)], ("bone", 6))
            for x in (8, 11, 14, 17, 20, 23):  # ragged fur along the hem
                ic.path([(x, 26), (x + 1, 29)], ("ink", 4))
        else:  # a hood cut from the Rift, eyes burning inside
            _hood(ic, "ink", 1, 3, 5)
            ic.path([(6, 14), (9, 8), (14, 5), (20, 5), (24, 9), (25, 15)], ("violet", 6))  # a rim of light
            ic.dots([(18, 15), (19, 15), (22, 14)], ("violet", 8))  # eyes
            ic.dots([(18, 16), (22, 15)], ("violet", 5))
            for x, y, h in ((11, 7, 5), (16, 5, 6), (21, 6, 4)):  # crystal growing from the cloth
                ic.poly([(x - 1.4, y), (x + 1.4, y), (x + 0.3, y - h)], ("violet", 6))
                ic.path([(x - 1.0, y), (x + 0.2, y - h + 1)], ("violet", 8))
            ic.path([(9, 20), (11, 24)], ("violet", 6))
            glow = [(13, 0), (24, 3)]
    else:  # cloth: head-dresses, never hoods
        if rank == 1:  # a linen coif with a banded brow, tied under the chin
            _cap(ic, "bone", 4, 6, 7)
            ic.poly([(8, 18), (11, 18), (12, 26), (9, 27)], ("bone", 5))  # the sides come down
            ic.poly([(21, 18), (24, 18), (23, 27), (20, 26)], ("bone", 4))
            ic.rect(8, 16, 24, 17, ("sea", 4))  # the band
            ic.path([(8, 16), (24, 16)], ("sea", 6))
            ic.path([(11, 27), (15, 29), (21, 27)], ("bone", 5))  # the tie
            ic.dots([(15, 29), (16, 30), (14, 30)], ("bone", 6))
        elif rank == 2:  # an acolyte's square cap with its ridges and tuft
            ic.poly([(8, 22), (9, 12), (15, 9), (23, 11), (24, 22)], ("sea", 4))
            ic.poly([(9, 12), (15, 9), (15, 22), (8, 22)], ("sea", 6))
            ic.poly([(20, 10), (23, 11), (24, 22), (20, 22)], ("sea", 3))
            ic.path([(15, 9), (15, 22)], ("sea", 7))  # the ridges
            ic.path([(9, 12), (15, 9), (23, 11)], ("sea", 7))
            ic.path([(20, 10), (20, 22)], ("sea", 2))
            ic.rect(7, 21, 25, 23, ("brass", 4))  # the band
            ic.path([(7, 21), (25, 21)], ("brass", 6))
            ic.poly([(14, 9), (16, 9), (17, 5), (13, 5)], ("brass", 5))  # tuft
            ic.dots([(14, 5), (15, 4)], ("brass", 7))
            ic.poly([(9, 24), (12, 24), (11, 28), (9, 28)], ("bone", 5))  # a short veil behind
        elif rank == 3:  # a mitre
            ic.poly([(10, 23), (10, 13), (16, 3), (22, 13), (22, 23)], ("bone", 6))
            ic.poly([(10, 23), (10, 13), (16, 3), (16, 23)], ("bone", 7))
            ic.poly([(19, 8), (22, 13), (22, 23), (19, 23)], ("bone", 4))
            ic.rect(15, 6, 16, 22, ("brass", 5))  # orphrey
            ic.rect(11, 14, 21, 15, ("brass", 5))
            ic.dots([(15, 14), (16, 14), (15, 15), (16, 15)], ("crimson", 5))
            ic.rect(9, 22, 23, 24, ("brass", 4))  # the band
            ic.path([(9, 22), (23, 22)], ("brass", 6))
            ic.poly([(10, 25), (13, 25), (12, 30), (10, 30)], ("bone", 5))  # lappets
            ic.poly([(19, 25), (22, 25), (22, 30), (20, 30)], ("bone", 4))
            ic.dots([(11, 30), (21, 30)], ("brass", 5))
        elif rank == 4:  # a sun-crown: a diadem with an aureole of rays
            for i, ang in enumerate(range(-150, -29, 30)):  # five solid rays fanning from the brow, the middle one tallest
                r = (13.0, 16.0, 19.0, 16.0, 13.0)[i]
                a_ = math.radians(ang)
                tip = (16 + math.cos(a_) * r, 22 + math.sin(a_) * r)
                l_, r_ = math.radians(ang - 13), math.radians(ang + 13)
                left, right = (16 + math.cos(l_) * 6, 22 + math.sin(l_) * 6), (16 + math.cos(r_) * 6, 22 + math.sin(r_) * 6)
                ic.poly([left, tip, right, (16, 22)], ("brass", 6))
                ic.poly([left, tip, (16, 22)], ("brass", 7))  # the lit half of each ray
            ic.poly([(6, 27), (6, 21), (26, 21), (26, 27), (16, 29)], ("brass", 5))  # diadem, dipping to a point on the brow
            ic.poly([(6, 27), (6, 21), (15, 21), (15, 29)], ("brass", 6))
            ic.path([(6, 21), (26, 21)], ("brass", 7))
            ic.path([(6, 27), (16, 29), (26, 27)], ("brass", 3))
            ic.dots([(16, 24)], ("azure", 7))
            ic.dots([(15, 24), (17, 24), (16, 23), (16, 25)], ("azure", 5))
            ic.dots([(10, 24), (22, 24)], ("crimson", 5))
            glow = [(16, 1), (2, 14), (30, 14)]
        else:  # a crown of the Rift: a dark band under shards that float free of it
            ic.poly([(6, 28), (6, 22), (26, 22), (26, 28), (16, 30)], ("ink", 3))
            ic.poly([(6, 28), (6, 22), (15, 22), (15, 30)], ("ink", 5))
            ic.path([(6, 22), (26, 22)], ("violet", 7))
            ic.path([(6, 28), (16, 30), (26, 28)], ("ink", 1))
            ic.dots([(10, 25), (16, 26), (22, 25)], ("violet", 8))
            for x, base_y, h, tone in ((8, 19, 7, 5), (12, 18, 11, 6), (16, 17, 14, 7), (20, 18, 10, 6), (24, 19, 6, 5)):  # shards, hovering
                ic.poly([(x - 1.6, base_y), (x + 1.6, base_y), (x + 0.4, base_y - h)], ("violet", tone))
                ic.path([(x - 1.2, base_y), (x + 0.3, base_y - h + 1)], ("violet", 8))
            glow = [(4, 13), (28, 12), (12, 2)]
    ic.outline()
    ic.glow(glow, ("violet", 7) if rank == 5 else ("brass", 7))
    return ic


# -------------------------------------------------------------------------------------------- gems
def _ring(n: int, cx: float, cy: float, rx: float, ry: float, turn: float = 0.0) -> list[Pt]:
    return [(cx + rx * math.cos(turn + math.tau * i / n), cy + ry * math.sin(turn + math.tau * i / n)) for i in range(n)]


ring = _ring  # n points on an ellipse — public name for the icon sets


GEM_CUTS: dict[str, tuple[str, Callable[[], list[Pt]]]] = {
    # key → (ramp, outline of the cut); the table is the same shape, smaller.
    "ruby": ("crimson", lambda: _ring(8, 16, 16, 10.5, 10.5, math.pi / 8)),  # round brilliant
    "sapphire": ("azure", lambda: _ring(8, 16, 16, 9.0, 12.0, math.pi / 8)),  # oval
    "emerald": ("moss", lambda: [(9, 6), (23, 6), (26, 9), (26, 23), (23, 26), (9, 26), (6, 23), (6, 9)]),  # step cut
    "topaz": ("brass", lambda: [(16, 4), (27, 13), (22, 27), (10, 27), (5, 13)]),  # pentagon
    "amethyst": ("violet", lambda: _ring(6, 16, 16, 11.5, 11.5, math.pi / 6)),  # hexagon
    "diamond": ("ink", lambda: [(16, 4), (24, 10), (27, 16), (16, 28), (5, 16), (8, 10)]),  # kite
}


def gem(key: str) -> Icon:
    ic = Icon()
    ramp, cut = GEM_CUTS[key]
    outer = cut()
    cx = sum(p[0] for p in outer) / len(outer)
    cy = sum(p[1] for p in outer) / len(outer)
    k = 0.5 if key != "emerald" else 0.56
    inner = [(cx + (x - cx) * k, cy + (y - cy) * k) for x, y in outer]
    top = len(RAMP_LEN[ramp]) - 1
    low = 2 if key != "diamond" else 5
    for i in range(len(outer)):  # crown facets, each lit by where it faces
        a, b, c, d = outer[i], outer[(i + 1) % len(outer)], inner[(i + 1) % len(outer)], inner[i]
        mx, my = (a[0] + b[0]) / 2 - cx, (a[1] + b[1]) / 2 - cy
        ic.poly([a, b, c, d], lit(ramp, (mx, my), low, top - 1))
    for i in range(len(outer)):  # the edges between facets catch the light on the lit side, go dark on the other
        o, n_ = outer[i], inner[i]
        ic.path([o, n_], (ramp, top) if (o[0] - cx) * 0.6 + (o[1] - cy) * 0.8 < 0 else (ramp, low - 1))
    ic.poly(inner, (ramp, top - 2))  # the table
    ic.path(inner + [inner[0]], (ramp, top - 1))
    # Light inside the stone: a bright wedge across the table and a glint.
    ic.poly([inner[0], (cx, cy), inner[-1]] if key not in ("emerald",) else [inner[0], inner[1], (cx, cy)], (ramp, top - 1))
    ic.dots([(cx - 2, cy - 3), (cx - 3, cy - 2), (cx - 3, cy - 3)], ("light", 0))
    ic.dots([(cx - 1, cy - 3), (cx - 3, cy - 1)], (ramp, top))
    ic.dots([(cx + 3, cy + 3)], (ramp, top))  # a second, smaller spark
    if key == "emerald":  # the steps
        mid = [(cx + (x - cx) * 0.78, cy + (y - cy) * 0.78) for x, y in outer]
        ic.path(mid + [mid[0]], (ramp, 3))
    ic.outline()
    return ic


# ------------------------------------------------------------------------------------------ chests
def chest(kind: str) -> Icon:
    ic = Icon()
    if kind == "normal":  # planks and iron
        ic.poly([(5, 15), (27, 15), (27, 26), (5, 26)], ("leather", 4))
        ic.poly([(5, 15), (6, 10), (9, 8), (23, 8), (26, 10), (27, 15)], ("leather", 5))
        ic.path([(7, 10), (25, 10)], ("leather", 6))
        ic.path([(5, 15), (27, 15)], ("leather", 1))
        for y in (19, 23):
            ic.path([(5, y), (27, y)], ("leather", 3))
        ic.rect(5, 25, 27, 26, ("leather", 2))
        for x in (9, 22):  # iron bands
            ic.rect(x, 8, x + 1, 26, ("ink", 5))
            ic.dots([(x, 8), (x, 12), (x, 17), (x, 22)], ("ink", 8))
        ic.rect(15, 13, 17, 18, ("ink", 6))  # lock
        ic.dots([(16, 16), (16, 17)], ("ink", 1))
        ic.dots([(15, 13)], ("ink", 9))
    elif kind == "stageBoss":  # iron-bound, brass fittings
        ic.poly([(4, 15), (28, 15), (28, 27), (4, 27)], ("ink", 4))
        ic.poly([(4, 15), (5, 9), (9, 7), (23, 7), (27, 9), (28, 15)], ("ink", 6))
        ic.path([(6, 9), (26, 9)], ("ink", 8))
        ic.path([(4, 15), (28, 15)], ("ink", 0))
        ic.rect(4, 26, 28, 27, ("ink", 2))
        for x in (8, 23):
            ic.rect(x, 7, x + 1, 27, ("brass", 4))
            ic.dots([(x, 7), (x, 11), (x, 18), (x, 23)], ("brass", 6))
        for x0, y0 in ((4, 15), (26, 15), (4, 25), (26, 25)):  # corner plates
            ic.rect(x0, y0, x0 + 2, y0 + 2, ("brass", 5))
        ic.rect(14, 12, 18, 19, ("brass", 5))  # a heavy lock
        ic.rect(14, 12, 18, 12, ("brass", 7))
        ic.dots([(16, 15), (16, 16), (16, 17), (15, 15), (17, 15)], ("ink", 0))
        ic.dots([(11, 21), (13, 23), (19, 21), (21, 23)], ("ink", 7))  # studs
    else:  # the world boss's: lacquer and gold, light leaking from under the lid
        ic.poly([(4, 16), (28, 16), (28, 27), (4, 27)], ("crimson", 3))
        ic.poly([(4, 16), (5, 9), (9, 6), (23, 6), (27, 9), (28, 16)], ("brass", 5))
        ic.poly([(6, 10), (9, 7), (23, 7), (23, 9), (9, 9)], ("brass", 7))
        ic.rect(4, 15, 28, 16, ("light", 0))  # the seam, alight
        ic.rect(4, 26, 28, 27, ("crimson", 1))
        ic.rect(4, 17, 28, 17, ("brass", 6))
        for x in (7, 24):
            ic.rect(x, 6, x + 1, 27, ("brass", 6))
            ic.dots([(x + 1, 8), (x + 1, 12), (x + 1, 20), (x + 1, 24)], ("brass", 3))
        ic.poly([(11, 19), (21, 19), (19, 25), (13, 25)], ("crimson", 4))  # a panel
        ic.path([(11, 19), (21, 19), (19, 25), (13, 25), (11, 19)], ("brass", 5))
        ic.poly([(16, 9), (19, 12), (16, 15), (13, 12)], ("sea", 6))  # the jewel on the lid
        ic.poly([(16, 9), (16, 12), (13, 12)], ("sea", 8))
        ic.dots([(15, 11)], ("light", 0))
    ic.outline()
    if kind == "zoneBoss":
        ic.glow([(2, 15), (30, 15), (2, 16), (30, 16), (10, 3), (16, 2), (22, 3), (16, 3)], ("brass", 7))
    return ic


# ------------------------------------------------------------------------------------------ frames
#: Tier → (ramp, dark, bright). T8 is iridescent: its border runs through several ramps.
TIER_TONES = [("ink", 4, 6), ("moss", 3, 5), ("azure", 3, 5), ("violet", 4, 6), ("dusk", 6, 7), ("crimson", 3, 5), ("sea", 3, 6), ("brass", 5, 7), None]
TIER_NAMES = ["Normal", "Uncommon", "Rare", "Epic", "Legendary", "Mythic", "Ancestral", "Divine", "Primordial"]
IRIS = ["sea", "azure", "violet", "dusk", "brass", "moss"]


def frame(tier: int) -> Icon:
    """The slot an item sits in, 36×36: a dark plate and a border that says its rarity."""
    ic = Icon(36)
    ic.rect(1, 1, 34, 34, ("ink", 1))
    ic.rect(2, 2, 33, 33, ("ink", 2) if tier < 5 else ("ink", 1))
    ic.path([(2, 33), (33, 33), (33, 2)], ("ink", 0))  # inner shadow, bottom-right

    def tone(x: int, y: int, bright: bool) -> Tone:
        if tier == 8:
            ramp = IRIS[((x + y) // 6) % len(IRIS)]
            return (ramp, 7 if bright else 5)
        ramp, dark, hi = TIER_TONES[tier]
        return (ramp, hi if bright else dark)

    for i in range(36):
        for x, y in ((i, 0), (i, 35), (0, i), (35, i)):
            ic.put(x, y, tone(x, y, x == 0 or y == 0))  # lit on top and left
    if tier >= 2:  # a second line inside
        for i in range(1, 35):
            for x, y in ((i, 1), (i, 34), (1, i), (34, i)):
                ic.put(x, y, tone(x, y, False))
    if tier >= 4:  # studs in the corners
        for cx, cy in ((2, 2), (33, 2), (2, 33), (33, 33)):
            for dx, dy in ((0, 0), (1, 0), (0, 1), (-1, 0), (0, -1)):
                ic.put(cx + dx, cy + dy, tone(cx, cy, True))
    if tier >= 6:  # marks at the middle of each side
        for cx, cy in ((17, 1), (18, 1), (17, 34), (18, 34), (1, 17), (1, 18), (34, 17), (34, 18)):
            ic.put(cx, cy, tone(cx, cy, True))
        for cx, cy in ((17, 2), (18, 2), (17, 33), (18, 33), (2, 17), (2, 18), (33, 17), (33, 18)):
            ic.put(cx, cy, tone(cx, cy, False))
    if tier >= 7:  # the two highest: a glow inside the plate and heavy white-tipped corner brackets
        glow = ("brass", 2) if tier == 7 else ("violet", 2)
        for i in range(4, 32):
            for x, y in ((i, 3), (i, 32), (3, i), (32, i)):
                ic.put(x, y, glow)
        for cx, cy, sx, sy in ((0, 0, 1, 1), (35, 0, -1, 1), (0, 35, 1, -1), (35, 35, -1, -1)):
            for k in range(8):
                for t in range(2):
                    ic.put(cx + sx * k, cy + sy * t, tone(cx, cy, True))
                    ic.put(cx + sx * t, cy + sy * k, tone(cx, cy, True))
            ic.put(cx + sx * 2, cy + sy * 2, ("light", 0))
            ic.put(cx + sx * 3, cy + sy * 2, ("light", 0))
            ic.put(cx + sx * 2, cy + sy * 3, ("light", 0))
    return ic


def small_frame(tier: int) -> Icon:
    """The 24×24 slot of a small icon. Redrawn for its size, not the big frame shrunk; every tier keeps its
    sign: one line (T0–T1), a second line inside (from T2), a tick in each corner (from T4), a mark at the middle
    of each side (from T6), and for the two highest a glow inside the plate and white-tipped corner brackets."""
    n = SMALL_FRAME
    e = n - 1
    ic = Icon(n)
    ic.rect(1, 1, e - 1, e - 1, ("ink", 1))
    ic.rect(2, 2, e - 2, e - 2, ("ink", 2) if tier < 5 else ("ink", 1))
    ic.path([(2, e - 2), (e - 2, e - 2), (e - 2, 2)], ("ink", 0))  # inner shadow, bottom-right

    def tone(x: int, y: int, bright: bool) -> Tone:
        if tier == 8:
            ramp = IRIS[((x + y) // 4) % len(IRIS)]
            return (ramp, 7 if bright else 5)
        ramp, dark, hi = TIER_TONES[tier]
        return (ramp, hi if bright else dark)

    for i in range(n):
        for x, y in ((i, 0), (i, e), (0, i), (e, i)):
            ic.put(x, y, tone(x, y, x == 0 or y == 0))  # lit on top and left
    if tier >= 2:  # a second line inside
        for i in range(1, e):
            for x, y in ((i, 1), (i, e - 1), (1, i), (e - 1, i)):
                ic.put(x, y, tone(x, y, False))
    if tier >= 4:  # a tick in each corner
        for cx, cy, sx, sy in ((2, 2, 1, 1), (e - 2, 2, -1, 1), (2, e - 2, 1, -1), (e - 2, e - 2, -1, -1)):
            for dx, dy in ((0, 0), (sx, 0), (0, sy)):
                ic.put(cx + dx, cy + dy, tone(cx, cy, True))
    if tier >= 6:  # marks at the middle of each side
        m = n // 2
        for cx, cy in ((m - 1, 1), (m, 1), (m - 1, e - 1), (m, e - 1), (1, m - 1), (1, m), (e - 1, m - 1), (e - 1, m)):
            ic.put(cx, cy, tone(cx, cy, True))
        for cx, cy in ((m - 1, 2), (m, 2), (m - 1, e - 2), (m, e - 2), (2, m - 1), (2, m), (e - 2, m - 1), (e - 2, m)):
            ic.put(cx, cy, tone(cx, cy, False))
    if tier >= 7:  # the two highest: a glow inside the plate and white-tipped corner brackets
        glow = ("brass", 2) if tier == 7 else ("violet", 2)
        for i in range(4, e - 3):
            for x, y in ((i, 3), (i, e - 3), (3, i), (e - 3, i)):
                ic.put(x, y, glow)
        for cx, cy, sx, sy in ((0, 0, 1, 1), (e, 0, -1, 1), (0, e, 1, -1), (e, e, -1, -1)):
            for k in range(4):  # short arms: at this size longer ones would turn the whole border into a slab
                for t in range(2):
                    ic.put(cx + sx * k, cy + sy * t, tone(cx, cy, True))
                    ic.put(cx + sx * t, cy + sy * k, tone(cx, cy, True))
            ic.put(cx + sx * 2, cy + sy * 2, ("light", 0))
    return ic


#: A piece of the Rift keeps something of its family: plate stays cold dark steel, leather becomes dark hide and
#: cloth a plum-dark weave (ink tone → tone of the family's ramp). Without it the three rank-5 pieces of a slot are
#: the same dark-and-violet object in three shapes.
RIFT_BODY = {"leather": ("leather", [0, 0, 1, 2, 2, 3, 4, 5, 6, 7]), "cloth": ("dusk", [0, 0, 1, 2, 2, 3, 3, 4, 5, 6])}


def family_tint(icon: Icon, family: str, rank: int) -> Icon:
    """Applied to armour before framing: only rank 5 of leather and cloth changes."""
    if rank == 5 and family in RIFT_BODY:
        ramp, steps = RIFT_BODY[family]
        for xy, (r, i) in list(icon.px.items()):
            if r == "ink":
                icon.px[xy] = (ramp, steps[i])
    return icon


def framed(icon: Icon, tier: int) -> Image.Image:
    """The icon on the frame of a tier: 36×36 for a full-size icon (how the catalogue shows it), 24×24 for a small
    one. The bare icon rides along as `_raw` so `main` can also save it unframed (`raw_<stem>.png`, `sm_<stem>.png`):
    the game draws the frame of the item's own tier."""
    raw = icon.image()
    img = (small_frame(tier) if icon.small else frame(tier)).image()
    img.alpha_composite(raw, (1, 1) if icon.small else (2, 2))
    img._raw = raw  # type: ignore[attr-defined]
    return img


from .palette import RAMPS as RAMP_LEN  # noqa: E402 — ramp lengths for the gems

# ------------------------------------------------------------------------------------------- build
SWORDS = ["Espada de hierro", "Espada larga de acero", "Hoja de caballero", "Mandoble rúnico", "Filo de la Grieta"]
HELMETS = {
    "plate": ("Placa · Knight", ["Casco de hierro", "Capacete con nasal", "Gran yelmo de acero", "Yelmo alado dorado", "Corona de la Grieta"]),
    "leather": ("Cuero · Ranger", ["Gorro de cuero", "Sombrero de montero", "Casco de explorador", "Pellejo de lobo", "Capucha de la Grieta"]),
    "cloth": ("Tela · Priest", ["Cofia de lino", "Bonete de acólito", "Mitra", "Corona solar", "Corona de esquirlas"]),
}
GEMS_ES = {"ruby": "Rubí", "sapphire": "Zafiro", "emerald": "Esmeralda", "topaz": "Topacio", "amethyst": "Amatista", "diamond": "Diamante"}
CHESTS_ES = {"normal": "Cofre común", "stageBoss": "Cofre de jefe de etapa", "zoneBoss": "Cofre de jefe de mundo"}
#: The tier each rank is shown at in the "gear" groups (a rough iron sword is not Divine).
RANK_TIER = {1: 0, 2: 1, 3: 3, 4: 5, 7: 7, 5: 8}


def small_pass(sets: list[str]) -> None:
    """The item icons again, drawn SMALL (22×22): `sm_<stem>.png` for every item kind that has a `raw_<stem>.png`,
    the nine `smframe_<tier>.png`, and a contact sheet of all of them on their frames (`_sheet_small.png`). The
    stems are the full-size ones, so a slot swaps `raw_`/`frame_` for `sm_`/`smframe_` and nothing else."""
    import importlib
    import re

    rows: list[tuple[str, list[Image.Image]]] = []
    with at_scale(SMALL / S):
        def keep(key: str, items: list[tuple[str, Image.Image]]) -> None:
            shown = []
            for stem, img in items:
                raw = getattr(img, "_raw", None)
                if raw is None:
                    continue
                raw.save(OUT / f"sm_{stem}.png")
                shown.append(img)
            if shown:
                rows.append((key, shown))

        for fam in HELMETS:
            keep(f"helmets_{fam}", [(f"helmet_{fam}_{r}", framed(family_tint(helmet(fam, r), fam, r), RANK_TIER[r])) for r in range(1, 6)])
        for stem in sets:
            if not re.match(r"s[1-7]\d_", stem):  # the item sets; glyphs, chrome and scenes have one size
                continue
            mod = importlib.import_module(f".icon_sets.{stem}", __package__)
            for g in mod.build():
                keep(g["key"], [(n, img) for n, _label, img in g["items"]])
        keep("swords", [(f"sword_{r}", framed(sword(r), RANK_TIER[r])) for r in range(1, 6)])
        keep("gems", [(f"gem_{k}", framed(gem(k), 2)) for k in GEM_CUTS])
        keep("chests", [(f"chest_{k}", framed(chest(k), 0)) for k in CHESTS_ES])
    for t in range(9):
        small_frame(t).image().save(OUT / f"smframe_{t}.png")
    cell, zoom = SMALL_FRAME + 4, 4
    sheet = Image.new("RGBA", (max(len(r) for _k, r in rows) * cell + 4, len(rows) * cell + 4), (26, 22, 40, 255))
    for j, (_key, imgs) in enumerate(rows):
        for i, img in enumerate(imgs):
            sheet.alpha_composite(img, (4 + i * cell, 4 + j * cell))
    sheet.resize((sheet.width * zoom, sheet.height * zoom), Image.Resampling.NEAREST).save(OUT / "_sheet_small.png")
    print(f"small: {sum(len(r) for _k, r in rows)} icons at {SMALL} px → {OUT / '_sheet_small.png'}")


def main(only: list[str] | None = None) -> None:
    """`icons` builds everything and the manifest; `icons <set>` builds just that set of `icon_sets/` (its PNGs and
    a contact sheet `_sheet_<set>.png`) and leaves the manifest alone, so sets can be worked on side by side."""
    import importlib

    OUT.mkdir(parents=True, exist_ok=True)
    groups: list[dict] = []

    def save(name: str, img: Image.Image) -> str:
        img.save(OUT / f"{name}.png")
        raw = getattr(img, "_raw", None)
        if raw is not None:
            raw.save(OUT / f"raw_{name}.png")
        return f"{name}.png"

    def contact(name: str, gs: list[dict]) -> None:
        cell, scale = 40, 6
        cols = max(len(g["items"]) for g in gs)
        sheet = Image.new("RGBA", (cols * cell, len(gs) * cell), (26, 22, 40, 255))
        for row, g in enumerate(gs):
            for col, it in enumerate(g["items"]):
                im = Image.open(OUT / it["file"])
                sheet.alpha_composite(im, (col * cell + (cell - im.width) // 2, row * cell + (cell - im.height) // 2))
        sheet.resize((sheet.width * scale, sheet.height * scale), Image.Resampling.NEAREST).save(OUT / f"{name}.png")

    def from_set(stem: str) -> list[dict]:
        mod = importlib.import_module(f".icon_sets.{stem}", __package__)
        return [{"key": g["key"], "title": g["title"], "note": g["note"], "items": [{"file": save(n, img), "name": label} for n, label, img in g["items"]]}
                for g in mod.build()]

    sets = sorted(f.stem for f in (Path(__file__).parent / "icon_sets").glob("s*.py"))
    if only:
        for stem in only:
            gs = from_set(stem)
            contact(f"_sheet_{stem}", gs)
            print(f"{stem}: {sum(len(g['items']) for g in gs)} icons → {OUT / ('_sheet_' + stem + '.png')}")
        return

    for t in range(9):  # the bare frames too: the interface needs empty slots
        save(f"frame_{t}", frame(t).image())
    swords = [sword(r) for r in range(1, 6)]
    groups.append({"key": "tiers", "title": "Las nueve rarezas · el mismo objeto, otro marco", "note": "La rareza no se redibuja: la dice el marco. Primordial es iridiscente (en el juego, animado).",
                   "items": [{"file": save(f"tier_{t}", framed(swords[2], t)), "name": f"T{t} · {TIER_NAMES[t]}"} for t in range(9)]})
    for fam, (label, names) in HELMETS.items():
        groups.append({"key": f"helmets_{fam}", "title": f"Yelmos · {label}",
                       "note": "Cada clase viste su familia: placas el Knight, cuero el Ranger y tela la Priest. Dentro de cada familia la pieza puede ser de armadura, mixta o de resistencia mágica.",
                       "items": [{"file": save(f"helmet_{fam}_{r}", framed(family_tint(helmet(fam, r), fam, r), RANK_TIER[r])), "name": names[r - 1]} for r in range(1, 6)]})
    for stem in sets:  # the other sets, each in its own module; one that fails does not stop the rest
        try:
            groups += from_set(stem)
        except Exception as exc:  # noqa: BLE001
            print(f"!! set {stem} failed: {exc!r}")
    groups.append({"key": "swords", "title": "Espadas · Knight", "note": "Arma del Knight, en cinco categorías: de hierro tosco a una pieza de la Grieta.",
                   "items": [{"file": save(f"sword_{r}", framed(ic, RANK_TIER[r])), "name": SWORDS[r - 1]} for r, ic in enumerate(swords, 1)]})
    groups.append({"key": "gems", "title": "Gemas · una talla por tipo", "note": "Seis gemas con seis tallas distintas, para reconocerlas por la forma y no solo por el color.",
                   "items": [{"file": save(f"gem_{k}", framed(gem(k), 2)), "name": GEMS_ES[k]} for k in GEM_CUTS]})
    groups.append({"key": "chests", "title": "Cofres", "note": "Los tres tipos de cofre, del más común al del jefe de mundo.",
                   "items": [{"file": save(f"chest_{k}", framed(chest(k), 0)), "name": CHESTS_ES[k]} for k in CHESTS_ES]})
    small_pass(sets)
    (OUT / "manifest.json").write_text(json.dumps(groups, ensure_ascii=False, indent=1))
    contact("_sheet", [g for g in groups if g["key"] in ("tiers", "helmets_plate", "helmets_leather", "helmets_cloth", "swords", "gems", "chests")])
    print(f"wrote {OUT}: {sum(len(g['items']) for g in groups)} icons in {len(groups)} groups")
