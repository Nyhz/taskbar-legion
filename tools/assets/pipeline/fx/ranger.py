"""The Ranger's ability effects. Body effects are anchored on the body's centre at the ground line, hits on their
own centre, arrows on the middle of their shaft.

His arrows        arrow (every basic shot) — the variants below replace it while an ability says so
Rapid Fire        tempo_burst (cast) · tempo_up + tempo_up_front (while on: a calm stream of green arrows climbing)
Aimed Shot        aim_gather (cast: light gathers on the arrowhead) · arrow_heavy · aim_impact (the enemy hit)
Raining Arrows    volley_launch (cast, at the release) · arrow_fall (over the wave, three waves) · arrow_hit (each enemy hit)
Explosive Arrow   arrow_fire · fire_blast (where it lands) · burning (Scorched Earth: its targets burn)
Caltrops          caltrops_toss (cast, at the throw) · caltrop_patch (on the ground under the wave) · bleeding
Weak Spot         weak_crack (the enemy hit) · weak_spot (while it takes more damage)
Tar Flask         flask (thrown) · tar_splash (where it lands) · tar_fire (burning on the ground) · tarred
Mark of the Hunter mark_call (cast) · mark_lock (the mark closing on its bearer) · hunter_mark / hunter_mark_big (while marked)
Killing Field     snare (every enemy of the wave is snared and exposed)
"""
from __future__ import annotations

import math
import random

from ..rig import Cel
from . import Fx, blob, ease_in, ease_out, flame, poly, rim, ring, spark, streak, thin

LIGHT = ("light", 0)
FIRE = [("crimson", 5), ("brass", 5), ("brass", 7)]  # rim, body, core of an orange flame


def _arrow(cel: Cel, hx: float, hy: float, ang: float = 0.0, ln: int = 15, shaft=("leather", 6), head=("ink", 8), fletch=("crimson", 4)) -> None:
    """An arrow with its HEAD at (hx, hy), pointing towards `ang` (degrees; 0 = right, 90 = down)."""
    a = math.radians(ang)
    dx, dy = math.cos(a), math.sin(a)
    for s in range(ln):
        cel.put(hx - dx * s, hy - dy * s, head if s < 2 else fletch if s >= ln - 3 else shaft)
    cel.put(hx - dx * 2 - dy, hy - dy * 2 + dx, head)
    cel.put(hx - dx * 2 + dy, hy - dy * 2 - dx, head)
    for s in (ln - 2, ln - 1):
        cel.put(hx - dx * s - dy, hy - dy * s + dx, fletch)
        cel.put(hx - dx * s + dy, hy - dy * s - dx, fletch)


def _dots(cel: Cel, pts, tone) -> None:
    for x, y in pts:
        cel.put(x, y, tone)


# ----------------------------------------------------------------------------------------- his arrows
def arrow(cel: Cel, i: int, t: float) -> None:
    _arrow(cel, 19, 3)
    rim(cel, ("ink", 1))


def arrow_heavy(cel: Cel, i: int, t: float) -> None:
    """Aimed Shot: a long war arrow with a white-hot point and a clean bright line behind it."""
    y = 5
    for s in range(34):
        f = s / 34
        x = 60 - 17 - s
        cel.put(x, y, LIGHT if f < 0.4 else ("bone", 7) if f < 0.7 else ("bone", 5))
        if f < 0.3:
            cel.put(x, y - 1, ("bone", 7))
            cel.put(x, y + 1, ("bone", 7))
    _arrow(cel, 60, y, ln=19, shaft=("bone", 6), head=LIGHT, fletch=("bone", 7))
    rim(cel, ("ink", 1))
    spark(cel, 60, y, 2 if i % 2 == 0 else 1, LIGHT, ("bone", 7))


def arrow_fire(cel: Cel, i: int, t: float) -> None:
    """Explosive Arrow: the head is a burning charge; fire and smoke trail off it."""
    y = 7
    rnd = random.Random(40 + i)
    for s in range(26):
        f = s / 26
        x = 46 - 6 - s
        up = int(round((1.0 - f) * 2.5 * (0.6 + 0.6 * rnd.random())))
        for d in range(-up, up + 1):
            near = abs(d) <= up * 0.4
            cel.put(x, y + d - (1 if f > 0.5 else 0), ("brass", 7) if near and f < 0.35 else ("brass", 5) if near or f < 0.5 else ("crimson", 5))
    for k in range(4):
        cel.put(12 - k * 3 + rnd.randint(-1, 1), y - 3 - k + rnd.randint(-1, 1), ("ink", 4 + (k % 2)))
    _arrow(cel, 48, y, ln=14, shaft=("leather", 5), head=("ink", 8), fletch=("crimson", 4))
    blob(cel, 44.5, y + 0.5, 2.6, 2.2, ("brass", 6))
    cel.put(45, y, LIGHT)
    cel.put(44, y, LIGHT)
    rim(cel, ("crimson", 1))


