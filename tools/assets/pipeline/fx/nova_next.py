"""DRAFT (2026-11-20, lab): Holy Nova redrawn as ONE thing falling from the sky. Not exported (the list is
`DRAFTS`, not `FX`): the lab previews it (pipeline.nova_preview) until it is approved, then it replaces the
Holy Nova block of fx/priest.py.

Why: the old Nova scatters a shaft of light every 15 px across the wave and a starburst on every enemy, so a full
wave shows 10–13 shafts and ~20 stars at once. The new one is a single event that grows, whatever the wave:

  nova_kindle  over the middle of the wave, high in the sky: a star kindles while she lifts her staff
  nova_star    …and hangs there, turning (loop) until she drives the staff down
  nova_fall    it drops, a trail of light behind it, and lands as her staff strikes
  nova_impact  where it lands: a flash, a dome of light that bursts and rays thrown up
  nova_ground  the nova itself: a flat ring of light opening on the ground under the wave
  nova_crest   the ring's edge running on along the ground (drawn running right; mirrored for the left), moved by
               the strip from the ring to each end of the wave — so it always reaches exactly as far as the wave
  nova_touch   on each enemy as the crest passes under it: light flaring up through its feet (small, one each)
"""
from __future__ import annotations

import math
import random

from pipeline.fx import Fx, blob, ease_in, ease_out, rim, ring, streak, thin
from pipeline.rig import Cel

LIGHT = ("light", 0)
B7, B6, B5, B4, B2 = ("brass", 7), ("brass", 6), ("brass", 5), ("brass", 4), ("brass", 2)


def _star(cel: Cel, cx: float, cy: float, r: float, turn: float, core: float = 2.0) -> None:
    """The falling star: a white core in a gold ring, eight rays (long and short in turn) slowly turning."""
    for k in range(8):
        a = turn + math.tau * k / 8
        ln = r * (1.0 if k % 2 == 0 else 0.55)
        ca, sa = math.cos(a), math.sin(a)
        streak(cel, (cx + ca * (core + 0.5), cy + sa * (core + 0.5)), (cx + ca * ln, cy + sa * ln), [LIGHT, B7, B6])
    blob(cel, cx, cy, core + 1.2, core + 1.2, B7)
    blob(cel, cx, cy, core, core, LIGHT)


# ----------------------------------------------------------------------------------------- in the sky
def nova_kindle(cel: Cel, i: int, t: float) -> None:
    """A glint high over the wave opening into the star."""
    cx, cy = 13, 13
    if i == 0:
        cel.put(cx, cy, LIGHT)
        for d in (1, 2):
            for dx, dy in ((d, 0), (-d, 0), (0, d), (0, -d)):
                cel.put(cx + dx, cy + dy, B7 if d == 2 else LIGHT)
    else:
        _star(cel, cx + 0.5, cy + 0.5, (0, 5, 8, 11, 10)[i], 0.3 * i, (0, 0.8, 1.4, 2.2, 2.0)[i])
    rim(cel, B2)


def nova_star(cel: Cel, i: int, t: float) -> None:
    """The star hanging over the wave, turning, its rays breathing."""
    cx, cy = 13.5, 13.5
    _star(cel, cx, cy, 10 + (1 if i % 2 == 0 else 0), 1.2 + t * math.tau / 4, 2.0)
    rnd = random.Random(11 + i)
    for _ in range(2):
        a = rnd.random() * math.tau
        cel.put(cx + math.cos(a) * 12, cy + math.sin(a) * 12, B7)
    rim(cel, B2)


