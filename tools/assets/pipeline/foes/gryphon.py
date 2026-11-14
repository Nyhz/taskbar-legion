"""Citadel Gryphon — world 9, beast. A war-beast of the citadel the height of a horse: in front an eagle — slate
feathers, a deep chest and ruff, a hooked gold beak under a gilded half-helm with a red plume, scaled yellow
forelegs ending in talons — and behind it a lion, tawny, with a tucked waist, a heavy haunch and a tufted tail;
an azure saddle cloth trimmed with gold lies across its back. It has its own rig: a hand-drawn body and head on
four two-bone legs, a tail that is a chain, and two wings built like a bird's — upper arm, forearm and hand, with
primaries, secondaries, tertials and two rows of coverts — that fold into a blade along the back and open into
a broad fan. It bounds with the wings half open, beating in time. To attack it rears with both wings spread,
hangs there, and comes down raking with talons and beak. It dies screaming with its wings up; then the forelegs
buckle, it goes down on its chest, the haunches follow, and the near wing falls open behind it while loose
feathers drift down.

Its frame has 14 extra rows above (the wings need them). Drawn facing right; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Pose, Pt, ik, keyed, lerp

FIGURE = ("Gryphon", "foe", "w09")

BUILD = Build(root_x=40, thigh=9.0, shin=9.5, foot=0.0, hip_dx=0.0, spine=0.0, sh_near=0.0, sh_far=0.0, upper=0.0, fore=0.0, neck=0.0)


def _rows(*rows: str) -> list[str]:
    w = max(len(r) for r in rows)
    return [r.ljust(w, ".") for r in rows]


L = {
    "l": ("leather", 2), "m": ("leather", 3), "n": ("leather", 4), "o": ("leather", 5), "p": ("leather", 6), "q": ("leather", 1),
    "a": ("ink", 1), "b": ("ink", 2), "c": ("ink", 3), "d": ("ink", 4), "e": ("ink", 5), "k": ("ink", 0),
    "u": ("azure", 2), "v": ("azure", 3), "x": ("azure", 4), "y": ("azure", 5),
    "h": ("brass", 3), "i": ("brass", 4), "j": ("brass", 5), "K": ("brass", 6),
    "r": ("crimson", 3), "s": ("crimson", 4), "t": ("crimson", 5),
    "w": ("bone", 6), "E": ("crimson", 5), "O": ("brass", 7),
}

# From the rump (left) to the breast (right): a lion's haunch and tucked waist in tawny; the saddle cloth, azure
# with a gold device and a gold hem, its girth under the belly; then the eagle — a pale edge of ruff feathers and
# the deep slate chest, humped at the withers.
BODY = _rows(
    "..........................bccd......",
    ".....mnoop.....vxxyy....bbccdde.....",
    "...mmnnooopp..vvxxxyyw.bbccddeed....",
    "..lmnnoooopponvvxxxxyywbbccddeedd...",
    ".llmnnooooppnnvvxKxxyywabccddeeddc..",
    ".lmmnnoooopnnnvxKKKxyywabbccddddccb.",
    "llmmnnoooonnnmvvxKxxyywwabccddddccbb",
    "llmmnnooooonnmvvxxxxyyiwabbccdddccbb",
    "llmmnnnoooonmmvvxxxxyyiwaabccddccbba",
    ".lmmnnnooonnmmvvxxxyyiiw.abbccccbba.",
    ".llmmnnnoonnmljjjjjjjjj.aabbcccbbaa.",
    "..llmmnnnnnml.qqmno......aabbcbbaa..",
    "..lllmmnnnml..............aabbbaa...",
    "...lllmmmml................aaaaa....",
    "....lllmmm..........................",
)
# An eagle's head: a gilded half-helm over the crown with a red plume swept back, under its brim a slate face
# with a burning eye, and a heavy hooked beak with a dark tip.
HEAD = _rows(
    "tt",
    ".tts",
    "..rtshij",
    "...rhijjKK",
    "..chiijjKKK",
    ".bcdhiijjjKk",
    ".bcddekOEkeijK",
    "abcddeeeedijKKj",
    "abccddeeedhijjKj",
    "abccdddeek.hiijk",
    ".abccddd...hh.k",
    "..aabcc",
)

BODY_H = 19.0
SHOULDER, HIP = (10.0, 2.0), (-12.0, 2.0)
FRONT_X, HIND_X = 11.5, -13.5
WING_ROOT, NECK_BASE, TAIL_ROOT = (7.0, -7.0), (13.0, -5.5), (-17.5, -2.0)
HUMERUS, FOREARM, HAND = 7.0, 8.0, 6.0
#: Flight feathers: (bone, position along it 0–1, length, angle folded, angle spread). Angles are screen degrees
#: (180 = back, 270 = up). Tertials on the upper arm, secondaries on the forearm, primaries on the hand.
FEATHERS = [
    ("hum", 0.35, 8.0, 190.0, 164.0), ("hum", 0.70, 8.5, 186.0, 170.0), ("hum", 1.00, 9.0, 182.0, 178.0),
    ("fore", 0.20, 10.0, 152.0, 186.0), ("fore", 0.40, 10.5, 154.0, 193.0), ("fore", 0.60, 11.0, 156.0, 200.0), ("fore", 0.80, 11.5, 158.0, 208.0),
    ("fore", 1.00, 12.0, 160.0, 216.0),
    ("hand", 0.20, 14.0, 168.0, 228.0), ("hand", 0.40, 15.5, 171.0, 240.0), ("hand", 0.60, 16.5, 174.0, 252.0), ("hand", 0.80, 16.5, 177.0, 265.0),
    ("hand", 1.00, 15.0, 180.0, 278.0), ("hand", 1.00, 12.5, 183.0, 292.0),
]


class Gryphon(Character):
    build = BUILD
    TOP = 14

    def joints(self, pose: Pose) -> dict[str, Pt]:
        rx = BUILD.root_x + pose.get("dx", 0.0)
        by = GROUND - BODY_H + pose.get("dy", 0.0)
        pitch = pose.get("pitch", 0.0)
        a = math.radians(pitch)
        ca, sa = math.cos(a), math.sin(a)

        def at(x: float, y: float) -> Pt:
            return (rx + x * ca - y * sa, by + x * sa + y * ca)

        def polar(p: Pt, deg: float, n: float) -> Pt:
            return (p[0] + n * math.cos(math.radians(deg)), min(p[1] + n * math.sin(math.radians(deg)), GROUND - 1.0))

        nb = at(*NECK_BASE)
        J: dict[str, Pt] = {"body": (rx, by), "neck": nb, "withers": at(11.0, -3.5), "tail": at(*TAIL_ROOT), "lean": (pitch, 0.0)}
        J["head"] = polar(nb, -58.0 + pitch + pose.get("neck", 0.0), 8.0)
        for name, root, rest in (("fn", SHOULDER, FRONT_X), ("ff", (SHOULDER[0] + 2.0, SHOULDER[1] - 0.5), FRONT_X + 2.2),
                                 ("hn", HIP, HIND_X), ("hf", (HIP[0] + 2.0, HIP[1] - 0.5), HIND_X + 2.2)):
            fx, lift = pose[name]
            top = at(*root)
            knee, foot = ik(top, (rx + rest + fx, GROUND - 1.2 - lift), BUILD.thigh, BUILD.shin, 1)
            J[name + "_top"], J[name + "_knee"], J[name + "_foot"] = top, knee, foot
        # Wings. `wing` folds (0) or spreads (1) them; `flap` swings the whole wing about the shoulder (negative =
        # back and down, positive = forward). Folded, the forearm doubles forward over the upper arm, as a bird's does.
        w, flap, droop = pose.get("wing", 0.0), pose.get("flap", 0.0), pose.get("droop", 0.0)
        for name, off, skew in (("wn", WING_ROOT, 0.0), ("wf", (WING_ROOT[0] + 2.5, WING_ROOT[1] - 0.5), 10.0)):
            root = at(*off)
            turn = pitch * (0.4 + 0.6 * w) + skew * w
            # `droop`: the wing goes limp and falls open backwards, flat on the ground behind the body.
            elbow = polar(root, lerp(lerp(200.0, 255.0, w) + flap + turn, 170.0 + skew, droop), HUMERUS)
            wrist = polar(elbow, lerp(lerp(10.0, -78.0, w) + flap * 0.8 + turn, -172.0 + skew, droop), FOREARM)
            tip = polar(wrist, lerp(lerp(178.0, 300.0, w) + flap * 0.7 + turn, 182.0 + skew, droop), HAND)
            J[name + "_root"], J[name + "_elbow"], J[name + "_wrist"], J[name + "_tip"] = root, elbow, wrist, tip
            bones = {"hum": (root, elbow), "fore": (elbow, wrist), "hand": (wrist, tip)}
            for i, (bone, t, length, folded, spread) in enumerate(FEATHERS):
                p0, p1 = bones[bone]
                base = (p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t)
                ang = lerp(lerp(folded, spread, w) + flap * (0.35 + 0.035 * i) + turn, 146.0 + 3.4 * i + skew, droop)
                J[f"{name}_b{i}"] = base
                J[f"{name}_t{i}"] = polar(base, ang, length * (0.92 + 0.08 * w))
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def grounded(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        return {"tail": ChainSpec(Chain(7, 2.3, gravity=0.1, drag=0.12, damp=0.1), lambda J: J["tail"], grounded, (-0.82, 0.42))}

    def leg(self, cel: Cel, J: dict[str, Pt], name: str, far: bool) -> None:
        top, knee, foot = J[name + "_top"], J[name + "_knee"], J[name + "_foot"]
        if name[0] == "f":  # eagle: feathered thigh, scaled yellow shank, a spread of talons with dark claws
            cel.limb(top, knee, 6.4, 4.0, "ink", (1, 2, 4), far=far)
            cel.limb(knee, foot, 3.0, 2.6, "brass", (2, 4, 6), far=far)
            for dx, dy in ((4.4, 0.4), (3.4, -1.6), (-2.6, 0.4)):
                toe = (foot[0] + dx, min(foot[1] + dy, GROUND - 1.0))
                cel.limb(foot, toe, 2.0, 1.4, "brass", (2, 4, 6), far=far)
                cel.put(toe[0] + (0.9 if dx > 0 else -0.9), toe[1] + 0.7, ("ink", 0))
        else:  # lion: a heavy thigh, a lean shank, a broad paw
            cel.limb(top, knee, 7.2, 4.4, "leather", (2, 4, 5), far=far)
            cel.limb(knee, foot, 3.8, 3.2, "leather", (2, 3, 5), far=far)
            cel.limb((foot[0] - 0.8, foot[1]), (foot[0] + 3.0, foot[1] + 0.2), 3.4, 3.0, "leather", (3, 4, 6), far=far)
            cel.put(foot[0] + 3.6, foot[1] + 0.8, ("leather", 1))

    def wing(self, cel: Cel, J: dict[str, Pt], name: str, far: bool) -> None:
        """Back to front: primaries (dark), secondaries (azure), tertials; then the coverts that cover their
        roots in two paler rows; then the arm itself along the leading edge, with a gilded cap at the wrist."""
        order = list(range(13, 7, -1)) + list(range(3, 8)) + [0, 1, 2]
        for i in order:
            base, tip = J[f"{name}_b{i}"], J[f"{name}_t{i}"]
            if i >= 8:
                cel.limb(base, tip, 3.6, 1.8, "ink", (0, 1, 3) if i % 2 else (1, 2, 4), far=far)
                cel.put(tip[0], tip[1], ("ink", 4 if far else 6))
            elif i >= 3:
                cel.limb(base, tip, 3.6, 2.2, "azure", (1, 2, 4) if i % 2 else (2, 3, 5), far=far)
                cel.put(tip[0], tip[1], ("bone", 4 if far else 6))
            else:
                cel.limb(base, tip, 3.4, 2.2, "ink", (1, 2, 4), far=far)
        for i in range(13, -1, -1):  # greater coverts: half the feather's length
            base, tip = J[f"{name}_b{i}"], J[f"{name}_t{i}"]
            mid = (base[0] + (tip[0] - base[0]) * 0.45, base[1] + (tip[1] - base[1]) * 0.45)
            cel.limb(base, mid, 3.4, 2.4, "azure", (2, 3, 5) if i % 2 else (2, 4, 5), far=far)
        for i in range(13, -1, -1):  # lesser coverts: a short pale row
            base, tip = J[f"{name}_b{i}"], J[f"{name}_t{i}"]
            mid = (base[0] + (tip[0] - base[0]) * 0.2, base[1] + (tip[1] - base[1]) * 0.2)
            cel.limb(base, mid, 3.0, 2.4, "ink", (4, 5, 6), far=far)
        cel.limb(J[name + "_root"], J[name + "_elbow"], 3.6, 3.0, "ink", (2, 3, 5), far=far)
        cel.limb(J[name + "_elbow"], J[name + "_wrist"], 3.0, 2.6, "ink", (2, 3, 5), far=far)
        cel.limb(J[name + "_wrist"], J[name + "_tip"], 2.6, 1.8, "ink", (2, 3, 5), far=far)
        wx, wy = J[name + "_wrist"]
        for dx, dy, i in ((0, 0, 6), (1, 0, 5), (0, -1, 5), (-1, 0, 4), (0, 1, 3)):
            cel.put(wx + dx, wy + dy, ("brass", i - 1 if far else i))

    def draw(self, cel, J, pose, ropes, between) -> None:
        pitch = pose.get("pitch", 0.0)
        self.wing(cel, J, "wf", far=True)
        self.leg(cel, J, "ff", far=True)
        self.leg(cel, J, "hf", far=True)
        tail = ropes["tail"]
        for i in range(len(tail) - 1):
            cel.limb(tail[i], tail[i + 1], 2.4 - i * 0.12, 2.2 - i * 0.12, "leather", (2, 4, 5))
        tx, ty = tail[-1]
        for dx, dy, i in ((0, 0, 2), (-1, 0, 1), (0, 1, 1), (-1, 1, 1), (-2, 1, 2), (-1, -1, 2), (-2, 0, 1), (1, 1, 2), (-1, 2, 1)):
            cel.put(tx + dx, ty + dy, ("leather", i))
        bx, by = J["body"]
        cel.stamp_pivot(BODY, L, (bx, by), 18.0, 8.0, pitch)
        self.leg(cel, J, "fn", far=False)
        self.leg(cel, J, "hn", far=False)
        # Neck: a thick feathered column from the withers to the head, the ruff paler along its back.
        hx, hy = J["head"]
        wx, wy = J["withers"]
        cel.limb((wx, wy), (hx - 0.5, hy + 0.5), 10.0, 8.0, "ink", (2, 3, 4))
        for t in (0.25, 0.5, 0.75):
            cel.put(wx + (hx - wx) * t - 3.0, wy + (hy - wy) * t - 1.0, ("ink", 5))
        turn = pitch * 0.5 + pose.get("head_rot", 0.0)
        cel.stamp_pivot(HEAD, L, (hx, hy), 3.0, 8.5, turn)
        self.wing(cel, J, "wn", far=False)
        cel.outline()

        a = math.radians(turn)

        def on_head(x: float, y: float) -> Pt:
            return (hx + x * math.cos(a) - y * math.sin(a), hy + x * math.sin(a) + y * math.cos(a))

        if pose.get("alive", 1.0) > 0.5:
            ex, ey = on_head(4.5, -2.0)
            cel.put(ex, ey, ("light", 0))
        # The rake: three claw strokes hanging in the air where the talons came down.
        slash = pose.get("slash", 0.0)
        if 0.01 < slash < 0.985:
            ix = BUILD.root_x + pose.get("dx", 0.0) + 19.0
            for j in range(3):
                for s_ in range(17):
                    if slash > 0.5 and (s_ + j) % (2 + int((slash - 0.5) * 8)) == 0:
                        continue
                    t = s_ / 16
                    x, y = ix + j * 4.0 - 4.0 + 8.0 * t, GROUND - 24.0 + 21.0 * t + 2.4 * math.sin(t * math.pi)
                    cel.soft(x, y, ("light", 0) if slash < 0.45 else ("bone", 6))
                    cel.soft(x + 1, y, ("light", 0) if slash < 0.3 else ("bone", 7) if slash < 0.6 else ("bone", 5))
        dust = pose.get("dust", 0.0)
        if dust > 0.05:
            for i in range(int(4 + dust * 7)):
                cel.soft(bx - 15.0 - i * 1.8 - dust * 3.0, GROUND - 1.5 - (i % 3) * 1.6 - dust * 2.5, ("bone", 6 if i % 2 else 7))
        # Loose feathers shaken out as it dies, rocking down to the ground.
        fall = pose.get("feathers", 0.0)
        if 0.01 < fall < 0.985:
            for i in range(7):
                u = max(0.0, min(1.0, fall * 1.5 - i * 0.07))
                if 0.0 < u < 1.0:
                    x = bx - 16.0 + i * 5.5 + 3.5 * math.sin(u * 8.0 + i * 1.9)
                    y = GROUND - 44.0 + i * 2.0 + u * (42.0 - i * 2.0)
                    lean = 1 if math.cos(u * 8.0 + i * 1.9) > 0 else -1
                    cel.soft(x, y, ("ink", 3))
                    cel.soft(x + lean, y - 1, ("azure", 4) if i % 2 else ("ink", 4))
                    cel.soft(x + 2 * lean, y - 2, ("bone", 6))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, dy=0.0, pitch=-2.0, neck=0.0, head_rot=0.0, fn=(0.0, 0.0), ff=(0.0, 0.0), hn=(0.0, 0.0), hf=(0.0, 0.0), wing=0.0, flap=0.0,
                  droop=0.0, slash=0.0, dust=0.0, alive=1.0, feathers=0.0)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    # It stands like a sentry and watches like a bird: the head snaps from one side to the other. Now and then
    # the wings ruffle open and a fore talon flexes off the marble.
    look = max(-1.0, min(1.0, 3.0 * math.sin(math.tau * (ph - 0.05))))
    ruffle = max(0.0, math.sin(math.tau * (ph - 0.55) * 2.0)) if 0.55 < ph < 1.0 else 0.0
    claw = max(0.0, math.sin(math.tau * (ph - 0.1) * 2.5)) if 0.1 < ph < 0.3 else 0.0
    return {**BASE, "dy": 0.3 + 0.5 * s, "pitch": -2.0 + 1.0 * late, "neck": 2.0 * late, "head_rot": -3.0 + 9.0 * look, "wing": 0.16 * ruffle, "flap": -6.0 * ruffle,
            "fn": (1.8 * claw, 3.2 * claw)}


def _bound(q: float, reach: float, height: float) -> tuple[float, float]:
    """One foot of a bounding gait: a short, hard stance, then a long reach forward well off the ground."""
    q %= 1.0
    if q < 0.3:
        return (reach * (1 - 2 * q / 0.3), 0.0)
    t = (q - 0.3) / 0.7
    ease = t * t * (3 - 2 * t)
    return (-reach + 2 * reach * ease, height * math.sin(math.pi * t) ** 0.8)


def bound_pose(ph: float) -> Pose:
    # Talons land together, the haunches drive; in between it is in the air and the wings beat once to carry it.
    fn, ff = _bound(ph, 7.0, 5.6), _bound(ph - 0.07, 7.0, 5.6)
    hn, hf = _bound(ph + 0.5, 7.0, 4.6), _bound(ph + 0.43, 7.0, 4.6)
    rock = math.sin(math.tau * (ph + 0.08))
    beat = math.sin(math.tau * (ph - 0.3))
    return {**BASE, "pitch": 7.0 * rock, "dy": -2.0 - 2.0 * math.cos(2 * math.tau * (ph - 0.42)), "neck": -5.0 * rock, "head_rot": -3.0 - 4.0 * rock,
            "fn": fn, "ff": ff, "hn": hn, "hf": hf, "wing": 0.5 + 0.2 * beat, "flap": 18.0 * math.sin(math.tau * (ph - 0.18)),
            "dust": max(0.0, math.sin(math.tau * (ph - 0.52))) if 0.52 < ph < 0.85 else 0.0}


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Rake: it sinks, rears with both wings thrown wide, hangs, and drops on the prey with talons and beak.
_UP = dict(fn=(3.0, 14.0), ff=(5.0, 17.0), hn=(3.0, 0.0), hf=(3.0, 0.0))
ATTACK_KEYS = [
    (0.00, k(), "lin"),
    (0.20, k(dx=-2.0, dy=2.6, pitch=5.0, neck=12.0, head_rot=12.0, fn=(2.0, 0.0), ff=(2.0, 0.0), hn=(2.0, 0.0), hf=(2.0, 0.0), wing=0.2), "out"),
    (0.34, k(dx=-3.0, dy=-5.0, pitch=-38.0, neck=-6.0, head_rot=6.0, **_UP, wing=1.0, flap=-8.0), "out"),
    (0.44, k(dx=-3.2, dy=-5.6, pitch=-42.0, neck=4.0, head_rot=16.0, **{**_UP, "fn": (4.0, 16.0), "ff": (6.0, 19.0)}, wing=1.0, flap=-16.0), "io"),
    (0.50, k(dx=6.0, dy=1.6, pitch=14.0, neck=16.0, head_rot=26.0, fn=(2.5, 0.0), ff=(3.5, 0.0), hn=(-6.0, 0.0), hf=(-6.0, 0.0), wing=0.8, flap=30.0, slash=0.02, dust=0.6), "in"),
    (0.66, k(dx=6.4, dy=2.0, pitch=15.0, neck=18.0, head_rot=30.0, fn=(2.1, 0.0), ff=(3.1, 0.0), hn=(-6.4, 0.0), hf=(-6.4, 0.0), wing=0.6, flap=24.0, slash=0.98), "lin"),
    (0.84, k(dx=2.6, dy=0.2, pitch=2.0, neck=6.0, head_rot=8.0, fn=(1.0, 2.2), hn=(-2.6, 0.0), hf=(1.0, 2.2), ff=(-2.6, 0.0), wing=0.25, flap=6.0, slash=1.0), "io"),
    (1.00, k(slash=1.0), "io"),
]

# Hit: the head is knocked up, the talons leave the ground and the wings flare for balance; it skids back on its
# haunches, lands and steps in again. Feet are planted (x = −dx) unless lifted or skidding.
HURT_KEYS = [
    (0.00, k(flash=0.0), "lin"),
    (0.07, k(dx=-1.0, pitch=-7.0, neck=-10.0, head_rot=-16.0, fn=(2.0, 2.4), ff=(1.0, 0.0), hn=(1.0, 0.0), hf=(1.0, 0.0), wing=0.4, flap=-8.0, flash=1.0), "out3"),
    (0.16, k(dx=-3.0, dy=-1.5, pitch=-13.0, neck=-18.0, head_rot=-26.0, fn=(3.6, 6.0), ff=(4.0, 5.0), hn=(2.2, 0.0), hf=(2.2, 0.0), wing=0.85, flap=-14.0, dust=0.5, flash=0.5), "lin"),
    (0.26, k(dx=-5.0, dy=-0.6, pitch=-9.0, neck=-10.0, head_rot=-16.0, fn=(4.0, 3.4), ff=(4.4, 2.6), hn=(1.8, 0.0), hf=(1.8, 0.0), wing=0.75, flap=-4.0, dust=1.0, flash=0.0), "out"),
    (0.50, k(dx=-4.4, dy=1.4, pitch=5.0, neck=14.0, head_rot=22.0, fn=(1.2, 0.0), ff=(1.2, 0.0), hn=(1.2, 0.0), hf=(1.2, 0.0), wing=0.35, flap=16.0, flash=0.0), "in"),
    (0.74, k(dx=-1.8, neck=4.0, head_rot=4.0, fn=(1.4, 2.4), ff=(-1.4, 0.0), hn=(0.6, 1.8), hf=(-1.4, 0.0), wing=0.15, flash=0.0), "io"),
    (1.00, k(flash=0.0), "io"),
]

# Death: it rears and screams with its wings up; the forelegs buckle and it goes down on its chest, the haunches
# follow, the head stretches out on the marble, and the near wing falls open behind it. Feathers drift down.
_DOWN = dict(dx=-1.0, dy=11.4, pitch=3.0, neck=100.0, head_rot=26.0, fn=(8.0, 0.0), ff=(9.0, 0.0), hn=(-6.0, 0.0), hf=(-5.0, 0.0), alive=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-2.5, dy=-2.0, pitch=-22.0, neck=-12.0, head_rot=-26.0, fn=(2.0, 8.0), ff=(3.0, 10.0), hn=(2.5, 0.0), hf=(2.5, 0.0), wing=0.9, flap=-10.0, feathers=0.02), "out3"),
    (0.26, k(dx=-3.0, dy=-3.0, pitch=-30.0, neck=-18.0, head_rot=-38.0, fn=(3.0, 10.0), ff=(4.0, 12.0), hn=(3.0, 0.0), hf=(3.0, 0.0), wing=1.0, flap=-20.0, feathers=0.2), "io"),
    (0.40, k(dx=-1.5, dy=5.0, pitch=17.0, neck=30.0, head_rot=18.0, fn=(5.0, 0.0), ff=(6.0, 0.0), hn=(1.5, 0.0), hf=(1.5, 0.0), wing=0.9, flap=-6.0, dust=0.5, feathers=0.4), "in"),
    (0.52, k(**{**_DOWN, "dy": 11.0, "pitch": 7.0, "neck": 62.0, "head_rot": 10.0}, wing=0.85, flap=-10.0, droop=0.25, dust=0.9, feathers=0.55), "in"),
    (0.60, k(**{**_DOWN, "dy": 10.2, "neck": 80.0, "head_rot": 12.0}, wing=0.85, droop=0.5, feathers=0.65), "out"),
    (0.70, k(**_DOWN, wing=0.85, droop=0.78, feathers=0.76), "in"),
    (0.84, k(**{**_DOWN, "neck": 96.0, "head_rot": 20.0}, wing=0.85, droop=0.92, feathers=0.9), "out"),
    (1.00, k(**_DOWN, wing=0.85, droop=1.0, feathers=1.0), "io"),
]

STILL = lambda t: (-0.15 + 0.25 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [160] * 12, True, STILL),
    "run": Anim("run", bound_pose, [i / 10 for i in range(10)], [62] * 10, True, lambda t: (-1.2, 0.0)),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.10, 0.20, 0.27, 0.34, 0.44, 0.50, 0.55, 0.60, 0.66, 0.75, 0.84, 0.92, 1.0],
                   [80, 80, 100, 60, 110, 170, 40, 60, 80, 110, 100, 90, 90, 110], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.18, 0.26, 0.33, 0.40, 0.46, 0.52, 0.60, 0.70, 0.77, 0.84, 0.92, 1.0],
                  [50, 50, 80, 90, 170, 70, 70, 60, 70, 90, 100, 110, 130, 150, 1200], False, STILL),
}
