"""The Unmaker — world 10, candidate for the final boss. A god-thing: serene, symmetrical and utterly wrong.

A tall, impossibly thin, faceless figure of bone-white hangs in the air with its arms a little open and its feet
pointed down, never touching the ground. Its head is a smooth egg with one feature, a vertical black seam. Its
wrappings trail away into nothing. Behind its head stands a BLACK SUN — a disc darker than the sky, ringed by a
thin white-hot corona and long rays; the corona burns brighter on the side that faces the prey: that is how it
looks at you. Around it hang six great panes of broken mirror, three to each side like a seraph's wings, each one
full of stars; they turn slowly and re-arrange. Stones and a sliver of floor orbit it; under it the ground loses
its colour and flat motes of it rise.

Attack: the panes fold, snap open into a sunburst, the black sun swells and flares while everything else dims;
it lifts one hand, lets it fall towards the prey — and a pillar of white light drops in front of it and runs
along the ground, the floor coming apart in flat shards that rise instead of falling. Death: the black sun cracks
like glass and light pours out; the panes fall one by one and shatter; the seam splits it from head to foot and
it comes apart, rising, until only the cracked ring of the corona is left, dimming, over the shards.

Own rig. Frame 200 wide with 59 extra rows above, root at 64. Drawn facing right; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Pose, Pt, keyed, lerp

FIGURE = ("Unmaker", "boss", "w10")

UPPER, FORE = 15.0, 16.0
BUILD = Build(root_x=64, thigh=1.0, shin=1.0, foot=0.0, hip_dx=0.0, spine=0.0, sh_near=0.0, sh_far=0.0, upper=UPPER, fore=FORE, neck=0.0)

VOID = ("ink", 0)
#: Half-width of the body on every row from the crown of the head (row 0) down to the points of the feet.
HALF = ([1.5, 2.6, 3.2, 3.6, 3.7, 3.7, 3.6, 3.2, 2.6, 1.9]  # head: a smooth egg
        + [1.0, 1.0, 1.3]  # neck
        + [5.2, 6.0, 5.8]  # narrow shoulders
        + [5.4, 5.0, 4.7, 4.4, 4.1, 3.8, 3.5, 3.2, 3.0]  # ribs
        + [2.8, 2.6, 2.5, 2.4, 2.4, 2.4, 2.5, 2.6, 2.8, 3.1]  # a waist no body has
        + [3.5, 3.9, 4.0, 3.9, 3.7]  # hips
        + [3.6 - 2.4 * i / 29 for i in range(30)]  # legs bound together
        + [1.1, 1.0, 0.9, 0.8, 0.7, 0.5, 0.5])  # feet pointed down
HEAD_TOP = 85.0  # height of the crown above the ground at rest: the feet end 9 px above it
SHOULDER_ROW, HIP_ROW = 14, 37
SUN_UP, SUN_R = 82.0, 21.0
WING_UP = 66.0
#: The six panes: three to the front (0, 1, 2 from the top) and their mirror images behind (3, 4, 5).
PANE_LEN = [46.0, 40.0, 44.0]
PANE_W = 5.6
#: Outline of a pane along its axis (fraction of its length, fraction of its half-width): a long shard of broken
#: mirror, straight-edged and notched, not a leaf.
PANE_SHAPE = [(0.0, 0.0), (0.14, 0.7), (0.38, 1.0), (0.60, 0.6), (0.66, 0.85), (1.0, 0.05), (0.72, -0.45), (0.44, -1.0), (0.2, -0.6)]
#: The order in which they fall when it dies.
FALL_ORDER = {1: 0, 4: 1, 0: 2, 3: 3, 2: 4, 5: 5}
#: Cracks in the black sun, in units of its radius, from where it was struck out to the rim.
HUB = (0.3, -0.12)
CRACKS = [[(0.3, -0.12), (0.62, -0.4), (0.72, -0.69)], [(0.3, -0.12), (0.7, 0.05), (0.98, 0.18)], [(0.3, -0.12), (0.18, 0.4), (0.36, 0.93)],
          [(0.3, -0.12), (-0.2, -0.3), (-0.55, -0.83)], [(0.3, -0.12), (-0.3, 0.2), (-0.92, 0.38)], [(0.3, -0.12), (0.34, -0.6), (0.12, -0.99)]]
#: The pillar of light falls this far ahead of the root; the floor comes apart along the next 84 px.
PILLAR_X = 44.0
SHARDS = [(8.0 + i * 10.0, 0.28 + i * 0.035) for i in range(8)]


def _hash(x: int, y: int) -> int:
    return ((x * 73856093) ^ (y * 19349663)) & 0x7FFFFFFF


def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


class Unmaker(Character):
    build = BUILD
    W = 200
    TOP = 59

    # ------------------------------------------------------------------------------------------------- skeleton
    def joints(self, pose: Pose) -> dict:
        cx = BUILD.root_x + pose["dx"]
        rise = pose["unravel"] ** 2 * 30.0  # what is left of it lifts as it comes apart
        lift = pose["dy"] + rise

        def P(x: float, up: float) -> Pt:
            return (cx + x, GROUND - (up + lift))

        J: dict = {"P": P, "root": (cx, GROUND), "lean": (0.0, 0.0), "hipF": P(3.0, HEAD_TOP - HIP_ROW - 2), "hipB": P(-3.0, HEAD_TOP - HIP_ROW - 2),
                   "feet": P(0.0, HEAD_TOP - len(HALF) + 2)}
        for name, side in (("F", 1.0), ("B", -1.0)):
            a, b = (math.radians(v) for v in pose["arm" + name])
            sh = P(side * 5.5, HEAD_TOP - SHOULDER_ROW)
            el = (sh[0] + side * UPPER * math.sin(a), sh[1] + UPPER * math.cos(a))
            hd = (el[0] + side * FORE * math.sin(b), el[1] + FORE * math.cos(b))
            J["sh" + name], J["el" + name], J["wrist" + name] = sh, el, hd
        J["sun"] = (cx, GROUND - (SUN_UP + pose["dy"] - pose["ring_sink"]))
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def above(pts: list[Pt], J: dict) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.0))

        def long(side: float) -> Chain:
            # They hang out and away from it like the ribs of a bell, and only sway.
            return Chain(9, 3.0, gravity=0.03, drag=0.22, damp=0.1, shape=[(side * (i * 1.9 + i * i * 0.12), i * 2.5) for i in range(9)], stiff=0.03)

        short = lambda: Chain(6, 2.6, gravity=0.03, drag=0.22, damp=0.1)  # noqa: E731
        return {
            "hipF": ChainSpec(long(1.0), lambda J: J["hipF"], above, (0.5, 0.86)),
            "hipB": ChainSpec(long(-1.0), lambda J: J["hipB"], above, (-0.5, 0.86)),
            "feet": ChainSpec(Chain(4, 2.4, gravity=0.02, drag=0.2, damp=0.1), lambda J: J["feet"], above, (-0.3, 0.95)),
            "wristF": ChainSpec(short(), lambda J: J["wristF"], above, (0.2, 0.98)),
            "wristB": ChainSpec(short(), lambda J: J["wristB"], above, (-0.2, 0.98)),
        }

    # ------------------------------------------------------------------------------------------------- panes
    def pane(self, pose: Pose, J: dict, j: int) -> tuple[list[Pt], Pt, Pt, Pt, float, float]:
        """Polygon of pane j, its inner tip, its axis, its normal, its length and how far through its fall it is
        (≥ 1: shattered)."""
        k_, side = j % 3, (1.0 if j < 3 else -1.0)
        ang = pose["fan"][k_] + (9.0 * pose["jolt"] if j == 1 else 0.0)
        dist = pose["spread"] + (0.0, 1.0, -1.0)[k_] + (3.0 * pose["jolt"] if j == 1 else 0.0)
        th = math.radians(side * ang + pose["spin"])
        d = (math.sin(th), -math.cos(th))
        length = PANE_LEN[k_]
        cx, cy = J["P"](0.0, WING_UP)
        mid = (cx + d[0] * (dist + length / 2), cy + d[1] * (dist + length / 2))
        raw = (pose["fall"] - FALL_ORDER[j] * 0.13) / 0.3
        t = _clamp(raw)
        if t > 0.0:
            # It lets go: drops, tumbling flat, to the ground.
            th = th + side * math.radians(70.0 * t) * (1.0 if abs(math.sin(th)) > 0.2 else 0.6)
            d = (math.sin(th), -math.cos(th))
            mid = (mid[0] + side * 5.0 * t, lerp(mid[1], GROUND - 4.0, t * t))
        n = (-d[1] * side, d[0] * side)  # the outer side: mirrored for the panes behind
        inner = (mid[0] - d[0] * length / 2, mid[1] - d[1] * length / 2)
        pts = [(inner[0] + d[0] * length * u + n[0] * PANE_W * v, inner[1] + d[1] * length * u + n[1] * PANE_W * v) for u, v in PANE_SHAPE]
        return pts, inner, d, n, length, raw

    def draw_pane(self, cel: Cel, pose: Pose, J: dict, j: int) -> None:
        pts, inner, d, n, length, raw = self.pane(pose, J, j)
        if raw >= 0.999:
            return
        inside = set(cel.poly_mask(pts))
        for (x, y) in inside:
            rx_, ry_ = x + 0.5 - inner[0], y + 0.5 - inner[1]
            u, v = (rx_ * d[0] + ry_ * d[1]) / length, (rx_ * n[0] + ry_ * n[1]) / PANE_W
            edge = any(q not in inside for q in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
            h = _hash(x, y) % 19
            band = u + v * 0.07
            if edge:
                tone = ("bone", 7) if v > 0 else ("azure", 5)
            elif h == 0:
                tone = ("bone", 7)  # the stars in it stay where they are while the pane moves: it is a window
            elif h == 1:
                tone = ("azure", 6)
            elif 0.30 < band < 0.36:
                tone = ("azure", 5)  # a streak of reflected light across the glass
            elif 0.36 <= band < 0.385:
                tone = ("bone", 6)
            elif 0.64 < band < 0.67:
                tone = ("azure", 3)
            else:
                tone = ("ink", 1) if v > 0 else ("ink", 2)
            cel.put(x, y, tone)
        if j == 1 and pose["crack"] > 0.3:
            # A crack across it, lit from behind.
            def at(u: float, v: float) -> Pt:
                return (inner[0] + d[0] * length * u + n[0] * PANE_W * v, inner[1] + d[1] * length * u + n[1] * PANE_W * v)

            zig = [at(0.40, 1.0), at(0.47, 0.3), at(0.42, -0.2), at(0.5, -1.0)]
            for p0, p1 in zip(zig, zig[1:]):
                for s_ in range(9):
                    x, y = lerp(p0[0], p1[0], s_ / 8), lerp(p0[1], p1[1], s_ / 8)
                    if (int(math.floor(x)), int(math.floor(y))) in inside:
                        cel.put(x, y, ("light", 0))

    def shards_of(self, cel: Cel, pose: Pose, J: dict, j: int) -> None:
        """What a pane leaves on the ground — a spray of standing splinters and one big piece — and the flash as
        it breaks."""
        now = self.pane(pose, J, j)[5]
        if now < 0.999:
            return
        pts = self.pane({**pose, "fall": FALL_ORDER[j] * 0.13 + 0.3}, J, j)[0]
        x0 = sum(p[0] for p in pts) / len(pts)
        for i, off in enumerate((-13.0, -7.0, -1.0, 5.0, 11.0)):
            big = i == 2
            hgt = (10 + _hash(j, 7) % 4) if big else 3 + (_hash(j, i) % 5)
            lean = ((_hash(i, j) % 3) - 1) * (2 if big else 1)
            for s_ in range(hgt):
                w = max(1, int(round((hgt - s_) / hgt * (4 if big else 2.4))))
                shift = int(round(lean * s_ / hgt))
                for q in range(w):
                    tip = s_ >= hgt - 1
                    tone = ("bone", 7) if tip or q == w - 1 and s_ % 3 == 0 else ("azure", 5) if q == w - 1 else ("ink", 2) if (s_ + q) % 4 else ("azure", 3)
                    cel.put(x0 + off + q + shift, GROUND - 1 - s_, tone)
        if now < 1.35:
            for i in range(12):
                a = math.radians(-172 + i * 15.0)
                r = 6.0 + (_hash(i, j) % 9)
                cel.soft(x0 + math.cos(a) * r * 1.4, GROUND - 4 + math.sin(a) * r, ("light", 0) if i % 2 else ("bone", 7))
            cel.star(x0, GROUND - 6, 3)

    # ------------------------------------------------------------------------------------------------- drawing
    def draw(self, cel, J, pose, ropes, between) -> None:
        P = J["P"]
        cx = J["root"][0]
        un = pose["unravel"]
        # Orbiting debris, far half first.
        self.debris(cel, pose, J, far=True)
        for j in (3, 4, 5, 0, 1, 2):
            self.draw_pane(cel, pose, J, j)
        if un < 0.6:
            self.strips(cel, ropes, un)
        self.body(cel, pose, J)
        if un < 0.4:
            self.arm(cel, J, "B", -1.0)
            self.arm(cel, J, "F", 1.0)
        self.debris(cel, pose, J, far=False)
        for j in range(6):
            self.shards_of(cel, pose, J, j)
        # While the black sun flares, everything else falls into shadow.
        steps = 0 if pose["dim"] < 0.3 else 1 if pose["dim"] < 0.8 else 2
        if steps:
            for xy, (ramp, i) in list(cel.px.items()):
                if ramp != "light":
                    cel.px[xy] = (ramp, max(0, i - steps))
        cel.outline()
        self.sun(cel, pose, J)
        self.ground(cel, pose, cx)
        if 0.01 < pose["pillar"] < 0.985:
            self.pillar(cel, cx, pose["pillar"])
        if pose["seam"] > 0.3 and un < 0.5:
            # Light leaking from the opened seam.
            hx, hy = P(0.0, HEAD_TOP - 5)
            for i in range(int(2 + pose["seam"] * 4)):
                cel.soft(hx + 5 + i * 1.6, hy - 1 + (i % 3) - 1, ("light", 0) if i < 2 else ("bone", 6))
                cel.soft(hx - 5 - i * 1.6, hy + (i % 2), ("bone", 6))
        if un > 0.05:
            # What it was, going up as light.
            for i in range(14):
                u = _clamp(un * 1.3 - i * 0.03)
                if 0.0 < u < 1.0:
                    x, y = P(((i * 7) % 13) - 6.0 + 3.0 * math.sin(u * 6.0 + i), 20.0 + (i * 11) % 60 + 26.0 * u)
                    cel.soft(x, y, ("light", 0) if i % 3 == 0 else ("bone", 6))

    def strips(self, cel: Cel, ropes: dict, un: float) -> None:
        for name in ("hipB", "hipF", "feet", "wristB", "wristF"):
            if un > 0.25 and name.startswith("wrist"):
                continue
            pts = ropes[name]
            n = len(pts) - 1
            for i in range(n):
                t = i / n
                if t > 0.72 or un > 0.5:
                    # The ends are only a few threads: they go out into nothing.
                    for s in range(0, 4, 2):
                        cel.put(lerp(pts[i][0], pts[i + 1][0], s / 4), lerp(pts[i][1], pts[i + 1][1], s / 4), ("bone", 3 if t > 0.85 else 4))
                else:
                    cel.limb(pts[i], pts[i + 1], lerp(2.2, 1.0, t), lerp(2.2, 1.0, (i + 1) / n), "bone", (3, 5, 6) if t < 0.4 else (2, 4, 5))

    def body(self, cel: Cel, pose: Pose, J: dict) -> None:
        cx, top = J["P"](0.0, HEAD_TOP)
        cx, top = int(round(cx)), int(round(top))
        seam, split, un = pose["seam"], pose["split"], pose["unravel"]
        split_rows = split * len(HALF)
        apart = int(round(1 + 6 * un)) if un > 0.0 else 0
        for r, hw in enumerate(HALF):
            head = r < 10
            for i in range(-int(math.ceil(hw)), int(math.ceil(hw)) + 1):
                if abs(i) > hw + 0.25:
                    continue
                t = i / max(hw, 1.0)
                # Lit from the corona behind it: bright edges, a soft front, the back side a tone down.
                tone = 7 if abs(t) > 0.6 else 6
                if i < 0:
                    tone -= 1
                if r > 40:
                    tone -= 1 if abs(t) > 0.6 else 0
                if not head and (r + abs(i)) % 4 == 0:
                    tone -= 1  # the wrappings, in chevrons
                px = ("bone", max(3, tone))
                if i == 0:
                    if head and 1 <= r <= 9:
                        px = ("light", 0) if seam > 0.3 and 2 <= r <= 8 else VOID
                    if r < split_rows and r >= 1:
                        px = ("light", 0)
                elif abs(i) == 1 and head and seam > 0.7 and 3 <= r <= 7:
                    px = VOID
                x, y = cx + i, top + r
                if un > 0.0:
                    if i == 0 or (_hash(i, r) % 100) < un * 105:
                        continue
                    x += (1 if i > 0 else -1) * apart
                    y -= int(round(un * un * ((r * 5) % 9)))
                cel.put(x, y, px)

    def arm(self, cel: Cel, J: dict, name: str, side: float) -> None:
        sh, el, hd = J["sh" + name], J["el" + name], J["wrist" + name]
        cel.limb(sh, el, 2.4, 1.8, "bone", (4, 6, 7), far=side < 0)
        cel.limb(el, hd, 1.8, 1.4, "bone", (4, 6, 7), far=side < 0)
        dx, dy = hd[0] - el[0], hd[1] - el[1]
        d = math.hypot(dx, dy) or 1.0
        ux, uy = dx / d, dy / d
        for k_ in (-0.7, 0.0, 0.7):  # long fingers
            cel.line(hd, (hd[0] + ux * 5.8 - uy * k_ * 2.6, hd[1] + uy * 5.8 + ux * k_ * 2.6), ("bone", 6 if side > 0 else 5))

    def debris(self, cel: Cel, pose: Pose, J: dict, far: bool) -> None:
        ox, oy = J["P"](0.0, 50.0)
        drop = _clamp((pose["fall"] - 0.45) / 0.3) ** 2
        for i in range(6):
            phi = math.tau * (pose["orbit"] + i / 6)
            behind = math.sin(phi) < 0
            if behind != far:
                continue
            x, y = ox + 47.0 * math.cos(phi), oy + 12.0 * math.sin(phi) + (3.0 if i % 2 else -4.0)
            y = lerp(y, GROUND - 2.0, drop)
            body, top = (("ink", 3), ("violet", 5)) if behind else (("ink", 5), ("bone", 5))
            if i % 2:  # a sliver of floor, still flat
                for q in range(-4, 5):
                    cel.put(x + q, y, top)
                    if abs(q) < 4:
                        cel.put(x + q, y + 1, body)
                cel.put(x - 1, y + 2, body)
            else:  # a stone
                for q, (lo, hi) in enumerate(((1, 2), (0, 3), (0, 3), (1, 3))):
                    for s in range(lo, hi + 1):
                        cel.put(x + q - 2, y + s - 2, top if s == lo else body)

    def sun(self, cel: Cel, pose: Pose, J: dict) -> None:
        sx, sy = J["sun"]
        R = SUN_R * pose["sun"]
        gone, dimmed, gaze, cracked = pose["sun_gone"], pose["ring_dim"], pose["gaze"], pose["sun_crack"]

        def tone_of(bright: bool) -> tuple[str, int]:
            if dimmed < 0.25:
                return ("light", 0) if bright else ("bone", 7)
            if dimmed < 0.6:
                return ("bone", 6) if bright else ("bone", 4)
            return ("bone", 4) if bright or dimmed < 0.9 else ("bone", 3)

        def over_void(x: float, y: float, t) -> None:
            k_ = (int(math.floor(x)), int(math.floor(y)))
            if cel.px.get(k_) in (None, VOID):
                cel.put(x, y, t)

        # The disc: darker than the sky, and with no stars in it.
        if gone < 0.5:
            for y in range(int(sy - R) - 1, int(sy + R) + 2):
                for x in range(int(sx - R) - 1, int(sx + R) + 2):
                    if math.hypot(x + 0.5 - sx, y + 0.5 - sy) <= R and (gone <= 0.0 or (_hash(x, y) % 100) > gone * 200):
                        cel.soft(x, y, VOID)
        # The corona: thin, and thicker and whiter on the side that faces the prey.
        gaps = [math.atan2(c[-1][1], c[-1][0]) for c in CRACKS] if (gone >= 0.5 and cracked > 0.5) else []
        steps = int(math.tau * (R + 2) * 1.8)
        for s in range(steps):
            th = math.tau * s / steps
            if any(abs(math.atan2(math.sin(th - g), math.cos(th - g))) < 0.11 for g in gaps):
                continue
            facing = max(0.0, math.cos(th))
            thick = 1.6 + 2.6 * facing * gaze
            rr = R
            while rr <= R + thick:
                cel.soft(sx + math.cos(th) * rr, sy + math.sin(th) * rr, tone_of(facing * gaze > 0.22 and rr - R < thick * 0.75))
                rr += 0.5
            # A faint halo beyond the corona, so the disc is a hole in light even against a black sky.
            if gone < 0.5 and dimmed < 0.25:
                cel.soft(sx + math.cos(th) * (R + thick + 1.6), sy + math.sin(th) * (R + thick + 1.6), ("violet", 6))
                if s % 3 == 0:
                    cel.soft(sx + math.cos(th) * (R + thick + 3.4), sy + math.sin(th) * (R + thick + 3.4), ("violet", 5))
        # Rays.
        if dimmed < 0.6:
            for k_ in range(12):
                th = math.radians(pose["sun_rot"] + k_ * 30.0)
                reach = (16.0 if k_ % 2 == 0 else 8.0) * pose["rays"]
                front = math.cos(th) > 0.3
                for s in range(int(reach)):
                    if s > reach * 0.66 and s % 2:
                        continue
                    rr = R + 4.0 + s
                    cel.soft(sx + math.cos(th) * rr, sy + math.sin(th) * rr, tone_of(pose["rays"] > 1.4 or (front and gaze > 0.45)) if s < reach * 0.66 else ("violet", 6))
        # Cracks, and the light that pours out of them.
        if cracked > 0.02 and gone < 0.9:
            shown = cracked * len(CRACKS)
            hub = (sx + HUB[0] * R, sy + HUB[1] * R)
            for i, crack in enumerate(CRACKS):
                part = _clamp(shown - i)
                if part <= 0.0:
                    continue
                pts = [(sx + x * R, sy + y * R) for x, y in crack]
                total = len(pts) - 1
                for seg in range(total):
                    frac = _clamp(part * total - seg)
                    n = int(12 * frac)
                    for s in range(n + 1):
                        over_void(lerp(pts[seg][0], pts[seg + 1][0], s / 12), lerp(pts[seg][1], pts[seg + 1][1], s / 12), tone_of(True))
            pour = pose["pour"]
            if pour > 0.02:
                for i, deg in enumerate((18.0, 42.0, 66.0, 96.0, 128.0, -8.0)):
                    th = math.radians(deg)
                    reach = (16.0 + 34.0 * pour) * (1.0 if i % 2 == 0 else 0.7)
                    for s in range(2, int(reach)):
                        if s > reach * 0.7 and s % 2:
                            continue
                        over_void(hub[0] + math.cos(th) * s, hub[1] + math.sin(th) * s, ("light", 0) if s < reach * 0.5 else ("bone", 6))
        if gone >= 0.5 and dimmed < 0.95:
            cel.soft(sx, sy, tone_of(False))  # a last mote where its centre was

    @staticmethod
    def ground(cel: Cel, pose: Pose, cx: float) -> None:
        """Under it the ground loses its colour, and flat motes of it rise."""
        for x in range(-25, 26):
            if abs(x) < 15:
                tone = ("bone", 4) if x % 2 == 0 else ("ink", 6)
            elif x % 2 == 0:
                tone = ("ink", 5)
            else:
                continue
            cel.soft(cx + x, GROUND - 1, tone)
            if abs(x) < 9 and x % 3 == 0:
                cel.soft(cx + x, GROUND - 2, ("bone", 3))
        if pose["unravel"] > 0.6:
            return
        for i, off in enumerate((-18.0, -9.0, 3.0, 12.0, 20.0)):
            u = (pose["rise"] + i / 5) % 1.0
            if u > 0.85:
                continue
            y = GROUND - 3 - 24.0 * u
            tone = ("bone", 5) if u < 0.4 else ("ink", 6)
            for q in range(3 if i % 2 else 2):
                cel.soft(cx + off + q, y, tone)

    @staticmethod
    def pillar(cel: Cel, cx: float, u: float) -> None:
        """A pillar of white light falls, then runs along the ground; the floor comes apart and rises."""
        px = cx + PILLAR_X
        top = -cel.top
        if u < 0.12:  # it comes down as a thread
            end = lerp(top, GROUND, u / 0.12)
            for y in range(top, int(end)):
                for q in (-1, 0, 1):
                    cel.soft(px + q, y, ("light", 0) if q == 0 else ("bone", 7))
        elif u < 0.62:
            half = lerp(3.0, 8.0, _clamp((u - 0.12) / 0.06)) if u < 0.4 else lerp(8.0, 0.6, (u - 0.4) / 0.22)
            for y in range(top, int(GROUND)):
                # It is not a bar: it breathes along its length and is ragged at the edges.
                wob = half + (1.0 if (y // 7 + int(u * 40)) % 3 == 0 else 0.0) * (half > 3)
                for q in range(-int(wob) - 4, int(wob) + 5):
                    a = abs(q)
                    if a <= wob - 2.0:
                        cel.soft(px + q, y, ("light", 0))
                    elif a <= wob:
                        cel.soft(px + q, y, ("bone", 7))
                    elif a <= wob + 1 and half > 3:
                        cel.soft(px + q, y, ("violet", 7) if (y + q) % 2 else ("bone", 6))
                    elif a <= wob + 3.5 and half > 5 and (y * 3 + q * 5) % 7 == 0:
                        cel.soft(px + q, y, ("violet", 6))
            if u < 0.5:  # where it lands: a flare along the floor and a crown of sparks
                grow = _clamp((u - 0.12) / 0.2)
                flare = 8.0 + 26.0 * grow
                for q in range(-int(flare), int(flare) + 1):
                    a = abs(q) / flare
                    cel.soft(px + q, GROUND - 1, ("light", 0))
                    if a < 0.7:
                        cel.soft(px + q, GROUND - 2, ("light", 0) if a < 0.4 else ("bone", 7))
                    if a < 0.4:
                        cel.soft(px + q, GROUND - 3, ("bone", 7))
                    if a < 0.2:
                        cel.soft(px + q, GROUND - 4, ("bone", 7))
                for i in range(10):
                    ang = math.radians(-168 + i * 17.3)
                    r0, r1 = 10.0 + 10.0 * grow, 15.0 + 20.0 * grow
                    for s_ in range(int(r0), int(r1), 2):
                        cel.soft(px + math.cos(ang) * s_ * 1.25, GROUND - 3 + math.sin(ang) * s_, ("light", 0) if s_ < (r0 + r1) / 2 else ("violet", 7))
        # The line of light running away along the ground.
        run = _clamp((u - 0.22) / 0.6)
        if run > 0.0:
            head = 84.0 * run
            for q in range(0, int(head)):
                behind = head - q
                tone = ("light", 0) if behind < 14 else ("bone", 7) if behind < 34 else ("violet", 7)
                if behind > 34 and q % 2:
                    continue
                cel.soft(px + q, GROUND - 1, tone)
                if behind < 22:
                    cel.soft(px + q, GROUND - 2, ("light", 0) if behind < 9 else ("bone", 7))
                if behind < 5:
                    cel.soft(px + q, GROUND - 3, ("light", 0))
        # The floor behind the line: flat slabs that go up instead of down, light showing where they were.
        for i, (off, start) in enumerate(SHARDS):
            age = u - start
            if age <= 0.0 or age > 0.7:
                continue
            hgt = age * 48.0
            w = (11, 8, 9)[i % 3]
            x0, y = px + off - w / 2, GROUND - 4 - hgt
            faint = age > 0.55
            tilt = (1, 0, -1)[i % 3]
            for q in range(w):
                yy = y + (tilt if q > w // 2 else 0)
                if faint:
                    if q % 2 == 0:
                        cel.soft(x0 + q, yy, ("violet", 6))
                        cel.soft(x0 + q, yy + 1, ("violet", 5))
                    continue
                cel.soft(x0 + q, yy, ("bone", 7) if q in (0, w - 1) else ("bone", 6))
                cel.soft(x0 + q, yy + 1, ("ink", 6))
                cel.soft(x0 + q, yy + 2, ("ink", 4))
                if 0 < q < w - 1:
                    cel.soft(x0 + q, yy + 3, ("violet", 5))
            if not faint:
                # Light comes up through the hole it left, and dust drops from it as it lifts.
                for s_ in range(0, int(min(hgt - 2, 9)), 2):
                    cel.soft(x0 + w / 2, GROUND - 2 - s_, ("light", 0) if s_ < 4 else ("bone", 7))
                    cel.soft(x0 + w / 2 - 2, GROUND - 2 - s_, ("bone", 7))
                cel.soft(x0 + 1, y + 6 + (i % 3), ("violet", 6))
                cel.soft(x0 + w - 2, y + 8 + (i % 2), ("violet", 5))


# --------------------------------------------------------------------------------------- animations
REST, OPEN = (28.0, 84.0, 152.0), (42.0, 90.0, 138.0)
BASE: Pose = dict(dx=0.0, dy=0.0, fan=REST, spread=12.0, spin=0.0, jolt=0.0, crack=0.0, armF=(18.0, 8.0), armB=(18.0, 8.0),
                  seam=0.0, split=0.0, unravel=0.0, sun=1.0, gaze=0.55, rays=1.0, sun_rot=0.0, sun_crack=0.0, pour=0.0, sun_gone=0.0,
                  ring_dim=0.0, ring_sink=0.0, dim=0.0, orbit=0.0, rise=0.0, pillar=0.0, fall=0.0, flash=0.0)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.15))
    later = math.sin(math.tau * (ph - 0.3))
    # Almost nothing moves, and nothing ever stops: it hangs, the panes breathe, the rays turn, the debris circles.
    return {**BASE, "dy": 1.2 * s, "fan": (REST[0] + 2.5 * late, REST[1] + 1.5 * late, REST[2] - 2.5 * late), "spread": 12.0 + 1.0 * later,
            "armF": (18.0 + 2.0 * late, 8.0 + 2.0 * later), "armB": (18.0 + 2.0 * late, 8.0 + 2.0 * later), "gaze": 0.6 + 0.15 * s,
            "sun_rot": 30.0 * ph, "orbit": ph / 3, "rise": ph, "seam": 0.5 if 0.62 < ph < 0.73 else 0.0}


def glide_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    # It does not walk: it comes on, upright, with the panes and the wrappings trailing.
    return {**BASE, "dy": 0.8 * math.sin(2 * math.tau * ph), "spin": -10.0 + 1.5 * s, "spread": 13.0, "armF": (10.0, 2.0), "armB": (18.0, 10.0),
            "gaze": 0.85, "rays": 1.15, "sun_rot": 30.0 * ph, "orbit": ph / 3, "rise": ph}


def k(**over: object) -> Pose:
    return {**BASE, **over}


# The unmaking: the panes fold, snap open; the black sun swells while all else dims; one hand rises, falls — and
# the pillar comes down.
_FLARE = dict(fan=OPEN, spread=18.0, sun=1.4, gaze=1.0, rays=1.8, dim=1.0, dy=3.0, seam=1.0)
UNMAKE_KEYS = [
    (0.00, k(), "lin"),
    (0.14, k(fan=(60.0, 104.0, 162.0), spread=8.5, sun=0.92, gaze=0.3, dy=-1.0, sun_rot=4.0, orbit=0.02), "io"),
    (0.24, k(fan=OPEN, spread=17.0, sun=1.1, gaze=0.9, rays=1.3, dy=2.0, dim=0.2, sun_rot=7.0, orbit=0.03), "out3"),
    (0.50, k(**_FLARE, sun_rot=15.0, orbit=0.05), "io"),
    (0.58, k(**_FLARE, armF=(165.0, 176.0), sun_rot=17.0, orbit=0.055), "out"),
    (0.64, k(**_FLARE, armF=(95.0, 92.0), pillar=0.02, sun_rot=19.0, orbit=0.06), "in"),
    (0.94, k(fan=OPEN, spread=17.0, sun=1.25, gaze=1.0, rays=1.5, dim=0.6, dy=2.0, armF=(95.0, 92.0), pillar=0.98, sun_rot=28.0, orbit=0.09), "lin"),
    (1.00, k(pillar=1.0, sun_rot=30.0, orbit=1 / 3 * 0.3), "io"),
]

# Hit: it barely moves. The seam opens and light leaks; one pane cracks and is knocked out of line; then the
# black sun flares back at whoever struck it.
HURT_KEYS = [
    (0.00, k(flash=0.0), "lin"),
    (0.07, k(dx=-1.0, dy=0.6, seam=1.0, jolt=1.0, crack=1.0, gaze=0.2, sun=0.96, flash=1.0), "out3"),
    (0.16, k(dx=-2.0, dy=1.0, seam=1.0, jolt=0.8, crack=1.0, gaze=0.1, sun=0.96, armF=(22.0, 14.0), armB=(22.0, 14.0), flash=0.5), "lin"),
    (0.26, k(dx=-2.0, dy=0.6, seam=0.8, jolt=0.5, crack=1.0, gaze=0.3, armF=(20.0, 12.0), armB=(20.0, 12.0), flash=0.0), "out"),
    (0.50, k(dx=-1.0, seam=0.4, jolt=0.15, crack=0.8, gaze=1.0, rays=1.4, sun=1.08, flash=0.0), "io"),
    (0.74, k(dx=-0.3, seam=0.0, crack=0.4, gaze=0.85, rays=1.15, flash=0.0), "io"),
    (1.00, k(flash=0.0), "io"),
]

# Death, in stages: the black sun cracks and pours light; the panes fall one by one; the seam splits it; it comes
# apart and goes up; the ring is all that is left.
_BROKEN = dict(seam=1.0, crack=1.0, sun_crack=1.0)
_AFTER = dict(**_BROKEN, fall=1.0, split=1.0, armF=(60.0, 40.0), armB=(60.0, 40.0), fan=(34.0, 88.0, 146.0), spread=15.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.05, k(dx=-1.5, seam=1.0, jolt=1.0, crack=1.0, sun_crack=0.25, gaze=0.2), "out3"),
    (0.14, k(dx=-2.0, seam=1.0, crack=1.0, sun_crack=0.6, pour=0.25, gaze=1.0, rays=1.6, fan=(34.0, 88.0, 146.0), spread=14.0), "io"),
    (0.26, k(**_BROKEN, pour=1.0, rays=2.0, gaze=1.0, fan=(34.0, 88.0, 146.0), spread=15.0, dy=-1.0), "io"),
    (0.30, k(**_BROKEN, pour=1.0, rays=1.8, gaze=1.0, fan=(34.0, 88.0, 146.0), spread=15.0, dy=-1.0, fall=0.0), "lin"),
    (0.62, k(**_BROKEN, pour=0.8, rays=1.3, gaze=0.8, fan=(34.0, 88.0, 146.0), spread=15.0, dy=-2.0, fall=1.0, split=0.3, armF=(30.0, 20.0), armB=(30.0, 20.0)), "lin"),
    (0.70, k(**_AFTER, pour=0.6, rays=1.0, gaze=0.6, dy=-2.0), "io"),
    (0.86, k(**_AFTER, pour=0.3, rays=0.6, gaze=0.4, dy=-2.0, unravel=1.0, sun_gone=0.6, ring_dim=0.3), "lin"),
    (0.94, k(**_AFTER, gaze=0.2, rays=0.3, dy=-2.0, unravel=1.0, sun_gone=1.0, ring_dim=0.5, ring_sink=3.0), "out"),
    (1.00, k(**_AFTER, gaze=0.0, rays=0.2, dy=-2.0, unravel=1.0, sun_gone=1.0, ring_dim=0.8, ring_sink=5.0), "lin"),
]

DRIFT = lambda t: (-0.18 + 0.12 * math.sin(math.tau * t), -0.03)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 16 for i in range(16)], [150] * 16, True, DRIFT),
    "run": Anim("run", glide_pose, [i / 12 for i in range(12)], [120] * 12, True, lambda t: (-1.0, -0.03)),
    "attack": Anim("attack", keyed(UNMAKE_KEYS), [0.0, 0.07, 0.14, 0.19, 0.24, 0.30, 0.37, 0.44, 0.50, 0.54, 0.58, 0.61, 0.64, 0.68, 0.72, 0.76, 0.80, 0.85, 0.90, 0.94, 1.0],
                   [100, 100, 130, 40, 60, 110, 110, 110, 150, 80, 110, 50, 60, 70, 70, 80, 90, 100, 100, 110, 140], False, DRIFT),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, DRIFT),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.025, 0.05, 0.095, 0.14, 0.20, 0.26, 0.30, 0.34, 0.38, 0.42, 0.46, 0.50, 0.54, 0.58, 0.62, 0.66, 0.70,
                                                 0.74, 0.78, 0.82, 0.86, 0.90, 0.94, 1.0],
                  [70, 50, 80, 80, 90, 90, 110, 70, 70, 70, 70, 70, 70, 70, 70, 80, 80, 90, 80, 80, 80, 90, 100, 130, 1500], False, lambda t: (-0.1, -0.5 if t > 0.7 else -0.03)),
}
