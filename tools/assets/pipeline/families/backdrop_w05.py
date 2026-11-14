"""World 5 backdrop — the snowy peaks and their monastery under a clear night and an aurora — in every
difficulty grade.

Layers (back to front): sky (stars, the moon, the aurora in soft curtains), far range (pale peaks with snow caps
and faceted faces, mist at their feet), the monastery ridge (darker rock and brighter snow; on its crag a
whitewashed monastery with tiered roofs, lit windows, a gate, a banner and a stair climbing to it; a chorten and
small pines on the shoulders), mist (snow carried on the wind), near slopes (snow hills with drift shadows, pines,
rocks, prayer flags on lines), ground (the snow bank with stone lanterns, the flagstone path the party walks and
three ranks of drifts falling towards the viewer, with stones, frozen grass, tracks and a cairn) and foreground
(dark mounds, dead grass and a snow-laden branch).

It is night and the moon is up on the right: every face that looks right is lit, every face that looks left is in
shade. Snow is what is bright, so depth is read by contrast — far ranges are soft and close in value to the sky,
near snow is the brightest thing in the frame and the pines on it the darkest. The one warm thing is the
monastery. The Torment grade is a whiteout: the colour drains to bone and slate, the sky is a blank pale void with
a dead moon and the ash of the aurora, the range stands in it as grey ghosts, the monastery is a black ruin and the
pines are black; only the Rift keeps its violet. In both grades what lies right behind the fighters (the foot of
the range, the near slopes, the bank) is held to a middle value so pale figures and dark ones both read.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass

from PIL import Image

from ..backdrop import blank, dither_pick, put, vertical_gradient
from ..palette import Color, color, hex_of
from ..raster import capsule, circle, ellipse, polygon, rasterize, rect
from .backdrop_w01 import H, PATH_Y, W, _crystal, _rift, _shift, _silhouette

__all__ = ["W", "H", "PATH_Y", "LAYERS", "GRADES", "PREVIEW_BG", "ATMOSPHERE", "build"]

#: The tone creature previews of this world are shown on.
PREVIEW_BG: Color = color("azure", 4)

#: Real-time weather and omens, run by the strip (see lab_page.atmosphere for the fields).
#: Normal: snow falling quietly. Torment: a blizzard driving across in front of and behind the fighters, black
#: lightning — a black bolt on the white sky and the world going dark for an instant behind the figures — and
#: pairs of dark eyes that open in the white of the range and the sky, watch, and close.
ATMOSPHERE = {
    "normal": [
        {"fx": "particles", "count": 46, "color": [hex_of(color("bone", 7)), hex_of(color("azure", 7))], "vx": -12, "vy": 24, "sway": 3,
         "alpha": 0.6, "ymax": 128},
        {"fx": "particles", "count": 30, "color": hex_of(color("azure", 6)), "vx": -7, "vy": 15, "sway": 2, "alpha": 0.5, "ymax": 116, "front": False},
    ],
    "torment": [
        {"fx": "particles", "count": 70, "color": [hex_of(color("ink", 9)), hex_of(color("bone", 7))], "vx": -160, "vy": 52, "len": 3,
         "alpha": 0.5, "ymax": 122, "front": False},
        {"fx": "particles", "count": 80, "color": [hex_of(color("light", 0)), hex_of(color("ink", 9))], "vx": -250, "vy": 76, "len": 6,
         "alpha": 0.5, "ymax": 150},
        {"fx": "lightning", "every": [3500, 9000], "flash": hex_of(color("ink", 2)), "alpha": 0.38, "bolt": hex_of(color("ink", 0)),
         "x": [40, 560], "y": [0, 84], "shake": 1},
        {"fx": "eyes", "every": [2200, 6000], "hold": 1700, "color": hex_of(color("ink", 0)), "zones": [[0, 30, 600, 78]], "max": 3,
         "size": 2, "gap": 4},
    ],
}

Tones4 = tuple[Color, Color, Color, Color]


@dataclass(frozen=True)
class Grade:
    key: str
    sky: list[Color]
    sky_end: int
    stars: tuple[Color, Color]
    aurora: tuple[Color, ...]  # from the bright hem upwards; empty = no aurora
    far: Tones4  # snow lit, snow in shade, rock lit, rock in shade
    far_crest: Color
    haze: Color  # mist lying at the foot of the far range
    haze_depth: int  # how many rows of the range it takes
    haze_soft: Color | None  # a tone between the range and the mist, where they are far apart
    mid: Tones4
    mid_crest: Color
    wall: tuple[Color, Color, Color]  # lit, shade, rim
    frieze: tuple[Color, Color]
    roof: tuple[Color, Color]  # tiles, snow on them
    window: tuple[Color, Color]
    banner: Color
    slope: Tones4  # shade, body, lit, crest
    pine: tuple[Color, Color, Color]  # needles, needles lit, snow on the boughs
    snow: tuple[Color, Color, Color, Color]  # deep, body, light, sparkle (the bank over the path)
    near: tuple[Color, Color, Color, Color, Color]  # the drifts below the path, brightest first
    path: tuple[Color, Color, Color]  # dark, body, light
    stone: tuple[Color, Color]
    lamp: Color
    glow: Color  # lamplight on snow
    flags: tuple[Color, ...]
    flake: tuple[Color, Color]
    grass: tuple[Color, Color]
    fore: tuple[Color, Color]
    torment: bool = False


def _c(r: str, i: int) -> Color:
    return color(r, i)


NORMAL = Grade(
    key="normal",
    sky=[_c("ink", 0), _c("azure", 0), _c("azure", 0), _c("azure", 1), _c("azure", 1), _c("azure", 2), _c("azure", 2)],
    sky_end=108,
    stars=(_c("bone", 7), _c("azure", 6)),
    aurora=(_c("moss", 8), _c("moss", 7), _c("moss", 6), _c("sea", 5), _c("sea", 4), _c("sea", 3), _c("sea", 2)),
    far=(_c("azure", 5), _c("azure", 3), _c("azure", 3), _c("azure", 2)),
    far_crest=_c("azure", 6),
    haze=_c("azure", 3),
    haze_depth=22,
    haze_soft=None,
    mid=(_c("azure", 5), _c("azure", 4), _c("ink", 4), _c("ink", 2)),
    mid_crest=_c("azure", 7),
    wall=(_c("bone", 5), _c("bone", 2), _c("bone", 7)),
    frieze=(_c("crimson", 4), _c("crimson", 2)),
    roof=(_c("ink", 1), _c("azure", 8)),
    window=(_c("brass", 6), _c("brass", 4)),
    banner=_c("crimson", 5),
    # The near slopes and the bank are what the fighters stand in front of: moonlit snow in shade, two steps under
    # the Priest's whites and the Knight's steel; only crests and sparkle are bright.
    slope=(_c("azure", 3), _c("azure", 4), _c("azure", 5), _c("azure", 7)),
    pine=(_c("azure", 1), _c("azure", 3), _c("azure", 5)),  # dark blue, not black: the wolf and the wraith pass in front of them
    snow=(_c("azure", 4), _c("azure", 5), _c("azure", 6), _c("azure", 8)),
    near=(_c("azure", 8), _c("azure", 7), _c("azure", 6), _c("azure", 5), _c("azure", 4)),
    path=(_c("ink", 4), _c("ink", 5), _c("ink", 6)),
    stone=(_c("ink", 2), _c("ink", 5)),
    lamp=_c("brass", 6),
    glow=_c("brass", 5),
    flags=(_c("crimson", 5), _c("brass", 5), _c("sea", 6), _c("bone", 7), _c("azure", 4)),
    flake=(_c("bone", 7), _c("azure", 7)),
    grass=(_c("bone", 3), _c("bone", 6)),
    fore=(_c("azure", 1), _c("azure", 5)),
)

# Torment here is a whiteout: the colour is gone. A blank pale sky where the aurora was, the far range grey ghosts
# in it, and — so that the fighters, who are mostly pale, can be seen at all — everything they stand in front of
# (the mist at the foot of the range, the ridge, the near slopes, the bank) a band of slate, darker than their
# lights and lighter than their darks. The only colour left is the Rift's violet.
TORMENT = Grade(
    key="torment",
    sky=[_c("ink", 8), _c("ink", 9), _c("ink", 9), _c("bone", 7), _c("bone", 7), _c("bone", 7), _c("bone", 7)],
    sky_end=108,
    stars=(_c("ink", 9), _c("ink", 9)),
    aurora=(),
    far=(_c("light", 0), _c("ink", 9), _c("ink", 8), _c("ink", 7)),
    far_crest=_c("light", 0),
    haze=_c("ink", 4),
    haze_depth=36,  # up to above the heroes' heads: the white range would swallow the Priest and the Knight
    haze_soft=_c("ink", 6),
    mid=(_c("ink", 5), _c("ink", 4), _c("ink", 3), _c("ink", 2)),
    mid_crest=_c("ink", 7),
    wall=(_c("ink", 2), _c("ink", 1), _c("ink", 4)),
    frieze=(_c("ink", 1), _c("ink", 0)),
    roof=(_c("ink", 0), _c("ink", 6)),
    window=(_c("ink", 0), _c("ink", 0)),
    banner=_c("ink", 3),
    slope=(_c("ink", 3), _c("ink", 4), _c("ink", 5), _c("ink", 7)),
    pine=(_c("ink", 0), _c("ink", 1), _c("ink", 7)),
    snow=(_c("ink", 3), _c("ink", 4), _c("ink", 5), _c("ink", 8)),
    near=(_c("bone", 7), _c("ink", 9), _c("ink", 8), _c("ink", 7), _c("ink", 6)),
    path=(_c("ink", 1), _c("ink", 2), _c("ink", 3)),
    stone=(_c("ink", 1), _c("ink", 5)),
    lamp=_c("ink", 0),
    glow=_c("ink", 6),
    flags=(_c("ink", 3), _c("ink", 6)),
    flake=(_c("light", 0), _c("ink", 9)),
    grass=(_c("ink", 1), _c("ink", 3)),
    fore=(_c("ink", 0), _c("ink", 3)),
    torment=True,
)

GRADES = {"normal": NORMAL, "torment": TORMENT}


# ------------------------------------------------------------------------------------- helpers
def _noise(rng: random.Random, step: int, amp: float):
    """Seamless smooth noise along x: random values every `step` px (which must divide W), eased between."""
    k = W // step
    vals = [rng.uniform(-amp, amp) for _ in range(k)]

    def f(x: float) -> float:
        u = (x % W) / step
        i = int(u) % k
        t = u - int(u)
        t = t * t * (3 - 2 * t)
        return vals[i] * (1 - t) + vals[(i + 1) % k] * t

    return f


def _wrap(d: float) -> float:
    return (d + W / 2) % W - W / 2


def _range(img: Image.Image, rng: random.Random, peaks: list[tuple[float, float, float, float, float]], floor: float, tones: Tones4,
           crest: Color, y_end: int, snow_depth: float, rough: float = 2.0, spurs: int = 4, haze: tuple[Color, int, Color | None] | None = None) -> list[int]:
    """A mountain range lit by the moon from the right.

    Each peak is (x, apex y, left slope, right slope, summit half-width); the skyline is the highest of them at
    every column, roughened by noise so no ridge is a ruled line. From every summit a main spur wanders down the
    mountain: what lies right of it is in moonlight, what lies left in shade. Lesser spurs break both faces into
    facets. Snow lies from the summit down to a ragged snowline and runs further down the gullies; below it the
    rock shows. Returns the skyline.
    """
    snow_lit, snow_shade, rock_lit, rock_shade = tones
    px = img.load()
    jag, swell, line, gully = _noise(rng, 5, rough), _noise(rng, 15, rough * 1.4), _noise(rng, 10, 1.0), _noise(rng, 6, 1.0)
    tops: list[int] = []
    owner: list[int] = []
    for x in range(W):
        best, who = floor, -1
        for i, (mx, my, sl, sr, flat) in enumerate(peaks):
            d = _wrap(x - mx)
            y = my + (sr if d > 0 else sl) * max(0.0, abs(d) - flat)
            if y < best:
                best, who = y, i
        tops.append(int(round(best + (jag(x) + swell(x)) * (1.0 if who >= 0 else 0.3))))
        owner.append(who)
    main: list[dict[int, float]] = []
    for (mx, my, _sl, _sr, flat) in peaks:
        xs: dict[int, float] = {}
        x = mx - flat * 0.3
        for y in range(int(my) - 6, y_end):
            xs[y] = x
            x += rng.uniform(-0.8, 0.5)
        main.append(xs)
    for x in range(W):
        who = owner[x]
        apex = peaks[who][1] if who >= 0 else floor
        reach = snow_depth * (0.8 + 0.5 * line(x)) + (snow_depth * 0.7 if gully(x) > 0.35 else 0.0)
        for y in range(max(0, tops[x]), y_end):
            lit = who >= 0 and _wrap(x - main[who].get(y, peaks[who][0])) >= 0
            snow = y - apex < reach or y - tops[x] < 2
            px[x, y] = (*((snow_lit if lit else snow_shade) if snow else (rock_lit if lit else rock_shade)), 255)
    # Lesser spurs: on the lit face each throws a wedge of shadow to its left, on the shaded face each catches a
    # wedge of light on its right.
    for i, (mx, _my, _sl, _sr, flat) in enumerate(peaks):
        for _ in range(spurs):
            sgn = rng.choice((-1, 1))
            x = mx + sgn * (flat + rng.uniform(4, 30))
            if owner[int(x) % W] != i:
                continue
            y = tops[int(x) % W] + 1
            length, w0 = rng.randint(8, 26), rng.uniform(2.5, 5.5)
            for j in range(length):
                w = max(1, int(round(w0 * (1 - j / length))))
                for k in range(1, w + 1):
                    xx = (int(x) - k if sgn > 0 else int(x) + k) % W
                    if tops[xx] < y < y_end:
                        cur = px[xx, int(y)][:3]
                        if sgn > 0:
                            new = snow_shade if cur == snow_lit else rock_shade if cur == rock_lit else None
                        else:
                            new = snow_lit if cur == snow_shade else rock_lit if cur == rock_shade else None
                        if new:
                            px[xx, int(y)] = (*new, 255)
                x += sgn * rng.uniform(0.35, 0.95)
                y += 1
    # The moon catches every edge of the skyline that looks its way.
    for x in range(W):
        if tops[(x + 1) % W] >= tops[x] and 0 <= tops[x] < y_end:
            px[x, tops[x]] = (*crest, 255)
    if haze:
        # Mist at the foot: the range fades into `tone` over `depth` rows — through `soft` first, if given, so a
        # pale range does not meet a dark mist in one noisy seam.
        tone, depth, soft = haze
        steps = [(0, 0, 0), (1, 1, 1), (2, 2, 2)] if soft else [(0, 0, 0), (2, 2, 2)]
        for y in range(y_end - depth, y_end):
            t = (y - (y_end - depth)) / depth
            for x in range(W):
                if not px[x, y][3]:
                    continue
                pick = dither_pick(steps, (0.1 + 1.15 * t) if soft else (0.2 + 0.8 * t), x, y)[0]
                if pick:
                    px[x, y] = (*(soft if pick == 1 else tone), 255)
    return tops


def _pine(img: Image.Image, x: float, base: float, h: float, g: Grade) -> None:
    """A conifer: stacked skirts, their right sides catching the moon, snow lying on each bough."""
    needles, lit, snow = g.pine
    if g.torment:
        shape = capsule(x, base, x, base - h, 0.8)
        for i in range(4):
            y0 = base - h * (0.3 + 0.17 * i)
            for sgn in (-1, 1):
                shape = shape | capsule(x, y0, x + sgn * h * (0.26 - 0.04 * i), y0 + h * 0.07, 0.5)
        _silhouette(img, shape, needles, snow, sun_side=1)
        return
    tiers = 4 if h < 26 else 5
    for dy in range(int(h * 0.18)):
        put(img, int(x), int(base) - dy, needles)
    for i in range(tiers):
        y1 = base - h * (0.1 + 0.8 * i / tiers)
        y0 = y1 - h * (1.25 / tiers)
        half = h * (0.3 - 0.2 * i / tiers)
        for yy in range(int(y0), int(y1) + 1):
            t = (yy - y0) / max(1.0, y1 - y0)
            w = half * t
            for xx in range(int(round(x - w)), int(round(x + w)) + 1):
                put(img, xx, yy, lit if xx > x + w * 0.35 else needles)
            # Snow on the upper edge of the bough, heavier on the moon side.
            if yy > y0 + 1:
                put(img, int(round(x + w)), yy, snow)
                if t > 0.5 and (yy + i) % 2 == 0:
                    put(img, int(round(x + w * 0.5)), yy - 1, snow)
        put(img, int(x), int(y0), snow)


def _rock(img: Image.Image, x: float, base: float, w: float, h: float, g: Grade, snow: Color, rng: random.Random) -> None:
    """A rock breaking the snow: an uneven wedge, its right face catching the moon, a thin cap of snow."""
    peak = x + rng.uniform(-0.2, 0.3) * w
    shape = polygon([(x - w, base), (x - w * 0.7, base - h * 0.55), (peak, base - h), (x + w * 0.65, base - h * 0.6), (x + w, base)])
    pts = rasterize(_shift(shape, W), W * 3, H)
    pts = {(a - W, b) for (a, b) in pts}
    for (a, b) in pts:
        top = (a, b - 1) not in pts
        put(img, a, b, snow if top else (g.stone[1] if a > peak else g.stone[0]))


def _roof(img: Image.Image, x0: int, x1: int, y: int, g: Grade, eave: int = 4) -> None:
    """A tiled roof over a wall whose top is at y, spanning x0..x1: wide eaves turned up at the corners, snow on
    it. Occupies y-4 .. y-1."""
    tiles, snow = g.roof
    for x in range(x0 - eave, x1 + eave + 1):
        put(img, x, y - 1, tiles)
    put(img, x0 - eave - 1, y - 2, tiles)
    put(img, x1 + eave + 1, y - 2, tiles)
    for x in range(x0 - eave + 1, x1 + eave):
        put(img, x, y - 2, snow if not g.torment else tiles)
    for x in range(x0 - 1, x1 + 2):
        put(img, x, y - 3, tiles)
    for x in range(x0 + 1, x1):
        put(img, x, y - 4, snow)


def _hall(img: Image.Image, x0: int, x1: int, y0: int, y1: int, g: Grade, rng: random.Random, windows: int = 1, frieze: bool = True) -> None:
    """A whitewashed block from y0 (top) to y1 (foot): the moon side lit, the other in shade, a red frieze under
    the roof, rows of lit windows."""
    lit, shade, rim = g.wall
    split = x0 + (x1 - x0) * 0.38
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            put(img, x, y, shade if x < split else lit)
        put(img, x1, y, rim)
    if frieze:
        for x in range(x0, x1 + 1):
            put(img, x, y0, g.frieze[1] if x < split else g.frieze[0])
            put(img, x, y0 + 1, g.frieze[1] if x < split else g.frieze[0])
    for row in range(windows):
        wy = y0 + 4 + row * 5
        if wy + 1 > y1 - 1:
            break
        for x in range(x0 + 2, x1 - 1, 4):
            if rng.random() < (0.3 if g.torment else 0.78):
                put(img, x, wy, g.window[0])
                put(img, x, wy + 1, g.window[1])
            else:
                put(img, x, wy, g.roof[0])
                put(img, x, wy + 1, g.roof[0])


def _monastery(img: Image.Image, cx: int, base: int, g: Grade, rng: random.Random) -> None:
    """The monastery on its crag: a retaining terrace with the gate, a wing, the great hall rising in three roofed
    tiers to a gilded finial, and a tower flying a banner. In Torment it is a ruin whose stones hang in the air."""
    _lit, shade, rim = g.wall
    lit = _lit
    terrace = base - 7
    # Terrace wall with slit windows and the gate.
    for y in range(terrace, base + 1):
        for x in range(cx - 37 + (base - y) // 3, cx + 38 - (base - y) // 3):
            put(img, x, y, shade if x < cx - 8 else lit)
    for x in range(cx - 35, cx + 36):
        put(img, x, terrace, g.roof[1] if not g.torment else rim)
    for x in range(cx - 30, cx + 34, 6):
        put(img, x, terrace + 3, g.roof[0])
    for dy in range(5):
        for dx in range(-1, 2):
            if not (dy == 4 and dx != 0):
                put(img, cx + 4 + dx, base - dy, g.roof[0])
    if not g.torment:
        put(img, cx + 4, base - 1, g.window[1])
        put(img, cx + 4, base, g.window[0])
    if g.torment:
        # What is left: the wing and the hall's first tier, their tops torn open, no roofs.
        for x0, x1, top in ((cx - 34, cx - 13, terrace - 7), (cx - 10, cx + 22, terrace - 11), (cx + 25, cx + 33, terrace - 9)):
            _hall(img, x0, x1, top, terrace - 1, g, rng, windows=1, frieze=False)
            px = img.load()
            for x in range(x0, x1 + 1):
                tear = int(2.5 + 2.5 * math.sin(x * 1.3) + 1.5 * math.sin(x * 0.5 + 1))
                for dy in range(max(0, tear)):
                    px[x % W, top + dy] = (0, 0, 0, 0)
        for _ in range(11):
            sx, sy = cx + rng.uniform(-30, 34), terrace - rng.uniform(16, 46)
            _silhouette(img, polygon([(sx - 2.5, sy), (sx + 1.5, sy - 2), (sx + 3, sy + 1), (sx, sy + 2.5)]), shade, rim)
        return
    # Left wing.
    _hall(img, cx - 34, cx - 13, terrace - 10, terrace - 1, g, rng, windows=1)
    _roof(img, cx - 34, cx - 13, terrace - 10, g, eave=3)
    # Tower with the banner.
    _hall(img, cx + 25, cx + 33, terrace - 19, terrace - 1, g, rng, windows=3)
    _roof(img, cx + 25, cx + 33, terrace - 19, g, eave=3)
    for dy in range(9):
        put(img, cx + 29, terrace - 24 - dy, g.roof[0])
    for dx, dy in ((1, 0), (2, 0), (3, 0), (4, 1), (5, 1), (1, 1), (2, 1), (3, 1), (4, 2), (1, 2), (2, 2), (3, 2), (2, 3), (3, 3), (4, 3), (5, 2)):
        put(img, cx + 29 + dx, terrace - 32 + dy, g.banner)
    # The great hall: three tiers.
    t1 = terrace - 14
    _hall(img, cx - 10, cx + 22, t1, terrace - 1, g, rng, windows=2)
    _roof(img, cx - 10, cx + 22, t1, g, eave=5)
    t2 = t1 - 4 - 8
    _hall(img, cx - 4, cx + 16, t2, t1 - 5, g, rng, windows=1)
    _roof(img, cx - 4, cx + 16, t2, g, eave=4)
    t3 = t2 - 4 - 6
    _hall(img, cx + 1, cx + 11, t3, t2 - 5, g, rng, windows=1, frieze=False)
    _roof(img, cx + 1, cx + 11, t3, g, eave=3)
    for dy, tone in ((5, _c("brass", 4)), (6, _c("brass", 5)), (7, _c("brass", 6)), (8, _c("brass", 6))):
        put(img, cx + 6, t3 - dy, tone)
    put(img, cx + 5, t3 - 6, _c("brass", 4))
    put(img, cx + 7, t3 - 6, _c("brass", 6))


# ------------------------------------------------------------------------------------- layers
def sky(g: Grade, rng: random.Random) -> Image.Image:
    img = blank(W, H)
    vertical_gradient(img, g.sky, 0, g.sky_end, curve=1.1)
    px = img.load()
    for y in range(g.sky_end, H):
        for x in range(W):
            px[x, y] = (*g.sky[-1], 255)
    if g.torment:
        # The whiteout: no stars. What is left of the aurora hangs as two ash-grey ribbons, and the moon is a hole.
        for base, amp, k1, ph, tall in ((44.0, 7.0, 2, 0.4, 7), (66.0, 5.0, 3, 2.6, 5)):
            fringe = _noise(rng, 10, 1.5)
            for x in range(W):
                hem = int(base + amp * math.sin(math.tau * k1 * x / W + ph) + fringe(x))
                for j in range(tall):
                    y = hem - j
                    if 0 <= y < g.sky_end and (j == 0 or (x + y) % 2 == 0 or j < 2):
                        px[x, y] = (*_c("ink", 7 if j == 0 else 8 if j < 3 else 9), 255)
        mx, my = 486, 26
        for r, tone in ((12.5, _c("ink", 8)), (10.0, _c("ink", 7)), (7.0, _c("ink", 1))):
            for (a, b) in rasterize(circle(mx, my, r), W, H):
                px[a, b] = (*tone, 255)
        disc = rasterize(circle(mx, my, 7.0), W, H)
        for (a, b) in disc:  # a thin cold limb, as if something stood in front of it
            if (a - 1, b) not in disc or (a, b + 1) not in disc:
                px[a, b] = (*_c("ink", 4), 255)
        _rift(img, rng)
        # Lesser fractures spreading from it: dark violet, so they cut the white.
        for x0, y0, dx in ((120, 18, 1), (410, 30, -1), (520, 12, 1)):
            x, y = float(x0), float(y0)
            for i in range(26):
                px[int(x) % W, int(y)] = (*_c("violet", 3 if i % 3 else 5), 255)
                x += dx * rng.uniform(0.3, 1.4)
                y += rng.uniform(0.5, 1.5)
        return img
    for _ in range(130):
        x, y = rng.randrange(W), int(rng.random() ** 1.4 * 92)
        px[x, y] = (*(g.stars[0] if rng.random() < 0.45 else g.stars[1]), 255)
    for _ in range(9):  # a few larger stars
        x, y = rng.randrange(2, W - 2), rng.randrange(4, 34)
        px[x, y] = (*g.stars[0], 255)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            px[x + dx, y + dy] = (*g.stars[1], 255)
    mx, my = 486, 26
    # The aurora: three curtains hanging across the sky, the furthest faint. Each is a ribbon whose lower hem is
    # the brightest line and which fades upwards tone by tone; where the cloth folds towards us it is taller and
    # brighter, and a few rays stand up out of it.
    n = len(g.aurora)
    curtains = ((30.0, 5.0, 1, 3, 1.3, 13.0, 3, 0.55), (52.0, 8.0, 2, 5, 0.4, 24.0, 0, 1.0), (70.0, 6.0, 3, 4, 2.6, 19.0, 1, 0.8))
    for base, amp, k1, k2, ph, tall, dim, body in curtains:
        fold = _noise(rng, 30, 1.0)
        fringe = _noise(rng, 5, 1.0)
        rays = {rng.randrange(W) for _ in range(int(26 * body))}
        for x in range(W):
            hem = base + amp * math.sin(math.tau * k1 * x / W + ph) + amp * 0.4 * math.sin(math.tau * k2 * x / W + ph * 2.3)
            f = 0.5 + 0.5 * fold(x)
            height = tall * (0.55 + 0.75 * f) + 2.0 * fringe(x)
            ray = x in rays or (x - 1) % W in rays
            if ray:
                height += 5 + 4 * f
            for j in range(int(height)):
                y = int(hem) - j
                if not 0 <= y < g.sky_end or (mx - x) ** 2 + (my - y) ** 2 < 150:
                    continue
                t = j / height
                # Position on the tone ramp: 0 = the hem. Folds facing us hold the bright tones longer.
                pos = 1 + dim + (t ** (0.75 + 0.5 * f)) * (n - 1 - dim) - (0.8 if ray else 0.0)
                if j == 0:
                    pos = dim
                tone = dither_pick(list(g.aurora), max(0.0, min(1.0, pos / (n - 1))), x, y, blend=0.2)
                px[x, y] = (*tone, 255)
    # Stars show through the thin top of the curtains.
    for _ in range(40):
        x, y = rng.randrange(W), rng.randrange(8, 60)
        px[x, y] = (*g.stars[0], 255)
    # The moon: small, cold, a ring of thin light round it.
    for r, tone in ((11.5, _c("azure", 1)), (9.0, _c("azure", 2)), (6.5, _c("bone", 7))):
        for (a, b) in rasterize(circle(mx, my, r), W, H):
            px[a, b] = (*tone, 255)
    for (a, b) in rasterize(circle(mx - 2, my - 1, 1.7) | circle(mx + 2.5, my + 2.5, 1.2) | circle(mx + 1, my - 3.5, 0.8), W, H):
        px[a, b] = (*_c("azure", 7), 255)
    disc = rasterize(circle(mx, my, 6.5), W, H)
    for (a, b) in disc:  # the limb towards the top right is the brightest
        if (a + 1, b) not in disc or (a, b - 1) not in disc:
            px[a, b] = (*_c("light", 0), 255)
    return img


def far_peaks(g: Grade, rng: random.Random) -> Image.Image:
    """The far range: tall, sharp, soft in value; mist lies at its feet."""
    img = blank(W, H)
    peaks = []
    x = rng.uniform(10, 40)
    while x < W - 30:
        tall = rng.random() < 0.45
        peaks.append((x, rng.uniform(40, 54) if tall else rng.uniform(58, 76), rng.uniform(0.85, 1.4), rng.uniform(0.7, 1.15), rng.uniform(0, 3)))
        x += rng.uniform(46, 82)
    _range(img, rng, peaks, 102.0, g.far, g.far_crest, 116, snow_depth=22.0, rough=2.2, spurs=5, haze=(g.haze, g.haze_depth, g.haze_soft))
    return img


def ridge(g: Grade, rng: random.Random) -> Image.Image:
    """A nearer ridge of dark rock and bright snow, the monastery on its crag, a chorten and small pines on its
    shoulders, and the stair that climbs to the gate."""
    img = blank(W, H)
    peaks = [(300.0, 79.0, 1.05, 0.9, 42.0), (92.0, 90.0, 0.5, 0.6, 9.0), (176.0, 99.0, 0.6, 0.45, 2.0), (438.0, 87.0, 0.7, 0.5, 3.0),
             (512.0, 97.0, 0.5, 0.6, 2.0), (574.0, 93.0, 0.55, 0.5, 4.0)]
    tops = _range(img, rng, peaks, 111.0, g.mid, g.mid_crest, 122, snow_depth=11.0, rough=1.6, spurs=5)
    over = blank(W, H)
    cx = 298
    base = min(tops[cx - 30:cx + 34]) + 3
    # Level the crag under the walls so nothing floats.
    for x in range(cx - 40, cx + 41):
        for y in range(base, tops[x] + 2):
            put(over, x, y, g.mid[3])
        if tops[x] + 1 > base and x % 3:
            put(over, x, base, g.mid[1])  # snow on the ledge under the walls
    _monastery(over, cx, base, g, rng)
    # The stair: switchbacks up the left flank to the gate, a lamp at every turn.
    turns = [(cx - 84, base + 30), (cx - 56, base + 23), (cx - 74, base + 15), (cx - 46, base + 8), (cx - 58, base + 3), (cx - 38, base + 1)]
    for (x0, y0), (x1, y1) in zip(turns, turns[1:]):
        n = int(abs(x1 - x0))
        for j in range(n + 1):
            x, y = x0 + (x1 - x0) * j / n, y0 + (y1 - y0) * j / n
            if j % 2 == 0:
                put(over, int(x), int(y), g.mid_crest)
            put(over, int(x), int(y) + 1, g.mid[3])
    if not g.torment:
        for (x0, y0) in turns[1:-1]:
            put(over, x0, y0 - 1, g.lamp)
    # A chorten (a small stupa) on the next shoulder, and a hermitage further on.
    sx = 92
    cb = tops[sx] + 2
    stupa = polygon([(sx - 6, cb), (sx + 6, cb), (sx + 5, cb - 4), (sx - 5, cb - 4)]) | circle(sx, cb - 7, 3.6) | rect(sx - 0.8, cb - 15, sx + 0.8, cb - 9)
    if g.torment:
        stupa = polygon([(sx - 6, cb), (sx + 6, cb), (sx + 5, cb - 4), (sx - 1, cb - 8), (sx - 5, cb - 4)])
    _silhouette(over, stupa, g.wall[1], g.wall[0])
    if not g.torment:
        put(over, sx, cb - 16, _c("brass", 6))
        hx, hb = 438, tops[438] + 2
        _hall(over, hx - 6, hx + 5, hb - 7, hb, g, rng, windows=1, frieze=False)
        _roof(over, hx - 6, hx + 5, hb - 7, g, eave=2)
    # Small dark pines on the shoulders give the range its size.
    for px_ in (40, 58, 140, 200, 214, 376, 392, 470, 486, 540, 556):
        x = px_ + rng.uniform(-5, 5)
        _pine(over, x, tops[int(x) % W] + 3, rng.uniform(7, 11), g)
    img.alpha_composite(over)
    return img


def mist(g: Grade, rng: random.Random) -> Image.Image:
    """Snow hanging in the air: a few flakes that drift with the layer. The snow that FALLS is in ATMOSPHERE."""
    img = blank(W, H)
    for _ in range(70):
        x, y = rng.randrange(W), rng.randrange(0, 118)
        c = g.flake[0] if rng.random() < 0.5 else g.flake[1]
        put(img, x, y, c)
        if rng.random() < 0.25:
            put(img, x + 1, y + 1, g.flake[1])
    for _ in range(10):
        x, y = rng.randrange(W), rng.randrange(20, 112)
        put(img, x, y, g.flake[0])
        put(img, x + 1, y, g.flake[0])
        put(img, x + 2, y + 1, g.flake[1])
    return img


def slopes(g: Grade, rng: random.Random) -> Image.Image:
    """The near snow slopes: rolling hills with drift shadows, pines in clumps, rocks, prayer flags on lines."""
    img = blank(W, H)
    px = img.load()
    shade, body, lit, crest = g.slope
    roll, small = _noise(rng, 60, 5.0), _noise(rng, 20, 1.8)
    # The slope sinks in front of the monastery's crag, so the crag and the stair up it are seen.
    contour = lambda x: 106 + roll(x) + small(x) + 6.0 * math.exp(-((_wrap(x - 290) / 62.0) ** 2))  # noqa: E731
    tops = [int(round(contour(x))) for x in range(W)]
    for x in range(W):
        facing = tops[(x + 3) % W] - tops[(x - 3) % W]  # > 0: falls away to the right = looks at the moon
        for y in range(tops[x], 122):
            d = y - tops[x]
            if d == 0:
                c = crest if facing >= 0 else lit
            elif facing < -1 and d < 5:
                c = shade  # the lee of a crest
            elif facing > 1 and d < 3:
                c = lit
            else:
                c = body
            px[x, y] = (*c, 255)
    # Wind ripples: long shallow shadows lying along the slope.
    for _ in range(26):
        x0, n, off = rng.randrange(W), rng.randint(10, 34), rng.randint(4, 12)
        for k in range(n):
            x = (x0 + k) % W
            y = tops[x] + off + int(1.5 * math.sin(math.pi * k / n))
            if y < 121:
                px[x, y] = (*(shade if k % 7 else body), 255)
                if 2 < k < n - 2:
                    px[x, y - 1] = (*lit, 255)
    over = blank(W, H)
    # Rock outcrops, capped with snow.
    for _ in range(7):
        x = rng.randrange(W)
        _rock(over, x, tops[x] + 4, rng.uniform(5, 10), rng.uniform(5, 9), g, crest, rng)
        if rng.random() < 0.6:
            _rock(over, x + rng.uniform(6, 11), tops[x] + 4, rng.uniform(3, 5), rng.uniform(3, 5), g, crest, rng)
    for cx in (34, 150, 240, 372, 452, 566):
        for _ in range(rng.randint(2, 4)):
            x = cx + rng.uniform(-24, 24)
            _pine(over, x, tops[int(x) % W] + 4, rng.uniform(17, 34), g)
    # Prayer flags: poles with sagging lines of small coloured flags.
    poles = [(96, 22.0), (178, 26.0), (300, 20.0), (334, 25.0), (508, 25.0), (588, 21.0)]
    tips = []
    for x, hgt in poles:
        base = tops[x] + 2
        lean = rng.uniform(-1.5, 1.5) * (3 if g.torment else 1)
        _silhouette(over, polygon([(x - 0.8, base), (x + 0.8, base), (x + 0.8 + lean, base - hgt), (x - 0.8 + lean, base - hgt)]), g.stone[0], g.stone[1])
        tips.append((x + lean, base - hgt + 1))
    for i, ((x0, y0), (x1, y1)) in enumerate(zip(tips, tips[1:] + [(tips[0][0] + W, tips[0][1])])):
        if g.torment and i % 2 == 1:
            continue
        span = x1 - x0
        if span > 140:
            continue
        sag = span * 0.11
        n = int(span)
        for j in range(n + 1):
            t = j / max(1, n)
            x, y = x0 + span * t, y0 + (y1 - y0) * t + sag * 4 * t * (1 - t)
            put(over, int(x), int(y), g.stone[0])
            if j % 4 == 2 and (not g.torment or rng.random() < 0.5):
                flag = g.flags[(j // 4 + i) % len(g.flags)]
                put(over, int(x), int(y) + 1, flag)
                put(over, int(x) + 1, int(y) + 1, flag)
                put(over, int(x), int(y) + 2, flag)
    img.alpha_composite(over)
    return img


def _lantern(img: Image.Image, lx: int, b: int, g: Grade, lit: bool = True) -> None:
    """A stone lantern standing on y = b: foot, shaft, a fire box and a snow-capped roof."""
    shape = (rect(lx - 2.5, b - 2, lx + 2.5, b) | rect(lx - 1, b - 7, lx + 1, b - 2) | rect(lx - 3, b - 12, lx + 3, b - 7)
             | polygon([(lx - 4.5, b - 12), (lx + 4.5, b - 12), (lx, b - 16)]))
    _silhouette(img, shape, g.stone[0], g.stone[1])
    for dx, dy in ((0, -10), (-1, -10), (0, -9), (-1, -9), (1, -10)):
        put(img, lx + dx, b + dy, g.lamp if lit else g.stone[0])
    for dx in range(-3, 4):
        put(img, lx + dx, b - 13 - (1 if abs(dx) < 2 else 0), g.snow[2])


def ground(g: Grade, rng: random.Random) -> Image.Image:
    """The snow bank with its stone lanterns, the flagstone path, and below it three ranks of drifts falling
    towards the viewer, each with a moonlit crest and a shadow under it, with stones, frozen grass, tracks and a
    cairn in them."""
    img = blank(W, H)
    px = img.load()
    deep, snow, light, sparkle = g.snow
    dark_p, path, light_p = g.path
    bank = _noise(rng, 30, 1.6)
    bump = _noise(rng, 10, 0.9)
    top = [int(round(112 + bank(x) + bump(x))) for x in range(W)]
    path_top, path_bot = PATH_Y - 6, PATH_Y + 5
    drifts = []
    for i, (y0, amp, step) in enumerate(((path_bot + 1, 0.0, 30), (path_bot + 10, 2.6, 60), (path_bot + 20, 3.2, 50))):
        f = _noise(rng, step, amp)
        f2 = _noise(rng, 15, amp * 0.35)
        drifts.append([int(round(y0 + f(x) + f2(x))) for x in range(W)])
    for x in range(W):
        for y in range(top[x], path_top):
            t = (y - top[x]) / max(1, path_top - top[x])
            px[x, y] = (*dither_pick([light, snow, snow, deep], t, x, y), 255)
        # The path: flagstones trodden clear of snow.
        for y in range(path_top, path_bot + 1):
            px[x, y] = (*(light_p if y <= path_top + 1 else dark_p if y >= path_bot - 1 else path), 255)
        # The drifts: each rank from its crest down to the next one's crest, lit on top, in shade at its foot.
        for i in range(3):
            y0 = drifts[i][x] if i else path_bot + 1
            y1 = drifts[i + 1][x] if i < 2 else H
            tones = [g.near[i], g.near[i + 1], g.near[i + 1], g.near[i + 2]]
            for y in range(y0, max(y0, y1)):
                t = (y - y0) / max(1, y1 - y0)
                px[x, y] = (*dither_pick(tones, t, x, y), 255)
    # Crests of the two nearer drifts: a bright lip, and the shadow it throws on the snow behind it.
    for i in (1, 2):
        for x in range(W):
            y = drifts[i][x]
            facing = drifts[i][(x + 3) % W] - drifts[i][(x - 3) % W]
            if 0 <= y < H:
                px[x, y] = (*(g.near[0] if facing >= 0 else g.near[i]), 255)
                if y + 1 < H and facing >= 0 and x % 5:
                    px[x, y + 1] = (*g.near[i], 255)
    # Snow lipping over both edges of the path, slab joints, and snow trodden into it.
    for x in range(W):
        if rng.random() < 0.7:
            put(img, x, path_top, snow)
        if rng.random() < 0.35:
            put(img, x, path_top + 1, deep)
        if rng.random() < 0.7:
            put(img, x, path_bot, g.near[1])
        if rng.random() < 0.3:
            put(img, x, path_bot - 1, g.near[2])
    for x0 in range(0, W, 20):
        jx = x0 + rng.randint(0, 8)
        for y in range(path_top + 2, path_bot - 1):
            if rng.random() < 0.8:
                put(img, jx + (y % 2), y, dark_p)
    for _ in range(20):  # worn light patches and a little snow left between the slabs
        x, y = rng.randrange(W), rng.randrange(path_top + 2, path_bot - 1)
        put(img, x, y, light_p)
        put(img, x + 1, y, light_p)
    for _ in range(14):
        x, y, n = rng.randrange(W), rng.choice((path_top + 2, path_bot - 2)), rng.randint(3, 7)
        for k in range(n):
            put(img, x + k, y, g.near[2] if not g.torment else light_p)
    # Footprints along the path.
    for i in range(0, W, 13):
        y = PATH_Y + (2 if (i // 13) % 2 else -1)
        put(img, i + 3, y, dark_p)
        put(img, i + 4, y, dark_p)
        put(img, i + 4, y + 1, dark_p)
    # Sparkle on the bank and on the crests.
    for _ in range(70):
        x = rng.randrange(W)
        put(img, x, rng.randrange(top[x], path_top), sparkle)
    for _ in range(60):
        x, i = rng.randrange(W), rng.choice((0, 1, 2))
        put(img, x, (drifts[i][x] if i else path_bot + 2) + rng.randint(0, 3), sparkle)
    # Wind ripples in the near snow.
    for _ in range(30):
        x0, y, n = rng.randrange(W), rng.randrange(path_bot + 4, H - 3), rng.randint(6, 18)
        for k in range(n):
            yy = y + (1 if k in (0, n - 1) else 0)
            if px[(x0 + k) % W, yy][:3] in (g.near[1], g.near[2], g.near[3]):
                put(img, x0 + k, yy, g.near[2] if px[(x0 + k) % W, yy][:3] == g.near[1] else g.near[1])
    # Stone lanterns on the far side of the path, each with a flame, a cap of snow and its light on the bank.
    for i in range(0, W, 100):
        lx = i + 38
        b = path_top + 1
        if g.torment and (i // 100) % 2 == 1:
            _silhouette(img, polygon([(lx - 6, b), (lx + 5, b), (lx + 4, b - 4), (lx - 4, b - 3)]), g.stone[0], g.stone[1])
            continue
        _lantern(img, lx, b, g)
        if not g.torment:
            for dx in range(-8, 9):
                for dy in (-1, 0):
                    if abs(dx) + (0 if dy else 2) < 9 and (dx + dy) % 2 == 0:
                        put(img, lx + dx, b + dy - 1, g.glow)
    # Rocks breaking the bank, capped white.
    for i in range(0, W, 74):
        _rock(img, i + rng.randint(4, 30), path_top + 1, rng.uniform(3, 6), rng.uniform(3, 5), g, light, rng)
    # In the near snow: half-buried stones with a shadow on their left, tufts of frozen grass, an animal's tracks.
    for _ in range(9):
        sx, sy = rng.randrange(W), rng.randrange(path_bot + 8, H - 6)
        rw, rh = rng.uniform(3, 7), rng.uniform(3, 6)
        _rock(img, sx, sy, rw, rh, g, g.near[0], rng)
        for k in range(int(rw * 1.6)):
            put(img, sx - int(rw) - k, sy + (1 if k > rw else 0), g.near[3])
    for _ in range(16):
        x, y = rng.randrange(W), rng.randrange(path_bot + 7, H - 2)
        # Dry stalks standing out of the snow in a small fan.
        for dx, hgt in ((-2, 2), (-1, 4), (0, 5), (1, 4), (2, 3)):
            if rng.random() < 0.25:
                continue
            for j in range(hgt):
                lean = (1 if dx > 0 else -1 if dx < 0 else 0) * (1 if j >= 3 else 0)
                put(img, x + dx + lean, y - j, g.grass[1] if j == hgt - 1 else g.grass[0])
    tx, ty = rng.randrange(W), path_bot + 7
    for k in range(34):  # tracks wandering down and across
        put(img, tx + k * 5, ty + int(k * 0.55) + (k % 2), g.near[3])
        put(img, tx + k * 5 + 1, ty + int(k * 0.55) + (k % 2), g.near[3])
    # A cairn with a scrap of prayer flag, and a small lantern, set down in the near snow.
    for cx in (148, 452):
        cy = path_bot + 15
        for (dx, dy, rw, rh) in ((0, 0, 5.5, 2.6), (-0.5, -4, 4.2, 2.2), (0.5, -7.5, 3.0, 1.8), (0, -10.5, 1.8, 1.4)):
            pts = rasterize(ellipse(cx + dx, cy + dy, rw, rh), W, H)
            for (a, b) in pts:
                edge = (a + 1, b) not in pts or (a, b - 1) not in pts
                put(img, a, b, g.stone[1] if edge else g.stone[0])
        for dx in range(-2, 3):
            put(img, cx + dx, cy - 12, g.near[0])
        for dy in range(7):
            put(img, cx + 1, cy - 13 - dy, g.stone[0])
        if not g.torment or cx == 148:
            for k, flag in enumerate(g.flags[:3]):
                put(img, cx + 2 + k * 2, cy - 19 + (k % 2), flag)
                put(img, cx + 2 + k * 2, cy - 18 + (k % 2), flag)
        for k in range(9):
            put(img, cx - 6 - k, cy + 1 + (1 if k > 5 else 0), g.near[3])
    _lantern(img, 318, path_bot + 21, g, lit=not g.torment)
    if not g.torment:
        for dx in range(-9, 10):
            if dx % 2 == 0:
                put(img, 318 + dx, path_bot + 22, g.glow)
            if abs(dx) < 6 and dx % 2:
                put(img, 318 + dx, path_bot + 23, g.glow)
    if g.torment:
        for _ in range(7):
            _crystal(img, rng.uniform(0, W), rng.choice([path_top - 1, rng.randrange(path_bot + 8, H - 4)]), rng)
    return img


def foreground(g: Grade, rng: random.Random) -> Image.Image:
    """Dark mounds sliding past at the bottom with dead grass on them, a snow-laden branch reaching into the top
    of the frame, a few close flakes."""
    img = blank(W, H)
    body, rim = g.fore
    for _ in range(5):
        x = rng.uniform(0, W)
        shape = ellipse(x, H + 5, rng.uniform(20, 38), rng.uniform(8, 12))
        shape = shape | ellipse(x + rng.uniform(-26, 26), H + 4, rng.uniform(10, 18), rng.uniform(6, 9))
        _silhouette(img, shape, body, rim, sun_side=1)
        for _ in range(rng.randint(3, 6)):  # dead stalks standing out of it
            sx = x + rng.uniform(-22, 22)
            tip = (sx + rng.uniform(-4, 4), H - rng.uniform(11, 19))
            stalk = capsule(sx, H, tip[0], tip[1], 0.6, 0.4)
            if rng.random() < 0.5:
                stalk = stalk | capsule((sx + tip[0]) / 2, (H + tip[1]) / 2, tip[0] + rng.uniform(2, 5), tip[1] + rng.uniform(1, 4), 0.4)
            _silhouette(img, stalk, body, rim, sun_side=1)
    # The branch: from the top edge, with snow lying along it.
    for bx, length, sgn in ((70.0, 62.0, 1), (430.0, 48.0, -1)):
        shape = capsule(bx, -2, bx + sgn * length, 15, 2.2, 0.7)
        for t, tl in ((0.35, 16.0), (0.6, 12.0), (0.8, 9.0)):
            x0, y0 = bx + sgn * length * t, -2 + 17 * t
            shape = shape | capsule(x0, y0, x0 + sgn * tl * 0.7, y0 + tl * 0.6, 0.9, 0.4)
        pts = rasterize(_shift(shape, W), W * 3, H)
        pts = {(a - W, b) for (a, b) in pts}
        for (a, b) in pts:
            put(img, a, b, (g.snow[2] if not g.torment else rim) if (a, b - 1) not in pts else g.pine[0])
    for _ in range(36):
        x, y = rng.randrange(W), rng.choice([rng.randrange(0, 26), rng.randrange(138, H)])
        put(img, x, y, g.flake[0])
        put(img, x + 1, y, g.flake[0])
    return img


LAYERS = (
    ("sky", sky, 0.0),
    ("far", far_peaks, 0.08),
    ("ridge", ridge, 0.2),
    ("mist", mist, 0.3),
    ("slopes", slopes, 0.48),
    ("ground", ground, 1.0),
    ("fore", foreground, 1.35),
)


def build(grade: str, seed: int = 505) -> dict[str, Image.Image]:
    g = GRADES[grade]
    out: dict[str, Image.Image] = {}
    for i, (name, fn, _speed) in enumerate(LAYERS):
        out[name] = fn(g, random.Random(seed * 100 + i))
    return out
