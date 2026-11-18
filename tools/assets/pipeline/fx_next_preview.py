"""Lab previews of the 2026-11-18 drafts (fx/priest_next.py): GIFs of each draft on the figure it plays on.
Run: .venv/bin/python -m pipeline.fx_next_preview — writes out/lab_next/. Dev tooling, not part of any export."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

from .fx.priest_next import DRAFTS
from .palette import color
from .rig import GROUND, bake
from .roster import load

OUT = Path(__file__).resolve().parents[1] / "out" / "lab_next"
FX = {f.key: f for f in DRAFTS}
STEP = 50  # ms per GIF frame
ROOT_X = 40
SCALE = 4
BG = color("dusk", 3)


def fx_frames(key: str) -> tuple[list[Image.Image], list[int], bool]:
    fx = FX[key]
    return [c.image() for c in fx.frames()], fx.ms, fx.loop


def at(frames: list[Image.Image], ms: list[int], loop: bool, t: int) -> Image.Image | None:
    total = sum(ms)
    if t < 0 or (not loop and t >= total):
        return None
    t %= total
    for f, m in zip(frames, ms):
        if t < m:
            return f
        t -= m
    return frames[-1]


def clip(name: str, anim: str) -> tuple[list[Image.Image], list[int], bool]:
    mod, char = load(name)
    a = mod.ANIMS[anim]
    return bake(char, a), list(a.ms), a.loop


def place(canvas: Image.Image, fx_img: Image.Image, key: str) -> None:
    fx = FX[key]
    canvas.alpha_composite(fx_img, (ROOT_X - fx.ax, int(GROUND) - fx.ay))


def bar(canvas: Image.Image, life: float, coming: float) -> None:
    """The hero's life bar (27×5 casing) with the mint stretch of what the heal over time still has to give."""
    x0, y0, w = ROOT_X - 13, 6, 25
    edge, well = color("ink", 0), color("ink", 2)
    for x in range(27):
        for y in range(5):
            if x in (0, 26) and y in (0, 4):
                continue
            canvas.putpixel((x0 + x, y0 + y), (*(edge if x in (0, 26) or y in (0, 4) else well), 255))
    lit = int(round(w * life))
    more = int(round(w * min(coming, 1 - life)))
    life_col = [color("moss", 7), color("moss", 6), color("moss", 4)]
    mint = [color("sea", 8), color("sea", 6), color("sea", 5)]
    for x in range(w):
        col = life_col if x < lit else mint if x < lit + more else None
        if col is None:
            continue
        for y in range(3):
            canvas.putpixel((x0 + 1 + x, y0 + 1 + y), (*col[y], 255))


def gif(name: str, frames: list[Image.Image]) -> None:
    out = []
    for f in frames:
        crop = f.crop((ROOT_X - 32, 0, ROOT_X + 40, 70))
        b = Image.new("RGBA", crop.size, (*BG, 255))
        b.alpha_composite(crop)
        out.append(b.resize((crop.width * SCALE, crop.height * SCALE), Image.Resampling.NEAREST).convert("RGB"))
    out[0].save(OUT / f"{name}.gif", save_all=True, append_images=out[1:], duration=STEP, loop=0, disposal=2)


def hot_on_knight(name: str, lasting: str | None, under: bool = False, seconds: int = 4) -> None:
    """A heal over time on the Knight: its lasting look, a pulse every second, and the bar's mint stretch shrinking
    as the pulses land."""
    body, body_ms, _ = clip("knight", "idle")
    pulse, pulse_ms, _ = fx_frames("hot_pulse")
    look = fx_frames(lasting) if lasting else None
    frames = []
    for t in range(0, seconds * 1000, STEP):
        c = Image.new("RGBA", body[0].size, (0, 0, 0, 0))
        landed = sum(1 for p in range(seconds) if t >= 500 + p * 1000)
        if look is not None and under:
            img = at(*look, t)
            if img is not None:
                place(c, img, lasting)
        fig = at(body, body_ms, True, t)
        if fig is not None:
            c.alpha_composite(fig)
        if look is not None and not under:
            img = at(*look, t)
            if img is not None:
                place(c, img, lasting)
        for p in range(seconds):
            img = at(pulse, pulse_ms, False, t - (500 + p * 1000))
            if img is not None:
                place(c, img, "hot_pulse")
        bar(c, 0.36 + 0.08 * landed, 0.32 - 0.08 * landed)
        frames.append(c)
    gif(name, frames)


def priest_cast(name: str, anim: str, sigil: str | None) -> None:
    body, body_ms, _ = clip("priest", anim)
    sig = fx_frames(sigil) if sigil else None
    total = sum(body_ms) + 500
    frames = []
    for t in range(0, total, STEP):
        c = Image.new("RGBA", body[0].size, (0, 0, 0, 0))
        if sig is not None:
            img = at(*sig, t)
            if img is not None:
                place(c, img, sigil)
        fig = at(body, body_ms, False, min(t, sum(body_ms) - 1))
        if fig is not None:
            c.alpha_composite(fig)
        frames.append(c)
    gif(name, frames)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    hot_on_knight("hot_mend", "mend_wrap")
    hot_on_knight("hot_light", "light_motes")
    hot_on_knight("hot_sanctuary", "sanctuary_glow2", under=True)
    priest_cast("cast_attack", "attack", None)
    priest_cast("cast_mend", "mend", "sigil_heal")
    priest_cast("cast_ward", "ward", "sigil_ward")
    priest_cast("cast_smite", "smite", "sigil_wrath")
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
