"""The animated START SCREEN proposal (lab only): the party fights each world's boss in turn — three seconds a world
— with no life bars and no real damage, and passes to the next world either fighting on (the boss swaps) or
by teleport (the arrival column). Builds the pieces a canvas in the lab plays:

    sh tools/assets/run.sh reel        # docs/redesign/lab/img/reel/*.png + docs/redesign/lab/title_reel.html

Everything comes from the game's own exports: backdrops (families/backdrop_wNN, back and fore), the figure
sheets (src/assets/strip/figs — only the rows the reel plays, the foes mirrored to face the party), the effects
atlas (src/assets/strip/fx — the arrival column, arrows, bolts, hits) and the title's logo and keys.
"""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

from .strip_pieces import backdrop, menu
from .icon_sets.s94_options import logo

ROOT = Path(__file__).resolve().parents[3]
FIGS = ROOT / "src" / "assets" / "strip" / "figs"
FX = ROOT / "src" / "assets" / "strip" / "fx"
LAB = ROOT / "docs" / "redesign" / "lab"
OUT = LAB / "img" / "reel"

BOSSES = ["crowmother", "mistletoe", "drownedmoon", "scapegoat", "abbot", "ninthwave", "amanita", "quench", "verdict", "unmaker"]
HERO_ANIMS = {
    "knight": ["idle", "attack", "attack2", "attack3", "cleave", "block"],
    "ranger": ["idle", "attack", "quick", "volley", "aimed"],
    "priest": ["idle", "attack", "cast", "attack2", "mend"],
}
BOSS_ANIMS = ["idle", "attack", "hurt"]
FX_KEYS = ["arrive_a_back", "arrive_a_front", "arrow", "arrow_heavy", "arrow_hit", "light_bolt", "light_hit", "foe_hit",
           "block_spark", "cleave_wave", "nova_hit", "heal_bloom"]


def figure_sheet(name: str, anims: list[str], flip: bool) -> dict:
    """Only the rows the reel plays, one row per animation, mirrored for a foe; returns its meta."""
    meta = json.loads((FIGS / "figs.json").read_text())["figs"][name]
    src = Image.open(FIGS / f"{name}.png").convert("RGBA")
    w, h = meta["w"], meta["h"]
    cols = max(meta["anims"][a]["n"] for a in anims)
    sheet = Image.new("RGBA", (cols * w, len(anims) * h), (0, 0, 0, 0))
    out = {"w": w, "h": h, "root": (w - 1 - meta["root"]) if flip else meta["root"], "ground": meta["ground"], "anims": {}}
    left = w
    for r, a in enumerate(anims):
        am = meta["anims"][a]
        for i in range(am["n"]):
            # a long animation wraps onto the next row of the sheet after `cols` frames (big figures: atlases stay ≤ 4096 px)
            fx, fy = (i % meta["cols"]) * w, (am["row"] + i // meta["cols"]) * h
            f = src.crop((fx, fy, fx + w, fy + h))
            if flip:
                f = f.transpose(Image.FLIP_LEFT_RIGHT)
            if a == "idle" and i == 0:  # the body's left edge low down (a stray crow or spark up high does not count)
                bb = f.crop((0, max(0, meta["ground"] - 46), w, meta["ground"])).getbbox()
                if bb:
                    left = bb[0]
            sheet.paste(f, (i * w, r * h))
        out["anims"][a] = {"row": r, "n": am["n"], "ms": am["ms"]}
    out["left"] = left  # the body's left edge in the frame (where the Knight stands against it)
    sheet.save(OUT / f"fig_{name}.png", optimize=True)
    return out


def fx_sheets() -> dict:
    data = json.loads((FX / "fx.json").read_text())
    pages = {i: Image.open(FX / f"fx_{i}.png").convert("RGBA") for i in {data["fx"][k]["page"] for k in FX_KEYS}}
    out = {}
    for key in FX_KEYS:
        m = data["fx"][key]
        page = pages[m["page"]]
        strip = Image.new("RGBA", (m["w"] * m["n"], m["h"]), (0, 0, 0, 0))
        for i in range(m["n"]):
            cx, cy = i % m["cols"], i // m["cols"]
            x0, y0 = m["x"] + cx * m["w"], m["y"] + cy * m["h"]
            strip.paste(page.crop((x0, y0, x0 + m["w"], y0 + m["h"])), (i * m["w"], 0))
        strip.save(OUT / f"fx_{key}.png", optimize=True)
        out[key] = {"w": m["w"], "h": m["h"], "ax": m["ax"], "ay": m["ay"], "n": m["n"], "ms": m["ms"]}
    return out


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for w in range(1, 11):
        back, fore = backdrop(w)
        back.save(OUT / f"bg_w{w:02d}.png", optimize=True)
        fore.save(OUT / f"fg_w{w:02d}.png", optimize=True)
        print("world", w)
    figs = {name: figure_sheet(name, anims, flip=False) for name, anims in HERO_ANIMS.items()}
    figs.update({name: figure_sheet(name, BOSS_ANIMS, flip=True) for name in BOSSES})
    fx = fx_sheets()
    logo().save(OUT / "logo.png")
    menu().save(OUT / "menu.png")
    meta = {"figs": figs, "fx": fx, "bosses": BOSSES}
    images = {p.stem: f"img/reel/{p.name}" for p in sorted(OUT.glob("*.png"))}
    template = (Path(__file__).parent / "title_reel.html").read_text()
    html = template.replace("/*META*/null", json.dumps(meta, separators=(",", ":"))).replace("/*IMG*/null", json.dumps(images))
    (LAB / "title_reel.html").write_text(html)
    print("reel: figs", len(figs), "fx", len(fx))
