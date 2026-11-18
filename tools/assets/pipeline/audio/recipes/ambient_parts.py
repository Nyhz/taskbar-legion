"""The pieces of the ambient beds: the whisper-quiet constant bed, circular placement, and every world's details
(critters, water, wind, bells, fire, storm). Every detail is mono with a soft start and end; the beds pan it.

User, after the third sample: «el sonido de fondo constante debe ser extremadamente sutil y debe notarse el resto de
soniditos que adornan» — so the bed is a breath, and the details carry the place.
"""
from __future__ import annotations

import numpy as np

from ..kit import GLASS, PLATE, arch, band, clicks, normalise_peak, note, partials, smooth_env, swept_noise
from ..synth import colored_noise, length, mix, osc, pan, place, time_axis
from .common import BELL, RATE, Rng, blip, dark, jit, knock, pad, puff, rumble, thump, tone, verb, whoosh, zap

LOOP_S = 24.0


# ── The bed and placement ──


def swell(n: int, cycles: int, depth: float, phase: float) -> np.ndarray:
    """A slow loudness swell with a whole number of cycles in the loop (so it stays seamless)."""
    t = np.arange(n) / n
    return (1.0 - depth) + depth * (0.5 + 0.5 * np.sin(2 * np.pi * cycles * t + phase))


def bed(rng: Rng, low: float, high: float, *, tilt: float, cycles: int, depth: float, gain: float, phases: tuple[float, float] = (0.0, 1.3)) -> np.ndarray:
    """The constant bed: seamless stereo coloured noise, slowly swelling, barely there."""
    n = length(LOOP_S, RATE)
    return np.stack([colored_noise(n, RATE, rng, low, high, tilt=tilt, order=4) * swell(n, cycles, depth, p) for p in phases], axis=1) * gain


def scatter(bed_: np.ndarray, call: np.ndarray, at_s: float, gain: float) -> None:
    """Adds a stereo `call` into the circular bed at `at_s` seconds (wrapping past the end: seamless)."""
    for c in range(2):
        place(bed_[:, c], call[:, c] * gain, int(at_s * RATE) % len(bed_), circular=True)


def spread(rng: Rng, count: int, jitter: float = 0.7) -> list[float]:
    """`count` moments spread over the loop, evenly but loosely (so details neither clump nor tick like a clock)."""
    off = float(rng.uniform(0, LOOP_S))
    step = LOOP_S / count
    return [(off + (i + float(rng.uniform(-jitter / 2, jitter / 2))) * step) % LOOP_S for i in range(count)]


def sprinkle(out: np.ndarray, rng: Rng, make, count: int, gain: tuple[float, float], *, width: float = 0.8, jitter: float = 0.7) -> None:  # noqa: ANN001 - callable
    """Places `count` takes of a detail over the loop, each with its own gain and pan."""
    for at in spread(rng, count, jitter):
        call = make(rng)
        scatter(out, pan(call, float(rng.uniform(-width, width))), at, float(rng.uniform(*gain)))


# ── W1 (moved verbatim from the approved meadow) ──


# Softened 2026-11-18 (user: the meadow's bird was «súper estridente»): the birds sang pure sines at 2.4–3.7 kHz and
# the crickets at 4.3 kHz — right where the ear is sharpest, heard all day. Now every call sits lower, starts and ends
# softly and goes through a dark top; `harsh.py` measures the beds so nothing piercing comes back.


def cricket(rng: Rng) -> np.ndarray:
    """One chirp: three soft pulses of a mid-high tone, far off in the grass."""
    f = 2900.0 * jit(rng, 0.03)
    m = length(0.018, RATE)
    p = osc("sine", f, m, RATE) * np.hanning(m)
    return dark(mix(0.1, RATE, (0.0, p, 0.0), (0.03, p, -1.5), (0.06, p, -3.0)), 3200)


