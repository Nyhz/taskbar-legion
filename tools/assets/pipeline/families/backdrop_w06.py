"""World 6 backdrop — the coast of sunken ruins: a drowned city under a heavy sky, one break in the clouds
pouring light onto the sea — in every difficulty grade.

Layers (back to front): sky (cloud banks with lit tops and dark bellies, the break and its shafts of light, the
sea in perspective with its swell and the road of light on it), far (an aqueduct, a lighthouse and towers on the
horizon, pale, with their reflections), mid (the drowned city: temple fronts with their pediments, the helmeted
head and the hand of a toppled colossus rising from the water), mist, near (the great piers and the arch, a quay
whose stairs go down into the sea, a fallen column, breakers at every foot and the shallows rolling in), ground
(wet sand, the ruined causeway the party walks, and below it the beach: tide pools, shells, weed, the ribs of a
wreck) and foreground (barnacled rocks and foam). Depth is by value: the further, the paler. The light comes
from the break, up and to the left: every stone is lit on its top and its left and shadowed on its right.
Behind the fighters (the sea from a little under the horizon down to the sand) everything is held to one mid-dark
value with dim crests, so pale and dark figures both stand clear of it; the bright things — the haze, the break,
the far city — stay above their heads.

The Torment grade is the abyss: a storm sky of bruised blue, a night-black sea that glows cold along its crests
and in the shallows as if lit from below, the ruins black teeth, their pieces hanging in the air, and something
vast lying under the water far out. Only the Rift and its crystals are violet — and the Rift's light on the sea.
`ATMOSPHERE` gives the strip its weather: drifting spray in Normal; in Torment a sea storm (lightning into the
water, driving rain, a slow dark swell) and pale eyes that open far out.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass

from PIL import Image

from ..backdrop import blank, dither_pick, fill_below, periodic, put, vertical_gradient
from ..palette import Color, color, hex_of
from ..raster import Shape, arc_band, capsule, circle, ellipse, polygon, rasterize, rect, rotate_shape
from .backdrop_w01 import H, PATH_Y, W, _crystal, _rift, _shift
from .backdrop_w02 import LIGHTER

__all__ = ["W", "H", "PATH_Y", "LAYERS", "GRADES", "PREVIEW_BG", "ATMOSPHERE", "build"]

#: The tone creature previews of this world are shown on.
PREVIEW_BG: Color = color("ink", 6)
#: y of the sea's horizon.
HORIZON = 84
#: Where the clouds break (the light source of the whole scene).
BREAK = (172, 44)

Tones = tuple[Color, Color, Color]  # shadow, body, lit


@dataclass(frozen=True)
class Grade:
    key: str
    sky: list[Color]
    ceiling: tuple[Color, Color, Color, Color]  # the heavy upper banks: belly, body, light, lit top
    cloud: tuple[Color, Color, Color, Color]  # the middle banks
    haze: tuple[Color, Color, Color, Color]  # the thin banks near the horizon
    glow: tuple[Color, Color, Color]  # the break: halo, inner, core
    road: tuple[Color, Color]  # the light lying on the water under it: core, edge (mid tones: figures stand before it)
    sea: list[Color]  # horizon → shore
    foam: Color  # the brightest broken water: kept to small accents
    cap: Color  # whitecaps on the open sea, a step under the foam so they do not fight the figures
    wash: Color  # the long lines of the shallows and the wash on the sand
    far: tuple[Color, Color]  # body, rim
    mid: Tones
    slot: Color  # the dark openings of the mid ruins
    near: Tones
    shallows: Tones  # trough, body, crest
    mist: tuple[Color, Color]  # body, lit top
    sand: tuple[Color, Color, Color, Color]  # deep, body, light, lit
    wet: tuple[Color, Color]  # the sky mirrored in wet sand: dim, bright
    path: Tones  # dark, body, light
    pool: tuple[Color, Color]
    weed: tuple[Color, Color]
    wood: Tones
    shells: tuple[Color, ...]
    relic: tuple[Color, Color]  # bronze and clay left on the beach
    fore: Tones
    torment: bool = False


def _c(r: str, i: int) -> Color:
    return color(r, i)


NORMAL = Grade(
    key="normal",
    sky=[_c("ink", 4), _c("ink", 5), _c("ink", 6), _c("ink", 7), _c("ink", 8), _c("bone", 7)],
    ceiling=(_c("ink", 2), _c("ink", 3), _c("ink", 5), _c("ink", 7)),
    cloud=(_c("ink", 4), _c("ink", 6), _c("ink", 8), _c("bone", 7)),
    haze=(_c("ink", 7), _c("ink", 8), _c("ink", 9), _c("light", 0)),
    glow=(_c("bone", 7), _c("dusk", 9), _c("light", 0)),
    road=(_c("sea", 6), _c("sea", 5)),
    sea=[_c("sea", 7), _c("sea", 5), _c("sea", 4), _c("sea", 3), _c("sea", 3), _c("sea", 2)],
    foam=_c("bone", 7),
    cap=_c("sea", 6),
    wash=_c("sea", 6),
    far=(_c("ink", 7), _c("ink", 8)),
    mid=(_c("ink", 4), _c("ink", 5), _c("ink", 6)),
    slot=_c("ink", 3),
    near=(_c("ink", 2), _c("ink", 3), _c("ink", 5)),
    shallows=(_c("sea", 1), _c("sea", 3), _c("sea", 4)),
    mist=(_c("sea", 4), _c("sea", 5)),
    sand=(_c("bone", 2), _c("bone", 3), _c("bone", 4), _c("bone", 6)),
    wet=(_c("ink", 6), _c("ink", 8)),
    path=(_c("ink", 3), _c("ink", 4), _c("ink", 6)),
    pool=(_c("sea", 4), _c("sea", 7)),
    weed=(_c("moss", 2), _c("moss", 4)),
    wood=(_c("leather", 1), _c("leather", 2), _c("leather", 4)),
    shells=(_c("bone", 7), _c("crimson", 6), _c("dusk", 8)),
    relic=(_c("leather", 3), _c("leather", 5)),
    fore=(_c("ink", 0), _c("ink", 1), _c("ink", 4)),
)

TORMENT = Grade(
    key="torment",
    sky=[_c("ink", 0), _c("ink", 1), _c("azure", 0), _c("azure", 1), _c("azure", 1), _c("azure", 2)],
    ceiling=(_c("ink", 0), _c("ink", 1), _c("azure", 0), _c("azure", 3)),
    cloud=(_c("ink", 1), _c("azure", 0), _c("azure", 2), _c("azure", 4)),
    haze=(_c("azure", 1), _c("azure", 2), _c("azure", 3), _c("azure", 4)),
    glow=(_c("violet", 5), _c("violet", 7), _c("violet", 8)),
    road=(_c("violet", 6), _c("violet", 4)),  # the Rift's light lying on the water
    # Black far out, then lit from below as it shoals: the band behind the fighters is a step lighter than night.
    sea=[_c("azure", 2), _c("azure", 0), _c("azure", 1), _c("azure", 2), _c("azure", 2), _c("azure", 3)],
    foam=_c("azure", 8),
    cap=_c("azure", 5),
    wash=_c("azure", 6),
    far=(_c("azure", 1), _c("azure", 3)),
    mid=(_c("ink", 1), _c("azure", 1), _c("azure", 3)),
    slot=_c("ink", 0),
    near=(_c("ink", 0), _c("ink", 1), _c("azure", 3)),
    shallows=(_c("azure", 1), _c("azure", 3), _c("azure", 5)),
    mist=(_c("azure", 3), _c("azure", 4)),
    sand=(_c("ink", 1), _c("ink", 2), _c("ink", 3), _c("azure", 4)),
    wet=(_c("azure", 2), _c("azure", 4)),
    path=(_c("ink", 2), _c("ink", 3), _c("ink", 5)),
    pool=(_c("azure", 2), _c("azure", 6)),
    weed=(_c("ink", 1), _c("azure", 2)),
    wood=(_c("ink", 0), _c("ink", 1), _c("ink", 4)),
    shells=(_c("azure", 7), _c("ink", 6)),
    relic=(_c("ink", 4), _c("azure", 5)),
    fore=(_c("ink", 0), _c("ink", 0), _c("azure", 2)),
    torment=True,
)

GRADES = {"normal": NORMAL, "torment": TORMENT}

#: The weather the strip runs over this world (see lab_page.atmosphere for the fields).
ATMOSPHERE = {
    "normal": [
        # Fine spray blown in off the breakers, behind the fighters.
        {"fx": "particles", "count": 28, "color": [hex_of(_c("sea", 7)), hex_of(_c("bone", 6))], "vx": 16, "vy": -4, "sway": 2,
         "alpha": 0.4, "ymax": 112, "front": False},
    ],
    "torment": [
        # A storm at sea: bolts go into the water out by the horizon, away from the Rift.
        {"fx": "lightning", "every": [3500, 9000], "flash": hex_of(_c("azure", 7)), "alpha": 0.36, "bolt": hex_of(_c("light", 0)),
         "x": [320, 590], "y": [34, HORIZON], "shake": 1},
        {"fx": "particles", "count": 80, "color": [hex_of(_c("azure", 5)), hex_of(_c("azure", 6))], "vx": -80, "vy": 250, "len": 5, "alpha": 0.38},
        # Pale eyes open far out on the water, and close.
        {"fx": "eyes", "every": [4000, 9000], "hold": 1700, "color": hex_of(_c("azure", 8)), "zones": [[300, 87, 596, 93], [4, 87, 150, 93]],
         "max": 2, "size": 1, "gap": 4},
        # The whole sea heaves: a slow darkening, like a swell passing under everything.
        {"fx": "pulse", "color": hex_of(_c("ink", 0)), "period": 5400, "alpha": 0.18},
    ],
}


# ------------------------------------------------------------------------------------- helpers
def _pixels(img: Image.Image, shape: Shape) -> set[tuple[int, int]]:
    """The pixels of a shape, in the layer's own coordinates (x may fall outside 0…W: `put` wraps it)."""
    pts = rasterize(_shift(shape, img.width), img.width * 3, H)
    return {(x - img.width, y) for (x, y) in pts}


