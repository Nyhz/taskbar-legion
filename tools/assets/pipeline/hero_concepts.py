"""The lab's page for the RE-IMAGINED heroes (chars/*_v2.py): the new hero beside the one the game has and the
creatures it fights, and the new one moving (idle, then its shot).

    sh tools/assets/run.sh hero-concepts      # docs/redesign/lab/img/heroes/* + docs/redesign/lab/hero_concepts.html
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

from .rig import bake
from .chars import ranger_v2
from .palette import color
from .strip_pieces import backdrop, fig

ROOT = Path(__file__).resolve().parents[3]
LAB = ROOT / "docs" / "redesign" / "lab"
OUT = LAB / "img" / "heroes"
BG = color("dusk", 3) + (255,)


def trim(f: Image.Image) -> Image.Image:
    return f.crop(f.getbbox() or (0, 0, f.width, f.height))


def lineup(figures: list[Image.Image], path: Path, scale: int = 5) -> None:
    ims = [trim(f) for f in figures]
    h = max(i.height for i in ims)
    w = sum(i.width + 8 for i in ims) + 8
    c = Image.new("RGBA", (w, h + 6), BG)
    x = 8
    for i in ims:
        c.alpha_composite(i, (x, h - i.height + 3))
        x += i.width + 8
    c.resize((c.width * scale, c.height * scale), Image.NEAREST).save(path)


def scene_gif(char, anims, sequence: list[str], path: Path, scale: int = 4, on_strip: bool = False) -> None:
    frames: list[Image.Image] = []
    durations: list[int] = []
    for key in sequence:
        anim = anims[key]
        frames += bake(char, anim)
        durations += [int(ms) for ms in anim.ms]
    back = None
    if on_strip:
        b, _fore = backdrop(1)
        back = b.crop((150, 123 - 64, 246, 123 - 64 + 70))
    crop = (14, 10, 74, 68)
    big = []
    for f in frames:
        c = back.copy() if back is not None else Image.new("RGBA", f.size, BG)
        c.alpha_composite(f)
        big.append(c.crop(crop).resize(((crop[2] - crop[0]) * scale, (crop[3] - crop[1]) * scale), Image.NEAREST).convert("RGB"))
    pal = big[0].quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    q = [b.quantize(palette=pal, dither=Image.Dither.NONE) for b in big]
    q[0].save(path, save_all=True, append_images=q[1:], duration=durations, loop=0, optimize=True, disposal=1)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    ch = ranger_v2.RangerV2()
    idle = bake(ch, ranger_v2.ANIMS["idle"])
    shot = bake(ch, ranger_v2.ANIMS["attack"])
    lineup([idle[0], shot[10], fig("ranger", "idle", 0)[0], fig("templar", "idle", 0)[0], fig("poacher", "idle", 0)[0], fig("monk", "idle", 0)[0]], OUT / "ranger_lineup.png")
    scene_gif(ch, ranger_v2.ANIMS, ["idle", "attack", "idle", "attack"], OUT / "ranger_v2.gif", scale=5)
    scene_gif(ch, ranger_v2.ANIMS, ["idle", "attack"], OUT / "ranger_v2_strip.gif", scale=3, on_strip=True)
    (LAB / "hero_concepts.html").write_text(
        '<div class="item-group">\n  <h3>El Ranger nuevo, junto al actual y a los enemigos</h3>\n'
        '  <p class="muted">De izquierda a derecha: el Ranger nuevo quieto y tensando el arco, el Ranger actual, y tres enemigos (templario, cazador furtivo, monje).</p>\n'
        '  <img class="px" src="img/heroes/ranger_lineup.png" alt="El Ranger nuevo junto al actual" style="width:100%;max-width:1100px;height:auto;border:1px solid var(--line)">\n</div>\n'
        '<div class="item-group">\n  <h3>Moviéndose</h3>\n  <p class="muted">Quieto (respira, la capa se mece) y el disparo: sube el arco, tensa hasta la mejilla, aguanta, suelta y se recupera. A la derecha, sobre el fondo del mundo 1 a tamaño de juego ×3.</p>\n'
        '  <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end">'
        '<img class="px" src="img/heroes/ranger_v2.gif" alt="El Ranger nuevo animado" style="width:300px;height:auto;border:1px solid var(--line)">'
        '<img class="px" src="img/heroes/ranger_v2_strip.gif" alt="El Ranger nuevo en la tira" style="width:180px;height:auto;border:1px solid var(--line)"></div>\n</div>\n'
    )
    print("ranger v2")
