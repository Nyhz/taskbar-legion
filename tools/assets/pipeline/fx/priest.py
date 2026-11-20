"""The Priest's ability effects. Body effects are anchored on the body's centre at the ground line, hits on their
own centre, what she throws on its head.

Four families, told apart by colour AND by shape, so a glance says what was done to whom:
  a HEAL  is mint light, soft and round: ribbons that wind up the body, petals that drift off it;
  a SHIELD is a dome of white-gold light: an arch round the body, rays on its crown, a sun seal; it goes back up;
  POWER   is bright yellow: a thin rim of light hugging the whole figure (Power Infusion — export_fx.RIMS);
  WRATH   is white-gold from above (Smite, Holy Nova) and crimson-gold wings (Battle Enrage).

Her basic attacks   light_bolt (the lantern's) · light_page (a leaf of the book) · light_hit (where they land)
Any heal            heal_bloom (on whoever is healed)
Mend                mend_gift (cast, at the lantern) · mend_wind (the heal taking hold) · mend_petals (while it mends)
Healing Light       swift_gift (cast, at the book) · swift_light (on the one it heals: a shaft of light dropped at once)
Circle of Healing   circle_pulse (cast, under the party: one bright ring flashing out, crosses of light thrown up)
Any cleanse         cleanse_flash (on whoever a heal lifted a harmful effect from: dark flecks driven off by light)
Holy Shield         ward_spark (cast, at the book: a small halo) · ward_raise · ward_front (while it holds) · ward_break
Lesser wards        ward_veil (Deep Sanctuary, Second Wind: only a halo over the head)
Power Infusion      infusion_ignite · the rim `infused` (a passive now: each of her heals lights it on the party)
                    (infuse_send and infusion_motes stay drawn for the record; nothing plays them now)
Holy Nova           nova_flash (cast, at the staff's foot) · nova_ring + nova_shaft (through the wave) · nova_hit
Retribution Aura    retribution_seal (under her) · retribution_tread (under every ally)
Sanctuary           sanctuary_ring (cast, under the party) · sanctuary_glow (while it lasts)
Smite               smite_strike (on the enemy, from the sky)
Battle Enrage       zeal_wave (cast, under the party) · zeal_ignite · zeal_wings (on her) · the rim `roused` (on those she rouses)
"""
from __future__ import annotations

import math
import random

from pipeline.fx import Fx, blob, ease_in, ease_out, flame, poly, rim, ring, spark, streak, thin
from pipeline.fx.knight import _ground_ring
from pipeline.rig import Cel

LIGHT = ("light", 0)
MINT = [("sea", 5), ("sea", 7), ("sea", 8)]  # a heal: rim, body, core
SUN = [("brass", 4), ("brass", 6), ("brass", 7)]  # power
WRATH = [("crimson", 4), ("crimson", 5), ("brass", 6)]  # zeal


def _petal(cel: Cel, x: float, y: float, k: int, tone=("sea", 7)) -> None:
    """A small petal of light, leaning one way or the other (so a drift of them is not a row of dots)."""
    lean = 1 if k % 2 == 0 else -1
    cel.put(x, y, LIGHT)
    cel.put(x + lean, y - 1, LIGHT)
    cel.put(x - lean, y, tone)
    cel.put(x, y + 1, tone)
    cel.put(x + lean, y, ("sea", 8))
    cel.put(x - lean, y + 1, ("sea", 6))


# ----------------------------------------------------------------------------------------- her basic attacks
def light_bolt(cel: Cel, i: int, t: float) -> None:
    """The lantern's light let go: a small white-gold comet."""
    y = 5
    hx = 23
    for s in range(20):
        f = s / 20
        if (s + i * 2) % 6 == 5 and f > 0.35:
            continue
        x = hx - 2 - s
        cel.put(x, y, LIGHT if f < 0.3 else ("brass", 7) if f < 0.6 else ("brass", 5))
        if f < 0.4:
            cel.put(x, y + (1 if (s + i) % 2 else -1), ("brass", 6))
    blob(cel, hx - 0.5, y + 0.5, 2.6, 2.6, ("brass", 7))
    blob(cel, hx - 0.5, y + 0.5, 1.6, 1.6, LIGHT)
    rim(cel, ("brass", 2))
    spark(cel, hx, y, 2 if i % 2 == 0 else 1, LIGHT, ("brass", 7))


def light_page(cel: Cel, i: int, t: float) -> None:
    """A leaf out of her book, alight: it turns edge-on and flat as it flies, script glowing on it."""
    cx, cy = 14.0, 7.0
    wide = (5.0, 3.5, 1.2, 3.5)[i % 4]  # how much of the page faces us
    tilt = (-0.25, 0.1, 0.4, -0.1)[i % 4]
    for u in range(-5, 6):
        for v in range(-4, 5):
            if abs(u) <= wide and abs(v) <= 3.4:
                x, y = cx + u, cy + v + u * tilt
                edge = abs(u) > wide - 1 or abs(v) > 2.6
                cel.put(x, y, ("bone", 6) if edge else ("bone", 7))
                if not edge and v % 2 == 0 and abs(u) < wide - 1.5:
                    cel.put(x, y, ("brass", 5))
    for s in range(12):
        f = s / 12
        if (s + i) % 4 == 3:
            continue
        cel.put(cx - 6 - s, cy + math.sin(s * 0.9 + i) * 1.2, LIGHT if f < 0.3 else ("brass", 7) if f < 0.65 else ("brass", 5))
    rim(cel, ("brass", 2))
    spark(cel, cx + wide, cy + wide * tilt, 1, LIGHT, ("brass", 7))


