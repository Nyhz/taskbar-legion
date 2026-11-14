"""Siren — world 6, ranged. Nothing of the storybook about her: a drowned-pale thing, gaunt, ribs showing, with
hollow sockets that burn, fins of red spines behind her jaw and down her back and forearms, long claws, hair like
black weed — and a mouth that is a thin line of needle teeth until she sings, when the jaw drops open to a hole
half the size of her head. From the hips down she is a serpent's tail, dark and hard-scaled with a crest of spines,
coiled on the stone under her with its barbed fin out behind. She sways on the coil; to move she pours forward
over it. Her attack is her voice: she draws herself in, then rears up tall with her arms thrown wide and the jaw
unhinged, and rings of sound roll out in front of her. When she dies she shrieks once, the coil lets go, and she
sinks forward along the ground while the tail runs out behind her in slack curves and lifts its fin one last time.

Her lower body is her own: the torso is solved by the common skeleton (the "legs" are never drawn), the tail is
built from the pelvis down. Drawn facing right like every figure; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Pose, Pt, keyed

FIGURE = ("Siren", "foe", "w06")

# thigh + shin + heel = how high the hips ride above the stone when she is upright; `drop` lowers them.
BUILD = Build(root_x=40, thigh=6.0, shin=6.0, foot=0.0, hip_dx=0.0, spine=8.6, sh_near=2.4, sh_far=2.0, upper=5.4, fore=5.2, neck=1.0, head_dx=0.6,
              heel=1.6, min_pelvis=3.0)

L = {
    "s": ("bone", 2), "t": ("bone", 3), "u": ("bone", 4), "v": ("bone", 5), "w": ("bone", 6), "T": ("bone", 7),
    "H": ("moss", 0), "I": ("moss", 1), "i": ("moss", 2),
    "a": ("dusk", 0), "b": ("dusk", 1), "c": ("dusk", 2), "d": ("dusk", 3),
    "E": ("crimson", 4), "F": ("crimson", 5),
    "k": ("ink", 0), "O": ("crimson", 0), "o": ("crimson", 2),
}

# Gaunt: collar bones, a string of teeth at the throat, ribs, a waist like a wrist, red spines down the back, and
# the first dark scales at the hips.
TORSO = [
    "...tuv...",
    "..stuvww.",
    "F.stuvvw.",
    ".EtsuTvT.",
    "F.stsusv.",
    ".E.tusu..",
    "F..tsuv..",
    "..atuuvd.",
    ".aabccdd.",
    "aabbccddd",
]
# Weed-black hair off a skull of a face: a brow ridge, a socket with a light in it (G), a fin behind the jaw, and
# the mouth a line of needle teeth. The second head is the same with the jaw dropped: the hole she sings from.
HEAD = [
    "..IIIii....",
    ".HIIIiivv..",
    "HHIIuvvvww.",
    "HIFtukGkvw.",
    "HFEtuvkkvw.",
    "HIFtuvvvwww",
    "HI.tTkTkTk.",
    "H..tukkkk..",
    "H...tuuv...",
    "H....t.....",
]
HEAD_SING = HEAD[:4] + [
    "HFEtuTvTvT.",
    "HIFtTOTOTOT",
    "HI.tOOOOOOo",
    "H..tOOoOOOo",
    "H..tTOTOTO.",
    "H...tuuvv..",
]
for _rows in (TORSO, HEAD, HEAD_SING):
    assert len({len(r) for r in _rows}) == 1

_FEET = dict(footN=(0.0, 0.0, 0.0), footF=(0.0, 0.0, 0.0))


class Siren(Character):
    build = BUILD

    def joints(self, pose: Pose) -> dict[str, Pt]:
        J = super().joints(pose)
        lean = pose.get("lean", 0.0)
        turn = pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0)
        a = math.radians(turn)
        hx, hy = J["head"]

        def on_head(x: float, y: float) -> Pt:
            return (hx + x * math.cos(a) - y * math.sin(a), hy + x * math.sin(a) + y * math.cos(a))

        J["nape"], J["temple"], J["mouth"], J["turn"] = on_head(-4.0, -6.0), on_head(-3.0, -3.0), on_head(6.5, -3.0), (turn, 0.0)
        J["eye"] = on_head(2.0, -6.0)
        # The tail, from the stone up: a wide loop, a smaller one on top of it, the body rising from that to the
        # hips, and the end of the tail out behind with its fin. `uncoil` lets the loops go slack and run back.
        R = self.build.root_x
        u, sl, fl = pose.get("uncoil", 0.0), pose.get("slide", 0.0), pose.get("flick", 0.0)
        low = GROUND - 3.6
        top = GROUND - 9.0 + 4.6 * u
        J["loopA"], J["loopB"] = (R - 7.5 - 9.0 * u + sl, low), (R + 7.5 - 4.0 * u + sl * 0.5, low)
        J["loopC"], J["loopD"] = (R - 4.5 - 8.0 * u + sl, top), (R + 3.5 - 4.0 * u, top)
        J["rise"] = (R + 1.5 - 2.0 * u, top)
        # The end of the tail curls up off the stone behind her, fin uppermost; slack, it lies along the ground.
        e = (J["loopA"][0] - 5.5 - 7.0 * u, GROUND - 3.4 - 2.0 * (1 - u))
        J["tailE"], J["tailT"] = e, (e[0] - 4.0 - 5.0 * u, GROUND - 3.0 - (6.0 * (1 - u) + fl))
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def grounded(pts: list[Pt], J: dict[str, Pt]) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        return {
            "hair": ChainSpec(Chain(6, 2.4, gravity=0.26, drag=0.14, damp=0.1), lambda J: J["nape"], grounded, (-0.4, 0.9)),
            "lock": ChainSpec(Chain(4, 2.0, gravity=0.26, drag=0.12, damp=0.1), lambda J: J["temple"], grounded, (-0.3, 1.0)),
        }

    def tail(self, cel: Cel, J: dict[str, Pt], pose: Pose) -> None:
        a, b, c, d, rise, e, t, pelvis = J["loopA"], J["loopB"], J["loopC"], J["loopD"], J["rise"], J["tailE"], J["tailT"], J["pelvis"]
        fl = pose.get("flick", 0.0)
        u = pose.get("uncoil", 0.0)
        tone = (1, 2, 4)

        def spine(x: float, y: float, dx: float, dy: float, n: float = 3.2) -> None:
            cel.limb((x, y), (x + dx * n, y + dy * n), 1.8, 0.6, "crimson", (3, 5, 6))
            cel.put(x + dx * n, y + dy * n, ("bone", 7))

        def fin(tip: Pt) -> None:
            # A barbed fin of three spines with web between them.
            for ang, n in ((-150.0, 6.4), (-118.0, 7.6), (-178.0, 5.0)):
                r = math.radians(ang - fl * 2.0)
                cel.limb(tip, (tip[0] + math.cos(r) * n, tip[1] + math.sin(r) * n), 2.6, 0.7, "crimson", (2, 4, 6))
            cel.put(tip[0] - 5.0, tip[1] - 5.0, ("bone", 7))

        if u > 0.5:
            # Slack: the tail lies out behind her in two lazy humps and ends in a hook with the fin on it.
            R = self.build.root_x
            sag = (u - 0.5) * 2.0
            end = (R - 31.0, GROUND - 3.0 - fl * 0.9)
            pts = [pelvis, (pelvis[0] - 5.0, GROUND - 3.8 - 3.2 * sag), (R - 11.0, GROUND - 3.2), (R - 17.5, GROUND - 3.2 - 4.0 * sag), (R - 24.0, GROUND - 2.8),
                   (R - 28.5, GROUND - 2.6 - 1.6 * sag - fl * 0.4), end]
            widths = [6.2, 6.4, 5.8, 5.2, 4.2, 3.0, 1.8]
            fin(end)
            for i in range(len(pts) - 1):
                cel.limb(pts[i], pts[i + 1], widths[i], widths[i + 1], "dusk", tone)
            for i, (x, y) in enumerate(pts[1:-1]):
                cel.put(x, y - 1.0, ("dusk", 6))
                if i % 2 == 0:  # the crest stands on the humps
                    spine(x - 1.0, y - widths[i + 1] / 2 + 0.5, -0.4, -0.9)
                    spine(x + 1.5, y - widths[i + 1] / 2 + 0.5, 0.1, -1.0, 2.4)
            return
        fin(t)
        cel.limb(a, e, 5.4, 3.8, "dusk", tone)
        cel.limb(e, t, 3.8, 1.8, "dusk", tone)
        cel.limb(a, b, 7.2, 7.2, "dusk", tone)
        cel.limb(c, d, 6.2, 6.2, "dusk", tone)
        # The crease where one coil lies on the other.
        for i in range(int(c[0]) - 2, int(d[0]) + 4):
            cel.put(i, c[1] + 3.2, ("dusk", 0))
        mid = ((rise[0] + pelvis[0]) / 2 - 1.6, (rise[1] + pelvis[1]) / 2)
        cel.limb(rise, mid, 6.4, 6.2, "dusk", tone)
        cel.limb(mid, (pelvis[0], pelvis[1] + 0.5), 6.2, 6.0, "dusk", tone)
        # Hard scales: a row of pale flecks along each coil, a bone-pale belly up the front of the rising body, and
        # a crest of red spines down its back and along the top of the coil.
        for p0, p1, n in ((a, b, 6), (c, d, 4), (a, e, 2)):
            for i in range(n):
                f = (i + 0.5) / n
                cel.put(p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f - 1.0, ("dusk", 6))
        for i in range(4):
            f = (i + 0.5) / 4
            x, y = rise[0] + (pelvis[0] - rise[0]) * f, rise[1] + (pelvis[1] - rise[1]) * f
            cel.put(x + 2.4, y, ("bone", 5))
            spine(x - 2.8, y, -0.9, -0.45, 3.6 if i % 2 == 0 else 2.6)
        for f in (0.15, 0.45):
            spine(a[0] + (e[0] - a[0]) * f, a[1] + (e[1] - a[1]) * f - 2.2, -0.45, -0.9, 3.0)

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        cel.limb(sh, el, 2.4, 1.9, "bone", (2, 4, 5), far=far)
        cel.limb(el, hd, 2.0, 1.7, "bone", (2, 4, 5), far=far)
        dx, dy = hd[0] - el[0], hd[1] - el[1]
        dd = math.hypot(dx, dy) or 1.0
        ux, uy = dx / dd, dy / dd
        # A fin of spines on the forearm, and three long claws.
        mid = ((el[0] + hd[0]) / 2, (el[1] + hd[1]) / 2)
        for back in (-1.2, 1.0):
            cel.limb((mid[0] + ux * back, mid[1] + uy * back), (mid[0] + ux * (back - 1.4) - uy * -3.2, mid[1] + uy * (back - 1.4) + ux * -3.2), 1.6, 0.6, "crimson",
                     (3, 4, 6), far=far)
        for k_ in (-0.9, 0.0, 0.9):
            tip = (hd[0] + ux * 3.6 - uy * k_ * 2.0, hd[1] + uy * 3.6 + ux * k_ * 2.0)
            cel.line(hd, tip, ("bone", 4 if far else 6))
            cel.put(tip[0], tip[1], ("bone", 6 if far else 7))

    def draw(self, cel, J, pose, ropes, between) -> None:
        lean = pose.get("lean", 0.0)
        glow = pose.get("glow", 1.0)
        Lg = {**L, "G": ("brass", 5) if glow >= 0.5 else ("brass", 3) if glow >= 0.15 else ("ink", 0)}
        hair = ropes["hair"]
        widths = [3.4, 4.0, 3.6, 3.0, 2.4, 1.4]
        for i in range(len(hair) - 1):
            cel.limb(hair[i], hair[i + 1], widths[i], widths[i + 1], "moss", (0, 1, 3))
        self.arm(cel, J, "F", far=True)
        self.tail(cel, J, pose)
        px, py = J["pelvis"]
        cel.stamp_lean(TORSO, Lg, (px, py + 1.0), 4, lean)
        hx, hy = J["head"]
        turn = J["turn"][0]
        cel.stamp_turn(HEAD_SING if pose.get("sing", 0.0) > 0.5 else HEAD, Lg, (hx, hy + 1), 4, turn)
        lock = ropes["lock"]
        for i in range(len(lock) - 1):
            cel.limb(lock[i], lock[i + 1], 2.0 - i * 0.4, 1.6 - i * 0.4, "moss", (0, 2, 3))
        self.arm(cel, J, "N", far=False)
        cel.outline()

        if glow >= 0.5:
            ex, ey = J["eye"]
            cel.put(ex, ey, ("brass", 6))  # an ember in the socket: on a face this pale, white would not show
        song = pose.get("song", 0.0)
        if 0.01 < song < 0.985:
            mx, my = J["mouth"]
            for i in range(3):
                ui = song * 1.36 - i * 0.18
                if not 0.0 < ui < 1.0:
                    continue
                dist, r = 5.0 + 36.0 * ui, 5.0 + 7.0 * ui
                tone = ("light", 0) if ui < 0.35 else ("brass", 6) if ui < 0.7 else ("brass", 5)
                cx = mx + dist - r
                steps = int(r * 2.4)
                for j in range(steps + 1):
                    ang = math.radians(-58.0 + 116.0 * j / steps)
                    if ui > 0.7 and j % 2:
                        continue
                    cel.soft(cx + math.cos(ang) * r, my + math.sin(ang) * r, tone)
                    if ui < 0.5:
                        cel.soft(cx + math.cos(ang) * (r - 1.0), my + math.sin(ang) * (r - 1.0), ("brass", 6))


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, drop=0.0, lean=3.0, **_FEET, hip_rot=0.0, sh_rot=0.0, armN=12.0, elbN=46.0, armF=34.0, elbF=52.0, head_dx=0.0, head_dy=0.0, head_rot=0.0,
                  breath=0.0, sing=0.0, song=0.0, flick=1.0, slide=0.0, uncoil=0.0, flash=0.0, glow=1.0)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    later = math.sin(math.tau * (ph - 0.36))
    # She sways like weed in a current: hips first, shoulders after, head last; one hand beckons.
    return {**BASE, "dx": 1.0 * s, "lean": 3.0 + 6.0 * late, "drop": 0.6 + 0.8 * math.sin(math.tau * (ph - 0.1)), "head_rot": -5.0 * later, "head_dx": 0.4 * later,
            "armF": 34.0 + 10.0 * later, "elbF": 52.0 + 22.0 * math.sin(math.tau * 2 * ph), "armN": 12.0 + 6.0 * late, "elbN": 46.0 + 8.0 * s,
            "flick": 2.5 + 2.5 * math.sin(math.tau * (2 * ph - 0.3)), "slide": 1.0 * math.sin(math.tau * (ph - 0.25)), "breath": 0.4 + 0.4 * s}


def slither_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.18))
    # She pours forward: the coil gathers and runs out under her, the body dips and rides up on it.
    return {**BASE, "dx": 2.0 + 1.6 * s, "lean": 12.0 + 4.0 * late, "drop": 1.6 - 1.6 * math.cos(math.tau * ph), "head_rot": -8.0 - 4.0 * late,
            "armN": -24.0 + 10.0 * late, "elbN": 30.0, "armF": 20.0 - 12.0 * late, "elbF": 40.0,
            "flick": 4.0 + 4.0 * math.sin(math.tau * (ph - 0.4)), "slide": -3.5 * math.cos(math.tau * ph)}


def k(**over: object) -> Pose:
    return {**BASE, **over}


# Song: she folds in over the coil with her hands at her throat, then rears up as tall as the tail will lift her,
# arms thrown wide, head back, and holds the note while the rings roll out.
_NOTE = dict(dx=1.0, drop=-4.6, lean=-10.0, head_rot=-20.0, armN=-64.0, elbN=24.0, armF=104.0, elbF=12.0, sing=1.0, flick=6.0, slide=-1.5)
SONG_KEYS = [
    (0.00, k(), "lin"),
    (0.22, k(dx=-1.0, drop=2.6, lean=10.0, head_rot=14.0, armN=30.0, elbN=104.0, armF=44.0, elbF=104.0, flick=0.0, slide=2.0), "out"),
    (0.34, k(dx=-1.4, drop=3.0, lean=12.0, head_rot=16.0, armN=32.0, elbN=108.0, armF=46.0, elbF=108.0, flick=0.0, slide=2.4), "io"),
    (0.42, k(**_NOTE, song=0.02), "in"),
    (0.78, k(**{**_NOTE, "drop": -5.0, "lean": -12.0, "head_rot": -23.0}, song=0.98), "lin"),
    (0.90, k(dx=0.5, drop=-1.0, lean=0.0, head_rot=-6.0, armN=-10.0, elbN=40.0, armF=60.0, elbF=40.0, song=1.0, flick=3.0), "io"),
    (1.00, k(song=1.0), "io"),
]

# Hit: she has no feet to give ground with — the blow bends her back over her own coil, hair and arms flying, the
# coil flinches under her, and she whips forward again.
HURT_KEYS = [
    (0.00, k(), "lin"),
    (0.07, k(dx=-0.8, drop=1.0, lean=-6.0, head_rot=12.0, head_dx=1.0, armF=44.0, elbF=40.0, flash=1.0), "out3"),
    (0.16, k(dx=-2.6, drop=1.8, lean=-17.0, head_rot=-10.0, armN=-30.0, elbN=30.0, armF=70.0, elbF=20.0, slide=-2.0, flick=5.0, sing=1.0, flash=0.5), "lin"),
    (0.26, k(dx=-4.0, drop=2.6, lean=-22.0, head_rot=-26.0, head_dx=-1.0, armN=-56.0, elbN=24.0, armF=92.0, elbF=14.0, slide=-4.0, flick=8.0, sing=1.0), "out"),
    (0.50, k(dx=-2.6, drop=3.2, lean=9.0, head_rot=14.0, head_dx=0.6, armN=20.0, elbN=70.0, armF=40.0, elbF=70.0, slide=-2.5, flick=0.0), "io"),
    (0.74, k(dx=-1.0, drop=1.2, lean=5.0, head_rot=4.0, slide=-1.0, flick=2.0), "io"),
    (1.00, k(), "io"),
]

# Death: one shriek, reared up — then the coil lets go and she sinks forward along the stone, the tail running out
# behind her; it lifts its fin once more and lies still.
_PRONE = dict(dx=2.0, drop=10.6, lean=84.0, head_rot=4.0, armN=86.0, elbN=6.0, armF=100.0, elbF=-8.0, uncoil=1.0, slide=0.0, glow=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.10, k(dx=-2.0, drop=-2.0, lean=-15.0, head_rot=-20.0, armN=-80.0, elbN=40.0, armF=120.0, elbF=20.0, sing=1.0, flick=7.0, slide=-2.0), "out3"),
    (0.28, k(dx=-1.0, drop=-4.4, lean=-9.0, head_rot=-30.0, armN=-100.0, elbN=30.0, armF=140.0, elbF=10.0, sing=1.0, flick=9.0, slide=-1.0), "io"),
    (0.44, k(dx=0.0, drop=3.0, lean=16.0, head_rot=12.0, armN=20.0, elbN=20.0, armF=44.0, elbF=20.0, uncoil=0.3, flick=3.0), "io"),
    (0.58, k(dx=1.0, drop=8.0, lean=52.0, head_rot=10.0, armN=64.0, elbN=10.0, armF=80.0, elbF=6.0, uncoil=0.7, flick=1.0, glow=0.4), "in"),
    (0.66, k(**_PRONE, flick=0.0), "in"),
    (0.74, k(**{**_PRONE, "lean": 79.0, "drop": 10.0}, flick=3.0), "out"),
    (0.82, k(**_PRONE, flick=9.0), "io"),
    (0.92, k(**_PRONE, flick=0.0), "in"),
    (1.00, k(**_PRONE, flick=-0.4), "lin"),
]

STILL = lambda t: (-0.25 + 0.2 * math.sin(math.tau * t), 0.0)  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 12 for i in range(12)], [170] * 12, True, STILL),
    "run": Anim("run", slither_pose, [i / 12 for i in range(12)], [80] * 12, True, lambda t: (-0.6, 0.0)),
    "attack": Anim("attack", keyed(SONG_KEYS), [0.0, 0.11, 0.22, 0.34, 0.42, 0.48, 0.54, 0.60, 0.66, 0.72, 0.78, 0.84, 0.90, 1.0],
                   [80, 90, 110, 150, 60, 70, 70, 70, 70, 70, 90, 90, 90, 110], False, STILL),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, STILL),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.05, 0.10, 0.19, 0.28, 0.36, 0.44, 0.51, 0.58, 0.62, 0.66, 0.74, 0.82, 0.87, 0.92, 1.0],
                  [50, 50, 90, 100, 160, 80, 90, 80, 70, 60, 80, 100, 120, 90, 120, 1200], False, STILL),
}
