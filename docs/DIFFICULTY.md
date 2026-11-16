# DIFFICULTY.md — The finite, multi-difficulty model (CANONICAL)

> **⚠️ This is the CANONICAL scaling doc.** It replaced the old infinite-scaling model (retired): wherever
> `BALANCE.md` or `SPEC.md` still describe infinite stages, world-depth-scaled rarity, or a "world 100 ≈ 1 year"
> tail, **this file wins.** The game is a **finite 5-difficulty** structure. The still-valid machinery in
> `stageScaling.ts` (the polynomial Φ curve, decoupled enemy scales — anchored tables since 2026-11-15, §6b —,
> `expectedLevel`, mitigation) is **re-parameterized**, not discarded.
>
> Decided 2026-06-03. Status: **Phase 0 (spec + spine) — pending sign-off.** See `docs/PROGRESS.md` for phases.

---

## 1. What the game is now

Five **difficulties**, each a full **10 worlds × 10 stages = 100 stages**. You play them in order — Normal →
Hell → Inferno → Eternal → Torment — and **everything carries over** (heroes, levels, gear, gems, tech). Each
difficulty replays the same 1-1 → 10-10 layout, harder, and **unlocks one new top gear/gem tier**. Torment is
the designed endgame; after it you chase **T8 perfection** and wait for content (Torment II/III…).

The game is **finite and bounded** — and that is the whole point. With a known maximum player power (top tier ×
`MAX_LEVEL` × maxed talents/tech) and 500 discrete stages, every enemy number and drop weight is **solved
backwards from a per-gate target** (the spine, §9) instead of chasing an asymptote toward infinity. This also
retires the e42-number problem the polynomial rework was fighting — 500 bounded stages stay readable.

**Clean slate.** This restructures stage/difficulty state; in-development infinite-progression saves are **not
migrated** — the migrate path resets to Normal 1-1.

## 2. Structure & navigation

- **Difficulty** `d ∈ {Normal, Hell, Inferno, Eternal, Torment}` (indices 0–4).
- **World** `w ∈ 1..10`, **stage-in-world** `p ∈ 1..10`. Displayed as `w-p` (e.g. `3-7`).
- **Global index** (engine-internal scaling anchor): `G = d·100 + (w-1)·10 + p`, so `G ∈ [1..500]`, monotonic.
  Enemy power is a continuous finite curve over `G`; the difficulty/world/stage triple is just its display
  decomposition. Drops are gated by **difficulty** (the locked tables, §4), independent of `G`.
- **Unlocks:** stages unlock sequentially (clear `w-p` → `w-(p+1)` available); difficulties unlock by clearing
  the prior difficulty's **10-10**.
- **Free select (the farm UI):** a **difficulty dropdown** (among unlocked) + **any cleared stage** within it.
  Stuck at a wall? Drop back and grind the stage below it.

**Advance / Retry rules** (the run loop, Phase 5):
- Beat a stage **for the first time** → **auto-advance** to the next stage.
- Beat a stage you've **already cleared** (you dropped back to farm) → **stay and loop** it.
- **Retry toggle** (bottom-right of the GameStrip): **ON** → a wipe keeps you in the current stage; **OFF** → a
  wipe **drops you down one stage**.

## 3. Difficulty ↔ tier ladder

Gear **and gems** share the same per-difficulty tier ceiling:

| Difficulty | New tier unlocked | Drop pool |
|---|---|---|
| Normal | T4 | T0–T4 |
| Hell | T5 | T0–T5 |
| Inferno | T6 | T0–T6 |
| Eternal | T7 | T0–T7 |
| Torment | T8 | T0–T8 |

Tier power (from `data/tiers.ts`, unchanged): statMultiplier `T0 1.0 · T1 1.2 · T2 1.45 · T3 1.8 · T4 2.3 ·
T5 3.0 · T6 4.2 · T7 6.0 · T8 9.0`, with substats `0,1,1,2,2,3,3,4,4` and sockets `0,0,1,1,2,2,3,3,4`. A
full-kit one-tier jump (mult step ~1.2–1.5× **plus** an extra substat and often a socket+gem) is a real power
spike — that spike is what breaks each difficulty's walls. **`unlockStage` on tiers is replaced by a
per-difficulty cap** (Phase 1/3): a tier can drop once its difficulty is reached, governed by the tables below.

## 4. Drop tables — the per-world ladder (user decision, 2026-11-15)

