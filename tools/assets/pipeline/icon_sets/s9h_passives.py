"""The EFFECT passives of the second combat wave (docs/redesign/PROGRESS.md, «Combate, segunda ola», B): one sign
per passive, 16×16, and their FRAME — the role talent's seal with four points at a passive's size (22), so an
effect passive reads as kin to Vanguard and its like and is told apart from a plain "+X %" round seal by its shape
while the talents wing keeps its height.

Same recipe as the other glyphs (`s80_stats.sprite`): a 14×14 drawing with a dark outline. The drawings keep
clear of the four corners: the seal behind them is round. Names are provisional, like the nodes'.
"""
from __future__ import annotations

import math

from PIL import Image

from ..icons import Icon
from ..rig import Cel, Tone
from .s80_stats import sprite

E = ".............."

STEEL = {"a": ("ink", 3), "A": ("ink", 6), "S": ("ink", 9)}
BLUE = {"b": ("azure", 2), "B": ("azure", 5), "L": ("azure", 7), "D": ("azure", 3)}
RED = {"r": ("crimson", 2), "R": ("crimson", 5), "W": ("crimson", 7)}
GOLD = {"g": ("brass", 3), "G": ("brass", 6), "y": ("brass", 5), "Y": ("brass", 7)}
MINT = {"m": ("moss", 4), "M": ("moss", 7)}
WHITE = {"w": ("light", 0)}


# ── Knight ──────────────────────────────────────────────────────────────────────────────────────────────────
def guardian() -> Icon:  # a steel shield held over one small figure: he takes what was meant for it
    return sprite([
        "..aaaaaaaaaa..",
        "..aSAAAAAAAa..",
        "..aSAAGGAAAa..",
        "..aSAAGGAAAa..",
        "...aSAAAAAa...",
        "....aSAAAa....",
        ".....aaaa.....",
        E,
        "......mm......",
        ".....mMMm.....",
        "......mm......",
        "....mMMMMm....",
        "....mMMMMm....",
        ".....m..m.....",
    ], {**STEEL, **GOLD, **MINT})


def close_ranks() -> Icon:  # three shields rim to rim
    return sprite([
        E,
        E,
        "bbbbbbbbbbbbb.",
        "bLBDbLBDbLBDb.",
        "bLBDbLBDbLBDb.",
        "bLGDbLGDbLGDb.",
        "bLBDbLBDbLBDb.",
        "bLBDbLBDbLBDb.",
        "bLBDbLBDbLBDb.",
        ".bBb.bBb.bBb..",
        "..b...b...b...",
        E,
        E,
        E,
    ], {**BLUE, **GOLD})


def shelter() -> Icon:  # a roof over a heart
    return sprite([
        "......bb......",
        "....bbLLbb....",
        "..bbLLBBBBbb..",
        "bbLLBBBBBBDDbb",
        "bbbbbbbbbbbbbb",
        E,
        "...rr....rr...",
        "..rRRr..rRRr..",
        "..rRWRrrRRRr..",
        "..rRRRRRRRRr..",
        "...rRRRRRRr...",
        "....rRRRRr....",
        ".....rRRr.....",
        "......rr......",
    ], {**BLUE, **RED})


def weathered_hide() -> Icon:  # plates of hide laid one over another, each wider: it builds up
    return sprite([
        E,
        "....hhhhhh....",
        "....hLLLLh....",
        "....hHgHHh....",
        "..hhhhhhhhhh..",
        "..hLLLLLLLLh..",
        "..hHgHHHHgHh..",
        "hhhhhhhhhhhhhh",
        "hLLLLLLLLLLLLh",
        "hHgHHHHHHHHgHh",
        "hHHHHHHHHHHHHh",
        ".hhhhhhhhhhhh.",
        E,
        E,
    ], {"h": ("leather", 2), "H": ("leather", 4), "L": ("leather", 6), "g": ("brass", 6)})


def endurance() -> Icon:  # an anvil under the blow: the big hit rings and he stands
    return sprite([
        "..y...yy...y..",
        "...y..yy..y...",
        E,
        "aaaaaaaaaaaa..",
        "aSSSSSSSSSSAaa",
        ".aAAAAAAAAAAAa",
        "..aaAAAAAAaaa.",
        "....aAAAAa....",
        "....aAAAAa....",
        "...aAAAAAAa...",
        "..aSAAAAAAAa..",
        "..aaaaaaaaaa..",
        E,
        E,
    ], {**STEEL, **GOLD})


# ── Ranger ──────────────────────────────────────────────────────────────────────────────────────────────────
def first_blood() -> Icon:  # an arrow and the first drop it draws
    return sprite([
        "gg............",
        "gGa...........",
        ".aSa..........",
        "..aSa.r.......",
        "...aSrRr......",
        "....rRRr......",
        "....rRRRr.....",
        "...rRWRRRr....",
        "...rRWRRRr....",
        "..rRWRRRRRr...",
        "..rRRRRRRRr...",
        "..rRRRRRRRr...",
        "...rRRRRRr....",
        "....rrrrr.....",
    ], {**STEEL, **GOLD, **RED})


