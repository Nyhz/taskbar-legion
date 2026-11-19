"""The Knight's ability effects. Each is anchored on the body's centre at the ground line unless it says otherwise.

Stone Skin      stone_rise (cast) · the `stone` skin + stone_glint (while on) · stone_crumble (when it ends)
Cleave          cleave_wave (cast, at the blow) · gash (each enemy hit) · sapped + weak_mark (the enemy deals less)
                hobble (Crippling Cleave / Vengeance: the enemy is slowed)
Bulwark         bulwark_raise (cast) · bulwark_wall (while the shield holds) · bulwark_break (when it ends)
Battle Cry      warcry_ring (cast) · battlecry_aura (on every ally while on: a sigil and rising chevrons)
Bloodlust       bloodlust_burst (cast) · bloodlust_aura (while on)
Hold the Line   holdline_ring (cast) · banner (beside the Knight) + holdline_guard (in front of every ally)
Riposte         riposte_flash (cast) · pierce (the enemy hit)
Last Stand      laststand_burst (when it fires) · the `gold` skin + laststand_rays (while invulnerable)
"""
from __future__ import annotations

import math
import random

from ..rig import Cel
from . import Fx, blob, ease_in, ease_out, flame, poly, rim, ring, spark, streak, thin

LIGHT = ("light", 0)


# ----------------------------------------------------------------------------------------- Stone Skin
def _slab(cel: Cel, x: float, base: float, w: float, h: float, lean: float, seed: int) -> None:
    """A slab of rock standing on `base`: a jagged top, three faces of granite, a pale upper edge, a crack."""
    if h < 1.5:
        return
    rnd = random.Random(seed)
    top = [(x - w / 2, base), (x - w / 2 + lean * 0.3, base - h * (0.62 + 0.1 * rnd.random())), (x - w * 0.18 + lean, base - h),
           (x + w * 0.22 + lean, base - h * (0.84 + 0.1 * rnd.random())), (x + w / 2 + lean * 0.4, base - h * 0.5), (x + w / 2, base)]
    mask = cel.poly_mask(top)
    if not mask:
        return
    ys = {}
    for (i, j) in mask:
        ys[i] = min(ys.get(i, 999), j)
    for (i, j) in mask:
        f = (i + 0.5 - (x - w / 2)) / max(1.0, w)
        tone = ("ink", 3) if f < 0.3 else ("ink", 5) if f < 0.66 else ("ink", 6)
        if j == ys[i]:
            tone = ("bone", 6) if f > 0.25 else ("ink", 7)
        elif j == ys[i] + 1 and f >= 0.3:
            tone = ("ink", 7)
        cel.put(i, j, tone)
    # A crack running down from the top.
    cx, cy = x - w * 0.05 + lean * 0.8, base - h * 0.9
    for _ in range(int(h * 0.55)):
        if (int(cx), int(cy)) in set(mask):
            cel.put(cx, cy, ("ink", 2))
        cy += 1
        cx += rnd.choice((-1, 0, 0, 1)) * 0.8


_SLABS = [(-13, 12, 30, 2.0, 1), (12, 13, 34, -2.5, 2), (-5, 11, 40, 1.0, 3), (5, 12, 44, -1.0, 4), (-17, 8, 14, 1.0, 5), (18, 8, 16, -1.0, 6)]


def stone_rise(cel: Cel, i: int, t: float) -> None:
    ax, ay = 28, 54
    grow = [0.3, 0.72, 1.06, 1.0][min(i, 3)]
    if i <= 3:
        close = [0, 1, 3, 4][i]
        for (dx, w, h, lean, seed) in _SLABS:
            pull = -close if dx > 0 else close
            _slab(cel, ax + dx + pull * 0.6, ay, w, h * grow, lean, seed)
        rim(cel, ("ink", 0))
        if i == 2:
            spark(cel, ax - 9, ay - 38, 3)
            spark(cel, ax + 10, ay - 30, 2)
        if i == 3:
            spark(cel, ax + 2, ay - 44, 4)
        # Dust kicked up along the ground.
        for k in range(5):
            blob(cel, ax - 22 + k * 11 + (i * 3 % 5), ay - 1 - (i % 2), 2.2 - i * 0.3, 1.4, ("bone", 5 if k % 2 else 4))
        return
    # The shell breaks open: chips fly off and fall, leaving the stone-skinned Knight.
    f = (i - 3) / 3.0
    rnd = random.Random(7)
    for k in range(26):
        a = rnd.random() * math.tau
        sp = 6 + rnd.random() * 16
        x = ax + math.cos(a) * sp * (0.4 + f) + (rnd.random() - 0.5) * 6
        y = ay - 22 + math.sin(a) * sp * (0.4 + f) * 0.9 + 18 * f * f
        if y > ay or rnd.random() < f * 0.35:
            continue
        s = rnd.choice((1, 1, 2, 2, 3))
        poly(cel, [(x, y), (x + s + 1, y + 0.5), (x + s * 0.6, y + s + 1)], ("ink", rnd.choice((4, 5, 6))))
        cel.put(x + 1, y, ("bone", 6))
    rim(cel, ("ink", 0))
    for k in range(4):
        blob(cel, ax - 20 + k * 13, ay - 1, 3.0 - f * 1.5, 1.6, ("bone", 4))


