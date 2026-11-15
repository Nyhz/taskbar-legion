"""The BOSS KIT on the strip (src/data/bossKit.ts): what the bosses' affixes and the world bosses' own mechanics
look like. Everything is drawn going RIGHT (or facing right); the game mirrors it for a foe, which faces left.

The Flock           crow_fly · crow_peck · crow_gone (a crow is a small FIGURE made of these three: same cell, same
(the Crowmother)    anchor — it flies, pecks and bursts into feathers) · flock_gather (feathers circling her while
                    she winds it up) · flock_burst (the crows leave her)
Roots               warn_roots (the ground under the hero they are coming for) · roots_rise · roots_bind (while
(Mistletoe)         he is held) · roots_break
Chain bolt          warn_static (over every hero while it gathers) · bolt_strike (it falls) · bolt_spark (it jumps
(the Drowned Moon)  to the next hero) · bolt_zap (it lands on him)
Armored             shell_plate (plates of steel light over the boss while the shell holds) · shell_raise ·
                    shell_break
Vampiric            leech_drain (blood drawn up into the boss on a hit that feeds it)
Venomous            venom_splash (a stack lands) · venom_drip (while the hero is poisoned)
Seismic             seismic_tremor (the ground at its feet, for as long as the fight lasts)
Culpa               warn_guilt (the brand over every hero while it chooses) · guilt_fall (it is laid) · guilt_brand
(the Scapegoat)     (while he is marked) · guilt_pang (it takes its toll)
Silencio dorado     warn_gild (rings of gold climbing round him) · gild_toll (it tolls) · gild_lock (it closes on a
(the Gilded Abbot)  hero) · gilded_halo (while his cooldowns stand still)
Resaca              warn_tide / warn_tide_hot (the path going under) · undertow_surge (where it is let go) ·
(the Ninth Wave)    undertow_front (the wave) · undertow_trail (its foam) · undertow_splash (round a hero's legs)
Esporas             warn_spores (billows climbing round her) · spore_land (a layer settles on a hero) ·
(the Destroying     spores_grow (while they are on him) · spore_wither (a heal clears them)
Angel)
Hoja al rojo        warn_blade (the path splits and heats under a hero) · blade_ignite (the blade drives up) ·
(the Quench)        ground_fire (while the ground burns under him)
Balanza             warn_scales (a pan over each hero's head) · scales_fall (it comes level: his life goes into it)
(the Verdict)
Espejos             warn_mirror (shards closing into a mirror before it) · mirror_flash (it turns it on the party) ·
(the Unmaker)       shot_shard / shard_hit (what it sends back) · mirror_boon (what it keeps for itself)
Deadeye             deadeye_mark (the sight closing on the hero it picked) and what each boss sends: shot_crow
                    (the Crowmother) · shot_thorn (Mistletoe, the Antlered Warden) · shot_moon (the Drowned Moon) ·
                    shot_sickle (the Harvest King) · shot_wisp (the Ferryman) · shot_deadeye (everyone else);
                    worlds 4–10: shot_horn · shot_bead · shot_spout · shot_sporecap · shot_hotblade · shot_gavel ·
                    shot_void (their world bosses) and shot_rock · shot_bell · shot_ball · shot_crystal ·
                    shot_magma · shot_lance · shot_hatchet (their stage bosses)
"""
from __future__ import annotations

import math
import random

from pipeline.fx import Fx, blob, ease_in, ease_out, flame, poly, rim, ring, spark, streak, thin
from pipeline.rig import Cel

LIGHT = ("light", 0)

# ----------------------------------------------------------------------------------------- the crow
CROW = {
    "B": ("ink", 3), "b": ("ink", 2), "H": ("ink", 7), "h": ("ink", 5), "t": ("ink", 4), "v": ("violet", 5),
    "E": ("crimson", 6), "g": ("brass", 5), "f": ("brass", 3),
}
_UP = [
    "..hh...........",
    "..hHHh.........",
    "...hHHHh.......",
    "...hHHHHh.bb...",
    "....hHHHBvBEb..",
    ".tthBBBBBBBBBgg",
    "ttBBBBBBBBBBb..",
    "..tBBBBBBBb....",
    "....bBBBb......",
    ".....f.f.......",
]
_MID = [
    "...............",
    "...............",
    "..........bb...",
    "hhhhhh...bBEb..",
    ".hHHHHhhBvBBBgg",
    ".tthHHHBBBBBb..",
    "ttBBBBBBBBBb...",
    "..tBBBBBBBb....",
    "....bBBBb......",
    ".....f.f.......",
]
_DOWN = [
    "...............",
    "...............",
    "..........bb...",
    ".........bBEb..",
    ".tt.bBBBvBBBBgg",
    "ttBBhHHHBBBBb..",
    "..thHHHHhBBb...",
    "..hHHHHh.......",
    "..hHHHh........",
    "...hhh.........",
]
CROW_W, CROW_H, CROW_AX, CROW_AY = 30, 24, 15, 20
_OX, _OY = 7, 6


def _crow(cel: Cel, rows: list[str], dx: float = 0, dy: float = 0) -> None:
    cel.stamp(rows, CROW, _OX + dx, _OY + dy)
    rim(cel, ("ink", 0))


def crow_fly(cel: Cel, i: int, t: float) -> None:
    _crow(cel, (_UP, _MID, _DOWN, _MID)[i], 0, (0, 1, 0, -1)[i])


def crow_peck(cel: Cel, i: int, t: float) -> None:
    """It folds its wings and drives the beak forward and down, then beats back up."""
    rows, dx, dy = ((_UP, -2, -1), (_MID, 1, 1), (_DOWN, 5, 3), (_DOWN, 6, 4), (_MID, 2, 1), (_UP, 0, 0))[i]
    _crow(cel, rows, dx, dy)
    if i in (2, 3):  # the beak finds something
        bx, by = _OX + dx + 15, _OY + dy + 5
        cel.put(bx, by, LIGHT)
        cel.put(bx + 1, by - 1, ("brass", 7))
        cel.put(bx + 1, by + 1, ("crimson", 6))


def _feather(cel: Cel, x: float, y: float, ang: float, ln: int, lit: bool) -> None:
    """A black feather: a pale quill at one end so it shows on a black sky, a violet sheen at the other."""
    for s in range(ln + 1):
        cel.put(x + math.cos(ang) * s, y + math.sin(ang) * s, (("ink", 8) if lit else ("ink", 6)) if s == 0 else ("ink", 3) if s < ln else ("violet", 5))


def crow_gone(cel: Cel, i: int, t: float) -> None:
    """Shot down (or gone with its mother): a burst of black feathers that drift apart and fall."""
    cx, cy = CROW_AX, 11
    rnd = random.Random(21)
    grow = ease_out(t, 1.6)
    if i == 0:
        blob(cel, cx, cy, 5, 4, ("ink", 5))
        blob(cel, cx, cy, 3, 2.4, ("ink", 8))
    for k in range(9):
        a = math.tau * k / 9 + rnd.random() * 0.6
        sp = (4 + rnd.random() * 7) * grow
        x, y = cx + math.cos(a) * sp, cy + math.sin(a) * sp * 0.8 + t * t * 5
        tilt = a + t * 3 * (1 if k % 2 else -1)
        ln = 2 + (k % 2)
        _feather(cel, x, y, tilt, ln, True)
    if i >= 4:
        thin(cel, 1.0 - 0.3 * (i - 3), 5)
    rim(cel, ("ink", 0))


# ----------------------------------------------------------------------------------------- the Flock: her cast
def _plume(cel: Cel, x: float, y: float, ang: float, ln: int, lit: bool) -> None:
    """A big wing feather, for what is shown ON her (black on black): a pale quill, a violet edge."""
    ca, sa = math.cos(ang), math.sin(ang)
    for s in range(ln + 1):
        cel.put(x + ca * s, y + sa * s, ("bone", 6) if s < 2 else ("violet", 6) if lit and s % 2 else ("ink", 3))
        if 1 < s < ln:
            cel.put(x + ca * s - sa, y + sa * s + ca, ("violet", 5) if lit else ("ink", 5))


def flock_gather(cel: Cel, i: int, t: float) -> None:
    """While she winds the Flock up: her feathers tear loose and wheel round her in a wide rising spiral, red eyes
    opening among them."""
    cx, base = 75, 124
    for k in range(26):
        f = (t + k / 26) % 1.0
        a = math.tau * (f * 1.25 + k * 0.381)
        r = 62 - 26 * f
        x, y = cx + math.cos(a) * r, base - 6 - f * 104 + math.sin(a) * 6
        _plume(cel, x, y, a + math.pi / 2, 5 if k % 3 else 7, k % 2 == 0)
    rim(cel, ("ink", 0))
    for k in range(6):  # the eyes
        f = (t + k / 6) % 1.0
        a = math.tau * (f * 1.25 + k * 0.5)
        x, y = cx + math.cos(a) * (50 - 20 * f), base - 20 - f * 84
        if f < 0.8:
            cel.put(x, y, ("brass", 7))
            cel.put(x - 1, y, ("crimson", 6))
            cel.put(x + 1, y, ("crimson", 6))


def flock_burst(cel: Cel, i: int, t: float) -> None:
    """The crows leave her: a wide ring of feathers thrown out from her breast, a violet flash at its heart."""
    cx, cy = 70, 52
    grow = ease_out(t, 1.8)
    rnd = random.Random(31)
    if i < 3:
        blob(cel, cx, cy, 14 - i * 4, 11 - i * 3, ("violet", 6))
        blob(cel, cx, cy, 8 - i * 2.5, 6 - i * 2, ("violet", 8) if i else LIGHT)
    r = 12 + 52 * grow
    ring(cel, cx, cy, r, r * 0.7, ("violet", 7) if i < 3 else ("violet", 5), thick=3.0 - 2.0 * t, gap=lambda a: int(a / 12) % 3 == 0)
    for k in range(34):
        a = math.tau * k / 34 + rnd.random() * 0.2
        sp = (14 + rnd.random() * 48) * grow
        x, y = cx + math.cos(a) * sp, cy + math.sin(a) * sp * 0.7 + t * t * 8
        _plume(cel, x, y, a + t * 2, 5 + (k % 3), k % 2 == 0)
    if i >= 4:
        thin(cel, 1.0 - 0.3 * (i - 3), 6)
    rim(cel, ("ink", 0))


# ----------------------------------------------------------------------------------------- Roots
ROOT = [("leather", 2), ("leather", 4), ("leather", 6)]


