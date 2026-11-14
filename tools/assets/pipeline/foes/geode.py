"""The Geode Titan — world 7, stage boss. A cave titan built like a great ape: it walks on its knuckles, hind legs
short under a long sloping back, arms like pillars ending in boulder fists, a small brutal tusked head thrust out
low between the shoulders — and over that back a hump of dark rock bigger than the rest of it, split open like a
geode. The cleft faces up and forward and is full of crystals as long as swords, which hold light and pulse as it
breathes; more of them break out of its shoulders and forearms. To attack it rears up off its fists, slams back
down and bows until the open geode points at the stone in front of it; the cavity fills with light until it lights
the cave, and lets it go as a beam that stabs the ground and drives crystals up out of it. When it dies the geode
overloads and bursts — the crystals fly — and the hulk goes down on its chest and goes dark, an empty shell.

Its frame is the boss frame (128 wide, 26 extra rows above). Its anchor is the middle of the beast, not its hips:
the skeleton is solved from the pelvis, twelve pixels behind. Drawn facing right; the game mirrors enemies."""
from __future__ import annotations

import math
from dataclasses import replace

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, keyed, solve, stagger_keys

FIGURE = ("Geode", "boss", "w07")

#: The skeleton, rooted at the pelvis. The head sits ahead of the shoulders and level with them.
SKELETON = Build(root_x=44, thigh=11.0, shin=10.0, foot=7.0, hip_dx=3.0, spine=20.0, sh_near=0.0, sh_far=8.0, upper=16.0, fore=16.0, neck=8.0, head_dx=8.0,
                 heel=2.6, toe=1.8, min_pelvis=8.0)
#: What the exporter reads: the same build anchored at the middle of the body.
BUILD = replace(SKELETON, root_x=56)
#: The lean the body sprite is drawn at; it is turned by (lean − REST) about the pelvis.
REST = 50.0

L = {
    "h": ("ink", 2), "i": ("ink", 3), "j": ("ink", 4), "J": ("ink", 5), "K": ("ink", 6), "Q": ("ink", 7),
    "a": ("bone", 1), "b": ("bone", 2), "c": ("bone", 3), "d": ("bone", 4), "e": ("bone", 5),
    "m": ("leather", 2), "n": ("leather", 3), "o": ("leather", 4),
    "k": ("ink", 0), "z": ("azure", 0), "T": ("bone", 7),
}

