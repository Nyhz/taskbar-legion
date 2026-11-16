# Informe del reajuste de ritmo (2026-11-15)

> **Léeme primero: Ronda 2 — punto de control 2 (cerrado a medias a propósito).** La sección «Ronda 2» de abajo es
> el estado de hoy. Todo lo que viene después de ella (secciones 0–11 y apéndice) es el **punto de control 1** y sus
> cifras de duración, llave, reclutas y niveles **ya no valen**; lo que sí sigue valiendo de allí es cómo se anclan
> los enemigos (2.1–2.5), la sonda (8) y lo que consideré y no cambié (10).
> Normal e Infierno están afinados con tus decisiones de la ronda 2. **Averno está afinado pero sin validar; Eterno
> y Tormento están en grueso.** No se pule más ahora porque la segunda ola de combate (pasivas, reglas reactivas,
> afijos y mecánicas de jefe) obliga a volver a pasar el afinador de todas formas.

# Ronda 2

## R.0 En diez líneas

- **Normal se pasa en unas 3½ horas**: cada mundo dura de 20 a 30 minutos y su jefe cae con la primera llave.
- **Infierno dura unas 42 horas** (objetivo 40): cada mundo de 3 a 6½ horas, de 2 a 4 intentos por muro.
- **Averno: unas 121 horas** (objetivo 120) en las cuatro partidas con que se afinó; sin validar en otras.
- **Eterno y Tormento: en grueso.** La última pasada completa daba 240 y 325 horas (objetivos 230 y 325) y un juego
  entero de 651 a 894 horas (objetivo 720), pero con una furia algo más blanda que la que queda puesta.
- **Furia a los 60 s** en jefes de mundo y de etapa; pasada la ventana el daño del jefe **se duplica cada 2 s**
  (antes ventana de 30 s y cada 5 s). El jugador medio mata su muro con el reloj del jefe entre 65 y 75 s: aguanta
  de 5 a 15 s de furia.
- **«Equipado al X % de la zona» ya es una medida**, no una impresión (R.5). En Normal el muro pide un 10 % de lo
  que da la zona; a mitad de Infierno un 85 %; al final de Infierno, un 105 %. La exigencia sube sola con la
  dificultad, que es lo que pediste.
- **Un hallazgo que cambia cómo leer tu regla del 80–90 %**: en este juego **no existe «el equipo completo de la
  zona»**. Abrir más cofres del mismo mundo sigue subiendo el daño sin techo a la vista (R.5). La regla necesita
  que elijas qué es el 100 %; te propongo uno.
- **Me he apartado de una decisión tuya**: en Normal cada cofre de jefe de etapa trae llave (dijiste 25 %). Sin eso
  Normal no baja de unas 15 horas (R.2).
- **No está hecho**: mascotas, curva completa de «equipo viejo», validación con ocho partidas, y poner al día el
  resto de este informe y `docs/DIFFICULTY.md` §6b–§8.
- Sin commit. Typecheck, lint y tests en verde.

## R.1 Lo que decidiste y qué he hecho con cada cosa

| Tu decisión | Estado |
|---|---|
| Cofre de jefe de etapa al 25 % y llave al 25 % | Hecho de Infierno en adelante: una llave cada ~16 jefes de etapa. **En Normal, 100 %** (cambio mío, R.2). |
| Normal en 3–4 h; cada dificultad más larga y más exigente; ~3 meses en total | Reparto que he usado como objetivo: **4 · 40 · 120 · 230 · 325 h**. Normal e Infierno, conseguido; el resto, R.3. |
| Intentos fallidos en los muros tardíos: «está bien así» | Sin tocar. Con la llave más barata salen más intentos por muro (cada uno cuesta menos espera). |
| Apertura automática 30 → 12 min | Sin tocar. |
| Mascotas: volver a medir con las bajas nuevas | **Pendiente.** Se mata bastante menos en Normal (dura 3½ h, no 75): hay que recalcular al final, con el juego ya afinado. |
| Golpes por enemigo: orientativo; que no sea «faceroll»; el requisito de equipo debe notarse más cuanto más lejos | Anclajes como guía (2,5 golpes, 7,5 s de jefe de etapa). El requisito de equipo se mide en R.5 y R.6. |
| Furia a 60 s; matar a los 60 s = equipado al 80–90 % de la zona; con menos, aguantar unos segundos de furia | Ventana y rampa puestas. Definición y medida del porcentaje, hechas. **Los muros siguen afinados por horas, no por ese porcentaje** (R.5 explica por qué y qué falta decidir). |

## R.2 Lo que ha cambiado desde el punto de control 1

| Qué | Punto de control 1 | Ahora | Dónde |
|---|---|---|---|
| Llave en el cofre de jefe de etapa | 10 % | **25 %; en Normal 100 %** | `data/chests.ts` `STAGE_KEY_DROP_CHANCE`, `…_BY_DIFFICULTY` |
| Oleadas por etapa | 20 siempre | **8 · 12 · 16 · 20 · 20** según dificultad | `data/stageScaling.ts` `WAVES_BY_DIFFICULTY` |
| Ventana de furia (jefe de mundo y de etapa) | 30 s | **60 s** | `ZONE_ENRAGE_MS`, `STAGE_ENRAGE_MS` |
| Rampa de furia (el daño se duplica cada…) | 5 s | **2 s** | `BOSS_ENRAGE_RAMP_MS` |
| Muros de Normal | con muro desde el mundo 4 | **sin muro: caen con la primera llave** | `WORLD_WALL_MULT` (mundos 1–10) |
| Muros de Infierno a Tormento | para 75–215 h por dificultad | para 40–325 h por dificultad, con la furia nueva | `WORLD_WALL_MULT` |
| Vida de enemigos y jefes de etapa, daño de enemigos | tablas del punto 1 | vueltas a medir con las reglas nuevas | `GRUNT_HP_TUNE`, `STAGE_BOSS_HP_TUNE`, `TRASH_DMG_TUNE` |
| Reclutar | casillas 600 / 1.200, clase 300 | **casillas 300 / 600, clase 150** | `data/techTree.ts`, `data/classes.ts` |
| Curva de experiencia | términos medios ×1,2 y cola de 50 M | más barata: exponente medio 1,05 y cola de 2 M | `XP_MID_EXP`, `XP_TAIL` |
| Intento fallido en la sonda | cuesta 60 s | cuesta 80 s (el combate ya dura 60 más la furia) | `test/sim/probe/loop.ts` |

**Por qué las oleadas por dificultad.** Con 20 oleadas una etapa de Normal dura de 4 a 12 minutos; cien etapas son
más de diez horas sin contar jefes. Con 8 oleadas, una etapa X-1 de Normal dura 1¼ minutos y una X-9 unos 3. Es
también una forma directa de que cada dificultad «pese» más que la anterior.

**Por qué la llave al 100 % en Normal (mi desviación).** Al 25 %, una llave son unos 16 jefes de etapa. En Normal
eso es casi una hora de espera por mundo: diez mundos, diez horas solo en llaves. Con «Normal en 3–4 h» no cabe.
Con una llave en cada cofre, nueve de cada diez jugadores llegan al jefe con la suya. Si prefieres el 25 % también
en Normal, Normal se va a unas 12–15 h.

**Por qué reclutar más barato.** Normal entero dura lo que antes duraba el primer mundo: con los precios del punto
1, la Priest llegaba cuando ya se había pasado un cuarto de la dificultad.

## R.3 Duración: hacia dónde va

Horas de juego por mundo, media de cuatro partidas simuladas (las mismas con que se afinó: todavía **no** hay
validación con partidas distintas).

| Dificultad | Objetivo | Medido | Cada mundo | Estado |
|---|---|---|---|---|
| Normal | 4 h | **3,4 h** | 0,3–0,5 h | Afinado |
| Infierno | 40 h | **42 h** | 2,8 · 3,2 · 3,3 · 3,1 · 4,5 · 4,5 · 3,4 · 5,1 · 6,7 · 5,2 | Afinado |
| Averno | 120 h | **121 h** | 9,0 · 10,9 · 9,4 · 12,9 · 11,9 · 13,7 · 11,7 · 12,8 · 13,5 · 15,3 | Afinado, sin validar |
| Eterno | 230 h | ~240 h en la última pasada completa | 17,6 · 17,9 · 19,5 · 18,6 · 25,1 · 22,2 · 29,3 · 29,1 · … | **En grueso** |
| Tormento | 325 h | ~325 h en la última pasada completa | 27 → 40 | **En grueso** |

«En grueso» quiere decir: la pasada con la rampa de furia a 2 s se cortó en Eterno 9 para cerrar este punto de
control. Los nueve primeros muros de Eterno son de esa pasada; **Eterno 10 y todo Tormento vienen de la pasada
anterior, hecha con la rampa a 3 s**, y con la rampa a 2 s quedan algo más duros de lo que deberían (quizá un
5–10 % de vida de más, que en horas puede ser bastante: R.8).

Nivel del grupo al acabar cada dificultad: **20 · 48 · 73 · ~97 · ~120** (el tope llega en los últimos mundos de
Tormento).

### Qué hace largo un mundo ahora

| | Normal | Infierno | Averno |
|---|---|---|---|
| Etapa X-1 | 1¼ min | 2–2½ min | 3 min |
| Etapa X-9 | 2½–3½ min | 5–9 min | 7–9 min |
| Pasar las nueve etapas | 20 min | 35 min | 45 min |
| Espera media de una llave | ninguna (la trae cada cofre) | 1½–2½ h | 2–2½ h (hasta 4) |
| Intentos por muro (media) | 1 | 2–4 | 4–8 |
| Golpes por enemigo normal | 2–3 (banda de la guía) | 2,2–3,3 | 2,3–2,8 |
| Jefe de etapa | 6–9 s | 7–8½ s | 7–8½ s |

En Infierno y Averno el tiempo de un mundo es, sobre todo, **llaves por intentos**: cada intento fallido cuesta
otras dos horas de X-9, que son también las horas en que el grupo se equipa.

### La primera hora (partida nueva, una simulación)

| Minuto | Qué pasa |
|---|---|
| 2½ | El Knight solo supera 1-1 (nivel 4). |
| 5 | Supera 1-2 (nivel 5). |
| 8 | Supera 1-3 y **recluta al Ranger**. |
| 10–12 | 1-4 y 1-5 (niveles 8 y 6). |
| 18 | 1-6 tras una derrota; **recluta a la Priest**. |
| 20–26 | 1-7, 1-8, 1-9 (grupo de nivel 10/10/8). |
| 26 | **Jefe del mundo 1 con la primera llave**: 62 s de combate, la vida del grupo baja al 43 %. |
| 29–42 | Mundo 2, una etapa cada minuto y medio. Su jefe cae en 25 s. |
| 60 | Entrando en el mundo 4. |

El jefe del mundo 1 es el único de Normal que dura su minuto entero; los demás caen en 15–25 s (R.4).

## R.4 Los muros a 60 s

- **Regla**: el jefe pega lo que pone durante 60 s; después su daño se duplica cada 2 s (×6 a los 5 s, ×32 a los
  10 s).
- **Cómo queda el combate del jugador medio** (reloj del jefe en el momento de matarlo, mediana de cuatro
  partidas):

| Tramo | Reloj del jefe al morir | Furia aguantada |
|---|---|---|
| Normal, mundo 1 | 62 s | 2 s |
| Normal, mundos 2–10 | 16–46 s | ninguna: no hay muro |
| Infierno, mundos 1–2 | 24–26 s | ninguna |
| Infierno, mundos 3–10 | 65–74 s | 5–14 s |
| Averno | 68–76 s | 8–16 s |
| Eterno (lo afinado) | 73–75 s | 13–15 s |

- **Por qué el jugador medio no mata «justo a los 60»**: la sonda intenta el muro en cuanto tiene llave, así que su
  primera victoria es, por definición, la del grupo más flojo que puede con él: uno que necesita unos segundos de
  furia. El grupo que mata a los 60 s justos es un 10–20 % más fuerte que ese.
- **Cuánta furia aguanta un grupo**: con la rampa a 3 s los grupos de Infierno caían a los 13–17 s de furia y los
  de Tormento aguantaban 18–26 s (daño ×60 a ×400): demasiado para «unos segundos». Por eso la he dejado en 2 s:
  unos 10 s en Infierno y hasta 15 en lo profundo. **El tanque aguanta cada vez más furia cuanto más avanza el
  juego**: el daño del muro (`ZONE_BOSS_DMG_MULT`, una sola cifra para todo el juego) se queda corto frente a la
  defensa de Eterno y Tormento. No lo he tocado: es justo donde entrarán las mecánicas y afijos de jefe.

## R.5 «Equipado al X % de la zona»: la definición y lo que mide

**Definición** (`test/sim/probe/zoneGear.ts`, con tests):

> porcentaje de equipo de un grupo en un mundo = daño que ese grupo le hace al jefe de ese mundo en sus 60 s
> ÷ daño que le hacen **los mismos héroes** (mismo nivel y talentos) vestidos con **el equipo de la zona**.

**El equipo de la zona** = esos héroes desnudos, vestidos con lo mejor de **240 cofres de jefe de etapa de ese
mundo** (unas siete piezas candidatas por casilla), gemas puestas, con la misma regla de equiparse que usa la
sonda. Se promedia sobre cinco tiradas distintas de esos cofres.

Con esa medida, un muro cuya vida sea el 85 % del daño del equipo de la zona muere a los 60 s justos ante un grupo
al 85 %. Así se puede escribir tu regla en un número por muro.

**Lo medido** (tres partidas; hecho con la rampa a 3 s, los muros de Normal e Infierno son prácticamente los de
ahora):

| Mundo | Nivel | Reloj del jefe al morir | % de equipo del grupo al matarlo | El muro pide (mata a los 60 s justos) |
|---|---|---|---|---|
| Normal 1 | 10 | 61 s | 2 % | 11 % |
| Normal 2–10 | 12–21 | 15–42 s | 11–23 % | 8–13 % |
| Infierno 1 | 30 | 21 s | 45 % | 18 % |
| Infierno 2 | 31 | 30 s | 49 % | 27 % |
| Infierno 3 | 33 | 59 s | 58 % | 59 % |
| Infierno 4 | 36 | 67 s | 61 % | 68 % |
| Infierno 5 | 37 | 67 s | 74 % | 86 % |
| Infierno 6 | 38 | 70 s | 63 % | 75 % |
| Infierno 7 | 41 | 67 s | 69 % | 84 % |
| Infierno 8 | 42 | 74 s | 64 % | 86 % |
| Infierno 9 | 42 | 74 s | 80 % | 105 % |
| Infierno 10 | 47 | 74 s | 82 % | 103 % |
| Averno 1–4 | 50–58 | 69–76 s | 81–88 % | 103–107 % |

**El mismo muro contra el mismo jugador con equipo más viejo** (tres partidas; «mata» = cuántas de las tres):

| Muro | El grupo | % de equipo | Mata | Reloj al matar | Si no mata, cae a los |
|---|---|---|---|---|---|
| **Normal 5-10** (pide 9 %) | con el equipo de la zona | 106 % | 3/3 | 5 s | — |
| | tal como lo mató | 15 % | 3/3 | 17 s | — |
| | como estaba 1 mundo antes | 10 % | 2/3 | 18 s | 40 s |
| | 2 mundos antes | 5 % | 0/3 | — | 30 s |
| **Infierno 5-10** (pide 86 %) | con el equipo de la zona | 94 % | 3/3 | 53 s | — |
| | tal como lo mató | 74 % | 3/3 | 69 s | — |
| | 1 mundo antes | 67 % | 1/3 | 69 s | 73 s |
| | 2 mundos antes | 46 % | 0/3 | — | 71 s |
| | 4 mundos antes | 17 % | 0/3 | — | 45 s |
| **Infierno 9-10** (pide 105 %) | con el equipo de la zona | 103 % | 3/3 | 60 s | — |
| | tal como lo mató | 80 % | 2/3 | 73 s | 76 s |
| | 1 mundo antes | 68 % | 0/3 | — | 77 s |
| | 4 mundos antes | 51 % | 0/3 | — | 73 s |
| | 8 mundos antes | 9 % | 0/3 | — | 34 s |

Lectura: en Infierno 9-10, con el equipo de la zona se mata a los 60 s justos; con un 80 % se mata aguantando 13 s
de furia; con un 68 % ya no. **Es la forma de tu regla, pero desplazada**: hoy «matar a los 60 s» equivale al
100 % de esta referencia, no al 80–90 %.

**El hallazgo: no hay «equipo completo de la zona».** Daño del equipo de la zona según de cuántos cofres se elige
(relativo a 240):

| Cofres | 33 | 60 | 120 | 240 | 400 | 600 | 1.000 | 2.000 |
|---|---|---|---|---|---|---|---|---|
| Infierno 5 | 0,32 | 0,55 | 0,72 | 1 | 1,19 | 1,32 | 1,58 | 2,16 |
| Averno 5 | 0,23 | 0,45 | 0,71 | 1 | 1,26 | 1,51 | 1,96 | 2,74 |
| Tormento 5 | 0,15 | 0,36 | 0,56 | 1 | 1,50 | 1,72 | 2,42 | 3,01 |

Cada vez que se duplican los cofres, el daño sube un 30–50 %, y a los 2.000 cofres sigue subiendo: las rarezas
altas son tan escasas y pesan tanto que siempre queda una pieza mejor por salir. Además, de un mundo al siguiente
el equipo de la misma rareza solo mejora un 3–5 %: lo que hace fuerte a un grupo es la rareza acumulada de
**varios** mundos, no tener piezas del mundo en que está. Por eso «el 100 % de la zona» hay que elegirlo:

- Con **240 cofres** como 100 %, los muros de Infierno tardío y Averno piden un 103–107 %.
- Con unos **400 cofres** (una docena de candidatas por casilla) pedirían en torno al **85 %**, que es tu regla, y
  el jugador medio los mataría con un 65–70 % aguantando unos 10–13 s de furia.

