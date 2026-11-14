"""Tech panel: one sign per upgrade of `src/data/techTree.ts` (24×24, drawn on a 22×22 field and outlined), the
round seals they sit on (34×34 — round so an upgrade is never mistaken for an item, whose frames are square), four
16×16 group marks and the "complete" tick.

The five chest signs share one small chest drawn in the colours of the three chest icons (planks and iron; iron
and brass; gold over crimson), so "which chest" is read from the same cue everywhere: a chest under a spark is its
drop chance, two chests stacked is its storage.
"""
from __future__ import annotations

import math

from PIL import Image

from ..icons import Icon
from ..rig import Cel, Tone
from .s80_stats import sprite

E = ".............."

# --- shared pieces -----------------------------------------------------------------------------------------------

CHEST_TONES: dict[str, dict[str, Tone]] = {
    #        lid light, lid, seam, body, body shade, strap, strap light, lock
    "normal": {"h": ("leather", 6), "l": ("leather", 5), "k": ("leather", 1), "b": ("leather", 4), "s": ("leather", 2), "m": ("ink", 5), "M": ("ink", 7), "g": ("ink", 7)},
    "stage": {"h": ("ink", 8), "l": ("ink", 6), "k": ("ink", 0), "b": ("ink", 4), "s": ("ink", 2), "m": ("brass", 4), "M": ("brass", 6), "g": ("brass", 6)},
    "zone": {"h": ("brass", 7), "l": ("brass", 5), "k": ("crimson", 1), "b": ("crimson", 3), "s": ("crimson", 1), "m": ("brass", 5), "M": ("brass", 7), "g": ("sea", 6)},
}

CHEST = [  # 14 × 10
    ".hhhhhhhhhhhh.",
    "lMlllllllllMll",
    "lmllllllllllml",
    "lmllllllllllml",
    "kkkkkkkkkkkkkk",
    "bMbbbbggbbbMbb",
    "bmbbbbggbbbmbb",
    "bmbbbbbbbbbmbb",
    "bmbbbbbbbbbmbb",
    "ssssssssssssss",
]


def _chest(ic: Icon, x: int, y: int, kind: str) -> None:
    ic.stamp(CHEST, CHEST_TONES[kind], x, y)


def _spark(ic: Icon, cx: int, cy: int, r: int = 3, ramp: str = "brass") -> None:
    """A four-pointed spark: white heart, warm arms."""
    for d in range(1, r + 1):
        tone: Tone = (ramp, 7 if d < r else 6)
        for dx, dy in ((d, 0), (-d, 0), (0, d), (0, -d)):
            ic.put(cx + dx, cy + dy, tone)
    ic.put(cx, cy, ("light", 0))
    if r >= 3:
        for dx, dy in ((1, 1), (-1, 1), (1, -1), (-1, -1)):
            ic.put(cx + dx, cy + dy, (ramp, 5))


def _sign() -> Icon:
    return Icon(24)


def _done(ic: Icon) -> Image.Image:
    ic.outline()
    return ic.image()


# --- economy -----------------------------------------------------------------------------------------------------

def gold() -> Image.Image:  # three stacks of coins, each taller: more gold per kill
    ic = _sign()
    for x0, n in ((1, 2), (8, 4), (15, 6)):
        for i in range(n):
            y = 20 - i * 3
            for x in range(x0, x0 + 7):
                edge = x in (x0, x0 + 6)
                ic.put(x, y, ("brass", 3 if edge else 4))          # the rim
                ic.put(x, y - 1, ("brass", 4 if edge else 5))
                if not edge:
                    ic.put(x, y - 2, ("brass", 6))                  # the face of the coin above shows only on top
        top = 20 - (n - 1) * 3 - 2
        ic.put(x0 + 1, top, ("brass", 7))
        ic.put(x0 + 2, top, ("brass", 7))
    return _done(ic)


def xp() -> Image.Image:  # an open book under the blue star of experience
    ic = _sign()
    for x in range(1, 21):
        d = abs(x - 10.5)
        top = 13 if d < 1 else 12 if d < 3 else 11 if d < 8 else 12
        left = x < 11
        for y in range(top, top + 8):
            ic.put(x, y, ("bone", 7 if left else 6))
        if 2 < d < 8:
            for y in (top + 2, top + 4):
                ic.put(x, y, ("bone", 4))
        if d < 1:
            for y in range(top, top + 8):
                ic.put(x, y, ("bone", 3))
        ic.put(x, top + 8, ("azure", 5 if left else 4))            # the cover under the pages
        ic.put(x, top + 9, ("azure", 3))
    for y in range(12, 22):
        ic.put(0, y, ("azure", 5))
        ic.put(21, y, ("azure", 3))
    for dx, dy, t in ((0, -4, 6), (0, -3, 7), (0, -2, 8), (0, -1, 8), (0, 0, 8), (0, 1, 7), (0, 2, 6),
                      (-1, -1, 6), (1, -1, 6), (-1, 0, 7), (1, 0, 7), (-2, 0, 6), (2, 0, 6), (-3, 0, 5), (3, 0, 5), (-1, 1, 6), (1, 1, 6)):
        ic.put(10 + dx, 5 + dy, ("azure", t))
        ic.put(11 + dx, 5 + dy, ("azure", t))
    return _done(ic)


