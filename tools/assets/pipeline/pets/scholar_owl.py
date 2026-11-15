"""Scholar Owl — the companion that gives experience. A brown owl with a cream, speckled breast, ear tufts and
round brass spectacles that are most of its face. The reference for a pet's size: about 20 px from its toes to
the tips of its tufts — half a hero.

Seen from the front, the way an owl looks at you; its wings open to either side and beat from the shoulder, each
one a blade of feathers whose angle the pose sets (raised, level, hanging). Its head turns a pixel towards where
it is going, and its eyes are behind the spectacles: a brass ring round a pale lens, a dark pupil with a glint;
shut, a lid's line crosses the lens — the spectacles stay on.

Going somewhere it leans: its head a pixel ahead of its body, its tail a pixel behind (three clean blocks, no
shearing). Its origin is the point under its feet. Clips: see pets/__init__.

Drawn facing right like every figure; the game mirrors it when it flies left."""
from __future__ import annotations

import math

from ..rig import Cel, Character, Pose, Pt, Tone
from . import cycle, held, one_shot

PET = "ScholarOwl"

#: The point under its feet, in the cel.
OX, OY = 32, 44

# The body with no face: ear tufts, the head, the wings' shoulders down its sides, the cream breast and its
# speckles, the belly's shadow. 13 wide; rows 0–8 are the head, 9–15 the body.
HEAD = [
    "D...........D",
    "BD.........DB",
    "BBD.......DBB",
    "BBBBBBBBBBBBB",
    "BBBBBBBBBBBBB",
    "BBBBBBBBBBBBB",
    "BBBBBBBBBBBBB",
    "BBBBBBBBBBBBB",
    "BBBBBBBBBBBBB",
]
BODY = [
    "DBBpppppppBBD",
    "DBpppPpPpppBD",
    "DBppPpppPppBD",
    "DBpppPpPpppBD",
    "DDBpppppppBDD",
    ".DDBqqqqqBDD.",
    "..DDDDDDDDD..",
]
ROWS = len(HEAD) + len(BODY)  # 16
L: dict[str, Tone] = {"D": ("leather", 3), "B": ("leather", 5), "p": ("bone", 6), "P": ("bone", 4), "q": ("bone", 5)}
RIM, RIM_HOT, PUPIL, BEAK, BEAK_TIP, FOOT, DISC, LID = ("brass", 5), ("brass", 7), ("ink", 0), ("brass", 4), ("brass", 2), ("brass", 4), ("leather", 7), ("leather", 3)

WING = 11.0  # a wing's length, shoulder to tip
CHORD = 5.0


def wing(cel: Cel, shoulder: Pt, side: int, deg: float, length: float) -> None:
    """One wing. `side` −1 is the one on the left of the picture, +1 the right; `deg` is its angle from level
    (negative = raised), `length` how long it looks (a wing turned away shortens). A blade of feathers: its
    leading edge lighter, its last feathers darker, a notch where the long feathers end."""
    a = math.radians(deg)
    sx, sy = shoulder
    out = (math.cos(a) * side, math.sin(a))  # along the wing
    tip = (sx + out[0] * length, sy + out[1] * length)
    if deg <= 20.0:
        # Raised or level: a broad blade, its trailing edge on the side that points down and outwards.
        back = max(((-out[1], out[0]), (out[1], -out[0])), key=lambda v: v[1] * 0.8 + v[0] * side * 0.6)
        notch = (sx + out[0] * length * 0.62 + back[0] * CHORD * 0.9, sy + out[1] * length * 0.62 + back[1] * CHORD * 0.9)
        root = (sx + back[0] * CHORD * 0.5, sy + back[1] * CHORD + 0.4)
        mask = cel.poly_mask([(sx, sy - 0.6), tip, notch, root])
    else:
        # Hanging: it springs from the whole of its shoulder and keeps its width down to its short feathers.
        root = (sx - side * 0.6, sy + CHORD + 0.4)
        low = (sx + side * 3.4, max(root[1], tip[1]) + 1.6)
        notch = (low[0] + (tip[0] - low[0]) * 0.55, low[1] + (tip[1] - low[1]) * 0.5 - 0.6)
        mask = cel.poly_mask([(sx - side * 0.6, sy - 0.7), (sx + out[0] * length * 0.5 + side * 1.2, sy + out[1] * length * 0.5 - 0.8), tip, notch, low, root])
    inside = set(mask)
    for (x, y) in mask:
        far = math.hypot(x + 0.5 - sx, y + 0.5 - sy) / max(1.0, length)
        lead = (x, y - 1) not in inside
        cel.put(x, y, ("leather", 2) if far > 0.84 else ("leather", 5) if lead else ("leather", 3) if far > 0.5 else ("leather", 4))


