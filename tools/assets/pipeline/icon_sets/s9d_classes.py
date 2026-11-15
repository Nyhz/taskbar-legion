"""The class redesign's first wave (docs/redesign/CLASSES.md), STAND-INS: the six branch abilities, the four
branch signs the Knight's set did not have (Marksman, Stalker, Devotion, Zeal — Bastion and Scourge are in
`s98_talents.py`), the nine role talents and the frame of a ROLE talent — a seal with four points, so it is told apart from a plain
passive's round seal by its shape.

Placeholders until the final ability icons are drawn — do not polish them, replace them.
"""
from __future__ import annotations

import math

from PIL import Image

from ..icons import Icon
from ..rig import Cel, Tone
from .s80_stats import sprite

E = ".............."


# ── Knight ──────────────────────────────────────────────────────────────────────────────────────────────────
def hold_the_line() -> Icon:  # a standard planted on the ground: nobody passes
    return sprite([
        "..p...........",
        "..pbbbbbbbb...",
        "..pbLBBBBBBb..",
        "..pbLBBgGBBBb.",
        "..pbLBBGgBBb..",
        "..pbLBBBBBb...",
        "..pbbbbbbb....",
        "..p...........",
        "..p...........",
        "..p...........",
        "..p...........",
        ".aaaaaaaaaaaa.",
        ".aAAAAAAAAAAa.",
        E,
    ], {"p": ("leather", 5), "b": ("azure", 2), "B": ("azure", 5), "L": ("azure", 7), "g": ("brass", 4), "G": ("brass", 6),
        "a": ("ink", 3), "A": ("ink", 6)})


def riposte() -> Icon:  # a blade turned back on the attacker, and the spark of the parry
    return sprite([
        "..........aa..",
        ".........aWa..",
        "........aWAa..",
        ".r.....aWAa...",
        "rRr...aWAa....",
        ".r...aWAa.....",
        "....aWAa......",
        "..laWAa.......",
        ".lLLAa..r.....",
        "..lLLl.rRr....",
        ".lLllL..r.....",
        "lLl..l........",
        "ll............",
        E,
    ], {"a": ("ink", 3), "A": ("ink", 7), "W": ("ink", 9), "l": ("leather", 3), "L": ("leather", 5), "r": ("crimson", 4), "R": ("crimson", 7)})


# ── Ranger ──────────────────────────────────────────────────────────────────────────────────────────────────
def weak_spot() -> Icon:  # a plate of armour with the gap in it
    return sprite([
        E,
        "..aaaaaaaaaa..",
        ".aAAAAAAAAAWa.",
        ".aAAAAkAAAAWa.",
        ".aAAAkkAAAAAa.",
        ".aAAkrrkAAAAa.",
        ".aAAkrRrkAAAa.",
        ".aAAAkrrkAADa.",
        ".aAAAAkkAADDa.",
        ".aAAAAAkADDDa.",
        "..aAAAADDDDa..",
        "...aaaaaaaa...",
        E,
        E,
    ], {"a": ("ink", 3), "A": ("ink", 6), "W": ("ink", 8), "D": ("ink", 4), "k": ("ink", 0), "r": ("crimson", 4), "R": ("crimson", 7)})


def tar_flask() -> Icon:  # a corked flask of pitch
    return sprite([
        ".....llll.....",
        ".....lLLl.....",
        "....gggggg....",
        ".....gWWg.....",
        ".....gWWg.....",
        "....gWWWWg....",
        "...gWkkkkWg...",
        "..gWkkkkkkWg..",
        "..gkkKkkkkkg..",
        "..gkKkkkkkkg..",
        "..gkkkkkkkkg..",
        "...gkkkkkkg...",
        "....gggggg....",
        E,
    ], {"l": ("leather", 4), "L": ("leather", 6), "g": ("sea", 3), "W": ("sea", 7), "k": ("ink", 1), "K": ("ink", 5)})


# ── Priest ──────────────────────────────────────────────────────────────────────────────────────────────────
def sanctuary() -> Icon:  # a dome of light over the ground
    return sprite([
        E,
        ".....gggg.....",
        "...ggYYYYgg...",
        "..gYYwwwwYYg..",
        ".gYwww..wwwYg.",
        ".gYw......wYg.",
        "gYw...ww...wYg",
        "gYw..wWWw..wYg",
        "gYw..wWWw..wYg",
        "gYw...ww...wYg",
        "gYw........wYg",
        "gggggggggggggg",
        E,
        E,
    ], {"g": ("brass", 3), "Y": ("brass", 5), "w": ("brass", 7), "W": ("light", 0)})