# Drawn in its resting stoop. From the top: the hump of rock with its cleft opening up and forward (z is the dark
# of the cavity; g, G, W its crystal lining, which follows the charge), then under it the long back sloping from
# the shoulders (right) down to the hips (left), the belly, a hide loincloth. The pelvis is at column 11, row 34.
BODY = [
    "....................jJKQ....................",
    ".................ijjJJKKQ...................",
    "...............iijjjJJJKKQ..K...............",
    ".............iiijjjjJJJKKKzzKQ..............",
    "...........iiijjjjjJJJJKKzzgGzKQ............",
    "..........hiijjjjjJJJJJKzzgGWGgzKQ..........",
    ".........hhiijjjjjJJJJJKzzgGWWGGgzzKQ.......",
    "........hhiiijjjjjJJJJJKzzgGGWWGgGgzzKQ.....",
    ".......hhhiiijjjjjjJJJJJKzzgGgGWGGgGgzJKQ...",
    "......hhhiiiijjjjjjJJJJJJKzzggGgGGgGggzJKQ..",
    ".....hhhhiiiijjjjjjjJJJJJJKzzzgggGgggzzJKKQ.",
    "....hhhhiiiikjjjjjjjJJJJJJKKzzzzgggzzzJJKQ..",
    "...hhhhhiiiiikjjjjjjjJJJJJJJKKzzzzzzzJJKKQ..",
    "...hhhhiiiiiikkjjjjjjjJJJJJJJJKKKKKKJJJKKK..",
    "..hhhhhiiiiiiikjjjjjjjjjJJJJJJJJJJJJJJKKK...",
    "..hhhhhhiiiiiiikjjjjjjjjjJJJJJJJJJJJJKKK....",
    "..hhhhhhiiiiiiiijjjjjjjjjjJJJJJJJJJJKKK.....",
    "..hhhhhhhiiiiiiijjjjjjjjjjjJJJJJJJJKKKe.....",
    "..hhhhhhhiiiiiiiijjjjjjjjjjjJJJJJJKKdee.....",
    "...hhhhhhhiiiiiiijjjjjjjjjjjJJJJccdddee.....",
    "...ahhhhhhhiiiiiiijjjjjjjjjjbbccccdddee.....",
    "...aahhhhhhhiiiiiiijjjjjjbbbbbccccdddee.....",
    "..aaabhhhhhhhiiiiiibbbbbbbbbbcccccdddde.....",
    "..aabbbbhhhhhhbbbbbbbbbbbbbbccccccdddd......",
    "..aabbbbbbbbbbbbbbbbbbbbbbbccccccdddd.......",
    "..aabbbbbbbbbbbbbbbbbbbbbccccccddddd........",
    "..aabbbbbbbbbbbbbbbbbbbccccccccddd..........",
    "..aabbbbbbbbbbbbbbbbbccccccccddd............",
    "..aaabbbbbbbbbbbbbccccccccdd................",
    "...aabbbbbbbbbbbccccccccdd..................",
    "...aabbbbbbbbbbcccccccdd....................",
    "...aaabbbbbbbbccccccdd......................",
    "....aabbbbbbbbcccccdd.......................",
    "....aabbbbbbbccccdd.........................",
    "....mmnnnnnnnooooon.........................",
    "....mmnnnnnnnnooooo.........................",
    ".....mmnn..nnnooo...........................",
    ".....mm......noo............................",
]
assert all(len(r) == 44 for r in BODY), [len(r) for r in BODY]
PIVOT = (11.0, 34.0)
# A brow of rock over two burning eyes (E, W), a snout with a nostril, and a jaw with two tusks rising past the lip.
HEAD = [
    "..iijjJJ.....",
    ".iijjJJKK....",
    "aiijkkJJKKe..",
    "abckEWkEWdee.",
    "abccddddddeee",
    "abbccddkdddee",
    ".abccdddddde.",
    ".aabTccdTdde.",
    "..aabbccddd..",
    "...aaabbcc...",
]
assert all(len(r) == 13 for r in HEAD)
FACE = {"a": ("bone", 2), "b": ("bone", 3), "c": ("bone", 4), "d": ("bone", 5), "e": ("bone", 6)}

#: Crystals standing in the cleft: (x, y from the pelvis in the body's rest frame, length, tilt forward from
#: straight up, ramp). They fan up and forward; the longest reaches 66 px off the ground.
SPIKES = [(17.0, -28.0, 11.0, 26.0, "sea"), (19.0, -26.5, 17.0, 44.0, "azure"), (21.0, -25.0, 15.0, 62.0, "sea"), (23.0, -23.5, 10.0, 82.0, "dusk")]
#: The mouth of the cleft, in the same frame: where light gathers and the beam leaves from.
MUZZLE = (25.5, -29.0)


def charge_tones(charge: float) -> tuple[dict[str, tuple[str, int]], tuple[int, int, int], bool]:
    """Sprite tones of the crystal lining the cleft, shading of the standing crystals, and whether their tips burn white."""
    if charge >= 0.9:
        return {"g": ("sea", 6), "G": ("sea", 8), "W": ("light", 0)}, (6, 8, 8), True
    if charge >= 0.5:
        return {"g": ("sea", 4), "G": ("sea", 6), "W": ("sea", 8)}, (4, 6, 8), True
    if charge >= 0.15:
        return {"g": ("sea", 3), "G": ("sea", 4), "W": ("sea", 6)}, (2, 4, 6), False
    return {"g": ("ink", 1), "G": ("ink", 2), "W": ("ink", 3)}, (1, 2, 3), False


