import { useState } from 'react';
import { useStore } from '@/state/store';
import { getBonuses } from '@/sim/bonuses';
import { partyCombatMods } from '@/sim/partyStats';
import { roleDeltaPct, visibleRoles, type RoleScores } from '@/sim/roleScore';
import { format } from '@/sim/num';
import { countFilled } from '@/sim/slots';
import { isGem, type InvEntry, type ItemInstance } from '@/sim/items';
import { SLOT_KEYS, slotFamily, type SlotKey } from '@/data/itemSlots';
import { INVENTORY_BASE, INVENTORY_MAX_SLOTS, inventorySlotCost } from '@/data/inventory';
import { slotLabel, useT } from '@/i18n';
import { useContextMenu } from '@/ui/components/ContextMenu';
import { Chip, Head, Pager, Sign, Slot, SlotGrid, Tip, TipLine, TipTag, TipText, TipTitle, TipWarn } from '@/ui/kit';
import { usePanelSpace } from '../panelSpace';
import { BAG_COLS, bagRows } from './heroLayout';
import { ItemCell } from '@/ui/panels/items/ItemCell';
import { DropZone } from './drop';
import type { SocketRequest } from './GearSlot';

// The bag: the shared inventory, in the hero window. Count / capacity, sort, send every gem to the stash, and
// the grid — a piece is equipped on the selected hero by click, drag or right-click; a gem is socketed from its
// right-click menu or by dragging it onto a worn piece; anything goes to the stash from the menu. The cell after
// the last slot buys one more. It sits under the doll, as wide as the window; a bigger bag gets pages (no scrolling:
// a scroll box would clip the tooltips).

