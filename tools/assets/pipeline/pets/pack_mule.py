"""Pack Mule — the companion that carries more chests. A small dun mule, half a hero high at the ears, with a dark
mane and a pale muzzle, under a pair of leather saddlebags with a brass buckle and a red bedroll strapped on top:
the load is most of what you see of it. It WALKS, and it never sits or lies down under a load: at rest it stands
behind the party, flicks an ear, swishes its tail, and every so often drops its head to crop at the ground. When
the party moves on it plods after them, head nodding with each stride, and stops where they stop.

A boss falling makes it throw its head up and bray, hopping on its forelegs; a chest dropping pricks its ears
and brings its head up high — more to carry; a level gained gets a nod and a swish of the tail. When the party
falls it folds its legs and lies down under its load, head on the ground.

One level body (with the load) on four legs the engine swings in diagonal pairs; the neck is a limb from the
shoulder to wherever the pose puts the head.

Its origin is the point under its hooves. Clips: see pets/__init__. Drawn facing right; the game mirrors it."""
from __future__ import annotations

import math

from ..rig import Cel, Character, Pose, Pt, Tone
from . import cycle, held

PET = "PackMule"

OX, OY = 32, 46

L: dict[str, Tone] = {
    "C": ("bone", 5), "D": ("bone", 3), "P": ("bone", 7), "m": ("ink", 2), "t": ("ink", 2),
    "L": ("leather", 5), "l": ("leather", 3), "b": ("brass", 5), "r": ("crimson", 3), "R": ("crimson", 5),
}
# The body under its load: the bedroll, the saddlebags hanging down its flank, its belly's shadow. 14 long, 8 tall.
BODY = [
    "....rrrrrr....",
    "...rRRRRRRr...",
    ".CCLLLLLLLLCC.",
    "CCClLLbLLLlCCC",
    "CCClLLLLLLlCCC",
    "CCCCllllllCCCC",
    ".DCCCCCCCCCCD.",
    "..DDDDDDDDDD..",
]
# The head, to the right: long ears, the mane behind its poll, a pale muzzle. 8 wide, 7 tall; the eye is drawn on.
HEAD = [
    ".m.m....",
    ".mCmC...",
    "mCCCCC..",
    "mCCCCCPP",
    ".CCCCPPP",
    "..CCCPPP",
    "...CPPP.",
]
HEAD_EARS_BACK = [
    "........",
    "mm......",
    "mCCCCC..",
    "mCCCCCPP",
    ".CCCCPPP",
    "..CCCPPP",
    "...CPPP.",
]
LEG = 6


class PackMule(Character):
    W, H, TOP = 64, 56, 0

    def joints(self, pose: Pose) -> dict[str, Pt]:
        return {"feet": (OX + pose.get("dx", 0.0), OY + pose.get("dy", 0.0))}

    def draw(self, cel, J, pose, ropes, between) -> None:
        fx, fy = J["feet"]
        x0, ground = int(round(fx)), int(round(fy))
        lying = pose.get("stance", "stand") == "lie"
        leg = 1 if lying else LEG
        left, top = x0 - 8, ground - leg - 8 + int(pose.get("load", 0))  # `load`: the body dips a pixel
        # The tail: a short rope with a dark tuft, hanging behind; it swishes.
        sway = pose.get("sway", 0.0)
        tx, ty = left + 0.5, top + 3.5
        for i in range(6):
            t = i / 5
            cel.put(tx - 1.0 - t * 1.5 - sway * t * 2.5, ty + t * (5.0 - abs(sway) * 1.5), L["C"] if i < 4 else L["t"])
        ph = pose.get("gait", None)
        if lying:  # legs folded under it: only the knees show
            for hx_ in (left + 2, left + 10):
                cel.put(hx_, ground - 1, L["D"])
                cel.put(hx_ + 1, ground - 1, L["C"])
                cel.put(hx_ + 2, ground - 1, ("ink", 1))
        else:
            # Four legs, diagonal pairs together; the far pair first, a pixel ahead, in shade. Hooves are dark.
            lifted = pose.get("stomp", 0.0)
            for far in (True, False):
                for n, (hip, lead) in enumerate(((left + 2.5, 0.0), (left + 11.0, 0.5))):
                    swing = 0.0 if ph is None else math.sin(math.tau * (ph + lead + (0.5 if far else 0.0)))
                    lift = 0.0 if ph is None else max(0.0, math.cos(math.tau * (ph + lead + (0.5 if far else 0.0))))
                    if n == 1 and not far:
                        lift = max(lift, lifted)  # the near foreleg, raised to stamp
                    hx_ = hip + (1.0 if far else 0.0)
                    foot = (hx_ + swing * 3.0, top + 8 + leg - 1.0 - lift * 1.8)
                    cel.limb((hx_, top + 7.0), foot, 2.4, 2.0, "bone", (2, 4, 4) if far else (3, 5, 5), far=far)
                    cel.put(foot[0], foot[1] + 0.5, ("ink", 1))
        cel.stamp(BODY, L, left, top)
        # The neck and head: `head` is how high it carries it (1 = up and alert, 0 = level, −1 = down at the ground).
        up = pose.get("head", 0.0)
        hx = left + 12 + (2 if up < -0.5 else 0) + int(pose.get("look", 0))
        hy = top - 4 - int(round(3 * max(0.0, up))) + int(round(-9 * min(0.0, up))) + (2 if lying and up > -0.5 else 0)
        hy = min(hy, ground - 7)
        cel.limb((left + 11.5, top + 3.5), (hx + 2.0, hy + 4.5), 4.6, 3.6, "bone", (3, 5, 5))
        for i in range(4):  # the mane along the top of its neck
            t = i / 3
            cel.put(left + 10.5 + (hx + 0.5 - left - 10.5) * t, top + 1.5 + (hy + 2.5 - top - 1.5) * t, L["m"])
        head = HEAD_EARS_BACK if pose.get("ears", "up") == "back" else HEAD
        cel.stamp(head, L, hx, hy)
        eyes = pose.get("eyes", "open")
        if eyes == "shut":
            cel.put(hx + 3, hy + 3, L["D"])
            cel.put(hx + 4, hy + 3, L["D"])
        else:
            cel.put(hx + 4, hy + 3, ("ink", 0))
            if eyes == "wide":
                cel.put(hx + 3, hy + 3, ("light", 0))
        cel.put(hx + 7, hy + 4, L["D"])  # a nostril
        if pose.get("bray", 0):  # mouth open
            cel.put(hx + 6, hy + 6, ("crimson", 2))
            cel.put(hx + 7, hy + 6, ("crimson", 2))
        cel.outline()
        for xy in [xy for xy in cel.px if xy[1] > ground]:
            del cel.px[xy]
        spark = pose.get("spark", 0.0)
        if spark > 0.05:
            cel.star(x0 + 13, ground - 24, 3 if spark > 0.6 else 1)


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, dy=0.0, stance="stand", head=0.0, look=0, ears="up", eyes="open", sway=0.0, load=0, stomp=0.0, bray=0, spark=0.0, flash=0.0)


