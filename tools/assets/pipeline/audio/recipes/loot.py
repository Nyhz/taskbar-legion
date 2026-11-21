"""Loot and progress: chests, item reveals, gems, keys, pets, level-ups, cleared stages and wipes.

The rewards: warm tines and glass, a little reverb; they may ring up to ~1.5 s (the legendary is the special one) and
sit a few dB above the combat sounds. The common chest stays short — it drops about every five to ten minutes.
"""
from __future__ import annotations

import numpy as np

from ..kit import GLASS, TINE, fm_bell, note, partials
from ..synth import mix
from .common import RATE, WOOD, Recipe, Rng, arp, blip, coin, jit, knock, pad, puff, thump, tone, verb

# ── Chests ──


def chest_drop(rng: Rng) -> np.ndarray:  # ★ a small wooden knock and two coin clinks
    j = jit(rng, 0.05)
    lid = partials(0.12, RATE, 240 * j, WOOD, attack=0.002)
    c1 = fm_bell(0.12, RATE, 2600 * j, ratio=1.41, index=0.5, decay=0.1, attack=0.002)
    c2 = fm_bell(0.12, RATE, 3100 * j, ratio=1.41, index=0.5, decay=0.09, attack=0.002)
    return mix(0.3, RATE, (0.0, lid, 0.0), (0.06, c1, -16.0), (0.11, c2, -18.0))


def chest_drop_boss(rng: Rng) -> np.ndarray:  # a stage-boss chest: a heavier knock and a few more coins
    j = jit(rng, 0.04)
    coins = [(0.07 + 0.045 * i + float(rng.uniform(0, 0.015)), coin(float(rng.uniform(2300, 3000)) * j), -15.0 - i) for i in range(4)]
    return mix(0.42, RATE, (0.0, thump(150, 80, 0.08), -4.0), (0.0, knock(200 * j, 0.14), 0.0), *coins)


def chest_drop_world(rng: Rng) -> np.ndarray:  # a world-boss chest: a heavy knock, a spill of coins, a warm note
    coins = [(0.08 + 0.04 * i + float(rng.uniform(0, 0.02)), coin(float(rng.uniform(2200, 3000))), -14.0 - 0.8 * i) for i in range(6)]
    glow = mix(0.6, RATE, *arp([(0.0, note(67)), (0.06, note(72))], 0.6, TINE, 0.6, step_db=1.0))
    dry = mix(0.95, RATE, (0.0, thump(120, 60, 0.12), -2.0), (0.0, knock(170, 0.16), 0.0), *coins, (0.3, glow, -6.0))
    return verb(dry, rng, seconds=0.6, wet=0.15, tail=0.15)


def chest_open(rng: Rng) -> np.ndarray:  # opening a chest: the lid in two soft knocks and a little breath
    j = jit(rng, 0.05)
    lid = mix(0.22, RATE, (0.0, knock(300 * j, 0.1), 0.0), (0.08, knock(265 * j, 0.1), -3.0))
    air = puff(rng, 0.14, 300, 1300, 1600, attack=0.02, release=0.1)
    return mix(0.26, RATE, (0.0, lid, 0.0), (0.06, air, -12.0))


def chest_open_rare(rng: Rng) -> np.ndarray:  # ★ the lid, then a little rising sparkle
    lid = mix(0.2, RATE, (0.0, partials(0.1, RATE, 300, WOOD, attack=0.002), 0.0), (0.08, partials(0.1, RATE, 270, WOOD, attack=0.002), -3.0))
    notes = [84, 88, 91, 96]
    sparkle = mix(0.6, RATE, *[(0.05 * i, partials(0.35, RATE, note(m), [(r, lv, d * 0.3) for r, lv, d in TINE], attack=0.004), -4.0 - i) for i, m in enumerate(notes)])
    dry = mix(0.9, RATE, (0.0, lid, 0.0), (0.18, sparkle, -6.0))
    return verb(dry, rng, seconds=0.7, wet=0.2, damping=0.6, tail=0.2)


# ── Reveals ──


def item_epic(rng: Rng) -> np.ndarray:  # a T5–T6 item: two shimmering notes going up
    dry = mix(0.75, RATE, *arp([(0.0, note(79)), (0.09, note(86))], 0.65, TINE, 0.6, step_db=1.0),
              (0.09, tone(0.6, note(86), GLASS, 0.35, attack=0.006), -10.0))
    return verb(dry, rng, seconds=0.7, wet=0.2, tail=0.2)


def item_legendary(rng: Rng) -> np.ndarray:  # a T7–T8 item, the special one: a rising run that blooms into a chord
    run = [(0.0, note(72)), (0.07, note(76)), (0.14, note(79)), (0.21, note(84))]
    bloom = [(0.3, note(84)), (0.31, note(88)), (0.32, note(91))]
    under = pad(1.1, [note(60), note(67)], attack=0.2, release=0.6, harm=0.15)
    dry = mix(1.3, RATE, *arp(run, 0.4, TINE, 0.35, step_db=0.0), *[(at, tone(1.0, f, GLASS, 0.75, attack=0.006), -3.0 - i) for i, (at, f) in enumerate(bloom)],
              (0.25, under, -12.0))
    return verb(dry, rng, seconds=0.9, wet=0.22, tail=0.2)


