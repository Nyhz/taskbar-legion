# CLASSES.md — Kits de clase (propuesta con las decisiones del 2026-11-15 aplicadas)

> **Estado: propuesta revisada, todavía no especificación.** Nada de esto está implementado. Desarrolla
> `REDESIGN.md` §5 y §7 sobre las reglas reales del juego (leídas del código el 2026-11-15). Las reglas del
> sistema ya llevan las decisiones del usuario (sección siguiente). Los números nuevos son **valores de partida
> para sondear con `npm run probe`**, no balance. Los nombres van en inglés y español porque el juego sale en
> los dos idiomas; **todos son provisionales y están pendientes de revisión** (decisión 8).

Índice: decisiones · 1 lo que hay hoy · 2 reglas del sistema · 3 Knight · 4 Ranger · 5 Priest · 6 funciones de
simulación · 7 guardado · 8 qué sondear · 9 arte y sonido · 10 qué recortaría primero · 11 segunda tanda ·
12 preguntas que siguen abiertas.

---

## Decisiones tomadas (2026-11-15)

| # | Pregunta | Respuesta del usuario | Qué significa aquí |
|---|---|---|---|
| 1 | Ramas | «Respecto a talentos y las nuevas ramas, me parece bien pero hay que preservar el rol de cada personaje.» | Las ramas se quedan (mezclables, un solo remate). **Una rama cambia cómo se cumple el rol, nunca el rol**: las dos del Knight son de tanque, las dos del Ranger de daño, las dos de la Priest de sanadora (§2.2). |
| 2 | Habilidades activas | «Si, debemos limitar las habilidades aprendidas a 2 diferentes maximo, una vez hay 2 aprendidas, las otras deben aparecer greyed out, disabled.» | Sigue la regla de hoy: **aprendida = activa, dos distintas como mucho**. No hay tercer hueco ni se eligen activas en otra pestaña (§2.3). |
| 3 | Definitiva | «Al 30» | La definitiva de clase sigue siendo automática al nivel 30; el remate de rama la transforma (§2.4). |
| 4 | Cortar conjuros de jefes | «No sé, yo creo que no.» | **Sin interrupción.** El Knight no corta los conjuros de los jefes de mundo; la habilidad de Bastión que dependía de eso se sustituye (§3). |
| 5 | Primera tanda | «ok» | **7 habilidades por clase** (las 5 actuales + 1 por rama). Las otras 2 por clase van aparte, en §11. |
| 6 | Reembolso al actualizar | «Nadie empezará una partida previa» | No hay partidas que trasladar: sin flujo de reembolso ni aviso. Solo queda blindar la carga (§7). |
| 7 | Devolver puntos | «Si» | Sigue siendo gratis. |
| 8 | Nombres | «Luego los reviso.» | Se quedan como provisionales, pendientes de revisión. |

---

## 1. Lo que hay hoy (hechos, con su archivo)

- **Tres clases**, Knight (tanque) · Ranger (daño) · Priest (sanadora), `data/classes.ts`.
- **Acción ligada al golpe** (`sim/combat.ts` paso 4, `sim/abilities.castReadyAbilities`): cuando un héroe está
  listo para golpear, lanza UNA habilidad lista si su condición se cumple; si no, ataca. Cada golpe es una
  acción. Más velocidad de ataque = más acciones.
- **Habilidades** (`data/abilities.ts`): 5 por clase. Son declarativas: un objetivo (`self`, `lowestAllyHp`,
  `frontEnemy`, `meleeEnemies`, `allEnemies`, `allAllies`, `randomDpsAlly`, `tank`), una condición
  (`enemyPresent`, `allyBelowHpPct` < 70 %, `tankEngaged`), una lista de efectos y una potencia. Daño y DoT =
  `coef × daño de ataque`; cura, HoT y escudo = `coef × vida máxima del objetivo × (1 + poder de curación)`.
  Tres formas de «coste»: recarga, **cargas por autoataque** (Disparo certero: 10 golpes) y **aura pasiva**
  mientras está aprendida (Aura de retribución).
- **Efectos que la simulación ya procesa** (`data/effects.ts`, `sim/effects.ts`): modificador de estadística
  (también sobre aliados: así funciona Grito de guerra, y Piel de piedra es un +reducción de daño), daño, cura,
  DoT, HoT, escudo (no se apilan: si ya hay uno, la habilidad espera), invulnerable, vulnerable (+% de daño
  recibido; **se suman entre fuentes**), merma (−% de daño infligido), reducción de curas, silencio,
  acumulaciones independientes y prolongación.
- **Ralentizar enemigos ya funciona**: un −% de velocidad de ataque en un enemigo frena su cadencia y su avance
  (`combat.enemySpeedFactor`). Las fuentes **se suman**, con un suelo del 10 % de su velocidad.
- **Auras de grupo**: `loadout.partyAuraMods` reparte a todo el grupo, al montar a los héroes, la estadística
  de una habilidad-aura aprendida. Hoy solo lee habilidades, no nodos pasivos.
- **Definidos pero sin cablear:** `root` (existe `isRooted`, el movimiento no lo lee) y `tag` (existe
  `hasTag`, nadie lo usa).
- **Dos habilidades como mucho** (`MAX_ACTIVE_ABILITIES = 2`) y «aprendida = activa»: con dos habilidades con
  puntos, no se puede poner el primer punto en una tercera (`canLearnNewAbility`).
- **Definitivas** (`data/ultimates.ts`): una por clase, fuera del árbol, automática al **nivel 30**. Solo hay
  dos disparadores, escritos a mano en `combat.ts`: golpe letal (Knight) y trabar combate con un jefe
  (Ranger, Priest).