def offline() -> Image.Image:  # a tent under the moon: what the party earns while you are away
    ic = _sign()
    for y in range(9, 21):                                           # tent: lit left face, shaded right
        half = (y - 8) * 0.8
        for x in range(int(round(9 - half)), int(round(9 + half)) + 1):
            ic.put(x, y, ("dusk", 6 if x < 9 else 4))
        ic.put(9, y, ("dusk", 8))
    for y in range(14, 21):                                          # the opening
        half = (y - 13) * 0.42
        for x in range(int(round(9 - half)), int(round(9 + half)) + 1):
            ic.put(x, y, ("ink", 1))
    for x in range(0, 22):
        ic.put(x, 21, ("moss", 3))
    for y in range(0, 9):                                            # crescent
        for x in range(12, 22):
            if math.hypot(x - 16.5, y - 4.0) <= 4.2 and math.hypot(x - 18.6, y - 2.8) > 3.6:
                ic.put(x, y, ("bone", 7 if x < 15 else 6))
    return _done(ic)


# --- chests ------------------------------------------------------------------------------------------------------

def drop(kind: str) -> Image.Image:  # a chest under a spark: it turns up more often
    ic = _sign()
    _chest(ic, 4, 11, kind)
    _spark(ic, 11, 4, 3)
    return _done(ic)


def storage(kind: str) -> Image.Image:  # two of them stacked: room for more
    ic = _sign()
    _chest(ic, 7, 1, kind)
    _chest(ic, 1, 11, kind)
    for x in range(15, 21):                                          # the upper one stands on a shelf bracket
        ic.put(x, 11, ("ink", 5))
        ic.put(x, 12, ("ink", 3))
    ic.put(19, 13, ("ink", 3))
    ic.put(19, 14, ("ink", 3))
    return _done(ic)


def gem() -> Image.Image:  # a cut gem, flashing
    ic = _sign()
    rows = [
        "....hhhhhhhh....",
        "...hHHHhhhhhl...",
        "..hHWHhhhhhlll..",
        ".hHHHhhhhhhllll.",
        "mmmmmmmmmmmmmmmm",
        ".mMMmmmmmmmdddd.",
        "..mMMmmmmmddd...",
        "...mMmmmmddd....",
        "....mMmmddd.....",
        ".....mmmdd......",
        "......mmd.......",
        ".......m........",
    ]
    ic.stamp(rows, {"h": ("sea", 6), "H": ("sea", 7), "W": ("sea", 8), "l": ("sea", 5), "m": ("sea", 4), "M": ("sea", 6), "d": ("sea", 3)}, 1, 8)
    _spark(ic, 17, 4, 3, "sea")
    return _done(ic)


# --- utility -----------------------------------------------------------------------------------------------------

def auto_open() -> Image.Image:  # a chest open on its own, light inside, and a clock: it opens every so often
    ic = _sign()
    t = CHEST_TONES["normal"]
    for y, (x0, x1) in enumerate(((3, 14), (2, 15), (2, 15), (2, 15))):       # the lid thrown back
        for x in range(x0, x1 + 1):
            ic.put(x, 2 + y, t["h"] if y == 0 else t["l"])
    for x in (4, 13):
        for y in range(3, 6):
            ic.put(x, y, t["m"])
    for x in range(2, 16):                                                    # the light in the mouth
        ic.put(x, 6, ("brass", 6))
        ic.put(x, 7, ("light", 0) if 4 <= x <= 13 else ("brass", 7))
        ic.put(x, 8, ("brass", 6))
    ic.stamp(CHEST[4:], t, 2, 9)
    for y in range(11, 22):                                                   # the clock
        for x in range(11, 22):
            d = math.hypot(x - 16, y - 16)
            if d <= 5.2:
                ic.put(x, y, ("ink", 0) if d > 4.2 else ("bone", 7))
    for xy in ((16, 13), (16, 14), (16, 15), (16, 16), (17, 16), (18, 16)):
        ic.put(*xy, ("ink", 1))
    ic.put(16, 12, ("bone", 4))
    ic.put(16, 20, ("bone", 4))
    ic.put(12, 16, ("bone", 4))
    ic.put(20, 16, ("bone", 4))
    return _done(ic)


