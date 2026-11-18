"""The strip's HUD: the signs of the rail above the battle strip (panel launchers, chests, key, boss, retry, the
zone's heal debuff, the enrage glass), the rail itself, and two composed scenes of the strip for the mock-up to
sit on (world 1: a wave, and its stage boss). The scenes are review pictures, not game assets.
"""
from __future__ import annotations

import importlib
from pathlib import Path

from PIL import Image, ImageOps

from ..icons import Icon
from ..palette import RAMPS
from ..rig import Cel
from ..roster import load
from .s80_stats import sprite

E = ".............."
CHARS = Path(__file__).resolve().parents[2] / "out" / "chars"


def party() -> Icon:  # a plumed helm: the heroes
    return sprite([
        ".........rr...",
        "........rRRr..",
        "....aaaarRr...",
        "...aWWWWAa....",
        "..aWAAAAAAa...",
        "..aAAAAAAAa...",
        "..akkkkkkAa...",
        "..aAAAAAAAa...",
        "..aAAkAkAAa...",
        "..aAAkAkADa...",
        "...aAAAADa....",
        "....aaaaa.....",
        E,
        E,
    ], {"a": ("ink", 3), "A": ("ink", 6), "W": ("ink", 8), "D": ("ink", 4), "k": ("ink", 0), "r": ("crimson", 3), "R": ("crimson", 5)})


def stash() -> Icon:  # a tied sack
    return sprite([
        E,
        "....ll..ll....",
        "...lLLllLLl...",
        "....lccccl....",
        "....lLLLLl....",
        "...lLWLLLLl...",
        "..lLWLLLLLDl..",
        "..lLLLLLLLDl..",
        "..lLLLLLLDDl..",
        "..lLLLLLLDDl..",
        "...lLLLDDDl...",
        "....llllll....",
        E,
        E,
    ], {"l": ("leather", 2), "L": ("leather", 5), "W": ("leather", 7), "D": ("leather", 3), "c": ("brass", 5)})


def tech() -> Icon:  # the upgrades: a green arrow going up (2026-11-18; the scroll did not say what was inside)
    return sprite([
        "......mm......",
        ".....mMMm.....",
        "....mMWMMm....",
        "...mMWMMMMm...",
        "..mMWMMMMMMm..",
        ".mMMMMMMMMMMm.",
        ".mmmmMMMMmmmm.",
        "....mMWMMm....",
        "....mMWMMm....",
        "....mMWMMm....",
        "....mMMMMm....",
        "....mMMMMm....",
        "....mmmmmm....",
        E,
    ], {"m": ("moss", 3), "M": ("moss", 6), "W": ("moss", 8)})


def cube() -> Icon:  # the cube, three faces
    return sprite([
        E,
        "......VV......",
        "....VVVVVV....",
        "..VVVVVVVVVV..",
        ".VVVVVVVVVVVV.",
        ".MMVVVVVVVVDD.",
        ".MMMMVVVVDDDD.",
        ".MMMMMMDDDDDD.",
        ".MMMMMMDDDDDD.",
        ".MMMMMMDDDDDD.",
        "..MMMMMDDDDD..",
        "....MMMDDD....",
        "......MD......",
        E,
    ], {"V": ("violet", 7), "M": ("violet", 5), "D": ("violet", 3)})


def world_map() -> Icon:  # a chart with a route and its cross
    return sprite([
        E,
        ".pppppppppppp.",
        ".pPPPPPPPPPPp.",
        ".pPrPPPPPPPPp.",
        ".pPPrPPPPPPPp.",
        ".pPPPrPPPPPPp.",
        ".pPPPPrrPPPPp.",
        ".pPPPPPPrxPxp.",
        ".pPPPPPPPPxPp.",
        ".pPPPPPPPxPxp.",
        ".pPPPPPPPPPPp.",
        ".pppppppppppp.",
        E,
        E,
    ], {"p": ("bone", 2), "P": ("bone", 5), "r": ("leather", 3), "x": ("crimson", 4)})


def pets() -> Icon:  # a paw
    return sprite([
        E,
        "....ll..ll....",
        "...lLLllLLl...",
        "...lLLllLLl...",
        ".ll.ll..ll.ll.",
        "lLLl......lLLl",
        "lLLl.llll.lLLl",
        ".ll.lLLLLl.ll.",
        "...lLLLLLLl...",
        "..lLLLLLLLLl..",
        "..lLLLLLLLLl..",
        "...lLLllLLl...",
        "....ll..ll....",
        E,
    ], {"l": ("leather", 3), "L": ("leather", 6)})