- **Árbol** (`data/talents.ts`): 10 filas; la fila N se abre con (N−1)·10 puntos gastados; nodos de 5 rangos.
  Filas 1–4: las 5 habilidades y 8 pasivas. Filas 5–10: 18 pasivas de porcentaje (relleno). **120 puntos en el
  tope**: uno al empezar y uno por nivel hasta el 120 (`partySlice`). Devolver puntos es gratis. Hay dos
  preajustes de equipo + talentos por héroe (Farm / Boss).
- **Curación:** ya existe la devaluación del poder de curación por dificultad (`HEAL_POWER_EFFECTIVENESS`:
  1 · 0,33 · 0,20 · 0,15 · 0,11). No es un tope: más poder de curación siempre cura más.
- **Topes que ya existen** (no se añade ninguno): reducción de recarga efectiva ≤ 75 % al lanzar, reducción de
  daño ≤ 80 %, y los «habilitadores» (crítico, bloqueo, golpe múltiple, reducción de recarga) con rendimiento
  decreciente.

---

## 2. Reglas del sistema

### 2.1 El árbol

Diez columnas; la columna N se abre con (N−1)·10 puntos gastados (regla actual, sin tocar).

| Columnas | Qué hay |
|---|---|
| 1–4 · **tronco común** | Las 5 habilidades de hoy y sus 8 pasivas, **con sus valores actuales**, más **3 talentos de rol** nuevos (uno en cada columna 2, 3 y 4) |
| 5–9 · **dos ramas** | Dos nodos por columna y rama |
| 10 · **remate** | La versión de rama de la definitiva |

Tipos de nodo:

| Nodo | Forma en la maqueta | Rangos | Qué es |
|---|---|---|---|
| Habilidad | Placa cuadrada | 5 | Una habilidad. Solo dos distintas pueden tener puntos (§2.3) |
| Pasiva | Sello redondo | 5 | Un porcentaje de una estadística |
| **Talento de rol** | Sello redondo (propongo aro del color de la clase) | 5 | Una pasiva **con comportamiento**, propia del rol de la clase y que no depende de qué habilidades se lleven |
| Modificador | Placa verdemar | 1 | Cambia cómo se comporta una habilidad. **Apagado si esa habilidad no está aprendida** |
| Remate | Octógono | 1 | Transforma la definitiva. Solo uno de los dos |

Esqueleto de cada rama (igual para las seis, así la interfaz no cambia de forma):

| Col. | Nodo 1 | Nodo 2 |
|---|---|---|
| 5 | **Habilidad de rama** | Pasiva |
| 6 | Modificador de una habilidad del tronco | Modificador de **otra** habilidad del tronco — **elige uno** de los dos |
| 7 | Pasiva | Pasiva |
| 8 | Modificador de la habilidad de rama | Pasiva |
| 9 | Pasiva | Pasiva |
| 10 | **Remate** (pide ≥ 25 puntos en esa rama; excluye al otro remate) | |

### 2.2 El rol manda; las ramas se mezclan, el remate es uno

- **Regla de rol** (decisión 1): una rama cambia **cómo** cumple su papel el personaje, no el papel. Todo lo
  que hay en una rama — habilidad, modificadores, pasivas, remate — tiene que ser cosa de su rol. Se comprueba
  por rama en §3–§5, en la línea «Rol».
  - Knight: las dos ramas son de **tanque**. Sus pasivas de rama son defensivas (como mucho un nodo de daño
    de ataque por rama, igual que en el árbol de hoy); sus habilidades de rama aguantan, protegen o debilitan
    al enemigo. Ninguna rama lo convierte en el que más daño hace.
  - Ranger: las dos ramas son de **daño**. Sus habilidades de rama siempre hacen daño; lo que frene o señale
    al enemigo va de acompañamiento.
  - Priest: las dos ramas son de **sanadora**. Sus pasivas de rama son poder de curación, recarga, vida y
    resistencias; su daño propio es anecdótico. Amplificar a los aliados es apoyo y entra en su rol.
- **Los talentos de rol** del tronco refuerzan esa regla para cualquier combinación de habilidades.
- **Se puede gastar en las dos ramas** (los puntos son los que limitan) y **los dos remates son un «elige
  uno»**. No hay estado de «rama elegida».

### 2.3 Habilidades: aprendida = activa, dos distintas como mucho

Regla de hoy, sin tocar (decisión 2):

- Un héroe puede tener puntos en **dos habilidades distintas** como mucho. En cuanto hay dos, **todos los
  demás nodos de habilidad se ven apagados y no admiten puntos**, como ya enseña la maqueta.
- **Los modificadores de una habilidad sin aprender también están apagados** (el tooltip lo dice: «Necesita
  X»). Si se quita el último punto de una habilidad, su modificador se devuelve con ella.
- Para cambiar de habilidad se le quitan los puntos a una (gratis) y se ponen en otra. Los preajustes Farm /
  Boss siguen guardando equipo + talentos.
- La definitiva no cuenta. El Aura de retribución sí: es una de las dos.
- Con 7 habilidades por clase hay 21 parejas posibles; la pareja elegida es la primera decisión del héroe.
- **La pestaña «Habilidades» se queda sin trabajo**: no hay nada que elegir fuera del árbol. Propongo quitarla
  (el panel de héroe queda en Equipo · Talentos) y que las dos habilidades aprendidas y la definitiva se vean
  en la pestaña Equipo con su recarga en vivo, como hace hoy la barra de habilidades (pregunta 3 de §12).

### 2.4 Definitivas

- La **definitiva de clase sigue siendo automática al nivel 30**, igual que hoy (decisión 3).
- El **remate** de cada rama (columna 10, 1 punto) la **transforma** en su versión de especialización. Es
  contenido de final de juego y el premio a comprometerse con una rama.

### 2.5 Modificadores

Un modificador es un nodo de 1 punto que cambia **cómo** se comporta una habilidad. Casi todos se expresan
como un **parche de datos** sobre la definición de la habilidad (un efecto añadido, otra duración o carga,
otro objetivo), resuelto al montar el héroe: el bucle de combate ni se entera.