def _solid(img: Image.Image, shape: Shape, tones: Tones, band: int = 2) -> set[tuple[int, int]]:
    """A block of stone: lit along its top and its left edge (towards the break), a band of shadow down its
    right side, the body between."""
    shadow, body, lit = tones
    pts = _pixels(img, shape)
    for (x, y) in pts:
        if (x, y - 1) not in pts or (x - 1, y) not in pts:
            c = lit
        elif any((x + k, y) not in pts for k in range(1, band + 1)):
            c = shadow
        else:
            c = body
        put(img, x, y, c)
    return pts


def _flat(img: Image.Image, shape: Shape, tone: Color) -> None:
    for (x, y) in _pixels(img, shape):
        put(img, x, y, tone)


def _shift_y(shape: Shape, dy: float) -> Shape:
    x0, y0, x1, y1 = shape.bbox
    return Shape(lambda x, y: shape.contains(x, y - dy), (x0, y0 + dy, x1, y1 + dy))


def _column(img: Image.Image, x: float, base: float, height: float, w: float, tones: Tones, rng: random.Random, whole: bool, lift: float = 0.0) -> float:
    """A fluted column on a plinth. Broken ones end in a jagged top; `lift` floats the upper drums free of the
    stump (Torment). Returns the y of its top."""
    top = base - height
    shaft = rect(x - w / 2, top, x + w / 2, base) | rect(x - w / 2 - 1, base - 2, x + w / 2 + 1, base)
    if whole:
        shaft = shaft | rect(x - w / 2 - 1.2, top - 2, x + w / 2 + 1.2, top)
    else:
        shaft = shaft | polygon([(x - w / 2, top), (x - w / 2, top - rng.uniform(1, 3)), (x - w * 0.1, top - rng.uniform(0, 1.5)), (x + w * 0.2, top - rng.uniform(2, 4)),
                                 (x + w / 2, top - rng.uniform(0, 2)), (x + w / 2, top)])
    parts = [shaft]
    if lift:
        cut = base - height * rng.uniform(0.45, 0.6)
        parts = [shaft & rect(x - w, cut, x + w, base + 1), _shift_y(shaft & rect(x - w, top - 6, x + w, cut - 1), -lift)]
    for part in parts:
        _solid(img, part, tones, band=1)
    if w >= 4:  # one flute down the middle
        for y in range(int(top) + 2, int(base) - 3):
            if not lift:
                put(img, int(x), y, tones[0])
    return top - lift


def _foam_at(img: Image.Image, x: float, y: float, half: float, foam: Color, rng: random.Random) -> None:
    """Broken water round the foot of something standing in the sea."""
    for dx in range(int(-half), int(half) + 1):
        if rng.random() < 0.75:
            put(img, int(x + dx), int(y), foam)
        if abs(dx) > half * 0.5 and rng.random() < 0.35:
            put(img, int(x + dx), int(y) + 1, foam)


