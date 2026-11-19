"""Options and title screen: the signs of the settings (language, the four volumes, the two scales, the save
keys), the parts of their controls (slider knob, switch, a danger key) and the title's own pieces — the name
lettered as a pixel logo and the play sign.

Glyphs follow the stat-glyph recipe (`s80_stats.sprite`: 14×14, outlined, one hue family each).
"""
from __future__ import annotations

from PIL import Image

from ..icons import Icon
from ..rig import Cel, Tone
from .s80_stats import sprite
from .s95_chrome import button

E = ".............."


def lang() -> Icon:  # a speech balloon with a letter in it
    return sprite([
        E,
        ".bbbbbbbbbbbb.",
        ".bwwwwwwwwwwb.",
        ".bwwwwkkwwwwb.",
        ".bwwwkwwkwwwb.",
        ".bwwwkwwkwwwb.",
        ".bwwwkkkkwwwb.",
        ".bwwwkwwkwwwb.",
        ".bwwwkwwkwwwb.",
        ".bwwwwwwwwwwb.",
        ".bbbbwwbbbbbb.",
        "....bwb.......",
        "....bb........",
        E,
    ], {"b": ("bone", 4), "w": ("bone", 7), "k": ("ink", 2)})


def sound(on: bool) -> Icon:  # a horn; waves when it sounds, a red cross when it does not
    waves = ["..w...", "...w..", ".w..w.", "..w.w.", "..w.w.", "..w.w.", ".w..w.", "...w..", "..w..."]
    cross = ["......", "......", ".r...r", "..r.r.", "...r..", "..r.r.", ".r...r", "......", "......"]
    horn = ["......ss", ".....sSs", "....sSSs", ".sssSSSs", ".sSSSSSs", ".sSSSSSs", ".sSSSSSs", ".sssSSSs", "....sSSs", ".....sSs", "......ss"]
    side = waves if on else cross
    rows = [E] + [horn[i] + (side[i - 1] if 1 <= i <= 9 else "......") for i in range(11)] + [E, E]
    return sprite(rows, {"s": ("ink", 5), "S": ("ink", 8), "w": ("brass", 5), "r": ("crimson", 5)})


def music() -> Icon:  # two beamed notes
    return sprite([
        E,
        ".....nnnnnnn..",
        ".....nNNNNNn..",
        ".....nnnnnnn..",
        ".....n.....n..",
        ".....n.....n..",
        ".....n.....n..",
        ".....n.....n..",
        "..nnnn..nnnn..",
        ".nNNNn.nNNNn..",
        ".nNNNn.nNNNn..",
        "..nnn...nnn...",
        E,
        E,
    ], {"n": ("violet", 5), "N": ("violet", 7)})


def ambience() -> Icon:  # wind: three gusts that curl
    return sprite([
        E,
        ".......aaa....",
        "......a...a...",
        "..........a...",
        ".aaaaaaaaa....",
        E,
        ".AAAAAAAAAAA..",
        "............A.",
        ".aaaaaa.....A.",
        ".......a..AA..",
        ".......a......",
        ".....aa.......",
        E,
        E,
    ], {"a": ("sea", 5), "A": ("sea", 7)})


def effects() -> Icon:  # crossed blades: the sounds of the fight
    return sprite([
        E,
        ".a..........a.",
        ".aA........Aa.",
        "..aA......Aa..",
        "...aA....Aa...",
        "....aA..Aa....",
        ".....aAAa.....",
        "......AA......",
        ".....aAAa.....",
        "..g.aA..Aa.g..",
        "...gA....Ag...",
        "..hgg....ggh..",
        ".h..........h.",
        E,
    ], {"a": ("ink", 6), "A": ("ink", 9), "g": ("brass", 5), "h": ("leather", 4)})


def click() -> Icon:  # the pointer: the sounds of the interface
    return sprite([
        E,
        "..w...........",
        "..ww..........",
        "..wWw.........",
        "..wWWw........",
        "..wWWWw.......",
        "..wWWWWw......",
        "..wWWWWWw.....",
        "..wWWWwwww....",
        "..wWwWWw......",
        "..ww.wWWw.....",
        "..w...wWw.....",
        ".......ww.....",
        E,
    ], {"w": ("ink", 7), "W": ("ink", 9)})