def flask(cel: Cel, i: int, t: float) -> None:
    """Tar Flask in the air: a stoppered clay flask turning end over end, its wick alight."""
    cx, cy = 7.0, 7.0
    a = math.tau * t
    ca, sa = math.cos(a), math.sin(a)
    for u in range(-3, 4):  # along the flask (neck at +u)
        half = 2.4 if u < 1 else 1.0
        for v in range(-3, 4):
            if abs(v) <= half:
                x, y = cx + ca * u - sa * v, cy + sa * u + ca * v
                cel.put(x, y, ("leather", 5) if v < 0 else ("leather", 3) if u < 1 else ("leather", 4))
    cel.put(cx + ca * 4, cy + sa * 4, ("brass", 7))
    cel.put(cx + ca * 5, cy + sa * 5, LIGHT if i % 2 == 0 else ("brass", 6))
    cel.put(cx + ca * 5 - sa, cy + sa * 5 + ca, ("crimson", 5))
    rim(cel, ("ink", 1))


# ----------------------------------------------------------------------------------------- Rapid Fire
# The classic "stat up" sign — small green arrows rising round him — drawn properly: three sizes of arrow with a
# bright core and a dark green edge. A CALM stream the eye can follow (the user found the first version "muchas y
# muy rápido"): four arrows on screen at once, each taking about a second to climb from his feet to his head at
# a steady, staggered rhythm, and stopping under his life bar.
_UP_HEAD = {3: (1, 3, 5, 7), 2: (1, 3, 5), 1: (1, 3)}  # rows of the head, by size
_UP_SHAFT = {3: (3, 4), 2: (1, 3), 1: (1, 2)}  # width and rows of the shaft
_GREEN, _GREEN_HI, _GREEN_LO, _GREEN_EDGE = ("moss", 6), ("moss", 8), ("moss", 5), ("moss", 2)