def bird(rng: Rng, low: float = 1250.0, high: float = 1750.0) -> np.ndarray:
    """One round note of a small songbird: a soft rise and fall with a little flutter, no sharp edge."""
    n = length(float(rng.uniform(0.11, 0.16)), RATE)
    a = float(rng.uniform(low, high))
    c = arch(n, a * 0.92, a * 1.12, a * 0.97, at=0.35)
    c = c * (1.0 + 0.012 * np.sin(2 * np.pi * float(rng.uniform(22, 30)) * time_axis(n, RATE)))
    x = osc("sine", c, n, RATE) + 0.08 * osc("sine", c * 2, n, RATE)
    return dark(x * smooth_env(n, RATE, 0.03, 0.06), 2400)


def cricket_song(rng: Rng) -> np.ndarray:
    """A cricket singing for a couple of seconds: a run of chirps, then it stops."""
    count = int(rng.integers(6, 14))
    gap = float(rng.uniform(0.16, 0.24))
    return mix(count * gap + 0.1, RATE, *[(i * gap, cricket(rng), float(rng.uniform(-3, 0))) for i in range(count)])


def tweet(rng: Rng) -> np.ndarray:
    """A small bird: one to three round notes, each a little lower (a gentle warble, not a chirp)."""
    notes = int(rng.integers(1, 4))
    top = float(rng.uniform(1500, 1800))
    calls = [(0.17 * i, bird(rng, top * 0.9**i * 0.85, top * 0.9**i), -2.0 * i) for i in range(notes)]
    return mix(0.17 * notes + 0.15, RATE, *calls)


def whistle(rng: Rng) -> np.ndarray:
    """A two-note whistle, the second lower (a far blackbird)."""
    j = jit(rng, 0.05)
    n1, n2 = length(0.2, RATE), length(0.28, RATE)
    hi = osc("sine", np.geomspace(1450 * j, 1580 * j, n1), n1, RATE) * smooth_env(n1, RATE, 0.05, 0.1)
    lo = osc("sine", np.geomspace(1220 * j, 1120 * j, n2), n2, RATE) * smooth_env(n2, RATE, 0.05, 0.15)
    return dark(mix(0.6, RATE, (0.0, hi, 0.0), (0.24, lo, -2.0)), 2200)


def rustle(rng: Rng, dur: float = 1.2) -> np.ndarray:
    """Grass or leaves stirred by a breath of wind: a short soft swell of darkened noise."""
    n = length(dur, RATE)
    return dark(band(rng.standard_normal(n), RATE, 400, 2400, order=2), 2600) * smooth_env(n, RATE, dur * 0.45, dur * 0.5)


def gust(rng: Rng, dur: float) -> np.ndarray:
    """A gust of storm wind: a swell of low noise that rises and falls."""
    n = length(dur, RATE)
    return dark(band(rng.standard_normal(n), RATE, 120, 900, order=2), 1000) * smooth_env(n, RATE, dur * 0.4, dur * 0.55)


def thunder(rng: Rng) -> np.ndarray:
    """A far roll of thunder: a low rumble that swells in a couple of bursts and fades."""
    m = length(3.2, RATE)
    roll = band(rng.standard_normal(m), RATE, 25, 170) * smooth_env(m, RATE, 0.25, 2.6)
    roll *= 0.7 + 0.3 * np.sin(2 * np.pi * float(rng.uniform(1.2, 2.2)) * time_axis(m, RATE)) ** 2
    return roll


def drip(rng: Rng) -> np.ndarray:
    """A heavy drop landing: a tiny low plink."""
    return blip(0.09, 900 * jit(rng, 0.15), 520 * jit(rng, 0.1), 0.06)


def windmill(rng: Rng) -> np.ndarray:
    """A windmill's sails turning in the breeze: a slow wooden creak at each pass and the soft whoosh of a sail."""
    passes = int(rng.integers(2, 4))
    gap = float(rng.uniform(1.4, 1.9))
    layers = []
    for i in range(passes):
        layers.append((i * gap, creak(rng, float(rng.uniform(0.5, 0.8))), -1.0 * i))
        layers.append((i * gap + 0.5, normalise_peak(dark(band(rng.standard_normal(length(0.9, RATE)), RATE, 200, 900, order=2), 1000)) * smooth_env(length(0.9, RATE), RATE, 0.35, 0.45), -9.0 - i))
    return normalise_peak(mix(passes * gap + 1.0, RATE, *layers))


