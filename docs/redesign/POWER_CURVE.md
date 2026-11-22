# La curva de poder (rediseño numérico, rama `redesign/power-curve`, 2026-11-22)

> Petición del usuario: «Cómo diseñarías un juego con esta misma progresión en la que los héroes van equipándose y
> tienen que enfrentarse a enemigos cada vez más fuertes sin descorrelacionar uno con otro … que no tengamos que medir
> cosas constantemente por 2 cambios minúsculos». Y: «Lo único que quiero es que el juego siga sintiéndose como que
> equiparte mejor acelera tu velocidad de farmeo o progreso».
>
> **Este documento sustituye**, para todo lo que sea números de poder (objetos, rarezas, gemas, estadísticas base,
> vida y daño de enemigos, mitigación), a `docs/DIFFICULTY.md` §5–§13, `docs/BALANCE.md` en lo que toca a esas cifras
> y las tablas medidas de `data/stageScaling.ts`. Lo demás (dificultades, mundos, cofres, llaves, oleadas, mecánicas
> de jefe, talentos, habilidades) sigue igual.

## 1. Una sola curva

Todo número de poder sale de **P(S)**, una curva que solo depende de la etapa global S (1 … 500):

    P(S) = POWER_GROWTH^(S − 1)        POWER_GROWTH = 1.02  (+2 % por etapa, ×1.22 por mundo, ≈ ×19 600 en total)

- **Objetos.** El nivel de objeto (`ilvl`) se mide en etapas: un objeto que cae en la etapa S tiene `ilvl ≈ S` (con
  una pequeña cola hacia arriba). Sus estadísticas planas valen `banda × reparto × rareza × GEAR_POWER × P(ilvl)`.
- **Héroes.** Las estadísticas planas de clase crecen con el nivel como `base × P(etapaDelNivel(L))^0,5`. La raíz es a
  propósito: el nivel viene de la experiencia, no de la zona, y un grupo unos niveles por detrás (porque pasó rápido una
  dificultad) no debe ser varias veces más débil. El equipo, que cae de la zona, es lo que lleva la curva.
- **Enemigos.** Su vida y su daño se calculan a partir del **héroe típico de la zona** (§3), que también sale de P.

Si se cambia P, todo se mueve a la vez. No queda ninguna tabla por mundo que reajustar.

## 2. Objetos: un presupuesto por rareza

- **Rareza = presupuesto total del objeto**, no un multiplicador por afijo: ×1,2 por escalón
  (`tiers.ts` statMultiplier = 1 · 1,2 · 1,44 · 1,73 · 2,07 · 2,49 · 2,99 · 3,58 · 4,3, T0 … T8). Un escalón vale
  ~9 etapas de la curva, así que una pieza dos rarezas por encima de lo habitual dura unos dos mundos (usuario:
  «ajustar el escalado de la rareza para que el equipo no caduque tan rápido»; con +15 % por escalón el juego salía
  el doble de largo). Antes: ×9 por afijo en T8 y además cuatro afijos más.
- El presupuesto se **reparte** entre los afijos: el afijo base pesa 2, cada secundario 1. Más rareza = más
  estadísticas distintas y algo más de poder, no un salto de ×9.
- **Estadísticas porcentuales** (crítico, daño crítico, velocidad, multigolpe, bloqueo, reducción de enfriamiento,
  poder de curación): `banda × reparto × rareza × PCT_SCALE`, **sin P**. Un porcentaje vale lo mismo en Normal que en
  Tormento; crecen solo con la rareza y el número de piezas. Así se corta la cadena de multiplicaciones (crítico ×
  daño crítico × velocidad × multigolpe) que hacía que el daño del equipo de Tormento 5 triplicara al de Tormento 1.
- **Gemas**: cada una da `GEM_FRACTION` de un afijo del mismo nivel y su rareza; el nivel de la gema es su etapa.
- **Tiradas perfectas**, el Cubo y el pulido siguen igual con la fórmula nueva.

## 3. El héroe típico de la zona (la referencia)

`sim/reference.ts` construye, sin combatir y sin azar, el grupo Knight · Ranger · Priest **típico** de una etapa S —
el jugador medio que llega allí, medido con la sonda rápida (§6):

- nivel = el esperado de la zona (continuo), con los talentos de la build por defecto a ese nivel;
- cada ranura con un objeto de `ilvl = S − 30` (lo que se lleva puesto es lo que cayó en los últimos mundos), de la
  rareza que lleva el jugador medio a esa altura del juego (una curva suave: 1,2 al final de Normal, 2,6 Hell,
  3,2 Inferno, 4,0 Eternal, 4,2 Tormento), tiradas medias, afijos según la clase y el 90 % de sus ranuras de gema
  llenas;
