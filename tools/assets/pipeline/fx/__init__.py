"""Ability effects of the battle strip: animated pixel art in the game's palette, drawn 1 art pixel = 1 strip pixel
like the figures (never scaled).

An effect is an `Fx`: a cell size, the point of the cell that sits on its attach point (`ax`, `ay` — the body's
centre on the ground line for most of them), a frame count with per-frame milliseconds, whether it loops, and a
`draw(cel, i, t)` that paints frame `i` (`t` runs 0→1 over the frames: for a loop it never reaches 1, so the last
frame leads back into the first). Every opaque pixel is a palette tone (rig.Cel); the game may show a whole effect
translucent, but nothing here blends.

A class's effects live in their own module (`fx/knight.py`, `fx/ranger.py`…) as a list `FX`; `ALL` gathers them.
`export-fx` (export_fx.py) bakes them into src/assets/strip/fx/.

Legibility: an effect must read on a pale dusk sky and on a black Torment one. Light shapes get a dark rim
(`rim`), dark shapes a light core; a lasting look leaves most of its cell empty so the fighter stays readable.
"""
from __future__ import annotations

import math
import random
from dataclasses import dataclass
from typing import Callable, Sequence

from ..rig import Cel, Tone, tone_rgb

Pt = tuple[float, float]


@dataclass
class Fx:
    key: str
    w: int
    h: int
    ax: int
    ay: int
    ms: list[int]
    loop: bool
    draw: Callable[[Cel, int, float], None]

    def frames(self) -> list[Cel]:
        n = len(self.ms)
        out = []
        for i in range(n):
            cel = Cel(self.w, self.h)
            self.draw(cel, i, i / n if self.loop else (i / (n - 1) if n > 1 else 0.0))
            out.append(cel)
        return out


# ----------------------------------------------------------------------------------------- primitives
def blob(cel: Cel, cx: float, cy: float, rx: float, ry: float, t: Tone) -> None:
    """A filled ellipse."""
    for j in range(int(math.floor(cy - ry)), int(math.ceil(cy + ry)) + 1):
        for i in range(int(math.floor(cx - rx)), int(math.ceil(cx + rx)) + 1):
            if ((i + 0.5 - cx) / max(rx, 0.01)) ** 2 + ((j + 0.5 - cy) / max(ry, 0.01)) ** 2 <= 1.0:
                cel.put(i, j, t)


def ring(cel: Cel, cx: float, cy: float, rx: float, ry: float, t: Tone, a0: float = 0.0, a1: float = 360.0, thick: float = 1.0,
         gap: Callable[[float], bool] | None = None) -> None:
    """An elliptical arc (degrees, clockwise from +x on screen). `gap(angle)` true leaves a hole."""
    steps = max(8, int((abs(a1 - a0) / 360.0) * 2 * math.pi * max(rx, ry) * 2.2))
    for s in range(steps + 1):
        a = a0 + (a1 - a0) * s / steps
        if gap is not None and gap(a):
            continue
        ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
        k = 0.0
        while k < thick:
            cel.put(cx + ca * (rx - k), cy + sa * (ry - k * ry / max(rx, 0.01)), t)
            k += 0.5


def poly(cel: Cel, pts: Sequence[Pt], t: Tone) -> None:
    for xy in cel.poly_mask(pts):
        cel.put(xy[0], xy[1], t)


def flame(cel: Cel, x: float, base: float, height: float, width: float, tones: Sequence[Tone], sway: float = 0.0, seed: int = 0) -> None:
    """A tongue of fire standing on `base`: widest low, a pointed tip that leans by `sway`. `tones` run from the
    outside in (rim, body, core)."""
    rnd = random.Random(seed)
    h = max(1, int(round(height)))
    for j in range(h):
        f = j / max(1, h - 1)  # 0 at the base, 1 at the tip
        half = width / 2 * (1.0 - f**1.6) * (0.75 + 0.25 * math.sin(f * 5.0 + seed))
        cx = x + sway * f * f + (rnd.random() - 0.5) * 0.4
        y = base - j
        i0, i1 = int(math.floor(cx - half)), int(math.ceil(cx + half))
        for i in range(i0, i1 + 1):
            d = abs(i + 0.5 - cx) / max(half, 0.5)
            if d > 1.0:
                continue
            k = 0 if d > 0.62 or f > 0.82 else 1 if d > 0.3 or f > 0.5 else 2
            cel.put(i, y, tones[min(k, len(tones) - 1)])


def spark(cel: Cel, x: float, y: float, r: int, core: Tone = ("light", 0), tip: Tone = ("brass", 6)) -> None:
    """A four-point glint of radius `r` (0 = one pixel)."""
    cel.put(x, y, core)
    for i in range(1, r + 1):
        t = core if i <= r // 2 else tip
        for dx, dy in ((i, 0), (-i, 0), (0, i), (0, -i)):
            cel.put(x + dx, y + dy, t)
    if r >= 3:
        for dx, dy in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
            cel.put(x + dx, y + dy, tip)


def streak(cel: Cel, a: Pt, b: Pt, tones: Sequence[Tone]) -> None:
    """A line whose tone runs through `tones` from a to b (a comet: bright head, dim tail)."""
    n = max(1, int(math.hypot(b[0] - a[0], b[1] - a[1])))
    for s in range(n + 1):
        f = s / n
        cel.put(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, tones[min(len(tones) - 1, int(f * len(tones)))])


def rim(cel: Cel, t: Tone | None = None, only: Callable[[Tone], bool] | None = None) -> None:
    """A one-pixel dark edge around what is drawn (the darkest tone of the ramp it borders, or `t`): what keeps a
    pale effect readable on a pale sky. `only` limits it to pixels of some tones."""
    add: dict[tuple[int, int], Tone] = {}
    for (x, y), tone in cel.px.items():
        if only is not None and not only(tone):
            continue
        for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if n not in cel.px and 0 <= n[0] < cel.w and 0 <= n[1] < cel.h:
                dark = t if t is not None else ((tone[0] if tone[0] != "light" else "ink"), 1)
                if n not in add or sum(tone_rgb(dark)) < sum(tone_rgb(add[n])):
                    add[n] = dark
    cel.px.update(add)


def thin(cel: Cel, keep: float, seed: int = 0) -> None:
    """Drop pixels at random so that about `keep` of them stay: how a shape dissolves over its last frames
    (ordered by a fixed seed, so consecutive frames lose more of the SAME pixels instead of flickering)."""
    if keep >= 1.0:
        return
    rnd = random.Random(seed)
    order = {xy: rnd.random() for xy in sorted(cel.px)}
    for xy, r in order.items():
        if r > keep:
            del cel.px[xy]


def ease_out(t: float, p: float = 2.0) -> float:
    return 1.0 - (1.0 - max(0.0, min(1.0, t))) ** p


def ease_in(t: float, p: float = 2.0) -> float:
    return max(0.0, min(1.0, t)) ** p


def all_fx() -> list[Fx]:
    """Every effect of every module of this package that has an `FX` list, modules in name order — so a new
    module (a class, the enemies, the party's comings and goings) only has to exist to be exported."""
    import importlib
    import pkgutil

    out: list[Fx] = []
    for info in sorted(pkgutil.iter_modules(__path__), key=lambda m: m.name):
        mod = importlib.import_module(f"{__name__}.{info.name}")
        out += getattr(mod, "FX", [])
    keys = [f.key for f in out]
    assert len(keys) == len(set(keys)), "duplicate effect keys"
    return out
