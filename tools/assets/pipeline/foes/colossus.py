"""Sandstone Colossus — world 4, stage boss. A giant the canyon cut out of its own dark bedrock: every part of it is
a chiselled block with hard planes — a lit face, a flat face, a face in shadow — banded with red strata and split
by cracks. It is hunched: a slab of a shoulder juts up behind its head, the head itself is a carved mask set low and
forward between the shoulders, with two cold eyes under a brow and a heavy jaw; the forearms flare into fists like
boulders, the legs are short pillars. A glyph burns cold in its chest and in each fist, and chips of stone hang in
the air around it, circling. It walks in slow stamps. To attack it hauls both fists over its head while the chips
whirl up, and drives them into the ground with its whole body: the earth splits along a cold glowing crack and
three teeth of rock stab up out of it. It dies like a statue: its cracks blaze, go dark, and it breaks in two at
the waist — the upper half topples forward and smashes face down, the legs are left standing.

Its frame is the boss frame (128 wide, 26 extra rows above). Drawn facing right; the game mirrors enemies."""
from __future__ import annotations

import math
from typing import Callable, Optional, Sequence

from ..rig import GROUND, HURT_MS, HURT_TIMES, LIGHT, Anim, Build, Cel, Character, Gait, Pose, Pt, gait_legs, ik, keyed, lerp, stagger_keys

FIGURE = ("Colossus", "boss", "w04")

BUILD = Build(root_x=52, thigh=8.5, shin=8.5, foot=6.5, hip_dx=4.2, spine=25.0, sh_near=11.0, sh_far=9.5, upper=13.0, fore=15.0, neck=-3.0, head_dx=8.0,
              heel=2.6, toe=2.0, min_pelvis=8.5)
#: Height of the belly block: the body can break in two here.
WAIST = 8.0

#: Bedrock, darkest to lit edge; a block's planes pick from it by how they face the light.
ROCK = [("leather", i) for i in range(7)]

L = {
    "a": ("leather", 1), "b": ("leather", 2), "c": ("leather", 3), "d": ("leather", 4), "e": ("leather", 5), "f": ("leather", 6),
    "k": ("ink", 0), "R": ("crimson", 3), "r": ("crimson", 2),
}
# The face: a carved mask. A brow slab overhanging two eyes (G, g), a nose ridge with a crack, a red bed across the
# cheeks, a jaw with teeth cut into it.
HEAD = [
    "....ccddeeef.",
    "..bbcddeeeeff",
    ".abbcdddeeeef",
    ".abbccddddeee",
    ".abkkkkkkkkkk",
    ".abkGGkkkGGgk",
    ".abbkkckkkkke",
    ".abbccddkddee",
    ".aabccdddddee",
    "..abRRRRRRRre",
    "..abbkdkdkdke",
    "..aabccddddee",
    "...aabbccdde.",
    "....aabbcc...",
]
GLYPH = [
    "..G..",
    ".GgG.",
    "G.g.G",
    "..g..",
    "G.g.G",
    ".GgG.",
    "..G..",
]
SMALL_GLYPH = [
    ".G.",
    "GgG",
    ".G.",
]
for _rows in (HEAD, GLYPH, SMALL_GLYPH):
    assert len({len(r) for r in _rows}) == 1

#: The teeth of the quake: (x from the root, height, lean, when it starts to rise in the quake's 0–1).
TEETH = [(35.0, 13.0, 2.0, 0.0), (40.5, 17.0, -2.5, 0.13), (46.0, 21.0, 3.0, 0.26)]


def glyph(glow: float) -> dict[str, tuple[str, int]]:
    if glow >= 0.9:
        return {"G": ("light", 0), "g": ("sea", 8)}
    if glow >= 0.5:
        return {"G": ("sea", 7), "g": ("sea", 5)}
    if glow >= 0.2:
        return {"G": ("sea", 4), "g": ("sea", 3)}
    return {"G": ("ink", 1), "g": ("ink", 2)}


def framed(origin: Pt, deg: float) -> Callable[[float, float], Pt]:
    """Local (x forward, y down) → frame, for a part that sits at `origin` turned `deg`."""
    a = math.radians(deg)
    ca, sa = math.cos(a), math.sin(a)
    return lambda x, y: (origin[0] + x * ca - y * sa, origin[1] + x * sa + y * ca)


