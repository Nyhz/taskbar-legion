"""The game's sounds, synthesised: one recipe per sound id.

Direction (user, 2026-11-18): our own 16-bit-minded synthesis with Stardew Valley as the reference — small, round,
cosy sounds that bear being heard all day. Two ElevenLabs samples were rejected ("No puedo empezar a describir lo
malos que son"); recorded-style sound is out. Every recipe here:
- starts softly (attacks of a few ms at least) and keeps its energy low in the spectrum (no hiss, no harsh top);
- is short: combat sounds 0.1–0.3 s, interface under 0.2 s, only rewards ring a little longer;
- is varied per take by its generator (pitch and length jitter), so repeated sounds never machine-gun.

A recipe takes the take's generator and returns mono samples (or (n, 2) for the stereo ambient beds) at RATE.
The beds are built circularly, so they loop with no seam by construction.
"""
from __future__ import annotations

from typing import Callable

import numpy as np

from .kit import GLASS, TINE, band, breath, exp_decay, fit, fm_bell, note, partials, pluck, reverb, smooth_env, swept_noise, thud
from .synth import colored_noise, length, mix, osc, pan, place, time_axis

RATE = 44100
Rng = np.random.Generator


def _j(rng: Rng, spread: float = 0.06) -> float:
    """A take's pitch jitter: ±spread (6 % ≈ one semitone)."""
    return float(1.0 + rng.uniform(-spread, spread))


def _dark(x: np.ndarray, top: float) -> np.ndarray:
    """A steep top (24 dB/octave above `top`): noise-made sounds keep no hiss."""
    return band(x, RATE, 0.0, top, order=4)


def _blip(dur: float, f0: float, f1: float, decay: float) -> np.ndarray:
    """A soft sine whose pitch glides from f0 to f1 (cute pops and boops)."""
    n = length(dur, RATE)
    f = np.geomspace(f0, f1, n)
    return osc("sine", f, n, RATE) * exp_decay(n, RATE, decay, attack=0.004)


WOOD = [(1.0, 1.0, 0.07), (2.3, 0.45, 0.04), (4.1, 0.15, 0.02)]


# ── Combat ──


def knight_swing(rng: Rng) -> np.ndarray:  # a soft "fwip" of air
    j = _j(rng, 0.1)
    return _dark(swept_noise(0.16 * _j(rng, 0.1), RATE, rng, 1500 * j, 550 * j, width=1.35, attack=0.035, release=0.09), 2600)


def hit(rng: Rng) -> np.ndarray:  # a small round "tup"
    j = _j(rng)
    body = thud(0.12, RATE, 230 * j, 115 * j, 0.08, attack=0.003)
    tick = _dark(breath(0.05, RATE, rng, 300, 1400, attack=0.003, release=0.04), 2000)
    return mix(0.13, RATE, (0.0, body, 0.0), (0.0, tick, -14.0))


def ranger_shot(rng: Rng) -> np.ndarray:  # a soft low twang and a breath of arrow
    j = _j(rng, 0.04)
    twang = pluck(0.24, RATE, 150 * j, rng, decay=0.22, bright=0.3)
    air = _dark(swept_noise(0.13, RATE, rng, 1800 * j, 800 * j, width=1.3, attack=0.02, release=0.08), 2800)
    return mix(0.26, RATE, (0.0, twang, 0.0), (0.02, air, -9.0))


def crit_hit(rng: Rng) -> np.ndarray:  # the hit and a tiny ping on top
    j = _j(rng, 0.04)
    ping = fm_bell(0.3, RATE, note(83) * j, ratio=2.0, index=0.6, decay=0.22, attack=0.004)
    return mix(0.32, RATE, (0.0, hit(rng), 0.0), (0.012, ping, -11.0))


def enemy_die(rng: Rng) -> np.ndarray:  # a little "poof"
    j = _j(rng, 0.08)
    puff = _dark(breath(0.22, RATE, rng, 300, 1300, attack=0.012, release=0.16), 1800)
    pop = _blip(0.14, 620 * j, 240 * j, 0.1)
    return mix(0.24, RATE, (0.0, puff, -3.0), (0.0, pop, -6.0))


# ── Abilities ──


