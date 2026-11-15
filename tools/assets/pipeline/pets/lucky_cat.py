"""Lucky Cat — the companion that brings chests. A white cat with red inside its ears, a red collar and a brass
bell: the cat of the shop counters that raises one paw to call luck in. It is the pet that WALKS: it never leaves
the ground.

At rest it sits behind the party, facing the fight, its tail curling and flicking; now and then it raises a paw
and beckons, the way its kind does. When the party moves on it gets up and trots after them, tail high, and sits
down again when they stop. A boss falling makes it bounce where it sits with its paw up; a chest dropping makes
it stand stock still, tail straight up, eyes wide, and then crouch and wiggle the way a cat does before it
pounces; when the party falls it lies down flat with its ears back and its eyes shut.

Three stances share one head: `sit` (a drawn body, seen three-quarters), `walk` (a level body on four legs the
engine swings in diagonal pairs) and `lie` (the level body on the ground, legs tucked). The tail is a curve the
pose bends; the raised paw is a limb the pose lifts.

Its origin is the point under its feet. Clips: see pets/__init__. Drawn facing right; the game mirrors it."""
from __future__ import annotations

import math

from ..rig import Cel, Character, Pose, Pt, Tone
from . import cycle, held

PET = "LuckyCat"

OX, OY = 32, 44

L: dict[str, Tone] = {"W": ("bone", 7), "S": ("bone", 5), "R": ("crimson", 5), "r": ("crimson", 4), "g": ("brass", 5), "k": ("bone", 3)}
WHITE, SHADE, LINE = L["W"], L["S"], ("bone", 2)

# The head, three-quarters to the right: ears, a broad face, the cheek's shadow on the far side. 11 wide, 8 tall.
# The eyes and nose are drawn over it (they change).
HEAD = [
    "..W.....W..",
    ".WRW...WRW.",
    ".WWWWWWWWW.",
    "WWWWWWWWWWW",
    "WWWWWWWWWWW",
    "WWWWWWWWWWW",
    "SWWWWWWWWWW",
    ".SWWWWWWWW.",
]
HEAD_FLAT = [  # ears back
    "...........",
    "...........",
    "WWWWWWWWWWW",
    "RWWWWWWWWWR",
    "WWWWWWWWWWW",
    "WWWWWWWWWWW",
    "SWWWWWWWWWW",
    ".SWWWWWWWW.",
]
EYES = (3, 8)  # the eyes' columns in the head; they sit on its rows 4–5
NOSE = (6, 5)

# Sitting: collar and bell, chest, the haunch behind, the two front legs. 13 wide, 8 tall; the head sits on it.
SIT = [
    "...rrrrrrrr..",
    "..WWWWWgWWW..",
    ".WWWWWWWWWW..",
    ".SWWWWWWWWW..",
    "SSWWWWWSWWW..",
    "SSWWWWWSWkW..",
    "SSSWWWWSWkW..",
    ".SSSSWWSWWWW.",
]
# On four legs: a level body, the collar at its front. 13 long, 5 tall; legs and head are added.
LEVEL = [
    ".WWWWWWWWWWr.",
    "WWWWWWWWWWWrr",
    "WWWWWWWWWWWrg",
    "SWWWWWWWWWWW.",
    ".SSSSWWWWWS..",
]


# Curled up on the ground: the mound of its back; its head is laid at the front of it.
CURL = [
    "....WWWWWWW....",
    "..WWWWWWWWWWW..",
    ".WWWWWWWWWWWWW.",
    "WWWWWWWWWWWWWWW",
    "SWWWWWWWWWWWWWW",
    "SSWWWWWWWWWWWWW",
    "SSSWWWWWWWWWWWW",
    ".SSSSSSSSSWWWW.",
]