def watch() -> Icon:  # an open eye: when the sounds of every blow play (while you look at the game)
    return sprite([
        E,
        E,
        E,
        "....kkkkkk....",
        "..kkWWWWWWkk..",
        ".kWWWiiiiWWWk.",
        "kWWWiIIIIiWWWk",
        "kWWWiIppIiWWWk",
        ".kWWWiiiiWWWk.",
        "..kkWWWWWWkk..",
        "....kkkkkk....",
        E,
        E,
        E,
    ], {"k": ("ink", 6), "W": ("bone", 6), "i": ("sea", 4), "I": ("sea", 6), "p": ("ink", 1)})


def menu_scale() -> Icon:  # a panel with its brass corners: the size of the menus
    return sprite([
        E,
        ".gg........gg.",
        ".gbbbbbbbbbbg.",
        "..bBBBBBBBBb..",
        "..bBllllBBBb..",
        "..bBBBBBBBBb..",
        "..bBllBlllBb..",
        "..bBBBBBBBBb..",
        "..bBlllBBBBb..",
        "..bBBBBBBBBb..",
        ".gbbbbbbbbbbg.",
        ".gg........gg.",
        E,
        E,
    ], {"g": ("brass", 5), "b": ("ink", 5), "B": ("ink", 2), "l": ("ink", 6)})


def game_scale() -> Icon:  # the strip itself, with its tiny fighters: the size of the game
    return sprite([
        E,
        E,
        E,
        ".bbbbbbbbbbbb.",
        ".bssssssssssb.",
        ".bsssssssshsb.",
        ".bsksksssshsb.",
        ".bsksksskshsb.",
        ".bggggggggggb.",
        ".bbbbbbbbbbbb.",
        E,
        E,
        E,
        E,
    ], {"b": ("ink", 5), "s": ("dusk", 6), "k": ("ink", 1), "h": ("crimson", 3), "g": ("moss", 4)})


def tray(up: bool) -> Icon:  # export: an arrow leaving the tray; import: one landing in it
    arrow_up = ["......gg......", ".....gGGg.....", "....gGGGGg....", "...gggGGggg...", ".....gGGg.....", ".....gGGg.....", ".....gggg....."]
    arrow_dn = [".....gggg.....", ".....gGGg.....", ".....gGGg.....", "...gggGGggg...", "....gGGGGg....", ".....gGGg.....", "......gg......"]
    tray_rows = [".b..........b.", ".bB........Bb.", ".bBBBBBBBBBBb.", ".bbbbbbbbbbbb."]
    rows = [E] + (arrow_up if up else arrow_dn) + tray_rows + [E, E]
    hue = "moss" if up else "azure"
    return sprite(rows, {"g": (hue, 4), "G": (hue, 6 if up else 7), "b": ("ink", 5), "B": ("ink", 8)})


def new_game() -> Icon:  # start over: an arrow that comes round
    return sprite([
        E,
        ".....wwww..w..",
        "...wwW..wwww..",
        "..wW.....www..",
        "..w.....wwww..",
        ".wW...........",
        ".wW...........",
        ".wW.........w.",
        "..w........Ww.",
        "..wW......Ww..",
        "...wwW..Www...",
        ".....wwww.....",
        E,
        E,
    ], {"w": ("bone", 7), "W": ("bone", 5)})


def quit_game() -> Icon:  # the power sign
    return sprite([
        E,
        "......pp......",
        "......pp......",
        "...pp.pp.pp...",
        "..pP..pp..Pp..",
        ".pP...pp...Pp.",
        ".pp...pp...pp.",
        ".pp........pp.",
        ".pP........Pp.",
        "..pP......Pp..",
        "...pPppppPp...",
        "....pppppp....",
        E,
        E,
    ], {"p": ("ink", 9), "P": ("ink", 6)})


def back() -> Icon:  # go back: an arrow that turns round to the left
    return sprite([
        E,
        E,
        "....w.........",
        "...ww.........",
        "..wwwwwwwww...",
        ".wwwwwwwwwww..",
        "..wwwwwwwwwww.",
        "...ww.....www.",
        "....w.....www.",
        "..........www.",
        "......wwwwww..",
        "......wwwww...",
        E,
        E,
    ], {"w": ("ink", 9)})


