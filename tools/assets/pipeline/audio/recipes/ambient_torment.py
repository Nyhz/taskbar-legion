"""The ten worlds' ambient beds in Torment: darker, each with its own storm and omens, matching the world's
ATMOSPHERE (src/assets/strip/backdrops.json: lightning, rain, ash, blizzard, eyes, pulse, flicker). Still a whisper
bed plus details; still seamless 24 s stereo loops built circularly.
"""
from __future__ import annotations

import numpy as np

from ..synth import colored_noise, length, pan
from .ambient_parts import (
    LOOP_S, bed, cave_drip, creak, dark_chime, drip, embers, exhale, far_bell, flag_snap, forge_boom, frogs, furnace, gust, hammer,
    high_wind, owl, pebbles, plop, rain_sheet, rift_crack, rift_tone, rift_whoosh, scatter, snap, spore_puff, sprinkle,
    swell, throb, thunder, wave, wind_whistle,
)
from .common import RATE, Recipe, Rng


def _storm_bed(rng: Rng, *, low: float = 50.0, high: float = 400.0, gain: float = 0.006) -> np.ndarray:
    return bed(rng, low, high, tilt=-6.0, cycles=2, depth=0.6, gain=gain, phases=(0.0, 1.8))


def _thunders(out: np.ndarray, rng: Rng, count: int, gain: tuple[float, float]) -> None:
    sprinkle(out, rng, thunder, count, gain, width=0.5, jitter=0.5)


def amb_w1_torment(rng: Rng) -> np.ndarray:  # ★ the meadow under a storm
    """Barely any constant bed (a whisper of dark wind); the storm is in its details: far thunder rolls, gusts that
    rise and fall, a few heavy drops."""
    n = length(LOOP_S, RATE)
    bed_ = np.stack([colored_noise(n, RATE, rng, 50, 400, tilt=-6.0, order=4) * swell(n, 2, 0.6, p) for p in (0.0, 1.8)], axis=1) * 0.006
    out = np.zeros((n, 2))
    for at in (3.0 + rng.uniform(-1, 1), 11.0 + rng.uniform(-1, 1), 19.0 + rng.uniform(-1, 1)):
        scatter(out, pan(thunder(rng), float(rng.uniform(-0.5, 0.5))), at, float(rng.uniform(0.35, 0.5)))
    for at in rng.uniform(0, LOOP_S, 3):
        scatter(out, pan(gust(rng, float(rng.uniform(2.0, 3.5))), float(rng.uniform(-0.8, 0.8))), at, 0.12)
    for at in rng.uniform(0, LOOP_S, 9):
        scatter(out, pan(drip(rng), float(rng.uniform(-0.9, 0.9))), at, float(rng.uniform(0.03, 0.06)))
    return bed_ + out


def amb_w2_torment(rng: Rng) -> np.ndarray:  # the forest at night: eyes, creaking trunks, one far storm
    out = _storm_bed(rng)
    _thunders(out, rng, 1, (0.3, 0.35))
    sprinkle(out, rng, lambda r: gust(r, float(r.uniform(2.0, 3.0))), 2, (0.09, 0.11), width=0.8)
    sprinkle(out, rng, creak, 3, (0.05, 0.065), width=0.8)
    sprinkle(out, rng, lambda r: owl(r, 300.0), 2, (0.05, 0.065), width=0.6)
    sprinkle(out, rng, exhale, 2, (0.06, 0.08), width=0.7)
    sprinkle(out, rng, snap, 2, (0.04, 0.055), width=0.9)
    return out


def amb_w3_torment(rng: Rng) -> np.ndarray:  # the marsh in a downpour: rain sheets, thunder, deep slow frogs
    out = _storm_bed(rng)
    _thunders(out, rng, 3, (0.35, 0.45))
    sprinkle(out, rng, rain_sheet, 3, (0.04, 0.05), width=0.7, jitter=0.4)
    sprinkle(out, rng, lambda r: frogs(r, 110.0), 3, (0.045, 0.06), width=0.8)
    sprinkle(out, rng, plop, 5, (0.035, 0.05), width=0.9)
    return out


def amb_w4_torment(rng: Rng) -> np.ndarray:  # the canyon in a dust storm: gusts, howling rock, falling stones
    out = _storm_bed(rng, low=60.0, high=500.0, gain=0.0045)
    _thunders(out, rng, 2, (0.3, 0.4))
    sprinkle(out, rng, lambda r: gust(r, float(r.uniform(2.0, 2.8))), 2, (0.1, 0.12), width=0.8)
    sprinkle(out, rng, lambda r: wind_whistle(r, float(r.uniform(380, 520)), None, float(r.uniform(2.0, 3.0))), 2, (0.045, 0.055), width=0.7)
    sprinkle(out, rng, pebbles, 4, (0.05, 0.065), width=0.85)
    return out


