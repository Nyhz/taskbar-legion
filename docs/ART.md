# ART.md — Procedural pixel-art (no external assets)

**Decision:** all art is generated in code — no PNGs, no Aseprite files, no atlases shipped. We build a small
set of procedural texture generators that draw pixel-art-styled sprites once into Pixi `RenderTexture`s (or
canvas → texture), cache them, and reuse. This keeps the build fully self-contained, deterministic, and
screenshot-verifiable, and it sidesteps the asset pipeline the SPEC assumed (which we're deliberately not
using for the oneshot). The `ItemInstance`/`PetDef` `sprite` fields still exist as keys, but they resolve to
a procedural generator, not a file.

## Principles

- **Generate once, cache, reuse.** Build each texture at app start (or first use) into a `Map<key, Texture>`.
  Never redraw per frame. Pool dynamic objects (floating text).
- **Pixel-art discipline.** Draw on a small logical grid (e.g. 16×16 or 24×24 per sprite), then scale up
  with **nearest-neighbor**. Set `texture.source.scaleMode = 'nearest'` and CSS `image-rendering: pixelated`.
  Keep positions integer-snapped to avoid shimmer.
- **Readable silhouettes over detail.** At ~16px, shape + 2–3 palette colors + an outline reads better than
  gradients. Give each class/enemy a distinct silhouette and accent color.
- **Tiers communicate through color** (see palette). Item frames, drops, and popups tint by tier.
- **Deterministic.** If a generator uses randomness (e.g. enemy variation), seed it from a stable key so the
  same enemy looks the same — do NOT use `Math.random` for anything that must be stable. (Cosmetic-only
  randomness that never affects sim may use a local seeded rng, but prefer stable keyed generation.)

## How to draw (two viable techniques — pick per sprite)

1. **Pixi `Graphics` → `RenderTexture`.** Compose rects/polys with the palette, then
   `renderer.generateTexture(graphics)`. Best for geometric sprites (heroes, enemies, props, UI chrome bits).
2. **Offscreen `<canvas>` pixel writes → `Texture.from(canvas)`.** Draw pixel-by-pixel (or small rect runs)
   for more controlled pixel art (portraits, item icons, gems). Good when you want explicit per-pixel control.

Both end as a cached `Texture`. A tiny helper module (`game/render/textures.ts`) should expose
`getHeroTexture(classKey)`, `getEnemyTexture(kind, stageTint)`, `getItemIcon(slot, tier)`, `getGemIcon(gem)`,
`getPetTexture(petKey)`, etc., each memoized.

## Sprite inventory (what to generate)

| Sprite | Size | Notes |
|---|---|---|
| Hero (per class) | ~16×20 | Distinct silhouette + accent per class; small idle bob + attack lunge via transform, not new frames. |
| Enemy (a few kinds) | ~16×18 | Tint/scale by stage to imply scaling; bosses larger + crowned. |
| Zone boss | ~28×28 | Bigger, distinct, menacing accent. |
| Strip backdrop | strip-wide | Layered bands (sky/ground/parallax silhouettes) that scroll with `camera`. |
| Chest props | ~14×12 | One per type (normal/stageBoss/zoneBoss) tinted differently. |
| Item icon | 16×16 | Per slot-category glyph (sword/shield/ring/…) on a tier-colored frame. |
| Gem icon | 12×12 | Faceted gem in the gem's color. |
| Pet | ~14×14 | Small companion that walks with the party (cosmetic). |
| Effect/buff icon | 12×12 | Simple glyph per effect; green tint = buff, red = debuff. |
| Ability cooldown pip | 8×8 | Radial/sweep fill. |
| UI chrome | 9-slice | `PixelWindow` border, title bar, slot frames — can be CSS for React panels; Pixi for in-strip. |

Animation = **transform tricks, not frame sheets**: idle bob (sin offset), attack lunge (brief x-nudge),
hit flash (white tint pulse), death (fade + fall). Cheap, deterministic, and plenty juicy for an idle game.

## Palette (base UI / world)

Dark, ornate, pixel-RPG. Use these as the foundation; extend as needed but keep it cohesive.

```
bg-deep      #14121a   page background
bg-panel     #221c2b   panel fill
bg-inset     #2e2535   inset/slot wells
ink          #0d0b12   outlines / pixel borders
parchment    #d9c9a3   light insets / text on dark
gold         #e8b24c   accents, gold counter, title flourish
gold-dim     #9c7a2e
title-red    #6e1f24   deep-red title bars (SPEC §7 aesthetic)
title-red-hi #a8323a
text-light   #e7e1d6
text-mute    #9b91a6
hp-green     #4caf50
hp-back      #3a2030
enemy-accent #c0473a
xp-blue      #4a78d6
research     #6fd1c4
```

## Tier colors (SPEC §4.3 — the one palette that's gameplay-meaningful)

| Tier | Name (EN) | Color | Hex (starting point — tune for contrast) |
|---|---|---|---|
| T0 | Normal | grey | `#9b9b9b` |
| T1 | Uncommon | green | `#4caf50` |
| T2 | Rare | blue | `#3d7fe0` |
| T3 | Epic | purple | `#9b4dca` |
| T4 | Legendary | orange | `#e08a2e` |
| T5 | Mythic | red | `#d33d3d` |
| T6 | Ancestral | teal | `#2bb6a8` |
| T7 | Divine | gold | `#e8c34c` |
| T8 | Primordial | rainbow/iridescent | animated hue-cycle / gradient (special-case in render) |

These hexes live in `data/tiers.ts` as `TierDef.color` (T8 may store a sentinel like `'iridescent'` that the
renderer special-cases with a hue cycle). Every tier-colored surface (item frames, drop popups, equipment
slot tints, tooltips) reads from there — never hardcode a tier color in a component.

## Verification

Pixel art must be legible at the default size and crisper when zoomed (1×/1.5×/2×). For 1.5×, render at 2×
and downscale or snap positions (SPEC §3b) to avoid blur. Each render phase's screenshot gate is where you
confirm sprites read clearly and tiers are distinguishable at a glance.
