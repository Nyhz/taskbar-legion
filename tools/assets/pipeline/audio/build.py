"""`sh tools/assets/run.sh audio [--sample] [--dry] [ids…]`: generate what is missing, process everything, write the
manifest and the loudness report.

- `--dry` only counts the ElevenLabs calls that would be made (nothing is spent).
- `--sample` limits the run to the sounds marked `sample` (the lab batch).
- ids limit it to those sounds.

Output: `src/assets/audio/<channel>/<id>_<take>.mp3`, `src/assets/audio/manifest.json` (id → channel, group, files,
loop, seconds, loudness, peak) and `tools/assets/out/audio-report.md`.
"""
from __future__ import annotations

import json

from .catalog import SOUNDS, Sound
from .eleven import ROOT, api_key, generate, missing_takes, takes
from .process import CHANNELS, encode_mp3, prepare

OUT = ROOT / "src" / "assets" / "audio"
REPORT = ROOT / "tools" / "assets" / "out" / "audio-report.md"


def pick(argv: list[str]) -> tuple[list[Sound], bool]:
    dry = "--dry" in argv
    ids = [a for a in argv if not a.startswith("--")]
    sounds = [s for s in SOUNDS if s.sample] if "--sample" in argv else SOUNDS
    if ids:
        sounds = [s for s in sounds if s.id in ids]
    return sounds, dry


def main(argv: list[str]) -> None:
    sounds, dry = pick(argv)
    todo = missing_takes(sounds)
    seconds = sum(s.seconds for s, _ in todo)
    print(f"audio: {len(sounds)} sounds, {len(todo)} ElevenLabs calls to make (~{seconds:.0f} s of audio asked)")
    if dry:
        return
    if todo:
        key = api_key()
        for i, (s, t) in enumerate(todo, 1):
            generate(s, t, key)
            print(f"  [{i}/{len(todo)}] {s.id} take {t}")

    manifest_path = OUT / "manifest.json"
    manifest: dict = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    for s in sounds:  # a sound's old files go: it may now have fewer takes
        for f in manifest.get(s.id, {}).get("files", []):
            (OUT / f).unlink(missing_ok=True)
    for s in sounds:
        files = []
        stats = []
        for t, raw in enumerate(takes(s)):
            x, info = prepare(raw, s.channel, s.level, s.loop)
            rel = f"{s.channel}/{s.id}_{t}.mp3"
            encode_mp3(x, OUT / rel, CHANNELS[s.channel][2])
            files.append(rel)
            stats.append(info)
        manifest[s.id] = {
            "channel": s.channel,
            "group": s.group,
            "files": files,
            "loop": s.loop,
            "seconds": max(i["seconds"] for i in stats),
            "loudness": round(sum(i["loudness"] for i in stats) / len(stats), 1),
            "peak": max(i["peak"] for i in stats),
        }
    manifest = dict(sorted(manifest.items()))
    manifest_path.write_text(json.dumps(manifest, indent=1) + "\n")
    write_report(manifest)
    print(f"audio: wrote {len(sounds)} sounds → {OUT.relative_to(ROOT)}")


def write_report(manifest: dict) -> None:
    lines = [
        "# Informe de sonoridad del audio",
        "",
        "Generado por `sh tools/assets/run.sh audio`; no editar a mano. Referencias por canal: "
        + ", ".join(f"{c} {ref:.0f} dB" for c, (ref, _, _) in CHANNELS.items())
        + ".",
        "",
        "| Id | Canal | Grupo | Tomas | Duración (s) | Sonoridad | Pico | Bucle |",
        "| --- | --- | --- | ---: | ---: | ---: | ---: | --- |",
    ]
    for sid, m in manifest.items():
        lines.append(
            f"| `{sid}` | {m['channel']} | {m['group']} | {len(m['files'])} | {m['seconds']:.2f} | {m['loudness']:.1f} | {m['peak']:.1f} | {'sí' if m['loop'] else ''} |"
        )
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines) + "\n")

