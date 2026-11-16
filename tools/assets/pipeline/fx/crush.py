"""The world boss's HEAVY blow (round 7, data/bossKit CRUSH) — the defence check every world boss swings from Inferno
on. It has its own look so it never reads as just another area blow:

The wind-up       crush_mark / crush_mark_magic (over the FRONT hero, frame by frame with the cast: a great weight
                  lowering out of the sky onto him, a seal tightening on the ground under his feet, arrows pressing
                  down — steel and brass for a boss whose blows are mostly steel, violet runes for a spell-heavy one:
                  what to brace with) · warn_rune / warn_rune_hot (the path behind him: a seam of runes — the magic
                  shock will run along it)
The blow          crush_impact / crush_impact_magic (the weight comes down on the front hero: a flash, the ground
                  cratered, shards thrown both ways) · crush_shock (the magic shock, a low violet ripple running back
                  through the party) · crush_trail (the sparks it leaves) · crush_zap (under each hero it reaches)

Drawn facing right like every effect; the game mirrors them for a foe — the shapes here are symmetric.
"""
from __future__ import annotations

import math
import random

from pipeline.fx import Fx, blob, ease_in, ease_out, rim, ring, spark, streak, thin
from pipeline.rig import Cel

LIGHT = ("light", 0)

# The two looks of the blow. `body` the weight (dark → light), `glow` its hot edge, `seal` the ring on the ground.
STEEL = {
    "body": [("ink", 2), ("ink", 4), ("ink", 6), ("ink", 8)],
    "glow": [("brass", 4), ("brass", 6), ("brass", 7)],
    "seal": [("brass", 3), ("brass", 5), ("brass", 7)],
    "dark": ("ink", 0),
}
ARCANE = {
    "body": [("violet", 1), ("violet", 3), ("violet", 5), ("violet", 7)],
    "glow": [("violet", 6), ("violet", 7), ("violet", 8)],
    "seal": [("violet", 4), ("violet", 6), ("violet", 8)],
    "dark": ("violet", 0),
}

MARK_W, MARK_H, MARK_AX, MARK_AY = 64, 104, 32, 100
MARK_FRAMES = 10  # one per tenth of the cast: the game picks the frame by how far the wind-up has gone


# ----------------------------------------------------------------------------------------- the wind-up
def _anvil_rows(cx: float, bottom: float) -> list[tuple[int, float, float, str]]:
    """The anvil's outline row by row, bottom up: (y, left, right, part). A wide flat top with its horn, a waist, broad
    feet — the oldest sign there is for a weight that crushes."""
    rows = []
    for k in range(19):
        y = int(bottom) - k
        if k < 4:  # the feet
            half = 12.0 - k * 0.6
            rows.append((y, cx - half, cx + half, "foot"))
        elif k < 10:  # the waist
            half = 6.5 + (k - 4) * 0.15
            rows.append((y, cx - half, cx + half, "waist"))
        else:  # the top, with its horn reaching out to one side and the heel square on the other
            f = (k - 10) / 8.0
            horn = 21.0 - 9.0 * abs(f - 0.55) * 2 if f < 0.95 else 13.0
            rows.append((y, cx - horn, cx + 13.0, "top" if k < 18 else "face"))
    return rows


def _weight(cel: Cel, cx: float, bottom: float, look: dict, hot: bool, i: int) -> None:
    """The weight coming down on the front hero: an anvil, its feet burning when it is about to land."""
    body, glow = look["body"], look["glow"]
    for y, left, right, part in _anvil_rows(cx, bottom):
        for x in range(int(math.floor(left)), int(math.ceil(right))):
            d = (x + 0.5 - left) / max(1.0, right - left)  # 0 at its left edge, 1 at its right
            tone = body[1] if d > 0.78 else body[2] if d > 0.3 else body[3] if part == "face" else body[2]
            if part == "face":
                tone = body[3]
            if part == "foot" and y >= int(bottom) - 1:  # what strikes
                tone = (LIGHT if (x + i) % 4 == 0 else glow[2]) if hot else glow[0]
            if part == "waist" and look is STEEL and (x + y) % 7 == 0:
                tone = body[1]  # pitting in the iron
            cel.put(x, y, tone)
    if look is ARCANE:  # a glyph burning in its waist
        gx, gy = cx, bottom - 7
        for dx, dy in ((0, 0), (-2, -1), (2, -1), (-2, 1), (2, 1), (0, -2), (0, 2)):
            cel.put(gx + dx, gy + dy, glow[2] if hot else glow[1])
    else:  # a brass band round its waist
        for x in range(int(cx - 6), int(cx + 7)):
            cel.put(x, bottom - 6, glow[1] if hot else glow[0])


def _chevrons(cel: Cel, cx: float, y0: float, n: int, look: dict, hot: bool, i: int) -> None:
    """Arrows pointing down between the weight and the hero: more of them, brighter, as it comes."""
    glow = look["glow"]
    for k in range(n):
        y = y0 + k * 5
        lit = hot and (k + i) % 2 == 0
        for s in range(5):
            tone = LIGHT if lit and s < 2 else glow[2] if s < 2 else glow[1]
            cel.put(cx - 5 + s, y + s * 0.6, tone)
            cel.put(cx + 5 - s, y + s * 0.6, tone)
        cel.put(cx, y + 3, LIGHT if lit else glow[2])


