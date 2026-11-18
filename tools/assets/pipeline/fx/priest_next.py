"""DRAFTS for the lab (2026-11-18), not in `ALL` and not exported until the user approves them:

  the heals over time   hot_pulse (each 1 s pulse of a heal over time, on whoever it heals) · mend_wrap (Mend's lasting
                        look: one mint ribbon wound round the body, turning) · light_motes (Mending Light's: glints of
                        gold-mint light hanging round the head and shoulders) · sanctuary_glow2 (Sanctuary's, stronger)
  her casts             sigil_heal / sigil_ward / sigil_wrath (under her feet through the gesture of every ability of
                        hers: a ring of runes that kindles through the wind-up, flares at the release and throws a
                        column of light up her — mint for a heal, azure for a shield, white-gold for wrath; her basic
                        attacks never show it)

User, 2026-11-18: «hay sin duda que mejorar el efecto visual que deja en los aliados las curas en el tiempo» and «el
priest necesita una animación más obvia de cuando está lanzando una habilidad, ahora apenas se distingue».
"""
from __future__ import annotations

import math
import random

from pipeline.fx import Fx, ease_out, rim, ring, spark, thin
from pipeline.fx.priest import LIGHT, MINT, _petal, _ribbon
from pipeline.rig import Cel

GLASS = [("azure", 4), ("azure", 6), ("azure", 8)]
GOLD = [("brass", 4), ("brass", 6), ("brass", 7)]


def _cross(cel: Cel, x: float, y: float, tones) -> None:
    """A small + of light."""
    cel.put(x, y, LIGHT)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        cel.put(x + dx, y + dy, tones[2])


# ----------------------------------------------------------------------------------------- heals over time
def hot_pulse(cel: Cel, i: int, t: float) -> None:
    """One pulse of a heal over time: a band of mint light runs up the body from the feet to the chest, and two small
    crosses pop beside it — what says «this is healing you» once a second."""
    ax, base = 20, 52
    h = 6 + 34 * ease_out(t, 1.6)  # how far up the band has run
    rx = 11 - 2 * t
    tone = MINT[2] if i < 2 else MINT[1]
    ring(cel, ax, base - h, rx, rx * 0.3, tone, a0=10, a1=170, thick=1.2)  # the front half: the body stays readable
    if i < 4:
        ring(cel, ax, base - h, rx, rx * 0.3, MINT[0], a0=190, a1=350, thick=1.0, gap=lambda a: int(a) % 40 < 20)
    for k, (dx, born) in enumerate(((-12, 0.15), (11, 0.35))):
        if t >= born:
            f = (t - born) / (1 - born)
            _cross(cel, ax + dx, base - 22 - 12 * f - k * 4, MINT)
    if i >= 4:
        thin(cel, 1.0 - 0.5 * (i - 3) / 2, 5)
    rim(cel, ("sea", 2))


def mend_wrap(cel: Cel, i: int, t: float) -> None:
    """While Mend works: one ribbon of mint light wound round the body, turning slowly, its tip glinting; a petal
    lifts off it now and then (the old drift of petals, kept as an accent)."""
    ax, base = 20, 52
    _ribbon(cel, ax, base - 2, base - 40, 1.6, -t, 10.0, 1.0, MINT)
    f = (t * 2) % 1.0
    _petal(cel, ax + (8 if t < 0.5 else -8) + math.sin(f * 7) * 1.5, base - 30 - f * 14, int(t * 2))
    rim(cel, ("sea", 2))


def light_motes(cel: Cel, i: int, t: float) -> None:
    """While Mending Light works: four glints of gold-mint light hang round the head and shoulders, each swelling
    and fading in its turn."""
    ax, base = 20, 52
    spots = ((-9, 34), (9, 38), (-5, 44), (7, 28))
    for k, (dx, up) in enumerate(spots):
        f = (t + k / len(spots)) % 1.0
        r = int(round(2.4 * math.sin(f * math.pi)))
        y = base - up - 3 * f
        if r <= 0:
            cel.put(ax + dx, y, ("sea", 6))
            continue
        spark(cel, ax + dx, y, r, LIGHT, ("brass", 6) if k % 2 == 0 else ("sea", 8))
    rim(cel, ("ink", 1))


