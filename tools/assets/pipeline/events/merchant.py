"""The Wandering Merchant — a strip event (src/data/stripEvents.ts MERCHANT). A stooped, bearded trader in a deep
plum hooded cloak, bent under a pack taller than his head: a leather pack with a brass buckle, a red bedroll on
top, a copper pot knocking at its side and a lit lantern swinging from it. He leans on a long staff. Only the tip
of his nose, a gleam of eye and a white beard show under the hood. He comes in from behind the party, stops,
raises a hand to whoever is looking, and waits; when he has sold something he dips his head; when his time is up
he shoulders his pack and walks off the way he came.

Clips:
  walk    plodding under the pack, staff swinging forward with each step, the lantern swaying           loop
  idle    standing, breathing under the load, the lantern rocking, the staff planted                    loop
  wave    the near hand comes up off the staff and waves twice                                           once
  thanks  a dip of the head and a glint of a coin in the hand                                            once

Its origin is the point under its feet. Drawn facing right (towards the party); the game mirrors it to leave."""
from __future__ import annotations

import math

from ..rig import Cel, Character, Pose, Pt, Tone
from ..pets import cycle, held

EVENT = "Merchant"

OX, OY = 30, 58

L: dict[str, Tone] = {
    "V": ("violet", 3), "v": ("violet", 2), "u": ("violet", 4), "w": ("violet", 1),
    "k": ("ink", 1), "S": ("skin", 4), "s": ("skin", 3), "e": ("brass", 6),
    "b": ("bone", 6), "c": ("bone", 4),
    "G": ("brass", 5), "g": ("brass", 3),
    "L": ("leather", 4), "H": ("leather", 5), "l": ("leather", 3), "d": ("leather", 2),
    "r": ("crimson", 3), "R": ("crimson", 4), "q": ("crimson", 5),
    "p": ("brass", 3), "P": ("brass", 4), "o": ("ink", 2),
}
# The hood, opening to the right: the dark of it, an eye's gleam, the nose, the beard. 12 wide, 10 tall.
HOOD = [
    "...uuuuV....",
    "..uuVVVVVV..",
    ".uVVVVVVVVV.",
    ".VVVVVkkkkV.",
    "VVVVVkkekkS.",
    "VVVVVkkkkSs.",
    "vVVVVkbbbb..",
    "vvVVVbbbbbb.",
    ".vvVVcbbbb..",
    "..vvvvcbc...",
]
# The cloak, shoulders to hem, with the brass clasp and the belt with a pouch. 13 wide, 20 tall.
CLOAK = [
    "..vVVVVVVuu..",
    ".vVVVVVVVVuu.",
    ".vVVVVVGVVVu.",
    "vvVVVVVVVVVVu",
    "vvVVVVVVVVVVu",
    "vvVVVVVVVVVVu",
    "vvVVVVVVVVVVu",
    "vdLLLLLLLLLLL",
    "vvVVVVVVlLlVu",
    "vvVVVVVVlllVu",
    "vvVVVVVVVVVVu",
    "vvVVVVVVVVVVV",
    "vvVVVVVVVVVVV",
    "vvvVVVVVVVVVV",
    "vvvVVVVVVVVVV",
    "vvvVVVVVVVVVV",
    "vvvvVVVVVVVVV",
    "wvvvvVVVVVVVV",
    ".wvvvvVVVVVV.",
    "..wwwwwwwwww.",
]
# The pack on his back: the bedroll on top, the leather body with its buckle. 12 wide, 16 tall.
PACK = [
    "...rrrrrrr..",
    "..rRRqRRRRr.",
    "..rRRRRRRRr.",
    "...rrrrrrr..",
    ".lLHHHHHHHL.",
    "llLLLLLLLLLL",
    "llLLLGLLLLLL",
    "llLLLgLLLLLL",
    "llllllllllll",
    "ldLLLLLLLLLl",
    "ldLLLLLLLLLl",
    "ldLLLLLLLLLl",
    "ldLLLLLLLLLl",
    "ldLLLLLLLLLl",
    "lddlllllllll",
    ".dddddddddd.",
]
POT = [".PPP.", "PpppP", "ooooo", ".ooo."]
LANTERN = [".g.", "GeG", "GeG", ".G."]

LEG = 9  # hip to sole
CLOAK_ABOVE_SOLE = 4  # the hem stops this high: the boots show under it