Con dos habilidades por héroe, **cada habilidad tiene un solo nodo modificador**, y están repartidos para
cubrir cuantas más habilidades mejor:

- El par «elige uno» de la columna 6 modifica **las dos habilidades del tronco más afines a la rama**. Quien
  lleva las dos, elige cuál potencia; quien lleva una, toma la suya.
- El modificador de la columna 8 es el de **la habilidad de la propia rama**.
- Así, 6 de las 7 habilidades de cada clase tienen modificador (queda fuera una del tronco por clase: Grito de
  guerra, Lluvia de flechas y Aura de retribución). Un héroe usa como mucho 2 modificadores.

### 2.6 Presupuesto de puntos (120 en el tope)

| Dónde | Puntos | ¿Depende de qué habilidades lleve? |
|---|---|---|
| 2 habilidades × 5 rangos | 10 | No (siempre hay dos) |
| Tronco: 8 pasivas × 5 | 40 | No |
| Tronco: 3 talentos de rol × 5 | 15 | No |
| Ramas: 6 pasivas × 5 × 2 ramas | 60 | No |
| Remate | 1 | No |
| **Garantizado** | **126** | |
| Modificadores | 0–2 | Sí |
| **Total gastable** | **126–128** | |

- Para 120 puntos hay siempre entre 126 y 128 sitios: **no sobra ningún punto y quedan 6–8 cosas sin comprar**,
  lleve las habilidades que lleve. (Hoy son 140 gastables para 120.)
- Sin los talentos de rol serían 111–113: quedarían 7–9 puntos sin destino en el tope. Por eso existen, y por
  eso son de rol y no más porcentajes sueltos.
- **Estadísticas sueltas**: las filas 5–10 de hoy son 90 puntos de porcentajes; las ramas son 60, repartidos
  entre modificadores, «elige uno», habilidad de rama y remate. Los talentos de rol son comportamiento.
- En el tope, casi todo el árbol está comprado: lo que distingue a dos héroes de nivel 120 es su pareja de
  habilidades, sus modificadores, su remate y los 6–8 puntos que dejan fuera. La elección de verdad está
  subiendo de nivel, que es casi todo el juego.
- Una rama entera cuesta 30 (pasivas) + hasta 5 (su habilidad) + hasta 2 (modificadores) + 1 (remate). El
  remate pide ≥ 25 puntos en su rama.
- El arranque no cambia: la columna 1 es idéntica a la fila 1 de hoy.

### 2.7 Lo que cambia en la maqueta de talentos

1. Columnas 2–4 del tronco: un **cuarto nodo** por columna (el talento de rol). La habilidad sube a la línea
   de arriba y el talento de rol ocupa la segunda, donde hoy la habilidad va centrada.
2. Columna 5 de cada rama: el primer nodo pasa de sello a **placa** (la habilidad de rama).
3. El par «elige uno» de la columna 6 son modificadores de **dos habilidades distintas**.
4. Estado **apagado** para el modificador cuya habilidad no está aprendida, con su línea en el tooltip.
5. Se quita la tercera pestaña (Habilidades) si se aprueba la pregunta 3.
6. La cabecera no cambia: dos cuadraditos de habilidad, puntos por gastar, devolver puntos.

### 2.8 Curación y escalados

No propongo ninguna fórmula nueva: las curas siguen siendo `% de vida máxima × poder de curación` con la
devaluación por dificultad que ya existe. Lo que hay que vigilar es la **suma de fuentes nuevas** (curas de
grupo, reducciones de daño de grupo, vulnerabilidades y ralentizaciones que se suman entre sí): se resuelve
bajando coeficientes en el sondeo, nunca con un tope a una estadística.

### 2.9 Devolver puntos

Sigue siendo gratis (decisión 7). Con dos preajustes por héroe, cobrar por cambiar de talentos iría contra una
función que ya existe, y la economía ya es ajustada por diseño.

---

Leyenda de la columna **Sim**: ✓ = se puede escribir hoy como datos · **F1…F6** = necesita esa función de §6.
Recargas en segundos; «r1→r5» es el valor del rango 1 al 5; «/r» es por rango. DA = daño de ataque.

## 3. Knight — tanque

**Identidad.** Aguanta la línea y hace que pegarle salga caro. Su tronco ya lo dice: se endurece, debilita a lo
que tiene delante, se cubre, arenga al grupo o se sostiene robando vida.

- **Bastion / Bastión** — el tanque que **cubre a los demás**: reparte sus defensas, planta el escudo para todo
  el grupo y, al final, salva al aliado que iba a caer.
  **Rol:** tanque. Todo lo que añade es mitigación, propia o del grupo; no gana daño.
- **Scourge / Azote** — el tanque que **desgasta al que le pega**: cada golpe parado carga una respuesta que
  deja al enemigo mermado, su barrido los frena y su aguante se alarga bloqueando.
  **Rol:** tanque. Su presión sale de bloquear y recibir golpes, y lo que entrega son enemigos que pegan
  menos y más despacio. Sus pasivas son bloqueo, vida, armadura, robo de vida y reducción de daño, con un solo
  nodo de daño de ataque. Su remate es defensivo.

### Habilidades (7)

