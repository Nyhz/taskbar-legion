# PROGRESS.md — Avance del rediseño

Lista viva de [PLAN.md](PLAN.md). Se marca cada punto al cerrarlo y se añade una línea si la decisión no es
obvia.

## R0 — Fundamentos
- [x] REDESIGN.md, PLAN.md y PROGRESS.md escritos (2026-11-14).
- [x] CLAUDE.md apunta al rediseño.
- [ ] REDESIGN.md aprobado por el usuario.

Decisiones del usuario (2026-11-14): se conserva la simulación (se aceptan mejoras); identidad visual
totalmente propia, nada parecido a Relica Idle; se mantienen Knight, Ranger y Priest, sin copiar kits ni
gameplay de Relica; todo el arte y el sonido, nuevos (se desechan los sprites descargados); inglés y español.

## Prueba de estilo — imagen fija (adelantada por el usuario, 2026-11-14)
- [x] Paleta propia «dusk» (12 rampas, 96 colores) en `tools/assets/pipeline/palette.py`.
- [x] Rasterizador portado de Relica a resolución completa (sin bloques de 2 px), sombreado en 5 bandas,
  contorno selectivo y borde de luz.
- [x] Figura de perfil con IK (`figures/profile.py`) y cuadrúpedo (`figures/quadruped.py`), escritos de cero.
- [x] Knight, Ranger y Priest; Espantapájaros y Jabalí del mundo 1 (Normal y Torment).
- [x] Fondo del mundo 1 en 7 capas repetibles, Normal y Torment; composición en
  `tools/assets/out/style/` (`sh tools/assets/run.sh style-still`).
- [x] Página de laboratorio publicada: https://claude.ai/artifact/5ZzhRWVHSqmQvN4RRHCtoS (fuente `docs/redesign/lab/index.html`).
- [ ] Opinión del usuario sobre la imagen fija.

## Personajes (2026-11-14)
- [x] Descartadas varias rondas (formas generadas, dibujo a mano de 54 y 36 px, versión estilo Sanctum Pixel,
  equipo modular). Todo ese código se borró.
- [x] Empezado de cero con un motor de animación (`tools/assets/pipeline/rig.py`) y tres personajes en
  `tools/assets/pipeline/chars/` (Knight, Ranger, Priest), cada uno con su esqueleto y con reposo, andar y
  ataque. Diseño fijo, sin equipo modular (REDESIGN §2.1).
- [x] Primera aceptación del usuario («bastante aceptable»). Aplicado después: trote con fase de vuelo en vez de
  andar, postura más erguida, espada del Knight al frente y ataque del Knight rehecho.
- [x] Tira en vivo con parallax en el laboratorio.
- [ ] Opinión del usuario sobre el movimiento y los diseños.
- [x] Juego de animaciones por clase (2026-11-14). Knight: idle, run, attack, cleave, block, shout, hurt, death.
  Ranger: idle, run, attack, volley, quick, hurt, death. Priest: idle, run, attack (castigo), cast (curación),
  hurt, death. El motor gira torso y cabeza de verdad cuando la inclinación pasa de 24° (`Cel.stamp_lean`).
- [x] Derrotas rehechas tras la revisión del usuario (2026-11-14): Knight de rodillas sobre la espada clavada, Ranger
  despedido de espaldas, Priest resbalando por el bastón y desplomándose. Motor: manos fijadas a un punto
  (`reachN`/`reachF`), objetos sueltos, giro por 9 muestras, fotograma de 96 px con la raíz en x = 40.
- [x] Proporciones más compactas (2026-11-14, «larguiluchos»): piernas un 20 % más cortas (≈ 40 % de la altura),
  cabezas redibujadas más grandes, brazos algo más cortos. `Build.leg_scale` reescala las poses ya hechas.
- [x] Proporciones aprobadas («infinitamente mejor»). La Priest pasa a ser una sacerdotisa: cofia blanca con banda
  turquesa y melena rubia simulada (2026-11-14).