def gear() -> Icon:  # options
    return sprite([
        E,
        ".....cccc.....",
        "..cc.cCCc.cc..",
        "..cCccCCccCc..",
        "...cCCCCCCc...",
        ".cccCC..CCccc.",
        ".cCCC....CCCc.",
        ".cCCC....CCCc.",
        ".cccCC..CCccc.",
        "...cCCCCCCc...",
        "..cCccCCccCc..",
        "..cc.cCCc.cc..",
        ".....cccc.....",
        E,
    ], {"c": ("ink", 5), "C": ("ink", 8)})


def play() -> Icon:  # start / continue: dark, to sit on the gold key
    return sprite([
        E,
        "...pp.........",
        "...pppp.......",
        "...pPPppp.....",
        "...pPPPPppp...",
        "...pPPPPPPpp..",
        "...pPPPPPPPpp.",
        "...pPPPPPPpp..",
        "...pPPPPppp...",
        "...pPPppp.....",
        "...pppp.......",
        "...pp.........",
        E,
        E,
    ], {"p": ("brass", 1), "P": ("brass", 2)})


def _cel(rows: list[str], legend: dict[str, Tone]) -> Image.Image:
    c = Cel(len(rows[0]), len(rows))
    c.stamp(rows, legend, 0, 0)
    return c.image()


def knob() -> Image.Image:  # slider handle, 7×9: steel, so the gold stays for what matters
    return _cel([
        ".kkkkk.",
        "khhhhhk",
        "khBBBsk",
        "khBBBsk",
        "khBwBsk",
        "khBBBsk",
        "khBBBsk",
        "kssssdk",
        ".kkkkk.",
    ], {"k": ("ink", 0), "h": ("ink", 9), "B": ("ink", 7), "w": ("ink", 5), "s": ("ink", 5), "d": ("ink", 4)})


def switch(on: bool) -> Image.Image:
    """22×11: a sliding switch. Lit green with the handle to the right when on; dark with it to the left when off."""
    w, h = 22, 11
    c = Cel(w, h)
    track_hi: Tone = ("moss", 6) if on else ("ink", 3)
    track: Tone = ("moss", 5) if on else ("ink", 2)
    track_lo: Tone = ("moss", 3) if on else ("ink", 1)
    for y in range(h):
        for x in range(w):
            if (x, y) in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
                continue
            edge = x in (0, w - 1) or y in (0, h - 1)
            c.put(x, y, ("ink", 0) if edge else track_hi if y == 1 else track_lo if y == h - 2 else track)
    x0 = w - 11 if on else 1  # the handle: ten wide, inside the outline
    for y in range(1, h - 1):
        for x in range(x0, x0 + 10):
            left, right = x == x0, x == x0 + 9
            c.put(x, y, ("ink", 0) if (left and on) or (right and not on) else ("ink", 9) if y == 1 else ("ink", 5) if y == h - 2 else ("ink", 6) if (x - x0) in (4, 6) and 3 <= y <= h - 4 else ("ink", 8))
    return c.image()


# The game's name, lettered after the pixel blackletter the interface uses for names («Jacquard 12», SIL OFL), on
# its own 125×15 grid: one cell = one stroke pixel. The T is redrawn (a wide bar over one stem): the typeface's own
# reads as a U at this size. `logo` doubles the grid and paints it as struck brass.
LOGO = [
    ".###########..#...................#......................................##.#..........................##....................",
    "#.#########.##...................##........#............................#.##.##.#......................##....................",
    "#....###....#....................##.......##................................##.#.............................................",
    ".....###......................#..##.......##................................##.#.............................................",
    "....####..........###......##.#..##.##.#..##.##......###....##.###........####.#........###.....###....##.....###....##..##..",
    "....##.#.........#..###...####...###.##...###.###...#..###.####.##..........##.#.......#.###...#.####.####...#.####.#########",
    "....##.#........##..##...##...#..##..##...##..##...##..##....##...........####.#......##..##..##..##...##...##..##....##..##.",
    "....##.#........##..##...##.##...####.....##..##...##..##....##.............##.#......####....##..##...##...##..##....##..##.",
    "....##.#........##..##...###.##..##..#....##..##...##..##....##.............##.#......##......##..##...##...##..##....##..##.",
    "....##.#...#....##..##....#..##..##..#....##..##...##..##....##................#...#..##......##..##...##...##..##....##..##.",
    "....#######....########..#####..####.###.######...########..####...........########..#####...#######..####.######....####.###",
    ".....####........##.##..#..##....##...#....##.......##.##....##...........#.###.##....##.......##..##..##....##.......##...#.",
    "...................................................................................................##........................",
    "................................................................................................##.#.........................",
    "...............................................................................................#.##..........................",
]