class LuckyCat(Character):
    W, H, TOP = 64, 56, 0

    def joints(self, pose: Pose) -> dict[str, Pt]:
        return {"feet": (OX + pose.get("dx", 0.0), OY + pose.get("dy", 0.0))}

    def face(self, cel: Cel, hx: int, hy: int, pose: Pose) -> None:
        eyes = pose.get("eyes", "open")
        for col in EYES:
            x, y = hx + col, hy + 4
            if eyes == "open":
                cel.put(x, y, ("ink", 0))
                cel.put(x, y + 1, ("ink", 0))
            elif eyes == "wide":  # round and dark, a point of light in each
                for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
                    cel.put(x + dx, y + dy, ("ink", 0))
                cel.put(x, y, ("light", 0))
            elif eyes == "happy":  # shut, curved up
                cel.put(x - 1, y + 1, LINE)
                cel.put(x, y, LINE)
                cel.put(x + 1, y + 1, LINE)
            else:  # shut flat
                for dx in (-1, 0, 1):
                    cel.put(x + dx, y + 1, LINE)
        cel.put(hx + NOSE[0], hy + NOSE[1], ("crimson", 6))
        cel.put(hx + NOSE[0], hy + NOSE[1] + 1, LINE)

    def tail(self, cel: Cel, base: Pt, pose: Pose) -> None:
        """The tail: a curve from its root through a bend to its tip; the pose gives the tip's reach and sway."""
        up, sway = pose.get("tail", 1.0), pose.get("sway", 0.0)  # up: 1 = held high, 0 = lying along the ground
        bx, by = base
        mid = (bx - 3.0, by - 3.0 * up - 0.5)
        tip = (bx - 3.0 + sway * 2.5 - (1.0 - up) * 4.0, by - 8.0 * up - 0.5)
        pts = []
        for i in range(13):
            t = i / 12
            x = (1 - t) ** 2 * bx + 2 * (1 - t) * t * mid[0] + t * t * tip[0]
            y = (1 - t) ** 2 * by + 2 * (1 - t) * t * mid[1] + t * t * tip[1]
            pts.append((x, y))
        for (x, y) in pts:
            cel.put(x, y, WHITE)
            cel.put(x, y + 1, SHADE if up < 0.5 else WHITE)

    def draw(self, cel, J, pose, ropes, between) -> None:
        fx, fy = J["feet"]
        x0, ground = int(round(fx)), int(round(fy))
        stance = pose.get("stance", "sit")
        head = HEAD_FLAT if pose.get("ears", "up") == "flat" else HEAD
        if stance == "sit":
            left, top = x0 - 6, ground - 16
            self.tail(cel, (left + 0.5, ground - 3.0), pose)
            cel.stamp(SIT, L, left, top + 8)
            hx, hy = left + 2 + int(pose.get("look", 0)), top + int(pose.get("nod", 0))
            cel.stamp(head, L, hx, hy)
            self.face(cel, hx, hy, pose)
            paw = pose.get("paw", 0.0)
            if paw > 0.05:  # the near paw raised beside its cheek, in front of it: it beckons
                wave = 1.0 if pose.get("wave", 0) else 0.0
                sx, sy = left + 11.0, top + 11.5
                tipx, tipy = sx + 2.6, sy - 6.0 * paw
                cel.limb((sx, sy), (tipx, tipy), 2.6, 2.6, "bone", (5, 7, 7))
                # the paw itself, bent forward at the wrist; it dips when it beckons
                for dx, dy in ((0, 0), (1, 0), (0, -1), (1, -1), (2, 0)):
                    cel.put(tipx + dx - 0.5, tipy + dy + wave, WHITE)
                cel.put(tipx + 1.5, tipy + 1 + wave, ("crimson", 6))  # a pad
        elif stance == "lie":
            left, top = x0 - 8, ground - 8
            cel.stamp(CURL, L, left, top)
            hx, hy = left + 6, ground - 8 + int(pose.get("nod", 0))
            cel.stamp(head, L, hx, hy)
            for j in range(3, 8):  # where its head lies against its side
                cel.put(hx - 1, hy + j, SHADE)
            for i in range(0, 10):
                cel.put(hx + i, hy + 1 + (1 if i in (0, 9) else 0), SHADE) if pose.get("nod", 0) else None
            self.face(cel, hx, hy, pose)
            for i in range(-2, 9):  # its tail brought round along the ground
                cel.put(left + i, ground - 1, SHADE if i > 0 else WHITE)
        else:
            crouch = int(pose.get("crouch", 0))
            leg = 5 - crouch
            top = ground - leg - 5  # the level body's top row
            left = x0 - 7
            self.tail(cel, (left + 0.5, top + 1.5), pose)
            ph = pose.get("gait", None)
            # Four legs, diagonal pairs together; the far pair first, a pixel ahead, in shade.
            for far in (True, False):
                for hip, lead in ((left + 2.5, 0.0), (left + 10.5, 0.5)):
                    swing = 0.0 if ph is None else math.sin(math.tau * (ph + lead + (0.5 if far else 0.0)))
                    lift = 0.0 if ph is None else max(0.0, math.cos(math.tau * (ph + lead + (0.5 if far else 0.0))))
                    hx_ = hip + (1.0 if far else 0.0)
                    foot = (hx_ + swing * 3.2, top + 5 + leg - 0.5 - lift * 1.4)
                    cel.limb((hx_, top + 4.0), foot, 2.2, 1.8, "bone", (3, 5, 5) if far else (5, 7, 7), far=far)
            cel.stamp(LEVEL, L, left, top)
            hx = left + 6 + int(pose.get("look", 0))
            hy = top - 5 + int(pose.get("nod", 0))
            cel.stamp(head, L, hx, hy)
            self.face(cel, hx, hy, pose)
        cel.outline()
        for xy in [xy for xy in cel.px if xy[1] > ground]:  # nothing of it goes into the path
            del cel.px[xy]
        spark = pose.get("spark", 0.0)
        if spark > 0.05:
            cel.star(x0 + 10, ground - 19, 3 if spark > 0.6 else 1)


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, dy=0.0, stance="sit", look=0, nod=0, eyes="open", ears="up", tail=1.0, sway=0.0, paw=0.0, wave=0, crouch=0, spark=0.0, flash=0.0)


