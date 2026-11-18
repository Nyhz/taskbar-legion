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
    # Combate
    "knight_swing": "Golpe de espada del Caballero: un «fiu» de aire (3 tomas que el juego alterna)",
    "ranger_shot": "Disparo del Cazador: cuerda grave y suave y un soplo de flecha (3 tomas; ahora más oscuro, sin siseo)",
    "priest_strike": "Golpe básico del Sacerdote: un «tin» de luz y un soplo (3 tomas)",
    "hit": "Impacto sobre cualquiera: un «tup» pequeño y redondo (3 tomas)",
    "crit_hit": "Golpe crítico: el impacto con un «ping» diminuto encima (2 tomas)",
    "block": "Un héroe bloquea: un toque de escudo pequeño y suave (2 tomas)",
    "multi": "Segundo golpe de multigolpe: un tic rápido con su eco",
    "hero_hurt": "Golpe fuerte sobre un héroe: un golpe sordo y grave, sin voz (2 tomas)",
    "hero_down": "Cae un héroe: dos notas suaves que bajan",
    "enemy_die": "Muere un enemigo de la oleada: un «puf» (3 tomas)",
    "elite_die": "Muere un élite: un «puf» mayor con una nota grave (2 tomas)",
    "elite_arrive": "Llega un élite a la oleada: un crescendo grave y suave",
    "enemy_shot": "Disparo de un tirador enemigo: cuerda más ligera y aguda que la del Cazador (2 tomas)",
    "enemy_bolt": "Proyectil de un lanzador enemigo: un zumbido mágico suave (2 tomas)",
    "enemy_smash": "Golpe en área de un bruto: un «bum» grave y suave",
    # Habilidades
    "ab_knight_guard": "Piel de piedra: un roce pétreo que asienta en un golpe grave",
    "ab_knight_debilitate": "Tajo debilitante: un barrido amplio y un golpe sordo",
    "ab_knight_bulwark": "Baluarte: el escudo firme y un brillo grave",
    "ab_knight_battlecry": "Grito de guerra: sin voz, un crescendo corto como de cuerno",
    "ab_knight_bloodlust": "Sed de sangre: un latido doble y una subida rápida",
    "ab_knight_holdtheline": "Mantener la línea: el escudo clavado y un acorde grave y cálido",
    "ab_knight_riposte": "Réplica: un tintineo de parada y un contragolpe rápido",
    "ab_knight_riposte_charge": "Réplica gana una carga (cada bloqueo): un tic diminuto",
    "ab_priest_mend": "Sanar, del Sacerdote: dos notas de cristal suaves (antes «priest_mend»)",
    "ab_priest_healing_light": "Luz sanadora: tres notas de cristal rápidas que suben",
    "ab_priest_holyshield": "Escudo sagrado: una burbuja que se cierra con un destello",
    "ab_priest_nova": "Nova sagrada: un estallido suave de luz hacia fuera",
    "ab_priest_circle": "Círculo de sanación: un anillo de notas",
    "ab_priest_sanctuary": "Santuario: un crescendo cálido que se queda un momento, con una nota de cristal",
    "ab_priest_smite": "Castigo: un «tin» brillante y un rayo de luz suave que baja",
    "ab_ranger_fast_fire": "Fuego rápido: tres punteos rápidos que suben",
    "ab_ranger_aimedshot": "Disparo certero: una cuerda más grave y un soplo de flecha largo",
    "ab_ranger_multishot": "Lluvia de flechas: una andanada de soplos suaves",
    "ab_ranger_focus": "Flecha explosiva: un «pop» suave y luego un «bum» suave",
    "ab_ranger_frozentrap": "Abrojos: un lanzamiento y una lluvia de tintineos metálicos diminutos",
    "ab_ranger_weakspot": "Punto débil: el disparo y un «din» diminuto al marcar",
    "ab_ranger_tarflask": "Frasco de brea: un tintineo de vidrio y un chapoteo espeso",
    "ult_knight_laststand": "Definitiva del Caballero, Última resistencia: un gong grave y suave y una protección que sube",
    "ult_priest_enrage": "Definitiva del Sacerdote, Furia de batalla: un acorde que crece con un pulso que se acelera",
    "ult_ranger_mark": "Definitiva del Cazador, Marca del cazador: una nota grave de cuerno de caza y un «ping»",
    # Jefes
    "boss_appear": "Entra un jefe de etapa: un crescendo grave de dos notas",
    "world_boss_enter": "Entrar al portal del jefe de mundo: un remolino sobre un zumbido grave",
    "boss_charge_windup": "Jefe cargando el golpe cargado: un zumbido grave que crece",
    "boss_charge_impact": "Impacto del golpe cargado: un golpe sordo y grave",
    "boss_fury": "Furia del jefe: un retumbar grave y áspero que sube (sin voz)",
    "boss_down": "Jefe derrotado: un acorde cálido que resuelve, corto",
    "boss_slam": "Golpe al suelo del jefe de etapa: un aliento que se alza y el golpe",
    "boss_shockwave": "Onda de choque del jefe de mundo: un «bum» y una ola grave que se aleja",
    "boss_mortal_wound": "Herida Mortal: un tajo sordo y una nota oscura que cae",
    "boss_deadeye": "Certero: un silbido fino por el aire y un «toc» sordo",
    "boss_flock": "Mundo 1, la Madre de los Cuervos: sus cuervos salen en un revuelo de aleteos suaves",
    "boss_roots": "Mundo 2, Nuestra Señora del Muérdago: raíces, un crujido leñoso y grave",
    "boss_chain_bolt": "Mundo 3, la Luna Ahogada: un rayo que salta de héroe en héroe",
    "boss_guilt": "Mundo 4, el Chivo Expiatorio: Culpa, una campanada grave y oscura",
    "boss_gild": "Mundo 5, el Abad Dorado: Silencio Dorado, un brillo dorado que se congela",
    "boss_undertow": "Mundo 6, la Novena Ola: Resaca, una ola que rompe y arrastra hacia atrás",
    "boss_spores": "Mundo 7, el Ángel Destructor: esporas, soplos suaves que se posan",
    "boss_red_blade": "Mundo 8, el Temple: Hoja al Rojo, una llamarada y un chisporroteo oscuro",
    "boss_scales": "Mundo 9, el Veredicto: la Balanza, dos campanillas que se funden en una",
    "boss_mirror": "Mundo 10, el Deshacedor: Espejos, un brillo de cristal al revés",
    "boss_shatter": "Mundo 10: los seis espejos se rompen, cristal suave que cae y un «bum»",
    # Botín
    "chest_drop": "Cae un cofre común: un toque de madera y dos monedas (2 tomas)",
    "chest_drop_boss": "Cae un cofre de jefe de etapa: un golpe más pesado y unas monedas",
    "chest_drop_world": "Cae un cofre de jefe de mundo: un golpe pesado, monedas y una nota cálida",
    "chest_open": "Abrir un cofre: la tapa en dos toques suaves (2 tomas)",
    "chest_open_rare": "Abrir un cofre con objeto raro: la tapa y un pequeño destello que sube",
    "item_epic": "Aparece un objeto T5–T6: dos notas brillantes que suben",
    "item_legendary": "Aparece un objeto T7–T8 (el especial): una escala que sube y florece en un acorde",
    "gem_get": "Consigues una gema: un «tin» de cristal claro",
    "key_get": "Consigues una llave de jefe de mundo: un tintineo de llaves pequeño",
    "pet_found": "Encuentras una mascota: unos piídos saltarines y tres notas que suben",
    # Progreso
    "level_up": "Subida de nivel: tres notas cálidas que suben",
    "stage_clear": "Etapa superada: dos pasos y un acorde que llega a casa",
    "wipe": "Cae todo el grupo: tres notas graves y suaves que bajan",
    # Interfaz
    "ui_click": "Clic de interfaz: tu toma aprobada de ElevenLabs",
    "ui_hover": "Pasar el ratón por encima: el tic más pequeño, apenas audible",
    "ui_panel_open": "Abrir un panel: un «fiu» de papel muy corto (2 tomas)",
    "ui_panel_close": "Cerrar un panel: un «fiu» de papel hacia abajo (2 tomas)",
    "ui_tab": "Cambiar de pestaña: un tic de madera pequeño",
    "ui_equip": "Equipar: una palmada de cuero suave y un toque (2 tomas)",
    "ui_drop": "Soltar un objeto en una casilla: un «tunc» suave",
    "ui_error": "No se puede: un doble tic grave y suave",
    "ui_buy": "Comprar un rango de tecnología: un tic y una moneda",
    "ui_talent": "Gastar un punto de talento: un «blip» de cristal que sube",
    "ui_toggle": "Interruptor: tic-tac",
    # Cubo
    "cube_synth": "Sintetizar en el cubo: el cubo zumba y luego una campanilla",
    "cube_lucky": "Síntesis con suerte (salta dos niveles): el zumbido y un doble destello que sube",
    "cube_melt": "Fundir en el cubo: un burbujeo grave y dos monedas suaves",
    "cube_transfig": "Transfigurar: dos tonos que se cruzan al deslizarse",
    "cube_polish": "Pulir en el cubo: un frotado corto y un destello (frotado más oscuro, sin siseo)",
    "cube_perfect": "Sale un afijo ★: el destello y una pequeña campanilla de estrella",
    # Ambiente (bucles de 24 s: un fondo casi inaudible y detalles que se notan)
    "amb_w1": "Mundo 1, Praderas doradas: grillos, pajarillos, un silbido lejano y la hierba que se mueve",
    "amb_w2": "Mundo 2, Bosque viejo de musgo: hojas, un pájaro carpintero lejano, un búho suave, pájaros en las copas",
    "amb_w3": "Mundo 3, Marismas de los Pilotes: ranas por turnos, agua que lame los pilotes, chapoteos",
    "amb_w4": "Mundo 4, Cañones de Roca Roja: viento que silba en la roca, piedrecillas que caen, un halcón lejano",
    "amb_w5": "Mundo 5, Cumbres del Monasterio: viento fino, una campana lejana en el valle, campanillas de viento",
    "amb_w6": "Mundo 6, Costa de las Ruinas Hundidas: olas suaves, gaviotas lejanas, goteos",
    "amb_w7": "Mundo 7, Cavernas de cristal y hongos: gotas con eco, cristales que suenan solos, un zumbido grave",
    "amb_w8": "Mundo 8, Tierras de ceniza y forjas: brasas, un yunque lejano, un horno que respira, roca que burbujea",
    "amb_w9": "Mundo 9, Ciudadela entre las nubes: campanillas en el aire, estandartes lejanos, viento alto",
    "amb_w10": "Mundo 10, la Grieta: soplos que fasean, tonos extraños que bajan, cristal al revés",
    "amb_w1_torment": "Mundo 1 en Tormento: truenos lejanos, ráfagas y gotas gruesas",
    "amb_w2_torment": "Mundo 2 en Tormento: troncos que crujen, un búho grave, respiraciones en la oscuridad, una tormenta lejana",
    "amb_w3_torment": "Mundo 3 en Tormento: cortinas de lluvia, truenos y ranas graves",
    "amb_w4_torment": "Mundo 4 en Tormento: tormenta de polvo, ráfagas, la roca que aúlla, piedras y truenos",
    "amb_w5_torment": "Mundo 5 en Tormento: ventisca que aúlla, una campana muy grave y truenos lejanos",
    "amb_w6_torment": "Mundo 6 en Tormento: temporal, olas pesadas, lluvia y truenos",
    "amb_w7_torment": "Mundo 7 en Tormento: un latido en la roca, gotas graves, esporas y respiraciones",
    "amb_w8_torment": "Mundo 8 en Tormento: rugido profundo, un gran martillo lejano, brasas y truenos",
    "amb_w9_torment": "Mundo 9 en Tormento: viento en las murallas, estandartes que restallan, una campanilla oscura y truenos",
    "amb_w10_torment": "Mundo 10 en Tormento: relámpagos de la Grieta, soplos y respiraciones en la oscuridad",
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