| # | Nombre (EN / ES) | Dónde | Qué hace | Números | Sim |
|---|---|---|---|---|---|
| 1 | Stone Skin / Piel de piedra | Tronco 1 | Recibe menos daño durante 6 s | −20→−40 %, recarga 20 | ✓ (actual) |
| 2 | Debilitating Cleave / Tajo debilitante | Tronco 1 | Barrido a todo lo que tiene a su alcance; los enemigos pegan menos 6 s | 120→200 % DA, merma 15→25 %, recarga 12 | ✓ (actual) |
| 3 | Bulwark / Baluarte | Tronco 2 | Escudo propio durante 8 s | 30→50 % de su vida, recarga 24 | ✓ (actual) |
| 4 | Battle Cry / Grito de guerra | Tronco 3 | Daño y crítico para todo el grupo 8 s | +15→25 % DA, +5→15 crítico, recarga 24 | ✓ (actual) |
| 5 | Bloodlust / Sed de sangre | Tronco 4 | Golpea más rápido y roba vida 8 s | +24→40 % velocidad, 8→12 % robo, recarga 24 | ✓ (actual) |
| 6 | Hold the Line / Mantener la línea | Bastión 5 | Planta el escudo: **todo el grupo recibe menos daño** 6 s | −10→−20 %, recarga 26 | ✓ (un modificador de reducción de daño sobre todos los aliados, como Grito de guerra reparte daño) |
| 7 | Riposte / Contragolpe | Azote 5 | Sin recarga: **cada golpe bloqueado da una carga**; a 4 cargas, devuelve un golpe y deja al enemigo golpeado **mermado** 4 s | 150→250 % DA, merma 10→20 % | Cargas y merma ✓ · carga por bloqueo **F5** |

**Mantener la línea** sustituye a Golpe de escudo (que dependía de cortar conjuros, decisión 4). Es el espejo
defensivo de Grito de guerra: una ventana corta en la que el grupo entero aguanta lo que venga — un golpe
fuerte de jefe, una oleada dura —, y encaja con el resto de Bastión. No necesita ninguna función nueva.

### Talentos de rol (tronco)

| Col. | Nombre (EN / ES) | Qué hace | Sim |
|---|---|---|---|
| 2 | Vanguard / Vanguardia | Todo el grupo recibe un 1 %/r menos de daño | **F4** (aura de grupo desde un talento) |
| 3 | Unyielding / Inquebrantable | Por debajo del 40 % de vida, +3 %/r de reducción de daño | **F4** (condición sobre su propia vida) |
| 4 | Warden / Custodio | Los aliados ganan un 2 %/r de vida máxima | **F4** (aura de grupo) |

### Árbol

| Col. | Tronco |
|---|---|
| 1 | Piel de piedra · Tajo debilitante · Vida +2 %/r · Armadura +2,5 %/r |
| 2 | Baluarte · **Vanguardia** · Vida +2 %/r · Bloqueo +2/r |
| 3 | Grito de guerra · **Inquebrantable** · Armadura +2,5 %/r · Resistencia mágica +2,5 %/r |
| 4 | Sed de sangre · **Custodio** · Vida +2 %/r · Bloqueo +2/r |

(Habilidades y pasivas del tronco = filas 1–4 actuales, con sus valores reales.)

| Col. | Bastión | Azote |
|---|---|---|
| 5 | **Mantener la línea** · Resistencia mágica +2,5 %/r | **Contragolpe** · Bloqueo +2/r |
| 6 *(elige uno)* | **Shared Skin / Piel compartida** — Piel de piedra cubre también al aliado con menos vida (F2+F3) · **Mending Bulwark / Baluarte que sana** — al romperse o acabarse, Baluarte cura al grupo un 6 % de su vida (F5) | **Crippling Cleave / Tajo lisiante** — los alcanzados por el Tajo atacan y avanzan un 20 % más despacio 6 s (F2) · **Thirst for Battle / Sed de batalla** — cada golpe bloqueado alarga Sed de sangre 1 s (F5) |
| 7 | Armadura +2,5 %/r · Vida +2 %/r | Vida +2 %/r · Robo de vida +0,6/r |
| 8 | **Standard Bearer / Portaestandarte** — mientras dura Mantener la línea, el Knight gana +10 de bloqueo y +10 % de armadura (F2) · Bloqueo +2/r | **Punishing Riposte / Contragolpe ejemplar** — Contragolpe se carga con 3 bloqueos en vez de 4 (F2) · Armadura +2,5 %/r |
| 9 | Vida +2 %/r · Reducción de daño +0,6/r | Reducción de daño +0,6/r · Daño de ataque +3 %/r |
| 10 | **Living Wall / Muralla viva** | **Vengeance / Venganza** |

Parejas de habilidades con camino claro: Piel + Tajo (un modificador en cada rama), Piel o Baluarte +
Mantener la línea (dos en Bastión), Tajo o Sed de sangre + Contragolpe (dos en Azote). Grito de guerra no
tiene modificador en esta tanda.

### Definitiva

- **Base (nivel 30, como hoy): Last Stand / Última resistencia.** Un golpe que lo mataría lo deja vivo, lo
  cura al 40 % y lo hace invulnerable 6 s. Una carga por etapa. ✓
- **Remate Bastión — Muralla viva.** La misma carga salva también a un **aliado** que fuera a caer: el aliado
  se queda con 1 de vida e invulnerable 3 s. (F5: el gancho de golpe letal mira a todo el grupo.)
- **Remate Azote — Venganza.** Cuando salta Última resistencia, todos los enemigos a su alcance quedan
  **mermados un 30 %** y **un 30 % más lentos** durante los 6 s que dura: el Knight compra tiempo para todo el
  grupo, no daño. (F2 sobre la definitiva: añade efectos al dispararse; el gancho ya existe.)

---

## 4. Ranger — daño

**Identidad.** Marca el ritmo del daño: ráfagas, un disparo que se carga golpe a golpe, área sobre la oleada.

- **Marksman / Puntería** — daño a **un objetivo**. Críticos y una ventana en la que el enemigo señalado
  recibe más daño. Es la rama de jefes.
  **Rol:** daño. Punto débil es un disparo que pega por sí mismo; que el señalado reciba más de todos es lo
  mismo que ya hace su definitiva (Marca del cazador) y multiplica sobre todo lo suyo.
