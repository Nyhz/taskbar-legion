"""Synthesis core (sfxr-style): oscillators with per-sample pitch (slides, vibrato, arpeggios),
envelopes, one-pole filters with moving cut-off, spectral shaping for seamless noise loops,
mixing helpers and the loudness measure shared by the build, the validator and the tests.

Everything is numpy on float64 and deterministic: randomness always comes from a generator seeded
by the sound's id (`rng_of`), never from the global state.
"""
from __future__ import annotations

import zlib
from typing import Callable

import numpy as np

#: Sample rate of the one-shot effects.
SFX_RATE = 44100
#: Sample rate of the loops (ambient and music): chiptune and noise textures need no more than
#: 16 kHz of bandwidth, and the smaller rate keeps the files small.
LOOP_RATE = 32000

Signal = np.ndarray


def seed_of(name: str) -> int:
    """Stable seed of a sound id (CRC-32, the same on every platform and Python)."""
    return zlib.crc32(name.encode("utf-8")) & 0x7FFFFFFF


def rng_of(name: str) -> np.random.Generator:
    return np.random.default_rng(seed_of(name))


def midi_hz(note: float | np.ndarray) -> np.ndarray:
    return 440.0 * 2.0 ** ((np.asarray(note, dtype=np.float64) - 69.0) / 12.0)


def length(seconds: float, sr: int) -> int:
    return max(1, int(round(seconds * sr)))


def time_axis(n: int, sr: int) -> Signal:
    return np.arange(n, dtype=np.float64) / sr


# ------------------------------------------------------------------------------ oscillators


def _phase(freq: float | Signal, n: int, sr: int, phase0: float) -> tuple[Signal, Signal]:
    f = np.broadcast_to(np.asarray(freq, dtype=np.float64), (n,))
    ph = np.empty(n, dtype=np.float64)
    ph[0] = 0.0
    if n > 1:
        ph[1:] = np.cumsum(f[:-1]) / sr
    return ph + phase0, f / sr


def _blep(t: Signal, dt: Signal) -> Signal:
    """PolyBLEP residual: rounds the corners of saw and pulse waves (less aliasing, less hiss)."""
    out = np.zeros_like(t)
    dt = np.maximum(dt, 1e-9)
    a = t < dt
    x = t[a] / dt[a]
    out[a] = x + x - x * x - 1.0
    b = t > 1.0 - dt
    x = (t[b] - 1.0) / dt[b]
    out[b] = x * x + x + x + 1.0
    return out


def osc(wave: str, freq: float | Signal, n: int, sr: int, *, duty: float = 0.5, phase0: float = 0.0, rng: np.random.Generator | None = None) -> Signal:
    """One oscillator: `sine`, `triangle`, `saw`, `pulse` (duty), `noise` (sample and hold at the
    frequency, the sfxr noise) or `white`."""
    if wave == "white":
        assert rng is not None
        return rng.uniform(-1.0, 1.0, n)
    ph, dt = _phase(freq, n, sr, phase0)
    frac = ph % 1.0
    if wave == "sine":
        return np.sin(2.0 * np.pi * ph)
    if wave == "triangle":
        return 4.0 * np.abs(((frac + 0.75) % 1.0) - 0.5) - 1.0
    if wave == "saw":
        return 2.0 * frac - 1.0 - _blep(frac, dt)
    if wave == "pulse":
        v = np.where(frac < duty, 1.0, -1.0)
        v += _blep(frac, dt)
        v -= _blep((frac - duty) % 1.0, dt)
        return v - (2.0 * duty - 1.0)
    if wave == "noise":
        assert rng is not None
        idx = np.floor(ph).astype(np.int64)
        values = rng.uniform(-1.0, 1.0, int(idx[-1]) + 2)
        return values[idx]
    raise ValueError(f"unknown wave {wave}")


def slide(n: int, sr: int, f0: float, f1: float, *, curve: str = "exp", delay: float = 0.0) -> Signal:
    """Pitch from f0 to f1 over the whole sound (after `delay` seconds)."""
    t = time_axis(n, sr)
    total = max(n / sr - delay, 1e-6)
    u = np.clip((t - delay) / total, 0.0, 1.0)
    if curve == "exp":
        return f0 * (f1 / f0) ** u
    return f0 + (f1 - f0) * u


def vibrato(freq: Signal, sr: int, rate: float, depth_semitones: float, *, delay: float = 0.0) -> Signal:
    t = time_axis(len(freq), sr)
    ramp = np.clip((t - delay) / 0.08, 0.0, 1.0)
    return freq * 2.0 ** (depth_semitones * ramp * np.sin(2.0 * np.pi * rate * t) / 12.0)


def arpeggio(n: int, sr: int, base: float, steps: list[float], step_time: float) -> Signal:
    """sfxr arpeggio: the pitch jumps by the semitone offsets `steps`, one every `step_time` s."""
    t = time_axis(n, sr)
    idx = np.minimum((t / step_time).astype(np.int64), len(steps) - 1)
    return base * 2.0 ** (np.asarray(steps, dtype=np.float64)[idx] / 12.0)


