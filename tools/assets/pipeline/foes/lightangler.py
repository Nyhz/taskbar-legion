"""Light Angler — world 7, support. One of the small folk of the deep caverns, who fish the dark for light. It goes
bent under a wide indigo cap — a mushroom's, pale-spotted, and lit from underneath: the gills under the brim glow
a cold sea-green, and in their light there is a face that is only shadow, two pale eyes and a wisp of beard. It
wears a mantle of three ragged capes one over the other, their fringes swinging, and keeps both hands on the creel
at its belly, where what it has caught still glows through the weave.

The rod is the thing to look for: a long jointed cane socketed in a harness on its back, that rises behind the
cap, bends in a great arc over its head and lets the lure hang out in front of its face — a glowing spore on a
thread, like the light of a fish of the abyss. It beats softly while the angler stands, swings when it walks,
and whatever fights in that light fights the better for it. It casts nothing: pressed, it only rears up, the
cane whips, and the lure gives one cold flash with two or three motes.

When it dies it folds forward under its cap; the cane goes down ahead of it, the lure lies dark on the stone,
the gills go out, and the light it had caught climbs out of the tipped creel and is gone.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, ik, keyed, lerp, stagger_keys

FIGURE = ("LightAngler", "foe", "w07")

BUILD = Build(root_x=40, thigh=6.2, shin=6.0, foot=3.8, hip_dx=1.5, spine=10.0, sh_near=3.0, sh_far=2.6, upper=5.2, fore=5.0, neck=1.0, head_dx=1.6, min_pelvis=3.8)

LIGHT = "sea"  # the one cold light it carries: lure, gills, eyes, creel
L = {
    # the cap: indigo, pale-spotted
    "c": ("azure", 2), "C": ("azure", 3), "W": ("azure", 4), "H": ("azure", 5), "x": ("azure", 7),
    "R": ("azure", 5),  # the front of the brim, which the lure tints
    # the gills under it
    "g": (LIGHT, 6), "G": (LIGHT, 8),
    # the face: shadow, two eyes, a wisp of beard
    "k": ("sea", 0), "K": ("sea", 1), "E": (LIGHT, 8), "b": ("bone", 4), "B": ("bone", 6),
    # the mantle, its fringes
    "m": ("sea", 1), "n": ("sea", 2), "o": ("sea", 3), "p": ("sea", 4), "P": ("sea", 5), "f": ("bone", 5),
    # the harness strap
    "s": ("leather", 4),
}

# A wide cap, the gills glowing under its brim; under that the dark of a face, two eyes, a beard.
HEAD = [
    ".......CCWWWH......",
    "....cCCxWWWWHHH....",
    "..cCCCCWWWxWWHHHH..",
    ".cCCxCCWWWWWWHxHHR.",
    "cCCCCCxWWWWxWWHHHHR",
    "cgGgGgGgGgGgGgGgGgR",
    ".cgGgGkkkkkkkKgGgR.",
    "......kkkkEkkEK....",
    "......kkkkEkkEK....",
    "......kkkkkkkKK....",
    ".......kkkbBBK.....",
    ".........bbBB......",
    "..........bB.......",
]
# Three capes one over the other, each wider than the one above, lighter along its hem and notched, with the
# shadow it throws on the next; the strap of the harness across them.
TORSO = [
    "....mnoP.....",
    "...msnooP....",
    "..mmmsnooP...",
    ".mmmnnsooPP..",
    ".nnomoopPPmP.",
    "..mmmmmsmnn..",
    "..mnnoospPP..",
    ".mnnoooppsPP.",
    "noompppPPmsPP",
    ".mmmmmmmnnsn.",
]
# What is left: the mantle in a heap, the cap come down over it, its gills gone dark.
HEAP = [
    "............CCWWWH.....",
    ".........cCCxWWWWHHH...",
    ".......cCCCCWWWxWWHHHH.",
    "......cCCxCCWWWWWWHxHHc",
    ".....cCCCCCxWWWWxWWHHHc",
    "...mncDdDdDdDdDdDdDdDdc",
    "..mnnooopkkkkkkbbB.....",
    ".mnoooppPPkkbbBB.......",
    "momomopmpmPPPp.........",
    "mmnnooooppppPPPp.......",
]
# The creel: woven cane, a lid, and light showing through the weave.
CREEL = [
    ".hhhh.",
    "hjGjhj",
    "jGhjGh",
    "hjGhjh",
    ".jhjh.",
]
CREEL_L = {"h": ("leather", 4), "j": ("leather", 6)}

ROD_N, ROD_SEG = 16, 2.8


def rod_points(base: Pt, angle: float, arc: float) -> list[Pt]:
    """The cane from its socket to its tip. It leaves the socket along `angle` (−90 = straight up) and bends
    forward by `arc` degrees in all, most of it in the upper half."""
    pts = [base]
    x, y = base
    for i in range(ROD_N):
        t = (i + 0.5) / ROD_N
        a = math.radians(angle + arc * t ** 1.7)
        x, y = x + math.cos(a) * ROD_SEG, y + math.sin(a) * ROD_SEG
        pts.append((x, y))
    return pts


def lure_at(tip: Pt, swing: float, line: float) -> Pt:
    """Where the lure hangs: `line` px of thread under the cane's tip, `swing` degrees off the plumb (forward +)."""
    s = math.radians(swing)
    return (tip[0] + math.sin(s) * line, tip[1] + math.cos(s) * line)