- **Stalker / Acecho** — daño a **la oleada**: área, daño en el tiempo y suelo que arde. Es la rama de limpiar
  y de las oleadas duras.
  **Rol:** daño. Frasco de brea hace daño en el tiempo; que además frene es el acompañamiento. Ningún nodo de
  la rama es defensivo ni de apoyo.

### Habilidades (7)

| # | Nombre (EN / ES) | Dónde | Qué hace | Números | Sim |
|---|---|---|---|---|---|
| 1 | Rapid Fire / Fuego rápido | Tronco 1 | Más velocidad de ataque 8 s | +25→45 %, recarga 24 | ✓ (actual) |
| 2 | Aimed Shot / Disparo certero | Tronco 1 | Sin recarga: una carga por autoataque; a 10, un disparo pesado | 180→340 % DA | ✓ (actual) |
| 3 | Raining Arrows / Lluvia de flechas | Tronco 2 | Daño a toda la oleada | 120→280 % DA, recarga 20 | ✓ (actual) |
| 4 | Explosive Arrow / Flecha explosiva | Tronco 3 | Golpe fuerte al de delante y onda a los cercanos | 160→320 % DA, onda 60→120 %, recarga 18 | ✓ (actual) |
| 5 | Caltrops / Abrojos | Tronco 4 | Sangrado a toda la oleada en 4 s | 60→140 % DA, recarga 24 | ✓ (actual) |
| 6 | Weak Spot / Punto débil | Puntería 5 | Disparo al enemigo de delante que lo deja **señalado**: recibe más daño 6 s | 120→200 % DA, +6→12 % daño recibido, recarga 18 | ✓ con el ajuste de «vulnerable» (F3) |
| 7 | Tar Flask / Frasco de brea | Acecho 5 | Brea ardiendo sobre la oleada: **daño en 5 s** y los embarrados atacan y avanzan más despacio | 80→160 % DA en 5 s, −15→−30 % velocidad, recarga 22 | **F3** (dos efectos con su propio valor) |

### Talentos de rol (tronco)

| Col. | Nombre (EN / ES) | Qué hace | Sim |
|---|---|---|---|
| 2 | Predator / Depredador | +2 %/r de daño a enemigos por debajo del 30 % de vida | **F4** (condición sobre el objetivo) |
| 3 | Long Shot / Tiro largo | +1,5 %/r de daño a enemigos que aún no han llegado al cuerpo a cuerpo | **F4** |
| 4 | Hunter's Focus / Foco del cazador | +2 %/r de daño a élites y jefes | **F4** |

### Árbol

| Col. | Tronco |
|---|---|
| 1 | Fuego rápido · Disparo certero · Daño de ataque +3 %/r · Velocidad de ataque +1,5/r |
| 2 | Lluvia de flechas · **Depredador** · Crítico +2/r · Vida +2 %/r |
| 3 | Flecha explosiva · **Tiro largo** · Daño de ataque +3 %/r · Daño crítico +4/r |
| 4 | Abrojos · **Foco del cazador** · Velocidad de ataque +1,5/r · Crítico +2/r |

| Col. | Puntería | Acecho |
|---|---|---|
| 5 | **Punto débil** · Crítico +2/r | **Frasco de brea** · Velocidad de ataque +1,5/r |
| 6 *(elige uno)* | **Heartseeker / Buscacorazones** — Disparo certero siempre es crítico (F2) · **Focused Fire / Fuego concentrado** — Fuego rápido da además +20 de daño crítico (F2) | **Scorched Earth / Tierra quemada** — los alcanzados por Flecha explosiva arden: 60 % DA en 4 s (F2+F3) · **Barbed Caltrops / Abrojos de púas** — el sangrado de los Abrojos dura 6 s y hace un 50 % más en total (F2) |
| 7 | Daño crítico +4/r · Daño de ataque +3 %/r | Daño de ataque +3 %/r · Golpe múltiple +1,2/r |
| 8 | **Open Wound / Herida abierta** — Punto débil dura 9 s en vez de 6 (F2) · Daño de ataque +3 %/r | **Burning Tar / Brea ardiente** — el daño de la brea sube un 50 % y dura 2 s más (F2) · Daño de ataque +3 %/r |
| 9 | Daño crítico +4/r · Crítico +2/r | Velocidad de ataque +1,5/r · Reducción de recarga +1,5/r |
| 10 | **Relentless Mark / Marca implacable** | **Killing Field / Campo de muerte** |

Parejas con camino claro: Disparo certero o Fuego rápido + Punto débil (dos en Puntería), Flecha explosiva o
Abrojos + Frasco de brea (dos en Acecho), y cualquier mezcla de una de cada lado. Lluvia de flechas no tiene
modificador en esta tanda.

### Definitiva

- **Base (nivel 30, como hoy): Mark of the Hunter / Marca del cazador.** Al trabar combate con un jefe, lo
  marca: recibe +25 % de daño de todas las fuentes durante la pelea. ✓
- **Remate Puntería — Marca implacable.** La marca se pone también a las **élites**, y cuando su portador
  muere salta al enemigo de delante. (F5: al morir un enemigo, al trabar combate con una élite.)
- **Remate Acecho — Campo de muerte.** Al trabar combate con **cada oleada**, todos los enemigos reciben
  +10 % de daño y quedan frenados un 30 % durante 6 s. (F5: disparador de oleada; hoy solo existe el de jefe.)

Nota de balance: Punto débil y las dos marcas son «vulnerable», y la simulación **las suma**. Es el punto donde
el daño del grupo puede dispararse; va el primero en la lista de sondeo.

---

## 5. Priest — sanadora

**Identidad.** Sostiene y amplifica: cura a quien cae, cubre al tanque, acelera a quien pega.

