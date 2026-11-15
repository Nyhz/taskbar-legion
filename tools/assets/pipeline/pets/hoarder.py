"""Hoarder — the companion that keeps more boss chests. A small green drake with bone horns, brass eyes and pale
claws, lying across the lid of a leather chest with a brass band and lock, and it WILL NOT LET GO of it. It is a
walker of a kind of its own: it does not walk — the chest does. Two clawed feet come out from under it and the
whole thing waddles after the party, rocking from side to side, the drake still clamped on top; where the party
stops, the feet go in and the chest sits down.

At rest its eyes go from side to side (who is looking at its chest?), its tail tip flicks, and every so often it
lifts the lid a crack, looks in at the gold shining there, and shuts it quick. A chest dropping is its great
moment: eyes huge, the lid flung open to take it, trembling. A boss falling makes the chest bounce with the lid
flapping; a level gained gets a pat on the lid and a glint off the lock. When the party falls it flattens itself
over the lid with its eyes shut: nobody is having it.

Seen from the front, like its portrait in the panel; it is not mirrored in any way that shows. Its origin is the
point under the chest. Clips: see pets/__init__."""
from __future__ import annotations

from ..rig import Cel, Character, Pose, Pt, Tone
from . import held

PET = "Hoarder"

OX, OY = 32, 44

L: dict[str, Tone] = {
    "h": ("bone", 7), "G": ("moss", 6), "g": ("moss", 5), "n": ("moss", 3), "c": ("moss", 8),
    "Y": ("brass", 7), "y": ("brass", 5), "L": ("leather", 5), "l": ("leather", 3), "b": ("brass", 5), "k": ("brass", 7),
}
# The drake across the lid: horns, a broad head, its claws over the lid's corners. 14 wide, 6 tall; eyes drawn on.
DRAKE = [
    "...h......h...",
    "...hGGGGGGh...",
    "..GGGGGGGGGG..",
    "..GGGGGGGGGG..",
    "..GGGnGGnGGG..",
    ".cGGGGGGGGGGc.",
]
DRAKE_FLAT = [  # pressed down over the lid, horns low
    "..............",
    "..h........h..",
    "..hGGGGGGGGh..",
    ".GGGGGGGGGGGG.",
    ".GGGGnGGnGGGG.",
    "cGGGGGGGGGGGGc",
]
LID = ["cYyyYyyYyyYyyc", "cLLLLLLLLLLLLc"]
BOX = [
    "gLLLLLLLLLLLLg",
    "gbbbbbkkbbbbbg",
    "gLLLLLkkLLLLLg",
    ".lLLLLLLLLLLl.",
    ".llllllllllll.",
]
FEET = "..cc......cc.."


class Hoarder(Character):
    W, H, TOP = 64, 56, 0

    def joints(self, pose: Pose) -> dict[str, Pt]:
        return {"feet": (OX + pose.get("dx", 0.0), OY + pose.get("dy", 0.0))}

    def draw(self, cel, J, pose, ropes, between) -> None:
        fx, fy = J["feet"]
        x0, ground = int(round(fx)), int(round(fy))
        feet = int(pose.get("feet", 0))  # walking: its feet out under the chest, which rides 2 px up on them
        tilt = int(pose.get("tilt", 0))  # rocking: the lid and the drake a pixel to one side
        left = x0 - 7
        box_top = ground - len(BOX) - 2 * feet
        if feet:
            step = int(pose.get("step", 0))  # which foot is forward
            for i, ch in enumerate(FEET):
                if ch != ".":
                    near = (i < 7) == (step == 0)
                    cel.put(left + i + (1 if near else -1) * (1 if step >= 0 else 0), ground - 1, L["c"])
                    cel.put(left + i, ground - 2, L["g"])
        # The tail: out from behind the chest, its tip flicking.
        sway = int(pose.get("sway", 0))
        for i, (dx, dy) in enumerate(((0, -1), (1, -1), (2, -2 - sway), (3, -3 - sway))):
            cel.put(left + 14 + dx, ground + dy - 2 * feet, L["g"] if i < 3 else L["c"])
        cel.stamp(BOX, L, left, box_top)
        gap = int(pose.get("lid", 0))  # the lid lifted this many pixels: gold shines in the gap
        for j in range(gap):
            for i in range(1, 13):
                cel.put(left + i, box_top - 1 - j, ("brass", 7) if (i + j) % 3 else ("light", 0))
        lid_top = box_top - len(LID) - gap
        cel.stamp(LID, L, left + tilt, lid_top)
        flat = pose.get("flat", 0)
        drake = DRAKE_FLAT if flat else DRAKE
        dx, dy = left + tilt, lid_top - len(drake) + (1 if flat else 0) + int(pose.get("nod", 0))
        cel.stamp(drake, L, dx, dy)
        eyes = pose.get("eyes", "open")
        look = int(pose.get("look", 0))
        ey = dy + (4 if flat else 3)
        for ex in ((2, 10) if flat else (3, 9)):
            if eyes == "shut":
                cel.put(dx + ex, ey, L["n"])
                cel.put(dx + ex + 1, ey, L["n"])
            elif eyes == "wide":
                for i in (0, 1):
                    for j in (-1, 0):
                        cel.put(dx + ex + i, ey + j, L["Y"])
                cel.put(dx + ex + (1 if look >= 0 else 0), ey, ("ink", 0))
            else:
                cel.put(dx + ex, ey, L["y"])
                cel.put(dx + ex + 1, ey, L["y"])
                cel.put(dx + ex + (1 if look > 0 else 0), ey, ("ink", 0))
        if pose.get("pat", 0):  # a claw lifted off the lid's corner
            cel.put(dx + 12, lid_top - 2, L["c"])
            cel.put(dx + 13, lid_top - 3, L["c"])
        cel.outline()
        spark = pose.get("spark", 0.0)
        if spark > 0.05:
            cel.star(x0 + 10, dy - 2, 3 if spark > 0.6 else 1)
            if gap and spark > 0.6:
                cel.star(x0 - 2, box_top - 2, 1)


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, dy=0.0, feet=0, step=0, tilt=0, sway=0, lid=0, flat=0, nod=0, eyes="open", look=0, pat=0, spark=0.0, flash=0.0)


