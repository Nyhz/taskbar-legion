"""What the ENEMIES throw and do to the party, and the few signs a blow can raise. Everything is drawn going RIGHT
(or facing right); the game mirrors it for a foe, which faces left.

Their shots         foe_arrow (flat) · foe_arrow_arc (lofted over the front line: one frame per pitch, rising to
                    falling) · foe_bolt (a caster's) · foe_hit (where any of them lands on a hero)
The warning         warn_crack / warn_crack_hot (the ground under the party while an area blow is wound up: the
                    game lays more of them, further back, as the cast fills, and the hot ones over its last third)
Brutal Smash        smash_burst (dust and stones kicked along the ground through the party)
Ground Slam         slam_spike (rock driven up out of the path, one after another, through the party)
Shockwave           shock_ring (where the world boss lets it go) · shock_front (the wall of force that runs through
                    the party) · shock_trail (what it leaves behind)
Any of the three    jolt (under each hero it reaches)
Frenzy              frenzy_burst (it takes hold) · frenzy_fire (while it lasts, along the boss's feet)
Mortal Wound        mortal_rend (the blow) · mortal_wound (while healing is cut: on the wounded hero)
Signs of a blow     block_spark (a hit blocked) · invuln_glance (a hit that did nothing) · multi_sign (a second strike)
"""
from __future__ import annotations

import math
import random

from pipeline.fx import Fx, blob, ease_in, ease_out, flame, poly, rim, ring, spark, streak, thin
from pipeline.fx.knight import _ground_ring
from pipeline.rig import Cel

LIGHT = ("light", 0)
EMBER = [("crimson", 4), ("crimson", 6), ("brass", 6)]


def _shaft(cel: Cel, hx: float, hy: float, ang: float, ln: int = 15) -> None:
    """A foe's arrow with its HEAD at (hx, hy), pointing towards `ang` (degrees; 0 = right, 90 = down): black
    iron, a bone-pale shaft so it shows on a dark sky, ragged violet fletching."""
    a = math.radians(ang)
    dx, dy = math.cos(a), math.sin(a)
    for s in range(ln):
        cel.put(hx - dx * s, hy - dy * s, ("ink", 7) if s < 2 else ("violet", 5) if s >= ln - 3 else ("bone", 5))
    cel.put(hx - dx * 2 - dy, hy - dy * 2 + dx, ("ink", 7))
    cel.put(hx - dx * 2 + dy, hy - dy * 2 - dx, ("ink", 7))
    for s in (ln - 2, ln - 1):
        cel.put(hx - dx * s - dy, hy - dy * s + dx, ("violet", 6))
        cel.put(hx - dx * s + dy, hy - dy * s - dx, ("violet", 4))


def foe_arrow(cel: Cel, i: int, t: float) -> None:
    _shaft(cel, 19, 3, 0.0)
    rim(cel, ("ink", 0))


ARC_PITCH = [-52, -40, -27, -13, 0, 13, 27, 40, 52]  # one frame per pitch, from climbing to falling


def foe_arrow_arc(cel: Cel, i: int, t: float) -> None:
    ang = ARC_PITCH[i]
    a = math.radians(ang)
    _shaft(cel, 11 + math.cos(a) * 7.5, 11 + math.sin(a) * 7.5, ang)
    rim(cel, ("ink", 0))


def foe_bolt(cel: Cel, i: int, t: float) -> None:
    """A caster's bolt: a knot of dark violet with a sick bright core, ragged behind."""
    y, hx = 6, 22
    rnd = random.Random(60 + i)
    for s in range(18):
        f = s / 18
        x = hx - 3 - s
        up = int(round((1 - f) * 2.2 * (0.5 + 0.7 * rnd.random())))
        for d in range(-up, up + 1):
            cel.put(x, y + d, ("violet", 7) if abs(d) <= up * 0.4 and f < 0.4 else ("violet", 5) if f < 0.6 else ("violet", 4))
    blob(cel, hx - 0.5, y + 0.5, 3.0, 3.0, ("violet", 6))
    blob(cel, hx - 0.5, y + 0.5, 1.7, 1.7, ("violet", 8))
    cel.put(hx - 1, y, LIGHT)
    rim(cel, ("violet", 0))
    cel.put(hx - 8, y - 3 + (i % 2), ("crimson", 6))
    cel.put(hx - 13, y + 3 - (i % 2), ("crimson", 5))


