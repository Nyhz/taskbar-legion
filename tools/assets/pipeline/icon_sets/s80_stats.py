"""Stat glyphs, 16×16: the fifteen symbols that stand next to a number in tooltips and panels (they replace the
emoji of `src/ui/icons.ts`, `STAT_ICON`).

Not objects on a frame: each is ONE bold symbol, hand-placed pixel by pixel on a 14×14 field and outlined, with
its own hue family and its own shape, so a column of them is told apart by colour and by silhouette. The four that
could blur — armour, magic resist, block, damage reduction — are a cuirass, a kite shield with a rune, a round
buckler and a stone wall.
"""
from __future__ import annotations

import math

from ..icons import Icon
from ..rig import Tone

N = 16


def sprite(rows: list[str], legend: dict[str, Tone]) -> Icon:
    """A 14×14 drawing set one pixel in from the edge, so the outline has room."""
    assert len(rows) == 14 and all(len(r) == 14 for r in rows), [len(r) for r in rows]
    ic = Icon(N)
    ic.stamp(rows, legend, 1, 1)
    ic.outline()
    return ic


def attack_damage() -> Icon:  # a steel blade
    return sprite([
        "...........aab",
        "..........aabc",
        ".........aabc.",
        "........aabc..",
        ".......aabc...",
        "......aabc....",
        ".g...aabc.....",
        ".Gg.aabc......",
        "..GGabc.......",
        "...GGg........",
        "..hhGGg.......",
        ".hh..GGg......",
        "pp....Gg......",
        "p.............",
    ], {"a": ("ink", 9), "b": ("ink", 7), "c": ("ink", 5), "g": ("brass", 4), "G": ("brass", 6), "h": ("leather", 4), "p": ("brass", 5)})


def attack_speed() -> Icon:  # two chevrons: fast
    return sprite([
        "..............",
        ".aa....aa.....",
        ".abb...abb....",
        "..abb...abb...",
        "...abb...abb..",
        "....abb...abb.",
        ".....abb...abb",
        ".....acc...acc",
        "....acc...acc.",
        "...acc...acc..",
        "..acc...acc...",
        ".acc...acc....",
        ".cc....cc.....",
        "..............",
    ], {"a": ("sea", 8), "b": ("sea", 6), "c": ("sea", 4)})


def crit_chance() -> Icon:  # a bullseye
    ic = Icon(N)
    for y in range(N):
        for x in range(N):
            d = math.hypot(x - 7.5, y - 7.5)
            if d <= 6.7:
                tone = ("crimson", 4) if d > 4.9 else ("bone", 7) if d > 3.1 else ("crimson", 5) if d > 1.3 else ("light", 0)
                if tone[0] == "crimson" and x + y < 13:
                    tone = ("crimson", tone[1] + 1)  # the lit side of the rings
                ic.put(x, y, tone)
    ic.outline()
    return ic


def crit_damage() -> Icon:  # a jagged impact burst
    ic = Icon(N)
    radii = (7.8, 4.0, 6.4, 3.6, 7.6, 4.2, 6.2, 3.6, 7.8, 4.0, 6.6, 3.8, 7.4, 4.2, 6.2, 3.6)
    pts = []
    for i, r in enumerate(radii):
        a = math.tau * i / len(radii) - math.pi / 2 + 0.2
        pts.append((8 + math.cos(a) * r, 8 + math.sin(a) * r))
    ic.poly(pts, ("crimson", 5))
    for (x, y) in list(ic.px):
        d = math.hypot(x - 7.5, y - 7.5)
        ic.px[(x, y)] = ("light", 0) if d < 1.7 else ("brass", 7) if d < 3.3 else ("crimson", 6) if x + y < 15 else ("crimson", 4)
    ic.outline()
    return ic


def multistrike() -> Icon:  # three claw slashes
    ic = Icon(N)
    for (x0, y0), (x1, y1) in (((6, 1), (1, 10)), ((10, 1), (4, 14)), ((14, 2), (9, 13))):
        n = y1 - y0
        for i in range(n + 1):
            t = i / n
            x = round(x0 + (x1 - x0) * t)
            wide = 1 + round(2 * math.sin(math.pi * t))  # thin at both ends, three pixels in the middle
            for k in range(wide):
                ic.put(x + k, y0 + i, ("light", 0) if k == 0 else ("azure", 7) if k == 1 else ("azure", 5))
    ic.outline()
    return ic


