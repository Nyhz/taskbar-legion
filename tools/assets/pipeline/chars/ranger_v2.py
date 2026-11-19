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
    # hood, mantle, tunic: deep forest greens
    "D": ("moss", 0), "A": ("moss", 1), "a": ("moss", 2), "b": ("moss", 3), "c": ("moss", 4), "d": ("moss", 5),
    # hair, in the hood's shadow
    "h": ("leather", 2), "i": ("leather", 3), "j": ("leather", 4),
    # skin in shade
    "s": ("skin", 3), "t": ("skin", 4), "u": ("skin", 5), "m": ("skin", 2),
    # eyes: dark, with an amber glint
    "E": ("ink", 0), "e": ("brass", 6),
    # the mask over mouth and nose
    "R": ("crimson", 1), "S": ("crimson", 2), "T": ("crimson", 3),
    # dark cloth sleeves
    "n": ("ink", 2), "N": ("ink", 3),
    # leather
    "k": ("leather", 1), "l": ("leather", 2), "r": ("leather", 3), "q": ("leather", 4),
    # tarnished brass
    "x": ("brass", 2), "y": ("brass", 3), "z": ("brass", 4),
    # trousers
    "f": ("ink", 2), "g": ("ink", 3), "G": ("ink", 4),
    # steel (the dagger), fletching
    "V": ("ink", 6), "W": ("ink", 8), "F": ("crimson", 4), "v": ("crimson", 2),
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
    "AaabboDDhhhhhhhhDDocd",
    "AaabboDhhiiiiiihhhocd",
    "Aaabbohhiijjjjiihhocc",
    "Aaabbohhissssssiihocc",
    "Aaabbohoosssssoossocc",
    "AaabbohssoEesoEessocc",
    "Aaabbohsttsssstttsocc",
    "AaabbohRRRRRRRRRRhocc",
    "AaabboRRSSTTSSSSRRocc",
    "AaabbooRSSSSSSSSRoobc",
    "AAabbbooRRSSSSRRoobbc",
    ".AAabbbboooooooobbbc.",
    "..AAabbbbbbbbbbbbbc..",
    "....AAabbbbbbbbbc....",
]
HEAD_BLINK = {11: "Aaabbohssooossoossocc"}

# 15 × 15: the mantle over the shoulders, the tunic with its strap, the belt and buckle, the split skirt.
TORSO = [
    ".abbbbbccccccc.",
    "aabbbbbcccccccd",
    ".aabbbbccccccc.",
    "..alrbbbccccc..",
    "..abVrbbccccc..",
    "..abblrbccccc..",
    "..abbbVrccccc..",
    "..abbbblrcccc..",
    "..abbbbbVrcVc..",
    "..abbbbbblrWc..",
    "..kllllyzylVk..",
    "..kqqkkyxykVk..",
    ".aqrqbbAcccWcc.",
    ".aabbbA.AccVcc.",
]

# 7 × 14: grey trousers into a chunky boot with a turned cuff, the toe to the right.
LEG = [
    "fgGG...",
    "fgGG...",
    "fgGG...",
    "fggG...",
    "fggG...",
    "lqqqq..",
    "kVrrV..",
    "klrrq..",
    "klrrq..",
    "kVrrV..",
    "klrrq..",
    "klrrrq.",
    "klrrrrq",
    "kkkkkkk",
]

# The rear arm at rest: a pale sleeve, the bracer, the hand.
ARM_HANG = [
    "lrrq",
    "lVrq",
    "nNN.",
    "lrrq",
    "lrrq",
    "lVrq",
    "lrrq",
    "kllk",
    "lrr.",
    "klr.",
]