def draw_lure(cel: Cel, at: Pt, lit: bool, bright: bool) -> None:
    """The spore: a round of cold light with a white heart, or a dull bead when it has gone out."""
    for dy in range(-2, 3):
        for dx in range(-2, 3):
            if abs(dx) == 2 and abs(dy) == 2:
                continue
            r = abs(dx) + abs(dy)
            if lit:
                tone = ("light", 0) if r <= (1 if bright else 0) else (LIGHT, 8) if r <= 2 and abs(dx) < 2 and abs(dy) < 2 else (LIGHT, 7) if dy < 2 else (LIGHT, 6)
            else:
                tone = ("ink", 6) if (dx, dy) == (-1, -1) else (LIGHT, 3) if r <= 1 else ("ink", 3)
            cel.put(at[0] + dx, at[1] + dy, tone)


class LightAngler(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        # the near hand rests on the creel the far hand carries, unless it has something better to do
        w = pose.get("rest", 1.0)
        if w > 0.01:
            on = (J["handF"][0] + 1.2, J["handF"][1] - 1.0)
            hx, hy = J["handN"]
            J["elbowN"], J["handN"] = ik(J["shN"], (lerp(hx, on[0], w), lerp(hy, on[1], w)), self.build.upper, self.build.fore, +1)
        # the socket of the cane, on its back between the shoulders
        lean = math.radians(pose.get("lean", 0.0))
        cx, cy = J["chest"]
        J["socket"] = (cx - 4.6 * math.cos(lean) + 0.5 * math.sin(lean), cy - 4.6 * math.sin(lean) + 0.5)
        px, py = J["pelvis"]
        J["cape"] = (px - 5.6, py - 3.0)  # the back corner of the middle cape
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def grounded(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        return {
            # two ragged tails of the under-cape down its back, a tab of it in front
            "tailA": ChainSpec(Chain(5, 2.6, gravity=0.24, drag=0.24, damp=0.1), lambda J: J["cape"], grounded, (-0.86, 0.5)),
            "tailB": ChainSpec(Chain(4, 2.5, gravity=0.3, drag=0.18, damp=0.08), lambda J: (J["cape"][0] + 1.6, J["cape"][1] + 2.4), grounded, (-0.7, 0.72)),
            "tab": ChainSpec(Chain(3, 2.2, gravity=0.3, drag=0.14, damp=0.08), lambda J: (J["pelvis"][0] + 3.6, J["pelvis"][1] - 0.5), grounded, (0.2, 1.0)),
            "creel": ChainSpec(Chain(2, 1.7, gravity=0.4, drag=0.06, damp=0.1), lambda J: J["handF"], grounded),
        }

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        cel.limb(J["hip" + s], J["knee" + s], 4.0, 3.4, "sea", (1, 2, 3), far=far)
        # cross-gartered shins, soft boots
        cel.limb(J["knee" + s], J["ankle" + s], 3.2, 2.8, "bone", (2, 4, 5), far=far)
        cel.limb(J["ankle" + s], J["toe" + s], 3.4, 2.6, "leather", (2, 4, 5), far=far)

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 4.0, 3.6, "sea", (2, 4, 5), far=far)
        cel.limb(el, hd, 3.6, 3.2, "sea", (2, 4, 5), far=far)
        # a small pale hand out of the sleeve
        ux, uy = hd[0] - el[0], hd[1] - el[1]
        ln = math.hypot(ux, uy) or 1.0
        cel.limb(hd, (hd[0] + ux / ln * 1.6, hd[1] + uy / ln * 1.6), 2.6, 2.2, "bone", (4, 6, 7), far=far)

    def draw(self, cel, J, pose, ropes, between) -> None:
        rx = self.build.root_x + pose.get("dx", 0.0)
        glow = pose.get("glow", 1.0) >= 0.5
        pulse = pose.get("pulse", 0.5)
        flare = pose.get("flare", 0.0)
        gone = pose.get("gone", 0.0) > 0.5
        lean = pose.get("lean", 0.0)
        if gone:
            base, angle = (rx - 4.0, GROUND - 5.0), pose["rod"]
        else:
            base, angle = J["socket"], pose["rod"] + lean
        rod = rod_points(base, angle, pose["arc"])
        tip = rod[-1]
        at = lure_at(tip, pose["swing"], pose["line"])
        at = (at[0], min(at[1], GROUND - 3.0))
        lit = {**L} if glow else {**L, "g": (LIGHT, 2), "G": (LIGHT, 3), "E": ("ink", 3), "R": ("azure", 4)}
        if glow:
            lit["R"] = (LIGHT, 6) if pulse + flare > 0.55 else ("azure", 6)
            lit["K"] = ("sea", 3) if pulse + flare > 0.8 else ("sea", 2) if pulse + flare > 0.3 else ("sea", 1)
            lit["B"] = (LIGHT, 8) if pulse + flare > 0.8 else ("bone", 7) if pulse + flare > 0.3 else ("bone", 6)
            if pose.get("eye", 1.0) < 0.5:
                lit["E"] = ("ink", 3)
        creel_l = {**CREEL_L, "G": (LIGHT, 8 if pulse > 0.5 else 7) if glow else ("leather", 2)}

        def cane() -> None:
            tmp = Cel(cel.w, cel.h, cel.top)
            n = len(rod) - 1
            for i in range(n):
                w0 = 2.6 - 1.5 * i / n
                tmp.limb(rod[i], rod[i + 1], w0, w0 - 0.09, "bone", (3, 5, 7))
            for i in range(3, n - 1, 3):  # the joints of the cane
                tmp.put(rod[i][0], rod[i][1], ("leather", 2))
                tmp.put(rod[i][0] + (1 if i < 7 else 0), rod[i][1] + (0 if i < 7 else 1), ("leather", 3))
            for (x, y), t in tmp.px.items():
                if y < GROUND:
                    cel.px[(x, y)] = t

        def lure() -> None:
            tmp = Cel(cel.w, cel.h, cel.top)
            tmp.line(tip, (at[0], at[1] - 2), ("ink", 7))
            draw_lure(tmp, at, glow, pulse + flare > 0.6)
            for (x, y), t in tmp.px.items():
                if y < GROUND:
                    cel.px[(x, y)] = t

        if gone:
            cane()
            cel.stamp(HEAP, {**L, "D": (LIGHT, 3), "d": (LIGHT, 2)}, rx - 14.0, GROUND - len(HEAP))
            # the creel tipped over in front of it
            cel.stamp_rot(CREEL, creel_l, rx + 11.0, GROUND - 0.5, 3.0, float(len(CREEL)), 78.0)
            lure()
            cel.outline()
        else:
            self.arm(cel, J, "F", True)
            for name, w0, idx in (("tailA", 4.4, (2, 3, 4)), ("tailB", 3.8, (1, 2, 3))):
                pts = ropes[name]
                for i in range(len(pts) - 1):
                    cel.limb(pts[i], pts[i + 1], w0 - i * 0.45, w0 - 0.45 - i * 0.45, "sea", idx)
                cel.put(pts[-1][0], pts[-1][1] + 1, ("bone", 5))  # a fringe thread at the end
                cel.put(pts[-1][0] - 1, pts[-1][1] + 1, ("bone", 4))
            self.leg(cel, J, "F", True)
            self.leg(cel, J, "N", False)
            px, py = J["pelvis"]
            kx, ky = (J["kneeN"][0] + J["kneeF"][0]) / 2, (J["kneeN"][1] + J["kneeF"][1]) / 2
            # the lowest cape, to the knees: lighter at the hem, ragged along it, a few pale threads hanging
            hem = (px + (kx - px) * 0.72, py + (ky - py) * 0.72 + 0.6)
            cel.limb((px - 0.4, py - 1.0), hem, 11.0, 13.0, "sea", (2, 3, 5))
            cel.limb((hem[0] - 6.0, hem[1]), (hem[0] + 6.0, hem[1]), 1.6, 1.6, "sea", (3, 4, 5))
            for i, ox in enumerate(range(-6, 7)):
                if i % 3 != 2:  # a notched edge
                    cel.put(hem[0] + ox, hem[1] + 1.2, ("sea", 3 if ox < -1 else 4 if ox < 3 else 5))
                if i % 4 == 1:  # a few pale threads
                    cel.put(hem[0] + ox, hem[1] + 2.2, ("bone", 5))
            tab = ropes["tab"]
            for i in range(len(tab) - 1):
                cel.limb(tab[i], tab[i + 1], 3.0 - i * 0.5, 2.6 - i * 0.5, "sea", (3, 4, 5))
            cel.put(tab[-1][0], tab[-1][1] + 1, ("bone", 6))
            cane()  # up its back, behind the mantle and the cap
            cel.limb((base[0] - 0.6, base[1] + 1.4), (base[0] + 0.6, base[1] - 1.4), 3.4, 3.4, "leather", (2, 4, 5))  # the socket
            cel.stamp_lean(TORSO, lit, (px, py + 0.5), 6, lean)
            hx, hy = J["head"]
            turn = pose.get("head_rot", 0.0) + (lean if abs(lean) > 30 else 0.0)
            cel.stamp_turn(HEAD, lit, (hx + 0.8, hy + 3.6), 9, turn)
            # the creel, hung from the far hand at its belly
            cr = ropes["creel"][-1]
            cel.stamp(CREEL, creel_l, cr[0] - 3.0, cr[1] - 1.0)
            self.arm(cel, J, "N", False)
            lure()
            cel.outline()

        # Fx, only where nothing is drawn: the glow the lure stands in, its flash, the caught light getting away.
        if glow:
            rr = 4.6 + 1.6 * pulse + 3.0 * flare
            for i in range(12):
                a = math.tau * i / 12 + (0.26 if pulse > 0.5 else 0.0)
                x, y = at[0] + math.cos(a) * rr, at[1] + math.sin(a) * rr
                if 1 < y < GROUND - 1 and (i % 2 == 0 or pulse + flare > 0.5):
                    cel.soft(x, y, (LIGHT, 7) if i % 3 == 0 else (LIGHT, 5))
            for d in ((-3, 0), (3, 0), (0, -3), (0, 3)):
                cel.soft(at[0] + d[0], at[1] + d[1], (LIGHT, 8) if pulse + flare > 0.45 else (LIGHT, 6))
            if flare > 0.05:
                # four rays, and three motes let go
                for d in ((-1, -1), (1, -1), (-1, 1), (1, 1)):
                    for q in range(3, 4 + int(round(flare * 3))):
                        if 1 < at[1] + d[1] * q < GROUND - 1:
                            cel.soft(at[0] + d[0] * q, at[1] + d[1] * q, ("light", 0) if q < 5 and flare > 0.5 else (LIGHT, 7))
                for i, (mx, my) in enumerate(((7.0, -4.0), (-6.0, -6.0), (3.0, -9.0))):
                    x, y = at[0] + mx * (0.5 + 0.7 * flare), at[1] + my * (0.5 + 0.7 * flare)
                    if 2 < y < GROUND - 2:
                        cel.soft(x, y, ("light", 0) if flare > 0.4 else (LIGHT, 8))
                        cel.soft(x + 1, y, (LIGHT, 6))
                        cel.soft(x, y + 1, (LIGHT, 6))
        spill = pose.get("spill", 0.0)
        if 0.02 < spill < 0.98:
            for i, (ox, sp) in enumerate(((0.0, 1.0), (3.0, 0.75), (-2.0, 0.55))):
                q = spill * sp
                x, y = rx + 13.0 + ox + math.sin(q * 7.0 + i) * 2.0, GROUND - 6.0 - 20.0 * q
                if 2 < y < GROUND - 2:
                    cel.soft(x, y, (LIGHT, 8) if spill < 0.5 else (LIGHT, 6) if spill < 0.8 else (LIGHT, 4))
                    if spill < 0.6:
                        cel.soft(x, y + 1, (LIGHT, 5))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=1.0, lean=16.0, footN=(-3.2, 0.0, 0.0), footF=(3.4, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=30.0, elbN=60.0, armF=26.0, elbF=64.0, rest=1.0, head_dx=0.0, head_dy=0.0, head_rot=0.0, breath=0.0,
                  rod=-120.0, arc=178.0, swing=0.0, line=8.0, glow=1.0, pulse=0.5, eye=1.0, flare=0.0, spill=0.0, gone=0.0, flash=0.0)


def idle_pose(ph: float) -> Pose:
    s, c = math.sin(math.tau * ph), math.cos(math.tau * ph)
    beat = 0.5 + 0.5 * math.sin(math.tau * (2 * ph - 0.25))  # the lure beats twice a loop
    # It stands bent over its creel and breathes; the cane nods with the breath and the lure drifts a little on
    # its thread; once a loop it lifts its face to it.
    look = max(0.0, math.sin(math.tau * (ph - 0.6))) ** 3
    return {**BASE, "breath": 0.5 + 0.5 * s, "lean": 16.0 + 1.4 * s - 3.0 * look, "drop": 1.0 + 0.4 * (0.5 - 0.5 * c), "dx": 0.3 * s,
            "armF": 26.0 + 2.0 * s, "arc": 165.0 + 3.0 * s, "swing": 9.0 * math.sin(math.tau * (ph - 0.15)), "line": 8.0,
            "head_rot": 2.0 * s, "head_dy": -1.0 * look, "head_dx": -0.6 * look, "pulse": beat, "eye": 0.0 if 0.30 < ph < 0.36 else 1.0}


def walk_pose(ph: float) -> Pose:
    c, s = math.cos(math.tau * ph), math.sin(math.tau * ph)
    s2 = math.cos(2 * math.tau * (ph - 0.1))
    p: Pose = gait_legs(Gait(stride=0.6, give=1.1, lift=0.6, toe=0.5), ph)
    # A bent, quick shuffle; the cane bobs with every step and the lure swings out and back before its face.
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 22.0 + 1.5 * s2, "dy": 0.6 + 0.5 * s2, "hip_rot": -0.5 * c, "sh_rot": 0.4 * c, "armF": 28.0 + 3.0 * s2,
              "arc": 163.0 + 7.0 * math.cos(2 * math.tau * (ph - 0.2)), "swing": 24.0 * math.sin(2 * math.tau * (ph - 0.3)),
              "head_dy": 0.5 * math.cos(2 * math.tau * (ph - 0.2)), "head_rot": 3.0, "pulse": 0.62 + 0.2 * s2})
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# It ducks, the lure dimming — then rears up and lifts the creel to it in both hands; the cane whips and the lure
# gives one cold flash, three motes of it let go. It settles back over its creel.
ATTACK_KEYS = [
    (0.00, k(), "lin"),
    (0.16, k(drop=2.0, lean=22.0, head_dy=0.6, arc=171.0, swing=-8.0, pulse=0.3), "out"),
    (0.44, k(dx=-0.6, drop=2.8, lean=27.0, head_dy=1.0, arc=175.0, swing=-14.0, pulse=0.12, armF=18.0, elbF=70.0,
             footN=(-3.0, 0.0, 0.0), footF=(3.8, 0.4, 4.0)), "io"),
    (0.52, k(dx=0.6, drop=0.2, lean=3.0, head_dy=-1.2, head_dx=-0.8, arc=139.0, swing=18.0, pulse=1.0, flare=0.35, armF=58.0, elbF=44.0,
             footN=(-3.6, 0.0, -6.0), footF=(3.6, 0.0, 0.0)), "in"),
    (0.60, k(dx=0.8, drop=0.0, lean=-1.0, head_dy=-1.6, head_dx=-1.0, arc=131.0, swing=6.0, pulse=1.0, flare=1.0, armF=64.0, elbF=40.0,
             footN=(-3.8, 0.0, -8.0), footF=(3.4, 0.0, 0.0)), "lin"),
    (0.72, k(dx=0.6, drop=0.2, lean=2.0, head_dy=-1.2, head_dx=-0.8, arc=139.0, swing=-8.0, pulse=1.0, flare=0.6, armF=60.0, elbF=42.0,
             footN=(-3.6, 0.0, -6.0), footF=(3.6, 0.0, 0.0)), "out"),
    (0.88, k(dx=0.2, drop=0.8, lean=11.0, head_dy=-0.4, arc=159.0, swing=8.0, pulse=0.7, flare=0.1, armF=38.0, elbF=56.0,
             footN=(-3.4, 0.0, -2.0), footF=(3.4, 0.4, 2.0)), "io"),
    (1.00, k(), "io"),
]

