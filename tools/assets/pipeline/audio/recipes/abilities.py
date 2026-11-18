"""Hero abilities (the cast moment, one per ability key) and the three ultimates.

Heard every few seconds in a fight, so they stay short (≈0.2–0.6 s) and soft; each class has its own colour: the
Knight is wood, plate and low horn, the Priest glass and warm chords, the Ranger strings and air. Ultimates are a bit
richer and ring up to about a second.
"""
from __future__ import annotations

import numpy as np

from ..kit import GLASS, GONG, PLATE, TINE, band, fm_bell, note, partials, pluck, smooth_env
from ..synth import length, mix, time_axis
from .common import RATE, Recipe, Rng, arp, blip, dark, horn, jit, knock, pad, puff, thump, tone, verb, whoosh, zap


def _twang(rng: Rng, f: float, dur: float = 0.24, decay: float = 0.22, bright: float = 0.3) -> np.ndarray:
    """The Ranger's bowstring, darkened, with a rounded start."""
    x = dark(pluck(dur, RATE, f, rng, decay=decay, bright=bright), 2000)
    return x * smooth_env(len(x), RATE, 0.005, 0.02)


# ── Knight ──


def ab_knight_guard(rng: Rng) -> np.ndarray:  # Stone Skin: a soft stony grind settling into a low knock
    n = length(0.26, RATE)
    grit = band(rng.standard_normal(n), RATE, 150, 900, order=2)
    grit *= 0.55 + 0.45 * np.abs(np.sin(2 * np.pi * 34.0 * time_axis(n, RATE) + rng.uniform(0, 3)))
    grit = dark(grit, 1100) * smooth_env(n, RATE, 0.04, 0.12)
    grit /= np.max(np.abs(grit)) + 1e-12
    stone = knock(140, 0.16)
    return mix(0.32, RATE, (0.0, grit, -6.0), (0.16, stone, 0.0))


def ab_knight_debilitate(rng: Rng) -> np.ndarray:  # Debilitating Cleave: a wide sweep and a dull blow
    sweep = whoosh(rng, 0.22, 1300, 420, top=2200, width=1.5, attack=0.04, release=0.12)
    blow = thump(170, 85, 0.12)
    sap = blip(0.2, 300, 190, 0.16, attack=0.01)
    return mix(0.36, RATE, (0.0, sweep, -2.0), (0.12, blow, 0.0), (0.14, sap, -10.0))


def ab_knight_bulwark(rng: Rng) -> np.ndarray:  # Bulwark: the shield braced, and a low shimmer of its ward
    plate = tone(0.3, 220, PLATE, 0.22, attack=0.003)
    body = thump(180, 100, 0.1)
    ward = pad(0.45, [note(57), note(64)], attack=0.06, release=0.3, harm=0.1)
    return mix(0.5, RATE, (0.0, body, -2.0), (0.0, plate, -6.0), (0.04, ward, -10.0))


def ab_knight_battlecry(rng: Rng) -> np.ndarray:  # Battle Cry: no voice, a short horn-like swell
    j = jit(rng, 0.02)
    low = horn(0.55, note(50) * j, attack=0.12, release=0.25, top=1200)
    fifth = horn(0.45, note(57) * j, attack=0.1, release=0.22, top=1200)
    return mix(0.62, RATE, (0.0, low, 0.0), (0.08, fifth, -5.0))


def ab_knight_bloodlust(rng: Rng) -> np.ndarray:  # Bloodlust: a quick double heartbeat and a rising rush
    beat = thump(95, 55, 0.08)
    rush = whoosh(rng, 0.3, 300, 900, top=1300, width=1.5, attack=0.15, release=0.1)
    return mix(0.4, RATE, (0.0, beat, 0.0), (0.13, beat, -2.0), (0.06, rush, -10.0))


def ab_knight_holdtheline(rng: Rng) -> np.ndarray:  # Hold the Line: the shield planted, and a warm low chord
    plant = thump(120, 50, 0.2)
    plate = tone(0.3, 180, PLATE, 0.25, attack=0.003)
    chord = pad(0.5, [note(45), note(52), note(57)], attack=0.08, release=0.3, harm=0.2)
    return mix(0.6, RATE, (0.0, plant, 0.0), (0.0, plate, -8.0), (0.05, chord, -8.0))


