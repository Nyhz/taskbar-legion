"""The Priest's ability effects. Body effects are anchored on the body's centre at the ground line, hits on their
own centre, what she throws on its head.

Four families, told apart by colour AND by shape, so a glance says what was done to whom:
  a HEAL  is mint light, soft and round: ribbons that wind up the body, petals that drift off it;
  a SHIELD is azure glass, hard and faceted: panes with white edges that lock, hold and shatter;
  POWER   is bright yellow: a thin rim of light hugging the whole figure (Power Infusion — export_fx.RIMS);
  WRATH   is white-gold from above (Smite, Holy Nova) and crimson-gold wings (Battle Enrage).

Her basic attacks   light_bolt (the lantern's) · light_page (a leaf of the book) · light_hit (where they land)
Any heal            heal_bloom (on whoever is healed)
Mend                mend_gift (cast, at the lantern) · mend_wind (the heal taking hold) · mend_petals (while it mends)
Holy Shield         ward_spark (cast, at the book) · ward_raise · ward_front (while it holds) · ward_break
Lesser wards        ward_veil (Deep Sanctuary, Second Wind: a small canopy of the same glass)
Power Infusion      infuse_send (cast, at her hand) · infusion_ignite · the rim `infused` + infusion_motes (while on)
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
GLASS = [("azure", 4), ("azure", 6), ("azure", 8)]  # a shield
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
def _gem(ax: float, base: float, k: float = 1.0) -> dict[str, tuple[float, float]]:
    """The corners of the shield: a tall cut gem standing round the body (k scales it about its foot)."""
    def at(dx: float, up: float) -> tuple[float, float]:
        return ax + dx * k, base - 1 - up * k
    return {"bl": at(-13, 0), "l": at(-19, 16), "tl": at(-12, 43), "t": at(0, 48), "tr": at(12, 43), "r": at(19, 16), "br": at(13, 0),
            "ml": at(-7, 22), "mr": at(7, 22)}


def _pane_edges(cel: Cel, ax: float, base: float, tones, front: bool, glint: float = -1.0, k: float = 1.0) -> None:
    """The shield as it stands: a faceted gem of glass round the body — straight edges, never a curve. The BACK
    layer is the whole outline and the facets of its far side, in the darker tones; the FRONT layer is only what
    catches the light: the edges of the side towards the enemy, one seam down the near face, the foot, a glint.
    Lines only, so whoever stands inside stays readable."""
    g = _gem(ax, base, k)
    if not front:
        for a, b in (("bl", "l"), ("l", "tl"), ("tl", "t"), ("t", "tr"), ("tr", "r"), ("r", "br")):
            cel.line(g[a], g[b], tones[1])
        for a, b in (("tl", "ml"), ("l", "ml"), ("ml", "bl"), ("t", "ml")):
            cel.line(g[a], g[b], tones[0])
        for x in range(int(g["bl"][0]), int(g["br"][0]) + 1):
            if (x + int(ax)) % 3 == 0:
                cel.put(x, base - 1, tones[0])
        return
    for a, b in (("t", "tr"), ("tr", "r"), ("r", "br")):
        cel.line(g[a], g[b], tones[2])
        cel.line((g[a][0] - 1, g[a][1]), (g[b][0] - 1, g[b][1]), tones[1])
    cel.line(g["tl"], g["t"], tones[1])
    for x in range(int(g["bl"][0]), int(g["br"][0]) + 1):
        if (x + int(ax)) % 3 != 0:
            cel.put(x, base - 1, tones[1])
    if glint >= 0:
        a, b = (("t", "tr"), ("tr", "r"), ("r", "br"))[min(2, int(glint * 3))]
        f = (glint * 3) % 1.0
        spark(cel, g[a][0] + (g[b][0] - g[a][0]) * f, g[a][1] + (g[b][1] - g[a][1]) * f, 2, LIGHT, tones[2])


def _pane_seams(cel: Cel, ax: float, base: float, tone, k: float = 1.0) -> None:
    """The seams of the near face, DOTTED and drawn after the outline (so they get no dark edge): the cut of the
    glass shows without a cage of bars across whoever stands inside."""
    g = _gem(ax, base, k)
    for a, b in (("t", "mr"), ("tr", "mr"), ("mr", "r"), ("mr", "br")):
        (x0, y0), (x1, y1) = g[a], g[b]
        n = int(max(abs(x1 - x0), abs(y1 - y0)))
        for j in range(1, n):
            if j % 3 == 0:
                cel.put(int(round(x0 + (x1 - x0) * j / n)), int(round(y0 + (y1 - y0) * j / n)), tone)


def ward_spark(cel: Cel, i: int, t: float) -> None:
    """Holy Shield cast: the open book flashes azure and a pane of glass springs off it."""
    cx, cy = 10, 14
    spark(cel, cx, cy, (3, 6, 5, 3, 2)[i], LIGHT, ("azure", 7))
    s = 3 + 9 * ease_out(t)
    if i < 4:
        poly(cel, [(cx + 4, cy - s), (cx + 4 + s * 0.7, cy - s * 0.5), (cx + 4 + s * 0.7, cy + s * 0.5), (cx + 4, cy + s)], ("azure", 6))
        cel.line((cx + 4, cy - s), (cx + 4 + s * 0.7, cy - s * 0.5), LIGHT)
        cel.line((cx + 4, cy - s), (cx + 4, cy + s), ("azure", 8))
    if i >= 3:
        thin(cel, 0.5 if i == 3 else 0.25, 5)
    rim(cel, ("azure", 1))


def ward_raise(cel: Cel, i: int, t: float) -> None:
    """The shield closing: panes of azure glass fly in from all round and lock into the gem with a flash."""
    ax, base = 28, 60
    close = ease_in(min(1.0, t * 1.5), 1.4)
    g = _gem(ax, base)
    rnd = random.Random(13)
    if i < 4:
        for k, name in enumerate(("l", "tl", "t", "tr", "r", "ml", "mr")):
            gx, gy = g[name]
            far = 1.0 - close
            x = gx + (gx - ax) * far * 1.3 + (rnd.random() - 0.5) * 6 * far
            y = gy + (gy - (base - 24)) * far * 1.1 - far * 6
            sz = 4 + rnd.random() * 2
            poly(cel, [(x, y - sz), (x + sz * 0.8, y), (x, y + sz), (x - sz * 0.8, y)], ("azure", 6))
            cel.line((x, y - sz), (x + sz * 0.8, y), LIGHT)
            cel.line((x - sz * 0.8, y), (x, y - sz), ("azure", 8))
    if i >= 3:
        _pane_edges(cel, ax, base, GLASS, False)
        _pane_edges(cel, ax, base, GLASS, True)
    if i == 3:
        for name in ("tl", "t", "tr", "r", "l"):
            spark(cel, g[name][0], g[name][1], 3, LIGHT, ("azure", 8))
    if i >= 5:
        thin(cel, 0.6, 6)
    rim(cel, ("azure", 1))


def ward_front(cel: Cel, i: int, t: float) -> None:
    """The shield while it holds: the gem drawn in thin lines of glass and nothing else — its lit edges on the side
    towards the enemy (the only ones with a dark edge), the far side one faint line, the seams of the near face
    dotted, a glint running down the lit edge. Whoever stands inside, and whatever else they wear, shows through."""
    ax, base = 22, 52
    g = _gem(ax, base)
    for a, b in (("t", "tr"), ("tr", "r"), ("r", "br")):
        cel.line(g[a], g[b], GLASS[2])
    rim(cel, ("azure", 2))
    for a, b in (("bl", "l"), ("l", "tl"), ("tl", "t")):
        cel.line(g[a], g[b], GLASS[0])
    _pane_seams(cel, ax, base, GLASS[1])
    for x in range(int(g["bl"][0]) + 1, int(g["br"][0])):
        if (x + int(ax)) % 3 == 0:
            cel.put(x, base - 1, GLASS[1])
    a, b = (("t", "tr"), ("tr", "r"), ("r", "br"))[min(2, int(t * 3))]
    f = (t * 3) % 1.0
    spark(cel, g[a][0] + (g[b][0] - g[a][0]) * f, g[a][1] + (g[b][1] - g[a][1]) * f, 1, LIGHT, GLASS[2])


def ward_break(cel: Cel, i: int, t: float) -> None:
    """The shield gives: the gem cracks white and its panes fly apart and fall."""
    ax, base = 30, 60
    out = ease_out(t, 1.6)
    g = _gem(ax, base)
    if i == 0:
        _pane_edges(cel, ax, base, [LIGHT, LIGHT, LIGHT], False)
        _pane_edges(cel, ax, base, [LIGHT, LIGHT, LIGHT], True)
    rnd = random.Random(31)
    names = ("l", "tl", "t", "tr", "r", "ml", "mr", "bl", "br")
    for k in range(13):
        gx, gy = g[names[k % len(names)]]
        gx += (rnd.random() - 0.5) * 8
        gy += (rnd.random() - 0.5) * 10
        x = gx + (gx - ax) * out * (0.6 + rnd.random() * 0.6)
        y = gy - out * 6 + out * out * (10 + 12 * rnd.random())
        sz = (3.6 - 2.2 * t) * (0.7 + 0.6 * rnd.random())
        if i == 0:
            continue
        if sz < 0.9:
            cel.put(x, y, ("azure", 7))
            continue
        poly(cel, [(x, y - sz), (x + sz * 0.8, y + sz * 0.2), (x - sz * 0.3, y + sz)], ("azure", 6 if k % 2 else 7))
        cel.put(x, y - sz, LIGHT)
    if i >= 4:
        thin(cel, 0.55, 8)
    rim(cel, ("azure", 1))


def ward_veil(cel: Cel, i: int, t: float) -> None:
    """A lesser ward: only the crown of the same gem, a small canopy of glass over the head and shoulders."""
    ax, base = 18, 44
    g = _gem(ax, base, 0.86)
    for a, b, tone in (("l", "tl", ("azure", 5)), ("tl", "t", ("azure", 6)), ("t", "tr", ("azure", 8)), ("tr", "r", ("azure", 8))):
        x0, y0 = g[a]
        x1, y1 = g[b]
        if a == "l":
            x0, y0 = x0 + (x1 - x0) * 0.45, y0 + (y1 - y0) * 0.45
        if b == "r":
            x1, y1 = x0 + (x1 - x0) * 0.55, y0 + (y1 - y0) * 0.55
        cel.line((x0, y0), (x1, y1), tone)
    cel.line(g["t"], (g["mr"][0], g["t"][1] + 9), ("azure", 6))
    cel.line(g["t"], (g["ml"][0], g["t"][1] + 9), ("azure", 5))
    pick = (g["t"], g["tr"], g["tl"])[(i // 2) % 3]
    if i % 6 < 4:
        spark(cel, pick[0], pick[1], 1, LIGHT, ("azure", 8))
    rim(cel, ("azure", 1))


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


FX = [
    Fx("light_bolt", 28, 11, 23, 5, [50, 50, 50], True, light_bolt),
    Fx("light_page", 24, 15, 14, 7, [60, 60, 60, 60], True, light_page),
    Fx("light_hit", 27, 27, 13, 13, [35, 45, 55, 70], False, light_hit),
    Fx("heal_bloom", 44, 58, 22, 54, [45, 50, 60, 70, 80, 90, 90, 100], False, heal_bloom),
    Fx("mend_gift", 48, 32, 10, 20, [40, 50, 60, 70, 80, 90], False, mend_gift),
    Fx("mend_wind", 40, 56, 20, 52, [60, 60, 70, 70, 80, 90, 90, 100], False, mend_wind),
    Fx("mend_petals", 36, 48, 18, 46, [130] * 8, True, mend_petals),
    Fx("ward_spark", 30, 28, 10, 14, [35, 45, 55, 70, 80], False, ward_spark),
    Fx("ward_raise", 56, 64, 28, 60, [45, 50, 55, 70, 70, 80, 90], False, ward_raise),
    Fx("ward_front", 44, 54, 22, 52, [140] * 8, True, ward_front),
    Fx("ward_break", 62, 70, 30, 60, [45, 55, 65, 75, 85, 95], False, ward_break),
    Fx("ward_veil", 36, 46, 18, 44, [150] * 6, True, ward_veil),
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
]
