"""The Runaway Chest — a strip event (src/data/stripEvents.ts RUNAWAY). A small iron-bound wooden chest that has
grown four stubby legs and bolts across the strip, the way a chest of the game would if it could: the lid
clatters open a crack at every stride and two round eyes peer out of the dark gap at whoever is chasing it; a
glint of the gold inside winks when the lid is up. It is about half a hero high, a pet's size.

Clips:
  run     the bolt — legs a blur in diagonal pairs, body bobbing and leaning into the run, the lid flapping   loop
  peek    pausing for breath: the lid lifts, the eyes look back, then it shuffles its feet               loop
  caught  tapped: it leaps, the lid bursts wide on a spray of gold glints, and it shuts with a thump      once
  escape  nobody caught it: it stops, flaps its lid at you twice, crouches and springs off out of sight once

Its origin is the point under its feet. Drawn facing right; the game mirrors it (it flees right to left)."""
from __future__ import annotations

import math

from ..rig import Cel, Character, Pose, Pt, Tone
from ..pets import cycle, held

EVENT = "RunawayChest"

OX, OY = 24, 34

L: dict[str, Tone] = {
    "W": ("leather", 4), "w": ("leather", 3), "d": ("leather", 2), "H": ("leather", 5),
    "B": ("ink", 4), "b": ("ink", 3), "I": ("ink", 6),
    "G": ("brass", 5), "g": ("brass", 4), "Y": ("brass", 7),
}
# The box below the lid: planks, two iron bands, the brass lock plate in the middle. 16 wide, 7 tall.
BOX = [
    "BBBBBBBBBBBBBBBB",
    "BWWWWWWGGWWWWWWB",
    "BHWWWWWGYWWWWWHB",
    "IWWWWWWGgWWWWWWI",
    "BwwwwwwwwwwwwwwB",
    "BwwwwwwwwwwwwwwB",
    "BBdddddddddddBBB",
]
# The lid: a barrel top with an iron band. 16 wide, 4 tall; it hinges on its back (left) edge.
LID = [
    "..BHHHHHHHHHHB..",
    ".BHWWWWWWWWWWHB.",
    "BIWWWWWWWWWWWWIB",
    "BBBBBBBBGGBBBBBB",
]


class RunawayChest(Character):
    W, H, TOP = 48, 40, 0

    def joints(self, pose: Pose) -> dict[str, Pt]:
        return {"feet": (OX + pose.get("dx", 0.0), OY + pose.get("dy", 0.0))}

    def draw(self, cel: Cel, J, pose, ropes, between) -> None:
        fx, fy = J["feet"]
        x0, ground = int(round(fx)), int(round(fy))
        leg = 4
        lean = int(pose.get("lean", 0))  # leaning into the run: the box slides forward a pixel
        bob = int(round(pose.get("bob", 0.0)))
        left, top = x0 - 8 + lean, ground - leg - 7 - bob
        # Four stubby legs, diagonal pairs together, the far pair a step darker.
        ph = pose.get("gait")
        for far in (True, False):
            for n, hip in enumerate((left + 3.0, left + 12.0)):
                p = 0.0 if ph is None else ph + (0.5 if (n == 1) != far else 0.0)
                swing = 0.0 if ph is None else math.sin(math.tau * p)
                lift = 0.0 if ph is None else max(0.0, math.cos(math.tau * p))
                hx = hip + (1.0 if far else 0.0)
                foot = (hx + swing * 2.6, ground - 1.0 - lift * 1.6)
                cel.limb((hx, top + 6.5), foot, 2.2, 1.8, "leather", (1, 2, 3) if far else (2, 3, 4), far=far)
                cel.put(foot[0] + 0.6, foot[1] + 0.4, ("ink", 1))  # a dark toe
        cel.stamp(BOX, L, left, top)
        # The lid, hinged on its back edge: `open` lifts its front (0 shut … 1 thrown wide).
        opening = pose.get("open", 0.0)
        gap = int(round(opening * 4))
        lid_top = top - 4
        if gap <= 0:
            cel.stamp(LID, L, left, lid_top)
        else:
            # The dark mouth inside the box, then the lid tipped up about its hinge.
            for x in range(1, 15):
                for y in range(1, min(gap, 3) + 1):
                    cel.put(left + x, top - y + 1, ("ink", 0))
            if pose.get("gold", 0):
                for x, y in ((5, 0), (6, -1), (9, 0), (11, 0), (8, -1)):
                    if -y < gap:
                        cel.put(left + x, top + y, ("brass", 6 if (x + y) % 2 else 5))
            cel.stamp_rot(LID, L, left + 0.5, lid_top + 4.0, 0.5, 4.0, -min(80.0, 14.0 * gap))
            eyes = pose.get("eyes", "look")
            if eyes != "none" and gap >= 1:
                ey = top - min(gap, 2) + 1
                for ex in (left + 8, left + 11):  # two round eyes in the dark gap; the pupil is where it looks
                    cel.put(ex, ey, ("light", 0))
                    cel.put(ex + 1, ey, ("light", 0))
                    cel.put(ex + (1 if eyes == "ahead" else 0), ey, ("ink", 1))
        cel.outline()
        for xy in [xy for xy in cel.px if xy[1] > ground]:
            del cel.px[xy]
        dust = pose.get("dust", 0)
        if dust:  # kicked-up dust behind it
            for i, (dx, dy) in enumerate(((-11, -1), (-13, -2), (-15, 0))[:dust]):
                cel.put(x0 + dx, ground + dy, ("bone", 5 - i))
        spark = pose.get("spark", 0.0)
        if spark > 0.05:
            cel.star(left + 10, top - 9, 3 if spark > 0.6 else 1)
            if spark > 0.6:
                cel.star(left + 2, top - 6, 1)
                cel.star(left + 15, top - 4, 1)


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, dy=0.0, gait=None, lean=0, bob=0.0, open=0.0, gold=0, eyes="look", dust=0, spark=0.0, flash=0.0)