def light_hit(cel: Cel, i: int, t: float) -> None:
    """Where her light lands: a small white-gold star that opens and is gone."""
    cx, cy = 13, 13
    r = (3, 6, 8, 9)[i]
    if i < 2:
        blob(cel, cx + 0.5, cy + 0.5, 3.4 - i, 3.4 - i, LIGHT)
    for k in range(8):
        a = math.tau * k / 8 + 0.2
        ca, sa = math.cos(a), math.sin(a)
        r0 = r * (0.35 + 0.2 * i)
        streak(cel, (cx + ca * r, cy + sa * r), (cx + ca * r0, cy + sa * r0), [LIGHT, ("brass", 7), ("brass", 5)])
    if i == 3:
        thin(cel, 0.5, 2)
    rim(cel, ("brass", 2))


# ----------------------------------------------------------------------------------------- heals
def _ribbon(cel: Cel, ax: float, base: float, top: float, turns: float, phase: float, wide: float, upto: float, tones) -> None:
    """A ribbon of light winding up round a body from `base` to `top`, drawn up to the share `upto` of its
    height; the half that passes behind the body is left out, so the body stays readable inside it."""
    n = int((base - top) * 3)
    for s in range(n):
        f = s / n
        if f > upto:
            break
        a = math.tau * (turns * f + phase)
        if math.sin(a) < -0.25:
            continue  # behind the body
        x = ax + math.cos(a) * wide * (0.85 + 0.15 * math.sin(f * 6))
        y = base - (base - top) * f
        near = math.sin(a) > 0.45
        cel.put(x, y, tones[2] if near else tones[1])
        cel.put(x + (1 if math.cos(a) > 0 else -1), y, tones[1] if near else tones[0])
        if near and f > upto - 0.12:
            cel.put(x, y - 1, LIGHT)


def heal_bloom(cel: Cel, i: int, t: float) -> None:
    """A heal landing on someone: mint light wells up from the feet in two ribbons and opens into petals."""
    ax, base = 22, 54
    rise = ease_out(min(1.0, t * 1.5), 1.6)
    if i < 5:
        for ph in (0.0, 0.5):
            _ribbon(cel, ax, base - 1, base - 44, 1.6, ph + t * 0.6, 10.0, rise, MINT)
    # a ring of light opening on the ground under them
    rx = 5 + 13 * ease_out(t)
    if i < 5:
        ring(cel, ax, base - 1, rx, rx * 0.25, ("sea", 8) if i < 2 else ("sea", 6), thick=1.6 - t)
    rnd = random.Random(7)
    for k in range(11):
        born = 0.25 + 0.5 * rnd.random()
        if t < born:
            rnd.random(); rnd.random()
            continue
        f = (t - born) / (1 - born + 1e-6)
        x = ax + (rnd.random() - 0.5) * 26
        y = base - 26 - rnd.random() * 18 - f * 9
        _petal(cel, x, y, k)
    if i >= 6:
        thin(cel, 1.0 - 0.6 * (i - 5) / 2.0, 3)
    rim(cel, ("sea", 2))


def mend_gift(cel: Cel, i: int, t: float) -> None:
    """Mend leaving her: the lantern's light turns mint and three petals lift off it towards the hurt one."""
    cx, cy = 10, 20
    if i < 3:
        blob(cel, cx + 0.5, cy + 0.5, 3.6 - i * 0.8, 3.6 - i * 0.8, ("sea", 8))
        spark(cel, cx, cy, 5 - i, LIGHT, ("sea", 7))
    for k in range(3):
        f = max(0.0, t * 1.25 - k * 0.12)
        if f <= 0 or f > 1:
            continue
        x = cx + 3 + 30 * ease_out(f, 1.5)
        y = cy - 4 * math.sin(f * math.pi) + (k - 1) * 4 * f
        streak(cel, (x, y), (x - 5 * (1 - f) - 2, y + 1), [LIGHT, ("sea", 8), ("sea", 6)])
        _petal(cel, x, y, k)
    if i >= 5:
        thin(cel, 0.55, 1)
    rim(cel, ("sea", 2))


def mend_wind(cel: Cel, i: int, t: float) -> None:
    """Mend taking hold: one slow ribbon of mint light winds all the way up the body and leaves it in petals."""
    ax, base = 20, 52
    grow = ease_out(min(1.0, t * 1.4), 1.5)
    fade = 0.0 if i < 5 else (i - 4) / 3.0
    _ribbon(cel, ax, base - 1, base - 42, 2.2, t * 0.5, 10.5, grow, MINT)
    if fade > 0:
        thin(cel, 1.0 - 0.75 * fade, 4)
    rnd = random.Random(21)
    for k in range(6):
        if t > 0.45 + k * 0.05:
            _petal(cel, ax + (rnd.random() - 0.5) * 22, base - 40 - rnd.random() * 6 - (t - 0.45) * 12, k)
    rim(cel, ("sea", 2))


def mend_petals(cel: Cel, i: int, t: float) -> None:
    """While a heal keeps working: petals of mint light drift up off the body, a few at a time."""
    ax, base = 18, 46
    for k in range(4):
        f = (t + k / 4) % 1.0
        side = 1 if k % 2 == 0 else -1
        x = ax + side * (9.5 + 2.5 * math.sin(f * math.tau + k)) + math.sin(f * 9 + k * 2) * 1.5
        y = base - 6 - f * 34
        if f > 0.9:
            cel.put(x, y, ("sea", 6))
            continue
        _petal(cel, x, y, k, ("sea", 7) if f < 0.6 else ("sea", 6))
    rim(cel, ("sea", 2))