Each difficulty has ONE table, but it is the table of its **last world**. The worlds climb to it: world 1 of a
difficulty rolls the **previous difficulty's** table (Normal's world 1 rolls a starter table), world 10 rolls the
difficulty's own, and the worlds between a straight blend of the two (`data/difficulties.tierWeightsAt`). *(This
replaces the flat "one locked table per difficulty, no depth-gate" rule, under which a legendary could drop at
stage 1-1.)*

| Table (relative weights, rows sum to 100) | T0 | T1 | T2 | T3 | T4 | T5 | T6 | T7 | T8 |
|---|---|---|---|---|---|---|---|---|---|
| Starter (Normal, world 1) | 80 | 18 | 2 | – | – | – | – | – | – |
| **Normal** (world 10) · Hell world 1 | 40.5 | 32.7 | 21.8 | 4 | **1** | – | – | – | – |
| **Hell** (world 10) · Inferno world 1 | 12.5 | 26.44 | 34.91 | 21.15 | 4 | **1** | – | – | – |
| **Inferno** (world 10) · Eternal world 1 | 7.5 | 15.81 | 25.3 | 29.52 | 16.87 | 4 | **1** | – | – |
| **Eternal** (world 10) · Torment world 1 | 4.5 | 10.52 | 17.89 | 25.26 | 22.1 | 14.73 | 4 | **1** | – |
| **Torment** (world 10) | – | 5.5 | 12.64 | 20.01 | 25.26 | 18.95 | 12.64 | 4 | **1** |

So a difficulty's **new top tier** is absent in its first world, shows up at 0.1 % in the second and reaches its
**1 %** — the chase — only in the last. In Normal: no epics or legendaries in world 1; epics from 0.4 % (world 2)
to 4 %, legendaries from 0.1 % to 1 %.

