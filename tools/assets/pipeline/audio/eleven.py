"""ElevenLabs sound-effects client: one HTTP call per take, cached on disk.

The key is read from the environment (`ELEVENLABS_API_KEY`) or from the repository's gitignored `.env.local`; it is
never printed or written anywhere. Every take is stored under `tools/assets/audio_raw/` named by a hash of what was
asked (prompt, length, influence, loop, take number), so re-running the pipeline costs no credits and changing a
prompt regenerates only that sound. The raw takes are committed: they are the sources, and regenerating them costs
credits and gives different sounds.
"""
from __future__ import annotations

import hashlib
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

from .catalog import Sound

ROOT = Path(__file__).resolve().parents[4]
RAW = ROOT / "tools" / "assets" / "audio_raw"
ENDPOINT = "https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128"


def api_key() -> str:
    key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    env = ROOT / ".env.local"
    if not key and env.exists():
        for line in env.read_text().splitlines():
            name, _, value = line.partition("=")
            if name.strip() == "ELEVENLABS_API_KEY":
                key = value.strip().strip('"').strip("'")
    if not key:
        raise SystemExit("ELEVENLABS_API_KEY is not set (environment or .env.local)")
    return key


def request_body(sound: Sound) -> dict:
    body: dict = {
        "text": sound.full_prompt(),
        "duration_seconds": sound.seconds,
        "prompt_influence": sound.influence,
    }
    if sound.loop:
        body["loop"] = True
    return body


def take_path(sound: Sound, take: int) -> Path:
    digest = hashlib.sha1(json.dumps([request_body(sound), take], sort_keys=True).encode()).hexdigest()[:10]
    return RAW / f"{sound.id}_{take}_{digest}.mp3"


def missing_takes(sounds: list[Sound]) -> list[tuple[Sound, int]]:
    """The ElevenLabs calls still to make (synthesised sounds never call it)."""
    return [(s, t) for s in sounds if s.source == "eleven" for t in range(s.variants) if not take_path(s, t).exists()]


def takes(sound: Sound) -> list[Path]:
    """Every raw ElevenLabs take of a sound, in play order: the approved ones it keeps, then the generated ones."""
    generated = [take_path(sound, t) for t in range(sound.variants)] if sound.source == "eleven" else []
    return [RAW / name for name in sound.kept] + generated


def generate(sound: Sound, take: int, key: str) -> Path:
    """Asks ElevenLabs for one take (unless cached) and returns its file."""
    path = take_path(sound, take)
    if path.exists():
        return path
    data = json.dumps(request_body(sound)).encode()
    req = urllib.request.Request(ENDPOINT, data=data, method="POST", headers={"xi-api-key": key, "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=180) as res:
            audio = res.read()
    except urllib.error.HTTPError as err:
        detail = err.read().decode(errors="replace")[:300]
        raise SystemExit(f"ElevenLabs refused {sound.id} take {take}: HTTP {err.code} {detail}") from None
    RAW.mkdir(parents=True, exist_ok=True)
    path.write_bytes(audio)
    return path
