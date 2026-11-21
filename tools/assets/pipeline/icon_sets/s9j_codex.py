"""The Codex (2026-11-21): the sign of its wing tab (a bound book), the signs of its three sections (bestiary,
achievements, records), the achievement MEDAL in its four states (locked, bronze, silver, gold — the step of a
series) and the signs of the achievement series that no other panel already has a sign for (the others reuse
theirs: the boss skull, the chests, the paw, the gem, the Cube's recipes…).

Same rule as the stat glyphs: ONE bold symbol, hand-placed on a 14×14 field and outlined; every stem starts with
`codex_`.
"""
from __future__ import annotations

from ..rig import Tone
from .s80_stats import sprite


def book():  # a bound tome with a brass clasp and a crimson ribbon
    return sprite([
        "..............",
        "..dddddddddd..",
        ".dLLLLLLLLLLd.",
        ".dLllllllllLd.",
        ".dLlppppppllLd",
        ".dLlpPPPPpllLd",
        ".dLlppppppllbd",
        ".dLllllllllbBd",
        ".dLllllllllbBd",
        ".dLlllllllllLd",
        ".dLlllllrlllLd",
        ".dLLLLLLrLLLLd",
        ".wwwwwwwrwwwww",
        "..dddddddddd..",
    ], {"d": ("crimson", 1), "L": ("crimson", 3), "l": ("crimson", 4), "p": ("brass", 4), "P": ("brass", 6),
        "b": ("brass", 5), "B": ("brass", 7), "r": ("crimson", 6), "w": ("bone", 6)})


def bestiary():  # three claw marks raked across a page
    return sprite([
        "..............",
        ".wwwwwwwwwww..",
        ".wWWWWWWWWWw..",
        ".wWWcWWcWWcW..",
        ".wWcCWcCWcCW..",
        ".wWcCWcCWcCw..",
        ".wcCWcCWcCWw..",
        ".wcCWcCWcCWw..",
        ".wCWcCWcCWWw..",
        ".wWWcWWcWWWw..",
        ".wWcWWcWWWWw..",
        ".wWWWWWWWWWw..",
        ".wwwwwwwwwww..",
        "..............",
    ], {"w": ("bone", 3), "W": ("bone", 6), "c": ("crimson", 3), "C": ("crimson", 5)})


def records():  # a scroll with a quill
    return sprite([
        "...........qQ.",
        "..........qQ..",
        ".rrrrrrrrqQr..",
        "rRRRRRRRqQRRr.",
        ".rWWWWWWqWWr..",
        "..WiiiiqiiW...",
        "..WWWWqWWWW...",
        "..WiiiiiiiW...",
        "..WWWWWWWWW...",
        "..WiiiiiiWW...",
        "..WWWWWWWWW...",
        ".rrrrrrrrrrr..",
        "rRRRRRRRRRRRr.",
        ".rrrrrrrrrrr..",
    ], {"r": ("leather", 3), "R": ("leather", 5), "W": ("bone", 6), "i": ("ink", 4), "q": ("azure", 4), "Q": ("azure", 7)})


_METAL: dict[str, tuple[str, int, int, int]] = {
    # ramp, rim, face, shine
    "bronze": ("leather", 3, 5, 7),
    "silver": ("ink", 5, 7, 9),
    "gold": ("brass", 4, 6, 7),
}


def medal(metal: str):  # a round medal on a crimson ribbon, laurel struck on its face
    if metal == "locked":
        legend: dict[str, Tone] = {"r": ("ink", 2), "R": ("ink", 3), "m": ("ink", 2), "M": ("ink", 3), "s": ("ink", 3), "l": ("ink", 2)}
    else:
        ramp, rim, face, shine = _METAL[metal]
        legend = {"r": ("crimson", 3), "R": ("crimson", 5), "m": (ramp, rim), "M": (ramp, face), "s": (ramp, shine), "l": (ramp, rim)}
    return sprite([
        "...rR....Rr...",
        "...rRR..RRr...",
        "....rRRRRr....",
        ".....rRRr.....",
        "....mmmmmm....",
        "...mMMMMMMm...",
        "..mMMMssMMMm..",
        "..mMssssssMm..",
        "..mMMssssMMm..",
        "..mMMsllsMMm..",
        "..mMslMMlsMm..",
        "...mMMMMMMm...",
        "....mmmmmm....",
        "..............",
    ], legend)


