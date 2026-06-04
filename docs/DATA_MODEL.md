# DATA_MODEL.md — Type contracts (copy these verbatim)

Every interface below is from SPEC §4–§8. Use them **as-is** — same field names, same shapes — so the data
model stays compatible with v1.5/v2 (which depend on `origin`, `bound`, `online`, etc.). Where the SPEC
left a `tune` value, the numbers live in `docs/BALANCE.md`, not here. This file is the *shape*; BALANCE is
the *values*.

> Placement: stat/slot/tier/gem/effect/ability/talent/tech/pet/chest types go in their matching `data/*.ts`
> file (the file owns both the `interface` and the config table). World/runtime types (`WorldState`,
> `Combatant`, `Rng`) go in `sim/`. `SaveV1`/`HeroState` go in `persistence/saveSchema.ts`.

---

## Stats — `data/stats.ts`

```ts
export type StatGroup = 'offensive' | 'defensive' | 'utility';

// Stat-system rework: dodge/hpPerHit/penetration removed; damageIncrease + lifesteal are
// buff-only ({0,0} band); hpRegen is class-base-only; multistrike added. critChance, block,
// cooldownReduction, multistrike are soft-capped ENABLERS (ENABLER_SOFT_CAPS) and slot-
// restricted (AFFIXES.md). The rest are unbounded SCALERS.
export type OffensiveStat =
  | 'attackSpeed' | 'critChance' | 'critDamage'
  | 'damageIncrease' | 'attackDamage' | 'multistrike' | 'lifesteal';

export type DefensiveStat =
  | 'armor' | 'magicResist' | 'health' | 'hpRegen' | 'block';

export type UtilityStat = 'cooldownReduction' | 'healPower' | 'damageReduction';

export type StatKey = OffensiveStat | DefensiveStat | UtilityStat;

export interface StatDef {
  key: StatKey;
  label: string;
  group: StatGroup;
  kind: 'flat' | 'percent';
  /** value range per item-level point, before rarity multiplier */
  rollPerIlvl: { min: number; max: number };
}
```

Routing (see `docs/AFFIXES.md`, which overrides SPEC §4.2): **armor** (helmet/chest/gloves/legs/boots) rolls
**defensive** substats; **weapon** rolls **offensive** substats; **jewelry** (offhand/ring1/ring2/amulet)
rolls from **both pools, mixed** (the flex slot). Derived stats (DPS, EHP) are **computed, never stored**.

## Item slots — `data/itemSlots.ts`

```ts
export type SlotKey =
  | 'helmet' | 'chest' | 'gloves' | 'legs' | 'boots'
  | 'weapon' | 'offhand' | 'ring1' | 'ring2' | 'amulet';

export type SlotCategory = 'armor' | 'weapon' | 'jewelry';

export interface SlotDef {
  key: SlotKey;
  label: string;
  category: SlotCategory;
  /** the guaranteed base affix on every item of this slot */
  baseAffix: StatKey;
}
```