class Geode(Character):
    build = BUILD
    W = 128
    TOP = 26

    def chains(self) -> dict[str, ChainSpec]:
        def grounded(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        # A beard of cave lichen under the jaw.
        return {"beard": ChainSpec(Chain(4, 2.4, gravity=0.22, drag=0.12, damp=0.1), lambda J: J["chin"], grounded)}

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = solve(SKELETON, pose)
        lean = pose.get("lean", 0.0)
        turn = pose.get("head_rot", 0.0) + (lean - REST if abs(lean - REST) > 24 else 0.0)
        a = math.radians(turn)
        hx, hy = J["head"]
        J["chin"] = (hx + 5.0 * math.cos(a) - 4.5 * math.sin(a), hy + 5.0 * math.sin(a) + 4.5 * math.cos(a))
        J["turn"] = (turn, 0.0)
        la = math.radians(lean - REST)
        px, py = J["pelvis"]
        J["muzzle"] = (px + MUZZLE[0] * math.cos(la) - MUZZLE[1] * math.sin(la), py + MUZZLE[0] * math.sin(la) + MUZZLE[1] * math.cos(la))
        return J

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        hip, knee, ankle, toe = J["hip" + s], J["knee" + s], J["ankle" + s], J["toe" + s]
        cel.limb(hip, knee, 10.0, 8.0, "bone", (1, 2, 4), far=far)
        cel.limb(knee, ankle, 8.0, 6.6, "bone", (1, 2, 4), far=far)
        cel.limb(ankle, toe, 7.4, 5.4, "bone", (1, 3, 4), far=far)
        for dx_, dy_ in ((1.8, 0.4), (0.6, 1.2), (-0.8, 1.4)):  # claws
            cel.put(toe[0] + dx_, toe[1] + dy_, ("ink", 2))
        cel.limb((knee[0] - 1.5, knee[1] - 1.0), (knee[0] + 1.5, knee[1] + 1.0), 4.0, 3.4, "ink", (3, 5, 6), far=far)  # a kneecap of rock

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool, tones: tuple[int, int, int], lit: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 10.0, 8.0, "bone", (2, 4, 5), far=far)
        cel.limb(el, hd, 8.0, 10.0, "bone", (2, 4, 6), far=far)
        dx, dy = hd[0] - el[0], hd[1] - el[1]
        d = math.hypot(dx, dy) or 1.0
        ux, uy = dx / d, dy / d
        out = (uy, -ux) if -ux <= 0 else (-uy, ux)  # the side of the forearm that faces up
        # A fist like a boulder, crusted with rock across the knuckles and up the forearm.
        cel.limb((hd[0] - ux * 1.2, hd[1] - uy * 1.2), (hd[0] + ux * 3.2, hd[1] + uy * 3.2), 12.0, 11.0, "bone", (2, 4, 6), far=far)
        cel.limb((hd[0] + ux * 2.6 - uy * 4.2, hd[1] + uy * 2.6 + ux * 4.2), (hd[0] + ux * 2.6 + uy * 4.2, hd[1] + uy * 2.6 - ux * 4.2), 3.6, 3.6, "ink", (3, 5, 6), far=far)
        mid = (el[0] + dx * 0.5, el[1] + dy * 0.5)
        plate = (mid[0] + out[0] * 3.4, mid[1] + out[1] * 3.4)
        cel.limb((plate[0] - ux * 3.5, plate[1] - uy * 3.5), (plate[0] + ux * 3.5, plate[1] + uy * 3.5), 3.6, 3.0, "ink", (3, 5, 6), far=far)
        ramp = "sea" if tones[1] > 2 else "ink"
        for t, length in ((0.28, 5.5), (0.6, 7.5)):  # crystals breaking out of the forearm
            base = (el[0] + dx * t + out[0] * 3.0, el[1] + dy * t + out[1] * 3.0)
            tip = (base[0] + out[0] * length - ux * 1.5, base[1] + out[1] * length - uy * 1.5)
            cel.limb(base, tip, 3.2, 0.8, ramp, tones, far=far)
            if lit and not far:
                cel.put(tip[0], tip[1], ("light", 0))
        if not far:  # a pauldron of rock where the arm leaves the hump, and crystals out of it
            cel.limb((sh[0] - 4.0, sh[1] - 1.0), (sh[0] + 3.5, sh[1] + 1.5), 8.5, 7.5, "ink", (3, 5, 7))
            for ox, oy, length, ang in ((-3.0, -3.0, 8.0, -118.0), (0.5, -4.0, 6.0, -86.0)):
                base = (sh[0] + ox, sh[1] + oy)
                r = math.radians(ang)
                tip = (base[0] + math.cos(r) * length, base[1] + math.sin(r) * length)
                cel.limb(base, tip, 3.4, 0.8, ramp, tones)
                if lit:
                    cel.put(tip[0], tip[1], ("light", 0))

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        charge = pose.get("charge", 0.4)
        burst = pose.get("burst", 0.0)
        alive = pose.get("alive", 1.0) > 0.5
        sprite_tones, spike_tones, hot = charge_tones(charge)
        self.arm(cel, J, "F", True, spike_tones, hot)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        turn_body = lean - REST
        la = math.radians(turn_body)

        def on_body(x: float, y: float) -> Pt:
            return (px + x * math.cos(la) - y * math.sin(la), py + x * math.sin(la) + y * math.cos(la))

        cel.stamp_pivot(BODY, {**L, **sprite_tones}, (px, py), PIVOT[0], PIVOT[1], turn_body)

        if burst <= 0.01:  # the crystals standing in the cleft (once it bursts they are in the air)
            for x, y, length, tilt, ramp in SPIKES:
                base = on_body(x, y)
                r = math.radians(tilt + turn_body - 90.0)
                tip = (base[0] + math.cos(r) * length, base[1] + math.sin(r) * length)
                dusk = ramp == "dusk" and charge >= 0.15
                cel.limb(base, tip, 4.4, 0.9, ramp if charge >= 0.15 else "ink", (4, 6, 8) if dusk else spike_tones)
                # One lit facet down the side that faces the light.
                nx, ny = math.cos(r - math.pi / 2), math.sin(r - math.pi / 2)
                cel.line((base[0] + nx * 1.0 + math.cos(r) * 2, base[1] + ny * 1.0 + math.sin(r) * 2),
                         (base[0] + nx * 0.3 + math.cos(r) * length * 0.7, base[1] + ny * 0.3 + math.sin(r) * length * 0.7),
                         (ramp if charge >= 0.15 else "ink", 8 if hot else spike_tones[2]))
                if hot:
                    cel.put(tip[0], tip[1], ("light", 0))
        else:
            self.shards(cel, J["muzzle"], burst)
        # The head is thrust out in front of the shoulders, on a neck that stays in the shadow of the hump.
        hx, hy = J["head"]
        turn = J["turn"][0]
        cel.limb((J["chest"][0] + 3.0, J["chest"][1] + 2.0), (hx + 1.0, hy), 10.0, 9.0, "bone", (0, 1, 2))
        beard = ropes["beard"]
        for i in range(len(beard) - 1):
            cel.limb(beard[i], beard[i + 1], 3.4 - i * 0.6, 2.8 - i * 0.6, "sea", (2, 4, 6) if alive else (1, 2, 3))
        eye = {"E": ("brass", 7), "W": ("light", 0)} if alive and charge >= 0.5 else {"E": ("brass", 5), "W": ("brass", 6)} if alive else {"E": ("ink", 1), "W": ("ink", 2)}
        cel.stamp_pivot(HEAD, {**L, **FACE, **eye}, (hx, hy), 2.0, 5.0, turn)
        ta = math.radians(turn)

        def on_head(x: float, y: float) -> Pt:
            return (hx + x * math.cos(ta) - y * math.sin(ta), hy + x * math.sin(ta) + y * math.cos(ta))

        for x0, x1, far_ in ((6.5, 9.5, True), (2.5, 5.0, False)):  # tusks curving up past the snout
            cel.limb(on_head(x0, 3.0), on_head(x1, -4.5), 3.0, 0.9, "bone", (4, 6, 7), far=far_)
        self.arm(cel, J, "N", False, spike_tones, hot)
        cel.outline()
        if alive:
            for ex_ in (2.5, 5.5):
                ex, ey = on_head(ex_, -1.5)
                cel.put(ex, ey, ("brass", 7))
                cel.put(ex + 1, ey, ("light", 0) if charge >= 0.5 else ("brass", 6))

        mx, my = J["muzzle"]
        if alive and charge >= 0.4 and burst <= 0.01:  # motes of light rising off the crystals
            ph = pose.get("motes", 0.0)
            for i in range(6):
                u = (ph + i / 6) % 1.0
                cel.soft(mx - 4.0 + (i * 4.7 % 17.0 - 8.0) + 1.8 * math.sin(math.tau * (u + i * 0.3)), my - 6.0 - 13.0 * u, ("sea", 8) if u < 0.5 else ("sea", 6))
        if alive and charge >= 0.9 and burst <= 0.01:  # full: the cavity lights the cave — rays standing out of it
            for i in range(11):
                ang = math.radians(-170.0 + i * 22.0 + turn_body)
                for r in (11.0, 13.0, 15.0, 19.0 + (i % 3) * 2.0):
                    cel.soft(mx - 3.0 + math.cos(ang) * r, my + 2.0 + math.sin(ang) * r, ("light", 0) if r < 14 else ("sea", 7))
        gather = pose.get("gather", 0.0)
        if 0.01 < gather < 0.985:  # light drawn in from the air around the cleft
            for i in range(12):
                ang = math.tau * (i / 12 + gather * 0.35)
                r = 24.0 * (1.0 - gather) + 4.0
                cel.soft(mx + math.cos(ang) * r * 1.2, my + math.sin(ang) * r, ("light", 0) if i % 3 == 0 else ("sea", 7))
        beam = pose.get("beam", 0.0)
        if 0.01 < beam < 0.985:
            self.beam(cel, (mx, my), beam)
        if 0.01 < burst < 0.3:
            cel.star(mx, my, 8)

    @staticmethod
    def beam(cel: Cel, origin: Pt, u: float) -> None:
        """The beam: it lances down out of the cleft into the stone just ahead, holds, then thins away. Where it
        lands the ground throws up light and a row of crystals."""
        ang = math.radians(46.0)
        dx, dy = math.cos(ang), math.sin(ang)
        reach = min(1.0, u / 0.16)
        thick = 1.0 if u < 0.72 else max(0.0, (0.985 - u) / 0.265)
        half = 0.8 + 3.2 * thick
        ox, oy = origin[0] + dx * 3.0, origin[1] + dy * 3.0
        full = (GROUND - 1.0 - oy) / dy
        end = full * reach
        for i in range(0, int(end) + 1):
            x, y = ox + dx * i, oy + dy * i
            flick = 0.5 * math.sin(i * 0.9 + u * 40.0)
            for j in range(-6, 7):
                dist = abs(j + flick * 0.4)
                if dist <= half + 1.2:
                    yy = y + dx * j
                    if yy < GROUND:
                        tone = ("light", 0) if dist <= half * 0.55 else ("sea", 8) if dist <= half else ("sea", 6)
                        # Two samples per step so the diagonal has no holes.
                        cel.put(x - dy * j, yy, tone)
                        cel.put(x - dy * j + 0.5, yy, tone)
        cel.star(ox, oy, 6 if thick > 0.5 else 3)
        if reach < 1.0:
            return
        ex = ox + dx * full
        if thick > 0.2:  # the strike: a splash of light and sparks thrown back
            cel.star(ex, GROUND - 3, 6)
            for i in range(9):
                a2 = math.radians(-172 + i * 20.5)
                r = 5.0 + 8.0 * ((u * 7.0 + i * 0.37) % 1.0)
                if GROUND - 2 + math.sin(a2) * r < GROUND - 1:
                    cel.soft(ex + math.cos(a2) * r, GROUND - 2 + math.sin(a2) * r, ("light", 0) if i % 2 else ("sea", 7))
        # Crystals driven up out of the stone around the strike; they stay a moment after the beam has gone.
        grow = min(1.0, (u - 0.16) / 0.22)
        tmp = Cel(cel.w, cel.h, cel.top)
        for off, height, tilt in ((-7.0, 9.0, -14.0), (-2.5, 15.0, -4.0), (2.5, 12.0, 8.0), (6.5, 8.0, 20.0)):
            h = height * (1 - (1 - grow) ** 2)
            if h < 1.5:
                continue
            base = (ex + off, GROUND + 2.0)
            r = math.radians(tilt - 90.0)
            tip = (base[0] + math.cos(r) * (h + 2.0), base[1] + math.sin(r) * (h + 2.0))
            tmp.limb(base, tip, 4.6, 0.9, "sea", (4, 6, 8))
            tmp.put(tip[0], tip[1], ("light", 0))
        for (x, y), t in tmp.px.items():
            if y < GROUND and (x, y) not in cel.px:
                cel.px[(x, y)] = t

    @staticmethod
    def shards(cel: Cel, origin: Pt, u: float) -> None:
        """The crystals after the geode bursts: thrown up and out, they fall and lie where they land, dark."""
        t_now = u * 34.0
        floor = GROUND - 1.5
        for i in range(16):
            vx = ((i * 37) % 15 - 7) * 0.44 + 0.3
            vy = -(1.5 + ((i * 53) % 7) * 0.36)
            length = 5.0 + (i * 29) % 8
            t, x, y, landed = 0.0, origin[0], origin[1], False
            while t < t_now:
                t += 0.25
                x, y = origin[0] + vx * t, origin[1] + vy * t + 0.13 * t * t
                if y >= floor:
                    y, landed = floor, True
                    break
            ang = math.radians(10.0 if i % 2 else 170.0) if landed else math.radians((i * 61) % 180 + t * 30.0 * (1 if i % 2 else -1))
            dx, dy = math.cos(ang) * length / 2, math.sin(ang) * length / 2
            ramp = "azure" if i % 4 == 0 else "dusk" if i % 7 == 3 else "sea"
            tones = (1, 2, 4) if u > 0.75 else (2, 4, 6) if landed else (5, 7, 8)
            cel.limb((x - dx, y - dy), (x + dx, y + dy), 3.6, 0.8, ramp, tones)


