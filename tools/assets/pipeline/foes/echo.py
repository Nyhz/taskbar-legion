"""Riftbound Echo — world 10, melee. What the Rift keeps of a knight it took: a man-shaped hole in the world. It
has no surface, only an edge of cold light round a darkness with stars in it (the stars stay where they are while
the figure moves across them: it is a window, not a body), a burning visor slit, a torn cape of the same nothing
and a blade of violet light. It does not move smoothly: it holds a pose and then is suddenly in the next one,
leaving its outline behind for an instant. Its cut leaves a crescent hanging in the air. When it dies it goes
rigid, blazes, and breaks into shards.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, keyed, stagger_keys

FIGURE = ("Echo", "foe", "w10")

BUILD = Build(root_x=40, thigh=6.4, shin=6.2, foot=4.6, hip_dx=1.5, spine=10.0, sh_near=3.6, sh_far=3.0, upper=6.0, fore=5.6, neck=1.0, head_dx=0.4)

#: Tones that survive being turned into void: the visor's light and the cracks.
GLOW, CRACK = ("light", 0), ("violet", 8)
MASS = ("ink", 1)
L = {"x": MASS, "G": GLOW, "c": CRACK}

# A closed helm with a crest like a splinter; the visor slit burns (G); a crack runs down the cheek (c).
HELM = [
    "....x......",
    "...xx.x....",
    "...xxxx....",
    "..xxxxxxx..",
    ".xxxxxxxxx.",
    ".xxxxxxxxxx",
    ".xxxxGGGGGx",
    ".xxxxxxxxxx",
    ".xxxcxxxxx.",
    "..xxxcxxx..",
    "...xxxxx...",
]
# Broad shoulders, a cuirass split by a crack, a fauld.
TORSO = [
    "..xxxxx..",
    ".xxxxxxx.",
    "xxxcxxxxx",
    "xxxxcxxxx",
    ".xxxcxxx.",
    ".xxcxxxx.",
    ".xxxxxxx.",
    "..xxxxx..",
    ".xxxxxxx.",
    ".xx.x.xx.",
]

BLADE = 17.0


def _hash(x: int, y: int) -> int:
    return ((x * 73856093) ^ (y * 19349663)) & 0xFFFF


def voidify(c: Cel, blaze: float) -> None:
    """Turns everything drawn on the cel into a window on the void: darkness, with the stars that are *there*
    (they depend on where the pixel is on screen, not on the figure). `blaze` heats it from inside as it dies."""
    for (x, y), tone in list(c.px.items()):
        if tone in (GLOW, CRACK):
            continue
        h = _hash(x, y)
        if blaze > 0.66:
            c.px[(x, y)] = ("light", 0) if h % 5 == 0 else ("violet", 7)
        elif blaze > 0.33:
            c.px[(x, y)] = ("violet", 7) if h % 7 == 0 else ("violet", 4)
        elif h % 19 == 0:
            c.px[(x, y)] = ("bone", 7)
        elif h % 31 == 0:
            c.px[(x, y)] = ("azure", 7)
        elif h % 4 == 0:
            c.px[(x, y)] = ("violet", 3)
        else:
            # Not the black of the stone it stands on: the deep violet of the Rift itself.
            c.px[(x, y)] = ("violet", 1)


def rim(c: Cel, hot: bool = False, halo: bool = True) -> dict[tuple[int, int], tuple[str, int]]:
    """The edge of light round the hole: a hard bright line, brightest where it faces up and to the right, and
    (`halo`) a dimmer line outside that one, so the figure holds its shape against dark stone."""
    out: dict[tuple[int, int], tuple[str, int]] = {}
    for (x, y) in c.px:
        for nx, ny, lit in ((x + 1, y, True), (x, y - 1, True), (x - 1, y, False), (x, y + 1, False)):
            if (nx, ny) not in c.px and 0 <= nx < c.w and -c.top <= ny < c.h:
                tone = ("light", 0) if hot else ("azure", 8) if lit else ("violet", 7)
                if (nx, ny) not in out or lit:
                    out[(nx, ny)] = tone
    if halo:
        glow = ("violet", 8) if hot else ("violet", 5)
        for (x, y) in list(out):
            for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if n not in c.px and n not in out and 0 <= n[0] < c.w and -c.top <= n[1] < c.h:
                    out[n] = glow
    return out


def crack(c: Cel, a: Pt, b: Pt, skip: int = 0) -> None:
    """A fracture of light running along a limb, jogging from side to side."""
    n = int(max(abs(b[0] - a[0]), abs(b[1] - a[1]))) + 1
    dx, dy = b[0] - a[0], b[1] - a[1]
    d = math.hypot(dx, dy) or 1.0
    for i in range(skip, n - skip):
        t = i / n
        side = 0.7 if (i // 2) % 2 else -0.7
        c.put(a[0] + dx * t - dy / d * side, a[1] + dy * t + dx / d * side, CRACK)


def blade_tip(grip: Pt, angle: float) -> Pt:
    a = math.radians(angle)
    return (grip[0] + math.cos(a) * BLADE, grip[1] + math.sin(a) * BLADE)


class Echo(Character):
    build = BUILD

    def chains(self) -> dict[str, ChainSpec]:
        def behind(pts: list[Pt], J: dict[str, Pt]) -> None:
            lying = abs(J["lean"][0]) > 45.0
            cx, cy = J["chest"]
            px, py = J["pelvis"]
            for i in range(1, len(pts)):
                x, y = pts[i]
                if lying:
                    pts[i] = (x, min(y, GROUND - 1.5))
                    continue
                t = max(0.0, min(1.0, (y - cy) / max(1.0, py - cy)))
                pts[i] = (min(x, cx - 2.6 + (px - 2.4 - (cx - 2.6)) * t), min(y, GROUND - 2.0))

        return {"cape": ChainSpec(Chain(5, 2.7, gravity=0.22, drag=0.16, damp=0.1), lambda J: (J["chest"][0] - 2.4, J["chest"][1] + 1.0), behind)}

    def figure(self, cel: Cel, J: dict[str, Pt], pose: Pose, cape: list[Pt]) -> tuple[Cel, Cel]:
        """The figure as two masses: everything behind the sword arm, and the sword arm itself."""
        back, front = Cel(cel.w, cel.h, cel.top), Cel(cel.w, cel.h, cel.top)
        lean = pose.get("lean", 0.0)
        widths = [3.0, 5.0, 6.4, 6.8, 5.6]
        for i in range(len(cape) - 1):
            back.limb(cape[i], cape[i + 1], widths[i], widths[i + 1], "ink", (1, 1, 1))
        a_, b_ = cape[-2], cape[-1]
        for side in (-2.0, 0.0, 2.0):  # the cape ends in rags
            back.limb((b_[0] + side, b_[1] - 1.0), (b_[0] + side * 1.4 + (b_[0] - a_[0]) * 0.5, b_[1] + 3.0), 2.0, 0.8, "ink", (1, 1, 1))
        for s in "FN":
            back.limb(J["hip" + s], J["knee" + s], 4.6, 3.8, "ink", (1, 1, 1))
            back.limb(J["knee" + s], J["ankle" + s], 3.8, 3.2, "ink", (1, 1, 1))
            back.limb(J["ankle" + s], J["toe" + s], 3.4, 2.4, "ink", (1, 1, 1))
        back.limb(J["shF"], J["elbowF"], 3.8, 3.2, "ink", (1, 1, 1))
        back.limb(J["elbowF"], J["handF"], 3.2, 2.8, "ink", (1, 1, 1))
        px, py = J["pelvis"]
        back.stamp_lean(TORSO, L, (px, py), 4, lean)
        back.limb((J["shN"][0] - 1.0, J["shN"][1]), (J["shN"][0] + 1.0, J["shN"][1] + 0.5), 5.0, 4.6, "ink", (1, 1, 1))  # pauldron
        hx, hy = J["head"]
        back.stamp_turn(HELM, L, (hx, hy + 1), 5, pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0))
        # Fractures of light across the body: down the near leg, through the cape.
        crack(back, J["hipN"], J["kneeN"], 1)
        crack(back, J["kneeN"], J["ankleN"], 2)
        crack(back, cape[1], cape[3], 1)
        front.limb(J["shN"], J["elbowN"], 3.8, 3.2, "ink", (1, 1, 1))
        front.limb(J["elbowN"], J["handN"], 3.2, 2.8, "ink", (1, 1, 1))
        crack(front, J["shN"], J["elbowN"], 1)
        return back, front

    def draw(self, cel, J, pose, ropes, between) -> None:
        blaze = pose.get("crack", 0.0)
        cape = ropes["cape"]
        # Where it was an instant ago: just the outline, already fading.
        if pose.get("ghost", 0.0) > 0.5 and len(between) > 2:
            for idx, tone in ((0, ("violet", 4)), (6, ("violet", 5))):
                Jb, pb = between[idx]
                gb, gf = self.figure(cel, Jb, pb, cape)
                gb.px.update(gf.px)
                for (x, y) in rim(gb, halo=False):
                    if (x + y) % 2 == 0:
                        cel.put(x, y, tone)
                tip = blade_tip(Jb["handN"], pb["sword"])
                cel.line(Jb["handN"], tip, tone)
        back, front = self.figure(cel, J, pose, cape)
        for part in (back, front):
            voidify(part, blaze)
            cel.px.update(rim(part, hot=blaze > 0.66, halo=part is back))  # the arm's edge crosses the body: one line there
            cel.px.update(part.px)
        # The blade: light with no steel under it.
        grip = J["handN"]
        tip = blade_tip(grip, pose["sword"])
        if pose.get("lit", 1.0) > 0.5:
            a = math.radians(pose["sword"])
            guard = (grip[0] + math.cos(a) * 1.5, grip[1] + math.sin(a) * 1.5)
            cel.limb((guard[0] + math.sin(a) * 2.4, guard[1] - math.cos(a) * 2.4), (guard[0] - math.sin(a) * 2.4, guard[1] + math.cos(a) * 2.4), 1.4, 1.4, "violet", (6, 7, 8))
            cel.limb(guard, tip, 4.2, 2.0, "violet", (6, 7, 8))
            cel.limb((guard[0] + math.cos(a), guard[1] + math.sin(a)), (tip[0] - math.cos(a) * 1.5, tip[1] - math.sin(a) * 1.5), 2.2, 1.0, "light", (0, 0, 0))
        # The cut hangs in the air after the blade has gone through.
        arc = pose.get("arc", 0.0)
        if 0.01 < arc < 0.985:
            cx, cy = J["shN"]
            a0, a1 = -118.0 + 110.0 * arc, 42.0
            for r, tone in ((23.5, ("violet", 6)), (22.5, ("violet", 8) if arc < 0.5 else ("violet", 7)), (21.5, ("light", 0) if arc < 0.3 else ("violet", 6))):
                if arc < 0.75 or r == 22.5:
                    cel.arc(cx, cy, r, a0, a1, tone)
        shatter = pose.get("shatter", 0.0)
        if shatter > 0.0:
            self.shatter(cel, J["pelvis"], shatter)

    @staticmethod
    def shatter(cel: Cel, pelvis: Pt, u: float) -> None:
        """The whole figure breaks along a grid of cracks and the pieces fly apart, arc, and scatter on the ground."""
        cx, cy = pelvis[0], pelvis[1] - 6.0
        out: dict[tuple[int, int], tuple[str, int]] = {}
        for (x, y), tone in cel.px.items():
            # Pieces: a skewed grid, each cell split along its diagonal, so they are splinters, not tiles.
            gx, gy = (x + y // 2) // 6, y // 6
            tri = 1 if ((x + y // 2) % 6) + (y % 6) > 6 else 0
            h = _hash(gx * 2 + tri, gy)
            if _hash(x, y) % 10 < u * 5.0:  # they wear away as they fly
                continue
            vx = (gx * 6 - gy * 3 + 3.0 - cx) * 1.0 + ((h % 7) - 3) * 1.1
            vy = (gy * 6 + 3.0 - cy) * 0.5 - 6.0 - (h % 6)
            nx = x + vx * u * 1.6
            ny = y + vy * u * 1.6 + 58.0 * u * u
            if ny >= GROUND - 1:
                # Landed: most of it is gone; what is left lies glinting.
                if _hash(x, y) % 9 != 0:
                    continue
                ny = GROUND - 1 - (_hash(x, y) % 2)
                tone = ("violet", 6) if u > 0.9 and tone[0] != "light" else tone
            xi, yi = int(math.floor(nx)), int(math.floor(ny))
            if 0 <= xi < cel.w and -cel.top <= yi < cel.h:
                out[(xi, yi)] = tone
        cel.px.clear()
        cel.px.update(out)


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=1.0, lean=2.0, footN=(-5.0, 0.0, 0.0), footF=(5.5, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=15.0, elbN=75.0, armF=10.0, elbF=30.0, sword=-40.0, head_dx=0.0, head_dy=0.0, head_rot=0.0, breath=0.0,
                  ghost=0.0, arc=0.0, crack=0.0, shatter=0.0, lit=1.0, flash=0.0)

#: The guard it stands in, and the same guard a hair out of place: where it flickers to.
_SLIP = dict(dx=-1.6, lean=-1.0, sword=-46.0, armF=4.0, head_rot=-6.0)


def idle_pose(ph: float) -> Pose:
    # Dead still — then, twice a cycle, it is somewhere else for a frame, and back.
    i = int(round(ph * 12)) % 12
    if i in (4, 9):
        return {**BASE, **_SLIP, "ghost": 1.0}
    if i in (5, 10):
        return {**BASE, "ghost": 1.0}
    return dict(BASE)


JOG = Gait(stride=0.9, give=1.15, lift=0.85, toe=0.9, run=True, air=1.4)


def run_pose(ph: float) -> Pose:
    # Six poses a stride, each held for two frames: it does not run, it is replaced.
    step = math.floor(ph * 6 + 1e-6)
    q = step / 6
    c = math.cos(math.tau * q)
    p: Pose = gait_legs(JOG, q)
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 7.0, "hip_rot": -0.8 * c, "sh_rot": 0.8 * c, "armN": 15.0 + 5.0 * c, "armF": 10.0 - 26.0 * c, "elbF": 44.0,
              "sword": -40.0 + 6.0 * math.cos(math.tau * (q - 0.1)), "ghost": 1.0 if (ph * 12 + 1e-6) % 2 < 1 else 0.0})
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Cut: the blade goes up behind its head and hangs there; one frame later the cut is already over.
_UP = dict(dx=-2.0, drop=2.0, lean=-7.0, armN=150.0, elbN=42.0, sword=-116.0, armF=30.0, elbF=40.0, head_rot=-6.0, footN=(-3.0, 0.0, 0.0), footF=(7.5, 0.6, 6.0))
_DOWN = dict(dx=5.0, drop=2.4, lean=15.0, armN=52.0, elbN=8.0, sword=42.0, armF=-30.0, elbF=30.0, head_rot=8.0, footN=(-10.0, 0.0, -22.0), footF=(4.5, 0.0, 0.0))
ATTACK_KEYS = [
    (0.00, k(), "lin"),
    (0.20, k(**_UP), "out"),
    (0.40, k(**{**_UP, "lean": -9.0, "sword": -122.0}), "lin"),
    (0.44, k(**_DOWN, ghost=1.0, arc=0.02), "lin"),
    (0.70, k(**{**_DOWN, "lean": 17.0}, arc=0.98), "lin"),
    (0.86, k(dx=2.0, drop=1.6, lean=6.0, armN=30.0, elbN=60.0, sword=-12.0, footN=(-7.0, 0.0, -6.0), footF=(5.5, 0.6, 4.0), arc=1.0, ghost=1.0), "lin"),
    (1.00, k(arc=1.0), "lin"),
]

# Hit: it reels like a man — then snaps back into its guard as if nothing had happened.
HURT_KEYS = stagger_keys(BASE, push=4.2, bend=12.0, buckle=2.4, whip=16.0, over={
    "impact": dict(armF=30.0, elbF=40.0, armN=4.0, elbN=66.0, sword=-52.0),
    "reel": dict(armF=56.0, elbF=20.0, armN=-24.0, elbN=50.0, sword=-82.0),
    "catch": dict(armF=6.0, elbF=40.0, armN=12.0, elbN=70.0, sword=-44.0, ghost=1.0),
})

# Death: it goes rigid, the light inside it rises until it blazes, and it breaks into shards that scatter.
_RIGID = dict(dx=-2.0, drop=0.4, lean=-5.0, armN=-20.0, elbN=20.0, armF=40.0, elbF=10.0, sword=60.0, head_rot=-16.0, footN=(-3.0, 0.0, 0.0), footF=(7.5, 0.0, 0.0))
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-2.4, drop=1.6, lean=-10.0, head_rot=-12.0, armN=0.0, elbN=60.0, sword=-70.0, armF=50.0, elbF=20.0, footN=(-2.6, 0.0, 0.0), footF=(7.9, 1.2, 8.0), ghost=1.0), "out3"),
    (0.26, k(**_RIGID, crack=0.4), "out"),
    (0.42, k(**_RIGID, crack=1.0), "lin"),
    (0.50, k(**_RIGID, crack=1.0, shatter=0.04, lit=0.0), "lin"),
    (0.86, k(**_RIGID, crack=1.0, shatter=0.9, lit=0.0), "lin"),
    (1.00, k(**_RIGID, crack=1.0, shatter=1.0, lit=0.0), "lin"),
]

STILL = lambda t: (-0.2 + 0.2 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [170, 170, 170, 170, 60, 60, 170, 170, 170, 60, 60, 170], True, STILL),
    "run": Anim("run", run_pose, [i / 12 for i in range(12)], [47] * 12, True, lambda t: (-1.0, 0.0)),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.10, 0.20, 0.30, 0.40, 0.44, 0.50, 0.57, 0.64, 0.70, 0.86, 1.0],
                   [90, 80, 90, 110, 170, 50, 80, 80, 80, 110, 90, 120], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.18, 0.26, 0.34, 0.42, 0.50, 0.56, 0.62, 0.68, 0.74, 0.80, 0.86, 0.93, 1.0],
                  [50, 50, 80, 80, 110, 110, 150, 50, 50, 60, 60, 60, 70, 80, 110, 1200], False, STILL),
}