def options() -> Icon:  # a cog
    return sprite([
        E,
        ".....aAAa.....",
        "..aa.aAAa.aa..",
        ".aAAaAAAAaAAa.",
        "..aAAAAAAAAa..",
        ".aaAAAkkAAAaa.",
        "aAAAAk..kAAAAa",
        "aAAAAk..kAAAAa",
        ".aaAAAkkAAAaa.",
        "..aAAAAAAAAa..",
        ".aAAaAAAAaAAa.",
        "..aa.aAAa.aa..",
        ".....aAAa.....",
        E,
    ], {"a": ("ink", 4), "A": ("ink", 7), "k": ("ink", 3)})


def boss() -> Icon:  # a skull: the boss at the end of the stage
    return sprite([
        E,
        "....bbbbbb....",
        "...bWWWWWWb...",
        "..bWWWWWWWWb..",
        "..bWWWWWWWWb..",
        "..bWkkWWkkWb..",
        "..bWkkWWkkWb..",
        "..bWWWkkWWWb..",
        "...bWWWWWWb...",
        "...bWkWkWkb...",
        "...bWkWkWkb...",
        "....bbbbbb....",
        E,
        E,
    ], {"b": ("bone", 3), "W": ("bone", 6), "k": ("ink", 0)})


def chest(wood: str, band: str) -> Icon:  # a closed chest in the colours of its kind
    return sprite([
        E,
        E,
        "..cccccccccc..",
        ".cLLLLLLLLLLc.",
        ".cLLLLLLLLLLc.",
        ".mmmmmggmmmmm.",
        ".cCCCCggCCCDc.",
        ".cCCCCCCCCCDc.",
        ".cCCCCCCCCCDc.",
        ".cccccccccccc.",
        E,
        E,
        E,
        E,
    ], {"c": (wood, 2), "L": (wood, 6), "C": (wood, 4), "D": (wood, 3), "m": (band, 4), "g": ("brass", 6)})


def key() -> Icon:  # the world boss's key
    return sprite([
        E,
        E,
        "..gggg........",
        ".gGGGGg.......",
        "gGg..gGgggggg.",
        "gG....GGGGGGGg",
        "gGg..gGggGgGg.",
        ".gGGGGg.gGgGg.",
        "..gggg...g.g..",
        E,
        E,
        E,
        E,
        E,
    ], {"g": ("brass", 3), "G": ("brass", 6)})


def retry() -> Icon:  # two arrows chasing each other: stay and try again
    return sprite([
        E,
        "....aaaaaa....",
        "...aAAAAAAa.a.",
        "..aAa....aAaAa",
        "..aa......aAAa",
        ".........aaaaa",
        E,
        "aaaaa.........",
        "aAAa......aa..",
        "aAaAa....aAa..",
        ".a.aAAAAAAa...",
        "....aaaaaa....",
        E,
        E,
    ], {"a": ("ink", 4), "A": ("ink", 8)})


def debuff() -> Icon:  # a cracked, withered heart: healing is worth less here
    return sprite([
        E,
        "..rrr....rrr..",
        ".rRRRr..rRRRr.",
        "rRRRRRrrRkRRRr",
        "rRRRRRRRkRRRRr",
        "rRRRRRRkRRRRRr",
        ".rRRRRRkkRRRr.",
        "..rRRRRRkRRr..",
        "...rRRRkRRr...",
        "....rRRkRr....",
        ".....rRRr.....",
        "......rr......",
        E,
        E,
    ], {"r": ("crimson", 1), "R": ("crimson", 3), "k": ("ink", 0)})


def enrage() -> Icon:  # an hourglass: time before the boss enrages
    return sprite([
        "..gggggggggg..",
        "...gSSSSSSg...",
        "...gsSSSSsg...",
        "....gsSSsg....",
        ".....gsSg.....",
        "......gg......",
        ".....g.Sg.....",
        "....g..S.g....",
        "...g..sSs.g...",
        "...g.sSSSsg...",
        "...gsSSSSSg...",
        "..gggggggggg..",
        E,
        E,
    ], {"g": ("brass", 4), "S": ("crimson", 5), "s": ("crimson", 3)})


