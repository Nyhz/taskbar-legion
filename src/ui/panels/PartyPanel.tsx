import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useStore } from '@/state/store';
import type { PanelKey } from '@/state/slices/uiSlice';
import { classDef, CLASS_KEYS } from '@/data/classes';
import { getBonuses } from '@/sim/bonuses';
import { format } from '@/sim/num';
import { CLASS_ACCENT } from '@/game/render/textures';
import { totalExpToReach, expectedLevel } from '@/data/stageScaling';
import { SLOT_ICON } from '@/ui/icons';
import { SLOTS, SLOT_KEYS, slotFamily, type SlotKey } from '@/data/itemSlots';
import { inventorySlotCost, INVENTORY_MAX_SLOTS } from '@/data/inventory';
import { ItemSlot } from '@/ui/components/ItemSlot';
import { HoverTip } from '@/ui/components/HoverTip';
import { countFilled, findEntry } from '@/sim/slots';
import { AbilityBar } from '@/ui/panels/party/AbilityBar';
import { HeroIdleSprite } from '@/ui/components/HeroIdleSprite';
import { SocketConfirmModal, type PendingSocket } from '@/ui/components/SocketConfirmModal';
import { SocketChooserModal, type PendingChoice } from '@/ui/components/SocketChooserModal';
import { useContextMenu } from '@/ui/components/ContextMenu';
import { isGem } from '@/sim/items';
import type { ItemInstance, InvEntry } from '@/sim/items';
import type { GemInstance } from '@/data/gems';
import { PALETTE } from '@/styles/palette';

// Paper-doll Party panel: equipped gear flanks the portrait, a selectable party row
// switches the active hero, and the shared inventory sits below. Equip via drag onto
// a slot, left-click (quick), or right-click menu; unequip via drag-out / right-click.
// Stats + Talents buttons open their side panels (anchored left / right).

const LEFT_SLOTS: SlotKey[] = ['helmet', 'chest', 'gloves', 'legs', 'boots'];
const RIGHT_SLOTS: SlotKey[] = ['weapon', 'offhand', 'amulet', 'ring', 'trinket'];

export function PartyPanel(): React.JSX.Element {
  const roster = useStore((s) => s.roster);
  const selectedId = useStore((s) => s.selectedHeroId);
  const hero = roster.find((h) => h.id === selectedId) ?? roster[0];
  // A gem socketing awaiting confirmation (raised from the paper-doll drop or a gem's
  // right-click menu); the modal commits or cancels it.
  const [pending, setPending] = useState<PendingSocket | null>(null);
  // A drop onto an item that ALREADY has a socketed gem raises the socket CHOOSER instead
  // (pick which socket to fill, or swap out an existing gem).
  const [choice, setChoice] = useState<PendingChoice | null>(null);
  const hideSocketWarning = useStore((s) => s.hideSocketWarning);
  const socketGem = useStore((s) => s.socketGem);
  if (hero === undefined) return <div>No hero.</div>;

  // Skip straight to socketing once the player has dismissed the warning for good.
  const requestSocket = (gem: GemInstance, slot: SlotKey, socketIdx: number): void => {
    if (hideSocketWarning) socketGem(hero.id, slot, socketIdx, gem.id);
    else setPending({ gem, heroId: hero.id, slot, socketIdx });
  };
  // Open the socket chooser (used when the target item has at least one filled socket, so
  // the player can choose a free socket OR swap one out). Always confirmed — swaps destroy.
  const requestSocketChoice = (gem: GemInstance, slot: SlotKey): void => {
    setChoice({ gem, heroId: hero.id, slot });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      <PaperDoll heroId={hero.id} requestSocket={requestSocket} requestSocketChoice={requestSocketChoice} />
      <AbilityBar heroId={hero.id} />
      <PartyRow />
      <SharedInventory heroId={hero.id} requestSocket={requestSocket} />
      <MenuNav />
      {pending !== null && <SocketConfirmModal pending={pending} onClose={() => setPending(null)} />}
      {choice !== null && <SocketChooserModal pending={choice} onClose={() => setChoice(null)} />}
    </div>
  );
}

