"""Coin Sprite — the companion that gives gold. A living gold coin, as big across as the owl's body, with a small
face stamped on it and a pair of pale blue wings no bigger than its cheeks. It never lands: it hangs in the air
on a blur of little wingbeats, and every so often it flips — the disc turns edge-on, shows the star struck on its
back, and comes round again. That flip is its whole character: it flips for joy, twice and fast, when a boss
falls; it flips once when a hero gains a level; and when a chest drops it stops dead and shines.

The disc is drawn by the engine from one number, `spin` (in turns): its width is the cosine of the turn, its face
shows on the front half and the star on the back. When the party falls it comes down to stand on its edge on the
path, dull, wings hanging, eyes shut.

Its origin is the point under its rim. Clips: see pets/__init__. Drawn facing right; the game mirrors it."""
from __future__ import annotations

import math

from ..rig import Cel, Character, Pose, Pt, Tone
from . import cycle, held, one_shot

PET = "CoinSprite"

OX, OY = 32, 40
R = 6.5  # the disc's radius: 13 px across

V, W = ("azure", 5), ("azure", 8)
# A wing in its three states, as the one on the right of the picture; `at` is the pixel that sits on the rim.
WINGS = {
    "up": (["..VW.", ".VWWW", "VWWW.", "VWW..", "V...."], (0, 4)),
    "mid": (["VWWW.", "VWWWW", ".VVV."], (0, 1)),
    "down": (["V....", "VWW..", "VWWW.", ".VWWW", "..VV."], (0, 0)),
    "limp": (["V..", "VW.", "VW.", "VWW", ".VW", "..V"], (0, 0)),
}
FLUTTER = ("up", "mid", "down", "mid")


def gold(i: int, dim: int) -> Tone:
    return ("brass", max(1, i - dim))


class CoinSprite(Character):
    W, H, TOP = 64, 56, 0

    def joints(self, pose: Pose) -> dict[str, Pt]:
        return {"feet": (OX + pose.get("dx", 0.0), OY + pose.get("dy", 0.0))}

    def draw(self, cel, J, pose, ropes, between) -> None:
        fx, fy = J["feet"]
        cx, cy = int(round(fx)), int(round(fy)) - 7  # the disc's middle pixel
        turn = math.cos(math.tau * pose.get("spin", 0.0))
        a = max(1.0, R * abs(turn))  # half its width as seen
        front = turn >= 0
        dim = int(pose.get("dim", 0))
        hot = int(pose.get("hot", 0))  # shining: every tone a step up
        # Wings first, on the rim at cheek height; edge-on they sit close together.
        name = pose.get("wing", "up")
        rows, (ox, oy) = WINGS[name]
        wy = cy - 2 + int(pose.get("wingdy", 0))
        for side in (-1, 1):
            x0 = cx + side * (int(round(a)) + 1)
            for j, row in enumerate(rows):
                for i, ch in enumerate(row):
                    if ch != ".":
                        t = V if ch == "V" else W
                        cel.put(x0 + side * (i - ox), wy + j - oy, ("azure", t[1] - 2 * dim))
        # The disc: a rim, a field, a highlight up and to the left, a shadow down and to the right.
        for y in range(-7, 8):
            for x in range(-7, 8):
                d = (x / a) ** 2 + (y / R) ** 2
                if d > 1.0:
                    continue
                if a < 2.0:  # edge-on: a milled bar
                    tone = gold(6 if x < 0 else 3, dim)
                elif d > 0.62:
                    tone = gold(6 + hot if (x + y) < -3 else 3 if (x + y) > 4 else 4 + hot, dim)
                else:
                    tone = gold(6 + hot if d < 0.5 and x < 0 and y < -1 and (x + y) <= -4 else 5 + hot, dim)
                cel.put(cx + x, cy + y, tone)
        if a >= 4.0 and front:
            look = int(pose.get("look", 0))
            eyes = pose.get("eyes", "open")
            sx = a / R
            for side in (-1, 1):
                ex = cx + int(round(side * 2.4 * sx)) + look
                if eyes == "shut":
                    cel.put(ex, cy, gold(2, dim))
                    cel.put(ex - side, cy, gold(2, dim))
                elif eyes == "sad":
                    cel.put(ex, cy + 1, gold(2, dim))
                    cel.put(ex + side, cy, gold(2, dim))
                else:
                    cel.put(ex, cy - 1, ("ink", 0))
                    cel.put(ex, cy, ("ink", 0))
                    if eyes == "wide":
                        cel.put(ex, cy - 2, ("ink", 0))
                        cel.put(ex, cy - 1, ("light", 0))
                if a >= 5.5 and eyes != "sad":
                    cel.put(cx + side * 4 + look, cy + 2, ("crimson", 6 - dim))  # cheeks
            mouth = pose.get("mouth", "smile")
            if mouth == "smile":
                cel.put(cx - 1 + look, cy + 3, gold(2, dim))
                cel.put(cx + look, cy + 3, gold(2, dim))
            elif mouth == "o":
                cel.put(cx + look, cy + 3, gold(2, dim))
                cel.put(cx + look, cy + 4, gold(2, dim))
            else:  # down-turned
                cel.put(cx - 1 + look, cy + 4, gold(2, dim))
                cel.put(cx + look, cy + 3, gold(2, dim))
                cel.put(cx + 1 + look, cy + 4, gold(2, dim))
        elif a >= 4.0:  # its back: a star struck in the metal
            for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1), (0, -2), (0, 2), (-2, 0), (2, 0)):
                if abs(dx) * R <= a * 2.2:
                    cel.put(cx + dx, cy + dy, gold(7, dim) if (dx, dy) == (0, 0) else gold(3, dim))
        cel.outline()
        trail = pose.get("trail", 0)
        if trail:  # going somewhere: a few motes of gold light left behind it
            for i, (dx, dy) in enumerate(((-11, -1), (-14, 2), (-17, -3))[: 3 if trail == 2 else 2]):
                cel.put(cx + dx + (1 if trail == 2 else 0), cy + dy, ("light", 0) if i == 0 else ("brass", 6))
        spark = pose.get("spark", 0.0)
        if spark > 0.05:
            cel.star(cx + 9, cy - 8, 3 if spark > 0.6 else 1)
            if spark > 0.6:
                cel.star(cx - 10, cy - 5, 1)


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, dy=0.0, spin=0.0, wing="up", wingdy=0, look=0, eyes="open", mouth="smile", dim=0, hot=0, trail=0, spark=0.0, flash=0.0)


