"""Time Imp — the companion that stretches the time away. A violet imp with bone horns, brass eyes and a grin of
small teeth, hanging in the air on a pair of dark little bat wings with an HOURGLASS hugged to its side: brass
ends, blue glass, gold sand. It never lands and it never lets the glass run out.

The hourglass is its whole character. The sand runs while it hovers (a grain falls); every so often it turns the
glass over to start it again — the glass goes on its side and comes up with the sand on top. A boss falling makes
it spin the glass end over end above its head; a chest dropping makes it shake the glass hard, sand flying; a
level gained gets one neat turn and a glint, as if it had been keeping the time. When the party falls it comes
down to sit on the path with the glass in its lap, on its side — stopped.

Seen from the front. Its origin is the point under its feet. Clips: see pets/__init__. Drawn facing right; the
game mirrors it (the glass changes side)."""
from __future__ import annotations

import math

from ..rig import Cel, Character, Pose, Pt, Tone
from . import cycle, held

PET = "TimeImp"

OX, OY = 32, 44

L: dict[str, Tone] = {
    "h": ("bone", 6), "V": ("violet", 5), "v": ("violet", 3), "E": ("violet", 4), "m": ("violet", 1), "w": ("light", 0),
    "g": ("brass", 4), "G": ("azure", 7), "s": ("brass", 6), "x": ("azure", 4),
}
# The head: horns, pointed ears out to the sides, a grin. 12 wide, 9 tall; the eyes are drawn on.
HEAD = [
    ".h........h.",
    ".hh......hh.",
    "..hVVVVVVh..",
    ".VVVVVVVVVV.",
    "EEVVVVVVVVEE",
    ".EVVVVVVVVE.",
    "..VVVVVVVV..",
    "..VVVVVVVV..",
    "...VwmwmwV..",
]
BODY = [
    ".vVVVVv.",
    ".VVVVVV.",
    "vVVVVVVv",
    "vVVVVVVv",
    ".vVVVVv.",
]
FEET = ".VV..VV."
# The hourglass, standing (sand above, below, or both) and on its side. 6 wide and 7 tall standing.
GLASS = {
    "top": ["gggggg", "GssssG", ".GssG.", "..ss..", ".G..G.", "Gx..xG", "gggggg"],
    "run": ["gggggg", "Gs..sG", ".GssG.", "..ss..", ".G.sG.", "GssssG", "gggggg"],
    "low": ["gggggg", "Gx..xG", ".G..G.", "..ss..", ".GssG.", "GssssG", "gggggg"],
    "side": ["gG...Gg", "gsG.Gxg", "gssss.g", "gsG.Gxg", "gG...Gg"],
}
# A wing in its three states, as the one on the right of the picture; `at` is the pixel at the shoulder.
WINGS = {
    "up": (["...vE", "..vEE", ".vEE.", "vEv..", "v...."], (0, 4)),
    "mid": (["vEEE.", "vEvEv", ".v.v."], (0, 0)),
    "down": (["v....", "vEv..", ".vEEv", "..vEE", "...v."], (0, 0)),
}
FLUTTER = ("up", "mid", "down", "mid")