- **Devotion / Devoción** — la sanadora que **sostiene al grupo entero**: curas de grupo, escudos que además
  protegen y, al final, una segunda oportunidad cuando la pelea se tuerce.
  **Rol:** sanadora. Todo es cura, escudo o mitigación.
- **Zeal / Fervor** — la sanadora que **mantiene al grupo fuerte**: sus curas llegan más a menudo y a más
  gente, y sus bendiciones cubren a dos héroes y a toda la etapa.
  **Rol:** sanadora de apoyo. Castigo sagrado es ante todo una cura rápida; su golpe es pequeño. Sus pasivas
  son poder de curación, recarga, vida y resistencia mágica — ninguna de daño propio.

### Habilidades (7)

| # | Nombre (EN / ES) | Dónde | Qué hace | Números | Sim |
|---|---|---|---|---|---|
| 1 | Mend / Alivio | Tronco 1 | Cura en el tiempo al aliado con menos vida | 15→25 % de su vida en 6 s, recarga 20 | ✓ (actual) |
| 2 | Power Infusion / Infusión de poder | Tronco 1 | Velocidad y recarga para un héroe de daño 6 s | +30→50 % ambas, recarga 24 | ✓ (actual) |
| 3 | Holy Shield / Escudo sagrado | Tronco 2 | Escudo al tanque mientras lo golpean, 4 s | 10→20 % de su vida, recarga 24 | ✓ (actual) |
| 4 | Holy Nova / Nova sagrada | Tronco 3 | Daño a toda la oleada | 120→280 % DA, recarga 20 | ✓ (actual) |
| 5 | Retribution Aura / Aura de retribución | Tronco 4 | Pasiva mientras está aprendida: todo el grupo hace más daño | +5→15 % | ✓ (actual) |
| 6 | Sanctuary / Santuario | Devoción 5 | Cura en el tiempo a **todo el grupo** cuando alguien baja del 70 % | 6→10 % de la vida de cada uno en 6 s, recarga 30 | ✓ |
| 7 | Smite / Castigo sagrado | Fervor 5 | **Cura al instante al aliado con menos vida**; de paso, un golpe de luz al enemigo de delante | cura 8→14 % de su vida, 60→100 % DA, recarga 14 | **F3** (dos efectos con objetivo y coeficiente propios) |

### Talentos de rol (tronco)

| Col. | Nombre (EN / ES) | Qué hace | Sim |
|---|---|---|---|
| 2 | Triage / Triaje | Sus curas son un 3 %/r más fuertes sobre aliados por debajo del 40 % de vida | **F4** (condición sobre el objetivo) |
| 3 | Vigil / Vigilia | Todo el grupo gana regeneración de vida (valor por rango a sondear) | **F4** (aura de grupo) |
| 4 | Sacred Ward / Guarda sagrada | Todo el grupo gana un 1,5 %/r de resistencia mágica | **F4** (aura de grupo) |

### Árbol

| Col. | Tronco |
|---|---|
| 1 | Alivio · Infusión de poder · Poder de curación +3/r · Vida +2 %/r |
| 2 | Escudo sagrado · **Triaje** · Reducción de recarga +1,5/r · Resistencia mágica +2,5 %/r |
| 3 | Nova sagrada · **Vigilia** · Poder de curación +3/r · Vida +2 %/r |
| 4 | Aura de retribución · **Guarda sagrada** · Reducción de recarga +1,5/r · Resistencia mágica +2,5 %/r |

| Col. | Devoción | Fervor |
|---|---|---|
| 5 | **Santuario** · Poder de curación +4/r | **Castigo sagrado** · Reducción de recarga +1,5/r |
| 6 *(elige uno)* | **Swift Mend / Alivio veloz** — el 30 % de Alivio cura al instante (F2+F3) · **Aegis / Égida** — Escudo sagrado da además −10 % de daño recibido mientras dura (F2) | **Radiant Nova / Nova radiante** — la Nova cura además un 3 % de su vida a cada aliado (F2+F3) · **Twin Infusion / Infusión gemela** — Infusión de poder alcanza a dos héroes (F2+F6) |
| 7 | Vida +2 %/r · Resistencia mágica +2,5 %/r | Poder de curación +3/r · Vida +2 %/r |
| 8 | **Deep Sanctuary / Santuario hondo** — Santuario da además a cada aliado un escudo del 4 % de su vida (F2+F3) · Poder de curación +4/r | **Mending Light / Luz que cierra** — la cura de Castigo sagrado deja además una cura del 4 % en 4 s (F2+F3) · Resistencia mágica +2,5 %/r |
| 9 | Poder de curación +4/r · Reducción de recarga +1,5/r | Poder de curación +4/r · Reducción de recarga +1,5/r |
| 10 | **Second Wind / Segundo aliento** | **Crusade / Cruzada** |

Parejas con camino claro: Alivio o Escudo sagrado + Santuario (dos en Devoción), Nova o Infusión + Castigo
sagrado (dos en Fervor), y las mezclas. El Aura de retribución no tiene modificador (es una pasiva).

### Definitiva

- **Base (nivel 30, como hoy): Battle Enrage / Furia de batalla.** Al trabar combate con un jefe, todo el grupo
  gana +25 % de reducción de recarga y de velocidad de ataque 10 s. ✓
- **Remate Devoción — Segundo aliento.** Una vez por etapa, la primera vez que un aliado baja del 25 % de vida,
  todo el grupo se cura un 30 % y recibe un escudo del 10 %. (F5: disparador de vida baja.)
- **Remate Fervor — Cruzada.** Furia de batalla salta también contra **élites** y dura 15 s. (F5.)

---

## 6. Funciones de simulación necesarias (primera tanda)

En el orden en que hay que hacerlas. Tamaño: P = horas, M = uno o dos días, G = varios días. Todas son datos +
pruebas, deterministas y sin tocar la regla de «una acción por golpe».

