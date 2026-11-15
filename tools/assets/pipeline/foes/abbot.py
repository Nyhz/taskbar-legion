"""The Gilded Abbot — world 5, WORLD boss. The saint of the Monastery Peaks, who sat down to die and did not.

A giant seated in the lotus, as tall as the strip, who never touches the path: he hangs a hand above it, the rags
of his crimson robe dragging icicles through the snow. He was gilded where he sat, like a statue; the gold leaf
is flaking off a dried, leathery corpse. The crested yellow hat of his order stands on his head; behind him turns
the gilt aureole of a temple image, cracked; skulls are the beads of his rosary; the monastery's prayer flags
are still tied to him and trail behind. His face is the horror: a golden mask of a face with two black sockets,
a pin of fire in each, no lips over the teeth, the jaw hanging in a chant that will not stop — his breath shows
in the cold. One hand lies over his knee and its nails reach the ground. The other is raised, palm out, in the
gesture that means "do not be afraid".

He drifts at the prey in lurches, the raised hand clawing ahead. Attack: the aureole catches fire, he tips back
and lifts that hand high over his head — and brings the blessing down flat on whoever stands before him; the path
cracks, snow and gold burst along it. Hit: the float tips, the head whips back, leaf flies off him. Death: the
fire goes out, the aureole breaks and falls behind him piece by piece, and at last he drops onto the path and
SITS on it; all his gold leaves him and rises like snow falling upwards; the hand comes down into his lap, the
head bows under its hat, and what is left is a dark, dried monk who has finally finished, snow settling on
his shoulders.

Own rig (nothing of the humanoid skeleton). Frame 248 wide with 59 extra rows above, root at 104: he sits 10 px
behind the root. The Knight closes to 50 px of the root whatever the boss's reach is, so below the Knight's height
nothing of him passes 36 px (his forward knee; the elbow of the raised arm comes to 40 as the hand claws); the
raised hand hangs above the Knight's head, and the palm comes down just short of him — the wrist 31 px ahead, the
nails at his feet, 58 px ahead — with the burst of snow on him. Drawn facing right; the game mirrors enemies."""
from __future__ import annotations

import math

from ..rig import GROUND, HURT_MS, HURT_TIMES, Anim, Build, Cel, Chain, ChainSpec, Character, Pose, Pt, ik, keyed, lerp, swing_smear

FIGURE = ("Abbot", "boss", "w05")

ROOT_X = 104
#: Where he sits, behind the root.
SEAT_X = -10.0
BUILD = Build(root_x=ROOT_X, thigh=1.0, shin=1.0, foot=0.0, hip_dx=0.0, spine=0.0, sh_near=0.0, sh_far=0.0, upper=1.0, fore=1.0, neck=0.0)

FLOAT = 12.0  # how far above the path he hangs at rest
UPPER, FORE = 27.0, 27.0  # the bones of an arm
#: Places on the body, in its own frame (u forward, v up, from the middle of the seat).
SH_F, SH_B, NECK, HALO = (27.0, 50.0), (-27.0, 50.0), (3.0, 57.0), (-1.0, 66.0)
HALO_R = 39.0

VOID = ("ink", 0)

# The face, turned three-quarters to the prey and looking down at it: a gilded mask of a face. K the sockets, O / W
# the fire in them (tones follow the pose's `eye`), t / T the bared teeth, small letters the leather under the leaf.
FACE = [
    ".......GHHIIJJJJJJJJIIH.....",
    ".....GHHIIJJJLLLLLLJJJIIH...",
    "....GHHIIJJJLLLLLLLLJJJIIH..",
    "...GGHIIJJJJLLLLLLLLLJJJIH..",
    "...GHHIIJJcJJLLLLLLLJJJJIH..",
    "..GGHIIIJJJcJJJLLLJJJJJIIH..",
    "..GHHHIIIJJcbJJJJJJJJJIIHH..",
    "..GHbaaaaaaabHIJJHbaaaaaabH.",
    ".GGaKKKKKKKKKaHJJaKKKKKKKKa.",
    ".GHaKKKKKKKKKaHJJaKKKKKKKKa.",
    "HGHaKKKKKKKKKaIJJaKKKKKKKKa.",
    "IHHaKKKKKOWKKaIJJaKKKKOWKab.",
    "JIHbaKKKKOOKabIJJIaKKKOOabH.",
    "JIHHcbaaaaabcHIJJJIbaaabHH..",
    "JIGHHIIIHHHIIHHaKaJJIIIIH...",
    "JIGGHIIcIIIIHHaKKKaJIIIH....",
    "IHGGHHIccIIHHGaKKKaHIIHG....",
    ".HGGbGHHIIHHGGbbabbHHHG.....",
    ".HHGabGGHHGGcaaaaaaaHG......",
    ".GHG.abGGGcaTTtTTtTTtaG.....",
    "..HG..abGcaaTTtTTtTTta......",
    "..GG...aaa.KKKKKKKKKK.......",
]
#: The lower jaw, hung from the face at JAW_AT by its upper left corner; it drops as he chants.
JAW = [
    "aGcaKtTtTTtTTta.",
    "aGGcaTtTTtTTtaH.",
    ".aGGcaaaaaaaaHH.",
    "..aGHHIIIIIIHH..",
    "...aGHHIIIIHG...",
    "....aaGGGGGa....",
]
FACE_L = {"a": ("leather", 1), "b": ("leather", 2), "c": ("leather", 3), "G": ("brass", 3), "H": ("brass", 4), "I": ("brass", 5), "J": ("brass", 6),
          "L": ("brass", 7), "K": VOID, "t": ("bone", 4), "T": ("bone", 7)}
#: Where the neck ends, in face pixels (the base of the skull), and where the jaw hangs from.
FACE_PIVOT = (10.0, 22.0)
JAW_AT = (8.0, 21.0)
MOUTH = (19.0, 23.0)

#: The prayer flags' colours, in their order on the string.
FLAGS = [("azure", 5), ("bone", 7), ("crimson", 5), ("moss", 5), ("brass", 5)]


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


def fire(eye: float) -> dict[str, tuple[str, int]]:
    """The pins of fire in the sockets; roused, the whole socket fills."""
    if eye >= 1.4:
        return {"O": ("brass", 7), "W": ("light", 0)}
    if eye >= 1.0:
        return {"O": ("brass", 6), "W": ("light", 0)}
    if eye >= 0.6:
        return {"O": ("crimson", 5), "W": ("brass", 6)}
    if eye >= 0.2:
        return {"O": ("crimson", 3), "W": ("crimson", 5)}
    return {"O": VOID, "W": VOID}


