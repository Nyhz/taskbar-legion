"""Previews of the rigged characters: a GIF and a frame strip per animation."""
from __future__ import annotations

import importlib
from pathlib import Path

from PIL import Image

from .palette import color
from .rig import bake
from .roster import ROSTER, load

OUT = Path(__file__).resolve().parents[1] / "out" / "chars"
BG = color("dusk", 3)


def world_bg(world: str) -> tuple[int, int, int]:
    """Creatures are shown on a tone of their own world (its backdrop's PREVIEW_BG), so they are judged against
    what they will stand on."""
    if not world:
        return BG
    try:
        return getattr(importlib.import_module(f".families.backdrop_{world}", __package__), "PREVIEW_BG", BG)
    except Exception:  # noqa: BLE001 — a missing or unfinished backdrop must not stop a character preview
        return BG
#: The 72-px window of the 96-px frame each GIF shows (the hero's root sits at x = 40).
CROP = (12, 2, 84, 70)
CROPS = {("ranger", "death"): (4, 2, 76, 70), ("priest", "death"): (24, 2, 96, 70)}


def on_bg(f: Image.Image, scale: int, bg: tuple[int, int, int] = BG) -> Image.Image:
    b = Image.new("RGBA", f.size, (*bg, 255))
    b.alpha_composite(f)
    return b.resize((f.width * scale, f.height * scale), Image.Resampling.NEAREST)


def main(names: list[str]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name in names or list(ROSTER):
        mod, char = load(name)
        bg = world_bg(ROSTER[name][3])
        for stale in OUT.glob(f"{name}_*"):
            stale.unlink()
        for key, anim in mod.ANIMS.items():
            frames = bake(char, anim)
            for i, f in enumerate(frames):
                f.save(OUT / f"{name}_{key}_{i:02d}.png")
            # Figures with their own frame size (bosses) are shown whole.
            crop = CROPS.get((name, key), CROP) if (char.W, char.TOP) == (96, 0) else (0, 0, frames[0].width, frames[0].height)
            gif = [on_bg(f.crop(crop), 3, bg).convert("RGB") for f in frames]
            gif[0].save(OUT / f"{name}_{key}.gif", save_all=True, append_images=gif[1:], duration=anim.ms, loop=0, disposal=2)
            strip = Image.new("RGBA", (frames[0].width * len(frames), frames[0].height), (*bg, 255))
            for i, f in enumerate(frames):
                strip.alpha_composite(f, (i * f.width, 0))
            strip.resize((strip.width * 3, strip.height * 3), Image.Resampling.NEAREST).save(OUT / f"{name}_{key}_frames.png")
    print(f"wrote {OUT}")