def damage_increase() -> Icon:  # a flame
    return sprite([
        "......a.......",
        ".....aa.......",
        ".....aba......",
        "....abba..a...",
        "....abbba.a...",
        "...abbbbaaa...",
        "..aabbcbbba...",
        "..abbccbbba...",
        "..abbcccbba...",
        "..abbcdccba...",
        "..abbcddcba...",
        "...abcddca....",
        "....abccba....",
        ".....aaaa.....",
    ], {"a": ("crimson", 4), "b": ("crimson", 6), "c": ("brass", 6), "d": ("light", 0)})


def lifesteal() -> Icon:  # two fangs over a drop of blood
    return sprite([
        "..eee....eee..",
        "..eee....eee..",
        "..fee....eef..",
        "...ee....ee...",
        "...fe.aa.ef...",
        "....e.aa.e....",
        ".....abba.....",
        ".....abba.....",
        "....abbbba....",
        "....acbbba....",
        "....abbbba....",
        "....abbbba....",
        ".....abba.....",
        "......aa......",
    ], {"e": ("bone", 7), "f": ("bone", 5), "a": ("crimson", 3), "b": ("crimson", 5), "c": ("crimson", 7)})


def armor() -> Icon:  # a steel great helm with its sight and a brass cross (the cuirass it replaced read as a vest)
    return sprite([
        "....mmmmmm....",
        "...mllllmmk...",
        "..mlwllmmmkk..",
        "..mllllmmmkk..",
        "..mllllmmmkk..",
        "..ssssssssss..",
        "..mllbbmmmkk..",
        "..mllbbmmmkk..",
        "..mllbbmkmkk..",
        "..mllbbmmmkk..",
        "..mllbbmkmkk..",
        "...mlbbmmkk...",
        "....mbbmkk....",
        "......kk......",
    ], {"k": ("ink", 3), "m": ("ink", 5), "l": ("ink", 7), "w": ("ink", 9), "s": ("ink", 0), "b": ("brass", 5)})


def magic_resist() -> Icon:  # a kite shield with a rune
    return sprite([
        ".aaaaaaaaaaaa.",
        ".abbbbbbbbbbc.",
        ".abbbbrrbbbbc.",
        ".abbbrrrrbbbc.",
        ".abbbbrrbbbbc.",
        ".abbbbrrbrbbc.",
        ".abbbbrrrbbbc.",
        "..abbbrrbbbc..",
        "..abbbrrbbbc..",
        "...abbbbbbc...",
        "...abbbbbbc...",
        "....abbbbc....",
        ".....abbc.....",
        "......cc......",
    ], {"a": ("azure", 7), "b": ("azure", 4), "c": ("azure", 2), "r": ("light", 0)})


def health() -> Icon:  # a heart
    return sprite([
        "..............",
        "..aaa....aaa..",
        ".abbba..abbbc.",
        "abdbbbaabbbbbc",
        "abdbbbbbbbbbbc",
        "abbbbbbbbbbbbc",
        "abbbbbbbbbbbbc",
        ".abbbbbbbbbbc.",
        "..abbbbbbbbc..",
        "...abbbbbbc...",
        "....abbbbc....",
        ".....abbc.....",
        "......cc......",
        "..............",
    ], {"a": ("crimson", 6), "b": ("crimson", 5), "c": ("crimson", 3), "d": ("crimson", 7)})


def hp_regen() -> Icon:  # a sprout
    return sprite([
        "..............",
        ".aaaa.........",
        "abbbba....aaa.",
        "abbbbba..abbbc",
        "abbbbbbaabbbbc",
        ".abbbbbsbbbbc.",
        "..cbbbbsbbbc..",
        "...ccccsccc...",
        ".......s......",
        ".......s......",
        "......ss......",
        "......s.......",
        ".....sss......",
        "....sssss.....",
    ], {"a": ("moss", 8), "b": ("moss", 6), "c": ("moss", 4), "s": ("moss", 5)})