# ----------------------------------------------------------------------------------------- shields
# Holy Shield is a dome of light (2026-11-20, lab v106 — the user: «Cúpula de luz sin duda»; the azure glass gem it
# replaces «parece un cristal»): white-gold, rays crowning it, a sun seal on its near face; it goes back up as light.
SHIELD_HALO_UP = 44  # how high over the ground the lesser ward's halo floats (the Knight's head tops out about 40 up)


def _halo(cel: Cel, cx: float, y: float, k: float = 1.0, lit: bool = True) -> None:
    """A ring of gold seen a little from below: a thin ellipse, its near half bright, its far half deeper."""
    rx, ry = 6.5 * k, 1.9 * k
    ring(cel, cx, y, rx, ry, ("brass", 6), 180, 360, 1.0)
    ring(cel, cx, y, rx, ry, LIGHT if lit else ("brass", 7), 0, 180, 1.0)
    if lit:
        cel.put(cx + rx * 0.55, y + ry * 0.8, LIGHT)


def _dome(cel: Cel, ax: float, base: float, k: float, near_tone, far_tone, mid_tone) -> None:
    """A rounded arch of light round the body: its near side (towards the enemy) bright, the far side faint, a
    dotted inner arch on the near face."""
    rx, ry = 20 * k, 45 * k
    ring(cel, ax, base - 1, rx, ry, far_tone, 180, 270, 1.0)
    ring(cel, ax, base - 1, rx, ry, near_tone, 270, 360, 1.5)
    steps = 22
    for s in range(steps):
        a = math.radians(285 + 70 * s / steps)
        if s % 2 == 0:
            cel.put(ax + math.cos(a) * (rx - 4), base - 1 + math.sin(a) * (ry - 4), mid_tone)


def _crown(cel: Cel, ax: float, base: float, k: float = 1.0, lit: bool = True) -> None:
    """Short rays fanning up off the arch's crown: the light it is made of, shining out."""
    top = base - 1 - 45 * k
    for j in range(7):
        a = math.radians(-90 + (j - 3) * 24)
        ln = (5 if j % 2 == 0 else 3) * k + (1 if lit and j == 3 else 0)
        streak(cel, (ax + math.cos(a) * (2 + ln), top + math.sin(a) * (2 + ln)), (ax + math.cos(a) * 2, top + math.sin(a) * 2), [LIGHT if lit else ("brass", 7), ("brass", 7), ("brass", 6)])


def _seal(cel: Cel, cx: float, cy: float, r: float, tone) -> None:
    """A small sun seal: a ring with eight short rays (never a plus — that is a heal's sign)."""
    ring(cel, cx, cy, r, r, tone, 0, 360, 1.0)
    for k in range(8):
        a = math.tau * k / 8 + math.pi / 8
        cel.put(cx + math.cos(a) * (r + 2), cy + math.sin(a) * (r + 2), tone)


def ward_spark(cel: Cel, i: int, t: float) -> None:
    """Holy Shield cast, at her book: it flashes white-gold and a small halo springs off it, turning."""
    cx, cy = 10, 14
    spark(cel, cx, cy, (3, 6, 5, 3, 2)[i], LIGHT, ("brass", 7))
    if 1 <= i <= 4:
        k = 0.6 + 0.5 * ease_out(t)
        _halo(cel, cx + 6 + 8 * t, cy - 4 - 6 * t, k)
    if i >= 3:
        thin(cel, 0.55 if i == 3 else 0.3, 5)
    rim(cel, ("brass", 3))


def ward_raise(cel: Cel, i: int, t: float) -> None:
    """Rays fall from above onto the one she shields and close into the arch; its crown of rays flares as it
    closes."""
    ax, base = 30, 64
    rnd = random.Random(5)
    if i < 3:
        for k in range(7):
            x = ax + (k - 3) * 5.5 + (rnd.random() - 0.5) * 2
            top = 2 + rnd.random() * 6
            low = top + (20 + 30 * ease_in((i + 1) / 3, 1.5)) * (1 - abs(k - 3) / 6)
            streak(cel, (x, low), (x, top), [LIGHT, ("brass", 7), ("brass", 6), ("brass", 5)])
    if i >= 2:
        k = 0.7 + 0.3 * ease_out(min(1.0, (t - 0.25) * 2.0), 2)
        _dome(cel, ax, base, k, LIGHT, ("brass", 5), ("brass", 6))
        rim(cel, ("brass", 3), only=lambda tone: tone == LIGHT)
        _crown(cel, ax, base)
        _seal(cel, ax + 11, base - 22, 2.5, ("brass", 7))
    if i == 3:
        spark(cel, ax, base - 47, 4, LIGHT, ("brass", 7))
        blob(cel, ax, base - 1, 12, 1.5, ("brass", 7))
    if i >= 6:
        thin(cel, 0.75, 3)