def k(**over: object) -> Pose:
    return {**BASE, **over}


# At rest: its eyes go one way, then the other; the tail tip flicks; it blinks.
IDLE = [(k(), 1200), (k(look=1), 900), (k(look=1, sway=1), 160), (k(look=1), 500), (k(), 400), (k(look=-1), 900), (k(eyes="shut"), 100), (k(), 1100), (k(sway=1), 160), (k(), 500)]
# Now and then: the lid comes up a crack, it looks in at the shine, and shuts it quick — and looks about.
FIDGET = [(k(lid=1, nod=-1), 130), (k(lid=2, nod=-1, eyes="wide", spark=1.0), 420), (k(lid=2, nod=-1, eyes="wide", spark=0.4, sway=1), 300), (k(lid=1, nod=-1), 70), (k(dy=1.0), 70), (k(look=-1), 260), (k(look=1), 260), (k(), 90)]
# Waddling: up on its feet, the chest rocking a pixel to each side as the feet change.
MOVE = [(k(feet=1, step=0, tilt=-1, look=1), 110), (k(feet=1, step=0, tilt=0, dy=-1.0, look=1), 70), (k(feet=1, step=1, tilt=1, look=1), 110), (k(feet=1, step=1, tilt=0, dy=-1.0, look=1), 70)]
# Sitting the chest down; getting it up on its feet.
SETTLE = [(k(feet=1, step=-1), 80), (k(dy=1.0), 80), (k(sway=1), 80)]
TAKEOFF = [(k(dy=1.0), 70), (k(feet=1, step=-1, dy=-1.0), 80)]

# A boss has fallen: the chest bounces, twice, the lid flapping open on the shine inside.
CHEER = [(k(), 50)] + [
    (k(dy=float((1, -2, -4, -2, 0, 1)[i % 6]), lid=(0, 1, 2, 1, 0, 0)[i % 6], eyes="shut" if i % 6 in (1, 2, 3) else "open", sway=i % 2, spark=1.0 if i % 6 in (1, 2, 3) else 0.3), 80) for i in range(12)
] + [(k(), 60)]

# A chest has dropped: its great moment. Eyes huge, the lid flung open to take it, the whole thing trembling.
SPOT = [(k(eyes="wide", spark=1.0), 90), (k(eyes="wide", lid=1, nod=-1, spark=1.0), 90)] + [
    (k(eyes="wide", lid=2, nod=-1, look=1, dx=float((1, -1)[i % 2]), sway=i % 2, spark=1.0 if i < 4 else 0.4), 76) for i in range(8)
] + [(k(eyes="wide", lid=1, look=1), 80), (k(look=1), 90)]

# A hero has gained a level: a pat on the lid, twice, and a glint off the lock.
DING = [(k(pat=1), 100), (k(pat=0, dy=1.0, spark=1.0), 90), (k(pat=1, spark=1.0), 110), (k(pat=0, dy=1.0, spark=0.4), 90), (k(eyes="shut"), 160), (k(), 80)]

# The party has fallen: flattened over the lid, eyes shut, holding on.
MOURN = [(k(flat=1, eyes="shut"), 900), (k(flat=1, eyes="shut", nod=1), 700)]

ANIMS = {
    "idle": held("idle", IDLE, True),
    "move": held("move", MOVE, True),
    "settle": held("settle", SETTLE, False),
    "takeoff": held("takeoff", TAKEOFF, False),
    "fidget": held("fidget", FIDGET, False),
    "cheer": held("cheer", CHEER, False),
    "spot": held("spot", SPOT, False),
    "ding": held("ding", DING, False),
    "mourn": held("mourn", MOURN, True),
}