def sanctuary_glow2(cel: Cel, i: int, t: float) -> None:
    """While Sanctuary lasts (stronger than the first drawing): a double ring of mint light on the ground under each of
    them, a bright arc running round it, and rays standing up through the whole body."""
    ax, ay = 22, 50
    ring(cel, ax, ay, 19, 4.8, MINT[1], thick=1.4)
    ring(cel, ax, ay, 14, 3.4, MINT[0], thick=1.0)
    ring(cel, ax, ay, 19, 4.8, LIGHT, a0=t * 360, a1=60 + t * 360, thick=1.4)
    for k in range(6):
        x = ax - 15 + k * 6
        h = 12 + 10 * (0.5 + 0.5 * math.sin(math.tau * (t + k * 0.19)))
        y0 = ay - 1.5 - 3.6 * math.sqrt(max(0.0, 1 - ((x - ax) / 19) ** 2))
        for n in range(int(h)):
            if n % 3 == 2 and n > 4:
                continue
            cel.put(x, y0 - n, MINT[2] if n < h * 0.35 else MINT[1] if n < h * 0.7 else MINT[0])
    rim(cel, ("sea", 2))


# ----------------------------------------------------------------------------------------- her casts
def _sigil(cel: Cel, i: int, t: float, tones) -> None:
    """A ring of runes on the ground under her (ellipse round her feet) that kindles through the wind-up (t < 0.45),
    flares at the release with a column of light going up her, and fades."""
    ax, ay = 20, 52
    release = 0.45
    grow = ease_out(min(1.0, t / release), 1.4)
    rx = 6 + 10 * grow
    ry = rx * 0.3
    hot = t >= release and t < release + 0.2
    ring(cel, ax, ay, rx, ry, tones[2] if hot else tones[1], thick=1.4)
    # runes: short strokes standing on the ring, turning
    n = 8
    for k in range(n):
        a = math.radians(k * 360 / n + t * 120)
        x = ax + math.cos(a) * rx
        y = ay + math.sin(a) * ry
        tall = 2 if (k + i) % 2 == 0 else 1
        for d in range(tall + (1 if hot else 0)):
            cel.put(x, y - 1 - d, tones[2] if d == 0 else tones[1])
    # the gathering: motes drawn in from the ring to her feet before the release
    if t < release:
        rnd = random.Random(4)
        for k in range(6):
            a = rnd.random() * math.tau
            f = (t / release + k / 6) % 1.0
            cel.put(ax + math.cos(a) * rx * (1 - f), ay + math.sin(a) * ry * (1 - f) - 4 * f, tones[2])
    else:
        # the release: a pillar of light round her — two beams standing at her sides (the body stays in view
        # between them), motes rising inside, a glint at its top — then it thins out
        f = (t - release) / (1 - release)
        top = ay - 10 - 42 * ease_out(min(1.0, f * 2.4), 1.5)
        w = 9 if f < 0.25 else 8 if f < 0.5 else 7
        for y in range(int(top), int(ay)):
            for side in (-1, 1):
                cel.put(ax + side * w, y, LIGHT if f < 0.3 and (y - int(top)) < 12 else tones[2])
                if (y + i) % 2 == 0:
                    cel.put(ax + side * (w - 1), y, tones[1])
        rnd = random.Random(11)
        for k in range(7):
            yy = ay - 4 - ((rnd.random() + f * 1.6) % 1.0) * (ay - top - 4)
            cel.put(ax + (rnd.random() - 0.5) * (2 * w - 4), yy, tones[2] if k % 2 else LIGHT)
        if f < 0.35:
            spark(cel, ax, top, 4, LIGHT, tones[2])
        if f > 0.4:
            thin(cel, 1.0 - 0.9 * (f - 0.4) / 0.6, 9)
    rim(cel, (tones[0][0], 1))


def sigil_heal(cel: Cel, i: int, t: float) -> None:
    _sigil(cel, i, t, MINT)


def sigil_ward(cel: Cel, i: int, t: float) -> None:
    _sigil(cel, i, t, GLASS)


def sigil_wrath(cel: Cel, i: int, t: float) -> None:
    _sigil(cel, i, t, GOLD)


SIGIL_MS = [80, 80, 90, 90, 100, 110, 60, 70, 80, 90, 100, 110]

DRAFTS = [
    Fx("hot_pulse", 40, 56, 20, 52, [60, 60, 70, 70, 80, 90], False, hot_pulse),
    Fx("mend_wrap", 40, 56, 20, 52, [110] * 12, True, mend_wrap),
    Fx("light_motes", 40, 56, 20, 52, [110] * 10, True, light_motes),
    Fx("sanctuary_glow2", 44, 56, 22, 50, [120] * 10, True, sanctuary_glow2),
    Fx("sigil_heal", 40, 56, 20, 52, SIGIL_MS, False, sigil_heal),
    Fx("sigil_ward", 40, 56, 20, 52, SIGIL_MS, False, sigil_ward),
    Fx("sigil_wrath", 40, 56, 20, 52, SIGIL_MS, False, sigil_wrath),
]
