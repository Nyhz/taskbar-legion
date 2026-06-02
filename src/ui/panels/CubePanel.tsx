import { useState } from 'react';
import { useStore } from '@/state/store';
import { ItemSlot } from '@/ui/components/ItemSlot';
import { StatRow } from '@/ui/components/StatRow';
import { isItem, isGem, type ItemInstance } from '@/sim/items';
import { entries } from '@/sim/slots';
import {
  CUBE_INPUT_COUNT,
  itemGoldValue,
  alchemyTotal,
  canTransfigure,
  transfigPool,
  transfigureRoll,
} from '@/sim/cube';
import { tierName } from '@/ui/tierStyle';
import { format } from '@/sim/num';
import { TIERS, type ItemTier } from '@/data/tiers';
import type { StatKey } from '@/data/stats';
import type { GemInstance } from '@/data/gems';
import { TRANSFIG_OFFENSIVE_GEMS, TRANSFIG_DEFENSIVE_GEMS } from '@/data/cube';
import { PALETTE } from '@/styles/palette';

// The Cube — three recipes behind a tab row:
//  • Synthesize: 9 same-tier items → 1 of the next tier (ilvl = median of inputs).
//  • Alchemy:    melt items → gold (per-item value by tier + ilvl).
//  • Transfigure: re-roll one affix into a different stat, paid with two gems.
// Inputs sit in a 3×3 "cube" grid.

type Mode = 'synthesize' | 'alchemy' | 'transfigure';

export function CubePanel(): React.JSX.Element {
  const [mode, setMode] = useState<Mode>('synthesize');
  return (
    <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 4 }}>
        <Tab label="Synthesize" active={mode === 'synthesize'} onClick={() => setMode('synthesize')} />
        <Tab label="Alchemy" active={mode === 'alchemy'} onClick={() => setMode('alchemy')} />
        <Tab label="Transfigure" active={mode === 'transfigure'} onClick={() => setMode('transfigure')} />
      </div>
      {mode === 'synthesize' && <SynthesizeMode />}
      {mode === 'alchemy' && <AlchemyMode />}
      {mode === 'transfigure' && <TransfigureMode />}
    </div>
  );
}

// ───────────────────────────── Synthesize ─────────────────────────────

function SynthesizeMode(): React.JSX.Element {
  const inventory = entries(useStore((s) => s.inventory)).filter(isItem).filter((i) => i.tier < 8);
  const cubeCombine = useStore((s) => s.cubeCombine);
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);

  const items = selected.map((id) => inventory.find((i) => i.id === id)).filter((i): i is ItemInstance => i !== undefined);
  const selTier = items[0]?.tier;

  const toggle = (item: ItemInstance): void => {
    setResult(null);
    setSelected((cur) => {
      if (cur.includes(item.id)) return cur.filter((x) => x !== item.id);
      if (selTier !== undefined && item.tier !== selTier) return cur; // same tier only
      if (cur.length >= CUBE_INPUT_COUNT) return cur;
      return [...cur, item.id];
    });
  };

  const autoFill = (): void => {
    setResult(null);
    const byTier = new Map<number, string[]>();
    for (const i of inventory) {
      const list = byTier.get(i.tier) ?? [];
      list.push(i.id);
      byTier.set(i.tier, list);
    }
    let best: string[] | null = null;
    for (const list of byTier.values()) {
      if (list.length >= CUBE_INPUT_COUNT && (best === null || list.length > best.length)) best = list;
    }
    if (best !== null) setSelected(best.slice(0, CUBE_INPUT_COUNT));
  };

  const ready = selected.length === CUBE_INPUT_COUNT && selTier !== undefined;
  const synth = (): void => {
    if (!ready || selTier === undefined) return;
    if (cubeCombine(selected)) {
      setResult(`Synthesized a ${tierName((selTier + 1) as ItemTier)} item (ilvl = input median, bound).`);
      setSelected([]);
    }
  };

  return (
    <>
      <Hint>Combine {CUBE_INPUT_COUNT} items of the SAME tier into one of the next tier. Its item level is the median of the inputs, and it's bound.</Hint>
      <CubeGrid items={items} onRemove={toggle} />
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={autoFill} style={btn(true)}>Auto Fill</button>
        <button onClick={synth} disabled={!ready} style={btn(ready)}>
          Synthesize{selTier !== undefined ? ` T${selTier}→T${selTier + 1}` : ''}
        </button>
      </div>
      {result && <Result>{result}</Result>}
      <Browser
        items={inventory}
        selected={selected}
        onPick={toggle}
        disabled={(i) => selTier !== undefined && i.tier !== selTier}
        label="Items (same tier only)"
      />
    </>
  );
}

