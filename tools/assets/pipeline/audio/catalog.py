"""What the game sounds like: one entry per sound.

Since 2026-11-18 the sounds are SYNTHESISED (the recipes/ package), with Stardew Valley as the reference: small, round, cosy,
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


def _s(id_: str, channel: str, group: str, what: str, seconds: float, variants: int = 1, level: float = 0.0) -> Sound:
    """A synthesised sound (every one goes to the lab: `sample`)."""
    return Sound(id_, channel, group, what, seconds, variants=variants, level=level, sample=True)


def _amb(id_: str, what: str) -> Sound:
    return Sound(id_, "ambient", "ambient", what, 24, loop=True, sample=True)


#: The ids, channels and take counts are the contract with the game client (its audio engine requests these ids).
#: Levels: the sounds heard most (swings, hits, deaths, hover) are the faintest; rewards and bosses a few dB above.
SOUNDS: list[Sound] = [
    # ── Combat ──
    _s("knight_swing", "sfx", "combat", "a soft fwip of air", 0.16, 3, -4),
    _s("ranger_shot", "sfx", "combat", "a soft low twang and a breath of arrow", 0.26, 3, -4),
    _s("priest_strike", "sfx", "combat", "a soft light tink and a puff", 0.24, 3, -4),
    _s("hit", "sfx", "combat", "a small round tup", 0.13, 3, -5),
    _s("crit_hit", "sfx", "combat", "the hit with a tiny ping on top", 0.32, 2, -2),
    _s("block", "sfx", "combat", "a small soft shield knock", 0.17, 2, -4),
    _s("multi", "sfx", "combat", "a tiny quick echo tick", 0.11, 1, -7),
    _s("hero_hurt", "sfx", "combat", "a muffled low thump", 0.22, 2, -3),
    _s("hero_down", "sfx", "combat", "two soft notes going down", 0.4, 1, -3),
    _s("enemy_die", "sfx", "combat", "a little poof", 0.24, 3, -6),
    _s("elite_die", "sfx", "combat", "a bigger poof with a low note", 0.3, 2, -3),
    _s("elite_arrive", "sfx", "combat", "a low soft swell", 0.45, 1, -4),
    _s("enemy_shot", "sfx", "combat", "a lighter, higher twang", 0.18, 2, -6),
    _s("enemy_bolt", "sfx", "combat", "a soft zap, a whirr", 0.23, 2, -6),
    _s("enemy_smash", "sfx", "combat", "a low soft whump", 0.32, 1, -4),
    # ── Hero abilities (the cast moment) and ultimates ──
    _s("ab_knight_guard", "sfx", "ability", "a stony grind settling into a low knock", 0.32, 1, -4),
    _s("ab_knight_debilitate", "sfx", "ability", "a wide sweep and a dull blow", 0.36, 1, -3),
    _s("ab_knight_bulwark", "sfx", "ability", "the shield braced and a low shimmer", 0.5, 1, -3),
    _s("ab_knight_battlecry", "sfx", "ability", "a short horn-like swell", 0.62, 1, -3),
    _s("ab_knight_bloodlust", "sfx", "ability", "a double heartbeat and a rising rush", 0.4, 1, -3),
    _s("ab_knight_holdtheline", "sfx", "ability", "the shield planted and a warm low chord", 0.6, 1, -3),
    _s("ab_knight_riposte", "sfx", "ability", "a parry clink and a quick strike back", 0.26, 1, -3),
    _s("ab_knight_riposte_charge", "sfx", "ability", "a tiny tick", 0.1, 1, -9),
    _s("ab_priest_mend", "sfx", "ability", "two soft glass notes, a fifth apart", 1.0, 1, -3),
    _s("ab_priest_healing_light", "sfx", "ability", "three quick glass notes rising", 0.55, 1, -3),
    _s("ab_priest_holyshield", "sfx", "ability", "a soft bubble closing with a shimmer", 0.52, 1, -3),
    _s("ab_priest_nova", "sfx", "ability", "a soft bloom of light outwards", 0.45, 1, -3),
    _s("ab_priest_circle", "sfx", "ability", "a ring of notes", 0.6, 1, -3),
    _s("ab_priest_sanctuary", "sfx", "ability", "a warm swell with a glass note", 0.9, 1, -3),
    _s("ab_priest_smite", "sfx", "ability", "a bright tink and a soft strike of light", 0.34, 1, -3),
    _s("ab_ranger_fast_fire", "sfx", "ability", "three quick plucks rising", 0.36, 1, -3),
    _s("ab_ranger_aimedshot", "sfx", "ability", "a deeper twang and a long breath of arrow", 0.36, 1, -3),
    _s("ab_ranger_multishot", "sfx", "ability", "a volley of soft whooshes", 0.36, 1, -3),
    _s("ab_ranger_focus", "sfx", "ability", "a soft pop, then a soft boom", 0.5, 1, -3),
    _s("ab_ranger_frozentrap", "sfx", "ability", "a toss and a scatter of tiny soft tinks", 0.4, 1, -3),
    _s("ab_ranger_weakspot", "sfx", "ability", "the shot and a tiny ding", 0.4, 1, -3),
    _s("ab_ranger_tarflask", "sfx", "ability", "a glass clink and a gloopy splash", 0.46, 1, -3),
    _s("ult_knight_laststand", "sfx", "ability", "a deep soft gong bloom and a rising ward", 1.2, 1, -2),
    _s("ult_priest_enrage", "sfx", "ability", "a chord swelling with a quickening pulse", 1.2, 1, -2),
    _s("ult_ranger_mark", "sfx", "ability", "a low hunting horn and a ping", 1.1, 1, -2),
    # ── Bosses ──
    _s("boss_appear", "sfx", "boss", "a low two-note swell", 1.0, 1, -2),
    _s("world_boss_enter", "sfx", "boss", "a swirling whoosh over a low drone", 1.5, 1, -1),
    _s("boss_charge_windup", "sfx", "boss", "a low hum that swells and rises", 1.2, 1, -2),
    _s("boss_charge_impact", "sfx", "boss", "a deep soft thump", 0.5, 1, -1),
    _s("boss_fury", "sfx", "boss", "a low rough rumble rising", 0.92, 1, -2),
    _s("boss_down", "sfx", "boss", "a warm chord that resolves", 1.4, 1, 0),
    _s("boss_slam", "sfx", "boss", "a rearing breath and a slam", 0.7, 1, -2),
    _s("boss_shockwave", "sfx", "boss", "a whump and a low wave rolling out", 0.8, 1, -2),
    _s("boss_mortal_wound", "sfx", "boss", "a dull slash and a dark falling note", 0.64, 1, -2),
    _s("boss_deadeye", "sfx", "boss", "a thin whistle and a dull thock", 0.34, 1, -3),
    _s("boss_flock", "sfx", "boss", "a flurry of soft wing flaps", 1.0, 1, -2),
    _s("boss_roots", "sfx", "boss", "a low woody creak and a knot", 0.9, 1, -2),
    _s("boss_chain_bolt", "sfx", "boss", "a soft bolt hopping three times", 0.62, 1, -2),
    _s("boss_guilt", "sfx", "boss", "a dark low bell toll", 1.3, 1, -2),
    _s("boss_gild", "sfx", "boss", "a golden shimmer that freezes", 0.82, 1, -2),
    _s("boss_undertow", "sfx", "boss", "a wave swelling over and dragging back", 1.2, 1, -2),
    _s("boss_spores", "sfx", "boss", "soft puffs of spores", 0.8, 1, -2),
    _s("boss_red_blade", "sfx", "boss", "a whoomp of fire and a dark sizzle", 0.8, 1, -2),
    _s("boss_scales", "sfx", "boss", "two chimes sliding into one", 0.92, 1, -2),
    _s("boss_mirror", "sfx", "boss", "a glassy shimmer swelling backwards", 0.6, 1, -2),
    _s("boss_shatter", "sfx", "boss", "a soft falling cluster of glass and a whump", 0.8, 1, -1),
    # ── Loot ──
    _s("chest_drop", "sfx", "loot", "a small wooden knock and two coin clinks", 0.3, 2, -3),
    _s("chest_drop_boss", "sfx", "loot", "a heavier knock and a few coins", 0.42, 1, -2),
    _s("chest_drop_world", "sfx", "loot", "a heavy knock, a spill of coins, a warm note", 1.1, 1, -1),
    _s("chest_open", "sfx", "loot", "the lid in two soft knocks", 0.26, 2, -3),
    _s("chest_open_rare", "sfx", "loot", "the lid, then a little rising sparkle", 1.1, 1, -2),
    _s("item_epic", "sfx", "loot", "two shimmering notes going up", 0.95, 1, -1),
    _s("item_legendary", "sfx", "loot", "a rising run blooming into a chord", 1.5, 1, 0),
    _s("gem_get", "sfx", "loot", "a clear crystal ting", 0.75, 1, -2),
    _s("key_get", "sfx", "loot", "a small key jingle", 0.36, 1, -2),
    _s("pet_found", "sfx", "loot", "a cute hopping chirp and three tines", 1.25, 1, -1),
    # ── Progress ──
    _s("level_up", "sfx", "progress", "three warm tine notes going up", 1.4, 1, -1),
    _s("stage_clear", "sfx", "progress", "two steps and a chord landing home", 1.05, 1, -2),
    _s("wipe", "sfx", "progress", "three soft low notes going down", 1.3, 1, -2),
    # ── Interface ──
    Sound("ui_click", "ui", "interface", "a soft short wooden button click", 0.5, variants=0, sample=True, source="eleven",
          kept=("ui_click_1_afecdac125.mp3",)),  # take 2 of the first ElevenLabs sample: «el segundo aceptable»
    _s("ui_hover", "ui", "interface", "the smallest soft tick", 0.035, 1, -12),
    _s("ui_panel_open", "ui", "interface", "a tiny paper fwip upwards", 0.11, 2, -4),
    _s("ui_panel_close", "ui", "interface", "a tiny paper fwip downwards", 0.1, 2, -5),
    _s("ui_tab", "ui", "interface", "a small soft wooden tick", 0.07, 1, -5),
    _s("ui_equip", "ui", "interface", "a soft leather pat and a small knock", 0.16, 2, -3),
    _s("ui_drop", "ui", "interface", "a soft thunk", 0.15, 1, -3),
    _s("ui_error", "ui", "interface", "a soft low double tick", 0.2, 1, -3),
    _s("ui_buy", "ui", "interface", "a tick and a coin", 0.22, 1, -2),
    _s("ui_talent", "ui", "interface", "a small glassy blip upwards", 0.22, 1, -2),
    _s("ui_toggle", "ui", "interface", "tick-tock", 0.13, 1, -4),
    # ── The Cube ──
    _s("cube_synth", "ui", "cube", "the Cube whirrs, then a chime", 0.7, 1, -2),
    _s("cube_lucky", "ui", "cube", "the whirr and a double rising sparkle", 1.15, 1, -1),
    _s("cube_melt", "ui", "cube", "low soft bubbling and two coins", 0.45, 1, -2),
    _s("cube_transfig", "ui", "cube", "two tones crossing as they glide", 0.65, 1, -2),
    _s("cube_polish", "ui", "cube", "a short soft rub and a tiny glint", 0.5, 1, -3),
    _s("cube_perfect", "ui", "cube", "the glint and a little star chime", 1.0, 1, -1),
    # ── Ambient beds (seamless loops) ──
    _amb("amb_w1", "golden meadow at dusk: crickets, small birds, a far whistle, grass stirring"),
    _amb("amb_w2", "old moss forest: leaves, a far woodpecker, a soft owl, birds in the canopy"),
    _amb("amb_w3", "stilt marshes: frogs, water lapping, plops"),
    _amb("amb_w4", "red rock canyons: wind whistling, pebbles, a far hawk"),
    _amb("amb_w5", "monastery peaks: thin wind, a far bell, wind chimes"),
    _amb("amb_w6", "coast of sunken ruins: soft waves, far gulls, drips"),
    _amb("amb_w7", "caverns of crystal and fungus: drips with echo, crystals, a low hum"),
    _amb("amb_w8", "ash lands and forges: embers, a far anvil, a furnace, bubbling rock"),
    _amb("amb_w9", "citadel among the clouds: airy chimes, far banners, high wind"),
    _amb("amb_w10", "the Rift: phasing whooshes, sliding tones, glass backwards"),
    _amb("amb_w1_torment", "the meadow under a storm: far thunder, gusts, heavy drops"),
    _amb("amb_w2_torment", "the forest at night: creaking trunks, a deep owl, breath in the dark, one far storm"),
    _amb("amb_w3_torment", "the marsh in a downpour: rain sheets, thunder, deep frogs"),
    _amb("amb_w4_torment", "the canyon in a dust storm: gusts, howling rock, falling stones, thunder"),
    _amb("amb_w5_torment", "the peaks in a blizzard: howling wind, one deep bell, far thunder"),
    _amb("amb_w6_torment", "the coast in a sea storm: heavy waves, rain, thunder"),
    _amb("amb_w7_torment", "the caverns gone dark: a throb in the rock, deep drops, spores, breath"),
    _amb("amb_w8_torment", "the forges in a black storm: deep roar, a great hammer, embers, thunder"),
    _amb("amb_w9_torment", "the citadel in a storm: wind on the walls, banners whipping, a dark chime, thunder"),
    _amb("amb_w10_torment", "the Rift torn open: rift lightning, whooshes, breath in the dark"),
]

SOUND_MAP = {s.id: s for s in SOUNDS}