def _up(cel: Cel, x: float, tip: float, size: int, fade: float = 0.0) -> None:
    """An arrow pointing up with its TIP at (x, tip): size 3, 2 or 1. `fade` 0→1 shortens it from the tail (it
    thins out as it reaches his head)."""
    y = tip
    for w in _UP_HEAD[size]:
        for dx in range(-(w // 2), w // 2 + 1):
            cel.put(x + dx, y, LIGHT if (dx == 0 and size >= 2) else _GREEN_HI if dx == 0 else _GREEN if abs(dx) < w // 2 or w <= 3 else _GREEN_LO)
        y += 1
    w, rows = _UP_SHAFT[size]
    rows = max(0, int(round(rows * (1.0 - fade))))
    for r in range(rows):
        for dx in range(-(w // 2), w // 2 + 1):
            cel.put(x + dx, y, _GREEN_HI if (dx == 0 and size == 3) else _GREEN if r < rows - 1 else _GREEN_LO)
        y += 1


#: How far above the ground line an arrow's tip stops: his head, under the life bar (which sits 46 px up).
_RISE_TOP = 41.0


def _rise(cel: Cel, ax: float, base: float, lanes, t: float) -> None:
    """Arrows climbing their lanes at a steady pace: each (dx, size, phase offset, climbs per loop). One is born as
    a spark at his feet, climbs evenly and thins out as it reaches his head."""
    for dx, size, off, speed in lanes:
        ph = (t * speed + off) % 1.0
        if ph < 0.05:
            cel.put(ax + dx, base - 2, _GREEN_HI)  # the spark it springs from
            continue
        tip = base - 5 - ph * (_RISE_TOP - 5)
        _up(cel, ax + dx, tip, size if ph > 0.12 else 1, fade=max(0.0, (ph - 0.78) / 0.22))
        if 0.12 < ph < 0.78:  # a short wake, so it reads as climbing
            tail = tip + len(_UP_HEAD[size]) + _UP_SHAFT[size][1]
            cel.put(ax + dx, tail + 1, _GREEN_LO)
            cel.put(ax + dx, tail + 3, _GREEN_LO)
            if size == 3:
                cel.put(ax + dx, tail + 5, _GREEN_LO)
        if ph > 0.93:
            thin_tail = [(x, y) for (x, y) in cel.px if abs(x - (ax + dx)) <= 3 and y >= tip + 2 and y <= tip + 12]
            for xy in thin_tail:
                del cel.px[xy]


# The lasting loop is 3.9 s (60 frames of 65 ms): a lane climbs 3 times in it (1.3 s a climb) or 4 (just under 1 s).
_BACK_LANES = [(-13, 3, 0.00, 3), (-1, 1, 0.40, 4), (12, 2, 0.70, 3)]
_FRONT_LANES = [(-11, 2, 0.20, 4)]
_TEMPO_FRAMES = 60


def tempo_up(cel: Cel, i: int, t: float) -> None:
    """While it lasts, behind and beside him: three arrows climbing."""
    _rise(cel, 22, 60, _BACK_LANES, t)
    rim(cel, _GREEN_EDGE)


def tempo_up_front(cel: Cel, i: int, t: float) -> None:
    """The one that passes in front of him, at his back shoulder (his face and bow stay clear)."""
    _rise(cel, 16, 60, _FRONT_LANES, t)
    rim(cel, _GREEN_EDGE)


def tempo_burst(cel: Cel, i: int, t: float) -> None:
    """The cast: five of the same arrows shot up out of the ground at his feet, off a flash of green."""
    ax, base = 24, 58
    grow = ease_out(t, 2.0)
    ring(cel, ax, base - 1, 5 + 14 * grow, 2.2, _GREEN_HI if t < 0.5 else _GREEN, a0=180, a1=360, thick=1.6 - t)
    if i <= 1:
        blob(cel, ax, base - 2, 6 - i * 2, 2.0, LIGHT)
        spark(cel, ax, base - 3, 4 - i * 2, LIGHT, _GREEN_HI)
    for k, (dx, size, lag) in enumerate(((-15, 1, 0.12), (-8, 3, 0.0), (0, 2, 0.08), (8, 3, 0.03), (15, 1, 0.14))):
        ph = max(0.0, min(1.0, (t - lag) / (1.0 - lag)))
        if ph <= 0.0:
            continue
        tip = base - 6 - ease_out(ph, 1.9) * (30 + (k % 2) * 6)
        x = ax + dx * (1.0 + 0.1 * ph)
        _up(cel, x, tip, size, fade=max(0.0, (ph - 0.75) / 0.25))
        for j in range(1, 5):  # the streak it leaves
            y = tip + len(_UP_HEAD[size]) + _UP_SHAFT[size][1] + j * 2
            if y < base - 2 and ph < 0.8:
                cel.put(x, y, _GREEN if j < 3 else _GREEN_LO)
    if i >= 5:
        thin(cel, 1.0 - 0.6 * (i - 4) / 2.0, 6)
    rim(cel, _GREEN_EDGE)


# ----------------------------------------------------------------------------------------- Aimed Shot
def aim_gather(cel: Cel, i: int, t: float) -> None:
    """Light is drawn out of the air onto the arrowhead while he holds the draw."""
    cx, cy = 20, 20
    rnd = random.Random(5)
    for k in range(12):
        a = math.tau * rnd.random()
        r0 = 10 + 9 * rnd.random()
        f = min(1.0, t * 1.25 + rnd.random() * 0.15)
        r = r0 * (1 - f)
        if r < 1.5:
            continue
        x, y = cx + math.cos(a) * r, cy + math.sin(a) * r * 0.9
        streak(cel, (x, y), (x + math.cos(a) * 4, y + math.sin(a) * 3.6), [LIGHT, ("bone", 7), ("bone", 5)])
    core = (1, 1, 2, 3, 4, 5)[min(i, 5)]
    spark(cel, cx, cy, core, LIGHT, ("bone", 7))
    if i >= 4:
        ring(cel, cx, cy, 6 + (i - 4) * 3, 6 + (i - 4) * 3, ("bone", 7), thick=1.2)
    rim(cel, ("ink", 2))


def aim_impact(cel: Cel, i: int, t: float) -> None:
    """The heavy arrow goes through: a lance of white along its line, a ring punched out, splinters."""
    cx, cy = 26, 18
    ln = 10 + 16 * ease_out(t)
    half = max(0.6, 2.6 * (1 - t))
    poly(cel, [(cx - ln, cy), (cx - 2, cy - half), (cx + ln, cy), (cx - 2, cy + half)], LIGHT)
    poly(cel, [(cx - ln * 0.6, cy - half - 1), (cx + ln * 0.7, cy - 1), (cx + ln * 0.7, cy + 1), (cx - ln * 0.6, cy + half + 1)], ("bone", 7))
    poly(cel, [(cx - ln, cy), (cx - 2, cy - half), (cx + ln, cy), (cx - 2, cy + half)], LIGHT)
    r = 4 + 12 * ease_out(t, 1.6)
    ring(cel, cx + 2, cy, r * 0.45, r, ("bone", 7), thick=2.0 - 1.4 * t)
    rnd = random.Random(9)
    for k in range(9):
        a = (rnd.random() - 0.5) * 1.5
        d = 5 + (8 + 10 * rnd.random()) * t
        x, y = cx + math.cos(a) * d, cy + math.sin(a) * d
        cel.put(x, y, LIGHT)
        cel.put(x - 1, y, ("bone", 6))
    if i == 0:
        spark(cel, cx, cy, 6, LIGHT, ("bone", 7))
    if i >= 3:
        thin(cel, 1.0 - 0.6 * (i - 2) / 2.0, 4)
    rim(cel, ("ink", 2))


# ----------------------------------------------------------------------------------------- Raining Arrows
def volley_launch(cel: Cel, i: int, t: float) -> None:
    """The volley leaving the bow: a fan of arrows climbing ahead of him, each with its line of light."""
    ax, base = 14, 62
    bx, by = ax + 12, base - 26
    for n, ang in enumerate((-64, -54, -44, -34, -24)):
        d = 6 + (30 + n * 3) * ease_out(t, 1.4)
        a = math.radians(ang)
        hx, hy = bx + math.cos(a) * d, by + math.sin(a) * d
        tail = min(d - 4, 12 + 10 * t)
        streak(cel, (hx - math.cos(a) * 13, hy - math.sin(a) * 13), (hx - math.cos(a) * (13 + tail), hy - math.sin(a) * (13 + tail)), [("bone", 7), ("bone", 5), ("bone", 4)])
        _arrow(cel, hx, hy, ang, ln=13)
    if i == 0:
        spark(cel, bx, by, 4, LIGHT, ("bone", 7))
    if i >= 4:
        thin(cel, 1.0 - 0.75 * (i - 3) / 2.0, 2)
    rim(cel, ("ink", 1))


def _war_arrow(cel: Cel, hx: float, hy: float, ang: float, ln: int = 22) -> None:
    """A big arrow of the rain, HEAD at (hx, hy): a two-pixel shaft lit along its upper edge, a broad iron head and
    long crimson fletching — big enough to read from across the strip."""
    a = math.radians(ang)
    dx, dy = math.cos(a), math.sin(a)
    nx, ny = -dy, dx  # across the shaft
    for s in range(ln):
        x, y = hx - dx * s, hy - dy * s
        if s < 4:
            continue
        cel.put(x, y, ("leather", 6) if s < ln - 6 else ("crimson", 5))
        cel.put(x + nx, y + ny, ("leather", 4) if s < ln - 6 else ("crimson", 3))
    for s in range(5):  # the head: a broad leaf of iron, bright at its point
        half = (0, 1, 2, 2, 1)[s]
        for k in range(-half, half + 2):
            cel.put(hx - dx * s + nx * k * 0.9, hy - dy * s + ny * k * 0.9, ("ink", 9) if s < 2 else ("ink", 7))
    for s in range(ln - 6, ln):  # the fletching, spread either side
        spread = 1 + (s - (ln - 6)) // 2
        for side in (-1, 2):
            k = side * spread if side < 0 else 1 + spread
            cel.put(hx - dx * s + nx * k, hy - dy * s + ny * k, ("crimson", 6 if side < 0 else 4))


def arrow_fall(cel: Cel, i: int, t: float) -> None:
    """One arrow of the rain: a big war arrow streaking down from high up, biting into the ground with a burst of
    dirt, quivering, then gone. Three waves of them come down over the wave (render/abilityFx ranger_multishot)."""
    gx, gy = 26, 112  # where it lands
    ang = 70.0
    a = math.radians(ang)
    dx, dy = math.cos(a), math.sin(a)
    if i < 4:
        back = (104, 74, 44, 16)[i]
        hx, hy = gx - dx * back, gy - dy * back
        streak(cel, (hx - dx * 22, hy - dy * 22), (hx - dx * 50, hy - dy * 50), [("bone", 7), ("bone", 6), ("bone", 4)])
        streak(cel, (hx - dx * 22 + 1, hy - dy * 22), (hx - dx * 40 + 1, hy - dy * 40), [("bone", 5), ("bone", 4)])
        _war_arrow(cel, hx, hy, ang)
        rim(cel, ("ink", 1))
        return
    wob = (0.0, 4.0, -3.0, 2.0, -1.0, 0.0, 0.0, 0.0)[min(i - 4, 7)]
    _war_arrow(cel, gx + dx * 3, gy + dy * 3, ang + wob)
    for xy in [p for p in cel.px if p[1] >= gy]:
        del cel.px[xy]  # the point is in the ground
    rim(cel, ("ink", 1))
    if i == 4:  # the bite: dirt thrown up either side, a flash at the shaft
        for k in range(7):
            blob(cel, gx - 9 + k * 3, gy - 1 - (k % 2) * 2, 1.8, 1.2, ("leather", 5 if k % 2 else 4))
        spark(cel, gx, gy - 2, 3, LIGHT, ("bone", 7))
    elif i == 5:
        for k in range(5):
            cel.put(gx - 10 + k * 5, gy - 4 - (k % 2) * 3, ("leather", 5))
            cel.put(gx - 10 + k * 5, gy - 3 - (k % 2) * 3, ("leather", 3))
    if i >= 8:
        thin(cel, (0.6, 0.3)[min(i - 8, 1)], 12)


def arrow_hit(cel: Cel, i: int, t: float) -> None:
    """An arrow of the rain finding a body: a short flash and the shaft standing in it."""
    cx, cy = 11, 13
    if i < 2:
        spark(cel, cx, cy, 4 - i * 2, LIGHT, ("bone", 7))
    _arrow(cel, cx + 1, cy + 2, 66.0 + (4, -3, 1, 0)[i], ln=10)
    rim(cel, ("ink", 1))
    if i == 3:
        thin(cel, 0.5, 3)


# ----------------------------------------------------------------------------------------- Explosive Arrow
def fire_blast(cel: Cel, i: int, t: float) -> None:
    """The charge going off: a white flash, a ball of fire rolling up and out, black smoke and flung embers."""
    cx, base = 40, 58
    rnd = random.Random(17)
    grow = ease_out(t, 2.0)
    if i == 0:
        blob(cel, cx, base - 10, 9, 8, LIGHT)
        spark(cel, cx, base - 10, 12, LIGHT, ("brass", 7))
        rim(cel, ("brass", 2))
        return
    R = 10 + 20 * grow
    lobes = [(0, -0.55, 1.0), (-0.62, -0.3, 0.72), (0.62, -0.3, 0.72), (-0.3, -0.95, 0.66), (0.34, -0.9, 0.62), (0.0, -1.25, 0.5)]
    cool = max(0.0, (t - 0.35) / 0.65)  # the fire turns to smoke from the outside in
    for (ox, oy, s) in lobes:
        blob(cel, cx + ox * R, base - 2 + oy * R * 0.9, R * s * 0.62, R * s * 0.56, ("ink", 3) if cool > 0.55 else ("crimson", 4))
    for (ox, oy, s) in lobes:
        k = 0.78 - 0.5 * cool
        if k > 0.12:
            blob(cel, cx + ox * R * 0.92, base - 2 + oy * R * 0.86, R * s * 0.62 * k, R * s * 0.56 * k, ("brass", 5) if cool < 0.6 else ("crimson", 5))
    for (ox, oy, s) in lobes[:4]:
        k = 0.5 - 0.6 * cool
        if k > 0.1:
            blob(cel, cx + ox * R * 0.8, base - 3 + oy * R * 0.8, R * s * 0.6 * k, R * s * 0.54 * k, ("brass", 7))
    if t < 0.4:
        blob(cel, cx, base - 6 - R * 0.4, R * 0.3 * (1 - t * 2), R * 0.26 * (1 - t * 2), LIGHT)
    for k in range(14):
        a = -math.pi * (0.08 + 0.84 * rnd.random())
        d = R * (0.9 + 0.9 * rnd.random()) * (0.5 + 0.7 * t)
        x, y = cx + math.cos(a) * d, base - 4 + math.sin(a) * d + 14 * t * t
        if y < base:
            cel.put(x, y, LIGHT if t < 0.5 else ("brass", 6))
            cel.put(x - math.cos(a), y - math.sin(a), ("brass", 5) if t < 0.7 else ("crimson", 5))
    # the scorch ring running along the ground
    ring(cel, cx, base - 1, 8 + 26 * grow, 2.2, ("brass", 6) if t < 0.5 else ("crimson", 4), a0=180, a1=360, thick=1.4)
    if i >= 5:
        thin(cel, 1.0 - 0.38 * (i - 4), 21)
    rim(cel, ("ink", 1) if cool > 0.55 else ("crimson", 1))


def burning(cel: Cel, i: int, t: float) -> None:
    """Scorched Earth: fire clings to whatever the blast touched — flames up its body, embers lifting off."""
    ax, base = 11, 30
    for k, (dx, h, w, lift) in enumerate(((-6, 9, 5, 0), (1, 13, 6, 7), (6, 8, 5, 2), (-2, 8, 5, 15))):
        ph = math.tau * (t + k * 0.27)
        flame(cel, ax + dx, base - lift, h + 2.0 * math.sin(ph), w, FIRE, sway=1.5 * math.sin(ph + 0.8), seed=k * 3 + i)
    rim(cel, ("crimson", 1))
    for k in range(3):
        f = (t + k / 3) % 1.0
        cel.put(ax - 5 + k * 5 + math.sin(f * 6 + k) * 2, base - 16 - f * 12, LIGHT if f < 0.4 else ("brass", 6))


# ----------------------------------------------------------------------------------------- Caltrops
def _caltrop(cel: Cel, x: float, y: float, glint: bool = False, blood: bool = False) -> None:
    """A four-pointed iron caltrop resting on the ground at (x, y): three feet down, one point up."""
    _dots(cel, [(x, y - 3), (x, y - 2)], ("ink", 8))
    _dots(cel, [(x, y - 1), (x - 1, y), (x + 1, y), (x - 2, y), (x + 2, y)], ("ink", 6))
    cel.put(x, y - 4, LIGHT if glint else ("crimson", 5) if blood else ("ink", 9))
    if glint:
        _dots(cel, [(x - 1, y - 4), (x + 1, y - 4), (x, y - 5)], ("bone", 7))


def caltrops_toss(cel: Cel, i: int, t: float) -> None:
    """The handful leaving his hand: iron points fanning out low over the ground ahead."""
    ax, base = 6, 30
    rnd = random.Random(3)
    for k in range(22):
        a = math.radians(-34 + 40 * rnd.random())
        v = 26 + 30 * rnd.random()
        x = ax + 8 + math.cos(a) * v * t
        y = base - 9 + math.sin(a) * v * t + 26 * t * t
        if y >= base - 1:
            continue
        cel.put(x, y, ("ink", 9) if (k + i) % 2 else ("ink", 7))
        cel.put(x - 1, y, ("ink", 6))
        cel.put(x, y - 1, ("ink", 6))
        if (k + i) % 4 == 0:
            cel.put(x + 1, y - 1, LIGHT)
    rim(cel, ("ink", 1))


_PATCH = [(5, 9, 0), (12, 10, 2), (19, 8, 1), (25, 10, 3)]  # x, y, landing delay (frames)


def caltrop_patch(cel: Cel, i: int, t: float) -> None:
    """A patch of the field: caltrops drop, bounce once and lie there glinting until the bleed is over."""
    n_fall = 4
    last = 15  # frames 16, 17 fade
    for k, (x, y, delay) in enumerate(_PATCH):
        if i < n_fall:
            f = i - delay * 0.75
            if f < 0:
                continue
            hop = (9, 4, 2, 0)[min(3, int(f))]
            if hop > 0:
                _dots(cel, [(x, y - hop - 2), (x - 1, y - hop - 1), (x + 1, y - hop - 1), (x, y - hop)], ("ink", 7))
                cel.put(x, y - hop - 3, ("ink", 9))
                continue
        _caltrop(cel, x, y, glint=(i >= n_fall and (i + k * 2) % 6 == 0), blood=(i > 8 and k % 2 == 0))
    rim(cel, ("ink", 1))
    if i > last:
        thin(cel, (0.6, 0.3)[min(i - last - 1, 1)], 8)


def bleeding(cel: Cel, i: int, t: float) -> None:
    """The bleed: blood running off the legs and dripping to a small pool, a caltrop caught underfoot."""
    ax, base = 10, 14
    for k, (dx, off) in enumerate(((-5, 0.0), (0, 0.4), (5, 0.75))):
        f = (t + off) % 1.0
        y = base - 11 + f * 9
        cel.put(ax + dx, y, ("crimson", 5))
        cel.put(ax + dx, y - 1, ("crimson", 4))
        if f < 0.3:
            cel.put(ax + dx, y - 2, ("crimson", 3))
    _dots(cel, [(ax - 6, base - 1), (ax - 5, base - 1), (ax - 4, base - 1), (ax - 1, base - 1), (ax, base - 1), (ax + 1, base - 1), (ax + 4, base - 1), (ax + 5, base - 1)], ("crimson", 3))
    _dots(cel, [(ax - 5, base - 2), (ax, base - 2), (ax + 5, base - 2)], ("crimson", 4) if i % 2 else ("crimson", 5))
    _caltrop(cel, ax + 8, base - 1, glint=(i == 2), blood=True)
    rim(cel, ("crimson", 1))


# ----------------------------------------------------------------------------------------- Weak Spot
_CRACK = [((0, 0), (-5, -6)), ((-5, -6), (-4, -10)), ((0, 0), (6, -4)), ((6, -4), (10, -3)), ((0, 0), (3, 7)), ((3, 7), (2, 11)), ((0, 0), (-7, 3)), ((-7, 3), (-10, 6))]


def _crack(cel: Cel, cx: float, cy: float, grow: float, core, edge) -> None:
    for (a, b) in _CRACK:
        ax, ay = cx + a[0] * grow, cy + a[1] * grow
        bx, by = cx + b[0] * grow, cy + b[1] * grow
        streak(cel, (ax, ay), (bx, by), [core, core, edge])


def weak_crack(cel: Cel, i: int, t: float) -> None:
    """The shot finds the opening: the hide splits in a star of amber light."""
    cx, cy = 16, 16
    _crack(cel, cx, cy, (0.5, 0.9, 1.15, 1.0, 1.0)[i], LIGHT, ("brass", 6))
    if i < 3:
        spark(cel, cx, cy, (6, 5, 3)[i], LIGHT, ("brass", 7))
        ring(cel, cx, cy, 4 + i * 4, 4 + i * 4, ("brass", 6), thick=1.6 - i * 0.4)
    rim(cel, ("brass", 1))
    if i == 4:
        thin(cel, 0.6, 2)


def weak_spot(cel: Cel, i: int, t: float) -> None:
    """While it lasts: the wound stays open — a cracked star glowing amber, its heart beating."""
    cx, cy = 13, 13
    beat = (0, 1, 2, 1, 0, 0)[i]
    _crack(cel, cx, cy, 0.9 + 0.05 * beat, ("brass", 7) if beat else ("brass", 6), ("brass", 4))
    blob(cel, cx, cy, 1.6 + beat * 0.7, 1.6 + beat * 0.7, LIGHT if beat else ("brass", 7))
    if beat == 2:
        spark(cel, cx, cy, 3, LIGHT, ("brass", 7))
    rim(cel, ("crimson", 1))


# ----------------------------------------------------------------------------------------- Tar Flask
def _tar(cel: Cel, cx: float, base: float, half: float, seed: int) -> None:
    """A slick of tar on the path: black, ragged-edged, with a dull blue sheen."""
    rnd = random.Random(seed)
    for x in range(int(cx - half), int(cx + half) + 1):
        f = abs(x - cx) / max(1.0, half)
        d = 2 if f < 0.75 else 1
        for j in range(d + (1 if rnd.random() < 0.3 else 0)):
            cel.put(x, base - j, ("ink", 0) if j else ("ink", 1))
        if rnd.random() < 0.3 and f < 0.85:
            cel.put(x, base - d, ("dusk", 4))
    cel.put(cx - half, base, ("dusk", 3))
    cel.put(cx + half, base, ("dusk", 3))


def tar_splash(cel: Cel, i: int, t: float) -> None:
    """The flask bursts: tar thrown out along the ground and up in ropes, catching fire as it flies."""
    cx, base = 32, 32
    half = 6 + 22 * ease_out(t, 1.8)
    _tar(cel, cx, base, half, 4)
    rnd = random.Random(8)
    for k in range(11):
        a = -math.pi * (0.1 + 0.8 * rnd.random())
        v = 12 + 14 * rnd.random()
        x = cx + math.cos(a) * v * t * 1.5
        y = base - 2 + math.sin(a) * v * t + 22 * t * t
        if y < base - 1:
            blob(cel, x, y, 1.6, 1.3, ("ink", 1))
            if k % 2 == 0 and t > 0.25:
                cel.put(x, y - 2, ("brass", 6))
                cel.put(x, y - 3, LIGHT)
    if i == 0:
        spark(cel, cx, base - 4, 5, LIGHT, ("brass", 7))
        _dots(cel, [(cx - 3, base - 6), (cx + 2, base - 7), (cx - 1, base - 9), (cx + 4, base - 4)], ("leather", 4))
    if i >= 2:
        for k, dx in enumerate((-14, -5, 4, 13)):
            if abs(dx) < half:
                flame(cel, cx + dx, base - 1, (i - 1) * 2.5 + k % 2 * 2, 5, FIRE, sway=1.0, seed=k + i)
    rim(cel, ("ink", 0), only=lambda tone: tone[0] != "ink")


_TAR_BURN = 36  # frames of steady burning between catching and dying


def tar_fire(cel: Cel, i: int, t: float) -> None:
    """A stretch of the burning slick: black tar with fire walking over it for as long as it burns."""
    cx, base = 16, 24
    n = _TAR_BURN + 5
    level = min(1.0, (i + 1) / 2.0) if i < 2 else max(0.0, (n - i) / 3.5) if i >= n - 3 else 1.0
    _tar(cel, cx, base, 14 * (0.6 + 0.4 * min(1.0, i / 1.0)), 6)
    c = i / 6.0
    for k, (dx, h, w) in enumerate(((-10, 9, 5), (-4, 15, 7), (3, 11, 6), (9, 14, 6))):
        ph = math.tau * (c + k * 0.29)
        hh = (h + 3.0 * math.sin(ph)) * level
        if hh > 2:
            flame(cel, cx + dx, base - 1, hh, w, FIRE, sway=1.8 * math.sin(ph + 0.9), seed=k * 3 + i % 6)
    rim(cel, ("crimson", 1), only=lambda tone: tone[0] != "ink")
    for k in range(3):
        f = (c + k / 3) % 1.0
        if level > 0.5:
            cel.put(cx - 8 + k * 8 + math.sin(f * 6 + k) * 2, base - 14 - f * 9, LIGHT if f < 0.4 else ("brass", 6))
    if i >= n - 2:
        thin(cel, 0.55 if i == n - 2 else 0.3, 9)


def tarred(cel: Cel, i: int, t: float) -> None:
    """Tarred: black ropes of it up the legs, still alight in places."""
    ax, base = 11, 18
    for k, (dx, h) in enumerate(((-7, 6), (-3, 9), (2, 7), (6, 10))):
        for j in range(h):
            cel.put(ax + dx + (1 if (j + k) % 4 == 3 else 0), base - 1 - j, ("ink", 0) if j % 3 else ("ink", 1))
            if j < h - 2:
                cel.put(ax + dx + 1, base - 1 - j, ("ink", 1))
        cel.put(ax + dx, base - h, ("dusk", 3))
    for x in range(ax - 9, ax + 9):
        cel.put(x, base - 1, ("ink", 0))
    for k, dx in enumerate((-5, 4)):
        ph = math.tau * (t + k * 0.4)
        flame(cel, ax + dx, base - 6 - k * 2, 6 + 1.5 * math.sin(ph), 4, FIRE, sway=math.sin(ph), seed=k + i)
    rim(cel, ("crimson", 1), only=lambda tone: tone[0] != "ink")


# ----------------------------------------------------------------------------------------- Mark of the Hunter
def _reticle(cel: Cel, cx: float, cy: float, r: float, turn: float, hot: bool) -> None:
    """The hunter's mark: four curved blades of crimson turning round a gold point, with the four ticks of a sight."""
    for q in range(4):
        a0 = turn + q * 90 + 12
        ring(cel, cx, cy, r, r, ("crimson", 5), a0=a0, a1=a0 + 62, thick=2.4)
        ring(cel, cx, cy, r, r, ("dusk", 8) if hot else ("crimson", 6), a0=a0 + 6, a1=a0 + 50, thick=1.0)
        # the blade's hooked tip
        a = math.radians(a0 + 62)
        cel.put(cx + math.cos(a) * (r + 1), cy + math.sin(a) * (r + 1), ("crimson", 6))
    for a in (0, 90, 180, 270):
        ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
        streak(cel, (cx + ca * (r - 5), cy + sa * (r - 5)), (cx + ca * (r + 3), cy + sa * (r + 3)), [("brass", 7), ("brass", 6), ("brass", 5)])
    cel.put(cx, cy, LIGHT)
    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        cel.put(cx + dx, cy + dy, ("brass", 7))


def hunter_mark(cel: Cel, i: int, t: float) -> None:
    cx, cy = 15, 15
    _reticle(cel, cx, cy, 10, t * 90.0, hot=(i % 4 == 0))
    rim(cel, ("crimson", 1))
    if i % 4 == 0:
        spark(cel, cx, cy, 2, LIGHT, ("brass", 7))


def hunter_mark_big(cel: Cel, i: int, t: float) -> None:
    """The same sight, larger: what a boss wears (the small one is lost on a body a hundred pixels tall)."""
    cx, cy = 24, 24
    _reticle(cel, cx, cy, 17, t * 90.0, hot=(i % 4 == 0))
    ring(cel, cx, cy, 6, 6, ("brass", 6), thick=1.0)
    rim(cel, ("crimson", 1))
    if i % 4 == 0:
        spark(cel, cx, cy, 3, LIGHT, ("brass", 7))


def mark_lock(cel: Cel, i: int, t: float) -> None:
    """The mark closing on its quarry: a wide sight spinning in and snapping shut with a flash."""
    cx, cy = 28, 28
    r = 24 - 14 * ease_in(min(1.0, t * 1.5), 1.6)
    _reticle(cel, cx, cy, r, 200 * (1 - t), hot=True)
    if i == 3:
        spark(cel, cx, cy, 9, LIGHT, ("brass", 7))
    if i == 4:
        ring(cel, cx, cy, 15, 15, ("brass", 7), thick=1.4)
        spark(cel, cx, cy, 5, LIGHT, ("brass", 7))
    if i == 5:
        ring(cel, cx, cy, 20, 20, ("crimson", 6), thick=1.0)
        thin(cel, 0.7, 4)
    rim(cel, ("crimson", 1))


def mark_call(cel: Cel, i: int, t: float) -> None:
    """He names the quarry: a small sight flares at his levelled hand and a red line runs out ahead of it."""
    ax, cy = 10, 13
    reach = 8 + 54 * ease_out(t, 1.6)
    streak(cel, (ax + reach, cy), (ax + max(4, reach - 26), cy), [LIGHT, ("crimson", 6), ("crimson", 5), ("crimson", 4)])
    if i < 4:
        _reticle(cel, ax, cy, 6, t * 140, hot=True)
    spark(cel, ax + reach, cy, 2 if i < 4 else 1, LIGHT, ("crimson", 6))
    if i >= 4:
        thin(cel, 0.55, 5)
    rim(cel, ("crimson", 1))


# ----------------------------------------------------------------------------------------- Killing Field
def snare(cel: Cel, i: int, t: float) -> None:
    """The killing field: a thorned snare closed round the feet — it holds them and marks them."""
    ax, base = 14, 13
    sway = math.sin(math.tau * t)
    for k in range(2):
        for x in range(-11, 12):
            y = base - 2 - k * 3 + math.sin((x + k * 4) * 0.55 + sway * 0.6) * 1.6
            cel.put(ax + x, y, ("moss", 6 + k * 2))
            cel.put(ax + x, y + 1, ("moss", 4))
            if (x + k * 3) % 5 == 0:
                cel.put(ax + x, y - 1, ("crimson", 5))
                cel.put(ax + x + (1 if x % 2 else -1), y - 2, ("crimson", 6) if (i + x) % 3 == 0 else ("crimson", 4))
    for dx in (-11, 11):
        streak(cel, (ax + dx, base), (ax + dx * 0.9, base - 8), [("leather", 3), ("leather", 5), ("bone", 6)])
    rim(cel, ("ink", 1))


FX = [
    Fx("arrow", 21, 7, 11, 3, [100], True, arrow),
    Fx("arrow_heavy", 64, 11, 51, 5, [60, 60], True, arrow_heavy),
    Fx("arrow_fire", 50, 15, 41, 7, [50, 50, 50], True, arrow_fire),
    Fx("flask", 14, 14, 7, 7, [45] * 8, True, flask),
    Fx("tempo_burst", 48, 62, 24, 58, [40, 45, 55, 60, 70, 80, 90], False, tempo_burst),
    Fx("tempo_up", 44, 64, 22, 60, [65] * _TEMPO_FRAMES, True, tempo_up),
    Fx("tempo_up_front", 32, 64, 16, 60, [65] * _TEMPO_FRAMES, True, tempo_up_front),
    Fx("aim_gather", 40, 40, 20, 20, [70, 70, 70, 70, 70, 80], False, aim_gather),
    Fx("aim_impact", 56, 36, 26, 18, [35, 45, 55, 65, 80], False, aim_impact),
    Fx("volley_launch", 64, 66, 14, 62, [35, 45, 55, 65, 75, 85], False, volley_launch),
    Fx("arrow_fall", 44, 116, 26, 112, [35, 35, 35, 35, 60, 70, 70, 200, 80, 80], False, arrow_fall),
    Fx("arrow_hit", 22, 24, 11, 13, [40, 50, 120, 70], False, arrow_hit),
    Fx("fire_blast", 80, 62, 40, 58, [35, 45, 55, 65, 75, 85, 95], False, fire_blast),
    Fx("burning", 22, 32, 11, 30, [90] * 6, True, burning),
    Fx("caltrops_toss", 60, 32, 6, 30, [40, 45, 50, 60, 70], False, caltrops_toss),
    Fx("caltrop_patch", 30, 14, 15, 11, [50, 50, 50, 60] + [300] * 12 + [110, 110], False, caltrop_patch),
    Fx("bleeding", 22, 16, 10, 14, [110] * 6, True, bleeding),
    Fx("weak_crack", 32, 32, 16, 16, [35, 45, 55, 70, 80], False, weak_crack),
    Fx("weak_spot", 26, 27, 13, 13, [120, 110, 110, 130, 200, 200], True, weak_spot),
    Fx("tar_splash", 64, 36, 32, 32, [40, 50, 60, 70, 80, 90], False, tar_splash),
    Fx("tar_fire", 32, 28, 16, 24, [110] * (_TAR_BURN + 5), False, tar_fire),
    Fx("tarred", 22, 20, 11, 18, [110] * 6, True, tarred),
    Fx("hunter_mark", 31, 31, 15, 15, [130] * 8, True, hunter_mark),
    Fx("hunter_mark_big", 49, 49, 24, 24, [130] * 8, True, hunter_mark_big),
    Fx("mark_lock", 56, 56, 28, 28, [50, 55, 60, 60, 80, 90], False, mark_lock),
    Fx("mark_call", 76, 26, 10, 13, [40, 45, 55, 65, 75], False, mark_call),
    Fx("snare", 28, 16, 14, 13, [160] * 6, True, snare),
]
