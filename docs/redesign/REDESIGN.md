# REDESIGN.md — Rediseño completo de Taskbar Legion

> Documento rector del rediseño (iniciado el 2026-11-14). Mientras el rediseño esté en curso, **este
> documento y los demás de `docs/redesign/` mandan sobre `docs/ART.md`, `docs/TALENTS.md` y las partes de
> presentación de `SPEC.md`**. Las reglas de simulación, determinismo, escalado y balance siguen donde
> estaban (`docs/DIFFICULTY.md`, `BALANCE.md`, `AFFIXES.md`, …) salvo que un documento de esta carpeta diga
> otra cosa de forma explícita.
>
> La documentación del rediseño está en español; el código, los identificadores y los comentarios, en inglés;
> los textos del juego, en inglés y en español de España.

---

## 1. Objetivo

Cuando acabe el rediseño, el juego será otro en **interfaz, aspecto, sonido y contenido**, manteniendo lo que
ya funciona por debajo:

| Se conserva | Se rehace desde cero |
| --- | --- |
| La simulación determinista (`sim/`), su bucle de paso fijo y su RNG con semilla | Todo el arte: personajes, enemigos, jefes, fondos, iconos, efectos, interfaz |
| El modelo finito de 5 dificultades × 10 mundos × 10 etapas y su escalado | Todo el sonido: música ambiente, lechos de ambiente, efectos, interfaz |
| Las 3 clases (Knight · Ranger · Priest) y sus roles tanque · daño · sanador | Los kits: habilidades, talentos y definitivas, rediseñados con más variedad |
| Cofres, gemas, tiers T0–T8, afijos, árbol técnico no combativo, mascotas, cubo | Textos: nombres, descripciones y *flavour texts* de todo, en inglés y español |
| Guardado, migraciones, capa Tauri (overlay transparente) | El sistema de diseño de la interfaz y todos sus paneles |
| `npm run probe` como herramienta de balance | La documentación de arte (`ART.md` queda obsoleto) |

La simulación **admite mejoras** (§7), siempre dentro de las reglas de oro: pura, determinista, guiada por
datos y probada.

**Lo que no se hace:** copiar nada de Relica Idle salvo la *forma de generar* las cosas. Ni sus sprites, ni su
paleta, ni sus fuentes, ni sus kits de clase, ni su gameplay. Se porta la maquinaria (rasterizado,
figuras paramétricas, validación, atlas, síntesis de audio) y se le da una identidad nueva.

---

## 2. Identidad visual (propuesta a validar en la prueba de estilo, fase R2)

Relica es pixel art cenital, alegre y saturado, con contorno negro uniforme y chiptune de 8 bits. Taskbar
Legion es un juego **ambiental** que vive en el borde de la pantalla durante horas; su identidad debe ser
lo contrario de estridente.

**Dirección: «crepúsculo» — pixel art lateral, atmosférico y pausado.**

- **Personajes en tres cuartos** (decisión del usuario con referencias, 2026-11-14; el perfil puro se descartó
  por estrecho): casi de frente y girados hacia el enemigo, con los dos ojos, los dos brazos y los dos pies a la
  vista, hombros anchos y cabeza grande y expresiva (≈ 3,3 cabezas). Los héroes miran a la derecha y los
  enemigos a la izquierda; las bestias van de lado con la cabeza girada hacia el espectador. El escenario es
  lateral (parallax). Todo se lee en una tira de 160 px de alto.
- **Tramado contenido:** los degradados son bandas planas unidas por una costura estrecha de tramado
  (`BLEND` en `backdrop.py`), no un tramado continuo.
- **Profundidad por perspectiva atmosférica:** cada capa del fondo se aclara y se enfría con la distancia;
  el primer plano va casi en silueta. La tira tiene que parecer una ventana a un mundo, no un decorado.
- **Paleta propia** (nueva, no la de Relica): menos saturada, con el desplazamiento de tono contrario a
  Relica — **sombras hacia azul petróleo / índigo, luces hacia melocotón / coral**. Rampas pensadas para
  luz de atardecer, noche y fuego. Subconjuntos por mundo, como en el pipeline original.