def block() -> Icon:  # a round buckler with a boss
    ic = Icon(N)
    for y in range(N):
        for x in range(N):
            d = math.hypot(x - 7.5, y - 7.5)
            if d <= 6.7:
                if d > 5.0:
                    tone = ("brass", 6) if x + y < 14 else ("brass", 4)
                elif d > 2.4:
                    tone = ("leather", 5) if x + y < 13 else ("leather", 3)
                else:
                    tone = ("ink", 8) if x + y < 15 else ("ink", 6)
                ic.put(x, y, tone)
    ic.dots([(7, 7)], ("light", 0))
    ic.dots([(7, 2), (2, 7), (13, 8), (8, 13)], ("brass", 7))  # rivets on the rim
    ic.outline()
    return ic


def cooldown_reduction() -> Icon:  # an hourglass
    return sprite([
        ".vvvvvvvvvvvv.",
        ".VVVVVVVVVVVV.",
        "..g........g..",
        "..gssssssssg..",
        "...gssssssg...",
        "....gssssg....",
        ".....gssg.....",
        ".....g.sg.....",
        "....g..s.g....",
        "...g...s..g...",
        "..g...sss..g..",
        "..g.sssssssg..",
        ".VVVVVVVVVVVV.",
        ".vvvvvvvvvvvv.",
    ], {"v": ("violet", 6), "V": ("violet", 4), "g": ("bone", 7), "s": ("brass", 6)})


def heal_power() -> Icon:  # a cross of light
    return sprite([
        "..............",
        ".....aaaa.....",
        ".....abbc.....",
        ".....abbc.....",
        ".....abbc.....",
        ".aaaaaddcaaaa.",
        ".abbbdddddbbc.",
        ".abbbdddddbbc.",
        ".cccccddccccc.",
        ".....abbc.....",
        ".....abbc.....",
        ".....abbc.....",
        ".....cccc.....",
        "..............",
    ], {"a": ("brass", 7), "b": ("brass", 6), "c": ("brass", 4), "d": ("light", 0)})


def damage_reduction() -> Icon:  # a stone wall
    ic = Icon(N)
    for y in range(1, 15):
        band, within = (y - 1) // 4, (y - 1) % 4
        for x in range(1, 15):
            shift = 0 if band % 2 == 0 else 4
            col = (x - 1 + shift) % 7
            if within == 3 and band < 3:
                tone = ("bone", 1)  # mortar between courses
            elif col == 6:
                tone = ("bone", 1)  # mortar between stones
            else:
                tone = ("bone", 6) if within == 0 else ("bone", 3) if within == 2 or col == 5 else ("bone", 5)
            ic.put(x, y, tone)
    for x in range(1, 15):  # the last course is two rows only: close it with a shaded foot
        ic.put(x, 14, ("bone", 3) if (x - 1 + 4) % 7 != 6 else ("bone", 1))
    ic.outline()
    return ic


STATS = [
    ("attackDamage", "Daño de ataque", attack_damage),
    ("attackSpeed", "Velocidad de ataque", attack_speed),
    ("critChance", "Prob. de crítico", crit_chance),
    ("critDamage", "Daño crítico", crit_damage),
    ("multistrike", "Golpe múltiple", multistrike),
    ("damageIncrease", "Aumento de daño", damage_increase),
    ("lifesteal", "Robo de vida", lifesteal),
    ("armor", "Armadura", armor),
    ("magicResist", "Resistencia mágica", magic_resist),
    ("health", "Vida", health),
    ("hpRegen", "Regeneración", hp_regen),
    ("block", "Bloqueo", block),
    ("cooldownReduction", "Reducción de enfriamiento", cooldown_reduction),
    ("healPower", "Poder de curación", heal_power),
    ("damageReduction", "Reducción de daño", damage_reduction),
]


def build() -> list[dict]:
    return [{
        "key": "stats",
        "title": "Estadísticas",
        "note": "Quince glifos de 16 × 16 para acompañar a los números en paneles y descripciones: cada uno con su color y su forma.",
        "items": [(f"stat_{key}", name, fn().image()) for key, name, fn in STATS],
    }]
