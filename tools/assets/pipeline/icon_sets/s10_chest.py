"""Chest armour: cuirasses (plate, Knight), jerkins and coats (leather, Ranger), robes and vestments (cloth,
Priest), five ranks each. The garment is shown by itself, front-on: neck opening, shoulders, waist.

The three families do not share a silhouette: plate is a rigid shell with armholes and a short fauld; leather is a
sleeveless coat with a V neck, lacing or straps and a split hem; cloth has sleeves and falls to the bottom edge.
"""
from __future__ import annotations

from typing import Sequence

from PIL import Image

from ..icons import RANK_TIER, Icon, framed, family_tint
from ..rig import Pt, Tone


def sym(left: Sequence[Pt]) -> list[Pt]:
    """A front-on outline from its left half (top centre → bottom centre), mirrored about x = 16."""
    return list(left) + [(32 - x, y) for x, y in reversed(left)]


def body(ic: Icon, pts: Sequence[Pt], ramp: str, lo: int, mid: int, hi: int, left: int = 12, right: int = 20) -> None:
    """A garment's main form: lit on its left flank, in shadow on its right."""
    for x, y in ic.poly_mask(list(pts)):
        ic.put(x, y, (ramp, hi if x < left else lo if x >= right else mid))


def both(ic: Icon, pts: Sequence[Pt], lit_tone: Tone, shade_tone: Tone) -> None:
    """The same detail on both sides: lit on the left, shaded on the right."""
    ic.poly(pts, lit_tone)
    ic.poly([(32 - x, y) for x, y in pts], shade_tone)


# ------------------------------------------------------------------------------------------- plate
CUIRASS = sym([(16, 10), (13, 9), (12, 5), (8, 6), (5, 11), (8, 15), (8, 21), (10, 24), (16, 24)])
FAULD = sym([(16, 24), (9, 24), (8, 28), (16, 29)])


