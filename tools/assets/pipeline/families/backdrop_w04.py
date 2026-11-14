"""World 4 backdrop — the red rock canyons under a low sun, the air thick with heat and dust — in every
difficulty grade.

Layers (back to front): sky (a white-hot sun low in a yellow haze, thin high cloud lit from below, carrion birds
circling), far mesas in two planes almost lost in the haze, nearer buttes and needles, drifting dust and dust
devils ("mist"), the canyon wall (great stepped blocks of banded rock with talus at their feet, a cliff dwelling
in an alcove, a watch-post with pennants, a rock arch, hoodoos, a rope bridge slung across the gap in front of the
sun, and a caravan camp with its fire), ground (the bank with cactus, cairns and bones, the dusty rutted trail the
party walks, and below it a lower terrace of cracked earth with the ribs of something huge) and foreground
(boulders, thorn bush, a dead snag). One light, low on the right: rock is lit on top and on its right faces and in
shadow on its left. Depth is by value: the further a rock, the paler. Dust lies in the canyon: from the fighters'
shoulders down the walls sink into it and flatten to one mid value, so whoever stands on the trail reads against
them. The Torment grade is a sulphur storm: a sick yellow-brown sky choked with dust round a black sun, the rock
scorched to dark umber with sulphur-yellow edges and drowning in yellow dust below, stones hanging in the air, the
bridge cut and the camp abandoned; only the Rift and its crystals are violet. `ATMOSPHERE` gives each grade its
weather for the strip: heat motes and blown grit, or the storm itself with dry lightning.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass

from PIL import Image

from ..backdrop import blank, dither_pick, fill_below, periodic, put, vertical_gradient
from ..palette import Color, color, hex_of
from ..raster import capsule, circle, ellipse, polygon, rasterize
from .backdrop_w01 import H, PATH_Y, W, _crystal, _rift, _shift, _silhouette

__all__ = ["W", "H", "PATH_Y", "LAYERS", "GRADES", "PREVIEW_BG", "ATMOSPHERE", "build"]

#: The tone creature previews of this world are shown on.
PREVIEW_BG: Color = color("crimson", 4)

Rock = tuple[Color, Color, Color, Color, Color]  # body, rim (lit), band (dark bed), shade, pale bed


@dataclass(frozen=True)
class Grade:
    key: str
    sky: list[Color]
    sky_end: int
    sun: tuple[Color, Color, Color]  # halo, ring, core
    cloud: tuple[Color, Color, Color]  # high body, low body, lit underside
    bird: Color
    haze: tuple[Color, Color]  # farthest plane: body, rim
    far: Rock
    mid: Rock
    wall: Rock
    hollow: Color  # the dark of caves, alcoves and doorways
    mist: tuple[Color, Color]  # body, lit top
    adobe: tuple[Color, Color, Color]  # shade, body, lit
    cloth: tuple[Color, Color, Color, Color]  # tent shade, tent body, tent lit, stripe / pennant
    wood: tuple[Color, Color]  # dark, lit
    fire: tuple[Color, Color, Color]  # core, glow, spark
    earth: tuple[Color, Color, Color, Color]  # deep, body, light, lit crust
    path: tuple[Color, Color, Color]  # dark, body, light
    scrub: tuple[Color, Color, Color]  # dark, body, tip
    cactus: tuple[Color, Color, Color]  # shade, body, lit
    flower: Color
    bone: tuple[Color, Color]  # shade, lit
    fore: tuple[Color, Color, Color]  # body, plane, rim
    torment: bool = False


def _c(r: str, i: int) -> Color:
    return color(r, i)


NORMAL = Grade(
    key="normal",
    sky=[_c("crimson", 5), _c("crimson", 6), _c("dusk", 7), _c("dusk", 8), _c("brass", 6), _c("brass", 7)],
    sky_end=108,
    sun=(_c("brass", 6), _c("brass", 7), _c("light", 0)),
    cloud=(_c("dusk", 5), _c("dusk", 6), _c("brass", 6)),
    bird=_c("crimson", 1),
    haze=(_c("dusk", 9), _c("brass", 7)),
    far=(_c("dusk", 8), _c("dusk", 9), _c("dusk", 7), _c("dusk", 7), _c("dusk", 9)),
    mid=(_c("dusk", 7), _c("dusk", 8), _c("dusk", 6), _c("dusk", 5), _c("dusk", 8)),
    wall=(_c("crimson", 4), _c("crimson", 6), _c("crimson", 3), _c("crimson", 2), _c("dusk", 6)),
    hollow=_c("crimson", 1),
    mist=(_c("dusk", 9), _c("brass", 7)),
    adobe=(_c("bone", 2), _c("bone", 3), _c("bone", 5)),
    cloth=(_c("dusk", 4), _c("dusk", 6), _c("dusk", 7), _c("azure", 3)),
    wood=(_c("leather", 1), _c("leather", 5)),
    fire=(_c("brass", 7), _c("brass", 5), _c("brass", 4)),
    earth=(_c("crimson", 2), _c("crimson", 3), _c("dusk", 5), _c("crimson", 4)),
    path=(_c("leather", 3), _c("leather", 4), _c("leather", 5)),
    scrub=(_c("brass", 2), _c("brass", 3), _c("brass", 4)),
    cactus=(_c("moss", 1), _c("moss", 2), _c("moss", 4)),
    flower=_c("brass", 6),
    bone=(_c("bone", 4), _c("bone", 7)),
    fore=(_c("crimson", 0), _c("crimson", 1), _c("crimson", 2)),
)

TORMENT = Grade(
    key="torment",
    sky=[_c("ink", 0), _c("leather", 0), _c("leather", 1), _c("brass", 1), _c("brass", 2), _c("brass", 3), _c("brass", 4)],
    sky_end=108,
    sun=(_c("brass", 5), _c("brass", 7), _c("ink", 0)),
    cloud=(_c("ink", 1), _c("leather", 1), _c("brass", 3)),
    bird=_c("ink", 0),
    haze=(_c("brass", 3), _c("brass", 4)),
    far=(_c("brass", 2), _c("brass", 3), _c("leather", 3), _c("leather", 3), _c("brass", 3)),
    mid=(_c("leather", 3), _c("leather", 5), _c("leather", 2), _c("leather", 1), _c("leather", 4)),
    wall=(_c("leather", 1), _c("brass", 5), _c("leather", 0), _c("ink", 0), _c("leather", 2)),
    hollow=_c("ink", 0),
    mist=(_c("leather", 4), _c("brass", 4)),
    adobe=(_c("leather", 0), _c("leather", 1), _c("leather", 3)),
    cloth=(_c("leather", 0), _c("leather", 2), _c("leather", 3), _c("brass", 2)),
    wood=(_c("ink", 0), _c("leather", 3)),
    fire=(_c("bone", 4), _c("bone", 3), _c("bone", 2)),
    earth=(_c("leather", 0), _c("leather", 1), _c("leather", 3), _c("leather", 2)),
    path=(_c("leather", 2), _c("leather", 3), _c("leather", 4)),
    scrub=(_c("leather", 0), _c("leather", 2), _c("brass", 3)),
    cactus=(_c("ink", 1), _c("leather", 1), _c("leather", 3)),
    flower=_c("brass", 4),
    bone=(_c("bone", 2), _c("bone", 5)),
    fore=(_c("ink", 0), _c("leather", 0), _c("brass", 2)),
    torment=True,
)

GRADES = {"normal": NORMAL, "torment": TORMENT}


def _veil_steps(g: Grade, steps: list[tuple[int, Rock, Color]]) -> list[tuple[int, dict[Color, Color]]]:
    """From row `y` down, the wall's five tones and its hollows are seen through dust: mapped to these."""
    return [(y, {**dict(zip(g.wall, tones)), g.hollow: hollow}) for y, tones, hollow in steps]


