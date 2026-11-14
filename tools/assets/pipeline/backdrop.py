"""Building blocks for side-view parallax backdrops.

Every layer is W px wide and tiles seamlessly: contours are sums of sines whose periods divide W, and
props are drawn at x and x ± W. Gradients use 4×4 ordered dithering between adjacent palette tones, so
the result stays inside the palette with no banding mush.
"""
from __future__ import annotations

import math
import random
from typing import Callable, Sequence

from PIL import Image

from .palette import Color

BAYER4 = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]


def blank(w: int, h: int) -> Image.Image:
    return Image.new("RGBA", (w, h), (0, 0, 0, 0))


#: Width of the dithered seam between two tones, as a fraction of a band (1 = dither the whole band).
#: The user asked for less visible dithering: flat bands with a narrow blended seam.
BLEND = 0.28


def dither_pick(colors: Sequence[Color], t: float, x: int, y: int, blend: float = BLEND) -> Color:
    """Colour at position t ∈ [0, 1] of a tone ramp: flat bands joined by a narrow dithered seam."""
    f = max(0.0, min(1.0, t)) * (len(colors) - 1)
    i = int(f)
    frac = max(0.0, min(1.0, (f - i - 0.5) / blend + 0.5))
    if i >= len(colors) - 1:
        return colors[-1]
    return colors[i + 1] if frac * 16 > BAYER4[y % 4][x % 4] + 0.5 else colors[i]


def vertical_gradient(img: Image.Image, colors: Sequence[Color], y0: int, y1: int, curve: float = 1.0, blend: float = BLEND) -> None:
    px = img.load()
    for y in range(max(0, y0), min(img.height, y1)):
        t = ((y - y0) / max(1, y1 - y0)) ** curve
        for x in range(img.width):
            c = dither_pick(colors, t, x, y, blend)
            px[x, y] = (*c, 255)


def periodic(w: int, rng: random.Random, terms: Sequence[tuple[int, float]]) -> Callable[[float], float]:
    """A seamless 1-D contour: Σ amp · sin(2π·k·x/W + φ) over (k, amp) terms."""
    phases = [rng.uniform(0, math.tau) for _ in terms]

    def f(x: float) -> float:
        return sum(a * math.sin(math.tau * k * x / w + p) for (k, a), p in zip(terms, phases))

    return f


def fill_below(img: Image.Image, contour: Callable[[float], float], color: Color, rim: Color | None = None, rim_w: int = 1, y_end: int | None = None) -> list[int]:
    """Fills from the contour down; `rim` paints the top `rim_w` pixels. Returns the top y per column."""
    px = img.load()
    tops: list[int] = []
    end = img.height if y_end is None else y_end
    for x in range(img.width):
        top = int(round(contour(x)))
        tops.append(top)
        for y in range(max(0, top), end):
            c = rim if rim is not None and y < top + rim_w else color
            px[x, y] = (*c, 255)
    return tops


def put(img: Image.Image, x: int, y: int, c: Color) -> None:
    """Sets a pixel, wrapping horizontally (tileable layers)."""
    w = img.width
    if 0 <= y < img.height:
        img.load()[x % w, y] = (*c, 255)


def stamp(img: Image.Image, sprite: Image.Image, x: int, y: int) -> None:
    """Alpha-composites a sprite with horizontal wrap-around."""
    w = img.width
    for dx in (-w, 0, w):
        if x + dx + sprite.width > 0 and x + dx < w:
            img.alpha_composite(sprite, (x + dx, y)) if x + dx >= 0 and y >= 0 else _paste_clip(img, sprite, x + dx, y)


def _paste_clip(img: Image.Image, sprite: Image.Image, x: int, y: int) -> None:
    sx0, sy0 = max(0, -x), max(0, -y)
    crop = sprite.crop((sx0, sy0, sprite.width, sprite.height))
    img.alpha_composite(crop, (max(0, x), max(0, y)))
