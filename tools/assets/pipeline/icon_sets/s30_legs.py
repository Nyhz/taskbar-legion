"""Icons of the LEGS slot: three armour families (one per class), five ranks each.

Seen front-on from the waist to the ankle. The families do not share a silhouette: plate is an articulated leg
harness, wide at the hips with knee cops that jut out; leather is fitted breeches that taper to the ankle; cloth is
one flowing skirt that flares to the hem.
"""
from __future__ import annotations

from typing import Sequence

from ..icons import RANK_TIER, Icon, framed, family_tint
from ..rig import Pt


def mp(pts: Sequence[Pt]) -> list[Pt]:
    """A polygon mirrored left ↔ right."""
    return [(32 - x, y) for x, y in pts]


def md(pts: Sequence[Pt]) -> list[Pt]:
    """Pixels mirrored left ↔ right."""
    return [(31 - x, y) for x, y in pts]


# -------------------------------------------------------------------------------------------- plate
def _harness(ic: Icon, cuisse: tuple[str, int, int, int], greave: tuple[str, int, int, int]) -> None:
    """Thigh plates, knee cops and greaves of both legs: the near (left) leg lit, the far one in shadow."""
    cr, cd, cm, cl = cuisse
    gr, gd, gm, gl = greave
    ic.poly([(8, 9), (15.5, 9), (15.5, 18), (9, 18)], (cr, cm))  # cuisses
    ic.poly([(8, 9), (11, 9), (11.5, 18), (9, 18)], (cr, cl))
    ic.poly([(16.5, 9), (24, 9), (23, 18), (16.5, 18)], (cr, cm - 1))
    ic.poly([(21, 9), (24, 9), (23, 18), (20.5, 18)], (cr, cd))
    ic.poly([(9.5, 21), (15, 21), (14.5, 28), (10.5, 28)], (gr, gm))  # greaves
    ic.poly([(9.5, 21), (11.5, 21), (12, 28), (10.5, 28)], (gr, gl))
    ic.poly([(17, 21), (22.5, 21), (21.5, 28), (17.5, 28)], (gr, gm - 1))
    ic.poly([(20.5, 21), (22.5, 21), (21.5, 28), (20, 28)], (gr, gd))
    ic.poly([(8, 17), (15.5, 17), (15.5, 21.5), (8.5, 21.5)], (cr, cl))  # knee cops
    ic.poly([(16.5, 17), (24, 17), (23.5, 21.5), (16.5, 21.5)], (cr, cm))
    ic.path([(8, 21), (15, 21)], (cr, cd))
    ic.path([(17, 21), (23, 21)], (cr, cd))


