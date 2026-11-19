"""Ranger, re-imagined (2026-11-19) after the user's references: a hand-pixelled chibi archer — a deep green hood
with a dark inner rim, a chestnut fringe, tall rectangular eyes, a shoulder mantle, pale sleeves under leather
bracers, a tunic with a crossed strap and a gold-buckled belt, grey trousers, chunky boots, a dark cape, a quiver
on the back and a big banded bow held out to the side.

Unlike the other figures this one is NOT painted with the rig's tapered strokes (the first try was, and came out
shapeless): every piece is a sprite drawn pixel by pixel, each with its own black outline, laid over the others
like cut paper; only the arms, the bow and the cape are plotted — on whole pixels, flat tones. ~46 px tall.

Drawn facing right like every figure. Lab only until approved (chars/ranger.py is the one the game uses).
"""
from __future__ import annotations

import math
from types import SimpleNamespace

from ..rig import Anim, Cel, Pose

Tone = tuple[str, int]
INK: Tone = ("ink", 0)

L: dict[str, Tone] = {
    "o": INK,
    # hood, mantle, tunic
    "A": ("moss", 2), "a": ("moss", 3), "b": ("moss", 4), "c": ("moss", 5), "d": ("moss", 6),
    # hair
    "h": ("leather", 3), "i": ("leather", 4), "j": ("leather", 5),
    # skin, cheek, mouth
    "s": ("skin", 5), "t": ("skin", 6), "u": ("skin", 7), "p": ("dusk", 7), "m": ("skin", 3),
    # eyes
    "E": ("ink", 1), "e": ("ink", 5),
    # sleeves
    "n": ("bone", 4), "N": ("bone", 6),
    # leather
    "k": ("leather", 2), "l": ("leather", 3), "r": ("leather", 4), "q": ("leather", 5),
    # gold
    "x": ("brass", 3), "y": ("brass", 5), "z": ("brass", 6),
    # trousers
    "f": ("ink", 4), "g": ("ink", 6), "G": ("ink", 7),
    # fletching
    "w": ("bone", 7), "W": ("ink", 7),
}

# 21 × 20. The hood: lit from the upper right, its inner rim black; the fringe in three locks; the eyes two tall
# rectangles, dark above and grey below (the far one nearer the hood's edge: she looks to the right).
HEAD = [
    ".......bbcccdc.......",
    ".....abbccccdddc.....",
    "...aabbbccccccdddc...",
    "..Aabbbbcccccccdddc..",
    ".Aaabbbbccccccccddcc.",
    "Aaabbboooooooooooocdc",
    "Aaabbohhiiiijjjiihocd",
    "Aaabbohiiiijjjjiihocd",
    "Aaabbohiiijjjjjiihocc",
    "Aaabbohiittiitttihocc",
    "Aaabbohittttittttiocc",
    "AaabbohttEEtttEEttocc",
    "AaabbohttEEtttEEttocc",
    "Aaabbostteettteettocc",
    "Aaabbospttttttttptocc",
    "Aaabboosttttmmtttoobc",
    "AAabbboossttttssoobbc",
    ".AAabbbboooooooobbbc.",
    "..AAabbbbbbbbbbbbbc..",
    "....AAabbbbbbbbbc....",
]
HEAD_BLINK = {11: "Aaabbohtttttttttttocc", 12: "AaabbohttEEtttEEttocc", 13: "Aaabbostttttttttttocc"}

# 15 × 15: the mantle over the shoulders, the tunic with its strap, the belt and buckle, the split skirt.
TORSO = [
    ".abbbbbccccccc.",
    "aabbbbbcccccccd",
    ".aabbbbccccccc.",
    "..alrbbbccccc..",
    "..ablrbbccccc..",
    "..abblrbccccc..",
    "..abbblrccccc..",
    "..abbbblrcccc..",
    "..abbbbblrccc..",
    "..abbbbbblrcc..",
    "..kllllyzyllk..",
    "..kkkkkyxykkk..",
    ".aabbbbAcccccc.",
    ".aabbbA.Accccc.",
]

# 7 × 14: grey trousers into a chunky boot with a turned cuff, the toe to the right.
LEG = [
    "fgGG...",
    "fgGG...",
    "fgGG...",
    "fgGG...",
    "fgGG...",
    "fggG...",
    "lqqqq..",
    "lrrrq..",
    "klrrq..",
    "klrrq..",
    "klrrq..",
    "klrrrq.",
    "klrrrrq",
    "kkkkkkk",
]

