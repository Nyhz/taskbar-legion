"""The Scapegoat — world 4, WORLD boss. The beast the canyon people loaded with their sins and drove out into the
red rock, generation after generation; it did not die out there, and it has come back the size of a house.

A ram as tall as the strip under a hanging coat of dirty bone-pale wool, its hem dragged red: a humped barrel of a
body on four thin dark legs, a long black face with a row of flat teeth, FOUR horns — two curled round the cheeks,
two standing straight up like a crown — and one cold eye with a goat's flat pupil, the only cold thing in the
canyon. Under the hem, between its hooves, two pale hands rest on the path: it walks on those too. The marks of its office are all over it: red handprints pressed into the wool by everyone who ever laid a
sin on it, ribbons knotted on the horns, and in its back the stakes they drove it out with, still standing, each
with a pennant. What the wool hides is what it carries: when the coat parts along its belly there is no body
inside, only dark, and out of the dark come the ARMS — pale, cold, many — of whatever was put in there.

It stands and chews, staring; now and then a third hand comes out of the coat, feels the air towards the prey and
is drawn back in. It moves at a heavy
trot, head low, the coat swinging. Attack: it sinks on its haunches and REARS — the whole beast upright, the belly
turned on the prey, the coat splitting open and every arm reaching out — hangs there, and then comes down with both
fore hooves and all its weight on whoever stands under it — the arms snatched back inside as it falls, the two
hands it walks on slapping down beside the hooves; the path bursts.
Hit: the head is thrown up and back, a fore hoof leaves the ground, it gives a step with the hind legs, the coat
jolts. Death: it rears one last time and bleats at the sky while the arms flail and the red marks lift off it like
embers; then the arms go slack, the fore legs buckle and it kneels, the head sinks until the horns touch the path,
the haunches follow, and it lies down like a beast that was only ever tired — a pale mound with the horns and the
stakes standing out of it, the eye gone dark, the pennants still.

Own rig (nothing of the humanoid skeleton): a body frame at the pelvis (`hip`, `pitch`), four legs by IK on their
hooves, a neck given by angle and length, a drawn head. Frame 248 wide with 59 extra rows above, root at 104: the
beast stands BEHIND its root (fore hooves at +6 and +20, chest at +26), its head hangs over the prey above a hero's
height (only the tip of the beard comes down to it), and the strike lands 56–62 px ahead. The tallest poses (the
rear, the bleat) are keyed to stay inside the 123 px above the path. Drawn facing right; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Pose, Pt, ik, keyed, lerp

FIGURE = ("Scapegoat", "boss", "w04")

ROOT_X = 104
BUILD = Build(root_x=ROOT_X, thigh=1.0, shin=1.0, foot=0.0, hip_dx=0.0, spine=0.0, sh_near=0.0, sh_far=0.0, upper=1.0, fore=1.0, neck=0.0)

VOID = ("ink", 0)

# ------------------------------------------------------------------------------------------------------- the body
#: The coat's outline in the body's own frame: u forward along the spine from the pelvis, v towards the back. A hump
#: over the shoulders, the back sloping away to the rump.
BODY = [(-20, 0), (-17, 11), (-8, 17), (10, 20), (28, 22), (44, 28), (56, 35), (67, 31), (75, 16), (78, -4), (73, -20), (60, -31), (38, -35),
        (16, -35), (-2, -32), (-14, -23), (-21, -9)]
#: Its lower edge, back to front: where the hem hangs from and where the coat parts.
VENTRAL = [(-21, -9), (-14, -23), (-2, -32), (16, -35), (38, -35), (60, -31), (73, -20), (78, -4)]
#: The parting: along the belly and up the brisket.
PART_U = (12.0, 77.0)
PART_DEPTH = 20.0

#: Leg joints in the body frame, bone lengths, and which way the middle joint bends (+1 back: a hock; −1 forward: a knee).
LEGS = {
    "hindN": ((-5.0, -14.0), 22.0, 22.0, +1),
    "hindF": ((3.0, -13.0), 22.0, 22.0, +1),
    "foreN": ((55.0, -16.0), 24.0, 23.0, -1),
    "foreF": ((61.0, -15.0), 24.0, 23.0, -1),
}
ANKLE_UP = 3.0
NECK_AT = (64.0, 6.0)

#: The stakes in its back: where each goes in (u), how it leans from straight out of the back (degrees, + forward)
#: and how much of it stands out.
STAKES = [(4.0, -20.0, 30.0), (19.0, -6.0, 40.0), (33.0, 9.0, 26.0)]

#: Red handprints on the coat (u, v, tone step).
PRINTS = [(2.0, 2.0, 3), (15.0, -8.0, 3), (27.0, 6.0, 4), (38.0, -13.0, 3), (50.0, 8.0, 3), (7.0, -20.0, 4), (60.0, -8.0, 3), (24.0, -23.0, 3), (-9.0, -7.0, 4),
          (44.0, 18.0, 3)]
HAND = ["..x.x.x.", "x.x.x.x.", "x.xxxxx.", "xxxxxxx.", ".xxxxxxx", ".xxxxx.x", "..xxxx.."]

#: The arms inside: how far along the parting each comes out (0–1), how it fans from straight out of the belly
#: (degrees), its length and which way it bows.
ARMS = [(0.14, 38.0, 32.0, -1), (0.32, 6.0, 42.0, 1), (0.52, -28.0, 35.0, -1)]
#: The two it walks on: where each hangs from (0–1 along the parting); their hands are placed by the pose.
WALKERS = [("handA", 0.22), ("handB", 0.50)]

# ------------------------------------------------------------------------------------------------------- the head
# Built of strokes in its own frame (x down the face from the poll, y towards the jaw), so it can turn freely: at rest
# the face slopes down to the muzzle at 30°. The eye alone is a drawn sprite: S/P/W follow `eye`.
FACE_SLOPE = 30.0
EYE = [".SSSSS.", "SSSSSSS", "SPPPPPW", "SSSSSSS", ".SSSSS."]
EYE_AT = (15.0, -3.0)
HORN_AT = (3.0, -4.5)   # the curled pair
SPIKE_AT = (0.5, -7.0)  # the pair that stands up
EAR_AT = (2.0, 4.0)
JAW_AT = (13.0, 8.0)
CHIN = (30.0, 10.5)


def _hash(x: int, y: int) -> int:
    return ((x * 73856093) ^ (y * 19349663)) & 0x7FFFFFFF


def _rnd(x: int, y: int) -> float:
    return (_hash(x, y) % 1000) / 1000.0


def _clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def P(x: float, up: float) -> Pt:
    return (ROOT_X + x, GROUND - up)


def _turn(v: Pt, deg: float) -> Pt:
    """A screen vector turned `deg` clockwise."""
    a = math.radians(deg)
    return (v[0] * math.cos(a) - v[1] * math.sin(a), v[0] * math.sin(a) + v[1] * math.cos(a))


def on_head(at: Pt, rot: float, px: Pt) -> Pt:
    """A point of the head (x down the face, y towards the jaw), on screen."""
    ax, dn = _turn((1.0, 0.0), FACE_SLOPE + rot), _turn((0.0, 1.0), FACE_SLOPE + rot)
    return (at[0] + ax[0] * px[0] + dn[0] * px[1], at[1] + ax[1] * px[0] + dn[1] * px[1])


def vedge(u: float) -> float:
    """The coat's lower edge at u."""
    pts = VENTRAL
    if u <= pts[0][0]:
        return pts[0][1]
    for (u0, v0), (u1, v1) in zip(pts, pts[1:]):
        if u <= u1:
            return lerp(v0, v1, (u - u0) / (u1 - u0))
    return pts[-1][1]


