import { getEngine } from '@/game/engineRef';
import { useStore } from '@/state/store';
import { SLOTS } from '@/data/itemSlots';
import { tierName, tierStyle } from '@/ui/tierStyle';
import { CHEST_CONFIG, CHEST_TYPES, chestCountOf, type ChestType } from '@/data/chests';
import { difficultyOf, worldInDifficulty } from '@/data/difficulties';
import { GEMS, type GemInstance } from '@/data/gems';
import { isGem, itemPerfectCount } from '@/sim/items';
import type { InvEntry, ItemInstance } from '@/sim/items';
import { countFilled } from '@/sim/slots';
import { itemGoldValue } from '@/sim/cube';
import { format } from '@/sim/num';
import { PALETTE } from '@/styles/palette';

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
function revealLoot(loot: Loot): void {
  const store = useStore.getState();
  const reveal: InvEntry[] = [...loot.items, ...loot.gems];
  const as = store.autoSalvage;
  const keyDrops = Object.entries(loot.keys);
  keyDrops.forEach(([bossStage, count], k) => {
    const g = Number(bossStage);
    const zone = `${difficultyOf(g).name} ${worldInDifficulty(g)}`;
    window.setTimeout(() => {
      store.pushLootToast({ text: `🗝 World-boss key — ${zone}${count > 1 ? ` ×${count}` : ''}`, color: '#e8c34c' });
    }, (reveal.length + k) * STAGGER_MS);
  });
  reveal.forEach((entry, i) => {
    window.setTimeout(() => {
      store.addItem(entry); // auto-salvages marked-tier items to gold instead of bagging them
      if (isGem(entry)) {
        const gem = GEMS[entry.key];
        // Colour by TIER (like gear), not the gem's own stat colour — so a T1 gem reads green.
        store.pushLootToast({ text: `${gem.name} T${entry.tier} (gem)`, color: tierStyle(entry.tier).color });
      } else if (as.enabled && as.tiers[entry.tier] === true) {
        store.pushLootToast({ text: `Salvaged ${tierName(entry.tier)} → +${format(itemGoldValue(entry))}g`, color: PALETTE.gold });
      } else {
        const stars = '★'.repeat(itemPerfectCount(entry));
        store.pushLootToast({ text: `${tierName(entry.tier)} (${SLOTS[entry.slot].label})${stars !== '' ? ` ${stars}` : ''}`, color: tierStyle(entry.tier).color });
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
    store.pushLootToast({
      text: `Inventory full — free ${itemCount - free} slot${itemCount - free === 1 ? '' : 's'} and try again`,
      color: PALETTE.enemyAccent,
    });
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
