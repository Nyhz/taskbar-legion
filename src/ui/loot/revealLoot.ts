import { getEngine } from '@/game/engineRef';
import { useStore } from '@/state/store';
import { CHEST_CONFIG, CHEST_TYPES, chestCountOf, type ChestType } from '@/data/chests';
import { difficultyOf, worldInDifficulty } from '@/data/difficulties';
import type { GemInstance } from '@/data/gems';
import { isGem, itemPerfectCount } from '@/sim/items';
import type { InvEntry, ItemInstance } from '@/sim/items';
import { countFilled } from '@/sim/slots';
import { itemGoldValue } from '@/sim/cube';
import { format } from '@/sim/num';
import { difficultyName, gemName, t, tierName } from '@/i18n';
import { KIT_TOKENS, type KitToken } from '@/ui/kit/tokens';
import { gemArtStem, itemArtStem } from '@/ui/itemArt';
import { itemKindName } from '@/ui/panels/items/itemText';
import { encodeLootLine, type LootLine } from './lootLine';

// Opening a chest popup: ask the engine to crack every chest of that type, then drop
// the rolled loot into the bag ONE AT A TIME (a floating toast per entry) so the haul
// reveals sequentially. Each chest yields exactly ONE gear piece PLUS an independent
// (rarer) bonus gem, and gems get their own toast. Opening is REFUSED unless the
// inventory has room for the guaranteed gear (one per chest), so no gear spills into the
// stash; a bonus gem lands in the stash only if the bag fills up exactly.

const STAGGER_MS = 300;

type Loot = { items: ItemInstance[]; gems: GemInstance[]; keys: Record<number, number> };

// Drop a rolled haul into the bag ONE AT A TIME with a floating toast per entry (gear/gems
// first, then world-boss keys), so the loot reveals sequentially. Shared by the manual chest
// popup AND auto-open, so auto-opening reads identically to a manual click. Keys are already
// credited by the engine on open; here we only toast them. addItem auto-salvages marked tiers.
// One floating line: the encoded line (ui/loot/lootLine) and its colour, a tone of the kit.
function say(line: LootLine, tone: KitToken): void {
  useStore.getState().pushLootToast({ text: encodeLootLine(line), color: KIT_TOKENS[tone] });
}

/** The kit's lettering tone of a rarity (T0–T8). */
function tierTone(tier: number): KitToken {
  return `t${Math.max(0, Math.min(8, Math.round(tier)))}` as KitToken;
}

function revealLoot(loot: Loot): void {
  const store = useStore.getState();
  const reveal: InvEntry[] = [...loot.items, ...loot.gems];
  const as = store.autoSalvage;
  const keyDrops = Object.entries(loot.keys);
  keyDrops.forEach(([bossStage, count], k) => {
    const g = Number(bossStage);
    const zone = `${difficultyName(difficultyOf(g).key)} ${worldInDifficulty(g)}`;
    window.setTimeout(
      () => {
        const text =
          count > 1 ? t('overlay.lootKeyMany', { zone, n: count }) : t('overlay.lootKey', { zone });
        say({ text, sign: 'hud_key' }, 'gold-hi');
      },
      (reveal.length + k) * STAGGER_MS,
    );
  });
  reveal.forEach((entry, i) => {
    window.setTimeout(() => {
      store.addItem(entry); // auto-salvages marked-tier items to gold instead of bagging them
      const rarity = tierName(entry.tier);
      if (isGem(entry)) {
        // Coloured by TIER (like gear), not by the gem's own stat colour — so a T1 gem reads green.
        const text = t('overlay.lootGem', { gem: gemName(entry.key), rarity });
        say({ text, art: gemArtStem(entry), tier: entry.tier }, tierTone(entry.tier));
      } else if (as.enabled && as.tiers[entry.tier] === true) {
        say(
          { text: t('overlay.lootMelted', { rarity, gold: format(itemGoldValue(entry)) }), sign: 'ui_gold' },
          'gold-hi',
        );
      } else {
        const text = t('overlay.lootItem', { kind: itemKindName(entry), rarity });
        say(
          { text, art: itemArtStem(entry), tier: entry.tier, stars: itemPerfectCount(entry) },
          tierTone(entry.tier),
        );
      }
    }, i * STAGGER_MS);
  });
}

export function openChestPopup(type: ChestType): void {
  const store = useStore.getState();
  const stored = chestCountOf(store.chests, type);
  if (stored === 0) return;
  const itemCount = stored * CHEST_CONFIG.itemsPerChest[type];
  const free = store.inventoryCap() - countFilled(store.inventory);
  if (free < itemCount) {
    const short = itemCount - free;
    const text = short === 1 ? t('overlay.bagFullOne') : t('overlay.bagFullMany', { n: short });
    say({ text, sign: 'bag_pack' }, 'bad');
    return; // do NOT open — chests stay stacked, no gear spills to the stash
  }
  const loot = getEngine()?.openChestType(type);
  if (loot !== undefined) revealLoot(loot);
}

// Auto-open (the tech): crack EVERY stored chest type and reveal the merged haul exactly like a
// manual click — staggered floating toasts, not a silent dump into the bag. The engine gates
// the trigger on having room (it sets the intent this consumes), so we just open + reveal.
export function revealAllChests(): void {
  const engine = getEngine();
  if (engine === undefined || engine === null) return;
  const merged: Loot = { items: [], gems: [], keys: {} };
  for (const type of CHEST_TYPES) {
    const loot = engine.openChestType(type);
    merged.items.push(...loot.items);
    merged.gems.push(...loot.gems);
    for (const [bossStage, count] of Object.entries(loot.keys)) {
      merged.keys[Number(bossStage)] = (merged.keys[Number(bossStage)] ?? 0) + count;
    }
  }
  revealLoot(merged);
}
