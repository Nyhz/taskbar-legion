"""Bosses: arrivals, the Charged Strike, area blows and each world boss's own mechanic (data/bossAbilities.ts).

They may ring longer (up to ~1.5 s) and sit a little above the combat sounds, but keep the house manners: low and
round, soft attacks, no noise above ~3 kHz. A world boss's mechanic speaks in the material of its world (crows,
roots, storm, a bell, gold, the sea, spores, the forge, scales, mirrors).
"""
from __future__ import annotations

import numpy as np

from ..kit import GLASS, TINE, band, breath, clicks, fm_bell, note, partials, smooth_env, swept_noise, thud
from ..synth import length, mix, osc, time_axis
from .common import RATE, Recipe, Rng, arp, blip, dark, horn, knock, pad, puff, rumble, thump, tone, verb, whoosh, zap

# ── Arrivals and endings ──


def boss_appear(rng: Rng) -> np.ndarray:  # a stage boss steps in: a low two-note swell
    a = horn(0.55, note(38), attack=0.15, release=0.3, top=900)
    b = horn(0.6, note(45), attack=0.15, release=0.35, top=900)
    step = thump(90, 45, 0.18)
    return mix(1.0, RATE, (0.0, step, -4.0), (0.0, a, -2.0), (0.35, b, 0.0))


def world_boss_enter(rng: Rng) -> np.ndarray:  # through the portal: a swirling whoosh over a low drone
    swirl = mix(1.3, RATE, (0.0, whoosh(rng, 0.7, 220, 900, top=1500, width=1.5, attack=0.35, release=0.3), 0.0),
                (0.5, whoosh(rng, 0.8, 900, 260, top=1500, width=1.5, attack=0.2, release=0.5), -2.0))
    drone = pad(1.45, [note(33), note(40)], attack=0.5, release=0.6, harm=0.4)
    glow = tone(0.8, note(69), GLASS, 0.6, attack=0.02)
    return verb(mix(1.5, RATE, (0.0, drone, -2.0), (0.0, swirl, -6.0), (0.7, glow, -14.0)), rng, seconds=0.8, wet=0.2, tail=0.1)


def boss_charge_windup(rng: Rng) -> np.ndarray:  # ★ a low hum that swells and rises
    n = length(1.2, RATE)
    f = np.geomspace(55.0, 92.0, n)
    hum = (osc("sine", f, n, RATE) + 0.25 * osc("sine", f * 2.0, n, RATE)) * smooth_env(n, RATE, 0.9, 0.15)
    air = dark(swept_noise(1.2, RATE, rng, 180, 520, width=1.5, attack=0.8, release=0.15), 900)
    return mix(1.2, RATE, (0.0, hum, 0.0), (0.0, air, -12.0))


def boss_charge_impact(rng: Rng) -> np.ndarray:  # ★ a deep soft thump
    body = thud(0.5, RATE, 120, 45, 0.38, attack=0.004)
    dust = dark(breath(0.35, RATE, rng, 60, 650, attack=0.004, release=0.28), 900)
    return mix(0.5, RATE, (0.0, body, 0.0), (0.0, dust, -8.0))


def boss_fury(rng: Rng) -> np.ndarray:  # enrage: a low rough rumble that rises (no voice)
    n = length(0.9, RATE)
    t = time_axis(n, RATE)
    f = np.geomspace(52, 74, n)
    growl = dark(osc("saw", f, n, RATE), 600) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * 17.0 * t)))
    growl = growl / (np.max(np.abs(growl)) + 1e-12) * smooth_env(n, RATE, 0.4, 0.3)
    roar = rumble(rng, 0.9, 60, 500, attack=0.45, release=0.3)
    return mix(0.92, RATE, (0.0, growl, 0.0), (0.0, roar, -6.0))


def boss_down(rng: Rng) -> np.ndarray:  # a boss defeated: a warm chord that resolves
    four = [(0.0, note(65)), (0.02, note(69)), (0.04, note(72))]
    home = [(0.32, note(60)), (0.34, note(64)), (0.36, note(67)), (0.4, note(72))]
    dry = mix(1.2, RATE, *arp(four, 0.5, TINE, 0.45, step_db=-1.0), *[(at, tone(0.85, f, TINE, 0.9), -1.0 * i) for i, (at, f) in enumerate(home)])
    return verb(dry, rng, seconds=0.8, wet=0.2, tail=0.2)


# ── Blows every boss may wield ──


def boss_slam(rng: Rng) -> np.ndarray:  # the stage boss rears up and slams the ground
    rear = whoosh(rng, 0.28, 250, 650, top=1100, width=1.5, attack=0.2, release=0.06)
    slam = thump(105, 40, 0.3)
    dust = puff(rng, 0.35, 60, 650, 850, attack=0.004, release=0.3)
    return mix(0.7, RATE, (0.0, rear, -8.0), (0.28, slam, 0.0), (0.28, dust, -8.0))


