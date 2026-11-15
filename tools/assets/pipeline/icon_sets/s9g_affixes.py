"""The signs of the BOSS KIT (src/data/bossKit.ts): one per affix a boss can carry and one per world-boss mechanic,
shown on the HUD's boss line next to its name (16 px, `hud_aff_*` / `hud_mech_*`), plus the 7×7 mini signs of what
a boss leaves on a hero (`hud_s_m_venom`, `hud_s_m_roots`) for the chips over his head.

One bold shape each, one colour family each, so they are told apart at ×1 on the dark rail:
  armored   a steel shield            vampiric  fangs over a blood drop      frenzied  three hot claw marks
  seismic   a blow cracking the ground venomous  a green drop                 deadeye   a brass reticle, red centre
  mortal    a violet heart split in two (the colour Mortal Wound already has on the strip)
  flock     a crow                    roots     a stump throwing shoots      chain     a bolt
"""
from __future__ import annotations

from ..icons import Icon
from .s80_stats import sprite
from .s9f_striphud import px

E = ".............."


def armored() -> Icon:
    return sprite([
        "..aaaaaaaaaa..",
        ".aSSSSSSSSSSa.",
        ".aSAAAAAAAAda.",
        ".aSAgAAAAgAda.",
        ".aSAAAAAAAAda.",
        ".aSAAAAAAAAda.",
        ".aSAAAggAAAda.",
        ".aSAAAggAAAda.",
        "..aSAAAAAAda..",
        "..aSAAAAAAda..",
        "...aSAAAAda...",
        "....aSAAda....",
        ".....adda.....",
        "......aa......",
    ], {"a": ("ink", 3), "S": ("ink", 9), "A": ("ink", 7), "d": ("ink", 5), "g": ("brass", 5)})


def vampiric() -> Icon:
    return sprite([
        E,
        ".rrrrrrrrrrrr.",
        ".rWWrrrrrrWWr.",
        "..WWW....WWW..",
        "..WWW....WWW..",
        "..WWw....wWW..",
        "...Ww....wW...",
        "...Ww....wW...",
        "....w.RR.w....",
        ".....RRRR.....",
        ".....RHRR.....",
        "......RR......",
        E,
        E,
    ], {"W": ("bone", 7), "w": ("bone", 5), "r": ("crimson", 3), "R": ("crimson", 5), "H": ("crimson", 7)})


def frenzied() -> Icon:
    return sprite([
        E,
        E,
        "....o...o...o.",
        "...oY..oY..oY.",
        "...YO..YO..YO.",
        "..oYO.oYO.oYO.",
        "..YO..YO..YO..",
        ".oYO.oYO.oYO..",
        ".YO..YO..YO...",
        ".Y...Y...Y....",
        E,
        E,
        E,
        E,
    ], {"o": ("crimson", 3), "O": ("crimson", 5), "Y": ("brass", 6)})


def seismic() -> Icon:
    return sprite([
        E,
        "......ww......",
        "...w..WW..w...",
        "..w...WW...w..",
        "..w..WWWW..w..",
        "...w.WWWW.w...",
        "......WW......",
        ".gggggWWggggg.",
        ".GGGGkGGkGGGG.",
        ".GGGkGGGGkGGG.",
        ".GGkGGkGGGkGG.",
        ".dddkddkddddd.",
        E,
        E,
    ], {"W": ("brass", 6), "w": ("bone", 5), "g": ("leather", 6), "G": ("leather", 4), "d": ("leather", 2), "k": ("ink", 0)})


def venomous() -> Icon:
    return sprite([
        E,
        "......mm......",
        "......mM......",
        ".....mMMm.....",
        ".....mMMm.....",
        "....mMMMMm....",
        "....mMWMMm....",
        "...mMWMMMMm...",
        "...mMWMMMMm...",
        "...mMMMMMMm...",
        "....mMMMMm..m.",
        ".m...mmmm..mMm",
        "mMm.........m.",
        ".m............",
    ], {"m": ("moss", 3), "M": ("moss", 6), "W": ("moss", 8)})


def deadeye() -> Icon:
    return sprite([
        E,
        "......gg......",
        "....ggGGgg....",
        "...g..GG..g...",
        "..g...gg...g..",
        "..g........g..",
        ".gGg..RR..gGg.",
        ".gGg..RR..gGg.",
        "..g........g..",
        "..g...gg...g..",
        "...g..GG..g...",
        "....ggGGgg....",
        "......gg......",
        E,
    ], {"g": ("brass", 4), "G": ("brass", 6), "R": ("crimson", 5)})


def mortal() -> Icon:
    return sprite([
        E,
        "..vvv....vvv..",
        ".vVVVv..vVVVv.",
        ".vVHVVkvVVVVv.",
        ".vVVVkkVVVVVv.",
        ".vVVVVkkVVVVv.",
        "..vVVVVkVVVv..",
        "..vVVVkkVVVv..",
        "...vVVkVVVv...",
        "....vVVkVv....",
        ".....vVVv.....",
        "......vv......",
        E,
        E,
    ], {"v": ("violet", 4), "V": ("violet", 6), "H": ("violet", 8), "k": ("ink", 0)})