function PaperDoll({ heroId, requestSocket, requestSocketChoice }: { heroId: string; requestSocket: SocketRequest; requestSocketChoice: ChoiceRequest }): React.JSX.Element {
  const hero = useStore((s) => s.roster.find((h) => h.id === heroId));
  const inventory = useStore((s) => s.inventory);
  const stash = useStore((s) => s.stash);
  const equip = useStore((s) => s.equip);
  const unequip = useStore((s) => s.unequip);
  const togglePanel = useStore((s) => s.togglePanel);
  const stage = useStore((s) => s.hud.globalStage);
  const openMenu = useContextMenu();
  if (hero === undefined) return <div />;

  const def = classDef(hero.classKey);
  const expInto = hero.exp - totalExpToReach(hero.level);
  const expNeed = totalExpToReach(hero.level + 1) - totalExpToReach(hero.level);

  // Average item level of the EQUIPPED gear + a QUALITY read of how it compares to the level
  // loot is centred on at the current stage (expectedLevel). We don't show the exact target —
  // just an arrow: ▲ green (geared above level), ▬ amber (at/near level, within ±10%), ▼ red
  // (under-geared / naked). Thresholds are intentionally loose (±10%); tweak GEAR_* to taste.
  const GEAR_OVER = 1.1; // ≥ +10% over recommended → well geared
  const GEAR_UNDER = 0.9; // < −10% under recommended → under-geared
  const equipped = Object.values(hero.equipment).filter((it): it is ItemInstance => it !== undefined);
  const avgIlvlNum = equipped.length > 0 ? equipped.reduce((sum, it) => sum + it.ilvl, 0) / equipped.length : 0;
  const avgIlvl = avgIlvlNum.toFixed(1); // display with a single decimal
  const gearRatio = avgIlvlNum / Math.max(1, expectedLevel(stage));
  const gearQuality =
    avgIlvlNum === 0 || gearRatio < GEAR_UNDER
      ? { glyph: '▼', color: '#ff6f6f', tip: 'Under-geared for this stage — your gear is below the recommended level. Farm more drops before pushing.' }
      : gearRatio > GEAR_OVER
        ? { glyph: '▲', color: '#5fd47a', tip: 'Well geared for this stage — your gear is above the recommended level.' }
        : { glyph: '▬', color: PALETTE.gold, tip: 'On level for this stage — your gear is at or near the recommended level.' };

  const gearSlot = (slot: SlotKey): ReactNode => {
    const item = hero.equipment[slot] ?? null;
    // A drop here is either gear to equip (bag only) or a gem to socket — and a gem may
    // come from the bag OR the stash. Look the dragged entry up in its source container.
    // If the item ALREADY has a socketed gem, open the chooser (pick a free socket or swap
    // one out); otherwise fall back to filling the first free socket via the confirm modal.
    const onDrop = (d: DragPayload): void => {
      if (d.id === undefined) return;
      const entry = findEntry(d.from === 'stash' ? stash : inventory, d.id);
      if (entry !== undefined && isGem(entry)) {
        if (item === null || item.sockets.length === 0) return; // no sockets to fill
        if (item.sockets.some((so) => so.gem !== null)) {
          requestSocketChoice(entry, slot); // has a gem already → choose / swap
        } else {
          const idx = item.sockets.findIndex((so) => so.gem === null);
          if (idx >= 0) requestSocket(entry, slot, idx); // all empty → fill the first free socket
        }
        return;
      }
      if (d.from === 'inv') equip(hero.id, d.id, slot); // gear equips from the bag only
    };
    return (
      <DropTarget
        key={slot}
        accept={(d) => d.from === 'inv' || d.from === 'stash'}
        onDrop={onDrop}
      >
        {/* keyed by hero+slot so swapping the SELECTED hero doesn't flash every slot —
            only an actual equip into this slot replays the flash. */}
        <EquipFlash key={`${hero.id}-${slot}`} itemId={item?.id ?? null}>
          <ItemSlot
            item={item}
            label={SLOTS[slot].label}
            emptyIcon={SLOT_ICON[slot]}
            size={46}
            draggable
            dragData={`equip|${slot}`}
            onClick={() => item && unequip(hero.id, slot)}
            onContextMenu={(e) => {
              e.preventDefault();
              if (item) openMenu(e.clientX, e.clientY, [{ label: 'Unequip', icon: '⬇️', onClick: () => unequip(hero.id, slot) }]);
            }}
          />
        </EquipFlash>
      </DropTarget>
    );
  };

  // Gear flanks the portrait in TWO columns per side (4 columns total) so the paper
  // doll is short (3 rows) rather than tall (5 rows).
  const gearGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, auto)', gap: 4 };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
      <div style={gearGrid}>{LEFT_SLOTS.map(gearSlot)}</div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1, padding: '0 4px', minWidth: 0 }}>
        <div style={{ color: PALETTE.gold, fontWeight: 700 }}>{def.name}</div>
        <HeroIdleSprite classKey={hero.classKey} width={112} height={116} />
        <div style={{ color: PALETTE.parchment, fontSize: 11 }}>
          Lv.{hero.level} ·{' '}
          <HoverTip text={`Avg ilvl: ${avgIlvl}`}>iLv. {avgIlvl}</HoverTip>{' '}
          <HoverTip text={gearQuality.tip}>
            <span style={{ color: gearQuality.color, fontWeight: 700 }}>{gearQuality.glyph}</span>
          </HoverTip>
        </div>
        <div style={{ width: '100%', height: 5, background: PALETTE.bgInset, border: `1px solid ${PALETTE.ink}` }}>
          <div style={{ width: `${Math.min(100, (expInto / Math.max(1, expNeed)) * 100)}%`, height: '100%', background: PALETTE.xpBlue }} />
        </div>
        <SideBtn label="Pets" glyph="🐾" onClick={() => togglePanel('pets')} />
      </div>

      <div style={gearGrid}>{RIGHT_SLOTS.map(gearSlot)}</div>
    </div>
  );
}