BUST = [  # 11 × 13: a hooded head and shoulders
    "...hhhhh...",
    "..hHHHHHd..",
    "..hHfffHd..",
    "..hHfffHd..",
    "..hHHfHHd..",
    "...hHHHd...",
    "..hHHHHHd..",
    ".hHHHHHHHd.",
    "hHHHHHHHHHd",
    "hHHHHHHHHdd",
    "hHHHHHHHHdd",
    "hHHHHHHHHdd",
    "hHHHHHHHHdd",
]


def _bust(ic: Icon, x: int, y: int, ramp: str, far: bool = False) -> None:
    lo, mid, hi = (2, 3, 4) if far else (3, 5, 7)
    ic.stamp(BUST, {"h": (ramp, hi), "H": (ramp, mid), "d": (ramp, lo), "f": ("skin", 3 if far else 5)}, x, y)


def party() -> Image.Image:  # three figures in the colours of the three classes: one more in the party
    ic = _sign()
    _bust(ic, 0, 3, "moss", far=True)
    _bust(ic, 11, 3, "bone", far=True)
    part = Icon(24)
    _bust(part, 5, 9, "azure")
    part.outline()                                                            # the front one keeps its own outline over the others
    ic.px.update(part.px)
    return _done(ic)


def luck() -> Image.Image:  # the Cube as a die: the lucky throw of a synthesis
    ic = _sign()
    for y in range(22):
        for x in range(22):
            dx = x - 10.5
            top = 3 + abs(dx) * 0.5                                           # upper edges of the top face
            mid = 13 - abs(dx) * 0.5                                          # lower edges of the top face
            low = 21 - abs(dx) * 0.5                                          # bottom edges of the side faces
            if abs(dx) > 10:
                continue
            if top <= y < mid:
                ic.put(x, y, ("violet", 7))
            elif mid <= y <= low:
                ic.put(x, y, ("violet", 5 if dx < 0 else 3))
    for x in range(1, 21):                                                    # the lit front edges
        y = int(13 - abs(x - 10.5) * 0.5)
        ic.put(x, y, ("violet", 8))
    for y in range(13, 22):
        ic.put(10, y, ("violet", 6))
    for xy in ((10, 7), (11, 7), (10, 8), (11, 8)):                           # pips: one above, two left, three right
        ic.put(*xy, ("ink", 1))
    for xy in ((3, 13), (4, 13), (3, 14), (4, 14), (7, 18), (8, 18), (7, 19), (8, 19)):
        ic.put(*xy, ("light", 0))
    for xy in ((13, 15), (14, 15), (15, 16), (16, 16), (17, 13), (18, 13)):
        ic.put(xy[0], xy[1] + 1, ("violet", 8))
        ic.put(xy[0], xy[1], ("violet", 8))
    return _done(ic)


# --- seals, marks ------------------------------------------------------------------------------------------------

def seal(state: str) -> Image.Image:
    """34×34: the round plate an upgrade sits on. `off` not bought yet, `on` owned, `max` complete (brass)."""
    c = Cel(34, 34)
    for y in range(34):
        for x in range(34):
            dx, dy = x - 16.5, y - 16.5
            d = math.hypot(dx, dy)
            if d > 17.0:
                continue
            lit = (-dx - dy) / (d or 1.0)                                     # +1.4 facing the light … −1.4 away
            if d > 16.0 or 13.0 < d <= 14.0:
                c.put(x, y, ("ink", 0))
            elif d > 14.0:
                if state == "max":
                    c.put(x, y, ("brass", 6 if lit > 0.9 else 5 if lit > -0.2 else 3))
                elif state == "on":
                    c.put(x, y, ("ink", 7 if lit > 0.9 else 5 if lit > -0.2 else 4))
                else:
                    c.put(x, y, ("ink", 4 if lit > 0.9 else 3 if lit > -0.2 else 2))
            else:
                c.put(x, y, ("ink", 0) if state == "off" else ("ink", 1) if d > 12.0 and lit > 0.4 else ("ink", 2))
    return c.image()


def cat_economy() -> Icon:  # a tied purse
    return sprite([
        E,
        ".....ll.ll....",
        "....lLLlLLl...",
        ".....lLLLl....",
        "....ggggggg...",
        ".....lLLLl....",
        "....lLLLLLl...",
        "...lLLLLLLDl..",
        "..lLLLyyLLDDl.",
        "..lLLyYYyLDDl.",
        "..lLLyYYyLDDl.",
        "..lLLLyyLDDDl.",
        "...lDDDDDDDl..",
        "....lllllll...",
    ], {"l": ("leather", 2), "L": ("leather", 5), "D": ("leather", 3), "g": ("brass", 5), "y": ("brass", 5), "Y": ("brass", 7)})


