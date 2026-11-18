"""The game's sounds, synthesised: one recipe per sound id, grouped by kind.

Direction (user, 2026-11-18): our own 16-bit-minded synthesis with Stardew Valley as the reference — small, round,
cosy sounds that bear being heard all day. Two ElevenLabs samples were rejected ("No puedo empezar a describir lo
malos que son"); recorded-style sound is out. Every recipe:
- starts softly (attacks of a few ms at least) and keeps its energy low in the spectrum (noise always darkened under
  ~3 kHz; no hiss, no harsh top);
- is short: combat sounds 0.1–0.3 s, interface under 0.2 s; only rewards, bosses and ultimates ring up to ~1.5 s;
- is varied per take by its generator (pitch and length jitter), so repeated sounds never machine-gun.

A recipe takes the take's generator and returns mono samples (or (n, 2) for the stereo ambient beds) at RATE. The
beds are built circularly, so they loop with no seam by construction.

Modules: `common` (shared small instruments), `combat`, `abilities` (and ultimates), `bosses`, `loot` (and progress),
`ui` (and the Cube), `ambient_parts` (beds and details), `ambient_normal`, `ambient_torment`.
"""
from __future__ import annotations

import numpy as np

from ..synth import rng_of
from . import abilities, ambient_normal, ambient_torment, bosses, combat, loot, ui
from .common import RATE, Recipe

RECIPES: dict[str, Recipe] = {
    **combat.RECIPES,
    **abilities.RECIPES,
    **bosses.RECIPES,
    **loot.RECIPES,
    **ui.RECIPES,
    **ambient_normal.RECIPES,
    **ambient_torment.RECIPES,
}


def render(sound_id: str, take: int) -> np.ndarray:
    """A take of a synthesised sound as (n, channels) float64, from a generator seeded by id and take."""
    x = RECIPES[sound_id](rng_of(f"{sound_id}#{take}"))
    return x[:, None] if x.ndim == 1 else x


__all__ = ["RATE", "RECIPES", "render"]