Es la misma dificultad con otra vara de medir; lo que cambia es qué número ves. **Necesito que elijas la vara**
(R.9) antes de la pasada final, porque el afinador puede fijar la vida de cada muro directamente como «85 % del
equipo de la zona» en vez de por horas — pero entonces las horas de cada mundo pasan a depender del botín, y habría
que ajustarlas con otra palanca (oleadas por etapa, por ejemplo).

## R.6 Equipo viejo: lo que hay medido

Solo lo de la tabla anterior y una prueba corta en Normal (una partida, equipo congelado: sube de nivel y abre
cofres, pero no se pone nada nuevo):

- Congelado al acabar el mundo 3 de Normal: pasa un mundo más y se queda en 5-10 (9 intentos perdidos).
- Congelado al acabar el mundo 6: termina Normal y se queda en Infierno 1-10.

La curva completa por dificultad (`scripts/measure-gear-gate.ts`) **no está pasada**: tiene sentido medirla con el
juego ya afinado. Lo que sí se ve ya: en Normal un grupo dos mundos por detrás deja de poder; en Infierno 5, uno
solo. El test ligero de que la curva no se invierte tampoco está escrito.

## R.7 Lo que NO está afinado, dicho claro

1. **Eterno y Tormento**: muros en grueso (R.3). No fiarse de sus horas.
2. **Averno**: afinado con cuatro partidas, sin comprobar en otras cuatro.
3. **Ninguna validación con ocho partidas** de la ronda 2. Las cifras de R.3 son de las partidas de afinado.
4. **Mascotas**: probabilidades sin recalcular; siguen las del punto 1 (calculadas para un Normal de 75 h).
5. **Objetivos de las mascotas** (rangos): igual.
6. **El resto de este informe** (secciones 0–11 y apéndice) y `docs/DIFFICULTY.md` §6b, §7 y §8: cifras del punto
   de control 1.
7. **El daño de los muros** frente a la defensa de Eterno y Tormento (R.4).
8. **Normal se pasa con muy poco equipo**: en los dos primeros muros el grupo lleva unas 5 casillas de 33, y en
   todo Normal no pasa del 23 % de lo que da la zona. Es la consecuencia directa de «Normal en 3–4 h» con cofres
   al 0,2 % y 25 %: en 3½ h caen unos 30 objetos. El equipo empieza de verdad en Infierno. Si no lo quieres así,
   la palanca es que en Normal el jefe de etapa suelte cofre más a menudo.

## R.8 Lo que hará falta tras la segunda ola de combate

| Paso | Con qué | Cuánto tarda |
|---|---|---|
| 1. Pasada completa (anclajes y muros) | `TUNE_SEEDS=4 npx vite-node scripts/tune-pacing.ts > salida.txt` | 1½–2 h |
| 2. Escribir las tablas | `python3 scripts/tune-pacing-apply.py salida.txt` (suaviza y escribe `stageScaling.ts` y la referencia de los tests) | segundos |
| 3. Solo muros, si se toca la furia o el daño de jefe | `TUNE_KEEP=1 TUNE_SEEDS=4 npx vite-node scripts/tune-pacing.ts`, luego `python3 scripts/tune-pacing-apply-walls.py salida.txt` | 30 min |
| 4. Validar | `PROBE_SEEDS=4 npm run probe` y `PROBE_SEEDS=4 PROBE_SEED_FROM=5 npm run probe` (con `PROBE_GEAR=1` añade el % de equipo en cada muro) | 10–20 min cada una |
| 5. Medidores | `scripts/measure-anchors.ts` (golpes, segundos, minutos por etapa), `scripts/measure-gear-percent.ts` (R.5), `scripts/measure-gear-gate.ts` (R.6) | 5–15 min cada uno |
| 6. Mascotas, documentos, este informe | a mano, con las cifras del paso 4 | — |

**Palancas, cada una por separado:**

| Palanca | Qué mueve | Dónde |
|---|---|---|
| Vida del muro | cuánto equipo pide; las horas del mundo | `WORLD_WALL_MULT` |
| Daño del muro | si el tanque y la Priest aguantan los 60 s | `ZONE_BOSS_DMG_MULT` |
| Ventana y rampa de furia | cuánto dura el combate; cuántos segundos de margen tiene el que va justo | `ZONE_ENRAGE_MS`, `BOSS_ENRAGE_RAMP_MS` |
| Oleadas por etapa | minutos por etapa y, con ello, horas por llave | `WAVES_BY_DIFFICULTY` |
| Llave | espera entre intentos | `STAGE_KEY_DROP_CHANCE_BY_DIFFICULTY` |
| Vida de enemigos y jefes de etapa | golpes y segundos (guía: 2–3 golpes, 5–10 s) | `GRUNT_HP_TUNE`, `STAGE_BOSS_HP_TUNE` |
| Daño de enemigos normales | si el grupo que llega limpia la etapa sin caer | `TRASH_DMG_TUNE` |

Aviso que sigue en pie: la respuesta es muy sensible. Un muro un 3–5 % más duro puede duplicar las horas de un
mundo. Nunca afinar mirando un mundo o una partida.

## R.9 Lo que tienes que decidir

1. **La llave en Normal**: 100 % (como está, Normal 3½ h) o tu 25 % (Normal 12–15 h).
2. **Qué es el 100 % de la zona** (R.5): lo mejor de 240 cofres del mundo (los muros piden ~105 %) o de unos 400
   (pedirían ~85 %, tu regla). O dime otra idea de «nivel de la zona» — por ejemplo, por casillas con piezas del
   mundo — sabiendo que entre mundos vecinos el equipo apenas cambia un 3–5 %.
3. **Muros por horas o por porcentaje**: hoy cada muro se fija para que el mundo dure su objetivo y el porcentaje
   es lo que sale. Se puede hacer al revés (R.5), ajustando luego las horas con las oleadas.
4. **La rampa de furia**: 2 s (como está: 5–15 s de margen), 1,5 s (más seco: 5–10 s) o 3 s (15–25 s en lo
   profundo).
5. **Normal casi sin equipo** (R.7, punto 8): dejarlo o subir el cofre de jefe de etapa en Normal.

---

# Punto de control 1 (cifras anteriores a la ronda 2)

Para que apruebes o rechaces **punto por punto**. Cada cambio dice qué había, qué hay, dónde vive, por qué y qué
hace jugando. Nada está en un commit. Todo lo medido sale de la sonda (`npm run probe`: el «jugador medio»,
grupo Knight · Ranger · Priest, 8 h de juego al día, partida nueva con un Knight desnudo) y de dos medidores
nuevos; los números completos van en el apéndice.

## 0. En diez líneas

- **Duración**: el juego entero queda **entre 79 y 106 días a 8 h diarias** en ocho partidas simuladas (mediana
  89 días, unas 710 h de juego); las ocho terminan y ninguna se atasca. Objetivo: ~90 días, ~720 h. Antes del
  reajuste, con tus cambios de botín de hoy ya puestos, las dos partidas simuladas se quedaban atascadas para
  siempre en Averno 1-10.
- **Esto es el punto de control 1**: lo que sigue fuera de objetivo (sección 9) queda para una segunda pasada,
  cuando lo hayas leído y jugado.
- **Enemigos anclados a tus cifras**: un enemigo normal aguanta **2,5 golpes** del héroe que más pega con el
  equipo del mundo anterior (banda 2–3), un élite **unos 11**, un jefe de etapa **7,5 s** (banda 5–10) contra el
  grupo entero. En todos los mundos de todas las dificultades. Antes, un grupo con equipo honrado del mundo 1
  mataba un enemigo de 2-9 con **0,46 golpes** y a su jefe en **3,6 s**.
- **Ritmo de etapa**: una etapa X-1 dura unos **3½–4 minutos** y una X-9 unos **9–12**, a cualquier
  profundidad. Antes: 2 y 3½ minutos, y con tu equipo actual, cuatro etapas en cinco minutos.
- **Primeras horas**: 1-1 a los 5 minutos, Ranger a los 17, Priest a los 40, 1-9 a la hora. El jefe del mundo 1
  cayó entre 1,1 y 7,3 horas en cuatro partidas (mediana 2,9), según cuándo sale la primera llave.
- **Qué hace largo un mundo**: el paso por sus nueve etapas (una hora), **la espera de la llave** (unas 42
  repeticiones de X-9: de 4 a 8 horas por llave) y los intentos fallidos contra el muro (de 1 a 2 en Normal,
  hasta 7–8 en algunos mundos de Eterno y Tormento).
- **Lo que he tocado**: vida de los enemigos por rango (tablas medidas), daño de los enemigos normales, los muros,
  la curva de experiencia, el precio de reclutar y el arranque. **No he tocado** clases, talentos, habilidades,
  objetos, cofres, llaves ni la escalera de rareza: tus decisiones de hoy siguen como las dejaste.
- **Lo que tienes que decidir** está en la sección 9. Lo principal: la llave. Con 1 llave cada ~40 jefes de
  etapa, la llave pesa más en la duración de cada mundo que el propio jefe.

## 1. Cómo se ha medido

| Herramienta | Qué hace |
|---|---|
| `npm run probe` | La sonda de siempre, ahora fiel a las reglas de hoy (sección 8). Informa de horas por dificultad y por mundo, al lado del objetivo. |
| `npx vite-node scripts/measure-anchors.ts` | Recorre el juego con el grupo de la sonda y mide, al llegar a cada mundo y ante su muro: golpes por enemigo (por clase), segundos del jefe de etapa y minutos por etapa. |
| `npx vite-node scripts/tune-pacing.ts` | El afinador. Una pasada por los 50 mundos: fija la vida de enemigos y jefes de etapa contra el grupo que llega con el equipo del mundo anterior y luego el muro por bisección sobre las horas que tardan de verdad las partidas simuladas, llaves incluidas. Imprime las tablas; no escribe nada. |
| `test/sim/anchors.test.ts` | Fija los anclajes: si alguien cambia las tablas y un enemigo sale de sus 2–3 golpes o un jefe de sus 5–10 s, falla. |

Aviso sobre el ruido: el poder de un grupo se estanca cuando ya ha recogido el equipo de un mundo, así que un
muro un 3 % más duro puede duplicar las horas de ese mundo, y la llave es una lotería (una de cada cinco partidas
llega al jefe con llave; una con mala suerte espera el triple de la media). Un mundo suelto en una partida suelta
oscila entre media hora y cincuenta. **Solo significan algo los totales por dificultad y sobre varias partidas.**

## 2. Enemigos

### 2.1 Vida de los enemigos normales — anclada a 2–3 golpes  ·  *cambio grande*

- **Antes**: una fórmula (`HP0 · Φ · gearTrack`) que intentaba adivinar cuánto equipo llevaría el jugador. Con el
  botín de hoy quedaba muy por debajo: en Normal el Ranger mataba de un golpe con dos o tres veces la vida del
  enemigo de sobra (0,3–0,5 golpes) y el Knight en 1–1,5.
- **Ahora**: una tabla, `GRUNT_HP_TUNE` (`src/data/stageScaling.ts`), con la vida del enemigo normal en cada
  punto: las nueve etapas del mundo 1 una a una y luego un valor por mundo. Cada valor es **2,5 golpes básicos del
  héroe que más pega** en un grupo «con equipo del nivel».
- **Qué es «equipo del nivel»**: el grupo tal como llega a ese mundo **después de seis horas más farmeando la
  última etapa del mundo anterior**, es decir, con todas las casillas llenas de piezas de ese mundo. Es justo tu
  caso de hoy (equipo del mundo 1 farmeando 2-9). Quien llegue con menos (por ejemplo, con una llave temprana y
  media armadura vacía) necesitará más golpes; nadie llega matando de uno.
- **Por qué «el que más pega»**: el golpe del Ranger es tres veces el del Knight en Normal y de cinco a ocho veces
  más adelante (el equipo ofensivo va al que hace daño y el defensivo al tanque). Si anclara a la media, el Ranger
  seguiría matando de un golpe. Con este anclaje el Ranger necesita 2–3 golpes, el Knight 8–15 y la Priest más.
- **Dentro de un mundo la vida no cambia**; sube de golpe al entrar en el siguiente. El grupo crece mientras
  farmea ante el muro, no durante la hora que tarda en pasar las nueve etapas; lo que crece dentro del mundo es
  el tamaño de las oleadas (5 enemigos en X-1, 22 en X-9, como antes).
- **El salto del mundo 1 al 2**: la vida se multiplica por diez (de 116 a 1.260). Cada pieza de equipo añade
  daño plano y un héroe pasa de 2 casillas llenas a 11 en sus primeras horas: su golpe se multiplica por diez
  (de 46 a 504). No es un error de la tabla: es lo que pesa el equipo al principio.
- **En juego**: enemigo normal de 2-9 contra equipo honrado del mundo 1: **0,46 → 2,5 golpes**. Arquero 2 golpes,
  bruto 4½.
- **Medido con el grupo que llega de verdad** (que suele traer menos que el «equipo del nivel»): en el mundo 2
  necesita 7 golpes al entrar y 4½ en 2-9 (aún le faltan casillas); en el mundo 3, 3; **del mundo 4 en adelante,
  entre 2,1 y 3,3 golpes** en todas las mediciones. El Knight necesita 7–23 golpes y la Priest 15–45: el que mata
  es el Ranger.

### 2.2 Élites  ·  *cambio pequeño*

- **Antes → ahora**: `ELITE_HP_MULT` 5 → **4,5** (`stageScaling.ts`). Como la vida base ya está anclada, un élite
  aguanta **unos 11 golpes** del que más pega (tu banda: 10–12). Antes eran 5 × «un golpe» = caían casi igual de
  rápido que un normal; por eso «no aguantaban».
- Su daño (×5) y su probabilidad (8 %) no cambian.

### 2.3 Arquero  ·  *cambio pequeño*

- **Antes → ahora**: su vida era 0,65 × la del enemigo normal; ahora **0,8 ×** (`src/data/enemies.ts`), para que
  también aguante 2 golpes y no 1,6.

### 2.4 Jefes de etapa — anclados a 5–10 s  ·  *cambio grande*

- **Antes**: fórmula propia (`STAGE_BOSS_C · Φ^1,85 · bossHpRamp`). Medido con el grupo de la sonda: 4–6 s en
  Normal, 8–13 s en Infierno, 12–15 s en Averno. Con equipo honrado del mundo 1, el jefe de 2-9 caía en 3,6 s.
- **Ahora**: tabla `STAGE_BOSS_HP_TUNE` (mismos puntos que la de enemigos): la vida que el grupo con equipo del
  nivel tarda **7,5 s** en quitar (entre 6 y 9,5 s en los 58 puntos). Con el grupo que llega de verdad: 18–22 s
  en el mundo 2, 11 s en el 3 y **entre 6,4 y 9,2 s del mundo 4 en adelante**.
- No he tocado su daño ni su golpe en área.

### 2.5 Daño de los enemigos normales  ·  *cambio medio, consecuencia del 2.1*

- **Por qué**: enemigos que viven cinco veces más pegan cinco veces más tiempo. Con el daño de antes, cualquier
  grupo caía en la primera oleada de 2-9.
- **Ahora**: tabla `TRASH_DMG_TUNE` (una fracción del daño de la fórmula; solo enemigos normales y élites, no
  jefes). En cada punto, el mayor daño con el que el grupo **que llega de verdad** (no el reforzado) limpia la
  etapa más dura del punto **sin caer**, con un margen del 10 %. Nunca por encima de la fórmula. Valores: 1,0 en
  las cuatro primeras etapas, 0,56–0,75 en el resto del mundo 1, **0,27–0,5 en los mundos 2 a 6** (el grupo aún
  está llenando casillas), 0,68–1,0 en Infierno y Averno, y **1,0 desde mediados de Eterno**.
- Se permite que una partida de cada cuatro falle la comprobación: el jugador que encontró llave enseguida llega
  casi desnudo al mundo siguiente, y ajustar el daño a ese caso dejaría inofensivos a los enemigos de todos los
  demás.
- **El arranque**: el daño enemigo empieza en el **28 %** (antes 65 %) y no es completo hasta la etapa **60**
  (antes la 12): `EARLY_DMG_FLOOR`, `EARLY_DMG_RAMP_END`.

### 2.6 Muros (jefes de mundo)  ·  *reajuste completo*

- **Antes**: `WORLD_WALL_MULT` de 1,18 (mundo 1) a 100 (mundo 50), ajustada para el botín antiguo. Con el botín de
  hoy: muros triviales hasta Averno y un muro infranqueable en Averno 1-10.
- **Ahora**: la misma tabla, recalculada mundo a mundo. De **0,23** (mundo 1) a unos **2** al final de Normal e
  Infierno, **4,3** al final de Averno, **13,5** al final de Eterno y **39,5** en Tormento 10-10.
- **Cómo se fija cada muro**: se simulan cuatro partidas ante ese muro con las llaves y los intentos reales, y se
  busca por bisección la vida con la que el mundo dura, de media, su objetivo.
- **Los tres primeros mundos no tienen muro propiamente dicho**: su jefe cae con la primera llave (en 7–30 s).
  Ahí los grupos son muy desiguales (media armadura vacía) y un muro más alto castigaría justo al que encontró
  llave pronto. Desde el mundo 4 el jefe ya puede costar más de una llave.
- **Intentos por mundo** (media de cuatro partidas): Normal 1–2, Infierno 1–3, Averno 1–4, Eterno 1–7, Tormento
  2–8. En total, unos 14 intentos en Normal, 16 en Infierno, 23 en Averno, 36 en Eterno y 55 en Tormento.
- Cada muro es más duro que el anterior (hay un test).
- Sus habilidades (onda en área, furia, herida mortal) no cambian.

### 2.7 Lo que ha desaparecido

`HP0`, `gearTrack` y sus constantes, `STAGE_BOSS_C`, `STAGE_BOSS_EXP`, `bossHpRamp` y sus constantes: las fórmulas
que las tablas sustituyen. `Φ` sigue rigiendo el daño enemigo, la mitigación, el oro, la experiencia y el nivel
de objeto.