# ── Forest ──


def woodpecker(rng: Rng) -> np.ndarray:
    """A far woodpecker drumming: a quick roll of small wooden taps."""
    taps = int(rng.integers(9, 16))
    rate = float(rng.uniform(14, 19))
    f = float(rng.uniform(780, 980))
    tap = partials(0.03, RATE, f, [(1.0, 1.0, 0.02), (2.3, 0.4, 0.01)], attack=0.0015)
    x = mix(taps / rate + 0.05, RATE, *[(i / rate, tap, -0.4 * i - (3.0 if i == 0 else 0.0)) for i in range(taps)])
    return normalise_peak(dark(x, 2600))


def hoot(f: float, dur: float = 0.34) -> np.ndarray:
    n = length(dur, RATE)
    c = arch(n, f * 0.95, f, f * 0.9, at=0.3)
    return (osc("sine", c, n, RATE) + 0.08 * osc("sine", c * 2, n, RATE)) * smooth_env(n, RATE, 0.06, 0.2)


def owl(rng: Rng, base: float = 390.0) -> np.ndarray:
    """A soft owl: hoo… hoo-hoo-hoo."""
    f = base * jit(rng, 0.05)
    return normalise_peak(mix(1.5, RATE, (0.0, hoot(f, 0.45), 0.0), (0.7, hoot(f * 0.97), -2.0), (0.95, hoot(f * 0.97), -2.5), (1.2, hoot(f * 0.94), -3.5)))


def creak(rng: Rng, dur: float | None = None) -> np.ndarray:
    """A tree trunk creaking: a low rough saw in a wooden band."""
    d = float(rng.uniform(0.8, 1.4)) if dur is None else dur
    n = length(d, RATE)
    t = time_axis(n, RATE)
    f = float(rng.uniform(60, 90)) * (1.0 + 0.08 * np.sin(2 * np.pi * float(rng.uniform(0.6, 1.4)) * t))
    x = band(osc("saw", f, n, RATE), RATE, 180, 900, order=2) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * float(rng.uniform(16, 26)) * t)))
    return normalise_peak(dark(x, 1000)) * smooth_env(n, RATE, d * 0.35, d * 0.45)


def snap(rng: Rng) -> np.ndarray:
    """A branch breaking somewhere in the dark: two soft low knocks."""
    f = float(rng.uniform(300, 420))
    return normalise_peak(mix(0.2, RATE, (0.0, knock(f, 0.1, 0.6), 0.0), (0.05, knock(f * 0.8, 0.1, 0.6), -4.0)))


# ── Marsh ──


def croak(f: float, rate: float, dur: float = 0.18) -> np.ndarray:
    n = length(dur, RATE)
    t = time_axis(n, RATE)
    x = band(osc("saw", f, n, RATE), RATE, 150, 1500, order=2) * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t)) ** 4
    return dark(x, 1300) * smooth_env(n, RATE, 0.02, 0.06)


def frogs(rng: Rng, base: float = 170.0) -> np.ndarray:
    """A frog: a few ribbits, then it stops."""
    f = base * jit(rng, 0.12)
    rate = float(rng.uniform(24, 34))
    count = int(rng.integers(2, 6))
    gap = float(rng.uniform(0.45, 0.8))
    layers = []
    for i in range(count):
        layers += [(i * gap, croak(f, rate), 0.0), (i * gap + 0.21, croak(f * 0.96, rate, 0.14), -2.0)]
    return normalise_peak(mix(count * gap + 0.4, RATE, *layers))


def lap(rng: Rng) -> np.ndarray:
    """Water lapping at the stilts: two or three soft low swells."""
    count = int(rng.integers(2, 4))
    return normalise_peak(mix(0.5 * count + 0.4, RATE, *[(0.45 * i, puff(rng, 0.55, 150, 900, 1000, attack=0.2, release=0.3), -2.5 * i) for i in range(count)]))