def ward_front(cel: Cel, i: int, t: float) -> None:
    """The arch while it holds: lines of light only, a glint running up its near side, the seal breathing, motes
    of light rising inside, rays on its crown, a lit disc at the feet."""
    ax, base = 24, 56
    _dome(cel, ax, base, 1.0, ("brass", 7), ("brass", 5), ("brass", 6))
    a = math.radians(360 - 90 * ((t * 1.0) % 1.0))
    gx, gy = ax + math.cos(a) * 20, base - 1 + math.sin(a) * 45
    rim(cel, ("brass", 3), only=lambda tone: tone == ("brass", 7))
    spark(cel, gx, gy, 1, LIGHT, ("brass", 7))
    _crown(cel, ax, base, lit=i % 4 != 3)
    for x in range(-14, 15):
        if x % 2 == 0:
            cel.put(ax + x, base - 1 + (1 if abs(x) < 9 else 0), ("brass", 6))
    _seal(cel, ax + 11, base - 22, 2.5, ("brass", 7) if i % 4 < 2 else ("brass", 6))
    for k in range(3):
        f = (t + k / 3) % 1.0
        cel.put(ax - 8 + k * 7, base - 4 - f * 34, LIGHT if f < 0.6 else ("brass", 6))


def ward_break(cel: Cel, i: int, t: float) -> None:
    """The absorb spent: the arch flashes white and comes apart into motes and short rays that rise and fade — the
    light goes back up, it does not shatter."""
    ax, base = 30, 64
    if i == 0:
        _dome(cel, ax, base, 1.0, LIGHT, LIGHT, LIGHT)
        _crown(cel, ax, base, 1.2)
        rim(cel, ("brass", 3))
        return
    rnd = random.Random(23)
    up = ease_out(t, 1.4)
    for k in range(18):
        a = math.radians(180 + 180 * rnd.random())
        x = ax + math.cos(a) * 20 * (1 + 0.15 * up)
        y = base - 1 + math.sin(a) * 45 - up * (8 + rnd.random() * 14)
        if k % 3 == 0 and t < 0.6:
            streak(cel, (x, y), (x, y + 4), [LIGHT, ("brass", 7), ("brass", 6)])
        else:
            cel.put(x, y, LIGHT if k % 2 else ("brass", 7))
    if i == 1:
        spark(cel, ax, base - 47, 5, LIGHT, ("brass", 7))
    if i >= 3:
        thin(cel, 0.7 if i == 3 else 0.45, 11)
    rim(cel, ("brass", 3))


def ward_veil(cel: Cel, i: int, t: float) -> None:
    """A lesser ward (Deep Sanctuary, Second Wind): only the halo, and a faint glow of gold on the shoulders."""
    ax, base = 18, 50
    _halo(cel, ax, base - SHIELD_HALO_UP + (1 if i % 6 in (2, 3, 4) else 0), 0.9, lit=i % 6 != 5)
    rim(cel, ("brass", 3))
    for dx in (-6, 7):
        if (i + dx) % 3:
            cel.put(ax + dx, base - 32, ("brass", 6))


# ----------------------------------------------------------------------------------------- Power Infusion
def infusion_motes(cel: Cel, i: int, t: float) -> None:
    """Round the body while the power is in it: three slow motes of yellow light climbing past its sides, one at a
    time brightening into a small star. (The aura itself is the RIM of light on the figure — export_fx.RIMS — so
    nothing here stands behind or over the hero.)"""
    ax, base = 18, 46
    for k in range(3):
        f = (t + k / 3) % 1.0
        side = (-1, 1, 1)[k]
        x = ax + side * (11 + 1.5 * math.sin(f * 5 + k * 2))
        y = base - 6 - f * 36
        if 0.35 < f < 0.5:
            spark(cel, x, y, 1, LIGHT, ("brass", 6))
            continue
        cel.put(x, y, LIGHT if f < 0.8 else ("brass", 7))
        cel.put(x, y + 1, ("brass", 6))
        if f < 0.7:
            cel.put(x, y + 2, ("brass", 5))


def infusion_ignite(cel: Cel, i: int, t: float) -> None:
    """Power poured in: a thin ring of yellow light runs out along the ground from the feet and a handful of sparks
    jump up past the sides — over in a third of a second, and never across the body."""
    ax, base = 22, 54
    r = 5 + 15 * ease_out(t)
    if i < 5:
        ring(cel, ax, base - 1, r, r * 0.24, LIGHT if i < 2 else ("brass", 7) if i < 4 else ("brass", 5), thick=1.0)
    rnd = random.Random(17)
    for k in range(6):
        side = 1 if k % 2 == 0 else -1
        f = max(0.0, t - rnd.random() * 0.2)
        x = ax + side * (11 + rnd.random() * 4 + f * 3)
        y = base - 6 - rnd.random() * 8 - f * (24 + rnd.random() * 14)
        if f > 0 and i < 5:
            streak(cel, (x, y), (x, y + 2 + 2 * (1 - f)), [LIGHT, ("brass", 7), ("brass", 5)])


def infuse_send(cel: Cel, i: int, t: float) -> None:
    """The gift leaving her hand: a yellow star and a short streak of light thrown out ahead."""
    cx, cy = 9, 12
    spark(cel, cx, cy, (3, 6, 5, 3, 1)[i], LIGHT, ("brass", 7))
    reach = 6 + 30 * ease_out(t, 1.5)
    streak(cel, (cx + reach, cy - reach * 0.12), (cx + max(3.0, reach - 14), cy - max(3.0, reach - 14) * 0.12), [LIGHT, ("brass", 7), ("brass", 6), ("brass", 5)])
    if i >= 3:
        thin(cel, 0.5, 4)
    rim(cel, ("brass", 3))