### 2.8 Velocidades (cambio tuyo de hoy, medido aquí)

`WALK_SPEED` 150 → 110, enemigos 100/80 → 50/40, `SPAWN_AHEAD` 240 → 280. Todo lo de este informe está medido con
esos valores. Efecto: una etapa X-1 pasa de ~3 min a ~3½–4.

## 3. Clases y talentos

**No he cambiado nada.** Lo que miré:

- **¿Hay una clase desviada?** El golpe básico del Ranger es 3–8 veces el del Knight. Es la diferencia entre el que
  hace daño y el tanque, y viene sobre todo del reparto del equipo (piezas ofensivas a uno, defensivas al otro), no
  de los números de la clase. No lo he tocado; por eso el anclaje es «el que más pega».
- **El nivel casi no pesa en el daño**: un héroe de nivel 120 sin equipo pega 345; con equipo, 90.000. El poder
  son los objetos, como estaba decidido. La curva de experiencia (sección 6) no arregla ni estropea el combate; solo
  reparte los puntos de talento a lo largo del juego.

## 4. Objetos y botín

**No he cambiado nada.** La escalera de rareza por mundo queda como la decidiste. Dos consecuencias medidas:

- Con ella y un cofre cada varios minutos, un grupo tarda **las tres o cuatro primeras horas en llenar sus 33
  casillas**; de ahí el salto de vida entre el mundo 1 y el 2 (2.1) y que los mundos 2–6 sean los de daño enemigo
  más bajo (2.5).
- El primer objeto de la rareza nueva de cada dificultad tarda: es un 0,2 % en su segundo mundo.

## 5. Cofres y llaves

**No he cambiado nada**: cofre común 0,2 % por baja, cofre de jefe de etapa 25 %, llave en 1 de cada 10 de esos
cofres, apertura automática cada 30 min. Lo que sale al medirlo:

- **Cofres comunes**: con enemigos que aguantan 2–3 golpes se mata más despacio que cuando calculé «uno cada 5
  minutos». Ahora cae **uno cada 11 minutos en Normal** (2.700 bajas por hora) y uno cada 6–7 en Tormento (4.700).
  El almacén de 6 tarda una hora en llenarse en Normal.
- **Llaves**: una cada ~42 jefes de etapa. El juego deja al grupo repitiendo X-9, y una X-9 dura 10–11 minutos
  (5–6 en el mundo 1): **de 4 a 8 horas de farmeo por llave** (unas 3½ en el mundo 1). El primer intento también
  la necesita. Es, con diferencia, lo que más pesa en la duración de cada mundo (sección 9).

## 6. Experiencia y oro

### 6.1 Curva de experiencia  ·  *cambio medio*

- **Antes**: `0,7 · N^3,5`. El grupo llegaba al nivel 72 al acabar Normal y al tope (120) en Averno: los niveles
  dejaban de existir en la segunda mitad del juego.
- **Ahora**: `0,7 · N^3,5 · (1 + (N/30)^1,2) + 50 M · (N/120)^20` (`totalExpToReach`). Igual de barata al
  principio (nivel 10: 2.800; nivel 20: 40.000), varias veces más cara en medio (×2,9 en el 50, ×4,6 en el 88) y
  con una cola dura para los últimos niveles.
- **En juego**: nivel ~52 al acabar Normal, ~68 Infierno, ~82 Averno, ~96 Eterno, **~108 al terminar el juego**.
  El 120 queda para después de Tormento 10-10.

### 6.2 Precio de reclutar  ·  *cambio pequeño*

- **Antes → ahora**: casilla de grupo 1.000 / 2.500 → **600 / 1.200** (`techTree.ts`, `party_size`); desbloquear
  clase 500 → **300** (`classes.ts`). Total: Ranger 900 de oro, Priest 1.500 más.
- **Por qué**: con cofres escasos la primera hora es de un Knight solo demasiado tiempo. Antes el Ranger llegaba a
  los 40–50 minutos y la Priest pasada la hora y media.
- **En juego**: Ranger a los **17 minutos**, Priest a los **40**.

El oro por baja y la experiencia por baja no cambian.

## 7. Motor de combate y mejoras

- **Motor**: un solo cambio, mecánico: los enemigos normales leen su daño de la tabla nueva (`sim/stages.ts`).
  Ninguna regla de combate cambia. La regla de hoy del daño a la retaguardia sigue igual.
- **Mejoras**: solo el precio de `party_size` (6.2).

## 8. La sonda (el «jugador medio»), para que mida el juego de hoy

Sin esto las cifras no valían: la sonda no sabía de llaves.

| Qué | Antes | Ahora |
|---|---|---|
| Llaves | No existían: intentaba el muro gratis cada vez que mejoraba | Cada intento gasta una llave, el primero también; salen de los cofres de jefe de etapa con la tirada real; sin llave, repite X-9. Con llave, intenta. |
| Combates contra el muro | Siempre la misma semilla: un grupo en el límite perdía siempre | Cada intento es un combate distinto |
| Cofres | Extrapolaba los que cayeron en UNA etapa medida (con 0,2 % caen 0 o 1) | El número esperado: bajas × probabilidad real |
| Cofres recogidos | 50 % de los comunes | 90 % (ya no se desborda el almacén) y 95 % de los de jefe |
| Ausencia | 12 h al día | 16 h fuera, de las que el juego cuenta su tope (8 h) |
| Gasto de oro | Una vez al día | En cuanto alcanza; y ahorra para reclutar antes de comprar otra cosa |
| Primeras etapas de jefe | No daban cofre de jefe | Lo dan |

## 9. Lo que tienes que decidir

1. **La llave.** Con tu 10 %, la espera de una llave (4–8 h) es más larga que casi cualquier otra cosa del mundo
   en que estás, y el primer intento también la pide. Efectos: cuatro de cada cinco jugadores llegan al jefe sin
   llave y se quedan horas repitiendo X-9; un intento fallido cuesta otras 4–8 h; un jugador astuto farmeará X-1
   (cuatro veces más jefes por hora) en vez de X-9. Opciones: (a) dejarlo — es lo que he afinado; (b) una llave
   garantizada al superar X-9 por primera vez; (c) subir la probabilidad y endurecer los muros a cambio.
2. **Normal dura unas 72–78 h**, no las 36 del reparto que te propuse. No puede bajar de ahí con enemigos de
   2–3 golpes y la llave al 10 %: cada mundo son una hora de etapas más la espera de la llave. Reparto que
   propongo: Normal 10 %, Infierno 15 %, Averno 20 %, Eterno 25 %, Tormento 30 %.
3. **Intentos fallidos en Eterno y Tormento**: hasta 7–8 en algunos mundos, cada uno con su llave (36 y 55 en
   total). Si te parece demasiado castigo,
   la palanca es que los enemigos de Eterno y Tormento aguanten 3 golpes en vez de 2,5 (la llave tarda más, hacen
   falta menos intentos).
4. **El mundo 1 y la suerte**: quien encuentra pronto un arma o una llave va muy por delante de la tabla durante
   esa hora. Solo se arreglaría dando un arma inicial a cada héroe; no lo he hecho.
5. **Eterno es el tramo menos fiable**: 172 h en las partidas con que se afinó y 280 h en cuatro nuevas (objetivo
   180). Sus muros están cerca del techo de lo que da el equipo y una partida con mala suerte se queda 50 h en un
   mundo. Para una segunda pasada: afinar con más partidas o bajar un poco esos diez muros.
6. **Mascotas**: sus probabilidades se fijaron sobre el número de bajas de esta mañana. Ahora se mata más despacio
   y el juego dura más: hay que volver a medirlas (al acabar Normal son unas 200.000 bajas —antes 132.000—, al acabar Eterno 1,5–1,65 millones —antes 1,54—,
   y el juego completo 2,3–2,5 millones de bajas y unos 5.200–5.700 jefes).

## 10. Lo que consideré y no cambié

- Dar un arma inicial a cada héroe (punto 9.4).
- Garantizar la primera llave (punto 9.1): la descartaste hoy.
- Bajar el poder plano de los objetos al principio para suavizar el salto del mundo 1 al 2.
- Nerfear el Ranger para acercar su golpe al del Knight (sección 3).
- Hacer que los enemigos normales crezcan dentro de un mundo (los dejé planos: 2.1).
- Tocar el oro por baja o los precios de las mejoras: el oro sigue siendo escaso, como querías.
- Tocar los tamaños de oleada (5 → 22 por etapa) o las 20 oleadas por etapa.

## 11. Estado

- Sin commit. Typecheck y lint limpios; tests: 86 archivos, 723 pasan, 1 omitido.
- Documentos actualizados: `docs/DIFFICULTY.md` (§4 escalera, §6b anclajes, §7 niveles, §8 ritmo, §9 llaves),
  `docs/BALANCE.md`, `CLAUDE.md`, `docs/redesign/PROGRESS.md`.
- Si cambia el poder de los héroes (clases, objetos, talentos), hay que volver a pasar
  `scripts/tune-pacing.ts`: los anclajes se miden, no se deducen.

---

# Apéndice — tablas de la sonda

## A. Duración por dificultad

Horas activas de cada dificultad (mediana de cuatro partidas) frente a su objetivo.

| Dificultad | Objetivo | Partidas 1–4 (con las que se afinó) | Partidas 5–8 (nuevas) |
|---|---|---|---|
| Normal | 75 h | 76 h | 72 h |
| Infierno | 112 h | 108 h | 112 h |
| Averno | 146 h | 152 h | 128 h |
| Eterno | 180 h | 172 h | 280 h |
| Tormento | 215 h | 169 h | 169 h |
| **Total (mediana)** | **728 h** | **677 h** | **761 h** |

Días de calendario a 8 h diarias, partida a partida: 99 · 83 · 87 · 83 (partidas 1–4) y 91 · 79 · 106 · 100 (partidas 5–8). Las ocho terminan; ningún mundo retiene a nadie 30 días.

Eterno es lo más disperso: en las partidas nuevas tarda 100 h más que en las que sirvieron para afinar.

## B. Mundo a mundo (partidas 1–4)

Horas activas en el mundo (media y mediana), espera de la primera llave, horas sin llave ante el muro, intentos (media), nivel y rareza más alta equipada al vencer al jefe, y rango de horas entre partidas.

| mundo | dificultad | objetivo h | horas (media) | horas (mediana) | primera llave h | sin llave h | intentos | nivel | rareza | rango de horas |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | normal | 3.0 | 3.6 | 2.9 | 2.0 | 2.0 | 1.0 | 22 | T2 | (1.1-7.3, n=4) |
| 2 | normal | 6.6 | 4.4 | 5.4 | 3.1 | 3.1 | 1.0 | 26 | T2 | (0.8-6.2, n=4) |
| 3 | normal | 6.9 | 5.8 | 5.2 | 4.4 | 4.4 | 1.0 | 32 | T3 | (2.5-10.3, n=4) |
| 4 | normal | 7.3 | 5.8 | 5.7 | 2.0 | 4.7 | 2.0 | 35 | T4 | (1.1-10.7, n=4) |
| 5 | normal | 7.6 | 6.3 | 5.9 | 2.1 | 4.9 | 1.5 | 40 | T4 | (0.9-12.6, n=4) |
| 6 | normal | 8.0 | 3.2 | 2.9 | 0.9 | 2.0 | 1.3 | 40 | T4 | (1.0-6.0, n=4) |
| 7 | normal | 8.3 | 15.5 | 14.9 | 8.0 | 13.8 | 2.0 | 46 | T4 | (10.7-21.3, n=4) |
| 8 | normal | 8.6 | 8.5 | 7.7 | 0.0 | 6.7 | 2.0 | 48 | T4 | (0.9-17.7, n=4) |
| 9 | normal | 9.0 | 14.6 | 12.8 | 11.8 | 11.8 | 1.0 | 51 | T4 | (10.5-22.3, n=4) |
| 10 | normal | 9.3 | 4.2 | 4.0 | 3.0 | 3.0 | 1.0 | 52 | T4 | (0.9-7.8, n=4) |
| 11 | hell | 9.7 | 10.2 | 6.7 | 5.6 | 5.6 | 1.0 | 53 | T4 | (1.1-26.1, n=4) |
| 12 | hell | 10.0 | 18.8 | 21.7 | 11.4 | 20.7 | 1.3 | 56 | T4 | (6.0-25.8, n=4) |
| 13 | hell | 10.4 | 15.3 | 16.0 | 15.1 | 15.1 | 1.0 | 58 | T4 | (1.1-28.0, n=4) |
| 14 | hell | 10.7 | 10.2 | 9.2 | 8.2 | 8.2 | 1.3 | 59 | T4 | (2.5-20.0, n=4) |
| 15 | hell | 11.0 | 6.0 | 6.3 | 2.2 | 5.4 | 1.5 | 60 | T5 | (0.8-10.6, n=4) |
| 16 | hell | 11.4 | 11.9 | 10.7 | 3.9 | 9.8 | 2.5 | 62 | T5 | (8.7-17.5, n=4) |
| 17 | hell | 11.7 | 9.5 | 5.4 | 0.0 | 4.5 | 1.5 | 64 | T5 | (0.8-26.5, n=4) |
| 18 | hell | 12.1 | 10.3 | 1.4 | 0.0 | 0.5 | 1.3 | 65 | T5 | (0.9-37.5, n=4) |
| 19 | hell | 12.4 | 11.3 | 10.7 | 0.5 | 9.7 | 1.8 | 66 | T5 | (0.9-23.1, n=4) |
| 20 | hell | 12.8 | 8.8 | 8.7 | 2.1 | 7.8 | 2.8 | 68 | T5 | (0.9-17.1, n=4) |
| 21 | inferno | 13.1 | 21.9 | 13.9 | 1.4 | 13.0 | 2.5 | 70 | T5 | (0.8-58.8, n=4) |
| 22 | inferno | 13.4 | 10.3 | 5.8 | 5.0 | 5.0 | 1.8 | 72 | T5 | (1.8-27.7, n=4) |
| 23 | inferno | 13.8 | 9.5 | 7.6 | 3.1 | 6.8 | 1.3 | 72 | T5 | (0.9-22.0, n=4) |
| 24 | inferno | 14.1 | 11.4 | 3.0 | 1.7 | 2.3 | 3.0 | 73 | T5 | (1.3-38.3, n=4) |
| 25 | inferno | 14.5 | 18.9 | 17.3 | 10.3 | 16.2 | 2.0 | 76 | T6 | (6.8-34.2, n=4) |
| 26 | inferno | 14.8 | 11.2 | 9.9 | 2.3 | 9.0 | 2.0 | 77 | T6 | (2.2-22.5, n=4) |
| 27 | inferno | 15.1 | 11.8 | 7.2 | 3.6 | 6.3 | 2.0 | 77 | T6 | (0.8-32.1, n=4) |
| 28 | inferno | 15.5 | 11.4 | 11.1 | 0.0 | 10.2 | 2.3 | 79 | T6 | (0.9-22.5, n=4) |
| 29 | inferno | 15.8 | 24.8 | 27.5 | 6.9 | 26.6 | 3.8 | 81 | T6 | (13.5-30.6, n=4) |
| 30 | inferno | 16.2 | 12.6 | 12.0 | 5.9 | 11.2 | 2.3 | 82 | T6 | (4.0-22.5, n=4) |
| 31 | eternal | 16.5 | 10.9 | 11.2 | 4.4 | 10.3 | 2.8 | 83 | T6 | (4.5-16.5, n=4) |
| 32 | eternal | 16.8 | 11.1 | 11.0 | 7.3 | 10.2 | 2.3 | 84 | T6 | (7.4-15.0, n=4) |
| 33 | eternal | 17.2 | 13.0 | 7.9 | 2.0 | 7.1 | 2.3 | 85 | T7 | (1.7-34.5, n=4) |
| 34 | eternal | 17.5 | 5.6 | 6.1 | 3.4 | 5.4 | 1.5 | 86 | T7 | (1.0-9.3, n=4) |
| 35 | eternal | 17.9 | 33.0 | 30.0 | 3.8 | 29.0 | 7.3 | 88 | T7 | (18.8-53.3, n=4) |
| 36 | eternal | 18.2 | 32.7 | 29.7 | 5.3 | 28.9 | 5.3 | 91 | T7 | (6.5-65.0, n=4) |
| 37 | eternal | 18.6 | 21.4 | 19.5 | 2.8 | 18.7 | 4.0 | 93 | T7 | (2.7-44.0, n=4) |
| 38 | eternal | 18.9 | 13.8 | 10.5 | 3.1 | 9.7 | 2.3 | 93 | T7 | (5.5-28.5, n=4) |
| 39 | eternal | 19.2 | 29.4 | 38.0 | 1.3 | 37.1 | 6.5 | 95 | T7 | (0.7-40.7, n=4) |
| 40 | eternal | 19.6 | 11.5 | 10.2 | 6.2 | 9.4 | 1.3 | 96 | T7 | (2.2-23.5, n=4) |
| 41 | torment | 19.9 | 33.3 | 36.7 | 0.3 | 36.0 | 5.0 | 98 | T7 | (12.4-47.5, n=4) |
| 42 | torment | 20.3 | 4.5 | 2.9 | 1.8 | 2.3 | 1.5 | 98 | T7 | (2.1-10.0, n=4) |
| 43 | torment | 20.6 | 8.3 | 4.5 | 1.8 | 3.9 | 2.8 | 100 | T8 | (0.6-23.5, n=4) |
| 44 | torment | 20.9 | 28.0 | 22.6 | 3.1 | 22.0 | 7.8 | 102 | T8 | (15.8-51.0, n=4) |
| 45 | torment | 21.3 | 21.6 | 22.0 | 1.3 | 21.3 | 6.0 | 103 | T8 | (17.5-25.0, n=4) |
| 46 | torment | 21.6 | 11.8 | 15.3 | 0.0 | 14.6 | 5.3 | 104 | T8 | (0.5-16.0, n=4) |
| 47 | torment | 22.0 | 23.4 | 23.0 | 2.3 | 22.3 | 8.3 | 105 | T8 | (7.0-40.5, n=4) |
| 48 | torment | 22.3 | 24.0 | 19.3 | 1.3 | 18.6 | 6.0 | 107 | T8 | (0.6-57.0, n=4) |
| 49 | torment | 22.7 | 23.9 | 14.3 | 1.3 | 13.7 | 7.8 | 107 | T8 | (4.4-62.5, n=4) |
| 50 | torment | 23.0 | 12.0 | 11.9 | 2.2 | 11.3 | 4.3 | 108 | T8 | (5.6-18.5, n=4) |