def amb_w5_torment(rng: Rng) -> np.ndarray:  # the peaks in a blizzard: howling wind, one deep bell, far thunder
    out = _storm_bed(rng, low=70.0, high=500.0)
    _thunders(out, rng, 2, (0.28, 0.35))
    sprinkle(out, rng, lambda r: wind_whistle(r, float(r.uniform(420, 600)), None, float(r.uniform(3.0, 4.0))), 3, (0.05, 0.06), width=0.8)
    sprinkle(out, rng, lambda r: gust(r, float(r.uniform(2.0, 3.0))), 2, (0.09, 0.11), width=0.8)
    sprinkle(out, rng, lambda r: far_bell(r, 50.0), 1, (0.07, 0.08), width=0.3)
    sprinkle(out, rng, exhale, 1, (0.06, 0.07), width=0.6)
    return out


def amb_w6_torment(rng: Rng) -> np.ndarray:  # the coast in a sea storm: heavy waves, rain, thunder
    out = _storm_bed(rng)
    _thunders(out, rng, 3, (0.35, 0.45))
    sprinkle(out, rng, lambda r: wave(r, float(r.uniform(3.8, 4.8)), 80.0), 3, (0.1, 0.12), width=0.5, jitter=0.3)
    sprinkle(out, rng, rain_sheet, 2, (0.035, 0.045), width=0.7)
    sprinkle(out, rng, drip, 4, (0.03, 0.045), width=0.9)
    return out


def amb_w7_torment(rng: Rng) -> np.ndarray:  # the caverns gone dark: a throb in the rock, deep drops, spores, breath
    out = _storm_bed(rng, low=40.0, high=300.0, gain=0.005)
    sprinkle(out, rng, throb, 3, (0.06, 0.075), width=0.3, jitter=0.4)
    sprinkle(out, rng, lambda r: cave_drip(r, float(r.uniform(700, 950))), 6, (0.05, 0.065), width=0.85)
    sprinkle(out, rng, spore_puff, 4, (0.04, 0.055), width=0.8)
    sprinkle(out, rng, lambda r: rift_tone(r, 43.0, 50.0), 2, (0.03, 0.04), width=0.5)
    sprinkle(out, rng, exhale, 2, (0.055, 0.07), width=0.7)
    return out


def amb_w8_torment(rng: Rng) -> np.ndarray:  # the forges in a black storm: deep roar, a great hammer, embers, thunder
    out = _storm_bed(rng)
    _thunders(out, rng, 2, (0.3, 0.4))
    sprinkle(out, rng, lambda r: furnace(r, 40.0), 3, (0.11, 0.13), width=0.4)
    sprinkle(out, rng, forge_boom, 2, (0.07, 0.085), width=0.5, jitter=0.4)
    sprinkle(out, rng, embers, 5, (0.04, 0.055), width=0.85)
    sprinkle(out, rng, lambda r: hammer(r, float(r.uniform(330, 380)), 2, 0.9), 1, (0.04, 0.05), width=0.6)
    return out


def amb_w9_torment(rng: Rng) -> np.ndarray:  # the citadel in a storm: wind on the walls, banners whipping, a dark chime
    out = _storm_bed(rng, low=70.0, high=500.0, gain=0.0042)
    _thunders(out, rng, 3, (0.32, 0.42))
    sprinkle(out, rng, high_wind, 3, (0.06, 0.075), width=0.7)
    sprinkle(out, rng, flag_snap, 3, (0.05, 0.065), width=0.8)
    sprinkle(out, rng, dark_chime, 2, (0.035, 0.045), width=0.7)
    return out


def amb_w10_torment(rng: Rng) -> np.ndarray:  # the Rift torn open: frequent rift lightning, whooshes, eyes breathing
    out = _storm_bed(rng, gain=0.0045)
    sprinkle(out, rng, rift_crack, 5, (0.06, 0.075), width=0.7)
    sprinkle(out, rng, rift_whoosh, 3, (0.05, 0.065), width=0.8)
    sprinkle(out, rng, lambda r: rift_tone(r, 45.0, 55.0), 2, (0.03, 0.04), width=0.6)
    sprinkle(out, rng, exhale, 2, (0.05, 0.065), width=0.7)
    return out


RECIPES: dict[str, Recipe] = {
    "amb_w1_torment": amb_w1_torment,
    "amb_w2_torment": amb_w2_torment,
    "amb_w3_torment": amb_w3_torment,
    "amb_w4_torment": amb_w4_torment,
    "amb_w5_torment": amb_w5_torment,
    "amb_w6_torment": amb_w6_torment,
    "amb_w7_torment": amb_w7_torment,
    "amb_w8_torment": amb_w8_torment,
    "amb_w9_torment": amb_w9_torment,
    "amb_w10_torment": amb_w10_torment,
}