def k(**over: object) -> Pose:
    return {**BASE, **over}


def run_pose(ph: float) -> Pose:
    # Two strides per period; the lid jumps open on each footfall and claps back down.
    step = (ph * 2) % 1.0
    return k(gait=ph * 2, lean=1, bob=1.0 * abs(math.sin(math.tau * ph * 2)), open=max(0.0, math.sin(math.tau * step)) * 0.6,
             eyes="look", gold=1 if step < 0.25 else 0, dust=1 + int(ph * 6) % 2)


def peek_pose(ph: float) -> Pose:
    shuffle = math.sin(math.tau * ph * 3) * 0.08
    return k(gait=shuffle, open=0.5 + 0.1 * math.sin(math.tau * ph), eyes="look" if ph < 0.6 else "ahead")


CAUGHT = (
    [(k(bob=-1.0, open=0.0), 60)]
    + [(k(dy=-float(h), open=o, gold=1, eyes="none" if o > 0.8 else "look", spark=s), ms)
       for h, o, s, ms in ((3, 0.4, 0.3, 60), (6, 1.0, 1.0, 70), (7, 1.0, 1.0, 80), (6, 1.0, 1.0, 80), (3, 0.6, 0.3, 70))]
    + [(k(bob=-1.0, open=0.0), 70), (k(), 160)]
)

# Nobody tapped it: near the left edge it stops, looks back and claps its lid at you twice (a glint of the gold you
# missed), crouches and springs away, kicking up dust — the strip fades it out as it leaps (render/stripEventLook).
ESCAPE = (
    [(k(open=o, gold=g, eyes="look", dy=-float(h)), ms)
     for h, o, g, ms in ((0, 0.3, 0, 90), (2, 0.8, 1, 90), (0, 0.2, 0, 90), (2, 0.8, 1, 90), (0, 0.2, 0, 110))]
    + [(k(bob=-1.0, open=0.0, eyes="ahead"), 130)]
    + [(k(dy=-float(h), lean=1, gait=g, dust=d, eyes="ahead"), ms)
       for h, g, d, ms in ((3, 0.25, 3, 70), (7, 0.5, 2, 80), (10, 0.75, 1, 90), (12, 1.0, 0, 110), (12, 1.0, 0, 200))]
)

ANIMS = {
    "run": cycle("run", run_pose, 8, 55),
    "peek": cycle("peek", peek_pose, 10, 90),
    "caught": held("caught", CAUGHT, False),
    "escape": held("escape", ESCAPE, False),
}