- **Contorno selectivo** (*sel-out*): el contorno toma un tono oscuro de la rampa de cada parte, no un negro
  único. Los enemigos llevan un borde de luz del color del cielo de su mundo para separarse del fondo.
- **Alta definición (decisión del usuario, 2026-11-14):** el pixel art tiene que ser **más definido que el de
  Relica**, que reduce todo a bloques de 2 px y deja figuras de ≈ 20 px de arte. Aquí el arte se dibuja **1:1
  a la resolución lógica de la tira (600 × 160)**: un píxel de arte es un píxel lógico, y los héroes miden
  ≈ 52 px de arte. Caben caras, placas, remaches, costuras, malla y emblemas. El rasterizador sombrea en
  cinco bandas (Relica, en tres). Nunca hay escalados no enteros: los sprites descargados de ahora se escalan
  ×2,9 y mezclan tamaños de píxel.
- **Animación pausada:** pocos fotogramas bien elegidos; el movimiento ambiente (nubes, hierba, partículas)
  lo hace Pixi en tiempo real.

| Categoría | Fotograma de arte | Silueta aprox. |
| --- | --- | --- |
| Héroes | 64 × 64 | ≈ 52 px de alto |
| Enemigos normales | 64 × 64 (bestias 64 × 48) | 30–52 px |
| Brutos / élites | 80 × 80 | redibujados, no reescalados |
| Jefe de etapa | 96 × 96 | ≥ 60 % del fotograma |
| Jefe de mundo | 128 × 128 o más | ocupa casi toda la altura de juego |
| Iconos de objeto, gema, habilidad | 32 × 32 (se muestran ×2 en paneles) | — |
| Efectos | 64 o 96 px; áreas de hasta 192 × 64 | sin contorno |

La escala de juego (`gameScale`) tendrá que ser entera respecto al arte, o renderizarse a resolución nativa y
escalarse por enteros; se resuelve al integrar el cargador en la tira (R2).

La prueba de estilo (R2) genera un mundo, las tres clases, dos enemigos y unos iconos y se valida con una
captura **antes** de producir en masa. Si la dirección no convence, se corrige ahí, cuando cambiar cuesta poco.

### 2.1 Personajes: diseño fijo y motor de animación — decisión del usuario, 2026-11-14

- **Diseños fijos.** El equipo modular visible queda aparcado: cada clase tiene un único aspecto.
- **Un esqueleto por clase**, con sus proporciones, su forma de andar y sus acciones (Knight pesado, Ranger
  ligero, Priest sereno bajo una túnica).
- **El movimiento sale del motor** (`tools/assets/pipeline/rig.py`), no de posar fotogramas a mano:
  - los pasos son cinemática directa sobre las curvas de cadera, rodilla y tobillo de la marcha humana, y la
    pelvis descansa en el pie que apoya;
  - las acciones se definen en ángulos de articulación con ritmo propio por clave (anticipación, golpe,
    asentamiento) y las piernas usan cinemática inversa para que los pies plantados no resbalen;
  - capas, penachos, bufandas, túnicas y el farol son cadenas simuladas.
- **Cabezas, torsos y equipo se dibujan a mano**; brazos, piernas y telas los traza el motor.
- Unos 34 px de alto y proporciones compactas, no anatómicas: piernas ≈ 40 % de la altura y cabeza grande
  (las proporciones realistas se ven larguiruchas a este tamaño). Contorno oscuro selectivo, luz desde arriba
  a la derecha.
- Vista previa: `sh tools/assets/run.sh chars` (GIF y fotogramas) y `sh tools/assets/run.sh scene` (lo que
  usa la tira en vivo del laboratorio).

---

## 3. El pipeline de assets

Se porta de `~/dev/coop-game/tools/assets/` a `tools/assets/` de este repositorio.

**Se trae (y se adapta):**

- Núcleo: `build.py` (familias en paralelo, atlas, manifiestos), `raster.py`, `registry.py`,
  `validate.py`, `art_rules.py`, `sheets.py`, `compare.py`, `client_manifest.py`.
