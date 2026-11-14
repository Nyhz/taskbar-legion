"""The Bell-Bearer — world 5, stage boss. A yeti that took the monastery's bell and has carried it ever since: a
hunched mass of dirty grey-white fur, a blue leather face under a heavy brow with two ember eyes, tusks, horns,
icicles hanging from its shoulders and arms, a red prayer rope across its chest, and in its fist, by the crown
rope, a bronze bell as big as a man. It walks heavily and the bell swings. To attack it swings the bell back,
heaves it over its head and brings it down mouth first: it tolls, and a ring of sound runs forward along the
ground with frost spiking up under it. It dies under its own bell: it hoists it one last time, its knees go, and
the bell comes down over it.

Its frame is the boss frame (128 wide, 26 extra rows above). Drawn facing right; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Character, Gait, Pose, Pt, gait_legs, ik, keyed, lerp, loose, stagger_keys

FIGURE = ("BellBearer", "boss", "w05")

BUILD = Build(root_x=52, thigh=9.5, shin=9.0, foot=7.0, hip_dx=3.2, spine=19.0, sh_near=10.0, sh_far=8.5, upper=12.0, fore=11.5, neck=2.0, head_dx=2.5,
              heel=2.4, toe=1.8, min_pelvis=8.0)

L = {
    "f": ("bone", 3), "g": ("bone", 4), "h": ("bone", 5), "w": ("bone", 6), "W": ("bone", 7),
    "k": ("ink", 1), "n": ("ink", 3), "N": ("ink", 5),
    "x": ("azure", 3), "y": ("azure", 4), "z": ("azure", 5), "E": ("brass", 6), "I": ("azure", 8),
    "q": ("crimson", 3), "r": ("crimson", 5),
    "B": ("brass", 2), "C": ("brass", 3), "D": ("brass", 4), "F": ("brass", 5), "J": ("brass", 6), "L": ("brass", 7), "R": ("crimson", 5),
}

# Horns, a brow that shadows the eyes (E), a blue leather face turned three-quarters, tusks (W), a beard of fur.
HEAD = [
    ".n.gghhww.N..",
    "nn.ghhhwwwNN.",
    ".nghhhhwwwwN.",
    "..ghhhkkkkkw.",
    ".gghhxEEyyEz.",
    ".gghhxyyyyzz.",
    ".gghhxyykkzz.",
    "..ghhxWyyyWz.",
    "..gghhxyyzz..",
    "...gghhhww...",
    "....gg.hw....",
]
# A barrel of shaggy fur with icicles at the shoulders, the red prayer rope slung across it, tufts at the hips.
TORSO = [
    "...IggghhhhwwI...",
    "..fgghhhhhwwwww..",
    ".ffgghhhhqhwwwww.",
    "fffgghhhqrhhwwwww",
    "ffgggfhqrhhhhwwww",
    "ffgggqrrhhhhhwwww",
    "ffgqqrfghhhhhwww.",
    ".fqrrgfgghhhhwww.",
    ".ffgggfgghhhwwww.",
    ".ffggffgghhhwww..",
    "..fggfggghhhwww..",
    "..ffgggghhhhww...",
    "..ffggghhhhwww...",
    ".fffgghhhhhwwww..",
    ".ffgfghhghhwhww..",
    ".f.gf.hh.hw.ww...",
    "...g..h...w......",
]
# The monastery's bell: the crown its rope is knotted through, a band, a flared lip, the clapper showing below.
BELL = [
    "........RRR........",
    ".......BDDFJ.......",
    "......BCDDFFJ......",
    ".....BCDDDFFJJ.....",
    "....BCCDDDFFFJJ....",
    "....BCDDDDFFLFJ....",
    "...BCCDDDDFFLFJJ...",
    "...BCCDDDDFFLFFJ...",
    "...BCDDDDDFFLFFJ...",
    "...BCBBBBBBBBBBJ...",
    "...BCDDDDDFFLFFJ...",
    "..BCCDDDDDFFLFFJJ..",
    "..BCCDDDDDFFFLFJJ..",
    "..BCCDDDDFFFFLFJJ..",
    ".BCCCDDDDFFFFFLFJJ.",
    ".BCCDDDDDFFFFFFLJJ.",
    "BBCCDDDDDFFFFFFFJJJ",
    "BCCBBBBBBBBBBBBBBJJ",
    "BBCCDDDDDFFFFFFJJJJ",
    "......kkkDDkkk.....",
    "........kDDk.......",
]
ROPE = 3.0


def bell_crown(hand: Pt, angle: float) -> Pt:
    """Where the bell's crown is: a short rope from the hand, along the way the bell hangs (0 = straight down;
    positive swings it back, behind him)."""
    a = math.radians(angle)
    return (hand[0] - math.sin(a) * ROPE, hand[1] + math.cos(a) * ROPE)


def bell_centre(crown: Pt, angle: float) -> Pt:
    a = math.radians(angle)
    return (crown[0] - math.sin(a) * 10.0, crown[1] + math.cos(a) * 10.0)


class BellBearer(Character):
    build = BUILD
    W = 128
    TOP = 26

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        hand = J["handN"]
        free = pose.get("bell_free", 0.0)
        crown = loose(pose, "bell", bell_crown(hand, pose["bell"]), self.build.root_x)
        # Second hand on the rope when he heaves it.
        w = pose.get("two", 0.0) * (1.0 - free)
        if w > 0.01:
            hx, hy = J["handF"]
            J["elbowF"], J["handF"] = ik(J["shF"], (lerp(hx, hand[0] + 1.5, w), lerp(hy, hand[1] - 1.5, w)), self.build.upper, self.build.fore, +1)
        J["crown"] = crown
        return J

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        hip, knee, ankle, toe = J["hip" + s], J["knee" + s], J["ankle" + s], J["toe" + s]
        cel.limb(hip, knee, 10.5, 8.6, "bone", (3, 4, 6), far=far)
        cel.limb(knee, ankle, 8.6, 7.0, "bone", (3, 4, 6), far=far)
        # A broad blue foot with claws.
        cel.limb(ankle, toe, 5.2, 4.0, "azure", (3, 4, 5), far=far)
        for k_ in (-1.2, 0.0, 1.2):
            cel.put(toe[0] + 1.6, toe[1] + k_ * 0.9 + 0.6, ("bone", 5 if far else 7))
        self.tufts(cel, hip, knee, 4.0, far)

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 10.5, 8.2, "bone", (3, 4, 6), far=far)
        cel.limb(el, hd, 8.2, 6.6, "bone", (3, 4, 6), far=far)
        self.tufts(cel, sh, el, 4.2, far)
        self.tufts(cel, el, hd, 3.4, far)
        # Icicles hanging from the forearm, and a blue fist.
        for t in (0.25, 0.55, 0.8):
            x, y = el[0] + (hd[0] - el[0]) * t, el[1] + (hd[1] - el[1]) * t + 2.6
            cel.line((x, y), (x, y + 2.6 - t), ("azure", 6 if far else 8))
        cel.limb((hd[0] - 0.5, hd[1] - 0.5), (hd[0] + 1.5, hd[1] + 1.0), 6.4, 6.0, "azure", (3, 4, 5), far=far)

    @staticmethod
    def tufts(cel: Cel, a: Pt, b: Pt, r: float, far: bool) -> None:
        """Shag: short dark strokes hanging off the underside of a limb."""
        for t in (0.2, 0.45, 0.7, 0.9):
            x, y = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
            cel.line((x - r * 0.4, y + r * 0.3), (x - r * 0.4 - 1.0, y + r * 0.3 + 2.2), ("bone", 2 if far else 3))

    def draw_bell(self, cel: Cel, J: dict[str, Pt], pose: Pose) -> None:
        tmp = Cel(cel.w, cel.h, cel.top)
        free = pose.get("bell_free", 0.0)
        if free < 0.5:
            tmp.line(J["handN"], J["crown"], ("crimson", 4))
        gong = pose.get("gong", 0.0)
        Lb = {**L, **({"D": ("brass", 5), "F": ("brass", 6), "J": ("brass", 7), "L": ("light", 0)} if gong > 0.5 else {})}
        tmp.stamp_pivot(BELL, Lb, J["crown"], 9.5, 0.5, pose["bell"])
        for (x, y), t in tmp.px.items():
            if y < GROUND:
                cel.px[(x, y)] = t

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        under = pose.get("bell_free", 0.0) > 0.5
        self.arm(cel, J, "F", far=True)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        # The hump of the shoulders, higher than the head.
        la = math.radians(lean)
        hump = (J["chest"][0] - 3.0 * math.cos(la) + 3.0 * math.sin(la), J["chest"][1] - 3.0 * math.sin(la) - 3.0 * math.cos(la))
        belly = (px + math.sin(la) * 8.0, py - math.cos(la) * 8.0)
        cel.limb((belly[0] - 5.0, belly[1]), (belly[0] + 5.0, belly[1]), 13.0, 13.0, "bone", (3, 5, 6))  # the gut, under the rope
        cel.stamp_lean(TORSO, L, (px, py), 8, lean)
        cel.limb((J["shN"][0] - 1.0, J["shN"][1]), hump, 10.0, 12.0, "bone", (3, 4, 6))
        cel.limb(hump, (J["shF"][0] + 1.0, J["shF"][1] + 0.5), 12.0, 9.0, "bone", (4, 5, 6))
        for ox in (-6.0, -2.5, 2.0):  # ice along the hump
            cel.limb((hump[0] + ox, hump[1] - 3.0), (hump[0] + ox - 1.0, hump[1] - 7.0 - (ox % 3)), 2.2, 0.7, "azure", (5, 7, 8))
        hx, hy = J["head"]
        turn = pose.get("head_rot", 0.0) + (lean if abs(lean) > 30 else 0.0)
        alive = pose.get("alive", 1.0)
        cel.stamp_turn(HEAD, {**L, "E": ("brass", 6) if alive > 0.5 else ("ink", 1)}, (hx, hy + 5), 6, turn)
        if not under:
            self.draw_bell(cel, J, pose)
        self.arm(cel, J, "N", far=False)
        if under:
            self.draw_bell(cel, J, pose)
        # Frost spiking up under the ring of sound, in front of everything, cut off at the ground.
        ring = pose.get("ring", 0.0)
        ox = self.build.root_x + pose.get("ring_x", 30.0)
        front = ox + 6.0 + 52.0 * ring
        if 0.01 < ring < 0.985:
            tmp = Cel(cel.w, cel.h, cel.top)
            x = ox + 8.0
            i = 0
            while x < front:
                h = (5.0 + (i * 3 % 4) * 1.6) * max(0.0, 1.0 - (front - x) / 26.0) * (1.0 if ring < 0.8 else (1.0 - ring) / 0.2)
                if h > 1.0:
                    tmp.limb((x, GROUND + 2.0), (x + (1.2 if i % 2 else -0.8), GROUND - h), 3.2, 0.6, "azure", (5, 7, 8))
                x += 6.0
                i += 1
            for (xx, yy), t in tmp.px.items():
                if yy < GROUND:
                    cel.px[(xx, yy)] = t
        cel.outline()

        # Fx: his breath; the toll — arcs of sound running forward from the bell; the toll of the bell that falls.
        steam = pose.get("steam", 0.0)
        if steam > 0.05 and alive > 0.5:
            a = math.radians(turn)
            sx, sy = hx + 7.0 * math.cos(a), hy - 1.0 + 7.0 * math.sin(a)
            for i in range(6):
                cel.soft(sx + 1.5 + i * 1.7 + steam * 4.0, sy - i * 0.8 - steam * 3.0, ("azure", 8 if i < 4 else 6))
        if 0.01 < ring < 0.985:
            for j, lag in enumerate((0.0, 7.0, 14.0)):
                fx = front - lag
                if fx < ox + 6.0:
                    continue
                half = (13.0 - 3.0 * j) * (1.0 - 0.45 * ring)
                for i in range(int(-half), int(half) + 1):
                    bow = 3.5 * (1.0 - (i / half) ** 2)
                    y = GROUND - 2.0 - half + i
                    if y < GROUND - 1:
                        cel.soft(fx + bow, y, ("light", 0) if j == 0 and abs(i) < half * 0.6 else ("azure", 8) if j < 2 else ("azure", 6))
        toll = pose.get("toll", 0.0)
        if 0.01 < toll < 0.985:
            bx, by = bell_centre(J["crown"], pose["bell"])
            for sgn in (-1, 1):
                for j in range(3):
                    r = 9.0 + 4.0 * j + 10.0 * toll
                    for i in range(-5 + j, 6 - j):
                        ang = math.radians(i * 7.0)
                        y = by + 2.0 + math.sin(ang) * r
                        if y < GROUND - 1 and (toll < 0.6 or (i + j) % 2 == 0):
                            cel.soft(bx + sgn * math.cos(ang) * r, y, ("azure", 8) if j == 0 else ("azure", 6))
            for i in range(10):  # snow thrown up where it landed
                ang = math.radians(-170 + i * 18.0)
                d = 5.0 + 12.0 * toll
                y = GROUND - 2 + math.sin(ang) * d * 0.5 + 5.0 * toll * toll
                if y < GROUND - 1:
                    cel.soft(bx + math.cos(ang) * (9.0 + d), y, ("azure", 8) if i % 2 else ("light", 0))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=2.0, lean=12.0, footN=(-7.0, 0.0, 0.0), footF=(7.0, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=35.0, elbN=45.0, armF=6.0, elbF=22.0, bell=0.0, two=0.0, head_dx=0.0, head_dy=0.0, head_rot=0.0, breath=0.0,
                  steam=0.0, ring=0.0, ring_x=30.0, gong=0.0, toll=0.0, alive=1.0, bell_free=0.0, bell_at=(0.0, 0.0))


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    # It heaves as it breathes, the bell turning slowly on its rope; a cloud of breath once a cycle.
    steam = max(0.0, math.sin(math.tau * (ph - 0.15) * 2.0)) if 0.15 < ph < 0.4 else 0.0
    return {**BASE, "breath": 0.6 + 0.6 * s, "lean": 12.0 + 1.6 * s, "drop": 2.0 + 0.5 * late, "head_rot": 5.0 * late, "bell": 6.0 * math.sin(math.tau * (ph - 0.3)),
            "armF": 6.0 + 4.0 * late, "elbF": 22.0 + 5.0 * s, "steam": steam}


def walk_pose(ph: float) -> Pose:
    c = math.cos(math.tau * ph)
    p: Pose = gait_legs(Gait(stride=0.7, give=1.2, lift=0.6, toe=0.5), ph)
    # Each step lands like a dropped sack; the bell swings a beat behind and drags the arm with it.
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 15.0 + 2.0 * math.cos(2 * math.tau * (ph - 0.06)), "dy": 1.0 * (1 + math.cos(2 * math.tau * (ph - 0.1))), "hip_rot": -1.0 * c, "sh_rot": 1.0 * c,
              "armN": 35.0 + 6.0 * math.cos(math.tau * (ph - 0.1)), "bell": 14.0 * math.cos(math.tau * (ph - 0.3)), "armF": 6.0 + 18.0 * math.cos(math.tau * (ph - 0.2)),
              "elbF": 24.0 + 8.0 * math.cos(math.tau * (ph - 0.3)), "head_rot": 4.0 * math.cos(math.tau * (ph - 0.25)), "head_dy": 0.5 * math.cos(2 * math.tau * (ph - 0.2)),
              "steam": max(0.0, math.sin(math.tau * (ph - 0.5))) if ph > 0.5 else 0.0})
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Toll: the bell swings back past its legs, both arms heave it up and over the head, and it comes down mouth
# first on the ground. The bell's angle keeps growing so it always turns the same way: back, up, over, down.
_HIT = dict(two=1.0, dx=4.0, drop=6.0, lean=26.0, armN=50.0, elbN=10.0, bell=360.0, head_rot=12.0, footN=(-11.0, 0.0, -22.0), footF=(8.0, 0.0, 0.0), ring_x=24.0)
TOLL_KEYS = [
    (0.00, k(), "lin"),
    (0.20, k(dx=-1.5, drop=3.0, lean=16.0, armN=-18.0, elbN=20.0, bell=62.0, head_rot=6.0, footN=(-5.5, 0.0, 0.0), footF=(8.5, 0.0, 0.0)), "out"),
    (0.38, k(two=1.0, dx=-3.0, drop=2.4, lean=-6.0, armN=150.0, elbN=14.0, bell=142.0, head_rot=-10.0, footN=(-4.0, 0.0, 0.0), footF=(10.0, 2.4, 10.0), steam=0.6), "out"),
    (0.45, k(two=1.0, dx=-3.4, drop=2.0, lean=-9.0, armN=158.0, elbN=16.0, bell=160.0, head_rot=-12.0, footN=(-3.6, 0.0, 0.0), footF=(10.4, 3.0, 12.0), steam=1.0), "io"),
    (0.51, k(two=1.0, dx=1.5, drop=3.0, lean=10.0, armN=110.0, elbN=10.0, bell=258.0, head_rot=4.0, footN=(-8.5, 0.0, -10.0), footF=(10.5, 0.4, 0.0)), "in"),
    (0.56, k(**_HIT, gong=1.0, ring=0.02), "lin"),
    (0.62, k(**{**_HIT, "drop": 7.0, "lean": 28.0, "bell": 364.0}, gong=1.0, ring=0.22), "out"),
    (0.80, k(**{**_HIT, "drop": 6.6, "bell": 358.0}, gong=0.0, ring=0.98), "lin"),
    (0.90, k(two=1.0, dx=2.0, drop=3.6, lean=18.0, armN=38.0, elbN=30.0, bell=352.0, head_rot=6.0, footN=(-9.0, 0.0, -8.0), footF=(7.0, 0.8, 4.0), ring=1.0, ring_x=24.0), "io"),
    (1.00, k(bell=360.0, ring=1.0, ring_x=24.0), "io"),
]

# Hit: too heavy to be moved far, but the bell is knocked swinging and drags its arm round.
HURT_KEYS = stagger_keys(BASE, push=3.4, bend=8.0, buckle=3.0, whip=14.0, over={
    "impact": dict(armN=30.0, elbN=44.0, bell=-10.0, armF=20.0, elbF=24.0, gong=1.0),
    "mid": dict(armN=38.0, elbN=40.0, bell=-30.0, armF=-16.0, elbF=34.0, gong=0.0),
    "reel": dict(armN=46.0, elbN=36.0, bell=-44.0, armF=-44.0, elbF=40.0, steam=0.5),
    "catch": dict(armN=30.0, elbN=46.0, bell=26.0, armF=18.0, elbF=24.0, steam=1.0),
    "recover": dict(armN=34.0, elbN=45.0, bell=-10.0, armF=10.0, elbF=22.0),
})

# Death: it hoists the bell over its head one last time, its knees go from under it, and the bell comes down
# over it. Only its arms and legs show from under the lip.
_KNEEL = dict(footN=(-12.0, 0.8, -100.0), footF=(-8.0, 0.8, -100.0))
_UNDER = dict(dx=0.0, drop=14.0, lean=80.0, head_rot=0.0, armN=92.0, elbN=4.0, armF=104.0, elbF=-6.0, footN=(-18.5, 1.0, -170.0), footF=(-16.5, 1.8, -170.0),
              alive=0.0, bell_free=1.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-3.0, drop=3.0, lean=2.0, head_rot=-16.0, head_dx=-1.5, armN=30.0, elbN=44.0, bell=-24.0, armF=-40.0, elbF=40.0, footN=(-4.0, 0.0, 0.0), footF=(10.0, 1.4, 8.0)), "out3"),
    (0.28, k(two=1.0, dx=-1.0, drop=3.6, lean=2.0, head_rot=-12.0, armN=166.0, elbN=8.0, bell=180.0, footN=(-6.0, 0.0, 0.0), footF=(8.0, 0.0, 0.0), steam=0.8), "io"),
    (0.40, k(two=1.0, dx=-0.6, drop=4.6, lean=4.0, head_rot=-8.0, armN=170.0, elbN=10.0, bell=188.0, footN=(-6.4, 0.0, 0.0), footF=(7.6, 0.0, 0.0), steam=0.3), "io"),
    (0.50, k(two=1.0, dx=0.0, drop=10.5, lean=16.0, head_rot=10.0, armN=150.0, elbN=34.0, bell=206.0, **_KNEEL, alive=0.4), "in"),
    (0.58, k(**{**_UNDER, "drop": 13.0, "lean": 50.0, "armN": 110.0, "armF": 120.0, **_KNEEL}, bell=300.0, bell_at=(14.0, 34.0)), "in"),
    (0.64, k(**_UNDER, bell=360.0, bell_at=(14.0, 19.5), toll=0.02, gong=1.0), "in"),
    (0.72, k(**_UNDER, bell=355.0, bell_at=(14.0, 22.0), toll=0.4, gong=1.0), "out"),
    (0.80, k(**_UNDER, bell=365.0, bell_at=(14.0, 19.5), toll=0.7), "in"),
    (0.90, k(**_UNDER, bell=364.0, bell_at=(14.0, 19.5), toll=0.98), "out"),
    (1.00, k(**_UNDER, bell=364.0, bell_at=(14.0, 19.5), toll=1.0), "lin"),
]

STILL = lambda t: (0.0, 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [210] * 12, True, STILL),
    "run": Anim("run", walk_pose, [i / 12 for i in range(12)], [125] * 12, True, STILL),
    "attack": Anim("attack", keyed(TOLL_KEYS), [0.0, 0.10, 0.20, 0.29, 0.38, 0.45, 0.51, 0.56, 0.62, 0.68, 0.74, 0.80, 0.90, 0.95, 1.0],
                   [90, 100, 110, 110, 150, 140, 45, 60, 90, 80, 80, 110, 100, 90, 110], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.19, 0.28, 0.34, 0.40, 0.45, 0.50, 0.54, 0.58, 0.64, 0.72, 0.80, 0.90, 1.0],
                  [60, 50, 90, 100, 130, 130, 160, 80, 80, 60, 60, 80, 90, 100, 140, 1400], False, STILL),
}