def plate(rank: int) -> Icon:
    ic = Icon()
    glow: list[Pt] = []
    if rank == 1:  # rusty tassets on a belt over padded hose
        ic.poly([(9, 9), (15.5, 9), (15, 28), (10.5, 28)], ("leather", 3))  # hose
        ic.poly([(9, 9), (11, 9), (12, 28), (10.5, 28)], ("leather", 4))
        ic.poly([(16.5, 9), (23, 9), (21.5, 28), (17, 28)], ("leather", 3))
        ic.poly([(20.5, 9), (23, 9), (21.5, 28), (20, 28)], ("leather", 2))
        ic.poly([(9.5, 20), (15.2, 20), (15, 23.5), (10, 23.5)], ("ink", 5))  # dull knee plates
        ic.path([(10, 20), (15, 20)], ("ink", 6))
        ic.poly([(16.8, 20), (22.5, 20), (22, 23.5), (17, 23.5)], ("ink", 4))
        ic.poly([(7, 8), (14.5, 8), (14.5, 16), (11, 19), (7, 16)], ("ink", 5))  # the tassets
        ic.poly([(7, 8), (10, 8), (10, 18), (7, 16)], ("ink", 6))
        ic.poly([(17.5, 8), (25, 8), (25, 16), (21, 19), (17.5, 16)], ("ink", 4))
        ic.poly([(22, 8), (25, 8), (25, 16), (22, 18)], ("ink", 3))
        ic.dots([(9, 12), (12, 15), (10, 16), (20, 11), (23, 14), (19, 15)], ("leather", 4))  # rust
        ic.dots([(8, 9), (13, 9), (18, 9), (23, 9)], ("ink", 7))  # rivets
        ic.rect(7, 5, 24, 7, ("leather", 3))  # belt
        ic.path([(7, 5), (24, 5)], ("leather", 5))
        ic.rect(15, 5, 16, 7, ("ink", 6))
    elif rank == 2:  # steel cuisses, knee cops with a fan, greaves
        _harness(ic, ("ink", 4, 6, 8), ("ink", 4, 6, 7))
        ic.poly([(8.5, 16.5), (5, 18), (5, 21), (8.5, 22)], ("ink", 7))  # the fans of the knee cops
        ic.poly([(23.5, 16.5), (27, 18), (27, 21), (23.5, 22)], ("ink", 4))
        ic.path([(6, 19), (8, 19)], ("ink", 5))
        ic.path([(24, 19), (26, 19)], ("ink", 3))
        ic.dots([(10, 19), (14, 19)], ("ink", 4))  # rivets
        ic.dots([(18, 19), (22, 19)], ("ink", 8))
        ic.path([(12.5, 10), (13, 17)], ("ink", 5))  # the ridge of each cuisse
        ic.path([(19, 10), (18.5, 17)], ("ink", 4))
        ic.rect(8, 8, 23, 9, ("ink", 3))  # a strip of mail under the belt
        ic.dots([(x, 8 + (x % 2)) for x in range(8, 24)], ("ink", 6))
        ic.rect(7, 5, 24, 7, ("leather", 3))
        ic.path([(7, 5), (24, 5)], ("leather", 5))
        ic.rect(15, 5, 16, 7, ("ink", 7))
    elif rank == 3:  # fluted harness with brass trim and a crimson cloth between the legs
        _harness(ic, ("ink", 4, 7, 9), ("ink", 4, 7, 8))
        for x0, x1 in ((12, 12.4), (13.8, 14)):  # fluting
            ic.path([(x0, 10), (x1, 16)], ("ink", 5))
        for x0, x1 in ((18, 18), (19.8, 19.5)):
            ic.path([(x0, 10), (x1, 16)], ("ink", 4))
        ic.path([(8, 17), (15, 17)], ("brass", 6))  # brass edges on the knee cops
        ic.path([(17, 17), (23, 17)], ("brass", 4))
        ic.poly([(8.5, 18), (5, 19.5), (8.5, 21)], ("brass", 5))
        ic.poly([(23.5, 18), (27, 19.5), (23.5, 21)], ("brass", 3))
        ic.rect(10, 27, 14, 27, ("brass", 5))  # ankle bands
        ic.rect(18, 27, 21, 27, ("brass", 4))
        ic.poly([(13, 8), (19, 8), (19, 17), (16, 20), (13, 17)], ("crimson", 4))  # the cloth
        ic.poly([(13, 8), (16, 8), (16, 20), (13, 17)], ("crimson", 5))
        ic.path([(13, 17), (16, 20), (19, 17)], ("brass", 6))
        ic.dots([(15, 12), (16, 12), (15, 13), (16, 13)], ("brass", 6))
        ic.rect(7, 5, 24, 7, ("brass", 4))  # belt
        ic.path([(7, 5), (24, 5)], ("brass", 6))
        ic.dots([(10, 6), (13, 6), (18, 6), (21, 6)], ("brass", 3))
    elif rank == 4:  # gilded harness: scalloped tassets, winged knee cops, a jewel in the girdle
        _harness(ic, ("brass", 3, 5, 7), ("ink", 5, 6, 7))
        ic.rect(10, 27, 14, 27, ("brass", 6))
        ic.rect(18, 27, 21, 27, ("brass", 4))
        for x0, x1, tone in ((8, 12, 7), (12, 15.5, 6)):  # scalloped tassets under the belt
            ic.poly([(x0, 8), (x1, 8), (x1, 10.5), ((x0 + x1) / 2, 12.5), (x0, 10.5)], ("brass", tone))
            ic.poly(mp([(x0, 8), (x1, 8), (x1, 10.5), ((x0 + x1) / 2, 12.5), (x0, 10.5)]), ("brass", tone - 2))
        ic.path([(12, 8), (12, 11)], ("brass", 3))
        ic.path([(20, 8), (20, 11)], ("brass", 2))
        # A wing on each knee cop: two broad feathers sweeping out and up, a short one below.
        for pts, tone in (([(8.5, 20), (3, 10), (6, 10.5), (9, 16.5)], 7), ([(8.5, 21), (0.5, 15), (2.5, 13.5), (8.5, 18)], 6), ([(8.5, 22), (2, 21), (2.5, 18.5), (8.5, 19.5)], 5)):
            ic.poly(pts, ("bone", tone))
            ic.poly(mp(pts), ("bone", tone - 2))
        ic.path([(8, 20), (4, 11)], ("bone", 4))  # the quills
        ic.path([(8, 21), (2, 15)], ("bone", 4))
        ic.path([(23, 20), (27, 11)], ("bone", 2))
        ic.path([(23, 21), (29, 15)], ("bone", 2))
        ic.rect(7, 5, 24, 7, ("brass", 6))  # girdle
        ic.path([(7, 5), (24, 5)], ("brass", 7))
        ic.path([(7, 7), (24, 7)], ("brass", 3))
        ic.dots([(15, 5), (16, 5), (15, 6), (16, 6), (15, 7), (16, 7)], ("azure", 6))
        ic.dots([(15, 5)], ("azure", 8))
    else:  # a harness of the Rift: dark plates, light in the seams, crystal bursting from the knees
        _harness(ic, ("ink", 2, 4, 6), ("ink", 2, 4, 5))
        ic.path([(8, 17), (15, 17)], ("violet", 7))  # light in the seams
        ic.path([(17, 17), (23, 17)], ("violet", 5))
        ic.path([(11, 11), (12, 13), (11, 15)], ("violet", 6))  # cracks
        ic.path([(20, 23), (19, 25), (20, 27)], ("violet", 5))
        for pts, tone in (([(8.5, 16), (2, 12), (5.5, 17.5), (8.5, 21)], 6), ([(8.5, 19.5), (3, 24), (9, 22.5)], 5)):  # crystal
            ic.poly(pts, ("violet", tone))
            ic.poly(mp(pts), ("violet", tone - 1))
        ic.path([(8, 16), (2, 12)], ("violet", 8))
        ic.path([(23, 16), (29, 12)], ("violet", 7))
        ic.poly([(7, 6), (5, 0.5), (11, 5)], ("violet", 6))  # and from the hips
        ic.poly([(25, 6), (27, 1.5), (21, 5)], ("violet", 5))
        ic.path([(7, 5), (5, 1)], ("violet", 8))
        ic.rect(7, 5, 24, 7, ("ink", 3))  # belt
        ic.path([(7, 5), (24, 5)], ("violet", 6))
        ic.dots([(15, 6), (16, 6)], ("violet", 8))
        glow = [(3, 9)]
    ic.outline()
    ic.glow(glow, ("violet", 7))
    return ic


