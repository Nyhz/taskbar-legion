import type { ItemInstance } from '@/sim/items';
import { SLOTS, tryWeaponTypeFor } from '@/data/itemSlots';
import { classDef } from '@/data/classes';
import { GEMS } from '@/data/gems';
import { gemGrants } from '@/sim/gems';
import { tierStyle, tierName } from '@/ui/tierStyle';
import { STAT_ICON, itemGlyph } from '@/ui/icons';
import { StatRow, statText } from './StatRow';
import { PALETTE } from '@/styles/palette';
import { STATS, type StatKey } from '@/data/stats';

// Hover tooltip styled as a pixel-art item card: a rarity-framed title bar, an icon +
// grade header with the base stat, an "Inherent Stats" block (rolled substats + any
// socketed gem grants, folded so the display reflects the real total), and a "Gem
// Slots" block. Comparison: a "vs …" block for EACH equipped item in the slot (one for
// most gear, both for rings); none (a slot is free) ⇒ pure gain, no block. The compare
// is GEM-FREE — base affix + rolled affixes + ilvl only — so an un-socketed new item
// isn't unfairly docked for the equipped item's gems.

// Full stat total INCLUDING socketed gems — used for the item's own stat DISPLAY.
function totalByKey(item: ItemInstance): Map<StatKey, number> {
  const m = new Map<StatKey, number>();
  const add = (k: StatKey, v: number): void => {
    m.set(k, (m.get(k) ?? 0) + v);
  };
  for (const b of item.baseAffix) add(b.key, b.value);
  for (const s of item.stats) add(s.key, s.value);
  for (const so of item.sockets) {
    if (so.gem !== null) for (const gr of gemGrants(so.gem)) add(gr.key, gr.value);
  }
  return m;
}

// Display name + icon: weapon/off-hand show their class TYPE (Sword/Bow/Wand …), else
// the generic slot label/icon.
function itemTitle(item: ItemInstance): string {
  if (item.category === 'weapon' && item.classKey !== undefined) {
    const wt = tryWeaponTypeFor(item.classKey, item.slot as 'weapon' | 'offhand');
    if (wt !== undefined) return wt.name; // stale/unknown class → fall through to slot label
  }
  return SLOTS[item.slot].label;
}
// Base affix + rolled affixes ONLY (no gems) — the basis for swap comparisons, so gems
// on the equipped item don't count against an un-socketed candidate.
function affixTotal(item: ItemInstance): Map<StatKey, number> {
  const m = new Map<StatKey, number>();
  const add = (k: StatKey, v: number): void => {
    m.set(k, (m.get(k) ?? 0) + v);
  };
  for (const b of item.baseAffix) add(b.key, b.value);
  for (const s of item.stats) add(s.key, s.value);
  return m;
}