def smite() -> Icon:  # a bolt of light falling on the enemy
    return sprite([
        ".......yyyy...",
        "......yWWy....",
        ".....yWWy.....",
        "....yWWy......",
        "...yWWWyyyy...",
        "..yyyyWWWy....",
        ".....yWWy.....",
        "....yWWy......",
        "...yWWy.......",
        "..yWy.........",
        ".yy....r.r....",
        "......rRrRr...",
        ".......r.r....",
        E,
    ], {"y": ("brass", 4), "W": ("brass", 7), "r": ("crimson", 4), "R": ("crimson", 7)})


# ── Branch signs ────────────────────────────────────────────────────────────────────────────────────────────
def marksman() -> Icon:  # a bullseye with the arrow in it
    return sprite([
        "...........ll.",
        "....aaaaa.lLl.",
        "..aaWWWWWlLl..",
        ".aWWrrrrlLla..",
        ".aWrrWWlLlWa..",
        "aWrrWWlLlrrWa.",
        "aWrWWrArWWrWa.",
        "aWrWWrrrWWrWa.",
        "aWrrWWWWWrrWa.",
        ".aWrrWWWrrWa..",
        ".aWWrrrrrWWa..",
        "..aaWWWWWaa...",
        "....aaaaa.....",
        E,
    ], {"a": ("ink", 3), "W": ("bone", 6), "r": ("crimson", 4), "l": ("leather", 3), "L": ("leather", 6), "A": ("ink", 8)})


def stalker() -> Icon:  # the open jaws of a trap
    return sprite([
        E,
        ".a..a....a..a.",
        ".aAaAa..aAaAa.",
        ".aAAAAaaAAAAa.",
        "..aAAAAAAAAa..",
        "...aaAAAAaa...",
        ".....aAAa.....",
        "...aaAAAAaa...",
        "..aAAAAAAAAa..",
        ".aAAAAaaAAAAa.",
        ".aAaAa..aAaAa.",
        ".a..a....a..a.",
        E,
        E,
    ], {"a": ("ink", 3), "A": ("ink", 7)})


def devotion() -> Icon:  # a heart under a halo
    return sprite([
        "....yyyyyy....",
        "...yY....Yy...",
        "....yyyyyy....",
        E,
        "..rrr....rrr..",
        ".rRRRr..rRRRr.",
        ".rRWRRrrRRRRr.",
        ".rRWRRRRRRRDr.",
        ".rRRRRRRRRDDr.",
        "..rRRRRRRDDr..",
        "...rRRRRDDr...",
        "....rRRDDr....",
        ".....rDDr.....",
        "......rr......",
    ], {"y": ("brass", 4), "Y": ("brass", 7), "r": ("crimson", 2), "R": ("crimson", 5), "W": ("crimson", 7), "D": ("crimson", 3)})


def zeal() -> Icon:  # a sun of wrath
    return sprite([
        "......yy......",
        ".y....yy....y.",
        "..y...yy...y..",
        "...y.yyyy.y...",
        "....yYYYYy....",
        "...yYWWWWYy...",
        "yyyyYWWWWYyyyy",
        "yyyyYWWWWYyyyy",
        "...yYWWWWYy...",
        "....yYYYYy....",
        "...y.yyyy.y...",
        "..y...yy...y..",
        ".y....yy....y.",
        "......yy......",
    ], {"y": ("brass", 4), "Y": ("brass", 6), "W": ("brass", 7)})


# ── Role talents ────────────────────────────────────────────────────────────────────────────────────────────
def vanguard() -> Icon:  # a shield over the three of the party
    return sprite([
        "..bbbbbbbbbb..",
        "..bLBBBBBBDb..",
        "..bLBBBBBBDb..",
        "..bLBBBBBBDb..",
        "..bLBBBBBBDb..",
        "...bLBBBBDb...",
        "....bLBBDb....",
        ".....bbbb.....",
        E,
        ".gg..gg..gg...",
        "gGGggGGggGGg..",
        "gGGggGGggGGg..",
        ".gg..gg..gg...",
        E,
    ], {"b": ("azure", 2), "B": ("azure", 5), "L": ("azure", 7), "D": ("azure", 3), "g": ("brass", 3), "G": ("brass", 6)})