def _breaker(img: Image.Image, x: float, y: float, size: float, g: Grade, rng: random.Random) -> None:
    """A wave breaking against stone: a burst of foam thrown up its seaward (left) side."""
    for _ in range(int(size * 4)):
        dx, dy = rng.uniform(-size, size * 0.6), -abs(rng.gauss(0, size * 0.5))
        put(img, int(x + dx), int(y + dy), g.foam if rng.random() < 0.3 else g.wash)
    for dx in range(int(-size - 2), int(size + 3)):
        if rng.random() < 0.85:
            put(img, int(x + dx), int(y) + 1, g.wash)


def _reflection(img: Image.Image, x: float, y: float, w: float, depth: int, tone: Color) -> None:
    """A broken reflection under something on the water: dashes that thin out downwards."""
    for j in range(depth):
        if j % 2 == 0:
            span = w * (1 - j / (depth * 1.4))
            for dx in range(int(-span / 2), int(span / 2) + 1):
                if (dx + j) % 3 != 0:
                    put(img, int(x + dx), int(y + j), tone)


def _bank(img: Image.Image, rng: random.Random, cx: float, base: float, length: float, height: float, tones: tuple[Color, Color, Color, Color],
          warm: Color | None = None) -> None:
    """A bank of cloud with volume: a flat dark belly, a body, a paler upper third and a lit top. Tops within
    reach of the break take its warm light."""
    belly, body, light, lit = tones
    shape = ellipse(cx, base - height * 0.15, length / 2, height * 0.32)
    n = max(3, int(length / 10))
    for i in range(n):
        u = (i + 0.5) / n
        r = height * rng.uniform(0.34, 0.62) * (0.5 + 0.5 * math.sin(math.pi * u))
        shape = shape | circle(cx - length / 2 + u * length + rng.uniform(-3, 3), base - height * 0.3 - r * 0.35, r)
    # The belly is nearly flat but not ruled: it sags in slow waves.
    phase, period = rng.uniform(0, 6), rng.uniform(13, 22)
    whole = shape | ellipse(cx, base, length * 0.42, height * 0.22)
    shape = Shape(lambda x, y: whole.contains(x, y) and y <= base + 1.6 * math.sin(x / period + phase), whole.bbox)
    cols: dict[int, list[int]] = {}
    pts = _pixels(img, shape)
    for (x, y) in pts:
        cols.setdefault(x, []).append(y)
    for x, ys in cols.items():
        y0, y1 = min(ys), max(ys)
        for y in ys:
            if (x, y - 1) not in pts:
                near = warm is not None and math.hypot((x % W) - BREAK[0], (y - BREAK[1]) * 2.2) < 86
                c = warm if near else lit
            elif y >= y1 - 1 and y1 - y0 > 3:
                c = belly
            elif y - y0 <= max(1, (y1 - y0) * 0.3):
                c = light
            else:
                c = body
            put(img, x, y, c)


