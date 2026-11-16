"""The world boss's HEAVY blow (round 7, data/bossKit CRUSH) — the defence check every world boss swings from Inferno
on. Its look (2026-11-16, the user's pick: «el jefe carga el golpe»): the boss itself gathers it, the front hero is
marked, and it lands as one dry flash and a crack that runs back under the party. Nothing falls from the sky.

The wind-up       crush_charge / crush_charge_magic (at the boss's front, low: motes drawn in from all round into a
                  core that swells and burns — hot iron for a boss whose blows are mostly steel, violet for a
                  spell-heavy one — stepped frame by frame with the cast) · crush_mark / crush_mark_magic (on the
                  ground under the front hero: four corners closing in on his feet, burning at the last) ·
                  warn_seam / warn_seam_hot (the path behind him: a hairline split, glinting — the crack will open there)
The blow          crush_impact / crush_impact_magic (on the front hero: one dry flash, sharp rays, the ground split
                  under him — no smoke) · crush_crack (the crack's head running back through the party, violet light
                  jumping out of it: the magic shock) · crush_seam (the split it leaves, glowing and closing) ·
                  crush_zap (under each hero it reaches)

Drawn facing right like every effect; the game mirrors them for a foe.
"""
from __future__ import annotations

import math
import random

from pipeline.fx import Fx, blob, ease_in, ease_out, rim, ring, spark, streak, thin
from pipeline.rig import Cel

LIGHT = ("light", 0)

# The two looks: `core` from the white heart out, `edge` the outer glow, `dark` the rim that keeps it readable.
IRON = {"core": [LIGHT, ("brass", 7), ("brass", 6)], "edge": [("brass", 5), ("crimson", 6), ("crimson", 4)], "dark": ("crimson", 1)}
ARCANE = {"core": [LIGHT, ("violet", 8), ("violet", 7)], "edge": [("violet", 6), ("violet", 5), ("violet", 3)], "dark": ("violet", 0)}

STEPS = 10  # the wind-up signs: one frame per tenth of the cast (render/enemyFx markFrame)


# ----------------------------------------------------------------------------------------- the wind-up
CHARGE = 48


def _charge(cel: Cel, i: int, look: dict) -> None:
    """Power drawn into one point at the boss's front: motes streaking in from all round, a core that swells, and in
    the last third a burning ring and four sharp glints round it."""
    p = i / (STEPS - 1)
    hot = p >= 0.66
    cx = cy = CHARGE / 2
    core, edge = look["core"], look["edge"]
    # motes pulled in: each a bright head with a tail behind it, curving a little as it comes
    n = 7
    for k in range(n):
        a = math.tau * k / n + 0.4
        f = (p * 1.4 + k / n) % 1.0  # how far along its way in
        dist = 22 - 16 * ease_in(f, 1.3)
        sweep = 0.35 * (1 - f)  # it comes in on a slight spiral
        hx, hy = cx + math.cos(a + sweep) * dist, cy + math.sin(a + sweep) * dist * 0.8
        tx, ty = cx + math.cos(a + sweep + 0.25) * (dist + 6), cy + math.sin(a + sweep + 0.25) * (dist + 6) * 0.8
        streak(cel, (hx, hy), (tx, ty), [core[0], core[2], edge[0], edge[1]])
    # the core
    r = 1.5 + 5.5 * ease_in(p, 1.3)
    blob(cel, cx, cy, r + 1.5, r + 1.5, edge[0])
    blob(cel, cx, cy, r, r, core[1])
    blob(cel, cx, cy, max(0.8, r * 0.5), max(0.8, r * 0.5), core[0])
    if hot:
        ring(cel, cx, cy, r + 4 + (i % 2), r + 4 + (i % 2), core[2], thick=1.0)
        for k in range(4):
            a = math.pi / 4 + k * math.pi / 2
            spark(cel, cx + math.cos(a) * (r + 7), cy + math.sin(a) * (r + 7), 1 + (i + k) % 2, core[0], core[2])
    rim(cel, look["dark"])


def crush_charge(cel: Cel, i: int, t: float) -> None:
    _charge(cel, i, IRON)


def crush_charge_magic(cel: Cel, i: int, t: float) -> None:
    _charge(cel, i, ARCANE)


MARK_W, MARK_H, MARK_AX, MARK_AY = 64, 22, 32, 15