def cat_utility() -> Icon:  # a cog
    return sprite([
        E,
        ".....aaaa.....",
        "..aa.aAAa.aa..",
        ".aAAaaAAaaAAa.",
        ".aAAAAAAAAAAa.",
        "..aAAAaaAAAa..",
        "aaaAAa..aAAaaa",
        "aAAAa....aAADa",
        "aAAAa....aADDa",
        "aaaAAa..aADaaa",
        "..aAAAaaADDa..",
        ".aAAAADDDDDDa.",
        ".aADaaADaaDDa.",
        "..aa.aDDa.aa..",
    ], {"a": ("ink", 3), "A": ("ink", 6), "D": ("ink", 4)})


def cat_drops() -> Icon:  # a spark coming down on a chest
    return sprite([
        "......w.......",
        "......w.......",
        "....wwWww.....",
        "......w.......",
        "......w.......",
        E,
        "..hhhhhhhhhh..",
        ".lLLLLLLLLLLl.",
        ".lLLLLLLLLLLl.",
        ".kkkkkggkkkkk.",
        ".bBBBBggBBBBb.",
        ".bBBBBBBBBBBb.",
        ".bbbbbbbbbbbb.",
        E,
    ], {"w": ("brass", 6), "W": ("light", 0), "h": ("leather", 6), "l": ("leather", 3), "L": ("leather", 5), "k": ("leather", 1), "b": ("leather", 2), "B": ("leather", 4), "g": ("ink", 7)})


def cat_storage() -> Icon:  # shelves with boxes
    return sprite([
        E,
        ".....bbbb.....",
        ".....bBBb.....",
        ".....bBBb.....",
        "ssssssssssssss",
        "sSSSSSSSSSSSSs",
        ".bbbb....bbbb.",
        ".bBBb....bBBb.",
        ".bBBb....bBBb.",
        "ssssssssssssss",
        "sSSSSSSSSSSSSs",
        ".s..........s.",
        ".s..........s.",
        E,
    ], {"b": ("leather", 3), "B": ("leather", 5), "s": ("ink", 5), "S": ("ink", 3)})


def done_mark() -> Icon:  # complete: a brass tick
    return sprite([
        E,
        E,
        "...........gg.",
        "..........gGg.",
        ".........gGGg.",
        "........gGGg..",
        ".gg....gGGg...",
        ".gGg..gGGg....",
        ".gGGggGGg.....",
        "..gGGGGg......",
        "...gGGg.......",
        "....gg........",
        E,
        E,
    ], {"g": ("brass", 3), "G": ("brass", 6)})


def build() -> list[dict]:
    signs = [
        ("tech_eco_gold", "Mercadeo · oro por enemigo", gold()), ("tech_eco_xp", "Erudición · experiencia por enemigo", xp()),
        ("tech_eco_offline", "Expedición · botín fuera del juego", offline()),
        ("tech_chest_drop_normal", "Botín común · cofres comunes", drop("normal")), ("tech_chest_drop_stage", "Despojos de jefe · cofres de jefe de etapa", drop("stage")),
        ("tech_chest_gem", "Ojo de gemas · gemas en los cofres", gem()),
        ("tech_store_normal", "Almacén · hueco de cofres comunes", storage("normal")), ("tech_store_stage", "Cámara · hueco de cofres de jefe de etapa", storage("stage")),
        ("tech_store_zone", "Relicario · hueco de cofres de jefe de mundo", storage("zone")),
        ("tech_auto_open", "Apertura automática", auto_open()), ("tech_party_size", "Reclutamiento · un héroe más", party()),
        ("tech_synth_luck", "Fortuna del transmutador · tirada de suerte del Cubo", luck()),
    ]
    return [
        {"key": "tech", "title": "Tecnología · un signo por mejora",
         "note": "Signos de 24 × 24 de las doce mejoras. Los cofres se leen igual en todas: bajo una chispa, su probabilidad de caer; dos apilados, su hueco de almacén.",
         "items": signs},
        {"key": "tech_chrome", "title": "Tecnología · sellos y marcas",
         "note": "El sello redondo donde va cada mejora (sin comprar, comprada, completa), las marcas de los cuatro grupos y la de «completa».",
         "items": [("tech_seal_off", "Sello · sin comprar", seal("off")), ("tech_seal_on", "Sello · comprada", seal("on")), ("tech_seal_max", "Sello · completa", seal("max")),
                   ("tech_cat_economy", "Economía", cat_economy().image()), ("tech_cat_utility", "Utilidad", cat_utility().image()),
                   ("tech_cat_drops", "Cofres · botín", cat_drops().image()), ("tech_cat_storage", "Cofres · almacén", cat_storage().image()),
                   ("tech_done", "Completa", done_mark().image())]},
    ]