def _seal(cel: Cel, cx: float, base: float, p: float, look: dict, hot: bool, i: int) -> None:
    """The ring tightening on the ground under the hero: wide and faint at first, tight and burning at the last."""
    seal = look["seal"]
    rx = 26 - 12 * ease_out(p, 1.6)
    ry = rx * 0.28
    tone = seal[2] if hot else seal[1] if p > 0.35 else seal[0]
    ring(cel, cx, base - 2, rx, ry, tone, thick=2.0 if p > 0.5 else 1.0,
         gap=None if hot else (lambda a: int(a / 30) % 3 == 2))
    if p > 0.5:  # four ticks closing in on it
        for side in (-1, 1):
            x = cx + side * (rx + 4 - 3 * p)
            streak(cel, (x, base - 2), (x + side * 4, base - 2), [seal[2], seal[1]])
    if hot:
        for k in range(6):
            a = math.tau * k / 6 + i * 0.4
            spark(cel, cx + math.cos(a) * rx, base - 2 + math.sin(a) * ry, 0, LIGHT)


def _mark(cel: Cel, i: int, look: dict) -> None:
    p = i / (MARK_FRAMES - 1)  # how far the cast has gone
    hot = p >= 0.66
    cx, base = MARK_AX, MARK_AY
    bottom = 22 + 24 * ease_in(p, 1.4)  # from high in the sky to just over his head
    _weight(cel, cx, bottom, look, hot, i)
    if p > 0.2:
        _chevrons(cel, cx, bottom + 4, 1 + int(p * 2.5), look, hot, i)
    # the air under it pressed into streaks as it comes
    if p > 0.45:
        rnd = random.Random(i)
        for k in range(4):
            x = cx - 13 + k * 8.5 + rnd.randint(-1, 1)
            streak(cel, (x, bottom - 20), (x, bottom - 28 - 6 * p), [look["body"][2], look["body"][1]])
    _seal(cel, cx, base, p, look, hot, i)
    rim(cel, look["dark"])


def crush_mark(cel: Cel, i: int, t: float) -> None:
    _mark(cel, i, STEEL)


def crush_mark_magic(cel: Cel, i: int, t: float) -> None:
    _mark(cel, i, ARCANE)


def _rune_seam(cel: Cel, i: int, hot: bool) -> None:
    """The path behind the front hero: a seam with runes glowing in it — the shock's way back."""
    base = 13 if hot else 9
    y = base - 2
    for x in range(0, 24):
        on = (x * 5 + i * 3) % 9 != 0
        cel.put(x, y, (("violet", 8) if hot else ("violet", 6)) if on else ("violet", 4))
        cel.put(x, y + 1, ("violet", 4) if hot else ("violet", 3))
    # two glyphs standing over the seam, rising and fading as it burns
    for k, gx in enumerate((5, 16)):
        f = ((i + k * 3) % 6) / 6
        gy = base - 5 - (6 if hot else 3) * f
        tone = LIGHT if hot and f < 0.4 else ("violet", 7)
        for dx, dy in ((0, 0), (-1, -1), (1, -1), (0, -2)):
            cel.put(gx + dx, gy + dy, tone)
    rim(cel, ("violet", 1))


def warn_rune(cel: Cel, i: int, t: float) -> None:
    _rune_seam(cel, i, False)


def warn_rune_hot(cel: Cel, i: int, t: float) -> None:
    _rune_seam(cel, i, True)


# ----------------------------------------------------------------------------------------- the blow
def _impact(cel: Cel, i: int, t: float, look: dict) -> None:
    """The weight comes down on the front hero: a flash, the ground cratered both ways, shards and dust thrown."""
    ax, base = 48, 66
    body, glow, seal = look["body"], look["glow"], look["seal"]
    if i == 0:  # the anvil itself, the instant it lands
        _weight(cel, ax, base - 2, look, True, i)
        streak(cel, (ax - 18, base - 1), (ax + 18, base - 1), [LIGHT, glow[2], LIGHT])
    if i in (1, 2):  # the flash
        blob(cel, ax, base - 10, 14 - i * 2, 11 - i * 2, glow[2] if i == 1 else glow[1])
        blob(cel, ax, base - 10, 8 - i * 2, 6 - i, LIGHT)
    # the crater: the ground split in a fan both ways
    reach = 12 + 32 * ease_out(t, 1.5)
    rnd = random.Random(7)
    for side in (-1, 1):
        for k in range(3):
            y = base - 1 - k * 1.5
            x0 = ax + side * (4 + k * 2)
            x1 = ax + side * reach * (1.0 - 0.18 * k)
            streak(cel, (x0, y), (x1, y + rnd.randint(-1, 1)), [glow[2], seal[1], seal[0]] if i < 4 else [seal[1], seal[0]])
    # shards and stones thrown up and falling
    for k in range(12):
        a = math.pi * (1.08 + 0.84 * (k / 11))
        sp = 18 + (k * 7) % 13
        x = ax + math.cos(a) * sp * ease_out(t, 1.4)
        y = base - 6 + math.sin(a) * sp * 0.9 * ease_out(t, 1.4) + t * t * 22
        tone = body[3] if k % 3 == 0 else glow[1] if k % 3 == 1 else ("bone", 5)
        cel.put(x, y, tone)
        cel.put(x + 1, y, tone)
        if k % 2 == 0:
            cel.put(x, y + 1, body[1])
    # dust rolling out low
    for side in (-1, 1):
        for k in range(3):
            dx = side * (10 + k * 9) * (0.4 + 0.6 * ease_out(t))
            r = (3.5 - k * 0.6) * (1.0 - 0.45 * t)
            blob(cel, ax + dx, base - 3 - k, r * 1.3, r, ("bone", 4) if k % 2 else ("bone", 5))
    if i >= 4:
        thin(cel, 1.0 - 0.28 * (i - 3), 5)
    rim(cel, look["dark"])