def flock() -> Icon:  # a crow, beak to the left
    return sprite([
        E,
        "....kkkk......",
        "...kKKKKk.....",
        "..kKKeKKKk....",
        "ggkKKKKKKKk...",
        ".ggKKKKKKKKk..",
        "...kKKKKKKKKk.",
        "...kKKKKKKKKKk",
        "....kKKKKKkKKk",
        ".....kKKKk.kKk",
        "......k.k...kk",
        ".....kk.kk....",
        E,
        E,
    ], {"k": ("ink", 3), "K": ("ink", 5), "e": ("crimson", 6), "g": ("brass", 5)})


def roots() -> Icon:  # a stump throwing shoots up and roots down
    return sprite([
        E,
        "....l....m....",
        "...lL...mM....",
        "...lL..mMm..l.",
        "..lLl..mM..lL.",
        "..lL..lmM.lLl.",
        "..lLllLLmmLl..",
        "...lLLLLLLl...",
        "....lLLLLl....",
        "....lLLLLl....",
        "...lLLllLLl...",
        "..lLl.lL.lLl..",
        ".lLl..lL..lLl.",
        E,
    ], {"l": ("leather", 3), "L": ("leather", 5), "m": ("moss", 4), "M": ("moss", 6)})


def chain() -> Icon:  # a bolt
    return sprite([
        E,
        ".......bBB....",
        "......bBWb....",
        ".....bBWb.....",
        "....bBWb......",
        "...bBWWBBb....",
        "....bbbWWb....",
        "......bWBb....",
        ".....bWBb.....",
        "....bWBb......",
        "...bWBb.......",
        "...bBb........",
        "...bb.........",
        E,
    ], {"b": ("azure", 4), "B": ("azure", 7), "W": ("light", 0)})


def guilt() -> Icon:  # the Scapegoat's brand: a horned head
    return sprite([
        E,
        ".rr........rr.",
        "rRRr......rRRr",
        "rRrRr....rRrRr",
        "rR.rRrrrrRr.Rr",
        ".rr.rRRRRr.rr.",
        "....rRRRRr....",
        "...rRyRRyRr...",
        "...rRRRRRRr...",
        "....rRRRRr....",
        "....rRrrRr....",
        ".....rRRr.....",
        "......rr......",
        E,
    ], {"r": ("crimson", 3), "R": ("crimson", 5), "y": ("brass", 6)})


def gilded() -> Icon:  # the Abbot's bell
    return sprite([
        E,
        "......gg......",
        ".....gGGg.....",
        "....gGHGGg....",
        "....gGHGGg....",
        "...gGHGGGGg...",
        "...gGHGGGGg...",
        "...gGGGGGGg...",
        "..gGGGGGGGGg..",
        ".gggggggggggg.",
        "......dd......",
        ".....dGGd.....",
        "......dd......",
        E,
    ], {"g": ("brass", 4), "G": ("brass", 6), "H": ("brass", 7), "d": ("brass", 3)})


def undertow() -> Icon:  # a wave curling over
    return sprite([
        E,
        "......bbbb....",
        "....bbBBBBb...",
        "...bBBWWBBBb..",
        "..bBBW..bBBb..",
        "..bBW....bBBb.",
        ".bBBW.....bBb.",
        ".bBBBW....bb..",
        ".bBBBBWW......",
        "bBBBBBBBWWbb..",
        "bBBBBBBBBBBBbb",
        "bbBBBBBBBBBBBb",
        "..bbbbbbbbbbb.",
        E,
    ], {"b": ("azure", 2), "B": ("azure", 4), "W": ("bone", 7)})


def spores() -> Icon:  # a destroying angel shedding its dust
    return sprite([
        E,
        ".....wwww.....",
        "...wwWWWWww...",
        "..wWWWWWWWWw..",
        ".wWWWWWWWWWWw.",
        ".wwggwggwggww.",
        "....sSSSSs....",
        ".....sSSs.....",
        ".....sSSs.....",
        ".....sSSs..m..",
        "..m.ssSSss....",
        "....ssssss.m..",
        ".m............",
        E,
    ], {"w": ("bone", 5), "W": ("bone", 7), "g": ("bone", 4), "s": ("bone", 5), "S": ("bone", 6), "m": ("moss", 7)})


def red_blade() -> Icon:  # a blade heated white at the point
    return sprite([
        "...........YYw",
        "..........YYwy",
        ".........oYwy.",
        "........oYYy..",
        ".......oYYo...",
        "......rOYo....",
        ".....rOOo.....",
        "....rROo......",
        "...rRRr.......",
        "..kRRr........",
        ".kkkr.........",
        "kkk...........",
        ".k............",
        E,
    ], {"Y": ("brass", 6), "w": ("light", 0), "y": ("brass", 7), "o": ("crimson", 6), "O": ("crimson", 5), "r": ("crimson", 3), "R": ("crimson", 4), "k": ("ink", 4)})