# The rear arm at rest: a pale sleeve, the bracer, the hand.
ARM_HANG = [
    "nNN.",
    "nNN.",
    "nNN.",
    "lrrq",
    "lrrq",
    "lrrq",
    "lrrq",
    "kllk",
    "stt.",
    "stt.",
]

# 8 × 12: the quiver on the back, tilted, its arrows fanned above the shoulder.
QUIVER = [
    ".w..w...",
    "wWw.Ww..",
    ".Ww.wW..",
    "..i..i..",
    "..ii.i..",
    "..lrri..",
    "..klrr..",
    "...lrrq.",
    "...klrq.",
    "....lrr.",
    "....klr.",
    ".....kl.",
]

HAND = ["tt", "tt", "st"]

ROOT_X, GROUND = 40, 64
#: Where the pieces sit (top-left of each sprite), the body standing on the ground line.
AT = {"leg_far": (34, 50), "leg_near": (41, 50), "torso": (33, 37), "head": (30, 19), "arm_hang": (31, 40), "quiver": (22, 27)}
SHOULDER_BOW = (47, 41)
SHOULDER_DRAW = (36, 41)


class Part:
    """One piece of the figure: painted, given its black outline, then laid on the frame."""

    def __init__(self) -> None:
        self.px: dict[tuple[int, int], Tone] = {}

    def put(self, x: float, y: float, t: Tone) -> None:
        self.px[(int(round(x)), int(round(y)))] = t

    def stamp(self, rows: list[str], x0: int, y0: int) -> None:
        for j, row in enumerate(rows):
            for i, ch in enumerate(row):
                if ch != ".":
                    self.px[(x0 + i, y0 + j)] = L[ch]

    def lay(self, cel: Cel, outline: bool = True) -> None:
        if outline:
            edge = {}
            for (x, y) in self.px:
                for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if n not in self.px:
                        edge[n] = INK
            for (x, y), t in edge.items():
                cel.put(x, y, t)
        for (x, y), t in self.px.items():
            cel.put(x, y, t)


def _line(a: tuple[int, int], b: tuple[int, int]) -> list[tuple[int, int]]:
    (ax, ay), (bx, by) = a, b
    dx, dy = abs(bx - ax), -abs(by - ay)
    sx, sy = (1 if ax < bx else -1), (1 if ay < by else -1)
    err, out = dx + dy, []
    while True:
        out.append((ax, ay))
        if ax == bx and ay == by:
            return out
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            ax += sx
        if e2 <= dx:
            err += dx
            ay += sy


def arm(part: Part, joints: list[tuple[int, int]], sleeve: int = 4) -> None:
    """An arm through its joints, three pixels thick in flat tones: the first `sleeve` pixels pale cloth, the rest
    the leather bracer with a dark cuff at the wrist."""
    pts: list[tuple[int, int]] = []
    for a, b in zip(joints, joints[1:]):
        seg = _line(a, b)
        pts += seg if not pts else seg[1:]
    n = len(pts)
    for k, (x, y) in enumerate(pts):
        nxt = pts[min(k + 1, n - 1)]
        prv = pts[max(k - 1, 0)]
        flat = abs(nxt[0] - prv[0]) >= abs(nxt[1] - prv[1])
        if k < sleeve:
            hi, mid, lo = ("bone", 6), ("bone", 6), ("bone", 4)
        elif k >= n - 2:
            hi, mid, lo = ("leather", 2), ("leather", 2), ("leather", 2)
        else:
            hi, mid, lo = ("leather", 5), ("leather", 4), ("leather", 3)
        if flat:
            part.put(x, y - 1, hi), part.put(x, y, mid), part.put(x, y + 1, lo)
        else:
            part.put(x + 1, y, hi), part.put(x, y, mid), part.put(x - 1, y, lo)


def bow_curve(grip: tuple[int, int], draw: float, half: int = 17) -> list[tuple[int, int]]:
    """The bow's back, top tip to bottom tip: the grip furthest forward, the limbs sweeping back to tips that curl
    forward again; drawing it pulls the tips in and back."""
    gx, gy = grip
    reach = half - round(1.5 * draw)
    out = []
    for j in range(-reach, reach + 1):
        s = abs(j) / reach
        back = 7.0 * s ** 1.6 + 3.0 * draw * s * s
        curl = 3.4 * max(0.0, (s - 0.74) / 0.26) ** 1.4
        out.append((gx - round(back - curl), gy + j))
    return out


