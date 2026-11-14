"""World 1 backdrop — the golden meadows at dusk — in every difficulty grade.

Layers (back to front): sky (the low sun), clouds (banks lit from below, birds), far (a pale range with a castle,
then a nearer ridge), hills (field patchwork, hedgerows, a village and a river catching the light), meadow
(two windmills, a farm, orchards, haystacks), ground (the wheat bank, the fence, the dirt path the party walks and
the near grass) and foreground. The land is backlit: every form has a shadow side, a body, a side lit by the sun
and a bright rim. The Torment grade is the blood harvest: a blood-red sky under a black eclipse, the land gone to dried-blood
browns and black, every light out, what people built broken — and the Rift, still violet, splitting the sky.

The planes right behind the fighters (roughly y 88–117: ridge, farmland, meadow, bank) are kept close in value and
quiet in detail so that figures read against them; the richness sits above (sky, landmarks) and below the path.
`ATMOSPHERE` lists the real-time effects the strip runs over each grade.

The other backdrop families import `W`, `H`, `PATH_Y`, `_silhouette`, `_shift`, `_rift` and `_crystal` from here.
"""
from __future__ import annotations

import bisect
import math
import random
from dataclasses import dataclass
from typing import Callable, Optional

from PIL import Image

from ..backdrop import blank, dither_pick, periodic, put, vertical_gradient
from ..palette import RAMPS, Color, color, hex_of
from ..raster import capsule, circle, ellipse, polygon, rasterize, rect, rotate_shape

W, H = 600, 160
#: y of the path's centre line: the feet of every combatant rest here.
PATH_Y = 123
#: The tone creature previews of this world are shown on.
PREVIEW_BG: Color = color("dusk", 3)
#: Where the sun sits in the sky layer.
SUN = (430, 84)

#: A form's tones: shadow side, body, sun side, rim.
Tones = tuple[Color, Color, Color, Color]
#: Every palette tone → the next lighter tone of its ramp (the sun's halo brightens the sky it covers).
LIGHTER: dict[Color, Color] = {color(r, i): color(r, i + 1) for r, tones in RAMPS.items() for i in range(len(tones) - 1)}


@dataclass(frozen=True)
class Grade:
    key: str
    sky: list[Color]
    sky_end: int
    clouds: Tones  # top, body, lit belly, bright lower edge
    far_back: Tones
    far: Tones
    hills: Tones
    meadow: Tones
    built: Tones  # mills, farm and barns on the meadow: darker stone, a stronger lit side
    window: Optional[Color]  # lit windows; None = every light is out
    river: tuple[Color, Color]  # water, glint
    smoke: Optional[Color]
    wheat: tuple[Color, Color]  # stalk, ear
    grass: tuple[Color, Color, Color, Color]  # deep, body, light, lit tips
    path: tuple[Color, Color, Color]  # dark, body, light
    fence: tuple[Color, Color]  # shadow, body: the rails and posts behind the fighters stay low in contrast
    wood: Tones
    stone: tuple[Color, Color, Color]  # dark, body, light
    fore: tuple[Color, Color]
    flowers: tuple[Color, ...]
    torment: bool = False


def _c(r: str, i: int) -> Color:
    return color(r, i)


NORMAL = Grade(
    key="normal",
    sky=[_c("violet", 3), _c("dusk", 3), _c("dusk", 4), _c("dusk", 5), _c("dusk", 6), _c("dusk", 7), _c("dusk", 8), _c("dusk", 9)],
    sky_end=104,
    clouds=(_c("dusk", 4), _c("dusk", 5), _c("dusk", 7), _c("dusk", 9)),
    far_back=(_c("dusk", 6), _c("dusk", 7), _c("dusk", 8), _c("dusk", 9)),
    far=(_c("dusk", 4), _c("dusk", 5), _c("dusk", 6), _c("dusk", 7)),
    hills=(_c("dusk", 3), _c("dusk", 4), _c("dusk", 5), _c("dusk", 6)),
    meadow=(_c("dusk", 2), _c("dusk", 3), _c("dusk", 4), _c("dusk", 5)),
    built=(_c("dusk", 1), _c("dusk", 2), _c("dusk", 4), _c("dusk", 7)),
    window=_c("brass", 6),
    river=(_c("dusk", 8), _c("bone", 7)),
    smoke=_c("dusk", 5),
    wheat=(_c("brass", 3), _c("brass", 4)),
    grass=(_c("moss", 2), _c("moss", 3), _c("moss", 4), _c("moss", 6)),
    path=(_c("leather", 3), _c("leather", 4), _c("leather", 6)),
    fence=(_c("leather", 3), _c("leather", 4)),
    wood=(_c("leather", 2), _c("leather", 3), _c("leather", 5), _c("leather", 6)),
    stone=(_c("bone", 2), _c("bone", 3), _c("bone", 5)),
    fore=(_c("moss", 1), _c("moss", 3)),
    flowers=(_c("crimson", 5), _c("bone", 7), _c("brass", 6), _c("azure", 6)),
)

TORMENT = Grade(
    key="torment",
    # Blood harvest: black above, a red glow low on the horizon; the land near-black with dried-blood edges.
    sky=[_c("ink", 0), _c("crimson", 0), _c("crimson", 0), _c("crimson", 1), _c("crimson", 1), _c("crimson", 2), _c("crimson", 3), _c("crimson", 4)],
    sky_end=104,
    clouds=(_c("ink", 1), _c("crimson", 0), _c("crimson", 2), _c("crimson", 4)),
    far_back=(_c("crimson", 1), _c("crimson", 2), _c("crimson", 3), _c("crimson", 4)),
    far=(_c("crimson", 0), _c("crimson", 1), _c("crimson", 2), _c("crimson", 3)),
    hills=(_c("ink", 0), _c("crimson", 0), _c("crimson", 1), _c("crimson", 2)),
    meadow=(_c("ink", 0), _c("leather", 0), _c("leather", 1), _c("crimson", 2)),
    built=(_c("ink", 0), _c("ink", 1), _c("leather", 1), _c("crimson", 3)),
    window=None,
    river=(_c("crimson", 2), _c("crimson", 5)),
    smoke=None,
    wheat=(_c("leather", 1), _c("leather", 2)),
    grass=(_c("ink", 0), _c("leather", 0), _c("leather", 1), _c("crimson", 2)),
    path=(_c("ink", 2), _c("ink", 3), _c("ink", 4)),
    fence=(_c("ink", 0), _c("leather", 2)),
    wood=(_c("ink", 1), _c("leather", 1), _c("leather", 2), _c("leather", 3)),
    stone=(_c("leather", 1), _c("leather", 2), _c("bone", 2)),
    fore=(_c("ink", 0), _c("crimson", 2)),
    flowers=(_c("crimson", 4), _c("crimson", 3)),
    torment=True,
)