def unyielding() -> Icon:  # a heart bound in iron: he holds when he is low
    return sprite([
        E,
        "..rrr....rrr..",
        ".rRRRr..rRRRr.",
        ".rRWRRrrRRRRr.",
        ".rRRRRRRRRRDr.",
        "aaaaaaaaaaaaaa",
        "aAAWAAAAAAAADa",
        "aaaaaaaaaaaaaa",
        "..rRRRRRRDDr..",
        "...rRRRRDDr...",
        "....rRRDDr....",
        ".....rDDr.....",
        "......rr......",
        E,
    ], {"r": ("crimson", 2), "R": ("crimson", 5), "W": ("crimson", 7), "D": ("crimson", 3), "a": ("ink", 2), "A": ("ink", 6)})


def warden() -> Icon:  # three hearts: more life for all
    return sprite([
        E,
        "...rr.rr......",
        "..rRRrRRr.....",
        "..rRRRRRr.....",
        "...rRRRr.rr.rr",
        "....rRr.rRRrRR",
        ".....r..rRRRRR",
        ".rr.rr...rRRRr",
        "rRRrRRr...rRr.",
        "rRRRRRr....r..",
        ".rRRRr........",
        "..rRr.........",
        "...r..........",
        E,
    ], {"r": ("crimson", 2), "R": ("crimson", 5)})


def predator() -> Icon:  # three claw marks
    return sprite([
        E,
        "..rr...rr...rr",
        "..rRr..rRr..rR",
        "...rRr..rRr..r",
        "...rRr..rRr..r",
        "..rRRr.rRRr.rR",
        "..rRr..rRr..rR",
        ".rRRr.rRRr.rRR",
        ".rRr..rRr..rRr",
        ".rRr..rRr..rRr",
        "rRr..rRr..rRr.",
        "rr...rr...rr..",
        E,
        E,
    ], {"r": ("crimson", 3), "R": ("crimson", 6)})


def long_shot() -> Icon:  # an arrow in long flight
    return sprite([
        E,
        E,
        "..........aa..",
        "...........aWa",
        "w..w..w.....aW",
        E,
        "llllllllllllWW",
        E,
        "w..w..w.....aW",
        "...........aWa",
        "..........aa..",
        E,
        E,
        E,
    ], {"a": ("ink", 4), "W": ("ink", 9), "l": ("leather", 5), "w": ("ink", 6)})


def hunters_focus() -> Icon:  # a crowned skull: the big prey
    return sprite([
        "..g...gg...g..",
        "..gg.gGGg.gg..",
        "..gGgGGGGgGg..",
        "..gggggggggg..",
        "...aWWWWWWa...",
        "..aWWWWWWWWa..",
        "..aWkkWWkkWa..",
        "..aWkkWWkkWa..",
        "..aWWWkkWWWa..",
        "...aWWWWWWa...",
        "...aWkWkWWa...",
        "....aaaaaa....",
        E,
        E,
    ], {"g": ("brass", 3), "G": ("brass", 6), "a": ("ink", 3), "W": ("bone", 6), "k": ("ink", 0)})


def triage() -> Icon:  # the red cross on white: the worst hurt first
    return sprite([
        E,
        ".aaaaaaaaaaaa.",
        ".aWWWWWWWWWWa.",
        ".aWWWWrrWWWWa.",
        ".aWWWWrrWWWWa.",
        ".aWWrrrrrrWWa.",
        ".aWWrrrrrrWWa.",
        ".aWWWWrrWWWWa.",
        ".aWWWWrrWWWWa.",
        ".aWWWWWWWWWWa.",
        ".aaaaaaaaaaaa.",
        E,
        E,
        E,
    ], {"a": ("ink", 3), "W": ("bone", 7), "r": ("crimson", 4)})


def vigil() -> Icon:  # a candle that stays lit
    return sprite([
        ".......y......",
        "......yYy.....",
        "......yWYy....",
        ".....yYWWy....",
        ".....yYWYy....",
        "......yyy.....",
        ".......k......",
        ".....bbbbb....",
        ".....bWWBb....",
        ".....bWWBb....",
        ".....bWWBb....",
        "....gggggggg..",
        "...gGGGGGGGGg.",
        "....gggggggg..",
    ], {"y": ("brass", 4), "Y": ("brass", 6), "W": ("brass", 7), "k": ("ink", 1), "b": ("bone", 3), "B": ("bone", 5), "g": ("brass", 3), "G": ("brass", 5)})


