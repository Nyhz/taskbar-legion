"""What the game sounds like: one entry per sound.

Since 2026-11-18 the sounds are SYNTHESISED (recipes.py), with Stardew Valley as the reference: small, round, cosy,
bearable all day. Two ElevenLabs samples were rejected ("No puedo empezar a describir lo malos que son"), so a sound
comes from ElevenLabs only when the user approved a take of it (`kept`, the raw files in audio_raw/).

`variants` is how many takes are rendered (or asked of ElevenLabs); the client picks one at random each time, so the
sounds heard dozens of times a minute never machine-gun. `sample` marks the batch that goes to the lab for approval.
"""
from __future__ import annotations

from dataclasses import dataclass

#: Shared words appended to an ElevenLabs prompt (kept for sounds that still come from there).
STYLE = "very subtle and quiet, faint, short, cosy retro game sound effect, no music, no voice"
AMBIENT_STYLE = "very subtle calm background ambience for a cosy game, no music, no voices, no sudden sounds"


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
    #: Raw ElevenLabs takes the user approved (file names in audio_raw/), kept as the first takes.
    kept: tuple[str, ...] = ()
    #: 'synth' (recipes.py) or 'eleven' (the API; `prompt` is then what it is asked).
    source: str = "synth"

    def full_prompt(self) -> str:
        return f"{self.prompt}, {AMBIENT_STYLE if self.channel == 'ambient' else STYLE}"

    def take_count(self) -> int:
        return len(self.kept) + self.variants


SOUNDS: list[Sound] = [
    # ── Combat ── (heard most: the faintest)
    Sound("knight_swing", "sfx", "combat", "a soft fwip of air", 0.2, variants=3, level=-4, sample=True),
    Sound("hit", "sfx", "combat", "a small round tup", 0.2, variants=3, level=-5, sample=True),
    Sound("ranger_shot", "sfx", "combat", "a soft low twang and a breath of arrow", 0.3, variants=3, level=-4, sample=True),
    Sound("crit_hit", "sfx", "combat", "the hit with a tiny ping on top", 0.3, variants=2, level=-2, sample=True),
    Sound("enemy_die", "sfx", "combat", "a little poof", 0.3, variants=3, level=-6, sample=True),
    # ── Abilities ──
    Sound("priest_mend", "sfx", "ability", "two soft glass notes, a fifth apart", 0.8, variants=1, level=-3, sample=True),
    # ── Bosses ──
    Sound("boss_charge_windup", "sfx", "boss", "a low hum that swells and rises", 1.2, variants=1, level=-2, sample=True),
    Sound("boss_charge_impact", "sfx", "boss", "a deep soft thump", 0.5, variants=1, level=-1, sample=True),
    # ── Loot and progress ──
    Sound("chest_drop", "sfx", "loot", "a small wooden knock and two coin clinks", 0.3, variants=2, level=-3, sample=True),
    Sound("chest_open_rare", "sfx", "loot", "the lid, then a little rising sparkle", 0.9, variants=1, level=-2, sample=True),
    Sound("level_up", "sfx", "progress", "three warm tine notes going up", 1.1, variants=1, level=-1, sample=True),
    # ── Interface and Cube ──
    Sound("ui_click", "ui", "interface", "a soft short wooden button click", 0.5, variants=0, sample=True, source="eleven",
          kept=("ui_click_1_afecdac125.mp3",)),  # take 2 of the first ElevenLabs sample: «el segundo aceptable»
    Sound("ui_panel_open", "ui", "interface", "a tiny paper fwip upwards", 0.1, variants=2, level=-4, sample=True),
    Sound("cube_polish", "ui", "cube", "a short soft rub and a tiny glint", 0.5, variants=1, level=-3, sample=True),
    # ── Ambient beds (seamless loops) ──
    Sound("amb_w1", "ambient", "ambient", "golden meadow at dusk: soft breeze, crickets, a few far birds", 24, loop=True, sample=True),
    Sound("amb_w1_torment", "ambient", "ambient", "the meadow under a storm: low dark wind, far soft thunder", 24, loop=True, sample=True),
]

SOUND_MAP = {s.id: s for s in SOUNDS}
