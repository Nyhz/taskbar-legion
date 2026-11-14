"""World 10 backdrop — the Rift: what is left of the world, broken apart and hanging in the void — in every
difficulty grade.

Layers (back to front): sky (a starfield that surrounds everything, nebulae with colour in their hearts, a black
sun, the great fractures, a band of light where a horizon would be), far fragments (one piece of each of the nine
earlier worlds adrift on its scrap of ground: a windmill, an old tree, a stilt hut with its lamp still lit, a rock
arch, a monastery roof, a drowned column, a giant mushroom, a forge chimney, a marble dome), islands (shattered
ground in strata, crystal growths, dust pouring off the edges, three nearer relics), mist (star-dust and debris
streaming upwards towards the fractures), near islands (dark, hard-rimmed, the biggest crystals, standing
columns), ground (a causeway of carved slabs with gaps onto the stars, seams of light, and its underside hanging
in rags below) and foreground (faceted crystal and drifting rubble).

There is no sun that gives light, so depth is not far-pale/near-dark against daylight: the band is the light, and
everything in front of it gets darker and more sharply rimmed the nearer it is; forms are lit from the right and
from above. Violet is this world's own colour. Torment is the same place further gone, the last gate: the colour
drained to ink and bone, the sky itself broken like a pane round the black sun (hairline cracks, slipped panes
onto nothing or onto white), seven fractures white-hot, the relics split, more of everything missing.

Two things are arranged for the fight. The sky does not scroll, so its right side — where the great enemies
stand, the Unmaker with its own black sun above all — is kept an even veil with no fractures, lanes or bright
nebula hearts; the void stays black only over the party's side. And from y = 58 down to the causeway every
layer behind the fighters sinks into haze (`_haze`): a few close tones of the world's colour, lights lowered
and darks lifted the nearer the ground, so the wreckage stays as shapes and nothing bright or black sits behind
a figure. The weather (`ATMOSPHERE`) is run by the strip in real time.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import Callable

from PIL import Image

from ..backdrop import blank, dither_pick, periodic, put, stamp, vertical_gradient
from ..palette import RAMPS, Color, color, hex_of
from ..raster import Shape, circle, ellipse, polygon, rasterize, rect, rotate_shape
from .backdrop_w01 import H, PATH_Y, W, _shift

__all__ = ["W", "H", "PATH_Y", "LAYERS", "GRADES", "PREVIEW_BG", "ATMOSPHERE", "build"]

#: The tone creature previews of this world are shown on.
PREVIEW_BG: Color = color("violet", 2)

Tones = tuple[Color, Color, Color, Color]  # shadow, body, half-light, lit


@dataclass(frozen=True)
class Grade:
    key: str
    sky: list[Color]  # top of the frame down to the band
    under: list[Color]  # the band down to the bottom of the frame
    band_y: int
    stars: tuple[Color, Color, Color]
    nebulae: tuple[tuple[Color, Color, Color], ...]  # veil, body, heart — one triple per hue
    sun: tuple[Color, Color, Color, Color]  # halo, corona, ring, disc
    rift: tuple[Color, Color, Color, Color]  # glow, lip, core, spark
    rifts: tuple[tuple[float, float, float], ...]  # x, how far down, width
    far: Tones
    mid: Tones  # relics riding the islands
    isle: Tones
    near: Tones
    lamp: Color
    moss: Color
    ember: Color
    gold: Color
    glow: Color
    crystal: tuple[Color, Color, Color]  # body, lit facet, edge
    dust: tuple[Color, Color, Color]  # mote, bright mote, grit
    slab: tuple[Color, Color, Color, Color]  # dark, body, light, lit rim
    seam: tuple[Color, Color, Color]  # carved line, glow, hot
    fore: tuple[Color, Color, Color]  # body, lit facet, edge
    gaps: int
    broken: bool = False


def _c(r: str, i: int) -> Color:
    return color(r, i)


NORMAL = Grade(
    key="normal",
    sky=[_c("ink", 0), _c("violet", 1), _c("violet", 1), _c("violet", 1), _c("violet", 1), _c("violet", 2), _c("violet", 3), _c("violet", 4)],
    under=[_c("violet", 4), _c("violet", 3), _c("violet", 2), _c("violet", 1), _c("violet", 0), _c("ink", 0), _c("ink", 0)],
    band_y=110,
    stars=(_c("bone", 7), _c("azure", 7), _c("violet", 7)),
    nebulae=((_c("violet", 2), _c("azure", 2), _c("azure", 4)), (_c("violet", 2), _c("dusk", 3), _c("dusk", 5)), (_c("violet", 2), _c("violet", 3), _c("sea", 4))),
    sun=(_c("violet", 2), _c("violet", 5), _c("violet", 8), _c("ink", 0)),
    rift=(_c("violet", 6), _c("violet", 8), _c("ink", 0), _c("azure", 8)),
    rifts=((250.0, 62.0, 12.0), (392.0, 52.0, 8.0), (64.0, 48.0, 6.0)),
    far=(_c("violet", 2), _c("violet", 3), _c("violet", 4), _c("violet", 5)),
    mid=(_c("violet", 1), _c("violet", 2), _c("violet", 3), _c("violet", 5)),
    isle=(_c("violet", 0), _c("violet", 1), _c("violet", 3), _c("violet", 5)),
    near=(_c("ink", 0), _c("ink", 1), _c("violet", 2), _c("violet", 5)),
    lamp=_c("brass", 6),
    moss=_c("sea", 4),
    ember=_c("crimson", 5),
    gold=_c("brass", 5),
    glow=_c("sea", 6),
    crystal=(_c("violet", 4), _c("violet", 6), _c("violet", 8)),
    dust=(_c("violet", 7), _c("bone", 7), _c("violet", 4)),
    slab=(_c("ink", 1), _c("ink", 2), _c("ink", 3), _c("violet", 6)),
    seam=(_c("violet", 3), _c("violet", 6), _c("violet", 8)),
    fore=(_c("violet", 1), _c("violet", 3), _c("violet", 5)),
    gaps=5,
)

TORMENT = Grade(
    key="torment",
    sky=[_c("ink", 0), _c("ink", 2), _c("ink", 2), _c("ink", 2), _c("ink", 2), _c("ink", 3), _c("ink", 4), _c("ink", 5)],
    under=[_c("ink", 5), _c("ink", 4), _c("ink", 2), _c("ink", 1), _c("ink", 0), _c("ink", 0), _c("ink", 0)],
    band_y=110,
    stars=(_c("light", 0), _c("bone", 7), _c("bone", 5)),
    nebulae=((_c("ink", 3), _c("ink", 3), _c("ink", 4)),),
    sun=(_c("ink", 2), _c("bone", 5), _c("light", 0), _c("ink", 0)),
    rift=(_c("bone", 5), _c("light", 0), _c("bone", 7), _c("light", 0)),
    rifts=((250.0, 62.0, 17.0), (392.0, 58.0, 12.0), (64.0, 60.0, 10.0), (322.0, 46.0, 7.0), (196.0, 40.0, 5.0), (428.0, 34.0, 4.0), (18.0, 30.0, 4.0)),
    far=(_c("ink", 3), _c("ink", 4), _c("ink", 5), _c("ink", 7)),
    mid=(_c("ink", 2), _c("ink", 3), _c("ink", 4), _c("bone", 4)),
    isle=(_c("ink", 1), _c("ink", 2), _c("ink", 4), _c("bone", 4)),
    near=(_c("ink", 0), _c("ink", 1), _c("ink", 3), _c("bone", 5)),
    lamp=_c("bone", 6),
    moss=_c("ink", 6),
    ember=_c("bone", 6),
    gold=_c("bone", 6),
    glow=_c("bone", 7),
    crystal=(_c("bone", 4), _c("bone", 6), _c("light", 0)),
    dust=(_c("bone", 7), _c("light", 0), _c("ink", 5)),
    slab=(_c("ink", 0), _c("ink", 1), _c("ink", 2), _c("bone", 5)),
    seam=(_c("ink", 4), _c("bone", 6), _c("light", 0)),
    fore=(_c("ink", 2), _c("ink", 4), _c("bone", 5)),
    gaps=9,
    broken=True,
)

GRADES = {"normal": NORMAL, "torment": TORMENT}


# ------------------------------------------------------------------------------------- helpers
def _pts(shape: Shape) -> set[tuple[int, int]]:
    """The pixels of a shape on a layer, wrapped horizontally."""
    return {(x - W, y) for (x, y) in rasterize(_shift(shape, W), W * 3, H)}


def _chunk(x: float, y: float, w: float, rng: random.Random, depth: float = 0.7) -> Shape:
    """A piece of ground torn loose: flat on top, a jagged root of rock hanging under it."""
    pts = [(x - w / 2, y), (x + w / 2, y)]
    n = max(3, int(w / 5))
    for i in range(n, -1, -1):
        t = i / n
        hang = math.sin(math.pi * t) ** 0.7 * w * depth * rng.uniform(0.6, 1.1)
        pts.append((x - w / 2 + w * t + rng.uniform(-1.2, 1.2), y + 1.0 + hang))
    return polygon(pts)


def _rock(img: Image.Image, shape: Shape, tones: Tones, rng: random.Random, strata: int = 4) -> set[tuple[int, int]]:
    """Broken ground: a lit top, a worn surface under it, beds of rock in bands, a lit flank and a dark belly."""
    dark, body, half, lit = tones
    pts = _pts(shape)
    top: dict[int, int] = {}
    for (x, y) in pts:
        top[x] = min(top.get(x, y), y)
    ph = rng.randrange(strata)
    for (x, y) in pts:
        d = y - top[x]
        if d == 0:
            c = lit
        elif (x + 1, y) not in pts:
            c = half
        elif (x, y + 1) not in pts or (x - 1, y) not in pts:
            c = dark
        elif d == 1:
            c = half
        elif (d + ph + (x // 11) % 2) % strata == 0:
            c = dark
        else:
            c = body
        put(img, x, y, c)
    return pts


def _shards(img: Image.Image, x: float, base: float, size: float, tones: tuple[Color, Color, Color], rng: random.Random, n: int = 3) -> None:
    """A growth of crystal: leaning blades, each with a lit facet, a shaded facet and a bright edge."""
    body, lit, edge = tones
    for k in range(n):
        dx = (k - (n - 1) / 2) * size * 0.4 + rng.uniform(-0.6, 0.6)
        hh = size * (1.0 if k == n // 2 else rng.uniform(0.42, 0.78))
        lean = dx * 0.5 + rng.uniform(-1.0, 1.0)
        half = max(1.8, size * 0.19)
        shard = polygon([(x + dx - half, base), (x + dx + half, base), (x + dx + lean + 0.6, base - hh), (x + dx + lean - 0.6, base - hh + 1.0)])
        pts = _pts(shard)
        rows: dict[int, tuple[int, int]] = {}
        for (a, b) in pts:
            lo, hi = rows.get(b, (a, a))
            rows[b] = (min(lo, a), max(hi, a))
        for (a, b) in pts:
            lo, hi = rows[b]
            put(img, a, b, edge if a == lo and hi > lo else lit if a <= (lo + hi) / 2 else body)


def _fracture(img: Image.Image, rng: random.Random, x0: float, y_end: float, width: float, g: Grade) -> None:
    """A crack down the sky: a core (the void, or white heat), glowing lips, splinters branching off."""
    glow_c, lip, core_c, spark = g.rift
    xs, ys = [x0], [-2.0]
    while ys[-1] < y_end:
        ys.append(ys[-1] + rng.uniform(4, 8))
        xs.append(xs[-1] + rng.uniform(-5, 5))
    left, right = [], []
    for x, y in zip(xs, ys):
        w = max(0.6, width * max(0.0, 1 - y / (y_end + 4)) ** 1.3) * rng.uniform(0.75, 1.15)
        left.append((x - w, y))
        right.append((x + w * rng.uniform(0.6, 1.0), y))
    core = polygon(left + right[::-1])
    glow = polygon([(x - 2.4, y) for x, y in left] + [(x + 2.4, y) for x, y in right][::-1])
    px = img.load()
    for (a, b) in rasterize(glow, W, H):
        if dither_pick([(0, 0, 0), (1, 1, 1)], 0.6, a, b) == (1, 1, 1):
            px[a, b] = (*glow_c, 255)
    pts = rasterize(core, W, H)
    for (a, b) in pts:
        edge = any(n not in pts for n in ((a - 1, b), (a + 1, b), (a, b - 1)))
        px[a, b] = (*(lip if edge else core_c), 255)
    inner = sorted(p for p in pts if all(n in pts for n in ((p[0] - 1, p[1]), (p[0] + 1, p[1]))))
    for _ in range(int(width * 1.4)):
        if inner:
            a, b = rng.choice(inner)
            px[a, b] = (*spark, 255)
    for i in range(2, len(xs) - 2, 2):
        x_, y_ = (right[i] if i % 4 == 0 else left[i])
        side = 1 if i % 4 == 0 else -1
        length = rng.uniform(6, 6 + width)
        for (a, b) in rasterize(polygon([(x_, y_ - 1.2), (x_ + side * length, y_ + rng.uniform(-3, 4)), (x_, y_ + 1.2)]), W, H):
            px[a, b] = (*lip, 255)


# ------------------------------------------------------------------------------------- relics
class Tile:
    """A relic is drawn upright on a small tile in a few tones, then tilted and set adrift on a layer."""

    def __init__(self, w: int, h: int, cx: float, by: float, s: float, tones: Tones):
        self.img = blank(w, h)
        self.px = self.img.load()
        self.w, self.h, self.cx, self.by, self.s = w, h, cx, by, s
        self.sh, self.bd, self.md, self.lt = tones

    def P(self, x: float, y: float) -> tuple[float, float]:
        """Design units (x right, y UP from the ground the relic stands on) → tile pixels."""
        return (self.cx + x * self.s, self.by - y * self.s)

    def R(self, x0: float, y0: float, x1: float, y1: float) -> Shape:
        return rect(self.cx + x0 * self.s, self.by - y1 * self.s, self.cx + x1 * self.s, self.by - y0 * self.s)

    def poly(self, *pts: tuple[float, float]) -> Shape:
        return polygon([self.P(x, y) for x, y in pts])

    def disc(self, x: float, y: float, rx: float, ry: float | None = None) -> Shape:
        cx, cy = self.P(x, y)
        return ellipse(cx, cy, rx * self.s, (ry if ry is not None else rx) * self.s)

    def fill(self, shape: Shape, c: Color) -> None:
        for (x, y) in rasterize(shape, self.w, self.h):
            self.px[x, y] = (*c, 255)

    def form(self, shape: Shape, body: Color | None = None, lit: Color | None = None, dark: Color | None = None, half: Color | None = None) -> set[tuple[int, int]]:
        """A solid in light: lit on top and on the right, dark below and on the left, a band of half-light."""
        body, lit, dark = body or self.bd, lit or self.lt, dark or self.sh
        pts = rasterize(shape, self.w, self.h)
        for (x, y) in pts:
            if (x + 1, y) not in pts or (x, y - 1) not in pts:
                c = lit
            elif (x - 1, y) not in pts or (x, y + 1) not in pts:
                c = dark
            elif half is not None and (x + 2, y) not in pts:
                c = half
            else:
                c = body
            self.px[x, y] = (*c, 255)
        return pts

    def dot(self, x: float, y: float, c: Color) -> None:
        xi, yi = (int(v) for v in self.P(x, y))
        if 0 <= xi < self.w and 0 <= yi < self.h:
            self.px[xi, yi] = (*c, 255)

    def line(self, x0: float, y0: float, x1: float, y1: float, c: Color) -> None:
        (ax, ay), (bx, by) = self.P(x0, y0), self.P(x1, y1)
        n = int(max(abs(bx - ax), abs(by - ay))) + 1
        for i in range(n + 1):
            xi, yi = int(ax + (bx - ax) * i / n), int(ay + (by - ay) * i / n)
            if 0 <= xi < self.w and 0 <= yi < self.h:
                self.px[xi, yi] = (*c, 255)

    def ground(self, half_w: float, rng: random.Random, depth: float = 0.8) -> None:
        """The scrap of earth it stands on: turf line, beds of rock, a ragged belly, roots and rubble hanging."""
        n = max(3, int(half_w * 2 * self.s / 5))
        pts = [self.P(-half_w, 0), self.P(half_w, 0)]
        for i in range(n, -1, -1):
            t = i / n
            hang = math.sin(math.pi * t) ** 0.7 * half_w * 2 * depth * rng.uniform(0.6, 1.1)
            pts.append(self.P(-half_w + half_w * 2 * t + rng.uniform(-0.8, 0.8), -1.0 - hang))
        body = rasterize(polygon(pts), self.w, self.h)
        top: dict[int, int] = {}
        for (x, y) in body:
            top[x] = min(top.get(x, y), y)
        for (x, y) in body:
            d = y - top[x]
            c = self.lt if d == 0 else self.md if (x + 1, y) not in body or d == 1 else self.sh if (x, y + 1) not in body or (x - 1, y) not in body or d % 3 == 0 else self.bd
            self.px[x, y] = (*c, 255)
        low: dict[int, int] = {}
        for (x, y) in body:
            low[x] = max(low.get(x, y), y)
        for x in sorted(low):
            if rng.random() < 0.22:  # a root or a thread of rubble
                for k in range(1, rng.randint(2, int(3 + 4 * self.s))):
                    yy = low[x] + k
                    if yy < self.h:
                        self.px[x, yy] = (*(self.sh if k % 3 else self.bd), 255)


def _windmill(t: Tile, g: Grade, rng: random.Random) -> float:
    t.form(t.poly((-4, 0), (4, 0), (2.6, 17), (-2.6, 17)), half=t.md)
    t.form(t.poly((-3.9, 16.5), (3.9, 16.5), (0, 22.5)), body=t.md)
    t.fill(t.R(-1, 0, 1, 3.4), t.sh)
    t.dot(0.6, 10, t.sh)
    t.dot(-0.8, 13, t.sh)
    hx, hy = t.P(2.6, 17.6)
    for k in range(4):
        reach = 5.0 if k == 2 else 12.0  # one sail has snapped
        arm = rect(hx, hy - max(0.5, 0.4 * t.s), hx + reach * t.s, hy + max(0.5, 0.4 * t.s))
        sail = rect(hx + 3.2 * t.s, hy - 3.0 * t.s, hx + reach * t.s, hy - 0.4 * t.s)
        t.form(rotate_shape(sail, 28 + k * 90, hx, hy), body=t.md)
        t.fill(rotate_shape(arm, 28 + k * 90, hx, hy), t.lt)
    t.fill(circle(hx, hy, 1.2 * t.s), t.sh)
    return 7.0


def _tree(t: Tile, g: Grade, rng: random.Random) -> float:
    t.form(t.poly((-3.2, 0), (3.2, 0), (1.6, 5), (1.3, 12), (-1.3, 12), (-1.6, 5)), half=t.md)
    t.line(1.0, 8, 4.5, 11.5, t.bd)  # a bough
    for x, y, r in ((0, 16, 5.6), (-5, 13.2, 3.8), (5, 13.8, 4.0), (-2.4, 19.5, 3.4), (3.0, 19.0, 3.2)):
        t.form(t.disc(x, y, r), body=t.md, half=t.lt)
    for x, y in ((-4.5, 14.5), (1.5, 18.5), (4.2, 15.5), (-1.0, 21.0), (-6.4, 12.0)):  # moss still green in it
        t.dot(x, y, g.moss)
    for x in (-2.4, 2.6):  # roots gripping the edge
        t.line(x, 0.5, x * 1.9, -1.5, t.bd)
    return 6.5


def _hut(t: Tile, g: Grade, rng: random.Random) -> float:
    for x in (-5.5, -1.8, 1.8, 5.5):
        t.line(x, 0, x, 6, t.sh)
    t.line(-5.5, 0.5, 5.5, 5.5, t.sh)  # a brace
    t.fill(t.R(-7.5, 6, 7.5, 7.2), t.md)
    t.form(t.R(-6, 7.2, 6, 12.5), half=t.md)
    t.fill(t.R(-4.6, 7.2, -2.6, 11), t.sh)  # door
    t.fill(t.R(1.2, 9, 3.4, 11.2), g.lamp)  # the window still lit
    t.form(t.poly((-8.4, 12.3), (8.4, 12.3), (1.6, 19.5), (-1.6, 19.5)), body=t.md)
    for y in (14, 16, 18):
        t.line(-6.0 + (y - 12) * 0.8, y, 6.0 - (y - 12) * 0.8, y, t.bd)
    t.line(7.4, 12.3, 7.4, 9.6, t.sh)  # the lamp hanging from the eave
    t.dot(7.4, 9.0, g.lamp)
    t.dot(7.4, 8.2, g.lamp)
    for x in (-7.2, -6.8):  # ladder
        t.line(x, 0, x, 6, t.bd)
    return 9.0


def _arch(t: Tile, g: Grade, rng: random.Random) -> float:
    # A butte of bedded sandstone with a natural arch worn through one end: a mass with a window in it, wider
    # than it is tall, so that on its scrap of ground it cannot be taken for a ring.
    mesa = t.poly((-16, 0), (-15, 8), (-12.5, 9), (-12, 14.5), (-6, 15.5), (-5.4, 19), (3.5, 19), (4.4, 15.6), (10.5, 15), (13.5, 11.5), (16, 5), (16.6, 0))
    window = (t.disc(8.2, 4.5, 4.6, 5.4) | t.R(3.6, 0, 12.8, 4.5))
    pts = t.form(mesa - window, half=t.md)
    for (x, y) in pts:  # beds of sandstone
        yy = int((t.by - y) / t.s)
        if (yy + (x // 9) % 2) % 4 == 2 and (x + 1, y) in pts and (x - 1, y) in pts and (x, y - 1) in pts:
            t.px[x, y] = (*t.sh, 255)
    t.form(t.poly((-9.6, 15.2), (-7.4, 15.2), (-8.0, 21.5), (-9.2, 21.5)), body=t.md)  # a hoodoo on its shoulder
    t.form(t.R(-10.2, 21.5, -7.0, 23.0), body=t.md)
    return 18.0


def _pagoda(t: Tile, g: Grade, rng: random.Random) -> float:
    t.form(t.R(-6, 0, 6, 5.5), half=t.md)
    t.fill(t.R(-1.2, 0, 1.2, 3.6), t.sh)
    for x in (-4.2, 3.4):
        t.fill(t.R(x, 2.4, x + 1.2, 4.0), g.lamp)
    t.form(t.poly((-11.5, 6.6), (-10, 5.4), (10, 5.4), (11.5, 6.6), (6, 10.4), (-6, 10.4)), body=t.md)
    t.dot(-12, 7.4, t.lt)
    t.dot(12, 7.4, t.lt)
    t.form(t.R(-4.2, 10.4, 4.2, 13.6), half=t.md)
    t.form(t.poly((-8.5, 14.6), (-7.2, 13.5), (7.2, 13.5), (8.5, 14.6), (1.4, 19.5), (-1.4, 19.5)), body=t.md)
    t.dot(-9, 15.4, t.lt)
    t.dot(9, 15.4, t.lt)
    t.line(0, 19.5, 0, 23, g.gold)
    for y in (7.4, 15.6):  # snow still on the eaves
        t.line(-5 + (y > 10) * 2, y + 1.6, 5 - (y > 10) * 2, y + 1.6, t.lt)
    return 9.0


def _column(t: Tile, g: Grade, rng: random.Random) -> float:
    t.form(t.R(-4.4, 0, 4.4, 1.6), half=t.md)
    t.form(t.R(-3.4, 1.6, 3.4, 3.0), half=t.md)
    pts = t.form(t.poly((-2.6, 3), (2.6, 3), (2.4, 20), (0.6, 22.5), (-0.6, 19.6), (-2.4, 21)), half=t.md)
    for (x, y) in pts:  # flutes
        if (x - int(t.cx)) % 2 == 0 and (x + 1, y) in pts and (x - 1, y) in pts and (x, y - 1) in pts:
            t.px[x, y] = (*t.sh, 255)
    t.form(t.R(-3.6, 15, 3.6, 16.6), body=t.md)  # a band still on it
    for x0, n in ((-2.8, 7), (1.6, 5), (3.0, 9)):  # weed from the sea it stood in
        for k in range(n):
            t.dot(x0 + 0.7 * math.sin(k * 0.9), 15 - k, g.moss)
    # the drum that broke off, lying beside it
    t.form(t.R(5.4, 0, 9.4, 2.6), body=t.md)
    return 8.0


def _mushroom(t: Tile, g: Grade, rng: random.Random) -> float:
    t.form(t.poly((-2.2, 0), (2.2, 0), (1.4, 11), (-1.4, 11)), body=t.md, half=t.lt)
    cap = t.disc(0, 11, 10.5, 8.0) & t.R(-11, 11, 11, 20)
    t.form(cap, half=t.md)
    for x in range(-9, 10, 2):  # gills, still glowing
        t.dot(x, 10.6, g.glow)
        t.dot(x + 0.5, 9.8, t.sh)
    for x, y in ((-5, 14.5), (2.5, 16.5), (6, 13.5), (-1.5, 17.5)):
        t.dot(x, y, t.lt)
    t.form(t.poly((5.6, 0), (7.0, 0), (6.6, 4.6), (6.0, 4.6)), body=t.md)  # a small one beside it
    t.form(t.disc(6.3, 4.6, 3.4, 2.6) & t.R(2, 4.6, 11, 9), half=t.md)
    t.dot(5.0, 4.2, g.glow)
    t.dot(7.4, 4.2, g.glow)
    return 9.5


def _chimney(t: Tile, g: Grade, rng: random.Random) -> float:
    t.form(t.poly((-7, 0), (7, 0), (5.4, 8), (-5.4, 8)), half=t.md)  # the furnace foot
    t.fill(t.disc(0, 2.6, 2.6, 3.0) & t.R(-3, 0, 3, 6), g.ember)
    t.fill(t.R(-1.2, 0, 1.2, 2.4), g.lamp)
    pts = t.form(t.poly((-2.9, 8), (2.9, 8), (2.0, 25), (-2.0, 25)), half=t.md)
    for (x, y) in pts:  # iron bands
        if int((t.by - y) / t.s) % 5 == 0 and (x + 1, y) in pts:
            t.px[x, y] = (*t.sh, 255)
    t.form(t.R(-2.8, 25, 2.8, 26.4), body=t.md)
    for x, y, r in ((-1.5, 29.5, 2.4), (-4.4, 32.0, 3.0), (-8.0, 34.4, 2.4)):  # its last smoke, hanging where it was
        t.form(t.disc(x, y, r), body=t.sh, lit=t.bd, dark=t.sh)
    t.line(5.4, 8, 9.5, 3.0, t.sh)  # a chain
    return 9.5


def _dome(t: Tile, g: Grade, rng: random.Random) -> float:
    t.form(t.R(-10.5, 0, 10.5, 1.4), half=t.md)
    t.form(t.R(-9, 1.4, 9, 2.8), half=t.md)
    for x in (-7.5, -4.5, -1.5, 1.5, 4.5, 7.5):  # the colonnade of the drum
        t.fill(t.R(x - 0.6, 2.8, x + 0.6, 9.2), t.lt if x > 0 else t.bd)
    t.fill(t.R(-8.2, 2.8, -7.6, 9.2), t.sh)
    t.form(t.R(-9.4, 9.2, 9.4, 11.0), body=t.md)
    dome = t.disc(0, 11, 8.6, 9.0) & t.R(-9, 11, 9, 21)
    pts = t.form(dome, half=t.md)
    for (x, y) in pts:  # ribs
        if abs(x - int(t.cx)) % max(2, int(3 * t.s)) == 0 and (x + 1, y) in pts and (x, y - 1) in pts and (x - 1, y) in pts:
            t.px[x, y] = (*t.sh, 255)
    t.line(0, 20, 0, 24, g.gold)
    t.dot(0, 24.6, g.gold)
    t.fill(t.poly((3.5, 17.8), (8.6, 11), (6.2, 11), (4.8, 14)), t.sh)  # a bite out of it, dark inside
    return 11.5


RELICS: tuple[Callable[[Tile, Grade, random.Random], float], ...] = (_windmill, _tree, _hut, _arch, _pagoda, _column, _mushroom, _chimney, _dome)


def _adrift(img: Image.Image, kind: int, x: float, y: float, s: float, tilt: float, tones: Tones, g: Grade, rng: random.Random) -> None:
    """One relic on its scrap of ground, tilted, with crumbs coming away from it. In Torment it has split in two."""
    w, h = int(54 * s) + 8, int(66 * s) + 8
    t = Tile(w, h, w / 2, h * 0.62, s, tones)
    half = RELICS[kind](t, g, rng)
    t.ground(half, rng)
    tile = t.img
    if g.broken:
        # A crack runs up through it and the upper piece has drifted away from the lower.
        split = blank(w, h)
        sp, tp = split.load(), tile.load()
        cy, slope = t.by - 9.0 * s, rng.choice((-0.5, 0.5))
        for yy in range(h):
            for xx in range(w):
                c = tp[xx, yy]
                if c[3] == 0:
                    continue
                d = yy - (cy + (xx - t.cx) * slope + (xx % 3 - 1))
                if abs(d) < 0.8:
                    continue
                nx, ny = (xx + int(3 * s), yy - int(4 * s)) if d < 0 else (xx, yy)
                if 0 <= nx < w and 0 <= ny < h:
                    sp[nx, ny] = c
        tile = split
    tile = tile.rotate(-tilt, resample=Image.Resampling.NEAREST, expand=True)
    stamp(img, tile, int(x - tile.width / 2), int(y - tile.height * 0.62))
    for _ in range(int(3 + 3 * s)):
        cx, cy = x + rng.uniform(-half - 6, half + 6) * s, y + rng.uniform(2, 14) * s
        put(img, int(cx), int(cy), tones[1])
        if rng.random() < 0.4:
            put(img, int(cx) + 1, int(cy), tones[3])


# ------------------------------------------------------------------------------------- layers
def sky(g: Grade, rng: random.Random) -> Image.Image:
    """The void all round: stars above and below, nebulae, the black sun, the fractures, the band of light."""
    img = blank(W, H)
    # The void is black only at the very top; below it hangs a thin veil of gas, a step lighter — the field the
    # black sun (this world's, and the one the Unmaker carries) is a hole in — and it lightens towards the band.
    vertical_gradient(img, g.sky, 0, g.band_y, curve=1.2)
    vertical_gradient(img, g.under, g.band_y, H, curve=0.7)
    px = img.load()
    void, gas = g.sky[0], g.sky[1]
    edge = periodic(W, rng, [(1, 3.0), (3, 2.2), (8, 1.2)])
    for x in range(W):  # the veil's ragged upper edge: high on the right, where the great enemies stand, low on the left
        t = max(0.0, min(1.0, (x - 380) / 80))
        y0 = int((27 - 17 * t * t * (3 - 2 * t)) + edge(x) * (1.6 - 0.6 * t))
        for y in range(0, max(0, y0)):
            px[x, y] = (*void, 255)
        for y in range(max(0, y0), 22):
            if px[x, y][:3] == void:
                px[x, y] = (*gas, 255)
    # Lanes where the gas has torn and the void shows through — over the party's side of the sky only: the right
    # of the frame, where the great enemies stand, stays an even field.
    for _ in range(7):
        cx, cy, length = rng.uniform(10, 410), rng.uniform(16, 54), rng.uniform(36, 92)
        lane = ellipse(cx, cy, length / 2, rng.uniform(1.4, 3.4))
        for _ in range(2):
            lane = lane | ellipse(cx + rng.uniform(-length / 3, length / 3), cy + rng.uniform(-2.5, 2.5), length / 4, rng.uniform(1.0, 2.6))
        for (x, y) in _pts(lane):
            if 0 <= x < 436 and 0 <= y < 60:
                px[x, y] = (*void, 255)
    # Nebulae: long ragged banks of gas — a veil, a denser body inside it, and here and there a heart of
    # another colour, off-centre. Flat tones, no dither: the structure is in the shapes.
    for i in range(5):
        veil, body, heart = g.nebulae[i % len(g.nebulae)]
        cx, cy = i * W / 5 + rng.uniform(-30, 30) + 50, rng.uniform(12, 62)
        length = rng.uniform(70, 130)
        blobs = []
        for k in range(11):
            t = k / 10 - 0.5
            blobs.append((cx + t * length + rng.uniform(-6, 6), cy + math.sin(t * 5 + i) * 5 + rng.uniform(-3, 3), rng.uniform(9, 20) * (1.15 - abs(t)),
                          rng.uniform(3.0, 7.5) * (1.15 - abs(t))))
        hearts = rng.sample(range(2, 9), 3)
        for scale, tone, pick in ((1.0, veil, None), (0.62, body, None), (0.5, heart, hearts)):
            if (g.broken and pick is not None) or (cx > 420 and tone is not veil):
                continue  # no colour left in Torment; only the faint veil on the right of the frame
            for k, (bx, by, rx, ry) in enumerate(blobs):
                if pick is not None and k not in pick:
                    continue
                ox = rng.uniform(-3, 3) if pick is not None else 0.0
                for (x, y) in _pts(ellipse(bx + ox, by + (1.0 if pick is not None else 0.0), rx * scale, ry * scale)):
                    if 0 <= y < g.band_y - 14:
                        px[x % W, y] = (*tone, 255)
    # Stars everywhere, thinning out inside the band; a few with a cross of light.
    for _ in range(230):
        x, y = rng.randrange(W), rng.randrange(H)
        if abs(y - g.band_y) < 10 and rng.random() < 0.7:
            continue
        r = rng.random()
        px[x, y] = (*(g.stars[0] if r < 0.5 else g.stars[1] if r < 0.8 else g.stars[2]), 255)
    for _ in range(11 if not g.broken else 18):
        x, y = rng.randrange(4, W - 4), rng.randrange(4, 84)
        px[x, y] = (*g.stars[0], 255)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            px[x + dx, y + dy] = (*g.stars[1], 255)
    _black_sun(img, g, rng, 136, 40, 18)
    if g.broken:
        _shattered_sky(img, g, rng, 136, 40)
    for x0, y_end, width in g.rifts:
        _fracture(img, rng, x0, y_end, width, g)
    return img


def _shattered_sky(img: Image.Image, g: Grade, rng: random.Random, cx: int, cy: int) -> None:
    """Torment: the sky itself has broken like a pane round the black sun — hairline cracks running out from it,
    ring cracks between them, and a few panes of sky slipped out of place: holes onto nothing, or onto white."""
    px = img.load()
    hot, lip = g.rift[1], g.rift[0]
    angles = sorted(rng.uniform(0, math.tau) for _ in range(11))
    rays: list[list[tuple[float, float]]] = []
    for a in angles:
        x, y, d, line = float(cx), float(cy), 21.0, []
        reach = rng.uniform(70, 260)
        while d < reach:
            d += rng.uniform(5, 9)
            a += rng.uniform(-0.09, 0.09)
            x, y = cx + math.cos(a) * d * 1.25, cy + math.sin(a) * d * 0.8
            line.append((x, y))
        rays.append(line)

    def inside(x: float, y: float) -> bool:
        return 0 <= x < 438 and 1 <= y < 60

    def stroke(a_: tuple[float, float], b_: tuple[float, float], tone: Color, halo: bool) -> None:
        n = int(max(abs(b_[0] - a_[0]), abs(b_[1] - a_[1]))) + 1
        for k in range(n + 1):
            x, y = a_[0] + (b_[0] - a_[0]) * k / n, a_[1] + (b_[1] - a_[1]) * k / n
            if inside(x, y):
                px[int(x), int(y)] = (*tone, 255)
                if halo and inside(x + 1, y + 1) and px[int(x) + 1, int(y) + 1][:3] in (g.sky[0], g.sky[1]):
                    px[int(x) + 1, int(y) + 1] = (*g.sky[6], 255)

    # Slipped panes first (the cracks are drawn over their edges).
    for i in rng.sample(range(len(rays)), 5):
        r0, r1 = rays[i], rays[(i + 1) % len(rays)]
        k0, k1 = rng.randrange(1, max(2, min(len(r0), 6))), rng.randrange(1, max(2, min(len(r1), 6)))
        if k0 + 2 >= len(r0) or k1 + 2 >= len(r1):
            continue
        quad = polygon([r0[k0], r0[k0 + 2], r1[k1 + 2], r1[k1]])
        tone = g.rift[2] if rng.random() < 0.4 else g.sky[0]
        pts = rasterize(quad, W, H)
        if len(pts) > 520:
            continue
        for (x, y) in pts:
            if inside(x, y):
                px[x, y] = (*tone, 255)
    for line in rays:
        prev = (cx + (line[0][0] - cx) * 0.6, cy + (line[0][1] - cy) * 0.6)
        for pt in line:
            stroke(prev, pt, hot, True)
            prev = pt
    for ring, skip in ((2, 0), (5, 1)):  # ring cracks, broken
        for i in range(len(rays)):
            r0, r1 = rays[i], rays[(i + 1) % len(rays)]
            if (i + skip) % 3 and ring < len(r0) and ring < len(r1):
                stroke(r0[ring], r1[ring], lip, False)


def _black_sun(img: Image.Image, g: Grade, rng: random.Random, cx: int, cy: int, r: int) -> None:
    """The landmark of this world: a sun that gives no light — a black disc, a thin burning ring, a corona of
    spikes, and a spiral of dust falling into it. In Torment it has cracked across and its halves have slipped."""
    halo, corona, ring_c, disc = g.sun
    px = img.load()
    for (x, y) in rasterize(circle(cx, cy, r + 6), W, H):
        px[x, y] = (*halo, 255)
    for k in range(18):  # the corona: uneven spikes
        a = math.tau * k / 18 + rng.uniform(-0.08, 0.08)
        length = r + rng.choice((5, 7, 9, 13))
        for d in range(r, int(length)):
            x, y = int(cx + math.cos(a) * d), int(cy + math.sin(a) * d * 0.96)
            if 0 <= x < W and 0 <= y < H:
                px[x, y] = (*corona, 255)
    for (x, y) in rasterize(circle(cx, cy, r + 1.6), W, H):
        px[x, y] = (*corona, 255)
    for (x, y) in rasterize(circle(cx, cy, r + 0.6), W, H):
        px[x, y] = (*ring_c, 255)
    for (x, y) in rasterize(circle(cx, cy, r - 0.6), W, H):
        dy = 3 if g.broken and x > cx + (y - cy) * 0.4 else 0  # the far half has dropped
        if 0 <= y + dy < H:
            px[x, y + dy] = (*disc, 255)
    if g.broken:
        for d in range(-r - 4, r + 5):  # the crack: white heat showing through
            x, y = int(cx + d * 0.4 + (d % 3 - 1)), cy + d
            if 0 <= y < H:
                px[x, y] = (*ring_c, 255)
                px[x + 1, y] = (*corona, 255)
    # Dust spiralling in: an arc of motes that tightens towards the disc.
    for k in range(70):
        t = k / 70
        a = 0.6 + t * 4.4
        d = r + 30 - 26 * t
        x, y = int(cx + math.cos(a) * d * 1.5), int(cy + math.sin(a) * d * 0.55)
        if 0 <= x < W and 0 <= y < H and (k * 7) % 3:
            px[x, y] = (*(g.stars[2] if t < 0.6 else g.stars[0]), 255)


def fragments(g: Grade, rng: random.Random) -> Image.Image:
    """What the Rift took from the nine worlds before: one piece of each, small with distance, tilted, adrift."""
    img = blank(W, H)
    order = list(range(len(RELICS)))
    rng.shuffle(order)
    for i, kind in enumerate(order):
        # Spread across the sky at staggered heights, leaving the black sun its own piece of it.
        x = (30, 232, 300, 366, 424, 474, 528, 576, 68)[i] + rng.uniform(-6, 6)
        y = (72, 62, 40, 68, 46, 74, 38, 64, 92)[i] + rng.uniform(-3, 3)
        _adrift(img, kind, x, y, rng.uniform(0.9, 1.1), rng.uniform(-24, 24), g.far, g, rng)
    return img


def islands(g: Grade, rng: random.Random) -> Image.Image:
    """Shattered ground at middle distance: slabs of earth in strata with crystals on them and dust pouring off
    their edges, and three of the relics come nearer."""
    img = blank(W, H)
    mote = g.dust[2]
    for i, (kind, x, y) in enumerate(((3, 196.0, 88.0), (8, 392.0, 84.0), (0, 556.0, 86.0))):
        _adrift(img, kind, x + rng.uniform(-8, 8), y, 1.45, rng.uniform(-14, 14) * (-1 if i % 2 else 1), g.mid, g, rng)
    for i in range(7):
        x = i * W / 7 + rng.uniform(-22, 22) + 20
        y = rng.uniform(80, 103)
        w = rng.uniform(36, 76) * (0.7 if g.broken else 1.0)
        tilt = rng.uniform(-9, 9) * (2.0 if g.broken else 1.0)
        pts = _rock(img, rotate_shape(_chunk(x, y, w, rng, 0.45), tilt, x, y), g.isle, rng)
        slope = math.tan(math.radians(tilt))
        for _ in range(rng.randint(1, 2)):
            cx = x + rng.uniform(-w * 0.3, w * 0.3)
            _shards(img, cx, y + (cx - x) * slope + 0.5, rng.uniform(9, 16), g.crystal, rng, n=rng.choice((3, 3, 5)))
        # Dust and grit pouring off the low edge into the void.
        ex = x + (w / 2 - 3) * (1 if tilt > 0 else -1)
        ey = y + (ex - x) * slope
        for k in range(rng.randint(10, 24)):
            if k % 3 != 2:
                put(img, int(ex + math.sin(k * 0.5) * 1.2), int(ey + 2 + k), mote if k % 4 else g.isle[3])
        for _ in range(rng.randint(2, 5)):  # pieces that have come away
            rx, ry = x + rng.uniform(-w * 0.8, w * 0.8), y + rng.uniform(8, 26)
            _rock(img, rotate_shape(_chunk(rx, ry, rng.uniform(3, 9), rng, 0.6), rng.uniform(-30, 30), rx, ry), g.isle, rng, strata=3)
        del pts
    return img


def star_dust(g: Grade, rng: random.Random) -> Image.Image:
    """Dust of light and grit streaming up and away in lanes, towards the fractures."""
    img = blank(W, H)
    a, b, grit = g.dust
    for _ in range(7):
        x0, y0 = rng.uniform(0, W), rng.uniform(96, 116)
        length = rng.uniform(120, 220)
        rise = rng.uniform(34, 70)
        bend = periodic(W, rng, [(2, 2.4), (5, 1.2)])
        dens = rng.uniform(0.16, 0.3)
        for k in range(int(length)):
            t = k / length
            if rng.random() > dens * (1.0 - 0.5 * t):
                continue
            x = x0 + k
            y = y0 - rise * t ** 1.6 + bend(x) + rng.gauss(0, 1.0 + 2.0 * t)
            r = rng.random()
            put(img, int(x), int(y), b if r < 0.18 else a if r < 0.7 else grit)
            if r < 0.1:  # a mote with a tail, pointing along the stream
                put(img, int(x) - 1, int(y) + 1, a)
                put(img, int(x) - 2, int(y) + 1, grit)
    for _ in range(26):  # grit that is simply adrift
        x, y = rng.randrange(W), rng.randrange(30, 112)
        put(img, x, y, grit)
        if rng.random() < 0.5:
            put(img, x + 1, y, grit)
    return img


def near_islands(g: Grade, rng: random.Random) -> Image.Image:
    """The nearest wreckage: dark against the band of light, hard-rimmed, bedded rock with roots hanging from it,
    the biggest crystals and a few columns still standing."""
    img = blank(W, H)
    dark, body, half, rim = g.near
    for i in range(4):
        x = i * W / 4 + rng.uniform(-30, 30) + 60
        y = rng.uniform(98, 108)
        w = rng.uniform(74, 124) * (0.75 if g.broken else 1.0)
        tilt = rng.uniform(-5, 5) * (2.4 if g.broken else 1.0)
        slope = math.tan(math.radians(tilt))
        # A broken column or two still standing on it (drawn first: the ground hides their feet).
        for _ in range(rng.randint(1, 2)):
            cx = x + rng.uniform(-w * 0.32, w * 0.32)
            by = y + (cx - x) * slope + 1
            hh = rng.uniform(12, 26)
            col = polygon([(cx - 2.6, by), (cx + 2.6, by), (cx + 2.6, by - hh), (cx + 0.4, by - hh - 3.5), (cx - 0.8, by - hh + 1.0), (cx - 2.6, by - hh - 1.5)])
            cap = rect(cx - 3.8, by - hh * 0.62, cx + 3.8, by - hh * 0.62 + 1.6)
            pts = _pts(rotate_shape(col | cap, tilt + rng.uniform(-6, 6), cx, by))
            for (a_, b_) in pts:
                edge_r = (a_ + 1, b_) not in pts or (a_, b_ - 1) not in pts
                put(img, a_, b_, rim if edge_r else dark if (a_ - 1, b_) not in pts else half if (a_ + b_) % 2 == 0 and (a_ + 2, b_) not in pts else body)
        _rock(img, rotate_shape(_chunk(x, y, w, rng, 0.22), tilt, x, y), g.near, rng)
        for _ in range(rng.randint(1, 2)):
            cx = x + rng.uniform(-w * 0.35, w * 0.35)
            _shards(img, cx, y + (cx - x) * slope + 0.5, rng.uniform(15, 26), g.crystal, rng, n=rng.choice((3, 4, 5)))
        for _ in range(rng.randint(3, 6)):  # roots and threads of rubble hanging from its belly
            cx = x + rng.uniform(-w * 0.36, w * 0.36)
            y0 = int(y + (cx - x) * slope + w * 0.1)
            for k in range(rng.randint(5, 14)):
                put(img, int(cx + math.sin(k * 0.7) * 0.8), y0 + k, dark if k % 3 else half)
    for _ in range(16):
        rx, ry = rng.uniform(0, W), rng.uniform(58, 112)
        _rock(img, rotate_shape(_chunk(rx, ry, rng.uniform(3, 10), rng, 0.7), rng.uniform(-40, 40), rx, ry), g.near, rng, strata=3)
    return img


def ground(g: Grade, rng: random.Random) -> Image.Image:
    """The causeway: carved slabs of dark stone the party walks on, gaps onto the stars between them, seams of
    light; and its underside, hanging into the void in teeth, roots and fallen pieces."""
    img = blank(W, H)
    px = img.load()
    dark, body, light, rim = g.slab
    carve, glow, hot = g.seam
    path_top, path_bot = PATH_Y - 6, PATH_Y + 5
    # Cut the 600 px into slabs with a gap after each.
    cuts = sorted(rng.sample(range(30, W - 30, 22), g.gaps))
    gaps = [(c, c + rng.randint(5, 9) + (3 if g.broken else 0)) for c in cuts]
    in_gap = [any(a <= x < b for a, b in gaps) for x in range(W)]
    slab_of = [sum(1 for a, _b in gaps if a <= x) for x in range(W)]
    f = periodic(W, rng, [(3, 1.2), (7, 0.8), (13, 0.5)])
    fu = periodic(W, rng, [(2, 2.0), (5, 1.6), (11, 1.0)])
    offs = [rng.choice((-1, 0, 0, 1)) * (2 if g.broken else 1) for _ in range(g.gaps + 2)]
    tops, bots = [0] * W, [0] * W
    for x in range(W):
        if in_gap[x]:
            continue
        o = offs[slab_of[x] % len(offs)]
        top = int(round(111 + f(x))) + o
        bot = int(round(path_bot + 10 + fu(x))) + o * 2
        tops[x], bots[x] = top, bot
        for y in range(top, bot + 1):
            if y < path_top:
                c = rim if y == top else dither_pick([light, body], (y - top) / max(1, path_top - top), x, y)
            elif y <= path_bot:
                c = dither_pick([light, body, body, dark], (y - path_top) / (path_bot - path_top), x, y)
            else:
                c = light if y == path_bot + 1 else body if y < path_bot + 8 else dark
            px[x, y] = (*c, 255)
    # The face of each slab under the walking surface is carved: a running key between two ruled lines, and at
    # intervals a sigil whose lines still hold light.
    for x in range(W):
        if in_gap[x] or in_gap[(x - 2) % W] or in_gap[(x + 2) % W]:
            continue
        y0 = path_bot + 3
        k = x % 8
        for dy in (0, 4):
            px[x, y0 + dy] = (*carve, 255)
        if k in (0, 1, 2, 3):
            px[x, y0 + 2] = (*carve, 255)
        if k in (0, 3):
            px[x, y0 + 1 if k == 0 else y0 + 3] = (*carve, 255)
    for cx in range(26, W, 52):
        if all(not in_gap[(cx + d) % W] for d in range(-6, 7)):
            y0 = path_bot + 3
            for dx, dy in ((0, 0), (0, 1), (0, 2), (0, 3), (0, 4), (-1, 1), (-2, 2), (-1, 3), (1, 1), (2, 2), (1, 3), (-3, 0), (3, 0), (-3, 4), (3, 4)):
                px[(cx + dx) % W, y0 + dy] = (*(hot if dx == 0 and dy == 2 else glow), 255)
    # Joints between the flags of the walking surface: a hairline, lit on one side.
    for x in range(14, W, 30):
        jx = x + rng.randint(-3, 3)
        if 2 <= jx < W - 2 and not in_gap[jx] and not in_gap[jx - 2] and not in_gap[jx + 2]:
            for y in range(tops[jx] + 1, path_bot + 1):
                px[jx, y] = (*dark, 255)
                if y < path_top:
                    px[jx + 1, y] = (*light, 255)
    # The broken edges of every slab glow.
    for a, b in gaps:
        for ex in (a - 1, b):
            if 0 <= ex < W and not in_gap[ex]:
                for y in range(tops[ex], bots[ex] + 1):
                    px[ex, y] = (*(hot if path_top <= y <= path_bot else glow), 255)
    # Seams: hairline cracks of light running across a slab, few enough to leave the path calm.
    for _ in range(9 if not g.broken else 15):
        x = rng.randrange(8, W - 8)
        y = float(rng.randrange(path_top, path_bot))
        for _ in range(rng.randint(6, 14)):
            xi, yi = int(x), int(y)
            if 0 <= xi < W and not in_gap[xi] and tops[xi] <= yi <= bots[xi]:
                px[xi, yi] = (*glow, 255)
            x += 1
            y += rng.choice((-1, 0, 0, 0, 1)) * 0.8
    # Grit on the walking surface.
    for _ in range(60):
        x, y = rng.randrange(W), rng.randrange(path_top + 1, path_bot)
        if not in_gap[x]:
            px[x, y] = (*light, 255)
            if not in_gap[(x + 1) % W]:
                px[(x + 1) % W, y] = (*dark, 255)
    # Crystals have taken root along the far edge; rubble sits on it. They stand right behind the fighters' legs,
    # so they are drawn in the haze's own close tones, not as bright glass.
    family = "ink" if g.broken else "violet"
    dim = (color(family, 2), color(family, 3), color(family, 4))
    for _ in range(7):
        x = rng.randrange(W)
        if not in_gap[x] and not in_gap[(x + 5) % W] and not in_gap[(x - 5) % W]:
            _shards(img, x, tops[x] + 1, rng.uniform(7, 11), dim, rng)
    for _ in range(26):
        x = rng.randrange(W)
        if not in_gap[x]:
            for k in range(rng.randint(1, 3)):
                put(img, x + k, tops[x] - 1, body if k else light)
    # The underside: teeth of stone, lit on their right flank, hanging into the void…
    x = 0
    while x < W:
        if in_gap[x]:
            x += 1
            continue
        wide = rng.randint(4, 11)
        deep = rng.randint(3, 6) + (wide if rng.random() < 0.4 else 0)
        if all(not in_gap[(x + d) % W] for d in range(wide)):
            tip = x + wide * rng.uniform(0.3, 0.7)
            for d in range(wide):
                xx = x + d
                reach = deep * (1 - abs(xx - tip) / max(tip - x, x + wide - tip, 1.0))
                for k in range(1, int(reach) + 1):
                    yy = bots[xx % W] + k
                    if yy < H:
                        px[xx % W, yy] = (*(light if xx > tip and k < reach - 1 and d == wide - 1 else body if xx > tip else dark), 255)
        x += wide + rng.randint(0, 3)
    # …roots and chains of rubble with a crystal at the end…
    for _ in range(16 if not g.broken else 10):
        x = rng.randrange(W)
        if in_gap[x]:
            continue
        n = rng.randint(6, 18)
        for k in range(n):
            yy = bots[x] + 2 + k
            if yy < H - 1:
                px[(x + int(math.sin(k * 0.6) * 1.3)) % W, yy] = (*(dark if k % 3 else body), 255)
        yy = bots[x] + 2 + n
        if yy < H - 3:
            for dx, dy, c in ((0, 0, g.crystal[1]), (0, 1, g.crystal[2]), (-1, 0, g.crystal[0]), (0, 2, g.crystal[1])):
                px[(x + dx) % W, yy + dy] = (*c, 255)
    # …and pieces of it that have fallen away and hang there, some with a crystal growing down from them.
    for _ in range(12 if not g.broken else 20):
        rx, ry = rng.uniform(0, W), rng.uniform(path_bot + 20, H - 5)
        _rock(img, rotate_shape(_chunk(rx, ry, rng.uniform(5, 14), rng, 0.5), rng.uniform(-30, 30), rx, ry), (dark, body, light, rim), rng, strata=3)
    return img


def foreground(g: Grade, rng: random.Random) -> Image.Image:
    """Faceted crystal rising past the bottom of the frame and rubble drifting past the top: near, dark, rimmed."""
    img = blank(W, H)
    body, lit, edge = g.fore
    for _ in range(8):
        x = rng.uniform(0, W)
        base = H + 3
        for k in range(rng.randint(2, 4)):
            dx = (k - 1.2) * rng.uniform(4, 7)
            hh = rng.uniform(10, 24)
            blade = polygon([(x + dx - 4.5, base), (x + dx + 4.5, base), (x + dx + dx * 0.4 + 1.2, base - hh), (x + dx + dx * 0.4 - 1.2, base - hh + 2.0)])
            pts = _pts(blade)
            rows: dict[int, tuple[int, int]] = {}
            for (a, b) in pts:
                lo, hi = rows.get(b, (a, a))
                rows[b] = (min(lo, a), max(hi, a))
            for (a, b) in pts:
                lo, hi = rows[b]
                put(img, a, b, edge if (a == hi and hi > lo) or (a, b - 1) not in pts else lit if a >= (lo + hi) / 2 + 1 else body)
    for _ in range(9):
        x, y = rng.uniform(0, W), rng.uniform(2, 20)
        _rock(img, rotate_shape(_chunk(x, y, rng.uniform(5, 15), rng, 0.6), rng.uniform(-50, 50), x, y), (body, body, lit, edge), rng, strata=3)
    return img


LAYERS = (
    ("sky", sky, 0.0),
    ("fragments", fragments, 0.06),
    ("islands", islands, 0.16),
    ("mist", star_dust, 0.3),
    ("near", near_islands, 0.5),
    ("ground", ground, 1.0),
    ("fore", foreground, 1.35),
)


#: Every palette tone → its ramp and its place in it.
_RAMP_OF: dict[Color, tuple[str, int]] = {color(r, i): (r, i) for r, tones in RAMPS.items() for i in range(len(tones))}
#: The band the fighters stand in front of: from here down to the causeway the wreckage sinks into haze.
HAZE_TOP = 58


def _haze(img: Image.Image, g: Grade, y_end: int, full: bool = True) -> None:
    """Calms a layer where the fight happens. Everything behind the fighters is pulled into a few close tones of
    the world's own colour — the lights lower and the darks higher the nearer the ground — so wreckage and
    crystal stay there as shapes but nothing bright or black sits behind a figure. `full` False (the far
    relics) only lowers the lights and leaves their small lamps and embers alone."""
    family = "ink" if g.broken else "violet"
    px = img.load()
    for y in range(HAZE_TOP, y_end + 1):
        hi = 6 if y < 66 else 5 if y < 76 else 4
        lo = 0 if y < 70 or not full else 1 if y < 84 else 2
        for x in range(W):
            r, gg, b, a = px[x, y]
            if not a:
                continue
            ramp, i = _RAMP_OF[(r, gg, b)]
            if ramp == family or ramp == "ink":
                j = min(hi, max(lo, i))
            elif full:
                j = hi
            else:
                continue
            px[x, y] = (*color(family, j), 255)


def build(grade: str, seed: int = 1010) -> dict[str, Image.Image]:
    g = GRADES[grade]
    out: dict[str, Image.Image] = {}
    for i, (name, fn, _speed) in enumerate(LAYERS):
        out[name] = fn(g, random.Random(seed * 100 + i))
    _haze(out["fragments"], g, 116, full=False)
    for name in ("islands", "mist", "near"):
        _haze(out[name], g, 116)
    return out


#: The weather of the Rift (run in real time by the strip). Normal: star-dust drifting up and a slow breath of
#: violet. Torment, the loudest sky of the ten: the fractures strike white and shake the ground, the sky flickers
#: between strikes, dust and debris are torn upwards, eyes open in the void under the causeway and in the dark
#: of the sky, and now and then the light stutters.
ATMOSPHERE = {
    "normal": [
        {"fx": "particles", "count": 44, "color": [hex_of(color("violet", 7)), hex_of(color("bone", 7)), hex_of(color("violet", 5))],
         "vx": 5, "vy": -13, "sway": 2, "alpha": 0.55, "ymax": 126, "front": False},
        {"fx": "pulse", "color": hex_of(color("violet", 2)), "period": 5600, "alpha": 0.1},
    ],
    "torment": [
        {"fx": "lightning", "every": [2600, 6400], "flash": hex_of(color("bone", 7)), "alpha": 0.42,
         "bolt": hex_of(color("light", 0)), "x": [20, 430], "y": [0, 58], "shake": 2},
        {"fx": "lightning", "every": [1500, 4200], "flash": hex_of(color("ink", 7)), "alpha": 0.14},
        {"fx": "particles", "count": 54, "color": [hex_of(color("bone", 7)), hex_of(color("ink", 6)), hex_of(color("bone", 5))],
         "vx": 9, "vy": -92, "len": 3, "alpha": 0.5, "ymax": 126, "front": False},
        {"fx": "particles", "count": 14, "color": hex_of(color("bone", 6)), "vx": 12, "vy": -120, "len": 4, "alpha": 0.4, "ymax": 150},
        {"fx": "eyes", "every": [1400, 3800], "hold": 1300, "color": hex_of(color("violet", 8)),
         "zones": [[0, 136, 600, 152], [10, 14, 420, 52]], "max": 4, "size": 2, "gap": 4},
        {"fx": "flicker", "every": [5200, 11000], "dur": 260, "color": hex_of(color("ink", 0)), "alpha": 0.3},
    ],
}