# --------------------------------------------------------------------------------------- animations
# Reach targets are x from the pelvis root and height: the fists stay where they are planted whatever the body does.
FISTS = dict(reachN=(25.0, 4.8), reachN_w=1.0, reachF=(34.0, 4.8), reachF_w=1.0)
BASE: Pose = dict(dx=0.0, drop=4.0, lean=50.0, footN=(-6.0, 0.0, 0.0), footF=(3.0, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=45.0, elbN=-45.0, armF=55.0, elbF=-50.0, **FISTS, head_dx=0.0, head_dy=0.0, head_rot=0.0, breath=0.0,
                  charge=0.4, motes=0.0, gather=0.0, beam=0.0, burst=0.0, alive=1.0, flash=0.0)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.18))
    # It stands on its knuckles and breathes with its whole back; the crystals brighten on every breath in.
    return {**BASE, "breath": 0.6 + 0.6 * s, "drop": 4.0 + 0.8 * late, "lean": 50.0 + 1.6 * s, "head_rot": 6.0 * late, "head_dy": 0.5 * s,
            "charge": 0.6 if s > 0.2 else 0.4, "motes": ph}


def _fist(q: float, rest: float) -> tuple[float, float]:
    """One fist of the knuckle-walk: planted and carried back under the shoulder, then swung forward off the ground."""
    q %= 1.0
    if q < 0.6:
        return (rest + 4.5 * (1 - 2 * q / 0.6), 4.8)
    t = (q - 0.6) / 0.4
    return (rest - 4.5 + 9.0 * t, 4.8 + 6.0 * math.sin(math.pi * t))


