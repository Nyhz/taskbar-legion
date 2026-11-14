"""World 3 backdrop — the marshes and their villages on stilts, in the rain at blue hour — in every difficulty grade.

Layers (back to front): sky (wet dusk, the moon behind rain clouds), far shore (a hazy tree line, mangroves on
their roots trailing moss, a far hamlet, all mirrored in still water), mist (low banks, and the rain itself, so it
drifts), huts (the village: plank houses under thatch on stilts, a shrine with paper lanterns, a watchtower, nets
drying, boats moored, walkways between them, every lamp mirrored in the water), reeds (reed beds, a mangrove, fish
traps, a skiff with a lantern, fireflies), ground (the plank causeway the party walks, on piles over the water:
lily pads, rain rings, floating lights, a sunken boat) and foreground (cattails, lotus leaves, moss hanging in
from above). The moon lights everything from the upper left; warm lamps are the only warm thing in a cold blue
world. Behind the fighters the village sinks into haze and a skirt of fog lies on the water, so that figures
read against one quiet band.

Torment here is THE DROWNED: cold teal going to black. The water has risen over the walkways, the roofs are
broken, the reeds dead, the horizon corpse-pale, the moon a blind eye; where the lamps were, ghost-lights hang.
Only the Rift and its crystals are violet.

`ATMOSPHERE` is this world's weather for the strip: rain and fireflies; in Torment a thunderstorm with forked
lightning and will-o'-the-wisps over the water.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass

from PIL import Image

from ..backdrop import blank, dither_pick, periodic, put, vertical_gradient
from ..palette import RAMPS, Color, color, hex_of
from ..raster import capsule, circle, ellipse, polygon, rasterize
from .backdrop_w01 import H, PATH_Y, W, _crystal, _rift, _shift

__all__ = ["W", "H", "PATH_Y", "LAYERS", "GRADES", "PREVIEW_BG", "ATMOSPHERE", "build"]

#: The tone creature previews of this world are shown on.
PREVIEW_BG: Color = color("azure", 3)

#: Every palette tone → the next lighter tone of its ramp (rain brightens what it crosses).
LIGHTER: dict[Color, Color] = {color(r, i): color(r, i + 1) for r, tones in RAMPS.items() for i in range(len(tones) - 1)}

#: … and the next darker one.
DARKER: dict[Color, Color] = {v: k for k, v in LIGHTER.items()}

MOON = (164, 40)
#: The water line of the far shore, the deck height of the village and the water line under the reeds.
SHORE, DECK, SHALLOWS = 99, 101, 117


@dataclass(frozen=True)
class Grade:
    key: str
    sky: list[Color]
    sky_end: int
    cloud: tuple[Color, Color, Color, Color]  # belly, body, lit top, moonlit top
    moon: tuple[Color, Color, Color, Color]  # outer halo, halo, disc, crater
    haze: tuple[Color, Color]  # the furthest tree line: body, rim
    far: tuple[Color, Color, Color]  # far bank and its trees: shade, body, rim
    water: list[Color]  # far water, top to bottom
    glint: Color
    mist: tuple[Color, Color]  # body, lit top
    rain: Color
    hut: tuple[Color, Color, Color, Color]  # shade, body, boards, moonlit edge
    thatch: tuple[Color, Color]  # straw, moonlit straw
    warm: tuple[Color, Color]  # lamplight on wood: dim, bright
    lamp: tuple[Color, Color, Color]  # core, glow, reflection
    lantern: Color  # paper lanterns of the shrine
    smoke: tuple[Color, Color]
    reed: tuple[Color, Color]
    head: Color  # cattail heads
    plank: tuple[Color, Color, Color]  # dark, body, light
    pile: tuple[Color, Color]
    near: list[Color]  # water in front of the causeway, top to bottom
    ripple: Color
    pad: tuple[Color, Color]  # lily pads: body, lit
    bloom: Color
    wreck: tuple[Color, Color, Color]  # the sunken boat: dark, body, lit
    fore: tuple[Color, Color]
    motes: tuple[Color, Color]
    hazed: tuple[Color, Color, Color]  # the village where it stands behind the fighters: shade, body, edge
    dimmed: tuple[Color, Color, Color]  # its lamps there: core, glow, reflection
    fog: tuple[Color, Color]  # the skirt of fog on the water behind the fighters: body, lit top
    torment: bool = False


def _c(r: str, i: int) -> Color:
    return color(r, i)


NORMAL = Grade(
    key="normal",
    sky=[_c("ink", 1), _c("azure", 0), _c("azure", 1), _c("azure", 2), _c("azure", 3), _c("sea", 3), _c("sea", 4), _c("sea", 5)],
    sky_end=100,
    cloud=(_c("ink", 0), _c("ink", 1), _c("azure", 2), _c("azure", 4)),
    moon=(_c("azure", 2), _c("azure", 3), _c("azure", 7), _c("azure", 6)),
    haze=(_c("sea", 3), _c("sea", 4)),
    far=(_c("azure", 2), _c("azure", 3), _c("sea", 4)),
    water=[_c("sea", 4), _c("sea", 3), _c("azure", 2), _c("azure", 2)],
    glint=_c("sea", 6),
    mist=(_c("sea", 5), _c("sea", 6)),
    rain=_c("azure", 5),
    hut=(_c("ink", 0), _c("ink", 1), _c("ink", 2), _c("azure", 3)),
    thatch=(_c("ink", 2), _c("ink", 4)),
    warm=(_c("leather", 2), _c("leather", 4)),
    lamp=(_c("brass", 7), _c("brass", 5), _c("brass", 4)),
    lantern=_c("crimson", 5),
    smoke=(_c("azure", 3), _c("azure", 4)),
    reed=(_c("azure", 1), _c("sea", 5)),
    head=_c("leather", 3),
    plank=(_c("leather", 1), _c("leather", 3), _c("leather", 5)),
    pile=(_c("leather", 1), _c("leather", 4)),
    near=[_c("azure", 2), _c("azure", 1), _c("azure", 0), _c("ink", 0)],
    ripple=_c("azure", 3),
    pad=(_c("moss", 3), _c("moss", 5)),
    bloom=_c("bone", 7),
    wreck=(_c("leather", 0), _c("leather", 2), _c("leather", 4)),
    fore=(_c("ink", 0), _c("azure", 2)),
    motes=(_c("moss", 8), _c("brass", 7)),
    hazed=(_c("azure", 2), _c("azure", 2), _c("azure", 3)),
    dimmed=(_c("leather", 5), _c("leather", 3), _c("leather", 2)),
    fog=(_c("sea", 4), _c("sea", 5)),
)

TORMENT = Grade(
    key="torment",
    sky=[_c("ink", 0), _c("ink", 0), _c("sea", 0), _c("sea", 0), _c("sea", 1), _c("sea", 1), _c("sea", 2), _c("sea", 4), _c("sea", 6)],
    sky_end=100,
    cloud=(_c("ink", 0), _c("ink", 1), _c("sea", 1), _c("sea", 3)),
    moon=(_c("sea", 1), _c("sea", 2), _c("sea", 7), _c("sea", 5)),
    haze=(_c("sea", 3), _c("sea", 4)),
    far=(_c("sea", 0), _c("sea", 1), _c("sea", 3)),
    water=[_c("sea", 2), _c("sea", 1), _c("sea", 0), _c("ink", 0)],
    glint=_c("sea", 4),
    mist=(_c("sea", 5), _c("sea", 6)),
    rain=_c("sea", 6),
    hut=(_c("ink", 0), _c("ink", 1), _c("sea", 0), _c("sea", 2)),
    thatch=(_c("sea", 0), _c("sea", 2)),
    warm=(_c("sea", 0), _c("sea", 0)),
    lamp=(_c("bone", 7), _c("sea", 7), _c("sea", 4)),  # ghost-lights
    lantern=_c("sea", 2),
    smoke=(_c("sea", 2), _c("sea", 3)),
    reed=(_c("ink", 0), _c("sea", 1)),
    head=_c("ink", 3),
    plank=(_c("ink", 1), _c("ink", 3), _c("ink", 5)),
    pile=(_c("ink", 1), _c("ink", 4)),
    near=[_c("sea", 1), _c("sea", 0), _c("ink", 0), _c("ink", 0)],
    ripple=_c("sea", 2),
    pad=(_c("ink", 2), _c("sea", 2)),
    bloom=_c("sea", 6),
    wreck=(_c("ink", 0), _c("ink", 2), _c("ink", 4)),
    fore=(_c("ink", 0), _c("sea", 2)),
    motes=(_c("sea", 7), _c("bone", 6)),
    hazed=(_c("sea", 1), _c("sea", 2), _c("sea", 2)),
    dimmed=(_c("sea", 6), _c("sea", 4), _c("sea", 3)),
    fog=(_c("sea", 3), _c("sea", 4)),
    torment=True,
)

GRADES = {"normal": NORMAL, "torment": TORMENT}

#: The weather, run in real time by the strip. Normal: steady rain and fireflies drifting up off the reeds.
#: Torment: a thunderstorm — driven rain, forked lightning that whites out the sky behind the fighters and shakes
#: the strip, and between strikes will-o'-the-wisps opening like eyes over the black water.
ATMOSPHERE = {
    "normal": [
        {"fx": "particles", "count": 80, "color": [hex_of(_c("azure", 5)), hex_of(_c("azure", 6))], "vx": -48, "vy": 250, "len": 5, "alpha": 0.5, "ymax": 126},
        {"fx": "particles", "count": 16, "color": [hex_of(_c("moss", 8)), hex_of(_c("brass", 7))], "vx": 4, "vy": -7, "sway": 5, "alpha": 0.9, "ymax": 112,
         "front": False},
    ],
    "torment": [
        {"fx": "particles", "count": 90, "color": [hex_of(_c("sea", 5)), hex_of(_c("sea", 7))], "vx": -120, "vy": 310, "len": 7, "alpha": 0.45, "ymax": 126},
        {"fx": "lightning", "every": [3500, 9000], "flash": hex_of(_c("sea", 8)), "alpha": 0.42, "bolt": hex_of(_c("light", 0)), "x": [30, 570], "y": [8, 96],
         "shake": 2},
        {"fx": "eyes", "every": [1600, 4200], "hold": 1700, "color": hex_of(_c("sea", 8)), "zones": [[0, 100, 600, 110], [0, 134, 600, 152]], "max": 3, "size": 1,
         "gap": 3},
    ],
}


# ------------------------------------------------------------------------------------- helpers
def _pts(shape) -> set[tuple[int, int]]:
    """Pixels of a shape, in layer coordinates that may run past either edge (they wrap when painted)."""
    return {(x - W, y) for (x, y) in rasterize(_shift(shape, W), W * 3, H)}


def _paint(img: Image.Image, shape, body: Color, rim: Color | None = None, shade: Color | None = None, side: int = -1) -> set[tuple[int, int]]:
    """A solid form lit by the moon: `rim` on its top and its `side` edge, `shade` along its underside."""
    pts = _pts(shape)
    for (x, y) in pts:
        c = body
        if rim is not None and ((x, y - 1) not in pts or (x + side, y) not in pts):
            c = rim
        elif shade is not None and (x, y + 1) not in pts:
            c = shade
        put(img, x, y, c)
    return pts


def _hline(img: Image.Image, x0: int, x1: int, y: int, c: Color) -> None:
    for x in range(x0, x1 + 1):
        put(img, x, y, c)


def _vline(img: Image.Image, x: int, y0: int, y1: int, c: Color) -> None:
    for y in range(y0, y1 + 1):
        put(img, x, y, c)


def _box(img: Image.Image, x0: int, y0: int, x1: int, y1: int, c: Color) -> None:
    for y in range(y0, y1 + 1):
        _hline(img, x0, x1, y, c)


def _line(img: Image.Image, x0: float, y0: float, x1: float, y1: float, c: Color) -> None:
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n + 1):
        t = i / n
        put(img, int(round(x0 + (x1 - x0) * t)), int(round(y0 + (y1 - y0) * t)), c)


def _glints(img: Image.Image, rng: random.Random, y0: int, y1: int, n: int, tone: Color, longest: int = 9) -> None:
    """Short flat strokes of light on still water."""
    for _ in range(n):
        x, y = rng.randrange(W), rng.randrange(y0, y1)
        for k in range(rng.randint(2, longest)):
            put(img, x + k, y, tone)


def _reflect(img: Image.Image, x: int, y0: int, depth: int, tone: Color, rng: random.Random, wide: int = 1) -> None:
    """A light mirrored in the water: a broken column, wavering."""
    for j in range(depth):
        if j % 2 == 0 or rng.random() < 0.25:
            sway = int(round(math.sin(j * 0.9 + x) * (0.6 + j * 0.08)))
            for k in range(-wide + 1, wide):
                put(img, x + sway + k, y0 + j, tone)


def _mirror(img: Image.Image, line: int, depth: int, squash: float, tone: Color, lights: dict[Color, Color], solid: set[Color]) -> None:
    """Whatever stands above `line` lies mirrored below it in broken rows: dark forms as `tone`, lights as
    their own reflection tone."""
    px = img.load()
    for j in range(1, depth):
        if j % 2 == 1 and j > 2:
            continue
        sy = line - 1 - int(j * squash)
        if sy < 0:
            break
        wob = int(round(math.sin(j * 1.3) * (j * 0.12)))
        for x in range(W):
            r, g_, b, a = px[x, sy]
            if not a:
                continue
            c = (r, g_, b)
            if c in lights:
                put(img, x + wob, line + j, lights[c])
            elif c in solid and (x + j) % 5:
                put(img, x + wob, line + j, tone)


def _reeds(img: Image.Image, x: float, base: float, rng: random.Random, body: Color, rim: Color, head: Color, height: float, dead: bool, n: int = 7) -> None:
    """A clump of reeds: thin blades, some bent, some carrying a cattail head."""
    for _ in range(n):
        bx = x + rng.uniform(-5, 5)
        hgt = height * rng.uniform(0.5, 1.0)
        bend = rng.uniform(-0.28, 0.28)
        snap = rng.uniform(0.45, 0.8) if dead and rng.random() < 0.6 else 2.0
        px_, py_ = bx, base
        for j in range(int(hgt)):
            t = j / hgt
            if t > snap:  # a dead reed is broken and hangs
                px_ += 0.8 * (1 if bend > 0 else -1)
                py_ += 0.5
            else:
                px_ = bx + bend * j * t * 1.5
                py_ = base - j
            put(img, int(px_), int(py_), rim if j > hgt * 0.6 else body)
        if not dead and rng.random() < 0.45:
            for j in range(3):
                put(img, int(px_), int(py_) + 1 + j, head)
                put(img, int(px_) + 1, int(py_) + 1 + j, head)
            put(img, int(px_), int(py_) - 1, rim)


def _ghost(img: Image.Image, x: int, y: int, g: Grade) -> None:
    """A ghost-light where a lamp used to burn: a pale core, a cold glow, a wisp trailing up."""
    core, glow, wisp = g.lamp
    for dx, dy in ((2, 0), (-2, 0), (1, 1), (-1, 1), (1, -1), (-1, -1), (0, 2)):  # a faint halo
        put(img, x + dx, y + dy, wisp)
    put(img, x, y, core)
    for dx, dy in ((1, 0), (-1, 0), (0, -1), (0, 1)):
        put(img, x + dx, y + dy, glow)
    for k, dx in enumerate((0, 1, 1, 0)):  # and a wisp wandering up from it
        put(img, x + dx * (1 if x % 2 else -1), y - 2 - k, glow if k == 0 else wisp)


def _recolour(img: Image.Image, y0: int, y1: int, table: dict[Color, Color]) -> None:
    px = img.load()
    for y in range(max(0, y0), min(H, y1)):
        for x in range(W):
            r, g_, b, a = px[x, y]
            if a and (r, g_, b) in table:
                px[x, y] = (*table[(r, g_, b)], 255)


def _haze(img: Image.Image, g: Grade, soft: int = 84, hard: int = 91, dark_only: bool = False) -> None:
    """What stands behind the fighters sinks into haze: from `soft` down the darks lift a step towards the tone
    of the air, from `hard` down they sit in it, and the lamps there burn low. Roofs and everything above keep
    their edge. The fighters stand in front of this band, so it must be quiet."""
    shade, body, boards, edge = g.hut
    hs, hb, he = g.hazed
    deep = {shade: hs, body: hb, boards: he, g.thatch[0]: hb, g.thatch[1]: he, edge: he, g.reed[0]: hb, g.reed[1]: he, g.head: he}
    half = {src: DARKER.get(dst, dst) if src in (shade, body) else dst for src, dst in deep.items()}
    if not dark_only:
        core, glow, refl = g.lamp
        dc, dg, dr = g.dimmed
        lights = {core: dc, glow: dg, refl: dr, g.warm[1]: dr, g.warm[0]: hb, g.lantern: DARKER.get(DARKER.get(g.lantern, g.lantern), g.lantern)}
        deep.update(lights)
        half.update({core: glow, g.warm[1]: g.warm[0]})
    _recolour(img, soft, hard, half)
    _recolour(img, hard, H, deep)


def _fog(img: Image.Image, rng: random.Random, g: Grade, y0: int = 100, y1: int = 114, banks: int = 7) -> None:
    """A skirt of fog lying on the water behind the fighters: broad flat banks of one tone, a lit top edge."""
    body, lit = g.fog
    for i in range(banks):
        cx, cy, length = i * W / banks + rng.uniform(-30, 30), rng.uniform(y0 + 1, y1 - 1), rng.uniform(90, 170)
        shape = ellipse(cx, cy, length / 2, rng.uniform(2.2, 4.0))
        for _ in range(3):
            shape = shape | ellipse(cx + rng.uniform(-length / 2, length / 2), cy + rng.uniform(-2, 2), rng.uniform(20, length / 2.2), rng.uniform(1.6, 3.4))
        for dx in (-W, 0, W):
            pts = rasterize(_shift(shape, dx), W, H)
            for (x, y) in pts:
                put(img, x, y, lit if (x, y - 1) not in pts else body)


def _lamp(img: Image.Image, x: int, y: int, g: Grade, big: bool = False, low: bool = False) -> None:
    """A lamp: a hot core in a small cross of glow; `low` is one turned down. Dead in Torment."""
    core, glow, _ = g.dimmed if low else g.lamp
    if g.torment:
        put(img, x, y, g.hut[3])
        return
    put(img, x, y, core)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        put(img, x + dx, y + dy, glow)
    if big:
        for dx, dy in ((2, 0), (-2, 0), (0, -2), (1, 1), (-1, 1), (1, -1), (-1, -1)):
            put(img, x + dx, y + dy, g.lamp[2])


def _mangrove(img: Image.Image, x: float, base: float, hgt: float, rng: random.Random, tones: tuple[Color, Color, Color], dead: bool, roots: float = 1.0) -> None:
    """A swamp tree: a leaning trunk standing on arched prop roots, boughs spreading into a broad, uneven
    canopy of flat lobes, moss hanging in strands from its underside."""
    shade, body, rim = tones
    lean = rng.uniform(-0.2, 0.2) * hgt
    fork = (x + lean * 0.6, base - hgt * 0.5)
    shape = capsule(x, base - 4 * roots, fork[0], fork[1], max(0.8, hgt * 0.05), max(0.6, hgt * 0.035))
    for i in range(rng.randint(4, 6)):  # prop roots arch out and down into the water
        side = -1 if i % 2 else 1
        out = rng.uniform(3, 4 + hgt * 0.22) * roots
        top_y = base - rng.uniform(5, 5 + hgt * 0.2) * roots
        knee = (x + side * out * 0.6, top_y + 1.5)
        shape = shape | capsule(x, top_y, knee[0], knee[1], 0.5) | capsule(knee[0], knee[1], x + side * out, base + 1, 0.5)
    lobes: list[tuple[float, float, float, float]] = []
    spread = hgt * 0.55
    for i in range(rng.randint(3, 5)):  # boughs
        bx = fork[0] + (i / 3.0 - 0.6) * spread * 2 * rng.uniform(0.7, 1.1)
        by = base - hgt * rng.uniform(0.72, 0.96)
        shape = shape | capsule(fork[0], fork[1], bx, by, 0.7, 0.5)
        lobes.append((bx, by, rng.uniform(hgt * 0.2, hgt * 0.34), rng.uniform(1.8, 2.4 + hgt * 0.04)))
        if dead:
            shape = shape | capsule(bx, by, bx + rng.uniform(-5, 5), by - rng.uniform(3, 7), 0.5)
    if not dead:
        for (bx, by, rx, ry) in lobes:
            shape = shape | ellipse(bx, by, rx, ry) | ellipse(bx + rng.uniform(-rx, rx) * 0.6, by - ry * 0.8, rx * 0.55, ry * 0.8)
    pts = _paint(img, shape, body, rim, shade, side=-1)
    if dead:
        return
    for (bx, by, rx, ry) in lobes:  # moss: strands of different lengths under every lobe
        for _ in range(int(rx * 0.55) + 1):
            sx = int(bx + rng.uniform(-rx, rx) * 0.9)
            y0 = int(by + ry * 0.5)
            while (sx, y0 + 1) in pts:
                y0 += 1
            for k in range(rng.randint(2, int(3 + hgt * 0.22))):
                put(img, sx, y0 + 1 + k, shade if k % 3 == 2 else body)


def _bank(img: Image.Image, rng: random.Random, cx: float, cy: float, length: float, thick: float, g: Grade) -> None:
    """A rain cloud with weight: heaped tops that catch what light there is (brighter the nearer the moon), a
    body, and a flat dark belly."""
    belly, body, lit, moonlit = g.cloud
    n = max(3, int(length / (thick * 1.5)))
    shape = None
    for i in range(n):
        t = (i + 0.5 + rng.uniform(-0.3, 0.3)) / n
        swell = 0.5 + 0.5 * math.sin(math.pi * t) ** 0.7
        blob = circle(cx - length / 2 + t * length, cy - thick * 0.2 * swell, thick * rng.uniform(0.5, 1.15) * swell)
        shape = blob if shape is None else shape | blob
    shape = shape | ellipse(cx, cy + thick * 0.25, length / 2, thick * 0.4)
    floor = cy + thick * 0.45  # the belly is flat
    px = img.load()
    for dx in (-W, 0, W):
        pts = {(x, y) for (x, y) in rasterize(_shift(shape, dx), W, H) if y <= floor}
        for (x, y) in pts:
            if (x, y - 1) not in pts:
                c = moonlit if math.hypot(x - MOON[0], (y - MOON[1]) * 1.5) < 84 else lit
            elif (x, y + 1) not in pts or (x, y + 2) not in pts:
                c = belly
            else:
                c = body
            px[x, y] = (*c, 255)


def _lid(img: Image.Image, rng: random.Random, g: Grade) -> None:
    """The ceiling of cloud across the top of the frame, seen from below: its lumpy underside rim-lit."""
    belly, body, lit, moonlit = g.cloud
    ph = [rng.uniform(0, math.tau) for _ in range(3)]
    px = img.load()
    for x in range(W):
        a = math.tau * x / W
        edge = int(round(6 + 3.2 * abs(math.sin(a * 4 + ph[0])) + 2.4 * abs(math.sin(a * 9 + ph[1])) + 1.2 * abs(math.sin(a * 17 + ph[2]))))
        for y in range(0, edge + 1):
            if y == edge:
                c = moonlit if abs(x - MOON[0]) < 70 else lit
            elif y >= edge - 2:
                c = belly
            else:
                c = body if y > 2 else belly
            px[x, y] = (*c, 255)


# ------------------------------------------------------------------------------------- layers
def sky(g: Grade, rng: random.Random) -> Image.Image:
    img = blank(W, H)
    vertical_gradient(img, g.sky, 0, g.sky_end, curve=0.9)
    px = img.load()
    for y in range(g.sky_end, H):
        for x in range(W):
            px[x, y] = (*g.sky[-1], 255)
    mx, my = MOON
    outer, halo, disc, crater = g.moon
    if g.torment:
        for _ in range(80):
            x, y = rng.randrange(W), rng.randrange(0, 72)
            px[x, y] = (*(_c("bone", 6) if rng.random() < 0.5 else _c("sea", 6)), 255)
        # The moon as a blind eye: a pale ball, a milky ring where the iris was, no pupil; it does not blink.
        for r, c in ((19, outer), (14, halo), (10, disc)):
            for (x, y) in rasterize(circle(mx, my, r), W, H):
                px[x, y] = (*c, 255)
        for (x, y) in rasterize(circle(mx + 1, my + 1, 5.6) - circle(mx + 1, my + 1, 3.6), W, H):
            px[x, y] = (*crater, 255)
        for (x, y) in rasterize(circle(mx + 1, my + 1, 3.6), W, H):
            px[x, y] = (*_c("sea", 6), 255)
        for (x, y) in rasterize(circle(mx, my, 10) - circle(mx + 1.4, my + 1.4, 10), W, H):
            px[x, y] = (*_c("bone", 7), 255)
        for k in range(-13, 14):  # a lid of dark cloud half lowered over it
            if abs(k) > 2:
                px[(mx + k) % W, my - 8 - (abs(k) // 7)] = (*g.cloud[1], 255)
        _rift(img, rng)
    else:
        # The moon behind the weather: two rings of halo, the disc, its seas, a brighter limb.
        for r, c in ((21, outer), (15, halo), (9, disc)):
            for (x, y) in rasterize(circle(mx, my, r), W, H):
                px[x, y] = (*c, 255)
        for (x, y) in rasterize(circle(mx + 2.5, my - 2, 2.2) | circle(mx - 3, my + 2.5, 1.6) | circle(mx + 1, my + 4, 1.2), W, H):
            px[x, y] = (*crater, 255)
        for (x, y) in rasterize(circle(mx, my, 9) - circle(mx + 1.6, my + 1.6, 9), W, H):
            px[x, y] = (*_c("azure", 8), 255)
    if not g.torment:
        # Rain in the distance: a few slanted strokes, one tone lighter than the sky behind them. (The rain that
        # falls is the strip's: see ATMOSPHERE.)
        for _ in range(40):
            x, y = rng.randrange(W), rng.randrange(0, g.sky_end - 6)
            for k in range(rng.randint(3, 7)):
                xx, yy = (x - k // 2) % W, y + k
                if yy < g.sky_end:
                    c = px[xx, yy][:3]
                    if c in LIGHTER:
                        px[xx, yy] = (*LIGHTER[c], 255)
    # Rain clouds in three tiers: thin streamers low down, heavy banks above them, a ceiling across the top.
    for _ in range(4):
        _bank(img, rng, rng.uniform(0, W), rng.uniform(52, 64), rng.uniform(60, 120), rng.uniform(3.0, 4.2), g)
    for i in range(5):
        cx, length = i * W / 5 + rng.uniform(-40, 40), rng.uniform(90, 170)
        cy = rng.uniform(24, 40)
        for dx in (-W, 0, W):  # the moon keeps a clear patch of sky: a bank may only graze it from below
            if abs(cx + dx - MOON[0]) < length / 2 + 16:
                cy = rng.uniform(58, 62)
                length *= 0.7
        _bank(img, rng, cx, cy, length, rng.uniform(7.5, 11.0) if cy < 50 else 4.0, g)
    _lid(img, rng, g)
    return img


def far_shore(g: Grade, rng: random.Random) -> Image.Image:
    """Two planes of far bank — a hazy tree line, then mangroves and a hamlet — over the water they all stand
    in, which mirrors them."""
    img = blank(W, H)
    px = img.load()
    shade, body, rim = g.far
    # The furthest plane: a low wall of forest, pale with rain.
    f2 = periodic(W, rng, [(2, 2.2), (5, 1.8), (9, 1.2), (17, 0.7)])
    for x in range(W):
        top = int(round(87 + f2(x) - 2.2 * abs(math.sin(x * 0.37)) - 1.5 * abs(math.sin(x * 0.11 + 1.0))))
        for y in range(top, SHORE):
            px[x, y] = (*(g.haze[1] if y == top else g.haze[0]), 255)
    for _ in range(9):  # a few taller crowns standing out of it
        x = rng.uniform(0, W)
        _paint(img, ellipse(x, 86 + f2(x), rng.uniform(5, 10), rng.uniform(2.5, 4)) | capsule(x, 90, x, 86 + f2(x), 0.6), g.haze[0], g.haze[1])
    # The far bank itself.
    f = periodic(W, rng, [(1, 1.6), (3, 1.4), (7, 0.8)])
    tops = []
    for x in range(W):
        top = int(round(94 + f(x)))
        tops.append(top)
        for y in range(top, SHORE):
            px[x, y] = (*(rim if y == top else body), 255)
        if rng.random() < 0.55:  # reed tips along it
            for k in range(rng.randint(1, 3)):
                put(img, x, top - 1 - k, body)
    # Mangroves: big ones spaced along the bank, saplings between.
    for i in range(6):
        x = i * W / 6 + rng.uniform(-30, 30) + 40
        _mangrove(img, x, 96 + f(x), rng.uniform(26, 38), rng, g.far, g.torment)
    for _ in range(6):
        x = rng.uniform(0, W)
        _mangrove(img, x, 96 + f(x), rng.uniform(12, 18), rng, g.far, g.torment, roots=0.6)
    # A far hamlet: houses on legs under pitched roofs, a jetty, one light each.
    lights: list[tuple[int, int]] = []
    hx = 300
    for k, off in enumerate((-34, -19, -6, 9, 24, 41)):
        x = hx + off
        top = tops[x % W]
        wide = 4 + (k % 2)
        _box(img, x - wide, top - 6, x + wide, top - 2, body)
        _vline(img, x - wide, top - 6, top - 2, rim)
        for r in range(4):  # the roof
            _hline(img, x - wide - 2 + r, x + wide + 2 - r, top - 7 - r, shade if r else body)
            put(img, x - wide - 2 + r, top - 7 - r, rim)
        for sx in (-wide, 0, wide):
            _vline(img, x + sx, top - 1, SHORE, body)
        lights.append((x - 1, top - 4))
    _hline(img, hx - 40, hx + 46, SHORE - 2, body)  # the jetty joining them
    for x in (70, 198, 476, 548):  # lone houses elsewhere
        top = tops[x]
        _box(img, x - 3, top - 5, x + 3, top - 2, body)
        _hline(img, x - 4, x + 4, top - 6, rim)
        _hline(img, x - 2, x + 2, top - 7, body)
        put(img, x - 3, top - 1, body)
        put(img, x + 3, top - 1, body)
        lights.append((x, top - 3))
    # The water, and everything on the bank lying in it upside down.
    for x in range(W):
        for y in range(SHORE, 126):
            t = (y - SHORE) / (126 - SHORE)
            px[x, y] = (*dither_pick(g.water, t, x, y), 255)
    if not g.torment:
        for (x, y) in lights:
            put(img, x, y, g.lamp[1])
    _mirror(img, SHORE, 15, 1.7, body, {g.lamp[1]: g.lamp[2]}, {body, shade})
    if not g.torment:
        for (x, _y) in lights:
            _reflect(img, x, SHORE + 1, 8, g.lamp[2], rng)
    _glints(img, rng, SHORE + 1, 124, 90, g.glint)
    for x in range(W):  # the bright seam where the water meets the far bank
        if rng.random() < 0.7:
            put(img, x, SHORE, g.glint)
    return img


def mist(g: Grade, rng: random.Random) -> Image.Image:
    """Low banks of mist over the water. (The rain is not painted: the strip runs it, see ATMOSPHERE.)"""
    img = blank(W, H)
    body, lit = g.mist
    for _ in range(8):
        cx, cy = rng.uniform(0, W), rng.uniform(88, 101)
        length = rng.uniform(50, 130)
        shape = ellipse(cx, cy, length / 2, rng.uniform(1.0, 2.0))
        for _ in range(3):
            shape = shape | ellipse(cx + rng.uniform(-length / 2, length / 2), cy + rng.uniform(-1.2, 1.2), rng.uniform(10, length / 2.4), rng.uniform(0.9, 2.2))
        for dx in (-W, 0, W):
            pts = rasterize(_shift(shape, dx), W, H)
            for (x, y) in pts:
                put(img, x, y, lit if (x, y - 1) not in pts else body)
    return img


def _thatch(img: Image.Image, g: Grade, rng: random.Random, x: int, eave_y: int, half: int, rise: int, ridge: int = 3, wrecked: bool = False) -> None:
    """A thatched roof: courses of straw stepping up to the ridge, a ragged eave, the moon on its left slope."""
    shade, body, _boards, edge = g.hut
    straw, lit = g.thatch
    for r in range(rise + 1):
        y = eave_y - r
        t = r / max(1, rise)
        hw = int(round(half + (ridge - half) * t))
        if wrecked and r > rise * 0.35:  # the top has fallen in: only rafters are left
            if r % 1 == 0:
                for k in (-0.8, -0.3, 0.3, 0.8):
                    put(img, x + int(round(hw * k)), y, body)
            continue
        for dx in range(-hw, hw + 1):
            c = body
            if r % 3 == 0 and (dx + r) % 4 < 2:
                c = straw  # the butt ends of a course
            if dx <= -hw + 1:
                c = edge if dx == -hw else lit
            elif dx < 0 and r % 3 == 0 and (dx + r) % 4 == 0:
                c = lit
            elif dx >= hw:
                c = shade
            put(img, x + dx, y, c)
    if not wrecked:
        for dx in range(-half, half + 1):  # the eave hangs ragged
            if (dx * 7 + x) % 3:
                put(img, x + dx, eave_y + 1, body if dx > -half + 2 else lit)
        # Crossed ridge poles.
        top = eave_y - rise
        _line(img, x - ridge, top + 1, x + ridge + 2, top - 6, body)
        _line(img, x + ridge, top + 1, x - ridge - 2, top - 6, body)
        put(img, x - ridge - 2, top - 6, edge)


def _stilts(img: Image.Image, g: Grade, xs: list[int], deck: int, foot: int = 123) -> None:
    shade, body, _boards, edge = g.hut
    for sx in xs:
        _vline(img, sx, deck, foot, body)
        _vline(img, sx + 1, deck, foot, shade)
        _vline(img, sx - 1, deck + 2, deck + 9, edge)
    for a, b in zip(xs, xs[1:]):
        _line(img, a + 1, deck + 3, b, deck + 11, body)


def _window(img: Image.Image, g: Grade, x: int, y: int, wide: int = 3, tall: int = 3) -> tuple[int, int]:
    """A lit window with its frame; lamplight spills on the boards round it. Returns its centre."""
    shade, body, boards, _edge = g.hut
    _box(img, x - 1, y - 1, x + wide, y + tall, shade)
    if g.torment:
        _box(img, x, y, x + wide - 1, y + tall - 1, body)
    else:
        _box(img, x, y, x + wide - 1, y + tall - 1, g.lamp[1])
        put(img, x + wide // 2, y + tall // 2, g.lamp[0])
        put(img, x + wide // 2, y, g.lamp[0])
        for dx in range(-2, wide + 2):  # the glow on the wall under the sill
            if (dx + x) % 2 == 0:
                put(img, x + dx, y + tall + 1, g.warm[0])
        _vline(img, x - 2, y, y + tall - 1, g.warm[0])
        _vline(img, x + wide + 1, y, y + tall - 1, g.warm[0])
    return (x + wide // 2, y + tall // 2)


def _house(img: Image.Image, g: Grade, rng: random.Random, x: int, half: int, wall: int, rise: int, wrecked: bool, tall_door: bool = True) -> list[int]:
    """A plank house on stilts under thatch, with a porch, a ladder and a lamp at the eave. Returns the x of
    every light it shows, for their reflections."""
    shade, body, boards, edge = g.hut
    lights: list[int] = []
    _stilts(img, g, [x - half, x - half // 3, x + half // 3, x + half - 1], DECK)
    # Porch deck with a rail.
    _hline(img, x - half - 6, x + half + 6, DECK, edge)
    _hline(img, x - half - 6, x + half + 6, DECK + 1, body)
    _hline(img, x - half - 6, x + half + 6, DECK + 2, shade)
    for rx in list(range(x - half - 6, x - half, 3)) + list(range(x + half + 1, x + half + 7, 3)):
        _vline(img, rx, DECK - 4, DECK - 1, body)
    _hline(img, x - half - 6, x - half, DECK - 5, boards)
    _hline(img, x + half, x + half + 6, DECK - 5, boards)
    # Walls of upright boards: the moon on the left ones, a beam across, a dark band under the eave.
    top = DECK - wall
    for dx in range(-half + 1, half):
        col = boards if (dx + half) % 3 else body
        if dx < -half + 3:
            col = edge if dx == -half + 1 else boards
        for y in range(top, DECK):
            put(img, x + dx, y, shade if y < top + 2 else col)
    _hline(img, x - half + 1, x + half - 1, DECK - wall // 2 - 1, body)
    for dx in range(-half + 2, half, 3):  # seams between boards
        _vline(img, x + dx, top + 2, DECK - 1, shade if (dx * 5 + x) % 4 == 0 else body)
    # Door and windows.
    dx0 = x - 2 + rng.choice((-3, 0, 3))
    door_h = 8 if tall_door else 6
    _box(img, dx0 - 1, DECK - door_h - 1, dx0 + 3, DECK - 1, shade)
    if not g.torment:
        _box(img, dx0, DECK - door_h, dx0 + 2, DECK - 1, g.lamp[1])
        _vline(img, dx0 + 1, DECK - door_h + 1, DECK - 3, g.lamp[0])
        put(img, dx0 + 1, DECK - 3, shade)  # someone standing in it
        put(img, dx0 + 1, DECK - 2, shade)
        _hline(img, dx0 - 1, dx0 + 4, DECK, g.warm[1])  # light across the porch boards
        lights.append(dx0 + 1)
    for wx in (x - half + 3, x + half - 6):
        if abs(wx - dx0) > 5:
            cx, _cy = _window(img, g, wx, top + 4)
            if not g.torment:
                lights.append(cx)
    _thatch(img, g, rng, x, top, half + 6, rise, wrecked=wrecked)
    if wrecked:
        return lights
    # A lamp hung from the eave on the right, a ladder down to the water on the left.
    lx = x + half + 5
    _vline(img, lx, top + 2, top + 4, body)
    _lamp(img, lx, top + 6, g, big=True)
    if not g.torment:
        lights.append(lx)
    for k in range(DECK + 2, 122):
        put(img, x - half - 5, k, body)
        put(img, x - half - 2, k, body)
        if k % 3 == 0:
            _hline(img, x - half - 4, x - half - 3, k, boards)
    # Smoke from the smoke hole, bending with the wind.
    if not g.torment:
        sx_, sy_ = float(x + 2), float(top - rise - 4)
        for k in range(12):
            sx_ += 0.5 + k * 0.12
            sy_ -= 1.4
            tone = g.smoke[0] if k < 7 else g.smoke[1]
            put(img, int(sx_), int(sy_), tone)
            if k % 2 == 0:
                put(img, int(sx_) + 1, int(sy_), tone)
            if k > 5 and k % 3 == 0:
                put(img, int(sx_) + 2, int(sy_) + 1, tone)
    return lights


def _shrine(img: Image.Image, g: Grade, rng: random.Random, x: int) -> list[int]:
    """The village shrine: a wide platform, a two-tiered roof with upturned eaves, a row of paper lanterns
    and a gate in front of its stair."""
    shade, body, boards, edge = g.hut
    lights: list[int] = []
    half = 17
    _stilts(img, g, [x - half, x - half // 2, x, x + half // 2, x + half - 1], DECK)
    _hline(img, x - half - 8, x + half + 8, DECK, edge)
    _box(img, x - half - 8, DECK + 1, x + half + 8, DECK + 2, body)
    # Open hall: posts, a back wall in shadow, the altar light.
    _box(img, x - half + 1, DECK - 15, x + half - 1, DECK - 1, shade)
    for px_ in (-half + 1, -half // 2, half // 2, half - 1):
        _vline(img, x + px_, DECK - 15, DECK - 1, boards)
        _vline(img, x + px_ - 1, DECK - 15, DECK - 1, edge if px_ < 0 else body)
    if not g.torment:
        _box(img, x - 2, DECK - 9, x + 2, DECK - 3, g.lamp[1])
        _box(img, x - 1, DECK - 8, x + 1, DECK - 5, g.lamp[0])
        for dx in range(-6, 7):
            if dx % 2 == 0:
                put(img, x + dx, DECK - 1, g.warm[1])
                put(img, x + dx + 1, DECK - 11, g.warm[0])
        lights.append(x)

    def tier(y: int, hw: int, rise: int) -> None:
        for r in range(rise + 1):
            w_ = int(round(hw - r * (hw - 4) / max(1, rise) * 0.8))
            for dx in range(-w_, w_ + 1):
                c = body
                if r % 2 == 0 and (dx + r) % 3 == 0:
                    c = boards
                if dx <= -w_ + 1:
                    c = edge
                put(img, x + dx, y - r, c)
        for s in (-1, 1):  # eaves that turn up at the corners
            put(img, x + s * (hw + 1), y - 1, edge if s < 0 else body)
            put(img, x + s * (hw + 2), y - 2, edge if s < 0 else body)
            put(img, x + s * (hw + 3), y - 3, edge if s < 0 else body)
        _hline(img, x - hw, x + hw, y + 1, shade)

    tier(DECK - 16, half + 6, 6)
    _box(img, x - 9, DECK - 29, x + 9, DECK - 23, body)
    _vline(img, x - 9, DECK - 29, DECK - 23, edge)
    if not g.torment:
        cx, _cy = _window(img, g, x - 1, DECK - 28, wide=3, tall=3)
    tier(DECK - 30, 14, 7)
    _vline(img, x, DECK - 45, DECK - 38, body)  # the finial
    put(img, x, DECK - 46, g.lamp[1] if not g.torment else edge)
    # Paper lanterns strung under the lower eave.
    for k, dx in enumerate((-18, -11, -4, 4, 11, 18)):
        y = DECK - 13 + (1 if k % 2 else 0)
        put(img, x + dx, y - 1, body)
        if g.torment:
            put(img, x + dx, y, g.lantern)
        else:
            put(img, x + dx, y, g.lamp[0])
            put(img, x + dx, y + 1, g.lantern)
            put(img, x + dx - 1, y, g.lantern)
            put(img, x + dx + 1, y, g.lantern)
            lights.append(x + dx)
    # The gate: two posts under a double lintel, standing in the water before the stair.
    gx = x - half - 22
    for s in (-5, 5):
        _vline(img, gx + s, DECK - 17, 123, g.lantern if not g.torment else body)
        _vline(img, gx + s + 1, DECK - 17, 123, shade)
    _hline(img, gx - 9, gx + 10, DECK - 18, g.lantern if not g.torment else edge)
    _hline(img, gx - 8, gx + 9, DECK - 17, shade)
    _hline(img, gx - 6, gx + 7, DECK - 13, g.lantern if not g.torment else body)
    put(img, gx - 10, DECK - 19, edge)
    put(img, gx + 11, DECK - 19, body)
    # Steps from the platform down to the gate.
    for k in range(6):
        _hline(img, x - half - 10 - k * 2, x - half - 8 - k * 2 + 1, DECK + 1 + k, boards)
        _vline(img, x - half - 10 - k * 2, DECK + 2 + k, DECK + 3 + k, body)
    return lights


def _tower(img: Image.Image, g: Grade, rng: random.Random, x: int) -> list[int]:
    """The watchtower: a cabin high on four legs, a ladder, a beacon, a pennant."""
    shade, body, boards, edge = g.hut
    top = DECK - 34
    for s in (-5, 5):
        _line(img, x + s, top, x + int(s * 1.7), 123, body)
        _line(img, x + s + 1, top, x + int(s * 1.7) + 1, 123, shade)
    for y0 in (top + 8, top + 22, top + 36):
        _line(img, x - 6, y0, x + 7, y0 + 10, body)
        _line(img, x + 6, y0, x - 7, y0 + 10, body)
        _hline(img, x - 7, x + 7, y0, boards)
    for k in range(top + 2, 122):  # ladder
        if k % 3 == 0:
            _hline(img, x - 1, x + 1, k, boards)
    _hline(img, x - 9, x + 9, top, edge)
    _box(img, x - 6, top - 9, x + 6, top - 1, body)
    _vline(img, x - 6, top - 9, top - 1, edge)
    for dx in (-3, 0, 3):
        _vline(img, x + dx, top - 9, top - 1, boards)
    _box(img, x - 8, top - 4, x + 8, top - 4, boards)  # the rail
    for r in range(8):  # a pointed roof
        _hline(img, x - 9 + r, x + 9 - r, top - 10 - r, body)
        put(img, x - 9 + r, top - 10 - r, edge)
        if r % 2 == 0:
            put(img, x - 4 + r // 2, top - 10 - r, g.thatch[1])
    _vline(img, x, top - 24, top - 18, body)
    lights: list[int] = []
    if g.torment:
        _line(img, x, top - 24, x + 5, top - 21, body)
    else:
        _hline(img, x + 1, x + 5, top - 24, g.lantern)
        _hline(img, x + 1, x + 4, top - 23, g.lantern)
        _hline(img, x + 1, x + 2, top - 22, g.lantern)
        # The beacon: the brightest light in the village.
        _box(img, x - 2, top - 7, x + 2, top - 5, g.lamp[1])
        _box(img, x - 1, top - 7, x + 1, top - 6, g.lamp[0])
        for dx in (-5, -4, 4, 5):
            put(img, x + dx, top - 6, g.lamp[2])
        lights.append(x)
    return lights


def _boat(img: Image.Image, g: Grade, x: int, y: int, length: int, lantern: bool, sunk: bool = False) -> int | None:
    """A flat-bottomed boat riding low, a pole lantern at its bow."""
    shade, body, boards, edge = g.hut
    for r in range(4):
        x0, x1 = x - length // 2 + r, x + length // 2 - r * 2
        if sunk:
            x0, x1 = x0 + r * 2, x1 - r
        _hline(img, x0, x1, y + r, body if r else edge)
    _hline(img, x - length // 2 + 2, x + length // 2 - 3, y + 1, boards)
    put(img, x + length // 2, y - 1, body)
    put(img, x + length // 2 + 1, y - 2, edge)
    if sunk:
        return None
    _vline(img, x + length // 2 - 2, y - 8, y - 1, body)
    if lantern:
        _lamp(img, x + length // 2 - 2, y - 9, g)
        return x + length // 2 - 2
    return None


def huts(g: Grade, rng: random.Random) -> Image.Image:
    """The village: houses, the shrine and the watchtower on stilts, joined by walkways hung with lamps; nets
    drying, boats tied up, and all of it lying mirrored in the water."""
    img = blank(W, H)
    shade, body, boards, edge = g.hut
    lights: list[int] = []
    ghosts: list[tuple[int, int]] = [(366, 60), (300, 73), (438, 71), (62, 76)] if g.torment else []
    # (x, half-width, wall height, roof rise): no two houses alike.
    houses = [(58, 15, 15, 18), (176, 11, 12, 14), (304, 0, 0, 0), (428, 17, 17, 22), (538, 12, 13, 15)]
    for i, (x, half, wall, rise) in enumerate(houses):
        wrecked = g.torment and i in (0, 3)
        if half == 0:
            lights += _shrine(img, g, rng, x)
        else:
            lights += _house(img, g, rng, x, half, wall, rise, wrecked, tall_door=i % 2 == 0)
    lights += _tower(img, g, rng, 366)
    # A granary: a round bin under a cone of thatch, between the first two houses.
    gx = 118
    _stilts(img, g, [gx - 5, gx + 4], DECK)
    _hline(img, gx - 8, gx + 8, DECK, edge)
    for dx in range(-6, 7):
        _vline(img, gx + dx, DECK - 9, DECK - 1, boards if dx % 2 else body)
    _vline(img, gx - 6, DECK - 9, DECK - 1, edge)
    _hline(img, gx - 6, gx + 6, DECK - 5, shade)
    _thatch(img, g, rng, gx, DECK - 10, 9, 10, ridge=1, wrecked=g.torment)
    # Walkways between them: planks on posts, a rope rail, a lamp on every other post.
    spans = [(80, 106), (130, 160), (192, 270), (330, 356), (376, 404), (452, 520), (556, 640)]
    for n, (x0, x1) in enumerate(spans):
        if g.torment and n % 2 == 1:
            x1 = x0 + (x1 - x0) // 2  # the bridge has fallen in
            _line(img, x1, DECK, x1 + 7, DECK + 10, body)
        for bx in range(x0, x1):
            put(img, bx, DECK, edge if (bx + n) % 5 else boards)
            put(img, bx, DECK + 1, body)
            sag = int(round(1.5 * math.sin(math.pi * ((bx - x0) % 22) / 22)))
            put(img, bx, DECK - 6 + sag, boards)
            if (bx - x0) % 22 == 0:
                _vline(img, bx, DECK - 8, 122, body)
                _vline(img, bx + 1, DECK + 2, 122, shade)
                if ((bx - x0) // 22) % 2 == 1:
                    if not g.torment:
                        _lamp(img, bx, DECK - 10, g)
                        lights.append(bx)
                    elif bx % 3:
                        ghosts.append((bx, DECK - 12))
    # Nets hung out to dry between two poles, weights along the foot.
    for nx in (214, 562):
        _vline(img, nx, DECK - 19, DECK - 1, body)
        _vline(img, nx + 30, DECK - 17, DECK - 1, body)
        for k in range(31):
            sag = int(round(3.0 * math.sin(math.pi * k / 30)))
            put(img, nx + k, DECK - 18 + sag, boards)
            depth = 9 - (4 if g.torment and k > 14 else 0)
            for j in range(1, depth):
                if (k + j) % 4 == 0 or ((k - j) % 4 == 0 and j < 5):  # an open weave: it hangs behind the fighters
                    put(img, nx + k, DECK - 18 + sag + j, boards)
            if k % 5 == 2 and not g.torment:
                put(img, nx + k, DECK - 18 + sag + depth, edge)
    # Boats: two tied up under the houses with a lantern, one hauled half out.
    for bx, by, ln, lit_ in ((92, 113, 22, True), (246, 114, 26, False), (498, 113, 24, True)):
        lx = _boat(img, g, bx, by, ln, lit_ and not g.torment, sunk=g.torment and bx == 246)
        if lx is not None:
            lights.append(lx)
    line = DECK + 3
    if g.torment:
        # The water has risen over the walkways: the houses stand in it to their sills, the rope rails float.
        line = DECK - 4
        px = img.load()
        tones = [g.fog[0], g.water[0], g.water[0], g.water[1]]
        for y in range(line, 123):
            for x in range(W):
                px[x, y] = (*dither_pick(tones, (y - line) / (123 - line), x, y), 255)
        _glints(img, rng, line + 1, 121, 26, g.glint, longest=7)
        for gx_, gy_ in ghosts:
            _ghost(img, gx_, gy_, g)
    # Everything mirrored: dark forms as broken shadow, every light as a wavering column.
    lamp_tones = {g.lamp[0]: g.lamp[2], g.lamp[1]: g.lamp[2]}
    _mirror(img, line, 16, 2.0, body, lamp_tones, {body, shade, boards})
    if not g.torment:
        for lx in lights:
            _reflect(img, lx, DECK + 4, 11, g.lamp[2], rng, wide=2 if rng.random() < 0.4 else 1)
    # Behind the fighters: the village goes into haze from the eaves down, and fog lies on the water.
    _haze(img, g)
    _fog(img, rng, g)
    return img


def reeds(g: Grade, rng: random.Random) -> Image.Image:
    """The shallows this side of the village: reed beds, a mangrove on its roots, fish traps, mooring posts, a
    skiff with a lantern; fireflies over all of it."""
    img = blank(W, H)
    body, rim = g.reed
    shade = g.hut[0]
    # One big mangrove close by, and a dead snag: dark shapes with the moon on their left.
    _mangrove(img, 508, SHALLOWS + 1, 46, rng, (shade, body, rim), g.torment)
    snag = capsule(214, SHALLOWS, 210, SHALLOWS - 22, 1.6, 0.8) | capsule(211, SHALLOWS - 13, 219, SHALLOWS - 21, 0.6) | capsule(210, SHALLOWS - 19, 204, SHALLOWS - 26, 0.5)
    _paint(img, snag, body, rim, shade)
    for _ in range(12):
        x = rng.uniform(0, W)
        _reeds(img, x, SHALLOWS, rng, body, rim, g.head, rng.uniform(12, 24), g.torment, n=rng.randint(6, 10))
    for x in (130, 430):  # mooring posts with a turn of rope
        _paint(img, polygon([(x - 1.6, SHALLOWS + 1), (x + 1.6, SHALLOWS + 1), (x + 1.2, 99), (x - 1.2, 99)]), body, rim, shade)
        _hline(img, x - 2, x + 2, 103, rim)
        _hline(img, x - 2, x + 2, 105, rim)
    # Fish traps: wicker cones staked in the shallows.
    for x in (56, 338, 584):
        _vline(img, x - 5, SHALLOWS - 11, SHALLOWS, body)
        for k in range(9):
            hw = max(0, 4 - k // 2)
            _hline(img, x - hw + 4, x + hw + 4, SHALLOWS - 2 - k // 2 * 0 - k % 9, body if k % 2 else rim)
        _line(img, x - 5, SHALLOWS - 10, x + 4, SHALLOWS - 9, rim)
    # A skiff tied up, low in the water, its lantern lit; a pole laid across it.
    sx = 286
    _paint(img, polygon([(sx - 17, 109), (sx + 17, 109), (sx + 12, 114), (sx - 13, 114)]) | capsule(sx + 15, 109, sx + 20, 106, 0.6), body, rim, shade)
    _line(img, sx - 20, 107, sx + 6, 102, body)
    if not g.torment:
        _vline(img, sx + 13, 101, 108, body)
        _lamp(img, sx + 13, 100, g, low=True)
        _reflect(img, sx + 13, 115, 3, g.dimmed[2], rng)
    _glints(img, rng, 113, 118, 30, g.glint, longest=6)
    # A few fireflies high up, clear of the fighters (the ones that drift are the strip's: see ATMOSPHERE).
    for i in range(12):
        x, y = rng.randrange(W), rng.randrange(50, 84)
        put(img, x, y, g.motes[i % 2])
    # Behind the fighters the near trees and reeds lose their blacks too.
    _haze(img, g, soft=86, hard=94, dark_only=True)
    return img


def _pad(img: Image.Image, g: Grade, x: int, y: int, rw: int, bloom: bool) -> None:
    """A lily pad: a flat oval with a notch, the moon on its near edge; sometimes a flower."""
    for dx in range(-rw, rw + 1):
        put(img, x + dx, y, g.pad[1] if dx < 0 else g.pad[0])
        if abs(dx) < rw:
            put(img, x + dx, y + 1, g.pad[0])
            if rw > 3 and abs(dx) < rw - 1:
                put(img, x + dx, y - 1, g.pad[1] if dx < 1 else g.pad[0])
    put(img, x + rw - 1, y, g.near[1])
    put(img, x + rw, y, g.near[1])
    if bloom:
        put(img, x - 1, y - 1, g.bloom)
        put(img, x, y - 2, g.bloom)
        put(img, x + 1, y - 1, g.bloom)
        put(img, x, y - 1, g.lamp[1] if not g.torment else g.bloom)


def ground(g: Grade, rng: random.Random) -> Image.Image:
    """The causeway: wet planks on piles, a rope rail on the far side with lamps and the village's clutter,
    and under it dark water full of small things."""
    img = blank(W, H)
    px = img.load()
    dark, plank, light = g.plank
    top, path_top, path_bot = 112, PATH_Y - 6, PATH_Y + 5
    for x in range(W):
        for y in range(top, path_top):  # water behind the causeway
            px[x, y] = (*dither_pick([g.water[2], g.near[0], g.near[1]], (y - top) / (path_top - top), x, y), 255)
        for y in range(path_top, path_bot + 1):  # the planks
            t = (y - path_top) / (path_bot - path_top)
            px[x, y] = (*dither_pick([light, plank, plank, dark], t, x, y), 255)
        for y in range(path_bot + 1, H):  # water in front
            px[x, y] = (*dither_pick(g.near, (y - path_bot) / (H - path_bot), x, y), 255)
    _glints(img, rng, top + 1, path_top - 1, 22, g.glint, longest=6)
    # Plank seams, a knot here and there, a newer board now and then, the wet sheen of rain on the wood.
    x = 0
    while x < W:
        for y in range(path_top + 1, path_bot):
            put(img, x, y, dark)
        if rng.random() < 0.35:
            put(img, x + 3, rng.randrange(path_top + 3, path_bot - 2), dark)
        step = rng.randint(7, 12)
        if rng.random() < 0.12:
            for xx in range(x + 1, x + step):
                put(img, xx, path_top + 1, light)
        put(img, x + 1, path_top + 2, dark)  # nail heads
        put(img, x + 1, path_bot - 2, dark)
        x += step
    for _ in range(60):
        xx, yy = rng.randrange(W), rng.randrange(path_top + 1, path_top + 4)
        put(img, xx, yy, light)
        put(img, xx + 1, yy, light)
    for x in range(W):  # the two edge beams
        put(img, x, path_top, light if rng.random() < 0.8 else plank)
        put(img, x, path_bot, dark)
        put(img, x, path_bot + 1, g.near[2])
        put(img, x, path_bot + 2, g.near[2] if (x // 3) % 2 else g.near[1])  # the walkway's shadow on the water
    # Piles under the near edge, braced, mossy at the water line, with their broken reflections.
    piles = [i + 30 for i in range(0, W, 46)]
    for n, fx in enumerate(piles):
        for y in range(path_bot + 1, path_bot + 10):
            put(img, fx, y, g.pile[0])
            put(img, fx + 1, y, g.pile[0])
            put(img, fx + 2, y, g.pile[1] if y < path_bot + 5 else g.pile[0])
        _hline(img, fx - 1, fx + 3, path_bot + 9, g.pad[0])
        put(img, fx - 1, path_bot + 8, g.pad[1])
        if n % 2 == 0:
            _line(img, fx + 3, path_bot + 2, fx + 20, path_bot + 8, g.pile[0])
        _reflect(img, fx + 1, path_bot + 11, 9, g.pile[0], rng, wide=2)
        for dx in (-3, -2, 4, 5):  # the ring of ripples a pile stands in
            put(img, fx + dx, path_bot + 10, g.ripple)
    # Posts and a rope rail along the far edge; every third post carries a lamp.
    posts = list(range(14, W, 46))
    for n, fx in enumerate(posts):
        lean = (rng.random() - 0.5) * (4 if g.torment else 1)
        if g.torment and n % 3 == 1:
            continue
        post = polygon([(fx - 1.5, path_top + 1), (fx + 1.5, path_top + 1), (fx + 1.5 + lean, path_top - 13), (fx - 1.5 + lean, path_top - 13)])
        _paint(img, post, g.pile[0], g.pile[1])
        if n % 3 == 0 and not g.torment:
            _lamp(img, fx, path_top - 15, g, low=True)
            put(img, fx, path_top - 13, g.pile[0])
            _reflect(img, fx, path_bot + 3, 14, g.lamp[2], rng, wide=2)
            for dx in (-4, -3, -2, 2, 3, 4):  # the lamp's pool of light on the planks
                put(img, fx + dx, path_top + 2, light)
                if abs(dx) < 4:
                    put(img, fx + dx, path_top + 1, g.warm[1])
    for x in range(W):
        if g.torment and (x // 46) % 3 in (0, 1) and (x % 46) > 20:
            continue
        sag = int(round(2.0 * math.sin(math.pi * ((x - 14) % 46) / 46)))
        put(img, x, path_top - 9 + sag, g.pile[0])  # one dark line: it crosses the fighters' waists
    # Clutter on the far edge of the walkway, low enough to stay behind the fighters' shins.
    for fx, kind in ((48, "crate"), (166, "basket"), (236, "rope"), (388, "barrel"), (470, "basket"), (566, "crate")):
        y = path_top
        if kind == "crate":
            _box(img, fx, y - 5, fx + 6, y, g.pile[0])
            _hline(img, fx, fx + 6, y - 5, g.pile[1])
            _vline(img, fx, y - 5, y, g.pile[1])
            _line(img, fx + 1, y - 4, fx + 5, y - 1, plank)
        elif kind == "barrel":
            _box(img, fx, y - 6, fx + 4, y, plank)
            _vline(img, fx, y - 6, y, light)
            _hline(img, fx, fx + 4, y - 5, g.pile[0])
            _hline(img, fx, fx + 4, y - 1, g.pile[0])
            _hline(img, fx + 1, fx + 3, y - 7, g.pile[1])
        elif kind == "basket":
            for r in range(4):
                _hline(img, fx + r // 2, fx + 6 - r // 2, y - r, plank if r % 2 else g.pile[1])
            put(img, fx + 2, y - 4, g.glint)  # a fish
            put(img, fx + 3, y - 5, g.glint)
            put(img, fx + 4, y - 4, g.glint)
        else:
            for r, (a, b) in enumerate(((0, 6), (1, 5), (2, 4))):
                _hline(img, fx + a, fx + b, y - r, g.pile[1] if r != 1 else g.pile[0])
    # Front water. First the long ripples, then rings where the rain lands.
    _glints(img, rng, path_bot + 4, H - 4, 54, g.ripple, longest=9)
    for _ in range(20):
        x, y = rng.randrange(W), rng.randrange(path_bot + 5, H - 6)
        big = rng.random() < 0.4
        ring = g.glint
        for dx in range(-3 if big else -2, 4 if big else 3):
            edge_ = abs(dx) >= (3 if big else 2)
            put(img, x + dx, y - (0 if edge_ else 1), ring)
            if not edge_ and big:
                put(img, x + dx, y + 1, g.ripple)
        put(img, x - 1, y + 1, ring)
        put(img, x + 1, y + 1, ring)
        if big:
            put(img, x, y - 3, ring)  # the splash
    # A boat that went down at its mooring: the bow and three ribs still out of the water.
    wx, wy = 418, path_bot + 16
    wd, wb, wl = g.wreck
    hull = polygon([(wx - 22, wy + 3), (wx + 6, wy + 3), (wx + 19, wy - 9), (wx + 15, wy - 10), (wx + 2, wy - 1), (wx - 20, wy)])
    _paint(img, hull, wb, wl, wd)
    for k, rx in enumerate((-15, -9, -3)):
        _line(img, wx + rx, wy, wx + rx + 2, wy - 5 - k, wb)
        put(img, wx + rx + 2, wy - 6 - k, wl)
    _line(img, wx + 4, wy - 2, wx + 16, wy - 9, wd)
    for dx in range(-26, 12):  # where the water closes over it
        if dx % 3:
            put(img, wx + dx, wy + 4, g.ripple)
    for dx in range(-20, 6, 2):
        put(img, wx + dx, wy + 6, wd)
    # A mooring post leaning out of the water with a frayed rope, and a floating plank.
    for mx in (150, 560):
        _line(img, mx, path_bot + 22, mx + 3, path_bot + 9, g.pile[0])
        _line(img, mx + 1, path_bot + 22, mx + 4, path_bot + 9, g.pile[1])
        _line(img, mx + 4, path_bot + 11, mx + 10, path_bot + 15, plank)
        for dx in (-2, -1, 3, 4):
            put(img, mx + dx, path_bot + 23, g.ripple)
    _hline(img, 244, 256, path_bot + 20, plank)
    _hline(img, 245, 257, path_bot + 21, dark)
    # Lily pads: rafts of them, with a few flowers.
    for _ in range(9):
        cx, cy = rng.randrange(W), rng.randrange(path_bot + 9, H - 5)
        for _ in range(rng.randint(2, 5)):
            _pad(img, g, cx + rng.randint(-12, 12), cy + rng.randint(-3, 3), rng.randint(2, 5), rng.random() < 0.3)
    # Lights set adrift on the water: small rafts with a flame, each over its own reflection.
    if not g.torment:
        for fx, fy in ((84, path_bot + 13), (212, path_bot + 23), (322, path_bot + 11), (486, path_bot + 21), (538, path_bot + 9)):
            _hline(img, fx - 2, fx + 2, fy, dark)
            put(img, fx, fy - 1, g.lamp[1])
            put(img, fx, fy - 2, g.lamp[0])
            put(img, fx - 1, fy - 1, g.lantern)
            put(img, fx + 1, fy - 1, g.lantern)
            _reflect(img, fx, fy + 1, 6, g.lamp[2], rng)
    # Reeds standing in the near water, taller towards the bottom edge.
    for _ in range(11):
        x = rng.randrange(W)
        y = rng.randrange(path_bot + 12, H - 4)
        _reeds(img, x, y, rng, g.reed[0], g.reed[1], g.head, 6 + (y - path_bot) * 0.3, g.torment, n=5)
    if g.torment:
        for _ in range(7):
            _crystal(img, rng.uniform(0, W), rng.choice([path_top - 1, rng.randrange(path_bot + 9, H - 4)]), rng)
    return img


def foreground(g: Grade, rng: random.Random) -> Image.Image:
    """What slides past in front of everything, near-silhouettes: cattails and lotus leaves along the bottom,
    a mangrove bough trailing moss into the top of the frame."""
    img = blank(W, H)
    body, rim = g.fore
    for _ in range(9):
        x = rng.uniform(0, W)
        base = H + 2
        shape = ellipse(x, base, rng.uniform(6, 11), rng.uniform(3, 5))
        for k in range(rng.randint(5, 8)):
            bx = x + rng.uniform(-9, 9)
            ang = math.radians(-90 + rng.uniform(-22, 22))
            L = rng.uniform(12, 24)
            tx, ty = bx + math.cos(ang) * L, base - 2 + math.sin(ang) * L
            shape = shape | polygon([(bx - 1.4, base - 2), (bx + 1.4, base - 2), (tx, ty)])
            if not g.torment and rng.random() < 0.5:
                shape = shape | capsule(tx, ty + 2, tx - math.cos(ang) * 5, ty + 2 - math.sin(ang) * 5, 1.6) | capsule(tx, ty, tx + math.cos(ang) * 3, ty + math.sin(ang) * 3, 0.4)
        _paint(img, shape, body, rim)
    if not g.torment:
        # Lotus leaves riding at the very bottom, tilted, one edge catching the moon.
        for _ in range(7):
            x = rng.uniform(0, W)
            _paint(img, ellipse(x, H - 3 + rng.uniform(-1, 2), rng.uniform(8, 14), rng.uniform(2.2, 3.4)), body, rim)
    # Boughs reaching in from above, hung with moss (bare in Torment).
    for bx in (96, 318, 520):
        length = rng.uniform(70, 110)
        shape = capsule(bx - length / 2, -3, bx, 5, 2.4, 1.6) | capsule(bx, 5, bx + length / 2, -2, 1.6, 0.8)
        if not g.torment:
            for _ in range(5):
                shape = shape | ellipse(bx + rng.uniform(-length / 2, length / 2) * 0.8, 1, rng.uniform(6, 11), rng.uniform(2, 3.4))
        pts = _paint(img, shape, body, rim)
        for _ in range(int(length / 4)):  # moss: single strands, pale against the cloud, darker at the tip
            sx = int(bx + rng.uniform(-length / 2, length / 2) * 0.92)
            if g.torment and rng.random() < 0.6:
                continue
            y0 = 0
            while (sx, y0) in pts or (sx, y0 + 1) in pts:
                y0 += 1
            hang = int(rng.uniform(4, 16) * (0.5 if g.torment else 1.0))
            for k in range(hang):
                put(img, sx + (1 if k > hang * 0.6 and (sx % 2) else 0), y0 + k, rim if k < hang - 2 else body)
    return img


LAYERS = (
    ("sky", sky, 0.0),
    ("far", far_shore, 0.1),
    ("mist", mist, 0.2),
    ("huts", huts, 0.4),
    ("reeds", reeds, 0.65),
    ("ground", ground, 1.0),
    ("fore", foreground, 1.35),
)


def build(grade: str, seed: int = 303) -> dict[str, Image.Image]:
    g = GRADES[grade]
    out: dict[str, Image.Image] = {}
    for i, (name, fn, _speed) in enumerate(LAYERS):
        out[name] = fn(g, random.Random(seed * 100 + i))
    return out