- durante Normal el equipo se va llenando (de nada en 1-1 a todo al final de Normal), como el de una partida nueva;
- su daño de habilidades y talentos se cuenta como × sus ataques básicos, creciente con el nivel (×0,8 a nivel 1,
  ×1,85 desde el 80): las habilidades y sus rangos llegan con el nivel.

De esas estadísticas, con las fórmulas reales de combate, salen: el golpe medio del que más pega, el daño por
segundo del grupo, la vida y la mitigación del Knight y la vida de la retaguardia. Todo en forma cerrada.

## 4. Enemigos a partir de la referencia

| Quién | Regla de diseño | Fórmula |
|---|---|---|
| Normal (grunt) | muere en 2–3 golpes del que más pega | `GRUNT_HITS (2.5) × golpe típico` |
| Élite | ~11 golpes | `× ELITE_HP_MULT (4.5)` |
| Jefe de etapa | 5–10 s del grupo | `STAGE_BOSS_SECONDS (7.5) × DPS típico` |
| Jefe de mundo (el muro) | pide un % por encima del equipo típico | `60 s × DPS típico × WALL_ASK(mundo)` |
| Daño de oleada al Knight | le quita X % de vida/s | `TRASH_THREAT_PCT × vida efectiva típica` |
| Daño de oleada atrás | X % de vida/s a la retaguardia | `TRASH_BACK_THREAT_PCT × vida típica de atrás` |
| Golpe de jefe | X % de vida/s del Knight | `BOSS_THREAT_PCT × vida efectiva típica` |
| Golpe aplastante, salpicaduras | % de vida | sobre la vida típica |

La vida es un número fijo de la zona: **no mira el equipo del jugador**. Quien lleva mejor equipo que el típico mata
en menos golpes, recibe menos en proporción, farmea más rápido y pasa antes los muros.

## 5. Los muros

`wallAsk(w)` (`data/power.ts`) es una curva suave por mundo: cuánto daño, en minutos del grupo típico, tiene el jefe de
mundo. `(0,42 + 1,88 · t^3,5) × inclinación` con t de 0 (Normal 1) a 1 (Tormento 10): suave al principio y empinada al final;
la inclinación (`WALL_ASK_TILT`) es un factor por mundo ajustado con `scripts/fit-wall-tilt.py` y rematado con la
sonda completa (usuario: «Eternal 230-250, Tormento 300-350», «cada mundo dentro de cada dificultad debería ir teniendo
dificultad creciente»). Todos los muros tienen el mismo reloj de 60 s (el muro de apertura de 120 s se retiró: hacía
gratis el mundo 1 y un salto el 2); las raíces del mundo 2 se suavizaron en las dificultades altas.
Ajustada con la sonda rápida a las horas por dificultad: un jugador llega a cada muro unos 0,6 por debajo del típico
(avanza en cuanto puede limpiar las etapas) y las horas que cuesta un muro crecen con lo que pide por encima de eso.
Un test comprueba que cada jefe tiene más vida que el anterior y que el mejor equipo de su zona siempre lo supera.

## 6. Qué se mide

- `npm test` (~6 s): todo menos las simulaciones largas, incluidos los invariantes de la curva
  (`test/sim/powerCurve.test.ts`, sin combate). `npm run test:slow` las simulaciones largas (`*.slow.test.ts`).
- `npm run probe:fast` (≈1 min por semilla): la partida entera de Normal a Tormento sin simular cada farmeo. Una
  calibración en combates reales (16 zonas × 8 niveles de equipo; `test/sim/probe/fast.ts`, cacheada en disco por la
  huella del código) da el tiempo de limpiar una etapa según cómo está el grupo frente al típico; los muros se pelean
  de verdad; el botín, el Cubo, las llaves y la experiencia son los reales. **Sesgo conocido:** desde Inferno da
  ≈ 1,5× las horas de la sonda completa (el farmeo modelado sobre equipo «de manual» lee mal el de un jugador real);
  sirve para comparar cambios, no para fijar las horas finales.
- `npm run probe` (horas): la sonda con todos los combates, para confirmar de vez en cuando.

Medido el 2026-11-22 con la **sonda completa** (3 semillas): Normal 11–14 h · Hell 53–66 · Inferno 115–138 ·
Eternal 235–248 · Tormento 281–333 (mediana 320), ≈ 760 h en total; ningún mundo atascado. Pendiente: el mundo 1 de
Eternal cuesta más que los siguientes (allí se paga el cambio de dificultad: más oleadas, botín y llaves nuevos).

## 7. Partidas guardadas

`GENERATOR_VERSION` 9. Los objetos guardados se convierten: el `ilvl` pasa de niveles a etapas y cada afijo conserva
su calidad de tirada (lo cerca que estaba del máximo de su banda) con la fórmula nueva.