def logo() -> Image.Image:
    """The name at twice its grid (250×30 of lettering): brass that runs from pale at the top to deep at the foot,
    each stroke lit along its top edge and shaded along its foot, a dark outline, a hard shadow, and a
    rule with a lozenge under it."""
    s, pad = 2, 3
    gw, gh = len(LOGO[0]), len(LOGO)
    w, h = gw * s + pad * 2 + 2, gh * s + pad * 2 + 11
    c = Cel(w, h)

    def on(gx: int, gy: int) -> bool:
        return 0 <= gx < gw and 0 <= gy < gh and LOGO[gy][gx] == "#"

    for gy in range(gh):
        for gx in range(gw):
            if not on(gx, gy):
                continue
            for dy in range(s):
                for dx in range(s):
                    y = gy * s + dy
                    base = 6 if y < 9 else 5 if y < 17 else 4 if y < 23 else 3
                    if dy == 0 and not on(gx, gy - 1):
                        base += 1  # the top edge of a stroke catches the light
                    if dy == s - 1 and not on(gx, gy + 1):
                        base -= 1  # and its foot falls in shade
                    c.put(pad + gx * s + dx, pad + y, ("brass", max(2, min(7, base))))
    y0 = pad + gh * s + 4  # the rule: a line that thins towards its ends, a lozenge in the middle
    mid = w // 2
    for x in range(24, w - 24):
        far = abs(x - mid)
        if far > 5:
            c.put(x, y0, ("brass", 5 if far < 60 else 4 if far < 90 else 3))
    for dy, half in ((-2, 0), (-1, 1), (0, 2), (1, 1), (2, 0)):
        for dx in range(-half, half + 1):
            c.put(mid + dx, y0 + dy, ("brass", 7 if dy < 0 and dx <= 0 else 5 if dy <= 0 else 4))
    c.outline()
    body = dict(c.px)
    for (x, y), _t in body.items():  # a hard shadow, down and to the right
        for off in ((1, 1), (1, 2), (0, 2)):
            p = (x + off[0], y + off[1])
            if p not in c.px:
                c.put(p[0], p[1], ("ink", 0))
    return c.image()


def build() -> list[dict]:
    glyphs = [
        ("opt_lang", "Idioma", lang()), ("opt_sound", "Sonido", sound(True)), ("opt_mute", "Silencio", sound(False)),
        ("opt_music", "Música", music()), ("opt_ambience", "Ambiente", ambience()), ("opt_effects", "Efectos", effects()), ("opt_click", "Interfaz", click()), ("opt_watch", "Sonidos de combate", watch()),
        ("opt_menu_scale", "Tamaño de los menús", menu_scale()), ("opt_game_scale", "Tamaño del juego", game_scale()),
        ("opt_export", "Exportar partida", tray(True)), ("opt_import", "Importar partida", tray(False)), ("opt_new", "Partida nueva", new_game()),
        ("opt_quit", "Salir", quit_game()), ("opt_back", "Volver", back()), ("opt_gear", "Opciones", gear()), ("title_play", "Jugar", play()),
    ]
    return [
        {
            "key": "options",
            "title": "Opciones · signos y controles",
            "note": "Un signo por ajuste (idioma, los cuatro volúmenes, los dos tamaños, las teclas de la partida) y las piezas de sus controles: tirador, interruptor y tecla de peligro.",
            "items": [(key, name, ic.image()) for key, name, ic in glyphs] + [
                ("opt_knob", "Tirador", knob()), ("opt_switch_on", "Interruptor encendido", switch(True)), ("opt_switch_off", "Interruptor apagado", switch(False)),
                ("opt_btn_danger", "Tecla de peligro", button("crimson", 5, 4, 3, 1)),
            ],
        },
        {
            "key": "title",
            "title": "Pantalla de título",
            "note": "El nombre del juego como logotipo de píxel (latón batido, sobre la gótica de los nombres). La escena es la del juego: el grupo contra el jefe de cada mundo (src/ui/title/TitleReel).",
            "items": [("title_logo", "Logotipo", logo())],
        },
    ]
