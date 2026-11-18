"""What the game sounds like: one entry per sound, with the words ElevenLabs gets.

Style (user, 2026-11-18): a SOFT HYBRID — real foley (steel, bowstring, magic) but short, round and a little retro,
never shrill; it plays for hours in the background of a taskbar overlay. Every prompt ends with the shared STYLE
words so the whole set keeps one character.

`variants` > 1 asks for that many takes of the same prompt; the client picks one at random each time it plays, so
the sounds heard dozens of times a minute (swings, hits) do not tire. `sample` marks the first batch that goes to the
lab for approval before the rest is generated.
"""
from __future__ import annotations

from dataclasses import dataclass

#: Shared words appended to every effect and interface prompt.
STYLE = "soft and rounded, slightly retro fantasy game sound, clean, dry, no music, no voice"
#: Shared words for the ambient beds.
AMBIENT_STYLE = "calm background ambience for a fantasy game, gentle, even level, no music, no voices, no sudden sounds"


@dataclass(frozen=True)
class Sound:
    id: str
    #: Mixer channel: 'sfx' (combat, abilities, loot), 'ui' (interface), 'ambient' (looping beds).
    channel: str
    #: Review group (report and lab sections).
    group: str
    prompt: str
    #: Seconds asked of ElevenLabs (0.5–30). One-shots are trimmed of silence afterwards.
    seconds: float
    variants: int = 1
    loop: bool = False
    #: dB relative to the channel's reference loudness (a crit sits above a swing, a hover below a click).
    level: float = 0.0
    #: How literally ElevenLabs follows the words (0–1).
    influence: float = 0.45
    sample: bool = False

    def full_prompt(self) -> str:
        return f"{self.prompt}, {AMBIENT_STYLE if self.channel == 'ambient' else STYLE}"


SOUNDS: list[Sound] = [
    # ── Combat ──
    Sound("knight_swing", "sfx", "combat", "a short sword swing whoosh with a light steel ring", 0.6, variants=3, sample=True),
    Sound("hit_flesh", "sfx", "combat", "a blunt melee hit landing on a small creature, short thud", 0.5, variants=3, level=-1, sample=True),
    Sound("ranger_shot", "sfx", "combat", "a bowstring twang releasing an arrow with a quick whoosh", 0.6, variants=3, sample=True),
    Sound("crit_hit", "sfx", "combat", "a heavy critical weapon impact with a bright metallic sparkle", 0.7, variants=2, level=2, sample=True),
    Sound("enemy_die", "sfx", "combat", "a small monster defeated, soft grunt fading into a light magical poof", 0.8, variants=3, level=-2, sample=True),
    # ── Abilities ──
    Sound("priest_mend", "sfx", "ability", "a gentle holy healing chime, warm shimmering bells rising", 1.3, sample=True),
    # ── Bosses ──
    Sound("boss_charge_windup", "sfx", "boss", "a deep ominous rumble rising as a giant gathers strength for a blow", 1.6, level=1, sample=True),
    Sound("boss_charge_impact", "sfx", "boss", "a giant's heavy slam on stone ground, deep boom with debris", 1.2, level=3, sample=True),
    # ── Loot and progress ──
    Sound("chest_drop", "sfx", "loot", "a small wooden chest dropping on grass with a soft coin jingle", 0.8, sample=True),
    Sound("chest_open_rare", "sfx", "loot", "a treasure chest creaking open followed by a magical golden sparkle", 1.6, level=1, sample=True),
    Sound("level_up", "sfx", "progress", "a short triumphant ascending chime arpeggio, celebratory", 1.5, level=1, sample=True),
    # ── Interface and Cube ──
    Sound("ui_click", "ui", "interface", "a soft short wooden button click", 0.5, variants=2, sample=True),
    Sound("ui_panel_open", "ui", "interface", "a soft leather book cover opening, short paper flap", 0.5, level=-2, sample=True),
    Sound("cube_polish", "ui", "cube", "a gem being polished, short scraping whirr ending in a crystal sparkle", 1.0, sample=True),
    # ── Ambient beds (seamless loops) ──
    Sound("amb_w1", "ambient", "ambient", "golden meadows at dusk, soft wind over tall grass, distant birds, crickets, a windmill creaking far away", 24, loop=True, sample=True),
    Sound("amb_w1_torment", "ambient", "ambient", "dark stormy meadows, low howling wind, distant rolling thunder, unsettling", 24, loop=True, sample=True),
]

SOUND_MAP = {s.id: s for s in SOUNDS}