def nova_fall(cel: Cel, i: int, t: float) -> None:
    """The star dropping on the wave: faster and faster, a trail of light stretching behind it, and on the last
    frame squashed flat on the ground as it lands."""
    ax, base, top = 20, 124, 14
    n = 5
    if i < n - 1:
        y = top + (base - 8 - top) * ease_in(i / (n - 2), 1.7)
        prev = top + (base - 8 - top) * ease_in(max(0, i - 1) / (n - 2), 1.7)
        tail = max(10.0, (y - prev) * 1.6 + 8)
        for s in range(int(tail)):
            f = s / tail
            yy = y - 4 - s
            half = 2.6 * (1 - f) + 0.4
            for dx in range(int(-half) - 1, int(half) + 2):
                d = abs(dx + 0.5) / max(half, 0.5)
                if d <= 1 and not (f > 0.55 and (s + i) % 3 == 0):
                    cel.put(ax + dx, yy, LIGHT if d < 0.45 and f < 0.5 else B7 if f < 0.75 else B5)
        _star(cel, ax + 0.5, y + 0.5, 9 + i, 1.2 + i * 0.35, 2.2)
        rnd = random.Random(i)
        for k in range(3):
            cel.put(ax + (rnd.random() - 0.5) * 12, y - 6 - rnd.random() * tail, LIGHT if k % 2 else B7)
    else:
        blob(cel, ax + 0.5, base - 2, 8, 2.6, B7)
        blob(cel, ax + 0.5, base - 2, 5, 1.6, LIGHT)
        for s in range(18):
            cel.put(ax, base - 4 - s, LIGHT if s < 10 else B7)
            if s < 8:
                cel.put(ax + 1, base - 4 - s, B7)
                cel.put(ax - 1, base - 4 - s, B7)
    rim(cel, B2)


# ----------------------------------------------------------------------------------------- the landing
def nova_impact(cel: Cel, i: int, t: float) -> None:
    """Where the star lands: a white flash, a dome of light that swells and bursts, rays thrown up and out."""
    ax, base = 40, 56
    if i == 0:
        blob(cel, ax + 0.5, base - 2, 16, 4, B7)
        blob(cel, ax + 0.5, base - 2, 11, 3, LIGHT)
        blob(cel, ax + 0.5, base - 9, 6, 8, LIGHT)
        for k in range(8):
            a = math.pi * (1.0 + (k + 0.5) / 8)
            ln = 20 if k % 2 == 0 else 13
            streak(cel, (ax + math.cos(a) * 7, base - 6 + math.sin(a) * 6), (ax + math.cos(a) * ln * 1.3, base - 6 + math.sin(a) * ln), [LIGHT, LIGHT, B7])
    if 1 <= i <= 4:
        rx = (0, 17, 24, 29, 32)[i]
        ry = (0, 15, 20, 22, 22)[i]
        th = (0, 3.5, 2.5, 1.5, 1.0)[i]
        ring(cel, ax + 0.5, base - 2, rx, ry, LIGHT if i < 3 else B7, 180, 360, th)
        ring(cel, ax + 0.5, base - 2, rx + 1, ry + 1, B6, 180, 360, 1.0)
        if i < 3:  # the ground lit inside the dome, fading
            blob(cel, ax + 0.5, base - 1.5, rx * 0.8, 1.6, B7 if i == 1 else B5)
            if i == 1:
                blob(cel, ax + 0.5, base - 1.5, rx * 0.45, 1.0, LIGHT)
        for k in range(7):  # rays thrown up and out through the dome
            a = math.pi * (1.1 + 0.8 * k / 6)
            r0, r1 = rx * 0.9, rx * (1.25 + 0.15 * (k % 2))
            if i <= 3:
                streak(cel, (ax + math.cos(a) * r1, base - 2 + math.sin(a) * r1 * ry / rx), (ax + math.cos(a) * r0, base - 2 + math.sin(a) * r0 * ry / rx), [LIGHT, B7, B5])
        if i >= 3:
            thin(cel, 0.7 if i == 3 else 0.4, 5)
    if i >= 3:  # motes of light climbing out of it
        rnd = random.Random(9)
        for k in range(9):
            x = ax + (rnd.random() - 0.5) * 44
            y = base - 6 - rnd.random() * 26 - (i - 3) * 6
            cel.put(x, y, LIGHT if k % 2 else B7)
            if i < 5:
                cel.put(x, y + 1, B6)
    rim(cel, B2)


