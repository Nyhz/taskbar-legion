"""Lab preview of the Holy Nova redraw (fx/nova_next.py DRAFTS) beside the Nova the game plays now.

    sh tools/assets/run.sh nova-preview      # docs/redesign/lab/img/nova/*.gif

Built from the game's own exports (figure sheets, backdrops, the current effects atlas for the BEFORE) and the
drafts drawn straight from their Fx objects. Dev tooling, not part of any export.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

from .ability_preview import PATH_Y, STEP, Atlas, clip_ms, draw_fig, draw_fx, fig_frame, paste
from .fx.nova_next import DRAFTS
from .strip_pieces import backdrop

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT.parent / "docs" / "redesign" / "lab" / "img" / "nova"
DRAFT = {f.key: f for f in DRAFTS}
_baked: dict[tuple[str, bool], list[Image.Image]] = {}

PARTY = (("priest", 150), ("ranger", 200), ("knight", 252))
BIG_WAVE = [(("boar", "scarecrow", "poacher")[k % 3], 282 + k * 12, 3 if k % 2 else 0) for k in range(15)]
SMALL_WAVE = [("boar", 284, 0), ("scarecrow", 298, 3), ("poacher", 312, 0)]
BLOW = 700  # the staff strikes the ground in the priest's `nova` clip (its first seven frames)


def draft(key: str, ms: float, x: float, y: float, img: Image.Image, flip: bool = False) -> None:
    fx = DRAFT[key]
    frames = _baked.get((key, flip))
    if frames is None:
        frames = [c.image() for c in fx.frames()]
        if flip:
            frames = [f.transpose(Image.FLIP_LEFT_RIGHT) for f in frames]
        _baked[(key, flip)] = frames
    total = sum(fx.ms)
    if ms < 0 or (not fx.loop and ms >= total):
        return
    t = ms % total
    i = 0
    for i, d in enumerate(fx.ms):
        if t < d:
            break
        t -= d
    ax = fx.w - 1 - fx.ax if flip else fx.ax
    paste(img, frames[i], x - ax, y - fx.ay)


def figures(img: Image.Image, t: int, wave, flashes: dict[int, int]) -> None:
    for name, x in PARTY:
        if name == "priest":
            nova = clip_ms("priest", "nova")
            draw_fig(img, name, x, "nova" if t < nova else "idle", t, loop=t >= nova)
        else:
            draw_fig(img, name, x, "idle", t + x * 7, loop=True)
    for k, (name, x, lift) in enumerate(wave):
        hit = flashes.get(k)
        flash = hit is not None and 0 <= t - hit < 220
        f_y = PATH_Y - lift
        draw_fig_at(img, name, x, f_y, t + x * 5, flash)


def draw_fig_at(img: Image.Image, name: str, x: float, y: float, ms: float, flash: bool) -> None:
    """An enemy, its hit shown as the game shows it (EnemySprite.flashHit: a pale red tint for 220 ms)."""
    f, root, ground = fig_frame(name, "idle", ms, True, True)
    if flash:
        r, g, b, a = f.split()
        f = Image.merge("RGBA", (r, g.point(lambda v: v * 208 // 255), b.point(lambda v: v * 208 // 255), a))
    paste(img, f, x - root, y - ground)


def band(wave) -> tuple[float, float]:
    left, right = wave[0][1] - 10, wave[-1][1] + 10
    return (left + right) / 2, (right - left) / 2


def before_scene(atlas: Atlas, wave, world: int = 1, grade: str = "normal") -> list[Image.Image]:
    """What the game plays now: the staff's flash, a ring under the wave, a shaft every 15 px near to far, a
    starburst on every enemy."""
    back, fore = backdrop(world, grade)
    cx, half = band(wave)
    n = max(3, round(half * 2 / 15))
    shafts = [(BLOW + 40 + int(220 * k / max(1, n - 1)), cx - half + (k + 0.5) * half * 2 / n) for k in range(n)]
    hit = BLOW + 150
    flashes = {k: hit for k in range(len(wave))}
    frames = []
    for t in range(0, 2400, STEP):
        img = back.copy()
        draw_fx(img, atlas, "nova_ring", t - BLOW, cx, PATH_Y + 2)
        figures(img, t, wave, flashes)
        draw_fx(img, atlas, "nova_flash", t - BLOW, 150 + 8, PATH_Y)
        for start, x in shafts:
            draw_fx(img, atlas, "nova_shaft", t - start, x, PATH_Y)
        for _name, x, lift in wave:
            draw_fx(img, atlas, "nova_hit", t - hit, x, PATH_Y - lift - 16)
        img.alpha_composite(fore)
        frames.append(img)
    return frames


def after_scene(atlas: Atlas, wave, world: int = 1, grade: str = "normal") -> list[Image.Image]:
    """The redraw: a star kindles high over the wave while she lifts her staff, drops as she drives it down, bursts
    on the ground, and the nova runs out along the ground to each end of the wave; each enemy lights up once as it
    passes under it."""
    back, fore = backdrop(world, grade)
    cx, half = band(wave)
    sky = PATH_Y - 108
    kindle, fall = 120, BLOW - 160  # the fall's four flying frames (160 ms) land it on the blow
    ground = BLOW + 15
    ring_r = 46  # how far the ground ring opens before the crests run on
    crest_at = ground + 120
    crest_ms = sum(DRAFT["nova_crest"].ms)
    reach = max(0.0, half + 6 - ring_r)  # how far each crest still has to run
    flashes: dict[int, int] = {}
    for k, (_n, x, _l) in enumerate(wave):
        d = abs(x - cx)
        flashes[k] = ground + int(d / ring_r * 110) if d <= ring_r or reach <= 0 else crest_at + int((d - ring_r) / reach * crest_ms * 0.85)
    frames = []
    for t in range(0, 2400, STEP):
        img = back.copy()
        draft("nova_ground", t - ground, cx, PATH_Y + 1, img)
        if reach > 0:
            u = min(1.0, max(0.0, (t - crest_at) / (crest_ms * 0.85)))
            for side in (1, -1):
                draft("nova_crest", t - crest_at, cx + side * (ring_r + reach * u), PATH_Y + 1, img, flip=side < 0)
        figures(img, t, wave, flashes)
        draw_fx(img, atlas, "nova_flash", t - BLOW, 150 + 8, PATH_Y)
        for k, (_n, x, lift) in enumerate(wave):
            draft("nova_touch", t - flashes[k], x, PATH_Y - lift, img)
        draft("nova_kindle", t - kindle, cx, sky, img)
        if kindle + sum(DRAFT["nova_kindle"].ms) <= t < fall:
            draft("nova_star", t - kindle, cx, sky, img)
        draft("nova_fall", t - fall, cx, PATH_Y, img)
        draft("nova_impact", t - BLOW, cx, PATH_Y, img)
        img.alpha_composite(fore)
        frames.append(img)
    return frames


def save_gif(frames: list[Image.Image], path: Path, crop=(120, 0, 480, 160), slow: int = 1) -> None:
    big = [f.crop(crop).resize(((crop[2] - crop[0]) * 2, (crop[3] - crop[1]) * 2), Image.NEAREST).convert("RGB") for f in frames]
    pal = big[0].quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    q = [b.quantize(palette=pal, dither=Image.Dither.NONE) for b in big]
    q[0].save(path, save_all=True, append_images=q[1:], duration=STEP * slow, loop=0, optimize=True, disposal=1)


def sheet(path: Path) -> None:
    """Every draft's frames side by side, ×3, on a mid dusk tone: the drawing itself, frame by frame."""
    from .palette import color

    rows = []
    for fx in DRAFTS:
        cels = [c.image() for c in fx.frames()]
        row = Image.new("RGBA", (sum(c.width + 4 for c in cels), fx.h), (*color("dusk", 3), 255))
        x = 0
        for c in cels:
            row.alpha_composite(c, (x, 0))
            x += c.width + 4
        rows.append(row)
    w = max(r.width for r in rows)
    out = Image.new("RGBA", (w, sum(r.height + 6 for r in rows)), (*color("dusk", 3), 255))
    y = 0
    for r in rows:
        out.alpha_composite(r, (0, y))
        y += r.height + 6
    out.resize((out.width * 3, out.height * 3), Image.NEAREST).convert("RGB").save(path)


def main(argv: list[str]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    now = Atlas()
    save_gif(before_scene(now, BIG_WAVE), OUT / "nova_before.gif")
    save_gif(after_scene(now, BIG_WAVE), OUT / "nova_after.gif")
    save_gif(after_scene(now, BIG_WAVE), OUT / "nova_after_slow.gif", slow=3)
    save_gif(after_scene(now, SMALL_WAVE), OUT / "nova_after_small.gif")
    save_gif(after_scene(now, BIG_WAVE, 5, "torment"), OUT / "nova_after_torment.gif")
    sheet(OUT / "nova_frames.png")
    for p in sorted(OUT.iterdir()):
        print(p.name, f"{p.stat().st_size / 1e3:.0f} kB")
