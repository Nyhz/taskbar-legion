"""The lab's sound section: every sound of the run with a player per take, grouped, with what it is for in Spanish.

Writes `docs/redesign/lab/sound.html` (a pending.json section points at it with "html"); the publisher inlines the
MP3s as data URIs like the images.
"""
from __future__ import annotations

import html
import json

from .eleven import ROOT

LAB = ROOT / "docs" / "redesign" / "lab"

#: What each sample is for, as the user reads it.
WHAT_ES: dict[str, str] = {
    "knight_swing": "Golpe de espada del Caballero: un «fiu» de aire (3 tomas que el juego alterna)",
    "hit": "Impacto sobre un enemigo: un «tup» pequeño y redondo (3 tomas)",
    "ranger_shot": "Disparo del Cazador: cuerda grave y suave y un soplo de flecha (3 tomas)",
    "crit_hit": "Golpe crítico: el impacto con un «ping» diminuto encima (2 tomas)",
    "enemy_die": "Muerte de un enemigo: un «puf» (3 tomas)",
    "priest_mend": "Sanación del Sacerdote: dos notas de cristal suaves",
    "boss_charge_windup": "Jefe cargando el golpe cargado: un zumbido grave que crece",
    "boss_charge_impact": "Impacto del golpe cargado: un golpe sordo y grave",
    "chest_drop": "Cae un cofre: un toque de madera y dos monedas (2 tomas)",
    "chest_open_rare": "Abrir un cofre raro: la tapa y un pequeño destello que sube",
    "level_up": "Subida de nivel: tres notas cálidas que suben",
    "ui_click": "Clic de interfaz: tu toma aprobada de ElevenLabs",
    "ui_panel_open": "Abrir un panel: un «fiu» de papel muy corto (2 tomas)",
    "cube_polish": "Pulir en el cubo: un frotado corto y un destello",
    "amb_w1": "Ambiente del mundo 1: brisa suave, grillos y algún pájaro lejano (bucle de 24 s)",
    "amb_w1_torment": "Ambiente del mundo 1 en Tormento: viento oscuro y truenos lejanos y suaves (bucle de 24 s)",
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
            out.append(
                f'<tr><td>{sid}</td><td>{html.escape(WHAT_ES.get(sid, ""))}</td>'
                f'<td style="display:grid;gap:4px">{players}</td></tr>'
            )
        out.append("</table></div>")
    (LAB / "sound.html").write_text("\n".join(out) + "\n")
    print(f"lab: sound section with {len(manifest)} sounds → {LAB / 'sound.html'}")
