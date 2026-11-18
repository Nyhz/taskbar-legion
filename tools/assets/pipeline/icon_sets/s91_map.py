"""The map panel's own art: a sign per difficulty, the signs of the journey (where the party is, the frontier,
locks, keys, a beaten boss), a thumbnail of every world cut from its real backdrop at 1:1 (and its night
silhouette for worlds not reached yet), and a portrait of every world boss cut from its idle frame.

Nothing here is redrawn by hand except the 16×16 signs: thumbnails and portraits come straight from the strip
art, so the map shows the same pixels the player will walk through.
"""
from __future__ import annotations

import importlib

from PIL import Image

from ..icons import Icon
from ..palette import ramp
from ..rig import Cel, Tone, bake
from ..roster import load
from .s80_stats import sprite

E = ".............."


# ── Difficulties: one sign each, following the grade each one paints on the worlds (REDESIGN §4.2) ──────────────

def diff_normal() -> Icon:  # the world at its own hour: a sun
    return sprite([
        "......yy......",
        ".y....yy....y.",
        "..y........y..",
        "....gggggg....",
        "...gYYYYYYg...",
        "...gYwYYYYg...",
        "yy.gYYYYYYg.yy",
        "yy.gYYYYYYg.yy",
        "...gYYYYYdg...",
        "...gYYYYddg...",
        "....gggggg....",
        "..y........y..",
        ".y....yy....y.",
        "......yy......",
    ], {"g": ("brass", 3), "Y": ("brass", 5), "w": ("brass", 7), "d": ("brass", 4), "y": ("brass", 6)})


def diff_hell() -> Icon:  # embers in the air: a flame
    return sprite([
        "......r.......",
        "......rr......",
        ".....rOr......",
        ".....rOOr.....",
        "....rOOOr..r..",
        "...rOOYOOr.rr.",
        "...rOYYOOrrOr.",
        "..rOOYYYOOOOr.",
        "..rOYYwYYOOOr.",
        "..rOYwwwYYOOr.",
        "..rOYwwwYYOr..",
        "...rOYwwYOr...",
        "....rOYYOr....",
        ".....rrrr.....",
    ], {"r": ("crimson", 3), "O": ("crimson", 5), "Y": ("brass", 5), "w": ("brass", 7)})


def diff_inferno() -> Icon:  # fire on the horizon: a horned skull with coals for eyes
    return sprite([
        "h............h",
        "hh..........hh",
        "hHh........hHh",
        ".hHh.bbbb.hHh.",
        "..hHbBBBBbHh..",
        "...bBBBBBBb...",
        "..bBBBBBBBBb..",
        "..bBrrBBrrBb..",
        "..bBrOBBOrBb..",
        "..bBBBkkBBBb..",
        "...bBBBBBBb...",
        "...bBkBkBkb...",
        "...bBkBkBBb...",
        "....bbbbbb....",
    ], {"h": ("crimson", 3), "H": ("crimson", 5), "b": ("bone", 3), "B": ("bone", 6), "r": ("crimson", 2), "O": ("brass", 6), "k": ("ink", 1)})


def diff_eternal() -> Icon:  # what never ends, and bites: a cold serpent eating its own tail, its eye alight
    # (2026-11-18, in the hourglass's place; user: «no cuadra con el estilo… siendo la penúltima le falta amenaza»)
    return sprite([
        "......sss.....",
        "....ssHHHs....",
        "..ssHHSSSHss..",
        ".sHHSs..sHHHs.",
        ".sHS...sHHeeHs",
        "sHS....sHHEeHs",
        "sHS.....sHHHs.",
        "sHS.....fdfd..",
        "sHS......tTs..",
        "sHHS....tTSs..",
        ".sHSS..tTSs...",
        ".sSSSSSTSSs...",
        "..ssSSSSs.....",
        "....ssss......",
    ], {"s": ("azure", 2), "S": ("azure", 4), "H": ("azure", 6), "e": ("crimson", 7), "E": ("crimson", 5), "f": ("light", 0),
        "d": ("azure", 1), "T": ("azure", 5), "t": ("azure", 3)})