- [x] Caras: el usuario se queda con la A (la original). Commit de control `4d9b3e8` (2026-11-14).
- [x] Enemigos del mundo 1, primera tanda: Espantapájaros hueco (`foes/scarecrow.py`) y Jabalí cerdoso
  (`foes/boar.py`, esqueleto de cuadrúpedo), con idle, run, attack, hurt y death. `pipeline/roster.py` lista
  todas las figuras.
- [x] Jabalí rehecho (pedido: "necesita más amenaza, parece un animal normal, y su carrera es muy estática"):
      cuerpo y cabeza mayores, púas carmesí, dos colmillos, ojo de brasa, vapor y polvo; galope con fase de vuelo
      y cabeceo del cuerpo.
- [x] Enemigo a distancia: Furtivo plumacuervo (`foes/poacher.py`), ballesta a dos manos (mano lejana por IK).
- [x] Jefe de etapa: Rey de la Cosecha (`foes/harvest_king.py`), fotograma propio de 128 × 96. El motor admite
      filas extra por encima del fotograma (`Character.TOP`, `Cel(top=…)`); `meta.json` lleva `ground` por figura.
- [ ] Opinión del usuario sobre jabalí, furtivo y jefe.
- [x] Decidido por el usuario: seguir con el arte (fondo y bestiario), mundo a mundo; la integración en Pixi después.
- [x] Mundo 2, fondo: `families/backdrop_w02.py` (Bosque viejo de musgo, 7 capas, Normal y Torment).
      `scene_export` exporta ya por mundo (`w01_…`, `w02_…`) y `meta.json` lleva `worlds`.
- [x] Mundo 2, bestiario: Tejedora de espinas (`foes/spider.py`, esqueleto de ocho patas), Aparecido musgoso
      (`foes/revenant.py`), Invocaesporas (`foes/sporecaller.py`) y el jefe Guardián Astado (`foes/warden.py`).
      `roster.py` lleva el mundo de cada figura; los GIF de cada mundo usan un fondo de su propio tono.
- [x] «Recibir daño» rehecho en los once modelos (pedido: "no parece muy realista ninguno… añadirles un efecto
      como de parpadeo en blanco, pero sutil"): `rig.stagger_keys` (pies plantados, latigazo, paso atrás,
      recuperación) con parámetros y brazos propios por figura; jabalí y araña con claves propias.
      Destello: `Cel.flash` sube los tonos dos pasos un fotograma y uno el siguiente (clave de pose `flash`).
- [ ] Opinión del usuario sobre el mundo 2 y la nueva reacción al daño.
- [x] Mundos 3 a 10, primera pasada (pedido: "genera mundos 3 a 10 uno tras otro sin parar, y los reviso todos al
      final"). Hechos en paralelo, uno por agente, cada mundo como ficheros independientes:
      `families/backdrop_wNN.py` + cuatro criaturas en `foes/` + `docs/redesign/lab/data/wNN.json`.
      - w03 Marismas de los Pilotes: toad, drowned, bogwitch, ferryman (jefe).
      - w04 Cañones de Roca Roja: scorpion, raider, vulture, colossus (jefe).
      - w05 Cumbres del Monasterio: frostwolf, monk, rimewraith, bellbearer (jefe).
      - w06 Costa de las Ruinas Hundidas: crab, legionary, siren, admiral (jefe).
      - w07 Cavernas de cristal y hongos: beetle, shardling, bat, geode (jefe).
      - w08 Tierras de ceniza y forjas: salamander, smith, slagimp, furnace (jefe).
      - w09 Ciudadela entre las nubes: gryphon, templar, cantor, archon (jefe).
      - w10 La Grieta: voidmaw, echo, weaver, herald (jefe).
- [x] Tubería: las criaturas se registran solas (`FIGURE = (...)` en su módulo, leído como texto por `roster.py`);
      los fondos se descubren por nombre; `PREVIEW_BG` por mundo. Comando nuevo `sh tools/assets/run.sh lab`
      (`pipeline/lab_page.py`): exporta un atlas por figura y una imagen por mundo y dificultad, y regenera las
      regiones marcadas de la página del lab a partir de `docs/redesign/lab/data/`.
- [ ] Revisión del usuario de los diez mundos. Flojo conocido: jefes poco imponentes (admiral, geode, herald,
      archon), criaturas con aire de mascota (siren, beetle), figuras que se pierden sobre su fondo (spider,
      salamander, echo), ataques de jefe que invaden el sitio del enemigo a distancia, y varias animaciones de
      «golpe recibido» de los mundos 3–10 que nadie ha mirado fotograma a fotograma.
- [x] Segunda pasada tras la revisión del usuario (lab v24). Pedido: fondos 5–9 "dejan un poco que desear";
      colossus, crab y furnace "raros"; gryphon "bastante amorfo"; herald "debe ser bastante más impresionante y
      dar más miedo". Rehechos `backdrop_w05…w09.py` (ambas gradaciones) y `colossus.py`, `crab.py` (de frente,
      anda de lado), `furnace.py`, `gryphon.py` (`TOP = 14`), `herald.py` (fotograma propio 160 × 126). Nada
      más se tocó. `lab_page.py` dimensiona cada clip a 3× del fotograma que tenga la figura.