def horn_path(base: Pt, rot: float) -> list[Pt]:
    """A ram's horn: up and back off the poll, down behind the cheek, forward under the eye, the tip turning out
    again — a spiral that tightens as it goes."""
    pts = [base]
    ang = -124.0 + rot
    n = 13
    for i in range(n):
        t = i / (n - 1)
        seg = lerp(7.6, 3.0, t)
        a = math.radians(ang)
        pts.append((pts[-1][0] + math.cos(a) * seg, pts[-1][1] + math.sin(a) * seg))
        ang -= lerp(15.5, 30.0, t)
    return pts


def spike_path(base: Pt, rot: float, lean: float = 0.0) -> list[Pt]:
    """One of the two horns that stand up: straight out of the brow, sweeping back a little towards the tip."""
    pts = [base]
    ang = -60.0 + rot + lean
    for i in range(9):
        a = math.radians(ang)
        pts.append((pts[-1][0] + math.cos(a) * 4.2, pts[-1][1] + math.sin(a) * 4.2))
        ang -= 5.5
    return pts


def eye_tones(eye: float) -> dict[str, tuple[str, int]]:
    if eye >= 1.4:
        return {"S": ("light", 0), "P": ("sea", 2), "W": ("light", 0)}
    if eye >= 1.15:
        return {"S": ("sea", 8), "P": VOID, "W": ("light", 0)}
    if eye >= 0.8:
        return {"S": ("sea", 7), "P": VOID, "W": ("sea", 8)}
    if eye >= 0.45:
        return {"S": ("sea", 5), "P": VOID, "W": ("sea", 6)}
    if eye >= 0.12:
        return {"S": ("sea", 3), "P": VOID, "W": ("sea", 3)}
    return {"S": ("ink", 1), "P": VOID, "W": ("ink", 1)}