def plate(rank: int) -> Icon:
    ic = Icon()
    glow: list[Pt] = []
    if rank == 1:  # a rusty breastplate hung on straps
        both(ic, [(9, 3), (12, 3), (12, 9), (9, 9)], ("leather", 4), ("leather", 3))  # shoulder straps
        body(ic, sym([(16, 8), (10, 8), (6, 13), (6, 21), (10, 26), (16, 28)]), "ink", 3, 5, 6, left=11, right=21)
        ic.path([(16, 9), (16, 27)], ("ink", 6))  # the ridge
        ic.path([(17, 9), (17, 27)], ("ink", 3))
        ic.rect(2, 17, 5, 18, ("leather", 4))  # the side straps
        ic.rect(26, 17, 29, 18, ("leather", 3))
        ic.dots([(3, 17), (28, 17)], ("ink", 6))  # buckles
        ic.dots([(9, 14), (10, 15), (21, 20), (12, 23), (22, 13), (13, 12)], ("leather", 4))  # rust
        ic.path([(20, 15), (22, 17)], ("ink", 2))  # a dent
        ic.path([(10, 8), (22, 8)], ("ink", 7))
    elif rank == 2:  # a soldier's riveted cuirass with a fauld of lames
        body(ic, CUIRASS, "ink", 4, 6, 8)
        ic.poly([(13, 9), (16, 12), (19, 9), (16, 10)], ("ink", 1))  # the neck
        ic.path([(16, 12), (16, 23)], ("ink", 8))
        ic.path([(17, 12), (17, 23)], ("ink", 4))
        ic.dots([(9, 8), (8, 16), (8, 20), (12, 13), (20, 13), (23, 8), (23, 16), (23, 20)], ("ink", 9))  # rivets
        body(ic, FAULD, "ink", 3, 5, 7)  # fauld of lames
        ic.path([(9, 24), (23, 24)], ("ink", 2))
        ic.path([(9, 26), (23, 26)], ("ink", 3))
        ic.path([(6, 12), (8, 15)], ("ink", 3))  # armhole shadow
    elif rank == 3:  # a knight's fluted cuirass, brass at the edges and a crimson sash
        body(ic, CUIRASS, "ink", 5, 7, 9)
        ic.poly([(13, 9), (16, 12), (19, 9), (16, 10)], ("ink", 1))
        for x0, x1 in ((10, 13), (13, 15), (19, 17), (22, 19)):  # flutes fanning up from the waist
            ic.path([(x0, 9), (x1, 19)], ("ink", 5) if x0 > 16 else ("ink", 6))
        ic.path([(16, 12), (16, 19)], ("ink", 9))
        ic.path([(12, 5), (13, 9), (16, 11), (19, 9), (20, 5)], ("brass", 5))  # gorget edge
        ic.path([(12, 5), (8, 6), (5, 11), (8, 15)], ("brass", 6))  # armholes
        ic.path([(20, 5), (24, 6), (27, 11), (24, 15)], ("brass", 4))
        body(ic, FAULD, "ink", 4, 6, 8)
        ic.path([(9, 26), (23, 26)], ("ink", 4))
        ic.path([(8, 28), (16, 29), (24, 28)], ("brass", 5))
        ic.rect(8, 20, 23, 23, ("crimson", 4))  # the sash
        ic.path([(8, 20), (23, 20)], ("crimson", 6))
        ic.path([(8, 23), (23, 23)], ("crimson", 2))
        ic.poly([(9, 23), (13, 23), (13, 30), (9, 29)], ("crimson", 5))  # its hanging end
        ic.path([(9, 23), (9, 29)], ("crimson", 6))
        ic.dots([(16, 14), (15, 14), (16, 15)], ("brass", 6))  # a small device on the breast
    elif rank == 4:  # a gilded cuirass under winged pauldrons, a jewel on the breast
        body(ic, CUIRASS, "brass", 3, 5, 7)
        ic.poly([(13, 9), (16, 12), (19, 9), (16, 10)], ("ink", 1))
        ic.path([(16, 17), (16, 23)], ("brass", 7))
        ic.path([(11, 16), (14, 21)], ("brass", 3))  # engraving
        ic.path([(21, 16), (18, 21)], ("brass", 3))
        ic.path([(10, 22), (22, 22)], ("brass", 3))
        both(ic, [(13, 5), (8, 4), (3, 7), (3, 13), (9, 14), (12, 9)], ("ink", 7), ("ink", 5))  # pauldrons
        ic.path([(8, 4), (3, 7), (3, 13)], ("ink", 9))
        ic.path([(3, 13), (9, 14), (12, 9)], ("brass", 6))
        ic.path([(29, 13), (23, 14), (20, 9)], ("brass", 4))
        both(ic, [(4, 7), (0, 3), (2, 2), (7, 5)], ("bone", 7), ("bone", 5))  # two feathers at each shoulder
        both(ic, [(7, 5), (3, 0), (6, 0), (10, 4)], ("bone", 6), ("bone", 4))
        ic.poly([(16, 12), (19, 15), (16, 18), (13, 15)], ("azure", 5))  # the jewel
        ic.poly([(16, 12), (16, 15), (13, 15)], ("azure", 7))
        ic.dots([(15, 14)], ("light", 0))
        body(ic, FAULD, "brass", 2, 4, 6)
        ic.path([(9, 24), (23, 24)], ("brass", 7))
        ic.path([(9, 26), (23, 26)], ("brass", 3))
    else:  # a cuirass of the Rift, split down the breast by crystal
        body(ic, CUIRASS, "ink", 3, 5, 7)
        ic.poly([(13, 9), (16, 12), (19, 9), (16, 10)], ("ink", 0))
        ic.poly([(15, 11), (17, 12), (18, 16), (16, 18), (18, 21), (16, 24), (15, 20), (14, 17), (16, 15)], ("violet", 8))  # the split
        ic.path([(16, 12), (17, 16), (15, 18), (16, 23)], ("ink", 0))
        ic.path([(12, 5), (8, 6), (5, 11), (8, 15)], ("violet", 6))  # a rim of light
        ic.path([(9, 21), (11, 24)], ("violet", 5))
        ic.path([(21, 13), (20, 16), (22, 19)], ("violet", 5))  # cracks
        ic.path([(11, 13), (12, 16)], ("violet", 6))
        for x, y, h, tone in ((8, 7, 6, 6), (11, 6, 4, 5), (23, 7, 7, 6), (26, 10, 4, 5)):  # crystal on the shoulders
            ic.poly([(x - 1.6, y), (x + 1.6, y), (x + 0.3, y - h)], ("violet", tone))
            ic.path([(x - 1.2, y), (x + 0.2, y - h + 1)], ("violet", 8))
        body(ic, FAULD, "ink", 2, 4, 6)
        ic.path([(9, 24), (23, 24)], ("violet", 6))
        glow = [(16, 31)]
    ic.outline()
    ic.glow(glow, ("violet", 7))
    return ic


# ----------------------------------------------------------------------------------------- leather
JERKIN = sym([(16, 12), (13, 5), (9, 6), (7, 11), (10, 14), (9, 28), (15, 28), (16, 25)])