GRADES = {"normal": NORMAL, "torment": TORMENT}


# ------------------------------------------------------------------------------------- shared helpers
# (imported by the other backdrop families — keep their names, signatures and behaviour)
def _silhouette(img: Image.Image, shape, body: Color, rim: Color, sun_side: int = 1) -> None:
    """A flat prop with a one-pixel rim on top and on the sun side (wraps horizontally)."""
    pts = rasterize(_shift(shape, img.width), img.width * 3, H)
    pts = {(x - img.width, y) for (x, y) in pts}
    for (x, y) in pts:
        lit = (x, y - 1) not in pts or (x + sun_side, y) not in pts
        put(img, x, y, rim if lit else body)

def _shift(shape, dx: float):
    from ..raster import Shape

    x0, y0, x1, y1 = shape.bbox
    return Shape(lambda x, y: shape.contains(x - dx, y), (x0 + dx, y0, x1 + dx, y1))

def _rift(img: Image.Image, rng: random.Random) -> None:
    """A fracture down the sky: a void core with stars, glowing lips, shards splitting off."""
    xs, ys = [262.0], [-2.0]
    while ys[-1] < 78:
        ys.append(ys[-1] + rng.uniform(4, 8))
        xs.append(xs[-1] + rng.uniform(-5, 5))
    left, right = [], []
    for x, y in zip(xs, ys):
        w = max(0.6, 11.0 * max(0.0, 1 - y / 82) ** 1.3) * rng.uniform(0.75, 1.15)
        left.append((x - w, y))
        right.append((x + w * rng.uniform(0.6, 1.0), y))
    core = polygon(left + right[::-1])
    glow = polygon([(x - 2.4, y) for x, y in left] + [(x + 2.4, y) for x, y in right][::-1])
    px = img.load()
    for (a, b) in rasterize(glow, W, H):
        if dither_pick([(0, 0, 0), (1, 1, 1)], 0.6, a, b) == (1, 1, 1):
            px[a, b] = (*_c("violet", 6), 255)
    pts = rasterize(core, W, H)
    for (a, b) in pts:
        edge = any(n not in pts for n in ((a - 1, b), (a + 1, b), (a, b - 1)))
        px[a, b] = (*(_c("violet", 8) if edge else _c("ink", 0)), 255)
    for _ in range(14):
        a, b = rng.choice(sorted(pts))
        if all(n in pts for n in ((a - 1, b), (a + 1, b))):
            px[a, b] = (*_c("azure", 8), 255)
    for i in range(2, len(xs) - 2, 2):
        x0, y0 = (right[i] if i % 4 == 0 else left[i])
        side = 1 if i % 4 == 0 else -1
        L = rng.uniform(6, 14)
        for (a, b) in rasterize(polygon([(x0, y0 - 1.2), (x0 + side * L, y0 + rng.uniform(-3, 4)), (x0, y0 + 1.2)]), W, H):
            px[a, b] = (*_c("violet", 7), 255)

def _crystal(img: Image.Image, x: float, base: float, rng: random.Random) -> None:
    h = rng.uniform(7, 15)
    for (a, b) in rasterize(ellipse(x, base, 6, 1.6), W, H):
        if (a + b) % 2 == 0:
            put(img, a, b, color("violet", 4))
    for k, (dx, hh) in enumerate(((0, h), (-2.4, h * 0.6), (2.6, h * 0.5))):
        shard = polygon([(x + dx - 1.4, base), (x + dx + 1.4, base), (x + dx + 0.4, base - hh)])
        pts = rasterize(shard, W, H)
        for (a, b) in pts:
            edge = (a - 1, b) not in pts
            put(img, a, b, color("violet", 8 if edge else 5 + (k == 0)))


# ------------------------------------------------------------------------------------- helpers
def _shaded(img: Image.Image, shape, tones: Tones, sun_side: int = 1, band: int = 2) -> None:
    """A prop with volume: a rim on top and on the sun side, a lit band behind the rim, a shadow band on the far
    side, body between (wraps horizontally)."""
    shadow, body, light, rim = tones
    pts = rasterize(_shift(shape, img.width), img.width * 3, H)
    pts = {(x - img.width, y) for (x, y) in pts}
    for (x, y) in pts:
        if (x, y - 1) not in pts or (x + sun_side, y) not in pts:
            c = rim
        elif any((x + sun_side * k, y) not in pts for k in range(2, band + 2)):
            c = light
        elif any((x - sun_side * k, y) not in pts for k in range(1, band + 1)):
            c = shadow
        else:
            c = body
        put(img, x, y, c)


def _land(img: Image.Image, contour: Callable[[float], float], tones: Tones, y_end: int, rng: random.Random, fields: bool = True) -> list[int]:
    """Rolling land: a bright rim, a lit crest, and below it a patchwork of fields — each its own tone, some
    ploughed in slanting furrows — parted by hedge lines. Returns the top y per column."""
    shadow, body, light, rim = tones
    px = img.load()
    cuts = sorted(rng.sample(range(0, W, 12), 11)) if fields else []
    kinds = [(body if i % 2 else shadow, 0, 1) for i in range(len(cuts))]
    tops: list[int] = []
    for x in range(W):
        top = int(round(contour(x)))
        tops.append(top)
        tone, furrow, slant, hedge = body, 0, 1, False
        if cuts:
            i = (bisect.bisect_right(cuts, x) - 1) % len(cuts)
            tone, furrow, slant = kinds[i]
            hedge = x - cuts[i] in (0, 1)
        for y in range(max(0, top), y_end):
            d = y - top
            if d == 0:
                c = rim
            elif d <= 2:
                c = light
            elif hedge:
                c = shadow
            elif furrow and (x * slant + d * 2) % (furrow * 2) == 0:
                c = body if tone == shadow else shadow
            else:
                c = tone
            px[x, y] = (*c, 255)
    return tops


def _dip(x: float, depth: float, centre: float = SUN[0], width: float = 46.0) -> float:
    """A hollow in a skyline around `centre`: the gap the sun sets into."""
    d = min(abs(x - centre), W - abs(x - centre))
    return depth * math.exp(-((d / width) ** 2))


def _smoke(img: Image.Image, x: float, y: float, c: Optional[Color], rng: random.Random, height: int) -> None:
    """Chimney smoke: a thin thread that wanders and thickens as it rises."""
    if c is None:
        return
    ph = rng.uniform(0, math.tau)
    for k in range(height):
        sx = x + 1.6 * math.sin(k / 2.6 + ph) + k * 0.22
        put(img, int(sx), int(y - k), c)
        if k > height * 0.45 and k % 3 != 0:
            put(img, int(sx) + 1, int(y - k), c)