def draw_bow(cel: Cel, grip: tuple[int, int], draw: float, nock: tuple[int, int] | None) -> None:
    curve = bow_curve(grip, draw)
    bow = Part()
    for x, y in curve:
        band = (abs(y - grip[1]) // 3) % 2 == 0
        wrap = abs(y - grip[1]) <= 2
        bow.put(x, y, ("leather", 2) if wrap else ("leather", 5 if band else 4))
        bow.put(x - 1, y, ("leather", 2) if wrap else ("leather", 3))
    top, bottom = (curve[0][0] - 1, curve[0][1]), (curve[-1][0] - 1, curve[-1][1])
    string = Part()
    spans = ((top, nock), (nock, bottom)) if nock is not None else ((top, bottom),)
    for a, b in spans:
        for x, y in _line(a, b):
            string.put(x, y, INK)
    string.lay(cel, outline=False)
    bow.lay(cel)


def draw_arrow(cel: Cel, nock: tuple[int, int], tip_x: int) -> None:
    a = Part()
    x0, y = nock
    for x in range(x0, tip_x + 1):
        a.put(x, y, ("leather", 4))
    for dx, dy in ((2, 0), (1, 0), (0, -1), (0, 1), (0, 0)):
        a.put(tip_x + dx, y + dy, ("ink", 8))
    for dx in (0, 1, 2):
        a.put(x0 + dx, y - 1, ("bone", 7))
        a.put(x0 + dx, y + 1, ("ink", 7))
    a.lay(cel)


def cape(cel: Cel, ox: int, phase: float, swing: float) -> None:
    """The cape behind the body, down to the calves: dark, a lighter edge at the back, a ragged hem; its lower
    half sways."""
    p = Part()
    rows = 20
    for r in range(rows):
        sway = round(swing * math.sin(math.tau * (phase - r * 0.045)) * (r / rows) ** 1.5)
        left = 29 - min(r // 4, 3) - sway
        right = 45 + (1 if r > 9 else 0) - (sway // 2)
        for x in range(left, right + 1):
            if r >= rows - 2 and (x + sway) % 4 == (1 if r == rows - 1 else 3):
                continue  # the hem's notches
            fold = (x - left) % 5 == 3
            tone = ("moss", 3) if x - left < 2 else ("moss", 1) if fold else ("moss", 2)
            p.put(ox + x, 38 + r, tone)
    p.lay(cel)


def figure(cel: Cel, p: Pose) -> None:
    dx = -round(p.get("back", 0.0))  # the body's shift (she settles back as she draws)
    bob = round(p.get("bob", 0.0))  # the head and shoulders sink on the breath out
    aim = p.get("aim", 0.0)
    draw = p.get("draw", 0.0)
    hand = p.get("hand")  # the string hand, when it is not hanging: (x, y) on the frame

    def at(name: str, ddy: int = 0) -> tuple[int, int]:
        x, y = AT[name]
        return x + dx, y + ddy

    cape(cel, dx, p.get("cape", 0.0), p.get("swing", 1.2))
    part = Part()
    part.stamp(QUIVER, *at("quiver", bob))
    part.lay(cel)
    for name in ("leg_far", "leg_near"):
        part = Part()
        part.stamp(LEG, *AT[name])  # the feet stay planted
        part.lay(cel)
    part = Part()
    part.stamp(TORSO, *at("torso", bob))
    part.lay(cel)
    if hand is None:
        part = Part()
        part.stamp(ARM_HANG, *at("arm_hang", bob))
        part.lay(cel)
    head = [HEAD_BLINK.get(j, row) for j, row in enumerate(HEAD)] if p.get("blink", 0.0) > 0.5 else HEAD
    part = Part()
    part.stamp(head, *at("head", bob + round(p.get("nod", 0.0))))
    part.lay(cel)

    # The bow arm: bent at rest with the bow held upright beside her; straight out at the shoulder to shoot.
    sx, sy = SHOULDER_BOW[0] + dx, SHOULDER_BOW[1] + bob
    elbow = (round(sx + 5 * aim), round(sy + 4 * (1 - aim)))
    grip_hand = (round(sx + 7 + 4 * aim), round(sy + 4 * (1 - aim)))
    part = Part()
    arm(part, [(sx, sy), elbow, grip_hand])
    part.lay(cel)
    grip = (grip_hand[0] + 2, grip_hand[1])
    nock = (int(hand[0]) + dx + 1, int(hand[1]) + bob) if hand is not None and draw > 0.02 else None
    draw_bow(cel, grip, draw, nock)
    if p.get("arrow", 0.0) > 0.5 and nock is not None:
        draw_arrow(cel, nock, grip[0] + 5)
    part = Part()
    part.stamp(HAND, grip_hand[0], grip_hand[1] - 1)
    part.lay(cel)

    if hand is not None:
        hx, hy = int(hand[0]) + dx, int(hand[1]) + bob
        ssx, ssy = SHOULDER_DRAW[0] + dx, SHOULDER_DRAW[1] + bob
        elbow = (max(ssx - 1, hx - 6), hy + 4)
        part = Part()
        arm(part, [(ssx, ssy), elbow, (hx - 1, hy)], sleeve=3)
        part.lay(cel)
        part = Part()
        part.stamp(HAND, hx - 1, hy - 1)
        part.lay(cel)


class RangerV2:
    """Bakes like every figure (rig.bake), but a pose is this file's own few numbers, not a skeleton's."""

    build = SimpleNamespace(root_x=ROOT_X)
    W, H, TOP = 96, 70, 0

    def chains(self) -> dict:
        return {}

    def joints(self, pose: Pose) -> dict:
        return {}

    def draw(self, cel: Cel, J: dict, pose: Pose, ropes: dict, between: list) -> None:
        figure(cel, pose)


# ── animations ───────────────────────────────────────────────────────────────────────────────────────────────


def idle_pose(t: float) -> Pose:
    """She breathes (the head and shoulders sink a pixel on the way out), the cape stirs, she blinks once."""
    return {"bob": 1.0 if 0.5 <= t < 0.94 else 0.0, "cape": t, "swing": 1.3, "blink": 1.0 if 0.72 <= t < 0.80 else 0.0}


SHOT_KEYS: list[Pose] = [
    dict(aim=0.0),
    dict(aim=0.5),
    dict(aim=1.0, hand=(54, 39)),
    dict(aim=1.0, hand=(56, 39), draw=0.05, arrow=1.0),
    dict(aim=1.0, hand=(53, 39), draw=0.25, arrow=1.0),
    dict(aim=1.0, hand=(50, 39), draw=0.5, arrow=1.0, back=1.0),
    dict(aim=1.0, hand=(47, 39), draw=0.8, arrow=1.0, back=1.0),
    dict(aim=1.0, hand=(45, 39), draw=1.0, arrow=1.0, back=2.0),
    dict(aim=1.0, hand=(45, 39), draw=1.0, arrow=1.0, back=2.0, nod=1.0),
    dict(aim=1.0, hand=(45, 39), draw=1.0, arrow=1.0, back=2.0, nod=1.0),
    dict(aim=1.0, hand=(41, 38), draw=0.0, back=1.0, swing=3.0),
    dict(aim=1.0, hand=(39, 38), draw=0.0, back=0.0, swing=3.0),
    dict(aim=0.8, hand=(41, 43), draw=0.0, swing=2.0),
    dict(aim=0.4, swing=1.6),
    dict(aim=0.0),
]
SHOT_MS = [90, 70, 70, 80, 70, 70, 80, 100, 140, 160, 45, 60, 80, 90, 110]
N_SHOT = len(SHOT_KEYS)


def shot_pose(t: float) -> Pose:
    """The shot: raise the bow, reach for the string, the long draw to the cheek, the hold, the loose (the hand
    flicks back, the cape whips), and back to rest. Keyed frame by frame — nothing is tweened."""
    i = min(N_SHOT - 1, max(0, round(t * (N_SHOT - 1))))
    return {"cape": i / N_SHOT, **SHOT_KEYS[i]}


ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 16 for i in range(16)], [125] * 16, True),
    "attack": Anim("attack", shot_pose, [i / (N_SHOT - 1) for i in range(N_SHOT)], SHOT_MS, False),
}
