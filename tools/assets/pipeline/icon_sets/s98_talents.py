"""The talents tab: node frames (a round seal for a passive, a square plate for an ability, a teal plate for an
ability modifier, an octagon for a specialisation's ultimate), the Knight's five ability signs, the signs of his two
specialisations, the talent point and the "choose one" link.

The ability signs are stand-ins for the mock-up: the real ability icons come with the redesign of the kits.
"""
from __future__ import annotations

import math

from PIL import Image

from ..icons import Icon
from ..rig import Cel, Tone
from .s80_stats import sprite
from .s95_chrome import _cel

E = ".............."


def disc(ring: Tone, fill: Tone, lit: Tone | None = None) -> Image.Image:
    """22×22 seal: an outline, a ring one pixel wide, a dark face. `lit` brightens the ring's upper left."""
    n, c, r = 22, 10.5, 10.5
    cel = Cel(n, n)
    for y in range(n):
        for x in range(n):
            d = math.hypot(x - c, y - c)
            if d > r + 0.2:
                continue
            if d > r - 1.0:
                cel.put(x, y, ("ink", 0))
            elif d > r - 2.2:
                cel.put(x, y, lit if lit and (x + y) < n - 2 else ring)
            else:
                cel.put(x, y, fill)
    return cel.image()


def plate(n: int, ring: Tone, fill: Tone, lit: Tone | None = None, cut: int = 2) -> Image.Image:
    """An n×n plate with its corners cut by `cut` pixels: outline, ring, face."""
    cel = Cel(n, n)
    for y in range(n):
        for x in range(n):
            ex, ey = min(x, n - 1 - x), min(y, n - 1 - y)
            diag = ex + ey
            if diag < cut:
                continue
            edge = min(ex, ey, diag - cut)
            if edge == 0:
                cel.put(x, y, ("ink", 0))
            elif edge == 1:
                cel.put(x, y, lit if lit and (x + y) < n - 1 else ring)
            else:
                cel.put(x, y, fill)
    return cel.image()


def stone_skin() -> Icon:  # a cracked boulder
    return sprite([
        E,
        "....aaaaaa....",
        "...aAAAAAWa...",
        "..aAAAkAAAWa..",
        ".aAAAAkAAAAAa.",
        ".aAAAkkAAAAAa.",
        ".aAAkAAAkAADa.",
        ".aAAAAAAkADDa.",
        ".aAAAAAkADDDa.",
        "..aAAADDDDDa..",
        "...aADDDDDa...",
        "....aaaaaa....",
        E,
        E,
    ], {"a": ("ink", 3), "A": ("ink", 6), "W": ("ink", 8), "D": ("ink", 4), "k": ("ink", 1)})


def cleave() -> Icon:  # a red crescent: one sweeping blow
    return sprite([
        E,
        "......rrrrr...",
        "....rrRRRRRr..",
        "...rRRWWWRr...",
        "..rRWWrrr.....",
        ".rRWWr........",
        ".rRWr.........",
        ".rRWr.........",
        ".rRWWr........",
        "..rRWWrrr.....",
        "...rRRWWWRr...",
        "....rrRRRRRr..",
        "......rrrrr...",
        E,
    ], {"r": ("crimson", 3), "R": ("crimson", 5), "W": ("crimson", 7)})


def bulwark() -> Icon:  # a tower shield
    return sprite([
        E,
        "..bbbbbbbbbb..",
        "..bLBBBBBBDb..",
        "..bLBBggBBDb..",
        "..bLBgGGgBDb..",
        "..bLBgGGgBDb..",
        "..bLBBggBBDb..",
        "..bLBBBBBBDb..",
        "..bLBBBBBBDb..",
        "...bLBBBBDb...",
        "....bLBBDb....",
        ".....bbbb.....",
        E,
        E,
    ], {"b": ("azure", 2), "B": ("azure", 5), "L": ("azure", 7), "D": ("azure", 3), "g": ("brass", 4), "G": ("brass", 6)})


def battle_cry() -> Icon:  # a horn and its call
    return sprite([
        E,
        "..........w...",
        ".ll........w..",
        ".lLll...w...w.",
        ".lLLLll..w..w.",
        ".lLLLLLl.w..w.",
        ".lLLLLLl.w..w.",
        ".lLLLll..w..w.",
        ".lLll...w...w.",
        ".ll........w..",
        "..........w...",
        E,
        E,
        E,
    ], {"l": ("brass", 3), "L": ("brass", 5), "w": ("ink", 9)})


def bloodlust() -> Icon:  # a drop of blood
    return sprite([
        E,
        "......rr......",
        "......rr......",
        ".....rRRr.....",
        ".....rRRr.....",
        "....rRRRRr....",
        "...rRRRRRRr...",
        "..rRWRRRRRRr..",
        "..rRWRRRRRDr..",
        "..rRRRRRRDDr..",
        "...rRRRRDDr...",
        "....rrrrrr....",
        E,
        E,
    ], {"r": ("crimson", 2), "R": ("crimson", 4), "W": ("crimson", 7), "D": ("crimson", 3)})


def bastion() -> Icon:  # a keep: the specialisation that protects
    return sprite([
        E,
        "..aa.aaaa.aa..",
        "..aAaaAAaaAa..",
        "..aAAAAAAAAa..",
        "..aWAAAAAADa..",
        "...aWAAAADa...",
        "...aWAkkADa...",
        "...aWAkkADa...",
        "...aWAAAADa...",
        "...aWAAAADa...",
        "..aWAAAAAADa..",
        "..aaaaaaaaaa..",
        E,
        E,
    ], {"a": ("ink", 3), "A": ("ink", 6), "W": ("ink", 8), "D": ("ink", 4), "k": ("ink", 0)})


