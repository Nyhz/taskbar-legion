"""What the WAVE enemies' traits and the support show (docs/redesign/PROGRESS.md «Enemigos»). The rule: nothing
permanent on a common enemy — a trait is a brief flash (or a tint of its own body, which is the game's, not art),
and the only standing signs are the support's own, over its head. Drawn going RIGHT; the game mirrors for a foe.

Guardia            foe_guard (the first hit on a soldier is parried: a cold spark off its guard)
Último aliento     foe_last_breath (a soldier falls and the wave is roused: one burst rising off it)
Tiro cargado       foe_arrow_lit (flat) · foe_arrow_lit_arc (lofted: one frame per pitch) — the same arrow, its
                   head burning
Fuego concentrado  foe_reticle (ONE, on the hero every focusing shooter lofts its shots at)
Temblor            tremor_crack (the brute's blow reaching back: the ground splits under the party, cold)
The support        aura_toughness · aura_fury · aura_vigor · aura_aegis · aura_malice · aura_enchant (one small sign per aura it
                   carries, in a row over its head) · support_down (it falls and its auras go: a wisp off every
                   enemy of its wave)
"""
from __future__ import annotations

import math
import random

from pipeline.fx import Fx, blob, ease_out, rim, ring, spark, streak, thin
from pipeline.fx.enemy import ARC_PITCH, _shaft
from pipeline.rig import Cel

LIGHT = ("light", 0)


# ----------------------------------------------------------------------------------------- traits
def foe_guard(cel: Cel, i: int, t: float) -> None:
    """A parry: a cold star where the blow met the guard and two short bars of steel thrown off it."""
    cx, cy = 11, 11
    spark(cel, cx, cy, (3, 5, 4, 2)[i], LIGHT, ("ink", 8))
    r = 4 + 5 * ease_out(t)
    for a in (-35, 35):
        ra = math.radians(a)
        streak(cel, (cx - math.cos(ra) * r, cy - math.sin(ra) * r), (cx - math.cos(ra) * (r + 3), cy - math.sin(ra) * (r + 3)), [LIGHT, ("ink", 8), ("ink", 6)])
    if i == 3:
        thin(cel, 0.5, 2)
    rim(cel, ("ink", 1))


def foe_last_breath(cel: Cel, i: int, t: float) -> None:
    """A soldier's last breath: a ring of embers bursting low and a tongue of it rising, once."""
    cx, base = 15, 26
    r = 4 + 10 * ease_out(t)
    ring(cel, cx, base - 3, r, r * 0.38, ("crimson", 7) if i < 2 else ("crimson", 5), thick=1.6 - t)
    rnd = random.Random(31)
    for k in range(7):
        x = cx - 9 + k * 3 + rnd.randint(-1, 1)
        h = (6 + rnd.random() * 12) * ease_out(t)
        cel.put(x, base - 4 - h, ("brass", 7) if k % 2 == 0 else ("crimson", 7))
        if i < 3:
            cel.put(x, base - 3 - h, ("crimson", 6))
    if i < 2:
        blob(cel, cx + 0.5, base - 4, 2.5 - i, 2.0 - i * 0.5, ("brass", 7))
    if i >= 3:
        thin(cel, 0.6 if i == 3 else 0.35, 5)
    rim(cel, ("crimson", 1))


def _lit(cel: Cel, hx: float, hy: float, ang: float, i: int) -> None:
    """The foe's arrow with its head alight: a white-hot point, brass around it, embers shed behind."""
    _shaft(cel, hx, hy, ang)
    a = math.radians(ang)
    dx, dy = math.cos(a), math.sin(a)
    for s, tone in ((0, LIGHT), (1, LIGHT), (2, ("brass", 7)), (3, ("brass", 6)), (4, ("crimson", 6))):
        cel.put(hx - dx * s, hy - dy * s, tone)
    for s, tone in ((0, ("brass", 7)), (1, ("brass", 7)), (2, ("brass", 6)), (3, ("crimson", 6))):
        cel.put(hx - dx * s - dy, hy - dy * s + dx, tone)
        cel.put(hx - dx * s + dy, hy - dy * s - dx, tone)
    cel.put(hx - dx * 1 - dy * 2, hy - dy * 1 + dx * 2, ("crimson", 6))
    cel.put(hx - dx * 1 + dy * 2, hy - dy * 1 - dx * 2, ("crimson", 6))
    for k in range(3):
        s = 5 + k * 3 + (i % 2)
        side = 1 if (k + i) % 2 == 0 else -1
        cel.put(hx - dx * s - dy * side * 2, hy - dy * s + dx * side * 2, ("brass", 6) if k == 0 else ("crimson", 6))


