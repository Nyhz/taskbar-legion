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
- [x] Validación del usuario de la maqueta 2: "la direccion del estilo es perfecta si". Commit `8645777`.
- [x] Maquetas del resto de paneles (lab v35), cada una en su fragmento de `docs/redesign/mockups/` sobre el kit
      compartido `00_kit.html` (la página del lab monta un escenario por fragmento; `<!-- mock: Título | nota -->`):
      - `05_hud.html` + `icon_sets/s96_hud.py`: la barra sobre la tira en dos momentos (oleada, jefe de etapa).
        Lanzadores de paneles como signos, etapa + barra + calavera, cofres, llaves, oro; sobre la tira solo daño,
        botín, y con jefe su nombre, vida y reloj de furia. Los cofres se abren desde la barra (sustituye a los
        popups sobre la tira) — cambio de presentación a confirmar.
      - `20_map.html` + `s91_map.py`: miniaturas de los diez mundos cortadas del fondo real, cinco signos de
        dificultad, etapas del mundo elegido y la puerta de su jefe. Muestra los mundos no pisados como siluetas
        (hoy el juego los oculta).
      - `30_tech.html` + `s92_tech.py`: las doce mejoras reales como sellos con signo, valor y tecla de precio.
      - `40_pets.html`, `50_cube.html` + `s93_pets_cube.py`: seis mascotas en repisa (las que faltan, en silueta);
        el Cubo con sus tres recetas reales como marcapáginas.
      - `60_options.html`, `70_title.html` + `s94_options.py`: ajustes como signo + control (idioma y volúmenes
        vienen de REDESIGN.md, no existen hoy); título sobre la propia tira con logo dibujado.
- [x] Primera revisión del usuario (lab v35): "la UI del cubo me parece francamente confusa y no veo la de
      talentos".
      - Cubo rehecho (lab v36, `50_cube.html` + `icon_sets/s97_cube.py`): en este panel la claridad manda sobre
        "signos en vez de palabras". Pestañas con signo + palabra, una línea que escribe la receta como ecuación,
        recuento de lo cargado, teclas con su verbo, casillas con rótulo, Transfigurar en tres pasos numerados y
        su resultado como momento aparte; cuatro momentos rotulados en el lab.
      - Talentos (lab v36, `15_talents.html` + `icon_sets/s98_talents.py`): pestaña del panel de héroe en
        horizontal. Tronco común (las cinco habilidades y pasivas reales del Knight) y dos ramas de
        especialización con nodos «elige una», modificadores de habilidad y una definitiva por rama, como pide
        REDESIGN §5. Barra de puntos gastados que abre columnas; la forma del nodo dice qué es. Nombres y efectos
        de las ramas (Bastión, Azote) son PROVISIONALES hasta `CLASSES.md`; los signos de habilidad también.
- [ ] Revisión del usuario del Cubo rehecho y de talentos.
- [x] Letra: en «Jacquard 12» las mayúsculas T, O, U, V e I se confunden ("Talentos" → "Valentos"). DECIDIDO por
      el usuario (2026-11-15): se quedan como están ("OK a que las dejes como estan"). No se dibuja fuente propia.
- [x] Cambios respecto al juego actual, confirmados por el usuario (2026-11-15):
      1. Los cofres se abren desde el HUD (sin popups sobre la tira), PERO el HUD debe enseñar cuántos caben:
         hecho en lab v37 con un cuadradito por hueco de almacén (encendido si hay cofre; todos rojos si está lleno).
      2. El mapa enseña los mundos no pisados como siluetas con candado: ok.
      3. Ajustes con idioma y cuatro volúmenes + silencio: ok.
- [ ] Consolidar en el kit las reglas que los paneles escribieron en local: tecla ancha con signo y palabra,
      tecla de peligro, opciones segmentadas, deslizador, interruptor, lámpara de "encendido", fila de título con
      algo a la derecha, corchetes de selección para cualquier tamaño, pips de rareza (`cube_pip_*` → `ui_pip_*`),
      fila de tooltip signo + texto, tooltip de ancho automático con varias líneas.
- Sin maquetar todavía: pestaña de habilidades, tarjeta de resultado
  del Cubo, resumen de ausencia, elección de engaste, variante "Empezar" del título.
- [ ] Después: llevar las recetas a `src/ui/kit` y rehacer los paneles uno a uno (HUD, héroe, alijo, tecnología,
      mapa y dificultades, mascotas, cubo, opciones, título).
- Flojo conocido de la maqueta 2: los títulos van al doble de tamaño que el resto del texto (píxel gordo, como el
  héroe del nicho); el emblema de "todas las clases" es poco claro; no hay vista de comparación lado a lado;
  solo se ha visto en capturas del navegador sin cabeza a 1280 px, no en móvil.

## Interfaz en el juego (2026-11-15)

El usuario aprobó el orden: kit en código + iconos + idiomas → paneles reales uno a uno (HUD primero) → kits de
clase (`CLASSES.md`, en paralelo) → armadura por clase → arte de la tira al juego.

- [x] **Idiomas (R3)**: `src/i18n/` (catálogos `en`/`es` tipados, `t()`, `useT()`, idioma del sistema por
      defecto, guardado con los ajustes), diccionarios de datos en `src/data/i18n/es/` con `src/i18n/names.ts`,
      pruebas en `test/i18n/`, glosario en `docs/redesign/I18N.md`. Selector mínimo en el popover de opciones
      actual. DESVIACIÓN de R3: no se traducen los paneles viejos; cada panel recibe sus textos al rehacerse.
      Dificultades en español: Normal · Infierno · Averno · Eterno · Tormento (la maqueta del mapa aún las
      tiene en inglés). Habilidades, talentos y definitivas, fuera hasta cerrar `CLASSES.md`.
- [x] **Kit en código**: `src/ui/kit/` — `tokens.ts` (tonos de la paleta como variables CSS), `kit.css` (las
      recetas de `00_kit.html` con prefijo `tk-`), `KitRoot` (zoom al píxel del arte), `Sign`, `Tip*`, `Bar`,
      `art()`. Fuentes dentro de la app (`src/assets/fonts`, OFL) e incrustadas en la build (`vite.config.ts`).
      Arte de interfaz en `src/assets/ui` vía `sh run.sh export-ui` (`tools/assets/pipeline/export_ui.py`;
      cada panel añade sus prefijos al portarse).
- [x] **HUD real** (`src/ui/hud/StripHud.tsx` + `HudDock`, `HudStage`, `HudChests`, `hud.css`): lanzadores de
      paneles, dificultad + etapa + barra + calavera, cofres con un cuadradito por hueco (clic para abrir),
      llaves, oro. Sobre la tira (`src/ui/overlay/`): `BossPlate` (sustituye a la barra de furia: jefe, vida,
      reloj), `RetryKey`, `HealDebuffBadge`. Se van `ChestPopups`, `BossEnrageBar`, `RetryToggle`,
      `ZoneDebuffBadge`. Textos en `src/i18n/{en,es}/hud.ts`. typecheck, lint, 225 pruebas y `vite build` en
      verde; visto en el juego en navegador sin cabeza, en español, con tooltips (captura en el lab v38).
      - Sin ver todavía: la placa de jefe en el juego (no llegué a un jefe en la captura), el overlay de Tauri
        y la build empaquetada (las fuentes y el arte van incrustados para evitar el fallo de `tauri://`).
      - Se quita del HUD: el rótulo «TASKBAR LEGION» y los niveles del grupo (van en el panel de héroe).
      - Provisional: el botón de escala sigue siendo el viejo (se sustituye con el panel de Ajustes); el
        tooltip de etapa dice «Mundo N» (los nombres de mundo entran con los datos del contenido nuevo); la
        placa de jefe dice «Jefe de etapa / de mundo» (los nombres de jefe entran con el bestiario).
