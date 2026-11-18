"""The hero panel's bag and the stash: the signs the completed mock-up needed — the bag itself, buying a slot,
sending the gems away, the stash filters, the full-stats tab, the gear-quality arrows, the two presets' farm sign,
recruiting — and the bookmark that sticks out of the TOP of the hero window, one per place in the party.
"""
from __future__ import annotations

from PIL import Image

from ..icons import Icon
from ..rig import Cel, Tone
from .s80_stats import sprite

E = ".............."


def pack() -> Icon:  # a backpack: the bag the heroes dress from
    return sprite([
        E,
        ".....llll.....",
        "....l....l....",
        "...llllllll...",
        "..lLLLLLLLLl..",
        "..lLWLLLLLDl..",
        "..lLLLLLLLDl..",
        "..lccccccccl..",
        "..lLLLggLLDl..",
        "..lLLLggLLDl..",
        "..lLLLLLLLDl..",
        "...llllllll...",
        E,
        E,
    ], {"l": ("leather", 2), "L": ("leather", 5), "W": ("leather", 7), "D": ("leather", 3), "c": ("leather", 2), "g": ("brass", 5)})


def gems_out() -> Icon:  # a gem dropping into a chest: send every gem to the stash
    return sprite([
        "......r.......",
        ".....rRr......",
        "....rRWRr.....",
        ".....rRr......",
        "......r.......",
        "......a.......",
        "....aaaaa.....",
        ".....aaa......",
        "......a.......",
        ".ccccccccccc..",
        ".cLLLLgLLLLc..",
        ".cCCCCgCCCCc..",
        ".ccccccccccc..",
        E,
    ], {"r": ("crimson", 3), "R": ("crimson", 5), "W": ("crimson", 7), "a": ("ink", 8), "c": ("leather", 2), "L": ("leather", 6), "C": ("leather", 4), "g": ("brass", 6)})


def farm() -> Icon:  # the everyday preset: round and round for the loot — a looping arrow round a gold coin
    # (2026-11-18, in the ear of wheat's place: «eso es farm literal»)
    return sprite([
        E,
        "...aaaaaa.A...",
        "..aAAAAAAaAA..",
        ".aA......AAA..",
        "aA......AAAA..",
        "aA..ggg.......",
        "aA.gYYYg......",
        "...gYwYg...Aa.",
        "...gYYYg...Aa.",
        "....ggg....Aa.",
        "..AAAA....Aa..",
        "..AAA....aAa..",
        "..AA.aAAAAa...",
        "...A.aaaaa....",
    ], {"a": ("ink", 6), "A": ("ink", 8), "g": ("brass", 3), "Y": ("brass", 5), "w": ("brass", 7)})


def down() -> Icon:  # under-geared for this stage
    return sprite([
        E,
        E,
        "....rrrrrr....",
        "....rRRRRr....",
        "....rRRRRr....",
        "....rRRRRr....",
        "..rrrRRRRrrr..",
        "...rRRRRRRr...",
        "....rRRRRr....",
        ".....rRRr.....",
        "......rr......",
        E,
        E,
        E,
    ], {"r": ("crimson", 3), "R": ("crimson", 5)})


def even() -> Icon:  # gear on level for this stage
    return sprite([
        E,
        E,
        E,
        E,
        E,
        "..gggggggggg..",
        "..gGGGGGGGGg..",
        "..gGGGGGGGGg..",
        "..gggggggggg..",
        E,
        E,
        E,
        E,
        E,
    ], {"g": ("brass", 3), "G": ("brass", 5)})


def f_all() -> Icon:  # everything: four cells
    return sprite([
        E,
        ".aaaaa..aaaaa.",
        ".aAAAa..aAAAa.",
        ".aAAAa..aAAAa.",
        ".aAAAa..aAAAa.",
        ".aaaaa..aaaaa.",
        E,
        E,
        ".aaaaa..aaaaa.",
        ".aAAAa..aAAAa.",
        ".aAAAa..aAAAa.",
        ".aAAAa..aAAAa.",
        ".aaaaa..aaaaa.",
        E,
    ], {"a": ("ink", 4), "A": ("ink", 7)})