def plop(rng: Rng) -> np.ndarray:
    """Something small falling into the water: a plop and a bubble."""
    f = float(rng.uniform(650, 950))
    return normalise_peak(mix(0.14, RATE, (0.0, blip(0.07, f, f * 0.38, 0.05, attack=0.003), 0.0), (0.045, blip(0.05, 900, 1300, 0.04), -12.0)))


# ── Canyon ──


def wind_whistle(rng: Rng, f0: float | None = None, f1: float | None = None, dur: float | None = None) -> np.ndarray:
    """Wind whistling through rock: a narrow breathy band gliding, with a faint tone in it."""
    d = float(rng.uniform(2.0, 3.4)) if dur is None else dur
    a = float(rng.uniform(550, 800)) if f0 is None else f0
    b = a * float(rng.uniform(1.15, 1.45)) if f1 is None else f1
    if rng.uniform() < 0.5:
        a, b = b, a
    n = length(d, RATE)
    air = swept_noise(d, RATE, rng, a, b, width=1.12, attack=d * 0.4, release=d * 0.5)
    tone_ = osc("sine", np.geomspace(a, b, n), n, RATE) * smooth_env(n, RATE, d * 0.45, d * 0.45)
    return normalise_peak(dark(air + 0.25 * tone_, max(a, b) * 1.6))


def pebbles(rng: Rng) -> np.ndarray:
    """A few pebbles rattling down the rock: small knocks bouncing closer together."""
    count = int(rng.integers(3, 8))
    at, gap, layers = 0.0, float(rng.uniform(0.1, 0.16)), []
    for i in range(count):
        layers.append((at, knock(float(rng.uniform(750, 1250)), 0.06, 0.3), -1.2 * i))  # was 1.3–2.2 kHz: clicky
        at += gap
        gap *= 0.72
    return normalise_peak(dark(mix(at + 0.08, RATE, *layers), 2000))


def hawk(rng: Rng) -> np.ndarray:
    """A far hawk: one or two long falling cries."""
    def cry(j: float) -> np.ndarray:
        n = length(0.6, RATE)
        c = arch(n, 1050 * j, 1400 * j, 900 * j, at=0.22)
        c = c * (1.0 + 0.01 * np.sin(2 * np.pi * 12.0 * time_axis(n, RATE)))
        breath = band(rng.standard_normal(n), RATE, 800, 1800, order=2) * 0.15
        return (osc("sine", c, n, RATE) + breath) * smooth_env(n, RATE, 0.08, 0.32)

    j = jit(rng, 0.05)
    calls = [(0.0, cry(j), 0.0)] + ([(0.8, cry(j * 0.97), -3.0)] if rng.uniform() < 0.5 else [])
    return normalise_peak(dark(mix(1.5, RATE, *calls), 1900))


# ── Monastery ──


def far_bell(rng: Rng, m: float = 62.0) -> np.ndarray:
    """A bell far down the valley: soft strike, long hum."""
    return normalise_peak(dark(partials(4.0, RATE, note(m) * jit(rng, 0.01), BELL, attack=0.012), 2200))


def chimes(rng: Rng, notes: tuple[float, ...] = (74, 76, 79, 81, 83, 86)) -> np.ndarray:
    """Wind chimes stirred by a breeze: a few glass tones, clustered."""
    count = int(rng.integers(4, 9))
    times = np.sort(rng.uniform(0, 1.6, count))
    layers = [(float(t), tone(1.3, note(float(rng.choice(notes))), GLASS, 0.6, attack=0.006), float(rng.uniform(-6, 0))) for t in times]
    return normalise_peak(dark(mix(3.0, RATE, *layers), 2800))


# ── Coast ──


