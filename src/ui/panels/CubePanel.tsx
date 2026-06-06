import { useState } from 'react';
import { useStore } from '@/state/store';
import { ItemSlot } from '@/ui/components/ItemSlot';
import { StatRow } from '@/ui/components/StatRow';
import { isItem, isGem, itemPerfectCount, type ItemInstance, type InvEntry } from '@/sim/items';
import { entries } from '@/sim/slots';
import {
  CUBE_INPUT_COUNT,
  itemGoldValue,
  alchemyTotal,
  canTransfigure,
  transfigPool,
  transfigureRoll,
  transfigCostOptions,
  type TransfigCost,
} from '@/sim/cube';
import { tierName } from '@/ui/tierStyle';
import { format } from '@/sim/num';
import { TIERS } from '@/data/tiers';
import type { StatKey } from '@/data/stats';
import { GEMS, type GemInstance } from '@/data/gems';
import { PALETTE } from '@/styles/palette';

// The Cube — three recipes behind a tab row:
//  • Synthesize: 9 same-tier items → 1 of the next tier (ilvl = median of inputs).
//  • Alchemy:    melt items → gold (per-item value by tier + ilvl).
//  • Transfigure: re-roll one affix into a different stat, paid with gems (1 same-tier or
//    2 one-tier-below).
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

// A "?" help button for the panel title bar (left of the close ×, matching its style) —
// hovering it explains all three Cube recipes. Wired in via PixelWindow.headerActions.
export function CubeHelpButton(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        aria-label="How the Cube works"
        style={{ background: PALETTE.titleRedHi, color: PALETTE.textLight, border: `1px solid ${PALETTE.ink}`, width: 18, height: 18, lineHeight: '14px', fontWeight: 700, padding: 0, cursor: 'help' }}
      >
        ?
      </button>
      {open && (
        <div
          style={{
            position: 'absolute', top: '125%', right: 0, zIndex: 100, width: 250,
            background: PALETTE.bgPanel, border: `2px solid ${PALETTE.ink}`,
            boxShadow: `0 0 0 1px ${PALETTE.goldDim}, 3px 3px 0 rgba(0,0,0,0.5)`,
            padding: 8, color: PALETTE.textLight, fontSize: 10, lineHeight: 1.45,
            fontWeight: 400, letterSpacing: 0, textTransform: 'none', cursor: 'default',
            display: 'flex', flexDirection: 'column', gap: 6,
          }}
        >
          <div style={{ color: PALETTE.gold, fontWeight: 700, fontSize: 11 }}>How the Cube works</div>
          <div><b style={{ color: PALETTE.parchment }}>Synthesize</b> — combine 9 items OR 9 gems of the same tier into one of the next tier (5% chance to jump TWO tiers, marked with a gold glow — raise it with the <i>Transmuter&apos;s Fortune</i> tech). Tick <i>Include stash items</i> to also pull from your stash. An item&apos;s level is the median of the inputs.</div>
          <div><b style={{ color: PALETTE.parchment }}>Alchemy</b> — melt any items into gold; higher tier and item level are worth more. Optional auto-salvage melts chosen rarities the moment they drop.</div>
          <div><b style={{ color: PALETTE.parchment }}>Transfigure</b> — re-roll ONE affix on a gear piece into a different stat, paid with either 1 gem at the item&apos;s tier OR 2 gems one tier below (any colours). One-time per item; keep either the new roll or the original.</div>
        </div>
      )}
    </span>
  );
}

// ───────────────────────────── Synthesize ─────────────────────────────

interface SynthResult { entry: InvEntry; lucky: boolean }

// Both items (T0-8) and gems (T1-8) cap synthesis at tier 8.
const isSynthable = (e: InvEntry): boolean => e.tier < 8;
const kindOf = (e: InvEntry): 'gem' | 'item' => (isGem(e) ? 'gem' : 'item');