def rail() -> Image.Image:
    """12×22, sliced 4 px left and right: the plate the HUD sits on, a brass cap at each end."""
    c = Cel(12, 22)
    for y in range(22):
        for x in range(12):
            edge = min(x, 11 - x)
            if y in (0, 21) or edge == 0 or edge == 3:
                c.put(x, y, ("ink", 0))
            elif edge in (1, 2):
                c.put(x, y, ("brass", 6 if (edge == 1 and y == 1) else 5 if y < 11 else 3))
            else:
                c.put(x, y, ("ink", 3) if y == 1 else ("ink", 1))
    return c.image()


def _hex(tone: tuple[str, int]) -> tuple[int, int, int, int]:
    h = RAMPS[tone[0]][tone[1]].lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


def _frame(name: str, anim: str, frac: float) -> Image.Image:
    files = sorted(CHARS.glob(f"{name}_{anim}_[0-9][0-9].png"))
    if not files:
        raise RuntimeError(f"no rendered frames for {name}/{anim}: run `sh run.sh chars {name}` first")
    return Image.open(files[min(len(files) - 1, int(frac * len(files)))]).convert("RGBA")


def scene(world: str, grade: str, heroes: list[tuple], foes: list[tuple]) -> Image.Image:
    """The strip as the game would draw it (600×160): the backdrop, the figures on the path, a life bar over each
    head. `heroes` and `foes` are (name, x, anim, frac, life 0–1 or None)."""
    bd = importlib.import_module(f"..families.backdrop_{world}", __package__)
    layers = bd.build(grade)
    im = Image.new("RGBA", (bd.W, bd.H))
    for name, _f, _s in bd.LAYERS:
        if name != "fore":
            im.alpha_composite(layers[name])

    def place(name: str, x: int, anim: str, frac: float, life: float | None, foe: bool) -> None:
        _mod, char = load(name)
        f = _frame(name, anim, frac)
        root = char.build.root_x
        if foe:
            f = ImageOps.mirror(f)
            root = f.width - root
        ox, oy = x - root, int(bd.PATH_Y - (64 + char.TOP))
        box = (max(0, -ox), max(0, -oy), min(f.width, bd.W - ox), f.height)
        im.alpha_composite(f.crop(box), (max(0, ox), max(0, oy)))
        if life is None:
            return
        top = oy + (f.getbbox() or (0, 0, 0, 0))[1]
        x0, y0, w = x - 8, top - 6, 16
        for yy in range(4):
            for xx in range(w):
                rim = yy in (0, 3) or xx in (0, w - 1)
                full = (xx - 1) < round((w - 2) * life)
                tone = ("ink", 0) if rim else ((("crimson", 5 if yy == 1 else 4) if foe else ("moss", 6 if yy == 1 else 5)) if full else ("ink", 2))
                if 0 <= x0 + xx < bd.W and 0 <= y0 + yy < bd.H:
                    im.putpixel((x0 + xx, y0 + yy), _hex(tone))

    for h in heroes:
        place(*h, foe=False)
    for f in foes:
        place(*f, foe=True)
    if "fore" in layers:
        im.alpha_composite(layers["fore"])
    return im


# ── The menu plaque (2026-11-18; user: «convertir este botón en algo que deje más claro que es el botón para abrir el
# menú… un asset que ponga Menu así en pixel art bonito y claro»): the one launcher on the rail, as a small sign-board
# with the word on it — gold capitals with 2-px stems and a dark drop shadow, in a dark well framed in bevelled
# brass. One per language: MENU / MENÚ (the accent sits over the U, clear of it).

MENU_GLYPHS = {
    "M": ["XX...XX", "XXX.XXX", "XXXXXXX", "XX.X.XX", "XX...XX", "XX...XX", "XX...XX"],
    "E": ["XXXXX", "XX...", "XX...", "XXXX.", "XX...", "XX...", "XXXXX"],
    "N": ["XX..XX", "XXX.XX", "XXXXXX", "XX.XXX", "XX..XX", "XX..XX", "XX..XX"],
    "U": ["XX..XX", "XX..XX", "XX..XX", "XX..XX", "XX..XX", "XX..XX", ".XXXX."],
}
ACUTE = ["...XX", "..XX."]


def _tone(ramp: str, i: int) -> tuple[int, int, int, int]:
    v = RAMPS[ramp][i].lstrip("#")
    return (int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16), 255)