def walk_pose(ph: float) -> Pose:
    c = math.cos(math.tau * ph)
    p: Pose = gait_legs(Gait(stride=0.6, give=2.4, lift=0.8, toe=0.5), ph)
    # A knuckle-walk: each fist is planted opposite its leg and the whole back rolls over it.
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 51.0 + 2.0 * math.cos(2 * math.tau * (ph - 0.05)), "dy": 1.0 * (1 + math.cos(2 * math.tau * (ph - 0.1))), "hip_rot": -0.9 * c, "sh_rot": 1.0 * c,
              "reachN": _fist(ph + 0.5, 25.0), "reachF": _fist(ph, 34.0), "head_rot": 5.0 * math.cos(math.tau * (ph - 0.2)),
              "head_dy": 0.6 * math.cos(2 * math.tau * (ph - 0.2)), "motes": 2 * ph})
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Beam: it rears up off its fists, slams back down and bows until the open geode points at the stone in front of
# it; the cavity fills with light — and lets it go. It rocks back on its haunches as it fires. Feet are given so
# they stay planted while the body shifts (x is measured from the shifted root).
_BOWED = dict(drop=3.0, lean=100.0, reachN=(26.0, 4.8), reachN_w=1.0, reachF=(35.0, 4.8), reachF_w=1.0, head_rot=-56.0, head_dy=-3.0)
BEAM_KEYS = [
    (0.00, k(), "lin"),
    (0.18, k(dx=-3.0, drop=1.0, lean=14.0, reachN_w=0.0, reachF_w=0.0, armN=-20.0, elbN=40.0, armF=0.0, elbF=56.0, head_rot=24.0, charge=0.6,
             footN=(-3.0, 0.0, 0.0), footF=(6.0, 0.0, 0.0), motes=0.4), "out"),
    (0.34, k(dx=-2.0, **{**_BOWED, "lean": 94.0, "drop": 2.4}, charge=0.8, gather=0.3, footN=(-4.0, 0.0, -10.0), footF=(5.0, 0.0, 0.0), motes=0.8), "in"),
    (0.46, k(dx=-5.0, **_BOWED, charge=1.0, gather=0.98, footN=(-1.0, 0.0, -10.0), footF=(8.0, 0.0, 0.0), motes=1.2), "out"),
    (0.52, k(dx=-6.0, **{**_BOWED, "lean": 97.0}, charge=1.0, gather=1.0, beam=0.02, footN=(0.0, 0.0, -6.0), footF=(9.0, 0.0, 0.0), motes=1.4), "out3"),
    (0.76, k(dx=-6.6, **_BOWED, charge=1.0, gather=1.0, beam=0.98, footN=(0.6, 0.0, -6.0), footF=(9.6, 0.0, 0.0), motes=2.0), "lin"),
    (0.88, k(dx=-3.0, drop=4.0, lean=72.0, head_rot=-20.0, charge=0.15, gather=1.0, beam=1.0, footN=(-3.0, 0.0, 0.0), footF=(6.0, 0.0, 0.0), motes=2.4), "io"),
    (1.00, k(gather=1.0, beam=1.0, motes=3.0), "io"),
]