# ------------------------------------------------------------------------------------------ leather
def _breeches(ic: Icon, ramp: str, d: int, m: int, l: int, top: float = 7.0) -> None:
    """Fitted breeches: a seat and two legs that taper to the ankle."""
    ic.poly([(8, top), (24, top), (24, 13), (16.5, 14), (15.5, 14), (8, 13)], (ramp, m))
    ic.poly([(8, top), (11, top), (11, 13), (8, 13)], (ramp, l))
    ic.poly([(21, top), (24, top), (24, 13), (21, 13)], (ramp, d))
    ic.poly([(8, 13), (15.5, 14), (14.5, 28), (10.5, 28)], (ramp, m))
    ic.poly([(8, 13), (10.5, 13.3), (12, 28), (10.5, 28)], (ramp, l))
    ic.poly([(16.5, 14), (24, 13), (21.5, 28), (17.5, 28)], (ramp, m))
    ic.poly([(21.5, 13.3), (24, 13), (21.5, 28), (20, 28)], (ramp, d))
    ic.path([(16, top + 2), (16, 14)], (ramp, d))


def leather(rank: int) -> Icon:
    ic = Icon()
    glow: list[Pt] = []
    if rank == 1:  # hide breeches, a rope for a belt, a patched knee
        _breeches(ic, "leather", 2, 4, 5)
        ic.dots([(10, 15), (10, 18), (11, 21), (11, 24)], ("bone", 5))  # the side seam
        ic.poly([(17.5, 19), (21.8, 19), (21.2, 23.5), (17.6, 23.5)], ("leather", 2))  # the patch
        ic.dots([(18, 19), (21, 19), (18, 23), (20, 23)], ("bone", 5))
        ic.rect(8, 5, 23, 6, ("leather", 2))  # rope belt
        ic.dots([(9, 5), (11, 5), (13, 5), (18, 5), (20, 5), (22, 5)], ("leather", 5))
        ic.dots([(15, 5), (16, 6)], ("bone", 6))  # its knot
        ic.path([(15, 7), (14, 10)], ("leather", 5))
        ic.path([(16, 7), (17, 9)], ("leather", 5))
    elif rank == 2:  # a forester's green breeches, laced gaiters, a pouch on the belt
        _breeches(ic, "moss", 2, 4, 6)
        ic.poly([(9.5, 20), (15.1, 20), (14.5, 28), (10.5, 28)], ("leather", 4))  # gaiters
        ic.poly([(9.5, 20), (11.4, 20), (12, 28), (10.5, 28)], ("leather", 5))
        ic.poly([(16.9, 20), (22.8, 20), (21.5, 28), (17.5, 28)], ("leather", 4))
        ic.poly([(20.8, 20), (22.8, 20), (21.5, 28), (20, 28)], ("leather", 3))
        ic.path([(10, 20), (15, 20)], ("leather", 2))
        ic.path([(17, 20), (22, 20)], ("leather", 2))
        ic.dots([(13, 22), (13, 24), (13, 26), (19, 22), (19, 24), (19, 26)], ("bone", 5))  # lacing
        ic.rect(7, 5, 24, 7, ("leather", 3))  # belt
        ic.path([(7, 5), (24, 5)], ("leather", 5))
        ic.rect(14, 5, 15, 7, ("bone", 5))
        ic.poly([(18.5, 7), (24.6, 7), (24.6, 13), (21.5, 14.5), (18.5, 13)], ("leather", 4))  # the pouch
        ic.poly([(18.5, 7), (24.6, 7), (24.6, 9.5), (21.5, 11), (18.5, 9.5)], ("leather", 5))
        ic.path([(18.5, 9.5), (21.5, 11), (24.6, 9.5)], ("leather", 2))
        ic.dots([(21, 11)], ("bone", 6))
    elif rank == 3:  # studded chaps over dark breeches, a brass buckle, a crimson sash at the hip
        ic.poly([(8, 7), (24, 7), (24, 12), (16.5, 14), (15.5, 14), (8, 12)], ("leather", 3))
        ic.poly([(12.5, 12), (15.5, 14), (14.5, 28), (13, 27)], ("leather", 2))  # the breeches, between the chaps
        ic.poly(mp([(12.5, 12), (15.5, 14), (14.5, 28), (13, 27)]), ("leather", 1))
        ic.poly([(6.5, 9), (12.5, 9), (13, 27), (8.5, 28), (6, 20)], ("leather", 4))  # near chap
        ic.poly([(6.5, 9), (8.6, 9), (9.2, 27), (8.5, 28), (6, 20)], ("leather", 5))
        ic.poly(mp([(6.5, 9), (12.5, 9), (13, 27), (8.5, 28), (6, 20)]), ("leather", 3))  # far chap
        ic.poly(mp([(6.5, 9), (8.6, 9), (9.2, 27), (8.5, 28), (6, 20)]), ("leather", 2))
        ic.dots([(10, 12), (10, 16), (11, 20), (11, 24)], ("brass", 7))  # studs
        ic.dots([(21, 12), (21, 16), (20, 20), (20, 24)], ("brass", 5))
        ic.rect(7, 5, 24, 7, ("leather", 2))  # belt
        ic.path([(7, 5), (24, 5)], ("leather", 4))
        ic.rect(14, 4, 17, 8, ("brass", 5))  # the buckle
        ic.path([(14, 4), (17, 4)], ("brass", 7))
        ic.rect(15, 5, 16, 7, ("leather", 1))
        ic.poly([(8, 8), (11.5, 8), (10.5, 16), (8.5, 14)], ("crimson", 4))  # sash
        ic.path([(8, 8), (9, 14)], ("crimson", 6))
    elif rank == 4:  # wolf-hide leggings: a ragged fur waist, the tail at the hip, fur at the ankles, a belt of fangs
        _breeches(ic, "ink", 2, 3, 4, top=8.0)  # dark hide, so the pale fur and the fangs stand off it
        ic.poly([(7, 4), (25, 4), (25.5, 8), (23.5, 7), (22, 9.5), (20, 7.5), (18.5, 9), (16.5, 7), (15, 9.5), (13, 7.5), (11.5, 9), (9.5, 7), (8, 9.5), (6.5, 7.5)], ("ink", 7))  # fur waist
        ic.poly([(19, 4), (25, 4), (25.5, 8), (23.5, 7), (22, 9.5), (20, 7.5), (19, 8.4)], ("ink", 5))
        ic.path([(7, 4), (18, 4)], ("ink", 8))
        for x, y in ((9, 5), (12, 6), (15, 5), (18, 6), (10, 7), (14, 7)):  # strokes of fur
            ic.path([(x, y), (x + 1, y + 1)], ("ink", 5))
        ic.dots([(21, 5), (23, 6)], ("ink", 4))
        # (No tail at the hip any more: it read as a grey strip. The fur waist, the fangs and the ankle ruffs say wolf.)
        for x, y in ((8, 14), (9, 18), (22, 15), (23, 19)):  # tufts of fur left on the hide
            ic.path([(x, y), (x + 1, y + 2)], ("ink", 6))
        for cuff, tone in (([(9, 22), (16, 22.5), (15.5, 25), (14, 24), (13, 26.5), (11.5, 24.5), (10, 26), (9, 24.5)], 7),):  # fur at the ankles
            ic.poly(cuff, ("ink", tone))
            ic.poly(mp(cuff), ("ink", tone - 2))
        for x, tone in ((12, 7), (16, 7), (20, 6)):  # three big fangs
            ic.poly([(x - 1.6, 10.5), (x + 1.6, 10.5), (x, 16.5)], ("bone", tone))
            ic.path([(x - 1, 11), (x, 16)], ("bone", 7))
        ic.path([(9, 10), (24, 10)], ("leather", 3))  # their cord
        ic.dots([(14, 10), (18, 10)], ("brass", 6))
    else:  # leggings cut from the Rift: a rim of light down the seam, crystal at the knees
        _breeches(ic, "ink", 1, 3, 5)
        ic.path([(8, 8), (8, 13), (10.5, 28)], ("violet", 6))  # the lit seam
        ic.path([(23, 8), (23, 13), (21, 27)], ("violet", 4))
        for pts, tone in (([(9.5, 17), (3.5, 14), (6.5, 19), (10, 22)], 6), ([(10, 21), (5.5, 25), (10.5, 23.5)], 5)):
            ic.poly(pts, ("violet", tone))
            ic.poly(mp(pts), ("violet", tone - 1))
        ic.path([(9, 17), (4, 14)], ("violet", 8))
        ic.path([(22, 17), (27, 14)], ("violet", 7))
        ic.path([(12, 14), (13, 16), (12, 18)], ("violet", 6))  # cracks
        ic.path([(19, 22), (20, 24), (19, 26)], ("violet", 5))
        ic.dots([(13, 10), (19, 16), (13, 24)], ("violet", 8))  # stars in the hide
        ic.rect(7, 5, 24, 7, ("ink", 2))  # belt
        ic.path([(7, 5), (24, 5)], ("violet", 6))
        ic.dots([(15, 6), (16, 6)], ("violet", 8))
        glow = [(4, 12)]
    ic.outline()
    ic.glow(glow, ("violet", 7))
    return ic