## C. Lo que produce el juego (acumulado al acabar cada dificultad, mediana de las partidas 1–4)

| dificultad | bajas | jefes | oro | experiencia por héroe | cofres encontrados | cofres comunes abiertos |
|---|---|---|---|---|---|---|
| Normal | 199,198 | 506 | 1,187,510 | 1,411,324 | 588 | 401 |
| Hell | 497,784 | 1,212 | 3,971,631 | 4,194,124 | 1,474 | 1,014 |
| Inferno | 880,522 | 2,109 | 9,469,108 | 9,140,732 | 2,612 | 1,807 |
| Eternal | 1,461,503 | 3,432 | 20,447,719 | 17,909,281 | 4,341 | 3,017 |
| Torment | 2,257,706 | 5,200 | 40,063,772 | 32,862,671 | 6,711 | 4,684 |

## D. Anclajes a lo largo del juego (grupo real de la sonda, mediana de dos partidas)

Al llegar a cada mundo (x-1) y ante su muro (x-9): nivel, golpes del que más pega por enemigo normal, golpes por clase (Knight / Ranger / Priest), segundos del jefe de etapa, vida mínima del grupo durante ese jefe, segundos que dura la etapa y derrotas en ella.

| mundo | etapa | nivel | golpes | Knight/Ranger/Priest | jefe s | vida mín. % | etapa s | derrotas |
|---|---|---|---|---|---|---|---|---|
| 1 | x-9 | 13 | 1.04 | 1.8/1.7/5.4 | 5.7 | 95 | 329 | 0 |
| 2 | x-1 | 21.5 | 6.96 | 12.8/7.0/33.9 | 22.4 | 87 | 395 | 0 |
| 2 | x-9 | 22.5 | 4.38 | 12.0/4.4/32.2 | 18.1 | 84 | 986 | 0 |
| 3 | x-1 | 26 | 3.14 | 11.6/3.1/20.5 | 11.3 | 90 | 248 | 0 |
| 3 | x-9 | 28 | 3.05 | 9.7/3.0/18.9 | 10.7 | 86 | 734 | 0 |
| 4 | x-1 | 32 | 2.76 | 9.4/2.8/19.6 | 7.7 | 94 | 246 | 0 |
| 4 | x-9 | 32 | 2.61 | 9.7/2.6/19.2 | 7.5 | 93 | 695 | 0 |
| 5 | x-1 | 34.5 | 3.26 | 10.6/3.3/14.9 | 8.8 | 93 | 251 | 0 |
| 5 | x-9 | 34.5 | 3.03 | 6.3/3.0/14.9 | 8.5 | 92 | 602 | 0 |
| 6 | x-1 | 39.5 | 2.66 | 7.1/2.7/18.8 | 8.4 | 94 | 215 | 0 |
| 6 | x-9 | 39.5 | 2.70 | 6.9/2.7/18.0 | 8.4 | 93 | 626 | 0 |
| 7 | x-1 | 40 | 3.27 | 8.1/3.3/18.8 | 9.2 | 93 | 252 | 0 |
| 7 | x-9 | 40 | 3.06 | 8.5/3.1/19.4 | 9.2 | 92 | 689 | 0 |
| 8 | x-1 | 45 | 3.17 | 8.0/3.2/15.0 | 8.2 | 94 | 226 | 0 |
| 8 | x-9 | 45.5 | 2.77 | 7.8/2.8/14.6 | 8.2 | 94 | 601 | 0 |
| 9 | x-1 | 48.5 | 2.87 | 10.3/2.9/18.2 | 7.7 | 96 | 228 | 0 |
| 9 | x-9 | 48.5 | 2.64 | 9.1/2.6/22.7 | 7.5 | 95 | 632 | 0 |
| 10 | x-1 | 51.5 | 2.61 | 11.0/2.6/24.4 | 7.8 | 96 | 217 | 0 |
| 10 | x-9 | 51.5 | 2.64 | 10.4/2.6/24.0 | 7.6 | 96 | 634 | 0 |
| 11 | x-1 | 52 | 3.11 | 12.6/3.1/27.8 | 8.3 | 93 | 246 | 0 |
| 11 | x-9 | 52.5 | 2.90 | 10.9/2.9/27.4 | 8.0 | 94 | 1002 | 0.5 |
| 12 | x-1 | 55 | 3.19 | 12.0/3.2/30.6 | 7.5 | 95 | 239 | 0 |
| 12 | x-9 | 55 | 2.85 | 12.0/2.8/30.4 | 7.5 | 94 | 709 | 0 |
| 13 | x-1 | 57 | 2.88 | 12.1/2.9/20.3 | 7.6 | 93 | 235 | 0 |
| 13 | x-9 | 57 | 2.62 | 11.5/2.6/17.6 | 7.6 | 93 | 642 | 0 |
| 14 | x-1 | 60 | 2.63 | 11.4/2.6/19.5 | 7.0 | 95 | 199 | 0 |
| 14 | x-9 | 60.5 | 2.56 | 11.6/2.6/19.6 | 6.8 | 95 | 589 | 0 |
| 15 | x-1 | 62.5 | 2.44 | 14.8/2.4/18.7 | 7.1 | 95 | 200 | 0 |
| 15 | x-9 | 62.5 | 2.29 | 14.8/2.3/18.8 | 7.1 | 95 | 582 | 0 |
| 16 | x-1 | 63 | 2.55 | 14.8/2.6/20.9 | 7.2 | 96 | 213 | 0 |
| 16 | x-9 | 63 | 2.37 | 14.7/2.4/18.6 | 7.2 | 95 | 538 | 0 |
| 17 | x-1 | 64 | 2.31 | 13.6/2.3/19.1 | 6.5 | 95 | 207 | 0 |
| 17 | x-9 | 64 | 2.30 | 13.9/2.3/19.3 | 6.5 | 95 | 559 | 0 |
| 18 | x-1 | 64 | 2.58 | 14.6/2.6/21.3 | 6.7 | 95 | 206 | 0 |
| 18 | x-9 | 64.5 | 2.34 | 14.9/2.3/20.9 | 6.7 | 95 | 646 | 0 |
| 19 | x-1 | 64.5 | 2.97 | 16.4/3.0/25.0 | 7.3 | 94 | 223 | 0 |
| 19 | x-9 | 64.5 | 2.77 | 15.9/2.8/23.3 | 7.3 | 94 | 667 | 0 |
| 20 | x-1 | 67 | 2.52 | 14.4/2.5/17.4 | 6.7 | 96 | 219 | 0 |
| 20 | x-9 | 67 | 2.40 | 16.0/2.4/17.2 | 6.6 | 96 | 584 | 0 |
| 21 | x-1 | 68 | 2.63 | 13.0/2.6/17.2 | 6.5 | 95 | 206 | 0 |
| 21 | x-9 | 68 | 2.35 | 13.1/2.4/18.0 | 6.4 | 94 | 527 | 0 |
| 22 | x-1 | 68 | 2.58 | 14.0/2.6/19.3 | 7.0 | 94 | 199 | 0 |
| 22 | x-9 | 68.5 | 2.56 | 13.8/2.6/19.0 | 7.0 | 94 | 544 | 0 |
| 23 | x-1 | 70.5 | 2.37 | 10.8/2.4/21.6 | 7.0 | 94 | 196 | 0 |
| 23 | x-9 | 70.5 | 2.44 | 10.5/2.4/19.5 | 7.0 | 94 | 531 | 0 |
| 24 | x-1 | 72.5 | 2.22 | 12.1/2.2/23.2 | 6.8 | 94 | 199 | 0 |
| 24 | x-9 | 72.5 | 2.20 | 11.7/2.2/23.3 | 6.8 | 93 | 535 | 0 |
| 25 | x-1 | 72.5 | 2.44 | 14.2/2.4/27.5 | 7.5 | 93 | 201 | 0 |
| 25 | x-9 | 73 | 2.28 | 13.0/2.3/27.6 | 7.5 | 92 | 1054 | 1 |
| 26 | x-1 | 74 | 2.69 | 15.8/2.7/32.2 | 7.3 | 95 | 207 | 0 |
| 26 | x-9 | 74 | 2.68 | 15.2/2.7/30.2 | 7.3 | 95 | 572 | 0 |
| 27 | x-1 | 75 | 2.45 | 17.7/2.5/35.2 | 7.6 | 94 | 208 | 0 |
| 27 | x-9 | 75 | 2.63 | 17.6/2.6/32.7 | 7.5 | 93 | 586 | 0 |
| 28 | x-1 | 76.5 | 2.48 | 17.7/2.5/45.4 | 7.5 | 94 | 211 | 0 |
| 28 | x-9 | 76.5 | 2.58 | 17.3/2.6/44.0 | 7.5 | 94 | 565 | 0 |
| 29 | x-1 | 77.5 | 2.32 | 18.7/2.3/43.1 | 8.1 | 92 | 199 | 0 |
| 29 | x-9 | 78 | 2.45 | 18.0/2.4/44.6 | 8.1 | 92 | 773 | 0.5 |
| 30 | x-1 | 79.5 | 2.48 | 20.3/2.5/31.8 | 9.1 | 91 | 195 | 0 |
| 30 | x-9 | 79.5 | 2.11 | 18.0/2.1/30.0 | 9.0 | 91 | 528 | 0 |
| 31 | x-1 | 80.5 | 2.33 | 23.6/2.3/27.2 | 9.1 | 88 | 202 | 0 |
| 31 | x-9 | 80.5 | 2.24 | 18.5/2.2/24.4 | 8.8 | 88 | 518 | 0 |
| 32 | x-1 | 81.5 | 2.55 | 22.2/2.5/22.1 | 7.7 | 91 | 187 | 0 |
| 32 | x-9 | 81.5 | 2.15 | 20.3/2.1/21.2 | 7.3 | 91 | 716 | 0.5 |
| 33 | x-1 | 82.5 | 2.17 | 19.9/2.2/26.2 | 7.3 | 92 | 189 | 0 |
| 33 | x-9 | 83 | 2.34 | 17.9/2.3/24.0 | 7.1 | 92 | 490 | 0 |
| 34 | x-1 | 83 | 2.53 | 18.5/2.5/29.3 | 7.8 | 92 | 181 | 0 |
| 34 | x-9 | 83 | 2.21 | 20.9/2.2/27.9 | 7.8 | 91 | 1024 | 1.5 |
| 35 | x-1 | 83.5 | 2.54 | 22.1/2.5/26.7 | 8.4 | 90 | 197 | 0 |
| 35 | x-9 | 84 | 2.64 | 20.8/2.6/22.7 | 8.6 | 89 | X | 6.5 |
| 36 | x-1 | 87.5 | 2.48 | 19.1/2.5/25.4 | 8.1 | 94 | 185 | 0 |
| 36 | x-9 | 87.5 | 2.41 | 19.8/2.4/24.6 | 8.1 | 93 | 464 | 0 |
| 37 | x-1 | 90 | 2.33 | 22.6/2.3/27.8 | 7.5 | 94 | 181 | 0 |
| 37 | x-9 | 90 | 2.47 | 20.6/2.5/29.2 | 7.5 | 94 | 465 | 0 |
| 38 | x-1 | 91.5 | 3.09 | 18.2/3.1/32.2 | 7.9 | 95 | 196 | 0 |
| 38 | x-9 | 91.5 | 2.83 | 19.2/2.8/28.6 | 7.9 | 95 | 474 | 0 |
| 39 | x-1 | 92 | 2.57 | 21.0/2.6/25.6 | 7.2 | 96 | 183 | 0 |
| 39 | x-9 | 92.5 | 2.46 | 23.3/2.5/28.7 | 7.2 | 95 | 461 | 0 |
| 40 | x-1 | 94 | 2.45 | 23.7/2.4/27.3 | 6.7 | 95 | 183 | 0 |
| 40 | x-9 | 94 | 2.41 | 25.6/2.4/27.2 | 6.7 | 95 | 458 | 0 |
| 41 | x-1 | 94.5 | 2.33 | 25.0/2.3/25.0 | 7.3 | 94 | 183 | 0 |
| 41 | x-9 | 94.5 | 2.50 | 26.1/2.5/28.6 | 7.3 | 93 | 443 | 0 |
| 42 | x-1 | 97.5 | 2.54 | 20.2/2.5/14.3 | 6.5 | 95 | 170 | 0 |
| 42 | x-9 | 97.5 | 1.94 | 19.6/1.9/15.1 | 6.5 | 94 | 352 | 0 |
| 43 | x-1 | 97.5 | 2.50 | 25.7/2.5/17.9 | 6.7 | 94 | 175 | 0 |
| 43 | x-9 | 98 | 2.42 | 21.5/2.4/17.5 | 6.7 | 94 | 365 | 0 |
| 44 | x-1 | 98.5 | 2.63 | 19.1/2.6/20.7 | 7.5 | 93 | 174 | 0 |
| 44 | x-9 | 98.5 | 2.50 | 15.4/2.5/16.4 | 7.5 | 93 | 371 | 0 |
| 45 | x-1 | 100.5 | 3.12 | 20.6/3.1/13.0 | 7.8 | 94 | 172 | 0 |
| 45 | x-9 | 100.5 | 2.37 | 18.3/2.4/12.5 | 7.8 | 94 | 357 | 0 |
| 46 | x-1 | 102 | 2.70 | 19.2/2.7/6.8 | 8.0 | 95 | 164 | 0 |
| 46 | x-9 | 102 | 2.45 | 16.2/2.4/7.1 | 8.0 | 95 | 306 | 0 |
| 47 | x-1 | 103 | 2.84 | 21.5/2.8/10.1 | 8.1 | 96 | 164 | 0 |
| 47 | x-9 | 103 | 2.56 | 18.8/2.6/9.3 | 8.1 | 95 | 326 | 0 |
| 48 | x-1 | 105.5 | 2.79 | 20.6/2.8/11.0 | 7.8 | 95 | 165 | 0 |
| 48 | x-9 | 105.5 | 2.68 | 20.9/2.7/10.2 | 7.8 | 95 | 315 | 0 |
| 49 | x-1 | 108 | 2.93 | 15.9/2.9/9.8 | 8.2 | 96 | 168 | 0 |
| 49 | x-9 | 108 | 2.97 | 16.3/3.0/9.9 | 8.2 | 96 | 310 | 0 |
| 50 | x-1 | 109.5 | 2.59 | 17.5/2.6/9.9 | 7.8 | 96 | 166 | 0 |
| 50 | x-9 | 109.5 | 2.60 | 14.5/2.6/10.3 | 7.7 | 96 | 309 | 0 |

## E. Las dos primeras horas de una partida nueva (partida 2)

| Minuto | Qué pasa |
|---|---|
| 5 | Cae 1-1 (Knight solo, nivel 6) |
| 11 | 1-2 |
| 17 | 1-3 y llega el **Ranger** |
| 23 | 1-4 |
| 29 | 1-5 (primera pieza poco común) |
| 40 | 1-6, con una derrota por el camino, y llega la **Priest** |
| 46 · 53 · 59 | 1-7 · 1-8 · 1-9 (grupo de nivel 13/12/11) |
| 59 → 3 h 49 min | Repite 1-9 (6½ min por vuelta) hasta que sale la primera llave; sube a nivel 24 y llena casillas |
| 3 h 49 min | Jefe del mundo 1: cae al primer intento, en 7 s |
| 3 h 54 min → 4 h 52 min | Mundo 2: etapas de 4 a 11 minutos cada una |
| 10 h | Jefe del mundo 2, tras 5 h esperando la llave |

En cuatro partidas el jefe del mundo 1 cayó entre 1,1 y 7,3 horas (mediana 2,9).

## F. Tablas en `src/data/stageScaling.ts`

`GRUNT_HP_TUNE`, `STAGE_BOSS_HP_TUNE`, `TRASH_DMG_TUNE` (59 puntos: etapas 1-1…1-10 y luego un valor por mundo, del 2 al 50) y `WORLD_WALL_MULT` (50 mundos). La referencia de lo que hizo el grupo con equipo del nivel al afinarlas está en `test/sim/probe/anchorReference.ts`.



## Ronda 3 · punto de control 1: auditoría y peso de la construcción

*16 nov 2026. No se ha tocado nada del juego: solo la sonda (`test/sim/probe/`) y scripts nuevos en `scripts/`. Las cifras de horas son de la sonda corregida, no de una pasada de ajuste.*

### Resumen

- **La sonda ve todo el contenido nuevo**: oleadas por dificultad, Apoyos y auras, rasgos, élites, afijos y las diez mecánicas con sus invocaciones. Lo comprueba la auditoría de abajo, en peleas reales de la sonda.
- **Cuatro cosas entraban mal y están corregidas**:
  - la sonda solo usaba dos habilidades por clase;
  - al fallar un muro sus afijos se volvían a sortear;
  - todas las semillas veían los mismos Apoyos;
  - la medida de «equipo de la zona» no dejaba romper el Acorazado ni cobrar la Culpa.
- **La construcción influye bastante en los muros, nada en el farmeo**:
  - frente a la construcción por defecto de la sonda, la mejor aguanta un muro con entre un 14 y un 33 % más de vida (mediana por dificultad), unos 12–25 % menos de equipo;
  - una construcción al azar aguanta entre un 0 y un 23 % menos;
  - en el farmeo las tres van a un 0–10 % la una de la otra.
