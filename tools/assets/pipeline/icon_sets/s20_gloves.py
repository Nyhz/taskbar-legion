"""Gloves: three families × five ranks.

Second version. The first one (a fist seen from the side for plate, a comb of thin fingers for leather, a
blessing gesture for cloth) was rejected: "los guanteletes son los 3 materiales bastante malos, los de placas
parece que tienen los dedos torcidos". Every glove is now the same honest view — the back of a right hand, four
straight fingers up, thumb out to the left, cuff below — built by one function, so the hand is always right and
the families differ in what a glove is made of: plate is broad and jointed with a flared cuff, leather is a
plain glove on a laced bracer, cloth is slender with a falling sleeve.
"""
from __future__ import annotations

from ..icons import RANK_TIER, Icon, framed


def hand(ic: Icon, ramp: str, lo: int, mid: int, hi: int, *, fw: int = 3, x0: int = 11, tops: tuple[int, int, int, int] = (7, 4, 5, 8),
         knuckle: int = 14, wrist: int = 21) -> tuple[int, int]:
    """The back of a hand: four fingers of width `fw` starting at x0 (one pixel apart), a palm block down to
    `wrist`, and a thumb. Lit from the left. Returns the palm's left and right x."""
    left, right = x0 - 1, x0 + 4 * (fw + 1) - 1
    for i, top in enumerate(tops):
        x = x0 + i * (fw + 1)
        ic.rect(x, top + 1, x + fw - 1, knuckle, (ramp, mid))
        ic.rect(x, top + 1, x, knuckle, (ramp, hi))  # the lit edge of each finger
        ic.rect(x + fw - 1, top + 2, x + fw - 1, knuckle, (ramp, lo))
        ic.rect(x + (1 if fw >= 3 else 0), top, x + fw - 1 - (1 if fw >= 3 else 0), top, (ramp, hi))  # a rounded tip
    ic.rect(left, knuckle, right, wrist, (ramp, mid))  # the back of the hand
    ic.rect(left, knuckle, left + 1, wrist, (ramp, hi))
    ic.rect(right - 1, knuckle + 1, right, wrist, (ramp, lo))
    ic.rect(left + 2, wrist - 1, right, wrist, (ramp, lo))
    for i in range(4):  # knuckles
        ic.put(x0 + i * (fw + 1) + fw // 2, knuckle, (ramp, hi))
    # The thumb: one more finger, as thick as the others, leaving the heel of the hand at an angle. (It was a
    # block nearly as wide as the palm: "los pulgares… como muy gordos".)
    ic.limb((left + 1.5, knuckle + 5.5), (left - 3.5, knuckle - 0.5), fw + 0.8, fw, ramp, (lo, mid, hi))
    return left, right


def flared_cuff(ic: Icon, ramp: str, lo: int, mid: int, hi: int, left: int, right: int, top: int = 22, flare: int = 4) -> None:
    """A gauntlet's cuff: a band at the wrist, then a plate that widens downwards."""
    ic.rect(left + 1, top, right - 1, top + 1, (ramp, lo))
    a, b = left - 1, right + 1
    ic.poly([(a, top + 2), (b + 1, top + 2), (b + flare, 30), (a - flare, 30)], (ramp, mid))
    ic.poly([(a, top + 2), ((a + b) // 2, top + 2), ((a + b) // 2 - 1, 30), (a - flare, 30)], (ramp, hi))
    ic.poly([(b - 2, top + 2), (b + 1, top + 2), (b + flare, 30), (b + flare - 4, 30)], (ramp, lo))
    ic.path([(a, top + 2), (b, top + 2)], (ramp, min(hi + 1, 9)))


def bracer(ic: Icon, ramp: str, lo: int, mid: int, hi: int, left: int, right: int, top: int = 22) -> None:
    """A straight laced bracer under a leather glove."""
    ic.rect(left, top, right, 30, (ramp, mid))
    ic.rect(left, top, left + 1, 30, (ramp, hi))
    ic.rect(right - 1, top, right, 30, (ramp, lo))
    ic.path([(left, top), (right, top)], (ramp, lo))


def sleeve(ic: Icon, ramp: str, lo: int, mid: int, hi: int, left: int, right: int, top: int = 22) -> None:
    """A cloth sleeve falling open below the wrist, with a fold."""
    ic.poly([(left, top), (right, top), (right + 5, 30), (left - 5, 30)], (ramp, mid))
    ic.poly([(left, top), ((left + right) // 2, top), ((left + right) // 2 - 2, 30), (left - 5, 30)], (ramp, hi))
    ic.poly([(right - 2, top), (right, top), (right + 5, 30), (right + 1, 30)], (ramp, lo))
    ic.path([((left + right) // 2 + 2, top + 1), ((left + right) // 2 + 4, 29)], (ramp, lo))


def lames(ic: Icon, tone, x0: int, tops, fw: int = 3, rows: tuple[int, ...] = (8, 11)) -> None:
    """The joints of a plate finger: a dark line across each finger at these rows."""
    for i, top in enumerate(tops):
        x = x0 + i * (fw + 1)
        for y in rows:
            if y > top + 1:
                ic.rect(x, y, x + fw - 1, y, tone)


TOPS = (7, 4, 5, 8)


def plate(rank: int) -> Icon:
    ic = Icon()
    glow = []
    if rank == 1:  # a rusted mitten gauntlet: the fingers under two plain plates
        left, right = hand(ic, "ink", 3, 5, 6)
        lames(ic, ("ink", 2), 11, TOPS, rows=(10,))
        ic.dots([(13, 9), (20, 7), (24, 12), (15, 17), (22, 18)], ("leather", 4))  # rust
        flared_cuff(ic, "ink", 3, 4, 5, left, right, flare=3)
        ic.rect(left + 1, 22, right - 1, 23, ("leather", 3))  # the strap that holds it
        ic.dots([(18, 22)], ("leather", 5))
    elif rank == 2:  # an articulated steel gauntlet
        left, right = hand(ic, "ink", 4, 6, 8)
        lames(ic, ("ink", 3), 11, TOPS)
        ic.rect(left, 14, right, 15, ("ink", 7))  # knuckle plate
        ic.dots([(12, 14), (16, 14), (20, 14), (24, 14)], ("ink", 9))
        flared_cuff(ic, "ink", 4, 6, 8, left, right)
        ic.dots([(10, 27), (18, 27), (26, 27)], ("ink", 9))  # rivets
    elif rank == 3:  # fluted steel, brass knuckles and rim, a crimson lining
        left, right = hand(ic, "ink", 4, 7, 9)
        lames(ic, ("ink", 4), 11, TOPS)
        ic.rect(left, 13, right, 15, ("brass", 5))
        ic.path([(left, 13), (right, 13)], ("brass", 7))
        ic.dots([(12, 14), (16, 14), (20, 14), (24, 14)], ("brass", 3))
        for x in (13, 17, 21):  # flutes on the back of the hand
            ic.path([(x, 17), (x, 20)], ("ink", 5))
        flared_cuff(ic, "ink", 4, 7, 9, left, right)
        ic.path([(6, 29), (30, 29)], ("brass", 5))
        ic.rect(6, 30, 30, 30, ("crimson", 4))
        for x in (12, 18, 24):
            ic.path([(x, 25), (x, 28)], ("ink", 5))
    elif rank == 4:  # gilded, a jewel on the back of the hand, an ermine-edged cuff
        left, right = hand(ic, "brass", 3, 5, 7)
        lames(ic, ("brass", 2), 11, TOPS)
        ic.rect(left, 14, right, 15, ("brass", 6))
        ic.poly([(18, 15), (21, 18), (18, 21), (15, 18)], ("azure", 5))  # the jewel
        ic.poly([(18, 15), (18, 18), (15, 18)], ("azure", 7))
        ic.dots([(17, 17)], ("light", 0))
        flared_cuff(ic, "brass", 3, 5, 7, left, right)
        ic.rect(5, 29, 31, 30, ("bone", 7))  # ermine
        ic.dots([(8, 30), (13, 29), (18, 30), (23, 29), (28, 30)], ("ink", 1))
        ic.dots([(10, 26), (26, 26)], ("crimson", 5))
    else:  # of the Rift: dark plates, crystal claws on the fingertips
        left, right = hand(ic, "ink", 2, 4, 6, tops=(9, 7, 8, 10))
        lames(ic, ("ink", 1), 11, (9, 7, 8, 10), rows=(12,))
        for i, top in enumerate((9, 7, 8, 10)):  # claws
            x = 11 + i * 4
            ic.poly([(x, top), (x + 3, top), (x + 1.5, top - 5)], ("violet", 6))
            ic.path([(x, top), (x + 1, top - 4)], ("violet", 8))
        ic.poly([(18, 15), (21, 18), (18, 21), (15, 18)], ("violet", 5))
        ic.dots([(18, 18)], ("violet", 8))
        ic.path([(12, 16), (14, 19), (13, 21)], ("violet", 6))  # cracks
        flared_cuff(ic, "ink", 2, 4, 6, left, right)
        ic.path([(9, 26), (12, 29)], ("violet", 6))
        ic.path([(27, 25), (25, 29)], ("violet", 5))
        glow = [(18, 1)]
    ic.outline()
    ic.glow(glow, ("violet", 8))
    return ic


def leather(rank: int) -> Icon:
    ic = Icon()
    glow = []
    if rank == 1:  # a plain hide glove
        left, right = hand(ic, "leather", 2, 4, 6)
        ic.dots([(left + 2, 16), (left + 2, 18), (left + 2, 20)], ("bone", 5))  # stitching
        bracer(ic, "leather", 2, 3, 5, left + 1, right - 1)
        ic.path([(left + 1, 26), (right - 1, 26)], ("leather", 2))
    elif rank == 2:  # a hunter's fingerless glove on a green bracer
        left, right = hand(ic, "leather", 2, 4, 6)
        for i, top in enumerate(TOPS):  # bare fingertips
            x = 11 + i * 4
            ic.rect(x, top + 1, x + 2, top + 4, ("skin", 5))
            ic.rect(x, top + 1, x, top + 4, ("skin", 6))
            ic.rect(x + 2, top + 2, x + 2, top + 4, ("skin", 3))
            ic.rect(x + 1, top, x + 1, top, ("skin", 6))
            ic.rect(x, top + 5, x + 2, top + 5, ("leather", 2))  # the cut edge
        bracer(ic, "moss", 2, 4, 6, left + 1, right - 1)
        for y in (24, 28):  # straps
            ic.rect(left + 1, y, right - 1, y, ("leather", 3))
            ic.dots([(right - 3, y)], ("brass", 6))
    elif rank == 3:  # a studded shooting glove, brass buckle, crimson cord
        left, right = hand(ic, "leather", 1, 3, 5)
        ic.dots([(12, 15), (16, 15), (20, 15), (24, 15)], ("brass", 6))  # studs over the knuckles
        ic.dots([(14, 18), (18, 18), (22, 18)], ("brass", 5))
        bracer(ic, "leather", 1, 3, 5, left + 1, right - 1)
        ic.rect(left + 1, 24, right - 1, 25, ("brass", 4))
        ic.rect(16, 23, 20, 26, ("brass", 6))  # buckle
        ic.dots([(18, 24), (18, 25)], ("leather", 1))
        for y in (27, 29):  # lacing
            ic.path([(13, y), (23, y)], ("crimson", 5))
    elif rank == 4:  # dark hide with bone claws and a wolf-fur cuff
        left, right = hand(ic, "ink", 2, 4, 6, tops=(8, 6, 7, 9))
        for i, top in enumerate((8, 6, 7, 9)):
            x = 11 + i * 4
            ic.poly([(x, top), (x + 3, top), (x + 1.5, top - 4)], ("bone", 7))
            ic.path([(x + 2, top), (x + 1.5, top - 3)], ("bone", 4))
        ic.rect(left, 22, right, 30, ("ink", 6))  # fur
        for x in range(left - 1, right + 2, 3):
            ic.poly([(x, 22), (x + 3, 22), (x + 1.5, 19.5)], ("ink", 7))
            ic.poly([(x, 30), (x + 3, 30), (x + 1.5, 32)], ("ink", 5))
        for x in range(left + 1, right, 4):
            ic.path([(x, 24), (x + 1, 28)], ("ink", 8))
        ic.rect(left, 26, right, 26, ("brass", 5))
    else:  # of the Rift: dark hide, a star on the back, violet lacing
        left, right = hand(ic, "leather", 0, 2, 3)
        for i, top in enumerate(TOPS):  # fingertips of crystal
            x = 11 + i * 4
            ic.rect(x, top, x + 2, top + 2, ("violet", 6))
            ic.rect(x, top, x, top + 2, ("violet", 8))
        ic.dots([(18, 17), (17, 18), (19, 18), (18, 19), (18, 18)], ("violet", 7))
        ic.dots([(18, 18)], ("light", 0))
        bracer(ic, "leather", 0, 2, 3, left + 1, right - 1)
        for y in (24, 26, 28):
            ic.path([(13, y), (23, y + 1)], ("violet", 6))
        glow = [(6, 6)]
    ic.outline()
    ic.glow(glow, ("violet", 8))
    return ic


def cloth(rank: int) -> Icon:
    ic = Icon()
    glow = []
    thin = dict(fw=2, x0=12, tops=(7, 4, 5, 8))  # a slender hand: fingers two wide
    if rank == 1:  # linen wraps: bandaged palm and wrist, fingers bare
        left, right = hand(ic, "skin", 3, 5, 6, **thin)
        ic.rect(left, 15, right, 21, ("bone", 6))
        ic.rect(left, 15, left + 1, 21, ("bone", 7))
        ic.rect(right - 1, 15, right, 21, ("bone", 4))
        for y in (17, 19):  # the turns of the bandage
            ic.path([(left, y + 1), (right, y - 1)], ("bone", 4))
        ic.rect(left + 1, 22, right - 1, 29, ("bone", 6))
        ic.rect(left + 1, 22, left + 2, 29, ("bone", 7))
        ic.rect(right - 2, 22, right - 1, 29, ("bone", 4))
        for y in (24, 27):
            ic.path([(left + 1, y + 1), (right - 1, y - 1)], ("bone", 4))
        ic.poly([(right - 1, 27), (right + 4, 29), (right + 3, 31), (right - 1, 29)], ("bone", 5))  # the loose end
        ic.rect(left + 1, 29, right - 1, 30, ("sea", 5))
    elif rank == 2:  # an acolyte's teal glove, gold at the hem
        left, right = hand(ic, "sea", 3, 5, 7, **thin)
        sleeve(ic, "sea", 3, 5, 7, left + 1, right - 1)
        ic.path([(left - 4, 29), (right + 4, 29)], ("brass", 5))
        ic.path([(left - 4, 30), (right + 4, 30)], ("brass", 3))
        ic.path([(left + 1, 22), (right - 1, 22)], ("brass", 5))
    elif rank == 3:  # white, a gold cross embroidered on the back, a ring
        left, right = hand(ic, "bone", 4, 6, 7, **thin)
        ic.rect(17, 15, 17, 20, ("brass", 5))  # the cross
        ic.rect(15, 17, 19, 17, ("brass", 5))
        ic.rect(15, 9, 16, 10, ("brass", 6))  # a ring on the middle finger
        ic.dots([(15, 9)], ("crimson", 5))
        sleeve(ic, "bone", 4, 6, 7, left + 1, right - 1)
        ic.path([(left - 4, 29), (right + 4, 29)], ("brass", 5))
        ic.path([(left + 1, 22), (right - 1, 22)], ("brass", 6))
        ic.dots([(left - 2, 27), (17, 26), (right + 2, 27)], ("brass", 5))
    elif rank == 4:  # cloth of gold, a jewel on the back, pearls at the cuff
        left, right = hand(ic, "brass", 4, 6, 7, **thin)
        for dx, dy in ((0, -3), (0, 3), (-3, 0), (3, 0), (-2, -2), (2, -2), (-2, 2), (2, 2)):  # a sun worked in dark gold thread
            ic.put(17 + dx, 18 + dy, ("brass", 3))
        ic.dots([(17, 17), (16, 18), (18, 18), (17, 19)], ("brass", 3))
        ic.dots([(17, 18)], ("azure", 7))
        sleeve(ic, "brass", 4, 6, 7, left + 1, right - 1)
        ic.path([(left + 1, 22), (right - 1, 22)], ("bone", 7))
        for x in range(left - 4, right + 5, 3):
            ic.put(x, 30, ("bone", 7))  # pearls
        ic.path([(left - 4, 29), (right + 4, 29)], ("brass", 4))
    else:  # of the void: a dark glove full of stars under a violet hem
        left, right = hand(ic, "dusk", 1, 2, 3, **thin)
        ic.dots([(13, 9), (16, 6), (19, 8), (22, 11), (14, 17), (20, 19), (17, 16)], ("violet", 8))
        ic.path([(12, 14), (22, 14)], ("violet", 6))
        sleeve(ic, "dusk", 1, 2, 3, left + 1, right - 1)
        ic.path([(left - 4, 29), (right + 4, 29)], ("violet", 7))
        ic.dots([(left - 2, 26), (18, 25), (right + 1, 27)], ("violet", 8))
        ic.path([(left + 1, 22), (right - 1, 22)], ("violet", 6))
        glow = [(6, 5), (27, 13)]
    ic.outline()
    ic.glow(glow, ("violet", 8))
    return ic


NAMES = {
    "plate": ("Guantes · Placa · Knight", "Guanteletes de dedos articulados y bocamanga acampanada.",
              ["Manopla oxidada", "Guantelete articulado", "Guantelete acanalado", "Guantelete dorado", "Garra de la Grieta"], plate),
    "leather": ("Guantes · Cuero · Ranger", "Guantes de piel sobre el brazal del arquero.",
                ["Guante de pellejo", "Mitón de montero", "Guante de tiro tachonado", "Guante de lobero", "Guante de la Grieta"], leather),
    "cloth": ("Guantes · Tela · Priest", "Guantes finos con la manga cayendo bajo la muñeca.",
              ["Vendas de lino", "Guante de acólito", "Guante bordado", "Guante de hilo de oro", "Guante del vacío"], cloth),
}


def build() -> list[dict]:
    return [{"key": f"gloves_{fam}", "title": title, "note": note,
             "items": [(f"gloves_{fam}_{r}", names[r - 1], framed(draw(r), RANK_TIER[r])) for r in range(1, 6)]}
            for fam, (title, note, names, draw) in NAMES.items()]