class Merchant(Character):
    W, H, TOP = 72, 64, 0

    def joints(self, pose: Pose) -> dict[str, Pt]:
        return {"feet": (OX + pose.get("dx", 0.0), OY + pose.get("dy", 0.0))}

    def draw(self, cel: Cel, J, pose, ropes, between) -> None:
        fx, fy = J["feet"]
        x0, ground = int(round(fx)), int(round(fy))
        bob = int(round(pose.get("bob", 0.0)))
        hem = ground - CLOAK_ABOVE_SOLE - bob
        ctop = hem - len(CLOAK) + 1
        cleft = x0 - 6
        stoop = int(pose.get("stoop", 0))  # the head dipping: hood and shoulders a pixel forward and down
        # The staff first (behind the near arm): from where the hand holds it down to the ground ahead.
        reach = pose.get("staff", 0.0)  # −1 … 1: the staff swung back … forward
        foot = (x0 + 10 + reach * 3.0, ground - 0.5)
        top = (x0 + 9 + reach * 1.5, ctop - 6)
        cel.line(top, foot, ("leather", 3))
        cel.line((top[0] + 1, top[1]), (foot[0] + 1, foot[1]), ("leather", 5))
        cel.put(top[0], top[1] - 1, ("brass", 5))  # a brass ferrule on its head
        # Legs: two booted strokes under the hem, swinging in turn.
        ph = pose.get("gait")
        for far in (True, False):
            p = 0.0 if ph is None else ph + (0.5 if far else 0.0)
            swing = 0.0 if ph is None else math.sin(math.tau * p)
            lift = 0.0 if ph is None else max(0.0, math.cos(math.tau * p))
            hip = (x0 + (0.5 if far else 2.0), ground - LEG - bob)
            sole = (hip[0] + swing * 3.0, ground - 0.5 - lift * 1.5)
            cel.limb(hip, sole, 2.6, 2.4, "leather", (1, 2, 2) if far else (2, 3, 4), far=far)
            cel.put(sole[0] + 1.0, sole[1], ("ink", 1))  # the toe of the boot
        # The pack behind his back, the pot knocking at its side, the lantern swinging below it.
        pleft, ptop = cleft - 9, ctop - 8 + stoop
        cel.stamp(PACK, L, pleft, ptop)
        cel.stamp(POT, L, pleft - 2, ptop + 10 + int(round(pose.get("pot", 0.0))))
        sway = pose.get("lantern", 0.0)
        hang = (pleft + 2, ptop + len(PACK) - 1)
        lx, ly = hang[0] + sway * 2.5, hang[1] + 4
        cel.line(hang, (lx, ly - 1), ("ink", 3))
        cel.stamp(LANTERN, L, lx - 1, ly)
        cel.stamp(CLOAK, L, cleft, ctop)
        cel.stamp(HOOD, L, cleft + 1 + stoop, ctop - 8 + stoop)
        # The near arm: from the shoulder to the hand on the staff — or up, waving.
        shoulder = (cleft + 10.0 + stoop, ctop + 2.5 + stoop)
        wave = pose.get("wave", 0.0)
        if wave > 0.0:
            hand = (shoulder[0] + 3.0 + 2.0 * wave + pose.get("flick", 0.0) * 1.5, shoulder[1] - 12.0 * wave)
        else:
            hand = (top[0] + 0.5, ctop + 8.0)
        cel.limb(shoulder, hand, 3.4, 2.8, "violet", (2, 3, 4))
        cel.put(hand[0], hand[1], ("skin", 4))
        cel.put(hand[0] + 1, hand[1], ("skin", 5))
        cel.put(hand[0], hand[1] + 1, ("skin", 3))
        cel.outline()
        for xy in [xy for xy in cel.px if xy[1] > ground]:
            del cel.px[xy]
        # The lantern's flame lights the air round it (after the outline: a soft glow, not a shape).
        for dx, dy in ((-1, 1), (2, 1), (0, -1), (0, 4)):
            cel.soft(lx + dx, ly + dy, ("brass", 6))
        spark = pose.get("spark", 0.0)
        if spark > 0.05:
            cel.star(hand[0] + 1, hand[1] - 3, 2 if spark > 0.6 else 1)


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, dy=0.0, gait=None, bob=0.0, stoop=0, staff=0.0, lantern=0.0, pot=0.0, wave=0.0, flick=0.0, spark=0.0, flash=0.0)


def k(**over: object) -> Pose:
    return {**BASE, **over}


def walk_pose(ph: float) -> Pose:
    return k(gait=ph, bob=abs(math.sin(math.tau * ph)), staff=math.sin(math.tau * ph), lantern=-math.sin(math.tau * ph), pot=1.0 if (ph * 2) % 1 < 0.5 else 0.0)


def idle_pose(ph: float) -> Pose:
    return k(bob=1.0 if ph < 0.5 else 0.0, lantern=0.6 * math.sin(math.tau * ph))


WAVE = (
    [(k(wave=w), 70) for w in (0.4, 0.8, 1.0)]
    + [(k(wave=1.0, flick=f, lantern=0.3 * f), 110) for f in (1.0, -0.5, 1.0, -0.5)]
    + [(k(wave=w), 80) for w in (0.7, 0.3)]
    + [(k(), 120)]
)
THANKS = [(k(stoop=1), 120), (k(stoop=2, spark=1.0), 160), (k(stoop=2, spark=0.4), 160), (k(stoop=1), 120), (k(), 140)]

ANIMS = {
    "walk": cycle("walk", walk_pose, 8, 95),
    "idle": cycle("idle", idle_pose, 8, 160),
    "wave": held("wave", WAVE, False),
    "thanks": held("thanks", THANKS, False),
}