| Id | Función | Tamaño | Qué desbloquea |
|---|---|---|---|
| **F1** | **Modelo de árbol**: columnas con ramas, grupo «elige uno», nodo modificador (apagado sin su habilidad; se devuelve con ella), nodo de remate con requisito (≥ 25 en la rama, excluyente con el otro) y **claves de nodo estables** (hoy son posicionales, `knight_r4_s0`). La regla de dos habilidades no se toca | M | Todo. Es lo primero |
| **F2** | **Parches de habilidad**: un modificador sobrescribe campos de la definición (recarga, cargas, duración, potencia, objetivo) o añade efectos, al montar el héroe. Vale también para añadir efectos a una definitiva | P–M | 16 de los 18 modificadores (varios junto con F3 o F6) y el remate Venganza |
| **F3** | **Efecto con coeficiente y objetivo propios** dentro de una habilidad (hoy toda la habilidad comparte una potencia y un objetivo). Incluye un ajuste menor: «vulnerable» aplicado por una habilidad no lleva hoy valor base | P | Castigo sagrado, Frasco de brea, Punto débil y 6 modificadores |
| **F4** | **Talentos de rol**: (a) aura de grupo desde un nodo pasivo — ampliar `partyAuraMods`, que hoy solo lee habilidades-aura — y (b) modificador condicionado: a la vida propia, o al objetivo del golpe o de la cura (vida baja, élite o jefe, aún sin llegar al cuerpo a cuerpo) | (a) P · (b) M | Los 9 talentos de rol: 4 son auras, 5 son condicionados |
| **F5** | **Disparadores genéricos**: al bloquear, al acabar un efecto, al morir un enemigo, al trabar combate con oleada o élite, aliado con vida baja, golpe letal de un aliado → aplicar efecto, dar carga, alargar efecto. Generaliza los dos que hoy están escritos a mano | G | Contragolpe, 2 modificadores (Baluarte que sana, Sed de batalla) y **cinco de los seis remates** |
| **F6** | **Objetivo «dos aliados»** | P | Infusión gemela |

Fuera de la primera tanda: desvío de daño y efectos de suelo (§11). **Descartado**: interrupción de conjuros
(decisión 4) y huecos de habilidad (decisión 2). No propongo invocaciones ni uso `root`.

---

## 7. Guardado

No hay partidas anteriores que trasladar (decisión 6): **sin reembolso de talentos y sin aviso al jugador**.
Lo que sí hace falta, para que un guardado viejo o estropeado no pueda tumbar la interfaz (ya pasó con claves
de datos caducadas):

- **Lectura tolerante**: toda búsqueda de habilidad o de nodo de talento desde la interfaz usa la variante que
  no lanza (`tryAbilityDef` y su equivalente para nodos).
- **Saneado al cargar**: se descartan de `talents`, de las habilidades activas y de los dos preajustes las
  claves que el árbol no conoce, y si quedan más de dos habilidades con puntos se conservan las dos primeras.
  Los puntos por gastar se recalculan como ganados − gastados válidos, así que no se pierde ninguno.
- **Claves estables**: las 15 claves de habilidad actuales y las de las definitivas base no cambian aunque
  cambie el nombre visible (el nombre vive en los textos traducidos). Los nodos nuevos nacen con clave estable
  (F1), para que el próximo cambio de árbol no vuelva a pedir nada de esto.
- Una prueba con un guardado con claves desconocidas y otra con tres habilidades con puntos.

---

## 8. Qué hay que sondear

1. **Arranque**: Knight solo de nivel 1. La columna 1 no cambia, así que debería salir idéntico; se comprueba.
2. **Vulnerabilidades sumadas** (Punto débil + Marca del cazador + Campo de muerte): daño del grupo contra
   jefes de mundo, por dificultad.
3. **Mitigación de grupo sumada** (Vanguardia + Mantener la línea + Piel compartida + Égida, bajo el tope del
   80 %): que un grupo de Bastión + Devoción no vuelva triviales los muros.
4. **Ralentizaciones sumadas** (Tajo lisiante + Frasco de brea + Campo de muerte + Venganza): se suman hasta
   un suelo del 10 % de velocidad; hay que ver que no dejen a una oleada casi parada.
5. **Talentos de rol**: son 15 puntos que llegan pronto (columnas 2–4). Efecto sobre los muros de Normal 2–5,
   sobre todo Custodio (+10 % de vida al grupo) y Vigilia (regeneración entre oleadas).
6. **Menos porcentaje pasivo al final**: las filas 5–10 de hoy son 90 puntos de estadísticas; las ramas son
   60. El poder se traslada a habilidades, modificadores y talentos de rol. Hay que volver a medir el tramo
   Eterno–Tormento, que es hipersensible cerca del techo de equipo.
7. **Curación total** con Santuario, Nova radiante, Castigo sagrado y Triaje: que la sanadora siga en su banda
   por dificultad con la devaluación actual; si se pasa, se bajan coeficientes.
8. **Reducción de recarga**: más fuentes (pasivas de Fervor, Infusión gemela, Furia de batalla más larga).
9. Al final, reajuste de `WORLD_WALL_MULT` para mantener el objetivo de unos 2–3 meses hasta Tormento 10-10.

---

## 9. Arte y sonido (primera tanda)

Clips que ya existen: Knight `attack · cleave · block · shout`; Ranger `attack · volley · quick`; Priest
`attack · cast`.

| Clase | Reutilizan clip | Clip nuevo |
|---|---|---|
| Knight | Piel de piedra, Baluarte, Mantener la línea → `block` · Tajo → `cleave` · Grito, Sed de sangre → `shout` · Contragolpe → `attack` | Ninguno |
| Ranger | Fuego rápido → `quick` · Disparo certero, Flecha explosiva, Punto débil → `attack` · Lluvia de flechas → `volley` | **`throw`** para Abrojos y Frasco de brea (lanzar con la mano); si se recorta, usan `quick` |
| Priest | Todas → `cast` (Castigo sagrado incluido: es una cura) | Ninguno |