def _stretches(rng: random.Random, n: int, lo: int, hi: int) -> Callable[[int], bool]:
    """A few runs of columns along the strip (wrapping), e.g. where wheat grows."""
    runs = []
    for i in range(n):
        start = int(i * W / n + rng.uniform(0, W / n - hi))
        runs.append((start, start + rng.randint(lo, hi)))
    return lambda x: any(a <= x % W < b or a <= x % W + W < b for a, b in runs)


def _tree(img: Image.Image, x: float, base: float, tones: Tones, rng: random.Random, size: float) -> None:
    trunk = rect(x - 1, base - size * 0.5, x + 1, base)
    crown = circle(x, base - size * 0.68, size * 0.36)
    for _ in range(3):
        crown = crown | circle(x + rng.uniform(-0.34, 0.34) * size, base - size * rng.uniform(0.52, 0.86), size * rng.uniform(0.2, 0.3))
    _shaded(img, trunk | crown, tones, band=max(1, int(size / 6)))


def _dead_tree(img: Image.Image, x: float, base: float, body: Color, rim: Color, rng: random.Random) -> None:
    h = rng.uniform(10, 18)
    shape = capsule(x, base, x + rng.uniform(-1, 1), base - h, 1.0)
    for _ in range(4):
        y0 = base - h * rng.uniform(0.4, 0.95)
        ang = rng.uniform(-2.6, -0.5)
        L = rng.uniform(3, 7)
        shape = shape | capsule(x, y0, x + math.cos(ang) * L, y0 + math.sin(ang) * L, 0.5)
    _silhouette(img, shape, body, rim)


# ------------------------------------------------------------------------------------- layers
def sky(g: Grade, rng: random.Random) -> Image.Image:
    img = blank(W, H)
    vertical_gradient(img, g.sky, 0, g.sky_end, curve=0.85)
    px = img.load()
    sx, sy = SUN
    if g.torment:
        # A few cold stars, the black eclipse in its ring of blood, and the Rift.
        for _ in range(46):
            x, y = rng.randrange(W), rng.randrange(0, 60)
            px[x, y] = (*(_c("bone", 6) if rng.random() < 0.5 else _c("crimson", 5)), 255)
        for (x, y) in rasterize(circle(sx, sy, 40), W, H):  # the glow it throws on the sky: two steps, then one
            if y < g.sky_end and px[x, y][:3] in LIGHTER:
                near = math.hypot(x - sx, y - sy) < 27
                c = LIGHTER[px[x, y][:3]]
                px[x, y] = (*(LIGHTER.get(c, c) if near else c), 255)
        for (x, y) in rasterize(circle(sx, sy, 18), W, H):
            px[x, y] = (*_c("crimson", 4), 255)
        for (x, y) in rasterize(circle(sx, sy, 16), W, H):
            px[x, y] = (*_c("crimson", 6), 255)
        for (x, y) in rasterize(circle(sx, sy, 14), W, H):
            px[x, y] = (*_c("ink", 0), 255)
        for k in range(10):  # uneven rays of the corona
            ang = math.tau * k / 10 + 0.3
            for r in range(19, 19 + (7 if k % 3 else 12)):
                x, y = int(sx + math.cos(ang) * r), int(sy + math.sin(ang) * r)
                if 0 <= x < W and 0 <= y < g.sky_end:
                    px[x, y] = (*_c("crimson", 5 if r < 23 else 4), 255)
        _rift(img, rng)
        return img
    # The first stars, high up where the sky is already dark.
    for _ in range(22):
        x, y = rng.randrange(W), rng.randrange(0, 24)
        px[x, y] = (*(_c("bone", 7) if rng.random() < 0.4 else _c("dusk", 8)), 255)
    # A low sun: a wide soft halo that lifts the sky one tone, a solid ring, the disc and its bright core.
    for (x, y) in rasterize(circle(sx, sy, 34), W, H):
        if y < g.sky_end and px[x, y][:3] in LIGHTER and math.hypot(x - sx, y - sy) > 22:
            px[x, y] = (*LIGHTER[px[x, y][:3]], 255)
    for (x, y) in rasterize(circle(sx, sy, 22), W, H):
        if y < g.sky_end:
            px[x, y] = (*_c("dusk", 9), 255)
    for (x, y) in rasterize(circle(sx, sy, 18), W, H):
        px[x, y] = (*_c("bone", 7), 255)
    for (x, y) in rasterize(circle(sx, sy, 14), W, H):
        px[x, y] = (*_c("light", 0), 255)
    # Long bars of light lying along the horizon either side of it.
    for _ in range(12):
        y = rng.randrange(72, 100)
        x0 = sx + int(rng.uniform(-190, 150))
        for x in range(x0, x0 + rng.randint(18, 64)):
            if px[x % W, y][:3] in LIGHTER and math.hypot(x - sx, y - sy) > 23:
                px[x % W, y] = (*LIGHTER[px[x % W, y][:3]], 255)
    return img


def clouds(g: Grade, rng: random.Random) -> Image.Image:
    """Cloud banks with dark tops and bellies lit by the low sun, thin streaks between them, and birds going home."""
    img = blank(W, H)
    top, body, lit, edge = g.clouds

    def paint(shape) -> None:
        for dx in (-W, 0, W):
            pts = rasterize(_shift(shape, dx), W, H)
            lo: dict[int, int] = {}
            hi: dict[int, int] = {}
            for (x, y) in pts:
                lo[x] = min(lo.get(x, y), y)
                hi[x] = max(hi.get(x, y), y)
            for (x, y) in pts:
                depth = hi[x] - lo[x] + 1
                t = (y - lo[x]) / depth
                if (x, y + 1) not in pts:
                    c = edge
                elif (x, y - 1) not in pts or (t < 0.24 and depth > 5):
                    c = top
                elif t > 0.52:
                    c = lit
                else:
                    c = body
                put(img, x, y, c)

    for i, (frac, base, length, puff) in enumerate(((0.08, 30, 150, 15), (0.36, 50, 110, 11), (0.56, 22, 96, 10), (0.80, 40, 160, 16), (0.22, 66, 70, 7), (0.66, 68, 84, 8))):
        cx = frac * W + rng.uniform(-18, 18)
        shape = ellipse(cx, base, length / 2, 2.8)
        for _ in range(11):
            ex = cx + rng.uniform(-0.43, 0.43) * length
            r = rng.uniform(0.5, 1.0) * puff * (1 - (abs(ex - cx) / length * 1.6) ** 2)
            shape = shape | ellipse(ex, base - r * 0.7, r * 1.7, r)
        paint(shape & rect(cx - length, base - 40, cx + length, base + 2.4))
    for _ in range(9):
        cx, cy = rng.uniform(0, W), rng.uniform(12, 78)
        length = rng.uniform(24, 62)
        shape = ellipse(cx, cy, length / 2, rng.uniform(1.2, 2.0))
        for _ in range(3):
            shape = shape | ellipse(cx + rng.uniform(-length / 2, length / 2), cy + rng.uniform(-1.5, 1.5), rng.uniform(7, length / 2.4), rng.uniform(1.2, 2.6))
        paint(shape)
    if not g.torment:
        for _ in range(3):
            bx, by = rng.uniform(0, W), rng.uniform(36, 70)
            for k in range(rng.randint(4, 7)):
                x, y = int(bx + k * 6 + rng.uniform(-1.5, 1.5)), int(by + abs(k - 2) * 2.4 + rng.uniform(-1, 1))
                for ox, oy in ((-1, -1), (0, 0), (1, -1)) if k % 2 else ((-2, 0), (-1, -1), (0, 0), (1, -1), (2, 0)):
                    put(img, x + ox, y + oy, g.meadow[1])
    return img


