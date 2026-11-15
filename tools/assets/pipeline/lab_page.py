"""Builds what the lab page (docs/redesign/lab/index.html) shows: `sh tools/assets/run.sh lab`.

1. Exports one atlas per figure (a row per animation) and one image per world and grade (its layers stacked) into
   `out/lab/img/`.
2. Rewrites the generated regions of the page — the world selector, one section per world with its bestiary, and
   the data block of the script — from `docs/redesign/lab/data/wNN.json` and what was exported.
3. Writes `out/lab/files.json`: published path → source file, for publishing the page.

A world appears once it has a backdrop family, a data file and all four of its creatures (a fifth entry, `kind`
"worldboss", is the creature of its world boss: it gets a card of its own and can be put alone on the live strip). `LAB_WORLDS=w01,w02`
limits the build to some worlds.
"""
from __future__ import annotations

import html
import importlib
import json
import os
import re
from pathlib import Path

from PIL import Image

from .palette import color
from .rig import GROUND, bake
from .roster import ROSTER, load

ROOT = Path(__file__).resolve().parents[3]
PAGE = ROOT / "docs" / "redesign" / "lab" / "index.html"
DATA = ROOT / "docs" / "redesign" / "lab" / "data"
OUT = Path(__file__).resolve().parents[1] / "out" / "lab"
GRADES = ("normal", "torment")
#: Strip order of a world's cast, back to front; they take the slots 530, 462, 414, 366.
KINDS = ("boss", "ranged", "melee", "beast")


def export_figure(name: str) -> dict:
    mod, char = load(name)
    w, h = char.W, char.H + char.TOP
    baked = {key: bake(char, anim) for key, anim in mod.ANIMS.items()}
    atlas = Image.new("RGBA", (w * max(len(f) for f in baked.values()), h * len(baked)), (0, 0, 0, 0))
    anims = {}
    for row, (key, frames) in enumerate(baked.items()):
        for i, f in enumerate(frames):
            atlas.alpha_composite(f, (i * w, row * h))
        anims[key] = {"row": row, "n": len(frames), "ms": mod.ANIMS[key].ms, "loop": mod.ANIMS[key].loop}
    atlas.save(OUT / "img" / f"f_{name}.png")
    return {"w": w, "h": h, "ground": GROUND + char.TOP, "root": char.build.root_x, "anims": anims}


def export_world(key: str, bd) -> list[list]:
    for grade in GRADES:
        layers = bd.build(grade)
        sheet = Image.new("RGBA", (bd.W, bd.H * len(bd.LAYERS)), (0, 0, 0, 0))
        for i, (name, _fn, _speed) in enumerate(bd.LAYERS):
            sheet.alpha_composite(layers[name], (0, i * bd.H))
        sheet.save(OUT / "img" / f"{key}_{grade}.png")
    return [[name, speed] for name, _fn, speed in bd.LAYERS]


#: The atmosphere effects the strip knows how to run, and the fields each one needs (see `atmosphere()`).
FX_FIELDS = {
    "lightning": {"every", "flash", "alpha"},
    "particles": {"count", "color", "vx", "vy"},
    "eyes": {"every", "hold", "color", "zones"},
    "pulse": {"color", "period", "alpha"},
    "flicker": {"every", "dur", "color", "alpha"},
}


def atmosphere(key: str, bd) -> dict[str, list[dict]]:
    """A backdrop's `ATMOSPHERE` — per grade, a list of real-time effects for the strip (weather, omens):

    - lightning: every [min, max] ms a bolt (`bolt` colour, optional; `x` [min, max], `y` [top, bottom]) and a
      flash of the whole strip behind the figures (`flash` colour, peak `alpha`), with `shake` px of tremor.
    - particles: `count` streaks or dots (`len` px, `size` 1–2) of `color` (one or a list) moving at `vx`, `vy`
      px/s with `sway` px of drift, at `alpha`; above `ymax`; `front` false draws them behind the figures.
    - eyes: every [min, max] ms a pair of eyes (`color`, `size`, `gap`) opens somewhere in `zones`
      ([x0, y0, x1, y1] each) for `hold` ms; at most `max` at once.
    - pulse: the strip breathes a tint (`color`, peak `alpha`) every `period` ms.
    - flicker: every [min, max] ms the light stutters for `dur` ms (`color` overlay at `alpha`).
    Colours are palette hex strings. Checked here so a typo fails the build, not the page.
    """
    out: dict[str, list[dict]] = {}
    for grade, effects in getattr(bd, "ATMOSPHERE", {}).items():
        assert grade in GRADES, f"{key}: atmosphere for unknown grade {grade}"
        for fx in effects:
            kind = fx.get("fx")
            assert kind in FX_FIELDS, f"{key}/{grade}: unknown effect {kind!r}"
            missing = FX_FIELDS[kind] - set(fx)
            assert not missing, f"{key}/{grade}: {kind} lacks {sorted(missing)}"
        out[grade] = list(effects)
    return out