def crush_impact(cel: Cel, i: int, t: float) -> None:
    _impact(cel, i, t, STEEL)


def crush_impact_magic(cel: Cel, i: int, t: float) -> None:
    _impact(cel, i, t, ARCANE)


def crush_shock(cel: Cel, i: int, t: float) -> None:
    """The magic shock running back: two low violet crescents bowed the way it travels, runes flicking off them."""
    ax, base = 20, 30
    for n, lag in enumerate((0, 7)):
        for y in range(base - 22 + n * 6, base):
            f = (base - y) / 22.0
            x = ax - lag + math.sin(f * math.pi * 0.95) * 6.0 + math.sin(f * 7 + t * math.tau) * 1.2
            cel.put(x, y, LIGHT if n == 0 and f < 0.7 else ("violet", 8) if n == 0 else ("violet", 6))
            cel.put(x - 1, y, ("violet", 7) if n == 0 else ("violet", 5))
    for k in range(5):
        x = ax - 6 - ((i * 5 + k * 4) % 14)
        y = base - 4 - ((k * 5 + i * 3) % 14)
        cel.put(x, y, ("violet", 8) if k % 2 else LIGHT)
        cel.put(x - 1, y + 1, ("violet", 5))
    rim(cel, ("violet", 1))


def crush_trail(cel: Cel, i: int, t: float) -> None:
    """Behind the shock: sparks rising off the path and going out."""
    ax, base = 11, 18
    for k in range(4):
        x = ax - 6 + k * 4
        y = base - 2 - t * 12 - (k % 2) * 2
        cel.put(x, y, ("violet", 8) if i < 2 else ("violet", 6))
        if i < 3:
            cel.put(x, y + 1, ("violet", 5))
    if i >= 3:
        thin(cel, 0.5, 9)
    rim(cel, ("violet", 1))


def crush_zap(cel: Cel, i: int, t: float) -> None:
    """Under each hero the shock reaches: violet forks crackling up out of the ground round his feet."""
    ax, base = 14, 26
    rnd = random.Random(3 + i)
    for side in (-1, 1):
        x, y = ax + side * 3, base - 1
        h = 10 + 8 * ease_out(t) if i < 3 else 8
        for s in range(int(h)):
            x += side * (0.6 if s % 3 else -0.4) + rnd.uniform(-0.5, 0.5)
            cel.put(x, y - s, LIGHT if s > h * 0.6 and i < 2 else ("violet", 8) if s % 2 else ("violet", 7))
    ring(cel, ax, base - 1, 7 + 4 * t, 2.0, ("violet", 6))
    if i >= 3:
        thin(cel, 0.5, 4)
    rim(cel, ("violet", 1))


FX = [
    Fx("crush_mark", MARK_W, MARK_H, MARK_AX, MARK_AY, [100] * MARK_FRAMES, False, crush_mark),
    Fx("crush_mark_magic", MARK_W, MARK_H, MARK_AX, MARK_AY, [100] * MARK_FRAMES, False, crush_mark_magic),
    Fx("warn_rune", 24, 12, 12, 8, [90] * 6, True, warn_rune),
    Fx("warn_rune_hot", 24, 16, 12, 12, [70] * 6, True, warn_rune_hot),
    Fx("crush_impact", 96, 72, 48, 66, [40, 45, 55, 70, 80, 90, 100], False, crush_impact),
    Fx("crush_impact_magic", 96, 72, 48, 66, [40, 45, 55, 70, 80, 90, 100], False, crush_impact_magic),
    Fx("crush_shock", 32, 34, 20, 30, [55, 55, 55, 55], True, crush_shock),
    Fx("crush_trail", 22, 22, 11, 18, [50, 60, 70, 80, 90], False, crush_trail),
    Fx("crush_zap", 28, 30, 14, 26, [40, 50, 60, 70, 80], False, crush_zap),
]