def _castle(img: Image.Image, cx: float, base: float, g: Grade, rng: random.Random) -> None:
    """A castle on the far range: curtain wall, three towers with pointed roofs, a few lit windows."""
    shadow, body, _light, rim = g.far_back
    tones: Tones = (g.far[0], shadow, body, rim)
    shape = rect(cx - 17, base - 7, cx + 17, base + 3) | polygon([(cx - 24, base + 3), (cx - 17, base - 3), (cx + 17, base - 3), (cx + 25, base + 3)])
    for k in range(-17, 17, 3):
        shape = shape | rect(cx + k, base - 8.6, cx + k + 1.6, base - 7)
    lights = []
    for dx, w, h in ((-16, 5, 13), (-9, 4, 10), (-3, 7, 21), (6, 4, 11), (11, 5, 15)):
        if g.torment:
            h *= rng.uniform(0.55, 0.85)
            shape = shape | rect(cx + dx, base - h, cx + dx + w, base) | polygon([(cx + dx, base - h), (cx + dx + w * 0.3, base - h - 2.5), (cx + dx + w * 0.55, base - h)])
        else:
            shape = shape | rect(cx + dx, base - h, cx + dx + w, base) | polygon([(cx + dx - 1, base - h), (cx + dx + w + 1, base - h), (cx + dx + w / 2, base - h - 5.5)])
            lights.append((int(cx + dx + w / 2), int(base - h + 3)))
    _shaded(img, shape, tones, band=1)
    if g.window:
        for (x, y) in lights:
            put(img, x, y, g.window)
        put(img, int(cx), int(base - 2), g.window)
        # A banner on the keep.
        for k in range(4):
            put(img, int(cx) + 1 + k, int(base - 28), _c("crimson", 4))
            put(img, int(cx) + 1 + k, int(base - 27), _c("crimson", 4) if k < 3 else g.far_back[2])
        for k in range(3):
            put(img, int(cx), int(base - 28 + k), g.far[0])


def far_ridge(g: Grade, rng: random.Random) -> Image.Image:
    """Two far planes: a pale range with a castle on its highest shoulder, and a nearer ridge lined with poplars."""
    img = blank(W, H)
    fb = periodic(W, rng, [(1, 6.0), (2, 5.0), (3, 3.4), (5, 2.2), (9, 1.4), (17, 0.6)])
    back = lambda x: 74 + fb(x) + _dip(x, 12.0, width=60.0)  # noqa: E731
    cx = min(range(60, 300), key=back)
    _castle(img, cx, back(cx) + 1, g, rng)
    _land(img, back, g.far_back, 116, rng, fields=False)
    ff = periodic(W, rng, [(1, 3.0), (2, 3.2), (5, 1.6), (11, 0.6)])
    front = lambda x: 88 + ff(x) + _dip(x, 6.0)  # noqa: E731
    for _ in range(18):
        tx = rng.uniform(0, W)
        hgt = rng.uniform(4, 8)
        if g.torment:
            _silhouette(img, capsule(tx, front(tx) + 1, tx, front(tx) + 1 - hgt, 0.5), g.far[1], g.far[3])
        else:
            _shaded(img, ellipse(tx, front(tx) + 1 - hgt / 2, 1.5, hgt / 2), g.far, band=1)
    _land(img, front, g.far, 116, rng)
    return img


def _village(img: Image.Image, cx: float, contour: Callable[[float], float], g: Grade, rng: random.Random, houses: int, church: bool) -> None:
    """Roofs huddled on a hill: houses with lit windows and smoking chimneys, and a church spire over them."""
    t = g.hills
    lights: list[tuple[int, int]] = []
    shape = None
    for i in range(houses):
        hx = cx + (i - houses / 2) * 8.5 + rng.uniform(-2, 2)
        w, h = rng.uniform(5.5, 8.5), rng.uniform(3.5, 5.5)
        base = contour(hx + w / 2) + 2
        house = rect(hx, base - h, hx + w, base)
        if g.torment and rng.random() < 0.6:
            house = house | polygon([(hx - 1, base - h), (hx + w * 0.5, base - h), (hx + w * 0.3, base - h - 3)])
        else:
            house = house | polygon([(hx - 1, base - h), (hx + w + 1, base - h), (hx + w * 0.72, base - h - 3.6), (hx + w * 0.28, base - h - 3.6)])
            house = house | rect(hx + w * 0.62, base - h - 5.2, hx + w * 0.62 + 1.4, base - h - 2)
            if i % 2 == 0:
                _smoke(img, hx + w * 0.62 + 0.7, base - h - 6, g.smoke, rng, rng.randint(9, 15))
        lights.append((int(hx + w * 0.3), int(base - h + 1.5)))
        if w > 7:
            lights.append((int(hx + w * 0.7), int(base - h + 1.5)))
        shape = house if shape is None else shape | house
    if church:
        base = contour(cx) + 2
        nave = rect(cx - 5, base - 7, cx + 4, base) | polygon([(cx - 6, base - 7), (cx + 5, base - 7), (cx - 0.5, base - 11)])
        tower = rect(cx + 3, base - 14, cx + 7.5, base)
        spire = polygon([(cx + 2.4, base - 14), (cx + 8.1, base - 14), (cx + 5.25, base - (17 if g.torment else 23))])
        shape = shape | nave | tower | spire
        lights += [(int(cx + 5), int(base - 11)), (int(cx - 2), int(base - 4))]
    _shaded(img, shape, t, band=1)
    if g.window:
        for (x, y) in lights:
            put(img, x, y, g.window)
    if church and not g.torment:
        put(img, int(cx + 5.25), int(contour(cx) + 2 - 24), t[3])
        put(img, int(cx + 4.25), int(contour(cx) + 2 - 22), t[3])
        put(img, int(cx + 6.25), int(contour(cx) + 2 - 22), t[3])