def wave(rng: Rng, dur: float | None = None, low: float = 120.0) -> np.ndarray:
    """A soft wave: a low swell, a little foam at its crest, then the draw back."""
    d = float(rng.uniform(3.4, 4.6)) if dur is None else dur
    body = rumble(rng, d, low, 1000, attack=d * 0.35, release=d * 0.6)
    n = length(d * 0.6, RATE)
    foam = dark(band(rng.standard_normal(n), RATE, 500, 2200, order=2), 2600) * smooth_env(n, RATE, d * 0.15, d * 0.4)
    return normalise_peak(mix(d, RATE, (0.0, body, 0.0), (d * 0.25, normalise_peak(foam), -9.0)))


def gull(rng: Rng) -> np.ndarray:
    """A far gull: two or three falling calls."""
    def call(j: float) -> np.ndarray:
        n = length(0.28, RATE)
        c = arch(n, 900 * j, 1350 * j, 800 * j, at=0.3)
        x = osc("sine", c, n, RATE) + 0.3 * osc("sine", c * 2, n, RATE) + 0.1 * osc("sine", c * 3, n, RATE)
        return x * smooth_env(n, RATE, 0.03, 0.15)

    j = jit(rng, 0.06)
    count = int(rng.integers(2, 4))
    return normalise_peak(dark(mix(0.34 * count + 0.2, RATE, *[(0.34 * i, call(j * (1 - 0.03 * i)), -2.0 * i) for i in range(count)]), 2800))


# ── Caverns ──


def cave_drip(rng: Rng, f: float | None = None) -> np.ndarray:
    """A drop in a cave: a plink and its echo."""
    a = float(rng.uniform(1100, 1500)) if f is None else f
    x = blip(0.1, a, a * 0.6, 0.07, attack=0.003)
    return normalise_peak(verb(x, rng, seconds=1.4, wet=0.5, tail=1.0, damping=0.7))


def crystal(rng: Rng) -> np.ndarray:
    """A crystal ringing on its own: one glass tone, sometimes with its fifth."""
    m = float(rng.choice([72, 74, 76, 79]))
    layers = [(0.0, tone(1.3, note(m), GLASS, 0.8, attack=0.006), 0.0)]
    if rng.uniform() < 0.5:
        layers.append((0.18, tone(1.1, note(m + 7), GLASS, 0.6, attack=0.006), -5.0))
    return normalise_peak(verb(dark(mix(1.5, RATE, *layers), 2800), rng, seconds=1.0, wet=0.35, tail=0.6))


def hum(rng: Rng, lo: float = 45.0) -> np.ndarray:
    """A low hum swelling out of the rock (two beating tones)."""
    d = float(rng.uniform(3.0, 4.2))
    j = jit(rng, 0.03)
    return normalise_peak(pad(d, [note(lo) * j, note(lo + 7) * j], attack=d * 0.4, release=d * 0.5, detune=0.006, harm=0.3))


# ── Forges ──


def embers(rng: Rng) -> np.ndarray:
    """Embers crackling: a short run of tiny soft crackles."""
    d = float(rng.uniform(0.6, 1.4))
    n = length(d, RATE)
    x = dark(clicks(d, RATE, rng, float(rng.uniform(16, 28)), low=500, high=2400, decay=0.0025), 2800)
    return normalise_peak(x) * smooth_env(n, RATE, 0.1, 0.3)


def hammer(rng: Rng, f: float | None = None, strikes: int = 3, gap: float = 0.75) -> np.ndarray:
    """A far smith at an anvil: a few clinks with a little room."""
    a = float(rng.uniform(470, 560)) if f is None else f
    layers = [(gap * i, tone(0.6, a * jit(rng, 0.01), PLATE, 0.35, attack=0.002), -2.0 if i < strikes - 1 else 0.0) for i in range(strikes)]
    return normalise_peak(verb(dark(mix(gap * strikes + 0.4, RATE, *layers), 3000), rng, seconds=0.9, wet=0.35, tail=0.5))


def furnace(rng: Rng, low: float = 50.0) -> np.ndarray:
    """A furnace breathing: a deep slow roar."""
    d = float(rng.uniform(2.5, 3.5))
    return rumble(rng, d, low, 320, attack=d * 0.4, release=d * 0.5)