- [ ] Opinión del usuario sobre la segunda pasada. Flojo conocido: el cangrejo mide ~70 px con las patas y pisa
      el sitio del legionario en la tira; restos finales pequeños (herald, crab); plano de forjas del w08 denso
      tras las figuras; varias hojas de animación no se reabrieron tras los últimos retoques.
- [x] Tercera pasada (lab v25). Pedido: "añade el nivel de detalle de los nuevos fondos al resto de mundos",
      "el señor del horno sigue siendo rarete", "generame 3 o 4 bosses finales diferentes y elijo uno" y "haz el
      repaso de las cosas que siguen flojas".
      - Fondos w01, w02, w03, w04 y w10 reescritos con el nivel de detalle de w05–w09, conservando identidad.
        Copia de todo lo anterior en `tools/assets/out/_snapshot_v24/` (ignorado por git).
      - `furnace.py`: concepto nuevo, rey herrero con armadura (tercer intento).
      - Cuatro candidatos a jefe final, fotograma 200 × 129: `devourer.py`, `hollowking.py`, `riftmother.py`,
        `unmaker.py`, con `docs/redesign/lab/data/w10_candidate_<key>.json`. `herald.py` sigue siendo el jefe
        del mundo 10 hasta que el usuario elija. `lab_page.py` genera la sección «Candidatos a jefe final» y la
        tira los enseña solos (`data-boss`).
      - Repaso: admiral, geode y archon más grandes; siren, beetle y la capucha del ferryman redibujados;
        spider, salamander y echo con más contraste; crab más estrecho; cascada de w07 y zona de forjas de w08.
        Abiertas todas las hojas de «golpe recibido»: sin fallos.
      - Motor: `Cel.image` descarta píxeles fuera del fotograma (antes una estela podía reaparecer por abajo).
- [x] El usuario elige jefe final: **D, el Deshacedor** ("está chulísimo"). `unmaker` es ya el jefe de
      `w10.json`; `herald.py`, `hollowking.py`, `riftmother.py` y los JSON de candidatos están apartados en
      `tools/assets/out/_discarded/` (ignorado por git), no borrados.
- [x] Mundo 8: Señor del Horno sustituido por la **Sierpe de la Fragua** (`foes/magmawyrm.py`, 176 × 114), el
      candidato A en versión de fuego. `furnace.py` y `devourer.py` apartados en `out/_discarded/`.
      `w08.json` y `w10.json` llevan `slots` propios por el tamaño de sus jefes.
- [x] Cuarta tanda (lab v26), un agente por mundo:
      - Torment con tonalidad propia: w01 sangre, w02 podredumbre, w03 ahogados, w04 azufre, w05 ventisca
        blanca, w06 abismo, w07 plaga, w08 forjas frías, w09 deslustre, w10 violeta extremo. La Grieta y los
        cristales siguen violetas.
      - `ATMOSPHERE` en los diez fondos (Normal: clima; Torment: 3–6 efectos). Motor en el script de la página
        del lab (`atmos`: lightning, particles, eyes, pulse, flicker); esquema validado en
        `lab_page.atmosphere`. Pendiente de portar a Pixi y de sonido (trueno) en la fase de audio.
      - Contraste: franja calmada tras los combatientes en ambas gradaciones de los diez mundos; tonos
        retocados en poacher, boar, bogwitch y frostwolf.
      - Copia del estado anterior: `tools/assets/out/_snapshot_v25/`.