# ----------------------------------------------------------------------------------------- Holy Nova
def nova_flash(cel: Cel, i: int, t: float) -> None:
    """The staff's foot strikes: a white-gold star on the ground and light thrown out along it."""
    ax, base = 30, 36
    r = (4, 9, 13, 15, 16)[i]
    if i < 3:
        blob(cel, ax + 0.5, base - 1.5, 5 - i, 3.2 - i * 0.6, LIGHT)
    for k in range(9):
        a = math.pi * (1.0 + (k + 0.5) / 9)
        ca, sa = math.cos(a), math.sin(a)
        ln = r * (1.0 if k % 2 == 0 else 0.6)
        streak(cel, (ax + ca * ln * 1.6, base - 2 + sa * ln), (ax + ca * ln * 0.5, base - 2 + sa * ln * 0.4), [LIGHT, ("brass", 7), ("brass", 5)])
    if i >= 3:
        thin(cel, 0.55 if i == 3 else 0.3, 2)
    rim(cel, ("brass", 2))


def nova_ring(cel: Cel, i: int, t: float) -> None:
    _ground_ring(cel, i, t, LIGHT, ("brass", 7), ("brass", 5), ("brass", 2), False)


def nova_shaft(cel: Cel, i: int, t: float) -> None:
    """Holy Nova under the wave: a shaft of white-gold light bursts up out of the ground and thins away."""
    ax, base = 11, 66
    h = (20, 46, 62, 62, 56, 40)[i]
    w = (2.0, 4.6, 3.6, 2.4, 1.5, 0.8)[i]
    for y in range(base - h, base):
        f = (base - y) / h
        half = w * (1.0 - 0.45 * f)
        for x in range(int(math.floor(ax - half)), int(math.ceil(ax + half))):
            d = abs(x + 0.5 - ax) / max(half, 0.5)
            cel.put(x, y, LIGHT if d < 0.5 else ("brass", 7) if d < 0.85 else ("brass", 6))
    if i < 4:
        blob(cel, ax, base - 1.5, 6 - i, 2.2, ("brass", 7))
        blob(cel, ax, base - 1.5, 3.5 - i * 0.6, 1.4, LIGHT)
    rnd = random.Random(5)
    for k in range(5):
        x = ax + (rnd.random() - 0.5) * 16
        y = base - 8 - rnd.random() * 30 - t * 20
        if i >= 1:
            cel.put(x, y, LIGHT if k % 2 else ("brass", 7))
    if i >= 4:
        thin(cel, 0.6 if i == 4 else 0.35, 3)
    rim(cel, ("brass", 2))


def nova_hit(cel: Cel, i: int, t: float) -> None:
    """Holy Nova's light striking an enemy: a white-gold starburst through its body (eight rays — never a plus
    sign, which would read as a heal)."""
    cx, cy = 16, 16
    r = (5, 11, 14, 15)[i]
    for k in range(8):
        a = math.tau * k / 8 + math.pi / 8
        ca, sa = math.cos(a), math.sin(a)
        ln = r * (1.0 if k % 2 == 0 else 0.62)
        r0 = ln * (0.0, 0.15, 0.45, 0.7)[i]
        streak(cel, (cx + ca * ln, cy + sa * ln), (cx + ca * r0, cy + sa * r0), [("brass", 7), LIGHT, LIGHT])
        if i < 2:
            cel.put(cx + ca * ln * 0.5 - sa, cy + sa * ln * 0.5 + ca, ("brass", 7))
    if i < 2:
        blob(cel, cx + 0.5, cy + 0.5, 3.6 - i, 3.6 - i, LIGHT)
    if i == 3:
        thin(cel, 0.5, 6)
    rim(cel, ("brass", 2))


# ----------------------------------------------------------------------------------------- Retribution Aura
def retribution_seal(cel: Cel, i: int, t: float) -> None:
    """Under the Priest while the aura is hers (always): ONE thin ring of gold lying on the ground with four points
    of light turning slowly on it — a mark, not a carpet."""
    ax, ay = 24, 15
    ring(cel, ax, ay, 20, 5.0, ("brass", 5), thick=1.0, gap=lambda a: int((a + t * 45) / 15) % 3 == 0)
    for k in range(4):
        a = math.tau * (k / 4 + t / 4)
        x, y = ax + math.cos(a) * 20, ay + math.sin(a) * 5.0
        cel.put(x, y, LIGHT)
        if math.sin(a) < 0.3:
            cel.put(x, y - 1, ("brass", 7))


def retribution_tread(cel: Cel, i: int, t: float) -> None:
    """Under each ally the aura reaches: a short arc of the same gold on the ground and one mote off it."""
    ax, ay = 14, 8
    ring(cel, ax, ay, 12, 2.6, ("brass", 6), a0=20, a1=160, thick=1.0)
    a = math.radians(20 + 140 * ((t * 1.0) % 1.0))
    cel.put(ax + math.cos(a) * 12, ay + math.sin(a) * 2.6, LIGHT)
    f = (t + 0.3) % 1.0
    cel.put(ax - 6 + 12 * ((i * 5) % 7) / 7.0, ay - 2 - f * 5, ("brass", 7))
    rim(cel, ("brass", 2))


# ----------------------------------------------------------------------------------------- Sanctuary
def sanctuary_ring(cel: Cel, i: int, t: float) -> None:
    _ground_ring(cel, i, t, LIGHT, ("sea", 7), ("sea", 5), ("sea", 2), False)
    # petals lifting off the ring as it passes
    ax, ay = 64, 26
    rx = 9 + 53 * ease_out(t, 1.8)
    if 1 <= i < 6:
        for k in range(9):
            a = math.pi * (1.05 + 0.9 * k / 8)
            _petal(cel, ax + math.cos(a) * rx * 0.92, ay + math.sin(a) * rx * 0.3 - 3 - i * 2, k)