- **En la partida entera** (6 semillas, de Normal 1-1 a Tormento 10-10; la diferencia está solo en el arranque de cada muro, el farmeo es el mismo):
  - con la construcción buena en cada muro, 534 h;
  - con la por defecto, 592 h;
  - con una al azar en cada muro, 855 h (+44 %).
- **Pero no depende del jefe.** Una sola construcción de daño iguala a la mejor de cada muro, con un ±4 %, en 22 de los 25 muros de Infierno en adelante: Grito de guerra + Sed de sangre (Azote) · Disparo certero + Punto débil (Tirador) · Infusión de poder + Castigo (Celo). Purificar sale en la mejor construcción de solo 4 de 25 muros, y quitarlo no cambia el resultado. Los muros son hoy una carrera de daño contra la furia de los 60 s.

### 1. Auditoría: qué entra en la sonda

Prueba: `npx vite-node scripts/probe-audit.ts`. Juega con el montaje de la sonda una etapa de farmeo por dificultad y los diez jefes de mundo de cada una, y cuenta lo que aparece.

| Contenido | En la sonda | Prueba |
|---|---|---|
| Oleadas por etapa (8 / 12 / 16 / 20 / 20) | Entra | Contadas en cada dificultad: 8/8, 12/12, 16/16, 20/20. Las 16/17/18/19/20 que decidiste son de la pasada y no están puestas. |
| Apoyos (desde el mundo 3 de Normal; 1 → 5 auras) | Entra | 2–7 por etapa; auras [1] en Normal, [2] en Infierno… [5] en Tormento; aviso `supportDown` al caer |
| Rasgos por dificultad | Entra | Normal: ninguno · Infierno: Rabia, Guardia · Averno: + Embestida, Último aliento, Tiro cargado, Imparable · Eterno y Tormento: + Fuego concentrado, Temblor |
| Élites | Entra | 6–40 por etapa |
| Afijos de jefe de etapa (0/1/1/2/2) y de mundo (0/0/1/1/2, sin Vampírico) | Entra | Contados por dificultad en las dos tablas |
| Mecánicas de los 10 jefes de mundo | Entra | Lanzamientos `boss_flock`, `boss_roots`, `boss_chain_bolt`, `boss_guilt`, `boss_gild`, `boss_undertow`, `boss_spores`, `boss_red_blade`, `boss_scales`, `boss_mirror`; paneles, rotura e invocaciones |
| Invocaciones (cuervos, reflejos) | Entra | No cuentan como baja ni dan botín (`Simulation.processDeaths`, regla del juego) |
| Prioridad de objetivo y alcance de disparo | Entra | Es del sim |
| **Habilidades de la clase** | **Entraba mal → corregido** | La sonda aprendía siempre las dos primeras: Sanar + Infusión de poder, Piel de piedra + Tajo debilitante, Fuego rápido + Disparo certero. Purificar, Castigo, Nova, Grito de guerra, Punto débil… no se usaban nunca. Ahora cualquier construcción (`builds.ts`) |
| Pasivos de efecto | Entran, tarde | Con la construcción por defecto: Guardián, Primera sangre y Desbordamiento desde el principio, Retribución a nivel 60; los de rama a partir de 80–100. Los de la otra rama (Piel curtida, Aguante, Perforar, Crueldad, Luz abrasadora, Condena), solo a nivel 120 |
| **Afijos y Apoyos del run** | **Entraba mal → corregido** | En el juego salen de la semilla de la partida y son los mismos en cada intento. La sonda los sacaba de la semilla del combate: cada intento fallido volvía a sortear los afijos, y todas las semillas farmeaban con los mismos Apoyos. Ahora `fixedRunSeed` (activado por defecto). Mediana casi igual (588 → 592 h), más dispersión: la semilla 5 pasa de 699 a 807 h porque le tocan afijos malos |
| **Medida de «equipo de la zona»** (`zoneGear.wallDamage`) | **Entraba mal → corregido** | El jefe tenía 10¹⁸ de vida: el Acorazado no se rompía nunca y la Culpa no cobraba nada. Ahora tiene su vida real y se le devuelve la mitad cada vez que baja de la mitad. Pendiente: «por debajo del 30 %» (rol de la Ranger) sigue sin aplicarse en esa medida |
| Mascotas | No entraba → opción | `pets: 'median'`: cada mascota se tiene desde que la mitad de los jugadores la habría encontrado, y sube de rango por su objetivo. 553 h frente a 592 (−7 %). Por defecto sigue en `'none'` |
| Llave opción A | No está | Es decisión de la pasada; no la he puesto, ni como opción |
| Gemas | Entra | Se engastan; la tech de gemas cuenta |
| Tech | Entra | Todo menos `synth_luck`, que es del cubo |
| Cubo (alquimia, síntesis) | No entra | La sonda no fabrica nada: simplificación conocida |
| Desconexión | Entra | Tope de 8 h, solo oro y experiencia; con mascotas, las horas extra del Diablillo |
| Purificar y curas inmediatas frente a Esporas, Herida mortal y Raíces | Entra si la construcción las lleva | La construcción por defecto no tiene ni Purificar ni cura inmediata (Sanar es progresiva), así que nunca respondía a las Esporas. Con Purificar puesto, se lanza (contado en la auditoría) |
| Pausa de jefe caído (5,2 s) y secuencia de derrota (8,7 s) | Aproximadas | El bucle cobra un mínimo de 30 s por victoria y 80 s por intento fallido |

### 2. Correcciones de la sonda (sin tocar `src/`)

- **`test/sim/probe/builds.ts`** (nuevo):
  - una construcción es dos habilidades, una rama, los modificadores preferidos y el orden de gasto;
  - `buildTalents` pasa cada punto por `canSpend`, así que el árbol siempre la acepta;
  - si una habilidad aún no se puede aprender, la sustituye una de las de por defecto hasta que se abre;
  - `allBuilds` enumera todas las construcciones (hasta 88 distintas por clase a nivel alto), y `randomPartyBuild` saca una al azar;
  - la construcción por defecto (`PROBE_DEFAULT_BUILD`) es exactamente la de antes.
- **`loop.ts`**: opciones nuevas `build`, `pets`, `fixedRunSeed` y `wallBuild` (cambio gratis de construcción antes de un muro).
- **`combat.ts`**: `measureFarm` y `measureBoss` separan la semilla del run de la del combate.
- **`zoneGear.ts`**: el jefe de la medida tiene su vida real y se rellena.
- **Tests**: `test/sim/probe/builds.test.ts` (7). Comprueba que toda construcción de toda clase, a seis niveles, es válida; que la por defecto es la de siempre; las sustituciones; el azar determinista; las mascotas; el run determinista; y el relleno de la medida.
- **Scripts**:
  - `probe-snapshots.ts`: el grupo de la sonda en cada muro;
  - `probe-audit.ts`;
  - `build-study.ts`: el estudio, en 9 procesos;
  - `build-study-extra.ts`: el equipo de la zona y el farmeo;
  - `build-progression.ts`: la partida entera con las tres políticas.
- `tsc`, lint y `vitest` en verde: 107 archivos, 974 tests (1 omitido).

### 3. Estudio: cuánto influye construirse bien

**Método**:
- El grupo es el de la sonda al llegar a cada muro y en el momento de tumbarlo (semilla 1): nivel, tech y equipo reales. El equipo es el mismo en las tres políticas.
- **D = por defecto**: la de la sonda.
- **Ó = óptima**: búsqueda por coordenadas sobre todas las construcciones distintas de cada clase, desde la por defecto, con 4 semillas propias. Se evalúa después con otras 16.
- **A = aleatoria**: una construcción distinta en cada semilla.
- Cada semilla es un jugador distinto, con sus afijos y sus tiradas.
- **Margen**: el mayor múltiplo de la vida del muro que la política tumba en el 75 % de 16 semillas, por bisección.
- **Equipo necesario**: el equipo de la zona del grupo al caer, dividido por el margen. Supone que el daño escala con el equipo.
- **Genérica**: la construcción fija Grito de guerra + Sed de sangre (Azote) · Disparo certero + Punto débil (Tirador) · Infusión de poder + Castigo (Celo), probada igual en cada muro.
- 35 muros: los 20 de Normal e Infierno, y los mundos 1, 4, 5, 7 y 10 de Averno, Eterno y Tormento. Unas 35 000 peleas.

| Muro | Mecánica | Nivel | Equipo (llegada → al caer) | Victoria D / Ó / A | Muerte D / Ó (s) | Margen D / Ó / A | Equipo necesario D / Ó / A | Genérica (margen) | Construcción óptima (Knight · Ranger · Priest) |
|---|---|---|---|---|---|---|---|---|---|
| Normal 1-10 | Bandada | 10 | 10 → 10 % | 94 / 88 / 94 % | 66 / 66 | ×1.02 / ×1.02 / ×1.02 | 10 % / 10 % / 10 % | — | Tajo debilitante + Baluarte (Bastión) · Fuego rápido + Disparo certero (Tirador) · Sanar + Infusión de poder (Devoción) |
| Normal 2-10 | Raíces | 12 | 12 → 12 % | 100 / 100 / 100 % | 59 / 58 | ×1.11 / ×1.11 / ×1.07 | 11 % / 11 % / 11 % | — | Tajo debilitante + Baluarte (Bastión) · Disparo certero + Lluvia de flechas (Tirador) · Infusión de poder + Escudo sagrado (Devoción) |
| Normal 3-10 | Rayo en cadena | 14 | 11 → 11 % | 12 / 100 / 31 % | 59 / 58 | ×0.86 / ×1.07 / ×0.90 | 13 % / 10 % / 12 % | — | Tajo debilitante + Baluarte (Bastión) · Fuego rápido + Disparo certero (Tirador) · Sanar + Infusión de poder (Devoción) |
| Normal 4-10 | Culpa | 16 | 12 → 16 % | 75 / 100 / 81 % | 30 / 30 | ×1.02 / ×1.58 / ×1.11 | 16 % / 10 % / 14 % | — | Tajo debilitante + Baluarte (Bastión) · Fuego rápido + Disparo certero (Tirador) · Sanar + Infusión de poder (Devoción) |
| Normal 5-10 | Silencio dorado | 17 | 13 → 13 % | 100 / 100 / 100 % | 21 / 21 | ×1.33 / ×1.72 / ×1.33 | 10 % / 8 % / 10 % | — | Tajo debilitante + Baluarte (Bastión) · Fuego rápido + Disparo certero (Tirador) · Sanar + Infusión de poder (Devoción) |
| Normal 6-10 | Resaca | 18 | 16 → 16 % | 100 / 100 / 100 % | 16 / 17 | ×1.58 / ×2.33 / ×1.58 | 10 % / 7 % / 10 % | — | Piel de piedra + Baluarte (Bastión) · Fuego rápido + Disparo certero (Tirador) · Sanar + Infusión de poder (Devoción) |
| Normal 7-10 | Esporas | 19 | 19 → 19 % | 100 / 100 / 100 % | 18 / 18 | ×1.58 / ×2.13 / ×1.51 | 12 % / 9 % / 13 % | — | Tajo debilitante + Baluarte (Bastión) · Fuego rápido + Disparo certero (Tirador) · Sanar + Infusión de poder (Devoción) |
| Normal 8-10 | Hoja al rojo | 19 | 13 → 13 % | 100 / 100 / 100 % | 24 / 23 | ×1.11 / ×1.33 / ×1.11 | 12 % / 10 % / 12 % | — | Tajo debilitante + Baluarte (Bastión) · Fuego rápido + Disparo certero (Tirador) · Sanar + Infusión de poder (Devoción) |
| Normal 9-10 | Balanza | 20 | 13 → 13 % | 100 / 100 / 100 % | 21 / 23 | ×1.22 / ×1.65 / ×1.16 | 11 % / 8 % / 11 % | — | Baluarte + Grito de guerra (Bastión) · Fuego rápido + Disparo certero (Tirador) · Sanar + Escudo sagrado (Devoción) |
| Normal 10-10 | Espejos | 21 | 15 → 15 % | 81 / 100 / 81 % | 28 / 27 | ×1.02 / ×1.38 / ×1.02 | 15 % / 11 % / 15 % | — | Baluarte + Sed de sangre (Bastión) · Fuego rápido + Disparo certero (Tirador) · Sanar + Infusión de poder (Devoción) |
| Infierno 1-10 | Bandada | 26 | 21 → 28 % | 62 / 75 / 50 % | 36 / 31 | ×0.98 / ×1.07 / ×0.90 | 29 % / 26 % / 31 % | ×0.90 | Tajo debilitante + Baluarte (Bastión) · Fuego rápido + Disparo certero (Tirador) · Sanar + Infusión de poder (Devoción) |
| Infierno 2-10 | Raíces | 31 | 17 → 40 % | 100 / 100 / 75 % | 48 / 30 | ×1.22 / ×1.51 / ×1.02 | 33 % / 27 % / 39 % | ×1.51 | Grito de guerra + Sed de sangre (Bastión) · Fuego rápido + Disparo certero (Tirador) · Infusión de poder + Purificar (Devoción) |
| Infierno 3-10 | Rayo en cadena | 34 | 31 → 70 % | 100 / 100 / 100 % | 54 / 46 | ×1.22 / ×1.51 / ×1.11 | 58 % / 46 % / 63 % | ×1.51 | Grito de guerra + Sed de sangre (Bastión) · Fuego rápido + Disparo certero (Tirador) · Sanar + Infusión de poder (Devoción) |
| Infierno 4-10 | Culpa | 35 | 50 → 67 % | 100 / 100 / 88 % | 62 / 51 | ×1.11 / ×1.38 / ×1.07 | 60 % / 48 % / 63 % | ×1.38 | Grito de guerra + Sed de sangre (Bastión) · Disparo certero + Flecha explosiva (Tirador) · Sanar + Infusión de poder (Devoción) |
| Infierno 5-10 | Silencio dorado | 39 | 74 → 76 % | 94 / 100 / 56 % | 66 / 60 | ×1.07 / ×1.27 / ×0.98 | 71 % / 60 % / 78 % | ×1.27 | Grito de guerra + Sed de sangre (Bastión) · Disparo certero + Flecha explosiva (Tirador) · Infusión de poder + Purificar (Devoción) |
| Infierno 6-10 | Resaca | 39 | 72 → 72 % | 100 / 100 / 69 % | 63 / 53 | ×1.22 / ×1.38 / ×0.98 | 59 % / 52 % / 74 % | ×1.38 | Grito de guerra + Sed de sangre (Bastión) · Fuego rápido + Disparo certero (Tirador) · Sanar + Infusión de poder (Devoción) |
| Infierno 7-10 | Esporas | 40 | 76 → 75 % | 100 / 100 / 56 % | 65 / 56 | ×1.11 / ×1.27 / ×0.94 | 67 % / 59 % / 80 % | ×1.27 | Grito de guerra + Sed de sangre (Bastión) · Fuego rápido + Disparo certero (Tirador) · Sanar + Infusión de poder (Devoción) |
| Infierno 8-10 | Hoja al rojo | 41 | 67 → 64 % | 100 / 100 / 31 % | 66 / 61 | ×1.07 / ×1.22 / ×0.94 | 60 % / 53 % / 68 % | ×1.27 | Baluarte + Grito de guerra (Bastión) · Fuego rápido + Disparo certero (Tirador) · Sanar + Infusión de poder (Devoción) |
| Infierno 9-10 | Balanza | 43 | 67 → 71 % | 88 / 100 / 0 % | 74 / 69 | ×1.02 / ×1.11 / ×0.86 | 69 % / 64 % / 83 % | ×1.11 | Grito de guerra + Sed de sangre (Bastión) · Disparo certero + Punto débil (Tirador) · Infusión de poder + Purificar (Devoción) |
| Infierno 10-10 | Espejos | 50 | 75 → 94 % | 94 / 100 / 19 % | 71 / 64 | ×1.02 / ×1.16 / ×0.82 | 92 % / 81 % / 114 % | ×1.16 | Grito de guerra + Mantener la línea (Azote) · Fuego rápido + Disparo certero (Tirador) · Sanar + Infusión de poder (Devoción) |
| Averno 1-10 | Bandada | 53 | 80 → 83 % | 6 / 81 / 0 % | 74 / 62 | ×0.90 / ×1.11 / ×0.72 | 92 % / 74 % / 115 % | ×1.07 | Grito de guerra + Réplica (Bastión) · Fuego rápido + Disparo certero (Tirador) · Infusión de poder + Castigo (Celo) |
| Averno 4-10 | Culpa | 63 | 84 → 84 % | 88 / 100 / 19 % | 66 / 50 | ×1.02 / ×1.45 / ×0.86 | 82 % / 58 % / 98 % | ×1.27 | Grito de guerra + Réplica (Azote) · Fuego rápido + Disparo certero (Tirador) · Sanar + Infusión de poder (Devoción) |
| Averno 5-10 | Silencio dorado | 65 | 82 → 87 % | 19 / 69 / 6 % | 72 / 62 | ×0.86 / ×0.90 / ×0.72 | 101 % / 97 % / 120 % | ×0.94 | Tajo debilitante + Grito de guerra (Bastión) · Fuego rápido + Disparo certero (Tirador) · Infusión de poder + Castigo (Devoción) |
| Averno 7-10 | Esporas | 71 | 82 → 91 % | 75 / 100 / 25 % | 63 / 51 | ×1.02 / ×1.33 / ×0.69 | 89 % / 69 % / 132 % | ×1.38 | Grito de guerra + Sed de sangre (Bastión) · Disparo certero + Punto débil (Tirador) · Sanar + Infusión de poder (Celo) |
| Averno 10-10 | Espejos | 79 | 89 → 99 % | 25 / 44 / 0 % | 73 / 63 | ×0.82 / ×0.82 / ×0.56 | 120 % / 120 % / 178 % | ×0.79 | Grito de guerra + Sed de sangre (Azote) · Disparo certero + Lluvia de flechas (Tirador) · Infusión de poder + Castigo (Celo) |
| Eterno 1-10 | Bandada | 82 | 103 → 120 % | 56 / 100 / 0 % | 74 / 61 | ×0.98 / ×1.16 / ×0.75 | 123 % / 103 % / 159 % | ×1.16 | Piel de piedra + Grito de guerra (Bastión) · Disparo certero + Punto débil (Tirador) · Infusión de poder + Castigo (Celo) |
| Eterno 3-10 | Rayo en cadena | 87 | 166 → 166 % | 100 / 100 / 38 % | 65 / 52 | ×1.11 / ×1.45 / ×0.90 | 149 % / 115 % / 185 % | ×1.38 | Grito de guerra + Sed de sangre (Azote) · Disparo certero + Punto débil (Tirador) · Sanar + Infusión de poder (Celo) |
| Eterno 5-10 | Silencio dorado | 91 | 98 → 136 % | 100 / 100 / 38 % | 62 / 55 | ×1.22 / ×1.38 / ×0.94 | 112 % / 98 % / 145 % | ×1.38 | Grito de guerra + Mantener la línea (Azote) · Fuego rápido + Disparo certero (Tirador) · Infusión de poder + Castigo (Devoción) |
| Eterno 7-10 | Esporas | 92 | 123 → 127 % | 25 / 100 / 6 % | 73 / 65 | ×0.98 / ×1.16 / ×0.75 | 130 % / 109 % / 168 % | ×1.16 | Grito de guerra + Sed de sangre (Azote) · Disparo certero + Punto débil (Tirador) · Nova sagrada + Purificar (Celo) |
| Eterno 10-10 | Espejos | 101 | 122 → 143 % | 19 / 100 / 0 % | 76 / 69 | ×0.94 / ×1.11 / ×0.75 | 153 % / 128 % / 190 % | ×1.16 | Tajo debilitante + Grito de guerra (Azote) · Disparo certero + Punto débil (Tirador) · Infusión de poder + Castigo (Celo) |
| Tormento 1-10 | Bandada | 107 | 162 → 167 % | 6 / 69 / 0 % | 81 / 74 | ×0.90 / ×0.98 / ×0.79 | 186 % / 171 % / 212 % | ×0.98 | Grito de guerra + Mantener la línea (Azote) · Fuego rápido + Disparo certero (Tirador) · Sanar + Infusión de poder (Devoción) |
| Tormento 4-10 | Culpa | 113 | 171 → 171 % | 100 / 100 / 31 % | 74 / 61 | ×1.07 / ×1.27 / ×0.86 | 160 % / 135 % / 199 % | ×1.27 | Grito de guerra + Sed de sangre (Azote) · Disparo certero + Punto débil (Tirador) · Nova sagrada + Castigo (Celo) |
| Tormento 5-10 | Silencio dorado | 115 | 157 → 163 % | 31 / 100 / 12 % | 78 / 72 | ×0.94 / ×1.07 / ×0.75 | 174 % / 153 % / 216 % | ×1.07 | Grito de guerra + Réplica (Azote) · Disparo certero + Punto débil (Tirador) · Infusión de poder + Nova sagrada (Celo) |
| Tormento 7-10 | Esporas | 119 | 152 → 162 % | 31 / 100 / 0 % | 81 / 70 | ×0.90 / ×1.07 / ×0.75 | 181 % / 152 % / 215 % | ×1.07 | Grito de guerra + Sed de sangre (Azote) · Disparo certero + Punto débil (Tirador) · Infusión de poder + Castigo (Celo) |
| Tormento 10-10 | Espejos | 120 | 247 → 282 % | 19 / 100 / 6 % | 79 / 68 | ×0.90 / ×1.11 / ×0.75 | 314 % / 253 % / 374 % | ×1.07 | Tajo debilitante + Grito de guerra (Azote) · Disparo certero + Punto débil (Acechador) · Infusión de poder + Castigo (Celo) |