function SynthesizeMode(): React.JSX.Element {
  const invEntries = entries(useStore((s) => s.inventory));
  const stashEntries = entries(useStore((s) => s.stash));
  const cubeCombine = useStore((s) => s.cubeCombine);
  const [includeStash, setIncludeStash] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<SynthResult | null>(null);

  // Candidate pool: the bag's synthesizable entries first, then the stash's (when included),
  // so Auto Fill drains the bag before topping up from the stash.
  const pool: InvEntry[] = [
    ...invEntries.filter(isSynthable),
    ...(includeStash ? stashEntries.filter(isSynthable) : []),
  ];

  const chosen = selected.map((id) => pool.find((e) => e.id === id)).filter((e): e is InvEntry => e !== undefined);
  const first = chosen[0];
  const selTier = first?.tier;
  const selKind = first === undefined ? undefined : kindOf(first);
  const sameBatch = (e: InvEntry): boolean => selTier === undefined || (e.tier === selTier && kindOf(e) === selKind);

  const toggle = (e: InvEntry): void => {
    setSelected((cur) => {
      if (cur.includes(e.id)) return cur.filter((x) => x !== e.id);
      if (!sameBatch(e)) return cur; // one batch = same KIND (item|gem) + same tier
      if (cur.length >= CUBE_INPUT_COUNT) return cur;
      return [...cur, e.id];
    });
  };

  const autoFill = (): void => {
    const groups = new Map<string, string[]>(); // key = "i3" / "g3" → ids, bag-first
    for (const e of pool) {
      const k = `${kindOf(e)[0]}${e.tier}`;
      const list = groups.get(k) ?? [];
      list.push(e.id);
      groups.set(k, list);
    }
    let best: string[] | null = null;
    for (const list of groups.values()) {
      if (list.length >= CUBE_INPUT_COUNT && (best === null || list.length > best.length)) best = list;
    }
    if (best !== null) setSelected(best.slice(0, CUBE_INPUT_COUNT));
  };

  const ready = selected.length === CUBE_INPUT_COUNT && selTier !== undefined;
  const synth = (): void => {
    if (!ready || selTier === undefined) return;
    const made = cubeCombine(selected);
    if (made !== null) {
      setResult({ entry: made, lucky: made.tier > selTier + 1 }); // +2 over inputs ⇒ lucky craft
      setSelected([]);
    }
  };

  // While a result is on screen the 9-grid makes way for the created item + Accept, so the
  // player sees exactly what they crafted; Accept restores the grid for the next batch.
  if (result !== null) return <SynthResultCard result={result} onAccept={() => setResult(null)} />;

  return (
    <>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 11, color: PALETTE.textLight, fontWeight: 700 }}>
        <input
          type="checkbox"
          checked={includeStash}
          onChange={(e) => { setIncludeStash(e.target.checked); setSelected([]); }}
        />
        Include stash items
      </label>
      <CubeGrid items={chosen} onRemove={toggle} />
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={autoFill} style={btn(true)}>Auto Fill</button>
        <button onClick={synth} disabled={!ready} style={btn(ready)}>
          Synthesize{selTier !== undefined ? ` T${selTier}→T${selTier + 1}` : ''}
        </button>
      </div>
      <Browser
        items={pool}
        selected={selected}
        onPick={toggle}
        disabled={(e) => !sameBatch(e)}
        label="Items & gems (same kind + tier)"
      />
    </>
  );
}

// The crafted entry, shown big in place of the 9-grid. A lucky (+2 tier) craft gets a
// pulsing yellow glow so the player instantly clocks the rare result. Works for gems too.
function SynthResultCard({ result, onAccept }: { result: SynthResult; onAccept: () => void }): React.JSX.Element {
  const { entry, lucky } = result;
  const subtitle = isGem(entry)
    ? `${GEMS[entry.key].name} gem · T${entry.tier}`
    : `${tierName(entry.tier)} ${entry.category} · ilvl ${entry.ilvl}`;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '24px 8px', minHeight: 360 }}>
      <div style={{ fontWeight: 700, fontSize: 12, textAlign: 'center', color: lucky ? PALETTE.gold : PALETTE.textLight }}>
        {lucky ? '✦ LUCKY SYNTHESIS — jumped +2 tiers! ✦' : 'Synthesized!'}
      </div>
      <div
        className={lucky ? 'tl-lucky-glow' : undefined}
        style={{ borderRadius: 3, boxShadow: lucky ? `0 0 18px 6px ${PALETTE.gold}` : 'none' }}
      >
        <ItemSlot item={isItem(entry) ? entry : null} gem={isGem(entry) ? entry : undefined} size={72} />
      </div>
      <div style={{ color: PALETTE.textMute, fontSize: 11, textAlign: 'center' }}>
        {subtitle}
        {isItem(entry) && itemPerfectCount(entry) > 0 && (
          <span style={{ color: PALETTE.gold, marginLeft: 4 }}>{'★'.repeat(itemPerfectCount(entry))}</span>
        )}
      </div>
      <button onClick={onAccept} style={{ ...btn(true), flex: 'none', minWidth: 130, padding: '8px 20px' }}>Accept</button>
    </div>
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
  newStat: { key: StatKey; value: number; perfect?: boolean };
}

