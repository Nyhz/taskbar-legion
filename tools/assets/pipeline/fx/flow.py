"""The party's comings and goings, and the mark of an ELITE enemy — effects that belong to no ability.

Arrival A  arrive_a_back + arrive_a_front   a column of light slams down on the hero's place; the hero stands in it
           white-hot and the column thins away upwards. Played together: `back` behind the figure, `front` over it.
           The same pair takes a party AWAY when it leaves for another world.
Arrival B  arrive_b_sigil_<class> + arrive_b_embers   a sigil of the class's colour opens on the ground and embers
           spiral up from it and close on the body, which gathers out of them.
Elite      elite_aura_s / _m / _l   violet fire with a white heart standing behind an elite and well above it (it
           shows over a whole pack), for a low beast, a fighter and a tall figure (a larger DRAWING each, never a
           scaled one) · elite_sparks   motes of it climbing in front of the body · elite_arrive   the burst when
           one steps into a wave · elite_crest   the gold crown over its life bar.

Portal     portal_shut / portal_open / portal_hot   the gate to the world boss, standing on the path: dark stone
           with two horns and skulls at its foot; chained and cold without a key; awake with one — a crimson rift
           turning in the doorway and two eyes looking out of its dark; wider awake under the pointer ·
           portal_enter   the rift flares and swallows the gate when the party goes in.

Every effect is anchored on the body's centre at the ground line unless it says otherwise.
"""
from __future__ import annotations

import math
import random

from ..rig import Cel
from . import Fx, blob, ease_out, rim, ring, spark, thin

LIGHT = ("light", 0)


# ----------------------------------------------------------------------------------------- arrival A
A_MS = [40, 40, 60, 70, 80, 80, 90, 90, 100, 100, 110]  # 860 ms; the slam is frame 2, at 80 ms
A_W, A_H, A_AX, A_GROUND = 44, 140, 22, 132
#: Half-width of the column on each frame (0 = gone).
_A_HALF = [0, 0, 9, 8, 6.5, 5, 3.5, 2.5, 1.5, 0, 0]


def _column(cel: Cel, cx: float, top: float, base: float, half: float, i: int) -> None:
    """A shaft of light: a white core, gold flanks, a darker edge that keeps it readable on a pale sky, and
    brighter strands running down it so it is not a flat bar."""
    rnd = random.Random(31 + i)
    for y in range(int(top), int(base) + 1):
        # The shaft swells a little towards the ground and breathes along its length.
        f = (y - top) / max(1.0, base - top)
        h = half * (0.82 + 0.22 * f) + 0.5 * math.sin(y * 0.21 + i * 1.3)
        x0, x1 = int(math.floor(cx - h)), int(math.ceil(cx + h)) - 1
        for x in range(x0, x1 + 1):
            d = abs(x + 0.5 - cx) / max(h, 0.5)
            tone = LIGHT if d < 0.42 else ("brass", 7) if d < 0.66 else ("brass", 6) if d < 0.86 else ("brass", 4)
            cel.put(x, y, tone)
    # Strands: a few darker and a few whiter threads, a different set each frame so the light seems to pour.
    if half >= 3:
        for _ in range(int(half)):
            x = cx + (rnd.random() * 2 - 1) * half * 0.7
            y0 = top + rnd.random() * (base - top) * 0.8
            for y in range(int(y0), int(min(base, y0 + 8 + rnd.random() * 16))):
                cel.put(x, y, ("brass", 5) if rnd.random() < 0.5 else LIGHT)


