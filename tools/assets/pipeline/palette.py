"""Master palette of Taskbar Legion: «dusk» — muted ramps whose shadows drift to indigo / teal and whose
highlights drift to peach / coral (the opposite hue shift of a bright chiptune palette).

Ramps are long (8–10 tones) so that sprites drawn at full resolution get several shading steps instead
of one light and one shadow: that is where the extra definition comes from. Every opaque pixel of every
sprite uses one of these colours; backdrops may also use them through ordered dithering.
"""
from __future__ import annotations

from typing import Iterable

Color = tuple[int, int, int]


def _hex(value: str) -> Color:
    value = value.lstrip("#")
    return (int(value[0:2], 16), int(value[2:4], 16), int(value[4:6], 16))


# Ramps are ordered from darkest (index 0) to lightest.
RAMPS: dict[str, list[str]] = {
    # Cool neutral: outlines, iron, steel, stone. Dark end indigo, light end a warm bone white.
    "ink": ["#0b0d17", "#151a2b", "#212a40", "#303c55", "#43506a", "#5b6880", "#77839a", "#97a1b3", "#bcc3cf", "#e6e6e8"],
    # Skin.
    "skin": ["#2a1a26", "#4a2a35", "#73403f", "#9c5c4f", "#c47e64", "#e0a37f", "#f2c7a2", "#fbe3c8"],
    # Leather, wood, fur, earth.
    "leather": ["#1e1520", "#33212a", "#4d3030", "#6b4535", "#8c5e3e", "#ae7b4c", "#cb9a63", "#e3bd88"],
    # Brass and gold: trims, holy light, the top tier.
    "brass": ["#2b1a1f", "#4f2b22", "#7d4526", "#a96628", "#d08f34", "#ebb94f", "#f8dc84", "#fff4c6"],
    # Crimson: cloth, blood, embers.
    "crimson": ["#1f0f1f", "#3d1427", "#63192e", "#8f2433", "#bb3a3a", "#dc5f48", "#f08a62", "#fbb68a"],
    # Moss: grass and foliage, shadows towards teal.
    "moss": ["#0e1a1f", "#142a2a", "#1d3f33", "#2a573b", "#3f7343", "#5e8f4b", "#86ab5a", "#b3c873", "#dde49c"],
    # Sea: water, spirit, frost.
    "sea": ["#0a1824", "#0f2b3a", "#154352", "#1d5d68", "#2b7a7c", "#45998f", "#6fb9a6", "#a6d8c2", "#d9f1e3"],
    # Azure: cloth, arcane, cold skies.
    "azure": ["#0d1230", "#161f4a", "#213268", "#2e4a88", "#3f68a6", "#5a8bc2", "#82b0da", "#b4d4ee", "#e1f0fb"],
    # Violet: the Rift, shadow, corruption.
    "violet": ["#150d2a", "#241446", "#371e62", "#4d2b7c", "#673d94", "#8556ad", "#a879c6", "#cba2dd", "#ead2f0"],
    # Dusk: sky gradients from night plum to sunset peach.
    "dusk": ["#1c1830", "#2a1f3d", "#45294f", "#6a3559", "#93455f", "#bb5b62", "#da7b66", "#ee9f72", "#f8c48a", "#fde3b0"],
    # Bone: parchment, bone, pale cloth.
    "bone": ["#2e2530", "#4a3c42", "#6b5a59", "#8e7c74", "#b09f91", "#cfc1af", "#e8ddca", "#f8f2e4"],
    # Shared warm highlight.
    "light": ["#fffaf0"],
}

PALETTE: list[Color] = [_hex(c) for r in RAMPS.values() for c in r]
PALETTE_SET: frozenset[Color] = frozenset(PALETTE)

#: The darkest tone of the neutral ramp: the fallback outline.
OUTLINE: Color = _hex(RAMPS["ink"][0])
#: Colours accepted as an outline: the two darkest tones of every ramp (selective outlines).
OUTLINE_COLORS: frozenset[Color] = frozenset(_hex(c) for name, r in RAMPS.items() if name != "light" for c in r[:2])


def ramp(name: str) -> list[Color]:
    return [_hex(c) for c in RAMPS[name]]


def color(name: str, index: int) -> Color:
    r = RAMPS[name]
    return _hex(r[max(0, min(len(r) - 1, index))])


def hex_of(c: Color) -> str:
    return "#%02x%02x%02x" % c


def nearest(c: Color, allowed: Iterable[Color] = PALETTE) -> Color:
    return min(allowed, key=lambda p: (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2)


assert len(PALETTE_SET) == len(PALETTE), "duplicate palette colours"
