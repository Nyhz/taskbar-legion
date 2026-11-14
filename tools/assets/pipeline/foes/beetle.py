"""Geode Beetle — world 7, beast. A beetle the size of an ox with its own six-legged rig: a glossy wine-dark
shell, three jagged amber crystals broken out through it that hold light, a heavy armoured head with burning
eyes and mandibles, and a long forked horn. It trundles in alternating threes, paws the stone, drops its head and
CHARGES, ripping the horn upward. When it dies the shell splits down its seam: light spills out of the crack, the
two halves slump apart and the crystals go dark.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Character, Pose, Pt, ik, keyed

FIGURE = ("Beetle", "foe", "w07")

FEMUR, TIBIA = 7.5, 9.0
BUILD = Build(root_x=40, thigh=FEMUR, shin=TIBIA, foot=0.0, hip_dx=0.0, spine=0.0, sh_near=0.0, sh_far=0.0, upper=0.0, fore=0.0, neck=0.0)

L = {
    "k": ("ink", 1), "a": ("crimson", 0), "b": ("crimson", 1), "c": ("crimson", 2), "d": ("crimson", 3), "e": ("crimson", 4), "f": ("crimson", 5),
    "W": ("dusk", 9), "E": ("brass", 6), "O": ("brass", 7),
}

# The shell: two glossy wing cases meeting at a seam (the dark line down column 14), a streak of light where the
# cave's glow lies on the front one, a dark soft belly under them.
SHELL = [
    "...........bbccddd............",
    ".......bbbccccddddeee.........",
    ".....bbbcccccdadddeeffe.......",
    "...abbbcccccddadddeeefWfe.....",
    "..abbbccccccddaddddeeffWfe....",
    ".abbbcccccccddadddddeeeffee...",
    ".abbccccccccddaddddddeeeeeed..",
    "abbbccccccccddadddddddeeeeedd.",
    "abbbcccccccdddaddddddddeeeeddc",
    "abbbccccccddddadddddddddeeddcc",
    "abbbbcccccddddadddddddddddddcc",
    ".abbbbccccccddaddddddddddddcc.",
    "..aabbbbcccccccccccccccccbba..",
    "....kkkaabbbbbbbbbbbbbaakkk...",
    ".......kkkkkkkkkkkkkkkk.......",
]
assert all(len(r) == 30 for r in SHELL), [len(r) for r in SHELL]
#: Where the seam runs, row by row (the column the front half starts at): the shell splits here when it dies.
SEAM = [14] * 12 + [15] * 3
# A heavy armoured head: a brow plate over one burning eye (E, O); the mandibles and the horn are drawn on it.
HEAD = [
    "...bccdd...",
    "..bccddee..",
    ".abccddeef.",
    ".abcEOddef.",
    "abbccddeee.",
    ".abbccddee.",
    "..abbccdd..",
    "...aabbc...",
]
assert all(len(r) == 11 for r in HEAD)

BODY_H = 12.0
#: Leg roots in the body's frame (near side) and where the feet rest; the far side sits a little ahead.
ROOTS = [(9.0, 4.5), (1.5, 5.0), (-8.0, 4.5)]
REST = [15.0, 3.0, -13.0]
LEGS = [("n1", 0, False), ("n2", 1, False), ("n3", 2, False), ("f1", 0, True), ("f2", 1, True), ("f3", 2, True)]
#: Crystals broken out through the shell: (x, y of the root in the body's frame, length, lean in degrees from
#: straight up, ramp). Few and big, and warm — nothing like the cave's own.
SPIKES = [(-7.0, -5.5, 8.0, -32.0, "brass"), (-1.0, -7.0, 12.0, -8.0, "brass"), (5.5, -6.0, 9.0, 18.0, "dusk")]


def crystal_tones(glow: float) -> tuple[tuple[int, int, int], bool]:
    """Shading indices of a crystal for a level of light, and whether its tip burns white."""
    if glow >= 0.9:
        return (5, 7, 8), True
    if glow >= 0.5:
        return (3, 5, 7), True
    if glow >= 0.2:
        return (2, 3, 5), False
    return (1, 2, 3), False


class Beetle(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        rx = BUILD.root_x + pose.get("dx", 0.0)
        by = GROUND - BODY_H + pose.get("dy", 0.0)
        pitch = pose.get("pitch", 0.0)
        a = math.radians(pitch)
        ca, sa = math.cos(a), math.sin(a)

        def at(x: float, y: float) -> Pt:
            return (rx + x * ca - y * sa, by + x * sa + y * ca)

        J: dict[str, Pt] = {"body": (rx, by), "head": at(16.5, 2.5), "neck": at(11.0, 2.0), "lean": (pitch, 0.0)}
        for i, (x, y, _n, _l, _r) in enumerate(SPIKES):
            J[f"spike{i}"] = at(x, y)
        for name, i, is_far in LEGS:
            off = 1.6 if is_far else 0.0
            root = at(ROOTS[i][0] + off, ROOTS[i][1] - (0.8 if is_far else 0.0))
            fx, lift = pose[name]
            goal = (rx + REST[i] + off + fx, GROUND - 1.0 - lift)
            knee, foot = ik(root, goal, FEMUR, TIBIA, -1 if goal[0] >= root[0] else 1)
            J[name + "_root"], J[name + "_knee"], J[name + "_foot"] = root, knee, foot
        return J

    def leg(self, cel: Cel, J: dict[str, Pt], name: str, is_far: bool) -> None:
        root, knee, foot = J[name + "_root"], J[name + "_knee"], J[name + "_foot"]
        cel.limb(root, knee, 3.8, 3.0, "crimson", (1, 2, 4), far=is_far)
        cel.limb(knee, foot, 3.0, 1.4, "crimson", (2, 3, 5), far=is_far)
        for dx_, dy_ in ((0, 0), (1, 0), (0, -1)):  # a pale knuckle at the knee, so the legs read
            cel.put(knee[0] + dx_, knee[1] + dy_, ("bone", 3 if is_far else 6))
        cel.put(foot[0], foot[1], ("bone", 4 if is_far else 6))
        cel.put(foot[0] + 1, foot[1] + 0.5, ("ink", 1))

    def draw(self, cel, J, pose, ropes, between) -> None:
        pitch = pose.get("pitch", 0.0)
        glow = pose.get("glow", 0.6)
        split = pose.get("split", 0.0)
        a = math.radians(pitch)
        ca, sa = math.cos(a), math.sin(a)
        bx, by = J["body"]
        for name, _i, is_far in LEGS:
            if is_far:
                self.leg(cel, J, name, True)
        # The light inside, seen only once the shell has opened.
        core = pose.get("core", 0.0)
        if split > 0.2:
            tone = ("light", 0) if core >= 0.8 else ("brass", 7) if core >= 0.45 else ("brass", 4) if core >= 0.15 else ("ink", 1)
            for dy in range(-7, 6):
                for dx in range(-4, 5):
                    if abs(dx) * 1.3 + abs(dy) * 0.8 < 6.0:
                        cel.put(bx + (dx - 0.5) * ca - dy * sa, by + (dx - 0.5) * sa + dy * ca, tone)
        # Crystals: on the half of the shell they grow from, so they part with it.
        tones, hot = crystal_tones(glow)
        for i, (x, _y, length, lean, ramp) in enumerate(SPIKES):
            rear = x < -0.5
            shift = (-split * 1.0, split * 0.5) if rear else (split * 0.7, split * 0.3)
            tilt = lean + pitch + (-split * 5.0 if rear else split * 4.0) + pose.get("rattle", 0.0) * math.sin(i * 1.7)
            r = math.radians(tilt - 90.0)
            q = J[f"spike{i}"]
            base = (q[0] + shift[0], q[1] + shift[1])
            tip = (base[0] + math.cos(r) * length, base[1] + math.sin(r) * length)
            cel.limb(base, tip, 4.6, 1.0, ramp if glow >= 0.2 else "ink", tones)
            # A jagged shoulder on one side and a lit facet on the other.
            nx, ny = math.cos(r - math.pi / 2), math.sin(r - math.pi / 2)
            mid = (base[0] + math.cos(r) * length * 0.35, base[1] + math.sin(r) * length * 0.35)
            cel.limb((mid[0] + nx * 1.0, mid[1] + ny * 1.0), (mid[0] + nx * 3.4 + math.cos(r) * 2.5, mid[1] + ny * 3.4 + math.sin(r) * 2.5), 2.4, 0.8,
                     ramp if glow >= 0.2 else "ink", tones)
            cel.line((base[0] - nx * 0.8 + math.cos(r) * 2, base[1] - ny * 0.8 + math.sin(r) * 2),
                     (base[0] - nx * 0.2 + math.cos(r) * length * 0.75, base[1] - ny * 0.2 + math.sin(r) * length * 0.75),
                     (ramp if glow >= 0.2 else "ink", tones[2] + 1))
            if hot:
                cel.put(tip[0], tip[1], ("light", 0))
        # Shell, in two halves along the seam.
        rear_rows = [row[:SEAM[j]] + "." * (len(row) - SEAM[j]) for j, row in enumerate(SHELL)]
        front_rows = ["." * SEAM[j] + row[SEAM[j]:] for j, row in enumerate(SHELL)]
        cel.stamp_pivot(rear_rows, L, (bx - split * 1.0, by + split * 0.5), 15.0, 8.0, pitch - split * 5.0)
        cel.stamp_pivot(front_rows, L, (bx + split * 0.7, by + split * 0.3), 15.0, 8.0, pitch + split * 4.0)
        for name, _i, is_far in LEGS:
            if not is_far:
                self.leg(cel, J, name, False)
        # Head and horn.
        hx, hy = J["head"]
        turn = pitch + pose.get("head_rot", 0.0)
        t = math.radians(turn)

        def on_head(x: float, y: float) -> Pt:
            return (hx + x * math.cos(t) - y * math.sin(t), hy + x * math.sin(t) + y * math.cos(t))

        cel.limb(J["neck"], on_head(1.0, 0.0), 8.0, 7.0, "crimson", (0, 1, 3))
        lit = glow >= 0.2
        # Mandibles: two hooked pincers under the face, the far one first.
        for off, is_far in ((1.6, True), (0.0, False)):
            m0, m1, m2 = on_head(6.0 + off, 2.6), on_head(11.0 + off, 4.4), on_head(13.0 + off, 1.6)
            cel.limb(m0, m1, 2.6, 2.0, "bone", (3, 5, 7), far=is_far)
            cel.limb(m1, m2, 2.0, 0.8, "bone", (3, 5, 7), far=is_far)
        cel.stamp_pivot(HEAD, {**L, "E": ("brass", 6) if lit else ("ink", 2), "O": ("brass", 7) if lit else ("ink", 1)}, (hx, hy), 2.0, 4.0, turn)
        # The horn: thick at the brow, sweeping up and forward, forked at the end.
        horn = [on_head(5.0, -2.5), on_head(12.5, -6.5), on_head(17.5, -14.5)]
        cel.limb(horn[0], horn[1], 4.4, 3.2, "bone", (3, 5, 7))
        cel.limb(horn[1], horn[2], 3.2, 1.0, "bone", (3, 5, 7))
        fork = (on_head(14.5, -9.5), on_head(20.5, -11.0))
        cel.limb(fork[0], fork[1], 2.4, 0.9, "bone", (3, 5, 7))
        cel.outline()
        if lit:  # the eye burns through the outline
            ex, ey = on_head(2.6, -0.6)
            cel.put(ex, ey, ("brass", 7))
            cel.put(ex + 1, ey, ("light", 0) if glow >= 0.9 else ("brass", 6))
            cel.put(ex + 2, ey, ("brass", 5))

        # Fx: the crystals shed motes of light; dust from the pawing legs; streaks when it charges; light from the crack.
        if glow >= 0.5:
            ph = pose.get("motes", 0.0)
            for i in range(4):
                u = (ph + i / 4) % 1.0
                q = J[f"spike{(i * 2) % len(SPIKES)}"]
                cel.soft(q[0] + (i * 3.1 % 5.0 - 2.0) + 1.5 * math.sin(math.tau * (u + i * 0.3)), q[1] - 9.0 - 9.0 * u, ("brass", 7) if u < 0.6 else ("brass", 5))
        dust = pose.get("dust", 0.0)
        if dust > 0.05:
            for i in range(int(3 + dust * 6)):
                cel.soft(bx - 17.0 - i * 1.8 - dust * 3.0, GROUND - 1.5 - (i % 3) * 1.4 - dust * 2.0, ("ink", 6 if i % 2 else 5))
        rush = pose.get("rush", 0.0)
        if rush > 0.05:
            for i in range(5):
                y = by - 8.0 + i * 4.0
                for kx in range(int(5 + rush * 9)):
                    cel.soft(bx - 18.0 - (i % 2) * 3.0 - kx, y, ("light", 0) if kx < 2 else ("bone", 6))
        burst = pose.get("burst", 0.0)
        if 0.01 < burst < 0.985:
            for i in range(11):
                ang = math.radians(-160 + i * 14.0)
                dist = 3.0 + (10.0 + (i * 5 % 4) * 2.5) * burst
                x, y = bx - 0.5 + math.cos(ang) * dist, by - 4.0 + math.sin(ang) * dist + 6.0 * burst * burst
                if y < GROUND - 1:
                    cel.soft(x, y, ("light", 0) if burst < 0.35 else ("brass", 7) if i % 2 else ("brass", 5))


# --------------------------------------------------------------------------------------- animations
_LEG0 = {name: (0.0, 0.0) for name, _i, _far in LEGS}
BASE: Pose = dict(dx=0.0, dy=0.0, pitch=0.0, head_rot=6.0, glow=0.6, rattle=0.0, motes=0.0, dust=0.0, rush=0.0, split=0.0, core=0.0, burst=0.0, **_LEG0)
#: Alternating tripod: these three step together, the other three half a cycle later.
OFFSET = {"n1": 0.0, "n3": 0.0, "f2": 0.0, "f1": 0.5, "f3": 0.5, "n2": 0.5}


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    # It breathes under the shell, the crystals pulse, and now and then it rakes the stone with a foreleg.
    paw = max(0.0, math.sin(math.tau * (ph - 0.55) * 2.5)) if 0.55 < ph < 0.95 else 0.0
    return {**BASE, "dy": 0.5 + 0.5 * s, "pitch": 1.2 * late, "head_rot": 8.0 + 6.0 * late, "glow": 0.95 if s > 0.5 else 0.6, "rattle": 2.0 * late, "motes": ph,
            "n1": (-2.5 * paw, 2.6 * paw), "dust": 0.3 * paw}


def walk_pose(ph: float) -> Pose:
    p: Pose = {**BASE}
    stride = 7.0
    for name, _i, _far in LEGS:
        q = (ph + OFFSET[name]) % 1.0
        if q < 0.55:  # planted: slides back under the body
            p[name] = (stride * (0.5 - q / 0.55), 0.0)
        else:  # swings forward, lifted
            t = (q - 0.55) / 0.45
            p[name] = (stride * (t - 0.5), 3.6 * math.sin(math.pi * t))
    # A heavy trundle: the shell rocks fore and aft once per step of each tripod and the head nods against it.
    rock = math.sin(2 * math.tau * (ph - 0.05))
    p.update(dy=0.5 + 0.6 * math.cos(2 * math.tau * ph), pitch=2.2 * rock, head_rot=6.0 - 5.0 * rock, rattle=5.0 * rock, motes=2 * ph, glow=0.6)
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


def planted(dx: float, **legs: tuple[float, float]) -> dict[str, tuple[float, float]]:
    """Every foot stays where it was while the body shifts by dx, except the ones given."""
    return {name: legs.get(name, (-dx, 0.0)) for name, _i, _far in LEGS}


# Charge: it rocks back and paws, drops its head till the horn points at you, hurls itself forward and rips the horn up.
ATTACK_KEYS = [
    (0.00, k(), "lin"),
    (0.20, k(dx=-2.5, dy=1.0, pitch=5.0, head_rot=20.0, glow=1.0, rattle=6.0, dust=0.6, **planted(-2.5, n1=(-1.0, 3.0))), "out"),
    (0.36, k(dx=-3.5, dy=1.6, pitch=7.0, head_rot=27.0, glow=1.0, rattle=-6.0, dust=1.0, **planted(-3.5, f1=(-0.5, 2.6))), "io"),
    (0.44, k(dx=4.0, dy=-0.6, pitch=3.0, head_rot=26.0, glow=1.0, rush=0.7, n1=(3.5, 2.6), f1=(-5.0, 0.0), n2=(-5.0, 0.0), f2=(3.0, 2.2), n3=(3.0, 2.4), f3=(-5.0, 0.0)), "in"),
    (0.52, k(dx=10.5, dy=-1.0, pitch=-7.0, head_rot=-38.0, glow=1.0, rush=1.0, n1=(1.0, 0.0), f1=(2.0, 3.0), n2=(1.0, 2.4), f2=(0.0, 0.0), n3=(0.0, 0.0), f3=(1.5, 2.6)), "lin"),
    (0.66, k(dx=11.0, dy=-0.4, pitch=-9.0, head_rot=-46.0, glow=0.6, **planted(-0.5)), "out"),
    (0.84, k(dx=4.5, dy=0.4, pitch=1.0, head_rot=0.0, n1=(1.0, 2.4), f1=(5.0, 0.0), n2=(5.0, 0.0), f2=(1.0, 2.2), n3=(1.0, 2.4), f3=(5.0, 0.0)), "io"),
    (1.00, k(), "io"),
]

# Hit: the blow lifts its front end and throws the head up; it is shoved back on its hind legs, drops and resets.
HURT_KEYS = [
    (0.00, k(flash=0.0), "lin"),
    (0.07, k(dx=-1.0, pitch=-4.0, head_rot=-16.0, glow=1.0, rattle=10.0, flash=1.0, **planted(-1.0, n1=(1.5, 1.6))), "out3"),
    (0.16, k(dx=-3.0, dy=-0.8, pitch=-9.0, head_rot=-28.0, glow=1.0, rattle=-12.0, dust=0.5, flash=0.5, **planted(-3.0, n1=(2.0, 4.0), f1=(2.5, 3.0), n3=(2.0, 0.0), f3=(2.0, 0.0))), "lin"),
    (0.26, k(dx=-4.4, dy=-0.4, pitch=-7.0, head_rot=-18.0, glow=0.3, rattle=8.0, dust=1.0, flash=0.0, **planted(-4.4, n1=(1.0, 3.0), f1=(1.5, 2.2), n2=(1.5, 2.0), n3=(1.4, 0.0), f3=(1.4, 0.0))), "out"),
    (0.50, k(dx=-4.0, dy=1.2, pitch=4.0, head_rot=18.0, glow=0.3, rattle=-4.0, flash=0.0, **planted(-0.4)), "in"),
    (0.74, k(dx=-1.8, dy=0.2, pitch=0.0, head_rot=8.0, glow=0.6, flash=0.0, n1=(1.2, 2.2), n3=(1.2, 2.2), f2=(1.2, 2.2), f1=(-2.2, 0.0), f3=(-2.2, 0.0), n2=(-2.2, 0.0)), "io"),
    (1.00, k(flash=0.0), "io"),
]

# Death: it staggers, its legs give, and the shell splits down the seam; light pours from the crack and dies.
_DOWN = dict(dy=5.0, head_rot=6.0, n1=(5.0, 0.0), f1=(5.5, 0.0), n2=(1.0, 0.0), f2=(1.5, 0.0), n3=(-4.5, 0.0), f3=(-4.0, 0.0))
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-2.4, dy=-1.0, pitch=-8.0, head_rot=-24.0, glow=1.0, rattle=12.0, **planted(-2.4, n1=(2.0, 3.4), f1=(2.0, 2.6))), "out3"),
    (0.26, k(dx=-3.0, dy=1.4, pitch=3.0, head_rot=14.0, glow=1.0, rattle=-8.0, **planted(-3.0, n2=(3.0, 2.0))), "io"),
    (0.40, k(dx=-2.2, dy=3.0, pitch=-2.0, head_rot=14.0, glow=1.0, rattle=10.0, n1=(3.0, 0.0), f1=(3.5, 0.0), n2=(1.5, 0.0), f2=(2.0, 0.0), n3=(-1.5, 0.0), f3=(-1.0, 0.0)), "io"),
    (0.50, k(dx=-2.0, **_DOWN, pitch=1.0, glow=1.0, split=0.3, core=1.0, burst=0.02), "in"),
    (0.62, k(dx=-2.0, **_DOWN, pitch=0.0, glow=0.5, split=1.6, core=1.0, burst=0.5), "out"),
    (0.76, k(dx=-2.0, **_DOWN, pitch=0.0, glow=0.2, split=3.2, core=0.5, burst=0.98), "io"),
    (0.90, k(dx=-2.0, **_DOWN, pitch=0.0, glow=0.0, split=3.4, core=0.2, burst=1.0), "lin"),
    (1.00, k(dx=-2.0, **_DOWN, pitch=0.0, glow=0.0, split=3.4, core=0.0, burst=1.0), "lin"),
]

STILL = lambda t: (0.0, 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [160] * 12, True, STILL),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [75] * 12, True, STILL),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.10, 0.20, 0.28, 0.36, 0.44, 0.48, 0.52, 0.59, 0.66, 0.75, 0.84, 0.92, 1.0],
                   [80, 90, 110, 110, 160, 40, 40, 60, 100, 130, 90, 90, 80, 100], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.18, 0.26, 0.33, 0.40, 0.45, 0.50, 0.56, 0.62, 0.69, 0.76, 0.90, 1.0],
                  [50, 50, 80, 70, 90, 80, 100, 70, 60, 70, 90, 100, 120, 200, 1200], False, STILL),
}