def f_jewel() -> Icon:  # jewellery: a ring with its stone
    return sprite([
        E,
        "......vv......",
        ".....vVVv.....",
        "......vv......",
        "....gggggg....",
        "...gG....Gg...",
        "..gG......Gg..",
        "..gG......Gg..",
        "..gG......Gg..",
        "...gG....Gg...",
        "....gggggg....",
        E,
        E,
        E,
    ], {"g": ("brass", 3), "G": ("brass", 6), "v": ("violet", 4), "V": ("violet", 7)})


def sheet() -> Icon:  # the full sheet: every stat, one line each
    return sprite([
        E,
        ".rr.wwwwwwww..",
        ".rr.wwwwwwww..",
        E,
        ".bb.wwwwww....",
        ".bb.wwwwww....",
        E,
        ".gg.wwwwwwww..",
        ".gg.wwwwwwww..",
        E,
        ".yy.wwwww.....",
        ".yy.wwwww.....",
        E,
        E,
    ], {"r": ("crimson", 5), "b": ("azure", 5), "g": ("moss", 5), "y": ("brass", 5), "w": ("ink", 7)})


def recruit() -> Icon:  # a free place in the party
    return sprite([
        E,
        E,
        ".....gggg.....",
        ".....gGGg.....",
        ".....gGGg.....",
        "..ggggGGgggg..",
        "..gGGGGGGGGg..",
        "..gGGGGGGGGg..",
        "..ggggGGgggg..",
        ".....gGGg.....",
        ".....gGGg.....",
        ".....gggg.....",
        E,
        E,
    ], {"g": ("brass", 2), "G": ("brass", 4)})


def place(on: bool) -> Image.Image:
    """36×19: a bookmark that sticks out of the hero window's TOP edge, one per place in the party. Open at the
    bottom; the lit one is brass-edged and takes the window's colour, which it overlaps."""
    w, h = 36, 19
    c = Cel(w, h)
    edge: Tone = ("brass", 4) if on else ("ink", 3)
    body: Tone = ("ink", 1) if on else ("ink", 2)
    for y in range(h):
        for x in range(w):
            ex = min(x, w - 1 - x)
            if y == 0 and ex == 0:
                continue  # the top corners are cut
            if ex == 0 or y == 0 or (ex == 1 and y == 1):
                c.put(x, y, ("ink", 0))
            elif y == 1 or (on and ex == 1):
                c.put(x, y, edge)
            else:
                c.put(x, y, body)
    if on:
        c.put(2, 2, ("brass", 6))
    return c.image()


def buy_cell() -> Image.Image:
    """36×36: the next slot you can buy — a dashed well with a brass cross."""
    c = Cel(36, 36)
    for i in range(36):
        if (i // 3) % 2 == 0:
            for x, y in ((i, 0), (i, 35), (0, i), (35, i)):
                c.put(x, y, ("brass", 3))
    for i in range(12, 24):
        for t in (17, 18):
            c.put(i, t, ("brass", 4))
            c.put(t, i, ("brass", 4))
    return c.image()


def build() -> list[dict]:
    signs = [
        ("bag_pack", "Bolsa", pack()), ("bag_gems_out", "Guardar las gemas", gems_out()), ("bag_farm", "Preajuste de diario", farm()),
        ("bag_down", "Equipo por debajo de la etapa", down()), ("bag_even", "Equipo a la altura de la etapa", even()),
        ("bag_f_all", "Todo", f_all()), ("bag_f_jewel", "Joyas", f_jewel()), ("bag_sheet", "Hoja de estadísticas", sheet()),
        ("bag_recruit", "Reclutar", recruit()),
    ]
    return [{
        "key": "bag",
        "title": "Bolsa y alijo · signos",
        "note": "Lo que le faltaba a la maqueta del panel de héroe para cubrir el juego real: la bolsa, comprar un hueco, guardar las gemas, los filtros del alijo, la hoja completa, la calidad del equipo y las plazas del grupo.",
        "items": [(stem, name, ic.image()) for stem, name, ic in signs]
        + [("bag_place", "Plaza del grupo", place(False)), ("bag_place_on", "Plaza elegida", place(True)), ("bag_buy_cell", "Hueco por comprar", buy_cell())],
    }]