def quad(a: Pt, b: Pt, w0: float, w1: float) -> list[Pt]:
    dx, dy = b[0] - a[0], b[1] - a[1]
    n = math.hypot(dx, dy) or 1.0
    nx, ny = -dy / n, dx / n
    return [(a[0] + nx * w0 / 2, a[1] + ny * w0 / 2), (b[0] + nx * w1 / 2, b[1] + ny * w1 / 2), (b[0] - nx * w1 / 2, b[1] - ny * w1 / 2), (a[0] - nx * w0 / 2, a[1] - ny * w0 / 2)]


def rock(cel: Cel, pts: Sequence[Pt], base: int = 2, far: bool = False, inset: float = 0.46, band: Optional[tuple[Pt, Pt]] = None,
         cracks: Sequence[Sequence[Pt]] = (), crack: tuple[str, int] = ("ink", 0)) -> None:
    """A chiselled block: a flat face with a bevel all round it, each bevel plane one flat tone chosen by how it
    faces the light. `band` is a red bed of rock across it, `cracks` are polylines; both are cut to the block."""
    n = len(pts)
    cx, cy = sum(p[0] for p in pts) / n, sum(p[1] for p in pts) / n
    hx, hy = cx + LIGHT[0] * 1.1, cy + LIGHT[1] * 1.1  # the face sits towards the light: wide shadow planes
    inner = [(hx + (x - hx) * inset, hy + (y - hy) * inset) for x, y in pts]
    shift = -1 if far else 0
    mask = set(cel.poly_mask(list(pts)))

    def tone(i: int) -> tuple[str, int]:
        return ROCK[max(0, min(len(ROCK) - 1, i + shift))]

    for (x, y) in mask:
        cel.put(x, y, tone(base))
    for i in range(n):
        a, b = pts[i], pts[(i + 1) % n]
        ex, ey = b[0] - a[0], b[1] - a[1]
        ln = math.hypot(ex, ey) or 1.0
        nx, ny = ey / ln, -ex / ln
        if nx * ((a[0] + b[0]) / 2 - cx) + ny * ((a[1] + b[1]) / 2 - cy) < 0:
            nx, ny = -nx, -ny
        t = tone(base + int(round((nx * LIGHT[0] + ny * LIGHT[1]) * 2.7)))
        for xy in cel.poly_mask([a, b, inner[(i + 1) % n], inner[i]]):
            if xy in mask:
                cel.put(xy[0], xy[1], t)
    # The cut edge: a bright arris where the block turns to the light, a dark seam everywhere else, so every stone
    # stays its own stone against the one behind it.
    for (x, y) in mask:
        if all(q in mask for q in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1))):
            continue
        ox, oy = x + 0.5 - cx, y + 0.5 - cy
        ln = math.hypot(ox, oy) or 1.0
        cel.put(x, y, tone(base + 3) if (ox * LIGHT[0] + oy * LIGHT[1]) / ln > 0.3 else ROCK[0])
    if band:
        (x0, y0), (x1, y1) = band
        steps = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
        for s in range(steps + 1):
            x, y = x0 + (x1 - x0) * s / steps, y0 + (y1 - y0) * s / steps
            for dy, tn in ((0, ("crimson", 3 + shift)), (1, ("crimson", 2 + shift))):
                if (int(math.floor(x)), int(math.floor(y + dy))) in mask:
                    cel.put(x, y + dy, tn)
    for line in cracks:
        for (x0, y0), (x1, y1) in zip(line, line[1:]):
            steps = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
            for s in range(steps + 1):
                x, y = x0 + (x1 - x0) * s / steps, y0 + (y1 - y0) * s / steps
                if (int(math.floor(x)), int(math.floor(y))) in mask:
                    cel.put(x, y, crack)