def ab_knight_riposte(rng: Rng) -> np.ndarray:  # Riposte: a parry clink and a quick strike back
    j = jit(rng, 0.04)
    clink = fm_bell(0.14, RATE, 1100 * j, ratio=1.41, index=0.4, decay=0.11, attack=0.003)
    swing = whoosh(rng, 0.12, 1600 * j, 600 * j, top=2500, width=1.35, attack=0.02, release=0.07)
    blow = thump(200, 110, 0.07)
    return mix(0.26, RATE, (0.0, clink, -9.0), (0.05, swing, -2.0), (0.14, blow, -1.0))


def ab_knight_riposte_charge(rng: Rng) -> np.ndarray:  # a blocked hit banks a charge: a tiny rising tick
    return mix(0.1, RATE, (0.0, tone(0.09, note(76), TINE, 0.06, attack=0.006), 0.0))


# ── Priest ──


def ab_priest_mend(rng: Rng) -> np.ndarray:  # ★ Mend: two soft glass notes, a fifth apart
    j = jit(rng, 0.02)
    a = partials(0.5, RATE, note(76) * j, [(r, lv, d * 0.45) for r, lv, d in GLASS], attack=0.006)
    b = partials(0.6, RATE, note(83) * j, [(r, lv, d * 0.5) for r, lv, d in GLASS], attack=0.006)
    dry = mix(0.75, RATE, (0.0, a, -2.0), (0.09, b, 0.0))
    return verb(dry, rng, seconds=0.6, wet=0.18, tail=0.25)


def ab_priest_healing_light(rng: Rng) -> np.ndarray:  # Healing Light: three quick glass notes rising
    dry = mix(0.4, RATE, *arp([(0.0, note(76)), (0.045, note(79)), (0.09, note(84))], 0.3, GLASS, 0.2, step_db=0.5))
    return verb(dry, rng, seconds=0.5, wet=0.18, tail=0.15)


def ab_priest_holyshield(rng: Rng) -> np.ndarray:  # Holy Shield: a soft bubble closing, with a shimmer
    bubble = blip(0.22, 300, 620, 0.2, attack=0.02)
    n = length(0.4, RATE)
    shimmer = tone(0.4, note(79), GLASS, 0.25, attack=0.01) * (0.8 + 0.2 * np.sin(2 * np.pi * 9.0 * time_axis(n, RATE)))
    return verb(mix(0.42, RATE, (0.0, bubble, -2.0), (0.06, shimmer, -6.0)), rng, seconds=0.4, wet=0.15, tail=0.1)


def ab_priest_nova(rng: Rng) -> np.ndarray:  # Holy Nova: a soft bloom of light outwards
    bloom = puff(rng, 0.32, 300, 1800, 2000, attack=0.03, release=0.24)
    chord = mix(0.4, RATE, *arp([(0.0, note(72)), (0.0, note(76)), (0.0, note(79))], 0.4, GLASS, 0.22, step_db=-1.0, attack=0.01))
    low = thump(150, 90, 0.1)
    return mix(0.45, RATE, (0.0, bloom, -6.0), (0.01, chord, -4.0), (0.0, low, -8.0))


def ab_priest_circle(rng: Rng) -> np.ndarray:  # Circle of Healing: a ring of notes around the party
    ring = [(0.0, note(72)), (0.04, note(76)), (0.08, note(79)), (0.12, note(84)), (0.16, note(79))]
    dry = mix(0.45, RATE, *arp(ring, 0.28, GLASS, 0.18, step_db=-0.8))
    return verb(dry, rng, seconds=0.5, wet=0.2, tail=0.15)


