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
- [ ] Decidir el siguiente paso (commit de control; enemigos del mundo 1; integración en Pixi).
- [ ] Enemigos del mundo 1 con el mismo motor.

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
