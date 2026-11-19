"""Animated previews of abilities for the lab (GIFs), built from the game's own exports: the figure sheets, the
effects atlas and a world's backdrop — and, for a BEFORE beside the AFTER, the effects atlas of an older commit.

    sh tools/assets/run.sh ability-preview [<git rev for "before">]   # docs/redesign/lab/img/abil/*.gif

Each scene is a small timeline (ms) of clips and one-shots, replayed at 40 ms a frame on the 600×160 strip, ×2.
"""
from __future__ import annotations

import json
import random
import subprocess
import sys
from io import BytesIO
from pathlib import Path

from PIL import Image

from .strip_pieces import backdrop

ROOT = Path(__file__).resolve().parents[3]
FIGS = ROOT / "src" / "assets" / "strip" / "figs"
FX = ROOT / "src" / "assets" / "strip" / "fx"
OUT = ROOT / "docs" / "redesign" / "lab" / "img" / "abil"
LAB = ROOT / "docs" / "redesign" / "lab"
PATH_Y = 123
STEP = 40
FIG_META = json.loads((FIGS / "figs.json").read_text())["figs"]


class Atlas:
    """The effects atlas (fx.json + its pages), from the working tree or from a git revision."""

    def __init__(self, rev: str | None = None):
        def read(name: str) -> bytes:
            if rev is None:
                return (FX / name).read_bytes()
            return subprocess.run(["git", "show", f"{rev}:src/assets/strip/fx/{name}"], cwd=ROOT, check=True, capture_output=True).stdout

        self.meta = json.loads(read("fx.json"))["fx"]
        self.pages = {p: Image.open(BytesIO(read(f"fx_{p}.png"))).convert("RGBA") for p in {m["page"] for m in self.meta.values()}}

    def frame(self, key: str, ms: float, loop: bool = False) -> tuple[Image.Image, int, int] | None:
        m = self.meta.get(key)
        if m is None:
            return None
        total = sum(m["ms"])
        if ms < 0 or (not loop and ms >= total):
            return None
        t = ms % total
        i = 0
        for i, d in enumerate(m["ms"]):
            if t < d:
                break
            t -= d
        x = m["x"] + (i % m["cols"]) * m["w"]
        y = m["y"] + (i // m["cols"]) * m["h"]
        return self.pages[m["page"]].crop((x, y, x + m["w"], y + m["h"])), m["ax"], m["ay"]


_sheets: dict[str, Image.Image] = {}


def fig_frame(name: str, anim: str, ms: float, flip: bool = False, loop: bool = False) -> tuple[Image.Image, int, int]:
    m = FIG_META[name]
    a = m["anims"].get(anim) or m["anims"]["idle"]
    total = sum(a["ms"])
    t = ms % total if loop else min(ms, total - 1)
    i = 0
    for i, d in enumerate(a["ms"]):
        if t < d:
            break
        t -= d
    sheet = _sheets.setdefault(name, Image.open(FIGS / f"{name}.png").convert("RGBA"))
    cx, cy = (i % m["cols"]) * m["w"], (a["row"] + i // m["cols"]) * m["h"]
    f = sheet.crop((cx, cy, cx + m["w"], cy + m["h"]))
    root = m["root"]
    if flip:
        f = f.transpose(Image.FLIP_LEFT_RIGHT)
        root = m["w"] - 1 - root
    return f, root, m["ground"]


def clip_ms(name: str, anim: str) -> int:
    return sum(FIG_META[name]["anims"][anim]["ms"])


def paste(img: Image.Image, f: Image.Image, x: float, y: float) -> None:
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    layer.paste(f, (int(round(x)), int(round(y))), f)
    img.alpha_composite(layer)


def draw_fx(img: Image.Image, atlas: Atlas, key: str, ms: float, x: float, y: float, loop: bool = False) -> None:
    got = atlas.frame(key, ms, loop)
    if got is not None:
        f, ax, ay = got
        paste(img, f, x - ax, y - ay)


def draw_fig(img: Image.Image, name: str, x: float, anim: str = "idle", ms: float = 0, flip: bool = False, loop: bool = True, flash: bool = False) -> None:
    f, root, ground = fig_frame(name, anim, ms, flip, loop)
    if flash:
        white = Image.new("RGBA", f.size, (255, 250, 240, 255))
        white.putalpha(f.getchannel("A").point(lambda a: a * 3 // 4))
        f = f.copy()
        f.alpha_composite(white)
    paste(img, f, x - root, PATH_Y - ground)


PARTY = (("priest", 150), ("ranger", 200), ("knight", 252))
FOES = (("boar", 300), ("scarecrow", 334), ("poacher", 366), ("boar", 398), ("scarecrow", 430))


def rain_scene(atlas: Atlas, waves: int, every: int, spacing: int, reach: int, spread: int, delay: int, hit_after: int) -> list[Image.Image]:
    """Raining Arrows: the Ranger looses the volley, then `waves` waves of arrows come down over the enemy wave."""
    back, fore = backdrop(1)
    release = 640  # the volley clip's release (about where the game puts it)
    left, right = FOES[0][1] - 10 - reach, FOES[-1][1] + 10 + reach
    rnd = random.Random(4)
    drops: list[tuple[int, float]] = []
    hits: list[int] = []
    for w in range(waves):
        start = release + w * every + delay
        n = max(3, round((right - left) / spacing))
        for k in range(n):
            x = left + (right - left) * (k + 0.5) / n + (rnd.random() - 0.5) * (right - left) / n * 0.6
            drops.append((start + int(rnd.random() * spread), x))
        hits.append(release + w * every + hit_after)
    end = release + (waves - 1) * every + 1300
    frames = []
    for t in range(0, end, STEP):
        img = back.copy()
        for name, x in PARTY:
            if name == "ranger":
                draw_fig(img, name, x, "volley" if t < clip_ms("ranger", "volley") else "idle", t, loop=t >= clip_ms("ranger", "volley"))
            else:
                draw_fig(img, name, x, "idle", t + x * 7, loop=True)
        for name, x in FOES:
            flash = any(0 <= t - h < 90 for h in hits)
            draw_fig(img, name, x, "idle", t + x * 5, flip=True, loop=True, flash=flash)
        draw_fx(img, atlas, "volley_launch", t - release, 200, PATH_Y)
        for start, x in drops:
            draw_fx(img, atlas, "arrow_fall", t - start, x, PATH_Y)
        for h in hits:
            for _name, x in FOES:
                draw_fx(img, atlas, "arrow_hit", t - h, x, PATH_Y - 16)
        img.alpha_composite(fore)
        frames.append(img)
    return frames


def cry_scene(atlas: Atlas, aura: str) -> list[Image.Image]:
    """Battle Cry: the Knight shouts, the ring runs under the party and every hero wears the buff's look."""
    back, fore = backdrop(1)
    blow = 520
    end = 3600
    frames = []
    for t in range(0, end, STEP):
        img = back.copy()
        on = t >= blow + 120
        if on:
            for _name, x in PARTY:
                draw_fx(img, atlas, aura, t - blow, x, PATH_Y, loop=True)
        for name, x in PARTY:
            if name == "knight" and t < clip_ms("knight", "shout"):
                draw_fig(img, name, x, "shout", t, loop=False)
            else:
                draw_fig(img, name, x, "idle", t + x * 7, loop=True)
        for name, x in FOES[:3]:
            draw_fig(img, name, x, "idle", t + x * 5, flip=True, loop=True)
        draw_fx(img, atlas, "warcry_ring", t - blow, 252, PATH_Y)
        img.alpha_composite(fore)
        frames.append(img)
    return frames


def save_gif(frames: list[Image.Image], path: Path, crop: tuple[int, int, int, int] = (100, 20, 480, 160)) -> None:
    big = [f.crop(crop).resize(((crop[2] - crop[0]) * 2, (crop[3] - crop[1]) * 2), Image.NEAREST).convert("RGB") for f in frames]
    pal = big[0].quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    q = [b.quantize(palette=pal, dither=Image.Dither.NONE) for b in big]
    q[0].save(path, save_all=True, append_images=q[1:], duration=STEP, loop=0, optimize=True, disposal=1)


def main(argv: list[str]) -> None:
    before_rev = argv[0] if argv else "HEAD~1"
    OUT.mkdir(parents=True, exist_ok=True)
    now, before = Atlas(), Atlas(before_rev)
    save_gif(rain_scene(before, waves=1, every=0, spacing=9, reach=0, spread=260, delay=60, hit_after=180), OUT / "rain_before.gif")
    save_gif(rain_scene(now, waves=3, every=450, spacing=8, reach=18, spread=100, delay=40, hit_after=240), OUT / "rain_now.gif")
    save_gif(cry_scene(before, "battlecry_flames"), OUT / "cry_before.gif")
    save_gif(cry_scene(now, "battlecry_aura"), OUT / "cry_now.gif")
    for p in sorted(OUT.glob("*.gif")):
        print(p.name, f"{p.stat().st_size / 1e3:.0f} kB")


if __name__ == "__main__":
    main(sys.argv[1:])