def worlds_ready() -> list[tuple[str, dict, object]]:
    only = [w for w in os.environ.get("LAB_WORLDS", "").split(",") if w]
    out = []
    for f in sorted(DATA.glob("w*.json")):
        key = f.stem
        if only and key not in only:
            continue
        info = json.loads(f.read_text())
        try:
            bd = importlib.import_module(f".families.backdrop_{key}", __package__)
        except ModuleNotFoundError:
            print(f"skip {key}: no backdrop")
            continue
        missing = [foe["key"] for foe in info["foes"] if foe["key"] not in ROSTER]
        kinds = [foe["kind"] for foe in info["foes"]]
        if missing or sorted(k for k in kinds if k != "worldboss") != sorted(KINDS):
            print(f"skip {key}: creatures missing {missing}")
            continue
        out.append((key, info, bd))
    return out


def esc(text: str) -> str:
    return html.escape(text, quote=True)


def hex_of(c: tuple[int, int, int]) -> str:
    return "#%02x%02x%02x" % c


def clip(name: str, anim: str, label: str, title: str, fig: dict) -> str:
    # Shown at an exact 3× whatever the figure's frame is (bosses have larger ones), shrinking only if it must.
    size = f' style="flex-basis:{fig["w"] * 3}px"' if fig["w"] > 96 else ""
    return (f'          <div class="clip"{size}><canvas class="px anim" data-char="{name}" data-anim="{anim}" width="{fig["w"]}" height="{fig["h"]}" '
            f'style="width:{fig["w"] * 3}px" role="img" aria-label="{esc(title)}: {esc(label.lower())}."></canvas><span>{esc(label)}</span></div>')


def world_section(n: int, key: str, info: dict, bg: tuple[int, int, int], figs: dict) -> str:
    dark = sum(bg) < 380
    label = "#fde3b0" if dark else "#1c1830"
    cards = []
    for foe in info["foes"]:
        fig = figs[foe["key"]]
        bullets = "\n".join(f"            <li>{esc(b)}</li>" for b in foe["bullets_es"])
        clips = "\n".join(clip(foe["key"], a, lab, foe["name_es"], fig) for a, lab in foe["anims_es"].items() if a in fig["anims"])
        # A world boss can be put alone on the live strip, in front of the heroes.
        solo = (f'\n          <button class="link" data-boss="{foe["key"]}" data-boss-world="{key}">Verlo solo en la tira, frente a los héroes</button>'
                if foe["kind"] == "worldboss" else "")
        size = f' · {fig["w"]} × {fig["h"]} px' if foe["kind"] == "worldboss" else ""
        cards.append(f'''      <article class="hero">
        <div class="body">
          <span class="role foe">{esc(foe["role_es"])}{size}</span>
          <h3>{esc(foe["name_es"])}</h3>
          <ul>
{bullets}
          </ul>{solo}
        </div>
        <div class="clips" style="background:{hex_of(bg)};--clip-label:{label}">
{clips}
        </div>
      </article>''')
    return f'''  <section id="{key}">
    <div class="sec-head">
      <span class="eyebrow">Mundo {n} · {esc(info["name_es"])}</span>
      <h2>{esc(info["name_es"])}</h2>
      <p class="muted">{esc(info["backdrop_es"])} <button class="link" data-goto="{key}">Verlo en la tira en vivo</button></p>
    </div>
    <div class="heroes">
{chr(10).join(cards)}
    </div>
  </section>
'''


