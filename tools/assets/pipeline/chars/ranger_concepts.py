"""CONCEPTS for a re-imagined Ranger (lab only; 2026-11-19, user: «los enemigos y bosses tienen modelos mejor
trabajados que los 3 personajes principales… reimaginarlos»). Each concept is the Ranger's own rig and all its
animations (chars/ranger.py) dressed anew: taller proportions, a palette with one strong accent, larger props and
hand-placed light — the treatment the creatures got. Nothing here ships until one is chosen.

    sh tools/assets/run.sh hero-concepts     # docs/redesign/lab/img/heroes/*
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

from ..rig import GROUND, Build, Cel, Chain, ChainSpec, Pt
from . import ranger as base

Tone = tuple[str, int]


@dataclass
class Look:
    key: str
    name: str
    build: Build
    legend: dict[str, Tone]
    head: list[str]
    torso: list[str]
    skirt: list[str]
    quiver: list[str]
    #: Cloak (behind): widths along the chain, ramp and its three tones; None = no cloak.
    cloak: tuple[list[float], str, tuple[int, int, int]] | None
    #: Second chain (scarf, braid, feather…): widths start/step, ramp, tones.
    tail: tuple[float, str, tuple[int, int, int]] | None
    leg_cloth: tuple[str, tuple[int, int, int]]
    boot: tuple[str, tuple[int, int, int]]
    sleeve: tuple[str, tuple[int, int, int]]
    bracer: tuple[str, tuple[int, int, int]]
    skin: str = "skin"
    #: Bow: half-length (grip to tip), limb ramp and tones, tip tone, string tone, grip tone.
    bow_half: float = 8.6
    bow_ramp: str = "leather"
    bow_tones: tuple[int, int, int] = (3, 5, 6)
    bow_tip: Tone | None = None
    string: Tone = ("bone", 5)
    grip: Tone = ("leather", 2)
    head_pc: float = 5.0
    torso_pc: float = 4.0
    extra: dict = field(default_factory=dict)


def draw_bow(cel: Cel, look: Look, grip: Pt, theta: float, draw: float, nock_hand: Pt, arrow: bool) -> None:
    """The concept's bow: like the Ranger's recurve, at its own length and in its own materials."""
    a = math.radians(theta)
    u = (math.cos(a), math.sin(a))
    f = (math.sin(a), -math.cos(a))
    half = look.bow_half
    tips = []
    for sgn in (-1, 1):
        mid = (grip[0] + u[0] * sgn * half * 0.54 + f[0] * 1.4, grip[1] + u[1] * sgn * half * 0.54 + f[1] * 1.4)
        back = 2.4 + 2.8 * max(0.0, draw)
        tip = (grip[0] + u[0] * sgn * half - f[0] * back, grip[1] + u[1] * sgn * half - f[1] * back)
        cel.limb((grip[0] + u[0] * sgn * 1.2, grip[1] + u[1] * sgn * 1.2), mid, 2.3, 2.0, look.bow_ramp, look.bow_tones)
        cel.limb(mid, tip, 2.0, 1.3, look.bow_ramp, look.bow_tones)
        if look.bow_tip is not None:
            cel.put(tip[0], tip[1], look.bow_tip)
            cel.put(tip[0] - u[0] * sgn, tip[1] - u[1] * sgn, look.bow_tip)
        tips.append(tip)
    if draw > 0.1:
        nock = (nock_hand[0] + 0.5, nock_hand[1])
    else:
        nock = (grip[0] - f[0] * (2.4 + draw * 9.0), grip[1] - f[1] * (2.4 + draw * 9.0))
    for tip in tips:
        cel.line(tip, nock, look.string)
    if arrow:
        dx, dy = grip[0] - nock[0], grip[1] - nock[1]
        d = math.hypot(dx, dy) or 1.0
        dx, dy = dx / d, dy / d
        end = (nock[0] + dx * 16.0, nock[1] + dy * 16.0)
        cel.line(nock, end, ("leather", 6))
        cel.put(end[0], end[1], ("ink", 9))
        cel.put(end[0] - dx, end[1] - dy, ("ink", 7))
        for s, t in ((0.5, 5), (1.5, 4), (2.5, 5)):
            cel.put(nock[0] + dx * s, nock[1] + dy * s - 1, ("crimson", t))
            cel.put(nock[0] + dx * s, nock[1] + dy * s + 1, ("crimson", t - 1))
    for k in (-1, 0, 1):
        cel.put(grip[0] + u[0] * k, grip[1] + u[1] * k, look.grip)


class ConceptRanger(base.Ranger):
    look: Look

    def __init__(self, look: Look):
        self.look = look
        self.build = look.build
        self.head = look.head

    def chains(self) -> dict[str, ChainSpec]:
        specs = super().chains()
        if self.look.cloak is None:
            specs.pop("cloak", None)
        if self.look.tail is None:
            specs.pop("scarf", None)
        return specs

    def leg(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        hip, knee, ankle, toe = J["hip" + s], J["knee" + s], J["ankle" + s], J["toe" + s]
        ramp, tones = self.look.leg_cloth
        cel.limb(hip, knee, 4.6, 3.9, ramp, tones, far=far)
        cel.limb(knee, ankle, 3.8, 3.1, ramp, tones, far=far)
        bramp, btones = self.look.boot
        top = (knee[0] + (ankle[0] - knee[0]) * 0.25, knee[1] + (ankle[1] - knee[1]) * 0.25)
        cel.limb(top, ankle, 4.4, 3.6, bramp, btones, far=far)
        cel.limb(ankle, toe, 3.2, 2.2, bramp, btones, far=far)
        cuff = self.look.extra.get("cuff")
        if cuff is not None:
            for d in (-1.5, -0.5, 0.5, 1.5):
                cel.put(top[0] + d, top[1], cuff if not far else (cuff[0], max(0, cuff[1] - 1)))

    def arm(self, cel: Cel, J: dict[str, Pt], s: str, far: bool) -> None:
        sh, el, hd = J["sh" + s], J["elbow" + s], J["hand" + s]
        r1, t1 = self.look.sleeve
        r2, t2 = self.look.bracer
        cel.limb(sh, el, 3.8, 3.2, r1, t1, far=far)
        cel.limb(el, hd, 3.3, 2.8, r2, t2, far=far)
        for dx, dy, i in ((0, 0, 5), (0, -1, 6), (-1, 0, 4)):
            cel.put(hd[0] + dx, hd[1] + dy, (self.look.skin, i - (1 if far else 0)))

    def draw(self, cel, J, pose, ropes, between) -> None:
        look = self.look
        lean = pose.get("lean", 0.0)
        if look.cloak is not None and "cloak" in ropes:
            widths, ramp, tones = look.cloak
            cloak = ropes["cloak"]
            for i in range(len(cloak) - 1):
                cel.limb(cloak[i], cloak[i + 1], widths[i], widths[min(i + 1, len(widths) - 1)], ramp, tones)
        cx, cy = J["chest"]
        cel.stamp_frame(look.quiver, look.legend, (cx, cy), look.extra.get("quiver_at", (-7, -5)), lean)
        if look.tail is not None and "scarf" in ropes:
            w0, ramp, tones = look.tail
            tail = ropes["scarf"]
            for i in range(len(tail) - 1):
                cel.limb(tail[i], tail[i + 1], max(1.0, w0 - i * 0.25), max(1.0, w0 - 0.2 - i * 0.3), ramp, tones)
        self.arm(cel, J, "F", far=True)
        self.leg(cel, J, "F", far=True)
        self.leg(cel, J, "N", far=False)
        px, py = J["pelvis"]
        cel.stamp(look.skirt, look.legend, px - len(look.skirt[0]) // 2, py)
        cel.stamp_lean(look.torso, look.legend, (px, py), look.torso_pc, lean)
        hx, hy = J["head"]
        cel.stamp_turn(self.head, look.legend, (hx, hy + 1), look.head_pc, pose.get("head_rot", 0.0) + (lean if abs(lean) > 24 else 0.0))
        w = pose.get("bow_free", 0.0)
        gx, gy = J["handF"]
        if w > 0.001:
            bx, by = pose["bow_at"]
            gx, gy = gx + (self.build.root_x + bx - gx) * w, gy + (GROUND - by - gy) * w
        draw_bow(cel, look, (gx, gy), pose["bow"], pose.get("draw", 0.0), J["handN"], pose.get("arrow", 0.0) > 0.5)
        self.arm(cel, J, "N", far=False)
        hx_, hy_ = J["handN"]
        if pose.get("fistful", 0.0) > 0.5:
            for n, ox in enumerate((-0.42, -0.12, 0.2)):
                for i in range(1, 13):
                    cel.put(hx_ + ox * i + n - 1, hy_ - i, ("bone", 6) if i < 10 else ("crimson", 4 + (n % 2)))
        cel.outline()


TALL = Build(root_x=40, thigh=7.4, shin=7.4, foot=4.4, hip_dx=1.1, spine=10.6, sh_near=3.0, sh_far=2.6, upper=6.4, fore=6.2, neck=1.0,
             head_dx=0.7, leg_scale=0.95)

# ── A · Montaraz: the forest warden. A deep moss hood and a mantle over the shoulders, a long cloak, a longbow as
# tall as he is, a quiver bristling with crimson fletchings; brass clasps, a crimson scarf. ──
LA = {
    "a": ("moss", 1), "b": ("moss", 2), "c": ("moss", 3), "d": ("moss", 4), "e": ("moss", 5), "f": ("moss", 6), "g": ("moss", 7),
    "l": ("leather", 1), "m": ("leather", 2), "n": ("leather", 3), "o": ("leather", 4), "p": ("leather", 5), "q": ("leather", 6),
    "s": ("skin", 2), "t": ("skin", 4), "u": ("skin", 5), "v": ("skin", 6),
    "x": ("brass", 3), "y": ("brass", 5), "z": ("brass", 7),
    "E": ("ink", 0), "W": ("bone", 7), "r": ("crimson", 3), "R": ("crimson", 5), "S": ("crimson", 6),
}
A = Look(
    key="ranger_a", name="A · Montaraz", build=TALL, legend=LA,
    head=[
        ".....bcdd....",
        "....bccddee..",
        "...bbccddeef.",
        "..abccdddeefg",
        "..abcdlmtuuff",
        ".abbcdmtuuvvf",
        ".abccdmtuEvvf",
        ".abccdmttuuv.",
        "..abccmttuu..",
        "..abbcRRSSRr.",
        "...abbrRSSr..",
        ".....bbrr....",
    ],
    head_pc=6.0,
    torso=[
        "...bcddee...",
        ".abccddeeff.",
        "abbccdyddeeg",
        ".abbccddeef.",
        "..anoopqpp..",
        "..mnooppqp..",
        "..mnoxzopp..",
        "..mnnooppq..",
        "..mnnoopp...",
        "..lmxyzyml..",
    ],
    torso_pc=5.0,
    skirt=[
        "lmnnooppq",
        "lmnno.opq",
        ".lmn...pq",
        "..m.....p",
    ],
    quiver=[
        ".RS.R.",
        "RSrRSr",
        ".rR.r.",
        "..mn..",
        ".xyz..",
        ".mno..",
        ".mnop.",
        ".mnop.",
        "..mno.",
        "..xyz.",
        "...mn.",
    ],
    cloak=([2.0, 3.8, 5.4, 6.6, 7.2, 6.4], "moss", (1, 2, 4)),
    tail=(2.6, "crimson", (2, 4, 5)),
    leg_cloth=("leather", (1, 2, 4)),
    boot=("leather", (2, 4, 5)),
    sleeve=("moss", (2, 4, 6)),
    bracer=("leather", (2, 4, 6)),
    bow_half=12.5, bow_ramp="leather", bow_tones=(3, 5, 7), bow_tip=("brass", 6), string=("bone", 6), grip=("crimson", 4),
    extra={"cuff": ("moss", 5), "quiver_at": (-8, -7), "blurb": "El montaraz del bosque: la idea del Ranger actual, llevada más lejos. Capucha y esclavina de musgo con luz en el borde, capa larga, un arco largo casi de su altura, carcaj con plumas carmesí, broches de latón y bufanda carmesí."},
)


# ── B · Cazadora de la estepa: no hood — auburn hair in a long braid that swings behind her, a feather in the
# headband, a fur collar over a crimson vest, a short horn bow with brass caps. ──
LB = {
    "l": ("leather", 1), "m": ("leather", 2), "n": ("leather", 3), "o": ("leather", 4), "p": ("leather", 5), "q": ("leather", 6),
    "t": ("skin", 4), "u": ("skin", 5), "v": ("skin", 6),
    "W": ("bone", 7), "w": ("bone", 5), "V": ("bone", 3),
    "r": ("crimson", 2), "R": ("crimson", 4), "S": ("crimson", 5), "T": ("crimson", 6),
    "x": ("brass", 3), "y": ("brass", 5), "z": ("brass", 7), "E": ("ink", 0),
}
B = Look(
    key="ranger_b", name="B · Cazadora de la estepa", build=TALL, legend=LB,
    head=[
        "..T..........",
        ".TS..nooo....",
        ".S..noppqq...",
        "...mnopqqqo..",
        "..mnoWWWWWW..",
        "..mnotuuvvv..",
        ".mnootuuEvv..",
        ".mnootuuuvu..",
        "..mnootuuu...",
        "...mnnottu...",
        "....mn.tt....",
    ],
    head_pc=6.0,
    torso=[
        "..VwWwWwV...",
        ".VwWwWWwWw..",
        "VwWrRRSTwWw.",
        ".wrRRSSTRo..",
        "..rRSSTTRr..",
        "..rRxzyRRr..",
        "..rRSSTTRr..",
        "..lrRSSRRl..",
        "..lmxyzyml..",
    ],
    torso_pc=5.0,
    skirt=[
        "lmnnooppq",
        "lmRnoSopq",
        ".lmR.Spq.",
        "..m...p..",
    ],
    quiver=[
        "TS.RT.",
        "SRTSR.",
        ".RS.R.",
        "..mn..",
        ".wWw..",
        ".mno..",
        ".mnop.",
        ".mnop.",
        "..wWw.",
        "...mn.",
    ],
    cloak=None,
    tail=(2.4, "leather", (2, 4, 5)),
    leg_cloth=("leather", (2, 3, 4)),
    boot=("leather", (1, 3, 4)),
    sleeve=("crimson", (2, 4, 5)),
    bracer=("bone", (3, 5, 6)),
    bow_half=10.0, bow_ramp="bone", bow_tones=(3, 5, 7), bow_tip=("brass", 6), string=("bone", 7), grip=("crimson", 4),
    extra={"cuff": ("bone", 6), "quiver_at": (-8, -7), "blurb": "La cazadora de la estepa: sin capucha, pelo cobrizo en una trenza que se balancea, pluma en la cinta, cuello de piel sobre un chaleco carmesí, arco corto de cuerno con remates de latón. La más ligera y la más distinta de la actual."},
)

# ── C · Guardabosques de la Legión: the party's own ranger — a feathered cap, an azure tabard with the Knight's
# brass cross over leather, a half-cloak in the legion's azure, a long yew bow with an azure grip. ──
LC = {
    "a": ("azure", 1), "b": ("azure", 2), "c": ("azure", 3), "d": ("azure", 4), "e": ("azure", 5), "f": ("azure", 6),
    "l": ("leather", 1), "m": ("leather", 2), "n": ("leather", 3), "o": ("leather", 4), "p": ("leather", 5), "q": ("leather", 6),
    "t": ("skin", 4), "u": ("skin", 5), "v": ("skin", 6),
    "x": ("brass", 3), "y": ("brass", 5), "z": ("brass", 7),
    "R": ("crimson", 4), "S": ("crimson", 5), "T": ("crimson", 6), "E": ("ink", 0),
}
C = Look(
    key="ranger_c", name="C · Guardabosques de la Legión", build=TALL, legend=LC,
    head=[
        "TS...........",
        ".TSR..........",
        "..RS.cdde.....",
        "...Sccddeef...",
        "..bcccddeeee..",
        ".abbbcddddeef.",
        "...nntuuvv....",
        "...nttuEvv....",
        "...nntuuuvv...",
        "....nttuuu....",
        ".....ttu......",
    ],
    head_pc=6.0,
    torso=[
        "...noopp....",
        "..bcdyde....",
        ".abccydde...",
        ".abyyyyyde..",
        ".abccydde...",
        "..abcydde...",
        "..abcydde...",
        "..lmxyzml...",
        "..mnoopqp...",
    ],
    torso_pc=5.0,
    skirt=[
        "abccddeef",
        "abccd.eef",
        ".abc...ef",
        "..b.....f",
    ],
    quiver=[
        ".TS.T.",
        "TSRTSR",
        ".RS.R.",
        "..mn..",
        ".xyz..",
        ".mno..",
        ".mnop.",
        ".mnop.",
        "..mno.",
        "..xyz.",
        "...mn.",
    ],
    cloak=([2.0, 3.6, 5.0, 6.0, 6.2, 5.2], "azure", (1, 2, 4)),
    tail=None,
    leg_cloth=("leather", (1, 2, 4)),
    boot=("leather", (2, 4, 5)),
    sleeve=("leather", (3, 4, 6)),
    bracer=("azure", (2, 4, 6)),
    bow_half=12.5, bow_ramp="leather", bow_tones=(4, 5, 7), bow_tip=("brass", 6), string=("bone", 6), grip=("azure", 5),
    extra={"cuff": ("azure", 5), "quiver_at": (-8, -7), "blurb": "El guardabosques de la Legión: gorra con pluma, tabardo azul con la cruz de latón del Knight, media capa azul, arco largo de tejo con empuñadura azul. El grupo se lee como un mismo ejército."},
)

CONCEPTS = [A, B, C]
