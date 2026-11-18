"""Build the page that gets PUBLISHED as the lab artifact: ONLY WHAT IS PENDING the user's confirmation.

Rule set by the user on 2026-11-15: "De ahora en adelante el lab no incluirá cosas ya confirmadas… Deja solo las
cosas por confirmar". The full record stays in docs/redesign/lab/index.html (hand-written blocks + the regions
`run.sh lab` regenerates); THIS script takes from it only what docs/redesign/lab/pending.json lists and writes a
slim page, with every image inlined as a data URI (the artifact holds at most 511 files).

    python3 tools/assets/lab_publish.py        # from the repo root

Writes tools/assets/out/lab/publish/index.html — publish THAT file to the lab's URL. When the user confirms
something, remove it from pending.json (a whole section, or add its heading to the section's "skip") and rebuild.

pending.json: {"updated", "intro", "sections": [ … ]}; a section is one of
  {"id", "from": "<section id in index.html>", "title"?, "skip"?: [heading prefixes], "questions"?: […]}
  {"id", "title", "eyebrow"?, "text"?, "questions"?, "items"?: [{"title", "text"?, "img"}],
   "html"?: "<file under docs/redesign/lab/ with ready-made item groups>"}
"""
from __future__ import annotations

import base64
import html as html_lib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LAB = ROOT / "docs" / "redesign" / "lab"
OUT = ROOT / "tools" / "assets" / "out" / "lab" / "publish"

EXTRA_CSS = """
.pending-index { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
.pending-index a { color: var(--gold); text-decoration: none; }
.pending-index a:hover { text-decoration: underline; }
.ask { border: 1px solid var(--peach); background: var(--panel); padding: 12px 14px; display: grid; gap: 6px; }
.ask b { color: var(--peach); font: 500 12px/1 var(--f-mono); letter-spacing: .14em; text-transform: uppercase; }
.ask ol { margin: 0; padding-left: 20px; display: grid; gap: 4px; }
table.rv { border-collapse: collapse; width: 100%; max-width: 980px; font-size: 14px; }
table.rv th, table.rv td { border: 1px solid var(--line); padding: 6px 9px; text-align: left; vertical-align: top; }
table.rv th { color: var(--peach); font: 500 12px/1.2 var(--f-mono); letter-spacing: .08em; text-transform: uppercase; }
table.rv td:first-child { white-space: nowrap; color: var(--gold); }
.item-group > p { max-width: 980px; margin: 0; }
"""


def esc(text: str) -> str:
    return html_lib.escape(text, quote=True)


def section_of(page: str, sec_id: str) -> str:
    """The whole <section id=…>…</section> of the full page."""
    match = re.search(rf'<section id="{re.escape(sec_id)}">.*?</section>', page, re.S)
    if match is None:
        raise SystemExit(f"pending.json names section '{sec_id}', which docs/redesign/lab/index.html does not have")
    return match.group(0)


def groups_of(section: str) -> tuple[str, list[str]]:
    """A section's head (everything before its first item group) and its item groups."""
    parts = re.split(r'(?=<div class="item-group">)', section)
    head, groups = parts[0], parts[1:]
    if groups:
        groups[-1] = re.sub(r"\s*</section>\s*$", "", groups[-1])
    else:
        head = re.sub(r"\s*</section>\s*$", "", head)
    return head, groups


def questions_html(questions: list[str]) -> str:
    if not questions:
        return ""
    items = "".join(f"<li>{esc(q)}</li>" for q in questions)
    return f'<div class="ask"><b>Para confirmar</b><ol>{items}</ol></div>'


def from_page(page: str, spec: dict) -> tuple[str, str]:
    section = section_of(page, spec["from"])
    head, groups = groups_of(section)
    skip = spec.get("skip", [])
    kept = []
    for group in groups:
        title = re.search(r"<h3>(.*?)</h3>", group, re.S)
        name = html_lib.unescape(re.sub(r"<[^>]+>", "", title.group(1))).strip() if title else ""
        if any(name.startswith(prefix) for prefix in skip):
            continue
        kept.append(group)
    if "title" in spec:
        head = re.sub(r"<h2>.*?</h2>", f"<h2>{esc(spec['title'])}</h2>", head, count=1, flags=re.S)
    heading = re.search(r"<h2>(.*?)</h2>", head, re.S)
    name = html_lib.unescape(re.sub(r"<[^>]+>", "", heading.group(1))).strip() if heading else spec["id"]
    head = head.replace(f'<section id="{spec["from"]}">', f'<section id="{spec["id"]}">', 1)
    body = head.rstrip() + "\n" + questions_html(spec.get("questions", [])) + "\n" + "".join(kept) + "\n</section>"
    return name, body