def candidates_section(cands: list[dict], bg: tuple[int, int, int], figs: dict) -> str:
    """The final-boss candidates: the user picks one. Each can be put alone on the live strip."""
    dark = sum(bg) < 380
    label = "#fde3b0" if dark else "#1c1830"
    cards = []
    for i, c in enumerate(cands):
        fig = figs[c["key"]]
        bullets = "\n".join(f"            <li>{esc(b)}</li>" for b in c["bullets_es"])
        clips = "\n".join(clip(c["key"], a, lab, c["name_es"], fig) for a, lab in c["anims_es"].items() if a in fig["anims"])
        cards.append(f'''      <article class="hero">
        <div class="body">
          <span class="role foe">Candidato {chr(65 + i)} · {fig["w"]} × {fig["h"]} px</span>
          <h3>{esc(c["name_es"])}</h3>
          <p class="muted">{esc(c.get("pitch_es", ""))}</p>
          <ul>
{bullets}
          </ul>
          <button class="link" data-boss="{c["key"]}">Verlo solo en la tira, frente a los héroes</button>
        </div>
        <div class="clips" style="background:{hex_of(bg)};--clip-label:{label}">
{clips}
        </div>
      </article>''')
    return f'''  <section id="final-boss">
    <div class="sec-head">
      <span class="eyebrow">Mundo 10 · para elegir</span>
      <h2>Candidatos a jefe final</h2>
      <p class="muted">El Heraldo de la Fractura no convenció. Estas son {len(cands)} propuestas distintas para el jefe del mundo 10, la puerta a las dificultades altas: elige una (o di qué mezclar). Cada una se puede ver sola en la tira, frente a los tres héroes. El Heraldo actual sigue arriba, en la sección del mundo 10, para comparar.</p>
    </div>
    <div class="heroes">
{chr(10).join(cards)}
    </div>
  </section>
'''


ICONS = Path(__file__).resolve().parents[1] / "out" / "icons"


def items_section() -> tuple[str, dict[str, str]]:
    """The item icons (`sh run.sh icons` first): one block per group of its manifest, shown at 3×."""
    manifest = ICONS / "manifest.json"
    if not manifest.exists():
        return "", {}
    files: dict[str, str] = {}
    blocks = []
    order = ["tiers", "helmets", "chest", "gloves", "legs", "boots", "swords", "shield", "bow", "quiver", "wand", "tome",
             "ring", "amulet", "trinket", "gems", "chests", "chests_open", "keys", "stats", "ui", "hud", "chrome"]

    def rank(g: dict) -> int:
        key = g["key"]
        for i, o in enumerate(order):  # exact name first, then "<slot>_<family>"
            if key == o:
                return i * 10
        for i, o in enumerate(order):
            if key.startswith(o + "_"):
                return i * 10 + 1 + ["plate", "leather", "cloth"].index(key.rsplit("_", 1)[1]) if key.rsplit("_", 1)[1] in ("plate", "leather", "cloth") else i * 10 + 5
        return 999

    for g in sorted(json.loads(manifest.read_text()), key=rank):
        cells = []
        if g["key"].startswith("mock_"):  # pictures composed for the mock-ups, not part of the catalogue
            continue
        for it in g["items"]:
            w, h = Image.open(ICONS / it["file"]).size
            if w > 160:  # a whole scene: it belongs to a mock-up, not to the catalogue
                continue
            files[f"img/icons/{it['file']}"] = str((ICONS / it["file"]).relative_to(ROOT))
            k = 2 if w > 48 else 3 if w >= 32 else 4  # framed items at 3×; the small glyphs at 4×; big pieces at 2×
            cells.append(f'        <figure class="item"><img class="px" src="img/icons/{it["file"]}" width="{w * k}" height="{h * k}" '
                         f'style="width:{w * k}px;height:{h * k}px" alt="{esc(it["name"])}"><figcaption>{esc(it["name"])}</figcaption></figure>')
        if not cells:
            continue
        blocks.append(f'''      <div class="item-group">
        <h3>{esc(g["title"])}</h3>
        <p class="muted">{esc(g["note"])}</p>
        <div class="items">
{chr(10).join(cells)}
        </div>
      </div>''')
    return f'''  <section id="items">
    <div class="sec-head">
      <span class="eyebrow">Objetos</span>
      <h2>Iconos de objetos</h2>
      <p class="muted">Iconos de 32 × 32 en la misma paleta que los personajes, hechos con planos facetados y contorno. La rareza no se redibuja: la dice el marco. Cada tipo de objeto tiene cinco categorías, de lo tosco a una pieza de la Grieta; la armadura, además, tres familias, una por clase.</p>
    </div>
{chr(10).join(blocks)}
  </section>
''', files


MOCKUPS = ROOT / "docs" / "redesign" / "mockups"


