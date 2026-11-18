"""Interface and Cube: the quietest, shortest sounds (under ~0.2 s), heard while managing the party.

`ui_click` is not here: it is the approved ElevenLabs take (catalog `source="eleven"`). The Cube's results may ring
a little longer: they are small rewards.
"""
from __future__ import annotations

import numpy as np

from ..kit import GLASS, TINE, band, note, partials, smooth_env, swept_noise
from ..synth import length, mix, osc, time_axis
from .common import RATE, Recipe, Rng, arp, blip, coin, dark, jit, knock, puff, thump, tone, verb, whoosh

# ── Interface ──


def ui_hover(rng: Rng) -> np.ndarray:  # extremely faint: the smallest soft tick
    return blip(0.035, 1150 * jit(rng, 0.03), 1050, 0.025, attack=0.006)


def ui_panel_open(rng: Rng) -> np.ndarray:  # ★ a tiny paper "fwip" upwards
    return dark(swept_noise(0.11, RATE, rng, 700, 1600, width=1.3, attack=0.02, release=0.07), 3000)


def ui_panel_close(rng: Rng) -> np.ndarray:  # a tiny paper "fwip" downwards
    j = jit(rng, 0.06)
    return whoosh(rng, 0.1 * jit(rng, 0.08), 1500 * j, 650 * j, top=2500, width=1.3, attack=0.015, release=0.07)


def ui_tab(rng: Rng) -> np.ndarray:  # a small soft wooden tick
    return mix(0.07, RATE, (0.0, knock(620, 0.07, 0.6), 0.0))


def ui_equip(rng: Rng) -> np.ndarray:  # gear put on: a soft leather pat and a small knock
    j = jit(rng, 0.06)
    pat = puff(rng, 0.07, 300, 1500, 1800, attack=0.005, release=0.05)
    return mix(0.16, RATE, (0.0, pat, -4.0), (0.03, knock(420 * j, 0.12, 0.8), 0.0))


def ui_drop(rng: Rng) -> np.ndarray:  # an item placed in a slot: a soft thunk
    return mix(0.15, RATE, (0.0, thump(260, 160, 0.06), 0.0), (0.0, knock(300, 0.1, 0.7), -5.0))


def ui_error(rng: Rng) -> np.ndarray:  # not allowed: a soft low double tick
    return mix(0.2, RATE, (0.0, knock(230, 0.09, 0.7), 0.0), (0.09, knock(205, 0.09, 0.7), -1.0))


def ui_buy(rng: Rng) -> np.ndarray:  # a tech rank bought: a tick and a coin
    return mix(0.22, RATE, (0.0, knock(520, 0.08, 0.6), 0.0), (0.04, coin(2300, 0.15, 0.12), -12.0), (0.05, tone(0.15, note(79), TINE, 0.12), -10.0))


def ui_talent(rng: Rng) -> np.ndarray:  # a talent point spent: a small glassy blip upwards
    return mix(0.22, RATE, (0.0, blip(0.08, 600, 900, 0.06, attack=0.006), -4.0), (0.04, tone(0.18, note(79), GLASS, 0.12), -6.0))


def ui_toggle(rng: Rng) -> np.ndarray:  # a switch: tick-tock
    return mix(0.13, RATE, (0.0, knock(700, 0.06, 0.5), 0.0), (0.05, knock(520, 0.07, 0.5), -2.0))


# ── The Cube ──


def _whirr(dur: float, f0: float, f1: float) -> np.ndarray:
    """The Cube turning: a soft sine glide with a quick flutter."""
    n = length(dur, RATE)
    t = time_axis(n, RATE)
    f = np.geomspace(f0, f1, n)
    x = (osc("sine", f, n, RATE) + 0.3 * osc("sine", f * 2, n, RATE)) / 1.3
    return x * (0.65 + 0.35 * np.sin(2 * np.pi * 24.0 * t)) * smooth_env(n, RATE, 0.06, 0.08)