def _root(cel: Cel, x0: float, base: float, height: float, lean: float, phase: float, thick: int = 2, berries: bool = False) -> None:
    """One root climbing from the ground: it snakes as it rises, thorned, tipped with a mistletoe sprig."""
    h = max(1, int(round(height)))
    for j in range(h):
        f = j / max(1, h - 1)
        x = x0 + lean * f + math.sin(f * 5.0 + phase) * 2.2 * f
        y = base - j
        w = max(1, int(round(thick * (1.0 - 0.6 * f))))
        for d in range(w):
            cel.put(x + d, y, ROOT[2] if d == 0 and j % 3 else ROOT[1] if d == 0 else ROOT[0])
        if j % 4 == 2 and f < 0.85:
            side = -1 if (j // 4) % 2 else w
            cel.put(x + side, y, ("bone", 6))  # a thorn
    tx, ty = x0 + lean + math.sin(5.0 + phase) * 2.2, base - h
    cel.put(tx, ty, ("moss", 6))
    cel.put(tx + 1, ty - 1, ("moss", 7))
    cel.put(tx - 1, ty, ("moss", 5))
    if berries:
        cel.put(tx + 1, ty + 1, LIGHT)
        cel.put(tx - 1, ty - 1, ("bone", 7))


def warn_roots(cel: Cel, i: int, t: float) -> None:
    """The ground under the hero the roots are coming for: a ring of pale green opens round his feet, the earth
    splits and green tips feel their way out."""
    ax, base = 19, 17
    pulse = 0.5 + 0.5 * math.sin(math.tau * t)
    ring(cel, ax, base - 3, 15 + pulse * 2, 3.6 + pulse * 0.6, ("moss", 8) if i % 2 == 0 else ("moss", 7), gap=lambda a: int((a + i * 20) / 30) % 4 == 0)
    rnd = random.Random(8)
    for x in range(-11, 12):
        if (x + i) % 5 != 0:
            cel.put(ax + x, base - 3 + (1 if (x * 7 + 3) % 5 == 0 else 0), ("leather", 2))
    for k in range(6):
        x = -12 + k * 4.8 + rnd.random() * 2
        f = (t + k * 0.21) % 1.0
        h = 3 + 8 * math.sin(f * math.pi)
        for j in range(int(h)):
            last = j >= int(h) - 2
            cel.put(ax + x + math.sin(j * 0.8 + k) * 1.0, base - 4 - j, ("moss", 8) if last else ("leather", 5) if j % 2 else ("leather", 4))
        cel.put(ax + x + 1, base - 4 - int(h), LIGHT if k % 2 == 0 else ("moss", 7))
    rim(cel, ("ink", 1))


def roots_rise(cel: Cel, i: int, t: float) -> None:
    """They burst out of the ground and close on him."""
    ax, base = 19, 40
    grow = ease_out(t, 1.5)
    for k, (dx, h, lean) in enumerate(((-12, 17, 9), (-6, 26, 4), (2, 21, -3), (9, 28, -8), (14, 15, -11))):
        _root(cel, ax + dx, base - 1, h * grow, lean * grow, k * 1.3, 3 if k in (1, 3) else 2, berries=t > 0.7)
    rnd = random.Random(12)
    for k in range(8):  # earth thrown up
        a = math.pi * (1.1 + 0.8 * rnd.random())
        sp = (6 + rnd.random() * 14) * grow
        cel.put(ax + math.cos(a) * sp, base - 3 + math.sin(a) * sp * 0.8 + t * t * 9, ("leather", 4) if k % 2 else ("bone", 4))
    rim(cel, ("ink", 1))


def roots_bind(cel: Cel, i: int, t: float) -> None:
    """While he is held: thorned roots wound round his legs and waist, tightening and easing, berries swaying."""
    ax, base = 19, 38
    sq = math.sin(math.tau * t)
    for k, (dx, h, lean) in enumerate(((-12, 13, 10), (-6, 22, 5), (2, 16, -3), (9, 24, -8), (14, 11, -12))):
        _root(cel, ax + dx, base - 1, h + sq * (1.5 if k % 2 else -1.5), lean + sq * 0.8, k * 1.3 + sq * 0.25, 3 if k in (1, 3) else 2, berries=True)
    # a band across the body, where they cross
    for x in range(-9, 10):
        y = base - 9 + math.sin(x * 0.6 + sq * 0.5) * 1.6
        cel.put(ax + x, y, ROOT[2] if x % 3 else ROOT[1])
        cel.put(ax + x, y + 1, ROOT[0])
        if x % 5 == 0:
            cel.put(ax + x, y - 1, ("bone", 6))
    rim(cel, ("ink", 1))


def roots_break(cel: Cel, i: int, t: float) -> None:
    """They let go: the roots snap and fall away in pieces."""
    ax, base = 19, 40
    rnd = random.Random(14)
    for k in range(12):
        a = math.pi * (1.0 + rnd.random())
        sp = (5 + rnd.random() * 13) * ease_out(t, 1.4)
        x, y = ax + math.cos(a) * sp, base - 14 + math.sin(a) * sp + t * t * 16
        tilt = a + t * 4
        for s in range(3 + k % 3):
            cel.put(x + math.cos(tilt) * s, min(base - 1, y + math.sin(tilt) * s), ROOT[1] if s % 2 else ROOT[2])
        if k % 3 == 0:
            cel.put(x, min(base - 1, y - 1), ("moss", 6))
    if i >= 3:
        thin(cel, 1.0 - 0.3 * (i - 2), 3)
    rim(cel, ("ink", 1))


# ----------------------------------------------------------------------------------------- Chain bolt
BOLT = [LIGHT, ("azure", 8), ("azure", 6)]


def _zig(cel: Cel, a: tuple[float, float], b: tuple[float, float], seed: int, jitter: float, tones=BOLT, thick: bool = True) -> None:
    """A jagged stroke of lightning from a to b."""
    rnd = random.Random(seed)
    n = max(2, int(math.hypot(b[0] - a[0], b[1] - a[1]) / 6))
    pts = [a]
    for k in range(1, n):
        f = k / n
        nx, ny = -(b[1] - a[1]), b[0] - a[0]
        ln = math.hypot(nx, ny) or 1.0
        j = (rnd.random() - 0.5) * 2 * jitter
        pts.append((a[0] + (b[0] - a[0]) * f + nx / ln * j, a[1] + (b[1] - a[1]) * f + ny / ln * j))
    pts.append(b)
    for p, q in zip(pts, pts[1:]):
        streak(cel, p, q, [tones[0]])
        if thick:
            streak(cel, (p[0] + 1, p[1]), (q[0] + 1, q[1]), [tones[1]])
            streak(cel, (p[0] - 1, p[1]), (q[0] - 1, q[1]), [tones[2]])


def warn_static(cel: Cel, i: int, t: float) -> None:
    """While the bolt gathers: the air over a hero crackles — it may be him."""
    cx, cy = 13, 8
    rnd = random.Random(40 + i)
    for k in range(3):
        a = rnd.random() * math.tau
        r0, r1 = 2 + rnd.random() * 2, 6 + rnd.random() * 4
        _zig(cel, (cx + math.cos(a) * r0, cy + math.sin(a) * r0 * 0.6), (cx + math.cos(a) * r1, cy + math.sin(a) * r1 * 0.6), 50 + i * 3 + k, 1.4, thick=False)
    if i % 2 == 0:
        spark(cel, cx + (i - 2) * 2, cy, 1, LIGHT, ("azure", 7))
    rim(cel, ("azure", 1))


def bolt_strike(cel: Cel, i: int, t: float) -> None:
    """It falls: one white stroke out of the sky onto a hero, forking, with a burst where it hits the ground."""
    ax, base = 24, 104
    if i <= 3:
        top = (ax + 8, 0)
        _zig(cel, top, (ax, base - 6), 70 + (i // 2), 5.0 if i < 2 else 6.5)
        if i < 3:
            _zig(cel, (ax + 4, base - 62), (ax - 14, base - 34), 75, 3.0, thick=False)
            _zig(cel, (ax + 3, base - 40), (ax + 17, base - 16), 76, 3.0, thick=False)
    r = (5, 10, 14, 17, 19, 20)[i]
    if i < 4:
        blob(cel, ax, base - 5, r * 0.9, r * 0.5, ("azure", 7) if i else LIGHT)
        blob(cel, ax, base - 5, r * 0.5, r * 0.28, LIGHT)
    ring(cel, ax, base - 3, r, r * 0.34, ("azure", 8) if i < 3 else ("azure", 6), thick=2.0 - 0.25 * i)
    rnd = random.Random(72)
    for k in range(8):
        a = math.pi * (1.0 + rnd.random())
        sp = r * (0.7 + rnd.random() * 0.7)
        cel.put(ax + math.cos(a) * sp, base - 5 + math.sin(a) * sp * 0.9, LIGHT if k % 2 else ("azure", 7))
    if i >= 4:
        thin(cel, 0.7 if i == 4 else 0.4, 7)
    rim(cel, ("azure", 1))


def bolt_spark(cel: Cel, i: int, t: float) -> None:
    """It jumps: a knot of lightning with a ragged tail."""
    hx, y = 20, 8
    _zig(cel, (hx - 18, y + (i - 1) * 2), (hx - 3, y), 80 + i, 2.6)
    blob(cel, hx, y, 3.2, 3.2, ("azure", 7))
    blob(cel, hx, y, 1.8, 1.8, LIGHT)
    for k in range(3):
        a = math.tau * (k / 3 + i * 0.21)
        cel.put(hx + math.cos(a) * 5, y + math.sin(a) * 5, LIGHT)
    rim(cel, ("azure", 1))


def bolt_zap(cel: Cel, i: int, t: float) -> None:
    """It lands on the next hero: lightning crawling over his body for a moment."""
    cx, cy = 16, 19
    for k in range(4):
        a = math.tau * (k / 4) + i * 0.9
        r = 6 + 6 * ease_out(t)
        _zig(cel, (cx + math.cos(a) * 2, cy + math.sin(a) * 3), (cx + math.cos(a) * r, cy + math.sin(a) * r * 1.3), 90 + i * 4 + k, 2.2, thick=i < 2)
    if i < 2:
        spark(cel, cx, cy, 4 - i, LIGHT, ("azure", 7))
    if i >= 3:
        thin(cel, 0.75 if i == 3 else 0.45, 9)
    rim(cel, ("azure", 1))


# ----------------------------------------------------------------------------------------- Armored
STEEL = [("ink", 9), ("ink", 7), ("ink", 5)]


def _hex(cel: Cel, cx: float, cy: float, r: float, tone, a0: float = 30.0, gaps: tuple[int, ...] = ()) -> None:
    pts = [(cx + math.cos(math.radians(a0 + 60 * k)) * r, cy + math.sin(math.radians(a0 + 60 * k)) * r * 1.05) for k in range(6)]
    for k in range(6):
        if k in gaps:
            continue
        streak(cel, pts[k], pts[(k + 1) % 6], [tone])


def shell_plate(cel: Cel, i: int, t: float) -> None:
    """While the shell holds: a plate of steel light over the body — drawn in lines only, so the boss stays seen —
    with a glint running round its edge."""
    cx, cy = 14, 16
    _hex(cel, cx, cy, 11, STEEL[1])
    _hex(cel, cx, cy, 7, STEEL[2], gaps=(i % 6, (i + 3) % 6))
    a = math.radians(30 + 360 * t)
    gx, gy = cx + math.cos(a) * 11, cy + math.sin(a) * 11 * 1.05
    cel.put(gx, gy, LIGHT)
    cel.put(gx - math.sin(a), gy + math.cos(a), STEEL[0])
    cel.put(gx + math.sin(a), gy - math.cos(a), STEEL[0])
    for k in range(6):  # rivets at the corners
        b = math.radians(30 + 60 * k)
        cel.put(cx + math.cos(b) * 11, cy + math.sin(b) * 11 * 1.05, ("azure", 7) if (k + i) % 3 == 0 else STEEL[0])
    rim(cel, ("ink", 1))


def shell_raise(cel: Cel, i: int, t: float) -> None:
    """The shell closes: plates slide in from all round and lock with a flash."""
    cx, cy = 32, 32
    close = ease_out(t, 2.0)
    for k in range(6):
        a = math.radians(60 * k)
        d = 14 * (1.0 - close) + 13
        _hex(cel, cx + math.cos(a) * d, cy + math.sin(a) * d * 0.9, 7, STEEL[1] if i < 4 else STEEL[0])
    if i >= 3:
        ring(cel, cx, cy, 14 + (i - 3) * 6, (14 + (i - 3) * 6) * 0.9, LIGHT if i == 3 else ("azure", 7), thick=1.6)
    if i == 3:
        spark(cel, cx, cy, 6, LIGHT, ("azure", 8))
    if i == 5:
        thin(cel, 0.5, 11)
    rim(cel, ("ink", 1))


def shell_break(cel: Cel, i: int, t: float) -> None:
    """The shell breaks: the plates burst outward in shards of steel."""
    cx, cy = 32, 32
    grow = ease_out(t, 1.5)
    rnd = random.Random(17)
    if i < 2:
        spark(cel, cx, cy, 8 - i * 3, LIGHT, ("azure", 8))
        ring(cel, cx, cy, 8 + i * 8, (8 + i * 8) * 0.9, LIGHT, thick=2.0)
    for k in range(26):
        a = math.tau * k / 26 + rnd.random() * 0.3
        sp = (8 + rnd.random() * 22) * grow
        x, y = cx + math.cos(a) * sp, cy + math.sin(a) * sp * 0.9 + t * t * 8
        tilt = a + t * 5 * (1 if k % 2 else -1)
        ln = 3 + k % 4
        poly(cel, [(x, y), (x + math.cos(tilt) * ln, y + math.sin(tilt) * ln), (x + math.cos(tilt + 1.6) * 3, y + math.sin(tilt + 1.6) * 3)], STEEL[k % 3])
    if i >= 3:
        thin(cel, 1.0 - 0.28 * (i - 2), 13)
    rim(cel, ("ink", 1))


# ----------------------------------------------------------------------------------------- Vampiric
def leech_drain(cel: Cel, i: int, t: float) -> None:
    """A hit that feeds it: threads of blood drawn up off the ground into the boss, drops running up them."""
    ax, base = 22, 54
    for k, dx in enumerate((-14, -7, 0, 7, 14)):
        f = (t * 1.2 + k * 0.17) % 1.0
        top = base - 8 - 40 * ease_out(min(1.0, t * 1.5 + 0.2))
        for j in range(int(base - top)):
            y = base - 1 - j
            x = ax + dx * (1.0 - 0.55 * j / max(1, base - top)) + math.sin(j * 0.35 + k) * 1.2
            if (j + i * 3 + k) % 4 != 0:
                cel.put(x, y, ("crimson", 4) if j % 2 else ("crimson", 5))
        y = base - 2 - f * (base - top)
        x = ax + dx * (1.0 - 0.55 * f)
        blob(cel, x, y, 1.6, 2.0, ("crimson", 6))
        cel.put(x, y - 1, ("crimson", 7))
    if i >= 4:
        thin(cel, 0.7 if i == 4 else 0.4, 15)
    rim(cel, ("crimson", 1))


# ----------------------------------------------------------------------------------------- Venomous
VENOM = [("moss", 3), ("moss", 6), ("moss", 8)]


def venom_splash(cel: Cel, i: int, t: float) -> None:
    """A stack of venom lands: a green spatter."""
    cx, cy = 13, 13
    grow = ease_out(t, 1.6)
    if i < 2:
        blob(cel, cx, cy, 4 - i, 3.4 - i, VENOM[1])
        cel.put(cx - 1, cy - 1, VENOM[2])
    rnd = random.Random(19)
    for k in range(9):
        a = math.tau * k / 9 + rnd.random() * 0.4
        sp = (3 + rnd.random() * 8) * grow
        x, y = cx + math.cos(a) * sp, cy + math.sin(a) * sp * 0.85 + t * t * 4
        cel.put(x, y, VENOM[1])
        if k % 2:
            cel.put(x, y - 1, VENOM[2])
    if i >= 3:
        thin(cel, 0.6, 2)
    rim(cel, ("moss", 0))


def venom_drip(cel: Cel, i: int, t: float) -> None:
    """While he is poisoned: sick green bubbles climb off him and burst, drops run down."""
    ax, base = 12, 30
    for k, (dx, off, r) in enumerate(((-7, 0.0, 1.6), (0, 0.35, 2.1), (6, 0.7, 1.4), (-3, 0.55, 1.2))):
        f = (t + off) % 1.0
        x, y = ax + dx + math.sin(f * 6 + k) * 1.4, base - 8 - f * 18
        if f < 0.85:
            ring(cel, x, y, r, r, VENOM[1])
            cel.put(x - 0.6, y - 0.6, VENOM[2])
        else:  # it bursts
            for a in (0.4, 2.0, 3.6, 5.2):
                cel.put(x + math.cos(a) * (r + 1.5), y + math.sin(a) * (r + 1.5), VENOM[2])
    for k, (dx, off) in enumerate(((-5, 0.1), (4, 0.6))):
        f = (t + off) % 1.0
        y = base - 14 + f * 12
        cel.put(ax + dx, y, VENOM[1])
        cel.put(ax + dx, y - 1, VENOM[0])
    rim(cel, ("moss", 0))


# ----------------------------------------------------------------------------------------- Deadeye
def deadeye_mark(cel: Cel, i: int, t: float) -> None:
    """The sight closing on the hero the boss has picked: a ring that shrinks onto him, four ticks, a flash."""
    cx, cy = 15, 15
    r = 11 - 6 * ease_out(t, 1.8)
    ring(cel, cx, cy, r, r, ("brass", 6) if i < 4 else LIGHT, thick=1.0)
    for a in (0, 90, 180, 270):
        ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
        streak(cel, (cx + ca * (r - 2), cy + sa * (r - 2)), (cx + ca * (r + 3), cy + sa * (r + 3)), [("crimson", 6)])
    cel.put(cx, cy, ("crimson", 6))
    if i >= 4:
        spark(cel, cx, cy, 3 if i == 4 else 1, LIGHT, ("crimson", 6))
    rim(cel, ("crimson", 1))


def shot_crow(cel: Cel, i: int, t: float) -> None:
    """The Crowmother's: one of her crows stooping like a thrown knife, wings swept back."""
    rows = [
        "hhhh...........",
        ".hHHHhh........",
        "tt.hHHHBBbb....",
        ".ttBBBBBvBEbgg.",
        "tt.hHHHBBbb....",
        ".hHHHhh........",
        "hhhh...........",
    ] if i % 2 == 0 else [
        "...............",
        "hhhHHhh........",
        "tt.hHHHBBbb....",
        ".ttBBBBBvBEbgg.",
        "tt.hHHHBBbb....",
        "hhhHHhh........",
        "...............",
    ]
    cel.stamp(rows, CROW, 6, 4)
    rim(cel, ("ink", 0))
    for k in range(3):  # a feather or two torn off behind it
        cel.put(4 - k * 2 + (i % 2), 4 + (k * 3 + i) % 7, ("ink", 5))


def shot_thorn(cel: Cel, i: int, t: float) -> None:
    """Mistletoe's (and the Warden's): a long thorn off the bough, a sprig and a white berry still on it."""
    y, hx = 5, 21
    for s in range(16):
        cel.put(hx - s, y + (1 if 5 < s < 11 and i == 1 else 0), ("bone", 7) if s < 3 else ("leather", 5) if s < 12 else ("moss", 5))
    cel.put(hx - 2, y - 1, ("bone", 5))
    cel.put(hx - 2, y + 1, ("bone", 5))
    for dx, dy, tone in ((-12, -2, ("moss", 6)), (-13, -3, ("moss", 7)), (-13, 2, ("moss", 6)), (-14, 3, ("moss", 7)), (-10, 2, LIGHT), (-9, -2, ("bone", 7))):
        cel.put(hx + dx, y + dy, tone)
    rim(cel, ("ink", 1))


def shot_moon(cel: Cel, i: int, t: float) -> None:
    """The Drowned Moon's: a sickle of cold moonlight turning as it flies, water coming off it."""
    cx, cy = 14, 9
    a0 = 360 * t
    ring(cel, cx, cy, 6, 6, ("azure", 8), a0=a0 - 110, a1=a0 + 110, thick=2.4)
    ring(cel, cx, cy, 6, 6, LIGHT, a0=a0 - 60, a1=a0 + 60, thick=1.2)
    for k in range(4):
        cel.put(cx - 8 - k * 2, cy + ((k * 5 + i * 3) % 7) - 3, ("sea", 7) if k % 2 else ("azure", 6))
    rim(cel, ("azure", 1))


def shot_sickle(cel: Cel, i: int, t: float) -> None:
    """The Harvest King's: his sickle thrown, turning end over end, chaff flying off it."""
    cx, cy = 13, 9
    a0 = 360 * t
    ring(cel, cx, cy, 6, 6, ("ink", 8), a0=a0, a1=a0 + 200, thick=2.0)
    ring(cel, cx, cy, 6, 6, LIGHT, a0=a0 + 60, a1=a0 + 150, thick=1.0)
    a = math.radians(a0)
    streak(cel, (cx + math.cos(a) * 6, cy + math.sin(a) * 6), (cx + math.cos(a) * 1, cy + math.sin(a) * 1), [("leather", 5), ("leather", 3)])
    for k in range(3):
        cel.put(cx - 9 - k * 2, cy + ((k * 4 + i * 3) % 7) - 3, ("brass", 6))
    rim(cel, ("ink", 1))


def shot_wisp(cel: Cel, i: int, t: float) -> None:
    """The Ferryman's: a drowned light off his lantern, trailing marsh-fire."""
    hx, y = 17, 7
    rnd = random.Random(96 + i)
    for s in range(14):
        f = s / 14
        up = int(round((1 - f) * 2.4 * (0.5 + 0.7 * rnd.random())))
        for d in range(-up, up + 1):
            cel.put(hx - 3 - s, y + d, ("sea", 7) if f < 0.35 and abs(d) <= 1 else ("sea", 5) if f < 0.7 else ("sea", 3))
    blob(cel, hx, y, 3.2, 3.2, ("sea", 6))
    blob(cel, hx, y, 1.8, 1.8, ("sea", 8))
    cel.put(hx, y - 1, LIGHT)
    rim(cel, ("sea", 0))


def shot_deadeye(cel: Cel, i: int, t: float) -> None:
    """Any other boss's: a hard red bolt with a brass point."""
    y, hx = 6, 21
    for s in range(17):
        f = s / 17
        cel.put(hx - s, y, LIGHT if s < 2 else ("brass", 6) if s < 5 else ("crimson", 6) if f < 0.7 else ("crimson", 4))
        if 2 <= s < 9:
            cel.put(hx - s, y - 1, ("crimson", 5))
            cel.put(hx - s, y + 1, ("crimson", 5))
    cel.put(hx - 2, y - 2, ("brass", 6))
    cel.put(hx - 2, y + 2, ("brass", 6))
    cel.put(hx - 12 - (i % 2) * 2, y - 2, ("crimson", 6))
    cel.put(hx - 15 + (i % 2) * 2, y + 2, ("crimson", 5))
    rim(cel, ("crimson", 1))


# ----------------------------------------------------------------------------------------- Seismic
def seismic_tremor(cel: Cel, i: int, t: float) -> None:
    """While a Seismic boss fights: the ground at its feet never rests — low dust, pebbles hopping. Kept under a
    hand high, so it hides neither its cast bar nor the fighters."""
    ax, base = 15, 10
    for k, (dx, off) in enumerate(((-11, 0.0), (-4, 0.45), (3, 0.2), (10, 0.7))):
        f = (t + off) % 1.0
        hop = math.sin(f * math.pi)
        cel.put(ax + dx + f * 2 - 1, base - 1 - hop * (4 + k % 2 * 2), ("leather", 5) if k % 2 else ("bone", 5))
        if hop > 0.6:
            cel.put(ax + dx + f * 2 - 1, base - hop * 3, ("leather", 3))
    for k, (dx, off) in enumerate(((-8, 0.1), (0, 0.6), (8, 0.35))):
        f = (t + off) % 1.0
        r = 1.2 + f * 2.2
        if f < 0.75:
            blob(cel, ax + dx, base - 1 - f * 2.5, r * 1.3, r * 0.6, ("bone", 4) if f < 0.4 else ("bone", 3))
    for x in range(-13, 14):
        if (x * 5 + i * 3) % 9 == 0:
            cel.put(ax + x, base, ("leather", 2))
    rim(cel, ("ink", 1))


# ----------------------------------------------------------------------------------------- Culpa
GUILT = [("crimson", 3), ("crimson", 5), ("crimson", 7)]
_BRAND = [
    ".rr.......rr.",
    "rRRr.....rRRr",
    "rR.rr...rr.Rr",
    ".rr.rRRRr.rr.",
    "....rRRRr....",
    "...rRyRyRr...",
    "...rRRRRRr...",
    "....rRRRr....",
    "....rRrRr....",
    ".....rRr.....",
]


def _brand(cel: Cel, x: float, y: float, hot: int) -> None:
    """The Scapegoat's brand: a horned head, in iron heated to `hot` (0 dull … 2 white)."""
    legend = {"r": GUILT[min(2, hot)], "R": GUILT[min(2, hot + 1)], "y": LIGHT if hot >= 1 else ("brass", 6)}
    cel.stamp(_BRAND, legend, x - 6, y - 5)


def warn_guilt(cel: Cel, i: int, t: float) -> None:
    """While the Scapegoat chooses: the brand hangs dim over every hero's head, flickering — it may be him."""
    cx, cy = 12, 9
    if i % 3 != 2:
        _brand(cel, cx, cy, 0)
        rim(cel, ("crimson", 1))
    for k in range(2):
        f = (t + k / 2) % 1.0
        cel.put(cx - 4 + k * 8, cy + 6 + f * 5, ("crimson", 6) if f < 0.5 else ("crimson", 4))


def guilt_fall(cel: Cel, i: int, t: float) -> None:
    """The mark is laid: the brand comes down white-hot and is pressed onto him — a ring of red where it lands."""
    cx, cy = 20, 36
    drop = ease_in(min(1.0, t * 2.2), 1.6)
    y = cy - 30 * (1.0 - drop)
    if i < 3:
        streak(cel, (cx, y - 6), (cx, max(0, y - 24)), [LIGHT, ("crimson", 6), ("crimson", 4)])
    _brand(cel, cx, y, 2 if i < 4 else 1)
    if i >= 2:
        r = 6 + (i - 2) * 4
        ring(cel, cx, cy, r, r * 0.8, ("crimson", 6) if i < 5 else ("crimson", 4), thick=1.6, gap=lambda a: int(a / 20) % 3 == 0 and i > 3)
    if i == 2:
        spark(cel, cx, cy, 5, LIGHT, ("crimson", 7))
    rim(cel, ("crimson", 1))


def guilt_brand(cel: Cel, i: int, t: float) -> None:
    """While he is marked: the brand glows on him, embers climbing off it."""
    cx, cy = 13, 14
    _brand(cel, cx, cy, 1 if i % 4 < 2 else 0)
    rim(cel, ("crimson", 1))
    for k in range(3):
        f = (t + k / 3) % 1.0
        cel.put(cx - 5 + k * 5 + math.sin(f * 6 + k) * 1.5, cy - 6 - f * 7, ("brass", 6) if f < 0.4 else ("crimson", 6))


def guilt_pang(cel: Cel, i: int, t: float) -> None:
    """The mark takes its toll: a red jolt cracking out of the brand."""
    cx, cy = 13, 13
    for k in range(5):
        a = math.tau * k / 5 + 0.4
        r = 4 + 8 * ease_out(t)
        _zig(cel, (cx + math.cos(a) * 3, cy + math.sin(a) * 3), (cx + math.cos(a) * r, cy + math.sin(a) * r), 120 + k + i, 1.6, tones=[("crimson", 7), ("crimson", 6), ("crimson", 4)], thick=False)
    if i == 0:
        spark(cel, cx, cy, 3, LIGHT, ("crimson", 7))
    if i >= 2:
        thin(cel, 0.6 if i == 2 else 0.35, 23)
    rim(cel, ("crimson", 1))


# ----------------------------------------------------------------------------------------- Silencio dorado
GOLD = [("brass", 4), ("brass", 6), ("brass", 7)]


def warn_gild(cel: Cel, i: int, t: float) -> None:
    """While the Abbot draws breath for it: rings of gold climb round him, one after another, widening."""
    cx, base = 44, 124
    for k in range(4):
        f = (t + k / 4) % 1.0
        r = 16 + 24 * f
        y = base - 6 - f * 108
        tone = GOLD[2] if f < 0.3 else GOLD[1] if f < 0.7 else GOLD[0]
        ring(cel, cx, y, r, r * 0.26, tone, thick=1.8 - f, gap=lambda a, kk=k, ff=f: int((a + kk * 30) / 24) % 4 == 0 and ff > 0.5)
    for k in range(6):
        f = (t + k / 6) % 1.0
        x = cx - 30 + k * 12 + math.sin(f * 5 + k) * 3
        spark(cel, x, base - 12 - f * 96, 1 if k % 2 else 2, LIGHT, GOLD[1])
    rim(cel, ("brass", 2))


def gild_toll(cel: Cel, i: int, t: float) -> None:
    """It tolls: a wide ring of gold thrown out from the Abbot, rays standing in it."""
    cx, cy = 100, 40
    grow = ease_out(t, 1.7)
    r = 14 + 82 * grow
    ring(cel, cx, cy, r, r * 0.36, GOLD[2] if i < 3 else GOLD[1], thick=3.2 - 2.4 * t)
    ring(cel, cx, cy, r * 0.7, r * 0.7 * 0.36, GOLD[1] if i < 4 else GOLD[0], thick=1.6, gap=lambda a: int(a / 15) % 2 == 0)
    if i < 3:
        blob(cel, cx, cy, 12 - i * 4, 7 - i * 2, GOLD[2])
        blob(cel, cx, cy, 7 - i * 2.5, 4 - i * 1.2, LIGHT)
    for k in range(12):
        a = math.tau * k / 12
        ca, sa = math.cos(a), math.sin(a) * 0.36
        streak(cel, (cx + ca * r * 0.8, cy + sa * r * 0.8 - 2), (cx + ca * r * 0.8, cy + sa * r * 0.8 - 2 - 10 * (1 - t)), [LIGHT, GOLD[2], GOLD[1]])
    if i >= 4:
        thin(cel, 1.0 - 0.3 * (i - 3), 27)
    rim(cel, ("brass", 2))


def _dial(cel: Cel, cx: float, cy: float, r: float, lit: int) -> None:
    """A clock face of gold wire: a ring, twelve marks, two hands — standing still."""
    ring(cel, cx, cy, r, r, GOLD[1])
    for k in range(12):
        a = math.tau * k / 12
        cel.put(cx + math.cos(a) * (r - 2), cy + math.sin(a) * (r - 2), LIGHT if k == lit % 12 else GOLD[2] if k % 3 == 0 else GOLD[0])
    streak(cel, (cx, cy), (cx + 0.5, cy - r + 4), [GOLD[2]])
    streak(cel, (cx, cy), (cx + r - 6, cy + 1), [GOLD[1]])
    cel.put(cx, cy, LIGHT)


def gild_lock(cel: Cel, i: int, t: float) -> None:
    """The silence closes on a hero: a ring of gold shrinks onto him and stops, a dial clicking still."""
    cx, cy = 20, 30
    r = 22 - 9 * ease_out(t, 1.8)
    ring(cel, cx, cy, r, r, GOLD[2] if i < 3 else GOLD[1], thick=1.8 - t)
    if i >= 3:
        _dial(cel, cx, cy, 13, i)
    if i == 3:
        spark(cel, cx, cy - 13, 4, LIGHT, GOLD[2])
    rim(cel, ("brass", 2))


def gilded_halo(cel: Cel, i: int, t: float) -> None:
    """While his cooldowns stand still: a dial of gold wire hangs behind him, its hands stopped, motes frozen in
    the air — only a glint goes round the rim."""
    cx, cy = 20, 30
    _dial(cel, cx, cy, 13, i)
    for k, (dx, dy) in enumerate(((-15, -12), (15, -6), (-13, 10), (14, 14), (0, -19))):
        cel.put(cx + dx, cy + dy, LIGHT if (k + i) % 4 == 0 else GOLD[1])
    rim(cel, ("brass", 2))


# ----------------------------------------------------------------------------------------- Resaca
# The sea of the Ninth Wave: navy water (the boss's own blue, and world 6's), foam the colour of bone.
NAVY = [("azure", 1), ("azure", 2), ("azure", 3), ("azure", 4), ("azure", 6)]
FOAM = ("bone", 7)
SPRAY = ("bone", 6)


def _tide(cel: Cel, i: int, hot: bool) -> None:
    """The path going under: dark water sliding in over it, low — deeper, and breaking white, when the wave is near."""
    base = 13 if hot else 9
    depth = 4 if hot else 2
    for x in range(24):
        top = base - depth - (1.4 if hot else 0.7) * math.sin((x + i * 4) * 0.52)
        for y in range(int(round(top)), base + 1):
            f = (y - top) / max(1.0, base - top)
            if f > 0.55 and (x + y) % 2 == 0:
                continue  # thin water: the path shows through
            cel.put(x, y, NAVY[4] if f < 0.2 else NAVY[3] if f < 0.5 else NAVY[2])
        if (x + i * 3) % (5 if hot else 7) < (2 if hot else 1):
            cel.put(x, top - 1, FOAM)
            if hot:
                cel.put(x + 1, top - 2, LIGHT if (x + i) % 3 == 0 else SPRAY)
    rim(cel, ("azure", 0))


def warn_tide(cel: Cel, i: int, t: float) -> None:
    _tide(cel, i, False)


def warn_tide_hot(cel: Cel, i: int, t: float) -> None:
    _tide(cel, i, True)


def _foam_lump(cel: Cel, x: float, y: float, r: float, seed: int) -> None:
    """A lump of foam: a few bubbles heaped together, bright on top, a blue shadow under it."""
    rnd = random.Random(seed)
    for k in range(4):
        bx, by = x + (rnd.random() - 0.5) * r * 1.6, y - rnd.random() * r * 0.6
        br = r * (0.45 + 0.4 * rnd.random())
        blob(cel, bx, by + 1, br, br * 0.8, NAVY[4])
        blob(cel, bx, by, br, br * 0.8, SPRAY if k % 2 else FOAM)
        cel.put(bx - br * 0.4, by - br * 0.4, LIGHT)


def undertow_surge(cel: Cel, i: int, t: float) -> None:
    """Where the Ninth Wave lets it go: the sea heaves up at its feet in ragged tongues and falls forward in foam."""
    ax, base = 64, 26
    grow = ease_out(t, 1.6)
    swell = math.sin(min(1.0, t * 1.35) * math.pi)
    rnd = random.Random(61)
    for k in range(9):
        dx = (k - 4) * 12 * (0.5 + 0.5 * grow) + rnd.random() * 3
        h = (9 + rnd.random() * 15) * swell * (1.0 - abs(k - 4) / 6)
        lean = (k - 4) * 0.25
        for j in range(int(h)):
            f = j / max(1.0, h)
            w = 4.2 * (1 - f) ** 0.8 + 0.8
            for d in range(int(-w), int(w) + 1):
                tone = NAVY[4] if d <= -w * 0.4 else NAVY[3] if d < w * 0.3 else NAVY[2]
                cel.put(ax + dx + d + lean * j, base - j, tone)
        if h > 3:
            _foam_lump(cel, ax + dx + lean * h, base - h, 2.2, 70 + k)
    for k in range(12):
        a = math.pi * (1.02 + 0.96 * rnd.random())
        sp = (12 + rnd.random() * 30) * grow
        cel.put(ax + math.cos(a) * sp * 1.7, base - 3 + math.sin(a) * sp * 0.7 + t * t * 11, FOAM if k % 3 else LIGHT)
    for x in range(-54, 55):  # the sheet of water running out along the ground
        reach = 18 + 38 * grow
        if abs(x) < reach and (x * 3 + i) % 5 != 0:
            cel.put(ax + x, base + 2 + (1 if abs(x) > reach * 0.7 else 0), FOAM if (x + i) % 4 == 0 else NAVY[3])
    if i >= 5:
        thin(cel, 0.62 if i == 5 else 0.36, 29)
    rim(cel, ("azure", 0))


# The wave's outline, travelling right: (x, height above the path). A long back climbing to the crest, the lip
# curling over and down to its tip, the hollow under it, and the steep face sweeping forward to its foot.
_WAVE_BACK = [(0, 0), (6, 3), (12, 8), (18, 15), (23, 23), (27, 31), (30, 38), (33, 44), (36, 48), (40, 50)]
_WAVE_LIP = [(40, 50), (44, 50), (47, 48), (50, 45), (52, 41), (53, 37)]  # the top of the curl, to its tip
_WAVE_UNDER = [(53, 37), (51, 38), (48, 41), (45, 42), (42, 41), (40, 38), (39, 33), (39, 26), (40, 18), (42, 10), (45, 4), (49, 0)]


def _surface(x: float) -> float:
    """Height of the wave's top surface at column x (its back, then the top of the curl)."""
    pts = _WAVE_BACK + _WAVE_LIP[1:]
    for (x0, h0), (x1, h1) in zip(pts, pts[1:]):
        if x0 <= x <= x1:
            return h0 + (h1 - h0) * (x - x0) / max(1e-6, x1 - x0)
    return 0.0


def undertow_front(cel: Cel, i: int, t: float) -> None:
    """The wave itself, as tall as a hero, running through the party (drawn going right): a long dark back with
    lines of foam riding up it, a crest that curls over into a white lip with a hollow of deep water under it,
    foam boiling at its foot and spray torn off the top. Thin where the water is thin: the world shows through."""
    base = 62
    curl = (0.0, 1.0, 2.0, 1.0)[i]  # the lip works forward and back as it runs
    lip = [(x + (curl if k >= 2 else 0), h - (curl * 0.6 if k >= 3 else 0)) for k, (x, h) in enumerate(_WAVE_LIP)]
    under = [(x + (curl if k < 3 else 0), h - (curl * 0.6 if k < 2 else 0)) for k, (x, h) in enumerate(_WAVE_UNDER)]
    outline = [(x, base - h) for x, h in _WAVE_BACK + lip[1:] + under[1:]]
    for (x, y) in cel.poly_mask(outline):
        h = base - y
        depth = _surface(x) - h
        in_face = x >= 38 and h < 38  # the wall under the lip: it stands in its own shadow
        if in_face:
            tone = NAVY[0] if x < 41 else NAVY[1] if (x + h) % 5 else NAVY[2]
        elif depth < 1.5:
            tone = NAVY[4]
        elif depth < 5:
            tone = NAVY[3]
        elif depth < 14:
            tone = NAVY[2]
        else:
            tone = NAVY[1]
        # thin water lets the world through: the low run-up of the back, in a checker
        if not in_face and h < 7 and x < 22 and (x + y) % 2 == 0:
            continue
        cel.put(x, y, tone)
    # lines of foam riding up the back, following its curve, broken and sliding with the frames
    for x in range(4, 40):
        for band, gap in ((4, 6), (10, 8), (17, 9)):
            h = _surface(x) - band
            if h > 2 and (x + i * 2 + band) % gap < gap - 3:
                cel.put(x, base - h, SPRAY if (x + band) % 3 else FOAM)
    # sheets of light down the face
    for h in range(4, 34, 2):
        fx = 41 + (4 if h < 10 else 1 if h < 20 else 0) + (i % 2)
        cel.put(fx + (10 - h) * 0.25 if h < 10 else fx, base - h, NAVY[3])
    # the crest and the lip: a thick cap of foam, brightest where it breaks
    for x in range(26, 41):
        h = _surface(x)
        cel.put(x, base - h, FOAM)
        if x > 30:
            cel.put(x, base - h - 1, LIGHT if (x + i) % 3 == 0 else FOAM)
        if x > 33:
            cel.put(x, base - h + 1, SPRAY)
    for k, ((x0, h0), (x1, h1)) in enumerate(zip(lip, lip[1:])):
        streak(cel, (x0, base - h0), (x1, base - h1), [FOAM])
        streak(cel, (x0, base - h0 + 1), (x1, base - h1 + 1), [FOAM if k < 3 else LIGHT])
        streak(cel, (x0, base - h0 + 2), (x1 - 1, base - h1 + 2), [SPRAY])
    tip = lip[-1]
    _foam_lump(cel, tip[0], base - tip[1] + 1, 2.4, 80 + i)
    for k in range(5):  # what falls off the lip
        f = ((i / 4) + k / 5) % 1.0
        cel.put(tip[0] - 1 + f * 3 + (k % 2), base - tip[1] + 4 + f * 12 + k * 2, FOAM if k % 2 else LIGHT)
    for k in range(7):  # spray torn off the crest, blown back
        f = ((i / 4) + k / 7) % 1.0
        cel.put(36 - k * 3 - f * 6, base - 51 - (k % 3) * 2 - f * 4, SPRAY if k % 2 else FOAM)
    # foam boiling at the foot, and the thin white edge of the water running ahead and behind
    for k, x in enumerate((43, 47, 51)):
        _foam_lump(cel, x + (i + k) % 2, base - 1 - (k % 2), 2.6 - k * 0.3, 90 + k * 3 + i)
    for x in range(0, 56):
        if (x + i * 3) % 5 != 0:
            cel.put(x, base, FOAM if (x + i) % 3 == 0 else SPRAY if x % 2 else NAVY[3])
    rim(cel, ("azure", 0))


def undertow_trail(cel: Cel, i: int, t: float) -> None:
    """What the wave leaves on the path: lumps of foam sliding back with the water and sinking away."""
    ax, base = 13, 20
    for k in range(4):
        x = -9 + k * 6 - t * 5
        r = 2.3 * (1.0 - t * 0.8) + 0.5
        _foam_lump(cel, ax + x, base - 1, r, 40 + k)
    for x in range(-12, 13):
        if (x + i * 2) % 3 == 0:
            cel.put(ax + x - t * 5, base, NAVY[3] if x % 2 else SPRAY)
    if i >= 2:
        thin(cel, 1.0 - 0.26 * (i - 1), 31)
    rim(cel, ("azure", 0))


def undertow_splash(cel: Cel, i: int, t: float) -> None:
    """The wave breaking round a hero's legs: a crown of water thrown up, foam where it falls."""
    ax, base = 15, 20
    grow = ease_out(t, 1.5)
    rnd = random.Random(63)
    for k in range(7):  # the crown: short tongues leaning out
        a = math.pi * (1.1 + 0.8 * k / 6)
        ln = (4 + rnd.random() * 7) * math.sin(min(1.0, t * 1.5) * math.pi)
        for s in range(int(ln)):
            f = s / max(1.0, ln)
            cel.put(ax + math.cos(a) * (3 + s) , base - 1 + math.sin(a) * (2 + s) * 1.1, NAVY[4] if f < 0.4 else NAVY[3] if f < 0.8 else FOAM)
    for k in range(9):
        a = math.pi * (1.05 + 0.9 * rnd.random())
        sp = (5 + rnd.random() * 10) * grow
        x, y = ax + math.cos(a) * sp, base - 2 + math.sin(a) * sp * 1.2 + t * t * 8
        cel.put(x, min(base, y), FOAM if k % 3 else LIGHT)
    if i < 4:
        _foam_lump(cel, ax - 5 - grow * 3, base - 1, 2.0, 50)
        _foam_lump(cel, ax + 5 + grow * 3, base - 1, 2.0, 51)
    if i >= 3:
        thin(cel, 0.65, 33)
    rim(cel, ("azure", 0))


# ----------------------------------------------------------------------------------------- Esporas
PALE = [("bone", 4), ("bone", 6), ("bone", 7)]
_CAP_BIG = [
    "...wWWw...",
    ".wWWWWWWw.",
    "wWWoWWWWWw",
    "wWWWWWoWWw",
    ".ggwggwgg.",
    "...sSSs...",
    "...sSSs...",
    "...sSSs...",
    "..ssSSss..",
]
_CAP_MID = [
    "..wWWw.",
    ".wWWWWw",
    "wWoWWWw",
    ".gwggw.",
    "..sSs..",
    "..sSs..",
    ".ssSss.",
]
_CAP_SMALL = [
    ".wWw.",
    "wWWWw",
    ".gsg.",
    ".sSs.",
]
SHROOM = {"W": LIGHT, "w": ("bone", 7), "o": ("bone", 5), "g": ("bone", 4), "s": ("bone", 5), "S": ("bone", 7)}
WITHERED = {"W": ("bone", 5), "w": ("bone", 4), "o": ("bone", 3), "g": ("bone", 2), "s": ("bone", 3), "S": ("bone", 4)}


def _shroom(cel: Cel, rows: list[str], x: float, base: float, grow: float = 1.0, lean: float = 0.0, legend=SHROOM) -> None:
    """A destroying angel standing on `base` (its foot at x): `grow` 0…1 lets it come up out of the ground."""
    n = len(rows)
    show = max(0, min(n, int(round(n * grow))))
    if show == 0:
        return
    cel.stamp(rows[:show], legend, x - len(rows[0]) / 2, base - show + 1, shear=lean)


def _motes(cel: Cel, cx: float, base: float, t: float, n: int, spread: float, rise: float, seed: int) -> None:
    """Spores hanging in the air: pale specks that climb in slow curls."""
    rnd = random.Random(seed)
    for k in range(n):
        f = (t + rnd.random()) % 1.0
        x = cx + (rnd.random() - 0.5) * 2 * spread + math.sin(f * 6.3 + k) * 2.2
        y = base - f * rise
        cel.put(x, y, LIGHT if k % 3 == 0 else ("bone", 7) if k % 3 == 1 else ("moss", 8))


def _cloud(cel: Cel, cx: float, cy: float, r: float, seed: int) -> None:
    """A billow of spore dust: lumps heaped on one another, lit from above, hollow and speckled at its edge."""
    rnd = random.Random(seed)
    lumps = [(cx + (rnd.random() - 0.5) * r * 1.5, cy + (rnd.random() - 0.5) * r * 0.8, r * (0.45 + 0.35 * rnd.random())) for _ in range(6)]
    for x, y, lr in lumps:
        blob(cel, x, y + 1.5, lr, lr * 0.85, PALE[0])
    for x, y, lr in lumps:
        blob(cel, x, y, lr, lr * 0.85, PALE[1])
    for x, y, lr in lumps:
        blob(cel, x - lr * 0.25, y - lr * 0.3, lr * 0.55, lr * 0.45, PALE[2])
    for k in range(int(r * 3)):  # the edge breaks up into specks
        a = rnd.random() * math.tau
        d = r * (0.9 + 0.5 * rnd.random())
        cel.put(cx + math.cos(a) * d * 1.3, cy + math.sin(a) * d * 0.8, PALE[2] if k % 2 else ("moss", 8))


def warn_spores(cel: Cel, i: int, t: float) -> None:
    """While the Angel swells to loose them: billows of spore dust climb round her, one after another."""
    cx, base = 60, 116
    for k in range(4):
        f = (t + k / 4) % 1.0
        side = -1 if k % 2 else 1
        x = cx + side * (16 + 22 * f) + math.sin(f * 5 + k) * 4
        y = base - 10 - f * 86
        _cloud(cel, x, y, 5 + 7 * math.sin(f * math.pi), 300 + k * 7 + int(f * 3))
    _motes(cel, cx, base - 6, t, 26, 44, 100, 310)
    rim(cel, ("bone", 1))


def spore_land(cel: Cel, i: int, t: float) -> None:
    """A layer settles on a hero: a billow sinks onto him, breaks, and the first caps push up at his feet."""
    ax, base = 19, 40
    fall = ease_in(min(1.0, t * 1.6), 1.4)
    if i < 5:
        _cloud(cel, ax, base - 34 + 22 * fall, 7 - i * 0.9, 320 + i)
    up = ease_out(max(0.0, t * 1.5 - 0.5), 1.5)
    _shroom(cel, _CAP_MID, ax - 9, base - 1, up)
    _shroom(cel, _CAP_SMALL, ax + 9, base - 1, up)
    _motes(cel, ax, base - 2, t, 10, 12, 30, 321)
    rim(cel, ("bone", 1))


def spores_grow(cel: Cel, i: int, t: float) -> None:
    """While the spores are on him: destroying angels stand at his feet and have taken root on him, nodding,
    and their dust keeps climbing off him."""
    ax, base = 19, 38
    sway = math.sin(math.tau * t)
    _shroom(cel, _CAP_BIG, ax - 10, base - 1, lean=sway * 0.08)
    _shroom(cel, _CAP_MID, ax + 10, base - 1, lean=-sway * 0.1)
    _shroom(cel, _CAP_SMALL, ax + 3, base - 1)
    _shroom(cel, _CAP_SMALL, ax - 4, base - 17 + (1 if sway > 0.5 else 0))  # one on his belt
    _shroom(cel, _CAP_SMALL, ax + 6, base - 27 + (1 if sway < -0.5 else 0))  # one on his shoulder
    rim(cel, ("bone", 1))
    _motes(cel, ax, base - 4, t, 9, 13, 32, 330)


def spore_wither(cel: Cel, i: int, t: float) -> None:
    """A heal has cleared them: the caps go grey, sag and fall to dust that blows away."""
    ax, base = 19, 40
    sag = ease_in(t, 1.5)
    if i < 4:
        _shroom(cel, _CAP_BIG, ax - 10, base - 1, 1.0 - sag * 0.7, lean=0.25 * sag, legend=WITHERED)
        _shroom(cel, _CAP_MID, ax + 10, base - 1, 1.0 - sag * 0.7, lean=-0.3 * sag, legend=WITHERED)
        _shroom(cel, _CAP_SMALL, ax + 3, base - 1, 1.0 - sag, legend=WITHERED)
    rnd = random.Random(340)
    for k in range(16):
        a = math.pi * (1.0 + rnd.random())
        sp = (4 + rnd.random() * 14) * ease_out(t)
        cel.put(ax + math.cos(a) * sp + t * 6, base - 8 + math.sin(a) * sp * 0.9, PALE[0] if k % 2 else PALE[1])
    if i >= 3:
        thin(cel, 1.0 - 0.3 * (i - 2), 41)
    rim(cel, ("bone", 1))


# ----------------------------------------------------------------------------------------- Hoja al rojo
HOT = [("crimson", 3), ("crimson", 5), ("brass", 5), ("brass", 7)]
FIRE = [("crimson", 4), ("crimson", 6), ("brass", 6)]
FIRE_HOT = [("crimson", 5), ("brass", 6), ("light", 0)]  # the forge's own fire: white at the heart, so it shows on a red world
# The Quench's blade, point up: a broad curved edge, white where it is hottest (the point), cooling to dull red
# towards the tang.
_BLADE = [
    "....w....",
    "...wWy...",
    "...wWy...",
    "..wWWyo..",
    "..wWYyo..",
    "..wYYyo..",
    ".wYYYyoo.",
    ".wYYyyor.",
    ".wYyyoor.",
    ".yYyyoor.",
    ".yyyooor.",
    ".yyoooRr.",
    ".yoooRRr.",
    ".ooooRRr.",
    ".oooRRRr.",
    ".ooRRRrr.",
]
BLADE = {"w": LIGHT, "W": ("brass", 7), "Y": ("brass", 6), "y": ("brass", 5), "o": ("crimson", 6), "R": ("crimson", 4), "r": ("crimson", 3)}


def _seam(cel: Cel, ax: float, base: float, heat: float, i: int, half: int = 15) -> None:
    """A split in the path with the forge showing through it: dark lips, a core that goes from dull red to white
    as `heat` goes 0…1, and the stone glowing either side."""
    rnd = random.Random(5)
    y = base
    for x in range(-half, half + 1):
        if x % 4 == 0:
            y = base + rnd.randint(-1, 1)
        edge = abs(x) / half
        core = HOT[min(3, int(heat * 3.99 * (1.0 - edge * 0.6)))]
        cel.put(ax + x, y, core if (x * 3 + i * 5) % 13 else HOT[3])
        cel.put(ax + x, y + 1, HOT[0] if edge < 0.8 else ("ink", 1))
        if edge < 0.75 and heat > 0.35 and (x + i) % 3 == 0:
            cel.put(ax + x, y - 1, HOT[1] if heat < 0.7 else HOT[2])
        if edge > 0.9:
            cel.put(ax + x, y, ("ink", 1))


def warn_blade(cel: Cel, i: int, t: float) -> None:
    """While the Quench draws the blade: the path splits under a hero and the seam heats, pulse by pulse, heat
    shimmering off it."""
    ax, base = 28, 16
    heat = 0.55 + 0.45 * (0.5 - 0.5 * math.cos(math.tau * t))
    _seam(cel, ax, base, heat, i, half=24)
    for x in range(-18, 19):  # the heart of the split, white as it peaks
        if heat > 0.8 and (x + i) % 2 == 0:
            cel.put(ax + x, base - 1, LIGHT)
    for k in range(7):
        f = (t + k / 7) % 1.0
        x = ax - 20 + k * 6.6 + math.sin(f * 7 + k) * 1.2
        cel.put(x, base - 3 - f * 11, LIGHT if f < 0.25 else HOT[3] if f < 0.5 else HOT[1] if f < 0.8 else HOT[0])
        cel.put(x, base - 2 - f * 11, HOT[2] if f < 0.5 else HOT[0])
    rim(cel, ("crimson", 1))


def blade_ignite(cel: Cel, i: int, t: float) -> None:
    """It strikes: the red-hot blade drives up through the seam under him, stands a moment, and sinks back —
    leaving the ground alight."""
    ax, base = 20, 44
    up = (0.35, 0.8, 1.0, 1.0, 0.7, 0.35, 0.0)[i]
    show = int(round(len(_BLADE) * up))
    if show > 0:
        cel.stamp(_BLADE[:show], BLADE, ax - 4, base - 2 - show)
    _seam(cel, ax, base - 2, 1.0, i)
    if i in (1, 2):
        spark(cel, ax, base - 4 - show, 4 if i == 1 else 2, LIGHT, ("brass", 7))
    rnd = random.Random(52)
    for k in range(10):  # sparks thrown out of the split
        a = math.pi * (1.1 + 0.8 * rnd.random())
        sp = (5 + rnd.random() * 15) * ease_out(t, 1.4)
        cel.put(ax + math.cos(a) * sp, base - 4 + math.sin(a) * sp + t * t * 12, HOT[3] if k % 3 == 0 else HOT[2] if k % 3 == 1 else HOT[1])
    if i >= 3:
        for k, (dx, h) in enumerate(((-9, 6), (0, 9), (8, 5))):
            flame(cel, ax + dx, base - 3, h * min(1.0, (i - 2) / 3), 6, FIRE, sway=1.5 * math.sin(i + k), seed=k * 5 + i)
    rim(cel, ("crimson", 1))


def ground_fire(cel: Cel, i: int, t: float) -> None:
    """While the ground burns under him: the seam stays white and fire stands along it, tongues leaning and
    snapping, embers going up."""
    ax, base = 28, 42
    _seam(cel, ax, base, 0.85 + 0.15 * math.sin(math.tau * t), i, half=24)
    for k, (dx, h, w) in enumerate(((-21, 12, 7), (-13, 23, 9), (-5, 16, 8), (4, 29, 10), (13, 19, 9), (21, 11, 7))):
        ph = math.tau * (t + k * 0.23)
        flame(cel, ax + dx, base - 1, h + 3.5 * math.sin(ph), w, FIRE_HOT, sway=2.4 * math.sin(ph + k), seed=k * 7 + i)
    rim(cel, ("crimson", 1))
    for k in range(6):
        f = (t + k / 6) % 1.0
        cel.put(ax - 19 + k * 7.5 + math.sin(f * 9 + k) * 2, base - 18 - f * 20, LIGHT if f < 0.3 else HOT[3] if f < 0.6 else HOT[1])


# ----------------------------------------------------------------------------------------- Balanza
BRASS = [("brass", 2), ("brass", 4), ("brass", 6), ("brass", 7)]
# One pan of the Verdict's scales, hanging on its three chains.
_PAN = [
    ".........c.........",
    ".........C.........",
    "........c.c........",
    "........C.C........",
    ".......c...c.......",
    "......C.....C......",
    ".....c.......c.....",
    "....C.........C....",
    "...c...........c...",
    "..C.............C..",
    ".hHHHGGGGGGGGGGGgg.",
    ".dhHGGGGGGGGGGGggd.",
    "..dhGGGGGGGGGGggd..",
    "...ddggggggggggd...",
    ".....ddddddddd.....",
]
PAN = {"c": ("brass", 4), "C": ("brass", 6), "h": ("brass", 7), "H": LIGHT, "G": ("brass", 6), "g": ("brass", 4), "d": ("brass", 2)}


def warn_scales(cel: Cel, i: int, t: float) -> None:
    """While the Verdict weighs: a pan of its scales hangs over each hero's head, swinging on its chains, a glint
    running round its rim."""
    cx, top = 17, 3
    swing = math.sin(math.tau * t) * 0.1
    dip = 1 if abs(swing) > 0.07 else 0
    cel.stamp(_PAN, PAN, cx - 9, top + dip, shear=swing)
    for y in range(0, top + 1):
        cel.put(cx, y, ("brass", 4) if y % 2 else ("brass", 6))
    g = (i * 2) % 15
    cel.put(cx - 7 + g, top + 10 + dip, LIGHT)
    cel.put(cx - 6 + g, top + 10 + dip, LIGHT)
    rim(cel, ("brass", 1))
    for k in range(3):  # dust shaken off the chains
        f = (t + k / 3) % 1.0
        cel.put(cx - 6 + k * 6, top + 17 + f * 9, ("brass", 6) if f < 0.5 else ("brass", 4))


def scales_fall(cel: Cel, i: int, t: float) -> None:
    """The scales come level: the pan drops on him and takes what he had over the measure — his life goes up out
    of him in red beads, into the pan."""
    cx, cy = 19, 28
    drop = ease_in(min(1.0, t * 2.4), 1.8)
    y = cy - 26 + 18 * drop - (2 if i >= 4 else 0)
    cel.stamp(_PAN, PAN, cx - 9, y - 10)
    if i == 2:
        ring(cel, cx, y + 3, 12, 4, LIGHT, thick=1.4)
    rim(cel, ("brass", 1))
    if i >= 2:
        for k in range(9):  # beads of life climbing into the pan
            f = min(1.0, (i - 2) / 4)
            x = cx + (k - 4) * 3.4 * (1.0 - f * 0.75)
            by = cy + 18 - (k % 3) * 3 - f * (18 + (k % 2) * 3)
            cel.put(x, by, ("crimson", 7) if k % 2 else ("crimson", 6))
            cel.put(x, by + 1, ("crimson", 4))
            if k % 3 == 0:
                cel.put(x + 1, by, ("crimson", 6))
    if i == 6:
        thin(cel, 0.55, 61)


# ----------------------------------------------------------------------------------------- Espejos
GLASS = {"w": LIGHT, "L": ("azure", 8), "a": ("azure", 6), "b": ("azure", 4), "k": ("azure", 2)}
_SHARD_A = [
    "...w...",
    "..wLa..",
    ".wLLab.",
    "wLLLaab",
    ".LLaabk",
    "..aabk.",
    "...bk..",
]
_SHARD_B = [
    "..w..",
    ".wLa.",
    "wLLab",
    ".Lab.",
    "..b..",
]
_SHARD_C = [
    "w..",
    "La.",
    "Lab",
    ".bk",
]
_SHARDS = (_SHARD_A, _SHARD_B, _SHARD_C)


def _shard(cel: Cel, x: float, y: float, which: int, deg: float) -> None:
    rows = _SHARDS[which % 3]
    cel.stamp_rot(rows, GLASS, x, y, len(rows[0]) / 2, len(rows) / 2, deg)


def _pane(cel: Cel, cx: float, cy: float, rx: float, ry: float, i: int, whole: float) -> None:
    """A tall mirror with no frame: a pane of cold glass, a slant of light across it, cracks where it is not yet
    (or no longer) whole. `whole` 0…1: how much of it is there."""
    for y in range(int(cy - ry), int(cy + ry) + 1):
        for x in range(int(cx - rx), int(cx + rx) + 1):
            d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
            if d > 1.0:
                continue
            band = (x - cx) + (y - cy) * 0.5 + i * 2
            tone = LIGHT if -1 <= band % 17 <= 0 and d < 0.8 else ("azure", 8) if band % 17 < 4 else ("azure", 6) if d < 0.55 else ("azure", 4)
            # not whole: it is missing in a scatter that closes as it forms
            if ((x * 7 + y * 13) % 10) / 10 >= whole:
                continue
            cel.put(x, y, tone)
    if whole > 0.6:
        _zig(cel, (cx - rx * 0.5, cy - ry * 0.7), (cx + rx * 0.2, cy + ry * 0.1), 400, 1.6, tones=[("azure", 2), ("azure", 2), ("azure", 2)], thick=False)
        _zig(cel, (cx + rx * 0.2, cy + ry * 0.1), (cx - rx * 0.1, cy + ry * 0.8), 401, 1.6, tones=[("azure", 2), ("azure", 2), ("azure", 2)], thick=False)


def warn_mirror(cel: Cel, i: int, t: float) -> None:
    """While the Unmaker raises it: shards wheel in out of the air and close into a tall mirror before it — the
    party can see itself coming."""
    # The pane hangs ahead of the boss at the height of its chest and head — over the heroes' heads, their bars
    # and their chips, never on the hero who holds the front (the game mirrors this for a foe).
    px, base = 100, 126
    cy = base - 94
    _pane(cel, px, cy, 10, 26, i, 0.55 + 0.3 * (0.5 - 0.5 * math.cos(math.tau * t)))
    for k in range(12):
        f = (t + k / 12) % 1.0
        a = math.tau * (k / 12) + f * 2.2
        r = 30 * (1.0 - f) + 11
        _shard(cel, px + math.cos(a) * r, cy + math.sin(a) * r * 0.85, k, a * 57 + i * 30)
    for k in range(3):
        f = (t + k / 3) % 1.0
        spark(cel, px - 7 + k * 7, cy - 22 + f * 44, 1 + (k % 2), LIGHT, ("azure", 8))
    rim(cel, ("azure", 0))


def mirror_flash(cel: Cel, i: int, t: float) -> None:
    """It turns the mirror on them: the pane goes white and bursts outward in shards."""
    cx, cy = 48, 48
    grow = ease_out(t, 1.6)
    if i < 2:
        _pane(cel, cx, cy, 11 + i * 2, 30 + i * 3, i, 1.0)
        blob(cel, cx, cy, 9 - i * 3, 20 - i * 6, LIGHT)
    rnd = random.Random(410)
    for k in range(18):
        a = math.tau * k / 18 + rnd.random() * 0.3
        sp = (8 + rnd.random() * 34) * grow
        _shard(cel, cx + math.cos(a) * sp, cy + math.sin(a) * sp * 0.9 + t * t * 6, k, a * 57 + t * 400 * (1 if k % 2 else -1))
    if i in (1, 2):
        ring(cel, cx, cy, 10 + i * 12, (10 + i * 12) * 0.9, LIGHT, thick=1.6)
    if i >= 4:
        thin(cel, 1.0 - 0.3 * (i - 3), 71)
    rim(cel, ("azure", 0))


def shot_shard(cel: Cel, i: int, t: float) -> None:
    """What the mirror sends back: a long shard of it, turning as it flies, with the light of what it copied."""
    cx, cy = 13, 8
    _shard(cel, cx, cy, 0, 360 * t)
    for k in range(4):
        cel.put(cx - 6 - k * 2, cy + ((k * 5 + i * 3) % 7) - 3, LIGHT if k % 2 else ("azure", 7))
    rim(cel, ("azure", 0))


def shard_hit(cel: Cel, i: int, t: float) -> None:
    """The shard breaks on a hero: a star of glass and a few splinters."""
    cx, cy = 14, 14
    grow = ease_out(t, 1.5)
    if i < 2:
        spark(cel, cx, cy, 5 - i * 2, LIGHT, ("azure", 8))
    rnd = random.Random(420)
    for k in range(8):
        a = math.tau * k / 8 + rnd.random() * 0.4
        sp = (3 + rnd.random() * 9) * grow
        _shard(cel, cx + math.cos(a) * sp, cy + math.sin(a) * sp + t * t * 5, 1 + k % 2, a * 57 + t * 300)
    if i >= 3:
        thin(cel, 0.6, 73)
    rim(cel, ("azure", 0))


def mirror_boon(cel: Cel, i: int, t: float) -> None:
    """What the ability gave its allies, the Unmaker keeps: shards of light fly IN from all round and sink into it."""
    cx, base = 36, 76
    cy = base - 34
    close = ease_in(t, 1.5)
    rnd = random.Random(430)
    for k in range(14):
        a = math.tau * k / 14 + rnd.random() * 0.3
        r = 34 * (1.0 - close) + 3
        _shard(cel, cx + math.cos(a) * r, cy + math.sin(a) * r * 1.05, k, a * 57 + 180)
        if close < 0.8:
            streak(cel, (cx + math.cos(a) * (r + 3), cy + math.sin(a) * (r + 3) * 1.05), (cx + math.cos(a) * (r + 9), cy + math.sin(a) * (r + 9) * 1.05), [("azure", 7), ("azure", 5)])
    if i >= 4:
        blob(cel, cx, cy, 5 + (i - 4) * 3, 8 + (i - 4) * 4, ("azure", 8) if i < 6 else ("azure", 6))
        blob(cel, cx, cy, 3, 5, LIGHT)
    if i == 6:
        thin(cel, 0.5, 75)
    rim(cel, ("azure", 0))


# ----------------------------------------------------------------------------------------- Deadeye, boss by boss
# What each boss sends at the hero it has picked (render/bossFx DEADEYE_SHOT). All fly to the right, head first,
# with their head on the anchor; the game mirrors them for a foe.

def _trail(cel: Cel, x: float, y: float, i: int, tones, n: int = 5, spread: int = 7) -> None:
    """A few specks torn off behind something that flies."""
    for k in range(n):
        cel.put(x - k * 2.4 - (i % 2), y + ((k * 5 + i * 3) % spread) - spread // 2, tones[k % len(tones)])


def shot_horn(cel: Cel, i: int, t: float) -> None:
    """The Scapegoat's: one of its horns, torn off and thrown — a ridged curl turning end over end."""
    cx, cy = 14, 9
    a0 = 360 * t
    steps = 30
    for s_ in range(steps + 1):
        f = s_ / steps
        a = math.radians(a0 + 250 * f)
        r = 6.2 - 2.4 * f
        w = 3.2 * (1 - f) + 0.6
        for d in range(int(-w), int(w) + 1):
            rr = r + d * 0.5
            ridge = s_ % 4 == 0
            tone = ("leather", 2) if ridge else ("leather", 6) if d < -w * 0.3 else ("leather", 5) if d < w * 0.4 else ("leather", 3)
            cel.put(cx + math.cos(a) * rr, cy + math.sin(a) * rr, tone)
    tip = math.radians(a0 + 250)
    cel.put(cx + math.cos(tip) * 3.6, cy + math.sin(tip) * 3.6, ("bone", 7))
    rim(cel, ("ink", 0))
    _trail(cel, cx - 8, cy, i, [("crimson", 6), ("leather", 5), ("crimson", 4)])


def shot_bead(cel: Cel, i: int, t: float) -> None:
    """The Gilded Abbot's: a bead off his rosary, heavy and gold, the smaller ones still strung behind it."""
    hx, y = 19, 8
    for k in range(1, 5):  # the string behind it, swinging
        x = hx - 4 - k * 3.4
        yy = y + math.sin(math.tau * t + k * 0.9) * (0.6 + k * 0.5)
        r = 1.5 if k < 3 else 1.0
        blob(cel, x, yy, r, r, ("brass", 5))
        cel.put(x - 0.5, yy - 0.5, ("brass", 7))
        cel.put(x + 1.7, yy, ("brass", 3))  # the cord
    blob(cel, hx, y, 3.6, 3.6, ("brass", 5))
    blob(cel, hx - 0.6, y - 0.6, 2.4, 2.4, ("brass", 6))
    cel.put(hx - 1.5, y - 1.5, LIGHT)
    cel.put(hx - 0.5, y - 2, ("brass", 7))
    ring(cel, hx, y, 3.6, 3.6, ("brass", 3), a0=20, a1=160)  # its shadowed underside
    cel.put(hx + 1, y + 1, ("crimson", 6))  # a carved sigil catching the light
    rim(cel, ("brass", 1))


def shot_spout(cel: Cel, i: int, t: float) -> None:
    """The Ninth Wave's: a lance of sea water, a fist of foam at its head, thinning to drops behind."""
    hx, y = 20, 8
    for s_ in range(18):
        f = s_ / 18
        w = 2.6 * (1 - f) ** 0.7
        yy = y + math.sin(f * 7 + i * 1.7) * 1.1 * f
        for d in range(int(-w), int(w) + 1):
            if f > 0.6 and (s_ + d) % 2 == 0:
                continue  # it breaks into drops
            cel.put(hx - 2 - s_, yy + d, NAVY[4] if d <= -w * 0.4 else NAVY[3] if d < w * 0.4 else NAVY[2])
    _foam_lump(cel, hx - 1, y + 1, 2.8, 500 + i)
    cel.put(hx + 1, y - 1, LIGHT)
    for k in range(4):
        cel.put(hx - 6 - k * 4, y - 3 - (k + i) % 2, FOAM if k % 2 else SPRAY)
    rim(cel, ("azure", 0))


_CAP_FLAT = [
    "..wWWWWw..",
    ".wWWoWWWw.",
    "wWWWWWoWWw",
    ".ggwggwgg.",
]


def shot_sporecap(cel: Cel, i: int, t: float) -> None:
    """The Destroying Angel's: one of her caps, skimmed like a discus, shedding its dust as it turns."""
    cx, cy = 15, 8
    tilt = (-18, 4, 22, 4)[i % 4]
    cel.stamp_rot(_CAP_FLAT, SHROOM, cx, cy, 5, 2, tilt)
    rim(cel, ("bone", 1))
    for k in range(7):
        f = ((i / 4) + k / 7) % 1.0
        cel.put(cx - 7 - f * 9, cy + math.sin(k * 2.1) * 4 + f * 2, LIGHT if k % 3 == 0 else ("bone", 7) if k % 3 == 1 else ("moss", 8))


_HOT_SWORD = [
    "...k...............",
    "kk.krrooyyYYYYWWw..",
    "kkkkRRooyyYYYYWWWWw",
    "kk.krrooyyYYYYWWw..",
    "...k...............",
]
HOT_SWORD = {"k": ("ink", 3), "r": ("crimson", 3), "R": ("crimson", 4), "o": ("crimson", 6), "y": ("brass", 5), "Y": ("brass", 6), "W": ("brass", 7), "w": LIGHT}


def shot_hotblade(cel: Cel, i: int, t: float) -> None:
    """The Quench's: one of the swords out of its back, still white from the forge, thrown point first."""
    cel.stamp(_HOT_SWORD, HOT_SWORD, 4, 4 + (1 if i == 1 else 0))
    rim(cel, ("crimson", 1))
    for k in range(5):  # sparks coming off the hot steel
        cel.put(20 - k * 4 - i * 2 % 3, 2 + (k * 3 + i * 2) % 3 - 1, LIGHT if k % 2 else ("brass", 6))
        cel.put(18 - k * 4, 10 + (k + i) % 2, ("crimson", 6))


_GAVEL = [
    ".gGGGGGg.",
    "gHsssssGg",
    "gssSSSssg",
    "gHsssssGg",
    ".gGGGGGg.",
    "...lL....",
    "...lL....",
    "...lL....",
    "...lL....",
    "...lL....",
    "...ll....",
]
GAVEL = {"g": ("brass", 4), "G": ("brass", 6), "H": ("brass", 7), "s": ("ink", 4), "S": ("ink", 6), "l": ("leather", 3), "L": ("leather", 5)}


def shot_gavel(cel: Cel, i: int, t: float) -> None:
    """The Verdict's: its gavel, thrown — it comes turning end over end, brass bands flashing."""
    cx, cy = 14, 11
    cel.stamp_rot(_GAVEL, GAVEL, cx, cy, 4.5, 5, 360 * t)
    rim(cel, ("ink", 0))
    _trail(cel, cx - 9, cy, i, [("brass", 6), ("brass", 4), LIGHT], n=4)


def shot_void(cel: Cel, i: int, t: float) -> None:
    """The Unmaker's: a sliver of nothing — a black crescent with stars in it, the air coming apart along its edge."""
    cx, cy = 14, 9
    a0 = 360 * t
    for s_ in range(40):
        f = s_ / 39
        a = math.radians(a0 - 115 + 230 * f)
        w = 3.4 * math.sin(f * math.pi) + 0.6
        for d in range(int(w) + 1):
            rr = 6.5 - d
            edge = d == 0
            cel.put(cx + math.cos(a) * rr, cy + math.sin(a) * rr, ("violet", 7) if edge else ("ink", 0) if d < w - 1 else ("violet", 2))
    for k in range(3):  # stars inside it
        a = math.radians(a0 - 60 + k * 60)
        cel.put(cx + math.cos(a) * 4.6, cy + math.sin(a) * 4.6, LIGHT if (k + i) % 2 else ("violet", 8))
    rim(cel, ("violet", 1))
    for k in range(6):  # what it passes comes apart: pixels drifting off its wake
        cel.put(cx - 9 - k * 2 + (i % 2), cy + ((k * 4 + i * 5) % 9) - 4, ("violet", 6) if k % 2 else ("violet", 8))


# ── …and the stage bosses of worlds 4–10 ──
_ROCK = [
    "..LLl...",
    ".LLLLld.",
    "LLLlllld",
    "LLlllddd",
    ".llldddk",
    "..lddk..",
]
ROCK = {"L": ("leather", 7), "l": ("leather", 5), "d": ("leather", 3), "k": ("leather", 1)}


def shot_rock(cel: Cel, i: int, t: float) -> None:
    """The Sandstone Colossus's: a block broken off itself, tumbling, shedding grit."""
    cx, cy = 14, 9
    cel.stamp_rot(_ROCK, ROCK, cx, cy, 4, 3, 360 * t)
    rim(cel, ("ink", 0))
    _trail(cel, cx - 7, cy + 1, i, [("leather", 6), ("leather", 4), ("bone", 5)], n=6)


_BELL = [
    "...gg...",
    "..gGGg..",
    "..gHGg..",
    ".gGHGGg.",
    ".gGHGGg.",
    "gGGGGGGg",
    "gggggggg",
    "...dd...",
]
BELL = {"g": ("brass", 4), "G": ("brass", 6), "H": ("brass", 7), "d": ("brass", 2)}


def shot_bell(cel: Cel, i: int, t: float) -> None:
    """The Bell-Bearer's: a bell off his frame, flung clapper and all — it rings as it flies."""
    cx, cy = 15, 9
    cel.stamp_rot(_BELL, BELL, cx, cy, 4, 4, (-25, 10, 30, 10, -25, -40)[i % 6])
    rim(cel, ("brass", 1))
    for k in (1, 2):  # the sound of it, behind
        ring(cel, cx - 3, cy, 5 + k * 3 + (i % 3), 5 + k * 3 + (i % 3), ("brass", 6) if k == 1 else ("brass", 4), a0=140, a1=220)


def shot_ball(cel: Cel, i: int, t: float) -> None:
    """The Drowned Admiral's: a round shot from a gun long under water — black iron, weed and bubbles after it."""
    hx, y = 19, 8
    blob(cel, hx, y, 3.6, 3.6, ("ink", 2))
    blob(cel, hx - 0.8, y - 0.8, 2.2, 2.2, ("ink", 4))
    cel.put(hx - 1.6, y - 1.6, ("ink", 8))
    cel.put(hx - 0.6, y - 2.2, ("ink", 6))
    rim(cel, ("ink", 0))
    for k in range(4):  # weed streaming off it
        x = hx - 4 - k * 2.6
        cel.put(x, y - 2 + math.sin(k + i * 1.5) * 1.5, ("sea", 5) if k % 2 else ("sea", 3))
        cel.put(x - 1, y - 2 + math.sin(k + i * 1.5 + 0.6) * 1.5, ("sea", 4))
    for k in range(4):  # bubbles
        f = ((i / 3) + k / 4) % 1.0
        bx, by = hx - 6 - f * 12, y + 2 - k % 3 * 2 - f * 3
        ring(cel, bx, by, 1.2, 1.2, ("azure", 7))


AMETHYST = {"w": LIGHT, "L": ("violet", 8), "a": ("violet", 6), "b": ("violet", 4), "k": ("violet", 2)}
_CRYSTAL = [
    "....wL....",
    "...wLLa...",
    "..wLLLab..",
    ".wLLLLaab.",
    "wLLLLLaabk",
    ".LLLLaabk.",
    "..LLaabk..",
    "...aabk...",
]


def shot_crystal(cel: Cel, i: int, t: float) -> None:
    """The Geode Titan's: a crystal out of its own heart, long as a spearhead, flashing as it turns."""
    cx, cy = 15, 8
    cel.stamp_rot(_CRYSTAL, AMETHYST, cx, cy, 5, 4, 45 + (0, 8, 0, -8)[i % 4])
    rim(cel, ("violet", 0))
    if i % 2 == 0:
        spark(cel, cx + 3, cy - 2, 2, LIGHT, ("violet", 8))
    _trail(cel, cx - 7, cy, i, [("violet", 7), ("sea", 7), ("violet", 5)], n=5)


def shot_magma(cel: Cel, i: int, t: float) -> None:
    """The Forge Wyrm's: a gob of molten rock, crusting black as it flies, dripping fire behind."""
    hx, y = 18, 8
    rnd = random.Random(700 + i)
    for s_ in range(15):
        f = s_ / 15
        up = int(round((1 - f) * 2.6 * (0.5 + 0.7 * rnd.random())))
        for d in range(-up, up + 1):
            cel.put(hx - 3 - s_, y + d + f * 2, ("brass", 6) if f < 0.3 and abs(d) <= 1 else ("crimson", 6) if f < 0.6 else ("crimson", 4))
    blob(cel, hx, y, 3.8, 3.4, ("crimson", 5))
    blob(cel, hx - 0.4, y - 0.3, 2.6, 2.2, ("brass", 6))
    blob(cel, hx - 0.8, y - 0.6, 1.3, 1.1, LIGHT)
    for dx, dy in ((2, -2), (3, 1), (0, 3), (-2, 2)):  # the crust forming on it
        cel.put(hx + dx, y + dy, ("ink", 2))
    rim(cel, ("crimson", 1))
    for k in range(3):  # drops falling off
        cel.put(hx - 6 - k * 4, y + 4 + (k + i) % 3, ("brass", 6) if k % 2 else ("crimson", 6))


_LANCE = [
    "f...f...........w..",
    ".fF..fF......yyWWw.",
    "..fFFfFFyyyyYYWWWWw",
    ".fF..fF......yyWWw.",
    "f...f...........w..",
]
LANCE = {"f": ("azure", 6), "F": ("azure", 8), "y": ("brass", 5), "Y": ("brass", 6), "W": ("brass", 7), "w": LIGHT}


def shot_lance(cel: Cel, i: int, t: float) -> None:
    """The Archon's: a javelin of light off its wing — a white head, a golden shaft, two feathers for flights."""
    cel.stamp(_LANCE, LANCE, 3, 4)
    rim(cel, ("brass", 2))
    for k in range(4):
        cel.put(2 - (i % 2) + k * 5, 2 + (k + i) % 2 * 8, LIGHT if k % 2 else ("brass", 7))


_HATCHET = [
    ".sSSs....",
    "sSSSSs...",
    "sSWSSSl..",
    "sSSSSsL..",
    ".sSSs.lL.",
    "......lL.",
    ".......lL",
    ".......lL",
    "........l",
]
HATCHET = {"s": ("ink", 5), "S": ("ink", 7), "W": ("ink", 9), "l": ("leather", 3), "L": ("leather", 5)}


def shot_hatchet(cel: Cel, i: int, t: float) -> None:
    """The Lictor's: the axe out of his bundle of rods, thrown — it comes whirling."""
    cx, cy = 14, 10
    cel.stamp_rot(_HATCHET, HATCHET, cx, cy, 4.5, 4.5, 360 * t)
    rim(cel, ("ink", 0))
    _trail(cel, cx - 8, cy, i, [("ink", 8), ("crimson", 5), ("ink", 6)], n=4)


FX = [
    Fx("crow_fly", CROW_W, CROW_H, CROW_AX, CROW_AY, [90, 70, 90, 70], True, crow_fly),
    Fx("crow_peck", CROW_W, CROW_H, CROW_AX, CROW_AY, [70, 50, 60, 90, 70, 80], False, crow_peck),
    Fx("crow_gone", CROW_W, CROW_H, CROW_AX, CROW_AY, [45, 55, 70, 80, 90, 100], False, crow_gone),
    Fx("flock_gather", 150, 130, 75, 126, [80] * 8, True, flock_gather),
    Fx("flock_burst", 140, 104, 70, 52, [40, 45, 55, 65, 75, 85, 95], False, flock_burst),
    Fx("warn_roots", 38, 20, 19, 15, [90] * 6, True, warn_roots),
    Fx("roots_rise", 38, 42, 19, 40, [45, 55, 65, 75, 90, 110], False, roots_rise),
    Fx("roots_bind", 38, 40, 19, 38, [140] * 8, True, roots_bind),
    Fx("roots_break", 38, 42, 19, 40, [45, 55, 70, 85, 100], False, roots_break),
    Fx("warn_static", 26, 16, 13, 14, [60] * 6, True, warn_static),
    Fx("bolt_strike", 48, 108, 24, 104, [35, 40, 45, 60, 80, 90], False, bolt_strike),
    Fx("bolt_spark", 28, 16, 20, 8, [45, 45, 45], True, bolt_spark),
    Fx("bolt_zap", 32, 38, 16, 19, [40, 50, 60, 75, 90], False, bolt_zap),
    Fx("shell_plate", 28, 32, 14, 30, [110] * 8, True, shell_plate),
    Fx("shell_raise", 64, 64, 32, 32, [45, 50, 55, 60, 75, 90], False, shell_raise),
    Fx("shell_break", 64, 64, 32, 32, [40, 50, 60, 75, 90, 100], False, shell_break),
    Fx("leech_drain", 44, 56, 22, 54, [55, 60, 65, 70, 80, 90], False, leech_drain),
    Fx("venom_splash", 26, 26, 13, 13, [40, 50, 60, 75], False, venom_splash),
    Fx("venom_drip", 24, 32, 12, 30, [110] * 8, True, venom_drip),
    Fx("deadeye_mark", 31, 31, 15, 15, [50, 50, 55, 60, 70, 90], False, deadeye_mark),
    Fx("shot_crow", 24, 15, 19, 7, [70, 70], True, shot_crow),
    Fx("shot_thorn", 24, 11, 20, 5, [80, 80], True, shot_thorn),
    Fx("shot_moon", 24, 18, 14, 9, [45] * 6, True, shot_moon),
    Fx("shot_sickle", 24, 18, 13, 9, [45] * 6, True, shot_sickle),
    Fx("shot_wisp", 24, 14, 17, 7, [60, 60, 60], True, shot_wisp),
    Fx("shot_deadeye", 26, 13, 21, 6, [60, 60], True, shot_deadeye),
    Fx("seismic_tremor", 30, 12, 15, 10, [80] * 8, True, seismic_tremor),
    Fx("warn_guilt", 24, 22, 12, 20, [110] * 6, True, warn_guilt),
    Fx("guilt_fall", 40, 56, 20, 36, [45, 50, 60, 70, 80, 90, 100], False, guilt_fall),
    Fx("guilt_brand", 26, 26, 13, 14, [140] * 8, True, guilt_brand),
    Fx("guilt_pang", 26, 26, 13, 13, [40, 55, 70, 85], False, guilt_pang),
    Fx("warn_gild", 88, 128, 44, 124, [90] * 8, True, warn_gild),
    Fx("gild_toll", 200, 80, 100, 40, [45, 50, 60, 70, 80, 90, 100], False, gild_toll),
    Fx("gild_lock", 40, 56, 20, 30, [45, 55, 65, 80, 90, 110], False, gild_lock),
    Fx("gilded_halo", 40, 56, 20, 30, [160] * 12, True, gilded_halo),
    Fx("warn_tide", 24, 12, 12, 8, [90] * 6, True, warn_tide),
    Fx("warn_tide_hot", 24, 16, 12, 12, [70] * 6, True, warn_tide_hot),
    Fx("undertow_surge", 128, 44, 64, 26, [45, 50, 55, 60, 70, 80, 90], False, undertow_surge),
    Fx("undertow_front", 60, 68, 30, 62, [80, 80, 80, 80], True, undertow_front),
    Fx("undertow_trail", 26, 22, 13, 20, [50, 60, 70, 80, 90], False, undertow_trail),
    Fx("undertow_splash", 30, 22, 15, 20, [35, 45, 55, 70, 80], False, undertow_splash),
    Fx("warn_spores", 120, 120, 60, 116, [110] * 8, True, warn_spores),
    Fx("spore_land", 38, 42, 19, 40, [50, 60, 70, 80, 90, 100, 110], False, spore_land),
    Fx("spores_grow", 38, 40, 19, 38, [170] * 8, True, spores_grow),
    Fx("spore_wither", 38, 42, 19, 40, [60, 70, 80, 90, 100, 110], False, spore_wither),
    Fx("warn_blade", 56, 20, 28, 16, [80] * 8, True, warn_blade),
    Fx("blade_ignite", 40, 48, 20, 44, [40, 50, 110, 80, 60, 60, 70], False, blade_ignite),
    Fx("ground_fire", 56, 48, 28, 42, [85] * 6, True, ground_fire),
    Fx("warn_scales", 34, 32, 17, 30, [120] * 8, True, warn_scales),
    Fx("scales_fall", 38, 54, 19, 28, [45, 50, 60, 80, 90, 100, 110], False, scales_fall),
    Fx("warn_mirror", 150, 130, 60, 126, [90] * 8, True, warn_mirror),
    Fx("mirror_flash", 96, 96, 48, 48, [45, 55, 60, 70, 80, 90, 100], False, mirror_flash),
    Fx("shot_shard", 24, 16, 13, 8, [45] * 6, True, shot_shard),
    Fx("shard_hit", 28, 28, 14, 14, [40, 50, 60, 75, 90], False, shard_hit),
    Fx("mirror_boon", 72, 80, 36, 76, [50, 55, 60, 65, 70, 80, 90], False, mirror_boon),
    Fx("shot_horn", 26, 18, 14, 9, [45] * 8, True, shot_horn),
    Fx("shot_bead", 26, 16, 19, 8, [70] * 6, True, shot_bead),
    Fx("shot_spout", 26, 16, 20, 8, [55] * 4, True, shot_spout),
    Fx("shot_sporecap", 26, 16, 15, 8, [70] * 4, True, shot_sporecap),
    Fx("shot_hotblade", 26, 13, 21, 6, [60, 60], True, shot_hotblade),
    Fx("shot_gavel", 28, 22, 14, 11, [45] * 8, True, shot_gavel),
    Fx("shot_void", 26, 18, 14, 9, [45] * 8, True, shot_void),
    Fx("shot_rock", 26, 18, 14, 9, [50] * 8, True, shot_rock),
    Fx("shot_bell", 28, 18, 15, 9, [60] * 6, True, shot_bell),
    Fx("shot_ball", 26, 16, 19, 8, [60] * 3, True, shot_ball),
    Fx("shot_crystal", 28, 16, 15, 8, [70] * 4, True, shot_crystal),
    Fx("shot_magma", 26, 16, 18, 8, [60] * 3, True, shot_magma),
    Fx("shot_lance", 26, 13, 20, 6, [60, 60], True, shot_lance),
    Fx("shot_hatchet", 28, 20, 14, 10, [45] * 8, True, shot_hatchet),
]
