"""From a raw ElevenLabs take to a game-ready sound: decode, trim, soften, level, loop, encode.

Loudness is the coop-game pipeline's measure (gated 50 ms RMS after a 100 Hz high-pass). The channel references sit
well below a normal game's (sfx −25 dB, ui −27 dB, ambient −34 dB): the user rejected the first sample as too much
for something heard all day. Every sound is softened: a low-pass takes the highs off (a 16-bit, muted top) and the
attack is eased in. One-shots are mono (the strip is a thin band); ambient beds stay stereo.
"""
from __future__ import annotations

import subprocess
from pathlib import Path

import numpy as np
import soundfile as sf

RATE = 44100
LOUDNESS_WINDOW_S = 0.05

#: Channel → (reference loudness dB, peak limit dBFS, MP3 bitrate).
CHANNELS: dict[str, tuple[float, float, str]] = {
    "sfx": (-25.0, -8.0, "96k"),
    "ui": (-27.0, -9.0, "96k"),
    "ambient": (-34.0, -14.0, "112k"),
}
#: Low-pass corner (Hz) of the softening: one-shots lose their bite above it, the beds keep a little more air.
SOFT_CUTOFF = {"sfx": 6500.0, "ui": 7000.0, "ambient": 5000.0}


def decode(path: Path) -> np.ndarray:
    x, sr = sf.read(str(path), dtype="float64", always_2d=True)
    if sr != RATE:
        raise ValueError(f"{path.name}: {sr} Hz, expected {RATE}")
    return x


def _highpass(x: np.ndarray, cutoff: float = 100.0) -> np.ndarray:
    """One-pole high-pass, enough to keep rumble out of the loudness measure."""
    a = float(np.exp(-2.0 * np.pi * cutoff / RATE))
    y = np.empty_like(x)
    prev_x = 0.0
    prev_y = 0.0
    # Vectorised enough for a few seconds of audio: the loop is per sample but on a 1-D array.
    for i, v in enumerate(x):
        prev_y = a * (prev_y + v - prev_x)
        prev_x = v
        y[i] = prev_y
    return y


def _lowpass(x: np.ndarray, cutoff: float) -> np.ndarray:
    """Two cascaded one-pole low-passes (12 dB/octave): a soft, muted top like a 16-bit sampler's."""
    a = float(np.exp(-2.0 * np.pi * cutoff / RATE))
    y = x
    for _ in range(2):
        out = np.empty_like(y)
        prev = 0.0
        for i, v in enumerate(y):
            prev = (1.0 - a) * v + a * prev
            out[i] = prev
        y = out
    return y


def soften(x: np.ndarray, channel: str) -> np.ndarray:
    return np.stack([_lowpass(x[:, c], SOFT_CUTOFF[channel]) for c in range(x.shape[1])], axis=1)


def loudness_db(x: np.ndarray) -> float:
    power = sum(_highpass(x[:, c]) ** 2 for c in range(x.shape[1])) / x.shape[1]
    w = max(1, int(RATE * LOUDNESS_WINDOW_S))
    frames = len(power) // w
    ms = np.array([np.mean(power)]) if frames == 0 else power[: frames * w].reshape(frames, w).mean(axis=1)
    ms = ms[ms > 10 ** (-70 / 10)]
    if len(ms) == 0:
        return -120.0
    kept = ms[ms >= np.mean(ms) * 10 ** (-10 / 10)]
    return float(10.0 * np.log10(np.mean(kept)))


def peak_db(x: np.ndarray) -> float:
    p = float(np.max(np.abs(x)))
    return -120.0 if p <= 0 else 20.0 * np.log10(p)


def normalise(x: np.ndarray, target_db: float, peak_limit_db: float) -> np.ndarray:
    """Scales to the target loudness, never letting the peak pass the limit."""
    limit = 10 ** (peak_limit_db / 20.0)
    y = x
    for _ in range(4):
        now = loudness_db(y)
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


def trim(x: np.ndarray, floor_db: float = -48.0, keep_ms: float = 15.0) -> np.ndarray:
    """Cuts the silence before and after a one-shot (ElevenLabs pads to the length asked), keeping a few ms."""
    env = np.max(np.abs(x), axis=1)
    loud = np.nonzero(env > 10 ** (floor_db / 20.0) * max(1e-9, float(env.max())))[0]
    if len(loud) == 0:
        return x
    pad = int(RATE * keep_ms / 1000)
    return x[max(0, loud[0] - pad) : min(len(x), loud[-1] + pad * 4)]


def fade(x: np.ndarray, in_ms: float = 8.0, out_ms: float = 60.0) -> np.ndarray:
    y = x.copy()
    k_in = min(len(y) // 2, max(1, int(RATE * in_ms / 1000)))
    k_out = min(len(y) // 2, max(1, int(RATE * out_ms / 1000)))
    y[:k_in] *= np.linspace(0.0, 1.0, k_in)[:, None]
    y[-k_out:] *= np.linspace(1.0, 0.0, k_out)[:, None]
    return y


def seamless(x: np.ndarray, cross_s: float = 1.5) -> np.ndarray:
    """A loop with no seam: the last `cross_s` seconds are cross-faded (equal power) into the first ones and cut off,
    so the end flows into the start whatever ElevenLabs' own loop flag did."""
    k = min(int(RATE * cross_s), len(x) // 3)
    t = np.linspace(0.0, np.pi / 2, k)[:, None]
    head = x[:k] * np.sin(t) + x[-k:] * np.cos(t)
    return np.concatenate([head, x[k:-k]])


def prepare(raw: Path, channel: str, level: float, loop: bool) -> tuple[np.ndarray, dict]:
    x = decode(raw)
    if channel != "ambient":
        x = x.mean(axis=1, keepdims=True)
    x = soften(x, channel)
    x = seamless(x) if loop else fade(trim(x))
    ref, limit, _ = CHANNELS[channel]
    x = normalise(x, ref + level, limit)
    return x, {"seconds": round(len(x) / RATE, 3), "loudness": round(loudness_db(x), 1), "peak": round(peak_db(x), 1)}


def encode_mp3(x: np.ndarray, out: Path, bitrate: str) -> None:
    """MP3 through ffmpeg's LAME: the one format every webview (WKWebView, WebView2, WebKitGTK) decodes."""
    out.parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(x, -1.0, 1.0) * 32767).astype("<i2").tobytes()
    cmd = [
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        "-f", "s16le", "-ar", str(RATE), "-ac", str(x.shape[1]), "-i", "pipe:0",
        "-codec:a", "libmp3lame", "-b:a", bitrate, "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:a", "+bitexact",
        str(out),
    ]
    subprocess.run(cmd, input=pcm, check=True)