| Dificultad | Óptima / por defecto (margen, mediana) | Por defecto / aleatoria | Óptima / aleatoria | Genérica / óptima |
|---|---|---|---|---|
| Normal (10 muros) | ×1.33 | ×1.00 | ×1.33 | — |
| Infierno (10 muros) | ×1.14 | ×1.16 | ×1.33 | ×1.00 |
| Averno (5 muros) | ×1.24 | ×1.24 | ×1.54 | ×0.96 |
| Eterno (5 muros) | ×1.19 | ×1.30 | ×1.54 | ×1.00 |
| Tormento (5 muros) | ×1.19 | ×1.19 | ×1.41 | ×1.00 |

Por mecánica: lo que gana la óptima sobre la por defecto, y si aparece la herramienta que le respondería.

| Mecánica | Óptima / por defecto (Infierno en adelante) | ¿Aparece su «respuesta» en la óptima? |
|---|---|---|
| Bandada | ×1.09 · ×1.24 · ×1.19 · ×1.09 | Purificar en 0 de 4 |
| Raíces | ×1.24 | Purificar en 1 de 1 |
| Rayo en cadena | ×1.24 · ×1.30 | Purificar en 0 de 2 |
| Culpa | ×1.24 · ×1.41 · ×1.19 | Purificar en 0 de 3 |
| Silencio dorado | ×1.19 · ×1.04 · ×1.14 · ×1.14 | Purificar en 1 de 4 |
| Resaca | ×1.14 | Purificar en 0 de 1 |
| Esporas | ×1.14 · ×1.30 · ×1.19 · ×1.19 | Purificar en 1 de 4 |
| Hoja al rojo | ×1.14 | Purificar en 0 de 1 |
| Balanza | ×1.09 | Purificar en 1 de 1 |
| Espejos | ×1.14 · ×1.00 · ×1.19 · ×1.24 | Purificar en 0 de 4 |


**Farmeo** (una vuelta a la etapa X-5, grupo al llegar al muro de su mundo; 4 semillas, 8 en la aleatoria):

| Etapa | Por defecto | Óptima del muro | Aleatoria |
|---|---|---|---|
| Normal 10-5 | 101 s | 104 s | 97 s |
| Infierno 5-5 | 176 s | 156 s | 165 s |
| Infierno 10-5 | 197 s | 188 s | 201 s |
| Averno 5-5 | 219 s | 197 s | 226 s |
| Averno 10-5 | 184 s | 166 s | 197 s |
| Eterno 5-5 | 226 s | 225 s | 236 s |
| Eterno 10-5 | 225 s | 197 s | 210 s |
| Tormento 5-5 | 181 s | 163 s | 177 s |
| Tormento 10-5 | 163 s | 153 s | 160 s |

**La partida entera** (6 semillas, medianas; la construcción solo cambia al entrar a cada muro):

| Política en los muros | Normal | Infierno | Averno | Eterno | Tormento (total) | Intentos fallidos | Por semilla |
|---|---|---|---|---|---|---|---|
| Por defecto | 3 h | 37 h | 128 h | 333 h | 592 h | 452 | 557–807 h |
| Óptima | 3 h | 34 h | 120 h | 282 h | 534 h | 354 | 438–722 h |
| Aleatoria | 3 h | 48 h | 155 h | 366 h | 855 h | 806 | 540–1 078 h |
| Por defecto + mascotas `median` | 3 h | 37 h | 128 h | 320 h | 553 h | 442 | 495–645 h |
| Por defecto, sonda vieja (afijos se resortean) | 3 h | 44 h | 137 h | 322 h | 588 h | 479 | 539–714 h |

### 4. Lectura

- **Sí influye**:
  - en un muro, construirse bien ahorra un 12–25 % de equipo frente a la construcción por defecto, y un 25–35 % frente a una al azar;
  - en la partida entera son −10 % y −38 % de horas;
  - en Normal, la por defecto y la aleatoria valen lo mismo (con nivel 10–20 hay poco donde elegir), pero la óptima ya gana hasta un ×1,5 de margen sobre la por defecto, sobre todo gracias a Baluarte.
- **No depende del jefe**:
  - la misma construcción de daño es la mejor en casi todos los muros;
  - las respuestas pensadas para cada mecánica (Purificar contra Raíces, Culpa y Esporas, o Mantener la línea contra Balanza y Hoja al rojo) no compensan el daño que se pierde por llevarlas;
  - la Priest óptima lleva Infusión de poder + Castigo; Castigo cura al instante, así que limpia las Esporas de paso. El Knight óptimo lleva dos habilidades ofensivas, no Piel de piedra ni Baluarte.
- **Los muros son una carrera de daño**: el grupo muere por la furia de los 60 s, casi nunca antes. La supervivencia apenas decide.
- **El farmeo no depende de la construcción** (0–10 %). Es equipo y nivel.
- **La vara de «equipo de la zona» se queda corta desde Eterno**: el grupo lleva entre un 120 y un 280 % del conjunto de referencia (240 cofres de X-9). La opción C que decidiste la sustituye en la pasada.

### 5. Flojo o sin verificar

- La óptima sale de una búsqueda local (por coordenadas, 2 vueltas, 4 semillas). Puede haber algo mejor, pero la genérica la iguala, así que es poco probable que se me escape una construcción mucho mejor.
- Margen con 16 semillas y bisección de 6 pasos: resolución de un 4 %.
- El grupo de los muros sale de una sola partida (semilla 1). Averno, Eterno y Tormento son una muestra de 5 de sus 10 muros.
- «Equipo necesario» supone que el daño escala con el equipo. No lo he comprobado con una escalera de equipo real.
- Las cifras de los 35 muros usan la medida de equipo de antes solo en su campo `gearPct` interno. El equipo de las tablas está medido de nuevo con la medida corregida (`build-study-extra.ts`).
- En la partida entera el farmeo usa siempre la construcción por defecto.

### 6. Preguntas para ti

1. **¿Quieres que la mejor construcción dependa del jefe?** Hoy una sola construcción de daño sirve para todos.
   - (a) Así está bien: construirse bien es encontrar una buena construcción general.
   - (b) Que cada mecánica castigue fuerte a quien no lleva su respuesta. Ejemplos: las Esporas sin tope si nadie las limpia; las Raíces que no se sueltan solas sin Purificar; la Culpa que se dobla si sigue puesta; la Balanza que golpea más fuerte si el grupo no lleva reducción en área.
   - (c) Que lo pidan los afijos y no las mecánicas. Por ejemplo: Venenoso mucho más duro si nadie purifica; Acorazado que solo rompen las habilidades.
2. **¿Más presión de supervivencia en los muros?** Hoy solo cuenta el daño, y por eso el tanque lleva habilidades ofensivas y la Priest no lleva Sanar.
   - (a) Así está bien.
   - (b) Jefes de mundo que peguen más fuerte durante los 60 s, con más área y más disparos a la retaguardia, para que cura y tanque de verdad hagan falta.
   - (c) Una furia más suave y un jefe que pegue más desde el principio.
3. **¿Qué construcción juega el «jugador medio» de la pasada final?** Lo que elijas cambia el ritmo medido en torno a un 10 %.
   - (a) La por defecto de hoy: un jugador que no optimiza.
   - (b) La genérica: un jugador que ha encontrado la buena. Con ella los muros quedarían un 10–20 % más duros para alcanzar las mismas horas.
   - (c) Un punto medio: la por defecto en Normal e Infierno y la genérica desde Averno.
4. **¿Mascotas en la sonda?**
   - (a) Sí, con `median` por defecto (−7 % de horas, lo más fiel).
   - (b) No, que la pasada mida sin mascotas y queden como regalo.


## Ronda 3 · punto de control 2: presión de los jefes de mundo y la sanadora

*16 nov 2026, de madrugada. Con el kit nuevo de la Priest (punto de control 2A) ya dentro. No se ha tocado la vida de los muros ni las horas: eso es el siguiente punto de control.*

### Resumen

- **Los jefes de mundo aprietan durante su minuto desde Infierno**:
  - golpe en área cada 6 s en vez de cada 10, que alcanza a todo el grupo por entero (1,2 en vez de 0,6);
  - la mitad de sus golpes normales van a la retaguardia;
  - en Eterno y Tormento pegan además un 15 % y un 45 % más.
  - Normal queda como estaba.
- **Las curas se lanzan más a menudo** para sostener eso: Sanar cada 14 s, Luz sanadora cada 12 s, Círculo de sanación y Santuario cada 20 s, Castigo cada 10 s. Lo que cura cada una no cambia, así que la regla de 30 / 22 / 20 / 15 % se mantiene.
- **Objetivo 1 (sin curas no se pasa desde Infierno)**:
  - cumplido desde Averno: la Priest sin curas gana entre un 0 y un 2 % de los muros incluso con ≥150 % del equipo de la zona;
  - en Infierno, a medias: con ≥150 % aún gana 5 de los 10 muros, porque esos muros mueren en menos de 30 s con ese equipo, antes de que la presión desgaste a nadie;
  - medido como aguante, cae antes de los 34 s en 20 de los 25 muros de Infierno en adelante.
- **Objetivo 2 (en Normal pasa cualquier construcción razonable)**: cumplido. La presión de Normal no cambia, y la por defecto, la óptima y la aleatoria ganan el 100 % en 9 de 10 muros.
- **Objetivo 3 (la mejor construcción depende del jefe)**: cumplido en buena parte.
  - La construcción más repetida queda más de un 4 % por debajo de la mejor en 18 de 25 muros; antes la genérica la igualaba en 22 de 25.
  - Las mejores construcciones tienen 6 parejas distintas de habilidades en el Knight, 4 en la Ranger y 6 en la Priest.
- **Objetivo 4 (el Knight ofensivo sufre desde Averno)**: a medias.
  - En aguante, el Knight sin defensas pierde a alguien antes o más a menudo que el que lleva defensas en 10 de 15 muros.
  - En margen sobre los muros de hoy solo es un 4–9 % peor, porque esos muros, con un 85 % de equipo, siguen siendo una carrera de daño.

### 1. Cambios

**Números**

| Dónde | Qué | Antes → ahora |
|---|---|---|
| `src/data/bossKit.ts` `WORLD_BOSS_PRESSURE` (nuevo) | Por dificultad (Normal / Infierno / Averno / Eterno / Tormento): `hitMult` × daño de todos sus golpes · `blowEveryMs` · `blowCoeff` · `splashCoeff` · `backShotChance` | Normal 1 / 10 s / 1,2 / 0,6 / 0 (como estaba) · Infierno y Averno 1 / 6 s / 1,2 / 1,2 / 0,5 · Eterno 1,15 / 6 s / 1,2 / 1,2 / 0,55 · Tormento 1,45 / 6 s / 1,2 / 1,2 / 0,55 |
| `src/data/abilities.ts` | Recarga de Sanar · Luz sanadora · Círculo de sanación | 20 → 14 s · 20 → 12 s · 30 → 20 s |
| `src/data/branchAbilities.ts` | Recarga de Santuario · Castigo | 30 → 20 s · 14 → 10 s |

**No son números (diseño)**

- **El mecanismo de presión**: una tabla por dificultad que aplica el sim.
  - `sim/bossMechanics.bossKit` cambia el golpe en área del jefe de mundo; Sísmico sigue mandando si es más rápido.
  - `sim/stages.spawnZoneBoss` le da el multiplicador de daño y la probabilidad de disparar a la retaguardia, la misma regla que ya tenían los tiradores.
  - Por qué: el tanque se sostiene solo (bloqueo, robo de vida), así que donde de verdad hacen falta curas es en la retaguardia, que es la que cae.
- **Las curas a más cadencia y no más grandes**, para respetar tu regla de tamaños (sobretiempo 30 %, instantánea 20–25 %, grupo 20 / 15 %).
- **Definiciones para medir**:
  - **«Priest DPS»** = Nova sagrada + Escudo sagrado (Celo). Castigo cuenta como cura, porque cura al instante y limpia.
  - **«Knight ofensivo»** = ninguna habilidad que reduzca daño, proteja o debilite al enemigo, es decir Grito de guerra + Sed de sangre. Por debajo del nivel 31 no existe.

**Herramientas** (sin efecto en el juego)

- `test/sim/probe/builds.ts`: una construcción puede llevar exactamente sus habilidades (`exact`), menos de dos si hace falta.
- `scripts/build-study.ts`:
  - añade «Priest DPS» y «Knight ofensivo»;
  - añade la victoria de cada construcción con ≥150 % del equipo de la zona (el grupo de la sonda, con cofres de este mundo y los siguientes);
  - acepta curas de prueba (`HEALS`).
- `scripts/pressure-survival.ts` (nuevo): cuánto aguanta cada grupo ante un muro que no puede morir, hasta los 60 s, sin depender de su vida.
- `scripts/pressure-tune.ts` (nuevo): comprobación rápida.
- **Tests**: `test/sim/worldBossPressure.test.ts` (3). Comprueba que Normal es como antes, que el golpe sale según la tabla y Sísmico sigue mandando, y que los golpes van a la retaguardia en la proporción de la tabla con el multiplicador de daño. El control de recargas de `test/sim/abilities.test.ts` está al día.

### 2. Aguante ante un muro que no muere

Prueba: `scripts/pressure-survival.ts`, 12 semillas por muro.
- «Con curas» = la mejor pareja Knight + Priest con curas, con un 85 % del equipo de la zona.
- «Priest sin curas» = esa misma pareja con la Priest DPS y un ≥150 %. Debe perder a alguien antes de 34 s: lo que tarda un grupo al 150 % en matar un muro que muere en 60 s al 85 %.
- «Knight ofensivo» = la pareja con curas, con el Knight sin defensas.

