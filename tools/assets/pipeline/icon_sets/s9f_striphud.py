"""The HUD the strip draws OVER the fighters (`hud_s_*`): life bars, the chips of the effects a hero wears and of
his abilities, and the 7×7 mini signs that go inside them.

Everything here is drawn at the strip's own size, 1 art pixel = 1 pixel of a figure, and is read at ×1 on a
1280×720 screen: so no outlines-around-outlines, one bold shape per sign, a dark well under every colour.

  bars     a dark casing with a well; the game stretches a 1-px-wide FILL column inside it (life, low life,
           the slice just lost, an absorb shield, the respawn count, an enemy's life, a boss's cast)
  chips    9×9: a 1-px frame (gold = a buff, red = a debuff, steel / gold / green = an ability recharging /
           ready / charging by hits) round a dark 7×7 well
  signs    7×7, one per hero ability — the same idea and colours as its 16 px sign in the panels — plus the
           generic ones (buff, debuff, bleed, slow, wound) and the hourglass of a fallen hero
  more     "+N" when a hero wears more effects than fit
"""
from __future__ import annotations

from PIL import Image

from ..palette import RAMPS

Tone = tuple[str, int]


def _rgba(tone: Tone) -> tuple[int, int, int, int]:
    value = RAMPS[tone[0]][tone[1]].lstrip("#")
    return (int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16), 255)


def px(rows: list[str], legend: dict[str, Tone]) -> Image.Image:
    """A drawing from rows of letters ('.' = nothing)."""
    w = len(rows[0])
    assert all(len(r) == w for r in rows), [len(r) for r in rows]
    img = Image.new("RGBA", (w, len(rows)), (0, 0, 0, 0))
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch != ".":
                img.putpixel((x, y), _rgba(legend[ch]))
    return img


# ── bars ────────────────────────────────────────────────────────────────────────────────────────────────────
EDGE: Tone = ("ink", 0)
WELL: Tone = ("ink", 2)


def casing(w: int, h: int, edge: Tone = EDGE, frame: Tone | None = None) -> Image.Image:
    """A bar's casing: a 1-px dark edge with the corners cut, optionally a coloured frame inside it, and the well."""
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for y in range(h):
        for x in range(w):
            corner = (x in (0, w - 1)) and (y in (0, h - 1))
            if corner:
                continue
            on_edge = x in (0, w - 1) or y in (0, h - 1)
            if on_edge:
                img.putpixel((x, y), _rgba(edge))
            elif frame is not None and (x in (1, w - 2) or y in (1, h - 2)):
                img.putpixel((x, y), _rgba(frame))
            else:
                img.putpixel((x, y), _rgba(WELL))
    return img


def notches(w: int, h: int, parts: int) -> Image.Image:
    """Dark ticks that cut a bar's well into `parts` equal segments (drawn over the fill)."""
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    inner = w - 2
    for k in range(1, parts):
        x = 1 + round(inner * k / parts)
        for y in range(1, h - 1):
            img.putpixel((x, y), _rgba(EDGE))
    return img


def column(tones: list[Tone]) -> Image.Image:
    """A fill: one pixel wide, stretched across the well by the game. Top row lighter: a bar reads as a rod."""
    img = Image.new("RGBA", (1, len(tones)), (0, 0, 0, 0))
    for y, tone in enumerate(tones):
        img.putpixel((0, y), _rgba(tone))
    return img


#: (stem, image): casings are named by what wears them; `inner` sizes are in render/stripHud.ts.
def bars() -> list[tuple[str, str, Image.Image]]:
    return [
        ("hud_s_bar_hero", "Barra de vida de un héroe (27×5, hueco 25×3: ancho impar, como las filas de fichas, para compartir eje)", casing(27, 5)),
        ("hud_s_bar_hero_low", "…con poca vida: el borde se enciende", casing(27, 5, ("crimson", 4))),
        ("hud_s_bar_hero_notch", "Muescas en cuartos (alternativa)", notches(27, 5, 4)),
        ("hud_s_bar_foe", "Barra de un enemigo común (16×4, hueco 14×2)", casing(16, 4)),
        ("hud_s_bar_elite", "Barra de un élite (32×7: borde, marco violeta, hueco 28×3)", casing(32, 7, EDGE, ("violet", 6))),
        ("hud_s_bar_cast", "Barra de lanzamiento de un jefe (38×5, hueco 36×3)", casing(38, 5)),
        ("hud_s_fill_life", "Vida", column([("moss", 7), ("moss", 6), ("moss", 4)])),
        ("hud_s_fill_low", "Poca vida", column([("crimson", 6), ("crimson", 5), ("crimson", 3)])),
        ("hud_s_fill_ghost", "Lo que acaba de perder", column([("light", 0), ("bone", 6), ("bone", 4)])),
        ("hud_s_fill_shield", "Escudo que absorbe", column([("azure", 8), ("azure", 6), ("azure", 4)])),
        ("hud_s_fill_respawn", "Cuenta para reaparecer", column([("azure", 5), ("azure", 4), ("azure", 3)])),
        ("hud_s_fill_foe", "Vida de un enemigo", column([("crimson", 5), ("crimson", 4), ("crimson", 3)])),
        ("hud_s_fill_cast", "Lanzamiento", column([("brass", 6), ("brass", 5), ("brass", 3)])),
        ("hud_s_fill_cast_wound", "Lanzamiento · Herida mortal", column([("violet", 7), ("violet", 6), ("violet", 4)])),
    ]