def diff_torment() -> Icon:  # the Rift looks back: an eye
    return sprite([
        E,
        "...v......v...",
        "....v....v....",
        "....vvvvvv....",
        "..vvVVVVVVvv..",
        ".vVVPPkkPPVVv.",
        "vVVPPwkkPPPVVv",
        "vVVPPPkkPPPVVv",
        ".vVVPPkkPPVVv.",
        "..vvVVVVVVvv..",
        "....vvvvvv....",
        "....v....v....",
        "...v......v...",
        E,
    ], {"v": ("violet", 3), "V": ("violet", 5), "P": ("violet", 8), "k": ("ink", 0), "w": ("light", 0)})


# ── Signs of the journey ────────────────────────────────────────────────────────────────────────────────────────

def lock() -> Icon:  # not reached yet
    return sprite([
        E,
        "....aaaaaa....",
        "...aAAAAAAa...",
        "...aA....Aa...",
        "...aA....Aa...",
        "...aA....Aa...",
        ".gggggggggggg.",
        ".gGGGGGGGGGGg.",
        ".gGGGGkkGGGDg.",
        ".gGGGGkkGGGDg.",
        ".gGGGGGkGGGDg.",
        ".gGGGGGGGGDDg.",
        ".gggggggggggg.",
        E,
    ], {"a": ("ink", 6), "A": ("ink", 8), "g": ("ink", 4), "G": ("ink", 6), "D": ("ink", 5), "k": ("ink", 0)})


def key() -> Icon:  # a world-boss key
    return sprite([
        E,
        E,
        E,
        "..YYYY........",
        ".YwYYYY.......",
        ".YY..YYYYYYYY.",
        ".YY..YDDDDDDD.",
        ".YYYYYD..Y.Y..",
        "..DDDD...D.D..",
        E,
        E,
        E,
        E,
        E,
    ], {"Y": ("brass", 5), "w": ("brass", 7), "D": ("brass", 3)})


def skull() -> Icon:  # a boss
    return sprite([
        E,
        "....bbbbbb....",
        "...bBBBBBBb...",
        "..bBBBBBBBBb..",
        "..bBBBBBBBBb..",
        "..bkkBBBBkkb..",
        "..bkkBBBBkkb..",
        "..bBBBkkBBBb..",
        "...bBBBBBBb...",
        "....bBkBkb....",
        "....bBkBkb....",
        ".....bbbb.....",
        E,
        E,
    ], {"b": ("bone", 3), "B": ("bone", 6), "k": ("ink", 0)})


def here() -> Icon:  # where the party is: a pin in the Knight's blue
    return sprite([
        "....aaaaaa....",
        "...aAAAAAAa...",
        "..aALAAAAAAa..",
        "..aAAyyyyAAa..",
        "..aAAyYYyAAa..",
        "..aAAyYYyADa..",
        "..aAAyyyyADa..",
        "...aAAAAADa...",
        "....aAAADa....",
        "....aAAADa....",
        ".....aADa.....",
        ".....aADa.....",
        "......aa......",
        E,
    ], {"a": ("azure", 3), "A": ("azure", 5), "L": ("azure", 7), "D": ("azure", 4), "y": ("brass", 4), "Y": ("brass", 6)})


def front() -> Icon:  # the frontier: a gold pennant planted where progress stops
    return sprite([
        "..p...........",
        "..pyyyy.......",
        "..pYYYYyyy....",
        "..pYwYYYYYyy..",
        "..pYYYYYYYYYy.",
        "..pYYYYYYYyy..",
        "..pYYYYyyy....",
        "..pyyyy.......",
        "..p...........",
        "..p...........",
        "..p...........",
        "..p...........",
        ".ppp..........",
        "ppppp.........",
    ], {"p": ("ink", 7), "y": ("brass", 3), "Y": ("brass", 5), "w": ("brass", 7)})


def check() -> Icon:  # beaten
    return sprite([
        E,
        E,
        E,
        "...........YY.",
        "..........YYD.",
        ".........YYD..",
        ".YY.....YYD...",
        ".YYY...YYD....",
        "..YYY.YYD.....",
        "...YYYYD......",
        "....YYD.......",
        E,
        E,
        E,
    ], {"Y": ("brass", 6), "D": ("brass", 3)})