def leather(rank: int) -> Icon:
    ic = Icon()
    glow: list[Pt] = []
    if rank == 1:  # a hide vest laced up the front, its hem ragged
        body(ic, sym([(16, 13), (13, 5), (9, 6), (7, 11), (10, 14), (9, 26), (11, 28), (13, 26), (15, 28), (16, 26)]), "leather", 3, 4, 6)
        ic.poly([(13, 5), (16, 13), (19, 5), (16, 8)], ("leather", 1))  # the open neck
        ic.path([(16, 13), (16, 26)], ("leather", 1))  # the opening
        for y in (15, 18, 21, 24):  # lacing
            ic.path([(14, y), (18, y + 1)], ("bone", 6))
        ic.dots([(14, 15), (14, 18), (14, 21), (14, 24)], ("bone", 7))
        ic.path([(13, 5), (9, 6), (7, 11)], ("leather", 6))
        ic.path([(10, 14), (10, 25)], ("leather", 5))
        ic.dots([(11, 17), (12, 22), (21, 16), (20, 23)], ("leather", 2))  # scuffs
    elif rank == 2:  # a forester's green jerkin with cap sleeves and a belt
        both(ic, [(13, 5), (8, 6), (4, 10), (6, 14), (10, 13)], ("moss", 6), ("moss", 3))  # cap sleeves
        ic.path([(4, 10), (6, 14)], ("leather", 5))
        ic.path([(28, 10), (26, 14)], ("leather", 3))
        body(ic, JERKIN, "moss", 2, 4, 6)
        ic.poly([(13, 5), (16, 12), (19, 5), (16, 8)], ("leather", 2))  # collar lining
        ic.path([(13, 5), (16, 12), (19, 5)], ("leather", 5))
        ic.path([(16, 12), (16, 19)], ("moss", 2))
        ic.dots([(15, 14), (15, 17)], ("brass", 6))  # toggles
        ic.rect(9, 19, 22, 21, ("leather", 3))  # belt
        ic.path([(9, 19), (22, 19)], ("leather", 5))
        ic.rect(14, 19, 17, 21, ("brass", 5))  # buckle
        ic.dots([(15, 20), (16, 20)], ("leather", 1))
        ic.path([(10, 27), (14, 27)], ("moss", 6))  # hem stitching
        ic.path([(18, 27), (22, 27)], ("moss", 3))
    elif rank == 3:  # a studded brigandine: dark leather, brass studs, two buckled straps, a crimson neckerchief
        body(ic, JERKIN, "leather", 2, 3, 5)
        ic.poly([(13, 5), (16, 12), (19, 5), (16, 7)], ("crimson", 4))  # the neckerchief
        ic.poly([(13, 5), (16, 12), (16, 7)], ("crimson", 6))
        ic.poly([(15, 11), (17, 11), (16, 15)], ("crimson", 5))
        for y in (15, 22):  # straps across the chest
            ic.rect(10, y, 21, y + 1, ("leather", 1))
            ic.rect(15, y - 1, 17, y + 2, ("brass", 5))
            ic.dots([(15, y - 1)], ("brass", 7))
            ic.dots([(16, y), (16, y + 1)], ("leather", 1))
        for x, y in ((11, 12), (20, 12), (11, 18), (13, 19), (18, 19), (20, 18), (11, 25), (13, 26), (18, 26), (20, 25)):  # studs
            ic.put(x, y, ("brass", 7 if x < 16 else 5))
        both(ic, [(13, 5), (8, 5), (6, 9), (9, 11)], ("leather", 5), ("leather", 2))  # shoulder guards
        ic.path([(8, 5), (6, 9), (9, 11)], ("brass", 6))
        ic.path([(24, 5), (26, 9), (23, 11)], ("brass", 4))
        ic.path([(16, 25), (16, 28)], ("leather", 1))
    elif rank == 4:  # a wolf-fur mantle over dark leather, clasped with fangs
        body(ic, sym([(16, 14), (10, 14), (8, 29), (16, 29)]), "leather", 2, 3, 5)
        ic.path([(16, 16), (16, 21)], ("leather", 1))  # the coat's opening, laced shut
        ic.dots([(15, 17), (17, 19)], ("bone", 6))
        ic.rect(9, 21, 22, 23, ("leather", 1))  # a broad belt with a brass plate
        ic.path([(9, 21), (22, 21)], ("leather", 4))
        ic.rect(14, 20, 17, 24, ("brass", 5))
        ic.path([(14, 20), (17, 20)], ("brass", 7))
        ic.path([(8, 28), (15, 28)], ("ink", 7))  # fur trim along the hem
        ic.path([(16, 28), (23, 28)], ("ink", 5))
        for x in (9, 12, 15, 18, 21):
            ic.dots([(x, 29)], ("ink", 6 if x < 16 else 4))
        # The mantle: a ragged pelt across both shoulders.
        fur = sym([(16, 10), (13, 4), (8, 4), (4, 8), (3, 13), (5, 12), (6, 16), (8, 14), (10, 18), (12, 15), (14, 18), (16, 15)])
        body(ic, fur, "ink", 4, 6, 8, left=11, right=21)
        ic.poly([(13, 4), (16, 10), (19, 4), (16, 7)], ("ink", 1))  # neck
        for x, y in ((6, 9), (9, 7), (9, 12), (12, 10), (21, 8), (24, 10), (20, 12)):  # tufts
            ic.path([(x, y), (x + 1, y + 2)], ("ink", 4) if x > 16 else ("ink", 5))
        ic.path([(13, 4), (8, 4), (4, 8)], ("ink", 9))
        ic.poly([(13, 10), (15, 10), (14, 14)], ("bone", 7))  # the fangs of the clasp
        ic.poly([(17, 10), (19, 10), (18, 14)], ("bone", 5))
        ic.rect(13, 9, 18, 9, ("brass", 6))
    else:  # a coat of the Rift: high collar, crystal buttons, a hem in tatters
        both(ic, [(13, 6), (11, 1), (9, 6)], ("ink", 6), ("ink", 3))  # the standing collar
        body(ic, sym([(16, 12), (13, 6), (9, 6), (7, 11), (10, 14), (8, 26), (10, 29), (12, 26), (14, 29), (16, 25)]), "ink", 2, 4, 6)
        ic.poly([(13, 6), (16, 12), (19, 6), (16, 8)], ("ink", 0))
        ic.path([(11, 1), (13, 6), (16, 12), (19, 6), (21, 1)], ("violet", 7))  # light along the collar's edge
        ic.path([(16, 12), (16, 25)], ("violet", 5))  # the seam
        ic.dots([(15, 14), (15, 17), (15, 20), (15, 23)], ("violet", 8))  # crystal buttons
        ic.path([(9, 6), (7, 11), (10, 14)], ("violet", 6))
        ic.path([(21, 16), (20, 20), (22, 23)], ("violet", 5))  # a crack
        for x, y, h, tone in ((8, 7, 6, 6), (11, 6, 3, 5)):  # crystal on one shoulder
            ic.poly([(x - 1.5, y), (x + 1.5, y), (x + 0.3, y - h)], ("violet", tone))
            ic.path([(x - 1.1, y), (x + 0.2, y - h + 1)], ("violet", 8))
        ic.dots([(11, 20), (20, 13), (12, 25)], ("violet", 7))  # stars in the cloth
        glow = [(10, 31), (22, 31)]
    ic.outline()
    ic.glow(glow, ("violet", 7))
    return ic