class ScholarOwl(Character):
    W, H, TOP = 64, 56, 0

    def joints(self, pose: Pose) -> dict[str, Pt]:
        return {"feet": (OX + pose.get("dx", 0.0), OY + pose.get("dy", 0.0))}

    def draw(self, cel, J, pose, ropes, between) -> None:
        fx, fy = J["feet"]
        squat = int(pose.get("squat", 0))  # crouched: its head a pixel down into its shoulders
        left, top = int(round(fx)) - 6, int(round(fy)) - ROWS
        lean = int(pose.get("lean", 0))  # going somewhere: head a pixel ahead, tail a pixel behind
        hx, hy = left + lean, top + squat
        # Wings first: they are behind the body. Folded (`open` 0) there are none — the shoulders in BODY are them.
        if pose.get("open", 1.0) > 0.5:
            for side, key in ((-1, "wingL"), (1, "wingR")):
                deg, scale = pose[key]
                wing(cel, (left + 6.5 + side * 6.2, top + 10.2), side, deg, WING * scale)
        cel.stamp(BODY, L, left, top + len(HEAD))
        cel.stamp(HEAD[squat:], L, hx, hy + squat)
        look = int(pose.get("look", 0))
        nod = int(pose.get("nod", 0))  # the face a pixel lower: its head bowed
        eyes = pose.get("eyes", "open")
        ring = RIM_HOT if eyes == "wide" else RIM
        for cx in (3 + look, 9 + look):
            ex, ey = hx + cx, hy + 6 + nod
            for dx in range(-2, 3):
                for dy in range(-2, 3):
                    if abs(dx) == 2 and abs(dy) == 2:
                        cel.put(ex + dx, ey + dy, DISC)  # round lenses: their corners are the pale disc of its face
                    elif abs(dx) == 2 or abs(dy) == 2:
                        cel.put(ex + dx, ey + dy, ring)
                    elif eyes == "shut":
                        cel.put(ex + dx, ey + dy, LID if dy == 0 else DISC)
                    elif eyes == "wide":
                        cel.put(ex + dx, ey + dy, ("light", 0))
                    else:
                        cel.put(ex + dx, ey + dy, DISC)
            if eyes == "open":
                cel.put(ex + (1 if look > 0 else 0), ey, PUPIL)
                cel.put(ex + (1 if look > 0 else 0), ey + 1, PUPIL)
                cel.put(ex - (0 if look > 0 else 1), ey - 1, ("light", 0))
            elif eyes == "wide":
                cel.put(ex, ey, PUPIL)
        bx = hx + 6 + look
        cel.put(bx, hy + 6 + nod, RIM)  # the bridge of the spectacles
        cel.put(bx, hy + 8 + nod, BEAK)
        cel.put(bx, hy + 9 + nod, BEAK_TIP)
        if pose.get("tufts", 0.0) > 0.5:  # ears pricked
            for x in (0, 12):
                cel.put(hx + x, hy - 1, L["D"])
        feet = int(pose.get("feet", 0))
        base = top + ROWS
        if feet == 1:  # standing: its toes on the ground
            for x in (2, 3, 4, 8, 9, 10):
                cel.put(left + x, base, FOOT)
        elif feet == 2:  # reaching for the ground: legs out under it
            for x in (3, 9):
                cel.put(left + x, base, FOOT)
                cel.put(left + x, base + 1, FOOT)
                cel.put(left + x - 1, base + 2, FOOT)
                cel.put(left + x + 1, base + 2, FOOT)
        else:  # in the air: a short tail under it, behind when it leans
            for i, t in enumerate((L["D"], ("leather", 2), L["D"])):
                cel.put(left + 5 + i - lean, base, t)
            cel.put(left + 6 - lean, base + 1, ("leather", 2))
        cel.outline()
        spark = pose.get("spark", 0.0)
        if spark > 0.05:  # delight: a glint off the spectacles, up and to the side
            cel.star(hx + 15, hy - 2, 3 if spark > 0.6 else 1)


# --------------------------------------------------------------------------------------- animations
UP, LEVEL, DOWN = -56.0, 0.0, 44.0
BASE: Pose = dict(dx=0.0, dy=0.0, lean=0, look=0, nod=0, squat=0, eyes="open", open=1.0, wingL=(UP, 1.0), wingR=(UP, 1.0), tufts=0.0, feet=0, spark=0.0, flash=0.0)


def beat(ph: float, up: float = UP, down: float = DOWN) -> float:
    """A wing's angle through one beat: raised at 0, down at half a beat, the downstroke quicker than the lift."""
    c = math.cos(math.tau * ph)
    s = math.copysign(abs(c) ** 0.75, c)
    return (up + down) / 2 + (up - down) / 2 * s


def k(**over: object) -> Pose:
    return {**BASE, **over}


def both(deg: float, scale: float = 1.0) -> dict:
    return dict(wingL=(deg, scale), wingR=(deg, scale))


def hover_pose(ph: float) -> Pose:
    return k(dy=round(1.3 * math.cos(math.tau * (ph - 0.12))), **both(beat(ph)))


def fly_pose(ph: float) -> Pose:
    # Going somewhere: leaning into it, looking where it goes, a deeper beat; the far wing is turned away.
    a = beat(ph, UP - 6.0, DOWN + 6.0)
    return k(lean=1, look=1, dy=round(1.0 * math.cos(math.tau * (ph - 0.12))), wingL=(a, 1.0), wingR=(a, 0.74))