def foe_arrow_lit(cel: Cel, i: int, t: float) -> None:
    _lit(cel, 20, 5, 0.0, i)
    rim(cel, ("ink", 0))


def foe_arrow_lit_arc(cel: Cel, i: int, t: float) -> None:
    ang = ARC_PITCH[i]
    a = math.radians(ang)
    _lit(cel, 13 + math.cos(a) * 7.5, 13 + math.sin(a) * 7.5, ang, i)
    rim(cel, ("ink", 0))


def foe_reticle(cel: Cel, i: int, t: float) -> None:
    """The mark of concentrated fire: a thin crimson ring with four ticks closing in and out on a beat."""
    cx, cy = 10, 10
    r = 7 if i % 2 == 0 else 6
    ring(cel, cx, cy, r, r, ("crimson", 6), thick=1.0)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        for s in (r - 2, r - 1, r + 1):
            cel.put(cx + dx * s, cy + dy * s, ("crimson", 7) if s < r else LIGHT)
    cel.put(cx, cy, LIGHT)
    rim(cel, ("crimson", 1))


def tremor_crack(cel: Cel, i: int, t: float) -> None:
    """Temblor: the ground splits under a hero — a jagged cold seam opening out from the middle, grit jumping."""
    ax, base = 14, 15
    half = int(3 + 10 * ease_out(min(1.0, t * 1.6)))
    rnd = random.Random(12)
    y = base - 3
    for s in range(-13, 14):
        if s % 3 == 0:
            y = base - 3 + rnd.randint(-1, 1)
        if abs(s) > half:
            continue
        hot = i < 3
        cel.put(ax + s, y, LIGHT if hot and abs(s) < half - 2 else ("ink", 8))
        cel.put(ax + s, y + 1, ("ink", 2))
        if s % 5 == 0 and abs(s) > 2:
            cel.put(ax + s, y + 2, ("ink", 2))
            cel.put(ax + s + (1 if s > 0 else -1), y + 3, ("ink", 3))
    for k in range(5):
        x = ax - 10 + k * 5 + rnd.randint(-1, 1)
        h = (3 + rnd.random() * 7) * math.sin(min(1.0, t * 1.3) * math.pi)
        cel.put(x, base - 5 - h, ("bone", 6) if k % 2 == 0 else ("ink", 7))
    if i >= 4:
        thin(cel, 0.6 if i == 4 else 0.35, 3)
    rim(cel, ("ink", 0))


# ----------------------------------------------------------------------------------------- the support
def _sign(cel: Cel, rows: list[str], tones: dict[str, tuple[str, int]], dark: tuple[str, int]) -> None:
    """A 7×7 sign from a pixel map, set one pixel in from the cel's edge, with a dark rim so it reads on any sky."""
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != ".":
                cel.put(x + 1, y + 1, tones[ch])
    rim(cel, dark)


def aura_toughness(cel: Cel, i: int, t: float) -> None:
    """Aguante (takes less damage): a block of dressed stone."""
    _sign(cel, [".aaaaa.", "abbbbba", "abcbcba", "abbbbba", "abcbcba", "abbbbba", ".aaaaa."],
          {"a": ("ink", 6), "b": ("ink", 8), "c": ("ink", 5)}, ("ink", 0))


def aura_fury(cel: Cel, i: int, t: float) -> None:
    """Furia (attacks faster): two chevrons racing."""
    _sign(cel, ["a..a...", "ba.ba..", ".ba.ba.", "..ba.ba", ".ba.ba.", "ba.ba..", "a..a..."],
          {"a": ("brass", 7), "b": ("brass", 5)}, ("brass", 0))


def aura_vigor(cel: Cel, i: int, t: float) -> None:
    """Vigor (regenerates): a green cross."""
    _sign(cel, ["..aaa..", "..aba..", "aaabaaa", "abbbbba", "aaabaaa", "..aba..", "..aaa.."],
          {"a": ("moss", 5), "b": ("moss", 8)}, ("moss", 0))


def aura_aegis(cel: Cel, i: int, t: float) -> None:
    """Égida (enters with a shield): a pale blue shield."""
    _sign(cel, ["aaaaaaa", "abbbbba", "abbcbba", "abbcbba", ".abcba.", "..aba..", "...a..."],
          {"a": ("azure", 5), "b": ("azure", 7), "c": LIGHT}, ("azure", 0))


def aura_malice(cel: Cel, i: int, t: float) -> None:
    """Saña (hits harder): a crimson fang, point down."""
    _sign(cel, ["a.....a", "ba...ab", "bba.abb", ".bbabb.", ".bbcbb.", "..bcb..", "...c..."],
          {"a": ("crimson", 7), "b": ("crimson", 5), "c": LIGHT}, ("crimson", 0))