def boss_shockwave(rng: Rng) -> np.ndarray:  # a whump and a low wave that rolls outwards
    body = thump(110, 42, 0.28)
    wave = whoosh(rng, 0.7, 650, 140, top=900, width=1.6, attack=0.04, release=0.5)
    return mix(0.8, RATE, (0.0, body, 0.0), (0.03, wave, -5.0))


def boss_mortal_wound(rng: Rng) -> np.ndarray:  # a dull low slash, and a dark note falling
    slash = whoosh(rng, 0.16, 900, 300, top=1500, width=1.4, attack=0.02, release=0.09)
    blow = thump(150, 70, 0.12)
    fall = blip(0.55, note(43), note(36), 0.45, attack=0.02)
    return mix(0.64, RATE, (0.0, slash, -4.0), (0.1, blow, -1.0), (0.12, fall, -5.0))


def boss_deadeye(rng: Rng) -> np.ndarray:  # a thin whistle through the air, then a dull thock
    whistle = blip(0.14, 1300, 850, 0.12, attack=0.03)
    thock = mix(0.15, RATE, (0.0, thump(190, 95, 0.08), 0.0), (0.0, knock(260, 0.1), -6.0))
    return mix(0.34, RATE, (0.0, whistle, -10.0), (0.13, thock, 0.0))


# ── The world bosses' mechanics ──


def boss_flock(rng: Rng) -> np.ndarray:  # W1, the Crowmother: wings opening, a flurry of soft flaps
    layers = []
    at = 0.0
    for i in range(7):
        at += float(rng.uniform(0.07, 0.12))
        layers.append((at, puff(rng, 0.07, 200, 1100, 1300, attack=0.008, release=0.05), float(rng.uniform(-6, 0)) - 0.5 * i))
    spread = whoosh(rng, 0.4, 300, 800, top=1200, width=1.6, attack=0.15, release=0.2)
    return mix(1.0, RATE, (0.0, spread, -6.0), *layers)


def boss_roots(rng: Rng) -> np.ndarray:  # W2, Our Lady of Mistletoe: a low woody creak and groan, then a knot
    n = length(0.75, RATE)
    t = time_axis(n, RATE)
    f = 68.0 * (1.0 + 0.06 * np.sin(2 * np.pi * 1.3 * t))
    creak = band(osc("saw", f, n, RATE), RATE, 180, 900, order=2) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 23.0 * t)))
    creak = dark(creak, 1000)
    creak = creak / (np.max(np.abs(creak)) + 1e-12) * smooth_env(n, RATE, 0.12, 0.25)
    knot = knock(150, 0.16)
    return mix(0.9, RATE, (0.0, creak, -2.0), (0.7, knot, -2.0))


def boss_chain_bolt(rng: Rng) -> np.ndarray:  # W3, the Drowned Moon: a bolt that hops hero to hero
    hops = [(0.0, dark(zap(0.16, 1000, 420, rate=44.0, depth=0.06), 2600), 0.0),
            (0.13, dark(zap(0.14, 820, 360, rate=44.0, depth=0.06), 2600), -3.0),
            (0.24, dark(zap(0.13, 700, 320, rate=44.0, depth=0.06), 2600), -6.0)]
    roll = rumble(rng, 0.5, 40, 200, attack=0.02, release=0.4)
    return mix(0.62, RATE, *hops, (0.0, roll, -8.0))


def boss_guilt(rng: Rng) -> np.ndarray:  # W4, the Scapegoat: one dark low bell toll
    toll = dark(fm_bell(1.3, RATE, note(45), ratio=1.41, index=1.0, decay=1.1, attack=0.006), 1800)
    hum = dark(partials(1.3, RATE, note(45), [(0.5, 0.5, 1.2), (1.0, 0.6, 1.0)], attack=0.01), 900)
    return mix(1.3, RATE, (0.0, toll, 0.0), (0.0, hum, -4.0))


def boss_gild(rng: Rng) -> np.ndarray:  # W5, the Gilded Abbot: a golden shimmer that freezes still
    notes = [(0.0, note(79)), (0.04, note(83)), (0.08, note(86))]
    shimmer = mix(0.8, RATE, *arp(notes, 0.8, GLASS, 0.9, step_db=-1.0))
    n = len(shimmer)
    t = time_axis(n, RATE)
    shimmer *= 0.8 + 0.2 * np.sin(2 * np.pi * 11.0 * t)
    shimmer *= smooth_env(n, RATE, 0.005, 0.12, hold=0.42)
    hum = pad(0.8, [note(55)], attack=0.1, release=0.15, harm=0.1)
    return mix(0.82, RATE, (0.0, shimmer, -2.0), (0.0, hum, -12.0))