class TimeImp(Character):
    W, H, TOP = 64, 56, 0

    def joints(self, pose: Pose) -> dict[str, Pt]:
        return {"feet": (OX + pose.get("dx", 0.0), OY + pose.get("dy", 0.0))}

    def draw(self, cel, J, pose, ropes, between) -> None:
        fx, fy = J["feet"]
        x0, base = int(round(fx)), int(round(fy))
        sit = int(pose.get("sit", 0))  # on the path: its legs out in front, a pixel lower
        left, top = x0 - 6, base - 15 + sit  # the head's top-left; the body hangs under it
        bx, by = left + 2, top + 9
        # Wings behind its shoulders.
        rows, (ox, oy) = WINGS[pose.get("wing", "up")]
        droop = int(pose.get("droop", 0))
        for side in (-1, 1):
            sx = bx + (7 if side > 0 else 0)
            for j, row in enumerate(rows):
                for i, ch in enumerate(row):
                    if ch != ".":
                        cel.put(sx + side * (i - ox + 1), by + 1 + j - oy + droop * 3, L[ch])
        # The tail: a thin whip from its seat, ending in a spade.
        sway = pose.get("sway", 0.0)
        pts = [(bx + 1.0 - t * 5.0 - sway * t, by + 4.0 + math.sin(t * math.pi) * 2.5 - t * (1.5 + sway)) for t in (0.0, 0.2, 0.4, 0.6, 0.8, 1.0)]
        for a, b in zip(pts, pts[1:]):
            cel.line(a, b, L["E"])
        tx, ty = pts[-1]
        for dx, dy in ((0, 0), (-1, -1), (-1, 1), (-2, 0)):
            cel.put(tx + dx, ty + dy, L["v"])
        cel.stamp(BODY, L, bx, by)
        if sit:
            cel.stamp(["VV....VV"], L, bx, by + 5)
        else:
            cel.stamp([FEET], L, bx, by + 5)
        hx, hy = left + int(pose.get("look", 0)), top + int(pose.get("nod", 0))
        cel.stamp(HEAD, L, hx, hy)
        eyes = pose.get("eyes", "open")
        for ex in (3, 7):
            if eyes == "shut":
                cel.put(hx + ex, hy + 6, L["m"])
                cel.put(hx + ex + 1, hy + 6, L["m"])
            else:
                hot = eyes == "wide"
                cel.put(hx + ex, hy + 5, ("brass", 7 if hot else 6))
                cel.put(hx + ex + 1, hy + 5, ("brass", 7 if hot else 6))
                cel.put(hx + ex, hy + 6, ("brass", 6))
                cel.put(hx + ex + 1, hy + 6, ("ink", 0))
                if hot:
                    cel.put(hx + ex, hy + 4, ("brass", 7))
                    cel.put(hx + ex + 1, hy + 4, ("brass", 7))
        # The hourglass: hugged to its side, held overhead, or in its lap.
        glass = GLASS[pose.get("glass", "run")]
        hold = pose.get("hold", "side")
        gw, gh = len(glass[0]), len(glass)
        if hold == "over":
            gx, gy = x0 - gw // 2, top - gh - 1 + int(pose.get("gdy", 0))
        elif hold == "lap":
            gx, gy = x0 - gw // 2 + 1, base - gh + sit
        else:
            gx, gy = bx + 5 + int(pose.get("gdx", 0)), by - 1 + int(pose.get("gdy", 0)) + (1 if gh < 7 else 0)
        cel.stamp(glass, L, gx, gy)
        if hold == "side":  # an arm round it
            cel.put(gx - 1, gy + gh // 2, L["V"])
            cel.put(gx, gy + gh // 2, L["V"])
        elif hold == "over":  # both arms up to it
            for ax in (bx, bx + 7):
                cel.put(ax, by - 1, L["V"])
                cel.put(ax, hy + 1, L["V"])
        if pose.get("grain", 0) and gh == 7:  # a grain on its way down
            cel.put(gx + 2 + int(pose.get("grain", 0)) % 2, gy + 4, L["s"])
        cel.outline()
        for i, (dx, dy) in enumerate(((3, -2), (-2, 3), (5, 4))[: int(pose.get("spill", 0))]):  # sand shaken loose
            cel.put(gx + gw + dx, gy + dy, L["s"] if i % 2 == 0 else ("brass", 7))
        spark = pose.get("spark", 0.0)
        if spark > 0.05:
            cel.star(gx + gw + 2, gy - 3, 3 if spark > 0.6 else 1)


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, dy=0.0, wing="up", droop=0, sway=0.0, look=0, nod=0, eyes="open", glass="run", hold="side", gdx=0, gdy=0, grain=0, spill=0, sit=0, spark=0.0, flash=0.0)


def k(**over: object) -> Pose:
    return {**BASE, **over}


def flutter(ph: float, beats: int = 2) -> str:
    return FLUTTER[int(ph * beats * len(FLUTTER)) % len(FLUTTER)]


def hover_pose(ph: float) -> Pose:
    return k(dy=round(1.3 * math.sin(math.tau * ph)), wing=flutter(ph), sway=math.sin(math.tau * ph), grain=1 + int(ph * 4) % 2)


def fly_pose(ph: float) -> Pose:
    return k(dy=round(1.0 * math.sin(math.tau * ph)), wing=flutter(ph, 3), sway=-1.0, look=1, grain=1 + int(ph * 4) % 2)


def sink_pose(ph: float) -> Pose:
    return k(wing=flutter(ph), eyes="shut", glass="low")


W4 = ("up", "mid", "down", "mid")
# Now and then: it turns the glass over — on its side, and up again with the sand on top.
FIDGET = [(k(glass="low", wing=W4[0], look=1), 120), (k(glass="low", wing=W4[1], gdy=-1), 90), (k(glass="side", wing=W4[2], gdy=-1), 110), (k(glass="side", wing=W4[3], gdy=-2), 90),
          (k(glass="top", wing=W4[0], gdy=-1, spark=1.0), 110), (k(glass="top", wing=W4[1], spark=0.4), 110), (k(glass="top", wing=W4[2], grain=1), 120), (k(glass="run", wing=W4[3], grain=2), 100)]

# A boss has fallen: the glass goes up over its head and it spins it end over end, grinning.
SPIN = ("top", "side", "low", "side")
CHEER = [(k(hold="over", glass="run", wing="mid"), 60)] + [
    (k(hold="over", glass=SPIN[i % 4], wing=W4[i % 4], dy=float((0, -2, -3, -2)[i % 4]), eyes="shut" if i % 4 in (1, 2) else "open", spark=1.0 if i % 4 in (0, 1) else 0.4, sway=float((-1, 1)[i % 2])), 76) for i in range(12)
] + [(k(hold="over", glass="top", wing="mid"), 70)]

# A chest has dropped: eyes wide, it shakes the glass hard — time is treasure — and sand flies.
SPOT = [(k(eyes="wide", wing="up", spark=1.0), 90)] + [
    (k(eyes="wide", wing=W4[i % 4], gdx=(1, -1)[i % 2], gdy=(-1, 0)[i % 2], dx=float((1, -1)[i % 2]), spill=1 + i % 3, look=1, spark=0.4 if i < 3 else 0.0), 78) for i in range(9)
] + [(k(look=1, wing="mid"), 90)]

# A hero has gained a level: one neat turn of the glass and a glint — right on time.
DING = [(k(glass="low", wing="up"), 80), (k(glass="side", wing="mid", gdy=-1), 100), (k(glass="top", wing="down", gdy=-1, spark=1.0), 130), (k(glass="top", wing="mid", spark=1.0, nod=1), 130), (k(glass="top", wing="up", spark=0.4), 110), (k(glass="run", wing="mid", grain=1), 90)]

# Touchdown (the party has fallen): it sits down hard, the glass tipping into its lap.
SETTLE = [(k(sit=1, wing="down", glass="low", eyes="shut"), 70), (k(sit=1, wing="down", droop=1, glass="side", hold="lap", eyes="shut"), 80), (k(sit=1, wing="down", droop=1, glass="side", hold="lap", eyes="shut", nod=1), 80)]
TAKEOFF = [(k(sit=1, wing="down", glass="low"), 60), (k(wing="up", dy=-1.0), 60)]
# The party has fallen: sitting on the path, wings hanging, the glass on its side in its lap — stopped.
SAT = dict(sit=1, wing="down", droop=1, glass="side", hold="lap", eyes="shut", sway=-1.0)
MOURN = [(k(**SAT, nod=1), 900), (k(**SAT), 700)]

ANIMS = {
    "idle": cycle("idle", hover_pose, 8, 62),
    "move": cycle("move", fly_pose, 8, 50),
    "land": cycle("land", sink_pose, 4, 58),
    "settle": held("settle", SETTLE, False),
    "takeoff": held("takeoff", TAKEOFF, False),
    "fidget": held("fidget", FIDGET, False),
    "cheer": held("cheer", CHEER, False),
    "spot": held("spot", SPOT, False),
    "ding": held("ding", DING, False),
    "mourn": held("mourn", MOURN, True),
}