- [x] **Pasada final de contraste (pedida por el usuario, 2026-11-14; hecha en la cuarta tanda):** cuando acabe la tercera tanda y el
      usuario haya elegido jefe final, revisar TODO mundo a mundo, en Normal y Torment: "hay mapas en los que los
      enemigos e incluso los personajes se pierden un poco con el fondo". Comprobar los tres héroes y las cuatro
      criaturas de cada mundo sobre su fondo en la tira. Los héroes cruzan los diez mundos y no se recolorean:
      donde se pierdan, se corrige el fondo (franja tras las figuras más calmada y separada en valor).
- [x] **Torment con carácter propio por mundo (pedido por el usuario, 2026-11-14; hecho en la cuarta tanda):** "que los mundos 'torment'
      tuvieran diferentes tonalidades, no todas moradas, y que tuvieran algún efecto atmosférico, tipo flashes,
      truenos, cosas que den miedo". Hoy las diez gradaciones Torment son la misma receta violeta (Grieta,
      estrellas, cristales). Hacer: una tonalidad distinta por mundo (la Grieta tiñe cada mundo a su manera) y
      efectos atmosféricos animados en la tira (relámpagos con destello, truenos, y otros que den miedo). Los
      efectos necesitan soporte en tiempo de ejecución: en la página del lab y, después, en Pixi.
- [x] Knight, carrera (pedido: "va como demasiado apresurado, algo más natural"): iba a ~213 pasos/min; ahora
      `JOG = Gait(stride=1.22, lift=0.8, air=1.7)` a 14 fotogramas × 48 ms (~180 pasos/min). La zancada cubre
      ~31 px por ciclo frente a los 32 que avanza el grupo, así que el pie apoyado no resbala. Lab v27.
- [x] Segundo commit de control: `501a7fe` "feat(redesign): battle-strip art for the ten worlds".
- [ ] Opinión del usuario sobre la cuarta tanda. Flojo conocido: el Ranger (verde y marrón) es el héroe que
      peor se separa en los mundos 1, 2, 3 y 6; los ojos de 1 px apenas se ven; al coincidir relámpago y pulso
      la tira se aplana un instante; las franjas de bruma dejan escalones horizontales visibles en w02, w07 y
      w08; la franja calmada ha quitado detalle a media altura (w07, w10).
- [ ] Jefes de mundo, élites y gradaciones Hell / Inferno / Eternal.

## R1 — Portar el pipeline
- [~] Venv con Pillow 12.2.0 fijado (`tools/assets/setup.sh`, `run.sh` con prioridad baja). Falta el `build`
  con atlas y manifiesto, y el audio.
- [ ] Núcleo, `figures/` y `audio/` copiados y adaptados (sin paleta, fuentes ni familias de Relica).
- [ ] Rutas de salida y manifiesto tipado.
- [ ] Paleta propia (borrador).
- [ ] Scripts npm y `.gitignore`.
- [ ] pytest del núcleo y reproducibilidad en verde.

## R2 — Prueba de estilo
- [ ] Figuras de perfil lateral.
- [ ] Fondo del mundo 1 (Normal y Torment).
- [ ] Knight, Ranger y Priest animados.
- [ ] Dos enemigos, seis iconos y un efecto.
- [ ] Cargador de manifiesto e integración en la tira.
- [ ] Aprobación del usuario.

## R3 — Infraestructura de idiomas
- [ ] Catálogos de interfaz y `t()`.
- [ ] Diccionarios de datos.
- [ ] Pruebas de cobertura.
- [ ] Glosario.

## R4 — Biblia de contenido
- [ ] WORLDS.md
- [ ] CLASSES.md
- [ ] SYSTEMS.md
- [ ] Aprobación del usuario.

## R5 — Simulación y datos
- [ ] Mecánicas nuevas aprobadas.
- [ ] Kits nuevos en datos.
- [ ] Migración de guardado.
- [ ] Probe y arranque de partida nueva.