def ab_priest_sanctuary(rng: Rng) -> np.ndarray:  # Sanctuary: a warm swell that stays a moment, a glass note on top
    warm = pad(0.7, [note(60), note(64), note(67)], attack=0.15, release=0.4, harm=0.2)
    ting = tone(0.5, note(79), GLASS, 0.3, attack=0.008)
    return verb(mix(0.75, RATE, (0.0, warm, 0.0), (0.12, ting, -8.0)), rng, seconds=0.6, wet=0.2, tail=0.15)


def ab_priest_smite(rng: Rng) -> np.ndarray:  # Smite: a bright tink and a soft strike of light coming down
    tink = tone(0.3, note(84), GLASS, 0.18, attack=0.004)
    bolt = dark(zap(0.14, 900, 300, rate=40.0, depth=0.05, attack=0.008), 2400)
    blow = thump(170, 100, 0.07)
    return mix(0.34, RATE, (0.0, tink, -6.0), (0.04, bolt, -3.0), (0.14, blow, -4.0))


# ── Ranger ──


def ab_ranger_fast_fire(rng: Rng) -> np.ndarray:  # Rapid Fire: three quick plucks rising, a breath of speed
    plucks = [(0.07 * i, _twang(rng, f, 0.16, 0.12), -1.0 * i) for i, f in enumerate((180, 202, 227))]
    rush = whoosh(rng, 0.26, 700, 1500, top=2200, width=1.4, attack=0.1, release=0.1)
    return mix(0.36, RATE, *plucks, (0.04, rush, -12.0))


def ab_ranger_aimedshot(rng: Rng) -> np.ndarray:  # Aimed Shot: a deeper twang and a long breath of arrow
    twang = _twang(rng, 110, 0.32, 0.3, bright=0.35)
    air = whoosh(rng, 0.24, 2000, 700, top=2600, width=1.3, attack=0.03, release=0.14)
    return mix(0.36, RATE, (0.0, twang, 0.0), (0.02, air, -7.0))


def ab_ranger_multishot(rng: Rng) -> np.ndarray:  # Raining Arrows: a volley of soft whooshes
    twang = _twang(rng, 140, 0.22, 0.2)
    volley = [(0.02 + 0.035 * i + rng.uniform(0, 0.012), whoosh(rng, 0.12, 1900 - 150 * i, 800, top=2600, attack=0.015, release=0.07), -8.0 - i) for i in range(4)]
    return mix(0.36, RATE, (0.0, twang, 0.0), *volley)


def ab_ranger_focus(rng: Rng) -> np.ndarray:  # Explosive Arrow: a soft pop, then a soft boom
    twang = _twang(rng, 150, 0.18, 0.16)
    pop = blip(0.1, 520, 220, 0.07)
    boom = thump(95, 40, 0.25)
    dust = puff(rng, 0.3, 80, 700, 900, attack=0.006, release=0.24)
    return mix(0.5, RATE, (0.0, twang, -3.0), (0.12, pop, -5.0), (0.13, boom, 0.0), (0.13, dust, -9.0))


def ab_ranger_frozentrap(rng: Rng) -> np.ndarray:  # Caltrops: a toss, and a scatter of tiny soft metal tinks
    toss = whoosh(rng, 0.12, 900, 1600, top=2200, attack=0.03, release=0.06)
    tinks = [(0.08 + float(rng.uniform(0, 0.22)), dark(tone(0.08, float(rng.uniform(700, 1150)), PLATE, 0.05, attack=0.004), 3000), float(rng.uniform(-8, -3))) for _ in range(6)]
    return mix(0.4, RATE, (0.0, toss, -8.0), *tinks)


def ab_ranger_weakspot(rng: Rng) -> np.ndarray:  # Weak Spot: the shot, and a tiny "ding" as the mark lands
    twang = _twang(rng, 160, 0.22, 0.2)
    air = whoosh(rng, 0.12, 1800, 800, top=2600, attack=0.02, release=0.07)
    ding = tone(0.3, note(81), GLASS, 0.2, attack=0.004)
    return mix(0.4, RATE, (0.0, twang, 0.0), (0.02, air, -9.0), (0.1, ding, -9.0))