def lava(rng: Rng) -> np.ndarray:
    """Molten rock bubbling: one or two low bloops."""
    f = float(rng.uniform(140, 190))
    return normalise_peak(mix(0.4, RATE, (0.0, blip(0.12, f, f * 1.8, 0.09, attack=0.01), 0.0), (0.18, blip(0.1, f * 1.1, f * 1.9, 0.08, attack=0.01), -3.0)))


# ── Citadel ──


def flag(rng: Rng, rate: tuple[float, float] = (5.0, 8.0)) -> np.ndarray:
    """A banner flapping far off: a fluttering low cloth noise."""
    d = float(rng.uniform(1.2, 2.2))
    n = length(d, RATE)
    t = time_axis(n, RATE)
    r = float(rng.uniform(*rate))
    am = 0.3 + 0.7 * np.abs(np.sin(np.pi * r * t + 0.4 * np.sin(2 * np.pi * 0.9 * t))) ** 3
    x = dark(band(rng.standard_normal(n), RATE, 150, 1000, order=2), 1100) * am
    return normalise_peak(x) * smooth_env(n, RATE, d * 0.3, d * 0.45)


def airy_chime(rng: Rng) -> np.ndarray:
    """Two glass tones hanging in thin air."""
    a, b = (float(v) for v in rng.choice([72, 76, 79, 84], 2, replace=False))
    x = mix(2.0, RATE, (0.0, tone(1.6, note(a), GLASS, 1.0, attack=0.008), 0.0), (0.3, tone(1.5, note(b), GLASS, 0.9, attack=0.008), -3.0))
    return normalise_peak(verb(dark(x, 2800), rng, seconds=1.2, wet=0.35, tail=0.6))


def high_wind(rng: Rng) -> np.ndarray:
    """High wind sweeping past the walls."""
    d = float(rng.uniform(2.5, 3.5))
    a, b = (350.0, 900.0) if rng.uniform() < 0.5 else (900.0, 350.0)
    return normalise_peak(whoosh(rng, d, a, b, top=1600, width=1.6, attack=d * 0.4, release=d * 0.5))


# ── The Rift ──


def rift_whoosh(rng: Rng) -> np.ndarray:
    """A slow otherworldly whoosh, slightly phasing."""
    d = float(rng.uniform(1.6, 2.4))
    a, b = float(rng.uniform(250, 600)), float(rng.uniform(700, 1300))
    if rng.uniform() < 0.5:
        a, b = b, a
    x = whoosh(rng, d, a, b, top=1700, width=1.4, attack=d * 0.5, release=d * 0.45)
    return normalise_peak(x * (0.7 + 0.3 * np.sin(2 * np.pi * 3.0 * time_axis(len(x), RATE))))


def rift_tone(rng: Rng, lo: float = 55.0, hi: float = 67.0) -> np.ndarray:
    """A strange tone sliding down a few semitones, two voices beating, a fifth above."""
    d = 2.5
    n = length(d, RATE)
    t = time_axis(n, RATE)
    base = note(float(rng.uniform(lo, hi)))
    f = base * 2 ** (-float(rng.uniform(2, 6)) / 12 * np.clip(t / d, 0, 1)) * (1 + 0.006 * np.sin(2 * np.pi * 4.5 * t))
    x = osc("sine", f, n, RATE) + osc("sine", f * 1.006, n, RATE) + 0.3 * osc("sine", f * 1.5, n, RATE)
    return normalise_peak(x * smooth_env(n, RATE, 0.9, 1.2))


def rift_shimmer(rng: Rng) -> np.ndarray:
    """Glass heard backwards: a shimmer that swells and stops."""
    m = float(rng.choice([74, 79, 81, 86]))
    g = mix(1.0, RATE, (0.0, tone(1.0, note(m), GLASS, 0.6), 0.0), (0.0, tone(1.0, note(m + 5), GLASS, 0.5), -4.0))[::-1].copy()
    return normalise_peak(dark(g * smooth_env(len(g), RATE, 0.02, 0.06), 3000))


