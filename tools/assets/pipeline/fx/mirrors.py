"""The Unmaker's six mirrors and its dark reflection (Espejos, beyond the reflected ability — data/bossKit.ts
MECHANIC.mirror; render/bossFx.ts PANES, DOUBLES, AREA_BLOWS.boss_shatter).

  pane_flash          one of the six panes of its figure lights: a hard star on the glass
  pane_break          a lit pane bursts: its glass flies outward
  warn_glass / _hot   the ground under the party while it winds the breaking up: splinters lying in the dust,
                      catching the light — then standing on end, trembling
  shatter_rain        the breaking itself, spot after spot through the party: a blade of mirror comes down out of
                      the air, stands in the ground and bursts
  reflection_out      the mirror it raised goes dark, something looks back out of it, and it bursts open
  reflection_break    the dark double of a hero breaks like the glass it is

`lit_panes` bakes what is NOT an effect: the six panes of the Unmaker's own figure, lit, frame by frame of its
clips — only the pixels of each pane the figure really shows (the body, the wrappings and the debris in front of
a pane stay in front of it), so the game can lay a lit pane exactly over the dark one, following its animation.

Everything is drawn going right; the game mirrors it for a foe."""
from __future__ import annotations

import math
import random

from PIL import Image

from pipeline.fx import Fx, blob, ease_out, rim, ring, spark, streak, thin
from pipeline.fx.boss import GLASS, _SHARDS, _pane, _shard, _zig
from pipeline.palette import color
from pipeline.rig import GROUND, Cel, bake
from pipeline.roster import load

LIGHT = ("light", 0)
#: The double's own glass: what a hero looks like from the other side of the mirror.
SHADE = {"w": ("violet", 7), "L": ("violet", 5), "a": ("violet", 3), "b": ("violet", 2), "k": ("violet", 0)}


def _dark_shard(cel: Cel, x: float, y: float, which: int, deg: float) -> None:
    rows = _SHARDS[which % 3]
    cel.stamp_rot(rows, SHADE, x, y, len(rows[0]) / 2, len(rows) / 2, deg)