def ab_ranger_tarflask(rng: Rng) -> np.ndarray:  # Tar Flask: a glass clink, then a gloopy splash
    clink = tone(0.1, note(79), GLASS, 0.05, attack=0.003)
    gloop = mix(0.3, RATE, (0.0, blip(0.12, 380, 150, 0.09, attack=0.006), 0.0), (0.07, blip(0.12, 300, 120, 0.09, attack=0.006), -3.0), (0.14, blip(0.1, 260, 110, 0.08, attack=0.006), -6.0))
    splash = puff(rng, 0.22, 150, 900, 1100, attack=0.006, release=0.16)
    return mix(0.46, RATE, (0.0, clink, -8.0), (0.1, gloop, -1.0), (0.1, splash, -6.0))


# ── Ultimates (a bit richer, still short) ──


def ult_knight_laststand(rng: Rng) -> np.ndarray:  # Last Stand: a deep soft gong bloom and a rising ward
    gong = dark(partials(1.0, RATE, note(43), [(r, lv, d * 0.7) for r, lv, d in GONG], attack=0.006), 1600)
    body = thump(110, 45, 0.25)
    rise = pad(0.7, [note(55), note(62), note(67)], attack=0.35, release=0.3, harm=0.15)
    return verb(mix(1.0, RATE, (0.0, body, -2.0), (0.0, gong, -4.0), (0.15, rise, -8.0)), rng, seconds=0.7, wet=0.18, tail=0.2)


def ult_priest_enrage(rng: Rng) -> np.ndarray:  # Battle Enrage: a chord that swells with a quickening pulse, a glass peak
    swell = pad(0.8, [note(57), note(64), note(69)], attack=0.4, release=0.3, harm=0.2, trem=7.5)
    peak = mix(0.5, RATE, *arp([(0.0, note(76)), (0.05, note(81))], 0.45, GLASS, 0.3, step_db=1.0))
    return verb(mix(1.0, RATE, (0.0, swell, 0.0), (0.42, peak, -6.0)), rng, seconds=0.6, wet=0.2, tail=0.2)


def ult_ranger_mark(rng: Rng) -> np.ndarray:  # Mark of the Hunter: a low hunting horn note and a bell-like ping
    call = horn(0.6, note(45), attack=0.08, release=0.3, top=1100)
    ping = tone(0.6, note(81), GLASS, 0.4, attack=0.004)
    return verb(mix(0.9, RATE, (0.0, call, 0.0), (0.2, ping, -8.0)), rng, seconds=0.6, wet=0.18, tail=0.2)


RECIPES: dict[str, Recipe] = {
    "ab_knight_guard": ab_knight_guard,
    "ab_knight_debilitate": ab_knight_debilitate,
    "ab_knight_bulwark": ab_knight_bulwark,
    "ab_knight_battlecry": ab_knight_battlecry,
    "ab_knight_bloodlust": ab_knight_bloodlust,
    "ab_knight_holdtheline": ab_knight_holdtheline,
    "ab_knight_riposte": ab_knight_riposte,
    "ab_knight_riposte_charge": ab_knight_riposte_charge,
    "ab_priest_mend": ab_priest_mend,
    "ab_priest_healing_light": ab_priest_healing_light,
    "ab_priest_holyshield": ab_priest_holyshield,
    "ab_priest_nova": ab_priest_nova,
    "ab_priest_circle": ab_priest_circle,
    "ab_priest_sanctuary": ab_priest_sanctuary,
    "ab_priest_smite": ab_priest_smite,
    "ab_ranger_fast_fire": ab_ranger_fast_fire,
    "ab_ranger_aimedshot": ab_ranger_aimedshot,
    "ab_ranger_multishot": ab_ranger_multishot,
    "ab_ranger_focus": ab_ranger_focus,
    "ab_ranger_frozentrap": ab_ranger_frozentrap,
    "ab_ranger_weakspot": ab_ranger_weakspot,
    "ab_ranger_tarflask": ab_ranger_tarflask,
    "ult_knight_laststand": ult_knight_laststand,
    "ult_priest_enrage": ult_priest_enrage,
    "ult_ranger_mark": ult_ranger_mark,
}