def k(**over: object) -> Pose:
    return {**BASE, **over}


def plod_pose(ph: float) -> Pose:
    # Plodding: its head nods down on each stride, the load bobs, the tail swings against the step.
    nod = math.sin(math.tau * 2 * ph)
    return k(gait=ph, head=0.0, look=1 if nod > 0.3 else 0, load=1 if nod < -0.3 else 0, sway=0.5 * math.sin(math.tau * ph))


# Standing: an ear goes back and comes up, the tail swishes at a fly, it blinks.
IDLE = [
    (k(), 1400), (k(sway=0.6), 150), (k(sway=1.0), 180), (k(sway=0.3), 150), (k(), 1000), (k(ears="back"), 260), (k(), 900),
    (k(eyes="shut"), 100), (k(), 1200), (k(sway=-0.5), 200), (k(), 600),
]
# Now and then: its head goes down to the ground and it crops at it, twice, and comes up chewing.
FIDGET = [(k(head=-0.5), 110), (k(head=-1.0), 320), (k(head=-1.0, look=1), 220), (k(head=-1.0), 260), (k(head=-1.0, look=1), 220), (k(head=-0.5), 110), (k(look=1), 160), (k(), 160), (k(look=1), 160), (k(), 80)]
# Stopping: the load settles onto it. Setting off: it leans into the load.
SETTLE = [(k(load=1, head=-0.3), 80), (k(load=1), 80), (k(sway=0.6), 70)]
TAKEOFF = [(k(head=0.4, ears="back"), 60), (k(load=1, head=-0.3), 60)]

# A boss has fallen: head thrown up, braying, two hops off its forelegs.
CHEER = [(k(head=0.6), 60)] + [
    (k(head=1.0, bray=1, eyes="shut" if i % 6 in (1, 2, 3) else "open", dy=float((0, -2, -4, -2, 0, 1)[i % 6]), stomp=1.0 if i % 6 in (1, 2, 3) else 0.0, sway=0.8 * (i % 2), spark=1.0 if i % 6 in (1, 2, 3) else 0.3), 80)
    for i in range(12)
] + [(k(head=0.4), 70)]

# A chest has dropped: ears up, head high, eyes wide — and it stamps a forefoot: bring it here.
SPOT = [(k(head=0.6, eyes="wide"), 70), (k(head=1.0, eyes="wide", spark=1.0), 240)] + [
    (k(head=1.0, eyes="wide", stomp=float((1, 0)[i % 2]), spark=0.3), 90) for i in range(6)
] + [(k(head=0.4, look=1), 100)]

# A hero has gained a level: a slow nod, twice, and a swish of the tail.
DING = [(k(head=0.5, spark=1.0), 120), (k(head=-0.3, sway=0.8, spark=1.0), 130), (k(head=0.5, sway=0.3, spark=0.4), 120), (k(head=-0.3, sway=-0.6), 130), (k(head=0.2), 100), (k(), 80)]

# The party has fallen: it lies down under its load, ears back, eyes shut, head on the ground; it breathes.
LIE = dict(stance="lie", head=-0.6, ears="back", eyes="shut")
MOURN = [(k(**LIE), 900), (k(**LIE, load=1), 700)]

ANIMS = {
    "idle": held("idle", IDLE, True),
    "move": cycle("move", plod_pose, 8, 60),
    "settle": held("settle", SETTLE, False),
    "takeoff": held("takeoff", TAKEOFF, False),
    "fidget": held("fidget", FIDGET, False),
    "cheer": held("cheer", CHEER, False),
    "spot": held("spot", SPOT, False),
    "ding": held("ding", DING, False),
    "mourn": held("mourn", MOURN, True),
}
