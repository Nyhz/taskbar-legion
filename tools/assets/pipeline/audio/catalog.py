"""What the game sounds like: one entry per sound, with the words ElevenLabs gets.

Style: FINE AND SUBTLE, with a 16-bit flavour. The first sample (2026-11-18, a "soft hybrid" of real foley) was rejected
outright: "tienen que ser más finos, sutiles. Imagínate escuchar esos sonidos constantemente". The game is a taskbar
overlay that plays all day, so every sound is heard thousands of times. Each prompt asks for something faint and short,
and the pipeline softens it further (low-pass, gentle attack, low channel levels). Every prompt ends with the shared
STYLE words so the whole set keeps one character.

`variants` asks for that many NEW takes of the prompt; the client picks one at random each time it plays, so the sounds
heard dozens of times a minute do not tire. `kept` lists raw takes the user already approved (files in audio_raw/);
they stay as the first takes whatever the prompt says now. `sample` marks the batch that goes to the lab for approval
before the rest is generated.
"""
from __future__ import annotations

from dataclasses import dataclass

#: Shared words appended to every effect and interface prompt.
STYLE = (
    "very subtle and quiet, faint, short, 16-bit retro game sound effect, SNES era, lo-fi, gentle attack, muted highs, "
    "unobtrusive, no reverb tail, no music, no voice"
)
#: Shared words for the ambient beds.
AMBIENT_STYLE = (
    "very subtle and sparse 16-bit retro game ambience, soft, muted, low and even, unobtrusive background, "
    "no music, no melody, no voices, no sudden sounds"
)


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
    #: How literally ElevenLabs follows the words (0–1). High: the "subtle" words must win.
    influence: float = 0.7
    sample: bool = False
    #: Raw takes the user approved (file names in audio_raw/), kept as the first takes.
    kept: tuple[str, ...] = ()

    def full_prompt(self) -> str:
        return f"{self.prompt}, {AMBIENT_STYLE if self.channel == 'ambient' else STYLE}"

    def take_count(self) -> int:
        return len(self.kept) + self.variants


SOUNDS: list[Sound] = [
    # ── Combat ── (heard most: the faintest)
    Sound("knight_swing", "sfx", "combat", "a faint quick blade swish", 0.5, variants=3, level=-3, sample=True),
    Sound("hit_flesh", "sfx", "combat", "a tiny soft muffled tap of a hit", 0.5, variants=3, level=-4, sample=True),
    Sound("ranger_shot", "sfx", "combat", "a faint soft bowstring pluck with a tiny whoosh", 0.5, variants=3, level=-3, sample=True),
    Sound("crit_hit", "sfx", "combat", "a small crisp hit with a tiny bright ping", 0.5, variants=2, level=-1, sample=True),
    Sound("enemy_die", "sfx", "combat", "a tiny soft puff, a small creature vanishing", 0.6, variants=3, level=-5, sample=True),
    # ── Abilities ──
    Sound("priest_mend", "sfx", "ability", "a soft short twinkle of healing, two gentle chime notes", 0.9, variants=2, level=-2, sample=True),
    # ── Bosses ──
    Sound("boss_charge_windup", "sfx", "boss", "a low soft rising hum, something gathering power", 1.4, variants=2, sample=True),
    Sound("boss_charge_impact", "sfx", "boss", "a muffled heavy thump, deep and short", 0.8, variants=2, sample=True),
    # ── Loot and progress ──
    Sound("chest_drop", "sfx", "loot", "a small soft wooden thunk with a faint coin clink", 0.6, variants=2, level=-2, sample=True),
    Sound("chest_open_rare", "sfx", "loot", "a soft lid creak and a short gentle sparkle", 1.2, variants=2, sample=True),
    Sound("level_up", "sfx", "progress", "a short soft rising three-note chime, gentle and warm", 1.2, variants=2, sample=True),
    # ── Interface and Cube ──
    Sound("ui_click", "ui", "interface", "a soft short wooden button click", 0.5, variants=0, sample=True,
          kept=("ui_click_1_afecdac125.mp3",)),  # take 2 of the first sample: «el segundo aceptable»
    Sound("ui_panel_open", "ui", "interface", "a faint soft paper rustle", 0.5, variants=2, level=-3, sample=True),
    Sound("cube_polish", "ui", "cube", "a faint short polishing rub ending in a tiny glint", 0.8, variants=2, level=-2, sample=True),
    # ── Ambient beds (seamless loops) ──
    Sound("amb_w1", "ambient", "ambient", "quiet golden meadow at dusk, very soft breeze, faint distant crickets", 24, loop=True, variants=2, sample=True),
    Sound("amb_w1_torment", "ambient", "ambient", "dark quiet meadow, low soft wind and very faint distant thunder", 24, loop=True, variants=2, sample=True),
]

SOUND_MAP = {s.id: s for s in SOUNDS}