# 8 × 12: the quiver on the back, tilted, its arrows fanned above the shoulder.
QUIVER = [
    ".F..F...",
    "FvF.vF..",
    ".vF.Fv..",
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

HAND = ["rq", "lr", "kl"]  # dark leather gloves

ROOT_X, GROUND = 40, 64
#: Where the pieces sit (top-left of each sprite), the body standing on the ground line.
AT = {"leg_far": (34, 50), "leg_near": (41, 50), "torso": (33, 37), "head": (30, 19), "arm_hang": (31, 40), "quiver": (22, 27)}
SHOULDER_BOW = (47, 41)
SHOULDER_DRAW = (36, 41)


# Kneeling: the front leg's thigh comes forward, the boot planted; the back knee on the ground, the shin behind.
KNEEL_FRONT = [
    "fgGGGG...",
    "fggGGG...",
    "...lqqqq.",
    "...kyrry.",
    "...klrrq.",
    "...klrrq.",
    "...klrrrq",
    "...klrrrq",
    "...kkkkkk",
]
KNEEL_BACK = [
    ".....fgGG",
    ".....fgGG",
    ".....fgGG",
    "qrrrlkfgG",
    "krrrlkfgg",
    "kkkkkkkkk",
]
# Hurt: the brows go up and the eyes squeeze shut.
HEAD_PAIN = {10: "Aaabbo" + "hsoosssssoos" + "occ", 11: "Aaabbo" + "hsssoossoosh" + "occ"}
FLASK = [".z.", "rqr", "qrq", "lql"]
CALTROPS = ["W.V", ".V.", "V.W"]


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
            hi, mid, lo = ("ink", 3), ("ink", 3), ("ink", 2)
        elif k >= n - 2:
            hi, mid, lo = ("leather", 2), ("leather", 2), ("leather", 2)
        else:
            hi, mid, lo = ("leather", 4), ("leather", 3), ("leather", 2)
        if flat:
            part.put(x, y - 1, hi), part.put(x, y, mid), part.put(x, y + 1, lo)
        else:
            part.put(x + 1, y, hi), part.put(x, y, mid), part.put(x - 1, y, lo)


Vec = tuple[float, float]


def _dir(aim: float) -> Vec:
    """The aiming direction: 0° straight ahead (right), positive up."""
    a = math.radians(aim)
    return (math.cos(a), -math.sin(a))


def _r(v: Vec) -> tuple[int, int]:
    return (int(round(v[0])), int(round(v[1])))


def _lerp(a: Vec, b: Vec, t: float) -> Vec:
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def bow_points(grip: Vec, aim: float, draw: float, half: int = 17) -> list[tuple[int, int]]:
    """The bow's back from the top tip to the bottom tip: the grip furthest forward, the limbs sweeping back to tips
    that curl forward again. Drawing it bends the limbs hard: the tips come in and back (a full draw takes 2 px
    off each limb and pulls the tips 7 px further back)."""
    d = _dir(aim)
    u = (-d[1], -d[0]) if False else (math.sin(math.radians(aim)) * -1, -math.cos(math.radians(aim)))
    reach = half - 2.0 * draw
    out: list[tuple[int, int]] = []
    steps = int(reach * 2)
    for k in range(steps, -steps - 1, -1):
        j = k / 2
        s = abs(j) / reach
        back = 7.0 * s ** 1.6 + 7.0 * draw * s * s
        curl = 3.4 * max(0.0, (s - 0.74) / 0.26) ** 1.4
        off = back - curl
        pt = _r((grip[0] + u[0] * j - d[0] * off, grip[1] + u[1] * j - d[1] * off))
        if not out or out[-1] != pt:
            out.append(pt)
    return out


def draw_bow(cel: Cel, grip: Vec, aim: float, draw: float, nock: tuple[int, int] | None) -> None:
    d = _dir(aim)
    pts = bow_points(grip, aim, draw)
    g = _r(grip)
    bow = Part()
    for x, y in pts:
        dist = math.hypot(x - g[0], y - g[1])
        band = int(dist // 3) % 2 == 0
        wrap = dist <= 2.4
        bow.put(x, y, ("crimson", 3) if wrap else ("leather", 4 if band else 3))
        bow.put(x - d[0], y - d[1], ("crimson", 2) if wrap else ("leather", 2))
    top, bottom = pts[0], pts[-1]
    string = Part()
    spans = ((top, nock), (nock, bottom)) if nock is not None else ((top, bottom),)
    for a, b in spans:
        for x, y in _line(a, b):
            string.put(x, y, INK)
    string.lay(cel, outline=False)
    bow.lay(cel)


def draw_arrow(cel: Cel, nock: tuple[int, int], grip: Vec, aim: float) -> None:
    """The nocked arrow, from the string past the bow: a long shaft, an iron head, crimson fletching."""
    d = _dir(aim)
    n = (-d[1], d[0])
    tip = (grip[0] + d[0] * 6, grip[1] + d[1] * 6)
    a = Part()
    for x, y in _line(nock, _r(tip)):
        a.put(x, y, ("leather", 4))
    for k, tone in ((0, ("ink", 8)), (1, ("ink", 8)), (2, ("ink", 7))):
        a.put(tip[0] + d[0] * (2 - k), tip[1] + d[1] * (2 - k), tone)
    a.put(tip[0] + n[0], tip[1] + n[1], ("ink", 6))
    a.put(tip[0] - n[0], tip[1] - n[1], ("ink", 6))
    for k in (1, 2, 3):
        a.put(nock[0] + d[0] * k + n[0], nock[1] + d[1] * k + n[1], ("crimson", 4))
        a.put(nock[0] + d[0] * k - n[0], nock[1] + d[1] * k - n[1], ("crimson", 2))
    a.lay(cel)


def cape(cel: Cel, ox: int, oy: int, phase: float, swing: float, flare: float) -> None:
    """The cape behind the body, down to the calves: dark, a lighter edge at the back, a torn hem; its lower half
    sways, and it streams back (`flare`) when she runs or leaps."""
    p = Part()
    rows = 20
    for r in range(rows):
        sway = round(swing * math.sin(math.tau * (phase - r * 0.045)) * (r / rows) ** 1.5 + flare * (r / rows) ** 1.2)
        left = 29 - min(r // 4, 3) - sway
        right = 45 + (1 if r > 9 else 0) - (sway // 2)
        for x in range(left, right + 1):
            if r >= rows - 4 and (x * 7 + sway) % 5 < (r - (rows - 5)):
                continue  # the hem, torn
            fold = (x - left) % 5 == 3
            tone = ("moss", 2) if x - left < 2 else ("moss", 0) if fold else ("moss", 1)
            p.put(ox + x, oy + 38 + r - round(flare * 0.3 * (r / rows)), tone)
    p.lay(cel)


def _legs(cel: Cel, p: Pose, lx: int, ly: int) -> None:
    mode = p.get("legs", "stand")
    if mode == "kneel":
        for rows, at in ((KNEEL_BACK, (31 + lx, 58)), (KNEEL_FRONT, (41 + lx, 55))):
            part = Part()
            part.stamp(rows, *at)
            part.lay(cel)
        return
    if mode == "run":
        t = p.get("run", 0.0)
        c, s_ = math.cos(math.tau * t), math.sin(math.tau * t)
        place = {"leg_far": (round(-3 * c), round(3 * max(0.0, s_))), "leg_near": (round(3 * c), round(3 * max(0.0, -s_)))}
    elif mode == "air":
        place = {"leg_far": (-1, 3), "leg_near": (1, 2)}
    else:
        place = {"leg_far": (0, 0), "leg_near": (0, 0)}
    for name in ("leg_far", "leg_near"):
        x, y = AT[name]
        dx, lift = place[name]
        part = Part()
        part.stamp(LEG[lift:], x + lx + dx, y + ly + lift - lift)  # a lifted leg keeps its hip and loses its length
        part.lay(cel)


def _held(cel: Cel, what: str, at: tuple[int, int]) -> None:
    part = Part()
    x, y = at
    if what == "flask":
        part.stamp(FLASK, x - 1, y - 4)
        part.lay(cel)
        cel.put(x, y - 5, ("brass", 7))
        cel.put(x, y - 6, ("crimson", 6))
        return
    if what == "caltrops":
        part.stamp(CALTROPS, x, y - 1)
    elif what == "fist":
        for k, ox in enumerate((-1, 0, 1)):
            for i in range(1, 12):
                part.put(x + ox + (k - 1) * i * 0.15, y - i, ("leather", 4) if i < 9 else ("crimson", 4 if k % 2 else 3))
    elif what == "point":
        part.put(x + 1, y, ("leather", 3))
        part.put(x + 2, y, ("leather", 3))
    part.lay(cel)


def _draw_figure(cel: Cel, p: Pose) -> None:
    x = round(p.get("x", 0.0))
    y = round(p.get("y", 0.0))
    bob = round(p.get("bob", 0.0))
    crouch = round(p.get("crouch", 0.0))
    ux, uy = x, -y + bob + crouch  # the upper body
    free = p.get("free", "hang")

    def at(name: str) -> tuple[int, int]:
        ax, ay = AT[name]
        return ax + ux, ay + uy

    cape(cel, ux, uy, p.get("cape", 0.0), p.get("swing", 1.2), p.get("flare", 0.0))
    part = Part()
    part.stamp(QUIVER, *at("quiver"))
    part.lay(cel)
    _legs(cel, p, x, -y)
    part = Part()
    part.stamp(TORSO, *at("torso"))
    part.lay(cel)
    if free == "hang":
        part = Part()
        part.stamp(ARM_HANG, *at("arm_hang"))
        part.lay(cel)
    head = HEAD
    if p.get("pain", 0.0) > 0.5:
        head = [HEAD_PAIN.get(j, row) for j, row in enumerate(HEAD)]
    elif p.get("blink", 0.0) > 0.5:
        head = [HEAD_BLINK.get(j, row) for j, row in enumerate(HEAD)]
    hx0, hy0 = at("head")

    def draw_head() -> None:
        part = Part()
        part.stamp(head, hx0, hy0 + round(p.get("nod", 0.0)))
        part.lay(cel)

    # The bow arm: bent at rest with the bow upright beside her; straight out along the aim to shoot.
    aim = p.get("aim", 0.0)
    raise_ = p.get("raise", 0.0)
    draw = p.get("draw", 0.0)
    S = (SHOULDER_BOW[0] + ux, SHOULDER_BOW[1] + uy)
    d = _dir(aim)
    hand = _lerp((S[0] + 7, S[1] + 4), (S[0] + d[0] * 11, S[1] + d[1] * 11), raise_)
    elbow = _lerp((S[0] + 4, S[1] + 5), (S[0] + d[0] * 5.5, S[1] + d[1] * 5.5), raise_)
    bow_aim = aim * raise_ + p.get("tilt", 0.0)
    bd = _dir(bow_aim)
    grip = (hand[0] + bd[0] * 2, hand[1] + bd[1] * 2)

    # The string hand: from the grip back along the aim — a full draw brings it 17 px back, to the cheek.
    nock = None
    string_hand = None
    if free == "string":
        pull = 4.0 + 13.0 * draw + p.get("snap", 0.0) * 5.0
        string_hand = (grip[0] - bd[0] * pull, grip[1] - bd[1] * pull - p.get("snap", 0.0) * 1.0)
        if draw > 0.02 and p.get("snap", 0.0) < 0.5:
            nock = _r(string_hand)

    def draw_bow_arm() -> None:
        part = Part()
        arm(part, [_r(S), _r(elbow), _r(hand)])
        part.lay(cel)
        draw_bow(cel, grip, bow_aim, draw if nock is not None else 0.0, nock)
        if p.get("arrow", 0.0) > 0.5 and nock is not None:
            draw_arrow(cel, nock, grip, bow_aim)
        part = Part()
        part.stamp(HAND, _r(hand)[0], _r(hand)[1] - 1)
        part.lay(cel)

    sh = (SHOULDER_DRAW[0] + ux, SHOULDER_DRAW[1] + uy)
    if string_hand is not None:
        h = string_hand
        mid = ((sh[0] + h[0]) / 2, (sh[1] + h[1]) / 2 + 2)
        el = _lerp(mid, (h[0] - bd[0] * 6, h[1] - bd[1] * 6 - 1), min(1.0, draw + p.get("snap", 0.0)))
    else:
        hx, hy = p.get("hand", (38.0, 50.0))
        h = (hx + ux, hy + uy)
        ex, ey = p.get("elb", (0.0, 2.0))
        el = ((sh[0] + h[0]) / 2 + ex, (sh[1] + h[1]) / 2 + ey)

    def draw_free_arm() -> None:
        part = Part()
        arm(part, [_r(sh), _r(el), _r(h)], sleeve=3)
        part.lay(cel)
        part = Part()
        part.stamp(HAND, _r(h)[0] - 1, _r(h)[1] - 1)
        part.lay(cel)
        held = p.get("held")
        if held:
            _held(cel, held, _r(h))

    # The head is a third of her: what rises above the shoulders (a bow aimed at the sky, an arm thrown back or
    # reaching for the quiver) passes BEHIND it, as if on her far side, so it never covers her face.
    bow_behind = bow_aim > 20.0
    free_behind = free != "hang" and (bow_behind if string_hand is not None else h[1] < sh[1] - 5)
    if bow_behind:
        draw_bow_arm()
    if free_behind:
        draw_free_arm()
    draw_head()
    if not bow_behind:
        draw_bow_arm()
    if free != "hang" and not free_behind:
        draw_free_arm()


def _rotate(src: Cel, deg: float, pivot: Vec) -> dict[tuple[int, int], Tone]:
    """The figure turned `deg` counter-clockwise about `pivot` (she falls backwards), nearest pixel, then dropped
    so it rests on the ground."""
    a = math.radians(deg)
    ca, sa = math.cos(a), math.sin(a)
    cx, cy = pivot
    fwd = [(cx + (x + 0.5 - cx) * ca + (y + 0.5 - cy) * sa, cy - (x + 0.5 - cx) * sa + (y + 0.5 - cy) * ca) for (x, y) in src.px]
    x0, x1 = int(min(f[0] for f in fwd)) - 1, int(max(f[0] for f in fwd)) + 2
    y0, y1 = int(min(f[1] for f in fwd)) - 1, int(max(f[1] for f in fwd)) + 2
    out: dict[tuple[int, int], Tone] = {}
    for Y in range(y0, y1):
        for X in range(x0, x1):
            dx, dy = X + 0.5 - cx, Y + 0.5 - cy
            sx = cx + dx * ca - dy * sa
            sy = cy + dx * sa + dy * ca
            t = src.px.get((int(math.floor(sx)), int(math.floor(sy))))
            if t is not None:
                out[(X, Y)] = t
    low = max(yy for _, yy in out) if out else 0
    drop = (GROUND - 1) - low
    # …and slid back over her own place as she goes down, so she lies where she stood (not off the frame's edge).
    xs = [xx for xx, _ in out] or [cx]
    slide = round((cx - (min(xs) + max(xs)) / 2) * min(1.0, abs(deg) / 90.0))
    return {(xx + slide, yy + drop): t for (xx, yy), t in out.items()}


def figure(cel: Cel, p: Pose) -> None:
    rot = p.get("rot", 0.0)
    if abs(rot) < 0.5:
        _draw_figure(cel, p)
        return
    tmp = Cel(cel.w, cel.h, cel.top)
    _draw_figure(tmp, p)
    for (x, y), t in _rotate(tmp, rot, (ROOT_X, GROUND)).items():
        cel.put(x, y, t)


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


# ── animations: every one keyed frame by frame (nothing tweened), with the game's names, frame counts and timings ──


def frames(name: str, poses: list[Pose], ms: list[int], loop: bool) -> Anim:
    assert len(poses) == len(ms), name
    n = len(poses)

    def at(t: float) -> Pose:
        i = int(t * n) % n if loop else min(n - 1, max(0, round(t * (n - 1))))
        return dict(poses[i])

    times = [i / n for i in range(n)] if loop else [i / (n - 1) for i in range(n)]
    return Anim(name, at, times, ms, loop)


def _cape(poses: list[Pose], swing: float = 1.3) -> list[Pose]:
    n = len(poses)
    return [{"cape": i / n, "swing": swing, **p} for i, p in enumerate(poses)]


IDLE = _cape([{"bob": 1.0 if 6 <= i < 11 else 0.0, "blink": 1.0 if i == 9 else 0.0} for i in range(12)])

RUN = []
for i in range(12):
    t = i / 12
    s2 = math.sin(math.tau * t)
    RUN.append({
        "legs": "run", "run": t, "x": 1.0, "bob": 1.0 if math.cos(2 * math.tau * t) > 0.5 else 0.0,
        "cape": 2 * t, "swing": 2.4, "flare": 4.0, "raise": 0.0, "tilt": -10.0,
        "free": "pump", "hand": (35.0 - 4.0 * s2, 48.0 - abs(2.0 * s2)), "elb": (-1.0 - 2.0 * s2, 1.0),
    })


def shot(aim: float = 0.0, full: float = 1.0, extra: dict | None = None, hold: int = 2, kneel: bool = False) -> list[Pose]:
    """A shot in fifteen frames, the loose on the eleventh (the game's release): raise, take the string, nock, a
    long hard draw to the ear as she leans back into it, the hold, the snap of the loose — the string hand flung
    back, the cape whipping — the follow-through, and the bow coming down."""
    E = extra or {}
    k = {"crouch": 6.0, "legs": "kneel"} if kneel else {}
    half = {"crouch": 3.0} if kneel else {}
    draw = [0.0, 0.0, 0.0, 0.05, 0.3, 0.55, 0.8, full, full, full]
    keys: list[Pose] = [
        {},
        {"raise": 0.5, "aim": aim, **half},
        {"raise": 1.0, "aim": aim, "free": "string", "draw": 0.0, **k},
        {"raise": 1.0, "aim": aim, "free": "string", "draw": 0.05, "arrow": 1.0, **k},
        {"raise": 1.0, "aim": aim, "free": "string", "draw": 0.3, "arrow": 1.0, **k},
        {"raise": 1.0, "aim": aim, "free": "string", "draw": 0.55, "arrow": 1.0, "x": -1.0, **k},
        {"raise": 1.0, "aim": aim, "free": "string", "draw": 0.8, "arrow": 1.0, "x": -1.0, **k},
        {"raise": 1.0, "aim": aim, "free": "string", "draw": full, "arrow": 1.0, "x": -2.0, **k},
        {"raise": 1.0, "aim": aim, "free": "string", "draw": full, "arrow": 1.0, "x": -2.0, "nod": 1.0, **k},
        {"raise": 1.0, "aim": aim, "free": "string", "draw": full, "arrow": 1.0, "x": -2.0, "nod": 1.0, **k},
        {"raise": 1.0, "aim": aim + 3.0, "free": "string", "draw": 0.0, "snap": 1.0, "x": -1.0, "swing": 3.4, **k},
        {"raise": 1.0, "aim": aim + 1.0, "free": "string", "draw": 0.0, "snap": 1.4, "x": 0.0, "swing": 3.0, **k},
        {"raise": 0.75, "aim": aim, "free": "pump", "hand": (40.0, 44.0), "swing": 2.2, **k},
        {"raise": 0.35, "aim": aim, **half},
        {},
    ]
    del draw, hold
    return _cape([{**key, **E} for key in keys])


def quick() -> list[Pose]:
    """Two snap shots off a two-thirds draw, the second hard on the first."""
    s = {"raise": 1.0, "free": "string", "arrow": 1.0}
    keys = [
        {}, {"raise": 0.7}, {**s, "draw": 0.05}, {**s, "draw": 0.65, "x": -1.0}, {**s, "draw": 0.65, "x": -1.0},
        {"raise": 1.0, "free": "string", "draw": 0.0, "snap": 1.0, "swing": 3.0}, {**s, "draw": 0.05},
        {**s, "draw": 0.4}, {**s, "draw": 0.65, "x": -1.0}, {**s, "draw": 0.65, "x": -1.0},
        {"raise": 1.0, "free": "string", "draw": 0.0, "snap": 1.0, "swing": 3.0},
        {"raise": 1.0, "free": "string", "draw": 0.0, "snap": 1.3, "swing": 2.6}, {"raise": 0.7}, {"raise": 0.3}, {},
    ]
    return _cape(keys)


def skip() -> list[Pose]:
    """She springs back off the front foot, draws in the air, lands and looses, then steps back to her place."""
    s = {"raise": 1.0, "free": "string", "arrow": 1.0}
    keys = [
        {}, {"crouch": 2.0, "raise": 0.3}, {"y": 4.0, "x": -2.0, "legs": "air", "raise": 0.7, "flare": 3.0},
        {"y": 6.0, "x": -4.0, "legs": "air", **s, "draw": 0.1, "flare": 4.0}, {"y": 5.0, "x": -6.0, "legs": "air", **s, "draw": 0.45, "flare": 3.0},
        {"y": 2.0, "x": -7.0, "legs": "air", **s, "draw": 0.75, "flare": 2.0}, {"x": -7.0, "crouch": 2.0, **s, "draw": 1.0},
        {"x": -7.0, "crouch": 1.0, **s, "draw": 1.0}, {"x": -7.0, **s, "draw": 1.0, "nod": 1.0}, {"x": -7.0, **s, "draw": 1.0, "nod": 1.0},
        {"x": -6.0, "raise": 1.0, "free": "string", "draw": 0.0, "snap": 1.0, "swing": 3.4},
        {"x": -6.0, "raise": 1.0, "free": "string", "draw": 0.0, "snap": 1.4, "swing": 3.0},
        {"x": -4.0, "raise": 0.6, "legs": "run", "run": 0.25}, {"x": -2.0, "raise": 0.3, "legs": "run", "run": 0.75}, {},
    ]
    return _cape(keys)


def lob() -> list[Pose]:
    """Tar Flask: the flask from the belt, back behind her head, and lobbed high and long."""
    f = {"free": "pump", "held": "flask"}
    keys = [
        {}, {**f, "hand": (38.0, 50.0)}, {**f, "hand": (31.0, 46.0), "elb": (-1.0, 2.0)}, {**f, "hand": (28.0, 32.0), "elb": (-3.0, 1.0), "x": -1.0},
        {**f, "hand": (27.0, 29.0), "elb": (-3.0, 1.0), "x": -2.0}, {**f, "hand": (27.0, 29.0), "elb": (-3.0, 1.0), "x": -2.0},
        {"free": "pump", "hand": (54.0, 27.0), "elb": (0.0, -2.0), "x": 2.0, "swing": 3.0},
        {"free": "pump", "hand": (57.0, 38.0), "x": 2.0, "swing": 2.6}, {"free": "pump", "hand": (50.0, 48.0), "x": 1.0}, {"free": "pump", "hand": (40.0, 50.0)}, {},
    ]
    return _cape(keys)


def sow() -> list[Pose]:
    """Caltrops: she crouches and sows them underhand in one low sweep across the ground ahead."""
    c = {"free": "pump", "held": "caltrops", "crouch": 3.0}
    keys = [
        {}, {**c, "hand": (37.0, 50.0), "crouch": 1.0}, {**c, "hand": (31.0, 52.0)}, {**c, "hand": (29.0, 53.0), "x": -1.0}, {**c, "hand": (29.0, 53.0), "x": -1.0},
        {"free": "pump", "crouch": 4.0, "hand": (50.0, 56.0), "x": 2.0, "swing": 2.6}, {"free": "pump", "crouch": 4.0, "hand": (56.0, 52.0), "x": 2.0},
        {"free": "pump", "crouch": 3.0, "hand": (54.0, 50.0), "x": 1.0}, {"free": "pump", "crouch": 2.0, "hand": (46.0, 50.0)}, {"free": "pump", "crouch": 1.0, "hand": (40.0, 50.0)}, {},
    ]
    return _cape(keys)


def point() -> list[Pose]:
    """Mark of the Hunter: she levels her arm at the quarry and holds it there."""
    pt = {"free": "pump", "held": "point", "hand": (59.0, 36.0), "elb": (0.0, 0.0), "x": 1.0}
    keys = [{}, {"free": "pump", "hand": (44.0, 44.0)}, {"free": "pump", "hand": (53.0, 38.0)}, pt, {**pt, "nod": 1.0}, {**pt, "nod": 1.0}, pt, pt,
            {"free": "pump", "hand": (50.0, 44.0)}, {"free": "pump", "hand": (40.0, 50.0)}, {}]
    return _cape(keys)


def haste() -> list[Pose]:
    """Rapid Fire: over the shoulder to the quiver, a fistful of arrows pulled out, snapped down to the string."""
    keys = [
        {}, {"free": "pump", "hand": (36.0, 40.0)}, {"free": "pump", "hand": (31.0, 31.0), "elb": (-2.0, 0.0)},
        {"free": "pump", "hand": (28.0, 27.0), "elb": (-3.0, 0.0), "nod": 1.0},
        {"free": "pump", "hand": (30.0, 22.0), "elb": (-3.0, 0.0), "held": "fist"},
        {"free": "pump", "hand": (33.0, 20.0), "elb": (-2.0, -1.0), "held": "fist"},
        {"free": "pump", "hand": (44.0, 36.0), "held": "fist", "raise": 0.6},
        {"raise": 1.0, "free": "string", "draw": 0.1, "arrow": 1.0}, {"raise": 1.0, "free": "string", "draw": 0.1, "arrow": 1.0},
        {"raise": 0.5}, {},
    ]
    return _cape(keys)


HURT = _cape([{}, {"x": -2.0, "pain": 1.0, "flash": 1.0, "swing": 3.0}, {"x": -3.0, "pain": 1.0, "bob": 1.0, "flash": 0.4, "swing": 3.0},
              {"x": -3.0, "pain": 1.0, "bob": 1.0}, {"x": -2.0, "pain": 1.0}, {"x": -1.0}, {"x": -1.0}, {}, {}])

DEATH = _cape([{}, {"x": -2.0, "pain": 1.0, "flash": 1.0}, {"x": -3.0, "pain": 1.0, "rot": 8.0}, {"x": -4.0, "pain": 1.0, "rot": 20.0},
               {"x": -4.0, "pain": 1.0, "rot": 36.0}, {"x": -4.0, "pain": 1.0, "rot": 56.0}, {"x": -4.0, "pain": 1.0, "rot": 76.0},
               {"x": -4.0, "pain": 1.0, "rot": 90.0}, {"x": -4.0, "pain": 1.0, "rot": 86.0}, {"x": -4.0, "pain": 1.0, "rot": 90.0}]
              + [{"x": -4.0, "pain": 1.0, "rot": 90.0, "swing": 0.0}] * 5)

SHOT_MS = [90, 70, 70, 70, 80, 80, 90, 110, 140, 160, 50, 60, 80, 90, 120]
ANIMS = {
    "idle": frames("idle", IDLE, [170] * 12, True),
    "run": frames("run", RUN, [59] * 12, True),
    "attack": frames("attack", shot(), SHOT_MS, False),
    "volley": frames("volley", shot(aim=38.0), SHOT_MS, False),
    "quick": frames("quick", quick(), [60, 50, 50, 50, 60, 45, 50, 50, 50, 60, 45, 60, 70, 80, 100], False),
    "attack2": frames("attack2", shot(kneel=True), [80, 60, 70, 60, 70, 70, 80, 100, 120, 150, 50, 60, 90, 90, 110], False),
    "attack3": frames("attack3", skip(), [80, 60, 70, 60, 60, 70, 80, 90, 120, 150, 50, 60, 90, 90, 110], False),
    "aimed": frames("aimed", shot(aim=2.0, full=1.15, extra={"crouch": 1.0}), [80, 70, 80, 70, 80, 90, 100, 120, 150, 180, 50, 70, 90, 90, 120], False),
    "lob": frames("lob", lob(), [60, 50, 60, 70, 90, 110, 40, 60, 100, 100, 110], False),
    "sow": frames("sow", sow(), [60, 50, 60, 70, 90, 110, 40, 60, 100, 100, 110], False),
    "point": frames("point", point(), [70, 60, 80, 110, 40, 90, 100, 100, 110, 90, 100], False),
    "haste": frames("haste", haste(), [70, 70, 90, 120, 40, 80, 100, 50, 70, 90, 100], False),
    "hurt": frames("hurt", HURT, [50, 40, 100, 60, 90, 60, 80, 60, 70], False),
    "death": frames("death", DEATH, [50, 40, 70, 70, 80, 80, 90, 70, 60, 70, 90, 120, 160, 1200, 300], False),
}
