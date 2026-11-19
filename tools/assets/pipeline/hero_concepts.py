"""The lab's page for the re-imagined heroes' CONCEPTS (chars/*_concepts.py): a line-up beside the hero as it is and
the creatures it fights, and each concept moving (idle, its basic attack, an ability).

    sh tools/assets/run.sh hero-concepts      # docs/redesign/lab/img/heroes/* + docs/redesign/lab/hero_concepts.html
"""
from __future__ import annotations

from html import escape
from pathlib import Path

from PIL import Image

from .rig import bake
from .chars import ranger as ranger_base
from .chars.ranger_concepts import CONCEPTS, ConceptRanger
from .palette import color
from .strip_pieces import fig

ROOT = Path(__file__).resolve().parents[3]
LAB = ROOT / "docs" / "redesign" / "lab"
OUT = LAB / "img" / "heroes"
BG = color("dusk", 3) + (255,)
SCENE = [("idle", 1), ("attack", 1), ("idle", 1), ("volley", 1)]


def trim(f: Image.Image) -> Image.Image:
    return f.crop(f.getbbox() or (0, 0, f.width, f.height))


def lineup(figures: list[tuple[str, Image.Image]], path: Path, scale: int = 5) -> None:
    ims = [trim(f) for _, f in figures]
    h = max(i.height for i in ims)
    w = sum(i.width + 8 for i in ims) + 8
    c = Image.new("RGBA", (w, h + 6), BG)
    x = 8
    for i in ims:
        c.alpha_composite(i, (x, h - i.height + 3))
        x += i.width + 8
    c.resize((c.width * scale, c.height * scale), Image.NEAREST).save(path)


def scene_gif(char, path: Path, scale: int = 4) -> None:
    frames: list[Image.Image] = []
    durations: list[int] = []
    for key, loops in SCENE:
        anim = ranger_base.ANIMS[key]
        baked = bake(char, anim)
        for _ in range(loops):
            frames += baked
            durations += [int(ms) for ms in anim.ms]
    crop = (8, 6, 88, 68)
    big = []
    for f in frames:
        c = Image.new("RGBA", f.size, BG)
        c.alpha_composite(f)
        big.append(c.crop(crop).resize(((crop[2] - crop[0]) * scale, (crop[3] - crop[1]) * scale), Image.NEAREST).convert("RGB"))
    pal = big[0].quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    q = [b.quantize(palette=pal, dither=Image.Dither.NONE) for b in big]
    q[0].save(path, save_all=True, append_images=q[1:], duration=durations, loop=0, optimize=True, disposal=1)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    current = fig("ranger", "idle", 0)[0]
    concepts = [(look, ConceptRanger(look)) for look in CONCEPTS]
    idles = [(look.name, bake(ch, ranger_base.ANIMS["idle"])[0]) for look, ch in concepts]
    lineup([("Actual", current)] + idles + [(n, fig(n, "idle", 0)[0]) for n in ("templar", "poacher", "monk")], OUT / "ranger_lineup.png")
    shots = [(look.name, bake(ch, ranger_base.ANIMS["attack"])[9]) for look, ch in concepts]
    lineup([("Actual", fig("ranger", "attack", 9)[0])] + shots, OUT / "ranger_shoot.png")
    parts = [
        '<div class="item-group">\n  <h3>Ranger · los tres conceptos junto al actual</h3>\n'
        '  <p class="muted">De izquierda a derecha: el Ranger actual, los conceptos A, B y C, y tres enemigos para comparar (templario, cazador furtivo, monje). '
        'Los conceptos son más altos (40–41 px frente a 36), con un color de acento fuerte, arco y carcaj más grandes y más tonos.</p>\n'
        '  <img class="px" src="img/heroes/ranger_lineup.png" alt="Los conceptos del Ranger junto al actual" style="width:100%;max-width:1100px;height:auto;border:1px solid var(--line)">\n'
        '  <img class="px" src="img/heroes/ranger_shoot.png" alt="Tensando el arco" style="width:100%;max-width:700px;height:auto;border:1px solid var(--line)">\n</div>'
    ]
    for look, ch in concepts:
        scene_gif(ch, OUT / f"{look.key}.gif")
        parts.append(
            f'<div class="item-group">\n  <h3>{escape(look.name)}</h3>\n  <p class="muted">{escape(look.extra.get("blurb", ""))}</p>\n'
            f'  <img class="px" src="img/heroes/{look.key}.gif" alt="{escape(look.name)}" style="width:100%;max-width:320px;height:auto;border:1px solid var(--line)">\n</div>'
        )
        print("concept", look.key)
    (LAB / "hero_concepts.html").write_text("\n".join(parts) + "\n")
