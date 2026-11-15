"""War-Horn Bearer — world 4, support. The herald of the canyon raiders: one of them, built like them and wrapped
like them, but dressed for the band, not for the knife — a wound turban with a red band, the eyes showing over a
turquoise veil, a tunic the red of the rock, a short pale cape, a turquoise sash. In his hands, on a strap, he holds a great ram's
horn curled on itself, bound with bronze; strapped to his back, high over the heads of the pack, is the band's
ragged war standard: a cross-pole with a ram's skull on top, strips of faded turquoise cloth and cords of bone
beads. He stands with the horn held ready at his chest while the standard snaps in the canyon wind. His one act is to sound
it: he swings the horn up to his mouth, fills his chest and blows, and the sound leaves the bell in two or three
plain rings. When he dies he drops to his knees and folds; the standard goes down over him with its rags on the
dirt and the horn rolls out of his hands onto the path behind him.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, ik, keyed, loose, stagger_keys

FIGURE = ("HornBlower", "foe", "w04")

# The raider's own proportions: he is one of them.
BUILD = Build(root_x=44, thigh=6.4, shin=6.4, foot=4.0, hip_dx=1.2, spine=9.0, sh_near=3.0, sh_far=2.6, upper=5.8, fore=5.6, neck=0.9, head_dx=0.7)

L = {
    "b": ("bone", 3), "c": ("bone", 4), "d": ("bone", 5), "e": ("bone", 7),
    "s": ("skin", 1), "t": ("skin", 3), "E": ("light", 0), "k": ("ink", 0),
    "x": ("sea", 2), "y": ("sea", 4), "z": ("sea", 5),
    "r": ("crimson", 2), "R": ("crimson", 4),
    "g": ("crimson", 2), "h": ("crimson", 3), "i": ("crimson", 4), "j": ("crimson", 5), "X": ("leather", 1),
    "m": ("brass", 5),
}

# A wound turban, taller than a raider's wrap, a red band under it with a bronze stud; the slit of the face with
# the eye plain to see; the veil over the rest.
HEAD = [
    "....ccdd...",
    "..bccdddee.",
    ".bbccdddeee",
    ".bccddddeee",
    ".rrRRRRmRr.",
    ".bsttEkte..",
    ".xxyyzzzy..",
    ".xxyyzzz...",
    "..xyyzz....",
    "...xyz.....",
]
# A tunic the red of the canyon rock, the strap of the horn across it, the sash, a loose hem.
TORSO = [
    "..ghhij..",
    ".gghhiij.",
    "gghhhiijj",
    ".ghXhiij.",
    ".ghhXiij.",
    ".ghhiXij.",
    ".xxyyzzz.",
    ".ghhhiij.",
    ".gh.hi.ij",
    ".g..h...j",
]
# The ram's skull on the standard: two curled horns, two sockets, the long nose.
SKULL = [
    "cd...dc",
    "c.ddd.c",
    "cdeeedc",
    ".ekekd.",
    "..ded..",
    "..d.d..",
]

POLE = 35.0  # the standard, foot to the root of the skull
BAR = 0.84  # where the cross-pole sits, as a share of its height
SPAN = 5.5  # half the cross-pole
HORN_STUB = 2.4  # the straight mouthpiece before the curl begins
HORN_R0, HORN_R1 = 3.0, 8.6  # the curl opens out from mouthpiece to bell
HORN_TURN = 232.0  # how far it curls on itself
HORN_N = 16


def horn_points(mouth: Pt, heading: float) -> list[tuple[Pt, float, float]]:
    """The ram's horn from mouthpiece to bell as (point, heading in degrees, width). It leaves the mouthpiece along
    `heading` (0 = forward, 90 = down), runs straight for a finger's length and then curls round on itself — an
    opening spiral, thin and dark at the mouth, wide and pale at the bell."""
    a0 = math.radians(heading)
    x, y = mouth[0] + HORN_STUB * math.cos(a0), mouth[1] + HORN_STUB * math.sin(a0)
    pts: list[tuple[Pt, float, float]] = []
    dphi = math.radians(HORN_TURN) / HORN_N
    for i in range(HORN_N + 1):
        t = i / HORN_N
        h = heading - HORN_TURN * t
        pts.append(((x, y), h, 1.7 + 5.1 * t ** 1.15))
        r = HORN_R0 + (HORN_R1 - HORN_R0) * (i + 0.5) / HORN_N
        hm = math.radians(heading - HORN_TURN * (i + 0.5) / HORN_N)
        x, y = x + r * dphi * math.cos(hm), y + r * dphi * math.sin(hm)
    return pts


class HornBlower(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        lean = math.radians(pose.get("lean", 0.0))
        cl, sl = math.cos(lean), math.sin(lean)
        cx, cy = J["chest"]
        px, py = J["pelvis"]
        # The standard is strapped to his back: its foot at the small of the back, its head high over his own.
        base = (cx - 3.4 * cl - 5.0 * sl, cy - 3.4 * sl + 5.0 * cl)
        a = math.radians(pose.get("std", -7.0) + pose.get("lean", 0.0))
        u = (math.sin(a), -math.cos(a))
        n = (math.cos(a), math.sin(a))
        top = (base[0] + u[0] * POLE, base[1] + u[1] * POLE)
        bar = (base[0] + u[0] * POLE * BAR, base[1] + u[1] * POLE * BAR)
        J["stdB"], J["stdT"], J["bar"] = base, top, bar
        J["barL"] = (bar[0] - n[0] * SPAN, bar[1] - n[1] * SPAN)
        J["barR"] = (bar[0] + n[0] * SPAN, bar[1] + n[1] * SPAN)
        for key, off in (("rag0", -3.6), ("rag1", 0.0), ("rag2", 3.6)):
            J[key] = (bar[0] + n[0] * off, bar[1] + n[1] * off + 1.0)
        # The horn: down at the hip (`carry` 0), held ready at the chest (0.5, where he keeps it) or at his mouth (1);
        # loose once it has fallen.
        hx, hy = J["head"]
        hip = (px - 1.6 * cl + 6.8 * sl, py - 1.6 * sl - 6.8 * cl)
        lips = (hx + 4.2, hy - 2.4)
        c = pose.get("carry", 0.0)
        e = c * c * (3.0 - 2.0 * c)
        held = (hip[0] + (lips[0] - hip[0]) * e + 2.0 * math.sin(math.pi * e), hip[1] + (lips[1] - hip[1]) * e)
        J["horn"] = loose(pose, "horn", held, self.build.root_x)
        horn = horn_points(J["horn"], pose["horn"])
        J["bell"] = horn[-1][0]
        hold = 1.0 - pose.get("horn_free", 0.0)
        gripN = horn[12][0] if c < 0.5 else horn[8][0]
        if hold > 0.01 and pose.get("gripN", 1.0) > 0.5:
            h0 = J["handN"]
            goal = (h0[0] + (gripN[0] - h0[0]) * hold, h0[1] + (gripN[1] - h0[1]) * hold)
            J["elbowN"], J["handN"] = ik(J["shN"], goal, self.build.upper, self.build.fore, +1)
        w = pose.get("gripF", 0.0) * hold
        if w > 0.01:
            at = horn[1][0]
            h0 = J["handF"]
            goal = (h0[0] + (at[0] - h0[0]) * w, h0[1] + (at[1] - h0[1]) * w)
            J["elbowF"], J["handF"] = ik(J["shF"], goal, self.build.upper, self.build.fore, +1)
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def grounded(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 2.2))

        def at(key: str):
            return lambda J: J[key]

        return {
            "rag0": ChainSpec(Chain(6, 2.2, gravity=0.11, drag=0.2, damp=0.08), at("rag0"), grounded, (-0.5, 0.9)),
            "rag1": ChainSpec(Chain(7, 2.2, gravity=0.12, drag=0.17, damp=0.08), at("rag1"), grounded, (-0.5, 0.9)),
            "rag2": ChainSpec(Chain(5, 2.2, gravity=0.11, drag=0.22, damp=0.08), at("rag2"), grounded, (-0.5, 0.9)),
            "beadL": ChainSpec(Chain(4, 1.8, gravity=0.2, drag=0.1, damp=0.1), at("barL"), grounded, (0.0, 1.0)),
            "beadR": ChainSpec(Chain(3, 1.8, gravity=0.2, drag=0.1, damp=0.1), at("barR"), grounded, (0.0, 1.0)),
            "cape": ChainSpec(Chain(5, 2.2, gravity=0.16, drag=0.18, damp=0.1), lambda J: (J["chest"][0] - 3.0, J["chest"][1] - 2.4), grounded, (-0.5, 0.9)),
            "sash": ChainSpec(Chain(4, 2.2, gravity=0.18, drag=0.16, damp=0.1), lambda J: (J["pelvis"][0] - 2.2, J["pelvis"][1] - 3.0), grounded, (-0.6, 0.8)),
        }

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        hip, knee, ankle, toe = J["hip" + s], J["knee" + s], J["ankle" + s], J["toe" + s]
        cel.limb(hip, knee, 4.4, 3.6, "leather", (1, 2, 3), far=far)  # loose dark trousers
        cel.limb(knee, ankle, 3.6, 2.6, "leather", (1, 2, 3), far=far)
        top = (knee[0] + (ankle[0] - knee[0]) * 0.55, knee[1] + (ankle[1] - knee[1]) * 0.55)
        cel.limb(top, ankle, 3.0, 2.8, "bone", (2, 3, 5), far=far)  # bound shins
        cel.limb(ankle, toe, 2.8, 1.9, "leather", (1, 2, 4), far=far)

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 3.4, 2.8, "crimson", (2, 4, 5), far=far)  # the red sleeve
        cel.limb(el, hd, 2.8, 2.4, "skin", (1, 2, 3), far=far)  # a bare forearm
        for dx, dy in ((0, 0), (0, -1), (1, 0)):
            cel.put(hd[0] + dx, hd[1] + dy, ("skin", 2 if far else 4))

    def standard(self, cel: Cel, J: dict[str, Pt], pose: Pose, ropes: dict[str, list[Pt]]) -> None:
        cel.limb(J["stdB"], J["stdT"], 1.6, 1.4, "leather", (2, 3, 5))
        cel.limb(J["barL"], J["barR"], 1.5, 1.5, "leather", (2, 4, 5))
        # The rags: three strips of faded turquoise tied under the cross-pole with a red binding, an ochre line
        # across them that reads as one stripe while they hang together, each torn off at a different length.
        for key, tone in (("rag0", (2, 3, 5)), ("rag2", (3, 4, 5)), ("rag1", (3, 4, 6))):
            pts = ropes[key]
            for i in range(len(pts) - 1):
                w0 = 3.9 if i < len(pts) - 2 else 3.2
                w1 = 3.9 if i < len(pts) - 3 else (3.2 if i < len(pts) - 2 else 1.6)
                cel.limb(pts[i], pts[i + 1], w0, w1, "sea", tone)
            for d in (-1.0, 0.0, 1.0):
                cel.put(pts[0][0] + d, pts[0][1], ("crimson", 3))
                cel.put(pts[3][0] + d, pts[3][1], ("brass", 4))
        # Cords of bone beads from the ends of the cross-pole, a turquoise one at the foot of each.
        for key in ("beadL", "beadR"):
            pts = ropes[key]
            for i in range(len(pts) - 1):
                cel.line(pts[i], pts[i + 1], ("leather", 2))
            for i in range(1, len(pts)):
                cel.put(pts[i][0], pts[i][1], ("bone", 6) if i < len(pts) - 1 else ("sea", 6))
        tx, ty = J["stdT"]
        cel.stamp_rot(SKULL, L, tx, ty, 3.5, 5.0, pose.get("std", -7.0) + pose.get("lean", 0.0))

    def horn(self, cel: Cel, J: dict[str, Pt], pose: Pose) -> None:
        pts = horn_points(J["horn"], pose["horn"])
        # Horn all the way: dark at the tip he blows through, tan along the curl, paler where it widens to the bell.
        for i in range(HORN_N):
            (p0, _h0, w0), (p1, _h1, w1) = pts[i], pts[i + 1]
            if i < 5:
                cel.limb(p0, p1, w0, w1, "leather", (2, 3, 5))
            elif i < 11:
                cel.limb(p0, p1, w0, w1, "leather", (3, 5, 6))
            else:
                cel.limb(p0, p1, w0, w1, "leather", (4, 6, 7))
        # The rings of a ram's horn: a dark line across it every few pixels, from the outer side most of the way in.
        for i in range(3, HORN_N, 2):
            (x, y), h, w = pts[i]
            a = math.radians(h)
            ox, oy = -math.sin(a), math.cos(a)  # the outer side of the curl
            tone = ("leather", 1) if i < 5 else (("leather", 3) if i < 11 else ("leather", 4))
            for d in range(int(w * 0.7) + 1):
                cel.put(x + ox * (w / 2 - 0.5 - d), y + oy * (w / 2 - 0.5 - d), tone)
        # Bronze: the mouthpiece and two rings.
        mx, my = J["horn"]
        (sx, sy), _sh, _sw = pts[0]
        cel.limb((mx, my), (sx, sy), 2.4, 1.6, "brass", (3, 5, 6))
        for i in (6, 12):
            (x, y), h, w = pts[i]
            a = math.radians(h)
            nx, ny = math.sin(a), -math.cos(a)
            steps = int(w) + 2
            for j in range(steps):
                d = -w / 2 + w * j / (steps - 1)
                cel.put(x + nx * d, y + ny * d, ("brass", 6 if d > 0.6 else (5 if d > -1.0 else 3)))
        # The mouth of the bell: a dark hollow inside a pale lip.
        (bx, by), bh, bw = pts[-1]
        a = math.radians(bh)
        dx, dy = math.cos(a), math.sin(a)
        nx, ny = math.sin(a), -math.cos(a)
        half = bw / 2
        j = -half
        while j <= half + 0.01:
            edge = abs(j) > half - 1.0
            cel.put(bx + nx * j + dx * 0.8, by + ny * j + dy * 0.8, ("bone", 7) if edge else ("leather", 1))
            cel.put(bx + nx * j - dx * 0.2, by + ny * j - dy * 0.2, ("bone", 6) if edge else ("leather", 2))
            j += 1.0

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        self.standard(cel, J, pose, ropes)
        cape = ropes["cape"]
        for i in range(len(cape) - 1):
            cel.limb(cape[i], cape[i + 1], 4.8 - 0.4 * i, 4.4 - 0.4 * i, "bone", (2, 4, 5))
        sash = ropes["sash"]
        for i in range(len(sash) - 1):
            cel.limb(sash[i], sash[i + 1], 2.6, 2.0, "sea", (2, 4, 5))
        self.arm(cel, J, "F", far=True)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        cel.stamp_lean(TORSO, L, (px, py), 4, lean)
        hx, hy = J["head"]
        cel.stamp_turn(HEAD, L, (hx, hy + 1), 5, pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0))
        self.horn(cel, J, pose)
        self.arm(cel, J, "N", far=False)
        cel.outline()
        sound = pose.get("sound", 0.0)
        if sound > 0.03 and pose.get("horn_free", 0.0) < 0.5:
            # The call: two or three plain rings leaving the bell the way it opens, each with a dark edge so it
            # shows on the pale sky as well as on the rock.
            pts = horn_points(J["horn"], pose["horn"])
            (bx, by), bh, _bw = pts[-1]
            for k_ in range(3):
                r = 3.0 + 13.0 * sound - 5.0 * k_
                if r > 3.0:
                    half = 40.0 - 4.0 * k_
                    cel.arc(bx, by, r + 1.0, -72.0 - half, -72.0 + half, ("crimson", 1))
                    cel.arc(bx, by, r, -72.0 - half, -72.0 + half, ("light", 0) if k_ == 0 else ("bone", 6))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=1.2, lean=3.0, footN=(-4.0, 0.0, 0.0), footF=(4.4, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=20.0, elbN=40.0, armF=24.0, elbF=30.0, head_dx=0.0, head_dy=0.0, head_rot=0.0, breath=0.0,
                  std=-7.0, carry=0.5, horn=118.0, gripN=1.0, gripF=1.0, horn_free=0.0, horn_at=(0.0, 0.0), sound=0.0)


def idle_pose(ph: float) -> Pose:
    # He stands tall, the horn held ready at his chest, his weight going from one foot to the other; he looks down the path and
    # back. What lives in this loop is the standard over his head.
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    look = math.sin(math.tau * (ph - 0.35))
    return {**BASE, "breath": 0.3 + 0.3 * s, "drop": 1.2 + 0.4 * s, "lean": 3.0 + 1.5 * late, "dx": 0.5 * s, "footN": (-4.0 - 0.5 * s, 0.0, 0.0), "footF": (4.4 - 0.5 * s, 0.0, 0.0),
            "head_rot": 5.0 * look, "head_dx": 0.4 * look, "std": -7.0 - 2.5 * late, "horn": 118.0 + 3.0 * late, "carry": 0.5 + 0.03 * s, "armF": 24.0 + 4.0 * late}


def walk_pose(ph: float) -> Pose:
    c, s2 = math.cos(math.tau * ph), math.cos(2 * math.tau * (ph - 0.1))
    p: Pose = gait_legs(Gait(stride=0.9, give=1.2, lift=0.9, toe=0.9), ph)
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 8.0 + 1.5 * s2, "dy": p.get("dy", 0.0) + 0.6, "hip_rot": -0.6 * c, "sh_rot": 0.5 * c, "armF": 10.0 - 26.0 * c, "elbF": 30.0,
              "head_dy": 0.3 * s2, "std": -10.0 + 3.0 * math.cos(2 * math.tau * (ph - 0.25)), "horn": 120.0 + 6.0 * math.cos(2 * math.tau * (ph - 0.3))})
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Sounding the horn: he lifts it the last hand's breadth to his mouth, rears back as his chest fills, and
# blows — the body comes forward behind the note and the rings leave the bell.
CALL_KEYS = [
    (0.00, k(), "lin"),
    (0.16, k(carry=0.75, horn=110.0, lean=1.0, drop=1.0, head_rot=-4.0), "io"),
    (0.30, k(carry=1.0, horn=100.0, gripF=1.0, lean=-3.0, drop=0.8, head_rot=-8.0, breath=0.6, std=-9.0), "out"),
    (0.48, k(carry=1.0, horn=90.0, gripF=1.0, lean=-9.0, drop=0.4, head_rot=-14.0, breath=1.6, dx=-0.8, std=-12.0, footF=(5.0, 1.2, 0.0)), "io"),
    (0.54, k(carry=1.0, horn=106.0, gripF=1.0, lean=5.0, drop=1.8, head_rot=2.0, breath=0.2, dx=0.8, std=-2.0, footF=(5.2, 0.0, 0.0), sound=0.2), "lin"),
    (0.66, k(carry=1.0, horn=104.0, gripF=1.0, lean=4.0, drop=1.6, head_rot=0.0, breath=0.0, dx=0.6, std=-5.0, footF=(5.0, 0.0, 0.0), sound=0.6), "out"),
    (0.80, k(carry=1.0, horn=100.0, gripF=1.0, lean=1.0, drop=1.2, head_rot=-4.0, breath=0.2, std=-8.0, sound=1.0), "out"),
    (0.90, k(carry=0.75, horn=110.0, sound=0.0), "io"),
    (1.00, k(), "io"),
]

HURT_KEYS = stagger_keys(BASE, push=4.6, bend=14.0, buckle=2.2, whip=20.0, over={
    "impact": dict(std=4.0, horn=130.0, armF=60.0, elbF=20.0),
    "reel": dict(std=-24.0, horn=94.0, armF=90.0, elbF=-10.0, footF=(5.6, 2.0, 0.0)),
    "catch": dict(std=6.0, horn=126.0, armF=36.0, elbF=40.0),
})

# Death: the knees go and he folds forward over them, head to the ground. The standard, still strapped to him,
# goes down with him and lies out along the path ahead, its rags on the dirt; the horn slips its strap, rolls
# off behind him and rocks to rest on its curl.
_FOLD = dict(gripF=0.0, dx=1.0, drop=10.4, lean=76.0, head_rot=10.0, armN=70.0, elbN=10.0, armF=88.0, elbF=-12.0, footN=(-8.5, 0.5, -100.0), footF=(-5.5, 0.5, -100.0),
             std=8.0, gripN=0.0, horn_free=1.0, horn_at=(-23.0, 1.8), horn=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.08, k(dx=-2.4, drop=1.6, lean=-10.0, head_rot=-20.0, head_dx=-1.0, std=-20.0, horn=100.0, gripF=0.0, armF=100.0, elbF=10.0, footN=(-2.0, 0.0, 0.0), footF=(7.2, 1.2, 8.0)), "out3"),
    (0.24, k(dx=-2.0, drop=6.0, lean=12.0, head_rot=14.0, std=-4.0, horn=90.0, gripN=0.0, gripF=0.0, armN=-20.0, elbN=20.0, armF=50.0, elbF=10.0, horn_free=0.4, horn_at=(-6.0, 9.0),
             footN=(-6.0, 0.4, -90.0), footF=(-2.5, 0.4, -90.0)), "io"),
    (0.40, k(dx=-1.0, drop=8.0, lean=38.0, head_rot=20.0, std=4.0, horn=40.0, gripN=0.0, gripF=0.0, armN=40.0, elbN=10.0, armF=60.0, elbF=0.0, horn_free=1.0, horn_at=(-16.0, 6.0),
             footN=(-7.0, 0.5, -100.0), footF=(-4.0, 0.5, -100.0)), "io"),
    (0.52, k(**{**_FOLD, "drop": 9.6, "lean": 60.0, "dx": 0.0, "std": 12.0, "horn": 30.0, "horn_at": (-20.0, 2.8)}), "in"),
    (0.60, k(**{**_FOLD, "std": 14.0, "horn": -14.0, "horn_at": (-24.0, 2.4)}), "in"),
    (0.68, k(**{**_FOLD, "lean": 72.0, "std": 4.0, "horn": 8.0}), "out"),
    (0.78, k(**{**_FOLD, "horn": -4.0}), "in"),
    (1.00, k(**_FOLD), "lin"),
]


def WIND(t: float) -> tuple[float, float]:
    """The canyon wind from ahead, in gusts: the rags of the standard stream and snap behind him."""
    return (-0.62 + 0.3 * math.sin(math.tau * t), 0.34 * math.sin(math.tau * (t * 2 + 0.15)) - 0.02)


ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [140] * 12, True, WIND),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [80] * 12, True, lambda t: (-0.95, 0.3 * math.sin(math.tau * (t * 2 + 0.1)) - 0.04)),
    "attack": Anim("attack", keyed(CALL_KEYS), [0.0, 0.08, 0.16, 0.23, 0.30, 0.39, 0.48, 0.54, 0.60, 0.66, 0.73, 0.80, 0.90, 1.0],
                   [70, 70, 80, 90, 100, 110, 150, 45, 70, 80, 90, 100, 90, 100], False, WIND),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, WIND),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.04, 0.08, 0.16, 0.24, 0.32, 0.40, 0.46, 0.52, 0.56, 0.60, 0.64, 0.68, 0.78, 1.0],
                  [50, 40, 70, 70, 80, 70, 80, 60, 60, 50, 70, 60, 80, 120, 1200], False, lambda t: (-0.3, 0.0) if t < 0.45 else (0.5, 0.5)),
}