def stone_crumble(cel: Cel, i: int, t: float) -> None:
    ax, ay = 24, 48
    rnd = random.Random(21)
    for k in range(22):
        x0 = ax + (rnd.random() - 0.5) * 22
        y0 = ay - 6 - rnd.random() * 34
        vx = (x0 - ax) * 0.35 + (rnd.random() - 0.5) * 3
        y = y0 + 4 * t + 30 * t * t * (0.6 + rnd.random() * 0.6)
        x = x0 + vx * t
        if y >= ay:
            if i < 4:
                cel.put(x, ay - 1, ("ink", 5))
            continue
        s = rnd.choice((1, 2, 2, 3))
        poly(cel, [(x, y), (x + s + 1, y + 0.4), (x + s * 0.5, y + s + 1)], ("ink", rnd.choice((4, 5, 6))))
        cel.put(x + 1, y, ("bone", 6))
    rim(cel, ("ink", 0))
    for k in range(3):
        blob(cel, ax - 12 + k * 12, ay - 1, 1.5 + 2.5 * t, 1.0 + t, ("bone", 4 if k % 2 else 5))
    thin(cel, 1.0 - 0.5 * ease_in(t), 5)


def stone_glint(cel: Cel, i: int, t: float) -> None:
    ax, ay = 18, 44
    if 1 <= i <= 3:
        spark(cel, ax - 5, ay - 31, (1, 2, 1)[i - 1], LIGHT, ("bone", 7))
    if 6 <= i <= 8:
        spark(cel, ax + 7, ay - 17, (1, 2, 1)[i - 6], LIGHT, ("bone", 7))


# ----------------------------------------------------------------------------------------- Debilitating Cleave
def cleave_wave(cel: Cel, i: int, t: float) -> None:
    """A crescent of force thrown ahead of the blade: pale at its leading edge, violet behind (the same violet the
    weakened enemies then wear)."""
    ax, ay = 12, 50
    cx = ax + 30 * ease_out(t, 1.6)
    cy = ay - 20
    ro = 19 + 8 * ease_out(t)
    ri = ro - 1.0
    shift = 8.0 + 2.0 * t
    span = 78 - 10 * t
    for j in range(int(cy - ro) - 1, int(cy + ro) + 2):
        for x in range(int(cx - ro) - 1, int(cx + ro) + 2):
            px, py = x + 0.5 - cx, j + 0.5 - cy
            do = math.hypot(px, py)
            di = math.hypot(px + shift, py)
            if do > ro or di < ri or px < 0:
                continue
            if abs(math.degrees(math.atan2(py, px))) > span:
                continue
            depth = ro - do
            cel.put(x, j, LIGHT if depth < 1.6 else ("bone", 7) if depth < 3.0 else ("violet", 7) if depth < 4.6 else ("violet", 6) if depth < 6.2 else ("violet", 4))
    if i >= 3:
        thin(cel, 1.0 - 0.75 * (i - 2) / 3.0, 3)
    rim(cel, ("violet", 1))
    # Motes torn loose behind it.
    rnd = random.Random(i * 5 + 1)
    for _ in range(5 + i):
        x, y = cx - 3 - rnd.random() * 16, cy + (rnd.random() - 0.5) * 36
        cel.put(x, y, ("violet", 7))
        cel.put(x + 1, y, LIGHT if rnd.random() < 0.4 else ("violet", 6))


