"""World 2 backdrop — the old moss forest, light filtering through the canopy over a low mist — in every
difficulty grade.

Layers (back to front): sky (the glow behind the forest, shafts of light, birds), far trunks (pale boles, a ruined
arch, deer), middle trunks (shaded boles with boughs and leaves, a windfall), mist, near trunks (the old giants:
bark, roots, moss, fungi, ivy, a hollow with eyes, firefly lanterns, webs, a dolmen shrine and an overgrown
statue), ground (the damp path the party walks, a rivulet passing under it, a brook, a fallen log) and foreground
(ferns below, leaves and a web above). The forest is backlit: the further a trunk, the paler; every bole has a
shadow side, a body, a half-light and a lit rim towards the glow. Low mist rises off the floor: from the knees
of the trees down, the middle and near trunks dissolve step by step into its pale teal (`_veil`), which is also
what keeps the band behind the fighters calm.

The Torment grade is ROT: the canopy is dead, the golden glow is a poisonous green under a black-green dark, the
boles are wet and black and sink into a pallid, bone-grey fog, the lanterns and fungi glow a wrong pale green, the
water is sludge and the path is grey mud. Only the Rift and its crystals are violet.

`ATMOSPHERE` is what the strip runs in real time: motes and falling leaves in the Normal grade; in Torment, eyes
that open in the dark between the trunks, slow spores and a rare green sheet-flash.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass

from PIL import Image

from ..backdrop import BAYER4, blank, dither_pick, fill_below, periodic, put, vertical_gradient
from ..palette import RAMPS, Color, color, hex_of
from ..raster import Shape, capsule, circle, ellipse, polygon, rasterize
from .backdrop_w01 import H, PATH_Y, W, _crystal, _rift, _shift

__all__ = ["W", "H", "PATH_Y", "LAYERS", "GRADES", "PREVIEW_BG", "ATMOSPHERE", "build"]

#: The tone creature previews of this world are shown on.
PREVIEW_BG: Color = color("moss", 4)

#: Every palette tone → the next lighter tone of its ramp (light shafts and pools brighten what they cross).
LIGHTER: dict[Color, Color] = {color(r, i): color(r, i + 1) for r, tones in RAMPS.items() for i in range(len(tones) - 1)}

#: Shadow side, body, half-light, lit rim.
Tones = tuple[Color, Color, Color, Color]
Pts = set[tuple[int, int]]


@dataclass(frozen=True)
class Grade:
    key: str
    sky: list[Color]
    sky_end: int
    far: Tones
    mid: Tones
    near: Tones
    moss: tuple[Color, Color, Color]  # moss cushions: shade, body, lit
    mist: tuple[Color, Color]  # body, lit top
    grass: tuple[Color, Color, Color, Color]  # deep, body, light, lit tips
    path: tuple[Color, Color, Color]  # dark, body, light
    root: tuple[Color, Color]  # underside, top
    stone: Tones
    rune: Color
    water: tuple[Color, Color, Color]  # deep, body, glint
    wood: tuple[Color, Color, Color]  # dark, body, light
    lamp: tuple[Color, Color]  # core, halo
    web: Color
    fore: tuple[Color, Color]
    caps: tuple[Color, ...]  # mushroom caps
    leaves: tuple[Color, ...]  # fallen leaves
    flowers: tuple[Color, ...]
    motes: Color
    torment: bool = False


def _c(r: str, i: int) -> Color:
    return color(r, i)


NORMAL = Grade(
    key="normal",
    sky=[_c("moss", 2), _c("moss", 3), _c("moss", 4), _c("moss", 5), _c("moss", 6), _c("moss", 7), _c("moss", 8), _c("moss", 8)],
    sky_end=112,
    far=(_c("moss", 5), _c("moss", 5), _c("moss", 6), _c("moss", 6)),
    mid=(_c("moss", 2), _c("moss", 3), _c("moss", 4), _c("moss", 5)),
    near=(_c("moss", 0), _c("moss", 1), _c("moss", 2), _c("moss", 3)),
    moss=(_c("moss", 4), _c("moss", 5), _c("moss", 6)),
    mist=(_c("sea", 7), _c("sea", 8)),
    grass=(_c("moss", 1), _c("moss", 2), _c("moss", 4), _c("moss", 7)),
    path=(_c("leather", 1), _c("leather", 2), _c("leather", 4)),
    root=(_c("leather", 2), _c("leather", 5)),
    stone=(_c("ink", 3), _c("ink", 4), _c("ink", 5), _c("ink", 7)),
    rune=_c("sea", 7),
    water=(_c("sea", 1), _c("sea", 3), _c("sea", 6)),
    wood=(_c("leather", 1), _c("leather", 3), _c("leather", 5)),
    lamp=(_c("brass", 7), _c("brass", 5)),
    web=_c("moss", 6),
    fore=(_c("moss", 0), _c("moss", 2)),
    caps=(_c("crimson", 4), _c("crimson", 5), _c("brass", 5)),
    leaves=(_c("brass", 4), _c("crimson", 4), _c("brass", 3)),
    flowers=(_c("bone", 7), _c("azure", 6), _c("crimson", 6)),
    motes=_c("brass", 7),
)

# Rot: a black-green dark over a poisonous green glow, a bone-grey fog on the floor; nothing warm left. Violet is
# kept for the Rift and its crystals.
TORMENT = Grade(
    key="torment",
    sky=[_c("ink", 0), _c("moss", 0), _c("moss", 1), _c("moss", 2), _c("moss", 3), _c("moss", 4), _c("moss", 5), _c("moss", 6), _c("moss", 6)],
    sky_end=112,
    far=(_c("moss", 3), _c("moss", 3), _c("moss", 4), _c("moss", 5)),
    mid=(_c("moss", 0), _c("moss", 1), _c("moss", 2), _c("moss", 3)),
    near=(_c("ink", 0), _c("ink", 0), _c("moss", 0), _c("moss", 2)),
    moss=(_c("bone", 1), _c("bone", 2), _c("bone", 4)),
    mist=(_c("bone", 5), _c("bone", 6)),
    grass=(_c("ink", 0), _c("moss", 0), _c("moss", 1), _c("moss", 4)),
    path=(_c("bone", 0), _c("bone", 1), _c("bone", 2)),
    root=(_c("ink", 1), _c("bone", 3)),
    stone=(_c("ink", 1), _c("ink", 2), _c("ink", 3), _c("moss", 5)),
    rune=_c("moss", 7),
    water=(_c("moss", 0), _c("moss", 2), _c("moss", 6)),
    wood=(_c("ink", 1), _c("bone", 1), _c("bone", 3)),
    lamp=(_c("moss", 8), _c("moss", 6)),
    web=_c("moss", 3),
    fore=(_c("ink", 0), _c("moss", 1)),
    caps=(_c("moss", 7), _c("moss", 8), _c("bone", 6)),
    leaves=(_c("bone", 2), _c("moss", 2)),
    flowers=(_c("bone", 5),),
    motes=_c("moss", 8),
    torment=True,
)

GRADES = {"normal": NORMAL, "torment": TORMENT}


# ------------------------------------------------------------------------------------- helpers
def _pts(shape: Shape) -> Pts:
    """Pixels of a shape, rasterised on a triple-wide canvas so props near an edge come out whole (put() wraps)."""
    return {(x - W, y) for (x, y) in rasterize(_shift(shape, W), W * 3, H)}


def _solid(img: Image.Image, shape: Shape, t: Tones, half: int = 2, shade: int = 2) -> Pts:
    """A form lit from behind and to the right: a rim on its lit edge, a band of half-light inside it and along the
    top, a shadow band on the other side, the body between."""
    pts = _pts(shape)
    for (x, y) in pts:
        if (x + 1, y) not in pts:
            c = t[3]
        elif any((x + k, y) not in pts for k in range(2, half + 2)) or (x, y - 1) not in pts:
            c = t[2]
        elif any((x - k, y) not in pts for k in range(1, shade + 1)):
            c = t[0]
        else:
            c = t[1]
        put(img, x, y, c)
    return pts


def _foliage(img: Image.Image, shape: Shape, t: Tones, rng: random.Random, dapple: float = 0.05) -> Pts:
    """Leaves hanging against the light: the underside glows, and the mass is broken by lighter and darker dapples."""
    pts = _pts(shape)
    for (x, y) in pts:
        if (x, y + 1) not in pts:
            c = t[3]
        elif (x, y + 2) not in pts:
            c = t[2]
        elif (x, y + 5) in pts and (x - 3, y) in pts and (x + 3, y) in pts and rng.random() < dapple:
            c = t[2] if rng.random() < 0.5 else t[0]
        else:
            c = t[1]
        put(img, x, y, c)
    return pts


def _canopy(img: Image.Image, rng: random.Random, t: Tones, depth: float, lumps: int) -> None:
    """Leaf masses hanging into the top of the frame, their lower edge scalloped."""
    for _ in range(lumps):
        x = rng.uniform(0, W)
        half = rng.uniform(24, 46)
        shape = ellipse(x, -2, half, depth * rng.uniform(0.5, 0.9))
        for k in range(int(half * 2 / 7)):
            lx = x - half + 4 + k * 7 + rng.uniform(-2, 2)
            reach = depth * (1 - ((lx - x) / half) ** 2) * rng.uniform(0.6, 1.0)
            shape = shape | circle(lx, reach * 0.8, rng.uniform(3.5, 6.5))
        _foliage(img, shape, t, rng)


def _tree(img: Image.Image, x: float, base: float, width: float, t: Tones, rng: random.Random, roots: float = 0.0, boughs: int = 0,
          bark: int = 0, knots: int = 0, half: int = 2, shade: int = 2, bare: bool = False) -> list[tuple[float, float]]:
    """An old bole rising out of the frame: it leans and wavers, flares into roots, carries a few boughs, and its
    bark is grooved. Returns the tips of its boughs (where leaves or lanterns hang)."""
    lean = rng.uniform(-0.05, 0.05) * base
    w0, w1 = width / 2, width * 0.36
    ph, wob = rng.uniform(0, 6), width * 0.07
    flare = width * 0.9

    def centre(y: float) -> float:
        return x + lean * (1 - max(0.0, y) / base) + wob * math.sin(y / 21.0 + ph)

    left, right = [], []
    for y in range(-4, int(base) + 4, 5):
        k = max(0.0, min(1.0, y / base))
        hw = w1 + (w0 - w1) * k * k
        if roots and y > base - flare:
            hw += roots * width * 0.35 * ((y - (base - flare)) / flare) ** 2
        left.append((centre(y) - hw, y))
        right.append((centre(y) + hw, y))
    shape = polygon(left + right[::-1])
    if roots:
        # Roots: each one leaves the bole above the ground, arcs out and dives.
        for sgn in (-1, 1):
            for _ in range(rng.randint(1, 2)):
                r = width * roots * rng.uniform(0.7, 1.3)
                y0 = base - width * rng.uniform(0.3, 0.75)
                x0 = x + sgn * w0 * 0.8
                xm, x1 = x0 + sgn * r * 0.55, x0 + sgn * r
                thick = max(1.0, width * 0.11)
                shape = shape | capsule(x0, y0, xm, base - 2.0, thick, thick * 0.8) | capsule(xm, base - 2.0, x1, base + 2.0, thick * 0.8, 0.6)
    tips: list[tuple[float, float]] = []
    for _ in range(boughs):
        y0 = rng.uniform(16, base * 0.6)
        sgn = rng.choice((-1, 1))
        L = rng.uniform(width * 1.3, width * 2.8)
        x0 = centre(y0)
        xm, ym = x0 + sgn * L * 0.55, y0 - L * rng.uniform(0.25, 0.5)
        x1, y1 = x0 + sgn * L, ym - L * rng.uniform(0.0, 0.3)
        thick = max(0.8, width * 0.15)
        shape = shape | capsule(x0, y0, xm, ym, thick, thick * 0.7) | capsule(xm, ym, x1, y1, thick * 0.7, 0.5)
        if bare or rng.random() < 0.6:
            shape = shape | capsule(xm, ym, xm + sgn * L * 0.25, ym - L * 0.4, max(0.5, thick * 0.5), 0.4)
        tips.append((x1, y1))
    pts = _solid(img, shape, t, half, shade)
    for _ in range(bark):  # grooves: a dark line with a lit ridge beside it
        bx = int(centre(60) + rng.uniform(-w1, w1) * 0.8)
        y0 = int(rng.uniform(6, base - 26))
        for y in range(y0, y0 + rng.randint(7, 22)):
            if all((bx + d, y) in pts for d in (-2, -1, 0, 1, 2, 3)):
                put(img, bx, y, t[0])
                if (y - y0) % 3:
                    put(img, bx + 1, y, t[2])
    for _ in range(knots):  # knots: an eye of dark wood, lit underneath
        ky = int(rng.uniform(26, base - 22))
        kx = int(centre(ky) + rng.uniform(-w1, w1) * 0.4)
        for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1), (-1, 0), (2, 1), (0, -1)):
            if (kx + dx - 2, ky + dy) in pts and (kx + dx + 3, ky + dy) in pts:
                put(img, kx + dx, ky + dy, t[0])
        for dx in (-1, 0, 1, 2):
            if (kx + dx - 2, ky + 2) in pts and (kx + dx + 3, ky + 2) in pts:
                put(img, kx + dx, ky + 2, t[2])
    return tips


def _leaf_cluster(img: Image.Image, at: tuple[float, float], size: float, t: Tones, rng: random.Random) -> None:
    """A spray of leaves at the end of a bough: flat tufts in layers, each lit from underneath."""
    for k in range(rng.randint(3, 5)):
        x = at[0] + rng.uniform(-size, size) * 0.9
        y = at[1] + rng.uniform(-0.45, 0.35) * size
        rx = size * rng.uniform(0.45, 0.8)
        shape = ellipse(x, y, rx, max(1.4, size * 0.2))
        for _ in range(2):
            shape = shape | ellipse(x + rng.uniform(-rx, rx) * 0.7, y - rng.uniform(0.5, 1.6), rx * rng.uniform(0.35, 0.55), max(1.2, size * 0.16))
        _foliage(img, shape, t, rng, dapple=0.0)


def _bush(img: Image.Image, x: float, base: float, size: float, t: Tones, rng: random.Random) -> None:
    shape = circle(x, base, size)
    for _ in range(3):
        shape = shape | circle(x + rng.uniform(-size, size) * 1.2, base + rng.uniform(-0.2, 0.3) * size, size * rng.uniform(0.5, 0.9))
    _solid(img, shape, t, half=1, shade=1)


def _fern(img: Image.Image, x: int, base: int, rng: random.Random, body: Color, tips: Color, size: int, rib: Color | None = None) -> None:
    """A fern: fronds arching out from one point, each a stem with leaflets on both sides, drooping at the tip."""
    n = rng.randint(5, 7)
    for k in range(n):
        ang = math.radians(-90 + (k - (n - 1) / 2) * rng.uniform(22, 30))
        L = rng.uniform(size * 0.65, size)
        for j in range(int(L)):
            u = j / L
            fx = x + math.cos(ang) * j
            fy = base + math.sin(ang) * j + 4.5 * u * u * abs(math.cos(ang))
            put(img, int(fx), int(fy), rib if rib is not None and u < 0.6 else (tips if u > 0.72 else body))
            if j % 2 == 1 and u < 0.9:
                reach = 2 if u < 0.55 and size > 8 else 1
                for r in range(1, reach + 1):
                    put(img, int(fx), int(fy) - r, tips if u > 0.72 and r == reach else body)
                    if abs(math.cos(ang)) < 0.75:
                        put(img, int(fx) + (r if math.cos(ang) < 0 else -r), int(fy), body)


def _mushroom(img: Image.Image, x: int, y: int, cap: Color, wide: bool) -> None:
    """A domed cap wider than its stem, standing on (x, y)."""
    for k in range(-2 if wide else -1, 3 if wide else 2):
        put(img, x + k, y - 1, cap)
    for k in range(-1 if wide else 0, 2 if wide else 1):
        put(img, x + k, y - 2, cap)
    if wide:
        put(img, x + 1, y - 2, _c("bone", 7))
    put(img, x, y, _c("bone", 5))


def _moss_pad(img: Image.Image, x: float, y: float, rx: float, ry: float, g: Grade, pts: Pts | None = None) -> None:
    """A cushion of moss: shaded below, lit above, speckled."""
    for (a, b) in _pts(ellipse(x, y, rx, ry)):
        if pts is not None and (a, b) not in pts:
            continue
        v = (b - y) / max(1.0, ry)
        c = g.moss[2] if v < -0.35 or (a * 3 + b * 5) % 11 == 0 else (g.moss[0] if v > 0.45 else g.moss[1])
        put(img, a, b, c)


def _web(img: Image.Image, cx: float, cy: float, r: float, a0: float, a1: float, tone: Color) -> None:
    """A spider's web: a few spokes fanning between two angles and two sagging threads across them, drawn as
    broken hairlines so it stays a glint in the light, not a net."""
    spokes = [math.radians(a0 + (a1 - a0) * i / 4) for i in range(5)]
    for n, a in enumerate(spokes):
        for j in range(2, int(r)):
            if (j + n) % 3:
                put(img, int(cx + math.cos(a) * j), int(cy + math.sin(a) * j), tone)
    for ring in (0.55, 0.92):
        for a, b in zip(spokes, spokes[1:]):
            steps = max(4, int(r * ring * abs(b - a)))
            for j in range(steps + 1):
                u = j / steps
                ang = a + (b - a) * u
                rr = r * ring * (1 - 0.16 * math.sin(math.pi * u))
                if j % 2 == 0:
                    put(img, int(cx + math.cos(ang) * rr), int(cy + math.sin(ang) * rr), tone)


def _lantern(img: Image.Image, x: int, y0: int, length: int, g: Grade, thread: Color, rng: random.Random) -> None:
    """A jar of fireflies hung on a thread: the old forest's lamps. In Torment they are out."""
    for y in range(y0, y0 + length):
        put(img, x + (1 if (y // 9) % 2 and y > y0 + 4 else 0), y, thread)
    y = y0 + length
    core, halo = g.lamp
    for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1), (0, 2), (1, 2)):
        put(img, x + dx, y + dy, core if not g.torment else halo)
    for dx, dy in ((-1, 0), (2, 0), (-1, 1), (2, 1), (-1, 2), (2, 2), (0, 3), (1, 3)):
        put(img, x + dx, y + dy, halo if not g.torment else thread)
    put(img, x, y - 1, thread)
    put(img, x + 1, y - 1, thread)
    if not g.torment:
        put(img, x, y + 1, _c("light", 0))
        for _ in range(5):  # the ones that got out
            put(img, x + rng.randint(-7, 8), y + rng.randint(-6, 8), core)
        for dx, dy in ((-3, 1), (4, 1), (0, 5), (1, -3)):
            put(img, x + dx, y + dy, halo)


def _light_pool(img: Image.Image, cx: float, cy: float, rx: float, ry: float, y0: int, y1: int) -> None:
    """Where a shaft of light lands: the ground is a tone brighter, two at the heart of the pool."""
    px = img.load()
    for inner in (1.0, 0.5):
        for (a, b) in _pts(ellipse(cx, cy, rx * inner, ry * inner)):
            if y0 <= b < y1 and 0 <= b < H and px[a % W, b][3]:
                c = px[a % W, b][:3]
                if c in LIGHTER:
                    px[a % W, b] = (*LIGHTER[c], 255)


# ------------------------------------------------------------------------------------- layers
def sky(g: Grade, rng: random.Random) -> Image.Image:
    img = blank(W, H)
    vertical_gradient(img, g.sky, 0, g.sky_end, curve=0.8)
    px = img.load()
    for y in range(g.sky_end, H):
        for x in range(W):
            px[x, y] = (*g.sky[-1], 255)
    if g.torment:
        for _ in range(80):
            x, y = rng.randrange(W), rng.randrange(0, 74)
            px[x, y] = (*(_c("bone", 6) if rng.random() < 0.6 else _c("moss", 7)), 255)
        _rift(img, rng)
        return img
    # Shafts of light slanting down through gaps in the canopy: a soft band with a brighter heart.
    for x0, wid in ((96, 22), (212, 12), (338, 32), (468, 16), (572, 9)):
        for lo, hi in ((0.0, 1.0), (0.3, 0.62)):
            for y in range(0, g.sky_end):
                start = x0 - y * 0.42
                for x in range(int(start + wid * lo), int(start + wid * hi)):
                    c = px[x % W, y][:3]
                    if c in LIGHTER:
                        px[x % W, y] = (*LIGHTER[c], 255)
    # Birds crossing the glow, far off.
    for bx, by in ((286, 58), (296, 53), (305, 60), (318, 55), (512, 46), (522, 50)):
        tone = _c("moss", 4)
        for dx, dy in ((-2, -1), (-1, 0), (0, 1), (1, 0), (2, -1)):
            px[(bx + dx) % W, by + dy] = (*tone, 255)
    return img


STAG = [
    ".#..#.........",
    "##.##.........",
    ".###..........",
    "..##..........",
    "..###.........",
    "...##########.",
    "...###########",
    "...###########",
    "...#.#....#.#.",
    "...#.#....#.#.",
    "...#.#....#.#.",
]
DOE = [
    "..........##.",
    ".#########.#.",
    "###########..",
    "###########..",
    "##.#....#.#..",
    "#..#....#.#..",
    ".#.#....#.#..",
]


def _animal(img: Image.Image, rows: list[str], x: int, base: int, body: Color, rim: Color) -> None:
    for j, row in enumerate(rows):
        for i, ch in enumerate(row):
            if ch == "#":
                top = j == 0 or rows[j - 1][i] != "#"
                put(img, x + i, base - len(rows) + j, rim if top else body)


def far_trunks(g: Grade, rng: random.Random) -> Image.Image:
    img = blank(W, H)
    t = g.far
    f = periodic(W, rng, [(2, 1.6), (5, 1.2), (9, 0.6)])
    contour = lambda x: 101 + f(x)  # noqa: E731
    # The furthest boles: hairlines, almost the colour of the light.
    for _ in range(20):
        x = rng.uniform(0, W)
        for (a, b) in _pts(polygon([(x - 1.0, contour(x) + 2), (x + 1.0, contour(x) + 2), (x + 0.6, -4), (x - 0.6, -4)])):
            put(img, a, b, t[2])
    # A ruined gateway out in the haze: two piers and what is left of the arch.
    ax, ab = 418.0, contour(418) + 2
    gate = polygon([(ax - 13, ab), (ax - 8, ab), (ax - 8, ab - 22), (ax - 13, ab - 22)]) | polygon([(ax + 8, ab), (ax + 13, ab), (ax + 13, ab - 17), (ax + 8, ab - 17)])
    arch = (ellipse(ax, ab - 22, 13.5, 9.0) - ellipse(ax, ab - 21, 8.2, 5.4)) & polygon([(ax - 14, ab - 34), (ax + (-2 if g.torment else 6), ab - 34), (ax + (-4 if g.torment else 9), ab - 21), (ax - 14, ab - 21)])
    _solid(img, gate | arch, t, half=1, shade=1)
    for _ in range(24):
        x = rng.uniform(0, W)
        tips = _tree(img, x, contour(x) + 2, rng.uniform(3.2, 6.0), t, rng, boughs=1, half=1, shade=1, bare=g.torment)
        if not g.torment and rng.random() < 0.7:
            _leaf_cluster(img, tips[0], rng.uniform(5, 8), t, rng)
    if not g.torment:
        _canopy(img, rng, t, 20, 9)
    for _ in range(14):
        x = rng.uniform(0, W)
        _bush(img, x, contour(x) + 1, rng.uniform(2.5, 4.5), t, rng)
    fill_below(img, contour, t[1], t[2], y_end=116)
    if not g.torment:
        # Deer on the far bank, grazing in the light.
        dx = 146
        _animal(img, STAG, dx, int(contour(dx + 7)), _c("moss", 4), _c("moss", 7))
        _animal(img, DOE, dx + 22, int(contour(dx + 28)), _c("moss", 4), _c("moss", 7))
    return img


def mid_trunks(g: Grade, rng: random.Random) -> Image.Image:
    img = blank(W, H)
    t = g.mid
    f = periodic(W, rng, [(1, 1.4), (3, 1.8), (7, 0.9)])
    contour = lambda x: 106 + f(x)  # noqa: E731
    # A windfall: a bole that came down and lodged against its neighbours.
    wx = 262.0
    _solid(img, capsule(wx - 30, contour(wx - 30) + 1, wx + 34, contour(wx) - 30, 3.4, 2.4), t, half=1, shade=2)
    for k in range(3):
        sx, sy = wx - 12 + k * 15, contour(wx) - 9 - k * 7.0
        _solid(img, capsule(sx, sy, sx - 5, sy - 8 - k, 0.9, 0.4), t, half=1, shade=1)
    for i in range(12):
        x = i * W / 12 + rng.uniform(-16, 16)
        tips = _tree(img, x, contour(x) + 2, rng.uniform(6.5, 12.0), t, rng, roots=0.5, boughs=3 if g.torment else 2, bark=2, knots=1, bare=g.torment)
        if not g.torment:
            for tip in tips:
                _leaf_cluster(img, tip, rng.uniform(7, 11), t, rng)
    # The elder of this plane: a bole three times the girth of the rest, with a door and a window cut in it and
    # shelves of fungus for steps — somebody lives, or lived, in it.
    ex = 468.0
    eb = contour(ex) + 2
    _tree(img, ex, eb, 24.0, t, rng, roots=0.7, boughs=3, bark=6, knots=1, half=3, shade=4, bare=g.torment)
    lit, frame = (g.lamp[0], t[0]) if not g.torment else (t[0], t[0])
    for (a_, b_) in _pts(ellipse(ex + 1, eb - 34, 3.2, 3.6)):  # the window
        put(img, a_, b_, lit)
    for (a_, b_) in _pts(ellipse(ex + 1, eb - 34, 4.2, 4.6) - ellipse(ex + 1, eb - 34, 3.2, 3.6)):
        put(img, a_, b_, frame)
    for k_ in range(-3, 4):
        put(img, int(ex + 1), int(eb - 34) + k_, frame)
        put(img, int(ex + 1) + k_, int(eb - 34), frame)
    door = polygon([(ex - 6, eb - 1), (ex - 6, eb - 11), (ex - 3.5, eb - 15), (ex - 1, eb - 11), (ex - 1, eb - 1)])
    for (a_, b_) in _pts(door):
        put(img, a_, b_, t[0])
    put(img, int(ex - 2), int(eb - 7), lit)
    if not g.torment:
        put(img, int(ex + 1) - 1, int(eb - 34) - 1, _c("light", 0))
        for k_ in range(4):  # fungus steps up to the window
            for d_ in range(4):
                put(img, int(ex + 7 + k_ * 2) + d_, int(eb - 8 - k_ * 6), g.caps[k_ % len(g.caps)])
            put(img, int(ex + 8 + k_ * 2), int(eb - 7 - k_ * 6), t[3])
    # Creepers hanging in loops between the boughs.
    for _ in range(7):
        vx, span, sag = rng.uniform(0, W), rng.uniform(22, 44), rng.uniform(5, 11)
        y0 = rng.uniform(10, 34)
        for j in range(int(span)):
            u = j / span
            put(img, int(vx + j), int(y0 + sag * math.sin(math.pi * u)), t[1])
            if not g.torment and j % 6 == 3:
                put(img, int(vx + j), int(y0 + sag * math.sin(math.pi * u)) + 1, t[3])
    if not g.torment:
        _canopy(img, rng, t, 30, 9)
    for _ in range(18):
        x = rng.uniform(0, W)
        _bush(img, x, contour(x) + 1, rng.uniform(3, 6), t, rng)
    for _ in range(10):
        x = rng.randrange(W)
        _fern(img, x, int(contour(x)) + 1, rng, t[1], t[3], 8)
    fill_below(img, contour, t[1], t[3], y_end=118)
    return img


def mist(g: Grade, rng: random.Random) -> Image.Image:
    """Low mist: long flat streaks between the middle and the near trees."""
    img = blank(W, H)
    body, lit = g.mist
    for _ in range(15 if g.torment else 9):  # the rot's fog lies thicker
        cx, cy = rng.uniform(0, W), rng.uniform(92, 109)
        length = rng.uniform(46, 120)
        shape = ellipse(cx, cy, length / 2, rng.uniform(1.2, 2.4))
        for _ in range(3):
            shape = shape | ellipse(cx + rng.uniform(-length / 2, length / 2), cy + rng.uniform(-1.5, 1.5), rng.uniform(10, length / 2.4), rng.uniform(1.0, 2.6))
        pts = _pts(shape)
        for (x, y) in pts:
            put(img, x, y, lit if (x, y - 1) not in pts else body)
    return img


def _dolmen(img: Image.Image, x: float, base: float, g: Grade, rng: random.Random) -> None:
    """A shrine of three stones: two uprights with runes that still glow, a capstone, an offering between them."""
    left = polygon([(x - 11, base), (x - 5, base), (x - 5.5, base - 19), (x - 9, base - 21), (x - 11.5, base - 18)])
    right = polygon([(x + 5, base), (x + 11, base), (x + 11.5, base - 17), (x + 8, base - 20), (x + 5.5, base - 18)])
    _solid(img, left, g.stone, half=1, shade=2)
    _solid(img, right, g.stone, half=1, shade=2)
    if g.torment:  # the capstone has slid off and lies against one upright
        cap = polygon([(x - 4, base - 1), (x + 3, base - 12), (x + 7, base - 10), (x + 1, base + 1)])
    else:
        cap = polygon([(x - 14, base - 20), (x + 14, base - 18), (x + 13, base - 23), (x - 12, base - 25)])
    cap_pts = _solid(img, cap, g.stone, half=1, shade=2)
    for sx, sy in ((x - 8, base - 15), (x + 8, base - 14)):
        for dx, dy in ((0, 0), (0, 1), (1, 2), (0, 3), (-1, 4), (0, 5), (0, 6), (1, 6), (-1, 1)):
            put(img, int(sx) + dx, int(sy) + dy, g.rune)
    if not g.torment:
        _moss_pad(img, x - 3, base - 24, 9, 2.2, g, cap_pts)
        # The offering: a bowl with a light in it.
        for dx in (-2, -1, 0, 1, 2):
            put(img, int(x) + dx, int(base) - 3, g.stone[3])
        for dx in (-1, 0, 1):
            put(img, int(x) + dx, int(base) - 2, g.stone[1])
            put(img, int(x) + dx, int(base) - 4, g.lamp[0])
        put(img, int(x), int(base) - 5, _c("light", 0))
        put(img, int(x) - 2, int(base) - 7, g.lamp[1])
        put(img, int(x) + 3, int(base) - 6, g.lamp[1])


def _statue(img: Image.Image, x: float, base: float, g: Grade, rng: random.Random) -> None:
    """A hooded figure in stone, kneeling over a bowl, half taken by moss and ivy. In Torment its head has fallen."""
    plinth = polygon([(x - 9, base), (x + 9, base), (x + 8, base - 4), (x - 8, base - 4)])
    robe = polygon([(x - 7, base - 4), (x + 6, base - 4), (x + 5, base - 12), (x + 2, base - 18), (x - 3, base - 19), (x - 6, base - 13)])
    arm = capsule(x + 1, base - 14, x + 7, base - 10, 1.6, 1.3)
    figure = plinth | robe | arm
    if not g.torment:
        figure = figure | ellipse(x - 0.5, base - 21.5, 3.6, 3.6) | polygon([(x - 4.5, base - 21), (x - 3, base - 25.5), (x + 2, base - 25), (x + 3.5, base - 21)])
    else:
        figure = figure | ellipse(x + 13, base - 2.5, 3.4, 3.0)
    pts = _solid(img, figure, g.stone, half=1, shade=2)
    for dx in (5, 6, 7, 8, 9):  # the bowl
        put(img, int(x) + dx, int(base) - 9, g.stone[3])
    if g.torment:
        for k in range(9):  # a crack down the body, lit from inside
            put(img, int(x) - 1 + (k % 3 == 1), int(base) - 17 + k, g.rune)
    else:
        put(img, int(x) + 7, int(base) - 10, g.rune)
        put(img, int(x) + 2, int(base) - 21, g.stone[0])  # the shadow under the hood
        put(img, int(x) + 1, int(base) - 21, g.stone[0])
        _moss_pad(img, x - 2, base - 24.5, 3.6, 1.6, g, pts)
        _moss_pad(img, x - 5, base - 13, 2.4, 3.0, g, pts)
        _moss_pad(img, x - 3, base - 4, 6.5, 1.4, g, pts)
        for k in range(12):  # ivy up its back
            put(img, int(x - 6 + 1.2 * math.sin(k / 2.0)), int(base) - 3 - k, g.moss[2] if k % 3 == 0 else g.moss[0])


def near_trunks(g: Grade, rng: random.Random) -> Image.Image:
    """The old giants: wide boles with grooved bark, buttress roots, moss, bracket fungi, ivy and a hollow with eyes
    in it; firefly lanterns and webs hang between them, and a dolmen and a statue stand among the roots."""
    img = blank(W, H)
    t = g.near
    f = periodic(W, rng, [(2, 1.2), (5, 1.0)])
    contour = lambda x: 111 + f(x)  # noqa: E731
    xs = [i * W / 5 + rng.uniform(-22, 22) + 40 for i in range(5)]
    _dolmen(img, xs[0] + 62, contour(xs[0] + 62) + 2, g, rng)
    sx_ = xs[2] + 60
    _solid(img, polygon([(sx_ - 11, contour(sx_) + 3), (sx_ + 11, contour(sx_) + 3), (sx_ + 9, contour(sx_) - 4), (sx_ - 9, contour(sx_) - 4)]), g.stone, half=1, shade=2)
    _statue(img, sx_, contour(sx_) - 4, g, rng)
    # A lone menhir with a rune, leaning.
    mx = xs[3] + 58
    mb = contour(mx) + 2
    _solid(img, polygon([(mx - 4.5, mb), (mx + 4.5, mb), (mx + 5.5, mb - 15), (mx + 3, mb - 19), (mx - 1.5, mb - 17)]), g.stone, half=1, shade=2)
    for dx, dy in ((0, 0), (1, 1), (0, 2), (-1, 3), (0, 4), (1, 5), (1, 0)):
        put(img, int(mx) + 2 + dx, int(mb) - 14 + dy, g.rune)
    if not g.torment:
        _moss_pad(img, mx + 2, mb - 18, 3.0, 1.5, g)
    for n, x in enumerate(xs):
        width = rng.uniform(18, 27)
        base = contour(x) + 3
        tips = _tree(img, x, base, width, t, rng, roots=0.8, boughs=2, bark=14, knots=2, half=4, shade=5, bare=g.torment)
        # Moss: cushions up the weather side and in the forks of the roots.
        for _ in range(5):
            my = rng.uniform(26, base - 6)
            _moss_pad(img, x - width * rng.uniform(0.26, 0.4), my, rng.uniform(2.5, 4.5), rng.uniform(3.5, 7.5), g)
        _moss_pad(img, x + width * 0.55, base - 3, 5.0, 2.0, g)
        _moss_pad(img, x - width * 0.6, base - 3, 5.0, 2.0, g)
        if not g.torment:
            # Bracket fungi: shelves stepping up the lit side.
            fy = int(rng.uniform(52, base - 24))
            for k in range(3):
                fx = int(x + width * 0.34) + k
                cap = g.caps[k % len(g.caps)]
                for d in range(5 - k):
                    put(img, fx + d, fy - k * 5, cap)
                for d in range(1, 4 - k):
                    put(img, fx + d, fy - k * 5 + 1, _c("bone", 6))
            # Ivy climbing the bole.
            ix = x + width * rng.uniform(-0.1, 0.15)
            for k in range(int(rng.uniform(26, 48))):
                yy = int(base) - 6 - k
                xx = int(ix + 2.2 * math.sin(k / 5.0 + n))
                put(img, xx, yy, g.moss[0])
                if k % 4 == 1:
                    put(img, xx + (1 if (k // 4) % 2 else -1), yy, g.moss[2])
                    put(img, xx + (2 if (k // 4) % 2 else -2), yy - 1, g.moss[1])
            for tip in tips:
                _leaf_cluster(img, tip, rng.uniform(7, 10), t, rng)
        if n == 1:
            # A hollow, and something in it watching the path.
            hx, hy = int(x - 1), int(base) - 40
            for (a, b) in _pts(ellipse(hx, hy, 4.4, 5.6)):
                put(img, a, b, t[3])
            for (a, b) in _pts(ellipse(hx - 0.6, hy - 0.5, 3.5, 4.7)):
                put(img, a, b, _c("ink", 0))
            put(img, hx - 2, hy, g.motes)
            put(img, hx + 1, hy, g.motes)
        if n in (0, 3):
            # A web strung between the bole and a bough.
            _web(img, x + width * 0.5 + 1, rng.uniform(22, 34), 15.0, -62.0, 34.0, g.web)
    # Vines trailing from the canopy, with leaves.
    for _ in range(9):
        vx = rng.uniform(0, W)
        length = int(rng.uniform(18, 56))
        ph = rng.uniform(0, 6)
        for y in range(0, length):
            x = int(vx + 1.6 * math.sin(y / 7.0 + ph))
            put(img, x, y, t[1])
            if not g.torment and y % 5 == 2:
                put(img, x + (1 if (y // 5) % 2 else -1), y, t[3])
                put(img, x + (2 if (y // 5) % 2 else -2), y + 1, t[3])
    if not g.torment:
        _canopy(img, rng, t, 22, 8)
    # Firefly lanterns hung from the boughs along the old way.
    for lx in (xs[0] + 34, xs[1] + 44, xs[2] - 36, xs[3] + 30, xs[4] + 36, xs[4] - 44):
        _lantern(img, int(lx), 0, rng.randint(26, 52), g, t[1], rng)
    for _ in range(9):
        x = rng.uniform(0, W)
        _bush(img, x, contour(x) + 2, rng.uniform(3.5, 7), t, rng)
    for _ in range(9):
        x = rng.randrange(W)
        _fern(img, x, int(contour(x)) + 2, rng, t[2], t[3], 11, rib=t[1])
    fill_below(img, contour, t[1], t[3], y_end=120)
    # Motes of light drifting between the trunks.
    for _ in range(26):
        put(img, rng.randrange(W), rng.randrange(52, 108), g.motes)
    return img


def ground(g: Grade, rng: random.Random) -> Image.Image:
    """The forest floor: a mossy bank with stones, ferns and mushrooms; the damp path crossed by roots, a rivulet
    passing under a slab; and below it a brook with stepping stones, a fallen log, rocks, roots and flowers."""
    img = blank(W, H)
    px = img.load()
    deep, grass, light, tips = g.grass
    dark_p, path, light_p = g.path
    f = periodic(W, rng, [(3, 1.4), (5, 1.0), (9, 0.6)])
    top = [int(round(111 + f(x))) for x in range(W)]
    path_top, path_bot = PATH_Y - 6, PATH_Y + 5
    for x in range(W):
        for y in range(top[x], H):
            if path_top <= y <= path_bot:
                continue
            if y < path_top:
                u = (y - top[x]) / max(1, path_top - top[x])
                c = dither_pick([light, grass, deep], u, x, y)
            else:
                u = (y - path_bot) / (H - path_bot)
                c = dither_pick([grass, deep, deep, g.fore[0]], u, x, y)
            px[x, y] = (*c, 255)
        for y in range(path_top, path_bot + 1):
            u = (y - path_top) / (path_bot - path_top)
            c = dither_pick([light_p, path, path, dark_p], u, x, y)
            px[x, y] = (*c, 255)
    # The near bank is not flat: mounds of moss catch the light on their crowns and hold shadow at their feet.
    for _ in range(22):
        mx, my = rng.randrange(W), rng.randrange(path_bot + 7, H - 6)
        rx, ry = rng.uniform(9, 20), rng.uniform(2.2, 4.0)
        for (a, b) in _pts(ellipse(mx, my, rx, ry)):
            v = (b - my) / ry
            if v < -0.45:
                put(img, a, b, light if (a + b) % 2 else grass)
            elif v > 0.55:
                put(img, a, b, g.fore[0] if (a + b) % 2 else deep)
            elif v < 0.0:
                put(img, a, b, grass)
    # Where the shafts of light reach the floor.
    if not g.torment:
        for cx in (52, 168, 290, 424, 530):
            _light_pool(img, cx, 113.5, rng.uniform(16, 24), 3.6, 0, path_top)
            _light_pool(img, cx - 14, 142, rng.uniform(20, 30), 6.5, path_bot + 2, H)
    # Moss creeping over the path edges, pebbles and fallen leaves on it.
    for x in range(W):
        if rng.random() < 0.6:
            put(img, x, path_top, grass)
        if rng.random() < 0.32:
            put(img, x, path_top + 1, grass)
        if rng.random() < 0.6:
            put(img, x, path_bot, deep)
    for _ in range(70):
        x, y = rng.randrange(W), rng.randrange(path_top + 1, path_bot)
        put(img, x, y, light_p)
        put(img, x + 1, y, dark_p)
    for _ in range(46):
        x, y = rng.randrange(W), rng.randrange(path_top + 1, path_bot + 1)
        leaf = rng.choice(g.leaves)
        put(img, x, y, leaf)
        put(img, x + 1, y, leaf)
    # Roots surfacing across the path: lit on top, shadow under.
    for _ in range(7):
        rx_ = rng.randrange(W)
        length = rng.randint(14, 30)
        y0 = rng.randrange(path_top + 1, path_bot - 2)
        slope = rng.uniform(-0.12, 0.12)
        for k in range(length):
            y = int(y0 + slope * k - 1.6 * math.sin(math.pi * k / length))
            put(img, rx_ + k, y, g.root[1])
            put(img, rx_ + k, y + 1, g.root[0])
    # A rivulet comes down the far bank, runs under a slab laid across the path and out the other side.
    sx = 332
    deep_w, water, glint = g.water
    for y in range(top[sx] + 1, path_top):
        xx = sx + int(1.5 * math.sin(y / 1.7))
        put(img, xx, y, water)
        put(img, xx + 1, y, glint if y % 2 else water)
        put(img, xx - 1, y, deep)
    for ey in (path_top, path_bot):  # it goes under the path between two flat stones
        pts = _pts(ellipse(sx + 0.5, ey, 5.2, 1.8))
        for (a, b) in pts:
            put(img, a, b, g.stone[3] if (a, b - 1) not in pts else g.stone[1])
    put(img, sx, path_top - 1, glint)
    put(img, sx + 1, path_top - 1, glint)
    # Moss blades and ferns along the top of the bank; mossy stones along the far side of the path.
    for x in range(W):
        if rng.random() < 0.75:
            hgt = rng.randint(1, 3)
            for k in range(hgt):
                put(img, x, top[x] - 1 - k, tips if k == hgt - 1 and rng.random() < 0.5 else light)
    for _ in range(16):
        x = rng.randrange(W)
        _fern(img, x, top[x], rng, light, tips, 7)
    for i in range(0, W, 58):
        x0 = i + rng.randint(6, 40)
        if abs(x0 - sx) < 16:
            continue
        rw, rh = rng.uniform(4, 8), rng.uniform(3, 6)
        base = path_top + 1
        pts = _pts(ellipse(x0, base, rw, rh))
        for (a, b) in pts:
            if b <= base:
                lit = (a, b - 1) not in pts or (a + 1, b) not in pts
                put(img, a, b, g.stone[3] if lit else (g.stone[0] if (a - 1, b) not in pts else g.stone[1]))
                if b < base - rh * 0.45:
                    put(img, a, b, light if (a + b) % 3 else tips)
    # ---- below the path
    # The brook: it winds along the foot of the bank, with stepping stones and small falls.
    brook = periodic(W, rng, [(2, 3.4), (3, 1.6), (7, 0.9)])
    girth = periodic(W, rng, [(3, 0.9), (8, 0.7)])
    by = [int(round(146 + brook(x))) for x in range(W)]
    for x in range(W):
        th = max(1, int(round(2.0 + girth(x))))
        put(img, x, by[x] - th - 1, g.fore[0])
        for y in range(by[x] - th, by[x] + th + 1):
            put(img, x, y, deep_w if y <= by[x] - th + (1 if th > 2 else 0) else water)
        put(img, x, by[x] + th + 1, grass if x % 3 else light)
        if rng.random() < 0.12:
            gy = by[x] + rng.randint(0, th - 1) if th > 1 else by[x]
            put(img, x, gy, glint)
            put(img, x + 1, gy, glint)
        if by[x] != by[(x - 1) % W]:  # a step in the bed: white water
            put(img, x, by[x], _c("bone", 7) if not g.torment else glint)
        if rng.random() < 0.2:  # grass hanging over the near bank
            for k in range(rng.randint(1, 3)):
                put(img, x, by[x] + th - k, grass if k else light)
    for y in range(path_bot + 1, by[sx] - 1):  # the rivulet falling into it
        put(img, sx + (y % 2), y, glint if y % 3 else water)
        put(img, sx + 1 - (y % 2), y, water)
    for cx in (70, 82, 93, 250, 262, 440, 451, 463, 474):  # stepping stones
        pts = _pts(ellipse(cx, by[cx % W], 3.6, 1.7))
        for (a, b) in pts:
            put(img, a, b, g.stone[3] if (a, b - 1) not in pts else g.stone[1])
    # A fallen log, moss on its back and fungi along it.
    lx0, lx1, ly = 108, 166, 139
    pts = _pts(capsule(lx0, ly, lx1, ly - 2, 3.6, 3.2))
    for (a, b) in pts:
        if (a, b - 1) not in pts:
            c = g.moss[2]
        elif (a, b - 2) not in pts:
            c = g.moss[1] if (a // 3) % 4 else g.wood[2]
        elif (a, b + 1) not in pts:
            c = g.wood[0]
        else:
            c = g.wood[1] if (a + b // 2) % 7 else g.wood[0]
        put(img, a, b, c)
    for (a, b) in _pts(ellipse(lx1 + 1, ly - 2, 2.2, 3.2)):  # the sawn end, with its rings
        put(img, a, b, g.wood[2])
    put(img, lx1 + 1, ly - 2, g.wood[0])
    put(img, lx1 + 1, ly - 4, g.wood[1])
    put(img, lx1 + 1, ly, g.wood[1])
    for k, fx in enumerate((118, 127, 140, 152)):
        _mushroom(img, fx, ly - 5 + (k % 2), g.caps[k % len(g.caps)], k % 2 == 0)
    # Rocks in the bank with moss on their heads.
    for _ in range(7):
        x0, y0 = rng.randrange(W), rng.randrange(path_bot + 6, H - 8)
        if abs(y0 - by[x0]) < 6 or lx0 - 8 < x0 < lx1 + 8:
            continue
        rw, rh = rng.uniform(4, 7), rng.uniform(3, 5)
        pts = _pts(ellipse(x0, y0, rw, rh))
        for (a, b) in pts:
            if b <= y0:
                lit = (a, b - 1) not in pts or (a + 1, b) not in pts
                put(img, a, b, g.stone[3] if lit else (g.stone[0] if (a - 1, b) not in pts else g.stone[1]))
                if b < y0 - rh * 0.4:
                    put(img, a, b, g.moss[2] if (a + b) % 3 == 0 else g.moss[1])
            elif b == y0 + 1:
                put(img, a, b, g.fore[0])
    # Roots looping out of the bank.
    for _ in range(6):
        x0, y0 = rng.randrange(W), rng.randrange(path_bot + 5, path_bot + 12)
        span, rise = rng.randint(9, 17), rng.uniform(2.5, 4.5)
        for k in range(span):
            y = int(y0 - rise * math.sin(math.pi * k / span))
            put(img, x0 + k, y, g.root[1])
            put(img, x0 + k, y + 1, g.root[0])
    # Tufts, denser and brighter near the path; ferns with form.
    for _ in range(130):
        x = rng.randrange(W)
        y = int(path_bot + 3 + (H - path_bot - 3) * rng.random() ** 1.6)
        if abs(y - by[x]) < 5:
            continue
        near = 1 - (y - path_bot) / (H - path_bot)
        hgt = rng.randint(2, 3 + int(near * 3))
        for k in range(rng.randint(2, 4)):
            lean = rng.choice((-1, 0, 1))
            for j in range(hgt):
                c = tips if (j == hgt - 1 and near > 0.8 and rng.random() < 0.2) else (light if near > 0.65 else grass)
                put(img, x + k + (lean if j > hgt // 2 else 0), y - j, c)
    for _ in range(11):
        x = rng.randrange(W)
        y = rng.randrange(path_bot + 9, H - 5)
        if abs(y - by[x]) < 6:
            y = by[x] - 6
        _fern(img, x, y, rng, light, tips, 10, rib=grass)
    # Mushrooms: on the bank, in the near grass, and a ring of them.
    for _ in range(22 if not g.torment else 10):
        x = rng.randrange(W)
        y = rng.choice([rng.randrange(top[x] + 2, path_top - 1), rng.randrange(path_bot + 4, H - 3)])
        if abs(y - by[x]) < 5:
            continue
        _mushroom(img, x, y, rng.choice(g.caps), rng.random() < 0.4)
    for k in range(9):
        a = math.tau * k / 9
        _mushroom(img, int(388 + math.cos(a) * 11), int(137 + math.sin(a) * 3.2), g.caps[0], k % 3 == 0)
    # Flowers in clumps where the light is.
    for _ in range(14 if not g.torment else 4):
        cx, cy = rng.randrange(W), rng.randrange(path_bot + 5, H - 5)
        if abs(cy - by[cx]) < 6:
            continue
        head = rng.choice(g.flowers)
        for _ in range(rng.randint(3, 6)):
            fx, fy = cx + rng.randint(-5, 5), cy + rng.randint(-2, 2)
            put(img, fx, fy, light)
            put(img, fx, fy - 1, head)
    if g.torment:
        for _ in range(7):
            _crystal(img, rng.uniform(0, W), rng.choice([path_top - 1, rng.randrange(path_bot + 8, H - 4)]), rng)
    return img


def foreground(g: Grade, rng: random.Random) -> Image.Image:
    """Ferns sliding past in front of everything; leaves, creepers and a web hanging into the top of the frame."""
    img = blank(W, H)
    body, rim = g.fore
    for _ in range(8):
        x = rng.uniform(0, W)
        base = H + 3
        shape = ellipse(x, base, rng.uniform(6, 10), rng.uniform(3, 5))
        ribs = []
        for k in range(rng.randint(5, 7)):
            ang = math.radians(-90 + (k - 2.8) * rng.uniform(20, 30))
            L = rng.uniform(14, 26)
            for j in range(0, int(L), 2):
                u = j / L
                cx = x + math.cos(ang) * j
                cy = base + math.sin(ang) * j + 5.0 * u * u
                shape = shape | ellipse(cx, cy, max(0.8, 3.4 * (1 - u)), max(0.8, 2.2 * (1 - u * 0.6)))
                ribs.append((cx, cy))
        pts = _pts(shape)
        for (a, b) in pts:
            lit = (a, b - 1) not in pts or (a + 1, b) not in pts
            put(img, a, b, rim if lit else body)
        for (cx, cy) in ribs[::2]:  # the midrib of each frond catches a little light
            if (int(cx), int(cy) - 2) in pts and (int(cx), int(cy) + 2) in pts:
                put(img, int(cx), int(cy), rim)
    if not g.torment:
        for _ in range(5):
            x = rng.uniform(0, W)
            shape = ellipse(x, -3, rng.uniform(24, 46), rng.uniform(7, 12))
            for _ in range(4):
                lx = x + rng.uniform(-30, 30)
                shape = shape | capsule(lx, 0, lx + rng.uniform(-3, 3), rng.uniform(10, 24), 1.2, 0.6)
            pts = _pts(shape)
            for (a, b) in pts:
                put(img, a, b, rim if (a, b + 1) not in pts else body)
    # A web in the corner of the frame, and a few threads.
    _web(img, 148.0, -1.0, 17.0, 28.0, 152.0, rim)
    _web(img, 452.0, -1.0, 14.0, 34.0, 146.0, rim)
    return img


LAYERS = (
    ("sky", sky, 0.0),
    ("far", far_trunks, 0.1),
    ("mid", mid_trunks, 0.22),
    ("mist", mist, 0.3),
    ("near", near_trunks, 0.5),
    ("ground", ground, 1.0),
    ("fore", foreground, 1.35),
)


_INDEX: dict[Color, tuple[str, int]] = {color(r, i): (r, i) for r, tones in RAMPS.items() for i in range(len(tones))}
#: From this y down, this many steps into the mist. The fighters stand in front of y ≈ 60 … 117. In the living
#: forest the mist climbs to the boss's shoulders; in the rot the boles stay black down to a low, thick fog.
VEIL_ROWS = {False: ((58, 1), (74, 2), (90, 3), (104, 4)), True: ((78, 1), (86, 2), (96, 3), (106, 4))}


def _veil(img: Image.Image, torment: bool) -> None:
    """Low mist off the forest floor: below the knees of the trees every green or black tone moves towards the tone
    of the mist, a step at a time with dithered seams — first a lighter green, then the mist's own hue: a pale teal
    in the living forest, a bone grey in the rot. What stands behind the fighters loses its hard black-on-glow
    contrast and settles into a calm, cool mid value against which dark figures and green ones both read; stones,
    lamps and fungi keep their colours and show through it."""
    px = img.load()
    rows = VEIL_ROWS[torment]
    for y in range(rows[0][0] - 3, H):
        for x in range(W):
            r, gr, b, a = px[x, y]
            hit = _INDEX.get((r, gr, b)) if a else None
            if not hit:
                continue
            ramp, i = hit
            if ramp == "ink":
                if i > 1:
                    continue
                i = 0
            elif ramp not in ("moss", "sea") or i >= 6:
                continue
            level = 0
            for y0, n in rows:
                if y >= y0 + 3 or (y >= y0 - 3 and (y - y0 + 3) * 16 > BAYER4[y % 4][x % 4] * 6 + 3):
                    level = n
            if not level:
                continue
            if level == 1:
                to = _c("moss", min(i + 1, 3 if torment else 6))
            elif torment:
                to = _c("bone", min(level - 1 + (i >= 2), 3))
            else:
                to = _c("sea", min(i + level - 1, 6))
            px[x, y] = (*to, 255)


ATMOSPHERE = {
    # The place's own weather: motes of light adrift between the trunks, and a few leaves coming down.
    "normal": [
        {"fx": "particles", "count": 26, "color": [hex_of(_c("brass", 7)), hex_of(_c("moss", 8))], "vx": 4, "vy": -6, "sway": 4,
         "alpha": 0.6, "ymax": 110, "front": False},
        {"fx": "particles", "count": 9, "color": [hex_of(_c("brass", 4)), hex_of(_c("crimson", 4)), hex_of(_c("moss", 6))], "vx": -9, "vy": 17,
         "sway": 7, "size": 2, "alpha": 0.8, "ymax": 124},
    ],
    # Rot. Things watch from the dark above the fog; one of them is bigger. Spores sift down; now and then the
    # whole fog lights from inside, without a bolt.
    "torment": [
        {"fx": "eyes", "every": [1400, 4200], "hold": 1500, "color": hex_of(_c("moss", 8)), "zones": [[0, 16, 600, 40], [0, 40, 600, 66]],
         "max": 4, "size": 1, "gap": 3},
        {"fx": "eyes", "every": [9000, 17000], "hold": 2400, "color": hex_of(_c("crimson", 6)), "zones": [[20, 24, 580, 58]],
         "max": 1, "size": 2, "gap": 5},
        {"fx": "particles", "count": 46, "color": [hex_of(_c("moss", 7)), hex_of(_c("bone", 5)), hex_of(_c("moss", 6))], "vx": -3, "vy": 9, "sway": 5,
         "alpha": 0.5, "ymax": 126},
        {"fx": "lightning", "every": [9000, 19000], "flash": hex_of(_c("moss", 7)), "alpha": 0.3},
    ],
}


def build(grade: str, seed: int = 202) -> dict[str, Image.Image]:
    g = GRADES[grade]
    out: dict[str, Image.Image] = {}
    for i, (name, fn, _speed) in enumerate(LAYERS):
        out[name] = fn(g, random.Random(seed * 100 + i))
    for name in ("mid", "near"):
        _veil(out[name], g.torment)
    return out