# -------------------------------------------------------------------------------- envelopes


def envelope(n: int, sr: int, *, attack: float = 0.003, decay: float = 0.2, sustain: float = 0.0, release: float = 0.01, punch: float = 0.0) -> Signal:
    """Attack (linear), decay towards `sustain` (exponential, `decay` = time to fall 40 dB), a
    release ramp over the last `release` seconds, and sfxr's «punch» (an extra boost that decays)."""
    t = time_axis(n, sr)
    att = np.clip(t / attack, 0.0, 1.0) if attack > 0 else np.ones(n)
    after = np.maximum(t - attack, 0.0)
    tau = max(decay, 1e-4) / 4.6
    body = sustain + (1.0 - sustain) * np.exp(-after / tau)
    if punch > 0:
        body = body * (1.0 + punch * np.exp(-after / 0.03))
    env = att * body
    r = min(n // 2, length(release, sr)) if release > 0 else 0
    if r > 0:
        env[-r:] *= np.linspace(1.0, 0.0, r)
    env[0] = 0.0
    env[-1] = 0.0
    return env


def fade_edges(x: Signal, sr: int, ms: float = 2.0) -> Signal:
    """Short fades so a one-shot starts and ends at zero (no click)."""
    k = min(len(x) // 2, max(1, int(sr * ms / 1000)))
    ramp = np.linspace(0.0, 1.0, k)
    y = x.copy()
    y[:k] *= ramp if y.ndim == 1 else ramp[:, None]
    y[-k:] *= ramp[::-1] if y.ndim == 1 else ramp[::-1, None]
    return y


# ---------------------------------------------------------------------------------- filters


def _recur(c: Signal, b: Signal, block: int = 64) -> Signal:
    """y[n] = c[n]·y[n-1] + b[n], solved block by block with cumulative products (vectorised)."""
    n = len(b)
    y = np.empty(n, dtype=np.float64)
    prev = 0.0
    for s in range(0, n, block):
        cc = c[s : s + block]
        p = np.cumprod(cc)
        y[s : s + block] = p * (prev + np.cumsum(b[s : s + block] / p))
        prev = y[s + len(cc) - 1]
    return y


def lowpass(x: Signal, cutoff: float | Signal, sr: int) -> Signal:
    """One-pole low-pass (6 dB/octave); the cut-off may move sample by sample (filter sweeps)."""
    fc = np.broadcast_to(np.asarray(cutoff, dtype=np.float64), x.shape)
    a = np.clip(1.0 - np.exp(-2.0 * np.pi * fc / sr), 1e-5, 0.95)
    return _recur(1.0 - a, a * x)


def highpass(x: Signal, cutoff: float | Signal, sr: int) -> Signal:
    return x - lowpass(x, cutoff, sr)


def lowpass2(x: Signal, cutoff: float | Signal, sr: int) -> Signal:
    return lowpass(lowpass(x, cutoff, sr), cutoff, sr)


def bandpass(x: Signal, low: float | Signal, high: float | Signal, sr: int) -> Signal:
    return lowpass2(highpass(highpass(x, low, sr), low, sr), high, sr)


def spectral(x: Signal, sr: int, gain: Callable[[Signal], Signal]) -> Signal:
    """Circular (FFT) filter: `gain(freqs)` is the magnitude response. The result wraps around, so
    a loop filtered this way stays seamless."""
    spec = np.fft.rfft(x)
    freqs = np.fft.rfftfreq(len(x), 1.0 / sr)
    return np.fft.irfft(spec * gain(freqs), len(x))


def band_gain(low: float, high: float, order: int = 2) -> Callable[[Signal], Signal]:
    """Butterworth-like band-pass magnitude (either edge may be 0 / None-like for a pure LP/HP)."""

    def g(f: Signal) -> Signal:
        out = np.ones_like(f)
        if high > 0:
            out = out / np.sqrt(1.0 + (f / high) ** (2 * order))
        if low > 0:
            ratio = np.divide(low, f, out=np.full_like(f, 1e9), where=f > 0)
            out = out / np.sqrt(1.0 + ratio ** (2 * order))
        return out

    return g


def colored_noise(n: int, sr: int, rng: np.random.Generator, low: float, high: float, *, tilt: float = 0.0, order: int = 2) -> Signal:
    """Seamless (circular) band-limited noise with a spectral tilt in dB/octave (−3 pink, −6
    brown), normalised to unit RMS."""
    white = rng.standard_normal(n)
    base = band_gain(low, high, order)

    def g(f: Signal) -> Signal:
        ref = max(low, 100.0)
        octaves = np.log2(np.maximum(f, 1.0) / ref)
        return base(f) * 10.0 ** (tilt * octaves / 20.0)

    y = spectral(white, sr, g)
    return y / (np.sqrt(np.mean(y**2)) + 1e-12)


# ----------------------------------------------------------------------------------- mixing


def place(buf: Signal, sig: Signal, start: int, *, circular: bool = False, gain: float = 1.0) -> None:
    """Adds `sig` into `buf` at `start`; a circular buffer wraps the tail to the beginning."""
    n = len(buf)
    if circular:
        idx = (start + np.arange(len(sig))) % n
        np.add.at(buf, idx, sig * gain)
        return
    end = min(n, start + len(sig))
    if end > start:
        buf[start:end] += sig[: end - start] * gain


def mix(total: float, sr: int, *layers: tuple[float, Signal, float]) -> Signal:
    """Mixes (offset seconds, signal, gain dB) layers into one sound of `total` seconds."""
    buf = np.zeros(length(total, sr))
    for offset, sig, gain_db in layers:
        place(buf, sig, int(round(offset * sr)), gain=10.0 ** (gain_db / 20.0))
    return buf


def pan(x: Signal, position: float) -> Signal:
    """Constant-power pan (−1 left … 1 right) of a mono signal into (n, 2)."""
    a = (position + 1.0) * np.pi / 4.0
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1)


def circular_delay(x: Signal, sr: int, seconds: float, feedback: float, taps: int = 4) -> Signal:
    """Echo inside a loop: the repeats wrap around, so the loop stays seamless."""
    d = int(round(seconds * sr))
    y = x.copy()
    g = 1.0
    for k in range(1, taps + 1):
        g *= feedback
        y = y + g * np.roll(x, k * d, axis=0)
    return y


# --------------------------------------------------------------------------------- loudness

#: Loudness measure used for normalisation and validation: RMS in dB of 50 ms windows after a
#: 100 Hz high-pass (a rough stand-in for K-weighting), gated like EBU R 128 (absolute −70 dB,
#: then relative −10 dB below the ungated mean). Close to LUFS for these signals.
LOUDNESS_WINDOW_S = 0.05


def fast_len(n: int) -> int:
    """The smallest length ≥ n whose prime factors are 2, 3 and 5 (a fast FFT size)."""
    best = 1 << max(0, (n - 1).bit_length())
    p5 = 1
    while p5 < best:
        p35 = p5
        while p35 < best:
            p = p35
            while p < n:
                p *= 2
            best = min(best, p)
            p35 *= 3
        p5 *= 5
    return best


def _highpassed(x: Signal, sr: int, gain: Callable[[Signal], Signal]) -> Signal:
    """The measure's high-pass, on a zero-padded fast FFT size (long pieces of arbitrary
    length made the circular FFT slow; the padding changes the measure by far under 0.1 dB)."""
    size = fast_len(len(x))
    spec = np.fft.rfft(x, size)
    freqs = np.fft.rfftfreq(size, 1.0 / sr)
    return np.fft.irfft(spec * gain(freqs), size)[: len(x)]


def loudness_db(x: Signal, sr: int) -> float:
    channels = [x] if x.ndim == 1 else [x[:, c] for c in range(x.shape[1])]
    hp = band_gain(100.0, 0.0, 1)
    power = sum(_highpassed(c, sr, hp) ** 2 for c in channels) / len(channels)
    w = max(1, int(sr * LOUDNESS_WINDOW_S))
    frames = len(power) // w
    if frames == 0:
        ms = np.array([np.mean(power)])
    else:
        ms = power[: frames * w].reshape(frames, w).mean(axis=1)
    ms = ms[ms > 10 ** (-70 / 10)]
    if len(ms) == 0:
        return -120.0
    gate = np.mean(ms) * 10 ** (-10 / 10)
    kept = ms[ms >= gate]
    return float(10.0 * np.log10(np.mean(kept)))


def gated_rms_db(x: Signal, sr: int) -> float:
    """The loudness gate without the high-pass (cheap; used to balance the buses of a mix)."""
    power = x**2 if x.ndim == 1 else np.mean(x**2, axis=1)
    w = max(1, int(sr * LOUDNESS_WINDOW_S))
    frames = max(1, len(power) // w)
    ms = power[: frames * w].reshape(frames, -1).mean(axis=1)
    ms = ms[ms > 1e-12]
    if len(ms) == 0:
        return -120.0
    kept = ms[ms >= np.mean(ms) * 0.1]
    return float(10.0 * np.log10(np.mean(kept)))


def peak_db(x: Signal) -> float:
    p = float(np.max(np.abs(x)))
    return -120.0 if p <= 0 else 20.0 * np.log10(p)


def normalise(x: Signal, sr: int, target_db: float, peak_limit_db: float) -> Signal:
    """Scales to the target loudness; never lets the peak pass the limit (the sound is then a bit
    quieter than the target, and the manifest says by how much). The gate depends on the level, so
    the measure is repeated until it settles."""
    limit = 10 ** (peak_limit_db / 20.0)
    y = x
    for _ in range(4):
        now = loudness_db(y, sr)
        if abs(now - target_db) < 0.05:
            break
        gain = 10 ** ((target_db - now) / 20.0)
        peak = float(np.max(np.abs(y))) * gain
        if peak > limit:
            gain *= limit / peak
        y = y * gain
        if peak >= limit:
            break
    return y