def countersniper() -> Icon:  # an enemy's arrow, caught in the sights before it flies
    return sprite([
        "......gg......",
        "......gg......",
        "...gggGGggg...",
        "..gG......Gg..",
        "..g.....rr.g..",
        "..g....rRr.g..",
        "ggG...aRr..Ggg",
        "ggG..aSa...Ggg",
        "..g.aSa....g..",
        "..g.ra.....g..",
        "..gG......Gg..",
        "...gggGGggg...",
        "......gg......",
        "......gg......",
    ], {**GOLD, **STEEL, "r": ("crimson", 4), "R": ("crimson", 6)})


def hemorrhage() -> Icon:  # a broad arrowhead, and the blood running off it
    return sprite([
        ".....aaaa.....",
        "....aSSAAa....",
        "...aSSAAAAa...",
        "..aSSAAAAAAa..",
        ".aSSAAAAAAAAa.",
        ".aaaaSAAAaaaa.",
        "....aSAAa.....",
        "....aaaaa.....",
        "..r...rr...r..",
        ".rRr.rRRr.rRr.",
        ".rRr.rWRr.rRr.",
        "..r..rRRr..r..",
        "......rr......",
        E,
    ], {**STEEL, **RED})


def pierce_through() -> Icon:  # one arrow through two marks
    return sprite([
        E,
        E,
        "..rrr....rrr..",
        ".rRRRr..rRRRr.",
        ".rR.Rr..rR.Rr.",
        "grR.Rr..rR.Rry",
        "GGGGGGGGGGGGGY",
        "grR.Rr..rR.Rry",
        ".rR.Rr..rR.Rr.",
        ".rRRRr..rRRRr.",
        "..rrr....rrr..",
        E,
        E,
        E,
    ], {**GOLD, **RED})


def cruelty() -> Icon:  # a saw-toothed blade, still dripping: she goes on at what already suffers
    return sprite([
        "..........aa..",
        ".........aSSa.",
        "........aSSAa.",
        ".......aSSAa..",
        "....a.aSSAa...",
        "...aAaSSAa....",
        "..a.aSSAa.....",
        ".aAaSSAa......",
        "..aSSAa.......",
        ".gGgAa...r....",
        "gGg.a...rRr...",
        ".g...r..rRr...",
        "....rRr..r....",
        "....rRr.......",
    ], {**STEEL, **GOLD, **RED})


# ── Priest ──────────────────────────────────────────────────────────────────────────────────────────────────
def overflow() -> Icon:  # a cup running over, and what spills becomes a shield
    return sprite([
        "...mMMMMMMm...",
        ".mgggggggggGm.",
        ".mgMMMMMMMMGm.",
        ".m.gMMMMMMG.m.",
        ".m..gGGGGG..m.",
        ".m...gGGg...m.",
        "..m...gg...m..",
        "..mbbbbbbbbm..",
        "...bLBBBBDb...",
        "...bLBBBBDb...",
        "...bLBBBBDb...",
        "....bLBBDb....",
        ".....bbbb.....",
        E,
    ], {**BLUE, **GOLD, **MINT})


def mantle() -> Icon:  # a mantle with its clasp, laid over whoever is weakest
    return sprite([
        ".....gggg.....",
        "....gYYYYg....",
        "...vvgYYgvv...",
        "..vVVvggvVVv..",
        "..vVLVVVVVDv..",
        ".vVLVVVVVVDDv.",
        ".vVLVVVVVVVDv.",
        ".vVLVVVVVVVDv.",
        ".vVLVVVVVVVDv.",
        ".vVLVVVVVVVDv.",
        ".vVLVVVVVVVDv.",
        ".vVVvVVvvVVVv.",
        "..vv.vv..vvv..",
        E,
    ], {**GOLD, "v": ("violet", 2), "V": ("violet", 5), "L": ("violet", 7), "D": ("violet", 3)})


def revive() -> Icon:  # a heart and two arrows up: back on its feet sooner
    return sprite([
        "......mm......",
        ".....mMMm.....",
        "....mMmmMm....",
        "...mMm..mMm...",
        "......mm......",
        ".....mMMm.....",
        "....mMmmMm....",
        "...mMm..mMm...",
        "...rr....rr...",
        "..rRRr..rRRr..",
        "..rRWRrrRRRr..",
        "...rRRRRRRr...",
        "....rRRRRr....",
        ".....rrrr.....",
    ], {**MINT, **RED})


def searing_light() -> Icon:  # a shaft of light that lands like a blade
    return sprite([
        ".....yyyy.....",
        ".....yWWy.....",
        ".....yWWy.....",
        ".y...yWWy...y.",
        "..y..yWWy..y..",
        ".....yWWy.....",
        ".....yWWy.....",
        "....yYWWYy....",
        "....yYWWYy....",
        ".....yWWy.....",
        "..r...yy...r..",
        ".rRr.r..r.rRr.",
        "..r.rRrrRr.r..",
        ".....rrrr.....",
    ], {"y": ("brass", 5), "Y": ("brass", 7), "W": ("light", 0), "r": ("crimson", 3), "R": ("crimson", 6)})


