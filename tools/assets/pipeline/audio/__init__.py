"""Sound (R7): every effect, interface sound and ambient bed is synthesised from the catalogue (`catalog.py`, recipes in
`recipes/`; only `ui_click` is an approved ElevenLabs take), levelled to its channel, encoded to MP3 and listed in
`src/assets/audio/manifest.json`.
Ported machinery (loudness measure, normalisation) from coop-game `tools/assets/audio`; no sounds or prompts from it.
"""