# ------------------------------------------------------------------------------------------- cloth
def cloth(rank: int) -> Icon:
    ic = Icon()
    glow: list[Pt] = []
    if rank == 1:  # a linen tunic with short sleeves, tied with a teal sash
        both(ic, [(12, 7), (5, 10), (5, 15), (9, 15), (12, 12)], ("bone", 7), ("bone", 4))  # sleeves
        ic.path([(5, 15), (9, 15)], ("bone", 4))
        body(ic, sym([(16, 9), (13, 6), (11, 7), (11, 16), (9, 29), (16, 29)]), "bone", 4, 6, 7)
        ic.poly([(13, 6), (16, 10), (19, 6), (16, 7)], ("bone", 3))  # neck
        ic.path([(13, 21), (12, 28)], ("bone", 5))  # folds
        ic.path([(19, 21), (20, 28)], ("bone", 4))
        ic.path([(16, 21), (16, 28)], ("bone", 5))
        ic.rect(10, 17, 21, 19, ("sea", 4))  # the sash
        ic.path([(10, 17), (21, 17)], ("sea", 6))
        ic.poly([(12, 19), (15, 19), (14, 25), (12, 24)], ("sea", 5))  # its knot and tail
        ic.path([(12, 19), (12, 24)], ("sea", 6))
    elif rank == 2:  # an acolyte's teal robe: bell sleeves, a short shoulder cape, brass trim
        both(ic, [(11, 9), (4, 13), (3, 21), (8, 22), (11, 15)], ("sea", 6), ("sea", 3))  # bell sleeves
        ic.path([(3, 21), (8, 22)], ("brass", 6))
        ic.path([(29, 21), (24, 22)], ("brass", 4))
        body(ic, sym([(16, 9), (12, 9), (11, 16), (9, 29), (16, 29)]), "sea", 3, 5, 6)
        ic.path([(13, 20), (12, 27)], ("sea", 4))
        ic.path([(19, 20), (20, 27)], ("sea", 3))
        ic.rect(9, 28, 22, 29, ("brass", 4))  # hem
        ic.path([(9, 28), (15, 28)], ("brass", 6))
        cape = sym([(16, 8), (13, 5), (9, 6), (6, 11), (9, 14), (13, 15), (16, 14)])
        body(ic, cape, "sea", 4, 6, 7)
        ic.poly([(13, 5), (16, 9), (19, 5), (16, 6)], ("sea", 2))  # neck
        ic.path([(6, 11), (9, 14), (13, 15), (16, 14), (19, 15), (23, 14), (26, 11)], ("brass", 5))  # the cape's edge
        ic.path([(6, 11), (9, 14), (13, 15)], ("brass", 6))
        ic.dots([(16, 11), (16, 12)], ("brass", 6))  # clasp
        ic.path([(11, 18), (21, 18)], ("bone", 6))  # rope girdle
        ic.path([(14, 18), (14, 23)], ("bone", 6))
    elif rank == 3:  # a white chasuble with a gold orphrey and a red stone
        both(ic, [(8, 10), (3, 14), (3, 20), (7, 20), (9, 15)], ("bone", 5), ("bone", 3))  # the alb's sleeves, under it
        ic.rect(3, 19, 7, 20, ("sea", 5))
        ic.rect(25, 19, 28, 20, ("sea", 3))
        body(ic, sym([(16, 22), (10, 22), (9, 30), (16, 30)]), "bone", 3, 4, 5)  # and its skirt
        ic.path([(13, 24), (13, 29)], ("bone", 3))
        ic.path([(19, 24), (19, 29)], ("bone", 2))
        # The chasuble: broad at the shoulders, falling to a point.
        body(ic, sym([(16, 7), (12, 4), (7, 9), (6, 18), (10, 24), (16, 28)]), "bone", 5, 6, 7, left=11, right=21)
        ic.poly([(12, 4), (16, 9), (20, 4), (16, 6)], ("bone", 2))  # neck
        ic.rect(15, 9, 16, 27, ("brass", 5))  # the orphrey: a Y of gold
        ic.path([(15, 9), (15, 27)], ("brass", 6))
        ic.path([(15, 13), (10, 6)], ("brass", 6))
        ic.path([(14, 13), (9, 7)], ("brass", 5))
        ic.path([(17, 13), (22, 6)], ("brass", 4))
        ic.path([(18, 13), (23, 7)], ("brass", 4))
        ic.poly([(16, 11), (18, 13), (16, 15), (14, 13)], ("crimson", 4))
        ic.poly([(16, 11), (16, 13), (14, 13)], ("crimson", 6))
        ic.path([(9, 14), (11, 22)], ("bone", 5))  # folds
        ic.path([(12, 15), (13, 24)], ("bone", 6))
        ic.path([(20, 15), (19, 24)], ("bone", 5))
        ic.path([(23, 14), (21, 22)], ("bone", 4))
        ic.path([(6, 18), (10, 24), (16, 28)], ("brass", 5))  # gold along its edge
        ic.path([(26, 18), (22, 24), (17, 28)], ("brass", 4))
    elif rank == 4:  # a sun-gold vestment: a broad jewelled collar and a sun on the breast
        both(ic, [(11, 9), (4, 13), (3, 22), (8, 23), (11, 15)], ("brass", 6), ("brass", 3))  # sleeves
        ic.rect(3, 21, 8, 23, ("bone", 7))  # white lining at the cuffs
        ic.rect(24, 21, 28, 23, ("bone", 5))
        body(ic, sym([(16, 9), (12, 9), (11, 16), (9, 29), (16, 29)]), "brass", 3, 5, 6)
        ic.path([(13, 21), (12, 28)], ("brass", 4))
        ic.path([(19, 21), (20, 28)], ("brass", 3))
        for i in range(8):  # the sun: a disc and eight rays
            dx, dy = ((0, -1), (1, -1), (1, 0), (1, 1), (0, 1), (-1, 1), (-1, 0), (-1, -1))[i]
            ic.path([(16 + dx * 3, 20 + dy * 3), (16 + dx * 5, 20 + dy * 5)], ("brass", 7))
        ic.rect(15, 19, 17, 21, ("light", 0))
        ic.dots([(15, 19), (17, 21)], ("brass", 7))
        collar = sym([(16, 9), (13, 5), (9, 5), (6, 10), (9, 13), (13, 15), (16, 14)])
        body(ic, collar, "brass", 5, 6, 7)
        ic.poly([(13, 5), (16, 9), (19, 5), (16, 6)], ("ink", 1))
        ic.path([(6, 10), (9, 13), (13, 15), (16, 14), (19, 15), (23, 13), (26, 10)], ("brass", 3))
        ic.dots([(9, 9), (16, 12), (23, 9)], ("azure", 7))  # jewels
        ic.dots([(12, 11), (20, 11)], ("crimson", 5))
        ic.dots([(8, 8)], ("light", 0))
        glow = [(16, 2)]
    else:  # a robe of the void: stars in the cloth, a collar of shards, the hem coming apart
        both(ic, [(11, 10), (4, 14), (3, 22), (8, 23), (11, 16)], ("ink", 5), ("ink", 2))  # sleeves
        body(ic, sym([(16, 10), (12, 10), (11, 16), (9, 25), (16, 25)]), "ink", 2, 4, 5)
        ic.poly([(13, 9), (16, 12), (19, 9), (16, 10)], ("ink", 0))
        ic.path([(16, 12), (16, 25)], ("violet", 5))
        ic.path([(3, 22), (8, 23)], ("violet", 7))
        ic.path([(29, 22), (24, 23)], ("violet", 5))
        ic.dots([(13, 15), (19, 18), (12, 21), (20, 23), (6, 18), (26, 17), (14, 23)], ("violet", 8))  # stars
        ic.dots([(18, 14), (11, 18), (21, 20)], ("violet", 6))
        for x, y, h, tone in ((10, 10, 6, 5), (13, 9, 8, 6), (19, 9, 8, 6), (22, 10, 6, 5)):  # the collar of shards
            ic.poly([(x - 1.6, y), (x + 1.6, y), (x + 0.3, y - h)], ("violet", tone))
            ic.path([(x - 1.2, y), (x + 0.2, y - h + 1)], ("violet", 8))
        for x, w, h in ((10, 2.0, 4), (14, 1.6, 5), (18, 1.6, 4), (22, 2.0, 5)):  # the hem, breaking into pieces
            ic.poly([(x - w, 26.5), (x + w, 26.5), (x + 0.3, 26.5 + h)], ("ink", 4 if x < 16 else 2))
            ic.path([(x - w, 26.5), (x + 0.2, 26.5 + h - 1)], ("violet", 6))
        glow = [(16, 0)]
    ic.outline()
    ic.glow(glow, ("violet", 7) if rank == 5 else ("brass", 7))
    return ic