def level():  # a star over two rising chevrons
    return sprite([
        "......s.......",
        ".....sSs......",
        "..ssSSSSSss...",
        "...sSSSSSs....",
        "....sS.Ss.....",
        "....s...s.....",
        "..............",
        "......g.......",
        ".....gGg......",
        "....gG.Gg.....",
        "...gG.g.Gg....",
        "..gG.gGg.Gg...",
        ".gG.gG.Gg.Gg..",
        ".g.gG...Gg.g..",
    ], {"s": ("brass", 4), "S": ("brass", 7), "g": ("moss", 4), "G": ("moss", 7)})


def hours():  # an hourglass, sand running
    return sprite([
        "..wwwwwwwwww..",
        "..wWWWWWWWWw..",
        "...g......g...",
        "...gyyyyyyg...",
        "....gyyyyg....",
        ".....gyyg.....",
        "......gy......",
        "......yg......",
        ".....g.yg.....",
        "....g..y.g....",
        "...g..yyy.g...",
        "...gyyyyyyg...",
        "..wWWWWWWWWw..",
        "..wwwwwwwwww..",
    ], {"w": ("leather", 3), "W": ("leather", 5), "g": ("azure", 6), "y": ("brass", 6)})


def kills():  # two crossed swords
    return sprite([
        "a............a",
        "Ab..........bA",
        ".Ab........bA.",
        "..Ab......bA..",
        "...Ab....bA...",
        "....Ab..bA....",
        ".....AbbA.....",
        ".....bAAb.....",
        "....bA..Ab....",
        "..ggA....Agg..",
        "...gG....Gg...",
        "..hhGg..gGhh..",
        ".hh........hh.",
        "pp..........pp",
    ], {"a": ("ink", 6), "A": ("ink", 9), "b": ("ink", 6), "g": ("brass", 4), "G": ("brass", 6), "h": ("leather", 4), "p": ("brass", 5)})


def runaway():  # a little chest on two legs, mid-stride
    return sprite([
        "..............",
        "...kkkkkkkk...",
        "..kKKKKKKKKk..",
        "..kKbbbbbbKk..",
        "..kkkkyykkkk..",
        "..kWWWyyWWWk..",
        "..kWWWWWWWWk..",
        "..kkkkkkkkkk..",
        "....ll..ll....",
        "...ll....ll...",
        "..ll......l...",
        ".ff.......ff..",
        "..............",
        "..............",
    ], {"k": ("leather", 2), "K": ("leather", 5), "b": ("brass", 5), "y": ("brass", 7), "W": ("leather", 4), "l": ("leather", 3), "f": ("ink", 3)})


def merchant():  # a heavy coin purse, tied, with a coin spilling
    return sprite([
        "......tt......",
        ".....tTTt.....",
        "......tt......",
        ".....pPPp.....",
        "....pPPPPp....",
        "...pPPPPPPp...",
        "..pPPPyyPPPp..",
        "..pPPyYYyPPp..",
        "..pPPPyyPPPp..",
        "..pPPPPPPPPp..",
        "...pPPPPPPp.cc",
        "....pppppp.cCc",
        "...........cc.",
        "..............",
    ], {"t": ("crimson", 3), "T": ("crimson", 5), "p": ("violet", 2), "P": ("violet", 4), "y": ("brass", 5), "Y": ("brass", 7), "c": ("brass", 4), "C": ("brass", 7)})


def build() -> list[dict]:
    return [
        {"key": "codex_signs", "title": "Códice · signos", "note": "La pestaña del Códice (un libro) y sus tres secciones: bestiario, logros y récords.",
         "items": [("codex_book", "Códice", book().image()), ("codex_sec_bestiary", "Bestiario", bestiary().image()),
                   ("codex_sec_achievements", "Logros", medal("gold").image()), ("codex_sec_records", "Récords", records().image())]},
        {"key": "codex_medals", "title": "Códice · medallas", "note": "El logro en sus cuatro estados: por conseguir, y bronce, plata y oro según el escalón de su serie.",
         "items": [(f"codex_medal_{m}", label, medal(m).image()) for m, label in (("locked", "Por conseguir"), ("bronze", "Bronce"), ("silver", "Plata"), ("gold", "Oro"))]},
        {"key": "codex_series", "title": "Códice · signos de series", "note": "Las series que no tenían signo en otro panel: nivel, horas, bajas, cofres fugitivos y mercader.",
         "items": [("codex_level", "Nivel de héroe", level().image()), ("codex_hours", "Horas de juego", hours().image()),
                   ("codex_kills", "Bajas", kills().image()),
                   ("codex_runaway", "Cofres fugitivos", runaway().image()), ("codex_merchant", "Compras al mercader", merchant().image())]},
    ]