def foe_hit(cel: Cel, i: int, t: float) -> None:
    """A foe's shot landing on a hero: a short crimson burst — small, the number says the rest."""
    cx, cy = 11, 11
    r = (3, 6, 8, 9)[i]
    for k in range(6):
        a = math.tau * k / 6 + 0.5
        ca, sa = math.cos(a), math.sin(a)
        streak(cel, (cx + ca * r, cy + sa * r), (cx + ca * r * (0.3 + 0.18 * i), cy + sa * r * (0.3 + 0.18 * i)), [("crimson", 7), ("crimson", 6), ("crimson", 4)])
    if i < 2:
        blob(cel, cx + 0.5, cy + 0.5, 2.6 - i, 2.6 - i, ("crimson", 7))
    if i == 3:
        thin(cel, 0.5, 1)
    rim(cel, ("crimson", 1))


# ----------------------------------------------------------------------------------------- the warning
def _crack(cel: Cel, i: int, hot: bool) -> None:
    """A run of the path splitting open: a jagged glowing seam with embers jumping off it."""
    base = 13 if hot else 9
    rnd = random.Random(4)
    y = base - 2
    pts = []
    for x in range(0, 24):
        if x % 4 == 0:
            y = base - 2 + rnd.randint(-1, 1)
        pts.append((x, y))
    for x, y in pts:
        on = (x * 3 + i * 5) % 11 != 0
        cel.put(x, y, (("brass", 7) if hot else ("brass", 5)) if on else ("crimson", 5))
        cel.put(x, y + 1, ("crimson", 5) if hot else ("crimson", 4))
        if hot and on and x % 2 == 0:
            cel.put(x, y - 1, LIGHT if (x + i) % 4 == 0 else ("brass", 6))
    for k in range(4 if hot else 2):
        x = (k * 7 + i * 3) % 24
        f = ((i + k * 2) % 6) / 6
        h = (9 if hot else 5) * f
        cel.put(x, base - 3 - h, ("brass", 6) if f < 0.5 else ("crimson", 6))
        if hot:
            cel.put(x, base - 2 - h, ("crimson", 6))
    rim(cel, ("crimson", 1))


def warn_crack(cel: Cel, i: int, t: float) -> None:
    _crack(cel, i, False)


def warn_crack_hot(cel: Cel, i: int, t: float) -> None:
    _crack(cel, i, True)


# ----------------------------------------------------------------------------------------- the three area blows
def _dust(cel: Cel, ax: float, base: float, i: int, t: float, reach: float, height: float, stones: int, seed: int) -> None:
    rnd = random.Random(seed)
    grow = ease_out(t, 1.7)
    for k in range(5):
        dx = (k - 2) * reach * 0.42 * (0.5 + 0.5 * grow)
        r = (2.4 + rnd.random() * 2.0) * (0.6 + 0.6 * grow) * (1.0 - 0.5 * t)
        y = base - 2 - height * 0.35 * grow * (0.5 + rnd.random())
        blob(cel, ax + dx, y, r * 1.25, r, ("bone", 4) if k % 2 else ("bone", 5))
        cel.put(ax + dx - 1, y - r * 0.5, ("bone", 6))
    for k in range(stones):
        a = math.pi * (1.15 + 0.7 * rnd.random())
        sp = (0.5 + rnd.random()) * height
        x = ax + math.cos(a) * sp * 0.9 * grow
        y = base - 3 + math.sin(a) * sp * grow + t * t * height * 0.9
        cel.put(x, y, ("leather", 4))
        cel.put(x + 1, y, ("leather", 2))
        if k % 2 == 0:
            cel.put(x, y - 1, ("leather", 6))


def smash_burst(cel: Cel, i: int, t: float) -> None:
    """Brutal Smash reaching back: the ground jumps — dust and stones kicked up in a low burst."""
    ax, base = 14, 24
    if i < 2:
        streak(cel, (ax - 9, base - 2), (ax + 9, base - 2), [LIGHT, ("bone", 7), LIGHT])
    _dust(cel, ax, base, i, t, 12, 15, 7, 8)
    if i >= 4:
        thin(cel, 0.55, 3)
    rim(cel, ("ink", 1))