def scales() -> Icon:  # the Verdict's balance
    return sprite([
        E,
        "......gg......",
        ".gggggGGggggg.",
        ".g....gg....g.",
        ".g....gg....g.",
        "g.g...gg...g.g",
        "g.g...gg...g.g",
        "GGG...gg...GGG",
        ".G....gg....G.",
        "......gg......",
        "......gg......",
        "....gGGGGg....",
        "...gggggggg...",
        E,
    ], {"g": ("brass", 4), "G": ("brass", 6)})


def mirror() -> Icon:  # a hand mirror, cracked
    return sprite([
        E,
        ".....gggg.....",
        "...ggLLLLgg...",
        "..gLLWLLkLLg..",
        "..gLWLLkLLLg..",
        "..gLLLkkLLLg..",
        "..gLLLLkLaLg..",
        "..gLLLkLaaLg..",
        "...ggLLaagg...",
        ".....gggg.....",
        "......gg......",
        "......gg......",
        ".....gggg.....",
        E,
    ], {"g": ("brass", 5), "L": ("azure", 7), "W": ("light", 0), "a": ("azure", 5), "k": ("ink", 1)})


GREEN = {"m": ("moss", 4), "M": ("moss", 6), "W": ("moss", 8)}
WOOD = {"l": ("leather", 5), **GREEN}

MINI = [
    ("venom", "Veneno", [
        "...m...",
        "..mMm..",
        "..mMm..",
        ".mMWMm.",
        ".mMMMm.",
        "..mmm..",
        "m.....m",
    ], GREEN),
    ("roots", "Raíces (atado)", [
        "M.....M",
        ".M.l.M.",
        ".MlllM.",
        "..lMl..",
        ".MlllM.",
        "M.l.l.M",
        "..l.l..",
    ], WOOD),
    ("guilt", "Culpa (marcado)", [
        "r.....r",
        "Rr...rR",
        ".RrrrR.",
        ".rRRRr.",
        ".RyRyR.",
        "..RRR..",
        "...r...",
    ], {"r": ("crimson", 4), "R": ("crimson", 6), "y": ("brass", 6)}),
    ("gilded", "Silencio dorado (recargas detenidas)", [
        "...g...",
        "..gGg..",
        "..gGg..",
        ".gGGGg.",
        ".gGGGg.",
        "ggggggg",
        "...G...",
    ], {"g": ("brass", 4), "G": ("brass", 6)}),
    ("spores", "Esporas", [
        "..www..",
        ".wWWWw.",
        "wWWWWWw",
        "..sSs..",
        "..sSs..",
        ".m...m.",
        "...m...",
    ], {"w": ("bone", 5), "W": ("bone", 7), "s": ("bone", 5), "S": ("bone", 6), "m": ("moss", 7)}),
]


def build() -> list[dict]:
    affixes = [
        ("hud_aff_armored", "Acorazado", armored()), ("hud_aff_vampiric", "Vampírico", vampiric()),
        ("hud_aff_frenzied", "Enfurecido", frenzied()), ("hud_aff_seismic", "Sísmico", seismic()),
        ("hud_aff_venomous", "Venenoso", venomous()), ("hud_aff_deadeye", "Certero", deadeye()),
        ("hud_aff_mortalWound", "Herida mortal", mortal()),
    ]
    mechanics = [("hud_mech_flock", "Bandada", flock()), ("hud_mech_roots", "Raíces", roots()), ("hud_mech_chainBolt", "Rayo en cadena", chain()),
                 ("hud_mech_guilt", "Culpa", guilt()), ("hud_mech_gildedSilence", "Silencio dorado", gilded()), ("hud_mech_undertow", "Resaca", undertow()),
                 ("hud_mech_spores", "Esporas", spores()), ("hud_mech_redBlade", "Hoja al rojo", red_blade()), ("hud_mech_scales", "Balanza", scales()), ("hud_mech_mirror", "Espejos", mirror())]
    return [
        {"key": "boss_affixes", "title": "Afijos de jefe", "note": "Junto al nombre del jefe en la barra del HUD: uno por afijo.",
         "items": [(stem, name, ic.image()) for stem, name, ic in affixes]},
        {"key": "boss_mechanics", "title": "Mecánicas de jefe de mundo", "note": "Junto al nombre del jefe de mundo: su mecánica propia.",
         "items": [(stem, name, ic.image()) for stem, name, ic in mechanics]},
        {"key": "boss_minis", "title": "Lo que un jefe deja en un héroe (7×7)", "note": "Para las fichas sobre la cabeza del héroe.",
         "items": [(f"hud_s_m_{stem}", label, px(rows, legend)) for stem, label, rows, legend in MINI]},
    ]