## R6 — Producción de arte
- [ ] Fondos y gradaciones.
- [ ] Bestiario y jefes.
- [ ] Iconos, mascotas, efectos, retratos, título.
- [ ] Validación de cobertura.

## R7 — Sonido
- [ ] Música, ambiente, efectos, interfaz.
- [ ] Bus de audio.

## R8 — Interfaz
- [ ] Maquetas aprobadas.
- [ ] Kit de componentes.
- [ ] Paneles reconstruidos.

## R9 — Integración y limpieza
- [ ] Borrado de assets y código viejos.
- [ ] Builds empaquetadas y release.

## Objetos (2026-11-14)
Decidido con el usuario: después de la tira van los iconos de objetos y luego la interfaz (paperdoll, paneles).
Los iconos de habilidades y talentos esperan al rediseño de kits y árboles, que sigue sin hacer ni aprobar.
- [x] `tools/assets/pipeline/icons.py` (`sh tools/assets/run.sh icons` → `out/icons/` + `manifest.json`): iconos
      de 32 × 32 hechos con polígonos facetados sobre `Cel` (tono por orientación a la luz) y contorno; marcos de
      rareza de 36 × 36 (`frame(tier)`), T8 iridiscente. La rareza no se redibuja.
- [x] Prueba de estilo (lab v28, sección «Iconos de objetos», generada por `lab_page.items_section`;
      `sh run.sh lab items` refresca solo esa región): 5 espadas y 5 yelmos por categoría, 9 marcos, 6 gemas con
      talla propia, 3 cofres.
- [x] Visto bueno del usuario al estilo ("el estilo tiene mi ok en general").
- [x] Problema señalado: "los yelmos y otras armaduras, va a ser imposible hacer un diseño que encaje para las 3
      clases… parecen de Knight todos. Pero eso supondría añadir a los objetos una clase requerida, ¿no?".
      Propuesta (lab v29, pendiente de confirmar): TRES FAMILIAS de armadura derivadas del atributo base que el
      juego ya reparte (docs/AFFIXES.md): placa = armadura pura, cuero = mitad y mitad, tela = resistencia
      mágica pura. Sin requisito de clase ni cambio en la simulación; la UI elige el icono por
      (ranura, familia, categoría). `icons.helmet(family, rank)`: 15 yelmos.
- [x] Repaso de lo flojo: menos destellos sueltos en las espadas rúnica y de la Grieta, ala mayor en el yelmo
      dorado, marco Legendario en coral y Divino en oro claro con esquinas reforzadas.