HURT_KEYS = stagger_keys(BASE, push=3.6, bend=12.0, buckle=2.2, whip=20.0, over={
    "impact": dict(arc=159.0, swing=-28.0, pulse=0.9, eye=1.0),
    "reel": dict(arc=151.0, swing=-46.0, pulse=0.15, eye=0.0, rest=0.3, armN=50.0, elbN=40.0),
    "catch": dict(arc=173.0, swing=34.0, pulse=0.5, eye=1.0),
})

# Death: jolted upright, the lure flaring once; its knees go and it folds forward under the cap. The cane comes
# down ahead of it, the lure lies dark, and the light in the creel gets away.
_SAG = dict(rest=0.0, armN=16.0, elbN=24.0, armF=14.0, elbF=26.0, eye=0.0)
_DOWN = dict(**_SAG, dx=-0.6, drop=7.0, lean=62.0, head_rot=24.0, gone=1.0, glow=0.0, rod=-9.0, arc=44.0, swing=0.0, line=1.5, pulse=0.0,
             footN=(-3.0, 0.0, 0.0), footF=(3.8, 0.0, 0.0))
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-1.6, drop=0.4, lean=2.0, head_rot=-16.0, arc=153.0, swing=-36.0, pulse=1.0, flare=0.4, rest=0.2, armN=60.0, elbN=40.0,
             footN=(-2.6, 0.0, 0.0), footF=(4.4, 0.8, 6.0)), "out3"),
    (0.24, k(**_SAG, dx=-1.8, drop=3.0, lean=12.0, head_rot=0.0, arc=163.0, swing=14.0, pulse=0.5, footN=(-2.4, 0.0, 0.0), footF=(4.6, 0.0, 0.0)), "io"),
    (0.40, k(**_SAG, dx=-1.2, drop=5.2, lean=38.0, head_rot=14.0, arc=163.0, swing=26.0, pulse=0.25, footN=(-2.8, 0.0, 0.0), footF=(4.2, 0.0, 0.0)), "in"),
    (0.48, k(**_SAG, dx=-0.8, drop=6.6, lean=58.0, head_rot=22.0, arc=159.0, swing=10.0, pulse=0.1, footN=(-3.0, 0.0, 0.0), footF=(3.8, 0.0, 0.0)), "lin"),
    (0.58, k(**_DOWN, spill=0.12), "lin"),
    (0.76, k(**_DOWN, spill=0.5), "lin"),
    (0.86, k(**_DOWN, spill=0.72), "lin"),
    (1.00, k(**_DOWN, spill=1.0), "lin"),
]

STILL = lambda t: (-0.25 + 0.2 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [140] * 12, True, STILL),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [75] * 12, True, lambda t: (-0.7, 0.0)),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.08, 0.16, 0.26, 0.35, 0.44, 0.52, 0.60, 0.72, 0.88, 1.0],
                   [80, 70, 80, 90, 110, 150, 40, 60, 110, 110, 100], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.17, 0.24, 0.32, 0.40, 0.48, 0.58, 0.67, 0.76, 0.86, 1.0],
                  [50, 50, 80, 90, 110, 110, 90, 50, 90, 120, 150, 120, 1000], False, STILL),
}