# ── chips ───────────────────────────────────────────────────────────────────────────────────────────────────
def chip(frame: Tone, well: Tone = ("ink", 1)) -> Image.Image:
    img = Image.new("RGBA", (9, 9), (0, 0, 0, 0))
    for y in range(9):
        for x in range(9):
            on_edge = x in (0, 8) or y in (0, 8)
            corner = (x in (0, 8)) and (y in (0, 8))
            img.putpixel((x, y), _rgba(("ink", 0) if corner else frame if on_edge else well))
    return img


DIGITS = {
    "0": [".o.", "o.o", "o.o", "o.o", ".o."],
    "1": [".o.", "oo.", ".o.", ".o.", "ooo"],
    "2": ["oo.", "..o", ".o.", "o..", "ooo"],
    "3": ["oo.", "..o", ".o.", "..o", "oo."],
    "4": ["o.o", "o.o", "ooo", "..o", "..o"],
    "5": ["ooo", "o..", "oo.", "..o", "oo."],
    "6": [".oo", "o..", "oo.", "o.o", ".o."],
    "7": ["ooo", "..o", ".o.", ".o.", ".o."],
    "8": [".o.", "o.o", ".o.", "o.o", ".o."],
    "9": [".o.", "o.o", ".oo", "..o", "oo."],
}


def more(n: int) -> Image.Image:
    """"+N": the effects that did not fit."""
    img = chip(("ink", 5))
    ink = _rgba(("bone", 6))
    for x, y in ((1, 4), (2, 3), (2, 4), (2, 5), (3, 4)):  # the plus
        img.putpixel((x, y), ink)
    for y, row in enumerate(DIGITS[str(n)]):
        for x, ch in enumerate(row):
            if ch == "o":
                img.putpixel((5 + x, 2 + y), ink)
    return img


def digit(ch: str) -> Image.Image:
    """A 3×5 numeral (the count of a fallen hero's return), drawn in a chip's dark well."""
    img = Image.new("RGBA", (3, 5), (0, 0, 0, 0))
    for y, row in enumerate(DIGITS[ch]):
        for x, c in enumerate(row):
            if c == "o":
                img.putpixel((x, y), _rgba(("azure", 7)))
    return img


def chips() -> list[tuple[str, str, Image.Image]]:
    out = [
        ("hud_s_chip_buff", "Efecto a favor", chip(("brass", 5))),
        ("hud_s_chip_debuff", "Efecto en contra", chip(("crimson", 4))),
        ("hud_s_chip_ready", "Habilidad lista", chip(("brass", 6))),
        ("hud_s_chip_wait", "Habilidad recargando", chip(("ink", 4))),
        ("hud_s_chip_charge", "Habilidad cargando con golpes", chip(("moss", 5))),
    ]
    out += [("hud_s_chip_count", "Cuenta (marco azul)", chip(("azure", 4)))]
    out += [(f"hud_s_more_{n}", f"+{n}", more(n)) for n in range(1, 10)]
    out += [(f"hud_s_d_{n}", f"Cifra {n}", digit(str(n))) for n in range(10)]
    return out


# ── signs (7×7) ─────────────────────────────────────────────────────────────────────────────────────────────
STEEL = {"a": ("ink", 5), "A": ("ink", 7), "d": ("ink", 3), "S": ("ink", 9), "s": ("ink", 7)}
RED = {"r": ("crimson", 4), "R": ("crimson", 6)}
BLUE = {"b": ("azure", 3), "B": ("azure", 5)}
GOLD = {"g": ("brass", 4), "G": ("brass", 6), "w": ("light", 0)}
GREEN = {"m": ("moss", 4), "M": ("moss", 6), "W": ("moss", 8)}
WOOD = {"l": ("leather", 5), "h": ("leather", 4)}
FIRE = {"o": ("crimson", 5), "y": ("brass", 5), "Y": ("brass", 7)}
TEAL = {"t": ("sea", 4), "T": ("sea", 6), "k": ("ink", 1)}
PURPLE = {"v": ("violet", 5), "V": ("violet", 7)}