def sanctuary_glow(cel: Cel, i: int, t: float) -> None:
    """While Sanctuary lasts: the ground under each of them holds a ring of mint light, and soft rays stand in it."""
    ax, ay = 21, 24
    ring(cel, ax, ay, 18, 4.4, ("sea", 7), thick=1.2)
    ring(cel, ax, ay, 18, 4.4, LIGHT, a0=20 + t * 360, a1=70 + t * 360, thick=1.2)
    for k in range(5):
        x = ax - 14 + k * 7
        h = 6 + 5 * (0.5 + 0.5 * math.sin(math.tau * (t + k * 0.21)))
        y0 = ay - 1.5 - 3.0 * math.sqrt(max(0.0, 1 - ((x - ax) / 18) ** 2))
        for n in range(int(h)):
            if n % 2 == 0 or n < 3:
                cel.put(x, y0 - n, ("sea", 8) if n < h * 0.5 else ("sea", 6))
    rim(cel, ("sea", 2))


# ----------------------------------------------------------------------------------------- Smite
def smite_strike(cel: Cel, i: int, t: float) -> None:
    """Smite: light falls on the enemy from above — a hard white-gold bolt, a flash where it meets the ground."""
    ax, base = 18, 108
    rnd = random.Random(3)
    if i == 0:
        for y in range(0, base):
            cel.put(ax + (1 if (y // 9) % 2 else 0), y, LIGHT)
    elif i <= 3:
        w = (0, 5.0, 3.6, 2.0)[i]
        x = ax
        for y in range(0, base):
            if y % 11 == 0:
                x = ax + (rnd.random() - 0.5) * 4
            half = w * (0.7 + 0.3 * (y / base))
            for dx in range(int(-half) - 1, int(half) + 2):
                d = abs(dx) / max(half, 0.5)
                if d <= 1:
                    cel.put(x + dx, y, LIGHT if d < 0.55 else ("brass", 7) if d < 0.85 else ("brass", 6))
    if 1 <= i <= 4:
        r = (0, 9, 13, 15, 16)[i]
        blob(cel, ax + 0.5, base - 2, r * 0.9, 3.4 - i * 0.5, ("brass", 7))
        blob(cel, ax + 0.5, base - 2, r * 0.5, 2.0, LIGHT)
        for k in range(7):
            a = math.pi * (1.08 + 0.84 * k / 6)
            streak(cel, (ax + math.cos(a) * r * 1.2, base - 2 + math.sin(a) * r), (ax + math.cos(a) * r * 0.5, base - 2 + math.sin(a) * r * 0.4), [LIGHT, ("brass", 7), ("brass", 5)])
    if i >= 4:
        for k in range(8):
            cel.put(ax + (rnd.random() - 0.5) * 22, base - 6 - rnd.random() * 60 - (i - 4) * 8, LIGHT if k % 2 else ("brass", 7))
        thin(cel, 0.6 if i == 4 else 0.3, 7)
    rim(cel, ("brass", 2))


# ----------------------------------------------------------------------------------------- Battle Enrage
def zeal_wave(cel: Cel, i: int, t: float) -> None:
    _ground_ring(cel, i, t, ("brass", 7), ("crimson", 6), ("crimson", 4), ("crimson", 1), True)


def _wing(cel: Cel, sx: float, sy: float, side: int, spread: float, lift: float, i: int, hot: bool, z: float = 1.0) -> None:
    """One wing of fire from a shoulder: four long feathers of flame fanned up and out — gold where they leave the
    back, crimson at the tips — the top one longest, like a wing's leading edge."""
    for k, (ang, ln, wd) in enumerate(((62, 30, 4.2), (40, 29, 3.8), (20, 25, 3.4), (2, 19, 3.0))):
        ln, wd = ln * z, wd * (0.35 + 0.65 * z)
        a = math.radians(ang * spread + lift)
        dx, dy = math.cos(a) * side, -math.sin(a)
        ln = ln * (0.6 + 0.4 * spread) + math.sin(i * 1.7 + k * 2) * 1.3
        for s in range(int(ln)):
            f = s / ln
            w = wd * (1 - f) ** 0.7 + 0.5
            droop = f * f * (5 - k) * z  # the feathers curve down towards their tips
            x, y = sx + dx * s, sy + dy * s + droop
            for d in range(int(-w), int(w) + 1):
                e = abs(d) / max(w, 0.5)
                if f < 0.4:
                    tone = LIGHT if hot and e < 0.3 and k < 2 else ("brass", 7) if e < 0.45 else ("brass", 6)
                elif f < 0.72:
                    tone = ("brass", 6) if e < 0.3 else ("crimson", 6)
                else:
                    tone = ("crimson", 6) if e < 0.4 else ("crimson", 5)
                cel.put(x + dy * d * 0.9 * side, y + dx * d * 0.9 * side * -1 + abs(d) * 0.2, tone)
        cel.put(sx + dx * ln, sy + dy * ln + (5 - k) * z, ("brass", 7))


def zeal_wings(cel: Cel, i: int, t: float) -> None:
    """Battle Enrage on HER: two wings of crimson-gold fire stand open behind her shoulders and beat slowly. Only
    she wears them — the heroes she rouses get a rim of the same fire (export_fx.RIMS `roused`), so three heroes
    side by side are never buried under wings."""
    ax, base = 31, 52
    beat = math.sin(math.tau * t)
    for side in (-1, 1):
        _wing(cel, ax + side * 3, base - 27, side, 0.94 + 0.06 * beat, 5 * beat, i, i % 4 == 0, 0.78)
    rim(cel, ("crimson", 1))


def zeal_ignite(cel: Cel, i: int, t: float) -> None:
    """The wings catch: a flash between the shoulders, arcs of fire thrown out to both sides and embers flung up
    (the wings themselves stand BEHIND the hero — this only announces them)."""
    ax, base = 34, 60
    sy = base - 30
    if i <= 2:
        spark(cel, ax, sy, (5, 9, 6)[i], LIGHT, ("brass", 7))
    r = 6 + 22 * ease_out(t)
    if i <= 4:
        for a0, a1 in ((185, 250), (290, 355)):
            ring(cel, ax, sy + 4, r, r * 0.85, ("brass", 7) if i < 2 else ("crimson", 6), a0=a0, a1=a1, thick=2.2 - t * 1.4)
    rnd = random.Random(23)
    for k in range(12):
        side = 1 if k % 2 == 0 else -1
        f = max(0.0, t - rnd.random() * 0.25)
        x = ax + side * (8 + rnd.random() * 12 + f * 8)
        y = sy - rnd.random() * 8 - f * (16 + rnd.random() * 12)
        if f > 0:
            streak(cel, (x, y), (x - side * 2, y + 3), [("brass", 7), ("crimson", 6), ("crimson", 5)])
    if i >= 5:
        thin(cel, 0.55, 5)
    rim(cel, ("crimson", 1))


# ----------------------------------------------------------------------------------------- Healing Light
def _cross(cel: Cel, x: float, y: float, r: int, core=LIGHT, arm=("sea", 8), tip=("sea", 6)) -> None:
    """A small plus of light: a heal's own sign (a nova's hit is an eight-ray star, never a plus)."""
    cel.put(x, y, core)
    for d in range(1, r + 1):
        tone = arm if d < r else tip
        cel.put(x + d, y, tone)
        cel.put(x - d, y, tone)
        cel.put(x, y + d, tone)
        cel.put(x, y - d, tone)


def swift_gift(cel: Cel, i: int, t: float) -> None:
    """Healing Light leaving her: the open book flares white and one cross of mint light jumps off it — quick, no
    petals (those are the heal that keeps working)."""
    cx, cy = 10, 14
    if i < 3:
        blob(cel, cx + 0.5, cy + 0.5, 4.4 - i * 1.2, 4.4 - i * 1.2, ("sea", 8))
        blob(cel, cx + 0.5, cy + 0.5, 2.4 - i * 0.7, 2.4 - i * 0.7, LIGHT)
    lift = 10 * ease_out(t, 1.6)
    _cross(cel, cx + 3 + lift * 0.6, cy - 2 - lift, (2, 3, 3, 2, 1)[i])
    if i >= 3:
        thin(cel, 0.5, 3)
    rim(cel, ("sea", 2))


def swift_light(cel: Cel, i: int, t: float) -> None:
    """Healing Light landing: a shaft of white-mint light DROPPED on the ally at once — top to toe in two frames —
    with a cross flashing over the head, then gone. Upright and sudden: an instant heal reads as a strike of light,
    where a heal over time winds up the body slowly (mend_wind)."""
    ax, base = 16, 62
    top = 4
    reach = (0.45, 1.0, 1.0, 1.0, 1.0, 1.0)[i]
    w = (2.6, 4.4, 3.6, 2.6, 1.6, 0.8)[i]
    bottom = top + (base - top) * reach
    for y in range(top, int(bottom)):
        f = (y - top) / max(1.0, base - top)
        half = w * (0.65 + 0.35 * f)
        for x in range(int(math.floor(ax - half)), int(math.ceil(ax + half))):
            d = abs(x + 0.5 - ax) / max(half, 0.5)
            cel.put(x, y, LIGHT if d < 0.45 else ("sea", 8) if d < 0.8 else ("sea", 6))
    if 1 <= i <= 4:
        ring(cel, ax, base - 1.5, 6 + i * 2.5, 1.6 + i * 0.5, ("sea", 8) if i < 3 else ("sea", 6), thick=1.2)
    if i >= 1:
        _cross(cel, ax, 10 - min(i, 3), (3, 4, 4, 3, 2)[i - 1] if i - 1 < 5 else 1)
    if i >= 4:
        thin(cel, 0.55 if i == 4 else 0.3, 7)
    rim(cel, ("sea", 2))


# ----------------------------------------------------------------------------------------- Circle of Healing
def circle_pulse(cel: Cel, i: int, t: float) -> None:
    """Circle of Healing: ONE bright ring flashes out under the whole party — faster and whiter than Sanctuary's —
    and throws crosses of light up off it as it passes. Nothing stays: the heal is given at once."""
    ax, ay = 64, 30
    rx = 10 + 54 * ease_out(t, 2.2)
    ry = rx * 0.27
    if i < 5:
        ring(cel, ax, ay, rx, ry, LIGHT, thick=1.6 - 0.25 * i)
        ring(cel, ax, ay, rx - 2, ry - 0.6, ("sea", 8), thick=1.0)
    if i < 2:
        blob(cel, ax + 0.5, ay - 0.5, 7 - i * 3, 2.4 - i, LIGHT)
    rnd = random.Random(11)
    for k in range(9):
        a = math.pi * (1.05 + 0.9 * k / 8)
        born = 0.15 + 0.06 * k
        if t < born:
            continue
        f = min(1.0, (t - born) / 0.45)
        x = ax + math.cos(a) * rx * 0.9 + (rnd.random() - 0.5) * 3
        y = ay + math.sin(a) * ry - 4 - f * 16
        _cross(cel, x, y, 2 if f < 0.6 else 1)
    if i >= 5:
        thin(cel, 0.5 if i == 5 else 0.25, 9)
    rim(cel, ("sea", 2))


# ----------------------------------------------------------------------------------------- a heal's cleanse
def cleanse_flash(cel: Cel, i: int, t: float) -> None:
    """A heal lifted a harmful effect off this hero: a white flash at the chest throws dark violet flecks off the body
    and they fade as they fly — the harm driven out, in the moment it happens."""
    ax, base = 20, 50
    cy = base - 22
    if i < 2:
        blob(cel, ax + 0.5, cy + 0.5, 3.2 - i * 1.2, 4.2 - i * 1.6, LIGHT)
    if i < 4:
        ring(cel, ax, cy, 5 + i * 4.5, 6.5 + i * 5.0, LIGHT if i < 2 else ("sea", 8), thick=1.0, gap=(lambda a: int(a / 30) % 2 == 1) if i >= 2 else None)
    rnd = random.Random(31)
    for k in range(10):
        a = math.tau * k / 10 + rnd.random() * 0.5
        sp = 9 + rnd.random() * 9
        d = 5 + sp * ease_out(t, 1.4)
        x = ax + math.cos(a) * d
        y = cy + math.sin(a) * d * 1.2 - t * 5
        if t > 0.75 and k % 2:
            continue
        dark = ("violet", 2) if t < 0.6 else ("violet", 3)
        cel.put(x, y, dark)
        cel.put(x + 1, y, dark)
        cel.put(x, y + 1, dark)
        cel.put(x + 1, y + 1, ("violet", 4) if t < 0.6 else ("violet", 3))
    if i >= 4:
        thin(cel, 0.5, 4)
    rim(cel, ("sea", 2), only=lambda tone: tone[0] != "violet")
    rim(cel, ("ink", 7), only=lambda tone: tone[0] == "violet")

FX = [
    Fx("light_bolt", 28, 11, 23, 5, [50, 50, 50], True, light_bolt),
    Fx("light_page", 24, 15, 14, 7, [60, 60, 60, 60], True, light_page),
    Fx("light_hit", 27, 27, 13, 13, [35, 45, 55, 70], False, light_hit),
    Fx("heal_bloom", 44, 58, 22, 54, [45, 50, 60, 70, 80, 90, 90, 100], False, heal_bloom),
    Fx("mend_gift", 48, 32, 10, 20, [40, 50, 60, 70, 80, 90], False, mend_gift),
    Fx("mend_wind", 40, 56, 20, 52, [60, 60, 70, 70, 80, 90, 90, 100], False, mend_wind),
    Fx("mend_petals", 36, 48, 18, 46, [130] * 8, True, mend_petals),
    Fx("ward_spark", 30, 28, 10, 14, [35, 45, 55, 70, 80], False, ward_spark),
    Fx("ward_raise", 60, 70, 30, 64, [45, 50, 55, 70, 70, 80, 90], False, ward_raise),
    Fx("ward_front", 48, 60, 24, 56, [140] * 8, True, ward_front),
    Fx("ward_break", 60, 70, 30, 64, [45, 55, 65, 75, 85, 95], False, ward_break),
    Fx("ward_veil", 36, 50, 18, 50, [150] * 6, True, ward_veil),
    Fx("infusion_motes", 36, 48, 18, 46, [170] * 12, True, infusion_motes),
    Fx("infusion_ignite", 44, 56, 22, 54, [45, 50, 55, 60, 65, 70], False, infusion_ignite),
    Fx("infuse_send", 46, 24, 9, 12, [35, 45, 55, 70, 80], False, infuse_send),
    Fx("nova_flash", 60, 40, 30, 36, [35, 45, 55, 70, 80], False, nova_flash),
    Fx("nova_ring", 128, 44, 64, 26, [45, 50, 55, 60, 70, 80, 90], False, nova_ring),
    Fx("nova_shaft", 22, 68, 11, 66, [35, 45, 70, 70, 70, 80], False, nova_shaft),
    Fx("nova_hit", 33, 33, 16, 16, [35, 50, 60, 70], False, nova_hit),
    Fx("retribution_seal", 48, 22, 24, 15, [140] * 8, True, retribution_seal),
    Fx("retribution_tread", 28, 13, 14, 8, [150] * 8, True, retribution_tread),
    Fx("sanctuary_ring", 128, 44, 64, 26, [55, 60, 65, 70, 80, 90, 100], False, sanctuary_ring),
    Fx("sanctuary_glow", 42, 31, 21, 24, [130] * 8, True, sanctuary_glow),
    Fx("smite_strike", 36, 112, 18, 108, [30, 45, 55, 65, 75, 85], False, smite_strike),
    Fx("zeal_wave", 128, 44, 64, 26, [50, 50, 60, 60, 70, 80, 90], False, zeal_wave),
    Fx("zeal_wings", 62, 54, 31, 52, [110] * 8, True, zeal_wings),
    Fx("zeal_ignite", 68, 62, 34, 60, [40, 50, 55, 65, 75, 85, 95], False, zeal_ignite),
    Fx("swift_gift", 30, 26, 10, 14, [35, 45, 55, 70, 80], False, swift_gift),
    Fx("swift_light", 32, 66, 16, 62, [35, 45, 60, 70, 80, 90], False, swift_light),
    Fx("circle_pulse", 128, 44, 64, 30, [35, 40, 45, 55, 60, 70, 80], False, circle_pulse),
    Fx("cleanse_flash", 40, 52, 20, 50, [35, 45, 55, 65, 75, 90], False, cleanse_flash),
]
