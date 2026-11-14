"""World 7 backdrop — the caverns of crystal and fungus, lit only by what grows there — in every difficulty grade.

There is no sky: the cavern is a set of chambers one behind another, and the light is the colour. Layers (back to
front): sky (the deepest chambers, seen as pools of glow with tiny spires standing in them), far (the far wall:
a roof and great columns with arches between them, through which that glow shows, a waterfall inside one of
them, and at its foot the lake with the lights lying on it), mid (pillars, a stalactite roof, rock islands with
the lake between them, and the landmarks: giant luminous mushrooms and crystal formations as tall as a house,
each lighting the rock around it), mist (spores, drifting),
near (the dark frame: big stalactites and stalagmites, glow-worm threads, a few near lights), ground (the bank,
the worn stone path with glowing lichen at its edges, and rock shelves below it with small crystals and
puddles) and foreground (stalagmites and shards below, stalactites above).

Rock is never a flat silhouette: every mass is shaded dark inside → lit rim on the side the light comes from, and
every light source lifts the rock near it a tone or two.

Behind the fighters (y ≈ 60 … 117) hangs a haze (`_calm`): every layer back there is pressed towards one low-mid
value — no black, no bright landmark — so figures read; above it the lights keep their full range.

The Torment grade is THE BLIGHT: the Rift has infected the cave. The rock is a dark plum, the lake wine, the
deep chambers glow like sores; the crystals have gone a raw rose and cracked or bleached dead, the mushrooms are
bloated and weeping or grey and lifeless, the glow-worm threads are veins. Only the Rift itself — the fracture
through the split roof and its shards on the ground — keeps its blue-violet. `ATMOSPHERE` adds what moves:
spores and drips in Normal; in Torment the lights failing, a slow rose pulse, thick spores sinking, and eyes.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass

from PIL import Image

from ..backdrop import BAYER4, blank, dither_pick, periodic, put, vertical_gradient
from ..palette import RAMPS, Color, color, hex_of
from ..raster import capsule, ellipse, polygon, rasterize
from .backdrop_w01 import H, PATH_Y, W, _crystal, _rift, _shift

__all__ = ["W", "H", "PATH_Y", "LAYERS", "GRADES", "PREVIEW_BG", "ATMOSPHERE", "build"]

#: The tone creature previews of this world are shown on.
PREVIEW_BG: Color = color("azure", 1)

#: A crystal's tones: shadow edge, shadow face, lit face, ridge and top facet.
Gem = tuple[Color, Color, Color, Color]
#: A mushroom's tones: stem in shadow, stem lit, cap in shadow, cap, cap lit, glowing gills.
Shroom = tuple[Color, Color, Color, Color, Color, Color]
Pts = set[tuple[int, int]]


@dataclass(frozen=True)
class Grade:
    key: str
    sky: list[Color]  # the void, top to bottom
    glow: tuple[Color, ...]  # a deep chamber's glow, outer ring → heart
    rock: tuple[Color, ...]  # the cave's rock, darkest → brightest lit (a light lifts rock up this ramp)
    water: tuple[Color, Color, Color, Color]  # deep, body, light band, glint
    gems: tuple[Gem, ...]
    shrooms: tuple[Shroom, ...]
    thread: tuple[Color, Color, Color]  # glow-worm thread, bead, end bead
    fall: tuple[Color, Color, Color]  # waterfall: shadow, body, bright
    motes: tuple[Color, ...]
    path: tuple[Color, Color, Color]  # dark, body, light
    lichen: tuple[Color, ...]
    fore: tuple[Color, Color]
    lit: int  # tones a light lifts the rock next to it
    torment: bool = False
    #: The haze behind the fighters: the rock tones allowed there (indices of `rock`) and the brightest and
    #: darkest anything else may be (luma, 0–255).
    haze: tuple[int, int] = (2, 4)
    haze_hi: float = 78.0
    haze_lo: float = 30.0
    haze_top: int = 60  # the haze begins here…
    haze_full: int = 86  # …and is whole from here down to the path
    #: In the haze the glow of the deep chambers and the landmarks of the middle and near planes turn into these
    #: tones (the Blight's sores and caps are red, and so are the creatures that stand in front of them: below
    #: the heads of the fighters the red goes out; the lake, on the far plane, keeps its wine).
    haze_swap: tuple[tuple[Color, Color], ...] = ()
    bloat: float = 1.0  # mushrooms swollen past their size (the Blight)
    crack: Color | None = None  # crystals split by dark cracks


def _c(r: str, i: int) -> Color:
    return color(r, i)


def _gem(r: str, lo: int) -> Gem:
    return (_c(r, lo), _c(r, lo + 2), _c(r, lo + 4), _c(r, lo + 5))


def _shroom(r: str) -> Shroom:
    return (_c(r, 2), _c(r, 4), _c(r, 3), _c(r, 5), _c(r, 7), _c(r, 8))


NORMAL = Grade(
    key="normal",
    sky=[_c("ink", 0), _c("azure", 0), _c("azure", 0), _c("azure", 1)],
    glow=(_c("azure", 1), _c("azure", 2), _c("sea", 3), _c("sea", 4), _c("sea", 5)),
    rock=(_c("ink", 0), _c("ink", 1), _c("azure", 1), _c("azure", 2), _c("azure", 3), _c("sea", 4), _c("sea", 5), _c("sea", 6)),
    water=(_c("azure", 0), _c("azure", 1), _c("azure", 2), _c("sea", 5)),
    gems=(_gem("sea", 3), _gem("azure", 3), _gem("sea", 3), (_c("dusk", 1), _c("dusk", 3), _c("dusk", 4), _c("dusk", 6))),
    shrooms=(_shroom("sea"), _shroom("moss"), _shroom("sea")),
    thread=(_c("sea", 3), _c("sea", 6), _c("light", 0)),
    fall=(_c("sea", 5), _c("sea", 7), _c("light", 0)),
    motes=(_c("sea", 7), _c("moss", 7), _c("sea", 5), _c("brass", 6)),
    path=(_c("ink", 2), _c("ink", 3), _c("ink", 4)),
    lichen=(_c("sea", 5), _c("sea", 6), _c("moss", 6)),
    fore=(_c("ink", 0), _c("azure", 2)),
    lit=2,
)

#: The Blight's mushrooms: raw and weeping, grey and dead, bloated pink.
_RAW: Shroom = (_c("crimson", 1), _c("crimson", 2), _c("crimson", 2), _c("crimson", 3), _c("dusk", 5), _c("dusk", 7))
_DEAD: Shroom = (_c("bone", 0), _c("bone", 1), _c("bone", 0), _c("bone", 1), _c("bone", 2), _c("ink", 1))
_PINK: Shroom = (_c("dusk", 1), _c("dusk", 3), _c("dusk", 3), _c("dusk", 4), _c("dusk", 6), _c("dusk", 8))

TORMENT = Grade(
    key="torment",
    sky=[_c("ink", 0), _c("ink", 0), _c("dusk", 0), _c("dusk", 1)],
    glow=(_c("dusk", 1), _c("dusk", 2), _c("crimson", 2), _c("crimson", 3), _c("crimson", 4)),  # the deep chambers: sores
    rock=(_c("ink", 0), _c("dusk", 0), _c("dusk", 1), _c("dusk", 2), _c("dusk", 3), _c("dusk", 4), _c("dusk", 5), _c("dusk", 6)),
    water=(_c("crimson", 0), _c("crimson", 1), _c("crimson", 1), _c("crimson", 4)),  # wine, with no bright shore line behind the fighters
    gems=(
        _gem("dusk", 2),  # raw rose
        (_c("crimson", 1), _c("crimson", 3), _c("dusk", 5), _c("dusk", 6)),  # sore red
        (_c("ink", 2), _c("bone", 1), _c("bone", 2), _c("bone", 3)),  # dead, dull
        (_c("bone", 2), _c("bone", 3), _c("bone", 5), _c("bone", 6)),  # bleached
    ),
    shrooms=(_PINK, _RAW, _DEAD),
    thread=(_c("crimson", 1), _c("crimson", 2), _c("crimson", 4)),  # veins, not lights
    fall=(_c("crimson", 2), _c("crimson", 3), _c("crimson", 5)),
    motes=(_c("dusk", 7), _c("dusk", 5), _c("bone", 5)),
    path=(_c("ink", 2), _c("ink", 3), _c("ink", 4)),
    lichen=(_c("dusk", 5), _c("dusk", 6)),
    fore=(_c("ink", 0), _c("dusk", 3)),
    lit=1,
    torment=True,
    haze_hi=72.0,  # a dusky rose at most: the creatures of this cave are warm and must stand off it
    haze_lo=20.0,
    haze_top=48,
    haze_full=74,
    haze_swap=((_c("crimson", 1), _c("dusk", 1)), (_c("crimson", 2), _c("dusk", 2)), (_c("crimson", 3), _c("dusk", 3)), (_c("crimson", 4), _c("dusk", 3))),
    bloat=1.28,
    crack=_c("ink", 0),
)

GRADES = {"normal": NORMAL, "torment": TORMENT}


# ------------------------------------------------------------------------------------- helpers
def _wrapped(shape) -> Pts:
    """A shape's pixels with x wrapped into the tile."""
    return {((x - W) % W, y) for (x, y) in rasterize(_shift(shape, W), W * 3, H)}