# Hit: it gives little ground; the fists come off the stone, the head is jerked back and the crystals flicker.
HURT_KEYS = stagger_keys(BASE, push=3.0, bend=10.0, buckle=2.4, whip=14.0, over={
    "impact": dict(reachF_w=0.4, charge=1.0),
    "reel": dict(reachN_w=0.0, reachF_w=0.0, armN=10.0, elbN=40.0, armF=24.0, elbF=44.0, charge=0.15),
    "catch": dict(reachN_w=1.0, reachF_w=1.0, reachN=(22.0, 4.8), reachF=(31.0, 4.8), charge=1.0),
})

# Death: the geode overloads and bursts; what is left goes down on its knees, then on its chest, and goes dark.
_HULK = dict(dx=2.0, drop=13.0, lean=100.0, reachN_w=0.0, reachF_w=0.0, armN=88.0, elbN=4.0, armF=92.0, elbF=2.0, head_rot=-44.0, head_dy=-3.0,
             footN=(-13.0, 0.8, -100.0), footF=(-9.0, 0.8, -100.0), charge=0.0, alive=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-3.0, drop=2.0, lean=24.0, reachN_w=0.0, reachF_w=0.0, armN=-20.0, elbN=40.0, armF=-6.0, elbF=52.0, head_rot=14.0, charge=1.0,
             footN=(-3.0, 0.0, 0.0), footF=(6.0, 1.2, 8.0)), "out3"),
    (0.26, k(dx=-4.0, drop=2.6, lean=14.0, reachN_w=0.0, reachF_w=0.0, armN=-44.0, elbN=60.0, armF=-30.0, elbF=70.0, head_rot=20.0, charge=1.0, gather=0.6,
             footN=(-2.0, 0.0, 0.0), footF=(7.0, 0.0, 0.0)), "io"),
    (0.36, k(dx=-2.0, drop=4.0, lean=46.0, reachN_w=0.0, reachF_w=0.0, armN=20.0, elbN=30.0, armF=30.0, elbF=30.0, head_rot=0.0, charge=1.0, gather=1.0, burst=0.02,
             footN=(-4.0, 0.0, 0.0), footF=(5.0, 0.0, 0.0)), "in"),
    (0.50, k(**{**_HULK, "dx": 0.0, "drop": 10.0, "lean": 76.0, "footN": (-11.0, 0.8, -90.0), "footF": (-7.0, 0.8, -90.0), "armN": 60.0, "armF": 70.0, "head_rot": -24.0}, gather=1.0,
             burst=0.3), "io"),
    (0.62, k(**_HULK, gather=1.0, burst=0.5), "in"),
    (0.70, k(**{**_HULK, "lean": 95.0, "drop": 12.0}, gather=1.0, burst=0.65), "out"),
    (0.80, k(**_HULK, gather=1.0, burst=0.8), "in"),
    (1.00, k(**_HULK, gather=1.0, burst=1.0), "lin"),
]

STILL = lambda t: (-0.2 + 0.2 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [200] * 12, True, STILL),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [115] * 12, True, lambda t: (-0.5, 0.0)),
    "attack": Anim("attack", keyed(BEAM_KEYS), [0.0, 0.09, 0.18, 0.26, 0.34, 0.40, 0.46, 0.52, 0.58, 0.64, 0.70, 0.76, 0.82, 0.88, 0.94, 1.0],
                   [90, 100, 140, 60, 90, 110, 170, 50, 70, 70, 70, 90, 90, 100, 90, 110], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, [int(ms * 1.2) for ms in HURT_MS], False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.18, 0.26, 0.31, 0.36, 0.43, 0.50, 0.56, 0.62, 0.70, 0.80, 0.90, 1.0],
                  [60, 50, 90, 90, 140, 70, 60, 70, 80, 80, 90, 100, 130, 180, 1400], False, STILL),
}