def vol(cel: Cel, pts: list[Pt], ramp: str, tones: tuple[int, int, int], dark: float = 0.26, light: float = 0.72) -> set[tuple[int, int]]:
    """A filled shape with volume: across every row the shadow lies on the left and the light on the right."""
    rows: dict[int, list[int]] = {}
    mask = cel.poly_mask(pts)
    for x, y in mask:
        rows.setdefault(y, []).append(x)
    for y, xs in rows.items():
        x0, x1 = min(xs), max(xs)
        w = max(1, x1 - x0)
        for x in xs:
            s = (x - x0) / w
            cel.put(x, y, (ramp, tones[2] if s > light else tones[0] if s < dark else tones[1]))
    return set(mask)


class Abbot(Character):
    build = BUILD
    W = 248
    TOP = 59

    # ------------------------------------------------------------------------------------------------- skeleton
    def chains(self) -> dict[str, ChainSpec]:
        # Two strings of prayer flags tied to the aureole, trailing behind him.
        return {
            "flagA": ChainSpec(Chain(9, 5.0, gravity=0.10, drag=0.16, damp=0.05), lambda J: J["tieA"], rest=(-0.9, 0.45)),
            "flagB": ChainSpec(Chain(7, 5.0, gravity=0.10, drag=0.18, damp=0.05), lambda J: J["tieB"], rest=(-0.85, 0.5)),
        }

    def joints(self, pose: Pose) -> dict:
        lean = math.radians(pose["lean"])
        seat = P(SEAT_X + pose["dx"], pose["lift"])
        fwd, up = (math.cos(lean), math.sin(lean)), (math.sin(lean), -math.cos(lean))

        def B(u: float, v: float) -> Pt:
            return (seat[0] + fwd[0] * u + up[0] * v, seat[1] + fwd[1] * u + up[1] * v)

        J: dict = {"B": B, "seat": seat, "pelvis": seat, "lean": (0.0, 0.0)}
        J["shF"], J["shB"] = B(*SH_F), B(*SH_B)
        J["neck"] = B(NECK[0] + pose["head_dx"], NECK[1] + pose["head_dy"])
        halo = B(*HALO)
        w = pose["halo_fall"]
        J["halo"] = (halo[0] - 10.0 * w, lerp(halo[1], GROUND - 9.0, w * w))
        J["tieA"] = (J["halo"][0] - HALO_R * 0.62, J["halo"][1] - HALO_R * 0.74)
        J["tieB"] = (J["halo"][0] - HALO_R * 0.98, J["halo"][1] - HALO_R * 0.05)
        # The arms reach for where the pose puts the hands (x from the root, height above the path).
        hx, hup = pose["handF"]
        J["elbF"], J["wrF"] = ik(J["shF"], P(hx, hup), UPPER, FORE, pose.get("bendF", -1))
        bx, bup = pose["handB"]
        J["elbB"], J["wrB"] = ik(J["shB"], P(bx + pose["dx"], bup + (pose["lift"] - FLOAT)), 31.0, 31.0, +1)
        return J

    @staticmethod
    def on_face(at: Pt, rot: float, px: Pt) -> Pt:
        v = _turn((px[0] - FACE_PIVOT[0], px[1] - FACE_PIVOT[1]), rot)
        return (at[0] + v[0], at[1] + v[1])

    # ------------------------------------------------------------------------------------------------- parts
    def halo(self, cel: Cel, J: dict, pose: Pose) -> None:
        """The aureole of a temple image: a gilt ring with a crown of flame points, cracked, a piece gone. Lit, the
        points are tongues of fire; broken, it falls behind him in pieces."""
        cx, cy = J["halo"]
        lit = pose["halo"]
        gone = pose["halo_break"]
        spin = pose["halo_spin"]
        gold = (4, 5, 6) if lit < 0.5 else (5, 6, 7)
        R0, R1 = HALO_R - 6.0, HALO_R

        def piece(seg: int) -> tuple[float, float, float]:
            """Where piece `seg` of the broken ring has got to: its offset and how far it has fallen (0…1). Each
            falls whole: the back ones are thrown out behind him and land standing in the snow, the front ones
            drop behind his shoulders."""
            fallen = _clamp(gone * 1.9 - (_hash(seg, 3) % 10) / 11.0)
            if fallen <= 0.0:
                return (0.0, 0.0, 0.0)
            mid = math.radians(seg * 30.0 + 3.0 + spin)
            low = cy + max(math.sin(mid + math.radians(d)) for d in (-15.0, 0.0, 15.0)) * R1
            out = min(0.0, math.cos(mid)) * 30.0 - 8.0
            return (out * (1.0 - (1.0 - fallen) ** 2), fallen * fallen * (GROUND - 1.0 - low), fallen)

        pieces = [piece(seg) for seg in range(12)]
        for py in range(int(cy - R1) - 1, int(cy + R1) + 2):
            for px in range(int(cx - R1) - 1, int(cx + R1) + 2):
                dx, dy = px + 0.5 - cx, py + 0.5 - cy
                r = math.hypot(dx, dy)
                if not (R0 <= r <= R1):
                    continue
                deg = (math.degrees(math.atan2(dy, dx)) - spin) % 360.0
                seg = int(((deg + 12) % 360) // 30)  # twelve pieces
                ox, oy, fallen = pieces[seg]
                x, y = px + ox, py + oy
                if y >= GROUND:
                    continue
                edge = r >= R1 - 1.0 or r <= R0 + 1.0
                s_ = dx / r * 0.55 - dy / r * 0.83  # lit towards the upper right
                tone = ("brass", gold[0] - 1) if edge else ("brass", gold[2] if s_ > 0.35 else gold[0] if s_ < -0.3 else gold[1])
                if (deg + 12) % 30 < 2.2 and not edge:
                    tone = ("brass", 2)  # the joints between its pieces
                elif not edge and int(r - R0) == 3 and (deg % 30) > 6:
                    tone = ("brass", gold[0])  # a line chased round it
                if fallen >= 1.0:
                    tone = ("brass", max(2, tone[1] - 1))  # lying in the snow, it has gone dull
                cel.put(x, y, tone)
        # The crown of points; lit, each is a tongue of flame that leans the way the ring turns.
        for i in range(12):
            deg = i * 30 + spin + 3
            if gone > 0.01:
                continue
            a = math.radians(deg)
            base = (cx + math.cos(a) * HALO_R, cy + math.sin(a) * HALO_R)
            flick = 0.75 + 0.25 * math.sin(pose["flick"] * math.tau * 2 + i * 2.1)
            length = 4.0 + lit * 9.0 * flick
            rise = -(math.sin(a + 0.35 * lit) * length - 2.0 * lit)
            if rise > 0.0:  # a tongue never leaves the frame: at the top of the ring it burns lower
                length *= _clamp((base[1] + cel.top - 1.5) / rise)
            tip = (base[0] + math.cos(a + 0.35 * lit) * length, base[1] + math.sin(a + 0.35 * lit) * length - 2.0 * lit * _clamp(length / 6.0))
            if lit < 0.08:
                continue
            else:
                cel.limb(base, tip, 5.0, 1.2, "crimson", (4, 5, 6))
                mid = (lerp(base[0], tip[0], 0.45), lerp(base[1], tip[1], 0.45))
                cel.limb(base, mid, 3.0, 1.0, "brass", (5, 6, 7))

    def flags(self, cel: Cel, ropes: dict[str, list[Pt]], pose: Pose) -> None:
        if pose["halo_break"] > 0.6:
            return
        for name in ("flagA", "flagB"):
            pts = ropes.get(name) or []
            for i in range(len(pts) - 1):
                (x0, y0), (x1, y1) = pts[i], pts[i + 1]
                cel.line((x0, y0), (x1, y1), ("leather", 3))
                if i == 0:
                    continue
                tone = FLAGS[(i + (2 if name == "flagB" else 0)) % len(FLAGS)]
                mx, my = (x0 + x1) / 2, (y0 + y1) / 2
                for q in range(5):  # a small pennant hanging from the string
                    half = 2.0 - q * 0.45
                    for s_ in range(int(-half - 0.5), int(half + 0.5) + 1):
                        if my + 1 + q < GROUND:
                            cel.put(mx + s_, my + 1 + q, (tone[0], tone[1] - (1 if s_ < 0 else 0)))

    def robe(self, cel: Cel, J: dict, pose: Pose) -> None:
        """The lap (the crossed legs under the robe), the rags hanging from it, and the trunk."""
        B = J["B"]
        sway = pose["sway"]
        # Rags under him, dragging; icicles on their ends.
        for i, (u, length, w) in enumerate(((-38, 8, 5), (-25, 14, 6), (-9, 10, 5), (6, 15, 6), (21, 9, 5), (35, 12, 5))):
            top = B(u, 1.0)
            end = (top[0] - sway * (0.6 + 0.1 * (i % 3)) - pose["dx"] * 0.0, min(top[1] + length + (pose["lift"] - FLOAT) * 0.9, GROUND - 0.5))
            cel.limb(top, end, w, 2.4, "crimson", (1, 2, 3) if i % 2 else (0, 1, 2))
            if end[1] < GROUND - 3 and i % 2 == 0:
                cel.limb(end, (end[0], min(end[1] + 4.0, GROUND - 0.5)), 1.8, 1.0, "azure", (6, 7, 8))
        lap = [B(u, v) for u, v in ((-46, 7), (-41, 15), (-27, 20), (-8, 22), (11, 21), (29, 18), (41, 13), (46, 7), (42, 1), (28, -3), (0, -5), (-28, -3), (-42, 1))]
        vol(cel, lap, "crimson", (1, 3, 4), dark=0.2, light=0.78)
        # The shins crossed under the cloth: two folds, and the shadow under the trunk.
        for (u0, v0), (u1, v1) in (((-36, 10), (14, 2)), ((36, 10), (-10, 1))):
            a, b = B(u0, v0), B(u1, v1)
            cel.line(a, b, ("crimson", 1))
            cel.line((a[0], a[1] - 1), (b[0], b[1] - 1), ("crimson", 4 if u0 > 0 else 3))
        for u in range(-24, 23, 2):
            cel.put(*B(u, 17.0 + (1.0 if abs(u) < 12 else 0.0)), ("crimson", 1))
        # A gold hem along the front of the lap.
        for u in range(-40, 44, 1):
            v = 1.0 - 0.0035 * u * u + 3.0
            if u % 7 != 3:
                cel.put(*B(u, v - 5.0), ("brass", 4 if u < 0 else 5))
        trunk = [B(u, v) for u, v in ((-28, 16), (-33, 30), (-33, 44), (-28, 53), (-14, 59), (11, 59), (25, 56), (32, 46), (31, 30), (26, 16))]
        vol(cel, trunk, "crimson", (1, 3, 4), dark=0.3, light=0.76)
        # Folds falling from the covered shoulder, and the saffron sash across the chest.
        for u0, v0, u1, v1 in ((-20, 52, -24, 20), (-13, 56, -15, 22), (-5, 57, -4, 26)):
            a, b = B(u0, v0), B(u1, v1)
            cel.line(a, b, ("crimson", 1))
        sash = [B(u, v) for u, v in ((10, 59), (23, 56), (-17, 17), (-28, 20))]
        # Heavy cloth: folds down the lit side of the trunk and across the lap.
        for u0, v0, u1, v1 in ((17, 50, 21, 19), (24, 46, 27, 20), (9, 30, 12, 17)):
            cel.line(B(u0, v0), B(u1, v1), ("crimson", 2))
            cel.line(B(u0 + 1, v0), B(u1 + 1, v1), ("crimson", 5))
        for u0, v0, u1, v1, c in ((-44, 8, -22, 16, 1), (-38, 4, -14, 12, 2), (44, 8, 24, 15, 2), (38, 3, 16, 11, 2), (-6, 14, 4, 0, 1)):
            cel.line(B(u0, v0), B(u1, v1), ("crimson", c))
        vol(cel, sash, "brass", (2, 3, 4), dark=0.34, light=0.8)
        cel.line(B(10, 59), B(-28, 20), ("brass", 1))
        cel.line(B(23, 56), B(-17, 17), ("brass", 1))
        for t in (0.15, 0.32, 0.5, 0.68, 0.85):
            a, b = B(lerp(16, -23, t) + 4, lerp(57, 18, t) + 3), B(lerp(16, -23, t) - 4, lerp(57, 18, t) - 3)
            cel.line(a, b, ("brass", 2))

    def mala(self, cel: Cel, J: dict, pose: Pose) -> None:
        """The rosary: skulls for beads, hanging to his belly; it swings a beat behind him."""
        B = J["B"]
        a, b = (-15.0, 56.0), (13.0, 57.0)
        sag, swing = 27.0, pose["swing"]
        pts = []
        for i in range(11):
            t = i / 10
            u = lerp(a[0], b[0], t) + swing * math.sin(math.pi * t)
            v = lerp(a[1], b[1], t) - sag * math.sin(math.pi * t) ** 0.8
            pts.append(B(u, v))
        for i in range(10):
            cel.line(pts[i], pts[i + 1], ("leather", 2))
        for i in range(1, 10):
            x, y = int(round(pts[i][0])), int(round(pts[i][1]))
            big = i == 5
            r = 3 if big else 2
            for dy in range(-r, r + 1):
                for dx in range(-r, r + 1):
                    if abs(dx) + abs(dy) <= r + 1 and not (abs(dx) == r and abs(dy) == r):
                        cel.put(x + dx, y + dy, ("bone", 7 if dx > 0 and dy < 0 else 5 if dx < 0 or dy > 0 else 6))
            cel.put(x - 1, y, VOID)
            cel.put(x + 1, y, VOID)
            if big:
                cel.put(x, y + 2, VOID)

    def arm(self, cel: Cel, sh: Pt, el: Pt, wr: Pt, bare: bool, scale: float = 1.0) -> None:
        if bare:
            cel.limb(sh, el, 12.0 * scale, 8.5 * scale, "brass", (3, 5, 6))
            cel.limb(el, wr, 9.0 * scale, 6.0 * scale, "brass", (3, 5, 6))
            for q, (p0, p1) in enumerate(((sh, el), (el, wr))):  # the armlets of a temple image
                x, y = lerp(p0[0], p1[0], 0.42), lerp(p0[1], p1[1], 0.42)
                d = (p1[0] - p0[0], p1[1] - p0[1])
                n = math.hypot(*d) or 1.0
                nx, ny = -d[1] / n, d[0] / n
                half = (5.4 if q == 0 else 4.0) * scale
                cel.line((x - nx * half, y - ny * half), (x + nx * half, y + ny * half), ("crimson", 4))
        else:
            cel.limb(sh, el, 15.0 * scale, 13.0 * scale, "crimson", (1, 3, 4))
            cel.limb(el, wr, 13.0 * scale, 12.0 * scale, "crimson", (1, 3, 4))
            for t, p0, p1 in ((0.75, sh, el), (0.2, el, wr), (0.45, el, wr), (0.7, el, wr)):  # the sleeve bunched at the elbow
                x, y = lerp(p0[0], p1[0], t), lerp(p0[1], p1[1], t)
                d = (p1[0] - p0[0], p1[1] - p0[1])
                n = math.hypot(*d) or 1.0
                nx, ny = -d[1] / n, d[0] / n
                cel.line((x - nx * 5.5 * scale, y - ny * 5.5 * scale), (x + nx * 4.0 * scale + d[0] / n * 2, y + ny * 4.0 * scale + d[1] / n * 2), ("crimson", 1))
            cel.limb((wr[0] - 1, wr[1]), (wr[0] + 1, wr[1] + 1), 12.0 * scale, 12.0 * scale, "brass", (3, 4, 5))  # the cuff

    def hand(self, cel: Cel, wr: Pt, rot: float, curl: float, flip: float = 1.0, scale: float = 1.0, nails: float = 7.0) -> Pt:
        """An open hand, far too big, the nails grown long. `rot` turns it clockwise from fingers-up; `curl`
        hooks the fingers into a claw. Returns the middle of the palm."""

        def H(s: float, f: float) -> Pt:
            v = _turn((s * flip * scale, -f * scale), rot)
            return (wr[0] + v[0], wr[1] + v[1])

        palm = [H(-6.5, 0.0), H(-7.0, 7.0), H(-6.0, 12.0), H(6.0, 12.5), H(7.0, 6.0), H(5.5, 0.0)]
        vol(cel, palm, "brass", (3, 5, 6))
        # The thumb, on the body's side.
        t0, t1, t2 = H(-6.0, 3.0), H(-10.5, 7.0 - 2.0 * curl), H(-11.5 + 3.0 * curl, 12.0 - 3.0 * curl)
        cel.limb(t0, t1, 4.2 * scale, 3.4 * scale, "brass", (3, 5, 6))
        cel.limb(t1, t2, 3.4 * scale, 2.4 * scale, "brass", (3, 5, 6))
        cel.limb(t2, (t2[0] + (t2[0] - t1[0]) * 0.7, t2[1] + (t2[1] - t1[1]) * 0.7), 1.8, 1.0, "bone", (4, 6, 7))
        for i, (s, length) in enumerate(((-4.6, 11.0), (-1.5, 13.0), (1.6, 12.0), (4.7, 9.5))):
            a = H(s, 11.5)
            bend = curl * (50.0 + 8.0 * i)
            d1 = _turn((0.0, -1.0), rot + flip * bend * 0.5)
            d2 = _turn((0.0, -1.0), rot + flip * bend * 1.5)
            m = (a[0] + d1[0] * length * 0.5 * scale, a[1] + d1[1] * length * 0.5 * scale)
            e = (m[0] + d2[0] * length * 0.5 * scale, m[1] + d2[1] * length * 0.5 * scale)
            cel.limb(a, m, 3.3 * scale, 3.0 * scale, "brass", (3, 5, 6))
            cel.limb(m, e, 3.0 * scale, 2.4 * scale, "brass", (3, 5, 6))
            n_end = (e[0] + d2[0] * nails, e[1] + d2[1] * nails)
            cel.limb(e, n_end, 2.0, 1.0, "bone", (4, 6, 7))
        # The wheel drawn on the palm of a blessing hand.
        c = H(0.0, 6.0)
        for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
            cel.put(c[0] + dx, c[1] + dy, ("crimson", 4))
        return c

    @staticmethod
    def leaf(part: Cel, origin: Pt, gild: float) -> None:
        """The gold leaf over a dried corpse: where it has flaked off (more of it as `gild` falls) the leather shows.
        The flakes belong to the part (`origin`), so they do not swim as he moves."""
        ox, oy = int(round(origin[0])), int(round(origin[1]))
        for (x, y), (ramp, i) in list(part.px.items()):
            if ramp != "brass":
                continue
            h = _hash((x - ox + ((y - oy) // 3) % 2 * 2) // 4, (y - oy) // 3) % 100
            if h >= gild * 100.0:
                part.px[(x, y)] = ("leather", max(0, min(5, i - 2)))

    def head(self, cel: Cel, J: dict, pose: Pose) -> None:
        at = J["neck"]
        rot = pose["head_rot"]
        legend = {**FACE_L, **fire(pose["eye"])}
        self.hat(cel, at, rot, pose)
        skin = Cel(cel.w, cel.h, cel.top)
        jaw_at = self.on_face(at, rot, JAW_AT)
        v = _turn((0.0, pose["jaw"]), rot)
        if pose["jaw"] > 1.0:  # the dark of the mouth behind the dropped jaw
            for q in range(int(pose["jaw"]) + 1):
                for i in range(3, 14):
                    p = self.on_face(at, rot, (JAW_AT[0] + i, JAW_AT[1] + q))
                    skin.put(p[0], p[1], ("crimson", 1) if q > pose["jaw"] * 0.55 and 5 < i < 12 else VOID)
        skin.stamp_rot(JAW, legend, jaw_at[0] + v[0], jaw_at[1] + v[1], 0.5, 0.5, rot + pose["jaw"] * 1.2)
        if abs(rot) < 6.0:
            skin.stamp(FACE, legend, at[0] - FACE_PIVOT[0], at[1] - FACE_PIVOT[1])
        else:
            skin.stamp_rot(FACE, legend, at[0], at[1], FACE_PIVOT[0], FACE_PIVOT[1], rot)
        self.leaf(skin, at, pose["gild"])
        if pose["eye"] >= 1.3:  # roused, the pins of fire swell and spill
            for ex, ey in ((9.5, 11.5), (22.5, 11.5)):
                c = self.on_face(at, rot, (ex, ey))
                for dx, dy, tone in ((0, 0, ("light", 0)), (1, 0, ("light", 0)), (0, 1, ("light", 0)), (1, 1, ("brass", 7)), (-1, 0, ("brass", 7)), (0, -1, ("brass", 7)),
                                     (2, 0, ("brass", 6)), (-1, 1, ("brass", 6)), (1, -1, ("brass", 6)), (0, 2, ("crimson", 5)), (-2, 0, ("crimson", 5)), (1, 2, ("crimson", 4))):
                    skin.put(c[0] + dx, c[1] + dy, tone)
        cel.px.update(skin.px)

    def hat(self, cel: Cel, at: Pt, rot: float, pose: Pose) -> None:
        """The pointed yellow hat of his order, its tip nodding forward, three bands round it, and two long lappets
        down to the shoulders."""

        def F(x: float, y: float) -> Pt:
            return self.on_face(at, rot, (x, y))

        # The lappets hang (they do not turn with the head).
        for x, length, far in ((3.0, 31.0, False), (25.0, 24.0, True)):
            top = F(x, 3.0)
            end = (top[0] - pose["sway"] * 0.6 + (1.5 if far else -4.0), top[1] + length)
            cel.limb(top, end, 6.0, 3.0, "brass", (2, 3, 4) if far else (3, 4, 5))
            cel.limb(end, (end[0], end[1] + 3.0), 2.0, 1.0, "crimson", (3, 4, 5))
        nod = pose["crest"]
        hat = [F(2, 3), F(1, -2), F(5, -9), F(9.5, -15), F(13 + 2 * nod, -20), F(17 + 5 * nod, -23 + nod), F(18 + 4 * nod, -18), F(21, -11), F(25, -4), F(27, 3)]
        vol(cel, hat, "brass", (3, 5, 6), dark=0.3, light=0.7)
        for y, x0, x1 in ((-3, 2, 25), (-9, 6, 21), (-15, 10, 18)):  # the bands
            cel.line(F(x0, y), F(x1, y + 1), ("crimson", 4))
            cel.line(F(x0, y + 1), F(x1, y + 2), ("brass", 2))
        cel.line(F(2, 3), F(27, 3), ("crimson", 3))
        cel.line(F(2, 2), F(27, 2), ("crimson", 5))

    def front_arm(self, cel: Cel, J: dict, pose: Pose) -> None:
        skin = Cel(cel.w, cel.h, cel.top)
        self.arm(skin, J["shF"], J["elbF"], J["wrF"], bare=True)
        self.leaf(skin, J["shF"], pose["gild"])
        cel.px.update(skin.px)
        hand = Cel(cel.w, cel.h, cel.top)
        self.hand(hand, J["wrF"], pose["hand_rot"], pose["curl"])
        self.leaf(hand, J["wrF"], pose["gild"])
        cel.px.update(hand.px)

    # ------------------------------------------------------------------------------------------------- drawing
    def draw(self, cel, J, pose, ropes, between) -> None:
        back = Cel(cel.w, cel.h, cel.top)
        self.halo(back, J, pose)
        self.flags(back, ropes, pose)
        cel.px.update(back.px)

        body = Cel(cel.w, cel.h, cel.top)
        self.robe(body, J, pose)
        self.mala(body, J, pose)
        # The hand over the knee, its nails on the ground.
        self.arm(body, J["shB"], J["elbB"], J["wrB"], bare=False, scale=0.9)
        hand = Cel(cel.w, cel.h, cel.top)
        self.hand(hand, J["wrB"], 180.0 + pose["hand_b_rot"], pose["curl_b"], flip=-1.0, scale=0.75, nails=6.0)
        self.leaf(hand, J["wrB"], pose["gild"])
        body.px.update(hand.px)
        cel.px.update(body.px)

        over = pose["arm_over"] > 0.5
        if not over:
            self.front_arm(cel, J, pose)
        self.head(cel, J, pose)
        if over:
            if pose["smear"] > 0.5 and len(between) > 2:
                tips = []
                for Jb, pb in between[3:]:
                    d = _turn((0.0, -1.0), pb["hand_rot"])
                    tips.append((Jb["wrF"][0] + d[0] * 26.0, Jb["wrF"][1] + d[1] * 26.0))
                swing_smear(cel, tips, [Jb["shF"] for Jb, _ in between[3:]])
            self.front_arm(cel, J, pose)
        if pose["snow"] > 0.02:
            self.snowfall(cel, pose["snow"])

        for xy in [xy for xy in cel.px if xy[1] > GROUND]:
            del cel.px[xy]
        cel.outline()
        for xy in [xy for xy in cel.px if xy[1] > GROUND]:
            del cel.px[xy]

        # His shadow on the path: he does not touch it.
        sx = J["seat"][0]
        half = 44.0 - 0.9 * (pose["lift"] - FLOAT)
        if pose["lift"] > 1.0:
            for i in range(int(-half), int(half) + 1):
                if abs(i) < half - 6 or i % 2 == 0:
                    cel.soft(sx + i, GROUND, ("ink", 1))
                if abs(i) < half - 12:
                    cel.soft(sx + i, GROUND + 1, ("ink", 1))
        # Effects, behind the figure.
        if pose["breath"] > 0.02 and pose["jaw"] > 2.4:
            self.breath(cel, J, pose)
        if 0.01 < pose["shock"] < 0.985:
            self.shock(cel, pose["shock_x"], pose["shock"], pose["shock_gold"])
        if 0.01 < pose["thud"] < 0.985:  # he comes down: the snow bursts out from under him on both sides
            self.shock(cel, SEAT_X - 52.0, pose["thud"], 0.0, spread=0.6)
            self.shock(cel, SEAT_X + 50.0, pose["thud"], 0.0, spread=0.6)
        if 0.01 < pose["shed"] < 0.99:
            self.shed(cel, J, pose["shed"])
        if 0.01 < pose["motes"] < 0.995:
            self.motes(cel, J, pose["motes"])
        if pose["halo"] > 0.3 and pose["halo_break"] < 0.05:
            cx, cy = J["halo"]
            for i in range(8):  # sparks off the burning ring
                u = (pose["flick"] * 2 + i / 8) % 1.0
                a = math.radians(200.0 + i * 20.0)
                cel.soft(cx + math.cos(a) * (HALO_R + 6.0 + 10.0 * u) - 4.0 * u, cy + math.sin(a) * (HALO_R + 4.0) - 12.0 * u,
                         ("brass", 7) if u < 0.4 else ("brass", 5) if u < 0.75 else ("crimson", 5))

    @staticmethod
    def snowfall(cel: Cel, u: float) -> None:
        """Snow settles on him: every ledge that faces the sky whitens."""
        deep = 1 + int(u * 2.2)
        tops = [(x, y) for (x, y) in cel.px if (x, y - 1) not in cel.px and y < GROUND - 3]
        for x, y in tops:
            if (_hash(x, 3) % 100) > u * 130:
                continue
            for d in range(deep - (1 if (_hash(x, 9) % 3 == 0) else 0)):
                if (x, y + d) in cel.px:
                    cel.px[(x, y + d)] = ("bone", 7) if d == 0 else ("azure", 7)

    @staticmethod
    def shock(cel: Cel, at: float, u: float, gold: float, spread: float = 1.0) -> None:
        """Where the hand lands (or where he comes down): the path cracks, a wall of snow stands up along it and
        falls back, lumps of it fly — and, under the hand, a flash and a ring of gold light running both ways."""
        ix = ROOT_X + at
        rise = math.sin(math.pi * min(1.0, u * 1.25)) ** 0.7  # up fast, hangs, comes down
        half = (20.0 + 26.0 * min(1.0, u * 1.6)) * spread
        for i in range(int(-half), int(half) + 1):  # the wall of snow
            t = abs(i) / half
            h = (1.0 - t) ** 0.5 * (12.0 + 30.0 * rise) * (0.6 + 0.4 * ((_hash(i, 3) % 9) / 8.0))
            if gold < 0.5:
                h *= 0.6
            x = ix + i
            for s_ in range(int(h)):
                if (_hash(i, s_) % 8) < (1 if s_ < h * 0.5 else 3) + int(u * 4):
                    continue  # it thins towards the top, and as it falls
                edge = s_ >= h - 2.0
                cel.soft(x, GROUND - 1 - s_, ("light", 0) if edge and u < 0.5 else ("bone", 7) if (i + s_) % 3 else ("azure", 7) if s_ > 2 else ("azure", 6))
        for i in range(int(half + 10 * spread)):  # the crack along the path
            for sgn in (-1, 1):
                if (i * 7 + (sgn > 0)) % 5:
                    cel.soft(ix + sgn * i, GROUND, ("ink", 0))
        if gold > 0.5:
            if u < 0.4:  # the flash under the hand
                for q in range(-16, 17):
                    cel.put(ix + q, GROUND - 1, ("light", 0) if abs(q) < 10 else ("brass", 7))
                    if abs(q) < 8:
                        cel.put(ix + q, GROUND - 2, ("brass", 7))
                cel.star(ix + 10, GROUND - 9, 7)
            r = 10.0 + 46.0 * u  # the ring of light, seen from the side: it runs out along the path both ways
            if u < 0.9:
                for sgn in (-1, 1):
                    for q in range(6):
                        x = ix + sgn * (r - q * 1.5)
                        tall = 5 - q if u < 0.6 else 3 - q // 2
                        for s_ in range(max(0, tall)):
                            cel.soft(x, GROUND - 1 - s_, ("light", 0) if q == 0 and s_ < 2 else ("brass", 7) if q < 3 else ("brass", 5))
        for i in range(20):  # lumps of snow and ice thrown up in a fan
            ang = math.radians(-172 + i * 8.6)
            dist = 8.0 + (26.0 + (i * 5 % 4) * 5.0) * u
            x = ix + math.cos(ang) * dist * 1.3 * spread
            y = GROUND - 2 + math.sin(ang) * dist + 16.0 * u * u
            if y >= GROUND - 1:
                continue
            big = i % 3 == 0 and u < 0.75
            tone = ("bone", 7) if i % 2 else ("azure", 7)
            if gold > 0.5 and i % 4 == 1:
                tone = ("brass", 6)
            for qx, qy in ((0, 0), (1, 0), (0, 1), (1, 1), (2, 0), (2, 1)) if big else ((0, 0), (1, 0), (0, 1)):
                cel.soft(x + qx, y + qy, ("azure", 5) if qy and tone[0] != "brass" else tone)

    @staticmethod
    def shed(cel: Cel, J: dict, u: float) -> None:
        """Leaf knocked off him."""
        cx, cy = J["B"](4.0, 50.0)
        for i in range(12):
            ang = math.radians(-215.0 + i * 20.0)
            dist = 14.0 + (18.0 + (i * 7 % 5) * 3.0) * u
            x = cx + math.cos(ang) * dist * 1.25 - 5.0 * u
            y = cy + math.sin(ang) * dist + 12.0 * u * u
            if y >= GROUND - 1:
                continue
            flip = 1 if (i + int(u * 6)) % 2 else -1
            cel.soft(x, y, ("brass", 6))
            cel.soft(x + flip, y + 1, ("brass", 4) if i % 2 else ("light", 0))

    @staticmethod
    def motes(cel: Cel, J: dict, u: float) -> None:
        """All his gold leaving him: it rises, like snow falling upwards."""
        sx, sy = J["seat"]
        for i in range(150):
            h1, h2, h3 = _hash(i, 17) % 1000 / 1000.0, _hash(i, 31) % 1000 / 1000.0, _hash(i, 53) % 1000 / 1000.0
            start = h1 * 0.6
            if u <= start:
                continue
            age = (u - start) / 0.4
            if age > 1.0:
                continue
            x = sx - 36.0 + 76.0 * h2 + 5.0 * math.sin(age * 5.0 + i) - 6.0 * age
            y = sy - 10.0 - 70.0 * h3 * (0.4 + 0.6 * h2) - (26.0 + 50.0 * h3) * age
            if y < -cel.top + 2 or y >= GROUND - 1:
                continue
            tone = ("brass", 7) if age < 0.35 else ("brass", 6) if age < 0.7 else ("brass", 4)
            cel.put(x, y, tone)
            if age < 0.5 and i % 3 == 0:
                cel.put(x + 1, y, ("light", 0) if age < 0.2 else tone)

    def breath(self, cel: Cel, J: dict, pose: Pose) -> None:
        """His breath in the cold: it should not be there."""
        u = pose["breath"]
        mx, my = self.on_face(J["neck"], pose["head_rot"], MOUTH)
        for i in range(10):
            h1, h2 = (_hash(i, 7) % 100) / 100.0, (_hash(i, 13) % 100) / 100.0
            age = (u * 2 + h1 * 0.45) % 1.0
            if age > 0.8:
                continue
            x = mx + 3.0 + 20.0 * age + 3.0 * h2
            y = my + 1.0 + 7.0 * age * age - 3.0 * age + (h2 - 0.5) * 7.0 * age
            tone = ("bone", 7) if age < 0.3 else ("ink", 8) if age < 0.55 else ("ink", 7)
            for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)) if age < 0.4 else ((0, 0), (1, 0)) if age < 0.6 else ((0, 0),):
                cel.soft(x + dx, y + dy, tone)


# --------------------------------------------------------------------------------------- animations
BASE: Pose = dict(dx=0.0, lift=FLOAT, lean=0.0, sway=0.0, swing=0.0, head_dx=0.0, head_dy=0.0, head_rot=0.0, jaw=2.0, eye=1.0, crest=0.0, gild=0.93,
                  handF=(37.0, 72.0), bendF=1.0, hand_rot=8.0, curl=0.0, arm_over=0.0,
                  handB=(-47.0, 27.0), hand_b_rot=0.0, curl_b=0.15,
                  halo=0.0, halo_spin=0.0, halo_break=0.0, halo_fall=0.0, flick=0.0,
                  breath=0.0, smear=0.0, shock=0.0, shock_x=60.0, shock_gold=1.0, thud=0.0, shed=0.0, motes=0.0, snow=0.0, flash=0.0)


def idle_pose(ph: float) -> Pose:
    s = math.sin(math.tau * ph)
    late = math.sin(math.tau * (ph - 0.2))
    chant = max(0.0, math.sin(math.tau * 2 * (ph - 0.05)))  # two breaths of the chant a cycle
    # The raised hand is never still: the fingers hook into a claw and open again, once a cycle.
    claw = _clamp(math.sin(math.pi * _clamp((ph - 0.55) / 0.4))) * 0.75
    tap = 0.5 if 0.12 < ph < 0.2 or 0.28 < ph < 0.36 else 0.15  # the nails of the other drum on the path
    return {**BASE, "lift": FLOAT + 1.5 * s, "lean": 0.9 * late, "sway": 1.6 * late, "swing": 1.4 * late, "halo_spin": 30.0 * ph, "flick": ph,
            "breath": ph, "jaw": 2.0 + 3.2 * chant, "eye": 1.0 + 0.45 * chant, "curl": claw, "hand_rot": 8.0 + 6.0 * claw,
            "handF": (37.0 + 1.5 * claw, 72.0 + 0.8 * s), "curl_b": tap, "head_dy": -1.0 if chant > 0.5 else 0.0}


def lurch_pose(ph: float) -> Pose:
    """He comes on in lurches, two a cycle: he drops forward with the hand clawing ahead, then is snatched up again."""
    q = (2 * ph) % 1.0
    fall = math.sin(math.pi * q) ** 2 if q < 0.5 else math.sin(math.pi * q) ** 0.6  # down fast, up slow
    side = math.sin(math.tau * ph)
    return {**BASE, "lift": FLOAT + 2.0 - 6.0 * fall, "lean": 5.0 + 6.0 * fall, "dx": 1.5 * fall, "sway": 4.0 + 2.0 * fall, "swing": -3.0 + 4.0 * fall,
            "halo_spin": 60.0 * ph, "flick": ph, "halo": 0.45, "jaw": 4.0 + 2.5 * fall, "eye": 1.3, "breath": ph, "crest": 0.4 * fall,
            "handF": (34.0 + 6.0 * fall, 76.0 - 10.0 * fall), "hand_rot": 30.0 + 40.0 * fall, "curl": 0.35 + 0.35 * (1.0 - fall), "arm_over": 1.0,
            "handB": (-49.0 - 2.0 * side, 27.0), "curl_b": 0.4, "head_dx": 1.0 + 1.5 * fall, "head_dy": -1.0 * fall}


def k(**over: object) -> Pose:
    return {**BASE, **over}


# The blessing. The ring takes fire, he tips back and the raised hand goes up over his head — and hangs; then he
# falls forward behind it and the palm comes down flat on whoever stands in front of him.
_UP = dict(lean=-9.0, lift=FLOAT + 3.0, dx=-3.0, handF=(25.0, 90.0), hand_rot=-30.0, curl=0.1, arm_over=1.0, halo=1.0, eye=1.5, jaw=7.0, crest=1.0, head_dx=-1.0,
           sway=-3.0, swing=-3.0)
_DOWN = dict(lean=13.0, lift=FLOAT - 6.0, dx=3.0, handF=(31.0, 7.0), bendF=-1.0, hand_rot=90.0, curl=0.0, arm_over=1.0, halo=1.0, eye=1.5, jaw=8.0, crest=0.0, head_dx=3.0,
             head_dy=-2.0, sway=5.0, swing=5.0)
BLESS_KEYS = [
    (0.00, k(), "lin"),
    (0.12, k(lean=4.0, lift=FLOAT - 2.0, handF=(32.0, 64.0), hand_rot=20.0, curl=0.5, halo=0.3, eye=1.3, jaw=4.0, sway=2.0), "io"),
    (0.30, k(**{**_UP, "handF": (30.0, 86.0), "hand_rot": -10.0, "lean": -7.0}), "out"),
    (0.42, k(**_UP), "out"),
    (0.50, k(**{**_UP, "lean": -10.0, "handF": (23.0, 91.0), "hand_rot": -34.0, "jaw": 8.0}), "io"),
    (0.55, k(**_DOWN, smear=1.0, shock=0.02), "in3"),
    (0.70, k(**{**_DOWN, "lean": 14.0, "lift": FLOAT - 7.0}, shock=0.98), "out"),
    (0.84, k(lean=6.0, lift=FLOAT - 2.0, dx=1.0, handF=(38.0, 40.0), hand_rot=50.0, curl=0.3, arm_over=1.0, halo=0.5, eye=1.3, jaw=4.0, sway=2.0, shock=1.0), "io"),
    (1.00, k(shock=1.0), "io"),
]

# Hit: the float tips, the head snaps back, the hand is thrown up, leaf flies off him.
HURT_KEYS = [
    (0.00, k(), "lin"),
    (0.07, k(dx=-1.0, lean=-4.0, lift=FLOAT - 1.0, head_dx=1.0, jaw=5.0, eye=1.5, swing=3.0, shed=0.04, flash=1.0), "out3"),
    (0.16, k(dx=-3.0, lean=-9.0, lift=FLOAT + 1.0, head_rot=-12.0, head_dx=-1.0, jaw=7.0, eye=1.5, handF=(24.0, 84.0), hand_rot=-14.0, curl=0.3, crest=1.0,
             swing=-4.0, sway=-4.0, shed=0.2, flash=0.5), "lin"),
    (0.26, k(dx=-5.0, lean=-12.0, lift=FLOAT + 2.5, head_rot=-18.0, head_dx=-2.0, jaw=8.0, eye=0.6, handF=(20.0, 88.0), hand_rot=-22.0, curl=0.4, crest=1.0,
             swing=-5.0, sway=-5.0, handB=(-50.0, 30.0), shed=0.4), "out"),
    (0.50, k(dx=-3.0, lean=4.0, lift=FLOAT - 3.0, head_rot=8.0, head_dx=1.0, jaw=5.0, eye=1.4, handF=(30.0, 66.0), hand_rot=16.0, curl=0.5, swing=4.0, sway=3.0, shed=0.7), "io"),
    (0.74, k(dx=-1.0, lean=2.0, lift=FLOAT - 1.0, jaw=3.0, eye=1.2, handF=(31.0, 70.0), curl=0.2, swing=1.0, shed=0.95), "io"),
    (1.00, k(shed=1.0), "io"),
]

# Death. The fire goes out; the ring breaks and falls; he comes down onto the path and sits on it; the gold leaves
# him; the hands come down into his lap, the head bows under its hat; snow settles on a dark, dried monk.
_SAT = dict(lift=-2.0, lean=2.0, halo_break=1.0, halo_fall=1.0, eye=0.0, thud=1.0, shed=1.0)
_REST = dict(handF=(2.0, 19.0), bendF=-1.0, hand_rot=112.0, curl=0.35, arm_over=1.0, crest=1.0, handB=(-22.0, 21.0), hand_b_rot=-78.0, curl_b=0.3, head_rot=0.0, head_dx=2.0, head_dy=-6.0, jaw=0.0)
DEATH_KEYS = [
    (0.00, k(), "lin"),
    (0.04, k(dx=-1.0, lean=-4.0, head_dx=1.0, jaw=5.0, eye=1.5, shed=0.05, flash=1.0), "out3"),
    (0.12, k(dx=-3.0, lean=-10.0, lift=FLOAT + 3.0, head_rot=-20.0, head_dx=-2.0, jaw=9.0, eye=1.5, halo=1.0, handF=(16.0, 92.0), hand_rot=-16.0, curl=0.6, arm_over=1.0,
             crest=1.0, swing=-5.0, sway=-4.0, shed=0.4), "out"),
    (0.22, k(dx=-3.0, lean=-10.0, lift=FLOAT + 3.5, head_rot=-22.0, head_dx=-2.0, jaw=9.0, eye=1.5, halo=1.0, handF=(15.0, 93.0), hand_rot=-18.0, curl=0.7, arm_over=1.0,
             crest=1.0, swing=-4.0, sway=-4.0, shed=0.95), "io"),
    (0.30, k(dx=-2.0, lean=-6.0, lift=FLOAT + 2.0, head_rot=-10.0, jaw=7.0, eye=0.5, halo=0.0, halo_break=0.12, handF=(20.0, 84.0), hand_rot=0.0, curl=0.5, arm_over=1.0,
             shed=1.0), "lin"),
    (0.46, k(dx=-1.0, lean=3.0, lift=FLOAT - 1.0, head_rot=6.0, jaw=5.0, eye=0.3, halo_break=0.75, halo_fall=0.3, handF=(27.0, 62.0), hand_rot=30.0, curl=0.4, arm_over=1.0,
             shed=1.0), "io"),
    (0.52, k(lean=5.0, lift=FLOAT, head_rot=8.0, head_dy=-1.0, jaw=4.0, eye=0.3, halo_break=1.0, halo_fall=0.6, handF=(28.0, 56.0), hand_rot=40.0, curl=0.4, arm_over=1.0,
             shed=1.0), "lin"),
    (0.58, k(**{**_SAT, "lean": 6.0, "thud": 0.02}, head_rot=10.0, head_dy=-2.0, jaw=6.0, handF=(30.0, 40.0), hand_rot=60.0, curl=0.4, arm_over=1.0, handB=(-44.0, 16.0)), "in3"),
    (0.66, k(**{**_SAT, "lean": 3.0, "thud": 0.5}, head_rot=5.0, head_dx=2.0, head_dy=-3.0, jaw=4.0, handF=(24.0, 30.0), hand_rot=80.0, curl=0.35, arm_over=1.0,
             handB=(-42.0, 14.0), gild=0.75, motes=0.1), "out"),
    (0.78, k(**_SAT, **_REST, gild=0.3, motes=0.5), "io"),
    (0.86, k(**_SAT, **_REST, gild=0.0, motes=0.8, snow=0.15), "in"),
    (0.93, k(**_SAT, **_REST, gild=0.0, motes=0.97, snow=0.6), "lin"),
    (1.00, k(**_SAT, **_REST, gild=0.0, motes=1.0, snow=1.0), "lin"),
]

_WIND = lambda t: (-0.75 - 0.3 * math.sin(math.tau * t), -0.06 + 0.1 * math.sin(math.tau * 2 * t))  # noqa: E731

ANIMS = {
    "idle": Anim("idle", idle_pose, [i / 16 for i in range(16)], [150] * 16, True, air=_WIND),
    "run": Anim("run", lurch_pose, [i / 12 for i in range(12)], [95] * 12, True, air=lambda t: (-2.4, -0.1)),
    "attack": Anim("attack", keyed(BLESS_KEYS), [0.0, 0.06, 0.12, 0.18, 0.24, 0.30, 0.36, 0.42, 0.50, 0.55, 0.59, 0.63, 0.67, 0.70, 0.77, 0.84, 0.92, 1.0],
                   # An enemy swings every 1250 ms and the game starts this clip its wind-up ahead of the swing: the whole
                   # of it (660 ms to the blow, 290 of impact, 290 back up) fits between two swings, so it is never cut.
                   [60, 60, 70, 60, 60, 70, 70, 80, 130, 40, 50, 60, 60, 80, 80, 70, 70, 70], False, air=_WIND),
    "hurt": Anim("hurt", keyed(HURT_KEYS), HURT_TIMES, HURT_MS, False, air=_WIND),
    "death": Anim("death", keyed(DEATH_KEYS), [0.0, 0.02, 0.04, 0.08, 0.12, 0.17, 0.22, 0.26, 0.30, 0.35, 0.40, 0.46, 0.52, 0.55, 0.58, 0.62, 0.66, 0.72,
                                                 0.78, 0.82, 0.86, 0.93, 1.0],
                  [70, 50, 80, 90, 120, 110, 110, 90, 90, 90, 90, 90, 80, 60, 50, 90, 110, 130, 130, 130, 160, 300, 1500], False, air=_WIND),
}
