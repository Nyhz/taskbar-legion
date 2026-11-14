"""Boots: one boot per icon in side view, toe to the right. Three families with three silhouettes — plate is a
tall rigid greave over a sabaton with a knee flare, leather is a mid-calf boot with a cuff and a soft sole, cloth
is low: wrappings, slippers and sandals, with the toe turning up as the ranks rise."""
from __future__ import annotations

from ..icons import RANK_TIER, Icon, framed, family_tint

Tone3 = tuple[str, int, int, int]


def _shaft(ic: Icon, t: Tone3, top: int, back: int, front: int, ankle: int = 19) -> None:
    """The leg of the boot: lit down its back (left) edge, in shadow down the front."""
    ramp, lo, mid, hi = t
    ic.poly([(back, top), (front, top), (front, ankle), (back, ankle + 2)], (ramp, mid))
    ic.poly([(back, top), (back + 3, top), (back + 3, ankle + 2), (back, ankle + 2)], (ramp, hi))
    ic.poly([(front - 2, top), (front, top), (front, ankle), (front - 2, ankle)], (ramp, lo))


def _foot(ic: Icon, t: Tone3, back: int, front: int, toe: int, ankle: int = 19, tip: int = 23) -> None:
    """The foot: the instep catches the light, the side towards the sole falls into shadow."""
    ramp, lo, mid, hi = t
    ic.poly([(back, ankle + 1), (front, ankle - 1), (toe - 5, ankle), (toe - 1, tip - 1), (toe, tip + 1), (toe, 25), (back, 25)], (ramp, mid))
    ic.poly([(front - 1, ankle - 1), (toe - 5, ankle), (toe - 1, tip - 1), (toe - 3, tip - 1), (front, ankle + 1)], (ramp, hi))
    ic.poly([(back, 23), (toe - 1, 24), (toe, 25), (back, 25)], (ramp, lo))


def _sole(ic: Icon, x0: int, x1: int, tone: tuple[str, int], heel: int = 0) -> None:
    ic.rect(x0, 26, x1, 27, tone)
    if heel:
        ic.rect(x0, 28, x0 + heel, 28, tone)