def scourge() -> Icon:  # a flail: the specialisation that punishes
    return sprite([
        ".......a..a...",
        "......aAAAAa..",
        ".....aAWAAAAa.",
        ".....aAAAAAAa.",
        "......aAAAAa..",
        ".....a.aAAa.a.",
        "....c...aa....",
        "...c..........",
        "..c...........",
        ".ll...........",
        "lLLl..........",
        "lLl...........",
        "ll............",
        E,
    ], {"a": ("ink", 3), "A": ("ink", 6), "W": ("ink", 9), "c": ("ink", 7), "l": ("leather", 3), "L": ("leather", 5)})


def point() -> Icon:  # a talent point: a gold spark
    return sprite([
        E,
        "......gg......",
        "......gg......",
        ".....gGGg.....",
        "....gGwwGg....",
        "..ggGwwwwGgg..",
        "ggGGwwwwwwGGgg",
        "ggGGwwwwwwGGgg",
        "..ggGwwwwGgg..",
        "....gGwwGg....",
        ".....gGGg.....",
        "......gg......",
        "......gg......",
        E,
    ], {"g": ("brass", 3), "G": ("brass", 5), "w": ("brass", 7)})


def crown() -> Icon:  # the ultimate at the end of a branch
    return sprite([
        E,
        E,
        ".g....gg....g.",
        ".gg..gGGg..gg.",
        ".gGg.gGGg.gGg.",
        ".gGGgGGGGgGGg.",
        ".gGGGGGGGGGGg.",
        ".gGGrGGbGGrGg.",
        ".gGGGGGGGGGGg.",
        ".gggggggggggg.",
        E,
        E,
        E,
        E,
    ], {"g": ("brass", 3), "G": ("brass", 6), "r": ("crimson", 4), "b": ("azure", 5)})


def respec() -> Icon:  # undo: take every point back
    return sprite([
        E,
        "....a.........",
        "...aAa........",
        "..aAAaaaaa....",
        ".aAAAAAAAAa...",
        "..aAAaaaaAAa..",
        "...aAa...aAAa.",
        "....a.....aAa.",
        "..........aAa.",
        ".........aAAa.",
        "....aaaaaAAa..",
        "....aAAAAAa...",
        "....aaaaaa....",
        E,
    ], {"a": ("ink", 4), "A": ("ink", 8)})


def either() -> Image.Image:  # 5×5: the link between two nodes of which only one can be taken
    return _cel(["..g..", ".gGg.", "gGGGg", ".gGg.", "..g.."], {"g": ("brass", 3), "G": ("brass", 6)}).image()


def plus() -> Image.Image:  # 7×7 badge: this node changes an ability
    return _cel([".kkkkk.", "kkkWkkk", "kkkWkkk", "kWWWWWk", "kkkWkkk", "kkkWkkk", ".kkkkk."], {"k": ("sea", 2), "W": ("sea", 8)}).image()


def build() -> list[dict]:
    signs = [
        ("tal_stone_skin", "Piel de piedra", stone_skin()), ("tal_cleave", "Tajo debilitante", cleave()), ("tal_bulwark", "Baluarte", bulwark()),
        ("tal_battle_cry", "Grito de guerra", battle_cry()), ("tal_bloodlust", "Sed de sangre", bloodlust()),
        ("tal_bastion", "Bastión", bastion()), ("tal_scourge", "Azote", scourge()), ("tal_point", "Punto de talento", point()),
        ("tal_crown", "Definitiva", crown()), ("tal_respec", "Devolver puntos", respec()),
    ]
    frames = [
        ("tal_seal_off", "Pasiva sin puntos", disc(("ink", 3), ("ink", 0))),
        ("tal_seal_on", "Pasiva con puntos", disc(("brass", 3), ("ink", 1), ("brass", 5))),
        ("tal_seal_max", "Pasiva completa", disc(("brass", 5), ("ink", 2), ("brass", 7))),
        ("tal_plate_off", "Habilidad sin aprender", plate(24, ("ink", 4), ("ink", 0))),
        ("tal_plate_on", "Habilidad aprendida", plate(24, ("brass", 3), ("ink", 1), ("brass", 5))),
        ("tal_plate_max", "Habilidad completa", plate(24, ("brass", 5), ("ink", 2), ("brass", 7))),
        ("tal_mod_off", "Modificador sin tomar", plate(24, ("sea", 3), ("ink", 0), cut=5)),
        ("tal_mod_on", "Modificador tomado", plate(24, ("sea", 5), ("ink", 1), ("sea", 7), cut=5)),
        ("tal_ult_off", "Definitiva sin alcanzar", plate(30, ("violet", 4), ("ink", 0), cut=8)),
        ("tal_ult_on", "Definitiva", plate(30, ("brass", 5), ("violet", 2), ("brass", 7), cut=8)),
        ("tal_either", "Elige una", either()), ("tal_plus", "Cambia una habilidad", plus()),
    ]
    return [
        {"key": "talents", "title": "Talentos · signos", "note": "Las cinco habilidades del Knight (provisionales: los iconos definitivos llegan con el rediseño de los kits), sus dos especializaciones, el punto de talento y la definitiva.",
         "items": [(stem, name, ic.image()) for stem, name, ic in signs]},
        {"key": "talent_frames", "title": "Talentos · marcos de nodo", "note": "La forma dice qué es el nodo: sello redondo, pasiva; placa cuadrada, habilidad; placa verdemar de esquinas cortadas, modificador; octógono, definitiva.",
         "items": frames},
    ]
