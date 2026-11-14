"""Shardling — world 7, melee. A thing shaped like a person out of plates of rose quartz: a faceted head with one
slit of light, a chest with a burning core, legs that end in points and, instead of forearms, two long blades. A
few loose shards float over its head and trail behind it. It moves in sharp, clipped steps, runs with both blades
swept back, opens them wide and closes them like scissors. When it dies it cracks white and shatters: the pieces
fly, fall and lie on the stone, and the light in the core goes out.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, keyed, stagger_keys, swing_smear

FIGURE = ("Shardling", "foe", "w07")

BUILD = Build(root_x=40, thigh=6.0, shin=6.4, foot=2.4, hip_dx=1.6, spine=9.8, sh_near=4.6, sh_far=3.8, upper=5.6, fore=9.5, neck=0.8, head_dx=0.6)

L = {"a": ("dusk", 3), "b": ("dusk", 4), "c": ("dusk", 5), "d": ("dusk", 6), "e": ("dusk", 7), "f": ("dusk", 8)}

# A faceted shard for a head, lit from the front, with one slit of light for an eye (E).
HEAD = [
    "...d...f...",
    "..cde.eff..",
    "..cdeeeff..",
    ".bcdeeefff.",
    ".bcdEEEfff.",
    "abccdeeeff.",
    ".abccddeef.",
    "..abccdde..",
    "...abccd...",
    "....abc....",
]
# Plates overlapping like scales, broad at the shoulders; the core burns behind them (O, W).
TORSO = [
    "..bbcdeff..",
    ".abbcdeeff.",
    "aabbcdOeeff",
    "aabccOWOeff",
    ".abbcdOeeff",
    ".aabbcdeef.",
    "..abbcdeef.",
    "..aabcdee..",
    "...abcde...",
    "..aab.cde..",
    "..ab...de..",
]


def light_tones(glow: float) -> dict[str, tuple[str, int]]:
    if glow >= 0.9:
        return {"E": ("light", 0), "O": ("brass", 7), "W": ("light", 0)}
    if glow >= 0.4:
        return {"E": ("brass", 7), "O": ("brass", 5), "W": ("brass", 7)}
    if glow >= 0.12:
        return {"E": ("brass", 4), "O": ("dusk", 6), "W": ("brass", 4)}
    return {"E": ("dusk", 2), "O": ("dusk", 3), "W": ("dusk", 2)}


class Shardling(Character):
    build = BUILD

    def chains(self) -> dict[str, ChainSpec]:
        # Loose shards that float above the head: a rope that falls upwards, so they lag and trail.
        return {"crest": ChainSpec(Chain(4, 2.8, gravity=-0.14, drag=0.2, damp=0.12), lambda J: (J["head"][0] - 0.5, J["head"][1] - 10.0), None, (-0.25, -1.0))}

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        hip, knee, ankle, toe = J["hip" + s], J["knee" + s], J["ankle" + s], J["toe" + s]
        cel.limb(hip, knee, 4.8, 3.4, "dusk", (3, 5, 8), far=far)
        cel.limb(knee, ankle, 3.8, 1.6, "dusk", (3, 6, 9), far=far)
        cel.limb(ankle, toe, 1.8, 0.8, "dusk", (4, 6, 8), far=far)
        cel.put(knee[0] + 1, knee[1] - 1, ("dusk", 7 if far else 9))  # a knee spur

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, tip = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 4.0, 3.0, "dusk", (3, 5, 8), far=far)
        # The forearm is a blade: it swells past the elbow and runs out to a point.
        belly = (el[0] + (tip[0] - el[0]) * 0.32, el[1] + (tip[1] - el[1]) * 0.32)
        cel.limb(el, belly, 3.0, 5.0, "dusk", (4, 7, 9), far=far)
        cel.limb(belly, tip, 5.0, 0.7, "dusk", (4, 7, 9), far=far)
        if not far:
            cel.line(belly, tip, ("light", 0))

    def draw(self, cel, J, pose, ropes, between) -> None:
        shatter = pose.get("shatter", 0.0)
        glow = pose.get("glow", 0.6)
        if shatter > 0.12:
            self.pieces(cel, J, shatter)
            cel.outline()
            return
        lean = pose.get("lean", 0.0)
        Lg = {**L, **light_tones(glow)}
        self.arm(cel, J, "F", far=True)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        cx_, cy_ = J["chest"]
        for bx_, by_, tx_, ty_ in ((-2.0, 2.0, -8.5, -4.0), (-2.5, 5.0, -8.0, 3.0)):  # shards growing out of its back
            cel.limb((cx_ + bx_, cy_ + by_), (cx_ + tx_, cy_ + ty_), 3.0, 0.8, "dusk", (3, 5, 7))
        cel.stamp_lean(TORSO, Lg, (px, py), 5, lean)
        for sh, sgn in ((J["shN"], -1.0), (J["shF"], 1.0)):  # shoulder spurs
            cel.limb((sh[0], sh[1]), (sh[0] + sgn * 3.2, sh[1] - 6.4), 3.2, 0.7, "dusk", (4, 7, 9) if sgn < 0 else (3, 5, 7))
        hx, hy = J["head"]
        turn = pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0)
        cel.stamp_turn(HEAD, Lg, (hx, hy + 1), 5, turn)
        crest = ropes["crest"]
        for i, (cx, cy) in enumerate(crest[1:]):
            n = 3.6 - i * 0.7
            cel.limb((cx, cy + n * 0.5), (cx + 0.4, cy - n * 0.5), 2.2 - i * 0.3, 0.7, "dusk", (5, 7, 9))
        self.arm(cel, J, "N", far=False)
        cel.outline()

        if pose.get("smear", 0.0) > 0.5 and len(between) > 2:
            for s in "NF":
                swing_smear(cel, [Jb["hand" + s] for Jb, _p in between], [Jb["sh" + s] for Jb, _p in between])
        # Light catching on the facets.
        ph = pose.get("sparkle", 0.0)
        for i, at in enumerate((J["handN"], (hx + 1.0, hy - 9.0), J["shF"])):
            u = (ph + i / 3) % 1.0
            if u < 0.22:
                cel.put(at[0], at[1], ("light", 0))
                if u < 0.11:
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        cel.soft(at[0] + dx, at[1] + dy, ("brass", 7))
        if pose.get("crack", 0.0) > 0.5:  # white fractures running through it, the moment before it goes
            cx, cy = J["chest"]
            path = [(cx - 1.0, cy - 3.0), (cx + 1.5, cy + 1.0), (cx - 1.5, cy + 4.0), (cx + 1.0, cy + 7.0), (px - 1.0, py), (px + 1.5, py + 4.0)]
            for p0, p1 in zip(path, path[1:]):
                cel.line(p0, p1, ("light", 0))
            cel.line((cx + 1.5, cy + 1.0), (cx + 5.0, cy - 1.0), ("light", 0))
            cel.line((hx - 1.0, hy - 6.0), (hx + 1.0, hy - 2.0), ("light", 0))

    @staticmethod
    def pieces(cel: Cel, J: dict[str, Pt], u: float) -> None:
        """The body as loose shards: each leaves from where its part was, tumbles through the air, lands and lies still."""
        names = ["head", "chest", "shN", "shF", "elbowN", "elbowF", "handN", "handF", "pelvis", "kneeN", "kneeF", "ankleN", "ankleF"]
        origins = [J[n] for n in names] + [((J["chest"][0] + J["pelvis"][0]) / 2, (J["chest"][1] + J["pelvis"][1]) / 2)]
        t_now = (u - 0.12) / 0.88 * 25.0
        floor = GROUND - 1.5
        for i, (ox, oy) in enumerate(origins):
            vx = ((i * 37) % 11 - 5) * 0.26 - 0.2
            vy = -(0.8 + ((i * 53) % 7) * 0.22)
            length = 3.4 + (i * 29) % 4
            t, x, y, landed = 0.0, ox, oy, False
            while t < t_now:
                t += 0.25
                x, y = ox + vx * t, oy + vy * t + 0.16 * t * t
                if y >= floor:
                    y, landed = floor, True
                    break
            ang = math.radians(((i * 61) % 180) + (0.0 if landed else t * 38.0 * (1 if i % 2 else -1)))
            if landed:
                ang = math.radians(8.0 if i % 2 else 172.0)
            dx, dy = math.cos(ang) * length / 2, math.sin(ang) * length / 2
            tones = (2, 4, 6) if landed and u > 0.7 else (5, 7, 9) if i % 3 else (3, 5, 7)
            cel.limb((x - dx, y - dy), (x + dx, y + dy), 2.6, 0.8, "dusk", tones)
            if i == 1:  # the core: the last thing to stop shining
                cel.put(x, y - 0.5, ("light", 0) if u < 0.55 else ("brass", 6) if u < 0.8 else ("brass", 3) if u < 0.95 else ("dusk", 3))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=0.8, lean=4.0, footN=(-4.0, 0.0, 0.0), footF=(4.5, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=-24.0, elbN=-8.0, armF=20.0, elbF=-6.0, head_dx=0.0, head_dy=0.0, head_rot=0.0, breath=0.0,
                  glow=0.6, smear=0.0, sparkle=0.0, crack=0.0, shatter=0.0, flash=0.0)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    # Nearly still, then the head snaps to a new angle: it does not ease, it clicks.
    snap = 9.0 if 0.2 < ph < 0.55 else -7.0 if 0.7 < ph < 0.9 else 0.0
    return {**BASE, "breath": 0.3 + 0.3 * s, "drop": 0.8 + 0.3 * late, "head_rot": snap, "armN": -24.0 + 3.0 * late, "armF": 20.0 - 3.0 * s,
            "glow": 0.95 if s > 0.6 else 0.6, "sparkle": ph}


def run_pose(ph: float) -> Pose:
    c = math.cos(math.tau * ph)
    p: Pose = gait_legs(Gait(stride=1.0, give=0.9, lift=1.0, toe=0.3, run=True, air=1.0), ph)
    # It runs on its points with both blades swept back behind it, the body hardly moving.
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 11.0 + 1.5 * math.cos(2 * math.tau * ph), "hip_rot": -0.5 * c, "sh_rot": 0.6 * c,
              "armN": -58.0 + 8.0 * c, "elbN": -10.0, "armF": -36.0 - 8.0 * c, "elbF": -8.0, "head_rot": 4.0, "sparkle": 2 * ph})
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Scissors: both blades open wide, one behind and one above; it hangs a beat, then they close across each other.
ATTACK_KEYS = [
    (0.00, k(), "lin"),
    (0.22, k(dx=-1.5, drop=2.0, lean=-6.0, armN=-118.0, elbN=-24.0, armF=138.0, elbF=14.0, head_rot=-8.0, footN=(-2.5, 0.0, 0.0), footF=(6.0, 0.8, 6.0), glow=1.0), "out"),
    (0.38, k(dx=-2.0, drop=2.4, lean=-8.0, armN=-128.0, elbN=-26.0, armF=148.0, elbF=16.0, head_rot=-10.0, footN=(-2.0, 0.0, 0.0), footF=(6.5, 1.4, 8.0), glow=1.0, sparkle=0.5), "io"),
    (0.45, k(dx=3.0, drop=2.0, lean=8.0, armN=-24.0, elbN=0.0, armF=96.0, elbF=30.0, head_rot=4.0, footN=(-7.0, 0.0, -12.0), footF=(3.5, 0.4, 0.0), glow=1.0, smear=1.0), "in"),
    (0.51, k(dx=5.5, drop=2.2, lean=14.0, armN=70.0, elbN=26.0, armF=40.0, elbF=44.0, head_rot=10.0, footN=(-9.5, 0.0, -20.0), footF=(1.0, 0.0, 0.0), glow=1.0, smear=1.0), "lin"),
    (0.64, k(dx=6.0, drop=2.4, lean=16.0, armN=78.0, elbN=28.0, armF=34.0, elbF=46.0, head_rot=12.0, footN=(-10.0, 0.0, -22.0), footF=(0.5, 0.0, 0.0)), "out"),
    (0.84, k(dx=2.5, drop=1.2, lean=6.0, armN=10.0, elbN=0.0, armF=30.0, elbF=6.0, footN=(-6.5, 0.0, -8.0), footF=(3.0, 0.6, 4.0)), "io"),
    (1.00, k(), "io"),
]

# Hit: it rings like glass; the blades are thrown wide and the core flickers.
HURT_KEYS = stagger_keys(BASE, push=3.4, bend=10.0, buckle=1.6, whip=14.0, over={
    "impact": dict(armN=-10.0, armF=40.0, glow=1.0),
    "reel": dict(armN=-72.0, elbN=-20.0, armF=98.0, elbF=10.0, glow=0.2),
    "catch": dict(armN=-12.0, elbN=-4.0, armF=30.0, elbF=0.0, glow=1.0),
})

# Death: it is driven back, arches, cracks white from head to hip — and comes apart.
_BREAK = dict(dx=-3.5, drop=1.0, lean=-16.0, head_rot=-26.0, armN=-110.0, elbN=-20.0, armF=150.0, elbF=20.0, footN=(-2.0, 0.0, 0.0), footF=(8.0, 0.0, 10.0))
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-2.5, drop=1.4, lean=-10.0, head_rot=-18.0, armN=-60.0, elbN=-14.0, armF=100.0, elbF=10.0, footN=(-1.5, 0.0, 0.0), footF=(7.0, 1.2, 10.0), glow=1.0), "out3"),
    (0.18, k(**_BREAK, glow=1.0), "io"),
    (0.24, k(**_BREAK, glow=1.0, crack=1.0, flash=1.0), "lin"),
    (0.30, k(**_BREAK, glow=1.0, crack=1.0, shatter=0.13), "lin"),
    (0.85, k(**_BREAK, glow=0.0, crack=1.0, shatter=1.0), "lin"),
    (1.00, k(**_BREAK, glow=0.0, crack=1.0, shatter=1.0), "lin"),
]

STILL = lambda t: (-0.15 + 0.15 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [150] * 12, True, STILL),
    "run": Anim("run", run_pose, [i / 12 for i in range(12)], [50] * 12, True, lambda t: (-0.9, 0.0)),
    "attack": Anim("attack", keyed(ATTACK_KEYS), [0.0, 0.11, 0.22, 0.30, 0.38, 0.45, 0.51, 0.57, 0.64, 0.74, 0.84, 0.92, 1.0],
                   [70, 80, 100, 110, 170, 40, 50, 90, 130, 90, 90, 80, 100], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.18, 0.24, 0.30, 0.36, 0.42, 0.48, 0.55, 0.62, 0.70, 0.78, 0.85, 1.0],
                  [50, 50, 80, 90, 130, 50, 50, 50, 60, 60, 70, 80, 90, 130, 1200], False, STILL),
}
