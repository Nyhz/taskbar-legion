import { getEngine } from '@/game/engineRef';
import { useStore } from '@/state/store';
import { SLOTS } from '@/data/itemSlots';
import { tierName, tierStyle } from '@/ui/tierStyle';
import { CHEST_CONFIG, chestCountOf, type ChestType } from '@/data/chests';
import { GEMS } from '@/data/gems';
import { isGem } from '@/sim/items';
import type { InvEntry } from '@/sim/items';
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
  if (loot === undefined) return;
  // Reveal items first, then any bonus gems — each into the bag with a floating toast.
  const reveal: InvEntry[] = [...loot.items, ...loot.gems];
  const as = store.autoSalvage;
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
        store.pushLootToast({ text: `${tierName(entry.tier)} (${SLOTS[entry.slot].label})`, color: tierStyle(entry.tier).color });
      }
    }, i * STAGGER_MS);
  });
}
