"""Signs of the WAVE ENEMIES for the interface and the strip's chips (the enemies' own art lives in
`fx/foes.py`; these are the pieces the interface needs as files of its own):

  map_aura_*       the six auras of a Support, for the difficulty tooltip of the map — the very drawing it wears
                   over its head on the strip (`fx/foes.py` `aura_*`), rendered from the same code so the two never
                   drift apart
  hud_s_m_tremor   the 7×7 mini sign of Temblor (a brute's area blow, Eternal on) for the chip over a shaken hero:
                   the ground split, the shock still going out over it
"""
from __future__ import annotations

from PIL import Image

from ..fx import foes
from ..rig import Cel
from .s9f_striphud import px

AURAS = [
    ("toughness", "Aguante", foes.aura_toughness),
    ("fury", "Furia", foes.aura_fury),
    ("vigor", "Vigor", foes.aura_vigor),
    ("aegis", "Égida", foes.aura_aegis),
    ("malice", "Saña", foes.aura_malice),
    ("enchant", "Armas encantadas", foes.aura_enchant),
]


def _aura(draw) -> Image.Image:
    cel = Cel(9, 9)
    draw(cel, 0, 0.0)
    return cel.image()


#: A pale slab of ground with ONE black crack running down it, and the jolt flying off its top corners: the
#: crack is the darkest thing on the chip and the ground the lightest (the first drawing — dark cracks on mid
#: brown — read as a dark blot).
TREMOR = [
    "w.....w",
    ".w.k.w.",
    "LLLkLLL",
    "ggkkggg",
    "gggkkgg",
    "ggkkggg",
    "ddkdddd",
]


def build() -> list[dict]:
    return [
        {"key": "foe_auras", "title": "Auras del Apoyo (interfaz)", "note": "El mismo dibujo que lleva sobre la cabeza en la tira, para el tooltip de dificultad del mapa.",
         "items": [(f"map_aura_{key}", name, _aura(draw)) for key, name, draw in AURAS]},
        {"key": "foe_minis", "title": "Fichas de enemigos (7×7)", "note": "Temblor: una losa clara partida por una grieta negra, y la sacudida saltando de sus esquinas.",
         "items": [("hud_s_m_tremor", "Temblor", px(TREMOR, {"w": ("light", 0), "L": ("bone", 7), "g": ("bone", 5), "d": ("bone", 3), "k": ("ink", 0)}))]},
    ]