Base affix: armor → `armor`; weapon → `attackDamage`; jewelry (offhand/rings/amulet) → an offensive anchor
from T1+ (jewelry doesn't exist at T0). **Substats:** armor → defensive only; weapon → offensive only;
**jewelry → both pools, mixed** (`docs/AFFIXES.md`).

## Tiers — `data/tiers.ts`

```ts
export type ItemTier = 0|1|2|3|4|5|6|7|8;

export interface TierDef {
  tier: ItemTier;
  name: string;          // localized display name (English for v1)
  color: string;         // border/text color
  extraStats: number;    // 0,1,1,2,2,3,3,4,4
  sockets: number;       // 0,0,1,1,2,2,3,3,4
  statMultiplier: number;
  dropWeight: number;    // BASE weight (tiny for top tiers); stage bias + RARITY shift it (PROGRESSION §13)
  unlockStage: number;   // tier cannot drop before this global stage (T4@10,T5@20,T6@30,T7@40,T8@50)
}
```

Rules: stat cap = **4** extra stats always (T7/T8 share it; T8 only adds a 4th socket). Jewelry rejected at
T0 (reroll). **Tier drop-rate is stage-gated + extremely rare at the top** — see PROGRESSION §13
(`rollTier`, unlock schedule, drop-rate targets). Items use T0–T8; gems use T1–T8. See BALANCE.md for values.

## Item instance — created by `sim/loot.ts`

```ts
export interface SocketState {
  gem: GemInstance | null;   // empty until socketed; a tiered gem instance (see Gems below)
}

export interface ItemInstance {
  id: string;            // uuid (crypto.randomUUID)
  slot: SlotKey;
  category: SlotCategory;
  tier: ItemTier;        // tier IS rarity; drives extraStats + sockets
  ilvl: number;          // discrete: 1,5,10,15,20,...
  baseAffix: { key: StatKey; value: number };       // always present
  stats: { key: StatKey; value: number }[];          // length = tierDef.extraStats (<=4)
  sockets: SocketState[];                             // length = tierDef.sockets (<=4)

  /** Birth certificate — deterministic inputs. generateItem(origin) === this item, byte-for-byte. */
  origin: {
    rollSeed: number;
    stageIndex: number;
    chestType: ChestType;
    generatorVersion: number;
  };

  /** Account-bound = untradeable. Set true the moment the item is modified (gem socketed, synthesis). */
  bound: boolean;
  // future-proofing (present in schema, unused in v1):
  enchantLevel?: number;
  locked?: boolean;      // player favorite/lock vs accidental salvage (distinct from bound)
}
```

**Every generated item must populate `origin` correctly and set `bound: false`** (SPEC §9 Phase 1).

## Gems — `data/gems.ts` (now TIERED, T1–T8 — overrides SPEC §4.5's single-stat gem)

Gems have **tiers T1–T8**: higher tier = **more affixes** + bigger values, and gem tier drop-rate **scales
with stage** exactly like items (the shared `rollTier`, PROGRESSION §13). A gem is an **instance** (not a
stackable key), with its own birth certificate so flat grants scale with the stage it dropped at.

```ts
export type GemKey = 'sapphire' | 'ruby' | 'emerald' | 'topaz' | 'amethyst' | 'diamond';
export type GemTier = 1|2|3|4|5|6|7|8;

export interface GemDef {
  key: GemKey;
  name: string;
  color: string;
  /** Ordered list (up to 4) of stat keys this gem grants, PER socket category. A gem of tier T grants the
   *  first gemAffixCount(T) of these. Group rules MUST hold: armor→defensive, weapon→offensive,
   *  jewelry→either (jewelry is the flex slot, AFFIXES.md). `base` is the pre-scale magnitude. */
  grants: Record<SlotCategory, { key: StatKey; base: number }[]>;
}

export interface GemInstance {
  id: string;            // uuid
  key: GemKey;
  tier: GemTier;
  origin: { rollSeed: number; stageIndex: number; generatorVersion: number }; // → gemLevel = expectedLevel(stageIndex)
}
```

**Grant computation (in `sim/gems.ts`) — normalized-to-affix model.** A gem grants its `GemDef.grants`
stat(s), the SAME in any socket. Each grant equals `GEM_AFFIX_FRACTION` (split across a multi-stat gem) of
ONE same-tier, same-ilvl gear affix of that stat, using gear's normalization:
`tierMult = tierDef(tier).statMultiplier`, `gemLevel = expectedLevel(origin.stageIndex)`,
`mid = avg(STATS[stat].rollPerIlvl)`; `flat = round2(fractionPer × mid × tierMult × GEAR_POWER × Φ(gemLevel)^EG_FLAT)`,
`percent = round2(fractionPer × mid × tierMult)` (same flat/percent rule as items, PROGRESSION §6). So a gem
scales with ilvl + tier exactly like gear. The knob (`GEM_AFFIX_FRACTION`) + the grant identities are in
BALANCE.md; `gemLevel(gem)` is surfaced as "Gem Lv." in the tooltip. **Socketing sets `item.bound = true`**
with a confirmation (SPEC §4.5 / §12.4). Gem grants are **added on top** of the item's own affixes (they can
push it above the 4-affix item cap — that's fine, gems are bonus).

## Chests — `data/chests.ts` + `sim/chests.ts`

```ts
export type ChestType = 'normal' | 'stageBoss' | 'zoneBoss';

export interface ChestStack {
  type: ChestType;
  count: number;        // unopened, <= capacity[type]
}

export interface ChestDropConfig {
  baseDropChance: Record<ChestType, number>;   // before tech mult
  capacity: Record<ChestType, number>;          // before tech bonus
  itemsPerChest: Record<ChestType, number>;     // items rolled on open
  zoneKeyChance: Record<ChestType, number>;
}
```

When a type's storage is full, that type **stops accumulating** (no overflow). Auto-open tech opens all
chests every 10 min (interval reducible).

## Classes — `data/classes.ts`

```ts
export interface ClassDef {
  key: string;             // 'knight' | 'ranger' | 'priest' (Mage/Rogue removed — CLAUDE.md override)
  name: string;
  role: 'tank' | 'dps' | 'healer' | 'support';
  baseStats: Partial<Record<StatKey, number>>;
  statGrowthPerLevel: Partial<Record<StatKey, number>>;
  unlock: { type: 'free' } | { type: 'gold'; cost: number }; // cost is small
}
```

**Only 3 classes ship: Knight · Ranger · Priest** (the canonical tank·dps·healer trio — all tuning is done
against this one comp; more classes added later). Field max 3. Party **slots** unlock via tech tree, not gold.

## Pets — `data/pets.ts`

```ts
export type PetBonus =
  | { kind: 'xpMult';        value: number }
  | { kind: 'goldMult';      value: number }
  | { kind: 'chestDropMult'; value: number }
  | { kind: 'chestStorage';  type: ChestType; value: number }
  | { kind: 'zoneKeyMult';   value: number }
  | { kind: 'autoOpenReduce'; value: number }; // NEVER a combat stat

export interface PetDef {
  key: string;
  name: string;
  sprite: string;
  dropSource: 'enemy' | 'boss' | 'both';
  baseDropChance: number;   // extremely low
  bonus: PetBonus;
}
```

Owning grants the bonus permanently; all owned pets stack. Selected pet is **cosmetic only**.

## Effects — `data/effects.ts` + `sim/effects.ts`

```ts
export type EffectKind =
  | { type: 'statMod'; stat: StatKey; mode: 'flat' | 'percent'; value: number }
  | { type: 'stun' }
  | { type: 'silence' }
  | { type: 'root' }
  | { type: 'dot'; damagePerTick: number; element?: string }
  | { type: 'hot'; healPerTick: number }
  | { type: 'tag'; tag: string };

export interface EffectDef {
  key: string;
  name: string;
  icon: string;
  kind: EffectKind;
  durationMs: number;           // 0 = instant/one-shot; >0 = timed
  maxStacks: number;            // 1 = refresh-only; >1 = stacks additively
  stackRule: 'refresh' | 'extend' | 'independent';
  beneficial: boolean;          // buff vs debuff (UI tint)
}

export interface ActiveEffect {
  defKey: string;
  sourceId: string;
  remainingMs: number;
  stacks: number;
}
```

**Abilities apply declarative effects; the combat loop processes a generic effect list — adding content =
data, never editing the loop** (SPEC §4.10).

## Abilities — `data/abilities.ts`

```ts
export interface AbilityDef {
  key: string;
  name: string;
  icon: string;
  cooldownMs: number;
  target: 'self' | 'lowestAllyHp' | 'frontEnemy' | 'allEnemies' | 'allAllies';
  applies: { effectKey: string; durationMsOverride?: number }[];
  castCondition?: 'always' | 'enemyPresent' | 'allyBelowHpPct';
  rankScaling?: { perRank: Partial<{ value: number; durationMs: number; cooldownMs: number }> };
}
```

## Talents — `data/talents.ts`

```ts
export interface TalentNode {
  key: string;
  lineIndex: number;            // line N unlocks at N*10 points spent
  kind: 'passive' | 'ability';
  name: string;
  maxRank: number;              // typically 5
  passive?: { stat: StatKey; mode: 'flat' | 'percent'; valuePerRank: number };
  abilityKey?: string;
}

export interface ClassTalentTree {
  classKey: string;
  lines: TalentNode[][];        // lines[0] = [Vida, Daño, BasicAbility], ...
}
```

1 point/level; passives feed `aggregate`; ability nodes scale an `AbilityDef` via `rankScaling`.

## Tech tree — `data/techTree.ts` (REWORKED: flat, endlessly-rankable, NOT a DAG)

```ts
export type TechEffect =
  | { kind: 'goldDropMult';     value: number }
  | { kind: 'xpDropMult';       value: number }
  | { kind: 'chestDropMult';    value: number }
  | { kind: 'chestTypeDropMult'; type: ChestType; value: number }
  | { kind: 'chestStorage';     type: ChestType; value: number }
  | { kind: 'unlockAutoOpen' }
  | { kind: 'autoOpenReduce';   value: number }
  | { kind: 'zoneKeyMult';      value: number }
  | { kind: 'offlineMult';      value: number }
  | { kind: 'partySlot' }       // each rank ⇒ +1 active party slot
  | { kind: 'gemDropMult';      value: number };
  // NOTE: the old `combatStat` effect was REMOVED — tech is non-combat now (combat power = items).

export type TechCategory = 'Economy' | 'Chests' | 'Utility'; // 'Combat' removed (tech is non-combat)

export interface TechNode {
  key: string;
  name: string;
  description: string;          // the PER-RANK effect (e.g. "+2.5% Attack Damage (party)")
  category: TechCategory;       // presentation grouping only — NOT a prerequisite graph
  icon: string;                 // glyph for the card (presentation lives in data)
  effects: TechEffect[];        // values are PER RANK; getBonuses multiplies by rank
  baseCost: number;             // GOLD for the first rank (rank 0 → 1)
  costGrowth: number;           // per-rank cost multiplier (>1 ⇒ endless sink)
  maxRanks: number;             // Number.POSITIVE_INFINITY for endless nodes; finite for caps
}

export function nodeCost(node, rank): number  // round(baseCost · costGrowth^rank)
```

**Tech is the main v1 gold SINK (overrides SPEC §6).** REWORKED from a connected DAG into a **flat catalogue
of ONE endlessly-rankable node per type** — no `ring`, no `requires`, no chains. Per-rank power is small &
fixed; **`cost = baseCost · costGrowth^rank`** grows exponentially per rank, so every node is an open-ended
gold target that never "completes". A handful of nodes carry a finite `maxRanks` cap where infinite scaling
is meaningless: **Auto-Open** (rank 1 unlocks; reductions stop at the 60 s interval floor) and **Recruitment**
(party size, max 2 ranks = slots 2 & 3). `researchPoints` stays in the save as a **reserved/unused** field
for forward-compat (set 0; not earned in v1).

`getBonuses(purchasedNodes, ownedPets)` (in `sim/bonuses.ts`) merges tech + pets into ONE object the sim and
state read. Neither sim nor state reads the tree/pet list directly.

## Save schema — `persistence/saveSchema.ts`

```ts
export interface SaveV1 {
  version: 1;
  seed: number;
  lastSavedAt: number;
  progress: { globalStageIndex: number; world: number; stage: number };
  gold: number;
  researchPoints: number;             // RESERVED/unused in v1 (tech costs gold now) — kept for forward-compat
  unlockedClasses: string[];
  partySlots: (string | null)[];      // length 3; slots 2/3 gated by tech
  roster: HeroState[];
  inventory: ItemInstance[];
  inventoryGems: GemInstance[];        // tiered gem instances (not stackable keys)
  inventoryPages: number;             // 1..5 (4 purchasable with gold); UI paginates 1 page = slotsPerPage
  inventorySlotUpgrades: number;      // 0..20 (gold-purchased, +1 slot on EVERY page)
  techTree: Record<string, number>;   // nodeKey -> purchased ranks (bought with GOLD)
  chests: { type: ChestType; count: number }[];
  zoneKeys: number;
  autoOpen: { unlocked: boolean; lastRunAt: number | null };
  pets: { ownedKeys: string[]; selectedKey: string | null };
  settings: { uiScale: 1 | 1.5 | 2; dockOrientation: 'bottom' | 'left' | 'right' };
  // future systems — present, possibly empty:
  cube: { unlocked: boolean };
  online: { accountId: string | null; premiumCurrency: number; premiumUntil: number | null };
}

export interface HeroState {
  id: string;
  classKey: string;
  level: number;
  exp: number;
  equipment: Partial<Record<SlotKey, ItemInstance>>;
  talentPoints: number;
  talents: Record<string, number>;     // talentNodeKey -> rank
}
```

Derived at runtime, **never stored**: party-slot count, per-type chest capacity, auto-open interval (from
`techTree` + `pets` via `getBonuses`); **inventory capacity = `inventoryPages × (20 + inventorySlotUpgrades)`**
(max `5 × 40 = 200`) — its own gold-purchased system, NOT from tech (see BALANCE "Inventory expansion").

---

## Runtime/sim types (define in `sim/`, your design — suggested shapes)

These aren't dictated verbatim by the SPEC; design them cleanly. Suggested:

```ts
// sim/rng.ts
export interface Rng {
  next(): number;             // [0,1)
  int(maxExclusive: number): number;
  range(min: number, max: number): number;
  state(): number;            // serializable
}
export function makeRng(seed: number): Rng; // mulberry32

// sim/world.ts — the state Simulation owns and ticks
export interface Combatant {
  id: string;
  side: 'hero' | 'enemy';
  classKey?: string;          // heroes
  hp: number;
  maxHp: number;
  baseStats: Partial<Record<StatKey, number>>;
  effects: ActiveEffect[];
  cooldowns: Record<string, number>; // abilityKey -> remainingMs
  attackTimerMs: number;
  x: number;                  // strip position (logical px)
}

export interface WorldState {
  tick: number;
  rngState: number;
  globalStageIndex: number;
  world: number;
  stage: number;
  stageProgress: number;      // 0..1 toward boss spawn
  phase: 'advancing' | 'fighting' | 'boss' | 'zoneBoss';
  heroes: Combatant[];
  enemies: Combatant[];
  // accrual buffers the state layer drains: pending chests, loot, xp, gold, pet drops
  pending: {
    gold: number; xp: number;
    chests: { type: ChestType; count: number }[];
    petDrops: string[];
  };
}
```

Keep effective-stat computation a pure function: `aggregate(base, equipment, talentPassives,
activeStatMods) -> EffectiveStats`. Combat reads only effective stats.
