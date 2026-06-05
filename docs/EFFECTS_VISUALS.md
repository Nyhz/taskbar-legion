# EFFECTS_VISUALS.md — the combat-FX visual language

> Render-only. Lives entirely in `src/game/render/`; reads sim state, never mutates it.
> Every ability, buff and debuff in the game now reads as ONE of a small, bold, consistent
> set of overlays so the strip feels like a fireworks spectacle.

## The vocabulary

Effects are classified by `effectAuras.categorize()` (a pure function of the effect def) into
one visual category. The body sprites (`HeroSprite`, `EnemySprite`) draw the matching overlay
every frame from the combatant's live `effects`:

| Category | Trigger | Visual |
|---|---|---|
| **offense** | any *beneficial* statMod that isn't a defensive stat (attack speed/damage, crit, crit-dmg, CDR, lifesteal, heal power…) | **bright green arrows surging UP** over the body (3, staggered, glowing) |
| **defense** | beneficial statMod on a defensive stat (`damageReduction`, `armor`, `magicResist`, `health`, `hpRegen`, `block`) | **glowing blue shields DANCING** around the body (orbit + bob, depth-scaled) |
| **debuff** | any *non-beneficial* effect (statMod, weaken, vulnerable, root, silence, frozen…) | **angry red arrows sinking DOWN** over the body |
| **shield** | absorb (`fx_shield`) | **WoW-style yellow absorb bar** over the HP bar — anchored at the right edge, grows left with the shield size, shrinks as it's eaten, drawn ON TOP of the HP fill |
| **hot** | heal-over-time (`fx_hot`) | the heal-sparkle PNG plays on the healed ally each tick (pre-existing) |
| **invuln** | total immunity (`fx_invuln`, Knight Last Stand) | pulsing yellow shield **bubble** around the hero (pre-existing) |

Cast flourishes (every ability) still fire on cast: the ability's own icon rises from the
caster + a colored burst ring (offense=amber, support=mint).

## World-space AoE spectacles (`WorldFx.ts`)

Wave/party-wide abilities additionally play a big overlay across the target band, fired from
their `cast` event in `GameStrip.spawnAoeFx`:

| Ability | Spectacle |
|---|---|
| Ranger **Raining Arrows** | a dense volley of `arrow.png` arcs down out of the sky onto the wave, sticks, fades |
| Ranger **Frozen Trap** | an icy pool spreads under the wave (crystal shards + drifting frost), lingering the slow's 4s |
| Priest **Holy Nova** | a golden ring + radiating rays + sparkles burst through the wave |
| Knight **Battle Cry** | an amber war-cry shockwave rolls out over the party |
| World-boss **Frenzy** (Inferno+) | a fast cast bar fills under the boss, then a red aura pools at its feet while it swings 50% faster |
| World-boss **Mortal Wound** (Torment) | a cast bar fills, then a heavy strike on the tank + crossed-out green heal crosses float over it while its healing is cut |

## Full coverage table — ability → effect → visual

### Knight
| Ability | Applies | Visual added |
|---|---|---|
| Stone Skin | `buff_guard_block` (damageReduction) | **defense → dancing blue shields** (replaced the old particle puff) |
| Debilitating Strike | bonus damage + `debuff_weaken` | hit number/swing + **red down-arrows on the struck enemy** for the debuff's life |
| Bulwark | `fx_shield` (self, ~30–50% HP) | **yellow shield bar** over his HP |
| Battle Cry | `buff_battlecry_ad` + `buff_battlecry_crit` (party) | **green up-arrows on every ally** + an **amber war-cry shockwave** over the party |
| Bloodlust | `buff_bloodlust_as` + `buff_bloodlust_ls` | **green up-arrows** |
| *Last Stand* (ult) | `fx_invuln` | pulsing **yellow invuln bubble** |
| *Retribution* (passive aura) | always-on party +dmg | no transient FX (permanent passive, intentionally quiet) |

### Ranger
| Ability | Applies | Visual added |
|---|---|---|
| Rapid Fire | `buff_fast_fire` | **green up-arrows** |
| Aimed Shot | charged `fx_damage` | bow draw + arrow projectile + big crit number (pre-existing) |
| Raining Arrows | `fx_damage` to all | **arrow rain** over the wave |
| Hunter's Focus | `buff_focus_crit` + `buff_focus_critdmg` | **green up-arrows** |
| Frozen Trap | `debuff_frozen` to all | **frost pool** on the ground + **red down-arrows on each enemy** |
| *Mark of the Hunter* (ult) | `fx_mark` (vulnerable) | **red down-arrows on the boss** |

### Priest
| Ability | Applies | Visual added |
|---|---|---|
| Mend | `fx_hot` | heal-sparkle PNG on the target each tick (pre-existing) |
| Power Infusion | `buff_infusion_as` + `buff_infusion_cdr` | **green up-arrows** on the buffed DPS |
| Holy Shield | `fx_shield` (tank) | **yellow shield bar** over the tank's HP |
| Holy Nova | `fx_damage` to all | **holy nova** golden burst over the wave |
| *Battle Enrage* (ult) | `buff_enrage_as` + `buff_enrage_cdr` (party) | **green up-arrows** on the party |

### Enemies / world bosses
| Ability | Applies | Visual added |
|---|---|---|
| Dark Bolt / Brutal Smash / Piercing Shot | `fx_damage` (front hero) | cast flourish + projectile/swing + damage number (pre-existing) |
| World-boss **Frenzy** (Inferno+) | self `buff_boss_frenzy` (+attack speed) | 1.5s **cast bar** under the boss → **red foot aura** while frenzied |
| World-boss **Mortal Wound** (Torment) | `fx_damage` (tank) + `debuff_mortal_wound` (healing −25%) | 1.5s **cast bar** → heavy strike + **crossed-out heal crosses** over the tank |

### Generic / latent effects (data-driven, ready if any future ability applies them)
`debuff_expose`, `debuff_chill`, `debuff_root`, `debuff_silence`, `fx_mark` → **red down-arrows**;
`fx_dot` (Bleed) → categorized `dot` (tick numbers); `buff_arcane_*`, `buff_flurry_*` → **green up-arrows**.

## Files
- `src/game/render/effectAuras.ts` — categorization + arrow/shield draw helpers + shield-bar overlay.
- `src/game/render/WorldFx.ts` — the transient AoE-spectacle layer.
- `HeroSprite.ts` / `EnemySprite.ts` — draw category auras + shield bar from live effects.
- `GameStrip.ts` — owns the `WorldFxLayer`, fires AoE spectacles off `cast` events.