function PartyRow(): React.JSX.Element {
  const roster = useStore((s) => s.roster);
  const selectedId = useStore((s) => s.selectedHeroId);
  const selectHero = useStore((s) => s.selectHero);
  const techRanks = useStore((s) => s.techRanks);
  const ownedPets = useStore((s) => s.ownedPets);
  const maxSlots = getBonuses(techRanks, ownedPets).partySlots;
  const [picking, setPicking] = useState(false);

  return (
    <div style={{ borderTop: `1px solid ${PALETTE.goldDim}`, paddingTop: 6 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        {[0, 1, 2].map((i) => {
          const h = roster[i];
          if (h !== undefined) {
            const def = classDef(h.classKey);
            const sel = h.id === selectedId;
            const hasTalentPoint = h.talentPoints > 0;
            return (
              <button key={i} onClick={() => selectHero(h.id)} style={{ ...memberBtn, position: 'relative', border: `2px solid ${sel ? PALETTE.gold : PALETTE.ink}`, boxShadow: sel ? `0 0 6px ${PALETTE.gold}` : undefined }}>
                {hasTalentPoint && (
                  <span
                    title={`${h.talentPoints} unspent talent point${h.talentPoints > 1 ? 's' : ''}`}
                    style={{ position: 'absolute', top: 3, right: 3, width: 8, height: 8, borderRadius: '50%', background: PALETTE.enemyAccent, border: `1px solid ${PALETTE.ink}`, boxShadow: `0 0 4px ${PALETTE.enemyAccent}` }}
                  />
                )}
                <HeroIdleSprite classKey={h.classKey} width={44} height={46} />
                <span style={{ fontSize: 10, color: PALETTE.gold, fontWeight: 700 }}>{def.name}</span>
                <span style={{ fontSize: 9, color: PALETTE.textMute }}>Lv.{h.level}</span>
              </button>
            );
          }
          if (i < maxSlots) {
            return (
              <button key={i} onClick={() => setPicking((v) => !v)} title="Recruit" style={{ ...memberBtn, border: `2px dashed ${PALETTE.goldDim}`, color: PALETTE.goldDim }}>
                <span style={{ fontSize: 22 }}>＋</span>
              </button>
            );
          }
          return (
            <div key={i} title="Unlock in Tech" style={{ ...memberBtn, opacity: 0.45 }}>
              <span style={{ fontSize: 18 }}>🔒</span>
            </div>
          );
        })}
      </div>
      {picking && <ClassPicker onClose={() => setPicking(false)} />}
    </div>
  );
}

function ClassPicker({ onClose }: { onClose: () => void }): React.JSX.Element {
  const roster = useStore((s) => s.roster);
  const unlocked = useStore((s) => s.unlockedClasses);
  const gold = useStore((s) => s.gold);
  const addHero = useStore((s) => s.addHero);
  const unlockClass = useStore((s) => s.unlockClass);
  const fielded = new Set(roster.map((h) => h.classKey));

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
      {CLASS_KEYS.map((key) => {
        const def = classDef(key);
        if (fielded.has(key)) return null;
        const accent = CLASS_ACCENT[key] ?? '#888';
        const isUnlocked = unlocked.includes(key);
        const cost = def.unlock.type === 'gold' ? def.unlock.cost : 0;
        const afford = gold >= cost;
        return (
          <button
            key={key}
            disabled={!isUnlocked && !afford}
            title={isUnlocked ? `Recruit ${def.name}` : `Unlock ${def.name} (${format(cost)}g)`}
            onClick={() => { if (isUnlocked) { addHero(key); onClose(); } else unlockClass(key); }}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 6px', background: PALETTE.bgInset, border: `1px solid ${isUnlocked ? PALETTE.goldDim : PALETTE.ink}`, color: isUnlocked ? PALETTE.textLight : PALETTE.textMute, fontSize: 10 }}
          >
            <span style={{ width: 12, height: 12, background: accent, border: `1px solid ${PALETTE.ink}` }} />
            {def.name}{isUnlocked ? '' : ` 🔒${format(cost)}g`}
          </button>
        );
      })}
    </div>
  );
}

function SharedInventory({ heroId, requestSocket }: { heroId: string; requestSocket: SocketRequest }): React.JSX.Element {
  const inventory = useStore((s) => s.inventory);
  const slotUpgrades = useStore((s) => s.inventorySlotUpgrades);
  const gold = useStore((s) => s.gold);
  const cap = useStore((s) => s.inventoryCap());
  const equip = useStore((s) => s.equip);
  const moveToStash = useStore((s) => s.moveToStash);
  const moveToInventory = useStore((s) => s.moveToInventory);
  const unequip = useStore((s) => s.unequip);
  const buySlot = useStore((s) => s.buyInventorySlot);
  const sortInventory = useStore((s) => s.sortInventory);
  const stashAllGems = useStore((s) => s.stashAllGems);
  const equipped = useStore((s) => s.roster.find((h) => h.id === heroId)?.equipment ?? {});
  const heroClass = useStore((s) => s.roster.find((h) => h.id === heroId)?.classKey);
  const openMenu = useContextMenu();

  const slotCost = inventorySlotCost(slotUpgrades);
  const canExpand = slotUpgrades < INVENTORY_MAX_SLOTS && gold >= slotCost;
  const hasGems = inventory.some((e) => e !== null && isGem(e));

  // What an inventory item's tooltip compares against: nothing if a slot in its
  // family is free (pure gain), otherwise every occupied family slot it could replace.
  const compareTargets = (item: ItemInstance): ItemInstance[] => {
    const family = slotFamily(item.slot);
    if (family.some((sl) => equipped[sl] === undefined)) return [];
    return family.flatMap((sl) => { const eq = equipped[sl]; return eq ? [eq] : []; });
  };

  // Every empty socket across the hero's equipped gear — the targets a gem can fill.
  const openSockets = (): { slot: SlotKey; idx: number }[] => {
    const out: { slot: SlotKey; idx: number }[] = [];
    for (const sl of SLOT_KEYS) {
      equipped[sl]?.sockets.forEach((so, idx) => { if (so.gem === null) out.push({ slot: sl, idx }); });
    }
    return out;
  };

  // Keyed by SLOT INDEX (not item id) so a stray duplicate id can never collide React
  // keys and leave a ghost cell (which only cleared on remount before).
  const renderEntry = (entry: InvEntry, slotIndex: number): ReactNode => {
    if (isGem(entry)) {
      return (
        <ItemSlot
          key={`slot-${slotIndex}`}
          item={null}
          gem={entry}
          size={32}
          draggable
          dragData={`inv|${entry.id}`}
          onContextMenu={(e) => {
            e.preventDefault();
            const sockets = openSockets();
            openMenu(e.clientX, e.clientY, [
              ...sockets.map((s) => ({
                label: `Socket → ${SLOTS[s.slot].label}`,
                icon: '◆',
                onClick: () => requestSocket(entry, s.slot, s.idx),
              })),
              { label: 'Send to Stash', icon: '🧰', onClick: () => moveToStash(entry.id) },
            ]);
          }}
        />
      );
    }
    // ilvl no longer gates equipping (it's a pure power stat now). The ONLY equip block is
    // a class-locked weapon/off-hand — so the ✕ appears solely for wrong-class items.
    const wrongClass = entry.classKey !== undefined && entry.classKey !== heroClass;
    const cannotEquip = wrongClass;
    const reason = wrongClass ? '🚫 Wrong class' : null;
    return (
      <ItemSlot
        key={`slot-${slotIndex}`}
        item={entry}
        compare={compareTargets(entry)}
        unequippable={cannotEquip}
        wrongClass={wrongClass}
        size={32}
        draggable
        dragData={`inv|${entry.id}`}
        onClick={() => { if (!cannotEquip) equip(heroId, entry.id); }}
        onContextMenu={(e) => {
          e.preventDefault();
          openMenu(e.clientX, e.clientY, [
            { label: reason ?? 'Equip', icon: '🛡️', onClick: () => equip(heroId, entry.id), disabled: cannotEquip },
            { label: 'Send to Stash', icon: '🧰', onClick: () => moveToStash(entry.id) },
          ]);
        }}
      />
    );
  };

  return (
    <div style={{ borderTop: `1px solid ${PALETTE.goldDim}`, paddingTop: 6, display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14 }}>🎒</span>
        <span style={{ color: PALETTE.textMute, fontSize: 11 }}>{countFilled(inventory)}/{cap}</span>
        <button
          onClick={sortInventory}
          title="Sort by tier"
          style={{ fontSize: 11, padding: '1px 7px', background: PALETTE.bgInset, border: `1px solid ${PALETTE.ink}`, color: PALETTE.parchment, cursor: 'pointer' }}
        >
          ⇅ Sort
        </button>
        <button
          onClick={stashAllGems}
          disabled={!hasGems}
          title="Move all gems from your bag into the stash"
          style={{ fontSize: 11, padding: '1px 7px', background: hasGems ? PALETTE.bgInset : '#1a141f', border: `1px solid ${PALETTE.ink}`, color: hasGems ? PALETTE.parchment : PALETTE.textMute, cursor: hasGems ? 'pointer' : 'default' }}
        >
          ◆ Stash gems
        </button>
        <div style={{ flex: 1 }} />
        {slotUpgrades < INVENTORY_MAX_SLOTS && (
          <button
            disabled={!canExpand}
            onClick={buySlot}
            title="Add an inventory slot"
            style={{ fontSize: 10, padding: '2px 6px', background: canExpand ? PALETTE.bgInset : '#1a141f', border: `1px solid ${PALETTE.ink}`, color: canExpand ? PALETTE.gold : PALETTE.textMute }}
          >
            Add Slot {format(slotCost)}g
          </button>
        )}
      </div>

      <DropTarget
        accept={(d) => d.from === 'stash' || d.from === 'equip'}
        onDrop={(d) => {
          if (d.from === 'stash' && d.id !== undefined) moveToInventory(d.id);
          else if (d.from === 'equip' && d.slot !== undefined) unequip(heroId, d.slot);
        }}
      >
        {/* Cap the bag at 3 rows and scroll only beyond that, so buying more slots never grows
            the panel upward. Each cell is 32px + a 2px border on each side = 36px tall; 3 rows
            with 3px gaps ⇒ 36·3 + 3·2 = 114px (the old 102 forgot the borders, so it scrolled
            at 3 rows). The 4th row of slots is what should start the scroll. */}
        <div className="tl-scroll" style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 3, maxHeight: 114, overflowY: 'auto', overflowX: 'hidden', alignContent: 'start' }}>
          {/* Fixed slots: render every cell up to capacity; holes stay empty in place. */}
          {Array.from({ length: cap }, (_, i) => {
            const entry = inventory[i] ?? null;
            return entry === null ? <ItemSlot key={`slot-${i}`} item={null} size={32} /> : renderEntry(entry, i);
          })}
        </div>
      </DropTarget>
    </div>
  );
}