def cube_synth(rng: Rng) -> np.ndarray:  # synthesis: the Cube whirrs, then a chime
    return verb(mix(0.6, RATE, (0.0, _whirr(0.3, 220, 440), -4.0), (0.27, tone(0.35, note(79), GLASS, 0.3), -2.0)), rng, seconds=0.4, wet=0.15, tail=0.1)


def cube_lucky(rng: Rng) -> np.ndarray:  # the synthesis jumped two tiers: the whirr, then a double rising sparkle
    run = [(0.27, note(79)), (0.32, note(84)), (0.37, note(88)), (0.47, note(84)), (0.52, note(88)), (0.57, note(91))]
    dry = mix(1.0, RATE, (0.0, _whirr(0.3, 220, 440), -4.0), *arp(run, 0.4, GLASS, 0.3, step_db=-0.4))
    return verb(dry, rng, seconds=0.6, wet=0.2, tail=0.15)


def cube_melt(rng: Rng) -> np.ndarray:  # melting an item: a low soft bubbling, then two soft coins
    bubbles = [(0.06 * i, blip(0.1, 300 - 40 * i, 120, 0.08, attack=0.008), -1.0 * i) for i in range(3)]
    coins = [(0.22, coin(2400, 0.14, 0.11), -12.0), (0.29, coin(2800, 0.14, 0.1), -14.0)]
    return mix(0.45, RATE, *bubbles, *coins)


def cube_transfig(rng: Rng) -> np.ndarray:  # transfiguration: two tones crossing as they glide, shimmering
    n = length(0.55, RATE)
    t = time_axis(n, RATE)
    u = np.clip(t / 0.4, 0, 1)
    up = note(67) * (note(74) / note(67)) ** u
    down = note(74) * (note(67) / note(74)) ** u
    x = (osc("sine", up, n, RATE) + osc("sine", down, n, RATE)) / 2
    x *= (0.75 + 0.25 * np.sin(2 * np.pi * 13.0 * t)) * smooth_env(n, RATE, 0.05, 0.2)
    return verb(x, rng, seconds=0.4, wet=0.18, tail=0.1)


def cube_polish(rng: Rng) -> np.ndarray:  # ★ a short soft rub and a tiny glint
    """Refined 2026-11-18: the rub's band (1.2–3.2 kHz, 24 dB/octave) still leaked hiss up to 6 kHz; it is darkened
    above 2.8 kHz now."""
    n = length(0.22, RATE)
    rub = dark(band(rng.standard_normal(n), RATE, 1200, 3200, order=4), 2800) * smooth_env(n, RATE, 0.03, 0.08)
    rub *= 0.65 + 0.35 * np.sin(2 * np.pi * 17.0 * time_axis(n, RATE))
    glint = partials(0.3, RATE, note(96), [(r, lv, d * 0.25) for r, lv, d in GLASS], attack=0.004)
    return mix(0.5, RATE, (0.0, rub, -6.0), (0.2, glint, -10.0))


def cube_perfect(rng: Rng) -> np.ndarray:  # a ★ affix came out: the polish glint and a little star chime
    star = arp([(0.0, note(84)), (0.07, note(88)), (0.14, note(91)), (0.21, note(96))], 0.5, GLASS, 0.35, step_db=-1.5)
    under = tone(0.7, note(72), TINE, 0.7, attack=0.006)
    return verb(mix(0.85, RATE, *star, (0.14, under, -8.0)), rng, seconds=0.6, wet=0.2, tail=0.15)


RECIPES: dict[str, Recipe] = {
    "ui_hover": ui_hover,
    "ui_panel_open": ui_panel_open,
    "ui_panel_close": ui_panel_close,
    "ui_tab": ui_tab,
    "ui_equip": ui_equip,
    "ui_drop": ui_drop,
    "ui_error": ui_error,
    "ui_buy": ui_buy,
    "ui_talent": ui_talent,
    "ui_toggle": ui_toggle,
    "cube_synth": cube_synth,
    "cube_lucky": cube_lucky,
    "cube_melt": cube_melt,
    "cube_transfig": cube_transfig,
    "cube_polish": cube_polish,
    "cube_perfect": cube_perfect,
}