function TransfigureMode(): React.JSX.Element {
  const inventory = entries(useStore((s) => s.inventory));
  const cubeTransfigure = useStore((s) => s.cubeTransfigure);
  const cubeApplyTransfigure = useStore((s) => s.cubeApplyTransfigure);
  const [itemId, setItemId] = useState<string | null>(null);
  const [affixIndex, setAffixIndex] = useState<number | null>(null);
  const [costIdx, setCostIdx] = useState(0); // which payment option is selected
  const [pending, setPending] = useState<Pending | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const gear = inventory.filter(isItem);
  const gems = inventory.filter(isGem);
  const item = gear.find((i) => i.id === itemId) ?? null;

  const gemsAtTier = (tier: number): GemInstance[] => gems.filter((g) => g.tier === tier);
  // Available payment options for this item, plus how many qualifying gems are owned.
  const options: { cost: TransfigCost; have: number }[] =
    item === null ? [] : transfigCostOptions(item).map((cost) => ({ cost, have: gemsAtTier(cost.tier).length }));
  const sel = options[costIdx] ?? null;
  // The exact gems that will be spent for the selected option (any colours at that tier).
  const payGems = sel === null ? [] : gemsAtTier(sel.cost.tier).slice(0, sel.cost.count);
  const afford = sel !== null && payGems.length === sel.cost.count;

  // Default the cost to the FIRST affordable option when an item is picked.
  const firstAffordable = (i: ItemInstance): number => {
    const opts = transfigCostOptions(i);
    const idx = opts.findIndex((o) => gemsAtTier(o.tier).length >= o.count);
    return idx >= 0 ? idx : 0;
  };

  const selectItem = (i: ItemInstance): void => {
    setResult(null);
    setPending(null);
    setAffixIndex(null);
    const next = itemId === i.id ? null : i.id;
    setItemId(next);
    if (next !== null) setCostIdx(firstAffordable(i));
  };

  const canDo =
    item !== null && affixIndex !== null && afford && pending === null && canTransfigure(item, payGems);

  const transform = (): void => {
    if (item === null || affixIndex === null || !afford) return;
    const oldStat = item.stats[affixIndex];
    const newStat = transfigureRoll(item, affixIndex);
    if (oldStat === undefined || newStat === null) return;
    if (cubeTransfigure(item.id, payGems.map((g) => g.id), affixIndex)) {
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
      {/* item + the gem(s) that will pay */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center' }}>
        <SlotBox label="Item"><ItemSlot item={item} size={44} label="·" /></SlotBox>
        <span style={{ color: PALETTE.textMute }}>+</span>
        <SlotBox label={sel === null ? 'Gems' : `${sel.cost.count}× T${sel.cost.tier}`}>
          <div style={{ display: 'flex', gap: 3 }}>
            {Array.from({ length: sel?.cost.count ?? 1 }, (_, i) => (
              <ItemSlot key={i} item={null} gem={payGems[i]} size={40} label="·" />
            ))}
          </div>
        </SlotBox>
      </div>

      {item !== null && pending === null && (
        item.transfigured === true ? (
          <Result>This item was already transfigured — it can&apos;t be altered again.</Result>
        ) : transfigPool(item).length === 0 ? (
          <Result>No different stat is available to roll into for this item.</Result>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Payment option picker: 1 same-tier gem, or 2 one-tier-below gems. */}
            <div style={{ color: PALETTE.textMute, fontSize: 11 }}>Pay with:</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {options.map((o, i) => {
                const ok = o.have >= o.cost.count;
                const active = i === costIdx;
                return (
                  <button
                    key={i}
                    onClick={() => setCostIdx(i)}
                    style={{
                      flex: 1, padding: '4px 6px', fontSize: 11, cursor: 'pointer',
                      background: active ? PALETTE.bgPanel : PALETTE.bgInset,
                      border: `1px solid ${active ? PALETTE.gold : PALETTE.ink}`,
                      color: ok ? PALETTE.textLight : PALETTE.textMute,
                    }}
                  >
                    {o.cost.count}× T{o.cost.tier} gem{o.cost.count > 1 ? 's' : ''}
                    <span style={{ display: 'block', fontSize: 9, color: ok ? PALETTE.hpGreen : PALETTE.enemyAccent }}>
                      {ok ? 'have' : 'need'} {o.have}/{o.cost.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div style={{ color: PALETTE.textMute, fontSize: 11, marginTop: 2 }}>Choose the affix to alter:</div>
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
            {!afford && (
              <div style={{ color: PALETTE.enemyAccent, fontSize: 10 }}>
                Not enough gems for this option — pick the other, or get more gems.
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
          <StatRow statKey={pending.newStat.key} value={pending.newStat.value} perfect={pending.newStat.perfect} />
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

function CubeGrid<T extends InvEntry>({
  items,
  onRemove,
  goldOf,
}: {
  items: T[];
  onRemove: (e: T) => void;
  goldOf?: (i: ItemInstance) => number;
}): React.JSX.Element {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, justifyItems: 'center', padding: 10, background: PALETTE.bgInset, border: `2px solid ${PALETTE.goldDim}` }}>
      {Array.from({ length: CUBE_INPUT_COUNT }, (_, i) => {
        const it = items[i] ?? null;
        return (
          <ItemSlot
            key={i}
            item={it !== null && isItem(it) ? it : null}
            gem={it !== null && isGem(it) ? it : undefined}
            size={48}
            label="·"
            onClick={() => { if (it !== null) onRemove(it); }}
            badge={it !== null && isItem(it) && goldOf ? <span style={{ position: 'absolute', bottom: -2, left: 1, fontSize: 8, color: PALETTE.gold, fontWeight: 700 }}>{format(goldOf(it))}</span> : undefined}
          />
        );
      })}
    </div>
  );
}

function Browser<T extends InvEntry>({
  items,
  selected,
  onPick,
  disabled,
  goldOf,
  badgeOf,
  label,
}: {
  items: T[];
  selected: string[];
  onPick: (e: T) => void;
  disabled?: (e: T) => boolean;
  goldOf?: (i: ItemInstance) => number;
  badgeOf?: (e: T) => string | null;
  label: string;
}): React.JSX.Element {
  return (
    <>
      <div style={{ borderTop: `1px solid ${PALETTE.goldDim}`, paddingTop: 4, color: PALETTE.textMute, fontSize: 11 }}>{label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(32px, 1fr))', gap: 3, justifyItems: 'center', maxHeight: 200, overflow: 'auto' }} className="tl-scroll">
        {items.map((entry, i) => {
          const off = disabled?.(entry) === true && !selected.includes(entry.id);
          const badge = badgeOf?.(entry) ?? (selected.includes(entry.id) ? '✓' : null);
          return (
            <div key={`${entry.id}-${i}`} style={{ opacity: off ? 0.35 : 1 }}>
              <ItemSlot
                item={isItem(entry) ? entry : null}
                gem={isGem(entry) ? entry : undefined}
                size={28}
                onClick={() => { if (!off) onPick(entry); }}
                badge={
                  <>
                    {badge && <span style={{ position: 'absolute', top: -1, left: 1, color: PALETTE.gold, fontSize: 9 }}>{badge}</span>}
                    {goldOf && isItem(entry) && <span style={{ position: 'absolute', bottom: -2, left: 1, fontSize: 7, color: PALETTE.parchment }}>{format(goldOf(entry))}</span>}
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

function Result({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div style={{ color: PALETTE.gold, fontSize: 11 }}>{children}</div>;
}

function btn(enabled: boolean): React.CSSProperties {
  return { flex: 1, padding: 5, cursor: enabled ? 'pointer' : 'default', background: enabled ? PALETTE.titleRed : PALETTE.bgInset, border: `1px solid ${PALETTE.ink}`, color: enabled ? PALETTE.textLight : PALETTE.textMute };
}