- [x] **Escala de píxel entero** (pregunta del usuario: "¿Podemos pasar a bases enteras sin mover las cosas de
      sitio?"). Sí: la disposición no cambia (tira anclada abajo al centro, paneles encima); solo cambian los
      tamaños disponibles. `src/state/pixelScale.ts` (puro, con pruebas): la escala del juego solo admite valores
      que dan un número entero de píxeles de pantalla por píxel del arte en la pantalla donde está la ventana
      (retina: ×2, ×3, ×4, el ×3 es el tamaño de siempre; pantalla normal: ×1 y ×2, por defecto ×2 = tira de
      1200 px en vez de los 900 de antes, que no podían ser nítidos). El valor guardado se ajusta al cargar y al
      cambiar de pantalla. El lienzo de Pixi usa siempre resolución 2 (3 píxeles de respaldo por píxel de arte).
      Visto nítido en capturas a densidad 1 y 2. La escala de MENÚS no se toca hasta rehacer los paneles.
      Sin ver: Tauri en Windows a 100 % (con ×2 la tira + HUD ocupan 364 px de alto; el panel de mejoras viejo,
      de ~700 px, roza el alto de la ventana overlay).
- [x] **`docs/redesign/CLASSES.md`** (propuesta, 395 líneas): reglas del árbol sobre la maqueta aceptada, 9
      habilidades por clase (las 5 actuales + 2 por rama), dos ramas por clase, funciones de simulación
      necesarias (F1–F9), migración, sondeo, arte. Ocho preguntas para el usuario al final (§11).
- [ ] Decisiones del usuario sobre `CLASSES.md` §11.
- [ ] Siguiente panel real: héroe + alijo (pide exportar iconos de objeto sin marco y decidir cómo se asigna
      la categoría de dibujo 1–5 a cada objeto), luego mapa, mejoras, mascotas, cubo, ajustes, título.

## Armadura por clase y ritmo (2026-11-15)

- [x] **Armadura por clase** (adelantada con el visto bueno del usuario: el panel de héroe necesita la familia para
      dibujar cada pieza). `ARMOR_FAMILIES` en `src/data/itemSlots.ts` (Knight placas · Ranger cuero · Priest
      tela); `composeItem` sortea una clase para la armadura entre las del grupo (igual que las armas), así que
      un Knight solo nunca ve cuero ni tela; la familia NO decide la mitigación (armadura / resistencia mágica /
      mitad y mitad en las tres). Equipar ya rechazaba un `classKey` ajeno. El Cubo crea piezas para una clase del
      grupo. `GENERATOR_VERSION` 7 (limpia el equipo anterior; no habrá partidas previas). Pruebas nuevas en
      `test/sim/loot`, `itemSlots`, `cube` y `test/state/inventoryGems`. `docs/AFFIXES.md` y `CLAUDE.md` al día.
      Pendiente al portar el panel: nombre de familia en los diccionarios de idioma.
- [x] **Efecto en el ritmo** (`npm run probe`, misma configuración antigua de 2 h/día): terminar Tormento pasa de
      8,1 a 12,0 días de juego activo (mediana; 4/5 → 5/5 semillas completan). Cada pieza de armadura sirve ahora
      a un héroe de tres.
- [x] **Referencia de ritmo fijada por el usuario**: el probe supone 8 h de juego al día
      (`DEFAULT_CONFIG.activeHoursPerDay = 8`) y el objetivo es ~3 meses de calendario para acabar todas las
      dificultades (~720 h activas). El usuario se pasó el balance anterior en ~3 semanas. El reajuste (subir
      muros, enemigos más fuertes, menos botín, clases más flojas) se hace cuando el contenido del rediseño esté
      listo, midiendo con el probe; no antes ni a trozos.

- [x] **Maqueta completa de héroe + bolsa + alijo** (lab v39, `10_hero_stash.html` + `icon_sets/s99_bag.py`): nueve
      momentos rotulados que cubren lo que hace el juego hoy — cambiar de héroe y reclutar (marcapáginas en el
      borde superior), dos habilidades + definitiva, preajustes Farmeo / Jefe, la bolsa dentro de la ventana del
      héroe con su capacidad y la casilla que compra un hueco, el alijo con páginas, menús de clic derecho,
      comparar, engastar, arrastrar, bolsa llena y la pestaña «Hoja». Se van (no existen en el juego): vender,
      abrir cofres desde el alijo, filtro por clase, flechas de mejora y «poder de equipo» (ahora nivel medio de
      objeto). Flojo: héroe + bolsa mide ~515 px de arte; con el alijo al lado no cabe en pantalla normal a ×2.
- [x] El usuario pide pasarla a código ya ("Pásala a código ya"); los cambios se harán sobre el panel real.
- [x] `CLASSES.md` actualizado con las ocho decisiones y con las tres que quedaban (2026-11-15): talentos de rol
      sí; el par «elige uno» es de dos habilidades distintas; la pestaña Habilidades desaparece (la tercera
      pestaña del héroe es la hoja de estadísticas). Pendiente: nombres y la sustituta «Mantener la línea».

## Pantallas objetivo y ritmo de referencia (2026-11-15)

- [x] **Pantallas en las que el juego tiene que caber** (requisito del usuario): 1280×720, 1920×1080, 2560×1440 y
      el MacBook Pro M4 (1512×982 @2x el de 14", 1728×1117 @2x el de 16"). Lista y ayuda de encaje en
      `src/state/pixelScale.ts` (`TARGET_SCREENS`, `wholePixelFit`), con pruebas: en todas, la tira cabe a su
      escala por defecto y la ventana más ancha (héroe + bolsa, ~520 × 240 px de arte) cabe encima.
      Calculado: 1280×720 → tira ×2, paneles ×1 · 1920×1080 → tira ×2, paneles ×2 (con el alijo al lado) ·
      2560×1440 → tira ×2, paneles hasta ×3 · MacBook 14" → tira ×3, paneles ×3.
- [ ] Al rehacer la capa de paneles: elegir sola la escala de paneles según la pantalla, y dimensionar la ventana
      overlay de Tauri según el monitor (hoy es fija, 1280×1060 px lógicos: más alta que una pantalla de 720 y
      más estrecha que héroe + bolsa + alijo a ×2).
- [x] **Probe a 8 h/día, con armadura por clase** (punto de partida del reajuste): Normal 1,0 d activos (3 d de
      calendario) · Infierno 2,0 d (6 d) · Averno 5,0 d (15 d) · Eterno 8,3 d (25 d) · Tormento 16,0 d activos
      (1,6 meses). Objetivo: ~3 meses. Falta alargar el juego cerca de ×1,9.
- [x] Maqueta de héroe + bolsa + alijo: el usuario acepta la bolsa dentro de la ventana del héroe "de momento".

## Héroe + bolsa + alijo en código (2026-11-15, en curso)

- [x] **Kit ampliado** (`src/ui/kit`): `Window` (pestañas, plazas, cabecera), `Slot` + `ItemIcon` + `SlotGrid`,
      `Key` / `Chip` / `Check` / `Gold`, `Menu`, familia `Tip*` (incluida la tarjeta de objeto y de comparación),
      `StatRow`, `Node` (placas de habilidad / pasiva / modificador / definitiva), `Rule`. Galería de desarrollo en
      `/#kit`. Arte de objeto por pieza: `src/ui/itemArt.ts` (familia por clase; dibujo 1–5 por rareza:
      T0→1, T1–T2→2, T3–T4→3, T5–T7→4, T8→5), con prueba de que cada combinación tiene archivo.
- [x] **Capa de paneles** (`src/app/PanelLayer.tsx`, `kitPanels.tsx`): los paneles del kit van en una fila centrada
      sobre la tira, a píxel entero: la escala de la tira si caben, una menor si no (`panelPixelsPerArtPixel`,
      con pruebas en las pantallas objetivo). Los paneles antiguos siguen por su camino viejo.
- [x] **Ventana overlay de Tauri** ajustada al monitor (`desktopOverlay.ts`): ancho del monitor hasta 1920 y alto
      del monitor menos el margen del dock, hasta 1060. SIN PROBAR en Tauri.
- [x] Estado `heroTab` (equipo / talentos / hoja); el HUD abre la ventana de héroe en su pestaña.
- [x] Herramientas: `scripts/shot-app.mjs` (capturar el juego en marcha) y `scripts/dev-seed.js` (estado de prueba
      con dos héroes, equipo, bolsa y alijo).
- [x] **Casillas de objeto** (`src/ui/panels/items`): `ItemCell` (mismas props que el viejo `ItemSlot`), tarjeta
      de objeto y de gema, comparación lado a lado con lo puesto (diferencias, estadística perdida, daño y
      aguante, Mayús sin gemas), menú contextual con el `Menu` del kit (`MenuItem.sign`), fantasma de arrastre,
      `DropSlot`, diálogos de engaste como ventanas del kit. Nombres de familia de armadura y de gema en los
      diccionarios.
- [x] **Ventana de héroe + bolsa** (`src/ui/panels/hero`): plazas (cambiar de héroe, reclutar, plaza cerrada),
      pestañas equipo / talentos / hoja, muñeco en el nicho (figura antigua de momento), nivel, experiencia,
      nivel medio de objeto con su flecha, columna de estadísticas, definitiva + dos habilidades con recarga,
      preajustes, bolsa con páginas de 6 × 5, casilla de comprar hueco, ordenar, gemas al alijo.
- [x] **Alijo** (`src/ui/panels/stash`): páginas como marcapáginas (la siguiente se compra, las demás cerradas),
      cinco filtros, ordenar, «+1 hueco», mover con la bolsa por clic / clic derecho / arrastre.
- [x] **Talentos y hoja** (`hero/TalentsTab`, `SheetTab`): el árbol ACTUAL como diez columnas (habilidades arriba,
      pasivas abajo), barra de puntos gastados, tope de 2 habilidades, devolver puntos; hoja con estadísticas,
      cifras de cuenta y efectos activos. Signos provisionales de las 15 habilidades y 3 definitivas
      (`icon_sets/s9b_abilities.py`, `src/ui/abilityArt.ts`).
- [x] **Integración**: se borran `PartyPanel`, `StashPanel`, `panels/party/*`, `HoverTip` y los dos bancos de
      pruebas; ajustes y salir pasan provisionalmente al HUD (eran botones de la cabecera vieja); la ventana de
      héroe toma el ancho de su pestaña; `window.__tlStore` en desarrollo para las capturas; `shot-app.mjs`
      mueve un ratón real. typecheck, lint, 270 pruebas y `vite build` en verde. Visto en el juego (lab v40):
      héroe + bolsa + alijo en español, comparación con ratón real, menú de clic derecho, talentos, y 1280×720.
- Flojo / pendiente conocido: nombres y descripciones de habilidades y efectos siguen en inglés (esperan a
  `CLASSES.md`); los objetos no tienen nombre propio (la tarjeta dice el tipo: «Yelmo · Épico · Placas»);
  decimales del nivel medio a la inglesa; la figura del nicho es la antigua y sobresale del arco; arrastrar
  entre páginas de la bolsa no es posible (se ordena); el destello al equipar no está; sin probar en Tauri ni
  con la build empaquetada; los botones de ajustes / escala / salir del HUD son los viejos.
- [ ] Siguientes paneles reales: mapa, mejoras, mascotas, cubo, ajustes, título.

## Disposición de los paneles (2026-11-15)

El usuario, al ver héroe + bolsa lado a lado con el alijo: "Me incomoda que la ventana de pj + inventario no esté
centrada"; no quiso una ventana única ni un menú cada vez ("la de héroe/inventario… debería ser fija"), y propuso:
"los iconos del inventario y alijo son muy grandes. Podrían reducirse alrededor de 1/3… ¿nos cabe el inventario
debajo del paperdoll? ¿Y centradito?". Hecho así:

- [x] **Ventana de héroe fija y centrada** sobre la tira; no se mueve ni se cierra al abrir otra. El muñeco queda
      en medio y la **bolsa debajo**, a lo ancho del bloque del muñeco.
- [x] **Casillas pequeñas** (kit `SlotGrid small`, `KitScale.small`): bolsa y alijo se dibujan un píxel de pantalla
      por píxel de arte menos que su ventana (2/3 a ×3, 1/2 a ×2; a ×1 no hay paso menor). No es un escalado
      borroso: siguen en la rejilla de píxeles. Sus tooltips vuelven a la escala de la ventana.
- [x] La bolsa toma las columnas que caben bajo el muñeco (9 a ×3, 12 a ×2, 6 a ×1) y las filas que caben sobre
      la tira (entre 2 y 5; el resto, en páginas). `src/ui/panels/hero/heroLayout.ts`, `smallGrid.ts`,
      `panelSpace.ts`.
- [x] **Alas**: una ventana a cada lado del héroe (izquierda: alijo; derecha: el menú que se abra). La capa calcula
      la escala contando el ala más ancha a AMBOS lados, para que el héroe no se descentre (`fitPanelPixels`).
- [x] El alijo enseña solo sus páginas compradas y la siguiente (antes, ocho marcapáginas con candado).
- [x] **La tira ocupa como mucho el 42 % del alto de la pantalla** (`STRIP_MAX_HEIGHT_SHARE`): en 1280×720 solo
      queda ×1 (×2 era media pantalla). Pruebas nuevas sobre las pantallas objetivo: tira ×1 / paneles ×1 en
      720p; ×2 / ×2 en 1080p y 1440p; ×3 / ×3 en los MacBook; el héroe cabe solo y con el alijo en todas.
- Visto en el juego en las cuatro pantallas (lab v42) y el tooltip de comparación con ratón real sobre una casilla
  pequeña. typecheck, lint y 270 pruebas en verde.
- Flojo: en 1080p la bolsa enseña solo 2 filas (24 huecos a la vista); en 720p las casillas no pueden encogerse;
  dos tamaños de píxel conviven en la misma ventana (equipo grande, bolsa pequeña); los demás menús (mapa,
  mejoras, mascotas, cubo) aún son los viejos y no usan el ala derecha nueva.

- [x] **Segunda vuelta de la disposición** (2026-11-15, hecha — lab v43), a petición del usuario al ver lo anterior:
      ventanas PEGADAS ("como antes"; el hueco era un fallo: se reservaba el ancho de la pestaña más ancha);
      alijo de ancho FIJO, exactamente sus columnas; iconos de objeto a 2/3 EN TODAS PARTES (equipo, bolsa,
      alijo) y con la misma proporción en cualquier pantalla y escala — el paso de píxel menor daba 1/2 en 1080p
      y "son muy pequeños"; la ventana de héroe es la principal y las demás son alas que se despliegan desde
      etiquetas en sus bordes: izquierda alijo / talentos / estadísticas, derecha cubo / mapa / mascotas /
      mejoras, una por lado. Para los 2/3 fijos el pipeline dibuja los iconos NATIVAMENTE a 22 px en marco de 24
      (`sm_*`, `smframe_*`); probado: espadas, yelmos, guantes, botas, arcos, varas y tomos salen bien a la
      primera, pecheras, anillos y escudos hay que repasarlos. Se retira el mecanismo de "casillas pequeñas" por
      zoom. Talentos y hoja dejan de ser pestañas del héroe y pasan a alas izquierdas.
- [x] **Un solo ancho para todos los paneles laterales** (usuario, 2026-11-15): alijo, talentos, estadísticas,
      cubo, mapa, mascotas y mejoras se diseñan al MISMO ancho en px de arte (alto variable). Héroe + un ala a
      cada lado tiene que caber en todas las pantallas objetivo a la escala de la tira (la más justa:
      1920×1080 a ×2, 960 px de arte de ancho). Las tres alas del kit (alijo, talentos, hoja) lo adoptan ya; cubo,
      mapa, mascotas y mejoras se rehacen a ese ancho al portarlas.
- [x] Resultado (lab v43; typecheck, lint y 271 pruebas en verde):
      - Iconos de objeto dibujados NATIVAMENTE a 22 px en marco de 24 (`sm_*`, `smframe_*`): `Icon` tiene escala
        real (`at_scale`), los 32 px no cambian ni un byte; repasados uno a uno. Flojos a 22 px: abalorio de la
        Grieta, anillo de sello, marco T7 pesado.
      - Todas las casillas del juego son de 24 px de arte (equipo, bolsa, alijo); se retira el zoom de "casillas
        pequeñas". Marcas de casilla a su medida (`icon_sets/s9c_marks.py`).
      - Un solo ancho: **298 px de arte** para el héroe y cada ala (11 casillas). Héroe + dos alas + etiquetas =
        934 px de arte; cabe en 1920×1080 a ×2 (952 disponibles). Escala de paneles = la de la tira en todas las
        pantallas objetivo (720p ×1, 1080p ×2, 1440p ×2, MacBook ×3).
      - Ventana de héroe: muñeco con casillas de 24, nombre, estadísticas y experiencia al lado; fila de
        definitiva + habilidades + nivel de objeto + preajustes; bolsa debajo (2–5 filas según el alto).
      - Alas pegadas y alineadas abajo, desde etiquetas: izquierda alijo / talentos / hoja; derecha cubo / mapa /
        mascotas / mejoras. Una por lado (abrir una cierra la otra). Las etiquetas van en el borde exterior del
        ala abierta. Las páginas del alijo pasan a su pie. El HUD lleva un solo signo de menú.
      - Los cuatro paneles de la derecha siguen siendo los ANTIGUOS (aspecto y ancho viejos): hay que rehacerlos
        a 298 px. En 1280×720 mejoras se sale por la derecha y por arriba.
      - Sin probar: overlay de Tauri (clic a través de las etiquetas que cuelgan fuera), arrastre con ratón real.
- [ ] Siguiente: cubo, mapa, mascotas y mejoras como alas del kit a 168 px de ancho (6 casillas) (alto libre, ≤ ~314 px de
      arte para caber en 1080p a ×2).
- [x] **Alas estrechas y altas** (usuario, 2026-11-15: "Las pestañas laterales deberian ser mas estrechas y mas
      altas. Todo lo altas que necesiten ser… Pero no tan anchas"; leído como los paneles laterales, no las
      etiquetas). Ancho común nuevo: 6 casillas (~168 px de arte); el héroe conserva sus 298. Alijo 6 × 5,
      talentos con el árbol en vertical, estadísticas en dos columnas. HECHO (lab v44): ancho único 168 px de
      arte (`WING_COLS` en `src/ui/panels/panelLayout.ts`); héroe + dos alas + etiquetas = 674 px de arte. Altos
      máximos: alijo 314 (9 filas, todos los huecos comprados; 210 en la página base), talentos 307, hoja 314 en
      su peor caso declarado. El tope es 314 (1080p a ×2 en Tauri): alijo y hoja lo tocan sin holgura. 277
      pruebas en verde. Sin ver: hoja con más de dos líneas de efectos, pie del alijo con 5–7 páginas, Tauri.
- [ ] **Cubo, mapa, mascotas y mejoras como alas del kit** (usuario, 2026-11-15: "a por esos paneles que faltan y
      las mejoras. Ya haremos ajustes"), en curso en paralelo. Cada una a 154 px de contenido (6 casillas) y como
      mucho 314 de alto. Preparado: ventanas provisionales registradas (`src/ui/panels/{cube,map,pets,tech}`),
      espacios de texto `cube` / `map` / `pets` / `tech`, arte `map_` y `pet_` exportado. Al terminar: borrar
      `CubePanel`, `MapPanel`, `PetsPanel`, `TechTreePanel`, `tech/TechCard` y los componentes viejos sin uso
      (`PixelWindow`, `ItemSlot`, `ItemTooltip`, `GemTooltip`…), y quitar la rama antigua de `PanelLayer`.

## Plan de la noche del 15 al 16 de noviembre de 2026 (trabajo autónomo, aprobado por el usuario)

Bloques aprobados, en este orden y hasta donde se llegue: (1) cerrar los paneles laterales; (2) resto de la
interfaz — ajustes, título, avisos y botín sobre la tira, resumen de ausencia; (3) arte de la tira al juego —
héroes, fondos con atmósfera, bestiario, solo presentación; (4) clases en la simulación según `CLASSES.md`, con
nombres provisionales.

Reglas dadas por el usuario para esta noche: un commit de control por bloque en `redesign/foundations`, sin
push; Tauri solo compilar, sin abrir la app; hasta cuatro trabajos en paralelo. Reglas propias: no reajustar el
ritmo; no fijar nombres ni cambiar reglas fuera de lo acordado; ante una decisión suya, la opción más
conservadora, marcada como provisional; si salta el límite de uso, dejar anotado lo que quede a medias.

- [x] Commit de control `ee32919` con todo lo acumulado (interfaz en el juego, iconos a 2/3, disposición).
- [x] **Bloque 1 — paneles laterales cerrados** (lab v45). Cubo, mapa, mascotas y mejoras son alas del kit de 168 px
      de ancho: cubo 301 de alto (tres recetas, selector propio de piezas), mapa 278 (dificultades, mundos con
      recorte de su fondo — los no alcanzados en silueta —, etapas 3 × 3, puerta del jefe, nombres de mundo en el
      espacio `map` de i18n), mascotas 297 (compañera en el nicho, repisa 3 × 2), mejoras 304 (doce sellos con
      valor y tecla de precio). Borrados: `CubePanel`, `MapPanel`, `PetsPanel`, `TechTreePanel`, `tech/TechCard`,
      `techDisplay`, `techMeta`, `PixelWindow`, `ItemSlot`, `ItemTooltip`, `GemTooltip`, `StatRow` viejo y la rama
      antigua de `PanelLayer`. Vistos en el juego los cuatro junto al héroe (MacBook) y el cubo en 1080p y 720p.
      Flojo anotado por cada panel: el Cubo carga desde su selector, no desde la bolsa real; la puerta del mapa
      usa la cara del jefe de etapa (los jefes de mundo no tienen arte); frases de mascotas provisionales;
      «Upgrades» en gótica se lee «Jpgrades»; reglas locales que van al kit (tecla fina de precio, paginador,
      insignia de paso, fila seleccionable, tooltip desplazado).
- [x] **Bloque 2 — resto de la interfaz** (lab v46). Ajustes: una rueda en el HUD abre una ventana del kit
      (idioma, tamaño ×N, música del título, exportar / importar, partida nueva con pregunta dentro de la ventana,
      salir en Tauri); se borran `OptionsPopover`, `ScaleControls`, `QuitGameButton`. Título: montado sobre la
      propia tira con el logo dibujado, tecla Empezar / Continuar con el resumen de la partida, y se desvanece al
      entrar (antes encogía); se borran `TitleStage`, `TitleScene`, `TitleParticles` y el logo viejo. Sobre la
      tira: banda de peligro y de etapa, aviso de guardado fallido, líneas de botín con icono y rareza, resumen
      de ausencia y panel de error de render, todo en el kit y en los dos idiomas.
      Sin ver: nada de esto en Tauri; importar con éxito y confirmar partida nueva (recargan la página); el
      resumen de ausencia en su arranque real (en navegador el guardado es en memoria). Pendiente menor: reglas
      muertas en `global.css` (`tl-title-exit`, `tl-logo`, `tl-menu-in`, `tl-fade-late`, `tl-danger`,
      `tl-stage-banner`); el texto flotante de combate sigue en inglés y con emoji (`FloatingText`, `GameStrip`).
- [x] **Mundos y criaturas en los datos**: `src/data/worlds.ts` (los diez mundos con su nombre y sus cuatro
      criaturas por papel: bestia, cuerpo a cuerpo, distancia, jefe de etapa; la clave es la de su figura en el
      pipeline) y su diccionario `src/data/i18n/es/worlds.json`; `worldName` y `creatureName` en `@/i18n`. Los
      usan el tooltip de etapa del HUD, la banda de etapa (nombre del mundo en gótica), la placa del jefe (nombre
      del jefe de etapa de ese mundo) y el mapa (que deja de tener los nombres en su espacio de textos). Los
      jefes de mundo siguen sin criatura ni nombre propios.
- [x] **Bloque 3 — arte de la tira al juego** (lab v47). Solo presentación, sin tocar reglas.
      - Fondos: `sh run.sh export-strip` → `src/assets/strip/` (20 láminas de capas y `backdrops.json`);
        `StripBackdrop`, `StripAtmosphere` (rayos, partículas, ojos, pulso, parpadeo), carga perezosa por mundo.
        Tormento usa su grado; Normal, Infierno, Averno y Eterno usan el normal (PROVISIONAL: no tienen arte).
      - Figuras: `sh run.sh export-figs` → `src/assets/strip/figs/` (43 atlas y `figs.json`); héroes con idle, run,
        attack, hurt, death y sus clips de habilidad; cada enemigo se dibuja como criatura de su mundo según
        `src/data/worlds.ts` (jefe → jefe de etapa; a distancia o mágico → criatura a distancia; cuerpo a cuerpo →
        cuerpo a cuerpo o bestia, alternando por id — PROVISIONAL, la simulación no distingue bestias). Élites:
        misma criatura con sus anillos. Jefes de mundo: la figura del jefe de etapa con anillos dorados
        (PROVISIONAL: no tienen arte). El nicho del héroe y el título usan el idle nuevo.
      - Se borran los sprites y fondos descargados (`src/assets/enemies`, `backgrounds`, hojas viejas de héroe) y
        `SpriteBody`, `enemyFrames`, `textures`, `swing`, `StageBackground`, `backgroundLayers`.
      - Flojo: los efectos de `WorldFx` (lluvia de flechas…) están dimensionados para los sprites viejos y se ven
        grandes; los jefes muy anchos se solapan con el Knight; el golpe cae al empezar el clip, no en su
        fotograma de impacto; textos flotantes y la escena de derrota siguen en inglés; rayos, ojos y pulso no
        los he visto en captura; sin probar en Tauri.
- [x] **Textos de la tira** (tras el bloque 3). Las frases de derrota y el aviso de "sin llave" pasan por i18n
      (`overlay.wipe1…5`, `overlay.noKey`) y se dibujan con la fuente del kit (`game/render/kitFont.ts`); el portal
      del jefe de mundo lleva los signos de jefe y de llave en lugar de la palabra BOSS y un emoji. Visto en
      captura: portal con y sin llave, frase de derrota en español. El aviso de "sin llave" no lo he visto en
      captura. Quedan en inglés o con emoji: los glifos de habilidad que flotan al lanzar (`render/fx.ts`).
- [x] **Bloque 4a — clases en la simulación** (`CLASSES.md`, primera tanda; nombres en inglés PROVISIONALES).
      - Árbol nuevo: diez niveles, tronco + dos ramas + remates; nodos de habilidad, pasiva, rol, modificador y
        remate (`data/talentSpec.ts`, `data/talentTrees/*`, reglas en `sim/talentRules.ts`: `canSpend` dice por qué
        se niega un punto; máximo dos habilidades aprendidas; "elige una"; el modificador necesita su habilidad).
      - Mecánicas: parches de habilidad (`abilityPatch`), objetivo y coeficiente por efecto, talentos de rol
        (auras de grupo, `sim/liveStats.ts`), disparadores genéricos (`sim/triggers.ts`; las tres definitivas pasan
        por ahí), objetivo "dos héroes".
      - Carga tolerante (`persistence/sanitizeHero.ts`): claves desconocidas fuera, dos habilidades, rangos acotados.
      - Paridad: código viejo y nuevo dan el mismo flujo de eventos y estado del RNG en 30 000 ticks, ocho escenarios.
      - **Hallazgo de la sonda**: la política de talentos antigua era ILEGAL (cinco habilidades y todos los puntos
        en una pasiva por encima de su tope: +285 % de daño, +190 % de vida), así que los muros estaban medidos
        contra un grupo demasiado fuerte. Medianas a 8 h/día, sin retocar nada:
        antes (ilegal) Tormento 16,0 d activos, 5/5 semillas · árbol nuevo 14,3 d pero solo 1/5 semillas pasa
        Tormento 10-10 (el resto se queda en 489–499) · control árbol viejo con política legal 11,7 meses, 1/5.
        Legal contra legal, el rediseño es MÁS fuerte que el árbol viejo. El reajuste de ritmo sigue pendiente.
      - Provisional (del documento no se deducía): Vigilia 0,05 % de vida/s por rango sin escalar con poder de
        curación; curas por disparador como fracción plana de vida; Égida dura 4 s fijos; Tiro Largo = "aún no ha
        llegado al combate"; Guardián alcanza a todo el grupo, Knight incluido.
      - Flojo: Muro Viviente casi nunca salta con Knight–Ranger–Priest; `switchClass` sigue borrando talentos sin
        devolver puntos (ya era así); `sim/abilities.ts` ronda las 600 líneas.
- [x] **Bloque 4b — panel de talentos, textos de clases y la tira** (lab v48).
      - Panel de talentos para el árbol nuevo: 168 × 313 px de arte en las tres clases (tope 314); fila de ramas con
        signo y puntos, línea hasta el remate, enlace "elige una", marco propio para talentos de rol, nodos apagados
        con su motivo en el tooltip (dos habilidades, nivel cerrado, modificador sin habilidad, remate sin puntos).
      - Signos PROVISIONALES (`icon_sets/s9d_classes.py`, 22 piezas): seis habilidades nuevas, cuatro ramas, nueve
        talentos de rol, tres marcos. Modificadores y remates siguen usando el signo de su habilidad o definitiva.
      - Textos EN/ES: diccionarios `src/data/i18n/es/{abilities,talents,effects}.json`; la simulación devuelve hechos
        (`sim/talentFacts.ts`, `sim/abilityFacts.ts`) y la interfaz escribe la frase (`talentWords.ts`, ~30 claves
        `talents.*`). TODOS los nombres son provisionales (Réplica, Sanar, Castigo, Remate, Acechador, Celo…).
      - Tira: clips para las seis habilidades nuevas; `castFx` ya no lanza con claves desconocidas; el emoji al
        lanzar es ahora el signo de píxel de la habilidad; efectos de área reescalados a las figuras nuevas y
        efectos nuevos (Mantener la línea, Santuario, Frasco de brea); el clip del ataque básico se adelanta para
        que el golpe caiga en su fotograma de impacto (solo presentación); palabras flotantes traducidas.
      - Sin ver: tooltips bajo puntero real en captura (solo 2 de 8 intentos), reglas del Ranger y la Priest por la
        tienda (solo abiertos y leídos), Réplica y varias definitivas en la tira, nada en Tauri. Las auras de grupo
        no salen aún en las cifras del héroe ni de la hoja. Queda sin uso `TARGET_LABEL` en `data/abilities.ts`.
- [x] **Cierre de flecos tras la noche (2026-11-15, mañana)** — hecho en copias aisladas y reunido en la rama
      `wip/integration`; entra en `redesign/foundations` cuando el usuario termine de probar.
      - Clases: las reglas del árbol comprobadas para las tres clases en el juego y en tests
        (`test/state/talentsAllClasses.test.ts`); cambiar de clase devuelve los puntos; el saneado de partidas
        viejas recupera una habilidad recortada si otra cae después. Las cifras del héroe, la hoja, los tooltips
        y la comparación de la bolsa salen de `sim/partyStats.ts`, lo mismo que usa el motor (`game/engine.ts`
        ya no tiene copia propia), con las auras de grupo y quién las da en el tooltip de la hoja.
      - Tira: los jefes anchos se dibujan detrás de su punto de contacto (`figureData` + test `frontSetback`);
        el número de daño de una habilidad corta espera a su golpe (`render/delayed.ts`); Enfurecimiento detrás
        del cuerpo; destello de golpe más breve; la retícula de la Marca sigue a su portador. Vistos por primera
        vez: Réplica, flecha explosiva, Campo de muerte, Marca sobre jefe, Última resistencia, rayos/ojos/pulso
        de Tormento, aviso de "sin llave".
      - Kit: `Pager`, `Segment`, `Switch`, `SlimKey`, `Veil`, `Node` de rol, `tk-big`, `tk-niche` pasan al kit
        y los paneles los usan; `global.css` de 275 a 100 líneas; fuera `tierStyle.ts`, `TARGET_LABEL`,
        `frostPool`. Test nuevo `test/ui/styleSheets.test.ts` (clases sin uso, hojas sin importar). Capturas de
        antes y después idénticas (36 de 36 escenas; en la ventana del héroe solo cambia el fotograma del idle).
      - Flojo: el ataque del Wyrm lanza la cabeza sobre el Knight; clips largos (arco, conjuro) muestran el número
        al lanzar; Vigilia no sale en la hoja; el paginador de la bolsa con el `Pager` del kit no se ha visto en
        captura (solo hay una página en la partida de prueba); los velos y el diálogo de engarce, comparados por
        estilo calculado, no en captura.
- [x] **Primera prueba en Tauri (2026-11-15, mediodía)** — app empaquetada (`tauri build --bundles app`) desde
      `wip/integration`, abierta por el usuario en su pantalla de 2560×1440.
      - Visto por el usuario: la tira nueva se pinta (sin lienzo en negro), las fuentes de píxel cargan, la
        transparencia y el paso de clics funcionan, arrastrar desde la tira mueve la ventana, la partida continúa
        al reabrir.
      - Arreglado: el juego salía a ×1 porque leía el tamaño guardado por la app de junio (0,75 de la escala
        antigua); los tamaños anteriores al sistema de píxel entero ya no se leen (`settingsShim.storedGameScale`).
      - Arreglado (fallos vistos jugando): el Knight parecía dar dos tajos por un golpe al llegar a un grupo — un
        golpe que nadie anunció empieza ahora su clip EN el tajo (`ClipPlayer.act(..., fromMs)`); el tooltip de
        «devolver puntos» salía bajo los talentos — la tecla bajo el puntero sube con su tooltip (`kit.css`).
      - Arreglado (visto en captura): con más de una página, la bolsa mantiene la altura de una página llena (la
        ventana encogía y el paginador se iba de debajo del puntero). Vistos por fin en captura: el `Pager` de la
        bolsa (80 huecos), el menú de una gema y el diálogo de engarce con su velo.
      - Pendiente: en 2560×1440 el máximo es ×2; un ajuste guardado se rebaja si la ventana encoge y no vuelve
        a subir solo.
- [x] **Mascotas: rangos con objetivo propio y caídas mucho más raras (2026-11-15)** — decisiones del usuario:
      todas las mascotas que tienes dan su bonus a la vez y TODAS progresan; elegir acompañante es solo visual;
      se encuentran al azar y deben ser de final de juego («que sea normal llegar a Infierno con 1 o con 0»).
      - Rangos (`src/data/pets.ts`, reglas en `src/sim/pets.ts`): una mascota se encuentra en rango 1 con una
        quinta parte de lo que daba y llega a lo de antes en su último rango. Duende +3/6/9/12/15 % oro; Búho
        +3/6/9/12/15 % experiencia; Gato +3/5/7/9/12 % cofres; Diablillo −30/45/60/75/90 s; Mula +1/+2/+3 huecos
        (3 rangos, uno más que antes); Acaparador +1/+2 (2 rangos, uno más que antes).
      - Objetivos, contados desde que se encuentra cada una: oro ganado (Duende), experiencia ganada por héroe
        (Búho), cofres comunes abiertos (Mula), cofres encontrados (Gato), tiempo de juego (Diablillo), jefes
        vencidos (Acaparador). En ausencia solo avanzan oro y experiencia (es lo único que da la ausencia). El
        motor los cuenta (`game/engine.ts` → `store.notePetFacts`); la sim solo añade hechos a `pending`
        (`bossKills`, `chestsFound`, `kills`). Al subir de rango sale una línea dorada sobre la tira.
      - Caídas: 1 entre 1.000.000 por baja y 1 entre 5.000 por jefe, por mascota. Medido con el probe (2 semillas,
        ANTES del reajuste de ritmo): bajas / jefes acumulados al acabar Normal 132.000 / 430, Infierno
        269.000 / 790, Averno 638.000 / 1.680, Eterno 1.536.000 / 3.770 → mascotas esperadas 0,66 / 1,24 / 2,46 /
        4,20 (la mitad de los jugadores acaba Normal sin ninguna; las seis, en Tormento). El probe imprime ahora
        esas cuentas (`scripts/sim-progression.ts`).
      - `getBonuses(techRanks, petRanks)` lee el rango de cada mascota; la partida guarda `pets.progress`
        (las partidas viejas cargan en rango 1; `persistence/sanitizePets.ts` descarta claves desconocidas).
      - Ala de mascotas: rango en muescas sobre el pedestal, bonus actual, y en el tooltip el objetivo con su
        progreso y lo que da el rango siguiente; bajo el nombre de la acompañante, sus muescas y la barra hacia
        el siguiente rango. Una mascota sin encontrar enseña lo que daría en rango 1, sin porcentaje de caída.
      - Aviso de MASCOTA NUEVA (`ui/overlay/PetFoundNotice.tsx`): placa con marco dorado sobre la tira, la
        criatura al doble, su nombre en gótica y lo que da en rango 1; dura 9 s o se cierra con un clic; no
        bloquea nada fuera de la placa. Lo levanta el store (`addPet` → `petFound`).
      - PROVISIONAL: todos los números (rangos, metas, caídas) hasta el reajuste de ritmo; las metas están
        puestas para que el último rango sean 2–3 semanas de juego a ritmo de mitad/final de partida.
      - Flojo / sin ver: la mascota aún no aparece en la tira (trabajo aparte); el aviso y la línea de subida de
        rango no tienen sonido; con el tech de apertura automática al máximo el Diablillo no aporta nada (el
        suelo de 6 min ya existía); el aviso no se ha visto en Tauri.
- [ ] **Efectos nuevos de habilidades — piloto (2026-11-15, tarde)** — pedido del usuario: efectos «totalmente nuevos,
      visibles, brillantes y reconocibles» para TODAS las habilidades, movimientos propios para lanzarlas y varios
      ataques básicos alternando al azar. Hecho el piloto: maquinaria + todo el Knight + Fuego rápido del Ranger.
      Sin commit; en el laboratorio, sección «Habilidades: efectos nuevos» (`docs/redesign/lab/img/fx/`).
      - Maquinaria: los efectos son pixel art del pipeline (`tools/assets/pipeline/fx/*.py`, `export-fx` →
        `src/assets/strip/fx/fx.png` + `fx.json` + pieles `skin_<héroe>_<piel>.png`), a escala 1:1 como las
        figuras. `render/abilityFx.ts` (puro) dice, por habilidad, los efectos del lanzamiento y del golpe, y por
        efecto, lo que LLEVA PUESTO quien lo tiene; `render/BodyFx.ts` lo pinta alrededor de la figura;
        `render/fxData.ts` / `fxTextures.ts` cargan el atlas. Regla de apilado: un aspecto por HUECO (piel, suelo,
        detrás, al lado, delante, a los pies, sobre el cuerpo, sobre la cabeza); si dos efectos quieren el mismo,
        gana la prioridad y luego el más reciente. En cuerpos grandes los debufos se repiten, no se escalan.
        Tests: `test/game/abilityFx.test.ts` (toda habilidad tiene aspecto o está en `PENDING_ABILITIES`; todo
        efecto nombrado existe en el atlas).
      - Knight: Piel de piedra (piel `stone` + roca que sube y se rompe), Tajo debilitante (media luna, tajo,
        gotas violetas + espada rota en el enemigo, grilletes con Tajo incapacitante), Baluarte (escudo torre de
        luz delante), Grito de guerra (anillo de fuego + hoguera a los pies de cada aliado), Sed de sangre
        (llamarada roja detrás), Mantener la línea (estandarte plantado + muralla baja delante de cada aliado),
        Réplica (chispa + lanza de luz), Última resistencia (piel `gold` + sol girando). Clips nuevos: `attack2`
        (estocada), `attack3` (golpe de escudo), `harden`, `plant`, `roar`, `riposte`.
      - Ranger: Fuego rápido (clip `haste`, remolino de viento, dardos de aire mientras dura).
      - Ataque básico: `heroClips.attackClips` / `pickAttackClip` — cualquiera menos el que acaba de sonar; el
        adelanto del golpe usa el tiempo del clip elegido (`AttackLead.setWindup`).
      - Quitado para lo cubierto: escudos y flechas de categoría, burbuja amarilla de Última resistencia, anillo
        de color al lanzar, ondas de Grito de guerra y Mantener la línea. El signo de píxel sobre el héroe se queda.
      - Flojo / pendiente: el resto del Ranger y la Priest (lista en `PENDING_ABILITIES`); la roca de Piel de
        piedra parece un montón más que placas; los anillos del suelo se quedan finos al final; la llamarada de
        Sed de sangre pierde contraste sobre fondos rojos (mundo 4); las pieles no llevan el destello de golpe
        propio (se tiñen de rojo como antes); los textos flotantes viejos (BLOCKED, INVULNERABLE, la «U») siguen
        en monoespaciada; «Baluarte reparador», «Portaestandarte» y «Venganza» no tienen efecto propio (los dos
        últimos usan el estandarte y los debufos comunes); nada visto en la app empaquetada (las pieles y el atlas
        se cargan igual que el resto del arte, con `?url`).
- [x] **Diablillo del tiempo: mecánica nueva (2026-11-15, decisión del usuario)** — el tope de ausencia base baja
      de 12 h a 8 h (`sim/offline.OFFLINE_CAP_MS`) y el Diablillo suma +2 / +4 / +6 / +8 / +10 h por rango, hasta
      18 h (`PetBonus` `awayHours` → `bonuses.awayCapBonusMs`, `offlineCapMs`). Ya no toca la apertura automática.
      Su objetivo sigue siendo el tiempo jugado (10 h · 40 h · 100 h · 250 h, cifras del usuario). El aviso de ausencia dice el tope real.
      Caída por baja normal: 1 entre 1.500.000 por mascota (antes 1 entre 1.000.000), por decisión del usuario.
- [x] **La retaguardia recibe daño (2026-11-15, decisión del usuario)** — regla nueva de la simulación; detalle y
      cifras en `docs/DIFFICULTY.md` §5b (sustituye al «solo pega al tanque» de la SPEC y al «muro de puras
      estadísticas» de los jefes de mundo).
      - Hecho: (1) los tiradores apuntan atrás — el 25 % de los disparos básicos del arquero va a un héroe de
        detrás al azar (`EnemyKind.backShotChance`) y su tiro cargado, ahora «Arcing Shot», siempre
        (`AbilityTarget` `backEnemy`); (2) golpes en área — el Golpe brutal del bruto y un ataque AVISADO por jefe
        («Ground Slam» en jefes de etapa, «Shockwave» en jefes de mundo, en todas las dificultades) dan de lleno
        al de delante y reducido a los demás (`splashCoeff` + `WHOLE_PARTY`). Mientras el jefe carga el golpe
        (1,5 s, con su barra) no ataca (`holdsAttack`), y el golpe lleva la furia solo sobre el de delante: el
        tanque recibe lo mismo que antes. Cada golpe lo mitiga quien lo recibe (armadura, reducción de daño,
        escudos, invulnerabilidad), así que Vanguardia y demás auras cuentan. Un Knight solo se comporta igual
        que antes (ni siquiera cambia la secuencia de azar).
      - Cifras (`npx vite-node scripts/measure-backline.ts`: grupos de la sonda, simulación real, regla nueva y
        vieja sobre los mismos grupos): detrás del tanque cae el 25–31 % del daño de las oleadas desde el primer
        grupo completo hasta Averno; 14–35 % en jefes de etapa; 17–26 % en jefes de mundo antes de la furia. El
        golpe más duro a un héroe de atrás: 3–9 % de su vida en oleadas. Sin muertes de retaguardia añadidas ni
        cambio en tiempos de limpieza o victorias de muro sobre los mismos grupos. Inicio de partida (Knight solo
        y desnudo) igual que antes.
      - Provisional: todas las cifras (entran en el reajuste de ritmo). En Eterno la parte de la retaguardia sube
        al 38–44 % (la mitigación del Knight crece más que la de los otros). Sonda de 2 semillas antes → después
        (días de juego activo para acabar): Normal 1,2 → 1,3; Infierno 2,3 → 2,3; Averno 4,7 → 5,2; Eterno
        8,7 → 14,5 (el muro 40-10, que es de los que dependen de una pieza y oscilan de una tirada a otra: sobre
        los mismos grupos la regla no cambia las victorias); Tormento sigue atascado como antes.
      - Presentación que falta (no se ha tocado la tira): la flecha que va a la retaguardia vuela recta a través
        del Knight (debería ir por alto); el golpe en área de bruto y jefes no tiene efecto propio (se ven la
        barra de lanzamiento, el golpe del jefe y los números sobre cada héroe); los héroes de atrás no tienen
        gesto propio al recibir la onda. Los nombres de las habilidades enemigas no salen en pantalla (no hay
        entrada en el diccionario español).
- [x] **La pelea del jefe de mundo, bien presentada (2026-11-15, tarde)** — pedido del usuario tras aprobar a la
      Madre de los Cuervos: «más tiempo de transición para que se pueda disfrutar de su caída… que se vea el nombre».
      - **La caída se ve.** Al morir un jefe de mundo la simulación abre un compás de 5,2 s (`world.bossDown`,
        `data/field.BOSS_DOWN_MS`, activado por `TickContext.animateBossDown`, que solo pone el juego en vivo: las
        sondas y los tests lo omiten y no cambian). Sin combate ni azar: el grupo se queda quieto, el jefe hace su
        muerte entera EN SU MUNDO y se queda tendido; en los últimos 0,5 s la tira funde a negro
        (`render/bossDown.ts`) y el viaje al mundo siguiente arranca ya en negro, sin que el fondo salte bajo los
        pies. La victoria se apunta en el golpe mortal (recompensas y `maxClearedStage`): cerrar el juego a mitad
        del compás no pierde nada. Un test compara el compás con la muerte más larga de las figuras de jefe
        (`test/game/bossDown.test.ts`; la Sierpe, 4,46 s). Los jefes de etapa no tienen compás (`stageBoss: 0`):
        su muerte no se cortaba — el cadáver sigue cayendo detrás mientras el grupo avanza en el mismo mundo.
      - **El nombre.** La línea del jefe muestra su nombre (`creatureName`): el del jefe de mundo propio si el
        mundo lo tiene, y si no el del jefe de etapa. El rango lo dice el signo: calavera (jefe de etapa) o
        corona dorada y nombre en oro (jefe de mundo). Lógica pura en `ui/hud/bossPlate.ts`.
      - **Nada tapa al jefe.** La placa deja la tira y pasa al riel del HUD (`ui/hud/HudBoss.tsx`): con un jefe
        delante, el centro del riel es su línea — signo, nombre, vida y reloj de furia — en lugar de la barra de
        progreso. El jefe ya no lleva barra propia (una barra, no dos). Se queda durante el compás, vacía.
      - **De paso:** un jefe ya no lanza la bola de fuego genérica aunque su daño sea mágico (solo presentación);
        un ataque dibujado más largo que el intervalo entre golpes (el Rey: 1440 ms frente a 1250) se reproduce
        lo justo más rápido para que se vea su recuperación (`attackLead.fitRate` / `setPace`); el destello de
        golpe de un jefe aclara la figura hacia el blanco 110 ms (un tinte no hace nada sobre negro).
      - **Sin arreglar:** `frontSetback` calcula con el alcance del enemigo (80/110) pero el Knight se acerca a
        50 px de su raíz; corregirlo con la caja entera de la figura retranquearía 44 px a la Madre (su pico pasa
        por encima del Knight a propósito). Hace falta exportar el frente de la figura A LA ALTURA DEL HÉROE
        desde el pipeline (`figs.json`). Sin ver: Tauri; el Unmaker como jefe de mundo; la variante de re-limpieza.
- [x] **Efectos del Ranger entero, Fuego rápido rehecho y el tajo del Knight corregido (2026-11-15, tarde)** —
      veredicto del usuario sobre el piloto: «La estocada me gusta. El golpe con escudo también. La animación de
      autoattack que hace como un arco de arriba a abajo, no me gusta, acaba con la espada como torcida hacia abajo…
      Pero las animaciones están muy bien sí. La de rapid fire es algo rara».
      - **Knight, `attack`** (`chars/knight.py`, solo ese clip): el brazo se quedaba horizontal y la hoja caía sola
        desde la muñeca (28–40° de quiebro). Ahora el brazo entero acompaña el tajo — hoja, muñeca y antebrazo en
        una línea — y termina bajo, la punta a un palmo del suelo; luego vuelve a la guardia. Misma duración y
        mismo fotograma de golpe.
      - **Fuego rápido, tercera versión (la del usuario).** Las propuestas A (el carcaj arde) y B (tres flechas en la
        cuerda) se rechazaron al verlas en la app («es como un fuego a la espalda… no tiene ningún sentido») y se
        han quitado del juego, con sus flechas de oro / fantasma y `RAPID_FIRE_CHOICE`. Él eligió: «unas flechitas
        verdes subiendo hacia arriba pero más custom». Ahora: flechas verdes de tres tamaños (centro claro, borde
        verde oscuro) que suben de los pies a por encima de la cabeza en ráfagas rápidas, la mayoría por detrás y
        dos por delante a los lados (`tempo_up`, `tempo_up_front`), y al lanzarlo las mismas salen disparadas del
        suelo (`tempo_burst`, con el clip `haste`). Sus flechas vuelan como la flecha normal.
        `export-fx` ya no falla si otra tarea tiene clips sin exportar: las pieles siguen a `figs.json`.
        Calmado tras verlo el usuario («son muchas y van muy rápido»): 4 flechas a la vez (3 detrás, 1 delante; eran
        8), cada una sube en 1,0–1,3 s a ritmo constante (antes 0,25–0,5 s en ráfagas), se quedan bajo la barra de
        vida, verde más saturado; el estallido al lanzar baja de 7 a 5 flechas.
      - **El resto del Ranger** (`fx/ranger.py`, 30 efectos): Tiro certero (la luz se junta en la punta, flecha
        pesada blanca, atraviesa), Lluvia de flechas (abanico al soltar y flechas que caen y se clavan por toda la
        oleada), Flecha explosiva (flecha ardiendo y explosión donde cae; «Tierra quemada» deja ardiendo),
        Abrojos (sembrados por lo bajo, quedan en el suelo; el enemigo sangra), Punto débil (la piel se abre en una
        estrella ámbar que late), Frasco de brea (lanzado por alto, salpicadura y brea ardiendo por el suelo;
        piernas embreadas), Marca del cazador (señala; una mira carmesí y oro se cierra sobre el jefe y gira en su
        cuerpo), Campo de muerte (cepo de zarzas en los pies de la oleada). La flecha básica es ya del pipeline.
      - **Clips nuevos del Ranger** (`chars/ranger.py`): `attack2` (rodilla en tierra) y `attack3` (salto atrás)
        alternan al azar con el de siempre; `aimed`, `lob`, `sow`, `point` y `haste` rehecho.
      - **Maquinaria** (`render/abilityFx.ts`): una habilidad puede decir qué dispara (`shot`: una flecha propia,
        en arco si es un frasco, con un efecto donde cae), si el disparo va UNA vez a la oleada (`shotTo`) y qué
        esparce por la banda de la oleada (`band`: suelo o aire); una clase tiene su flecha (`CLASS_SHOT`) y un
        efecto sobre el tirador puede cambiarla mientras dura (`EFFECT_SHOTS`); ranura nueva `mark` (centro del
        cuerpo) y `up` (altura sobre el cuerpo). `Projectiles.spawnLook` vuela un efecto del atlas; `GameStrip`
        tiene una capa de efectos sobre los luchadores (`fxAir`) y `playWaveLook` / `playBand`.
      - **Quitado:** la lluvia de flechas, los pinchos, el charco de brea, la retícula y su vuelo (todo `Graphics`),
        el estallido de la hoja vieja de bola de fuego (`getFireballFrames` y su carga), la categoría `mark` de
        `effectAuras`, `markPoint`/`headPoint`, y los efectos `gust` / `tempo_streaks` del piloto.
      - **Detalles:** un efecto duradero puede esperar a lo que lo pone (`delayMs`: el enemigo no arde antes de
        que caiga la flecha) y tener un dibujo mayor para cuerpos grandes (`big`: la mira en un jefe).
      - **Visto en el juego** (1512×918 ×2 y una pasada a 1280×656 ×1; mundos 1, 4, 5 y 10 de Tormento): todas
        las habilidades, los tres ataques básicos del Ranger, el tajo nuevo del Knight, la marca sobre la Madre de
        los Cuervos, Fuego rápido. Laboratorio: bloque «Habilidades: efectos nuevos».
      - **Flojo / sin ver:** el salto atrás del Ranger se despega poco del suelo; el abanico de la andanada es un
        manojo apretado; los abrojos al vuelo son pocos puntos grises; la brea es casi invisible sobre fondos
        oscuros sin sus llamas; «Corazón certero», «Fuego concentrado», «Herida abierta», «Abrojos de púas»,
        «Brea ardiente» y «Marca implacable» no tienen aspecto propio (cambian números o duración); el salto de
        la marca a otro enemigo no se ha visto; nada en la app empaquetada. Los enemigos a distancia siguen con
        la flecha antigua. Falta la Priest.
- [x] **Prueba de concepto de héroes chibi (2026-11-15)** — hecha y DESCARTADA por el usuario: deberían ser más anime y dejan de tener sentido con el fondo y los enemigos actuales. Arte aparcado en `tools/assets/out/_discarded/chibi/`; el bloque del laboratorio queda vacío.
- [x] **Caer, volver y élites (2026-11-15, tarde)** — cuatro peticiones del usuario sobre la tira; laboratorio:
      sección «Caer, volver y élites» (bloque `flow:start`/`flow:end`, imágenes en `lab/img/flow/`).
      - **Derrota escalonada.** Los tiempos viven en `data/field.ts` (`WIPE_*`): caídos 2,4 s → fundido 0,5 s →
        negro con la frase sola 2,2 s (su propio fundido de 0,3 s) → vuelta desde el negro 0,5 s, ya en la etapa
        a la que se retrocede → cartel 1,8 s → llegada 1,3 s; 8,7 s en total (antes 4 s). La simulación revive
        al grupo en `WIPE_ARRIVE_AT_MS` (no al final) y el combate vuelve en `WIPE_TOTAL_MS`; las sondas siguen
        sin animación. `render/wipeBeat.ts` dice qué se pinta en cada momento; el cartel de etapa espera a que la
        tira vuelva (`game/stageSign.ts` → `hud.stageSignHeld` → `ui/overlay/stageSign.ts`), también al viajar a
        otro mundo, y tras una derrota sale siempre (aunque Reintentar deje al grupo en la misma etapa).
      - **Reaparición.** Fuera los anillos y haces de `Graphics` (`tpRing`, `setTeleport`, `spawnIn`). Dos ideas
        dibujadas en `pipeline/fx/flow.py`: A, la columna de luz (puesta), y B, sello de clase y brasas
        (`render/arrival.ts`, `ARRIVAL_CHOICE`). El héroe aparece al rojo blanco (`FigureBody.setWhite`, el mismo
        filtro que el destello de golpe) y recupera sus colores. Sirve para la vuelta tras una derrota (uno cada
        0,22 s, de delante atrás), para un héroe que revive en combate, para un recluta y para llegar a otro
        mundo; al viajar, la misma columna se lleva al grupo (`HeroSprite.depart`).
      - **Flecha de avanzar.** `ui/overlay/NextStageKey.tsx`, sobre el signo de Reintentar: aparece solo si la
        etapa siguiente ya está abierta (`mapLayout.nextOpenStage`: la regla del mapa; nunca hacia un jefe de
        mundo) y viaja con `requestTravel`. Signo nuevo `hud_next` (`icon_sets/s9e_hud_next.py`); textos
        `hud.nextStage` / `hud.nextStageHelp` en los dos idiomas.
      - **Élites.** Fuera el anillo blanco. Fuego fantasma pálido detrás del cuerpo (`elite_aura_s/_m/_l`: un
        dibujo por altura, repetido a lo ancho en una bestia), corona en el extremo de la barra (`elite_crest`),
        marco de la barra en verde frío, y figura a ×1,25 (`render/eliteLook.ts`). «Más grandes»: se comparó ×1,
        ×1,25 y ×1,5 en las tres pantallas (`lab/img/flow/elite_options.png`); ×1,25 se lee bien a ×3 y ×2 y
        queda algo basto a ×1; ×1,5 compite con los jefes de etapa.
      - **Élites, segunda vuelta** (el usuario: «la marca de enemigo de élite tampoco se nota mucho»). Del verde
        frío se pasa a violeta con blanco y la marca va en la figura: borde de 2 px en la silueta
        (`render/figureMask.ts` saca las siluetas blancas del atlas en un canvas, sin filtros; copias teñidas
        detrás de la figura), fuego que sube por encima del grupo, motas delante (`elite_sparks`), barra de
        30 × 5 con marco violeta y corona dorada encima, zIndex por delante de los enemigos comunes
        (`ENEMY_Z`) y un fogonazo al entrar (`elite_arrive`).
      - **Puerta del jefe de mundo.** El portal viejo (remolino rojo de `Graphics`, 15 px hundido bajo el camino)
        se sustituye por una puerta en pixel art de 90 px, de pie sobre el camino (`render/PortalSprite.ts`,
        `render/portalLook.ts`; arte `portal_shut/_open/_hot/_enter` en `fx/flow.py`): encadenada sin llave,
        despierta con llave (grieta carmesí y dos ojos en lo oscuro), más abierta bajo el puntero, y un fogonazo
        al entrar. Una fila de signos encima (jefe · llave · cuántas). El clic sigue siendo de Pixi sobre el dibujo.
      - `pipeline/fx/__init__.all_fx()` descubre ahora sola los módulos de efectos (cualquier `fx/*.py` con una
        lista `FX`).
      - Tests nuevos: `test/game/{wipeBeat,arrival,eliteLook,stageSignHeld}.test.ts`, `test/ui/stageSign.test.ts`,
        más casos en `test/ui/mapLayout.test.ts` y `test/sim/respawn.test.ts`.
      - Flojo o sin ver: la llegada no tiene pose propia (el héroe aparece en reposo; no se pueden añadir clips
        ahora); la nube de polvo de la columna es pequeña; la idea B es tenue sobre fondos claros; el cartel y la
        llegada sí se solapan al viajar de mundo (solo la derrota los separa); el fuego de un élite se amontona
        cuando varios enemigos comparten sitio (el apilado es de la simulación); nada visto en Tauri (el blanco
        del héroe es un filtro); el recluta se capturó pero no se revisó de cerca; sin sonido.
- [x] **Efectos de la Priest entera, ataques de los enemigos y palabras flotantes (2026-11-15, noche)** — cierra el
      trabajo de efectos de habilidades sobre la maquinaria del piloto; laboratorio: grupos nuevos dentro del bloque
      `fx` (entre `fx:priest:start` y `fx:priest:end`; los escribe `scratchpad/pr/lab_block.py` — hay que volver a
      ejecutarlo si se reescribe el bloque entero). `PENDING_ABILITIES` queda vacío.
      - **Familias de la Priest** (`pipeline/fx/priest.py`, 27 efectos): una CURA es luz menta, blanda (cintas,
        pétalos, una flor sobre el curado); un ESCUDO es cristal azul, recto; el PODER es amarillo; la IRA es blanca
        y dorada desde arriba (Castigo, Nova) y carmesí y oro (Furia de batalla).
      - **Habilidades.** Sanar (`mend_gift` → `mend_wind` → `mend_petals`; `heal_bloom` en cualquier cura, con el
        número, al llegar el gesto a su fotograma de salida). Escudo sagrado: el mismo `fx_shield` que el Baluarte,
        con aspecto propio por quién lo pone (`otherOnly`): `ward_raise` → `ward_front` (solo líneas finas, un único
        hueco `front`) → `ward_break`; `fx_ward` es `ward_veil`. Nova sagrada: `nova_flash`, `nova_ring` y columnas
        `nova_shaft` que recorren la oleada en orden (`BandLook.sweepMs`), `nova_hit`. Castigo: `smite_strike` en el
        suelo del enemigo (`hitSpot: 'ground'`). Santuario: `sanctuary_ring` + `sanctuary_glow`. Aura de represalia:
        al ser pasiva no deja efecto en la simulación, así que la tira fabrica uno de pega por héroe
        (`AURA_PREFIX`, `HeroSprite.setPartyAuras`): `retribution_seal` bajo ella, `retribution_tread` bajo los
        aliados, ambos con prioridad −1. Furia de batalla: `zeal_wave`, alas `zeal_wings` solo en ella.
      - **Infusión de poder, rehecha tras verla el usuario** («muy invasivo… tapa completamente el efecto de rapid
        fire»): ya no es un manto detrás del cuerpo sino un BORDE. Concepto nuevo en la maquinaria: `LastingLook.rim`
        → una hoja con la misma disposición que la figura que solo contiene, fotograma a fotograma, una línea de luz
        pegada a su silueta (`export_fx.RIMS`, `skin_<héroe>_infused.png` / `_roused.png`; 3 px en la cabeza, 2 en
        el cuerpo, 1 en las piernas, y puntos de luz a los pies). `FigureBody.setRim` la dibuja DETRÁS de la figura
        y la hace respirar; no ocupa ningún hueco, así que convive con Fuego rápido, Sed de sangre, Piel de piedra y
        Último aliento (test en `priestFx.test.ts`). Más tres motas lentas en un hueco nuevo, `around`, que comparte
        con los pétalos de la cura (así la cura ya no le quita el sitio al brillo de Piel de piedra). Con el mismo
        criterio: los aliados de Furia de batalla llevan el borde `roused` y no alas; el escudo perdió su mitad
        trasera (ocupaba `beside`, el sitio del estandarte del Knight); el sello de la represalia es un solo aro.
      - **Movimientos nuevos de la Priest** (`chars/priest.py`, exportados con `export-figs`): `attack2` (página),
        `attack3` (golpe de báculo), `mend`, `ward`, `infuse`, `nova`, `smite`, `exalt`; `cast` queda para
        Santuario. Todos con un fotograma de salida limpio (`impactMs`). El rayo dibujado dentro de su ataque se ha
        quitado: ahora es un proyectil (`light_bolt` / `light_page`, vuelo recto, `light_hit`).
      - **Enemigos** (`pipeline/fx/enemy.py`, `render/enemyFx.ts`, `render/BlowFx.ts`): flecha y proyectil propios
        (`foe_arrow`, `foe_arrow_arc` con 9 inclinaciones, `foe_bolt`, `foe_hit`); un disparo a un héroe de detrás
        va en arco por encima del de delante (`shotGoesOver`). Golpes de área (`AREA_BLOWS`): aviso de grietas que
        crece durante el lanzamiento y se pone al rojo en el último tercio, una ola que recorre el suelo (colmillos
        `slam_spike`, frente `shock_front` con estela) y un respingo `jolt` bajo cada héroe, con el número cuando la
        ola le llega. Frenesí (`frenzy_burst`, `frenzy_fire`) y Herida mortal (`mortal_rend`, `mortal_wound`) pasan
        a la tabla de aspectos.
      - **Palabras flotantes**: BLOCKED → `block_spark`; INVULNERABLE → `invuln_glance`, como mucho uno cada 450 ms
        por héroe; MULTI! → `multi_sign`; la «U» del Knight → moneda `ult_ready` / `ult_spent`. Los números usan
        Jersey 10 / Jersey 20 como fuentes de mapa de bits instaladas una vez (`FloatingText.ts`); la cuenta de
        reaparición, la letra del kit. Textos `floatInvulnerable`, `floatMulti`, `floatBlocked` borrados.
      - **Quitado**: `render/WorldFx.ts`, `render/characterFrames.ts`, `assets/characters/priest/effects/*.png`,
        `assets/characters/ranger/projectiles/arrow.png`; de `GameStrip`, `spawnAoeFx`, `loadEffectTextures` y
        `HOLY_STRIKE_SCALE`; de `HeroSprite`, el destello de cura, el remolino de furia, el suelo sagrado y las
        cruces; de `EnemySprite`, el aura de frenesí; de `Projectiles.ts`, las tres reservas de proyectiles viejos;
        de `effectAuras.ts` y `fx.ts`, sus casos especiales.
      - Tests: `test/game/priestFx.test.ts` y `enemyFx.test.ts` nuevos; cambios en `abilityFx`, `castSign` y
        `heroClips`.
      - Flojo o sin ver: Brutal Smash no tiene aviso (no tiene tiempo de lanzamiento en la simulación); el borde
        de Infusión es discreto a ×1 y sobre el cielo claro del mundo 1 (se ve, no deslumbra); con Infusión y Furia
        a la vez solo se ve el borde carmesí (más las motas amarillas); Santuario y Grito de guerra comparten el
        hueco `ground` (gana el más reciente); el segundo y tercer ataque básico se distinguen sobre todo por el
        gesto, no por el proyectil; la Infusión sobre el Knight se capturó metiendo el efecto a mano (en el juego
        solo le llega con Infusión gemela o sin DPS); nada visto en la app de Tauri (las fuentes de mapa de bits y
        las hojas de borde son nuevas ahí); sin sonido.
- [x] **El HUD sobre los personajes (2026-11-15, tarde)** — petición del usuario: «falta claridad… con todo el arte
      nuevo me resulta raro dejar esto así». Sustituye las barras finas, los puntitos de efectos y de recargas y la
      escalera de barras enemigas (todo `Graphics` de la versión anterior) por una familia en pixel art:
      `tools/assets/pipeline/icon_sets/s9f_striphud.py` → `src/assets/ui/hud_s_*` (carcasas, rellenos de 1 px que
      el juego estira, fichas de 9×9, 30 signos de 7×7, cifras). Reglas y números en `src/game/render/stripHud.ts`
      (puro, con tests `test/game/stripHud.test.ts`); dibujan `LifeBar`, `ChipRow`, `HeroHud`.
      - Héroe: barra con carcasa (verde; roja y latiendo con ≤ 35 %; el tramo recién perdido; el escudo como tramo
        azul tras la vida; caído → cuenta azul con reloj de arena y segundos en cifras de píxel, y su HUD ya no se
        apaga con el cuerpo). Fila de fichas de efectos sobre la barra (signo de la habilidad, marco dorado/rojo,
        sombra que baja con el tiempo, parpadeo al acabar, tope 3 con «+N»). Fichas de sus dos habilidades a los
        pies (lista / recargando / cargando a golpes) y la moneda del Knight en la misma fila.
      - Enemigos: el común enseña su barra solo herido y se apaga a los 2,6 s sin golpes; las barras se apilan por
        su caja real y la que no cabe no sale (`stackBars`); el élite siempre, con marco violeta y corona; la barra
        de lanzamiento de los jefes es de la misma familia.
      - Alternativas a una constante (`stripHud.ts`): `HERO_BAR_STYLE = 'notched'` (muescas en cuartos),
        `HERO_COOLDOWNS = 'plate' | 'none'` (fichas apiladas junto a la barra, o sin fichas en la tira),
        `FOE_BARS = 'always'`. Laboratorio: bloque `hud2`.
      - Quitado: `hpBg/hpBar/pips/cdPips/respawnLabel` de `HeroSprite`, las barras `Graphics` de `EnemySprite`,
        `drawShieldBar` y `SHIELD_BAR_YELLOW` de `effectAuras`, `ELITE_BAR*` de `eliteLook`.
      - Flojo / sin ver: a ×1 una ficha mide 9 px de pantalla (se lee marco y forma, no detalle); las fichas de los
        pies pisan el borde del camino en algunos mundos; con dos élites en el mismo punto sus barras tapan las de
        los comunes; los ultimates del Ranger y la Priest no tienen ficha (solo la moneda del Knight); los
        perjuicios sobre enemigos no llevan fila (solo su efecto en el cuerpo); nada probado en Tauri; visto en
        los mundos 1, 3, 5, 9 y 10 Tormento a ×2 y en el 3 a ×1.
- [x] **Reajuste de ritmo, punto de control 1 (2026-11-15)** — informe para el usuario, cambio por cambio:
      `docs/redesign/PACING_REPORT.md`. Sin commit.
      - Sonda fiel al juego de hoy: llaves (cada intento gasta una, salen de cofres de jefe de etapa), cofres
        esperados en vez de la muestra de una etapa, 8 h de ausencia, gasto inmediato del oro, combates del muro con
        semilla propia; ejecuciones reanudables (`newProbeRun` / `advanceProbe`).
      - Enemigos ANCLADOS (`DIFFICULTY.md` §6b): un enemigo normal aguanta 2,5 golpes del que más pega con el
        equipo completo del mundo anterior, un élite ×4,5, un jefe de etapa 7,5 s. Tablas medidas por punto
        (`GRUNT_HP_TUNE`, `STAGE_BOSS_HP_TUNE`, `TRASH_DMG_TUNE`); fuera `gearTrack`, `bossHpRamp`, `HP0` y la curva
        de jefes de etapa. `test/sim/anchors.test.ts` + `test/sim/probe/anchorReference.ts` los fijan.
      - Muros recalculados (`WORLD_WALL_MULT`, 0,23 → 39,5) por bisección sobre las horas reales, llaves
        incluidas; objetivos por mundo en `test/sim/probe/targets.ts` (Normal 75 h, Infierno 112, Averno 146, Eterno
        180, Tormento 215). Curva de experiencia estirada (nivel ~108 al terminar). Reclutar más barato
        (600/1.200 + 300 por clase). Arranque: daño enemigo desde el 28 %.
      - Medido en ocho partidas: las ocho terminan, 79–106 días a 8 h (mediana 89). Etapas de 3½–4 min (X-1) a
        9–12 min (X-9). Jefe del mundo 1 entre 1 y 7 h (mediana 2,9).
      - Herramientas: `scripts/tune-pacing.ts` (afinador), `scripts/measure-anchors.ts` (anclajes a lo largo del
        juego), `npm run probe` (ahora con objetivo por mundo; `PROBE_STOP`, `PROBE_TRACE`, `PROBE_SEED_FROM`).
      - Pendiente de decisión del usuario (sección 9 del informe): la llave (su espera, 4–8 h, pesa más que el
        muro), Normal en ~75 h en vez de 36, los intentos fallidos de Tormento, la dispersión de Eterno (172 h frente
        a 280 h en partidas nuevas), volver a medir las mascotas con las bajas nuevas. Si cambia el poder de los
        héroes hay que volver a pasar el afinador.
      - Segunda pasada (respuestas del usuario): las recargas se quedan A LOS PIES y centradas — todo lo de un héroe
        comparte un eje por clase (`HERO_HUD_CX`: Knight 5, Ranger 3, Priest 3 px desde la raíz, medido en sus
        figuras) y cada pieza mide un número impar de píxeles (barra 27, filas de 9/17/25); la DEFINITIVA de los tres
        héroes es la tercera ficha de la fila (`ultimateChip`: lista / gastada; la moneda del Knight y su arte
        `ult_ready`/`ult_spent` desaparecen); Infusión de poder es AMARILLA en la ficha y en su signo de 16 px
        (`abil_power_infusion`, `s9b_abilities.py`). Barras enemigas: solo heridas, decidido (fuera `FOE_BARS` y la
        variante «placa»/«ninguna» de las recargas; queda `HERO_BAR_STYLE = 'notched'`).
        Sin ver: la ficha de una definitiva recién gastada del Knight en captura (solo en test); nada en Tauri.

## Combate, segunda ola — ACORDADO con el usuario el 2026-11-15 (pendiente de hacer)

Orden: (1) el reajuste de ritmo cierra su ronda 2; (2) A y B; (3) C y D; (4) se vuelve a pasar el afinador
(`scripts/tune-pacing.ts`), porque 2 y 3 cambian la fuerza del grupo y de los jefes. Los nombres son provisionales.
Descartado por el usuario: interrumpir a los jefes, combinaciones entre héroes («de momento»), recurso propio por
clase («de momento»), órdenes configurables por habilidad, tercera habilidad, segunda definitiva (las tres
definitivas se quedan como están), afijos en élites («de momento»).

- [x] **A · Habilidades que reaccionan** (un buen comportamiento por defecto para cada habilidad y definitiva, sin
      ajustes). Regla: se usa siempre que sea útil y, si está pasando algo concreto, lo aprovecha — nunca se queda
      guardada para algo que quizá no llegue. Hold the Line: cuando el grupo recibe daño; con un jefe preparando su
      golpe en área y la habilidad lista, espera a que caiga (cada 10 s). Holy Shield: al aliado que más daño está
      recibiendo, no siempre al tanque. Mend: prioriza a quien acaba de recibir un golpe fuerte. Revisar el resto
      una a una. **Cada habilidad lleva en su tooltip una línea «Cuándo se lanza»** (EN + ES).
- [x] **B · Pasivos de efecto** (cinco rangos; la cifra es por rango). Cada clase cambia cinco nodos de «+X %» por
      estos (de 20 a 15 nodos de estadística):
      - Knight (todos defensivos): fila 1 **Guardián** (se lleva un 4 % del daño dirigido a la retaguardia) ·
        Bastion 7 **Cerrar filas** (los aliados reciben 2 % menos de los golpes en área) · Bastion 9 **Amparo**
        (cuando un aliado baja del 50 %, ese aliado recibe 3 % menos de daño 6 s) · Scourge 7 **Piel curtida** (cada
        golpe BLOQUEADO reduce 1 % el daño de los siguientes, hasta 5 acumulaciones; se pierde entera al recibir 5
        golpes seguidos sin bloquear) · Scourge 9 **Aguante** (los golpes de más del 15 % de su vida se reducen 3 %).
      - Ranger (todos ofensivos): fila 1 **Primera sangre** (+6 % al primer disparo a cada enemigo) · Marksman 7
        **Cazatiradores** (+4 % a enemigos a distancia) · Marksman 9 **Perforar armadura** (ignora 4 % de la
        armadura) · Stalker 7 **Atravesar** (si un disparo mata, 10 % del daño sobrante pasa al de detrás) ·
        Stalker 9 **Ensañamiento** (+3 % a enemigos que sangran, arden o están ralentizados).
      - Priest: fila 1 **Rebosar** (la cura sobrante es escudo, hasta 1 % de la vida) · Devotion 7 **Manto** (el
        aliado con menos vida recibe 2 % menos de daño) · Devotion 9 **Reanimar** (los caídos reaparecen 6 % antes)
        · Zeal 7 **Luz hiriente** (+6 % a sus ataques y habilidades de daño) · Zeal 9 **Condena** (los enemigos
        golpeados por sus habilidades de daño reciben +2 % de daño de todo el grupo 4 s).
      - **Retribution Aura** deja de ser habilidad: pasa a pasivo de efecto en la fila 4 de la Priest. Su hueco de
        habilidad es **Purificar** (nueva): quita los efectos dañinos de un aliado y lo cura un poco.
- [x] **C · Afijos de jefe.** Jefes de etapa: ninguno en Normal, uno desde Infierno, dos en Eterno y Tormento, al
      azar. Jefes de mundo: su mecánica propia siempre, y además un afijo desde Averno y dos en Tormento. Signos
      junto al nombre en la barra superior, con tooltip. **Acorazado** (coraza = 10 % de su vida; 30 % menos de daño
      mientras la tiene; los críticos la rompen el doble de rápido; vuelve a los 15 s) · **Vampírico** (se cura 3 %
      con cada golpe que acierta sin ser bloqueado) · **Enfurecido** (+5 % de velocidad de ataque cada 5 s,
      acumulable) · **Sísmico** (golpe en área cada 6 s en vez de 10) · **Venenoso** (veneno acumulable ×5, 1 % de la
      vida por segundo cada uno; se va tras 4 s sin golpes) · **Certero** (cada 8 s un ataque al héroe con menos
      armadura — CADA JEFE con su propio efecto: un cuervo en picado, un rayo, una cuenta del rosario…) · **Herida
      mortal** (su golpe fuerte reduce 25 % la curación del tanque 8 s; ya existía).
- [x] **D · Mecánica propia de cada jefe de mundo** — *los diez mundos hechos (2026-11-15)* (pelea de 60 s: se repite 3–4 veces; suave en Normal, aprieta
      por dificultad). Madre de los Cuervos — **Bandada**: cada 15 s tres cuervos a la retaguardia; poca vida, se
      van solos a los 8 s. Señora del Muérdago — **Raíces**: cada 15 s enreda al héroe que más daño hace; no ataca
      5 s. Luna Ahogada — **Rayo en cadena**: cada 12 s cae sobre un héroe al azar y salta a los demás. Chivo
      Expiatorio — **Culpa**: marca a un héroe; 8 s recibiendo parte del daño que el grupo hace al jefe (puede ser
      dura: ajustar al verla). Abad Dorado — **Silencio dorado**: cada 20 s, 6 s con las recargas de los héroes
      detenidas. Novena Ola — **Resaca**: cada 12 s una ola daña a los tres y los arrastra atrás; no atacan hasta
      volver. Ángel Destructor — **Esporas**: el grupo acumula daño por segundo; se limpia con una cura directa. El
      Temple — **Hoja al rojo**: cada 15 s un área de fuego bajo los TRES héroes, daño poco a poco 6 s. El
      Veredicto — **Balanza**: cada 15 s iguala la vida de los tres a la del que MENOS tiene (en %; puede ser dura).
      El Deshacedor — **Espejos**: cada 10 s refleja la última habilidad del grupo: si era de daño la lanza contra
      los héroes; si era cura o buffo, se lo pone a sí mismo.
- Furia: 60 s; matar al jefe de mundo justo a los 60 s = grupo equipado al 80–90 % del nivel de la zona; con menos
  hay que aguantar unos segundos de furia (la rampa debe permitirlo). Ya pasado al reajuste de ritmo (ronda 2).

### Reajuste de ritmo — ronda 2, punto de control 2 (2026-11-15, sin commit)

- Decisiones del usuario aplicadas: llave 25 % (Normal 100 %: desviación mía, pendiente de su visto bueno), reparto
  4 · 40 · 120 · 230 · 325 h, furia a 60 s (rampa: el daño se duplica cada 2 s), oleadas por dificultad
  8 · 12 · 16 · 20 · 20, reclutas más baratos, curva de experiencia más barata.
- Estado: Normal 3,4 h e Infierno 42 h afinados; Averno 121 h afinado sin validar; **Eterno y Tormento en grueso**
  (la pasada se cortó a propósito: la segunda ola de combate obliga a re-afinar).
- Nuevo: «equipado al X % de la zona» como medida (`test/sim/probe/zoneGear.ts`, `scripts/measure-gear-percent.ts`,
  `PROBE_GEAR=1 npm run probe`); `scripts/measure-gear-gate.ts` (equipo congelado);
  `scripts/tune-pacing-apply.py` y `…-apply-walls.py` escriben las tablas del afinador.
- Pendiente para la pasada final (tras la segunda ola): pasada completa del afinador, validación con ocho partidas,
  mascotas, curva de equipo viejo y su test ligero, poner al día DIFFICULTY §6b–§8 y el informe entero.
  Decisiones abiertas del usuario: `docs/redesign/PACING_REPORT.md`, R.9.

### Combate, segunda ola — A y B hechos (2026-11-15, sin commit)

- **A · Cuándo se lanza cada habilidad.** Regla por habilidad en datos (`fires` en `data/abilities.ts` y
  `data/branchAbilities.ts`; tipos `FireRule`), evaluada en `sim/abilities.ts` (`fireRuleMet`). Lo que hace falta
  saber del combate (quién acaba de recibir daño, cuánto, si fue un golpe fuerte) lo lleva `sim/recent.ts`:
  2,5 s de memoria, golpe fuerte = 15 % de la vida de una vez. Objetivos nuevos: el enemigo más duro a su alcance,
  el aliado que más daño recibe, el aliado más castigado, el aliado con más efectos dañinos.
  - Knight — Piel de piedra y Baluarte: cuando él está recibiendo daño. Tajo debilitante: con 2 enemigos a su
    alcance, o un élite o jefe, o cuando ya no vienen más. Grito de batalla y Sed de sangre: con 3 enemigos en pie,
    o un élite o jefe. Mantener la línea: cuando el grupo recibe daño; con un jefe que tiene golpe en área, espera
    a que lo prepare. Réplica: a sus 4 cargas.
  - Ranger — Fuego rápido, Lluvia de flechas, Abrojos y Frasco de brea: con 3 enemigos en pie, o un élite o jefe.
    Disparo certero (10 cargas) y Punto débil: al enemigo más duro a su alcance. Flecha explosiva: cuando la
    explosión alcanza a 2, o sobre un élite o jefe.
  - Priest — Sanar: aliado bajo el 70 % o que acaba de recibir un golpe fuerte (ese primero). Escudo sagrado: al
    aliado que más daño está recibiendo. Infusión de poder y Nova sagrada: con 3 enemigos en pie, o un élite o jefe.
    Santuario: 2 aliados bajo el 80 %, o uno bajo el 50 %. Castigo: aliado bajo el 85 %. Purificar: aliado con un
    efecto dañino, o bajo el 60 %.
  - Definitivas: sin cambios (golpe mortal; entrar en combate con un jefe, también élites con su remate).
  - Tooltip: línea «Cuándo se lanza» / «When it fires» en el ala de talentos y en la fila de habilidades de la
    ventana del héroe, definitiva incluida (`sim/abilityFacts.ts` da el hecho, `talentWords.ts` lo escribe).
- **B · Pasivos de efecto.** Modelo en `data/talentSpec.ts` (`PassiveEffect`, constructor `effect()`: nodo de tipo
  pasivo con comportamiento, mismo marco y mismo sitio que el de estadística, así el ala no cambia de tamaño);
  comportamiento en `sim/passives.ts`; condiciones nuevas de daño en `sim/liveStats.ts`. Nodo de estadística que
  cede el sitio: Knight — Guardián (armadura de la fila 1), Cerrar filas (armadura de Bastion 7), Amparo (vida de
  Bastion 9), Piel curtida (vida de Scourge 7), Aguante (reducción de daño de Scourge 9). Ranger — Primera sangre
  (velocidad de ataque de la fila 1), Cazatiradores (daño de ataque de Marksman 7), Perforar armadura (crítico de
  Marksman 9), Atravesar (daño de ataque de Stalker 7), Ensañamiento (reducción de recarga de Stalker 9). Priest —
  Rebosar (vida de la fila 1), Manto (resistencia mágica de Devotion 7), Reanimar (reducción de recarga de
  Devotion 9), Luz hiriente (vida de Zeal 7), Condena (poder de curación de Zeal 9).
  - Decisiones mías, a revisar: Guardián solo mueve los golpes APUNTADOS a la retaguardia (no la salpicadura de
    un golpe en área) y el Knight los recibe con sus propias defensas; Cerrar filas y Amparo valen para los demás,
    no para él; Manto vale para el héroe con menos vida, ella incluida; Reanimar cuenta aunque ella esté caída;
    Rebosar recoge las curas de habilidad y las progresivas (no el robo de vida ni la regeneración) y el escudo
    dura 8 s; Perforar armadura actúa sobre la coraza del afijo Acorazado (los enemigos no tienen otra armadura).
  - **Retribution Aura** es un pasivo de la fila 4 (misma clave, 3 % por rango: 15 % al máximo como antes, 3 % en
    vez de 5 % a rango 1); ocupa el sitio de la resistencia mágica de esa fila, junto a Custodia sagrada, y conserva
    su sello bajo ella y la estela bajo los aliados.
  - **Purificar** (`priest_purify`, 16 s): quita todos los efectos dañinos y cura 6 %→10 % de la vida. Efecto
    nuevo `cleanse`. Aspecto: reutiliza el destello de la Nova más la flor de cura (provisional). Signo y signo
    mini nuevos (`abil_purify`, `hud_s_m_purify`).
  - Partidas guardadas: los puntos de un nodo que cedió el sitio pasan al pasivo que está ahora ahí
    (`REPLACED_NODES` en `data/talents.ts`), así no se cierra ninguna fila; lo que no cabe se devuelve.
- Signos de los quince pasivos: provisionales, prestados de las estadísticas (`ui/abilityArt.ts`).
- Ritmo: los tests fijados siguen en verde sin tocarlos; la política de talentos de la sonda compra los nodos
  nuevos sin cambios. La pasada del afinador sigue pendiente (tras C y D).
- Capturas: `tools/assets/out/preview/wave2_*.png` (tres clases, ES y EN, 1512×918 ×2 y 1280×656 ×1, dos tooltips).

### Decisiones del usuario tras el segundo punto de control del balance (2026-11-15, noche) — para la pasada final
- **Llave**: la primera vez que se supera la etapa 9 de un mundo se recibe UNA llave garantizada; después, 25 % de
  los cofres de jefe de etapa (25 % de cofre). En todas las dificultades, sin el 100 % especial de Normal.
- **«Equipado al 100 % de la zona»** = todas las casillas con una pieza del nivel de ese mundo, de la rareza más
  habitual allí (sin depender de la suerte). Los muros se afinan para pedir un 80–90 % de eso (matar a los 60 s).
- **Oleadas por etapa**: Normal 16 · Infierno 17 · Averno 18 · Eterno 19 · Tormento 20. **Normal sigue en 3–4 h**:
  «lo de los 2-3 golpes era una estimación… el agente tendrá que balancear Normal como sea».
- **Botín en Normal**: no se toca (solo las 16 oleadas; «si le toca el cofre de zona, enhorabuena»).
- **Furia**: 60 s y el daño se dobla cada 2 s (como está).
- **Perforar armadura → Hemorragia** (los críticos del Ranger dejan un sangrado del 4 %/rango de ese daño, 3 s).
- Purificar limpia todo, también efectos de jefe (Raíces). Guardián solo desvía golpes DIRIGIDOS a la retaguardia.
- **Enemigos (acordado, por hacer)**: capa 1 — cada tipo gana algo por dificultad, CON sus efectos visuales
  (Bestia: Manada / Rabia · Soldado: Guardia / Formación / Último aliento · Tirador: Tiro cargado / Fuego
  concentrado · Bruto: Imparable / Temblor); capa 2 — un cuarto tipo por mundo, **Apoyo**, con figura nueva; las
  habilidades de un solo objetivo priorizan Apoyo → Tirador → Bestia → Bruto «o algo así, como Aimed Shot».

### Combate, segunda ola — C hecho y D en los mundos 1–3 (2026-11-15, sin commit)

- **El kit de jefe.** Un jefe es su golpe en área + afijos + (jefes de mundo) su mecánica. Todos los números en
  `src/data/bossKit.ts`; las reglas en `src/sim/bossMechanics.ts`; las habilidades y efectos nuevos en
  `data/bossAbilities.ts` y `data/bossEffects.ts`. Al aparecer, el jefe recibe `affixes`, `mechanic` y `bossRank`
  (`sim/stages.ts`). Los afijos de una etapa salen de la semilla de la partida y del número de etapa, con un
  generador aparte: no mueven el azar del combate ni del botín, y la misma etapa lleva siempre los mismos.
  Reparto: etapa 0·1·1·2·2, mundo 0·0·1·1·2 (Normal → Tormento).
- **C · Los siete afijos** (con su signo junto al nombre en la barra y tooltip en inglés y español; signos en
  `tools/assets/pipeline/icon_sets/s9g_affixes.py`, textos en `src/i18n/*/boss.ts`, lógica en `ui/hud/bossMarks.ts`):
  - **Acorazado** — coraza del 10 % de su vida; mientras aguanta recibe 30 % menos; un crítico la gasta el doble;
    vuelve a los 15 s de romperse. Se ve: placas de acero sobre el jefe, que se cierran y estallan.
  - **Vampírico** — se cura con cada golpe no bloqueado: 3 % un jefe de etapa, **0,4 % un jefe de mundo**
    (desviación mía: con 3 % un muro de 60 s se cura más de lo que el grupo le hace). Se ve: hilos de sangre que
    suben por el jefe y la cifra de lo que recupera.
  - **Enfurecido** — +5 % de velocidad de ataque cada 5 s de pelea, hasta 12 veces (antes era una ráfaga del 50 %
    con lanzamiento; ya no se lanza). Se ve: el fuego rojo a sus pies.
  - **Sísmico** — su golpe en área cada 6 s en vez de 10. Sin efecto propio: se nota en el aviso del suelo.
  - **Venenoso** — cada golpe deja una acumulación (1 % de la vida del héroe por segundo, hasta 5; se va a los 4 s
    sin golpes). Se limpia con Purificar. Se ve: burbujas verdes sobre el héroe y su ficha.
  - **Certero** — cada 8 s (el primero a los 3,5 s) un ataque al héroe con menos armadura, del 80 % de su golpe.
    Una sola regla y una forma por jefe (`render/bossFx.ts` `DEADEYE_SHOT`): Madre de los Cuervos, un cuervo en
    picado; Señora del Muérdago y Guardián Astado, una espina; Luna Ahogada, una hoz de luz; Rey de la Cosecha, su
    hoz; Barquero, un fuego fatuo; el resto, un virote rojo por defecto. Con una mira que se cierra sobre el héroe.
  - **Herida mortal** — el golpe que ya existía, ahora afijo (150 % de su golpe, antes 250 %: ahora lo llevan
    también jefes de etapa desde Infierno). Se limpia con Purificar.
- **D · Mecánicas de los mundos 1–3** (cada una con barra de lanzamiento de 1,5 s y una señal propia):
  - **Bandada** (Madre de los Cuervos) — cada 15 s (la primera a los 7 s): 2 cuervos en Normal, 3 de Infierno a
    Eterno, 4 en Tormento. Vuelan a la retaguardia, picotean solo a los de atrás (35 % → 80 % del golpe de un
    enemigo común), tienen el 60 % de la vida de un enemigo común y se van solos a los 8 s. Los de atrás los
    derriban; el héroe de delante no los alcanza. No dan botín ni cuentan como muertes; si ella cae, caen con ella.
  - **Raíces** (Señora del Muérdago) — cada 18 s en Normal, 15 s de Infierno a Eterno, 12 s en Tormento (la primera
    a los 8 s): enreda 5 s al héroe que más daño le ha hecho; ni ataca ni lanza. Purificar lo libera (decisión del
    usuario). Señal: el suelo se abre bajo ese héroe.
  - **Rayo en cadena** (Luna Ahogada) — cada 12 s (el primero a los 7 s): cae sobre un héroe al azar (80 % → 130 %
    de su golpe, mágico) y salta a los demás (40 % → 65 % de eso). Señal: chispas sobre los tres héroes.
- **Cómo entran las otras siete mecánicas**: una línea en `WORLD_BOSS_MECHANIC` (figura → mecánica), sus números
  por dificultad en `MECHANIC` y `mechanicAbility`, una habilidad en `data/bossAbilities.ts`; si hace algo que no
  es un efecto, un caso en `AbilitySpecial` / `resolveSpecial` (hoy: invocar) o un tipo de efecto nuevo (hoy:
  `disarm`, `shell`); y su aspecto en `render/bossFx.ts` (señal, lanzamiento, impactos) con el arte en
  `tools/assets/pipeline/fx/boss.py`.
- Piezas nuevas reutilizables: objetivos `randomEnemy`, `softestEnemy`, `topDamageEnemy`; habilidad de jefe mágica
  aunque el jefe pegue con acero (`magic`); invocaciones como enemigos de verdad (`Combatant.summon`) dibujadas con
  una figura hecha de efectos (`render/summonFigures.ts`); señales mientras dura un lanzamiento (`render/CueLayer`).
- Un héroe enredado ya no reproduce su ataque en la tira (se veía disparar sin disparar).
- Ritmo: nada reajustado. Los tests fijados (anclas, sonda, progresión) siguen en verde sin tocarlos. Sonda con
  una semilla: Normal 3,9 h (objetivo 4), Infierno 35 h (objetivo 40). `docs/DIFFICULTY.md` §5 lleva la nota del
  cambio. La pasada del afinador sigue pendiente.
- Pendiente de este bloque: mundos 4–10 (Culpa, Silencio dorado, Resaca, Esporas, Hoja al rojo, Balanza, Espejos);
  sonido; el nombre «Enfurecido» coincide en español con el texto de la furia del reloj (`hud.enraged`).
- Capturas: `tools/assets/out/preview/bosskit_*.png` (1512×918 ×2 y 1280×656 ×1). En las capturas el jefe tenía la
  vida multiplicada y los héroes no podían caer, para poder ver cada mecánica.

### Enemigos — ACORDADO con el usuario el 2026-11-15 (por hacer)
- **Enemigos apilados**: al DIBUJARLOS se separan unos píxeles en horizontal y en dos filas de profundidad (solo
  presentación). Norma: nada permanente sobre un enemigo normal (un estado = teñir su cuerpo o una marca mínima
  junto a su barra); los efectos son destellos breves cuando pasa algo.
- **Rasgos por dificultad** (Formación y Manada descartadas): Bestia — **Rabia** (bajo media vida ataca mucho más
  rápido; se tiñe de rojo) desde Infierno. Soldado — **Guardia** (para el primer golpe; una chispa) desde Infierno,
  **Último aliento** (al morir enardece a los suyos; un destello) desde Averno. Tirador — apunta atrás (existe),
  **Tiro cargado** (cada cuarto disparo pega el doble; flecha encendida) desde Averno, **Fuego concentrado** (todos
  al mismo héroe; una mira sobre él) en Eterno y Tormento. Bruto — área (existe), **Imparable** (no se le
  ralentiza) desde Averno, **Temblor** (su área ralentiza un momento a los héroes; grietas) en Eterno y Tormento.
- **Apoyo** (cuarto tipo, figura nueva por mundo): frágil, detrás del grupo, apenas ataca. NO lanza habilidades
  («no van a durar tanto»): mientras vive, TODA su oleada tiene sus **auras**; al morir se acaban. Auras al azar
  (deterministas por semilla), apiladas por dificultad: Normal 1, Infierno 2, Averno 3, Eterno 4, Tormento 5.
  Tipos: Aguante (−20 % daño recibido), Furia (+20 % velocidad de ataque), Vigor (regeneran), Égida (entran con
  escudo), y los que hagan falta para llegar a cinco o seis. En Normal aparece desde el mundo 3. Solo el Apoyo
  lleva la señal (un signo pequeño por aura sobre su cabeza) y un destello por la oleada cuando cae.
- **Prioridad de objetivos**: el Ranger (disparos normales, Aimed Shot, Weak Spot, Explosive Arrow) y la Priest
  (Smite y su ataque) eligen Apoyo → Tirador → Bestia → Soldado → Bruto; un élite por delante de los normales de
  su tipo; contra un jefe, al jefe. El Knight no cambia. Para que sirva, **se separa «dónde se coloca» de «hasta
  dónde llega su disparo»**: el Ranger se planta donde hoy y solo su tiro llega más lejos.

### Combate, segunda ola — A y B, segunda pasada (2026-11-15, sin commit)

- Lecturas confirmadas por el usuario: Guardián solo mueve los golpes APUNTADOS a la retaguardia; Purificar quita
  todo, también los efectos de jefe (Raíces).
- **Signos propios** para los quince pasivos de efecto (`tools/assets/pipeline/icon_sets/s9h_passives.py`,
  `tal_e_*`) y **marco propio**: el sello de cuatro puntas del talento de rol, al tamaño de una pasiva (22 px,
  `tal_effect_*`; tipo `effect` en `ui/kit/Node.tsx`). A 24 px el ala pasaba de su altura máxima (317 > 314).
  Retribution Aura conserva su signo de siempre sobre el sello de rol. Provisionales.
- **Hemorragia** sustituye a Perforar armadura (elección del usuario): los críticos de la Ranger dejan además un
  sangrado del 4 % de ese daño por rango durante 3 s (`ranger_hemorrhage`, efecto `fx_hemorrhage`,
  `sim/passives.critBleed`). Críticos repetidos: el tiempo vuelve a empezar con lo mayor entre lo que deja el
  nuevo golpe y lo que le quedaba por hacer al sangrado anterior; no se apilan. Cuenta como sangrado para
  Ensañamiento y lleva el aspecto y el chip del sangrado. La devolución sobre la coraza de Acorazado está quitada.
  Los puntos de `ranger_pierce_armor` y del nodo de crítico original pasan a Hemorragia (`REPLACED_NODES`).
- **«Recibir daño» cuenta lo que le cae al héroe, no lo que atraviesa el escudo** (`sim/recent.ts`): visto en el
  juego, el escudo de Rebosar se tragaba los flechazos y Escudo sagrado dejaba de lanzarse.
- Franja: chip de **Amparo** sobre el aliado cubierto y chip de las acumulaciones de **Piel curtida** (se aclara
  con cada una, marco dorado a las cinco, desaparece al perderlas); la cuenta de reaparición empieza vacía con
  Reanimar (`respawnTotalMs`).
- Visto en el juego real (etapa 4-6, grupo a nivel 120 sin equipo; daño y vida de los enemigos forzados para que
  el combate dure): Guardián (25,3 a la Ranger, 6,3 al Knight en el mismo instante), Piel curtida (0→5 y a 0 al
  quinto golpe sin bloquear), Atravesar (50 % del daño sobrante al de detrás), Rebosar (escudo hasta el 5 %),
  Reanimar (42 s en vez de 60), Purificar (quita Herida mortal y cura), Mantener la línea (4 s recibiendo golpes
  sin lanzarse; salta a los 0,5 s de empezar el Golpe de tierra), Escudo sagrado (sobre la Ranger bajo flechas).
  Capturas: `tools/assets/out/preview/wave2_live_*.png`, hoja de signos `wave2_passive_signs.png`, alas
  `wave2_wings_es_x2.png` y `wave2_wings_es_x1.png`.
- **Pasivos de guardia sobre el daño de jefes** (hecho, `test/sim/guardPaths.test.ts`): los afijos y mecánicas de
  jefe hacen su daño por los mismos tres caminos (golpe básico, habilidad, daño en el tiempo), así que cada pasivo
  sigue su regla. Guardián: se lleva su parte de lo APUNTADO a un héroe de detrás (el disparo de Certero, los
  picotazos de los cuervos), nada de un golpe en área. Cerrar filas: el Rayo en cadena entero (el rayo y sus
  saltos) cuenta como golpe en área. Amparo, Manto, Aguante, Piel curtida e Inquebrantable valen en cualquier
  golpe. **Daño en el tiempo sobre un héroe (veneno)**: no es un golpe — ni armadura, ni bloqueo, ni Guardián, ni
  Cerrar filas, ni Aguante —, pero «recibe X % menos de daño» sí cuenta: la reducción de daño (Vanguardia, Piel
  de piedra, Mantener la línea, Inquebrantable, Amparo, Piel curtida; con su tope) y Manto. Todo ello cuenta como
  «estar recibiendo daño» para las habilidades que reaccionan.

### Decisiones del usuario (2026-11-15, noche) — jefes y enemigos, ronda de preguntas con opciones

- **Vampírico**: solo en jefes de etapa; nunca en jefes de mundo.
- **Herida mortal**: 150 % del golpe en jefes de etapa, 250 % en jefes de mundo.
- **Afijo de velocidad**: se llama **Frenético** (EN «Frenzied»); «Enfurecido» queda solo para la furia de los 60 s.
- **Sísmico**: temblor leve y constante a los pies del jefe (polvo y piedrecitas).
- **Cuervos de Bandada**: sí cuentan como bajas para los talentos de «al matar» (como estaba).
- **Rayo en cadena**: todo cuenta como golpe en área (como estaba).
- **Mecánicas de los mundos 4–10**: «Construye ya las siete» (en dos puntos de control: 4–6 y 7–10).
- **Bestia**: segundo rasgo **Embestida** desde Averno — el primer golpe al llegar pega ×2.
- **Flecha explosiva**: al montón más grande, sin seguir la prioridad Apoyo → Tirador → …
- **Fuego concentrado**: versión suave (35 %), como estaba.
- **Auras del Apoyo y rasgos**: se explican en el mapa, en el tooltip de cada dificultad.
- **Temblor**: efecto visible en la fila del héroe, pero Purificar no lo gasta.
- **Apoyos de los mundos 4 y 7**: rechazados («algo cutres, especialmente la del 4») → se rehacen desde cero
  (heraldo del cañón con cuerno de carnero; pescador de luz con silueta de pez abisal). Los otros ocho no se objetaron.
- **Culpa**: medida por % de vida del jefe, 1,5 % en Normal y +0,25 por dificultad (1,5 / 1,75 / 2 / 2,25 / 2,5 %);
  marca al azar entre los tres.
- **Resaca**: arrastre como está y además corta el lanzamiento en curso del héroe al que pille.
- **Silencio dorado**: 6 s en todas las dificultades.
- **Confirmado por el usuario (15 nov, noche)**: los Apoyos rehechos de los mundos 4 y 7 («ok»), la separación de
  enemigos al dibujarse y el tooltip de dificultad del mapa completo, como está («perfecto»).
- **Pasada final de ritmo**: NO empezarla por cuenta propia. Cuando todo lo demás esté terminado, avisar al usuario
  y esperar su visto bueno («avísame, no la empieces solo», 15 nov).
- **Búho acompañante**: un 30 % más grande (unos 20 px); detrás del último héroe, posándose a los 5 s y pardo, como
  estaba. Siguientes mascotas: Coin Sprite y Lucky Cat (punto de control 2), luego las otras tres.
- **Resaca**: el corte vale como está (reinicia el golpe o la habilidad que preparaba; la recarga no se gasta).
- **Hoja al rojo**: suelo que arde, Purificar no lo quita (como está).
- **Espejos**: el jefe usa también el daño de ataque de las mejoras que copia; crítico y bloqueo siguen sin servirle.
- **Esporas**: solo las quita una cura instantánea o Purificar (como está).
- **Mecánicas de los mundos 4–10: CONFIRMADAS** («Confirmado todo», 15 nov). Único cambio: Espejos es «demasiado
  forgiving» para el mundo 10 → se le añaden dos efectos: **Los seis espejos** (cada copia enciende un panel, cada
  panel le da más daño, con los seis los rompe en un golpe en área) y **Tu reflejo te ataca** (un reflejo oscuro del
  héroe copiado ataca a la retaguardia 8 s o hasta que lo matan).

- **Mascotas (15 nov, noche)**: Búho, Duende de la moneda y Gato de la suerte CONFIRMADOS; el gesto de subida de nivel
  lo hacen todas; la sombra se queda solo en las mascotas; la cadencia de gestos en reposo, como está. Siguen la
  Mula de carga, el Diablillo del tiempo y el Acaparador.
- **Las seis mascotas CONFIRMADAS (15 nov, noche)**: Mula de carga, Diablillo del tiempo y Acaparador valen como
  están (el Acaparador «anda el cofre»; la Mula siempre de pie salvo en la derrota — así leí su «sí» a las dos
  preguntas de «¿así o…?»). Por mirar: el Diablillo sobre los mundos violetas (9 y 10).
- **Mascotas**: «todo se queda como está» (Acaparador sobre su cofre, Mula de pie) — confirmado.
- **Deshacedor (16 nov, madrugada)**: Espejos cada 8 s (la rotura cae hacia el segundo 49); el reflejo pega
  80 / 95 / 110 / 125 / 140 % del golpe de un enemigo normal; el reflejo se planta a media distancia entre el tanque y
  la retaguardia.
- **CONFIRMADO (16 nov)**: los paneles, la rotura y el reflejo del Deshacedor se entienden («sí»), y las veinte formas
  de Certero valen («sí»).

### Decisiones del usuario tras la auditoría de la sonda (16 nov) — la sanadora tiene que ser imprescindible

- Estudio (PACING_REPORT «Ronda 3 · punto de control 1»): una construcción de daño valía para casi todos los muros y la
  Priest iba con Infusión de poder + Castigo. Usuario: «Si puedo ir con el priest como si fuera otro dps, el balance
  está MAL». Hay que subir su poder curativo y darle respuesta a todas las mecánicas.
- **Huecos**: siguen siendo 2 habilidades activas por héroe.
- **Infusión de poder** sale del kit de habilidades → talento pasivo de la rama Celo.
  Diseño del usuario: cada vez que la Priest cura con una instantánea o APLICA una progresiva, los aliados (ella
  incluida si se cura) reciben 4 s de +15 % de velocidad de ataque y +15 % de recarga (se renueva, no se acumula).
  **Solo los aliados curados** (usuario, 16 nov).
- **Purificar** desaparece como habilidad y se funde en las curas: limpian las instantáneas (directa, en grupo, Castigo)
  al lanzarse y las progresivas (Sanar, Santuario) al aplicarse. **Quitan TODOS los efectos dañinos**, solo de los
  aliados a los que curan (usuario, 16 nov).
- **Dos curas nuevas en el tronco**: cura directa instantánea y cura en grupo instantánea, con un valor menor que su
  progresiva («si las over time son 30 %, las instantáneas 20–25 %; si la grupal over time es 20, la aoe instant 15»).
  Las curas suben en general.
- **Objetivo**: desde Infierno, un grupo con la Priest sin curas no pasa los muros aunque vaya muy equipado.
- **Jefes de mundo**: más fuertes durante el minuto (más área, más disparos a la retaguardia).
- **Jugador medio de la pasada final**: construcción por defecto en Normal e Infierno, la buena desde Averno.
- **Mascotas**: la pasada mide sin ellas.
- **Vía libre para la pasada final (16 nov, noche)**: el usuario se va a dormir y pide un juego equilibrado por la
  mañana. Puedo tocar números y también diseño, apuntando aparte cada cambio que no sea un número. Commit en cada
  punto de control, sin push. Si los objetivos chocan, **mandan las reglas de juego** (construcción, sanadora,
  exigencia de equipo) y las horas se cuadran con la vida de muros y enemigos.

> El backlog vive en `docs/redesign/BACKLOG.md`.

### Enemigos — HECHO (2026-11-15, sin commit): separados al dibujarse, rasgos, Apoyo, prioridad y alcance

Lo acordado arriba («Enemigos — ACORDADO»), en cuatro partes. Comprobaciones al cerrar: `tsc`, lint y 97 archivos
/ 858 pruebas en verde.

- **1 · Enemigos separados al dibujarse** (solo presentación; el simulador no cambia): `game/render/crowdLayout.ts`
  (puro, `test/game/crowdLayout.test.ts`). Los que comparten sitio (a 8 px o menos) se abren hacia atrás a 9 px
  (72 px como mucho por pila) y en dos filas: la de atrás 3 px más alta y dibujada detrás. El sitio es estable
  por enemigo (ordenados por id; al morir uno, los demás se deslizan a 45 px/s). Élites y Apoyo, delante. Jefes e
  invocaciones, intactos. Barras, impactos y proyectiles siguen la posición dibujada (`GameStrip.reconcileEnemies`,
  `EnemySprite.setCrowd`).
- **2 · Cuatro tipos y sus rasgos** (`data/enemies.ts`, `sim/enemyTraits.ts`, `test/sim/enemyTraits.test.ts`):
  - Tipos reales y con figura fija (`render/foeFx.ROLE_FIGURE`): **Bestia** = la bestia del mundo (nueva en el
    simulador: vida ×0,75, daño ×0,8, ataca ×1,3 más rápido, camina ×1,4; peso 2), **Soldado** = el cuerpo a
    cuerpo (peso 3, antes 5), **Tirador** = el de distancia, **Bruto** = el cuerpo a cuerpo dibujado ×1,15 (un
    bruto élite lleva los dos tamaños; su paso ya era ×0,8). Antes la figura de un cuerpo a cuerpo se echaba a
    suertes por su id. La vida total de una oleada baja un 6 % y su daño sube un 1 %.
  - Rasgos ACUMULADOS por dificultad (`ROLE_TRAITS`, números en `TRAIT_TUNING`): Bestia — Rabia desde Infierno
    (bajo el 50 % de vida, +40 % velocidad de ataque; cuerpo teñido de rojo). Soldado — Guardia desde Infierno
    (para entero el primer golpe directo; un sangrado no lo gasta; chispa), Último aliento desde Averno (al morir,
    el resto de la oleada +25 % velocidad de ataque 3 s; un estallido a sus pies). Tirador — Tiro cargado desde
    Averno (uno de cada cuatro disparos básicos pega ×2; la flecha vuela encendida), Fuego concentrado en Eterno y
    Tormento (los disparos por encima del tanque van TODOS al mismo héroe y pasan a ser el 35 % en vez del 25 %;
    UNA mira sobre ese héroe). Bruto — Imparable desde Averno (las ralentizaciones no le hacen nada), Temblor en
    Eterno y Tormento (su golpe pasa a ser `enemy_smash_tremor`: los héroes alcanzados atacan un 20 % más lento
    2,5 s; el suelo se agrieta bajo ellos).
  - Nada de esto es un efecto: son marcas del combatiente (`traits`, `guardUp`, `rousedMs`, `shaken`…), así que
    no hay chips, ni aspecto permanente, ni nada que Purificar persiga. Los destellos viajan como evento `cue`.
    Arte: `tools/assets/pipeline/fx/foes.py` (`foe_guard`, `foe_last_breath`, `foe_arrow_lit(_arc)`, `foe_reticle`,
    `tremor_crack`), datos de la franja en `render/foeFx.ts` (`test/game/foeFx.test.ts`).
- **3 · El Apoyo** (`SUPPORT_KIND`, `supportAuras`): un enemigo más en una de cada tres oleadas (nunca dos), desde
  la etapa 21 (mundo 3 de Normal). Vida ×0,6, daño ×0,3, ataca ×0,6; se queda a 225 px del tanque (los tiradores
  a 170) y no lanza nada. Qué oleadas y qué auras salen de un generador propio sembrado con (partida, etapa,
  oleada): el del combate no se toca. Auras distintas según dificultad: 1 / 2 / 3 / 4 / 5.

  | Aura | Qué hace | Normal | Infierno | Averno | Eterno | Tormento |
  |---|---|---|---|---|---|---|
  | Aguante | la oleada recibe menos daño | 20 % | 20 % | 20 % | 25 % | 25 % |
  | Furia | ataca más rápido | 20 % | 20 % | 20 % | 25 % | 25 % |
  | Vigor | regenera vida por segundo | 2 % | 2 % | 2,5 % | 3 % | 3 % |
  | Égida | cada enemigo entra con un escudo (de su vida) | 15 % | 15 % | 20 % | 20 % | 25 % |
  | Saña | hace más daño | 15 % | 15 % | 15 % | 20 % | 20 % |

  Mientras vive, toda su oleada (él incluido) las lleva; al morir se acaban en ese mismo tick (el escudo también).
  Se ve SOLO en él: un signo de 9 px por aura en fila sobre su cabeza (`aura_*`), y al caer un destello sobre cada
  enemigo (`support_down`). Figura: `WorldDef.support` es opcional; mientras un mundo no tenga la suya exportada,
  es el de distancia de ese mundo teñido de violeta frío. No existe bestiario en el panel del mapa: los nombres de
  las auras (Aguante, Furia, Vigor, Égida, Saña) aún no se leen en ningún sitio del juego.
- **4 · Prioridad y alcance** (`sim/targeting.ts`, `test/sim/targeting.test.ts`): Ranger y Priest eligen Apoyo →
  Tirador → Bestia → Soldado → Bruto, un élite antes que los normales de su tipo; con jefe, el jefe (y antes lo que
  haya invocado sobre el grupo). Vale para sus ataques básicos, Aimed Shot, Weak Spot, Explosive Arrow y el golpe
  de Smite (objetivo `priorityEnemy`, que sustituye a `toughestEnemy`; textos EN + ES). El Knight no cambia.
  **Dónde se coloca** sigue siendo `range` (160 la Ranger, 195 la Priest) y es también lo que dice «el combate ha
  llegado a ella»; **hasta dónde llega el disparo** es `shotReach` de la clase (340 y 375: el Apoyo queda a 330 y
  365). Prueba: la misma oleada con y sin `shotReach` deja a los tres héroes y a los enemigos en las mismas x.
  Explosive Arrow: su condición de grupo se mide alrededor de su objetivo prioritario, y un Apoyo vale la flecha
  por sí solo.
- **Ritmo**: no se ha reajustado nada. `test/sim/anchors.test.ts` y las pruebas de la sonda pasan sin tocar
  referencias. `PROBE_SEEDS=1 PROBE_STOP=200 npm run probe` termina: Normal 3,5 h; Infierno 35,5 h (39 h en
  total), con el mundo 20 en 14,1 h y 10 intentos. Una sola semilla y sin medida previa con la que comparar.
- **Capturas** (`tools/assets/out/preview/`): `foes_fanout.png` (pila con élite, mundos 1, 2 y 10 a ×2 y ×1),
  `foes_support.png` (Apoyo en Normal y Tormento, mira de Fuego concentrado, flecha encendida),
  `foes_traits_a.png`, `foes_traits_b.png`, `foes_flashes.png`, `foes_fx_sheet.png`. En las capturas los enemigos
  tenían la vida forzada y los héroes no podían caer.
- **Flojo o sin ver**: la chispa de Guardia no ha salido limpia en ninguna captura (dura 0,2 s); el estallido de
  Último aliento se ve pequeño; el Apoyo teñido se distingue poco del tirador en mundos oscuros hasta que tenga
  figura; el ×1,15 del bruto deja píxeles desiguales, como el élite.

### Enemigos — ronda 2 (2026-11-15, sin commit): cinco decisiones del usuario

Al cerrar: `tsc` y lint limpios, 100 archivos / 892 pruebas en verde. Sin exportar arte (el `export-fx` era de
otro trabajo): lo que pedía signo nuevo reutiliza uno existente y queda apuntado como pendiente.

- **Embestida** (Bestia, desde Averno; también Eterno y Tormento): el primer golpe básico de cada bestia pega ×2
  (`TRAIT_TUNING.charge`, marca `chargeUp`, `sim/enemyTraits.heavyHit`). En la franja, un estallido breve sobre el
  héroe que lo recibe: reutiliza `foe_hit` (PENDIENTE un estallido propio).
- **Flecha explosiva**: objetivo nuevo `biggestCluster` (`sim/targeting.biggestCluster`): el enemigo a su alcance
  de disparo cuya explosión pilla a más enemigos; a igualdad, un élite o jefe y luego el más cercano. Ya no sigue
  la prioridad Apoyo → Tirador → …; su condición «grupo» se mide en ese mismo punto y el Apoyo ya no la dispara
  por sí solo. Textos de objetivo y descripción en EN y ES.
- **Fuego concentrado**: sin cambios (35 %).
- **Rasgos y auras explicados en el mapa**: el tooltip de cada dificultad dice qué rasgos tiene cada tipo allí
  (una frase por rasgo con sus números) y cuántas auras lleva el Apoyo, con el signo y una línea por aura con su
  valor en esa dificultad (`sim/foeFacts.ts` da los hechos, `ui/panels/map/foeWords.ts` los redacta,
  `MapFoes.tsx` los pinta). Los signos de aura salen del atlas de efectos de la franja (PENDIENTE: signos propios
  en el juego de la interfaz). El tooltip mide 268 px de arte de ancho y, en Tormento, 276 de alto: entra entero en
  las cuatro pantallas objetivo, pero al pasar el ratón tapa el riel del HUD y parte de la franja (acaba en
  565/720, 770/1080, 1130/1440 y 750/982 px).
- **Temblor es un efecto visible** (`debuff_tremor`: −20 % velocidad de ataque 2,5 s; sustituye a la marca
  `shaken`): chip de perjuicio sobre el héroe con el signo del grillete (`slow`; PENDIENTE signo propio) y
  **tooltip al pasar el ratón**. Purificar lo ignora del todo (`cleanseIgnores` en el efecto): ni se lanza por él,
  ni elige a quien lo lleva, ni lo quita. El tooltip es nuevo para TODOS los chips de efecto de los héroes: la
  franja dice sobre qué chip está el puntero (`stripHud.chipIndexAt`, `HeroHud.effectChipAt`, estado `stripTip`) y
  `ui/overlay/StripEffectTip.tsx` lo redacta con el kit; hoy solo Temblor tiene frase propia, el resto muestra su
  nombre.
- **Apoyo con figura propia**: comprobado en un mundo claro (Infierno 1-5) y dos oscuros (Tormento 3-5, Infierno
  10-5 a ×1): se dibuja con la figura de su mundo, sin tinte, con los signos centrados sobre ella; el tirador
  teñido queda solo como reserva si un mundo no tuviera figura exportada.
- **Capturas** (`tools/assets/out/preview/`): `foes2_strip.png` (Apoyo en tres mundos, chip y tooltip de Temblor,
  Embestida), `foes2_map_torment_es_1280x720.png`, `…_1920x1080.png`, `…_2560x1440.png`, `…_1512x982.png`,
  `foes2_map_inferno_en_1280x720.png`, `foes2_map_tooltip_zoom.png`.
- **Flojo o sin ver**: el estallido de Embestida no se distingue en la captura; el tooltip de los chips no se ha
  probado en la app empaquetada (depende de que el lienzo reciba el puntero con la ventana transparente); sobre un
  Apoyo de figura alta los signos quedan bastante por encima de la cabeza.

### Jefes, ronda 3 — punto de control 1: correcciones de afijos y mecánicas de los mundos 4–6 (2026-11-15, sin commit)

- **Afijos (decisiones del usuario)**:
  - **Vampírico** solo sale en jefes de etapa (`AFFIX_POOL` en `data/bossKit.ts`); un jefe de mundo elige entre
    los otros seis. Fuera el caso del 0,4 %.
  - **Herida mortal**: 150 % del golpe en un jefe de etapa, 250 % en un jefe de mundo (`BOSS_AFFIX.mortalWound.coeff`;
    el tooltip dice la cifra).
  - **Frenético** (EN «Frenzied») es el nombre del afijo de velocidad; «Enfurecido / Enraged» queda solo para la
    furia del reloj. La clave de datos (`frenzied`, efecto `buff_boss_frenzy`) no cambia: los guardados cargan igual.
  - **Sísmico** lleva ahora su señal: polvo bajo y piedrecitas saltando a los pies del jefe, a todo su ancho,
    desde que entra en combate (`buff_boss_tremor`, un marcador sin efecto en la simulación; 12 px de alto: no
    tapa la barra de lanzamiento ni las figuras).
  - Sin cambios, confirmado: los cuervos cuentan como bajas para «al matar»; el Rayo en cadena entero es área.
- **Culpa** (Chivo Expiatorio, mundo 4) — cada 20 s en Normal, 18 s de Infierno a Eterno, 15 s en Tormento (la
  primera a los 6 s) marca a un héroe AL AZAR durante 8 s. Mientras está marcado paga por el daño que el GRUPO
  hace al jefe: **por cada 1 % de vida que pierde el jefe, él pierde un 1,5 % · 2 % · 2,5 % · 3 % · 3,5 % de la
  suya** (Normal → Tormento). En una pelea a ritmo (el muro cae en 60 s) una marca cuesta un 20 % de su vida en
  Normal y un 47 % en Tormento.
  - **Por qué en porcentajes de vida y no «una parte del daño» tal cual** (decisión mía, a confirmar): medido con
    el grupo de la sonda, lo que el grupo le hace al muro por segundo es 1,5 veces la vida de la Ranger en Normal
    4-10 y 12 veces en Infierno 4-10. Ninguna fracción fija del daño vale para las dos: la que se nota en Normal
    mata en un segundo en Infierno.
  - Cuenta todo lo que le quita vida al jefe (golpes, habilidades, sangrados). Puede matar.
- **Silencio dorado** (Abad Dorado, mundo 5) — cada 24 s en Normal, 20 s en Infierno y Averno, 18 s en Eterno,
  16 s en Tormento (el primero a los 8 s): durante 6 s las recargas de las habilidades de los tres héroes no
  avanzan. Una habilidad que ya estaba lista se puede lanzar; las cargas por golpes (Disparo certero) siguen.
- **Resaca** (Novena Ola, mundo 6) — cada 12 s (la primera a los 6 s) una ola golpea a los tres con el 50 % ·
  60 % · 70 % · 80 % · 90 % de su golpe y los arrastra 50 · 70 · 85 · 100 · 120 px atrás. Vuelven andando (a su
  paso son 0,45–1,1 s, y los de atrás tardan hasta medio segundo más en arrancar) y nadie ataca ni lanza
  mientras anda; el jefe se queda donde está y tampoco les alcanza. Oleada tras oleada la pelea no se desplaza.
- **Con Purificar**: quita la marca de Culpa y el Silencio dorado del aliado sobre el que se lanza (los dos son
  efectos dañinos). La Resaca no deja efecto: no hay nada que limpiar.
- **Con los pasivos de guardia** (`test/sim/guardPaths.test.ts`): el peaje de Culpa no es un golpe y nadie lo
  apunta — misma regla que el daño en el tiempo: ni armadura, ni bloqueo, ni Guardián, ni Cerrar filas, ni
  Aguante; sí la reducción de daño y Manto; los escudos lo absorben y cuenta como «estar recibiendo daño». La ola
  de la Resaca es un golpe en área sobre los tres: Cerrar filas la reduce a sus aliados, Guardián no se lleva
  nada. El Silencio dorado no hace daño.
- **Qué se ve**: Culpa — la marca (una cabeza con cuernos al rojo) sobre los tres mientras elige, baja sobre el
  elegido, le brilla en el pecho y da una punzada con cada cifra roja. Silencio dorado — anillos de oro subiendo
  por el Abad, un anillo que se abre al tañer y una esfera de reloj parada detrás de cada héroe. Resaca — el
  camino se inunda bajo el grupo mientras la prepara, y una ola alta como un héroe lo recorre y se los lleva.
  Los tres con su signo junto al nombre en la barra y su tooltip (EN y ES); Culpa y Silencio dorado, ficha sobre
  la cabeza.
- Dónde: números en `data/bossKit.ts` (`MECHANIC`), reglas en `sim/worldBossRules.ts` (el peaje, el arrastre) y
  `sim/abilities.tickCooldowns` (recargas paradas), pruebas en `test/sim/worldBossRules.test.ts`, aspecto en
  `render/bossFx.ts`, `render/enemyFx.ts` (la Resaca es un golpe en área con su propia ola) y
  `tools/assets/pipeline/fx/boss.py`.
- Flojo o sin verificar: los héroes de atrás retroceden en el instante en que la ola sale, antes de que les
  llegue dibujada; el dibujo de la ola es tosco; el tooltip bajo un puntero real aparece en unas capturas y en
  otras no (el elemento no se vuelve a montar: no encontré la causa).
- Ritmo: nada reajustado. Sonda con una semilla hasta Infierno 7-1: Normal 3,5 h (objetivo 4); los muros 4, 5 y 6
  caen en Normal (2, 0 y 0 derrotas) y en Infierno (1, 0 y 0). Averno en adelante, sin medir.
- Capturas: `tools/assets/out/preview/boss_r3_*.png`. Como antes: jefe con la vida multiplicada y héroes que no
  pueden caer.
- Pendiente (punto de control 2): mundos 7–10 — Esporas, Hoja al rojo, Balanza, Espejos.

### Mascota acompañante en la franja — punto de control 1: el Búho erudito (2026-11-15, sin commit)

- **Qué es**: la mascota elegida (`selectedPet`) se dibuja en la franja. Solo presentación: nada en `sim/`, no
  recibe daño ni es objetivo. Sin acompañante elegida, o si la elegida no tiene figura (hoy solo la tiene el
  Búho), no se dibuja nada. Las otras cinco esperan al veredicto del búho.
- **Figura** (`tools/assets/pipeline/pets/scholar_owl.py`): búho pardo de frente, pecho crema moteado, penachos y
  gafas redondas de latón sobre un disco facial claro. 11 px de cuerpo, 13–16 de alto con penachos y alas; celda
  de 29×26. Las alas son palas movidas por el motor (ángulo por pose). Clips: `idle` (flota), `fly` (viaja
  inclinado, mirando adonde va), `perch` (posado: parpadea, mira adelante y atrás), `cheer`, `spot`, `mourn`.
- **Atlas propio**: `sh tools/assets/run.sh export-pets` → `src/assets/strip/pets/<mascota>.png` + `pets.json`
  (misma forma que `figs.json`; `root`/`ground` = el punto bajo sus patas) y una hoja ampliada en
  `tools/assets/out/preview/pet_<mascota>_sheet.png`. Una mascota es un módulo en `pipeline/pets/` con
  `PET = "Clase"`. No toca `export-figs` ni `export-fx`.
- **Cómo se mueve** (`src/game/render/petMotion.ts`, puro, `test/game/petMotion.test.ts`): vive DETRÁS del último
  héroe. En reposo flota a la altura de su hombro (34 px detrás, 21 de alto, con una deriva lenta); a los 5 s de
  grupo parado baja a posarse en el camino; cuando el grupo anda se eleva (35 px), se adelanta hasta el hombro
  del último héroe y vuela con él (alcanza el 85 % de su paso de salida y recupera el resto: se retrasa un poco
  y lo alcanza); al parar vuelve a su sitio. Llega volando desde atrás la primera vez; tras un salto (teletransporte,
  mundo nuevo, vuelta de una derrota) simplemente está en su sitio.
- **La regla que lo aparta del HUD**: nunca pasa de una LÍNEA 24 px detrás del último héroe. Todo lo que lleva
  un héroe (barra, fichas, números, fichas de habilidad) va centrado en él, y un héroe pegado a otro sube su
  barra un piso: por encima del grupo no hay altura segura, detrás de esa línea solo hay aire. Además se
  mantiene dentro del borde izquierdo de la franja cuando la cámara se adelanta (salvo que el propio héroe esté
  a menos de 40 px del borde: manda la línea).
- **Reacciones** (de hechos que el juego ya tiene; `render/PetCompanion.ts`): cae un jefe de etapa o de mundo
  (evento de muerte de un jefe) → `cheer`, dos botes con las alas arriba y un destello en las gafas (1 s);
  entra un cofre en el almacén (sube la cuenta de cofres guardados) → `spot`, penachos arriba y ojos como platos
  (0,9 s); el grupo cae (primer tiempo de la derrota) → baja al suelo y `mourn`, cabeza gacha, hasta el negro.
  Una reacción puede esperar a que acabe otra; dos iguales seguidas no se repiten.
- **Enganche en `GameStrip.ts`**: un campo, un `addChild` (en `combatants`, `zIndex` 2,5) y `updatePet`, que le
  pasa la x del último héroe, los jefes vivos, los eventos del fotograma y la cuenta de cofres.
- **Visto en captura** (jefe/enemigos con la vida multiplicada y héroes que no pueden caer, salvo en la derrota):
  `tools/assets/out/preview/pet_scholar_owl_sheet.png` (clips ampliados), `pet_strip_x2.png` (mundo 1 Normal y
  mundo 3 Tormento: reposo, posado, avanzando, jefe derrotado, cofre, derrota) y `pet_strip_x1.png` (lo mismo a ×1).
- **Flojo o sin verificar**: pardo sobre el camino pardo del mundo 1 destaca poco posado (lo salva la cara clara);
  al viajar inclinado el cuerpo se dentella un poco; el ala caída es estrecha en dos fotogramas del aleteo; no
  hay transición de aterrizaje/despegue (cambia de clip al tocar el suelo); no lleva sombra; solo visto en los
  mundos 1 y 3 (los otros ocho, sin mirar); no visto en la app empaquetada; el atlas de una mascota que se deja
  de llevar no se descarga (son 7 KB).
- **Pendiente (punto de control 2, tras el veredicto)**: las otras cinco mascotas (cada una con su manera de
  moverse: la Mula y el Gato andan, no vuelan), y lo que salga de las preguntas (tamaño, dónde vuela, reacciones).

### Enemigos — ronda 3 (2026-11-15, sin commit): una frase por chip de efecto

Al cerrar: `tsc` y lint limpios, 104 archivos / 937 pruebas en verde. Sin arte nuevo ni exportaciones.

- **Los 47 efectos con duración que hay hoy en los datos tienen frase** en el tooltip de su chip, en EN y ES
  (`ui/overlay/effectTipWords.ts`, textos `hud.fx…`): 11 con frase PROPIA — lo que un enemigo o un jefe pone a un
  héroe (Temblor, Herida mortal, Veneno, Raíces, Culpa, Silencio dorado, Esporas: dicen de dónde viene y si
  Purificar lo quita), la Marca del cazador y los estados de jefe (Coraza, Frenesí, el temblor de Sísmico) — y 36
  por su TIPO, sin escribirlos uno a uno: estadística arriba o abajo («Velocidad de ataque +45 % durante 8 s.»; un
  beneficio de dos estadísticas es UNA frase), daño o cura por segundo, hace menos daño, recibe más daño, curas
  mermadas, no recibe daño, silencio.
- **Los números son hechos**: lo que el efecto vale EN ese héroe en ese momento (valor por acumulación,
  acumulaciones y el tiempo con el que se puso; así sale el rango de la habilidad), que viajan con el chip
  (`stripHud.ChipWorn` → estado `stripTip.effects`); a falta de ellos, los del propio efecto en `data/`.
- **Un efecto que nadie ha redactado enseña solo su nombre** (no se rompe nada). Prueba nueva
  `test/ui/effectTipWords.test.ts`: lista los efectos visibles sin frase (hoy ninguno) y exige frase PROPIA a todo
  lo que esté en `BOSS_EFFECTS`; saltará cuando entren los efectos de los mundos 7–10 sin redactar, con el
  mensaje de dónde añadirlos.
- El tooltip se abre AL LADO del chip (antes debajo), a 172 px de arte de ancho: el más largo (Veneno en español,
  tres renglones) mide 56 px de alto y queda dentro de la franja a 1280×720 (de 65 a 121 de 160) y a ×2.
- Solo los héroes llevan chips en la franja: las frases de lo que llevan enemigos y jefes están escritas, pero
  hoy no tienen dónde verse.
- **Capturas** (`tools/assets/out/preview/`): `foes3_effect_tips.png` (Veneno y Herida mortal en español a ×1,
  Culpa en inglés a ×1, Esporas en inglés a ×2), y sueltas `foes3_tip_venom_es_1280x720.png`,
  `foes3_tip_venom_es_1512x918.png`, `foes3_tip_wound_es_1280x720.png`, `foes3_tip_guilt_en_1280x720.png`,
  `foes3_tip_spores_en_1512x918.png`.

### Jefes, ronda 3 — punto de control 2: mundos 7–10, decisiones del usuario y tres arreglos (2026-11-15, sin commit)

- **Decisiones del usuario sobre el punto de control 1**:
  - **Culpa** sigue midiéndose en porcentajes de vida, con números más bajos: 1,5 % · 1,75 % · 2 % · 2,25 % · 2,5 %
    de la vida del marcado por cada 1 % que pierde el jefe (una marca a ritmo cuesta un 20 % en Normal y un 33 %
    en Tormento). Sigue marcando al azar entre los tres.
  - **Resaca**: el arrastre como estaba, y además **corta lo que cada héroe estuviera preparando**. En la
    simulación los héroes no tienen un «lanzamiento en curso» — una habilidad se resuelve en el instante en que
    se lanza, en el sitio de un golpe —, así que cortar es esto: el golpe que estaba cargando (o la habilidad que
    iba a lanzar con él) empieza de cero. La habilidad cortada no llegó a lanzarse: su recarga no se gasta y lo
    vuelve a intentar con el golpe siguiente. Cuesta, como mucho, un golpe más de espera al volver.
  - **Silencio dorado**: 6 s en todas las dificultades (como estaba).
- **Arreglos**:
  - **La ola de la Resaca**, redibujada: lomo largo y oscuro con líneas de espuma que lo recorren, cresta que se
    riza en un labio blanco con el hueco de agua profunda debajo, espuma hirviendo al pie y salpicaduras
    arrancadas de la cresta; fina donde el agua es fina (deja ver el fondo). Azul marino y espuma color hueso (el
    del jefe y el mar del mundo 6), también el aviso del suelo, el arranque, la estela, el chapoteo y el signo.
  - **Cada héroe retrocede cuando la ola le llega dibujada** (`render/shoveDelay.ts`): la franja muestra el sitio
    de cada héroe como era hace un rato — lo que la ola tarda en llegar hasta él —, así que primero se va el de
    delante y los de atrás cuando les pasa por encima. El simulador no cambia.
  - **Tooltip que aparecía a veces**: no era el juego. Con las capturas a ×2, cada captura de pantalla vuelve a
    mandar el puntero a la MITAD de sus coordenadas (un `mouseover` en (x/2, y/2) y vuelta), y el tooltip sale en
    unas imágenes de la ráfaga y en otras no. Sin capturar, el puntero se queda sobre el signo los 4 s medidos; a
    ×1 aguanta toda la ráfaga. Igual para el tooltip de la furia. Los tooltips de las fichas de efecto de la
    franja van por otro camino (estado `stripTip`, capa propia) y no coinciden con los del riel: el puntero solo
    puede estar sobre uno. Apuntado en `docs/TESTING.md`.
- **Esporas** (Ángel Destructor, mundo 7) — cada 12 s en Normal, 10 s de Infierno a Eterno, 8 s en Tormento (la
  primera a los 5 s) una nube deja una capa más sobre los tres: cada capa, 0,2 % · 0,3 % · 0,4 % · 0,5 % · 0,6 %
  de la vida del héroe por segundo, hasta 5 capas; cada nube las renueva todas. **Cualquier cura directa** sobre
  un héroe (instantánea: ni una cura progresiva, ni regeneración, ni robo de vida) le quita las suyas; Purificar
  también. Es daño en el tiempo, como el veneno.
- **Hoja al rojo** (El Temple, mundo 8) — cada 18 s en Normal, 15 s de Infierno a Eterno, 12 s en Tormento (la
  primera a los 7 s) el suelo arde 6 s bajo los tres: cada uno recibe el 60 % · 80 % · 100 % · 120 % · 140 % del
  golpe del jefe repartido en ese tiempo. **Arde el suelo, no el héroe**: no deja efecto, así que Purificar no
  tiene nada que quitar (decisión mía, a confirmar).
- **Balanza** (El Veredicto, mundo 9) — cada 20 s en Normal, 15 s de Infierno a Eterno, 12 s en Tormento (la
  primera a los 9 s) todos los héroes bajan al PORCENTAJE de vida del que menos tiene, siempre del todo. Quita
  vida, no hace daño: ni armadura, ni reducción, ni escudos lo paran. Un héroe invulnerable (Última resistencia)
  conserva la suya; un héroe caído no es la medida; un héroe solo no se iguala con nadie.
- **Espejos** (El Deshacedor, mundo 10) — cada 10 s (el primero a los 6 s) refleja la ÚLTIMA habilidad que lanzó
  un héroe (nunca una definitiva). Lo que esa habilidad hace a los enemigos cae sobre los héroes al 25 % · 30 % ·
  35 % · 40 % · 45 % de su fuerza (el golpe del jefe en lugar del ataque del héroe, con el rango que el héroe
  tiene); lo que hace por los aliados se lo queda el jefe: curas y escudos al 2 % · 3 % · 4 % · 5 % · 6 % (son
  porcentajes de SU vida) y mejoras al 30 % · 40 % · 50 % · 60 % · 70 %. Una habilidad mixta (Castigo) hace las
  dos cosas. Un disparo que la heroína apunta por su orden de prioridad cae sobre un héroe al azar. Si aún no se
  ha lanzado nada, no pasa nada.
  - De las mejoras, al jefe le sirven la velocidad de ataque y la reducción de daño (Piel de piedra, Mantener la
    línea); crítico, robo de vida, daño de ataque y bloqueo no le hacen nada (limitación conocida).
- **Con Purificar**: quita las Esporas y lo que Espejos deje sobre un héroe (son efectos dañinos). El suelo que
  arde y la Balanza no dejan efecto.
- **Con los pasivos de guardia** (`test/sim/guardPaths.test.ts`): Esporas, como el veneno (cuentan la reducción de
  daño y Manto; no la armadura ni los pasivos del Knight). El suelo que arde es un peaje como el de Culpa. La
  Balanza quita vida: nada la reduce, y cuenta como «estar recibiendo daño». Lo que Espejos refleja es una
  habilidad como cualquier otra: una descarga a todos es golpe en área (Cerrar filas), un disparo a uno es
  apuntado (Guardián).
- **Qué se ve**: Esporas — nubes de polvo subiendo alrededor del Ángel; setas blancas a los pies de cada héroe
  (y sobre él) con su polvo, que se marchitan cuando una cura las limpia. Hoja al rojo — el camino se raja y se
  pone al blanco bajo cada héroe, la hoja sube por la grieta y queda fuego de fragua bajo los tres, con cifras
  naranjas. Balanza — un platillo colgando sobre cada héroe; al igualar baja sobre quien pierde vida y se la
  lleva en cuentas rojas. Espejos — esquirlas que se juntan en un espejo delante del Deshacedor; lo que refleja
  vuelve en esquirlas, el signo de la habilidad copiada sube sobre el jefe y lo que se queda le entra como luz.
- Dónde: `data/bossKit.ts` (`MECHANIC`), `sim/worldBossRules.ts`, `sim/mirror.ts` (qué refleja), pruebas en
  `test/sim/worldBossesLate.test.ts`; aspecto en `render/bossFx.ts` y `tools/assets/pipeline/fx/boss.py`.
- Ritmo: nada reajustado. Sonda con una semilla hasta el final de Infierno: Normal 3,5 h (objetivo 4), Infierno
  completo; el muro 10 de Infierno (Espejos) pide 9 intentos (6 en la medición anterior). Averno en adelante, sin
  medir.
- Flojo o sin verificar: el espejo se forma sobre el sitio del tanque y lo tapa mientras dura la barra; los
  platillos y el fuego se ven pequeños a ×1; las mejoras que el jefe no puede usar; mecánicas vistas solo en
  Normal (jefe con la vida multiplicada, héroes que no caen); un héroe arrastrado puede verse andando un instante
  después de que el simulador ya le deja atacar.
- Capturas: `tools/assets/out/preview/boss_r3b_*.png` (1512×918 ×2, 1280×656 ×1 y el tooltip en español a ×1).

### Mascotas en la franja — punto de control 2: Búho a la talla nueva, Duende de la moneda y Gato de la suerte (2026-11-15, sin commit)

- **Decisiones del usuario sobre el búho** (hoy): un 30 % más grande, unos 20 px (redibujado, no escalado); detrás
  del último héroe, como estaba; se posa a los 5 s de pelea, como estaba; pardo, como estaba. Esa talla es la
  referencia de escala de las demás mascotas (`tools/assets/pipeline/pets/__init__.py`).
- **Búho a 20 px** (`pipeline/pets/scholar_owl.py`): cuerpo de 13×16, gafas redondas de 5×5 con lente clara, pupila
  y brillo (cerradas, un párpado cruza la lente: las gafas no se quitan), penachos de tres píxeles. Arreglos: el ala
  caída conserva su anchura; al viajar ya no se cizalla — cabeza un píxel adelante, cola un píxel atrás, tres
  bloques limpios; clips nuevos `land` (frena con las patas fuera), `settle` (toca el suelo, se agacha y pliega) y
  `takeoff` (se agacha, abre las alas y salta): ya no cambia de clip en seco.
- **Dos maneras de moverse** (`render/petMotion.ts`, `PetStyle.kind`, números por mascota en `PET_STYLES`):
  - **Volador** (búho, duende): flota detrás del último héroe; al andar el grupo sube y vuela a la altura de su
    hombro; al parar vuelve. Uno que `perches` (el búho) baja a posarse a los 5 s; el duende no se posa nunca.
  - **Terrestre** (gato): no deja el camino. Está sentado detrás del grupo; cuando el grupo anda se levanta y
    trota detrás; donde el grupo para, se sienta. No se mueve por un héroe que da dos pasos (correa de 14 px) y
    mientras hace un gesto se queda donde está y luego corre a alcanzarlos.
  - Dejar el camino y llegar a él llevan un momento cada uno (`launchMs`, `settleMs`): sobre ellos suenan los clips
    `takeoff` y `settle` (en el gato, levantarse y sentarse).
- **La regla del HUD, igual**: ninguna pasa de su LÍNEA detrás del último héroe (`clearBehind` = donde empieza la
  barra de un héroe + el alcance de la figura; un test lo comprueba contra `pets.json`). Con la Priest y la Ranger
  pegadas (barra un piso arriba) sigue sin tocar nada: no hay nada de un héroe detrás de esa línea. Dentro del
  borde izquierdo de la franja salvo que el propio héroe esté pegado al borde.
- **Duende de la moneda** (`pipeline/pets/coin_sprite.py`): moneda de oro viva de 13 px con cara y dos alitas
  azules. Su carácter es la voltereta: el disco lo dibuja el motor a partir de un número (`spin`) — se pone de
  canto, enseña la estrella del reverso y vuelve. En reposo da una cada 7 s (`fidget`); jefe derrotado: dos
  rápidas subiendo entre destellos; cofre: se queda clavada y BRILLA (un tono más clara, ojos como platos,
  temblando); nivel: una voltereta y un destello; derrota: baja al camino, de canto, apagada, alas caídas.
- **Gato de la suerte** (`pipeline/pets/lucky_cat.py`): gato blanco, orejas rojas por dentro, collar rojo y
  cascabel — el gato de los mostradores. Tres posturas con una cabeza: sentado, a cuatro patas (las patas las
  mueve el motor en pares diagonales) y hecho un ovillo. Sentado mueve la cola, parpadea, mira atrás, y cada 9 s
  levanta la pata y llama (`fidget`). Jefe derrotado: bota sentado con la pata arriba; cofre: de pie, tieso, cola
  recta, ojos redondos, y luego se agazapa y menea el trasero; nivel: una llamada lenta con la pata; derrota: se
  hace un ovillo con las orejas atrás.
- **Gesto de subida de nivel** (`ding`; propuesta del coordinador, SIN confirmar por el usuario): salta cuando
  sube la suma de niveles del grupo (dato del store; el sim no emite un evento de nivel). Para quitarlo: borrar la
  línea `levelSum` de `GameStrip.updatePet` (nada más depende de ella); los clips `ding` pueden quedarse.
- **Sombra**: dos filas de tinta en el camino bajo la mascota, que se estrechan y se apagan cuando un volador sube
  (nada por encima de 42 px). Los héroes y los enemigos NO llevan sombra: hoy solo la llevan las mascotas.
- **Cosa de vez en cuando** (`fidgetEveryMs`): en reposo, cada mascota hace lo suyo cada tanto (voltereta, pata).
  El búho no tiene: posado ya parpadea y mira.
- **Enganche en `GameStrip.ts`**: el mismo de antes más una línea (`levelSum`).
- **Capturas** (enemigos con la vida multiplicada y héroes que no pueden caer, salvo en la derrota):
  `tools/assets/out/preview/pet2_<mascota>_sheet.png` (clips ampliados), `pet2_<mascota>_strip_x2.png` (mundo 1
  Normal: reposo, avanzando con la Priest y la Ranger pegadas, jefe, cofre, nivel, derrota; mundo 3 Tormento tras
  9 s de pelea) y `pet2_strip_x1.png` (las tres a ×1 en el mundo 3 Tormento).
- **AVISO — atlas de efectos demasiado alto (no es de este trabajo)**: `src/assets/strip/fx/fx.png` mide 1024×8262
  desde el `export-fx` de las 22:58. Pasa de 8192, el tamaño máximo de textura de muchas GPU: en el Chromium de
  las capturas (SwiftShader, tope 8192) los efectos del atlas salen como CAJAS NEGRAS (el fuego de los élites, las
  auras de los héroes). En el Mac de desarrollo (tope 16384) no se ve; en un PC con tope 8192 sí se vería. Hay que
  partir el atlas o ponerle un tope de alto. Estas capturas se hicieron con una copia de `shot-app.mjs` que usa la
  GPU (`--use-angle=metal`), en el scratchpad.
- **Flojo o sin verificar**: aterrizaje y despegue del búho comprobados por test (orden de clips) y en la hoja, no
  en captura de la franja (duran un cuarto de segundo); la sombra es discreta sobre caminos oscuros; el duende
  dorado destaca poco contra el cielo naranja del mundo 1; el gato sentado mira al frente, no de perfil, y al
  trotar la cabeza es grande para el cuerpo; las llamadas con la pata son pocos píxeles; solo vistos en los mundos
  1 y 3; nada visto en la app empaquetada; el atlas de una mascota que se deja de llevar no se descarga.
- **Pendiente**: Mula de carga, Diablillo del tiempo y Acaparador (la mula será terrestre; el diablillo, volador).

### Mascotas en la franja — punto de control 3 (último): Mula de carga, Diablillo del tiempo y Acaparador (2026-11-15, sin commit)

- **Decisiones del usuario** (hoy): las tres primeras valen; el gesto de subida de nivel se queda y lo hacen
  TODAS; la sombra se queda como está, solo en las mascotas (dársela a héroes y enemigos: al backlog); la cadencia
  de los gestos en reposo está bien.
- **Las seis tienen figura**: cualquier mascota elegida se dibuja (un test compara `PET_FIGURES` con `PET_KEYS`).
- **Mula de carga** (`pipeline/pets/pack_mule.py`, terrestre): mula parda pequeña (media altura de héroe a las
  orejas), crin oscura, morro claro, bajo unas alforjas de cuero con hebilla de latón y una manta roja enrollada
  encima: la carga es casi todo lo que se ve. NUNCA se sienta ni se echa con la carga puesta: en reposo está de
  pie, echa una oreja atrás, espanta con la cola, y cada 11 s baja la cabeza a pastar. Al andar el grupo va detrás
  al paso, cabeceando. Jefe: cabeza arriba, rebuzna y bota sobre las manos; cofre: orejas tiesas, cabeza alta y
  patea el suelo (más que cargar); nivel: asiente dos veces; derrota: dobla las patas y se echa bajo la carga.
- **Diablillo del tiempo** (`pipeline/pets/time_imp.py`, volador que no se posa): diablillo violeta de cuernos de
  hueso, ojos de latón y dientecillos, con dos alitas de murciélago y un RELOJ DE ARENA abrazado al costado. El
  reloj es su carácter: la arena cae mientras flota; cada 8 s le da la vuelta para que no se acabe (de lado, y
  arriba otra vez con la arena en lo alto). Jefe: lo sube sobre la cabeza y lo hace girar; cofre: lo agita con
  fuerza y salta arena; nivel: una vuelta limpia y un destello — en punto; derrota: baja a sentarse en el camino
  con el reloj de lado en el regazo, parado.
- **Acaparador** (`pipeline/pets/hoarder.py`, terrestre a su manera): un draco verde pequeño tumbado sobre la tapa
  de un cofre de cuero con banda y cerradura de latón, que NO LO SUELTA. No anda él: anda el cofre — le salen dos
  patas con garras por debajo y el conjunto se bambolea detrás del grupo; donde paran, mete las patas y el cofre
  se asienta. En reposo mira a un lado y a otro (¿quién mira su cofre?) y cada 10 s levanta la tapa una rendija,
  mira el oro que brilla dentro y la cierra deprisa. Cofre (su gran momento): ojos enormes, la tapa abierta de par
  en par, temblando; jefe: el cofre bota con la tapa aleteando; nivel: palmaditas en la tapa y un destello en la
  cerradura; derrota: se aplasta sobre la tapa con los ojos cerrados.
- **Escala** (junto al búho de ≈20 px y a un héroe de 40): mula ≈20 de alto y 22 de largo; diablillo ≈17; draco
  con cofre ≈14 de alto y 14 de ancho. **De un vistazo a ×1**: búho pardo con alas abiertas, moneda dorada redonda,
  gato blanco, mula gris con carga roja, diablillo violeta con reloj dorado, bulto verde sobre cofre marrón.
- **Contraste**: tras verlas en la franja, la mula y el draco suben un tono respecto a su icono del panel (la mula
  se perdía sobre el camino pardo del mundo 1 y el draco sobre el verde oscuro del mundo 3 en Tormento).
- **Tamaño de los atlas**: el mayor mide 624×340 px. El exportador se niega a escribir uno de más de 4096 px de
  lado (`MAX_SIDE` en `export_pets.py`) y un test lo comprueba contra `pets.json` (`PET_ATLAS_MAX`, `petAtlasSize`
  en `render/petData.ts`).
- **App empaquetada**: `src/game/render/configurePixiLoader.ts` YA NO EXISTE (se quitó en el commit `5c0b2c8`;
  el comentario de `vite.config.ts` que lo nombra está viejo). Lo que hoy hace que las texturas carguen en la app
  empaquetada es que el build mete TODOS los PNG como `data:` (regla `assetsInlineLimit` de `vite.config.ts`) y se
  cargan con `Assets.load`. Las mascotas van por ese mismo camino: comprobado con un build de producción en una
  carpeta aparte — cada mascota es un trozo JS propio con su atlas como `data:image/png;base64`, y el build no
  deja ningún `.png` suelto. No probado dentro de la app empaquetada.
- **Capturas**: `tools/assets/out/preview/pet3_<mascota>_sheet.png` (clips ampliados de las tres nuevas),
  `pet3_<mascota>_strip_x2.png` (en la franja a ×2: reposo, avanzando, jefe, cofre, nivel, derrota en el mundo 1
  Normal; tras 9 s de pelea en el mundo 3 Tormento), `pet3_six_x1_light.png` y `pet3_six_x1_dark.png` (las seis
  a ×1, mundo 1 Normal y mundo 3 Tormento) y `pet3_lineup.png` (las seis junto a la Priest, recortadas de los
  atlas, a ×4 y a ×1 sobre un fondo claro y uno oscuro).
- **Flojo o sin verificar**: las alas del diablillo son pequeñas y oscuras (vuela más por el aleteo que por la
  silueta); el diablillo violeta sobre los mundos violetas (9 y 10) no se ha mirado; la mula de frente al grupo
  tiene las orejas cortas (se lee burro o caballo pequeño); el draco es frontal y al andar hacia atrás se
  espeja (solo cambia de lado la cola); las patas del Acaparador son dos píxeles; nada visto en la app
  empaquetada; mundos 2 y 4–10 sin mirar.
- **Backlog**: sombra bajo héroes y enemigos (decisión del usuario: ahora no).

### Jefes, ronda 4 (2026-11-15/16, sin commit): decisiones, formas de Certero, tres signos, los seis espejos y el reflejo oscuro — y el atlas de efectos en páginas

- **A · Decisiones del usuario.** Resaca, Hoja al rojo y Esporas se quedan como estaban. **Espejos: al jefe le
  sirve también el daño de ataque** — una mejora de daño de ataque copiada (Grito de batalla) le hace pegar más
  mientras dura, con la fracción de mejoras de su dificultad (`sim/enemyTraits.foeDamageMult`); crítico y bloqueo
  siguen sin servirle. Tooltip y tests al día.
- **B · Dos arreglos de presentación.** El espejo de Espejos ya no se forma sobre el tanque: cuelga 40 px por
  delante del jefe y a la altura de su torso y cabeza (94 px sobre el suelo). Los platillos de Balanza pasan de
  13 a 19 px de ancho y cuelgan más arriba (`CAST_CUES.boss_scales.up` 66: libres de barras y chips); el fuego de
  Hoja al rojo crece (celda 56×48). Mirado a 1280×656 ×1.
- **C · Certero: una forma por jefe.** Los 20 jefes (de etapa y de mundo, mundos 1–10) envían algo suyo
  (`render/bossFx.ts DEADEYE_SHOT`; arte en `fx/boss.py`): cuerno arrancado (Scapegoat), cuenta del rosario
  (Abbot), lanza de agua (Ninth Wave), sombrero de seta (Destroying Angel), espada al rojo (Quench), mazo
  (Verdict), esquirla de nada (Unmaker); y los de etapa: bloque de piedra, campana, bala de cañón, cristal,
  goterón de magma, jabalina de luz, hacha. `DEADEYE_DEFAULT` queda solo para una figura que se dibuje después.
  Un test exige forma propia a todos los jefes de `data/worlds` y que los diez jefes de mundo no repitan.
- **D · Tres signos de enemigos con arte propio** (solo cambia la referencia al arte): chip de Temblor →
  `hud_s_m_tremor` (suelo partido y la sacudida; antes el grillete); Embestida → `charge_burst` (estrella blanca
  dura con dos surcos y el polvo de la carrera; antes `foe_hit`); auras del Apoyo en el tooltip de dificultad del
  mapa → `map_aura_<aura>` en el juego de iconos de la interfaz (`icon_sets/s9i_foes.py`, que las saca del mismo
  dibujo que lleva el Apoyo sobre la cabeza), y `MapFoes.tsx` ya no recorta el atlas de la franja.
- **E1 · Los seis espejos** (`data/bossKit.ts MECHANIC.mirror`, `sim/mirror.ts`). Cada Espejos (cada 10 s)
  enciende uno de los seis paneles de la figura: una acumulación de `buff_mirror_panes`, +5 / 6 / 7 / 8 / 10 % de
  daño por panel (Normal → Tormento), para golpes y habilidades, hasta que los rompe. Con los seis encendidos
  (segundo 57,5) lanza `boss_shatter`: barra de 1,5 s, aviso propio en el suelo, y un golpe en área a los tres de
  120 / 145 / 170 / 195 / 220 % de su golpe. Los paneles se apagan ANTES de que caiga el golpe (es el 120 % a
  secas, no × el +30 %) y vuelve a empezar. Es un golpe en área: Cerrar filas lo reduce, Guardián no (test).
  Los paneles encendidos son una mejora del jefe: Purificar no tiene nada que quitar.
  - **Se ve en el propio jefe**: `export-fx` hornea los seis paneles ENCENDIDOS fotograma a fotograma de sus
    clips (`fx/mirrors.lit_panes` → `panes_unmaker.png` + `fx.json panes`), solo los píxeles de cada panel que
    la figura enseña de verdad; `render/PaneGlow.ts` los pone encima del panel oscuro siguiendo el clip y el
    fotograma (orden: de arriba abajo, un lado y el otro). Destello al encenderse cada uno, parpadeo mientras
    carga la rotura, estallido de cristal en cada panel al romperse y hojas de espejo cayendo por todo el grupo
    (`AREA_BLOWS.boss_shatter`). **Contador** `n/6` junto al signo de Espejos en la línea del jefe.
- **E2 · El reflejo oscuro.** De uno de cada dos espejos (2.º, 4.º, 6.º; `reflection.every`, por dificultad)
  sale del espejo un reflejo del héroe cuya habilidad se copió: una invocación (`SUMMONS.reflection`, como los
  cuervos: vida propia, 8 s, sin botín ni progreso, cuenta como baja para talentos, cae con el jefe, la
  retaguardia la prioriza y el Caballero no la alcanza). Se planta un hueco de héroe por delante de la
  retaguardia y golpea a SU héroe si está detrás del tanque (si el copiado es el tanque, a los de detrás), al
  ritmo de ataque de ese héroe (entre 0,6 y 1,6 por segundo). Guardián se lleva su parte de cada golpe; Cerrar
  filas no (test). Sin habilidad copiada aún, o con ese héroe caído: no sale.
  - **Vida**: 1,5 × la de un enemigo normal de esa etapa (un enemigo normal son 2–3 golpes del que más pega →
    3–4,5 golpes). **Daño — cambiado respecto a la propuesta**: 50 / 60 / 70 / 80 / 90 % del golpe de un enemigo
    normal de esa etapa, NO el 30–60 % del daño básico del héroe reflejado: el golpe de un héroe está medido
    contra la vida de los enemigos y desde Infierno es varias veces la vida entera de un héroe.
  - **Figura**: la del héroe (sus clips), en una piel nueva `shade` (violeta noche) con un ribete frío `glass`
    (`export-fx`: `skin_<héroe>_shade.png`, `skin_<héroe>_glass.png`), mirando al grupo. Entrada: el espejo se
    oscurece y revienta (`reflection_out`) y el reflejo baja de él; salida, por muerte o por tiempo: se rompe
    como un cristal (`reflection_break`), nunca la muerte del héroe. Golpes: esquirla de espejo desde lejos
    (Ranger, Priest) o su golpe (Knight), rompiéndose sobre el héroe.
  - **Tooltip** del signo en tres líneas cortas (EN + ES) y en un cuadro más ancho: a 116 px de ancho el texto
    se salía por abajo de la ventana a 1280×720.
- **Cuánto más dura es la pelea** (`PROBE_SEEDS=1 PROBE_STOP=200`, sin retocar el muro): Normal sigue en 3,5 h
  y el Deshacedor de Normal cae al primer intento en 30 s — el jugador ve tres paneles (+15 %) y un reflejo, la
  rotura no; el de Infierno (etapa 200) necesita 9 intentos, los mismos que antes, y cae a los 75 s (ahí sí ve
  la rotura, en el segundo 59). Infierno entero: 36 h de 40.
- **El atlas de efectos, en páginas.** `fx.png` era una sola columna y pasó de 8192 px de alto (8262, luego
  8588): las GPU con ese tope dibujan cajas negras en lugar de los efectos (visto en las capturas). Ahora
  `export-fx` empaqueta los efectos por estantes en páginas `fx_<n>.png` de 2048 px de ancho y como mucho 4096 de
  alto (hoy UNA página de 2048×1981: el mismo arte ocupa menos de la mitad), abre otra página cuando no cabe y
  FALLA antes que escribir una hoja de más de 4096 px de lado (también pieles y paneles). `fx.json` dice
  `pages` y la `page` de cada efecto; `fxSheets`/`fxTextures` cargan las páginas. `test/game/stripAtlases.test.ts`
  comprueba sobre los archivos exportados que NINGÚN PNG de `src/assets` pasa de 4096 de lado (el mayor de los
  demás — figuras, mascotas, fondos, interfaz — mide 2048), que cada efecto cabe en su página y que no se pisan.
  Las páginas van por el camino de todas las hojas: URL del `import.meta.glob`, que el build mete como `data:`
  (comprobado con un build de producción en una carpeta aparte: ningún `.png` suelto), y `Assets.load`.
  `configurePixiLoader.ts` ya no existe (commit `5c0b2c8`). No probado dentro de la app empaquetada.
- **Capturas** (`tools/assets/out/preview/`): `boss_r4_espejos_paneles.png` (2, 4 y 6 paneles),
  `boss_r4_espejos_rotura.png`, `boss_r4_espejos_reflejo_sale.png`, `boss_r4_espejos_reflejo_ataca.png`,
  `boss_r4_espejos_reflejo_rompe.png`, `boss_r4_espejos_tooltip.png` (EN y ES a 1280×656 ×1),
  `boss_r4_x1_balanza_hoja_espejo.png` (los tres arreglos de B a ×1), `boss_r4_certero_formas.png` (las 20 formas
  en una hoja), `boss_r4_certero_en_juego.png` (Deshacedor y Veredicto disparando), `boss_r4_signos.png`.
- **Flojo o sin verificar**: la rotura llega en el segundo 59, uno antes del enfurecimiento (60 s): quien gana
  con margen no la ve nunca; el signo de Temblor a 7 px se lee como una mancha oscura con grieta; el reflejo
  se planta casi pegado al héroe al que ataca; el reflejo más mirado es el del Priest — el del Caballero y el de
  la Ranger solo se han visto de pasada y con una piel anterior, más oscura; Espejos visto solo en Normal; las formas de Certero de los jefes de
  etapa de los mundos 4–10 vistas en la hoja, no en el juego; el sondeo es de una sola semilla; nada visto en la
  app empaquetada.

### Jefes, ronda 5 (2026-11-16, sin commit): tres ajustes del Deshacedor, los tres reflejos de cerca y el signo de Temblor

- **Espejos cada 8 s** (antes 10; `MECHANIC.mirror.everyMs`). Paneles en 7,5 · 15,5 · 23,5 · 31,5 · 39,5 · 47,5 s
  y la rotura cae en el **segundo 49**, once antes del enfurecimiento. El reflejo sigue saliendo de uno de cada
  dos espejos (segundos 15,5 · 31,5 · 47,5): uno cada 16 s y cada uno dura 8, así que con estos números no se
  solapan. Aun así queda la regla, por si cambian: **nunca dos a la vez** — el que toca mientras el anterior
  sigue en pie queda debido (`reflectionOwed` en el jefe) y sale en cuanto el anterior cae o caduca
  (`sim/mirror.releaseReflection`, cada tick). Test con el espejo acelerado. El tooltip lee la cadencia de los
  datos («Cada 8 s…»).
- **Daño del reflejo**: 80 / 95 / 110 / 125 / 140 % del golpe de un enemigo normal de esa etapa, al ritmo de
  ataque del héroe reflejado.
- **Posición**: a media distancia entre el primer héroe de la retaguardia y el tanque (`SUMMONS.reflection
  .between` 0,5; con las posiciones del juego, a 50 px de cada uno), solo, sin pisar figuras, barras ni fichas.
  Ranger y Priest reflejados atacan desde ahí con una esquirla de espejo. El **reflejo del Caballero da el paso**:
  en cada golpe va hasta su víctima, descarga el tajo al llegar y vuelve a su sitio (360 ms ida y vuelta;
  `EnemySprite.stepStrike`, `DOUBLE_LOOKS.stepMs/stepGap`); el daño se muestra al llegar.
- **Los tres reflejos de cerca**, con la piel actual (violeta noche con ribete frío): `boss_r5_reflejos.png`
  (una fila por héroe: en su sitio y golpeando).
- **Signo de Temblor** rehecho: una losa clara partida por UNA grieta negra y la sacudida saltando de sus
  esquinas (antes grietas oscuras sobre marrón medio: una mancha). `boss_r5_temblor.png`.
- **Sonda** (`PROBE_SEEDS=1 PROBE_STOP=200`, sin tocar el muro): Normal 3,5 h, el Deshacedor de Normal cae al
  primer intento en 30 s (igual que antes: ve tres o cuatro paneles y un reflejo, la rotura no). El de Infierno
  (etapa 200): 12 derrotas antes de caer (eran 9), 19,0 h en ese mundo (eran 14,1; objetivo 5,5), cae a los 74 s
  con nivel 50 (antes 48). Infierno entero: 41 h (eran 36; objetivo 40).
- **Capturas** (`tools/assets/out/preview/`): `boss_r5_reflejos.png`, `boss_r5_temblor.png`,
  `boss_r5_espejos_tooltip.png`.
- **Flojo o sin verificar**: el reflejo del Caballero, al dar el paso hacia el Priest, atraviesa a la Ranger;
  el reflejo es muy oscuro sobre el fondo oscuro del mundo 10 (se lee por el ribete); el muro 10 de Infierno ya
  estaba por encima de su objetivo y ahora más (sin retocar, como se pidió); todo visto solo en Normal; una sola
  semilla en la sonda; la rotura a los 49 s no se ha recapturado (cambia solo el momento); nada en la app
  empaquetada.

### Kit de la Priest: sanadora imprescindible — HECHO (2026-11-16, punto de control 2A, sin commit)

Decisiones del usuario: «si puedo ir con el priest como si fuera otro dps, el balance está MAL»; siguen 2 huecos;
Infusión de poder sale del kit (pasivo de Celo); Purificar se funde en las curas; dos curas instantáneas que valen
menos que su progresiva («si las overtime son 30 %, las instantáneas 20-25 %; si la grupal over time es 20, la AoE
instant 15»). Corregido después por el usuario: cada cura quita TODOS los efectos dañinos, solo a quien cura; el
pasivo de Infusión lo recibe SOLO quien es curado (ella también si se cura).

- **Kit** (valores rango 1 → 5, × poder de curación):
  | Habilidad | Qué hace | Cuándo se lanza | Valores | Limpia |
  |---|---|---|---|---|
  | Sanar (progresiva) | cura en 6 s al más castigado / más herido | aliado <70 % o golpe fuerte | 20 % → 30 % (antes 15 → 25) | al aplicarse |
  | **Luz sanadora** (nueva, tronco 1) | cura instantánea | aliado con efecto dañino, <60 % o golpe fuerte; objetivo: el que está <35 %, si no el que lleva más efectos, si no el golpeado, si no el más herido | 15 % → 22 %, rec. 20 s | al curar |
  | Escudo sagrado | escudo (sin cambios) | — | — | no |
  | Nova sagrada | daño (sin cambios) | — | — | no (Nova radiante sí: es cura) |
  | **Círculo de sanación** (nuevo, tronco 4) | cura instantánea a todo el grupo | 2 aliados <80 %, uno <50 %, o 2 con efecto dañino | 9 % → 15 %, rec. 30 s | a cada curado |
  | Santuario (rama Devoción) | cura progresiva en grupo, 6 s | ídem Círculo | 12 % → 20 % (antes 6 → 10) | al aplicarse, a cada uno |
  | Castigo (rama Celo) | cura instantánea + golpe | sin cambios | — | al curar |
- **Limpieza** (`src/data/healing.ts` `HEAL_CLEANSE_COUNT = ∞`): toda cura de un héroe sobre un héroe quita todos sus efectos
  dañinos antes de curar (una Herida mortal quitada ya no recorta esa cura); las progresivas al aplicarse, nunca en
  sus ticks. Temblor no se quita (`cleanseIgnores`). Un número finito quitaría por `cleansePriority` (Raíces > Culpa
  = Silencio > Herida > Esporas > Veneno). La sim emite el cue `cleanse` y la franja hace un destello (`cleanse_flash`).
- **Infusión de poder**: pasivo `priest_infusion` en Celo fila 5 (donde estaba la reducción de recarga): cada cura
  instantánea suya o cada aplicación de una progresiva da a los curados +3 %/rango de velocidad de ataque y de
  reducción de recarga (15 % a rango 5) durante 4 s, renovado sin acumular (`to: 'healed'`, dato). Se ve con el
  ribete amarillo fino (sin las motas de antes).
- **Twin Infusion → Luz gemela** (`priest_mod_twin_light`): Luz sanadora cura también al siguiente aliado más herido
  a la mitad. El objetivo `twoDpsAllies` queda en la sim sin uso.
- **Guardados**: `REPLACED_NODES` lleva Infusión → Luz sanadora, Purificar → Círculo, reducción de Celo 5 →
  Infusión, Twin Infusion → Luz gemela (test de migración en `test/persistence/sanitizeHero.test.ts`).
- **Arte**: efectos `swift_gift`, `swift_light` (columna de luz que CAE sobre el curado: instantánea frente a la
  cinta lenta de Sanar), `circle_pulse` (un anillo blanco rápido bajo el grupo, sin brillo que dure) y
  `cleanse_flash`; signos `abil_healing_light`, `abil_circle`, `tal_e_infusion`, fichas `hud_s_m_healing_light` y
  `hud_s_m_circle`. `abil_purify` y `hud_s_m_purify` retirados.
- **Uso medido de Infusión** (grupo con equipo de zona, Priest Celo nivel 90, 3 semillas): muro de Infierno 4 (20 s)
  ≈ 20 % del tiempo en Ranger y Knight; muro de Infierno 6 con equipo del 4: Ranger 8–16 %, Knight 0 %; farmeo
  Infierno 4-5 / 6-5: 0–2 %. Hoy las curas apenas se lanzan porque casi nadie baja de los umbrales: es la falta de
  presión que corrige el 2B; con más presión el uso subirá.
- Capturas: `tools/assets/out/preview/priest2_*.png`.

### Decisiones del usuario tras la pasada de la noche (16 nov, mañana) — la vara, los drops y las llaves

Respuestas a las preguntas del informe de la ronda 3 (3b) y a una ronda nueva sobre progresión. **Por cablear**: antes
se mide dónde quedan los muros de hoy respecto al techo nuevo (Ronda 4 del informe de ritmo).

- **El 100 % del equipo de una zona es su techo realista**: cada hueco con la rareza más alta que cae en ese mundo de
  esa dificultad, al nivel de objeto máximo del mundo, con tiradas de afijo medias y gemas de esa rareza en todos los
  huecos. Sustituye a la vara C (percentil 90), que daba muros al 4 549 % y no tenía techo.
- **Escalera suave** (lo que pide cada muro para caer en 60 s, % del techo): Normal 10–20 · Infierno 40–55 · Averno
  55–70 · Eterno 65–80 · Tormento 75–90. **Dentro de cada dificultad sube del mundo 1 al 10.**
- **Al cambiar de dificultad**, el equipo del final de la anterior basta para uno o dos muros; desde el tercero hay que
  farmear la dificultad nueva.
- **Drops**: las dos rarezas más altas de cada dificultad, a la mitad en su mundo 10 (2 % → 1 %, 7,5 % → 4 %); lo quitado
  pasa a las rarezas medias. La rareza nueva sigue asomando en el mundo 2. Medido antes del cambio: en todo Tormento
  caen unas 60–75 piezas T8 y el grupo acaba con 21–22 T8 de 30 huecos.
- **Cofres de jefe con mejor tabla**: el de jefe de etapa ×1,5 en las dos rarezas más altas, el de jefe de mundo ×3
  (hoy los tres cofres usan la misma tabla).
- **La sanadora con mucho equipo en Infierno**: se acepta (ir muy sobrado salta la mecánica). Se vuelve a medir con la
  escalera nueva. El Desgarro sigue apagado.
- **Dispersión entre jugadores**: muros más parejos. La escalera debería reducirla sola; si no, se ajusta muro a muro.
- **Llaves**: siguen como hoy (entrada al muro: una garantizada al limpiar el X-9, luego el 25 % de los cofres de jefe de
  etapa). **Sin aviso de preparación en el juego**: el jugador aprende probando. El problema de los 36 intentos fallidos
  era de la sonda, que entraba con cada llave (96 % del tiempo de Eterno/Tormento «sin llave»; los intentos solo
  costaban ~8 h de 314). **Jugador medio nuevo** (usuario: «farmear y no gastar llaves en intentos que sabe que no van
  a pasar»): intenta con la primera llave; tras perder, solo reintenta si el jefe se quedó al 15 % de vida o menos, o si
  su equipo ha subido un 10 % desde el intento anterior.
- **Techo gradual** (16 nov, tras la ronda 4): la rareza nueva de una dificultad entra en el techo poco a poco, del
  mundo 1 (todo a la rareza anterior) al mundo 10 (todo a la nueva). Quita la sierra del mundo 2.
- **Manda la escalera** (16 nov, tras la ronda 4b): los muros se ponen en la escalera suave aunque el juego pase de
  ≈720 h; «aceptamos más horas, ya veremos si luego hacemos algún ajuste». Ronda 4c: muros en la escalera y medida.
- **Cada dificultad empieza donde acabó la anterior** (16 nov, tras la ronda 4c): el mundo 1 pide lo mismo que el
  mundo 10 de la anterior y sube hasta su tope (Normal 10→20 · Infierno 20→55 · Averno 55→70 · Eterno 70→80 ·
  Tormento 80→90 % del techo). Con la escalera de saltos el equipo anterior no tumbaba ni el mundo 1 (Normal 10 → Infierno
  1: 0 de 8). Ronda 4c: con los muros en la escalera el juego no se termina (el grupo se estanca al 55–65 % del techo en
  Eterno/Tormento); ronda 4d diagnostica por qué antes de elegir palanca.
- **El Knight defensivo, por los jefes** (16 nov): «cuanto más se avance, el Knight debería necesitar más habilidades,
  equipo y talentos defensivos». Regla elegida: **solo en los jefes** — los jefes de etapa y de mundo pegan cada vez más
  fuerte al frente con la dificultad; las oleadas se quedan como están. Objetivo de medida: desde Averno un Knight con
  construcción/equipo ofensivo no pasa los muros. **Por cablear.**
- **Daño físico/mágico de los jefes** (16 nov): fuera la moneda del 40 % por aparición (`spawnStageBoss` /
  `spawnZoneBoss`, `rng.chance(0.4)`). **Cada jefe es una mezcla fija, en datos y visible en su ficha: 60/40 o 40/60**,
  unos más cargados de daño mágico y otros de físico (usuario: «cada jefe tendría que ser una mezcla, intentando que
  sean 60/40 o 40/60»). Cada golpe se reparte en esa proporción y cada parte se mitiga con su defensa. **Por cablear.**
- **Resistencia mágica también en las oleadas: aura del Apoyo** (16 nov; usuario: «la resistencia mágica debería ser
  necesaria siempre»). Los Apoyos ganan un aura que encanta las armas de sus aliados: mientras el Apoyo viva, parte del
  daño de los enemigos de su oleada es mágico. Con datos, texto EN/ES y signo; el % se fija en la medida. **Por cablear.**
- **El Cubo, sin límite** (16 nov, tras la ronda 4d): se puede fabricar cualquier rareza en cualquier dificultad. Se le
  explicó que la pieza sale al nivel de objeto mediano de las 9 de entrada (no bajo) y con afijos de la clase; lo mantiene.
  La cantidad lo frena al principio (una T8 son 6 561 T4); al final del juego fabricar es la forma de superar el techo.
  **Primero el simulador** (ronda 4e): que use el Cubo, que valore la vida y que acepte las mejoras reales; después,
  en otra pasada, el Knight, el daño mixto de los jefes y el aura del Apoyo.
- **Tras la ronda 4e** (16 nov; sonda con Cubo, vida y mejoras reales; muros en la escalera; 1 056 h): tres decisiones.
  - **Horas que suben con la dificultad**: cada dificultad más larga que la anterior, con el total que salga (orientativo
    4 / 70 / 170 / 300 / 450 h). Hoy salía 8 / 116 / 202 / 160 / 607. Palancas: la vida de los muros dentro de la escalera
    (±5 puntos) y la presión.
  - **Presión gradual al empezar cada dificultad**: la presión del jefe de mundo (golpe en área, golpes a la retaguardia,
    golpe sobre el tanque) entra poco a poco en los mundos 1–3 de cada dificultad en lugar de entera desde el mundo 1, y
    los muros 1–2 piden algo menos, para que el equipo del final de la anterior pase 1–2 muros (hoy Normal → Infierno 0 de 8).
  - **Furia más dura**: pasado el minuto, el daño del jefe sube más rápido (hoy se duplica cada 2 s) para que pasar del
    minuto sea casi imposible desde Averno; el % de la escalera pasa a ser lo que de verdad hace falta. Hoy el grupo
    tumbaba el muro de Tormento con un 66 % del techo cuando pedía un 85 %.
- **El daño de los jefes, anclado a la vida del tanque** (16 nov, tras el diagnóstico de la ronda 5 · C: ninguna defensa
  toca el tope del 90 %; las curas de la Priest son un % de la vida y reponen ~4 %/s en todo el juego, y el daño
  enemigo es una fórmula fija que se queda plana desde Averno). Igual que la vida de los jefes se ancla al daño del grupo,
  su daño pasa a ser una **tabla fija por etapa**, medida una vez con el jugador medio (no reacciona a la vida de cada
  jugador): el muro quita al Knight medio, tras mitigar, ≈ 2 / 3 / 3,5 / 4 % de vida por segundo en Infierno / Averno /
  Eterno / Tormento, cerca de lo que cura la Priest, para que el Knight ofensivo no llegue desde Averno y el defensivo sí.
  **Solo esta propuesta**: las oleadas se quedan como están (descartadas «oleadas contra el frente» y «presión dentro
  del minuto»). Después, re-afinar muros y horas.
- **Forma de las horas, regla firme** (16 nov, durante la ronda 6 · B): «Lo que no puede ser es que Eterno dure menos que
  Averno, eso jamás. Y hay que tener cuidado con Tormento. Y tener cuidado con Infierno. La progresión debería ser algo
  así como 4-20-80-200-500+ (no exactamente esos números, pero saltos proporcionalmente parecidos).» Cada dificultad más
  larga que la anterior en cada partida; Infierno ≈ 20 h, Tormento 500+ sin dispararse. Si para cumplirlo hay que salir
  de la escalera (sobre todo en Infierno), se sale y se apunta dónde y cuánto. Sustituye al orientativo 4/70/170/300/450.
- **La escalera no se toca para cuadrar horas** (16 nov, ronda 6 · B): el ajuste dejó los muros de Infierno–Eterno al
  7–21 % del techo para cumplir 4/20/80/200/500 (por una instrucción mía de salir de la escalera). Rechazado: «te has
  saltado una norma importante… La escalera debe ir en aumento y acercarse a mis valores mientras mantenemos tiempos
  aproximados. Menos daño de bosses y más vida supongo que ayudaría. Más vida para amenazar con alcanzar el enrage.»
  Orden: escalera (±5, como mucho ±10 apuntado) → horas aproximadas → menos daño de jefe y más vida de muro (la amenaza
  es la furia). Si no cabe, se propone otra palanca con números, sin aplicarla.
- **Escalera ascendente, horas primero** (16 nov, noche, ronda 6 · B): con los muros en la escalera Infierno no baja de
  ~90–130 h (×4 de cofres solo lo deja en ~70). Usuario: «Vamos a intentar alcanzar unas horas aproximadas con una
  escalera, al menos ascendente de requerimientos, aunque no sea tan alta.» Prioridad: horas ≈ 4/20/80/200/500+ (cada
  dificultad más larga en cada partida) → lo que pide cada muro SIEMPRE sube (mundo a mundo y dificultad a dificultad),
  tendiendo a 10→20 / 20→55 / 55→70 / 70→80 / 80→90 tanto como dejen las horas.
- **Tras la ronda 6 · B — que la defensa importe sin suerte** (16 nov, noche). Tres respuestas del usuario:
  1. «Tienes libertad total para tocar habilidades, cds, triggers de las habilidades, etc para alcanzar la escalera y
     ritmo. Deberías ser capaz de tunear para que no todo dependa de la suerte. Cambiar triggers para que sean menos
     luck based, añadir algún talento, modificar algo, etc.» → **Ronda 7**: Knight defensivo necesario desde Averno,
     resistencia mágica necesaria, sanadora necesaria desde Infierno, con resultados consistentes (no moneda al aire).
     Cada cambio de diseño se apunta aquí.
  2. Nada de retoques sueltos de botín (más cofres o más rareza solo en Infierno/Averno) para cuadrar la escalera: «no
     quiero tener que hacer ajustes aleatorios solo porque no eres capaz de encontrar una solución».
  3. Los muros pueden pedir menos del techo («pueden ser 20-30, 30-40, 40-60 por ejemplo o algo así»), siempre
     ascendentes. Se retoma tras resolver el punto 1, porque cambiar habilidades mueve todo lo demás.

### Ronda 7 — que la defensa importe sin depender de la suerte (16 nov, noche; sin commit)

Diagnóstico (`scripts/luck-diag.ts`, 3 partidas × 9 muros de Averno–Tormento × 5 vidas de muro × 5 grupos × 12–16
combates; detalle en PACING_REPORT «Ronda 7»): en Averno la mitad de las derrotas del grupo de la sonda eran de
supervivencia y la primera en caer era la Ranger (34 de 43): la mitad de los golpes normales del jefe iban a la
retaguardia, al azar. Desde Eterno se perdía por la carrera contra la furia, con una franja de ±6 % de vida del muro en
la que el mismo grupo ganaba o perdía según los dados. El Knight «defensivo» (Piel de piedra + Baluarte) ganaba MENOS
que el de la construcción buena (Tajo debilitante + Grito de guerra), y sin resistencia mágica apenas se perdía.

Cambios de diseño:
- **Dos disparadores por habilidad: uno para oleadas, otro para jefes** (idea del usuario). Dato nuevo `firesBoss` en
  `data/abilities` (regla nueva `bossWindup`: un jefe prepara un golpe; `heavy`: su Golpe demoledor, o cualquier golpe
  si no tiene; contra un jefe que no prepara ningún golpe vale la regla de oleadas). Una habilidad para un aliado que
  salta por el anuncio cae sobre el héroe que va a recibir el golpe (el de delante). El tooltip dice las dos reglas
  («Contra un jefe: …», EN/ES).
  - Piel de piedra, Baluarte, Tajo debilitante, Mantener la línea y Escudo sagrado: contra un jefe, al anuncio de su
    Golpe demoledor (el Escudo, sobre el tanque).
  - Sanar (la progresiva): además, al anuncio, sobre el tanque, para que ya esté curando cuando llega el golpe.
  - Luz sanadora y Círculo no cambian: ya responden al golpe fuerte recibido.
  - Mantener la línea en oleadas: «cuando el grupo recibe daño» (su espera al golpe en área pasa a la regla de jefe).
- **Golpe demoledor** (`boss_crush`, `data/bossKit` CRUSH; nombre provisional): desde Averno, el golpe pesado del jefe de
  mundo, cada 24 s desde el segundo 8 (tres por minuto: 8, 32, 56 s), 2 s de anuncio, no se puede bloquear.
  - Al de delante le quita 1,2 / 1,5 / 1,7 veces la vida efectiva del Knight medio (Averno / Eterno / Tormento; vida
    entre lo que dejan pasar su armadura y su resistencia mágica a la mezcla del jefe, y su reducción de daño fija).
    Con Piel de piedra y Tajo debilitante se queda en un 30–45 % de su vida; sin nada lo mata (Última defensa le salva
    del primero).
  - A los de detrás, una sacudida mágica: con resistencia mágica «a nivel» les quita 0,2 / 0,45 / 0,5 de su vida ×
    mezcla mágica / 0,5 (un jefe 60 % mágico: 24 / 54 / 60 %); sin resistencia mágica, el doble. El Tajo no la suaviza.
  - Entra poco a poco en los mundos 1–3 de Averno, como el resto de la presión. Tablas `KNIGHT_EHP_TUNE` y
    `BACK_LIFE_TUNE` (`scripts/crush-tune.ts`). La ficha del jefe lo explica bajo «Con qué golpea».
  - Arte: reutiliza los dientes de roca del Golpe de suelo (no hay signo nuevo).
- **Los golpes normales del jefe de mundo van todos al de delante** (antes la mitad a la retaguardia desde Infierno):
  la retaguardia sufre lo que se ve venir (golpe en área, sacudida, mecánicas). La tabla del golpe del jefe se recalculó
  para la misma presión sobre el tanque (`scripts/boss-hit-tune.ts`).
- **Presión continua desde Averno más baja** (`BOSS_THREAT_PCT` 4 / 6 / 8 → 3 / 4,5 / 6): parte pasa al Golpe demoledor.
- **Mantener la línea**: recarga 26 → 24 s, para llegar a cada Golpe demoledor.
- **Tiradas firmes** (`sim/steady.ts`): bloqueo, críticos (de golpe, de habilidad y de cura) y multigolpe de los héroes
  ya no son dados: cada uno llena un contador con su % y sale cada vez que pasa de 100. Se bloquea y se critica
  exactamente lo que dice la estadística, repartido, sin rachas. Las tiradas de los enemigos siguen siendo dados.
- **La construcción buena del Knight desde Averno** en la sonda pasa a Piel de piedra + Tajo debilitante.

Resultado (mismas partidas; victorias con el muro al 80 % / 90 % de su vida actual — los muros no se han re-afinado):

| | Construcción buena | Knight ofensivo | Priest sin curas | Sin resistencia mágica |
|---|---|---|---|---|
| Averno, antes | 99 / 95 % | 92 / 78 % | 28 / 13 % | 90 / 79 % |
| Averno, ahora | 92 / 75 % | 31 / 6 % | 0 / 0 % | 62 / 50 % |
| Eterno, antes | 100 / 90 % | 89 / 72 % | 8 / 3 % | 92 / 79 % |
| Eterno, ahora | 95 / 72 % | 34 / 27 % | 0 / 0 % | 57 / 44 % |
| Tormento, antes | 99 / 84 % | 94 / 62 % | 17 / 8 % | 99 / 75 % |
| Tormento, ahora | 100 / 81 % | 22 / 12 % | 17 / 5 % | 72 / 53 % |

Coherencia entre semillas con el muro a su vida actual: 0,81–0,85 antes → 0,92–0,94 ahora en Eterno y Tormento (0,76
en Averno, donde el grupo queda justo en el umbral). **Pendiente**: con la misma vida de muro el grupo de la sonda gana
menos que antes (el Knight cambia daño por defensa y entra el Golpe demoledor): las horas subirán y hay que re-afinar
muros y horas en la siguiente ronda.
- **Tras la ronda 7** (16 nov, noche): el **Golpe demoledor** (nombre provisional) tendrá **nombre y arte propios**,
  confirmados en el laboratorio. Las **tiradas firmes** (bloqueo, críticos, multigolpe sin dados) **se quedan**.
  **Escalera de la ronda 8** (lo que pide cada muro en % del techo gradual, del mundo 1 al 10): Normal 5→10 · Infierno
  10→20 · Averno 20→30 · Eterno 30→40 · Tormento 40→60 (el ejemplo del usuario «20-30, 30-40, 40-60» desde Averno). Horas
  ≈ 4/20/80/200/500+, cada dificultad más larga que la anterior en cada partida.

### Ronda 8 — muros en la escalera fija (17 nov, sin commit)

- **Muros** en la escalera fija del usuario (Normal 5→10, Infierno 10→20, Averno 20→30, Eterno 30→40, Tormento 40→60,
  ±5): Infierno −2, Averno −4, Eterno +2, Tormento +4 dentro del margen. Horas (vuelta 5): 3–6 / 25–36 / 111–137 /
  244–334 / 333–528, cada dificultad más larga que la anterior en las tres partidas. Averno sigue largo (~80 buscado).
- **Daño del muro en Tormento** (`BOSS_THREAT_PCT`) 6 → 7,5 % de la vida del Knight medio por segundo, para alargar
  Tormento.
- **Las anclas del golpe del jefe y del Golpe demoledor se quedan las de la ronda 7**: re-anclarlas al Knight «al
  tumbar» en cada ajuste hace un trinquete (Averno 131 → 213 h).
- **Cuatro muros corregidos a mano** tras la última vuelta (Averno 10, Averno 4, Eterno 10: vida que no baje del muro
  anterior). Sin medir con ellos.
- **Diagnóstico de Averno** y tres propuestas de mecánica (onda anclada a la retaguardia, defensa del Ranger con regla
  de jefe, qué hacer con la carrera) en PACING_REPORT «Ronda 8». Ninguna aplicada.
- **Tras el diagnóstico de Averno** (17 nov, ronda 8): Averno 111–137 h (objetivo ~80) se va en farmear el hueco de 2–5
  puntos de techo; al llegar se pierde un 63 % por la carrera (furia) y un 37 % por muertes antes del minuto, casi siempre
  el Ranger por la onda del golpe en área (fórmula vieja, sin ancla). Las mecánicas que suben el daño de todos no acortan
  horas (la escalera se mide contra el techo, que sube con ellas). Decisiones: **(1) la onda del golpe en área sobre la
  retaguardia se mide contra la vida media del Ranger y la Priest**, como el golpe al tanque (la defensa del Ranger con
  regla de jefe, descartada por ahora); **(2) Infierno pide algo más** dentro del margen (hacia 15→25 % del techo) para que
  el jugador llegue a Averno mejor equipado, aunque Infierno suba hacia ~30 h.
- **Ronda 8, segunda parte** (17 nov; decisiones del usuario): **la onda del golpe en área sobre la retaguardia, anclada**
  (desde Averno, 6 / 4,5 / 4 % de la vida media de la retaguardia por golpe a través de la defensa a nivel, como el golpe
  al tanque y la sacudida del Golpe demoledor; antes era la fórmula, ~14 % en Averno 1–2); **Infierno pide algo más**
  (+3 dentro de la escalera, 13→23 %); **Tormento en el borde alto** de su margen (+4,5). Medida final: 3–5 / 25–49 /
  95–124 / 214–288 / 389–492 h; ningún muro fuera de ±5. Tormento no pasa de 500 h dentro de +5 (ver informe).
- **Tras la ronda 8** (17 nov): **Tormento sale del margen** de la escalera para pasar de 500 h (orientativo 45→70 % del
  techo en vez de 40→60 ±5); y **ronda 9 de reglas** sobre la tabla de la 8: Priest sin curas pierde también Eterno 8 /
  Tormento 8, Knight ofensivo pierde desde Averno (Eterno 8), coherencia ≥ 0,85, el equipo final de una dificultad pasa
  los mundos 1–2 de la siguiente — sin mover las horas de Normal a Eterno.

### Ronda 10 — presión desde el mundo 3 y Tormento con furia (17 nov, sin commit)

- **Presión desde el mundo 3** (`data/bossKit` `PRESSURE_HOLD_WORLDS = 2`, `pressureWeight`, `pressureDifficulty`): la
  presión nueva de una dificultad (golpe en área, Golpe demoledor, golpe del jefe sobre el tanque, onda anclada sobre la
  retaguardia, rampa de la furia, fuerza de su mecánica y de sus afijos) se queda en la de la anterior en los mundos 1–2 y
  entra en los mundos 3–5. Aperturas de Averno y Eterno de vuelta a las de la ronda 8.
- **Las tablas del golpe del jefe** re-escaladas por mundo (la entrada nueva y Tormento al 7,5 %, que desde la ronda 8 no
  había llegado al juego).
- **La furia de Tormento** (`stageScaling` `BOSS_FURY_GRACE_MS`): 4 s después de la ventana de 60 s, el jefe de mundo de
  Tormento arrasa al grupo (desde Tormento 3). Texto en el tooltip del reloj del jefe (EN/ES).
- **Tormento sobre una línea 55→85 %** del techo. Medido: Tormento 539–708 h en las tres partidas.
- **Golpe demoledor**: 1,8 (Eterno) y 2,0 (Tormento) veces la vida efectiva del Knight medio (ronda 9).
- Herramientas: `luck-diag` y `difficulty-change-check` luchan con el jefe de su partida (afijos fijos); la coherencia del
  0,69–0,75 era un fallo de medida (es 1,00).
- Pendiente de decidir: en las costuras, «el % siempre sube» frente a «el grupo con que acabas pasa los mundos 1–2» (y
  frente a «la vida de cada muro sube», por el jefe del mundo 10); si el Escudo sagrado cuenta como curar.

### Ronda 11 — el mundo 1, los espejos y la Priest sin curas (17 nov, sin commit)

- **Espejos rehechos**: un escudo, una defensa o un debilitamiento que el jefe reflejaría ya no se lo queda ni lo deja
  en los héroes: vuelve como un fragmento contra el héroe de delante (`sim/mirror` `turnsToShard`). Texto EN/ES.
- **El muro de apertura** (`OPENING_ENRAGE_MS` 100 s): el jefe del mundo 1 de cada dificultad da 100 s antes de
  enfurecerse. El equipo con que se acaba una dificultad pasa su mundo 1 (8/8 en las 12 costuras).
- **Priest sin curas** en las reglas: solo Nova, sin Escudo sagrado ni Nova radiante.
- **Golpe demoledor**: 1,5 / 2,0 / 2,0 veces la vida del Knight medio en Averno / Eterno / Tormento.
- **Tormento** sobre 60→90 %; ningún muro de Averno/Eterno pide menos que el anterior; Eterno 2 algo más bajo.
- Medido: 3–5 / 29–37 / 105–111 / 245–345 / 570–911 h. Quedan Averno 10 (+6), Eterno 1 (−1), Eterno 4 (−2), Tormento
  desigual por mundo y la Priest sin curas ganando Tormento 5 en una partida.

### Ronda 12 — el temporizador de golpes (17 nov, sin commit)

- **Arreglo** (`src/sim/combat.ts` `advanceAttack`; usuario: «arreglar y reafinar todo»): el temporizador de golpes
  conserva lo que sobra de cada tick y deja golpear varias veces en un tick a quien es más rápido que él (sin tope de
  velocidad de ataque; un guarda de 100 golpes por tick solo contra bucles). Antes el intervalo real se redondeaba hacia
  arriba a múltiplos de 100 ms: 9,65 golpes/s golpeaba 5 veces, 10,3 golpeaba 10, y una mejora pequeña podía doblar el
  daño del Ranger. Vale para héroes, enemigos y jefes, y para las habilidades atadas al golpe. Test
  `test/sim/swingRate.test.ts` (2,4 / 4,9 / 9,65 / 15 golpes/s, ±1 %).
- **El re-afinado queda en espera**: el usuario va a rediseñar la escala de la velocidad de ataque (un Ranger a ~10
  golpes/s es absurdo; debería rondar 2–3). Auditoría y opciones en PACING_REPORT «Ronda 12».
- **La curva de cadencia** (`src/data/cadence.ts`; usuario: «curva suave»): hasta la velocidad base de la clase cada
  punto es un golpe; por encima, los golpes crecen cada vez menos hacia el paso de la clase y lo que la curva no da en
  golpes vuelve como daño en cada golpe (multiplicador = velocidad / golpes: el daño por segundo no cambia). Ranger
  1,5 → 3,0 (la vista previa aprobada: 3 → ≈ 2,3, 5 → ≈ 2,7, 10 → ≈ 3,0); **elección mía**: Knight 1,4 → 2,2 y
  Priest 1,0 → 2,0, la misma forma (pendiente 0,7 al empezar). Enemigos y jefes golpean a su velocidad (0,6–1,3/s).
  Las habilidades que pegan con el ataque llevan también el multiplicador (si no, lanzar una habilidad costaba un golpe
  mucho mayor que ella y el daño de los Ranger rápidos caía un 20 %). Crítico, multigolpe y robo de vida dan lo mismo
  de media. Hoja del héroe: la velocidad se muestra en golpes por segundo, con la velocidad bruta y el bonus por golpe
  (EN/ES). Tests `test/sim/cadence.test.ts`.
- **Re-afinado**: vida de los enemigos normales × el multiplicador por golpe del que más pega (siguen cayendo en 2,5
  golpes), jefes de etapa × la ganancia de daño del temporizador (siguen durando 7,5 s), tabla de muros en la escalera,
  reloj del muro de apertura 120 s (Tormento 1 se pasaba a los 109–121 s).
- **Averno largo, aceptado** (17 nov; usuario): Averno se queda en ~125–175 h. Cierre de la ronda 12: las tres bajadas de
  la escalera (Infierno 1, Averno 5, Eterno 1, y de paso Infierno 5, Averno 3 y Eterno 7) arregladas subiendo lo mínimo la
  vida de esos muros (y la de los que van detrás en Averno y Eterno, para que nada pida menos que el anterior); Infierno 4
  algo más bajo. `CLAUDE.md` con las horas medidas.

### Ronda 13 — escalera con grupo de referencia fijo (17 nov, sin commit)

- **La escalera se mide contra un grupo fijo** (usuario: «grupo de referencia fijo»): Knight · Ranger · Priest al nivel
  de la zona con el techo realista de la zona, mediana de cinco combates (`test/sim/probe/referenceAsk.ts`). Tabla
  grabada `test/sim/probe/referenceAskTable.ts`; `test/sim/ladder.test.ts` exige que los 50 muros pidan estrictamente
  más que el anterior (costuras incluidas); `scripts/reference-ladder.ts` re-mide, falla en una bajada y re-graba.
  Definición en `docs/DIFFICULTY.md` §5 («The wall ladder»).
- **Arreglo de `wallDamage`**: un jefe tumbado de una ráfaga ya no se lee como poco daño (cuenta su vida restante y
  mantiene el ritmo).
- **Tabla de muros** ajustada lo mínimo para que la medida fija suba siempre: Normal −25…+38 %, Averno 1–5 −7…+19 %,
  el resto ±5 %. Líneas re-expresadas en la medida nueva: Normal 4→8, Infierno 7→12, Averno 11→24, Eterno 25→37,
  Tormento 59→94. Horas (3 partidas): 3–4 / 32–41 / 135–152 / 276–315 / 575–834 h. Detalle en PACING_REPORT «Ronda 13».

### Ronda 13b — Averno 1–6 en rampa (17 nov, sin commit)

- Averno 1–5 pedían lo mismo (~12) y saltaban en Averno 6 (18) porque la vida de esos muros crecía al ritmo del
  daño de referencia (nivel y equipo del grupo fijo suben lisos). Vida de Averno 2–5 +10 / +19 / +36 / +36 %:
  Averno 1 → 6 pide 11,9 · 13,2 · 14,4 · 15,7 · 16,9 · 18,2. Tabla de referencia re-grabada; Averno 1 a 8/8 con equipo
  del final de Infierno. Horas: 3–4 / 32–41 / 134–178 / 280–340 / 577–695 h (Averno +12 h de mediana). PACING_REPORT
  «Ronda 13b».

### Lab confirmado (17 nov)

- **Confirmados por el usuario** («Lo del lab todo ok»): el signo del aura del Apoyo «Armas encantadas» (estrella
  violeta) y el golpe cargado de los jefes de mundo (nombre «Charged Strike · Golpe cargado», carga en hierro o violeta
  según la mezcla del jefe, golpe limpio delante) con la separación de render entre jefe y héroe de delante. El lab queda
  sin nada pendiente.

### Ronda 14 — jefes 75/25 (17 nov, sin commit)

- **Mezcla de daño de los jefes** (usuario: «los podemos volver 75/25 siempre»): 0,4/0,6 → 0,25/0,75 en todos los
  jefes de etapa y de mundo (`BOSS_MAGIC_SHARE`); cada uno conserva su lado.
- **Anclas** del golpe al frente y de la vida del Knight para el golpe aplastante reescaladas por la mezcla (±2,2 %:
  la amenaza sobre el Knight medio no cambia).
- **Choque del golpe aplastante:** ahora va por lado (`CRUSH.shockBySide` 0,8 acero / 1,2 hechizo, lo de 60/40) en vez
  de crecer con la proporción de magia. Si no, el choque de los jefes de acero se quedaba a la mitad.
- **Escalera** re-medida y re-grabada: sigue subiendo, sin tocar vidas.
- Reglas, costuras, MR en partida completa, MR sin botín (`scratchpad/mix/mrRef.ts`) y horas: en PACING_REPORT
  «Ronda 14». Pendiente de decisión: costura Averno → Eterno 1 en una partida (0/8), y la partida 2 por encima de su
  banda en Eterno y Tormento.

### Ronda 14b — costura Averno → Eterno 1 (17 nov, sin commit)

- Decisiones del usuario: no habrá mecánica nueva de RM (75/25 basta) y las horas se aceptan como están.
- **Golpe aplastante del muro de apertura** (`stageScaling.crushHit`): se dimensiona contra mín(Knight medio de su muro,
  Knight medio de la puerta anterior). Eterno 1 se anclaba al Knight que ya ha farmeado Eterno, un 55 % más fuerte que el
  de la puerta de Averno, y un Knight con equipo del final de Averno moría al tercer golpe. Solo cambia Eterno 1 (golpe
  26 700 → 17 250). Las 12 costuras quedan a 8/8 en las 3 partidas. Escalera re-grabada (Eterno 1 25,40 → 25,39).

### Ronda 15 — oleadas llenas, reclutas y textura de Normal (17 nov, sin commit)

- **Oleadas** (usuario): `WAVE_SIZE_BY_STAGE` 9 → 22 y las de Normal igual de llenas (`WAVE_SIZE_MULT_BY_DIFFICULTY` 1).
- **Reclutas** (usuario: «el Ranger en 1-5, el Priest justo antes del jefe»): party_size 1 500 / 3 450 de oro (era
  300/600). El Ranger llega al tumbar 1-4 y el Priest al tumbar 1-8, en las 3 partidas, sin atascos del Knight solo ni
  del dúo.
- **Re-anclaje §6b:** mundo 1 etapa a etapa y mundos 2–15 por razón con la ronda 14; `anchorReference` re-escrito. Daño
  de la morralla: 1-5…1-8 más bajo para el dúo y Normal 2–10 ×1,8 («suave»: el Knight pierde ~5–15 % de mediana por
  oleada, el peor 20–50 %, sin wipes).
- **Herramientas:** `ProbeConfig.extraTech` y, en `ceiling-pass`, `CP_PETS=median` / `CP_SYNTH=1`, más el tope de
  nivel y las mascotas en la salida.
- **Docs:** CLAUDE.md (oleadas, horas, comandos de `run.sh`), DIFFICULTY §8 (horas medidas), texto del Relicario
  («world-boss chest»), test de respawn relativo.
- **Pendiente de decisión:** Tormento por defecto en mediana 980 h (por encima de la banda); el 120 llega en Tormento 2–3;
  los golpes por esbirro en Normal dependen de `NORMAL_TRASH_HP_MULT` 0,6. Detalle en PACING_REPORT «Ronda 15».

### Ronda 16 — Erudición, investigación y oro, Normal con vida completa (17 nov, sin commit)

- **`NORMAL_TRASH_HP_MULT` 1** (usuario). Re-anclaje de Normal y de su referencia. Daño de la morralla del dúo
  (1-5…1-9) y de Normal 5–10 ajustado. Reclutas en 1-4 y 1-8 sin atascos; textura del Knight al 5–19 % de mediana por
  oleada, sin wipes. El test de la primera etapa admite hasta 450 s.
- **Erudición** +2,5 → +0,5 % por rango (usuario: nerf de la investigación de experiencia; texto EN/ES). El 120 pasa de
  Tormento 3–4 a Tormento 4–6 (por defecto). Con mascotas, Tormento 3–4. No alcanza Tormento 8–10: ni quitándola entera.
- **Medido:** Lucro apenas cuenta (la subida exponencial del precio). La investigación de cofres y gemas acelera
  Tormento en ~600 h. El oro no se acumula hasta Tormento, donde llega a 15–40 h de ingreso.
- **Herramientas:** `ProbeConfig.skipTech` (`CP_SKIP`) y, en `ceiling-pass`, oro y rangos en cada muro.
- **Pendiente de decisión:** la ausencia (que dé experiencia o no) como siguiente palanca del 120, y el precio de
  «Pulir» (0,8 × 2,2^tier × ilvl × 1,5^n, ★ al 5 %). PACING_REPORT «Ronda 16».

### Pulir — el sumidero de oro del cubo (17 nov)

- **Decisión del usuario:** de los sumideros propuestos (pulir, abrir hueco de gema, estandarte de caza, comprar llave)
  eligió solo **Pulir**, con el precio propuesto, y que se reajuste el ritmo con él activo.
- **Receta nueva del cubo** (`sim/cube.ts` `polishCost`/`polishRoll`/`canPolishAffix`, `data/cube.ts`): vuelve a tirar el
  VALOR de un afijo secundario (la estadística no cambia) pagando oro; el jugador elige el valor de antes o el nuevo.
  Precio = 10 % del valor de alquimia × 1,5^n (n = pulidos ya hechos a la pieza; `ItemInstance.polishes`, opcional, así
  que las partidas guardadas siguen valiendo). ★ al 5 %; un afijo ★ no se pule. Tirada determinista por pieza, afijo y n.
- **Interfaz:** cuarta pestaña del cubo (`PolishRecipe.tsx`, signo `cube2_polish`), textos EN/ES. Comprobada en el
  juego: cobra, cuenta el pulido y muestra antes/ahora.
- **Pendiente:** política de pulido en la sonda y reajuste de horas y escalera con él activo.

### Ronda 17 — ausencia más baja y la sonda puliendo (18 nov, f142fb1)

- **Ausencia** (usuario: «bajamos tanto xp como oro»): 50 % → 15 % de lo de en línea (`OFFLINE_BASE_SHARE`) y
  Expedición +2,5 → +1 % por rango, 20 rangos (35 % como mucho, nunca por encima de en línea). La cifra de la UI lee el
  dato; textos EN/ES.
- **Pulir en la sonda** (`probe/polishPolicy.ts`): el 25 % del ingreso de oro, las piezas puestas de más valor primero,
  el afijo más flojo, quedándose con la mejor tirada; `CP_POLISH=0` lo apaga. Se lleva 1,4–1,9 M en Averno, 6,7 M en
  Eterno y 32–71 M en Tormento; da +3–15 % de daño en el muro.
- **Resultado:** el 120 llega en Tormento 6–10 (mediana Tormento 9, ~1 020–1 060 h). Todas las medianas de horas caen
  en banda (la partida 2 sigue lenta en Tormento, 1 178 h). Muros sin tocar; la escalera sigue subiendo.
- **Herramientas:** `CP_AWAY` (modelo de ausencia) y `CP_POLISH` en `ceiling-pass`; oro de Pulir en la salida.
- **Decidido (usuario, 18 nov):** la escalera sigue midiéndose con tiradas medias (Pulir es la ventaja que se compra,
  los muros no la exigen); el oro que sobra en Tormento (13–23 h de ingreso) se acepta y la sonda no lo gasta en Pulir.


### Arreglos visuales del combate (18 nov)

- **Cuerpo a cuerpo que pegaba desde lejos:** la pila se reordenaba cada fotograma (élites primero, luego por id) y se
  abría hasta 72 px detrás del primero, así que los que el sim tenía golpeando se dibujaban lejos. Ahora
  (`render/crowdLayout.ts`, clase `CrowdLayout`) los que llegan forman cola por orden de llegada: los 3 primeros pegan
  en el sitio (a ≤ 4 px del punto del sim, algo inclinados hacia el héroe para que la hoja llegue) y el resto espera
  detrás sin animación de golpe (`EnemySprite.setQueued`). Medido: de 91 % de fotogramas de golpe dibujados > 3 px
  detrás a 0 %.
- **Élites sin rayos morados:** fuera el fuego violeta alto (`elite_aura_*`); quedan el contorno (el aura), las motas,
  la corona y el tamaño (`render/eliteLook.ts`, `EnemySprite.wearElite`). El arte sigue exportado, sin usar.
- **Llegada fluida:** cada sitio de la cola solo avanza (el hueco solo se estrecha, nadie se cuela delante) y la figura
  nunca se dibuja más atrás que el fotograma anterior. Medido: de 61 pasos hacia atrás (peor deslizamiento 65 px) a 0
  (peor 0,9 px, redondeo a píxel entero). Sonda temporal y capturas en el scratchpad de la sesión (`motion/`).

### ✅ Hecho en la ronda 18 — cofres comunes y curva (18 nov)

- **Decisión del usuario (18 nov, sustituye a la anterior de 0,4 %):** cofre común base de 0,2 % a **0,5 %** por muerte
  (1 cada 200), y el nodo «Botín común» de +0,25 % a **+2,5 % por rango** (sigue infinito y multiplicando la base; al
  ritmo de compra medido, ~×1,9 al final de Tormento). Con ello, **reajustar la curva** (horas por dificultad y
  escalera estrictamente ascendente). Motivo: en 1-8 le habían caído 2 cofres, y el nodo era casi decorativo (+1 % dejaba
  el 0,2 % en 0,202 %).
- Arreglar el texto del nodo para que diga que es un porcentaje sobre la probabilidad base, no puntos sumados.
- **También (usuario, 18 nov: «2.5% por rango también los otros»):** el nodo «Botín de jefe» (cofres de jefe de etapa) de
  +0,5 % a **+2,5 % por rango**. «Sentido de gemas» ya da +2,5 %. Erudición sigue en +0,5 % (recorte del nivel 120).
- Orden acordado: sonido → arreglos visuales del combate (backlog) → cofres y curva al final.

### Ronda 18 — cofres comunes al 0,5 % y su investigación a +2,5 %, curva reajustada (18 nov; c37457e, publicado en v0.5.2)

- **Cofres** (usuario): común 0,2 → 0,5 % por baja; «Botín común» y «Despojos de jefe» a +2,5 % por rango sobre la
  probabilidad base (textos EN/ES y cifra del árbol). Entre 3 y 5 veces más cofres por hora.
- **Re-anclaje** de los mundos 2–24 y su referencia: el esbirro vuelve a 2,1–2,9 golpes y el jefe de etapa a 5–10 s.
- **Muros:** Infierno ×1,6, Averno ×2,7, Eterno ×3,3–3,8 y Tormento ×1,8–2,6, con la escalera estrictamente al alza
  (re-grabada; sus líneas re-expresadas en DIFFICULTY §5). Medianas de horas 6 / 34 / 154 / 239 / 640; el 120 llega en
  Tormento 6–7. Reclutas y textura de Normal sin cambios.
- **Herramientas:** kills, cofres y comunes abiertos por muro en la salida de `ceiling-pass`.


### Ronda 19 — ritmo de habilidades, curas en el tiempo, el Golpe cargado y la barra (18 nov; 3dd3bd5, 968cd4b)

Decisiones del usuario (18 nov), tras discutirlas una a una:
- **Cooldown global de 2 s por héroe** (`data/casting.ts`): fijo, ni la reducción de recarga ni la velocidad de ataque
  lo acortan; mientras dura sigue autoatacando. Las de cargas (Aimed Shot, Riposte) lo respetan y guardan la carga; las
  definitivas van aparte. Con varias listas sale primero la más urgente: la que responde a la carga de un jefe, luego
  una cura con alguien bajo el 35 %, luego el orden de ranura (`sim/abilities.byUrgency`).
- **Recargas unos 3 s más largas** («un punto medio», todas pares o acabadas en 5), **sin compensar**.
- **Curas en el tiempo** curan lo mismo durante más: Mend 12 s, Sanctuary 10 s, Mending Light 8 s; **en pulsos de 1 s**;
  relanzarla suma lo que quedaba (`sim/effects.applyEffect`); Mend prefiere al que no la lleva.
- **Golpe cargado cada 15 s** (era 24) y más débil: sin defensa quita el 50/60/65 % (Averno/Eterno/Tormento) de la vida
  del Knight medio — uno se aguanta, dos sin cura o defensa entre medias no; la sacudida de atrás baja en proporción.
  La carga sigue en 2 s: una defensa por héroe en cada golpe, el Knight con dos las turna.
- **Defensas contra jefes** saltan también en emergencia, bajo el 30 % de vida (`EMERGENCY_LIFE_FRAC`).
- **Disparos de Ranger y Priest:** uno de cada cuatro a la retaguardia por prioridad, el resto al frente de la oleada
  (`BACK_LINE_SHOT_PCT`, contador constante): los apoyos aguantan para bufar.
- **Knight regen 5 → 4**: con 3 el Knight solo y desnudo tardaba 27 min en la 1-1 (moría una y otra vez); con 4, ~6 min.
- **Barra:** placa MENU/MENÚ en el lanzador; las auras del apoyo vivo en el centro con su tooltip; iconos nuevos de
  Mejoras (flecha verde), Eterno (serpiente que se muerde la cola) y preajuste de diario (flecha en bucle con moneda).
  Los tiradores que no son arqueros lanzan el proyectil del mago, no flechas (`render/enemyFx.rangedStyle`).
- **Lab v84:** borradores de las curas en el tiempo (cinta, pulso, vida que viene, chispas, Sanctuary) y del sello de
  lanzamiento de la Priest (`tools/assets/pipeline/fx/priest_next.py`, sin exportar).
- **Pendiente:** la escalera de muros está ROTA con estos cambios (9 muros no suben; `ladder.test` falla) y el probe
  dirá las horas; el usuario decide con los números (más largo, o rebajar muros a ~3 meses).
- **Aprobado en el lab v84 («me gusta todo») y metido en el juego:** Mend deja una cinta menta que gira alrededor del
  aliado (`mend_wrap`), Mending Light chispas (`light_motes`), Sanctuary un círculo doble con rayos (`sanctuary_glow2`);
  cada pulso de 1 s pasa una banda de luz por el héroe (`hot_pulse`); la barra de vida enseña en menta lo que la cura
  aún va a dar (`hud_s_fill_coming`, `stripHud.barSegments` `comingW`). Cada habilidad de la Priest abre con su sello de
  runas y el pilar de luz (`sigil_heal/ward/wrath`, `render/abilityFx` `SIGIL`). Arte en `pipeline/fx/priest_care.py`.
- **Medido (probe, 5 semillas, antes del ajuste de muros):** horas por dificultad 6,9 / 33 / 144 / 280 / 693 (ronda 18:
  6 / 34 / 154 / 239 / 640), unas **1 157 h** en total (+8 %), 4,4–5,1 meses. El usuario elige quedarse ahí.
- **Escalera arreglada** tocando solo los nueve muros que dejaron de subir (Normal 3 y 10, Hell 3, Eternal 4–6,
  Tormento 2 y 5; `WORLD_WALL_MULT`, ronda 19) y re-grabada: los 50 suben.
- **La Priest en W1–3:** con el grupo real del probe lanza 0,6–1 veces por minuto en las etapas x-4 y unas 3 en las x-9;
  la regeneración del Knight (5 → 4) casi no cambia nada (el daño enemigo es la palanca). El usuario: dejarlo así.
- **Retoques tras la v0.5.5 (usuario, 18 nov):** el botón de menú en el lenguaje de la barra — tres barras de acero y
  «Menú» en la fuente de los números, centrado (opción A del lab v86); las auras del apoyo sobre la propia tira,
  centradas bajo la barra (no la mueven nunca); la cura pendiente en la barra de vida es el verde de la vida apagado
  (opción 2 del lab v87; el menta se confundía con un escudo); la ventana de opciones se coloca con su tamaño real antes
  de mostrarse (ya no salta desde encima del panel del héroe).
- **Pelotón con estocada (usuario, 18 nov):** los cuerpo a cuerpo forman dos columnas de cuatro filas ante el héroe y la
  de atrás avanza a golpear (`crowdLayout` `CONTACT_PLACES`, `CrowdPlace.lunge`); más de ocho se aprietan en el bloque.
  Todos se ven atacar, como en la simulación (la cola de detrás estaba quieta).
- **Amenaza de las oleadas anclada al Knight (usuario: «literalmente no recibe daño» en 4-6):** el golpe de la basura al
  héroe de delante es ahora `frontHit` con su propia tabla (`TRASH_DMG_TUNE`), anclada a la vida media del Knight:
  3 / 3,5 / 4 / 4,5 / 5 % por segundo mientras una oleada le pega, Normal … Tormento (`TRASH_THREAT_PCT`). Lo que llega
  a la retaguardia (disparos por encima, el área del bruto) va por otra tabla (`TRASH_BACK_DMG_TUNE`) a 0,5 → 1 %/s
  (`TRASH_BACK_THREAT_PCT`; el usuario: «separar la retaguardia» — con una sola tabla la Priest se atascaba en
  Tormento). El mundo 1 conserva sus valores (el arranque). Medidas y escritas por `scripts/trash-threat-tune.ts`
  (cuatro pasadas, la última amortiguada: media geométrica, porque cada mundo oscila con el azar del equipo); la última
  medida daba al Knight 2,6 / 2,7 / 3,9 / 4,2 / 5,0 %/s de media por dificultad y a la retaguardia 0,2–1,4 %/s.
- **Presión rebajada (usuario, 18 nov):** con 3–5 %/s Normal pasaba de 6–10 h a ~14 h (probe con traza, semilla 5) y
  el probe iba muy lento; el usuario pide bajar los objetivos: **2 / 2,5 / 3 / 3,5 / 4 %/s** (`TRASH_THREAT_PCT`). La
  tabla de delante se escala por la proporción de cada dificultad (no se re-mide); la retaguardia no cambia.
- **Las caídas del mundo 4 eran la retaguardia (18 nov, `scripts/wipe-diagnose.ts`):** con la presión rebajada Normal
  seguía en 10–14 h y con 30–129 caídas, casi todas en las etapas 4-6…4-9. El diagnóstico (semilla 5, grupo del probe en
  la frontera 35, 300 s por etapa): con las tablas actuales el Ranger y la Priest perdían 2–4,5 %/s y el grupo caía
  2–6 veces por etapa; con la tabla de la retaguardia de antes del ancla, 0,2–1,3 %/s y 0–2 caídas; con las dos de
  antes, ninguna. El afinador medía una sola semilla en la etapa x-5 (0,1–0,3 %/s) y subió la tabla hasta 7×. La
  retaguardia vuelve a sus valores de antes (siguen en su tabla propia); el Knight conserva su ancla a 2–4 %/s.
- **Nuevos objetivos (usuario, 18 nov):** Knight **1,5 / 2 / 2,5 / 3 / 3,5 %/s** («así si te pasas un poco no es muy
  grave»), retaguardia **0,5 / 0,55 / 0,6 / 0,7 / 0,75 %/s**, semiestable — que muera si el grupo no está preparado —,
  y las horas de vuelta a lo de antes (Normal 4–6 h…). Medido con las tablas anteriores (semillas 1, 3 y 5 en la etapa
  5 de cada mundo, 1 y 5 en la 9; mundos 2–32): el Knight 2,4 / 2,6 / 2,8 / 3,1 %/s en la etapa 5 y 1,5–1,9× en la 9;
  la retaguardia 0,13–0,2 %/s de mediana con picos de 1,3–1,8 en algún mundo. Cada mundo escalado por la mediana de las
  semillas; la retaguardia además sin pasar de ~1 %/s en la etapa 9; los mundos 33–50 (sin medir) con la proporción de
  su dificultad, y la retaguardia ahí a 3× lo de antes como mucho. `trash-threat-tune.ts` admite `AT` (la etapa medida).
- **Medido (probe, 5 semillas con traza, 18 nov):** horas por dificultad (mediana) **7 / 43 / 133 / 262 / 732**, unas
  **1 145 h** en total (986–1 281 por semilla; antes del ancla 6,9 / 33 / 144 / 280 / 693, 1 157 h). Las caídas, 25–49
  en Normal, repartidas (3–5 como mucho en una etapa). La escalera sigue al día (`ladder.test`).
- **Normal más corto (usuario, 18 nov; objetivo 4–6 h):** probado primero con oleadas ×0,7 (6–15 enemigos, cada uno
  ×1/0,7 para mantener la presión): Normal 6,8–11 h (mediana 8,4) y más caídas — una oleada tarda casi lo mismo con
  menos enemigos (llegan en tres tandas y caminan; el área del grupo mata a varios a la vez) y el grupo sube más
  despacio. Revertido; en su lugar **12 oleadas por etapa en Normal** (16 → 12, `WAVES_BY_DIFFICULTY`), llenas.
- **Medido (probe, 5 semillas, 12 oleadas en Normal, 18 nov):** horas por dificultad (mediana) **7 / 45 / 146 / 272 /
  644**, unas **1 087 h** en total (1 033–1 201 por semilla). Suite, lint y escalera en verde. El usuario deja Normal así.
- **Los tiradores antes que el apoyo (usuario, 19 nov):** «los enemigos support mueren prácticamente al instante… que
  tengan prio en pegar a los ranged o magic primero». Orden de Ranger y Priest **tirador → apoyo → bestia → soldado →
  bruto** (`TARGET_PRIORITY`; afecta al disparo de retaguardia, a Aimed Shot, Weak Spot y al golpe de Smite). Medido con
  `scripts/measure-support.ts` (grupos del probe, semillas 11–13, etapas 25…195): el apoyo moría a los **~3 s** de
  empezar su oleada (1,5–5 s de mediana; disparos ~60 %, Aimed Shot ~40 %); ahora **10–27 s** (mediana por etapa),
  cuando caen los tiradores a su alcance. El área y la salpicadura de la Priest le siguen llegando.
- **Medido (probe, 5 semillas, tiradores antes que el apoyo, 19 nov):** horas por dificultad (mediana) **7 / 46 / 151 /
  259 / 706**, unas **1 169 h** en total (1 087–1 283 por semilla; ronda 20: 7 / 45 / 146 / 272 / 644, 1 087 h): +7 %,
  casi todo en Tormento (+62 h). Las 5 semillas completan; suite y escalera en verde.
- **Icono de la app nuevo (usuario, 19 nov):** la primera ronda (seis símbolos: yelmos, escudo, cofre…) «muy cutres»;
  quiere el estilo del actual —el nombre como logotipo— con el arte nuevo. Elegido el **4B**: «Taskbar / Legion» en la
  gótica del logotipo, en latón, con su regla de rombo, sobre el mundo 1 en Tormento. Lo dibuja
  `tools/assets/pipeline/brand_icon.py` (`run.sh app-icon` → `src-tauri/app-icon.png`; `npm run gen:icon` lo expande
  con `tauri icon`). Fuera `scripts/gen-icon.mjs` (su logotipo de origen ya no existía).
- **Pantalla de inicio animada (lab):** juego simulado, el grupo contra el jefe de cada mundo, 3 s cada uno, sin vida
  ni daño; dos transiciones (A: cambia el jefe y el grupo sigue luchando; B: el grupo se teletransporta). Prototipo en
  canvas: `run.sh reel` (`pipeline/title_reel.py` + `title_reel.html`). Las hojas de los jefes grandes saltan de fila
  tras `cols` fotogramas: leerlas sin eso dejaba fotogramas vacíos (el jefe parpadeaba).
- **Guardado a prueba de cortes (19 nov):** `save.json` se reescribía encima; un cierre a mitad de escritura dejaba el
  archivo cortado → «Empezar» y el siguiente autoguardado pisaba la partida. Ahora `src/platform/saveFile.ts`: se
  escribe `save.json.tmp`, el anterior pasa a `save.json.bak` y el nuevo se renombra a su sitio; al cargar, si
  `save.json` no se lee, el `.bak`. Permiso `fs:allow-rename` en las capacidades. Test con un disco falso que se
  «cuelga» en cada paso (`test/platform/saveFile.test.ts`). Idea sacada de la skill `save-systems` (gamedev-skills).
- **Pantalla de inicio animada, en el juego (usuario, 19 nov: «combate continuo»):** la escena fija (mundo 1 al
  atardecer, sprites viejos) pasa a ser un canvas con el grupo luchando contra el jefe de cada mundo, 3 s cada uno, del
  1 al 10 y vuelta a empezar; el jefe se va en la columna de luz, el fondo barre al mundo siguiente y su jefe baja en
  otra; sin vida ni daño. `src/ui/title/`: `reelScript.ts` (guion puro y determinista, test en
  `test/ui/reelScript.test.ts`), `reelArt.ts` (hojas del juego como imágenes: héroes, efectos, y por mundo su fondo y
  su jefe, que se piden antes de hacer falta), `drawReel.ts`, `TitleReel.tsx`. El logotipo pasa a la izquierda.
  `render/backdropSheets.ts` dice dónde están los fondos sin Pixi. Fuera `title_backdrop.png` y `title_fore.png`.