// ── helpers ──

/** Raise a gem-socketing for confirmation (paper-doll drop / gem right-click menu). */
type SocketRequest = (gem: GemInstance, slot: SlotKey, socketIdx: number) => void;
/** Open the socket chooser for an item that already has a socketed gem (pick / swap). */
type ChoiceRequest = (gem: GemInstance, slot: SlotKey) => void;

interface DragPayload { from: string; id?: string; slot?: SlotKey }
function parseDrag(s: string): DragPayload {
  const [from, rest] = s.split('|');
  if (from === 'equip') return { from: 'equip', slot: rest as SlotKey };
  return { from: from ?? '', id: rest };
}

// A gold ring that flashes over a gear slot the moment a NEW item lands in it (left-click
// equip / drag-equip / swap), so an otherwise-instant equip is visibly confirmed. The flash
// overlay is keyed by a tick so each equip replays it; the body stays mounted underneath.
function EquipFlash({ itemId, children }: { itemId: string | null; children: ReactNode }): React.JSX.Element {
  const [tick, setTick] = useState(0);
  const prevId = useRef<string | null>(itemId);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; prevId.current = itemId; return; } // skip the initial mount
    if (itemId !== null && itemId !== prevId.current) setTick((t) => t + 1); // a new/different item arrived
    prevId.current = itemId;
  }, [itemId]);
  return (
    <div style={{ position: 'relative' }}>
      {children}
      {tick > 0 && (
        <span
          key={tick}
          className="tl-equip-flash"
          style={{ position: 'absolute', inset: -2, pointerEvents: 'none', border: `2px solid ${PALETTE.gold}`, boxSizing: 'border-box' }}
        />
      )}
    </div>
  );
}