def slam_spike(cel: Cel, i: int, t: float) -> None:
    """Ground Slam: a tooth of rock driven up out of the path, cracked with fire at its root, then falling apart."""
    ax, base = 15, 44
    up = (0.25, 0.8, 1.0, 1.0, 0.92, 0.7, 0.4)[i]
    h = 30 * up
    if i < 6:
        for y in range(int(base - h), base):
            f = min(1.0, (base - y) / max(h, 1.0))  # 0 at the root, 1 at the tip
            half = 6.5 * (1 - f) ** 0.8 + 0.6
            lean = f * 3.0
            for x in range(int(math.floor(ax + lean - half)), int(math.ceil(ax + lean + half))):
                d = (x + 0.5 - (ax + lean)) / half
                tone = ("leather", 6) if d < -0.35 else ("leather", 4) if d < 0.35 else ("leather", 2)
                if (x * 5 + y * 3) % 17 == 0:
                    tone = ("leather", 3)
                cel.put(x, y, tone)
        # the fire in its root
        for x in range(ax - 7, ax + 8):
            if (x + i) % 3 != 0:
                cel.put(x, base - 1, ("brass", 6) if i < 4 else ("crimson", 5))
                if i < 3 and x % 2 == 0:
                    cel.put(x, base - 2, ("brass", 7))
    _dust(cel, ax, base, i, t, 13, 18, 8, 12)
    if i >= 5:
        thin(cel, 0.6 if i == 5 else 0.35, 4)
    rim(cel, ("ink", 1))


def shock_ring(cel: Cel, i: int, t: float) -> None:
    _ground_ring(cel, i, t, LIGHT, ("violet", 7), ("violet", 5), ("violet", 1), False)


def shock_front(cel: Cel, i: int, t: float) -> None:
    """The Shockwave itself: a wall of force as tall as a hero running along the ground — a pale crescent bowed
    the way it travels, the air torn into streaks behind it."""
    ax, base = 22, 60
    for y in range(base - 50, base):
        f = (base - y) / 50.0  # 0 on the ground, 1 at its top
        bow = math.sin(f * math.pi * 0.92) * 9.0 + 2.0 * math.sin(f * 9 + t * math.tau)
        x = ax + bow - 6
        thick = 3.2 * (1 - f * 0.75) + 0.8
        for d in range(int(thick) + 1):
            cel.put(x - d, y, LIGHT if d == 0 else ("violet", 8) if d < thick * 0.5 else ("violet", 6))
        if (y + i * 2) % 5 == 0 and f < 0.85:
            ln = 6 + ((y * 7 + i * 3) % 9)
            streak(cel, (x - thick - 1, y), (x - thick - 1 - ln, y), [("violet", 7), ("violet", 5), ("violet", 4)])
    for k in range(4):
        x = ax - 8 - ((i * 4 + k * 5) % 12)
        cel.put(x, base - 2 - (k * 3 + i) % 6, ("bone", 5))
        cel.put(x + 1, base - 1, ("bone", 4))
    rim(cel, ("violet", 1))


def shock_trail(cel: Cel, i: int, t: float) -> None:
    """Behind the wave: the path smoking where it passed."""
    ax, base = 13, 20
    _dust(cel, ax, base, i, t, 10, 11, 3, 31)
    for k in range(3):
        cel.put(ax - 6 + k * 6, base - 6 - t * 9 - k, ("violet", 6) if i < 3 else ("violet", 4))
    if i >= 3:
        thin(cel, 0.55, 6)
    rim(cel, ("ink", 1))


def jolt(cel: Cel, i: int, t: float) -> None:
    """Under a hero the blow reaches: the ground kicks — white ticks either side of the feet and a puff of dust."""
    ax, base = 15, 18
    r = 5 + 8 * ease_out(t)
    for side in (-1, 1):
        for k in range(3):
            a = math.radians(200 + k * 22) if side < 0 else math.radians(340 - k * 22)
            x0, y0 = ax + math.cos(a) * r, base - 2 + math.sin(a) * r * 0.7
            x1, y1 = ax + math.cos(a) * (r + 3 - i * 0.6), base - 2 + math.sin(a) * (r + 3 - i * 0.6) * 0.7
            streak(cel, (x1, y1), (x0, y0), [LIGHT, ("bone", 7), ("bone", 5)])
    if i < 3:
        blob(cel, ax - 7 - i, base - 2, 2.2, 1.6, ("bone", 5))
        blob(cel, ax + 7 + i, base - 2, 2.2, 1.6, ("bone", 5))
    if i >= 3:
        thin(cel, 0.5, 2)
    rim(cel, ("ink", 1))


