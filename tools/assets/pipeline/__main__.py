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
        from .lab_page import main as lab

        lab()
        return 0
    print("commands: chars [names…], scene, lab")
    return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