#: The dust lying in the canyon, per grade: where it starts to take the walls and what it leaves of them. The
#: second step is the band the fighters stand in front of — one flat mid value, the strata barely showing.
VEIL = {
    "normal": _veil_steps(NORMAL, [
        (72, (_c("crimson", 4), _c("dusk", 6), _c("crimson", 3), _c("crimson", 3), _c("dusk", 5)), _c("crimson", 2)),
        (82, (_c("crimson", 4), _c("dusk", 6), _c("crimson", 4), _c("crimson", 3), _c("dusk", 5)), _c("crimson", 3)),
        (91, (_c("dusk", 5), _c("dusk", 6), _c("crimson", 4), _c("crimson", 4), _c("dusk", 5)), _c("crimson", 4)),
    ]),
    "torment": _veil_steps(TORMENT, [
        (68, (_c("leather", 2), _c("brass", 4), _c("leather", 1), _c("leather", 1), _c("leather", 3)), _c("leather", 0)),
        (78, (_c("leather", 3), _c("brass", 4), _c("leather", 2), _c("leather", 2), _c("leather", 4)), _c("leather", 1)),
        (87, (_c("leather", 4), _c("brass", 3), _c("leather", 3), _c("leather", 3), _c("leather", 4)), _c("leather", 2)),
        (95, (_c("brass", 3), _c("brass", 4), _c("leather", 4), _c("leather", 4), _c("brass", 3)), _c("leather", 3)),
    ]),
}

#: The wall's tones as they are in the fighters' band, for stones that lie there.
VEIL_ROCK: dict[str, Rock] = {key: tuple(steps[-1][1][c] for c in GRADES[key].wall) for key, steps in VEIL.items()}  # type: ignore[misc]

#: Weather for the strip. Normal: motes rising on the heat and a little grit on the wind. Torment: the storm —
#: dust driven hard against the party, behind and in front of it, dry lightning, and the light failing in gusts.
ATMOSPHERE = {
    "normal": [
        {"fx": "particles", "count": 22, "color": hex_of(_c("brass", 7)), "vx": 7, "vy": -9, "sway": 3, "alpha": 0.4, "front": False},
        {"fx": "particles", "count": 16, "color": hex_of(_c("dusk", 8)), "vx": -64, "vy": 5, "len": 3, "alpha": 0.3, "ymax": 126},
    ],
    "torment": [
        {"fx": "particles", "count": 64, "color": [hex_of(_c("brass", 3)), hex_of(_c("leather", 4))], "vx": -260, "vy": 20, "len": 6, "alpha": 0.5,
         "ymax": 126, "front": False},
        {"fx": "particles", "count": 24, "color": [hex_of(_c("brass", 4)), hex_of(_c("brass", 5))], "vx": -350, "vy": 26, "len": 9, "alpha": 0.4, "ymax": 132},
        {"fx": "lightning", "every": [3200, 8500], "flash": hex_of(_c("brass", 6)), "alpha": 0.38, "bolt": hex_of(_c("brass", 7)),
         "x": [30, 570], "y": [0, 88], "shake": 1},
        {"fx": "flicker", "every": [5000, 11000], "dur": 420, "color": hex_of(_c("leather", 0)), "alpha": 0.28},
    ],
}


# ------------------------------------------------------------------------------------- helpers
def _pts(img: Image.Image, shape) -> set[tuple[int, int]]:
    pts = rasterize(_shift(shape, img.width), img.width * 3, H)
    return {(x - img.width, y) for (x, y) in pts}