def rift_crack(rng: Rng) -> np.ndarray:
    """Rift lightning, softened: a falling zap and a low roll."""
    z = dark(zap(0.35, float(rng.uniform(500, 700)), 110, rate=30.0, depth=0.05, attack=0.01), 1800)
    roll = rumble(rng, 1.6, 30, 180, attack=0.05, release=1.3)
    return normalise_peak(mix(1.7, RATE, (0.0, z, -4.0), (0.05, roll, 0.0)))


# ── Storm and dark (Torment) ──


def rain_sheet(rng: Rng) -> np.ndarray:
    """A sheet of rain sweeping past: a dark wash with a soft patter in it."""
    d = float(rng.uniform(3.0, 4.5))
    n = length(d, RATE)
    wash = normalise_peak(dark(band(rng.standard_normal(n), RATE, 300, 1800, order=2), 2000))
    patter = normalise_peak(dark(clicks(d, RATE, rng, 55, low=400, high=1800, decay=0.002), 2200))
    return normalise_peak((wash + 0.6 * patter) * smooth_env(n, RATE, d * 0.35, d * 0.45))


def exhale(rng: Rng) -> np.ndarray:
    """Something large breathing out in the dark (the eyes)."""
    d = float(rng.uniform(1.0, 1.5))
    return normalise_peak(puff(rng, d, 90, 500, 600, attack=d * 0.45, release=d * 0.5))


def throb(rng: Rng) -> np.ndarray:
    """A low pulse in the rock: a deep tone beating slowly."""
    d = float(rng.uniform(2.6, 3.4))
    n = length(d, RATE)
    t = time_axis(n, RATE)
    f = note(40) * jit(rng, 0.03)
    x = (osc("sine", f, n, RATE) + 0.45 * osc("sine", 2 * f, n, RATE)) * (0.5 + 0.5 * np.sin(2 * np.pi * 1.1 * t - np.pi / 2)) ** 2
    return normalise_peak(x * smooth_env(n, RATE, d * 0.3, d * 0.4))


def spore_puff(rng: Rng) -> np.ndarray:
    """A fungus letting go of its spores: a soft puff and a little bubble."""
    return normalise_peak(mix(0.35, RATE, (0.0, puff(rng, 0.28, 250, 1000, 1200, attack=0.02, release=0.2), 0.0), (0.03, blip(0.1, 220, 300, 0.08, attack=0.008), -8.0)))


def forge_boom(rng: Rng) -> np.ndarray:
    """A great hammer far off, heavy and slow."""
    x = mix(1.2, RATE, (0.0, thump(95, 45, 0.25), 0.0), (0.0, tone(0.9, float(rng.uniform(260, 320)), PLATE, 0.5, attack=0.003), -6.0))
    return normalise_peak(verb(dark(x, 2400), rng, seconds=1.2, wet=0.4, tail=0.6))


def flag_snap(rng: Rng) -> np.ndarray:
    """A banner whipped by the storm: fast flutter and a couple of soft snaps."""
    f = flag(rng, rate=(9.0, 13.0))
    snaps = [(float(rng.uniform(0.1, 0.9)), puff(rng, 0.05, 300, 1300, 1500, attack=0.004, release=0.04), 0.0) for _ in range(2)]
    return normalise_peak(mix(len(f) / RATE, RATE, (0.0, f, 0.0), *snaps))


def dark_chime(rng: Rng) -> np.ndarray:
    """A low glass chime in the storm, slightly out of true."""
    m = float(rng.choice([55, 58, 62]))
    x = mix(2.0, RATE, (0.0, tone(1.8, note(m), GLASS, 1.2, attack=0.006), 0.0), (0.0, tone(1.8, note(m) * 1.012, GLASS, 1.0, attack=0.006), -4.0))
    return normalise_peak(verb(dark(x, 2000), rng, seconds=1.2, wet=0.35, tail=0.6))
