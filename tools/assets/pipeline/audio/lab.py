"""The lab's sound section: every sound of the run with a player per take, grouped, with what it is for in Spanish.

Writes `docs/redesign/lab/sound.html` (a pending.json section points at it with "html"); the publisher inlines the
MP3s as data URIs like the images.
"""
from __future__ import annotations

import html
import json

from .catalog import SOUND_MAP
from .eleven import ROOT

LAB = ROOT / "docs" / "redesign" / "lab"

#: What each sample is for, as the user reads it.
WHAT_ES: dict[str, str] = {
    "knight_swing": "Golpe de espada del Caballero (cada golpe; 3 variantes al azar)",
    "hit_flesh": "Impacto sobre un enemigo (3 variantes)",
    "ranger_shot": "Disparo del Cazador: cuerda y flecha (3 variantes)",
    "crit_hit": "Golpe crítico (2 variantes)",
    "enemy_die": "Muerte de un enemigo (3 variantes)",
    "priest_mend": "Sanación del Sacerdote (Mend)",
    "boss_charge_windup": "Jefe cargando el golpe cargado (aviso)",
    "boss_charge_impact": "Impacto del golpe cargado",
    "chest_drop": "Cae un cofre",
    "chest_open_rare": "Abrir un cofre raro",
    "level_up": "Subida de nivel",
    "ui_click": "Clic de interfaz (2 variantes)",
    "ui_panel_open": "Abrir un panel",
    "cube_polish": "Pulir en el cubo",
    "amb_w1": "Ambiente del mundo 1, Praderas Doradas (bucle de ~22 s)",
    "amb_w1_torment": "Ambiente del mundo 1 en Tormento (bucle de ~22 s)",
}

GROUP_ES = {
    "combat": "Combate", "ability": "Habilidades", "boss": "Jefes", "loot": "Botín", "progress": "Progreso",
    "interface": "Interfaz", "cube": "Cubo", "ambient": "Ambiente",
}


def main() -> None:
    manifest = json.loads((ROOT / "src" / "assets" / "audio" / "manifest.json").read_text())
    groups: dict[str, list[str]] = {}
    for sid, m in manifest.items():
        groups.setdefault(m["group"], []).append(sid)
    out = []
    for group in GROUP_ES:
        if group not in groups:
            continue
        out.append('<div class="item-group">')
        out.append(f"<h3>{GROUP_ES[group]}</h3>")
        out.append('<table class="rv"><tr><th>Sonido</th><th>Para qué</th><th>Escuchar</th></tr>')
        for sid in groups[group]:
            m = manifest[sid]
            players = "".join(
                f'<audio controls preload="none" {"loop " if m["loop"] else ""}src="audio/{f}" style="height:32px;max-width:100%"></audio>'
                for f in m["files"]
            )
            prompt = html.escape(SOUND_MAP[sid].prompt)
            out.append(
                f'<tr><td>{sid}</td><td>{html.escape(WHAT_ES.get(sid, ""))}<br><span class="muted mono">«{prompt}»</span></td>'
                f'<td style="display:grid;gap:4px">{players}</td></tr>'
            )
        out.append("</table></div>")
    (LAB / "sound.html").write_text("\n".join(out) + "\n")
    print(f"lab: sound section with {len(manifest)} sounds → {LAB / 'sound.html'}")
