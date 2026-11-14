"""Shape rasteriser with materials, automatic ramp shading and outlines.

Sprites are described with float shapes (ellipses, capsules, polygons…) in design units and rasterised
at full resolution: one design unit is one pixel unless a canvas says otherwise, so a figure is a real
redraw at any size, never an upscale. Every pixel stores a material and a shade offset; materials
resolve to palette ramps at the end, which makes palette swaps (difficulty grades, elites) trivial.

Lighting: round parts use a Lambert estimate over their own volume ('form'), quantised into five
bands; flat parts use edge shading. Parts drawn over other parts get an inner line on their boundary.
The silhouette gets a selective outline (each edge takes the darkest tone of the material it borders)
and, optionally, a rim of light on its back edge in the colour of the scene's sky.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Callable, Iterable, Optional

from PIL import Image

from .palette import OUTLINE, Color, ramp

Point = tuple[float, float]


# --------------------------------------------------------------------------------------------
# Shapes: predicates over continuous coordinates, tested at pixel centres.
# --------------------------------------------------------------------------------------------


@dataclass(frozen=True)
class Shape:
    contains: Callable[[float, float], bool]
    bbox: tuple[float, float, float, float]  # x0, y0, x1, y1

    def __or__(self, other: "Shape") -> "Shape":
        a, b = self, other
        return Shape(
            lambda x, y: a.contains(x, y) or b.contains(x, y),
            (min(a.bbox[0], b.bbox[0]), min(a.bbox[1], b.bbox[1]), max(a.bbox[2], b.bbox[2]), max(a.bbox[3], b.bbox[3])),
        )

    def __sub__(self, other: "Shape") -> "Shape":
        a, b = self, other
        return Shape(lambda x, y: a.contains(x, y) and not b.contains(x, y), a.bbox)

    def __and__(self, other: "Shape") -> "Shape":
        a, b = self, other
        return Shape(lambda x, y: a.contains(x, y) and b.contains(x, y), a.bbox)


def ellipse(cx: float, cy: float, rx: float, ry: float) -> Shape:
    rx, ry = max(rx, 0.01), max(ry, 0.01)
    return Shape(lambda x, y: ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0, (cx - rx, cy - ry, cx + rx, cy + ry))


def circle(cx: float, cy: float, r: float) -> Shape:
    return ellipse(cx, cy, r, r)


def rect(x0: float, y0: float, x1: float, y1: float) -> Shape:
    return Shape(lambda x, y: x0 <= x <= x1 and y0 <= y <= y1, (x0, y0, x1, y1))


def capsule(x0: float, y0: float, x1: float, y1: float, r: float, r1: Optional[float] = None) -> Shape:
    """A segment with round ends; `r1` tapers it towards the second end (limbs)."""
    r_end = r if r1 is None else r1
    dx, dy = x1 - x0, y1 - y0
    length2 = dx * dx + dy * dy or 1e-9

    def inside(x: float, y: float) -> bool:
        t = max(0.0, min(1.0, ((x - x0) * dx + (y - y0) * dy) / length2))
        px, py = x0 + t * dx, y0 + t * dy
        rr = r + (r_end - r) * t
        return (x - px) ** 2 + (y - py) ** 2 <= rr * rr

    m = max(r, r_end)
    return Shape(inside, (min(x0, x1) - m, min(y0, y1) - m, max(x0, x1) + m, max(y0, y1) + m))


def polygon(points: list[Point]) -> Shape:
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]

    def inside(x: float, y: float) -> bool:
        c = False
        j = len(points) - 1
        for i in range(len(points)):
            xi, yi = points[i]
            xj, yj = points[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                c = not c
            j = i
        return c

    return Shape(inside, (min(xs), min(ys), max(xs), max(ys)))


def ring(cx: float, cy: float, r_outer: float, r_inner: float) -> Shape:
    return circle(cx, cy, r_outer) - circle(cx, cy, r_inner)


def arc_band(cx: float, cy: float, r_outer: float, r_inner: float, a0: float, a1: float) -> Shape:
    """Ring sector from a0 clockwise to a1, in degrees (0° = right, screen coordinates)."""

    def inside(x: float, y: float) -> bool:
        d = math.hypot(x - cx, y - cy)
        if d < r_inner or d > r_outer:
            return False
        a = math.degrees(math.atan2(y - cy, x - cx)) % 360
        lo, hi = a0 % 360, a1 % 360
        return lo <= a <= hi if lo <= hi else (a >= lo or a <= hi)

    return Shape(inside, (cx - r_outer, cy - r_outer, cx + r_outer, cy + r_outer))


def rotate_shape(shape: Shape, degrees: float, cx: float, cy: float) -> Shape:
    """The shape turned by `degrees` (clockwise on screen) around (cx, cy)."""
    a = math.radians(degrees)
    ca, sa = math.cos(a), math.sin(a)
    x0, y0, x1, y1 = shape.bbox
    corners = [((x - cx) * ca - (y - cy) * sa + cx, (x - cx) * sa + (y - cy) * ca + cy) for x, y in ((x0, y0), (x1, y0), (x0, y1), (x1, y1))]
    return Shape(
        lambda x, y: shape.contains((x - cx) * ca + (y - cy) * sa + cx, -(x - cx) * sa + (y - cy) * ca + cy),
        (min(c[0] for c in corners), min(c[1] for c in corners), max(c[0] for c in corners), max(c[1] for c in corners)),
    )


def transform(shape: Shape, scale: float, ox: float, oy: float) -> Shape:
    """Maps design units to pixels: p_px = p * scale + (ox, oy)."""
    x0, y0, x1, y1 = shape.bbox
    return Shape(
        lambda x, y: shape.contains((x - ox) / scale, (y - oy) / scale),
        (x0 * scale + ox, y0 * scale + oy, x1 * scale + ox, y1 * scale + oy),
    )


# --------------------------------------------------------------------------------------------
# Material canvas.
# --------------------------------------------------------------------------------------------

#: Materials resolve to (ramp name, base index). Palettes (grades, elites) override the mapping.
MaterialMap = dict[str, tuple[str, int]]

LINE = -100  # offset marker: inner line (second darkest of the ramp)
DEEP = -99  # offset marker: darkest of the ramp

#: Light for the 'form' model: from above, slightly in front of the figure and towards the viewer.
#: Figures face right and the client mirrors enemies, so the light always falls on the face side.
FORM_LIGHT = (0.38, -0.62, 0.69)

#: Lambert thresholds of the five shading bands (+2 … −2).
BANDS = (0.9, 0.66, 0.3, -0.02)


@dataclass
class Pixel:
    material: str
    offset: int
    part: int


@dataclass
class Canvas:
    width: int
    height: int
    scale: float = 1.0
    ox: float = 0.0
    oy: float = 0.0
    pixels: dict[tuple[int, int], Pixel] = field(default_factory=dict)
    #: Parts painted after the outline (sparks, glints): they get no border.
    late: dict[tuple[int, int], Pixel] = field(default_factory=dict)
    _parts: int = 0
    #: Whole-figure rotation in design units (degrees, pivot): a falling body is drawn turned and
    #: rasterised clean, never rotated as a bitmap.
    rot: float = 0.0
    rot_c: tuple[float, float] = (0.0, 0.0)
    form_light: tuple[float, float, float] = FORM_LIGHT

    def _raster(self, shape: Shape) -> set[tuple[int, int]]:
        if self.rot:
            shape = rotate_shape(shape, self.rot, *self.rot_c)
        s = transform(shape, self.scale, self.ox, self.oy)
        x0, y0, x1, y1 = s.bbox
        out: set[tuple[int, int]] = set()
        for y in range(max(0, int(math.floor(y0)) - 1), min(self.height, int(math.ceil(y1)) + 2)):
            for x in range(max(0, int(math.floor(x0)) - 1), min(self.width, int(math.ceil(x1)) + 2)):
                if s.contains(x + 0.5, y + 0.5):
                    out.add((x, y))
        return out

    def draw(
        self,
        shape: Shape,
        material: str,
        offset: int = 0,
        shading: str = "sphere",
        inner_line: bool = True,
        light: float = 1.0,
    ) -> set[tuple[int, int]]:
        """Paints a part. `shading`: 'sphere', 'cyl' (vertical cylinder), 'hcyl' (horizontal), 'edge'
        or 'flat'. `light` scales how strongly the part catches light (matte cloth < polished steel)."""
        mask = self._raster(shape)
        if not mask:
            return mask
        self._parts += 1
        part = self._parts
        xs = [p[0] for p in mask]
        ys = [p[1] for p in mask]
        bx0, bx1, by0, by1 = min(xs), max(xs), min(ys), max(ys)
        w = max(1.0, bx1 - bx0 + 1)
        h = max(1.0, by1 - by0 + 1)
        L = self.form_light
        for (x, y) in mask:
            off = offset
            if shading in ("sphere", "cyl", "hcyl"):
                nx = ((x + 0.5 - bx0) / w) * 2 - 1
                ny = ((y + 0.5 - by0) / h) * 2 - 1
                if shading == "sphere":
                    n = (nx, ny, math.sqrt(max(0.0, 1.0 - min(1.0, nx * nx + ny * ny))))
                elif shading == "cyl":
                    n = (nx, ny * 0.3, math.sqrt(max(0.0, 1.0 - nx * nx)))
                else:
                    n = (nx * 0.3, ny, math.sqrt(max(0.0, 1.0 - ny * ny)))
                d = (n[0] * L[0] + n[1] * L[1] + n[2] * L[2]) * light
                if d > BANDS[0]:
                    off += 2
                elif d > BANDS[1]:
                    off += 1
                elif d > BANDS[2]:
                    pass
                elif d > BANDS[3]:
                    off -= 1
                else:
                    off -= 2
            elif shading == "edge":
                up = (x, y - 1) in mask
                left = (x - 1, y) in mask
                down = (x, y + 1) in mask
                right = (x + 1, y) in mask
                if not up:
                    off += 1
                elif not down or not left:
                    off -= 1
            px_ = Pixel(material, off, part)
            if inner_line:
                for n2 in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if n2 in mask:
                        continue
                    other = self.pixels.get(n2)
                    if other is not None and other.part != part:
                        px_ = Pixel(material, LINE, part)
                        break
            self.pixels[(x, y)] = px_
        return mask

    def _to_px(self, x: float, y: float) -> tuple[int, int]:
        if self.rot:
            a = math.radians(self.rot)
            cx, cy = self.rot_c
            x, y = (x - cx) * math.cos(a) - (y - cy) * math.sin(a) + cx, (x - cx) * math.sin(a) + (y - cy) * math.cos(a) + cy
        return int(math.floor(x * self.scale + self.ox)), int(math.floor(y * self.scale + self.oy))

    def dot(self, x: float, y: float, material: str, offset: int = 0, late: bool = False) -> None:
        """A single pixel at design coordinates (eyes, rivets, glints)."""
        px, py = self._to_px(x, y)
        if 0 <= px < self.width and 0 <= py < self.height:
            self._parts += 1
            (self.late if late else self.pixels)[(px, py)] = Pixel(material, offset, self._parts)

    def line(self, x0: float, y0: float, x1: float, y1: float, material: str, offset: int = 0, late: bool = False) -> None:
        """A one-pixel line (Bresenham) between design points: seams, strings, engravings."""
        ax, ay = self._to_px(x0, y0)
        bx, by = self._to_px(x1, y1)
        dx, dy = abs(bx - ax), -abs(by - ay)
        sx, sy = (1 if ax < bx else -1), (1 if ay < by else -1)
        err = dx + dy
        self._parts += 1
        layer = self.late if late else self.pixels
        while True:
            if 0 <= ax < self.width and 0 <= ay < self.height:
                layer[(ax, ay)] = Pixel(material, offset, self._parts)
            if ax == bx and ay == by:
                break
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                ax += sx
            if e2 <= dx:
                err += dx
                ay += sy

    def draw_late(self, shape: Shape, material: str, offset: int = 0) -> None:
        """A flat part painted over the finished sprite, after the outline (glows, sparks)."""
        self._parts += 1
        for p in self._raster(shape):
            self.late[p] = Pixel(material, offset, self._parts)

    def erase(self, shape: Shape) -> None:
        for p in self._raster(shape):
            self.pixels.pop(p, None)

    def render(
        self,
        materials: MaterialMap,
        outline: bool = True,
        selective: bool = True,
        rim: Optional[Color] = None,
        rim_side: int = -1,
    ) -> Image.Image:
        """Resolves materials to colours. `rim`: a colour painted on the silhouette's inner edge on the
        side `rim_side` (-1 = back/left, the sky behind a right-facing figure) and on top."""
        img = Image.new("RGBA", (self.width, self.height), (0, 0, 0, 0))
        px = img.load()
        for (x, y), p in self.pixels.items():
            px[x, y] = (*_resolve(p, materials, keep_dark=outline), 255)
        if rim is not None:
            add_rim(img, rim, rim_side)
        if outline and selective:
            add_selective_outline(img, self.pixels, materials)
        elif outline:
            add_outline(img, OUTLINE)
        for (x, y), p in self.late.items():
            px[x, y] = (*_resolve(p, materials, keep_dark=False), 255)
        return img


def _resolve(p: Pixel, materials: MaterialMap, keep_dark: bool) -> Color:
    name, base = materials[p.material]
    r = ramp(name)
    if p.offset == LINE:
        idx = 1 if len(r) > 2 else 0
    elif p.offset == DEEP:
        idx = 0
    else:
        # Body colours never reach the darkest tone, which belongs to the outline.
        idx = max(1 if keep_dark and len(r) > 2 else 0, min(len(r) - 1, base + p.offset))
    return r[idx]


def add_outline(img: Image.Image, color: Color = OUTLINE) -> None:
    """1 px outline around every opaque region (4-neighbourhood), in place."""
    w, h = img.size
    src = img.copy().load()
    dst = img.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3] != 0:
                continue
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3] != 0:
                    dst[x, y] = (color[0], color[1], color[2], 255)
                    break


def add_selective_outline(img: Image.Image, pixels: dict[tuple[int, int], Pixel], materials: MaterialMap) -> None:
    """A «sel-out» outline: each outline pixel takes the darkest tone of the material it borders
    instead of one black, so edges read as the object's own shadow."""
    w, h = img.size
    src = img.copy().load()
    dst = img.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3] != 0:
                continue
            best: Optional[Color] = None
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h and src[nx, ny][3] != 0:
                    p = pixels.get((nx, ny))
                    name = materials[p.material][0] if p is not None else "ink"
                    c = ramp(name)[0] if name != "light" else OUTLINE
                    best = c if best is None or sum(c) < sum(best) else best
            if best is not None:
                dst[x, y] = (best[0], best[1], best[2], 255)


def add_rim(img: Image.Image, color: Color, side: int = -1) -> None:
    """Rim light: opaque pixels whose neighbour on `side` (or above) is transparent take `color`."""
    w, h = img.size
    src = img.copy().load()
    dst = img.load()
    for y in range(h):
        for x in range(w):
            if src[x, y][3] == 0:
                continue
            nx = x + side
            if (0 <= nx < w and src[nx, y][3] == 0) or (y > 0 and src[x, y - 1][3] == 0 and 0 <= nx < w and src[nx, y - 1][3] == 0):
                dst[x, y] = (color[0], color[1], color[2], 255)


def rasterize(shape: Shape, width: int, height: int) -> set[tuple[int, int]]:
    """Pixel set of a shape given directly in pixel coordinates."""
    return Canvas(width, height)._raster(shape)


def mirror(img: Image.Image) -> Image.Image:
    return img.transpose(Image.Transpose.FLIP_LEFT_RIGHT)


def paint(img: Image.Image, pixels: Iterable[tuple[int, int]], c: Color) -> None:
    px = img.load()
    w, h = img.size
    for x, y in pixels:
        if 0 <= x < w and 0 <= y < h:
            px[x, y] = (c[0], c[1], c[2], 255)
