"""CLI of the asset pipeline: `sh tools/assets/run.sh <command>`."""
from __future__ import annotations

import sys


def main(argv: list[str]) -> int:
    cmd = argv[0] if argv else "help"
    if cmd == "chars":
        from .chars_preview import main as chars

        chars(argv[1:])
        return 0
    if cmd == "scene":
        from .scene_export import main as scene

        scene()
        return 0
    if cmd == "lab":
        from .lab_page import main as lab, refresh_items

        # `lab items` only refreshes the item icons on the page; plain `lab` rebuilds everything (minutes).
        refresh_items() if argv[1:] == ["items"] else lab()
        return 0
    if cmd == "app-icon":
        from .brand_icon import main as app_icon

        app_icon()
        return 0
    if cmd == "nova-preview":
        from .nova_preview import main as nova_preview

        nova_preview(argv[1:])
        return 0
    if cmd == "ability-preview":
        from .ability_preview import main as ability_preview

        ability_preview(argv[1:])
        return 0
    if cmd == "reel":
        from .title_reel import main as reel

        reel()
        return 0
    if cmd == "icons":
        from .icons import main as icons

        icons(argv[1:] or None)
        return 0
    if cmd == "export-ui":
        from .export_ui import main as export_ui

        export_ui()
        return 0
    if cmd == "export-strip":
        from .export_strip import main as export_strip

        export_strip()
        return 0
    if cmd == "export-figs":
        from .export_figs import main as export_figs

        export_figs()
        return 0
    if cmd == "export-fx":
        from .export_fx import main as export_fx

        export_fx()
        return 0
    if cmd == "export-pets":
        from .export_pets import main as export_pets

        export_pets()
        return 0
    if cmd == "export-events":
        from .export_events import main as export_events

        export_events()
        return 0
    if cmd == "readme":
        from .readme_banners import main as readme

        readme()
        return 0
    if cmd == "audio":
        from .audio.build import main as audio

        audio(argv[1:])
        return 0
    if cmd == "audio-lab":
        from .audio.lab import main as audio_lab

        audio_lab()
        return 0
    print("commands: chars [names…], scene, lab, icons, export-ui, export-strip, export-figs, export-fx, export-pets, readme, app-icon, reel, ability-preview [rev], nova-preview, audio [--sample] [--dry] [ids…]")
    return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