# ------------------------------------------------------------------------------------------------- the panes
def pane_flash(cel: Cel, i: int, t: float) -> None:
    """A pane lights: a hard four-point star on the glass, a ring going out, two glints left behind."""
    cx, cy = 16, 16
    arm = (5, 11, 13, 8, 4)[i]
    for k in range(arm):
        tone = LIGHT if k < arm * 0.6 else ("azure", 8) if k < arm * 0.85 else ("azure", 6)
        for dx, dy in ((k, 0), (-k, 0), (0, k), (0, -k)):
            cel.put(cx + dx, cy + dy, tone)
    for k in range(max(0, arm // 2 - 1)):
        for dx, dy in ((k, k), (-k, k), (k, -k), (-k, -k)):
            cel.put(cx + dx, cy + dy, ("azure", 8) if k < 2 else ("azure", 6))
    if i < 2:
        blob(cel, cx, cy, 2.5 - i * 0.5, 2.5 - i * 0.5, LIGHT)
    if 1 <= i <= 3:
        r = 4 + i * 3.5
        ring(cel, cx, cy, r, r, ("azure", 8) if i < 3 else ("azure", 6), thick=1.0)
        thin(cel, 1.0 - 0.22 * (i - 1), 81) if i > 1 else None
    if i >= 3:
        spark(cel, cx + 7, cy - 6, 1, LIGHT, ("azure", 8))
        spark(cel, cx - 6, cy + 7, 1, LIGHT, ("azure", 7))
    rim(cel, ("azure", 0))


def pane_break(cel: Cel, i: int, t: float) -> None:
    """A lit pane bursts: a white crack of light, then its glass going outward in pieces and falling."""
    cx, cy = 24, 22
    grow = ease_out(t, 1.7)
    if i == 0:
        blob(cel, cx, cy, 6, 9, LIGHT)
        _zig(cel, (cx - 7, cy - 10), (cx + 6, cy + 10), 88, 2.0, tones=[LIGHT, ("azure", 8), ("azure", 6)], thick=False)
    if i == 1:
        ring(cel, cx, cy, 9, 9, LIGHT, thick=1.5)
    rnd = random.Random(86)
    for k in range(11):
        a = math.tau * k / 11 + rnd.random() * 0.4
        sp = (5 + rnd.random() * 16) * grow
        _shard(cel, cx + math.cos(a) * sp, cy + math.sin(a) * sp * 0.9 + t * t * 9, k, a * 57 + t * 420 * (1 if k % 2 else -1))
    for k in range(6):
        a = math.tau * (k + 0.5) / 6
        sp = (9 + k * 2) * grow
        cel.put(cx + math.cos(a) * sp, cy + math.sin(a) * sp + t * t * 7, LIGHT if (k + i) % 2 else ("azure", 7))
    if i >= 4:
        thin(cel, 1.0 - 0.35 * (i - 3), 87)
    rim(cel, ("azure", 0))


# ------------------------------------------------------------------------------------------------- the breaking
_SPLINTERS = [(-9, 0, 2), (-5, 1, 4), (-1, 0, 3), (3, 1, 5), (7, 0, 2), (10, 1, 3)]


def _splinter(cel: Cel, x: float, base: float, h: int, lean: int, lit: bool) -> None:
    for s in range(h):
        w = 2 if s < h * 0.45 and h > 3 else 1
        for q in range(w):
            tip = s == h - 1
            tone = LIGHT if tip and lit else ("azure", 8) if tip or (q == w - 1 and s % 2 == 0) else ("azure", 6) if q == w - 1 else ("azure", 4)
            cel.put(x + q + int(round(lean * s / max(1, h))), base - s, tone)


def warn_glass(cel: Cel, i: int, t: float) -> None:
    """While it winds the breaking up: splinters of mirror lying along the path, each catching the light in turn."""
    base = 8
    for k, (dx, row, _h) in enumerate(_SPLINTERS):
        x = 12 + dx
        y = base + row
        lit = (k * 2 + i) % 6 == 0
        cel.put(x, y, LIGHT if lit else ("azure", 6))
        cel.put(x + 1, y, ("azure", 8) if lit else ("azure", 4))
        if k % 2 == 0:
            cel.put(x - 1, y, ("azure", 4))
        if lit:
            cel.put(x, y - 1, ("azure", 8))
            cel.put(x, y - 2, ("azure", 6))
    rim(cel, ("azure", 0))


def warn_glass_hot(cel: Cel, i: int, t: float) -> None:
    """…and over its last moments: they stand on end, trembling, their points white."""
    base = 13
    for k, (dx, row, h) in enumerate(_SPLINTERS):
        shake = ((k * 3 + i) % 3) - 1
        tall = h + 2 + ((k + i) % 2)
        _splinter(cel, 12 + dx, base + row - 1, tall, shake, (k + i) % 2 == 0)
        if (k + i) % 3 == 0:
            cel.put(12 + dx + shake, base + row - tall - 2, LIGHT)
    rim(cel, ("azure", 0))


_BLADE = [
    "..wL..",
    "..wLa.",
    ".wLLa.",
    ".wLLab",
    ".wLLab",
    "wLLLab",
    "wLLaab",
    "wLLaab",
    ".LLaab",
    ".LLabk",
    ".wLabk",
    "..Labk",
    "..Lab.",
    "..wab.",
    "...ak.",
    "...a..",
]


def shatter_rain(cel: Cel, i: int, t: float) -> None:
    """A blade of mirror comes down out of the air, stands in the ground and bursts."""
    cx, base = 20, 66
    fall = (0.0, 0.45, 1.0)[min(i, 2)]
    if i <= 2:
        top = lerp_(4, base - len(_BLADE) + 3, fall)
        cel.stamp(_BLADE, GLASS, cx - 3, top)
        # the light it drags down behind it
        for k in range(3 + i * 4):
            y = top - 2 - k * 2
            if y > 0:
                cel.put(cx, y, LIGHT if k < 2 else ("azure", 8) if k < 5 else ("azure", 6))
                if k % 2 == 0 and k > 1:
                    cel.put(cx - 1 + (k % 4), y, ("azure", 6))
    if i == 2:
        spark(cel, cx, base - 1, 6, LIGHT, ("azure", 8))
        for dx in range(-9, 10):
            cel.put(cx + dx, base + (abs(dx) % 2), LIGHT if abs(dx) < 4 else ("azure", 7))
    if i >= 3:
        u = (i - 2) / 5
        grow = ease_out(u, 1.6)
        rnd = random.Random(91)
        for k in range(10):
            a = -math.pi * (0.12 + 0.76 * k / 9) + (rnd.random() - 0.5) * 0.3
            sp = (8 + rnd.random() * 20) * grow
            _shard(cel, cx + math.cos(a) * sp, base - 4 + math.sin(a) * sp + u * u * 26, k, a * 57 + u * 500 * (1 if k % 2 else -1))
        # what is left standing in the ground
        for k, (dx, row, h) in enumerate(_SPLINTERS):
            _splinter(cel, cx + dx, base + row - 1, max(1, h + 3 - (i - 3)), (k % 3) - 1, i == 3)
        if i == 3:
            ring(cel, cx, base - 2, 13, 5, LIGHT, thick=1.2)
        if i >= 5:
            thin(cel, 1.0 - 0.3 * (i - 4), 93)
    rim(cel, ("azure", 0))


def lerp_(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


# ------------------------------------------------------------------------------------------------- the reflection
def _figure_shadow(cel: Cel, cx: float, base: float, h: float, lit: bool) -> None:
    """Somebody, seen dark: a head, shoulders, a body narrowing to the feet."""
    for s in range(int(h)):
        f = s / h  # 0 at the feet
        half = 2.0 + 3.2 * math.sin(min(1.0, f * 1.15) * math.pi * 0.62) if f < 0.72 else 2.6 if f < 0.8 else 3.0 * math.sin((1.0 - f) / 0.2 * math.pi * 0.5 + 0.35)
        for d in range(int(-half), int(half) + 1):
            edge = abs(d) >= half - 1
            cel.put(cx + d, base - s, ("violet", 6) if edge and lit else ("violet", 4) if edge else ("violet", 0) if (s + d) % 5 else ("violet", 1))
    if lit:
        cel.put(cx - 1, base - h * 0.86, LIGHT)
        cel.put(cx + 1, base - h * 0.86, LIGHT)


def reflection_out(cel: Cel, i: int, t: float) -> None:
    """The mirror it raised goes dark; somebody looks back out of it; it bursts open towards the party."""
    cx, cy = 34, 40
    if i <= 2:
        _pane(cel, cx, cy, 10 + i, 26 + i, i, 1.0)
        # the glass goes dark from the middle
        for y in range(cy - 24, cy + 25):
            for x in range(cx - 9, cx + 10):
                d = ((x - cx) / (4.0 + i * 3.0)) ** 2 + ((y - cy) / (12.0 + i * 7.0)) ** 2
                if d < 1.0 and (x, y) in cel.px:
                    cel.put(x, y, ("violet", 1) if d < 0.6 or (x + y) % 2 else ("violet", 3))
        if i >= 1:
            _figure_shadow(cel, cx, cy + 17, 30, i == 2)
    if i == 2:
        _zig(cel, (cx - 8, cy - 20), (cx + 3, cy + 2), 96, 2.0, tones=[LIGHT, ("azure", 8), ("azure", 6)], thick=False)
        _zig(cel, (cx + 3, cy + 2), (cx - 4, cy + 22), 97, 2.0, tones=[LIGHT, ("azure", 8), ("azure", 6)], thick=False)
    if i >= 3:
        u = (i - 2) / 5
        grow = ease_out(u, 1.6)
        if i == 3:
            blob(cel, cx, cy, 8, 22, ("violet", 1))
            ring(cel, cx, cy, 13, 27, LIGHT, thick=1.4)
        rnd = random.Random(95)
        for k in range(20):
            a = math.tau * k / 20 + rnd.random() * 0.3
            sp = (8 + rnd.random() * 30) * grow
            x, y = cx + math.cos(a) * sp + grow * 5, cy + math.sin(a) * sp * 1.05 + u * u * 12
            (_dark_shard if k % 3 == 0 else _shard)(cel, x, y, k, a * 57 + u * 420 * (1 if k % 2 else -1))
        # the dark that was in it pours forward and down, after the one who stepped out
        for k in range(7):
            f = min(1.0, u * 1.3 + k * 0.03)
            x, y = cx + 3 + f * (10 + k * 2), cy - 14 + k * 5 + f * f * 18
            streak(cel, (x - 5, y - 5), (x, y), [("violet", 5), ("violet", 3), ("violet", 1)])
        if i >= 5:
            thin(cel, 1.0 - 0.3 * (i - 4), 99)
    rim(cel, ("violet", 0) if i >= 1 else ("azure", 0))


def reflection_break(cel: Cel, i: int, t: float) -> None:
    """The double breaks like the glass it is: cracks of light across it, then pieces — dark and bright — outward
    and down, and a few left standing where it stood."""
    cx, base = 28, 56
    grow = ease_out(t, 1.6)
    if i == 0:
        _figure_shadow(cel, cx, base - 1, 36, True)
        _zig(cel, (cx - 5, base - 36), (cx + 3, base - 18), 101, 2.2, tones=[LIGHT, ("azure", 8), ("azure", 6)], thick=False)
        _zig(cel, (cx + 3, base - 18), (cx - 4, base - 2), 102, 2.2, tones=[LIGHT, ("azure", 8), ("azure", 6)], thick=False)
        _zig(cel, (cx - 6, base - 22), (cx + 6, base - 12), 103, 1.5, tones=[LIGHT, ("azure", 8), ("azure", 6)], thick=False)
    if i == 1:
        blob(cel, cx, base - 18, 6, 17, LIGHT)
        ring(cel, cx, base - 18, 11, 20, ("azure", 8), thick=1.3)
    rnd = random.Random(104)
    if i >= 1:
        for k in range(18):
            a = math.tau * k / 18 + rnd.random() * 0.35
            sp = (5 + rnd.random() * 20) * grow
            x, y = cx + math.cos(a) * sp, base - 18 + math.sin(a) * sp * 1.25 + t * t * 20
            if y < base + 2:
                (_dark_shard if k % 2 else _shard)(cel, x, y, k, a * 57 + t * 460 * (1 if k % 2 else -1))
        for k in range(8):
            a = math.tau * (k + 0.5) / 8
            sp = (10 + k * 2) * grow
            cel.put(cx + math.cos(a) * sp, base - 18 + math.sin(a) * sp + t * t * 12, LIGHT if (k + i) % 2 else ("violet", 7))
    if i >= 3:
        for k, (dx, row, h) in enumerate(_SPLINTERS):
            _splinter(cel, cx + dx, base + row - 1, max(1, h + 1 - (i - 3)), (k % 3) - 1, False)
    if i >= 5:
        thin(cel, 1.0 - 0.3 * (i - 4), 105)
    rim(cel, ("violet", 0))


FX = [
    Fx("pane_flash", 32, 32, 16, 16, [40, 50, 60, 75, 95], False, pane_flash),
    Fx("pane_break", 48, 48, 24, 22, [40, 50, 60, 70, 85, 100], False, pane_break),
    Fx("warn_glass", 24, 12, 12, 8, [90] * 6, True, warn_glass),
    Fx("warn_glass_hot", 24, 16, 12, 12, [70] * 6, True, warn_glass_hot),
    Fx("shatter_rain", 40, 72, 20, 66, [45, 45, 55, 60, 70, 85, 100, 110], False, shatter_rain),
    Fx("reflection_out", 76, 84, 34, 40, [70, 90, 90, 60, 70, 80, 90, 100], False, reflection_out),
    Fx("reflection_break", 56, 62, 28, 56, [60, 55, 60, 70, 80, 95, 110], False, reflection_break),
]


# ------------------------------------------------------------------------------- the panes of its figure, lit
#: The ramps the six panes are keyed in while the figure is baked to find what of each pane shows (none of them is
#: used by the figure itself).
_KEYS = ("moss", "sea", "crimson", "brass", "leather", "skin")
_HALO = color("azure", 6)


def _lit_tone(u: float, v: float, edge: bool, x: int, y: int) -> tuple[int, int, int]:
    """A lit pane: where the dark one is a window on the night, this one is full of light — a white slant across
    it, bright edges, the cold blue of its glass only towards the tips."""
    h = (x * 73856093 ^ y * 19349663) % 19
    band = u + v * 0.07
    if edge:
        return color(*LIGHT) if v > 0 else color("azure", 8)
    if 0.28 < band < 0.40 or h == 0:
        return color(*LIGHT)
    if 0.62 < band < 0.68:
        return color("bone", 7)
    if band < 0.12 or band > 0.86:
        return color("azure", 5)
    return color("azure", 7) if v > 0 else color("azure", 6)


def lit_panes(figure: str, clips: dict[str, int]) -> tuple[Image.Image, dict]:
    """The lit panes of `figure` for the clips of `clips` (clip → the frames the exported figure has of it): an
    atlas of equal cells — for frame f of a clip, pane j is cell `first + f·6 + j` — and its meta: the cell size,
    `cols`, and per clip `first` and, per frame and pane, [dx, dy, cx, cy]: where the cell's top-left goes and
    where the pane's middle is, in art pixels from the figure's root on the ground (facing right), or null when
    nothing of that pane shows."""
    mod, char = load(figure)
    seen: list[dict[tuple[int, int], tuple[int, bool]]] = []

    def draw_pane(self, cel: Cel, pose, J, j: int) -> None:  # noqa: ANN001
        pts, *_rest, raw = self.pane(pose, J, j)
        if raw >= 0.999:
            return
        for (x, y) in cel.poly_mask(pts):
            cel.put(x, y, (_KEYS[j], 5))

    def draw(self, cel: Cel, J, pose, ropes, between) -> None:  # noqa: ANN001
        type(char).draw(self, cel, J, pose, ropes, between)
        seen.append({xy: (_KEYS.index(t[0]), t[1] == 0) for xy, t in cel.px.items() if t[0] in _KEYS})

    keyed = type("Keyed", (type(char),), {"draw_pane": draw_pane, "draw": draw})()
    root = int(char.build.root_x)
    cells: list[Image.Image | None] = []
    meta: dict = {"anims": {}}
    boxes: list[tuple[int, int, int, int] | None] = []
    for clip, n in clips.items():
        anim = mod.ANIMS.get(clip)
        if anim is None or len(anim.times) != n:
            print(f"  {figure}.{clip}: not as figs.json has it — left out of the lit panes until export-figs runs")
            continue
        seen.clear()
        bake(keyed, anim)
        poses = [anim.pose_at(t) for t in anim.times]
        frames = []
        for f in range(n):
            J = char.joints(poses[f])
            row = []
            for j in range(6):
                glass = [xy for xy, (k, line) in seen[f].items() if k == j and not line]
                halo = [xy for xy, (k, line) in seen[f].items() if k == j and line]
                if len(glass) < 6:
                    row.append(None)
                    cells.append(None)
                    boxes.append(None)
                    continue
                _pts, inner, d, nrm, length, _raw = char.pane(poses[f], J, j)
                inside = set(glass)
                x0, y0 = min(x for x, _ in glass + halo), min(y for _, y in glass + halo)
                x1, y1 = max(x for x, _ in glass + halo) + 1, max(y for _, y in glass + halo) + 1
                img = Image.new("RGBA", (x1 - x0, y1 - y0), (0, 0, 0, 0))
                px = img.load()
                for (x, y) in halo:
                    px[x - x0, y - y0] = (*_HALO, 255)
                for (x, y) in glass:
                    rx, ry = x + 0.5 - inner[0], y + 0.5 - inner[1]
                    u, v = (rx * d[0] + ry * d[1]) / length, (rx * nrm[0] + ry * nrm[1]) / 5.6
                    edge = any(q not in inside for q in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
                    px[x - x0, y - y0] = (*_lit_tone(u, v, edge, x, y), 255)
                mx, my = sum(x for x, _ in glass) / len(glass), sum(y for _, y in glass) / len(glass)
                row.append([x0 - root, y0 - int(GROUND), int(round(mx - root)), int(round(my - GROUND))])
                cells.append(img)
                boxes.append((x0, y0, x1, y1))
            frames.append(row)
        meta["anims"][clip] = {"first": len(cells) - n * 6, "frames": frames}
    w = max(b[2] - b[0] for b in boxes if b)
    h = max(b[3] - b[1] for b in boxes if b)
    cols = max(1, min(len(cells), 2048 // w))
    atlas = Image.new("RGBA", (w * cols, h * -(-len(cells) // cols)), (0, 0, 0, 0))
    for k, img in enumerate(cells):
        if img is not None:
            atlas.alpha_composite(img, ((k % cols) * w, (k // cols) * h))
    meta.update({"w": w, "h": h, "cols": cols})
    return atlas, meta