# -------------------------------------------------------------------------------------------- cloth
def _skirt(ic: Icon, ramp: str, d: int, m: int, l: int, top: float, hem_y: float, half_top: float, half_hem: float) -> None:
    """One flowing skirt, flaring from the waist to the hem, with the folds of the cloth."""
    a, b = 16 - half_top, 16 + half_top
    c, e = 16 - half_hem, 16 + half_hem
    ic.poly([(a, top), (b, top), (e, hem_y), (c, hem_y)], (ramp, m))
    ic.poly([(a, top), (a + 3, top), (c + 3.5, hem_y), (c, hem_y)], (ramp, l))
    ic.poly([(b - 2.5, top), (b, top), (e, hem_y), (e - 3.5, hem_y)], (ramp, d))
    ic.path([(15, top + 2), (14, hem_y - 1)], (ramp, m - 1))  # folds
    ic.path([(18, top + 2), (19, hem_y - 1)], (ramp, m - 1))


def cloth(rank: int) -> Icon:
    ic = Icon()
    glow: list[Pt] = []
    if rank == 1:  # a plain linen skirt, frayed at the hem, tied with a teal sash
        _skirt(ic, "bone", 4, 6, 7, 7, 26, 6, 8)
        ic.dots([(9, 26), (12, 26), (13, 26), (17, 26), (21, 26), (22, 26)], ("bone", 5))  # the frayed hem
        ic.dots([(10, 27), (14, 27), (19, 27), (23, 27)], ("bone", 5))
        ic.rect(9, 5, 22, 7, ("sea", 4))  # sash
        ic.path([(9, 5), (22, 5)], ("sea", 6))
        ic.rect(10, 5, 12, 8, ("sea", 5))  # its knot at the hip
        ic.poly([(10, 9), (12.5, 9), (12, 16), (10.5, 14)], ("sea", 4))  # and tails
        ic.poly([(12, 9), (14, 9), (14.5, 14), (13, 13)], ("sea", 5))
    elif rank == 2:  # an acolyte's pleated robe-bottom, teal with a brass hem
        tops = [10 + 2 * i for i in range(7)]
        hems = [6 + 20 * i / 6 for i in range(7)]
        for i, tone in enumerate((6, 5, 6, 5, 4, 5, 3)[:6]):  # the pleats
            ic.poly([(tops[i], 7), (tops[i + 1], 7), (hems[i + 1], 27), (hems[i], 27)], ("sea", tone))
        for i in range(1, 6):
            ic.path([(tops[i], 8), (hems[i], 24)], ("sea", 3))
        ic.poly([(6.4, 25), (25.6, 25), (26, 27.5), (6, 27.5)], ("brass", 4))  # hem
        ic.path([(7, 25), (25, 25)], ("brass", 6))
        ic.rect(9, 5, 22, 6, ("brass", 4))  # belt
        ic.path([(9, 5), (22, 5)], ("brass", 6))
        ic.dots([(15, 6), (16, 6)], ("sea", 7))
        ic.path([(16, 7), (17, 12)], ("brass", 5))  # a cord hanging from it
        ic.dots([(17, 13), (17, 14)], ("brass", 6))
    elif rank == 3:  # white, with a gold orphrey down the front and a gold-embroidered hem
        _skirt(ic, "bone", 4, 6, 7, 7, 27, 6, 9)
        ic.poly([(14.5, 7), (17.5, 7), (18, 23), (14, 23)], ("brass", 5))  # orphrey
        ic.path([(14.5, 7), (14, 23)], ("brass", 6))
        ic.dots([(16, 10), (16, 14), (16, 18)], ("brass", 3))
        ic.dots([(15, 12), (15, 16), (15, 20)], ("brass", 7))
        ic.poly([(7.6, 23), (24.4, 23), (25, 27.5), (7, 27.5)], ("brass", 5))  # hem band
        ic.path([(8, 23), (24, 23)], ("brass", 7))
        ic.dots([(x, 25) for x in range(9, 24, 3)], ("brass", 3))
        ic.dots([(x, 26) for x in range(10, 24, 3)], ("brass", 7))
        ic.rect(9, 5, 22, 7, ("brass", 5))  # girdle
        ic.path([(9, 5), (22, 5)], ("brass", 7))
        ic.dots([(15, 5), (16, 5), (15, 6), (16, 6), (15, 7), (16, 7)], ("crimson", 5))
        ic.dots([(15, 5)], ("crimson", 7))
    elif rank == 4:  # sun-gold: panels like rays from the waist, a scalloped hem, a jewelled girdle
        tops = [10 + 2.4 * i for i in range(6)]
        hems = [5 + 4.4 * i for i in range(6)]
        for i, tone in enumerate((7, 5, 6, 5, 3)):
            ic.poly([(tops[i], 8), (tops[i + 1], 8), (hems[i + 1], 25), (hems[i], 25)], ("brass", tone))
            ic.poly([(hems[i], 25), (hems[i + 1], 25), ((hems[i] + hems[i + 1]) / 2, 28.5)], ("brass", tone))  # scallop
        for i in range(1, 5):
            ic.path([(tops[i], 9), (hems[i], 25)], ("brass", 3))
        ic.dots([(7, 27), (11, 27), (16, 27)], ("light", 0))  # the hem catches the light
        ic.rect(9, 5, 22, 8, ("brass", 6))  # girdle
        ic.path([(9, 5), (22, 5)], ("brass", 7))
        ic.path([(9, 8), (22, 8)], ("brass", 3))
        ic.dots([(15, 6), (16, 6), (15, 7), (16, 7)], ("azure", 6))
        ic.dots([(15, 6)], ("azure", 8))
        ic.dots([(11, 6), (20, 6)], ("azure", 5))
        ic.dots([(16, 10), (16, 12), (16, 14)], ("brass", 7))  # a chain
        ic.dots([(16, 16), (15, 17), (17, 17), (16, 18)], ("azure", 6))  # and its pendant
        ic.dots([(16, 17)], ("azure", 8))
    else:  # a skirt of void: stars in the cloth, the hem torn into shards that float free
        _skirt(ic, "ink", 3, 4, 5, 7, 22, 6, 8.5)
        for x0, x1, tip, tone in ((7.5, 11.5, 26, 5), (11.5, 15.5, 27, 4), (15.5, 19.5, 26, 4), (19.5, 24.5, 27, 3)):  # the torn hem
            ic.poly([(x0, 22), (x1, 22), ((x0 + x1) / 2, tip)], ("ink", tone))
        ic.path([(7.5, 22), (9.5, 26), (11.5, 22), (13.5, 27), (15.5, 22), (17.5, 26), (19.5, 22), (22, 27), (24.5, 22)], ("violet", 6))
        for pts, tone in (([(8, 27.5), (10.6, 27.5), (9.2, 31)], 6), ([(15, 28.5), (17.6, 28.5), (16.4, 31.5)], 7), ([(21, 28), (23.6, 28), (22.4, 31)], 5)):
            ic.poly(pts, ("violet", tone))
        ic.dots([(12, 12), (18, 15), (14, 19), (20, 10), (11, 19)], ("violet", 8))  # stars
        ic.dots([(16, 11), (21, 18), (10, 15)], ("violet", 6))
        ic.rect(9, 5, 22, 6, ("violet", 5))  # waist band
        ic.path([(9, 5), (22, 5)], ("violet", 7))
        ic.dots([(15, 6), (16, 6)], ("violet", 8))
        glow = [(27, 14)]
    ic.outline()
    ic.glow(glow, ("violet", 7))
    return ic