function DropTarget({ accept, onDrop, children }: { accept: (d: DragPayload) => boolean; onDrop: (d: DragPayload) => void; children: ReactNode }): React.JSX.Element {
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!over) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const d = parseDrag(e.dataTransfer.getData('text/plain'));
        if (accept(d)) onDrop(d);
      }}
      style={{ outline: over ? `2px solid ${PALETTE.gold}` : 'none', borderRadius: 2 }}
    >
      {children}
    </div>
  );
}

function SideBtn({ label, glyph, onClick }: { label: string; glyph: string; onClick: () => void }): React.JSX.Element {
  return (
    <button onClick={onClick} title={label} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: PALETTE.bgInset, border: `1px solid ${PALETTE.ink}`, color: PALETTE.textLight, fontSize: 10 }}>
      <span>{glyph}</span>{label}
    </button>
  );
}

// The five panel launchers below the inventory. Stash/Talents anchor to the LEFT of
// the party menu, Cube/Map to the RIGHT, and Tech slides up over it. They fill the
// row equally; an active panel lights up gold.
const NAV: { key: PanelKey; glyph: string; label: string }[] = [
  { key: 'stash', glyph: '🧰', label: 'Stash' },
  { key: 'talents', glyph: '✦', label: 'Talents' },
  { key: 'tech', glyph: '🌳', label: 'Tech' },
  { key: 'cube', glyph: '🧊', label: 'Cube' },
  { key: 'map', glyph: '🗺', label: 'Map' },
];

function MenuNav(): React.JSX.Element {
  const openPanels = useStore((s) => s.openPanels);
  const togglePanel = useStore((s) => s.togglePanel);
  return (
    <div style={{ borderTop: `1px solid ${PALETTE.goldDim}`, paddingTop: 6, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
      {NAV.map(({ key, glyph, label }) => {
        const active = openPanels.includes(key);
        return (
          <button
            key={key}
            onClick={() => togglePanel(key)}
            title={label}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
              minWidth: 0, padding: '6px 0', cursor: 'pointer',
              background: active ? PALETTE.titleRed : PALETTE.bgInset,
              border: `1px solid ${active ? PALETTE.gold : PALETTE.ink}`,
              color: PALETTE.textLight,
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>{glyph}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: active ? PALETTE.gold : PALETTE.parchment }}>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

const memberBtn: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
  height: 76, background: PALETTE.bgInset, color: PALETTE.textLight, cursor: 'pointer',
};
