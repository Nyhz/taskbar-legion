"""The Cube, second pass: the signs of its three recipes as they sit beside their names on the tabs (several small
things becoming one better thing; a flame over a coin; one thing swapped for another), and the tick box of its
labelled switches. The first pass (`s93_pets_cube.py`) keeps the Cube's face, arrows, rarity pips and result frames.
"""
from __future__ import annotations

from PIL import Image

from ..icons import Icon
from .s80_stats import sprite
from .s95_chrome import _cel

E = ".............."


def synth() -> Icon:  # three small pieces under an arrow up: several become one better
    return sprite([
        E,
        "......gg......",
        ".....gGGg.....",
        "....gGGGGg....",
        "...gggGGggg...",
        ".....gGGg.....",
        ".....gGGg.....",
        ".....gggg.....",
        E,
        ".vvv..vvv..vvv",
        ".vVv..vVv..vVv",
        ".vvv..vvv..vvv",
        E,
        E,
    ], {"g": ("brass", 3), "G": ("brass", 6), "v": ("violet", 4), "V": ("violet", 7)})


def melt() -> Icon:  # a flame over a coin: pieces into gold
    return sprite([
        "......r.......",
        ".....rRr......",
        ".....rRRr.....",
        "....rRYRr.....",
        "....rRYYRr....",
        "....rRYYRr....",
        ".....rRRr.....",
        E,
        "...gggggggg...",
        "..gGGGGGGGGg..",
        "..gGGGGGGGGg..",
        "...gggggggg...",
        E,
        E,
    ], {"r": ("crimson", 3), "R": ("crimson", 5), "Y": ("brass", 6), "g": ("brass", 3), "G": ("brass", 5)})


def swap() -> Icon:  # two arrows passing each other: one affix for another
    return sprite([
        E,
        "........tt....",
        ".........tt...",
        ".tttttttttttt.",
        ".tttttttttttt.",
        ".........tt...",
        "........tt....",
        "....rr........",
        "...rr.........",
        ".rrrrrrrrrrrr.",
        ".rrrrrrrrrrrr.",
        "...rr.........",
        "....rr........",
        E,
    ], {"t": ("sea", 6), "r": ("dusk", 7)})


def tick(on: bool) -> Image.Image:  # an 11×11 tick box
    rows = [
        "kkkkkkkkkkk",
        "kdddddddddk",
        "kd.......dk",
        "kd......Gdk",
        "kd.....GGdk",
        "kdG...GG.dk",
        "kdGG.GG..dk",
        "kd.GGG...dk",
        "kd..G....dk",
        "kdddddddddk",
        "kkkkkkkkkkk",
    ]
    if not on:
        rows = [r.replace("G", ".") for r in rows]
    return _cel([r.replace(".", "b") for r in rows], {"k": ("ink", 0), "d": ("ink", 5 if on else 4), "b": ("ink", 1), "G": ("brass", 6)}).image()


def build() -> list[dict]:
    return [{
        "key": "cube2",
        "title": "El Cubo · signos de receta",
        "note": "Los signos que acompañan al nombre de cada receta en su pestaña, y la casilla de los interruptores con rótulo.",
        "items": [
            ("cube2_synth", "Sintetizar", synth().image()), ("cube2_melt", "Fundir", melt().image()), ("cube2_swap", "Transfigurar", swap().image()),
            ("cube2_tick_on", "Casilla marcada", tick(True)), ("cube2_tick_off", "Casilla sin marcar", tick(False)),
        ],
    }]
