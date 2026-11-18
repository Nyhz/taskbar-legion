"""The ten worlds' ambient beds (Normal grade): 24 s seamless stereo loops, a whisper of a constant bed and the
place's own details on top. All built circularly (`scatter` wraps), so they loop with no seam by construction.

The pattern is amb_w1's (approved): the bed sits ~18 dB under the details (5th vs 95th percentile of 250 ms windows,
mono mix), so what is heard is the place, not a hiss.
"""
from __future__ import annotations

import numpy as np

from ..synth import colored_noise, length, pan
from .ambient_parts import (
    LOOP_S, airy_chime, bed, cave_drip, chimes, cricket_song, crystal, drip, embers, far_bell, flag, frogs, furnace, gull,
    hammer, hawk, high_wind, hum, lap, lava, owl, pebbles, plop, rift_shimmer, rift_tone, rift_whoosh, rustle, scatter,
    sprinkle, swell, tweet, wave, whistle, wind_whistle, windmill, woodpecker,
)
from .common import RATE, Recipe, Rng


def amb_w1(rng: Rng) -> np.ndarray:  # ★ golden meadow at dusk
    """The constant bed is barely there (a breath of low wind); what is heard are the details on top of it: small
    birds warbling, a far whistle, the grass stirring, the windmill's sails creaking round, crickets far off in the
    grass (user: «el sonido de fondo constante debe ser extremadamente sutil y debe notarse el resto de soniditos que
    adornan»). Cozy, not bright (user, 2026-11-18: «campos, con molinos, buen tiempo»; the old bird was shrill)."""
    n = length(LOOP_S, RATE)
    bed_ = np.stack([colored_noise(n, RATE, rng, 90, 600, tilt=-4.0, order=4) * swell(n, 3, 0.5, p) for p in (0.0, 1.3)], axis=1) * 0.004
    out = np.zeros((n, 2))
    sprinkle(out, rng, cricket_song, 3, (0.02, 0.03), width=0.8)
    sprinkle(out, rng, tweet, 5, (0.035, 0.05), width=0.9)
    sprinkle(out, rng, whistle, 2, (0.035, 0.045), width=0.6)
    sprinkle(out, rng, lambda r: rustle(r, float(r.uniform(1.0, 1.8))), 4, (0.06, 0.08), width=0.7)
    sprinkle(out, rng, windmill, 2, (0.06, 0.075), width=0.5, jitter=0.4)
    return bed_ + out


def amb_w2(rng: Rng) -> np.ndarray:  # Old Moss Forest
    """Leaves stirring overhead, a far woodpecker drumming, a soft owl, small birds high in the canopy."""
    out = bed(rng, 90, 600, tilt=-4.0, cycles=3, depth=0.5, gain=0.004)
    sprinkle(out, rng, lambda r: rustle(r, float(r.uniform(1.0, 1.8))), 4, (0.05, 0.07), width=0.8)
    sprinkle(out, rng, woodpecker, 2, (0.045, 0.06), width=0.7)
    sprinkle(out, rng, owl, 2, (0.06, 0.08), width=0.5)
    sprinkle(out, rng, tweet, 4, (0.03, 0.045), width=0.9)
    return out


def amb_w3(rng: Rng) -> np.ndarray:  # The Stilt Marshes
    """Frogs taking turns, water lapping at the stilts, small plops."""
    out = bed(rng, 80, 500, tilt=-4.0, cycles=2, depth=0.5, gain=0.0032)
    sprinkle(out, rng, frogs, 5, (0.05, 0.075), width=0.85)
    sprinkle(out, rng, lap, 4, (0.05, 0.07), width=0.6)
    sprinkle(out, rng, plop, 7, (0.04, 0.06), width=0.9)
    return out


def amb_w4(rng: Rng) -> np.ndarray:  # Red Rock Canyons
    """Wind whistling through the rock, pebbles rattling down, a far hawk."""
    out = bed(rng, 70, 700, tilt=-3.0, cycles=2, depth=0.6, gain=0.004)
    sprinkle(out, rng, wind_whistle, 3, (0.045, 0.06), width=0.7)
    sprinkle(out, rng, pebbles, 4, (0.05, 0.07), width=0.85)
    sprinkle(out, rng, hawk, 2, (0.03, 0.04), width=0.6)
    return out


