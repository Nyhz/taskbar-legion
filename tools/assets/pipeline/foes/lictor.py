"""The Lictor — world 10, stage boss. The one who walks ahead of the Unmaker and carries a piece of him.

A tall, narrow figure in floor-length white wrappings, square in the shoulders and leaning a little towards
whoever stands before it — and it has no head. Over its open collar hangs a small BLACK SUN: a disc darker than
the sky, ringed by a thin white corona that burns brighter on the side of the prey. That is its face, and how it
looks at you. Behind its shoulder, upright in the air, floats one great shard of broken mirror full of stars — a
single pane of the six the Unmaker wears — turning slowly from its edge to its face. Its hands hang to its knees,
the fingers too long; loose ends of the wrappings trail behind it, and under its hem the path loses its colour.

It does not walk: it comes on, upright, with the glass and the wrappings trailing. To strike it lifts one hand
high; the pane rises over it and tips back while the black sun swells and everything else dims; it hangs — the
hand falls, and the mirror comes down edge-first on the path like a headsman's blade: where it lands the world
splits in a seam of white light and the floor comes up in flat shards. Struck, its sun is knocked askew, the
glass jolts and cracks with light, the white flushes red. It dies in order: the pane drops out of the air and
shatters on the stones behind it; the black sun cracks and pours its light out; the body sags and unwinds
upwards as flat motes; the sun goes dark and what is left of it — a dim cracked ring — comes to rest on the last
folds of the wrappings.

Own rig. Frame 152 wide with 44 extra rows above (the Archon's), root at 66. Drawn facing right; the game mirrors
enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Pose, Pt, ik, keyed, lerp, swing_smear

FIGURE = ("Lictor", "boss", "w10")

UPPER, FORE = 13.5, 13.5
BUILD = Build(root_x=66, thigh=1.0, shin=1.0, foot=0.0, hip_dx=0.0, spine=0.0, sh_near=0.0, sh_far=0.0, upper=UPPER, fore=FORE, neck=0.0)

VOID = ("ink", 0)
NECK_H = 44.0  # height of the open collar at rest
#: Half-width of the wrapped body from the hem (0) to the collar (1).
PROFILE = [(0.0, 7.6), (0.07, 6.2), (0.22, 4.8), (0.44, 3.7), (0.6, 3.1), (0.72, 3.7), (0.83, 5.6), (0.89, 8.4), (0.93, 8.8), (0.965, 5.6), (1.0, 3.8)]
#: The pane: a shard along its axis from its foot to its point (fraction of its length, of its half-width).
SHARD = [(0.0, 0.0), (0.1, 0.6), (0.3, 1.0), (0.52, 0.72), (0.6, 0.92), (1.0, 0.04), (0.8, -0.5), (0.58, -0.62), (0.4, -1.0), (0.14, -0.7)]
PANE_LEN, PANE_W = 50.0, 6.8
SUN_R = 6.2
SUN_UP = 3.6  # the gap between the collar and the black sun
#: Where the point of the pane lands, ahead of the root.
STRIKE_X = 57.0
#: Where the pane lands when it drops out of the air.
GLASS_X = -27.0
CRACKS = [[(0.2, -0.1), (0.6, -0.5), (0.72, -0.7)], [(0.2, -0.1), (0.7, 0.1), (0.98, 0.2)], [(0.2, -0.1), (-0.2, 0.4), (-0.4, 0.92)], [(0.2, -0.1), (-0.5, -0.3), (-0.9, -0.44)]]


def _hash(x: int, y: int) -> int:
    return ((x * 73856093) ^ (y * 19349663)) & 0x7FFFFFFF


def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def _profile(u: float) -> float:
    for (u0, w0), (u1, w1) in zip(PROFILE, PROFILE[1:]):
        if u <= u1:
            return lerp(w0, w1, (u - u0) / (u1 - u0))
    return PROFILE[-1][1]


class Lictor(Character):
    build = BUILD
    W = 152
    TOP = 44

    # ------------------------------------------------------------------------------------------------- skeleton
    def joints(self, pose: Pose) -> dict:
        cx = BUILD.root_x + pose["dx"]
        lean = math.radians(pose["lean"])
        H = NECK_H * pose["tall"]
        top = H * math.cos(lean)  # how high the collar stands
        neck = (cx + H * math.sin(lean) + pose["bow"], GROUND - top)
        J: dict = {"cx": cx, "root": (cx, GROUND), "lean": (pose["lean"], 0.0), "neck": neck, "top": top}

        def spine(u: float) -> Pt:
            return (cx + H * math.sin(lean) * u + pose["bow"] * u * u, GROUND - top * u)

        shx, shy = spine(0.92)
        J["shF"], J["shN"] = (shx + 4.8, shy + 0.4), (shx - 2.2, shy + 0.8)
        bx_, by_ = spine(0.9)
        wx_, wy_ = spine(0.6)
        J["ribA"], J["ribB"] = (bx_ - 6.2, by_ + 1.0), (wx_ - 3.0, wy_)
        # Hands hang where the pose puts them, never under the path and never above what is left of the body.
        for name in "FN":
            tx, ty = pose["reach" + name]
            ty = max(2.0, ty if pose["tall"] > 0.9 else min(ty, top * 0.6))
            J["el" + name], J["hand" + name] = ik(J["sh" + name], (cx + tx, GROUND - ty), UPPER, FORE, +1)
        # The black sun over the collar.
        R = SUN_R * pose["sun"]
        sx, sy = neck[0] + pose["head"][0], neck[1] - SUN_UP - SUN_R - pose["head"][1]
        f = pose["sun_fall"]
        if f > 0.0:
            sx, sy = lerp(sx, cx + 3.0, f), lerp(sy, GROUND - SUN_R * 0.95 - 1.0, f * f)
        J["sun"], J["sun_r"] = (sx, sy), R
        # The pane: its foot (which the rest of it turns about) and its point.
        g = pose["pane_fall"]
        px, py, ang = cx + pose["pane"][0], GROUND - pose["pane"][1], pose["blade"]
        if g > 0.0:
            px, py, ang = lerp(px, cx + GLASS_X + 24.0, g), lerp(py, GROUND - 3.0, g * g), lerp(ang, -84.0, g)
        a = math.radians(ang)
        d = (math.sin(a), -math.cos(a))
        J["foot"], J["pane_d"], J["pane_n"] = (px, py), d, (math.cos(a), math.sin(a))
        J["tip"] = (px + d[0] * PANE_LEN, py + d[1] * PANE_LEN)
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def above(pts: list[Pt], J: dict) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        def ribbon(n: int) -> Chain:
            # Loose ends of the wrappings: they hang behind it and only sway.
            return Chain(n, 3.0, gravity=0.12, drag=0.3, damp=0.16, shape=[(-(3.2 * (1.0 - math.exp(-i / 1.6)) + 0.3 * i), i * 2.9) for i in range(n)], stiff=0.04)

        return {"ribA": ChainSpec(ribbon(10), lambda J: J["ribA"], above, (-0.25, 0.97)),
                "ribB": ChainSpec(ribbon(7), lambda J: J["ribB"], above, (-0.25, 0.97))}

    # ------------------------------------------------------------------------------------------------- parts
    def body(self, cel: Cel, pose: Pose, J: dict) -> None:
        cx, top = J["cx"], J["top"]
        lean = math.radians(pose["lean"])
        H = NECK_H * pose["tall"]
        un, trail = pose["unravel"], pose["trail"]
        squat = 1.0 + _clamp(0.42 - pose["tall"]) * 2.6  # what is left of it spreads on the stones
        rows = int(round(top))
        for yy in range(rows + 1):
            u = _clamp((yy + 0.5) / max(top, 1.0))
            mid = cx + H * math.sin(lean) * u + pose["bow"] * u * u - trail * (1.0 - u) ** 3
            hw = _profile(u) * 1.1 * squat
            back = hw + (3.2 * (1.0 - u / 0.22) if u < 0.22 else 0.0) + trail * 0.6 * (1.0 - u) ** 2  # a short train behind
            y = GROUND - 1 - yy
            for i in range(-int(math.ceil(back)), int(math.ceil(hw)) + 1):
                if i > hw + 0.25 or -i > back + 0.25:
                    continue
                t = i / hw if i >= 0 else i / back
                tone = 7 if t > 0.35 else 6
                if t < -0.25:
                    tone = 5
                if t < -0.6:
                    tone = 4
                if t < -0.88:
                    tone = 3
                if u > 0.5 and (yy + i) % 4 == 0:
                    tone -= 2 if t > -0.25 else 1  # the wrappings, wound round the trunk
                elif u <= 0.5 and (i - yy // 6) % 4 == 2:
                    tone -= 1  # and hanging in long folds below
                if u > 0.94:
                    tone = min(tone, 6)
                x = int(math.floor(mid)) + i
                if un > 0.0:
                    # It comes undone from the collar down, and what is loose goes up.
                    gone = un * 1.25 - (1.0 - u) * 0.75
                    if gone > 0.0 and (_hash(x, yy) % 100) < gone * 140:
                        continue
                cel.put(x, y, ("bone", max(3, tone)))

    def collar(self, cel: Cel, J: dict) -> None:
        """A high collar, flared like a broken shell, open on nothing."""
        nx, ny = J["neck"]
        x0, y = int(math.floor(nx)), int(math.floor(ny))
        for i in range(-4, 5):
            cel.put(x0 + i, y, ("bone", 7 if i > -2 else 5))
            cel.put(x0 + i, y - 1, VOID if abs(i) < 4 else ("bone", 7 if i > 0 else 5))
        for i in range(-5, 6):
            cel.put(x0 + i, y - 2, VOID if abs(i) < 4 else ("bone", 7 if i > 0 else 5))
        # Its two blades: the front one low, the back one high.
        for s_, (dx, tone) in enumerate(((5, 7), (6, 7), (6, 6))):
            cel.put(x0 + dx, y - 3 - s_, ("bone", tone))
        for s_, dx in enumerate((-5, -6, -6, -7, -7)):
            cel.put(x0 + dx, y - 3 - s_, ("bone", 6 if s_ < 3 else 5))
            if s_ < 3:
                cel.put(x0 + dx + 1, y - 3 - s_, ("bone", 4))

    def arm(self, cel: Cel, J: dict, name: str, fingers: float) -> None:
        sh, el, hd = J["sh" + name], J["el" + name], J["hand" + name]
        far = name == "F"
        if not far:  # a shadow under it, so it reads against the white of the body
            cel.limb(sh, el, 4.4, 3.6, "bone", (3, 3, 3))
            cel.limb(el, hd, 3.6, 3.2, "bone", (3, 3, 3))
        cel.limb(sh, el, 2.6, 1.9, "bone", (4, 6, 7), far=far)
        cel.limb(el, hd, 1.9, 1.5, "bone", (4, 6, 7), far=far)
        dx, dy = hd[0] - el[0], hd[1] - el[1]
        n = math.hypot(dx, dy) or 1.0
        ux, uy = dx / n, dy / n
        curl = 1.0 - _clamp(fingers)  # 0 open … hooked as it tends to 1
        for k_ in (-0.9, 0.0, 0.9):  # fingers too long for the hand
            ex = hd[0] + ux * 6.4 * (1.0 - 0.4 * curl) - uy * k_ * 2.6 * (1.0 - 0.5 * curl) + curl * 2.6
            ey = hd[1] + uy * 6.4 * (1.0 - 0.4 * curl) + ux * k_ * 2.6 * (1.0 - 0.5 * curl)
            cel.line(hd, (ex, ey), ("bone", 5 if far else 7))

    def ribbons(self, cel: Cel, ropes: dict, un: float) -> None:
        for name in ("ribA", "ribB"):
            pts = ropes[name]
            n = len(pts) - 1
            for i in range(n):
                t = i / n
                if t > 0.55 or un > 0.5:
                    for s in range(0, 4, 2):  # the ends are only threads
                        cel.put(lerp(pts[i][0], pts[i + 1][0], s / 4), lerp(pts[i][1], pts[i + 1][1], s / 4), ("bone", 3 if t > 0.85 else 4))
                else:
                    cel.limb(pts[i], pts[i + 1], lerp(2.4, 1.2, t), lerp(2.4, 1.2, (i + 1) / n), "bone", (3, 4, 5) if t < 0.4 else (2, 3, 4))

    def pane(self, cel: Cel, pose: Pose, J: dict) -> None:
        """The pane. Edge-on it is a blade; `face` turns it to show what is in it — and the stars in it stay
        where they are while it moves: it is a window."""
        if pose["pane_fall"] >= 0.999:
            return
        bx, by = J["foot"]
        d, n = J["pane_d"], J["pane_n"]
        half = PANE_W * lerp(0.5, 1.0, _clamp(pose["face"]))
        pts = [(bx + d[0] * PANE_LEN * u + n[0] * half * v, by + d[1] * PANE_LEN * u + n[1] * half * v) for u, v in SHARD]
        inside = set(cel.poly_mask(pts))
        for (x, y) in inside:
            rx_, ry_ = x + 0.5 - bx, y + 0.5 - by
            u, v = (rx_ * d[0] + ry_ * d[1]) / PANE_LEN, (rx_ * n[0] + ry_ * n[1]) / max(half, 0.5)
            edge = any(q not in inside for q in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
            h = _hash(x, y) % 19
            band = u + v * 0.06
            if edge:
                tone = ("bone", 7) if v > -0.05 else ("azure", 5)
            elif h == 0:
                tone = ("bone", 7)
            elif h == 1:
                tone = ("azure", 6)
            elif 0.3 < band < 0.36:
                tone = ("azure", 5)  # a streak of reflected light across the glass
            elif 0.36 <= band < 0.385:
                tone = ("bone", 6)
            elif 0.66 < band < 0.69:
                tone = ("azure", 3)
            else:
                tone = ("ink", 1) if v > 0 else ("ink", 2)
            cel.put(x, y, tone)
        if pose["crack"] > 0.3:
            def at(u: float, v: float) -> Pt:
                return (bx + d[0] * PANE_LEN * u + n[0] * half * v, by + d[1] * PANE_LEN * u + n[1] * half * v)

            zig = [at(0.36, 1.0), at(0.44, 0.3), at(0.38, -0.2), at(0.5, -1.0), at(0.56, 0.2), at(0.66, 0.7)]
            for p0, p1 in zip(zig, zig[1:]):
                for s_ in range(11):
                    x, y = lerp(p0[0], p1[0], s_ / 10), lerp(p0[1], p1[1], s_ / 10)
                    if (int(math.floor(x)), int(math.floor(y))) in inside:
                        cel.put(x, y, ("light", 0))

    def splinters(self, cel: Cel, pose: Pose, J: dict) -> None:
        """What the pane leaves on the stones."""
        if pose["pane_fall"] < 0.999:
            return
        x0 = J["cx"] + GLASS_X
        for i, off in enumerate((-12.0, -7.0, -2.0, 3.0, 8.0, 13.0)):
            big = i in (2, 4)
            hgt = (9 if i == 2 else 6) if big else 2 + (_hash(i, 5) % 4)
            tip_dx = ((_hash(i, 9) % 3) - 1) * (2 if big else 1)
            for s_ in range(hgt):
                w = max(1, int(round((hgt - s_) / hgt * (3.4 if big else 2.0))))
                shift = int(round(tip_dx * s_ / hgt))
                for q in range(w):
                    tone = ("bone", 7) if s_ >= hgt - 1 or (q == w - 1 and s_ % 3 == 0) else ("azure", 5) if q == w - 1 else ("ink", 2) if (s_ + q) % 4 else ("azure", 3)
                    cel.put(x0 + off + q + shift, GROUND - 1 - s_, tone)

    def sun(self, cel: Cel, pose: Pose, J: dict) -> None:
        """Its face: a hole in the light, with a corona that looks at the prey."""
        (sx, sy), R = J["sun"], J["sun_r"]
        gone, gaze, cracked = pose["sun_gone"], pose["gaze"], pose["sun_crack"]
        floor = GROUND - 1  # nothing of it shows under the path

        def put(x: float, y: float, t) -> None:
            if y < floor + 1:
                cel.put(x, y, t)

        def soft(x: float, y: float, t) -> None:
            if y < floor + 1:
                cel.soft(x, y, t)

        def tone_of(bright: bool) -> tuple[str, int]:
            if gone < 0.3:
                return ("light", 0) if bright else ("bone", 7)
            if gone < 0.75:
                return ("bone", 6) if bright else ("bone", 4)
            return ("bone", 4) if bright else ("bone", 3)

        if gone < 0.5:
            for y in range(int(sy - R) - 1, int(sy + R) + 2):
                for x in range(int(sx - R) - 1, int(sx + R) + 2):
                    if math.hypot(x + 0.5 - sx, y + 0.5 - sy) <= R:
                        put(x, y, VOID)
        gaps = [math.atan2(c[-1][1], c[-1][0]) for c in CRACKS] if (gone >= 0.5 and cracked > 0.5) else []
        steps = int(math.tau * (R + 2) * 2.2)
        for s in range(steps):
            th = math.tau * s / steps
            if any(abs(math.atan2(math.sin(th - g), math.cos(th - g))) < 0.2 for g in gaps):
                continue
            facing = max(0.0, math.cos(th - 0.45))  # towards the prey, and a little down at it
            thick = 1.0 + 2.2 * facing * gaze
            rr = R
            while rr <= R + thick:
                put(sx + math.cos(th) * rr, sy + math.sin(th) * rr, tone_of(facing * gaze > 0.25 and rr - R < thick * 0.8))
                rr += 0.5
            if gone < 0.3 and s % 2 == 0:
                soft(sx + math.cos(th) * (R + thick + 1.4), sy + math.sin(th) * (R + thick + 1.4), ("violet", 6))
        if gone < 0.6:
            for k_ in range(8):
                th = math.radians(pose["sun_rot"] + k_ * 45.0)
                reach = (5.0 if k_ % 2 == 0 else 2.6) * pose["rays"]
                for s in range(int(reach)):
                    rr = R + 3.6 + s
                    soft(sx + math.cos(th) * rr, sy + math.sin(th) * rr, tone_of(pose["rays"] > 1.3 or math.cos(th) > 0.3) if s < reach * 0.66 else ("violet", 6))
        if cracked > 0.02 and gone < 0.9:
            shown = cracked * len(CRACKS)
            for i, crack in enumerate(CRACKS):
                part = _clamp(shown - i)
                if part <= 0.0:
                    continue
                pts = [(sx + x * R, sy + y * R) for x, y in crack]
                for seg in range(len(pts) - 1):
                    frac = _clamp(part * (len(pts) - 1) - seg)
                    for s in range(int(8 * frac) + 1):
                        put(lerp(pts[seg][0], pts[seg + 1][0], s / 8), lerp(pts[seg][1], pts[seg + 1][1], s / 8), tone_of(True))
            pour = pose["pour"]
            if pour > 0.02:
                hub = (sx + CRACKS[0][0][0] * R, sy + CRACKS[0][0][1] * R)
                for i, deg in enumerate((12.0, 44.0, 80.0, 124.0, -24.0, -70.0)):
                    th = math.radians(deg)
                    reach = (8.0 + 20.0 * pour) * (1.0 if i % 2 == 0 else 0.66)
                    for s in range(3, int(reach)):
                        if s > reach * 0.7 and s % 2:
                            continue
                        soft(hub[0] + math.cos(th) * s, hub[1] + math.sin(th) * s, ("light", 0) if s < reach * 0.5 else ("bone", 6))

    @staticmethod
    def ground(cel: Cel, pose: Pose, cx: float) -> None:
        """Under its hem the path loses its colour, and flat motes of it rise."""
        for x in range(-13, 14):
            if abs(x) < 8:
                tone = ("bone", 4) if x % 2 == 0 else ("ink", 6)
            elif x % 2 == 0:
                tone = ("ink", 5)
            else:
                continue
            cel.soft(cx + x, GROUND - 1, tone)
        if pose["unravel"] > 0.7:
            return
        for i, off in enumerate((-11.0, 1.0, 10.0)):
            u = (pose["rise"] + i / 3) % 1.0
            if u > 0.8:
                continue
            y = GROUND - 3 - 15.0 * u
            for q in range(3 if i % 2 else 2):
                cel.soft(cx + off + q, y, ("bone", 5) if u < 0.45 else ("ink", 6))

    @staticmethod
    def seam(cel: Cel, cx: float, u: float) -> None:
        """Where the glass lands the world splits: a seam of white light stands up from the path, light runs
        along the ground and the floor comes up in flat shards."""
        px = cx + STRIKE_X
        if u < 0.72:
            height = 46.0 * _clamp(u / 0.1) if u < 0.5 else 46.0 * (1.0 - (u - 0.5) / 0.22) ** 0.5
            half = 0.6 if u < 0.05 else lerp(2.6, 1.0, _clamp((u - 0.12) / 0.3)) if u < 0.5 else 0.5
            for s in range(int(height)):
                y = GROUND - 1 - s
                taper = half * (1.0 - (s / max(height, 1.0)) ** 2)
                wob = 1 if (s // 5 + int(u * 30)) % 3 == 0 and half > 1.5 else 0
                for q in range(-int(taper) - 2 - wob, int(taper) + 3 + wob):
                    a = abs(q)
                    if a <= taper - 0.6:
                        cel.put(px + q, y, ("light", 0))
                    elif a <= taper + 0.6:
                        cel.put(px + q, y, ("bone", 7))
                    elif a <= taper + 1.6 and half > 1.2 and (y + q) % 2:
                        cel.soft(px + q, y, ("violet", 7))
        if u < 0.5:
            grow = _clamp(u / 0.18)
            flare = 6.0 + 17.0 * grow
            for q in range(-int(flare), int(flare) + 1):
                a = abs(q) / flare
                cel.put(px + q, GROUND - 1, ("light", 0))
                if a < 0.6:
                    cel.put(px + q, GROUND - 2, ("light", 0) if a < 0.3 else ("bone", 7))
                if a < 0.22:
                    cel.soft(px + q, GROUND - 3, ("bone", 7))
            for i in range(9):
                ang = math.radians(-170 + i * 20.0)
                r0, r1 = 7.0 + 8.0 * grow, 10.0 + 15.0 * grow
                for s_ in range(int(r0), int(r1), 2):
                    cel.soft(px + math.cos(ang) * s_ * 1.2, GROUND - 3 + math.sin(ang) * s_, ("light", 0) if s_ < (r0 + r1) / 2 else ("violet", 7))
        for i, (off, start, w) in enumerate(((-13.0, 0.06, 7), (9.0, 0.12, 8), (19.0, 0.2, 6))):
            age = u - start
            if age <= 0.0 or age > 0.66:
                continue
            hgt = age * 34.0
            x0, y = px + off - w / 2, GROUND - 4 - hgt
            faint = age > 0.5
            for q in range(w):
                yy = y + ((1, 0, -1)[i] if q > w // 2 else 0)
                if faint:
                    if q % 2 == 0:
                        cel.soft(x0 + q, yy, ("violet", 6))
                    continue
                cel.soft(x0 + q, yy, ("bone", 7) if q in (0, w - 1) else ("bone", 6))
                cel.soft(x0 + q, yy + 1, ("ink", 6))
                cel.soft(x0 + q, yy + 2, ("ink", 4))
            if not faint:
                for s_ in range(0, int(min(hgt - 2, 7)), 2):
                    cel.soft(x0 + w / 2, GROUND - 2 - s_, ("light", 0) if s_ < 3 else ("bone", 7))

    # ------------------------------------------------------------------------------------------------- drawing
    def draw(self, cel, J, pose, ropes, between) -> None:
        cx = J["cx"]
        un = pose["unravel"]
        gone = un > 0.38
        front = pose["pane_front"] > 0.5
        if not front:
            self.pane(cel, pose, J)
        if un < 0.6:
            self.ribbons(cel, ropes, un)
        if not gone:
            self.arm(cel, J, "F", pose["fingersF"])
        self.body(cel, pose, J)
        if un < 0.3:
            self.collar(cel, J)
        if not gone:
            self.arm(cel, J, "N", pose["fingersN"])
        if front:
            self.pane(cel, pose, J)
        self.splinters(cel, pose, J)
        # While the black sun flares, everything else falls into shadow.
        steps = 0 if pose["dim"] < 0.3 else 1  # one step only: two turn the white to mud
        if steps:
            for xy, (ramp, i) in list(cel.px.items()):
                if ramp != "light":
                    cel.px[xy] = (ramp, max(0, i - steps))
        # Struck: the white flushes red (a pale wash would not show on it).
        hit = pose["hit"]
        if hit > 0.2:
            for xy, (ramp, i) in list(cel.px.items()):
                if ramp == "bone" and i >= 4:
                    cel.px[xy] = ("crimson", i - 1 if hit > 0.75 else 7 if i >= 6 else 6)
        cel.outline()
        self.sun(cel, pose, J)
        self.ground(cel, pose, cx)
        if 0.01 < pose["impact"] < 0.985:
            self.seam(cel, cx, pose["impact"])
        if pose["smear"] > 0.5 and between:
            # The trail of the point only: the hub sits half-way down the glass, so the crescent stays a blade's width.
            swing_smear(cel, [Jb["tip"] for Jb, _ in between], [((Jb["tip"][0] + Jb["foot"][0]) / 2, (Jb["tip"][1] + Jb["foot"][1]) / 2) for Jb, _ in between])
        if pose["glint"] > 0.4:
            cel.star(J["tip"][0], J["tip"][1], 2)
        if 0.0 < pose["shatter"] < 1.0:
            x0 = cx + GLASS_X
            for i in range(13):
                a = math.radians(-174 + i * 14.0)
                r = (5.0 + (_hash(i, 3) % 8)) * (0.6 + 0.8 * pose["shatter"])
                cel.soft(x0 + math.cos(a) * r * 1.5, GROUND - 3 + math.sin(a) * r, ("light", 0) if i % 2 else ("bone", 7))
            if pose["shatter"] < 0.5:
                cel.star(x0, GROUND - 6, 3)
        if un > 0.05:
            # What it was, going up as flat motes of light.
            for i in range(12):
                u = _clamp(un * 1.25 - i * 0.035)
                if 0.0 < u < 1.0:
                    x = cx + ((i * 7) % 15) - 7.0 + 2.5 * math.sin(u * 6.0 + i)
                    y = GROUND - (8.0 + (i * 11) % 34 + 30.0 * u)
                    cel.soft(x, y, ("light", 0) if i % 3 == 0 else ("bone", 6))
                    if i % 2:
                        cel.soft(x + 1, y, ("bone", 6))


# --------------------------------------------------------------------------------------- animations
REST_PANE, REST_BLADE = (-12.0, 24.0), -10.0
BASE: Pose = dict(dx=0.0, tall=1.0, lean=6.0, bow=0.0, trail=0.0, reachN=(6.0, 15.0), reachF=(13.0, 25.0), fingersN=1.0, fingersF=0.8,
                  head=(0.0, 0.0), sun=1.0, gaze=0.55, rays=1.0, sun_rot=0.0, sun_crack=0.0, pour=0.0, sun_gone=0.0, sun_fall=0.0,
                  pane=REST_PANE, blade=REST_BLADE, face=0.35, pane_front=0.0, pane_fall=0.0, crack=0.0, glint=0.0, shatter=0.0,
                  dim=0.0, impact=0.0, smear=0.0, unravel=0.0, hit=0.0, rise=0.0, flash=0.0)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.15))
    later = math.sin(math.tau * (ph - 0.3))
    # It stands. Once a cycle it looks: the black sun leans out over the prey and its corona flares on that side,
    # the pane turns from its edge to its face, and the long fingers hook.
    look = _clamp(1.0 - abs(ph - 0.66) / 0.12)
    look = look * look * (3 - 2 * look)
    return {**BASE, "tall": 1.0 + 0.012 * s, "lean": 6.0 + 0.8 * late + 1.5 * look,
            "head": (0.4 * late + 2.2 * look, 0.9 * math.sin(math.tau * (ph - 0.1))), "gaze": 0.5 + 0.15 * s + 0.5 * look, "rays": 1.0 + 0.6 * look,
            "sun_rot": 45.0 * ph, "rise": ph,
            "pane": (REST_PANE[0] + 0.6 * later, REST_PANE[1] + 1.4 * math.sin(math.tau * (ph - 0.4))), "blade": REST_BLADE + 2.0 * later + 5.0 * look,
            "face": 0.3 + 0.1 * s + 0.6 * look, "glint": 1.0 if 0.62 < ph < 0.7 else 0.0,
            "reachN": (6.0 + 0.6 * late + 1.5 * look, 15.0 + 1.0 * look), "reachF": (13.0 + 0.5 * later + 2.0 * look, 25.0 + 3.0 * look),
            "fingersN": 1.0 - 0.75 * look, "fingersF": 0.8 - 0.5 * look}


def glide_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    surge = 0.5 + 0.5 * math.cos(2 * math.tau * (ph - 0.05))  # two pulses a cycle: it comes on in surges
    # It does not walk: it comes on, upright, leaning into it, with the glass and the wrappings trailing.
    return {**BASE, "dx": 1.4 * math.sin(2 * math.tau * (ph - 0.2)), "tall": 1.0 - 0.03 * surge, "lean": 10.0 + 2.5 * surge, "trail": 2.8,
            "head": (1.6 + 0.8 * surge, 0.6 * s), "gaze": 0.95, "rays": 1.2, "sun_rot": 45.0 * ph, "rise": ph,
            "pane": (REST_PANE[0] - 3.0 - 1.5 * surge, REST_PANE[1] + 2.0 + 1.2 * s), "blade": REST_BLADE - 12.0 - 4.0 * surge, "face": 0.3,
            "reachN": (6.5 - 1.2 * surge, 14.5), "reachF": (12.0 - 1.5 * surge, 24.0), "fingersN": 0.6, "fingersF": 0.5}


def k(**over: object) -> Pose:
    return {**BASE, **over}


# The mirror falls: one hand goes up, the pane rises over it and tips back while the black sun swells and all else
# dims; it hangs; the hand drops and the glass comes down edge-first on the path. The world splits there.
STRIKE_KEYS = [
    (0.00, k(), "lin"),
    (0.16, k(reachN=(14.0, 40.0), fingersN=0.6, pane=(-9.0, 30.0), blade=-15.0, face=0.5, lean=4.0, sun=1.1, gaze=0.8, sun_rot=7.0), "io"),
    (0.36, k(dx=-1.5, reachN=(13.0, 60.0), fingersN=1.0, reachF=(10.0, 26.0), pane=(-5.0, 45.0), blade=-36.0, face=1.0, pane_front=0.0, lean=-4.0, tall=1.03,
             head=(-0.5, 1.0), sun=1.35, gaze=1.0, rays=1.6, dim=0.5, sun_rot=16.0), "out"),
    (0.56, k(dx=-2.0, reachN=(12.0, 66.0), fingersN=1.0, reachF=(9.0, 27.0), pane=(-3.0, 51.0), blade=-48.0, face=1.0, pane_front=1.0, lean=-8.0, tall=1.04,
             head=(-1.0, 1.5), sun=1.5, gaze=1.0, rays=1.9, dim=1.0, sun_rot=25.0), "io"),
    (0.60, k(dx=2.0, reachN=(24.0, 25.0), fingersN=1.0, reachF=(13.0, 20.0), pane=(14.0, 23.0), blade=112.0, face=1.0, pane_front=1.0, lean=15.0, tall=0.92,
             head=(2.5, 0.0), sun=1.3, gaze=1.0, rays=1.7, dim=0.4, sun_rot=27.0, impact=0.03, smear=1.0, trail=1.5), "in3"),
    (0.66, k(dx=2.5, reachN=(24.0, 24.0), fingersN=0.9, reachF=(13.0, 20.0), pane=(14.0, 22.5), blade=113.0, face=1.0, pane_front=1.0, lean=16.0, tall=0.91,
             head=(2.5, 0.0), sun=1.2, gaze=1.0, rays=1.5, sun_rot=30.0, impact=0.24), "out"),
    (0.80, k(dx=2.0, reachN=(21.0, 25.0), fingersN=0.7, reachF=(13.0, 21.0), pane=(14.0, 23.0), blade=112.0, face=0.9, pane_front=1.0, lean=13.0, tall=0.93,
             head=(2.0, 0.0), sun=1.1, gaze=0.9, rays=1.2, sun_rot=36.0, impact=0.62), "io"),
    (0.92, k(dx=0.8, reachN=(11.0, 30.0), fingersN=0.8, pane=(2.0, 36.0), blade=34.0, face=0.6, pane_front=1.0, lean=8.0, tall=0.98, gaze=0.7, sun_rot=42.0,
             impact=0.9), "io"),
    (1.00, k(sun_rot=45.0, impact=1.0), "io"),
]

# Struck: it gives ground, its sun is knocked askew over the collar, the glass jolts and cracks with light; the
# white flushes red.
HURT_KEYS = [
    (0.00, k(), "lin"),
    (0.07, k(dx=-1.0, lean=2.0, head=(-2.5, -0.5), gaze=0.2, sun=0.94, pane=(-13.0, 24.0), blade=-17.0, face=0.6, crack=1.0, hit=1.0,
             reachN=(6.0, 20.0), reachF=(10.0, 25.0), fingersN=0.4, fingersF=0.3), "out3"),
    (0.16, k(dx=-3.0, lean=-5.0, tall=0.97, head=(-5.0, -1.0), gaze=0.1, sun=0.94, pane=(-15.0, 26.0), blade=-24.0, face=0.8, crack=1.0, hit=0.5,
             reachN=(3.0, 23.0), reachF=(8.0, 28.0), fingersN=0.2, fingersF=0.2, trail=-1.0), "lin"),
    (0.26, k(dx=-4.0, lean=-8.0, tall=0.97, head=(-4.5, -0.5), gaze=0.2, pane=(-15.0, 26.0), blade=-22.0, face=0.7, crack=0.8,
             reachN=(2.0, 24.0), reachF=(7.0, 28.0), fingersN=0.2, fingersF=0.2, trail=-1.5), "out"),
    (0.50, k(dx=-2.5, lean=10.0, tall=0.95, head=(2.0, 0.5), gaze=1.0, rays=1.5, sun=1.08, pane=(-11.0, 22.0), blade=-6.0, face=0.9, crack=0.4,
             reachN=(10.0, 17.0), reachF=(14.0, 22.0), fingersN=0.5, fingersF=0.5), "io"),
    (0.74, k(dx=-0.8, lean=8.0, tall=0.99, head=(0.8, 0.0), gaze=0.85, rays=1.15, face=0.5), "io"),
    (1.00, k(), "io"),
]

# Death, in order: the pane drops out of the air and shatters behind it; the black sun cracks and pours its light
# out; the body sags and unwinds upwards; the sun goes dark and its cracked ring comes to rest on the heap.
_NOGLASS = dict(pane_fall=1.0, crack=1.0)
_LIMP = dict(reachN=(5.0, 12.0), reachF=(9.0, 14.0), fingersN=0.5, fingersF=0.5)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.05, k(dx=-1.5, lean=1.0, head=(-2.5, -0.5), gaze=0.2, pane=(-13.0, 25.0), blade=-18.0, face=1.0, crack=1.0, hit=1.0, fingersN=0.4, fingersF=0.3), "out3"),
    (0.13, k(dx=-2.5, lean=-6.0, tall=0.98, head=(-4.0, -1.0), gaze=0.3, pane=(-14.0, 27.0), blade=-22.0, face=1.0, crack=1.0, sun_crack=0.2,
             reachN=(3.0, 24.0), reachF=(8.0, 28.0), fingersN=0.2, fingersF=0.2), "out"),
    (0.19, k(dx=-2.0, lean=-3.0, head=(-2.0, 0.0), gaze=0.3, pane=(-14.0, 28.0), blade=-20.0, face=1.0, crack=1.0, sun_crack=0.3,
             reachN=(5.0, 22.0), reachF=(9.0, 26.0), fingersN=0.3, fingersF=0.3), "io"),
    (0.31, k(**_NOGLASS, dx=-1.0, lean=3.0, gaze=0.4, sun_crack=0.4, shatter=0.05, reachN=(7.0, 19.0), reachF=(11.0, 24.0), fingersN=0.6, fingersF=0.6), "in"),
    (0.37, k(**_NOGLASS, dx=-0.5, lean=7.0, tall=0.97, head=(1.0, 0.0), gaze=0.6, sun_crack=0.6, pour=0.2, shatter=0.6), "out"),
    (0.52, k(**_NOGLASS, **_LIMP, lean=13.0, tall=0.72, head=(2.0, 0.0), gaze=1.0, sun=1.1, sun_crack=1.0, pour=0.7, rays=1.5, unravel=0.14, shatter=1.0), "io"),
    (0.66, k(**_NOGLASS, **_LIMP, lean=17.0, tall=0.54, head=(2.0, 0.5), gaze=1.0, sun=1.15, sun_crack=1.0, pour=1.0, rays=1.9, unravel=0.46, shatter=1.0), "io"),
    (0.78, k(**_NOGLASS, **_LIMP, lean=15.0, tall=0.36, head=(1.0, 0.0), gaze=0.5, sun_crack=1.0, pour=0.4, rays=0.8, sun_gone=0.55, unravel=0.8, sun_fall=0.15,
             shatter=1.0), "lin"),
    (0.88, k(**_NOGLASS, **_LIMP, lean=9.0, tall=0.22, gaze=0.3, sun_crack=1.0, rays=0.3, sun_gone=0.8, unravel=1.0, sun_fall=0.7, shatter=1.0), "in"),
    (0.94, k(**_NOGLASS, **_LIMP, lean=5.0, tall=0.15, gaze=0.2, sun_crack=1.0, rays=0.0, sun_gone=1.0, unravel=0.7, sun_fall=1.0, shatter=1.0), "out"),
    (1.00, k(**_NOGLASS, **_LIMP, lean=4.0, tall=0.14, gaze=0.1, sun_crack=1.0, rays=0.0, sun_gone=1.0, unravel=0.55, sun_fall=1.0, shatter=1.0), "io"),
]

STILL = lambda t: (-0.1 + 0.08 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [200] * 12, True, STILL),
    "run": Anim("run", glide_pose, [i / 12 for i in range(12)], [120] * 12, True, lambda t: (-0.9, 0.0)),
    "attack": Anim("attack", keyed(STRIKE_KEYS), [0.0, 0.05, 0.10, 0.16, 0.22, 0.29, 0.36, 0.43, 0.50, 0.56, 0.60, 0.66, 0.71, 0.76, 0.80, 0.86, 0.92, 1.0],
                   [50, 60, 60, 70, 70, 70, 80, 80, 90, 130, 40, 60, 70, 70, 70, 60, 60, 50], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.025, 0.05, 0.09, 0.13, 0.16, 0.19, 0.23, 0.27, 0.31, 0.34, 0.37, 0.42, 0.47, 0.52, 0.59, 0.66, 0.72, 0.78, 0.83,
                                                 0.88, 0.91, 0.94, 1.0],
                  [70, 50, 80, 80, 100, 90, 110, 70, 60, 50, 70, 100, 110, 110, 130, 140, 150, 130, 130, 120, 110, 80, 110, 600], False, STILL),
}