def _near(a: float, x: float) -> float:
    """Signed distance from x to a on the wrapped tile."""
    return (a - x + W / 2) % W - W / 2


def _shade(img: Image.Image, pts: Pts, ramp: tuple[Color, ...], base: int, rng: random.Random, floor: int = H) -> None:
    """Rock, not a silhouette: dark inside, a band of half-light and a lit rim towards the light (right and above),
    a dimmer edge away from it, and a few long grooves. Rows from `floor` down count as solid."""
    def has(x: int, y: int) -> bool:
        return y < 0 or y >= floor or (x % W, y) in pts

    # Grooves: a few cracks of uneven length running down the rock, not a regular pattern.
    grooves: set[tuple[int, int]] = set()
    for _ in range(max(6, len(pts) // 900)):
        gx, gy = rng.randrange(W), rng.randrange(0, floor)
        for k in range(rng.randint(5, 22)):
            if k % 9 == 8:
                gx += rng.choice((-1, 1))
            grooves.add((gx % W, gy + k))
    for (x, y) in pts:
        if not has(x + 1, y) or not has(x, y - 1):
            i = base + 2
        elif not has(x - 1, y) or not has(x, y + 1):
            i = base + 1
        elif not (has(x + 2, y) and has(x + 3, y) and has(x, y - 2) and has(x + 1, y - 1) and has(x + 2, y - 1)):
            i = base + 1
        elif base > 0 and ((x, y) in grooves or not (has(x - 2, y) and has(x - 3, y) and has(x - 4, y))):
            i = base - 1  # a crack, or the core shadow on the side away from the light
        else:
            i = base
        put(img, x, y, ramp[i])


_RAMP_OF: dict[Color, tuple[str, int]] = {color(r, i): (r, i) for r, tones in RAMPS.items() for i in range(len(tones))}
#: The haze ends where the path begins.
HAZE_END = PATH_Y - 6


def _luma(c: Color) -> float:
    return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]


def _calm(img: Image.Image, g: Grade, swap: bool = False) -> None:
    """The haze behind the fighters. In the band they stand in front of, rock is pressed into the few tones of
    `g.haze` (no black for a dark outline to sink into, no bright rim to fight a face) and everything else —
    crystals, caps, glow, water — is stepped down or up its own ramp until it sits between `g.haze_lo` and
    `g.haze_hi`. Flat tones; the haze thickens downwards over a couple of dozen rows with a thin dithered seam."""
    rock = {c: i for i, c in enumerate(g.rock)}
    top_i = len(g.rock) - 1
    swaps = dict(g.haze_swap) if swap else {}
    px = img.load()
    for y in range(g.haze_top, HAZE_END):
        for x in range(W):
            r, g_, b, a = px[x, y]
            if not a:
                continue
            k = 1.0 if y >= g.haze_full else (y - g.haze_top) / (g.haze_full - g.haze_top) + (BAYER4[y % 4][x % 4] / 16.0 - 0.5) * 0.1
            k = max(0.0, min(1.0, k))
            c = (r, g_, b)
            if k > 0.45 and c in swaps:
                c = swaps[c]
                px[x, y] = (*c, 255)
            i = rock.get(c)
            if i is not None:
                lo_i, hi_i = round(g.haze[0] * k), round(top_i - (top_i - g.haze[1]) * k)
                j = max(lo_i, min(hi_i, i))
                if j != i:
                    px[x, y] = (*g.rock[j], 255)
                continue
            lo, hi = g.haze_lo * k, g.haze_hi + (255.0 - g.haze_hi) * (1.0 - k)
            name, j = _RAMP_OF.get(c, ("", 0))
            if name == "light":
                name, j = "bone", len(RAMPS["bone"]) - 1
            if not name or name == "violet":  # the Rift and its shards burn through any haze
                continue
            n = len(RAMPS[name])
            while j > 0 and _luma(color(name, j)) > hi:
                j -= 1
            while j < n - 1 and _luma(color(name, j)) < lo:
                j += 1
            px[x, y] = (*color(name, j), 255)


def _light(img: Image.Image, cx: float, cy: float, rx: float, ry: float, ramp: tuple[Color, ...], steps: int) -> None:
    """A light source lifts the rock around it up its ramp: `steps` tones close by, one less further out. Flat
    bands, no dither; anything that is not rock is left alone."""
    if steps <= 0:
        return
    index = {c: i for i, c in enumerate(ramp)}
    px = img.load()
    top = len(ramp) - 2
    for y in range(max(0, int(cy - ry)), min(H, int(cy + ry) + 1)):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            d = math.hypot((x - cx) / rx, (y - cy) / ry)
            if d >= 1.0:
                continue
            r, g_, b, a = px[x % W, y]
            i = index.get((r, g_, b)) if a else None
            if i is None:
                continue
            add = steps if d < 0.55 else steps - 1
            if add > 0:
                px[x % W, y] = (*ramp[min(top, i + add)], 255)


def _prism(img: Image.Image, bx: float, base: float, hgt: float, wid: float, lean: float, gem: Gem) -> Pt:
    """One crystal: a column with a pointed top. The face towards the light is bright, the other in shadow, with
    a hard ridge between them; the top facet catches the most light. Returns its tip."""
    dark, body, lit, edge = gem
    tip = (bx + lean * hgt, base - hgt)
    cap = wid * 1.2
    pts = _wrapped(polygon([(bx - wid, base), (bx + wid, base), (tip[0] + wid, tip[1] + cap), tip, (tip[0] - wid, tip[1] + cap)]))
    for (a, b) in pts:
        t = (base - b) / max(1.0, hgt)
        da = _near(a, bx + lean * hgt * t)
        if b < tip[1] + cap:
            tone = edge if da >= -0.6 else lit
        elif abs(da) < 0.6:
            tone = edge
        elif da > 0:
            tone = lit
        else:
            tone = dark if ((a - 1) % W, b) not in pts else body
        put(img, a, b, tone)
    return tip


Pt = tuple[float, float]


def _cluster(img: Image.Image, x: float, base: float, size: float, gem: Gem, rng: random.Random, n: int = 5, sparkle: Color | None = None,
             crack: Color | None = None) -> None:
    """A crystal formation: prisms fanning out of one root, the outer ones short and leaning, the tall ones in
    the middle and in front. `crack` splits the tall ones with a dark, forking crack (the Blight)."""
    prisms = sorted(((rng.uniform(-0.55, 0.55), rng.uniform(0.4, 0.85)) for _ in range(n)), key=lambda s: -abs(s[0]))
    prisms.append((rng.uniform(-0.1, 0.1), 1.0))
    tips = []
    for lean, tall in prisms:
        hgt = size * tall
        wid = max(1.0, size * (0.065 + 0.045 * tall))
        tips.append(_prism(img, x + lean * size * 0.5, base, hgt, wid, lean * 0.55, gem))
    if sparkle is not None and size > 16:
        for tx, ty in (tips[-1], tips[len(tips) // 2]):
            put(img, int(tx), int(ty) - 1, sparkle)
            for dx, dy in ((1, -1), (-1, -1), (0, -2), (0, 0)):
                put(img, int(tx) + dx, int(ty) + dy, gem[3])
    if crack is not None and size > 14:
        for (tx, ty), frac in ((tips[-1], 0.62), (tips[len(tips) // 2], 0.4)):
            cx, cy = int(tx), int(ty) + 3
            for k in range(int(size * frac)):
                if k % 3 == 2:
                    cx += rng.choice((-1, 1))
                put(img, cx, cy + k, crack)
                if k % 7 == 4:  # a short fork
                    side = rng.choice((-1, 1))
                    put(img, cx + side, cy + k + 1, crack)
                    put(img, cx + side * 2, cy + k + 2, crack)


def _mushroom(img: Image.Image, x: float, base: float, hgt: float, tones: Shroom, rng: random.Random, bloat: float = 1.0) -> tuple[float, float, float]:
    """A giant mushroom: a bent stem, a shaded dome of a cap with pale spots, and gills that glow underneath and
    light the top of the stem. `bloat` > 1 swells the cap, covers it in pustules and makes it weep from the rim.
    Returns (cap x, cap y, cap half-width)."""
    stem_d, stem, cap_d, cap, cap_l, gills = tones
    lean = rng.uniform(-0.18, 0.18) * hgt
    cx, cy = x + lean, base - hgt
    rw = hgt * rng.uniform(0.42, 0.58) * bloat
    rh = rw * rng.uniform(0.5, 0.64) * (1.0 + (bloat - 1.0) * 0.5)
    sw = max(0.8, hgt * 0.06)
    knee = (x + lean * 0.25, base - hgt * 0.5)
    for x0, y0, x1, y1, r0, r1 in ((x, base, knee[0], knee[1], sw * 1.35, sw), (knee[0], knee[1], cx, cy, sw, sw * 0.8)):
        pts = _wrapped(capsule(x0, y0, x1, y1, r0, r1))
        for (a, b) in pts:
            lit = ((a + 1) % W, b) not in pts or b < cy + rh * 0.9 or sw < 1.2
            put(img, a, b, stem if lit else stem_d)
    dome = {(a, b) for (a, b) in _wrapped(ellipse(cx, cy, rw, rh)) if b <= cy}
    for (a, b) in dome:
        da = _near(a, cx)
        if (a, b - 1) not in dome:
            tone = cap_l
        elif da < -rw * 0.45 or b >= int(cy):
            tone = cap_d
        else:
            tone = cap
        put(img, a, b, tone)
    for a in range(int(cx - rw) + 1, int(cx + rw)):
        put(img, a, int(cy) + 1, gills)
        if rw > 5 and abs(a - cx) < rw - 2.5:
            put(img, a, int(cy) + 2, gills if (a + int(x)) % 2 == 0 else cap_d)
    for _ in range(max(1, int(rw / (3.2 if bloat <= 1.0 else 1.9)))):
        sx, sy = int(cx + rng.uniform(-rw * 0.6, rw * 0.6)), int(cy - rng.uniform(2, max(2.5, rh * 0.75)))
        if (sx % W, sy) in dome and (sx % W, sy - 1) in dome:
            put(img, sx, sy, gills)
            if rw > 9:
                put(img, sx + 1, sy, gills)
    if bloat > 1.0 and rw > 6:  # it weeps: threads of the stuff hanging from the rim
        for _ in range(max(2, int(rw / 5))):
            dx = int(cx + rng.uniform(-rw * 0.85, rw * 0.85))
            n = rng.randint(2, max(3, int(rw / 3)))
            for k in range(n):
                put(img, dx, int(cy) + 2 + k, gills if k < n - 1 else cap_l)
    return cx, cy, rw


def _spike(x: float, y: float, length: float, width: float, lean: float = 0.0):
    """A stalagmite (length > 0, rising from y) or a stalactite (length < 0, hanging from y)."""
    return polygon([(x - width, y), (x + width, y), (x + lean + width * 0.12, y - length), (x + lean - width * 0.12, y - length)])


def _roof(rng: random.Random, depth: float) -> tuple[Pts, list[int]]:
    """A ragged band of rock along the top. Returns its pixels and its lower edge per column."""
    f = periodic(W, rng, [(2, depth * 0.28), (5, depth * 0.2), (9, depth * 0.12)])
    edge = [max(1, int(round(depth + f(x)))) for x in range(W)]
    return {(x, y) for x in range(W) for y in range(edge[x])}, edge


def _mound(contour, y_end: int) -> Pts:
    return {(x, y) for x in range(W) for y in range(max(0, int(round(contour(x)))), y_end)}


# ------------------------------------------------------------------------------------- layers
def sky(g: Grade, rng: random.Random) -> Image.Image:
    """The deepest chambers: darkness, and in it pools of glow, each with its own small forest of spires and caps
    standing against the light."""
    img = blank(W, H)
    vertical_gradient(img, g.sky, 0, 124, curve=1.0)
    px = img.load()
    for y in range(124, H):
        for x in range(W):
            px[x, y] = (*g.sky[-1], 255)
    pools = [(88, 74, 82, 42), (246, 84, 98, 48), (408, 70, 74, 38), (548, 82, 86, 44)]
    for k, tone in enumerate(g.glow):
        s = 1.0 - k / (len(g.glow) + 0.6)
        for cx, cy, rx, ry in pools:
            for (a, b) in _wrapped(ellipse(cx, cy, rx * s, ry * s)):
                put(img, a, b, tone)
    # Each chamber has a floor, and things grow on it: seen from here they are only shapes against the light.
    dark = g.sky[-1]
    for cx, cy, rx, ry in pools:
        floor = cy + ry * 0.42
        for (a, b) in _wrapped(ellipse(cx, cy, rx, ry)):
            if b >= floor:
                put(img, a, b, dark)
        for _ in range(9):
            x = cx + rng.uniform(-rx * 0.8, rx * 0.8)
            hgt = rng.uniform(4, 13)
            if rng.random() < 0.5:
                shape = _spike(x, floor + 1, hgt, rng.uniform(1.0, 2.2), rng.uniform(-1, 1))
            else:
                shape = capsule(x, floor + 1, x, floor - hgt, 0.6) | ellipse(x, floor - hgt, hgt * 0.5, hgt * 0.28)
            for (a, b) in _wrapped(shape):
                put(img, a, b, dark)
    if g.torment:
        for _ in range(70):
            x, y = rng.randrange(W), rng.randrange(0, 96)
            px[x, y] = (*(_c("bone", 7) if rng.random() < 0.5 else _c("dusk", 7)), 255)
        _rift(img, rng)
    _calm(img, g, swap=True)
    return img


def far(g: Grade, rng: random.Random) -> Image.Image:
    """The far wall of the cavern — a roof and great columns with arches between them — and the lake at its foot."""
    img = blank(W, H)
    shore = 91
    arches = []
    for i in range(5):
        cx = i * W / 5 + 60 + rng.uniform(-18, 18)
        arches.append((cx, rng.uniform(27, 44) * (1.15 if g.torment else 1.0), rng.uniform(24, 42)))
    ragged = periodic(W, rng, [(11, 1.6), (23, 1.0), (37, 0.6)])
    lip = periodic(W, rng, [(3, 1.6), (8, 1.0)])

    def open_at(x: int, y: int) -> bool:
        if y >= shore - 2 - lip(x):
            return False
        for cx, half, top in arches:
            dx = _near(x, cx)
            if abs(dx) < half and y > top + half * 0.8 * (1 - math.sqrt(1 - (dx / half) ** 2)) + ragged(x):
                return True
        return False

    wall: Pts = {(x, y) for x in range(W) for y in range(shore + 2) if not open_at(x, y)}
    if g.torment:  # the roof has split where the Rift comes through
        crack = periodic(W, rng, [(13, 2.4), (29, 1.4)])
        wall = {(x, y) for (x, y) in wall if not (y < 84 and abs(_near(x, 262 + crack(y * 6))) < 4 + 15 * (1 - y / 84.0))}
    for cx, half, top in arches:  # stalactites in the mouths of the arches
        for _ in range(4):
            x = cx + rng.uniform(-half * 0.8, half * 0.8)
            wall |= {p for p in _wrapped(_spike(x, top - 2, -rng.uniform(8, 26), rng.uniform(1.6, 3.2), rng.uniform(-1, 1))) if p[1] < shore}
        for _ in range(3):
            x = cx + rng.uniform(-half * 0.8, half * 0.8)
            wall |= _wrapped(_spike(x, shore, rng.uniform(5, 13), rng.uniform(1.6, 3.0)))
    _shade(img, wall, g.rock, 3, rng, floor=shore + 2)
    # Strata: long faint seams across the rock.
    seam = periodic(W, rng, [(2, 2.0), (5, 1.2)])
    px = img.load()
    for level in (11, 23):
        x = rng.randrange(W)
        while x < W * 2:
            run = rng.randint(14, 46)
            for k in range(run):
                y = int(level + seam(x + k + level * 7))
                if 0 <= y < H and px[(x + k) % W, y][:3] == g.rock[3]:
                    px[(x + k) % W, y] = (*g.rock[2], 255)
            x += run + rng.randint(20, 70)
    # Ledges where the strata step, lit on top with a line of shadow under them, and small crystals bedded in the wall.
    for _ in range(16):
        x, y, n = rng.randrange(W), rng.randrange(6, 84), rng.randint(7, 22)
        for k in range(n):
            if px[(x + k) % W, y][:3] == g.rock[3] and px[(x + k) % W, y + 1][:3] == g.rock[3]:
                px[(x + k) % W, y] = (*g.rock[4], 255)
                px[(x + k) % W, y + 1] = (*g.rock[2], 255)
    for _ in range(12):
        x, y = rng.randrange(W), rng.randrange(8, 80)
        gem = rng.choice(g.gems)
        if px[x, y][:3] == g.rock[3]:
            for dx, dy, tone in ((0, 0, gem[2]), (1, 0, gem[1]), (0, -1, gem[3]), (-1, 1, gem[1])):
                put(img, x + dx, y + dy, tone)
    # The upper wall, above the arches (its own random stream, so nothing else in the layer moves): broad
    # shelves of rock with a lit top and an overhang of shadow, crystals bedded under and on them, and roots
    # hanging down from the roof.
    r2 = random.Random(70711)
    rockset = set(g.rock)

    def rock_at(x: int, y: int) -> bool:
        return 0 <= y < H and px[x % W, y][3] != 0 and px[x % W, y][:3] in rockset

    shelves = []
    for _ in range(40):
        if len(shelves) >= 8:
            break
        x0, y0, n = r2.randrange(W), r2.randrange(5, 25), r2.randint(24, 56)
        ys = [y0]
        for k in range(1, n):
            ys.append(ys[-1] + (r2.choice((-1, 1)) if k % 9 == 0 else 0))
        if not all(rock_at(x0 + k, ys[k] + d) for k in range(n) for d in (-1, 0, 3)):
            continue
        if any(abs(_near(x0, sx)) < 60 and abs(y0 - sy) < 6 for sx, sy, _n in shelves):
            continue
        shelves.append((x0, y0, n))
        for k in range(n):
            x, y = x0 + k, ys[k]
            taper = min(k, n - 1 - k)
            put(img, x, y - 1, g.rock[6] if k > n * 0.55 else g.rock[5])  # the lit lip
            put(img, x, y, g.rock[4])
            for d in range(1, 1 + min(4, 1 + taper // 3)):  # the overhang's shadow, deepest right under the lip
                put(img, x, y + d, g.rock[1] if d < 3 else g.rock[2])
        # Crystals bedded under the shelf, pointing down, with their light on the rock; a cluster on top of some.
        gem = r2.choice(g.gems)
        for _k in range(r2.randint(2, 4)):
            k = r2.randrange(4, n - 4)
            cx, cy, length = x0 + k, ys[k] + 2, r2.randint(4, 9)
            _light(img, cx, cy + length / 2, 9, 8, g.rock, g.lit - 1)
            for j in range(length):
                half = 1 if j < length - 2 else 0
                for dx in range(-half, half + 1):
                    put(img, cx + dx, cy + j, gem[3] if dx == 1 or (half == 0 and j == length - 1) else gem[2] if dx == 0 else gem[1])
        if r2.random() < 0.6:
            k = r2.randrange(6, n - 6)
            _light(img, x0 + k, ys[k] - 5, 11, 8, g.rock, g.lit - 1)
            _cluster(img, x0 + k, ys[k] - 1, r2.uniform(6, 9), r2.choice(g.gems), r2, n=3)
    for _ in range(13):  # roots: dark sinuous threads with knots and rootlets, a pale tip
        x0, length, ph = r2.randrange(W), r2.randint(12, 30), r2.uniform(0, 6)
        if not rock_at(x0, length + 2):
            continue
        for y in range(0, length):
            x = int(x0 + 1.6 * math.sin(y / 5.0 + ph))
            put(img, x, y, g.rock[0])
            if y % 7 == 5:
                side = 1 if (y // 7) % 2 else -1
                put(img, x + side, y, g.rock[0])
                put(img, x + side * 2, y + 1, g.rock[1])
                put(img, x + side * 3, y + 2, g.rock[1])
            if y < length - 2 and y % 4 == 0:
                put(img, x + 1, y, g.rock[4])  # the side of the root that catches the light
        put(img, int(x0 + 1.6 * math.sin(length / 5.0 + ph)), length, g.rock[5])
    # A waterfall pours over a notch in the roof of one arch and drops into the lake, against the glow behind it:
    # a sheet a dozen pixels wide, falling in strands that break and rejoin.
    wx_c, w_half, w_top = arches[2]
    wx = int(wx_c - w_half * 0.35)
    wy = next(y for y in range(H) if px[wx % W, y][3] == 0)
    for dx in range(-4, 5):  # the notch: wet rock and the crest of the water going over
        put(img, wx + dx, wy - 2, g.fall[0])
        put(img, wx + dx, wy - 1, g.fall[2] if abs(dx) < 3 else g.fall[1])
    for y in range(wy, shore + 3):
        t = (y - wy) / max(1, shore + 2 - wy)
        half = 3 + int(t * 2.7)
        for dx in range(-half, half + 1):
            col = ((wx + dx) * 7) % 5
            seg = (y + col * 5 + (dx * dx) % 3) % (10 + col)
            if abs(dx) == half:
                if (y + dx * 2) % 3 == 0:
                    continue  # a ragged edge: drops leaving the sheet
                tone = g.fall[0]
            elif seg < 5 + col % 2:
                tone = g.fall[2] if col in (0, 3) else g.fall[1]
            elif seg < 8:
                tone = g.fall[1]
            else:
                tone = g.fall[0]
            put(img, wx + dx, y, tone)
    falls_at = wx
    # Small lights on the far shore, inside the arches.
    lights: list[tuple[float, Color, Color]] = []
    for cx, half, _top in arches:
        for _ in range(2):
            x = cx + rng.uniform(-half * 0.7, half * 0.7)
            base = shore - 1 - lip(x)
            _light(img, x, base - 2, 12, 9, g.rock, g.lit - 1)
            if rng.random() < 0.5:
                gem = rng.choice(g.gems)
                _cluster(img, x, base, rng.uniform(7, 12), gem, rng, n=3)
                lights.append((x, gem[2], gem[1]))
            else:
                tones = rng.choice(g.shrooms)
                _mushroom(img, x, base, rng.uniform(9, 15), tones, rng, g.bloat)
                lights.append((x, tones[5], tones[3]))
    # The lake: lighter near the far shore where it holds the glow of the chambers, dark towards us.
    deep, water, band, glint = g.water
    for y in range(shore + 1, 124):
        d = y - shore
        for x in range(W):
            px[x, y] = (*(band if d <= 1 else dither_pick([water, deep], (d - 2) / 18.0, x, y)), 255)
    for cx, half, _top in arches:  # each arch's glow lies on the water as a broken, narrowing column
        for d in range(2, 20):
            if d % 3 == 0:
                continue
            reach = half * 0.75 * (1 - d / 24.0)
            for x in range(int(cx - reach), int(cx + reach)):
                if (x + d * 3) % 7 < 5:
                    put(img, x, shore + d, band if d > 11 else g.glow[min(2, len(g.glow) - 1)] if d > 5 else g.glow[min(3, len(g.glow) - 1)])
    for _ in range(34):
        x, y, n = rng.randrange(W), rng.randrange(shore + 3, 120), rng.randint(4, 15)
        for k in range(n):
            put(img, x + k, y, glint if k % 5 else band)
    # Where the fall meets the lake: white churn under it, foam rings spreading out, and a cloud of spray rising.
    for dx in range(-8, 9):
        for d in range(1, 4):
            if abs(dx) <= 8 - d * 2 + 1:
                put(img, falls_at + dx, shore + d, g.fall[2] if (dx + d) % 3 else g.fall[1])
    for ring, row in ((11, 3), (16, 5), (22, 8), (29, 11)):
        for x in range(falls_at - ring, falls_at + ring + 1):
            if (x + ring * 3) % 5 < 3 and abs(x - falls_at) > ring * 0.35:
                put(img, x, shore + row, g.fall[2] if ring < 17 else g.fall[1] if ring < 23 else band)
    for _ in range(70):
        dx = r2.gauss(0, 6.5)
        up = abs(r2.gauss(0, 4.5))
        if abs(dx) < 15 and up < 12 and r2.random() > (abs(dx) / 15 + up / 12) * 0.55:
            put(img, int(falls_at + dx), int(shore - up), g.fall[2] if up < 3 and abs(dx) < 6 else g.fall[1] if r2.random() < 0.6 else g.fall[0])
    for x, bright, dim in lights:  # every light mirrored as a wavering streak
        for k in range(2, 17):
            if k % 3 != 1:
                wob = int(math.sin(k * 1.3) * 1.3)
                put(img, int(x) + wob, shore + k, bright if k < 7 else dim)
                if k < 6:
                    put(img, int(x) + wob + 1, shore + k, dim)
    _calm(img, g)
    return img


def mid(g: Grade, rng: random.Random) -> Image.Image:
    """The middle of the cavern: pillars and a stalactite roof, a thin waterfall, and the landmarks — giant
    mushrooms and crystal formations — each lighting the rock it stands on."""
    img = blank(W, H)
    # The floor is a chain of rock islands; in the dips between them the lake shows.
    f = periodic(W, rng, [(8, 4.2), (3, 1.6), (13, 0.8)])
    spots = [i * W / 8 + 30 + rng.uniform(-6, 6) for i in range(8)]
    rise = max(range(600), key=lambda k: f(k / 600 * 75.0 + spots[0]))  # shift the swell so every spot sits on a crest
    contour = lambda x: 109.5 - f(x - spots[0] + rise / 600 * 75.0)  # noqa: E731
    pillars = {1, 4, 6}
    roof, edge = _roof(rng, 9.0)
    rock: Pts = roof | _mound(contour, 124)
    for i in pillars:
        # A column where a stalactite and a stalagmite met: waisted, bulging, never straight.
        x, wid = spots[i], rng.uniform(9.0, 14.0)
        bulge = periodic(W, rng, [(5, 1.3), (11, 0.8), (17, 0.4)])
        for y in range(0, 124):
            t = (y - 60) / 60.0
            half = wid * (0.42 + 0.62 * t * t + 0.25 * abs(t) ** 5)
            cx = x + bulge(y * 3.0) * 0.9
            for a in range(int(round(cx - half - bulge(y * 2.0 + 200))), int(round(cx + half + bulge(y * 2.4 + 400))) + 1):
                rock.add((a % W, y))
    for _ in range(20):
        x = rng.uniform(0, W)
        rock |= _wrapped(_spike(x, 4, -rng.uniform(9, 34), rng.uniform(1.8, 4.2), rng.uniform(-1.5, 1.5)))
    for _ in range(10):
        x = rng.uniform(0, W)
        rock |= _wrapped(_spike(x, contour(x) + 2, rng.uniform(8, 24), rng.uniform(2.4, 5.0), rng.uniform(-2, 2)))
    _shade(img, rock, g.rock, 2, rng, floor=124)
    # Veins of light in the rock: thin threads of the same glow, wandering down the pillars and the roof.
    px = img.load()
    for _ in range(16):
        x, y = rng.randrange(W), rng.randrange(2, 100)
        for k in range(rng.randint(8, 26)):
            if k % 4 == 3:
                x += rng.choice((-1, 0, 1))
            if y + k < H and px[x % W, y + k][:3] in (g.rock[1], g.rock[2]) and k % 6 != 5:
                px[x % W, y + k] = (*g.rock[5 if k % 5 else 6], 255)
    # Landmarks. The light falls on the rock first, then the thing itself is drawn.
    for i, x in enumerate(spots):
        if i in pillars:
            continue
        base = contour(x) + 2
        if i % 2 == 0:
            hgt = rng.uniform(34, 54)
            _light(img, x, base - hgt * 0.45, hgt * 0.95, hgt * 0.8, g.rock, g.lit)
            _mushroom(img, x, base, hgt, rng.choice(g.shrooms), rng, g.bloat)
            for side in (-1, 1):
                if rng.random() < 0.75:
                    _mushroom(img, x + side * rng.uniform(9, 17), base + 1, rng.uniform(11, 22), rng.choice(g.shrooms), rng, g.bloat)
        else:
            # One formation in three is the rare rose kind: lower and wider, a fan of many small prisms.
            rose = i == 3
            size = rng.uniform(26, 32) if rose else rng.uniform(34, 52)
            gem = g.gems[-1] if rose else g.gems[(i // 2) % 3]
            _light(img, x, base - size * 0.4, size * 1.0, size * 0.85, g.rock, g.lit)
            if rose:
                for off in (-0.45, 0.45):
                    _cluster(img, x + off * size, base, size * 0.75, gem, rng, n=4)
            _cluster(img, x, base, size, gem, rng, n=7 if rose else 6, sparkle=None if g.torment else _c("light", 0), crack=g.crack)
            for side in (-1, 1):
                _cluster(img, x + side * rng.uniform(size * 0.35, size * 0.5), base + 1, size * rng.uniform(0.25, 0.4), gem, rng, n=2)
    _calm(img, g, swap=True)
    return img


def mist(g: Grade, rng: random.Random) -> Image.Image:
    """A few spores and motes of light hanging in the air; this layer drifts by itself. Most of what floats is
    in ATMOSPHERE now, where it can sink and sway."""
    img = blank(W, H)
    for _ in range(26 if not g.torment else 12):
        x, y = rng.randrange(W), int(30 + 82 * rng.random() ** 0.8)
        tone = rng.choice(g.motes)
        put(img, x, y, tone)
        if rng.random() < 0.18:  # a bigger one: a tiny cross
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                put(img, x + dx, y + dy, g.motes[-1] if not g.torment else g.motes[1])
    return img


def near(g: Grade, rng: random.Random) -> Image.Image:
    """The dark frame nearest the path: heavy stalactites and stalagmites, glow-worm threads hanging from the
    roof, and a few lights close enough to pick the rock out."""
    img = blank(W, H)
    f = periodic(W, rng, [(2, 1.4), (5, 1.0)])
    contour = lambda x: 113 + f(x)  # noqa: E731
    roof, edge = _roof(rng, 6.0)
    rock: Pts = roof | _mound(contour, 124)
    for i in range(5):  # the big hanging masses
        x = i * W / 5 + rng.uniform(-26, 26) + 70
        rock |= _wrapped(_spike(x, 2, -rng.uniform(30, 56), rng.uniform(7.0, 12.0), rng.uniform(-3, 3)))
        rock |= _wrapped(_spike(x + rng.uniform(8, 16), 2, -rng.uniform(14, 28), rng.uniform(4.0, 6.0), rng.uniform(-2, 2)))
    for _ in range(12):
        x = rng.uniform(0, W)
        rock |= _wrapped(_spike(x, 2, -rng.uniform(6, 18), rng.uniform(2.0, 3.6), rng.uniform(-1, 1)))
    for _ in range(9):
        x = rng.uniform(0, W)
        rock |= _wrapped(_spike(x, contour(x) + 2, rng.uniform(10, 30), rng.uniform(3.4, 7.0), rng.uniform(-2.5, 2.5)))
    _shade(img, rock, g.rock, 1, rng, floor=124)
    # Near lights, a tone down from the middle ones so they do not fight the figures in front of them.
    for i in range(4):
        x = i * W / 4 + rng.uniform(-30, 30) + 40
        base = contour(x) + 2
        if i % 2 == 0:
            size = rng.uniform(18, 27)
            gem = g.gems[i % len(g.gems)]
            _light(img, x, base - size * 0.4, size * 1.1, size * 0.9, g.rock, g.lit)
            _cluster(img, x, base, size, (gem[0], gem[0], gem[1], gem[2]), rng, n=4, crack=g.crack)
        else:
            hgt = rng.uniform(18, 28)
            tones = rng.choice(g.shrooms)
            _light(img, x, base - hgt * 0.45, hgt * 1.0, hgt * 0.85, g.rock, g.lit)
            _mushroom(img, x, base, hgt, (tones[0], tones[1], tones[2], tones[2], tones[3], tones[4]), rng, g.bloat)
    # Glow-worm threads: beaded strings of light hanging from the roof.
    thread, bead, end = g.thread
    px = img.load()
    for _ in range(13):
        x = rng.randrange(W)
        y0, length = edge[x], rng.randint(8, 26)
        if px[x, min(H - 1, y0 + 2)][3]:
            continue  # a stalactite hangs here
        for k in range(length):
            if px[x, y0 + k][3]:
                break
            if k % 5 == 3:
                put(img, x, y0 + k, bead)
            elif k % 2 == 0:
                put(img, x, y0 + k, thread)
        else:
            put(img, x, y0 + length, end)
    _calm(img, g, swap=True)
    return img


def ground(g: Grade, rng: random.Random) -> Image.Image:
    """The floor: a low lit bank, the worn stone path with glowing lichen at its edges, and below it rock shelves
    stepping down into the dark, with small crystals, mushrooms, veins of light and puddles."""
    img = blank(W, H)
    px = img.load()
    rock = g.rock
    dark_p, path, light_p = g.path
    f = periodic(W, rng, [(3, 1.2), (5, 0.9), (9, 0.5)])
    top = [int(round(112 + f(x))) for x in range(W)]
    path_top, path_bot = PATH_Y - 6, PATH_Y + 5
    s1 = periodic(W, rng, [(2, 1.6), (5, 1.2), (11, 0.6)])
    s2 = periodic(W, rng, [(3, 1.8), (7, 1.0)])
    shelf1 = [int(round(139 + s1(x))) for x in range(W)]
    shelf2 = [int(round(150 + s2(x))) for x in range(W)]
    for x in range(W):
        for y in range(top[x], path_top):
            px[x, y] = (*(rock[4] if y == top[x] else rock[3] if y == top[x] + 1 else rock[2]), 255)
        for y in range(path_top, path_bot + 1):
            t = (y - path_top) / (path_bot - path_top)
            px[x, y] = (*dither_pick([light_p, path, path, dark_p], t, x, y), 255)
        # Three shelves, each darker than the one above, each with a lit lip where it catches the light.
        for y in range(path_bot + 1, H):
            if y < shelf1[x]:
                c = rock[3] if y == path_bot + 1 else rock[2]
            elif y < shelf2[x]:
                c = rock[3] if y == shelf1[x] else rock[2] if y == shelf1[x] + 1 else rock[1]
            else:
                c = rock[2] if y == shelf2[x] else rock[1] if y <= shelf2[x] + 1 else rock[0]
            px[x, y] = (*c, 255)
    # Worn smooth: only a few long cracks and seams on the path, no gravel.
    for _ in range(9):
        x, y, n = rng.randrange(W), rng.randrange(path_top + 2, path_bot - 1), rng.randint(8, 22)
        for k in range(n):
            put(img, x + k, y + (1 if k > n * 0.6 else 0), dark_p)
    for _ in range(12):
        x, y, n = rng.randrange(W), rng.randrange(path_top + 1, path_bot), rng.randint(3, 9)
        for k in range(n):
            put(img, x + k, y, light_p)
    # Cracks down the faces of the shelves.
    for _ in range(34):
        x, y = rng.randrange(W), rng.randrange(path_bot + 3, H - 6)
        for k in range(rng.randint(3, 8)):
            if px[(x + k // 3) % W, y + k][:3] in (rock[2], rock[1]):
                put(img, x + k // 3, y + k, rock[0] if px[(x + k // 3) % W, y + k][:3] == rock[1] else rock[1])
    # Veins of light running through the rock under the path.
    for _ in range(7):
        x, y = rng.randrange(W), rng.randrange(path_bot + 4, H - 8)
        for k in range(rng.randint(14, 34)):
            y += rng.choice((0, 0, 0, 1, -1)) if k % 3 == 0 else 0
            y = max(path_bot + 3, min(H - 3, y))
            if k % 5 != 4:
                put(img, x + k, y, g.lichen[0] if k % 7 else g.lichen[1])
    # Glowing lichen along both edges of the path, in patches.
    for edge_y, spread in ((path_top, -1), (path_bot + 1, 1)):
        x = 0
        while x < W:
            x += rng.randint(4, 22)
            for k in range(rng.randint(3, 11)):
                put(img, x + k, edge_y, rng.choice(g.lichen))
                if rng.random() < 0.45:
                    put(img, x + k, edge_y + spread, g.lichen[0])
            x += 8
    # On the bank behind the path: stalagmite stubs and small crystals.
    for _ in range(14):
        x = rng.randrange(W)
        stub = _wrapped(_spike(x, path_top, rng.uniform(3, 8), rng.uniform(1.4, 2.6)))
        for (a, b) in stub:
            if b < path_top:
                put(img, a, b, rock[4] if ((a + 1) % W, b) not in stub else rock[2])
    for _ in range(8):
        x = rng.randrange(W)
        _cluster(img, x, path_top, rng.uniform(4.0, 7.5), rng.choice(g.gems), rng, n=2)
    # Below the path: puddles holding a little light, then the small lights themselves, each lighting its shelf.
    for _ in range(7):
        x, y = rng.randrange(W), rng.randrange(path_bot + 4, 138)
        for (a, b) in _wrapped(ellipse(x, y, rng.uniform(5, 9), 1.4)):
            put(img, a, b, g.water[2] if (a + b) % 6 else g.water[3])
    for i in range(13):
        x = i * W / 13 + rng.uniform(-14, 14)
        y = rng.choice((rng.randrange(path_bot + 7, 139), rng.randrange(141, 151), rng.randrange(152, H - 2)))
        size = rng.uniform(6.0, 12.0)
        _light(img, x, y - size * 0.3, size * 1.1, size * 0.65, rock, 1)
        if i % 3 == 2:
            _mushroom(img, x, y, rng.uniform(6, 11), rng.choice(g.shrooms), rng)
            _mushroom(img, x + rng.choice((-1, 1)) * rng.uniform(4, 7), y + 1, rng.uniform(4, 7), rng.choice(g.shrooms), rng)
        else:
            _cluster(img, x, y, size, g.gems[i % len(g.gems)], rng, n=3)
    for _ in range(40):  # lichen specks hugging the lips of the shelves
        x = rng.randrange(W)
        y = rng.choice((shelf1[x], shelf2[x]))
        put(img, x, y, rng.choice(g.lichen))
        if rng.random() < 0.5:
            put(img, x + 1, y, g.lichen[0])
    if g.torment:
        for _ in range(6):
            _crystal(img, rng.uniform(0, W), rng.choice([path_top - 1, rng.randrange(path_bot + 8, H - 4)]), rng)
    _calm(img, g)
    return img


def foreground(g: Grade, rng: random.Random) -> Image.Image:
    """Stalagmites and shards sliding past below, stalactites above: near-silhouettes that frame the strip."""
    img = blank(W, H)
    body, rim = g.fore
    ramp = (body, body, rim)

    def mass(pts: Pts) -> None:
        for (a, b) in pts:
            lit = ((a + 1) % W, b) not in pts and 0 < b < H - 1
            put(img, a, b, ramp[2] if lit else ramp[0])

    for _ in range(9):
        x = rng.uniform(0, W)
        pts = _wrapped(_spike(x, H + 2, rng.uniform(10, 23), rng.uniform(4.0, 8.0), rng.uniform(-3, 3)))
        for _ in range(rng.randint(1, 2)):
            pts |= _wrapped(_spike(x + rng.uniform(-11, 11), H + 2, rng.uniform(6, 15), rng.uniform(3.0, 5.5), rng.uniform(-2, 2)))
        mass(pts)
    for _ in range(4):  # a shard that still holds a little light
        x = rng.uniform(0, W)
        gem = rng.choice(g.gems)
        _cluster(img, x, H + 1, rng.uniform(12, 18), (body, gem[0], gem[0], gem[1]), rng, n=3)
    for _ in range(10):
        x = rng.uniform(0, W)
        mass(_wrapped(_spike(x, -2, -rng.uniform(8, 22), rng.uniform(2.6, 5.5), rng.uniform(-2, 2))))
    return img


def _hex(r: str, i: int) -> str:
    return hex_of(color(r, i))


#: What moves, run in real time by the strip.
ATMOSPHERE = {
    "normal": [
        # Spores and motes of light sinking slowly through the cave, behind the fighters; a few close ones in front.
        {"fx": "particles", "count": 44, "color": [_hex("sea", 7), _hex("moss", 7), _hex("sea", 5), _hex("brass", 6)],
         "vx": -4, "vy": 6, "sway": 3, "alpha": 0.6, "ymax": 116, "front": False},
        {"fx": "particles", "count": 9, "color": [_hex("sea", 8), _hex("moss", 8)], "vx": -7, "vy": 9, "sway": 4, "alpha": 0.5, "ymax": 122},
        # Water dripping from the roof.
        {"fx": "particles", "count": 7, "color": _hex("sea", 6), "vx": 0, "vy": 120, "len": 2, "alpha": 0.45, "ymax": 118, "front": False},
    ],
    "torment": [
        # The last lights fail: the whole cave stutters dark for half a second.
        {"fx": "flicker", "every": [3600, 9000], "dur": 520, "color": _hex("ink", 0), "alpha": 0.32},
        # The cavern breathes: a slow rose pulse.
        {"fx": "pulse", "color": _hex("dusk", 3), "period": 4400, "alpha": 0.15},
        # Thick spores sinking.
        {"fx": "particles", "count": 78, "color": [_hex("dusk", 6), _hex("dusk", 4), _hex("bone", 4), _hex("dusk", 7)],
         "vx": -3, "vy": 15, "sway": 4, "alpha": 0.5, "ymax": 126},
        # Eyes open in the dark: small ones high in the mouths of the arches, larger ones, nearer, under the
        # shelves below the path.
        {"fx": "eyes", "every": [1500, 4200], "hold": 1500, "color": _hex("dusk", 8), "zones": [[0, 24, 600, 44]], "max": 3, "size": 1, "gap": 3},
        {"fx": "eyes", "every": [2600, 7000], "hold": 1900, "color": _hex("dusk", 8), "zones": [[0, 142, 600, 154]], "max": 2, "size": 2, "gap": 4},
    ],
}


LAYERS = (
    ("sky", sky, 0.0),
    ("far", far, 0.08),
    ("mid", mid, 0.22),
    ("mist", mist, 0.34),
    ("near", near, 0.5),
    ("ground", ground, 1.0),
    ("fore", foreground, 1.35),
)


def build(grade: str, seed: int = 707) -> dict[str, Image.Image]:
    g = GRADES[grade]
    out: dict[str, Image.Image] = {}
    for i, (name, fn, _speed) in enumerate(LAYERS):
        out[name] = fn(g, random.Random(seed * 100 + i))
    return out