export function Bag({
  heroId,
  requestSocket,
}: {
  heroId: string;
  requestSocket: SocketRequest;
}): React.JSX.Element {
  const t = useT();
  const inventory = useStore((s) => s.inventory);
  const slotUpgrades = useStore((s) => s.inventorySlotUpgrades);
  const gold = useStore((s) => s.gold);
  const cap = useStore((s) => s.inventoryCap());
  const equip = useStore((s) => s.equip);
  const unequip = useStore((s) => s.unequip);
  const moveToStash = useStore((s) => s.moveToStash);
  const moveToInventory = useStore((s) => s.moveToInventory);
  const moveEntryToSlot = useStore((s) => s.moveEntryToSlot);
  const buySlot = useStore((s) => s.buyInventorySlot);
  const sortInventory = useStore((s) => s.sortInventory);
  const stashAllGems = useStore((s) => s.stashAllGems);
  const roster = useStore((s) => s.roster);
  const hero = roster.find((h) => h.id === heroId);
  const techRanks = useStore((s) => s.techRanks);
  const ownedPets = useStore((s) => s.ownedPets);
  const stage = useStore((s) => s.hud.globalStage);
  const openMenu = useContextMenu();
  const [page, setPage] = useState(0);
  // Under the doll: eleven cells across (the window's width) and as many rows as fit above the strip.
  const { availArtHeight } = usePanelSpace();
  const COLS = BAG_COLS;
  const ROWS = bagRows(availArtHeight);
  const PAGE = COLS * ROWS;

  const equipped = hero?.equipment ?? {};
  const filled = countFilled(inventory);
  const full = filled >= cap;
  const canBuyMore = slotUpgrades < INVENTORY_MAX_SLOTS;
  const slotCost = inventorySlotCost(slotUpgrades);
  const cells = cap + (canBuyMore ? 1 : 0); // the cell after the last slot buys one more
  const pages = Math.max(1, Math.ceil(cells / PAGE));
  const shown = Math.min(page, pages - 1);
  const hasGems = inventory.some((e) => e !== null && isGem(e));

  // What a piece's tooltip compares against: nothing if a slot of its family is free (pure gain), otherwise every
  // worn piece it could replace. The role impact is computed lazily by the cell (only the hovered one).
  const compareTargets = (item: ItemInstance): ItemInstance[] => {
    const family = slotFamily(item.slot);
    if (family.some((sl) => equipped[sl] === undefined)) return [];
    return family.flatMap((sl) => equipped[sl] ?? []);
  };
  const bonuses = getBonuses(techRanks, ownedPets);
  // The comparison weighs gear with the party's auras on, as the fight does.
  const partyMods = partyCombatMods(roster, bonuses.combatMods);
  const roleImpact =
    hero === undefined
      ? undefined
      : (newItem: ItemInstance, worn: ItemInstance, ignoreGems: boolean): RoleScores =>
          roleDeltaPct({
            classKey: hero.classKey,
            level: hero.level,
            equipment: equipped,
            swapSlot: worn.slot,
            swapItem: newItem,
            talents: hero.talents,
            extraMods: partyMods,
            stage,
            ignoreGems,
          });
  // Where a gem can go: the first empty socket of every worn piece that has one (a piece's empty sockets are
  // all alike, so one menu row per piece is enough).
  const openSockets = (): { slot: SlotKey; idx: number }[] =>
    SLOT_KEYS.flatMap((sl) => {
      const idx = (equipped[sl]?.sockets ?? []).findIndex((so) => so.gem === null);
      return idx >= 0 ? [{ slot: sl, idx }] : [];
    });

  const cell = (entry: InvEntry): React.JSX.Element => {
    if (isGem(entry)) {
      return (
        <ItemCell
          item={null}
          gem={entry}
          draggable
          dragData={`inv|${entry.id}`}
          onContextMenu={(e) => {
            e.preventDefault();
            openMenu(e.clientX, e.clientY, [
              ...openSockets().map((so) => ({
                label: t('hero.menuSocket', { slot: slotLabel(so.slot) }),
                sign: 'ui_gem',
                onClick: () => requestSocket(entry, so.slot, so.idx),
              })),
              { label: t('hero.menuToStash'), sign: 'hud_stash', onClick: () => moveToStash(entry.id) },
            ]);
          }}
        />
      );
    }
    // The only equip block is the class lock (weapons by type, armour by family).
    const wrongClass = entry.classKey !== undefined && entry.classKey !== hero?.classKey;
    return (
      <ItemCell
        item={entry}
        compare={compareTargets(entry)}
        roleImpact={roleImpact}
        roleKeys={hero === undefined ? undefined : visibleRoles(hero.classKey)}
        unequippable={wrongClass}
        wrongClass={wrongClass}
        size={32}
        draggable
        dragData={`inv|${entry.id}`}
        onClick={() => {
          if (!wrongClass) equip(heroId, entry.id);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          openMenu(e.clientX, e.clientY, [
            {
              label: wrongClass ? t('hero.menuWrongClass') : t('hero.menuEquip'),
              sign: 'tab_gear',
              onClick: () => equip(heroId, entry.id),
              disabled: wrongClass,
            },
            { label: t('hero.menuToStash'), sign: 'hud_stash', onClick: () => moveToStash(entry.id) },
          ]);
        }}
      />
    );
  };

  return (
    // With pages, every page is as tall as a full one: a short last page would shrink the window and pull the
    // page keys from under the pointer.
    <div className="tk-hero-bag" style={{ '--rows': pages > 1 ? ROWS : 0 } as React.CSSProperties}>
      <Head>
        <Sign name="bag_pack" alt={t('hero.bag')} />
        <span className={full ? 'note bad' : 'note'} style={{ paddingTop: 1 }}>
          {filled} / {cap}
        </span>
        <div className="end">
          {pages > 1 && (
            <Pager
              className="tk-hero-pages"
              page={shown + 1}
              pages={pages}
              listed={pages}
              onPage={(n) => setPage(n - 1)}
              pageLabel={(n) => t('hero.bagPage', { n })}
            />
          )}
          <Chip
            sign="btn_sort"
            label={t('hero.sort')}
            onClick={sortInventory}
            tip={<TipTag side="below-end">{t('hero.sort')}</TipTag>}
          />
          <Chip
            sign="bag_gems_out"
            label={t('hero.gemsToStash')}
            on={hasGems}
            onClick={stashAllGems}
            tip={<TipTag side="below-end">{t('hero.gemsToStash')}</TipTag>}
          />
        </div>
      </Head>
      {/* Dropping onto the bag (between cells too): a stash entry comes in, a worn piece comes off. */}
      <DropZone
        accept={(d) => d.from === 'stash' || d.from === 'equip'}
        onDrop={(d) => {
          if (d.from === 'stash' && d.id !== undefined) moveToInventory(d.id);
          else if (d.from === 'equip' && d.slot !== undefined) unequip(heroId, d.slot);
        }}
      >
        <SlotGrid cols={COLS}>
          {Array.from({ length: Math.min(PAGE, cells - shown * PAGE) }, (_, n) => {
            const i = shown * PAGE + n;
            if (i >= cap) {
              const afford = gold >= slotCost;
              return (
                <Slot
                  key="buy"
                  icon={<Sign name="mark_buy" alt={t('hero.buySlot')} />}
                  className="buy"
                  interactive
                  onClick={() => buySlot()}
                >
                  <Tip side="left">
                    <TipTitle>{t('hero.buySlot')}</TipTitle>
                    <TipLine
                      label={t('hero.price')}
                      value={t('hero.goldAmount', { n: format(slotCost) })}
                      tone={afford ? 'gold' : 'bad'}
                    />
                    <TipLine
                      label={t('hero.slots')}
                      value={`${cap} / ${INVENTORY_BASE + INVENTORY_MAX_SLOTS}`}
                    />
                    {!afford && <TipWarn>{t('hero.notEnoughGold')}</TipWarn>}
                    {full && <TipText>{t('hero.bagFull')}</TipText>}
                  </Tip>
                </Slot>
              );
            }
            const entry = inventory[i] ?? null;
            // Each cell is its own drop zone, so a dragged entry lands in EXACTLY this slot (a reorder within the
            // bag, or a precise stash → bag move). Keyed by slot index, never by entry id.
            return (
              <DropZone
                key={i}
                cell
                accept={(d) => (d.from === 'inv' || d.from === 'stash') && d.id !== undefined}
                onDrop={(d) => {
                  if (d.id !== undefined) moveEntryToSlot(d.id, 'inventory', i);
                }}
              >
                {entry === null ? <Slot /> : cell(entry)}
              </DropZone>
            );
          })}
        </SlotGrid>
      </DropZone>
    </div>
  );
}
