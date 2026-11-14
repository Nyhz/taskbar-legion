"""World 1 backdrop — the golden meadows at dusk — in every difficulty grade.

Layers (back to front): sky, clouds, far ridge, hills, meadow (windmills and trees), ground (the path
the party walks), foreground. Each grade is the same composition with its own tones and props: the
Torment grade drains the land, swaps the sun for an eclipse and splits the sky with the Rift.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass

from PIL import Image

from ..backdrop import blank, dither_pick, fill_below, periodic, put, stamp, vertical_gradient
from ..palette import Color, color
from ..raster import capsule, circle, ellipse, polygon, rasterize, rect, rotate_shape

W, H = 600, 160
#: y of the path's centre line: the feet of every combatant rest here.
PATH_Y = 123


@dataclass(frozen=True)
class Grade:
    key: str
    sky: list[Color]
    sky_end: int
    clouds: tuple[Color, Color, Color]  # top, body, lit underside
    far: tuple[Color, Color]  # body, rim
    hills: tuple[Color, Color]
    meadow: tuple[Color, Color]
    grass: tuple[Color, Color, Color, Color]  # deep, body, light, lit tips
    path: tuple[Color, Color, Color]  # dark, body, light
    fore: tuple[Color, Color]
    flowers: tuple[Color, ...]
    torment: bool = False


def _c(r: str, i: int) -> Color:
    return color(r, i)


NORMAL = Grade(
    key="normal",
    sky=[_c("violet", 3), _c("dusk", 3), _c("dusk", 4), _c("dusk", 5), _c("dusk", 6), _c("dusk", 7), _c("dusk", 8), _c("dusk", 9)],
    sky_end=104,
    clouds=(_c("dusk", 5), _c("dusk", 6), _c("dusk", 8)),
    far=(_c("dusk", 5), _c("dusk", 7)),
    hills=(_c("dusk", 3), _c("dusk", 6)),
    meadow=(_c("dusk", 2), _c("dusk", 5)),
    grass=(_c("moss", 2), _c("moss", 3), _c("moss", 5), _c("brass", 5)),
    path=(_c("leather", 3), _c("leather", 4), _c("leather", 6)),
    fore=(_c("moss", 1), _c("moss", 3)),
    flowers=(_c("crimson", 5), _c("bone", 7), _c("brass", 6)),
)

TORMENT = Grade(
    key="torment",
    sky=[_c("ink", 0), _c("violet", 0), _c("violet", 1), _c("violet", 2), _c("violet", 3), _c("violet", 4), _c("violet", 5)],
    sky_end=104,
    clouds=(_c("ink", 2), _c("ink", 3), _c("violet", 5)),
    far=(_c("violet", 2), _c("violet", 4)),
    hills=(_c("violet", 1), _c("violet", 4)),
    meadow=(_c("ink", 1), _c("violet", 5)),
    grass=(_c("ink", 1), _c("ink", 2), _c("ink", 4), _c("violet", 6)),
    path=(_c("ink", 2), _c("ink", 3), _c("ink", 5)),
    fore=(_c("ink", 0), _c("violet", 3)),
    flowers=(_c("violet", 7),),
    torment=True,
)

GRADES = {"normal": NORMAL, "torment": TORMENT}


# ------------------------------------------------------------------------------------- helpers
def _silhouette(img: Image.Image, shape, body: Color, rim: Color, sun_side: int = 1) -> None:
    """A flat prop with a one-pixel rim on top and on the sun side (wraps horizontally)."""
    pts = rasterize(_shift(shape, img.width), img.width * 3, H)
    pts = {(x - img.width, y) for (x, y) in pts}
    for (x, y) in pts:
        lit = (x, y - 1) not in pts or (x + sun_side, y) not in pts
        put(img, x, y, rim if lit else body)


def _offset(shape_fn, dx: float):
    return shape_fn(dx)


# ------------------------------------------------------------------------------------- layers
def sky(g: Grade, rng: random.Random) -> Image.Image:
    img = blank(W, H)
    vertical_gradient(img, g.sky, 0, g.sky_end, curve=0.85)
    px = img.load()
    sx, sy = 430, 84
    if g.torment:
        # Stars, the eclipse and the Rift.
        for _ in range(70):
            x, y = rng.randrange(W), rng.randrange(0, 70)
            px[x, y] = (*(_c("bone", 7) if rng.random() < 0.6 else _c("violet", 7)), 255)
        for (x, y) in rasterize(circle(sx, sy, 17), W, H):
            px[x, y] = (*_c("violet", 6), 255)
        for (x, y) in rasterize(circle(sx, sy, 15), W, H):
            px[x, y] = (*_c("violet", 8), 255)
        for (x, y) in rasterize(circle(sx, sy, 13), W, H):
            px[x, y] = (*_c("ink", 0), 255)
        _rift(img, rng)
    else:
        # A low sun: a solid halo ring, the disc and its lit rim.
        for (x, y) in rasterize(circle(sx, sy, 22), W, H):
            if y < g.sky_end:
                px[x, y] = (*_c("dusk", 9), 255)
        for (x, y) in rasterize(circle(sx, sy, 18), W, H):
            px[x, y] = (*_c("bone", 7), 255)
        for (x, y) in rasterize(circle(sx, sy, 14), W, H):
            px[x, y] = (*_c("light", 0), 255)
    return img


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


def clouds(g: Grade, rng: random.Random) -> Image.Image:
    img = blank(W, H)
    top, body, lit = g.clouds
    for i in range(7):
        cx = rng.uniform(0, W)
        cy = rng.uniform(22, 78)
        length = rng.uniform(26, 70)
        parts = []
        for j in range(4):
            parts.append(ellipse(cx + rng.uniform(-length / 2, length / 2), cy + rng.uniform(-2, 2), rng.uniform(8, length / 2.2), rng.uniform(1.6, 3.8)))
        shape = parts[0]
        for p in parts[1:]:
            shape = shape | p
        for dx in (-W, 0, W):
            pts = rasterize(_shift(shape, dx), W, H)
            for (x, y) in pts:
                below = (x, y + 1) not in pts
                above = (x, y - 1) not in pts
                put(img, x, y, lit if below else (top if above else body))
    return img


def _shift(shape, dx: float):
    from ..raster import Shape

    x0, y0, x1, y1 = shape.bbox
    return Shape(lambda x, y: shape.contains(x - dx, y), (x0 + dx, y0, x1 + dx, y1))


def far_ridge(g: Grade, rng: random.Random) -> Image.Image:
    img = blank(W, H)
    f = periodic(W, rng, [(1, 5.0), (2, 4.0), (3, 3.0), (7, 1.6), (13, 0.7)])
    fill_below(img, lambda x: 88 + f(x), g.far[0], g.far[1], y_end=112)
    return img


def hills(g: Grade, rng: random.Random) -> Image.Image:
    img = blank(W, H)
    f = periodic(W, rng, [(2, 4.0), (3, 3.2), (5, 1.8), (11, 0.6)])
    fill_below(img, lambda x: 98 + f(x), g.hills[0], g.hills[1], y_end=114)
    return img


def meadow(g: Grade, rng: random.Random) -> Image.Image:
    """Nearer rolling land with windmills and tree clumps, backlit."""
    img = blank(W, H)
    f = periodic(W, rng, [(1, 2.4), (3, 2.6), (6, 1.0)])
    contour = lambda x: 104 + f(x)  # noqa: E731
    body, rim = g.meadow
    for wx in (120, 410):
        _windmill(img, wx, int(contour(wx)) + 2, body, rim, broken=g.torment, turn=rng.uniform(0, 45))
    for _ in range(9):
        tx = rng.uniform(0, W)
        if g.torment:
            _dead_tree(img, tx, contour(tx) + 1, body, rim, rng)
        else:
            _tree(img, tx, contour(tx) + 1, body, rim, rng)
    fill_below(img, contour, body, rim, y_end=118)
    return img


def _windmill(img: Image.Image, x: float, base: int, body: Color, rim: Color, broken: bool, turn: float) -> None:
    tower = polygon([(x - 7, base), (x + 7, base), (x + 4, base - 30), (x - 4, base - 30)])
    roof = polygon([(x - 6, base - 29), (x + 6, base - 29), (x + 1, base - 38), (x - 1, base - 38)])
    _silhouette(img, tower | roof, body, rim)
    hx, hy = x + 5, base - 31
    for k in range(4):
        if broken and k in (1, 2):
            continue
        ang = turn + k * 90
        arm = rotate_shape(rect(hx, hy - 0.6, hx + 19, hy + 0.6), ang, hx, hy)
        sail = rotate_shape(rect(hx + 6, hy - 3.6, hx + 19, hy - 0.6), ang, hx, hy)
        _silhouette(img, arm | sail, body, rim)
    _silhouette(img, circle(hx, hy, 1.6), body, rim)
    # A lit window.
    if not broken:
        put(img, int(x), base - 18, color("brass", 6))
        put(img, int(x), base - 17, color("brass", 5))


def _tree(img: Image.Image, x: float, base: float, body: Color, rim: Color, rng: random.Random) -> None:
    h = rng.uniform(10, 18)
    trunk = rect(x - 1, base - h * 0.5, x + 1, base)
    crown = circle(x, base - h * 0.7, h * 0.36)
    for _ in range(3):
        crown = crown | circle(x + rng.uniform(-h * 0.35, h * 0.35), base - h * rng.uniform(0.55, 0.85), h * rng.uniform(0.22, 0.32))
    _silhouette(img, trunk | crown, body, rim)


def _dead_tree(img: Image.Image, x: float, base: float, body: Color, rim: Color, rng: random.Random) -> None:
    h = rng.uniform(10, 18)
    shape = capsule(x, base, x + rng.uniform(-1, 1), base - h, 1.0)
    for _ in range(4):
        y0 = base - h * rng.uniform(0.4, 0.95)
        ang = rng.uniform(-2.6, -0.5)
        L = rng.uniform(3, 7)
        shape = shape | capsule(x, y0, x + math.cos(ang) * L, y0 + math.sin(ang) * L, 0.5)
    _silhouette(img, shape, body, rim)


def ground(g: Grade, rng: random.Random) -> Image.Image:
    """The walkable meadow: grass bank, fence, the dirt path and the near grass below it."""
    img = blank(W, H)
    px = img.load()
    deep, grass, light, tips = g.grass
    dark_p, path, light_p = g.path
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
    # Blades along the top edge, lit tips.
    for x in range(W):
        if rng.random() < 0.7:
            hgt = rng.randint(1, 4)
            for k in range(hgt):
                put(img, x, top[x] - 1 - k, tips if k == hgt - 1 else light)
    # Tufts in the near grass: lit blades fanning up, denser and brighter near the path.
    for _ in range(150):
        x = rng.randrange(W)
        y = int(path_bot + 3 + (H - path_bot - 3) * rng.random() ** 1.6)
        near = 1 - (y - path_bot) / (H - path_bot)
        hgt = rng.randint(2, 3 + int(near * 3))
        for k in range(rng.randint(2, 4)):
            lean = rng.choice((-1, 0, 1))
            for j in range(hgt):
                c = tips if (j == hgt - 1 and near > 0.8 and rng.random() < 0.2) else (light if near > 0.65 else grass)
                put(img, x + k + (lean if j > hgt // 2 else 0), y - j, c)
    # Fence posts and rails along the far side of the path.
    for i in range(0, W, 46):
        fx = i + 14
        if g.torment and (i // 46) % 3 == 1:
            continue
        lean = (rng.random() - 0.5) * (4 if g.torment else 1)
        post = polygon([(fx - 1.5, path_top + 1), (fx + 1.5, path_top + 1), (fx + 1.5 + lean, path_top - 13), (fx - 1.5 + lean, path_top - 13)])
        _silhouette(img, post, g.path[0], g.path[2], sun_side=1)
    for ry in (path_top - 10, path_top - 5):
        for x in range(W):
            if g.torment and (x // 46) % 3 in (0, 1) and (x % 46) > 20:
                continue
            put(img, x, ry, g.path[1])
            put(img, x, ry + 1, g.path[0])
    # Flowers in the bank and the near grass.
    for _ in range(60 if not g.torment else 18):
        x = rng.randrange(W)
        y = rng.choice([rng.randrange(top[x] + 1, path_top - 1), rng.randrange(path_bot + 3, H - 2)])
        put(img, x, y, rng.choice(g.flowers))
    if g.torment:
        for _ in range(7):
            _crystal(img, rng.uniform(0, W), rng.choice([path_top - 1, rng.randrange(path_bot + 8, H - 4)]), rng)
    return img


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


def foreground(g: Grade, rng: random.Random) -> Image.Image:
    """Grass clumps and weeds sliding past in front of everything, near-silhouettes."""
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
        _silhouette(img, shape, body, rim, sun_side=1)
    return img


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