# ----------------------------------------------------------------------------------------- Frenzy
def frenzy_burst(cel: Cel, i: int, t: float) -> None:
    """Frenzy taking hold: a ring of red fire bursts out round the boss's feet."""
    _ground_ring(cel, i, t, ("brass", 7), ("crimson", 6), ("crimson", 4), ("crimson", 1), True)


def frenzy_fire(cel: Cel, i: int, t: float) -> None:
    """While it is frenzied: red fire running along its feet, tongues snapping up."""
    ax, base = 13, 30
    for k, (dx, h, w) in enumerate(((-8, 12, 6), (-2, 22, 8), (5, 15, 7), (10, 9, 5))):
        ph = math.tau * (t + k * 0.27)
        flame(cel, ax + dx, base - 1, h + 4.0 * math.sin(ph), w, EMBER, sway=2.5 * math.sin(ph + k), seed=k * 7 + i)
    rim(cel, ("crimson", 1))
    for k in range(3):
        f = (t + k / 3) % 1.0
        cel.put(ax - 8 + k * 8 + math.sin(f * 9 + k) * 2, base - 14 - f * 14, ("brass", 7) if f < 0.5 else ("crimson", 6))


# ----------------------------------------------------------------------------------------- Mortal Wound
def mortal_rend(cel: Cel, i: int, t: float) -> None:
    """Mortal Wound landing: three claws of violet dark tear down across the hero."""
    cx, cy = 22, 22
    reach = ease_out(min(1.0, t * 1.8), 1.6)
    for k in (-1, 0, 1):
        x0, y0 = cx + 13 + k * 6, cy - 16 + k * 2
        x1, y1 = x0 - 26 * reach, y0 + 30 * reach
        n = int(34 * reach)
        for s in range(n):
            f = s / max(1, n)
            x, y = x0 + (x1 - x0) * f, y0 + (y1 - y0) * f + math.sin(f * math.pi) * 2
            w = 2.2 * math.sin(f * math.pi) + 0.5
            for d in range(int(-w), int(w) + 1):
                cel.put(x + d, y, ("violet", 8) if i < 2 and abs(d) < 1 else ("violet", 6) if abs(d) < w * 0.6 else ("violet", 4))
    if i >= 3:
        thin(cel, 1.0 - 0.3 * (i - 2), 8)
    rim(cel, ("violet", 0))
    if i < 3:
        for k in (-1, 0, 1):
            cel.put(cx + 13 + k * 6 - 26 * reach, cy - 16 + k * 2 + 30 * reach, ("crimson", 6))


def mortal_wound(cel: Cel, i: int, t: float) -> None:
    """While healing is cut: the wound stays open on the body — three dark violet gashes that drip and pulse."""
    cx, cy = 12, 10
    beat = i in (0, 1)
    for k in (-1, 0, 1):
        for s in range(9):
            f = s / 8
            x, y = cx + 5 + k * 4 - s * 1.1, cy - 5 + k + s * 1.2
            cel.put(x, y, ("violet", 7) if beat and 2 <= s <= 6 else ("violet", 5))
            if 2 <= s <= 6:
                cel.put(x + 1, y, ("violet", 3))
    for k in range(3):
        f = (t + k / 3) % 1.0
        x = cx - 4 + k * 4
        y = cy + 4 + f * 10
        cel.put(x, y, ("violet", 6))
        cel.put(x, y - 1, ("violet", 4))
        if f > 0.8:
            cel.put(x, y + 1, ("crimson", 5))
    rim(cel, ("violet", 0))


# ----------------------------------------------------------------------------------------- signs of a blow
def block_spark(cel: Cel, i: int, t: float) -> None:
    """A hit blocked: steel rings — a white-blue star on the shield and a bow of sparks thrown back off it."""
    cx, cy = 13, 13
    spark(cel, cx, cy, (4, 7, 5, 2)[i], LIGHT, ("azure", 7))
    r = 5 + 7 * ease_out(t)
    ring(cel, cx - 2, cy, r, r * 1.15, ("azure", 8) if i < 2 else ("azure", 6), a0=-62, a1=62, thick=1.8 - t)
    rnd = random.Random(9)
    for k in range(5):
        a = math.radians(-60 + k * 30 + rnd.random() * 10)
        sp = r + 1 + rnd.random() * 3
        cel.put(cx + math.cos(a) * sp, cy + math.sin(a) * sp, LIGHT if k % 2 else ("brass", 7))
    if i == 3:
        thin(cel, 0.5, 2)
    rim(cel, ("azure", 1))


