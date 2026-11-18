"""Lab previews (2026-11-18): six ways to show, on a hero's life bar, what a heal over time still has to give —
each animated over four pulses (the life rising, the stretch shrinking), with the azure shield under it to compare.
Run: .venv/bin/python -m pipeline.hotbar_preview → docs/redesign/lab/img/hotbar/. Dev tooling."""
from __future__ import annotations

from pathlib import Path

from PIL import Image

from .palette import color

OUT = Path(__file__).resolve().parents[3] / "docs" / "redesign" / "lab" / "img" / "hotbar"
W, IW = 27, 25
SCALE = 10
STEP = 50
LIFE = [color("moss", 7), color("moss", 6), color("moss", 4)]
SHIELD = [color("azure", 8), color("azure", 6), color("azure", 4)]
EDGE, WELL = color("ink", 0), color("ink", 2)


def casing(img: Image.Image, y0: int) -> None:
    for x in range(W):
        for y in range(5):
            if x in (0, W - 1) and y in (0, 4):
                continue
            img.putpixel((x, y0 + y), (*(EDGE if x in (0, W - 1) or y in (0, 4) else WELL), 255))


def col(img: Image.Image, x: int, y0: int, tones) -> None:
    for y in range(3):
        img.putpixel((1 + x, y0 + 1 + y), (*tones[y], 255))


def frame(style: str, t: int) -> Image.Image:
    img = Image.new("RGBA", (W + 6, 20), (*color("dusk", 3), 255))
    landed = sum(1 for p in range(4) if t >= 500 + p * 1000)
    life = round(IW * (0.40 + 0.08 * landed))
    coming = round(IW * (0.32 - 0.08 * landed))
    y0 = 4
    casing(img, y0)
    for x in range(life):
        col(img, x, y0, LIFE)
    since = min((t - (500 + p * 1000)) for p in range(4) if t >= 500 + p * 1000) if landed else 9999
    for k in range(coming):
        x = life + k
        if style == "stripes":
            if k % 2 == 1:
                col(img, x, y0, LIFE)
        elif style == "dim":
            col(img, x, y0, [color("moss", 4), color("moss", 3), color("moss", 2)])
        elif style == "beat":
            bright = (t // 250) % 2 == 0
            col(img, x, y0, LIFE if bright else [color("moss", 4), color("moss", 3), color("moss", 2)])
        elif style == "sweep":
            pos = (t // 60) % (coming + 4)
            col(img, x, y0, [color("light", 0), color("moss", 8), color("moss", 6)] if abs(k - pos) < 1 else [color("moss", 4), color("moss", 3), color("moss", 2)])
        elif style == "outline":
            img.putpixel((1 + x, y0 + 1), (*color("moss", 7), 255))
            img.putpixel((1 + x, y0 + 3), (*color("moss", 5), 255))
            if k == coming - 1:
                img.putpixel((1 + x, y0 + 2), (*color("moss", 6), 255))
        elif style == "pips":
            pass
    if style == "pips":  # one small + over the bar per pulse still to come
        left = 4 - landed
        for p in range(left):
            cx = 1 + life + 1 + p * 4
            cy = y0 - 3
            for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
                img.putpixel((cx + dx + 1, cy + dy), (*color("moss", 8 if (dx, dy) == (0, 0) else 6), 255))
    # the pulse that just landed: the new stretch of life flashes for a moment
    if since < 150 and landed:
        for x in range(life - round(IW * 0.08), life):
            col(img, x, y0, [color("light", 0), color("moss", 8), color("moss", 7)])
    # the shield beneath, to compare
    y1 = 12
    casing(img, y1)
    for x in range(round(IW * 0.45)):
        col(img, x, y1, LIFE)
    for x in range(IW - 7, IW):
        col(img, x, y1, SHIELD)
    return img


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for style in ("stripes", "dim", "beat", "sweep", "outline", "pips"):
        frames = [frame(style, t).resize(((W + 6) * SCALE, 20 * SCALE), Image.Resampling.NEAREST).convert("RGB") for t in range(0, 4200, STEP)]
        frames[0].save(OUT / f"hot_{style}.gif", save_all=True, append_images=frames[1:], duration=STEP, loop=0)
    print(f"wrote {OUT}")


if __name__ == "__main__":
    main()