def brake_pose(ph: float) -> Pose:
    # About to land: upright, legs out, short quick beats high over its back.
    return k(feet=2, **both(beat(ph, UP - 10.0, LEVEL - 8.0)))


STAND = dict(open=0.0, feet=1)
# Perched: mostly still. It blinks, looks ahead at the fight, looks behind, blinks again.
PERCH = [
    (k(**STAND), 1700), (k(**STAND, eyes="shut"), 90), (k(**STAND), 1000), (k(**STAND, look=1), 900), (k(**STAND), 600),
    (k(**STAND, eyes="shut"), 90), (k(**STAND), 1400), (k(**STAND, look=-1), 700), (k(**STAND), 500),
]
# Touchdown: wings still out and falling, a squat as its weight comes down, then it folds and stands.
SETTLE = [
    (k(feet=1, squat=1, **both(LEVEL - 20.0)), 70), (k(feet=1, squat=1, **both(LEVEL + 24.0, 0.9)), 70),
    (k(feet=1, squat=1, **both(DOWN + 22.0, 0.7)), 70), (k(**STAND, squat=1), 60), (k(**STAND), 60),
]
# Leaving the path: a crouch, wings opening low, then they come up as it springs.
TAKEOFF = [
    (k(**STAND, squat=1), 60), (k(feet=1, squat=1, **both(DOWN + 22.0, 0.7)), 60), (k(feet=1, squat=1, **both(LEVEL + 10.0)), 50), (k(feet=2, **both(UP - 8.0)), 50),
]

# A boss has fallen: two happy bounces with its wings thrown up, eyes shut in a smile, a glint off its glasses.
CHEER_KEYS = [
    (0.00, k(**both(LEVEL)), "lin"),
    (0.10, k(dy=1.0, eyes="shut", **both(DOWN)), "out"),
    (0.28, k(dy=-6.0, eyes="shut", spark=1.0, tufts=1.0, **both(UP - 12)), "out"),
    (0.46, k(dy=0.0, eyes="shut", spark=0.3, **both(DOWN)), "in"),
    (0.56, k(dy=1.0, eyes="shut", **both(DOWN)), "out"),
    (0.74, k(dy=-5.0, eyes="shut", spark=1.0, tufts=1.0, **both(UP - 12)), "out"),
    (0.90, k(dy=0.0, spark=0.3, **both(LEVEL + 20)), "in"),
    (1.00, k(**both(UP)), "io"),
]

# A chest has dropped: it starts — ears up, eyes wide and bright — and looks hard at it before it settles.
SPOT_KEYS = [
    (0.00, k(**both(LEVEL)), "lin"),
    (0.14, k(dy=-2.0, eyes="wide", tufts=1.0, **both(UP - 14, 0.9)), "out"),
    (0.34, k(dy=-1.0, eyes="wide", tufts=1.0, look=1, **both(DOWN)), "io"),
    (0.54, k(dy=-2.0, eyes="wide", tufts=1.0, look=1, spark=1.0, **both(UP)), "io"),
    (0.74, k(dy=-1.0, eyes="wide", tufts=1.0, look=1, **both(DOWN)), "io"),
    (0.90, k(dy=0.0, look=1, **both(UP)), "io"),
    (1.00, k(**both(UP)), "io"),
]

# A hero has gained a level: an approving nod over its spectacles, twice, the lenses catching the light.
DING_KEYS = [
    (0.00, k(**both(LEVEL)), "lin"),
    (0.18, k(nod=1, eyes="shut", **both(DOWN)), "io"),
    (0.36, k(nod=0, tufts=1.0, spark=1.0, **both(UP)), "io"),
    (0.56, k(nod=1, eyes="shut", spark=0.4, **both(DOWN)), "io"),
    (0.76, k(nod=0, tufts=1.0, spark=1.0, **both(UP)), "io"),
    (1.00, k(**both(LEVEL)), "io"),
]

# The party has fallen: on the ground, head bowed, eyes shut, its wings hanging open at its sides. It sags and
# lifts a little, slowly.
MOURN = [
    (k(feet=1, nod=1, eyes="shut", **both(74.0, 0.62)), 700),
    (k(feet=1, nod=1, squat=1, eyes="shut", **both(80.0, 0.66)), 500),
    (k(feet=1, nod=1, eyes="shut", **both(74.0, 0.62)), 600),
    (k(feet=1, nod=1, squat=1, eyes="shut", **both(70.0, 0.6)), 450),
]

ANIMS = {
    "idle": cycle("idle", hover_pose, 8, 64),
    "move": cycle("move", fly_pose, 6, 56),
    "perch": held("perch", PERCH, True),
    "land": cycle("land", brake_pose, 4, 50),
    "settle": held("settle", SETTLE, False),
    "takeoff": held("takeoff", TAKEOFF, False),
    "cheer": one_shot("cheer", CHEER_KEYS, 16, 1040),
    "spot": one_shot("spot", SPOT_KEYS, 13, 900),
    "ding": one_shot("ding", DING_KEYS, 12, 780),
    "mourn": held("mourn", MOURN, True),
}
