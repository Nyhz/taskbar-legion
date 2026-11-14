# PLAN.md — Fases del rediseño

Orden de trabajo del rediseño descrito en [REDESIGN.md](REDESIGN.md). Una fase está terminada cuando:
`npm run typecheck`, `npm run lint` y `npm test` están en verde (y `npm run assets:test` si se toca el
pipeline), se cumple su criterio ✅, la comprobación visual está hecha y [PROGRESS.md](PROGRESS.md) está al día.

Las fases marcadas con 🔀 pueden avanzar en paralelo con otras una vez superada R2.

Leyenda: 📄 archivo · 🧪 prueba · ✅ criterio de cierre · 👁 lo valida el usuario.

---

## R0 — Fundamentos

- 📄 `docs/redesign/REDESIGN.md`, `PLAN.md` y `PROGRESS.md`.
- 📄 `CLAUDE.md` apunta al rediseño como trabajo actual y declara qué documentos sustituye.
- ✅ El usuario aprueba REDESIGN.md. 👁

## R1 — Portar el pipeline

- 📄 `tools/assets/` con el núcleo de Relica (`build`, `raster`, `registry`, `validate`, `art_rules`,
  `sheets`, `compare`, `client_manifest`), `figures/` y `audio/` (solo la maquinaria). Sin paleta, fuentes
  ni familias de Relica.
- 📄 Rutas de salida: `public/assets/` y `src/data/generated/`. Atlas en formato *hash* para Pixi.
- 📄 `palette.py` nuevo con la paleta propia (borrador; se ajusta en R2).
- 📄 `package.json`: `assets:build`, `assets:validate`, `assets:test`. `.gitignore` para `tools/assets/out/`
  y `.venv/`.
- 🧪 pytest del núcleo: reproducibilidad (dos builds, mismos bytes), validador de reglas, empaquetado.
- ✅ `npm run assets:build` genera la lámina de la paleta y un atlas de prueba de forma reproducible.

## R2 — Prueba de estilo (puerta antes de producir en masa)

- 📄 Figuras de **perfil lateral** en `figures/`.
- 📄 Familias mínimas: fondo en parallax del mundo 1 (Normal y Torment), Knight, Ranger y Priest con todas sus
  animaciones, dos enemigos del mundo 1, seis iconos de objeto y un efecto de habilidad.
- 📄 Cargador de manifiesto en `src/game/render/` y la tira mostrando esos assets (aún conviven con el resto).
- ✅ Captura de la tira en Normal y en Torment, más las láminas, aprobadas por el usuario. 👁
  Si no convencen, se itera aquí la paleta, el contorno y la escala.

## R3 — Infraestructura de idiomas

- 📄 `src/i18n/` (catálogos `en`/`es` tipados, `t()`, selector de idioma en Opciones, idioma del sistema por
  defecto).
- 📄 `src/data/i18n/es/` y la sustitución de textos de datos en la capa de interfaz.
- 🧪 Clave sin traducir, `{token}` alterado, clave sin uso y texto visible de datos sin traducción fallan.
- 📄 Glosario en `docs/redesign/I18N.md`.
- ✅ La interfaz actual entera se ve en español al cambiar el idioma.

## R4 — Biblia de contenido 🔀

- 📄 `docs/redesign/WORLDS.md`: los 10 mundos (nombre, historia corta, bioma, paleta, música, ambiente), sus
  enemigos, élites, jefes de etapa y de mundo, con *flavour text* en inglés y español.
- 📄 `docs/redesign/CLASSES.md`: kits nuevos (8–10 habilidades por clase, especializaciones, «elige 1»,
  modificadores, definitivas) con su intención de rol.
- 📄 `docs/redesign/SYSTEMS.md`: qué mejoras de la simulación de REDESIGN §7 entran y cómo.
- ✅ El usuario aprueba los tres documentos. 👁

## R5 — Simulación y datos

- 📄 Bestiario por mundo, enemigos lanzadores, disparadores y modificadores de habilidad (lo aprobado en R4).
- 📄 Habilidades, talentos y definitivas nuevos en `data/`, con sus textos y traducciones.
- 📄 Migración de guardado: claves viejas → nuevas, reembolso de talentos.
- 🧪 Pruebas de cada mecánica nueva; determinismo; migración de un guardado de la v0.4.
- ✅ `npm run probe` dentro de los objetivos de ritmo y la partida nueva arranca (Knight solo de nivel 1).

## R6 — Producción de arte 🔀

- 📄 Fondos de los 10 mundos y sus 5 gradaciones; bestiario completo y jefes; iconos de objeto, gema, cofre,
  habilidad y talento; mascotas; efectos de todas las habilidades; retratos; título y marca.
- 🧪 Validador: paleta por mundo, contornos, tamaños, cobertura (todo id de datos tiene su asset y no hay
  huérfanos).
- ✅ Láminas completas revisadas por el usuario; cero emojis y cero sprites descargados en uso. 👁

## R7 — Sonido 🔀

- 📄 Música ambiente por mundo y título, lechos de ambiente por mundo y dificultad, efectos de combate y de
  cada habilidad, sonidos de interfaz y de cofres.
- 📄 Bus de audio en el cliente con volúmenes por canal, silencio, carga perezosa y fundidos.
- 🧪 Validación de sonoridad, picos, bucles sin salto y cobertura.
- ✅ Una sesión de prueba de 30 minutos que suena bien de fondo. 👁

## R8 — Interfaz 🔀

- 📄 Maquetas HTML en `docs/redesign/mockups/` (HUD de la tira, Héroe, Alijo, Árbol técnico, Mapa, Mascotas,
  Cubo, Opciones, título). 👁
- 📄 Sistema de diseño en `src/ui/kit/` (tokens CSS + TS, fuentes, componentes).
- 📄 Cada panel reconstruido sobre el kit, en inglés y en español.
- ✅ Capturas de cada panel en los dos idiomas aprobadas; el overlay de Tauri sigue funcionando (zona
  clicable, arrastre) en la build empaquetada. 👁

## R9 — Integración y limpieza

- 📄 Se borran los sprites descargados (`src/assets/characters`, `src/assets/enemies`, fondos viejos), los
  emojis de `data/`, el código de render que ya no se usa y `docs/ART.md`.
- 📄 Banners, icono de la app, CHANGELOG y documentación al día.
- ✅ Build empaquetada de macOS y Windows probada; release mayor cuando el usuario lo pida.