def condemn() -> Icon:  # the gavel coming down: judged, it takes more from everyone
    return sprite([
        "..hhhh........",
        ".hLLLLh.......",
        ".hLHHLhh......",
        ".hLHHHLLh.....",
        "..hLHHHLh.....",
        "...hhLHLhg....",
        ".....hhhgGg...",
        "........gGGg..",
        ".........gGGg.",
        "..........gGg.",
        "...........gg.",
        ".vvvvvvvv.....",
        ".vVVVVVVv.....",
        ".vvvvvvvv.....",
    ], {"h": ("leather", 2), "H": ("leather", 4), "L": ("leather", 6), **GOLD, "v": ("violet", 3), "V": ("violet", 6)})



def infusion() -> Icon:  # a mint cross, and the yellow spark it gives off: each heal quickens the one it heals
    return sprite([
        "..........G...",
        ".........GYG..",
        "....mm....G...",
        "....mM........",
        "....mM.....y..",
        ".mmmmMmmm.yYy.",
        ".mMMMwMMM..y..",
        ".mmmmMmmm.....",
        "....mM........",
        "....mM...G....",
        "....mm..GYG...",
        ".........G....",
        E,
        E,
    ], {**MINT, **GOLD, **WHITE})

# ── The effect passive's frame ──────────────────────────────────────────────────────────────────────────────
def effect_seal(ring: Tone, fill: Tone, lit: Tone | None = None) -> Image.Image:
    """22×22 (a passive's footprint): the role talent's seal — round, crossed by four points — one size down.
    Outline, a ring one pixel wide, a dark face; `lit` brightens the ring's upper left."""
    n, c, r = 22, 10.5, 8.6
    inside: set[tuple[int, int]] = set()
    for y in range(n):
        for x in range(n):
            dx, dy = abs(x - c), abs(y - c)
            long, short = max(dx, dy), min(dx, dy)
            # a point on each axis: one pixel wide at the box's edge, widening towards the centre
            if math.hypot(dx, dy) <= r or short <= 0.5 + (c - long) * 0.8:
                inside.add((x, y))
    near = ((1, 0), (-1, 0), (0, 1), (0, -1))
    outline = {p for p in inside if any((p[0] + ox, p[1] + oy) not in inside for ox, oy in near)}
    cel = Cel(n, n)
    for x, y in inside:
        if (x, y) in outline:
            cel.put(x, y, ("ink", 0))
        elif any((x + ox, y + oy) in outline for ox, oy in near):
            cel.put(x, y, lit if lit and (x + y) < n - 2 else ring)
        else:
            cel.put(x, y, fill)
    return cel.image()


def build() -> list[dict]:
    signs = [
        ("tal_e_guardian", "Guardián", guardian()), ("tal_e_close_ranks", "Cerrar filas", close_ranks()),
        ("tal_e_shelter", "Amparo", shelter()), ("tal_e_weathered_hide", "Piel curtida", weathered_hide()),
        ("tal_e_endurance", "Aguante", endurance()),
        ("tal_e_first_blood", "Primera sangre", first_blood()), ("tal_e_countersniper", "Cazatiradores", countersniper()),
        ("tal_e_hemorrhage", "Hemorragia", hemorrhage()),
        ("tal_e_pierce_through", "Atravesar", pierce_through()), ("tal_e_cruelty", "Ensañamiento", cruelty()),
        ("tal_e_overflow", "Rebosar", overflow()), ("tal_e_mantle", "Manto", mantle()), ("tal_e_revive", "Reanimar", revive()),
        ("tal_e_searing_light", "Luz hiriente", searing_light()), ("tal_e_condemn", "Condena", condemn()),
        ("tal_e_infusion", "Infusión de poder (pasivo)", infusion()),
    ]
    frames = [
        ("tal_effect_off", "Pasivo de efecto sin puntos", effect_seal(("ink", 3), ("ink", 0))),
        ("tal_effect_on", "Pasivo de efecto con puntos", effect_seal(("brass", 3), ("ink", 1), ("brass", 5))),
        ("tal_effect_max", "Pasivo de efecto completo", effect_seal(("brass", 5), ("ink", 2), ("brass", 7))),
    ]
    return [
        {"key": "effect_passives", "title": "Clases · pasivos de efecto", "note": "Los quince pasivos de efecto de la segunda ola de combate, cinco por clase. Provisionales.",
         "items": [(stem, name, ic.image()) for stem, name, ic in signs]},
        {"key": "effect_passive_frames", "title": "Clases · marco del pasivo de efecto", "note": "El sello de cuatro puntas del talento de rol, al tamaño de una pasiva (22): mismo lenguaje, y el ala de talentos conserva su altura.",
         "items": frames},
    ]