# ------------------------------------------------------------------------------------- layers
def sky(g: Grade, rng: random.Random) -> Image.Image:
    img = blank(W, H)
    vertical_gradient(img, g.sky, 0, HORIZON, curve=0.9)
    px = img.load()
    bx, by = BREAK
    if g.torment:
        _rift(img, rng)  # no stars: the storm has the whole sky
    else:
        # The break in the clouds: the only clear light in the sky.
        for shape, tone in ((ellipse(bx, by, 36, 10), g.glow[0]), (ellipse(bx, by, 22, 5.5), g.glow[1]), (ellipse(bx + 2, by, 9, 2.4), g.glow[2])):
            for (x, y) in rasterize(shape, W, H):
                px[x, y] = (*tone, 255)
    # Thin banks low over the horizon, then the middle banks (leaving the break open), then the heavy ceiling.
    for _ in range(7):
        _bank(img, rng, rng.uniform(0, W), rng.uniform(64, 78), rng.uniform(60, 150), rng.uniform(4, 7), g.haze)
    for i in range(6):
        cx = (i + 0.5) * W / 6 + rng.uniform(-26, 26)
        length, base = rng.uniform(70, 150), rng.uniform(46, 68)
        if not g.torment and abs(cx - bx) < length / 2 + 34 and base < 64:
            cx = bx + (length / 2 + 44) * (1 if cx >= bx else -1)
        _bank(img, rng, cx, base, length, rng.uniform(13, 23), g.cloud, None if g.torment else g.glow[1])
    for i in range(6 if not g.torment else 3):
        cx = (i + 0.5) * W / 6 + rng.uniform(-34, 34)
        _bank(img, rng, cx, rng.uniform(20, 38), rng.uniform(150, 240), rng.uniform(22, 34), g.ceiling, None if g.torment else g.glow[0])
    if not g.torment:
        # Shafts of light falling from the break to the sea, brightening whatever they cross.
        for a, b, w0, w1 in ((-12.0, -58.0, 4.0, 15.0), (-2.0, -10.0, 5.0, 17.0), (9.0, 40.0, 4.0, 14.0), (19.0, 86.0, 3.0, 11.0)):
            for y in range(by + 8, HORIZON):
                t = (y - by - 8) / (HORIZON - by - 8)
                xc, wid = bx + a + (b - a) * t, w0 + (w1 - w0) * t
                for x in range(int(xc - wid / 2), int(xc + wid / 2)):
                    c = px[x % W, y][:3]
                    if c in LIGHTER:
                        px[x % W, y] = (*LIGHTER[c], 255)
    # The sea, from the horizon to the shore, and a pale line of haze where it meets the sky.
    for y in range(HORIZON, 126):
        t = ((y - HORIZON) / 32) ** 0.6  # it darkens quickly: mid-dark by the height of a hero's head
        for x in range(W):
            px[x, y] = (*dither_pick(g.sea, t, x, y), 255)
    for x in range(W):
        px[x, HORIZON] = (*LIGHTER.get(g.sea[0], g.sea[0]), 255)
    if g.torment:
        _leviathan(img, rng)
    # The swell, in perspective: short close-set crests far out, long ones with a dark trough near the shore.
    y = HORIZON + 2
    while y < 122:
        d = y - HORIZON
        seg = 3.0 + d * 0.9
        x = rng.uniform(-seg, 0)
        while x < W:
            length = seg * rng.uniform(0.6, 1.7)
            if rng.random() < 0.72:
                capped = d > 9 and rng.random() < (0.3 if g.torment else 0.12)
                for k in range(int(length)):
                    xx = int(x + k) % W
                    base = px[xx, y][:3]
                    px[xx, y] = (*(g.cap if capped and k < length * 0.5 else LIGHTER.get(base, base)), 255)
                    if d > 7 and y + 1 < H and k > 1:
                        px[xx, y + 1] = (*g.sea[min(len(g.sea) - 1, int(d / 8) + 1)], 255)
            x += length + seg * rng.uniform(0.4, 1.3)
        y += 2 + int(d * 0.07)
    # The road of light on the water under the break.
    road = 262 if g.torment else bx - 14
    for y in range(HORIZON + 1, HORIZON + 30, 2):
        half = 4 + (y - HORIZON) * 1.1
        x = road - half + rng.uniform(0, 4)
        while x < road + half:
            run = rng.randint(2, 4 + (y - HORIZON) // 5)
            for k in range(run):
                px[int(x + k) % W, y] = (*(g.road[0] if abs(x + k - road) < half * 0.4 else g.road[1]), 255)
            x += run + rng.randint(2, 4 + (y - HORIZON) // 4)
    return img


def _leviathan(img: Image.Image, rng: random.Random) -> None:
    """Torment: something vast lying in the water far out — the coils of a black back breaking the surface one
    after another, wet along their tops, a long shadow under them, and a head with two pale eyes turned this
    way. It lies to the left of where anybody fights."""
    px = img.load()
    y0 = HORIZON + 6
    for (x, y) in rasterize(ellipse(78, y0 + 3, 74, 2.6), W, H):  # the shadow of the rest of it, under water
        if y > y0 + 1:
            px[x, y] = (*_c("ink", 0), 255)
    for cx, rx, ry in ((24.0, 12.0, 5.0), (56.0, 15.0, 7.0), (92.0, 14.0, 6.0), (124.0, 9.0, 5.0)):
        pts = {(x, y) for (x, y) in rasterize(ellipse(cx, y0 + 1, rx, ry), W, H) if y <= y0}
        for (x, y) in pts:
            top = (x, y - 1) not in pts
            px[x, y] = (*(_c("azure", 4) if top and x >= cx - rx * 0.2 else _c("azure", 2) if top else _c("ink", 0)), 255)
        for dx in range(int(-rx) - 2, int(rx) + 3):  # the water breaking round each coil
            if rng.random() < 0.6:
                px[int(cx + dx) % W, y0 + 1] = (*_c("azure", 5), 255)
    for sx, hgt in ((50, 3), (56, 4), (62, 3), (88, 3), (94, 3)):  # spines along the highest coils
        for j in range(hgt):
            px[sx, y0 - 7 - j + (1 if sx in (50, 62, 88) else 0)] = (*(_c("azure", 4) if j == hgt - 1 else _c("ink", 0)), 255)
    for ex in (125, 129):  # the eyes
        px[ex, y0 - 2] = (*_c("azure", 8), 255)
        px[ex, y0 - 1] = (*_c("azure", 5), 255)


def far_ruins(g: Grade, rng: random.Random) -> Image.Image:
    """The far city on the horizon, pale in the haze: an aqueduct, a lighthouse, towers, and their reflections."""
    img = blank(W, H)
    body, rim = g.far
    base = HORIZON + 1

    def stand(shape: Shape, x: float, w: float) -> None:
        pts = _pixels(img, shape)
        for (a, b) in pts:
            put(img, a, b, rim if (a, b - 1) not in pts or (a - 1, b) not in pts else body)
        _reflection(img, x, base + 1, w, 7, body)

    # The aqueduct: a long run of arches with spans fallen out of it.
    ax0, spans = 368.0, 9
    deck = rect(ax0, base - 22, ax0 + spans * 17 + 3, base)
    for i in range(spans):
        cx = ax0 + 10 + i * 17
        deck = deck - (circle(cx, base - 9, 6.2) | rect(cx - 6.2, base - 9, cx + 6.2, base + 1))
    for i in ((3, 7) if not g.torment else (1, 3, 4, 7)):
        deck = deck - rect(ax0 + 5 + i * 17, base - 24, ax0 + 15 + i * 17 + rng.uniform(0, 4), base - 9)
    stand(deck, ax0 + spans * 8.5, spans * 17)
    # The lighthouse, its lantern gone.
    lx = 292.0
    tower = polygon([(lx - 5, base), (lx + 5, base), (lx + 3, base - 30), (lx - 3, base - 30)]) | rect(lx - 5, base - 33, lx + 5, base - 30)
    tower = tower | polygon([(lx - 3.5, base - 33), (lx - 3.5, base - 38), (lx - 1, base - 36), (lx + 1.5, base - 41), (lx + 3.5, base - 35), (lx + 3.5, base - 33)])
    stand(tower, lx, 10)
    put(img, int(lx), int(base - 20), body)
    # Towers and lengths of wall.
    for x, w, hgt in ((26.0, 8.0, 19.0), (92.0, 10.0, 26.0), (136.0, 6.0, 12.0), (214.0, 9.0, 22.0), (246.0, 6.0, 9.0), (552.0, 9.0, 17.0)):
        top = base - hgt
        shape = polygon([(x - w / 2, base), (x + w / 2, base), (x + w / 2 - 0.6, top + rng.uniform(0, 5)), (x + w * 0.15, top + rng.uniform(2, 6)), (x - w * 0.1, top),
                         (x - w / 2 + 0.6, top + rng.uniform(1, 4))])
        if rng.random() < 0.6:
            shape = shape | rect(x + w / 2, base - hgt * 0.35, x + w / 2 + rng.uniform(8, 18), base)
        stand(shape, x, w)
        put(img, int(x), int(base - hgt * 0.5), rim)
    return img


def _temple(img: Image.Image, x0: float, base: float, cols: int, col_h: float, g: Grade, rng: random.Random, fallen: tuple[int, ...] = ()) -> None:
    """A temple front standing in the water: steps, columns, entablature and pediment. Columns listed in
    `fallen` are stumps, and the roof above them is gone."""
    gap = 9.0
    width = (cols - 1) * gap + 8
    _solid(img, rect(x0 - 4, base - 2, x0 + width + 4, base + 2) | rect(x0 - 2, base - 4, x0 + width + 2, base - 2), g.mid)
    top = base - 4 - col_h
    for i in range(cols):
        cx = x0 + 4 + i * gap
        if i in fallen:
            _column(img, cx, base - 4, col_h * rng.uniform(0.25, 0.6), 4.0, g.mid, rng, False)
        else:
            _column(img, cx, base - 4, col_h, 4.0, g.mid, rng, True, rng.uniform(3, 6) if g.torment and rng.random() < 0.35 else 0.0)
        _foam_at(img, cx, base + 2, 4.0, g.foam, rng)
    standing = [i for i in range(cols) if i not in fallen]
    if len(standing) < 2:
        return
    a, b = x0 + 4 + standing[0] * gap - 4, x0 + 4 + standing[-1] * gap + 4
    lift = -5.0 if g.torment else 0.0  # the roof hangs clear of its columns
    roof = rect(a - 1, top - 6, b + 1, top - 2)
    peak = (x0 + width / 2, top - 6 - width * 0.24)
    pediment = polygon([(x0 - 3, top - 6), (x0 + width + 3, top - 6), peak]) & rect(a - 2, 0, b + 2, H)
    if fallen:
        pediment = pediment - circle(b + 1 if fallen[0] > standing[-1] else a - 1, top - 9, 5.0)
    _solid(img, _shift_y(roof, lift), g.mid)
    pts = _solid(img, _shift_y(pediment, lift), g.mid)
    # The tympanum: a recessed field with a disc in it.
    for (x, y) in pts:
        if all(n in pts for n in ((x, y - 2), (x - 3, y), (x + 3, y), (x, y + 1))):
            put(img, x, y, g.mid[0])
    cx, cy = int(peak[0]), int(top - 9 + lift)
    if (cx, cy) in pts:
        for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
            put(img, cx + dx, cy + dy, g.mid[2])
    _reflection(img, x0 + width / 2, base + 3, width, 8, g.mid[1])


def mid_city(g: Grade, rng: random.Random) -> Image.Image:
    """The drowned city: temple fronts, the head and the hand of the colossus, lone columns, all standing in
    the water with foam at their feet."""
    img = blank(W, H)
    base = 102.0
    _temple(img, 24, base, 4, 24.0, g, rng)
    _temple(img, 488, base, 5, 27.0, g, rng, fallen=(3, 4))
    for x, hgt, whole in ((104.0, 15.0, False), (128.0, 28.0, True), (140.0, 28.0, True), (322.0, 19.0, False), (350.0, 11.0, False), (586.0, 24.0, True)):
        lift = rng.uniform(3, 7) if g.torment and whole else 0.0
        _column(img, x, base, hgt, 4.0, g.mid, rng, whole, lift)
        _foam_at(img, x, base, 4.5, g.wash, rng)
        _reflection(img, x, base + 2, 5, 7, g.mid[1])
    _solid(img, rect(124.5, base - 34, 143.5, base - 30) if not g.torment else rect(124.5, base - 41, 143.5, base - 37), g.mid)

    # The colossus: its helmeted head, tilted back, half under water.
    cx, cy, r = 238.0, 79.0, 15.0
    helm = circle(cx, cy, r) | rect(cx - r, cy, cx + r - 1, cy + 28)
    helm = helm | polygon([(cx + r - 2, cy - 5), (cx + r + 4.5, cy + 8), (cx + r - 1, cy + 10)])  # nose guard
    helm = helm | polygon([(cx - r, cy + 9), (cx - r - 6, cy + 21), (cx - r, cy + 24)])  # neck guard
    slot = polygon([(cx + 1, cy - 1), (cx + r + 1, cy - 2.5), (cx + r + 1, cy + 4), (cx + 2, cy + 4.5)]) | rect(cx + 7, cy + 4, cx + 10.6, cy + 28)
    crest = arc_band(cx - 1, cy + 1, r + 7.5, r + 1.2, 194, 330)
    water = rect(0, 0, W, base)
    tilt = -15.0

    def set_up(shape: Shape, dy: float = 0.0, dx: float = 0.0) -> Shape:
        s = rotate_shape(shape, tilt, cx, cy + 18) & water
        return _shift(_shift_y(s, dy), dx) if (dx or dy) else s

    if g.torment:  # split at the brow: the skull-cap hangs above the face
        brow = rect(0, 0, W, cy + 1)
        _solid(img, set_up(crest & brow, -6, -2), (g.mid[0], g.mid[0], g.mid[1]))
        _solid(img, set_up(helm & brow, -6, -2), g.mid, band=3)
        _solid(img, set_up(helm - brow), g.mid, band=3)
        _flat(img, set_up(slot - brow), g.slot)
    else:
        _solid(img, set_up(crest), (g.mid[0], g.mid[0], g.mid[1]))
        _solid(img, set_up(helm), g.mid, band=3)
        _flat(img, set_up(slot), g.slot)
    for j in range(11):  # weed streaming from the cheek, a crack across the dome
        put(img, int(cx - 11 + (j // 3)), int(cy + 6 + j), g.weed[1] if j < 2 else g.weed[0])
        put(img, int(cx - 13 + j), int(cy - 9 + (j % 3 == 0) + j * 0.3), g.mid[0])
    _foam_at(img, cx + 1, base, 20, g.wash, rng)
    _foam_at(img, cx + 3, base - 1, 12, g.wash, rng)
    _reflection(img, cx, base + 2, 30, 9, g.mid[1])

    # …and its hand, reaching out of the water further along.
    hx = 420.0
    palm = polygon([(hx - 8, base + 2), (hx + 8, base + 2), (hx + 8.5, base - 9), (hx - 8, base - 10)])
    fingers = [(hx - 6.2, 10.0), (hx - 2.0, 13.5), (hx + 2.4, 12.5), (hx + 6.4, 9.0)]
    hand = palm | capsule(hx + 8, base - 5, hx + 13.5, base - 13, 2.1, 1.7)  # thumb
    tips = []
    for fx, length in fingers:
        bend = (fx - hx) * 0.22
        finger = capsule(fx, base - 9, fx + bend, base - 9 - length * 0.55, 2.0) | capsule(fx + bend, base - 9 - length * 0.55, fx + bend + 1.6, base - 9 - length, 1.9, 1.6)
        if g.torment:
            tips.append(_shift_y(finger & rect(0, 0, W, base - 9 - length * 0.5), -4))
            finger = finger & rect(0, base - 9 - length * 0.5 + 1, W, H)
        hand = hand | finger
    for part in [hand, *tips]:
        _solid(img, rotate_shape(part, 9, hx, base) & water, g.mid)
    for j in range(3):
        put(img, int(hx - 3 + j * 3), int(base - 6), g.mid[0])  # the creases of the palm
    _foam_at(img, hx, base, 11, g.wash, rng)
    _reflection(img, hx, base + 2, 16, 7, g.mid[1])
    return img


def mist(g: Grade, rng: random.Random) -> Image.Image:
    """Sea mist lying on the water in long flat banks."""
    img = blank(W, H)
    body, lit = g.mist
    for _ in range(9):
        cx, cy = rng.uniform(0, W), rng.uniform(92, 105)  # on the water, under the ruins' shoulders
        length = rng.uniform(50, 130)
        shape = ellipse(cx, cy, length / 2, rng.uniform(1.2, 2.2))
        for _ in range(3):
            shape = shape | ellipse(cx + rng.uniform(-length / 2, length / 2), cy + rng.uniform(-1.5, 1.5), rng.uniform(10, length / 2.4), rng.uniform(1.0, 2.4))
        pts = _pixels(img, shape)
        for (x, y) in pts:
            put(img, x, y, lit if (x, y - 1) not in pts else body)
    return img


def near_ruins(g: Grade, rng: random.Random) -> Image.Image:
    """The shore ruins, dark and close: the great arch, a quay whose stairs go down into the sea, a fallen
    column, lone piers — each with its shadowed side, its weed and its barnacles — and the shallows breaking."""
    img = blank(W, H)
    shadow, body, lit = g.near
    f = periodic(W, rng, [(2, 0.8), (5, 0.7), (9, 0.4)])
    waterline = lambda x: 107 + f(x)  # noqa: E731
    breakers: list[tuple[float, float, float]] = []

    def dress(x: float, top: float, base: float, w: float) -> None:
        """Courses of stone, weed hanging from the ledges, barnacles along the tide line."""
        for cy in range(int(top) + 6, int(base) - 6, 6):
            for dx in range(int(-w / 2) + 2, int(w / 2) - 1):
                if rng.random() < 0.6:
                    put(img, int(x + dx), cy, shadow)
        for _ in range(max(2, int(w / 3))):
            wx = int(x + rng.uniform(-w / 2 + 1, w / 2 - 1))
            y0 = int(rng.uniform(top + 3, base - 18))
            for j in range(rng.randint(4, 11)):
                put(img, wx + (1 if (j // 3) % 2 else 0), y0 + j, g.weed[1] if j < 2 else g.weed[0])
        for dx in range(int(-w / 2), int(w / 2) + 1):
            if rng.random() < 0.55:
                put(img, int(x + dx), int(base - 7 - rng.randint(0, 2)), g.foam)

    def pier(x: float, top: float, w: float, broken: bool, depth: float = 4.0) -> None:
        base = waterline(x) + 6
        _flat(img, polygon([(x + w / 2, top + 2), (x + w / 2 + depth, top + 4), (x + w / 2 + depth, base), (x + w / 2, base)]), shadow)
        front = rect(x - w / 2, top, x + w / 2, base) | rect(x - w / 2 - 1.5, base - 6, x + w / 2 + 1.5, base)
        if broken:
            front = front | polygon([(x - w / 2, top), (x - w / 2, top - rng.uniform(2, 5)), (x - w * 0.1, top - rng.uniform(0, 2)), (x + w * 0.25, top - rng.uniform(3, 7)),
                                     (x + w / 2, top - rng.uniform(0, 3)), (x + w / 2, top)])
        else:
            front = front | rect(x - w / 2 - 2, top - 3, x + w / 2 + 2 + depth * 0.5, top)
        _solid(img, front, g.near)
        dress(x, top, base, w)
        breakers.append((x - w / 2 - 2, waterline(x) + 1, 3.5 + w * 0.2))

    # The great arch: two piers and the ring between them, thick enough to show its underside, a bite out of it.
    ax, span, top = 150.0, 36.0, 58.0
    ring = arc_band(ax, top, span / 2 + 6, span / 2 - 6, 180, 360) - circle(ax + 8, top - span / 2 - 2, 5.5)
    if g.torment:  # the keystones have come away and hang where they were
        ring = ring - rect(ax - 10, top - span / 2 - 9, ax + 1, top - span / 2 + 8)
        _solid(img, polygon([(ax - 9, top - span / 2 - 15), (ax - 1, top - span / 2 - 16), (ax - 2, top - span / 2 - 6), (ax - 8, top - span / 2 - 5)]), g.near)
    _flat(img, _shift(_shift_y(ring, 1.0), 3.5), shadow)
    pier(ax - span / 2, top, 12, False)
    pier(ax + span / 2, top, 12, False)
    _solid(img, ring, g.near)
    for a in range(196, 345, 21):  # the joints of its voussoirs
        for rr in (span / 2 - 3, span / 2 - 1, span / 2 + 1, span / 2 + 3):
            px_, py_ = ax + math.cos(math.radians(a)) * rr, top + math.sin(math.radians(a)) * rr
            if not (abs(px_ - ax - 8) < 6 and py_ < top - span / 2 + 4):
                put(img, int(px_), int(py_), shadow)

    # The quay: a block of masonry with stairs going down into the sea on its seaward side.
    qx0, qx1, qtop = 352.0, 396.0, 95.0
    qbase = waterline(qx0) + 6
    _flat(img, polygon([(qx1, qtop + 2), (qx1 + 5, qtop + 4), (qx1 + 5, qbase), (qx1, qbase)]), shadow)
    quay = rect(qx0, qtop, qx1, qbase)
    for i in range(1, 6):
        quay = quay | rect(qx0 - i * 7, qtop + i * 3.2, qx0 - (i - 1) * 7 + 0.5, qbase)
    _solid(img, quay, g.near)
    for i in range(1, 6):  # the riser under each tread is in shadow
        for y in range(int(qtop + (i - 1) * 3.2) + 1, int(qtop + i * 3.2)):
            put(img, int(qx0 - (i - 1) * 7), y, shadow)
    dress((qx0 + qx1) / 2, qtop + 2, qbase, qx1 - qx0)
    for cx, hgt, whole in ((364.0, 19.0, False), (386.0, 30.0, not g.torment)):
        _column(img, cx, qtop, hgt, 5.0, g.near, rng, whole, 5.0 if g.torment and hgt > 20 else 0.0)
    breakers.append((qx0 - 30, waterline(qx0 - 30) + 1, 6.0))

    # Lone piers and stumps along the shore, and a column lying in the shallows where it fell.
    for x, hgt, w, broken in ((38.0, 26.0, 10.0, True), (498.0, 50.0, 13.0, False), (566.0, 31.0, 10.0, True)):
        pier(x, waterline(x) + 6 - hgt, w, broken)
        if g.torment and hgt > 40:
            _solid(img, polygon([(x - 6, waterline(x) - hgt - 9), (x + 7, waterline(x) - hgt - 11), (x + 6, waterline(x) - hgt - 3), (x - 5, waterline(x) - hgt - 2)]), g.near)
    for i, (dx, dy) in enumerate(((0.0, 0.0), (13.0, 1.0), (27.5, 2.0))):
        x0, y0 = 238.0 + dx, waterline(250) - 5 + dy
        drum = rect(x0, y0, x0 + 11.5, y0 + 8) | ellipse(x0 + 11.5, y0 + 4, 1.8, 4)
        _solid(img, drum, g.near)
        for k in range(1, 11, 2):
            put(img, int(x0 + k), int(y0 + 3), shadow)
            put(img, int(x0 + k), int(y0 + 5), shadow)
        if i == 2:
            _flat(img, ellipse(x0 + 12, y0 + 4, 1.2, 2.6), shadow)
    breakers.append((236.0, waterline(238) + 1, 4.5))

    # The shallows: nearer, darker water, with three lines of breakers rolling in and the wash at the sand.
    trough, water, crest = g.shallows
    tops = fill_below(img, waterline, water, crest, y_end=123)
    for row, (dy, amp) in enumerate(((3.0, 1.0), (7.0, 1.3), (11.0, 1.6))):
        phase = rng.uniform(0, 6)
        for x in range(W):
            y = int(tops[x] + dy + amp * math.sin(x / (11.0 + row * 3) + phase))
            gap = math.sin(x / (23.0 + row * 7) + phase * 2.0) > 0.55
            if not gap:
                put(img, x, y, g.wash if rng.random() < 0.8 else crest)
                put(img, x, y - 1, crest if rng.random() < 0.6 else water)
                put(img, x, y + 1, trough)
                if row and rng.random() < 0.3:
                    put(img, x, y + 2, trough)
            elif rng.random() < 0.25:
                put(img, x, y, crest)
    for x, y, size in breakers:
        _breaker(img, x, y, size, g, rng)
    return img


def ground(g: Grade, rng: random.Random) -> Image.Image:
    """The shore: a lip of wet sand with the wash on it, the ruined causeway (the path), and the beach below —
    wet sand mirroring the sky, tide pools, shells, weed, the ribs of a wreck, things the sea gave back."""
    img = blank(W, H)
    px = img.load()
    deep, sand, light, lit = g.sand
    dark_p, path, light_p = g.path
    f = periodic(W, rng, [(3, 1.2), (5, 0.9), (9, 0.5)])
    top = [int(round(112 + f(x))) for x in range(W)]
    path_top, path_bot = PATH_Y - 6, PATH_Y + 5
    for x in range(W):
        for y in range(top[x], H):
            if path_top <= y <= path_bot:
                continue
            if y < path_top:
                t = (y - top[x]) / max(1, path_top - top[x])
                c = dither_pick([light, sand, sand], t, x, y)  # no bright sand behind the fighters' shins
            else:
                t = ((y - path_bot) / (H - path_bot)) ** 0.9
                c = dither_pick([light, sand, sand, deep, deep], t, x, y)
            px[x, y] = (*c, 255)
        for y in range(path_top, path_bot + 1):
            t = (y - path_top) / (path_bot - path_top)
            px[x, y] = (*dither_pick([light_p, path, path, dark_p], t, x, y), 255)
    # The wash: scalloped foam where the last wave reached, and the wet sheen it left behind.
    for x in range(W):
        y = top[x] + (1 if math.sin(x / 9.0) > 0.3 else 0)
        put(img, x, y, g.wash)
        if rng.random() < 0.45:
            put(img, x, y + 1, g.wash if rng.random() < 0.4 else g.wet[1])
        if rng.random() < 0.3:
            put(img, x, path_top - 1, g.wet[0])

    # The causeway: big worn slabs with dark joints, a groove carved along its far edge and, here and there, a
    # spiral the sea has almost rubbed out; some slabs cracked, some gone and filled with sand.
    x = 0
    while x < W:
        wide = rng.randint(15, 27)
        for y in range(path_top + 1, path_bot):
            put(img, x, y, dark_p)
        roll = rng.random()
        if roll < 0.2:  # a missing slab: sand shows through
            for xx in range(x + 1, min(W, x + wide)):
                for y in range(path_top + 2, path_bot - 1):
                    if rng.random() < 0.82:
                        put(img, xx, y, deep if y > path_top + 5 else sand)
        elif roll < 0.5:  # a crack
            cx = x + rng.randint(4, wide - 4)
            for y in range(path_top + 1, path_bot):
                put(img, cx + (1 if (y % 3 == 0) else 0), y, dark_p)
        elif roll < 0.72 and wide > 18:  # a worn spiral
            cx, cy = x + wide // 2, PATH_Y - 1
            for dx, dy in ((-2, -1), (-1, -2), (0, -2), (1, -2), (2, -1), (2, 0), (1, 1), (0, 1), (-1, 0), (0, -0)):
                put(img, cx + dx, cy + dy, light_p if (dx + dy) % 2 == 0 else path)
        x += wide
    for x in range(W):
        put(img, x, path_top, light_p if rng.random() < 0.85 else path)
        if rng.random() < 0.7:
            put(img, x, path_top + 2, dark_p)  # the groove
        if rng.random() < 0.55:
            put(img, x, PATH_Y, dark_p)
        if rng.random() < 0.5:
            put(img, x, path_bot, deep)
    for _ in range(70):  # wet glints and grit on the stone
        x, y = rng.randrange(W), rng.randrange(path_top + 3, path_bot - 1)
        put(img, x, y, light_p)
        put(img, x + 1, y, path)

    # Below the causeway. First the wet sand under its edge, holding the sky in long broken streaks.
    for _ in range(90):
        x = rng.randrange(W)
        y = path_bot + 2 + int(9 * rng.random() ** 1.7)
        for k in range(rng.randint(5, 16)):
            put(img, x + k, y, g.wet[1] if y < path_bot + 5 and rng.random() < 0.5 else g.wet[0])
    # Ripples the tide left, darker and sparser lower down.
    for _ in range(150):
        x = rng.randrange(W)
        y = int(path_bot + 10 + (H - path_bot - 11) * rng.random() ** 1.3)
        near = 1 - (y - path_bot) / (H - path_bot)
        for k in range(rng.randint(4, 10)):
            put(img, x + k, y + (k % 5 == 4), light if near > 0.5 and rng.random() < 0.7 else deep)
    # The ribs of a wreck, half buried.
    for wx in (118.0, 452.0):
        _wreck(img, wx, g, rng)
    # Tide pools: a dark rim of wet sand, the water, a strip of sky in it.
    for i in range(10):
        x = int(i * W / 10 + rng.uniform(-22, 22))
        if any(abs(x - wx) < 40 for wx in (118, 452)):
            continue
        y = rng.randrange(path_bot + 10, H - 9)
        rw, rh = rng.uniform(7, 15), rng.uniform(2.0, 3.6)
        for (a, b) in _pixels(img, ellipse(x, y, rw + 1.5, rh + 1)):
            put(img, a, b, deep)
        pts = _pixels(img, ellipse(x, y, rw, rh))
        for (a, b) in pts:
            put(img, a, b, g.pool[1] if (a, b - 1) not in pts or (b == y - 1 and abs(a - x) < rw * 0.5) else g.pool[0])
        if rng.random() < 0.6:  # a starfish beside it
            sx, sy = x + int(rw) + 3, y + rng.randint(-1, 2)
            for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (-1, 1), (1, 1), (0, -2), (-2, 0), (2, 0)):
                put(img, sx + dx, sy + dy, g.shells[1 % len(g.shells)])
    # Rocks with barnacles sitting in the sand.
    for _ in range(9):
        x, y = rng.randrange(W), rng.randrange(path_bot + 12, H - 5)
        pts = _solid(img, ellipse(x, y, rng.uniform(4, 8), rng.uniform(2.5, 4.5)) & rect(-W, 0, 2 * W, y + 1.5), g.near, band=2)
        for (a, b) in pts:  # barnacles low on its seaward side
            if b >= y and a < x and rng.random() < 0.45:
                put(img, a, b, light)
        for dx in range(-9, 10):
            if rng.random() < 0.5:
                put(img, x + dx, y + 2, deep)
    # What the sea gave back: an amphora on its side, a bronze helm, both half in the sand.
    for x, kind in ((286, "amphora"), (548, "helm"), (30, "amphora")):
        y = rng.randrange(path_bot + 12, H - 12)
        dim, bright = g.relic
        if kind == "amphora":
            for (a, b) in _pixels(img, ellipse(x, y, 6, 3.2) | rect(x + 5, y - 1.2, x + 10, y + 1.2)):
                put(img, a, b, bright if b < y - 1 else dim)
            put(img, x + 10, y - 2, dim)
            put(img, x + 10, y + 2, dim)
        else:
            for (a, b) in _pixels(img, (circle(x, y, 4.5) & rect(x - 6, y - 6, x + 6, y + 1)) | rect(x - 5.5, y, x + 5.5, y + 2)):
                put(img, a, b, bright if b < y - 2 else dim)
            put(img, x + 2, y - 1, deep)
            put(img, x + 3, y - 1, deep)
        for dx in range(-8, 12):
            if rng.random() < 0.6:
                put(img, x + dx, y + 3, deep)
    # Shells, and weed thrown up on both sides of the stone.
    for _ in range(54):
        x = rng.randrange(W)
        y = rng.choice([rng.randint(min(top[x] + 1, path_top - 1), path_top - 1), rng.randrange(path_bot + 3, H - 3), rng.randrange(path_bot + 3, H - 3)])
        shell = rng.choice(g.shells)
        put(img, x, y, shell)
        if rng.random() < 0.55:
            put(img, x + 1, y, shell)
            put(img, x, y - 1, shell)
            if rng.random() < 0.5:
                put(img, x + 1, y - 1, lit)
    for _ in range(26):
        x = rng.randrange(W)
        y = rng.choice([path_top - 1, path_bot + rng.randint(2, 4), rng.randrange(path_bot + 6, H - 4), rng.randrange(path_bot + 6, H - 4)])
        for k in range(rng.randint(5, 12)):
            put(img, x + k, y + (k % 3 == 1), g.weed[1] if k % 4 == 0 else g.weed[0])
            if k % 3 == 0:
                put(img, x + k, y - 1, g.weed[0])
            if k % 5 == 2:
                put(img, x + k, y - 2, g.weed[1])
    if g.torment:
        for _ in range(7):
            _crystal(img, rng.uniform(0, W), rng.choice([path_top - 1, rng.randrange(path_bot + 8, H - 4)]), rng)
    return img


def _wreck(img: Image.Image, x: float, g: Grade, rng: random.Random) -> None:
    """The ribs of a hull standing out of the sand, tallest amidships, with the keel showing between them."""
    dark, body, lit = g.wood
    floor = H - 4
    for i in range(-3, 4):
        height = 20.0 - abs(i) * 3.4 + rng.uniform(-1.5, 1.5)
        bx = x + i * 9.5
        for j in range(int(height) + 1):
            t = j / height
            cx = bx + (1 if i >= 0 else -1) * 4.5 * t * t - (2.0 if i == 0 else 0.0) * t
            y = int(floor - j)
            put(img, int(cx), y, lit)
            put(img, int(cx) + 1, y, body)
            put(img, int(cx) + 2, y, dark)
        for dx in range(-3, 6):  # sand banked against its foot
            if rng.random() < 0.7:
                put(img, int(bx + dx), floor + 1, g.sand[0])
    for xx in range(int(x - 34), int(x + 36)):
        if rng.random() < 0.8:
            put(img, xx, floor - 2, body)
            put(img, xx, floor - 1, dark)
        if rng.random() < 0.2:
            put(img, xx, floor - 3, lit)


def foreground(g: Grade, rng: random.Random) -> Image.Image:
    """Barnacled rocks sliding past in front of everything, foam breaking round them, and one fallen capital."""
    img = blank(W, H)
    shadow, body, rim = g.fore
    for i in range(7):
        x = (i + 0.5) * W / 7 + rng.uniform(-30, 30)
        base = H + 3
        shape = ellipse(x, base, rng.uniform(12, 22), rng.uniform(8, 14))
        for _ in range(3):
            shape = shape | ellipse(x + rng.uniform(-16, 16), base, rng.uniform(6, 12), rng.uniform(6, 16))
        shape = shape | polygon([(x - 6, base - 6), (x + rng.uniform(-3, 3), base - rng.uniform(13, 20)), (x + 6, base - 6)])
        if i == 3:  # a capital the sea has rolled up the beach
            shape = shape | rect(x + 12, base - 15, x + 30, base - 11) | rect(x + 15, base - 11, x + 27, base) | rect(x + 13.5, base - 12.5, x + 28.5, base - 10)
        pts = _solid(img, shape, (shadow, body, rim), band=3)
        for (a, b) in sorted(pts):  # barnacles
            if rng.random() < 0.035 and b > H - 16:
                put(img, a, b, rim)
        for dx in range(-27, 28):  # foam at the foot
            if rng.random() < 0.6:
                put(img, int(x + dx), H - 1 - (rng.random() < 0.3), g.foam)
            if rng.random() < 0.12:
                put(img, int(x + dx), H - 3 - int(rng.random() * 3), g.foam)
    return img


LAYERS = (
    ("sky", sky, 0.0),
    ("far", far_ruins, 0.06),
    ("mid", mid_city, 0.18),
    ("mist", mist, 0.26),
    ("near", near_ruins, 0.5),
    ("ground", ground, 1.0),
    ("fore", foreground, 1.35),
)


def build(grade: str, seed: int = 606) -> dict[str, Image.Image]:
    g = GRADES[grade]
    out: dict[str, Image.Image] = {}
    for i, (name, fn, _speed) in enumerate(LAYERS):
        out[name] = fn(g, random.Random(seed * 100 + i))
    return out