def gash(cel: Cel, i: int, t: float) -> None:
    """A cut across the enemy: a white slash, fat in the middle, with red flying off it."""
    c = 17
    ln = (7, 14, 14, 11)[i]
    wide = (1.5, 3.2, 2.0, 0.8)[i]
    n = int(ln * 2.4)
    for k in range(n + 1):
        f = k / n
        x = c - ln + 2 * ln * f
        y = c - ln * 0.75 + 1.5 * ln * f + math.sin(f * math.pi) * -2.5
        half = wide * math.sin(f * math.pi) ** 0.7
        m = -half
        while m <= half:
            d = abs(m) / max(half, 0.01)
            cel.put(x + m * 0.6, y - m * 0.8, LIGHT if d < 0.45 else ("bone", 7) if d < 0.75 else ("crimson", 6))
            m += 0.5
    rnd = random.Random(11)
    for _ in range(9):
        d = rnd.random() * math.tau
        r = 4 + rnd.random() * 5 + 9 * t
        x, y = c + math.cos(d) * r, c + math.sin(d) * r * 0.8 + 4 * t * t
        cel.put(x, y, ("crimson", rnd.choice((5, 6))))
        if rnd.random() < 0.5:
            cel.put(x + 1, y, ("dusk", 7))
    if i == 1:
        spark(cel, c, c, 3)
    if i == 3:
        thin(cel, 0.6, 2)
    rim(cel, ("crimson", 1))