- Figuras paramétricas: `figures/` (humanoides, cuerpos, bestias, poses, borde de luz). Hay que añadir el
  **perfil lateral** a las figuras: son la base de héroes y enemigos.
- Síntesis de audio: `audio/` (sintetizador, kit, codificación Ogg, validación de sonoridad y bucles sin
  salto). Se cambia el lenguaje sonoro (§6), no la maquinaria.
- Reproducibilidad: Pillow, numpy y soundfile fijados en `requirements.txt`; semilla por id; prueba de
  que dos construcciones dan los mismos bytes.
- Láminas de revisión en `tools/assets/out/sheets/` (fuera de git).

**No se trae:** paleta, fuentes, ni ninguna familia de contenido de Relica (hub, gremio, profesiones,
delves, incursiones, tilesets cenitales, sus clases y sus enemigos). Las familias se escriben nuevas.

**Familias nuevas previstas:**

| Familia | Qué genera |
| --- | --- |
| `palette` | La paleta propia y sus subconjuntos por mundo y por dificultad |
| `strip_backdrops` | Fondos en parallax por capas (cielo, lejos, medio, suelo, primer plano) por mundo |
| `difficulty_grades` | La variante de cada fondo en cada dificultad (§4.2) |
| `heroes` | Knight, Ranger y Priest de perfil: idle, walk, attack ×2, cast, block, hurt, death |
| `enemies_w01…w10` | El bestiario de cada mundo, élites redibujados incluidos |
| `bosses` | Jefes de etapa y de mundo |
| `item_icons` | Iconos de objeto por tipo de pieza × clase × tier (sustituyen a los emoji) |
| `gem_icons`, `chest_icons`, `pet_sprites` | Gemas por tier, los 3 cofres (cerrado, abriéndose, abierto), mascotas que siguen al grupo |
| `ability_icons`, `talent_icons` | Iconos de habilidades, definitivas y nodos de talento |
| `fx_knight`, `fx_ranger`, `fx_priest`, `fx_enemy` | Un efecto propio por habilidad; nunca uno genérico reutilizado |
| `ui_kit` | Marcos, botones, barras, casillas y glifos de la interfaz en 9-slice |
| `portraits` | Retratos de los héroes para los paneles (la misma figura redibujada en grande) |
| `title`, `brand` | Pantalla de título en parallax, logotipo e icono de la app |

**Salida:** `public/assets/` (atlas PNG + JSON en formato *hash*, que Pixi lee como `Spritesheet`) y un
manifiesto tipado en `src/data/generated/`. El cargador debe seguir usando la configuración de
`configurePixiLoader` (las texturas `tauri://` no se decodifican con `createImageBitmap`) y se prueba
siempre en la build empaquetada.

**Comandos:** `npm run assets:build`, `npm run assets:validate` y `npm run assets:test` (pytest). Los
procesos pesados del pipeline se lanzan con prioridad baja (`taskpolicy -b nice -n 19` en macOS).

---

## 4. Mundo y contenido

### 4.1 Los 10 mundos (borrador; nombres y textos definitivos en `docs/redesign/WORLDS.md`, fase R4)

Cada mundo tiene un bioma, una hora del día, una paleta, un lecho de ambiente, un tema musical, unos cuatro
enemigos propios, un élite, un jefe de etapa y un jefe de mundo, cada uno con *flavour text*.

| # | Bioma (borrador) | Hora / atmósfera |
| --- | --- | --- |
| 1 | Praderas y colinas con molinos | Atardecer dorado |
| 2 | Bosque viejo de musgo | Luz filtrada, niebla baja |
| 3 | Marismas y pueblos sobre pilotes | Lluvia, luciérnagas |
| 4 | Cañones de roca rojiza | Calima, sol bajo |
| 5 | Cumbres nevadas y monasterios | Noche despejada, aurora |
| 6 | Costa de ruinas hundidas | Marea, bruma marina |
| 7 | Cavernas de cristal y hongos | Bioluminiscencia |
| 8 | Tierras de ceniza y forjas | Brasas, cielo rojo |
| 9 | Ciudadela entre las nubes | Amanecer sobre el mar de nubes |
| 10 | La Grieta (el vacío que corrompe todo lo anterior) | Sin sol: estrellas y fracturas |