- [x] El usuario RECHAZA derivar la familia del atributo base ("a lo mejor quiero que mi tank sea full
      resistencia mágica y no quiero que parezca que lleva todo tela") y decide: **la armadura será de clase** —
      Knight placas, Ranger cuero, Priest tela — y cada familia puede salir de armadura pura, mixta o
      resistencia mágica pura. Las familias de iconos quedan, pero ligadas a la clase, no al atributo.
- [x] Yelmos de cuero y tela rehechos (lab v30): "muchos yelmos de cuero y tela se parecen, y otros son un poco
      raros". Regla de siluetas: placa = yelmos; cuero = gorros, sombreros, capuchas y pellejos; tela = tocados,
      nunca capucha.
- [ ] **CAMBIO DE REGLAS PENDIENTE (después de assets e interfaz, decidido por el usuario):** requisito de clase
      en las cinco piezas de armadura. Toca `src/data/itemSlots.ts`, `src/sim/loot.ts` (familia/clase al generar),
      el equipado, la migración de partidas guardadas (asignar familia a las piezas existentes) y
      `docs/AFFIXES.md` / CLAUDE.md ("no equip-gate… bar the class lock"). Cada pieza que cae servirá a un héroe
      de tres: revisar ritmo con `npm run probe`.
- [x] Yelmos cerrados (lab v31): la capucha con antifaz pasa a "casco de explorador" ("cambia la capucha antifaz
      un poco de modelo y listo") y el yelmo alado se rehace ("parece como una pluma detrás de un casco de
      minero") como yelmo dorado cerrado con mirilla en T y alas en las sienes.
- [x] Catálogo completo (lab v31): 159 iconos en 30 grupos. Cada lote es un módulo de
      `tools/assets/pipeline/icon_sets/` con `build()` (`sh run.sh icons <lote>` construye solo ese lote):
      `s10_chest`, `s20_gloves`, `s30_legs`, `s40_boots` (3 familias × 5 categorías), `s50_jewelry` (anillo,
      amuleto, abalorio), `s60_arms_a` (escudo, arco, carcaj), `s70_arms_b` (vara, tomo, llave, monedas, cofres
      abiertos), `s80_stats` (15 estadísticas de 16 px, sin marco).
- [x] Guantes rehechos (lab v32): "los guanteletes son los 3 materiales bastante malos, los de placas parece que
      tienen los dedos torcidos". `s20_gloves.py` reescrito con una sola función `hand()` (dorso, cuatro dedos
      rectos, pulgar) y tres puños distintos: bocamanga acampanada, brazal, manga.
- [x] Repaso de lo flojo: `icons.family_tint` da a la categoría 5 el material de su familia (placa acero oscuro,
      cuero piel oscura, tela ciruela); arcos más gruesos; flechas de los carcajs separadas; escarpe alado
      dorado con greba ancha; polainas de lobo sin cola; estadística de armadura como gran yelmo.
- [x] Pulgares de los guantes (lab v33): "son un poco raros… como muy gordos". En `hand()` el pulgar pasa de un
      bloque poligonal a un `limb` del grosor de un dedo, en diagonal desde la base de la palma.
- [ ] Revisión del usuario del catálogo. Flojo conocido: las piezas de la Grieta se parecen entre familias; arcos
      finos; plumas de los carcajs en un solo penacho; escarpe alado dorado; polainas de lobo; el puño de la
      manopla oxidada; coraza de 16 px (estadística de armadura).
- [ ] Pendiente: iconos de mascotas; gemas por nivel si se quiere distinguir T1–T8 más allá del marco.
- [ ] Integrar en la UI del juego (sustituir `src/ui/icons.ts`, que hoy usa emoji).

## Interfaz (2026-11-14)

- [x] Maqueta 1 del panel de héroe y el alijo (`docs/redesign/mockups/hero_panel.html`): descartada sin publicar;
      el usuario pidió que la interfaz "pierda ese toque AI generated genérico. Más iconitos pixel art, más textos
      custom con fuentes bonitas, menos textos descriptivos upfront y más tooltips custom, menos visual clutter,
      más claridad".
- [x] Maqueta 2 (lab v34), con esas reglas:
      - Signos en vez de palabras: `icon_sets/s90_ui.py` (emblemas de clase, pestañas, oro, experiencia, poder de
        equipo, mejora, gema engastada, botones). Las palabras solo aparecen en los tooltips (CSS `:hover`).
      - Marco en pixel art, no cajas CSS: `icon_sets/s95_chrome.py` (ventana nine-slice con cantoneras de latón,
        tooltip, botones, pestañas-marcapáginas, casilla vacía, adorno de separador, tecla de cerrar que ocupa la
        esquina superior derecha, nicho de piedra donde posa el héroe).
      - Dos letras con un oficio cada una: «Jacquard 12» (gótica pixel) para nombres y títulos; «Jersey 10/20»
        para números y texto de tooltip. «Jacquard 24» descartada: su A mayúscula se lee como una X ("Xlijo").
      - Sin barras de título, sin cajas hundidas, sin rótulos: estadísticas como signo + número; el nivel es un
        banderín sobre el arco del nicho; el oro vive en el alijo, no en el panel de héroe; la barra de
        habilidades sale de la pestaña de equipo.
- [ ] Validación del usuario de la maqueta 2 (estilo, gótica, densidad).
- [ ] Después: llevar las recetas a `src/ui/kit` y rehacer los paneles uno a uno (HUD, héroe, alijo, tecnología,
      mapa y dificultades, mascotas, cubo, opciones, título).
- Flojo conocido de la maqueta 2: los títulos van al doble de tamaño que el resto del texto (píxel gordo, como el
  héroe del nicho); el emblema de "todas las clases" es poco claro; no hay vista de comparación lado a lado;
  solo se ha visto en capturas del navegador sin cabeza a 1280 px, no en móvil.