def _corner(cel: Cel, x: float, y: float, sx: int, sy: int, tone: tuple, dark: tuple) -> None:
    """One corner of the mark lying on the ground: a bold L (two pixels thick along the ground), its arms
    foreshortened — long across, short in depth."""
    for d in range(9):
        cel.put(x + sx * d, y, tone)
        cel.put(x + sx * d, y + sy, dark if d > 0 else tone)
    for d in range(4):
        cel.put(x, y + sy * d, tone)


def _mark(cel: Cel, i: int, look: dict) -> None:
    """Four corners closing in on the front hero's feet; in the last third they burn, a solid ring lights between
    them and four sparks stand up off it."""
    p = i / (STEPS - 1)
    hot = p >= 0.66
    core, edge = look["core"], look["edge"]
    ax, ay = MARK_AX, MARK_AY - 1
    half_w = 28 - 12 * ease_out(p, 1.5)
    half_h = 5 - 1.2 * p
    tone = (core[0] if i % 2 else core[1]) if hot else core[2] if p > 0.3 else edge[0]
    dark = edge[0] if hot else edge[1]
    if hot:
        ring(cel, ax, ay, half_w - 2, half_h, core[2], thick=1.0)
    for sx in (-1, 1):
        for sy in (-1, 1):
            _corner(cel, ax + sx * half_w, ay + sy * half_h, -sx, -sy, tone, dark)
    if hot:
        for k, a in enumerate((200, 250, 290, 340)):
            x = ax + math.cos(math.radians(a)) * (half_w - 2)
            y = ay + math.sin(math.radians(a)) * half_h
            h = 3 + (k + i) % 3
            streak(cel, (x, y - h), (x, y - 1), [core[0], core[1]])
    rim(cel, look["dark"])


def crush_mark(cel: Cel, i: int, t: float) -> None:
    _mark(cel, i, IRON)


def crush_mark_magic(cel: Cel, i: int, t: float) -> None:
    _mark(cel, i, ARCANE)


def _seam(cel: Cel, i: int, hot: bool) -> None:
    """The path behind the front hero: a hairline split, light running along it — where the crack will open. Hot:
    the split glows and a bright bead races along it."""
    base = 6 if not hot else 7
    rnd = random.Random(11)
    y = base
    pts = []
    for x in range(0, 24):
        if x % 5 == 0:
            y = base + rnd.choice((-1, 0, 0, 1))
        pts.append((x, y))
    for x, y in pts:
        bead = (x - i * 4) % 24 < (3 if hot else 2)
        cel.put(x, y, LIGHT if bead and hot else ("violet", 8) if bead or hot else ("violet", 4))
        if hot:
            cel.put(x, y + 1, ("violet", 5))
    rim(cel, ("violet", 0))


def warn_seam(cel: Cel, i: int, t: float) -> None:
    _seam(cel, i, False)


def warn_seam_hot(cel: Cel, i: int, t: float) -> None:
    _seam(cel, i, True)


# ----------------------------------------------------------------------------------------- the blow
IMP_W, IMP_H, IMP_AX, IMP_AY = 72, 52, 36, 46


def _impact(cel: Cel, i: int, t: float, look: dict) -> None:
    """One dry flash on the front hero: a hard white heart, eight sharp rays (the up and sideways ones longest),
    and the ground split open both ways under him. Gone in a few frames, with no smoke."""
    core, edge = look["core"], look["edge"]
    ax, ay = IMP_AX, IMP_AY - 14  # the flash sits at his middle
    gy = IMP_AY
    if i <= 2:
        r = (6, 4, 2)[i]
        rays = (19, 15, 8)[i]
        for k in range(8):
            a = math.tau * k / 8 - math.pi / 2
            ln = rays * (1.0 if k % 2 == 0 else 0.55) * (1.15 if k in (0, 2, 6) else 1.0)
            streak(cel, (ax + math.cos(a) * ln, ay + math.sin(a) * ln * 0.85), (ax, ay), [core[2], core[1], core[0]])
        blob(cel, ax, ay, r + 1.5, r + 1.5, core[1])
        blob(cel, ax, ay, r, r, core[0])
    if i == 0:  # the instant it lands: a flat bar of light along the ground
        streak(cel, (ax - 22, gy - 1), (ax + 22, gy - 1), [core[1], core[0], core[1]])
    # the ground split both ways, opening then closing
    open_ = (0.5, 1.0, 1.0, 0.85, 0.6, 0.35)[min(i, 5)]
    reach = 24 * open_ + 4
    rnd = random.Random(5)
    for sx in (-1, 1):
        y = gy - 1
        x = ax
        while abs(x - ax) < reach:
            nx = x + sx * rnd.randint(2, 4)
            ny = gy - 1 + rnd.choice((-1, 0, 0, 1))
            streak(cel, (x, y), (nx, ny), [core[1] if i < 3 else edge[0], edge[0] if i < 3 else edge[1]])
            x, y = nx, ny
    # chips of ground thrown up, few and sharp
    if 1 <= i <= 4:
        for k in range(6):
            sx = -1 if k % 2 else 1
            x = ax + sx * (5 + k * 2.5 + i * 3)
            y = gy - 3 - (k % 3) * 3 - i * 2 + i * i * 0.6
            cel.put(x, y, ("bone", 6) if k % 3 else edge[0])
    if i >= 4:
        thin(cel, 0.7 if i == 4 else 0.4, 5)
    rim(cel, look["dark"])