def own_section(spec: dict) -> tuple[str, str]:
    out = [f'<section id="{spec["id"]}">', '<div class="sec-head">']
    if "eyebrow" in spec:
        out.append(f'<span class="eyebrow">{esc(spec["eyebrow"])}</span>')
    out.append(f'<h2>{esc(spec["title"])}</h2>')
    if "text" in spec:
        out.append(f'<p class="muted">{esc(spec["text"])}</p>')
    out.append("</div>")
    out.append(questions_html(spec.get("questions", [])))
    for item in spec.get("items", []):
        out.append('<div class="item-group">')
        out.append(f'<h3>{esc(item["title"])}</h3>')
        if "text" in item:
            out.append(f'<p class="muted">{esc(item["text"])}</p>')
        out.append(f'<img class="px" src="{esc(item["img"])}" alt="{esc(item["title"])}" '
                   'style="width:100%;height:auto;border:1px solid var(--line)">')
        out.append("</div>")
    if "html" in spec:
        out.append((LAB / spec["html"]).read_text())
    out.append("</section>")
    return spec["title"], "\n".join(out)


def main() -> None:
    page = (LAB / "index.html").read_text()
    spec = json.loads((LAB / "pending.json").read_text())
    head_end = page.index("</style>") + len("</style>")
    head = page[:head_end].replace("</style>", EXTRA_CSS + "</style>", 1)

    built = [from_page(page, s) if "from" in s else own_section(s) for s in spec["sections"]]
    index = "".join(f'<li><a href="#{s["id"]}">{esc(name)}</a></li>' for s, (name, _) in zip(spec["sections"], built))
    body = f"""
<div class="wrap">
  <header class="top">
    <span class="eyebrow">Taskbar Legion · rediseño</span>
    <h1>Laboratorio: por confirmar</h1>
    <p class="muted">{esc(spec["intro"])}</p>
    <div class="status">
      <span class="chip on">{len(built)} cosas pendientes</span>
      <span class="chip">Actualizado {esc(spec["updated"])}</span>
    </div>
    <ul class="pending-index">{index}</ul>
  </header>
{chr(10).join(section for _, section in built)}
</div>
"""
    out = head + "\n" + body

    cache: dict[str, str] = {}
    missing: list[str] = []

    def inline(match: re.Match[str]) -> str:
        rel = match.group(0)
        path = LAB / rel
        if not path.is_file():
            missing.append(rel)
            return rel
        if rel not in cache:
            mime = "image/gif" if rel.endswith(".gif") else "image/png"
            cache[rel] = f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode()
        return cache[rel]

    out = re.sub(r"img/[a-z0-9_]+/[A-Za-z0-9_]+\.(?:png|gif)", inline, out)

    def inline_audio(match: re.Match[str]) -> str:  # the sound section's players: audio/<channel>/<file>.mp3
        rel = match.group(1)
        path = ROOT / "src" / "assets" / "audio" / rel
        if not path.is_file():
            missing.append(rel)
            return match.group(0)
        return 'src="data:audio/mpeg;base64,' + base64.b64encode(path.read_bytes()).decode() + '"'

    out = re.sub(r'src="audio/([a-z]+/[A-Za-z0-9_]+\.mp3)"', inline_audio, out)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "index.html").write_text(out)
    print(f"pending page: {len(built)} sections, {len(cache)} images inlined, {len(out) / 1e6:.1f} MB → {OUT / 'index.html'}")
    for name, section in built:
        print(f"  · {name}: {section.count('item-group')} groups")
    if missing:
        print("referenced but not found next to the page:", ", ".join(sorted(set(missing))))


if __name__ == "__main__":
    main()