// ───────────────────────────── Alchemy ─────────────────────────────

function AlchemyMode(): React.JSX.Element {
  const inventory = entries(useStore((s) => s.inventory)).filter(isItem);
  const cubeAlchemy = useStore((s) => s.cubeAlchemy);
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<string | null>(null);

  const items = selected.map((id) => inventory.find((i) => i.id === id)).filter((i): i is ItemInstance => i !== undefined);
  const total = alchemyTotal(items);

  const toggle = (item: ItemInstance): void => {
    setResult(null);
    setSelected((cur) => {
      if (cur.includes(item.id)) return cur.filter((x) => x !== item.id);
      if (cur.length >= CUBE_INPUT_COUNT) return cur;
      return [...cur, item.id];
    });
  };

  const autoFill = (): void => {
    setResult(null);
    // Prioritize the LOWEST-tier, then lowest-ilvl items — scrap the junk first.
    const sorted = [...inventory].sort((a, b) => a.tier - b.tier || a.ilvl - b.ilvl);
    setSelected(sorted.slice(0, CUBE_INPUT_COUNT).map((i) => i.id));
  };

  const ready = selected.length > 0;
  const convert = (): void => {
    if (!ready) return;
    const gold = cubeAlchemy(selected);
    setResult(`Melted ${selected.length} item${selected.length > 1 ? 's' : ''} → +${format(gold)} gold.`);
    setSelected([]);
  };

  return (
    <>
      <Hint>Melt items into gold. Higher tier and higher item level are worth more. Auto Fill grabs your lowest-tier junk first.</Hint>
      <AutoSalvageControl />
      <CubeGrid items={items} onRemove={toggle} goldOf={itemGoldValue} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: PALETTE.textMute, fontSize: 11 }}>
          Total: <span style={{ color: PALETTE.gold, fontWeight: 700 }}>{format(total)}g</span>
        </span>
        <div style={{ flex: 1 }} />
        <button onClick={autoFill} style={btn(true)}>Auto Fill</button>
        <button onClick={convert} disabled={!ready} style={btn(ready)}>Convert</button>
      </div>
      {result && <Result>{result}</Result>}
      <Browser items={inventory} selected={selected} onPick={toggle} goldOf={itemGoldValue} label="Items (any tier)" />
    </>
  );
}

