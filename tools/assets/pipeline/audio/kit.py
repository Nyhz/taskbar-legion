"""Soft instruments for the second audio pass: plucked strings, FM bells, formant voices,
breathy noise, a convolution reverb and a gentle saturator.

The first pass was built from sfxr blocks (pulse waves, sample-and-hold noise, hard
«punch»): fine for a blip, harsh for a sound heard a thousand times an hour and for ambient
music. Everything here starts softly (attacks of a few milliseconds at least), keeps its energy
under 6–7 kHz, and gets its shine from partials and reverb instead of square edges.

All functions are pure numpy on float64 and take their randomness from the caller's generator.
"""
from __future__ import annotations

import numpy as np

from .synth import Signal, envelope, length, lowpass, midi_hz, osc, time_axis

# ------------------------------------------------------------------------------ helpers


def db(gain_db: float) -> float:
    return 10.0 ** (gain_db / 20.0)


def fit(x: Signal, n: int) -> Signal:
    """Cuts or pads a signal to n samples."""
    if len(x) >= n:
        return x[:n]
    return np.concatenate([x, np.zeros(n - len(x))])


def normalise_peak(x: Signal, peak: float = 1.0) -> Signal:
    p = float(np.max(np.abs(x)))
    return x if p <= 0 else x * (peak / p)


def smooth_env(n: int, sr: int, attack: float, release: float, *, hold: float | None = None, curve: float = 2.0) -> Signal:
    """A rounded envelope: raised-cosine attack, a hold, and an exponential-ish release to zero."""
    a = max(1, length(attack, sr))
    r = max(1, length(release, sr))
    h = n - a - r if hold is None else length(hold, sr)
    h = max(0, min(h, n - a - r))
    rise = 0.5 - 0.5 * np.cos(np.linspace(0.0, np.pi, a))
    fall = np.linspace(1.0, 0.0, r) ** curve
    env = np.concatenate([rise, np.ones(h), fall])
    return fit(env, n)


def exp_decay(n: int, sr: int, seconds: float, *, attack: float = 0.004) -> Signal:
    """A soft attack then an exponential fall reaching −60 dB after `seconds`."""
    t = time_axis(n, sr)
    a = max(attack, 1e-4)
    rise = np.clip(t / a, 0.0, 1.0)
    rise = 0.5 - 0.5 * np.cos(np.pi * rise)
    return rise * np.exp(-6.9 * np.maximum(t - a, 0.0) / max(seconds, 1e-3))


def saturate(x: Signal, drive: float = 1.5) -> Signal:
    """Gentle tape-like saturation (odd harmonics, no hard clip)."""
    return np.tanh(drive * x) / np.tanh(drive)


# ------------------------------------------------------------------------- spectral filters