# ------------------------------------------------------------------------------------------- build
NAMES = {
    "plate": ("Piernas · Placa · Knight", "Arnés de piernas articulado: ancho en la cadera, con rodilleras que sobresalen.", plate,
              ["Escarcelas oxidadas", "Quijotes de acero", "Arnés acanalado", "Arnés alado dorado", "Arnés de la Grieta"]),
    "leather": ("Piernas · Cuero · Ranger", "Calzas ceñidas que se estrechan hacia el tobillo, con cinturón, pieles y cordones.", leather,
                ["Calzas de piel", "Calzas de montero", "Zahones tachonados", "Polainas de lobo", "Calzas de la Grieta"]),
    "cloth": ("Piernas · Tela · Priest", "Una falda de una pieza que se abre hacia el bajo, con pliegues, fajín y bordados.", cloth,
              ["Falda de lino", "Faldón de acólito", "Faldón bordado", "Falda solar", "Falda del vacío"]),
}


def build() -> list[dict]:
    return [{"key": f"legs_{fam}", "title": title, "note": note,
             "items": [(f"legs_{fam}_{r}", names[r - 1], framed(family_tint(draw(r), fam, r), RANK_TIER[r])) for r in range(1, 6)]}
            for fam, (title, note, draw, names) in NAMES.items()]
