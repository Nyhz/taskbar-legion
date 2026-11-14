"""Character rig: a side-view skeleton driven by gait curves and keyed poses, with simulated cloth.

Why this exists: posing frames by hand and tweening them linearly reads as a robot. Here the motion comes
from the body itself —

- **Walks** are forward kinematics over the joint-angle curves of a human gait (hip, knee, ankle), and the
  pelvis height falls out of whichever foot bears the weight, so the bounce, the knee give and the heel-to-toe
  roll are consequences, not keyframes.
- **Actions** are keyed in joint angles (limbs swing in arcs, never in straight lines) with per-key easing,
  and legs use IK so planted feet stay planted while the body shifts its weight.
- **Cloth and danglers** (capes, plumes, scarves, robes, a lantern) are verlet chains: they lag, overshoot
  and settle on their own.

Heads, torsos and gear are hand-drawn sprites stamped on the joints; limbs are shaded strokes.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Callable, Optional, Sequence

from PIL import Image

from .palette import RAMPS, _hex

Tone = tuple[str, int]
Pt = tuple[float, float]
Pose = dict

#: Direction towards the light: upper right, the way heroes face.
LIGHT = (0.55, -0.83)
GROUND = 64.0


def tone_rgb(t: Tone) -> tuple[int, int, int]:
    r = RAMPS[t[0]]
    return _hex(r[max(0, min(len(r) - 1, t[1]))])


# ----------------------------------------------------------------------------------------- canvas
class Cel:
    """One frame: a sparse grid of palette tones."""

    def __init__(self, w: int, h: int):
        self.w, self.h = w, h
        self.px: dict[tuple[int, int], Tone] = {}

    def put(self, x: float, y: float, t: Tone) -> None:
        xi, yi = int(math.floor(x)), int(math.floor(y))
        if 0 <= xi < self.w and 0 <= yi < self.h:
            self.px[(xi, yi)] = t

    def stamp(self, rows: Sequence[str], legend: dict[str, Tone], x: float, y: float, shear: float = 0.0) -> None:
        """A hand-drawn sprite with its top-left at (x, y). `shear` slides each row sideways (px per row,
        measured up from the bottom row): how a drawn torso leans without being redrawn."""
        n = len(rows)
        x0, y0 = int(round(x)), int(round(y))
        for j, row in enumerate(rows):
            off = int(round(shear * (n - 1 - j)))
            for i, ch in enumerate(row):
                if ch not in ". ":
                    self.put(x0 + i + off, y0 + j, legend[ch])

    def stamp_rot(self, rows: Sequence[str], legend: dict[str, Tone], px: float, py: float, pc: float, pr: float, deg: float) -> None:
        """A hand-drawn sprite turned `deg` clockwise about its pivot (pc, pr in sprite pixels), which lands on
        (px, py). Each pixel takes the commonest of nine samples, so edges stay clean at odd angles."""
        a = math.radians(deg)
        ca, sa = math.cos(a), math.sin(a)
        h = len(rows)
        R = int(math.ceil(math.hypot(max(len(r) for r in rows) + abs(pc), h + abs(pr)))) + 2
        for j in range(int(py) - R, int(py) + R + 1):
            for i in range(int(px) - R, int(px) + R + 1):
                votes: dict[str, int] = {}
                for oy in (0.17, 0.5, 0.83):
                    for ox in (0.17, 0.5, 0.83):
                        dx, dy = i + ox - px, j + oy - py
                        c = int(math.floor(dx * ca + dy * sa + pc))
                        r = int(math.floor(-dx * sa + dy * ca + pr))
                        if 0 <= r < h and 0 <= c < len(rows[r]) and rows[r][c] not in ". ":
                            votes[rows[r][c]] = votes.get(rows[r][c], 0) + 1
                if sum(votes.values()) >= 5:
                    self.put(i, j, legend[max(votes, key=lambda ch: votes[ch])])

    def stamp_frame(self, rows: Sequence[str], legend: dict[str, Tone], origin: Pt, off: Pt, deg: float) -> None:
        """A sprite whose top-left sits at `off` from `origin` in a frame turned `deg`: gear that must stay on
        a body as it tips over. Small turns leave it upright."""
        if abs(deg) <= 24.0:
            self.stamp(rows, legend, origin[0] + off[0], origin[1] + off[1])
        else:
            self.stamp_rot(rows, legend, origin[0], origin[1], -off[0], -off[1], deg)

    def stamp_lean(self, rows: Sequence[str], legend: dict[str, Tone], pivot: Pt, pc: float, lean: float) -> None:
        """A sprite standing on `pivot` (its bottom row, column pc), leaning `lean` degrees: sheared while the
        lean is small (keeps the drawn pixels intact), truly rotated beyond that."""
        if abs(lean) <= 24.0:
            self.stamp(rows, legend, pivot[0] - pc, pivot[1] - len(rows), shear=math.tan(math.radians(lean)))
        else:
            self.stamp_rot(rows, legend, pivot[0], pivot[1], pc + 0.5, float(len(rows)), lean)

    def stamp_turn(self, rows: Sequence[str], legend: dict[str, Tone], pivot: Pt, pc: float, deg: float) -> None:
        """Like stamp_lean, but any turn of 6° or more is a true rotation (a bowed or lolling head)."""
        if abs(deg) < 6.0:
            self.stamp(rows, legend, pivot[0] - pc, pivot[1] - len(rows))
        else:
            self.stamp_rot(rows, legend, pivot[0], pivot[1], pc + 0.5, float(len(rows)), deg)

    def limb(self, a: Pt, b: Pt, w0: float, w1: float, ramp: str, idx: tuple[int, int, int], far: bool = False) -> None:
        """A tapered stroke from a to b, shaded dark / mid / light across its width with the lit side
        facing LIGHT. `far` darkens it one step (the limb on the far side of the body)."""
        d, m, l = (max(0, i - 1) for i in idx) if far else idx
        ax, ay = a
        bx, by = b
        dx, dy = bx - ax, by - ay
        L2 = dx * dx + dy * dy or 1e-9
        L = math.sqrt(L2)
        nx, ny = -dy / L, dx / L
        lit = 1.0 if (nx * LIGHT[0] + ny * LIGHT[1]) > 0 else -1.0
        r_max = max(w0, w1) / 2 + 1
        for j in range(int(math.floor(min(ay, by) - r_max)), int(math.ceil(max(ay, by) + r_max)) + 1):
            for i in range(int(math.floor(min(ax, bx) - r_max)), int(math.ceil(max(ax, bx) + r_max)) + 1):
                cx, cy = i + 0.5, j + 0.5
                t = max(0.0, min(1.0, ((cx - ax) * dx + (cy - ay) * dy) / L2))
                r = (w0 + (w1 - w0) * t) / 2
                if math.hypot(cx - (ax + t * dx), cy - (ay + t * dy)) < r:
                    s = ((cx - ax) * nx + (cy - ay) * ny) / r * lit
                    self.put(i, j, (ramp, l if s > 0.42 else d if s < -0.38 else m))

    def line(self, a: Pt, b: Pt, t: Tone) -> None:
        ax, ay, bx, by = (int(math.floor(v)) for v in (*a, *b))
        dx, dy = abs(bx - ax), -abs(by - ay)
        sx, sy = (1 if ax < bx else -1), (1 if ay < by else -1)
        err = dx + dy
        while True:
            self.put(ax, ay, t)
            if ax == bx and ay == by:
                return
            e2 = 2 * err
            if e2 >= dy:
                err += dy
                ax += sx
            if e2 <= dx:
                err += dx
                ay += sy

    def soft(self, x: float, y: float, t: Tone) -> None:
        """Paints only where nothing is drawn yet: light effects sit behind the figure."""
        k = (int(math.floor(x)), int(math.floor(y)))
        if k not in self.px:
            self.put(x, y, t)

    def star(self, x: float, y: float, r: int) -> None:
        """A four-point glint."""
        self.put(x, y, ("light", 0))
        for i in range(1, r + 1):
            t = ("light", 0) if i <= r // 2 + 1 else ("brass", 6)
            for dx, dy in ((i, 0), (-i, 0), (0, i), (0, -i)):
                self.soft(x + dx, y + dy, t)
        for d in (1, 2)[: max(1, r // 3)]:
            for dx, dy in ((d, d), (-d, d), (d, -d), (-d, -d)):
                self.soft(x + dx, y + dy, ("brass", 6))

    def arc(self, cx: float, cy: float, r: float, a0: float, a1: float, t: Tone) -> None:
        steps = max(4, int(abs(a1 - a0) / 180 * math.pi * r * 1.6))
        for i in range(steps + 1):
            a = math.radians(a0 + (a1 - a0) * i / steps)
            self.soft(cx + math.cos(a) * r, cy + math.sin(a) * r, t)

    def poly_mask(self, pts: Sequence[Pt]) -> list[tuple[int, int]]:
        """Pixels whose centre lies inside the polygon (even-odd scanline)."""
        out = []
        ys = [p[1] for p in pts]
        for j in range(int(math.floor(min(ys))), int(math.ceil(max(ys))) + 1):
            cy = j + 0.5
            xs = []
            for (x0, y0), (x1, y1) in zip(pts, list(pts[1:]) + [pts[0]]):
                if (y0 > cy) != (y1 > cy):
                    xs.append(x0 + (cy - y0) * (x1 - x0) / (y1 - y0))
            xs.sort()
            for k in range(0, len(xs) - 1, 2):
                for i in range(int(math.ceil(xs[k] - 0.5)), int(math.floor(xs[k + 1] - 0.5)) + 1):
                    out.append((i, j))
        return out

    def outline(self, skip: Optional[set[tuple[int, int]]] = None) -> None:
        """A one-pixel outline in the darkest tone of the ramp each edge pixel borders."""
        add: dict[tuple[int, int], Tone] = {}
        for (x, y), (ramp, _) in self.px.items():
            if skip and (x, y) in skip:
                continue
            for n in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if n not in self.px and 0 <= n[0] < self.w and 0 <= n[1] < self.h:
                    dark = (ramp if ramp != "light" else "ink", 0)
                    if n not in add or sum(tone_rgb(dark)) < sum(tone_rgb(add[n])):
                        add[n] = dark
        self.px.update(add)

    def image(self) -> Image.Image:
        img = Image.new("RGBA", (self.w, self.h), (0, 0, 0, 0))
        p = img.load()
        for (x, y), t in self.px.items():
            p[x, y] = (*tone_rgb(t), 255)
        return img


# ----------------------------------------------------------------------------------------- curves
def cyc(points: Sequence[tuple[float, float]], ph: float) -> float:
    """A smooth periodic curve through (phase, value) points — a cubic Hermite spline that wraps."""
    pts = sorted(points)
    ext = [(pts[-1][0] - 1, pts[-1][1])] + pts + [(pts[0][0] + 1, pts[0][1]), (pts[1][0] + 1, pts[1][1])]
    ph = ph % 1.0
    if ph < pts[0][0]:
        ph += 1.0
    for i in range(1, len(ext) - 2):
        (x0, y0), (x1, y1), (x2, y2), (x3, y3) = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
        if x1 <= ph <= x2:
            h = x2 - x1
            t = (ph - x1) / h
            m1 = (y2 - y0) / (x2 - x0)
            m2 = (y3 - y1) / (x3 - x1)
            return (2 * t**3 - 3 * t**2 + 1) * y1 + (t**3 - 2 * t**2 + t) * h * m1 + (-2 * t**3 + 3 * t**2) * y2 + (t**3 - t**2) * h * m2
    return pts[0][1]


EASE: dict[str, Callable[[float], float]] = {
    "lin": lambda t: t,
    "io": lambda t: t * t * (3 - 2 * t),
    "in": lambda t: t * t,
    "in3": lambda t: t**3,
    "out": lambda t: 1 - (1 - t) ** 2,
    "out3": lambda t: 1 - (1 - t) ** 3,
}


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def lerp_pose(p: Pose, q: Pose, t: float) -> Pose:
    out: Pose = {}
    for k, b in q.items():
        a = p.get(k, b)
        out[k] = tuple(lerp(x, y, t) for x, y in zip(a, b)) if isinstance(b, tuple) else lerp(a, b, t)
    return out


def keyed(keys: Sequence[tuple[float, Pose, str]]) -> Callable[[float], Pose]:
    """Poses keyed in time; each key carries the easing used to arrive at it."""

    def at(t: float) -> Pose:
        if t <= keys[0][0]:
            return dict(keys[0][1])
        for (t0, p0, _), (t1, p1, e) in zip(keys, keys[1:]):
            if t <= t1:
                return lerp_pose(p0, p1, EASE[e]((t - t0) / (t1 - t0)))
        return dict(keys[-1][1])

    return at


# ----------------------------------------------------------------------------------------- skeleton
@dataclass(frozen=True)
class Build:
    """A character's skeleton: segment lengths and where the joints sit. Every class has its own."""

    root_x: float
    thigh: float
    shin: float
    foot: float  # ankle to toe
    hip_dx: float  # half the gap between the near and the far hip (the body is turned 3/4)
    spine: float  # pelvis to shoulder line
    sh_near: float  # near shoulder, behind the spine
    sh_far: float  # far shoulder, ahead of it
    upper: float
    fore: float
    neck: float
    head_dx: float = 1.0
    heel: float = 1.6
    toe: float = 1.1
    #: Poses were keyed on a longer-legged skeleton. This scales everything a pose says about the legs' reach
    #: (body shift `dx`, pelvis `drop`, foot x and lift) so stances, lunges, kneels and falls keep their shape.
    leg_scale: float = 1.0
    #: Lowest the pelvis may sink (lying down): half the thickness of the body.
    min_pelvis: float = 4.2


