"""The Drowned Moon — world 3, WORLD boss. The light the people of the Stilt Marshes hang lanterns against.

A pale medusa as wide as a house, hanging over the causeway like the moon come down: a blue-white bell with the
moon's own dark seas on it, a cold light inside, and in that light — small, dark, upright, arms drifting above
their heads — the people it has taken. It carries its own rain: under it the air is all falling water, a curtain
of ribbons and hair-thin threads that drag along the planks, and from its front rim one stalk holds out a warm
paper lantern, the only warm thing on it, exactly like the lamps of the village. That is how it fishes.

It does not walk: it clenches and throws itself forward, bell first, with everything it trails streaming behind.
Attack: it draws in, rears back and turns its underside on the prey — and the underside is a MOUTH, rings of
needle teeth round a throat full of light; it hangs there, charging, then snaps forward and the light comes out
as a bolt of lightning that splits the planks. Hit: the bell caves in on the side of the blow, the light
gutters, it rocks back and its threads whip. Death: one last gape, then the bell tears; the water it carried
pours out, the light goes down, and it sinks onto the causeway and lies there like a wet sheet — while the lights
it kept inside come loose one by one and rise, free, into the rain. The lantern is the last thing to go out.

Own rig (no skeleton: a bell, a mouth and verlet threads). Frame 248 wide with 59 extra rows above, root at 104.
The Knight closes to 50 px of its root: nothing below his height passes ~30 px ahead of the root (the threads hang
from the back two thirds of the rim; the front of the bell and the lantern are over his head), and the bolt lands
58 px ahead. Drawn facing right; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, LIGHT, Anim, Build, Cel, Chain, ChainSpec, Character, Pose, Pt, keyed, lerp

FIGURE = ("DrownedMoon", "boss", "w03")

ROOT_X = 104
BUILD = Build(root_x=ROOT_X, thigh=1.0, shin=1.0, foot=0.0, hip_dx=0.0, spine=0.0, sh_near=0.0, sh_far=0.0, upper=1.0, fore=1.0, neck=0.0)

#: The bell at rest: half its width and its height.
A, HGT = 54.0, 48.0

M = "ink"  # the membrane's ramp: the grey-white of the moon
SEA = "azure"  # its dark seas, and the water it carries
GHOST = "sea"  # the light inside
WHITE = ("light", 0)
DARK = ("ink", 0)

#: The moon's seas: each a few overlapping blots (u, v, radius) on the bell (u across −1…1, v up 0…1) — grey on
#: grey and ragged, as on the real one (round blue spots made it a toadstool).
MARIA = [
    [(-0.50, 0.50, 0.13), (-0.38, 0.58, 0.10), (-0.58, 0.40, 0.08)],
    [(0.36, 0.64, 0.10), (0.47, 0.57, 0.08), (0.27, 0.72, 0.06)],
    [(-0.10, 0.84, 0.08), (0.02, 0.80, 0.06)],
    [(0.64, 0.30, 0.08), (0.56, 0.22, 0.06)],
    [(-0.74, 0.20, 0.07)],
]

#: The taken. They hang in its threads, the size of a hero: a fisher of the stilt villages under his straw hat, a
#: woman by one ankle, and a soldier who came, as the heroes have, to kill it.
FISHER = [
    "...HHH.....",
    "..HHHHH....",
    ".HHHHHHH...",
    "HHHHHHHHH..",
    "...hsss....",
    "...hsss....",
    "...hhss....",
    "....cs.....",
    "...cCCc....",
    "..ccCCcc...",
    "..cCCCCc...",
    "..scCCcs...",
    "..scrrcs...",
    "..s.CC.s...",
    "..s.cC.s...",
    "....cc.....",
    "...cc.cc...",
    "...cc.cc...",
    "...c..cc...",
    "...c...c...",
    "...c...c...",
    "...s...s...",
    "...s...ss..",
]
WOMAN = [
    ".....s.....",
    ".....s.....",
    ".....c.s...",
    "....cc.s...",
    "....cccs...",
    "...cCCc....",
    "...cCCCc...",
    "..cCCCCc...",
    "..cCCrCCc..",
    "..cCCCCCc..",
    "...cCCCc...",
    "...csssc...",
    "..s.sss.s..",
    "..s.shs.s..",
    "..s.hhh.s..",
    "..s.hhh.s..",
    "..s.hhh.s..",
    "..s..hh.s..",
    ".....hh.s..",
    ".....h.....",
    ".....h.....",
]
SOLDIER = [
    "...mm.....",
    "..mmmm....",
    "..mMMm....",
    "..msss....",
    "...ss.....",
    "..mmmm....",
    ".mmMMmm...",
    ".mMMMMm...",
    ".mMMMMm...",
    ".smMMms...",
    ".s.rr.s...",
    ".s.cc.s...",
    "...cc.....",
    "..cc.cc...",
    "..cc.cc...",
    "..cc.cc...",
    "..mm.mm...",
    "..mm.mm...",
    "..bb.bb...",
    "..b..b....",
    "..b..b....",
]
BODY_L = {"H": ("leather", 6), "h": ("ink", 1), "s": ("bone", 5), "c": ("leather", 3), "C": ("leather", 5), "r": ("crimson", 4), "m": ("ink", 5), "M": ("ink", 8), "b": ("leather", 2)}
#: The woman's shift is pale; the soldier's cloth is his tabard.
WOMAN_L = {**BODY_L, "c": ("bone", 4), "C": ("bone", 6)}
#: The ones further in, seen through the rain: only their shapes.
DEEP_L = {ch: ("ink", 3) for ch in "HhscCrmMb"} | {"C": ("ink", 4), "M": ("ink", 4), "H": ("ink", 4)}
SOLDIER_L = {**BODY_L, "c": ("crimson", 2), "C": ("crimson", 4)}
#: The taken: (thread it hangs from, sprite, which column of the sprite the thread holds, its colours, how it hangs askew).
BODIES = [("b0", FISHER, 5.0, BODY_L, -9.0), ("b1", SOLDIER, 4.0, SOLDIER_L, 10.0), ("b2", WOMAN, 5.0, WOMAN_L, 7.0)]
#: And the ones behind the ribbons.
DEEP = [("d0", SOLDIER, 4.0, DEEP_L, -8.0), ("d1", FISHER, 5.0, DEEP_L, 6.0), ("d2", WOMAN, 5.0, DEEP_L, -5.0)]

#: The paper lantern on the stalk.
LANTERN = [
    ".kkk.",
    "koook",
    "oOWOo",
    "oWWWo",
    "oOWOo",
    "koook",
    ".kkk.",
    "..t..",
    "..t..",
]
LANTERN_L = {"k": ("leather", 2), "o": ("brass", 4), "O": ("brass", 6), "W": WHITE, "t": ("crimson", 4)}
LANTERN_OUT = {"k": ("leather", 2), "o": ("leather", 3), "O": ("leather", 4), "W": ("leather", 5), "t": ("crimson", 3)}

#: What hangs under the bell: (name, where on the rim −1 back … 1 front, links, link length, kind).
#: `far` threads are drawn behind the bell; `arm` are the thick ribbons from the mouth; `weed` is marsh weed caught
#: in it; `body` holds one of the taken at its end.
THREADS = [
    ("f0", -0.86, 12, 5.8, "far"), ("f1", -0.46, 12, 5.5, "far"), ("f2", -0.04, 11, 5.6, "far"), ("f3", 0.34, 11, 5.2, "far"),
    ("w0", -0.70, 11, 5.8, "weed"), ("w1", -0.20, 11, 5.4, "weed"),
    ("a0", -0.42, 9, 5.8, "arm"), ("a1", -0.26, 9, 6.2, "arm"), ("a2", -0.10, 9, 5.6, "arm"),
    ("b0", -0.84, 8, 5.0, "body"), ("b1", 0.28, 6, 5.0, "body"), ("b2", 0.66, 2, 2.0, "body"),
    ("d0", -0.56, 5, 5.0, "deep"), ("d1", 0.02, 7, 5.0, "deep"), ("d2", -0.30, 3, 5.0, "deep"),
    ("n0", -0.97, 13, 5.8, "near"), ("n1", -0.60, 12, 5.8, "near"), ("n2", -0.50, 12, 5.4, "near"), ("n3", 0.06, 11, 5.8, "near"), ("n4", 0.16, 9, 5.2, "near"),
    ("s0", 0.44, 5, 4.2, "near"), ("s1", 0.84, 4, 3.6, "near"),
]


def _hash(x: int, y: int) -> int:
    return ((x * 73856093) ^ (y * 19349663)) & 0x7FFFFFFF


def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def P(x: float, up: float) -> Pt:
    return (ROOT_X + x, GROUND - up)


def _turn(v: Pt, deg: float) -> Pt:
    """A screen vector turned `deg` clockwise."""
    a = math.radians(deg)
    return (v[0] * math.cos(a) - v[1] * math.sin(a), v[0] * math.sin(a) + v[1] * math.cos(a))


def _tone(i: int, dim: float) -> tuple[str, int]:
    """A tone of the membrane; as the light goes out of it the whole bell sinks down its ramp."""
    return (M, max(1, i - int(round(dim * 3))))


class DrownedMoon(Character):
    build = BUILD
    W = 248
    TOP = 59

    # ------------------------------------------------------------------------------------------------- skeleton
    def chains(self) -> dict[str, ChainSpec]:
        def grounded(pts: list[Pt], J: dict) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        out: dict[str, ChainSpec] = {}
        for name, _u, n, seg, kind in THREADS:
            if kind in ("body", "deep"):  # a weight on a line: it swings slowly and does not flutter
                chain = Chain(n, seg, gravity=0.36, drag=0.03, damp=0.12)
            elif kind == "arm":
                chain = Chain(n, seg, gravity=0.2, drag=0.2, damp=0.1)
            else:
                chain = Chain(n, seg, gravity=0.16, drag=0.26, damp=0.1)
            out[name] = ChainSpec(chain, (lambda J, name=name: J["anch"][name]), grounded, (-0.08, 1.0))
        # The lantern's stalk: a stiff rod that arcs forward and down, and only nods.
        shape = [(0.0, 0.0), (2.8, 2.6), (5.2, 5.8), (6.8, 9.4), (7.6, 13.0), (7.8, 16.6)]
        out["lure"] = ChainSpec(Chain(6, 3.8, gravity=0.1, drag=0.16, damp=0.1, shape=shape, stiff=0.1), lambda J: J["stalk"], grounded, (0.5, 0.86))
        return out

    def joints(self, pose: Pose) -> dict:
        c = P(*pose["at"])
        pr, ax = _turn((1.0, 0.0), pose["tilt"]), _turn((0.0, -1.0), pose["tilt"])
        a = A * pose["ak"] * (1.0 - 0.16 * pose["pulse"])
        h = HGT * pose["hk"] * (1.0 + 0.14 * pose["pulse"])
        b = a * (0.07 + 0.5 * pose["open"])
        J: dict = {"c": c, "pr": pr, "ax": ax, "a": a, "h": h, "b": b}
        J["anch"] = {}
        for name, u, _n, _seg, kind in THREADS:
            # Threads hang from the near lip; the ribbons come out of the mouth itself.
            drop = b * (0.2 if kind == "arm" else -0.4 if kind in ("far", "deep") else 0.75)
            J["anch"][name] = (c[0] + pr[0] * a * u - ax[0] * drop, c[1] + pr[1] * a * u - ax[1] * drop)
        J["stalk"] = (c[0] + pr[0] * a * 0.93 + ax[0] * 3.0, c[1] + pr[1] * a * 0.93 + ax[1] * 3.0)
        J["gullet"] = (c[0] - ax[0] * b * 0.2, c[1] - ax[1] * b * 0.2)
        return J

    # ------------------------------------------------------------------------------------------------- parts
    def bell(self, cel: Cel, J: dict, pose: Pose) -> None:
        c, pr, ax, a, h, b = J["c"], J["pr"], J["ax"], J["a"], J["h"], J["b"]
        dim, glow, maw, dent = pose["dim"], pose["glow"], pose["maw"], pose["dent"]
        d3 = int(round(dim * 3))
        n = 40
        dome: list[Pt] = []
        for i in range(n + 1):
            th = math.pi * i / n
            k = 1.0 - dent * 0.20 * math.exp(-(((th - 0.50) / 0.50) ** 2))  # the blow caves the front in
            du, dv = a * math.cos(th) * k, h * (math.sin(th) ** 0.86) * k
            dome.append((c[0] + pr[0] * du + ax[0] * dv, c[1] + pr[1] * du + ax[1] * dv))
        lip = [(c[0] + pr[0] * a * math.cos(f) + ax[0] * b * math.sin(f), c[1] + pr[1] * a * math.cos(f) + ax[1] * b * math.sin(f))
               for f in (math.tau * i / 48 for i in range(48))]
        mouth = set(cel.poly_mask(lip))
        skin = set(cel.poly_mask(dome)) - mouth
        lu, lv = LIGHT[0] * pr[0] + LIGHT[1] * pr[1], LIGHT[0] * ax[0] + LIGHT[1] * ax[1]
        g = _clamp(glow, 0.0, 1.6)
        gs = min(g, 1.12) * (1.0 - 0.12 * pose["pulse"])  # the size of the glow (its strength is `g`)

        # The rags of the rim: it is torn all round, like a sheet left in the water. Drawn first: the lip goes over.
        down = (-ax[0] * 0.45, -ax[1] * 0.45 + 0.55)
        dl = math.hypot(*down) or 1.0
        down = (down[0] / dl, down[1] / dl)
        for i in range(17):
            f = math.pi + math.pi * (i + 0.5) / 17
            px = c[0] + pr[0] * a * math.cos(f) + ax[0] * b * math.sin(f)
            py = c[1] + pr[1] * a * math.cos(f) + ax[1] * b * math.sin(f)
            length = 3.0 + (_hash(i, 13) % 6) + (7.0 if i % 5 == 2 else 0.0)
            width = 3.6 if i % 2 else 2.6
            end = (px + down[0] * length + ((_hash(i, 4) % 3) - 1) * 0.8, min(py + down[1] * length, GROUND - 2.0))
            cel.limb((px, py), end, width, 1.0, M, (max(1, 6 - d3), max(1, 8 - d3), max(1, 9 - d3)))

        for (x, y) in skin:
            dx, dy = x + 0.5 - c[0], y + 0.5 - c[1]
            u, v = (dx * pr[0] + dy * pr[1]) / a, (dx * ax[0] + dy * ax[1]) / max(1.0, h)
            nz = math.sqrt(max(0.0, 1.0 - u * u - (v * 0.96) ** 2))
            bright = 0.50 * nz + 0.46 * (u * lu + v * lv) + 0.10
            if nz < 0.26:
                bright += 0.34  # a wet membrane is brightest where it turns away
            band = 9 if bright > 0.86 else 8 if bright > 0.58 else 7 if bright > 0.36 else 6
            sea = False
            rag = 1.0 + 0.16 * (((_hash(int(u * 40), int(v * 40)) % 7) - 3) / 3.0)
            for mare in MARIA:  # the seas of the moon
                if any((u - mu) ** 2 + ((v - mv) * 0.9) ** 2 < (mr * rag) ** 2 for mu, mv, mr in mare):
                    sea = True
                    break
            # The canals: meridians from the crown to the lip, like the cracks in an old shell.
            lon = math.degrees(math.atan2(u, max(0.05, nz))) / 22.5
            if 0.10 < v < 0.9 and abs(lon - round(lon)) < 0.07 and (x + y) % 2 == 0 and not sea:
                band -= 1
            tone = _tone(band - 1 if band > 6 else band, dim) if sea else _tone(band, dim)
            if sea and band == 6:
                tone = _tone(5, dim)
            # The light inside: a core, and a halo it stains the membrane with.
            dg = math.hypot(u / 0.62, (v - 0.36) / 0.40)
            if g > 0.05:
                if dg < 0.20 * (g - 1.0) * 2.4:
                    tone = WHITE
                elif dg < 0.36 * gs:
                    tone = (GHOST, 8 - min(2, d3))
                elif dg < 0.60 * gs:
                    tone = (GHOST, 7 - min(2, d3))
                elif dg < 0.80 * gs:
                    tone = (GHOST, 6 - min(2, d3)) if dg < 0.74 * gs or (x + y) % 2 == 0 else tone
            cel.px[(x, y)] = tone

        # The lights it keeps: wisps turning slowly in the glow.
        if pose["hk"] > 0.55 and dim < 0.6 and pose["open"] < 0.6 and g > 0.25 and pose["souls"] < 0.05:
            tw = pose["twinkle"]
            for i in range(6):
                f = math.tau * (tw * (1 if i % 2 else -1) + i / 6.0)
                du = a * 0.30 * math.cos(f) * (0.6 + 0.4 * ((i * 3) % 4) / 3.0)
                dv = h * (0.36 + 0.17 * math.sin(f + i))
                x = int(math.floor(c[0] + pr[0] * du + ax[0] * dv))
                y = int(math.floor(c[1] + pr[1] * du + ax[1] * dv))
                if (x, y) not in skin:
                    continue
                cel.px[(x, y)] = WHITE
                for qx, qy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    if (x + qx, y + qy) in skin:
                        cel.px[(x + qx, y + qy)] = WHITE if (qx, qy) == (0, -1) and i % 3 == 0 else (GHOST, 8)

        # Tears: dark rips that open from the lip upwards.
        tear = pose["tear"]
        if tear > 0.02:
            for k_, (u0, lean_, reach) in enumerate(((-0.52, 0.10, 0.74), (0.10, -0.14, 0.9), (0.56, 0.10, 0.6))):
                steps = int(reach * tear * h)
                for s_ in range(steps):
                    v = s_ / max(1.0, h)
                    u = u0 + lean_ * v * 3.0 + 0.03 * math.sin(s_ * 1.3 + k_)
                    px = c[0] + pr[0] * a * u + ax[0] * s_
                    py = c[1] + pr[1] * a * u + ax[1] * s_
                    wide = 1 + int(2.2 * tear * (1.0 - s_ / max(1, steps)))
                    for q in range(-wide // 2, wide // 2 + 1):
                        key = (int(math.floor(px + q)), int(math.floor(py)))
                        if key in skin:
                            cel.px[key] = DARK if q != wide // 2 else (M, 2)

        # The underside. Shut, it is a sliver of shadow with the light leaking out; open, it is the mouth: black,
        # ring inside ring of needle teeth, and the light at the bottom of the throat.
        charge = pose["charge"]
        core = (0.06 + 0.03 * maw + 0.13 * charge) * _clamp(g, 0.0, 1.3)
        # Each ring: where its gums are, how long its teeth, how many, its turn, and a tooth's width in pixels.
        rings = ((0.90, 0.25, 15, 0.0, 2.7), (0.60, 0.16, 11, 0.5, 2.1), (0.40, 0.10, 8, 0.25, 1.6))
        for (x, y) in mouth:
            dx, dy = x + 0.5 - c[0], y + 0.5 - c[1]
            u, w = (dx * pr[0] + dy * pr[1]) / a, (dx * ax[0] + dy * ax[1]) / max(0.8, b)
            r = math.hypot(u, w)
            if r < core:
                tone = WHITE
            elif r < core * 1.5:
                tone = (GHOST, 8)
            elif r < core * 2.2:
                tone = (GHOST, 6) if (x + y) % 2 == 0 else (SEA, 1)
            elif r < 0.40:
                tone = DARK
            elif r < 0.60:
                tone = (SEA, 0)
            elif r < 0.90 or maw < 0.3:
                tone = (SEA, 1) if r < 0.84 or maw < 0.3 else (SEA, 2)  # the gums, a shade paler at the lip
            else:
                tone = _tone(8 if w < 0 else 7, dim)  # the rim of the bell, seen from below
            if maw > 0.08 and r < 0.90:
                ang = math.atan2(w, u) % math.tau
                for r_out, length, count, off, wide in rings:
                    length *= maw
                    kf = (ang / math.tau * count + off) % 1.0 - 0.5  # −0.5…0.5 across one tooth's place
                    t_in = (r_out - r) / max(0.01, length)  # 0 at the gum, 1 at the point
                    # A needle: as wide as `wide` pixels at the gum, a point at the end.
                    across = abs(kf) / count * math.tau * r * math.hypot(a * math.cos(ang), b * math.sin(ang))
                    if 0.0 <= t_in <= 1.0 and across < wide * (1.0 - t_in) + 0.35 and r > core * 1.15:
                        tone = WHITE if kf > -0.02 else ("bone", 6)
            cel.px[(x, y)] = tone

        # The lip.
        for i in range(120):
            f = math.tau * i / 120
            near = math.sin(f) < 0.0
            px = c[0] + pr[0] * a * math.cos(f) + ax[0] * b * math.sin(f)
            py = c[1] + pr[1] * a * math.cos(f) + ax[1] * b * math.sin(f)
            if near or b > 9.0:
                cel.put(px, py, _tone(9 if near else 7, dim))
                if near:
                    cel.put(px - ax[0], py - ax[1], _tone(8, dim))

    @staticmethod
    def thread(cel: Cel, pts: list[Pt], kind: str, dim: float) -> None:
        if len(pts) < 2:
            return
        d = int(round(dim * 3))
        if kind == "arm":  # a ribbon: thick at the mouth, ruffled down its length
            n = len(pts) - 1
            for i in range(n):
                t0, t1 = i / n, (i + 1) / n
                w0 = lerp(8.4, 2.4, t0) * (1.0 + 0.22 * math.sin(i * 2.1))
                w1 = lerp(8.4, 2.4, t1) * (1.0 + 0.22 * math.sin((i + 1) * 2.1))
                cel.limb(pts[i], pts[i + 1], w0, w1, M, (max(1, 6 - d), max(1, 8 - d), max(1, 9 - d)))
            for i in range(1, n):  # the frill
                (x0, y0), (x1, y1) = pts[i - 1], pts[i]
                L = math.hypot(x1 - x0, y1 - y0) or 1.0
                nx, ny = -(y1 - y0) / L, (x1 - x0) / L
                side = 1.0 if i % 2 else -1.0
                wdt = lerp(8.4, 2.4, i / n) / 2 + 0.6
                cel.put(x1 + nx * wdt * side, y1 + ny * wdt * side, _tone(9, dim))
            return
        tone = ("moss", 2) if kind == "weed" else _tone(6 if kind == "far" else 8, dim)
        for i in range(len(pts) - 1):
            cel.line(pts[i], pts[i + 1], tone)
        if kind == "weed":
            for i in range(2, len(pts), 2):  # leaves
                cel.put(pts[i][0] - 1, pts[i][1], ("moss", 3))
                cel.put(pts[i][0] + 1, pts[i][1] + 1, ("moss", 4))
        elif kind == "near":
            for i in range(2, len(pts), 3):  # beads of water on it
                cel.put(pts[i][0], pts[i][1], _tone(9, dim))

    @staticmethod
    def taken(cel: Cel, pts: list[Pt], rows: list[str], hold: float, legend: dict, askew: float) -> None:
        """One of the taken at the end of its thread. It hangs as the thread hangs, a little askew: nobody is
        holding it up. (Sheared, not turned: at this size a turned sprite loses its hands and its face.)"""
        (x0, y0), (x1, y1) = pts[-2], pts[-1]
        lean = math.tan(math.radians(_clamp(askew - math.degrees(math.atan2(x1 - x0, max(0.5, y1 - y0))), -30.0, 30.0)))
        top = min(y1, GROUND - 2.0 - len(rows))
        cel.stamp(rows, legend, x1 - hold - lean * (len(rows) - 1), top, shear=lean)

    @staticmethod
    def lantern(cel: Cel, pts: list[Pt], pose: Pose) -> None:
        """The lantern on its stalk. When the bell dies it comes off (`lure_free`) and lies where `lure_at` says."""
        free, out, twinkle = pose["lure_free"], pose["lure_out"], pose["twinkle"]
        tip = pts[-1]
        if free > 0.001:
            to = P(*pose["lure_at"])
            tip = (lerp(tip[0], to[0], free), lerp(tip[1], to[1] - len(LANTERN), free))
        if free < 0.5:
            for i in range(len(pts) - 1):
                cel.line(pts[i], pts[i + 1], ("leather", 4))
        legend = LANTERN_OUT if out > 0.5 else LANTERN_L
        if out <= 0.5 and int(twinkle * 16) % 8 == 5:
            legend = {**LANTERN_L, "W": ("brass", 7)}
        cel.stamp(LANTERN, legend, tip[0] - 2, min(tip[1], GROUND - 1.0 - len(LANTERN)))

    # ------------------------------------------------------------------------------------------------- effects
    @staticmethod
    def rain(cel: Cel, J: dict, pose: Pose) -> None:
        """It carries its own rain: under the bell the air is falling water."""
        if pose["dim"] > 0.3 or pose["rain"] < 0.0:
            return
        c, pr, a = J["c"], J["pr"], J["a"]
        if abs(pr[0]) < 0.35:
            return
        slant = pose["slant"]
        ph = pose["rain"]
        for x in range(int(c[0] - a * abs(pr[0])) + 2, int(c[0] + a * abs(pr[0])) - 1, 3):
            u = (x - c[0]) / (pr[0] * a)
            top = c[1] + pr[1] * a * u + 3.0
            span = GROUND - 2 - top
            if span < 8:
                continue
            hsh = _hash(x, 7) % 1000 / 1000.0
            for k_ in range(3):
                off = ((ph * (2 if hsh > 0.5 else 1) + hsh + k_ / 3.0) % 1.0) * span
                for q in range(3 + (k_ == 0)):
                    yy = top + off + q
                    xx = x + slant * (off + q) / 10.0
                    if yy >= GROUND - 1 or (xx - ROOT_X > 31 and yy > GROUND - 44):
                        continue
                    cel.soft(xx, yy, (SEA, 6) if (k_ + x) % 2 else (SEA, 5))
            if _hash(x, 3) % 3 == 0 and x + slant * span / 10.0 - ROOT_X <= 31:  # where it lands on the planks
                cel.soft(x + slant * span / 10.0, GROUND - 1, (SEA, 6))

    @staticmethod
    def bolt(cel: Cel, J: dict, at: float, u: float) -> None:
        """The light, let out: lightning from the throat to the planks. It burns white for an instant, then is a
        scar of afterlight breaking up."""
        gx, gy = J["gullet"]
        gx, gy = gx - J["ax"][0] * 6.0, gy - J["ax"][1] * 6.0
        tx, ty = ROOT_X + at, GROUND - 1.0
        n = 8
        path: list[Pt] = []
        for i in range(n + 1):
            t = i / n
            jig = 0.0 if i in (0, n) else (5.5 if i % 2 else -5.5) + ((_hash(i, 41) % 5) - 2)
            path.append((lerp(gx, tx, t) + jig, lerp(gy, ty, t)))
        fresh = u < 0.3

        def stroke(a_: Pt, b_: Pt, core: int, halo: bool) -> None:
            steps = int(max(abs(b_[0] - a_[0]), abs(b_[1] - a_[1]))) + 1
            for s_ in range(steps + 1):
                t = s_ / steps
                x, y = lerp(a_[0], b_[0], t), lerp(a_[1], b_[1], t)
                if y >= GROUND - 1:
                    continue
                for q in range(-core, core + 1):
                    cel.put(x + q, y, WHITE)
                if halo:
                    for q in (-core - 1, core + 1):
                        cel.put(x + q, y, (GHOST, 8))
                    for q in (-core - 2, core + 2):
                        cel.soft(x + q, y, (SEA, 7))

        for i in range(n):
            if not fresh and (_hash(i, int(u * 7) + 1) % 100) < (u - 0.3) * 160:
                continue  # breaking up
            stroke(path[i], path[i + 1], 1 if fresh else 0, fresh or u < 0.5)
        # Forks: they leave the trunk and die in the air or on the planks.
        if u < 0.55:
            for k_, (i0_, dx_, dy_, m_) in enumerate(((2, 22.0, 16.0, 5), (4, -20.0, 15.0, 5), (5, 17.0, 9.0, 4), (6, -12.0, 8.0, 3))):
                x, y = path[i0_]
                pts = [(x, y)]
                for s_ in range(1, m_ + 1):
                    t = s_ / m_
                    pts.append((x + dx_ * t + ((_hash(s_, k_ + 2) % 5) - 2) * 1.2, min(y + dy_ * t, GROUND - 2)))
                for s_ in range(m_ if fresh else m_ - 2):
                    stroke(pts[s_], pts[s_ + 1], 0, fresh)

    @staticmethod
    def shock(cel: Cel, at: float, u: float) -> None:
        """Where it lands: the planks split, the water under them stands up, and the charge runs along the wet wood."""
        ix = ROOT_X + at
        if u < 0.3:
            cel.star(ix, GROUND - 4, 7)
            for q in range(-11, 12):
                cel.put(ix + q, GROUND - 2, WHITE if abs(q) < 8 else (SEA, 8))
                cel.put(ix + q, GROUND - 3, WHITE if abs(q) < 5 else (SEA, 8) if abs(q) < 9 else (SEA, 7))
        # Columns of water thrown up through the planks.
        for i in range(9):
            off = (i - 4) * 5.0 + ((_hash(i, 9) % 3) - 1)
            peak = (15.0 + (_hash(i, 2) % 4) * 4.0) * (1.0 - abs(i - 4) / 6.5)
            hgt = peak * math.sin(math.pi * _clamp(u * 1.12))
            fall = 8.0 * max(0.0, u - 0.55)
            for s_ in range(int(hgt)):
                y = GROUND - 2 - s_ + fall
                if y >= GROUND - 1:
                    continue
                tip = s_ > hgt - 3
                tone = WHITE if tip and u < 0.6 else (SEA, 8) if s_ > hgt * 0.5 else (SEA, 6) if (s_ + i) % 2 else (SEA, 7)
                cel.soft(ix + off * (1.0 + 0.6 * u) + (1 if s_ % 4 == 0 else 0), y, tone)
                if not tip and i % 2 == 0:
                    cel.soft(ix + off * (1.0 + 0.6 * u) + 1, y, (SEA, 6))
        # Drops thrown wide.
        for i in range(14):
            ang = math.radians(-168 + i * 12.0)
            dist = 8.0 + (22.0 + (i * 5 % 4) * 5.0) * u
            x = ix + math.cos(ang) * dist * 1.3
            y = GROUND - 3 + math.sin(ang) * dist + 15.0 * u * u
            if y < GROUND - 1:
                cel.soft(x, y, WHITE if i % 3 == 0 and u < 0.5 else (SEA, 8))
                cel.soft(x, y + 1, (SEA, 6))
        # The charge crawling along the wet planks, both ways.
        reach = 10.0 + 40.0 * u
        for sgn in (-1, 1):
            for i in range(int(reach)):
                x = ix + sgn * i
                if x - ROOT_X > 139 or (_hash(i, int(u * 9) + (sgn > 0)) % 4) == 0:
                    continue
                front = i > reach - 7
                cel.soft(x, GROUND - 1, WHITE if front and u < 0.8 else (SEA, 7) if i % 2 else (SEA, 5))
                if front and i % 3 == 0 and u < 0.8:
                    cel.soft(x, GROUND - 2 - (_hash(i, 3) % 3), (SEA, 8))

    @staticmethod
    def sparks(cel: Cel, J: dict, charge: float, twinkle: float) -> None:
        """The charge gathering: small lightnings round the teeth."""
        c, pr, ax, a, b = J["c"], J["pr"], J["ax"], J["a"], J["b"]
        for i in range(int(3 + 5 * charge)):
            f = math.tau * ((_hash(i, int(twinkle * 24)) % 100) / 100.0)
            r0, r1 = 0.35, 1.08 + 0.12 * (i % 2)
            x0, y0 = c[0] + pr[0] * a * math.cos(f) * r0 + ax[0] * b * math.sin(f) * r0, c[1] + pr[1] * a * math.cos(f) * r0 + ax[1] * b * math.sin(f) * r0
            x1, y1 = c[0] + pr[0] * a * math.cos(f) * r1 + ax[0] * b * math.sin(f) * r1, c[1] + pr[1] * a * math.cos(f) * r1 + ax[1] * b * math.sin(f) * r1
            for s_ in range(6):
                t = s_ / 5
                jig = ((_hash(s_, i + 3) % 3) - 1) * 1.2
                cel.put(lerp(x0, x1, t) + jig, lerp(y0, y1, t), WHITE if s_ % 2 else (SEA, 8))

    @staticmethod
    def drain(cel: Cel, J: dict, u: float, ph: float) -> None:
        """The water it carried, pouring out of the torn bell onto the planks."""
        c, pr, a = J["c"], J["pr"], J["a"]
        pour = math.sin(math.pi * _clamp(u * 1.05)) if u < 0.95 else 0.0
        if pour > 0.05:
            for k_, uu in enumerate((-0.62, -0.3, 0.02, 0.3, 0.55)):
                x0 = c[0] + pr[0] * a * uu
                top = c[1] + pr[1] * a * uu + 2.0
                wide = 1 + int(3 * pour) - (k_ % 2)
                for yy in range(int(top), int(GROUND - 1)):
                    for q in range(wide):
                        if (yy + int(ph * 40) + q * 2 + k_) % 5 == 0:
                            continue
                        cel.soft(x0 + q + math.sin(yy * 0.3 + k_) * 0.8, yy, (SEA, 8) if q == 0 else (SEA, 6))
        # The pool it leaves.
        half = 16.0 + 62.0 * _clamp(u)
        cx = ROOT_X - 6.0
        for i in range(int(-half), int(half) + 1):
            if cx + i - ROOT_X > 60:
                continue
            if (_hash(i, 21) % 5) == 0 and abs(i) > half * 0.6:
                continue
            cel.soft(cx + i, GROUND - 1, (SEA, 7) if (i + int(ph * 12)) % 7 == 0 else (SEA, 5) if i % 3 else (SEA, 6))

    @staticmethod
    def souls(cel: Cel, u: float) -> None:
        """What it kept in the light comes loose and rises: small lights, each on its own way up."""
        for i in range(9):
            start = 0.085 * i
            if u <= start:
                continue
            age = (u - start) / (1.0 - start * 0.55)
            h1, h2 = _hash(i, 17) % 1000 / 1000.0, _hash(i, 31) % 1000 / 1000.0
            x0, y0 = -38.0 + 62.0 * h1, 10.0 + 30.0 * h2
            up = y0 + 112.0 * age ** 1.2
            if up > 119:
                continue

            def xat(g_: float) -> float:
                return x0 + 8.0 * math.sin(g_ * 8.0 + i * 1.7) + (h2 - 0.5) * 34.0 * g_

            px, py = P(xat(age), up)
            fade = up > 100
            for qx, qy in ((0, 0), (1, 0), (0, 1), (1, 1)):
                cel.put(px + qx, py + qy, WHITE if not fade else (GHOST, 8))
            if not fade:
                for qx, qy in ((-1, 0), (2, 0), (0, -1), (1, -1), (-1, 1), (2, 1), (0, 2), (1, 2)):
                    cel.soft(px + qx, py + qy, (GHOST, 8))
                for qx, qy in ((-2, 0), (3, 1), (0, -2), (1, -2), (-1, -1), (2, -1), (-1, 2), (2, 2)):
                    cel.soft(px + qx, py + qy, (GHOST, 6))
            for q in range(1, 9):  # its wake
                wx = xat(age - q * 0.010)
                cel.soft(ROOT_X + wx, py + 2 + q, (GHOST, 7) if q < 4 else (GHOST, 5))

    @staticmethod
    def drips(cel: Cel, ropes: dict, ph: float) -> None:
        for k_, name in enumerate(("n1", "n3", "a1", "a2", "n0")):
            pts = ropes.get(name)
            if not pts:
                continue
            x, y = pts[-1]
            span = GROUND - 2 - y
            if span < 5:
                continue
            t = (ph * 2 + k_ * 0.37) % 1.0
            yy = y + 1 + t * t * span
            cel.soft(x, yy, WHITE)
            cel.soft(x, yy - 1, (SEA, 7))

    # ------------------------------------------------------------------------------------------------- drawing
    def draw(self, cel, J, pose, ropes, between) -> None:
        dim = pose["dim"]
        kinds = {name: kind for name, _u, _n, _seg, kind in THREADS}
        # As the bell comes down, what hung from it lies down on the planks (no loops standing in the air).
        flat = _clamp((0.62 - pose["hk"]) / 0.3)
        if flat > 0.0:
            ropes = {name: [(x, lerp(y, max(y, GROUND - 2.5), flat)) for x, y in pts] for name, pts in ropes.items()}
        for name in ropes:
            if kinds.get(name) in ("far", "weed"):
                self.thread(cel, ropes[name], kinds[name], dim)
        if pose["hk"] > 0.45:
            for name, rows, hold, legend, askew in DEEP:
                self.thread(cel, ropes[name], "far", dim)
                self.taken(cel, ropes[name], rows, hold, legend, askew)
        self.bell(cel, J, pose)
        for name in ropes:
            if kinds.get(name) == "arm":
                self.thread(cel, ropes[name], "arm", dim)
        # The taken hang among the ribbons. Once the bell is down they are under it.
        if pose["hk"] > 0.45:
            for name, rows, hold, legend, askew in BODIES:
                self.thread(cel, ropes[name], "near", dim)
                self.taken(cel, ropes[name], rows, hold, legend, askew)
        for name in ropes:
            if kinds.get(name) == "near":
                self.thread(cel, ropes[name], "near", dim)
        self.lantern(cel, ropes["lure"], pose)
        for xy in [xy for xy in cel.px if xy[1] >= GROUND]:
            del cel.px[xy]
        cel.outline()
        for xy in [xy for xy in cel.px if xy[1] > GROUND]:
            del cel.px[xy]

        # Light and water, over and behind the figure.
        self.rain(cel, J, pose)
        if pose["dim"] < 0.3:
            self.drips(cel, ropes, pose["twinkle"])
        if pose["drain"] > 0.02:
            self.drain(cel, J, pose["drain"], pose["twinkle"])
        if pose["souls"] > 0.01:
            self.souls(cel, pose["souls"])
        if pose["charge"] > 0.15 and pose["maw"] > 0.5:
            self.sparks(cel, J, pose["charge"], pose["twinkle"])
        if 0.01 < pose["shock"] < 0.985:
            self.shock(cel, pose["bolt_x"], pose["shock"])
        if 0.01 < pose["bolt"] < 0.9:
            self.bolt(cel, J, pose["bolt_x"], pose["bolt"])
        # Nothing of it shows below the path.
        for xy in [xy for xy in cel.px if xy[1] > GROUND]:
            del cel.px[xy]


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(at=(10.0, 64.0), tilt=6.0, pulse=0.0, open=0.10, maw=0.5, glow=1.0, charge=0.0, dent=0.0, hk=1.0, ak=1.0, dim=0.0, tear=0.0,
                  drain=0.0, souls=0.0, bolt=0.0, bolt_x=58.0, shock=0.0, rain=0.0, slant=0.0, twinkle=0.0, lure_out=0.0, lure_free=0.0, lure_at=(24.0, 0.0), flash=0.0)


def _beat(ph: float, snap: float = 0.22) -> float:
    """One clench of the bell: shut fast, open slowly."""
    ph %= 1.0
    if ph < snap:
        t = ph / snap
        return t * t * (3 - 2 * t)
    t = (ph - snap) / (1.0 - snap)
    return (1.0 - t) ** 2


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    beat = _beat(ph - 0.1, 0.3) * 0.55
    return {**BASE, "at": (10.0 + 0.8 * late, 64.0 + 1.6 * s + 1.4 * beat), "tilt": 6.0 + 2.5 * late, "pulse": beat, "open": 0.10 + 0.05 * beat,
            "maw": 0.5,
            "glow": 1.0 + 0.14 * math.sin(math.tau * (ph - 0.35)), "rain": ph, "twinkle": ph}


def swim_pose(ph: float) -> Pose:
    beat = _beat(ph, 0.2)
    after = _beat(ph - 0.16, 0.3)
    return {**BASE, "at": (12.0 + 5.0 * after - 2.0, 62.0 + 5.0 * after), "tilt": 36.0 - 9.0 * beat + 5.0 * after, "pulse": beat, "open": 0.05 + 0.1 * (1.0 - beat),
            "glow": 1.05 + 0.25 * beat, "rain": 2 * ph, "slant": -7.0, "twinkle": ph}


def k(**over: object) -> Pose:
    return {**BASE, **over}


# The strike. It draws in, rears and turns its underside on the prey — the mouth — and hangs there charging; then
# it snaps forward and lets the light out.
_SHOW = dict(at=(-7.0, 70.0), tilt=-48.0, open=0.9, maw=1.0, hk=0.66, glow=1.4)
_SPIT = dict(at=(20.0, 72.0), tilt=-40.0, open=0.74, maw=1.0, hk=0.7, pulse=0.8, glow=1.5)
STRIKE_KEYS = [
    (0.00, k(), "lin"),
    (0.12, k(at=(9.0, 60.0), tilt=12.0, pulse=1.0, glow=0.7), "io"),
    (0.30, k(at=(-3.0, 72.0), tilt=-36.0, open=0.55, maw=0.7, hk=0.8, pulse=0.2, glow=1.2, charge=0.2), "out"),
    (0.42, k(**_SHOW, charge=0.7), "out"),
    (0.50, k(**{**_SHOW, "at": (-8.0, 71.0), "tilt": -50.0}, charge=1.0, pulse=0.25), "io"),
    (0.55, k(**_SPIT, charge=1.0, bolt=0.05, shock=0.02), "in3"),
    (0.70, k(**{**_SPIT, "at": (22.0, 71.0), "tilt": -37.0, "pulse": 0.4, "glow": 0.9}, charge=0.1, bolt=0.95, shock=0.98), "out"),
    (0.84, k(at=(16.0, 67.0), tilt=-12.0, open=0.22, maw=0.2, hk=0.92, glow=0.7, bolt=1.0, shock=1.0), "io"),
    (1.00, k(bolt=1.0, shock=1.0), "io"),
]

# Hit: the bell caves in where the blow lands, the light gutters, it rocks back and rights itself.
HURT_KEYS = [
    (0.00, k(), "lin"),
    (0.07, k(at=(7.0, 63.0), tilt=-3.0, dent=0.8, pulse=0.5, glow=1.6, flash=0.5), "out3"),
    (0.16, k(at=(3.0, 62.0), tilt=-15.0, dent=1.0, pulse=0.8, glow=0.3, flash=0.5), "lin"),
    (0.26, k(at=(0.0, 63.0), tilt=-20.0, dent=0.7, pulse=0.35, glow=0.25), "out"),
    (0.50, k(at=(5.0, 67.0), tilt=13.0, dent=0.15, glow=1.25), "io"),
    (0.74, k(at=(10.0, 65.0), tilt=1.0, glow=0.9), "io"),
    (1.00, k(), "io"),
]

# Death: the last gape; the tear; the water and the light go out of it; the lights it kept rise.
_HEAP = dict(at=(-18.0, 3.0), tilt=2.0, open=0.0, maw=0.0, hk=0.2, ak=0.96, dim=0.6, glow=0.0, tear=1.0, drain=1.0, rain=-1.0, lure_free=1.0, lure_at=(25.0, 3.0))
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.05, k(at=(6.0, 63.0), tilt=-8.0, dent=1.0, pulse=0.6, glow=1.6, flash=0.5), "out3"),
    (0.14, k(at=(-1.0, 73.0), tilt=-32.0, open=0.6, maw=0.9, hk=0.8, pulse=1.0, glow=1.6, charge=0.5), "out"),
    (0.26, k(at=(-3.0, 76.0), tilt=-38.0, open=0.7, maw=1.0, hk=0.76, pulse=0.2, glow=0.8, tear=0.35, drain=0.12), "io"),
    (0.34, k(at=(-2.0, 74.0), tilt=-30.0, open=0.55, maw=0.8, hk=0.8, glow=0.55, tear=0.7, drain=0.35, souls=0.04, dim=0.1), "lin"),
    (0.52, k(at=(-2.0, 46.0), tilt=-9.0, open=0.26, maw=0.3, hk=0.78, ak=1.0, glow=0.3, dim=0.3, tear=1.0, drain=0.7, souls=0.3, rain=-1.0, lure_free=0.1), "in"),
    (0.66, k(at=(-10.0, 19.0), tilt=5.0, open=0.05, maw=0.1, hk=0.5, ak=0.98, glow=0.12, dim=0.45, tear=1.0, drain=0.9, souls=0.52, rain=-1.0, lure_free=0.6, lure_at=(27.0, 2.0)), "in"),
    (0.76, k(**{**_HEAP, "at": (-16.0, 4.0), "hk": 0.3, "dim": 0.55, "glow": 0.05}, souls=0.68), "in"),
    (0.82, k(**{**_HEAP, "hk": 0.17, "ak": 1.0}, souls=0.78), "out"),
    (0.88, k(**_HEAP, souls=0.88), "io"),
    (0.94, k(**_HEAP, souls=0.97), "lin"),
    (1.00, k(**_HEAP, souls=1.0, lure_out=1.0), "lin"),
]

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 16 for i in range(16)], [150] * 16, True, air=lambda t: (0.22 * math.sin(math.tau * t), 0.0)),
    "run": Anim("run", swim_pose, [i / 12 for i in range(12)], [95] * 12, True, air=lambda t: (-0.85, 0.0)),
    "attack": Anim("attack", keyed(STRIKE_KEYS), [0.0, 0.06, 0.12, 0.18, 0.24, 0.30, 0.36, 0.42, 0.50, 0.55, 0.59, 0.63, 0.67, 0.70, 0.77, 0.84, 0.92, 1.0],
                   # An enemy swings every 1250 ms and the game starts this clip its wind-up ahead of the swing: the whole
                   # of it (660 ms to the bolt, 290 of afterlight, 290 to right itself) fits between two swings.
                   [60, 60, 70, 60, 60, 70, 70, 80, 130, 40, 50, 60, 60, 80, 80, 70, 70, 70], False),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.025, 0.05, 0.095, 0.14, 0.20, 0.26, 0.30, 0.34, 0.39, 0.43, 0.475, 0.52, 0.57, 0.615, 0.66, 0.71, 0.76,
                                                 0.79, 0.82, 0.85, 0.88, 0.94, 1.0],
                  [70, 50, 80, 90, 120, 120, 110, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 70, 70, 80, 120, 300, 1500], False),
}