def k(**over: object) -> Pose:
    return {**BASE, **over}


def trot_pose(ph: float) -> Pose:
    # Trotting: the body rises on each pair's push, the tail high and swinging against the stride.
    return k(stance="walk", gait=ph, dy=-round(0.8 * abs(math.sin(math.tau * ph))), sway=0.6 * math.sin(math.tau * ph), tail=1.0)


STAND = dict(stance="walk")
# Sitting: its tail curls and flicks, it blinks, it glances back.
IDLE = [
    (k(), 1500), (k(sway=0.5), 160), (k(sway=1.0), 200), (k(sway=0.5), 160), (k(), 900), (k(eyes="shut"), 90), (k(), 1100),
    (k(sway=-0.6), 220), (k(), 700), (k(look=-1), 800), (k(), 400),
]
# Now and then: the paw comes up beside its cheek and beckons, three times.
FIDGET = [(k(paw=0.5), 70)] + [(k(paw=1.0, wave=i % 2, eyes="happy"), 130) for i in range(6)] + [(k(paw=0.5), 70), (k(), 60)]
# Sitting down, getting up.
SETTLE = [(k(**STAND, tail=0.8), 70), (k(**STAND, crouch=2, tail=0.6), 70), (k(nod=1), 60), (k(), 60)]
TAKEOFF = [(k(nod=1), 50), (k(**STAND, crouch=2), 60), (k(**STAND), 50)]

# A boss has fallen: it bounces where it sits, twice, paw up and waving, eyes shut in a smile.
CHEER = [(k(), 50)] + [(k(paw=1.0, wave=i % 2, eyes="happy", dy=float((0, -3, -5, -3, 0, 1)[i % 6]), tail=1.0, sway=0.8 * (i % 2), spark=1.0 if i % 6 in (1, 2, 3) else 0.3), 78) for i in range(12)] + [(k(paw=0.5), 60)]

# A chest has dropped: stock still on four legs, tail straight up, eyes wide — then the crouch and the wiggle.
SPOT = [(k(**STAND, eyes="wide", tail=1.0, sway=0.0, spark=1.0), 90), (k(**STAND, eyes="wide", tail=1.0), 260)] + [
    (k(**STAND, eyes="wide", crouch=2, tail=0.7, sway=float((-1, 1)[i % 2]), dx=float((0, 1)[i % 2])), 80) for i in range(6)
] + [(k(**STAND, eyes="wide"), 90)]

# A hero has gained a level: one slow beckon and a pleased blink.
DING = [(k(paw=0.5), 70), (k(paw=1.0, eyes="happy", spark=1.0), 170), (k(paw=1.0, wave=1, eyes="happy", spark=1.0), 170), (k(paw=1.0, eyes="happy", spark=0.3), 150), (k(paw=0.5), 70), (k(), 60)]

# The party has fallen: it lies flat, ears back, eyes shut, tail along the ground; it breathes.
LIE = dict(stance="lie", ears="flat", eyes="shut", tail=0.0)
MOURN = [(k(**LIE), 900), (k(**LIE, nod=1), 700)]

ANIMS = {
    "idle": held("idle", IDLE, True),
    "move": cycle("move", trot_pose, 8, 52),
    "settle": held("settle", SETTLE, False),
    "takeoff": held("takeoff", TAKEOFF, False),
    "fidget": held("fidget", FIDGET, False),
    "cheer": held("cheer", CHEER, False),
    "spot": held("spot", SPOT, False),
    "ding": held("ding", DING, False),
    "mourn": held("mourn", MOURN, True),
}
