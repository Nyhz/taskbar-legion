import type { ItemInstance } from '@/sim/items';
import { SLOTS, tryWeaponTypeFor } from '@/data/itemSlots';
import { classDef } from '@/data/classes';
import { GEMS, type GemInstance } from '@/data/gems';
import { gemGrants } from '@/sim/gems';
import { tierStyle, tierName } from '@/ui/tierStyle';
import { STAT_ICON, itemGlyph } from '@/ui/icons';
import { StatRow, statText } from './StatRow';
import { PALETTE } from '@/styles/palette';
import { STATS, type StatKey } from '@/data/stats';
import { ROLE_LABEL, type RoleScores, type RoleKey } from '@/sim/roleScore';

// Hover tooltip styled as a pixel-art item card: a rarity-framed title bar, an icon +
// grade header with the base stat, an "Inherent Stats" block (the item's OWN rolled
// substats), and a "Gem Slots" block where each socketed gem lists what it grants. Item
// stats and gem stats are kept VISUALLY SEPARATE — gems are not folded into the inherent
// total. Comparison is SIDE-BY-SIDE (ItemSlot renders the equipped card next to this one);
// when `compareTo` is set, each inherent stat on THIS card carries a green/red ▲▼ delta vs
// the equipped piece (item stats only), and any stat only the equipped item has shows as a
// red loss.

// The item's OWN stat total — base affix + rolled substats only. Socketed gems are
// shown separately under "Gem Slots" so item stats and gem stats stay visually distinct.
function totalByKey(item: ItemInstance): Map<StatKey, number> {
  const m = new Map<StatKey, number>();
  const add = (k: StatKey, v: number): void => {
    m.set(k, (m.get(k) ?? 0) + v);
  };
  for (const b of item.baseAffix) add(b.key, b.value);
  for (const s of item.stats) add(s.key, s.value);
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

export function ItemTooltip({ item, compareTo, locked, wrongClass, roleDelta, roleKeys }: { item: ItemInstance; compareTo?: ItemInstance; locked?: boolean; wrongClass?: boolean; roleDelta?: RoleScores; roleKeys?: RoleKey[] }): React.JSX.Element {
  const ts = tierStyle(item.tier);
  const rarity = ts.iridescent ? '#e0b0ff' : ts.color;
  const mine = totalByKey(item);
  const theirs = compareTo !== undefined ? totalByKey(compareTo) : undefined;
  const delta = (k: StatKey): number => (theirs === undefined ? 0 : (mine.get(k) ?? 0) - (theirs.get(k) ?? 0));
  const irid = ts.iridescent ? 'tl-iridescent' : undefined;
  const baseKeys = new Set(item.baseAffix.map((b) => b.key));
  // Inherent rows: every non-base stat THIS item has, plus (when comparing) any non-base
  // stat only the EQUIPPED item has — so a swap's losses show as red rows here too.
  const inherentKeys = [...new Set<StatKey>([...mine.keys(), ...(theirs?.keys() ?? [])])].filter((k) => !baseKeys.has(k));
  const ilvlDelta = compareTo !== undefined ? item.ilvl - compareTo.ilvl : 0;

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
                <DeltaTag k={b.key} d={delta(b.key)} />
              </div>
            ))}
          </div>
        </div>

        {/* inherent stats (base affix(es) live in the header above) */}
        <SectionHeader glyph="✦" label="Inherent Stats" />
        {inherentKeys.length === 0 ? (
          <div style={{ color: PALETTE.textMute, paddingLeft: 2 }}>— none —</div>
        ) : (
          inherentKeys.map((k) => {
            const v = mine.get(k) ?? 0;
            return (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 14, textAlign: 'center', fontSize: 10 }}>{STAT_ICON[k]}</span>
                <div style={{ flex: 1 }}>
                  {v > 0 ? <StatRow statKey={k} value={v} /> : <span style={{ color: PALETTE.textMute }}>{STATS[k].label}</span>}
                </div>
                <DeltaTag k={k} d={delta(k)} />
              </div>
            );
          })
        )}

        {/* gem slots (the card's "Decoration Slot") */}
        {item.sockets.length > 0 && (
          <>
            <SectionHeader glyph="💎" label="Gem Slots" />
            {item.sockets.map((so, i) => (
              <SocketRow key={i} gem={so.gem} />
            ))}
          </>
        )}

        {/* net role impact vs the equipped piece (only when comparing) */}
        {roleDelta !== undefined && (
          <>
            <SectionHeader glyph="⚖" label="Role Impact" />
            {(roleKeys ?? (['dps', 'tank', 'heal'] as RoleKey[])).map((r) => (
              <RoleRow key={r} label={ROLE_LABEL[r]} pct={roleDelta[r]} />
            ))}
          </>
        )}

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
            {item.classKey !== undefined ? `${wrongClass === true ? '🚫 ' : ''}${classDef(item.classKey).name} only` : ''}
          </span>
          <span style={{ color: locked === true ? PALETTE.enemyAccent : PALETTE.textMute, fontWeight: locked === true ? 700 : undefined }}>
            {locked === true ? '🔒 ' : ''}Item Lv.{item.ilvl}
            {ilvlDelta !== 0 && (
              <span style={{ color: ilvlDelta > 0 ? PALETTE.hpGreen : PALETTE.enemyAccent, fontWeight: 700 }}> ({ilvlDelta > 0 ? '+' : ''}{ilvlDelta})</span>
            )}
            {' '}· {item.category}
          </span>
        </div>
      </div>
    </div>
  );
}