def invuln_glance(cel: Cel, i: int, t: float) -> None:
    """A hit that did nothing at all: it skids off in a curl of gold light."""
    cx, cy = 15, 15
    a0 = 200 + 90 * ease_out(t)
    ring(cel, cx, cy, 10, 10, ("brass", 7), a0=a0 - 70, a1=a0, thick=2.0 - t * 1.2)
    ring(cel, cx, cy, 10, 10, LIGHT, a0=a0 - 22, a1=a0, thick=1.2)
    a = math.radians(a0)
    spark(cel, cx + math.cos(a) * 10, cy + math.sin(a) * 10, (4, 5, 3, 2)[i], LIGHT, ("brass", 7))
    if i == 3:
        thin(cel, 0.5, 3)
    rim(cel, ("brass", 2))


def multi_sign(cel: Cel, i: int, t: float) -> None:
    """A second strike in the same breath: two bright cuts, one after the other, crossing."""
    cx, cy = 15, 11
    for k, (sx, sy, ex, ey) in enumerate(((-11, -7, 9, 5), (-9, 6, 11, -6))):
        if i < k:
            continue
        f = ease_out(min(1.0, (i - k + 1) / 2.0))
        x1, y1 = cx + sx + (ex - sx) * f, cy + sy + (ey - sy) * f
        streak(cel, (x1, y1), (cx + sx, cy + sy), [LIGHT, LIGHT, ("brass", 7), ("brass", 6)])
        streak(cel, (x1, y1 + 1), (cx + sx + 3, cy + sy + 1), [("brass", 7), ("brass", 6), ("brass", 5)])
    if 1 <= i <= 2:
        spark(cel, cx, cy, 3, LIGHT, ("brass", 7))
    if i >= 3:
        thin(cel, 0.75 if i == 3 else 0.4, 4)
    rim(cel, ("brass", 2))


FX = [
    Fx("foe_arrow", 21, 7, 11, 3, [100], True, foe_arrow),
    Fx("foe_arrow_arc", 23, 23, 11, 11, [100] * len(ARC_PITCH), True, foe_arrow_arc),
    Fx("foe_bolt", 26, 13, 21, 6, [60, 60, 60], True, foe_bolt),
    Fx("foe_hit", 23, 23, 11, 11, [35, 45, 55, 70], False, foe_hit),
    Fx("warn_crack", 24, 12, 12, 8, [90] * 6, True, warn_crack),
    Fx("warn_crack_hot", 24, 16, 12, 12, [70] * 6, True, warn_crack_hot),
    Fx("smash_burst", 28, 26, 14, 24, [35, 45, 60, 70, 80, 90], False, smash_burst),
    Fx("slam_spike", 32, 46, 15, 44, [35, 40, 70, 110, 70, 80, 90], False, slam_spike),
    Fx("shock_ring", 128, 44, 64, 26, [45, 50, 55, 60, 70, 80, 90], False, shock_ring),
    Fx("shock_front", 40, 62, 22, 60, [60, 60, 60, 60], True, shock_front),
    Fx("shock_trail", 26, 22, 13, 20, [50, 60, 70, 80, 90], False, shock_trail),
    Fx("jolt", 30, 20, 15, 18, [35, 45, 55, 70, 80], False, jolt),
    Fx("frenzy_burst", 128, 44, 64, 26, [45, 50, 55, 60, 70, 80, 90], False, frenzy_burst),
    Fx("frenzy_fire", 26, 32, 13, 30, [85] * 6, True, frenzy_fire),
    Fx("mortal_rend", 44, 44, 22, 22, [35, 45, 60, 70, 80], False, mortal_rend),
    Fx("mortal_wound", 24, 26, 12, 10, [130, 110, 150, 150, 150, 150], True, mortal_wound),
    Fx("block_spark", 27, 27, 13, 13, [35, 50, 60, 70], False, block_spark),
    Fx("invuln_glance", 31, 31, 15, 15, [40, 50, 60, 70], False, invuln_glance),
    Fx("multi_sign", 31, 23, 15, 11, [45, 55, 90, 70, 70], False, multi_sign),
]