def _rad(d: float) -> float:
    return math.radians(d)


def ik(a: Pt, b: Pt, l1: float, l2: float, bend: int) -> tuple[Pt, Pt]:
    """Two-bone IK from a towards b. Returns (joint, end); `bend` −1 puts a knee forward."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    d = max(abs(l1 - l2) + 1e-3, min(l1 + l2 - 1e-3, math.hypot(dx, dy)))
    base = math.atan2(dy, dx)
    ang = base + bend * math.acos(max(-1.0, min(1.0, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))))
    j = (a[0] + l1 * math.cos(ang), a[1] + l1 * math.sin(ang))
    ea = math.atan2(b[1] - j[1], b[0] - j[0])
    return j, (j[0] + l2 * math.cos(ea), j[1] + l2 * math.sin(ea))


def solve(b: Build, p: Pose) -> dict[str, Pt]:
    """Joint positions for a pose. Angles are degrees from straight down, positive = forward.

    Legs: FK when the pose has `hipN` (walks: the pelvis rides on the weight-bearing foot), otherwise IK to
    `footN`/`footF` = (x, lift, pitch) with the pelvis lowered by `drop`. Foot x is measured from the root
    AFTER `dx`: to keep a foot planted while the body shifts, move its x against `dx`.
    """
    J: dict[str, Pt] = {}
    r = b.leg_scale
    rx = b.root_x + p.get("dx", 0.0) * r
    hr = p.get("hip_rot", 0.0)
    hipx = {"N": rx - b.hip_dx - hr, "F": rx + b.hip_dx + hr}
    if "hipN" in p:
        rel = {}
        low = 0.0
        for s in "NF":
            h, k, f = _rad(p["hip" + s]), _rad(p["knee" + s]), _rad(p["foot" + s])
            kx, ky = b.thigh * math.sin(h), b.thigh * math.cos(h)
            ax, ay = kx + b.shin * math.sin(h - k), ky + b.shin * math.cos(h - k)
            tx, ty = ax + b.foot * math.cos(f), ay - b.foot * math.sin(f)
            rel[s] = (kx, ky, ax, ay, tx, ty)
            low = max(low, ay + b.heel, ty + b.toe)
        py = GROUND - low + p.get("dy", 0.0)
        for s in "NF":
            kx, ky, ax, ay, tx, ty = rel[s]
            J["hip" + s] = (hipx[s], py)
            J["knee" + s] = (hipx[s] + kx, py + ky)
            J["ankle" + s] = (hipx[s] + ax, py + ay)
            J["toe" + s] = (hipx[s] + tx, py + ty)
    else:
        py = min(GROUND - (b.thigh + b.shin + b.heel) + p.get("drop", 0.0) * r, GROUND - b.min_pelvis)
        for s in "NF":
            fx, lift, pitch = p["foot" + s]
            target = (rx + fx * r, GROUND - b.heel - lift * r)
            knee, ankle = ik((hipx[s], py), target, b.thigh, b.shin, -1)
            f = _rad(pitch)
            J["hip" + s] = (hipx[s], py)
            J["knee" + s] = knee
            J["ankle" + s] = ankle
            J["toe" + s] = (ankle[0] + b.foot * math.cos(f), ankle[1] - b.foot * math.sin(f))
    J["pelvis"] = (rx, py)
    lean = _rad(p.get("lean", 0.0))
    cl, sl = math.cos(lean), math.sin(lean)
    sp = b.spine + p.get("breath", 0.0)
    cx, cy = rx + sp * sl, py - sp * cl
    J["chest"] = (cx, cy)

    def turned(x: float, y: float) -> Pt:
        # Offsets from the chest turn with the torso, so a body lying down keeps its head and shoulders on it.
        return (cx + x * cl - y * sl, cy + x * sl + y * cl)

    sr = p.get("sh_rot", 0.0)
    J["shN"] = turned(-b.sh_near - sr, 0.0)
    J["shF"] = turned(b.sh_far + sr, 0.4)
    for s in "NF":
        a, e = _rad(p.get("arm" + s, 0.0)), _rad(p.get("elb" + s, 0.0))
        sx, sy = J["sh" + s]
        ex, ey = sx + b.upper * math.sin(a), sy + b.upper * math.cos(a)
        J["elbow" + s] = (ex, ey)
        J["hand" + s] = (ex + b.fore * math.sin(a + e), ey + b.fore * math.cos(a + e))
    # A hand can be pinned to a point in the world (`reachN` = x from root, height; weight `reachN_w`): the
    # arm then solves by IK, so a body can sag while the hand stays on a planted sword or a staff.
    for s in "NF":
        w = p.get("reach" + s + "_w", 0.0)
        if w > 0.001:
            tx, ty = p["reach" + s]
            hx, hy = J["hand" + s]
            goal = (lerp(hx, b.root_x + tx, w), lerp(hy, GROUND - ty, w))
            J["elbow" + s], J["hand" + s] = ik(J["sh" + s], goal, b.upper, b.fore, +1)
    J["head"] = turned(b.head_dx + p.get("head_dx", 0.0), -b.neck + p.get("head_dy", 0.0))
    J["lean"] = (p.get("lean", 0.0), 0.0)
    return J


# ----------------------------------------------------------------------------------------- gait
# Joint curves of one stride for one leg (phase 0 = heel strike), from gait analysis, lightly pushed for
# readability at 30-odd pixels. The other leg runs half a cycle later.
HIP = [(0.0, 27), (0.12, 21), (0.3, 4), (0.5, -15), (0.6, -11), (0.75, 17), (0.88, 31), (0.96, 29)]
KNEE = [(0.0, 5), (0.12, 19), (0.3, 9), (0.44, 8), (0.6, 42), (0.72, 64), (0.88, 24), (0.96, 8)]
FOOT = [(0.0, 20), (0.09, 0), (0.25, 0), (0.42, -4), (0.52, -28), (0.62, -58), (0.76, -24), (0.9, 6)]


# The same for a jog (phase 0 = foot strike). Stance is short (to 0.38), then both feet are off the ground
# until the other foot lands at 0.5; the trailing heel kicks up towards the seat as the leg recovers.
RUN_HIP = [(0.0, 30), (0.16, 22), (0.38, -20), (0.46, -22), (0.62, 2), (0.8, 36), (0.92, 36)]
RUN_KNEE = [(0.0, 20), (0.16, 46), (0.38, 16), (0.5, 60), (0.64, 98), (0.8, 62), (0.92, 28)]
RUN_FOOT = [(0.0, 4), (0.1, 0), (0.28, -14), (0.4, -48), (0.6, -44), (0.82, -6), (0.94, 6)]
RUN_STANCE = 0.38


@dataclass(frozen=True)
class Gait:
    stride: float = 1.0  # scales the hip swing
    give: float = 1.0  # scales the knee bend when the weight lands
    lift: float = 1.0  # scales how high the swinging knee comes
    toe: float = 1.0  # scales the heel-to-toe roll
    run: bool = False  # jog curves with a flight phase instead of a walk
    air: float = 0.0  # how high the body rises during the flight phase, px


def gait_legs(g: Gait, ph: float) -> Pose:
    hip_c, knee_c, foot_c, stance_end = (RUN_HIP, RUN_KNEE, RUN_FOOT, RUN_STANCE) if g.run else (HIP, KNEE, FOOT, 0.5)
    out: Pose = {}
    for s, off in (("N", 0.0), ("F", 0.5)):
        q = (ph + off) % 1.0
        stance = q < stance_end
        out["hip" + s] = cyc(hip_c, q) * g.stride
        out["knee" + s] = cyc(knee_c, q) * (g.give if stance else g.lift)
        out["foot" + s] = cyc(foot_c, q) * g.toe
    out["dy"] = 0.0
    if g.run:
        q = ph % 0.5
        if q > RUN_STANCE:
            out["dy"] = -g.air * math.sin(math.pi * (q - RUN_STANCE) / (0.5 - RUN_STANCE))
    return out


# ----------------------------------------------------------------------------------------- cloth
class Chain:
    """A verlet rope: point 0 is pinned to an anchor, the rest hang, drag through the air and follow."""

    def __init__(self, n: int, seg: float, gravity: float = 0.12, drag: float = 0.1, damp: float = 0.06,
                 shape: Optional[Sequence[Pt]] = None, stiff: float = 0.0):
        self.n, self.seg, self.gravity, self.drag, self.damp = n, seg, gravity, drag, damp
        #: Rest offsets from the anchor and how hard each point is pulled back to them: a stiff plume or a
        #: beard keeps its shape and only wobbles.
        self.shape, self.stiff = shape, stiff
        self.p: list[Pt] = [(0.0, 0.0)] * n
        self.q: list[Pt] = [(0.0, 0.0)] * n

    def reset(self, anchor: Pt, direction: Pt = (0.0, 1.0)) -> None:
        self.p = [(anchor[0] + direction[0] * self.seg * i, anchor[1] + direction[1] * self.seg * i) for i in range(self.n)]
        self.q = list(self.p)

    def step(self, anchor: Pt, air: Pt = (0.0, 0.0), collide: Optional[Callable[[list[Pt]], None]] = None) -> None:
        for i in range(1, self.n):
            x, y = self.p[i]
            vx, vy = (x - self.q[i][0]) * (1 - self.damp), (y - self.q[i][1]) * (1 - self.damp)
            vx += (air[0] - vx) * self.drag
            vy += (air[1] - vy) * self.drag + self.gravity
            self.q[i] = (x, y)
            nx_, ny_ = x + vx, y + vy
            if self.shape is not None:
                nx_ += (anchor[0] + self.shape[i][0] - nx_) * self.stiff
                ny_ += (anchor[1] + self.shape[i][1] - ny_) * self.stiff
            self.p[i] = (nx_, ny_)
        self.p[0] = anchor
        for _ in range(3):
            for i in range(1, self.n):
                ax, ay = self.p[i - 1]
                dx, dy = self.p[i][0] - ax, self.p[i][1] - ay
                d = math.hypot(dx, dy) or 1e-6
                self.p[i] = (ax + dx / d * self.seg, ay + dy / d * self.seg)
            if collide is not None:
                collide(self.p)


@dataclass
class ChainSpec:
    chain: Chain
    anchor: Callable[[dict[str, Pt]], Pt]
    collide: Optional[Callable[[list[Pt], dict[str, Pt]], None]] = None
    rest: Pt = (0.0, 1.0)


# ----------------------------------------------------------------------------------------- baking
@dataclass
class Anim:
    name: str
    pose_at: Callable[[float], Pose]
    times: list[float]
    ms: list[int]
    loop: bool
    air: Callable[[float], Pt] = lambda t: (0.0, 0.0)  # air velocity relative to the body, px per sub-step


class Character:
    build: Build
    W = 96
    H = 70

    def chains(self) -> dict[str, ChainSpec]:
        return {}

    def joints(self, pose: Pose) -> dict[str, Pt]:
        """Joint positions for a pose; a class may add its own (the tip of a staff…)."""
        return solve(self.build, pose)

    def draw(self, cel: Cel, J: dict[str, Pt], pose: Pose, ropes: dict[str, list[Pt]], between: list[tuple[dict[str, Pt], Pose]]) -> None:
        raise NotImplementedError


def bake(char: Character, anim: Anim, sub: int = 4, warm: int = 3) -> list[Image.Image]:
    """Solves every frame, simulates the cloth through them and renders. Loops run a few warm-up cycles so the
    cloth is periodic; one-shots let it settle on the first pose first."""
    n = len(anim.times)
    poses = [anim.pose_at(t) for t in anim.times]
    Js = [char.joints(p) for p in poses]
    specs = char.chains()
    for sp in specs.values():
        sp.chain.reset(sp.anchor(Js[0]), sp.rest)
    rec: dict[str, list[list[Pt]]] = {k: [[] for _ in range(n)] for k in specs}

    def run(i: int, record: bool) -> None:
        nxt = (i + 1) % n if anim.loop else min(i + 1, n - 1)
        if record:
            for k, sp in specs.items():
                rec[k][i] = list(sp.chain.p)
        for s in range(sub):
            f = s / sub
            t = lerp(anim.times[i], anim.times[nxt] if nxt > i else anim.times[i] + (anim.times[i] - anim.times[i - 1] if i else 0), f)
            for sp in specs.values():
                a0, a1 = sp.anchor(Js[i]), sp.anchor(Js[nxt])
                col = (lambda pts, sp=sp, J=Js[i]: sp.collide(pts, J)) if sp.collide else None
                sp.chain.step((lerp(a0[0], a1[0], f), lerp(a0[1], a1[1], f)), anim.air(t), col)

    if anim.loop:
        for c in range(warm + 1):
            for i in range(n):
                run(i, c == warm)
    else:
        for _ in range(60):
            for sp in specs.values():
                col = (lambda pts, sp=sp: sp.collide(pts, Js[0])) if sp.collide else None
                sp.chain.step(sp.anchor(Js[0]), anim.air(anim.times[0]), col)
        for i in range(n):
            run(i, True)

    frames = []
    for i in range(n):
        between: list[tuple[dict[str, Pt], Pose]] = []
        if i > 0 or anim.loop:
            t0 = anim.times[i - 1] if i > 0 else anim.times[-1] - 1.0
            for u in range(0, 13):
                pp = anim.pose_at(lerp(t0, anim.times[i], u / 12))
                between.append((char.joints(pp), pp))
        cel = Cel(char.W, char.H)
        char.draw(cel, Js[i], poses[i], {k: rec[k][i] for k in specs}, between)
        frames.append(cel.image())
    return frames