// Auto-salvage: a checkbox that melts marked-rarity loot to gold on arrival, plus a ⚙
// gearbox opening a per-rarity filter (only ticked rarities auto-salvage).
function AutoSalvageControl(): React.JSX.Element {
  const autoSalvage = useStore((s) => s.autoSalvage);
  const setAutoSalvage = useStore((s) => s.setAutoSalvage);
  const toggleTier = useStore((s) => s.toggleAutoSalvageTier);
  const [open, setOpen] = useState(false);
  const marked = autoSalvage.tiers.filter(Boolean).length;
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, color: PALETTE.textLight, fontWeight: 700 }}>
        <input type="checkbox" checked={autoSalvage.enabled} onChange={(e) => setAutoSalvage(e.target.checked)} />
        Auto salvage
      </label>
      <span style={{ fontSize: 10, color: PALETTE.textMute }}>
        {marked === 0 ? 'no rarities set' : `${marked} ${marked === 1 ? 'rarity' : 'rarities'}`}
      </span>
      <div style={{ flex: 1 }} />
      <button onClick={() => setOpen((o) => !o)} title="Choose which rarities to auto-salvage" style={{ ...btn(true), flex: 'none', padding: '2px 8px' }}>⚙</button>
      {open && (
        <div
          style={{
            position: 'absolute', top: '108%', right: 0, zIndex: 50, minWidth: 160,
            background: PALETTE.bgPanel, border: `2px solid ${PALETTE.ink}`, boxShadow: `0 0 0 1px ${PALETTE.goldDim}`,
            padding: 8, display: 'flex', flexDirection: 'column', gap: 2,
          }}
        >
          <div style={{ color: PALETTE.textMute, fontSize: 10, marginBottom: 3 }}>Auto-salvage to gold:</div>
          {TIERS.map((t) => (
            <label key={t.tier} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, padding: '1px 0' }}>
              <input type="checkbox" checked={autoSalvage.tiers[t.tier] === true} onChange={() => toggleTier(t.tier)} />
              <span style={{ color: t.color === 'iridescent' ? PALETTE.gold : t.color, fontWeight: 700, width: 22 }}>T{t.tier}</span>
              <span style={{ color: PALETTE.parchment }}>{t.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────── Transfigure ─────────────────────────────

interface Pending {
  itemId: string;
  affixIndex: number;
  oldStat: { key: StatKey; value: number };
  newStat: { key: StatKey; value: number };
}

function TransfigureMode(): React.JSX.Element {
  const inventory = entries(useStore((s) => s.inventory));
  const cubeTransfigure = useStore((s) => s.cubeTransfigure);
  const cubeApplyTransfigure = useStore((s) => s.cubeApplyTransfigure);
  const [itemId, setItemId] = useState<string | null>(null);
  const [affixIndex, setAffixIndex] = useState<number | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const gear = inventory.filter(isItem);
  const gems = inventory.filter(isGem);
  const item = gear.find((i) => i.id === itemId) ?? null;

  // The two gems that will pay: one of each family at the item's tier.
  const pickGem = (family: readonly string[]): GemInstance | null =>
    item === null ? null : gems.find((g) => g.tier === item.tier && family.includes(g.key)) ?? null;
  const offGem = pickGem(TRANSFIG_OFFENSIVE_GEMS);
  const defGem = pickGem(TRANSFIG_DEFENSIVE_GEMS);

  const selectItem = (i: ItemInstance): void => {
    setResult(null);
    setPending(null);
    setAffixIndex(null);
    setItemId((cur) => (cur === i.id ? null : i.id));
  };

  const haveGems = offGem !== null && defGem !== null;
  const canDo =
    item !== null &&
    affixIndex !== null &&
    haveGems &&
    pending === null &&
    canTransfigure(item, [offGem, defGem].filter((g): g is GemInstance => g !== null));

  const transform = (): void => {
    if (item === null || affixIndex === null || offGem === null || defGem === null) return;
    const oldStat = item.stats[affixIndex];
    const newStat = transfigureRoll(item, affixIndex);
    if (oldStat === undefined || newStat === null) return;
    if (cubeTransfigure(item.id, [offGem.id, defGem.id], affixIndex)) {
      setPending({ itemId: item.id, affixIndex, oldStat, newStat });
    }
  };

  const finish = (msg: string): void => {
    setPending(null);
    setAffixIndex(null);
    setItemId(null);
    setResult(msg);
  };
  const keepNew = (): void => {
    if (pending === null) return;
    cubeApplyTransfigure(pending.itemId, pending.affixIndex);
    finish('Transfigured — kept the new affix.');
  };
  const keepOld = (): void => finish('Transfigured — kept the original affix.');

  return (
    <>
      <Hint>Re-roll ONE affix of a gear piece into a different stat. Costs 1 offensive + 1 defensive gem at the item&apos;s tier. One-time per item — the gems are spent whichever affix you keep.</Hint>

      {/* item + the two paying gems */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
        <SlotBox label="Item"><ItemSlot item={item} size={44} label="·" /></SlotBox>
        <span style={{ color: PALETTE.textMute }}>+</span>
        <SlotBox label="Off. gem"><ItemSlot item={null} gem={offGem ?? undefined} size={40} label="·" /></SlotBox>
        <SlotBox label="Def. gem"><ItemSlot item={null} gem={defGem ?? undefined} size={40} label="·" /></SlotBox>
      </div>

      {item !== null && pending === null && (
        item.transfigured === true ? (
          <Result>This item was already transfigured — it can&apos;t be altered again.</Result>
        ) : transfigPool(item).length === 0 ? (
          <Result>No different stat is available to roll into for this item.</Result>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ color: PALETTE.textMute, fontSize: 11 }}>Choose the affix to alter:</div>
            {item.stats.map((s, i) => (
              <button
                key={i}
                onClick={() => setAffixIndex(i)}
                style={{
                  textAlign: 'left', padding: '2px 6px', cursor: 'pointer',
                  background: affixIndex === i ? PALETTE.bgPanel : PALETTE.bgInset,
                  border: `1px solid ${affixIndex === i ? PALETTE.gold : PALETTE.ink}`,
                }}
              >
                <StatRow statKey={s.key} value={s.value} />
              </button>
            ))}
            {!haveGems && (
              <div style={{ color: PALETTE.enemyAccent, fontSize: 10 }}>
                Need 1 offensive + 1 defensive gem at {item ? `T${item.tier}` : 'matching tier'}.
              </div>
            )}
            <button onClick={transform} disabled={!canDo} style={{ ...btn(canDo), marginTop: 2 }}>Transform</button>
          </div>
        )
      )}

      {pending !== null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, border: `1px solid ${PALETTE.gold}`, padding: 6 }}>
          <div style={{ color: PALETTE.textMute, fontSize: 10 }}>Old</div>
          <StatRow statKey={pending.oldStat.key} value={pending.oldStat.value} />
          <div style={{ color: PALETTE.textMute, fontSize: 10 }}>New</div>
          <StatRow statKey={pending.newStat.key} value={pending.newStat.value} />
          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
            <button onClick={keepOld} style={btn(true)}>Keep Old</button>
            <button onClick={keepNew} style={btn(true)}>Keep New</button>
          </div>
        </div>
      )}

      {result && <Result>{result}</Result>}

      {pending === null && (
        <Browser
          items={gear}
          selected={itemId !== null ? [itemId] : []}
          onPick={selectItem}
          disabled={(i) => i.transfigured === true}
          badgeOf={(i) => (i.transfigured === true ? '✗' : i.id === itemId ? '✓' : null)}
          label="Pick an item (✗ = already transfigured)"
        />
      )}
    </>
  );
}

