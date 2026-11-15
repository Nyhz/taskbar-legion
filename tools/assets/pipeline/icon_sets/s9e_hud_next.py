"""The strip's "go forward" sign: an arrow to the next stage, shown over the Retry sign while the party stands on
a stage whose next one is already open (it fell back after a defeat, or travelled back to farm) — one click goes
on, without opening the hero window and the map.
"""
from __future__ import annotations

from ..icons import Icon
from .s80_stats import sprite

E = ".............."


def go_next() -> Icon:  # a broad arrow pointing the way the party walks
    return sprite([
        E,
        "......aa......",
        "......aHa.....",
        "......aAHa....",
        ".aaaaaaAAHa...",
        ".aHHHHHAAAHa..",
        ".aAAAAAAAAAAa.",
        ".aAAAAAAAADa..",
        ".aaaaaaAADa...",
        "......aADa....",
        "......aDa.....",
        "......aa......",
        E,
        E,
    ], {"a": ("brass", 1), "A": ("brass", 5), "H": ("brass", 7), "D": ("brass", 3)})


def build() -> list[dict]:
    return [
        {"key": "hud_next", "title": "Signo de avanzar", "note": "Sobre el signo de Reintentar: ir a la etapa siguiente cuando ya está abierta.",
         "items": [("hud_next", "Avanzar a la etapa siguiente", go_next().image())]},
    ]
