"""The Archon — world 9, stage boss. The citadel's greatest statue, come down from its plinth: a giant of cold
shadowed marble and gold, twice a man's height, with two great wings of layered feathers that frame it, a gold
halo-disc behind its head, heavy gilded pauldrons, and for a face a blank pale mask split by one vertical crack
with light burning in it and gold running from its shut eyes. Its sword is a blade of light as long as a man.
It stands on guard with the sword planted and both hands on the pommel, and walks with it upright. To judge, it
tears the sword up over its head as the wings snap wide and the blade blazes, hangs there, and drives it into the
floor; pillars of light burst up in front of it. It dies slowly: the light in the mask goes, cracks spread from it
through the stone, a wing breaks off and falls, then it crumbles from the crown down around its standing sword —
and the sword's light is the last thing to go out.

Its own frame: 152 wide, 44 extra rows above. Drawn facing right; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, ik, keyed, lerp, loose, stagger_keys, swing_smear

FIGURE = ("Archon", "boss", "w09")

BUILD = Build(root_x=66, thigh=13.0, shin=13.0, foot=6.5, hip_dx=2.6, spine=20.0, sh_near=8.5, sh_far=7.0, upper=12.5, fore=12.0, neck=1.5, head_dx=0.8,
              heel=2.4, toe=1.6, min_pelvis=8.0)

L = {
    # Marble in shadow: cold, darker than the pale city behind it.
    "A": ("ink", 2), "B": ("ink", 3), "C": ("ink", 4), "D": ("ink", 5), "E": ("ink", 6), "F": ("ink", 7),
    "h": ("brass", 2), "i": ("brass", 3), "j": ("brass", 4), "J": ("brass", 5), "K": ("brass", 6),
    "a": ("azure", 1), "b": ("azure", 2), "c": ("azure", 3), "d": ("azure", 4),
    "n": ("bone", 5), "o": ("bone", 6), "p": ("bone", 7), "k": ("ink", 0),
}

# A carved cowl with a gold band, and inside it the mask: smooth, pale, eyes shut (k), gold tears under them (T) and
# one crack from brow to chin with the light behind it (G).
HEAD = [
    "...BCCDD...",
    "..BCCDDEE..",
    ".BBCjjJJKE.",
    ".BCnnooGpp.",
    "ABCnooGopp.",
    "ABCkkoGokp.",
    "ABCnToGopT.",
    "ABCnTooGpT.",
    ".BCnnoGop..",
    ".BBCnoGp...",
    "..BCCnn....",
    "..ABCC.....",
    "...ABC.....",
]
# Gorget, a breastplate with a gold sun, a fold of blue drapery, a studded belt and a skirt of gold straps over stone.
TORSO = [
    ".....hijjJJK.....",
    "....hiijjJJKK....",
    "..ABBCCDDDDDEEEF.",
    ".ABBCCDDDjJDDEEEF",
    "ABBBCCDDjJKJDDEEF",
    "ABBCCDDjJKKKJDEEF",
    "ABBBCCDDjJKJDDEEF",
    ".ABBCCDDDjJDDEEEF",
    ".ABBCCDDDDDDDEEE.",
    "..ABCCaabbccdDEE.",
    "..ABBCaaabbccdEE.",
    "...ABCCaabbccDE..",
    "...ABCCDDDDDEE...",
    "..hiijjjJJJJKKK..",
    "..hijKjhijKjhiK..",
    ".hiAjiBjiCjiDjJK.",
    ".hiAjiBjiCjiDjJK.",
    ".hiAjiBjiCjiDjJK.",
    ".hi.ji.ji.ji.jJK.",
    ".h..j..j..j..j.K.",
]
PAULDRON = [
    "..ijjJK..",
    ".hijjJJK.",
    "hiijjJJKK",
    "hijhiJjKK",
    ".hiijJJK.",
    "..h.i.J..",
]
assert all(len(r) == 11 for r in HEAD) and all(len(r) == 17 for r in TORSO) and all(len(r) == 9 for r in PAULDRON)

BLADE, HILT = 34.0, 4.5
HUMERUS, FOREARM, PRIMARIES, COVERTS = 14.0, 16.0, 9, 7
#: Pillars of light of the judgement: (px ahead of where the blade enters the floor, height, when it starts 0–1).
PILLARS = ((4.0, 46.0, 0.0), (11.5, 35.0, 0.1), (18.5, 25.0, 0.2))
#: Where the sword stands once it is let go: x from the root, height of the grip.
PLANTED = (11.0, 34.0)


def sword_points(grip: Pt, angle: float) -> tuple[Pt, Pt, Pt]:
    """Pommel, guard and point; `angle` is where the blade points (90 = straight down)."""
    a = math.radians(angle)
    d = (math.cos(a), math.sin(a))
    return (grip[0] - d[0] * HILT, grip[1] - d[1] * HILT), (grip[0] + d[0] * 3.0, grip[1] + d[1] * 3.0), (grip[0] + d[0] * (3.0 + BLADE), grip[1] + d[1] * (3.0 + BLADE))


def strike_x(grip: Pt, angle: float) -> float:
    """Where the blade goes into the floor."""
    a = math.radians(angle)
    s = math.sin(a)
    return grip[0] + math.cos(a) * ((GROUND - grip[1]) / s) if s > 0.05 else grip[0]


def draw_sword(cel: Cel, grip: Pt, angle: float, light: float, blaze: float = 0.0) -> None:
    """A blade of light on a gold hilt (dull stone once the light is gone). Cut off where it enters the floor."""
    a = math.radians(angle)
    n = (-math.sin(a), math.cos(a))
    pommel, guard, tip = sword_points(grip, angle)
    tmp = Cel(cel.w, cel.h, cel.top)
    tmp.limb(pommel, guard, 2.6, 2.6, "brass", (2, 4, 5))
    tmp.limb((guard[0] - n[0] * 6.0, guard[1] - n[1] * 6.0), (guard[0] + n[0] * 6.0, guard[1] + n[1] * 6.0), 2.8, 2.4, "brass", (3, 5, 6))
    for dx, dy in ((0, 0), (1, 0), (0, 1), (-1, 0), (0, -1)):
        tmp.put(pommel[0] + dx, pommel[1] + dy, ("brass", 6 if (dx, dy) == (0, 0) else 4))
    shoulder = (guard[0] + (tip[0] - guard[0]) * 0.86, guard[1] + (tip[1] - guard[1]) * 0.86)
    if light >= 0.75:
        if blaze > 0.5:  # a sheath of fire round the blade
            tmp.limb(guard, tip, 9.0, 4.0, "brass", (5, 6, 6))
        tmp.limb(guard, shoulder, 5.6, 4.6, "brass", (6, 7, 7))
        tmp.limb(shoulder, tip, 4.6, 0.8, "brass", (6, 7, 7))
        tmp.limb(guard, tip, 2.4, 0.8, "light", (0, 0, 0))
    elif light >= 0.3:  # guttering
        tmp.limb(guard, shoulder, 5.6, 4.6, "brass", (3, 4, 5))
        tmp.limb(shoulder, tip, 4.6, 0.8, "brass", (3, 4, 5))
        tmp.limb(guard, tip, 1.6, 0.8, "brass", (6, 6, 6))
    else:
        tmp.limb(guard, shoulder, 5.6, 4.6, "ink", (3, 4, 6))
        tmp.limb(shoulder, tip, 4.6, 0.8, "ink", (3, 4, 6))
    for (x, y), t in tmp.px.items():
        if y < GROUND:
            cel.px[(x, y)] = t


class Archon(Character):
    build = BUILD
    W = 152
    TOP = 44

    # ------------------------------------------------------------------------------------ skeleton
    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        grip = loose(pose, "sword", J["handN"], self.build.root_x)
        # Second hand on the hilt, `hold` px along the blade from the first (negative = towards the pommel).
        two = pose.get("two", 0.0) * (1.0 - pose.get("sword_free", 0.0))
        if two > 0.01:
            a = math.radians(pose["sword"])
            h = pose.get("hold", -3.5)
            on = (grip[0] + math.cos(a) * h, grip[1] + math.sin(a) * h)
            hx, hy = J["handF"]
            J["elbowF"], J["handF"] = ik(J["shF"], (lerp(hx, on[0], two), lerp(hy, on[1], two)), self.build.upper, self.build.fore, +1)
        J["grip"] = grip
        self.wing_joints(J, pose, "wf", (2.0, 0.0), 15.0, 0.0)
        self.wing_joints(J, pose, "wn", (-2.0, 2.0), 0.0, pose.get("wn_drop", 0.0))
        return J

    def wing_joints(self, J: dict[str, Pt], pose: Pose, name: str, off: Pt, skew: float, drop: float) -> None:
        """Shoulder → elbow → wrist, a fan of long primaries off the forearm and a row of short coverts over them.
        `wing` 0 = folded down the back, 1 = thrown wide. `drop` 0→1 breaks the wing off: it falls and lies."""
        lean = pose.get("lean", 0.0)
        w, flap = pose.get("wing", 0.5), pose.get("flap", 0.0)
        sx, sy = J["shN"]
        pts: dict[str, Pt] = {}
        root = (sx + off[0], sy + off[1])
        hum = math.radians(lerp(250.0, 208.0, w) + flap + lean + skew)
        fore = math.radians(lerp(100.0, 262.0, w) + flap * 0.6 + lean + skew)
        elbow = (root[0] + HUMERUS * math.cos(hum), root[1] + HUMERUS * math.sin(hum))
        wrist = (elbow[0] + FOREARM * math.cos(fore), elbow[1] + FOREARM * math.sin(fore))
        pts["root"], pts["elbow"], pts["wrist"] = root, elbow, wrist

        def fan(prefix: str, n: int, length: tuple[float, float], a0: tuple[float, float], a1: tuple[float, float], r: Pt, e: Pt, wr: Pt, turn: float, spread: float) -> None:
            for i in range(n):
                t = i / (n - 1)
                base = (wr[0] + (e[0] - wr[0]) * t, wr[1] + (e[1] - wr[1]) * t) if prefix == "p" else \
                       ((wr[0] + (e[0] - wr[0]) * t * 2, wr[1] + (e[1] - wr[1]) * t * 2) if t < 0.5 else (e[0] + (r[0] - e[0]) * (t - 0.5) * 1.6, e[1] + (r[1] - e[1]) * (t - 0.5) * 1.6))
                ang = math.radians(lerp(lerp(a0[0], a0[1], spread), lerp(a1[0], a1[1], spread), t) + turn)
                ln = lerp(length[0], length[1], t)
                pts[f"{prefix}b{i}"] = base
                pts[f"{prefix}t{i}"] = (base[0] + ln * math.cos(ang), min(base[1] + ln * math.sin(ang), GROUND - 1.0))

        turn = flap * 0.4 + lean + skew * 0.5
        fan("p", PRIMARIES, (27.0, 14.0), (102.0, 292.0), (152.0, 132.0), root, elbow, wrist, turn, w)
        fan("c", COVERTS, (10.0, 7.0), (106.0, 280.0), (156.0, 140.0), root, elbow, wrist, turn, w)
        if drop > 0.0:
            # Broken off: every point falls to where the wing will lie on the floor behind it, feathers fanned.
            gx = self.build.root_x + pose.get("dx", 0.0) - 12.0
            lie: dict[str, Pt] = {"root": (gx, GROUND - 3.5), "elbow": (gx - 10.0, GROUND - 5.0), "wrist": (gx - 21.0, GROUND - 3.5)}
            keep = dict(pts)
            pts.update(lie)
            fan("p", PRIMARIES, (27.0, 14.0), (186.0, 186.0), (218.0, 218.0), lie["root"], lie["elbow"], lie["wrist"], 0.0, 0.0)
            fan("c", COVERTS, (10.0, 7.0), (190.0, 190.0), (226.0, 226.0), lie["root"], lie["elbow"], lie["wrist"], 0.0, 0.0)
            e = min(1.0, drop)
            # It falls whole — the fan keeps its shape, turning as the broken end drops — and only spreads flat
            # on the floor at the last moment.
            r0 = keep["root"]
            at = (lerp(r0[0], lie["root"][0], e) - 5.0 * math.sin(math.pi * e), lerp(r0[1], lie["root"][1] - 4.0, e * e))
            th = math.radians(-42.0 * e)
            settle = max(0.0, (e - 0.72) / 0.28)
            for key, q in pts.items():
                vx, vy = keep[key][0] - r0[0], keep[key][1] - r0[1]
                fx, fy = at[0] + vx * math.cos(th) - vy * math.sin(th), at[1] + vx * math.sin(th) + vy * math.cos(th)
                pts[key] = (lerp(fx, q[0], settle), min(lerp(fy, q[1], settle), GROUND - 1.0))
        for key, q in pts.items():
            J[f"{name}_{key}"] = q

    def chains(self) -> dict[str, ChainSpec]:
        def grounded(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        return {
            "tabard": ChainSpec(Chain(5, 3.2, gravity=0.24, drag=0.14, damp=0.1), lambda J: (J["pelvis"][0] + 2.5, J["pelvis"][1] - 1.0), grounded),
            "sash": ChainSpec(Chain(5, 3.0, gravity=0.2, drag=0.16, damp=0.1), lambda J: (J["pelvis"][0] - 4.0, J["pelvis"][1] - 3.0), grounded, (-0.6, 0.8)),
        }

    # ------------------------------------------------------------------------------------ parts
    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        hip, knee, ankle, toe = J["hip" + s], J["knee" + s], J["ankle" + s], J["toe" + s]
        cel.limb(hip, knee, 8.0, 6.4, "ink", (3, 5, 6), far=far)
        cel.limb(knee, ankle, 6.4, 5.0, "ink", (3, 5, 7), far=far)  # greave: stone, bound in gold at knee and ankle
        cel.limb(ankle, toe, 5.4, 3.8, "brass", (2, 4, 5), far=far)
        low = (knee[0] + (ankle[0] - knee[0]) * 0.82, knee[1] + (ankle[1] - knee[1]) * 0.82)
        cel.limb(low, ankle, 5.4, 5.0, "brass", (3, 4, 6), far=far)
        for dx, dy in ((0, 0), (1, 0), (0, -1), (-1, 0), (0, 1), (1, -1), (-1, -1)):
            cel.put(knee[0] + dx, knee[1] + dy, ("brass", 5 if far else 6))

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 6.6, 5.2, "ink", (3, 5, 6), far=far)
        cel.limb(el, hd, 5.4, 4.6, "ink", (3, 5, 7), far=far)
        wrist = (el[0] + (hd[0] - el[0]) * 0.6, el[1] + (hd[1] - el[1]) * 0.6)
        cel.limb(wrist, hd, 5.2, 4.8, "brass", (3, 4, 6), far=far)  # vambrace
        for dx, dy in ((0, 0), (1, 0), (0, 1), (-1, 0), (0, -1)):
            cel.put(hd[0] + dx, hd[1] + dy, ("ink", 4 if far else 6))

    def wing(self, cel: Cel, J: dict[str, Pt], name: str, far: bool) -> None:
        g = lambda key: J[f"{name}_{key}"]  # noqa: E731
        # Primaries, inner ones first so each lies over the one inside it: pale stone with a gold tip.
        for i in range(PRIMARIES - 1, -1, -1):
            base, tip = g(f"pb{i}"), g(f"pt{i}")
            cel.limb(base, tip, 6.2, 2.2, "ink", (4, 6, 7), far=far)
            shaft = (base[0] + (tip[0] - base[0]) * 0.55, base[1] + (tip[1] - base[1]) * 0.55)
            cel.line(shaft, tip, ("ink", 4 if far else 5))
            cel.put(tip[0], tip[1], ("brass", 5 if far else 6))
        # Coverts: a row of short gold feathers laid over their roots.
        for i in range(COVERTS - 1, -1, -1):
            base, tip = g(f"cb{i}"), g(f"ct{i}")
            cel.limb(base, tip, 4.0, 1.6, "brass", (3, 4, 6), far=far)
        cel.limb(g("root"), g("elbow"), 5.4, 4.2, "ink", (3, 5, 6), far=far)
        cel.limb(g("elbow"), g("wrist"), 4.2, 3.0, "ink", (3, 5, 6), far=far)
        for key in ("elbow", "wrist"):
            x, y = g(key)
            cel.put(x, y, ("brass", 5 if far else 6))
            cel.put(x + 1, y, ("brass", 4 if far else 5))

    def halo(self, cel: Cel, c: Pt, lit: float, glow: float) -> None:
        """A disc of gold behind the head, spoked like a sun, with rays that lengthen when the light flares."""
        dead = lit < 0.3
        for dy in range(-9, 10):
            for dx in range(-9, 10):
                r = math.hypot(dx, dy)
                if r > 8.6:
                    continue
                spoke = int((math.degrees(math.atan2(dy, dx)) + 360.0) / 22.5) % 2 == 0
                if dead:
                    tone = ("ink", 5) if r > 6.8 else ("ink", 4 if spoke else 3)
                else:
                    tone = ("brass", 6) if r > 6.8 else ("brass", 5 if spoke else 4)
                cel.put(c[0] + dx, c[1] + dy, tone)
        if not dead:
            reach = 5 if glow >= 0.9 else 3
            for i in range(8):
                a = math.tau * i / 8 + math.pi / 8
                for j in range(reach):
                    cel.put(c[0] + math.cos(a) * (9.5 + j), c[1] + math.sin(a) * (9.5 + j), ("light", 0) if glow >= 0.9 and j < 2 else ("brass", 6))

    # ------------------------------------------------------------------------------------ drawing
    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        lit, glow = pose.get("lit", 1.0), pose.get("glow", 0.8)
        blade, blaze = pose.get("blade", 1.0), pose.get("blaze", 0.0)
        Lg = {**L,
              "G": ("ink", 0) if lit < 0.3 else ("light", 0) if glow >= 0.9 else ("brass", 7) if glow >= 0.4 else ("brass", 4),
              "T": ("brass", 3) if lit < 0.3 else ("brass", 6)}
        drop = pose.get("wn_drop", 0.0)
        free = pose.get("sword_free", 0.0)
        hx, hy = J["head"]
        turn = pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0)
        ta = math.radians(turn)

        self.wing(cel, J, "wf", far=True)
        if drop < 0.99:
            self.wing(cel, J, "wn", far=False)
        self.halo(cel, (hx + 0.5 + 6.5 * math.sin(ta), hy + 2.0 - 6.5 * math.cos(ta)), lit, glow)
        self.arm(cel, J, "F", far=True)
        fx_, fy_ = J["shF"]
        cel.limb((fx_ - 2.0, fy_ - 1.5), (fx_ + 3.0, fy_ - 0.5), 7.5, 6.0, "brass", (2, 3, 5))  # far pauldron
        self.leg(cel, J, "F", far=True)
        sash = ropes["sash"]
        for i in range(len(sash) - 1):
            cel.limb(sash[i], sash[i + 1], 5.0 - i * 0.5, 4.5 - i * 0.5, "azure", (1, 2, 3))
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        tab = ropes["tabard"]
        for i in range(len(tab) - 1):
            cel.limb(tab[i], tab[i + 1], 6.4 - i * 0.3, 6.1 - i * 0.3, "azure", (1, 3, 4))
        for dx in (-2, -1, 0, 1, 2):
            cel.put(tab[-1][0] + dx, tab[-1][1] + 1, ("brass", 6 if dx % 2 == 0 else 4))
        cel.stamp_lean(TORSO, Lg, (px, py), 8, lean)
        cel.stamp_turn(HEAD, Lg, (hx, hy + 2), 5, turn)
        if free < 0.99:
            draw_sword(cel, J["grip"], pose["sword"], blade, blaze)
        self.arm(cel, J, "N", far=False)
        nx_, ny_ = J["shN"]
        cel.stamp(PAULDRON, L, nx_ - 5.0, ny_ - 4.0)
        cel.outline()

        crack = pose.get("crack", 0.0)
        if crack > 0.02:
            self.cracks(cel, (hx + 1.0, hy - 2.0), py + 10.0, crack)
        crumble = pose.get("crumble", 0.0)
        if crumble > 0.01:
            self.crumble(cel, crumble, self.build.root_x + 2.0)
        if drop >= 0.99 or free >= 0.99:
            # What does not crumble: the wing that fell, and the sword left standing in the floor.
            extra = Cel(cel.w, cel.h, cel.top)
            if drop >= 0.99:
                self.wing(extra, J, "wn", far=False)
            if free >= 0.99:
                draw_sword(extra, J["grip"], pose["sword"], blade, 0.0)
            extra.outline()
            cel.px.update(extra.px)
        if 0.0 < drop < 1.0 or 0.0 < pose.get("dust", 0.0) < 0.985:
            d = pose.get("dust", 0.0)
            gx = self.build.root_x - 30.0
            for i in range(int(4 + 10 * d)):
                cel.soft(gx - 16.0 + i * 3.4 + 2.0 * math.sin(i * 2.1), GROUND - 2.0 - (i % 3) * 1.6 - 5.0 * d, ("ink", 7 if i % 2 else 6))
        chips = pose.get("chips", 0.0)
        if 0.01 < chips < 0.985:
            for i in range(9):
                u = (chips * 1.6 + i * 0.37) % 1.0
                x = px - 9.0 + (i * 5.3) % 19.0 + 2.0 * math.sin(i * 1.9)
                y0 = hy - 4.0 + (i * 7) % 22
                y = y0 + u * u * (GROUND - 2 - y0)
                cel.soft(x, y, ("ink", 7 if i % 2 else 5))
                if i % 3 == 0:
                    cel.soft(x + 1, y, ("ink", 6))
        if crumble > 0.01:
            return self.sword_fx(cel, J, pose, blade, 0.0)

        _, _, tip = sword_points(J["grip"], pose["sword"])
        if pose.get("smear", 0.0) > 0.5 and len(between) > 2:
            before = set(cel.px)
            tips, hubs = [], []
            for Jb, pb in between:
                tips.append(sword_points(Jb["grip"], pb["sword"])[2])
                hubs.append(Jb["grip"])
            swing_smear(cel, tips, hubs)
            for xy in set(cel.px) - before:
                if xy[1] >= GROUND:
                    del cel.px[xy]
        ray = pose.get("ray", 0.0)
        if 0.01 < ray < 0.985:
            self.pillars(cel, min(strike_x(J["grip"], pose["sword"]), self.build.root_x + 23.0), ray)
        self.sword_fx(cel, J, pose, blade, blaze)

    def sword_fx(self, cel: Cel, J: dict[str, Pt], pose: Pose, blade: float, blaze: float) -> None:
        """Motes of light drifting off the blade while it burns; rays off its point when it blazes."""
        if blade < 0.75:
            return
        _, guard, tip = sword_points(J["grip"], pose["sword"])
        ph = pose.get("motes", 0.0)
        for i in range(5):
            u = (ph + i / 5) % 1.0
            t = 0.15 + 0.17 * i
            x = guard[0] + (tip[0] - guard[0]) * t + 3.5 + 2.0 * math.sin(math.tau * (u + i * 0.3))
            y = min(guard[1] + (tip[1] - guard[1]) * t, GROUND - 3) - 8.0 * u
            cel.soft(x, y, ("light", 0) if u < 0.5 else ("brass", 6))
        if blaze > 0.5 and tip[1] < GROUND - 2:
            cel.star(tip[0], tip[1], 5)
            for i in range(6):
                a = math.tau * i / 6 + ph * 3.0
                for j in range(3):
                    cel.soft(tip[0] + math.cos(a) * (7 + j), tip[1] + math.sin(a) * (7 + j), ("brass", 6))

    @staticmethod
    def cracks(cel: Cel, start: Pt, bottom: float, u: float) -> None:
        """Cracks spreading from the mask: one main fissure down through the chest and branches off it, each a dark
        line with a pale chipped edge so it shows on dark stone."""
        def cut(x: float, y: float) -> None:
            if (int(math.floor(x)), int(math.floor(y))) in cel.px:
                cel.put(x, y, ("ink", 0))
                if (int(math.floor(x + 1)), int(math.floor(y))) in cel.px:
                    cel.put(x + 1, y, ("ink", 9))

        x, y = start
        n = int((bottom - y) * min(1.0, u * 1.15))
        for i in range(n):
            x += (0.9, -0.7, 0.3, -0.9, 0.8, -0.4)[i % 6]
            cut(x, y + i)
            if i % 5 == 3 and u > 0.2:
                side = 1.0 if (i // 5) % 2 else -1.0
                for j in range(1, int(3 + 8 * min(1.0, (u - 0.2) / 0.6))):
                    cut(x + side * j, y + i + j * 0.55 + (0.5 if j % 2 else 0.0))

    @staticmethod
    def pillars(cel: Cel, ix: float, u: float) -> None:
        """Where the blade went in, the floor splits with light and three pillars of it burst up, one after another."""
        cel.star(ix, GROUND - 3, 5 if u < 0.35 else 3)
        last = PILLARS[-1][0] + 3.0
        run = last * min(1.0, u / 0.3)
        gone = max(0.0, (u - 0.7) / 0.28)
        for i in range(int(run)):
            if gone > 0 and (i + int(u * 40)) % (2 + int(gone * 4)) != 0:
                continue
            cel.put(ix + i, GROUND - 1, ("light", 0) if gone < 0.5 else ("brass", 6))
            cel.put(ix + i, GROUND - 2, ("brass", 7) if gone < 0.5 else ("brass", 5))
        for off, height, start in PILLARS:
            rise = max(0.0, min(1.0, (u - start) / 0.16))
            fade = max(0.0, min(1.0, (u - 0.58 - start * 0.6) / 0.3))
            h = height * (1 - (1 - rise) ** 2)
            if h < 2.0 or fade >= 1.0:
                continue
            x0 = ix + off
            for j in range(int(h)):
                t = j / h
                half = (4.6 - 2.2 * fade) * (1.0 - t * 0.8)  # tapering to a point
                y = GROUND - 1 - j
                for dx in range(-int(half) - 1, int(half) + 2):
                    d = abs(dx)
                    if d > half + 0.6:
                        continue
                    if fade > 0.3 and (j + dx + int(u * 50)) % 3 == 0:
                        continue
                    tone = ("light", 0) if d <= half * 0.45 else ("brass", 7) if d <= half else ("brass", 6)
                    if fade > 0.55:
                        tone = ("brass", 6) if d <= half * 0.45 else ("brass", 5)
                    cel.put(x0 + dx, y, tone)
            if rise < 1.0 or fade < 0.3:  # sparks thrown off the top
                for i in range(4):
                    a = math.radians(-140 + i * 33.0)
                    cel.soft(x0 + math.cos(a) * (3.0 + 5.0 * rise), GROUND - 1 - h + math.sin(a) * (2.0 + 4.0 * rise), ("light", 0) if i % 2 else ("brass", 6))

    @staticmethod
    def crumble(cel: Cel, u: float, mid: float) -> None:
        """The statue comes apart from the top: every pixel breaks off in small blocks, falls and lands as rubble."""
        src = sorted(cel.px.items(), key=lambda it: -it[0][1])  # lowest first, so the pile builds from the floor
        cel.px.clear()
        top = min(y for (_, y), _ in src)
        span = max(1.0, GROUND - top)
        pile: dict[int, int] = {}
        for (x, y), (ramp, idx) in src:
            noise = (((x // 3) * 73856093) ^ ((y // 3) * 19349663)) % 1000 / 1000.0
            start = 0.62 * (y - top) / span + 0.14 * noise
            t = (u - start) / 0.24
            if t <= 0.0:
                cel.px[(x, y)] = (ramp, idx)
                continue
            nx = int(round(x + (noise - 0.5) * 11.0 * min(1.0, t) + (mid - x) * 0.6 * min(1.0, t)))
            floor = GROUND - 1 - pile.get(nx, 0)
            ny = y + t * t * (GROUND - y)
            tone = ("ink", 5) if ramp == "light" else (ramp, max(0, idx - 1))
            if t >= 1.0 or ny >= floor:
                cap = 2 + int(((nx * 2654435761) % 1000) / 1000.0 * 4) + max(0, 21 - int(abs(nx - mid) / 1.6))
                if pile.get(nx, 0) < cap and 0 <= nx < cel.w:
                    cel.px[(nx, floor)] = tone
                    pile[nx] = pile.get(nx, 0) + 1
            else:
                cel.px[(nx, int(ny))] = tone


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=1.5, lean=3.0, footN=(-7.5, 0.0, 0.0), footF=(7.5, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=30.0, elbN=60.0, armF=44.0, elbF=50.0, sword=90.0, two=1.0, hold=-3.5, head_dx=0.0, head_dy=0.0, head_rot=0.0, breath=0.0,
                  wing=0.68, flap=0.0, lit=1.0, glow=0.8, blade=1.0, blaze=0.0, motes=0.0, smear=0.0, ray=0.0, crack=0.0, crumble=0.0, dust=0.0, chips=0.0,
                  wn_drop=0.0, sword_free=0.0, sword_at=PLANTED)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    # A statue on guard, hands on the pommel. It barely breathes; the wings ease open and shut behind it, the head
    # turns a little, and the light in the crack beats.
    look = max(-1.0, min(1.0, 2.2 * math.sin(math.tau * (ph - 0.1))))
    return {**BASE, "breath": 0.5 + 0.5 * s, "lean": 3.0 + 0.8 * s, "head_rot": 4.0 * look, "wing": 0.68 + 0.06 * late, "flap": 3.0 * late,
            "glow": 1.0 if math.sin(math.tau * 2 * ph) > 0.55 else 0.8, "motes": ph}


def walk_pose(ph: float) -> Pose:
    c = math.cos(math.tau * ph)
    p: Pose = gait_legs(Gait(stride=0.78, give=1.1, lift=0.7, toe=0.6), ph)
    # Slow and heavy, the sword carried upright in both hands, the wings lifted and swaying a beat behind each step.
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 5.0 + 1.2 * math.cos(2 * math.tau * (ph - 0.06)), "dy": 0.9 * (1 + math.cos(2 * math.tau * (ph - 0.1))), "hip_rot": -0.8 * c, "sh_rot": 0.6 * c,
              "armN": 26.0 + 2.0 * c, "elbN": 66.0, "sword": -78.0 + 3.0 * math.cos(math.tau * (ph - 0.12)), "hold": -3.5,
              "wing": 0.76 + 0.07 * math.cos(2 * math.tau * (ph - 0.25)), "flap": 5.0 * math.cos(2 * math.tau * (ph - 0.3)),
              "head_dy": 0.4 * math.cos(2 * math.tau * (ph - 0.2)), "motes": 2 * ph})
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Judgement: it tears the sword out of the floor and up over its head; the wings snap wide, the blade blazes and
# it hangs there; then the whole body comes down and the blade is driven into the floor close in front of it.
# Pillars of light burst up just ahead. Feet are planted (x is measured from the shifted root).
_HIT = dict(dx=3.0, drop=6.0, lean=16.0, armN=30.0, elbN=10.0, sword=70.0, hold=4.0, head_rot=10.0, footN=(-10.5, 0.0, -20.0), footF=(7.5, 0.0, 0.0),
            wing=0.8, flap=-14.0, glow=1.0)
ATTACK_KEYS = [
    (0.00, k(), "lin"),
    (0.16, k(dx=-1.0, drop=2.0, lean=0.0, armN=108.0, elbN=40.0, sword=-80.0, head_rot=-4.0, footN=(-6.5, 0.0, 0.0), footF=(8.5, 0.0, 0.0), wing=0.76, flap=4.0, glow=1.0, motes=0.3), "out"),
    (0.30, k(dx=-2.6, drop=2.4, lean=-9.0, armN=164.0, elbN=24.0, sword=-116.0, head_rot=-12.0, footN=(-4.9, 0.0, 0.0), footF=(10.1, 2.2, 10.0), wing=1.0, flap=20.0, glow=1.0,
             blaze=1.0, motes=0.6), "out3"),
    (0.46, k(dx=-3.2, drop=2.0, lean=-12.0, armN=172.0, elbN=26.0, sword=-126.0, head_rot=-15.0, footN=(-4.3, 0.0, 0.0), footF=(10.7, 3.2, 12.0), wing=1.0, flap=27.0, glow=1.0,
             blaze=1.0, motes=1.1), "io"),
    (0.52, k(dx=1.5, drop=3.4, lean=6.0, armN=110.0, elbN=14.0, sword=-30.0, hold=0.0, head_rot=2.0, footN=(-9.0, 0.0, -10.0), footF=(9.0, 0.4, 0.0), wing=0.9, flap=0.0, glow=1.0,
             blaze=1.0, smear=1.0, motes=1.2), "in"),
    (0.57, k(**_HIT, smear=1.0, ray=0.02, motes=1.3), "lin"),
    (0.76, k(**{**_HIT, "drop": 6.8, "lean": 18.0, "wing": 0.7, "flap": -8.0}, ray=0.98, motes=1.7), "lin"),
    (0.89, k(dx=1.5, drop=3.0, lean=8.0, armN=34.0, elbN=44.0, sword=80.0, hold=-2.0, head_rot=4.0, footN=(-9.0, 0.0, -8.0), footF=(6.0, 0.8, 4.0), wing=0.68, ray=1.0, motes=1.9), "io"),
    (1.00, k(ray=1.0, motes=2.0), "io"),
]

# Hit: the wings flare for balance, the sword is jarred out of the floor and out of line, the light in the crack
# gutters, and it settles back on guard.
HURT_KEYS = stagger_keys(BASE, push=3.4, bend=9.0, buckle=2.8, whip=14.0, over={
    "impact": dict(armN=34.0, elbN=58.0, sword=84.0, wing=0.8, flap=6.0, glow=1.0, motes=0.2),
    "reel": dict(armN=46.0, elbN=66.0, sword=54.0, wing=1.0, flap=18.0, glow=0.3, motes=0.5),
    "catch": dict(armN=28.0, elbN=58.0, sword=96.0, wing=0.62, flap=-10.0, glow=1.0, motes=0.9),
})

# Death. It reels and sags over the sword; the light in the mask gutters and dies; it straightens into its
# statue's pose and lets the sword stand; cracks spread from the mask through the stone; the near wing breaks off
# and falls; then it crumbles from the crown down. The sword, still burning in the rubble, goes out last.
_STONE = dict(dx=0.0, drop=1.0, lean=0.0, head_rot=-6.0, armN=8.0, elbN=12.0, armF=12.0, elbF=14.0, two=0.0, sword=90.0, sword_free=1.0, lit=0.0, glow=0.0, flap=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.06, k(dx=-2.6, drop=2.4, lean=-10.0, head_rot=-18.0, head_dx=-1.2, armN=44.0, elbN=64.0, sword=62.0, footN=(-4.9, 0.0, 0.0), footF=(10.1, 1.4, 8.0), wing=0.95, flap=16.0, glow=1.0), "out3"),
    (0.15, k(dx=-1.0, drop=4.4, lean=13.0, head_rot=20.0, armN=30.0, elbN=58.0, sword=92.0, footN=(-6.5, 0.0, 0.0), footF=(8.5, 0.0, 0.0), wing=0.08, flap=-4.0, lit=0.6, glow=0.4), "io"),
    (0.24, k(dx=-0.5, drop=5.0, lean=15.0, head_rot=24.0, armN=30.0, elbN=58.0, sword=92.0, footN=(-7.0, 0.0, 0.0), footF=(8.0, 0.0, 0.0), wing=0.04, flap=-6.0, lit=0.2, glow=0.0), "io"),
    (0.34, k(**_STONE, wing=0.7, crack=0.08, chips=0.02, motes=0.3), "io"),
    (0.39, k(**{**_STONE, "dx": 0.8, "flap": -4.0}, wing=0.72, crack=0.3, chips=0.2, motes=0.45), "lin"),
    (0.44, k(**{**_STONE, "dx": -0.8, "flap": 4.0}, wing=0.7, crack=0.55, chips=0.4, motes=0.6), "lin"),
    (0.48, k(**{**_STONE, "dx": 0.8, "flap": -5.0}, wing=0.72, crack=0.8, chips=0.6, motes=0.7), "lin"),
    (0.52, k(**{**_STONE, "dx": -0.6, "flap": 5.0}, wing=0.7, crack=1.0, chips=0.8, motes=0.8), "lin"),
    (0.63, k(**_STONE, wing=0.7, crack=1.0, wn_drop=1.0, chips=0.98, dust=0.02, motes=1.1), "lin"),
    (0.68, k(**_STONE, wing=0.7, crack=1.0, wn_drop=1.0, chips=1.0, dust=0.6, motes=1.3), "lin"),
    (0.72, k(**_STONE, wing=0.7, crack=1.0, wn_drop=1.0, chips=1.0, dust=0.98, crumble=0.02, motes=1.4), "lin"),
    (0.93, k(**_STONE, wing=0.7, crack=1.0, wn_drop=1.0, chips=1.0, dust=1.0, crumble=1.0, motes=2.0), "lin"),
    (0.965, k(**_STONE, wing=0.7, crack=1.0, wn_drop=1.0, chips=1.0, dust=1.0, crumble=1.0, blade=0.5, motes=2.1), "lin"),
    (1.00, k(**_STONE, wing=0.7, crack=1.0, wn_drop=1.0, chips=1.0, dust=1.0, crumble=1.0, blade=0.0, motes=2.2), "lin"),
]

STILL = lambda t: (-0.2 + 0.2 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [210] * 12, True, STILL),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [120] * 12, True, lambda t: (-0.5, 0.0)),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.08, 0.16, 0.23, 0.30, 0.38, 0.46, 0.52, 0.57, 0.62, 0.67, 0.72, 0.76, 0.83, 0.89, 0.95, 1.0],
                   [90, 100, 100, 70, 110, 170, 160, 40, 50, 80, 80, 90, 120, 110, 100, 90, 110], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, [int(ms * 1.2) for ms in HURT_MS], False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.03, 0.06, 0.105, 0.15, 0.24, 0.34, 0.39, 0.44, 0.48, 0.52, 0.548, 0.575, 0.603, 0.63, 0.68, 0.72, 0.746, 0.772, 0.798,
                                               0.824, 0.85, 0.876, 0.903, 0.93, 0.965, 1.0],
                  [60, 50, 100, 90, 130, 170, 150, 90, 90, 90, 130, 60, 60, 60, 110, 110, 100, 80, 80, 80, 80, 80, 80, 80, 260, 200, 1500], False, STILL),
}
