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
    print("commands: chars [names…], scene, lab, icons, export-ui, export-strip")
    return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