def foe() -> Icon:  # how strong the enemies are: a clawed print
    return sprite([
        E,
        "..rr..rr..rr..",
        "..rR..rR..rR..",
        "..rR..rR..rR..",
        E,
        "....rrrrrr....",
        "...rRRRRRRr...",
        "..rRRRRRRRRr..",
        "..rRRRRRRRRr..",
        "..rRRRRRRRRr..",
        "...rRRRRRRr...",
        "....rrrrrr....",
        E,
        E,
    ], {"r": ("crimson", 3), "R": ("crimson", 5)})


def lock_small() -> Image.Image:  # 8×9 badge on the corner of a difficulty not unlocked yet
    c = Cel(8, 9)
    c.stamp([
        "..kkkk..",
        ".kaaaak.",
        ".kakkak.",
        "kkkkkkkk",
        "kGGGGGGk",
        "kGGkkGGk",
        "kGGkkGGk",
        "kGGGGGGk",
        "kkkkkkkk",
    ], {"k": ("ink", 0), "a": ("ink", 6), "G": ("ink", 5)}, 0, 0)
    return c.image()


def silhouette(img: Image.Image, tones: tuple[int, ...] = (2, 3, 4)) -> Image.Image:
    """A sign turned to dull iron (its outline kept): the same shape, switched off."""
    ink = ramp("ink")
    out = img.copy()
    p = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = p[x, y]
            if a and (r, g, b) != ink[0]:
                lum = 0.3 * r + 0.59 * g + 0.11 * b
                p[x, y] = (*ink[tones[min(len(tones) - 1, int(lum / 256 * len(tones)))]], 255)
    return out


# ── World thumbnails: 56×40 cut from the backdrop at 1:1 ────────────────────────────────────────────────────────

TW, TH = 56, 40
#: Top-left of the cut in each world's 600×160 backdrop: the landmark that says which world it is.
CUTS = {1: (396, 62), 2: (70, 68), 3: (286, 60), 4: (372, 52), 5: (272, 30), 6: (205, 62), 7: (2, 40), 8: (280, 52), 9: (138, 38), 10: (108, 18)}
NAMES = {1: "Praderas doradas", 2: "Bosque viejo de musgo", 3: "Marismas de los Pilotes", 4: "Cañones de Roca Roja", 5: "Cumbres del Monasterio",
         6: "Costa de las Ruinas Hundidas", 7: "Cavernas de cristal y hongos", 8: "Tierras de ceniza y forjas", 9: "Ciudadela entre las nubes", 10: "La Grieta"}


def _edge(img: Image.Image) -> Image.Image:
    ink0 = (*ramp("ink")[0], 255)
    p = img.load()
    for x in range(img.width):
        p[x, 0] = p[x, img.height - 1] = ink0
    for y in range(img.height):
        p[0, y] = p[img.width - 1, y] = ink0
    return img


def thumb(n: int, grade: str = "normal") -> Image.Image:
    bd = importlib.import_module(f"..families.backdrop_w{n:02d}", __package__)
    layers = bd.build(grade)
    full = Image.new("RGBA", (bd.W, bd.H), (0, 0, 0, 255))
    for name, _fn, _speed in bd.LAYERS:
        if name != "fore":
            full.alpha_composite(layers[name])
    x, y = CUTS[n]
    return _edge(full.crop((x, y, x + TW, y + TH)))


def night(img: Image.Image) -> Image.Image:
    """A world not reached yet: its thumbnail as a night silhouette in four iron tones, split by rank so every
    world keeps its shapes whatever its colours were."""
    ink = ramp("ink")
    px = [(0.3 * r + 0.59 * g + 0.11 * b, i) for i, (r, g, b, _a) in enumerate(img.getdata())]
    order = sorted(px)
    level = [0] * len(px)
    for rank, (_lum, i) in enumerate(order):
        f = rank / len(px)
        level[i] = 1 if f < 0.45 else 2 if f < 0.80 else 3
    out = Image.new("RGBA", img.size)
    out.putdata([(*ink[lv], 255) for lv in level])
    return _edge(out)