// ───────────────────────────── shared bits ─────────────────────────────

function CubeGrid({
  items,
  onRemove,
  goldOf,
}: {
  items: ItemInstance[];
  onRemove: (i: ItemInstance) => void;
  goldOf?: (i: ItemInstance) => number;
}): React.JSX.Element {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, justifyItems: 'center', padding: 6, background: PALETTE.bgInset, border: `2px solid ${PALETTE.goldDim}` }}>
      {Array.from({ length: CUBE_INPUT_COUNT }, (_, i) => {
        const it = items[i];
        return (
          <ItemSlot
            key={i}
            item={it ?? null}
            size={32}
            label="·"
            onClick={() => it && onRemove(it)}
            badge={it && goldOf ? <span style={{ position: 'absolute', bottom: -2, left: 1, fontSize: 8, color: PALETTE.gold, fontWeight: 700 }}>{format(goldOf(it))}</span> : undefined}
          />
        );
      })}
    </div>
  );
}

function Browser({
  items,
  selected,
  onPick,
  disabled,
  goldOf,
  badgeOf,
  label,
}: {
  items: ItemInstance[];
  selected: string[];
  onPick: (i: ItemInstance) => void;
  disabled?: (i: ItemInstance) => boolean;
  goldOf?: (i: ItemInstance) => number;
  badgeOf?: (i: ItemInstance) => string | null;
  label: string;
}): React.JSX.Element {
  return (
    <>
      <div style={{ borderTop: `1px solid ${PALETTE.goldDim}`, paddingTop: 4, color: PALETTE.textMute, fontSize: 11 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(32px, 1fr))', gap: 3, justifyItems: 'center', maxHeight: 150, overflow: 'auto' }} className="tl-scroll">
        {items.map((item, i) => {
          const off = disabled?.(item) === true && !selected.includes(item.id);
          const badge = badgeOf?.(item) ?? (selected.includes(item.id) ? '✓' : null);
          return (
            <div key={`${item.id}-${i}`} style={{ opacity: off ? 0.35 : 1 }}>
              <ItemSlot
                item={item}
                size={28}
                onClick={() => { if (!off) onPick(item); }}
                badge={
                  <>
                    {badge && <span style={{ position: 'absolute', top: -1, left: 1, color: PALETTE.gold, fontSize: 9 }}>{badge}</span>}
                    {goldOf && <span style={{ position: 'absolute', bottom: -2, left: 1, fontSize: 7, color: PALETTE.parchment }}>{format(goldOf(item))}</span>}
                  </>
                }
              />
            </div>
          );
        })}
      </div>
    </>
  );
}

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '4px 2px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
        background: active ? PALETTE.titleRed : PALETTE.bgInset,
        border: `1px solid ${active ? PALETTE.gold : PALETTE.ink}`,
        color: active ? PALETTE.gold : PALETTE.parchment,
      }}
    >
      {label}
    </button>
  );
}

function SlotBox({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      {children}
      <span style={{ fontSize: 9, color: PALETTE.textMute }}>{label}</span>
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div style={{ color: PALETTE.textMute, fontSize: 11 }}>{children}</div>;
}

function Result({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div style={{ color: PALETTE.gold, fontSize: 11 }}>{children}</div>;
}

function btn(enabled: boolean): React.CSSProperties {
  return { flex: 1, padding: 5, cursor: enabled ? 'pointer' : 'default', background: enabled ? PALETTE.titleRed : PALETTE.bgInset, border: `1px solid ${PALETTE.ink}`, color: enabled ? PALETTE.textLight : PALETTE.textMute };
}
