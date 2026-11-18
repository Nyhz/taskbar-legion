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

from .catalog import SOUND_MAP, SOUNDS, Sound
from .eleven import ROOT, api_key, generate, missing_takes, takes
from .recipes import render
from .process import CHANNELS, decode, encode_mp3, loop_offset, prepare

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
    print(f"audio: {len(sounds)} sounds, {len(todo)} ElevenLabs calls to make (~{seconds:.0f} s of audio asked); the rest is synthesised")
    if dry:
        return
    if todo:
        key = api_key()
        for i, (s, t) in enumerate(todo, 1):
            generate(s, t, key)
            print(f"  [{i}/{len(todo)}] {s.id} take {t}")

    manifest_path = OUT / "manifest.json"
    manifest: dict = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    for gone in [sid for sid in manifest if sid not in SOUND_MAP]:  # renamed or removed ids (priest_mend → ab_priest_mend)
        for f in manifest.pop(gone).get("files", []):
            (OUT / f).unlink(missing_ok=True)
        print(f"  removed {gone} (no longer in the catalogue)")
    for s in sounds:  # a sound's old files go: it may now have fewer takes
        for f in manifest.get(s.id, {}).get("files", []):
            (OUT / f).unlink(missing_ok=True)
    for s in sounds:
        files = []
        stats = []
        recorded = takes(s)
        sources = [(decode(p), True) for p in recorded] + [(render(s.id, t), False) for t in range(0 if s.source == "eleven" else s.variants)]
        offsets = []
        for t, (raw, is_recorded) in enumerate(sources):
            x, info = prepare(raw, s.channel, s.level, s.loop, recorded=is_recorded)
            rel = f"{s.channel}/{s.id}_{t}.mp3"
            encode_mp3(x, OUT / rel, CHANNELS[s.channel][2])
            if s.loop:  # the client loops from the real start over the source's exact length (gapless)
                offsets.append({"start": loop_offset(OUT / rel, x), "length": round(len(x) / 44100, 6)})
            files.append(rel)
            stats.append(info)
        manifest[s.id] = {
            "channel": s.channel,
            "group": s.group,
            "files": files,
            "loop": s.loop,
            **({"loopPoints": offsets} if s.loop else {}),
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