SIGNS: list[tuple[str, str, list[str], dict[str, Tone]]] = [
    # Knight
    ("stone_skin", "Piel de piedra", [
        "..aaa..",
        ".aAAAa.",
        "aAAdAAa",
        "aAdAAAa",
        "aAAdAda",
        ".aAAda.",
        "..aaa..",
    ], STEEL),
    ("cleave", "Tajo debilitante", [
        "..rrr..",
        ".rRRRr.",
        "rRRr...",
        "rRr....",
        "rRRr...",
        ".rRRRr.",
        "..rrr..",
    ], RED),
    ("bulwark", "Baluarte", [
        "bbbbbbb",
        "bBBBBBb",
        "bBBGBBb",
        "bBGGGBb",
        ".bBGBb.",
        "..bBb..",
        "...b...",
    ], {**BLUE, **GOLD}),
    ("battle_cry", "Grito de guerra", [
        ".....g.",
        "...ggGw",
        ".gGGGG.",
        ".gGGGGw",
        ".gGGGG.",
        "...ggGw",
        ".....g.",
    ], GOLD),
    ("bloodlust", "Sed de sangre", [
        "...r...",
        "..rRr..",
        "..rRr..",
        ".rRRRr.",
        "rRRRRRr",
        "rRRRRRr",
        ".rrrrr.",
    ], RED),
    ("hold_the_line", "Mantener la línea", [
        "l.bbbbb",
        "l.bBGBb",
        "l.bBBBb",
        "l.bbbbb",
        "l......",
        "l......",
        "lll....",
    ], {**BLUE, **GOLD, **WOOD}),
    ("riposte", "Réplica", [
        "r....sS",
        "....sS.",
        "...sS..",
        "h.sS..r",
        ".hS....",
        "hh.h...",
        "h......",
    ], {**STEEL, **RED, **WOOD}),
    ("last_stand", "Última resistencia", [
        "bbbbbbb",
        "bBBBBBb",
        "bRBBBRb",
        "bRRRRRb",
        ".bRRRb.",
        "..bRb..",
        "...b...",
    ], {**BLUE, **RED}),
    # Ranger
    ("rapid_fire", "Fuego rápido", [
        ".......",
        "M..M...",
        "WM.WM..",
        ".WM.WM.",
        "WM.WM..",
        "M..M...",
        ".......",
    ], GREEN),
    ("aimed_shot", "Disparo certero", [
        "...S...",
        ".rrSrr.",
        ".r...r.",
        "SS.R.SS",
        ".r...r.",
        ".rrSrr.",
        "...S...",
    ], {**STEEL, **RED}),
    ("raining_arrows", "Lluvia de flechas", [
        ".l.....",
        ".l...l.",
        "sls..l.",
        ".S...l.",
        "....sls",
        ".....S.",
        ".......",
    ], {**STEEL, **WOOD}),
    ("explosive_arrow", "Flecha explosiva", [
        "....oyo",
        "...oYYy",
        "...lyYo",
        "..l.oo.",
        ".l.....",
        "S......",
        ".......",
    ], {**STEEL, **WOOD, **FIRE}),
    ("caltrops", "Abrojos", [
        ".S.....",
        "SAS..S.",
        ".S..SAS",
        ".....S.",
        "..S....",
        ".SAS...",
        "..S....",
    ], STEEL),
    ("weak_spot", "Punto débil", [
        "aaaaaaa",
        "aAAAAAa",
        "aAArAAa",
        "aArRrAa",
        "aAArAAa",
        "aAAAAAa",
        "aaaaaaa",
    ], {**STEEL, **RED}),
    ("tar_flask", "Frasco de brea", [
        "..ll...",
        "..TT...",
        ".tTTt..",
        "tTkkTt.",
        "tkkkkt.",
        "tkkkkt.",
        ".tttt..",
    ], {**TEAL, **WOOD}),
    ("hunters_mark", "Marca del cazador", [
        "...r...",
        "..rRr..",
        ".rR.Rr.",
        "rR.w.Rr",
        ".rR.Rr.",
        "..rRr..",
        "...r...",
    ], {**RED, **GOLD}),
    # Priest
    ("mend", "Sanar", [
        "..mmm..",
        "..mMm..",
        "mmmMmmm",
        "mMMWMMm",
        "mmmMmmm",
        "..mMm..",
        "..mmm..",
    ], GREEN),
    ("power_infusion", "Infusión de poder", [
        "...g...",
        "..gGg..",
        ".gGwGg.",
        "ggGwGgg",
        "..gGg..",
        "..gGg..",
        "..ggg..",
    ], GOLD),
    ("holy_shield", "Escudo sagrado", [
        ".......",
        ".ggggg.",
        ".gGwGg.",
        ".gwwwg.",
        ".gGwGg.",
        "..gGg..",
        "...g...",
    ], GOLD),
    ("holy_nova", "Nova sagrada", [
        "g..g..g",
        ".g.G.g.",
        "..GwG..",
        "gGwwwGg",
        "..GwG..",
        ".g.G.g.",
        "g..g..g",
    ], GOLD),
    ("retribution", "Aura de represalia", [
        "..rrr..",
        ".r...r.",
        "r..G..r",
        "r.GwG.r",
        "r..G..r",
        ".r...r.",
        "..rrr..",
    ], {**RED, **GOLD}),
    ("healing_light", "Luz sanadora", [
        "m.....m",
        ".m.M.m.",
        "...M...",
        ".MMWMM.",
        "...M...",
        ".m.M.m.",
        "m.....m",
    ], {**GREEN, "W": ("light", 0)}),
    ("circle", "Círculo de sanación", [
        "..mWm..",
        ".m...m.",
        "m.....m",
        "W..M..W",
        "m.....m",
        ".m...m.",
        "..mmm..",
    ], {**GREEN, "W": ("light", 0)}),
    # Effect passives that show on the strip (second combat wave): Shelter on the ally it covers, Weathered Hide's stacks.
    ("shelter", "Amparo", [
        "...b...",
        "..bBb..",
        ".bBBBb.",
        "bbbbbbb",
        ".rr.rr.",
        ".rRRRr.",
        "..rRr..",
    ], {**BLUE, **RED}),
    ("weathered_hide", "Piel curtida", [
        "..hhh..",
        "..hLh..",
        ".hhhhh.",
        ".hLLLh.",
        "hhhhhhh",
        "hLLLLLh",
        "hhhhhhh",
    ], {"h": ("leather", 3), "L": ("leather", 6)}),
    ("sanctuary", "Santuario", [
        ".......",
        "..ggg..",
        ".gGGGg.",
        ".g.w.g.",
        ".gwwwg.",
        ".g.w.g.",
        ".ggggg.",
    ], GOLD),
    ("smite", "Castigo", [
        "....GG.",
        "...GG..",
        "..GG...",
        ".GGGGG.",
        "...GG..",
        "..GG...",
        ".GG....",
    ], GOLD),
    ("battle_enrage", "Furia de batalla", [
        "...o...",
        "..oo...",
        "..oyo.o",
        ".oyyooo",
        ".oyYyo.",
        ".oyYyo.",
        "..ooo..",
    ], FIRE),
    # generic
    ("buff", "Efecto a favor (genérico)", [
        ".......",
        "...W...",
        "..WMW..",
        ".WM.MW.",
        "WM...MW",
        "M.....M",
        ".......",
    ], GREEN),
    ("debuff", "Efecto en contra (genérico)", [
        ".......",
        "r.....r",
        "Rr...rR",
        ".Rr.rR.",
        "..RrR..",
        "...R...",
        ".......",
    ], RED),
    ("bleed", "Sangrado", [
        "...r...",
        "..rRr..",
        ".rRRRr.",
        ".rRRRr.",
        "..rrr..",
        ".......",
        "r..r..r",
    ], RED),
    ("slow", "Lento (grillete)", [
        ".aaa...",
        "a...a..",
        "a...aAA",
        ".aaaA.A",
        "...A..A",
        "...A..A",
        "....AA.",
    ], STEEL),
    ("wound", "Herida mortal", [
        "v..v..v",
        "V..V..V",
        "V..V..V",
        ".V..V..",
        ".V..V.V",
        ".v..v.V",
        "......v",
    ], PURPLE),
    ("respawn", "Reapareciendo", [
        "BBBBBBB",
        ".B...B.",
        "..BwB..",
        "...B...",
        "..B.B..",
        ".BwwwB.",
        "BBBBBBB",
    ], {**BLUE, **GOLD}),
]


def signs() -> list[tuple[str, str, Image.Image]]:
    return [(f"hud_s_m_{stem}", label, px(rows, legend)) for stem, label, rows, legend in SIGNS]


def build() -> list[dict]:
    return [
        {"key": "striphud_bars", "title": "HUD de la tira · barras", "note": "Carcasas y rellenos de las barras que van sobre los personajes: el juego estira el relleno dentro del hueco.",
         "items": bars()},
        {"key": "striphud_chips", "title": "HUD de la tira · fichas", "note": "Marco de 9×9 alrededor de un signo de 7×7: dorado a favor, rojo en contra; acero, oro o verde para una habilidad.",
         "items": chips()},
        {"key": "striphud_signs", "title": "HUD de la tira · signos de 7×7", "note": "Un signo por habilidad, con la misma idea y color que su signo grande, y los genéricos.",
         "items": signs()},
    ]
