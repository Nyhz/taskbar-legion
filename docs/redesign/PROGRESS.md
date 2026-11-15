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

- [ ] **A · Habilidades que reaccionan** (un buen comportamiento por defecto para cada habilidad y definitiva, sin
      ajustes). Regla: se usa siempre que sea útil y, si está pasando algo concreto, lo aprovecha — nunca se queda
      guardada para algo que quizá no llegue. Hold the Line: cuando el grupo recibe daño; con un jefe preparando su
      golpe en área y la habilidad lista, espera a que caiga (cada 10 s). Holy Shield: al aliado que más daño está
      recibiendo, no siempre al tanque. Mend: prioriza a quien acaba de recibir un golpe fuerte. Revisar el resto
      una a una. **Cada habilidad lleva en su tooltip una línea «Cuándo se lanza»** (EN + ES).
- [ ] **B · Pasivos de efecto** (cinco rangos; la cifra es por rango). Cada clase cambia cinco nodos de «+X %» por
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
- [ ] **C · Afijos de jefe.** Jefes de etapa: ninguno en Normal, uno desde Infierno, dos en Eterno y Tormento, al
      azar. Jefes de mundo: su mecánica propia siempre, y además un afijo desde Averno y dos en Tormento. Signos
      junto al nombre en la barra superior, con tooltip. **Acorazado** (coraza = 10 % de su vida; 30 % menos de daño
      mientras la tiene; los críticos la rompen el doble de rápido; vuelve a los 15 s) · **Vampírico** (se cura 3 %
      con cada golpe que acierta sin ser bloqueado) · **Enfurecido** (+5 % de velocidad de ataque cada 5 s,
      acumulable) · **Sísmico** (golpe en área cada 6 s en vez de 10) · **Venenoso** (veneno acumulable ×5, 1 % de la
      vida por segundo cada uno; se va tras 4 s sin golpes) · **Certero** (cada 8 s un ataque al héroe con menos
      armadura — CADA JEFE con su propio efecto: un cuervo en picado, un rayo, una cuenta del rosario…) · **Herida
      mortal** (su golpe fuerte reduce 25 % la curación del tanque 8 s; ya existía).
- [ ] **D · Mecánica propia de cada jefe de mundo** (pelea de 60 s: se repite 3–4 veces; suave en Normal, aprieta
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