// A green ▲ / red ▼ stat delta vs the equipped item (nothing when unchanged or not comparing).
function DeltaTag({ k, d }: { k: StatKey; d: number }): React.JSX.Element | null {
  if (d === 0) return null;
  return (
    <span style={{ color: d > 0 ? PALETTE.hpGreen : PALETTE.enemyAccent, fontWeight: 700, fontSize: 10, whiteSpace: 'nowrap' }}>
      {d > 0 ? '▲' : '▼'}{statText(k, Math.abs(d)).replace('+', '')}
    </span>
  );
}

// One role line in the "Role Impact" block: a green/red signed % (the net change to this
// role's combat proxy if equipped). ~0 reads as a muted "no change" so swaps that don't
// touch a role don't shout. Rounded to 0.1% — sub-0.05 collapses to 0.
function RoleRow({ label, pct }: { label: string; pct: number }): React.JSX.Element {
  const flat = Math.abs(pct) < 0.05;
  const color = flat ? PALETTE.textMute : pct > 0 ? PALETTE.hpGreen : PALETTE.enemyAccent;
  const text = flat ? '—' : `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 10, whiteSpace: 'nowrap' }}>
      <span style={{ color: PALETTE.textMute }}>{label}</span>
      <span style={{ color, fontWeight: 700 }}>{text}</span>
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

function SocketRow({ gem }: { gem: GemInstance | null }): React.JSX.Element {
  const def = gem !== null ? GEMS[gem.key as keyof typeof GEMS] : undefined;
  const grants = gem !== null ? gemGrants(gem) : [];
  return (
    <div style={{ marginBottom: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <span
          style={{
            width: 12,
            height: 12,
            flexShrink: 0,
            borderRadius: '50%',
            background: def ? def.color : 'transparent',
            border: `1px solid ${def ? PALETTE.ink : PALETTE.textMute}`,
            boxShadow: def ? `0 0 4px ${def.color}` : undefined,
          }}
        />
        {def && gem ? (
          <span style={{ color: PALETTE.textLight }}>{def.name} <span style={{ color: PALETTE.textMute }}>T{gem.tier}</span></span>
        ) : (
          <span style={{ color: PALETTE.textMute }}>Empty Slot</span>
        )}
      </div>
      {grants.map((gr) => (
        <div key={gr.key} style={{ display: 'flex', alignItems: 'center', gap: 5, paddingLeft: 17 }}>
          <span style={{ width: 14, textAlign: 'center', fontSize: 10 }}>{STAT_ICON[gr.key]}</span>
          <span style={{ flex: 1, color: def?.color ?? PALETTE.textLight }}>{statText(gr.key, gr.value)} {STATS[gr.key].label}</span>
        </div>
      ))}
    </div>
  );
}