def _padded_gain(x: Signal, sr: int, gain_of_freq) -> Signal:  # noqa: ANN001 - callable
    """Linear (non-circular) FFT filter: zero-padded so nothing wraps into the start."""
    n = len(x)
    size = 1 << int(np.ceil(np.log2(n + sr // 10 + 1)))
    spec = np.fft.rfft(x, size)
    freqs = np.fft.rfftfreq(size, 1.0 / sr)
    return np.fft.irfft(spec * gain_of_freq(freqs), size)[:n]


def band(x: Signal, sr: int, low: float, high: float, order: int = 2) -> Signal:
    """Butterworth-like band magnitude (low=0 or high=0 leaves that edge open)."""

    def g(f: Signal) -> Signal:
        out = np.ones_like(f)
        if high > 0:
            out = out / np.sqrt(1.0 + (f / high) ** (2 * order))
        if low > 0:
            ratio = np.divide(low, f, out=np.full_like(f, 1e9), where=f > 0)
            out = out / np.sqrt(1.0 + ratio ** (2 * order))
        return out

    return _padded_gain(x, sr, g)


#: Vowel formants (Hz) of a neutral adult voice, shifted by `size` for small or large creatures.
VOWELS: dict[str, tuple[float, float, float]] = {
    "a": (780.0, 1200.0, 2600.0),
    "o": (480.0, 850.0, 2600.0),
    "u": (330.0, 720.0, 2400.0),
    "e": (450.0, 1750.0, 2600.0),
    "i": (300.0, 2150.0, 2900.0),
    "n": (280.0, 1400.0, 2300.0),
}


def _formant_gain(f: Signal, centres: tuple[float, ...], widths: tuple[float, ...], levels: tuple[float, ...]) -> Signal:
    g = np.full_like(f, 0.02)
    for c, w, l in zip(centres, widths, levels):
        g = g + l * np.exp(-0.5 * ((f - c) / w) ** 2)
    return g


def formant(x: Signal, sr: int, vowel: str, *, size: float = 1.0) -> Signal:
    """A static vowel colour (three resonances) on a buzzy source."""
    c = tuple(v * size for v in VOWELS[vowel])
    w = (c[0] * 0.18 + 40, c[1] * 0.12 + 50, c[2] * 0.1 + 80)
    return _padded_gain(x, sr, lambda f: _formant_gain(f, c, w, (1.0, 0.6, 0.25)))


def formant_glide(x: Signal, sr: int, v0: str, v1: str, *, size: float = 1.0, frame: int = 1024) -> Signal:
    """A vowel that moves from v0 to v1 over the sound (overlap-added FFT frames)."""
    n = len(x)
    hop = frame // 2
    win = np.hanning(frame)
    out = np.zeros(n + frame)
    pad = np.concatenate([x, np.zeros(frame)])
    freqs = np.fft.rfftfreq(frame, 1.0 / sr)
    a = np.array(VOWELS[v0]) * size
    b = np.array(VOWELS[v1]) * size
    starts = range(0, n, hop)
    total = max(1, len(starts) - 1)
    for k, s in enumerate(starts):
        u = k / total
        u = u * u * (3 - 2 * u)
        c = tuple(a + (b - a) * u)
        w = (c[0] * 0.18 + 40, c[1] * 0.12 + 50, c[2] * 0.1 + 80)
        seg = pad[s : s + frame] * win
        spec = np.fft.rfft(seg) * _formant_gain(freqs, c, w, (1.0, 0.6, 0.25))
        out[s : s + frame] += np.fft.irfft(spec, frame)
    return out[:n] / 1.0


# -------------------------------------------------------------------------------- sources


def noise(n: int, rng: np.random.Generator) -> Signal:
    return rng.standard_normal(n)


def breath(dur: float, sr: int, rng: np.random.Generator, low: float, high: float, *, attack: float = 0.05, release: float = 0.1, hold: float | None = None) -> Signal:
    """Band-limited noise with a rounded envelope (air, whooshes, sprays)."""
    n = length(dur, sr)
    return band(noise(n, rng), sr, low, high) * smooth_env(n, sr, attack, release, hold=hold)


def swept_noise(dur: float, sr: int, rng: np.random.Generator, f0: float, f1: float, *, width: float = 1.6, attack: float = 0.02, release: float = 0.08) -> Signal:
    """A whoosh: noise whose band slides from f0 to f1 (two moving one-pole filters)."""
    n = length(dur, sr)
    centre = np.geomspace(f0, f1, n)
    x = noise(n, rng)
    x = lowpass(lowpass(x, centre * width, sr), centre * width, sr)
    x = x - lowpass(x, centre / width, sr)
    # The one-pole slopes leak hiss far above the band: a static top keeps whooshes soft.
    x = band(x, sr, 0.0, min(6000.0, 2.2 * max(f0, f1) * width), order=3)
    return normalise_peak(x) * smooth_env(n, sr, attack, release)


def fm_bell(dur: float, sr: int, f: float, *, ratio: float = 3.5, index: float = 2.0, decay: float = 1.0, index_decay: float | None = None, attack: float = 0.003, detune: float = 0.0) -> Signal:
    """Two-operator FM: ratio 3.5 a church bell, 1.41 a gong, 2.0 a warm glass, 1.0 brass."""
    n = length(dur, sr)
    t = time_axis(n, sr)
    idx = index * np.exp(-t / max(index_decay if index_decay is not None else decay * 0.35, 1e-3))
    mod = np.sin(2 * np.pi * f * ratio * t)
    car = np.sin(2 * np.pi * f * (1.0 + detune) * t + idx * mod)
    return car * exp_decay(n, sr, decay, attack=attack)


def partials(dur: float, sr: int, f: float, spec: list[tuple[float, float, float]], *, attack: float = 0.003) -> Signal:
    """Additive tone: (ratio, level, decay seconds) per partial; partials over Nyquist are skipped."""
    n = length(dur, sr)
    t = time_axis(n, sr)
    out = np.zeros(n)
    for ratio, level, dec in spec:
        if f * ratio >= sr / 2 - 400:
            continue
        out += level * np.sin(2 * np.pi * f * ratio * t) * exp_decay(n, sr, dec, attack=attack)
    return out


#: A soft glass/celesta bell, a kalimba tine, a struck metal plate and a low gong.
GLASS = [(1.0, 1.0, 1.4), (2.0, 0.35, 0.8), (3.0, 0.12, 0.5), (4.2, 0.06, 0.3)]
TINE = [(1.0, 1.0, 0.9), (2.76, 0.28, 0.18), (5.4, 0.08, 0.06)]
PLATE = [(1.0, 1.0, 1.0), (1.52, 0.6, 0.7), (2.46, 0.4, 0.5), (3.55, 0.25, 0.35), (4.9, 0.12, 0.2)]
GONG = [(1.0, 1.0, 1.0), (1.41, 0.7, 0.9), (2.2, 0.45, 0.6), (2.93, 0.3, 0.45), (3.6, 0.2, 0.3)]


def pluck(dur: float, sr: int, f: float, rng: np.random.Generator, *, decay: float = 1.2, bright: float = 0.5, pick: float = 0.0) -> Signal:
    """Karplus–Strong string at an exact pitch: the loop runs at f × L samples per second (L ≥ 64)
    and is resampled, so there is no tuning error. `bright` 0–1 sets the pick's colour, `pick`
    0–1 where along the string it is plucked (a comb that hollows the tone)."""
    period = max(64, int(np.ceil(32000.0 / f)))
    # The two-point average delays the loop by half a sample.
    rate = f * (period + 0.5)
    n_int = int(dur * rate) + period + 2
    exc = rng.uniform(-1.0, 1.0, period)
    # Darker picks: smooth the excitation.
    passes = int(round((1.0 - bright) * 6))
    for _ in range(passes):
        exc = 0.5 * (exc + np.roll(exc, 1))
    exc -= exc.mean()
    if pick > 0:
        exc = exc - np.roll(exc, int(pick * period))
    g = 0.001 ** (1.0 / max(decay * f, 1.0))
    y = np.zeros(n_int)
    y[:period] = exc
    for s in range(period, n_int, period):
        e = min(s + period, n_int)
        i = np.arange(s, e)
        y[i] = g * 0.5 * (y[i - period] + y[i - period - 1])
    n = length(dur, sr)
    t_out = np.arange(n) / sr * rate
    out = np.interp(t_out, np.arange(n_int), y)
    return out * exp_decay(n, sr, dur * 4.0, attack=0.002)


def buzz(dur: float, sr: int, f0: float | Signal, rng: np.random.Generator, *, jitter: float = 0.02, rough: float = 0.0, rough_rate: float = 32.0, breathiness: float = 0.15) -> Signal:
    """A vocal source: a band-limited saw with pitch jitter, optional roughness (growls) and
    breath noise. Shape it with `formant` or `formant_glide`."""
    n = length(dur, sr)
    f = np.broadcast_to(np.asarray(f0, dtype=np.float64), (n,)).copy()
    if jitter > 0:
        wobble = lowpass(rng.standard_normal(n), 12.0, sr)
        wobble /= np.max(np.abs(wobble)) + 1e-9
        f = f * (1.0 + jitter * wobble)
    x = osc("saw", f, n, sr)
    if rough > 0:
        t = time_axis(n, sr)
        am = 1.0 - rough * (0.5 + 0.5 * np.sin(2 * np.pi * rough_rate * t + rng.uniform(0, 6.28)))
        x = x * am
    if breathiness > 0:
        x = x + breathiness * band(rng.standard_normal(n), sr, 500.0, 5000.0)
    return x


def pitch_slide(n: int, f0: float, f1: float, *, shape: float = 1.0) -> Signal:
    u = np.linspace(0.0, 1.0, n) ** shape
    return f0 * (f1 / f0) ** u


def arch(n: int, f0: float, peak: float, f1: float, *, at: float = 0.3) -> Signal:
    """A pitch contour that rises from f0 to peak at `at` and falls to f1 (cries, squeals)."""
    k = max(2, int(n * at))
    return np.concatenate([np.geomspace(f0, peak, k), np.geomspace(peak, f1, n - k)])


def clicks(dur: float, sr: int, rng: np.random.Generator, rate: float, *, low: float = 1500.0, high: float = 5000.0, decay: float = 0.004, spread: float = 0.0) -> Signal:
    """Random short clicks (chitters, rattles, crackles): `rate` per second."""
    n = length(dur, sr)
    out = np.zeros(n)
    count = max(1, int(rate * dur))
    k = max(8, int(decay * sr * 5))
    kernel = np.exp(-np.arange(k) / (decay * sr)) * rng.standard_normal(k)
    for _ in range(count):
        s = int(rng.uniform(0, max(1, n - k)) if spread <= 0 else min(n - k - 1, abs(rng.normal(0, spread * n))))
        out[s : s + k] += kernel * rng.uniform(0.4, 1.0)
    return band(out, sr, low, high)


def thud(dur: float, sr: int, f0: float, f1: float, decay: float, *, attack: float = 0.002) -> Signal:
    """A soft body blow: a sine whose pitch drops, without sfxr's hard punch."""
    n = length(dur, sr)
    f = f1 + (f0 - f1) * np.exp(-time_axis(n, sr) / 0.03)
    return osc("sine", f, n, sr) * exp_decay(n, sr, decay, attack=attack)


# --------------------------------------------------------------------------------- reverb


def impulse(seconds: float, sr: int, rng: np.random.Generator, *, damping: float = 0.5, predelay: float = 0.012) -> Signal:
    """A synthetic hall: decaying noise whose top darkens over time (damping 0 bright … 1 dark)."""
    n = length(seconds, sr)
    t = time_axis(n, sr)
    ir = rng.standard_normal(n) * np.exp(-6.9 * t / seconds)
    cut = np.geomspace(9000.0, 9000.0 * (1.0 - 0.9 * damping) + 200.0, n)
    ir = lowpass(ir, cut, sr)
    ir[: length(predelay, sr)] = 0.0
    ir[: length(predelay, sr) + length(0.02, sr)] *= np.linspace(0.0, 1.0, length(0.02, sr) + length(predelay, sr))
    return ir / (np.sqrt(np.sum(ir**2)) + 1e-12)


def convolve(x: Signal, ir: Signal) -> Signal:
    """Linear convolution (FFT); the output is len(x) + len(ir) − 1 long."""
    n = len(x) + len(ir) - 1
    size = 1 << int(np.ceil(np.log2(n)))
    return np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[:n]


def reverb(x: Signal, sr: int, rng: np.random.Generator, *, seconds: float = 1.2, wet: float = 0.25, damping: float = 0.5, tail: float | None = None) -> Signal:
    """Dry plus a hall. The result keeps `tail` seconds after the dry sound (default: the whole
    reverb, which the caller may cut)."""
    ir = impulse(seconds, sr, rng, damping=damping)
    w = convolve(x, ir)
    rms_dry = np.sqrt(np.mean(x**2)) + 1e-12
    rms_wet = np.sqrt(np.mean(w[: len(x)] ** 2)) + 1e-12
    w = w * (rms_dry / rms_wet)
    keep = len(x) + (len(ir) if tail is None else length(tail, sr))
    out = fit(x, keep) * (1.0 - 0.5 * wet) + fit(w, keep) * wet
    # Close the tail smoothly.
    r = min(len(out) // 3, length(0.25, sr))
    out[-r:] *= np.linspace(1.0, 0.0, r) ** 2
    return out


def note(m: float) -> float:
    return float(midi_hz(m))


__all__ = [
    "GLASS",
    "GONG",
    "PLATE",
    "TINE",
    "VOWELS",
    "arch",
    "band",
    "breath",
    "buzz",
    "clicks",
    "convolve",
    "db",
    "envelope",
    "exp_decay",
    "fit",
    "fm_bell",
    "formant",
    "formant_glide",
    "impulse",
    "normalise_peak",
    "note",
    "partials",
    "pitch_slide",
    "pluck",
    "reverb",
    "saturate",
    "smooth_env",
    "swept_noise",
    "thud",
]