def _rock(img: Image.Image, shape, tones: Rock, period: int = 7, phase: int = 0, shadow: int = 3, beds: bool = True) -> None:
    """Layered rock under a low sun on the right: lit along its tops and right faces with a half-light just
    inside them, a band of shadow down its left faces, and strata through the body — thin dark beds, pale beds
    under them, a thicker dark bed every third course, and short joints that break the courses into blocks."""
    body, rim, band, shade, pale = tones
    pts = _pts(img, shape)
    for (x, y) in pts:
        if (x, y - 1) not in pts or (x + 1, y) not in pts:
            c = rim
        elif (x - 1, y) not in pts or (x - 2, y) not in pts:
            c = shade
        else:
            d = 3
            while d <= shadow + 2 and (x - d, y) in pts:
                d += 1
            r, course = (y + phase) % period, (y + phase) // period
            if d <= shadow + 2:
                c = band
            elif (x, y - 2) not in pts or (x + 2, y) not in pts:
                c = pale
            elif not beds:
                c = body
            elif r == 0 and ((x // 7) + course) % 5 != 0:
                c = band
            elif r == 1 and ((x // 11) + course) % 4 != 0:
                c = pale
            elif course % 3 == 1 and r == period // 2 + 1 and ((x // 17) + course) % 6 != 0:
                c = band
            elif r >= 2 and (x + course * 5) % 13 == 0 and ((x // 13) + course) % 3 == 0:
                c = shade
            else:
                c = body
        put(img, x, y, c)


def _veil(img: Image.Image, steps: list[tuple[int, dict[Color, Color]]]) -> None:
    """Sinks the lower part of a layer into the canyon's dust: from each step's row down its tones are swapped
    for the step's. The edge of each step is not ruled: it rides up and down a pixel or two along the layer,
    like the top of a haze."""
    px = img.load()
    w = img.width
    luts = [{(*a, 255): (*b, 255) for a, b in table.items()} for _y0, table in steps]
    for x in range(w):
        edges = [y0 + int(round(1.5 * math.sin(math.tau * 5 * x / w + n) + 0.9 * math.sin(math.tau * 13 * x / w + 2.0 * n))) for n, (y0, _t) in enumerate(steps)]
        for y in range(max(0, edges[0]), img.height):
            # Always from the layer's own tone, by the deepest step this row has reached.
            lut = luts[max(n for n, e in enumerate(edges) if y >= e)]
            c = px[x, y]
            if c in lut:
                px[x, y] = lut[c]


def _talus(img: Image.Image, x: float, base: float, w: float, h: float, tones: Rock, rng: random.Random) -> None:
    """A fan of fallen rock leaning against the foot of a wall: speckled, lit along its upper edge."""
    body, rim, band, shade, pale = tones
    lean = rng.uniform(-0.15, 0.15) * w
    pts = _pts(img, polygon([(x - w / 2, base), (x - w * 0.12 + lean, base - h), (x + w * 0.1 + lean, base - h * 0.92), (x + w / 2, base)]))
    for (a, b) in pts:
        if (a, b - 1) not in pts:
            c = rim
        elif (a - 1, b) not in pts or a < x - w * 0.18 + lean:
            c = band  # the side away from the sun
        elif (a * 7 + b * 13) % 29 == 0:
            c = rim  # a stone catching the light
        elif (a * 5 + b * 11) % 31 == 0:
            c = shade
        elif (b + a // 3) % 4 == 0 and (a // 5 + b) % 3 == 0:
            c = pale  # the slope's bedding, faint
        else:
            c = body
        put(img, a, b, c)


def _mesa(x: float, base: float, w: float, h: float):
    """A flat-topped butte: sheer walls on a skirt of fallen rock."""
    return polygon([(x - w / 2 - h * 0.34, base), (x - w / 2 - 1, base - h * 0.5), (x - w / 2 + 1.5, base - h), (x + w / 2 - 1.5, base - h),
                    (x + w / 2 + 1, base - h * 0.5), (x + w / 2 + h * 0.34, base)])


def _needle(x: float, base: float, w: float, h: float):
    return polygon([(x - w, base), (x - w * 0.55, base - h * 0.55), (x - w * 0.3, base - h), (x + w * 0.3, base - h), (x + w * 0.6, base - h * 0.5), (x + w, base)])


def _cliff(x: float, base: float, w: float, h: float, rng: random.Random):
    """A great block of canyon wall: sheer faces that step back in ledges on both sides."""
    left, right = [(x - w / 2, base)], [(x + w / 2, base)]
    for side, sgn in ((left, 1), (right, -1)):
        px_, py_ = side[0]
        for frac in sorted(rng.uniform(0.3, 0.9) for _ in range(rng.randint(2, 3))) + [1.0]:
            px_ += sgn * rng.uniform(1.5, 4.0)
            side.append((px_, base - h * frac))  # up a face
            if frac < 1.0:
                px_ += sgn * rng.uniform(6.0, 16.0)
                side.append((px_, base - h * frac))  # back along a ledge
    return polygon(left + right[::-1])


def _boulder(img: Image.Image, x: float, base: float, rw: float, rh: float, tones: Rock) -> None:
    """A boulder with a lit top, a shadowed left and a crack."""
    body, rim, band, shade, pale = tones
    pts = _pts(img, polygon([(x - rw, base), (x - rw * 0.8, base - rh * 0.6), (x - rw * 0.2, base - rh), (x + rw * 0.5, base - rh * 0.85), (x + rw, base - rh * 0.3), (x + rw * 1.05, base)]))
    for (a, b) in pts:
        if (a, b - 1) not in pts or (a + 1, b) not in pts:
            c = rim
        elif (a - 1, b) not in pts or (a - 2, b) not in pts:
            c = shade
        elif a - x < -rw * 0.25:
            c = band
        elif (a, b - 2) not in pts:
            c = pale
        else:
            c = body
        put(img, a, b, c)
    for k in range(int(rh * 0.6)):
        put(img, int(x + rw * 0.15) + (k // 2) % 2, int(base - rh * 0.75) + k, shade)


def _sun(img: Image.Image, g: Grade, sx: int, sy: int) -> None:
    px = img.load()
    halo, ring, core = g.sun
    for r, c in ((27, halo), (22, ring), (17, core)):
        for (x, y) in rasterize(circle(sx, sy, r), W, H):
            if y < g.sky_end:
                px[x, y] = (*c, 255)
    if not g.torment:
        # Heat haze: bands of sky cut across the lower half of the disc.
        for y, gap in ((sy + 6, 3), (sy + 10, 2), (sy + 13, 2)):
            for x in range(sx - 30, sx + 31):
                if (x // gap) % 3 != 0:
                    px[x, y] = (*g.sky[-2], 255)


def _bird(img: Image.Image, x: int, y: int, c: Color, span: int, up: bool) -> None:
    """A soaring bird seen far off: two wings from a body, raised or flat."""
    put(img, x, y, c)
    for k in range(1, span + 1):
        dy = -((k + 1) // 2) if up else k // 2
        put(img, x - k, y + dy, c)
        put(img, x + k, y + dy, c)


# ------------------------------------------------------------------------------------- layers
def sky(g: Grade, rng: random.Random) -> Image.Image:
    img = blank(W, H)
    vertical_gradient(img, g.sky, 0, g.sky_end, curve=0.75)
    px = img.load()
    for y in range(g.sky_end, H):
        for x in range(W):
            px[x, y] = (*g.sky[-1], 255)
    if g.torment:
        for _ in range(26):  # a few stars through the dust, high up
            x, y = rng.randrange(W), rng.randrange(0, 30)
            px[x, y] = (*(_c("bone", 5) if rng.random() < 0.6 else _c("brass", 5)), 255)
    _sun(img, g, 404, 60)
    # High cloud drawn thin by the wind: dark on top, lit from below by the sun. Longer and denser high up.
    high, low, lit = g.cloud
    for i in range(11):
        cy = rng.uniform(5, 50)
        cx, length = rng.uniform(0, W), rng.uniform(60, 150) * (1.2 - cy / 70)
        shape = ellipse(cx, cy, length / 2, rng.uniform(1.0, 2.2))
        for _ in range(4):
            shape = shape | ellipse(cx + rng.uniform(-length / 2, length / 2), cy + rng.uniform(-1.6, 1.6), rng.uniform(8, length / 2.8), rng.uniform(0.8, 2.4))
        body = high if cy < 26 else low
        for dx in (-W, 0, W):
            pts = rasterize(_shift(shape, dx), W, H)
            for (x, y) in pts:
                under = (x, y + 1) not in pts
                px[x, y] = (*(lit if under else body), 255)
            # Wisps trailing off the windward end.
            for (x, y) in pts:
                if (x - 1, y) not in pts and (x + y) % 3 == 0:
                    for k in range(1, 5):
                        if 0 <= x - k * 2 < W:
                            px[x - k * 2, y] = (*body, 255)
    if g.torment:
        _rift(img, rng)
        return img
    # Carrion birds wheeling on the thermals: one loose ring high up, stragglers elsewhere.
    for i in range(7):
        a = math.tau * i / 7 + rng.uniform(-0.3, 0.3)
        _bird(img, int(236 + math.cos(a) * rng.uniform(16, 26)), int(26 + math.sin(a) * rng.uniform(5, 9)), g.bird, rng.choice((2, 3, 3)), i % 2 == 0)
    for x, y in ((92, 44), (104, 50), (512, 30), (548, 40), (30, 22)):
        _bird(img, x, y, g.bird, 2, (x // 4) % 2 == 0)
    # Heat shimmer: broken pale bands lying on the air above the horizon.
    for y, tone in ((86, g.sky[-1]), (91, g.sky[-1]), (95, g.sky[-2]), (99, g.sky[-1])):
        x = rng.randrange(20)
        while x < W:
            run = rng.randrange(8, 40)
            for k in range(run):
                if 0 <= x + k < W and px[x + k, y][:3] != g.sun[2]:
                    px[x + k, y] = (*tone, 255)
            x += run + rng.randrange(10, 60)
    return img


def far_mesas(g: Grade, rng: random.Random) -> Image.Image:
    """Two planes of table-land in the haze: the farthest only a breath darker than the sky."""
    img = blank(W, H)
    hb, hr = g.haze
    for i in range(7):
        x = i * W / 7 + rng.uniform(-28, 28)
        if i % 3 == 1:
            _silhouette(img, _needle(x, 100, rng.uniform(4, 7), rng.uniform(22, 32)) | _needle(x + rng.uniform(9, 14), 100, rng.uniform(3, 5), rng.uniform(14, 22)), hb, hr)
        else:
            _silhouette(img, _mesa(x, 100, rng.uniform(40, 90), rng.uniform(16, 30)), hb, hr)
    f0 = periodic(W, rng, [(1, 1.0), (4, 0.8)])
    fill_below(img, lambda x: 97 + f0(x), hb, hr, y_end=112)
    for i in range(6):
        x = i * W / 6 + rng.uniform(-30, 30) + 40
        w, h = rng.uniform(34, 80), rng.uniform(12, 22)
        _rock(img, _mesa(x, 102, w, h), g.far, period=5, phase=i, shadow=2)
        if i % 2 == 0:  # a second, lower bench stepping off one side
            _rock(img, _mesa(x + (w / 2 + 14) * rng.choice((-1, 1)), 102, rng.uniform(18, 30), h * 0.55), g.far, period=5, phase=i + 2, shadow=2)
        if i == 3:  # a natural bridge far off
            _rock(img, polygon([(x + w / 2 + 20, 102), (x + w / 2 + 22, 90), (x + w / 2 + 44, 89), (x + w / 2 + 47, 102)]) - ellipse(x + w / 2 + 33, 102, 8, 9), g.far, period=5, shadow=1)
    f = periodic(W, rng, [(2, 1.2), (5, 0.8)])
    fill_below(img, lambda x: 100 + f(x), g.far[0], g.far[1], y_end=114)
    return img


def buttes(g: Grade, rng: random.Random) -> Image.Image:
    """Nearer buttes and needles: stepped, banded, each with its shadowed side and its skirt of scree."""
    img = blank(W, H)
    for i in range(6):
        x = i * W / 6 + rng.uniform(-24, 24) + 44
        w, h = rng.uniform(26, 58), rng.uniform(32, 54)
        _rock(img, _cliff(x, 108, w, h, rng), g.mid, period=6, phase=rng.randrange(6), shadow=3)
        _talus(img, x - w * 0.42, 108, w * 0.5, h * 0.3, g.mid, rng)
        _talus(img, x + w * 0.45, 108, w * 0.45, h * 0.24, g.mid, rng)
        side = rng.choice((-1, 1))
        if i % 2 == 0:  # needles beside it, one carrying a balanced stone
            nx = x + (w / 2 + rng.uniform(10, 18)) * side
            nh = h * rng.uniform(0.5, 0.8)
            _rock(img, _needle(nx, 108, 4.4, nh), g.mid, period=6, shadow=1)
            _rock(img, ellipse(nx, 108 - nh - 2.2, 4.2, 2.6), g.mid, period=6, shadow=1, beds=False)
            _rock(img, _needle(nx + side * 9, 108, 3.2, nh * 0.6), g.mid, period=6, shadow=1)
        else:  # a fin of rock with a window worn through it
            fx = x + (w / 2 + 16) * side
            _rock(img, polygon([(fx - 10, 108), (fx - 8, 108 - h * 0.6), (fx - 3, 108 - h * 0.72), (fx + 6, 108 - h * 0.66), (fx + 10, 108)]) - ellipse(fx, 108 - h * 0.36, 3.6, 4.2),
                  g.mid, period=6, shadow=2)
    f = periodic(W, rng, [(1, 1.2), (3, 1.4), (7, 0.7)])
    fill_below(img, lambda x: 105 + f(x), g.mid[0], g.mid[1], y_end=116)
    for x in range(W):  # stones strewn along the foot
        if rng.random() < 0.08:
            y = int(105 + f(x)) + rng.randint(1, 3)
            put(img, x, y, g.mid[1])
            put(img, x + 1, y, g.mid[3])
    return img


def dust(g: Grade, rng: random.Random) -> Image.Image:
    """Dust hanging low over the canyon floor: long thin streaks, and dust devils walking across it. In
    Torment, stones hang in the air too."""
    img = blank(W, H)
    body, lit = g.mist
    for _ in range(7):
        cx, cy = rng.uniform(0, W), rng.uniform(92, 108)
        length = rng.uniform(50, 130)
        shape = ellipse(cx, cy, length / 2, rng.uniform(1.0, 2.0))
        for _ in range(3):
            shape = shape | ellipse(cx + rng.uniform(-length / 2, length / 2), cy + rng.uniform(-1.5, 1.5), rng.uniform(10, length / 2.6), rng.uniform(0.9, 2.2))
        for dx in (-W, 0, W):
            pts = rasterize(_shift(shape, dx), W, H)
            for (x, y) in pts:
                put(img, x, y, lit if (x, y - 1) not in pts else body)
    # Dust devils: a twisting funnel of solid dust, narrow at the ground and torn open at the top, with the
    # turns of the wind drawn across it.
    turn = g.mid[1] if not g.torment else g.mid[4]
    for x0, top, foot in ((268, 62, 110), (520, 76, 109)):
        for y in range(top, foot):
            t = (foot - y) / (foot - top)
            cx = x0 + 2.6 * math.sin(y / 5.2 + x0) + 6.0 * t * t
            half = 1.0 + 4.6 * t ** 1.5
            ragged = t > 0.86
            for x in range(int(cx - half), int(cx + half) + 1):
                if ragged and (x + y) % 3 == 0:
                    continue
                band_ = y % 9 == 0 and abs(x - cx) < half - 0.5 and x < cx + half * 0.3
                put(img, x, y, turn if band_ else lit if x >= cx + half - 1.2 else body)
        for k in range(11):  # dust kicked out at its foot
            put(img, x0 - 9 + k * 2, foot - (1 if k % 3 == 0 else 0), body)
            put(img, x0 - 8 + k * 2, foot + 1, body)
    if g.torment:
        for _ in range(9):
            x, y, r = rng.uniform(0, W), rng.uniform(26, 84), rng.uniform(2.5, 6.5)
            stone = polygon([(x - r, y), (x - r * 0.4, y - r * 0.8), (x + r * 0.7, y - r * 0.6), (x + r, y + r * 0.2), (x + r * 0.1, y + r)])
            _rock(img, stone, g.wall, period=4, shadow=1)
            put(img, int(x), int(y + r + 2), g.mist[0])
    return img


def _pennant(img: Image.Image, x: int, y: int, height: int, g: Grade, length: int = 7) -> None:
    """A pole with a long pennant streaming to the left on the hot wind (torn short in Torment)."""
    for k in range(height):
        put(img, x, y - k, g.wood[0])
    n = length // 2 if g.torment else length
    for k in range(n):
        yy = y - height + 1 + (1 if k in (2, 3, 6) else 0)
        put(img, x - 1 - k, yy, g.cloth[3])
        if k < n - 2:
            put(img, x - 1 - k, yy + 1, g.cloth[3])
    put(img, x, y - height, g.wood[1])


def _dwelling(img: Image.Image, cx: int, cy: int, g: Grade) -> None:
    """A cliff dwelling: a wide alcove under an overhang, with small adobe houses and a tower built in it, and
    a ladder down the face."""
    shade, body, lit = g.adobe
    rx, ry = 27, 11
    for (x, y) in _pts(img, ellipse(cx, cy, rx, ry)):
        put(img, x, y, g.hollow if y < cy - 3 else g.wall[3])
    for x in range(cx - rx + 3, cx + rx - 2):  # the lit lip of the floor
        put(img, x, cy + 8, g.wall[1])
        put(img, x, cy + 9, g.wall[4])
    floor = cy + 7
    houses = [(-20, 7, 6), (-13, 6, 9), (-6, 8, 7), (3, 5, 12), (9, 7, 6), (16, 6, 8)]
    for i, (dx, w, h) in enumerate(houses):
        if g.torment and i in (1, 4):
            h = h // 2  # fallen in
        x0 = cx + dx
        for y in range(floor - h + 1, floor + 1):
            for x in range(x0, x0 + w):
                c = lit if (y == floor - h + 1 or x == x0 + w - 1) else shade if x == x0 else body
                put(img, x, y, c)
        put(img, x0 + w // 2, floor, g.hollow)  # doorway
        put(img, x0 + w // 2, floor - 1, g.hollow)
        if h >= 7:
            put(img, x0 + 1, floor - h + 3, g.hollow)  # windows
            put(img, x0 + w - 2, floor - h + 3, g.hollow)
        if h >= 11:
            put(img, x0 + w // 2, floor - h + 6, g.hollow)
            for x in range(x0 - 1, x0 + w + 1, 2):  # the tower's crenels
                put(img, x, floor - h, lit)
    if not g.torment:
        put(img, cx - 11, floor - 4, g.fire[1])  # one window still lit
    for y in range(floor + 2, 119):  # the ladder down
        put(img, cx - 8, y, g.wood[1])
        put(img, cx - 6, y, g.wood[1])
        if y % 2 == 0:
            put(img, cx - 7, y, g.wood[1])


def _gate(img: Image.Image, cx: int, base: int, g: Grade) -> None:
    """A gateway cut into the living rock by whoever came before: a dark door between two pairs of pilasters
    under a lintel and a pediment, steps leading up to it. In Torment half the pediment has fallen."""
    body, rim, band, shade, pale = g.wall
    top = base - 24
    for y in range(top + 6, base - 2):  # the recessed face
        for x in range(cx - 9, cx + 10):
            put(img, x, y, band)
    for y in range(top + 10, base - 2):  # the door
        for x in range(cx - 3, cx + 4):
            put(img, x, y, g.hollow)
    for x in range(cx - 2, cx + 3):
        put(img, x, top + 9, g.hollow)
    for px_ in (-9, -6, 5, 8):  # pilasters, lit on their right edge
        for y in range(top + 7, base - 2):
            put(img, cx + px_, y, pale)
            put(img, cx + px_ + 1, y, rim)
        put(img, cx + px_ - 1, top + 7, pale)  # capital
        put(img, cx + px_ + 2, top + 7, rim)
    for x in range(cx - 11, cx + 12):  # lintel
        put(img, x, top + 5, rim)
        put(img, x, top + 6, pale)
    for k in range(6):  # pediment
        for x in range(cx - 10 + k * 2, cx + 11 - k * 2):
            if g.torment and x > cx + 2:
                continue
            put(img, x, top + 4 - k, rim if (k == 5 or x in (cx - 10 + k * 2, cx + 10 - k * 2)) else pale if k % 2 else body)
    put(img, cx, top + 2, g.hollow)  # an eye carved in the pediment
    for k in range(3):  # steps
        for x in range(cx - 6 - k * 2, cx + 7 + k * 2):
            put(img, x, base - 2 + k, rim if k == 0 else pale if k == 1 else body)


def _glyphs(img: Image.Image, x: int, y: int, g: Grade) -> None:
    """Old marks pecked into a rock face: a spiral, a horned beast, a hand."""
    c = g.wall[4]
    spiral = ((0, 0), (1, 0), (2, 0), (2, 1), (2, 2), (1, 2), (0, 2), (-1, 2), (-1, 1), (-1, 0), (-1, -1), (0, -1), (1, -1), (2, -1), (3, -1), (3, 0), (3, 1), (3, 2), (3, 3))
    beast = ((0, 0), (1, 0), (2, 0), (3, 0), (4, 0), (0, 1), (4, 1), (0, 2), (4, 2), (5, -1), (6, -2), (5, -2), (7, -1), (-1, -1))
    hand = ((0, 0), (1, 0), (2, 0), (0, 1), (1, 1), (2, 1), (1, 2), (-1, -1), (0, -2), (1, -2), (2, -2), (3, -1))
    for ox, shape in ((0, spiral), (9, beast), (21, hand)):
        for dx, dy in shape:
            put(img, x + ox + dx, y + dy, c)


def _tent(img: Image.Image, cx: float, base: float, w: float, h: float, g: Grade) -> None:
    shade, body, lit, stripe = g.cloth
    pts = _pts(img, polygon([(cx - w / 2, base), (cx - 0.5, base - h), (cx + 0.5, base - h), (cx + w / 2, base)]))
    for (x, y) in pts:
        if (x + 1, y) not in pts:
            c = lit
        elif x < cx - 1:
            c = shade
        elif abs(y - (base - h * 0.45)) < 0.9:
            c = stripe
        else:
            c = body
        put(img, x, y, c)
    for k in range(int(h * 0.55)):  # the door flap
        put(img, int(cx + 1), int(base) - 1 - k, g.hollow)
    put(img, int(cx), int(base - h) - 1, g.wood[0])
    put(img, int(cx), int(base - h) - 2, g.wood[0])


def _camp(img: Image.Image, x: int, base: int, g: Grade) -> None:
    """A caravan camp at the foot of the wall: tents, a pennant, bales, and a fire with its thread of smoke."""
    if g.torment:  # abandoned: the tents down, the pole snapped, cold ash
        for cx, w in ((x + 6, 13), (x + 22, 16)):
            pts = _pts(img, polygon([(cx - w / 2, base), (cx - w / 4, base - 3), (cx + w / 3, base - 2), (cx + w / 2, base)]))
            for (a, b) in pts:
                put(img, a, b, g.cloth[2] if (a, b - 1) not in pts else g.cloth[1])
        for k in range(5):
            put(img, x + 33, base - k, g.wood[0])
        return
    _tent(img, x + 5, base, 12, 10, g)
    _tent(img, x + 21, base, 16, 13, g)
    _tent(img, x + 36, base, 9, 7, g)
    _pennant(img, x + 30, base - 1, 17, g, 8)
    for bx, by in ((x + 11, base - 1), (x + 12, base - 2), (x + 13, base - 1), (x + 42, base - 1)):  # bales and jars
        put(img, bx, by, g.wood[1])
        put(img, bx, by + 1, g.wood[0])
    fx = x + 47
    core, glow, spark = g.fire
    for dx, dy, c in ((0, 0, core), (-1, 0, core), (1, 0, glow), (0, -1, core), (-1, -1, glow), (0, -2, glow), (0, -3, spark), (-2, 0, glow), (2, 0, spark), (-3, 1, g.wood[0]),
                      (3, 1, g.wood[0]), (-2, 1, spark), (-1, 1, glow), (0, 1, glow), (1, 1, glow), (2, 1, spark), (1, -5, spark), (-2, -4, spark)):
        put(img, fx + dx, base - 1 + dy, c)
    for k in range(4, 20):  # smoke leaning with the wind
        if k % 4 != 3:
            put(img, int(fx - 0.5 * k + 1.5 * math.sin(k / 2.6)), base - k, g.mist[0] if k > 8 else g.mid[1])


def _bridge(img: Image.Image, a: tuple[int, int], b: tuple[int, int], g: Grade) -> None:
    """A rope bridge slung between two rocks: a sagging deck of slats under a hand-rope. In Torment it is cut
    and hangs from its near anchor."""
    dark = g.hollow
    for (x, y) in (a, b):
        for k in range(4):
            put(img, x, y - k, g.wood[0])
    if g.torment:
        for k in range(26):  # the cut half, swinging against the rock
            x = a[0] + int(6 * math.sin(k / 9.0))
            put(img, x, a[1] + k, dark)
            if k % 3 == 0:
                put(img, x + 1, a[1] + k, g.wood[1])
        for k in range(7):
            put(img, b[0] - k, b[1] + k // 2, dark)
        return
    n = b[0] - a[0]
    for i in range(n + 1):
        t = i / n
        x = a[0] + i
        deck = a[1] + (b[1] - a[1]) * t + 5.5 * math.sin(math.pi * t)
        rope = a[1] - 3 + (b[1] - a[1]) * t + 3.6 * math.sin(math.pi * t)
        if i % 13 != 9:  # a slat missing here and there
            put(img, x, int(deck), dark)
            put(img, x, int(deck) + 1, g.wood[1] if i % 3 else dark)
        put(img, x, int(rope), dark)
        if i % 6 == 3:
            for y in range(int(rope) + 1, int(deck)):
                put(img, x, y, dark)


def walls(g: Grade, rng: random.Random) -> Image.Image:
    """The canyon walls: great stepped blocks of banded rock with gaps between them, where hoodoos and a rock
    arch stand against the sky; people have lived here, and some still pass through."""
    img = blank(W, H)
    body, rim, band, shade, pale = g.wall
    base = 120
    # Behind everything, rubble banked up between the blocks as high as the fighters' shoulders, so nobody on
    # the trail stands against the bright gaps. (Its own random stream: the blocks keep their shapes.)
    arng = random.Random(4047)
    fa = periodic(W, arng, [(2, 1.6), (3, 1.2), (7, 0.7)])
    apron = lambda x: 97 + 2.0 * fa(x)  # noqa: E731
    fill_below(img, apron, body, rim, y_end=121)
    for _ in range(170):  # fallen stones on it: a lit top over a dark foot
        x = arng.randrange(W)
        y = int(apron(x)) + arng.randint(3, 18)
        put(img, x, y, pale)
        put(img, x + 1, y, pale if arng.random() < 0.5 else body)
        put(img, x, y + 1, band)
    for _ in range(26):  # slip lines running down the slope
        x, y = arng.randrange(W), 0
        y = int(apron(x)) + arng.randint(2, 6)
        for k in range(arng.randint(4, 9)):
            put(img, x + k // 2, y + k, band if k % 3 else body)
    blocks = [(72.0, 118.0, 62.0), (232.0, 128.0, 74.0), (520.0, 116.0, 56.0)]
    for i, (bx, bw, bh) in enumerate(blocks):
        shape = _cliff(bx, base, bw, bh, rng)
        if i == 0:  # a window worn right through the first block
            shape = shape - ellipse(bx - 14, base - bh * 0.62, 6.5, 5.0)
        _rock(img, shape, g.wall, period=9, phase=i * 3, shadow=4)
        # Clefts worn down the face, and dark streaks of varnish below the ledges.
        for _ in range(8):
            cx = int(bx + rng.uniform(-bw * 0.36, bw * 0.36))
            y0 = int(base - bh * rng.uniform(0.35, 0.8))
            for y in range(y0, min(base - 2, y0 + rng.randrange(8, 26))):
                put(img, cx + (1 if (y // 6) % 2 else 0), y, shade)
                if y % 5 == 0:
                    put(img, cx + 1 + (1 if (y // 6) % 2 else 0), y, rim)
        for _ in range(3):  # cave mouths
            cx, cy = bx + rng.uniform(-bw * 0.3, bw * 0.3), base - bh * rng.uniform(0.2, 0.5)
            for (x, y) in _pts(img, ellipse(cx, cy, rng.uniform(2.0, 3.6), rng.uniform(1.6, 2.6))):
                put(img, x, y, g.hollow)
        _talus(img, bx - bw * 0.46, base, bw * 0.42, bh * 0.3, g.wall, rng)
        _talus(img, bx + bw * 0.44, base, bw * 0.5, bh * 0.36, g.wall, rng)
        _talus(img, bx + rng.uniform(-10, 10), base, bw * 0.3, bh * 0.16, g.wall, rng)
    # The cliff dwelling in the great block, and a watch-post on its top.
    _dwelling(img, 238, 97, g)
    top = int(base - blocks[1][2])
    for x in range(226, 236):
        for y in range(top - 5, top):
            keep = not g.torment or x < 231 or y > top - 3
            if keep:
                put(img, x, y, g.adobe[2] if (y == top - 5 or x == 235) else g.adobe[0] if x == 226 else g.adobe[1])
    put(img, 229, top - 2, g.hollow)
    put(img, 232, top - 3, g.hollow)
    _pennant(img, 238, top - 1, 12, g)
    _pennant(img, 224, top - 1, 8, g, 5)
    _gate(img, 516, base - 6, g)
    _glyphs(img, 86, 100, g)
    # A dead juniper on the third block's shoulder.
    jx, jy = 556, int(base - blocks[2][2] * 0.92)
    for (x, y) in _pts(img, capsule(jx, jy, jx - 2, jy - 7, 0.9, 0.5) | capsule(jx - 1, jy - 4, jx + 4, jy - 8, 0.5) | capsule(jx - 2, jy - 6, jx - 6, jy - 9, 0.5)):
        put(img, x, y, g.wood[0])
    # A free-standing rock arch in the widest gap.
    ax = 350.0
    block = polygon([(ax - 30, base), (ax - 27, 80), (ax - 20, 73), (ax + 21, 71), (ax + 28, 80), (ax + 32, base)])
    _rock(img, block - ellipse(ax + 1, base, 17, 32), g.wall, period=9, phase=4, shadow=4)
    for x in range(int(ax) - 15, int(ax) + 18):  # the underside of the span, in shadow
        yy = int(base - 32 * math.sqrt(max(0.0, 1 - ((x - ax - 1) / 17) ** 2)))
        put(img, x, yy - 1, shade)
        put(img, x, yy - 2, band)
    _talus(img, ax - 30, base, 22, 12, g.wall, rng)
    _talus(img, ax + 34, base, 20, 10, g.wall, rng)
    # Hoodoos: thin columns under a harder cap; one carries a great balanced stone, one anchors the bridge.
    hoodoos = [(150.0, 30.0, 3.0, 6.2), (310.0, 26.0, 2.8, 0.0), (398.0, 22.0, 2.6, 0.0), (442.0, 34.0, 3.4, 0.0), (586.0, 36.0, 3.2, 0.0), (20.0, 20.0, 2.6, 0.0)]
    for i, (hx, hh, hw, stone) in enumerate(hoodoos):
        col = polygon([(hx - hw - 2, base), (hx - hw, base - hh * 0.5), (hx - hw * 0.6, base - hh), (hx + hw * 0.6, base - hh), (hx + hw, base - hh * 0.5), (hx + hw + 2, base)])
        _rock(img, col | ellipse(hx, base - hh, hw + 2.2, 2.4), g.wall, period=5, phase=i, shadow=1)
        if stone:
            _rock(img, ellipse(hx + 0.5, base - hh - stone * 0.62 - 1.5, stone, stone * 0.66), g.wall, period=4, shadow=2)
    _bridge(img, (381, 83), (439, 87), g)
    # Rubble along the foot of it all, with boulders that have rolled out onto it.
    f = periodic(W, rng, [(2, 1.4), (5, 1.0), (9, 0.6)])
    fill_below(img, lambda x: 113 + f(x), body, rim, y_end=121)
    for x in range(W):
        if rng.random() < 0.2:
            y = int(113 + f(x)) + rng.randint(2, 5)
            put(img, x, y, pale if rng.random() < 0.5 else band)
    for _ in range(9):
        bx = rng.uniform(0, W)
        if not 398 <= bx <= 462:
            _boulder(img, bx, 113 + f(bx) + 2, rng.uniform(3, 7), rng.uniform(3, 6), g.wall)
    # The camp sits on a low shelf of rubble so it clears the bank in front of it.
    for (x, y) in _pts(img, ellipse(430, 113, 32, 4.5)):
        put(img, x, y, rim if y <= 109 else pale if y == 110 else body)
    _camp(img, 404, 109, g)
    _veil(img, VEIL[g.key])
    return img


# ------------------------------------------------------------------------------------- ground props
def _saguaro(img: Image.Image, x: int, base: int, g: Grade, rng: random.Random) -> None:
    shade, body, lit = g.cactus
    hgt = rng.randint(9, 13)
    shape = capsule(x, base, x, base - hgt, 1.6)
    for sgn in rng.sample((-1, 1), rng.randint(1, 2)):
        y0 = base - rng.randint(3, hgt - 4)
        shape = shape | capsule(x, y0, x + sgn * 4, y0, 1.0) | capsule(x + sgn * 4, y0, x + sgn * 4, y0 - rng.randint(3, 5), 1.1)
    pts = _pts(img, shape)
    for (a, b) in pts:
        put(img, a, b, lit if ((a + 1, b) not in pts or (a, b - 1) not in pts) else shade if (a - 1, b) not in pts else body)
    if not g.torment:
        put(img, x, base - hgt - 2, g.flower)


def _prickly(img: Image.Image, x: int, base: int, g: Grade, rng: random.Random) -> None:
    """Prickly pear: flat pads stacked on each other."""
    shade, body, lit = g.cactus
    pads = [(0.0, -2.5, 2.6, 2.6), (-3.2, -5.5, 2.2, 2.4), (2.8, -6.2, 2.2, 2.6), (0.4, -9.2, 1.8, 2.0)]
    for dx, dy, rx, ry in pads[: rng.randint(3, 4)]:
        pts = _pts(img, ellipse(x + dx, base + dy, rx, ry))
        for (a, b) in pts:
            put(img, a, b, lit if ((a + 1, b) not in pts or (a, b - 1) not in pts) else shade if (a - 1, b) not in pts else body)
    if not g.torment:
        put(img, x + 3, base - 9, g.flower)


def _barrel(img: Image.Image, x: int, base: int, g: Grade) -> None:
    shade, body, lit = g.cactus
    for dx, dy, c in ((-1, 0, shade), (0, 0, body), (1, 0, lit), (-1, -1, shade), (0, -1, body), (1, -1, lit), (-1, -2, body), (0, -2, lit), (1, -2, lit)):
        put(img, x + dx, base + dy, c)
    put(img, x, base - 3, g.flower if not g.torment else lit)


def _agave(img: Image.Image, x: int, base: int, g: Grade, rng: random.Random) -> None:
    """A rosette of stiff blades."""
    shade, body, lit = g.cactus
    for k in range(7):
        ang = math.radians(-90 + (k - 3) * 24 + rng.uniform(-5, 5))
        L = rng.uniform(3.5, 6.0) * (0.75 if abs(k - 3) == 3 else 1.0)
        for j in range(int(L)):
            put(img, int(x + math.cos(ang) * j), int(base + math.sin(ang) * j), lit if (k >= 3 and j >= 1) else body if j else shade)


def _snag(img: Image.Image, x: float, base: float, h: float, g: Grade, rng: random.Random, tones: tuple[Color, Color] | None = None) -> None:
    """A dead tree bleached by the sun: a leaning trunk and a few crooked limbs."""
    dark, lit = tones or (g.wood[0], g.bone[0])
    lean = rng.uniform(-0.3, 0.3)
    top = (x + lean * h, base - h)
    shape = capsule(x, base, top[0], top[1], 1.3, 0.6)
    for t, sgn in ((0.45, -1), (0.62, 1), (0.8, -1)):
        px_, py_ = x + lean * h * t, base - h * t
        L = h * rng.uniform(0.3, 0.45)
        ex, ey = px_ + sgn * L * 0.8, py_ - L * 0.6
        shape = shape | capsule(px_, py_, ex, ey, 0.7, 0.4) | capsule(ex, ey, ex + sgn * L * 0.2, ey - L * 0.5, 0.4)
    pts = _pts(img, shape)
    for (a, b) in pts:
        put(img, a, b, lit if (a + 1, b) not in pts else dark)


def _cairn(img: Image.Image, x: int, base: int, g: Grade, tall: bool = True) -> None:
    """Stacked stones marking the trail, a strip of cloth tied to the top one."""
    body, rim, band, shade, pale = g.wall
    for i, w in enumerate((7, 5, 5, 3, 3) if tall else (5, 3, 3)):
        y = base - i * 2
        for k in range(w):
            xx = x - w // 2 + k
            put(img, xx, y, shade if k == 0 else rim if k == w - 1 else body)
            put(img, xx, y - 1, rim if k else band)
    top = base - (10 if tall else 6)
    put(img, x, top, g.wood[0])
    put(img, x, top - 1, g.wood[0])
    for k in range(2 if g.torment else 4):
        put(img, x - 1 - k, top - 1 + (k // 2), g.cloth[3])


def _skull(img: Image.Image, x: int, y: int, g: Grade) -> None:
    shade, lit = g.bone
    for dx, dy, c in ((0, 0, lit), (1, 0, lit), (2, 0, lit), (-1, 1, lit), (0, 1, g.path[0]), (1, 1, lit), (2, 1, g.path[0]), (3, 1, shade), (0, 2, shade), (1, 2, lit), (2, 2, shade),
                      (-2, -1, lit), (-3, -2, shade), (4, -1, lit), (5, -2, shade)):  # two horns
        put(img, x + dx, y + dy, c)


def _lizard(img: Image.Image, x: int, y: int, g: Grade) -> None:
    c, d = g.cactus[2], g.cactus[0]
    for dx, dy, t in ((0, 0, c), (1, 0, c), (2, 0, c), (3, -1, c), (-1, 0, d), (-2, 1, d), (-3, 1, d), (1, 1, d), (2, -1, d)):
        put(img, x + dx, y + dy, t)


def _bush(img: Image.Image, x: int, y: int | None, top: list[int], rng: random.Random, tones: tuple[Color, Color, Color], size: int) -> None:
    """Dry scrub with some body to it: a dark heart, a fan of twigs, lit tips on the sun side."""
    dark, body, tip = tones
    base = top[x % W] if y is None else y
    for dx in range(-size // 3, size // 3 + 1):
        put(img, x + dx, base, dark)
        if abs(dx) < size // 4:
            put(img, x + dx, base - 1, dark)
    for k in range(rng.randint(5, 7)):
        ang = math.radians(-90 + (k - 3) * rng.uniform(18, 27))
        L = rng.uniform(size * 0.6, size)
        for j in range(1, int(L)):
            put(img, int(x + math.cos(ang) * j), int(base + math.sin(ang) * j), tip if (j >= L - 1.5 and k >= 2) else body if k >= 2 else dark if j < 2 else body)


def _ribs(img: Image.Image, x: int, base: int, g: Grade, n: int = 6, hgt: int = 15) -> None:  # noqa: C901
    """The ribcage of something very large, half buried: a line of spine and ribs arching up out of the earth,
    lit on the sun side, with the skull lying ahead of it. Old bone, weathered: kept below the value of the
    trail so it never competes with the figures above it."""
    shade, lit = (_c("bone", 1), _c("bone", 3)) if g.torment else (_c("bone", 3), _c("bone", 5))
    high = _c("bone", 4) if g.torment else _c("bone", 6)
    for i in range(n):
        h = hgt * (0.55 + 0.45 * math.sin(math.pi * (i + 0.7) / (n + 0.4)))
        rx = x + i * 7
        shape = capsule(rx, base, rx - 2.2, base - h * 0.6, 1.2, 1.0) | capsule(rx - 2.2, base - h * 0.6, rx + 1.5, base - h, 1.0, 0.5)
        pts = _pts(img, shape)
        for (a, b) in pts:
            put(img, a, b, high if (a, b - 1) not in pts else lit if (a + 1, b) not in pts else shade)
    for k in range(n * 7 + 4):  # the spine, mostly under the sand
        if (k // 3) % 3 != 2:
            put(img, x - 4 + k, base, shade)
            if k % 3 == 0:
                put(img, x - 4 + k, base - 1, lit)
    # The skull: a long horned head with an eye socket and a jaw of teeth.
    sx, sy = x + n * 7 + 6, base
    skull = polygon([(sx, sy), (sx + 1, sy - 6), (sx + 6, sy - 8), (sx + 13, sy - 6), (sx + 17, sy - 3), (sx + 17, sy)])
    pts = _pts(img, skull)
    for (a, b) in pts:
        put(img, a, b, high if (a, b - 1) not in pts else lit if ((a + 1, b) not in pts or b < sy - 2) and (a - 1, b) in pts else shade)
    for dx, dy in ((5, -5), (6, -5), (5, -4), (6, -4)):
        put(img, sx + dx, sy + dy, g.earth[0])
    for k in range(4):
        put(img, sx + 9 + k * 2, sy - 1, g.earth[0])
    for k in range(6):  # a horn sweeping back
        put(img, sx + 2 - k, sy - 7 - k // 2, lit if k < 4 else shade)


def _wheel(img: Image.Image, x: int, base: int, g: Grade) -> None:
    """A wagon wheel sunk to its hub."""
    dark, lit = g.wood
    for a in range(180, 361, 6):
        r = math.radians(a)
        put(img, int(x + math.cos(r) * 6.5), int(base + math.sin(r) * 6.5), lit if a > 270 else dark)
    for a in (200, 235, 270, 305, 340):
        r = math.radians(a)
        for j in range(1, 6):
            put(img, int(x + math.cos(r) * j), int(base + math.sin(r) * j), dark)
    put(img, x, base, lit)


def _pots(img: Image.Image, x: int, base: int, g: Grade) -> None:
    """Broken jars from some lost caravan."""
    shade, body, lit = g.adobe
    for dx, dy, c in ((0, 0, shade), (1, 0, body), (2, 0, body), (3, 0, lit), (0, -1, shade), (1, -1, body), (2, -1, lit), (3, -1, lit), (1, -2, body), (2, -2, lit), (1, -3, lit), (2, -3, g.hollow),
                      (7, 0, body), (8, 0, lit), (7, -1, lit), (11, 0, shade), (12, 0, lit), (5, 0, shade)):
        put(img, x + dx, base + dy, c)
    put(img, x + 2, base - 1, g.cloth[3])


# ------------------------------------------------------------------------------------- ground
def ground(g: Grade, rng: random.Random) -> Image.Image:
    """The canyon floor: a bank of red earth with cactus, cairns and bones, the dusty rutted trail, and below it
    a lower terrace of cracked earth where the bigger things lie."""
    img = blank(W, H)
    px = img.load()
    deep, earth, light, crust = g.earth
    dark_p, path, light_p = g.path
    f = periodic(W, rng, [(3, 1.2), (5, 0.9), (9, 0.5)])
    top = [int(round(112 + f(x))) for x in range(W)]
    path_top, path_bot = PATH_Y - 6, PATH_Y + 5
    step = path_bot + 5  # the foot of the cut below the trail
    for x in range(W):
        for y in range(top[x], H):
            if path_top <= y <= path_bot:
                continue
            if y < path_top:
                t = (y - top[x]) / max(1, path_top - top[x])
                c = dither_pick([light, earth, deep], t, x, y)
            elif y < step:
                c = deep if y > path_bot + 1 else earth  # the cut face, in shadow
            else:
                t = (y - step) / (H - step)
                c = dither_pick([earth, earth, deep, deep, g.fore[0]], t, x, y)
            px[x, y] = (*c, 255)
        for y in range(path_top, path_bot + 1):
            t = (y - path_top) / (path_bot - path_top)
            c = dither_pick([light_p, path, path, dark_p], t, x, y)
            px[x, y] = (*c, 255)
    # Earth spilling onto the trail's edges; pebbles on it.
    for x in range(W):
        if rng.random() < 0.5:
            put(img, x, path_top, earth)
        if rng.random() < 0.25:
            put(img, x, path_top + 1, earth)
        if rng.random() < 0.6:
            put(img, x, path_bot, deep)
    for _ in range(60):
        x, y = rng.randrange(W), rng.randrange(path_top + 1, path_bot)
        put(img, x, y, light_p)
        put(img, x + 1, y, dark_p)
    # Wagon ruts: two worn lines running the length of the trail, broken where the dust has filled them.
    for ry in (path_top + 4, path_bot - 3):
        x = 0
        while x < W:
            run = rng.randrange(14, 46)
            for k in range(run):
                put(img, x + k, ry, dark_p)
                if k % 5 == 2:
                    put(img, x + k, ry - 1, light_p)
            x += run + rng.randrange(4, 14)
    # Cracks in the baked earth: short wandering lines that fork.
    for _ in range(18):
        x, y = rng.randrange(W), rng.randrange(path_top + 2, path_bot)
        for k in range(rng.randint(5, 11)):
            put(img, x, y, dark_p)
            x += 1
            if rng.random() < 0.35:
                y = max(path_top + 1, min(path_bot - 1, y + rng.choice((-1, 1))))
            if k == 3 and rng.random() < 0.5:
                put(img, x, y + 1, dark_p)
    # The cut below the trail: beds of rock showing in its face, stones fallen from it.
    for x in range(W):
        if (x // 9 + x // 23) % 3 != 0:
            put(img, x, path_bot + 3, earth)
        if (x // 5) % 7 == 3:
            put(img, x, path_bot + 2, crust)
        if rng.random() < 0.3:
            put(img, x, step, deep)
    # The lower terrace: plates of cracked earth, lit along the edge that faces the sun, drifts of dust.
    for _ in range(46):
        x, y = rng.randrange(W), rng.randrange(step + 2, H - 4)
        for k in range(rng.randint(8, 22)):
            put(img, x, y, deep)
            put(img, x, y + 1, crust if (k % 4 and y < H - 12) else earth)
            x += 1
            if rng.random() < 0.3:
                y = max(step + 1, min(H - 4, y + rng.choice((-1, 1))))
            if k % 7 == 4:  # a cross-crack closing the plate
                for j in range(1, rng.randint(3, 6)):
                    put(img, x + (j // 2), y + j, deep)
    for _ in range(9):
        cx, cy, length = rng.randrange(W), rng.randrange(step + 3, H - 14), rng.randrange(14, 34)
        for k in range(length):
            if k % 9 != 8:
                put(img, cx + k, cy, light)
                if 3 < k < length - 4:
                    put(img, cx + k, cy + 1, crust)
    # The top of the bank: a lit lip, sparse dry scrub.
    for x in range(W):
        if rng.random() < 0.16:
            hgt = rng.randint(1, 3)
            for k in range(hgt):
                put(img, x, top[x] - 1 - k, g.scrub[2] if k == hgt - 1 else g.scrub[1])
    # Boulders along the far side of the trail, a lizard sunning itself on one.
    stones = []
    for i in range(0, W, 64):
        sx = i + rng.randint(6, 44)
        rw, rh = rng.uniform(4, 9), rng.uniform(3, 6)
        _boulder(img, sx, path_top + 1, rw, rh, VEIL_ROCK[g.key])
        stones.append((sx, int(path_top + 1 - rh)))
    for sx, sy in stones[1::4]:
        _lizard(img, sx, sy - 1, g)
    # What grows on the bank: tall cactus, prickly pear, barrels, agave, dry scrub, a dead tree.
    for _ in range(12):
        _bush(img, rng.randrange(W), None, top, rng, g.scrub, 5)
    slots = list(range(18, W, 43))
    rng.shuffle(slots)
    kinds = ["saguaro", "pear", "agave", "barrel", "pear", "agave", "pear", "barrel", "agave", "barrel", "agave", "snag", "pear", "barrel"]
    for sx, kind in zip(slots, kinds):
        sx += rng.randint(-8, 8)
        by = top[sx % W] + 2
        if kind == "saguaro":
            _saguaro(img, sx, by, g, rng)
        elif kind == "pear":
            _prickly(img, sx, by, g, rng)
        elif kind == "agave":
            _agave(img, sx, by, g, rng)
        elif kind == "barrel":
            _barrel(img, sx, by, g)
            _barrel(img, sx + 5, by + 1, g)
        else:
            _snag(img, sx, by, 13, g, rng)
    # Cairns marking the trail, and bones on its far verge: a ribcage and a horned skull.
    for cx in (66, 356, 566):
        _cairn(img, cx, path_top, g)
    shade, lit = g.bone
    for rx in (118,):
        for i in range(5):
            for k in range(6 - abs(i - 2)):
                put(img, rx + i * 3 + (1 if k > 2 else 0), path_top - 1 - k, lit if k > 1 else shade)
        for k in range(16):
            put(img, rx - 1 + k, path_top - 1, shade)
        _skull(img, rx + 20, path_top - 3, g)
    _skull(img, 446, path_top - 3, g)
    # The lower terrace's furniture: the great skeleton, a wheel, broken jars, stones, scrub, cactus, skulls.
    _ribs(img, 132, 150, g)
    _ribs(img, 468, 147, g, n=4, hgt=10)
    _wheel(img, 318, 148, g)
    _pots(img, 392, 140, g)
    _pots(img, 46, 152, g)
    _cairn(img, 258, 146, g, tall=False)
    for _ in range(11):
        _boulder(img, rng.randrange(W), rng.randrange(step + 6, H - 3), rng.uniform(2.5, 6.5), rng.uniform(2.0, 4.5), g.wall)
    for _ in range(30):
        x = rng.randrange(W)
        y = int(step + 3 + (H - step - 5) * rng.random() ** 1.3)
        w = rng.randint(2, 4)
        for k in range(w):
            put(img, x + k, y, light if k < w - 1 else deep)
            put(img, x + k, y + 1, deep)
    for _ in range(22):
        x = rng.randrange(W)
        if 124 <= x <= 204 or 460 <= x <= 522:
            continue
        _bush(img, x, rng.randrange(step + 4, H - 4), top, rng, g.scrub, rng.randint(4, 7))
    def clear(x: int) -> bool:  # keep small things off the skeletons
        return not (124 <= x % W <= 204 or 460 <= x % W <= 522)

    for i in range(9):
        x, y = rng.randrange(W), rng.randrange(step + 6, H - 6)
        if clear(x):
            (_barrel(img, x, y, g) if i % 2 else _agave(img, x, y, g, rng))
    for _ in range(2):
        _skull(img, rng.randrange(W), rng.randrange(step + 6, H - 8), g)
    _lizard(img, 214, step + 9, g)
    if g.torment:
        for _ in range(7):
            _crystal(img, rng.uniform(0, W), rng.choice([path_top - 1, rng.randrange(step + 6, H - 4)]), rng)
    return img


def foreground(g: Grade, rng: random.Random) -> Image.Image:
    """Boulders, thorn bush, prickly pear and a dead snag sliding past in front of everything, near-silhouettes
    with one lit plane."""
    img = blank(W, H)
    body, plane, rim = g.fore
    for _ in range(6):
        x = rng.uniform(0, W)
        base = H + 2
        w, h = rng.uniform(12, 26), rng.uniform(9, 18)
        pts = _pts(img, polygon([(x - w, base), (x - w * 0.7, base - h * 0.6), (x - w * 0.2, base - h), (x + w * 0.4, base - h * 0.85), (x + w * 0.9, base - h * 0.4), (x + w * 1.1, base)]))
        for (a, b) in pts:
            if (a, b - 1) not in pts or (a + 1, b) not in pts:
                c = rim
            elif a > x + w * 0.25 and ((a - int(x)) + (b - (base - int(h)))) % 9 != 0:
                c = plane  # the face turned to the sun
            else:
                c = body
            put(img, a, b, c)
    for _ in range(5):
        x = rng.uniform(0, W)
        base = H + 1
        shape = ellipse(x, base, 4, 2)
        for k in range(rng.randint(6, 9)):
            ang = math.radians(-90 + rng.uniform(-55, 55))
            L = rng.uniform(10, 21)
            ex, ey = x + math.cos(ang) * L, base + math.sin(ang) * L
            shape = shape | capsule(x, base, ex, ey, 0.9, 0.5)
            shape = shape | capsule((x + ex) / 2, (base + ey) / 2, (x + ex) / 2 + rng.uniform(-5, 5), (base + ey) / 2 - rng.uniform(3, 7), 0.5)
        _silhouette(img, shape, body, rim, sun_side=1)
    for x in (88.0, 372.0):  # agave, big and close: a rosette of blades
        shape = ellipse(x, H, 5, 3)
        for k in range(9):
            ang = math.radians(-90 + (k - 4) * 21 + rng.uniform(-4, 4))
            L = rng.uniform(13, 22) * (0.7 if abs(k - 4) == 4 else 1.0)
            ex, ey = x + math.cos(ang) * L, H + math.sin(ang) * L
            px_, py_ = -math.sin(ang) * 2.2, math.cos(ang) * 2.2
            shape = shape | polygon([(x - px_, H - py_), (ex, ey), (x + px_, H + py_)])
        _silhouette(img, shape, body, rim, sun_side=1)
    _snag(img, 512.0, H + 2, 26, g, rng, tones=(body, rim))
    return img


LAYERS = (
    ("sky", sky, 0.0),
    ("far", far_mesas, 0.08),
    ("buttes", buttes, 0.18),
    ("mist", dust, 0.26),
    ("walls", walls, 0.45),
    ("ground", ground, 1.0),
    ("fore", foreground, 1.35),
)


def build(grade: str, seed: int = 404) -> dict[str, Image.Image]:
    g = GRADES[grade]
    out: dict[str, Image.Image] = {}
    for i, (name, fn, _speed) in enumerate(LAYERS):
        out[name] = fn(g, random.Random(seed * 100 + i))
    return out
