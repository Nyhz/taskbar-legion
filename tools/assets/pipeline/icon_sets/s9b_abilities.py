"""STAND-IN ability signs, 16×16: the ten Ranger / Priest abilities and the three class ultimates of the CURRENT
kits, so the talents tab and the hero panel can show every ability with a sign of its own. The Knight's five
abilities already have theirs (`s98_talents.py`). These are placeholders until the class redesign
(docs/redesign/CLASSES.md) brings the final ability icons — do not polish them, replace them.
Same recipe as the other glyphs (`s80_stats.sprite`): a 14×14 drawing with a dark outline.
"""
from __future__ import annotations

from ..icons import Icon
from .s80_stats import sprite

E = ".............."


# ── Priest ──────────────────────────────────────────────────────────────────────────────────────────────────
def mend() -> Icon:  # a green cross: the heal
    return sprite([
        E,
        ".....gggg.....",
        ".....gGGg.....",
        ".....gGGg.....",
        ".gggggGGggggg.",
        ".gGGGGWWGGGGg.",
        ".gGGGGWWGGGGg.",
        ".gggggGGggggg.",
        ".....gGGg.....",
        ".....gGGg.....",
        ".....gggg.....",
        E,
        E,
        E,
    ], {"g": ("moss", 3), "G": ("moss", 6), "W": ("moss", 8)})


def power_infusion() -> Icon:  # an arrow rising among sparks: power poured into an ally
    return sprite([
        "......vv......",
        ".....vVVv.....",
        "....vVVVVv....",
        "...vVVVVVVv...",
        "..vvvVVVVvvv..",
        "....vVVVVv....",
        "....vVVVVv....",
        ".y..vVVVVv..y.",
        "....vVVVVv....",
        "..y.vvvvvv.y..",
        E,
        E,
        E,
        E,
    ], {"v": ("violet", 4), "V": ("violet", 7), "y": ("brass", 6)})


def holy_shield() -> Icon:  # a golden shield with a cross of light
    return sprite([
        E,
        ".gggggggggggg.",
        ".gYYYYwwYYYYg.",
        ".gYYYYwwYYYYg.",
        ".gYwwwwwwwwYg.",
        ".gYwwwwwwwwYg.",
        ".gYYYYwwYYYDg.",
        "..gYYYwwYYDg..",
        "..gYYYwwYYDg..",
        "...gYYwwYDg...",
        "....ggwwgg....",
        "......gg......",
        E,
        E,
    ], {"g": ("brass", 3), "Y": ("brass", 5), "D": ("brass", 4), "w": ("light", 0)})


def holy_nova() -> Icon:  # a burst of light
    return sprite([
        "......yy......",
        ".y....yy....y.",
        "..y...yy...y..",
        "...y.yYYy.y...",
        "....yYwwYy....",
        "...yYwwwwYy...",
        "yyyYwwwwwwYyyy",
        "yyyYwwwwwwYyyy",
        "...yYwwwwYy...",
        "....yYwwYy....",
        "...y.yYYy.y...",
        "..y...yy...y..",
        ".y....yy....y.",
        "......yy......",
    ], {"y": ("brass", 4), "Y": ("brass", 6), "w": ("light", 0)})


def retribution() -> Icon:  # a ring of thorns around a core: the aura that strikes back
    return sprite([
        ".....r..r.....",
        "...r.rRRr.r...",
        "..rRRr..rRRr..",
        ".rRr......rRr.",
        "..Rr..gg..rR..",
        "rRr..gGGg..rRr",
        ".Rr..gGGg..rR.",
        ".Rr..gGGg..rR.",
        "rRr..gGGg..rRr",
        "..Rr..gg..rR..",
        ".rRr......rRr.",
        "..rRRr..rRRr..",
        "...r.rRRr.r...",
        ".....r..r.....",
    ], {"r": ("crimson", 3), "R": ("crimson", 5), "g": ("brass", 4), "G": ("brass", 6)})


# ── Ranger ──────────────────────────────────────────────────────────────────────────────────────────────────
def rapid_fire() -> Icon:  # three arrows in flight
    return sprite([
        E,
        ".......a......",
        "..llllllaa....",
        ".......a......",
        E,
        "..........a...",
        ".....llllllaa.",
        "..........a...",
        E,
        ".......a......",
        "..llllllaa....",
        ".......a......",
        E,
        E,
    ], {"l": ("leather", 5), "a": ("ink", 8)})


def aimed_shot() -> Icon:  # a reticle
    return sprite([
        "......kk......",
        "....rrkkrr....",
        "...r..kk..r...",
        "..r...kk...r..",
        ".r..........r.",
        ".r....RR....r.",
        "kkkk.RRRR.kkkk",
        "kkkk.RRRR.kkkk",
        ".r....RR....r.",
        ".r..........r.",
        "..r...kk...r..",
        "...r..kk..r...",
        "....rrkkrr....",
        "......kk......",
    ], {"k": ("ink", 8), "r": ("crimson", 4), "R": ("crimson", 5)})