# ------------------------------------------------------------------------------------------- plate
def plate(rank: int) -> Icon:
    ic = Icon()
    glow: list[tuple[float, float]] = []
    if rank == 1:  # a crude shin plate strapped over leg wraps, an iron cap on the toe
        _shaft(ic, ("leather", 2, 3, 4), 8, 9, 17)
        _foot(ic, ("leather", 2, 3, 4), 9, 17, 26)
        ic.poly([(12, 6), (18, 6), (18, 19), (13, 19)], ("ink", 5))  # the plate over the shin
        ic.poly([(12, 6), (15, 6), (15, 19), (13, 19)], ("ink", 6))
        ic.poly([(17, 6), (18, 6), (18, 19), (17, 19)], ("ink", 3))
        ic.dots([(14, 9), (16, 15), (15, 12)], ("leather", 4))  # rust
        for y in (9, 15):  # straps
            ic.rect(9, y, 12, y, ("leather", 1))
        ic.poly([(20, 20), (25, 22), (27, 24), (27, 25), (20, 25)], ("ink", 4))  # toe cap
        ic.path([(20, 20), (25, 22)], ("ink", 6))
        ic.dots([(22, 23)], ("leather", 4))
        _sole(ic, 8, 27, ("leather", 1))
    elif rank == 2:  # a soldier's greave and sabaton: knee cop, three lames, rivets
        _shaft(ic, ("ink", 4, 6, 8), 7, 8, 18)
        ic.poly([(7, 8), (7, 4), (12, 2), (18, 3), (22, 6), (19, 8)], ("ink", 6))  # the poleyn flaring over the knee
        ic.poly([(7, 8), (7, 4), (12, 2), (13, 8)], ("ink", 8))
        ic.path([(7, 8), (19, 8)], ("ink", 3))
        ic.path([(13, 3), (20, 6)], ("ink", 8))  # its ridge
        _foot(ic, ("ink", 4, 6, 8), 8, 18, 28)
        for x in (20, 23, 26):  # lames
            ic.path([(x, 20 + (x - 20) // 3), (x, 25)], ("ink", 3))
        ic.dots([(10, 11), (10, 16), (15, 11), (15, 16)], ("ink", 9))  # rivets
        ic.path([(8, 19), (18, 18)], ("ink", 3))  # the ankle joint
        _sole(ic, 7, 28, ("ink", 2), heel=3)
    elif rank == 3:  # a fluted greave edged in brass, crimson strap, a spur at the heel
        _shaft(ic, ("ink", 5, 7, 9), 7, 8, 18)
        for x in (11, 13, 15):  # flutes
            ic.path([(x, 9), (x, 17)], ("ink", 5))
            ic.path([(x - 1, 9), (x - 1, 17)], ("ink", 9))
        ic.poly([(7, 8), (7, 4), (12, 1), (18, 3), (22, 6), (19, 8)], ("ink", 7))
        ic.poly([(7, 8), (7, 4), (12, 1), (13, 8)], ("ink", 9))
        ic.path([(7, 8), (19, 8)], ("brass", 5))
        ic.path([(7, 4), (12, 1), (18, 3), (22, 6)], ("brass", 6))
        ic.rect(8, 18, 18, 19, ("crimson", 4))  # strap
        ic.dots([(13, 18), (13, 19)], ("brass", 6))
        _foot(ic, ("ink", 5, 7, 9), 8, 18, 29, tip=24)
        for x in (20, 23, 26):
            ic.path([(x, 20 + (x - 20) // 3), (x, 25)], ("brass", 4))
        ic.poly([(8, 22), (3, 21), (3, 23)], ("brass", 5))  # spur
        ic.dots([(2, 22), (3, 20), (3, 24)], ("brass", 7))
        _sole(ic, 7, 29, ("ink", 2), heel=3)
    elif rank == 4:  # a gilded greave with a wing at the ankle and a jewel on the knee
        _shaft(ic, ("brass", 3, 5, 7), 7, 8, 21)  # a greave as wide as the leg it guards
        ic.poly([(7, 8), (7, 5), (11, 3), (18, 3), (22, 6), (22, 8)], ("brass", 5))  # a low knee cop
        ic.poly([(7, 8), (7, 5), (11, 3), (14, 3), (14, 8)], ("brass", 7))
        ic.path([(7, 8), (22, 8)], ("brass", 3))
        ic.dots([(16, 5)], ("azure", 7))
        ic.dots([(15, 5), (17, 5), (16, 4), (16, 6)], ("azure", 5))
        ic.path([(14, 10), (14, 17)], ("brass", 7))  # a ridge down the shin
        ic.path([(15, 10), (15, 17)], ("brass", 3))
        _foot(ic, ("ink", 5, 6, 7), 9, 19, 28, tip=24)
        for x in (21, 24, 26):
            ic.path([(x, 20 + (x - 21) // 3), (x, 25)], ("brass", 5))
        ic.path([(19, 18), (23, 19), (27, 22)], ("brass", 6))  # gilt edge along the instep
        # The wing sweeping back from the ankle: three feathers.
        ic.poly([(10, 22), (2, 22), (3, 20), (8, 20), (11, 20)], ("bone", 5))
        ic.poly([(10, 20), (1, 18), (3, 16), (8, 17), (11, 18)], ("bone", 6))
        ic.poly([(10, 18), (3, 13), (5, 12), (8, 15), (11, 16)], ("bone", 7))
        ic.path([(10, 22), (3, 21)], ("bone", 3))
        _sole(ic, 8, 28, ("brass", 3), heel=3)
    else:  # a sabaton of the Rift: dark plate, crystal breaking out at knee, heel and toe
        _shaft(ic, ("ink", 2, 4, 6), 8, 8, 18)
        ic.poly([(7, 9), (7, 6), (12, 4), (18, 5), (22, 7), (19, 9)], ("ink", 4))
        ic.poly([(7, 9), (7, 6), (12, 4), (13, 9)], ("ink", 6))
        ic.path([(7, 9), (19, 9)], ("violet", 7))
        for x, y, h, tone in ((10, 5, 5, 5), (15, 4, 5, 7)):  # crystal on the knee
            ic.poly([(x - 1.8, y), (x + 1.8, y), (x + 0.4, y - h)], ("violet", tone))
            ic.path([(x - 1.2, y), (x + 0.2, y - h + 1)], ("violet", 8))
        ic.path([(12, 11), (14, 14), (12, 17)], ("violet", 7))  # a crack with the light behind it
        _foot(ic, ("ink", 2, 4, 6), 8, 18, 27)
        for x in (20, 23, 25):
            ic.path([(x, 20 + (x - 20) // 3), (x, 25)], ("violet", 5))
        ic.poly([(8, 20), (2, 17), (8, 24)], ("violet", 6))  # heel shard
        ic.path([(8, 20), (3, 18)], ("violet", 8))
        ic.poly([(25, 22), (31, 19), (27, 25)], ("violet", 6))  # toe shard
        ic.path([(25, 22), (30, 20)], ("violet", 8))
        ic.rect(7, 26, 27, 27, ("ink", 1))
        ic.path([(7, 26), (27, 26)], ("violet", 5))
        glow = [(19, 1)]
    ic.outline()
    ic.glow(glow, ("violet", 8))
    return ic


# ----------------------------------------------------------------------------------------- leather
def leather(rank: int) -> Icon:
    ic = Icon()
    glow: list[tuple[float, float]] = []
    if rank == 1:  # an ankle shoe of raw hide: a floppy collar, a stitched seam, tied with a cord
        t = ("leather", 2, 4, 6)
        ic.poly([(6, 12), (11, 10), (18, 11), (19, 18), (6, 21)], ("leather", 4))  # the collar, sagging
        ic.poly([(6, 12), (11, 10), (11, 21), (6, 21)], ("leather", 6))
        ic.poly([(16, 11), (18, 11), (19, 18), (16, 19)], ("leather", 2))
        ic.path([(6, 12), (11, 10), (18, 11)], ("leather", 6))
        _foot(ic, t, 6, 18, 28)
        ic.path([(19, 19), (22, 20), (26, 22)], ("leather", 2))  # the seam along the instep
        ic.dots([(20, 20), (22, 21), (24, 22), (26, 23)], ("bone", 6))  # stitches
        ic.path([(6, 15), (18, 14)], ("bone", 5))  # the cord
        ic.dots([(19, 15), (20, 16), (20, 14), (21, 17)], ("bone", 6))
        ic.dots([(9, 18), (13, 17)], ("leather", 2))  # a patch
        _sole(ic, 5, 28, ("leather", 1))
    elif rank == 2:  # a hunter's boot with the green cuff turned down
        t = ("leather", 3, 4, 5)
        _shaft(ic, t, 8, 9, 18)
        _foot(ic, t, 9, 18, 27)
        ic.poly([(6, 7), (20, 6), (22, 13), (17, 12), (12, 14), (6, 13)], ("moss", 4))  # the cuff, turned down and wider than the leg
        ic.poly([(6, 7), (12, 7), (12, 14), (6, 13)], ("moss", 6))
        ic.poly([(18, 6), (20, 6), (22, 13), (18, 12)], ("moss", 2))
        ic.path([(6, 7), (20, 6)], ("moss", 7))
        ic.path([(6, 13), (12, 14), (17, 12), (22, 13)], ("moss", 1))
        ic.dots([(9, 12), (15, 11), (20, 11)], ("leather", 5))  # its stitching
        for y in (15, 17, 19):  # laces
            ic.path([(15, y), (18, y - 1)], ("bone", 6))
        _sole(ic, 8, 27, ("leather", 1))
    elif rank == 3:  # a tall riding boot: dark leather, two brass buckles, crimson lining, a heel
        t = ("leather", 2, 3, 5)
        _shaft(ic, t, 4, 8, 18)
        _foot(ic, t, 8, 18, 28)
        ic.poly([(7, 4), (19, 3), (19, 7), (7, 8)], ("crimson", 4))  # the lining turned over the top
        ic.path([(7, 4), (19, 3)], ("crimson", 6))
        ic.path([(7, 8), (19, 7)], ("crimson", 2))
        for y in (11, 16):  # straps and buckles
            ic.rect(8, y, 18, y + 1, ("leather", 1))
            ic.rect(12, y - 1, 14, y + 2, ("brass", 5))
            ic.dots([(13, y), (13, y + 1)], ("leather", 1))
            ic.dots([(12, y - 1)], ("brass", 7))
        ic.dots([(10, 25), (13, 25), (16, 25), (19, 25), (22, 25), (25, 25)], ("brass", 6))  # studs along the welt
        _sole(ic, 7, 28, ("leather", 1), heel=3)
    elif rank == 4:  # a boot of wolf hide: fur at the top, claws over the toe, a brass ring
        t = ("ink", 3, 5, 6)
        _shaft(ic, t, 9, 8, 18)
        _foot(ic, t, 8, 18, 27)
        # The pelt turned over the top: tufts standing up, points hanging down.
        ic.poly([(5, 7), (7, 3), (9, 6), (12, 2), (14, 6), (17, 3), (19, 6), (21, 4), (22, 10), (20, 14), (17, 11), (14, 15), (11, 11), (8, 14), (5, 11)], ("ink", 7))
        ic.poly([(5, 7), (7, 3), (9, 6), (12, 2), (13, 6), (12, 11), (11, 11), (8, 14), (5, 11)], ("ink", 8))
        ic.poly([(19, 6), (21, 4), (22, 10), (20, 14), (18, 11)], ("ink", 5))
        ic.path([(5, 11), (8, 14), (11, 11), (14, 15), (17, 11), (20, 14)], ("ink", 3))
        ic.rect(8, 17, 18, 18, ("leather", 2))  # strap and ring
        ic.rect(12, 16, 14, 19, ("brass", 5))
        ic.dots([(13, 17), (13, 18)], ("ink", 2))
        ic.dots([(12, 16)], ("brass", 7))
        for x, y in ((22, 21), (25, 22), (27, 24)):  # claws lashed over the toe
            ic.poly([(x - 1, y), (x + 1, y), (x + 3, y - 4)], ("bone", 7))
            ic.put(x - 1, y, ("bone", 4))
        _sole(ic, 7, 27, ("ink", 2))
    else:  # a soft boot of the Rift: a slouched cuff rimmed with light, laces that glow, crystal in the fold
        t = ("ink", 1, 3, 5)
        _shaft(ic, t, 11, 9, 18)
        _foot(ic, t, 9, 18, 27)
        ic.poly([(5, 10), (20, 9), (23, 15), (18, 14), (13, 17), (5, 15)], ("ink", 4))  # the cuff, fallen in folds
        ic.poly([(5, 10), (12, 10), (13, 17), (5, 15)], ("ink", 5))
        ic.poly([(18, 9), (20, 9), (23, 15), (18, 14)], ("ink", 2))
        ic.path([(5, 10), (20, 9)], ("violet", 8))
        ic.path([(5, 15), (13, 17), (18, 14), (23, 15)], ("violet", 5))
        for x, y, h, tone in ((8, 10, 6, 6), (12, 10, 4, 5)):  # crystal growing out of the fold at the back
            ic.poly([(x - 1.6, y), (x + 1.6, y), (x + 0.3, y - h)], ("violet", tone))
            ic.path([(x - 1.1, y), (x + 0.2, y - h + 1)], ("violet", 8))
        ic.dots([(16, 17), (17, 19), (16, 21)], ("violet", 8))  # the laces, alight
        ic.path([(20, 20), (23, 22)], ("violet", 6))  # a crack over the toe
        ic.rect(8, 26, 27, 27, ("ink", 0))
        ic.path([(8, 26), (27, 26)], ("violet", 6))
        glow = [(15, 5)]
    ic.outline()
    ic.glow(glow, ("violet", 8))
    return ic


# ------------------------------------------------------------------------------------------- cloth
def _slipper(ic: Icon, t: Tone3, curl: int) -> None:
    """A low slipper; `curl` px of upturned toe."""
    ramp, lo, mid, hi = t
    ic.poly([(5, 20), (9, 17), (14, 19), (21, 21), (26, 23 - curl // 2), (28, 24 - curl), (28, 25), (5, 25)], (ramp, mid))
    ic.poly([(13, 19), (21, 21), (26, 23 - curl // 2), (24, 23), (16, 21)], (ramp, hi))  # the top of the foot
    ic.poly([(5, 23), (27, 24), (28, 25), (5, 25)], (ramp, lo))
    ic.poly([(5, 20), (9, 17), (9, 21), (5, 23)], (ramp, hi))  # the heel cup, lit
    if curl:
        ic.poly([(26, 23 - curl // 2), (28, 24 - curl), (30, 22 - curl), (29, 24)], (ramp, mid))  # the toe turning up
        ic.path([(26, 23 - curl // 2), (30, 22 - curl)], (ramp, hi))


def cloth(rank: int) -> Icon:
    ic = Icon()
    glow: list[tuple[float, float]] = []
    gtone = ("brass", 7)
    if rank == 1:  # linen wound up the shin over a rope sandal
        ic.poly([(9, 7), (17, 7), (17, 19), (9, 21)], ("bone", 6))  # the wrapped leg
        ic.poly([(9, 7), (12, 7), (12, 21), (9, 21)], ("bone", 7))
        ic.poly([(15, 7), (17, 7), (17, 19), (15, 19)], ("bone", 4))
        for y in (10, 13, 16, 19):  # the turns of the wrapping
            ic.path([(9, y + 1), (17, y - 1)], ("bone", 3))
        ic.rect(9, 6, 17, 7, ("sea", 4))  # band at the top
        ic.path([(9, 6), (17, 6)], ("sea", 6))
        ic.poly([(9, 21), (17, 19), (22, 20), (26, 23), (26, 25), (9, 25)], ("bone", 6))  # the foot
        ic.poly([(16, 19), (22, 20), (26, 23), (23, 23), (17, 21)], ("bone", 7))
        ic.path([(19, 20), (19, 25)], ("leather", 3))  # sandal straps
        ic.path([(23, 22), (23, 25)], ("leather", 3))
        ic.path([(9, 23), (17, 22)], ("leather", 3))
        _sole(ic, 8, 27, ("leather", 2))
    elif rank == 2:  # a teal slipper with a gold trim and a ribbon round the ankle
        _slipper(ic, ("sea", 3, 5, 7), 2)
        ic.path([(9, 17), (14, 19), (21, 21)], ("brass", 5))  # trim along the opening
        ic.path([(5, 20), (9, 17)], ("brass", 6))
        ic.poly([(9, 10), (14, 10), (14, 18), (9, 17)], ("bone", 6))  # a short stocking
        ic.poly([(9, 10), (11, 10), (11, 17), (9, 17)], ("bone", 7))
        ic.path([(9, 13), (14, 12)], ("sea", 5))  # the ribbon, crossed
        ic.path([(9, 15), (14, 14)], ("sea", 5))
        ic.rect(5, 26, 28, 26, ("sea", 2))
    elif rank == 3:  # a white slipper embroidered in gold, the toe curled, a red stone on the instep
        _slipper(ic, ("bone", 4, 6, 7), 4)
        ic.path([(9, 17), (14, 19), (21, 21)], ("brass", 5))
        ic.path([(5, 20), (9, 17)], ("brass", 6))
        ic.dots([(8, 22), (11, 23), (14, 22), (17, 23), (20, 23)], ("brass", 5))  # embroidery along the side
        ic.dots([(22, 21)], ("crimson", 5))
        ic.dots([(21, 21), (23, 21), (22, 20), (22, 22)], ("brass", 6))
        ic.poly([(9, 9), (15, 9), (15, 18), (9, 17)], ("bone", 6))  # stocking with a gold cuff
        ic.poly([(9, 9), (11, 9), (11, 17), (9, 17)], ("bone", 7))
        ic.poly([(14, 9), (15, 9), (15, 18), (14, 18)], ("bone", 4))
        ic.rect(8, 8, 16, 9, ("brass", 5))
        ic.path([(8, 8), (16, 8)], ("brass", 7))
        ic.rect(5, 26, 28, 26, ("brass", 3))
    elif rank == 4:  # a sandal of sun-gold: straps crossing up the shin, a jewelled ankle band, a sun on the instep
        ic.poly([(10, 6), (16, 6), (16, 19), (10, 20)], ("bone", 6))  # the leg in a white stocking
        ic.poly([(10, 6), (12, 6), (12, 20), (10, 20)], ("bone", 7))
        ic.poly([(15, 6), (16, 6), (16, 19), (15, 19)], ("bone", 4))
        ic.poly([(10, 20), (16, 19), (22, 20), (27, 23), (27, 25), (10, 25)], ("bone", 6))
        ic.poly([(15, 19), (22, 20), (27, 23), (24, 23), (17, 21)], ("bone", 7))
        for y in (8, 12):  # straps crossing
            ic.path([(10, y), (16, y + 3)], ("brass", 6))
            ic.path([(10, y + 3), (16, y)], ("brass", 5))
        ic.rect(9, 16, 17, 18, ("brass", 5))  # ankle band
        ic.path([(9, 16), (17, 16)], ("brass", 7))
        ic.dots([(13, 17)], ("azure", 7))
        ic.dots([(11, 17), (15, 17)], ("crimson", 5))
        ic.path([(19, 20), (19, 25)], ("brass", 6))  # toe straps
        ic.path([(24, 22), (24, 25)], ("brass", 6))
        for x, y in ((21, 21), (22, 21), (21, 22), (22, 22)):  # the sun
            ic.put(x, y, ("brass", 7))
        ic.dots([(20, 20), (23, 20), (20, 23), (23, 23)], ("brass", 5))
        ic.rect(9, 26, 28, 27, ("brass", 4))
        ic.path([(9, 26), (28, 26)], ("brass", 6))
        ic.poly([(27, 24), (30, 21), (29, 26), (28, 27)], ("brass", 6))  # the sole curling up at the toe
        glow = [(26, 18)]
    else:  # a slipper of void: dark cloth with stars caught in it, a crystal for a toe, a wisp trailing the heel
        _slipper(ic, ("ink", 3, 4, 5), 4)
        ic.path([(9, 17), (14, 19), (21, 21)], ("violet", 7))
        ic.path([(5, 20), (9, 17)], ("violet", 6))
        ic.dots([(8, 22), (13, 22), (18, 23), (23, 23)], ("violet", 8))  # stars
        ic.poly([(28, 20), (31, 15), (30, 21)], ("violet", 7))  # the crystal toe
        ic.path([(28, 20), (31, 16)], ("violet", 8))
        ic.poly([(9, 9), (15, 9), (15, 18), (9, 17)], ("ink", 4))  # a dark stocking with a band of light
        ic.poly([(9, 9), (11, 9), (11, 17), (9, 17)], ("ink", 5))
        ic.poly([(14, 9), (15, 9), (15, 18), (14, 18)], ("ink", 2))
        ic.rect(8, 8, 16, 9, ("violet", 5))
        ic.path([(8, 8), (16, 8)], ("violet", 8))
        ic.dots([(12, 13)], ("violet", 8))
        ic.poly([(5, 21), (1, 19), (2, 22), (0, 24), (5, 24)], ("violet", 5))  # the wisp behind the heel
        ic.path([(5, 21), (1, 19)], ("violet", 7))
        ic.rect(5, 26, 28, 26, ("ink", 1))
        glow = [(2, 16)]
        gtone = ("violet", 8)
    ic.outline()
    ic.glow(glow, gtone)
    return ic


NAMES = {
    "plate": ("Botas · Placa · Knight", "Grebas rígidas sobre escarpe, con rodillera: de una chapa atada con correas a una pieza de la Grieta.",
              plate, ["Canillera de hierro", "Greba de soldado", "Greba acanalada", "Escarpe alado dorado", "Escarpe de la Grieta"]),
    "leather": ("Botas · Cuero · Ranger", "Botas de media caña con vuelta y suela blanda.",
                leather, ["Abarca de pellejo", "Bota de montero", "Bota de montar tachonada", "Bota de piel de lobo", "Bota de la Grieta"]),
    "cloth": ("Botas · Tela · Priest", "Calzado bajo y blando: vendas, escarpines y sandalias, con la punta cada vez más vuelta.",
              cloth, ["Vendas y esparteña", "Escarpín de acólito", "Escarpín bordado", "Sandalia solar", "Escarpín del vacío"]),
}


def build() -> list[dict]:
    return [{"key": f"boots_{fam}", "title": title, "note": note,
             "items": [(f"boots_{fam}_{r}", names[r - 1], framed(family_tint(draw(r), fam, r), RANK_TIER[r])) for r in range(1, 6)]}
            for fam, (title, note, draw, names) in NAMES.items()]