*(User, 2026-11-16, round 4: the two top tiers of every row HALVED — 2 → 1 and 7.5 → 4. At 2 % a Torment run saw
60–75 T8 pieces and the party ended with 21–22 T8 of its 30 slots. The 4.5 points went to the middle tiers — those
between the row's lowest tier with weight and its second-highest — in proportion to their weight.)*

**The real treadmill is affix quality, not tier.** A cap-tier drop still has to be the *right slot* with
*better rolls* than what you wear; we model the **upgrade rate**, not the raw drop rate, against the timeline.

**Chests** (`data/chests.ts`): a common chest rolls the table of its drop stage as it is; a **boss chest lifts
the two top rarities** of that table — **×1.5** for a stage boss, **×3** for a world boss — and scales the rest
down so it still sums to 100 (`chestTierWeightsAt`; user, 2026-11-16). Gem chance differs too (common 10 %,
stage-boss 50 %, world-boss 100 %). Cadence (user decisions,
2026-11-15): a **common chest** drops on **0.2 %** of kills — about one every five minutes of play, so the storage
of 6 fills in half an hour (it was 1.5 %: one or two a minute); a stage boss drops its chest **25 %** of the time,
a world boss always. Gems roll on the same table (boss lift included), as an **extra** roll on top of the item.

## 5. Bosses — two roles

- **Stage bosses** (end of every stage, `w-1 … w-9`) — **soft walls.** They bite an under-geared party but a
  current-difficulty kit passes them; survival-gated, no hard enrage cliff. Pacing texture, not gates.
- **World bosses** (`w-10`, ten per difficulty) — **hard walls by design.** Each is tuned **above** the gear you
  arrive at that world with, forcing you to farm that world's stages for upgrades. They escalate `1-10 < 2-10 <
  … < 10-10`. A world boss is **a wall even for a decently-geared party** — the breakthrough is a higher-tier
  drop in your key slots, not a few more levels.
- **`10-10` = the difficulty gate.** The biggest wall in the difficulty; clearing it unlocks the next
  difficulty. Calibrated to require the difficulty's **new top tier** in core slots (§9).

**The enrage (user, 2026-11-15, round 2 of the pacing retune).** A boss hits as written for **60 s**
(`ZONE_ENRAGE_MS`, `STAGE_ENRAGE_MS`; it was 30 s) and then its damage **doubles every 2 s**
(`BOSS_ENRAGE_RAMP_MS`; it was 5 s): the fight is meant to END at the window. The intent: a party *geared at
80–90 % of the zone* kills the world boss at about 60 s; with less it must hold some seconds of enrage; with far
less it does not make it. "Geared at X % of the zone" is measured, not felt — `test/sim/probe/zoneGear.ts`: the
damage the party deals to the world boss in its 60 s ÷ the damage the same heroes deal in *the zone set* (the best
of 240 stage-boss chests of that world, gems socketed, mean of five draws). Measured: the average player kills its
wall with the boss's clock at 65–75 s (5–15 s of enrage held); a Normal wall asks for ~10 % of the zone set, a
mid-Hell wall ~85 %, late Hell and Inferno ~105 %. **Open (the user's call):** there is no "full zone set" in this
itemisation — the set's damage keeps growing ~×1.4 per doubling of chests, with no plateau at 2,000 — so what
counts as 100 % is a convention still to be chosen, and the walls are still tuned by hours, not by that share.
Wall LIFE (`WORLD_WALL_MULT`) and wall DAMAGE (`ZONE_BOSS_DMG_MULT`) are separate knobs; the damage is soft against
Eternal/Torment tanks (they hold ×100 of it) — that is where boss mechanics and affixes come in. See
`docs/redesign/PACING_REPORT.md`, "Ronda 2".

**World-boss ability escalation:** on every difficulty a world boss has its **area blow** (the Shockwave, §5b);
on Normal/Hell that is all it has, then it gains **special abilities at the higher difficulties**. Each special
**channels for 1.5s** (a cast bar fills under the boss) before it resolves, telegraphing the cast.
*(Before 2026-11-15 this read "pure stat walls on Normal/Hell … no party-wide AoE": §5b overrides that.)*

> **SUPERSEDED 2026-11-15 by the BOSS KIT** (`src/data/bossKit.ts`, rules in `src/sim/bossMechanics.ts`; agreed in
> `docs/redesign/PROGRESS.md` "Combate, segunda ola", C and D). A boss is now **its area blow + affixes + (world
> bosses) a mechanic of its own**. The table below is kept as history: Frenzy is the *Frenético* affix (a stack of
> +5 % attack speed every 5 s, no cast) and Mortal Wound the *Herida mortal* affix (150 % of the hit from a stage
> boss, 250 % from a world boss) — two of seven (Acorazado, Vampírico, Frenético, Sísmico, Venenoso, Certero,
> Herida mortal; Vampírico is a stage boss's alone). **Stage bosses** carry none in Normal, one from Hell, two in
> Eternal and Torment; **world bosses** carry one from Inferno and two in Torment, on top of their mechanic
> (one per world: Bandada, Raíces, Rayo en cadena, Culpa, Silencio dorado, Resaca, Esporas, Hoja al rojo, Balanza,
> Espejos; mild in Normal, tightening by difficulty). Affixes are picked from the run's seed and the stage alone. Strengths are conservative until the
> final pacing pass. The world-10 boss's Espejos has two more parts (2026-11-16, `MECHANIC.mirror`): each cast
> (every 8 s) lights one of its **six mirrors** (+5 → +10 % damage each) and with all six lit — the 49th second —
> it breaks them over the whole party (120 → 220 % of its hit, an area blow); and every second mirror lets out a
> **dark reflection** of the hero it copied (a summon: 8 s, 1.5 × a normal enemy's life, 80 → 140 % of a normal
> enemy's hit at that hero's pace, on the back line from half-way between it and the tank; never two at once).

| Difficulty | Special abilities | Cadence (from engage) |
|---|---|---|
| Normal · Hell | Shockwave only (§5b) | every 10s, first cast starts at 4s |
| **Inferno · Eternal** | **Frenzy** — self-buff: +50% attack speed for 6s | every **15s**, first at **7.5s** |
| **Torment** | Frenzy **+ Mortal Wound** — a strong hit that cuts the tank's **healing received −25% for 8s** | Mortal Wound every 15s from **0s** → interleaved with Frenzy, **one cast ~every 7.5s** |

Each ability has its own read: Frenzy = a **red aura at the boss's feet**; Mortal Wound = **crossed-out heal
crosses** over the wounded tank. Data-driven (`data/abilities.ts` `WORLD_BOSS_ABILITIES` + per-ability
`openerMs` / `castTimeMs`; the heal cut is the `healReduction` effect kind). This is *why* the replay is a new
fight, not just bigger numbers.

## 5b. The back line takes damage (user decision, 2026-11-15)

**Overrides SPEC's tank-only targeting and the "pure stat wall" line above.** Until this rule every enemy attack
and ability landed on the front hero, at every stage, so nothing ever hurt the Ranger or the Priest while the
Knight stood — and the talents that protect the party (Vanguard, Warden, Shared Skin, Mending Bulwark, Living
Wall, the Priest's party heals) had nothing to do. The user kept the talents and chose **two** sources of damage
behind the front hero, at a **medium** dose: *about 25–30 % of what an ordinary wave deals lands behind the
front hero* (full party, ranged enemies at full weight); the Knight still holds the fight.

1. **Shooters aim behind the tank.** A share of an archer's basic shots goes to another hero, picked at random
   (the reach gate stays the front hero's), and its charged shot — **Arcing Shot** (was Piercing Shot) — always
   does. With nobody behind, they land on the front hero and no target is rolled (a solo Knight's fight draws
   the same random numbers as before).
2. **Area blows.** The brute's **Brutal Smash** and one **telegraphed** attack per boss — **Ground Slam** (every
   stage boss) and **Shockwave** (every world boss, on every difficulty) — hit the front hero in full and every
   other living hero for a reduced splash. While a boss winds its blow up (1.5 s, the cast bar) it makes **no
   basic attacks**, and the blow carries the boss's enrage on the front hero only: the tank's load is what the
   missed swings would have been, the enrage stays his to hold.

Every hit is mitigated by **its own target** (armour / magic resist, damage reduction, shields, invulnerability),
so the party auras apply. Not chosen, so not built: beasts slipping past the tank, a growing periodic pulse.

| Number | Value | Where |
|---|---|---|
| Archer basic shots aimed behind | **25 %** | `data/enemies.ts` `ARCHER_BACK_SHOT_CHANCE` (`EnemyKind.backShotChance`) |
| Arcing Shot | **0.7×** a normal attack, 7 s, target `backEnemy` (was 1.6× on the front hero) | `data/abilities.ts` `enemy_aimed` |
| Brutal Smash | 2.2× in front (unchanged), **0.3×** to each other hero | `enemy_smash` (`splashCoeff`, `WHOLE_PARTY`) |
| Ground Slam (stage bosses) | **1.2×** in front, **0.6×** behind · every 10 s, first at 4 s, 1.5 s windup, holds its swings | `boss_slam`, `stageBossAbilityKeys()` |
| Shockwave (world bosses) | the same numbers | `boss_shockwave`, `WORLD_BOSS_ABILITIES` (min. difficulty 0) |

Measured with `npx vite-node scripts/measure-backline.ts` (the probe's own parties, the real sim, both rules on
the same parties). At these numbers, damage landing behind the front hero: **waves 25–31 %** from the first full
party through Inferno (22–31 % sample to sample), drifting to **38–44 % in Eternal** (the Knight's mitigation
outgrows the others' — to be looked at in the pacing retune); **stage bosses 14–35 %** (0 % when the boss dies
before its first slam); **world bosses 17–26 % before the enrage** (1–16 % over a whole wall attempt, where the
enraged swings on the tank dominate). Hardest single hit behind the tank: 3–9 % of that hero's life in waves,
up to 15 % from a world boss on a badly under-levelled recruit. On the same parties the rule changes neither
clear times (±3 %) nor world-boss wins, and adds no deaths behind the tank in the sampled stages. These numbers
are **provisional**: they belong to the pacing retune like every other wall number.

## 6. The scaling model (finite, continuous, gear-anchored)

Global enemy power is a **continuous, monotonic finite curve over `G ∈ [1..500]`** — not a sawtooth. The stage
*counter* resets each difficulty, but enemy *power* keeps rising (Hell 1-1 is a step above Normal 10-10, like
D2 Nightmare act 1 > Normal act 5). Gear carries over, so player power is continuous too; the curve is anchored
to **expected gear power**, which is exactly why it's bounded and solvable.

Three independent scales (preserving the decoupled design — memory `enemy-scaling-decoupled`), each with **its
own table** since the 2026-11-15 retune (§6b):

- **Trash / normal enemies** — anchored to **2–3 hits** of the on-gear party's hardest hitter (`GRUNT_HP_TUNE`);
  elites have 4.5 times a grunt's life (about 11 hits). Trash is never the wall, it's texture.
- **Stage bosses (`w-1..w-9`)** — **5–10 seconds** against the on-gear party (`STAGE_BOSS_HP_TUNE`); a fight, not
  a gate.
- **World bosses (`w-10`)** — the walls (`WORLD_WALL_MULT`), tuned for the length of their world (§8), not for a
  number of seconds.

**Difficulty multiplier `D(d)`** sets each difficulty's floor above the previous ceiling: `D(d+1)·B(1) >
D(d)·B(100)`, with the *step* sized so the difficulty's **new tier (+ accumulated gems/levels)** is what bridges
it. The `10-10` gate + the `D(d+1)` step together are the difficulty transition — tuned tight (§9), and
**steepest for Torment** (the designed endgame jump: bigger wall, bigger loot).

Implementation note: keep a single internal `G`-indexed curve (re-parameterize `phi` and the boss fns for a
**finite 500-stage span** with 5 tier-unlock difficulties) rather than five separate curves. Minimizes churn.

## 6b. The toughness anchors (user decision, 2026-11-15)

> **Numbers below are checkpoint 1.** Round 2 (same day) changed the rules they were measured under — waves per
> stage by difficulty (`WAVES_BY_DIFFICULTY` 8 · 12 · 16 · 20 · 20), a key in one stage-boss chest in four (every
> one in Normal), a 60 s enrage, Normal in 3–4 h — and re-measured the tables; the anchors themselves (2–3 hits,
> 5–10 s, flat inside a world, hardest hitter) stand. Current figures: `docs/redesign/PACING_REPORT.md`, "Ronda 2".

*"Los bichos normales deberían aguantar 2-3 hits; los bosses, con equipo del nivel, 5-10 s."* Enemy life is no
longer a formula's guess of what gear should be (`gearTrack`, `bossHpRamp` and the stage-boss power curve are
gone): it is **anchored to hits and seconds against a party with on-level gear** — the probe's average player
**in the full gear of the world it has just left** (the party as it arrives, after six more hours of farming that
world's last stage; in world 1, the party as it stands), under the loot economy of §4. A party that found its
key at once arrives with half its slots empty and needs more hits; nobody walks into a world one-shotting it.

| Rank | Anchor | Table (`data/stageScaling.ts`) |
|---|---|---|
| Grunt (the plain enemy) | 2–3 basic hits of the party's hardest hitter — nobody one-shots it | `GRUNT_HP_TUNE` (its life) |
| Archer · brute | 0.8 × · 1.8 × a grunt (2 · 4½ hits) | `data/enemies.ts` `hpMult` |
| Elite | 4.5 × its kind — about 11 hits for a grunt | `ELITE_HP_MULT` |
| Stage boss | 5–10 s against the full party | `STAGE_BOSS_HP_TUNE` (its life) |
| World boss | the wall: its world's length (§8) | `WORLD_WALL_MULT` |
| Trash damage | what the arriving party clears without a wipe; never above the formula | `TRASH_DMG_TUNE` (a share) |

- **One entry per tuning point**: the stages of world 1 one by one (the opening: one naked Knight becomes a trio
  in under an hour), then one per world, 2 … 50. A party's power moves while it farms at a wall, not during the
  fifty minutes of a pass, so **inside a world the tables are flat** (the waves grow instead: 5 enemies at `x-1`,
  22 at `x-9`) and they step up at each new world.
- **"The hero attacking it" is the hardest hitter.** The Ranger's basic hit is three times the Knight's in Normal
  and five to eight times deeper (offensive gear on the damage dealer, defensive on the tank), so a grunt that
  takes the Ranger 2½ hits takes the Knight ten or more and the Priest more still. Anchoring on the average would
  have the Ranger one-shot everything.
- **Gear is nearly all of a hero's hit** (`GEAR_POWER`): every slot can add flat damage, and a hero goes from two
  filled slots to eleven in its first hours — its hit grows tenfold. So a grunt's life grows **tenfold from 1-9
  to world 2** (116 → 1,260), and trash damage is at its lowest in worlds 2–6 (`TRASH_DMG_TUNE` 0.27–0.5), while
  parties are still filling slots. Measured on the parties that really arrive: 7 hits on entering world 2, 3 in
  world 3, and **2.1–3.3 hits and 6.4–9.2 s from world 4 on**.
- **Stage pace follows**: `x-1` clears in about 3½–4 minutes, `x-9` in about 9–12, at every depth (with the
  movement speeds of 2026-11-15: `WALK_SPEED` 110, enemies 50/40). Clearing four stages in five minutes is gone.
- **How they are kept**: `scripts/tune-pacing.ts` measures the probe's party at every point and writes the tables
  and `test/sim/probe/anchorReference.ts` (what that party's hit and damage per second were);
  `test/sim/anchors.test.ts` holds the tables against the reference and measures two real fights of a new game;
  `scripts/measure-anchors.ts` prints hits, seconds and minutes per stage along the whole game. **When hero power
  changes (classes, gear, levels) re-run the tuner** — the anchors are measured, not derived.

## 7. Levels & XP

> **Round 2:** the curve is cheaper (`XP_MID_EXP` 1.05, `XP_TAIL` 2M) and the party ends each difficulty at about
> L20 · 48 · 73 · ~97 · ~120 (the cap arrives in the last worlds of Torment). The table below is checkpoint 1.

`MAX_LEVEL = 120`, **not reached on the way to Torment `10-10`**: the probe's player finishes around L108,
and L120 is the post-completion grind. Gear has **no level requirement**, so a lucky player can punch above
their level and clear a gate underleveled.

The curve (`stageScaling.totalExpToReach`, retuned 2026-11-15 for the 3-month game):

```
XP(L) = 0.7·L^3.5 · (1 + (L/30)^1.2)  +  50M·(L/120)^20
```

The first factor is the old curve (cheap opening: L10 ≈ 2.8k, L20 ≈ 40k); the second makes the middle levels cost
several times more (×2.9 at L50, ×4.6 at L88); the last term is a steep tail for the final levels. The old pure
`0.7·L^3.5` put a party at L72 by the end of Normal and at the cap in Inferno, so levels stopped mattering for the
second half of the game. (Level barely moves a hero's damage — gear is nearly all of it — so the curve spreads the
talent points across the game; it does not gate anything.) Measured with the probe (away time included):

| Difficulty cleared (10-10) | ~Level | spine (`expectedLevel`, the ilvl of drops) |
|---|---|---|
| Normal | ~52 | 35 |
| Hell | ~68 | 64 |
| Inferno | ~82 | 88 |
| Eternal | ~96 | 106 |
| Torment | ~108 (L120 = post-Torment farm) | 115 |

Level is a slow multiplicative trickle (base stats + talent points), not a gate. XP past L120 is wasted.

## 8. Pacing targets (user, 2026-11-15) and how a world's length is made

> **Round 2 (user, 2026-11-15) supersedes the split below.** Targets are now **Normal ≈ 4 h · Hell ≈ 40 h ·
> Inferno ≈ 120 h · Eternal ≈ 230 h · Torment ≈ 325 h** (`test/sim/probe/targets.ts`; still ~720 h, ~3 months).
> State at checkpoint 2: Normal 3.4 h (a world 20–30 min, no wall: its boss falls to the first key), Hell 42 h (a
> world 3–6½ h, 2–4 attempts a wall, a key every 1½–2½ h), Inferno 121 h on the tuning seeds (not validated on
> others); **Eternal and Torment are coarse** (the pass was cut short on purpose: the second combat wave — new
> passives, reactive rules, boss affixes and mechanics — forces a full re-tune anyway). How to re-tune, and which
> knob moves what: `docs/redesign/PACING_REPORT.md`, "Ronda 2", R.8. Everything from here to §9 is checkpoint 1.

**The whole game — Normal 1-1 → Torment 10-10 — in about 3 calendar months at 8 hours of play a day**: ~90 days,
~720 active hours. Always **decelerating**: each difficulty is longer than the last. The user set only the total;
the shape follows from two of his other decisions — enemies that take two or three hits (§6b: a stage lasts
minutes) and a world-boss key in one stage-boss chest out of ten (§9). The per-world targets live in
`test/sim/probe/targets.ts`: world 1 about 3 h, then a straight line from 6.6 h (world 2) to 23 h (world 50).

| Difficulty | Active hours | Share | A world takes about |
|---|---|---|---|
| Normal | ~75 | 10 % | 3 h (the first), then 6.5 → 9.5 h |
| Hell | ~112 | 15 % | 9.5 → 13 h |
| Inferno | ~146 | 20 % | 13 → 16 h |
| Eternal | ~180 | 25 % | 16.5 → 19.5 h |
| Torment | ~215 | 30 % | 20 → 23 h |

**What a world's time is made of**, in the order the player meets it:

1. **The pass** — stages `x-1 … x-9`: about **an hour**. With the toughness anchors a stage is 20 waves of
   enemies that each take two or three hits: `x-1` (5 a wave) clears in about **3½–4 minutes**, `x-9` (22 a wave)
   in about **9–12**, the same at every depth (the anchors keep it so).
2. **The wait for a key** (§9). An attempt on the world boss costs a key, the first one too, and a key is one
   stage-boss chest in ten: about **42 clears of `x-9`**, where the game parks the party — **4 to 8 hours** of
   farming per key on average (3½ in world 1, whose stages are shorter). The wait is random: one player in five has a key on
   arrival, an unlucky one waits three times the average. **A world therefore cannot take less than about seven
   hours**, however weak its wall.
3. **Failed attempts** — each costs the key, so each is another wait. The walls (`WORLD_WALL_MULT`) are tuned so
   a world's hours, keys and all, average its target: about **1–2 attempts a world in Normal, 1–3 in Hell, 1–4 in
   Inferno, up to 7–8 in Eternal and Torment** (some 14 / 16 / 23 / 36 / 55 attempts per difficulty). The first
   three worlds have no wall of their own: their boss falls to the first key.

The farming that waits for a key is also the farming that gears and levels the party, so the three are one loop.
Everything is tuned by `scripts/tune-pacing.ts` (one forward pass with the probe's player: the anchors of each
world against the party that arrives there, then its wall by bisection on the hours the seeds really take, keys
included) and checked with `npm run probe`, which prints every world's hours next to its target, and
`scripts/measure-anchors.ts`, which prints hits, seconds and minutes per stage along the game. **The response is
hypersensitive**: a party's power plateaus once a world's gear is collected, so a wall a few percent tougher can
double a world's hours, and one world on one seed swings from one hour to thirty. Only totals over a difficulty
and several seeds mean anything — never tune to one world or one seed.

**Measured (2026-11-15, eight seeds, `npm run probe`):** all eight finish, in 79–106 days at 8 h a day (median
89; ~680–760 active hours); per difficulty 72–76 / 108–112 / 128–152 / 172–280 / 169 h. Eternal is the least
reliable stretch (its walls sit near what the gear can give). Details and every table:
`docs/redesign/PACING_REPORT.md`.

**The opening (probe, a new game):** the solo Knight clears 1-1 in about five minutes; the Ranger joins around
minute 17 and the Priest around minute 40 (recruits are cheap: 600 g and 1,200 g for the slots, 300 g per class);
1-9 falls at about one hour with a party around level 12; then the party loops 1-9 (six minutes a clear) until
its first key — the world boss fell between 1.1 and 7.3 hours in four runs (median 2.9). Enemy damage starts at 28 % and is whole only at stage 60 (`EARLY_DMG_FLOOR`, `EARLY_DMG_RAMP_END`).

## 9. The balance spine — expected gear-state per gate

Everything downstream (enemy HP/damage, drop weights, XP) solves backwards from this. For each difficulty, the
gear you **arrive** with and the kit the **10-10 gate** demands:

| Difficulty | Arrive with | `10-10` gate requires | Gems | Lvl @gate |
|---|---|---|---|---|
| **Normal**  | starter / T0–T1 | full **T3** kit + **T4** in weapon & **every core slot, all 3 heroes** | T1–T2, sockets ~½ filled | ~42 |
| **Hell**    | T3 + some T4    | full **T4** kit + **T5** across all core role-slots (all 3 heroes) | T2–T3, most sockets filled | ~66 |
| **Inferno** | T4 + some T5    | full **T5** kit + **T6** across all core role-slots | T3–T4 | ~86 |
| **Eternal** | T5 + some T6    | full **T6** kit + **T7** across all core role-slots | T4–T5 | ~103 |
| **Torment** | T6 + some T7    | full **T7** kit + **T8** across all core role-slots | T5–T6 → chase T7–T8 | ~114 |

The pattern is a clean ladder: arrive on last difficulty's top 1–2 tiers; the gate is broken by **this
difficulty's new top tier landing across all your key slots**. Because the new top tier is ~2% drops, "break the
gate" = "farm `10-9` until the rare upgrade drops **for each core slot, on each hero**" — the core idle loop.

**The `X-10` boss carries the GEAR gate — it must be a REAL wall.** The world boss is tuned so a party at the
*expected kit minus its cap-tier pieces* is **decisively walled** (not a close call), and only the broad cap-tier
breakthrough above — weapon + every role-critical slot, across all three heroes — clears it. This is deliberately
a **higher** gear bar than a single-slot upgrade: farming the rare cap-tier for the full role-slot set (≈3× the
slots) is what holds the §8 timeline. Wall multipliers (Phase 2) are sized to this; if a gate proves
bruteforceable with partial cap-tier gear, raise the multiplier, not the spine.

**Keys gate every attempt (2026-06; rates set by the user on 2026-11-15).** Entering an `X-10` costs ONE **zone
key** (per world+difficulty), spent per attempt even on a wipe — the first attempt too. Keys come only out of that
zone's **stage-boss chests, one chest in four** (`STAGE_KEY_DROP_CHANCE = 0.25`): with a chest on 25 % of
stage-boss kills that is **one key per ~16 stage bosses**. **Normal is the exception — every stage-boss chest of
its hundred stages holds a key** (`STAGE_KEY_DROP_CHANCE_BY_DIFFICULTY`): Normal is strolled through in three or
four hours and a key must be no obstacle there (nine players in ten have theirs before they reach the boss). From
Hell on, a party without a key loops `X-9` (where the game parks it) until one drops — some 17 clears — and every
failed attempt costs the same again: the key is part of each world's length, and the walls are tuned around it
(§8); the farming a key takes is also the farming that gears the party. Keys are keyed to the zone via
`worldBossStageOf(dropStage)`, stored permanently, never in inventory; shown on the strip portal, the top bar
(current zone) and per world in the Map panel.

**The gear state is PARTY-WIDE (all three heroes), not one hero.** The gate is two simultaneous checks on the
canonical trio: the **DPS/enrage check** needs the damage dealers (ranger + supporting offense) at the cap tier
in **weapon + offensive slots**; the **survival check** needs the knight at the cap tier in **defensive slots**
and the priest geared enough to sustain. So the chase is the cap-tier upgrade in each hero's **role-critical**
slots — ~3× the slot set of a single hero, which is deliberately load-bearing for the §8 timeline.

**Within-difficulty world-boss ramp** (generic; `base` = the tier you arrive with, `cap` = the difficulty's new
top tier):

| World boss | Expected kit to clear |
|---|---|
| `1-10` | arrival kit, lightly upgraded with this difficulty's commons |
| `2-10`–`4-10` | full `base`-tier kit at current ilvl |
| `5-10` | `base+1` becoming common across slots |
| `6-10`–`8-10` | `base+1` kit, occasional `cap` tier |
| `9-10` | `base+1` kit + `cap` tier in several key slots |
| `10-10` (gate) | `cap` tier in weapon + **every** core role-slot, **all 3 heroes** — the full breakthrough |

Normal is the long ramp-in (starter → T4 across the whole difficulty); Hell onward are tighter **+1-tier**
climbs. The gate is a **hard wall**: a party with the expected kit *minus its cap-tier key pieces* should
**not** be able to clear it — the cap-tier breakthrough is the key.

## 10. What this supersedes & the phase map

Supersedes the retired infinite model: infinite stages / accelerating-ratio goal, world-depth-scaled rarity +
`unlockStage` schedule, the zone-key / zone-boss gate, and the "world 100 ≈ 1 year" tail.
**Retained** (re-parameterized): the polynomial Φ curve, the hit-count anchor and the decoupled boss scales (as
measured tables since 2026-11-15, §6b), mitigation, `expectedLevel`, the FLAT-vs-PERCENT stat rule, and the
income shape. *(Zone keys were removed in this model and came back in 2026-06; since 2026-11-15 they are scarce
and gate every attempt — §9.)*

Execution phases (see `docs/PROGRESS.md`):
0. **This spec + spine** (pending sign-off).
1. Data model + difficulty state (`data/difficulties.ts`, save/world `difficulty` + unlock tracking, clean migrate).
2. Finite scaling rework (re-parameterize `stageScaling.ts`; tune walls vs the §9 spine).
3. Loot/gems/XP retune (per-difficulty tables, gem cap, chest gem mults, 500-stage XP curve).
4. World-boss abilities (+1 per difficulty).
5. Run loop (advance/retry, stage/difficulty selection in `sim/world`).
6. UI (difficulty dropdown + stage selector, Retry toggle).
7. Harness + validation (per-gate clear-time, time-to-Torment, L120 timing; finite invariants replace §11).