class Scapegoat(Character):
    build = BUILD
    W = 248
    TOP = 59

    # ------------------------------------------------------------------------------------------------- skeleton
    def joints(self, pose: Pose) -> dict:
        pel = P(*pose["hip"])
        p = math.radians(pose["pitch"])
        fwd, dor = (math.cos(p), -math.sin(p)), (-math.sin(p), -math.cos(p))

        def B(u: float, v: float) -> Pt:
            return (pel[0] + fwd[0] * u + dor[0] * v, pel[1] + fwd[1] * u + dor[1] * v)

        J: dict = {"B": B, "pel": pel, "fwd": fwd, "dor": dor}
        for name, ((ju, jv), l1, l2, bend) in LEGS.items():
            fx, lift = pose[name]
            a = B(ju, jv)
            mid, end = ik(a, P(fx, ANKLE_UP + lift), l1, l2, bend)
            J[name] = (a, mid, end)
        nb = B(*NECK_AT)
        na, nl = pose["neck"]
        head = (nb[0] + math.cos(math.radians(na)) * nl, nb[1] - math.sin(math.radians(na)) * nl)
        rot = pose["head_rot"]
        J["nb"], J["head"] = nb, head
        J["hornN"] = horn_path(on_head(head, rot, HORN_AT), rot)
        J["hornF"] = horn_path(on_head(head, rot, (HORN_AT[0] + 5.0, HORN_AT[1] - 1.5)), rot + 8.0)
        J["spikeN"] = spike_path(on_head(head, rot, SPIKE_AT), rot)
        J["spikeF"] = spike_path(on_head(head, rot, (SPIKE_AT[0] + 6.0, SPIKE_AT[1] + 0.5)), rot, 13.0)
        J["chin"] = on_head(head, rot, (CHIN[0], CHIN[1] + pose["jaw"] * 0.25))
        J["rib0"], J["rib1"] = J["hornN"][5], J["spikeN"][6]
        u0, u1 = PART_U
        for name, t in WALKERS:
            o = B(lerp(u0, u1, t), vedge(lerp(u0, u1, t)) + 5.0)
            hx_, hup_ = pose[name]
            el, hand = ik(o, P(hx_, 1.6 + hup_), 17.0, 16.0, -1)
            J[name] = (o, el, hand)
        wob = pose["stake"]
        tops = []
        for i, (u, tilt, length) in enumerate(STAKES):
            d = _turn(dor, tilt + wob * (5.0 if i % 2 else -4.0))
            foot = B(u, 13.0)
            tops.append((foot, (foot[0] + d[0] * (length + 7.0), foot[1] + d[1] * (length + 7.0))))
        J["stakes"] = tops
        return J

    def chains(self) -> dict[str, ChainSpec]:
        def grounded(pts: list[Pt], J: dict) -> None:
            for i in range(1, len(pts)):
                pts[i] = (pts[i][0], min(pts[i][1], GROUND - 1.5))

        out: dict[str, ChainSpec] = {}
        for i in range(len(STAKES)):
            out[f"pennant{i}"] = ChainSpec(Chain(8, 3.4, gravity=0.06, drag=0.18, damp=0.05), (lambda J, i=i: J["stakes"][i][1]), grounded, (-0.9, 0.44))
        out["rib0"] = ChainSpec(Chain(6, 3.0, gravity=0.14, drag=0.14, damp=0.06), lambda J: J["rib0"], grounded, (-0.3, 0.95))
        out["rib1"] = ChainSpec(Chain(5, 3.0, gravity=0.14, drag=0.14, damp=0.06), lambda J: J["rib1"], grounded, (-0.2, 0.98))
        out["beard"] = ChainSpec(Chain(5, 3.4, gravity=0.2, drag=0.1, damp=0.1), lambda J: J["chin"], grounded, (0.0, 1.0))
        return out

    # ------------------------------------------------------------------------------------------------- parts
    @staticmethod
    def leg(cel: Cel, J: dict, name: str, far: bool) -> None:
        a, mid, end = J[name]
        # The upper leg wears the coat; the lower leg is bare, thin and dark, on a cloven hoof.
        cel.limb(a, mid, 14.0, 7.5, "bone", (1, 2, 4) if far else (2, 3, 5))
        for i, t in enumerate((0.4, 0.62, 0.84, 1.0)):  # locks down the back of it, over the joint
            x, y = lerp(a[0], mid[0], t), lerp(a[1], mid[1], t)
            cel.limb((x, y), (x - 1.5 + i * 0.6, y + 7.0), 4.6, 1.6, "bone", (1, 2, 4) if far else (2, 3, 5))
        cel.limb(mid, end, 5.2, 3.8, "ink", (1, 2, 4), far=far)
        d = (end[0] - mid[0], end[1] - mid[1])
        n = math.hypot(*d) or 1.0
        d = (d[0] / n, d[1] / n)
        toe = (end[0] + d[0] * 3.4 + 1.4, min(end[1] + d[1] * 3.4, GROUND - 0.6))
        cel.limb(end, toe, 5.8, 7.0, "ink", (0, 1, 3), far=far)
        cel.put(toe[0] + 0.5, toe[1] + 1.0, VOID)  # the cleft

    def coat(self, cel: Cel, J: dict, pose: Pose) -> None:
        """The wool: matted locks laid like thatch over the body and up the neck, each hanging straight down whatever
        the beast is doing; dark underneath, pale along the back, the hem dragged red. Then the parting, and what
        is behind it."""
        B, pel, fwd, dor = J["B"], J["pel"], J["fwd"], J["dor"]
        nb, head = J["nb"], J["head"]
        ax = (head[0] - nb[0], head[1] - nb[1])
        al = math.hypot(*ax) or 1.0
        ax = (ax[0] / al, ax[1] / al)
        nrm = (ax[1], -ax[0])  # the back of the neck
        neck_poly = [B(48.0, 31.0), (head[0] + nrm[0] * 11.0, head[1] + nrm[1] * 11.0), (head[0] - nrm[0] * 10.0 + ax[0] * 5.0, head[1] - nrm[1] * 10.0 + ax[1] * 5.0),
                     B(78.0, -8.0)]
        body_mask = set(cel.poly_mask([B(u, v) for u, v in BODY]))
        inside = body_mask | set(cel.poly_mask(neck_poly))
        layer = Cel(cel.w, cel.h, cel.top)
        for xy in inside:
            layer.px[xy] = ("bone", 1)

        sway = pose["sway"]
        locks: list[tuple[Pt, float, float, tuple[int, int, int], bool]] = []  # root, angle from straight down, length, tones, hem
        row = 0
        for v in range(-37, 36, 5):
            row += 1
            for ui, u in enumerate(range(-24 + (3 if row % 2 else 0), 82, 6)):
                h = _rnd(ui * 7 + 3, row * 13 + 1)
                depth = v - vedge(u)
                hem = depth < 8.0
                light = _clamp((v + 30.0) / 56.0) + 0.2 * _clamp(u / 75.0) + (h - 0.5) * 0.3
                tones = (4, 6, 7) if light > 0.92 else (4, 5, 6) if light > 0.7 else (3, 4, 6) if light > 0.46 else (2, 3, 5) if light > 0.24 else (1, 2, 4)
                locks.append((B(u + (h - 0.5) * 2.0, v), sway * (0.55 + 0.6 * h) + (h - 0.5) * 10.0, (13.0 if hem else 10.0) + 4.0 * h, tones, hem))
        for ti in range(1, 6):  # up the neck: longer on the throat, where it hangs like a dewlap
            t = ti / 5.0
            c = (lerp(nb[0], head[0], t), lerp(nb[1], head[1], t))
            half = lerp(18.0, 10.0, t)
            for si in range(-2, 3):
                s = si / 2.0
                h = _rnd(ti * 5 + 40, si * 11 + 70)
                root = (c[0] + nrm[0] * s * half, c[1] + nrm[1] * s * half)
                throat = s < -0.4
                tones = (4, 5, 6) if s > 0.4 else (3, 4, 6) if s > -0.1 else (2, 3, 5) if not throat else (1, 2, 4)
                locks.append((root, sway * (0.6 + 0.6 * h) + (h - 0.5) * 12.0, (14.0 if throat else 10.0) + 3.0 * h, tones, throat))
        locks.sort(key=lambda k_: -k_[0][1])
        for root, ang, length, tones, hem in locks:
            if (int(math.floor(root[0])), int(math.floor(root[1]))) not in inside:
                continue
            a = math.radians(ang)
            end = (root[0] + math.sin(a) * length, root[1] + math.cos(a) * length)
            tmp = Cel(cel.w, cel.h, cel.top)
            tmp.limb(root, end, 6.4, 2.6, "bone", tones)
            if hem:  # the tip of every lock of the hem has been through the red dust, and worse
                tip0 = (lerp(root[0], end[0], 0.55), lerp(root[1], end[1], 0.55))
                tmp.limb(tip0, end, 4.0, 2.4, "crimson", (1, 2, 3))
            for xy, t in tmp.px.items():
                if xy in inside or hem:
                    layer.px[xy] = t

        # The parting: along the belly the coat is drawn aside, and behind it there is nothing.
        part = pose["part"]
        if part > 0.01:
            u0, u1 = PART_U
            for (x, y) in list(layer.px):
                dx, dy = x + 0.5 - pel[0], y + 0.5 - pel[1]
                u, v = dx * fwd[0] + dy * fwd[1], dx * dor[0] + dy * dor[1]
                if not (u0 < u < u1):
                    continue
                t = (u - u0) / (u1 - u0)
                lim = PART_DEPTH * part * math.sin(math.pi * t ** 0.75) ** 0.6  # deepest under the belly, a slit up the brisket
                depth = v - vedge(u)
                if depth >= lim:
                    continue
                if (x, y) in body_mask:
                    layer.px[(x, y)] = VOID if depth < lim - 2.0 else ("crimson", 1) if depth < lim - 1.0 else ("crimson", 3)
                elif depth < 2.0:
                    del layer.px[(x, y)]

        # The handprints: red, a hand's size — small on this beast, and many.
        for i, (u, v, step) in enumerate(PRINTS):
            if pose["wisps"] > 0.1 + 0.075 * i:  # this one has left it
                continue
            ox, oy = B(u, v)
            for j, rowp in enumerate(HAND):
                for q, ch in enumerate(rowp):
                    xy = (int(math.floor(ox)) + q - 4, int(math.floor(oy)) + j - 3)
                    if ch == "x" and layer.px.get(xy, VOID)[0] == "bone":
                        layer.px[xy] = ("crimson", step if (q * 3 + j + i) % 5 else step + 1)
        cel.px.update(layer.px)

    @staticmethod
    def hand(cel: Cel, at: Pt, d: Pt, curl: float, size: float = 5.4) -> None:
        """A hand at the end of an arm: a palm and four long fingers, spread — or hooked, when it clutches."""
        palm = (at[0] + d[0] * 2.0, min(at[1] + d[1] * 2.0, GROUND - 1.0))
        cel.limb(at, palm, 3.2, 3.6, "sea", (5, 7, 8))
        for da in (-48.0, -16.0, 14.0, 44.0):
            f = _turn(d, da * (1.0 - 0.55 * curl) + (50.0 * curl if da > -20.0 else 0.0))
            tip = (palm[0] + f[0] * size, min(palm[1] + f[1] * size, GROUND - 0.8))
            cel.limb(palm, tip, 1.8, 1.0, "sea", (6, 8, 8))

    def arms(self, cel: Cel, J: dict, pose: Pose) -> None:
        """The arms that come out of the parting: long, each in one clean bow, each reaching for its own place — they
        never cross."""
        reach = pose["reach"]
        if reach <= 0.02:
            return
        B, dor = J["B"], J["dor"]
        out = (-dor[0], -dor[1])  # straight out of the belly
        grab, limp, only = pose["grab"], pose["limp"], int(round(pose["only"]))
        tx, tup = pose["grab_at"]
        u0, u1 = PART_U
        for i, (t, fan, length, bow) in enumerate(ARMS):
            if only >= 0 and i != only:
                continue
            u = lerp(u0, u1, t)
            o = B(u, vedge(u) + 5.0)
            d = _turn(out, fan + 7.0 * math.sin(math.tau * (pose["wig"] + i * 0.37)))
            full = length * (0.25 + 0.75 * reach)
            if grab > 0.01:  # each to its own side of the prey
                target = P(tx - 13.0 + 13.0 * i, tup + (9.0 if i == 1 else 0.0))
                to = (target[0] - o[0], target[1] - o[1])
                n = math.hypot(*to) or 1.0
                d = (lerp(d[0], to[0] / n, grab), lerp(d[1], to[1] / n, grab))
                full = lerp(full, min(n, length * 1.6), grab)
            if limp > 0.01:
                d = (lerp(d[0], 0.16 * (1 if i % 2 else -1), limp), lerp(d[1], 1.0, limp))
            n = math.hypot(*d) or 1.0
            d = (d[0] / n, d[1] / n)
            side = (-d[1] * bow, d[0] * bow)
            sag = full * (0.2 - 0.1 * reach) * (1.0 - 0.6 * limp)
            pts = []
            for q in range(7):
                f = q / 6.0
                b_ = math.sin(math.pi * f) * sag
                pts.append((o[0] + d[0] * full * f + side[0] * b_, min(o[1] + d[1] * full * f + side[1] * b_, GROUND - 2.0)))
            for q in range(6):
                cel.limb(pts[q], pts[q + 1], lerp(4.4, 2.6, q / 6), lerp(4.4, 2.6, (q + 1) / 6), "sea", (4, 6, 8) if q < 3 else (5, 7, 8))
            hd = (pts[6][0] - pts[5][0], pts[6][1] - pts[5][1])
            n = math.hypot(*hd) or 1.0
            self.hand(cel, pts[6], (hd[0] / n, hd[1] / n), pose["curl"], 6.0)

    def walkers(self, cel: Cel, J: dict, pose: Pose) -> None:
        """The two hands it walks on, under the hem."""
        for name, _ in WALKERS:
            o, el, wrist = J[name]
            cel.limb(o, el, 4.2, 3.4, "sea", (3, 5, 7))
            cel.limb(el, wrist, 3.4, 2.8, "sea", (4, 6, 8))
            fa = (wrist[0] - el[0], wrist[1] - el[1])
            n = math.hypot(*fa) or 1.0
            flat = _clamp(1.0 - pose[name][1] / 5.0)  # on the path the fingers lie along it, pointing ahead
            d = (lerp(fa[0] / n, 1.0, flat), lerp(fa[1] / n, 0.1, flat))
            n = math.hypot(*d) or 1.0
            self.hand(cel, wrist, (d[0] / n, d[1] / n), 0.2 * flat, 5.0)

    @staticmethod
    def horn(cel: Cel, pts: list[Pt], far: bool, w0: float = 12.5, w1: float = 2.6) -> None:
        n = len(pts) - 1
        for i in range(n):
            t0, t1 = i / n, (i + 1) / n
            a_, b_ = lerp(w0, w1, t0 ** 0.8), lerp(w0, w1, t1 ** 0.8)
            cel.limb(pts[i], pts[i + 1], a_, b_, "leather", (2, 4, 6) if i % 2 == 0 else (1, 3, 5), far=far)
        for i in range(1, n - 1):  # growth rings: a dark line across the horn at every joint
            (x0, y0), (x1, y1) = pts[i - 1], pts[i + 1]
            d = (x1 - x0, y1 - y0)
            m = math.hypot(*d) or 1.0
            nx, ny = -d[1] / m, d[0] / m
            half = lerp(w0, w1, (i / n) ** 0.8) / 2.0 - 0.6
            if half < 1.0:
                continue
            for s in range(int(-half), int(half) + 1):
                xy = (int(math.floor(pts[i][0] + nx * s)), int(math.floor(pts[i][1] + ny * s)))
                if cel.px.get(xy, VOID)[0] == "leather":
                    cel.px[xy] = ("leather", 0 if far else 1)

    def head(self, cel: Cel, J: dict, pose: Pose, ropes: dict) -> None:
        at, rot = J["head"], pose["head_rot"]

        def H(x: float, y: float) -> Pt:
            return on_head(at, rot, (x, y))

        self.horn(cel, J["hornF"], far=True)
        self.horn(cel, J["spikeF"], far=True, w0=7.0, w1=1.6)
        # The lower jaw: it hangs from the cheek and drops open; behind it the mouth is dark.
        hinge = H(*JAW_AT)
        jd = _turn((1.0, 0.0), FACE_SLOPE + rot + pose["jaw"] - 3.0)
        jaw_tip = (hinge[0] + jd[0] * 25.0, hinge[1] + jd[1] * 25.0)
        if pose["jaw"] > 5.0:
            cel.limb(H(20.0, 5.0), (lerp(hinge[0], jaw_tip[0], 0.8), lerp(hinge[1], jaw_tip[1], 0.8)), 4.0, 5.0, "crimson", (0, 1, 2))
        cel.limb(hinge, jaw_tip, 6.4, 4.2, "ink", (0, 1, 3))
        # The beard, off the chin.
        beard = ropes["beard"]
        for i in range(len(beard) - 1):
            cel.limb(beard[i], beard[i + 1], lerp(6.0, 1.6, i / 4), lerp(6.0, 1.6, (i + 1) / 4), "bone", (2, 4, 6))
        # Skull, cheek, the long face, the nose.
        cel.limb(H(-1.0, 0.0), H(13.0, -0.5), 18.0, 16.0, "ink", (1, 2, 4))
        cel.limb(H(6.0, 4.5), H(17.0, 5.0), 10.0, 7.0, "ink", (0, 1, 3))
        cel.limb(H(10.0, -1.0), H(40.0, 0.0), 14.5, 8.5, "ink", (1, 3, 5))
        cel.limb(H(35.0, 0.5), H(43.0, 1.0), 9.0, 8.0, "ink", (2, 4, 6))
        cel.put(*H(41.5, 0.0), VOID)
        cel.put(*H(42.5, 1.0), VOID)
        cel.limb(H(8.0, -8.0), H(21.0, -6.5), 2.6, 2.0, "ink", (3, 5, 7))  # the brow
        # The teeth: a row of flat ones, where a goat has none.
        for x in range(23, 41, 2):
            tx_, ty_ = H(float(x), 4.3 - (x - 23) * 0.07)
            cel.put(tx_, ty_, ("bone", 7))
            cel.put(tx_, ty_ + 1, ("bone", 5))
        # The eye.
        legend = eye_tones(pose["eye"])
        ex, ey = H(*EYE_AT)
        for j, row in enumerate(EYE):
            for i, ch in enumerate(row):
                if ch != ".":
                    cel.put(ex + i - 3, ey + j - 2, legend[ch])
        for q in range(-4, 5):  # the socket: a dark rim, so the eye is cut out of the face at any size
            for r in (-3, 3):
                if cel.px.get((int(math.floor(ex + q)), int(math.floor(ey + r))), VOID)[0] == "ink":
                    cel.put(ex + q, ey + r, VOID)
        for r in range(-2, 3):
            for q in (-4, 4):
                if cel.px.get((int(math.floor(ex + q)), int(math.floor(ey + r))), VOID)[0] == "ink":
                    cel.put(ex + q, ey + r, VOID)
        # The ear, low behind the eye; then the near horns.
        e0 = H(*EAR_AT)
        ed = _turn((-0.82, 0.57), rot + pose["ear"])
        cel.limb(e0, (e0[0] + ed[0] * 11.0, e0[1] + ed[1] * 11.0), 5.4, 2.4, "ink", (1, 3, 5))
        self.horn(cel, J["hornN"], far=False)
        self.horn(cel, J["spikeN"], far=False, w0=7.6, w1=1.6)
        # A forelock of wool between the horns.
        for i, (px, length) in enumerate((((5.0, -8.5), 8.0), ((9.0, -8.0), 7.0), ((1.5, -6.0), 6.0))):
            r0 = H(*px)
            fd = _turn((0.6, 0.8), rot * 0.6 + i * 9.0)
            cel.limb(r0, (r0[0] + fd[0] * length, r0[1] + fd[1] * length), 4.8, 1.8, "bone", (3, 5, 7) if i != 2 else (2, 4, 6))
        if pose["eye"] >= 1.15:  # the eye's light spills a little
            cel.soft(ex + 6.0, ey - 2.0, ("sea", 7))
            cel.soft(ex + 7.0, ey + 2.0, ("sea", 6))
            cel.soft(ex - 5.0, ey - 1.0, ("sea", 6))

    @staticmethod
    def ribbon(cel: Cel, pts: list[Pt], w0: float, w1: float, tones: tuple[int, int, int] = (3, 4, 6)) -> None:
        n = len(pts) - 1
        for i in range(n):
            cel.limb(pts[i], pts[i + 1], lerp(w0, w1, i / n), lerp(w0, w1, (i + 1) / n), "crimson", tones if i % 2 == 0 else (tones[0], tones[1], tones[1] + 1))

    @staticmethod
    def pennant(cel: Cel, pts: list[Pt]) -> None:
        """A strip of red cloth off the top of a stake: flat, as wide at its end as at the pole, each fold a tone of
        its own, the end cut in a fork."""
        n = len(pts) - 1
        half = 2.3
        edges = []
        for i in range(n + 1):
            a_, b_ = pts[max(0, i - 1)], pts[min(n, i + 1)]
            d = (b_[0] - a_[0], b_[1] - a_[1])
            m = math.hypot(*d) or 1.0
            nx, ny = -d[1] / m, d[0] / m
            edges.append(((pts[i][0] + nx * half, pts[i][1] + ny * half), (pts[i][0] - nx * half, pts[i][1] - ny * half)))
        for i in range(n):
            (a0, a1), (b0, b1) = edges[i], edges[i + 1]
            if i == n - 1:  # the fork: the middle of the end is cut back
                mid = ((pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2)
                quad = [a0, b0, mid, b1, a1]
            else:
                quad = [a0, b0, b1, a1]
            tone = ("brass", 5) if i == 1 else ("crimson", (4, 3, 5, 3, 4, 2, 4)[i % 7])
            for xy in cel.poly_mask(quad):
                if -cel.top <= xy[1] < GROUND:
                    cel.px[xy] = tone

    def stakes(self, cel: Cel, J: dict) -> None:
        for foot, top in J["stakes"]:
            cel.limb(foot, top, 2.8, 2.4, "leather", (1, 2, 4))
            cel.limb((lerp(foot[0], top[0], 0.84), lerp(foot[1], top[1], 0.84)), top, 3.8, 3.4, "brass", (2, 4, 6))  # the binding under the pennant

    # ------------------------------------------------------------------------------------------------- drawing
    def draw(self, cel, J, pose, ropes, between) -> None:
        B = J["B"]
        self.stakes(cel, J)
        for i in range(len(STAKES)):
            self.pennant(cel, ropes[f"pennant{i}"])
        self.leg(cel, J, "hindF", far=True)
        self.leg(cel, J, "foreF", far=True)
        self.walkers(cel, J, pose)
        # The tail: a short tuft, up when it is roused.
        t0 = B(-19.0, 5.0)
        td = _turn((-0.9, 0.44), -pose["tail"])
        cel.limb(t0, (t0[0] + td[0] * 10.0, t0[1] + td[1] * 10.0), 6.4, 3.0, "bone", (2, 3, 5))
        self.coat(cel, J, pose)
        if pose["smear"] > 0.5 and len(between) > 2:
            self.streak(cel, between)
        self.leg(cel, J, "hindN", far=False)
        self.leg(cel, J, "foreN", far=False)
        self.arms(cel, J, pose)
        self.head(cel, J, pose, ropes)
        self.ribbon(cel, ropes["rib0"], 3.0, 1.4, (4, 5, 6))
        self.ribbon(cel, ropes["rib1"], 2.8, 1.2, (3, 4, 6))
        # Nothing of it shows below the path.
        for xy in [xy for xy in cel.px if xy[1] > GROUND]:
            del cel.px[xy]
        cel.outline()
        for xy in [xy for xy in cel.px if xy[1] > GROUND + 1]:
            del cel.px[xy]

        # Effects, behind the figure.
        if 0.01 < pose["shock"] < 0.985:
            self.shock(cel, pose["shock_x"], pose["shock"])
        if pose["kick"] > 0.01:
            self.puff(cel, pose["kick_x"], pose["kick"])
        if pose["wisps"] > 0.01:
            self.wisps(cel, J, pose["wisps"])

    def streak(self, cel: Cel, between: list) -> None:
        """The fore hooves come down faster than the eye: where they went through the air stays pale for a frame."""
        n = len(between)
        for name, w1 in (("foreF", 3.4), ("foreN", 4.6)):
            path = [Jb[name][2] for Jb, _ in between]
            for i in range(n // 3, n - 1):
                t0, t1 = (i - n // 3) / (n - n // 3), (i + 1 - n // 3) / (n - n // 3)
                (x0, y0), (x1, y1) = path[i], path[i + 1]
                if min(y0, y1) >= GROUND - 1:
                    continue
                tmp = Cel(cel.w, cel.h, cel.top)
                tmp.limb((x0, y0), (x1, y1), lerp(1.0, w1, t0), lerp(1.0, w1, t1), "bone", (6, 7, 7))
                for (x, y), tone in tmp.px.items():
                    if y < GROUND:
                        cel.px[(x, y)] = ("light", 0) if t1 > 0.6 and tone[1] == 7 else tone

    @staticmethod
    def shock(cel: Cel, at: float, u: float) -> None:
        """Where the hooves land: the path splits, a wall of red dust stands up either side, stones fly."""
        ix = ROOT_X + at
        reach = 10.0 + 30.0 * u
        for i in range(int(reach)):
            for sgn in (-1, 1):
                x = ix + sgn * i
                cel.soft(x, GROUND - 1, ("leather", 1) if (i + (sgn > 0)) % 3 else ("leather", 3))
                if u < 0.8 and i > reach * 0.25:
                    puff = 2.0 + 7.0 * math.sin(math.pi * (i / reach)) * (1.0 - u)
                    for s_ in range(int(puff)):
                        if (i + s_) % 2 == 0 or s_ == 0:
                            cel.soft(x, GROUND - 2 - s_, ("bone", 5) if s_ < puff - 2.0 else ("crimson", 6) if s_ < puff - 1.0 else ("crimson", 5))
        if u < 0.3:
            cel.star(ix, GROUND - 3, 6)
            for q in range(-11, 12):
                cel.soft(ix + q, GROUND - 2, ("light", 0) if abs(q) < 7 else ("bone", 7))
        for i in range(15):  # stones and clods, thrown up in a fan
            ang = math.radians(-170 + i * 11.5)
            dist = 7.0 + (22.0 + (i * 5 % 4) * 5.0) * u
            x = ix + math.cos(ang) * dist * 1.3
            y = GROUND - 2 + math.sin(ang) * dist + 15.0 * u * u
            if y >= GROUND - 1:
                continue
            tone = ("leather", 5) if i % 2 else ("crimson", 4)
            big = i % 3 == 0 and u < 0.8
            for qx, qy in ((0, 0), (1, 0), (0, 1), (1, 1), (2, 0), (2, 1)) if big else ((0, 0), (1, 0), (0, 1)):
                cel.soft(x + qx, y + qy, ("leather", 2) if qy else tone)

    @staticmethod
    def puff(cel: Cel, at: float, u: float) -> None:
        """Dust off a hoof."""
        ix = ROOT_X + at
        for i in range(-5, 6):
            hgt = (3.0 + 2.0 * u) * (1.0 - (i / 5.5) ** 2) * (1.0 - 0.5 * u)
            for s_ in range(int(hgt) + 1):
                if (i + s_) % 2 == 0:
                    cel.soft(ix + i - 4.0 * u, GROUND - 1 - s_ - 2.0 * u, ("bone", 5) if s_ else ("crimson", 6))

    @staticmethod
    def wisps(cel: Cel, J: dict, u: float) -> None:
        """What was laid on it, leaving: each red mark lifts off the coat and goes up, red at first and then cold —
        the coat is left clean."""
        B = J["B"]
        for i, (pu, pv, _) in enumerate(PRINTS):
            start = 0.1 + 0.075 * i
            for k_ in range(3):
                born = start + 0.05 * k_
                if u <= born:
                    continue
                age = (u - born) / 0.42
                if age >= 1.0:
                    continue
                x0, y0 = B(pu, pv)
                x = x0 + 6.0 * math.sin(age * 5.0 + i + k_ * 2.0) - 7.0 * age
                y = y0 - 6.0 - 52.0 * age - 4.0 * k_
                if y < -cel.top + 2:
                    continue
                head = ("crimson", 5) if age < 0.2 else ("sea", 7) if age < 0.7 else ("sea", 5)
                tail = ("crimson", 3) if age < 0.2 else ("sea", 4)
                for qx, qy in ((0, 0), (1, 0), (0, 1), (1, 1)) if age < 0.75 else ((0, 0),):
                    cel.soft(x + qx, y + qy, head)
                cel.soft(x + 0.5, y + 2, tail)
                cel.soft(x + 0.5, y + 3, tail)


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(hip=(-50.0, 56.0), pitch=6.0, hindN=(-61.0, 0.0), hindF=(-46.0, 0.0), foreN=(6.0, 0.0), foreF=(20.0, 0.0), handA=(-24.0, 0.0), handB=(-4.0, 0.0),
                  neck=(28.0, 15.0), head_rot=0.0, jaw=0.0, ear=0.0, eye=1.0, part=0.0, reach=0.0, grab=0.0, grab_at=(54.0, 16.0), limp=0.0, only=-1.0, wig=0.0, curl=0.0,
                  sway=0.0, tail=0.0, stake=0.0, shock=0.0, shock_x=59.0, smear=0.0, kick=0.0, kick_x=20.0, wisps=0.0, flash=0.0)


def k(**over: object) -> Pose:
    return {**BASE, **over}


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.18))
    later = math.sin(math.tau * (ph - 0.32))
    pose = {**BASE, "hip": (-50.0, 55.3 - 0.7 * s), "pitch": 6.0 + 0.5 * late, "neck": (28.0 + 1.5 * later, 15.0), "sway": 2.5 * later, "tail": 5.0 * later,
            "eye": 1.2 if math.sin(math.tau * 3 * ph) > 0.5 else 1.0, "wig": ph}
    f = int(round(ph * 16)) % 16
    if 1 <= f <= 6 and f % 2 == 1:  # it chews, staring
        pose["jaw"] = 7.0
    if f == 9:
        pose["ear"] = 34.0
    # A third hand comes out between its fore legs, feels the air towards the prey, and is taken back in.
    peek = {2: (0.16, 0.15, 0.0), 3: (0.3, 0.4, 0.0), 4: (0.34, 0.55, 0.0), 5: (0.34, 0.55, 0.7), 6: (0.3, 0.4, 0.3), 7: (0.16, 0.15, 0.0)}.get(f)
    if peek is not None:
        pose["part"], pose["reach"], pose["curl"], pose["only"] = peek[0], peek[1], peek[2], 2.0
    # One of the hands it stands on lifts, and is set down again a little further on.
    drum = {9: (-25.0, 3.0), 10: (-23.0, 5.0), 11: (-21.0, 2.0)}.get(f)
    if drum is not None:
        pose["handA"] = drum
    elif f >= 12:
        pose["handA"] = (-21.0 - (f - 11) * 0.75, 0.0)
    # It paws the path with the far fore hoof.
    paw = {11: (23.0, 6.0), 12: (26.0, 1.0), 13: (18.0, 0.0), 14: (19.0, 4.0), 15: (20.0, 1.0)}.get(f)
    if paw is not None:
        pose["foreF"] = paw
    if f == 13:
        pose["kick"], pose["kick_x"] = 0.3, 23.0
    if f == 14:
        pose["kick"], pose["kick_x"] = 0.8, 23.0
    return pose


def _step(q: float, reach: float, high: float) -> tuple[float, float]:
    """One hoof through a stride: on the ground it goes back under the body; then it is snatched up and thrown ahead."""
    if q < 0.56:
        return (lerp(reach, -reach, q / 0.56), 0.0)
    u = (q - 0.56) / 0.44
    e = u * u * (3 - 2 * u)
    return (lerp(-reach, reach, e), high * math.sin(math.pi * u) ** 0.8)


def trot_pose(ph: float) -> Pose:
    a, b = _step(ph % 1.0, 15.0, 11.0), _step((ph + 0.5) % 1.0, 15.0, 11.0)
    ha, hb = _step((ph + 0.25) % 1.0, 9.0, 6.0), _step((ph + 0.75) % 1.0, 9.0, 6.0)
    c2 = math.cos(2 * math.tau * (ph - 0.06))
    land = (2 * ph) % 1.0
    return {**BASE, "hip": (-50.0, 54.0 + 2.0 * c2), "pitch": 2.0 + 2.8 * math.cos(2 * math.tau * (ph - 0.22)),
            "hindN": (-59.0 + a[0], a[1]), "foreF": (21.0 + a[0], a[1]), "hindF": (-46.0 + b[0], b[1]), "foreN": (7.0 + b[0], b[1]),
            "handA": (-24.0 + ha[0], ha[1]), "handB": (-4.0 + hb[0], hb[1]),
            "neck": (14.0 + 4.0 * math.cos(2 * math.tau * (ph - 0.3)), 15.0), "head_rot": 6.0, "sway": 9.0 * math.cos(2 * math.tau * (ph - 0.36)) - 9.0,
            "tail": 26.0 + 8.0 * c2, "eye": 1.3, "ear": -10.0, "stake": 0.7 * math.cos(2 * math.tau * (ph - 0.3)),
            "kick": land if land < 0.6 else 0.0, "kick_x": -46.0 if ph < 0.5 else -32.0}


# The strike. It sinks on its haunches and rears — the whole beast upright, belly to the prey, the coat splitting and
# every arm out — hangs there, and comes down with both fore hooves and all its weight.
_REAR = dict(hip=(-31.0, 41.0), pitch=46.0, hindN=(-46.0, 0.0), hindF=(-32.0, 0.0), foreN=(41.0, 73.0), foreF=(49.0, 61.0), handA=(14.0, 34.0), handB=(30.0, 46.0),
             neck=(-25.0, 15.0), head_rot=40.0, jaw=16.0, eye=1.5, part=1.0, reach=1.0, sway=-12.0, tail=40.0, stake=-1.0)
_DOWN = dict(hip=(-13.0, 53.0), pitch=-8.0, hindN=(-46.0, 0.0), hindF=(-32.0, 0.0), foreN=(56.0, 0.0), foreF=(62.0, 0.0), handA=(22.0, 0.0), handB=(40.0, 0.0),
             neck=(108.0, 15.0), head_rot=38.0, jaw=10.0, eye=1.5, part=0.6, reach=0.3, curl=0.8, sway=14.0, tail=10.0, stake=1.5)
STRIKE_KEYS = [
    (0.00, k(), "lin"),
    (0.12, k(hip=(-53.0, 51.0), pitch=1.0, neck=(22.0, 15.0), eye=1.3, hindN=(-57.0, 4.0), handA=(-26.0, 0.0), sway=-4.0, tail=20.0), "io"),
    (0.20, k(hip=(-46.0, 49.0), pitch=14.0, foreN=(7.0, 8.0), foreF=(21.0, 12.0), hindN=(-46.0, 0.0), hindF=(-42.0, 4.0), handA=(-22.0, 4.0), handB=(-2.0, 6.0),
             neck=(10.0, 15.0), head_rot=20.0, eye=1.3, part=0.2, sway=-6.0, tail=30.0), "io"),
    (0.30, k(hip=(-36.0, 47.0), pitch=35.0, foreN=(24.0, 46.0), foreF=(34.0, 44.0), hindN=(-46.0, 0.0), hindF=(-32.0, 0.0), handA=(-2.0, 20.0), handB=(14.0, 30.0),
             neck=(-8.0, 15.0), head_rot=34.0, eye=1.5, part=0.7, reach=0.5, sway=-10.0, tail=40.0, jaw=6.0), "out"),
    (0.42, k(**_REAR), "out"),
    (0.50, k(**{**_REAR, "hip": (-32.0, 42.0), "pitch": 47.5, "foreN": (43.0, 77.0), "foreF": (51.0, 65.0), "handA": (18.0, 36.0), "handB": (34.0, 48.0), "jaw": 24.0,
                "curl": 0.5, "wig": 0.5, "sway": -6.0}), "io"),
    (0.55, k(**_DOWN, smear=1.0, shock=0.02), "in3"),
    (0.70, k(**{**_DOWN, "hip": (-12.0, 51.0), "pitch": -10.0, "neck": (100.0, 15.0), "part": 0.45, "reach": 0.12, "sway": 4.0}, shock=0.98), "out"),
    (0.77, k(hip=(-22.0, 53.0), pitch=-4.0, hindN=(-46.0, 0.0), hindF=(-32.0, 0.0), foreN=(40.0, 7.0), foreF=(62.0, 0.0), handA=(12.0, 4.0), handB=(40.0, 0.0),
             neck=(70.0, 15.0), head_rot=20.0, eye=1.3, part=0.25, sway=-4.0, shock=1.0), "io"),
    (0.84, k(hip=(-36.0, 55.0), pitch=2.0, hindN=(-53.0, 4.0), hindF=(-32.0, 0.0), foreN=(13.0, 0.0), foreF=(48.0, 7.0), handA=(-8.0, 0.0), handB=(22.0, 5.0),
             neck=(40.0, 15.0), head_rot=6.0, eye=1.3, part=0.1, sway=-6.0, shock=1.0), "io"),
    (0.92, k(hip=(-46.0, 56.0), pitch=5.0, hindN=(-61.0, 0.0), hindF=(-39.0, 4.0), foreN=(7.0, 0.0), foreF=(23.0, 0.0), handA=(-20.0, 4.0), handB=(0.0, 0.0), sway=3.0,
             shock=1.0), "io"),
    (1.00, k(shock=1.0), "io"),
]

# Hit: the head is thrown up and back, a fore hoof leaves the ground, it gives a step with the hind legs.
HURT_KEYS = [
    (0.00, k(), "lin"),
    (0.07, k(hip=(-52.0, 51.0), pitch=7.0, neck=(34.0, 15.0), head_rot=-12.0, jaw=8.0, ear=20.0, sway=-8.0, stake=1.0, eye=1.5, flash=1.0), "out3"),
    (0.16, k(hip=(-55.0, 48.0), pitch=10.0, foreN=(4.0, 6.0), handB=(-6.0, 5.0), neck=(46.0, 15.0), head_rot=-30.0, jaw=20.0, ear=30.0, sway=-15.0, stake=-1.0, part=0.22,
             eye=1.5, tail=40.0, flash=0.5), "lin"),
    (0.26, k(hip=(-57.0, 47.0), pitch=11.0, foreN=(2.0, 3.0), hindN=(-65.0, 4.0), handB=(-9.0, 0.0), handA=(-27.0, 4.0), neck=(50.0, 15.0), head_rot=-40.0, jaw=22.0,
             sway=-10.0, part=0.22, eye=0.5, tail=40.0), "out"),
    (0.50, k(hip=(-54.0, 52.0), pitch=3.0, foreN=(3.0, 0.0), hindN=(-64.0, 0.0), hindF=(-50.0, 4.0), handA=(-28.0, 0.0), handB=(-8.0, 3.0), neck=(18.0, 15.0), head_rot=8.0,
             sway=9.0, eye=1.5, stake=0.6), "io"),
    (0.74, k(hip=(-51.0, 55.0), foreN=(5.0, 3.0), hindN=(-62.0, 0.0), hindF=(-47.0, 0.0), handA=(-26.0, 3.0), handB=(-5.0, 0.0), neck=(26.0, 15.0), sway=-3.0, eye=1.3), "io"),
    (1.00, k(), "io"),
]

# Death. One last rear, the arms out and what it carried leaving it; then it kneels, and lies down.
_BLEAT = dict(hip=(-44.0, 42.0), pitch=22.0, foreN=(14.0, 30.0), foreF=(24.0, 34.0), hindN=(-58.0, 0.0), hindF=(-43.0, 0.0), handA=(-8.0, 12.0), handB=(8.0, 20.0),
              neck=(38.0, 15.0), head_rot=-44.0, jaw=28.0, part=0.85, reach=0.9, eye=1.5, sway=-10.0, tail=40.0)
_KNEEL = dict(hip=(-50.0, 49.0), pitch=-14.0, hindN=(-62.0, 0.0), hindF=(-47.0, 0.0), foreN=(-10.0, 0.0), foreF=(2.0, 0.0), handA=(-30.0, 0.0), handB=(-12.0, 0.0))
_LAIN = dict(hip=(-68.0, 27.0), pitch=-2.0, hindN=(-80.0, 0.0), hindF=(-66.0, 0.0), foreN=(-18.0, 0.0), foreF=(-6.0, 0.0), handA=(-44.0, 0.0), handB=(-26.0, 0.0),
             neck=(-70.0, 15.0), head_rot=-24.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.04, k(hip=(-52.0, 51.0), pitch=7.0, neck=(34.0, 15.0), head_rot=-12.0, jaw=8.0, ear=20.0, sway=-8.0, stake=1.0, eye=1.5, flash=1.0), "out3"),
    (0.12, k(**_BLEAT), "out"),
    (0.22, k(**{**_BLEAT, "hip": (-43.0, 41.0), "pitch": 26.0, "foreN": (20.0, 38.0), "foreF": (30.0, 38.0), "neck": (42.0, 15.0), "head_rot": -54.0, "jaw": 32.0, "part": 1.0,
                "reach": 1.0, "wig": 0.6, "eye": 1.3}, wisps=0.08), "io"),
    (0.30, k(**{**_BLEAT, "pitch": 16.0, "foreN": (8.0, 14.0), "foreF": (20.0, 16.0), "neck": (40.0, 15.0), "head_rot": -36.0, "jaw": 20.0, "reach": 0.9, "limp": 0.8,
                "eye": 0.8, "sway": 6.0}, wisps=0.2), "in"),
    (0.38, k(**_KNEEL, neck=(30.0, 15.0), head_rot=-14.0, jaw=12.0, part=0.9, reach=0.7, limp=1.0, eye=0.8, sway=10.0, tail=10.0, stake=1.5, wisps=0.32, kick=0.3, kick_x=6.0), "in"),
    (0.50, k(**{**_KNEEL, "hip": (-52.0, 47.0), "pitch": -16.0}, neck=(-30.0, 15.0), head_rot=0.0, part=0.7, reach=0.5, limp=1.0, eye=0.5, sway=-3.0, wisps=0.48), "io"),
    (0.62, k(hip=(-60.0, 35.0), pitch=-7.0, hindN=(-74.0, 0.0), hindF=(-58.0, 0.0), foreN=(-14.0, 0.0), foreF=(-2.0, 0.0), handA=(-38.0, 0.0), handB=(-20.0, 0.0),
             neck=(-56.0, 15.0), head_rot=-16.0, part=0.45, reach=0.3, limp=1.0, eye=0.3, sway=8.0, stake=-1.5, wisps=0.62, kick=0.3, kick_x=-70.0), "in"),
    (0.74, k(**_LAIN, part=0.2, eye=0.15, sway=-4.0, stake=1.0, wisps=0.76, kick=0.8, kick_x=-70.0), "out"),
    (0.86, k(**{**_LAIN, "hip": (-68.0, 26.0)}, eye=0.0, wisps=0.9), "io"),
    (1.00, k(**{**_LAIN, "hip": (-68.0, 26.0)}, eye=0.0, wisps=1.0), "lin"),
]

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 16 for i in range(16)], [150] * 16, True, air=lambda t: (-0.55 + 0.22 * math.sin(math.tau * t), 0.0)),
    "run": Anim("run", trot_pose, [i / 12 for i in range(12)], [95] * 12, True, air=lambda t: (-1.2, 0.0)),
    "attack": Anim("attack", keyed(STRIKE_KEYS), [0.0, 0.06, 0.12, 0.18, 0.24, 0.30, 0.36, 0.42, 0.50, 0.55, 0.59, 0.63, 0.67, 0.70, 0.77, 0.84, 0.92, 1.0],
                   # An enemy swings every 1250 ms and the game starts this clip its wind-up ahead of the swing: 660 ms to
                   # the blow (the frame after the 130 ms hang), 290 of impact, 290 to stand back — it fits between two swings.
                   [60, 60, 70, 60, 60, 70, 70, 80, 130, 40, 50, 60, 60, 80, 80, 70, 70, 70], False, air=lambda t: (-0.4, 0.0)),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, air=lambda t: (-0.4, 0.0)),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.02, 0.04, 0.08, 0.12, 0.17, 0.22, 0.26, 0.30, 0.34, 0.38, 0.44, 0.50, 0.56, 0.62, 0.68, 0.74, 0.80, 0.86, 0.93, 1.0],
                  [70, 50, 80, 100, 130, 130, 150, 110, 100, 90, 120, 140, 160, 130, 110, 100, 130, 160, 200, 300, 1500], False,
                  air=lambda t: (-0.4 * (1.0 - t), 0.0)),
}