def sapped(cel: Cel, i: int, t: float) -> None:
    """Strength bleeding out of an enemy: violet drops sinking down its body, each a pale bead with a tail."""
    base = 40
    for k, (x, off) in enumerate(((5, 0.0), (12, 0.4), (19, 0.72))):
        f = (t + off) % 1.0
        y = 4 + f * 32
        tones = [("violet", 7), ("violet", 6), ("violet", 5), ("violet", 4)]
        for n in range(2, 9):  # the tail above the bead, thinning
            if y - n >= 0:
                cel.put(x, y - n, tones[min(3, (n - 1) // 2)])
                if n < 5:
                    cel.put(x + 1, y - n, tones[min(3, n // 2)])
        for dx, dy, tone in ((0, 0, LIGHT), (1, 0, LIGHT), (0, 1, ("violet", 7)), (1, 1, ("violet", 7)), (-1, 0, ("violet", 6)), (2, 0, ("violet", 6)),
                             (0, -1, ("violet", 7)), (1, -1, ("violet", 7)), (-1, 1, ("violet", 5)), (2, 1, ("violet", 5)), (0, 2, ("violet", 6)), (1, 2, ("violet", 5))):
            if y + dy < base:
                cel.put(x + dx, y + dy, tone)
        if f > 0.88:  # it lands: a small splash
            for dx in (-3, -2, 3, 4):
                cel.put(x + dx, base - 2, ("violet", 7))
    rim(cel, ("violet", 1))


_BROKEN = [
    "...........",
    "..vv.......",
    "..vbb......",
    "...bbb.....",
    "....bb.L...",
    ".....L.....",
    "...L..bb...",
    "......bbh..",
    ".......hhh.",
    "........hg.",
    "...........",
]


def weak_mark(cel: Cel, i: int, t: float) -> None:
    """A snapped blade, point up, over the head of an enemy that deals less damage."""
    lit = i % 2 == 1
    legend = {"b": ("bone", 7), "v": ("bone", 5), "h": ("leather", 4), "g": ("brass", 5), "L": LIGHT if lit else ("violet", 7)}
    for j, row in enumerate(_BROKEN):
        for x, ch in enumerate(row):
            if ch in legend:
                cel.put(x, j + (0 if i < 2 else -1), legend[ch])
    rim(cel, ("violet", 1))


def hobble(cel: Cel, i: int, t: float) -> None:
    """Irons on an enemy's feet: two cuffs and a chain dragging between them, a glint running along it."""
    ax, gy = 15, 10
    sag = 1.5 + math.sin(math.tau * t) * 0.8
    for side in (-1, 1):
        cx = ax + side * 9
        for dx in range(-2, 3):
            for dy in range(-3, 1):
                if abs(dx) == 2 or dy in (-3, 0):
                    cel.put(cx + dx, gy - 1 + dy, ("ink", 7 if (dx + dy) % 2 == 0 else 6))
        cel.put(cx - side * 2, gy - 3, ("ink", 9))
    n = 12
    for k in range(n + 1):
        f = k / n
        x = ax - 7 + 14 * f
        y = gy - 2 + sag * math.sin(math.pi * f)
        cel.put(x, min(gy - 1, y), ("ink", 8) if k % 2 == 0 else ("ink", 5))
    g = int(t * (n + 1)) % (n + 1)
    f = g / n
    cel.put(ax - 7 + 14 * f, min(gy - 1, gy - 2 + sag * math.sin(math.pi * f)), LIGHT)
    rim(cel, ("ink", 0))
    # The cold of the iron: a teal shimmer on the ground under it.
    for k in range(-11, 12, 3):
        if (k + i) % 2 == 0:
            cel.put(ax + k, gy + 1, ("sea", 6))


# ----------------------------------------------------------------------------------------- Bulwark
def _wall(cel: Cel, ax: float, base: float, height: float, shine: float, cracked: bool = False) -> None:
    """A tower shield of light: flat arched top, straight sides, a pointed foot. `shine` 0..1 is where the bright
    band is on its way up; < 0 for none."""
    half = 8.5
    h = max(2.0, height)
    top = base - h
    foot = min(7.0, h * 0.3)
    for j in range(int(top), int(base) + 1):
        f = (j - top) / max(1.0, h)
        hw = half
        if j > base - foot:
            hw = half * max(0.0, (base - j) / foot) ** 0.8
        arch = 1.6 * (1 - min(1.0, (j - top) / 2.5))
        for x in range(int(ax - half) - 1, int(ax + half) + 2):
            d = abs(x + 0.5 - ax)
            if d > hw or (j < top + 2.5 and d > hw - arch * (d / half) ** 2 * 2.2):
                continue
            edge = d > hw - 1.2 or j < top + 1.2
            if edge:
                tone = LIGHT if (x + 0.5 > ax or j < top + 1.2) else ("azure", 7)
            elif d > hw - 2.6:
                tone = ("azure", 6) if x + 0.5 > ax else ("azure", 3)
            else:
                tone = ("azure", 5) if f < 0.45 else ("azure", 4)
                if shine >= 0:
                    band = (1 - f) - shine * 1.4 + (x - ax) * 0.03 + 0.2
                    if 0 <= band < 0.1:
                        tone = ("azure", 8)
                    elif 0.1 <= band < 0.16:
                        tone = ("azure", 6)
            cel.put(x, j, tone)
    # The emblem: a brass cross, as on his own shield.
    if h > 30:
        ey = top + h * 0.4
        for k in range(-5, 6):
            cel.put(ax - 0.5, ey + k, ("brass", 6 if k < 0 else 5))
            cel.put(ax + 0.5, ey + k, ("brass", 5))
        for k in range(-4, 4):
            cel.put(ax + k, ey - 1.5, ("brass", 6))
            cel.put(ax + k, ey - 0.5, ("brass", 5))
    if cracked:
        rnd = random.Random(4)
        for start in ((ax - 3, top + 6), (ax + 4, top + 14), (ax - 1, top + 24)):
            x, y = start
            for _ in range(11):
                cel.put(x, y, LIGHT)
                x += rnd.choice((-1, 0, 1))
                y += 1
    rim(cel, ("azure", 1))


def bulwark_raise(cel: Cel, i: int, t: float) -> None:
    ax, base = 15, 56
    h = (9, 26, 46, 42, 42)[i]
    _wall(cel, ax, base, h, -1)
    if i == 2:
        spark(cel, ax + 3, base - 46, 4, LIGHT, ("azure", 7))
    if i == 3:
        spark(cel, ax - 4, base - 40, 2, LIGHT, ("azure", 7))
    for k in range(-2, 3):
        if i < 3:
            blob(cel, ax + k * 5, base - 1, 2.0, 1.2, ("azure", 7 if k % 2 == 0 else 6))


def bulwark_wall(cel: Cel, i: int, t: float) -> None:
    _wall(cel, 13, 48, 42, t)


def bulwark_break(cel: Cel, i: int, t: float) -> None:
    ax, base = 20, 52
    if i == 0:
        _wall(cel, ax, base, 42, -1, cracked=True)
        return
    f = (i - 1) / 4.0
    rnd = random.Random(9)
    for k in range(20):
        x0 = ax + (rnd.random() - 0.5) * 16
        y0 = base - 4 - rnd.random() * 36
        x = x0 + (x0 - ax) * 1.3 * f + (rnd.random() - 0.5) * 2
        y = y0 - 5 * f + 24 * f * f
        if y >= base or rnd.random() < f * 0.3:
            continue
        s = rnd.choice((2, 2, 3, 4))
        tone = ("azure", rnd.choice((5, 6, 7)))
        poly(cel, [(x, y), (x + s, y + s * 0.4), (x + s * 0.3, y + s + 1)], tone)
        cel.put(x, y, LIGHT)
    rim(cel, ("azure", 1))
    if i == 1:
        spark(cel, ax, base - 24, 5, LIGHT, ("azure", 7))


# ----------------------------------------------------------------------------------------- shock rings on the ground
def _ground_ring(cel: Cel, i: int, t: float, hot: tuple, mid: tuple, low: tuple, dark: tuple, tongues: bool) -> None:
    """A shock ring lying on the ground, seen from the side: a fat near edge, a thin far one."""
    ax, ay = 64, 26
    rx = 9 + 53 * ease_out(t, 1.8)
    ry = rx * 0.3
    body = 9.0 - 5.0 * t
    for j in range(0, cel.h):
        for x in range(0, cel.w):
            px, py = (x + 0.5 - ax), (j + 0.5 - ay)
            d = math.hypot(px / max(rx, 0.1), py / max(ry, 0.1))  # 1 on the ring
            near = 0.55 + 0.45 * (py / max(ry, 0.1) if abs(py) <= ry else (1 if py > 0 else -1))  # 0 far … 1 near
            wdt = (body * (0.35 + 0.65 * near)) / max(rx, 1.0)
            off = (1.0 - d)
            if 0 <= off < wdt:
                f = off / wdt
                cel.put(x, j, hot if f < 0.34 else mid if f < 0.7 else low)
            elif i < 3 and wdt <= off < wdt * 2.6 and (x + j) % 2 == 0:
                cel.put(x, j, low)
    if tongues:
        n = 12
        for k in range(n):
            a = math.tau * k / n + 0.2
            x, y = ax + math.cos(a) * rx, ay + math.sin(a) * ry
            h = (13 - 8 * t) * (0.6 + 0.4 * math.sin(k * 2.1 + i))
            if math.sin(a) < 0.5:
                flame(cel, x, y, h, 5.4, [low, mid, hot], sway=math.cos(a) * 1.5, seed=k + i)
    if i >= 4:
        thin(cel, 1.0 - 0.7 * (i - 3) / 3.0, 2)
    rim(cel, dark)


def warcry_ring(cel: Cel, i: int, t: float) -> None:
    _ground_ring(cel, i, t, ("brass", 7), ("brass", 5), ("crimson", 4), ("crimson", 1), True)


def holdline_ring(cel: Cel, i: int, t: float) -> None:
    _ground_ring(cel, i, t, LIGHT, ("azure", 7), ("azure", 5), ("azure", 1), False)
    # Pickets of light standing up along the far rim: the line being drawn.
    ax, ay = 64, 26
    rx = 9 + 53 * ease_out(t, 1.8)
    if i < 5:
        for k in range(-3, 4):
            x = ax + k * rx / 3.4
            y = ay - rx * 0.3 * math.sqrt(max(0.0, 1 - (k / 3.6) ** 2))
            h = 9 - i * 1.5
            for n in range(int(h)):
                cel.put(x, y - n, LIGHT if n >= h - 3 else ("azure", 7))
                cel.put(x + 1, y - n, ("azure", 7) if n >= h - 3 else ("azure", 5))
                cel.put(x - 1, y - n, ("azure", 1))
                cel.put(x + 2, y - n, ("azure", 1))


# ----------------------------------------------------------------------------------------- Battle Cry
def battlecry_aura(cel: Cel, i: int, t: float) -> None:
    """Battle Cry on everyone it reached: a brass war-sigil breathing at the feet and golden chevrons climbing
    either side of the body — strength rising through them. Not a fire: nothing licks at them, nothing burns
    (2026-11-19, user: «parece que se están quemando»)."""
    ax, base = 22, 44
    glow = 0.5 + 0.5 * math.sin(math.tau * t)
    # the sigil: a flat ring on the ground, notched at four points, brighter on the breath in
    ring(cel, ax, base - 2, 16, 3.4, ("brass", 6 if glow > 0.5 else 5), thick=1.3)
    ring(cel, ax, base - 2, 12, 2.4, ("brass", 3), thick=1.0)
    for nx in (-16, -6, 6, 16):
        cel.put(ax + nx, base - 2 - (1 if abs(nx) < 10 else 0), ("light", 0) if glow > 0.6 else ("brass", 7))
    # the chevrons: two climbing on each side, out of step, fading as they reach the shoulders
    for side, off in ((-1, 0.0), (1, 0.5)):
        for k in range(2):
            f = (t + off + k * 0.5) % 1.0
            cx = ax + side * 15
            cy = base - 6 - f * 30
            half = 4
            tone_hi, tone_lo = (("light", 0), ("brass", 6)) if f < 0.35 else (("brass", 7), ("brass", 5))
            for s in range(-half, half + 1):
                y = cy + abs(s) * 0.75
                cel.put(cx + s, y, tone_hi)
                cel.put(cx + s, y + 1, tone_lo)
                cel.put(cx + s, y + 2, ("crimson", 4))
    rim(cel, ("crimson", 1))


# ----------------------------------------------------------------------------------------- Bloodlust
def bloodlust_burst(cel: Cel, i: int, t: float) -> None:
    """The rage breaking out of him: a ring of red fangs thrown outward."""
    cx, cy = 34, 28
    r = 7 + 19 * ease_out(t, 1.7)
    n = 12
    for k in range(n):
        a = math.tau * k / n + 0.13
        ln = (10 if k % 2 == 0 else 6) * (1.0 - 0.5 * t)
        wdt = 0.16 if k % 2 == 0 else 0.11
        ca, sa = math.cos(a), math.sin(a) * 0.94
        pts = [(cx + math.cos(a - wdt) * r, cy + math.sin(a - wdt) * r * 0.94), (cx + ca * (r + ln), cy + sa * (r + ln)),
               (cx + math.cos(a + wdt) * r, cy + math.sin(a + wdt) * r * 0.94)]
        poly(cel, pts, ("crimson", 5))
        streak(cel, (cx + ca * (r + ln), cy + sa * (r + ln)), (cx + ca * (r + 1), cy + sa * (r + 1)), [("dusk", 8), ("dusk", 7), ("crimson", 6)])
    ring(cel, cx, cy, r, r * 0.94, ("crimson", 4), thick=3.0 - 1.5 * t)
    ring(cel, cx, cy, r, r * 0.94, ("dusk", 7), thick=1.2)
    if i < 2:
        spark(cel, cx, cy, 4, LIGHT, ("dusk", 7))
    if i >= 4:
        thin(cel, 1.0 - 0.75 * (i - 3) / 2.0, 8)
    rim(cel, ("crimson", 1))


def bloodlust_aura(cel: Cel, i: int, t: float) -> None:
    """A blood-red blaze standing behind him, taller than he is: a bright ragged edge around a dark heart, so the
    figure reads against it."""
    ax, base = 23, 56
    tones = [("crimson", 6), ("crimson", 4), ("crimson", 2)]
    spec = [(-15, 24, 10), (-9, 38, 13), (0, 50, 22), (9, 40, 13), (15, 26, 10)]
    for k, (dx, h, w) in enumerate(spec):
        ph = math.tau * (t + k * 0.23)
        flame(cel, ax + dx, base, h + 3.5 * math.sin(ph), w, tones, sway=(2.5 if k != 2 else 1.5) * math.sin(ph + 0.7), seed=k * 7 + i)
    rim(cel, ("crimson", 1))
    # Bright licks along the edge and sparks thrown up.
    for k in range(5):
        f = (t + k / 5) % 1.0
        x = ax + (-17, 14, -11, 18, 3)[k] + math.sin(f * 7 + k) * 2
        y = base - 20 - f * 30
        if 0 <= y:
            cel.put(x, y, ("dusk", 8) if f < 0.5 else ("crimson", 6))
            if f < 0.3:
                cel.put(x, y + 1, ("crimson", 6))


# ----------------------------------------------------------------------------------------- Hold the Line
def banner(cel: Cel, i: int, t: float) -> None:
    """The standard planted behind the Knight while the line holds: a spear-tipped pole and an azure pennant with
    his cross, streaming back in the wind."""
    px, base = 17, 54
    top = base - 50
    for j in range(int(top) + 4, base + 1):
        cel.put(px, j, ("leather", 5))
        cel.put(px + 1, j, ("leather", 3))
    for k, tone in enumerate((LIGHT, ("ink", 8), ("ink", 8), ("ink", 6))):  # the spear point
        cel.put(px + (0 if k < 2 else 0), top + k, tone)
        if k >= 2:
            cel.put(px + 1, top + k, ("ink", 6))
    cel.put(px - 1, top + 4, ("brass", 5))
    cel.put(px + 2, top + 4, ("brass", 5))
    # The cloth streams to the left (behind the party's advance), rippling.
    length, height = 15, 17
    for n in range(length):
        f = n / (length - 1)
        wave = math.sin(math.tau * (t - f * 1.1)) * (0.6 + 2.2 * f)
        x = px - 1 - n
        y0 = top + 6 + wave
        cut = int(round(4 * max(0.0, (f - 0.6) / 0.4)))  # a swallow tail
        for m in range(height):
            if cut and abs(m - height / 2 + 0.5) < cut * (1.0) and f > 0.6 and abs(m - height / 2 + 0.5) < (f - 0.6) / 0.4 * 5:
                continue
            crest = math.cos(math.tau * (t - f * 1.1))
            tone = ("azure", 5 if crest > 0.3 else 3 if crest < -0.3 else 4)
            if m in (0, height - 1):
                tone = ("brass", 5)
            cel.put(x, y0 + m, tone)
        # The cross.
        mid = y0 + height / 2
        if 4 <= n <= 9:
            cel.put(x, mid - 0.5, ("brass", 6))
        if n in (6, 7):
            for m in range(-4, 5):
                cel.put(x, mid + m - 0.5, ("brass", 6 if n == 6 else 5))
    rim(cel, ("ink", 0))
    # Planted: a little light where it stands.
    for k in (-3, -1, 2, 4):
        if (k + i) % 2 == 0:
            cel.put(px + k, base, ("azure", 7))


_PAVISE = [
    ".LLLLL.",
    "L55556L",
    "L45556L",
    "L44g56L",
    "L4ggg6L",
    "L44g56L",
    "L44556L",
    ".L456L.",
    ".L456L.",
    "..L5L..",
    "...L...",
]


def holdline_guard(cel: Cel, i: int, t: float) -> None:
    """A low rampart of light at the feet of everyone behind the line: three small shields planted side by side,
    a gleam passing from one to the next."""
    ax, base = 12, 15
    for k, dx in enumerate((-8, 0, 8)):
        lift = 1 if k == 1 else 0
        lit = int(t * 6) % 6 == k * 2
        for j, row in enumerate(_PAVISE):
            for x, ch in enumerate(row):
                if ch == ".":
                    continue
                tone = LIGHT if ch == "L" else ("brass", 6) if ch == "g" else ("azure", int(ch) + (2 if lit else 0))
                cel.put(ax + dx - 3 + x, base - len(_PAVISE) + j - lift, tone)
    rim(cel, ("azure", 1))


# ----------------------------------------------------------------------------------------- Riposte
def riposte_flash(cel: Cel, i: int, t: float) -> None:
    """The parry and the answer: a cross of sparks on the shield, then a lance of light straight through the
    enemy."""
    ax, base = 14, 30
    sx, sy = ax + 9, base - 18
    if i <= 2:
        r = (4, 7, 4)[i]
        spark(cel, sx, sy, r)
        for d in range(1, r - 1):
            for dx, dy in ((d, d), (-d, d), (d, -d), (-d, -d)):
                cel.put(sx + dx, sy + dy, ("brass", 7))
    if i >= 1:
        x0 = sx + 4 + (i - 1) * 5
        x1 = min(68, sx + 10 + i * 14)
        for x in range(int(x0), int(x1)):
            f = (x - x0) / max(1.0, x1 - x0)
            half = (2.4 if i < 3 else 1.2) * math.sin(math.pi * min(1.0, f * 1.15)) ** 0.6
            m = -half
            while m <= half:
                d = abs(m) / max(half, 0.01)
                cel.put(x, sy + m, LIGHT if d < 0.5 else ("brass", 7) if d < 0.8 else ("brass", 5))
                m += 0.5
        spark(cel, x1, sy, 3 if i < 3 else 1)
    if i >= 3:
        thin(cel, 1.0 - 0.6 * (i - 2) / 2.0, 6)
    rim(cel, ("brass", 1))


def pierce(cel: Cel, i: int, t: float) -> None:
    """The thrust going through: a white point with gold splinters thrown out behind the enemy."""
    cx, cy = 18, 11
    ln = (7, 15, 13, 8)[i]
    half0 = (1.0, 2.4, 1.6, 0.6)[i]
    for x in range(int(cx - ln), int(cx + ln)):
        f = (x - (cx - ln)) / (2 * ln)
        half = half0 * math.sin(math.pi * f) ** 0.6
        m = -half
        while m <= half:
            d = abs(m) / max(half, 0.01)
            cel.put(x, cy + m, LIGHT if d < 0.5 else ("brass", 7) if d < 0.8 else ("brass", 5))
            m += 0.5
    rnd = random.Random(3)
    for _ in range(8):
        a = (rnd.random() - 0.5) * 1.7
        r = 5 + rnd.random() * 5 + 7 * t
        x, y = cx + math.cos(a) * r, cy + math.sin(a) * r
        cel.put(x, y, ("brass", 7))
        cel.put(x - 1, y, ("brass", 6))
    if i == 1:
        spark(cel, cx, cy, 4)
    rim(cel, ("brass", 1))


# ----------------------------------------------------------------------------------------- Last Stand
def _ray(cel: Cel, cx: float, cy: float, a: float, r0: float, r1: float, wdt: float, body: tuple, core: tuple) -> None:
    pts = [(cx + math.cos(a - wdt) * r0, cy + math.sin(a - wdt) * r0), (cx + math.cos(a) * r1, cy + math.sin(a) * r1),
           (cx + math.cos(a + wdt) * r0, cy + math.sin(a + wdt) * r0)]
    poly(cel, pts, body)
    streak(cel, (cx + math.cos(a) * r0, cy + math.sin(a) * r0), (cx + math.cos(a) * (r1 - 2), cy + math.sin(a) * (r1 - 2)), [core])


def laststand_burst(cel: Cel, i: int, t: float) -> None:
    cx, cy = 38, 38
    r = 6 + 22 * ease_out(t, 1.8)
    for k in range(16):
        a = math.tau * k / 16
        ln = (13 if k % 2 == 0 else 7) * (1.0 - 0.5 * t)
        _ray(cel, cx, cy, a, r, r + ln, 0.13 if k % 2 == 0 else 0.09, ("brass", 6), LIGHT)
    ring(cel, cx, cy, r, r, ("brass", 5), thick=4.0 - 2.0 * t)
    ring(cel, cx, cy, r, r, ("brass", 7), thick=2.4 - 1.2 * t)
    ring(cel, cx, cy, r, r, LIGHT, thick=1.0)
    if i < 3:
        blob(cel, cx, cy, 6 - i * 1.5, 6 - i * 1.5, LIGHT)
    if i >= 4:
        thin(cel, 1.0 - 0.75 * (i - 3) / 3.0, 12)
    rim(cel, ("brass", 1))


def laststand_rays(cel: Cel, i: int, t: float) -> None:
    """A sun behind him while nothing can hurt him: long and short rays turning slowly."""
    cx, cy = 34, 33
    n = 10
    for k in range(n):
        a = math.tau * (k + t) / n
        long_ = k % 2 == 0
        _ray(cel, cx, cy, a, 9, 31 if long_ else 22, 0.26 if long_ else 0.2, ("brass", 5 if long_ else 4), ("brass", 7))
        cel.put(cx + math.cos(a) * (31 if long_ else 22), cy + math.sin(a) * (31 if long_ else 22), LIGHT)
    ring(cel, cx, cy, 11, 11, ("brass", 6), thick=2.5)
    ring(cel, cx, cy, 11, 11, LIGHT, thick=1.0)
    for xy in [xy for xy in cel.px if xy[1] > 55]:  # nothing under the ground line (the cell's anchor row is 54)
        del cel.px[xy]
    rim(cel, ("brass", 1))


FX = [
    Fx("stone_rise", 56, 60, 28, 54, [50, 50, 70, 110, 60, 60, 70], False, stone_rise),
    Fx("stone_crumble", 48, 52, 24, 48, [60, 60, 70, 80, 90], False, stone_crumble),
    Fx("stone_glint", 36, 44, 18, 44, [110] * 10, True, stone_glint),
    Fx("cleave_wave", 80, 60, 12, 50, [40, 50, 60, 60, 70, 80], False, cleave_wave),
    Fx("gash", 34, 34, 17, 17, [40, 50, 60, 70], False, gash),
    Fx("sapped", 24, 40, 12, 40, [100] * 8, True, sapped),
    Fx("weak_mark", 11, 11, 5, 11, [220, 130, 220, 130], True, weak_mark),
    Fx("hobble", 30, 12, 15, 10, [120] * 6, True, hobble),
    Fx("bulwark_raise", 30, 60, 15, 56, [50, 50, 60, 70, 70], False, bulwark_raise),
    Fx("bulwark_wall", 26, 50, 13, 48, [110] * 8, True, bulwark_wall),
    Fx("bulwark_break", 40, 56, 20, 52, [60, 60, 60, 70, 80, 90], False, bulwark_break),
    Fx("warcry_ring", 128, 44, 64, 26, [50, 50, 60, 60, 70, 80, 90], False, warcry_ring),
    Fx("holdline_ring", 128, 44, 64, 26, [50, 50, 60, 60, 70, 80, 90], False, holdline_ring),
    Fx("battlecry_aura", 44, 48, 22, 44, [90] * 8, True, battlecry_aura),
    Fx("bloodlust_burst", 68, 60, 34, 48, [40, 50, 50, 60, 70, 80], False, bloodlust_burst),
    Fx("bloodlust_aura", 46, 58, 23, 56, [100] * 6, True, bloodlust_aura),
    Fx("banner", 24, 56, 17, 54, [130] * 6, True, banner),
    Fx("holdline_guard", 26, 18, 12, 15, [120] * 6, True, holdline_guard),
    Fx("riposte_flash", 72, 36, 14, 30, [35, 45, 55, 65, 80], False, riposte_flash),
    Fx("pierce", 36, 22, 18, 11, [40, 50, 60, 70], False, pierce),
    Fx("laststand_burst", 76, 76, 38, 58, [40, 40, 50, 60, 60, 70, 80], False, laststand_burst),
    Fx("laststand_rays", 68, 68, 34, 54, [110] * 8, True, laststand_rays),
]