def crush_impact(cel: Cel, i: int, t: float) -> None:
    _impact(cel, i, t, IRON)


def crush_impact_magic(cel: Cel, i: int, t: float) -> None:
    _impact(cel, i, t, ARCANE)


def crush_crack(cel: Cel, i: int, t: float) -> None:
    """The crack's head, running back under the party: the ground torn open at its tip, violet light jumping out."""
    ax, base = 24, 26
    rnd = random.Random(i)
    # the tear just behind the tip
    x, y = ax, base
    for _ in range(6):
        nx = x - rnd.randint(2, 4)
        ny = base + rnd.choice((-1, 0, 1))
        streak(cel, (x, y), (nx, ny), [("violet", 8), ("violet", 6)])
        x, y = nx, ny
    # light jumping out of it
    for k in range(4):
        sx = ax - 2 - k * 4 - (i % 2)
        h = 4 + ((k * 5 + i * 3) % 9)
        streak(cel, (sx, base - 1 - h), (sx, base - 1), [LIGHT, ("violet", 8), ("violet", 6)])
    spark(cel, ax, base - 2, 2, LIGHT, ("violet", 7))
    rim(cel, ("violet", 0))


def crush_seam(cel: Cel, i: int, t: float) -> None:
    """The split the crack leaves: glowing, going dark, closing."""
    base = 7
    rnd = random.Random(23)
    tones = [("violet", 8), ("violet", 7), ("violet", 5), ("violet", 3), ("violet", 2)]
    y = base
    for x in range(0, 18):
        if x % 4 == 0:
            y = base + rnd.choice((-1, 0, 1))
        cel.put(x, y, tones[min(i, len(tones) - 1)])
        if i == 0 and x % 3 == 0:
            cel.put(x, y - 1, LIGHT)
    if i >= 3:
        thin(cel, 0.6 if i == 3 else 0.3, 2)
    rim(cel, ("violet", 0))


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
    Fx("crush_charge", CHARGE, CHARGE, CHARGE // 2, CHARGE // 2, [100] * STEPS, False, crush_charge),
    Fx("crush_charge_magic", CHARGE, CHARGE, CHARGE // 2, CHARGE // 2, [100] * STEPS, False, crush_charge_magic),
    Fx("crush_mark", MARK_W, MARK_H, MARK_AX, MARK_AY, [100] * STEPS, False, crush_mark),
    Fx("crush_mark_magic", MARK_W, MARK_H, MARK_AX, MARK_AY, [100] * STEPS, False, crush_mark_magic),
    Fx("warn_seam", 24, 12, 12, 8, [90] * 6, True, warn_seam),
    Fx("warn_seam_hot", 24, 14, 12, 10, [70] * 6, True, warn_seam_hot),
    Fx("crush_impact", IMP_W, IMP_H, IMP_AX, IMP_AY, [35, 45, 55, 70, 80, 90], False, crush_impact),
    Fx("crush_impact_magic", IMP_W, IMP_H, IMP_AX, IMP_AY, [35, 45, 55, 70, 80, 90], False, crush_impact_magic),
    Fx("crush_crack", 30, 30, 24, 26, [50, 50, 50, 50], True, crush_crack),
    Fx("crush_seam", 18, 12, 9, 7, [60, 80, 100, 120, 140], False, crush_seam),
    Fx("crush_zap", 28, 30, 14, 26, [40, 50, 60, 70, 80], False, crush_zap),
]