def arrive_a_back(cel: Cel, i: int, t: float) -> None:
    cx, base = A_AX, A_GROUND
    if i == 0:  # a thread of light comes down from the sky, half way
        for y in range(0, 62):
            cel.put(cx, y, LIGHT if y > 30 else ("brass", 6))
        spark(cel, cx, 62, 2)
        return
    if i == 1:  # it touches the ground
        for y in range(0, base):
            cel.put(cx, y, LIGHT)
            if y % 3 == 0:
                cel.put(cx - 1, y, ("brass", 6))
                cel.put(cx + 1, y, ("brass", 6))
        spark(cel, cx, base - 1, 4)
        return
    half = _A_HALF[i]
    if half > 0:
        _column(cel, cx, 0, base, half, i)
        rim(cel, ("brass", 2))
    if 2 <= i <= 5:
        # The light pools on the ground behind the feet: a flat bright ellipse that spreads and thins.
        rx = [0, 0, 17, 20, 21, 21][i]
        ry = [0, 0, 4, 4, 3, 2][i]
        for y in range(-ry, ry + 1):
            w = rx * math.sqrt(max(0.0, 1 - (y / max(ry, 1)) ** 2))
            for x in range(int(-w), int(w) + 1):
                d = abs(x) / max(rx, 1)
                tone = LIGHT if d < 0.35 and i == 2 else ("brass", 7) if d < 0.6 else ("brass", 5)
                if i >= 4 and (x + y) % 2:
                    continue  # it breaks up as it fades
                cel.soft(cx + x, base + y, tone)
    if i >= 6:
        # What is left of the shaft lifts off as rising dashes and sparks.
        rnd = random.Random(5)
        k = i - 6
        for n in range(12):
            x = cx + (rnd.random() * 2 - 1) * (3 + k)
            y0 = base - 14 - rnd.random() * 100 - k * 9
            ln = max(1, int(7 - k * 1.5 + rnd.random() * 4))
            if y0 < 0 or rnd.random() < k * 0.16:
                continue
            for y in range(int(y0), int(y0) + ln):
                cel.put(x, y, LIGHT if (y - int(y0)) < ln // 2 + 1 else ("brass", 6))
        if i <= 8:
            spark(cel, cx + (-4, 5, -2)[k % 3], base - 46 - k * 16, 2 if k < 2 else 1)


def arrive_a_front(cel: Cel, i: int, t: float) -> None:
    """In front of the figure: the burst where the light hits the ground, the dust it rolls out along the path
    to both sides, and the motes that keep rising round the hero after the shaft has gone."""
    cx, base = 32, 36
    if i < 2:
        return
    k = i - 2  # 0 at the slam
    if k == 0:
        # The hit: a flat white flash along the ground with spikes of light thrown up from it.
        for x in range(-29, 30):
            d = abs(x) / 29
            cel.put(cx + x, base, LIGHT if d < 0.6 else ("brass", 6))
            if d < 0.78:
                cel.put(cx + x, base - 1, LIGHT if d < 0.4 else ("brass", 7))
            if d < 0.45:
                cel.put(cx + x, base + 1, ("brass", 6))
        for x, hgt in ((-23, 6), (-16, 12), (-10, 8), (-5, 5), (6, 6), (11, 13), (17, 9), (24, 5)):
            for y in range(hgt):
                cel.put(cx + x, base - 2 - y, LIGHT if y < hgt - 3 else ("brass", 6))
                if y < hgt // 2:
                    cel.put(cx + x + (1 if x < 0 else -1), base - 2 - y, ("brass", 7))
        rim(cel, ("brass", 2))
        return
    if k <= 5:
        # Dust rolls out along the path to both sides: three puffs a side, the outer ones ahead, all of them
        # spreading, lifting a little and thinning out.
        f = k / 5.0
        for s in (-1, 1):
            for n, (reach, size) in enumerate(((9, 4.6), (17, 3.8), (24, 2.8))):
                x = cx + s * (reach + ease_out(f, 1.8) * (5 + n * 2.5))
                r = size * (1.0 - 0.55 * f)
                if r < 0.9:
                    continue
                y = base - r * 0.7 - f * (1.5 + n)
                blob(cel, x, y, r * 1.25, r, ("bone", 6 if n == 0 else 5))
                blob(cel, x - s * 0.8, y - r * 0.35, r * 0.7, r * 0.55, ("bone", 7))
        rim(cel, ("ink", 3))
        if k >= 4:
            thin(cel, 0.75 if k == 4 else 0.45, seed=9)
        # What is left of the flash on the ground: a broken bright line that shortens.
        half = int(24 - k * 4.5)
        for x in range(-half, half + 1):
            if (x + k) % (2 + k // 2) == 0:
                cel.put(cx + x, base, ("brass", 7 if k < 3 else 6))
    # Motes of light climbing in front of the hero, slower than the shaft fades.
    rnd = random.Random(11)
    for n in range(16):
        x = cx + (rnd.random() * 2 - 1) * 14
        speed = 3.0 + rnd.random() * 3.5
        born = rnd.randint(1, 4)
        y = base - 5 - rnd.random() * 12 - (k - born) * speed
        if k < born or k > born + 5 or y < 1:
            continue
        cel.put(x, y, LIGHT)
        cel.put(x, y + 1, LIGHT if k - born < 2 else ("brass", 6))
        if k - born < 4:
            cel.put(x, y + 2, ("brass", 6))
        if n % 3 == 0 and k - born in (1, 2):
            spark(cel, x, y, 2 if n % 2 == 0 else 1)


# ----------------------------------------------------------------------------------------- arrival B
B_MS = [80] * 12  # 960 ms
_SIGIL_RAMPS = {"knight": "azure", "ranger": "moss", "priest": "brass"}


def _sigil(ramp: str):
    def draw(cel: Cel, i: int, t: float) -> None:
        """A sigil lying on the ground (seen from the side: a flat double ellipse with four bright points and a
        cross of spokes), opening from its centre, burning, then guttering out."""
        cx, cy = 24, 8
        grow = [0.25, 0.6, 0.9, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0][i]
        hot = [7, 7, 7, 6, 7, 6, 7, 6, 6, 5, 5, 4][i]
        rx, ry = 21 * grow, 5.5 * grow
        ring(cel, cx, cy, rx, ry, (ramp, hot), thick=1.0)
        if grow > 0.5:
            ring(cel, cx, cy, rx * 0.66, ry * 0.66, (ramp, hot - 1), thick=1.0, gap=lambda a: int((a + i * 20) / 30) % 2 == 0)
            for a in (0, 90, 180, 270):
                ca, sa = math.cos(math.radians(a + 45)), math.sin(math.radians(a + 45))
                for s in range(2, int(rx * 0.6)):
                    if s % 2 == 0:
                        cel.soft(cx + ca * s, cy + sa * s * ry / max(rx, 1), (ramp, hot - 2))
        if 2 <= i <= 8:
            for a in (0, 90, 180, 270):
                ca, sa = math.cos(math.radians(a + i * 12)), math.sin(math.radians(a + i * 12))
                cel.put(cx + ca * rx, cy + sa * ry, LIGHT)
                cel.put(cx + ca * rx, cy + sa * ry - 1, (ramp, 7))
            cel.put(cx, cy, LIGHT)
        rim(cel, (ramp, 1))
        if i >= 9:
            thin(cel, [0.7, 0.45, 0.22][i - 9], seed=3)

    return draw


def arrive_b_embers(cel: Cel, i: int, t: float) -> None:
    """Embers leave the ground all round the sigil, wind upwards in two strands that tighten round the body, and
    meet at the chest in a soft burst."""
    cx, base = 20, 56
    rnd = random.Random(17)
    f = i / 11.0
    for n in range(26):
        strand = n % 2
        born = rnd.random() * 0.45
        life = (f - born) / 0.55
        r0 = 13 + rnd.random() * 5
        turn = rnd.random() * math.tau
        if life <= 0 or life > 1:
            continue
        a = turn + life * math.tau * 1.25 * (1 if strand else -1)
        r = r0 * (1 - ease_out(life, 1.6)) + 1.5
        x = cx + math.cos(a) * r
        y = base - 2 - ease_out(life, 1.3) * 36 - math.sin(a) * r * 0.25
        tone = LIGHT if life > 0.55 else ("brass", 7) if life > 0.25 else ("crimson", 6)
        cel.put(x, y, tone)
        cel.put(x + 1, y, tone)
        if n % 3 == 0:  # every third ember is a fat one
            cel.put(x, y + 1, tone)
            cel.put(x + 1, y + 1, ("brass", 6))
        # A short tail behind each ember, along its path.
        a2 = turn + (life - 0.08) * math.tau * 1.25 * (1 if strand else -1)
        r2 = r0 * (1 - ease_out(max(0.0, life - 0.08), 1.6)) + 1.5
        cel.soft(cx + math.cos(a2) * r2, base - 2 - ease_out(max(0.0, life - 0.08), 1.3) * 36 - math.sin(a2) * r2 * 0.25, ("brass", 5))
    if 7 <= i <= 9:
        spark(cel, cx, base - 36, [2, 4, 2][i - 7])
    if i >= 9:
        # The burst leaves a few motes drifting up off the shoulders.
        for n in range(7):
            x = cx + (-9, -5, 6, 10, -2, 3, 8)[n]
            y = base - 34 - (i - 9) * (3 + n % 3) - (n * 3) % 7
            if y > 0:
                cel.put(x, y, LIGHT if n % 2 else ("brass", 6))
    rim(cel, ("brass", 2))


# ----------------------------------------------------------------------------------------- elite
E_MS = [100] * 8
#: Violet with a white heart: saturated, and nothing else an enemy wears burns like it (its debuffs drip or mark;
#: fire and gold are the party's, red is a boss's rage). From the rim in: edge, body, core.
_E_TONES = [("violet", 4), ("violet", 6), LIGHT]


def _wisp(cel: Cel, x: float, base: float, height: float, width: float, bend: float, phase: float) -> None:
    """One tongue of the elite's fire: it leaves the ground broad, narrows, and winds as it climbs (an S that
    travels up it with `phase`), ending in a thin curl — fire, not a spike."""
    h = max(1, int(round(height)))
    for j in range(h):
        f = j / max(1, h - 1)  # 0 at the base, 1 at the tip
        half = width / 2 * (1.0 - f**1.25) * (0.85 + 0.15 * math.sin(f * 6.0 + phase))
        cx = x + bend * f * f + math.sin(f * math.tau * 1.15 + phase) * (0.6 + 3.0 * f)
        y = base - j
        i0, i1 = int(math.floor(cx - half)), int(math.ceil(cx + half))
        for i in range(i0, i1 + 1):
            d = abs(i + 0.5 - cx) / max(half, 0.5)
            if d > 1.0:
                continue
            k = 0 if d > 0.62 or f > 0.82 else 1 if d > 0.3 or f > 0.55 else 2
            cel.put(i, y, _E_TONES[k])


def _elite_aura(w: int, base: int, spec: list[tuple[int, int, int]]):
    ax = w // 2

    def draw(cel: Cel, i: int, t: float) -> None:
        """The elite's fire, standing behind the body and well ABOVE it — its tongues lick up past the heads of a
        whole pack, so the elite shows even in the middle of one: a white heart, a violet body, a dark edge, and
        sparks that leave the tips and climb."""
        for k, (dx, h, wd) in enumerate(spec):
            ph = math.tau * (t + k * 0.29)
            _wisp(cel, ax + dx, base, h + 3.2 * math.sin(ph), wd, (2.4 if k % 2 else -2.0), ph)
        rim(cel, ("violet", 1))
        top = max(h for _, h, _ in spec)
        for k in range(6):
            f = (t + k / 6) % 1.0
            x = ax + spec[k % len(spec)][0] + math.sin(f * 6 + k) * 3
            y = base - top * 0.7 - f * (top * 0.4 + 8)
            if y >= 1:
                cel.put(x, y, LIGHT if f < 0.5 else ("violet", 7))
                if f < 0.3:
                    cel.put(x, y + 1, ("violet", 7))
                    cel.put(x + 1, y, ("violet", 6))

    return draw


def elite_sparks(cel: Cel, i: int, t: float) -> None:
    """In FRONT of the elite: bright motes of its fire climbing over the body, so the mark is on the figure and
    not only behind it."""
    ax, base = 16, 50
    rnd = random.Random(23)
    for k in range(9):
        x = ax + (rnd.random() * 2 - 1) * 12
        f = (t + rnd.random()) % 1.0
        y = base - 3 - f * 44
        if f > 0.92:
            continue
        cel.put(x, y, LIGHT)
        if f < 0.6:
            cel.put(x, y + 1, ("violet", 7))
        if k % 3 == 0 and 0.2 < f < 0.5:
            spark(cel, x, y, 1, LIGHT, ("violet", 7))
    rim(cel, ("violet", 2))


EA_MS = [50, 50, 60, 60, 70, 80, 90, 100]


def elite_arrive(cel: Cel, i: int, t: float) -> None:
    """An elite steps into the wave: a white-violet burst on it — a ring thrown out along the ground, shafts of its
    fire shooting up, then sparks — so the eye is on it the moment it arrives."""
    ax, base = 34, 70
    f = i / 7.0
    # The ring along the ground.
    rx = 6 + ease_out(f, 2.0) * 26
    if i <= 5:
        ring(cel, ax, base - 2, rx, max(2.0, rx * 0.22), LIGHT if i < 2 else ("violet", 7) if i < 4 else ("violet", 5), thick=2.0 if i < 4 else 1.0)
    # Shafts shooting up from the feet, tallest in the middle.
    if i <= 4:
        for dx, hgt in ((-14, 30), (-7, 50), (0, 64), (7, 48), (14, 28)):
            h = hgt * [0.45, 0.85, 1.0, 0.8, 0.5][i]
            for y in range(int(h)):
                g = y / max(1.0, h)
                wd = 2 if g < 0.6 else 1
                for xx in range(-wd + 1, wd):
                    cel.put(ax + dx + xx, base - 3 - y, LIGHT if (g < 0.55 and xx == 0) else ("violet", 7) if g < 0.8 else ("violet", 5))
    rim(cel, ("violet", 2))
    if i >= 4:
        rnd = random.Random(8)
        for k in range(14):
            x = ax + (rnd.random() * 2 - 1) * 22
            y = base - 10 - rnd.random() * 46 - (i - 4) * 4
            if y > 1 and rnd.random() > (i - 4) * 0.18:
                cel.put(x, y, LIGHT if k % 2 else ("violet", 7))
    if i >= 6:
        thin(cel, 0.55, seed=5)


def elite_crest(cel: Cel, i: int, t: float) -> None:
    """The mark over an elite's life bar: a gold crown with a jewel of its fire that flares once every loop."""
    rows = [
        "..g...g...g..",
        ".gGg.gGg.gGg.",
        ".gGg.gGg.gGg.",
        ".gGGgGGGgGGg.",
        ".gGGGGjGGGGg.",
        ".gHHHHHHHHHg.",
        ".ggggggggggg.",
    ]
    jewel = LIGHT if i in (0, 1) else ("violet", 6)
    legend = {"g": ("brass", 2), "G": ("brass", 5), "H": ("brass", 7), "j": jewel}
    cel.stamp(rows, legend, 1, 1)
    if i == 0:
        cel.put(7, 0, LIGHT)
    rim(cel, ("ink", 0))


# ----------------------------------------------------------------------------------------- the boss's door
# The threshold to the wall of a world: a heavy dark gate with two horns of stone, skulls at its foot and a wrong
# light inside. Without a key it is chained shut and cold. With one it WAKES: the chains are gone, a crimson rift
# turns in the doorway and, high in its dark, two eyes look out — whatever is behind it knows you are there.
P_W, P_H, P_AX, P_BASE = 68, 94, 34, 90
_P_IN = 13  # half-width of the doorway
_P_OUT = 22  # half-width of the gate
_P_SPRING, _P_TOP = 48, 22  # where the jambs end and the point of the arch


def _arch_inner(y: float) -> float:
    """Half-width of the doorway at row y: straight jambs up to the springing, then a pointed arch."""
    if y >= _P_SPRING:
        return _P_IN
    if y < _P_TOP:
        return 0.0
    f = (_P_SPRING - y) / (_P_SPRING - _P_TOP)
    return _P_IN * math.sqrt(max(0.0, 1.0 - f**1.7))


def _arch_outer(y: float) -> float:
    if y >= 44:
        return _P_OUT + (1.5 if y > 78 else 0)  # the jambs splay a little at the foot
    f = (44 - y) / 30.0
    return _P_OUT * math.sqrt(max(0.0, 1.0 - f**2.2)) if f <= 1 else 0.0


def _horn(cel: Cel, side: int) -> None:
    """A horn of stone rising from the gate's shoulder, bowing out and hooking back in over the doorway."""
    cx = P_AX
    p0, p1, p2 = (19.0, 46.0), (36.0, 26.0), (21.0, 3.0)
    steps = 120
    for k in range(steps + 1):
        f = k / steps
        x = (1 - f) ** 2 * p0[0] + 2 * (1 - f) * f * p1[0] + f * f * p2[0]
        y = (1 - f) ** 2 * p0[1] + 2 * (1 - f) * f * p1[1] + f * f * p2[1]
        half = 4.2 * (1 - f) ** 0.8 + 0.5
        for d in range(int(-half), int(half) + 1):
            # Lit from the upper left: the left flank of each horn is paler.
            lit = d < -half * 0.35 if side < 0 else d > half * 0.35
            tone = ("ink", 5) if (lit and side < 0) else ("ink", 2) if (lit and side > 0) else ("ink", 3)
            if d <= -half + 0.6 and side < 0:
                tone = ("ink", 6)
            cel.put(cx + side * (x + d), y, tone)
        if k % 17 == 8 and f < 0.8:  # growth rings
            for d in range(int(-half), int(half) + 1):
                cel.put(cx + side * (x + d), y, ("ink", 1))


_SKULL = ["..bbb..", ".bbbbb.", ".bkbkb.", ".bbbbb.", "..bkb.."]


def _gate(cel: Cel, lit: int) -> None:
    """The stone: `lit` 0 shut, 1 awake, 2 under the pointer — the brass set in it glows with the rift."""
    cx, base = P_AX, P_BASE
    _horn(cel, -1)
    _horn(cel, 1)
    for y in range(12, base + 1):
        inner, half = _arch_inner(y), _arch_outer(y)
        for x in range(int(-half), int(half) + 1):
            if abs(x) < inner:
                continue
            d = (x + half) / max(1.0, 2 * half)  # 0 at the left edge, 1 at the right
            tone = ("ink", 4) if d < 0.12 else ("ink", 3) if d < 0.5 else ("ink", 2)
            if abs(x) < inner + 2:
                tone = ("ink", 1) if abs(x) >= inner + 1 else ("ink", 0)  # the reveal of the doorway
            cel.put(cx + x, y, tone)
        if half >= 1:
            cel.put(cx - int(half), y, ("ink", 6))  # the pale edge the sky catches
            if y < 44:
                cel.put(cx - int(half) + 1, y, ("ink", 5))
    # Courses of masonry and a crack.
    for y in (54, 64, 74):
        for x in list(range(-_P_OUT + 1, -_P_IN - 2)) + list(range(_P_IN + 3, _P_OUT)):
            cel.put(cx + x, y, ("ink", 1))
    for k, (x, y) in enumerate(((17, 50), (18, 51), (18, 52), (19, 53), (19, 55), (20, 56), (-19, 66), (-18, 67), (-18, 68))):
        cel.put(cx + x, y, ("ink", 0))
    # Teeth along the crown of the arch.
    for dx, h in ((0, 7), (-7, 5), (7, 5), (-13, 4), (13, 4)):
        top = 12 + abs(dx) * 0.42
        for j in range(h):
            w = (h - j) // 2
            for x in range(-w, w + 1):
                cel.put(cx + dx + x, top - j, ("ink", 4) if x < 0 else ("ink", 2))
    # Plinths.
    for sgn in (-1, 1):
        for y in range(base - 6, base + 1):
            for x in range(_P_IN - 1, _P_OUT + 4):
                cel.put(cx + sgn * x, y, ("ink", 5) if y == base - 6 else ("ink", 3) if sgn < 0 else ("ink", 2))
    # Brass nails up the jambs and round the arch: dull when shut, burning when the rift is awake.
    glow = [("brass", 2), ("brass", 5), ("brass", 7)][lit]
    for sgn in (-1, 1):
        for y in range(50, base - 8, 6):
            cel.put(cx + sgn * (_P_IN + 5), y, glow)
            cel.put(cx + sgn * (_P_IN + 5), y + 1, ("brass", max(1, glow[1] - 2)))
        for k in range(4):
            a = math.radians(205 + k * 21) if sgn < 0 else math.radians(335 - k * 21)
            cel.put(cx + math.cos(a) * (_P_IN + 5), 46 + math.sin(a) * 22, glow)
    # Skulls of those who went in, heaped against the plinths.
    legend = {"b": ("bone", 6), "k": ("ink", 1)}
    cel.stamp(_SKULL, legend, cx - _P_OUT - 9, base - 5)
    cel.stamp(_SKULL, {"b": ("bone", 5), "k": ("ink", 1)}, cx - _P_OUT - 4, base - 9)
    cel.stamp(_SKULL, legend, cx + _P_OUT + 2, base - 5)
    for x in range(3):  # a thigh bone
        cel.put(cx + _P_OUT + 8 + x, base - 1 - (x % 2), ("bone", 5))


def _rift(cel: Cel, t: float, heat: int) -> None:
    """What stands in the doorway when it is awake: a crimson rift turning on itself, its arms winding into a
    bright heart low in the door; the top of the doorway stays dark — that is where the eyes are."""
    cx, cy = P_AX, 62
    rx, ry = _P_IN - 0.5, 27.0
    for y in range(_P_TOP + 1, P_BASE - 5):
        half = _arch_inner(y) - 1
        for x in range(int(-half), int(half) + 1):
            ex, ey = x / rx, (y - cy) / ry
            r = math.hypot(ex, ey)
            ang = math.atan2(ey, ex)
            arm = math.cos(3 * (ang - t * math.tau) + r * 7.0)
            v = (1.0 - min(1.0, r)) * 0.9 + arm * 0.32 * min(1.0, r * 2.2)
            v += 0.1 * heat
            v *= min(1.0, max(0.0, (y - 30) / 22.0))  # dark towards the top of the door
            tone = (("ink", 0) if v < 0.06 else ("crimson", 0) if v < 0.14 else ("crimson", 1) if v < 0.3 else ("crimson", 3) if v < 0.5
                    else ("crimson", 4) if v < 0.66 else ("crimson", 6) if v < 0.84 else ("dusk", 8) if v < 1.0 else LIGHT)
            cel.put(cx + x, y, tone)
    n = 7 + heat * 4
    for k in range(n):  # embers drawn in from the rim
        f = (t + k / n) % 1.0
        a = k * 2.4 + f * 3.0
        r = 1.0 - f
        x = cx + math.cos(a) * rx * r * 0.9
        y = cy + math.sin(a) * ry * r * 0.8
        if abs(x - cx) < _arch_inner(y) - 1:
            cel.put(x, y, LIGHT if f > 0.5 else ("dusk", 8))


def _eyes(cel: Cel, i: int, n: int, heat: int) -> None:
    """Two eyes high in the dark of the doorway: slanted, burning, blinking once a loop; wide open under the
    pointer."""
    cx, y = P_AX, 36
    blink = heat == 1 and i in (n - 3, n - 2)
    for sgn in (-1, 1):
        ex = cx + sgn * 5
        if blink:
            for d in range(-2, 3):
                cel.put(ex + d, y + 1, ("crimson", 4))
            continue
        tall = 2 if heat == 1 else 3
        for d in range(-2, 3):
            # slanted: the outer corner sits higher
            row = y - (1 if (d * sgn) > 0 else 0) + (1 if (d * sgn) < -1 else 0)
            for j in range(tall):
                edge = abs(d) == 2 or j == tall - 1
                cel.put(ex + d, row + j, ("crimson", 6) if edge else LIGHT if abs(d) == 0 else ("dusk", 9))
        cel.put(ex, y + 1, ("ink", 0))  # the slit of the pupil
        if heat == 2:
            cel.put(ex, y, ("ink", 0))
    if heat == 2:  # the glow of the eyes on the dark
        for sgn in (-1, 1):
            for d in (-4, 4):
                cel.soft(cx + sgn * 5 + d, y + 1, ("crimson", 3))


def _chains(cel: Cel) -> None:
    """Shut: two chains crossed over the doorway and a lock where they meet — it wants a key."""
    cx = P_AX
    for sgn in (-1, 1):
        for k in range(0, 41):
            f = k / 40.0
            x = cx + sgn * (-_P_IN - 3 + f * (2 * _P_IN + 6))
            y = 44 + f * 34
            link = k % 4
            tone = ("ink", 7) if link == 0 else ("ink", 5) if link in (1, 3) else ("ink", 2)
            cel.put(x, y, tone)
            cel.put(x, y + 1, ("ink", 3) if link != 2 else ("ink", 1))
    lock = [".ggg.", "g...g", "ggggg", "gGGGg", "gGkGg", "ggggg"]
    cel.stamp(lock, {"g": ("brass", 3), "G": ("brass", 5), "k": ("ink", 0)}, cx - 2, 58)


def _dark(cel: Cel, i: int) -> None:
    """The doorway without a key: nothing in it but dark and a dull red at its foot."""
    cx = P_AX
    for y in range(_P_TOP + 1, P_BASE - 5):
        half = _arch_inner(y) - 1
        for x in range(int(-half), int(half) + 1):
            deep = (y - _P_TOP) / (P_BASE - 5 - _P_TOP)
            tone = ("ink", 0) if deep < 0.8 else ("crimson", 0) if deep < 0.93 else ("crimson", 1)
            cel.put(cx + x, y, tone)
    for k in range(2):
        y = 80 - ((i * 7 + k * 17) % 30)
        x = cx + (-6, 5)[k] + ((i + k) % 2)
        if abs(x - cx) < _arch_inner(y) - 1:
            cel.put(x, y, ("crimson", 2))


def _portal(heat: int, n: int):
    def draw(cel: Cel, i: int, t: float) -> None:
        if heat == 0:
            _dark(cel, i)
        else:
            _rift(cel, t, heat)
            _eyes(cel, i, n, heat)
        _gate(cel, heat)
        if heat == 0:
            _chains(cel)
        # Its edge: slate when shut (dark on a pale sky, pale on a black one), the rift's own red when awake.
        rim(cel, [("ink", 4), ("crimson", 3), ("crimson", 4)][heat])
        if heat >= 1:
            # The rift's light spills over the sill onto the path.
            for x in range(-_P_IN - 4, _P_IN + 5):
                if (x + i) % 2 == 0 or heat == 2:
                    cel.soft(P_AX + x, P_BASE + 1, ("crimson", 5) if abs(x) > 7 else ("dusk", 8))
            for x in range(-_P_IN + 2, _P_IN - 1):
                if (x + i) % 3 == 0:
                    cel.soft(P_AX + x, P_BASE + 2, ("crimson", 3))
        if heat == 2:
            for k in range(6):  # sparks crawling up the stone
                f = (t + k / 6) % 1.0
                x = P_AX + (-24, 23, -20, 21, -27, 27)[k] + math.sin(f * 6 + k)
                y = (60, 56, 30, 34, 20, 18)[k] - f * 14
                if y > 1:
                    cel.put(x, y, LIGHT if f < 0.5 else ("brass", 6))

    return draw


PE_MS = [60, 60, 70, 70, 80, 80, 90, 100, 110]


def portal_enter(cel: Cel, i: int, t: float) -> None:
    """The party goes in: the eyes close, the rift whitens and bursts out of the doorway in rays, and the gate is
    swallowed by it and gone with the light."""
    cx, cy = P_AX, 58
    if i <= 4:
        _rift(cel, i / 8.0, 2)
        _gate(cel, 2)
    r = [5, 10, 17, 24, 30, 28, 20, 12, 5][i]
    for y in range(int(cy - r * 1.45), int(cy + r * 1.45) + 1):
        for x in range(int(-r), int(r) + 1):
            d = math.hypot(x / max(r, 1), (y - cy) / max(r * 1.45, 1))
            if d <= 1.0 and 1 <= y <= P_BASE:
                tone = LIGHT if d < 0.62 else ("dusk", 8) if d < 0.82 else ("crimson", 6)
                if i >= 6 and (x + y + i) % (i - 4) != 0:
                    continue  # it breaks up as it goes
                cel.put(cx + x, y, tone)
    if 1 <= i <= 6:
        for k in range(12):
            a = k * math.tau / 12 + 0.26
            r0, r1 = r * 0.9, r * 0.9 + [0, 6, 12, 16, 14, 10, 6][i]
            for sstep in range(int(r0), int(r1)):
                x = cx + math.cos(a) * sstep
                y = cy + math.sin(a) * sstep * 1.3
                if 1 <= y <= P_BASE:
                    cel.put(x, y, LIGHT if sstep < (r0 + r1) / 2 else ("crimson", 6))
    rim(cel, ("crimson", 1))
    if i >= 7:
        thin(cel, 0.6 if i == 7 else 0.3, seed=4)


FX: list[Fx] = [
    Fx("arrive_a_back", A_W, A_H, A_AX, A_GROUND, A_MS, False, arrive_a_back),
    Fx("arrive_a_front", 64, 44, 32, 36, A_MS, False, arrive_a_front),
    *[Fx(f"arrive_b_sigil_{cls}", 48, 16, 24, 8, B_MS, False, _sigil(ramp)) for cls, ramp in _SIGIL_RAMPS.items()],
    Fx("arrive_b_embers", 40, 60, 20, 56, B_MS, False, arrive_b_embers),
    # Elite ghost-fire: (dx, height, width) of each tongue.
    # The elite's fire: (dx, height, width) of each tongue — the tallest stands well above the body it is for.
    Fx("elite_aura_s", 36, 60, 18, 58, E_MS, True, _elite_aura(36, 58, [(-11, 22, 8), (-5, 38, 9), (2, 52, 10), (9, 34, 9), (13, 20, 7)])),
    Fx("elite_aura_m", 40, 92, 20, 90, E_MS, True, _elite_aura(40, 90, [(-13, 34, 9), (-6, 62, 10), (2, 84, 12), (10, 56, 10), (15, 30, 8)])),
    Fx("elite_aura_l", 44, 116, 22, 114, E_MS, True, _elite_aura(44, 114, [(-15, 44, 10), (-7, 80, 11), (2, 108, 13), (11, 72, 11), (17, 40, 9)])),
    Fx("elite_sparks", 32, 52, 16, 50, [90] * 8, True, elite_sparks),
    Fx("elite_arrive", 68, 72, 34, 70, EA_MS, False, elite_arrive),
    Fx("elite_crest", 15, 10, 7, 9, [140, 140, 700, 700], True, elite_crest),
    Fx("portal_shut", P_W, P_H, P_AX, P_BASE, [260] * 4, True, _portal(0, 4)),
    Fx("portal_open", P_W, P_H, P_AX, P_BASE, [100] * 12, True, _portal(1, 12)),
    Fx("portal_hot", P_W, P_H, P_AX, P_BASE, [80] * 12, True, _portal(2, 12)),
    Fx("portal_enter", P_W, P_H, P_AX, P_BASE, PE_MS, False, portal_enter),
]