### 4.2 Las dificultades como capa visual

Las 5 dificultades recorren los mismos 10 mundos; cada vuelta se ve distinta. Se genera **un fondo base por
mundo** y el pipeline aplica una **gradación por dificultad** (cambio de paleta, cielo, capas y partículas),
así salen 50 variantes coherentes sin dibujar 50 fondos:

| Dificultad | Gradación (propuesta) |
| --- | --- |
| Normal | El mundo tal cual, en su hora del día |
| Hell | Cielo encendido, brasas en el aire, la vegetación empieza a secarse |
| Inferno | Fuego en el horizonte, humo, siluetas calcinadas |
| Eternal | El tiempo detenido: tonos de ceniza, objetos suspendidos, nieve que no cae |
| Torment | La Grieta lo invade todo: fracturas violetas, estrellas de día, enemigos corrompidos |

Los enemigos usan la misma idea: en cada dificultad cambian de paleta y ganan detalles de corrupción, sin
redibujarse enteros.

### 4.3 Textos

- **Flavour text** para cada mundo, enemigo, jefe, objeto base, objeto legendario, gema, mascota, cofre,
  habilidad y talento.
- Frases del grupo en la tira (al caer el grupo, al vencer a un jefe de mundo, al cambiar de dificultad).
- Todo en inglés y en español (§8). Un glosario fija la traducción de cada término.

---

## 5. Clases, habilidades y talentos

Se mantienen las 3 clases y sus roles. Los kits se rediseñan **desde las reglas actuales de este juego**
(ataques ligados al golpe, huecos de equipamiento de habilidades, definitiva automática) y no desde ningún
otro juego. Detalle en `docs/redesign/CLASSES.md` (fase R4). Líneas de partida:

- **Habilidades:** de 5 a unas **8–10 por clase**, con mecánicas variadas: golpes de área, marcas,
  invocaciones, cargas, estados que se combinan, reacciones (al bloquear, al recibir un crítico, al morir un
  aliado). Cada una con su efecto visual, su icono y su sonido propios.
- **Talentos:** se sustituye el relleno de estadísticas de las filas 5–10 por **especializaciones** (2 por
  clase más un árbol común), con nodos de **«elige 1»** y **modificadores de habilidad** que cambian cómo se
  comporta una habilidad (no solo cuánto hace). Ejemplo de tipo: «Flecha explosiva deja el suelo ardiendo».
- **Definitivas:** una por especialización en vez de una por clase, para que la elección de árbol se note.
- **Identidad de rol:** el Knight protege y castiga, el Ranger controla el ritmo del daño, el Priest sostiene
  y amplifica. Cada especialización empuja una forma de jugar dentro de su rol.

---

## 6. Sonido

Mismo motor de síntesis que Relica, **lenguaje sonoro distinto**: nada de chiptune alegre.

- **Música ambiente:** pads cálidos, arpegios lentos de cuerda pulsada, campanas suaves, ritmo escaso o
  ninguno; un tema por mundo y otro para el título, en bucle sin salto, a baja sonoridad. Tiene que poder
  sonar ocho horas sin cansar (en la línea del *lo-fi* y la música ambiental).
- **Lechos de ambiente** por mundo (viento, lluvia, mar, cueva, brasas, vacío) y por dificultad (la Grieta
  añade su zumbido).
- **Efectos** de combate y habilidades suaves, cortos y sin agudos agresivos: el juego se oye de fondo.
- **Interfaz:** clics y confirmaciones discretos; apertura de cofres y botín por tier, con la recompensa
  creciendo con el tier.
- **Bus de audio** en el cliente: volúmenes separados (música, ambiente, efectos, interfaz), silencio total,
  carga perezosa y fundidos al cambiar de mundo.

---

## 7. Mejoras de la simulación (propuestas; cada una se decide antes de implementarla)