def k(**over: object) -> Pose:
    return {**BASE, **over}


def flutter(ph: float) -> str:
    return FLUTTER[int(ph * 2 * len(FLUTTER)) % len(FLUTTER)]  # two wingbeats per period


def hover_pose(ph: float) -> Pose:
    return k(dy=round(1.4 * math.sin(math.tau * ph)), wing=flutter(ph))


def fly_pose(ph: float) -> Pose:
    return k(dy=round(1.0 * math.sin(math.tau * ph)), wing=flutter(ph), look=1, trail=1 + int(ph * 6) % 2)


def sink_pose(ph: float) -> Pose:
    return k(wing=flutter(ph), eyes="sad", mouth="down")


def flip(ph: float, turns: float = 1.0, lift: float = 3.0, **over: object) -> Pose:
    """One frame of a flip: the disc turns `turns` times while it hops."""
    return k(spin=ph * turns, dy=-lift * math.sin(math.pi * ph), wing=flutter(ph), **over)


FIDGET = [(flip(i / 10), 46) for i in range(11)]

# A boss has fallen: two fast flips, climbing, in a shower of glints.
CHEER = [(flip(i / 15, 2.0, 6.0, eyes="shut" if i not in (0, 15) else "open", spark=1.0 if 3 <= i <= 12 else 0.3 if i in (2, 13) else 0.0), 62) for i in range(16)]

# A chest has dropped: it stops dead and shines — its gold a step brighter, eyes wide, trembling with greed.
SPOT = [(k(), 50)] + [(k(hot=1, eyes="wide", mouth="o", wing="up" if i % 2 else "mid", dx=float((-1, 1)[i % 2]), spark=1.0 if 2 <= i <= 8 else 0.3), 70) for i in range(10)] + [(k(look=1), 90)]

# A hero has gained a level: one flip and a glint, like a coin tossed to them.
DING = [(flip(i / 9, 1.0, 4.0, spark=1.0 if 3 <= i <= 6 else 0.0), 62) for i in range(10)]

# Touchdown (the party has fallen): it comes down on its edge and rocks to a stop.
SETTLE = [(k(wing="down", eyes="sad", mouth="down", dx=-1.0), 70), (k(wing="limp", eyes="sad", mouth="down", dx=1.0), 70), (k(wing="limp", eyes="sad", mouth="down", dim=1), 80)]
TAKEOFF = [(k(wing="down", dy=1.0), 60), (k(wing="up", dy=-1.0), 60)]
# The party has fallen: standing on its edge on the path, dull, wings hanging, eyes shut. It rocks, barely.
MOURN = [(k(wing="limp", eyes="sad", mouth="down", dim=1), 900), (k(wing="limp", eyes="sad", mouth="down", dim=1, wingdy=1), 700)]

ANIMS = {
    "idle": cycle("idle", hover_pose, 8, 58),
    "move": cycle("move", fly_pose, 8, 48),
    "land": cycle("land", sink_pose, 4, 58),
    "settle": held("settle", SETTLE, False),
    "takeoff": held("takeoff", TAKEOFF, False),
    "fidget": held("fidget", FIDGET, False),
    "cheer": held("cheer", CHEER, False),
    "spot": held("spot", SPOT, False),
    "ding": held("ding", DING, False),
    "mourn": held("mourn", MOURN, True),
}