def gem_get(rng: Rng) -> np.ndarray:  # a gem: a clear crystal ting with its octave-and-a-fifth answering
    dry = mix(0.6, RATE, (0.0, tone(0.55, note(84), GLASS, 0.4, attack=0.004), 0.0), (0.06, tone(0.45, note(91), GLASS, 0.3, attack=0.004), -8.0))
    return verb(dry, rng, seconds=0.5, wet=0.18, tail=0.15)


def key_get(rng: Rng) -> np.ndarray:  # a world-boss key: a small key jingle
    rings = [(0.0, 1500.0), (0.07, 1820.0), (0.13, 1650.0)]
    layers = [(at, coin(f * jit(rng, 0.02), 0.2, 0.16), -1.5 * i) for i, (at, f) in enumerate(rings)]
    return mix(0.36, RATE, (0.0, knock(500, 0.06, 0.5), -10.0), *layers)


def pet_found(rng: Rng) -> np.ndarray:  # an ultra-rare pet: a cute hopping chirp and three tines going up
    chirps = [(0.0, blip(0.09, 600, 900, 0.07, attack=0.008), -4.0), (0.12, blip(0.09, 760, 1150, 0.07, attack=0.008), -4.0),
              (0.24, blip(0.1, 900, 1350, 0.08, attack=0.008), -3.0)]
    tines = arp([(0.36, note(79)), (0.45, note(84)), (0.54, note(88))], 0.5, TINE, 0.5, step_db=0.5)
    return verb(mix(1.1, RATE, *chirps, *tines), rng, seconds=0.6, wet=0.18, tail=0.15)


# ── Progress ──


def level_up(rng: Rng) -> np.ndarray:  # ★ three warm tine notes going up, the last one held
    notes = [(0.0, 72, 0.5), (0.11, 76, 0.5), (0.22, 79, 0.9)]
    dry = mix(1.1, RATE, *[(t, partials(dur, RATE, note(m), [(r, lv, d * dur) for r, lv, d in TINE], attack=0.005), -2.0 if m != 79 else 0.0) for t, m, dur in notes])
    return verb(dry, rng, seconds=0.8, wet=0.2, tail=0.3)


def stage_clear(rng: Rng) -> np.ndarray:  # a stage cleared: two steps and a soft chord landing home
    steps = [(0.0, tone(0.3, note(67), TINE, 0.3), -3.0), (0.1, tone(0.3, note(71), TINE, 0.3), -3.0)]
    home = arp([(0.2, note(72)), (0.21, note(76)), (0.22, note(79))], 0.6, TINE, 0.6, step_db=-1.5)
    return verb(mix(0.85, RATE, *steps, *home), rng, seconds=0.6, wet=0.18, tail=0.2)


def wipe(rng: Rng) -> np.ndarray:  # the party falls: three soft low notes going down
    notes = [(0.0, note(55)), (0.28, note(52)), (0.56, note(48))]
    layers = [(at, pad(0.5 if i < 2 else 0.7, [f], attack=0.03, release=0.35 if i < 2 else 0.55, harm=0.35), 0.0 if i < 2 else 1.0) for i, (at, f) in enumerate(notes)]
    return mix(1.3, RATE, *layers)


def runaway_appear(rng: Rng) -> np.ndarray:  # the runaway chest: a quick patter of tiny wooden feet and a lid clack
    j = jit(rng, 0.05)
    feet = [(0.045 * i, knock(float(rng.uniform(820, 980)) * j, 0.04, 0.6), -10.0 - 1.5 * (i % 2)) for i in range(6)]
    lid = knock(330 * j, 0.08)
    return mix(0.42, RATE, *feet, (0.29, lid, -6.0))


def merchant_appear(rng: Rng) -> np.ndarray:  # the wandering merchant: a small shop bell, two soft rings
    j = jit(rng, 0.02)
    bell = arp([(0.0, note(79) * j), (0.12, note(84) * j)], 0.7, TINE, 0.5, step_db=-2.0)
    return verb(mix(0.8, RATE, *bell), rng, seconds=0.5, wet=0.16, tail=0.15)


RECIPES: dict[str, Recipe] = {
    "chest_drop": chest_drop,
    "chest_drop_boss": chest_drop_boss,
    "chest_drop_world": chest_drop_world,
    "chest_open": chest_open,
    "chest_open_rare": chest_open_rare,
    "item_epic": item_epic,
    "item_legendary": item_legendary,
    "gem_get": gem_get,
    "key_get": key_get,
    "pet_found": pet_found,
    "level_up": level_up,
    "stage_clear": stage_clear,
    "wipe": wipe,
    "runaway_appear": runaway_appear,
    "merchant_appear": merchant_appear,
}