Todas son guiadas por datos y llevan pruebas. Las marcadas con ★ las necesita el contenido nuevo.

1. ★ **Bestiario por mundo:** los enemigos dejan de ser 3 tipos genéricos y pasan a ser un catálogo por mundo,
   cada uno con su arquetipo de combate (cuerpo a cuerpo, distancia, lanzador, bruto). El arquetipo conserva
   los multiplicadores actuales, así que el balance no se mueve mientras no se toque a propósito.
2. ★ **Enemigos lanzadores** (el estilo `caster` ya existe sin uso) y habilidades de enemigo por mundo.
3. ★ **Modificadores de habilidad** desde los talentos (cambian objetivo, área, estados aplicados, cargas…).
4. ★ **Disparadores** (*al bloquear, al criticar, al matar, al caer un aliado, al recibir daño mágico*) para
   reacciones, talentos y legendarios.
5. **Afijos de élite** (rápido, vampírico, blindado…) que se ven en la placa del enemigo.
6. **Legendarios y sets** con poderes propios y *flavour text*.
7. **Bestiario y logros** como capa de colección (textos desbloqueables por bajas).
8. **Eventos ambientales en la tira** (un mercader errante, un cofre que huye) puramente deterministas.

Cambiar claves de datos rompe partidas guardadas (los guardados llevan claves de habilidades viejas). Cada
renombrado o reestructuración lleva su migración en `saveManager.migrate` y, para los talentos, un reembolso de
puntos. Tras cada cambio de kits o de escalado se revalida con `npm run probe`, incluido el arranque de una
partida nueva.

---

## 8. Idiomas: inglés y español

- **Interfaz:** catálogos `src/i18n/en/*.ts` y `src/i18n/es/*.ts`. Cada archivo español se tipa contra el
  inglés (`Record<keyof typeof en, string>`), así que una clave que falte no compila. Una prueba falla si una
  traducción pierde o cambia un `{token}` o si una clave no se usa.
- **Datos del juego:** `data/` sigue escribiendo en inglés (la simulación no sabe de idiomas). Los textos
  visibles de los datos tienen su traducción en diccionarios `src/data/i18n/es/<grupo>.json`
  (clave → `{ en, es }`); la capa de interfaz los sustituye. Una prueba falla si un texto visible no tiene
  traducción o si su inglés cambió.
- **Idioma:** se elige en Opciones; por defecto, el del sistema (español si empieza por `es`).
- **Normas de traducción:** español de España, tuteando; los números y `{tokens}` exactamente como en
  inglés; mayúsculas a la española; un glosario fija cada término (oleada, élite, jefe de mundo, cofre,
  gema, talento…).
- **Fuentes:** las fuentes pixel elegidas deben tener ñ, tildes, ¿ y ¡.

---

## 9. Interfaz

Sistema de diseño propio (no el de Relica): tokens de color derivados de la paleta nueva, tipografía pixel
propia, recetas de panel, ventana, botón, barra, pestaña, casilla de objeto y tooltip, y una escala de
espaciado. Se diseña antes de implementar:

1. **Maquetas HTML** de cada pantalla y panel en `docs/redesign/mockups/` con los assets reales del
   pipeline. El usuario las valida.
2. **Kit de componentes** en `src/ui/kit/` con los tokens en CSS y en TypeScript; `PixelWindow` se rehace
   sobre él.
3. **Paneles uno a uno:** HUD de la tira, Héroe (estadísticas, equipo, talentos, habilidades), Alijo e
   inventario, Árbol técnico, Mapa y dificultades, Mascotas, Cubo, Opciones y título.

Restricciones que no cambian: los paneles flotan sobre el escritorio (overlay transparente de Tauri), son
arrastrables, la tira se arrastra para mover la ventana y la zona clicable se calcula con
`elementFromPoint`. Nada de emojis en la interfaz ni en los datos.

---

## 10. Fases

El orden y los criterios de cada fase están en [PLAN.md](PLAN.md); el avance, en [PROGRESS.md](PROGRESS.md).