def aura_enchant(cel: Cel, i: int, t: float) -> None:
    """Armas encantadas (part of every hit is magic): a violet rune-star with a white heart — the one sign every
    support wears, set apart from the five it draws by its colour."""
    _sign(cel, ["...c...", "..aba..", ".abcba.", "cbcccbc", ".abcba.", "..aba..", "...c..."],
          {"a": ("violet", 5), "b": ("violet", 7), "c": LIGHT}, ("violet", 0))


def charge_burst(cel: Cel, i: int, t: float) -> None:
    """Embestida (a beast's first blow, twice as hard): it hits like a thrown weight — a hard white star, two
    gouges where the tusks went in, and the dust of the run thrown past the hero."""
    cx, cy = 17, 15
    if i < 3:
        spark(cel, cx, cy, (7, 9, 6)[i], LIGHT, ("brass", 7))
        blob(cel, cx, cy, 3.2 - i, 3.2 - i, LIGHT)
    grow = ease_out(t, 1.6)
    for side in (-1, 1):  # the gouges: two curved cuts, opening outward
        for s_ in range(11):
            f = s_ / 10
            x = cx + 2 + f * 9 * grow
            y = cy + side * (2 + f * f * 7)
            if i < 4:
                cel.put(x, y, LIGHT if f < 0.4 else ("crimson", 7) if f < 0.75 else ("crimson", 5))
                cel.put(x, y + side, ("crimson", 6) if f < 0.6 else ("crimson", 4))
    rnd = random.Random(88)
    for k in range(10):  # dust and grit carried on past him
        a_ = (rnd.random() - 0.5) * 1.5
        sp = (6 + rnd.random() * 9) * grow
        cel.put(cx - 2 + math.cos(a_) * sp, cy + math.sin(a_) * sp * 1.1 + t * t * 4, ("bone", 5) if k % 3 else ("bone", 7))
    ring(cel, cx, cy, 4 + 9 * grow, (4 + 9 * grow) * 1.15, ("brass", 6) if i < 3 else ("brass", 4), a0=-70, a1=70, thick=1.6 - t)
    if i >= 3:
        thin(cel, 0.7 if i == 3 else 0.4, 89)
    rim(cel, ("crimson", 1))


def support_down(cel: Cel, i: int, t: float) -> None:
    """The auras leaving an enemy: a pale flare at its chest that breaks into violet wisps lifting off it."""
    cx, cy = 11, 22
    if i < 2:
        spark(cel, cx, cy, 5 if i == 0 else 4, LIGHT, ("violet", 8))
    rise = 15 * ease_out(t)
    for k, dx in enumerate((-6, -2, 3, 7)):
        top = cy - 2 - rise * (0.7 + 0.1 * k)
        for s in range(6 - i // 2):
            x = cx + dx + round(math.sin((s + i + k) * 1.1) * 1.2)
            cel.put(x, top + s, LIGHT if s < 2 and i < 4 else ("violet", 8) if s < 4 else ("violet", 7))
            if s < 3:
                cel.put(x + 1, top + s, LIGHT if s == 0 and i < 3 else ("violet", 8))
    if i >= 3:
        thin(cel, 0.65 if i == 3 else 0.4, 7)
    rim(cel, ("violet", 1))


FX = [
    Fx("foe_guard", 23, 23, 11, 11, [35, 50, 60, 70], False, foe_guard),
    Fx("foe_last_breath", 31, 30, 15, 26, [45, 55, 70, 80, 90], False, foe_last_breath),
    Fx("foe_arrow_lit", 23, 11, 12, 5, [70, 70], True, foe_arrow_lit),
    Fx("foe_arrow_lit_arc", 27, 27, 13, 13, [100] * len(ARC_PITCH), True, foe_arrow_lit_arc),
    Fx("foe_reticle", 21, 21, 10, 10, [220, 220], True, foe_reticle),
    Fx("tremor_crack", 28, 20, 14, 15, [40, 50, 70, 90, 90, 100], False, tremor_crack),
    Fx("aura_toughness", 9, 9, 4, 4, [1000], True, aura_toughness),
    Fx("aura_fury", 9, 9, 4, 4, [1000], True, aura_fury),
    Fx("aura_vigor", 9, 9, 4, 4, [1000], True, aura_vigor),
    Fx("aura_aegis", 9, 9, 4, 4, [1000], True, aura_aegis),
    Fx("aura_malice", 9, 9, 4, 4, [1000], True, aura_malice),
    Fx("aura_enchant", 9, 9, 4, 4, [1000], True, aura_enchant),
    Fx("support_down", 23, 30, 11, 22, [60, 70, 80, 90, 100], False, support_down),
    Fx("charge_burst", 35, 31, 17, 15, [35, 45, 55, 70, 85], False, charge_burst),
]
