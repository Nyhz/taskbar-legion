"""Interface glyphs, 16×16: the small pixel-art signs the panels use instead of words — a crest per class, the tabs
of the hero panel, gold, experience, gear power, and the buttons of the stash. Asked for by the user: "más
iconitos pixel art… menos textos descriptivos upfront". Same recipe as the stat glyphs (`s80_stats.sprite`): a
14×14 drawing with a dark outline, one hue family each.
"""
from __future__ import annotations

from ..icons import Icon
from .s80_stats import sprite

E = ".............."


def crest_knight() -> Icon:  # a blue heater shield with a gold cross
    return sprite([
        E,
        ".bbbbbbbbbbbb.",
        ".bLBBBggBBBBb.",
        ".bLBBBggBBBBb.",
        ".bLBBBggBBBBb.",
        ".bggggggggggb.",
        ".bggggggggggb.",
        ".bBBBBggBBBDb.",
        ".bBBBBggBBBDb.",
        "..bBBBggBBDb..",
        "..bBBBggBBDb..",
        "...bBBggBDb...",
        "....bbggbb....",
        "......bb......",
    ], {"b": ("azure", 2), "B": ("azure", 5), "L": ("azure", 7), "D": ("azure", 3), "g": ("brass", 5)})


def crest_ranger() -> Icon:  # a drawn bow, the arrow on the string
    return sprite([
        E,
        ".....mmml.....",
        "...mm...l.....",
        "..mM....l.....",
        ".mM.....l...w.",
        ".mM.....l..ww.",
        ".mM.aaaaaaawww",
        ".mM.....l..ww.",
        ".mM.....l...w.",
        "..mM....l.....",
        "...mm...l.....",
        ".....mmml.....",
        E,
        E,
    ], {"m": ("moss", 4), "M": ("moss", 6), "l": ("bone", 6), "a": ("leather", 5), "w": ("ink", 8)})


def crest_priest() -> Icon:  # her lantern, alight
    return sprite([
        "......gg......",
        ".....g..g.....",
        "......gg......",
        "....gggggg....",
        "...gyyyyyyg...",
        "...gyywwyyg...",
        "...gywwwwyg...",
        "...gywwwwyg...",
        "...gyywwyyg...",
        "...gyyyyyyg...",
        "....gggggg....",
        ".....dggd.....",
        E,
        E,
    ], {"g": ("brass", 4), "d": ("brass", 3), "y": ("brass", 6), "w": ("light", 0)})


def tab_gear() -> Icon:  # a cuirass on its stand
    return sprite([
        E,
        "..ss......ss..",
        ".sSSs.ss.sSSs.",
        ".sWSssSSssSDs.",
        "..sWSSSSSSDs..",
        "..sWSSwSSSDs..",
        "..sWSSwSSSDs..",
        "...sSSSSSDs...",
        "...sSSSSSDs...",
        "...sbbbbbbs...",
        "..ssSSSSSDss..",
        "..sSSS..SSDs..",
        E,
        E,
    ], {"s": ("ink", 3), "S": ("ink", 6), "W": ("ink", 8), "D": ("ink", 4), "w": ("ink", 9), "b": ("brass", 5)})


def tab_talents() -> Icon:  # three nodes joined: a branch of the tree
    return sprite([
        E,
        "......gg......",
        ".....gyyg.....",
        ".....gyyg.....",
        "......gg......",
        "......ll......",
        "..llllllllll..",
        "..l........l..",
        ".gg........gg.",
        "gyyg......gttg",
        "gyyg......gttg",
        ".gg........gg.",
        E,
        E,
    ], {"g": ("brass", 3), "y": ("brass", 6), "t": ("ink", 4), "l": ("ink", 6)})


def tab_skills() -> Icon:  # a four-pointed spark
    return sprite([
        E,
        "......tt......",
        "......tt......",
        ".....tTTt.....",
        "....tTwwTt....",
        "..ttTwwwwTtt..",
        "ttTTwwwwwwTTtt",
        "ttTTwwwwwwTTtt",
        "..ttTwwwwTtt..",
        "....tTwwTt....",
        ".....tTTt.....",
        "......tt......",
        "......tt......",
        E,
    ], {"t": ("sea", 4), "T": ("sea", 6), "w": ("sea", 8)})


def ui_gold() -> Icon:  # a coin
    return sprite([
        E,
        "....gggggg....",
        "...gyyyyyyg...",
        "..gywwyyyydg..",
        "..gywyyddydg..",
        "..gyyydyyydg..",
        "..gyyyddyydg..",
        "..gyyyydyydg..",
        "..gyyddyyddg..",
        "..gyyyyyyddg..",
        "...gddddddg...",
        "....gggggg....",
        E,
        E,
    ], {"g": ("brass", 2), "y": ("brass", 5), "w": ("brass", 7), "d": ("brass", 4)})


def ui_xp() -> Icon:  # a blue star
    return sprite([
        E,
        "......bb......",
        "......bb......",
        ".....bBBb.....",
        "bbbbbBBBBbbbbb",
        ".bBBBBwBBBBDb.",
        "..bBBwwBBBDb..",
        "...bBBBBBDb...",
        "...bBBBBBDb...",
        "..bBBBbbBBDb..",
        "..bBBb..bBDb..",
        ".bBb......bDb.",
        ".bb........bb.",
        E,
    ], {"b": ("azure", 3), "B": ("azure", 5), "w": ("azure", 8), "D": ("azure", 4)})