def sacred_ward() -> Icon:  # a shield of light against magic
    return sprite([
        E,
        "..vvvvvvvvvv..",
        "..vLVVVVVVDv..",
        "..vLVVVwVVDv..",
        "..vLVVwWwVDv..",
        "..vLVwWWWwDv..",
        "..vLVVwWwVDv..",
        "..vLVVVwVVDv..",
        "..vLVVVVVVDv..",
        "...vLVVVVDv...",
        "....vLVVDv....",
        ".....vvvv.....",
        E,
        E,
    ], {"v": ("violet", 2), "V": ("violet", 5), "L": ("violet", 7), "D": ("violet", 3), "w": ("brass", 6), "W": ("light", 0)})


# ── The role talent's frame ─────────────────────────────────────────────────────────────────────────────────
def role_seal(ring: Tone, fill: Tone, lit: Tone | None = None) -> Image.Image:
    """24×24 (an ability plate's footprint): a round seal crossed by four points, like a compass rose.
    Outline, a ring one pixel wide, a dark face; `lit` brightens the ring's upper left."""
    n, c, r = 24, 11.5, 9.4
    inside: set[tuple[int, int]] = set()
    for y in range(n):
        for x in range(n):
            dx, dy = abs(x - c), abs(y - c)
            long, short = max(dx, dy), min(dx, dy)
            # a point on each axis: half a pixel wide at the box's edge, widening towards the centre
            if math.hypot(dx, dy) <= r or short <= 0.5 + (c - long) * 0.7:
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
        ("tal_hold_the_line", "Mantener la línea", hold_the_line()), ("tal_riposte", "Réplica", riposte()),
        ("tal_weak_spot", "Punto débil", weak_spot()), ("tal_tar_flask", "Frasco de brea", tar_flask()),
        ("tal_sanctuary", "Santuario", sanctuary()), ("tal_smite", "Castigo", smite()),
    ]
    branches = [
        ("tal_marksman", "Tirador", marksman()), ("tal_stalker", "Acechador", stalker()),
        ("tal_devotion", "Devoción", devotion()), ("tal_zeal", "Celo", zeal()),
    ]
    roles = [
        ("tal_r_vanguard", "Vanguardia", vanguard()), ("tal_r_unyielding", "Inquebrantable", unyielding()), ("tal_r_warden", "Guardián", warden()),
        ("tal_r_predator", "Depredador", predator()), ("tal_r_long_shot", "Tiro largo", long_shot()), ("tal_r_hunters_focus", "Foco del cazador", hunters_focus()),
        ("tal_r_triage", "Triaje", triage()), ("tal_r_vigil", "Vigilia", vigil()), ("tal_r_sacred_ward", "Custodia sagrada", sacred_ward()),
    ]
    frames = [
        ("tal_role_off", "Talento de rol sin puntos", role_seal(("ink", 3), ("ink", 0))),
        ("tal_role_on", "Talento de rol con puntos", role_seal(("brass", 3), ("ink", 1), ("brass", 5))),
        ("tal_role_max", "Talento de rol completo", role_seal(("brass", 5), ("ink", 2), ("brass", 7))),
    ]
    return [
        {"key": "class_abilities", "title": "Clases · habilidades de rama", "note": "Las seis habilidades que añade el rediseño de clases, una por rama. Provisionales.",
         "items": [(stem, name, ic.image()) for stem, name, ic in signs]},
        {"key": "class_branches", "title": "Clases · signos de rama", "note": "Las cuatro ramas que faltaban: Tirador y Acechador (Ranger), Devoción y Celo (Priest). Bastión y Azote están con los talentos del Knight.",
         "items": [(stem, name, ic.image()) for stem, name, ic in branches]},
        {"key": "class_roles", "title": "Clases · talentos de rol", "note": "Los nueve talentos de rol, tres por clase. Provisionales.",
         "items": [(stem, name, ic.image()) for stem, name, ic in roles]},
        {"key": "class_role_frames", "title": "Clases · marco del talento de rol", "note": "Un sello con cuatro puntas: se distingue del sello redondo de una pasiva por la forma.",
         "items": frames},
    ]
