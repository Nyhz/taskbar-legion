"""Marks for the 24×24 item cell (every slot in the game: gear, bag, stash): the empty well, the cell that buys
one more slot, the perfect-roll star, and the three class crests small enough for a cell's corner (a piece the
current hero cannot wear carries the crest of the class it belongs to).
"""
from __future__ import annotations

from PIL import Image

from ..rig import Cel
from .s95_chrome import _cel


def well() -> Image.Image:  # an empty cell, 24×24: sunk, darker than any frame
    c = Cel(24, 24)
    for y in range(24):
        for x in range(24):
            ring = min(x, y, 23 - x, 23 - y)
            c.put(x, y, ("ink", 2) if ring == 0 else ("ink", 0))
    for i in range(1, 23):
        c.put(i, 22, ("ink", 1))
        c.put(22, i, ("ink", 1))
    return c.image()


def buy() -> Image.Image:  # the cell that buys a slot, 24×24: a dashed brass edge and a plus
    c = Cel(24, 24)
    for i in range(24):
        if (i // 2) % 2 == 0:
            for x, y in ((i, 0), (i, 23), (0, i), (23, i)):
                c.put(x, y, ("brass", 3))
    for i in range(8, 16):
        for t in (11, 12):
            c.put(i, t, ("brass", 5))
            c.put(t, i, ("brass", 5))
    return c.image()


def star() -> Image.Image:  # 7×7: a perfect roll
    return _cel([
        "...k...",
        "..kYk..",
        "kkYWYkk",
        "kYWWWYk",
        ".kYWYk.",
        "kYkkkYk",
        "kk...kk",
    ], {"k": ("brass", 1), "Y": ("brass", 5), "W": ("light", 0)}).image()


def crest_knight() -> Image.Image:  # 9×9: the shield and its cross
    return _cel([
        "kkkkkkkkk",
        "kBBBgBBBk",
        "kBBBgBBBk",
        "kgggggggk",
        "kBBBgBBBk",
        "kBBBgBBBk",
        ".kBBgBBk.",
        "..kBgBk..",
        "...kkk...",
    ], {"k": ("azure", 0), "B": ("azure", 5), "g": ("brass", 5)}).image()


def crest_ranger() -> Image.Image:  # 9×9: an arrow, point up
    return _cel([
        "...kkk...",
        "..kwwwk..",
        ".kwwwwwk.",
        "kkkkwkkkk",
        "..kmwmk..",
        "..kmwmk..",
        "..kmwmk..",
        ".kMkwkMk.",
        ".kkkkkkk.",
    ], {"k": ("moss", 0), "w": ("bone", 6), "m": ("moss", 5), "M": ("moss", 6)}).image()


def crest_priest() -> Image.Image:  # 9×9: the lantern, alight
    return _cel([
        "..kkkkk..",
        ".kkgggkk.",
        ".kgggggk.",
        "kgyyyyygk",
        "kgywwwygk",
        "kgywwwygk",
        "kgyyyyygk",
        ".kgggggk.",
        "..kkkkk..",
    ], {"k": ("brass", 0), "g": ("brass", 4), "y": ("brass", 6), "w": ("light", 0)}).image()


def build() -> list[dict]:
    return [{
        "key": "marks",
        "title": "Marcas de casilla",
        "note": "Para la casilla de objeto de 24 × 24: el hueco vacío, la casilla que compra un hueco, la estrella de tirada perfecta y los tres emblemas de clase en pequeño.",
        "items": [
            ("mark_well", "Casilla vacía", well()), ("mark_buy", "Comprar un hueco", buy()), ("mark_star", "Tirada perfecta", star()),
            ("mark_crest_knight", "Emblema del Knight", crest_knight()), ("mark_crest_ranger", "Emblema del Ranger", crest_ranger()),
            ("mark_crest_priest", "Emblema de la Priest", crest_priest()),
        ],
    }]