def menu_plaque(accent: bool) -> Image.Image:
    word = "MENU"
    width = sum(len(MENU_GLYPHS[c][0]) for c in word) + len(word) - 1
    w, h = width + 6, 16
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    edge, hi, lo = _tone("ink", 0), _tone("brass", 4), _tone("brass", 2)
    well, well_hi = _tone("ink", 2), _tone("ink", 3)
    for y in range(h):
        for x in range(w):
            if x in (0, w - 1) and y in (0, h - 1):
                continue  # the corners cut
            if x in (0, w - 1) or y in (0, h - 1):
                im.putpixel((x, y), edge)
            elif y == 1 or x == 1:
                im.putpixel((x, y), hi)  # the brass catches the light top and left…
            elif y == h - 2 or x == w - 2:
                im.putpixel((x, y), lo)  # …and falls dark bottom and right
            else:
                im.putpixel((x, y), well_hi if y == 2 else well)
    # The word: 7 rows, centred in the well (with the accent, room is made above it).
    top = 6 if accent else 4
    gold, gold_hi, shadow = _tone("brass", 6), _tone("brass", 7), edge
    x0 = 3
    marks: list[tuple[int, int, bool]] = []  # (x, y, top row of a stroke)
    for c in word:
        glyph = MENU_GLYPHS[c]
        for gy, row in enumerate(glyph):
            for gx, ch in enumerate(row):
                if ch == "X":
                    marks.append((x0 + gx, top + gy, gy == 0 or glyph[gy - 1][gx] != "X"))
        if accent and c == "U":
            for ay, row in enumerate(ACUTE):
                for ax, ch in enumerate(row):
                    if ch == "X":
                        marks.append((x0 + ax, top - 3 + ay, ay == 0))
        x0 += len(glyph[0]) + 1
    for x, y, _ in marks:  # the shadow first, one pixel down and right
        if im.getpixel((x + 1, y + 1)) != gold:
            im.putpixel((x + 1, y + 1), shadow)
    for x, y, lit in marks:
        im.putpixel((x, y), gold_hi if lit else gold)
    return im


def build() -> list[dict]:
    wave = scene("w01", "normal",
                 [("priest", 176, "cast", 0.5, 1.0), ("ranger", 232, "attack", 0.45, 0.9), ("knight", 292, "attack", 0.55, 0.7)],
                 [("boar", 340, "hurt", 0.25, 0.35), ("scarecrow", 398, "run", 0.3, 1.0), ("poacher", 470, "attack", 0.5, 1.0)])
    fight = scene("w01", "normal",
                  [("priest", 176, "cast", 0.6, 0.85), ("ranger", 232, "volley", 0.5, 0.6), ("knight", 292, "block", 0.5, 0.45)],
                  [("king", 388, "attack", 0.5, None)])
    signs = [
        ("hud_party", "Héroes", party()), ("hud_stash", "Alijo", stash()), ("hud_tech", "Técnica", tech()), ("hud_cube", "Cubo", cube()),
        ("hud_map", "Mapa", world_map()), ("hud_pets", "Mascotas", pets()), ("hud_options", "Opciones", options()),
        ("hud_boss", "Jefe", boss()), ("hud_chest_normal", "Cofre común", chest("leather", "ink")), ("hud_chest_stage", "Cofre de jefe de etapa", chest("ink", "brass")),
        ("hud_chest_world", "Cofre de jefe de mundo", chest("violet", "brass")), ("hud_key", "Llave de jefe de mundo", key()),
        ("hud_retry", "Reintentar", retry()), ("hud_debuff", "Curación mermada", debuff()), ("hud_enrage", "Furia del jefe", enrage()),
    ]
    return [
        {"key": "hud", "title": "Signos del HUD", "note": "Lo que la barra sobre la tira dice sin palabras: los paneles, los cofres, la llave, el jefe.",
         "items": [(stem, name, ic.image()) for stem, name, ic in signs] + [("hud_menu_en", "Menú (inglés)", menu_plaque(False)), ("hud_menu_es", "Menú (español)", menu_plaque(True)), ("hud_rail", "Barra del HUD", rail())]},
        {"key": "mock_scenes", "title": "Escenas de la tira", "note": "Dos momentos de la tira compuestos para las maquetas.",
         "items": [("hud_scene_wave", "Oleada en las Praderas doradas", wave), ("hud_scene_boss", "El Rey de la Cosecha", fight)]},
    ]