def boss_undertow(rng: Rng) -> np.ndarray:  # W6, the Ninth Wave: a wave swelling over, then dragging back
    wave = rumble(rng, 0.85, 150, 1200, attack=0.35, release=0.45)
    drag = whoosh(rng, 0.6, 900, 200, top=1100, width=1.6, attack=0.08, release=0.4)
    body = thump(90, 45, 0.2)
    return mix(1.2, RATE, (0.0, wave, -2.0), (0.38, body, -6.0), (0.5, drag, -4.0))


def boss_spores(rng: Rng) -> np.ndarray:  # W7, the Destroying Angel: soft puffs of spores settling
    layers = [(0.1 * i + float(rng.uniform(0, 0.05)), puff(rng, 0.18, 250, 1100, 1300, attack=0.015, release=0.14), float(rng.uniform(-5, 0))) for i in range(5)]
    bubbles = [(0.05 + 0.13 * i, blip(0.08, 240 + 30 * i, 330 + 30 * i, 0.06, attack=0.006), -12.0) for i in range(3)]
    return mix(0.8, RATE, *layers, *bubbles)


def boss_red_blade(rng: Rng) -> np.ndarray:  # W8, the Quench: a whoomp of fire and a dark sizzle under the heroes
    whoomp = whoosh(rng, 0.4, 200, 700, top=1200, width=1.6, attack=0.05, release=0.3)
    n = length(0.6, RATE)
    sizzle = dark(clicks(0.6, RATE, rng, 45, low=700, high=2400, decay=0.002), 2600) * smooth_env(n, RATE, 0.08, 0.4)
    sizzle /= np.max(np.abs(sizzle)) + 1e-12
    return mix(0.8, RATE, (0.0, whoomp, 0.0), (0.15, sizzle, -9.0))


def boss_scales(rng: Rng) -> np.ndarray:  # W9, the Verdict: two chimes sliding into one, a soft tilt of the beam
    n = length(0.9, RATE)
    t = time_axis(n, RATE)
    glide = np.clip(t / 0.5, 0, 1) ** 1.5
    fa = note(67) * (note(65) / note(67)) ** glide
    fb = note(62) * (note(65) / note(62)) ** glide
    env = smooth_env(n, RATE, 0.006, 0.4)
    chimes = (osc("sine", fa, n, RATE) + osc("sine", fb, n, RATE) + 0.2 * osc("sine", fa * 2, n, RATE)) / 2.2 * env
    beam = knock(180, 0.14)
    return mix(0.92, RATE, (0.0, beam, -6.0), (0.02, chimes, 0.0))


def boss_mirror(rng: Rng) -> np.ndarray:  # W10, the Unmaker: a glassy shimmer swelling backwards
    glass = mix(0.6, RATE, *arp([(0.0, note(76)), (0.0, note(83))], 0.6, GLASS, 0.6, step_db=-3.0))
    rev = glass[::-1].copy()
    rev *= smooth_env(len(rev), RATE, 0.02, 0.08)
    return dark(rev, 3000)


def boss_shatter(rng: Rng) -> np.ndarray:  # W10: six mirrors breaking, soft: a falling cluster of glass and a whump
    shards = []
    for i in range(9):
        at = 0.02 + 0.035 * i + float(rng.uniform(0, 0.02))
        f = note(88 - 2 * i + float(rng.uniform(-0.5, 0.5)))
        shards.append((at, tone(0.25, f, GLASS, 0.12, attack=0.004), -2.0 - 0.5 * i))
    glass = dark(mix(0.7, RATE, *shards), 3200)
    body = thump(120, 50, 0.22)
    dust = puff(rng, 0.3, 120, 900, 1200, attack=0.006, release=0.24)
    return mix(0.8, RATE, (0.0, body, -3.0), (0.0, dust, -10.0), (0.0, glass, -4.0))


RECIPES: dict[str, Recipe] = {
    "boss_appear": boss_appear,
    "world_boss_enter": world_boss_enter,
    "boss_charge_windup": boss_charge_windup,
    "boss_charge_impact": boss_charge_impact,
    "boss_fury": boss_fury,
    "boss_down": boss_down,
    "boss_slam": boss_slam,
    "boss_shockwave": boss_shockwave,
    "boss_mortal_wound": boss_mortal_wound,
    "boss_deadeye": boss_deadeye,
    "boss_flock": boss_flock,
    "boss_roots": boss_roots,
    "boss_chain_bolt": boss_chain_bolt,
    "boss_guilt": boss_guilt,
    "boss_gild": boss_gild,
    "boss_undertow": boss_undertow,
    "boss_spores": boss_spores,
    "boss_red_blade": boss_red_blade,
    "boss_scales": boss_scales,
    "boss_mirror": boss_mirror,
    "boss_shatter": boss_shatter,
}
