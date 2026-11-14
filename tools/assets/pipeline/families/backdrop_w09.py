"""World 9 backdrop — the citadel among the clouds, at dawn — in every difficulty grade.

Layers (back to front): sky (the sun breaking over the horizon, its rays, the far edge of the sea of clouds),
clouds (high streaks and the rolling sea of clouds, which drifts, down to under the walkway), far (floating
islands with spires, a long bridge between two of them, cloud pouring off their edges), citadel (the city: a
bell tower, the great golden dome, twin spires, a triumphal gate, a tiered tower, standing in a bank of cloud),
terrace (close behind the walkway: a colonnade with banners, a winged statue, a round pavilion, cypresses, a
gate with a hanging banner, a brazier pillar), ground (a low parapet, the marble walkway with its inlay, and
the bridge it stands on — cornice, frieze, corbels and arches with cloud passing underneath) and foreground
(fallen column drums, a statue's head, low wisps of cloud).

One light for everything: the sun low on the right. Marble has a warm lit side to the right, a cool shadow side
to the left; the further a building is, the paler and bluer it gets. From the fighters' heads down the city is
in shadow and morning haze and its feet are lost in a bank of mist, so the band behind the fight is one calm
mid tone and the white-and-gold city shows above it.

The Torment grade is TARNISH: the city rotted. A black sun with a dull amber ring, a dirty amber glow low in
a brown-black sky, soot-black domes and spires snapped off, the gold gone to verdigris, banners in rags, and
the sea of clouds turned to a heavy grey-brown smoke that swallows the lower city. Violet is the Rift's alone:
the fracture in the sky, the crystals, the light in the cracks of the paving. `ATMOSPHERE` adds what moves.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass

from PIL import Image

from ..backdrop import blank, dither_pick, periodic, put, vertical_gradient
from ..palette import RAMPS, Color, color, hex_of
from ..raster import capsule, circle, ellipse, polygon, rasterize, rect
from .backdrop_w01 import H, PATH_Y, W, _crystal, _rift, _shift

__all__ = ["W", "H", "PATH_Y", "LAYERS", "GRADES", "PREVIEW_BG", "ATMOSPHERE", "build"]

#: The tone creature previews of this world are shown on (the marble of the walkway).
PREVIEW_BG: Color = color("bone", 4)

#: Every palette tone → the next lighter tone of its ramp (the sun's rays brighten the sky they cross).
LIGHTER: dict[Color, Color] = {color(r, i): color(r, i + 1) for r, tones in RAMPS.items() for i in range(len(tones) - 1)}

Tones = tuple[Color, Color, Color, Color]  # deep shadow, shadow, body, lit


@dataclass(frozen=True)
class Grade:
    key: str
    sky: list[Color]
    sky_end: int
    sun: tuple[Color, Color, Color]  # halo, ring, disc
    streak: tuple[Color, Color, Color]  # high clouds: top, body, lit underside
    sea_far: tuple[Color, Color, Color]  # sea of clouds, far row: lit, body, shade
    sea_mid: tuple[Color, Color, Color]
    sea_low: tuple[Color, Color, Color]  # the cloud under the walkway
    far_rock: Tones
    far_stone: Tones
    stone: Tones  # the city's marble
    roof: Tones
    gilt: Tones  # the great dome
    near: Tones  # the terrace's marble
    near_roof: Tones
    leaf: Tones
    gold: Color
    window: Color
    banner: tuple[Color, Color, Color]  # shadow, cloth, trim
    flame: tuple[Color, Color]
    marble: tuple[Color, Color, Color]  # walkway: dark, body, light
    rail: tuple[Color, Color, Color]  # parapet: shade, body, lit
    face: Tones  # the bridge under the walkway
    fore: tuple[Color, Color]
    wisp: tuple[Color, Color]  # low cloud wisps: body, lit top
    # The band the fighters stand in front of is kept calm: the city's feet are lost in a bank of mist (lit,
    # body, shade; its top near `mist_base`) and, from `*_y` (start, full) down, the city and the terrace are
    # drawn in a few close tones (darkest … lightest) — in shadow, in haze — so figures read against them.
    mist: tuple[Color, Color, Color]
    mist_base: float
    haze_city: Tones
    haze_city_y: tuple[int, int]
    haze_near: Tones
    haze_near_y: tuple[int, int]
    haze_step: int  # +1: what is above the haze is lighter (dawn); -1: darker (soot)
    star: tuple[Color, Color]
    torment: bool = False


def _c(r: str, i: int) -> Color:
    return color(r, i)


NORMAL = Grade(
    key="normal",
    sky=[_c("azure", 4), _c("azure", 5), _c("azure", 6), _c("azure", 7), _c("azure", 8), _c("dusk", 9), _c("dusk", 8)],
    sky_end=100,
    sun=(_c("brass", 6), _c("brass", 7), _c("light", 0)),
    streak=(_c("azure", 8), _c("dusk", 9), _c("dusk", 7)),
    sea_far=(_c("brass", 7), _c("dusk", 9), _c("dusk", 8)),
    sea_mid=(_c("light", 0), _c("bone", 7), _c("dusk", 9)),
    sea_low=(_c("azure", 8), _c("azure", 7), _c("azure", 6)),
    far_rock=(_c("azure", 5), _c("azure", 6), _c("azure", 6), _c("azure", 7)),
    far_stone=(_c("azure", 6), _c("azure", 6), _c("azure", 7), _c("azure", 8)),
    stone=(_c("ink", 7), _c("ink", 8), _c("azure", 8), _c("light", 0)),
    roof=(_c("azure", 4), _c("azure", 5), _c("azure", 6), _c("azure", 8)),
    gilt=(_c("brass", 3), _c("brass", 4), _c("brass", 5), _c("brass", 7)),
    near=(_c("ink", 3), _c("ink", 5), _c("bone", 4), _c("bone", 6)),
    near_roof=(_c("azure", 1), _c("azure", 2), _c("azure", 3), _c("azure", 5)),
    leaf=(_c("moss", 1), _c("moss", 2), _c("moss", 3), _c("moss", 5)),
    gold=_c("brass", 5),
    window=_c("brass", 6),
    banner=(_c("azure", 2), _c("azure", 4), _c("brass", 5)),
    flame=(_c("brass", 6), _c("light", 0)),
    marble=(_c("bone", 3), _c("bone", 4), _c("bone", 5)),
    rail=(_c("bone", 2), _c("bone", 3), _c("bone", 4)),
    face=(_c("ink", 3), _c("ink", 5), _c("bone", 3), _c("bone", 5)),
    fore=(_c("ink", 3), _c("bone", 5)),
    wisp=(_c("bone", 6), _c("light", 0)),
    mist=(_c("azure", 7), _c("azure", 6), _c("azure", 5)),
    mist_base=93,
    haze_city=(_c("azure", 5), _c("azure", 6), _c("azure", 6), _c("azure", 7)),
    haze_city_y=(72, 78),
    haze_near=(_c("azure", 4), _c("azure", 5), _c("azure", 5), _c("azure", 6)),
    haze_near_y=(68, 74),
    haze_step=1,
    star=(_c("bone", 7), _c("bone", 7)),
)

# Torment is TARNISH: the heavenly city rotted. Soot and sepia marble, gold gone to verdigris and dull brown,
# the sea of clouds a heavy brown-grey smoke, a dirty amber glow low under a black sun. Violet belongs to the
# Rift alone here: the fracture in the sky, the crystals, the light in the cracks of the paving.
TORMENT = Grade(
    key="torment",
    sky=[_c("ink", 0), _c("leather", 0), _c("leather", 1), _c("leather", 2), _c("leather", 3), _c("brass", 2), _c("brass", 3), _c("brass", 3)],
    sky_end=100,
    sun=(_c("brass", 2), _c("brass", 4), _c("ink", 0)),
    streak=(_c("ink", 1), _c("leather", 1), _c("leather", 3)),
    sea_far=(_c("brass", 3), _c("bone", 2), _c("bone", 1)),
    sea_mid=(_c("bone", 3), _c("bone", 2), _c("bone", 1)),
    sea_low=(_c("bone", 2), _c("bone", 1), _c("bone", 0)),
    far_rock=(_c("leather", 0), _c("leather", 1), _c("leather", 2), _c("leather", 3)),
    far_stone=(_c("leather", 1), _c("leather", 2), _c("leather", 2), _c("leather", 4)),
    stone=(_c("ink", 1), _c("leather", 0), _c("leather", 1), _c("leather", 3)),
    roof=(_c("ink", 0), _c("ink", 1), _c("leather", 0), _c("leather", 2)),
    gilt=(_c("ink", 1), _c("moss", 1), _c("moss", 2), _c("brass", 2)),
    near=(_c("ink", 0), _c("ink", 1), _c("leather", 0), _c("leather", 2)),
    near_roof=(_c("ink", 0), _c("ink", 0), _c("ink", 1), _c("leather", 1)),
    leaf=(_c("ink", 0), _c("ink", 1), _c("leather", 0), _c("leather", 1)),
    gold=_c("brass", 2),
    window=_c("crimson", 4),
    banner=(_c("ink", 1), _c("skin", 1), _c("brass", 2)),
    flame=(_c("brass", 3), _c("brass", 4)),
    marble=(_c("bone", 1), _c("bone", 2), _c("bone", 3)),
    rail=(_c("leather", 1), _c("bone", 1), _c("bone", 2)),
    face=(_c("ink", 0), _c("leather", 0), _c("leather", 1), _c("bone", 1)),
    fore=(_c("ink", 0), _c("leather", 2)),
    wisp=(_c("bone", 2), _c("bone", 3)),
    mist=(_c("bone", 4), _c("bone", 3), _c("bone", 2)),
    mist_base=90,
    haze_city=(_c("bone", 2), _c("bone", 2), _c("bone", 3), _c("bone", 3)),
    haze_city_y=(50, 56),
    haze_near=(_c("bone", 1), _c("bone", 2), _c("bone", 2), _c("bone", 3)),
    haze_near_y=(54, 60),
    haze_step=-1,
    star=(_c("bone", 5), _c("brass", 4)),
    torment=True,
)

GRADES = {"normal": NORMAL, "torment": TORMENT}


def _h(r: str, i: int) -> str:
    return hex_of(color(r, i))


#: What moves in the air, run in real time by the strip. Normal: motes of light rising in the dawn and a few
#: feathers drifting down. Torment: ash and scorched feathers falling, the black sun breathing a dark tint,
#: dull amber sheet-lightning inside the smoke, and now and then the light failing.
ATMOSPHERE = {
    "normal": [
        {"fx": "particles", "count": 16, "color": [_h("light", 0), _h("brass", 7)], "vx": -5, "vy": -3, "sway": 3, "alpha": 0.55, "ymax": 112, "front": False},
        {"fx": "particles", "count": 5, "color": _h("light", 0), "vx": -16, "vy": 10, "sway": 7, "len": 2, "alpha": 0.6, "ymax": 122},
    ],
    "torment": [
        {"fx": "particles", "count": 64, "color": [_h("ink", 1), _h("bone", 5), _h("ink", 1), _h("bone", 4)], "vx": -12, "vy": 24, "sway": 4, "len": 2,
         "alpha": 0.55, "ymax": 126},
        {"fx": "pulse", "color": _h("ink", 0), "period": 5600, "alpha": 0.2},
        {"fx": "lightning", "every": [3800, 9500], "flash": _h("brass", 4), "alpha": 0.3},
        {"fx": "flicker", "every": [7000, 15000], "dur": 240, "color": _h("ink", 0), "alpha": 0.3},
    ],
}


# ------------------------------------------------------------------------------------- helpers
def _pts(shape) -> set[tuple[int, int]]:
    """Pixels of a shape, rasterised so that it may hang over either edge of the layer (it wraps)."""
    return {(x - W, y) for (x, y) in rasterize(_shift(shape, W), W * 3, H)}


def _solid(img: Image.Image, shape, t: Tones, round_: bool = True, y_max: int = H) -> set[tuple[int, int]]:
    """A block of stone lit from the right. Round (towers, columns, domes): each row is shaded across its width
    — deep shadow, shadow, body, lit. Flat (walls, slabs): body with a lit top and right edge and a shadowed
    left edge and underside."""
    deep, shadow, body, lit = t
    pts = _pts(shape)
    if round_:
        rows: dict[int, list[int]] = {}
        for (x, y) in pts:
            rows.setdefault(y, []).append(x)
        for y, xs in rows.items():
            if y >= y_max:
                continue
            xs.sort()
            start = 0
            for i in range(1, len(xs) + 1):
                if i == len(xs) or xs[i] != xs[i - 1] + 1:
                    run = xs[start:i]
                    n = len(run)
                    for j, x in enumerate(run):
                        u = j / max(1, n - 1)
                        c = lit if (j == n - 1 and n > 1) else deep if (u < 0.14 and n > 5) else shadow if u < 0.42 else body
                        if (x, y - 1) not in pts and n > 3 and u > 0.42:
                            c = lit
                        put(img, x, y, c)
                    start = i
    else:
        for (x, y) in pts:
            if y >= y_max:
                continue
            if (x, y - 1) not in pts or (x + 1, y) not in pts:
                c = lit
            elif (x - 1, y) not in pts or (x, y + 1) not in pts:
                c = shadow
            else:
                c = body
            put(img, x, y, c)
    return pts


#: Palette tone → (ramp, index), to step a tone lighter or darker along its ramp.
_WHERE: dict[Color, tuple[str, int]] = {color(r, i): (r, i) for r, tones in RAMPS.items() for i in range(len(tones))}


def _haze(img: Image.Image, start: int, full: int, tones: Tones, step: int) -> None:
    """From `start` down, redraws what is on the layer in four close tones, by how light each pixel was: the
    forms stay, their contrast goes — stone in shadow, seen through haze. Between `start` and `full` the
    tones are one `step` along their ramps towards what is above (lighter in the dawn, darker in the soot), so
    the haze comes on in two flat bands, with no dithering."""
    edge = tuple(color(_WHERE[c][0], _WHERE[c][1] + step) for c in tones)
    px = img.load()
    for y in range(max(0, start), H):
        t = tones if y >= full else edge
        for x in range(W):
            r, g_, b, a = px[x, y]
            if a:
                lum = 0.3 * r + 0.59 * g_ + 0.11 * b
                px[x, y] = (*(t[0] if lum < 62 else t[1] if lum < 118 else t[2] if lum < 184 else t[3]), 255)


def _billows(img: Image.Image, rng: random.Random, base: float, n: int, tones: tuple[Color, Color, Color], y_end: int,
             r_min: float, r_max: float, amp: float) -> None:
    """A row of the sea of clouds: a rolling bank with heaped billows, each one lit on its upper right and
    shaded in its lower left, so the bank has volume."""
    lit, body, shade = tones
    f = periodic(W, rng, [(1, amp), (3, amp * 0.7), (5, amp * 0.4)])
    for x in range(W):
        for y in range(int(round(base + f(x) + 3)), y_end):
            put(img, x, y, body)
    puffs = []
    for _ in range(n):
        cx, r = rng.uniform(0, W), rng.uniform(r_min, r_max)
        puffs.append((base + f(cx) + r * 0.4 + rng.uniform(-1.5, 2.5), cx, r))
    for cy, cx, r in sorted(puffs):
        for dy in range(-int(r) - 1, int(r) + 2):
            y = int(cy + dy)
            if y >= y_end:
                continue
            for dx in range(-int(r) - 1, int(r) + 2):
                if dx * dx + dy * dy > r * r:
                    continue
                s = (dx * 0.6 - dy * 0.8) / r
                put(img, int(cx + dx), y, lit if s > 0.52 else shade if s < -0.5 else body)


def _streak(img: Image.Image, rng: random.Random, cx: float, cy: float, length: float, tones: tuple[Color, Color, Color]) -> None:
    top, body, lit = tones
    shape = ellipse(cx, cy, length / 2, rng.uniform(1.4, 2.6))
    for _ in range(3):
        shape = shape | ellipse(cx + rng.uniform(-length / 2, length / 2), cy + rng.uniform(-2, 2), rng.uniform(8, length / 2.4), rng.uniform(1.2, 3.0))
    pts = _pts(shape)
    for (x, y) in pts:
        put(img, x, y, lit if (x, y + 1) not in pts else (top if (x, y - 1) not in pts else body))


def _banner(img: Image.Image, g: Grade, x: int, y: int, wide: int, length: int) -> None:
    """A hanging banner, swallow-tailed, moving a little: a gold bar, the cloth with its shadowed fold, a star."""
    shadow, cloth, trim = g.banner
    for j in range(length):
        sway = int(round(1.2 * math.sin(j / 4.5 + x)))
        for dx in range(wide):
            if j >= length - 3 and abs(dx - (wide - 1) / 2) < (j - (length - 4)) * 0.9:
                continue
            if g.torment and (dx * 7 + j * 3 + x) % 5 == 0 and j > length // 3:
                continue  # torn
            put(img, x + dx + sway, y + j, shadow if dx < wide // 3 else cloth)
    for dx in range(-1, wide + 1):
        put(img, x + dx, y, trim)
    cx, cy = x + wide // 2, y + length // 2 - 1
    for dx, dy in ((0, 0), (0, -1), (0, 1), (-1, 0), (1, 0)):
        put(img, cx + dx, cy + dy, trim)


def _finial(img: Image.Image, g: Grade, x: int, y: int) -> None:
    for dy in range(0, 4):
        put(img, x, y - dy, g.gold)
    put(img, x - 1, y - 2, g.gold)
    put(img, x + 1, y - 2, g.gold)


# ------------------------------------------------------------------------------------- layers
def sky(g: Grade, rng: random.Random) -> Image.Image:
    img = blank(W, H)
    vertical_gradient(img, g.sky, 0, g.sky_end, curve=0.9)
    px = img.load()
    for y in range(g.sky_end, H):
        for x in range(W):
            px[x, y] = (*g.sea_far[1], 255)
    # The last stars of the night, high up (in Torment they never set).
    for _ in range(90 if g.torment else 18):
        x, y = rng.randrange(W), rng.randrange(0, 76 if g.torment else 24)
        px[x, y] = (*g.star[rng.random() < 0.4], 255)
    sx, sy = 322, 89
    if g.torment:
        _rift(img, rng)
    else:
        # Long rays fanning out from the sun: each brightens the sky it crosses by one tone.
        rays = [(-171, 2.0), (-157, 3.2), (-139, 2.2), (-121, 3.8), (-102, 2.4), (-84, 3.4), (-64, 2.2), (-45, 3.6), (-26, 2.2), (-10, 2.6)]
        for y in range(0, g.sky_end):
            for x in range(W):
                dx, dy = x - sx, y - sy
                if dx * dx + dy * dy < 30 * 30:
                    continue
                a = math.degrees(math.atan2(dy, dx))
                if any(abs(a - ra) < rw for ra, rw in rays):
                    c = tuple(px[x, y][:3])
                    if c in LIGHTER:
                        px[x, y] = (*LIGHTER[c], 255)
    # The sun breaking over the horizon: two halo rings, the disc (an eclipse in Torment).
    halo, ring, disc = g.sun
    for r, c in ((30, halo), (23, ring), (17, disc)):
        for (x, y) in rasterize(circle(sx, sy, r), W, H):
            if r == 30 and (x + y) % 2:
                continue  # the outer halo is a veil, not a disc
            px[x, y] = (*c, 255)
    if g.torment:
        for (x, y) in rasterize(circle(sx, sy, 19), W, H):
            if (x, y) not in rasterize(circle(sx, sy, 17), W, H):
                px[x, y] = (*ring, 255)
    # The far edge of the sea of clouds, lit gold from behind, closes the horizon.
    _billows(img, rng, 99, 44, g.sea_far, H, 3.0, 7.0, 1.6)
    return img


def clouds(g: Grade, rng: random.Random) -> Image.Image:
    """High streaks catching the first light; the sea of clouds rolling under the city; the cloud under the walkway."""
    img = blank(W, H)
    for _ in range(7):
        _streak(img, rng, rng.uniform(0, W), rng.uniform(14, 58), rng.uniform(34, 90), g.streak)
    _billows(img, rng, 107, 26, g.sea_mid, 142, 6.0, 12.0, 2.4)
    _billows(img, rng, 136, 30, g.sea_low, H, 5.0, 11.0, 2.6)
    return img


def far_islands(g: Grade, rng: random.Random) -> Image.Image:
    """Islands of rock hanging in the air, far off, with spires and domes on them; a long bridge between two;
    cloud pouring off their edges."""
    img = blank(W, H)
    spots = [(70, 78, 30), (200, 64, 22), (414, 86, 24), (500, 66, 30), (574, 90, 16)]
    # The bridge first, so the islands' rock overlaps its ends.
    (ax, ay, ah), (bx, by_, bh) = spots[0], spots[1]
    if not g.torment:
        deck = polygon([(ax + ah * 0.5, ay - 1), (bx - bh * 0.5, by_ - 1), (bx - bh * 0.5, by_ + 2), (ax + ah * 0.5, ay + 2)])
        _solid(img, deck, g.far_stone, round_=False)
        n = 7
        for i in range(1, n):
            t = i / n
            x, y = ax + ah * 0.5 + (bx - bh * 0.5 - ax - ah * 0.5) * t, ay + (by_ - ay) * t + 2
            for j in range(int(6 + 10 * math.sin(math.pi * t))):
                put(img, int(x), int(y) + j, g.far_stone[1])
    for cx, top, half in spots:
        # Rock: flat on top, hanging down to ragged points.
        pts = [(cx - half, top), (cx + half, top)]
        n = rng.randint(4, 6)
        for k in range(n):
            t = 1 - (k + 0.5) / n
            pts.append((cx + half * (2 * t - 1) * rng.uniform(0.55, 0.9), top + rng.uniform(4, 7) + (1 - abs(2 * t - 1)) * rng.uniform(8, 18)))
        rock = _solid(img, polygon(pts), g.far_rock)
        for (a, b) in rock:
            if b > top + 7 + 2.5 * math.sin(a * 0.7) and (a + 1, b) in rock:
                put(img, a, b, g.far_rock[0] if (a - 2, b) not in rock or b > top + 14 else g.far_rock[1])
        for x in range(int(cx - half), int(cx + half) + 1):
            put(img, x, int(top), g.far_stone[3])
            put(img, x, int(top) + 1, g.far_stone[2])
        # What stands on it.
        k_max = 2 if g.torment else 4
        for k in range(rng.randint(2, k_max)):
            sx = cx + (k - 1.2) * half * 0.45 + rng.uniform(-2, 2)
            sh, sw = rng.uniform(9, 22), rng.uniform(1.8, 3.2)
            if g.torment and rng.random() < 0.6:
                _solid(img, polygon([(sx - sw, top), (sx + sw, top), (sx + sw, top - sh * 0.4), (sx, top - sh * 0.55), (sx - sw, top - sh * 0.3)]), g.far_stone)
            elif k % 3 == 1:
                _solid(img, rect(sx - sw - 1, top - sh * 0.45, sx + sw + 1, top) | circle(sx, top - sh * 0.45, sw + 1), g.far_stone)
                put(img, int(sx), int(top - sh * 0.45 - sw - 2), g.far_stone[3])
            else:
                _solid(img, polygon([(sx - sw, top), (sx + sw, top), (sx + sw, top - sh * 0.7), (sx, top - sh), (sx - sw, top - sh * 0.7)]), g.far_stone)
        # Cloud pouring off the edge and thinning as it falls.
        fx = int(cx - half * rng.uniform(0.5, 0.85))
        for j in range(int(rng.uniform(14, 26))):
            x = fx + int(0.8 * math.sin(j / 3.0))
            if j < 9 or j % 2 == 0:
                put(img, x, int(top) + 1 + j, g.sea_mid[0])
            if j < 6:
                put(img, x + 1, int(top) + 1 + j, g.sea_mid[1])
    return img


def citadel(g: Grade, rng: random.Random) -> Image.Image:
    """The city, each building its own shape: a bell tower, the great dome, twin spires joined by a bridge, a
    triumphal gate, a tiered tower, a small domed hall. They stand in a bank of cloud."""
    img = blank(W, H)
    st, rf = g.stone, g.roof
    deep, shadow = st[0], st[1]
    base = 126
    broken = g.torment

    def slits(x: float, y0: float, y1: float, half: float, step: int = 9) -> None:
        for wy in range(int(y0), int(y1), step):
            for wx in (-half * 0.4, half * 0.45):
                lit = rng.random() < (0.1 if broken else 0.3)
                put(img, int(x + wx), wy, g.window if lit else deep)
                put(img, int(x + wx), wy + 1, g.window if lit else deep)

    def band(x: float, y: float, half: float) -> None:
        for bx in range(int(x - half) + 1, int(x + half)):
            put(img, bx, int(y), g.gold)

    def spire(x: float, top: float, half: float, cap: float) -> None:
        """A tower with a tall pointed roof (snapped off in Torment)."""
        _solid(img, rect(x - half, top, x + half, base), st)
        _solid(img, rect(x - half - 1.5, top - 2, x + half + 1.5, top + 1), st, round_=False)
        if broken and rng.random() < 0.6:
            _solid(img, polygon([(x - half, top), (x - half, top - cap * 0.4), (x - half * 0.2, top - cap * 0.15), (x + half * 0.4, top - cap * 0.3), (x + half, top)]), st)
        else:
            _solid(img, polygon([(x - half - 1, top - 2), (x + half + 1, top - 2), (x + 0.5, top - cap), (x - 0.5, top - cap)]), rf)
            _finial(img, g, int(x), int(top - cap))
        band(x, top + 3, half)
        slits(x, top + 8, 104, half)

    # Bell tower: tall, an open belfry under a pointed roof.
    x = 62
    _solid(img, rect(x - 9, 46, x + 9, base), st)
    _solid(img, rect(x - 11, 43, x + 11, 47), st, round_=False)
    for ox in (-4, 4):  # belfry arches
        for (a, b) in rasterize(rect(x + ox - 2, 52, x + ox + 2, 62) | circle(x + ox, 52, 2), W, H):
            put(img, a, b, deep)
    put(img, x, 58, g.gold)
    put(img, x, 59, g.gold)
    if broken:
        _solid(img, polygon([(x - 9, 46), (x - 9, 36), (x - 3, 42), (x + 2, 38), (x + 9, 46)]), st)
    else:
        _solid(img, polygon([(x - 11, 43), (x + 11, 43), (x + 0.5, 16), (x - 0.5, 16)]), rf)
        _finial(img, g, x, 16)
    band(x, 65, 9)
    slits(x, 72, 104, 9)

    # The great dome on its drum, a lantern on top, two slim towers flanking it.
    x = 168
    for ox in (-34, 34):
        spire(x + ox, 62, 4, 22)
    _solid(img, rect(x - 28, 86, x + 28, base), st)
    _solid(img, rect(x - 31, 84, x + 31, 88), st, round_=False)
    _solid(img, rect(x - 22, 72, x + 22, 85), st)
    for cx in range(x - 18, x + 20, 6):  # the drum's windows
        put(img, cx, 76, deep)
        put(img, cx, 77, deep)
        put(img, cx, 78, g.window if (cx // 6) % 2 and not broken else deep)
    band(x, 73, 22)
    dome = circle(x, 72, 22) - rect(x - 30, 72, x + 30, 100)
    if broken:
        dome = dome - polygon([(x + 2, 46), (x + 26, 46), (x + 26, 72), (x + 10, 72), (x + 6, 60)])
    _solid(img, dome, g.gilt)
    for k in (-14, -7, 0, 7, 14):  # ribs
        for (a, b) in _pts(dome):
            if abs(a - (x + k * math.sqrt(max(0.0, 1 - ((72 - b) / 22) ** 2)))) < 0.5:
                put(img, a, b, g.gilt[1])
    if not broken:
        _solid(img, rect(x - 3, 43, x + 3, 51) | circle(x, 43, 3), st)
        _finial(img, g, x, 40)

    # Twin spires, one taller, joined high up by a bridge on an arch.
    spire(262, 44, 5, 26)
    spire(296, 58, 5, 20)
    if not broken:
        br = rect(266, 70, 292, 75) - circle(279, 78, 6)
        _solid(img, br, st, round_=False)

    # The triumphal gate: two piers, a round arch, an attic with a gilded group on top; a banner hangs in it.
    x = 372
    gate = rect(x - 24, 70, x + 24, base) - (rect(x - 9, 88, x + 9, base) | circle(x, 88, 9))
    _solid(img, gate, st, round_=False)
    _solid(img, rect(x - 26, 66, x + 26, 71), st, round_=False)
    for (a, b) in _pts(circle(x, 88, 11) - circle(x, 88, 9) - rect(x - 12, 88, x + 12, 100)):
        put(img, a, b, st[3])
    for ox in (-17, 17):  # engaged columns
        _solid(img, rect(x + ox - 2, 72, x + ox + 2, base), st)
    band(x, 73, 24)
    if not broken:
        for (a, b) in _pts(polygon([(x - 9, 66), (x + 9, 66), (x + 5, 60), (x + 7, 56), (x + 2, 59), (x, 53), (x - 3, 59), (x - 8, 57), (x - 5, 61)])):
            put(img, a, b, g.gilt[2] if a > x - 2 else g.gilt[1])
        _banner(img, g, x - 3, 80, 7, 16)

    # A tiered tower: three storeys stepping in, each with its cornice.
    x = 458
    for half, top, bot in ((13, 78, base), (9, 58, 78), (6, 40, 58)):
        if broken and top == 40:
            _solid(img, polygon([(x - 6, 58), (x - 6, 48), (x - 1, 53), (x + 3, 46), (x + 6, 58)]), st)
            continue
        _solid(img, rect(x - half, top, x + half, bot), st)
        _solid(img, rect(x - half - 2, top - 2, x + half + 2, top + 1), st, round_=False)
        band(x, top + 3, half)
        slits(x, top + 7, bot - 3, half, 8)
    if not broken:
        _solid(img, polygon([(x - 8, 38), (x + 8, 38), (x + 0.5, 22), (x - 0.5, 22)]), rf)
        _finial(img, g, x, 22)

    # A domed hall with a blue dome, and a last slim tower closing the round.
    x = 540
    _solid(img, rect(x - 16, 84, x + 16, base), st)
    _solid(img, rect(x - 18, 82, x + 18, 86), st, round_=False)
    _solid(img, circle(x, 83, 13) - rect(x - 20, 83, x + 20, 100), rf)
    if not broken:
        _finial(img, g, x, 70)
    band(x, 88, 16)
    slits(x, 93, 106, 16)
    spire(590, 54, 4, 20)

    # The city's lower storeys are in shadow and haze, and its feet in a bank of mist: a calm, even band
    # behind the fighters.
    _haze(img, *g.haze_city_y, g.haze_city, g.haze_step)
    _billows(img, rng, g.mist_base, 38, g.mist, 128, 4.0, 8.0, 1.8)
    return img


def terrace(g: Grade, rng: random.Random) -> Image.Image:
    """Close behind the walkway, on a low terrace wall: a colonnade with banners, a winged statue on its
    pedestal, a round pavilion, cypresses, a gate with a great hanging banner, a brazier pillar."""
    img = blank(W, H)
    nt, nr = g.near, g.near_roof
    wall = 112  # top of the terrace wall
    broken = g.torment

    def column(x: int, top: int, bot: int = wall) -> None:
        _solid(img, rect(x - 2.5, top, x + 2.5, bot), nt)
        _solid(img, rect(x - 4, top - 2, x + 4, top + 1), nt, round_=False)
        _solid(img, rect(x - 4, bot - 2, x + 4, bot), nt, round_=False)

    def cypress(x: float, top: float, half: float) -> None:
        if broken:
            for j in range(int(wall - top)):  # a dead trunk
                put(img, int(x + 0.6 * math.sin(j / 5.0)), int(top) + j, g.leaf[1])
            return
        _solid(img, ellipse(x, (top + wall) / 2, half, (wall - top) / 2) | polygon([(x - half * 0.6, top + 8), (x + half * 0.6, top + 8), (x, top - 3)]), g.leaf)

    # 1. A colonnade: five columns under an entablature, banners between them.
    x0, n, step, top = 26, 5, 19, 70
    x1 = x0 + step * (n - 1)
    for i in range(n):
        gone = broken and i in (1, 3)
        column(x0 + i * step, top if not gone else top + rng.randint(12, 28))
        if not gone and i in (0, 2) and not (broken and i == 0):
            _banner(img, g, x0 + i * step + 6, top + 3, 7, 18)
    if broken:
        _solid(img, rect(x0 - 6, top - 8, x0 + 6, top - 1), nt, round_=False)
        _solid(img, rect(x0 + 2 * step - 7, top - 8, x1 + 6, top - 1), nt, round_=False)
    else:
        _solid(img, rect(x0 - 6, top - 9, x1 + 6, top - 1), nt, round_=False)
        for x in range(x0 - 4, x1 + 5, 3):
            put(img, x, top - 5, g.gold)

    # 2. A winged guardian on a pedestal, spear in hand.
    x = 168
    _solid(img, rect(x - 8, 100, x + 8, wall) | rect(x - 6, 92, x + 6, 100), nt, round_=False)
    if broken:
        _solid(img, polygon([(x - 3, 92), (x + 3, 92), (x + 3, 84), (x, 80), (x - 2, 85)]), nt)
    else:
        body = capsule(x, 91, x, 76, 2.6) | circle(x, 71, 2.6) | polygon([(x - 2, 78), (x - 14, 62), (x - 12, 74), (x - 8, 82)]) | polygon([(x + 2, 78), (x + 12, 64), (x + 10, 75), (x + 6, 82)])
        _solid(img, body, nt)
        for j in range(34):  # the spear
            put(img, x + 6, 92 - j, g.gold if j > 29 else nt[1])

    # 3. A round pavilion: four columns, a blue cupola.
    x = 264
    for ox in (-15, -5, 5, 15):
        column(x + ox, 80)
    _solid(img, rect(x - 19, 73, x + 19, 79), nt, round_=False)
    cup = circle(x, 74, 17) - rect(x - 20, 74, x + 20, 100)
    if broken:
        cup = cup - polygon([(x - 2, 54), (x + 20, 54), (x + 20, 74), (x + 6, 74)])
    else:
        _finial(img, g, x, 56)
    _solid(img, cup, nr)
    for xx in range(x - 17, x + 18, 3):
        put(img, xx, 76, g.gold)

    # 4. Cypresses and a clipped hedge.
    cypress(324, 66, 5.0)
    cypress(338, 78, 4.0)
    if not broken:
        _solid(img, rect(346, 104, 372, wall) | circle(352, 104, 3) | circle(360, 103, 4) | circle(367, 104, 3), g.leaf, round_=False)

    # 5. A gate: two piers, a round arch, a pediment; a great banner hangs in the opening.
    x = 426
    gate = rect(x - 22, 66, x + 22, wall) - (rect(x - 11, 82, x + 11, wall) | circle(x, 82, 11))
    _solid(img, gate, nt, round_=False)
    for ox in (-17, 17):
        _solid(img, rect(x + ox - 3, 68, x + ox + 3, wall), nt)
    if not broken:
        _solid(img, polygon([(x - 25, 66), (x + 25, 66), (x, 52)]), nt, round_=False)
        for (a, b) in _pts(circle(x, 61, 2.4)):
            put(img, a, b, g.gold)
    _solid(img, rect(x - 25, 64, x + 25, 68), nt, round_=False)
    _banner(img, g, x - 5, 74, 11, 12 if broken else 26)

    # 6. A brazier pillar, burning, and one more cypress.
    x = 508
    _solid(img, polygon([(x - 5, wall), (x + 5, wall), (x + 3, 78), (x - 3, 78)]), nt)
    _solid(img, polygon([(x - 6, 78), (x + 6, 78), (x + 4, 73), (x - 4, 73)]), nt, round_=False)
    if not broken:
        for dx, dy, c in ((0, 72, g.flame[0]), (-1, 71, g.flame[0]), (1, 71, g.flame[0]), (0, 70, g.flame[1]), (0, 69, g.flame[1]), (1, 68, g.flame[0]),
                          (-2, 72, g.gold), (2, 72, g.gold), (0, 71, g.flame[1]), (0, 66, g.flame[0])):
            put(img, x + dx, dy, c)
    cypress(556, 70, 5.0)
    cypress(580, 84, 3.6)

    # The terrace wall they all stand on: a coping, a plain face.
    for x in range(W):
        for y in range(wall, 126):
            put(img, x, y, nt[3] if y == wall else nt[1] if y == wall + 1 else nt[2] if y < 121 else nt[1])
    # In shadow from the waist down: the terrace is the nearest thing behind the fighters.
    _haze(img, *g.haze_near_y, g.haze_near, g.haze_step)
    return img


def ground(g: Grade, rng: random.Random) -> Image.Image:
    """A low parapet, the marble walkway the party walks on, and the bridge that carries it: cornice, frieze,
    corbels, and arches open to the cloud below."""
    img = blank(W, H)
    dark, body, light = g.marble
    shade, rail, lit = g.rail
    path_top, path_bot = PATH_Y - 6, PATH_Y + 5
    # Parapet: a solid low wall with a cap; quiet, so it does not fight the fighters' legs.
    cap_y = path_top - 10
    for x in range(W):
        if g.torment and (x // 43) % 4 == 2 and (x % 43) > 6:
            continue  # a stretch has fallen
        put(img, x, cap_y, lit)
        put(img, x, cap_y + 1, rail)
        for y in range(cap_y + 2, path_top - 1):
            put(img, x, y, rail if (x % 30) else shade)  # panel joints
        put(img, x, path_top - 1, shade)
    for i in range(0, W, 90):  # posts, each with a small gold finial
        x0 = i + 44
        if g.torment and (i // 90) % 3 == 1:
            continue
        for y in range(cap_y - 3, path_top):
            for dx in range(-3, 4):
                put(img, x0 + dx, y, lit if (dx == 3 or y == cap_y - 3) else shade if dx == -3 else rail)
        _finial(img, g, x0, cap_y - 4)
    # Paving: light along the far edge, darker towards the lip; slab joints; an inlaid gold line.
    for x in range(W):
        for y in range(path_top, path_bot + 1):
            t = (y - path_top) / (path_bot - path_top)
            put(img, x, y, dither_pick([light, body, body, dark], t, x, y))
    for x in range(0, W, 40):
        off = rng.randint(-2, 2)
        for y in range(path_top + 2, path_bot):
            put(img, x + off + (1 if y > PATH_Y else 0), y, dark)
    for x in range(W):
        if (x // 5) % 6 != 0:
            put(img, x, path_top + 1, g.gold if not g.torment else dark)
    for _ in range(40):  # wear
        x, y = rng.randrange(W), rng.randrange(path_top + 3, path_bot)
        put(img, x, y, light)
        put(img, x + 1, y, dark)
    if g.torment:
        for _ in range(9):  # cracks across the slabs, the Rift's light in them
            x, y = rng.randrange(W), path_top + 1
            while y < path_bot:
                put(img, x, y, _c("violet", 7))
                x += rng.choice((-1, 0, 1, 1))
                y += 1
    # The bridge under the walkway. Lip and cornice, a frieze with a gold key pattern, then the arcade.
    deep, fshadow, fbody, flit = g.face
    for x in range(W):
        put(img, x, path_bot + 1, lit)
        put(img, x, path_bot + 2, fbody)
        put(img, x, path_bot + 3, fshadow)
        for y in range(path_bot + 4, path_bot + 9):
            put(img, x, y, fbody)
        put(img, x, path_bot + 9, flit)
        put(img, x, path_bot + 10, fshadow)
    for x in range(W):  # key pattern
        k = x % 8
        y0 = path_bot + 5
        if k < 5:
            put(img, x, y0, g.gold)
        if k in (0, 4):
            put(img, x, y0 + 1, g.gold)
        if k >= 4:
            put(img, x, y0 + 2, g.gold)
    span, pier = 60, 9
    spring = path_bot + 11
    r = span / 2 - pier

    def opening(x: float, y: float, grow: float = 0.0) -> bool:
        d = abs(x - ((x // span) * span + span / 2))
        return d < r + grow and (y >= spring + r or (y - (spring + r)) ** 2 + d * d < (r + grow) ** 2)

    for x in range(W):
        for y in range(spring, H):
            if opening(x, y):
                # Left clear so the cloud shows through; the left reveal of the arch is in deep shadow.
                if not opening(x - 3, y) or not opening(x - 3, y - 1):
                    put(img, x, y, deep if opening(x - 1, y) and not opening(x - 2, y - 1) or not opening(x - 2, y) else fshadow)
                continue
            t = (y - spring) / (H - spring)
            put(img, x, y, flit if opening(x, y, 1.5) else (fbody if t < 0.35 else fshadow if t < 0.75 else deep))
    for i in range(0, W, span):  # a corbel and a keystone per span, a buttress strip down each pier
        for j in range(5):
            for dx in range(-4 + j, 5 - j):
                put(img, i + dx, spring - 1 + j, flit if (j == 0 or dx == 4 - j) else fbody)
        for y in range(spring + 5, H):
            put(img, i + 3, y, fbody)
            put(img, i - 4, y, deep)
        kx = i + span // 2
        for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, 1)):
            put(img, kx + dx, spring + dy, g.gold)
    if g.torment:
        for _ in range(7):
            _crystal(img, rng.uniform(0, W), rng.choice([path_top - 1, rng.randrange(path_bot + 14, H - 4)]), rng)
    return img


def foreground(g: Grade, rng: random.Random) -> Image.Image:
    """Along the bottom edge: fallen column drums, a statue's head, a capital — dark framing shapes — and low
    wisps of cloud sliding past."""
    img = blank(W, H)
    body, rim = g.fore

    def sil(shape) -> set[tuple[int, int]]:
        pts = _pts(shape)
        for (x, y) in pts:
            put(img, x, y, rim if ((x, y - 1) not in pts or (x + 1, y) not in pts) else body)
        return pts

    kinds = ["drum", "head", "capital", "drum", "capital", "drum"]
    for i, kind in enumerate(kinds):
        x = i * W / 6 + rng.uniform(-24, 24) + 30
        base = H + 2
        if kind == "drum":
            w_, h_ = rng.uniform(9, 13), rng.uniform(8, 12)
            pts = sil(rect(x - w_, base - h_, x + w_, base) | ellipse(x, base - h_, w_, 2.6))
            for fx in range(int(x - w_) + 3, int(x + w_) - 1, 4):  # fluting
                for y in range(int(base - h_) + 4, H):
                    if (fx, y) in pts:
                        put(img, fx, y, g.face[0])
        elif kind == "head":
            r = rng.uniform(7, 9)
            sil(circle(x, base - r * 0.6, r) | polygon([(x + r * 0.7, base - r), (x + r * 1.5, base - r * 0.5), (x + r * 0.8, base - r * 0.2)])
                | polygon([(x - r, base - r), (x - r * 0.4, base - r * 2.0), (x + r * 0.2, base - r * 1.4)]))
        else:
            w_ = rng.uniform(10, 14)
            sil(rect(x - w_, base - 9, x + w_, base - 5) | rect(x - w_ * 0.7, base - 5, x + w_ * 0.7, base) | circle(x - w_, base - 6, 3) | circle(x + w_, base - 6, 3))
    wb, wl = g.wisp
    for _ in range(5):
        cx, cy = rng.uniform(0, W), rng.uniform(H - 12, H - 3)
        length = rng.uniform(36, 90)
        shape = ellipse(cx, cy, length / 2, rng.uniform(1.4, 2.6))
        for _ in range(2):
            shape = shape | ellipse(cx + rng.uniform(-length / 2, length / 2), cy + rng.uniform(-1.5, 1.5), rng.uniform(10, length / 2.6), rng.uniform(1.2, 2.4))
        pts = _pts(shape)
        for (x, y) in pts:
            put(img, x, y, wl if (x, y - 1) not in pts else wb)
    return img


LAYERS = (
    ("sky", sky, 0.0),
    ("clouds", clouds, 0.04),
    ("far", far_islands, 0.1),
    ("citadel", citadel, 0.22),
    ("terrace", terrace, 0.5),
    ("ground", ground, 1.0),
    ("fore", foreground, 1.35),
)


def build(grade: str, seed: int = 909) -> dict[str, Image.Image]:
    g = GRADES[grade]
    out: dict[str, Image.Image] = {}
    for i, (name, fn, _speed) in enumerate(LAYERS):
        out[name] = fn(g, random.Random(seed * 100 + i))
    return out