def nova_ground(cel: Cel, i: int, t: float) -> None:
    """The nova opening on the ground: a flat ring of light, fat near edge and thin far one, specks thrown up off
    its rim; it opens fast and is already thinning when the crests run on from it."""
    ax, ay = 56, 14
    rx = 6 + 44 * ease_out(t, 1.7)
    ry = rx * 0.2
    body = 6.0 - 3.5 * t
    for j in range(cel.h):
        for x in range(cel.w):
            px, py = x + 0.5 - ax, j + 0.5 - ay
            d = math.hypot(px / max(rx, 0.1), py / max(ry, 0.1))
            near = 0.55 + 0.45 * (py / max(ry, 0.1) if abs(py) <= ry else (1 if py > 0 else -1))
            wdt = (body * (0.3 + 0.7 * near)) / max(rx, 1.0)
            off = 1.0 - d
            if 0 <= off < wdt:
                f = off / wdt
                cel.put(x, j, LIGHT if f < 0.4 else B7 if f < 0.75 else B5)
            elif i < 2 and wdt <= off < wdt * 3 and (x + j) % 2 == 0:
                cel.put(x, j, B5)
    rnd = random.Random(4)
    for k in range(14):
        a = math.tau * k / 14 + 0.15
        if math.sin(a) > 0.35:
            continue  # nothing thrown up off the near edge, so the feet stay readable
        x, y = ax + math.cos(a) * rx, ay + math.sin(a) * ry
        h = 2 + rnd.random() * 5 * (1 - t)
        cel.put(x, y - h, LIGHT if k % 2 else B7)
    if i >= 3:
        thin(cel, 1.0 - 0.75 * (i - 2) / 3, 2)
    rim(cel, B2)


def nova_crest(cel: Cel, i: int, t: float) -> None:
    """The ring's edge running on along the ground (drawn running right): a low wave of light leaning forward,
    the ground lit behind it and fading; it sinks as it goes. The anchor is its foot at the front."""
    fx, base = 54, 19
    h = 14 - 8 * ease_in(t, 1.2)
    lean = 5.0
    for y in range(int(math.ceil(h))):
        f = y / max(h, 1)  # 0 at the foot, 1 at the top
        front = fx - lean * f * f
        back = front - (6 - 4 * f) * (1 - 0.3 * t)
        for x in range(int(math.floor(back)), int(math.ceil(front))):
            d = (front - x) / max(front - back, 0.5)  # 0 at the front edge
            cel.put(x, base - y, LIGHT if d < 0.35 else B7 if d < 0.75 else B5)
    trail = 40 - 12 * t
    for s in range(int(trail)):
        f = s / trail
        if f > 0.5 and (s + i) % 2 == 0:
            continue
        cel.put(fx - 6 - s, base, B7 if f < 0.35 else B5)
        if f < 0.25:
            cel.put(fx - 6 - s, base - 1, B6)
    rnd = random.Random(20 + i)
    for k in range(3):
        cel.put(fx - 3 - rnd.random() * 18, base - h - 1 - rnd.random() * 6, LIGHT if k % 2 else B7)
    if i >= 5:
        thin(cel, 0.75 if i == 5 else 0.5 if i == 6 else 0.3, 7)
    rim(cel, B2)


def nova_touch(cel: Cel, i: int, t: float) -> None:
    """The crest passing under an enemy: a glint on the ground at its feet and a few motes of light lifting off it
    — one small thing per enemy, never a star or a column (a row of those reads as a row of numbers)."""
    ax, base = 11, 26
    if i < 3:
        blob(cel, ax, base - 0.5, (5.5, 7, 5)[i], (1.6, 1.4, 1.0)[i], B7)
        blob(cel, ax, base - 0.5, (3, 4, 2.5)[i], 0.8, LIGHT)
    for k, (dx, speed, ph) in enumerate(((-5, 5.0, 0), (-1, 7.0, 1), (3, 6.0, 0), (6, 4.5, 1))):
        if i < 1 + ph:
            continue
        y = base - 3 - (i - ph) * speed
        x = ax + dx + (i - ph) * (0.5 if dx > 0 else -0.5)
        cel.put(x, y, LIGHT if k % 2 == 0 else B7)
        if i - ph < 3:
            cel.put(x, y + 1, B6)
    if i >= 4:
        thin(cel, 0.5, 3)
    rim(cel, B2)


DRAFTS = [
    Fx("nova_kindle", 27, 27, 13, 13, [70, 70, 70, 80, 80], False, nova_kindle),
    Fx("nova_star", 28, 28, 13, 13, [90, 90, 90, 90], True, nova_star),
    Fx("nova_fall", 40, 128, 20, 124, [40, 40, 40, 40, 50], False, nova_fall),
    Fx("nova_impact", 80, 60, 40, 56, [45, 55, 60, 70, 80, 90, 100], False, nova_impact),
    Fx("nova_ground", 112, 28, 56, 14, [40, 45, 50, 60, 70, 80], False, nova_ground),
    Fx("nova_crest", 58, 30, 54, 19, [50, 50, 55, 55, 60, 60, 70, 80], False, nova_crest),
    Fx("nova_touch", 22, 30, 11, 26, [40, 50, 60, 70, 80], False, nova_touch),
]
