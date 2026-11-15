"""Ember Stoker — world 8, support. The one who keeps the forges' creatures burning: a stooped, ash-pale figure in a
soot hood with one round goggle, a leather apron and a scarf over the mouth, who carries on its back a tall iron
crook with a fire-basket hanging from it, high over everybody's heads. It works a hand bellows as it stands: every
squeeze makes the fire in the basket leap — that loop is its aura. It trots bent double with the basket swinging
and the flame streaming back. To attack it whips the crook forward and a cinder flies out of the basket. When it
dies it pitches onto its face, the crook comes down over it, the basket hits the road and the fire goes out in a
scatter of embers and a thread of smoke.

Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Gait, Pose, Pt, gait_legs, keyed, stagger_keys

FIGURE = ("Stoker", "foe", "w08")

BUILD = Build(root_x=40, thigh=5.8, shin=5.6, foot=3.6, hip_dx=1.4, spine=9.6, sh_near=3.0, sh_far=2.6, upper=5.2, fore=5.0, neck=0.4, head_dx=1.4,
              min_pelvis=3.6)

L = {
    "a": ("bone", 1), "b": ("bone", 2), "c": ("bone", 3), "d": ("bone", 4), "e": ("bone", 5),
    "l": ("leather", 3), "m": ("leather", 4), "n": ("leather", 5), "o": ("leather", 6),
    "k": ("ink", 1), "r": ("crimson", 3), "s": ("crimson", 4), "t": ("crimson", 5),
    "u": ("ink", 2), "v": ("ink", 3), "w": ("ink", 4), "x": ("ink", 5),
}

# A soot hood with a peak hanging behind, one round goggle (G glows with the fire) and a scarf over the mouth.
HEAD = [
    "..aFFF....",
    ".abbccdd..",
    "abbccddde.",
    "abbckkkde.",
    ".bbckGGkd.",
    ".bbckGGkd.",
    "..bcckkde.",
    "..rsssttt.",
    "...rsstt..",
]
# Ashen shirt, a leather apron over the front and its strap.
TORSO = [
    ".uvwwx..",
    "uuvmwwx.",
    "uuvmnwx.",
    "uulmnox.",
    ".ulmnoo.",
    ".ulmnno.",
    ".ulmnno.",
    "..lmnn..",
    "..lmnn..",
]

POLE, HOOK = 24.0, 6.0
#: The cinder it throws: where it leaves the basket and where it lands (x from the root, height above the ground).
LOB_TO = (38.0, 1.0)


def turned(J: dict[str, Pt], lean: float, x: float, y: float) -> Pt:
    """An offset from the chest that turns with the torso."""
    a = math.radians(lean)
    cx, cy = J["chest"]
    return (cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a))


class Stoker(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        # The crook is strapped to the back: it stands on the shoulders and tips with `pole` (0 = straight up,
        # positive = forward). Its hooked end reaches forward, and the basket hangs from that.
        base = turned(J, pose.get("lean", 0.0), -2.6, 1.0)
        p = math.radians(pose["pole"])
        tip = (base[0] + math.sin(p) * POLE, min(base[1] - math.cos(p) * POLE, GROUND - 1.0))
        hook = (tip[0] + math.cos(p) * HOOK, min(tip[1] + math.sin(p) * HOOK, GROUND - 1.5))
        J["pole_base"], J["pole_tip"], J["hook"] = base, tip, hook
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def grounded(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 2.5))

        return {"cage": ChainSpec(Chain(3, 2.4, gravity=0.34, drag=0.07, damp=0.05), lambda J: J["hook"], grounded)}

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        cel.limb(J["hip" + s], J["knee" + s], 3.6, 3.0, "ink", (2, 3, 5), far=far)
        cel.limb(J["knee" + s], J["ankle" + s], 3.0, 2.6, "ink", (2, 3, 4), far=far)
        a_, t_ = J["ankle" + s], J["toe" + s]
        cel.limb((a_[0] - 0.8, a_[1] + 0.4), (t_[0], t_[1] + 0.2), 2.6, 2.0, "leather", (2, 4, 5), far=far)

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 3.0, 2.6, "bone", (3, 4, 6), far=far)
        cel.limb(el, hd, 2.6, 2.4, "bone", (2, 4, 5), far=far)
        cel.put(hd[0], hd[1], ("leather", 4 if far else 6))  # a glove
        cel.put(hd[0] + 1, hd[1], ("leather", 3 if far else 5))

    @staticmethod
    def bellows(cel: Cel, a: Pt, b: Pt, sq: float) -> None:
        """A hand bellows between the two hands, its nozzle forward: two boards hinged at the nose with folded
        leather between them — wide open, or squeezed flat."""
        mx, my = (a[0] + b[0]) / 2 + 0.5, (a[1] + b[1]) / 2
        gap = 3.4 - 2.6 * sq  # half the opening at the back
        nose = (mx + 4.2, my - 0.6)
        top, bot = (mx - 3.0, my - gap), (mx - 3.0, my + gap)
        for (x, y) in cel.poly_mask([top, nose, bot]):
            u = (y + 0.5 - my) / max(0.6, gap)
            cel.put(x, y, ("ink", 2) if (x + int(mx)) % 2 else ("leather", 2 if u > 0.2 else 3))  # the folds
        cel.limb(top, nose, 1.5, 1.2, "leather", (4, 6, 7))
        cel.limb(bot, nose, 1.5, 1.2, "leather", (2, 4, 5))
        cel.put(nose[0] + 0.6, nose[1], ("brass", 5))
        cel.put(nose[0] + 1.6, nose[1], ("brass", 6))

    @staticmethod
    def basket(cel: Cel, c: Pt, tipped: float = 0.0, cold: float = 0.0) -> None:
        """An iron fire-basket, dark against its own fire: a flared rim, bars and a round bottom. `tipped`: it
        lies on its side on the road, mouth forward, its coals spilled in front (`cold` 0→1 as they go out)."""
        x, y = c
        if tipped > 0.5:
            g = GROUND - 1
            for dy in range(0, 8):
                cel.put(x + 4, g - dy, ("ink", 7 if dy > 4 else 6))  # the rim, standing up
            for row, tone in ((1, ("ink", 3)), (2, ("ink", 5)), (3, ("ink", 2)), (4, ("ink", 5)), (5, ("ink", 2)), (6, ("ink", 6))):
                for dx in range(-2 if row in (1, 6) else -3, 4):
                    cel.put(x + dx, g - row, tone)
            for dx in range(-2, 4):
                cel.put(x + dx, g, ("ink", 2))
            cel.put(x - 4, g - 3, ("ink", 4))
            cel.put(x - 4, g - 4, ("ink", 5))
            coal = ("brass", 5) if cold < 0.25 else ("crimson", 4) if cold < 0.55 else ("crimson", 3) if cold < 0.85 else ("crimson", 2)
            dull = ("crimson", 4) if cold < 0.25 else ("crimson", 3) if cold < 0.55 else ("ink", 3) if cold < 0.85 else ("ink", 2)
            for dx, tone in ((6, coal), (7, dull), (8, coal), (10, dull), (11, coal)):
                cel.put(x + dx, g, tone)
            cel.put(x + 7, g - 1, coal)
            return
        for dx in range(-5, 6):
            cel.put(x + dx, y, ("ink", 4 if dx > 1 else 3))  # the rim
        for dx, tone in ((-4, ("ink", 2)), (-2, ("ink", 2)), (0, ("ink", 3)), (2, ("ink", 3)), (4, ("ink", 3))):
            cel.put(x + dx, y + 1, tone)
            cel.put(x + dx * 0.85, y + 2, tone)
            cel.put(x + dx * 0.7, y + 3, tone)
        for dx in range(-3, 4):
            cel.put(x + dx, y + 4, ("ink", 2 if dx < 1 else 3))
        for dx in range(-2, 3):
            cel.put(x + dx, y + 5, ("ink", 2))

    @staticmethod
    def flame(cel: Cel, c: Pt, fire: float, ph: float, wind: float, coals: bool = True) -> None:
        """The fire: a tongue that sways, leaps with `fire` and trails back with `wind`. It is built to read by
        value on a red sky — a white core, a pale yellow body, and a rim of deep red all the way round."""
        if fire <= 0.04:
            return
        x, y = c
        h = 5.0 + 8.0 * fire
        n = int(round(h))
        body: set[tuple[int, int]] = set()
        for j in range(n + 1):
            u = j / max(1, n)  # 0 at the coals, 1 at the tip
            sway = math.sin(math.tau * (ph + u * 0.7)) * (0.4 + 1.5 * u) - wind * u * u * 3.0
            half = (4.4 if fire > 0.5 else 3.4) * (1.0 - u) ** 0.8 + 0.3
            for i in range(-5, 6):
                d = abs(i) / max(0.3, half)
                if d <= 1.0:
                    if d < 0.5 and u < 0.6:
                        tone = ("light", 0)
                    elif d < 0.8 and u < 0.85:
                        tone = ("brass", 7)
                    else:
                        tone = ("brass", 5)
                    k_ = (int(math.floor(x + i + sway)), int(math.floor(y - 1 - j)))
                    cel.px[k_] = tone
                    body.add(k_)
        for (px, py) in body:
            for ox, oy in ((1, 0), (-1, 0), (0, -1), (0, 1)):
                k_ = (px + ox, py + oy)
                if k_ not in body and k_ not in cel.px and k_[1] >= 0:
                    cel.px[k_] = ("crimson", 3)
        if coals:
            # The coals glow through the bars.
            for dx in (-3, -1, 1, 3):
                cel.put(x + dx, y + 1, ("brass", 7) if fire > 0.5 else ("crimson", 5))
                cel.put(x + dx * 0.85, y + 2, ("brass", 5) if fire > 0.5 else ("crimson", 4) if fire > 0.3 else ("crimson", 3))
                cel.put(x + dx * 0.7, y + 3, ("crimson", 4) if fire > 0.5 else ("crimson", 3))

    @staticmethod
    def plume(cel: Cel, c: Pt, fire: float, ph: float, wind: float) -> None:
        """A short plume of dark smoke off the top of the fire, drifting back: what marks it against a bright sky."""
        tip_y = c[1] - 1.0 - (5.0 + 8.0 * fire)
        for i in range(5):
            u = (ph + i / 5) % 1.0
            x = c[0] - 1.0 - (1.0 + 9.0 * u) * (0.6 + 0.6 * wind) + math.sin(math.tau * (u * 1.5 + i * 0.3)) * 0.8
            y = tip_y - 1.0 - 5.5 * u ** 0.8
            tone = ("ink", 1) if u < 0.4 else ("ink", 2) if u < 0.75 else ("ink", 3)
            if u < 0.15:
                blob = ((0, 0), (1, 0), (0, -1))
            elif u < 0.6:
                blob = ((0, 0), (1, 0), (2, 0), (0, -1), (1, -1), (2, -1), (1, -2), (1, 1))
            elif u < 0.85:
                blob = ((0, 0), (1, 0), (0, -1), (1, -1), (-1, 0))
            else:
                blob = ((0, 0), (1, 0))
            for ox, oy in blob:
                if y + oy >= 1.0:
                    cel.soft(x + ox, y + oy, tone)

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        fire = pose.get("fire", 1.0)
        # What the fire lights on the body: the goggle's lens and the crown of the hood.
        Lg = {**L, "G": ("light", 0) if fire > 0.6 else ("brass", 6) if fire > 0.3 else ("brass", 4) if fire > 0.1 else ("ink", 2),
              "F": ("brass", 6) if fire > 0.6 else ("brass", 4) if fire > 0.3 else ("bone", 3) if fire > 0.1 else ("bone", 2)}
        tipped = pose.get("tipped", 0.0)
        # The crook goes up behind the head.
        base, tip, hook = J["pole_base"], J["pole_tip"], J["hook"]
        cel.limb(base, tip, 2.0, 1.6, "ink", (3, 5, 7))
        p = math.radians(pose["pole"])
        curl = (tip[0] + math.sin(p) * 2.6 + math.cos(p) * 2.2, tip[1] - math.cos(p) * 2.6 + math.sin(p) * 2.2)
        cel.limb(tip, curl, 1.6, 1.5, "ink", (3, 5, 7))
        cel.limb(curl, hook, 1.5, 1.4, "ink", (3, 5, 7))
        self.arm(cel, J, "F", far=True)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        cel.stamp_lean(TORSO, L, (px + 0.5, py), 3, lean)
        hx, hy = J["head"]
        turn = pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0)
        cel.stamp_turn(HEAD, Lg, (hx, hy + 1), 4, turn)
        if pose.get("bellows", 1.0) > 0.5:
            self.bellows(cel, J["handN"], J["handF"], pose.get("sq", 0.0))
        self.arm(cel, J, "N", far=False)
        # The basket on its chain, in front of everything.
        cage = ropes["cage"]
        for i in range(len(cage) - 1):
            cel.line(cage[i], cage[i + 1], ("ink", 6))
        c = (cage[-1][0], cage[-1][1] + 1.0)
        self.basket(cel, c, tipped, pose.get("smoke", 0.0))
        cel.outline()

        wind = pose.get("wind", 0.0)
        if tipped > 0.5:
            c = (c[0] + 8.0, GROUND - 1.0)  # the fire is in the spilled coals now
        self.flame(cel, c, fire, pose.get("flick", 0.0), wind, coals=tipped <= 0.5)
        if fire > 0.3 and tipped <= 0.5:
            self.plume(cel, c, fire, pose.get("flick", 0.0), wind)
        if fire > 0.3:
            # Sparks climbing off the fire.
            ph = pose.get("flick", 0.0)
            for i in range(3):
                u = (ph * 1.0 + i / 3) % 1.0
                if u < 0.8 * fire:
                    cel.soft(c[0] + (i - 1) * 2.6 + math.sin(math.tau * (u + i * 0.3)) * 1.5 - wind * u * 8.0, c[1] - 8.0 - 9.0 * u,
                             ("light", 0) if u < 0.3 else ("brass", 7) if u < 0.6 else ("brass", 5))
        puff = pose.get("puff", 0.0)
        if 0.02 < puff < 0.98 and pose.get("bellows", 1.0) > 0.5:
            mx, my = (J["handN"][0] + J["handF"][0]) / 2 + 5.0, (J["handN"][1] + J["handF"][1]) / 2 - 2.6
            for i in range(3):
                cel.soft(mx + 1.5 + puff * 5.0 + i * 1.2, my - puff * 3.0 - (i % 2), ("bone", 6) if puff < 0.5 else ("bone", 4))
        glob = pose.get("glob", 0.0)
        if 0.01 < glob < 0.985:
            self.cinder(cel, c, glob)
        crash = pose.get("crash", 0.0)
        if 0.01 < crash < 0.985:
            for i in range(9):
                ang = math.radians(-170 + i * 20.0)
                d = 2.0 + 11.0 * crash
                y = c[1] + 2.0 + math.sin(ang) * d * 0.8 + 9.0 * crash * crash
                if y < GROUND - 1:
                    cel.soft(c[0] + math.cos(ang) * d, y, ("light", 0) if crash < 0.3 else ("brass", 6) if i % 2 else ("crimson", 5))
        smoke = pose.get("smoke", 0.0)
        if smoke > 0.02:
            for i in range(int(2 + smoke * 5)):
                u = (i / 7 + smoke * 0.6) % 1.0
                cel.soft(c[0] + math.sin(math.tau * (u * 1.3 + 0.2)) * (1.0 + 2.0 * u), c[1] - 2.0 - 13.0 * u, ("ink", 6) if u < 0.5 else ("ink", 4))

    @staticmethod
    def cinder(cel: Cel, c: Pt, u: float) -> None:
        """A cinder thrown out of the basket in a low arc, and the little burst where it lands."""
        x1, y1 = BUILD.root_x + LOB_TO[0], GROUND - LOB_TO[1]
        if u < 0.8:
            f = u / 0.8
            gx = c[0] + (x1 - c[0]) * f
            gy = c[1] + (y1 - c[1]) * f * f - 8.0 * math.sin(math.pi * f) * (1 - 0.4 * f)
            cel.put(gx, gy, ("light", 0))
            cel.put(gx + 1, gy, ("brass", 6))
            cel.put(gx, gy + 1, ("brass", 6))
            for i in range(1, 5):
                g = max(0.0, f - i * 0.07)
                cel.soft(c[0] + (x1 - c[0]) * g, c[1] + (y1 - c[1]) * g * g - 8.0 * math.sin(math.pi * g) * (1 - 0.4 * g) + (i % 2),
                         ("brass", 6) if i < 2 else ("brass", 4) if i < 4 else ("crimson", 5))
        else:
            v = (u - 0.8) / 0.2
            for i in range(-4, 5):
                cel.soft(x1 + i * (0.6 + 0.4 * v), GROUND - 1, ("light", 0) if abs(i) < 2 and v < 0.5 else ("brass", 6) if abs(i) < 3 else ("crimson", 5))
            for i in range(6):
                ang = math.radians(-160 + i * 28.0)
                d = 1.5 + 7.0 * v
                y = GROUND - 2 + math.sin(ang) * d + 5.0 * v * v
                if y < GROUND - 1:
                    cel.put(x1 + math.cos(ang) * d, y, ("light", 0) if v < 0.3 else ("brass", 6) if i % 2 else ("crimson", 5))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=1.4, lean=15.0, footN=(-2.8, 0.0, 0.0), footF=(3.0, 0.0, 0.0), hip_rot=0.0, sh_rot=0.0,
                  armN=22.0, elbN=72.0, armF=30.0, elbF=64.0, pole=-10.0, head_dx=0.0, head_dy=0.0, head_rot=-4.0, breath=0.0,
                  fire=0.9, flick=0.0, wind=0.0, sq=0.0, puff=0.0, bellows=1.0, glob=0.0, crash=0.0, smoke=0.0, tipped=0.0)


def idle_pose(ph: float) -> Pose:
    # Two squeezes of the bellows a loop: the hands close, the body dips into it, and the fire leaps a beat later.
    q = (ph * 2.0) % 1.0
    sq = max(0.0, math.sin(math.pi * min(1.0, q / 0.45))) if q < 0.45 else 0.0
    lag = ((ph - 0.07) * 2.0) % 1.0
    leap = max(0.0, math.sin(math.pi * min(1.0, lag / 0.6))) if lag < 0.6 else 0.0
    s = math.sin(math.tau * ph)
    return {**BASE, "drop": 1.4 + 0.9 * sq, "lean": 15.0 + 3.0 * sq, "armN": 22.0 + 7.0 * sq, "elbN": 72.0 + 10.0 * sq, "armF": 30.0 - 5.0 * sq, "elbF": 64.0 + 12.0 * sq,
            "sq": sq, "puff": q / 0.5 if 0.1 < q < 0.5 else 0.0, "fire": 0.72 + 0.5 * leap, "flick": ph * 2.0, "pole": -10.0 + 2.5 * s - 2.0 * sq,
            "head_rot": -4.0 - 6.0 * leap}


def trot_pose(ph: float) -> Pose:
    c = math.cos(math.tau * ph)
    p: Pose = gait_legs(Gait(stride=0.95, give=1.2, lift=0.95, toe=0.9, run=True, air=1.0), ph)
    p.update({**{k_: v for k_, v in BASE.items() if k_ not in ("footN", "footF", "drop")},
              "lean": 22.0 + 2.5 * math.cos(2 * math.tau * ph), "hip_rot": -0.5 * c, "sh_rot": 0.4 * c, "armN": 26.0 + 4.0 * c, "armF": 32.0 - 4.0 * c,
              "pole": -4.0 + 5.0 * math.cos(2 * math.tau * (ph - 0.12)), "head_rot": -10.0 + 3.0 * c, "fire": 0.8, "flick": 2 * ph, "wind": 0.9})
    p["dy"] = p.get("dy", 0.0) + 0.6
    return p


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Throw: it rocks back with the crook right over its shoulder, then throws its whole back into whipping it forward;
# the basket swings out ahead and a cinder flies from it.
THROW_KEYS = [
    (0.00, k(), "lin"),
    (0.22, k(dx=-1.0, drop=2.4, lean=4.0, pole=-28.0, head_rot=-12.0, armN=10.0, elbN=84.0, armF=18.0, elbF=80.0, footN=(-1.8, 0.0, 0.0), footF=(3.8, 0.0, 0.0), fire=1.0), "out"),
    (0.42, k(dx=-1.6, drop=3.0, lean=-4.0, pole=-40.0, head_rot=-16.0, armN=4.0, elbN=90.0, armF=12.0, elbF=86.0, footN=(-1.2, 0.0, 0.0), footF=(4.4, 0.6, 8.0), fire=1.25), "io"),
    (0.50, k(dx=1.8, drop=0.8, lean=30.0, pole=30.0, head_rot=6.0, armN=40.0, elbN=50.0, armF=46.0, elbF=44.0, footN=(-4.4, 0.0, -18.0), footF=(3.2, 0.0, 0.0), fire=0.5, glob=0.02, wind=-0.6), "in"),
    (0.58, k(dx=2.2, drop=1.8, lean=34.0, pole=38.0, head_rot=10.0, armN=44.0, elbN=46.0, armF=50.0, elbF=40.0, footN=(-4.8, 0.0, -22.0), footF=(2.8, 0.0, 0.0), fire=0.35, glob=0.25), "lin"),
    (0.86, k(dx=1.0, drop=1.6, lean=20.0, pole=4.0, head_rot=-2.0, footN=(-3.6, 0.0, -6.0), footF=(2.8, 0.0, 0.0), fire=0.6, glob=0.98), "out"),
    (1.00, k(glob=1.0), "io"),
]

# Hit: it is light and top-heavy; the crook whips back and the fire is almost shaken out.
HURT_KEYS = stagger_keys(BASE, push=4.6, bend=16.0, buckle=2.0, whip=24.0, over={
    "impact": dict(pole=-22.0, fire=1.2, armN=30.0, elbN=60.0, armF=36.0, elbF=52.0, wind=-0.5),
    "mid": dict(pole=-34.0, fire=0.5, armN=50.0, elbN=40.0, armF=10.0, elbF=70.0, wind=0.4),
    "reel": dict(pole=-40.0, fire=0.35, armN=64.0, elbN=30.0, armF=-10.0, elbF=60.0, wind=0.8),
    "catch": dict(pole=6.0, fire=0.5, armN=20.0, elbN=74.0, armF=30.0, elbF=60.0, wind=-0.4),
    "recover": dict(pole=-6.0, fire=0.7, armN=22.0, elbN=72.0, armF=30.0, elbF=64.0),
})

# Death: the blow rocks it back, its knees go, and it pitches forward onto its face; the crook comes over with it,
# the basket smashes on the road ahead, the embers scatter and the fire dies to smoke.
_FLAT = dict(dx=4.0, drop=14.0, lean=86.0, head_rot=6.0, armN=70.0, elbN=20.0, armF=86.0, elbF=10.0, footN=(-9.5, 0.3, -168.0), footF=(-7.5, 0.3, -168.0),
             pole=97.0, bellows=0.0, fire=0.0, tipped=1.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.09, k(dx=-1.4, drop=1.0, lean=0.0, pole=-30.0, head_rot=-22.0, armN=50.0, elbN=40.0, armF=-10.0, elbF=60.0, footN=(-1.4, 0.0, 0.0), footF=(4.2, 1.0, 10.0), fire=1.2, wind=0.6), "out3"),
    (0.24, k(dx=-0.6, drop=4.0, lean=14.0, pole=-16.0, head_rot=8.0, armN=30.0, elbN=40.0, armF=20.0, elbF=40.0, footN=(-2.2, 0.0, 0.0), footF=(3.4, 0.0, 0.0), bellows=0.0, fire=0.7), "io"),
    (0.40, k(dx=1.6, drop=7.5, lean=44.0, pole=30.0, head_rot=14.0, armN=60.0, elbN=20.0, armF=76.0, elbF=10.0, footN=(-5.0, 0.0, -40.0), footF=(-1.0, 0.0, -20.0), bellows=0.0, fire=0.8,
             wind=-0.8), "in"),
    (0.52, k(**{**_FLAT, "fire": 0.9, "pole": 92.0}, crash=0.02, wind=-0.6), "in"),
    (0.60, k(**{**_FLAT, "drop": 13.0, "lean": 82.0, "fire": 0.45}, crash=0.4), "out"),
    (0.72, k(**{**_FLAT, "fire": 0.2}, crash=0.98, smoke=0.2), "lin"),
    (0.86, k(**_FLAT, crash=1.0, smoke=0.6), "lin"),
    (1.00, k(**_FLAT, crash=1.0, smoke=1.0), "lin"),
]

STILL = lambda t: (-0.15 + 0.2 * math.sin(math.tau * 2 * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [110] * 12, True, STILL),
    "run": Anim("run", trot_pose, [i / 10 for i in range(10)], [50] * 10, True, lambda t: (-0.9, 0.0)),
    "attack": Anim("attack", keyed(THROW_KEYS), [0.0, 0.11, 0.22, 0.32, 0.42, 0.50, 0.58, 0.65, 0.72, 0.79, 0.86, 0.93, 1.0],
                   [70, 80, 90, 110, 140, 40, 60, 60, 60, 60, 70, 80, 100], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.045, 0.09, 0.165, 0.24, 0.32, 0.40, 0.46, 0.52, 0.56, 0.60, 0.66, 0.72, 0.86, 1.0],
                  [50, 40, 80, 70, 80, 70, 70, 50, 50, 60, 80, 100, 130, 220, 1200], False, STILL),
}