# ── World bosses: a 36×36 gate with the boss's own face ─────────────────────────────────────────────────────────

#: World → (figure, top-left of the 32×32 cut in its idle frame).
BOSSES = {1: ("king", 40, 30), 2: ("warden", 42, 26), 3: ("ferryman", 40, 30), 4: ("colossus", 44, 32), 5: ("bellbearer", 40, 36),
          6: ("admiral", 39, 42), 7: ("geode", 54, 32), 8: ("magmawyrm", 110, 46), 9: ("archon", 52, 38), 10: ("unmaker", 48, 26)}
BOSS_NAMES = {1: "Rey de la Cosecha", 2: "Guardián Astado", 3: "El Barquero", 4: "Coloso de arenisca", 5: "El Portacampana",
              6: "El Almirante Ahogado", 7: "Titán Geoda", 8: "Sierpe de la Fragua", 9: "El Arconte", 10: "El Deshacedor"}


def gate(n: int) -> Image.Image:
    name, x, y = BOSSES[n]
    mod, char = load(name)
    frame = bake(char, mod.ANIMS["idle"])[0]
    c = Cel(36, 36)
    for j in range(36):
        for i in range(36):
            ring = min(i, j, 35 - i, 35 - j)
            c.put(i, j, ("crimson", 3) if ring == 0 else ("ink", 0) if ring == 1 else ("dusk", 1) if (i + j) % 2 or j < 20 else ("dusk", 2))
    for i, j in ((0, 0), (35, 0), (0, 35), (35, 35)):  # studs, like the rarity frames
        c.put(i, j, ("crimson", 5))
    for i, j in ((1, 0), (0, 1), (34, 0), (35, 1), (0, 34), (1, 35), (34, 35), (35, 34)):
        c.put(i, j, ("crimson", 4))
    out = c.image()
    out.alpha_composite(frame.crop((x, y, x + 32, y + 32)), (2, 2))
    return out


SIGNS = [
    ("map_diff_normal", "Normal", diff_normal), ("map_diff_hell", "Hell", diff_hell), ("map_diff_inferno", "Inferno", diff_inferno),
    ("map_diff_eternal", "Eternal", diff_eternal), ("map_diff_torment", "Torment", diff_torment),
    ("map_here", "El grupo está aquí", here), ("map_front", "Frontera", front), ("map_key", "Llave de jefe de mundo", key),
    ("map_skull", "Jefe", skull), ("map_check", "Vencido", check), ("map_lock", "Sin alcanzar", lock), ("map_foe", "Fuerza de los enemigos", foe),
]


def build() -> list[dict]:
    signs = [(stem, name, fn().image()) for stem, name, fn in SIGNS]
    off = [(f"{stem}_off", f"{name} · sin desbloquear", silhouette(img)) for stem, name, img in signs[:5]]
    thumbs = {n: thumb(n) for n in CUTS}
    return [
        {"key": "map_signs", "title": "Mapa · signos", "note": "Un signo por dificultad (y su versión apagada), y los del viaje: dónde está el grupo, la frontera, llaves, jefes y candados.",
         "items": signs + off + [("map_lock_s", "Candado pequeño", lock_small())]},
        {"key": "map_worlds", "title": "Mapa · los diez mundos", "note": "Miniaturas de 56 × 40 cortadas del fondo real de cada mundo, a su mismo tamaño de píxel.",
         "items": [(f"map_w{n:02d}", NAMES[n], img) for n, img in thumbs.items()]},
        {"key": "map_worlds_off", "title": "Mapa · mundos sin alcanzar", "note": "La misma miniatura como silueta de noche: se adivina qué viene, sin enseñarlo.",
         "items": [(f"map_w{n:02d}_off", f"{NAMES[n]} · sin alcanzar", night(img)) for n, img in thumbs.items()]},
        {"key": "map_bosses", "title": "Mapa · jefes de mundo", "note": "La puerta de cada jefe de mundo, con su cara cortada de su animación de reposo.",
         "items": [(f"map_boss_w{n:02d}", BOSS_NAMES[n], gate(n)) for n in BOSSES]},
    ]
