"""Every rigged figure the pipeline knows: name → (module, class, side, world). Heroes belong to no world.

The first two worlds are listed here. From world 3 on a creature registers itself: its module in `foes/` carries
one line, `FIGURE = ("ClassName", "foe" | "boss", "w03")`, and its file name is its key. That line is read as
text, not by importing the module, so a creature that is half written never breaks the others.
"""
from __future__ import annotations

import importlib
import re
from pathlib import Path
from types import ModuleType

from .rig import Character

ROSTER: dict[str, tuple[str, str, str, str]] = {
    "knight": ("chars.knight", "Knight", "hero", ""),
    "ranger": ("chars.ranger", "Ranger", "hero", ""),
    "priest": ("chars.priest", "Priest", "hero", ""),
    "scarecrow": ("foes.scarecrow", "Scarecrow", "foe", "w01"),
    "boar": ("foes.boar", "Boar", "foe", "w01"),
    "poacher": ("foes.poacher", "Poacher", "foe", "w01"),
    "king": ("foes.harvest_king", "HarvestKing", "boss", "w01"),
    "spider": ("foes.spider", "Spider", "foe", "w02"),
    "revenant": ("foes.revenant", "Revenant", "foe", "w02"),
    "sporecaller": ("foes.sporecaller", "Sporecaller", "foe", "w02"),
    "warden": ("foes.warden", "Warden", "boss", "w02"),
}

_FIGURE = re.compile(r'^FIGURE = \("(\w+)", "(foe|boss)", "(w\d\d)"\)', re.M)
for _file in sorted((Path(__file__).parent / "foes").glob("*.py")):
    _m = _FIGURE.search(_file.read_text())
    if _m and _file.stem not in ROSTER:
        ROSTER[_file.stem] = (f"foes.{_file.stem}", _m.group(1), _m.group(2), _m.group(3))


def load(name: str) -> tuple[ModuleType, Character]:
    path, cls, _side, _world = ROSTER[name]
    mod = importlib.import_module(f".{path}", __package__)
    return mod, getattr(mod, cls)()