def ui_power() -> Icon:  # an anvil: what the gear is worth
    return sprite([
        E,
        E,
        E,
        "aaaaaaaaaaaa..",
        ".awwwwwwwwwAa.",
        "..aaAAAAAADa..",
        "....aAAAAa....",
        "....aAAADa....",
        "...aAAAAADa...",
        "..aAAAAAAADa..",
        "..aaaaaaaaaa..",
        E,
        E,
        E,
    ], {"a": ("ink", 3), "A": ("ink", 6), "w": ("ink", 8), "D": ("ink", 4)})


def btn_open() -> Icon:  # a chest with its lid up and light inside
    return sprite([
        E,
        "..llllllllll..",
        ".lLLLLLLLLLLl.",
        ".lLLLLLLLLLLl.",
        ".llllllllllll.",
        ".yywwyywwyyww.",
        ".cccccccccccc.",
        ".cCCCCggCCCDc.",
        ".cCCCCggCCCDc.",
        ".cCCCCCCCCCDc.",
        ".cccccccccccc.",
        E,
        E,
        E,
    ], {"l": ("leather", 3), "L": ("leather", 5), "y": ("brass", 6), "w": ("light", 0), "c": ("leather", 2), "C": ("leather", 4), "D": ("leather", 3), "g": ("brass", 5)})


def btn_sort() -> Icon:  # bars from long to short
    return sprite([
        E,
        ".kkkkkkkkkkkk.",
        ".kkkkkkkkkkkk.",
        E,
        ".kkkkkkkkk....",
        ".kkkkkkkkk....",
        E,
        ".kkkkkk.......",
        ".kkkkkk.......",
        E,
        ".kkk..........",
        ".kkk..........",
        E,
        E,
    ], {"k": ("ink", 8)})


def btn_sell() -> Icon:  # coins leaving: an arrow out of a stack
    return sprite([
        E,
        "........rr....",
        "........rRr...",
        "....rrrrrRRr..",
        "....rRRRRRRRr.",
        "....rrrrrRRr..",
        "........rRr...",
        ".gggggg.rr....",
        "gyyyyyyg......",
        "gddddddg......",
        "gyyyyyyg......",
        "gddddddg......",
        ".gggggg.......",
        E,
    ], {"r": ("crimson", 3), "R": ("crimson", 5), "g": ("brass", 2), "y": ("brass", 6), "d": ("brass", 4)})


def ui_up() -> Icon:  # better than what is worn
    return sprite([
        E,
        "......gg......",
        ".....gGGg.....",
        "....gGGGGg....",
        "...gGGGGGGg...",
        "..gggGGGGggg..",
        "....gGGGGg....",
        "....gGGGGg....",
        "....gGGGGg....",
        "....gggggg....",
        E,
        E,
        E,
        E,
    ], {"g": ("moss", 3), "G": ("moss", 6)})


def ui_gem() -> Icon:  # a set gem: what a socket holds
    return sprite([
        E,
        E,
        "....rrrrrr....",
        "...rRRRRRRr...",
        "..rRwRRRRRDr..",
        ".rRwRRRRRRDDr.",
        ".rRRRRRRRDDDr.",
        "..rRRRRRDDDr..",
        "...rRRRDDDr...",
        "....rRDDDr....",
        ".....rDDr.....",
        "......rr......",
        E,
        E,
    ], {"r": ("crimson", 3), "R": ("crimson", 5), "w": ("crimson", 7), "D": ("crimson", 4)})


def ui_all() -> Icon:  # every class: three small shields
    return sprite([
        E,
        E,
        "..bbb....mmm..",
        ".bBBBb..mMMMm.",
        ".bBBBb..mMMMm.",
        "..bBb....mMm..",
        "...b......m...",
        ".....ggg......",
        "....gyyyg.....",
        "....gyyyg.....",
        ".....gyg......",
        "......g.......",
        E,
        E,
    ], {"b": ("azure", 3), "B": ("azure", 5), "m": ("moss", 3), "M": ("moss", 5), "g": ("brass", 3), "y": ("brass", 6)})


GLYPHS = [
    ("crest_knight", "Emblema del Knight", crest_knight), ("crest_ranger", "Emblema del Ranger", crest_ranger), ("crest_priest", "Emblema de la Priest", crest_priest),
    ("ui_all", "Todas las clases", ui_all),
    ("tab_gear", "Pestaña de equipo", tab_gear), ("tab_talents", "Pestaña de talentos", tab_talents), ("tab_skills", "Pestaña de habilidades", tab_skills),
    ("ui_gold", "Oro", ui_gold), ("ui_xp", "Experiencia", ui_xp), ("ui_power", "Poder de equipo", ui_power), ("ui_up", "Mejora", ui_up), ("ui_gem", "Gema engastada", ui_gem),
    ("btn_open", "Abrir cofres", btn_open), ("btn_sort", "Ordenar", btn_sort), ("btn_sell", "Vender", btn_sell),
]


def build() -> list[dict]:
    return [{
        "key": "ui",
        "title": "Glifos de interfaz",
        "note": "Signos de 16 × 16 que la interfaz usa en lugar de palabras: emblemas de clase, pestañas, oro, experiencia y botones.",
        "items": [(key, name, fn().image()) for key, name, fn in GLYPHS],
    }]