class Colossus(Character):
    build = BUILD
    W = 128
    TOP = 26

    def joints(self, pose: Pose) -> dict[str, Pt]:
        b = self.build
        J = super().joints(pose)
        # Everything above the waist hangs on its own frame, so the body can break in two: `split` slides that
        # frame from the waist to `break_at` (x from the root, height) and turns it to `break_rot`.
        lean = pose.get("lean", 0.0)
        px, py = J["pelvis"]
        la = math.radians(lean)
        waist = (px + WAIST * math.sin(la), py - WAIST * math.cos(la))
        split = pose.get("split", 0.0)
        bx, by = pose.get("break_at", (0.0, 0.0))
        origin = (lerp(waist[0], b.root_x + bx, split), lerp(waist[1], GROUND - by, split))
        rot = lerp(lean, pose.get("break_rot", lean), split)
        up = b.spine + pose.get("breath", 0.0) - WAIST
        f = framed(origin, rot)
        sr = pose.get("sh_rot", 0.0)
        J["waist"], J["upper"], J["urot"] = waist, origin, (rot, up)
        J["chest"] = f(0.0, -up)
        J["shN"], J["shF"] = f(-b.sh_near - sr, -up), f(b.sh_far + sr, -up + 0.4)
        J["head"] = f(b.head_dx + pose.get("head_dx", 0.0), -up - b.neck + pose.get("head_dy", 0.0))
        for s in "NF":
            a, e = math.radians(pose.get("arm" + s, 0.0)), math.radians(pose.get("elb" + s, 0.0))
            sx, sy = J["sh" + s]
            ex, ey = sx + b.upper * math.sin(a), sy + b.upper * math.cos(a)
            J["elbow" + s] = (ex, ey)
            J["hand" + s] = (ex + b.fore * math.sin(a + e), ey + b.fore * math.cos(a + e))
            w = pose.get("reach" + s + "_w", 0.0)
            if w > 0.001:
                tx, ty = pose["reach" + s]
                hx, hy = J["hand" + s]
                J["elbow" + s], J["hand" + s] = ik(J["sh" + s], (lerp(hx, b.root_x + tx, w), lerp(hy, GROUND - ty, w)), b.upper, b.fore, +1)
        return J

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        hip, knee, ankle, toe = J["hip" + s], J["knee" + s], J["ankle" + s], J["toe" + s]
        thigh = quad((hip[0], hip[1] - 2.0), knee, 10.5, 9.0)
        rock(cel, thigh, far=far, cracks=[[hip, ((hip[0] + knee[0]) / 2 + 1.5, (hip[1] + knee[1]) / 2)]])
        mid = ((knee[0] + ankle[0]) / 2, (knee[1] + ankle[1]) / 2)
        shin = quad((knee[0], knee[1] - 1.0), (ankle[0], ankle[1] + 1.4), 9.0, 11.5)
        rock(cel, shin, far=far, band=((mid[0] - 6.0, mid[1]), (mid[0] + 6.0, mid[1] - 1.0)))
        rock(cel, quad((ankle[0] - 4.0, ankle[1] + 0.2), (toe[0] + 1.5, toe[1] + 0.4), 6.2, 5.0), far=far, inset=0.3)

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool, Lg: dict, crack: tuple[str, int]) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        rock(cel, quad(sh, el, 9.0, 7.4), far=far)
        fx, fy = hd[0] - el[0], hd[1] - el[1]
        n = math.hypot(fx, fy) or 1.0
        ux, uy = fx / n, fy / n
        # The forearm flares towards the fist like a club, with a red bed across it.
        club = quad((el[0] - ux * 1.5, el[1] - uy * 1.5), (hd[0] - ux * 4.0, hd[1] - uy * 4.0), 7.0, 11.0)
        mid = (el[0] + fx * 0.5, el[1] + fy * 0.5)
        rock(cel, club, far=far, band=((mid[0] - uy * 6.0, mid[1] + ux * 6.0), (mid[0] + uy * 6.0, mid[1] - ux * 6.0)))
        # The fist: a boulder with knuckles cut into it and a glyph on its face.
        g = framed(hd, math.degrees(math.atan2(fy, fx)) - 90.0)
        fist = [g(x, y) for x, y in ((-7.5, -5.0), (0.5, -8.0), (8.0, -4.5), (8.0, 4.0), (2.5, 8.0), (-6.5, 6.0))]
        rock(cel, fist, base=3, far=far, inset=0.5, cracks=[[g(-2.0, 7.0), g(-1.0, 3.5)], [g(2.5, 7.0), g(2.0, 4.0)]], crack=crack)
        if not far:
            cel.stamp_pivot(SMALL_GLYPH, Lg, g(0.5, -1.0), 1.5, 1.5, 0.0)

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        glow = pose.get("glow", 0.7)
        crackle = pose.get("crackle", 0.0)
        split = pose.get("split", 0.0)
        Lg = glyph(glow)
        # The cracks themselves light up when it is about to break.
        crack = ("light", 0) if crackle >= 0.9 else ("sea", 7) if crackle >= 0.5 else ("sea", 4) if crackle >= 0.2 else ("ink", 0)
        rot, up = J["urot"]
        f = framed(J["upper"], rot)
        lo = framed(J["pelvis"], lean)
        orbit, spin = pose.get("orbit", 0.0), pose.get("spin", 0.0)
        self.orbit(cel, J["chest"], orbit, spin, front=False)

        self.arm(cel, J, "F", True, Lg, crack)
        sf = framed(J["shF"], rot)
        rock(cel, [sf(x, y) for x, y in ((-6.0, -4.0), (-1.0, -8.0), (6.0, -5.5), (8.0, 1.5), (3.0, 6.0), (-5.0, 4.5))], far=True)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        # Hips and belly: what is left standing if it breaks.
        rock(cel, [lo(x, y) for x, y in ((-9.5, 0.5), (-7.0, -5.5), (7.5, -5.5), (10.0, 0.5), (6.5, 4.5), (-6.5, 4.5))],
             base=1, band=(lo(-9.0, -1.5), lo(9.5, -2.5)), cracks=[[lo(1.0, -5.0), lo(2.5, -1.0), (lo(1.5, 3.5))]], crack=crack)
        rock(cel, [lo(x, y) for x, y in ((-7.0, -4.5), (-8.0, -WAIST - 1.0), (8.0, -WAIST - 1.0), (7.0, -4.5))], base=1, inset=0.4)
        if split > 0.5:  # the broken edge
            for x, h in ((-5.0, 4.0), (-0.5, 2.5), (4.5, 5.0)):
                rock(cel, [lo(x - 2.5, -WAIST), lo(x + 0.5, -WAIST - h), lo(x + 2.5, -WAIST)], inset=0.2)
        # The chest: one great uneven block, heavier at the back, with the glyph cut in its face.
        chest = [f(x, y) for x, y in ((-9.0, 1.0), (-14.5, -7.0), (-16.0, -up + 1.0), (-10.0, -up - 4.5), (8.0, -up - 3.5), (14.5, -up + 3.0), (13.0, -5.0), (8.0, 1.0))]
        rock(cel, chest, band=(f(-15.5, -up + 6.0), f(14.5, -up + 8.5)), inset=0.52,
             cracks=[[f(-10.0, -up - 3.0), f(-7.0, -up + 4.0), f(-9.5, -up + 9.0)], [f(9.0, 0.0), f(7.0, -4.5), f(9.5, -8.0)], [f(-3.0, 1.0), f(-4.5, -3.0)]], crack=crack)
        cel.stamp_pivot(GLYPH, Lg, f(1.5, -up + 12.5 - 3.5), 2.5, 3.5, rot)
        # Shards standing on its back.
        for x, h, w in ((-13.0, 7.0, 3.0), (-8.5, 5.0, 2.5)):
            rock(cel, [f(x - w, -up - 2.0), f(x - 1.0, -up - 3.0 - h), f(x + w, -up - 3.5)], inset=0.2)
        # The head, low and forward between the shoulders.
        hx, hy = J["head"]
        cel.stamp_pivot(HEAD, {**L, **Lg}, (hx, hy), 6.5, 7.0, rot - 8.0 + pose.get("head_rot", 0.0))
        self.arm(cel, J, "N", False, Lg, crack)
        # The near shoulder: a slab jutting up behind the head.
        sn = framed(J["shN"], rot)
        slab = [sn(x, y) for x, y in ((-9.5, -3.0), (-5.5, -13.0), (2.5, -11.5), (8.5, -3.5), (7.5, 5.0), (-1.5, 8.5), (-8.5, 4.5))]
        rock(cel, slab, base=3, band=(sn(-9.0, 0.5), sn(8.5, -0.5)), cracks=[[sn(-4.0, -12.0), sn(-2.0, -6.0), sn(-4.5, -1.5)]], crack=crack, inset=0.5)
        quake = pose.get("quake", 0.0)
        if 0.01 < quake < 0.985:
            self.teeth(cel, quake)
        cel.outline()

        self.orbit(cel, J["chest"], orbit, spin, front=True)
        if 0.01 < quake < 0.985:
            # A cold crack runs along the ground from the fists to the last tooth; clods fly where a tooth breaks out.
            x0 = BUILD.root_x + 12.0
            reach = min(1.0, quake / 0.34)
            fade = 1.0 if quake < 0.8 else max(0.0, (0.985 - quake) / 0.185)
            for x in range(int(x0), int(x0 + (TEETH[-1][0] + 6.0 - 12.0) * reach)):
                hot = ("light", 0) if fade > 0.8 and (x * 3) % 4 else ("sea", 7) if fade > 0.4 else ("sea", 4)
                cel.put(x, GROUND + (1 if (x * 3) % 4 == 0 else 0), hot)
                if (x * 7) % 5 != 0:
                    cel.put(x, GROUND - 1, ("sea", 7) if fade > 0.4 else ("sea", 4))
                if fade > 0.8 and x % 3 == 0:
                    cel.soft(x, GROUND - 2 - (x % 2), ("sea", 7))
            if quake < 0.12:
                cel.star(BUILD.root_x + 30.0, GROUND - 4, 5)
            for x, _h, _l, start in TEETH:
                rise = (quake - start) / 0.12
                if 0.0 < rise < 1.6:
                    for i in range(8):
                        ang = math.radians(-165 + i * 21.0)
                        dist = 4.0 + 9.0 * rise
                        cy = GROUND - 3 + math.sin(ang) * dist + 5.0 * rise * rise
                        if cy < GROUND - 1:
                            cel.soft(BUILD.root_x + x + math.cos(ang) * dist * 0.9, cy, ("leather", 5) if i % 3 else ("crimson", 4))
                            cel.soft(BUILD.root_x + x + math.cos(ang) * dist * 0.9 + 1, cy, ("leather", 3))
        for key, toe in (("stompN", J["toeN"]), ("stompF", J["toeF"])):
            v = pose.get(key, 0.0)
            if v > 0.05:
                for i in range(int(3 + v * 6)):
                    side = -1.0 if i % 2 else 1.0
                    cel.soft(toe[0] - 2.0 + side * (2.0 + (i // 2) * 2.2 + (1 - v) * 5.0), GROUND - 1.5 - (i % 3) * 1.4 - (1 - v) * 3.0, ("leather", 6 if i % 3 else 5))
        chips = pose.get("chips", 0.0)
        if 0.01 < chips < 0.985:
            cx, cy = J["chest"][0] + 8.0, J["chest"][1] + 8.0
            for i in range(10):
                ang = math.radians(-80 + i * 17.0)
                dist = 4.0 + (10.0 + (i * 3 % 4) * 2.0) * chips
                x, y = cx + math.cos(ang) * dist, cy + math.sin(ang) * dist * 0.7 + 14.0 * chips * chips
                if y < GROUND - 1:
                    cel.soft(x, y, ("leather", 5) if i % 3 else ("crimson", 4))
                    cel.soft(x + 1, y, ("leather", 3))
                    cel.soft(x, y + 1, ("leather", 2))
        dust = pose.get("dust", 0.0)
        if 0.01 < dust < 0.985:
            ox = BUILD.root_x + pose.get("dust_x", 0.0)
            for i in range(26):
                side = -1.0 if i % 2 else 1.0
                reach = 5.0 + (i // 2) * 2.2 + 12.0 * dust
                y = GROUND - 2.0 - (i % 5) * 2.6 * (0.4 + dust) - 6.0 * dust * (1 - dust) * 3
                if dust < 0.6 or i % 2 == 0:
                    cel.soft(ox + side * reach, y, ("leather", 6) if i % 3 else ("bone", 5))
                    if dust < 0.45:
                        cel.soft(ox + side * reach + 1, y, ("leather", 5))

    @staticmethod
    def orbit(cel: Cel, centre: Pt, strength: float, spin: float, front: bool) -> None:
        """Chips of stone circling the body: the half of the ring behind it is drawn first, the rest on top."""
        if strength < 0.05:
            return
        for i in range(7):
            ang = math.tau * (spin + i / 7 + 0.07 * math.sin(i * 2.1))
            depth = math.sin(ang)
            if (depth > 0) != front:
                continue
            x = centre[0] + math.cos(ang) * (23.0 + 4.0 * strength + (i % 3) * 2.0)
            y = centre[1] + 5.0 - 13.0 * strength * (0.4 + 0.6 * ((i * 3) % 5) / 4.0) + depth * 4.0 + (i % 2) * 5.0
            if y > GROUND - 3:
                continue
            big = i % 3 == 0
            lit, dark = (("leather", 5), ("leather", 2)) if front else (("leather", 3), ("leather", 1))
            cel.put(x, y, lit)
            cel.put(x + 1, y, lit if big else dark)
            cel.put(x, y + 1, dark)
            if big:
                cel.put(x + 1, y + 1, dark)
                cel.put(x + 2, y + 1, dark)
                cel.put(x + 1, y - 1, lit)

    @staticmethod
    def teeth(cel: Cel, u: float) -> None:
        """Three teeth of rock stabbing up out of the crack one after another, each taller than the last; they
        hold, then sink back. Cut off at the ground."""
        tmp = Cel(cel.w, cel.h, cel.top)
        sink = 0.0 if u < 0.8 else min(1.0, (u - 0.8) / 0.17)
        for x, height, lean, start in TEETH:
            rise = max(0.0, min(1.0, (u - start) / 0.12))
            h = height * (1 - (1 - rise) ** 3) * (1 - sink)
            if h < 1.5:
                continue
            bx = BUILD.root_x + x
            w = 4.0 + height * 0.2
            tip = (bx + lean, GROUND - h)
            ridge = (bx + lean * 0.3 + 0.8, GROUND + 3.0)
            # Two planes meeting on a ridge: the lit one and the one in shadow.
            for pts, t in (([(bx - w, GROUND + 3.0), tip, ridge], ("leather", 2)), ([ridge, tip, (bx + w, GROUND + 3.0)], ("leather", 5))):
                for (px, py) in tmp.poly_mask(pts):
                    tmp.put(px, py, t)
            for s in range(int(h) + 3):
                tmp.put(ridge[0] + (tip[0] - ridge[0]) * s / (h + 3.0), GROUND + 3.0 - s, ("leather", 6))
            if h > 8:
                for dx in range(int(-w * 0.55), int(w * 0.55) + 1):
                    tmp.put(bx + lean * 0.4 + dx, GROUND - h * 0.38, ("crimson", 3))
        for (x, y), t in tmp.px.items():
            if y < GROUND:
                cel.px[(x, y)] = t


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=1.5, lean=8.0, footN=(-8.0, 0.0, 0.0), footF=(8.0, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=4.0, elbN=8.0, armF=12.0, elbF=10.0, head_dx=0.0, head_dy=0.0, head_rot=0.0, breath=0.0,
                  glow=0.7, orbit=0.45, spin=0.0, crackle=0.0, quake=0.0, stompN=0.0, stompF=0.0, chips=0.0, dust=0.0, dust_x=0.0,
                  split=0.0, break_at=(0.0, 0.0), break_rot=0.0,
                  reachN=(0.0, 0.0), reachN_w=0.0, reachF=(0.0, 0.0), reachF_w=0.0, flash=0.0)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    # The blocks settle and lift as if it breathed, the glyphs pulse, the head grinds slowly round, and the chips
    # make one slow turn about it.
    pulse = 1.0 if math.sin(math.tau * 2 * ph) > 0.5 else 0.7
    return {**BASE, "breath": 0.6 + 0.6 * s, "drop": 1.5 + 0.5 * late, "lean": 8.0 + 1.0 * s, "head_rot": 5.0 * late, "head_dx": 0.6 * late,
            "armN": 4.0 + 2.5 * late, "armF": 12.0 + 2.5 * s, "glow": pulse, "spin": ph}


def walk_pose(ph: float) -> Pose:
    c = math.cos(math.tau * ph)
    p: Pose = gait_legs(Gait(stride=0.6, give=1.0, lift=0.5, toe=0.3), ph)

    def thud(q: float) -> float:  # dust for a moment after each foot comes down
        return max(0.0, 1.0 - (q % 1.0) * 5.0)

    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 10.0 + 2.0 * math.cos(2 * math.tau * (ph - 0.05)), "dy": 1.0 * (1 + math.cos(2 * math.tau * (ph - 0.04))), "hip_rot": -1.0 * c, "sh_rot": 1.0 * c,
              "armN": 4.0 - 9.0 * math.cos(math.tau * (ph - 0.1)), "armF": 12.0 + 9.0 * math.cos(math.tau * (ph - 0.1)),
              "head_dy": 0.6 * max(0.0, math.cos(2 * math.tau * (ph - 0.06))), "head_rot": 2.0 * c, "stompN": thud(ph), "stompF": thud(ph + 0.5), "glow": 0.7, "spin": ph})
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Slam: both fists are hauled up over its head while the chips whirl up round it; it hangs there, then the whole
# body comes down behind them. Feet: the rear one (N) starts at −8, the front one (F) at 8 (x is from the shifted
# root, so a planted foot is given as its place minus dx).
_DOWN = dict(dx=3.0, drop=7.5, lean=40.0, sh_rot=-7.0, armN=20.0, elbN=6.0, armF=26.0, elbF=4.0, head_rot=-16.0, footN=(-11.0, 0.0, -18.0), footF=(5.0, 0.0, 0.0),
             reachN=(19.0, 6.5), reachN_w=1.0, reachF=(27.0, 6.5), reachF_w=1.0, glow=1.0, orbit=0.0)
SLAM_KEYS = [
    (0.00, k(), "lin"),
    (0.20, k(dx=-1.0, drop=0.8, lean=-2.0, armN=150.0, elbN=14.0, armF=142.0, elbF=12.0, head_rot=-6.0, footN=(-7.0, 0.0, 0.0), footF=(9.0, 0.0, 0.0), glow=1.0,
             orbit=0.8, spin=0.4), "out"),
    (0.40, k(dx=-2.0, drop=0.2, lean=-8.0, armN=172.0, elbN=20.0, armF=162.0, elbF=16.0, head_rot=-10.0, footN=(-6.0, 0.0, 0.0), footF=(10.0, 1.8, 6.0), glow=1.0,
             orbit=1.0, spin=1.5), "io"),
    (0.47, k(**_DOWN, quake=0.02, spin=1.8), "in"),
    (0.54, k(**{**_DOWN, "drop": 8.6, "lean": 43.0}, quake=0.22, spin=1.8), "lin"),
    (0.78, k(**_DOWN, quake=0.9, spin=1.8), "lin"),
    (0.90, k(dx=1.5, drop=4.0, lean=18.0, armN=10.0, elbN=12.0, armF=18.0, elbF=12.0, head_rot=-4.0, footN=(-9.5, 0.0, -6.0), footF=(6.5, 0.8, 4.0), quake=0.98,
             orbit=0.2, spin=1.9), "io"),
    (1.00, k(quake=1.0, spin=2.0), "io"),
]

# Hit: it barely gives ground, but the blocks jolt apart, the glyphs gutter, the chips scatter and bits of stone
# fly off its chest.
HURT_KEYS = stagger_keys(BASE, push=2.6, bend=7.0, buckle=2.4, whip=10.0, over={
    "impact": dict(armN=10.0, elbN=14.0, armF=18.0, elbF=18.0, glow=1.0, chips=0.02, orbit=0.9, spin=0.05),
    "mid": dict(armN=-6.0, elbN=22.0, armF=2.0, elbF=26.0, glow=0.6, chips=0.3, orbit=1.0, spin=0.15),
    "reel": dict(armN=-18.0, elbN=30.0, armF=-12.0, elbF=34.0, glow=0.3, chips=0.55, orbit=1.0, spin=0.3),
    "catch": dict(armN=12.0, elbN=12.0, armF=20.0, elbF=14.0, glow=1.0, chips=0.98, orbit=0.7, spin=0.6),
    "recover": dict(armN=8.0, elbN=10.0, armF=16.0, elbF=14.0, glow=0.8, chips=1.0, orbit=0.5, spin=0.85),
})
HURT_KEYS[-1] = (HURT_KEYS[-1][0], {**HURT_KEYS[-1][1], "chips": 1.0, "spin": 1.0}, HURT_KEYS[-1][2])  # the chips do not fly back

# Death: every crack in it blazes, then goes dark with the glyphs; the chips drop out of the air; it breaks at the
# waist, and the upper half — shoulders, head, arms — topples forward and smashes face down. The legs stay standing.
_STAND = dict(dx=-1.0, drop=1.2, lean=4.0, footN=(-7.0, 0.0, 0.0), footF=(9.0, 0.0, 0.0), glow=0.0, orbit=0.0)
_FALLEN = dict(**_STAND, split=1.0, break_at=(19.0, 15.5), break_rot=104.0, armN=70.0, elbN=20.0, armF=80.0, elbF=10.0, head_rot=6.0,
               reachN=(47.0, 6.5), reachN_w=1.0, reachF=(40.0, 6.5), reachF_w=1.0, dust_x=32.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.09, k(dx=-2.0, drop=2.4, lean=-2.0, head_rot=-10.0, head_dx=-1.0, armN=-18.0, elbN=30.0, armF=-12.0, elbF=34.0, footN=(-6.0, 0.0, 0.0), footF=(10.0, 1.2, 8.0),
             glow=1.0, chips=0.02, orbit=1.0, spin=0.1), "out3"),
    (0.24, k(**{**_STAND, "glow": 1.0, "orbit": 1.0}, head_rot=-6.0, armN=-10.0, elbN=20.0, armF=30.0, elbF=24.0, crackle=1.0, chips=0.6, spin=0.5), "io"),
    (0.36, k(**{**_STAND, "glow": 1.0, "orbit": 0.6}, head_rot=-8.0, armN=-12.0, elbN=22.0, armF=32.0, elbF=26.0, crackle=1.0, chips=0.98, spin=0.9), "io"),
    (0.44, k(**_STAND, head_rot=4.0, armN=0.0, elbN=6.0, armF=10.0, elbF=8.0, crackle=0.0, chips=1.0, spin=1.0), "out"),
    (0.52, k(**_STAND, split=0.22, break_at=(19.0, 15.5), break_rot=104.0, head_rot=6.0, armN=30.0, elbN=10.0, armF=44.0, elbF=10.0, chips=1.0), "in"),
    (0.60, k(**_STAND, split=0.62, break_at=(19.0, 15.5), break_rot=104.0, head_rot=8.0, armN=110.0, elbN=20.0, armF=120.0, elbF=16.0, chips=1.0), "in"),
    (0.66, k(**_FALLEN, chips=1.0, dust=0.02), "in"),
    (0.72, k(**{**_FALLEN, "break_at": (19.5, 17.5), "break_rot": 98.0}, chips=1.0, dust=0.35), "out"),
    (0.80, k(**_FALLEN, chips=1.0, dust=0.7), "in"),
    (0.90, k(**_FALLEN, chips=1.0, dust=0.98), "out"),
    (1.00, k(**_FALLEN, chips=1.0, dust=1.0), "lin"),
]

STILL = lambda t: (0.0, 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [220] * 12, True, STILL),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [130] * 12, True, STILL),
    "attack": Anim("attack", keyed(SLAM_KEYS), [0.0, 0.10, 0.20, 0.30, 0.40, 0.47, 0.54, 0.60, 0.66, 0.72, 0.78, 0.84, 0.90, 0.95, 1.0],
                   [100, 100, 110, 130, 200, 50, 80, 80, 80, 80, 110, 90, 90, 90, 110], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, [int(v * 1.2) for v in HURT_MS], False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.045, 0.09, 0.165, 0.24, 0.30, 0.36, 0.44, 0.48, 0.52, 0.56, 0.60, 0.66, 0.72, 0.80, 0.90, 1.0],
                  [60, 60, 100, 90, 130, 110, 150, 180, 60, 70, 60, 60, 90, 100, 120, 160, 1500], False, STILL),
}