def mockups_section() -> tuple[str, dict[str, str]]:
    """The interface mock-ups of docs/redesign/mockups, in name order: `00_kit.html` (the shared recipes, injected
    once) and then one stage per panel. A panel fragment opens with `<!-- mock: Title | note -->`."""
    parts = sorted(MOCKUPS.glob("*.html"))
    if not parts:
        return "", {}
    blocks, used = [], ""
    for f in parts:
        text = f.read_text()
        used += text
        head = re.match(r"<!-- mock: (.+?) \| (.+?) -->\n", text)
        if not head:  # the kit: styles only
            blocks.append(text)
            continue
        blocks.append(f'''    <div class="item-group" id="mock-{f.stem}">
      <h3>{esc(head.group(1))}</h3>
      <p class="muted">{esc(head.group(2))}</p>
      <div class="mock-stage">
{text[head.end():]}
      </div>
    </div>''')
    files = {f"img/icons/{name}": str((ICONS / name).relative_to(ROOT)) for name in sorted(set(re.findall(r'img/icons/(\w+\.png)', used)))}
    body = "\n".join(blocks)
    return f'''  <section id="ui">
    <div class="sec-head">
      <span class="eyebrow">Interfaz · maquetas</span>
      <h2>La interfaz</h2>
      <p class="muted">Maquetas de los paneles del juego, hechas con los iconos reales y dibujadas al tamaño de píxel del juego, ampliadas al doble. Las reglas: signos en lugar de palabras, y las palabras solo en los tooltips (pasa el ratón); el marco es pixel art de verdad, con cantoneras de latón; los nombres van en gótica y los números en una pixel limpia.</p>
    </div>
{body}
  </section>
''', files


def refresh_items() -> None:
    """Only the items region of the page and its files (no figures or worlds are re-exported)."""
    section, files = items_section()
    mock, mock_files = mockups_section()
    files |= mock_files
    PAGE.write_text(between(between(PAGE.read_text(), "items", section), "mockups", mock))
    listed = json.loads((OUT / "files.json").read_text()) if (OUT / "files.json").exists() else {}
    listed = {k: v for k, v in listed.items() if not k.startswith("img/icons/")} | files
    (OUT / "files.json").write_text(json.dumps(listed))
    print(f"items: {len(files)} icons")


def between(page: str, tag: str, body: str, js: bool = False) -> str:
    a, b = (f"/* {tag}:start */", f"/* {tag}:end */") if js else (f"<!-- {tag}:start -->", f"<!-- {tag}:end -->")
    i, j = page.index(a) + len(a), page.index(b)
    return page[:i] + "\n" + body + "\n" + page[j:]


def main() -> None:
    (OUT / "img").mkdir(parents=True, exist_ok=True)
    worlds = worlds_ready()
    cands = [c for c in (json.loads(f.read_text()) for f in sorted(DATA.glob("w10_candidate_*.json"))) if c["key"] in ROSTER]
    # Only what the page shows: the heroes, every world's cast and any candidate still on offer.
    wanted = {foe["key"] for _k, info, _b in worlds for foe in info["foes"]} | {c["key"] for c in cands}
    figs: dict[str, dict] = {}
    for name, (_path, _cls, side, _world) in ROSTER.items():
        if side == "hero" or name in wanted:
            figs[name] = export_figure(name)
            print("figure", name)
    data = {"path_y": 123, "figs": figs, "worlds": [], "candidates": [c["key"] for c in cands]}
    sections, buttons = [], []
    for key, info, bd in worlds:
        n = int(key[1:])
        layers = export_world(key, bd)
        cast = [next(f["key"] for f in info["foes"] if f["kind"] == kind) for kind in KINDS]
        world = {"key": key, "n": n, "name": info["name_es"], "layers": layers, "cast": cast, "atmos": atmosphere(key, bd)}
        if "slots" in info:  # where this world's cast stands, if not at the usual places (a very large boss)
            world["slots"] = info["slots"]
        data["worlds"].append(world)
        sections.append(world_section(n, key, info, getattr(bd, "PREVIEW_BG", color("dusk", 3)), figs))
        if key == "w10" and cands:
            sections.append(candidates_section(cands, getattr(bd, "PREVIEW_BG", color("dusk", 3)), figs))
        buttons.append(f'        <button data-world="{key}" title="{esc(info["name_es"])}" aria-pressed="{"true" if not buttons else "false"}">{n}</button>')
        print("world", key)
    page = PAGE.read_text()
    page = between(page, "worldsel", "\n".join(buttons))
    page = between(page, "worlds", "\n".join(sections))
    items_html, item_files = items_section()
    page = between(page, "items", items_html)
    mock_html, mock_files = mockups_section()
    page = between(page, "mockups", mock_html)
    item_files |= mock_files
    page = between(page, "data", "  var DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";", js=True)
    PAGE.write_text(page)
    files = {f"img/{f.name}": str(f.relative_to(ROOT)) for f in sorted((OUT / "img").glob("*.png"))
             if f.stem.removeprefix("f_") in figs or f.stem.rsplit("_", 1)[0] in {k for k, _i, _b in worlds}}
    files |= item_files
    missing = sorted(set(re.findall(r'data-char="(\w+)"', page)) - set(figs))
    (OUT / "files.json").write_text(json.dumps(files))
    print(f"page: {len(worlds)} worlds, {len(figs)} figures, {len(files)} files; clips without a figure: {missing}")