def priest_mend(rng: Rng) -> np.ndarray:  # two soft glass notes, a fifth apart
    j = _j(rng, 0.02)
    a = partials(0.5, RATE, note(76) * j, [(r, lv, d * 0.45) for r, lv, d in GLASS], attack=0.006)
    b = partials(0.6, RATE, note(83) * j, [(r, lv, d * 0.5) for r, lv, d in GLASS], attack=0.006)
    dry = mix(0.75, RATE, (0.0, a, -2.0), (0.09, b, 0.0))
    return reverb(dry, RATE, rng, seconds=0.6, wet=0.18, damping=0.6, tail=0.25)


# ── Bosses ──


def boss_charge_windup(rng: Rng) -> np.ndarray:  # a low hum that swells and rises
    n = length(1.2, RATE)
    f = np.geomspace(55.0, 92.0, n)
    hum = (osc("sine", f, n, RATE) + 0.25 * osc("sine", f * 2.0, n, RATE)) * smooth_env(n, RATE, 0.9, 0.15)
    air = _dark(swept_noise(1.2, RATE, rng, 180, 520, width=1.5, attack=0.8, release=0.15), 900)
    return mix(1.2, RATE, (0.0, hum, 0.0), (0.0, air, -12.0))


def boss_charge_impact(rng: Rng) -> np.ndarray:  # a deep soft thump
    body = thud(0.5, RATE, 120, 45, 0.38, attack=0.004)
    dust = _dark(breath(0.35, RATE, rng, 60, 650, attack=0.004, release=0.28), 900)
    return mix(0.5, RATE, (0.0, body, 0.0), (0.0, dust, -8.0))


# ── Loot and progress ──


def chest_drop(rng: Rng) -> np.ndarray:  # a small wooden knock and two coin clinks
    j = _j(rng, 0.05)
    knock = partials(0.12, RATE, 240 * j, WOOD, attack=0.002)
    c1 = fm_bell(0.12, RATE, 2600 * j, ratio=1.41, index=0.5, decay=0.1, attack=0.002)
    c2 = fm_bell(0.12, RATE, 3100 * j, ratio=1.41, index=0.5, decay=0.09, attack=0.002)
    return mix(0.3, RATE, (0.0, knock, 0.0), (0.06, c1, -16.0), (0.11, c2, -18.0))


def chest_open_rare(rng: Rng) -> np.ndarray:  # the lid, then a little rising sparkle
    lid = mix(0.2, RATE, (0.0, partials(0.1, RATE, 300, WOOD, attack=0.002), 0.0), (0.08, partials(0.1, RATE, 270, WOOD, attack=0.002), -3.0))
    notes = [84, 88, 91, 96]
    sparkle = mix(0.6, RATE, *[(0.05 * i, partials(0.35, RATE, note(m), [(r, lv, d * 0.3) for r, lv, d in TINE], attack=0.004), -4.0 - i) for i, m in enumerate(notes)])
    dry = mix(0.9, RATE, (0.0, lid, 0.0), (0.18, sparkle, -6.0))
    return reverb(dry, RATE, rng, seconds=0.7, wet=0.2, damping=0.6, tail=0.2)


def level_up(rng: Rng) -> np.ndarray:  # three warm tine notes going up, the last one held
    notes = [(0.0, 72, 0.5), (0.11, 76, 0.5), (0.22, 79, 0.9)]
    dry = mix(1.1, RATE, *[(t, partials(dur, RATE, note(m), [(r, lv, d * dur) for r, lv, d in TINE], attack=0.005), -2.0 if m != 79 else 0.0) for t, m, dur in notes])
    return reverb(dry, RATE, rng, seconds=0.8, wet=0.2, damping=0.6, tail=0.3)


# ── Interface and Cube ──


def ui_panel_open(rng: Rng) -> np.ndarray:  # a tiny paper "fwip" upwards
    return _dark(swept_noise(0.11, RATE, rng, 700, 1600, width=1.3, attack=0.02, release=0.07), 3000)


def cube_polish(rng: Rng) -> np.ndarray:  # a short soft rub and a tiny glint
    n = length(0.22, RATE)
    rub = band(rng.standard_normal(n), RATE, 1200, 3200, order=4) * smooth_env(n, RATE, 0.03, 0.08)
    rub *= 0.65 + 0.35 * np.sin(2 * np.pi * 17.0 * time_axis(n, RATE))
    glint = partials(0.3, RATE, note(96), [(r, lv, d * 0.25) for r, lv, d in GLASS], attack=0.004)
    return mix(0.5, RATE, (0.0, rub, -6.0), (0.2, glint, -10.0))


