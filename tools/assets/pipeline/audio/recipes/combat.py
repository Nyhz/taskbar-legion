"""Combat: the sounds heard dozens of times a minute (swings, shots, hits, deaths) — the shortest and softest."""
from __future__ import annotations

import numpy as np

from ..kit import GLASS, PLATE, TINE, breath, fm_bell, note, pluck, smooth_env, swept_noise, thud
from ..synth import mix
from .common import RATE, Recipe, Rng, blip, dark, jit, pad, puff, thump, tone, whoosh, zap

# ── The heroes' basic attacks ──


def knight_swing(rng: Rng) -> np.ndarray:  # ★ a soft "fwip" of air
    j = jit(rng, 0.1)
    return dark(swept_noise(0.16 * jit(rng, 0.1), RATE, rng, 1500 * j, 550 * j, width=1.35, attack=0.035, release=0.09), 2600)


def ranger_shot(rng: Rng) -> np.ndarray:  # ★ a soft low twang and a breath of arrow
    """Refined 2026-11-18: the string's pick had broadband noise up to 11 kHz in its first milliseconds; it is now
    darkened like everything else, with a 3 ms rounded start."""
    j = jit(rng, 0.04)
    twang = dark(pluck(0.24, RATE, 150 * j, rng, decay=0.22, bright=0.3), 2400)
    twang *= smooth_env(len(twang), RATE, 0.004, 0.02)
    air = whoosh(rng, 0.13, 1800 * j, 800 * j, top=2800, width=1.3, attack=0.02, release=0.08)
    return mix(0.26, RATE, (0.0, twang, 0.0), (0.02, air, -9.0))


def priest_strike(rng: Rng) -> np.ndarray:  # a soft light "tink" and a puff
    j = jit(rng, 0.05)
    tink = tone(0.22, note(81) * j, GLASS, 0.16, attack=0.004)
    air = puff(rng, 0.14, 300, 1400, 1800, attack=0.01, release=0.1)
    return mix(0.24, RATE, (0.0, air, -5.0), (0.006, tink, -8.0))


# ── Landing ──


def hit(rng: Rng) -> np.ndarray:  # ★ a small round "tup"
    j = jit(rng)
    body = thud(0.12, RATE, 230 * j, 115 * j, 0.08, attack=0.003)
    tick = dark(breath(0.05, RATE, rng, 300, 1400, attack=0.003, release=0.04), 2000)
    return mix(0.13, RATE, (0.0, body, 0.0), (0.0, tick, -14.0))


def crit_hit(rng: Rng) -> np.ndarray:  # ★ the hit and a tiny ping on top
    j = jit(rng, 0.04)
    ping = fm_bell(0.3, RATE, note(83) * j, ratio=2.0, index=0.6, decay=0.22, attack=0.004)
    return mix(0.32, RATE, (0.0, hit(rng), 0.0), (0.012, ping, -11.0))


def block(rng: Rng) -> np.ndarray:  # a small soft shield knock
    j = jit(rng, 0.05)
    plate = tone(0.16, 330 * j, PLATE, 0.11, attack=0.003)
    body = thud(0.12, RATE, 210 * j, 130 * j, 0.06, attack=0.003)
    return mix(0.17, RATE, (0.0, body, -2.0), (0.0, plate, -7.0))


def multi(rng: Rng) -> np.ndarray:  # a tiny quick echo tick
    j = jit(rng, 0.05)
    tick = blip(0.05, 820 * j, 560 * j, 0.03, attack=0.006)
    return mix(0.11, RATE, (0.0, tick, 0.0), (0.05, tick, -6.0))


def hero_hurt(rng: Rng) -> np.ndarray:  # a big hit on a hero: a muffled low thump, no voice
    j = jit(rng, 0.06)
    body = thump(140 * j, 62 * j, 0.15)
    dust = puff(rng, 0.16, 80, 500, 700, attack=0.004, release=0.12)
    return mix(0.22, RATE, (0.0, body, 0.0), (0.0, dust, -9.0))


def hero_down(rng: Rng) -> np.ndarray:  # a hero falls: two soft notes going down
    a = tone(0.22, note(64), TINE, 0.22, attack=0.006)
    b = tone(0.28, note(59), TINE, 0.3, attack=0.006)
    return mix(0.4, RATE, (0.0, a, -1.0), (0.12, b, 0.0))


def enemy_die(rng: Rng) -> np.ndarray:  # ★ a little "poof"
    j = jit(rng, 0.08)
    air = dark(breath(0.22, RATE, rng, 300, 1300, attack=0.012, release=0.16), 1800)
    pop = blip(0.14, 620 * j, 240 * j, 0.1)
    return mix(0.24, RATE, (0.0, air, -3.0), (0.0, pop, -6.0))


def elite_die(rng: Rng) -> np.ndarray:  # a bigger poof with a low note under it
    j = jit(rng, 0.06)
    air = puff(rng, 0.26, 200, 1100, 1500, attack=0.012, release=0.2)
    pop = blip(0.16, 520 * j, 190 * j, 0.12)
    low = blip(0.28, note(45) * j, note(45) * j * 0.94, 0.24, attack=0.006)
    return mix(0.3, RATE, (0.0, air, -3.0), (0.0, pop, -6.0), (0.01, low, -4.0))


def elite_arrive(rng: Rng) -> np.ndarray:  # an elite joins the wave: a low soft swell
    swell = pad(0.44, [note(45), note(52)], attack=0.18, release=0.24, harm=0.3)
    air = puff(rng, 0.44, 120, 700, 900, attack=0.2, release=0.22)
    return mix(0.45, RATE, (0.0, swell, 0.0), (0.0, air, -12.0))


# ── The wave's attacks ──


def enemy_shot(rng: Rng) -> np.ndarray:  # lighter, higher twang than the Ranger's
    j = jit(rng, 0.05)
    twang = dark(pluck(0.16, RATE, 260 * j, rng, decay=0.13, bright=0.2), 2200)
    twang *= smooth_env(len(twang), RATE, 0.005, 0.02)
    air = whoosh(rng, 0.1, 1800 * j, 900 * j, top=2400, width=1.3, attack=0.02, release=0.06)
    return mix(0.18, RATE, (0.0, twang, 0.0), (0.015, air, -10.0))


def enemy_bolt(rng: Rng) -> np.ndarray:  # a caster's bolt: a soft zap / whirr
    j = jit(rng, 0.06)
    buzz = dark(zap(0.22, 560 * j, 360 * j, rate=28.0, depth=0.07, attack=0.012), 2400)
    air = puff(rng, 0.16, 300, 1200, 1500, attack=0.02, release=0.1)
    return mix(0.23, RATE, (0.0, buzz, 0.0), (0.0, air, -12.0))


def enemy_smash(rng: Rng) -> np.ndarray:  # a brute's area smash: a low soft whump
    body = thump(110, 45, 0.22)
    dust = puff(rng, 0.3, 60, 600, 800, attack=0.004, release=0.24)
    return mix(0.32, RATE, (0.0, body, 0.0), (0.0, dust, -8.0))


RECIPES: dict[str, Recipe] = {
    "knight_swing": knight_swing,
    "ranger_shot": ranger_shot,
    "priest_strike": priest_strike,
    "hit": hit,
    "crit_hit": crit_hit,
    "block": block,
    "multi": multi,
    "hero_hurt": hero_hurt,
    "hero_down": hero_down,
    "enemy_die": enemy_die,
    "elite_die": elite_die,
    "elite_arrive": elite_arrive,
    "enemy_shot": enemy_shot,
    "enemy_bolt": enemy_bolt,
    "enemy_smash": enemy_smash,
}