def amb_w5(rng: Rng) -> np.ndarray:  # Monastery Peaks
    """Thin mountain wind, a far soft bell down the valley, wind chimes on a terrace."""
    out = bed(rng, 90, 700, tilt=-4.0, cycles=3, depth=0.5, gain=0.0028)
    sprinkle(out, rng, far_bell, 2, (0.06, 0.075), width=0.4, jitter=0.4)
    sprinkle(out, rng, chimes, 3, (0.03, 0.04), width=0.8)
    sprinkle(out, rng, lambda r: wind_whistle(r, float(r.uniform(700, 950)), None, float(r.uniform(2.5, 3.5))), 2, (0.035, 0.045), width=0.7)
    return out


def amb_w6(rng: Rng) -> np.ndarray:  # Coast of Sunken Ruins
    """Soft waves coming in, gulls far off, drips from the ruined arches."""
    out = bed(rng, 60, 500, tilt=-4.0, cycles=2, depth=0.5, gain=0.004)
    sprinkle(out, rng, wave, 4, (0.08, 0.1), width=0.5, jitter=0.3)
    sprinkle(out, rng, gull, 3, (0.03, 0.04), width=0.9)
    sprinkle(out, rng, drip, 5, (0.035, 0.05), width=0.8)
    return out


def amb_w7(rng: Rng) -> np.ndarray:  # Caverns of Crystal and Fungus
    """Drops falling into pools with their echo, crystals ringing on their own, a low hum out of the rock."""
    out = bed(rng, 40, 300, tilt=-6.0, cycles=2, depth=0.5, gain=0.004)
    sprinkle(out, rng, cave_drip, 9, (0.05, 0.07), width=0.85)
    sprinkle(out, rng, crystal, 4, (0.03, 0.045), width=0.8)
    sprinkle(out, rng, hum, 2, (0.06, 0.08), width=0.3, jitter=0.4)
    sprinkle(out, rng, pebbles, 1, (0.035, 0.045), width=0.7)
    return out


def amb_w8(rng: Rng) -> np.ndarray:  # Ash Lands and Forges
    """Embers crackling, a far smith at an anvil, a furnace breathing, molten rock bubbling."""
    out = bed(rng, 50, 400, tilt=-5.0, cycles=2, depth=0.5, gain=0.0045)
    sprinkle(out, rng, embers, 6, (0.04, 0.055), width=0.85)
    sprinkle(out, rng, hammer, 2, (0.05, 0.065), width=0.6, jitter=0.4)
    sprinkle(out, rng, furnace, 2, (0.09, 0.11), width=0.4)
    sprinkle(out, rng, lava, 3, (0.035, 0.05), width=0.7)
    return out


def amb_w9(rng: Rng) -> np.ndarray:  # Citadel among the Clouds
    """Thin high air, glass chimes hanging in it, banners flapping far off, the wind sweeping the walls."""
    out = bed(rng, 120, 900, tilt=-3.0, cycles=3, depth=0.5, gain=0.0028)
    sprinkle(out, rng, airy_chime, 4, (0.03, 0.042), width=0.85)
    sprinkle(out, rng, flag, 3, (0.045, 0.06), width=0.8)
    sprinkle(out, rng, high_wind, 2, (0.045, 0.055), width=0.6, jitter=0.4)
    return out


def amb_w10(rng: Rng) -> np.ndarray:  # The Rift
    """Otherworldly: slow phasing whooshes, strange tones sliding down, glass heard backwards."""
    out = bed(rng, 50, 500, tilt=-5.0, cycles=1, depth=0.7, gain=0.004)
    sprinkle(out, rng, rift_whoosh, 4, (0.05, 0.065), width=0.8)
    sprinkle(out, rng, rift_tone, 3, (0.035, 0.045), width=0.6)
    sprinkle(out, rng, rift_shimmer, 3, (0.03, 0.04), width=0.85)
    return out


RECIPES: dict[str, Recipe] = {
    "amb_w1": amb_w1,
    "amb_w2": amb_w2,
    "amb_w3": amb_w3,
    "amb_w4": amb_w4,
    "amb_w5": amb_w5,
    "amb_w6": amb_w6,
    "amb_w7": amb_w7,
    "amb_w8": amb_w8,
    "amb_w9": amb_w9,
    "amb_w10": amb_w10,
}