def raining_arrows() -> Icon:  # arrows falling
    return sprite([
        "..l....l....l.",
        "..l....l....l.",
        "..l....l....l.",
        "..l....l....l.",
        "..l....l....l.",
        ".aaa...l...aaa",
        "..a....l....a.",
        ".......l......",
        "......aaa.....",
        ".......a......",
        E,
        E,
        E,
        E,
    ], {"l": ("leather", 5), "a": ("ink", 8)})


def explosive_arrow() -> Icon:  # an arrow ending in a blast
    return sprite([
        "........o..o..",
        ".........oo.o.",
        "......o.oOOo..",
        ".......oOYYOo.",
        "......oOYYYOo.",
        ".......oOYOo..",
        "......l.ooo.o.",
        ".....l...o....",
        "....l.........",
        "...l..........",
        "..l...........",
        ".f............",
        "f.f...........",
        E,
    ], {"o": ("crimson", 5), "O": ("crimson", 6), "Y": ("brass", 6), "l": ("leather", 5), "f": ("bone", 6)})


def caltrops() -> Icon:  # iron spikes strewn on the ground
    return sprite([
        E,
        "....a.........",
        "....A.........",
        "..aAWAa.......",
        "....A.....a...",
        "....a.....A...",
        "........aAWAa.",
        "..........A...",
        ".....a....a...",
        ".....A........",
        "...aAWAa......",
        ".....A........",
        ".....a........",
        E,
    ], {"a": ("ink", 5), "A": ("ink", 7), "W": ("ink", 9)})


# ── Ultimates ───────────────────────────────────────────────────────────────────────────────────────────────
def last_stand() -> Icon:  # Knight: a shield that still holds a heart
    return sprite([
        E,
        ".bbbbbbbbbbbb.",
        ".bLBBBBBBBBDb.",
        ".bLBrrBBrrBDb.",
        ".bLrRRrrRRrDb.",
        ".bLrRRRRRRrDb.",
        ".bLBrRRRRrBDb.",
        "..bLBrRRrBDb..",
        "..bLBBrrBBDb..",
        "...bLBBBBDb...",
        "....bbBBbb....",
        "......bb......",
        E,
        E,
    ], {"b": ("azure", 2), "B": ("azure", 5), "L": ("azure", 7), "D": ("azure", 3), "r": ("crimson", 3), "R": ("crimson", 5)})


def battle_enrage() -> Icon:  # Priest: a flame
    return sprite([
        "......o.......",
        ".....oOo......",
        ".....oOOo.....",
        "....oOOOo..o..",
        "...oOOYOOo.o..",
        "..oOOYYYOOoOo.",
        "..oOYYYYYOOOo.",
        ".oOOYYwYYYOOo.",
        ".oOYYwwwYYOOo.",
        ".oOYYwwwYYOo..",
        "..oOYYwYYOo...",
        "...ooOOOoo....",
        ".....ooo......",
        E,
    ], {"o": ("crimson", 4), "O": ("crimson", 6), "Y": ("brass", 6), "w": ("brass", 7)})


def hunters_mark() -> Icon:  # Ranger: the mark set on the prey
    return sprite([
        E,
        "......rr......",
        ".....rRRr.....",
        "....rRRRRr....",
        "...rRRkkRRr...",
        "..rRRk..kRRr..",
        ".rRRk.RR.kRRr.",
        ".rRRk.RR.kRRr.",
        "..rRRk..kRRr..",
        "...rRRkkRRr...",
        "....rRRRRr....",
        ".....rRRr.....",
        "......rr......",
        E,
    ], {"r": ("crimson", 3), "R": ("crimson", 5), "k": ("ink", 0)})


SIGNS = [
    ("abil_mend", "Mend (provisional)", mend), ("abil_power_infusion", "Power Infusion (provisional)", power_infusion),
    ("abil_holy_shield", "Holy Shield (provisional)", holy_shield), ("abil_holy_nova", "Holy Nova (provisional)", holy_nova),
    ("abil_retribution", "Retribution Aura (provisional)", retribution),
    ("abil_rapid_fire", "Rapid Fire (provisional)", rapid_fire), ("abil_aimed_shot", "Aimed Shot (provisional)", aimed_shot),
    ("abil_raining_arrows", "Raining Arrows (provisional)", raining_arrows), ("abil_explosive_arrow", "Explosive Arrow (provisional)", explosive_arrow),
    ("abil_caltrops", "Caltrops (provisional)", caltrops),
    ("abil_ult_last_stand", "Last Stand · definitiva (provisional)", last_stand), ("abil_ult_battle_enrage", "Battle Enrage · definitiva (provisional)", battle_enrage),
    ("abil_ult_hunters_mark", "Mark of the Hunter · definitiva (provisional)", hunters_mark),
]


def build() -> list[dict]:
    return [{
        "key": "abilities_standin",
        "title": "Habilidades · signos provisionales",
        "note": "Signos de relleno para las habilidades actuales del Ranger y la Priest y para las tres definitivas, hasta que el rediseño de los kits traiga los iconos definitivos.",
        "items": [(stem, name, fn().image()) for stem, name, fn in SIGNS],
    }]
