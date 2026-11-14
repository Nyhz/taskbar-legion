"""Void Maw — world 10, beast. A ragged orb of darkness that is mostly mouth: a ring of pale teeth round a gullet
with a nebula in it, one burning eye above, wisps of itself fraying off its rim and four tentacles trailing under
it. It has its own rig: it does not walk, it floats — bobbing, pulsing, tilting into its movement. To attack it
rears back with the jaws wide, lunges and snaps them shut. It dies by imploding: it swells, spins in on itself
to a point and pops, and its teeth rain down and stay.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Pose, Pt, keyed

FIGURE = ("VoidMaw", "foe", "w10")

BUILD = Build(root_x=40, thigh=1.0, shin=1.0, foot=0.0, hip_dx=0.0, spine=0.0, sh_near=0.0, sh_far=0.0, upper=0.0, fore=0.0, neck=0.0)
#: Height of the orb's centre above the ground.
FLOAT = 23.0

L = {
    "a": ("azure", 0), "b": ("azure", 1), "c": ("azure", 2), "d": ("azure", 3), "e": ("azure", 5), "f": ("azure", 7),
    "k": ("ink", 0), "v": ("violet", 4), "T": ("bone", 7), "t": ("bone", 5), "Y": ("brass", 6), "W": ("light", 0),
}

# Jaws open: a wedge of nothing torn out of its front, fanged above and below, a glimmer (v) deep in the gullet.
# The rim is ragged and lit (e, f).
OPEN = [
    "....f........f.........",
    ".......efeeffff........",
    ".....eeddddddddff......",
    ".e..eedddccccdddfe.....",
    "...eddYYYccccccddef....",
    "..edddYWWYbbbccTdTde...",
    "..eddccYYbbbbcTTkTTdf..",
    ".eddccbbbbaabTkTkkTkTf.",
    "ffddccbbbaaakkTkkkTkkT.",
    ".eddcbbbaaavkkkkkkkkkk.",
    ".edccbbbaavvvkkkkkkkkk.",
    ".fddcbbbaaavkkkkkkkkkk.",
    ".eddccbbbaaakkkTkkkTkT.",
    "eeddccbbbbaabTkTkTkTTe.",
    "..eddccbbbbbbcTTkTTde..",
    "..edddcccbbbbccTdTde...",
    "...edddccccccccddde....",
    "....fedddccccdddfe.....",
    "..f..efddddddddfe......",
    ".......efeefeef.e......",
    ".......e....f..........",
]
# Jaws shut: the fangs mesh in a seam across the front.
SHUT = [
    "....f........f.........",
    ".......efeeffff........",
    ".....eeddddddddff......",
    ".e..eedddccccdddfe.....",
    "...eddYYYccccccddef....",
    "..edddYWWYbbbcccdddf...",
    "..eddccYYbbbbbbccddf...",
    ".eddccbbbbaabbbbccdde..",
    "ffddccbbbaaaabbTcTcTdf.",
    ".eddcbbbaaaabTtTtTtTtT.",
    ".edccbbbaavvkTkTkTkTkT.",
    ".fddcbbbaaaabtTtTtTtTt.",
    ".eddccbbbaaaabbcTcTcTe.",
    "eeddccbbbbaabbbbccdde..",
    "..eddccbbbbbbbbccddf...",
    "..edddcccbbbbcccddde...",
    "...edddccccccccddde....",
    "....fedddccccdddfe.....",
    "..f..efddddddddfe......",
    ".......efeefeef.e......",
    ".......e....f..........",
]
PIVOT = (11.0, 10.5)
#: Where the tentacles grow from, in the orb's frame.
ROOTS = [(-7.5, 4.5), (-4.0, 8.0), (0.0, 9.5), (3.5, 8.5)]
#: Teeth left on the ground after it implodes: x from where it died, and when each lands (in the implosion's 0–1).
TEETH = [(-7.0, 0.74), (-3.0, 0.8), (1.0, 0.76), (5.0, 0.84), (9.0, 0.79)]


def stamp_scaled(cel: Cel, rows: list[str], legend: dict, at: Pt, deg: float, scale: float) -> None:
    """The sprite turned `deg` and scaled about its pivot, which lands on `at` (nearest sample)."""
    a = math.radians(deg)
    ca, sa = math.cos(a), math.sin(a)
    R = int(16 * scale) + 2
    for j in range(int(at[1]) - R, int(at[1]) + R + 1):
        for i in range(int(at[0]) - R, int(at[0]) + R + 1):
            dx, dy = i + 0.5 - at[0], j + 0.5 - at[1]
            c = int(math.floor((dx * ca + dy * sa) / scale + PIVOT[0]))
            r = int(math.floor((-dx * sa + dy * ca) / scale + PIVOT[1]))
            if 0 <= r < len(rows) and 0 <= c < len(rows[r]) and rows[r][c] != ".":
                cel.put(i, j, legend[rows[r][c]])


def scale_of(implode: float) -> float:
    """It swells first, then falls in on itself; by 0.7 there is nothing left."""
    if implode <= 0.0:
        return 1.0
    if implode < 0.25:
        return 1.0 + 0.2 * math.sin(math.pi * 0.5 * implode / 0.25)
    if implode < 0.7:
        return 1.2 - 1.1 * ((implode - 0.25) / 0.45) ** 1.6
    return 0.0


class VoidMaw(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        rx = BUILD.root_x + pose.get("dx", 0.0)
        cy = GROUND - FLOAT + pose.get("dy", 0.0)
        tilt = pose.get("tilt", 0.0)
        a = math.radians(tilt)
        ca, sa = math.cos(a), math.sin(a)
        s = scale_of(pose.get("implode", 0.0))

        def at(x: float, y: float) -> Pt:
            return (rx + (x * ca - y * sa) * s, cy + (x * sa + y * ca) * s)

        J: dict[str, Pt] = {"body": (rx, cy), "lean": (tilt, 0.0), "mouth": at(11.0, 0.0), "eye": at(-3.5, -5.0)}
        for i, (x, y) in enumerate(ROOTS):
            J[f"root{i}"] = at(x, y)
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def above(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        return {f"t{i}": ChainSpec(Chain(6, 2.3, gravity=0.15 + 0.02 * i, drag=0.2, damp=0.08), (lambda J, i=i: J[f"root{i}"]), above, (-0.45, 0.9))
                for i in range(len(ROOTS))}

    def draw(self, cel, J, pose, ropes, between) -> None:
        implode = pose.get("implode", 0.0)
        s = scale_of(implode)
        bx, by = J["body"]
        tilt = pose.get("tilt", 0.0)
        if s > 0.0:
            # Tentacles: drawn in, joint by joint, as it collapses.
            keep = max(0, min(6, int(round(6 * min(1.0, s)))))
            for i in range(len(ROOTS)):
                pts = ropes[f"t{i}"]
                for n in range(min(keep, len(pts) - 1)):
                    cel.limb(pts[n], pts[n + 1], 2.6 - n * 0.3, 2.3 - n * 0.3, "azure", (1, 2, 4), far=(i % 2 == 0))
                if keep >= 5:
                    cel.put(pts[-1][0], pts[-1][1], ("azure", 7))
            # Wisps of itself fraying off the rim, breathing in and out; none across the mouth.
            aura, ph = pose.get("aura", 0.3), pose.get("pulse", 0.0)
            for i in range(8):
                ang = 70.0 + i * 31.0
                a = math.radians(ang + tilt)
                length = (1.6 + 2.2 * (0.5 + 0.5 * math.sin(math.tau * (ph + i * 0.37)))) * (1.0 + 0.6 * aura) * s
                r0 = 9.0 * s
                p0 = (bx + math.cos(a) * r0, by + math.sin(a) * r0)
                p1 = (bx + math.cos(a) * (r0 + length), by + math.sin(a) * (r0 + length) - 0.4 * length)
                cel.limb(p0, p1, 2.4 * s + 0.4, 0.8, "azure", (0, 1, 3))
                cel.put(p1[0], p1[1], ("azure", 6))
            rows = OPEN if pose.get("jaw", 0.0) > 0.5 else SHUT
            legend = L if pose.get("alive", 1.0) > 0.5 else {**L, "Y": ("brass", 3), "W": ("brass", 5)}
            if abs(s - 1.0) < 0.01:
                cel.stamp_pivot(rows, legend, (bx, by), PIVOT[0], PIVOT[1], tilt)
            else:
                stamp_scaled(cel, rows, legend, (bx, by), tilt, s)
            cel.outline()

        # Fx. The eye never stops burning while it lives.
        if s > 0.6 and pose.get("alive", 1.0) > 0.5:
            ex, ey = J["eye"]
            cel.put(ex, ey, ("light", 0))
        snap = pose.get("snap", 0.0)
        if 0.01 < snap < 0.985:
            mx, my = J["mouth"]
            if snap < 0.35:
                cel.star(mx + 3.0, my, 3)
            for i in range(7):
                a = math.radians(-75 + i * 25.0)
                d = 3.0 + 8.0 * snap
                tone = ("bone", 7) if i % 2 == 0 else ("azure", 7)
                cel.soft(mx + 2.0 + math.cos(a) * d, my + math.sin(a) * d, tone)
                if snap < 0.6:
                    cel.soft(mx + 2.0 + math.cos(a) * (d - 1.2), my + math.sin(a) * (d - 1.2), tone)
        if 0.25 < implode < 0.7:
            # Everything round it is pulled in: streaks of light falling towards the centre.
            u = (implode - 0.25) / 0.45
            for i in range(12):
                a = math.radians(i * 30.0 + 200.0 * u)
                r1 = 22.0 * (1.0 - u) + 4.0
                for d in range(3):
                    cel.soft(bx + math.cos(a) * (r1 - d * 1.4), by + math.sin(a) * (r1 - d * 1.4) * 0.8, ("azure", 7) if d == 0 else ("violet", 6))
        if 0.66 < implode < 0.86:
            # The pop: a point of light, then a ring.
            u = (implode - 0.66) / 0.2
            if u < 0.5:
                cel.star(bx, by, 5)
            else:
                for i in range(16):
                    a = math.radians(i * 22.5)
                    cel.soft(bx + math.cos(a) * (4.0 + 9.0 * u), by + math.sin(a) * (4.0 + 9.0 * u) * 0.8, ("bone", 7) if i % 2 else ("violet", 7))
        if implode >= 0.6:
            # Its teeth are all that is left: they fall and stay where they land.
            for i, (tx, land) in enumerate(TEETH):
                t = min(1.0, (implode - 0.6) / (land - 0.6))
                x = bx + tx * (0.3 + 0.7 * t)
                y = by + (GROUND - 1.5 - by) * t * t
                if implode > land and implode < land + 0.08:
                    y -= 2.0  # one small bounce
                cel.put(x, y, ("bone", 7))
                cel.put(x + (1 if i % 2 else 0), y + (0 if i % 2 else 1), ("bone", 5))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, dy=0.0, tilt=0.0, jaw=0.0, aura=0.3, pulse=0.0, snap=0.0, implode=0.0, alive=1.0, flash=0.0)


def idle_pose(ph: float) -> Pose:
    # It hangs there breathing: the whole thing swells, the jaws part and close again.
    s = math.sin(math.tau * ph)
    return {**BASE, "dy": 1.7 * s, "tilt": 5.0 * math.sin(math.tau * (ph - 0.2)), "jaw": 1.0 if 0.3 <= ph < 0.72 else 0.0,
            "aura": 0.35 + 0.35 * math.sin(math.tau * (ph - 0.1)), "pulse": ph}


def drift_pose(ph: float) -> Pose:
    # Hunting: tilted into its path, jaws open, tentacles streaming behind.
    return {**BASE, "dy": 1.3 * math.sin(math.tau * ph), "tilt": 11.0 + 3.0 * math.sin(math.tau * (ph - 0.25)), "jaw": 1.0,
            "aura": 0.5 + 0.3 * math.sin(2 * math.tau * ph), "pulse": ph}


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Bite: it rears back and up with the jaws at full gape, hangs, then throws itself forward and snaps them shut.
BITE_KEYS = [
    (0.00, k(), "lin"),
    (0.25, k(dx=-4.0, dy=-3.0, tilt=-18.0, jaw=1.0, aura=1.0, pulse=0.3), "out"),
    (0.40, k(dx=-5.0, dy=-3.8, tilt=-23.0, jaw=1.0, aura=1.4, pulse=0.6), "io"),
    (0.47, k(dx=10.0, dy=1.5, tilt=8.0, jaw=1.0, aura=0.4, pulse=0.7), "in"),
    (0.52, k(dx=12.0, dy=2.0, tilt=12.0, jaw=0.0, aura=0.2, pulse=0.75, snap=0.02), "lin"),
    (0.66, k(dx=12.6, dy=2.2, tilt=14.0, jaw=0.0, aura=0.2, pulse=0.9, snap=0.98), "out"),
    (0.85, k(dx=4.0, dy=0.0, tilt=2.0, jaw=0.0, pulse=1.1, snap=1.0), "io"),
    (1.00, k(pulse=1.3, snap=1.0), "io"),
]

# Hit: with nothing to brace against it is simply batted away, tumbling, and has to swim back.
HURT_KEYS = [
    (0.00, k(), "lin"),
    (0.07, k(dx=-1.5, dy=-0.5, tilt=-14.0, jaw=1.0, aura=0.9, pulse=0.1, flash=1.0), "out3"),
    (0.16, k(dx=-5.0, dy=-2.5, tilt=-34.0, jaw=1.0, aura=1.1, pulse=0.2, flash=0.5), "lin"),
    (0.26, k(dx=-7.5, dy=-3.0, tilt=-46.0, jaw=1.0, aura=1.2, pulse=0.3), "out"),
    (0.50, k(dx=-6.0, dy=2.0, tilt=10.0, jaw=0.0, aura=0.2, pulse=0.5), "io"),
    (0.74, k(dx=-2.5, dy=-1.0, tilt=-6.0, pulse=0.8), "io"),
    (1.00, k(pulse=1.0), "io"),
]

# Death: it shudders, swells, and falls in on itself — spinning down to a point that pops. The teeth are left.
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.12, k(dx=-3.0, dy=-2.0, tilt=-26.0, jaw=1.0, aura=1.2, pulse=0.2), "out3"),
    (0.24, k(dx=-4.2, dy=-1.0, tilt=18.0, jaw=1.0, aura=1.5, pulse=0.5, implode=0.1), "io"),
    (0.34, k(dx=-3.4, dy=-1.4, tilt=-10.0, jaw=1.0, aura=1.6, pulse=0.8, implode=0.25), "io"),
    (0.60, k(dx=-4.0, dy=0.0, tilt=250.0, jaw=1.0, aura=0.6, pulse=1.4, implode=0.6, alive=0.0), "in"),
    (0.70, k(dx=-4.0, dy=0.0, tilt=400.0, jaw=1.0, implode=0.72, alive=0.0), "lin"),
    (0.86, k(dx=-4.0, dy=0.0, tilt=400.0, implode=0.9, alive=0.0), "lin"),
    (1.00, k(dx=-4.0, dy=0.0, tilt=400.0, implode=1.0, alive=0.0), "lin"),
]

STILL = lambda t: (0.0, 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [140] * 12, True, STILL),
    "run": Anim("run", drift_pose, [i / 10 for i in range(10)], [80] * 10, True, lambda t: (-1.0, 0.0)),
    "attack": Anim("attack", keyed(BITE_KEYS), [0.0, 0.12, 0.25, 0.33, 0.40, 0.47, 0.52, 0.59, 0.66, 0.76, 0.85, 1.0],
                   [80, 90, 110, 110, 160, 40, 60, 90, 130, 90, 90, 100], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.06, 0.12, 0.18, 0.24, 0.34, 0.42, 0.50, 0.56, 0.60, 0.65, 0.70, 0.76, 0.82, 0.90, 1.0],
                  [50, 50, 70, 70, 80, 110, 60, 60, 60, 50, 50, 60, 60, 80, 120, 1200], False, STILL),
}
