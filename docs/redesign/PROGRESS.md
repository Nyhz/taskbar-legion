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