def hills(g: Grade, rng: random.Random) -> Image.Image:
    """Rolling farmland: field patchwork and hedgerows, a village round its church, a hamlet, and the river."""
    img = blank(W, H)
    f = periodic(W, rng, [(2, 3.6), (3, 3.0), (5, 1.8), (11, 0.6)])
    contour = lambda x: 97 + f(x) + _dip(x, 4.0)  # noqa: E731
    v1 = min(range(170, 300), key=contour)
    v2 = (v1 + 330) % W
    _village(img, v1, contour, g, rng, houses=7, church=True)
    _village(img, v2, contour, g, rng, houses=3, church=False)
    for _ in range(20):
        tx = rng.uniform(0, W)
        if min(abs(tx - v1), abs(tx - v2)) < 34:
            continue
        if g.torment:
            _dead_tree(img, tx, contour(tx) + 1, g.hills[1], g.hills[3], rng)
        elif rng.random() < 0.4:
            hgt = rng.uniform(8, 13)
            _shaded(img, ellipse(tx, contour(tx) + 1 - hgt / 2, 2.0, hgt / 2), g.hills, band=1)
        else:
            _tree(img, tx, contour(tx) + 1, g.hills, rng, rng.uniform(7, 11))
    _land(img, contour, g.hills, 118, rng)
    # The river winds through the low ground and takes the light of the sky; a stone bridge crosses it.
    ph = rng.uniform(0, math.tau)
    water, glint = g.river
    river = lambda x: 102.5 + 1.8 * math.sin(math.tau * 2 * x / W + ph) + 0.7 * math.sin(math.tau * 5 * x / W)  # noqa: E731
    for x in range(W):
        ry = river(x)
        if ry > contour(x) + 3:
            put(img, x, int(ry), glint if (x // 3) % 4 == 0 or rng.random() < 0.2 else water)
            put(img, x, int(ry) + 1, water)
            if (x // 5) % 3 == 0:
                put(img, x, int(ry) - 1, water)
    bx = max(range(W), key=lambda x: river(x) - contour(x) - 0.02 * abs(x - 330))
    by = int(river(bx))
    bridge = rect(bx - 11, by - 3.5, bx + 11, by + 2) - circle(bx - 5, by + 2, 3.2) - circle(bx + 5, by + 2, 3.2)
    if g.torment:
        bridge = bridge - rect(bx - 2, by - 5, bx + 4, by + 3)
    _shaded(img, bridge, g.hills, band=1)
    return img


def _sails(img: Image.Image, hx: float, hy: float, length: float, half: float, turn: float, g: Grade) -> None:
    """Four sails on a hub: a stock with its cloth set on the trailing side."""
    body, rim = g.built[1], g.built[3]
    for k in range(4):
        ang = turn + k * 90
        stock = rect(hx, hy - 0.7, hx + length, hy + 0.7)
        if g.torment and k in (1, 2):
            # Snapped: a stub of the stock is all that is left.
            _silhouette(img, rotate_shape(rect(hx, hy - 0.7, hx + length * 0.4, hy + 0.7), ang, hx, hy), body, rim)
            continue
        # The cloth is set on the outer part of the frame; one board of it is missing.
        x0, gap = hx + length * 0.3, hx + length * (0.52 + 0.1 * (k % 2))
        sail = rect(x0, hy - half - 0.7, hx + length - 0.5, hy - 0.7) - rect(gap, hy - half - 1, gap + 1.5, hy - 1.7)
        _silhouette(img, rotate_shape(stock | sail, ang, hx, hy), body, rim)
    _silhouette(img, circle(hx, hy, 1.8), body, rim)


def _tower_mill(img: Image.Image, x: float, base: float, g: Grade, rng: random.Random) -> None:
    """The big mill: a tapering stone tower with a gallery, a boat-shaped cap, a door and lit windows."""
    t = g.built
    tower = polygon([(x - 8.5, base), (x + 8.5, base), (x + 4.8, base - 32), (x - 4.8, base - 32)])
    cap = polygon([(x - 6.8, base - 31), (x + 6.8, base - 31), (x + 4.5, base - 36.5), (x, base - 39.5), (x - 4.5, base - 36.5)])
    gallery = rect(x - 11, base - 13.2, x + 11, base - 12) | capsule(x - 10, base - 12, x - 7, base - 8, 0.5) | capsule(x + 10, base - 12, x + 7, base - 8, 0.5)
    rail = rect(x - 11, base - 16.2, x + 11, base - 15.4) | rect(x - 11, base - 16, x - 10.2, base - 12) | rect(x + 10.2, base - 16, x + 11, base - 12)
    _shaded(img, tower | cap | gallery | rail, t, band=3)
    for yy, half in ((base - 5, 6), (base - 21, 4), (base - 27, 3)):  # stone courses
        for xx in range(int(x - half), int(x + half - 1), 3):
            put(img, xx, int(yy), t[0])
    for dy in range(5):  # the door
        put(img, int(x - 1), int(base - 1 - dy), t[0])
        put(img, int(x), int(base - 1 - dy), t[0])
    if g.window:
        for (wx, wy) in ((x - 2, base - 22), (x - 2, base - 21), (x - 1, base - 22), (x - 1, base - 21), (x + 1, base - 28), (x + 1, base - 27),
                         (x + 3, base - 8), (x + 3, base - 7), (x + 4, base - 8), (x + 4, base - 7)):
            put(img, int(wx), int(wy), g.window)
    _sails(img, x + 6, base - 33, 22.0, 4.6, rng.uniform(8, 38), g)


def _post_mill(img: Image.Image, x: float, base: float, g: Grade, rng: random.Random) -> None:
    """The old mill: a wooden cabin on a trestle, a tail ladder, smaller sails."""
    t = g.built
    trestle = capsule(x - 7, base, x, base - 9, 0.7) | capsule(x + 7, base, x, base - 9, 0.7) | rect(x - 1, base - 12, x + 1, base) | rect(x - 8.5, base - 1.3, x + 8.5, base)
    cabin = rect(x - 6, base - 26, x + 6, base - 11) | polygon([(x - 7.5, base - 26), (x + 7.5, base - 26), (x, base - 33)])
    ladder = capsule(x - 6, base - 12, x - 13, base, 0.6)
    _shaded(img, trestle | cabin | ladder, t)
    for xx in (x - 3, x, x + 3):  # planks
        for yy in range(int(base - 25), int(base - 12), 2):
            put(img, int(xx), yy, t[0])
    if g.window:
        put(img, int(x - 2), int(base - 20), g.window)
        put(img, int(x - 2), int(base - 19), g.window)
    _sails(img, x + 6.5, base - 21, 15.0, 3.6, rng.uniform(50, 80), g)


def _farm(img: Image.Image, x: float, base: float, g: Grade, rng: random.Random) -> None:
    """A thatched farmhouse with a smoking chimney, a barn, a cart and haystacks."""
    t = g.built
    house = rect(x - 10, base - 8, x + 10, base)
    if g.torment:
        roof = polygon([(x - 12, base - 8), (x + 12, base - 8), (x + 8, base - 15), (x + 3, base - 15), (x + 1, base - 10), (x - 3, base - 11), (x - 5, base - 15), (x - 8, base - 15)])
    else:
        roof = polygon([(x - 12, base - 8), (x + 12, base - 8), (x + 8, base - 15.5), (x - 8, base - 15.5)])
    chimney = rect(x + 4, base - 19, x + 6.6, base - 13)
    bx = x + 25
    barn = rect(bx - 7, base - 10, bx + 7, base) | polygon([(bx - 8, base - 10), (bx + 8, base - 10), (bx + 6, base - 14), (bx + 2.5, base - 17.5), (bx - 2.5, base - 17.5), (bx - 6, base - 14)])
    cart = rect(x - 28, base - 5, x - 18, base - 2.6) | (circle(x - 23, base - 1.9, 2.5) - circle(x - 23, base - 1.9, 1.1)) | capsule(x - 18, base - 3.6, x - 13, base - 0.6, 0.5)
    _shaded(img, house | roof | chimney | barn | cart, t)
    if not g.torment:  # the thatch: a dark eave and a lit ridge
        for xx in range(int(x - 11), int(x + 12)):
            put(img, xx, int(base - 9), t[0])
        for xx in range(int(x - 7), int(x + 8)):
            put(img, xx, int(base - 15), t[3])
    for dy in range(4):
        put(img, int(x - 1), int(base - 1 - dy), t[0])
        put(img, int(x), int(base - 1 - dy), t[0])
    for dy in range(6):  # barn doors
        for dx in (-2, -1, 0, 1):
            put(img, int(bx + dx), int(base - 1 - dy), t[0])
    if g.window:
        for wx in (x - 7, x - 6, x + 5, x + 6):
            put(img, int(wx), int(base - 5), g.window)
            put(img, int(wx), int(base - 4), g.window)
        put(img, int(bx), int(base - 13), g.window)
    _smoke(img, x + 5.3, base - 20, g.smoke, rng, 17)
    for hx, r in ((x - 40, 5.5), (x - 49, 4.2), (x + 42, 5.0)):  # haystacks
        _shaded(img, ellipse(hx, base + 1, r, r * 1.25) & rect(hx - r - 1, base - r * 1.3, hx + r + 1, base + 1), t)


def meadow(g: Grade, rng: random.Random) -> Image.Image:
    """The near farmland, backlit: two windmills, a farm, orchards in rows, a scarecrow, wheat along the crest."""
    img = blank(W, H)
    f = periodic(W, rng, [(1, 2.4), (3, 2.6), (6, 1.0)])
    contour = lambda x: 105 + f(x)  # noqa: E731
    t = g.meadow
    _tower_mill(img, 122, int(contour(122)) + 2, g, rng)
    _post_mill(img, 424, int(contour(424)) + 2, g, rng)
    _farm(img, 262, int(contour(262)) + 2, g, rng)
    for x0, n in ((14, 6), (480, 7)):  # orchards
        for k in range(n):
            tx = x0 + k * 10.5 + rng.uniform(-2, 2)
            if g.torment:
                _dead_tree(img, tx, contour(tx) + 1, t[1], t[3], rng)
            else:
                _tree(img, tx, contour(tx) + 1, t, rng, rng.uniform(9, 13))
    for tx in (168, 196, 338, 372, 562, 588):
        tx += rng.uniform(-6, 6)
        if g.torment:
            _dead_tree(img, tx, contour(tx) + 1, t[1], t[3], rng)
        else:
            _tree(img, tx, contour(tx) + 1, t, rng, rng.uniform(13, 19))
    # A scarecrow keeping the crows off the wheat.
    sx = 452
    sb = contour(sx) + 1
    _silhouette(img, rect(sx - 0.6, sb - 11, sx + 0.6, sb) | rect(sx - 4.5, sb - 8.6, sx + 4.5, sb - 7.6) | circle(sx, sb - 11.5, 1.7) | rect(sx - 3, sb - 13.4, sx + 3, sb - 12.6), t[1], t[3])
    if not g.torment:
        for cx in (318, 330, 352, 536):  # cattle grazing
            cb = contour(cx) + 1
            head = -1 if cx % 4 else 1
            _silhouette(img, rect(cx - 3, cb - 4.6, cx + 3, cb - 1.6) | rect(cx - 2.6, cb - 2, cx - 1.6, cb) | rect(cx + 1.6, cb - 2, cx + 2.6, cb)
                        | rect(cx + head * 3, cb - 3.6, cx + head * 5.4, cb - 1.2), t[1], t[3])
    tops = _land(img, contour, t, 122, rng)
    wheat = _stretches(rng, 4, 46, 96)
    # Wheat along the crest: stalks with an ear here and there, not a bright line (it sits behind the fighters).
    for x in range(W):
        if wheat(x) and (x * 7 + tops[x]) % 3:
            put(img, x, tops[x] - 1, g.wheat[1] if x % 3 == 0 else g.wheat[0])
            if x % 4 == 1:
                put(img, x, tops[x] - 2, g.wheat[0])
            put(img, x, tops[x], g.wheat[0])
    return img


def ground(g: Grade, rng: random.Random) -> Image.Image:
    """The walkable meadow: a bank of grass, wheat and poppies, the fence, the dirt path, and the near grass below
    it with its flowers, stones and a fallen log."""
    img = blank(W, H)
    px = img.load()
    deep, grass, light, tips = g.grass
    dark_p, path, light_p = g.path
    stalk, ear = g.wheat
    f = periodic(W, rng, [(3, 1.4), (5, 1.0), (9, 0.6)])
    top = [int(round(110 + f(x))) for x in range(W)]
    path_top, path_bot = PATH_Y - 6, PATH_Y + 5
    for x in range(W):
        for y in range(top[x], H):
            if path_top <= y <= path_bot:
                continue
            if y < path_top:
                t = (y - top[x]) / max(1, path_top - top[x])
                c = dither_pick([light, grass, deep], t, x, y)
            else:
                t = (y - path_bot) / (H - path_bot)
                c = dither_pick([grass, deep, deep, g.fore[0]], t, x, y)
            px[x, y] = (*c, 255)
        # The path: worn dirt with two ruts and scattered pebbles.
        for y in range(path_top, path_bot + 1):
            t = (y - path_top) / (path_bot - path_top)
            c = dither_pick([light_p, path, path, dark_p], t, x, y)
            px[x, y] = (*c, 255)
    # Grass lips hanging over the path edges.
    for x in range(W):
        if rng.random() < 0.55:
            put(img, x, path_top, grass)
        if rng.random() < 0.3:
            put(img, x, path_top + 1, grass)
        if rng.random() < 0.6:
            put(img, x, path_bot, deep)
    for _ in range(90):
        x, y = rng.randrange(W), rng.randrange(path_top + 1, path_bot)
        put(img, x, y, light_p)
        put(img, x + 1, y, dark_p)
    for x in range(W):
        if rng.random() < 0.5:
            put(img, x, PATH_Y + 1, dark_p)
        if rng.random() < 0.3:
            put(img, x, PATH_Y - 3, dark_p)
    # The top of the bank: stretches of ripe wheat, grass with lit tips between them.
    wheat = _stretches(rng, 3, 30, 62)
    for x in range(W):
        if wheat(x):
            if rng.random() < 0.6:
                hgt = rng.randint(2, 3)
                for k in range(hgt):
                    put(img, x, top[x] - 1 - k, ear if k == hgt - 1 else stalk)
                for k in range(rng.randint(1, 2)):
                    put(img, x, top[x] + k, stalk)
        elif rng.random() < 0.55:
            hgt = rng.randint(1, 3)
            for k in range(hgt):
                put(img, x, top[x] - 1 - k, tips if k == hgt - 1 and rng.random() < 0.25 else light)
    # Stones half sunk in the bank, and a milestone.
    for _ in range(7):
        sx = rng.randrange(W)
        rw, rh = rng.uniform(2.5, 4.5), rng.uniform(2, 3.2)
        base = rng.randrange(top[sx] + 3, path_top)
        pts = rasterize(ellipse(sx, base, rw, rh), W * 2, H)
        for (a, b) in pts:
            if b <= base:
                lit = (a, b - 1) not in pts or (a + 1, b) not in pts
                put(img, a, b, g.stone[2] if lit else g.stone[1] if b < base else g.stone[0])
    for dy in range(6):
        for dx in range(3):
            put(img, 318 + dx, path_top - 1 - dy, g.stone[2] if dx == 2 or dy == 5 else g.stone[1])
    put(img, 319, path_top - 4, g.stone[0])
    # Fence posts and rails along the far side of the path; the rails sag between posts.
    posts = [i + 14 for i in range(0, W, 46)]
    for n, fx in enumerate(posts):
        if g.torment and n % 3 == 1:
            continue
        lean = (rng.random() - 0.5) * (4 if g.torment else 1)
        post = polygon([(fx - 1.5, path_top + 1), (fx + 1.5, path_top + 1), (fx + 1.5 + lean, path_top - 13), (fx - 1.5 + lean, path_top - 13)])
        _silhouette(img, post, g.fence[0], g.fence[1], sun_side=1)
    for ry in (path_top - 10, path_top - 5):
        for x in range(W):
            bay, along = (x - 14) // 46, (x - 14) % 46
            if g.torment and bay % 3 in (0, 1) and along > 20:
                continue
            sag = int(round(0.9 * math.sin(math.pi * along / 46)))
            if not g.torment and bay % 13 == 10 and ry == path_top - 10 and along > 24:
                sag = int((along - 24) * 0.42)  # one top rail has come loose and hangs
            put(img, x, ry + sag, g.fence[1])
            put(img, x, ry + sag + 1, g.fence[0])
    if not g.torment:
        # A gate in one bay: pickets and a brace.
        gx = posts[8]
        for k in range(1, 46):
            if k % 6 == 0:
                for yy in range(path_top - 12, path_top):
                    put(img, gx + k, yy, g.fence[1])
            put(img, gx + k, path_top - 11 + int(k * 9 / 46), g.fence[1])
        # A bird on a post, a creeper up another.
        bx = posts[4]
        for (dx, dy, c) in ((0, -15, _c("ink", 2)), (1, -15, _c("ink", 2)), (1, -16, _c("ink", 2)), (2, -16, _c("brass", 5)), (-1, -14, _c("ink", 3))):
            put(img, bx + dx, path_top + dy, c)
        vx = posts[11]
        for k in range(11):
            put(img, vx + (1 if k % 4 < 2 else -1), path_top - 1 - k, light)
            if k % 3 == 0:
                put(img, vx + (2 if k % 4 < 2 else -2), path_top - 1 - k, tips)
    # A signpost where a track joins.
    sx = 84
    lean = -3 if g.torment else 0
    _shaded(img, polygon([(sx - 1.2, path_top + 1), (sx + 1.2, path_top + 1), (sx + 1.2 + lean, path_top - 19), (sx - 1.2 + lean, path_top - 19)]), g.wood, band=1)
    _shaded(img, polygon([(sx + 1 + lean, path_top - 18), (sx + 10 + lean, path_top - 18), (sx + 12.5 + lean, path_top - 16), (sx + 10 + lean, path_top - 14), (sx + 1 + lean, path_top - 14)]), g.wood, band=1)
    if not g.torment:
        _shaded(img, polygon([(sx - 1, path_top - 12), (sx - 9, path_top - 12), (sx - 11.5, path_top - 10), (sx - 9, path_top - 8), (sx - 1, path_top - 8)]), g.wood, band=1)
        for k in (3, 5, 7):
            put(img, sx + k, path_top - 16, g.wood[0])
            put(img, sx - k, path_top - 10, g.wood[0])
    # Poppies and other flowers in the bank.
    for _ in range(18 if not g.torment else 8):
        x = rng.randrange(W)
        y = rng.randrange(top[x] + 1, path_top - 1)
        put(img, x, y, rng.choice(g.flowers))
        if rng.random() < 0.5:
            put(img, x, y + 1, light)
    # --- below the path ---
    # Patches of clover lighter than the grass around them.
    for _ in range(12):
        cx, cy = rng.randrange(W), rng.randrange(path_bot + 5, H - 5)
        rx, ry = rng.uniform(5, 11), rng.uniform(1.4, 3.0)
        pts = rasterize(ellipse(cx, cy, rx, ry), W * 2, H)
        for (a, b) in pts:
            put(img, a, b, light if (a, b - 1) not in pts and (a + b) % 2 else grass)
    # Tufts: lit blades fanning up, denser and brighter near the path.
    for _ in range(170):
        x = rng.randrange(W)
        y = int(path_bot + 3 + (H - path_bot - 3) * rng.random() ** 1.6)
        near = 1 - (y - path_bot) / (H - path_bot)
        hgt = rng.randint(2, 3 + int(near * 3))
        for k in range(rng.randint(2, 4)):
            lean = rng.choice((-1, 0, 1))
            for j in range(hgt):
                c = tips if (j == hgt - 1 and near > 0.8 and rng.random() < 0.2) else (light if near > 0.65 else grass)
                put(img, x + k + (lean if j > hgt // 2 else 0), y - j, c)
    # Stones, lit from the sun side.
    for _ in range(6):
        cx, cy = rng.randrange(W), rng.randrange(path_bot + 7, H - 6)
        rw, rh = rng.uniform(3, 6), rng.uniform(2, 3.6)
        pts = rasterize(ellipse(cx, cy, rw, rh), W * 2, H)
        for (a, b) in pts:
            if b <= cy:
                lit = (a, b - 1) not in pts or (a + 1, b) not in pts
                put(img, a, b, g.stone[2] if lit else g.stone[1])
            elif b == cy + 1:
                put(img, a, b, g.fore[0])
    # A fallen log with moss on it.
    lx, ly = 438, 147
    _shaded(img, capsule(lx - 13, ly + 1, lx + 12, ly - 1, 2.6), g.wood, band=1)
    for (dx, dy) in ((12, -2), (13, -1), (12, 0), (11, -1)):
        put(img, lx + dx, ly + dy, g.wood[3])
    put(img, lx + 12, ly - 1, g.wood[0])
    for k in range(-9, 6, 2):
        put(img, lx + k, ly - 3 + (k % 4 == 0), light)
    # Flowers in drifts: each drift one kind, with stems; bigger heads nearer the eye.
    for _ in range(15 if not g.torment else 5):
        cx, cy = rng.randrange(W), rng.randrange(path_bot + 5, H - 4)
        kind = rng.choice(g.flowers)
        for _ in range(rng.randint(3, 6)):
            x, y = cx + rng.randint(-7, 7), cy + rng.randint(-3, 3)
            if not path_bot + 3 < y < H - 1:
                continue
            put(img, x, y, kind)
            put(img, x, y + 1, light)
            if y > 142:
                put(img, x + 1, y, kind)
                put(img, x, y - 1, kind)
    if not g.torment:
        # Butterflies over the flowers.
        for _ in range(6):
            x, y = rng.randrange(W), rng.randrange(path_bot + 4, H - 12)
            wing = rng.choice((_c("bone", 7), _c("brass", 6), _c("azure", 7)))
            put(img, x - 1, y - 1, wing)
            put(img, x + 1, y - 1, wing)
            put(img, x, y, _c("ink", 2))
        # A few toadstools.
        for _ in range(5):
            x, y = rng.randrange(W), rng.randrange(path_bot + 6, H - 4)
            for k in (-1, 0, 1):
                put(img, x + k, y - 1, _c("bone", 6))
            put(img, x, y - 2, _c("bone", 7))
            put(img, x, y, _c("bone", 4))
    if g.torment:
        for _ in range(7):
            _crystal(img, rng.uniform(0, W), rng.choice([path_top - 1, rng.randrange(path_bot + 8, H - 4)]), rng)
    return img


def foreground(g: Grade, rng: random.Random) -> Image.Image:
    """Grass clumps, wheat ears and poppy heads sliding past in front of everything, near-silhouettes."""
    img = blank(W, H)
    body, rim = g.fore
    for _ in range(9):
        x = rng.uniform(0, W)
        base = H + 2
        shape = ellipse(x, base, rng.uniform(7, 13), rng.uniform(4, 7))
        for k in range(rng.randint(5, 9)):
            ang = math.radians(-90 + rng.uniform(-38, 38))
            L = rng.uniform(8, 19)
            bx = x + rng.uniform(-8, 8)
            shape = shape | polygon([(bx - 1.8, base - 2), (bx + 1.8, base - 2), (bx + math.cos(ang) * L, base - 2 + math.sin(ang) * L)])
        # Tall stems among the blades: an ear of wheat or a poppy head on each.
        for k in range(rng.randint(1, 3)):
            sx = x + rng.uniform(-10, 10)
            L = rng.uniform(17, 24)
            lean = rng.uniform(-4, 4)
            tip = (sx + lean, base - L)
            shape = shape | capsule(sx, base - 2, tip[0], tip[1], 0.6)
            shape = shape | (ellipse(tip[0], tip[1] - 2, 1.5, 3.2) if (k + int(x)) % 2 or g.torment else circle(tip[0], tip[1] - 1, 2.3))
        _silhouette(img, shape, body, rim, sun_side=1)
    return img


#: Real-time effects over the strip. Normal: pollen adrift in the last light. Torment: a slow red heartbeat, ash
#: and black petals falling, sheet lightning far off inside the clouds, eyes opening in the dark of the fields.
ATMOSPHERE = {
    "normal": [
        {"fx": "particles", "count": 22, "color": [hex_of(_c("brass", 7)), hex_of(_c("bone", 7))], "vx": 7, "vy": -3, "sway": 3,
         "alpha": 0.5, "ymax": 118},
    ],
    "torment": [
        {"fx": "pulse", "color": hex_of(_c("crimson", 3)), "period": 2600, "alpha": 0.14},
        {"fx": "particles", "count": 52, "color": [hex_of(_c("bone", 3)), hex_of(_c("ink", 0)), hex_of(_c("bone", 2)), hex_of(_c("crimson", 3))],
         "vx": -13, "vy": 25, "sway": 4, "alpha": 0.55},
        {"fx": "lightning", "every": [4500, 11000], "flash": hex_of(_c("crimson", 6)), "alpha": 0.24},
        {"fx": "eyes", "every": [2200, 6000], "hold": 1500, "color": hex_of(_c("brass", 6)), "zones": [[0, 99, 600, 108], [0, 134, 600, 154]],
         "max": 3, "size": 2, "gap": 4},
    ],
}

LAYERS = (
    ("sky", sky, 0.0),
    ("clouds", clouds, 0.05),
    ("far", far_ridge, 0.12),
    ("hills", hills, 0.25),
    ("meadow", meadow, 0.45),
    ("ground", ground, 1.0),
    ("fore", foreground, 1.35),
)


def build(grade: str, seed: int = 101) -> dict[str, Image.Image]:
    g = GRADES[grade]
    out: dict[str, Image.Image] = {}
    for i, (name, fn, _speed) in enumerate(LAYERS):
        out[name] = fn(g, random.Random(seed * 100 + i))
    return out
