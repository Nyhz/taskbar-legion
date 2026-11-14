"""Pets and the Cube: the six companions (36×36, slot-sized, each also as the dark silhouette of a pet not yet
found), the plinth they stand on, the signs of their bonuses, and the pieces of the Cube panel — the cube's face
with its nine sockets, the signs of its three recipes and of its keys, and a pip per rarity.

Pets are hand-placed pixel by pixel and outlined, like the stat glyphs but bigger; every file stem starts with
`pet_` or `cube_`.
"""
from __future__ import annotations

from PIL import Image

from ..icons import Icon, TIER_TONES, frame
from ..rig import Cel, Tone
from .s80_stats import sprite

E = ".............."


def _rows(rows: list[str]) -> list[str]:
    assert len({len(r) for r in rows}) == 1, [(i, len(r)) for i, r in enumerate(rows)]
    return rows


def _cel(rows: list[str], legend: dict[str, Tone]) -> Cel:
    _rows(rows)
    c = Cel(len(rows[0]), len(rows))
    c.stamp(rows, legend, 0, 0)
    return c


# --------------------------------------------------------------------------------------------- pets
def _pet(rows: list[str], legend: dict[str, Tone]) -> Icon:
    """A pet in a slot-sized cel: centred, standing on the row a slot's art ends at (y = 32)."""
    _rows(rows)
    ic = Icon(36)
    ic.stamp(rows, legend, (36 - len(rows[0])) // 2, 33 - len(rows))
    ic.outline()
    return ic


def _dark(ic: Icon) -> Icon:
    """The same pet, not yet found: its shape and nothing else."""
    out = Icon(36)
    for xy, (ramp, i) in ic.px.items():
        edge = i <= 1 and ramp != "light"
        out.px[xy] = ("ink", 0) if edge else ("ink", 2)
    return out


def coin_sprite() -> Icon:  # a living coin with a face and two small wings
    return _pet([
        ".VV..................VV.",
        "VWWV................VWWV",
        "VWWWV....dddddd....VWWWV",
        ".VWWWV.ddYYYYyydd.VWWWV.",
        "..VWWVdYYYyyyyyysdVWWV..",
        ".VWWVdYYyyyyyyyyysdVWWV.",
        "VWWV.dYyyyyyyyyyssd.VWWV",
        ".VV..dYyyeyyyyeyysd..VV.",
        ".....dyyyeyyyyeyysd.....",
        ".....dyycyyyyyycysd.....",
        ".....dyyyymmmmyyssd.....",
        ".....dyyyyyyyyysssd.....",
        "......dyyyyyyysssd......",
        ".......ddsssssssd.......",
        ".........dddddd.........",
        ".........ff..ff.........",
        "........fff..fff........",
    ], {"V": ("azure", 5), "W": ("azure", 8), "d": ("brass", 3), "Y": ("brass", 7), "y": ("brass", 5), "s": ("brass", 4),
        "e": ("ink", 0), "c": ("crimson", 6), "m": ("brass", 2), "f": ("brass", 3)})


def scholar_owl() -> Icon:  # an owl in brass spectacles
    return _pet([
        "..bb............bb..",
        "..bBb..........bBb..",
        "..bBBbbbbbbbbbbBBb..",
        "..bBBBBBBBBBBBBBBb..",
        "..bBBgggBBBBgggBBb..",
        "..bBgwwwgBBgwwwgBb..",
        "..bBgweeggggweegBb..",
        "..bBgweegBBgweegBb..",
        "..bBBgggBooBgggBBb..",
        "..bBBBBBBOOBBBBBBb..",
        "..bDBBppppppppBBDb..",
        "..bDBpPppPppPppBDb..",
        "..bDBppppppppppBDb..",
        "..bDBppPppPppPpBDb..",
        "...bBBppppppppBBb...",
        "....bBBppppppBBb....",
        ".....bbbbbbbbbb.....",
        "......oo....oo......",
        ".....ooo....ooo.....",
    ], {"b": ("leather", 2), "B": ("leather", 4), "D": ("leather", 3), "p": ("bone", 6), "P": ("bone", 4), "g": ("brass", 5),
        "w": ("light", 0), "e": ("ink", 0), "o": ("brass", 5), "O": ("brass", 3)})


def pack_mule() -> Icon:  # a mule under saddlebags and a bedroll
    return _pet([
        "...................m..m...",
        "...................mC.mC..",
        "...................mCmmC..",
        "..................mCCCCCm.",
        "..................mCCeCCCC",
        ".................mmCCCCCPP",
        "......rrrrrrrr..mCCCCCPPP.",
        "......rRRRRRRr..mCCCCPPP..",
        "...CCCLLLLLLLLCCmCCCC.....",
        ".tCCCClLLbLLLlCCCCCC......",
        ".tCCCClLLLLLLlCCCCC.......",
        ".tCCCCCllllllCCCCCC.......",
        ".tDCCCCCCCCCCCCCCCD.......",
        "..DDCCCCCCCCCCCCDD........",
        "...DDDDDDDDDDDDDD.........",
        "...CC.DD.....DD.CC........",
        "...CC.DD.....DD.CC........",
        "...CC.DD.....DD.CC........",
        "...CC.DD.....DD.CC........",
        "...hh.hh.....hh.hh........",
    ], {"C": ("bone", 4), "D": ("bone", 2), "m": ("ink", 2), "P": ("bone", 6), "e": ("ink", 0), "t": ("ink", 2),
        "L": ("leather", 5), "l": ("leather", 3), "b": ("brass", 5), "r": ("crimson", 3), "R": ("crimson", 5), "h": ("ink", 1)})


def lucky_cat() -> Icon:  # a white cat, one paw raised, a bell at its collar
    return _pet([
        ".WW........WW.....",
        ".WRW......WRW.....",
        ".WRWWWWWWWWRW.....",
        ".WWWWWWWWWWWS.WW..",
        ".WWWWWWWWWWWS.WW..",
        ".WWeeWWWWeeWS.WS..",
        ".WWWWWnnWWWWS.WS..",
        ".WcWWWmmWWWcSWWS..",
        "..WWWWWWWWWSWWS...",
        "..rrrrrrrrrrWS....",
        ".WWWWWggWWWWWS....",
        ".WWWWWggWWWWS.....",
        ".WWWWWWWWWWWS.....",
        ".WWWWWWWWWWWS..W..",
        ".WWWkWWWWkWWS.WS..",
        ".WWWkWWWWkWWSWS...",
        ".WWWkWWWWkWWSS....",
        ".WWWkWWWWkWWS.....",
    ], {"W": ("bone", 7), "S": ("bone", 5), "R": ("crimson", 5), "e": ("ink", 0), "n": ("crimson", 6), "c": ("crimson", 7),
        "m": ("bone", 3), "r": ("crimson", 4), "g": ("brass", 5), "k": ("bone", 3)})


def time_imp() -> Icon:  # a violet imp hugging an hourglass
    return _pet([
        "..h..........h......",
        "..hh........hh......",
        "...hVVVVVVVVh.......",
        "..VVVVVVVVVVVV......",
        "EEVVVVVVVVVVVVEE....",
        ".EVVyyVVVVyyVVE.....",
        "..VVykVVVVykVV......",
        "..VVVVVVVVVVVV......",
        "...VVwmwmwmVVV......",
        "....vVVVVVVv.gggggg.",
        ".....VVVVVV..GssssG.",
        "....vVVVVVVVVV.Gss..",
        "t...vVVVVVVVVV..ss..",
        "tt..vVVVVVVv...G..G.",
        ".tt..vVVVVv...GssssG",
        "..ttttVV.VV..gggggg.",
        ".....VVV.VVV........",
    ], {"h": ("bone", 6), "V": ("violet", 5), "v": ("violet", 3), "E": ("violet", 4), "y": ("brass", 6), "k": ("ink", 0),
        "w": ("light", 0), "m": ("violet", 1), "g": ("brass", 4), "G": ("azure", 7), "s": ("brass", 6), "t": ("violet", 4)})


def hoarder() -> Icon:  # a small drake that will not let go of its chest
    return _pet([
        ".....h........h.....",
        ".....hGGGGGGGGh.....",
        "....GGGGGGGGGGGG....",
        "....GyyGGGGGGyyG....",
        "....GyeGGGGGGyeG....",
        "....GGGGGGGGGGGG....",
        "...GGGGGnGGnGGGGG...",
        "..ccGGGGGGGGGGGGcc..",
        ".ccYyyYyyYyyYyyYycc.",
        ".cLLLLLLLLLLLLLLLLc.",
        ".GLLLLLLLLLLLLLLLLG.",
        ".GbbbbbbbggbbbbbbbG.",
        ".GLLLLLLLggLLLLLLLG.",
        ".GLLLLLLLLLLLLLLLLG.",
        "..lLLLLLLLLLLLLLLl.t",
        "..lllllllllllllllltt",
        "...tttttttttttttttt.",
    ], {"h": ("bone", 6), "G": ("moss", 5), "y": ("brass", 6), "Y": ("brass", 7), "e": ("ink", 0), "n": ("moss", 2),
        "c": ("moss", 7), "L": ("leather", 5), "l": ("leather", 3), "b": ("brass", 4), "g": ("brass", 6), "t": ("moss", 4)})


def plinth(on: bool = False) -> Image.Image:
    """36×9: the stone each pet stands on; brass-topped under the companion."""
    top: dict[str, Tone] = {"H": ("brass", 6), "T": ("brass", 4)} if on else {"H": ("ink", 5), "T": ("ink", 4)}
    return _cel([
        "..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
        ".kHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHHk.",
        "kTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTk",
        "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
        ".kFFFFFFFFFFjFFFFFFFFFFFFjFFFFFFFSk.",
        ".kFFFFFFFFFFjFFFFFFFFFFFFjFFFFFFFSk.",
        ".kSSSSSSSSSSjSSSSSSSSSSSSjSSSSSSSSk.",
        ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
        "....................................",
    ], {"k": ("ink", 0), "F": ("ink", 3), "S": ("ink", 2), "j": ("ink", 1), **top}).image()


# ------------------------------------------------------------------------------- signs of the bonuses
def sign_chest() -> Icon:  # more chests fall: a chest and a plus
    return sprite([
        E,
        "..........gg..",
        ".........gGGg.",
        "..........gg..",
        ".llllllllll...",
        "lLLLLLLLLLLl..",
        "lLLLLLLLLLLl..",
        "bbbbbyybbbbb..",
        "lCCCCyyCCCDl..",
        "lCCCCCCCCCDl..",
        "lCCCCCCCCCDl..",
        "llllllllllll..",
        E,
        E,
    ], {"l": ("leather", 2), "L": ("leather", 5), "C": ("leather", 4), "D": ("leather", 3), "b": ("brass", 4), "y": ("brass", 6),
        "g": ("moss", 4), "G": ("moss", 6)})


def _stack(ramp: str) -> Icon:
    return sprite([
        E,
        "...llllllll...",
        "...lLLLLLLl...",
        "...bbbyybbb...",
        "...lCCCCCDl...",
        "...llllllll...",
        E,
        "llllllllllllll"[:14],
        "lLLLLLLLLLLLLl",
        "bbbbbbyybbbbbb",
        "lCCCCCyyCCCCDl",
        "lCCCCCCCCCCCDl",
        "llllllllllllll",
        E,
    ], {"l": (ramp, 2), "L": (ramp, 5), "C": (ramp, 4), "D": (ramp, 3), "b": ("brass", 4), "y": ("brass", 6)})


def sign_store() -> Icon:  # room for more common chests
    return _stack("leather")


def sign_store_boss() -> Icon:  # room for more stage-boss chests
    return _stack("crimson")


def sign_timer() -> Icon:  # chests open themselves sooner: an hourglass
    return sprite([
        E,
        "..gggggggggg..",
        "...GssssssG...",
        "...GssssssG...",
        "....GssssG....",
        ".....GssG.....",
        "......ss......",
        ".....G.sG.....",
        "....G..s.G....",
        "...G..sss.G...",
        "...GssssssG...",
        "..gggggggggg..",
        E,
        E,
    ], {"g": ("brass", 4), "G": ("azure", 7), "s": ("brass", 6)})


def sign_paw() -> Icon:  # the companion: who walks with the party
    return sprite([
        E,
        "....pp..pp....",
        "...pPPppPPp...",
        "...pPPppPPp...",
        ".pp.pp..pp.pp.",
        "pPPp......pPPp",
        "pPPp.pppp.pPPp",
        ".pp.pPPPPp.pp.",
        "...pPPPPPPp...",
        "..pPPPPPPPPp..",
        "..pPPPPPPPPp..",
        "...pPPppPPp...",
        "....pp..pp....",
        E,
    ], {"p": ("dusk", 4), "P": ("dusk", 7)})


# ----------------------------------------------------------------------------------------- the Cube
def face() -> Image.Image:
    """126×132: the Cube seen from the front, a little from above — an iron box with nine sockets (36×36 holes at
    a 38 px pitch, the first at x = 7, y = 13), Rift light in the channels between them and brass on its corners."""
    w, top, side = 126, 6, 126
    c = Cel(w, top + side)
    for y in range(top):  # the lid, receding: a lighter band that narrows upwards
        inset = (top - 1 - y)
        for x in range(inset, w - inset):
            edge = x in (inset, w - inset - 1) or y == 0
            c.put(x, y, ("ink", 0) if edge else ("ink", 5) if y == 1 else ("ink", 4))
    for y in range(side):
        for x in range(w):
            ring = min(x, y, w - 1 - x, side - 1 - y)
            if ring == 0:
                tone: Tone = ("ink", 0)
            elif ring == 1:
                tone = ("ink", 5) if (x == 1 or y == 1) else ("ink", 2)
            else:
                tone = ("ink", 3) if ring < 6 else ("ink", 1)
            c.put(x, top + y, tone)
    for i in range(3):  # the sockets, and a dark line around each
        for j in range(3):
            x0, y0 = 7 + i * 38, top + 7 + j * 38
            for y in range(-1, 37):
                for x in range(-1, 37):
                    hole = 0 <= x < 36 and 0 <= y < 36
                    c.put(x0 + x, y0 + y, ("ink", 0) if not hole else ("ink", 1) if (x == 35 or y == 35) else ("ink", 0))
    for k in (1, 2):  # the channels: Rift light between the sockets, brighter where they cross
        for t in range(8, 118):
            cross = any(abs(t - (6 + m * 38)) <= 2 for m in (1, 2))
            for a, b in ((6 + k * 38 - 1, t), (t, 6 + k * 38 - 1)):
                c.put(a, top + b, ("violet", 7) if cross else ("violet", 4))
    for cx, cy, sx, sy in ((0, 0, 1, 1), (w - 1, 0, -1, 1), (0, side - 1, 1, -1), (w - 1, side - 1, -1, -1)):  # brass corners
        for k in range(1, 6):
            for t in range(1, 3):
                lit = (sx > 0 or sy > 0) and t == 1
                c.put(cx + sx * k, top + cy + sy * t, ("brass", 5 if lit else 3))
                c.put(cx + sx * t, top + cy + sy * k, ("brass", 5 if lit else 3))
        c.put(cx + sx * 2, top + cy + sy * 2, ("brass", 7))
    return c.image()


def result(tier: int) -> Image.Image:
    """36×36: what the Cube will give — an empty frame of the rarity to come, a question inside."""
    ic = frame(tier)
    ramp, _dark_i, hi = TIER_TONES[tier]
    ic.stamp(_rows([
        "..qqqqqq..",
        ".qqqqqqqq.",
        "qqq....qqq",
        "qq.....qqq",
        "......qqq.",
        ".....qqq..",
        "....qqq...",
        "....qq....",
        "....qq....",
        "..........",
        "....qq....",
        "....qq....",
    ]), {"q": (ramp, max(1, hi - 3))}, 13, 12)
    return ic.image()


def pip(tier: int) -> Image.Image:
    """9×9: a rarity said in one small square (payment gems, the rarities to melt on sight)."""
    c = Cel(9, 9)
    iris = ["sea", "azure", "violet", "dusk", "brass", "moss"]
    for y in range(9):
        for x in range(9):
            ring = min(x, y, 8 - x, 8 - y)
            if (x, y) in ((0, 0), (8, 0), (0, 8), (8, 8)):
                continue
            if tier == 8:
                ramp, dark, hi = iris[(x + y) // 3 % len(iris)], 5, 7
            else:
                ramp, dark, hi = TIER_TONES[tier]
            c.put(x, y, ("ink", 0) if ring == 0 else (ramp, hi) if (x == 1 or y == 1) else (ramp, dark))
    return c.image()


def tab_synth() -> Icon:  # many into one: three small stones under a big one
    return sprite([
        E,
        "......vv......",
        ".....vVVv.....",
        "....vVWVVv....",
        "....vVVVDv....",
        ".....vVDv.....",
        "......vv......",
        "......aa......",
        "...a..aa..a...",
        "..vv..vv..vv..",
        ".vVDv.VDv.vVDv"[:14],
        "..vv..vv..vv..",
        E,
        E,
    ], {"v": ("violet", 3), "V": ("violet", 6), "W": ("violet", 8), "D": ("violet", 4), "a": ("ink", 7)})


def tab_alchemy() -> Icon:  # a crucible pouring gold
    return sprite([
        E,
        "kk........kk..",
        "kKkkkkkkkkKk..",
        ".kyyYYyyyyk...",
        ".kKyyyyyyKk...",
        "..kKKKKKKk.y..",
        "...kkkkkk..y..",
        "...........y..",
        "..........yYy.",
        "....gggggggg..",
        "...gyyYYyyyyg.",
        "...gyyyyyyddg.",
        "....gggggggg..",
        E,
    ], {"k": ("ink", 3), "K": ("ink", 6), "y": ("brass", 5), "Y": ("brass", 7), "g": ("brass", 2), "d": ("brass", 4)})


def tab_transfig() -> Icon:  # one thing turned into another: two arrows chasing
    return sprite([
        E,
        "....ssssss....",
        "...sSSSSSSs.s.",
        "..sSs....sSsSs",
        "..ss......sSSs",
        ".........sssss",
        E,
        E,
        "ccccc.........",
        "cCCc......cc..",
        "cCcCc....cCc..",
        ".c.cCCCCCCc...",
        "....cccccc....",
        E,
    ], {"s": ("sea", 3), "S": ("sea", 6), "c": ("dusk", 4), "C": ("dusk", 7)})


def arrow() -> Icon:  # into
    return sprite([
        E,
        E,
        E,
        "........gg....",
        "........gGg...",
        "ggggggggggGg..",
        "gGGGGGGGGGGGg.",
        "gDDDDDDDDDDDg.",
        "ggggggggggDg..",
        "........gDg...",
        "........gg....",
        E,
        E,
        E,
    ], {"g": ("brass", 2), "G": ("brass", 6), "D": ("brass", 4)})


def plus() -> Icon:  # and: the piece plus what pays for it
    return sprite([
        E,
        E,
        E,
        ".....gggg.....",
        ".....gGGg.....",
        "..ggggGGgggg..",
        "..gGGGGGGGGg..",
        "..gDDDGGDDDg..",
        "..ggggGDgggg..",
        ".....gGDg.....",
        ".....gggg.....",
        E,
        E,
        E,
    ], {"g": ("brass", 2), "G": ("brass", 6), "D": ("brass", 4)})


def go() -> Icon:  # the key that works the Cube: a spark between two halves
    return sprite([
        E,
        "......ww......",
        "......ww......",
        ".....wWWw.....",
        "..w..wWWw..w..",
        "...wwWWWWww...",
        ".wwWWWWWWWWww.",
        ".wwWWWWWWWWww.",
        "...wwWWWWww...",
        "..w..wWWw..w..",
        ".....wWWw.....",
        "......ww......",
        "......ww......",
        E,
    ], {"w": ("brass", 1), "W": ("brass", 2)})


def fill() -> Icon:  # fill the Cube by itself: nine dots and an arrow in
    return sprite([
        E,
        "kk.kk.kk......",
        "kk.kk.kk......",
        "..............",
        "kk.kk.kk..g...",
        "kk.kk.kk.gGg..",
        ".........gGg..",
        "kk.kk.kk.gGg..",
        "kk.kk.kk.gGg..",
        ".......gggGggg",
        "........gGGGg.",
        ".........gGg..",
        "..........g...",
        E,
    ], {"k": ("ink", 8), "g": ("moss", 3), "G": ("moss", 6)})


def from_stash() -> Icon:  # take from the stash too: a strongbox with its door open
    return sprite([
        E,
        "kkkkkkkkkkkk..",
        "kKKKKKKKKKKk..",
        "kKddddddddKk..",
        "kKd......dKkk.",
        "kKd.yy...dKkKk",
        "kKd.yyy..dKkKk",
        "kKd......dKkKk",
        "kKddddddddKkKk",
        "kKKKKKKKKKKkk.",
        "kkkkkkkkkkkk..",
        ".kk......kk...",
        E,
        E,
    ], {"k": ("ink", 2), "K": ("ink", 6), "d": ("ink", 0), "y": ("brass", 6)})


def lucky() -> Icon:  # a four-leaf clover: the lucky double jump
    return sprite([
        E,
        "...gg....gg...",
        "..gGGg..gGGg..",
        "..gGGGggGGGg..",
        "...gGGGGGGg...",
        "....gGGGGg....",
        "...gGGGGGGg...",
        "..gGGGggGGGg..",
        "..gGGg..gGGg..",
        "...gg..s.gg...",
        ".......s......",
        "........s.....",
        E,
        E,
    ], {"g": ("moss", 3), "G": ("moss", 6), "s": ("moss", 4)})


def keep() -> Icon:  # keep the new one
    return sprite([
        E,
        E,
        "...........gg.",
        "..........gGg.",
        ".........gGg..",
        "........gGg...",
        ".gg....gGg....",
        ".gGg..gGg.....",
        "..gGggGg......",
        "...gGGg.......",
        "....gg........",
        E,
        E,
        E,
    ], {"g": ("brass", 1), "G": ("brass", 2)})


def revert() -> Icon:  # keep the old one: an arrow turning back
    return sprite([
        E,
        E,
        "...k..........",
        "..kK..........",
        ".kKKkkkkkk....",
        "kKKKKKKKKKk...",
        ".kKKkkkkkKKk..",
        "..kK.....kKk..",
        "...k.....kKk..",
        ".........kKk..",
        "....kkkkkKKk..",
        "....kKKKKKk...",
        "....kkkkkk....",
        E,
    ], {"k": ("ink", 4), "K": ("ink", 9)})


def star() -> Icon:  # a perfect roll
    return sprite([
        E,
        E,
        "......gg......",
        "......gg......",
        ".....gYYg.....",
        ".ggggYYYYgggg.",
        "..gYYYWYYYYg..",
        "...gYYYYYYg...",
        "...gYYYYYYg...",
        "..gYYYggYYYg..",
        "..gYg....gYg..",
        "..gg......gg..",
        E,
        E,
    ], {"g": ("brass", 3), "Y": ("brass", 6), "W": ("light", 0)})


def auto() -> Icon:  # melt on sight: a small flame under a drop of gold
    return sprite([
        E,
        "......yy......",
        ".....yYYy.....",
        ".....yYYy.....",
        "......yy......",
        E,
        "......r.......",
        ".....rRr..r...",
        "..r..rRRrrRr..",
        ".rRrrRRoRRRr..",
        ".rRRRooooRRr..",
        "..rRRooooRr...",
        "...rrrrrrr....",
        E,
    ], {"y": ("brass", 3), "Y": ("brass", 6), "r": ("crimson", 3), "R": ("crimson", 5), "o": ("brass", 6)})


PETS = [
    ("coin_sprite", "Duende de la moneda", coin_sprite), ("scholar_owl", "Búho erudito", scholar_owl), ("pack_mule", "Mula de carga", pack_mule),
    ("lucky_cat", "Gato de la suerte", lucky_cat), ("time_imp", "Diablillo del tiempo", time_imp), ("hoarder", "Acaparador", hoarder),
]


def build() -> list[dict]:
    pets = [(key, name, fn()) for key, name, fn in PETS]
    return [
        {"key": "pets", "title": "Mascotas", "note": "Las seis mascotas, del tamaño de una casilla. Dan su bonificación solo por tenerlas; la elegida acompaña al grupo.",
         "items": [(f"pet_{key}", name, ic.image()) for key, name, ic in pets]},
        {"key": "pets_dark", "title": "Mascotas sin descubrir", "note": "La misma figura en sombra: sabes que existe, no cuál es.",
         "items": [(f"pet_{key}_dark", f"{name} (sin descubrir)", _dark(ic).image()) for key, name, ic in pets]},
        {"key": "pets_signs", "title": "Signos de las mascotas", "note": "Lo que da cada mascota, en un signo de 16 × 16, y la peana donde posan.",
         "items": [("pet_sign_chest", "Más cofres", sign_chest().image()), ("pet_sign_store", "Hueco para cofres comunes", sign_store().image()),
                   ("pet_sign_store_boss", "Hueco para cofres de jefe", sign_store_boss().image()), ("pet_sign_timer", "Apertura automática", sign_timer().image()),
                   ("pet_sign_paw", "Acompañante", sign_paw().image()), ("pet_plinth", "Peana", plinth()), ("pet_plinth_on", "Peana del acompañante", plinth(True))]},
        {"key": "cube_signs", "title": "Signos del Cubo", "note": "Las tres recetas (sintetizar, alquimia, transfigurar), sus teclas y sus avisos.",
         "items": [("cube_tab_synth", "Sintetizar", tab_synth().image()), ("cube_tab_alchemy", "Alquimia", tab_alchemy().image()), ("cube_tab_transfig", "Transfigurar", tab_transfig().image()),
                   ("cube_arrow", "Da", arrow().image()), ("cube_plus", "Y", plus().image()), ("cube_go", "Obrar", go().image()), ("cube_fill", "Llenar solo", fill().image()),
                   ("cube_from_stash", "Usar también el alijo", from_stash().image()), ("cube_lucky", "Síntesis afortunada", lucky().image()),
                   ("cube_keep", "Quedarse lo nuevo", keep().image()), ("cube_revert", "Quedarse lo de antes", revert().image()),
                   ("cube_star", "Tirada perfecta", star().image()), ("cube_auto", "Fundir al caer", auto().image())]},
        {"key": "cube_pips", "title": "Rarezas en pequeño", "note": "Un cuadradito por rareza, para pagos y filtros.",
         "items": [(f"cube_pip_{t}", f"T{t}", pip(t)) for t in range(9)]},
        {"key": "cube_pieces", "title": "Piezas del Cubo", "note": "La cara del Cubo con sus nueve huecos y la casilla del resultado, con el marco de la rareza que saldrá.",
         "items": [("cube_face", "El Cubo", face())] + [(f"cube_result_{t}", f"Resultado T{t}", result(t)) for t in (4, 5)]},
    ]
