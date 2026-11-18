"""Shared small instruments for the recipes: pitch jitter, the steep darkening top, blips, knocks, coins, soft tones,
pads, a filtered horn, a soft zap and noise puffs and whooshes.

House rules (user, 2026-11-18; Stardew Valley as the reference): soft attacks (a few ms at least), no square-wave
edges, noise always under ~3 kHz (`dark`), tonal sounds in a pleasant register, short. Every helper takes its
randomness from the caller's generator, so a take is a pure function of its seed.
"""
from __future__ import annotations

from typing import Callable

import numpy as np

from ..kit import band, breath, exp_decay, fm_bell, normalise_peak, partials, reverb, smooth_env, swept_noise, thud
from ..synth import length, osc, time_axis

RATE = 44100
Rng = np.random.Generator
Recipe = Callable[[Rng], np.ndarray]

#: A small wooden knock (chest lids, ticks).
WOOD = [(1.0, 1.0, 0.07), (2.3, 0.45, 0.04), (4.1, 0.15, 0.02)]
#: A church bell's partials (hum, prime, tierce, quint, nominal), for far bells.
BELL = [(0.5, 0.45, 3.5), (1.0, 1.0, 2.8), (1.19, 0.4, 2.2), (1.5, 0.3, 1.8), (2.0, 0.35, 1.4), (2.5, 0.12, 0.9), (3.0, 0.08, 0.7)]


def jit(rng: Rng, spread: float = 0.06) -> float:
    """A take's pitch (or length) jitter: ±spread (6 % ≈ one semitone)."""
    return float(1.0 + rng.uniform(-spread, spread))


def dark(x: np.ndarray, top: float) -> np.ndarray:
    """A steep top (24 dB/octave above `top`): noise-made sounds keep no hiss."""
    return band(x, RATE, 0.0, top, order=4)


def blip(dur: float, f0: float, f1: float, decay: float, *, attack: float = 0.004) -> np.ndarray:
    """A soft sine whose pitch glides from f0 to f1 (cute pops, boops, plops)."""
    n = length(dur, RATE)
    f = np.geomspace(f0, f1, n)
    return osc("sine", f, n, RATE) * exp_decay(n, RATE, decay, attack=attack)


def scaled(spec: list[tuple[float, float, float]], k: float) -> list[tuple[float, float, float]]:
    """A partials spec with every decay multiplied by k (k < 1: a shorter, drier strike)."""
    return [(r, lv, d * k) for r, lv, d in spec]


def tone(dur: float, f: float, spec: list[tuple[float, float, float]], k: float = 0.5, *, attack: float = 0.005) -> np.ndarray:
    """A struck tone (glass, tine, plate…) with its decays scaled by k."""
    return partials(dur, RATE, f, scaled(spec, k), attack=attack)


def knock(f: float, dur: float = 0.12, k: float = 1.0) -> np.ndarray:
    """A small wooden knock at f (k < 1 shortens it)."""
    return partials(dur, RATE, f, scaled(WOOD, k), attack=0.004)


def coin(f: float, dur: float = 0.12, decay: float = 0.1) -> np.ndarray:
    """A small coin clink (a soft FM ping)."""
    return fm_bell(dur, RATE, f, ratio=1.41, index=0.5, decay=decay, attack=0.004)


def puff(rng: Rng, dur: float, low: float, high: float, top: float, *, attack: float = 0.012, release: float | None = None) -> np.ndarray:
    """A soft breath of darkened noise (poofs, dust, flaps)."""
    return dark(breath(dur, RATE, rng, low, high, attack=attack, release=dur * 0.7 if release is None else release), top)


def whoosh(rng: Rng, dur: float, f0: float, f1: float, *, top: float = 2600.0, width: float = 1.35, attack: float = 0.03, release: float | None = None) -> np.ndarray:
    """A soft whoosh whose band slides from f0 to f1."""
    rel = dur * 0.6 if release is None else release
    return dark(swept_noise(dur, RATE, rng, f0, f1, width=width, attack=attack, release=rel), top)


def rumble(rng: Rng, dur: float, low: float, high: float, *, attack: float, release: float) -> np.ndarray:
    """Low band noise with a rounded envelope (dust, roars, far thunder), peak 1."""
    n = length(dur, RATE)
    x = dark(band(rng.standard_normal(n), RATE, low, high, order=2), high * 1.2)
    return normalise_peak(x) * smooth_env(n, RATE, attack, release)


def pad(dur: float, freqs: list[float], *, attack: float, release: float, detune: float = 0.003, harm: float = 0.15, trem: float = 0.0) -> np.ndarray:
    """A soft sustained chord of sines (each slightly detuned, a touch of 2nd harmonic), peak ≤ 1."""
    n = length(dur, RATE)
    t = time_axis(n, RATE)
    x = np.zeros(n)
    for i, f in enumerate(freqs):
        d = 1.0 + detune * (1 if i % 2 else -1)
        x += np.sin(2 * np.pi * f * d * t + i) + harm * np.sin(2 * np.pi * 2 * f * t)
    x /= len(freqs) * (1.0 + harm)
    if trem > 0:
        x *= 0.75 + 0.25 * np.sin(2 * np.pi * trem * t)
    return x * smooth_env(n, RATE, attack, release)


def horn(dur: float, f: float, *, attack: float = 0.1, release: float = 0.25, top: float = 1300.0, vib: float = 0.004) -> np.ndarray:
    """A soft brass-like note: a saw darkened steeply, a slow attack and a gentle vibrato (no voice), peak 1."""
    n = length(dur, RATE)
    t = time_axis(n, RATE)
    ff = f * (1.0 + vib * np.sin(2 * np.pi * 5.2 * t) * np.clip(t / 0.15, 0, 1))
    x = dark(osc("saw", ff, n, RATE), top)
    return normalise_peak(x) * smooth_env(n, RATE, attack, release)


def zap(dur: float, f0: float, f1: float, *, rate: float = 36.0, depth: float = 0.08, attack: float = 0.006) -> np.ndarray:
    """A soft magic zap / whirr: a gliding sine with a quick wobble and two low harmonics (no noise, no edges)."""
    n = length(dur, RATE)
    t = time_axis(n, RATE)
    f = np.geomspace(f0, f1, n) * (1.0 + depth * np.sin(2 * np.pi * rate * t))
    x = osc("sine", f, n, RATE) + 0.35 * osc("sine", f * 2, n, RATE) + 0.12 * osc("sine", f * 3, n, RATE)
    return x / 1.47 * exp_decay(n, RATE, dur * 0.9, attack=attack)


def thump(f0: float, f1: float, decay: float, *, attack: float = 0.005) -> np.ndarray:
    """One soft low thump (a sine whose pitch falls from f0 to f1), with a rounded attack."""
    return thud(decay * 1.4, RATE, f0, f1, decay, attack=attack)


def verb(x: np.ndarray, rng: Rng, *, seconds: float = 0.6, wet: float = 0.18, tail: float = 0.25, damping: float = 0.6) -> np.ndarray:
    """A small dark room (the house reverb of the tonal sounds)."""
    return reverb(x, RATE, rng, seconds=seconds, wet=wet, damping=damping, tail=tail)


def arp(notes: list[tuple[float, float]], dur: float, spec: list[tuple[float, float, float]], k: float, *, step_db: float = -1.0, attack: float = 0.005) -> list[tuple[float, np.ndarray, float]]:
    """Mix layers of struck tones: (offset s, frequency Hz) per note, each a little quieter than the one before."""
    return [(at, tone(dur, f, spec, k, attack=attack), step_db * i) for i, (at, f) in enumerate(notes)]