# ------------------------------------------------------------------------------------------- build
NAMES = {
    "plate": ["Peto oxidado", "Coraza de soldado", "Coraza acanalada", "Coraza dorada alada", "Coraza de la Grieta"],
    "leather": ["Chaleco de piel", "Jubón de montero", "Brigantina tachonada", "Manto de lobo", "Gabán de la Grieta"],
    "cloth": ["Túnica de lino", "Hábito de acólito", "Casulla blanca", "Vestidura solar", "Hábito del vacío"],
}
GROUPS = [
    ("plate", plate, "Petos · Placa · Knight", "Corazas rígidas con sisas y faldar corto, del peto oxidado a la coraza partida por el cristal de la Grieta."),
    ("leather", leather, "Petos · Cuero · Ranger", "Jubones y gabanes sin mangas, con cuello en pico, cordones o correas y el bajo abierto."),
    ("cloth", cloth, "Petos · Tela · Priest", "Túnicas y vestiduras con mangas, que caen hasta abajo en pliegues."),
]


def build() -> list[dict]:
    out = []
    for fam, draw, title, note in GROUPS:
        items: list[tuple[str, str, Image.Image]] = [(f"chest_{fam}_{r}", NAMES[fam][r - 1], framed(family_tint(draw(r), fam, r), RANK_TIER[r])) for r in range(1, 6)]
        out.append({"key": f"chest_{fam}", "title": title, "note": note, "items": items})
    return out