export function ItemTooltip({ item, compare, locked, wrongClass }: { item: ItemInstance; compare?: ItemInstance[]; locked?: boolean; wrongClass?: boolean }): React.JSX.Element {
  const ts = tierStyle(item.tier);
  const rarity = ts.iridescent ? '#e0b0ff' : ts.color;
  const mine = totalByKey(item); // gem-inclusive — for the stat DISPLAY
  const mineAffix = affixTotal(item); // gem-free — for the comparison blocks
  const blocks = compare ?? []; // a "vs …" block per equipped item in the slot
  const irid = ts.iridescent ? 'tl-iridescent' : undefined;

  return (
    <div
      style={{
        width: 220,
        background: PALETTE.bgDeep,
        border: `2px solid ${rarity}`,
        boxShadow: `0 0 0 1px ${PALETTE.ink}, 4px 4px 0 rgba(0,0,0,0.6)`,
        fontSize: 11,
        lineHeight: 1.5,
        imageRendering: 'pixelated',
      }}
    >
      {/* title bar */}
      <div
        style={{
          background: PALETTE.bgInset,
          borderBottom: `2px solid ${rarity}`,
          boxShadow: `inset 0 0 0 1px ${PALETTE.ink}`,
          padding: '4px 6px',
          textAlign: 'center',
          fontWeight: 700,
          letterSpacing: 0.3,
          color: rarity,
        }}
        className={irid}
      >
        {itemTitle(item)}
      </div>

      <div style={{ padding: 6 }}>
        {/* icon + grade + base stat */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <div
            style={{
              width: 40,
              height: 40,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              background: PALETTE.bgInset,
              border: `2px solid ${rarity}`,
              boxShadow: `inset 0 0 0 1px ${PALETTE.ink}`,
            }}
          >
            <span className={irid}>{itemGlyph(item)}</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: rarity, fontWeight: 700 }} className={irid}>
              {tierName(item.tier)} Grade
            </div>
            {item.baseAffix.map((b) => (
              <div key={b.key} style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                <span style={{ color: PALETTE.textMute }}>{STATS[b.key].label}</span>
                <span style={{ color: PALETTE.textLight, fontWeight: 700, fontSize: 14 }}>
                  {statText(b.key, b.value)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* inherent stats (base affix(es) live in the header above) */}
        <SectionHeader glyph="✦" label="Inherent Stats" />
        {(() => {
          const baseKeys = new Set(item.baseAffix.map((b) => b.key));
          const rows = [...mine.entries()].filter(([k]) => !baseKeys.has(k));
          if (rows.length === 0) return <div style={{ color: PALETTE.textMute, paddingLeft: 2 }}>— none —</div>;
          return rows.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 14, textAlign: 'center', fontSize: 10 }}>{STAT_ICON[k]}</span>
              <div style={{ flex: 1 }}>
                <StatRow statKey={k} value={v} />
              </div>
            </div>
          ));
        })()}

        {/* gem slots (the card's "Decoration Slot") */}
        {item.sockets.length > 0 && (
          <>
            <SectionHeader glyph="💎" label="Gem Slots" />
            {item.sockets.map((so, i) => (
              <SocketRow key={i} gemKey={so.gem?.key} tier={so.gem?.tier} />
            ))}
          </>
        )}

        {blocks.map((eq) => <CompareBlock key={eq.id} mineAffix={mineAffix} myIlvl={item.ilvl} other={eq} />)}

        {/* footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 6,
            paddingTop: 4,
            borderTop: `1px solid ${PALETTE.ink}`,
            color: PALETTE.textMute,
          }}
        >
          <span style={{ color: wrongClass === true ? PALETTE.enemyAccent : PALETTE.textMute, fontWeight: wrongClass === true ? 700 : undefined }}>
            {item.classKey !== undefined ? `${wrongClass === true ? '🚫 ' : ''}${classDef(item.classKey).name} only` : item.bound ? '🔒 Bound' : 'Tradable'}
          </span>
          <span style={{ color: locked === true ? PALETTE.enemyAccent : PALETTE.textMute, fontWeight: locked === true ? 700 : undefined }}>
            {locked === true ? '🔒 ' : ''}Item Lv.{item.ilvl} · {item.category}
          </span>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ glyph, label }: { glyph: string; label: string }): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        color: PALETTE.gold,
        fontWeight: 700,
        margin: '6px 0 2px',
        borderTop: `1px solid ${PALETTE.goldDim}`,
        paddingTop: 4,
      }}
    >
      <span style={{ fontSize: 10 }}>{glyph}</span>
      {label}
    </div>
  );
}

function SocketRow({ gemKey, tier }: { gemKey?: string; tier?: number }): React.JSX.Element {
  const gem = gemKey !== undefined ? GEMS[gemKey as keyof typeof GEMS] : undefined;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <span
        style={{
          width: 12,
          height: 12,
          flexShrink: 0,
          borderRadius: '50%',
          background: gem ? gem.color : 'transparent',
          border: `1px solid ${gem ? PALETTE.ink : PALETTE.textMute}`,
          boxShadow: gem ? `0 0 4px ${gem.color}` : undefined,
        }}
      />
      {gem ? (
        <span style={{ color: PALETTE.textLight }}>{gem.name} <span style={{ color: PALETTE.textMute }}>T{tier}</span></span>
      ) : (
        <span style={{ color: PALETTE.textMute }}>Empty Slot</span>
      )}
    </div>
  );
}

// What swapping THIS item in for `other` (the equipped piece in this slot) would change
// — item level + base affix + rolled affixes, GEMS IGNORED on both sides (so a fresh
// un-socketed item isn't penalized for the equipped item's gems).
function CompareBlock({ mineAffix, myIlvl, other }: { mineAffix: Map<StatKey, number>; myIlvl: number; other: ItemInstance }): React.JSX.Element {
  const theirs = affixTotal(other);
  const keys = [...new Set<StatKey>([...mineAffix.keys(), ...theirs.keys()])];
  const deltas = keys
    .map((k) => [k, (mineAffix.get(k) ?? 0) - (theirs.get(k) ?? 0)] as const)
    .filter(([, d]) => d !== 0);
  const ilvlDelta = myIlvl - other.ilvl;
  return (
    <div style={{ marginTop: 4, borderTop: `1px solid ${PALETTE.ink}`, paddingTop: 2 }}>
      <div style={{ color: PALETTE.textMute }}>vs {itemTitle(other)}</div>
      {ilvlDelta === 0 && deltas.length === 0 ? (
        <div style={{ color: PALETTE.textMute }}>— no change —</div>
      ) : (
        <>
          {ilvlDelta !== 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ color: PALETTE.textMute }}>Item Level</span>
              <span style={{ color: ilvlDelta > 0 ? PALETTE.hpGreen : PALETTE.enemyAccent }}>
                {ilvlDelta > 0 ? '▲' : '▼'}{Math.abs(ilvlDelta)}
              </span>
            </div>
          )}
          {deltas.map(([k, d]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ color: STATS[k].group === 'offensive' ? '#e8a0a0' : '#a0c8e8' }}>{STATS[k].label}</span>
              <span style={{ color: d > 0 ? PALETTE.hpGreen : PALETTE.enemyAccent }}>
                {d > 0 ? '▲' : '▼'}{statText(k, Math.abs(d)).replace('+', '')}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