Iconos y signos:

- **21 iconos de habilidad** (7 por clase).
- **9 de definitiva** (3 base + 6 remates).
- **9 signos de talento de rol** (3 por clase).
- **6 signos de rama**.
- Los modificadores reutilizan el icono de su habilidad con la marca «+», como en la maqueta.

Además, por cada habilidad nueva (Mantener la línea, Contragolpe, Punto débil, Frasco de brea, Santuario,
Castigo sagrado): un efecto visual propio y un sonido. Los estados nuevos sobre un enemigo (señalado,
embarrado, frenado) necesitan su pequeño indicador.

---

## 10. Qué recortaría primero (dentro de la primera tanda)

1. **El clip `throw`** del Ranger.
2. **F6** entera: Infusión gemela pasa a ser un parche simple (Infusión de poder dura 9 s en vez de 6).
3. **Los talentos de rol condicionados** (la parte (b) de F4) por auras o por una pasiva de estadística: quita
   una función mediana, pero el Ranger se queda sin talentos de rol con comportamiento.
4. Lo que **no** recortaría: los remates, los nodos «elige uno» y los talentos de rol como tales (sin ellos
   sobran puntos en el tope).

Primera tanda completa: F1–F6 y **21 habilidades** (15 actuales + 6 nuevas).

---

## 11. Segunda tanda (más adelante)

Dos habilidades más por clase, una por rama, para llegar a 9. No cambian la regla de dos habilidades: añaden
parejas posibles, no puntos.

| Clase · rama | Nombre (EN / ES) | Qué hace | Números | Sim |
|---|---|---|---|---|
| Knight · Bastión | Guardian's Oath / Juramento del guardián | Se ata al aliado con menos vida: parte del daño que reciba ese aliado lo recibe el Knight, con sus defensas | 30→50 % desviado, 8 s, recarga 30 | **F7** |
| Knight · Azote | Earthshaker / Golpe sísmico | Golpea el suelo: daño modesto a todo lo que tiene a su alcance, que queda **frenado** 4 s | 80→140 % DA, −30→−50 % velocidad, recarga 22 | ✓ con F3 |
| Ranger · Puntería | Killing Shot / Tiro de gracia | Disparo al enemigo **con menos vida**; si lo mata, Disparo certero queda cargado | 250→450 % DA, recarga 20 | objetivo nuevo (amplía F6) · recarga al matar F5 |
| Ranger · Acecho | Barbed Volley / Andanada de púas | Daño a la oleada y un sangrado que **se acumula** hasta 3 veces | 80→160 % DA + 30 % DA por acumulación en 6 s, recarga 18 | Acumular ✓ · F3 |
| Priest · Devoción | Guardian Spirit / Espíritu guardián | Vela al aliado con menos vida 8 s: si fuera a morir, se cura en su lugar | cura 20→40 % de su vida, recarga 45 | F5 (el gancho de golpe letal de Muralla viva) |
| Priest · Fervor | Consecration / Suelo consagrado | Bendice la línea de combate 6 s: los aliados dentro regeneran vida y pegan algo más; los enemigos dentro arden levemente | regeneración y +5→10 % daño a aliados, 40→80 % DA en 6 s, recarga 26 | **F8** (versión barata con F3: grupo + oleada) |

Las seis respetan la regla de rol: las del Knight protegen o frenan, las del Ranger hacen daño, las de la
Priest curan o sostienen.

Funciones que solo pide esta tanda:

| Id | Función | Tamaño | Qué desbloquea |
|---|---|---|---|
| **F7** | **Desvío de daño** entre aliados | M | Juramento del guardián |
| **F8** | **Efectos de suelo**: una zona con posición y duración que afecta a quien está dentro | M | Suelo consagrado en su versión plena, y la versión plena de Tierra quemada |

**Presupuesto de puntos.** Cada habilidad nueva ocupa el sitio de la pasiva de la columna 8 de su rama: se
pierden 10 puntos garantizados y el total baja de 126–128 a **116–118, por debajo de 120**. La segunda tanda
tiene que traer su compensación. Mi propuesta para entonces: **el remate pasa a 5 rangos** (el primero
transforma la definitiva, los otros cuatro la refuerzan), lo que deja 120–122. Se decide cuando llegue.

Arte de esta tanda: 6 iconos de habilidad más, sus efectos y sonidos; ningún clip nuevo (Golpe sísmico →
`cleave`, Juramento → `shout`, Tiro de gracia → `attack`, Andanada → `volley`, las de la Priest → `cast`).

Modificadores que se quedaron fuera y pueden volver con esta tanda: Piel de espinas (devuelve parte del daño
que recibe), Tajo amplio (llega a la segunda fila), Pulso firme (Disparo certero se carga con 7 golpes),
Flecha de racimo y Alivio duradero.

---

## 12. Preguntas que seguían abiertas — respondidas (2026-11-15)

El usuario eligió, en las tres, la opción recomendada:

1. **Talentos de rol: sí.** Tres nodos por clase en el tronco (columnas 2–4), con efecto propio del rol, en vez
   de más pasivas de estadística.
2. **El par «elige uno» es de dos habilidades distintas.** Quien lleva solo una de las dos toma la suya.
3. **La pestaña «Habilidades» desaparece.** Las dos habilidades y la definitiva se ven bajo el muñeco, en
   Equipo, con su recarga; la tercera pestaña del panel de héroe es la hoja de estadísticas.

Siguen pendientes de su revisión: los nombres (todos provisionales) y la sustituta de Bastión, **Mantener la
línea** (alternativa guardada: un escudo propio que al romperse protege al aliado más débil).