| Muro | Mecánica | Equipo 85 / 150 | Con curas (85 %): 1.ª caída · sin bajas | Priest sin curas (≥150 %): 1.ª caída · cae antes de 34 s | Knight ofensivo (85 %): 1.ª caída · sin bajas | Infusión (tiempo bajo ella) |
|---|---|---|---|---|---|---|
| Infierno 1-10 | Bandada | 89 / 142 % | 58 s · 83 % | 28 s · 92 % | 58 s · 83 % | 0 % |
| Infierno 2-10 | Raíces | 78 / 147 % | 60 s · 100 % | 26 s · 100 % | 60 s · 100 % | 0 % |
| Infierno 3-10 | Rayo en cadena | 88 / 150 % | 60 s · 100 % | 16 s · 100 % | 60 s · 100 % | 0 % |
| Infierno 4-10 | Culpa | 88 / 147 % | 55 s · 50 % | 20 s · 100 % | 42 s · 25 % | 0 % |
| Infierno 5-10 | Silencio dorado | 85 / 142 % | 60 s · 100 % | 20 s · 100 % | 60 s · 100 % | 0 % |
| Infierno 6-10 | Resaca | 90 / 154 % | 59 s · 67 % | 19 s · 100 % | 55 s · 67 % | 0 % |
| Infierno 7-10 | Esporas | 89 / 154 % | 60 s · 100 % | 22 s · 100 % | 60 s · 100 % | 0 % |
| Infierno 8-10 | Hoja al rojo | 84 / 159 % | 58 s · 75 % | 33 s · 50 % | 60 s · 100 % | 0 % |
| Infierno 9-10 | Balanza | 91 / 146 % | 60 s · 100 % | 30 s · 83 % | 56 s · 67 % | 0 % |
| Infierno 10-10 | Espejos | 79 / 142 % | 19 s · 0 % | 16 s · 100 % | 13 s · 0 % | 0 % |
| Averno 1-10 | Bandada | 78 / 145 % | 35 s · 8 % | 35 s · 42 % | 24 s · 0 % | 0 % |
| Averno 4-10 | Culpa | 90 / 145 % | 60 s · 100 % | 25 s · 92 % | 57 s · 83 % | 0 % |
| Averno 5-10 | Silencio dorado | 79 / 144 % | 32 s · 0 % | 24 s · 100 % | 17 s · 0 % | 0 % |
| Averno 7-10 | Esporas | 95 / 143 % | 48 s · 42 % | 21 s · 100 % | 47 s · 42 % | 0 % |
| Averno 10-10 | Espejos | 89 / 146 % | 54 s · 50 % | 17 s · 100 % | 39 s · 8 % | 0 % |
| Eterno 1-10 | Bandada | 69 / 151 % | 44 s · 17 % | 24 s · 100 % | 29 s · 0 % | 0 % |
| Eterno 3-10 | Rayo en cadena | 50 / 50 % | 7 s · 0 % | 5 s · 100 % | 5 s · 0 % | 0 % |
| Eterno 5-10 | Silencio dorado | 80 / 153 % | 60 s · 100 % | 32 s · 67 % | 56 s · 67 % | 0 % |
| Eterno 7-10 | Esporas | 60 / 145 % | 46 s · 42 % | 37 s · 50 % | 31 s · 8 % | 35 % |
| Eterno 10-10 | Espejos | 82 / 94 % | 54 s · 50 % | 15 s · 100 % | 48 s · 25 % | 21 % |
| Tormento 1-10 | Bandada | 81 / 160 % | 58 s · 83 % | 28 s · 83 % | 49 s · 25 % | 35 % |
| Tormento 4-10 | Culpa | 88 / 181 % | 60 s · 100 % | 21 s · 100 % | 60 s · 100 % | 25 % |
| Tormento 5-10 | Silencio dorado | 52 / 214 % | 36 s · 8 % | 36 s · 33 % | 20 s · 0 % | 24 % |
| Tormento 7-10 | Esporas | 77 / 175 % | 59 s · 92 % | 27 s · 83 % | 60 s · 100 % | 37 % |
| Tormento 10-10 | Espejos | 99 / 185 % | 59 s · 83 % | 24 s · 100 % | 42 s · 8 % | 43 % |

Priest sin curas cae antes de 34 s en ≥75 % de las semillas: 20/25 muros; Knight ofensivo peor que con defensa (desde Averno): 10/15

### 3. Peso de la construcción con la Priest nueva y la presión nueva

- 35 muros (los 20 de Normal e Infierno, 5 de cada dificultad siguiente) y 16 semillas por muro y construcción.
- D = por defecto, Ó = óptima, A = aleatoria, PD = Priest DPS, KO = Knight ofensivo.
- «Equipo necesario» = el equipo de la zona del grupo dividido por su margen. Mide la carrera de daño contra los muros tal y como están hoy.

| Muro | Mecánica | Nivel | Equipo | Victoria D / Ó / A / PD / KO | Victoria con ≥150 % D / Ó / PD / KO | Equipo necesario D / Ó / A / PD / KO | Óptima (Knight · Ranger · Priest) |
|---|---|---|---|---|---|---|---|
| Normal 1-10 | Bandada | 10 | 10 % (≥150: 155 %) | 81 / 50 / 75 / 0 / 50 % | 100 / 100 / 100 / 100 % | 10 / 11 / 10 / 12 / 11 % | Tajo debilitante + Baluarte (Bastión) · Disparo certero + Lluvia de flechas (Tirador) · Sanar + Luz sanadora (Devoción) |
| Normal 2-10 | Raíces | 12 | 12 % (≥150: 161 %) | 100 / 100 / 100 / 100 / 100 % | 100 / 100 / 100 / 100 % | 9 / 9 / 10 / 11 / 9 % | Tajo debilitante + Grito de guerra (Bastión) · Fuego rápido + Disparo certero (Tirador) · Luz sanadora + Nova sagrada (Devoción) |
| Normal 3-10 | Rayo en cadena | 14 | 12 % (≥150: 192 %) | 100 / 100 / 81 / 0 / 100 % | 100 / 100 / 100 / 100 % | 11 / 11 / 11 / 17 / 11 % | Tajo debilitante + Grito de guerra (Bastión) · Fuego rápido + Disparo certero (Tirador) · Luz sanadora + Nova sagrada (Devoción) |
| Normal 4-10 | Culpa | 16 | 17 % (≥150: 150 %) | 100 / 100 / 100 / 75 / 100 % | 100 / 100 / 100 / 100 % | 8 / 8 / 9 / 16 / 8 % | Tajo debilitante + Grito de guerra (Bastión) · Fuego rápido + Disparo certero (Tirador) · Sanar + Luz sanadora (Devoción) |
| Normal 5-10 | Silencio dorado | 17 | 25 % (≥150: 149 %) | 100 / 100 / 100 / 100 / 100 % | 100 / 100 / 100 / 100 % | 12 / 11 / 13 / 21 / 11 % | Tajo debilitante + Grito de guerra (Bastión) · Fuego rápido + Disparo certero (Tirador) · Sanar + Luz sanadora (Devoción) |
| Normal 6-10 | Resaca | 18 | 33 % (≥150: 156 %) | 100 / 100 / 100 / 100 / 100 % | 100 / 100 / 100 / 100 % | 9 / 9 / 10 / 19 / 9 % | Tajo debilitante + Baluarte (Bastión) · Fuego rápido + Disparo certero (Tirador) · Sanar + Luz sanadora (Devoción) |
| Normal 7-10 | Esporas | 19 | 35 % (≥150: 164 %) | 100 / 100 / 100 / 100 / 100 % | 100 / 100 / 100 / 100 % | 11 / 10 / 11 / 21 / 10 % | Tajo debilitante + Baluarte (Bastión) · Fuego rápido + Disparo certero (Tirador) · Luz sanadora + Nova sagrada (Devoción) |
| Normal 8-10 | Hoja al rojo | 19 | 24 % (≥150: 169 %) | 100 / 100 / 100 / 100 / 100 % | 100 / 100 / 100 / 100 % | 13 / 10 / 14 / 19 / 10 % | Tajo debilitante + Baluarte (Bastión) · Fuego rápido + Disparo certero (Tirador) · Luz sanadora + Nova sagrada (Devoción) |
| Normal 9-10 | Balanza | 20 | 14 % (≥150: 155 %) | 100 / 100 / 100 / 100 / 100 % | 100 / 100 / 100 / 100 % | 11 / 10 / 11 / 11 / 10 % | Tajo debilitante + Baluarte (Bastión) · Fuego rápido + Disparo certero (Tirador) · Sanar + Luz sanadora (Devoción) |
| Normal 10-10 | Espejos | 21 | 24 % (≥150: 213 %) | 100 / 100 / 100 / 69 / 100 % | 100 / 100 / 100 / 100 % | 16 / 14 / 18 / 25 / 14 % | Baluarte + Grito de guerra (Bastión) · Fuego rápido + Disparo certero (Tirador) · Sanar + Luz sanadora (Devoción) |
| Infierno 1-10 | Bandada | 26 | 36 % (≥150: 156 %) | 100 / 100 / 81 / 50 / 100 % | 100 / 100 / 100 / 100 % | 27 / 22 / 32 / 37 / 22 % | Tajo debilitante + Baluarte (Bastión) · Fuego rápido + Disparo certero (Tirador) · Luz sanadora + Círculo de sanación (Devoción) |
| Infierno 2-10 | Raíces | 31 | 33 % (≥150: 230 %) | 94 / 94 / 44 / 0 / 100 % | 100 / 100 / 100 / 100 % | 26 / 25 / 40 / 44 / 25 % | Tajo debilitante + Grito de guerra (Bastión) · Fuego rápido + Disparo certero (Tirador) · Sanar + Luz sanadora (Devoción) |
| Infierno 3-10 | Rayo en cadena | 34 | 74 % (≥150: 216 %) | 81 / 75 / 19 / 0 / 75 % | 100 / 100 / 100 / 100 % | 73 / 73 / 103 / 117 / 73 % | Grito de guerra + Sed de sangre (Bastión) · Fuego rápido + Disparo certero (Tirador) · Sanar + Luz sanadora (Devoción) |
| Infierno 4-10 | Culpa | 35 | 79 % (≥150: 152 %) | 25 / 81 / 0 / 0 / 81 % | 100 / 100 / 0 / 100 % | 89 / 78 / 105 / 143 / 78 % | Grito de guerra + Sed de sangre (Bastión) · Disparo certero + Flecha explosiva (Tirador) · Sanar + Luz sanadora (Devoción) |
| Infierno 5-10 | Silencio dorado | 39 | 72 % (≥150: 205 %) | 19 / 38 / 0 / 0 / 38 % | 100 / 100 / 100 / 100 % | 99 / 84 / 147 / 147 / 84 % | Grito de guerra + Sed de sangre (Bastión) · Fuego rápido + Disparo certero (Tirador) · Luz sanadora + Santuario (Devoción) |
| Infierno 6-10 | Resaca | 39 | 85 % (≥150: 152 %) | 62 / 69 / 12 / 0 / 94 % | 100 / 100 / 0 / 100 % | 87 / 99 / 153 / 216 / 76 % | Grito de guerra + Mantener la línea (Bastión) · Fuego rápido + Disparo certero (Tirador) · Sanar + Luz sanadora (Devoción) |
| Infierno 7-10 | Esporas | 40 | 72 % (≥150: 153 %) | 38 / 100 / 0 / 0 / 100 % | 100 / 100 / 31 / 100 % | 74 / 65 / 109 / 135 / 65 % | Grito de guerra + Sed de sangre (Bastión) · Disparo certero + Flecha explosiva (Tirador) · Luz sanadora + Santuario (Devoción) |
| Infierno 8-10 | Hoja al rojo | 41 | 65 % (≥150: 173 %) | 6 / 88 / 0 / 0 / 69 % | 100 / 100 / 31 / 100 % | 72 / 61 / 122 / 127 / 66 % | Tajo debilitante + Grito de guerra (Bastión) · Disparo certero + Punto débil (Tirador) · Sanar + Círculo de sanación (Devoción) |
| Infierno 9-10 | Balanza | 43 | 86 % (≥150: 168 %) | 0 / 25 / 0 / 0 / 19 % | 100 / 100 / 94 / 100 % | 109 / 96 / 142 / 169 / 96 % | Tajo debilitante + Grito de guerra (Bastión) · Disparo certero + Punto débil (Tirador) · Sanar + Luz sanadora (Celo) |
| Infierno 10-10 | Espejos | 50 | 177 % (≥150: 162 %) | 6 / 19 / 0 / 0 / 25 % | 0 / 0 / 0 / 12 % | 215 / 198 / 305 / 512 / 198 % | Baluarte + Grito de guerra (Bastión) · Fuego rápido + Disparo certero (Tirador) · Sanar + Luz sanadora (Devoción) |
| Averno 1-10 | Bandada | 53 | 112 % (≥150: 204 %) | 0 / 12 / 0 / 0 / 6 % | 88 / 62 / 0 / 88 % | 169 / 119 / 272 / 284 / 162 % | Tajo debilitante + Grito de guerra (Bastión) · Disparo certero + Punto débil (Tirador) · Sanar + Luz sanadora (Devoción) |
| Averno 4-10 | Culpa | 63 | 72 % (≥150: 155 %) | 56 / 94 / 6 / 0 / 94 % | 100 / 100 / 6 / 100 % | 73 / 65 / 129 / 183 / 65 % | Grito de guerra + Sed de sangre (Azote) · Disparo certero + Lluvia de flechas (Tirador) · Sanar + Luz sanadora (Devoción) |
| Averno 5-10 | Silencio dorado | 65 | 110 % (≥150: 206 %) | 0 / 50 / 0 / 0 / 50 % | 56 / 81 / 0 / 38 % | 146 / 118 / 280 / 256 / 123 % | Tajo debilitante + Grito de guerra (Bastión) · Fuego rápido + Disparo certero (Tirador) · Luz sanadora + Santuario (Devoción) |
| Averno 7-10 | Esporas | 71 | 116 % (≥150: 153 %) | 25 / 19 / 6 / 0 / 25 % | 100 / 100 / 0 / 94 % | 182 / 199 / 349 / 320 / 258 % | Grito de guerra + Sed de sangre (Bastión) · Fuego rápido + Disparo certero (Tirador) · Luz sanadora + Castigo (Celo) |
| Averno 10-10 | Espejos | 79 | 127 % (≥150: 181 %) | 0 / 0 / 0 / 0 / 6 % | 100 / 100 / 6 / 100 % | 271 / 309 / 519 / 456 / 218 % | Grito de guerra + Sed de sangre (Azote) · Fuego rápido + Disparo certero (Tirador) · Sanar + Luz sanadora (Devoción) |
| Eterno 1-10 | Bandada | 82 | 85 % (≥150: 150 %) | 0 / 69 / 0 / 0 / 50 % | 0 / 75 / 0 / 88 % | 108 / 87 / 198 / 257 / 91 % | Tajo debilitante + Grito de guerra (Bastión) · Fuego rápido + Disparo certero (Tirador) · Sanar + Luz sanadora (Celo) |
| Eterno 3-10 | Rayo en cadena | 87 | 319 % (≥150: 254 %) | 69 / 94 / 19 / 0 / 75 % | 69 / 94 / 0 / 75 % | 326 / 263 / 405 / 712 / 299 % | Grito de guerra + Réplica (Bastión) · Fuego rápido + Disparo certero (Tirador) · Luz sanadora + Círculo de sanación (Celo) |
| Eterno 5-10 | Silencio dorado | 91 | 202 % (≥150: 199 %) | 94 / 100 / 6 / 0 / 100 % | 94 / 100 / 0 / 100 % | 190 / 153 / 257 / 414 / 153 % | Grito de guerra + Sed de sangre (Bastión) · Disparo certero + Punto débil (Tirador) · Santuario + Castigo (Celo) |
| Eterno 7-10 | Esporas | 92 | 158 % (≥150: 187 %) | 0 / 88 / 0 / 0 / 81 % | 100 / 100 / 6 / 100 % | 184 / 155 / 228 / 337 / 148 % | Tajo debilitante + Grito de guerra (Azote) · Disparo certero + Punto débil (Tirador) · Círculo de sanación + Castigo (Celo) |
| Eterno 10-10 | Espejos | 101 | 192 % (≥150: 160 %) | 0 / 19 / 0 / 0 / 12 % | 0 / 19 / 0 / 12 % | 234 / 214 / 317 / 448 / 214 % | Grito de guerra + Mantener la línea (Azote) · Fuego rápido + Disparo certero (Tirador) · Luz sanadora + Castigo (Celo) |
| Tormento 1-10 | Bandada | 107 | 167 % (≥150: 156 %) | 0 / 25 / 0 / 0 / 6 % | 0 / 25 / 0 / 6 % | 222 / 186 / 389 / 443 / 186 % | Tajo debilitante + Grito de guerra (Azote) · Disparo certero + Punto débil (Tirador) · Sanar + Castigo (Celo) |
| Tormento 4-10 | Culpa | 113 | 174 % (≥150: 179 %) | 62 / 100 / 12 / 0 / 69 % | 62 / 100 / 0 / 69 % | 178 / 150 / 252 / 372 / 178 % | Tajo debilitante + Grito de guerra (Bastión) · Disparo certero + Punto débil (Acechador) · Círculo de sanación + Castigo (Celo) |
| Tormento 5-10 | Silencio dorado | 115 | 210 % (≥150: 224 %) | 0 / 19 / 0 / 0 / 6 % | 0 / 19 / 0 / 6 % | 244 / 224 / 345 / 448 / 244 % | Tajo debilitante + Grito de guerra (Bastión) · Disparo certero + Punto débil (Acechador) · Sanar + Castigo (Devoción) |
| Tormento 7-10 | Esporas | 119 | 175 % (≥150: 180 %) | 6 / 62 / 0 / 0 / 12 % | 6 / 62 / 0 / 12 % | 204 / 179 / 253 / 358 / 213 % | Tajo debilitante + Grito de guerra (Bastión) · Disparo certero + Punto débil (Acechador) · Nova sagrada + Castigo (Celo) |
| Tormento 10-10 | Espejos | 120 | 388 % (≥150: 314 %) | 0 / 50 / 0 / 0 / 31 % | 0 / 50 / 0 / 31 % | 493 / 414 / 586 / 1122 / 414 % | Grito de guerra + Réplica (Azote) · Disparo certero + Punto débil (Tirador) · Santuario + Castigo (Celo) |