# ── Ambient beds (stereo, circular: seamless loops) ──

LOOP_S = 24.0


def _swell(n: int, cycles: int, depth: float, phase: float) -> np.ndarray:
    """A slow loudness swell with a whole number of cycles in the loop (so it stays seamless)."""
    t = np.arange(n) / n
    return (1.0 - depth) + depth * (0.5 + 0.5 * np.sin(2 * np.pi * cycles * t + phase))


def _cricket(rng: Rng) -> np.ndarray:
    """One chirp: three tiny pulses of a high sine."""
    f = 4300.0 * _j(rng, 0.03)
    pulse = osc("sine", f, length(0.012, RATE), RATE) * np.hanning(length(0.012, RATE))
    return mix(0.08, RATE, (0.0, pulse, 0.0), (0.028, pulse, -1.0), (0.056, pulse, -2.0))


def _bird(rng: Rng) -> np.ndarray:
    n = length(0.09, RATE)
    k = n // 3
    f = np.concatenate([np.geomspace(2400, 3700, k), np.geomspace(3700, 2900, n - k)]) * _j(rng, 0.05)
    return osc("sine", f, n, RATE) * np.hanning(n)


def amb_w1(rng: Rng) -> np.ndarray:  # golden meadow at dusk: a soft breeze, crickets, a few far birds
    n = length(LOOP_S, RATE)
    wind = np.stack([colored_noise(n, RATE, rng, 90, 800, tilt=-3.0, order=4) * _swell(n, 3, 0.5, p) for p in (0.0, 1.3)], axis=1)
    bugs = np.zeros((n, 2))
    for _ in range(int(LOOP_S * 1.2)):
        chirp = pan(_cricket(rng), float(rng.uniform(-0.8, 0.8))) * float(rng.uniform(0.3, 1.0))
        start = int(rng.uniform(0, n))
        for c in range(2):
            place(bugs[:, c], chirp[:, c], start, circular=True)
    birds = np.zeros((n, 2))
    for _ in range(4):
        call = pan(mix(0.4, RATE, (0.0, _bird(rng), 0.0), (0.16, _bird(rng), -2.0)), float(rng.uniform(-0.9, 0.9)))
        start = int(rng.uniform(0, n))
        for c in range(2):
            place(birds[:, c], call[:, c], start, circular=True)
    return wind * 0.5 + bugs * 0.05 + birds * 0.035


def amb_w1_torment(rng: Rng) -> np.ndarray:  # the same meadow under a storm: low dark wind, far soft thunder
    n = length(LOOP_S, RATE)
    wind = np.stack([colored_noise(n, RATE, rng, 50, 480, tilt=-6.0, order=4) * _swell(n, 2, 0.6, p) for p in (0.0, 1.8)], axis=1)
    thunder = np.zeros((n, 2))
    for start_s in (5.0 + rng.uniform(-1, 1), 16.0 + rng.uniform(-1, 1)):
        m = length(3.0, RATE)
        rumble = band(rng.standard_normal(m), RATE, 25, 160) * smooth_env(m, RATE, 0.35, 2.4)
        rumble = pan(rumble, float(rng.uniform(-0.5, 0.5)))
        for c in range(2):
            place(thunder[:, c], rumble[:, c], int(start_s * RATE), circular=True)
    return wind * 0.6 + thunder * 0.45


RECIPES: dict[str, Callable[[Rng], np.ndarray]] = {
    "knight_swing": knight_swing,
    "hit": hit,
    "ranger_shot": ranger_shot,
    "crit_hit": crit_hit,
    "enemy_die": enemy_die,
    "priest_mend": priest_mend,
    "boss_charge_windup": boss_charge_windup,
    "boss_charge_impact": boss_charge_impact,
    "chest_drop": chest_drop,
    "chest_open_rare": chest_open_rare,
    "level_up": level_up,
    "ui_panel_open": ui_panel_open,
    "cube_polish": cube_polish,
    "amb_w1": amb_w1,
    "amb_w1_torment": amb_w1_torment,
}


def render(sound_id: str, take: int) -> np.ndarray:
    """A take of a synthesised sound as (n, channels) float64, from a generator seeded by id and take."""
    from .synth import rng_of

    x = RECIPES[sound_id](rng_of(f"{sound_id}#{take}"))
    x = fit(x, len(x)) if x.ndim == 1 else x
    return x[:, None] if x.ndim == 1 else x