| Dificultad | Óptima / por defecto | Óptima / aleatoria | Óptima / Priest DPS | Óptima / Knight ofensivo | Priest DPS gana con ≥150 % (media) |
|---|---|---|---|---|---|
| Normal (10) | ×1.02 | ×1.09 | ×1.84 | ×1.00 | 100 % |
| Infierno (10) | ×1.14 | ×1.54 | ×1.80 | ×1.00 | 56 % |
| Averno (5) | ×1.14 | ×2.00 | ×2.18 | ×1.04 | 2 % |
| Eterno (5) | ×1.24 | ×1.54 | ×2.71 | ×1.00 | 1 % |
| Tormento (5) | ×1.19 | ×1.54 | ×2.38 | ×1.09 | 0 % |

Construcción genérica (Tajo debilitante + Grito de guerra · Fuego rápido + Disparo certero · Sanar + Luz sanadora) frente a la mejor de cada muro, de Infierno en adelante:
- queda más de un 4 % por debajo en 18 de 25 muros;
- es entre un 4 y un 26 % peor;
- en 3 muros la iguala o la supera, porque la búsqueda local no siempre da con la mejor.

### 4. Lectura

- **La sanadora es obligatoria desde Averno.** Sin curas, el grupo no ve el final del minuto aunque vaya muy equipado.
- **En Infierno se nota en el aguante, pero no siempre en la victoria**: los muros de Infierno de hoy mueren antes de que la presión desgaste a nadie. Cuando la pasada de vida de los muros los ponga en 60 s con un 80–90 % de equipo, ese hueco se cierra.
- **Los muros ahora cuestan más**: con el equipo con el que la sonda los tumbaba, la construcción por defecto gana mucho menos en Infierno y Averno (por ejemplo Infierno 9-10: 0 %). El siguiente punto de control tiene que tenerlo en cuenta al ajustar la vida y las horas.
- **La mejor construcción ya no es una sola**: el Knight alterna Tajo debilitante + Grito de guerra, Grito de guerra + Sed de sangre y Mantener la línea o Réplica; la Priest, Sanar + Luz sanadora, Santuario, Círculo o Castigo según el jefe.
- **Infusión** (pasivo de Celo): 0 % del tiempo en Infierno y Averno, porque las mejores sanadoras allí son de Devoción; entre un 21 y un 43 % en Eterno y Tormento, cuando la sanadora es de Celo.

### 5. Flojo o sin verificar

- En 3 muros la búsqueda del grupo «al 85 %» no encontró nada cerca y se quedó en un 50–69 % de equipo (Eterno 3-10, Eterno 7-10, Tormento 5-10). Allí también cae el grupo con curas.
- Averno 1-10, Averno 5-10 e Infierno 10-10 son muy duros incluso con curas: Bandada, Silencio dorado y Espejos con la presión encima. Son candidatos a bajar la presión de su mecánica.
- El margen del Knight ofensivo apenas cambia mientras los muros sean una carrera de daño.
- **Recortes por los núcleos de eficiencia** (las últimas corridas van con `taskpolicy -b` y 5–6 procesos):
  - 12 semillas en el aguante final (8 en las de exploración);
  - 16 semillas en el estudio, como pediste;
  - 4 semillas en la búsqueda de la óptima;
  - 5 muros en cada dificultad desde Averno.

### 6. Preguntas

1. **Infierno con mucho equipo**:
   - (a) aceptar que un grupo con ≥150 % y sin curas pase algún muro de Infierno hasta que la pasada de vida los alargue;
   - (b) en Infierno, golpes más seguidos (cada 4 s), aunque la sanadora también sufra más.
2. **Knight ofensivo**:
   - (a) basta con que aguante menos;
   - (b) más daño sobre el tanque y defensas más fuertes (Piel de piedra 40 → 50 %, Tajo debilitante 25 → 35 %), para que el margen también lo note.
3. **Muros muy duros con curas** (Averno 1-10 y 5-10, Infierno 10-10):
   - (a) dejarlos, que la pasada de vida los ajuste;
   - (b) suavizar su mecánica bajo presión (los cuervos de Bandada, Silencio dorado, el reflejo de Espejos).
4. **Infusión casi no se usa en Infierno y Averno**:
   - (a) da igual, es de Celo;
   - (b) hacer Celo más atractivo para una sanadora media.


## Ronda 3 · punto de control 3a: lo decidido, cableado, y una medida gruesa

*16 nov 2026, de madrugada. Todavía no se ha tocado la vida de los muros: eso es el 3b.*

### 1. Cambios de números

| Dónde | Qué | Antes → ahora |
|---|---|---|
| `src/data/stageScaling.ts` `WAVES_BY_DIFFICULTY` | Oleadas por etapa | 8 / 12 / 16 / 20 / 20 → **16 / 17 / 18 / 19 / 20** |
| `src/data/stageScaling.ts` `WAVE_SIZE_MULT_BY_DIFFICULTY` (nuevo) | Tamaño de oleada por dificultad | Normal ×0,6, el resto ×1 (mínimo 3 enemigos) |
| `src/data/stageScaling.ts` `NORMAL_TRASH_HP_MULT` (nuevo) | Vida de los enemigos de oleada en Normal | ×0,6: allí un enemigo cae de 1–2 golpes. Las pruebas de anclaje lo admiten solo en Normal |
| `src/data/chests.ts` | Llave en cofre de jefe de etapa | 100 % en Normal y 25 % después → **25 % en todas** |
| `src/data/effects.ts` | Piel de piedra (reducción de daño) | 20 → 40 % → **30 → 50 %** |
| `src/data/effects.ts` | Tajo debilitante (daño que resta al enemigo) | 15 → 25 % → **25 → 35 %** |
| `src/data/bossKit.ts` `WORLD_BOSS_PRESSURE` | Golpe en área del jefe de mundo sobre el tanque (`blowCoeff`), de Averno a Tormento | 1,2 → **2,0 / 2,4 / 2,8** |

### 2. Cambios que no son números, con su porqué

- **Llave, opción A, en el juego.** `Simulation.handleClear` da una llave del mundo (`FIRST_CLEAR_KEYS` = 1) al limpiar por primera vez su X-9. La deja en `world.pending.keys` y el motor la pasa a la tienda (`addZoneKeys`). La sonda hace lo mismo. Hay test en `test/sim/worldBossPressure.test.ts`.
- **Normal con 16 oleadas: oleadas más pequeñas y enemigos más blandos.**
  - Con 16 oleadas, Normal se iba a 4,7–5,3 h.
  - Solo oleadas más pequeñas no basta, porque frena la subida de nivel y de equipo: con ×0,45 seguía en 4,2–4,6 h y empezaba a fallar muros.
  - Con oleadas ×0,6 y enemigos ×0,6 queda en 3,4–4,0 h.
  - Lo que sí cambia la regla de «2–3 golpes» es solo Normal, que el usuario quiere relajado.
- **Vara de «equipo de la zona», opción C, con un matiz.** El 100 % es cada hueco con un objeto del nivel del X-9 del mundo. La rareza es la habitual **de lo que se lleva puesto**: el percentil 90 de lo que cae en ese mundo, no la moda. Lleva gemas de esa rareza y, de cada hueco, la mejor de 3 piezas (`zoneReferenceSet`, en `zoneGear` y por tanto en el ajustador).
  - Por qué: la moda literal es la pieza común que se tira, de rareza 0–1 en Infierno y 3–4 en Tormento. El jugador medio de la sonda lleva entre 3 y 50 veces su daño desde Infierno.
  - Un muro que pidiera el 80–90 % de esa moda no sería un muro, y eso choca con la regla de exigencia de equipo.
  - La moda literal sigue disponible con `ZONE_REF_QUANTILE=mode ZONE_REF_GEMS=0`.
- **La medida de daño cuenta a quien cae a su ritmo.** `zoneGear.wallDamage` cuenta a un grupo que cae antes del minuto según el ritmo al que hacía daño hasta caer, no solo lo que llegó a quitar. Así el % de equipo mide el daño que da el equipo; el aguante se mide aparte. Sin esto, un grupo débil que cae a los 10 s salía con un % ridículo y la proporción se disparaba.
- **Jugador medio**: construcción por defecto en Normal e Infierno, y desde Averno la buena fija del estudio (`PROBE_GOOD_BUILD`: Tajo debilitante + Grito de guerra · Disparo certero + Punto débil · Sanar + Luz sanadora). La sonda cambia de construcción gratis al llegar a Averno (`buildAt`). Elegí la fija y no la mejor de cada muro porque es lo que haría un jugador medio y no depende del ruido de la búsqueda. Sin mascotas.
- **Tests actualizados**:
  - claves y anclajes de Normal;
  - valores del Knight en `test/sim/abilities.test.ts`, `test/sim/abilityPatch.test.ts` y `test/sim/worldBossesLate.test.ts`;
  - textos de Tajo debilitante en `test/ui/effectTipWords.test.ts` y `test/ui/talentWords.test.ts`;
  - prueba nueva de la vara C en `test/sim/probe/zoneGear.test.ts`.
- `tsc`, lint y vitest en verde: 108 archivos, 990 tests (1 omitido). Las corridas largas fueron con `taskpolicy -b` y como mucho 5 procesos.

### 3. Medida gruesa

Cuatro semillas, de Normal 1-1 a Tormento 10-10 (`scripts/pass-measure.ts`). «Muro» = el % de la vara C que lo mata justo en 60 s.

| Dificultad | Horas de esa dificultad (mediana · rango) | Objetivo | Intentos fallidos por muro (mediana) | Pelea al tumbar (s, mediana) | Equipo del grupo al tumbar (% vara C) | Muro (% vara C que lo mata en 60 s) |
|---|---|---|---|---|---|---|
| Normal | 4 h · 3–4 | 4 h | 0 | 25 | 29 % | 13 % |
| Infierno | 56 h · 47–60 | 40 h | 2 | 65 | 75 % | 91 % |
| Averno | 84 h · 67–97 | 120 h | 4 | 64 | 111 % | 117 % |
| Eterno | 175 h · 144–238 | 230 h | 10 | 68 | 148 % | 180 % |
| Tormento | 241 h · 206–358 | 325 h | 16 | 72 | 208 % | 255 % |

Total (mediana): 565 h · por semilla [504, 554, 577, 707] · días [64, 70, 73, 89]

Por muro (mediana de 4 semillas): equipo % vara C al tumbar / muro % / intentos fallidos / horas en el mundo
Normal 1:11/12/0/0.4 2:14/11/0/0.3 3:27/13/0/0.3 4:23/8/0/0.3 5:23/8/0/0.3 6:34/10/0/0.4 7:38/13/0/0.4 8:31/14/0/0.4 9:40/14/0/0.4 10:36/18/0/0.3
Infierno 1:40/29/2/3.1 2:37/25/2/3.4 3:52/49/1/3.4 4:70/80/4/8.8 5:70/87/1/3.9 6:83/91/2/4.4 7:84/99/0/0.8 8:100/110/2/7.6 9:85/106/2/1.3 10:111/122/6/20.3
Averno 1:145/176/3/3.3 2:75/92/5/6.1 3:90/105/0/1.0 4:95/114/2/2.2 5:124/118/2/7.0 6:85/95/4/9.3 7:92/104/3/4.1 8:167/188/7/13.6 9:148/161/0/0.5 10:173/217/14/21.2
Eterno 1:284/336/12/19.7 2:90/115/20/28.4 3:96/109/2/1.9 4:115/130/10/13.9 5:154/186/8/12.8 6:145/166/10/14.0 7:123/139/7/10.3 8:266/302/6/12.3 9:247/291/12/15.2 10:327/384/21/33.3
Tormento 1:327/399/28/30.8 2:83/127/44/55.7 3:83/92/2/6.4 4:108/125/20/23.7 5:224/256/16/13.6 6:205/254/16/18.5 7:156/175/8/9.9 8:328/454/10/8.0 9:293/412/16/15.5 10:402/538/46/41.9

**Sanadora** (aguante ante un muro que no muere; equipo con la vara nueva; 8 semillas):

| Muro | Mecánica | Equipo 85 / 150 | Con curas (85 %): 1.ª caída · sin bajas | Priest sin curas (≥150 %): 1.ª caída · cae antes de 34 s | Knight ofensivo (85 %): 1.ª caída · sin bajas | Infusión (tiempo bajo ella) |
|---|---|---|---|---|---|---|
| Infierno 2-10 | Raíces | 81 / 150 % | 60 s · 100 % | 22 s · 100 % | 60 s · 100 % | 0 % |
| Infierno 5-10 | Silencio dorado | 81 / 134 % | 23 s · 0 % | 18 s · 100 % | 22 s · 0 % | 0 % |
| Infierno 8-10 | Hoja al rojo | 93 / 154 % | 60 s · 100 % | 28 s · 100 % | 54 s · 75 % | 0 % |
| Averno 1-10 | Bandada | 81 / 143 % | 34 s · 12 % | 15 s · 100 % | 25 s · 0 % | 0 % |
| Averno 4-10 | Culpa | 81 / 143 % | 59 s · 88 % | 19 s · 100 % | 56 s · 75 % | 0 % |
| Averno 7-10 | Esporas | 81 / 146 % | 60 s · 100 % | 31 s · 88 % | 48 s · 38 % | 0 % |
| Averno 10-10 | Espejos | 101 / 132 % | 58 s · 88 % | 19 s · 100 % | 35 s · 0 % | 0 % |
| Eterno 4-10 | Culpa | 88 / 158 % | 60 s · 100 % | 26 s · 100 % | 54 s · 75 % | 14 % |
| Eterno 7-10 | Esporas | 110 / 150 % | 60 s · 100 % | 35 s · 50 % | 60 s · 100 % | 37 % |
| Eterno 10-10 | Espejos | 86 / 145 % | 58 s · 88 % | 16 s · 100 % | 49 s · 12 % | 22 % |
| Tormento 4-10 | Culpa | 102 / 148 % | 60 s · 100 % | 35 s · 38 % | 59 s · 88 % | 38 % |
| Tormento 7-10 | Esporas | 72 / 144 % | 60 s · 100 % | 31 s · 62 % | 60 s · 100 % | 42 % |
| Tormento 10-10 | Espejos | 82 / 148 % | 59 s · 88 % | 28 s · 88 % | 49 s · 25 % | 34 % |

Priest sin curas cae antes de 34 s en ≥75 % de las semillas: 10/13 muros; Knight ofensivo peor que con defensa (desde Averno): 6/10

**Knight defensivo frente al ofensivo en margen**, con la misma Ranger y Priest buenas y 12 semillas:
- el defensivo (Tajo debilitante + Grito de guerra) aguanta más vida de muro en 7 de 11 muros de Averno en adelante, entre un 4 y un 61 % más (Averno 7-10 ×1,30, Averno 10-10 ×1,61);
- empata en 3 y pierde en 1 (Eterno 10-10, ×0,96).

### 4. Frente a los objetivos

| Objetivo | Hoy | Estado |
|---|---|---|
| Normal ≈ 4 h | 3–4 h (mediana 4) | ✔ |
| Infierno ≈ 40 h | 56 h (47–60) | ✘ largo: los muros 4-10, 8-10 y 10-10 piden muchas horas |
| Averno ≈ 120 h | 84 h | ✘ corto |
| Eterno ≈ 230 h | 175 h | ✘ corto |
| Tormento ≈ 325 h | 241 h | ✘ corto (total 565 h, frente a ≈ 720) |
| Muros a ~60 s con un 80–90 % de la vara C | piden 13 % (Normal) · 91 % · 117 % · 180 % · 255 % | ✘ desde Averno piden de más; se mueren a 64–72 s porque el grupo va igual de sobrado |
| La exigencia de equipo sube por dificultad | 29 → 75 → 111 → 148 → 208 % de la vara al tumbar | ✔ sube, pero demasiado arriba |
| Desde Infierno no se pasa sin curas | Priest sin curas cae antes de 34 s en 10 de 13 muros | ✔ casi; flojo en Tormento 4-10 y 7-10 y Eterno 7-10 |
| El Knight defensivo gana desde Averno | Margen mejor en 7 de 11; aguante mejor en 6 de 10 | ✔ a medias |

### 5. Plan para el 3b (ajuste fino)

1. **Muros a la vara C.** Poner `WORLD_WALL_MULT` mundo a mundo para que cada muro pida su objetivo de la vara en 60 s. Propuesta de escalera: Normal 15–25 %, Infierno 60–80 %, Averno 80–90 %, Eterno 85–95 %, Tormento 90–100 %.
   - Desde Averno eso baja mucho los muros: hoy piden del 117 al 255 %, y lo que pidan de más se reparte en horas de farmeo.
   - Hay que recuperar esas horas con lo que manda el usuario: «las horas se cuadran con la vida de muros y enemigos».
2. **Horas.** Con muros más bajos desde Averno hay que alargar el camino:
   - enemigos y jefes de etapa más duros desde Averno (`GRUNT_HP_TUNE` y `STAGE_BOSS_HP_TUNE`, con la ventana de 2–3 golpes como guía);
   - o menos llaves (pasar del 25 % a algo menor desde Eterno).
   - Infierno hay que acortarlo: de 56 a ≈ 40 h, sobre todo los muros 4-10, 8-10 y 10-10.
3. **Sanadora**: volver a medir con los muros nuevos. Si la Priest sin curas aún gana muros de Infierno con ≥150 %, golpes en área cada 4 s en Infierno, como ya decidiste. Revisar la presión en Eterno y Tormento: hoy la Priest sin curas aguanta 35 s en Tormento 4-10.
4. **Knight**: si el margen sigue empatado en algunos muros, un poco más de golpe sobre el tanque en Eterno y Tormento.
5. **Método**: el ajustador (`scripts/tune-pacing.ts`) ya mide contra la vara nueva. Puntos de control por dificultad, 4 semillas, con `taskpolicy -b`.
